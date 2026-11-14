#!/usr/bin/env node
'use strict';

/**
 * check-locale-parent-gap.js
 *
 * Per-PR gate: for every NEW locale HTML file added in this branch (path
 * starts with a locale code and didn't exist at the merge-base), decide
 * whether it may ship under the language-neutral intent model (2026-11-14,
 * docs/architecture/language-neutral-intents.md):
 *
 *   1. it maps to a canonical intent — through an English member of its
 *      hreflang cluster (implicit legacy id) or a record in
 *      data/canonical_intents.json. A page may originate in ANY qualified
 *      language; an English page is never required;
 *   2. it does not duplicate the page that already serves that intent in its
 *      language (a second member in the same language, or a recorded
 *      localeOwners page), and its language is not one the record lists as
 *      inapplicable or excluded by a locale-specific scope;
 *   3. it clears the Core Parent Set / locale-qualification gate: the
 *      English member's path is classified when there is one (unchanged),
 *      otherwise the page's own lane; a build against the registry's default
 *      needs a passing data/locale_parent_gap_audit.json entry.
 *
 * The per-page rule is evaluateNewLocalePage() in scripts/lib/intent-clusters.js.
 *
 * This is the enforcement half of scripts/audit-locale-parent-gap.js, the
 * same way scripts/check-translation-parity.js enforces what
 * scripts/audit-translation-parity.js discovers.
 *
 * Usage:
 *   node scripts/check-locale-parent-gap.js                 # diff against origin/main
 *   node scripts/check-locale-parent-gap.js --base main      # diff against a different ref
 *
 * Exit code 0 = clean (or nothing new to check), 1 = a page that may not ship,
 * 2 = UNKNOWN (base ref or canonical-intent registry unreadable).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters } = require('./lib/translation-clusters');
const { decide, LOCALES } = require('./lib/locale-parent-registry');
const { buildIntentModel, evaluateNewLocalePage } = require('./lib/intent-clusters');

const ROOT = path.resolve(__dirname, '..');
const GAP_LEDGER_PATH = path.join(ROOT, 'data', 'locale_parent_gap_audit.json');

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

const discovered = discoverClusters(ROOT);
const model = buildIntentModel(ROOT, { discovered });
if (!model.registry.exists || model.registry.error) {
  // An unreadable registry is UNKNOWN, never "nothing to check": every page
  // with no English member would otherwise read as unregistered, or worse, pass.
  console.error(
    `Locale Parent Gap Check: UNKNOWN — ${path.relative(ROOT, model.registry.path)} ` +
      (model.registry.exists ? `could not be parsed (${model.registry.error})` : 'is missing')
  );
  process.exit(2);
}

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

// ─── Check every newly-added locale page ───────────────────────────────────
//
// The admission rule lives in scripts/lib/intent-clusters.js
// (evaluateNewLocalePage) so the unit tests exercise exactly what CI runs.
// Since 2026-11-14 it does not ask whether an English page exists: a page must
// map to a canonical intent, must not duplicate the page that already serves
// that intent in its language, and must clear the same Core-Parent /
// locale-qualification gate as a translation. data/english_parent_exceptions.json
// is retired and is no longer read here.

const flagged = [];
let checked = 0;
const passedOrigin = [];

for (const rel of addedFiles) {
  if (!LOCALE_PREFIX_RE.test(rel)) continue; // not a locale page — not this gate's job
  if (!fs.existsSync(path.join(ROOT, rel))) continue; // deleted later in the same branch
  const verdict = evaluateNewLocalePage({ rel, model, decide, ledgerEntries, locales: LOCALES });
  if (verdict.status === 'skip') continue;
  checked++;
  if (verdict.status === 'pass') {
    if (verdict.cluster && !verdict.cluster.enUrl) {
      passedOrigin.push({ rel, id: verdict.cluster.key, classifiedPath: verdict.classifiedPath, decision: verdict.result.decision });
    }
    continue;
  }
  flagged.push({ rel, ...verdict });
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('Locale Parent Gap Check');
console.log(`  base:                       ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  newly-added HTML files:     ${addedFiles.length}`);
console.log(`  new locale pages checked:   ${checked}`);
console.log(`  problems found:             ${flagged.length}`);
console.log('');

if (passedOrigin.length) {
  console.log('New pages with no English member (passed: canonical intent registered, gate cleared):');
  for (const p of passedOrigin) {
    console.log(`  ✓ ${p.rel}  intent ${p.id}  (classified as ${p.classifiedPath} → ${p.decision})`);
  }
  console.log('');
}

if (flagged.length) {
  for (const f of flagged) {
    if (f.problem !== 'missing-ledger-entry') {
      console.log(`✗ ${f.rel} [${f.problem}] — ${f.detail}`);
      console.log('');
      continue;
    }
    const origin = f.cluster && !f.cluster.enUrl;
    console.log(`✗ ${f.rel} (locale: ${f.localeCode}) ships against the registry's default, with no recorded pre-build check:`);
    console.log(`    canonical intent: ${f.cluster ? f.cluster.key : '(none)'}`);
    console.log(`    classified as:    ${f.classifiedPath}${origin ? ' (its own lane; the cluster has no English member, which is allowed)' : ' (the cluster\'s English member)'}`);
    console.log(`    matched pattern:  ${f.result.parentInfo.pattern || '(unclassified)'}  (tier: ${f.result.parentInfo.tier})`);
    console.log(`    decision:         ${f.result.decision}`);
    console.log(`    reason:           ${f.result.reason}`);
    console.log(
      '    Missing instrument questions: competitor footprint in this locale? keyword volume in this locale? ' +
        (origin
          ? 'first-party impressions on this locale\'s existing pages for the same job?'
          : "the English page's own GSC impressions from this locale's language queries?")
    );
    console.log(
      `    Fix: record the result in data/locale_parent_gap_audit.json with pattern "${f.ledgerKey}" and locale "${f.localeCode}" ` +
        '(see its "_readme") once you have run the check, or raise it with the user before treating it as agreed.'
    );
    console.log('');
  }
  process.exit(1);
} else {
  console.log('No newly-added locale page shipped without a required pre-build gap-check record.');
  process.exit(0);
}
