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
const { inspect, inspectLocale, enParentOf, iso, bodyOf, DATE_RE } = require('./lib/updates-verification.js');

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

// ---- locale entries, grouped by the EN parent whose date they inherit ------
const enVerified = new Map(rows.filter((r) => r.pill && r.pill.verified)
  .map((r) => [path.relative(REPO, r.file), iso(r.pill.verified)]));

const locs = fs.readdirSync(REPO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^[a-z]{2}(-[a-z]{2})?$/.test(d.name))
  .flatMap((d) => {
    const dir = path.join(REPO, d.name, 'updates');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())
      .map((e) => path.join(dir, e.name, 'index.html')).filter(fs.existsSync);
  });

if (locs.length) {
  const byLocale = new Map();
  for (const f of locs) {
    const lc = path.relative(REPO, f).split(path.sep)[0];
    const parent = enParentOf(f);
    const r = inspectLocale(f, parent ? enVerified.get(parent) : null);
    const e = byLocale.get(lc) || { n: 0, bad: 0 };
    e.n += 1; if (r.errors.length) e.bad += 1;
    byLocale.set(lc, e);
  }
  const totalBad = [...byLocale.values()].reduce((a, b) => a + b.bad, 0);
  console.log(`\nlocale entries — ${locs.length} pages across ${byLocale.size} locales`);
  console.log('  ' + [...byLocale.entries()].sort()
    .map(([lc, e]) => `${lc}:${e.n}${e.bad ? ` (${e.bad}✗)` : ''}`).join('  '));
  console.log(`  ${totalBad} failing. A locale pill inherits its EN parent's verified date;`);
  console.log("  a mismatch means EN moved and the translation did not.");
}
