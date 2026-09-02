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
 * It covers <lang>/updates/ too, and that half is the one with teeth: a
 * locale pill's date must equal its EN parent's, so an EN-only correction
 * that leaves its translations behind fails here. That is exactly what
 * happened on 2026-09-01 and what nothing else in this repo could see.
 *
 * Usage:  node scripts/check-updates-verification.js
 * Exit:   0 = every entry conforms, 1 = at least one does not.
 */

const fs = require('fs');
const path = require('path');
const { inspect, inspectLocale, enParentOf, iso } = require('./lib/updates-verification.js');

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

const LOCALE_RE = /^[a-z]{2}(-[a-z]{2})?$/;

function localeEntries() {
  return fs.readdirSync(REPO, { withFileTypes: true })
    .filter((d) => d.isDirectory() && LOCALE_RE.test(d.name))
    .flatMap((d) => {
      const dir = path.join(REPO, d.name, 'updates');
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => path.join(dir, e.name, 'index.html'))
        .filter((f) => fs.existsSync(f));
    })
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

  // ---- locale entries, checked against the EN parent each one declares ----
  const enVerified = new Map();
  for (const f of files) {
    const r = inspect(f);
    if (r.pill && r.pill.verified) enVerified.set(path.relative(REPO, f), iso(r.pill.verified));
  }

  const locales = localeEntries();
  for (const f of locales) {
    const rel = path.relative(REPO, f);
    const parent = enParentOf(f);
    const parentDate = parent ? enVerified.get(parent) : null;
    if (!parentDate) {
      failed += 1;
      console.log(`FAIL  ${rel}`);
      console.log(`        cannot resolve an EN parent with a Verified date`
        + (parent ? ` (declares hreflang="en" -> ${parent})` : ' (no hreflang="en")'));
      continue;
    }
    const r = inspectLocale(f, parentDate);
    if (r.errors.length) {
      failed += 1;
      console.log(`FAIL  ${rel}`);
      r.errors.forEach((e) => console.log(`        ${e}`));
    } else {
      console.log(`ok    ${rel}  verified ${parentDate} (from ${parent})`);
    }
  }

  console.log();
  if (failed) {
    console.log(`${failed} of ${files.length + locales.length} updates entries fail the verification-date rule.`);
    console.log('Fix: one "Published <date> · Verified <date>" guide-meta pill per entry,');
    console.log('     and no "Last checked"/"Checked"/"Verified" stamp in body prose.');
    console.log('An "As of <date>" qualifier on a time-bound claim is NOT a stamp and stays inline.');
    console.log('A locale entry carries one localized pill whose date must equal its EN parent\'s.');
    process.exit(1);
  }
  console.log(`All ${files.length} English and ${locales.length} locale updates entries carry exactly one verification date, in the pill.`
    + (warned ? `  (${warned} warning${warned === 1 ? '' : 's'})` : ' ✓'));
}

main();
