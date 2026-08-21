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

// Patterns in the file path that indicate files to skip
const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];

// Also skip files under build/helper directories (node_modules, etc.)
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

// Search-engine site-ownership verification files (e.g. Naver's HTML-upload
// method — see naverfc08aab480545cfd1d61489b3536a5e6.html) are plain-text
// stubs at the site root, not real pages: they must stay byte-exact to what
// the search engine issued, so page-infra tags like this one can never be
// injected into them. Detected by content signature rather than filename,
// so a future engine's verification file doesn't need a new entry here —
// every major search engine's file-upload method emits a single
// "<service>-site-verification: <filename>" line as the entire content.
const VERIFICATION_STUB_RE = /^[\w-]+-site-verification:\s/;

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

  if (VERIFICATION_STUB_RE.test(content.trimStart())) {
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
