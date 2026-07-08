#!/usr/bin/env node
'use strict';

// Verifies the Journey ads script (scriptwrapper) is present on every page.
//
// The tag is hard-coded into each page's <head> (right after the Grow
// initializer) so Journey's verification crawler — which reads raw HTML and
// does not execute JS — can detect it. This check enforces that every
// non-skipped HTML page carries exactly one copy of the tag.

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const AD_TAG_ID = 'e381520a-ca23-48ca-a066-83c420ddddea';
const ROOT = path.resolve(__dirname, '..');

// Patterns in the file path that indicate files to skip
const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];

// Also skip files under build/helper directories (node_modules, etc.)
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const segments = rel.split('/');

  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (SKIP_SEGMENTS.includes(lower)) return true;
    if (SKIP_DIRS.includes(lower)) return true;
    // skip test/demo filenames
    if (/\.(test|demo|widget|embed)\b/i.test(seg)) return true;
  }
  return false;
}

const files = globSync('**/*.html', { cwd: ROOT, absolute: true });

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  if (shouldSkip(file)) {
    skipped++;
    continue;
  }

  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  const count = (content.match(new RegExp(AD_TAG_ID, 'g')) || []).length;

  if (count === 0) {
    errors.push(`MISSING Journey ads script: ${rel}`);
    failed++;
  } else if (count > 1) {
    errors.push(`DUPLICATE Journey ads script: ${rel}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`Ads Check (${AD_TAG_ID})`);
console.log(`  Checked : ${passed + failed}`);
console.log(`  Passed  : ${passed}`);
console.log(`  Failed  : ${failed}`);
console.log(`  Skipped : ${skipped}`);

if (errors.length > 0) {
  console.log('');
  console.log('Errors:');
  for (const err of errors) {
    console.log(`  ✗ ${err}`);
  }
  process.exit(1);
} else {
  console.log('');
  console.log('All checked pages have the Journey ads script. ✓');
  process.exit(0);
}
