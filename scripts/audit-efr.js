#!/usr/bin/env node
'use strict';

/**
 * audit-efr.js — the EFR Quality Gate, whole site.
 *
 * Scores every /updates/ and /guide/ page (all locales) with the existing
 * Editorial Footprint Risk model, applies the section thresholds from
 * scripts/lib/efr-gate.js, and prints the summary the gate is measured
 * against: pages checked, PASS / REVIEW / FAIL, mean, median and p90 per
 * section, movement since the committed baseline, and the highest-scoring
 * pages in each section as the editorial backlog.
 *
 * INFORMATIONAL, never gating — the same standing/diff split as every other
 * whole-site audit here (audit-editorial-footprint.js, audit-faq-schema.js,
 * audit-locale-parent-gap.js). The site carries pages above target today and
 * this report is where that backlog is visible; scripts/check-efr.js is the
 * diff-scoped half that gates what a branch does to a page.
 *
 * Usage:
 *   node scripts/audit-efr.js                       # console summary
 *   node scripts/audit-efr.js --full                # every page, both sections
 *   node scripts/audit-efr.js --report docs/efr-quality-report.md
 *   node scripts/audit-efr.js --json out.json
 *   node scripts/audit-efr.js --top 20
 *
 * Absolute thresholds apply to English pages only. Locale /updates/ and /guide/
 * pages are scored and listed as UNCALIBRATED, ranked by their percentile
 * within their own locale, because raw EFR is not comparable across locales
 * (docs/editorial-footprint-risk.md).
 */

const fs = require('fs');
const path = require('path');
const { scorePage, buildContext } = require('./lib/editorial-footprint');
const { loadPages, attachRanks } = require('./audit-editorial-footprint');
const G = require('./lib/efr-gate');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const has = (f) => args.includes(f);
const TOP = +(flag('--top') || 20);

function fmt(n) { return n === null || n === undefined ? 'n/a' : String(n); }
function pct(n) { return n === null || n === undefined ? '—' : `p${n}`; }
function signed(d) { return d === null || d === undefined ? '' : (d > 0 ? `+${d}` : `${d}`); }

function buildRows() {
  const all = loadPages().filter((p) => p.indexable !== false && p.rel !== '_root.html');
  const ctx = buildContext(all);
  const results = all.map((p) => scorePage(p, ctx));
  attachRanks(results);
  const baseline = G.loadBaseline();
  const { exceptions, errors } = G.loadExceptions();
  const today = new Date().toISOString().slice(0, 10);

  const rows = [];
  for (const r of results) {
    const cls = G.classifyContent(r.rel);
    if (!cls.section) continue;
    const prev = baseline && baseline.pages[r.rel] ? baseline.pages[r.rel].score : null;
    const delta = prev !== null && prev !== undefined && r.score !== null ? +(r.score - prev).toFixed(1) : null;
    const exception = G.exceptionFor(cls.route, r.score, exceptions, today);
    rows.push({
      rel: r.rel, route: cls.route, cls,
      contentType: cls.contentType, section: cls.section, locale: cls.locale, hub: cls.hub, calibrated: cls.calibrated,
      score: r.score, status: G.statusLabel(cls, r.score),
      band: cls.calibrated && r.score !== null ? G.statusFor(cls.section, r.score).band : null,
      threshold: cls.thresholds ? cls.thresholds.pass : null,
      localePercentile: r.localePercentile, familyPercentile: r.familyPercentile,
      previous: prev, delta, wordCount: r.wordCount,
      contributors: G.contributors(r),
      exception: exception ? { state: exception.state, ...exception.entry } : null,
      prevStatus: cls.calibrated && prev !== null && prev !== undefined ? G.statusFor(cls.section, prev).status : null
    });
  }
  return { rows, baseline, exceptionErrors: errors, exceptions, scoredTotal: results.filter((r) => r.score !== null).length };
}

function sectionSummary(rows, section) {
  const en = rows.filter((r) => r.section === section && r.calibrated && r.score !== null);
  const s = G.summarize(en);
  const moved = en.filter((r) => r.delta !== null);
  const changes = {
    compared: moved.length,
    regressions: moved.filter((r) => r.delta >= G.MATERIAL_DELTA).length,
    improvements: moved.filter((r) => r.delta <= -G.MATERIAL_DELTA).length,
    newFailures: moved.filter((r) => r.prevStatus === 'PASS' && r.status !== 'PASS').length,
    resolvedFailures: moved.filter((r) => r.prevStatus !== 'PASS' && r.status === 'PASS').length
  };
  const locale = rows.filter((r) => r.section === section && !r.calibrated && !r.hub && r.score !== null);
  // The summary and the backlog list show the English hub only; locale hubs
  // are listed under --full like every other locale row.
  const hubs = rows.filter((r) => r.section === section && r.hub && r.locale === 'en');
  const notScored = rows.filter((r) => r.section === section && r.calibrated && r.score === null);
  return { section, label: G.THRESHOLDS[section].label, thresholds: G.THRESHOLDS[section], en: s, changes, locale: G.stats(locale.map((r) => r.score)), localeCount: locale.length, hubs, notScored, rows: en };
}

function printSummary(d) {
  const { rows, baseline, scoredTotal } = d;
  console.log('EFR QUALITY GATE — whole-site report (informational)');
  console.log(`  pages scored site-wide: ${scoredTotal}   baseline: ${baseline ? `${baseline.date || 'undated'} (${Object.keys(baseline.pages).length} pages)` : 'none'}`);
  console.log('  EFR is a diagnostic and publishing quality-control metric, not an SEO ranking factor, and not an AI detector.');
  console.log('');
  for (const section of ['updates', 'guide']) {
    const S = sectionSummary(rows, section);
    console.log(`${S.label}  (English, calibrated; PASS <= ${S.thresholds.pass}, REVIEW <= ${S.thresholds.review}, FAIL > ${S.thresholds.review})`);
    console.log(`  Pages checked: ${S.en.pages}${S.notScored.length ? `   (+${S.notScored.length} below the 120-word prose floor, not scored)` : ''}${S.hubs.length ? `   (+${S.hubs.length} hub index, unclassified)` : ''}`);
    console.log(`  Pass:          ${S.en.PASS}`);
    console.log(`  Review:        ${S.en.REVIEW}`);
    console.log(`  Fail:          ${S.en.FAIL}`);
    console.log(`  Mean EFR:      ${fmt(S.en.mean)}`);
    console.log(`  Median EFR:    ${fmt(S.en.median)}`);
    console.log(`  P90 EFR:       ${fmt(S.en.p90)}`);
    console.log(`  Locale pages:  ${S.localeCount} (uncalibrated; mean ${fmt(S.locale.mean)}, median ${fmt(S.locale.median)}, p90 ${fmt(S.locale.p90)} — raw scores are not comparable across locales)`);
    if (baseline) {
      console.log(`  Since baseline ${baseline.date || ''}: ${S.changes.compared} compared · regressions ${S.changes.regressions} · improvements ${S.changes.improvements} · new failures ${S.changes.newFailures} · resolved failures ${S.changes.resolvedFailures}`);
    }
    console.log('');
  }

  const active = rows.filter((r) => r.exception);
  if (active.length) {
    console.log('Exceptions on record (visible, never silent):');
    for (const r of active) console.log(`  ${r.exception.state.padEnd(8)} ${r.route}  EFR ${fmt(r.score)} (agreed at ${r.exception.efr} on ${r.exception.agreed} by ${r.exception.owner}${r.exception.reviewBy ? `, review by ${r.exception.reviewBy}` : ''})`);
    console.log('');
  }
  if (d.exceptionErrors.length) {
    console.log('✗ data/efr_exceptions.json is malformed (refused by the gate):');
    for (const e of d.exceptionErrors) console.log(`    · ${e}`);
    console.log('');
  }

  for (const section of ['updates', 'guide']) {
    const S = sectionSummary(rows, section);
    const top = S.rows.slice().sort((a, b) => b.score - a.score).slice(0, TOP);
    console.log(`Top ${Math.min(TOP, top.length)} ${S.label} by EFR (English) — the editorial backlog`);
    console.log('  EFR    status   prev    Δ      pct    route');
    for (const r of top) {
      console.log(`  ${String(r.score).padStart(5)}  ${r.status.padEnd(7)}  ${fmt(r.previous).padStart(5)}  ${signed(r.delta).padStart(5)}  p${String(r.localePercentile).padEnd(5)} ${r.route}${r.exception ? `  [exception: ${r.exception.state}]` : ''}`);
      console.log(`         ${r.contributors}`);
    }
    for (const h of S.hubs) console.log(`  ${fmt(h.score).padStart(5)}  ${'UNCLASS'.padEnd(7)}  ${fmt(h.previous).padStart(5)}  ${signed(h.delta).padStart(5)}  ${pct(h.localePercentile).padEnd(6)} ${h.route}  (hub index — no threshold${h.score === null ? '; below the 120-word prose floor, not scored' : ''})`);
    console.log('');
  }

  if (has('--full')) {
    console.log('All updates/guide pages, every locale (UNCALIBRATED rows ranked within their own locale):');
    const sorted = rows.slice().sort((a, b) => (a.locale === 'en' ? -1 : 1) - (b.locale === 'en' ? -1 : 1) || a.locale.localeCompare(b.locale) || (b.localePercentile || 0) - (a.localePercentile || 0));
    for (const r of sorted) {
      console.log(`  ${fmt(r.score).padStart(5)}  ${r.status.padEnd(12)}  p${String(r.localePercentile ?? '').padEnd(5)} ${r.locale.padEnd(6)} ${r.route}`);
    }
    console.log('');
  }
}

function buildReport(d) {
  const { rows, baseline } = d;
  const today = new Date().toISOString().slice(0, 10);
  let md = `# EFR Quality Gate — whole-site report\n\n`;
  md += `Generated ${today} by \`npm run report:efr\` (\`scripts/audit-efr.js\`). **Informational** — this report never fails a build; \`npm run check:efr\` is the per-PR gate.\n\n`;
  md += `EFR is the Editorial Footprint Risk score from \`scripts/lib/editorial-footprint.js\` (0–100, higher = reads more like a filled-in template). **It is a diagnostic and publishing quality-control metric, not an SEO ranking factor, and not an AI detector.** Thresholds, ratchet rules and the editor playbook: \`docs/efr-quality-gate.md\`.\n\n`;
  md += `Baseline for the "previous" column: \`data/editorial_footprint_baseline.json\`${baseline && baseline.date ? ` (committed ${baseline.date})` : ''}.\n\n`;

  for (const section of ['updates', 'guide']) {
    const S = sectionSummary(rows, section);
    md += `## ${S.label}\n\n`;
    md += `English pages, calibrated. PASS ≤ ${S.thresholds.pass} · REVIEW ≤ ${S.thresholds.review} · FAIL > ${S.thresholds.review}.\n\n`;
    md += `| | |\n|---|---:|\n`;
    md += `| Pages checked | ${S.en.pages} |\n| Pass | ${S.en.PASS} |\n| Review | ${S.en.REVIEW} |\n| Fail | ${S.en.FAIL} |\n`;
    md += `| Mean EFR | ${fmt(S.en.mean)} |\n| Median EFR | ${fmt(S.en.median)} |\n| P90 EFR | ${fmt(S.en.p90)} |\n`;
    md += `| Locale pages (uncalibrated) | ${S.localeCount} |\n`;
    if (S.notScored.length) md += `| Not scored (below 120-word floor) | ${S.notScored.length} |\n`;
    if (S.hubs.length) md += `| Hub index (unclassified) | ${S.hubs.length} |\n`;
    md += `\n`;
    if (baseline) {
      md += `**Since baseline${baseline.date ? ` (${baseline.date})` : ''}:** ${S.changes.compared} pages compared · regressions ${S.changes.regressions} · improvements ${S.changes.improvements} · new failures ${S.changes.newFailures} · resolved failures ${S.changes.resolvedFailures}. A regression or improvement is a move of ${G.MATERIAL_DELTA} or more.\n\n`;
    }
    md += `### Top ${Math.min(TOP, S.rows.length)} ${S.label} by EFR — editorial backlog\n\n`;
    md += `| EFR | status | band | previous | Δ | pct (${'en'}) | route | major contributors |\n|---:|---|---|---:|---:|---:|---|---|\n`;
    for (const r of S.rows.slice().sort((a, b) => b.score - a.score).slice(0, TOP)) {
      md += `| ${r.score} | ${r.status}${r.exception ? ` (exception ${r.exception.state})` : ''} | ${r.band} | ${fmt(r.previous)} | ${signed(r.delta) || '0'} | p${r.localePercentile} | \`${r.route}\` | ${r.contributors} |\n`;
    }
    for (const h of S.hubs) md += `| ${fmt(h.score)} | UNCLASSIFIED | hub index — no threshold${h.score === null ? '; below the 120-word prose floor, not scored' : ''} | ${fmt(h.previous)} | ${h.delta === null ? '—' : signed(h.delta) || '0'} | ${pct(h.localePercentile)} | \`${h.route}\` | ${h.contributors || '—'} |\n`;
    md += `\n`;
    const loc = rows.filter((r) => r.section === section && !r.calibrated && !r.hub && r.score !== null)
      .sort((a, b) => a.locale.localeCompare(b.locale) || (b.localePercentile || 0) - (a.localePercentile || 0));
    if (loc.length) {
      md += `### Locale ${S.label.toLowerCase()} — UNCALIBRATED\n\nScored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see \`docs/editorial-footprint-risk.md\`). Ranked by percentile **within each page's own locale**.\n\n`;
      md += `| locale | pct within locale | EFR | previous | Δ | route |\n|---|---:|---:|---:|---:|---|\n`;
      for (const r of loc) md += `| ${r.locale} | p${r.localePercentile} | ${r.score} | ${fmt(r.previous)} | ${signed(r.delta) || '0'} | \`${r.route}\` |\n`;
      md += `\n`;
    }
  }

  const active = rows.filter((r) => r.exception);
  md += `## Exceptions\n\n`;
  if (!active.length) md += `None recorded in \`data/efr_exceptions.json\`.\n\n`;
  else {
    md += `| state | route | EFR now | agreed at | owner | agreed | review by | reason |\n|---|---|---:|---:|---|---|---|---|\n`;
    for (const r of active) md += `| ${r.exception.state} | \`${r.route}\` | ${fmt(r.score)} | ${r.exception.efr} | ${r.exception.owner} | ${r.exception.agreed} | ${r.exception.reviewBy || '—'} | ${r.exception.reason} |\n`;
    md += `\n`;
  }
  return md;
}

function main() {
  const d = buildRows();
  printSummary(d);
  if (flag('--report')) {
    fs.writeFileSync(flag('--report'), buildReport(d));
    console.log(`Wrote report: ${flag('--report')}`);
  }
  if (flag('--json')) {
    fs.writeFileSync(flag('--json'), JSON.stringify({
      generated: new Date().toISOString(),
      baseline: d.baseline ? { date: d.baseline.date, pages: Object.keys(d.baseline.pages).length } : null,
      sections: { updates: sectionSummary(d.rows, 'updates'), guide: sectionSummary(d.rows, 'guide') },
      rows: d.rows
    }, (k, v) => (k === 'cls' ? undefined : v), 2));
    console.log(`Wrote JSON: ${flag('--json')}`);
  }
  process.exit(0);   // informational: never fails the build
}

if (require.main === module) main();
module.exports = { buildRows, sectionSummary, buildReport };
