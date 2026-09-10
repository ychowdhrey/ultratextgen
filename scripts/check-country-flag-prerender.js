#!/usr/bin/env node
'use strict';
/**
 * check-country-flag-prerender.js  (npm run check:country-flags)
 *
 * The enforcing half of scripts/prerender-country-flags.js. DIFF-SCOPED, like
 * check-collection-grid-prerender.js beside it, so nothing elsewhere in the
 * tree can make it red.
 *
 * It fails when a page a PR touches renders country flag tiles whose static
 * block is missing or out of date against that page's own COUNTRIES registry
 * — i.e. when running `npm run prerender:country-flags -- --write` would
 * change it.
 *
 * A STATE CHECK ON CHANGED PAGES, not a delta, for the same reason its sibling
 * is: there is no backlog to be red against. All 17 pages carry a current
 * block, so "this page's flag tiles are JavaScript-only now" is worth failing
 * on whether or not they were before. The fix is always one command.
 *
 * WHY IT EXISTS. Fifteen of the seventeen emoji-flag pages rendered ZERO
 * country tiles without JavaScript, and no gate on this site could see it: the
 * parity fingerprint reads links and section counts, the locale gate reads
 * text that was not in the HTML, the accessibility gate reads markup that
 * rendered, and the image gates read assets. CLAUDE.md's Discovery Model
 * section names the cost — several search and AI crawlers execute none — and
 * on these pages the tiles are the entire payload.
 *
 *   --base <ref>   diff against another ref (default origin/main, CI passes it)
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { run } = require('./prerender-country-flags.js');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx === -1 ? 'origin/main' : args[baseIdx + 1];

function git(cmdArgs) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(0); // no base to compare against is not this check's failure
}

const changed = git(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}..HEAD`])
  .split('\n')
  .map((s) => s.trim())
  .filter((f) => f.endsWith('.html'))
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

console.log('Country-flag pre-render check (diff-scoped)');
console.log(`  base:          ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed .html: ${changed.length}`);

if (!changed.length) {
  console.log('\nNo changed HTML. ✓');
  process.exit(0);
}

const res = run({ write: false, verbose: false, files: changed });

if (!res.updated && !res.errors.length) {
  console.log(`\n${res.targets} changed page(s) render country flag tiles; every block is current. ✓`);
  process.exit(0);
}

console.log('');
if (res.updated) {
  console.log(`${res.updated} changed page(s) have a missing or stale pre-rendered country-flag block.`);
  console.log('Each one ships its 195 tiles to JavaScript only, so a crawler that runs none');
  console.log('sees an empty box where the page\'s payload should be.');
}
if (res.errors.length) {
  console.log(`${res.errors.length} changed page(s) could not be pre-rendered at all (listed above).`);
}
console.log('\nFix:  npm run prerender:country-flags -- --write');
console.log('      then commit the regenerated pages.');
process.exit(1);
