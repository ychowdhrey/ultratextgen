#!/usr/bin/env node
'use strict';

/**
 * check-updates-verification.js
 *
 * Every updates/ entry carries exactly one verification date, in its
 * guide-meta pill, consistent with its own JSON-LD — and none in body prose.
 *
 * It GATES rather than informs, unlike the whole-site image and hub-coverage
 * audits, for the same reason check-zalgo-decodes does: there is no backlog to
 * be permanently red against. All 11 entries comply as of this commit, so a
 * failure here is always a real regression introduced by the branch.
 *
 * It is whole-pillar rather than diff-scoped for the same reason. A
 * diff-scoped check would miss the shape that caused this: a page edited
 * months ago drifting out of agreement with a convention set later.
 *
 * Usage:  node scripts/check-updates-verification.js
 * Exit:   0 = every entry conforms, 1 = at least one does not.
 */

const fs = require('fs');
const path = require('path');
const { inspect, iso } = require('./lib/updates-verification.js');

const REPO = path.resolve(__dirname, '..');
const DIR = path.join(REPO, 'updates');

function entries() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(DIR, d.name, 'index.html'))
    .filter((f) => fs.existsSync(f))
    .sort();
}

function main() {
  const files = entries();
  if (files.length === 0) {
    console.error('No updates/ entries found — expected at least one.');
    process.exit(1);
  }

  let failed = 0;
  let warned = 0;

  for (const f of files) {
    const r = inspect(f);
    const rel = path.relative(REPO, f);
    if (r.errors.length) {
      failed += 1;
      console.log(`FAIL  ${rel}`);
      r.errors.forEach((e) => console.log(`        ${e}`));
    } else {
      const p = r.pill;
      console.log(`ok    ${rel}  published ${iso(p.published)} · verified ${iso(p.verified)}`);
    }
    r.warnings.forEach((w) => { warned += 1; console.log(`WARN  ${rel}\n        ${w}`); });
  }

  console.log();
  if (failed) {
    console.log(`${failed} of ${files.length} updates entries fail the verification-date rule.`);
    console.log('Fix: one "Published <date> · Verified <date>" guide-meta pill per entry,');
    console.log('     and no "Last checked"/"Checked"/"Verified" stamp in body prose.');
    console.log('An "As of <date>" qualifier on a time-bound claim is NOT a stamp and stays inline.');
    process.exit(1);
  }
  console.log(`All ${files.length} updates entries carry exactly one verification date, in the pill.`
    + (warned ? `  (${warned} warning${warned === 1 ? '' : 's'})` : ' ✓'));
}

main();
