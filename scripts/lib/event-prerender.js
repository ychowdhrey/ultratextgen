'use strict';
/**
 * event-prerender.js — write an event page's payload as static HTML.
 *
 * Every event page used to ship its phrases, fonts, symbols, kaomoji, ASCII
 * art and native-script tiles only inside window.UTG_EVENT_DATA, so a client
 * that runs no JavaScript (several search and AI crawlers) saw empty boxes
 * where the page's whole payload should be.
 *
 * This renders those sections at build time from the SHIPPED browser files,
 * run in a Node vm:
 *
 *   styles.js + renderer.js          the Unicode styles
 *   js/decorator/decoratorEngine.js  compositions, with the page's own theme
 *   js/events/eventCompose.js        composition logic, hand-off URLs, markup
 *   symbol-explorer.js (sliced)      the collection grids, via collection-grid-engine
 *
 * so the static markup is the markup the controller would build, not a copy
 * of it. Called by scripts/generate_event_page_from_spec.py with the page's
 * event data on stdin; prints {section: html} as JSON.
 *
 *   echo '<event data json>' | node scripts/lib/event-prerender.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const grid = require('./collection-grid-engine');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const SOURCES = {
  styles: read('styles.js'),
  renderer: read('renderer.js'),
  engine: read('js/decorator/decoratorEngine.js'),
  compose: read('js/events/eventCompose.js')
};

/* A fresh context per page: the decorator engine reads its theme list once,
   at load, from window.UTG_DECORATOR_THEMES. */
function loadContext(themes) {
  const sandbox = { console, Intl };
  sandbox.window = sandbox;
  sandbox.UTG_DECORATOR_THEMES = themes;
  vm.createContext(sandbox);
  vm.runInContext(SOURCES.styles, sandbox, { filename: 'styles.js' });
  sandbox.textStyles = sandbox.window.textStyles;
  vm.runInContext(SOURCES.renderer, sandbox, { filename: 'renderer.js' });
  vm.runInContext(SOURCES.engine, sandbox, { filename: 'decoratorEngine.js' });
  vm.runInContext(SOURCES.compose, sandbox, { filename: 'eventCompose.js' });
  return {
    styles: sandbox.textStyles,
    render: sandbox.UltraTextGenRender,
    engine: sandbox.UTGDecoratorEngine,
    compose: sandbox.UTGEventCompose
  };
}

function groupPhrases(phrases, fallback) {
  const order = [];
  const buckets = new Map();
  phrases.forEach((p) => {
    const key = p.group || fallback;
    if (!buckets.has(key)) { buckets.set(key, []); order.push(key); }
    buckets.get(key).push(p);
  });
  return order.map((k) => [k, buckets.get(k)]);
}

function prerender(data) {
  const comp = data.compositions || null;
  const ctx = loadContext(comp ? [comp.theme] : []);
  const C = ctx.compose;
  const H = C.html;
  const ui = data.ui || {};
  const sample = data.samplePhrase;
  const deps = { renderAny: ctx.render.renderAny, styles: ctx.styles, engine: ctx.engine };
  const out = {};

  if (comp) {
    const cards = C.compose(comp, sample, '', comp.intensity.default, 1, deps);
    out.compositions = cards.map((c) => H.compositionCard(c, ui)).join('');
    out.compositionCount = cards.length;
  }

  const keys = (data.fonts && data.fonts.curatedKeys) || [];
  out.fonts = keys.filter((k) => ctx.styles[k]).map((k) =>
    H.fontCard(C.styleLabel(k, ui.styleWords), ctx.render.renderAny(sample, ctx.styles[k]), k, ui)
  ).join('');

  if (data.handoffs && data.handoffs.length) {
    out.handoffs = data.handoffs.map((h) => H.handoffCard(h, C.handoffHref(h, h.targetDef, '', ''))).join('');
  }

  const phrases = (data.phraseBank || []).filter((p) => p && p.text);
  if (phrases.length) {
    const chips = data.phraseDisplay === 'chips';
    const build = (p) => (chips ? H.phraseChip(p) : H.phraseCard(p));
    const gridClass = chips ? 'event-chip-row' : 'compare-grid';
    if (phrases.some((p) => p.group)) {
      out.phrases = groupPhrases(phrases, ui.phraseGroupOther || 'More').map(([name, list]) =>
        '<div class="event-phrase-group"><h3 class="event-phrase-group-title">' + H.esc(name) +
        '</h3><div class="' + gridClass + '">' + list.map(build).join('') + '</div></div>'
      ).join('');
    } else {
      out.phrases = '<div class="' + gridClass + '">' + phrases.map(build).join('') + '</div>';
    }
  }

  const seen = new Set();
  out.native = phrases.filter((p) => p.nativeScript && !seen.has(p.nativeScript) && seen.add(p.nativeScript))
    .map((p) => H.nativeTile(p, ui)).join('');

  const groups = (data.emojiCollections && data.emojiCollections.groups) || [];
  if (groups.length) {
    const tiles = [];
    const seenTile = new Set();
    groups.forEach((g) => g.flags.forEach((f) => {
      if (tiles.length < (data.symbolTileLimit || 24) && !seenTile.has(f)) { seenTile.add(f); tiles.push(f); }
    }));
    out.symbolTiles = tiles.map((t) => H.glyphTile(t, null, ui)).join('');
    const str = grid.UI_STRINGS[data.language] || grid.UI_STRINGS.en;
    const formats = grid.activeFormatsFor(groups);
    out.symbols = groups.map((g, gi) =>
      grid.gridSectionHTML(g, gi, formats[gi], str, grid.FORMATS, grid.COPY_ICON)).join('');
  }

  out.kaomoji = (data.kaomoji || []).filter((k) => k && k.text)
    .map((k) => H.glyphTile(k.text, k.label, ui)).join('');
  out.ascii = (data.asciiArt || []).filter((a) => a && a.art).map((a) => H.asciiCard(a, ui)).join('');
  return out;
}

module.exports = { prerender, loadContext };

if (require.main === module) {
  const input = fs.readFileSync(0, 'utf8');
  process.stdout.write(JSON.stringify(prerender(JSON.parse(input))));
}
