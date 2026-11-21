#!/usr/bin/env node
'use strict';

/**
 * script.coverage-line.test.js
 *
 * Run: node script.coverage-line.test.js        (npm run test:coverage-line)
 *
 * The per-card coverage line names the typed letters a style left plain or
 * changed the case of ("Q stays a regular letter here."), on pages that set
 * window.UTG_COVERAGE_LINE. Small caps has no Q, superscript has no capital F,
 * subscript has no capitals at all, and a visitor who copies "Qᴜɪᴄᴋ" used to
 * find that out after pasting.
 *
 * What it pins:
 *   - The generated table (js/style-coverage.js) has a row for every style in
 *     the registry, and its rows say what the real renderer does: small caps
 *     keeps Q plain, superscript turns F into the small superscript f,
 *     subscript keeps capitals plain and converts digits.
 *   - The card fixtures: "Quick" on small caps names Q; "hello" on small caps
 *     says nothing; "H2O" on subscript names H and O and never the digit;
 *     "Fix" on superscript names the case change on F.
 *   - A locale page whose locale file has no strings gets no line (never
 *     English), and a context-dependent style gets no line.
 *   - Without the flag the card gets nothing, for every style and input, and
 *     the call sits on the line the card already had, so a page that never
 *     sets the flag renders byte-identical cards.
 *
 * The functions are sliced out of script.js between the @coverage-line
 * markers and evaluated, so the test runs the shipped code. A missing marker
 * throws.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { computeCoverage, renderFile, OUTPUT } = require('./scripts/lib/style-coverage');

const ROOT = __dirname;
const BEGIN = '/* @coverage-line:begin */';
const END = '/* @coverage-line:end */';
const SCRIPT = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');

function loadCoverageLine() {
  const b = SCRIPT.indexOf(BEGIN);
  const e = SCRIPT.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(`script.js has no ${BEGIN} … ${END} block. Move the markers with the code; do not copy it here.`);
  }
  const body = SCRIPT.slice(b + BEGIN.length, e);
  const ctx = { Intl, Set, Array };
  vm.createContext(ctx);
  return new vm.Script(`(function () { 'use strict';\n${body}\nreturn { COVERAGE_LINE_EN, coverageLineText }; })()`,
    { filename: 'script.js#coverage-line' }).runInContext(ctx);
}

function loadTable() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(OUTPUT, 'utf8'), sandbox, { filename: OUTPUT });
  return sandbox.UTG_STYLE_COVERAGE;
}

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.strictEqual(a, b, msg); n++; };

const { COVERAGE_LINE_EN: EN, coverageLineText } = loadCoverageLine();
const table = loadTable();
const fresh = computeCoverage();

// 1. The table is the renderer's answer, for every style.
eq(fs.readFileSync(OUTPUT, 'utf8'), renderFile(fresh), 'js/style-coverage.js is stale: run npm run build:style-coverage');
eq(Object.keys(table.states).length, Object.keys(fresh.states).length, 'one row per registry style');
const at = (slug, ch) => table.states[slug][table.chars.indexOf(ch)];
eq(at('ultra-small-caps', 'Q'), 'p', 'small caps keeps Q plain');
eq(at('ultra-small-caps', 'u'), 'c', 'small caps converts u');
eq(at('ultra-small-caps', 'S'), 'k', 'small caps turns S into a plain s');
eq(at('ultra-small-superscript-style', 'F'), 'k', 'superscript F becomes the small superscript f');
eq(at('ultra-small-superscript-style', 'f'), 'c', 'superscript f itself converts');
eq(at('ultra-small-superscript-style', 'A'), 'c', 'superscript A has its own capital');
eq(at('ultra-tiny-subscript', 'H'), 'p', 'subscript keeps capitals plain');
eq(at('ultra-tiny-subscript', '2'), 'c', 'subscript converts digits');
eq(at('ultra-bold', 'Q'), 'c', 'bold converts everything');
ok(table.contextual.includes('upside-down-reverse-only'), 'reversal is context-dependent');
ok(!table.contextual.includes('ultra-small-caps'), 'small caps works letter by letter');

// 2. The card fixtures, in English.
const line = (text, slug, strings = EN, lang = 'en') => coverageLineText(text, slug, table, strings, lang);
eq(line('Quick', 'ultra-small-caps'), 'Q stays a regular letter here.', '"Quick" on small caps names Q');
eq(line('hello', 'ultra-small-caps'), '', '"hello" on small caps: every letter converted, no line');
eq(line('H2O', 'ultra-tiny-subscript'), 'H and O stay regular letters here.', '"H2O" on subscript names the capitals');
ok(!/2/.test(line('H2O', 'ultra-tiny-subscript')), '"H2O" on subscript never names the digit');
eq(line('h2o', 'ultra-tiny-subscript'), '', 'small h, 2 and o all convert in subscript');
eq(line('Fix', 'ultra-small-superscript-style'), 'F becomes lowercase here.', '"Fix" on superscript names the case change on F');
eq(line('Quick fox', 'ultra-small-caps'), 'Q and x stay regular letters here.', 'several letters, in typed order');
eq(line('QQq', 'ultra-small-caps'), 'Q and q stay regular letters here.', 'each letter named once');
eq(line('Sax', 'ultra-small-caps'), 'x stays a regular letter here. S becomes lowercase here.', 'kept plain and case change together');
eq(line('Q1', 'ultra-italic'), '1 stays a regular character here.', 'a digit is a character, not a letter');
eq(line('Quick', 'ultra-bold'), '', 'a style that converts everything gets no line');
eq(line('', 'ultra-small-caps'), '', 'empty input, no line');
eq(line('Q́', 'ultra-small-caps'), '', 'an accented Q is not the plain Q');
eq(line('Quick', 'upside-down-reverse-only'), '', 'a context-dependent style gets no line');
eq(line('Quick', 'no-such-style'), '', 'an unknown style gets no line');
eq(coverageLineText('Quick', 'ultra-small-caps', undefined, EN, 'en'), '', 'no table on the page, no line');

// 3. Locale strings: a locale without them shows nothing, never English.
eq(line('Quick', 'ultra-small-caps', null, 'de'), '', 'no locale strings, no line');
eq(line('Quick', 'ultra-small-caps', { keptLetters: '{chars} x' }, 'de'), '', 'a missing sentence means no line');
eq(line('Quick', 'ultra-small-caps', { keptLetter: '{chars} bleibt ein normaler Buchstabe.' }, 'de'),
  'Q bleibt ein normaler Buchstabe.', 'a locale with the sentence gets it');
eq(line('Quick fox', 'ultra-small-caps', { keptLetters: '{chars} bleiben normale Buchstaben.' }, 'de'),
  'Q und x bleiben normale Buchstaben.', 'the list is joined in the page language');

// 4. Without the flag: nothing, for every style and input, and no new markup.
const HTML_BEGIN = SCRIPT.indexOf('function coverageLineHtml(');
ok(HTML_BEGIN !== -1, 'script.js has coverageLineHtml');
const htmlSrc = SCRIPT.slice(HTML_BEGIN, SCRIPT.indexOf('\n  }\n', HTML_BEGIN) + 4);
const evalHtml = (win, value) => {
  const ctx = {
    window: win,
    el: { mainInput: { value } },
    currentScope: 'all',
    PAGE_LANG: 'en',
    uiText: (p, f) => f,
    escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    COVERAGE_LINE_EN: EN,
    coverageLineText,
    Object,
  };
  vm.createContext(ctx);
  return new vm.Script(`${htmlSrc}; coverageLineHtml`).runInContext(ctx);
};
const INPUTS = ['Quick', 'hello', 'H2O', 'Fix', 'Luna', 'The Quick Brown Fox 123', 'Sax qx'];
for (const slug of Object.keys(table.states)) {
  for (const value of INPUTS) {
    const off = evalHtml({ UTG_STYLE_COVERAGE: table }, value);
    eq(off({ slug }, false), '', `${slug} "${value}": no flag, no line`);
  }
}
const on = evalHtml({ UTG_COVERAGE_LINE: true, UTG_STYLE_COVERAGE: table }, 'Quick');
eq(on({ slug: 'ultra-small-caps' }, false), '<p class="style-coverage">Q stays a regular letter here.</p>', 'flag on: the line is plain text in the card');
eq(on({ slug: 'ultra-small-caps' }, true), '', 'the demo card (nothing typed) gets no line');
eq(evalHtml({ UTG_COVERAGE_LINE: true }, 'Quick')({ slug: 'ultra-small-caps' }, false), '', 'flag on but no table loaded: no line');
ok(/\$\{platformChipsHtml\(style\)\}\$\{coverageLineHtml\(style, isDemo\)\}\n/.test(SCRIPT),
  'the call shares the platform-chips line, so a page without the flag gets no new whitespace either');
ok(!/aria-live/.test(htmlSrc), 'the line is not a live region');

console.log(`coverage line: ${n} assertions passed`);
