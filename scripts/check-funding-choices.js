#!/usr/bin/env node
'use strict';

// Verifies Google's Funding Choices ad blocking recovery tag is present on
// every page. Same shape as scripts/check-gtm.js / scripts/check-ads.js —
// see scripts/inject-funding-choices-tag.js for how the tag was deployed.

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const AD_CLIENT = 'pub-8242324164413945';
const MARKER = 'fundingchoicesmessages.google.com';
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

  const markerCount = (content.match(new RegExp(MARKER.replace(/\./g, '\\.'), 'g')) || []).length;
  const hasClient = content.includes(AD_CLIENT + '?ers=1');

  if (markerCount === 0) {
    errors.push(`MISSING funding choices tag: ${rel}`);
    failed++;
  } else if (markerCount > 1) {
    errors.push(`DUPLICATE funding choices tag: ${rel}`);
    failed++;
  } else if (!hasClient) {
    errors.push(`WRONG pub id in funding choices tag: ${rel}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`Funding Choices Check (${AD_CLIENT})`);
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
  console.log('All checked pages have the Funding Choices tag. ✓');
  process.exit(0);
}
