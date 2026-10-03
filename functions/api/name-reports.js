// /api/name-reports — the public board of names players tried in a game.
//
// Routed by /_routes.json (the only include besides "/"), so this file is
// invoked only when the board is opened or a player answers the checker's
// "Tried this name in Free Fire?" question. Page views never call it: the
// board loads when it scrolls into view, not with the page.
//
// GET  ?game=ff                     latest public reports + per-character tally
// POST {action:"create", ...}       add a report (see _name-report-rules.js)
// POST {action:"same"|"flag", id}   "this happened to me too" / "this is spam"
// POST {action:"hide"|"show"|"delete", id}  owner moderation, needs the
//                                    X-Admin-Token header to equal REPORTS_ADMIN_TOKEN
//
// Needs, in the Pages project settings (production and preview):
//   NAME_REPORTS          D1 database binding (tables are created on first use)
//   REPORTS_ADMIN_TOKEN   secret: moderation, and the visitor-hash salt
// Without NAME_REPORTS every request answers 503 not_configured, and the page
// hides the board and the question rather than collecting into nothing.
import {
  GAMES, LIMITS, validateReport, publicReport, symbolTally
} from "./_name-report-rules.js";
import {
  ensureSchema, visitorId, spend, insertReport, listReports, vote, moderate
} from "./_name-report-store.js";

const ALLOWED_ORIGIN = /^(https:\/\/(www\.)?ultratextgen\.com|https:\/\/[a-z0-9-]+\.ultratextgen\.pages\.dev|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const BODY_MAX = 2000;
let schemaReady = null;

function json(status, data, extra) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign(
      { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" },
      extra || {}
    )
  });
}

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function ready(env) {
  if (!env || !env.NAME_REPORTS) return null;
  if (!schemaReady) schemaReady = ensureSchema(env.NAME_REPORTS).catch((e) => { schemaReady = null; throw e; });
  await schemaReady;
  return env.NAME_REPORTS;
}

function isAdmin(request, env) {
  return sameSecret(request.headers.get("x-admin-token") || "", (env && env.REPORTS_ADMIN_TOKEN) || "");
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = await ready(env);
  if (!db) return json(503, { error: "not_configured" }, { "cache-control": "no-store" });
  const url = new URL(request.url);
  const game = url.searchParams.get("game") || "ff";
  if (GAMES.indexOf(game) === -1) return json(400, { error: "bad_game" });
  const admin = isAdmin(request, env);
  const rows = (await listReports(db, game, { limit: 200, includeHidden: admin })).map(publicReport);
  const visible = rows.filter((r) => r.status === "visible");
  return json(
    200,
    { game, reports: rows.slice(0, 60), tally: symbolTally(visible), admin },
    { "cache-control": admin ? "no-store" : "public, max-age=60" }
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = await ready(env);
  if (!db) return json(503, { error: "not_configured" });

  const raw = await request.text();
  if (raw.length > BODY_MAX) return json(413, { error: "too_large" });
  let body;
  try { body = JSON.parse(raw); } catch (e) { return json(400, { error: "bad_json" }); }
  const action = body && body.action;

  if (action === "hide" || action === "show" || action === "delete") {
    if (!isAdmin(request, env)) return json(403, { error: "forbidden" });
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(400, { error: "bad_id" });
    return json(200, { ok: await moderate(db, id, action), id, action });
  }

  // Public writes come from our own pages only: a form on another site, or a
  // script with no Origin at all, is turned away before anything is counted.
  if (!ALLOWED_ORIGIN.test(request.headers.get("origin") || "")) return json(403, { error: "origin" });

  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const visitor = await visitorId(request.headers.get("cf-connecting-ip"), day, env.REPORTS_ADMIN_TOKEN);

  if (action === "create") {
    const check = validateReport(body);
    if (!check.ok) return json(400, { error: check.error });
    if (!(await spend(db, visitor, day, "post", LIMITS.postsPerDay))) return json(429, { error: "rate_limited" });
    const res = await insertReport(db, check.value, visitor, now);
    return json(res.duplicate ? 200 : 201, {
      ok: true,
      duplicate: res.duplicate,
      report: publicReport(Object.assign({ id: res.id, created_at: now, status: "visible", same_count: 0 }, check.value, { symbols: check.value.symbols.join(" ") }))
    });
  }

  if (action === "same" || action === "flag") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(400, { error: "bad_id" });
    if (!(await spend(db, visitor, day, "vote", LIMITS.votesPerDay))) return json(429, { error: "rate_limited" });
    const res = await vote(db, id, visitor, action, LIMITS.flagsToHide);
    if (!res) return json(404, { error: "not_found" });
    return json(200, Object.assign({ ok: true, id }, res));
  }

  return json(400, { error: "bad_action" });
}
