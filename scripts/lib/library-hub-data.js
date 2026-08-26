'use strict';

/**
 * library-hub-data.js — harvest a locale's library-hub inventory from the site.
 *
 * Every field is read from a page that already exists, never invented and never
 * translated here. That is the same discipline `sync_symbol_spoke_links.py` uses
 * when it mirrors the peer graph into a locale ("card copy is read from the
 * target locale page's own `<h1>` and hero tagline"), and it is what keeps
 * `check-locale-translation` green: a hub built this way cannot contain a word
 * of English that was not already on the locale's own pages.
 *
 *   title        the locale page's own <h1>
 *   description  its own meta description, or its card blurb on the hub
 *   preview      its own leading copy tiles (data-symbol / data-text / …)
 *   type         inherited from its English sibling's classification
 *   useCases     inherited likewise, then mapped through the locale's own
 *                label vocabulary — never machine-translated at build time
 *   platforms    inherited, then mapped through the locale's own vocabulary for
 *                the entries that are ordinary words. Eight of the nine values
 *                are brand names (Discord, Instagram, …) and pass through;
 *                "Email" is not, and shipping it verbatim put English on ten
 *                locale hubs until check:locale-translation caught it.
 *
 * The English classification is authoritative because a locale page *is* a
 * translation of an English page (the English-Parent Rule), so its facets are
 * the same facets. The link between them is the page's own `hreflang="en"`,
 * the same join `scripts/lib/translation-clusters.js` uses.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** Text of the first match of a capturing regex, HTML-decoded, or ''. */
function cap(html, re) {
  const m = re.exec(html);
  return m ? decode(m[1]).trim() : '';
}

function decode(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** The English slug a locale page declares as its parent, or null. */
function englishParentSlug(html) {
  const m = /<link[^>]+hreflang="en"[^>]+href="https:\/\/ultratextgen\.com\/library\/([^"/]+)\/"/.exec(html)
    || /<link[^>]+href="https:\/\/ultratextgen\.com\/library\/([^"/]+)\/"[^>]+hreflang="en"/.exec(html);
  return m ? m[1] : null;
}

/**
 * The English hub's own classification, keyed by slug.
 *
 * Read from `library/index.html`'s rendered entries rather than a source array:
 * that hub is pre-rendered, so the rendered markup *is* where its data lives.
 */
function englishClassification() {
  const html = fs.readFileSync(path.join(ROOT, 'library', 'index.html'), 'utf8');
  const out = new Map();
  const entryRe = /<article class="lib-entry">([\s\S]*?)<\/article>/g;
  let m;
  while ((m = entryRe.exec(html)) !== null) {
    const entry = m[1];
    const slug = cap(entry, /href="\/library\/([^"/]+)\//);
    if (!slug) continue;
    const facets = { type: '', useCases: [], platforms: [] };
    const tagRe = /data-filter="([^"]+)" data-value="([^"]+)"/g;
    let t;
    while ((t = tagRe.exec(entry)) !== null) {
      const [, key, val] = t;
      if (key === 'type') facets.type = val;
      else if (key === 'useCases') facets.useCases.push(val);
      else if (key === 'platforms') facets.platforms.push(val);
    }
    out.set(slug, facets);
  }
  return out;
}

/** Leading copy tiles on a page, as one short preview string. */
function previewFor(html) {
  const tiles = [];
  const re = /data-(?:symbol|text|copy|char)="([^"]{1,24})"/g;
  let m;
  while ((m = re.exec(html)) !== null && tiles.length < 5) {
    const v = decode(m[1]).trim();
    if (v && tiles.indexOf(v) === -1) tiles.push(v);
  }
  return tiles.join(' ');
}

/**
 * Card blurbs already on the hub, keyed by slug.
 *
 * The plain hubs present their links as `compare-card` grids whose `<h4>` and
 * `<p>` are already written in the locale's language — better copy than a meta
 * description, because a human wrote it for this hub. Preferred when present.
 */
function hubCardCopy(hubHtml, locale) {
  const out = new Map();
  const re = new RegExp(
    '<a[^>]+href="\\/' + locale + '\\/library\\/([^"/]+)\\/"[^>]*>([\\s\\S]*?)<\\/a>', 'g'
  );
  let m;
  while ((m = re.exec(hubHtml)) !== null) {
    const [, slug, inner] = m;
    const title = cap(inner, /<h4[^>]*>([\s\S]*?)<\/h4>/);
    const desc = cap(inner, /<p[^>]*>([\s\S]*?)<\/p>/);
    if (title) out.set(slug, { title, description: desc });
  }
  return out;
}

/**
 * Build one locale's hub inventory.
 *
 * @param {string} locale
 * @param {object} labels  { types: {en→local}, useCases: {en→local} }
 * @returns {{items: object[], missingLabels: Set<string>, noParent: string[]}}
 */
function buildInventory(locale, labels) {
  const dir = path.join(ROOT, locale, 'library');
  const hubPath = path.join(dir, 'index.html');
  const hubHtml = fs.existsSync(hubPath) ? fs.readFileSync(hubPath, 'utf8') : '';
  const cards = hubCardCopy(hubHtml, locale);
  const enClass = englishClassification();

  const items = [];
  const missingLabels = new Set();
  const noParent = [];

  const slugs = fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.html')))
    .map((d) => d.name)
    .sort();

  for (const slug of slugs) {
    const html = fs.readFileSync(path.join(dir, slug, 'index.html'), 'utf8');
    const card = cards.get(slug);

    const title = (card && card.title)
      || cap(html, /<h1[^>]*>([\s\S]*?)<\/h1>/)
      || slug;

    const description = (card && card.description)
      || cap(html, /<meta name="description" content="([^"]*)"/)
      || '';

    const parent = englishParentSlug(html);
    const facets = parent ? enClass.get(parent) : null;
    if (!facets) noParent.push(slug);

    const localType = facets && facets.type
      ? (labels.types[facets.type] || (missingLabels.add('type:' + facets.type), null))
      : null;

    const localUseCases = facets
      ? facets.useCases
          .map((u) => labels.useCases[u] || (missingLabels.add('useCase:' + u), null))
          .filter(Boolean)
      : [];

    items.push({
      title,
      slug,
      description: description.slice(0, 220),
      preview: previewFor(html),
      type: localType || undefined,
      useCases: localUseCases.length ? localUseCases : undefined,
      platforms: facets && facets.platforms.length
        ? facets.platforms.slice(0, 2).map(function (pl) {
            // Brand names have no entry and are meant to pass through.
            return (labels.platforms && labels.platforms[pl]) || pl;
          })
        : undefined,
    });
  }

  return { items, missingLabels, noParent };
}

module.exports = {
  buildInventory,
  englishClassification,
  hubCardCopy,
  previewFor,
  englishParentSlug,
};
