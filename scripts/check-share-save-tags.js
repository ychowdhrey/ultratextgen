#!/usr/bin/env node
'use strict';

/**
 * check-share-save-tags.js — a page that hosts a copy target must load the
 * shared Save and Share modules.
 *
 * Whole-site and gating, the same call as check:funding-choices and
 * check:zalgo-decodes rather than check:images: there is no backlog to be
 * permanently red against. Either a page carries the two tags or it does not,
 * and `node scripts/inject-share-save-tags.js` closes any gap in one
 * idempotent run.
 *
 * Whole-site rather than diff-scoped on purpose. The shape this catches is a
 * page generator emitting a template that predates the split — a NEW page
 * arriving without the tags, from a file the PR may not even touch. A
 * diff-scoped check cannot see that; the same reasoning as
 * check-updates-verification.js.
 *
 *   node scripts/check-share-save-tags.js
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const L = require('./lib/share-save-tags.js');

if (!L.modulesExist()) {
  console.error(`Missing shared module on disk:\n  ${L.SHARE_CORE}\n  ${L.SAVED_ITEMS}`);
  console.error('Every page tagged for them would 404 its own JavaScript.');
  process.exit(1);
}

const files = globSync('**/*.html', { cwd: L.ROOT, absolute: true });

const missing = [];
const misordered = [];

for (const file of files) {
  if (L.shouldSkip(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (L.firstHostIndex(html) === -1) continue;

  const needs = L.requiredTags(html);
  if (needs.length) {
    missing.push({ file: path.relative(L.ROOT, file), needs });
    continue;
  }
  // Presence is not correctness. Every one of these scripts is `defer`, so
  // they run in document order, and script.js calls UTG.sharedStyleId() at
  // init — a module tag sitting after its consumer throws and the page
  // renders nothing. 300 pages shipped exactly that on this branch's first
  // pass, and a presence-only check reported all 3,846 as fine.
  if (!L.tagsAreOrdered(html)) misordered.push(path.relative(L.ROOT, file));
}

if (!missing.length && !misordered.length) {
  console.log('check-share-save-tags: every copy-hosting page loads the shared Save/Share modules, before the scripts that consume them.');
  process.exit(0);
}

if (missing.length) {
  console.error(`check-share-save-tags: ${missing.length} page(s) host a copy target but do not load the shared modules.\n`);
  for (const row of missing.slice(0, 25)) {
    console.error(`  ${row.file}`);
    row.needs.forEach((n) => console.error(`      missing ${n}`));
  }
  if (missing.length > 25) console.error(`  … and ${missing.length - 25} more\n`);
}

if (misordered.length) {
  console.error(`\ncheck-share-save-tags: ${misordered.length} page(s) load the modules AFTER a script that consumes them.\n`);
  console.error('  Every one of these is `defer`, so they execute in document order. script.js');
  console.error('  calls UTG.sharedStyleId() during init; a module tag placed after it throws');
  console.error('  and the generator renders zero result cards.\n');
  misordered.slice(0, 25).forEach((f) => console.error(`  ${f}`));
  if (misordered.length > 25) console.error(`  … and ${misordered.length - 25} more`);
}

console.error('\nFix: node scripts/inject-share-save-tags.js  (it repairs order as well as absence)');
console.error('If a page genuinely should not offer Save/Share, it should not be rendering copy buttons either.');
process.exit(1);
