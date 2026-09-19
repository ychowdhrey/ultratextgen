#!/usr/bin/env node
'use strict';

/**
 * audit-accessibility.js  (npm run audit:accessibility)
 *
 * Whole-site accessibility dashboard. INFORMATIONAL, never gating — the same
 * call as check:images and audit:library-hub-coverage, and for the same
 * reason: the advisory heading-skip class carries a real backlog, so a
 * whole-site check that gated would be permanently red regardless of what any
 * PR touched.
 *
 * The enforcing half is scripts/check-accessibility.js, which is diff-scoped
 * and only bills the blocking classes. Both read scripts/lib/accessibility-audit.js.
 *
 *   --full            list every finding rather than a sample
 *   --rule <id>       scope to one rule
 *   --locale <code>   scope to one locale directory
 *   --json <path>     write raw findings
 */

const fs = require('fs');
const path = require('path');
const A = require('./lib/accessibility-audit.js');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };

const onlyRule = val('--rule');
const onlyLocale = val('--locale');
const jsonOut = val('--json');
const full = flag('--full');

let files = A.listPages();
if (onlyLocale) {
  const prefix = path.join(A.ROOT, onlyLocale) + path.sep;
  files = files.filter((f) => f.startsWith(prefix));
}

const results = A.auditFiles(files);
const pagesScanned = files.filter((f) => {
  try { return A.isPage(fs.readFileSync(f, 'utf8')); } catch { return false; }
}).length;

const byRule = new Map();
for (const { file, findings } of results) {
  for (const f of findings) {
    if (onlyRule && f.rule !== onlyRule) continue;
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push({ file, detail: f.detail });
  }
}

console.log(`Accessibility audit — ${pagesScanned} pages (${files.length - pagesScanned} non-page fragments skipped)\n`);

const order = [...A.BLOCKING, ...A.ADVISORY].filter((r) => !onlyRule || r === onlyRule);
let blockingTotal = 0;
console.log('  rule                    pages  findings  strength');
console.log('  ' + '-'.repeat(62));
for (const rule of order) {
  const hits = byRule.get(rule) || [];
  const pages = new Set(hits.map((h) => h.file)).size;
  const strength = A.BLOCKING.has(rule) ? 'BLOCKING' : 'advisory';
  if (A.BLOCKING.has(rule)) blockingTotal += hits.length;
  console.log(`  ${rule.padEnd(22)} ${String(pages).padStart(6)} ${String(hits.length).padStart(9)}  ${strength}`);
}
console.log();

for (const rule of order) {
  const hits = byRule.get(rule) || [];
  if (!hits.length) continue;
  const shown = full ? hits : hits.slice(0, 5);
  console.log(`\n## ${rule} — ${hits.length} finding(s) on ${new Set(hits.map(h => h.file)).size} page(s)`);
  console.log(`   ${A.RULE_HELP[rule]}`);
  for (const h of shown) console.log(`   ${h.file}  ::  ${h.detail}`);
  if (!full && hits.length > shown.length) {
    console.log(`   … and ${hits.length - shown.length} more (--full to list)`);
  }
}

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
  console.log(`\nwrote ${jsonOut}`);
}

console.log(`\nBlocking-class findings site-wide: ${blockingTotal}`);
console.log('Informational only — scripts/check-accessibility.js is the diff-scoped gate.');
