#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const GTM_ID = 'GTM-P55HXK8Q';
const ROOT = path.resolve(__dirname, '..');

// Which files count as pages the site-wide infra tags must appear on — shared
// with check-gtm.js / check-ads.js / check-funding-choices.js so the three can
// never disagree about what a page is. See scripts/lib/page-infra-targets.js.
const { shouldSkipPath, isVerificationStub } = require('./lib/page-infra-targets');

const files = globSync('**/*.html', { cwd: ROOT, absolute: true });

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  if (shouldSkipPath(file, ROOT)) {
    skipped++;
    continue;
  }

  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  if (isVerificationStub(content)) {
    skipped++;
    continue;
  }

  const scriptMatches = (content.match(new RegExp(GTM_ID, 'g')) || []);
  // noscript occurrences
  // Match noscript block containing an iframe pointing to GTM ns.html with the correct id param
  const noscriptMatches = (content.match(new RegExp(
    `<noscript>[\\s\\S]*?<iframe[^>]+googletagmanager\\.com/ns\\.html[^>]*[?&]id=${GTM_ID}`,
    'g'
  )) || []);

  const hasScript = scriptMatches.length > 0;
  const hasNoscript = noscriptMatches.length > 0;
  // Duplicate detection: count occurrences of the GTM ID in any quote style
  const scriptTagCount = (content.match(new RegExp('[\'"`]' + GTM_ID + '[\'"`]', 'g')) || []).length;
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
