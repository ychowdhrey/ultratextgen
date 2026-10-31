'use strict';
/*
 * spaced-native-runs.test.js — the spaced styles must not space apart a run of
 * letters in a script the style does not map.
 *
 * The two spaced Elegant scripts used to put a space after every grapheme, so
 * an Arabic greeting typed on the Eid page came out as ع ي د  م ب ا ر ك: every
 * letter isolated, the joining gone. The style only maps Latin letters and
 * digits; anything else passes through and must stay as typed.
 *
 * Run: node scripts/lib/spaced-native-runs.test.js
 */
const assert = require('assert');
const path = require('path');

global.window = {};
require(path.join(__dirname, '..', '..', 'styles.js'));
global.textStyles = window.textStyles;
require(path.join(__dirname, '..', '..', 'renderer.js'));
const R = window.UltraTextGenRender;
const S = window.textStyles;

const SPACED = Object.keys(S).filter((k) => {
  const s = S[k];
  return s && (s.groupSlug === 'spaced' || String(s.slug || '').endsWith('-spaced'));
});
assert.ok(SPACED.length >= 2, 'expected the spaced Elegant scripts in the registry');

const RUNS = ['عيد مبارك', 'رمضان كريم', 'शुभ दीपावली', '新年快乐', 'สวัสดีปีใหม่', 'שלום', 'Счастливого'];
let n = 0;
for (const key of SPACED) {
  for (const run of RUNS) {
    const out = R.renderAny(run, S[key]);
    assert.strictEqual(out, run, `${key}: "${run}" must pass through unspaced, got "${out}"`);
    const mixed = R.renderAny('Ana ' + run, S[key]);
    assert.ok(mixed.endsWith(' ' + run), `${key}: mixed input keeps "${run}" contiguous, got "${mixed}"`);
    n += 2;
  }
  // Latin keeps its spacing: that is the style.
  const latin = R.renderAny('Maya', S[key]);
  assert.strictEqual(Array.from(latin).filter((c) => c === ' ').length, 3, `${key}: Latin letters stay spaced`);
  n += 1;
}
console.log(`spaced-native-runs: ${n} assertions passed across ${SPACED.length} spaced styles`);
