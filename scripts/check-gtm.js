#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const GTM_ID = 'GTM-P55HXK8Q';
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

  const scriptMatches = (content.match(new RegExp(GTM_ID, 'g')) || []);
  // noscript occurrences
  const noscriptMatches = (content.match(new RegExp(`<noscript>[^<]*<iframe[^>]+googletagmanager\\.com/ns\\.html[^>]*id=${GTM_ID}`, 'g')) || []);

  const hasScript = scriptMatches.length > 0;
  const hasNoscript = noscriptMatches.length > 0;
  // Duplicate detection: more than one occurrence of the GTM ID in a script tag context
  const scriptTagCount = (content.match(new RegExp(`'${GTM_ID}'`, 'g')) || []).length;
  const hasDuplicate = scriptTagCount > 1;

  if (!hasScript) {
    errors.push(`MISSING GTM script: ${rel}`);
    failed++;
  } else if (!hasNoscript) {
    errors.push(`MISSING GTM noscript: ${rel}`);
    failed++;
  } else if (hasDuplicate) {
    errors.push(`DUPLICATE GTM container: ${rel}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`GTM Check (${GTM_ID})`);
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
  console.log('All checked pages have valid GTM tags. ✓');
  process.exit(0);
}
