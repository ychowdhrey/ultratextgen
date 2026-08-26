#!/usr/bin/env node
'use strict';

/**
 * audit-editorial-footprint.js
 *
 * Whole-site Editorial Footprint Risk dashboard: scores every indexable page,
 * writes the audit ledger, and reports the cross-page similarity pairs and the
 * shared-template strings behind the biggest clusters.
 *
 * INFORMATIONAL, never gating - the same standing/diff split every other
 * system in this repository uses (check-image-assets.py, audit-locale-parent-gap.js,
 * sync_symbol_spoke_links.py --check). The site carries a real editorial
 * backlog: 52,766 em dashes across 98.9% of pages, and 46.6% of English pages
 * carrying one shared CTA card. A gate red on all of that regardless of what a
 * PR touches is a gate people learn to ignore.
 * scripts/check-editorial-footprint.js is the diff-scoped half that actually
 * gates, on what a branch INTRODUCES.
 *
 * Usage:
 *   node scripts/audit-editorial-footprint.js
 *   node scripts/audit-editorial-footprint.js --locale es
 *   node scripts/audit-editorial-footprint.js --ledger data/editorial_footprint_ledger.csv
 *   node scripts/audit-editorial-footprint.js --report docs/x.md --json out.json
 *   node scripts/audit-editorial-footprint.js --baseline data/editorial_footprint_baseline.json
 *   node scripts/audit-editorial-footprint.js --full        # per-page listing
 *
 * Ranking sensitivity: pages are classified `unknown` unless a performance
 * overlay is supplied with --sensitivity <file>. That file is never generated
 * here and never committed here - see docs/editorial-footprint-risk.md,
 * "Ranking sensitivity", for why performance data stays out of this repository
 * and how the overlay is supplied. `unknown` is treated conservatively, and
 * never as "this page is worthless".
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { extractPage } = require('./lib/editorial-corpus');
const {
  scorePage, buildContext, percentiles, loadBank, WEIGHTS, MIN_LOCALE_PAGES
} = require('./lib/editorial-footprint');

const ROOT = path.resolve(__dirname, '..');
const IGNORE = [
  'node_modules/**', 'assets/**', 'scripts/**', 'docs/**', 'js/**',
  'functions/**', '.github/**', 'data/**', 'reports/**', 'locales/**'
];

const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const has = (f) => args.includes(f);

function loadPages(cacheFile) {
  if (cacheFile && fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  }
  const files = globSync('**/*.html', { cwd: ROOT, ignore: IGNORE }).sort();
  const out = [];
  for (const rel of files) {
    let pg;
    try { pg = extractPage(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel); } catch { continue; }
    if (pg) out.push(pg);
  }
  return out;
}


/**
 * Percentile rank within the page's own locale, and within its locale+family.
 *
 * This is what makes "comparative, not absolute" operational rather than
 * aspirational. Raw scores are NOT comparable across locales, for a structural
 * reason: a locale page has no English phrase rules, so those dimensions are
 * excluded from its denominator - and since they score ~0 for everybody, the
 * exclusion raises the locale page's normalised score. Measured, that put
 * `fr/library/emojis-argent` at 41.1 and its English parent
 * `library/money-emojis` at 20.1 on identical inputs (0 facts, ~10 em dashes,
 * ~330 words). Neither number is wrong; comparing them is.
 *
 * So every consumer of this ledger ranks and thresholds on `localePercentile`,
 * and the raw score is kept only as the explainable breakdown behind it. A
 * report sorted by raw score invites exactly the comparison the model forbids.
 */
function attachRanks(results) {
  const groups = new Map();
  for (const r of results) {
    if (r.score === null) continue;
    for (const key of [`L:${r.locale}`, `F:${r.locale}|${r.family}`]) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r.score);
    }
  }
  for (const v of groups.values()) v.sort((a, b) => a - b);
  const rank = (arr, x) => {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return arr.length ? +(100 * lo / arr.length).toFixed(1) : null;
  };
  for (const r of results) {
    if (r.score === null) { r.localePercentile = null; r.familyPercentile = null; continue; }
    r.localePercentile = rank(groups.get(`L:${r.locale}`), r.score);
    const fam = groups.get(`F:${r.locale}|${r.family}`);
    r.familyPercentile = fam && fam.length >= 8 ? rank(fam, r.score) : null;
  }
}

/**
 * Ranking sensitivity. Four classes, and the default matters:
 *
 *   protected - meaningful ranking or traffic. Recommendations may be
 *               generated; broad automatic rewriting is prohibited. Google's
 *               own guidance is to avoid changing content that already
 *               performs well.
 *   observed  - some performance evidence. Conservative changes only.
 *   unknown   - no reliable performance data. NOT "worthless" - act
 *               conservatively and say so.
 *   candidate - clear editorial risk AND evidence that improvement is
 *               justified.
 *
 * Performance data is never fabricated. With no overlay every page is
 * `unknown`, which is the honest answer and the conservative one.
 */
function loadSensitivity(file) {
  if (!file) return null;
  if (!fs.existsSync(file)) {
    console.error(`Sensitivity overlay not found: ${file} - every page will be classified 'unknown'.`);
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(Object.entries(raw.pages || raw));
}

function classify(rel, sens, score) {
  if (!sens) return { sensitivity: 'unknown', evidence: 'no performance overlay supplied' };
  const e = sens.get(rel) || sens.get(`/${rel.replace(/index\.html$/, '')}`);
  if (!e) return { sensitivity: 'unknown', evidence: 'not present in overlay' };
  if ((e.clicks || 0) >= 10 || (e.impressions || 0) >= 1000) {
    return { sensitivity: 'protected', evidence: `${e.clicks || 0} clicks / ${e.impressions || 0} impressions` };
  }
  if ((e.impressions || 0) >= 25) {
    return { sensitivity: 'observed', evidence: `${e.clicks || 0} clicks / ${e.impressions || 0} impressions` };
  }
  if (score !== null && score >= 45) {
    return { sensitivity: 'candidate', evidence: `${e.impressions || 0} impressions and elevated editorial risk` };
  }
  return { sensitivity: 'unknown', evidence: `${e.impressions || 0} impressions - below the observed floor` };
}

/**
 * Recommended action. Deliberately routes to the CHEAPEST correct owner: a
 * pattern shared by many same-shaped siblings is a template problem, and
 * telling 220 pages to each hand-edit one shared string is the failure mode
 * this whole distinction exists to prevent.
 */
function recommend(r, sens) {
  if (r.status === 'insufficient-prose') return { action: 'no action', confidence: 'high', reason: 'below the prose floor; rates are not meaningful' };
  if (r.counts.forbidden && r.counts.emdash === 0 && r.counts.ellipsis === 0) {
    return { action: 'editorial review', confidence: 'high', reason: 'forbidden pattern other than punctuation' };
  }
  if (r.structureSharedWith >= 10 && r.score >= 30) {
    return { action: 'fix shared template', confidence: 'high', reason: `${r.structureSharedWith} same-locale siblings share this page shape` };
  }
  if (r.nearest && r.nearest.jaccard >= 0.8) {
    return { action: 'possible consolidation review', confidence: 'medium', reason: `nearest same-locale page at Jaccard ${r.nearest.jaccard}` };
  }
  if (sens === 'protected') {
    return { action: 'monitor', confidence: 'high', reason: 'ranks or draws traffic; broad rewriting prohibited' };
  }
  // Thresholds are percentile ranks WITHIN the page's own locale, never raw
  // scores - see attachRanks() for why a raw cross-locale comparison is invalid.
  const pct = r.localePercentile;
  if (pct === null) return { action: 'monitor', confidence: 'low', reason: 'not rankable within its locale' };
  if (pct >= 99) return { action: 'deeper content improvement', confidence: 'medium', reason: `top 1% of its own locale (p${pct})` };
  if (pct >= 95) return { action: 'conservative page edit', confidence: 'medium', reason: `top 5% of its own locale (p${pct})` };
  if (pct >= 90) return { action: 'editorial review', confidence: 'low', reason: `top 10% of its own locale (p${pct})` };
  if (pct >= 75) return { action: 'monitor', confidence: 'low', reason: `upper quartile of its own locale (p${pct})` };
  return { action: 'no action', confidence: 'medium', reason: 'below its locale attention band' };
}

function main() {
  const cache = flag('--cache');
  const onlyLocale = flag('--locale');
  const ledgerOut = flag('--ledger');
  const reportOut = flag('--report');
  const jsonOut = flag('--json');
  const baselineOut = flag('--baseline');
  const sens = loadSensitivity(flag('--sensitivity'));

  const all = loadPages(cache);
  // `_root.html` is `cp index.html _root.html` — literally the build step. It
  // canonicalises to the homepage and is not in sitemap.xml, so it is a build
  // artifact, not a page. Left in, it is the site's only Jaccard-1.0 pair and
  // sits permanently at the top of the similarity table as a known non-defect.
  const pages = all.filter((p) => p.indexable !== false && p.rel !== '_root.html');
  const skipped = all.length - pages.length;

  const ctx = buildContext(pages);
  const results = [];
  for (const p of pages) {
    if (onlyLocale && p.locale !== onlyLocale) continue;
    results.push(scorePage(p, ctx));
  }
  attachRanks(results);

  const scored = results.filter((r) => r.score !== null);
  const scores = scored.map((r) => r.score);

  // Percentiles are computed PER LOCALE and PER FAMILY, never globally, because
  // the model is comparative. A global threshold would rank every Thai page
  // against English norms, which is the bias the research memo forbids.
  const byLocale = new Map();
  const byFamily = new Map();
  for (const r of scored) {
    if (!byLocale.has(r.locale)) byLocale.set(r.locale, []);
    byLocale.get(r.locale).push(r.score);
    const fk = `${r.locale}|${r.family}`;
    if (!byFamily.has(fk)) byFamily.set(fk, []);
    byFamily.get(fk).push(r.score);
  }

  const localeStats = {};
  for (const [loc, v] of byLocale) {
    localeStats[loc] = Object.assign({ pages: v.length, mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1), minedPhraseRules: v.length >= MIN_LOCALE_PAGES }, percentiles(v));
  }
  const familyStats = {};
  for (const [fk, v] of byFamily) {
    if (v.length < 5) continue;
    familyStats[fk] = Object.assign({ pages: v.length, mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) }, percentiles(v));
  }

  // ── console ──────────────────────────────────────────────────────────────
  console.log('Editorial Footprint Risk - whole-site audit (informational)');
  console.log(`  pages parsed:        ${all.length}`);
  console.log(`  noindex (skipped):   ${skipped}`);
  console.log(`  scored:              ${scored.length}`);
  console.log(`  insufficient prose:  ${results.length - scored.length}`);
  console.log(`  similarity pairs >= 0.50 (within locale): ${ctx.pairs.length}`);
  console.log('');
  const P = percentiles(scores);
  console.log(`  site score distribution: p10 ${P.p10} | p25 ${P.p25} | p50 ${P.p50} | p75 ${P.p75} | p90 ${P.p90} | p95 ${P.p95} | p99 ${P.p99}`);
  console.log('');

  const dimTotals = {};
  for (const k of Object.keys(WEIGHTS)) {
    dimTotals[k] = +(scored.reduce((a, r) => a + r.dimensions[k], 0) / scored.length).toFixed(2);
  }
  console.log('  mean contribution by dimension (of its weight):');
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const share = ((dimTotals[k] / w) * 100).toFixed(0);
    console.log(`    ${k.padEnd(24)} ${String(dimTotals[k]).padStart(6)} / ${String(w).padStart(2)}   ${String(share).padStart(3)}% of ceiling`);
  }
  console.log('');
  console.log('  by locale (p50 / p90 / pages):');
  for (const [loc, s] of Object.entries(localeStats).sort((a, b) => b[1].p50 - a[1].p50)) {
    console.log(`    ${loc.padEnd(6)} ${String(s.p50).padStart(5)} ${String(s.p90).padStart(6)} ${String(s.pages).padStart(6)}${s.minedPhraseRules ? '' : '   (below mining floor: structural dimensions only)'}`);
  }
  console.log('');
  console.log('  by family, EN (p50 / p90 / pages):');
  for (const [fk, s] of Object.entries(familyStats).filter(([k]) => k.startsWith('en|')).sort((a, b) => b[1].p50 - a[1].p50)) {
    console.log(`    ${fk.slice(3).padEnd(12)} ${String(s.p50).padStart(5)} ${String(s.p90).padStart(6)} ${String(s.pages).padStart(6)}`);
  }

  // ── ledger ───────────────────────────────────────────────────────────────
  if (ledgerOut) {
    const cols = [
      'route', 'language', 'page_family', 'efr_score', 'locale_percentile', 'family_percentile', 'measured_weight', 'unmeasured_dimensions', 'status', 'word_count',
      ...Object.keys(WEIGHTS).map((k) => `dim_${k}`),
      'forbidden_count', 'discouraged_count', 'density_limited_count', 'search_protected_count',
      'emdash_count', 'negative_parallelism', 'triads', 'rhetorical_questions',
      'distinct_specific_facts', 'sentences',
      'closest_page', 'closest_jaccard', 'structure_shared_with',
      'top_recurring_patterns', 'ranking_sensitivity', 'sensitivity_evidence',
      'likely_upstream_source', 'recommended_action', 'confidence'
    ];
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [cols.join(',')];
    for (const r of results) {
      const cls = classify(r.rel, sens, r.score);
      const rec = recommend(r, cls.sensitivity);
      const top = {};
      for (const h of r.hits) top[h.id] = (top[h.id] || 0) + 1;
      const topStr = Object.entries(top).filter(([id]) => !id.startsWith('EFR-S-'))
        .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => `${id}x${n}`).join(' ');
      const upstream = r.structureSharedWith >= 10
        ? `template shared with ${r.structureSharedWith} same-locale ${r.family} pages`
        : (r.nearest && r.nearest.jaccard >= 0.7 ? `near-duplicate of ${r.nearest.peer}` : '');
      rows.push([
        `/${r.rel.replace(/index\.html$/, '')}`, r.locale, r.family, r.score ?? '', r.localePercentile ?? '', r.familyPercentile ?? '', r.measuredWeight ?? '', (r.unmeasuredDimensions || []).join(' '), r.status, r.wordCount,
        ...Object.keys(WEIGHTS).map((k) => (r.dimensions ? (r.dimensions[k] === null ? 'n/a' : r.dimensions[k]) : '')),
        r.counts.forbidden, r.counts.stronglyDiscouraged, r.counts.densityLimited, r.counts.searchProtected,
        r.counts.emdash ?? '', r.counts.negativeParallelism ?? '', r.counts.triads ?? '',
        r.counts.rhetoricalQuestions ?? '', r.counts.distinctSpecificFacts ?? '', r.counts.sentences ?? '',
        r.nearest ? r.nearest.peer : '', r.nearest ? r.nearest.jaccard : '', r.structureSharedWith,
        topStr, cls.sensitivity, cls.evidence, upstream, rec.action, rec.confidence
      ].map(esc).join(','));
    }
    fs.writeFileSync(ledgerOut, `${rows.join('\n')}\n`);
    console.log(`\nWrote ledger: ${ledgerOut} (${results.length} rows)`);
  }

  // ── baseline ─────────────────────────────────────────────────────────────
  if (baselineOut) {
    const b = { generated: 'audit-editorial-footprint.js', bankVersion: loadBank().version, pages: {} };
    for (const r of results) {
      b.pages[r.rel] = {
        score: r.score,
        forbidden: r.counts.forbidden,
        discouraged: r.counts.stronglyDiscouraged,
        densityLimited: r.counts.densityLimited,
        emdash: r.counts.emdash ?? 0,
        nearest: r.nearest ? r.nearest.jaccard : 0
      };
    }
    fs.writeFileSync(baselineOut, JSON.stringify(b, null, 0));
    console.log(`Wrote baseline: ${baselineOut} (${Object.keys(b.pages).length} pages)`);
  }

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({
      totals: { parsed: all.length, skipped, scored: scored.length },
      percentiles: P, dimensionMeans: dimTotals, localeStats, familyStats,
      pairs: ctx.pairs.slice(0, 500),
      results: results.map((r) => ({ ...r, hits: undefined }))
    }));
    console.log(`Wrote JSON: ${jsonOut}`);
  }

  if (reportOut) {
    fs.writeFileSync(reportOut, buildReport({ all, skipped, results, scored, P, dimTotals, localeStats, familyStats, ctx, sens }));
    console.log(`Wrote report: ${reportOut}`);
  }

  if (has('--full')) {
    console.log('\nTop 40 by within-locale percentile (raw scores are not comparable across locales):');
    for (const r of scored.slice().sort((a, b) => (b.localePercentile - a.localePercentile) || (b.score - a.score)).slice(0, 40)) {
      console.log(`  p${String(r.localePercentile).padStart(5)}  score ${String(r.score).padStart(5)}  ${r.locale.padEnd(6)} ${r.family.padEnd(11)} ${r.rel}`);
    }
  }

  process.exit(0);   // informational: never fails the build
}

function buildReport(d) {
  const { all, skipped, results, scored, P, dimTotals, localeStats, familyStats, ctx, sens } = d;
  let md = `# Editorial Footprint Risk - site-wide audit\n\n`;
  md += `Generated by \`npm run audit:editorial-footprint\`. **Informational.** This report never fails a build.\n\n`;
  md += `**This is not an AI detector.** It measures observable editorial characteristics of this site's own prose. No row here is evidence that any page was machine-written. See \`docs/editorial-footprint-research-2026-08-26.md\`.\n\n`;
  md += `| | |\n|---|---:|\n`;
  md += `| pages parsed | ${all.length} |\n| noindex (skipped) | ${skipped} |\n| scored | ${scored.length} |\n`;
  md += `| insufficient prose | ${results.length - scored.length} |\n`;
  md += `| within-locale similarity pairs >= 0.50 | ${ctx.pairs.length} |\n\n`;
  md += `## Score distribution\n\n| p10 | p25 | p50 | p75 | p90 | p95 | p99 |\n|---:|---:|---:|---:|---:|---:|---:|\n`;
  md += `| ${P.p10} | ${P.p25} | ${P.p50} | ${P.p75} | ${P.p90} | ${P.p95} | ${P.p99} |\n\n`;
  md += `## Mean contribution by dimension\n\n| dimension | mean | weight | % of ceiling |\n|---|---:|---:|---:|\n`;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    md += `| ${k} | ${dimTotals[k]} | ${w} | ${((dimTotals[k] / w) * 100).toFixed(0)}% |\n`;
  }
  md += `\n## By locale\n\nPercentiles are per-locale by design. A shared threshold would rank every locale against English norms.\n\n`;
  md += `| locale | pages | p50 | p90 | p99 | phrase rules |\n|---|---:|---:|---:|---:|---|\n`;
  for (const [loc, s] of Object.entries(localeStats).sort((a, b) => b[1].p50 - a[1].p50)) {
    md += `| ${loc} | ${s.pages} | ${s.p50} | ${s.p90} | ${s.p99} | ${s.minedPhraseRules ? 'mined' : 'structural only (below floor)'} |\n`;
  }
  md += `\n## By page family (EN)\n\n| family | pages | p50 | p90 | p99 |\n|---|---:|---:|---:|---:|\n`;
  for (const [fk, s] of Object.entries(familyStats).filter(([k]) => k.startsWith('en|')).sort((a, b) => b[1].p50 - a[1].p50)) {
    md += `| ${fk.slice(3)} | ${s.pages} | ${s.p50} | ${s.p90} | ${s.p99} |\n`;
  }
  md += `\n## Highest within-locale similarity pairs\n\nComparison is scoped **within a locale**: translations are supposed to say the same thing, and scoring them as duplicates would mark every correct translation on the site as a defect. \`_root.html\` is excluded as a build artifact (\`npm run build\` is \`cp index.html _root.html\`).\n\n| Jaccard | page A | page B |\n|---:|---|---|\n`;
  for (const p of ctx.pairs.slice(0, 30)) md += `| ${p.jaccard} | \`${p.a}\` | \`${p.b}\` |\n`;
  md += `\n## Ranking sensitivity\n\n`;
  if (!sens) {
    md += `No performance overlay was supplied, so **every page is classified \`unknown\`**. That is the honest classification, not a claim that these pages are worthless, and it is the conservative one: with no evidence a page does not rank, broad rewriting is not justified.\n\n`;
  } else {
    const c = {};
    for (const r of results) { const k = classify(r.rel, sens, r.score).sensitivity; c[k] = (c[k] || 0) + 1; }
    md += `| class | pages |\n|---|---:|\n`;
    for (const [k, v] of Object.entries(c)) md += `| ${k} | ${v} |\n`;
    md += `\n`;
  }
  md += `## Top 50 pages by within-locale percentile\n\nRanked on percentile **within each page's own locale**, not on raw score. Raw scores are not comparable across locales — a locale page has no English phrase rules, so those dimensions leave its denominator, which raises its normalised score on identical inputs. Measured: \`fr/library/emojis-argent\` 41.1 vs its English parent \`library/money-emojis\` 20.1, both with 0 concrete facts, ~10 em dashes and ~330 words.\n\n| locale pct | score | locale | family | route | nearest peer | Jaccard | action |\n|---:|---:|---|---|---|---|---:|---|\n`;
  for (const r of scored.slice().sort((a, b) => (b.localePercentile - a.localePercentile) || (b.score - a.score)).slice(0, 50)) {
    const cls = classify(r.rel, sens, r.score);
    const rec = recommend(r, cls.sensitivity);
    md += `| ${r.localePercentile} | ${r.score} | ${r.locale} | ${r.family} | \`/${r.rel.replace(/index\.html$/, '')}\` | ${r.nearest ? `\`${r.nearest.peer}\`` : '-'} | ${r.nearest ? r.nearest.jaccard : '-'} | ${rec.action} |\n`;
  }
  md += `\nFull per-page ledger: \`data/editorial_footprint_ledger.csv\`.\n`;
  return md;
}

if (require.main === module) main();
module.exports = { classify, recommend, loadPages, attachRanks };
