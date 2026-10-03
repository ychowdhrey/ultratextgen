#!/usr/bin/env node
// name-reports.test.mjs — node scripts/name-reports.test.mjs
//
// Assertions for the public name-report board's server side:
//   1. functions/api/_name-report-rules.js: what a report may contain, and
//      above all that a name cannot carry a link
//   2. functions/api/_name-report-store.js: its real SQL, run by SQLite
//      (node:sqlite behind a D1-shaped adapter, so nothing is mocked)
//   3. functions/api/name-reports.js end to end: origin check, rate limits,
//      duplicates, votes, spam flags hiding a report, owner moderation
//
// Zero dependencies, same idiom as scripts/og-preview.test.mjs.
import { DatabaseSync } from "node:sqlite";
import { validateReport, containsLink, symbolTally, LIMITS } from "../functions/api/_name-report-rules.js";
import { onRequestGet, onRequestPost } from "../functions/api/name-reports.js";

let pass = 0;
let fail = 0;
function t(name, cond, detail) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.error("FAIL " + name + (detail !== undefined ? "  got=" + JSON.stringify(detail) : "")); }
}

// ── 1. Rules ───────────────────────────────────────────────────────
const links = [
  "http://spam.com", "https://x.io", "www.spam", "visit spam.com", "ｗｗｗ．ｓｐａｍ．ｃｏｍ",
  "spam dot com", "spam(dot)net", "spam。com", "s p a m . c o m", "discord.gg/abc", "t.me/abc",
  "wa.me/123", "bit.ly/x", "@spammer", "call 08123456789", "join spam.gg", "SPAM.COM",
  "spamㅤ.ㅤcom", "linktr.ee/me"
];
for (const s of links) t("link refused: " + s, containsLink(s));
const names = [
  "꧁KING꧂", "꧁༒☬Sanz☬༒꧂", "ꜱɴɪᴘᴇʀ", "亗Sanz亗", "SanzㅤFF", "Mr.Bean", "K.I.N.G", "𝐒𝐚𝐧𝐳",
  "Nguyễn", "民", "★彡KING彡★", "ᴾᴿᴼ•Sanz", "x_X", "007Agent"
];
for (const s of names) t("name allowed: " + s, !containsLink(s));

const ok = validateReport({ game: "ff", name: " ꧁KING꧂ ", outcome: "refused", reason: "invalid", verdict: "ok", symbols: ["A9C1", "A9C2", "1F525"] });
t("valid report accepted", ok.ok);
t("name trimmed", ok.ok && ok.value.name === "꧁KING꧂", ok.value);
t("symbols not in the name are dropped", ok.ok && ok.value.symbols.join(" ") === "A9C1 A9C2", ok.value && ok.value.symbols);
const bad = (body, error, label) => {
  const r = validateReport(body);
  t(label || ("refused with " + error), !r.ok && r.error === error, r);
};
bad({ game: "pubg", name: "x", outcome: "accepted" }, "bad_game");
bad({ game: "ff", name: "x", outcome: "maybe" }, "bad_outcome");
bad({ game: "ff", name: "x", outcome: "refused" }, "bad_reason", "refused needs a reason");
bad({ game: "ff", name: "x", outcome: "accepted", reason: "invalid" }, "bad_reason", "accepted takes no reason");
bad({ game: "ff", name: "   ", outcome: "accepted" }, "empty_name");
bad({ game: "ff", name: "x".repeat(41), outcome: "accepted" }, "name_too_long");
bad({ game: "ff", name: "a\u202Eb", outcome: "accepted" }, "bad_characters", "bidi override refused");
bad({ game: "ff", name: "a\nb", outcome: "accepted" }, "bad_characters", "line break refused");
bad({ game: "ff", name: "www.x.com", outcome: "accepted" }, "link");
bad({ game: "ff", name: "x", outcome: "accepted", website: "http://spam" }, "spam", "honeypot refused");
bad({ game: "ff", name: "x", outcome: "accepted", verdict: "great" }, "bad_verdict");

const tally = symbolTally([
  { outcome: "refused", reason: "invalid", symbols: ["3164"], same: 2 },
  { outcome: "refused", reason: "too_long", symbols: ["3164"] },
  { outcome: "accepted", symbols: ["3164", "A9C1"] }
]);
const filler = tally.find((x) => x.cp === "3164");
t("tally: 'same for me' adds weight", filler && filler.refused === 3, filler);
t("tally: a length refusal says nothing about a character", filler && filler.refused === 3 && filler.accepted === 1, filler);

// ── 2 + 3. Store and handler over a real SQLite engine ─────────────
function d1(sqlite) {
  return {
    prepare(sql) {
      const st = sqlite.prepare(sql);
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async all() { return { results: st.all(...args) }; },
        async first() { return st.get(...args) ?? null; },
        async run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
      };
      return stmt;
    }
  };
}

const SECRET = "test-admin-token-0123456789";
const env = { NAME_REPORTS: d1(new DatabaseSync(":memory:")), REPORTS_ADMIN_TOKEN: SECRET };
const ORIGIN = "https://ultratextgen.com";
const URL_ = "https://ultratextgen.com/api/name-reports";

function post(body, { ip = "1.1.1.1", origin = ORIGIN, admin = false } = {}) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": ip };
  if (origin) headers.origin = origin;
  if (admin) headers["x-admin-token"] = SECRET;
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return onRequestPost({ request: new Request(URL_, { method: "POST", headers, body: raw }), env }).then(async (r) => ({ status: r.status, data: await r.json() }));
}
function get({ admin = false, e = env } = {}) {
  const headers = admin ? { "x-admin-token": SECRET } : {};
  return onRequestGet({ request: new Request(URL_ + "?game=ff", { headers }), env: e }).then(async (r) => ({ status: r.status, data: await r.json(), cache: r.headers.get("cache-control") }));
}

const off = await get({ e: {} });
t("no D1 binding: 503 not_configured", off.status === 503 && off.data.error === "not_configured", off);

const report = { action: "create", game: "ff", name: "꧁ㅤKING꧂", outcome: "refused", reason: "sensitive", verdict: "warn", symbols: ["A9C1", "3164", "A9C2"] };
let r = await post(report, { origin: "https://evil.example" });
t("foreign origin refused", r.status === 403 && r.data.error === "origin", r);
r = await post(report, { origin: null });
t("missing origin refused", r.status === 403, r);
r = await post(report);
t("create: 201", r.status === 201 && r.data.ok, r);
const firstId = r.data.report && r.data.report.id;
t("create: returns the public report", r.data.report && r.data.report.name === "꧁ㅤKING꧂" && r.data.report.symbols.length === 3, r.data.report);
t("create: nothing about the sender in the reply", r.data.report && !("visitor" in r.data.report) && !("ip" in r.data.report), r.data.report);
r = await post(report);
t("same visitor, same name, same day: duplicate, not a second row", r.status === 200 && r.data.duplicate === true && r.data.report.id === firstId, r);
r = await post(Object.assign({}, report, { name: "visit spam.com" }));
t("link in a name refused by the API", r.status === 400 && r.data.error === "link", r);
r = await post("x".repeat(2500));
t("oversized body refused", r.status === 413, r);
r = await post("{not json");
t("bad JSON refused", r.status === 400 && r.data.error === "bad_json", r);

let g = await get();
t("GET lists the report", g.status === 200 && g.data.reports.length === 1 && g.data.reports[0].id === firstId, g.data);
t("GET is cacheable for 60s", g.cache === "public, max-age=60", g.cache);
t("GET tally counts the filler as refused", g.data.tally.some((x) => x.cp === "3164" && x.refused === 1), g.data.tally);
t("GET carries no visitor ids", !JSON.stringify(g.data).includes("visitor"), g.data);

// rate limit: the first post above counted, the duplicate counted too
let limited = null;
for (let i = 0; i < LIMITS.postsPerDay + 2; i++) {
  const res = await post(Object.assign({}, report, { name: "Name" + i, outcome: "accepted", reason: null }), { ip: "2.2.2.2" });
  if (res.status === 429) { limited = i; break; }
}
t("rate limit: refuses the post after " + LIMITS.postsPerDay, limited === LIMITS.postsPerDay, limited);

r = await post({ action: "same", id: firstId }, { ip: "3.3.3.3" });
t("same for me: counted", r.status === 200 && r.data.same === 1, r);
r = await post({ action: "same", id: firstId }, { ip: "3.3.3.3" });
t("same for me: once per visitor", r.data.same === 1 && r.data.counted === false, r);
r = await post({ action: "same", id: firstId }, { ip: "4.4.4.4" });
t("same for me: another visitor counts", r.data.same === 2, r);
r = await post({ action: "same", id: 999999 }, { ip: "4.4.4.4" });
t("vote on a missing report: 404", r.status === 404, r);

for (const ip of ["5.5.5.1", "5.5.5.2"]) await post({ action: "flag", id: firstId }, { ip });
g = await get();
t("two spam flags: still public", g.data.reports.some((x) => x.id === firstId), g.data.reports);
r = await post({ action: "flag", id: firstId }, { ip: "5.5.5.3" });
t("third spam flag hides it", r.data.status === "flagged", r);
g = await get();
t("flagged report gone from the public board", !g.data.reports.some((x) => x.id === firstId), g.data.reports);
g = await get({ admin: true });
t("owner still sees it, marked flagged", g.data.admin === true && g.data.reports.some((x) => x.id === firstId && x.status === "flagged"), g.data);
t("owner GET is not cached", g.cache === "no-store", g.cache);

r = await post({ action: "show", id: firstId });
t("moderation without the token refused", r.status === 403, r);
r = await post({ action: "show", id: firstId }, { admin: true, origin: null });
t("owner can restore it", r.status === 200 && r.data.ok, r);
g = await get();
t("restored report is public again", g.data.reports.some((x) => x.id === firstId), g.data.reports);
r = await post({ action: "flag", id: firstId }, { ip: "5.5.5.1" });
t("restoring clears old flags (a past flagger can flag again, count restarts)", r.data.counted === true && r.data.status === "visible", r);
r = await post({ action: "delete", id: firstId }, { admin: true });
g = await get({ admin: true });
t("owner can delete it for good", r.data.ok && !g.data.reports.some((x) => x.id === firstId), g.data.reports);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
