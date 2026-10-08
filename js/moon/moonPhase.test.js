/* ==========================================================
   moonPhase.test.js
   Assertions for the "moon phase today" readout (js/moon/moon-phase.js):
   the phase it computes for a date, the Southern-Hemisphere mirror, the
   time-zone guess, and the reference table each page pre-renders.

   No DOM, no dependencies, no runner:
       node js/moon/moonPhase.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   Why this exists: the readout's whole value is a claim that can be
   wrong. A mean-cycle calculation drifts from the real Moon, so the page
   states an accuracy ("within a day") and this file holds it to that
   against published new and full moon times. The table rows on every
   page are static HTML read by crawlers, so they are checked against the
   same function that fills the live readout.
   ========================================================== */
const fs = require("fs");
const path = require("path");

global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "moon-phase.js"), "utf8"))();
const M = window.UltraTextGen.moonPhase;

let fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + JSON.stringify(got) + (ok ? "" : " want=" + JSON.stringify(want)));
};
const ok = (name, cond, detail) => {
  if (!cond) fail++;
  console.log((cond ? "PASS " : "FAIL ") + name + (detail ? "  " + detail : ""));
};

// --- published phase instants (UTC, to the minute) ---
// New and full moon times from a full lunar theory (PyEphem's
// next_new_moon / next_full_moon, re-checked 2026-10-08), not from the mean
// cycle under test. The eclipse dates double as an independent check: a
// solar eclipse needs a new moon, a lunar eclipse a full moon.
const NEW = [
  "2024-04-08T18:21Z", // total solar eclipse
  "2025-12-20T01:43Z",
  "2026-01-18T19:52Z",
  "2026-02-17T12:01Z", // annular solar eclipse
  "2026-08-12T17:37Z", // total solar eclipse
  "2026-10-10T15:50Z",
  "2027-01-07T20:24Z"
];
const FULL = [
  "2025-03-14T06:55Z", // total lunar eclipse
  "2025-12-04T23:14Z",
  "2026-01-03T10:03Z",
  "2026-03-03T11:38Z", // total lunar eclipse
  "2026-05-31T08:45Z",
  "2026-09-26T16:49Z",
  "2026-12-24T01:28Z"
];
const ms = (iso) => Date.parse(iso.replace("Z", ":00Z"));
const HALF = M.SYNODIC_MONTH / 2;

NEW.forEach((iso) => {
  const p = M.phaseAt(ms(iso));
  const off = Math.min(p.age, M.SYNODIC_MONTH - p.age);
  t("new moon " + iso + " -> index 0", p.index, 0);
  ok("new moon " + iso + " within 1 day of age 0", off <= 1, "off=" + off.toFixed(2) + "d");
  ok("new moon " + iso + " under 3% lit", p.illumination < 0.03, "lit=" + p.illumination.toFixed(3));
});
FULL.forEach((iso) => {
  const p = M.phaseAt(ms(iso));
  const off = Math.abs(p.age - HALF);
  t("full moon " + iso + " -> index 4", p.index, 4);
  ok("full moon " + iso + " within 1 day of age 14.77", off <= 1, "off=" + off.toFixed(2) + "d");
  ok("full moon " + iso + " over 97% lit", p.illumination > 0.97, "lit=" + p.illumination.toFixed(3));
});

// Quarters, same source: first quarter 2026-01-26 04:47 UTC, last quarter 2026-01-10 15:48 UTC.
t("first quarter 2026-01-26 -> index 2", M.phaseAt(ms("2026-01-26T04:47Z")).index, 2);
t("last quarter 2026-01-10 -> index 6", M.phaseAt(ms("2026-01-10T15:48Z")).index, 6);

// --- the slicing itself ---
t("age 0 is new", M.phaseIndexForAge(0), 0);
t("age just under full is full", M.phaseIndexForAge(HALF - 0.5), 4);
t("age 29.5 wraps to new", M.phaseIndexForAge(29.5), 0);
t("age 1.84 still new", M.phaseIndexForAge(1.84), 0);
t("age 1.86 is waxing crescent", M.phaseIndexForAge(1.86), 1);
t("day counter starts at 1", M.phaseAt(M.EPOCH_NEW_MOON_MS).day, 1);
ok("age before the epoch is never negative", M.moonAge(Date.UTC(1990, 0, 1)) >= 0);
ok("illumination stays in [0,1]", [0, 3, 7, 11, 15, 19, 23, 27].every((d) => {
  const v = M.phaseAt(M.EPOCH_NEW_MOON_MS + d * 86400000).illumination;
  return v >= 0 && v <= 1;
}));

// --- hemisphere mirror ---
t("mirror table", [0, 1, 2, 3, 4, 5, 6, 7].map(M.mirrorIndex), [0, 7, 6, 5, 4, 3, 2, 1]);
t("waxing crescent south = 🌘", M.emojiFor(1, "south"), "🌘");
t("first quarter south = 🌗", M.emojiFor(2, "south"), "🌗");
t("full moon is the same both ways", M.emojiFor(4, "south"), "🌕");
t("north is the emoji as drawn", M.emojiFor(1, "north"), "🌒");

// --- time-zone guess ---
t("Sydney -> south", M.guessHemisphere("Australia/Sydney"), "south");
t("Buenos Aires -> south", M.guessHemisphere("America/Argentina/Buenos_Aires"), "south");
t("Sao Paulo -> south", M.guessHemisphere("America/Sao_Paulo"), "south");
t("Auckland -> south", M.guessHemisphere("Pacific/Auckland"), "south");
t("Johannesburg -> south", M.guessHemisphere("Africa/Johannesburg"), "south");
t("Berlin -> north", M.guessHemisphere("Europe/Berlin"), "north");
t("New York -> north", M.guessHemisphere("America/New_York"), "north");
t("Jakarta (spans the equator) -> north", M.guessHemisphere("Asia/Jakarta"), "north");
t("unknown -> north", M.guessHemisphere(""), "north");
t("prefix match needs the slash", M.guessHemisphere("Australian/Fake"), "north");

// --- local noon ---
const d = new Date(2026, 0, 3, 23, 59);
t("localNoon keeps the calendar date", new Date(M.localNoon(d)).getDate(), 3);
t("localNoon is noon", new Date(M.localNoon(d)).getHours(), 12);

// --- every page that mounts the readout ---
const PAGES = [
  "library/moon-celestial-symbols",
  "es/library/simbolos-de-luna",
  "tr/library/ay-sembolleri",
  "ru/library/simvoly-luny",
  "ja/library/tsuki-kigou",
  "it/library/simboli-luna",
  "ko/library/dal-giho",
  "de/library/mond-symbole",
  "fr/library/emoji-soleil-et-lune"
];
const ROOT = path.join(__dirname, "..", "..");
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// Upper age edge of each slice, to one decimal as the tables print it.
const EDGES = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ((i + 0.5) * M.SYNODIC_MONTH / 8).toFixed(1));

PAGES.forEach((page) => {
  const html = fs.readFileSync(path.join(ROOT, page, "index.html"), "utf8");
  const root = html.match(/<section[^>]*data-moon-phase[^>]*>/);
  ok(page + ": mounts the readout", !!root);
  if (!root) return;
  ok(page + ": loads the module", html.includes('<script src="/js/moon/moon-phase.js" defer></script>'));
  const names = JSON.parse(decode((root[0].match(/data-moon-names="([^"]*)"/) || [])[1] || "[]"));
  t(page + ": eight phase names", names.length, 8);
  const tpl = decode((root[0].match(/data-moon-template="([^"]*)"/) || [])[1] || "");
  ok(page + ": template carries {name} {day} {pct}", /\{name\}/.test(tpl) && /\{day\}/.test(tpl) && /\{pct\}/.test(tpl));
  for (let i = 0; i < 8; i++) {
    const row = html.match(new RegExp('<tr data-moon-row="' + i + '"><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td></tr>'));
    if (!row) { ok(page + ": row " + i + " present", false); continue; }
    t(page + ": row " + i + " name matches the readout", decode(row[1]), names[i]);
    t(page + ": row " + i + " northern emoji", row[2], M.emojiFor(i, "north"));
    t(page + ": row " + i + " southern emoji", row[3], M.emojiFor(i, "south"));
    const nums = (row[4].match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(",", "."));
    const want = i === 0 ? [EDGES[7], M.SYNODIC_MONTH.toFixed(1), "0", EDGES[0]] : [EDGES[i - 1], EDGES[i]];
    t(page + ": row " + i + " age range", nums, want);
  }
});

console.log(fail ? "\n" + fail + " FAILED" : "\nall passed");
process.exit(fail ? 1 : 0);
