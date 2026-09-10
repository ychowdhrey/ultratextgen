#!/usr/bin/env node
'use strict';
/**
 * check-collection-grid-prerender.js  (npm run check:collection-grids)
 *
 * The enforcing half of scripts/prerender-collection-grids.js. DIFF-SCOPED,
 * like check-accessibility.js and check-faq-schema.js: it inspects only the
 * HTML this branch adds or changes, so nothing elsewhere can make it red.
 *
 * It fails when a page a PR touches renders a collection grid whose static
 * block is missing or out of date against that page's own GROUPS array — i.e.
 * when running `npm run prerender:collection-grids -- --write` would change it.
 *
 * A STATE CHECK ON CHANGED PAGES, not a delta, for the same reason
 * check-accessibility.js is: there is no backlog to be red against. All 898
 * pages carry a current block, so "this page's grid is JavaScript-only now" is
 * worth failing on whether or not it was before. The fix is always one command.
 *
 * WHY IT EXISTS. The grids went JavaScript-only on every one of the 898 pages
 * that render them, and no gate on this site could see it: the parity
 * fingerprint reads the buildGrids CALL rather than its output, the locale and
 * FAQ gates read text that was not there, and the image gates read assets.
 * CLAUDE.md's Discovery Model section names the cost — several search and AI
 * crawlers execute no JavaScript — which on these pages is the whole payload.
 * Without a gate the next generated page simply ships without its block again.
 *
 *   --base <ref>   diff against another ref (default origin/main, CI passes it)
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { run } = require('./prerender-collection-grids.js');

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

console.log('Collection-grid pre-render check (diff-scoped)');
console.log(`  base:          ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed .html: ${changed.length}`);

if (!changed.length) {
  console.log('\nNo changed HTML. ✓');
  process.exit(0);
}

const res = run({ write: false, verbose: false, files: changed });

if (!res.updated && !res.errors.length) {
  console.log(`\n${res.targets} changed page(s) render a collection grid; every block is current. ✓`);
  process.exit(0);
}

console.log('');
if (res.updated) {
  console.log(`${res.updated} changed page(s) have a missing or stale pre-rendered collection block.`);
  console.log('Each one ships its collections to JavaScript only, so a crawler that runs none');
  console.log('sees an empty section where the page\'s payload should be.');
}
if (res.errors.length) {
  console.log(`${res.errors.length} changed page(s) could not be pre-rendered at all (listed above).`);
}
console.log('\nFix:  npm run prerender:collection-grids -- --write');
console.log('      then commit the regenerated pages.');
process.exit(1);
