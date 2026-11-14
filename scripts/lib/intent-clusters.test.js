#!/usr/bin/env node
'use strict';

/**
 * intent-clusters.test.js — zero-dependency tests for the language-neutral
 * intent model (scripts/lib/intent-clusters.js). Run: npm run test:intent-clusters
 *
 * Each scenario builds a throwaway site tree in a temp directory (never inside
 * the repo, never published), runs the same library the CI gates run, and
 * asserts the outcome. Scenario letters match the migration's acceptance list
 * (docs/architecture/language-neutral-intents.md, "Tests"):
 *   A English-first regression          F missing English demand
 *   B Korean-first publication          G duplication prevention
 *   C Korean-first expansion to English H existing-site regression (real tree)
 *   D Japanese-first, many siblings     I downstream: x-default, lanes,
 *   E genuinely locale-specific           fingerprint identity, parity map
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ic = require('./intent-clusters');
const { decide, LOCALES } = require('./locale-parent-registry');
const { createFingerprinter } = require('./content-fingerprint');
const { discoverClusters } = require('./translation-clusters');

const S = 'https://ultratextgen.com/';
const REPO = path.resolve(__dirname, '..', '..');
let failures = 0;
let passes = 0;

function test(name, fn) {
  try {
    fn();
    passes++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 4).join('\n       ')}`);
  }
}

// ─── fixture builder ────────────────────────────────────────────────────────

function page(lang, alternates, opts = {}) {
  const links = alternates
    .map(([code, href]) => `  <link rel="alternate" hreflang="${code}" href="${S}${href}">`)
    .join('\n');
  const body = opts.body || '<main><h1>x</h1></main>';
  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n  <link rel="canonical" href="${S}${opts.self}">\n${links}\n</head>\n<body>${body}</body>\n</html>\n`;
}

/**
 * pages: { "<path>/": { lang, alts: [[code, path]], body? } }; the self entry is
 * added automatically unless selfRef === false.
 */
function site(pages, registry, opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utg-intents-'));
  for (const [p, def] of Object.entries(pages)) {
    const alts = def.selfRef === false ? def.alts : [[def.code || def.lang, p], ...(def.alts || [])];
    const file = path.join(root, p, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page(def.lang, alts, { self: p, body: def.body }));
  }
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  if (registry !== null) {
    fs.writeFileSync(path.join(root, 'data', 'canonical_intents.json'),
      JSON.stringify({ schemaVersion: 1, policy: { xDefaultFallbackOrder: ['en'] }, intents: registry || [] }, null, 2));
  }
  if (opts.withExceptionsLedger) {
    fs.writeFileSync(path.join(root, 'data', 'english_parent_exceptions.json'), '{"exceptions": []}');
  }
  return root;
}

function intent(id, origin, pages, extra = {}) {
  return Object.assign({
    id, originLocale: origin, pages: pages.map((p) => S + p), scope: 'cross-language',
    scopeBasis: 'Fixture: the need exists in any language that has this symbol.', registered: '2026-11-14',
  }, extra);
}

function model(root) {
  return ic.buildIntentModel(root);
}
function clusterOf(m, p) {
  return m.clusters.get(m.clusterOfUrl.get(S + p));
}
function admit(m, rel, ledger = []) {
  return ic.evaluateNewLocalePage({ rel, model: m, decide, ledgerEntries: ledger, locales: LOCALES });
}
function errorsOf(m) {
  return ic.validateRegistry(m, LOCALES).filter((p) => p.level === 'error' || p.level === 'unknown');
}
function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

// The three pages of an English-first family.
const EN_FIRST = {
  'library/clap-emoji/': { lang: 'en', alts: [['ko', 'ko/library/bakssu-imoji/'], ['fr', 'fr/library/emoji-applaudir/'], ['x-default', 'library/clap-emoji/']] },
  'ko/library/bakssu-imoji/': { lang: 'ko', alts: [['en', 'library/clap-emoji/'], ['fr', 'fr/library/emoji-applaudir/'], ['x-default', 'library/clap-emoji/']] },
  'fr/library/emoji-applaudir/': { lang: 'fr', alts: [['en', 'library/clap-emoji/'], ['ko', 'ko/library/bakssu-imoji/'], ['x-default', 'library/clap-emoji/']] },
};

// ─── A ──────────────────────────────────────────────────────────────────────
console.log('A. English-first regression');
{
  const root = site(EN_FIRST, []);
  const m = model(root);
  const c = clusterOf(m, 'ko/library/bakssu-imoji/');
  test('one cluster, keyed by its English member (implicit legacy id)', () => {
    assert.strictEqual(c.key, 'legacy:library/clap-emoji');
    assert.strictEqual(c.idSource, 'legacy-en');
    assert.deepStrictEqual([...c.byLang.keys()].sort(), ['en', 'fr', 'ko']);
    assert.strictEqual(clusterOf(m, 'fr/library/emoji-applaudir/'), c);
  });
  test('representative and x-default are the English page, as before', () => {
    assert.strictEqual(c.representative, `${S}library/clap-emoji/`);
    assert.deepStrictEqual([c.expectedXDefault.mode, c.expectedXDefault.href], ['url', `${S}library/clap-emoji/`]);
  });
  test('a translation passes the gate on the Core mirror path with no ledger entry and no exception', () => {
    const v = admit(m, 'ko/library/bakssu-imoji/index.html');
    assert.strictEqual(v.status, 'pass', v.detail);
    assert.strictEqual(v.classifiedPath, 'library/clap-emoji/index.html');
    assert.strictEqual(v.result.decision, 'mirror');
  });
  test('an empty registry is valid; nothing is unregistered', () => {
    assert.deepStrictEqual(errorsOf(m), []);
    assert.strictEqual(ic.unregisteredClusters(m, new Set(LOCALES)).length, 0);
  });
  test('the legacy cluster map is unchanged (translation-clusters.js still keys on EN)', () => {
    const { clusters } = discoverClusters(root);
    assert.deepStrictEqual([...clusters.keys()], [`${S}library/clap-emoji/`]);
  });
  cleanup(root);
}

// ─── B ──────────────────────────────────────────────────────────────────────
console.log('B. Korean-first publication');
const KO_ONLY = { 'ko/library/chamgo-pyo/': { lang: 'ko', alts: [] } };
const KO_INTENT = intent('find-and-copy-a-symbol/reference-mark', 'ko', ['ko/library/chamgo-pyo/']);
{
  const root = site(KO_ONLY, [KO_INTENT]);
  const m = model(root);
  const c = clusterOf(m, 'ko/library/chamgo-pyo/');
  test('the Korean page is its own cluster with the registered intent id', () => {
    assert.strictEqual(c.key, 'find-and-copy-a-symbol/reference-mark');
    assert.strictEqual(c.idSource, 'registry');
    assert.strictEqual(c.enUrl, null);
    assert.strictEqual(c.originLocale, 'ko');
  });
  test('it passes the gate: registered intent, library/* Core, ko qualified, no ledger entry', () => {
    const v = admit(m, 'ko/library/chamgo-pyo/index.html');
    assert.strictEqual(v.status, 'pass', v.detail);
    assert.strictEqual(v.classifiedPath, 'library/chamgo-pyo');
    assert.strictEqual(v.result.decision, 'mirror');
  });
  test('no English page is invented: no x-default, no English member expected', () => {
    assert.strictEqual(c.expectedXDefault.mode, 'none');
    assert.strictEqual(c.byLang.has('en'), false);
  });
  test('no English-parent exception exists or is consulted', () => {
    assert.strictEqual(fs.existsSync(path.join(root, 'data', 'english_parent_exceptions.json')), false);
    assert.deepStrictEqual(errorsOf(m), []);
  });
  cleanup(root);

  const bare = site(KO_ONLY, []);
  test('the same page with no record fails as unregistered-intent (it must map to a canonical intent)', () => {
    const v = admit(model(bare), 'ko/library/chamgo-pyo/index.html');
    assert.strictEqual(v.status, 'fail');
    assert.strictEqual(v.problem, 'unregistered-intent');
  });
  test('…and the whole-tree check counts it', () => {
    assert.strictEqual(ic.unregisteredClusters(model(bare), new Set(LOCALES)).length, 1);
  });
  cleanup(bare);

  const noRegistry = site(KO_ONLY, null);
  test('a missing registry is UNKNOWN, never a pass', () => {
    const probs = ic.validateRegistry(model(noRegistry), LOCALES);
    assert.ok(probs.some((p) => p.level === 'unknown' && p.code === 'registry-missing'));
  });
  cleanup(noRegistry);
}

// ─── C ──────────────────────────────────────────────────────────────────────
console.log('C. Korean-first, expanded to English');
{
  const before = model(site(KO_ONLY, [KO_INTENT]));
  const idBefore = clusterOf(before, 'ko/library/chamgo-pyo/').key;
  const root = site({
    'ko/library/chamgo-pyo/': { lang: 'ko', alts: [['en', 'library/reference-mark/'], ['x-default', 'library/reference-mark/']] },
    'library/reference-mark/': { lang: 'en', alts: [['ko', 'ko/library/chamgo-pyo/'], ['x-default', 'library/reference-mark/']] },
  }, [KO_INTENT]);
  const m = model(root);
  const c = clusterOf(m, 'library/reference-mark/');
  test('the canonical intent id is unchanged by adding English', () => {
    assert.strictEqual(c.key, idBefore);
    assert.strictEqual(clusterOf(m, 'ko/library/chamgo-pyo/'), c);
  });
  test('the Korean URL is unchanged and each page keeps its own canonical', () => {
    assert.ok(m.byUrl.has(`${S}ko/library/chamgo-pyo/`));
    assert.strictEqual(m.byUrl.get(`${S}library/reference-mark/`).canonical, `${S}library/reference-mark/`);
    assert.strictEqual(m.byUrl.get(`${S}ko/library/chamgo-pyo/`).canonical, `${S}ko/library/chamgo-pyo/`);
  });
  test('the origin stays Korean and stays the representative; English becomes x-default by policy only', () => {
    assert.strictEqual(c.originLocale, 'ko');
    assert.strictEqual(c.representative, `${S}ko/library/chamgo-pyo/`);
    assert.deepStrictEqual([c.expectedXDefault.href, c.expectedXDefault.source], [`${S}library/reference-mark/`, 'policy:en']);
  });
  test('reciprocal hreflang: both pages name each other and themselves', () => {
    for (const [a, b] of [['ko/library/chamgo-pyo/', 'library/reference-mark/'], ['library/reference-mark/', 'ko/library/chamgo-pyo/']]) {
      const alts = m.byUrl.get(S + a).alternates.map((x) => x.href);
      assert.ok(alts.includes(S + a) && alts.includes(S + b), `${a} -> ${b}`);
    }
  });
  test('a later French translation is classified through the English member (unchanged rule)', () => {
    const root2 = site({
      'ko/library/chamgo-pyo/': { lang: 'ko', alts: [['en', 'library/reference-mark/'], ['fr', 'fr/library/marque-de-reference/']] },
      'library/reference-mark/': { lang: 'en', alts: [['ko', 'ko/library/chamgo-pyo/'], ['fr', 'fr/library/marque-de-reference/']] },
      'fr/library/marque-de-reference/': { lang: 'fr', alts: [['en', 'library/reference-mark/'], ['ko', 'ko/library/chamgo-pyo/']] },
    }, [KO_INTENT]);
    const v = admit(model(root2), 'fr/library/marque-de-reference/index.html');
    assert.strictEqual(v.status, 'pass', v.detail);
    assert.strictEqual(v.classifiedPath, 'library/reference-mark/index.html');
    assert.strictEqual(v.cluster.key, idBefore);
    cleanup(root2);
  });
  test('the registry stays valid through the expansion', () => assert.deepStrictEqual(errorsOf(m), []));
  cleanup(root);
}

// ─── D ──────────────────────────────────────────────────────────────────────
console.log('D. Japanese-first, then Korean, French and English, in any order');
{
  const ID = 'copy-a-kaomoji/bowing';
  const P = { ja: 'ja/library/ojigi-kaomoji/', ko: 'ko/library/jeol-kaomoji/', fr: 'fr/library/kaomoji-salut/', en: 'library/bowing-kaomoji/' };
  const REC = intent(ID, 'ja', [P.ja]);
  const build = (langs) => {
    const pages = {};
    for (const l of langs) {
      pages[P[l]] = { lang: l, alts: langs.filter((o) => o !== l).map((o) => [o, P[o]]) };
    }
    return site(pages, [REC]);
  };
  const orders = [['ja'], ['ja', 'ko'], ['ja', 'ko', 'fr'], ['ja', 'ko', 'fr', 'en'], ['ja', 'en'], ['ja', 'en', 'fr', 'ko'], ['ja', 'fr', 'en', 'ko']];
  for (const langs of orders) {
    test(`published as ${langs.join(' → ')}: one cluster, id ${ID}, origin ja, ja representative`, () => {
      const root = build(langs);
      const m = model(root);
      const c = clusterOf(m, P.ja);
      assert.strictEqual(c.key, ID);
      assert.deepStrictEqual([...c.byLang.keys()].sort(), [...langs].sort());
      for (const l of langs) assert.strictEqual(clusterOf(m, P[l]), c);
      assert.strictEqual(c.representative, S + P.ja);
      assert.strictEqual(c.expectedXDefault.href, langs.includes('en') ? S + P.en : null);
      for (const l of langs.filter((x) => x !== 'en')) {
        const v = admit(m, `${P[l]}index.html`);
        assert.strictEqual(v.status, 'pass', `${l}: ${v.detail}`);
      }
      assert.deepStrictEqual(errorsOf(m), []);
      cleanup(root);
    });
  }
  test('an explicit primaryLocale moves the representative without changing the id', () => {
    const root = site({ [P.ja]: { lang: 'ja', alts: [['ko', P.ko]] }, [P.ko]: { lang: 'ko', alts: [['ja', P.ja]] } },
      [Object.assign({}, REC, { primaryLocale: 'ko' })]);
    const c = clusterOf(model(root), P.ja);
    assert.strictEqual(c.key, ID);
    assert.strictEqual(c.representative, S + P.ko);
    cleanup(root);
  });
}

// ─── E ──────────────────────────────────────────────────────────────────────
console.log('E. Genuinely locale-specific intent');
{
  const REC = intent('write-in-gal-moji', 'ja', ['ja/gal-moji/'], {
    scope: 'locale-specific',
    scopeBasis: 'Fixture: the transform is defined on Japanese kana and exists only in Japanese.',
  });
  const LEDGER = [{ pattern: 'gal-moji', locale: 'ja', verdict: 'gate-pass' }];
  const root = site({ 'ja/gal-moji/': { lang: 'ja', alts: [] } }, [REC]);
  const m = model(root);
  test('it exists with no English page and no translation', () => {
    const c = clusterOf(m, 'ja/gal-moji/');
    assert.strictEqual(c.key, 'write-in-gal-moji');
    assert.deepStrictEqual([...c.byLang.keys()], ['ja']);
    assert.deepStrictEqual(errorsOf(m), []);
  });
  test('as an unclassified root page it clears the gate on a recorded pre-build check (same bar as a translation)', () => {
    assert.strictEqual(admit(m, 'ja/gal-moji/index.html').problem, 'missing-ledger-entry');
    const v = admit(m, 'ja/gal-moji/index.html', LEDGER);
    assert.strictEqual(v.status, 'pass', v.detail);
  });
  cleanup(root);
  const withSibling = site({
    'ja/gal-moji/': { lang: 'ja', alts: [['ko', 'ko/gal-moji/']] },
    'ko/gal-moji/': { lang: 'ko', alts: [['ja', 'ja/gal-moji/']] },
  }, [REC]);
  const m2 = model(withSibling);
  test('a sibling in another language is refused until the intent is reclassified', () => {
    assert.strictEqual(admit(m2, 'ko/gal-moji/index.html', [{ pattern: 'gal-moji', locale: 'ko', verdict: 'gate-pass' }]).problem, 'locale-specific-sibling');
    assert.ok(errorsOf(m2).some((p) => p.code === 'locale-specific-has-siblings'));
  });
  cleanup(withSibling);
  test('inapplicableLocales blocks a page that cannot exist in a language (Ñ in English)', () => {
    const r = site({
      'es/imprimibles/letra-enye/': { lang: 'es', alts: [['en', 'printables/letter-enye/']] },
      'printables/letter-enye/': { lang: 'en', alts: [['es', 'es/imprimibles/letra-enye/']] },
    }, [intent('letter-colouring-page/enye', 'es', ['es/imprimibles/letra-enye/'], {
      inapplicableLocales: { en: 'Ñ is not a letter of the English alphabet.' } })]);
    assert.ok(errorsOf(model(r)).some((p) => p.code === 'inapplicable-but-published'));
    cleanup(r);
  });
}

// ─── F ──────────────────────────────────────────────────────────────────────
console.log('F. Missing English demand');
{
  const root = site(KO_ONLY, [Object.assign({}, KO_INTENT, {
    scopeBasis: 'Fixture: cross-language need; English demand has never been measured, which says nothing about the job.',
  })]);
  const m = model(root);
  test('the Korean page stays valid and unblocked with no English demand evidence', () => {
    assert.strictEqual(admit(m, 'ko/library/chamgo-pyo/index.html').status, 'pass');
    assert.deepStrictEqual(ic.validateRegistry(m, LOCALES).filter((p) => p.level !== 'warning' || p.code !== 'origin-not-published'), []);
  });
  test('nothing in the model creates, expects or schedules an English page', () => {
    const c = clusterOf(m, 'ko/library/chamgo-pyo/');
    assert.strictEqual(c.enUrl, null);
    assert.strictEqual(c.expectedXDefault.mode, 'none');
    assert.strictEqual(fs.existsSync(path.join(root, 'library')), false);
  });
  cleanup(root);
}

// ─── G ──────────────────────────────────────────────────────────────────────
console.log('G. Duplication prevention');
{
  test('a second Korean page in the same cluster is a duplicate claimant', () => {
    const root = site(Object.assign({}, EN_FIRST, {
      'ko/library/bakssu-imoji-2/': { lang: 'ko', alts: [['en', 'library/clap-emoji/']] },
    }), []);
    const v = admit(model(root), 'ko/library/bakssu-imoji-2/index.html');
    assert.strictEqual(v.problem, 'duplicate-claimant');
    cleanup(root);
  });
  test('a recorded locale owner blocks a competing new URL for the same intent', () => {
    const root = site({
      'fr/changeur-de-police/': { lang: 'fr', alts: [['en', 'library/font-changer/']] },
      'library/font-changer/': { lang: 'en', alts: [['fr', 'fr/changeur-de-police/']] },
      'library/other/': { lang: 'en', alts: [] },
    }, [intent('style-text-to-stand-out/font-changer', 'fr', ['fr/changeur-de-police/'], { localeOwners: { ko: `${S}library/other/` } })]);
    const r2 = site({
      'fr/changeur-de-police/': { lang: 'fr', alts: [['ko', 'ko/font-byeonhwan-2/']] },
      'ko/font-byeonhwan-2/': { lang: 'ko', alts: [['fr', 'fr/changeur-de-police/']] },
      'ko/': { lang: 'ko', alts: [] },
    }, [intent('style-text-to-stand-out/font-changer', 'fr', ['fr/changeur-de-police/'], { localeOwners: { ko: `${S}ko/` } })]);
    const v = admit(model(r2), 'ko/font-byeonhwan-2/index.html', [{ pattern: 'font-byeonhwan-2', locale: 'ko', verdict: 'gate-pass' }]);
    assert.strictEqual(v.problem, 'intent-already-served', v.detail);
    cleanup(root);
    cleanup(r2);
  });
  test('one intent id on two unconnected clusters is reported as competing pages', () => {
    const root = site({
      'ko/library/a/': { lang: 'ko', alts: [] },
      'fr/library/b/': { lang: 'fr', alts: [] },
    }, [intent('find-and-copy-a-symbol/x', 'ko', ['ko/library/a/', 'fr/library/b/'])]);
    const codes = errorsOf(model(root)).map((p) => p.code);
    assert.ok(codes.includes('pages-span-clusters'), codes.join(','));
    cleanup(root);
  });
  test('two records pinning one cluster, and a reused id, are both errors', () => {
    const root = site({ 'ko/library/a/': { lang: 'ko', alts: [] } },
      [intent('find-and-copy-a-symbol/x', 'ko', ['ko/library/a/']), intent('find-and-copy-a-symbol/x', 'ko', ['ko/library/a/'])]);
    const codes = errorsOf(model(root)).map((p) => p.code);
    assert.ok(codes.includes('duplicate-id') && codes.includes('page-pinned-twice'), codes.join(','));
    cleanup(root);
  });
  test('an English-less page naming pages from two English clusters is never merged into one intent', () => {
    const root = site(Object.assign({}, EN_FIRST, {
      'library/other/': { lang: 'en', alts: [['de', 'de/library/andere/']] },
      'de/library/andere/': { lang: 'de', alts: [['en', 'library/other/']] },
      'it/library/ponte/': { lang: 'it', alts: [['fr', 'fr/library/emoji-applaudir/'], ['de', 'de/library/andere/']] },
    }), []);
    const m = model(root);
    assert.notStrictEqual(clusterOf(m, 'library/clap-emoji/'), clusterOf(m, 'library/other/'));
    assert.ok(m.problems.some((p) => p.code === 'bridges-english-clusters'));
    cleanup(root);
  });
}

// ─── H ──────────────────────────────────────────────────────────────────────
console.log('H. Existing-site regression (the real tree, read-only)');
{
  const m = model(REPO);
  const probs = ic.validateRegistry(m, LOCALES);
  test('the live registry has no errors and no unknowns', () => {
    const bad = probs.filter((p) => p.level === 'error' || p.level === 'unknown');
    assert.deepStrictEqual(bad.map((p) => p.message), []);
  });
  test('every published cluster maps to a canonical intent', () => {
    assert.strictEqual(ic.unregisteredClusters(m, new Set(LOCALES)).length, 0);
  });
  test('every English-first cluster keeps its EN-derived id, EN representative and EN x-default', () => {
    let n = 0;
    for (const c of m.clusters.values()) {
      if (c.idSource !== 'legacy-en') continue;
      n++;
      assert.strictEqual(c.key, `legacy:${ic.urlToPath(c.enUrl) || '/'}`);
      assert.strictEqual(c.representative, c.enUrl);
      assert.strictEqual(c.expectedXDefault.href, c.enUrl);
    }
    assert.ok(n > 500, `expected hundreds of English-first clusters, saw ${n}`);
  });
  test('a real multilingual English-first family resolves as before (library/heart-symbols)', () => {
    const c = clusterOf(m, 'library/heart-symbols/');
    assert.strictEqual(c.key, 'legacy:library/heart-symbols');
    assert.ok(c.byLang.size >= 5, `languages: ${[...c.byLang.keys()]}`);
  });
  test('a migrated locale-specific page resolves to its record (ja/gal-moji)', () => {
    const c = clusterOf(m, 'ja/gal-moji/');
    assert.strictEqual(c.key, 'write-in-gal-moji');
    assert.strictEqual(c.record.scope, 'locale-specific');
    assert.strictEqual(c.expectedXDefault.href, S); // recorded legacy shape: site root
  });
  test('a real Korean library page and a real symbol page keep their English-first clusters', () => {
    const ko = [...m.byUrl.values()].find((r) => r.rel.startsWith('ko/library/') && r.alternates.some((a) => a.hreflang === 'en'));
    assert.ok(ko, 'a ko library page with an English member exists');
    assert.strictEqual(clusterOf(m, ic.urlToPath(ko.canonical) + '/').idSource, 'legacy-en');
    const sym = m.byUrl.get(`${S}symbol/euro-sign/`);
    assert.ok(sym && clusterOf(m, 'symbol/euro-sign/').enUrl === `${S}symbol/euro-sign/`);
  });
  test('the retired exceptions ledger is fully migrated (every entry has a migratedTo record)', () => {
    const led = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'english_parent_exceptions.json'), 'utf8'));
    const ids = new Set(m.registry.intents.map((r) => r.id));
    for (const e of led.exceptions) assert.ok(ids.has(e.migratedTo), `${e.localeUrl} -> ${e.migratedTo}`);
  });
}

// ─── I ──────────────────────────────────────────────────────────────────────
console.log('I. Downstream: x-default policy, lane map, fingerprint identity');
{
  test('x-default: declared beats policy; "none" means none; never the origin page by default', () => {
    const c = { record: { xDefault: 'none' }, byLang: new Map([['en', [`${S}a/`]]]) };
    assert.strictEqual(ic.expectedXDefault(c).mode, 'none');
    c.record = { xDefault: 'site-root' };
    assert.strictEqual(ic.expectedXDefault(c).href, S);
    c.record = null;
    assert.strictEqual(ic.expectedXDefault(c, { xDefaultFallbackOrder: ['en'] }).href, `${S}a/`);
    const noEn = { record: { originLocale: 'ko' }, byLang: new Map([['ko', [`${S}ko/x/`]]]) };
    assert.strictEqual(ic.expectedXDefault(noEn, { xDefaultFallbackOrder: ['en'] }).mode, 'none');
  });
  test('lane map is learned from the site: fr/imprimables -> printables, ja/purinto -> printables', () => {
    const m = model(REPO);
    assert.strictEqual(m.laneMap.get('fr/imprimables'), 'printables');
    assert.strictEqual(m.laneMap.get('ja/purinto'), 'printables');
    assert.strictEqual(ic.lanePathFor('fr/imprimables/x/index.html', m.laneMap), 'printables/x');
    assert.strictEqual(ic.lanePathFor('ko/library/x/index.html', m.laneMap), 'library/x');
    assert.strictEqual(ic.lanePathFor('ko/font-byeonhwan/index.html', m.laneMap), 'font-byeonhwan');
  });
  test('fingerprint: links to an English-less cluster normalise to one intent identity, not an invented English path', () => {
    const root = site({
      'ko/library/a/': { lang: 'ko', alts: [['fr', 'fr/library/b/']], body: '<a href="/ko/library/c/">c</a>' },
      'fr/library/b/': { lang: 'fr', alts: [['ko', 'ko/library/a/']], body: '<a href="/fr/library/d/">d</a>' },
      'ko/library/c/': { lang: 'ko', alts: [['fr', 'fr/library/d/']] },
      'fr/library/d/': { lang: 'fr', alts: [['ko', 'ko/library/c/']] },
    }, [intent('x/a', 'ko', ['ko/library/a/']), intent('x/c', 'ko', ['ko/library/c/'])]);
    const m = model(root);
    const neutral = new Map();
    for (const c of m.clusters.values()) if (!c.enUrl) for (const u of c.members) neutral.set(u, c.key);
    const fp = createFingerprinter(m.byUrl, m.localeCodes, { neutralIdentity: neutral });
    const ka = fp.fingerprint(fs.readFileSync(path.join(root, 'ko/library/a/index.html'), 'utf8'), { relPath: 'ko/library/a/index.html' });
    const fb = fp.fingerprint(fs.readFileSync(path.join(root, 'fr/library/b/index.html'), 'utf8'), { relPath: 'fr/library/b/index.html' });
    const d = fp.diff(ka, fb);
    assert.strictEqual(fp.score(d), 0, JSON.stringify(d));
    const plain = createFingerprinter(m.byUrl, m.localeCodes);
    const d2 = plain.diff(
      plain.fingerprint(fs.readFileSync(path.join(root, 'ko/library/a/index.html'), 'utf8'), { relPath: 'x' }),
      plain.fingerprint(fs.readFileSync(path.join(root, 'fr/library/b/index.html'), 'utf8'), { relPath: 'x' }));
    assert.ok(plain.score(d2) > 0, 'without neutral identity the same pair reads as drift (the old blind spot)');
    cleanup(root);
  });
  test('placeholder "English = homepage" claims never make a membership edge', () => {
    const root = site({
      '': { lang: 'en', alts: [] },
      'es/imprimibles/letra-enye/': { lang: 'es', alts: [['en', ''], ['x-default', '']] },
    }, [intent('letter-colouring-page/enye', 'es', ['es/imprimibles/letra-enye/'], { xDefault: 'site-root' })]);
    const m = model(root);
    const c = clusterOf(m, 'es/imprimibles/letra-enye/');
    assert.deepStrictEqual(c.members, [`${S}es/imprimibles/letra-enye/`]);
    assert.strictEqual(c.expectedXDefault.href, S);
    cleanup(root);
  });
}

console.log('');
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
