#!/usr/bin/env node
'use strict';

/**
 * build-search-index.js — the data behind the header search box.
 *
 *   node scripts/build-search-index.js            report what would change
 *   node scripts/build-search-index.js --write    write js/search/index/<locale>.json
 *   node scripts/build-search-index.js --check    exit 1 when the files are stale
 *
 * WHY THIS EXISTS
 * ---------------
 * Every page carries the shared header and its search box (header.js), but
 * until 2026-10-02 the only thing listening to that box was script.js's style
 * filter, which loads on ~544 of ~4,745 pages. On the other ~4,200 (every
 * library, symbol, guide, answers and printables page) typing and pressing
 * Enter did nothing at all. js/search/site-search.js turns the box into a
 * site search with a suggestions list; this script writes the per-locale
 * index it fetches on first focus.
 *
 * NOTHING HERE IS AUTHORED
 * ------------------------
 * The page walk, the noindex filter, the title (the page's own <h1>), the
 * one-line description and the section are all `collectPages()` from
 * scripts/lib/llms-index.js. That is the same reading llms.txt is built from,
 * so the two indexes can never disagree about what a page is called or which
 * pages exist. A second page reader here would be the drift that rule exists
 * to prevent.
 *
 * FORMAT
 * ------
 * One file per locale, because a visitor searches in the language of the page
 * they are on, and English alone is ~160KB raw / ~43KB gzipped. Each row is
 * [path, title, description, section] — positional, to keep the payload
 * small. Output is sorted and byte-stable so --check is deterministic.
 */

const fs = require('fs');
const path = require('path');
const { collectPages, ROOT } = require('./lib/llms-index');

const OUT_DIR = path.join(ROOT, 'js', 'search', 'index');
const FORMAT_VERSION = 1;
// The suggestions list shows a description under each title on one line; a
// longer one is never visible, so it is only payload.
const MAX_DESC = 140;

function clip(s) {
  if (s.length <= MAX_DESC) return s;
  const cut = s.slice(0, MAX_DESC - 1);
  const space = cut.lastIndexOf(' ');
  return (space > MAX_DESC * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, '') + '…';
}

function buildIndexes() {
  const { pages } = collectPages();
  const byLocale = new Map();
  for (const p of pages) {
    const urlPath = p.url.replace(/^https:\/\/ultratextgen\.com/, '');
    if (!p.title) throw new Error(`search-index: ${p.file} has no <h1>; nothing to show for it`);
    if (!byLocale.has(p.locale)) byLocale.set(p.locale, []);
    byLocale.get(p.locale).push([urlPath, p.title, clip(p.description || ''), p.section || '']);
  }
  const out = new Map();
  for (const [locale, rows] of [...byLocale].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const body = JSON.stringify({ v: FORMAT_VERSION, locale, pages: rows });
    out.set(`${locale}.json`, body + '\n');
  }
  return out;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has('--write');
  const check = args.has('--check');

  const wanted = buildIndexes();
  if (wanted.size === 0) {
    // A page walk that found nothing is a broken walk, not an empty site.
    console.error('search-index: UNKNOWN — the page walk returned no pages');
    process.exit(3);
  }

  const existing = fs.existsSync(OUT_DIR)
    ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'))
    : [];
  const changed = [];
  for (const [name, body] of wanted) {
    const file = path.join(OUT_DIR, name);
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (cur !== body) changed.push(name);
  }
  const orphaned = existing.filter((f) => !wanted.has(f));

  let total = 0;
  for (const body of wanted.values()) total += JSON.parse(body).pages.length;
  console.log(`search-index: ${total} pages across ${wanted.size} locales; `
    + `${changed.length} file(s) out of date, ${orphaned.length} orphaned`);
  for (const f of changed) console.log(`  stale: js/search/index/${f}`);
  for (const f of orphaned) console.log(`  orphaned: js/search/index/${f}`);

  if (write) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const name of changed) fs.writeFileSync(path.join(OUT_DIR, name), wanted.get(name));
    for (const name of orphaned) fs.unlinkSync(path.join(OUT_DIR, name));
    console.log('search-index: written');
    return;
  }
  if (check && (changed.length || orphaned.length)) {
    console.error('search-index: run `npm run build:search-index -- --write`');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { buildIndexes, OUT_DIR };
