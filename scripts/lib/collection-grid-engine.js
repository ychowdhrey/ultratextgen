'use strict';
/**
 * collection-grid-engine.js — run the live collection-grid renderer in Node.
 *
 * The 898 pages that render a copy-paste collection section ship an empty
 * `<div id="…Container">` and call `UltraTextGen.buildGrids(id, GROUPS)` after
 * load. scripts/prerender-collection-grids.js writes that markup into the page
 * at build time so the section exists for a crawler that runs no JavaScript.
 *
 * For the static markup and the runtime markup to be the same markup, the
 * generator must use the SHIPPED renderer, not a copy of it. So this module
 * slices the marked regions out of symbol-explorer.js and evaluates them —
 * the arrangement scripts/lib/zalgo-engine.js already uses for the zalgo
 * generator, and for the same reason CLAUDE.md gives for the library-hub
 * builders: a second copy of the markup drifts from the first and nothing
 * reports it.
 *
 * Four regions, concatenated in file order:
 *   @collection-grid-icons   — COPY_ICON (the inline SVG inside every button)
 *   @collection-grid-strings — UI_STRINGS (the per-locale button labels)
 *   @collection-grid-iso     — isoToFlag, which 18 flag pages build GROUPS with
 *   @collection-grid         — FORMATS, formatItems, escHtml, activeFormatsFor,
 *                              gridSectionHTML, gridSectionsHTML
 *
 * It THROWS when a marker is missing rather than falling back to a local copy:
 * a silent fallback is how a generator starts emitting markup the site no
 * longer ships.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = path.join(__dirname, '..', '..', 'symbol-explorer.js');
const SLICES = [
  '@collection-grid-icons', '@collection-grid-strings',
  '@collection-grid-iso', '@collection-grid', '@country-flag-rows'
];
const EXPORTS = [
  'COPY_ICON', 'UI_STRINGS', 'FORMATS',
  'formatItems', 'escHtml', 'activeFormatsFor', 'isoToFlag',
  'gridSectionHTML', 'gridSectionsHTML', 'countryFlagRowsHTML'
];

function slice(src, marker) {
  const begin = src.indexOf(`/* ${marker}:begin */`);
  const end = src.indexOf(`/* ${marker}:end */`);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(
      `collection-grid-engine: ${marker} markers missing from symbol-explorer.js. ` +
      'If the renderer moved, move the markers with it — do not reimplement it here.'
    );
  }
  return src.slice(begin, end);
}

function load() {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const code = SLICES.map((m) => slice(src, m)).join('\n') +
    `\n;({ ${EXPORTS.join(', ')} });`;
  const out = vm.runInNewContext(code, {}, { filename: 'symbol-explorer.js#collection-grid' });
  for (const name of EXPORTS) {
    if (out[name] === undefined) throw new Error(`collection-grid-engine: ${name} not exported`);
  }
  return out;
}

module.exports = load();
