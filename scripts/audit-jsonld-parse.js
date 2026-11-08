#!/usr/bin/env node
'use strict';

/**
 * audit-jsonld-parse.js — whole-site dashboard for JSON-LD that no consumer
 * can read. The definition lives in scripts/lib/jsonld-parse.js and is shared
 * with scripts/check-jsonld-parse.js, the diff-scoped CI gate.
 *
 * Usage:
 *   node scripts/audit-jsonld-parse.js
 *
 * Exit 0 = every block on every tracked page parses, 1 = at least one does
 * not, 2 = UNKNOWN (the tree could not be listed).
 */

const path = require('path');
const { scanTree } = require('./lib/jsonld-parse');

const ROOT = path.resolve(__dirname, '..');

let result;
try {
  result = scanTree(ROOT);
} catch (e) {
  console.error(`UNKNOWN: could not scan the tree: ${e.message}`);
  process.exit(2);
}

console.log('JSON-LD Parse Audit (whole site)');
console.log(`  pages scanned:      ${result.scanned}`);
console.log(`  JSON-LD blocks:     ${result.blocks}`);
console.log(`  unreadable blocks:  ${result.failures.length}`);

if (!result.failures.length) {
  console.log('\nEvery JSON-LD block on every tracked page parses. ✓');
  process.exit(0);
}

console.log('');
for (const f of result.failures) console.log(`  ✗ ${f.rel}:${f.line} ${f.error}`);
process.exit(1);
