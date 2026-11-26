'use strict';

/**
 * locale-parent-registry.js
 *
 * Shared lookup layer over the two governance registries added alongside
 * this file:
 *   - data/core_parent_set.json          (which page patterns are "Core" —
 *     mirror by default — vs. "gated tail" vs. "never")
 *   - data/locale_qualification_tiers.json (which locales are qualified for
 *     the Core Parent Set's default-mirror at all)
 *
 * classifyParent()/classifyLocale() are plain lookups; decide() implements
 * the 5-step per-(parent, locale) decision flowchart (see CLAUDE.md, "Locale
 * Parent Governance", and docs/locale-parent-governance.md for the full
 * writeup) verbatim, steps 1-3, returning a decision object instead of a bare
 * string so callers (scripts/check-locale-parent-tier.js,
 * scripts/check-locale-parent-gap.js, scripts/audit-locale-parent-gap.js) can
 * branch on it. Steps 4 (cannibalization wiring check) and 5 (mesh
 * generation on ship) are procedural, not classification — they're handled
 * by scripts/sync-locale-mesh.js and the existing "check who already owns
 * it" rule in CLAUDE.md, not by this lookup.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CORE_PARENT_SET_PATH = path.join(ROOT, 'data', 'core_parent_set.json');
const LOCALE_TIERS_PATH = path.join(ROOT, 'data', 'locale_qualification_tiers.json');

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`WARNING: could not parse ${path.relative(ROOT, p)}: ${e.message}`);
    return fallback;
  }
}

const coreParentSet = loadJson(CORE_PARENT_SET_PATH, { tiers: {}, parents: [] });
const localeTiers = loadJson(LOCALE_TIERS_PATH, { locales: {} });

// The canonical locale-code list, derived from data/locale_qualification_tiers.json
// rather than hand-duplicated, so every script importing LOCALES from here
// automatically agrees with the registry (which itself mirrors
// scripts/check-image-assets.py's LOCALES tuple — see that registry's _readme).
const LOCALES = Object.keys(localeTiers.locales);

// CJK / Arabic / Indic locales, per the strategy doc's script-compatibility
// overlay: a Latin-transform-dependent Core parent (scriptIndependent: false,
// e.g. category/*) is not a real job in these locales.
const NON_LATIN_LOCALES = new Set(['ar', 'hi', 'ja', 'ko', 'th', 'zh-tw']);

function normalizeRelPath(relPath) {
  return String(relPath || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

// A pattern ending in "/*" matches the literal prefix or anything nested
// under it; a pattern with no "*" matches only that exact path (tolerating
// the caller passing either "category/index.html" or the bare directory
// "category", and either "symbol/euro-sign" or "symbol/euro-sign/index.html").
function stripIndexHtml(p) {
  return p.replace(/\/index\.html$/, '').replace(/^index\.html$/, '');
}

function patternMatches(pattern, relPath) {
  const rp = stripIndexHtml(relPath);
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return rp === prefix || rp.startsWith(prefix + '/');
  }
  return rp === stripIndexHtml(pattern);
}

// Specificity = the length of the pattern's literal (non-wildcard) prefix.
// Longer literal prefix wins — this is how a specific carve-out like
// "usecase/nickname-generator/*" (28 chars) outranks the general
// "usecase/*" (9 chars) default, and an exact hub-index override like
// "category/index.html" outranks "category/*".
function specificity(pattern) {
  return pattern.replace(/\/\*$/, '').length;
}

const UNCLASSIFIED_PARENT = {
  pattern: null,
  tier: 'unclassified',
  scriptIndependent: null,
  rationale:
    'No pattern in data/core_parent_set.json matched this path. Treated like gated tail ' +
    '(guilty until proven present) out of caution until the registry is updated — raise it ' +
    "with the user rather than assuming it's Core.",
};

/**
 * @param {string} relPath - repo-root-relative path of an EN canonical page,
 *   e.g. "symbol/euro-sign/index.html" or "symbol/euro-sign".
 * @returns {{pattern, tier, scriptIndependent, rationale}}
 */
function classifyParent(relPath) {
  const matches = (coreParentSet.parents || []).filter((entry) => patternMatches(entry.pattern, relPath));
  if (!matches.length) return UNCLASSIFIED_PARENT;
  matches.sort((a, b) => specificity(b.pattern) - specificity(a.pattern));
  return matches[0];
}

const UNKNOWN_LOCALE = {
  tier: 3,
  action: 'hold-stub',
  hold: false,
  notes:
    'Locale code not present in data/locale_qualification_tiers.json — treated as unqualified ' +
    '(Tier 3) by default until the registry is updated.',
};

/**
 * @param {string} code - locale code, e.g. "fr", "zh-tw".
 * @returns {{tier, action, hold, holdReason?, notes?}}
 */
function classifyLocale(code) {
  const rec = localeTiers.locales[String(code || '').toLowerCase()];
  return rec || UNKNOWN_LOCALE;
}

/**
 * The per-(parent, locale) decision flowchart from the strategy doc, steps
 * 1-3 (first stop wins):
 *   1. Tier-3 stub locale (or Tier-2-but-held, e.g. vi) -> don't mirror.
 *   2. Script-incompatible parent for this locale (a Latin-transform Core
 *      parent into a CJK/Arabic/Indic locale) -> skip this parent here.
 *   3. Core parent -> mirror by default; gated tail (or "never") -> gate by
 *      default.
 *
 * @param {string} relPath - repo-root-relative path of the EN parent page.
 * @param {string} localeCode
 * @returns {{decision, reason, requiresLedgerEntry, parentInfo, localeInfo}}
 */
function decide(relPath, localeCode) {
  const parentInfo = classifyParent(relPath);
  const localeInfo = classifyLocale(localeCode);

  // Step 1 (+ the vi-style hold case, which the strategy doc treats the same
  // way as a stub for build purposes: "do not add vi content").
  if (localeInfo.hold) {
    return {
      decision: 'skip-hold-locale',
      reason: `Locale "${localeCode}" is on an explicit hold: ${localeInfo.holdReason || 'see data/locale_qualification_tiers.json'}`,
      requiresLedgerEntry: true,
      parentInfo,
      localeInfo,
    };
  }
  if (localeInfo.tier === 3) {
    return {
      decision: 'skip-stub-locale',
      reason: `Locale "${localeCode}" is Tier 3 (${localeInfo.action}) — no spec mirroring until it's promoted via the 7-point qualification gate. ` +
        'One page may still ship here under the Rule B exception (owner decision 2026-11-26): a page-scoped data/locale_parent_gap_audit.json entry with verdict "rule-b-exception" or "rule-b-experiment" (see data/locale_rule_b_exception.json).',
      requiresLedgerEntry: true,
      parentInfo,
      localeInfo,
    };
  }

  // Step 2
  if (parentInfo.tier === 'core' && parentInfo.scriptIndependent === false && NON_LATIN_LOCALES.has(localeCode)) {
    return {
      decision: 'skip-script-incompatible',
      reason: `"${parentInfo.pattern}" is a Latin-transform-dependent Core parent — not a real job in "${localeCode}" (CJK/Arabic/Indic script). Substitute the locale's script-appropriate Core subset (symbol/library/name-gen/counter) instead of skipping the locale outright.`,
      requiresLedgerEntry: true,
      parentInfo,
      localeInfo,
    };
  }

  // Step 3
  if (parentInfo.tier === 'core') {
    return {
      decision: 'mirror',
      reason: `"${parentInfo.pattern}" is Core and "${localeCode}" is qualified (tier ${localeInfo.tier}) — default is MIRROR. Only veto on a recorded pre-build check showing genuinely negligible demand (data/locale_parent_gap_audit.json, verdict "veto").`,
      requiresLedgerEntry: false,
      parentInfo,
      localeInfo,
    };
  }

  if (parentInfo.tier === 'never') {
    return {
      decision: 'gate',
      reason: `"${parentInfo.pattern}" is tiered "never" — it does not mirror regardless of demand signal.`,
      requiresLedgerEntry: true,
      parentInfo,
      localeInfo,
    };
  }

  // Gated tail (including the "unclassified" fallback, treated the same way
  // out of caution).
  return {
    decision: 'gate',
    reason: `"${parentInfo.pattern || '(unclassified)'}" is gated tail — default is DO NOT MIRROR. A build requires a recorded pre-build check clearing threshold (data/locale_parent_gap_audit.json, verdict "gate-pass").`,
    requiresLedgerEntry: true,
    parentInfo,
    localeInfo,
  };
}

// ─── Rule B exception (owner decision 2026-11-26) ─────────────────────────
//
// A Tier-3 locale stays Tier 3: decide() above still returns skip-stub-locale
// for it, so the registry keeps stating the standing default. What the owner
// added is a per-PAGE exception: one page-language combination may ship in an
// EXISTING Tier-3 locale when its canonical intent qualifies by Rule B
// (>= 100 Google impressions in each of >= 5 languages over 90 days) and the
// target language's own evidence is positive (verdict "rule-b-exception") or,
// inside a bounded experimental allowance, merely insufficient (verdict
// "rule-b-experiment"). Negative evidence never passes. Constants and the
// allowance live in data/locale_rule_b_exception.json.

const RULE_B_PATH = path.join(ROOT, 'data', 'locale_rule_b_exception.json');
const ruleBPolicy = loadJson(RULE_B_PATH, null);
const RULE_B_VERDICTS = new Set(['rule-b-exception', 'rule-b-experiment']);

function pageKey(relPath) {
  return normalizeRelPath(relPath).replace(/\/?index\.html$/, '');
}

/**
 * Problems with the Rule B entries in a gap-ledger array, independent of any
 * page: missing fields, a verdict whose evidence class does not match, an
 * unknown locale (that would be a new-locale launch), an experimental cohort
 * with no allowance or over its cap. Returns [{entry, code, detail}].
 */
function validateRuleBEntries(entries, policy = ruleBPolicy, tiers = localeTiers) {
  const problems = [];
  const rb = (entries || []).filter((e) => e && RULE_B_VERDICTS.has(e.verdict));
  if (!rb.length) return problems;
  if (!policy) {
    return rb.map((entry) => ({ entry, code: 'rule-b-policy-missing', detail: 'data/locale_rule_b_exception.json is missing or unreadable, so no Rule B entry can be honoured (UNKNOWN, never a pass).' }));
  }
  const minLangs = (policy.ruleB && policy.ruleB.minLanguages) || 5;
  const ready = new Set(policy.readyScriptReadiness || []);
  const perCohort = new Map();
  for (const e of rb) {
    const where = `${e.pattern} x ${e.locale}`;
    const want = ((policy.verdicts || {})[e.verdict] || {}).targetEvidence;
    if (e.scope !== 'page' || !e.pattern || /\*/.test(e.pattern)) {
      problems.push({ entry: e, code: 'rule-b-not-page-scoped', detail: `${where}: a Rule B entry authorizes one page, so it needs scope "page" and a pattern without "*".` });
    }
    const tierRec = tiers.locales[String(e.locale || '').toLowerCase()];
    if (!tierRec) {
      problems.push({ entry: e, code: 'rule-b-new-locale', detail: `${where}: "${e.locale}" has no tier entry; launching a new locale stays an owner decision, not a Rule B exception.` });
    } else if (tierRec.hold) {
      problems.push({ entry: e, code: 'rule-b-held-locale', detail: `${where}: "${e.locale}" carries an explicit hold; the exception does not lift a hold.` });
    }
    const langs = e.ruleB && Number(e.ruleB.languages);
    if (!(langs >= minLangs)) {
      problems.push({ entry: e, code: 'rule-b-not-qualified', detail: `${where}: ruleB.languages must be >= ${minLangs} (got ${langs || 'none'}).` });
    }
    if (e.targetEvidence !== want) {
      problems.push({ entry: e, code: 'rule-b-evidence-mismatch', detail: `${where}: verdict "${e.verdict}" requires targetEvidence "${want}" (got "${e.targetEvidence}"). Negative target-language evidence is a hold, never a pass.` });
    }
    if (!ready.has(e.scriptReadiness)) {
      problems.push({ entry: e, code: 'rule-b-prerequisite', detail: `${where}: scriptReadiness "${e.scriptReadiness}" is not one of ${[...ready].join(', ')}; an unresolved technical prerequisite stays blocked.` });
    }
    if (!e.checkedDate || !e.evidence) {
      problems.push({ entry: e, code: 'rule-b-incomplete', detail: `${where}: checkedDate and evidence are required.` });
    }
    if (e.verdict === 'rule-b-experiment') {
      const cohort = e.experimentCohort;
      const allowance = cohort && (policy.experimentalAllowances || {})[cohort];
      if (!allowance) {
        problems.push({ entry: e, code: 'rule-b-no-allowance', detail: `${where}: experimentCohort "${cohort || ''}" has no allowance in data/locale_rule_b_exception.json.` });
      } else {
        perCohort.set(cohort, (perCohort.get(cohort) || 0) + 1);
      }
      if (!e.recheckDate) {
        problems.push({ entry: e, code: 'rule-b-incomplete', detail: `${where}: an experiment needs a recheckDate.` });
      }
    }
  }
  for (const [cohort, n] of perCohort) {
    const cap = policy.experimentalAllowances[cohort].cap;
    if (n > cap) problems.push({ entry: null, code: 'rule-b-over-allowance', detail: `experimental cohort ${cohort} has ${n} entries; its allowance is ${cap}.` });
  }
  return problems;
}

/**
 * The Rule B exception for one (classified page path, locale), given the
 * decide() result for it. Returns { status: 'none' } when the exception does
 * not apply (not a Tier-3 stub decision, or no page entry), { status: 'pass',
 * entry } or { status: 'fail', code, detail, entry }.
 */
function ruleBException(classifiedPath, localeCode, result, ledgerEntries, policy = ruleBPolicy, tiers = localeTiers) {
  if (!result || result.decision !== 'skip-stub-locale') return { status: 'none' };
  const key = pageKey(classifiedPath);
  const lc = String(localeCode || '').toLowerCase();
  const entry = (ledgerEntries || []).find(
    (e) => e && RULE_B_VERDICTS.has(e.verdict) && pageKey(e.pattern) === key && String(e.locale || '').toLowerCase() === lc
  );
  if (!entry) return { status: 'none' };
  const problems = validateRuleBEntries([entry], policy, tiers);
  if (problems.length) return { status: 'fail', code: problems[0].code, detail: problems.map((p) => p.detail).join(' '), entry };
  const parent = result.parentInfo || {};
  if (parent.tier === 'core' && parent.scriptIndependent === false && NON_LATIN_LOCALES.has(lc)) {
    return { status: 'fail', code: 'rule-b-script-incompatible', entry,
      detail: `"${parent.pattern}" is Latin-transform-dependent and "${lc}" is not Latin-script: the exception never overrides a script blocker.` };
  }
  return { status: 'pass', entry };
}

/**
 * An owner override for ONE page, recorded per page rather than per pattern
 * (localization rule 8: "a locale hold is a default the user can override
 * explicitly, per batch, recorded as a dated, attributed decision"). A
 * pattern-level gate-pass on `library/*` would authorize every library page in
 * the locale; this admits exactly the page named. First use: the locale library
 * hubs the Rule B cohort needs (owner decision 2026-11-26).
 *
 * Entry: { pattern: "<reference path without index.html>", scope: "page",
 * locale, verdict: "gate-pass" | "mirror", checkedDate, evidence,
 * ownerDecision: { date, summary } }. Returns the entry or null.
 */
function ownerPagePass(classifiedPath, localeCode, ledgerEntries) {
  const key = pageKey(classifiedPath);
  const lc = String(localeCode || '').toLowerCase();
  return (ledgerEntries || []).find((e) => e && e.scope === 'page' && pageKey(e.pattern) === key &&
    String(e.locale || '').toLowerCase() === lc && (e.verdict === 'gate-pass' || e.verdict === 'mirror') &&
    e.ownerDecision && e.ownerDecision.date && e.ownerDecision.summary && e.checkedDate && e.evidence) || null;
}

module.exports = {
  LOCALES,
  NON_LATIN_LOCALES,
  classifyParent,
  classifyLocale,
  decide,
  coreParentSet,
  localeTiers,
  ruleBPolicy,
  ruleBException,
  validateRuleBEntries,
  RULE_B_VERDICTS,
  ownerPagePass,
};
