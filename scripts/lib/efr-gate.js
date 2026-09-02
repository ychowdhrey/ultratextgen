#!/usr/bin/env node
'use strict';

/**
 * efr-gate.js
 *
 * The EFR Quality Gate: content-type detection from the page path, the
 * PASS / REVIEW / FAIL thresholds per section, the ratchet that decides what a
 * changed page may and may not do, the exception ledger, and the summary
 * statistics. Shared by the whole-site report (audit-efr.js), the per-PR gate
 * (check-efr.js) and the tests (efr-gate.test.js), so "PASS" can never mean two
 * different things in the two places it is printed — the same reason
 * editorial-footprint.js is shared by its audit and its gate.
 *
 * -- What EFR is here, and what this file does NOT do --------------------------
 * EFR is the Editorial Footprint Risk score produced by
 * scripts/lib/editorial-footprint.js: a 0-100 score over nine dimensions
 * (formulaic phrasing, formulaic syntax, generic openers, promotional
 * vagueness, specificity deficit, cross-page sameness, structural template
 * dependence, punctuation fingerprint, rhythm repetition), higher meaning
 * "reads more like a filled-in template than like something written about
 * this subject". This file does not change that measurement in any way. It
 * reads the score the model already produces and applies a policy to it.
 *
 * EFR is a diagnostic and publishing quality-control metric. It is not an SEO
 * ranking factor, and it is not an AI detector.
 *
 * -- The principle the ratchet encodes -----------------------------------------
 * EFR is not minimised indefinitely. The target is the MINIMUM editorial
 * footprint required to completely satisfy the query. A lower score bought by
 * deleting explanation, evidence, examples, methodology, caveats, tables,
 * instructions, exceptions or source context is not an improvement, so an
 * EFR drop that coincides with a depth loss (measured by the SEO Preservation
 * Gate in seo-snapshot.js) is reported as IMPROVED BY REMOVAL and is never
 * credited as a clean improvement. See docs/efr-quality-gate.md.
 *
 * -- Why the thresholds apply to English only (for now) -------------------------
 * Raw EFR scores are not comparable across locales: a locale page has no
 * English phrase rules, so those dimensions leave its denominator, which
 * raises its normalised score on identical inputs (measured:
 * fr/library/emojis-argent 41.1 vs its EN parent library/money-emojis 20.1).
 * docs/editorial-footprint-risk.md makes this a standing rule. So an absolute
 * threshold calibrated on English /updates/ and /guide/ pages is applied to
 * English pages only. A locale /updates/ or /guide/ page is still recognised,
 * scored and reported, and the ratchet's SELF-comparison rules (a page against
 * its own previous version, in the same corpus) still apply to it, because a
 * page compared with itself never crosses a locale boundary. Its absolute
 * status is UNCALIBRATED until a per-locale threshold is derived.
 */

const fs = require('fs');
const path = require('path');
const { classifyPath } = require('./editorial-corpus');

const ROOT = path.resolve(__dirname, '..', '..');
const EXCEPTIONS_PATH = path.join(ROOT, 'data', 'efr_exceptions.json');
const BASELINE_PATH = path.join(ROOT, 'data', 'editorial_footprint_baseline.json');

/**
 * Section thresholds. Set by the user on 2026-09-02, recorded as indicative
 * (open to revision once a month of real PRs has run through the gate).
 *
 * `pass` is inclusive: a page AT the threshold passes. `review` is the upper
 * edge of the REVIEW band, also inclusive. Above it is FAIL. `severe` labels
 * the band the user named separately; it does not change the status.
 *
 * `bands` is the interpretation printed next to a score, low edge exclusive
 * and high edge inclusive, in ascending order.
 */
const THRESHOLDS = {
  updates: {
    label: 'Updates',
    pass: 5.0,
    review: 7.0,
    severe: 10.0,
    bands: [
      { upTo: 3.0, label: 'exceptional' },
      { upTo: 5.0, label: 'target' },
      { upTo: 7.0, label: 'review' },
      { upTo: 10.0, label: 'fail / editorial rewrite required' },
      { upTo: Infinity, label: 'severe editorial footprint' }
    ]
  },
  guide: {
    label: 'Guides',
    pass: 7.0,
    review: 8.0,
    severe: 10.0,
    bands: [
      { upTo: 4.0, label: 'very concise; check that useful teaching depth has not been removed' },
      { upTo: 6.0, label: 'excellent' },
      { upTo: 7.0, label: 'target' },
      { upTo: 8.0, label: 'review' },
      { upTo: 10.0, label: 'fail / editorial rewrite required' },
      { upTo: Infinity, label: 'severe editorial footprint' }
    ]
  }
};

/**
 * The smallest score increase the ratchet treats as material, in EFR points.
 *
 * This is NOT a noise allowance. The score is deterministic: the MinHash
 * permutations are seeded from a fixed string, and re-scoring 4,619 unchanged
 * pages against the committed baseline reproduced every score to the decimal
 * (measured 2026-09-02). The gate also scores the before and after versions of
 * a page in ONE corpus context, so cohort medians and neighbours are identical
 * on both sides and the delta is the page's own change and nothing else.
 *
 * What the allowance absorbs instead is the denominator effect of adding a
 * plain sentence: every lexical dimension is a rate per 1,000 words, so a
 * 50-word caveat that carries no concrete marker nudges the specificity
 * deficit up by ~0.3 on a 1,000-word /updates/ page (measured: +500 filler
 * words moved lienquan-mobile-name-penalty-update +3.0). One added formulaic
 * construction is larger than that: +5 em dashes on a ~1,000-word /updates/
 * page measured +3.3 to +4.0, i.e. ~0.7 each, so a single one crosses 0.5 and
 * is caught. On a 1,800-word guide one em dash is ~0.2 and two or three are
 * needed to trip it — which is the intended reading of "materially".
 */
const MATERIAL_DELTA = 0.5;

/**
 * SEO Preservation rules whose presence on an EFR-improving edit means the
 * improvement may have been bought by removing something the page needed.
 *
 * Errors block the improvement; warnings withhold credit and ask for review.
 * The split was set by replaying the real 2026-09-01 /updates/ rewrite through
 * the gate (57 pages, 11 English):
 *
 *   · `concrete-fact-lost` and `internal-link-lost` are objective and
 *     language-neutral — a codepoint, a version, a limit or a link either
 *     survives the edit or it does not — so they block.
 *   · `protected-term-lost` is a WARNING here, not an error. It fired on nine
 *     locale siblings for losing the English words "codepoint" and "unicode"
 *     when a table with English headers became translated prose, which is a
 *     translation, not a relevance loss. The SEO Preservation Gate
 *     (check-editorial-footprint.js) still treats it as an error on its own
 *     terms once promoted from shadow mode; this gate does not pre-empt that.
 *   · `heading-changed` is deliberately NOT in either set. It counts headings
 *     whose text changed, so it fired 7-8 times on every rewritten page — the
 *     de-templating renamed every H2 on purpose. A rename is not a removal.
 *   · `depth-reduced` (body shrank by more than 25%), `example-removed`
 *     (a copy payload, code sample or table cell is gone) and
 *     `faq-question-changed` are the shapes the principle names — tables,
 *     examples, instructions, exceptions — so they withhold credit and ask a
 *     human to confirm the depth was surplus.
 */
const REMOVAL_ERRORS = new Set(['concrete-fact-lost', 'internal-link-lost']);
const REMOVAL_WARNINGS = new Set(['protected-term-lost', 'depth-reduced', 'example-removed', 'faq-question-changed']);

// -- content type -----------------------------------------------------------

/**
 * Classify a repository-relative path.
 *
 * Returns { contentType, section, locale, hub, calibrated, thresholds, reason }.
 *   contentType  'updates' | 'guide' | 'unclassified'
 *   section      the THRESHOLDS key when contentType is updates/guide
 *   calibrated   true only for an English entry page: thresholds apply
 *   hub          true for updates/index.html and guide/index.html
 *
 * The repository's guide directory is `guide/`, not `guides/`; both are
 * accepted on input so a route written the natural way still resolves.
 */
function classifyContent(relPath) {
  const rel = String(relPath).replace(/^\.?\//, '').replace(/\/$/, '/index.html');
  const meta = classifyPath(rel.endsWith('.html') ? rel : `${rel}/index.html`);
  const dirNoLocale = meta.dir;
  const base = {
    rel: meta.rel, locale: meta.locale, family: meta.family,
    route: `/${meta.rel.replace(/index\.html$/, '')}`
  };

  const familyToSection = { updates: 'updates', guide: 'guide' };
  const section = familyToSection[meta.family] || null;
  if (!section) {
    return Object.assign(base, {
      contentType: 'unclassified', section: null, hub: false, calibrated: false, thresholds: null,
      reason: `no EFR threshold is defined for the "${meta.family}" family`
    });
  }
  const hub = dirNoLocale === section;
  if (hub) {
    return Object.assign(base, {
      contentType: 'unclassified', section, hub: true, calibrated: false, thresholds: null,
      reason: `${section} hub index: a card listing, not an entry — no threshold applies`
    });
  }
  if (meta.locale !== 'en') {
    return Object.assign(base, {
      contentType: section, section, hub: false, calibrated: false, thresholds: null,
      reason: `raw EFR is not comparable across locales; the ${THRESHOLDS[section].label} thresholds are calibrated on English pages only`
    });
  }
  return Object.assign(base, {
    contentType: section, section, hub: false, calibrated: true, thresholds: THRESHOLDS[section],
    reason: null
  });
}

// -- status -----------------------------------------------------------------

/** PASS / REVIEW / FAIL for a calibrated section, plus the interpretation band. */
function statusFor(section, score) {
  const t = THRESHOLDS[section];
  if (!t) return { status: 'UNCLASSIFIED', band: null };
  if (score === null || score === undefined) return { status: 'NOT SCORED', band: null };
  const band = t.bands.find((b) => score <= b.upTo).label;
  if (score <= t.pass) return { status: 'PASS', band };
  if (score <= t.review) return { status: 'REVIEW', band };
  return { status: 'FAIL', band };
}

/** The status a score would have if the section's thresholds applied — used for UNCALIBRATED rows. */
function statusLabel(cls, score) {
  if (score === null || score === undefined) return 'NOT SCORED';
  if (cls.calibrated) return statusFor(cls.section, score).status;
  if (cls.section && !cls.hub) return 'UNCALIBRATED';
  return 'UNCLASSIFIED';
}

/** Compact "why this score" line from a scorePage() result. */
function contributors(result) {
  if (!result || !result.dimensions) return '';
  const dims = Object.entries(result.dimensions)
    .filter(([, v]) => v !== null && v >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k} ${v.toFixed(1)}`);
  const c = result.counts || {};
  const counts = [];
  if (c.emdash !== undefined) counts.push(`${c.emdash} em dash${c.emdash === 1 ? '' : 'es'}`);
  if (c.distinctSpecificFacts !== undefined) counts.push(`${c.distinctSpecificFacts} distinct fact${c.distinctSpecificFacts === 1 ? '' : 's'}`);
  if (c.triads !== null && c.triads !== undefined) counts.push(`${c.triads} three-item list${c.triads === 1 ? '' : 's'}`);
  if (c.stronglyDiscouraged) counts.push(`${c.stronglyDiscouraged} formulaic phrase${c.stronglyDiscouraged === 1 ? '' : 's'}`);
  if (c.rhetoricalQuestions) counts.push(`${c.rhetoricalQuestions} rhetorical question${c.rhetoricalQuestions === 1 ? '' : 's'}`);
  if (result.structureSharedWith) counts.push(`shape shared with ${result.structureSharedWith} sibling${result.structureSharedWith === 1 ? '' : 's'}`);
  if (result.nearest && result.nearest.jaccard >= 0.5) counts.push(`nearest page Jaccard ${result.nearest.jaccard}`);
  return `${dims.join(', ') || 'no dimension at or above 0.5'} · ${counts.join(', ')}`;
}

// -- exceptions -------------------------------------------------------------

const ROUTE_RX = /^\/(?:[a-z0-9-]+\/)+$/;
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate the exception ledger. Returns { exceptions, errors }. Errors are
 * strings; a ledger with errors is refused by the gate rather than partially
 * honoured, because a malformed entry silently suppressing a result is worse
 * than no entry.
 */
function validateExceptions(raw) {
  const errors = [];
  const list = Array.isArray(raw && raw.exceptions) ? raw.exceptions : null;
  if (!list) return { exceptions: [], errors: ['ledger has no "exceptions" array'] };
  const seen = new Set();
  list.forEach((e, i) => {
    const where = `entry ${i + 1}${e && e.page ? ` (${e.page})` : ''}`;
    if (!e || typeof e !== 'object') { errors.push(`${where}: not an object`); return; }
    if (typeof e.page !== 'string' || !ROUTE_RX.test(e.page)) {
      errors.push(`${where}: "page" must be one route with leading and trailing slash (no wildcards, no directory-level exceptions)`);
    } else if (/\/(?:updates|guide)\/$/.test(e.page) && e.page.split('/').length <= 4) {
      // "/updates/" or "/de/guide/" — a whole section, which the ledger refuses.
      errors.push(`${where}: "${e.page}" is a section, not a page — directory-level exceptions are not allowed`);
    }
    if (seen.has(e.page)) errors.push(`${where}: duplicate entry for ${e.page}`);
    seen.add(e.page);
    if (typeof e.efr !== 'number' || !(e.efr >= 0)) errors.push(`${where}: "efr" must be the page's EFR at the time the exception was agreed`);
    if (typeof e.reason !== 'string' || e.reason.trim().length < 20) errors.push(`${where}: "reason" must explain why the higher EFR is justified (20+ characters)`);
    if (typeof e.owner !== 'string' || !e.owner.trim()) errors.push(`${where}: "owner" (who agreed it, or the source) is required`);
    if (typeof e.agreed !== 'string' || !DATE_RX.test(e.agreed)) errors.push(`${where}: "agreed" must be a YYYY-MM-DD date`);
    if (e.reviewBy !== undefined && e.reviewBy !== null && (typeof e.reviewBy !== 'string' || !DATE_RX.test(e.reviewBy))) {
      errors.push(`${where}: "reviewBy" must be a YYYY-MM-DD date when present`);
    }
  });
  return { exceptions: errors.length ? [] : list, errors };
}

function loadExceptions(p = EXCEPTIONS_PATH) {
  if (!fs.existsSync(p)) return { exceptions: [], errors: [] };
  let raw;
  try { raw = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { exceptions: [], errors: [`${p}: ${e.message}`] }; }
  return validateExceptions(raw);
}

/**
 * Does an exception cover this page at this score today?
 *
 * Three states, all reported rather than silent:
 *   active   - covers the page; the gate does not block on it
 *   expired  - reviewBy has passed; the normal rules apply again
 *   exceeded - the page is now above the EFR the exception was agreed at
 *              (plus the material allowance); the exception covered that
 *              score, not a further regression
 */
function exceptionFor(route, score, exceptions, today = new Date().toISOString().slice(0, 10)) {
  const e = (exceptions || []).find((x) => x.page === route);
  if (!e) return null;
  let state = 'active';
  if (e.reviewBy && today > e.reviewBy) state = 'expired';
  else if (score !== null && score !== undefined && score > e.efr + MATERIAL_DELTA) state = 'exceeded';
  return { entry: e, state };
}

// -- the ratchet ------------------------------------------------------------

/**
 * Decide what a changed page did, and whether that is allowed.
 *
 * Inputs:
 *   cls        classifyContent() result
 *   after      score of the page as it is now (number, or null if not scored)
 *   before     score of the page at the merge base, scored in the SAME corpus
 *              context, or null when the page is new / was not scorable
 *   depth      SEO Preservation findings from compare(before, after) — the
 *              depth counterweight; [] when unknown
 *   exception  exceptionFor() result or null
 *
 * Output: { verdict: 'OK'|'WARN'|'BLOCK', code, headline, notes[] }
 *
 * Codes:
 *   NEW-PASS, NEW-ABOVE-TARGET, UNCHANGED, IMPROVED, RESOLVED,
 *   IMPROVED-STILL-ABOVE-TARGET, IMPROVED-BY-REMOVAL, MINOR-REGRESSION,
 *   REGRESSION, REGRESSION-PAST-TARGET, NEW-FAILURE, EXCEPTION, NOT-SCORED,
 *   UNCLASSIFIED
 */
function ratchet({ cls, after, before, depth = [], exception = null }) {
  const notes = [];
  const t = cls.thresholds;

  if (cls.contentType === 'unclassified') {
    return { verdict: 'OK', code: 'UNCLASSIFIED', headline: 'UNCLASSIFIED — reported, no threshold applies', notes: [cls.reason] };
  }
  if (after === null || after === undefined) {
    return { verdict: 'OK', code: 'NOT-SCORED', headline: 'NOT SCORED — below the 120-word prose floor', notes: ['rates are not meaningful on a page this short; nothing to gate'] };
  }

  const isNew = before === null || before === undefined;
  const delta = isNew ? null : +(after - before).toFixed(1);
  const afterStatus = cls.calibrated ? statusFor(cls.section, after).status : null;
  const beforeStatus = cls.calibrated && !isNew ? statusFor(cls.section, before).status : null;

  // Depth counterweight: only evaluated when the score went DOWN, because
  // that is the only case where a lower number could be mistaken for a win.
  const removalErrors = depth.filter((f) => f.severity === 'error' && REMOVAL_ERRORS.has(f.rule));
  const removalWarnings = depth.filter((f) => REMOVAL_WARNINGS.has(f.rule));

  const applyException = (base) => {
    if (!exception) return base;
    if (exception.state === 'active') {
      return {
        verdict: base.verdict === 'BLOCK' ? 'WARN' : base.verdict,
        code: 'EXCEPTION',
        headline: `${base.headline} — covered by a recorded exception`,
        notes: [...base.notes,
          `exception: agreed ${exception.entry.agreed} by ${exception.entry.owner} at EFR ${exception.entry.efr}${exception.entry.reviewBy ? `, review by ${exception.entry.reviewBy}` : ''}`,
          `reason: ${exception.entry.reason}`]
      };
    }
    const why = exception.state === 'expired'
      ? `exception expired on ${exception.entry.reviewBy}; the normal rules apply until it is re-agreed`
      : `exception was agreed at EFR ${exception.entry.efr}; the page is now ${after}, beyond the ${MATERIAL_DELTA} allowance, so it does not cover this`;
    return { ...base, notes: [...base.notes, why] };
  };

  // ---- new page ------------------------------------------------------------
  if (isNew) {
    if (!cls.calibrated) {
      return { verdict: 'OK', code: 'NEW-PASS', headline: 'NEW PAGE — UNCALIBRATED (locale)', notes: [cls.reason, 'no absolute threshold applied; the page will be ratcheted against its own future edits'] };
    }
    if (afterStatus === 'PASS') {
      return { verdict: 'OK', code: 'NEW-PASS', headline: `NEW PAGE — PASS (<= ${t.pass})`, notes };
    }
    return applyException({
      verdict: 'BLOCK', code: 'NEW-ABOVE-TARGET',
      headline: `NEW PAGE ABOVE TARGET — ${afterStatus}`,
      notes: [`a new ${t.label} page must meet the PASS threshold (<= ${t.pass}); this one is ${after}`]
    });
  }

  // ---- existing page: score went up ---------------------------------------
  if (delta > 0) {
    if (cls.calibrated && beforeStatus === 'PASS' && afterStatus !== 'PASS') {
      return applyException({
        verdict: 'BLOCK', code: 'REGRESSION-PAST-TARGET',
        headline: `REGRESSION PAST TARGET — was PASS, now ${afterStatus}`,
        notes: [`a page already at or below ${t.pass} may not be pushed above it (${before} -> ${after}, +${delta})`]
      });
    }
    if (delta >= MATERIAL_DELTA) {
      const base = cls.calibrated
        ? { headline: `REGRESSION — ${afterStatus}`, note: `an existing page got materially worse (+${delta} >= ${MATERIAL_DELTA})${afterStatus === 'PASS' ? '; still within PASS, but the ratchet holds' : ''}` }
        : { headline: 'REGRESSION — UNCALIBRATED (locale)', note: `the page got materially worse against its own previous version (+${delta} >= ${MATERIAL_DELTA}); the self-comparison rule applies to every locale` };
      // Within PASS, a material rise is a warning: the target is still met.
      const verdict = cls.calibrated && afterStatus === 'PASS' ? 'WARN' : 'BLOCK';
      return applyException({ verdict, code: 'REGRESSION', headline: base.headline, notes: [base.note] });
    }
    return {
      verdict: 'WARN', code: 'MINOR-REGRESSION',
      headline: `MINOR REGRESSION — ${afterStatus || 'UNCALIBRATED'}`,
      notes: [`+${delta}, below the ${MATERIAL_DELTA} material allowance; reported, not failed`]
    };
  }

  // ---- existing page: unchanged -------------------------------------------
  if (delta === 0) {
    return { verdict: 'OK', code: 'UNCHANGED', headline: `UNCHANGED — ${afterStatus || 'UNCALIBRATED'}`, notes: cls.calibrated && afterStatus !== 'PASS' ? [`still above the ${t.label} target (<= ${t.pass}); no regression`] : [] };
  }

  // ---- existing page: score went down -------------------------------------
  if (removalErrors.length) {
    return applyException({
      verdict: 'BLOCK', code: 'IMPROVED-BY-REMOVAL',
      headline: 'IMPROVED BY REMOVAL — not accepted',
      notes: [
        `EFR fell ${before} -> ${after} (${delta}), but the edit removed content the page needed:`,
        ...removalErrors.map((f) => `  ${f.rule}: ${f.detail}`),
        'a lower score bought by deleting facts or internal links is a relevance loss, not an improvement'
      ]
    });
  }
  const removalNotes = removalWarnings.length
    ? ['this improvement is NOT credited until depth is reviewed:', ...removalWarnings.map((f) => `  ${f.rule}: ${f.detail}`)]
    : [];
  if (!cls.calibrated) {
    return { verdict: removalWarnings.length ? 'WARN' : 'OK', code: removalWarnings.length ? 'IMPROVED-BY-REMOVAL' : 'IMPROVED', headline: `IMPROVED — UNCALIBRATED (locale)${removalWarnings.length ? ', verify depth' : ''}`, notes: [`${before} -> ${after} (${delta})`, ...removalNotes] };
  }
  if (afterStatus === 'PASS') {
    const resolved = beforeStatus !== 'PASS';
    return {
      verdict: removalWarnings.length ? 'WARN' : 'OK',
      code: removalWarnings.length ? 'IMPROVED-BY-REMOVAL' : (resolved ? 'RESOLVED' : 'IMPROVED'),
      headline: `${resolved ? 'RESOLVED' : 'IMPROVED'} — PASS${removalWarnings.length ? ' (verify depth)' : ''}`,
      notes: [`${before} -> ${after} (${delta})`, ...removalNotes]
    };
  }
  return {
    verdict: 'WARN',
    code: removalWarnings.length ? 'IMPROVED-BY-REMOVAL' : 'IMPROVED-STILL-ABOVE-TARGET',
    headline: `IMPROVED BUT STILL FAILING TARGET — ${afterStatus}${removalWarnings.length ? ' (verify depth)' : ''}`,
    notes: [`${before} -> ${after} (${delta}); target <= ${t.pass}`, 'not a regression: the ratchet holds at the new, lower score', ...removalNotes]
  };
}

// -- statistics -------------------------------------------------------------

function stats(scores) {
  const v = scores.filter((x) => x !== null && x !== undefined).slice().sort((a, b) => a - b);
  if (!v.length) return { n: 0, mean: null, median: null, p90: null, max: null };
  const mean = +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const m = v.length % 2 ? v[(v.length - 1) / 2] : +((v[v.length / 2 - 1] + v[v.length / 2]) / 2).toFixed(2);
  return { n: v.length, mean, median: m, p90: q(0.9), max: v[v.length - 1] };
}

/** Summary for one calibrated section over rows { score, status }. */
function summarize(rows) {
  const counts = { PASS: 0, REVIEW: 0, FAIL: 0 };
  for (const r of rows) if (counts[r.status] !== undefined) counts[r.status]++;
  return { pages: rows.length, ...counts, ...stats(rows.map((r) => r.score)) };
}

/** Load the committed whole-site baseline, if present, with its date from git. */
function loadBaseline(p = BASELINE_PATH) {
  if (!fs.existsSync(p)) return null;
  let raw;
  try { raw = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
  let date = null;
  try {
    date = require('child_process').execFileSync('git', ['log', '-1', '--format=%cs', '--', p], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { date = null; }
  return { pages: raw.pages || {}, date, bankVersion: raw.bankVersion || null };
}

module.exports = {
  THRESHOLDS, MATERIAL_DELTA, REMOVAL_ERRORS, REMOVAL_WARNINGS, EXCEPTIONS_PATH, BASELINE_PATH,
  classifyContent, statusFor, statusLabel, contributors,
  validateExceptions, loadExceptions, exceptionFor,
  ratchet, stats, summarize, loadBaseline
};
