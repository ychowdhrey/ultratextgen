#!/usr/bin/env node
'use strict';

/**
 * renderer.unicode.test.js
 *
 * Run: node renderer.unicode.test.js        (npm run test:renderer-unicode)
 *
 * Loads the real styles.js and renderer.js and drives every registry style
 * through renderAny, the way the generators do.
 *
 * What it pins, and why each case is here:
 *   - A keycap emoji (1️⃣, #️⃣, *️⃣, and 1⃣ without VS16) comes out as the same
 *     keycap. Map styles used to style the digit under the keycap (𝟭️⃣), the
 *     upside-down styles flipped it (⇂️⃣), and Ultra Keycap Numbers wrapped it in
 *     a second keycap. Measured: 82 of 114 styles changed 1️⃣, 46 left it broken.
 *   - The circled letter drawn as an emoji (Ⓜ️) survives. The lowercase,
 *     capitalised, title, sentence, alternating and toggle cases turned it into
 *     ⓜ️, which is not an emoji.
 *   - Decomposed text (an accent typed or pasted as letter + combining mark, the
 *     way macOS and some keyboards send it) styles exactly like the composed
 *     form. 67 of 114 styles gave different output for "café" depending on how
 *     the é was encoded.
 *   - Upside Down Micro Text keeps line breaks (ab\ncd used to become "pɔ qɐ").
 *
 * Whole-style wrappers stay as they were: a decorator still marks the keycap as
 * one cluster, a word wrapper still wraps it, a redact style still blacks it out.
 */

const assert = require('assert');
const path = require('path');

global.window = {};
require(path.join(__dirname, 'styles.js'));
global.textStyles = window.textStyles;
require(path.join(__dirname, 'renderer.js'));
const R = window.UltraTextGenRender;
const S = window.textStyles;

const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
const clusters = (s) => Array.from(seg.segment(s), (x) => x.segment);
let n = 0;
const failures = [];
function check(ok, msg) {
  n++;
  if (!ok) failures.push(msg);
}

const KEYCAPS = ['1️⃣', '0️⃣', '#️⃣', '*️⃣', '7⃣'];
const CIRCLED = 'Ⓜ️';
const ACCENTED = ['café', 'Zoë', 'ñandú', 'Ångström', 'Việt Nam', 'çiao', 'São Paulo'];

for (const [name, style] of Object.entries(S)) {
  const redact = style.type === 'redact';

  // Keycaps: intact, as one cluster, with exactly one keycap mark in it.
  for (const kc of KEYCAPS) {
    for (const input of [kc, 'a ' + kc + ' b', 'Top ' + kc + kc]) {
      const out = R.renderAny(input, style);
      if (redact) continue;
      const withCap = clusters(out).filter((c) => c.includes('⃣'));
      const ok = withCap.length === input.split('⃣').length - 1 &&
        withCap.every((c) => c.includes(kc) && c.split('⃣').length === 2);
      check(ok, `${name}: keycap ${JSON.stringify(kc)} in ${JSON.stringify(input)} -> ${JSON.stringify(out)}`);
    }
  }

  // The emoji circled M survives every case conversion.
  if (!redact) {
    const out = R.renderAny('Go ' + CIRCLED + ' now', style);
    check(clusters(out).some((c) => c.includes(CIRCLED)), `${name}: ${JSON.stringify(CIRCLED)} -> ${JSON.stringify(out)}`);
  }

  // Decomposed and composed input give the same output.
  for (const word of ACCENTED) {
    const nfc = word.normalize('NFC');
    const nfd = word.normalize('NFD');
    const a = R.renderAny(nfc, style);
    const b = R.renderAny(nfd, style);
    check(a === b, `${name}: NFD ${JSON.stringify(nfd)} -> ${JSON.stringify(b)} but NFC -> ${JSON.stringify(a)}`);
  }
}

// Upside Down Micro Text keeps the line break and still collapses runs of spaces.
const micro = S['Upside Down Micro Text'];
assert.ok(micro, 'Upside Down Micro Text is in the registry');
check(R.renderAny('ab\ncd', micro) === 'pɔ\nqɐ', `micro: "ab\\ncd" -> ${JSON.stringify(R.renderAny('ab\ncd', micro))}`);
check(R.renderAny('ab   cd', micro) === 'pɔ qɐ', `micro: "ab   cd" -> ${JSON.stringify(R.renderAny('ab   cd', micro))}`);
check(R.renderAny(' ab \n cd ', micro) === 'pɔ\nqɐ', `micro: " ab \\n cd " -> ${JSON.stringify(R.renderAny(' ab \n cd ', micro))}`);

// A plain digit, letter or circled letter without VS16 is still styled as before.
check(R.renderAny('1', S['Ultra Bold']) === '\u{1D7ED}', 'Ultra Bold still styles a bare digit');
check(R.renderAny('Ⓜ', S['lowercase']) === 'ⓜ', 'lowercase still lowers a text-style circled M');

if (failures.length) {
  console.error(`renderer-unicode: ${failures.length} of ${n} checks failed`);
  failures.slice(0, 25).forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`renderer-unicode: ${n} checks passed over ${Object.keys(S).length} styles`);
