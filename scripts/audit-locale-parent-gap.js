#!/usr/bin/env node
'use strict';

/**
 * audit-locale-parent-gap.js
 *
 * Whole-site, point-in-time discovery pass: the systematic version of the FR
 * `/symbol/` blind spot (EN had 77 symbol pages, FR had 6; substantial
 * directly-evidenced French demand sat undetected until a manual keyword
 * pull found it — see data/locale_parent_gap_audit.json for that entry).
 *
 * For every Core-tier pattern in data/core_parent_set.json x every qualified
 * locale in data/locale_qualification_tiers.json (Tier 1, or Tier 2 and not
 * on hold), this counts:
 *   - how many EN-canonical pages match that pattern (classified via
 *     scripts/lib/locale-parent-registry.js's classifyParent(), so a page is
 *     only ever counted under its single most-specific matching pattern)
 *   - how many of those already have a live translation into that locale
 *     (via scripts/lib/translation-clusters.js's discoverClusters())
 *   - whether data/locale_parent_gap_audit.json already has a recorded entry
 *     for that (pattern, locale) cell
 *
 * A cell is flagged an "unaudited gap" when existing translation coverage is
 * near-zero AND no ledger entry exists — i.e. nobody has checked, or built,
 * yet. This is a discovery tool for triage, like audit-translation-parity.js,
 * NOT a blocking check — see scripts/check-locale-parent-gap.js for the
 * enforcing per-PR gate.
 *
 * Usage:
 *   node scripts/audit-locale-parent-gap.js                 # ranked gap list
 *   node scripts/audit-locale-parent-gap.js --full           # every cell, not just gaps
 *   node scripts/audit-locale-parent-gap.js --json out.json
 *   node scripts/audit-locale-parent-gap.js --report out.md
 */

const fs = require('fs');
const path = require('path');
const { discoverClusters } = require('./lib/translation-clusters');
const { classifyParent, classifyLocale, LOCALES, NON_LATIN_LOCALES } = require('./lib/locale-parent-registry');

const ROOT = path.resolve(__dirname, '..');
const GAP_LEDGER_PATH = path.join(ROOT, 'data', 'locale_parent_gap_audit.json');

const args = process.argv.slice(2);
const showFull = args.includes('--full');
const reportIdx = args.indexOf('--report');
const jsonIdx = args.indexOf('--json');
const reportPath = reportIdx !== -1 ? args[reportIdx + 1] : null;
const jsonPath = jsonIdx !== -1 ? args[jsonIdx + 1] : null;

// ─── Load the ledger ────────────────────────────────────────────────────

let ledgerEntries = [];
if (fs.existsSync(GAP_LEDGER_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(GAP_LEDGER_PATH, 'utf8'));
    ledgerEntries = Array.isArray(parsed) ? parsed : parsed.entries || [];
  } catch (e) {
    console.error(`WARNING: could not parse ${path.relative(ROOT, GAP_LEDGER_PATH)}: ${e.message}`);
  }
}
function findLedgerEntry(pattern, locale) {
  return ledgerEntries.find((e) => e.pattern === pattern && e.locale === locale) || null;
}

// ─── Discover every page + its hreflang cluster ────────────────────────

const { byUrl, clusters } = discoverClusters(ROOT);

// ─── Group EN pages by their single, most-specific Core-tier pattern ──────

const corePages = new Map(); // pattern -> { info, pages: [rec,...] }
for (const [, rec] of byUrl) {
  if (rec.ownLang !== 'en') continue;
  const info = classifyParent(rec.rel);
  if (info.tier !== 'core') continue;
  if (!corePages.has(info.pattern)) corePages.set(info.pattern, { info, pages: [] });
  corePages.get(info.pattern).pages.push(rec);
}

// ─── Qualified locales: Tier 1, or Tier 2 and not on hold ──────────────────

const qualifiedLocales = LOCALES.filter((code) => {
  const l = classifyLocale(code);
  return l.tier === 1 || (l.tier === 2 && !l.hold);
});

// ─── Build the (pattern, locale) cell matrix ───────────────────────────

const cells = [];
for (const [pattern, { info, pages }] of corePages) {
  for (const locale of qualifiedLocales) {
    // Script-compatibility overlay: not a gap, just not applicable.
    if (info.scriptIndependent === false && NON_LATIN_LOCALES.has(locale)) continue;

    let translated = 0;
    for (const rec of pages) {
      const members = clusters.get(rec.canonical);
      if (!members) continue;
      const hasLocale = [...members].some((m) => {
        if (m === rec.canonical) return false;
        const r = byUrl.get(m);
        return r && r.ownLang === locale;
      });
      if (hasLocale) translated++;
    }

    const total = pages.length;
    const missing = total - translated;
    const ledgerEntry = findLedgerEntry(pattern, locale);
    const coverageRatio = total > 0 ? translated / total : 0;
    const nearZero = translated === 0 || coverageRatio < 0.1;
    const unauditedGap = nearZero && !ledgerEntry;

    cells.push({
      pattern,
      locale,
      scriptIndependent: info.scriptIndependent,
      total,
      translated,
      missing,
      coverageRatio,
      ledgerEntry,
      unauditedGap,
    });
  }
}

// Rank: script-independent blind spots first (per the doc — that's exactly
// where the FR /symbol/ gold sat), then by missing-page count descending.
cells.sort((a, b) => {
  if (a.scriptIndependent !== b.scriptIndependent) return a.scriptIndependent ? -1 : 1;
  return b.missing - a.missing;
});

// ─── Report ─────────────────────────────────────────────────────────────

const lines = [];
const log = (s = '') => {
  lines.push(s);
  console.log(s);
};

const gaps = cells.filter((c) => c.unauditedGap);
const audited = cells.filter((c) => !c.unauditedGap);

log('Locale Parent Gap Audit');
log(`  Core-tier patterns with >=1 EN page: ${corePages.size}`);
log(`  qualified locales checked:           ${qualifiedLocales.length} (${qualifiedLocales.join(', ')})`);
log(`  (pattern, locale) cells evaluated:   ${cells.length}`);
log(`  unaudited gaps (near-zero coverage, no ledger entry): ${gaps.length}`);
log(`  cells with existing coverage or a recorded ledger entry: ${audited.length}`);
log('');

function printCell(c) {
  const pct = c.total > 0 ? `${Math.round(c.coverageRatio * 100)}%` : 'n/a';
  log(
    `${c.unauditedGap ? '✗' : '✓'} [${c.locale}] ${c.pattern}  ${c.translated}/${c.total} translated (${pct})` +
      `  scriptIndependent=${c.scriptIndependent}`
  );
  if (c.ledgerEntry) {
    log(`    ledger: verdict=${c.ledgerEntry.verdict} checked=${c.ledgerEntry.checkedDate} — ${c.ledgerEntry.evidence}`);
  } else if (c.unauditedGap) {
    log('    no data/locale_parent_gap_audit.json entry — nobody has checked competitor footprint or keyword volume here yet.');
  }
  log('');
}

log('── Unaudited gaps (ranked: script-independent blind spots first, then missing-page count) ──');
log('');
for (const c of gaps) printCell(c);

if (showFull) {
  log('── Every other evaluated cell (already covered or already ledgered) ──');
  log('');
  for (const c of audited) printCell(c);
} else {
  log(`(${audited.length} covered/ledgered cells omitted — pass --full to print every cell, or --json <path> for raw data.)`);
  log('');
}

if (reportPath) {
  const md = [
    '# Locale Parent Gap Audit',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)}. Run \`node scripts/audit-locale-parent-gap.js\` to regenerate.`,
    '',
    '```',
    ...lines,
    '```',
  ].join('\n');
  fs.writeFileSync(path.resolve(ROOT, reportPath), md, 'utf8');
  console.log(`\nMarkdown report written to ${reportPath}`);
}

if (jsonPath) {
  fs.writeFileSync(path.resolve(ROOT, jsonPath), JSON.stringify(cells, null, 2), 'utf8');
  console.log(`JSON written to ${jsonPath}`);
}

// Informational by default — see check-locale-parent-gap.js for the
// enforcing per-PR gate.
process.exit(0);
