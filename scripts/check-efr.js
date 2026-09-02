#!/usr/bin/env node
'use strict';

/**
 * check-efr.js — the EFR Quality Gate, per pull request.
 *
 * For every /updates/ and /guide/ page a branch adds or changes, scores the
 * page's Editorial Footprint Risk (the existing model in
 * scripts/lib/editorial-footprint.js — nothing is re-measured here) and applies
 * the section's PASS / REVIEW / FAIL thresholds and the ratchet in
 * scripts/lib/efr-gate.js.
 *
 * -- Diff-scoped, ratcheted, never red on the backlog -------------------------
 * The site already carries pages above target (13 of 33 English guides on the
 * day this was written). A gate red on all of them regardless of what a PR
 * touches is a gate people learn to ignore — the same reasoning as
 * check-locale-translation.js, check-faq-schema.js and check-editorial-footprint.js.
 * So this gate only ever looks at the pages THIS branch adds or changes, and
 * for an existing page it compares the page with ITS OWN previous version:
 *
 *   new page                        must meet PASS
 *   existing page at/below PASS     must stay at/below PASS
 *   existing page above PASS        must not get materially worse (+0.5)
 *   existing page that improved     credited — unless the drop was bought by
 *                                   removing facts, links, protected terms or
 *                                   depth, which is IMPROVED BY REMOVAL
 *
 * -- Both versions are scored in ONE corpus -----------------------------------
 * Every comparative dimension (specificity deficit, punctuation, three-item
 * lists, structural template dependence, cross-page sameness) is scored
 * against cohort medians and neighbours drawn from the whole tree. Scoring the
 * merge-base version of a page inside today's tree means both sides see the
 * same medians, so the delta is the page's own change and nothing else. The
 * committed baseline (data/editorial_footprint_baseline.json) is shown as well,
 * labelled with its date, but the ratchet never decides on it.
 *
 * Usage:
 *   node scripts/check-efr.js                       # vs origin/main, gating
 *   node scripts/check-efr.js --base main
 *   node scripts/check-efr.js --shadow              # report only, exit 0
 *   node scripts/check-efr.js --annotations         # GitHub file annotations
 *   node scripts/check-efr.js --json out.json
 *
 * Exit codes: 0 clean (or nothing to check); 1 a ratchet rule blocked;
 *             2 the diff or the exception ledger could not be resolved.
 *
 * NOTE: it diffs merge-base..HEAD, so uncommitted work is invisible to it.
 * Commit first, then run — the same caveat every diff-scoped gate here carries.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { extractPage } = require('./lib/editorial-corpus');
const { scorePage, buildContext, loadBank, structureKey } = require('./lib/editorial-footprint');
const { snapshot, compare } = require('./lib/seo-snapshot');
const { loadPages, attachRanks } = require('./audit-editorial-footprint');
const G = require('./lib/efr-gate');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const SHADOW = args.includes('--shadow');
const ANNOTATE = args.includes('--annotations');

function git(a, opts = {}) {
  return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function resolveBase(base) {
  try { git(['rev-parse', '--verify', base], { stdio: 'ignore' }); return base; } catch { /* fall through */ }
  const branch = base.replace(/^origin\//, '');
  try {
    git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
    const cand = `origin/${branch}`;
    git(['rev-parse', '--verify', cand], { stdio: 'ignore' });
    return cand;
  } catch (e) {
    console.error(`Could not resolve or fetch base ref "${base}": ${e.message}`);
    process.exit(2);
  }
  return base;
}

function blobAt(rev, rel) {
  try { return git(['show', `${rev}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}

/**
 * Score the merge-base version of a page in the current corpus context.
 *
 * The corpus contains the AFTER version, so the structure histogram counts
 * the after shape once for "itself". The before version stands in for it:
 * move that one count from the after shape to the before shape, so neither
 * side is off by one when the edit changed the page's heading/FAQ/paragraph
 * shape. Everything else in the context is shared as-is.
 */
function scoreBefore(beforePage, afterPage, ctx) {
  const structureCounts = new Map(ctx.structureCounts);
  const kAfter = `${afterPage.locale}|${afterPage.family}|${structureKey(afterPage)}`;
  const kBefore = `${beforePage.locale}|${beforePage.family}|${structureKey(beforePage)}`;
  if (kAfter !== kBefore) {
    structureCounts.set(kAfter, Math.max(0, (structureCounts.get(kAfter) || 1) - 1));
    structureCounts.set(kBefore, (structureCounts.get(kBefore) || 0) + 1);
  }
  return scorePage(beforePage, { ...ctx, structureCounts });
}

function fmt(n) { return n === null || n === undefined ? 'n/a' : String(n); }
function signed(d) { return d === null || d === undefined ? 'n/a' : (d > 0 ? `+${d}` : `${d}`); }

function main() {
  const base = resolveBase(flag('--base') || 'origin/main');
  let mergeBase;
  try { mergeBase = git(['merge-base', base, 'HEAD']).trim(); }
  catch (e) { console.error(`Could not compute merge-base: ${e.message}`); process.exit(2); }

  const changed = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html'])
    .split('\n').map((s) => s.trim()).filter(Boolean);

  console.log(`EFR QUALITY GATE${SHADOW ? '  [SHADOW MODE - reports only, exit 0]' : ''}`);
  console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
  console.log(`  changed HTML files: ${changed.length}`);

  const { exceptions, errors } = G.loadExceptions();
  if (errors.length) {
    console.error(`\n✗ ${path.relative(ROOT, G.EXCEPTIONS_PATH)} is malformed and is refused rather than partially honoured:`);
    for (const e of errors) console.error(`    · ${e}`);
    process.exit(2);
  }

  // Only updates/guide entries (any locale) and their hubs are this gate's
  // business. Everything else is listed as unclassified at the end, by count.
  const inScope = changed.filter((rel) => fs.existsSync(path.join(ROOT, rel)))
    .map((rel) => ({ rel, cls: G.classifyContent(rel) }))
    .filter(({ cls }) => cls.section !== null);
  const unclassified = changed.filter((rel) => fs.existsSync(path.join(ROOT, rel)) && G.classifyContent(rel).section === null);

  if (!inScope.length) {
    console.log(`  in scope (updates/guide): 0${unclassified.length ? `   (${unclassified.length} changed page(s) in other sections: no EFR threshold is defined for them)` : ''}`);
    console.log('\nNo changed /updates/ or /guide/ pages - nothing to gate. ✓');
    process.exit(0);
  }
  console.log(`  in scope (updates/guide): ${inScope.length}`);
  console.log('  scoring the whole corpus so both sides of every diff share one context …');

  const all = loadPages().filter((p) => p.indexable !== false && p.rel !== '_root.html');
  const ctx = buildContext(all);
  const bank = loadBank();
  const results = all.map((p) => scorePage(p, ctx));
  attachRanks(results);
  const byRel = new Map(results.map((r) => [r.rel, r]));
  const baseline = G.loadBaseline();

  const rows = [];
  for (const { rel, cls } of inScope) {
    const afterPage = all.find((p) => p.rel === rel);
    if (!afterPage) {
      // noindex or unparseable: not an indexable page, not this gate's business
      rows.push({ rel, cls, route: cls.route, skipped: 'noindex or not parseable' });
      continue;
    }
    const after = byRel.get(rel);
    const beforeHtml = blobAt(mergeBase, rel);
    const beforePage = beforeHtml ? extractPage(beforeHtml, rel) : null;
    const before = beforePage ? scoreBefore(beforePage, afterPage, ctx) : null;
    const depth = beforePage ? compare(snapshot(beforePage, rel, bank), snapshot(afterPage, rel, bank)) : [];
    const exception = G.exceptionFor(cls.route, after.score, exceptions);
    const verdict = G.ratchet({
      cls, after: after.score, before: before ? before.score : null, depth, exception
    });
    const baselineScore = baseline && baseline.pages[rel] ? baseline.pages[rel].score : null;
    rows.push({
      rel, cls, route: cls.route,
      isNew: !beforeHtml,
      score: after.score,
      status: G.statusLabel(cls, after.score),
      band: cls.calibrated && after.score !== null ? G.statusFor(cls.section, after.score).band : null,
      localePercentile: after.localePercentile, familyPercentile: after.familyPercentile,
      before: before ? before.score : null,
      delta: before && before.score !== null && after.score !== null ? +(after.score - before.score).toFixed(1) : null,
      baselineScore, baselineDate: baseline ? baseline.date : null,
      wordCount: after.wordCount,
      contributors: G.contributors(after),
      depth, exception, verdict
    });
  }

  // ---- per-page report ----------------------------------------------------
  const mark = { BLOCK: SHADOW ? '✗ would block' : '✗ BLOCK', WARN: '⚠ WARN', OK: '✓ OK' };
  console.log('');
  for (const r of rows) {
    if (r.skipped) { console.log(`- skipped  ${r.route}  (${r.skipped})\n`); continue; }
    const t = r.cls.thresholds;
    console.log(`${mark[r.verdict.verdict]}  ${r.verdict.headline}`);
    console.log(`  ${r.route}`);
    console.log(`  content type:   ${r.cls.contentType}${r.cls.section ? ` (${r.cls.locale})` : ''}${r.cls.hub ? ' hub' : ''}`);
    console.log(`  EFR:            ${fmt(r.score)}${r.band ? `   [${r.status}: ${r.band}]` : r.status ? `   [${r.status}]` : ''}`);
    if (t) console.log(`  threshold:      ${t.label} PASS <= ${t.pass.toFixed(1)}, REVIEW <= ${t.review.toFixed(1)}, FAIL > ${t.review.toFixed(1)}`);
    else console.log(`  threshold:      none applied — ${r.cls.reason}`);
    if (r.localePercentile !== null && r.localePercentile !== undefined) {
      console.log(`  percentile:     p${r.localePercentile} within ${r.cls.locale}${r.familyPercentile !== null && r.familyPercentile !== undefined ? ` (p${r.familyPercentile} within ${r.cls.locale}/${r.cls.family})` : ''}`);
    }
    if (r.isNew) console.log('  previous EFR:   none (new page)');
    else {
      console.log(`  previous EFR:   ${fmt(r.before)} (merge-base version, scored in today\'s corpus)${r.baselineScore !== null && r.baselineScore !== undefined && r.baselineScore !== r.before ? `; baseline ${r.baselineDate || ''}: ${r.baselineScore}` : ''}`);
      console.log(`  delta:          ${signed(r.delta)}${r.delta !== null && r.delta > 0 ? (r.delta >= G.MATERIAL_DELTA ? '  (material: >= ' + G.MATERIAL_DELTA + ')' : '  (below the ' + G.MATERIAL_DELTA + ' material allowance)') : ''}`);
    }
    if (r.contributors) console.log(`  contributors:   ${r.contributors}`);
    for (const n of r.verdict.notes) console.log(`  · ${n}`);
    if (ANNOTATE && r.verdict.verdict !== 'OK') {
      const lvl = r.verdict.verdict === 'BLOCK' && !SHADOW ? 'error' : 'warning';
      console.log(`::${lvl} file=${r.rel},title=EFR quality gate::${r.verdict.headline} — EFR ${fmt(r.score)}${r.before !== null ? ` (was ${r.before}, ${signed(r.delta)})` : ''}${t ? `, ${t.label} PASS <= ${t.pass}` : ''}`);
    }
    console.log('');
  }

  // ---- summary ------------------------------------------------------------
  const live = rows.filter((r) => !r.skipped);
  const code = (c) => live.filter((r) => r.verdict.code === c).length;
  const regressions = code('REGRESSION') + code('REGRESSION-PAST-TARGET') + code('MINOR-REGRESSION');
  const improvements = code('IMPROVED') + code('RESOLVED') + code('IMPROVED-STILL-ABOVE-TARGET');
  const byRemoval = code('IMPROVED-BY-REMOVAL');
  const newFailures = live.filter((r) => r.cls.calibrated && r.status !== 'PASS' && (r.isNew || (r.before !== null && G.statusFor(r.cls.section, r.before).status === 'PASS'))).length;
  const resolved = code('RESOLVED');
  const exceptionsApplied = live.filter((r) => r.verdict.code === 'EXCEPTION').length;
  const blocked = live.filter((r) => r.verdict.verdict === 'BLOCK');

  console.log('Changed pages');
  console.log(`  checked:              ${live.length}  (${live.filter((r) => r.cls.calibrated).length} calibrated EN, ${live.filter((r) => r.cls.section && !r.cls.calibrated && !r.cls.hub).length} uncalibrated locale, ${live.filter((r) => r.cls.hub).length} hub)`);
  console.log(`  regressions:          ${regressions}`);
  console.log(`  improvements:         ${improvements}${byRemoval ? `   (+${byRemoval} improved by removal — not credited)` : ''}`);
  console.log(`  new failures:         ${newFailures}`);
  console.log(`  resolved failures:    ${resolved}`);
  console.log(`  exceptions applied:   ${exceptionsApplied}`);
  if (unclassified.length) console.log(`  other sections:       ${unclassified.length} changed page(s) with no EFR threshold defined (not gated)`);
  console.log('');

  if (flag('--json')) {
    fs.writeFileSync(flag('--json'), JSON.stringify({ base, mergeBase, rows: rows.map((r) => ({ ...r, cls: { ...r.cls, thresholds: undefined } })) }, null, 2));
  }

  if (blocked.length) {
    console.log(`${blocked.length} page(s) blocked by the ratchet.`);
    console.log('How to act on this:');
    console.log('  · Replace a generic claim with the fact behind it — a codepoint, a limit, a');
    console.log('    platform name, a dated event — never with a synonym.');
    console.log('  · Cut editorial framing (openers, benefit claims, rhetorical flourishes),');
    console.log('    not explanation, evidence, examples, caveats, tables or instructions.');
    console.log('  · A justified high score goes in data/efr_exceptions.json with page, efr,');
    console.log('    reason, owner, agreed date and a reviewBy date — discussed, never unilateral.');
    console.log('  · Thresholds, ratchet rules and the editor playbook: docs/efr-quality-gate.md');
    if (SHADOW) { console.log('\n[SHADOW MODE] Exiting 0.'); process.exit(0); }
    process.exit(1);
  }
  console.log('No changed /updates/ or /guide/ page regressed under the EFR ratchet. ✓');
  process.exit(0);
}

if (require.main === module) main();
module.exports = { scoreBefore };
