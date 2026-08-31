#!/usr/bin/env node
'use strict';

/**
 * audit-library-hub-coverage.js
 *
 * Whole-site dashboard: for every locale and both lanes, how many pages exist,
 * how many the locale's own hub actually registers, and what is left over.
 *
 * INFORMATIONAL, NEVER GATING — the same call as npm run check:images and
 * npm run audit:locale-parent-gap, and for the same reason: the site carries a
 * real backlog (374 pages as of 2026-08-26), so a whole-site check would be
 * permanently red regardless of what any given PR touches, and this repo has
 * twice recorded that a permanently-red check is one people learn to ignore.
 * The enforcing half is scripts/check-library-hub-coverage.js, which is
 * diff-scoped and does gate.
 *
 * Usage:
 *   npm run audit:library-hub-coverage
 *   node scripts/audit-library-hub-coverage.js --full          # every route
 *   node scripts/audit-library-hub-coverage.js --locale es      # scope
 *   node scripts/audit-library-hub-coverage.js --json out.json
 *
 * Always exits 0.
 */

const fs = require('fs');
const {
  analyseAll,
  offLaneCoverage,
  loadExclusions,
} = require('./lib/library-hub-registry');

const args = process.argv.slice(2);
const full = args.includes('--full');
const localeIdx = args.indexOf('--locale');
const onlyLocale = localeIdx !== -1 ? args[localeIdx + 1] : null;
const jsonIdx = args.indexOf('--json');
const jsonPath = jsonIdx !== -1 ? args[jsonIdx + 1] : null;

let results = analyseAll();
if (onlyLocale) results = results.filter((r) => r.locale === onlyLocale);

const exclusions = loadExclusions();
const offLane = offLaneCoverage().filter((p) => !onlyLocale || p.locale === onlyLocale);

// ─── per-locale rollup ─────────────────────────────────────────────────────

const byLocale = new Map();
for (const r of results) {
  if (!byLocale.has(r.locale)) {
    byLocale.set(r.locale, {
      locale: r.locale, pages: 0, registered: 0, crawlable: 0,
      missing: 0, orphans: 0, jsOnly: 0, unsearchable: 0, duplicates: 0,
      excluded: 0, templates: [],
    });
  }
  const a = byLocale.get(r.locale);
  a.pages += r.pages.length;
  a.registered += r.registered.length;
  a.crawlable += r.crawlable.length;
  a.missing += r.missing.length;
  a.orphans += r.orphans.length;
  a.jsOnly += r.jsOnly.length;
  a.unsearchable += r.unsearchable.length;
  a.duplicates += r.duplicates.length;
  a.excluded += r.excluded.length;
  a.templates.push(`${r.lane}:${r.template}`);
}

const rows = [...byLocale.values()].sort((a, b) => b.missing - a.missing || a.locale.localeCompare(b.locale));

console.log('Library Hub Coverage Audit');
console.log('==========================\n');
console.log('"Registered" = listed in any of the hub\'s five inventory mechanisms');
console.log('(LIBRARY array, lib-entry, A-Z index, compare-card, tip-card).');
console.log('"Crawlable"  = listed in one that is visible without executing JavaScript.\n');

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

console.log(
  `${pad('locale', 8)}${num('pages', 6)}${num('reg', 6)}${num('crawl', 7)}` +
  `${num('missing', 9)}${num('orphan', 8)}${num('unsrch', 8)}${num('dupes', 7)}${num('excl', 6)}${num('cov%', 7)}`
);
console.log('-'.repeat(72));

let tot = { pages: 0, registered: 0, missing: 0, orphans: 0, unsearchable: 0, duplicates: 0, excluded: 0 };
for (const r of rows) {
  const cov = r.pages ? Math.round((100 * r.registered) / r.pages) : 0;
  console.log(
    `${pad(r.locale, 8)}${num(r.pages, 6)}${num(r.registered, 6)}${num(r.crawlable, 7)}` +
    `${num(r.missing, 9)}${num(r.orphans, 8)}${num(r.unsearchable, 8)}${num(r.duplicates, 7)}` +
    `${num(r.excluded, 6)}${num(cov + '%', 7)}`
  );
  if (r.locale === 'EN') continue;
  for (const k of Object.keys(tot)) tot[k] += r[k];
}
console.log('-'.repeat(72));
console.log(
  `${pad('locales', 8)}${num(tot.pages, 6)}${num(tot.registered, 6)}${num('', 7)}` +
  `${num(tot.missing, 9)}${num(tot.orphans, 8)}${num(tot.unsearchable, 8)}${num(tot.duplicates, 7)}` +
  `${num(tot.excluded, 6)}${num((tot.pages ? Math.round((100 * tot.registered) / tot.pages) : 0) + '%', 7)}`
);

// ─── hubs that do not exist ────────────────────────────────────────────────

const noHub = results.filter((r) => r.template === 'none' && r.pages.length);
if (noHub.length) {
  console.log('\nLanes with pages and NO hub file at all:');
  for (const r of noHub) {
    console.log(`  ${r.prefix}  ${r.pages.length} page(s), no ${r.prefix}index.html`);
  }
}

// ─── orphans ───────────────────────────────────────────────────────────────

const orphans = results.flatMap((r) => r.orphans.map((o) => ({ ...o, locale: r.locale, lane: r.lane, hubFile: r.hubFile })));
if (orphans.length) {
  console.log('\nHub entries whose page is not on disk:');
  for (const o of orphans) {
    const where = o.redirect ? `301 -> ${o.redirect}` : 'NO REDIRECT RULE - hard 404';
    console.log(`  [${o.redirect ? 'WARN ' : 'ERROR'}] ${o.route}  (${o.listedIn.join(', ')})  ${where}`);
    console.log(`          in ${o.hubFile}`);
  }
}

// ─── JS-only ───────────────────────────────────────────────────────────────

const jsOnly = results.filter((r) => r.jsOnly.length);
if (jsOnly.length) {
  console.log('\nPages a non-JS crawler cannot see on the hub (JS array only):');
  for (const r of jsOnly) {
    console.log(`  ${r.locale}/${r.lane}: ${r.jsOnly.length} — run \`npm run build:library-directory -- --locale ${r.locale || 'en'}\``);
    if (full) for (const p of r.jsOnly) console.log(`      ${p.route}`);
  }
}

// ─── unsearchable ──────────────────────────────────────────────────────────

const unsearchable = results.filter((r) => r.unsearchable.length);
if (unsearchable.length) {
  console.log('\nPages in the crawlable index but absent from the hub\'s own search directory:');
  for (const r of unsearchable) {
    console.log(`  ${r.locale}/${r.lane}: ${r.unsearchable.length}`);
    if (full) for (const p of r.unsearchable) console.log(`      ${p.route}`);
  }
}

// ─── duplicates ────────────────────────────────────────────────────────────

const dupes = results.flatMap((r) => r.duplicates.map((d) => ({ ...d, locale: r.locale })));
if (dupes.length) {
  console.log('\nDuplicate hub entries:');
  for (const d of dupes) console.log(`  ${d.route}  listed ${d.count}x in ${d.mechanism}`);
}

// ─── off-lane ──────────────────────────────────────────────────────────────

const unlinkedOffLane = offLane.filter((p) => !p.hubLinks);
if (offLane.length) {
  console.log(`\nLibrary-parented pages living outside their locale's library lane: ${offLane.length}`);
  console.log(`  linked from that locale's library hub: ${offLane.length - unlinkedOffLane.length}`);
  console.log(`  NOT linked:                            ${unlinkedOffLane.length}`);
  console.log('  (Reported, never failed — several are the locale\'s strongest assets sitting at');
  console.log('   the locale root deliberately. Moving one is a 301 decision needing GSC evidence;');
  console.log('   linking it from the hub is code-only.)');
  if (full) {
    for (const p of offLane) {
      console.log(`      ${p.hubLinks ? '[linked]  ' : '[unlinked]'} ${p.route}  <- ${p.enParent}`);
    }
  }
}

// ─── missing detail ────────────────────────────────────────────────────────

console.log('\nPages missing from their hub, by locale:');
for (const r of results.filter((x) => x.missing.length).sort((a, b) => b.missing.length - a.missing.length)) {
  console.log(`  ${r.locale}/${r.lane} (${r.template}): ${r.missing.length}`);
  if (full) for (const m of r.missing) console.log(`      ${m.route}  [${m.reason}${m.linkedInProse ? ', prose-link-only' : ''}]`);
}
if (!full) console.log('\n  (pass --full for every route)');

if (exclusions.size) {
  console.log(`\nAgreed exclusions honoured: ${exclusions.size} (data/library_hub_exclusions.json)`);
}

console.log(`\nTotals — ${tot.missing} locale pages missing from a hub, ${orphans.length} orphan hub entries, ` +
  `${tot.unsearchable} unsearchable, ${unlinkedOffLane.length} unlinked off-lane.`);
console.log('Informational only; the gating check is `npm run check:library-hub-coverage`.');

if (jsonPath) {
  fs.writeFileSync(jsonPath, JSON.stringify({ results, offLane, rollup: rows }, null, 2));
  console.log(`\nWrote ${jsonPath}`);
}

process.exit(0);
