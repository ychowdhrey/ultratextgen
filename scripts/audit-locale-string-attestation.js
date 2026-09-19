#!/usr/bin/env node
'use strict';
/**
 * audit-locale-string-attestation.js  (npm run audit:locale-attestation)
 *
 * For every string in a locale's `locales/<code>.json`, report whether it is
 * built from words this site already uses on its own pages in that language.
 *
 * WHY IT EXISTS. A locale UI file normally gets a native reviewer. When none is
 * available — `locales/ms.json` shipped 2026-09-05 with its own `_readme`
 * saying so — the site's own pages in that language are the next-best evidence,
 * and nothing could read them. This turns "75 unreviewed strings" into "N
 * strings that still need a human", which is a different and much smaller
 * question.
 *
 * IT MEASURES CORPUS SUPPORT, NOT CORRECTNESS. An `attested` string contains no
 * invented word; it can still carry the wrong inflection, collocation or
 * register. Read scripts/lib/locale-string-attestation.js's header before
 * citing a verdict — the Swedish `kontrollerat` / `kontrollerad` case it names
 * is exactly the kind of error a corpus check cannot see.
 *
 * INFORMATIONAL, NEVER GATING. There is no defect to fail a PR on here: a
 * `partial` verdict is a question for a reviewer, not a broken build.
 *
 *   --locale <code>     one locale (repeatable); default every locales/*.json
 *                       that has pages on disk
 *   --verdict <v>       only show attested | partial | unattested
 *   --strings <s...>    attest ad-hoc candidate strings instead of a file,
 *                       for checking a proposed translation before adding it
 *   --full              list every string, not just the ones needing attention
 *   --json <path>       write the raw result
 */

const fs = require('fs');
const path = require('path');
const A = require('./lib/locale-string-attestation.js');

const argv = process.argv.slice(2);
function multi(flag) {
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== flag) continue;
    for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j += 1) out.push(argv[j]);
  }
  return out;
}
function one(flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
}

const wantLocales = multi('--locale');
const candidates = multi('--strings');
const wantVerdict = one('--verdict');
const full = argv.includes('--full');
const jsonOut = one('--json');

const ORDER = { unattested: 0, partial: 1, attested: 2, 'no-evidence-needed': 3 };

if (candidates.length) {
  if (wantLocales.length !== 1) {
    console.error('--strings needs exactly one --locale to attest against.');
    process.exit(2);
  }
  const code = wantLocales[0];
  const corpus = A.buildCorpus(code);
  console.log(`Attesting ${candidates.length} candidate string(s) against ${code}/ (${corpus.pages} pages)\n`);
  for (const s of candidates) {
    const r = A.attest(s, corpus);
    const missing = r.words.filter((w) => !w.found).map((w) => w.word);
    console.log(`  ${r.verdict.padEnd(18)} ${JSON.stringify(s)}${missing.length ? '   unattested words: ' + missing.join(', ') : ''}`);
  }
  process.exit(0);
}

const locales = (wantLocales.length
  ? wantLocales
  : fs.readdirSync(path.join(A.ROOT, 'locales'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .filter((c) => c !== 'en')
).filter((c) => fs.existsSync(path.join(A.ROOT, c)));

const report = [];
console.log('Locale string attestation — are these strings built from words the site already uses?');
console.log(`stem length ${A.STEM_LEN}; "attested" means no invented word, NOT verified correctness\n`);
console.log('  locale  pages  strings  attested  partial  unattested   method / caveat');
console.log('  ---------------------------------------------------------------------------');

for (const code of locales) {
  const file = path.join(A.ROOT, 'locales', `${code}.json`);
  if (!fs.existsSync(file)) continue;
  const corpus = A.buildCorpus(code);
  const entries = A.flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
  const rows = entries.map((e) => ({ ...e, ...A.attest(e.value, corpus) }));
  const n = (v) => rows.filter((r) => r.verdict === v).length;
  const m = A.methodFor(rows.map((r) => r.value), corpus.pages);
  console.log(
    `  ${code.padEnd(7)} ${String(corpus.pages).padStart(5)} ${String(rows.length).padStart(8)} ` +
    `${String(n('attested')).padStart(9)} ${String(n('partial')).padStart(8)} ${String(n('unattested')).padStart(11)}` +
    `   ${m.method}${m.notes.length ? ' — ' + m.notes.join('; ') : ''}`
  );
  report.push({ locale: code, pages: corpus.pages, method: m.method, notes: m.notes, rows });
}

for (const { locale, rows } of report) {
  const show = rows
    .filter((r) => (wantVerdict ? r.verdict === wantVerdict : full || r.verdict === 'partial' || r.verdict === 'unattested'))
    .sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || a.path.localeCompare(b.path));
  if (!show.length) continue;
  console.log(`\n## ${locale} — ${show.length} string(s) needing a reader`);
  for (const r of show) {
    const missing = r.words.filter((w) => !w.found).map((w) => w.word);
    console.log(`   ${r.verdict.padEnd(11)} ${r.path}`);
    console.log(`               ${JSON.stringify(r.value)}`);
    if (missing.length) console.log(`               not on this locale's pages: ${missing.join(', ')}`);
  }
}

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
  console.log(`\nWrote ${jsonOut}`);
}
console.log('\nInformational only. A `partial` verdict is a question for a reviewer, not a defect.');
