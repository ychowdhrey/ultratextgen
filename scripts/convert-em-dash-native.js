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

/**
 * Swap the em dash for the locale's spaced en dash, PRESERVING the
 * surrounding whitespace byte for byte.
 *
 * `\s*` on both sides looks equivalent and is not: `\s` matches a newline, so
 * `…\n— foo` collapsed to `… – foo` and silently reflowed 506 line breaks
 * across the corpus. That renders identically, since HTML collapses
 * whitespace, but it is diff noise on 27 files and it makes the claim this
 * whole pass rests on — that only the joint moves — untrue.
 *
 * The one case that does gain whitespace is a tight `a—b` (120 occurrences),
 * because the native mark in all thirteen locales is the SPACED en dash;
 * leaving `a–b` would read as a numeric range.
 */
function toEnDash(s) {
  return s.replace(/([ \t]*)—([ \t]*)/g, (m, a, b) => (a === '' && b === '' ? ' – ' : a + '–' + b));
}
/** A LONE — becomes the native paired ——; an existing —— is already correct. */
function toDoubleDash(s) {
  return s.replace(/—+/g, (m) => (m.length >= 2 ? m : '——'));
}

/**
 * THE EM DASH AS A SPECIMEN, not as punctuation.
 *
 * CLAUDE.md already exempts the four dash subject PAGES, but the character is
 * also shown as a specimen ON other pages, and converting it there states a
 * falsehood. Both shapes below were found by diffing the conversion character
 * by character, never by reading the code:
 *
 *   <h4>Geviertstrich (—)</h4>   "Geviertstrich" IS German for em dash, so
 *                                converting it labels an em dash with an en
 *                                dash. 43 bracketed occurrences corpus-wide.
 *   <td>—</td>                   a data cell meaning "none", not prose. 30
 *                                lone-dash elements, mostly <button> (already
 *                                excluded as UI) plus the ig-matrix cells.
 *
 * Deliberately NOT matched: a text node that merely STARTS with a dash, e.g.
 * `— <strong>Profil…`, which is a list marker and ordinary punctuation. 461
 * nodes look like that, and treating them as specimens would skip real prose.
 */
const BRACKETED_SPECIMEN = /([(\[（【][ \t]*)—([ \t]*[)\]）】])/g;

/** The node is the entire content of its parent and is just the dash. */
function isLoneSpecimen(node) {
  const kids = (node.parent && node.parent.children) || [];
  return kids.length === 1 && kids[0] === node && /^[\s—]*—[\s—]*$/.test(node.data);
}

/**
 * KEEP THE JSON-LD MIRROR IN STEP WITH THE VISIBLE COPY.
 *
 * `script` is in DROP_SELECTORS, which is right for measurement — JSON-LD is
 * metadata, not editorial copy — but a FAQPage block is a MIRROR of the
 * visible FAQ, and CLAUDE.md is explicit that the two must match: "Never edit
 * or trim a visible FAQ without updating the JSON-LD... Paraphrase is not a
 * match." Converting only the visible half opened that split on 453 pages and
 * 1,061 string pairs.
 *
 * `check-faq-schema` cannot see it: it measures CONTENT TOKENS with a 4-token
 * tolerance, and punctuation is not a content token. So this is invisible to
 * the gate by construction, which is precisely why it needs doing here.
 *
 * The rule is self-limiting and needs no slot model: convert a JSON-LD string
 * ONLY when its en-dash twin is already present in the visible body. That
 * converts exactly the strings whose visible half this pass changed, and
 * leaves alone anything mirroring a held slot (title, meta description, h1),
 * which would otherwise open a NEW split in the other direction.
 */
const LD_BLOCK = /(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g;

function syncJsonLdMirror(html, conv) {
  const visible = html.replace(LD_BLOCK, ' ');
  let changed = 0;
  const out = html.replace(LD_BLOCK, (m, open, body, close) => {
    const next = body.replace(/"(?:[^"\\]|\\.)*"/g, (lit) => {
      if (!lit.includes('—')) return lit;
      let parsed;
      try { parsed = JSON.parse(lit); } catch { return lit; }

      // Match PER OCCURRENCE on local context, not on the whole string. A FAQ
      // answer is long, and any single whitespace difference anywhere in it
      // (the visible half starts on its own line after the wrapper tag) defeats
      // a whole-string test — that left 12 pairs unconverted across 9 pages.
      let hit = 0;
      for (const m2 of parsed.matchAll(/—/g)) {
        const i = m2.index;
        const probe = conv(parsed.slice(Math.max(0, i - 30), i + 31));
        if (visible.includes(probe)) hit++;
      }
      if (!hit) return lit;

      // Apply the SAME transform the visible half got, never a per-occurrence
      // patch. Splicing conv('—') in place re-adds spaces the surrounding text
      // already has, which produced a double-spaced dash on 146 files.
      changed += hit;
      return JSON.stringify(conv(parsed));
    });
    return open + next + close;
  });
  return { html: out, changed };
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
      // Transform the RAW SOURCE SLICE, never node.data. cheerio decodes
      // entities, so writing .data back un-escapes them: `&amp; &lt; &gt;`
      // becomes `& < >`, which is wrong everywhere and is real markup
      // corruption on the pages about those very characters. Measured on the
      // first attempt: 91 files, 155 entities lost, worst on
      // de/symbol/kleiner-und-groesser-zeichen (-11).
      //
      // An em dash can never appear inside an entity reference, so applying
      // the dash transform to the raw slice is safe and leaves every entity
      // exactly as authored.
      const raw = html.slice(loc.startOffset, loc.endOffset);
      if (!raw.includes('—')) return;
      if (isLoneSpecimen(node)) return;
      // Protect `(—)` by parking it, converting, then restoring it.
      const parked = raw.replace(BRACKETED_SPECIMEN, '$1\u0001$2');
      const conv = pol === 'double-dash' ? toDoubleDash(parked) : toEnDash(parked);
      const next = conv.split('\u0001').join('—');
      if (next !== raw) edits.push({ start: loc.startOffset, end: loc.endOffset, next, prev: raw });
      return;
    }
    for (const c of node.children || []) walk(c);
  })(body);

  let out = html;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.next + out.slice(e.end);
  // Mirror pass: the visible half is now converted, so bring its JSON-LD twin along.
  const mirror = syncJsonLdMirror(out, pol === 'double-dash' ? toDoubleDash : toEnDash);
  out = mirror.html;
  if (!edits.length && !mirror.changed) return null;
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
