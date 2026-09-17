'use strict';
/**
 * printable-tool-registry.js — what typed-word printable surface a page offers.
 *
 * WHY THIS EXISTS
 * ---------------
 * printablesEngine.js mounts a surface whenever the page happens to carry the
 * right element id, and every surface is configured from the same
 * `window.UTG_PRINTABLE` block. That makes it a one-line change to give page B
 * a tool page A already has, which is exactly how it went wrong:
 *
 *   2026-09-13, 458b62584 — "the coloring hub gains the name/word sheet ...
 *   that block-letters (21% of site revenue) has and it did not"
 *
 * /printables/alphabet-coloring-pages/ gained a type-a-name coloring tool while
 * /printables/coloring-page-maker/ already owned that job by its own title
 * ("Coloring Page Maker: Print a Name Coloring Page Free"). Two of our own URLs
 * targeting one query, which is the Hub-vs-Spoke Rule 3 cannibalisation
 * CLAUDE.md documents, arriving through a mechanism no check was watching.
 *
 * Nothing compared "which pages mount the same tool" — the parity gate reads
 * links and section counts, the locale gate reads strings, the image gates read
 * assets, the accessibility gate reads markup that rendered. A duplicated tool
 * moves none of those.
 *
 * WHAT COUNTS AS THE SAME TOOL — derived from the corpus, not guessed
 * -------------------------------------------------------------------
 * A page's typed-word surface is identified by (locale, noun, render, font):
 *
 *   noun    — what the sheet IS, in the page's own words, which the engine
 *             already puts in aria-labels and PNG filenames ("coloring page",
 *             "dot-to-dot", "puzzle piece"). It is localized per page
 *             ("Ausmalbild", "kolorowanka"), so grouping by locale + noun works
 *             across languages with nothing translated here.
 *   render  — outline | glyph | dots
 *   font    — the CSS stack, which is what the reader actually sees
 *
 * Measured against the tree as it stood before the repair, this signature
 * reports 5 collisions and ZERO false positives. In particular it does NOT
 * conflate the three pages that all render a typed word in Baloo 2 outline —
 * coloring-page-maker, dot-to-dot-name and name-puzzle-maker — because their
 * nouns differ, which is correct: same typeface, three different products.
 *
 * Coarser signatures were tried against the same corpus and rejected:
 *   - mount id alone   misses the real defect entirely, because the pair mounts
 *                      `name` on one page and `design` on the other
 *   - (render, font)   flags the Baloo 2 trio above: 3 false positives
 *
 * Shared by audit-printable-tool-duplication.js and
 * check-printable-tool-duplication.js so the dashboard and the gate can never
 * disagree about what a duplicated tool is.
 */

/**
 * Element ids that mount a surface taking the visitor's OWN typed word.
 * The A-Z character picker (#pt-strip) is deliberately absent: every alphabet
 * page has one, they are not competing for one query, and including it would
 * flag 54 pages that are working as intended.
 */
const WORD_SURFACES = {
  name: 'pt-name-input',
  design: 'pt-design-input',
  banner: 'pt-banner-input',
  puzzle: 'pt-puzzle-input',
  gen: 'pt-gen-input',
};

const CONFIG_RE = /window\.UTG_PRINTABLE\s*=\s*\{([\s\S]*?)\n\s*\};/;

const SEP = String.fromCharCode(0);

function configField(cfgBody, key) {
  const m = cfgBody.match(new RegExp(`\\b${key}:\\s*"([^"]*)"`));
  return m ? m[1] : '';
}

/** `de/zum-ausdrucken/x/index.html` -> `de`; EN pages -> `en`. */
function localeOf(rel) {
  const m = String(rel).match(/^([a-z]{2}(?:-[a-z]{2})?)\//);
  return m ? m[1] : 'en';
}

/** `printables/x/index.html` -> `printables/x` (what a report should print). */
function routeOf(rel) {
  return String(rel).replace(/\/index\.html$/, '').replace(/^\.\//, '');
}

/**
 * Read one page. Returns null when the page offers no typed-word surface —
 * which is most of the site, so callers can pass every HTML file in.
 */
function readPage(rel, html) {
  const mounts = Object.keys(WORD_SURFACES)
    .filter((k) => html.includes(`id="${WORD_SURFACES[k]}"`))
    .sort();
  if (!mounts.length) return null;

  const m = html.match(CONFIG_RE);
  const body = m ? m[1] : '';
  return {
    file: rel,
    route: routeOf(rel),
    locale: localeOf(rel),
    mounts,
    key: configField(body, 'key'),
    noun: configField(body, 'noun'),
    render: configField(body, 'render'),
    font: configField(body, 'font'),
  };
}

/** The identity two pages must share to be offering the same tool. */
function signature(page) {
  return [page.locale, page.noun, page.render, page.font].join(SEP);
}

function describeSignature(page) {
  return `locale=${page.locale} noun=${JSON.stringify(page.noun)} `
    + `render=${JSON.stringify(page.render)} font=${JSON.stringify(page.font)}`;
}

/**
 * Group pages by signature and return only the groups holding more than one
 * page. Each group is { signature, label, pages }, sorted for stable output.
 */
function collisions(pages) {
  const by = new Map();
  for (const p of pages) {
    const s = signature(p);
    if (!by.has(s)) by.set(s, { signature: s, label: describeSignature(p), pages: [] });
    by.get(s).pages.push(p);
  }
  return [...by.values()]
    .filter((g) => g.pages.length > 1)
    .map((g) => ({ ...g, pages: g.pages.slice().sort((a, b) => a.route.localeCompare(b.route)) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Unordered pair key, so a collision is the same fact whichever side moved. */
function pairKey(a, b) {
  return [a, b].sort().join(' <-> ');
}

/** Every unordered pair inside every collision group, keyed by `pairKey`. */
function collisionPairs(pages) {
  const out = new Map();
  for (const g of collisions(pages)) {
    for (let i = 0; i < g.pages.length; i += 1) {
      for (let j = i + 1; j < g.pages.length; j += 1) {
        out.set(pairKey(g.pages[i].route, g.pages[j].route), {
          a: g.pages[i], b: g.pages[j], label: g.label,
        });
      }
    }
  }
  return out;
}

module.exports = {
  WORD_SURFACES,
  readPage,
  signature,
  describeSignature,
  collisions,
  collisionPairs,
  pairKey,
  localeOf,
  routeOf,
};
