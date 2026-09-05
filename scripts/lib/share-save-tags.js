'use strict';

/**
 * share-save-tags.js — the one definition of "which pages need the shared
 * Save/Share modules, and which tags satisfy that".
 *
 * Read by scripts/inject-share-save-tags.js (the writer) and
 * scripts/check-share-save-tags.js (the gate), so the injector and the check
 * can never disagree about what a correctly-tagged page looks like. Same
 * reason scripts/lib/faq-schema-audit.js and scripts/lib/content-fingerprint.js
 * are shared by their own audit/fix/check trios.
 *
 * Background (2026-09-05). Copy is a site-wide capability: 37 JS modules in
 * this repo write to the clipboard. Save and Share were not — both lived
 * inside script.js, which 540 of 4,639 pages load. Splitting them out into
 * /js/share/share-core.js and /js/saved/saved-items.js is what lets the other
 * surfaces have them, and it means a page that used to get share "for free"
 * by loading script.js now has to load the module too. This file encodes both
 * halves of that obligation.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

/** The two shared modules every copy-hosting page must load. */
const SHARE_CORE = '/js/share/share-core.js';
const SAVED_ITEMS = '/js/saved/saved-items.js';

/** A page "hosts copy" if it loads one of the runtimes that renders the copy
 *  targets Save/Share were attached to. */
const HOST_SCRIPTS = {
  /** The generator: builds result cards carrying Copy + Save + Share. */
  generator: '/script.js',
  /** Library and symbol pages: static tiles, enhanced at runtime. */
  explorer: '/symbol-explorer.js'
};

/**
 * What a given page is missing.
 *
 * Deliberately NOT in this list: i18n.js. The first draft added it to every
 * explorer page so the injected buttons could read window.UTG_I18N, on the
 * assumption that generator pages already loaded it. They do not — 76 of 540
 * do. And on the explorer side it would have meant a ~30KB locale-JSON fetch
 * on 3,586 pages, the site's highest-traffic lane, to read five short strings.
 * symbol-explorer.js reads them from its own 28-locale table instead, which
 * scripts/sync-explorer-strings.js keeps in agreement with locales/*.json.
 */
function requiredTags(html) {
  const hasGenerator = html.includes(`src="${HOST_SCRIPTS.generator}"`);
  const hasExplorer = html.includes(`src="${HOST_SCRIPTS.explorer}"`);
  if (!hasGenerator && !hasExplorer) return [];
  return [SHARE_CORE, SAVED_ITEMS].filter((src) => !html.includes(`src="${src}"`));
}

function hasTag(html, src) {
  return html.includes(`src="${src}"`);
}

function tagFor(src) {
  return `<script src="${src}" defer></script>`;
}

/** Pages excluded from the site's own tag passes, mirrored here so this
 *  script's scope matches check-gtm.js / check-ads.js / the funding-choices
 *  injector rather than inventing a third definition. */
const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  for (const seg of rel.split('/')) {
    const lower = seg.toLowerCase();
    if (SKIP_SEGMENTS.includes(lower)) return true;
    if (SKIP_DIRS.includes(lower)) return true;
    if (/\.(test|demo|widget|embed)\b/i.test(seg)) return true;
  }
  return false;
}

/** Both modules must exist on disk, or every page we tag 404s its own JS. */
function modulesExist() {
  return [SHARE_CORE, SAVED_ITEMS].every((p) => fs.existsSync(path.join(ROOT, p.slice(1))));
}

module.exports = {
  ROOT, SHARE_CORE, SAVED_ITEMS, HOST_SCRIPTS,
  requiredTags, hasTag, tagFor, shouldSkip, modulesExist
};
