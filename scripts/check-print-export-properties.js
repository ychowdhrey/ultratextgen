#!/usr/bin/env node
'use strict';

/**
 * check-print-export-properties.js — the PDF/PNG exporter must carry every CSS
 * property the printed sheet's own layout depends on.
 *
 * THE INCIDENT. `js/printables/printablePdf.js` exports a sheet by cloning the
 * print surface, inlining an ALLOW-LIST of computed properties onto the clone,
 * and painting that clone through an `<svg><foreignObject>`. The clone gets
 * `width` and `height` pinned from the original layout. A property that
 * produced that layout and is missing from the list is therefore dropped while
 * the box it produced stays behind — the children reflow inside a box that
 * still reports the old size, spill out of it, and paint over whatever follows.
 *
 * Measured on /printables/word-search-maker/ at its DEFAULT settings, 2026-09-22:
 * `.pt-search-words` is `columns: 3 8rem`; neither `column-count` nor
 * `column-width` was in the list, so the exported clue list rendered as ONE
 * column running 476px past its own box — across the Name/Date row, across the
 * credit QR, and off the bottom of the page. Three of ten words were missing
 * from the downloaded file. The crossword's word bank reuses the same class and
 * overlapped the ACROSS/DOWN clues the same way.
 *
 * NOTHING IN THE DOM SHOWS THIS. The page is correct, the preview is correct,
 * and every geometry assertion over the print surface passes: the defect is
 * created by the clone, in the file. That is what this check exists for — it
 * compares the exporter's list against the properties the print-surface CSS
 * actually declares, so the next property added there cannot be dropped in
 * silence.
 *
 * WHOLE-FILE AND GATING, not diff-scoped. The backlog is zero by construction
 * after the 2026-09-22 repair, so there is nothing to be permanently red
 * against — the same call `check:printables-surface-wiring` makes.
 *
 * FAILS CLOSED. If the allow-list cannot be located, or the print-surface
 * markers match no rules at all, it exits 2 and says nothing was compared,
 * rather than reporting a clean it did not earn.
 *
 *   node scripts/check-print-export-properties.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PDF = path.join(ROOT, 'js/printables/printablePdf.js');
const CSS = path.join(ROOT, 'style.css');

/* Selector fragments that put a rule inside the exported subtree.
   The exporter clones `#pt-print-root`'s wrap, so this is the set of class
   names the engine's SHEET builders write (printablesEngine.js
   sheetPageNode/appendSheetPages and the per-surface *SheetNode functions),
   plus the two body classes that scope the print-only layout. A new sheet
   class belongs here in the same change that introduces it; the count assert
   below is what stops this list from silently matching nothing. */
const SURFACE_MARKERS = [
  '#pt-print-root', 'pt-pdf-rendering', 'is-printing',
  'pt-sheet-page', 'pt-tile-page', 'pt-banner-page', 'bubble-print-book-page',
  'pt-credit', 'pt-nup-', 'pt-name-sheet', 'pt-name-row', 'pt-gen-sheet', 'pt-gen-row',
  'pt-search-sheet', 'pt-search-grid', 'pt-search-cell', 'pt-search-words', 'pt-search-note',
  'pt-search-footer', 'pt-search-heading-text', 'pt-search-print-holder',
  'pt-cw-', 'pt-sc-', 'pt-puzzle-', 'pt-banner-', 'pt-design-sheet', 'pt-design-print-holder',
  'pt-tile-cell', 'pt-glyph-cell', 'pt-glyph-print', 'pt-word-outline', 'pt-trace-svg',
  'bubble-print', 'bubble-outline', 'cursive-print-row', 'cs-print', 'pt-fill-page'
];

/* Properties that cannot change a STATIC RASTER of the clone, with the reason.
   The clone is painted once, at one size, with no interaction, no animation
   and no page fragmentation, so these are genuinely inert there — this is not
   a list of exemptions, it is a list of properties the export cannot use. */
const INERT = new Map([
  ['cursor', 'pointer only'], ['pointer-events', 'no interaction in a raster'],
  ['user-select', 'no selection'], ['-webkit-user-select', 'no selection'],
  ['touch-action', 'no interaction'], ['caret-color', 'no caret'],
  ['scroll-behavior', 'no scrolling'], ['overscroll-behavior', 'no scrolling'],
  ['scroll-margin-top', 'no scrolling'], ['scroll-padding-top', 'no scrolling'],
  ['resize', 'no interaction'], ['appearance', 'no form controls in a sheet'],
  ['-webkit-appearance', 'no form controls in a sheet'], ['accent-color', 'no form controls'],
  ['transition', 'painted once'], ['transition-property', 'painted once'],
  ['transition-duration', 'painted once'], ['transition-timing-function', 'painted once'],
  ['transition-delay', 'painted once'], ['animation', 'painted once'],
  ['animation-name', 'painted once'], ['animation-duration', 'painted once'],
  ['animation-timing-function', 'painted once'], ['animation-iteration-count', 'painted once'],
  ['animation-delay', 'painted once'], ['animation-fill-mode', 'painted once'],
  ['will-change', 'painted once'],
  ['page-break-after', 'the clone is not fragmented'], ['page-break-before', 'the clone is not fragmented'],
  ['page-break-inside', 'the clone is not fragmented'], ['break-after', 'the clone is not fragmented'],
  ['break-before', 'the clone is not fragmented'], ['break-inside', 'the clone is not fragmented'],
  ['orphans', 'the clone is not fragmented'], ['widows', 'the clone is not fragmented'],
  ['size', '@page only'], ['outline', 'focus only'], ['outline-offset', 'focus only'],
  ['outline-color', 'focus only'], ['outline-width', 'focus only'], ['outline-style', 'focus only'],
  ['box-shadow', 'print sheets are flat ink; the exporter drops shadows deliberately'],
  ['print-color-adjust', 'honoured by the print dialog, not by a canvas'],
  ['-webkit-print-color-adjust', 'honoured by the print dialog, not by a canvas'],
  ['aria-hidden', 'not a CSS property']
]);

/* CSS shorthands, mapped to the longhands the exporter has to carry for the
   shorthand to survive. A rule writes `border-bottom: 1px solid #94a3b8`; the
   exporter never sees that string, it reads the computed longhands. So a
   shorthand counts as carried when all of its longhands are on the list. */
const SIDES = ['top', 'right', 'bottom', 'left'];
const borderSide = (s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`];
const SHORTHANDS = new Map([
  ['background', ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat']],
  ['border', SIDES.flatMap(borderSide)],
  ['border-top', borderSide('top')], ['border-right', borderSide('right')],
  ['border-bottom', borderSide('bottom')], ['border-left', borderSide('left')],
  ['border-width', SIDES.map((s) => `border-${s}-width`)],
  ['border-style', SIDES.map((s) => `border-${s}-style`)],
  ['border-color', SIDES.map((s) => `border-${s}-color`)],
  ['margin', SIDES.map((s) => `margin-${s}`)],
  ['padding', SIDES.map((s) => `padding-${s}`)],
  ['inset', SIDES],
  ['flex', ['flex-grow', 'flex-shrink', 'flex-basis']],
  ['flex-flow', ['flex-direction', 'flex-wrap']],
  ['gap', ['row-gap', 'column-gap']],
  ['grid-template', ['grid-template-columns', 'grid-template-rows']],
  ['grid-area', ['grid-column', 'grid-row']],
  ['list-style', ['list-style-type', 'list-style-position']],
  ['font', ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height']],
  ['place-items', ['align-items', 'justify-items']],
  ['place-content', ['align-content', 'justify-content']]
]);

function carried(p, props) {
  if (props.has(p)) return true;
  const longhands = SHORTHANDS.get(p);
  return !!longhands && longhands.every((l) => props.has(l));
}

function fail(msg) { console.error(msg); }

function readPropsList() {
  if (!fs.existsSync(PDF)) return null;
  const src = fs.readFileSync(PDF, 'utf8');
  const m = src.match(/const PROPS = \[([\s\S]*?)\];/);
  if (!m) return null;
  /* Strip the comments inside the array first. The list carries explanatory
     `//` lines that quote property names, and reading those as entries made
     this check pass on a list the property had just been REMOVED from — the
     negative test caught it, which is the only reason it is not still true. */
  const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const list = [...body.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  return list.length ? new Set(list) : null;
}

/* Rule extraction, by brace walk rather than by regex over the whole file:
   style.css carries @media and @supports blocks, and a regex for
   `selector { … }` matches the at-rule's own preamble as a selector. */
function rules(css) {
  const out = [];
  let i = 0;
  const stack = [];
  let buf = '';
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i); i = end === -1 ? css.length : end + 2; continue; }
    if (c === '{') {
      const sel = buf.trim(); buf = '';
      if (sel.startsWith('@')) { stack.push({ at: true }); i++; continue; }
      // Read the declaration block up to its matching close.
      let depth = 1, j = i + 1, body = '';
      while (j < css.length && depth > 0) {
        if (css[j] === '/' && css[j + 1] === '*') { const e = css.indexOf('*/', j); j = e === -1 ? css.length : e + 2; continue; }
        if (css[j] === '{') depth++;
        else if (css[j] === '}') { depth--; if (!depth) break; }
        body += css[j]; j++;
      }
      out.push({ selector: sel, body: body, line: css.slice(0, i).split('\n').length });
      i = j + 1; continue;
    }
    if (c === '}') { stack.pop(); buf = ''; i++; continue; }
    buf += c; i++;
  }
  return out;
}

const props = readPropsList();
if (!props) {
  console.error('UNKNOWN: the PROPS allow-list could not be read from js/printables/printablePdf.js —');
  console.error('nothing was compared. If you renamed or restructured it, update this script in the same change.');
  process.exit(2);
}
if (!fs.existsSync(CSS)) {
  console.error('UNKNOWN: style.css not found — nothing was compared.');
  process.exit(2);
}

const all = rules(fs.readFileSync(CSS, 'utf8'));
const surface = all.filter((r) => SURFACE_MARKERS.some((m) => r.selector.includes(m)));
if (!surface.length) {
  console.error('UNKNOWN: no print-surface rules matched — nothing was compared.');
  console.error('SURFACE_MARKERS has gone stale against style.css; update it in the same change.');
  process.exit(2);
}

const missing = new Map();   // property -> [{selector, line}]
const pseudo = [];
for (const r of surface) {
  if (/::(before|after|marker|first-line|first-letter)/.test(r.selector)) {
    pseudo.push({ selector: r.selector, line: r.line });
  }
  for (const m of r.body.matchAll(/(^|;)\s*([-a-zA-Z]+)\s*:/g)) {
    const p = m[2].toLowerCase();
    if (p.startsWith('--')) continue;
    if (carried(p, props) || INERT.has(p)) continue;
    if (!missing.has(p)) missing.set(p, []);
    if (missing.get(p).length < 4) missing.get(p).push({ selector: r.selector.replace(/\s+/g, ' ').slice(0, 90), line: r.line });
  }
}

console.log(`Compared ${props.size} exported properties against ${surface.length} print-surface rules in style.css.`);

let failed = false;
if (missing.size) {
  failed = true;
  console.error('\nFAIL — the printed sheet uses properties the PDF/PNG export does not carry.');
  console.error('The clone keeps the box these produced and loses the rule that filled it.\n');
  for (const [p, where] of [...missing].sort()) {
    console.error(`  ${p}`);
    for (const w of where) console.error(`      style.css:${w.line}  ${w.selector}`);
  }
  console.error('\nFix: add the property to PROPS in js/printables/printablePdf.js (a shorthand whose');
  console.error('computed value round-trips, such as "columns" or "overflow", carries its longhands),');
  console.error('or add it to INERT here WITH the reason it cannot affect a static raster.');
}

if (pseudo.length) {
  console.log(`\nNOTE — ${pseudo.length} print-surface rule(s) style a pseudo-element.`);
  console.log('cloneNode() does not reproduce pseudo-elements and inlineStyles() only walks real');
  console.log('elements, so these paint on screen and in the print dialog but NOT in the PDF or PNG.');
  for (const p of pseudo.slice(0, 8)) console.log(`      style.css:${p.line}  ${p.selector.replace(/\s+/g, ' ').slice(0, 90)}`);
}

if (failed) process.exit(1);
console.log('OK — every property the print surface declares is one the export carries.');
