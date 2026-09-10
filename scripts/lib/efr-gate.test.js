#!/usr/bin/env node
'use strict';

/**
 * efr-gate.test.js
 *
 * Run: node scripts/lib/efr-gate.test.js   (npm run test:efr)
 *
 * Zero dependencies, no framework — the same idiom as
 * editorial-footprint.test.js and js/counter/counterRules.test.js.
 *
 * WHY THIS HAS TESTS. The gate can fail a pull request over a number, so every
 * boundary (5.0 passes, 5.1 does not), every ratchet outcome, and every
 * exception state is pinned here. The deliberate NON-blocks matter as much as
 * the blocks: an improvement that is still above target must never read as a
 * regression, and the user's own worked example (11.5 -> 8.2 is IMPROVED BUT
 * STILL FAILING TARGET, not the same as 11.5 -> 12.5) is asserted verbatim.
 */

const assert = require('assert');
const G = require('./efr-gate');

let pass = 0, fail = 0;
const results = [];
function t(name, fn) {
  try { fn(); pass++; results.push(`  ok   ${name}`); }
  catch (e) { fail++; results.push(`  FAIL ${name}\n         ${e.message.split('\n')[0]}`); }
}

const updates = G.classifyContent('updates/example-page/index.html');
const guide = G.classifyContent('guide/example-guide/index.html');
const ratchet = (cls, after, before, extra = {}) => G.ratchet({ cls, after, before, ...extra });

// ── 1. content type from the path ──────────────────────────────────────────

t('/updates/<slug>/ is the updates content type, calibrated', () => {
  assert.strictEqual(updates.contentType, 'updates');
  assert.strictEqual(updates.calibrated, true);
  assert.strictEqual(updates.thresholds.pass, 5.0);
  assert.strictEqual(updates.route, '/updates/example-page/');
});

t('/guide/<slug>/ is the guide content type, calibrated (the directory is guide/, not guides/)', () => {
  assert.strictEqual(guide.contentType, 'guide');
  assert.strictEqual(guide.calibrated, true);
  assert.strictEqual(guide.thresholds.pass, 7.0);
});

t('a route with a trailing slash resolves the same as the file path', () => {
  assert.strictEqual(G.classifyContent('/updates/example-page/').rel, updates.rel);
});

t('a locale updates/guide page is recognised but UNCALIBRATED — no absolute threshold', () => {
  const de = G.classifyContent('de/updates/unicode-18-beta-startet/index.html');
  assert.strictEqual(de.contentType, 'updates');
  assert.strictEqual(de.locale, 'de');
  assert.strictEqual(de.calibrated, false);
  assert.strictEqual(de.thresholds, null);
  assert.ok(/not comparable across locales/.test(de.reason));
});

t('the section hubs are unclassified — a card listing is not an entry', () => {
  for (const rel of ['updates/index.html', 'guide/index.html', 'ko/guide/index.html']) {
    const c = G.classifyContent(rel);
    assert.strictEqual(c.contentType, 'unclassified', rel);
    assert.strictEqual(c.hub, true, rel);
  }
});

t('other families are unclassified and get no threshold', () => {
  for (const rel of ['answers/is-linkedin-bold-text-safe/index.html', 'library/currency-symbols/index.html', 'symbol/euro-sign/index.html', 'index.html', 'discord/index.html']) {
    const c = G.classifyContent(rel);
    assert.strictEqual(c.contentType, 'unclassified', rel);
    assert.strictEqual(c.section, null, rel);
  }
});

// ── 2. status boundaries ───────────────────────────────────────────────────

t('Updates: PASS <= 5, REVIEW <= 7, FAIL > 7 — boundaries inclusive', () => {
  assert.strictEqual(G.statusFor('updates', 0).status, 'PASS');
  assert.strictEqual(G.statusFor('updates', 5.0).status, 'PASS');
  assert.strictEqual(G.statusFor('updates', 5.1).status, 'REVIEW');
  assert.strictEqual(G.statusFor('updates', 7.0).status, 'REVIEW');
  assert.strictEqual(G.statusFor('updates', 7.1).status, 'FAIL');
  assert.strictEqual(G.statusFor('updates', 10.1).status, 'FAIL');
});

t('Guides: PASS <= 7, REVIEW <= 8, FAIL > 8 — boundaries inclusive', () => {
  assert.strictEqual(G.statusFor('guide', 7.0).status, 'PASS');
  assert.strictEqual(G.statusFor('guide', 7.1).status, 'REVIEW');
  assert.strictEqual(G.statusFor('guide', 8.0).status, 'REVIEW');
  assert.strictEqual(G.statusFor('guide', 8.1).status, 'FAIL');
});

t('interpretation bands match the policy, including the severe band', () => {
  assert.strictEqual(G.statusFor('updates', 2.9).band, 'exceptional');
  assert.strictEqual(G.statusFor('updates', 4.0).band, 'target');
  assert.strictEqual(G.statusFor('updates', 6.0).band, 'review');
  assert.strictEqual(G.statusFor('updates', 8.0).band, 'fail / editorial rewrite required');
  assert.strictEqual(G.statusFor('updates', 10.1).band, 'severe editorial footprint');
  assert.ok(/check that useful teaching depth/.test(G.statusFor('guide', 3.0).band), 'a very concise guide asks for a depth check');
  assert.strictEqual(G.statusFor('guide', 5.0).band, 'excellent');
  assert.strictEqual(G.statusFor('guide', 6.5).band, 'target');
  assert.strictEqual(G.statusFor('guide', 7.5).band, 'review');
  assert.strictEqual(G.statusFor('guide', 9.0).band, 'fail / editorial rewrite required');
  assert.strictEqual(G.statusFor('guide', 12).band, 'severe editorial footprint');
});

t('an unscored page is NOT SCORED, never PASS', () => {
  assert.strictEqual(G.statusFor('updates', null).status, 'NOT SCORED');
  assert.strictEqual(G.statusLabel(updates, null), 'NOT SCORED');
  assert.strictEqual(G.statusLabel(G.classifyContent('de/guide/x/index.html'), 3.0), 'UNCALIBRATED');
});

// ── 3. the ratchet ─────────────────────────────────────────────────────────

t('new page at or below PASS is OK', () => {
  assert.strictEqual(ratchet(updates, 5.0, null).verdict, 'OK');
  assert.strictEqual(ratchet(updates, 5.0, null).code, 'NEW-PASS');
});

t('new page above PASS blocks — even in the REVIEW band', () => {
  const r = ratchet(updates, 5.4, null);
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.strictEqual(r.code, 'NEW-ABOVE-TARGET');
  assert.strictEqual(ratchet(guide, 9.2, null).verdict, 'BLOCK');
});

t('an existing PASS page pushed above PASS blocks, whatever the delta', () => {
  const r = ratchet(updates, 5.1, 4.9);
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.strictEqual(r.code, 'REGRESSION-PAST-TARGET');
});

t('an existing page above PASS that gets materially worse blocks (the user\'s 6.9 -> 8.4 example)', () => {
  const r = ratchet(updates, 8.4, 6.9);
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.strictEqual(r.code, 'REGRESSION');
  assert.ok(r.notes.some((n) => n.includes('+1.5')));
});

t('11.5 -> 12.5 is a regression; 11.5 -> 8.2 is IMPROVED BUT STILL FAILING TARGET — they are not the same', () => {
  const worse = ratchet(updates, 12.5, 11.5);
  const better = ratchet(updates, 8.2, 11.5);
  assert.strictEqual(worse.verdict, 'BLOCK');
  assert.strictEqual(worse.code, 'REGRESSION');
  assert.strictEqual(better.verdict, 'WARN');
  assert.strictEqual(better.code, 'IMPROVED-STILL-ABOVE-TARGET');
  assert.ok(/IMPROVED BUT STILL FAILING TARGET/.test(better.headline));
  assert.ok(better.notes.some((n) => n.includes('-3.3')), 'the improvement is stated');
});

t('a rise below the material allowance is a warning, not a block', () => {
  const r = ratchet(updates, 9.8, 9.5);
  assert.strictEqual(r.verdict, 'WARN');
  assert.strictEqual(r.code, 'MINOR-REGRESSION');
});

t('exactly the material allowance is material', () => {
  assert.strictEqual(ratchet(guide, 9.5, 9.0).verdict, 'BLOCK');
});

t('a material rise that stays within PASS warns rather than blocks — the target is still met', () => {
  const r = ratchet(guide, 4.6, 1.2);
  assert.strictEqual(r.verdict, 'WARN');
  assert.strictEqual(r.code, 'REGRESSION');
});

t('unchanged score is OK, and says so when the page is still above target', () => {
  const r = ratchet(updates, 9.4, 9.4);
  assert.strictEqual(r.verdict, 'OK');
  assert.strictEqual(r.code, 'UNCHANGED');
  assert.ok(r.notes.some((n) => /still above/.test(n)));
});

t('an improvement that lands at PASS from above is RESOLVED', () => {
  const r = ratchet(updates, 4.8, 6.1);
  assert.strictEqual(r.verdict, 'OK');
  assert.strictEqual(r.code, 'RESOLVED');
  assert.strictEqual(ratchet(updates, 2.0, 4.0).code, 'IMPROVED');
});

t('an unscored page (below the prose floor) is never gated', () => {
  assert.strictEqual(ratchet(updates, null, 6.0).code, 'NOT-SCORED');
  assert.strictEqual(ratchet(updates, null, 6.0).verdict, 'OK');
});

t('unclassified content is reported, never gated', () => {
  const r = ratchet(G.classifyContent('answers/x/index.html'), 30, 2);
  assert.strictEqual(r.verdict, 'OK');
  assert.strictEqual(r.code, 'UNCLASSIFIED');
});

// ── 4. locale pages: self-comparison only ──────────────────────────────────

t('a locale page gets no absolute verdict but is ratcheted against itself', () => {
  const ko = G.classifyContent('ko/updates/unicode-18-beta-sijak/index.html');
  assert.strictEqual(ratchet(ko, 29.1, null).verdict, 'OK', 'new locale page: no threshold applies');
  assert.strictEqual(ratchet(ko, 31.0, 29.1).verdict, 'BLOCK', 'material self-regression still blocks');
  assert.strictEqual(ratchet(ko, 31.0, 29.1).code, 'REGRESSION');
  assert.strictEqual(ratchet(ko, 25.0, 29.1).verdict, 'OK');
  assert.strictEqual(ratchet(ko, 25.0, 29.1).code, 'IMPROVED');
});

// ── 5. improvement bought by removal is not an improvement ─────────────────

t('an EFR drop that lost a concrete fact or an internal link blocks as IMPROVED BY REMOVAL', () => {
  for (const rule of ['concrete-fact-lost', 'internal-link-lost']) {
    const r = ratchet(updates, 4.0, 9.0, { depth: [{ severity: 'error', rule, detail: 'x' }] });
    assert.strictEqual(r.verdict, 'BLOCK', rule);
    assert.strictEqual(r.code, 'IMPROVED-BY-REMOVAL', rule);
  }
});

t('an EFR drop with a depth warning is withheld credit, not blocked', () => {
  for (const f of [
    { severity: 'warning', rule: 'depth-reduced', detail: 'body shrank 1800 -> 900 words (50%)' },
    { severity: 'warning', rule: 'example-removed', detail: '4 concrete example/payload removed' },
    { severity: 'error', rule: 'protected-term-lost', detail: 'codepoint' }   // an error in the SEO gate, a warning here
  ]) {
    const r = ratchet(guide, 5.0, 9.0, { depth: [f] });
    assert.strictEqual(r.verdict, 'WARN', f.rule);
    assert.strictEqual(r.code, 'IMPROVED-BY-REMOVAL', f.rule);
    assert.ok(r.notes.some((n) => /NOT credited/.test(n)), f.rule);
  }
});

t('a renamed heading is not a removal — the 2026-09-01 rewrite renamed every H2 on purpose', () => {
  const r = ratchet(updates, 4.0, 9.0, { depth: [{ severity: 'warning', rule: 'heading-changed', detail: '8 heading(s) changed or removed' }] });
  assert.strictEqual(r.code, 'RESOLVED');
  assert.strictEqual(r.verdict, 'OK');
});

t('depth findings are ignored when the score did not fall — the SEO gate owns that case', () => {
  const r = ratchet(updates, 9.4, 9.4, { depth: [{ severity: 'error', rule: 'concrete-fact-lost', detail: 'x' }] });
  assert.strictEqual(r.code, 'UNCHANGED');
});

t('an unrelated SEO error (a title change) does not turn an improvement into removal', () => {
  const r = ratchet(updates, 4.0, 9.0, { depth: [{ severity: 'error', rule: 'title-changed', detail: 'x' }] });
  assert.strictEqual(r.code, 'RESOLVED');
});

// ── 6. exceptions ──────────────────────────────────────────────────────────

const EX = [{ page: '/updates/example-page/', efr: 8.4, reason: 'the depth this page needs is not in the fact vocabulary', owner: 'Yasir', agreed: '2026-09-02', reviewBy: '2026-12-01' }];

t('an active exception downgrades a block to a visible warning and names itself', () => {
  const ex = G.exceptionFor('/updates/example-page/', 8.4, EX, '2026-09-10');
  assert.strictEqual(ex.state, 'active');
  const r = ratchet(updates, 8.4, null, { exception: ex });
  assert.strictEqual(r.verdict, 'WARN');
  assert.strictEqual(r.code, 'EXCEPTION');
  assert.ok(r.notes.some((n) => /agreed 2026-09-02 by Yasir/.test(n)));
});

t('an expired exception no longer covers the page', () => {
  const ex = G.exceptionFor('/updates/example-page/', 8.4, EX, '2026-12-02');
  assert.strictEqual(ex.state, 'expired');
  const r = ratchet(updates, 8.4, null, { exception: ex });
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.ok(r.notes.some((n) => /expired/.test(n)));
});

t('an exception covers the score it was agreed at, not a further regression', () => {
  assert.strictEqual(G.exceptionFor('/updates/example-page/', 8.9, EX, '2026-09-10').state, 'active', 'within the 0.5 allowance');
  const ex = G.exceptionFor('/updates/example-page/', 12.0, EX, '2026-09-10');
  assert.strictEqual(ex.state, 'exceeded');
  assert.strictEqual(ratchet(updates, 12.0, 8.4, { exception: ex }).verdict, 'BLOCK');
});

t('no exception for a different route', () => {
  assert.strictEqual(G.exceptionFor('/updates/other-page/', 8.4, EX), null);
});

t('the ledger refuses wildcards, whole sections, missing fields and bad dates', () => {
  const bad = (e) => G.validateExceptions({ exceptions: [e] }).errors.length > 0;
  assert.ok(bad({ page: '/updates/*', efr: 8, reason: 'x'.repeat(30), owner: 'o', agreed: '2026-09-02' }), 'wildcard');
  assert.ok(bad({ page: '/updates/', efr: 8, reason: 'x'.repeat(30), owner: 'o', agreed: '2026-09-02' }), 'whole section');
  assert.ok(bad({ page: '/de/guide/', efr: 8, reason: 'x'.repeat(30), owner: 'o', agreed: '2026-09-02' }), 'whole locale section');
  assert.ok(bad({ page: '/updates/x/', reason: 'x'.repeat(30), owner: 'o', agreed: '2026-09-02' }), 'missing efr');
  assert.ok(bad({ page: '/updates/x/', efr: 8, reason: 'short', owner: 'o', agreed: '2026-09-02' }), 'reason too short');
  assert.ok(bad({ page: '/updates/x/', efr: 8, reason: 'x'.repeat(30), agreed: '2026-09-02' }), 'missing owner');
  assert.ok(bad({ page: '/updates/x/', efr: 8, reason: 'x'.repeat(30), owner: 'o', agreed: 'yesterday' }), 'bad date');
  assert.ok(bad({ page: '/updates/x/', efr: 8, reason: 'x'.repeat(30), owner: 'o', agreed: '2026-09-02', reviewBy: 'soon' }), 'bad reviewBy');
  assert.ok(!bad(EX[0]), 'the well-formed entry is accepted');
  assert.ok(G.validateExceptions({ exceptions: [EX[0], EX[0]] }).errors.some((e) => /duplicate/.test(e)));
});

t('the committed ledger is well-formed', () => {
  const { errors } = G.loadExceptions();
  assert.deepStrictEqual(errors, []);
});

// ── 7. statistics ──────────────────────────────────────────────────────────

t('mean, median and p90 are computed as documented', () => {
  const s = G.stats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.strictEqual(s.mean, 5.5);
  assert.strictEqual(s.median, 5.5);
  assert.strictEqual(s.p90, 10);
  assert.strictEqual(G.stats([3, 1, 2]).median, 2);
  assert.strictEqual(G.stats([]).mean, null);
});

t('summarize counts PASS/REVIEW/FAIL and ignores unscored rows in the statistics', () => {
  const s = G.summarize([{ score: 1, status: 'PASS' }, { score: 6, status: 'REVIEW' }, { score: 9, status: 'FAIL' }, { score: null, status: 'NOT SCORED' }]);
  assert.strictEqual(s.pages, 4);
  assert.strictEqual(s.PASS, 1); assert.strictEqual(s.REVIEW, 1); assert.strictEqual(s.FAIL, 1);
  assert.strictEqual(s.n, 3);
});

t('the material allowance is 0.5 and the thresholds are the recorded policy', () => {
  assert.strictEqual(G.MATERIAL_DELTA, 0.5);
  assert.deepStrictEqual([G.THRESHOLDS.updates.pass, G.THRESHOLDS.updates.review], [5.0, 7.0]);
  assert.deepStrictEqual([G.THRESHOLDS.guide.pass, G.THRESHOLDS.guide.review], [7.0, 8.0]);
});

// ── lever: facts or phrasing ───────────────────────────────────────────────

t('a score carried ≥ 70% by specificityDeficit is facts-led', () => {
  const lv = G.leverFor({ dimensions: { specificityDeficit: 8.6, rhythmRepetition: 0.7, formulaicSyntax: 0, crossPageSameness: null } });
  assert.strictEqual(lv.lever, 'facts');
  assert.strictEqual(lv.dimension, 'specificityDeficit');
  assert.ok(lv.share >= 0.9);
  assert.ok(G.leverAdvice(lv).startsWith('facts-led'));
});

t('a score led by formulaic syntax or phrases is phrasing-led; by template dimensions, template-led', () => {
  assert.strictEqual(G.leverFor({ dimensions: { formulaicSyntax: 4, promotionalVagueness: 1, specificityDeficit: 0.5 } }).lever, 'phrasing');
  assert.strictEqual(G.leverFor({ dimensions: { structuralTemplate: 5, crossPageSameness: 1, specificityDeficit: 1 } }).lever, 'template');
  assert.strictEqual(G.leverFor({ dimensions: { punctuationFingerprint: 8, rhythmRepetition: 1 } }).lever, 'punctuation');
});

t('no single dimension at 70% means mixed, and an all-zero page has no lever', () => {
  const mixed = G.leverFor({ dimensions: { specificityDeficit: 5, formulaicSyntax: 4, promotionalVagueness: 3 } });
  assert.strictEqual(mixed.lever, 'mixed');
  assert.strictEqual(mixed.dimension, 'specificityDeficit');
  assert.strictEqual(G.leverFor({ dimensions: { specificityDeficit: 0, formulaicSyntax: 0 } }).lever, 'none');
  assert.strictEqual(G.leverFor(null), null);
  assert.strictEqual(G.DOMINANT_SHARE, 0.7);
});

// ── report ─────────────────────────────────────────────────────────────────

console.log('EFR Quality Gate — tests\n');
for (const line of results) console.log(line);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
