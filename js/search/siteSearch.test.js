/**
 * siteSearch.test.js — node js/search/siteSearch.test.js
 *
 * Assertions for the header search's ranking (js/search/site-search.js) and
 * for the generated index it reads (js/search/index/<locale>.json).
 *
 * Same idiom as js/saved/savedItems.test.js: no framework, no dependencies.
 * It evaluates the shipped file itself rather than a copy of its logic. The
 * ranking asserts something a visual check cannot: a query that silently
 * returns the wrong page, or none, looks exactly like a working search box.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let pass = 0;
const failures = [];

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n      expected ${e}\n      actual   ${a}`);
}

function ok(cond, label) { eq(!!cond, true, label); }

/* ---- load the shipped module ------------------------------------------ */

const ROOT = path.resolve(__dirname, '..', '..');
const window = {};
new Function('window', fs.readFileSync(path.join(__dirname, 'site-search.js'), 'utf8'))(window);
const S = window.UTGSiteSearch;
ok(S && typeof S.search === 'function', 'site-search.js exposes UTGSiteSearch.search');

const titles = (entries, q) => S.search(entries, q, 8).map((e) => e.title);

/* ---- ranking on fixed rows -------------------------------------------- */

const rows = [
  ['/category/bubble-fonts/', 'Bubble Fonts Generator', 'Bubble letters A–Z.', 'fonts'],
  ['/printables/bubble-letters/', 'Printable Bubble Letters A–Z & 0–9', 'Pick a letter.', 'printables'],
  ['/printables/bubble-letters/letter-a/', 'Bubble Letter A', 'A puffy letter A.', 'printables'],
  ['/printables/bubble-letters/letter-b/', 'Bubble Letter B', 'A puffy letter B.', 'printables'],
  ['/printables/bubble-letters/letter-c/', 'Bubble Letter C', 'A puffy letter C.', 'printables'],
  ['/printables/bubble-letters/letter-d/', 'Bubble Letter D', 'A puffy letter D.', 'printables'],
  ['/library/star-symbols/', 'Star Symbol Collection', 'Stars to copy.', 'library'],
  ['/learn/when-to-start/', 'When Should a Child Start Handwriting?', 'Age guidance.', 'learn'],
  ['/library/heart-symbols/', 'Heart Symbol Collection', 'Hearts for love notes.', 'library'],
  ['/fr/library/symboles-coeur/', 'Symboles cœur à copier', 'Cœurs élégants.', 'library'],
  ['/th/library/heart/', 'สัญลักษณ์หัวใจ', 'รวมหัวใจ', 'library'],
  ['/ja/library/heart/', 'ハート記号', 'ハートをコピー', 'library'],
];
const entries = S.prepare(rows);

eq(titles(entries, ''), [], 'an empty query returns nothing');
eq(titles(entries, '   '), [], 'a blank query returns nothing');
eq(titles(entries, 'zzzq'), [], 'a query matching nothing returns nothing');

eq(titles(entries, 'star'), ['Star Symbol Collection', 'When Should a Child Start Handwriting?'],
  'an exact word outranks a word that merely starts with it (the visitor may still be typing)');
eq(titles(entries, 'tar'), [], 'a match must begin at a word start, not mid-word');
eq(titles(entries, 'sta')[0], 'Star Symbol Collection',
  'a prefix still finds the page while the visitor is mid-word');

eq(titles(entries, 'heart love'), ['Heart Symbol Collection'],
  'every typed word must match, title or description');
eq(titles(entries, 'heart xyz'), [], 'one unmatched word drops the page');

eq(titles(entries, 'BUBBLE fonts')[0], 'Bubble Fonts Generator', 'matching ignores case');
eq(titles(entries, 'symboles'), ['Symboles cœur à copier'], 'a French word matches its own page');
eq(titles(entries, 'elegants'), ['Symboles cœur à copier'], 'Latin accents fold: "elegants" finds "élégants"');

eq(titles(entries, 'หัวใจ'), ['สัญลักษณ์หัวใจ'], 'Thai matches inside a spaceless title');
eq(titles(entries, 'ハート'), ['ハート記号'], 'Japanese matches inside a spaceless title');

const bubble = titles(entries, 'bubble');
eq(bubble[0], 'Bubble Fonts Generator', 'a hub outranks the per-letter pages under it');
ok(bubble.includes('Printable Bubble Letters A–Z & 0–9'),
  'the printables hub is not pushed off the list by its own letters');
eq(bubble.filter((t) => /^Bubble Letter [A-Z]$/.test(t)).length, 2,
  'at most two pages come from one deep folder');

eq(S.tokenize('Love & Heart, kaomoji!'), ['love', 'heart', 'kaomoji'], 'tokenize splits on punctuation');

/* ---- the generated index ---------------------------------------------- */

const INDEX_DIR = path.join(ROOT, 'js', 'search', 'index');
const files = fs.existsSync(INDEX_DIR) ? fs.readdirSync(INDEX_DIR).filter((f) => f.endsWith('.json')) : [];
ok(files.includes('en.json'), 'js/search/index/en.json exists (run npm run build:search-index -- --write)');

let checked = 0;
const missing = [];
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(INDEX_DIR, f), 'utf8'));
  const locale = f.replace(/\.json$/, '');
  eq(data.v, 1, `${f}: format version`);
  eq(data.locale, locale, `${f}: locale field matches its filename`);
  ok(Array.isArray(data.pages) && data.pages.length > 0, `${f}: has pages`);
  for (const row of data.pages) {
    checked++;
    if (row.length !== 4 || !row[1]) { failures.push(`${f}: malformed row ${JSON.stringify(row)}`); continue; }
    const file = path.join(ROOT, row[0], 'index.html');
    if (!fs.existsSync(file)) missing.push(`${f}: ${row[0]}`);
    if (locale !== 'en' && !row[0].startsWith(`/${locale}/`)) {
      failures.push(`${f}: ${row[0]} is not under /${locale}/`);
    }
  }
}
eq(missing.slice(0, 10), [], 'every indexed path is a page in this tree (stale index? rebuild it)');

/* ---- the live English index answers real queries ---------------------- */

if (files.includes('en.json')) {
  const en = S.prepare(JSON.parse(fs.readFileSync(path.join(INDEX_DIR, 'en.json'), 'utf8')).pages);
  const top = (q) => (S.search(en, q, 8)[0] || {}).path;
  eq(top('bold'), '/category/bold-fonts/', 'live: "bold" opens the bold fonts generator');
  ok(S.search(en, 'heart', 8).some((e) => e.path === '/library/heart-symbols/'),
    'live: "heart" lists the heart symbol collection');
  ok(S.search(en, 'bubble', 8).some((e) => e.path === '/printables/bubble-letters/'),
    'live: "bubble" lists the bubble letters printables hub');
}

/* ---- report ------------------------------------------------------------ */

if (failures.length) {
  console.error(`siteSearch.test.js: ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`siteSearch.test.js: all ${pass} assertions passed (${checked} index rows checked)`);
