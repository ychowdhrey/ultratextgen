'use strict';
/**
 * text-object-grid.js — which `.flag-rows` grids hold text objects.
 *
 * A library grid is either a GLYPH grid (★, √, 🇰🇷, 👨‍👩‍👧: one visual
 * character per tile) or a TEXT grid (kaomoji, dongers, emoji combos,
 * borders: a composed expression per tile). The two need different layouts,
 * and a text grid marks itself with `flag-rows--text` in its static HTML.
 * Deciding that at runtime would move the layout after first paint.
 *
 * What counts as a text object is defined ONCE, in the shipped browser code:
 * this module slices the `@text-object` region out of symbol-explorer.js and
 * evaluates it, the arrangement scripts/lib/collection-grid-engine.js uses. It
 * THROWS when a marker is missing rather than falling back to a local copy.
 *
 * The rule: a grid is a text grid when ANY of its tiles is a text object. A
 * mixed grid (★★★★★ beside ★) renders its glyphs acceptably as small cards,
 * while a text object in the glyph grid does not fit at all.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = path.join(__dirname, '..', '..', 'symbol-explorer.js');
const MARKER = '@text-object';

function load() {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const begin = src.indexOf(`/* ${MARKER}:begin */`);
  const end = src.indexOf(`/* ${MARKER}:end */`);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(
      `text-object-grid: ${MARKER} markers missing from symbol-explorer.js. ` +
      'If the classifier moved, move the markers with it; do not reimplement it here.'
    );
  }
  const code = src.slice(begin, end) +
    '\n;({ TEXT_OBJECT_MIN_WIDTH, TEXT_GRID_CLASS, copyItemWidth, isTextObject });';
  return vm.runInNewContext(code, { Intl }, { filename: 'symbol-explorer.js#text-object' });
}

const engine = load();

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeAttr(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(cp);
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
  });
}

const OPEN_RE = /<div\b[^>]*\bclass="([^"]*\bflag-rows\b[^"]*)"[^>]*>/g;
const DIV_RE = /<div\b[^>]*>|<\/div\s*>/gi;
const SYMBOL_RE = /\bdata-symbol="([^"]*)"/g;

/** Every static `.flag-rows` grid in an HTML string. */
function findGrids(html) {
  const grids = [];
  OPEN_RE.lastIndex = 0;
  let m;
  while ((m = OPEN_RE.exec(html))) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (!classes.includes('flag-rows')) continue;
    // Walk to the matching </div> so a grid's tiles are never read from the next grid.
    let depth = 1;
    DIV_RE.lastIndex = OPEN_RE.lastIndex;
    let d;
    let end = html.length;
    while ((d = DIV_RE.exec(html))) {
      depth += d[0][1] === '/' ? -1 : 1;
      if (depth === 0) { end = d.index; break; }
    }
    const body = html.slice(OPEN_RE.lastIndex, end);
    const symbols = [];
    let s;
    SYMBOL_RE.lastIndex = 0;
    while ((s = SYMBOL_RE.exec(body))) symbols.push(decodeAttr(s[1]));
    const textObjects = symbols.filter((v) => engine.isTextObject(v));
    grids.push({
      start: m.index,
      openTag: m[0],
      classAttr: m[1],
      hasClass: classes.includes(engine.TEXT_GRID_CLASS),
      symbols,
      textObjects,
      // A grid filled at runtime (#countryFlagList) has no static tiles to judge.
      shouldHaveClass: textObjects.length > 0,
    });
  }
  return grids;
}

/** The HTML with every grid's modifier class matching its contents. */
function applyClasses(html) {
  const grids = findGrids(html).filter((g) => g.hasClass !== g.shouldHaveClass);
  let out = html;
  for (const g of grids.reverse()) {
    const classes = g.classAttr.split(/\s+/).filter(Boolean).filter((c) => c !== engine.TEXT_GRID_CLASS);
    if (g.shouldHaveClass) classes.splice(classes.indexOf('flag-rows') + 1, 0, engine.TEXT_GRID_CLASS);
    const tag = g.openTag.replace(`class="${g.classAttr}"`, `class="${classes.join(' ')}"`);
    out = out.slice(0, g.start) + tag + out.slice(g.start + g.openTag.length);
  }
  return { html: out, changed: grids.length };
}

module.exports = { ...engine, findGrids, applyClasses, decodeAttr };
