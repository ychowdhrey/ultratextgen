#!/usr/bin/env node
/* ==========================================================
   check-counter-claims.js

   Every other validator in this repo checks STRUCTURE — links, headings,
   FAQ counts, hreflang, image assets. None of them checks whether a
   *number written in prose* still matches the code that produces it.

   That gap has now shipped twice on one page in one week:
     · "LinkedIn cuts at 210" stayed on 14 locale pages after the rule
       became 140 mobile / 210 desktop — so a page carried a fold table
       saying 140/210 a few hundred pixels below a row saying 210.
     · "27 platform character limits" sat in the meta and OG descriptions
       of 12 pages — the number Google prints in the snippet — long after
       the table grew to 38 fields across 17 platforms.

   Both times every gate was green, because a number inside a <td> or a
   <meta> is invisible to a structural diff by design.

   Numbers are language-independent, which is what makes this checkable
   across all fifteen counter pages at once without translating anything.

   Two checks:
     1. AGGREGATE CLAIMS — any figure written next to a platform/field
        word ("38 fields", "17 platforms", and the same in every locale's
        language) must equal LIMITS.length / PLATFORMS.length.
     2. TABLE FIGURES — every number in a reference table's numeric cell
        (<td class="num">) must be a real limit or fold from the rule
        table, not a remembered one.

   Usage:  node scripts/check-counter-claims.js [--verbose]
   Exits non-zero when a page states a number the code does not.
   ========================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");

/* ---------- load the rule table itself, not a copy of it ---------- */
const sandbox = { window: {} };
new Function("window", fs.readFileSync(path.join(ROOT, "js/counter/counterRules.js"), "utf8"))(sandbox.window);
const RULES = sandbox.window.UltraTextGen.counterRules;
const { LIMITS, PLATFORMS } = RULES;

const FIELD_COUNT = LIMITS.length;
const PLATFORM_COUNT = PLATFORMS.length;

/* Numbers a counter page is legitimately allowed to print in a numeric
   table cell: every hard limit, every fold, both device folds, and the
   SMS/X constants the counting sections explain. */
const VALID_FIGURES = new Set();
LIMITS.forEach((r) => {
  VALID_FIGURES.add(r.limit);
  if (r.visibleAt) VALID_FIGURES.add(r.visibleAt);
  if (r.foldDesktop) VALID_FIGURES.add(r.foldDesktop);
});
[160, 153, 70, 67, 23, 1, 2, 3, 4].forEach((n) => VALID_FIGURES.add(n));

/* Words meaning "platform" or "field" across the locales this page ships
   in. Only used to find the number sitting next to them. */
const AGGREGATE_WORDS = [
  "platform", "platforms", "plataforma", "plataformas", "plateforme", "plateformes",
  "piattaforme", "piattaforma", "platformy", "platform", "platformu", "platformun",
  "plattform", "plattformen", "alusta", "alustan", "nền tảng", "пл供", "платформ",
  "платформы", "платформам", "プラットフォーム", "플랫폼", "平台",
  "field", "fields", "campo", "campos", "champ", "champs", "campi", "kenttä",
  "alan", "alanı", "поле", "полей", "項目", "필드", "欄位"
];

function walkCounterPages() {
  const out = [];
  const seen = new Set();
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "assets", "scripts"].includes(e.name)) continue;
        stack.push(full);
      } else if (e.name === "index.html") {
        const rel = path.relative(ROOT, full);
        if (seen.has(rel)) continue;
        const src = fs.readFileSync(full, "utf8");
        if (src.includes("js/counter/counterRules.js")) { seen.add(rel); out.push({ rel, src }); }
      }
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function stripTags(s) {
  return s.replace(/<script[\s\S]*?<\/script>/g, " ")
          .replace(/<style[\s\S]*?<\/style>/g, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&[a-z]+;/g, " ");
}

/* Aggregate claims are only meaningful inside a single run of prose. Split on
   tag boundaries first, so a figure in one table cell can never be read as
   modifying a word in the next one — that false positive ("2 | Fields") is
   otherwise guaranteed by any table with a numeric column. */
function textRuns(src) {
  return src.replace(/<script[\s\S]*?<\/script>/g, "<>")
            .replace(/<style[\s\S]*?<\/style>/g, "<>")
            .split(/<[^>]+>/)
            .map((t) => t.replace(/&[a-z]+;/g, " ").trim())
            .filter(Boolean)
            .concat(metaDescriptions(src));
}

/* Meta/OG descriptions are prose too, and are where the "27 limits" claim
   actually lived — invisible to any body-text scan. */
function metaDescriptions(src) {
  const out = [];
  const re = /<meta[^>]+(?:name|property)="(?:description|og:description|twitter:description)"[^>]*content="([^"]*)"/gi;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

/** Numbers written immediately before or after a platform/field word. */
function aggregateClaims(text) {
  const claims = [];
  const words = AGGREGATE_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp("(\\d{1,3})\\s*(?:\\+)?\\s*(?:" + words + ")\\b", "gi");
  let m;
  while ((m = re.exec(text))) claims.push({ n: Number(m[1]), text: m[0].trim() });
  // e.g. Japanese/Chinese put the number after the noun
  const re2 = new RegExp("(?:" + words + ")\\s*(\\d{1,3})\\b", "gi");
  while ((m = re2.exec(text))) claims.push({ n: Number(m[1]), text: m[0].trim() });
  return claims;
}

/** Figures printed in a reference table's numeric cells. */
function tableFigures(src) {
  const out = [];
  const re = /<t[dh][^>]*class="[^"]*\bnum\b[^"]*"[^>]*>(.*?)<\/t[dh]>/gs;
  let m;
  while ((m = re.exec(src))) {
    const cell = stripTags(m[1]);
    /* Thousands separators are locale-specific: "63,206" (en), "63.206" (de),
       "63 206" (fr/pl, often a non-breaking or narrow space). Each must read
       as one number, not as a boundary between two. */
    const nums = cell.match(/\d(?:[\d,.\u00a0\u202f\u2009 ]*\d)?/g) || [];
    nums.forEach((raw) => {
      const n = Number(raw.replace(/[,.\u00a0\u202f\u2009 ]/g, ""));
      if (Number.isFinite(n) && n > 0) out.push({ n, cell: cell.trim() });
    });
  }
  return out;
}

const pages = walkCounterPages();
const problems = [];

for (const { rel, src } of pages) {
  for (const c of textRuns(src).flatMap(aggregateClaims)) {
    if (c.n !== FIELD_COUNT && c.n !== PLATFORM_COUNT) {
      problems.push({
        rel,
        kind: "aggregate",
        msg: `states "${c.text}" — the rule table has ${FIELD_COUNT} fields across ${PLATFORM_COUNT} platforms`
      });
    }
  }

  for (const f of tableFigures(src)) {
    if (!VALID_FIGURES.has(f.n)) {
      problems.push({
        rel,
        kind: "figure",
        msg: `numeric table cell "${f.cell}" contains ${f.n}, which is not a limit or fold in the rule table`
      });
    }
  }
}

const byPage = new Map();
problems.forEach((p) => {
  if (!byPage.has(p.rel)) byPage.set(p.rel, []);
  byPage.get(p.rel).push(p);
});

console.log("Counter Claim Consistency Check");
console.log(`  rule table:      ${FIELD_COUNT} fields across ${PLATFORM_COUNT} platforms`);
console.log(`  pages scanned:   ${pages.length}`);
console.log(`  pages with a stale claim: ${byPage.size}`);
console.log("");

if (VERBOSE) pages.forEach((p) => { if (!byPage.has(p.rel)) console.log("  ok  " + p.rel); });

if (byPage.size === 0) {
  console.log("Every number these pages state matches the rule table they describe. ✓");
  process.exit(0);
}

for (const [rel, list] of byPage) {
  console.log(`  ${rel}`);
  list.forEach((p) => console.log(`     • ${p.msg}`));
}
console.log("");
console.log("Fix: update the prose/meta to match js/counter/counterRules.js, which is the");
console.log("source of truth — or, if the rule table is what is wrong, fix that instead.");
process.exit(1);
