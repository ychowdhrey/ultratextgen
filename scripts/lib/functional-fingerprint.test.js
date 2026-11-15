#!/usr/bin/env node
'use strict';

/**
 * functional-fingerprint.test.js — zero-dependency tests for
 * scripts/lib/functional-fingerprint.js. Run: npm run test:functional-parity
 *
 * Covers: what counts as a capability (and what is page chrome), the
 * reference -> sibling diff in both directions, exception scoping, and the delta
 * semantics the gate relies on (a new gap, a pre-existing gap, a repair).
 */

const assert = require('assert');
const ff = require('./functional-fingerprint');

let passes = 0;
let failures = 0;
function test(name, fn) {
  try {
    fn();
    passes++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join('\n       ')}`);
  }
}

const page = (body, head = '') => `<!DOCTYPE html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
const S = (src) => `<script src="${src}" defer></script>`;

console.log('Capabilities');
test('first-party scripts count; external scripts and page chrome do not', () => {
  const fp = ff.functionalFingerprint(page(
    S('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') + S('/header.js') + S('/footer.js') +
    S('/i18n.js') + S('/script.js') + S('../../js/gamename/game-rules.js?v=3')));
  assert.deepStrictEqual(fp.capabilities, ['script:/js/gamename/game-rules.js', 'script:/script.js']);
});
test('opt-in flags, data attributes, id-bearing controls and copy tiles count', () => {
  const fp = ff.functionalFingerprint(
    '<html lang="ko" data-case-policy="locale"><body><section data-skin-tone>' +
    '<textarea id="mainInput"></textarea><input type="hidden" id="state"><input type="text">' +
    '<button class="symbol-tile" data-symbol="★">★</button></section>' +
    '<script>window.UTG_PRINTABLE = true; if (window.UTG_X == 1) {}</script></body></html>');
  assert.deepStrictEqual(fp.capabilities, [
    'attr:data-case-policy', 'attr:data-skin-tone', 'control:textarea#mainInput', 'copy-tiles', 'flag:PRINTABLE']);
});
test('translated copy does not change the fingerprint (language-independent)', () => {
  const en = ff.functionalFingerprint(page('<h1>Angel emoji</h1><button class="symbol-tile" aria-label="Copy angel">😇</button>' + S('/symbol-explorer.js')));
  const ko = ff.functionalFingerprint(page('<h1>천사 이모지</h1><button class="symbol-tile" aria-label="천사 복사">😇</button>' + S('/symbol-explorer.js')));
  assert.deepStrictEqual(ff.diffFunctional(en, ko), { missing: [], added: [] });
});

console.log('Diff');
test('a sibling missing the reference tool is a gap; a local extra is an addition', () => {
  const ref = ff.functionalFingerprint(page(S('/decorators.js') + S('/script.js')));
  const sib = ff.functionalFingerprint(page(S('/script.js') + S('/js/romanize/korean-romanize.js')));
  assert.deepStrictEqual(ff.diffFunctional(ref, sib), {
    missing: ['script:/decorators.js'], added: ['script:/js/romanize/korean-romanize.js'] });
});

console.log('Exceptions');
test('blanket entry excuses; scoped entry excuses only via suppress.functional', () => {
  assert.strictEqual(ff.functionalSuppressed({ enUrl: 'a', localeUrl: 'b' }, 'script:/x.js'), true);
  assert.strictEqual(ff.functionalSuppressed({ suppress: { h2Delta: true } }, 'script:/x.js'), false);
  assert.strictEqual(ff.functionalSuppressed({ suppress: { functional: ['script:/x.js'] } }, 'script:/x.js'), true);
  assert.strictEqual(ff.functionalSuppressed({ suppress: { functional: ['script:/x.js'] } }, 'copy-tiles'), false);
  assert.strictEqual(ff.functionalSuppressed({ suppress: { functional: true } }, 'copy-tiles'), true);
  assert.strictEqual(ff.functionalSuppressed(null, 'copy-tiles'), false);
});

console.log('Delta semantics (what the gate compares)');
const R = 'https://ultratextgen.com/library/x/';
const K = 'https://ultratextgen.com/ko/library/x/';
const F = 'https://ultratextgen.com/fr/library/x/';
const fps = (o) => new Map(Object.entries(o).map(([u, b]) => [u, ff.functionalFingerprint(page(b))]));
test('the reference gains a tool its siblings lack: every sibling gap is new', () => {
  const base = ff.missingSet(R, fps({ [R]: S('/a.js'), [K]: S('/a.js'), [F]: S('/a.js') }));
  const head = ff.missingSet(R, fps({ [R]: S('/a.js') + S('/b.js'), [K]: S('/a.js'), [F]: S('/a.js') }));
  assert.deepStrictEqual([...head].filter((k) => !base.has(k)).sort(), [`${F}\tscript:/b.js`, `${K}\tscript:/b.js`]);
});
test('a pre-existing gap is not new; a repair shrinks the set', () => {
  const base = ff.missingSet(R, fps({ [R]: S('/a.js') + S('/b.js'), [K]: S('/a.js'), [F]: S('/a.js') }));
  const head = ff.missingSet(R, fps({ [R]: S('/a.js') + S('/b.js'), [K]: S('/a.js') + S('/b.js'), [F]: S('/a.js') }));
  assert.deepStrictEqual([...head].filter((k) => !base.has(k)), []);
  assert.deepStrictEqual([...base].filter((k) => !head.has(k)), [`${K}\tscript:/b.js`]);
});
test('a new page has no base, so every capability it lacks is introduced', () => {
  const base = ff.missingSet(R, fps({ [R]: S('/a.js') }));
  const head = ff.missingSet(R, fps({ [R]: S('/a.js'), [K]: '' }));
  assert.deepStrictEqual([...head].filter((k) => !base.has(k)), [`${K}\tscript:/a.js`]);
});
test('an excused pair contributes no gap', () => {
  const find = (r, u) => (u === K ? { suppress: { functional: ['script:/b.js'] } } : null);
  const head = ff.missingSet(R, fps({ [R]: S('/b.js'), [K]: '', [F]: '' }), find);
  assert.deepStrictEqual([...head], [`${F}\tscript:/b.js`]);
});

console.log('');
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
