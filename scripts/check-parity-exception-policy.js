#!/usr/bin/env node
'use strict';

/**
 * check-parity-exception-policy.js
 *
 * Diff-scoped gate on data/translation_parity_exceptions.json: every entry this
 * change ADDS or EDITS must carry the evidence an intentional divergence needs
 * (canonical intent, the exact difference, evidence, user impact, alternatives
 * considered, the owner decision and a review date) and must not rest on a
 * prohibited ground (missing volume, low demand, no English parent, a validator
 * failing, a translation being inconvenient). The rules live in
 * scripts/lib/parity-exceptions.js (validateProposedEntry), shared with anything
 * else that proposes an entry.
 *
 * Entries that existed at the merge base are grandfathered (reported as a count,
 * never failed): the policy took effect 2026-11-15 and the ledger's 196 earlier
 * entries were each discussed under the rules of their day. Removing an entry is
 * always allowed. This gate never writes the ledger.
 *
 * Usage:
 *   node scripts/check-parity-exception-policy.js            # against origin/main
 *   node scripts/check-parity-exception-policy.js --base main
 *   node scripts/check-parity-exception-policy.js --file <entries.json>
 *       validate proposed entries (an array, or {exceptions: [...]}) without git;
 *       every entry is treated as new. For tooling that drafts a proposal.
 *
 * Exit: 0 clean · 1 a new/changed entry breaks the policy · 2 UNKNOWN (ledger
 * unreadable at HEAD or the base could not be resolved).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateProposedEntry, entryKey, EXCEPTIONS_PATH } = require('./lib/parity-exceptions');

const ROOT = path.resolve(__dirname, '..');
const REL = path.relative(ROOT, EXCEPTIONS_PATH);
const args = process.argv.slice(2);
const opt = (n) => (args.indexOf(n) !== -1 ? args[args.indexOf(n) + 1] : null);

function parseEntries(text, label) {
  try {
    const d = JSON.parse(text);
    return Array.isArray(d) ? d : d.exceptions || [];
  } catch (e) {
    console.error(`UNKNOWN: ${label} is not valid JSON (${e.message}); nothing was checked.`);
    process.exit(2);
  }
  return [];
}

function report(changed, grandfathered) {
  let bad = 0;
  for (const e of changed) {
    const problems = validateProposedEntry(e);
    if (!problems.length) continue;
    bad++;
    console.log(`\n✗ ${e.enUrl || '?'} ↔ ${e.localeUrl || '?'}`);
    for (const p of problems) console.log(`    [${p.code}] ${p.message}`);
  }
  console.log('\nParity Exception Policy Check');
  console.log(`  new or changed entries: ${changed.length}`);
  console.log(`  failing the policy:     ${bad}`);
  if (grandfathered != null) console.log(`  grandfathered entries:  ${grandfathered} (existed at the merge base; not re-judged)`);
  if (bad) {
    console.log('\nAn exception records a discussed, evidenced, intentional divergence. If the evidence does not exist yet,');
    console.log('the work is research or a translation, not an exception (docs/architecture/translation-parity.md §13).');
    process.exit(1);
  }
  process.exit(0);
}

function main() {
  const file = opt('--file');
  if (file) return report(parseEntries(fs.readFileSync(file, 'utf8'), file), null);

  if (!fs.existsSync(EXCEPTIONS_PATH)) {
    console.error(`UNKNOWN: ${REL} does not exist at HEAD; nothing was checked.`);
    process.exit(2);
  }
  const head = parseEntries(fs.readFileSync(EXCEPTIONS_PATH, 'utf8'), `${REL} (HEAD)`);
  const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  const requested = opt('--base') || 'origin/main';
  let base = requested;
  try {
    git(['rev-parse', '--verify', base]);
  } catch {
    try {
      git(['fetch', '--depth=200', 'origin', requested.replace(/^origin\//, '')]);
      base = `origin/${requested.replace(/^origin\//, '')}`;
      git(['rev-parse', '--verify', base]);
    } catch (e) {
      console.error(`UNKNOWN: could not resolve base ${requested}; nothing was checked.`);
      process.exit(2);
    }
  }
  let before = [];
  try {
    const mb = git(['merge-base', base, 'HEAD']).trim();
    let text = null;
    try {
      text = git(['show', `${mb}:${REL}`]);
    } catch {
      text = null; // the ledger is new on this branch: every entry is new
    }
    if (text != null) before = parseEntries(text, `${REL} (merge base)`);
  } catch (e) {
    console.error(`UNKNOWN: could not compute the merge base with ${base}; nothing was checked.`);
    process.exit(2);
  }
  const baseByKey = new Map(before.map((e) => [entryKey(e), JSON.stringify(e)]));
  const changed = head.filter((e) => baseByKey.get(entryKey(e)) !== JSON.stringify(e));
  report(changed, head.length - changed.length);
}

main();
