#!/usr/bin/env node
'use strict';

/**
 * check-library-hub-parity.js
 *
 * Every `<lang>/library/index.html` is the browse hub for that locale's library
 * collections. CLAUDE.md defines the pillar by that job — "`library/` stays the
 * sole 'browse and find' surface, that's where the on-page filter UI and primary
 * nav entry live" — so a hub without the browse UI is not a stylistic variant of
 * a hub, it is a hub missing the thing that makes it one.
 *
 * WHY THIS EXISTS
 * ---------------
 * Twelve of nineteen locale hubs ship without it, and the history shows nobody
 * chose that. Three commits in the 2026-07-14 "locale rollout, parts N/10" batch
 * each built two hubs at once, with two different templates:
 *
 *   ac27ccdf5  feat(fr,ja)   fr → 1332 lines, browse UI   ja → 407 lines, plain
 *   a77a67b03  feat(es,th)   es → 1451 lines, browse UI   th →  215 lines, plain
 *   f9f913976  feat(tr,vi)   tr → 1380 lines, browse UI   vi →  176 lines, plain
 *
 * Same commit, same hour, one locale rich and its partner a stub — three times.
 * Then on 2026-08-10, a month after the rich template existed, `zh-tw` was built
 * plain again. Nothing was watching, so nothing stopped it.
 *
 * WHAT IT CHECKS
 * --------------
 * Per locale hub:
 *   1. the browse UI is present (`#libDirectory`, search, filter tags)
 *   2. the pre-rendered directory is populated, not left to JavaScript
 *      (see build-locale-library-directory.js for why that matters to crawlers)
 *   3. it links every page that exists in its own `<lang>/library/` directory
 *
 * IT MEASURES THE DELTA, NOT THE STATE
 * ------------------------------------
 * Deliberately, and for the reason CLAUDE.md gives twice already (see
 * `check-locale-translation.js` and `check-faq-schema.js`): a state check here
 * would be red on 12 hubs and 356 unlinked pages on every PR regardless of what
 * that PR touched, and "a gate red on everything is a gate people learn to
 * ignore". So a hub fails this check only when the branch makes it *worse* —
 * a new hub built without the browse UI, a hub that loses it, or a hub whose
 * unlinked-page count grows. Pre-existing debt is reported, never silenced, and
 * never fails the build.
 *
 * That framing is what makes it safe to gate on today, while the 12-hub and
 * 356-page backlogs are worked separately.
 *
 * Usage:
 *   node scripts/check-library-hub-parity.js              # diff-scoped gate
 *   node scripts/check-library-hub-parity.js --all        # whole-site report, never fails
 *   node scripts/check-library-hub-parity.js --base <ref>
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ALL  = args.includes('--all');
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

const LOCALE_RE = /^[a-z]{2}(-[a-z]{2})?$/;

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', base], { stdio: 'ignore' });
    return base;
  } catch {
    // Shallow CI checkouts often don't have the base branch locally at all.
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
  return base;
}

/** File content at a revision, or null when the path did not exist there. */
function blobAt(rev, rel) {
  try {
    return git(['show', `${rev}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** Page slugs that exist on disk under `<locale>/library/`. */
function pagesOnDisk(locale) {
  const dir = path.join(ROOT, locale, 'library');
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.html')))
      .map((d) => d.name)
  );
}

/**
 * Describe one hub's state from its HTML.
 *
 * `linked` counts only hrefs under this locale's own library prefix, so a hub
 * linking the English page (which the locale-native linking rule forbids
 * anyway) is never miscounted as coverage.
 */
function inspect(html, locale) {
  const prefix = `/${locale}/library/`;
  const linked = new Set(
    [...html.matchAll(new RegExp(prefix.replace(/\//g, '\\/') + '([^"/#?]+)/"', 'g'))]
      .map((m) => m[1])
  );

  const directoryMatch = /id="libDirectory"[^>]*>([\s\S]*?)<\/main>/.exec(html);

  return {
    hasDirectory: /id="libDirectory"/.test(html),
    hasSearch:    /id="libSearch"/.test(html),
    hasFilters:   /data-filter="/.test(html),
    prerendered:  directoryMatch ? (directoryMatch[1].match(/href=/g) || []).length : 0,
    linked,
  };
}

/** Every locale hub path in the working tree. */
function localeHubs() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && LOCALE_RE.test(d.name))
    .map((d) => `${d.name}/library/index.html`)
    .filter((rel) => fs.existsSync(path.join(ROOT, rel)));
}

// ─── Whole-site report ────────────────────────────────────────────────────────

if (ALL) {
  console.log('Library Hub Parity — whole-site report (informational)\n');
  console.log(`${'hub'.padEnd(26)}${'browse UI'.padStart(11)}${'prerendered'.padStart(13)}${'linked'.padStart(8)}${'pages'.padStart(7)}${'missing'.padStart(9)}`);

  let noUi = 0, missingTotal = 0;
  for (const rel of localeHubs()) {
    const locale = rel.split('/')[0];
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const s = inspect(html, locale);
    const pages = pagesOnDisk(locale);
    const covered = [...pages].filter((p) => s.linked.has(p)).length;
    const missing = pages.size - covered;
    const ui = s.hasDirectory && s.hasSearch && s.hasFilters;
    if (!ui) noUi++;
    missingTotal += missing;
    console.log(
      `${rel.padEnd(26)}${(ui ? 'yes' : 'NO').padStart(11)}${String(s.prerendered).padStart(13)}` +
      `${String(covered).padStart(8)}${String(pages.size).padStart(7)}${String(missing).padStart(9)}`
    );
  }
  console.log(`\n${noUi} hub(s) without the browse UI · ${missingTotal} page(s) not linked from their own hub.`);
  console.log('Informational only — this mode never fails.');
  process.exit(0);
}

// ─── Diff-scoped gate ─────────────────────────────────────────────────────────

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(2);
}

const changedHubs = git(
  ['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*/library/index.html']
)
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .filter((rel) => LOCALE_RE.test(rel.split('/')[0]));

console.log('Library Hub Parity Check');
console.log(`  base:              ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed hub files: ${changedHubs.length}`);

if (changedHubs.length === 0) {
  console.log('\nNo locale library hubs changed — nothing to check. ✓');
  process.exit(0);
}

const introduced = [];
const preexisting = [];

for (const rel of changedHubs) {
  const locale = rel.split('/')[0];
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue; // deleted in this branch

  const now = inspect(fs.readFileSync(abs, 'utf8'), locale);
  const pages = pagesOnDisk(locale);
  const missingNow = [...pages].filter((p) => !now.linked.has(p));

  const beforeHtml = blobAt(mergeBase, rel);
  const before = beforeHtml ? inspect(beforeHtml, locale) : null;
  const missingBefore = before
    ? [...pages].filter((p) => !before.linked.has(p)).length
    : null;

  const uiNow    = now.hasDirectory && now.hasSearch && now.hasFilters;
  const uiBefore = before ? (before.hasDirectory && before.hasSearch && before.hasFilters) : null;

  // 1. Browse UI. A brand-new hub must have it; an existing hub must not lose it.
  if (!uiNow) {
    if (before === null) {
      introduced.push(`${rel} — new locale library hub built without the browse UI ` +
        `(needs #libDirectory + #libSearch + filter tags, as es/fr/id/it/ko/pt/tr have)`);
    } else if (uiBefore) {
      introduced.push(`${rel} — this branch removed the browse UI from an existing hub`);
    } else {
      preexisting.push(`${rel} — no browse UI (pre-existing; 2026-07-14 rollout drift)`);
    }
  }

  // 2. Pre-rendered directory. Only meaningful once the hub has the UI at all.
  if (uiNow && now.prerendered === 0) {
    if (before === null || (uiBefore && before.prerendered > 0)) {
      introduced.push(`${rel} — #libDirectory is empty, so a non-JS crawler sees a hub ` +
        `linking nothing. Run: node scripts/build-locale-library-directory.js`);
    } else {
      preexisting.push(`${rel} — #libDirectory not pre-rendered (pre-existing)`);
    }
  }

  // 3. Coverage. Fails only when this branch makes the gap bigger.
  if (missingBefore !== null && missingNow.length > missingBefore) {
    const sample = missingNow.slice(0, 5).join(', ');
    introduced.push(`${rel} — pages not linked from their own hub grew ` +
      `${missingBefore} → ${missingNow.length} (e.g. ${sample})`);
  } else if (before === null && missingNow.length > 0) {
    const sample = missingNow.slice(0, 5).join(', ');
    introduced.push(`${rel} — new hub does not link ${missingNow.length} of its own ` +
      `${pages.size} pages (e.g. ${sample})`);
  } else if (missingNow.length > 0) {
    preexisting.push(`${rel} — ${missingNow.length} of ${pages.size} pages not linked (pre-existing)`);
  }
}

console.log(`  introduced issues: ${introduced.length}`);
console.log(`  pre-existing:      ${preexisting.length}`);

if (preexisting.length) {
  console.log('\nPre-existing debt on hubs this branch touched (reported, not failing):');
  for (const line of preexisting) console.log(`  · ${line}`);
}

if (introduced.length === 0) {
  console.log('\nThis branch introduced no library-hub parity regressions. ✓');
  process.exit(0);
}

console.log('\nIssues introduced by this branch:');
for (const line of introduced) console.log(`  ✗ ${line}`);
console.log('\nA locale library hub must carry the browse UI, pre-render its directory,');
console.log('and link every page in its own library directory.');
process.exit(1);
