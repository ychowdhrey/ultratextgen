#!/usr/bin/env node
/**
 * Convert em dashes to each locale's OWN native mark, per
 * data/em_dash_locale_policy.json — the ledger that already names the
 * replacement for every `ban` and `double-dash` locale.
 *
 * This is NOT the English purge that docs/em-dash-policy.md §1 refuses. For the
 * thirteen en-dash locales the ledger's named replacement is a single
 * character ( – ), so no sentence is rewritten and no word moves: the joint
 * changes and nothing else. For ja/zh-tw a LONE — becomes the paired ——, which
 * their own corpora already use for 1,810 of 2,565 and 1,036 of 1,121.
 * English is deliberately out of scope here: its remedies (colon, full stop,
 * comma pair) are per-sentence judgement, which §1 says drains on touch.
 *
 * Two things keep the blast radius honest:
 *
 *   1. TEXT NODES ONLY, PATCHED BY SOURCE OFFSET. The file is never
 *      re-serialised through cheerio — the same rule the JSON-LD fixer follows
 *      in docs/source-attribution.md §4, and for the same reason: a
 *      round-trip rewrites formatting across the whole file and buries the
 *      real change in noise. Attribute values are never touched.
 *   2. THE SLOT SET IS THE CORPUS'S OWN. Exclusions are imported from
 *      scripts/lib/editorial-corpus.js rather than restated, so the rewriter
 *      and the gate cannot disagree about what is editorial copy. A second
 *      copy of that list would drift, which is the failure CLAUDE.md records
 *      against exactly this kind of pass.
 *
 * Held back deliberately: <title>, meta description and <h1>. Not because the
 * dash is different there, but because docs/em-dash-policy.md §3 is explicit
 * that a changed title re-enters Google's title-link selection — churn, not
 * punctuation, is the risk — and 700 snippets should not move in one week.
 * Those drain with each page's own next edit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cheerio = require('cheerio');
const { DROP_SELECTORS, UI_SELECTORS } = require('./lib/editorial-corpus.js');

/**
 * WHY ja AND zh-tw ARE NOT CONVERTED HERE (measured 2026-09-20)
 *
 * Their ledger replacement is the paired —— , and converting a lone — to it is
 * correct: the 文化庁 and 教育部 manuals both prescribe the two-cell dash, and
 * both corpora already use it for 1,810 of 2,565 and 1,036 of 1,121.
 *
 * But `punctuationFingerprint` in scripts/lib/editorial-footprint.js counts em
 * dash CHARACTERS raw — `(ed.match(/—/g) || []).length`, with no reference to
 * data/em_dash_locale_policy.json. So —— counts as two, and writing Japanese
 * correctly DOUBLES the page's em-dash rate. Measured: three ja guides blocked
 * the EFR ratchet at +3.5, +3.6 and +3.4 for exactly this, with
 * punctuationFingerprint the top or second contributor on each.
 *
 * The two halves of one system disagree about what a Japanese dash is: the
 * em-dash RULE consults the policy and does not flag a new ——, while the
 * FINGERPRINT feeding EFR does not. Teaching the fingerprint the policy is the
 * right fix, but it changes a measurement, which moves the cohort median and
 * is a re-baseline event for data/editorial_footprint_baseline.json — a
 * deliberate change of its own, never a rider on a content conversion.
 */

const REPO = path.resolve(__dirname, '..');
const POLICY = JSON.parse(fs.readFileSync(path.join(REPO, 'data/em_dash_locale_policy.json'), 'utf8'));
const LOCALES = POLICY.locales || POLICY;
const policyFor = (c) => (LOCALES[c] && LOCALES[c].policy) || null;
const CODES = new Set(Object.keys(LOCALES).filter((c) => c !== 'en'));

/**
 * The dash is the SUBJECT on these pages, so it is content, never a defect.
 *
 * Matched against the page's OWN `hreflang="en"` parent, never against its
 * path: `nl/symbol/em-streep` and `de/library/halbgeviertstrich` are the same
 * four pages in another language, and a path test silently converts the very
 * pages the policy exempts. This is the same rule the peer-link and parity
 * tooling already follow — cluster membership comes from the page's own
 * declaration, never from a guessed locale slug. Caught by running the pass
 * and reading which specs it touched.
 */
const SUBJECT = /(^|\/)(symbol\/(em-dash|en-dash)|library\/(dash-hyphen-symbols|punctuation-symbols))\/?$/;

/** The EN parent a page declares for itself, or its own path when it is EN. */
function enParentOf($, rel) {
  const href = $('head link[rel="alternate"][hreflang="en"]').attr('href');
  if (href) { try { return new URL(href).pathname; } catch { /* fall through */ } }
  return '/' + rel.replace(/index\.html$/, '');
}
function isSubject(p) {
  return SUBJECT.test(String(p).replace(/\/+$/, '') + '/') || SUBJECT.test(String(p));
}

/**
 * Never rewritten: the churn class (policy §3), quoted third-party words, and
 * the Sources apparatus, which editorial-corpus.js drops before slot
 * extraction and which is therefore measured nowhere. CARD_SELECTORS are
 * deliberately NOT here — a card IS the `cta` slot, and the cta slot holds
 * 2,280 of the em dashes this pass exists to convert.
 */
const HELD = ['h1', 'q', 'blockquote', 'cite', '.source-note'];

function localeOf(rel) {
  const m = ('/' + rel).match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  return m && CODES.has(m[1]) ? m[1] : 'en';
}

/** ` — ` -> ` – `, and a tight `a—b` -> `a–b`. Punctuation only; no word moves. */
function toEnDash(s) {
  return s.replace(/\s*—\s*/g, (m) => (/^\s|\s$/.test(m) ? ' – ' : '–'));
}
/** A LONE — becomes the native paired ——; an existing —— is already correct. */
function toDoubleDash(s) {
  return s.replace(/—+/g, (m) => (m.length >= 2 ? m : '——'));
}

function convertFile(rel, { write }) {
  const abs = path.join(REPO, rel);
  const code = localeOf(rel);
  const pol = policyFor(code);
  // English is out of scope: its remedies are per-sentence judgement (§1).
  const inScope = pol === 'ban' && code !== 'en';   // see the ja/zh-tw note above
  if (!inScope) return null;
  const html = fs.readFileSync(abs, 'utf8');
  if (!html.includes('—')) return null;

  const $ = cheerio.load(html, { sourceCodeLocationInfo: true });
  if (isSubject(enParentOf($, rel))) return null;
  const body = $('body')[0];
  if (!body) return null;

  const excluded = new Set();
  for (const sel of [...DROP_SELECTORS, ...UI_SELECTORS, ...HELD]) {
    $(sel).each((_, el) => excluded.add(el));
  }
  const isExcluded = (node) => {
    for (let n = node; n; n = n.parent) if (excluded.has(n)) return true;
    return false;
  };

  const edits = [];
  (function walk(node) {
    if (!node) return;
    if (node.type === 'text') {
      const loc = node.sourceCodeLocation;
      if (!loc || !node.data.includes('—')) return;
      if (isExcluded(node.parent)) return;
      const next = pol === 'double-dash' ? toDoubleDash(node.data) : toEnDash(node.data);
      if (next !== node.data) edits.push({ start: loc.startOffset, end: loc.endOffset, next, prev: node.data });
      return;
    }
    for (const c of node.children || []) walk(c);
  })(body);

  if (!edits.length) return null;
  let out = html;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.next + out.slice(e.end);
  // Count REPLACEMENTS, never the character delta: —->—— adds a character, so
  // a delta metric reports the paired-dash locales as negative work done.
  const converted = edits.reduce((n, e) => {
    if (pol === 'double-dash') return n + ((e.prev.match(/(?<!—)—(?!—)/g) || []).length);
    return n + ((e.prev.match(/—/g) || []).length);
  }, 0);
  if (write) fs.writeFileSync(abs, out);
  return { rel, code, pol, nodes: edits.length, converted };
}

/**
 * ---- upstream: the page specs ----
 *
 * Fixing only the rendered HTML is undone by the next generator run, which
 * CLAUDE.md names explicitly ("Do not 'fix' an em dash by editing generated
 * HTML"). The locale specs under data/library_page_specs/<lang>/ are that
 * upstream, and a `*.json` glob does not see them — they are a second set.
 *
 * Keys are allowlisted, never swept. `char` is the copy payload and the em
 * dash IS the product there; `title`/`meta_description`/`hero_h1` are the
 * churn class held back by policy §3; `symbols[].label` is a tile label,
 * which editorial-corpus.js captures as `ui` rather than as an editorial
 * slot, so the HTML pass does not touch it either and the two stay in step.
 */
const SPEC_TEXT_KEYS = new Set([
  'hero_tagline', 'intro', 'h2', 'desc', 'text', 'body', 'answer', 'question',
  'cta', 'note', 'notes', 'lead', 'summary', 'caption', 'blurb'
]);
const SPEC_NEVER = new Set([
  'char', 'slug', 'canonical', 'href', 'home_url', 'library_url', 'hreflang',
  'lang', 'page_type', 'copy_pattern', 'collection_container_id', 'id',
  'date_modified', 'date_published', 'breadcrumb', 'crumb_home', 'crumb_library',
  'title', 'meta_description', 'hero_h1', 'label'
]);

function convertSpec(rel, { write }) {
  const abs = path.join(REPO, rel);
  const parts = path.relative(path.join(REPO, 'data/library_page_specs'), abs).split(path.sep);
  const code = parts.length > 1 && LOCALES[parts[0]] ? parts[0] : 'en';
  const pol = policyFor(code);
  const inScope = pol === 'ban' && code !== 'en';   // see the ja/zh-tw note above
  if (!inScope) return null;
  const raw = fs.readFileSync(abs, 'utf8');
  if (!raw.includes('—')) return null;
  let j;
  try { j = JSON.parse(raw); } catch { return null; }
  const enHref = (j.hreflang || []).find((h) => h && h.lang === 'en');
  let enPath = j.canonical || '';
  if (enHref && enHref.href) { try { enPath = new URL(enHref.href).pathname; } catch { /* keep canonical */ } }
  else if (enPath) { try { enPath = new URL(enPath).pathname; } catch { /* keep as-is */ } }
  if (isSubject(enPath)) return null;

  // Collect (oldString -> newString) rather than mutating the tree: 637 of the
  // 1,555 specs do NOT survive JSON.parse -> JSON.stringify(null, 2) byte for
  // byte, so a re-serialising writer would reformat a third of the corpus and
  // bury the real change. Same call, same reason, as the JSON-LD fixer in
  // docs/source-attribution.md §4: patch the text, never round-trip it.
  let n = 0;
  const swaps = [];
  const conv = (s) => (pol === 'double-dash' ? toDoubleDash(s) : toEnDash(s));
  (function walk(node) {
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (SPEC_NEVER.has(k)) continue;
      if (typeof v === 'string') {
        if (!SPEC_TEXT_KEYS.has(k) || !v.includes('—')) continue;
        const next = conv(v);
        if (next !== v) {
          n += pol === 'double-dash' ? (v.match(/(?<!—)—(?!—)/g) || []).length : (v.match(/—/g) || []).length;
          swaps.push([v, next]);
        }
      } else walk(v);
    }
  })(j);

  if (!n) return null;
  if (write) {
    let out = raw;
    for (const [from, to] of swaps) {
      const needle = JSON.stringify(from);
      if (!out.includes(needle)) {
        // Escaping in the file differs from the canonical form; skip rather
        // than guess. Reported, never silently dropped.
        console.error(`  ! ${rel}: could not locate a value verbatim, left unchanged`);
        continue;
      }
      out = out.split(needle).join(JSON.stringify(to));
    }
    fs.writeFileSync(abs, out);
  }
  return { rel, code, pol, converted: n };
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const only = args.includes('--files') ? args.slice(args.indexOf('--files') + 1).filter((a) => !a.startsWith('--')) : null;
  const files = only || execSync("git ls-files '*index.html'", { cwd: REPO, maxBuffer: 1e9 }).toString().trim().split('\n');

  const per = {};
  let pages = 0, converted = 0;

  if (args.includes('--specs')) {
    const specs = execSync("git ls-files 'data/library_page_specs/*.json'", { cwd: REPO, maxBuffer: 1e9 })
      .toString().trim().split('\n');
    for (const rel of specs) {
      let r;
      try { r = convertSpec(rel, { write }); } catch (e) { console.error(`  ! ${rel}: ${e.message}`); continue; }
      if (!r) continue;
      pages++; converted += r.converted;
      (per[r.code] ??= { pol: r.pol, pages: 0, n: 0 });
      per[r.code].pages++; per[r.code].n += r.converted;
    }
    console.log(`${write ? 'CONVERTED' : 'WOULD CONVERT'} (SPECS): ${converted} em dashes in ${pages} spec files\n`);
    console.log('  locale  policy        specs   em dashes');
    for (const [c, v] of Object.entries(per).sort((a, b) => b[1].n - a[1].n)) {
      console.log(`  ${c.padEnd(8)}${v.pol.padEnd(14)}${String(v.pages).padStart(5)}${String(v.n).padStart(12)}`);
    }
    if (!write) console.log('\n(report only — pass --write to apply)');
    return;
  }

  for (const rel of files) {
    let r;
    try { r = convertFile(rel, { write }); } catch (e) { console.error(`  ! ${rel}: ${e.message}`); continue; }
    if (!r) continue;
    pages++; converted += r.converted;
    (per[r.code] ??= { pol: r.pol, pages: 0, n: 0 });
    per[r.code].pages++; per[r.code].n += r.converted;
  }
  console.log(`${write ? 'CONVERTED' : 'WOULD CONVERT'}: ${converted} em dashes on ${pages} pages\n`);
  console.log('  locale  policy        pages   em dashes');
  for (const [c, v] of Object.entries(per).sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${c.padEnd(8)}${v.pol.padEnd(14)}${String(v.pages).padStart(5)}${String(v.n).padStart(12)}`);
  }
  if (!write) console.log('\n(report only — pass --write to apply)');
}
if (require.main === module) main();
module.exports = { convertFile, convertSpec, toEnDash, toDoubleDash };
