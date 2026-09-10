#!/usr/bin/env node
'use strict';

/**
 * check-numeric-parity.js
 *
 * Fails a PR that corrects a number on one page of an hreflang cluster and
 * leaves a sibling asserting the old value.
 *
 * See scripts/lib/numeric-parity.js for why this axis needed its own check:
 * every other gate here measures structure, language, schema or assets, and
 * a wrong number passes all of them.
 *
 * DIFF-SCOPED, like check-translation-parity and check-locale-translation,
 * and for the same reason: the site carries real, deliberately-paced
 * translation lag, and a whole-site state check would be permanently red.
 * A number counts against a branch only when the branch itself REPLACED it.
 *
 * Usage:  node scripts/check-numeric-parity.js [--base origin/main]
 * Exit:   0 = no unpropagated value change, 1 = at least one.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { substitutions, staleIn } = require('./lib/numeric-parity.js');

const REPO = path.resolve(__dirname, '..');
const LEDGER = path.join(REPO, 'data', 'numeric_parity_exceptions.json');
const CATALOGUE = path.join(REPO, 'data', 'parity_catalogue_pages.json');

/**
 * Catalogue indexes are excluded, reusing the registry check-translation-parity
 * already keeps for them. A pillar index lists the pages that exist IN ITS OWN
 * LOCALE — EN library/index.html carries ~306 links, its siblings 7-50 — so its
 * counts legitimately differ and a changed count is not drift. Without this,
 * two of the four hits in a 52-commit replay were library/index.html.
 */
function cataloguePatterns() {
  if (!fs.existsSync(CATALOGUE)) return [];
  try { return JSON.parse(fs.readFileSync(CATALOGUE, 'utf8')).cataloguePatterns || []; }
  catch { return []; }
}
const CATALOGUE_PATTERNS = cataloguePatterns();

/** True for a pillar index, in EN or any locale (de/library/index.html). */
function isCatalogue(rel) {
  const tail = rel.replace(/^[a-z]{2}(-[a-z]{2})?\//, '');
  return CATALOGUE_PATTERNS.includes(tail);
}

const argv = process.argv.slice(2);
const baseArg = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;

const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

function mergeBase() {
  for (const ref of [baseArg, 'origin/main', 'origin/master', 'main', 'master'].filter(Boolean)) {
    try { return git('merge-base', 'HEAD', ref).trim(); } catch { /* try next */ }
  }
  return null;
}

function showAt(rev, rel) {
  try { return git('show', `${rev}:${rel}`); } catch { return null; }
}

/** https://ultratextgen.com/de/updates/x/ -> de/updates/x/index.html */
function urlToFile(url) {
  const m = String(url).match(/^https:\/\/ultratextgen\.com\/(.*)$/);
  if (!m) return null;
  const p = m[1].replace(/^\/+|\/+$/g, '');
  return p ? `${p}/index.html` : 'index.html';
}

function siblingsOf(html, self) {
  const out = new Set();
  for (const m of String(html).matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)) {
    if (m[1].toLowerCase() === 'x-default') continue;
    const f = urlToFile(m[2]);
    if (f && f !== self && fs.existsSync(path.join(REPO, f))) out.add(f);
  }
  return [...out].sort();
}

function ledger() {
  if (!fs.existsSync(LEDGER)) return [];
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')).exceptions || []; }
  catch { return []; }
}

function main() {
  const base = mergeBase();
  if (!base) { console.log('No merge base resolvable — skipping numeric parity check.'); return; }

  const changed = git('diff', '--name-only', `${base}..HEAD`).split('\n')
    .filter((f) => f.endsWith('.html') && fs.existsSync(path.join(REPO, f)));
  const changedSet = new Set(changed);
  const allowed = ledger();

  let failures = 0;
  let swaps = 0;

  for (const rel of changed) {
    if (isCatalogue(rel)) continue;
    const before = showAt(base, rel);
    if (before === null) continue;                    // new page: nothing to have drifted from
    const after = fs.readFileSync(path.join(REPO, rel), 'utf8');
    const subs = substitutions(before, after);
    if (!subs.size) continue;
    swaps += 1;

    const sibs = siblingsOf(after, rel).filter((s) => !changedSet.has(s) && !isCatalogue(s));
    if (!sibs.length) continue;

    for (const [slot, { dropped, added }] of subs) {
      for (const sib of sibs) {
        const stale = staleIn(fs.readFileSync(path.join(REPO, sib), 'utf8'), slot, dropped);
        const live = stale.filter((n) => !allowed.some(
          (e) => e.page === sib && String(e.value) === n && e.slot === slot));
        if (!live.length) continue;
        failures += 1;
        console.log(`FAIL  ${sib}`);
        console.log(`        still carries ${live.map((n) => `"${n}"`).join(', ')} in its <${slot}>,`);
        console.log(`        which ${rel} replaced with ${[...added].map((n) => `"${n}"`).join(', ')} in this branch.`);
      }
    }
  }

  console.log();
  if (failures) {
    console.log(`${failures} sibling page(s) still assert a value this branch corrected.`);
    console.log('Fix: update the sibling in the same PR, so a corrected fact reaches every');
    console.log('language at once. If the divergence is deliberate and discussed, record it');
    console.log(`in ${path.relative(REPO, LEDGER)} — never to make a PR pass.`);
    process.exit(1);
  }
  console.log(swaps
    ? `${swaps} page(s) changed a value; every hreflang sibling is consistent. ✓`
    : 'No numeric value changes in this branch. ✓');
}

main();
