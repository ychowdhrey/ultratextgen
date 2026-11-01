'use strict';
/**
 * Zero-dependency tests for scripts/lib/printables-i18n.js.
 *   node scripts/lib/printables-i18n.test.js
 * Each case is a small synthetic module, so the definition of a gap is pinned
 * independently of what the shipped tables happen to hold today.
 */

const assert = require('assert');
const lib = require('./printables-i18n');

const LANGS = new Set(['en', 'es', 'fr', 'de']);
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`ok   ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const page = (lang, html) => ({ path: `${lang}/p/index.html`, langs: new Set([lang]), html: html || '' });
function gapsOf(src, pages, file) {
  const { tables, unreadable } = lib.tablesInSource(src, LANGS);
  assert.deepStrictEqual(unreadable, []);
  const { rules, problems } = lib.mountRules(file || 'js/printables/x.js', src);
  assert.deepStrictEqual(problems, []);
  return tables.flatMap((t) => lib.tableGaps(t, pages, rules));
}

test('fallback table: a key missing for a mounted language prints English', () => {
  const src = `const A_I18N = { en: { a: "A", b: "B" }, es: { a: "a" } };
    const L = Object.assign({}, A_I18N.en, A_I18N[lang] || {});`;
  const g = gapsOf(src, [page('es')]);
  assert.deepStrictEqual(g.map((x) => [x.lang, x.key, x.effect]), [['es', 'b', 'english']]);
});

test('fallback table: a missing row is every key, in English', () => {
  const src = `const A_I18N = { en: { a: "A", b: "B" }, es: { a: "a", b: "b" } };
    const L = A_I18N[lang] || A_I18N.en;`;
  const g = gapsOf(src, [page('fr')]);
  assert.deepStrictEqual(g.map((x) => [x.lang, x.key, x.kind]), [['fr', 'a', 'missing-row'], ['fr', 'b', 'missing-row']]);
});

test('a language with no page loading the module is not a gap', () => {
  const src = `const A_I18N = { en: { a: "A", b: "B" }, es: { a: "a" } };
    const L = Object.assign({}, A_I18N.en, A_I18N[lang] || {});`;
  assert.deepStrictEqual(gapsOf(src, [page('en')]), []);
});

test('gated table: no row means no control, not a gap; a partial row is', () => {
  const src = `const B_I18N = { en: { x: "X", y: "Y" }, es: { x: "x" } };
    const OL = B_I18N[lang] || null;`;
  const g = gapsOf(src, [page('es'), page('fr')]);
  assert.deepStrictEqual(g.map((x) => [x.lang, x.key, x.effect]), [['es', 'y', 'undefined']]);
});

test('plural forms are one unit: Polish-style one/few/many is not missing "other"', () => {
  const src = `const C_I18N = { en: { n: { one: "flag", other: "flags" } }, es: { n: { one: "uno", few: "x", many: "y" } } };
    const L = Object.assign({}, C_I18N.en, C_I18N[lang] || {});`;
  assert.deepStrictEqual(gapsOf(src, [page('es')]), []);
});

test('nested key under a shallow merge reads undefined; a guarded one is optional', () => {
  const src = `const D_I18N = { en: { g: { must: "M", maybe: "P" } }, es: { g: {} } };
    const T = Object.assign({}, D_I18N.en, D_I18N[lang] || {});
    out(T.g.must); if (T.g.maybe && cond) out(T.g.maybe);`;
  const g = gapsOf(src, [page('es')]);
  assert.deepStrictEqual(g.map((x) => [x.key, x.effect]), [['g.must', 'undefined'], ['g.maybe', 'optional']]);
});

test('a sub-object merged over English separately leaks English', () => {
  const src = `const E_I18N = { en: { po: { a: "A" } }, es: { po: {} } };
    const PO = Object.assign({}, E_I18N.en.po, (E_I18N[lang] && E_I18N[lang].po) || {});
    const T = Object.assign({}, E_I18N.en, E_I18N[lang] || {});`;
  assert.deepStrictEqual(gapsOf(src, [page('es')]).map((x) => x.effect), ['english']);
});

test('an en-only label table is found, so a language that gains a row is checked', () => {
  const src = `const F_LABEL = { en: { a: "A", b: "B" } }; const R = F_LABEL[LANG];`;
  const { tables } = lib.tablesInSource(src, LANGS);
  assert.strictEqual(tables.length, 1);
  tables[0].value.es = { a: "a" };
  const g = lib.tableGaps(tables[0], [page('es')], []);
  assert.deepStrictEqual(g.map((x) => x.key), ['b']);
});

test('an object that is not keyed by language is not a table', () => {
  const src = `const SIZES = { en: 1, small: 2, large: 3 }; const P = { a: { en: "x" } };`;
  assert.deepStrictEqual(lib.tablesInSource(src, LANGS).tables, []);
});

test('a language-keyed literal that cannot be evaluated alone is UNKNOWN, not skipped', () => {
  const src = `const G_I18N = { en: OTHER.en, es: "x" };`;
  const { tables, unreadable } = lib.tablesInSource(src, LANGS);
  assert.strictEqual(tables.length, 0);
  assert.strictEqual(unreadable.length, 1);
});

test('brace matching survives strings, templates and comments holding braces', () => {
  const src = 'const H_I18N = { en: { a: "}", b: `${"{"}}`, /* } */ c: \'{\' }, es: { a: "x" } }; // }\n' +
    'const L = Object.assign({}, H_I18N.en, H_I18N[lang] || {});';
  const g = gapsOf(src, [page('es')]);
  assert.deepStrictEqual(g.map((x) => x.key), ['b', 'c']);
});

test('the real engine: a mount rule narrows a key to pages carrying its mount', () => {
  const file = 'js/printables/printablesEngine.js';
  const src = `const el = { searchInput: $("#pt-search-input"), cwInput: $("#pt-cw-input"), scInput: $("#pt-sc-input"),
      spInput: $("#pt-sp-input"), bannerInput: $("#pt-banner-input"), genInput: $("#pt-gen-input") };
    const I18N = { en: { wordSearch: { heading: "Word search" }, copy: "Copy" }, es: { copy: "Copiar" } };
    const T = Object.assign({}, I18N.en, I18N[LANG] || {});`;
  const without = gapsOf(src, [page('es', '<div></div>')], file);
  assert.deepStrictEqual(without, []);
  const withMount = gapsOf(src, [page('es', '<input id="pt-search-input">')], file);
  assert.deepStrictEqual(withMount.map((x) => [x.key, x.effect]), [['wordSearch.heading', 'english']]);
});

test('a mount rule whose el name no longer resolves fails closed', () => {
  const { problems } = lib.mountRules('js/printables/printablesEngine.js', 'const el = {};');
  assert.ok(problems.length >= 1, 'expected a problem for each unresolved el name');
});

test('the shipped tree is measurable: tables found, no UNKNOWN rows', () => {
  const m = lib.measure(null);
  assert.deepStrictEqual(m.unreadable, []);
  assert.deepStrictEqual(m.problems, []);
  assert.deepStrictEqual(m.unknownLangs, []);
  const engine = m.modules.find((x) => x.file === 'js/printables/printablesEngine.js');
  assert.ok(engine && engine.tables.some((t) => t.name === 'I18N'), 'engine I18N table not found');
  const prefs = m.modules.find((x) => x.file === 'js/printables/printPrefs.js');
  assert.ok(prefs && prefs.tables.some((t) => t.name === 'CONTRAST_I18N'), 'CONTRAST_I18N not found');
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
