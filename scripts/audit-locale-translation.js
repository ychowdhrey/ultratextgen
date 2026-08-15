#!/usr/bin/env node
'use strict';

/**
 * audit-locale-translation.js
 *
 * Whole-site dashboard for the same question scripts/check-locale-translation.js
 * gates per PR: which locale pages still carry English verbatim from their own
 * EN parent. Shares scripts/lib/locale-translation-audit.js with the gate so the
 * two can never disagree about what "untranslated" means.
 *
 * Discovery tool, not wired into CI: the site carries a real backlog and this
 * will not go to zero in one pass. Use it to size and triage that backlog; use
 * the gate to stop it growing.
 *
 * Usage:
 *   node scripts/audit-locale-translation.js              # per-locale summary
 *   node scripts/audit-locale-translation.js --full       # every page + strings
 *   node scripts/audit-locale-translation.js --locale nl  # one locale
 *   node scripts/audit-locale-translation.js --json out.json
 *   node scripts/audit-locale-translation.js --report out.md
 */

const fs = require('fs');
const path = require('path');
const { auditLocalePage, localeOf } = require('./lib/locale-translation-audit');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'assets', 'scripts', 'data', 'docs', 'functions', 'js', '.github'
]);

const args = process.argv.slice(2);
const full = args.includes('--full');
const arg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const onlyLocale = arg('--locale');
const jsonOut = arg('--json');
const reportOut = arg('--report');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(path.join(dir, entry.name), acc);
    } else if (entry.name.endsWith('.html')) {
      acc.push(path.relative(ROOT, path.join(dir, entry.name)));
    }
  }
  return acc;
}

const pages = walk(ROOT).filter((p) => {
  const loc = localeOf(p);
  return loc && (!onlyLocale || loc === onlyLocale);
});

const byLocale = new Map();
const flagged = [];
let checked = 0;
let skippedNoParent = 0;

for (const rel of pages) {
  const r = auditLocalePage(rel, { root: ROOT });
  if (r.status === 'not-a-locale-page') continue;
  if (r.status === 'no-parent' || r.status === 'parent-missing') {
    skippedNoParent++;
    continue;
  }
  checked++;
  if (!byLocale.has(r.locale)) byLocale.set(r.locale, { checked: 0, flagged: 0, strings: 0 });
  const b = byLocale.get(r.locale);
  b.checked++;
  if (r.status === 'untranslated') {
    b.flagged++;
    b.strings += r.survivors.length;
    flagged.push({ rel, ...r });
  }
}

const lines = [];
const say = (s = '') => {
  lines.push(s);
  console.log(s);
};

say('Locale Translation Completeness — whole-site audit');
say(`  locale pages with an EN parent: ${checked}`);
say(`  pages still carrying English:   ${flagged.length}`);
say(`  skipped (no EN parent):         ${skippedNoParent}`);
say('');

if (byLocale.size) {
  say('  locale   checked   flagged   strings');
  say('  ------   -------   -------   -------');
  const rows = [...byLocale.entries()].sort((a, b) => b[1].flagged - a[1].flagged);
  for (const [loc, b] of rows) {
    say(
      `  ${loc.padEnd(8)} ${String(b.checked).padStart(7)}   ${String(b.flagged).padStart(7)}   ` +
        `${String(b.strings).padStart(7)}`
    );
  }
  say('');
}

if (full) {
  for (const f of flagged.sort((a, b) => b.survivors.length - a.survivors.length)) {
    say(`✗ ${f.rel} — ${f.survivors.length} string(s) from ${f.parent}`);
    for (const s of f.survivors) say(`    · ${s.length > 140 ? `${s.slice(0, 140)}…` : s}`);
    say('');
  }
} else if (flagged.length) {
  say('Worst pages (pass --full for every string):');
  for (const f of [...flagged].sort((a, b) => b.survivors.length - a.survivors.length).slice(0, 20)) {
    say(`  ${String(f.survivors.length).padStart(4)}  ${f.rel}`);
  }
  say('');
}

if (!flagged.length) say('No locale page carries an English source string. ✓');

if (jsonOut) {
  fs.writeFileSync(
    path.join(ROOT, jsonOut),
    JSON.stringify(
      { checked, skippedNoParent, byLocale: Object.fromEntries(byLocale), flagged },
      null,
      2
    )
  );
  console.log(`\nWrote ${jsonOut}`);
}
if (reportOut) {
  fs.writeFileSync(path.join(ROOT, reportOut), `\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
  console.log(`Wrote ${reportOut}`);
}
