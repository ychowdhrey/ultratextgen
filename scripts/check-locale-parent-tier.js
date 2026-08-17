#!/usr/bin/env node
'use strict';

/**
 * check-locale-parent-tier.js
 *
 * Advisory CLI over scripts/lib/locale-parent-registry.js's decide(): tells a
 * human/agent, BEFORE starting any new locale-page work, whether the
 * (parent, locale) pair they're about to build defaults to mirror or gate
 * under the Core Parent Set / Locale Qualification Tier registries, and
 * whether that decision requires a recorded pre-build gap check first (see
 * data/locale_parent_gap_audit.json).
 *
 * This is advisory only — it always exits 0. It does not gate anything by
 * itself; scripts/check-locale-parent-gap.js is the enforcing PR gate that
 * actually fails a build lacking a required ledger entry.
 *
 * Usage:
 *   node scripts/check-locale-parent-tier.js <relative-path-or-pattern> <locale-code>
 *   node scripts/check-locale-parent-tier.js symbol/pi-symbol fr
 *   node scripts/check-locale-parent-tier.js usecase/free-fire-name-generator vi
 */

const { decide } = require('./lib/locale-parent-registry');

const [, , relPathArg, localeArg] = process.argv;

if (!relPathArg || !localeArg) {
  console.log('Usage: node scripts/check-locale-parent-tier.js <relative-path-or-pattern> <locale-code>');
  console.log('Example: node scripts/check-locale-parent-tier.js symbol/pi-symbol fr');
  process.exit(0);
}

const result = decide(relPathArg, localeArg);

console.log(`Locale Parent Tier — ${relPathArg}  x  ${localeArg}`);
console.log('');
console.log(`  parent pattern matched:  ${result.parentInfo.pattern || '(none — unclassified)'}`);
console.log(`  parent tier:             ${result.parentInfo.tier}`);
console.log(`  script-independent:      ${result.parentInfo.scriptIndependent}`);
console.log(`  locale tier:             ${result.localeInfo.tier}${result.localeInfo.hold ? ' (HOLD)' : ''}`);
console.log(`  locale action:           ${result.localeInfo.action}`);
console.log('');
console.log(`  DECISION: ${result.decision}`);
console.log(`  REASON:   ${result.reason}`);

if (result.requiresLedgerEntry) {
  console.log('');
  console.log('  This path requires a recorded pre-build check before shipping. See');
  console.log('  data/locale_parent_gap_audit.json (its own "_readme" has the entry shape) and answer:');
  console.log('    - competitor footprint: does a real competitor already rank a page for this job in this locale?');
  console.log('    - keyword volume: what is the monthly search volume for this job in this locale (Semrush / keyword tool)?');
  console.log("    - EN GSC impressions: how many impressions does the EN parent already draw from this locale's language queries?");
  console.log('  Record the verdict there, or raise it with the user before treating it as agreed —');
  console.log("  the same bar CLAUDE.md's English-Parent Rule sets for locale-first exceptions.");
} else {
  console.log('');
  console.log('  No ledger entry required to build this — it is the registry\'s expected default.');
}

process.exit(0);
