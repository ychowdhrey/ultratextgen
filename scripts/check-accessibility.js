#!/usr/bin/env node
'use strict';

/**
 * check-accessibility.js  (npm run check:accessibility)
 *
 * The enforcing half of the accessibility audit. DIFF-SCOPED, like
 * check-faq-schema.js and check-new-page-image-assets.py: it inspects only the
 * HTML this branch adds or changes, so pre-existing debt elsewhere can never
 * make it permanently red — only a problem this PR introduces can.
 *
 * It fails on the BLOCKING classes in scripts/lib/accessibility-audit.js, every
 * one of which stands at zero across all 4,645 pages, so there is no backlog to
 * be red against (the same call as check:zalgo-decodes). Advisory findings —
 * today only heading-level skips, all of them the .compare-card design-system
 * pattern on 909 pages — are printed and never billed.
 *
 * A STATE CHECK RATHER THAN A DELTA, deliberately, and this is the one design
 * choice worth defending. check-locale-translation.js and check-faq-schema.js
 * measure the delta because both carry large legitimate backlogs. This one does
 * not: the blocking set is empty site-wide, so "this page has a duplicate id
 * now" is always a defect worth failing on, whether or not the same page had
 * one before. If a blocking class ever acquires a real backlog, move it to
 * ADVISORY rather than weakening this to a delta — a blocking rule with a
 * backlog is exactly the shape people learn to ignore.
 *
 *   --base <ref>   diff against another ref (default origin/main, CI passes it)
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const A = require('./lib/accessibility-audit.js');

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx === -1 ? 'origin/main' : args[baseIdx + 1];

function git(cmdArgs) {
  return execFileSync('git', cmdArgs, { cwd: A.ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(0); // no base to compare against is not this check's failure
}

const changed = git(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}..HEAD`])
  .split('\n')
  .map((s) => s.trim())
  .filter((f) => f.endsWith('.html'))
  .filter((f) => fs.existsSync(path.join(A.ROOT, f)));

console.log('Accessibility check (diff-scoped)');
console.log(`  base:            ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed .html:   ${changed.length}`);

if (!changed.length) {
  console.log('\nNo HTML changed. Nothing to check.');
  process.exit(0);
}

const results = A.auditFiles(changed.map((f) => path.join(A.ROOT, f)));

const blocking = [];
const advisory = [];
for (const { file, findings } of results) {
  for (const f of findings) {
    (A.BLOCKING.has(f.rule) ? blocking : advisory).push({ file, ...f });
  }
}

console.log(`  pages scanned:   ${changed.length}`);
console.log(`  blocking:        ${blocking.length}`);
console.log(`  advisory:        ${advisory.length}`);

if (advisory.length) {
  console.log('\nAdvisory (reported, never billed):');
  const byRule = new Map();
  for (const a of advisory) {
    if (!byRule.has(a.rule)) byRule.set(a.rule, []);
    byRule.get(a.rule).push(a);
  }
  for (const [rule, hits] of byRule) {
    console.log(`  ${rule} — ${hits.length} page(s). ${A.RULE_HELP[rule]}`);
    for (const h of hits.slice(0, 3)) console.log(`    ${h.file}  ::  ${h.detail}`);
    if (hits.length > 3) console.log(`    … and ${hits.length - 3} more`);
  }
}

if (!blocking.length) {
  console.log('\nNo blocking accessibility problems introduced. OK');
  process.exit(0);
}

console.log('\nBLOCKING accessibility problems on pages this branch changed:\n');
const byFile = new Map();
for (const b of blocking) {
  if (!byFile.has(b.file)) byFile.set(b.file, []);
  byFile.get(b.file).push(b);
}
for (const [file, hits] of byFile) {
  console.log(`  ${file}`);
  for (const h of hits) console.log(`    [${h.rule}] ${h.detail}`);
  console.log(`      ${[...new Set(hits.map((h) => A.RULE_HELP[h.rule]))].join('\n      ')}`);
}
console.log(`\n${blocking.length} blocking finding(s) across ${byFile.size} page(s).`);
console.log('Run `npm run audit:accessibility` for the whole-site picture.');
process.exit(1);
