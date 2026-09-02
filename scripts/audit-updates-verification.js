#!/usr/bin/env node
'use strict';

/**
 * audit-updates-verification.js — whole-pillar dashboard for updates/ dates.
 *
 * Informational sibling of check-updates-verification.js, sharing its
 * classifier so the two can never disagree about what a stamp is. Use it to
 * see the pillar's verification state at a glance — which entries are oldest,
 * and therefore which the next verification pass should take first.
 *
 * Usage:  node scripts/audit-updates-verification.js [--full]
 */

const fs = require('fs');
const path = require('path');
const { inspect, iso, bodyOf, DATE_RE } = require('./lib/updates-verification.js');

const REPO = path.resolve(__dirname, '..');
const DIR = path.join(REPO, 'updates');
const FULL = process.argv.includes('--full');

const rows = fs.readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(DIR, d.name, 'index.html'))
  .filter(fs.existsSync)
  .map((f) => {
    const r = inspect(f);
    const dates = (bodyOf(fs.readFileSync(f, 'utf8')).match(new RegExp(DATE_RE, 'g')) || []).length;
    return { ...r, slug: path.basename(path.dirname(f)), dates };
  })
  .sort((a, b) => {
    const av = a.pill && a.pill.verified ? a.pill.verified.getTime() : 0;
    const bv = b.pill && b.pill.verified ? b.pill.verified.getTime() : 0;
    return av - bv;
  });

const today = Date.now();
console.log('updates/ verification state — oldest check first\n');
console.log('  verified     age  dates  entry');
for (const r of rows) {
  const v = r.pill && r.pill.verified;
  const age = v ? Math.round((today - v.getTime()) / 864e5) : null;
  const flag = r.errors.length ? ' ✗' : (r.warnings.length ? ' !' : '  ');
  console.log(`${flag} ${(v ? iso(v) : 'none').padEnd(12)}${String(age === null ? '-' : age + 'd').padStart(5)}`
    + `${String(r.dates).padStart(7)}  ${r.slug}`);
  if (FULL || r.errors.length || r.warnings.length) {
    r.errors.forEach((e) => console.log(`        ✗ ${e}`));
    r.warnings.forEach((w) => console.log(`        ! ${w}`));
  }
}
const bad = rows.filter((r) => r.errors.length).length;
console.log(`\n${rows.length} entries · ${bad} failing · ${rows.filter((r) => r.warnings.length).length} with warnings`);
console.log('"dates" counts every date literal in the body — most are ordinary factual dates, not stamps.');
