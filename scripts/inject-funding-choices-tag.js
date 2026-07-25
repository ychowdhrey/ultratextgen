#!/usr/bin/env node
'use strict';

// Inserts Google's Funding Choices ad blocking recovery tag (+ the optional
// error protection message tag) as the first thing inside <head> on every
// real page of the site. Source snippet: scripts/data/funding-choices-tag.html
// (copied verbatim from the AdSense "Ad blocking recovery" > Tagging console
// for pub-8242324164413945 — do not hand-edit that file's JS payload).
//
// Same SKIP_SEGMENTS/SKIP_DIRS scope as scripts/check-gtm.js and
// scripts/check-ads.js, so this only touches pages that already carry those
// site-wide tags.

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '..');
const SNIPPET_PATH = path.join(__dirname, 'data', 'funding-choices-tag.html');
const MARKER = 'fundingchoicesmessages.google.com';

const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const segments = rel.split('/');

  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (SKIP_SEGMENTS.includes(lower)) return true;
    if (SKIP_DIRS.includes(lower)) return true;
    if (/\.(test|demo|widget|embed)\b/i.test(seg)) return true;
  }
  return false;
}

const snippet = fs.readFileSync(SNIPPET_PATH, 'utf8').trim();
const HEAD_OPEN_RE = /<head(\s[^>]*)?>/i;

const files = globSync('**/*.html', { cwd: ROOT, absolute: true });

let inserted = 0;
let alreadyPresent = 0;
let missingHead = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  if (shouldSkip(file)) {
    skipped++;
    continue;
  }

  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  if (content.includes(MARKER)) {
    alreadyPresent++;
    continue;
  }

  const match = content.match(HEAD_OPEN_RE);
  if (!match) {
    errors.push(`NO <head> TAG: ${rel}`);
    missingHead++;
    continue;
  }

  const insertAt = match.index + match[0].length;
  const updated = content.slice(0, insertAt) + '\n' + snippet + content.slice(insertAt);
  fs.writeFileSync(file, updated, 'utf8');
  inserted++;
}

console.log('Funding Choices tag injection');
console.log(`  Inserted        : ${inserted}`);
console.log(`  Already present : ${alreadyPresent}`);
console.log(`  Skipped         : ${skipped}`);
console.log(`  Missing <head>  : ${missingHead}`);

if (errors.length > 0) {
  console.log('');
  console.log('Errors:');
  for (const err of errors) {
    console.log(`  ✗ ${err}`);
  }
  process.exit(1);
}
