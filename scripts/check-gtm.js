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
