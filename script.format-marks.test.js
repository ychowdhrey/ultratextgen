#!/usr/bin/env node
'use strict';

/**
 * script.format-marks.test.js
 *
 * Run: node script.format-marks.test.js        (npm run test:format-marks)
 *
 * The underline and strikethrough toggles (window.UTG_FORMAT_MARKS, on the bold
 * italic page) layer a combining mark onto every character of every style's
 * output. They used to add it to every code point, so a mark landed inside an
 * emoji (between a base and its ZWJ, VS16 or keycap), between a letter and its
 * own accent, and a second time on text that already carried it. Measured over
 * the registry on nine fixtures, 107 of 114 styles produced at least one broken
 * or doubled cluster.
 *
 * What it pins:
 *   - Marks off (the default, and every page that never shows the toggles):
 *     applyFormatMarks returns its input unchanged, byte for byte, for every
 *     style's output. This is what keeps the homepage identical.
 *   - Marks on: one mark per user-perceived character. The output has exactly
 *     the clusters of the input, each carrying the mark once; a newline, a tab
 *     or an invisible format character (U+2060) gets none.
 *   - Applying the marks twice changes nothing (pasted, already-marked text).
 *   - Without Intl.Segmenter (old browsers) it falls back to code points, with
 *     combining marks kept on the letter before them.
 *
 * The function is sliced out of script.js between the @format-marks markers and
 * evaluated, so the test runs the shipped code. A missing marker throws.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const BEGIN = '/* @format-marks:begin */';
const END = '/* @format-marks:end */';

function loadFormatMarks(context) {
  const src = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(`script.js has no ${BEGIN} … ${END} block. Move the markers with the code; do not copy it here.`);
  }
  const body = src.slice(b + BEGIN.length, e);
  const ctx = Object.assign({ formatMarks: { underline: false, strike: false } }, context || {});
  vm.createContext(ctx);
  const api = new vm.Script(`(function () { 'use strict';\n${body}\nreturn { applyFormatMarks }; })()`,
    { filename: 'script.js#format-marks' }).runInContext(ctx);
  return { applyFormatMarks: api.applyFormatMarks, state: ctx.formatMarks };
}

global.window = {};
require(path.join(ROOT, 'styles.js'));
global.textStyles = window.textStyles;
require(path.join(ROOT, 'renderer.js'));
const R = window.UltraTextGenRender;
const S = window.textStyles;

const STRIKE = '̶';
const UNDER = '̲';
const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
const clusters = (s) => Array.from(seg.segment(s), (x) => x.segment);
const NO_MARK = /^[\p{Cc}\p{Cf}]+$/u;

const FIXTURES = {
  ascii: 'Hello World 123',
  multiline: 'ab\ncd\tef',
  nfc_accent: 'Zoë',
  nfd_accent: 'Zoë',
  zwj_family: '\u{1F468}‍\u{1F469}‍\u{1F467}',
  vs16_heart: '❤️',
  keycap: '1️⃣',
  flag: '\u{1F1EB}\u{1F1F7}',
  hangul_nfd: '한',
  devanagari_conjunct: 'क्ष',
  arabic_harakat: 'بَ',
  premarked: 'S̲t̲',
};

let n = 0;
const { applyFormatMarks, state } = loadFormatMarks();

// 1. Marks off: byte-identical for every style and every fixture.
for (const [name, style] of Object.entries(S)) {
  for (const fx of Object.values(FIXTURES)) {
    const out = R.renderAny(fx, style);
    assert.strictEqual(applyFormatMarks(out), out, `${name}: marks off must return the output unchanged`);
    n++;
  }
}

// 2. Marks on: one mark per cluster, cluster count unchanged, idempotent.
const SETTINGS = [
  { underline: true, strike: false },
  { underline: false, strike: true },
  { underline: true, strike: true },
];
const broken = new Map();
for (const setting of SETTINGS) {
  Object.assign(state, setting);
  const wanted = (setting.strike ? STRIKE : '') + (setting.underline ? UNDER : '');
  for (const [name, style] of Object.entries(S)) {
    for (const [fk, fx] of Object.entries(FIXTURES)) {
      const base = R.renderAny(fx, style);
      const marked = applyFormatMarks(base);
      const bc = clusters(base);
      const mc = clusters(marked);
      const expected = bc.map((c) => (NO_MARK.test(c) ? c : c + Array.from(wanted).filter((m) => !c.includes(m)).join('')));
      if (mc.length !== bc.length || mc.join('\u0000') !== expected.join('\u0000') ||
          applyFormatMarks(marked) !== marked) {
        if (!broken.has(name)) {
          broken.set(name, `${fk} ${JSON.stringify(setting)}: ${JSON.stringify(base)} -> ${JSON.stringify(marked)}, ` +
            `expected ${JSON.stringify(expected.join(''))}`);
        }
      }
      n++;
    }
  }
}
assert.strictEqual(broken.size, 0,
  `${broken.size} of ${Object.keys(S).length} styles get a broken, extra or doubled mark (one mark per cluster, idempotent):\n` +
  [...broken].slice(0, 8).map(([k, v]) => `  ${k}: ${v}`).join('\n'));

// 3. Concrete cases, readable on their own.
Object.assign(state, { underline: true, strike: false });
assert.strictEqual(applyFormatMarks('Zoë'), 'Z̲o̲ë̲', 'the mark goes after the accent, not between letter and accent');
assert.strictEqual(applyFormatMarks('1️⃣'), '1️⃣̲', 'a keycap stays one keycap');
assert.strictEqual(applyFormatMarks('S̲t'), 'S̲t̲', 'already-underlined text is not underlined twice');
assert.strictEqual(applyFormatMarks('a\nb'), 'a̲\nb̲', 'a newline gets no mark');
n += 4;

// 4. No Intl.Segmenter: code points, with combining marks kept on their letter.
const fallback = loadFormatMarks({ Intl: undefined });
Object.assign(fallback.state, { underline: true, strike: false });
assert.strictEqual(fallback.applyFormatMarks('ab'), 'a̲b̲', 'fallback marks each character');
assert.strictEqual(fallback.applyFormatMarks('Zoë'), 'Z̲o̲ë̲', 'fallback keeps an accent on its letter');
assert.strictEqual(fallback.applyFormatMarks('S̲t'), 'S̲t̲', 'fallback is idempotent');
Object.assign(fallback.state, { underline: false, strike: false });
assert.strictEqual(fallback.applyFormatMarks('Zoë'), 'Zoë', 'fallback with marks off is unchanged');
n += 4;

console.log(`format-marks: ${n} assertions passed over ${Object.keys(S).length} styles`);
