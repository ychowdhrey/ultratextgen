#!/usr/bin/env node
'use strict';

// Verifies the Journey ads script (scriptwrapper) is deployed site-wide.
//
// The ad tag is NOT hand-added per page. It is injected at runtime by
// header.js (single source of truth), which every page loads. So this check
// enforces two invariants:
//   1. header.js still references the ad tag id.
//   2. Every non-skipped HTML page loads header.js (and thus gets the ad tag).

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const AD_TAG_ID = 'e381520a-ca23-48ca-a066-83c420ddddea';
const HEADER_SCRIPT_RE = /<script[^>]+src=["']\/header\.js["']/i;
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

const errors = [];

// 1. The single source of truth (header.js) must still carry the ad tag.
const headerPath = path.join(ROOT, 'header.js');
const headerContent = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : '';
if (!headerContent.includes(AD_TAG_ID)) {
  errors.push('MISSING ad tag in header.js (single source of truth)');
}

// 2. Every non-skipped HTML page must load header.js so the ad tag propagates.
const files = globSync('**/*.html', { cwd: ROOT, absolute: true });

let passed = 0;
let failed = 0;
let skipped = 0;

for (const file of files) {
  if (shouldSkip(file)) {
    skipped++;
    continue;
  }

  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  if (HEADER_SCRIPT_RE.test(content)) {
    passed++;
  } else {
    errors.push(`MISSING header.js (no ad script): ${rel}`);
    failed++;
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
  console.log('All checked pages deploy the Journey ads script. ✓');
  process.exit(0);
}
