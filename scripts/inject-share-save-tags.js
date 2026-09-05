#!/usr/bin/env node
'use strict';

/**
 * inject-share-save-tags.js — put /js/share/share-core.js and
 * /js/saved/saved-items.js on every page that hosts a copy target.
 *
 * Same shape as scripts/inject-funding-choices-tag.js: idempotent, scoped by
 * the site's shared skip rules, safe to re-run. What counts as a page needing
 * the tags lives in scripts/lib/share-save-tags.js, which the gate reads too.
 *
 * The tags go immediately BEFORE the page's own host script tag, and that
 * order is load-bearing rather than cosmetic. Every one of these scripts is
 * `defer`, so they execute in document order: placing the modules after
 * script.js made script.js's own init call UTG.sharedStyleId() before
 * share-core.js had defined it, which threw and left the generator rendering
 * zero result cards. Both modules are dependency-free, so first is always safe.
 *
 *   node scripts/inject-share-save-tags.js --dry-run
 *   node scripts/inject-share-save-tags.js
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const L = require('./lib/share-save-tags.js');

const DRY = process.argv.includes('--dry-run');

if (!L.modulesExist()) {
  console.error('Refusing to run: one of the shared modules is missing from disk.');
  console.error(`  ${L.SHARE_CORE}\n  ${L.SAVED_ITEMS}`);
  console.error('Tagging pages for a script that does not exist would 404 on every one.');
  process.exit(2);
}

const files = globSync('**/*.html', { cwd: L.ROOT, absolute: true });

let updated = 0;
let alreadyComplete = 0;
let notApplicable = 0;
let skipped = 0;
const noAnchor = [];

for (const file of files) {
  if (L.shouldSkip(file)) { skipped++; continue; }

  const html = fs.readFileSync(file, 'utf8');
  const needs = L.requiredTags(html);
  if (!needs.length) {
    (html.includes(`src="${L.HOST_SCRIPTS.generator}"`) || html.includes(`src="${L.HOST_SCRIPTS.explorer}"`))
      ? alreadyComplete++
      : notApplicable++;
    continue;
  }

  // Anchor on the page's own host script tag so the modules land in the same
  // block, in a predictable order, rather than wherever </body> happens to be
  // relative to other injected snippets.
  const host = html.includes(`src="${L.HOST_SCRIPTS.explorer}"`)
    ? L.HOST_SCRIPTS.explorer
    : L.HOST_SCRIPTS.generator;
  const hostTagRe = new RegExp(`([ \\t]*)<script src="${host.replace(/[/.]/g, '\\$&')}"[^>]*></script>`);
  const m = html.match(hostTagRe);
  if (!m) { noAnchor.push(path.relative(L.ROOT, file)); continue; }

  const indent = m[1] || '';
  const block = needs.map((src) => `${indent}${L.tagFor(src)}\n`).join('');
  const next = html.replace(hostTagRe, `${block}${m[0]}`);

  if (!DRY) fs.writeFileSync(file, next);
  updated++;
}

console.log(DRY ? 'inject-share-save-tags (dry run)' : 'inject-share-save-tags');
console.log(`  pages tagged            : ${updated}`);
console.log(`  already complete        : ${alreadyComplete}`);
console.log(`  no copy host (untouched): ${notApplicable}`);
console.log(`  skipped by scope rules  : ${skipped}`);
if (noAnchor.length) {
  console.log(`\n  ${noAnchor.length} page(s) host a copy runtime but matched no anchor tag:`);
  noAnchor.slice(0, 20).forEach((f) => console.log(`    - ${f}`));
  if (noAnchor.length > 20) console.log(`    … and ${noAnchor.length - 20} more`);
}
