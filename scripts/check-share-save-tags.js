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
let checked = 0;

for (const file of files) {
  if (L.shouldSkip(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const needs = L.requiredTags(html);
  if (!needs.length) continue;
  checked++;
  missing.push({ file: path.relative(L.ROOT, file), needs });
}

if (!missing.length) {
  console.log('check-share-save-tags: every copy-hosting page loads the shared Save/Share modules.');
  process.exit(0);
}

console.error(`check-share-save-tags: ${missing.length} page(s) host a copy target but do not load the shared modules.\n`);
for (const row of missing.slice(0, 40)) {
  console.error(`  ${row.file}`);
  row.needs.forEach((n) => console.error(`      missing ${n}`));
}
if (missing.length > 40) console.error(`\n  … and ${missing.length - 40} more`);
console.error('\nFix: node scripts/inject-share-save-tags.js');
console.error('If a page genuinely should not offer Save/Share, it should not be rendering copy buttons either.');
process.exit(1);
