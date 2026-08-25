#!/usr/bin/env node
'use strict';

// Verifies the Google AdSense loader is present on every page.
//
// The site monetizes via AdSense Auto Ads: each page carries a single
// AdSense loader (client ca-pub-...) in its <head>. This check enforces that
// every non-skipped HTML page carries exactly one copy of the loader — no
// missing pages (unmonetized) and no duplicates (which can trip AdSense
// policy). The previous Journey/Grow/Mediavine scripts were removed
// site-wide; do not reintroduce them.

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const AD_CLIENT = 'ca-pub-8242324164413945';
const ROOT = path.resolve(__dirname, '..');

// Guard ads.txt itself: it must authorize this site's own AdSense pub id and
// must never carry Journey's managerdomain/seller lines again. Journey ran a
// daily workflow that overwrote ads.txt from its hosted file every night;
// that workflow is gone, but this check catches any future reintroduction
// (manual edit, a resurrected workflow, a copy-pasted snippet) at PR time.
const adsTxtPath = path.join(ROOT, 'ads.txt');
const adsTxt = fs.readFileSync(adsTxtPath, 'utf8');
let adsTxtOk = true;

if (/journeymv\.com|managerdomain=/i.test(adsTxt)) {
  console.log('  ✗ ads.txt: LEFTOVER Journey manager/seller line found');
  adsTxtOk = false;
}
if (!adsTxt.includes('pub-8242324164413945')) {
  console.log('  ✗ ads.txt: missing this site\'s AdSense pub id (pub-8242324164413945)');
  adsTxtOk = false;
}

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

  // Guard against the old ad stack sneaking back in.
  if (/scriptwrapper\.com|data-grow-initializer|faves\.grow\.me/.test(content)) {
    errors.push(`LEFTOVER Journey/Grow/Mediavine script: ${rel}`);
    failed++;
    continue;
  }

  const count = (content.match(new RegExp(AD_CLIENT, 'g')) || []).length;

  if (count === 0) {
    errors.push(`MISSING AdSense loader: ${rel}`);
    failed++;
  } else if (count > 1) {
    errors.push(`DUPLICATE AdSense loader: ${rel}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`Ads Check (${AD_CLIENT})`);
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
}

if (errors.length > 0 || !adsTxtOk) {
  process.exit(1);
} else {
  console.log('');
  console.log('All checked pages have the AdSense loader, and ads.txt is clean. ✓');
  process.exit(0);
}
