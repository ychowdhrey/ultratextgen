#!/usr/bin/env node
'use strict';

/**
 * em-dash-policy.js
 *
 * The per-locale em dash policy: loading and validating
 * data/em_dash_locale_policy.json, resolving a locale to its policy, and the
 * one piece of shared logic the policy needs — telling a lone em dash from
 * one that is half of the paired form ——, which is the native dash in
 * Chinese and Japanese. Shared by the per-PR check
 * (check-editorial-footprint.js), the whole-site audit (audit-em-dash.js) and
 * the tests, so "banned in this locale" can never mean two different things.
 *
 * The four policies, and why they are four and not one:
 *
 *   ban          a new em dash is never the native mark here (English by house
 *                style; thirteen locales whose dash is the spaced en dash), so
 *                an introduced one fails the check and the gate names the
 *                replacement. Forward-only: existing ones are never billed.
 *   native       the em dash IS the language's punctuation (Russian requires
 *                it for an omitted copula), so it is never a finding.
 *   double-dash  the native dash is the paired ——, so a lone — is the import
 *                and the pair is correct. Measured before deciding: 1,036 of
 *                1,121 em dashes on zh-tw pages and 1,810 of 2,565 on ja pages
 *                were already paired.
 *   review       not enough is known; a new em dash is a warning only.
 *
 * A locale absent from the ledger is `review` and reported as missing, never
 * silently banned or silently exempt — the same "zero and unmeasured are
 * opposite claims" rule the score follows.
 */

const fs = require('fs');
const path = require('path');
const { LOCALES } = require('./editorial-corpus');

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY_PATH = path.join(ROOT, 'data', 'em_dash_locale_policy.json');
const POLICIES = ['ban', 'native', 'double-dash', 'review'];
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

/** Every locale the ledger must cover: English plus the canonical locale list. */
const ALL_LOCALES = ['en', ...LOCALES].sort();

function validatePolicy(raw) {
  const errors = [];
  const locales = raw && raw.locales && typeof raw.locales === 'object' ? raw.locales : null;
  if (!locales) return { errors: ['ledger has no "locales" object'], locales: {} };
  for (const [code, e] of Object.entries(locales)) {
    if (!POLICIES.includes(e.policy)) errors.push(`${code}: policy "${e.policy}" is not one of ${POLICIES.join(', ')}`);
    if (typeof e.nativeMark !== 'string' || !e.nativeMark.trim()) errors.push(`${code}: nativeMark is required`);
    if (typeof e.basis !== 'string' || e.basis.trim().length < 10) errors.push(`${code}: basis (the orthographic or corpus reason) is required`);
    if (!DATE_RX.test(e.adopted || '')) errors.push(`${code}: adopted must be YYYY-MM-DD`);
    if (!DATE_RX.test(e.nextReview || '')) errors.push(`${code}: nextReview must be YYYY-MM-DD`);
    if ((e.policy === 'ban' || e.policy === 'double-dash') && (typeof e.replacement !== 'string' || !e.replacement.trim())) {
      errors.push(`${code}: a ${e.policy} policy must name the replacement the gate tells authors to use`);
    }
    if (e.policy === 'native' && e.replacement) errors.push(`${code}: a native policy has no replacement`);
    if (!ALL_LOCALES.includes(code)) errors.push(`${code}: not a canonical locale`);
  }
  return { errors, locales };
}

let _cache = null;
function loadDashPolicy(p = POLICY_PATH) {
  if (_cache && _cache.__path === p) return _cache;
  let raw;
  try { raw = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { errors: [`${p}: ${e.message}`], locales: {}, policies: {}, __path: p }; }
  const { errors, locales } = validatePolicy(raw);
  _cache = { errors, locales, policies: raw.policies || {}, missing: ALL_LOCALES.filter((c) => !locales[c]), __path: p };
  return _cache;
}

/** The policy entry for a locale; `review` (and `missing: true`) when the ledger has none. */
function policyFor(locale, ledger = loadDashPolicy()) {
  const e = ledger.locales[locale];
  if (e) return { locale, ...e, missing: false };
  return { locale, policy: 'review', nativeMark: null, replacement: null, basis: null, missing: true };
}

/**
 * Is this em dash hit one half of a paired —— ?
 *
 * A hit carries `index` (its offset in the slot text) and `context`, an
 * excerpt built as text.slice(max(0, index-45), …) with a leading "..." when
 * it was cut. That is enough to find the character on either side without
 * re-reading the page.
 */
function isPairedEmDash(hit) {
  if (!hit || hit.match !== '—' || typeof hit.index !== 'number' || typeof hit.context !== 'string') return false;
  const a = Math.max(0, hit.index - 45);
  const pos = (a > 0 ? 3 : 0) + (hit.index - a);
  if (hit.context[pos] !== '—') return false;
  return hit.context[pos - 1] === '—' || hit.context[pos + 1] === '—';
}

/**
 * Apply the locale's policy to a list of em dash hits: drop the ones that are
 * not findings under that policy (every one on a native locale; the paired
 * ones on a double-dash locale) and return the rest with the count dropped.
 */
function applyDashPolicy(hits, locale, ledger = loadDashPolicy()) {
  const pol = policyFor(locale, ledger);
  const em = hits.filter((h) => h.id === 'EFR-F-001');
  const rest = hits.filter((h) => h.id !== 'EFR-F-001');
  if (pol.policy === 'native') return { hits: rest, dropped: em.length, policy: pol };
  if (pol.policy === 'double-dash') {
    const lone = em.filter((h) => !isPairedEmDash(h));
    return { hits: [...rest, ...lone], dropped: em.length - lone.length, policy: pol };
  }
  return { hits, dropped: 0, policy: pol };
}

/** Does an introduced finding on this rule fail the run for this locale? */
function isBanned(rule, locale, ledger = loadDashPolicy()) {
  if (rule === 'em-dash') {
    const p = policyFor(locale, ledger).policy;
    return p === 'ban' || p === 'double-dash';
  }
  if (rule === 'spaced-hyphen') return locale === 'en';
  return false;
}

module.exports = {
  POLICY_PATH, POLICIES, ALL_LOCALES,
  validatePolicy, loadDashPolicy, policyFor, isPairedEmDash, applyDashPolicy, isBanned
};
