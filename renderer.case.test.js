#!/usr/bin/env node
'use strict';

/**
 * renderer.case.test.js
 *
 * Run: node renderer.case.test.js        (npm run test:case-converter)
 *
 * Zero dependencies, the same idiom as header.test.js. Loads the real
 * styles.js and renderer.js and drives them through renderAny, the way the
 * case converter page does, so the test can never drift from the shipped code.
 *
 * What it pins, and why each case is here:
 *   - Caps-Lock text (no lowercase letter anywhere) converts in Capitalized,
 *     Title and Sentence case. The page's first FAQ answer promises exactly
 *     this; before the fix all three returned the input unchanged.
 *   - An all-caps word inside text that also has lowercase stays an acronym
 *     (NASA, FBI). This is the protection the converter was built with.
 *   - Internal capitals (McDonald, iPhone) are untouched.
 *   - Mc and O' surnames get their second capital when the word is
 *     lower-cased first; Mac, van, de and "o'clock" are left alone.
 *   - Text in an uncased script is unchanged, and an acronym beside it stays.
 *   - Turkish casing follows the page's lang attribute.
 *   - The word "i" is capitalised to "I" in English only. In Polish, Italian,
 *     Croatian and Czech it is "and" and stays lower case.
 *   - Upside-down and reverse styles reverse by user-perceived character, so a
 *     flag, a family emoji, a skin tone, a Thai or Devanagari cluster survives.
 *   - The ligature letters ß æ œ are written out as the two letters they stand
 *     for in a styled map (Straße is Strasse, not Strase), and the one-piece
 *     letters with no second letter (ł đ ø) still fold to their base letter.
 */

const assert = require('assert');

global.window = global;
global.document = { documentElement: { lang: 'en' } };
require('./styles.js');
require('./renderer.js');

const render = window.UltraTextGenRender.renderAny;
const styles = window.textStyles;

const MODES = {
  capitalized: styles['Capitalized Case'],
  title: styles['Title Case'],
  sentence: styles['Sentence case']
};

let failures = 0;
let checks = 0;

function expect(mode, input, want, lang) {
  const prev = document.documentElement.lang;
  if (lang) document.documentElement.lang = lang;
  let got;
  try {
    got = render(input, MODES[mode]);
  } finally {
    document.documentElement.lang = prev;
  }
  checks += 1;
  try {
    assert.strictEqual(got, want);
  } catch (e) {
    failures += 1;
    console.error(`FAIL ${mode}${lang ? ' [' + lang + ']' : ''}: ${JSON.stringify(input)}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`);
    return;
  }
  console.log(`ok   ${mode}${lang ? ' [' + lang + ']' : ''}: ${JSON.stringify(input)} -> ${JSON.stringify(got)}`);
}

// --- Caps-Lock text converts -------------------------------------------------
expect('capitalized', 'HELLO', 'Hello');
expect('title', 'HELLO', 'Hello');
expect('sentence', 'HELLO', 'Hello');

expect('capitalized', 'LOREM IPSUM DOLOR', 'Lorem Ipsum Dolor');
expect('title', 'THE LORD OF THE RINGS', 'The Lord of the Rings');
expect('sentence', 'I LEFT CAPS LOCK ON. IT IS FIXED NOW.', 'I left caps lock on. It is fixed now.');
expect('sentence', "I'M SURE I'LL BE THERE", "I'm sure I'll be there");
expect('capitalized', 'ÉCOLE NORMALE', 'École Normale');
expect('title', 'ΚΑΛΗΜΈΡΑ ΚΌΣΜΕ', 'Καλημέρα Κόσμε');
expect('capitalized', 'HELLO 123 WORLD!', 'Hello 123 World!');

// --- Mixed text keeps acronyms ----------------------------------------------
expect('capitalized', 'The NASA team met the FBI', 'The NASA Team Met The FBI');
expect('title', 'The NASA team met the FBI', 'The NASA Team Met the FBI');
expect('sentence', 'The NASA team met the FBI', 'The NASA team met the FBI');
expect('title', 'visit NASA today', 'Visit NASA Today');
expect('sentence', 'we asked the FBI. they said NASA knew.', 'We asked the FBI. They said NASA knew.');

// --- A lone acronym has no lowercase beside it, so it reads as Caps Lock ------
expect('title', 'NASA', 'Nasa');

// --- Internal capitals untouched --------------------------------------------
expect('capitalized', "McDonald's iPhone", "McDonald's iPhone");
expect('title', 'my iPhone and McDonald', 'My iPhone and McDonald');
expect('sentence', 'the iPhone is here', 'The iPhone is here');

// --- Mc and O' surnames ------------------------------------------------------
expect('capitalized', "john mcdavid and miles o'brien", "John McDavid And Miles O'Brien");
expect('title', "john mcdavid and miles o'brien", "John McDavid and Miles O'Brien");
expect('title', 'JOHN MCDAVID AND MILES O’BRIEN', 'John McDavid and Miles O’Brien');
expect('capitalized', 'mary-jane mccoy-smith', 'Mary-Jane McCoy-Smith');
expect('sentence', 'mcdavid scored. o\'brien assisted.', "McDavid scored. O'Brien assisted.");
// narrow on purpose
expect('capitalized', 'mcg and mcq', 'Mcg And Mcq');
expect('capitalized', "o'clock o'er", "O'clock O'er");
expect('capitalized', 'macdonald van der berg de la cruz', 'Macdonald Van Der Berg De La Cruz');

// --- Uncased scripts and punctuation-only input unchanged --------------------
expect('capitalized', '日本語', '日本語');
expect('title', '한글 텍스트', '한글 텍스트');
expect('sentence', '日本語 ABC', '日本語 ABC');
expect('capitalized', '123 !?', '123 !?');
expect('title', '', '');

// --- Whitespace preserved ----------------------------------------------------
expect('capitalized', 'A  B\tC\nD', 'A  B\tC\nD');
expect('capitalized', 'HELLO  WORLD\nAGAIN', 'Hello  World\nAgain');

// --- Turkish follows the page language ---------------------------------------
expect('capitalized', 'ISPARTA İSTANBUL', 'Isparta İstanbul', 'tr');
expect('sentence', 'IŞIK İYİ', 'Işık iyi', 'tr');

// --- "i" is a pronoun in English only ----------------------------------------
expect('sentence', 'i think i am here. i\'m sure', "I think I am here. I'm sure");
expect('sentence', 'ala i ola poszły do szkoły i do domu', 'Ala i ola poszły do szkoły i do domu', 'pl');
expect('sentence', 'gli amici e i libri', 'Gli amici e i libri', 'it');
expect('sentence', 'ana i marko idu u školu', 'Ana i marko idu u školu', 'hr');
expect('sentence', 'petr i jana', 'Petr i jana', 'cs');
expect('sentence', 'i think so', 'I think so', 'en-GB');

// --- Reversing styles keep user-perceived characters whole ---------------------
function expectStyle(name, input, want) {
  checks += 1;
  const got = render(input, styles[name]);
  if (got !== want) {
    failures += 1;
    console.error(`FAIL ${name}: ${JSON.stringify(input)}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`);
    return;
  }
  console.log(`ok   ${name}: ${JSON.stringify(input)} -> ${JSON.stringify(got)}`);
}
const REVERSE = ['Reverse Order Only', 'Reverse + Flip Combo', 'Fully Flipped Unicode', 'Mixed Flip Fallback'];
REVERSE.forEach(name => {
  const ascii = render('hello', styles[name]);
  expectStyle(name, '\u{1F1EB}\u{1F1F7} ok', render('ok', styles[name]) + ' \u{1F1EB}\u{1F1F7}');
  expectStyle(name, 'a \u{1F468}\u200D\u{1F469}\u200D\u{1F467}', '\u{1F468}\u200D\u{1F469}\u200D\u{1F467} ' + render('a', styles[name]));
  expectStyle(name, '\u{1F44D}\u{1F3FD}x', render('x', styles[name]) + '\u{1F44D}\u{1F3FD}');
  expectStyle(name, '\u0E44\u0E01\u0E48', '\u0E01\u0E48\u0E44');
  expectStyle(name, '\u0938\u0941\u0928\u094D\u0926\u0930', '\u0930\u0928\u094D\u0926\u0938\u0941');
  checks += 1;
  if (!ascii) { failures += 1; console.error(`FAIL ${name}: ASCII came back empty`); }
});
expectStyle('Reverse Order Only', 'hello', 'olleh');
expectStyle('Reverse + Flip Combo', 'hello', 'o\u05DF\u05DF\u01DD\u0265');
expectStyle('Reverse Order Only', 'e\u0301a', 'ae\u0301');

// --- Turkish dotless i passes through as typed (a dotted i is another letter) -------
['Ultra Bold', 'Ultra Script'].forEach(name => {
  const st = styles[name];
  expectStyle(name, 'ışık', '\u0131' + render('ş', st) + '\u0131' + render('k', st));
});

// --- Ligature letters are written out, not folded to one letter -----------------
['Ultra Bold', 'Ultra Script', 'Ultra Double-Struck'].forEach(name => {
  const st = styles[name];
  expectStyle(name, 'Stra\u00dfe', render('Strasse', st));
  expectStyle(name, 'GRO\u1E9E', render('GROSS', st));
  expectStyle(name, 'c\u0153ur', render('coeur', st));
  expectStyle(name, '\u00c6ble', render('AEble', st));
  expectStyle(name, 'Pawe\u0142', render('Pawel', st));
  expectStyle(name, '\u00f8l', render('ol', st));
});

if (failures) {
  console.error(`\n${failures} of ${checks} case-converter checks failed`);
  process.exit(1);
}
console.log(`\nall ${checks} case-converter checks passed`);
