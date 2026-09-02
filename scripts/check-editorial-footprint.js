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
 * docs/editorial-footprint-risk.md, "Rollout". ONE EXCEPTION, decided by the
 * user on 2026-09-02: the em dash is banned forward-only per locale (and the
 * spaced hyphen on English), and an introduced one exits 1 regardless of mode
 * (see the em dash policy block below). This is not caution for its own
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
 * -- Clean on touch (added 2026-09-02, user direction) ----------------------
 * Forward-only is the rule for pages a branch leaves alone. For a page whose
 * own copy the branch edits, it is not: that page must leave with ZERO em
 * dashes in its measured slots, not merely no new ones. "Copy" means the
 * page's title, meta description, H1, headings, prose or FAQ text changed
 * between the merge base and HEAD (TOUCH_SLOTS). A card added by a peer-link
 * sync, a footer or hreflang regeneration, a rebuilt library directory or an
 * asset swap changes none of those and is not a touch — a mesh pass that
 * rewrites 1,009 pages must not demand 1,009 rewrites. Once a page IS touched,
 * every measured slot on it must be clean, cards included.
 *
 * An English page that is touched pulls its locale siblings along: each
 * sibling that this branch does not itself copy-edit must already be clean,
 * or it is reported under `em-dash-sibling` naming the parent that pulled it
 * in. The rule is anchored on English on purpose — it is where pages are born
 * and where the tone standard is applied first — so a translator's one-line
 * correction never obliges an English rewrite, and a new locale batch never
 * obliges the cleanup of every parent it translates.
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
 *   node scripts/check-editorial-footprint.js --enforce         # every BLOCKING rule bites
 *   node scripts/check-editorial-footprint.js --enforce em-dash-touched,em-dash-sibling
 *                                                                # only the named rules bite;
 *                                                                # the rest still say "would block"
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
const { extractPage, EDITORIAL_SLOTS, joinSlots, classifyPath } = require('./lib/editorial-corpus');
const { matchBank, loadBank, scorePage, buildContext } = require('./lib/editorial-footprint');
const { snapshot, compare, posture } = require('./lib/seo-snapshot');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
const ENFORCE = args.includes('--enforce');
/** `--enforce a,b` scopes the bite to those rules; bare `--enforce` is every BLOCKING rule. */
const ENFORCE_RULES = parseEnforce(args);
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
  'model-leakage',        // EFR-F-002/003/004/005: assistant text, placeholders, scaffolding
  'seo-preservation',     // identity fields, protected terms, facts, links
  // The three em-dash rules entered this set on 2026-09-02, when the rule
  // changed from forward-only to clean-on-touch (user direction). Each is
  // deterministic and was watched failing on purpose before being added. What
  // they still need is exposure on real PRs, which is why the workflow step
  // has not been given `--enforce` yet: promotion is one workflow line, and
  // `--enforce <rule,rule>` lets it happen per rule, without also promoting
  // `seo-preservation` (which has its own open prerequisite: a deliberate
  // retitle has nowhere to record its intent).
  'em-dash',              // an em dash this branch wrote
  'em-dash-touched',      // an em dash this branch inherited on a page whose copy it edited
  'em-dash-sibling'       // an em dash on an untouched locale sibling of a touched EN page
]);

/**
 * The em dash ban is PER LOCALE and forward-only, driven by
 * data/em_dash_locale_policy.json through scripts/lib/em-dash-policy.js:
 *
 *   ban          English (house style) and the thirteen locales whose native
 *                dash is the spaced en dash — an introduced em dash fails the
 *                run in every mode, and the block names the replacement.
 *   double-dash  zh-tw and ja, whose native dash is the paired —— — a lone
 *                introduced — fails, a —— does not.
 *   native       Russian, Spanish, Portuguese, French, Polish, Romanian — the
 *                em dash is their punctuation and is never a finding here.
 *   review       everything else — a warning, as before.
 *
 * The policy is applied to BOTH sides of a diff before anything else, so it
 * composes with clean-on-touch (above) rather than competing with it: on a
 * native locale a copy-touched page has no em dash findings at all, on a
 * double-dash locale it must clear only its lone dashes, and a sibling pulled
 * in by an English touch is measured under its own locale's policy — a
 * Russian sibling is never pulled in, a Chinese one only for lone dashes.
 * Introduced em dashes on a ban/double-dash locale (and spaced hyphens on
 * English, EFR-F-006) fail in every mode; the touched and sibling obligations
 * on those locales stay BLOCKING-eligible and bite under --enforce, per the
 * rollout in docs/editorial-footprint-risk.md; on a review locale every em
 * dash finding is a warning. Decision, table and evidence: docs/em-dash-policy.md.
 */
const { loadDashPolicy, applyDashPolicy, isBanned, policyFor } = require('./lib/em-dash-policy');

/** Does this rule fail the run right now? Shadow → never; --enforce → if in scope. */
function bites(rule) {
  return ENFORCE && BLOCKING.has(rule) && (!ENFORCE_RULES || ENFORCE_RULES.has(rule));
}

/**
 * `--enforce` with an optional comma list. `--enforce --annotations` is a bare
 * enforce (the next token is a flag, not a list). Pure; tested directly.
 */
function parseEnforce(argv) {
  const i = argv.indexOf('--enforce');
  if (i === -1) return null;
  const next = argv[i + 1];
  if (!next || next.startsWith('--')) return null;
  const rules = next.split(',').map((r) => r.trim()).filter(Boolean);
  return rules.length ? new Set(rules) : null;
}

/**
 * Slots whose change means the AUTHOR edited this page's copy. `cta` is
 * deliberately not one of them: a card is added to a page by the peer-link
 * sync, by a new hub entry, by a new update landing in the updates grid — none
 * of which is that page's author writing. Cards are still MEASURED (a touched
 * page must clear its card labels too); they just do not, on their own, make a
 * page touched.
 */
const TOUCH_SLOTS = EDITORIAL_SLOTS.filter((s) => s !== 'cta');

/** Did this branch edit the page's own copy? A new page is touched by definition. */
function copyTouched(beforePage, page) {
  if (!beforePage) return true;
  return joinSlots(beforePage, TOUCH_SLOTS).join('\n') !== joinSlots(page, TOUCH_SLOTS).join('\n');
}

/**
 * Split a page's current hits three ways: what the branch introduced, what it
 * inherited and may leave, and — on a copy-touched page — the inherited em
 * dashes it must now clear. Pure; tested directly.
 *
 * Delta by COUNT per (rule id, slot), not by surrounding text. Keying on the
 * context excerpt looks more precise and is wrong: the excerpt is a +/-45-
 * character window, so inserting a sentence anywhere near an existing hit
 * shifts the window and re-keys an untouched em dash as newly introduced.
 * Found by probe, not by reasoning - adding "As an AI" to one paragraph
 * reported 1 introduced em dash that had been on the page all along. Counts
 * are shift-proof: only the EXCESS over what was already there counts as
 * introduced. Contexts are still matched first, so a hit whose exact passage
 * is unchanged is attributed to the right occurrence when reporting.
 */
function classifyHits(nowHits, beforeHits, touched) {
  const introduced = [], preExisting = [], touchedEmDash = [];
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
      if (i < excess) introduced.push(h);
      else if (touched && ruleOf(h) === 'em-dash') touchedEmDash.push(h);
      else preExisting.push(h);
    });
  }
  return { introduced, preExisting, touchedEmDash };
}

/**
 * The EN-anchored sibling rule. For every copy-touched ENGLISH page, each
 * locale sibling this branch did not itself copy-edit must carry zero em
 * dashes; the ones that do are returned, each naming the parent that pulled
 * it in. A sibling that IS copy-touched is not listed here — its own
 * `em-dash-touched` finding covers it. Pure: cluster lookup and hit counting
 * are injected, so it is tested without a repository.
 */
function siblingObligations(touchedEnRels, touchedSet, siblingsOf, emDashHits) {
  const out = [];
  for (const rel of touchedEnRels) {
    for (const sib of siblingsOf(rel)) {
      if (touchedSet.has(sib)) continue;
      const hits = emDashHits(sib);
      if (hits.length) out.push({ rel: sib, parent: rel, hits });
    }
  }
  return out;
}

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
  if (hit.id === 'EFR-F-006') return 'spaced-hyphen';
  if (['EFR-F-002', 'EFR-F-003', 'EFR-F-004', 'EFR-F-005'].includes(hit.id)) return 'model-leakage';
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

  const mode = !ENFORCE ? '  [SHADOW MODE - reports only, exit 0]'
    : ENFORCE_RULES ? `  [ENFORCING ${[...ENFORCE_RULES].join(', ')}; other blocking rules report only]` : '';
  console.log('Editorial Footprint Risk check' + mode);
  console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
  console.log(`  changed HTML files: ${changed.length}`);

  if (!changed.length) {
    console.log('\nNo changed HTML files - nothing to check. ✓');
    process.exit(0);
  }

  const bank = loadBank();
  const dash = loadDashPolicy();
  if (dash.errors.length) {
    console.error(`\n✗ ${path.relative(ROOT, dash.__path)} is malformed and is refused rather than partially honoured:`);
    for (const e of dash.errors) console.error(`    · ${e}`);
    process.exit(2);
  }
  const dropped = { native: 0, paired: 0 };
  let baseline = null;
  if (fs.existsSync(BASELINE_PATH)) {
    try { baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')); } catch { baseline = null; }
  }

  const introduced = [];      // findings this branch added, plus the inherited em dashes it must clear
  const preExisting = [];     // findings already at the merge base that it may leave
  const touchedRels = [];     // pages whose own copy this branch edited
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

    // ---- phrase-bank findings: delta-scoped, clean-on-touch, per-locale ---
    const touched = copyTouched(beforePage, page);
    if (touched) touchedRels.push(rel);
    // The locale's em dash policy is applied to BOTH sides identically, so the
    // delta below still compares like with like: on a native locale no em
    // dash is a finding, on a double-dash locale only a lone one is.
    const nowPol = applyDashPolicy(matchBank(page, bank).filter((h) => ruleOf(h)), page.locale, dash);
    const beforePol = beforePage ? applyDashPolicy(matchBank(beforePage, bank).filter((h) => ruleOf(h)), page.locale, dash) : { hits: [], dropped: 0 };
    if (nowPol.policy.policy === 'native') dropped.native += nowPol.dropped; else dropped.paired += nowPol.dropped;
    const split = classifyHits(nowPol.hits, beforePol.hits, touched);
    const attribute = (h, rule) => ({
      rel, locale: page.locale, ...h, rule, upstream: upstreamSource(h.context.replace(/^\.{3}|\.{3}$/g, ''))
    });
    for (const h of split.introduced) introduced.push(attribute(h, ruleOf(h)));
    for (const h of split.touchedEmDash) introduced.push(attribute(h, 'em-dash-touched'));
    for (const h of split.preExisting) preExisting.push({ rel, locale: page.locale, ...h, rule: ruleOf(h) });

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

  // ---- sibling obligations: an EN copy-touch pulls its locale siblings ------
  const touchedSet = new Set(touchedRels);
  const touchedEn = touchedRels.filter((rel) => {
    const abs = path.join(ROOT, rel);
    try { return extractPage(fs.readFileSync(abs, 'utf8'), rel).locale === 'en'; } catch { return false; }
  });
  let siblingCount = 0;
  if (touchedEn.length) {
    const { discoverClusters } = require('./lib/translation-clusters');
    const { byUrl, clusters } = discoverClusters(ROOT);
    const urlOfRel = new Map();
    for (const [url, rec] of byUrl) urlOfRel.set(rec.rel, url);
    const siblingsOf = (rel) => {
      const url = urlOfRel.get(rel);
      const rec = url && byUrl.get(url);
      if (!rec || rec.ownLang !== 'en' || !clusters.has(url)) return [];
      return [...clusters.get(url)].filter((u) => u !== url).map((u) => byUrl.get(u) && byUrl.get(u).rel).filter(Boolean);
    };
    // A sibling is measured under ITS OWN locale's policy: a Russian sibling
    // is never pulled in, a Chinese one only for lone dashes.
    const emDashHits = (rel) => {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return [];
      try {
        const pg = extractPage(fs.readFileSync(abs, 'utf8'), rel);
        if (!pg || pg.indexable === false) return [];
        return applyDashPolicy(matchBank(pg, bank).filter((h) => ruleOf(h) === 'em-dash'), pg.locale, dash).hits;
      } catch { return []; }
    };
    for (const ob of siblingObligations(touchedEn, touchedSet, siblingsOf, emDashHits)) {
      siblingCount++;
      const sibLocale = classifyPath(ob.rel).locale;
      for (const h of ob.hits) {
        introduced.push({ rel: ob.rel, locale: sibLocale, ...h, rule: 'em-dash-sibling', parent: ob.parent,
          upstream: upstreamSource(h.context.replace(/^\.{3}|\.{3}$/g, '')) });
      }
    }
  }

  // ---- report ------------------------------------------------------------
  console.log(`  pages checked:      ${checked}`);
  console.log(`  copy-touched pages: ${touchedRels.length}` + (touchedEn.length ? ` (${touchedEn.length} English, pulling ${siblingCount} unclean sibling(s))` : ''));
  console.log(`  findings introduced: ${introduced.length}`);
  if (preExisting.length) console.log(`  pre-existing (not this branch's): ${preExisting.length}`);
  console.log(`  SEO preservation findings: ${seoFindings.length}`);
  if (dropped.native) console.log(`  em dashes not counted on native-dash locale pages (policy "native"): ${dropped.native}`);
  if (dropped.paired) console.log(`  paired —— not counted on double-dash locale pages: ${dropped.paired}`);
  console.log('');

  const byRule = new Map();
  for (const f of introduced) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }

  let blockingHit = false;
  let banHit = false;

  // Banned findings print first, on their own, because they are the only
  // ones that fail the run in shadow mode; the rest keep the shadow/enforce
  // behaviour exactly as before.
  /**
   * Severity of one rule's findings for one locale.
   *   banned   — fails in every mode: an introduced em dash on a ban or
   *              double-dash locale, an introduced spaced hyphen on English.
   *   blocking — BLOCKING-eligible, bites under --enforce: the clean-on-touch
   *              and sibling obligations on a ban/double-dash locale, and the
   *              non-dash blocking rules.
   *   warning  — reported only: every em dash finding on a review locale,
   *              and the rules that are not blocking-eligible.
   */
  const DASH_FAMILY = new Set(['em-dash', 'em-dash-touched', 'em-dash-sibling', 'spaced-hyphen']);
  const severityOf = (rule, locale) => {
    if (rule === 'em-dash' || rule === 'spaced-hyphen') return isBanned(rule, locale, dash) ? 'banned' : 'warning';
    if (rule === 'em-dash-touched' || rule === 'em-dash-sibling') {
      const p = policyFor(locale, dash).policy;
      return p === 'ban' || p === 'double-dash' ? 'blocking' : 'warning';
    }
    return BLOCKING.has(rule) ? 'blocking' : 'warning';
  };
  const replacementFor = (rule, locale) => (rule === 'spaced-hyphen'
    ? 'the same choices as the em dash: a colon, a full stop, a comma pair or parentheses; a range takes an en dash'
    : policyFor(locale, dash).replacement);

  // Locale-sensitive rules get one section per locale, so the replacement the
  // block names is that locale's own; everything else is one section per rule.
  const sections = [];
  for (const [rule, list] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (!DASH_FAMILY.has(rule)) { sections.push({ rule, list, locale: null, severity: severityOf(rule, null) }); continue; }
    const byLoc = new Map();
    for (const f of list) { if (!byLoc.has(f.locale)) byLoc.set(f.locale, []); byLoc.get(f.locale).push(f); }
    for (const [loc, l] of byLoc) sections.push({ rule, list: l, locale: loc, severity: severityOf(rule, loc) });
  }
  const rank = { banned: 0, blocking: 1, warning: 2 };
  sections.sort((a, b) => (rank[a.severity] - rank[b.severity]) || (b.list.length - a.list.length));

  for (const { rule, list, locale, severity } of sections) {
    const blocks = severity === 'blocking';
    if (blocks && bites(rule)) blockingHit = true;
    if (severity === 'banned') banHit = true;
    const noun = rule === 'em-dash-touched' ? 'inherited on copy-edited page(s), must be cleared'
      : rule === 'em-dash-sibling' ? 'on untouched locale sibling(s) of a copy-edited English page'
        : 'introduced';
    const where = locale ? ` on ${locale} page(s)` : '';
    const pol = locale && DASH_FAMILY.has(rule) ? policyFor(locale, dash).policy : null;
    const label = severity === 'banned'
      ? `✗ BANNED   ${rule} - ${list.length} ${noun}${where} (forward-only, policy "${rule === 'spaced-hyphen' ? 'ban' : pol}"; fails even in shadow mode)`
      : `${blocks ? (bites(rule) ? '✗ BLOCKING' : '✗ would block') : '⚠ warning'}  ${rule} - ${list.length} ${noun}${where}${pol ? ` (policy "${pol}"${pol === 'review' ? ': reported only' : ''})` : ''}`;
    console.log(label);
    if (locale && DASH_FAMILY.has(rule) && severity !== 'warning' && replacementFor(rule, locale)) {
      console.log(`    write instead: ${replacementFor(rule, locale)}`);
    }

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
      const slots = [...new Set(fs_.map((x) => x.slot))].join(', ');
      console.log(`    · ${rel} (${fs_.length}) [${slots}]`);
      console.log(`        ${fs_[0].context.slice(0, 130)}`);
      if (fs_[0].parent) console.log(`        pulled in by: ${fs_[0].parent} (copy-edited in this branch)`);
      if (up) console.log(`        upstream: ${up.upstream} ← fix it there, not in the HTML`);
      if (ANNOTATE) {
        const lvl = severity === 'banned' || (blocks && bites(rule)) ? 'error' : 'warning';
        console.log(`::${lvl} file=${rel},title=EFR ${rule}${severity === 'banned' ? ' (banned)' : ''}::${fs_.length} ${noun}. ${fs_[0].context.slice(0, 160).replace(/\n/g, ' ')}${fs_[0].parent ? ` | pulled in by ${fs_[0].parent}` : ''}${up ? ` | upstream: ${up.upstream}` : ''}`);
      }
    }
    console.log('');
  }

  if (seoFindings.length) {
    const errs = seoFindings.filter((f) => f.severity === 'error');
    if (errs.length && bites('seo-preservation')) blockingHit = true;
    console.log(`${errs.length ? (bites('seo-preservation') ? '✗ BLOCKING' : '✗ would block') : '⚠ warning'}  seo-preservation - ${errs.length} error(s), ${seoFindings.length - errs.length} warning(s)`);
    for (const f of seoFindings.slice(0, MAX_SHOWN)) {
      console.log(`    ${f.severity === 'error' ? '✗' : '⚠'} ${f.rel}: ${f.rule} - ${f.detail}`);
      if (ANNOTATE) {
        console.log(`::${f.severity === 'error' && bites('seo-preservation') ? 'error' : 'warning'} file=${f.rel},title=SEO preservation (${f.rule})::${f.detail.replace(/\n/g, ' ')}`);
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
    console.log(`Reported, not failed - ${preExisting.length} finding(s) on pages this branch changed already`);
    console.log('existed at the merge base, this branch did not add to them, and either the page\'s own');
    console.log('copy was not edited or the rule is not the em-dash rule:');
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
  if (banHit) {
    console.log('  · A banned dash was introduced. Each BANNED block above names the locale\'s');
    console.log('    own replacement (data/em_dash_locale_policy.json, docs/em-dash-policy.md).');
  }
  console.log('  · A page whose copy this branch edits leaves with ZERO em dashes in its measured');
  console.log('    slots - cards included - and an English page pulls its locale siblings along,');
  console.log('    each under its own locale\'s policy (a native-dash locale is never pulled in).');
  console.log('    A colon when what follows explains; a full stop when it is a separate thought;');
  console.log('    a comma pair for an aside; parentheses for a true parenthetical. Never a hyphen swap.');
  console.log('  · Replace a generic claim with the fact behind it, not with a synonym.');
  console.log('    Google names "automated transformations like synonymizing" as scaled');
  console.log('    content abuse, so swapping words to lower a score moves the wrong way.');
  console.log('  · If a finding names an upstream file, fix it THERE. Editing the generated');
  console.log('    HTML is undone by the next generator run.');
  console.log('  · Never remove a search-protected term, a codepoint, an example or an');
  console.log('    internal link to clear a warning. That is a relevance loss, not a fix.');
  console.log('  · Rules, evidence and rollout stage: docs/editorial-footprint-risk.md');

  if (banHit) {
    console.log('\nA banned dash was introduced (see the BANNED sections above). Exiting 1 (the ban is not subject to shadow mode).');
    process.exit(1);
  }
  if (!ENFORCE) {
    console.log('\n[SHADOW MODE] Exiting 0. Re-run with --enforce to see this gate bite.');
    process.exit(0);
  }
  process.exit(blockingHit ? 1 : 0);
}

if (require.main === module) main();
module.exports = {
  BLOCKING, NEW_PAGE_PERCENTILE, REGRESSION_TOLERANCE, TOUCH_SLOTS,
  ruleOf, bites, parseEnforce, copyTouched, classifyHits, siblingObligations, isBanned
};
