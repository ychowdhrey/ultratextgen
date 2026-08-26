#!/usr/bin/env node
'use strict';

/**
 * check-editorial-footprint.js
 *
 * Per-PR gate for the Editorial Footprint Risk system, plus the SEO
 * Preservation Gate on the same diff.
 *
 * SHADOW MODE IS THE DEFAULT. It reports what it WOULD have failed on and exits
 * 0. Promotion to blocking happens per-rule, deliberately, once the rule has
 * been exercised and its false positives reviewed - see
 * docs/editorial-footprint-risk.md, "Rollout". This is not caution for its own
 * sake: this repository has twice shipped a check that reported nothing and was
 * indistinguishable from a check that passed, and the cure for that is to watch
 * a rule fail on purpose before trusting it, not to switch it on and hope.
 *
 * -- It measures the DELTA, not the state ----------------------------------
 * Identical reasoning to check-locale-translation.js and check-faq-schema.js,
 * and for a bigger backlog than either: 52,766 em dashes across 98.9% of pages,
 * and one shared CTA card on 46.6% of English pages. A gate red on all of that
 * regardless of what a PR touches is a gate people learn to ignore. A finding
 * counts against a branch only if it exists NOW and did not exist at the merge
 * base. Pre-existing findings are REPORTED, never silenced.
 *
 * -- It names the upstream source ------------------------------------------
 * When a newly generated page carries a forbidden pattern, the string was very
 * likely written into a spec or a generator, not into the HTML: 6,918 em dashes
 * are hardcoded across 572 spec files and 116 generator scripts. Telling an
 * author to edit the HTML sends them to a file the next generator run
 * overwrites. So each finding is attributed upstream where the string can be
 * found there, and the failure message names that file instead.
 *
 * Usage:
 *   node scripts/check-editorial-footprint.js                  # shadow, vs origin/main
 *   node scripts/check-editorial-footprint.js --base main
 *   node scripts/check-editorial-footprint.js --enforce         # blocking rules bite
 *   node scripts/check-editorial-footprint.js --annotations     # GitHub Actions annotations
 *
 * Exit codes: 0 clean or shadow; 1 a blocking rule fired under --enforce;
 *             2 the diff could not be resolved.
 *
 * NOTE: it diffs merge-base..HEAD, so uncommitted work is invisible to it.
 * Commit first, then run - the same caveat every diff-scoped gate here carries.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { extractPage } = require('./lib/editorial-corpus');
const { matchBank, loadBank, scorePage, buildContext } = require('./lib/editorial-footprint');
const { snapshot, compare, posture } = require('./lib/seo-snapshot');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const ENFORCE = args.includes('--enforce');
const ANNOTATE = args.includes('--annotations');
const MAX_SHOWN = 8;

/**
 * Which rules bite under --enforce.
 *
 * Every entry here must be deterministic, documented, and have had its false
 * positives reviewed. Anything subjective stays a warning permanently.
 * docs/editorial-footprint-risk.md carries the promotion record.
 */
const BLOCKING = new Set([
  'model-leakage',        // EFR-F-002/003/004: assistant text, placeholders, scaffolding
  'seo-preservation'      // identity fields, protected terms, facts, links
  // 'em-dash' is NOT here yet. Shadow first: the rule is new, the backlog is
  // total, and the fix is usually upstream. See the rollout stages.
]);

const BASELINE_PATH = path.join(ROOT, 'data', 'editorial_footprint_baseline.json');

/** Regression allowance for an EXISTING page, in within-locale percentile points. */
const REGRESSION_TOLERANCE = 10;
/** New-page threshold, as a within-locale percentile. Calibrated, not invented. */
const NEW_PAGE_PERCENTILE = 95;

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
 * Find the spec or generator a string actually lives in.
 *
 * Uses `git grep -F` over tracked files only, so it can never wander into
 * node_modules or an untracked scratch file, and caches per string because one
 * page can carry the same forbidden character 40 times.
 */
const upstreamCache = new Map();
function upstreamSource(fragment) {
  const key = fragment.slice(0, 60);
  if (upstreamCache.has(key)) return upstreamCache.get(key);
  let hit = null;
  if (key.trim().length >= 12) {
    try {
      const out = git(['grep', '-l', '-F', '--', key, '--',
        'data/library_page_specs', 'data/event_page_specs', 'scripts'],
      { stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
      hit = out[0] || null;
    } catch { hit = null; }
  }
  upstreamCache.set(key, hit);
  return hit;
}

function ruleOf(hit) {
  if (hit.id === 'EFR-F-001') return 'em-dash';
  if (hit.id === 'EFR-F-002' || hit.id === 'EFR-F-003' || hit.id === 'EFR-F-004') return 'model-leakage';
  if (hit.category === 'strongly_discouraged') return 'formulaic-phrase';
  if (hit.category === 'density_limited') return 'density-limited';
  return null;
}

function main() {
  const base = resolveBase(flag('--base') || 'origin/main');
  let mergeBase;
  try { mergeBase = git(['merge-base', base, 'HEAD']).trim(); }
  catch (e) { console.error(`Could not compute merge-base: ${e.message}`); process.exit(2); }

  const changed = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html'])
    .split('\n').map((s) => s.trim()).filter(Boolean);

  console.log('Editorial Footprint Risk check' + (ENFORCE ? '' : '  [SHADOW MODE - reports only, exit 0]'));
  console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
  console.log(`  changed HTML files: ${changed.length}`);

  if (!changed.length) {
    console.log('\nNo changed HTML files - nothing to check. ✓');
    process.exit(0);
  }

  const bank = loadBank();
  let baseline = null;
  if (fs.existsSync(BASELINE_PATH)) {
    try { baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')); } catch { baseline = null; }
  }

  const introduced = [];      // findings this branch added
  const preExisting = [];     // findings already at the merge base
  const seoFindings = [];
  const newPages = [];
  const regressions = [];
  let checked = 0;

  // Score changed pages in the context of the whole current tree, so the
  // comparative dimensions are meaningful. Cheap enough: the corpus is read
  // once and the changed set is usually small.
  let ctx = null;
  const scoreNeeded = changed.some((rel) => fs.existsSync(path.join(ROOT, rel)));
  if (scoreNeeded && !args.includes('--no-score')) {
    const { globSync } = require('glob');
    const files = globSync('**/*.html', {
      cwd: ROOT,
      ignore: ['node_modules/**', 'assets/**', 'scripts/**', 'docs/**', 'js/**',
        'functions/**', '.github/**', 'data/**', 'reports/**', 'locales/**']
    });
    const pages = [];
    for (const rel of files) {
      try {
        const pg = extractPage(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel);
        if (pg && pg.indexable !== false) pages.push(pg);
      } catch { /* unreadable page: not this gate's business */ }
    }
    ctx = buildContext(pages);
    ctx._localeScores = new Map();
    for (const p of pages) {
      const r = scorePage(p, ctx);
      if (r.score === null) continue;
      if (!ctx._localeScores.has(p.locale)) ctx._localeScores.set(p.locale, []);
      ctx._localeScores.get(p.locale).push(r.score);
    }
    for (const v of ctx._localeScores.values()) v.sort((a, b) => a - b);
  }

  const pctOf = (locale, score) => {
    const arr = ctx && ctx._localeScores.get(locale);
    if (!arr || !arr.length) return null;
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < score) lo = m + 1; else hi = m; }
    return +(100 * lo / arr.length).toFixed(1);
  };

  for (const rel of changed) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;          // deleted later in the branch
    let page;
    try { page = extractPage(fs.readFileSync(abs, 'utf8'), rel); } catch { continue; }
    if (!page || page.indexable === false) continue;
    checked++;

    const beforeHtml = blobAt(mergeBase, rel);
    const beforePage = beforeHtml ? extractPage(beforeHtml, rel) : null;
    const isNew = !beforeHtml;

    // ---- phrase-bank findings, delta-scoped -------------------------------
    const nowHits = matchBank(page, bank).filter((h) => ruleOf(h));
    const beforeHits = beforePage ? matchBank(beforePage, bank).filter((h) => ruleOf(h)) : [];

    // Delta by COUNT per (rule id, slot), not by surrounding text.
    //
    // Keying on the context excerpt looks more precise and is wrong: the
    // excerpt is a +/-45-character window, so inserting a sentence anywhere
    // near an existing hit shifts the window and re-keys an untouched em dash
    // as newly introduced. Found by probe, not by reasoning - adding "As an AI"
    // to one paragraph reported 1 introduced em dash that had been on the page
    // all along. Counts are shift-proof: only the EXCESS over what was already
    // there counts against the branch.
    //
    // Contexts are still matched first, so a hit whose exact passage is
    // unchanged is attributed to the right occurrence when reporting.
    const countKey = (h) => `${h.id}|${h.slot}`;
    const beforeCounts = new Map();
    const beforeContexts = new Set();
    for (const h of beforeHits) {
      beforeCounts.set(countKey(h), (beforeCounts.get(countKey(h)) || 0) + 1);
      beforeContexts.add(`${countKey(h)}|${h.context}`);
    }
    const groups = new Map();
    for (const h of nowHits) {
      if (!groups.has(countKey(h))) groups.set(countKey(h), []);
      groups.get(countKey(h)).push(h);
    }
    for (const [key, hitsForKey] of groups) {
      const had = beforeCounts.get(key) || 0;
      const excess = hitsForKey.length - had;
      // Report the passages that are textually new first; they are the most
      // likely to be what the author actually wrote.
      const ranked = hitsForKey.slice().sort((a, b) =>
        (beforeContexts.has(`${key}|${a.context}`) ? 1 : 0) - (beforeContexts.has(`${key}|${b.context}`) ? 1 : 0));
      ranked.forEach((h, i) => {
        if (i < excess) {
          introduced.push({ rel, ...h, rule: ruleOf(h), upstream: upstreamSource(h.context.replace(/^\.{3}|\.{3}$/g, '')) });
        } else {
          preExisting.push({ rel, ...h, rule: ruleOf(h) });
        }
      });
    }

    // ---- SEO preservation, existing pages only ----------------------------
    if (beforePage) {
      const before = snapshot(beforePage, rel, bank);
      const after = snapshot(page, rel, bank);
      const f = compare(before, after);
      for (const x of f) seoFindings.push({ rel, ...x });
    }

    // ---- score: new-page threshold vs existing-page regression ------------
    if (ctx) {
      const r = scorePage(page, ctx);
      if (r.score !== null) {
        const pct = pctOf(page.locale, r.score);
        if (isNew) {
          if (pct !== null && pct >= NEW_PAGE_PERCENTILE) {
            newPages.push({ rel, score: r.score, pct, locale: page.locale, dims: r.dimensions });
          }
        } else if (baseline && baseline.pages[rel] && baseline.pages[rel].score !== null) {
          const beforeScore = baseline.pages[rel].score;
          const beforePct = pctOf(page.locale, beforeScore);
          if (pct !== null && beforePct !== null && pct - beforePct >= REGRESSION_TOLERANCE) {
            regressions.push({ rel, before: beforeScore, after: r.score, beforePct, pct });
          }
        }
      }
    }
  }

  // ---- report ------------------------------------------------------------
  console.log(`  pages checked:      ${checked}`);
  console.log(`  findings introduced: ${introduced.length}`);
  if (preExisting.length) console.log(`  pre-existing (not this branch's): ${preExisting.length}`);
  console.log(`  SEO preservation findings: ${seoFindings.length}`);
  console.log('');

  const byRule = new Map();
  for (const f of introduced) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }

  let blockingHit = false;

  for (const [rule, list] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const blocks = BLOCKING.has(rule);
    if (blocks) blockingHit = true;
    console.log(`${blocks ? (ENFORCE ? '✗ BLOCKING' : '✗ would block') : '⚠ warning'}  ${rule} - ${list.length} introduced`);

    // Summarise rather than flood: one line per page, capped.
    const byPage = new Map();
    for (const f of list) {
      if (!byPage.has(f.rel)) byPage.set(f.rel, []);
      byPage.get(f.rel).push(f);
    }
    let shown = 0;
    for (const [rel, fs_] of byPage) {
      if (shown++ >= MAX_SHOWN) { console.log(`    … and ${byPage.size - MAX_SHOWN} more page(s)`); break; }
      const up = fs_.find((x) => x.upstream);
      console.log(`    · ${rel} (${fs_.length}) [${fs_[0].slot}]`);
      console.log(`        ${fs_[0].context.slice(0, 130)}`);
      if (up) console.log(`        upstream: ${up.upstream} ← fix it there, not in the HTML`);
      if (ANNOTATE) {
        const lvl = blocks && ENFORCE ? 'error' : 'warning';
        console.log(`::${lvl} file=${rel},title=EFR ${rule}::${fs_.length} introduced. ${fs_[0].context.slice(0, 160).replace(/\n/g, ' ')}${up ? ` | upstream: ${up.upstream}` : ''}`);
      }
    }
    console.log('');
  }

  if (seoFindings.length) {
    const errs = seoFindings.filter((f) => f.severity === 'error');
    if (errs.length) blockingHit = true;
    console.log(`${errs.length ? (ENFORCE ? '✗ BLOCKING' : '✗ would block') : '⚠ warning'}  seo-preservation - ${errs.length} error(s), ${seoFindings.length - errs.length} warning(s)`);
    for (const f of seoFindings.slice(0, MAX_SHOWN)) {
      console.log(`    ${f.severity === 'error' ? '✗' : '⚠'} ${f.rel}: ${f.rule} - ${f.detail}`);
      if (ANNOTATE) {
        console.log(`::${f.severity === 'error' && ENFORCE ? 'error' : 'warning'} file=${f.rel},title=SEO preservation (${f.rule})::${f.detail.replace(/\n/g, ' ')}`);
      }
    }
    if (seoFindings.length > MAX_SHOWN) console.log(`    … and ${seoFindings.length - MAX_SHOWN} more`);
    console.log(`    Posture with no performance overlay: ${posture('unknown').note}`);
    console.log('');
  }

  if (newPages.length) {
    console.log(`⚠ warning  new-page-threshold - ${newPages.length} new page(s) at or above p${NEW_PAGE_PERCENTILE} of their own locale`);
    for (const p of newPages.slice(0, MAX_SHOWN)) {
      console.log(`    · ${p.rel} - score ${p.score} (p${p.pct} within ${p.locale})`);
    }
    console.log('');
  }

  if (regressions.length) {
    console.log(`⚠ warning  score-regression - ${regressions.length} existing page(s) worsened by >= ${REGRESSION_TOLERANCE} percentile points`);
    for (const r of regressions.slice(0, MAX_SHOWN)) {
      console.log(`    · ${r.rel} - ${r.before} (p${r.beforePct}) -> ${r.after} (p${r.pct})`);
    }
    console.log('');
  }

  if (preExisting.length) {
    const byPage = new Map();
    for (const f of preExisting) byPage.set(f.rel, (byPage.get(f.rel) || 0) + 1);
    const top = [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`Reported, not failed - ${preExisting.length} finding(s) on pages this branch touched already`);
    console.log('existed at the merge base, and this branch did not add to them:');
    for (const [rel, n] of top) console.log(`    · ${rel} (${n})`);
    if (byPage.size > top.length) console.log(`    … and ${byPage.size - top.length} more page(s)`);
    console.log('  Whole-site picture: npm run audit:editorial-footprint');
    console.log('');
  }

  if (!introduced.length && !seoFindings.length && !newPages.length && !regressions.length) {
    console.log('This branch introduced no editorial-footprint or SEO-preservation findings. ✓');
    process.exit(0);
  }

  console.log('How to act on this:');
  console.log('  · Replace a generic claim with the fact behind it, not with a synonym.');
  console.log('    Google names "automated transformations like synonymizing" as scaled');
  console.log('    content abuse, so swapping words to lower a score moves the wrong way.');
  console.log('  · If a finding names an upstream file, fix it THERE. Editing the generated');
  console.log('    HTML is undone by the next generator run.');
  console.log('  · Never remove a search-protected term, a codepoint, an example or an');
  console.log('    internal link to clear a warning. That is a relevance loss, not a fix.');
  console.log('  · Rules, evidence and rollout stage: docs/editorial-footprint-risk.md');

  if (!ENFORCE) {
    console.log('\n[SHADOW MODE] Exiting 0. Re-run with --enforce to see this gate bite.');
    process.exit(0);
  }
  process.exit(blockingHit ? 1 : 0);
}

if (require.main === module) main();
module.exports = { BLOCKING, NEW_PAGE_PERCENTILE, REGRESSION_TOLERANCE, ruleOf };
