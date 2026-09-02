#!/usr/bin/env node
'use strict';

/**
 * audit-em-dash.js — the em dash policy, measured against every locale.
 *
 * The per-locale policy in data/em_dash_locale_policy.json was adopted from
 * reference orthographies, not from this site's pages, and is meant to be
 * revised as more pages are crawled. This is the instrument for that: for
 * every locale it prints the policy beside what the corpus actually carries —
 * em dashes per 1,000 words, the share of pages with one, how many are the
 * paired —— form, spaced hyphens in prose — and lists the pages a
 * double-dash or review locale should look at first.
 *
 * INFORMATIONAL, never gating. The forward-only enforcement lives in
 * check-editorial-footprint.js; this only says whether the table it enforces
 * still matches the language.
 *
 * Usage:
 *   node scripts/audit-em-dash.js
 *   node scripts/audit-em-dash.js --locale ja --top 15
 *   node scripts/audit-em-dash.js --report docs/em-dash-locale-audit.md --json out.json
 */

const fs = require('fs');
const path = require('path');
const { loadPages } = require('./audit-editorial-footprint');
const { matchBank, loadBank } = require('./lib/editorial-footprint');
const { editorialText, words } = require('./lib/editorial-corpus');
const P = require('./lib/em-dash-policy');

const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const TOP = +(flag('--top') || 10);
const ONLY = flag('--locale');
const HYPHEN = /\S +- +\S/g;

function median(v) { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(1); }

function measure() {
  const bank = loadBank();
  const ledger = P.loadDashPolicy();
  const today = new Date().toISOString().slice(0, 10);
  const pages = loadPages().filter((p) => p.indexable !== false && p.rel !== '_root.html');
  const by = new Map();
  for (const p of pages) {
    if (ONLY && p.locale !== ONLY) continue;
    if (!by.has(p.locale)) by.set(p.locale, { locale: p.locale, pages: 0, withEmDash: 0, emDashes: 0, paired: 0, lone: 0, rates: [], spacedHyphens: 0, hyphenPages: 0, worst: [] });
    const b = by.get(p.locale);
    b.pages++;
    const hits = matchBank(p, bank).filter((h) => h.id === 'EFR-F-001');
    const paired = hits.filter(P.isPairedEmDash).length;
    b.emDashes += hits.length; b.paired += paired; b.lone += hits.length - paired;
    if (hits.length) b.withEmDash++;
    const n = words(editorialText(p)).length;
    if (n >= 120) b.rates.push((1000 * hits.length) / n);
    let hy = 0;
    for (const slot of ['prose', 'faqAnswers', 'faqQuestions', 'cta', 'headings']) for (const t of p.slots[slot] || []) hy += (t.match(HYPHEN) || []).length;
    b.spacedHyphens += hy; if (hy) b.hyphenPages++;
    b.worst.push({ rel: p.rel, lone: hits.length - paired, total: hits.length, words: n });
  }
  const rows = [...by.values()].map((b) => {
    const pol = P.policyFor(b.locale, ledger);
    return {
      ...b,
      policy: pol.policy, missing: pol.missing, nativeMark: pol.nativeMark, nextReview: pol.nextReview || null,
      reviewDue: !!(pol.nextReview && today >= pol.nextReview),
      medianPer1k: median(b.rates),
      sharePct: b.pages ? Math.round((100 * b.withEmDash) / b.pages) : 0,
      worst: b.worst.sort((x, y) => y.lone - x.lone).slice(0, TOP)
    };
  }).sort((a, b) => a.locale.localeCompare(b.locale));
  return { rows, ledger, today, totalPages: pages.length };
}

function printReport(d) {
  const { rows, ledger, today } = d;
  console.log(`Em dash policy audit (informational) — ${today}`);
  console.log(`  ledger: ${path.relative(process.cwd(), P.POLICY_PATH)}${ledger.errors.length ? `  ✗ ${ledger.errors.length} error(s)` : '  ✓ valid'}${ledger.missing.length ? `  · missing locales: ${ledger.missing.join(', ')}` : ''}`);
  for (const e of ledger.errors) console.log(`    · ${e}`);
  console.log('');
  console.log('  locale  policy       pages  em dashes  median/1k  pages≥1  paired(——)  lone  spaced-hyphen  next review');
  for (const r of rows) {
    console.log(`  ${r.locale.padEnd(7)} ${(r.policy + (r.missing ? '?' : '')).padEnd(12)} ${String(r.pages).padStart(5)}  ${String(r.emDashes).padStart(9)}  ${String(r.medianPer1k ?? 'n/a').padStart(9)}  ${String(r.sharePct + '%').padStart(7)}  ${String(r.paired).padStart(10)}  ${String(r.lone).padStart(4)}  ${String(r.spacedHyphens).padStart(13)}  ${r.nextReview || '—'}${r.reviewDue ? '  ← due' : ''}`);
  }
  console.log('');
  console.log('  Reading the table: a native or review locale at 100% of pages with rates near English is carrying');
  console.log('  translated English punctuation, not its own; a double-dash locale is healthy when paired >> lone.');
  const dd = rows.filter((r) => r.policy === 'double-dash' || r.policy === 'review');
  for (const r of dd) {
    const top = r.worst.filter((w) => w.lone > 0).slice(0, 5);
    if (!top.length) continue;
    console.log(`\n  ${r.locale} (${r.policy}) — pages with the most lone em dashes, the first to read with a native reader:`);
    for (const w of top) console.log(`    ${String(w.lone).padStart(4)} lone / ${String(w.total).padStart(4)} total in ${String(w.words).padStart(5)} words  ${w.rel}`);
  }
}

function buildMarkdown(d) {
  const { rows, ledger, today } = d;
  let md = `# Em dash policy — locale audit\n\nGenerated ${today} by \`npm run audit:em-dash\`. **Informational.** Policy of record: \`data/em_dash_locale_policy.json\` (\`docs/em-dash-policy.md\` §4). Enforcement: \`npm run check:editorial-footprint\`.\n\n`;
  if (ledger.errors.length) md += `**Ledger errors:** ${ledger.errors.join('; ')}\n\n`;
  md += `| locale | policy | pages | em dashes | median per 1,000 words | pages with ≥1 | paired (——) | lone | spaced hyphens (prose) | next review |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---|\n`;
  for (const r of rows) md += `| ${r.locale} | ${r.policy}${r.missing ? ' (no ledger entry)' : ''} | ${r.pages} | ${r.emDashes} | ${r.medianPer1k ?? 'n/a'} | ${r.sharePct}% | ${r.paired} | ${r.lone} | ${r.spacedHyphens} | ${r.nextReview || '—'}${r.reviewDue ? ' (due)' : ''} |\n`;
  md += `\n`;
  for (const r of rows.filter((x) => x.policy === 'double-dash' || x.policy === 'review')) {
    const top = r.worst.filter((w) => w.lone > 0).slice(0, TOP);
    if (!top.length) continue;
    md += `### ${r.locale} (${r.policy}) — most lone em dashes\n\n| lone | total | words | page |\n|---:|---:|---:|---|\n`;
    for (const w of top) md += `| ${w.lone} | ${w.total} | ${w.words} | \`${w.rel}\` |\n`;
    md += `\n`;
  }
  return md;
}

function main() {
  const d = measure();
  printReport(d);
  if (flag('--report')) { fs.writeFileSync(flag('--report'), buildMarkdown(d)); console.log(`\nWrote report: ${flag('--report')}`); }
  if (flag('--json')) { fs.writeFileSync(flag('--json'), JSON.stringify(d, null, 2)); console.log(`Wrote JSON: ${flag('--json')}`); }
  process.exit(0);   // informational: never fails the build
}

if (require.main === module) main();
module.exports = { measure, buildMarkdown };
