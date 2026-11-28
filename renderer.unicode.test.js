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
 *   - Decomposed Hangul jamo styles like the precomposed syllables, and a CJK
 *     compatibility ideograph (U+F900, U+2F800, ...) keeps its identity instead
 *     of being normalised to its unified twin (2026-11-15).
 *
 *   - A combining mark stays in its letter's grapheme cluster when the style's
 *     token ends in a format character. Ultra Regional Indicator put U+2060
 *     between a letter and its mark (x̄ -> U+1F1FD U+2060 U+0304), leaving the
 *     mark as an orphan cluster: 1 for "x̄ b", 5 for a zalgo word. Now the
 *     joiner follows the whole cluster (2026-11-28).
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

  // Decomposed Hangul (conjoining jamo, the way macOS file names and some
  // pastes carry it) styles like the precomposed syllables. Jamo are letters,
  // not marks, so this pins that composing is not limited to mark clusters.
  for (const word of ['한국', '각 hi']) {
    const a = R.renderAny(word.normalize('NFC'), style);
    const b = R.renderAny(word.normalize('NFD'), style);
    check(a === b, `${name}: NFD Hangul ${JSON.stringify(word.normalize('NFD'))} -> ${JSON.stringify(b)} but NFC -> ${JSON.stringify(a)}`);
  }

  // A CJK compatibility ideograph keeps its identity (2026-11-08 audit). NFC
  // maps U+F900 to U+8C48 and U+2F800 to U+4E3D; per-cluster composing used to
  // apply that to every cluster, so 107 of 114 styles silently swapped the
  // character a visitor typed. Checked wherever the style passes the unified
  // form through untouched, i.e. where it does not restyle CJK at all.
  for (const [compat, unified] of [['\uF900', '\u8C48'], ['\u{2F800}', '\u4E3D'], ['\uFA10', '\u585A']]) {
    if (!R.renderAny('A' + unified + 'B', style).includes(unified)) continue;
    const out = R.renderAny('A' + compat + 'B', style);
    check(out.includes(compat) && !out.includes(unified),
      `${name}: U+${compat.codePointAt(0).toString(16).toUpperCase()} -> ${JSON.stringify(out)} (became U+${unified.codePointAt(0).toString(16).toUpperCase()})`);
    // An accent next to it is still composed in the same pass.
    const mixed = R.renderAny(compat + 'e\u0301', style);
    check(mixed === R.renderAny(compat + '\u00e9', style), `${name}: ${JSON.stringify(compat + 'e\u0301')} -> ${JSON.stringify(mixed)} composes differently from the precomposed form`);
  }
}

// Upside Down Micro Text keeps the line break and still collapses runs of spaces.
const micro = S['Upside Down Micro Text'];
assert.ok(micro, 'Upside Down Micro Text is in the registry');
check(R.renderAny('ab\ncd', micro) === 'pɔ\nqɐ', `micro: "ab\\ncd" -> ${JSON.stringify(R.renderAny('ab\ncd', micro))}`);
check(R.renderAny('ab   cd', micro) === 'pɔ qɐ', `micro: "ab   cd" -> ${JSON.stringify(R.renderAny('ab   cd', micro))}`);
check(R.renderAny(' ab \n cd ', micro) === 'pɔ\nqɐ', `micro: " ab \\n cd " -> ${JSON.stringify(R.renderAny(' ab \n cd ', micro))}`);

// A decorator leaves line breaks and tabs unmarked (2026-11-08 audit): marking
// "\n" made line 2 of a multi-line text start with an orphan combining mark.
for (const [name, style] of Object.entries(S)) {
  if (style.type !== 'decorator') continue;
  for (const input of ['ab\ncd', 'ab\r\ncd', 'a\tb']) {
    const out = R.renderAny(input, style);
    const orphan = clusters(out).find((c) => /^\p{M}/u.test(c));
    check(!orphan, `${name}: ${JSON.stringify(input)} -> ${JSON.stringify(out)} starts a cluster with a mark`);
    check(out.split(/\r?\n/).length === input.split(/\r?\n/).length, `${name}: ${JSON.stringify(input)} keeps its lines`);
  }
}

// A combining mark stays on its letter when the style's token ends in a format
// character (2026-11-08 audit, re-verified 2026-11-21). Every Ultra Regional
// Indicator token is a regional indicator + U+2060 WORD JOINER, and the mark
// typed after the letter used to land after the joiner: x̄ came out as
// U+1F1FD U+2060 U+0304. U+2060 breaks the grapheme cluster, so the mark became
// a cluster of its own (1 orphan for "x̄ b", 5 for a zalgo word). The joiner
// belongs after the whole cluster: letter, its marks, then U+2060.
const cp = (s) => Array.from(s, (c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
const orphanClusters = (s) => clusters(s).filter((c) => /^\p{M}/u.test(c));
const MARKED = ['x̄ b', 'Z̴̡a̵l̶g̷o̸', 'a⃣ b', 'q̣̇ w̄'];

// No style turns a letter + mark into an orphan-mark cluster.
for (const [name, style] of Object.entries(S)) {
  for (const input of MARKED) {
    const out = R.renderAny(input, style);
    if (typeof out !== 'string') continue;
    const orphans = orphanClusters(out);
    check(orphans.length === 0,
      `${name}: ${JSON.stringify(input)} -> ${cp(out)} has ${orphans.length} cluster(s) starting with a mark`);
  }
}

// Wherever a map style's token ends in a format character (found by scanning
// the rendered letter, not by style name), the mark goes before that character.
let joinerStyles = 0;
for (const [name, style] of Object.entries(S)) {
  if (style.type !== 'map') continue;
  const token = R.renderAny('x', style);
  const trailing = /\p{Cf}+$/u.exec(token);
  if (!trailing || trailing.index === 0) continue;
  joinerStyles++;
  const head = token.slice(0, trailing.index);
  const out = R.renderAny('x̄', style);
  check(out === head + '̄' + trailing[0],
    `${name}: "x\\u0304" -> ${cp(out)}, expected ${cp(head + '̄' + trailing[0])}`);
}
check(joinerStyles >= 1, `expected at least one map style whose tokens end in a format character, found ${joinerStyles}`);

const RI = S['Ultra Regional Indicator'];
assert.ok(RI, 'Ultra Regional Indicator is in the registry');
const riExpect = [
  // letter, its marks, then the joiner
  ['x̄ b', '\u{1F1FD}̄⁠ \u{1F1E7}⁠'],
  ['Z̴̡a̵l̶g̷o̸',
    '\u{1F1FF}̴̡⁠\u{1F1E6}̵⁠\u{1F1F1}̶⁠\u{1F1EC}̷⁠\u{1F1F4}̸⁠'],
  ['a⃣ b', '\u{1F1E6}⃣⁠ \u{1F1E7}⁠'],
  // NFC puts U+0323 (ccc 220) before U+0307 (ccc 230); both stay on the q
  ['q̣̇', '\u{1F1F6}̣̇⁠'],
  // unchanged: no mark, the joiner still keeps two letters from pairing into a flag
  ['ID', '\u{1F1EE}⁠\u{1F1E9}⁠'],
  // unchanged: a flag the visitor typed passes through as typed
  ['\u{1F1EE}\u{1F1E9}\u{1F1F0}\u{1F1F7}', '\u{1F1EE}\u{1F1E9}\u{1F1F0}\u{1F1F7}'],
  // unchanged: a precomposed accent passes through (the style is accentSafe: false)
  ['café', '\u{1F1E8}⁠\u{1F1E6}⁠\u{1F1EB}⁠é'],
  // unchanged: a joiner the visitor typed is theirs, and stays where they typed it
  ['x⁠̄', '\u{1F1FD}⁠⁠̄'],
  // a compatibility ideograph keeps its identity beside a marked letter
  ['豈x̄塚', '豈\u{1F1FD}̄⁠塚']
];
for (const [input, want] of riExpect) {
  const out = R.renderAny(input, RI);
  check(out === want, `Ultra Regional Indicator: ${cp(input)} -> ${cp(out)}, expected ${cp(want)}`);
}
// The same rule holds where a precomposed accent is reattached to a token
// (accentSafe styles). No style with joiner tokens is accentSafe today, so this
// drives a copy of the style with the flag flipped: é -> RI E + U+0301 + U+2060.
const riAccentSafe = Object.assign({}, RI, { accentSafe: true });
const reattached = R.renderAny('é', riAccentSafe);
check(reattached === '\u{1F1EA}́⁠', `accentSafe regional indicator: U+00E9 -> ${cp(reattached)}, expected U+1F1EA U+0301 U+2060`);

// Each marked letter is one cluster [RI + marks], followed by the joiner on its own.
const zalgoOut = R.renderAny('Z̴̡a̵l̶g̷o̸', RI);
const zc = clusters(zalgoOut);
check(zc.length === 10 && zc.every((c, i) => (i % 2 ? c === '⁠' : /^\p{RI}\p{M}+$/u.test(c))),
  `Ultra Regional Indicator zalgo clusters: ${zc.map(cp).join(' | ')}`);

// CJK compatibility ideographs pass through unchanged on their own, in any style
// that does not restyle CJK.
for (const name of ['Ultra Regional Indicator', 'Ultra Bold', 'lowercase']) {
  for (const compat of ['豈', '塚']) {
    const out = R.renderAny(compat, S[name]);
    check(out === compat, `${name}: ${cp(compat)} -> ${cp(out)}`);
  }
}

// A plain digit, letter or circled letter without VS16 is still styled as before.
check(R.renderAny('1', S['Ultra Bold']) === '\u{1D7ED}', 'Ultra Bold still styles a bare digit');
check(R.renderAny('Ⓜ', S['lowercase']) === 'ⓜ', 'lowercase still lowers a text-style circled M');

if (failures.length) {
  console.error(`renderer-unicode: ${failures.length} of ${n} checks failed`);
  failures.slice(0, 25).forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`renderer-unicode: ${n} checks passed over ${Object.keys(S).length} styles`);
