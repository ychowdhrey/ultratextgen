#!/usr/bin/env node
'use strict';

/**
 * check-locale-parent-gap.js
 *
 * Per-PR gate: for every NEW locale HTML file added in this branch (path
 * starts with a locale code and didn't exist at the merge-base), resolve its
 * EN parent via its hreflang cluster, classify the (parent, locale) pair
 * with scripts/lib/locale-parent-registry.js's decide(), and require a
 * passing data/locale_parent_gap_audit.json entry whenever the decision
 * needed one — i.e. this page was built against the registry's default
 * recommendation (a gated-tail parent, a Tier-3/held locale, or a
 * script-incompatible parent+locale pair) rather than the innocent-by-
 * default Core-parent mirror path.
 *
 * This is the enforcement half of scripts/audit-locale-parent-gap.js, the
 * same way scripts/check-translation-parity.js enforces what
 * scripts/audit-translation-parity.js discovers: the audit finds the
 * existing sitewide backlog; this stops a NEW ungated build from shipping
 * without a recorded pre-build check.
 *
 * Usage:
 *   node scripts/check-locale-parent-gap.js                 # diff against origin/main
 *   node scripts/check-locale-parent-gap.js --base main      # diff against a different ref
 *
 * Exit code 0 = clean (or nothing new to check), 1 = an unaudited build found.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters, normalizeUrl } = require('./lib/translation-clusters');
const { decide, LOCALES } = require('./lib/locale-parent-registry');

const ROOT = path.resolve(__dirname, '..');
const GAP_LEDGER_PATH = path.join(ROOT, 'data', 'locale_parent_gap_audit.json');
const EN_PARENT_EXCEPTIONS_PATH = path.join(ROOT, 'data', 'english_parent_exceptions.json');
const SITE_ORIGIN = 'https://ultratextgen.com';

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
}

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(2);
}

// Only newly-ADDED files — this gate is specifically about a brand-new
// locale page shipping without its required pre-build check, not about
// edits to an already-shipped one (that's check-translation-parity.js's job).
const addedFiles = git(['diff', '--name-only', '--diff-filter=A', mergeBase, 'HEAD', '--', '*.html'])
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

if (addedFiles.length === 0) {
  console.log('Locale Parent Gap Check: no newly-added HTML files — nothing to check.');
  process.exit(0);
}

const LOCALE_PREFIX_RE = new RegExp(`^(${LOCALES.join('|')})/`);

// ─── Current site state (HEAD / working tree) ──────────────────────────────

const { byUrl } = discoverClusters(ROOT);

// ─── Ledger ─────────────────────────────────────────────────────────────

let ledgerEntries = [];
if (fs.existsSync(GAP_LEDGER_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(GAP_LEDGER_PATH, 'utf8'));
    ledgerEntries = Array.isArray(parsed) ? parsed : parsed.entries || [];
  } catch (e) {
    console.error(`WARNING: could not parse ${path.relative(ROOT, GAP_LEDGER_PATH)}: ${e.message}`);
  }
}
function passingLedgerEntry(pattern, locale) {
  return ledgerEntries.find(
    (e) => e.pattern === pattern && e.locale === locale && (e.verdict === 'mirror' || e.verdict === 'gate-pass')
  );
}

// Ratified English-Parent-Rule exceptions — locale pages explicitly agreed to
// exist with no EN parent (see data/english_parent_exceptions.json's _readme
// and CLAUDE.md's "Localization Workflow" ratifications). Keyed by normalized
// canonical URL.
let enParentExceptionUrls = new Set();
if (fs.existsSync(EN_PARENT_EXCEPTIONS_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(EN_PARENT_EXCEPTIONS_PATH, 'utf8'));
    enParentExceptionUrls = new Set(
      (parsed.exceptions || []).map((e) => normalizeUrl(e.localeUrl)).filter(Boolean)
    );
  } catch (e) {
    console.error(`WARNING: could not parse ${path.relative(ROOT, EN_PARENT_EXCEPTIONS_PATH)}: ${e.message}`);
  }
}

// ─── Check every newly-added locale page ───────────────────────────────────

const flagged = [];
let checked = 0;

for (const rel of addedFiles) {
  if (!LOCALE_PREFIX_RE.test(rel)) continue; // not a locale page — not this gate's job
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue; // deleted later in the same branch

  const rec = [...byUrl.values()].find((r) => r.rel === rel);
  if (!rec) {
    // No canonical tag at all. A real page always carries one (see CLAUDE.md,
    // "HTML Page Conventions") — a new locale index.html without it would
    // otherwise slip past this gate entirely, since it can't join the
    // hreflang system it's supposed to be checked against.
    if (!rel.endsWith('/index.html')) continue; // fragments/partials — not pages
    const impliedUrl = normalizeUrl(`${SITE_ORIGIN}/${rel.replace(/index\.html$/, '')}`);
    if (enParentExceptionUrls.has(impliedUrl)) continue; // ratified local-only page
    checked++;
    flagged.push({
      rel,
      localeCode: (rel.match(LOCALE_PREFIX_RE) || [])[1] || '?',
      problem: 'no-en-parent',
      detail:
        'This new locale page has no <link rel="canonical"> tag at all, so it cannot join the hreflang ' +
        'system and its EN parent can\'t be classified. Add the canonical + hreflang block (see CLAUDE.md, ' +
        '"HTML Page Conventions" and "Localization Workflow — the English-Parent Rule"), or — if this is a ' +
        'genuinely local-only page — ratify it with the user and record it in data/english_parent_exceptions.json.',
    });
    continue;
  }
  if (rec.ownLang === 'en') continue;
  if (!rec.ownLang) {
    // No self-referencing hreflang entry (typically no hreflang block at
    // all). These used to be skipped silently — exactly how a local-only
    // page could ship ungated. A ratified exception passes here; anything
    // else falls through and is judged by the no-en-parent branch below.
    if (enParentExceptionUrls.has(rec.canonical)) continue;
  }

  checked++;
  const localeCode = rec.ownLang
    ? rec.ownLang.toLowerCase()
    : (rel.match(LOCALE_PREFIX_RE) || [])[1] || '?';

  const enAlt = rec.alternates.find((a) => a.hreflang === 'en');
  const enRec = enAlt ? byUrl.get(enAlt.href) : null;

  if (!enRec) {
    if (enParentExceptionUrls.has(rec.canonical)) {
      // Ratified English-Parent-Rule exception — passes by explicit,
      // recorded decision (data/english_parent_exceptions.json).
      console.log(`  ratified local-only exception (passes): ${rel}`);
      continue;
    }
    flagged.push({
      rel,
      localeCode,
      problem: 'no-en-parent',
      detail:
        'This new locale page declares no resolvable hreflang="en" alternate, so its EN parent ' +
        "(and therefore its Core Parent Set pattern) can't be classified. Add the hreflang link " +
        '(see CLAUDE.md, "Localization Workflow — the English-Parent Rule"), run ' +
        '`npm run sync:locale-mesh -- --fix` if the EN parent already exists, or — if this is a ' +
        'genuinely local-only page — ratify it with the user and record it in ' +
        'data/english_parent_exceptions.json.',
    });
    continue;
  }

  // A ratified local-only page's documented shape is hreflang="en" pointing at
  // the bare EN homepage as a generic placeholder (CLAUDE.md, "Ratified
  // local-only exceptions"). That href RESOLVES, so the !enRec carve-out above
  // never fires for it, and decide() then classifies the homepage — which is
  // unclassified in the Core Parent Set, falls through to the gated tail, and
  // demands a ledger entry keyed on a null pattern that no entry can ever
  // match. Same class of bug, and same fix, as the placeholder-EN-homepage
  // case already documented for audit-hreflang-completeness.js: the exception
  // IS the recorded decision, so it passes here regardless of whether its
  // placeholder happens to resolve.
  // Verified against a deliberately unratified copy of the same page, per
  // CLAUDE.md's "adding a validator is not the same as gating on it" rule:
  // the copy is flagged and the script exits 1, so this is scoped to the
  // ledger rather than a blanket bypass.
  if (enParentExceptionUrls.has(rec.canonical)) {
    console.log(`  ratified local-only exception (passes, placeholder EN parent): ${rel}`);
    continue;
  }

  const result = decide(enRec.rel, localeCode);
  if (!result.requiresLedgerEntry) continue; // Core-parent default-mirror path — passes silently

  const pass = passingLedgerEntry(result.parentInfo.pattern, localeCode);
  if (!pass) {
    flagged.push({ rel, localeCode, enRel: enRec.rel, result, problem: 'missing-ledger-entry' });
  }
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('Locale Parent Gap Check');
console.log(`  base:                       ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  newly-added HTML files:     ${addedFiles.length}`);
console.log(`  new locale pages checked:   ${checked}`);
console.log(`  problems found:             ${flagged.length}`);
console.log('');

if (flagged.length) {
  for (const f of flagged) {
    if (f.problem === 'no-en-parent') {
      console.log(`✗ ${f.rel} — ${f.detail}`);
      console.log('');
      continue;
    }
    console.log(`✗ ${f.rel} (locale: ${f.localeCode}) ships against the registry's default, with no recorded pre-build check:`);
    console.log(`    EN parent:        ${f.enRel}`);
    console.log(`    matched pattern:  ${f.result.parentInfo.pattern || '(unclassified)'}  (tier: ${f.result.parentInfo.tier})`);
    console.log(`    decision:         ${f.result.decision}`);
    console.log(`    reason:           ${f.result.reason}`);
    console.log(
      '    Missing instrument questions: competitor footprint in this locale? keyword volume in this locale ' +
        "(Semrush)? EN page's own GSC impressions from this locale's language queries?"
    );
    console.log(
      '    Fix: record the result in data/locale_parent_gap_audit.json (see its "_readme") once you\'ve run the ' +
        'check, or raise it with the user before treating it as agreed — same bar as CLAUDE.md\'s English-Parent ' +
        'Rule exceptions.'
    );
    console.log('');
  }
  process.exit(1);
} else {
  console.log('No newly-added locale page shipped without a required pre-build gap-check record.');
  process.exit(0);
}
