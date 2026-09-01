#!/usr/bin/env node
'use strict';

/**
 * editorial-footprint.test.js
 *
 * Run: node scripts/lib/editorial-footprint.test.js   (npm run test:editorial-footprint)
 *
 * Zero dependencies, no framework - the same idiom as
 * js/counter/counterRules.test.js. Assertions only.
 *
 * WHY THIS SURFACE HAS TESTS WHEN MOST DO NOT. CLAUDE.md's rule is that a page
 * which merely renders copy does not need tests, but a surface that ASSERTS
 * FACTS does. This one asserts facts about other people's writing and can fail a
 * pull request over them, so a false positive here is not a cosmetic defect - it
 * is an accusation. Every deliberate NON-catch below is therefore as load-bearing
 * as every catch, and several of them encode a false positive this system
 * actually produced before it was fixed.
 */

const assert = require('assert');
const {
  extractPage, classifyPath, words, sentences, editorialText, joinSlots
} = require('./editorial-corpus');
const {
  matchBank, loadBank, subjectExempt, specificityInventory, scorePage,
  buildContext, shingles, jaccard, similarityIndex, triadRegex,
  shortfallBelow, excessAbove, WEIGHTS
} = require('./editorial-footprint');
const { snapshot, compare, posture } = require('./seo-snapshot');

let pass = 0, fail = 0;
const results = [];
function t(name, fn) {
  try { fn(); pass++; results.push(`  ok   ${name}`); }
  catch (e) { fail++; results.push(`  FAIL ${name}\n         ${e.message.split('\n')[0]}`); }
}

const BANK = loadBank();

/** Minimal but structurally faithful page. */
function page(bodyHtml, { lang = 'en', title = 'Test Page', desc = 'A test page.', head = '' } = {}) {
  return `<!DOCTYPE html><html lang="${lang}"><head>
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="https://ultratextgen.com/test/">
${head}
</head><body>
<div id="shared-header"></div>
<nav class="breadcrumbs"><a href="/">Home</a></nav>
${bodyHtml}
<footer class="footer"><a class="footer-link" href="/guide/">Guides</a><a class="footer-link" href="/library/">Library</a></footer>
</body></html>`;
}

const bankHits = (html, rel = 'test/index.html') => matchBank(extractPage(html, rel), BANK);
const ids = (hits) => hits.map((h) => h.id);

// ── 1. visible-text extraction ─────────────────────────────────────────────

t('extracts prose, headings, FAQ and CTA into separate slots', () => {
  const p = extractPage(page(`
    <h1>Euro Sign</h1>
    <h2>How to type it</h2>
    <p>The euro sign is a currency symbol.</p>
    <div class="faq-item"><button class="faq-question">Is it safe?</button><p class="faq-answer">Yes it is.</p></div>
    <a class="cta-card" href="/x/"><h4>Try it</h4><p>Open the generator.</p></a>`), 'test/index.html');
  assert.strictEqual(p.slots.h1[0], 'Euro Sign');
  assert.deepStrictEqual(p.slots.headings, ['How to type it']);
  assert.ok(p.slots.prose.includes('The euro sign is a currency symbol.'));
  assert.deepStrictEqual(p.slots.faqQuestions, ['Is it safe?']);
  assert.deepStrictEqual(p.slots.faqAnswers, ['Yes it is.']);
  assert.ok(p.slots.cta.some((c) => c.includes('Try it')));
});

t('FAQ text is not double-counted as generic prose', () => {
  const p = extractPage(page(`
    <p>Intro paragraph.</p>
    <div class="faq-item"><button class="faq-question">Q?</button><p class="faq-answer">A distinctive answer.</p></div>`), 'test/index.html');
  assert.ok(!p.slots.prose.some((x) => x.includes('A distinctive answer')));
});

t('header, footer, breadcrumbs and language switcher are excluded', () => {
  const p = extractPage(page(`<p>Body only.</p><div class="lang-switcher"><a class="lang-option" href="/fr/">Francais</a></div>`), 'test/index.html');
  const all = editorialText(p);
  assert.ok(!all.includes('Guides'), 'footer link text leaked into editorial text');
  assert.ok(!all.includes('Francais'), 'language switcher leaked into editorial text');
  assert.ok(all.includes('Body only.'));
});

t('symbol tiles land in ui, never in prose', () => {
  const p = extractPage(page(`
    <p>Real prose here.</p>
    <button class="symbol-tile" data-symbol="EUR sign" aria-label="Copy Euro">EUR</button>`), 'test/index.html');
  assert.ok(p.slots.ui.some((x) => x.includes('EUR')));
  assert.ok(!p.slots.prose.some((x) => x.includes('EUR')), 'tile text leaked into prose');
});

t('a button that is a FAQ question is a question, not a tile', () => {
  const p = extractPage(page(`<div class="faq-item"><button class="faq-question">Does it work?</button><p class="faq-answer">Yes.</p></div>`), 'test/index.html');
  assert.deepStrictEqual(p.slots.faqQuestions, ['Does it work?']);
});

t('code and data tables go to the technical slot, not prose', () => {
  const p = extractPage(page(`<p>Prose.</p><code>**bold** — U+2014</code><table class="data-table"><tr><td>U+20AC</td></tr></table>`), 'test/index.html');
  assert.ok(joinSlots(p, ['technical']).join(' ').includes('U+20AC'));
  assert.ok(!p.slots.prose.join(' ').includes('U+2014'));
});

t('script-tagged JSON-LD never reaches any editorial slot', () => {
  const jsonld = `<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"name":"A schema-only question — with an em dash"}]}</script>`;
  const p = extractPage(page(`<p>Visible prose.</p>${jsonld}`), 'test/index.html');
  assert.ok(!editorialText(p).includes('schema-only question'), 'JSON-LD leaked into editorial text');
  assert.strictEqual(bankHits(page(`<p>Visible prose.</p>${jsonld}`)).filter((h) => h.id === 'EFR-F-001').length, 0,
    'an em dash inside JSON-LD was counted');
});

// ── 2. tokenisation, the locale-bias fix ───────────────────────────────────

t('CJK is tokenised per character, not as one clause-long token', () => {
  const ja = words('絵文字をコピーして貼り付ける');
  assert.ok(ja.length >= 10, `expected per-character tokens, got ${ja.length}`);
  const en = words("copy and paste the emoji");
  assert.strictEqual(en.length, 5);
});

t('a Latin run inside CJK stays one token', () => {
  const toks = words('Unicode16の絵文字');
  assert.ok(toks.includes('unicode16'), `expected 'unicode16' to survive, got ${JSON.stringify(toks)}`);
});

t('sentence splitting handles CJK and Arabic terminators', () => {
  assert.strictEqual(sentences('これは一つ。これは二つ。').length, 2);
  assert.strictEqual(sentences('هذا سؤال؟ وهذا آخر؟').length, 2);
});

// ── 3. phrase bank: catches ────────────────────────────────────────────────

t('an em dash in prose is caught', () => {
  assert.ok(ids(bankHits(page('<p>Bold text — it works.</p>'))).includes('EFR-F-001'));
});

t('assistant self-reference is caught', () => {
  assert.ok(ids(bankHits(page('<p>As an AI, I cannot browse the web.</p>'))).includes('EFR-F-002'));
});

t('an unrendered template placeholder is caught', () => {
  assert.ok(ids(bankHits(page('<p>Welcome to {{page_title}} today.</p>'))).includes('EFR-F-003'));
});

t('an all-caps placeholder token is caught', () => {
  assert.ok(ids(bankHits(page('<p>Ships TODO before the launch.</p>'))).includes('EFR-F-005'));
  assert.ok(ids(bankHits(page('<p>The limit is TBD for now.</p>'))).includes('EFR-F-005'));
});

// The reason EFR-F-005 exists at all. Case-folded, its pattern matched the
// ordinary Spanish and Portuguese word "todo" on 301 pages and no real
// placeholder anywhere, in a rule that is eligible to block merges.
t('the Spanish and Portuguese word "todo" is not a placeholder', () => {
  for (const prose of ['<p>Sirve para todo el mundo.</p>',
                       '<p>Funciona em todos os estilos.</p>',
                       '<p>Ese es el metodo, con acento: m\u00e9todo.</p>']) {
    assert.ok(!ids(bankHits(page(prose))).includes('EFR-F-005'), prose);
  }
});

t('caseSensitive is honoured per entry, not globally', () => {
  const bank = loadBank();
  const f003 = bank.entries.find((e) => e.id === 'EFR-F-003');
  const f005 = bank.entries.find((e) => e.id === 'EFR-F-005');
  assert.ok(f003._rx.flags.includes('i'), 'EFR-F-003 still needs i for "lorem ipsum"');
  assert.ok(!f005._rx.flags.includes('i'), 'EFR-F-005 must not fold case');
  // and the entry that kept the flag still does its job in lower case
  assert.ok(ids(bankHits(page('<p>Lorem ipsum dolor sit amet.</p>'))).includes('EFR-F-003'));
  assert.ok(ids(bankHits(page('<p>Enter [insert your name] here.</p>'))).includes('EFR-F-003'));
});

t('conversational scaffolding is caught', () => {
  assert.ok(ids(bankHits(page('<p>Here is a comprehensive overview of the topic.</p>'))).includes('EFR-F-004'));
});

t('"great for" is caught as a formulaic claim', () => {
  assert.ok(ids(bankHits(page('<p>These symbols are great for bios.</p>'))).includes('EFR-D-001'));
});

t('negative parallelism is caught', () => {
  assert.ok(ids(bankHits(page('<p>It is not just a font changer but a whole toolkit.</p>'))).includes('EFR-D-002'));
});

t('a sentence-initial audience opener is caught', () => {
  assert.ok(ids(bankHits(page('<p>Whether you are a gamer or a designer, this helps.</p>'))).includes('EFR-D-004'));
});

// ── 4. phrase bank: the deliberate NON-catches ─────────────────────────────

t('NON-CATCH: "whether you" mid-sentence is not an opener', () => {
  assert.ok(!ids(bankHits(page('<p>It renders the same whether you use Windows or macOS.</p>'))).includes('EFR-D-004'),
    'mid-sentence "whether you" was flagged as a generic introduction');
});

t('NON-CATCH: the noun "underscore" is the character, not the LLM verb', () => {
  const hits = bankHits(page('<p>Usernames accept letters, numbers and underscores only.</p>'));
  assert.ok(!ids(hits).includes('EFR-L-002'), '"underscores" (the character _) was flagged as marker vocabulary');
  assert.ok(ids(hits).includes('EFR-S-004'), 'it should register as search-protected terminology');
});

t('CATCH: the verb phrase "underscores the" IS marker vocabulary', () => {
  assert.ok(ids(bankHits(page('<p>This underscores the importance of testing.</p>'))).includes('EFR-L-002'));
});

t('NON-CATCH: "copy and paste" is search-protected, never a density hit', () => {
  const hits = bankHits(page('<p>Copy and paste these symbols. Copy and paste them again.</p>'));
  assert.ok(ids(hits).includes('EFR-S-001'));
  assert.strictEqual(hits.filter((h) => h.category === 'density_limited').length, 0);
});

t('NON-CATCH: an em dash inside a blockquote is quoted material', () => {
  const html = page('<p>Plain prose with no dash.</p><blockquote>Their brand page says: "TikTok Sans — our typeface".</blockquote>');
  assert.strictEqual(bankHits(html).filter((h) => h.id === 'EFR-F-001').length, 0,
    'a quoted em dash was counted as our own');
});

t('NON-CATCH: em dashes on the page ABOUT the em dash are exempt', () => {
  const html = page('<h1>Em Dash</h1><p>The em dash — like this — is what this page documents.</p>',
    { title: 'Em Dash (—): Copy & Paste' });
  const p = extractPage(html, 'symbol/em-dash/index.html');
  assert.ok(subjectExempt(BANK.entries.find((e) => e.id === 'EFR-F-001'), p));
  assert.strictEqual(matchBank(p, BANK).filter((h) => h.id === 'EFR-F-001').length, 0);
});

t('NON-CATCH: the subject exemption does NOT leak to an unrelated page', () => {
  const p = extractPage(page('<h1>Currency Symbols</h1><p>The euro — and the pound.</p>'), 'library/currency-symbols/index.html');
  assert.ok(matchBank(p, BANK).some((h) => h.id === 'EFR-F-001'),
    'the em-dash subject exemption leaked onto an unrelated page');
});

t('NON-CATCH: an English-only rule never fires on a non-English page', () => {
  const html = page('<p>Whether you are here or there, great for everyone.</p>', { lang: 'fr' });
  const hits = matchBank(extractPage(html, 'fr/library/test/index.html'), BANK);
  assert.strictEqual(hits.filter((h) => h.category === 'strongly_discouraged').length, 0,
    'an English phrase rule fired on a French page');
});

t('NON-CATCH: markup examples inside <code> are not model leakage', () => {
  assert.strictEqual(bankHits(page('<p>Type this:</p><code>**bold** and ## heading</code>')).length, 0);
});

// ── 5. specificity ─────────────────────────────────────────────────────────

t('specificity counts DISTINCT facts, so restating one does not inflate it', () => {
  const once = specificityInventory('The euro sign is U+20AC.').distinct;
  const eight = specificityInventory('U+20AC U+20AC U+20AC U+20AC U+20AC U+20AC U+20AC U+20AC').distinct;
  assert.strictEqual(once, eight, 'repeating one codepoint changed the fact count');
});

t('specificity recognises codepoints, limits, platforms and constraints', () => {
  const s = specificityInventory('On Discord, U+2014 renders as an em dash; LinkedIn cuts at 220 characters and cannot show it.');
  assert.ok(s.byKind.codepoint >= 1);
  assert.ok(s.byKind.platform >= 2);
  assert.ok(s.byKind.limit >= 1);
  assert.ok(s.byKind.constraint >= 1);
});

// ── 6. locale isolation ────────────────────────────────────────────────────

t('the triad detector exists per locale and is absent for CJK', () => {
  assert.ok(triadRegex('en'), 'English triad detector missing');
  assert.ok(triadRegex('nl'), 'Dutch triad detector missing');
  assert.strictEqual(triadRegex('ja'), null, 'Japanese must be declared unmeasured, not scored zero');
  assert.strictEqual(triadRegex('th'), null);
});

t('the English triad detector matches English lists only', () => {
  const rx = triadRegex('en');
  assert.ok('bios, captions, and usernames'.match(rx));
  rx.lastIndex = 0;
  assert.ok(!'biografias, subtitulos y nombres'.match(triadRegex('en')));
});

t('classifyPath separates locale from family', () => {
  assert.deepStrictEqual(
    (({ locale, family }) => ({ locale, family }))(classifyPath('fr/library/kaomoji/index.html')),
    { locale: 'fr', family: 'library' });
  assert.deepStrictEqual(
    (({ locale, family }) => ({ locale, family }))(classifyPath('symbol/euro-sign/index.html')),
    { locale: 'en', family: 'symbol' });
  assert.strictEqual(classifyPath('id/index.html').family, 'home');
});

// ── 7. cohort comparison, the calibration guards ───────────────────────────

t('a tiny cohort median cannot produce a maximum penalty', () => {
  // The real bug: nl|library has a triad median of 0, so one triad maxed the
  // dimension, while en|library at a median of 15.5 needed 62 to score the same.
  assert.ok(excessAbove(2.9, 0, 3) < 0.25, 'a zero-reference cohort still maxes');
  assert.ok(shortfallBelow(0, 2.9) < 0.6, 'a one-fact cohort still awards a full deficit');
  assert.strictEqual(shortfallBelow(0, 15.6), 1, 'a fact-dense cohort should award a full deficit at zero');
});

t('a page at or above its cohort median scores no deficit', () => {
  assert.strictEqual(shortfallBelow(20, 15.6), 0);
  assert.strictEqual(excessAbove(10, 15.6, 1.5), 0);
});

// ── 8. similarity ──────────────────────────────────────────────────────────

t('identical text is Jaccard 1, unrelated text is near 0', () => {
  const a = shingles('the quick brown fox jumps over the lazy dog every single morning');
  const b = shingles('the quick brown fox jumps over the lazy dog every single morning');
  const c = shingles('unicode codepoints describe characters rather than glyphs in a font file');
  assert.strictEqual(jaccard(a, b), 1);
  assert.ok(jaccard(a, c) < 0.05);
});

t('similarity never pairs pages across locales', () => {
  const body = '<p>' + 'the same sentence repeated for shingling purposes here. '.repeat(12) + '</p>';
  const pages = [
    extractPage(page(body), 'library/x/index.html'),
    extractPage(page(body, { lang: 'fr' }), 'fr/library/x/index.html')
  ];
  const { pairs } = similarityIndex(pages);
  assert.strictEqual(pairs.length, 0, 'a translation pair was reported as a near-duplicate');
});

t('similarity signatures are deterministic across processes', () => {
  const s = shingles('deterministic signature check for the minhash permutation seeds');
  const { signature } = require('./editorial-footprint');
  assert.deepStrictEqual(signature(s).map(String), signature(s).map(String));
});

// ── 9. scoring ─────────────────────────────────────────────────────────────

const LONG = '<p>' + 'This page explains one specific behaviour in some detail for the reader. '.repeat(12) + '</p>';

t('a page below the prose floor is not scored', () => {
  const r = scorePage(extractPage(page('<p>Too short — really.</p>'), 'test/index.html'), {});
  assert.strictEqual(r.status, 'insufficient-prose');
  assert.strictEqual(r.score, null);
});

t('an unmeasured dimension is null, never zero, and leaves the denominator', () => {
  const fr = scorePage(extractPage(page(LONG, { lang: 'fr' }), 'fr/library/x/index.html'), {});
  assert.strictEqual(fr.dimensions.formulaicPhraseDensity, null,
    'an English-only dimension was scored on a French page');
  assert.ok(fr.unmeasuredDimensions.includes('formulaicPhraseDensity'));
  assert.ok(fr.measuredWeight < 100 && fr.measuredWeight > 0);
});

t('the score is renormalised over the measured weights only', () => {
  const r = scorePage(extractPage(page(LONG, { lang: 'de' }), 'de/library/x/index.html'), {});
  let expect = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) if (r.dimensions[k] !== null) expect += r.dimensions[k];
  assert.ok(Math.abs(r.score - (100 * expect) / r.measuredWeight) < 0.2);
});

t('scores stay inside 0-100', () => {
  const r = scorePage(extractPage(page(LONG), 'library/x/index.html'), {});
  assert.ok(r.score >= 0 && r.score <= 100, `score out of range: ${r.score}`);
});

// ── 10. SEO preservation ───────────────────────────────────────────────────

const SEO_BEFORE = page(`
  <h1>Euro Sign</h1>
  <p>Copy and paste the euro sign. Its codepoint is U+20AC and Discord renders it fine.</p>
  <p>See the <a href="/library/currency-symbols/">currency symbols</a> hub.</p>
  <div class="faq-item"><button class="faq-question">Is it safe?</button><p class="faq-answer">Yes.</p></div>`,
{ title: 'Euro Sign: Copy & Paste' });

t('an unchanged page produces no SEO findings', () => {
  const b = snapshot(SEO_BEFORE, 'symbol/euro-sign/index.html', BANK);
  assert.deepStrictEqual(compare(b, b), []);
});

t('changing the H1 is a blocking SEO finding', () => {
  const after = SEO_BEFORE.replace('<h1>Euro Sign</h1>', '<h1>A Guide To Money Marks</h1>');
  const f = compare(snapshot(SEO_BEFORE, 'x/index.html', BANK), snapshot(after, 'x/index.html', BANK));
  assert.ok(f.some((x) => x.rule === 'h1-changed' && x.severity === 'error'));
});

t('removing a search-protected term is a blocking SEO finding', () => {
  const after = SEO_BEFORE.replace('Copy and paste the euro sign', 'Use the euro sign');
  const f = compare(snapshot(SEO_BEFORE, 'x/index.html', BANK), snapshot(after, 'x/index.html', BANK));
  assert.ok(f.some((x) => x.rule === 'protected-term-lost' && x.severity === 'error'));
});

t('removing a codepoint is a blocking SEO finding', () => {
  const after = SEO_BEFORE.replace('U+20AC', 'a codepoint');
  const f = compare(snapshot(SEO_BEFORE, 'x/index.html', BANK), snapshot(after, 'x/index.html', BANK));
  assert.ok(f.some((x) => x.rule === 'concrete-fact-lost' && x.severity === 'error'));
});

t('removing an internal link is a blocking SEO finding', () => {
  const after = SEO_BEFORE.replace('<a href="/library/currency-symbols/">currency symbols</a>', 'currency symbols');
  const f = compare(snapshot(SEO_BEFORE, 'x/index.html', BANK), snapshot(after, 'x/index.html', BANK));
  assert.ok(f.some((x) => x.rule === 'internal-link-lost' && x.severity === 'error'));
});

t('rewording filler that touches nothing protected is clean', () => {
  const after = SEO_BEFORE.replace('Yes.', 'Yes, on every current platform.');
  const f = compare(snapshot(SEO_BEFORE, 'x/index.html', BANK), snapshot(after, 'x/index.html', BANK));
  assert.strictEqual(f.filter((x) => x.severity === 'error').length, 0,
    'a harmless rewording produced a blocking SEO finding');
});

t('unknown ranking sensitivity is the CONSERVATIVE posture', () => {
  assert.strictEqual(posture('unknown').allowBroadRewrite, false);
  assert.strictEqual(posture('protected').allowBroadRewrite, false);
  assert.strictEqual(posture('candidate').allowBroadRewrite, true);
});

// ── 11. gate logic ─────────────────────────────────────────────────────────

t('only reviewed, deterministic rules are in the blocking set', () => {
  const { BLOCKING } = require('../check-editorial-footprint');
  assert.ok(BLOCKING.has('model-leakage'));
  assert.ok(BLOCKING.has('seo-preservation'));
  assert.ok(!BLOCKING.has('em-dash'), 'the em dash rule must stay in shadow until its rollout stage');
  assert.ok(!BLOCKING.has('density-limited'), 'a density warning must never block');
  assert.ok(!BLOCKING.has('formulaic-phrase'), 'a subjective phrase rule must never block');
});

t('the new-page threshold is a percentile, not a raw score', () => {
  const { NEW_PAGE_PERCENTILE, REGRESSION_TOLERANCE } = require('../check-editorial-footprint');
  assert.ok(NEW_PAGE_PERCENTILE > 50 && NEW_PAGE_PERCENTILE <= 100);
  assert.ok(REGRESSION_TOLERANCE > 0);
});

t('the phrase bank is well formed and every regex compiles', () => {
  const seen = new Set();
  for (const e of BANK.entries) {
    assert.ok(!seen.has(e.id), `duplicate phrase-bank id ${e.id}`);
    seen.add(e.id);
    for (const f of ['pattern', 'category', 'severity', 'rationale', 'evidenceSource', 'firstAdded', 'lastReviewed']) {
      assert.ok(e[f], `${e.id} is missing ${f}`);
    }
    assert.ok(['forbidden', 'strongly_discouraged', 'density_limited', 'search_protected'].includes(e.category),
      `${e.id} has an unknown category`);
    if (e.matchType === 'regex') new RegExp(e.pattern, 'gi');
    if (e.category === 'density_limited') {
      assert.ok(e.maxPer1000Words > 0, `${e.id} is density-limited with no cap`);
    }
    if (e.category === 'search_protected') {
      assert.strictEqual(e.maxPer1000Words, null, `${e.id} is search-protected and must have no cap`);
    }
  }
});

t('no phrase-bank entry claims anything about authorship', () => {
  const banned = /\b(?:written by (?:an? )?(?:ai|llm|model|chatgpt)|machine[- ]written|ai[- ]generated|ai probability|likelihood.*(?:ai|llm))\b/i;
  for (const e of BANK.entries) {
    for (const f of ['rationale', 'notes', 'replacementGuidance']) {
      assert.ok(!banned.test(e[f] || ''), `${e.id}'s ${f} makes an authorship claim`);
    }
  }
});

t('weights sum to 100', () => {
  assert.strictEqual(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100);
});

// ── report ─────────────────────────────────────────────────────────────────

console.log('Editorial Footprint Risk — tests\n');
for (const line of results) console.log(line);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
