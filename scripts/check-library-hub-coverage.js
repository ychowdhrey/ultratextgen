#!/usr/bin/env node
'use strict';

/**
 * check-library-hub-coverage.js
 *
 * Per-PR gate. For every `<lang>/library/<slug>/` or `<lang>/symbol/<slug>/`
 * page this branch ADDS or RENAMES, require that the locale's own hub registers
 * it in at least one of its five inventory mechanisms. And for every hub file
 * this branch touches, require that every entry it lists has a page on disk.
 *
 * DIFF-SCOPED, DELIBERATELY — the same architecture as
 * check-translation-parity.js and check-faq-schema.js, for the same measured
 * reason. The site carries 374 pages already missing from a hub (audited
 * 2026-08-26); a state check would be red on every PR regardless of what that
 * PR did, and this repo has twice recorded that a check which is always red is
 * one people learn to ignore. Pre-existing backlog is REPORTED, never silenced,
 * and never counted against a branch.
 *
 * Two things are checked at different strengths, on purpose:
 *
 *   ERROR — a page this PR adds that no mechanism lists; a hub entry this PR's
 *           hub edit leaves pointing at nothing, with no `_redirects` rule.
 *   WARN  — a hub entry resolving through a 301 (the visitor lands correctly
 *           after one hop, so it is link equity, not breakage); a page added to
 *           a directory hub's JS array but not its crawlable index.
 *
 * Usage:
 *   npm run check:library-hub-coverage
 *   node scripts/check-library-hub-coverage.js --base main
 *
 * Exit 0 = clean, 1 = a page this branch added is not registered, 2 = the
 * branch/base could not be resolved.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const {
  ROOT,
  analyseLane,
  loadExclusions,
  parseHubPath,
  parseLanePath,
  readHub,
  redirectMap,
  registeredSlugs,
} = require('./lib/library-hub-registry');

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', base], { stdio: 'ignore' });
    return base;
  } catch {
    const branch = base.replace(/^origin\//, '');
    try {
      git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
      const candidate = `origin/${branch}`;
      git(['rev-parse', '--verify', candidate], { stdio: 'ignore' });
      return candidate;
    } catch (e) {
      console.error(`Could not resolve or fetch base ref "${base}": ${e.message}`);
      process.exit(2);
    }
  }
}

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(2);
}

console.log('Library Hub Coverage Check');
console.log('==========================\n');

// `A` and `R` only: a page this branch ADDED or RENAMED is a page this branch is
// responsible for announcing. A page merely edited (`M`) was already missing
// before the branch existed, and belongs to the backlog, not to this PR.
const addedFiles = git(['diff', '--name-only', '--diff-filter=AR', mergeBase, 'HEAD', '--', '*.html'])
  .split('\n').map((l) => l.trim()).filter(Boolean);

const touchedFiles = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html'])
  .split('\n').map((l) => l.trim()).filter(Boolean);

const addedPages = addedFiles
  .map((file) => {
    const parsed = parseLanePath(file);
    return parsed && { ...parsed, file };
  })
  .filter(Boolean);

const touchedHubs = touchedFiles.map(parseHubPath).filter(Boolean);

if (addedPages.length === 0 && touchedHubs.length === 0) {
  console.log('No library/symbol pages added and no hub touched — nothing to check.');
  process.exit(0);
}

const exclusions = loadExclusions();
const redirects = redirectMap();
const errors = [];
const warnings = [];
const notes = [];

// ─── (1) every page this branch adds must be registered ────────────────────

const laneCache = new Map();
function lane(locale, laneName) {
  const key = `${locale}|${laneName}`;
  if (!laneCache.has(key)) laneCache.set(key, analyseLane(locale, laneName, { exclusions }));
  return laneCache.get(key);
}

for (const page of addedPages) {
  const route = `${page.locale ? `/${page.locale}` : ''}/${page.lane}/${page.slug}/`;
  const hub = readHub(page.locale, page.lane);

  if (!hub) {
    errors.push({
      route,
      why: `no hub file exists at ${page.locale ? `/${page.locale}` : ''}/${page.lane}/index.html`,
      fix: 'build the locale hub before shipping pages into the lane, or record an agreed exclusion',
    });
    continue;
  }

  if (exclusions.has(route)) {
    notes.push(`${route} — absent from the hub by agreed exclusion (${exclusions.get(route).reason || 'no reason recorded'})`);
    continue;
  }

  const registered = registeredSlugs(hub);
  if (!registered.has(page.slug)) {
    const linkedInProse = hub.anyLink.has(page.slug);
    errors.push({
      route,
      why: linkedInProse
        ? `${hub.file} links it from body copy but does not list it in any inventory mechanism`
        : `${hub.file} does not reference it at all`,
      fix: `add it to the hub's inventory (this hub uses the "${hub.template}" template)`,
    });
    continue;
  }

  // Registered — but is it registered somewhere a non-JS crawler can see?
  if (hub.template === 'directory') {
    const inArray = hub.mechanisms.libraryArray.includes(page.slug);
    const inCrawlable = ['libEntry', 'azIndex', 'compareCard', 'tipCard']
      .some((k) => hub.mechanisms[k].includes(page.slug));
    if (inArray && !inCrawlable) {
      warnings.push({
        route,
        why: 'listed only in the JS LIBRARY array, so a crawler that does not run JavaScript sees no link to it',
        fix: `npm run build:library-directory -- --locale ${page.locale || 'en'}`,
      });
    } else if (inCrawlable && !inArray) {
      warnings.push({
        route,
        why: 'listed in the crawlable index but absent from the hub\'s own search directory',
        fix: `add a LIBRARY array entry in ${hub.file}`,
      });
    }
  }
}

// ─── (2) every entry in a hub this branch touched must resolve ─────────────

for (const hubRef of touchedHubs) {
  const result = lane(hubRef.locale, hubRef.lane);
  for (const orphan of result.orphans) {
    if (orphan.redirect) {
      warnings.push({
        route: orphan.route,
        why: `listed in ${result.hubFile} (${orphan.listedIn.join(', ')}) but the page is gone; _redirects sends it to ${orphan.redirect}`,
        fix: 'repoint the hub entry at the real destination so the internal link does not hop through a 301',
      });
    } else {
      errors.push({
        route: orphan.route,
        why: `listed in ${result.hubFile} (${orphan.listedIn.join(', ')}) but no page exists and no _redirects rule covers it — a hard 404 from the hub`,
        fix: 'remove the entry, or point it at the page that replaced it',
      });
    }
  }
  for (const dupe of result.duplicates) {
    warnings.push({
      route: dupe.route,
      why: `listed ${dupe.count}x in the same ${dupe.mechanism} grid of ${result.hubFile}`,
      fix: 'remove the duplicate card',
    });
  }
}

// ─── report ────────────────────────────────────────────────────────────────

console.log(`Base: ${base} (merge-base ${mergeBase.slice(0, 12)})`);
console.log(`Pages added in this branch: ${addedPages.length}`);
console.log(`Hub files touched:          ${touchedHubs.length}\n`);

if (notes.length) {
  console.log('Agreed exclusions honoured:');
  for (const n of notes) console.log(`  ${n}`);
  console.log('');
}

if (warnings.length) {
  console.log(`Warnings (${warnings.length}) — not failing the build:`);
  for (const w of warnings) {
    console.log(`  [WARN] ${w.route}`);
    console.log(`         ${w.why}`);
    console.log(`         fix: ${w.fix}`);
  }
  console.log('');
}

// Pre-existing backlog is reported, never counted. Same posture as
// check-locale-translation.js's pre-existing survivors.
const backlogLanes = [...laneCache.values()].filter((r) => r.missing.length);
if (backlogLanes.length) {
  const total = backlogLanes.reduce((n, r) => n + r.missing.length, 0);
  console.log(`Pre-existing backlog in the lanes this PR touched: ${total} page(s) already missing from their hub`);
  for (const r of backlogLanes) console.log(`  ${r.locale}/${r.lane}: ${r.missing.length}`);
  console.log('  (reported for visibility; not counted against this branch —');
  console.log('   `npm run audit:library-hub-coverage` is the whole-site picture)\n');
}

if (errors.length === 0) {
  console.log(`PASS — every library/symbol page this branch adds is registered in its hub.`);
  process.exit(0);
}

console.log(`FAIL — ${errors.length} problem(s) this branch introduces:\n`);
for (const e of errors) {
  console.log(`  [ERROR] ${e.route}`);
  console.log(`          ${e.why}`);
  console.log(`          fix: ${e.fix}`);
}
console.log('\nA page that ships without a hub entry is reachable only from the sitemap.');
console.log('If a page genuinely should not appear in its hub, that is a discussed decision');
console.log('recorded in data/library_hub_exclusions.json — never added to make a PR pass.');
process.exit(1);
