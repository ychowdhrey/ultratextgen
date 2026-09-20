#!/usr/bin/env node
'use strict';

/**
 * audit-llms-index.js — the whole-site dashboard for the llms.txt hierarchy.
 *
 *   npm run audit:llms                 summary + per-file sizes + locale matrix
 *   npm run audit:llms -- --locale de  one locale
 *   npm run audit:llms -- --full       every excluded page and every duplicate
 *   npm run audit:llms -- --json <p>   raw data
 *
 * **Informational, never gating** — same call as `check:images` and
 * `audit:library-hub-coverage`. The things it reports are questions for a
 * person (is a 60 KB index still useful? should `hi` have more than nine
 * pages?), not defects a PR author introduced. `npm run check:llms` is the
 * gate, and it fails only on what the generator can prove wrong.
 *
 * The one number here worth watching is the locale coverage matrix: it answers
 * "which route families exist in this language, and which do not", which is
 * the question the hierarchy is built to expose and which no other audit in
 * this repo asks in one place.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib/llms-index');

const argv = process.argv.slice(2);
const FULL = argv.includes('--full');
const localeAt = argv.indexOf('--locale');
const ONLY_LOCALE = localeAt !== -1 ? argv[localeAt + 1] : null;
const jsonAt = argv.indexOf('--json');
const JSON_PATH = jsonAt !== -1 ? argv[jsonAt + 1] : null;

/**
 * A file past this is flagged for a human to look at, not failed. The figure is
 * the site's own distribution rather than a round number: of the 85 files, 83
 * sit under 40 KB and the two above it are `library/llms.txt` (339 entries) and
 * `es/library/llms.txt` (254) — both genuinely one directory, so splitting them
 * would put an index at a path that does not cover what it lists.
 */
const LARGE_FILE_BYTES = 64 * 1024;

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(0)}%` : '—';
}

function main() {
  const result = L.build();
  const stats = L.fileStats(result.files);
  const problems = L.validate(result);

  const totalBytes = stats.reduce((n, s) => n + s.bytes, 0);
  const totalLinks = stats.reduce((n, s) => n + s.links, 0);

  console.log('llms.txt hierarchy');
  console.log('──────────────────');
  console.log(`  files                 ${stats.length}`);
  console.log(`  pages represented     ${result.pages.length}`);
  console.log(`  links emitted         ${totalLinks}  (pages + ${totalLinks - result.pages.length} index links)`);
  console.log(`  languages             ${result.locales.size}`);
  console.log(`  total bytes           ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`  noindex routes skipped ${result.skippedNoindex.length}`);
  console.log(`  validation problems   ${problems.length}`);
  console.log('');

  // ── description provenance ────────────────────────────────────────────────
  const sources = new Map();
  for (const p of result.pages) sources.set(p.descriptionSource, (sources.get(p.descriptionSource) || 0) + 1);
  console.log('Description source (every description is read off the page it describes)');
  for (const [src, n] of [...sources].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(src || '(none)').padEnd(20)} ${String(n).padStart(5)}  ${pct(n, result.pages.length)}`);
  }
  console.log('');

  // ── duplicate descriptions ────────────────────────────────────────────────
  const byDesc = new Map();
  for (const p of result.pages) {
    if (!p.description) continue;
    if (!byDesc.has(p.description)) byDesc.set(p.description, []);
    byDesc.get(p.description).push(p.url);
  }
  const dups = [...byDesc.entries()].filter(([, urls]) => urls.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  console.log(`Duplicate descriptions: ${dups.length} string(s) across ${dups.reduce((n, d) => n + d[1].length, 0)} pages`);
  for (const [desc, urls] of (FULL ? dups : dups.slice(0, 8))) {
    console.log(`  x${urls.length}  ${JSON.stringify(desc.slice(0, 70))}`);
    if (FULL) for (const u of urls) console.log(`        ${u}`);
  }
  console.log('');

  // ── file sizes ────────────────────────────────────────────────────────────
  const shown = ONLY_LOCALE
    ? stats.filter((s) => s.relPath === `${ONLY_LOCALE}/${L.FILE_NAME}` || s.relPath.startsWith(`${ONLY_LOCALE}/`))
    : stats;
  const width = Math.max(10, ...shown.map((s) => s.relPath.length));
  console.log('File sizes');
  for (const s of shown.slice().sort((a, b) => b.bytes - a.bytes)) {
    const flag = s.bytes > LARGE_FILE_BYTES ? '  ← large, review' : '';
    console.log(`  /${s.relPath.padEnd(width)} ${String(s.links).padStart(5)} links  ${(s.bytes / 1024).toFixed(1).padStart(7)} KB${flag}`);
  }
  console.log('');

  // ── locale coverage matrix ────────────────────────────────────────────────
  //
  // Which route families a language actually has. A blank cell means the
  // language has no page of that kind AT ALL — not that a page exists and was
  // left out, which is the distinction that makes this table worth reading.
  const sectionIds = L.SECTION_ORDER.filter((id) => id !== 'home' && id !== 'about');
  const codes = [...result.locales.keys()].sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a < b ? -1 : 1));
  const head = ['locale', 'pages', ...sectionIds.map((s) => s.slice(0, 9))];
  console.log('Locale coverage — pages per section (· = this language has none)');
  console.log('  ' + head.map((h, i) => (i < 2 ? h.padEnd(i ? 6 : 6) : h.padStart(10))).join(''));
  for (const code of codes) {
    if (ONLY_LOCALE && code !== ONLY_LOCALE) continue;
    const loc = result.locales.get(code);
    const cells = sectionIds.map((id) => {
      const s = loc.sectionList.find((x) => x.id === id);
      if (!s) return '·'.padStart(10);
      return `${s.pages.length}${s.files.length ? '*' : ''}`.padStart(10);
    });
    console.log('  ' + code.padEnd(6) + String(loc.pages.length).padEnd(6) + cells.join(''));
  }
  console.log('  * = the section has its own llms.txt index at a real directory');
  console.log('');

  // ── language-specific pages (no English parent) ───────────────────────────
  const localOnly = result.pages.filter((p) => p.section === 'local-only');
  console.log(`Language-specific pages (no hreflang="en" parent): ${localOnly.length}`);
  for (const p of localOnly) console.log(`  ${p.url}`);
  console.log('');

  // ── exclusions ────────────────────────────────────────────────────────────
  console.log(`Excluded routes: ${result.skippedNoindex.length} (meta robots noindex)`);
  for (const p of result.skippedNoindex) console.log(`  ${p.url}`);
  console.log('');

  if (problems.length) {
    console.log(`Validation problems (${problems.length}) — run npm run check:llms`);
    for (const p of problems.slice(0, FULL ? problems.length : 20)) console.log(`  ${p}`);
  }

  if (JSON_PATH) {
    fs.writeFileSync(path.resolve(JSON_PATH), JSON.stringify({
      generated: new Date().toISOString().slice(0, 10),
      files: stats,
      pages: result.pages.length,
      locales: [...result.locales.keys()],
      duplicateDescriptions: dups.map(([desc, urls]) => ({ desc, urls })),
      problems,
    }, null, 2) + '\n', 'utf8');
    console.log(`\nWrote ${JSON_PATH}`);
  }
}

if (require.main === module) main();
