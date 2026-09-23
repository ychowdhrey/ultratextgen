'use strict';

/**
 * llms-index.js — the whole model behind the site's `llms.txt` hierarchy.
 *
 * WHAT THIS IS
 * ------------
 * `llms.txt` (llmstxt.org) is a markdown index an agent reads to learn what a
 * site holds and where to look next. The spec is short and this file follows it
 * literally:
 *
 *   - an H1 (the only required element), then a blockquote summary, then
 *     "zero or more markdown sections … of any type except headings", then
 *     "zero or more markdown sections delimited by H2 headers", each an
 *     ordinary markdown list of `[name](url)` with an optional `: notes`;
 *   - the file lives at `/llms.txt` OR "at any subpath (e.g. /docs/llms.txt).
 *     A file covers the URLs under its path."
 *
 * That last sentence is the single most load-bearing fact for this site, and it
 * is why the shape here is not the obvious one. A section index may only be
 * published at a REAL directory that actually contains the pages it lists.
 * `/es/symbols/llms.txt` would be a lie — the Spanish symbol pages are under
 * `/es/symbol/` — and `/es/printables/llms.txt` would be a bigger one, because
 * Spanish printables live under `/es/imprimibles/`. So:
 *
 *   /llms.txt                     site index AND the English index (English is
 *                                 served from the root, so `/` IS its path)
 *   /<locale>/llms.txt            one per locale
 *   /<dir>/llms.txt               a section, at the directory that holds it
 *   /<locale>/<dir>/llms.txt      ditto, with that locale's own directory slug
 *
 * There is deliberately no `/en/llms.txt` page: nothing is served under `/en/`,
 * so a file there would claim a path that does not exist. `_redirects` 301s it
 * to `/llms.txt` so an agent that guesses the symmetric URL still lands right.
 * Full reasoning, spec notes and the sitemap comparison: docs/llms-txt.md.
 *
 * WHAT IT IS NOT
 * --------------
 * Not a second sitemap. `sitemap.xml` answers "which canonical URLs exist, and
 * when did each last change"; it is generated from the same filesystem scan and
 * stays the complete list. This hierarchy answers "what is here, how is it
 * grouped, and which page does a given job" — it adds semantics, and it links
 * narrower indexes rather than repeating 4,692 leaf URLs at the root.
 *
 * NOTHING HERE IS AUTHORED
 * ------------------------
 * Every title and description is read off the page it describes, in that page's
 * own language, exactly as `sync_symbol_spoke_links.py` reads card copy ("card
 * copy is read from the target locale page's own <h1> and hero tagline") and as
 * `library-hub-data.js` builds a locale hub ("every field is read from a page
 * that already exists, never invented and never translated here"). Measured
 * over all 4,692 indexable pages: 4,605 carry a `.hero-tagline`, the remaining
 * 87 a `<meta name="description">`, and 0 have neither — so no page needs an
 * invented one, and `validate()` fails rather than inventing if that ever
 * changes.
 *
 * Section HEADINGS are English on every locale file, on purpose. They are
 * machine-facing scaffolding — an agent comparing `/de/llms.txt` with
 * `/ko/llms.txt` should see the same section names — and translating them here
 * would be exactly the invention the rule above forbids. Where the SITE itself
 * already states a localized label for a section (its BreadcrumbList level-2
 * name, or its library hub's own facet vocabulary in
 * data/library_hub_i18n.json) that label is appended in parentheses, so the
 * localization is the site's own or absent.
 *
 * Language NAMES are likewise not printed. `Intl.DisplayNames` would supply
 * them, but its output tracks the host's ICU version, and this file has to
 * regenerate byte-identically in CI (see `--check`). BCP-47 codes are the
 * machine-readable identifier anyway, and each locale link carries that
 * locale's own homepage description, which is written in the language.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { LOCALES } = require('./locale-parent-registry');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE_URL = 'https://ultratextgen.com';
const FILE_NAME = 'llms.txt';

/** Directories the site's own sitemap scan skips; kept identical on purpose. */
const EXCLUDED_FOLDERS = new Set([
  'assets', 'css', 'js', 'images', 'img',
  'fonts', 'data', 'scripts', 'node_modules',
  'dist', 'build', '.git',
]);

/**
 * A section index is published only when its directory holds at least this
 * many pages. Below it the pages are listed inline in the locale index, which
 * already covers them. Two failures this avoids: a 2-entry section file (the
 * "excessive fragmentation" the brief warns about), and a locale index whose
 * only content is links to files with nothing in them.
 */
const SECTION_MIN_PAGES = 10;

/** Same cap `sync_symbol_spoke_links.py` uses for card copy, for the same reason. */
const MAX_DESC_LEN = 140;

const LOCALE_SET = new Set(LOCALES);

// ─── Sections ────────────────────────────────────────────────────────────────
//
// `id` is stable and machine-facing. `dirs` lists the English directory names
// that map to this section; a locale page inherits its section from the English
// parent it declares in its own `hreflang="en"` (the same join
// scripts/lib/translation-clusters.js uses), which is how the localized
// printables directories — imprimibles, zum-ausdrucken, do-druku, da-stampare,
// imprimiveis, om-uit-te-printen, imprimables — classify without being listed
// here. Nothing about a locale's directory naming is hardcoded.

const SECTIONS = [
  { id: 'home',        title: 'Main generator',        dirs: [] },
  { id: 'fonts',       title: 'Font styles',           dirs: ['category'] },
  { id: 'use-cases',   title: 'Use-case generators',   dirs: ['usecase'] },
  { id: 'tools',       title: 'Text tools',            dirs: [] },
  { id: 'platforms',   title: 'Platform pages',        dirs: [] },
  { id: 'library',     title: 'Symbol & emoji library', dirs: ['library'] },
  { id: 'symbols',     title: 'Individual symbols',    dirs: ['symbol'] },
  { id: 'printables',  title: 'Printables',            dirs: ['printables'] },
  { id: 'events',      title: 'Seasonal & event text', dirs: ['events'] },
  { id: 'guides',      title: 'Guides',                dirs: ['guide'] },
  { id: 'learn',       title: 'Learn: handwriting & lettering', dirs: ['learn'] },
  { id: 'answers',     title: 'Answers',               dirs: ['answers'] },
  { id: 'updates',     title: 'Updates',               dirs: ['updates'] },
  { id: 'embed',       title: 'Embeddable widgets',    dirs: ['embed'] },
  { id: 'local-only',  title: 'Language-specific pages', dirs: [] },
  { id: 'about',       title: 'Optional',              dirs: [] },
];

const SECTION_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
const SECTION_ORDER = SECTIONS.map((s) => s.id);

const DIR_SECTION = new Map();
for (const s of SECTIONS) for (const d of s.dirs) DIR_SECTION.set(d, s.id);

/**
 * English pages that sit directly at the site root and therefore have no
 * directory to classify them by.
 *
 * This is the ONE hand-maintained table in this file, and it is 27 lines
 * against 4,692 pages. It exists because the site has no machine-readable
 * statement of which root page is a platform hub and which is a standalone
 * tool: every one of them ships the same JSON-LD `@type` set, the same
 * breadcrumb shape (`Home > <its own title>`), and `styles.js`'s `platforms`
 * vocabulary names six platforms against thirteen platform pages. The closest
 * thing is the kicker in `scripts/generate-site-art.py`'s PAGES literal, which
 * agrees with this table on 36 of the 38 root pages — it files
 * kaomoji-generator and kaomoji-dictionary under the generic site kicker — but
 * it is a 3,500-line Python literal with multi-line entries, so reading it from
 * Node would be fragile AND still incomplete.
 *
 * `collectPages()` THROWS on an English root page that is missing here rather
 * than defaulting, so a new one cannot be silently misfiled; that is the "new
 * generator family added but not represented" drift case. Locale root pages
 * need no entry: they inherit from the English parent they declare.
 */
const ROOT_PAGE_SECTION = new Map(Object.entries({
  // Platform hubs.
  discord: 'platforms',
  facebook: 'platforms',
  instagram: 'platforms',
  linkedin: 'platforms',
  pinterest: 'platforms',
  roblox: 'platforms',
  snapchat: 'platforms',
  telegram: 'platforms',
  threads: 'platforms',
  tiktok: 'platforms',
  whatsapp: 'platforms',
  x: 'platforms',
  youtube: 'platforms',
  // Standalone tools and reference charts.
  'ascii-art-generator': 'tools',
  'ascii-converter': 'tools',
  calligraphy: 'tools',
  'character-counter': 'tools',
  'curved-text': 'tools',
  'fancy-letters': 'tools',
  'hiragana-chart': 'tools',
  'kaomoji-dictionary': 'tools',
  'kaomoji-generator': 'tools',
  'katakana-chart': 'tools',
  // Legal / company. The set is `check-image-assets.py`'s own `legal/info`
  // rule, reused rather than restated.
  about: 'about',
  contact: 'about',
  privacy: 'about',
  terms: 'about',
}));

/**
 * Sub-groups inside a section, where the repository already owns the taxonomy.
 * Nothing here is a category invented to make a file look organised:
 *
 *   library     `data-filter="type"` on `library/index.html`'s own rendered
 *               entries — the hub's live filter vocabulary, read by
 *               library-hub-data.js's englishClassification(). 338/338 EN pages
 *               carry one. Localized per locale in data/library_hub_i18n.json.
 *   printables  `data-pt-job` on `printables/index.html`'s own cards, the
 *               attribute that places each card in one of the hub's six job sections. 31/31 families carry one.
 *
 * The job values are the hub's; only the human-readable English label is added
 * here, because the attribute ships no visible label anywhere on the site.
 */
const PRINTABLE_JOB_TITLES = new Map(Object.entries({
  quick: 'Quick print: ready-made sheets',
  name: 'Personalize a name',
  words: 'Create with your own words',
  practice: 'Handwriting & letter practice',
  puzzle: 'Word puzzles',
  craft: 'Craft & display lettering',
}));

// ─── Small helpers ───────────────────────────────────────────────────────────

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Collapse whitespace and strip any markup that survived a text() call. */
function tidy(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

/**
 * One sentence, capped. Lifted in behaviour from
 * scripts/sync_symbol_spoke_links.py's first_sentence() so a description here
 * and the same page's compare-card read the same.
 */
/**
 * Where a sentence ends.
 *
 * A period after a digit is usually NOT a boundary here. German, Czech,
 * Polish and Turkish write an ordinal date as `16. September 2026`, and
 * splitting there produced real output: "Unicode 18.0 erscheint am 16." on
 * `de/updates/unicode-18-beta-startet`, "Beim UTC-Meeting #188 am 30." on its
 * sibling. The same guard protects a codepoint label (`U+1F4A2.`).
 *
 * The one exception is a four-digit number at a word boundary — a year, which
 * is how a sentence about a release date legitimately ends. Without it,
 * "…standarden den 16 september 2026. Din telefon…" reads as one sentence and
 * the cap truncates it; with it, both halves are right.
 */
const SENTENCE_END = /(?:(?<=\b[0-9]{4})|(?<![0-9]))[.!?](\s|$)/;

function firstSentence(text, maxLen = MAX_DESC_LEN) {
  const t = tidy(text);
  const m = SENTENCE_END.exec(t);
  let sentence = m ? t.slice(0, m.index + 1).trim() : t;
  if (sentence.length > maxLen) {
    const head = sentence.slice(0, maxLen);
    // EITHER dash, because thirteen locales write the clause break as a spaced
    // EN dash — it is their native Gedankenstrich / lineetta / tankestrek, not
    // a different mark. Matching only the em dash made this cut blind on
    // exactly those languages: 21 llms.txt descriptions fell through to the
    // word-boundary cut and changed from a complete clause ending in '.' to a
    // truncated fragment ending in '…'.
    const clause = Math.max(head.lastIndexOf(' — '), head.lastIndexOf(' – '));
    // The Python original cuts at the last em dash inside the cap so the text
    // still reads as a complete thought. That inverts when the FIRST clause is
    // a label: every `symbol/` page opens its tagline "💢 U+1F4A2 — the
    // four-pointed cross that…", so the cut kept "💢 U+1F4A2." and threw the
    // description away. It is live on the site — `library/emoji-combos`
    // renders exactly that as a compare-card blurb — and it collapsed 41
    // descriptions here onto 104 pages, 13 of them onto one string. So the
    // clause cut has to leave something worth reading; otherwise take the word
    // boundary, which keeps the informative half.
    const MIN_CLAUSE = Math.floor(maxLen / 2);
    sentence = clause >= MIN_CLAUSE
      ? head.slice(0, clause).replace(/[,;:\s]+$/, '') + '.'
      : head.slice(0, head.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
  }
  return sentence;
}

/** Sentences, using the same boundary as firstSentence() rather than a copy. */
function splitSentences(text) {
  const t = tidy(text);
  const out = [];
  let start = 0;
  const re = new RegExp(SENTENCE_END.source, 'g');
  let m;
  while ((m = re.exec(t)) !== null) {
    out.push(t.slice(start, m.index + 1).trim());
    start = re.lastIndex;
  }
  const rest = t.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

function words(s) {
  return tidy(s).toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Is this sentence just the page's title restated?
 *
 * The brief rules out "Bubble Letter Generator: Bubble Letter Generator page",
 * and the site produces a softer version of it: a tool page with no hero
 * tagline opens its meta description with its own name — "Free ASCII art
 * generator. Type a word or name and watch it turn into…". Taking the first
 * sentence there publishes the title twice and throws the description away,
 * which is how `category/old-english-fonts` ended up described as "Old English
 * font generator."
 *
 * Short, and adding at most one word the title does not already carry. Both
 * halves are needed: length alone would discard a real one-clause description,
 * and overlap alone would discard a long sentence that happens to repeat the
 * subject — which every good description does.
 */
function echoesTitle(sentence, title) {
  const sw = words(sentence);
  if (!sw.length || sw.length > 8) return false;
  const tw = new Set(words(title));
  if (!tw.size) return false;
  return sw.filter((w) => !tw.has(w)).length <= 1;
}

/** The one line printed under a link: the page's own words, minus its own name. */
function descriptionFor(title, source) {
  const sentences = splitSentences(source);
  let i = 0;
  while (i < sentences.length && echoesTitle(sentences[i], title)) i += 1;
  const remainder = sentences.slice(i).join(' ');
  return firstSentence(remainder || source);
}

/**
 * Markdown-escape link text. A title carrying `[`, `]` or a backslash would
 * otherwise break the `[name](url)` the spec requires; `symbol/` titles carry
 * bracket characters routinely (e.g. "Square Brackets [ ]").
 */
function escapeLinkText(s) {
  return String(s).replace(/([\\[\]])/g, '\\$1');
}

/** A description sits after `: ` on one line, so newlines are already gone. */
function escapeNote(s) {
  return tidy(s);
}

/** Byte-count of the emitted file, which is what a fetch actually costs. */
function byteLength(s) {
  return Buffer.byteLength(s, 'utf8');
}

/**
 * Codepoint-order sort. Deliberately NOT localeCompare: its result depends on
 * the host's ICU data, and `--check` has to reproduce CI byte for byte.
 */
function byUrl(a, b) {
  return a.url < b.url ? -1 : a.url > b.url ? 1 : 0;
}

// ─── Page collection ─────────────────────────────────────────────────────────

function findIndexFiles(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_FOLDERS.has(entry.name)) continue;
      out.push(...findIndexFiles(path.join(dir, entry.name), next));
    } else if (entry.name === 'index.html') {
      out.push(next);
    }
  }
  return out;
}

function fileToUrl(file) {
  if (file === 'index.html') return `${BASE_URL}/`;
  return `${BASE_URL}/${file.replace(/index\.html$/, '')}`;
}

/**
 * Read one page. Everything published about a page comes from here, so the
 * order of the description fallback is the whole editorial policy:
 *
 *   1. `.hero-tagline` — a one-line summary a human wrote for this page, which
 *      is why library-hub-data.js and sync_symbol_spoke_links.py both prefer it
 *      over the meta description ("SEO-length, truncates poorly").
 *   2. `<meta name="description">`.
 *   3. `<meta property="og:description">`.
 *
 * The title is the page's own `<h1>`, never its `<title>` — a `<title>` on this
 * site carries the brand suffix and keyword tail, which is exactly the "Bubble
 * Letter Generator page" non-description the brief rules out.
 */
function readPage(file) {
  const html = readFile(file);
  const $ = cheerio.load(html);

  const robots = tidy($('meta[name="robots"]').attr('content'));
  const noindex = /\bnoindex\b/i.test(robots);

  let enParent = '';
  $('link[rel="alternate"]').each((_, el) => {
    if (tidy($(el).attr('hreflang')).toLowerCase() === 'en') {
      enParent = tidy($(el).attr('href'));
    }
  });

  const tagline = tidy($('p.hero-tagline').first().text());
  const metaDesc = tidy($('meta[name="description"]').attr('content'));
  const ogDesc = tidy($('meta[property="og:description"]').attr('content'));
  const descriptionSource = tagline ? 'hero-tagline'
    : metaDesc ? 'meta-description'
      : ogDesc ? 'og-description' : '';

  const segments = file.replace(/\/?index\.html$/, '').split('/').filter(Boolean);
  const locale = LOCALE_SET.has(segments[0]) ? segments[0] : 'en';
  const localePath = locale === 'en' ? segments : segments.slice(1);

  return {
    file,
    url: fileToUrl(file),
    locale,
    // The directory this page's URL lives under within its locale, '' only for
    // the locale homepage. A lane hub (`/library/`) is IN its own directory —
    // that is what lets a section index sit at a path that really covers it.
    dir: localePath[0] || '',
    isHome: localePath.length === 0,
    depth: localePath.length,
    noindex,
    canonical: tidy($('link[rel="canonical"]').attr('href')),
    title: tidy($('h1').first().text()),
    // Two descriptions, because the two slots want different things. A list
    // item gets ONE line, so it takes the first sentence of the page's own
    // hero tagline (card-copy precedent). A blockquote summarises a whole
    // directory, which is what a meta description is written to do: measured
    // over the ten English section hubs, the tagline's first sentence is a
    // rhetorical opener on four of them ("Typography is not decoration.",
    // "Looking for one specific symbol?") while the meta description reads as
    // a summary on all ten.
    description: descriptionFor(tidy($('h1').first().text()), tagline || metaDesc || ogDesc),
    summary: tidy(metaDesc || tagline || ogDesc).slice(0, 300),
    descriptionSource,
    enParent,
    breadcrumb: breadcrumbTrail($),
  };
}

/**
 * The page's own BreadcrumbList names, which is where the site states — in the
 * page's own language — which section it belongs to ("Home > Library",
 * "Startseite > Bibliothek"). Used only for the localized label in parentheses,
 * never for classification: 22 pages (every homepage) ship no BreadcrumbList,
 * and inside a lane some pages put their own title at level 2 instead of the
 * section name, so it is a labelling hint and not a taxonomy.
 */
function breadcrumbTrail($) {
  let trail = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let parsed;
    try {
      parsed = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
    for (const node of nodes) {
      if (node && node['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
        trail = node.itemListElement
          .map((e) => tidy(e && (e.name || (e.item && e.item.name))))
          .filter(Boolean);
      }
    }
  });
  return trail;
}

// ─── Classification ──────────────────────────────────────────────────────────

/**
 * Which section a page belongs to.
 *
 * Three rules, in order, and every page on the site is answered by one of them:
 *
 *   1. it sits in a directory this file maps            (4,243 pages)
 *   2. it is a locale root page — inherit the section of the English parent it
 *      declares, resolved recursively                     (423 pages)
 *   3. it is an English root page                          (26 pages, table)
 *
 * A locale root page with no English parent is `local-only`: 22 pages, and all
 * of them are the ratified no-English-parent pages CLAUDE.md's "Localization
 * Workflow" section records (ja/gal-moji, id/tulisan-cuping, the fr and it
 * clusters, …), 17 of which are ledgered in
 * data/english_parent_exceptions.json. That is a fact about the hreflang graph,
 * not a guess about the page.
 */
function classify(pages) {
  const byUrlIndex = new Map(pages.map((p) => [p.url, p]));
  const unclassified = [];

  const resolve = (page, seen) => {
    if (page.isHome) return 'home';
    if (page.dir) {
      const viaDir = DIR_SECTION.get(page.dir);
      if (viaDir) return viaDir;
    }
    if (page.locale !== 'en') {
      if (!page.enParent) return 'local-only';
      const parent = byUrlIndex.get(page.enParent);
      if (!parent || seen.has(parent.url)) return 'local-only';
      seen.add(parent.url);
      return resolve(parent, seen);
    }
    // English, at the root or one level under a root page.
    const viaTable = ROOT_PAGE_SECTION.get(page.dir);
    if (viaTable) return viaTable;
    unclassified.push(page.file);
    return null;
  };

  for (const page of pages) page.section = resolve(page, new Set([page.url]));

  if (unclassified.length) {
    throw new Error(
      'llms-index: no section for '
      + `${unclassified.length} English root page(s): ${unclassified.join(', ')}.\n`
      + 'Add each to ROOT_PAGE_SECTION in scripts/lib/llms-index.js. This is a '
      + 'deliberate hard failure — a new root page must be classified, never '
      + 'silently defaulted into a section it does not belong to.'
    );
  }
  return pages;
}

/** Every indexable page, classified, sorted, ready to render. */
function collectPages() {
  const files = findIndexFiles(ROOT).sort();
  const all = files.map(readPage);
  const indexable = all.filter((p) => !p.noindex);
  classify(indexable);
  indexable.sort(byUrl);
  return { pages: indexable, skippedNoindex: all.filter((p) => p.noindex) };
}

// ─── Localized labels the site already states ────────────────────────────────

/**
 * The locale's own name for a section, taken by majority vote over the
 * BreadcrumbList level-2 names of the pages in it.
 *
 * A majority is required (60%) because the vote is genuinely split on some
 * lanes: German `usecase/` pages mostly breadcrumb their own title, so there is
 * no locale label to show and none is shown. Better an absent parenthetical
 * than a wrong one.
 */
const LABEL_MIN_PAGES = 3;

function localizedSectionLabel(pages) {
  const counts = new Map();
  let total = 0;
  for (const p of pages) {
    if (p.breadcrumb.length < 2) continue;
    const label = p.breadcrumb[1];
    counts.set(label, (counts.get(label) || 0) + 1);
    total += 1;
  }
  // Below three pages the "majority" is just one page's own title, which is
  // not a section label: German `Text tools` is a single page and was being
  // captioned "(Wörter & Zeichen zählen)", the counter's own breadcrumb.
  if (total < LABEL_MIN_PAGES) return '';
  let best = '';
  let bestN = 0;
  for (const [label, n] of counts) if (n > bestN) { best = label; bestN = n; }
  return bestN / total >= 0.6 ? best : '';
}

let libraryFacets = null;
/** slug → type, from `library/index.html`'s own rendered filter data. */
function libraryTypeBySlug() {
  if (libraryFacets) return libraryFacets;
  libraryFacets = new Map();
  const html = readFile('library/index.html');
  const entryRe = /<article class="lib-entry">([\s\S]*?)<\/article>/g;
  let m;
  while ((m = entryRe.exec(html)) !== null) {
    const slugMatch = /href="\/library\/([^"/]+)\//.exec(m[1]);
    const typeMatch = /data-filter="type" data-value="([^"]+)"/.exec(m[1]);
    if (slugMatch && typeMatch) libraryFacets.set(slugMatch[1], typeMatch[1]);
  }
  return libraryFacets;
}

let libraryI18n = null;
/** The locale's own word for a library type, where the site ships one. */
function libraryTypeLabel(locale, type) {
  if (!libraryI18n) {
    try {
      libraryI18n = JSON.parse(readFile('data/library_hub_i18n.json'));
    } catch {
      libraryI18n = {};
    }
  }
  const labels = libraryI18n[locale] && libraryI18n[locale].labels;
  const local = labels && labels.types && labels.types[type];
  return local && local !== type ? local : '';
}

let printableJobs = null;
/** English printables slug → `data-pt-job`, from the hub's own cards. */
function printableJobBySlug() {
  if (printableJobs) return printableJobs;
  printableJobs = new Map();
  const html = readFile('printables/index.html');
  const re = /href="\/printables\/([a-z0-9-]+)\/"[^>]*data-pt-job="([a-z]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) printableJobs.set(m[1], m[2]);
  return printableJobs;
}

/**
 * The English printables family a page belongs to — its own slug for a family
 * hub, its parent's for a per-letter sheet, and for a locale page the slug of
 * the English parent it declares.
 */
function printableFamily(page) {
  const source = page.locale === 'en' ? page.url : (page.enParent || page.url);
  const m = /\/printables\/([a-z0-9-]+)\//.exec(source);
  return m ? m[1] : '';
}

// ─── Tree ────────────────────────────────────────────────────────────────────

/**
 * Group pages into locale → section, and decide where each section is
 * published.
 *
 * A section index is published for each DIRECTORY inside that section holding
 * at least SECTION_MIN_PAGES pages — so the file always sits at a path that
 * really covers what it lists, as the spec requires. Pages of the same section
 * that live outside such a directory are listed inline in the locale index,
 * which covers them already.
 *
 * Per-directory rather than per-section, because the first draft required a
 * section's pages to share one directory and that measured badly: Spanish has
 * 254 pages in `es/library/` plus a handful of library-ish pages at the locale
 * root (`es/simbolos-de-corazon/`, whose English parent is
 * `library/heart-symbols/`). Those few blocked the 254 from getting an index at
 * all and pushed `es/llms.txt` to 305 links. The same shape hid the Japanese,
 * Thai, German, French and Korean library indexes.
 *
 * The directory test still keeps German honest where it should: `de`'s
 * font-style pages are `de/fette-schrift/`, `de/kursive-schrift/` and eleven
 * more sitting at the locale root. They inherit the `fonts` section from
 * `category/bold-fonts/` and friends, but no `de/category/` directory holds
 * them, so no `/de/category/llms.txt` is published and the thirteen are listed
 * in `/de/llms.txt`, where their URLs actually live.
 */
function buildTree(pages) {
  const locales = new Map();
  for (const page of pages) {
    if (!locales.has(page.locale)) {
      locales.set(page.locale, { code: page.locale, sections: new Map(), home: null, pages: [] });
    }
    const loc = locales.get(page.locale);
    loc.pages.push(page);
    if (page.isHome) { loc.home = page; continue; }
    if (!loc.sections.has(page.section)) loc.sections.set(page.section, []);
    loc.sections.get(page.section).push(page);
  }

  for (const loc of locales.values()) {
    loc.sectionList = SECTION_ORDER
      .filter((id) => loc.sections.has(id))
      .map((id) => {
        const list = loc.sections.get(id).slice().sort(byUrl);
        const prefix = loc.code === 'en' ? '' : `${loc.code}/`;

        const byDir = new Map();
        for (const page of list) {
          if (!page.dir) continue;
          if (!byDir.has(page.dir)) byDir.set(page.dir, []);
          byDir.get(page.dir).push(page);
        }

        const indexed = [...byDir.entries()]
          .filter(([, pages]) => pages.length >= SECTION_MIN_PAGES)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([dir, pages]) => ({
            dir,
            pages: pages.slice().sort(byUrl),
            indexPath: `${prefix}${dir}/${FILE_NAME}`,
            indexUrl: `${BASE_URL}/${prefix}${dir}/${FILE_NAME}`,
            // The directory's own index page, when it has one — its hero
            // tagline is the section's description, in the site's own words.
            hub: pages.find((p) => p.url.endsWith(`/${dir}/`)) || null,
          }));

        const claimed = new Set(indexed.flatMap((f) => f.pages.map((p) => p.url)));
        return {
          id,
          title: SECTION_BY_ID.get(id).title,
          label: localizedSectionLabel(list),
          pages: list,
          files: indexed,
          ownFile: indexed.length > 0,
          inlinePages: list.filter((p) => !claimed.has(p.url)),
        };
      });
  }
  return locales;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function linkLine(url, text, note) {
  const label = escapeLinkText(text);
  const tail = note ? `: ${escapeNote(note)}` : '';
  return `- [${label}](${url})${tail}`;
}

function pageLine(page) {
  return linkLine(page.url, page.title, page.description);
}

function sameLabel(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function heading(section) {
  return section.label && !sameLabel(section.label, section.title)
    ? `## ${section.title} (${section.label})`
    : `## ${section.title}`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * The blockquote for a directory index: that directory's own hub page tagline,
 * which the site already wrote in the right language. Only when a directory
 * has no hub page does a bare count stand in.
 */
function dirSummary(file) {
  return file.hub && file.hub.summary
    ? file.hub.summary
    : `${plural(file.pages.length, 'page')}.`;
}

/**
 * Group a page list for rendering. Only two sections have a taxonomy the
 * repository owns; every other section renders as one flat, URL-sorted list,
 * because a grouping nobody already maintains is a grouping that goes stale.
 */
function groupPages(sectionId, pages, locale) {
  if (sectionId === 'library') {
    const types = libraryTypeBySlug();
    const groups = new Map();
    for (const page of pages) {
      const source = page.locale === 'en' ? page.url : (page.enParent || '');
      const enSlug = (/\/library\/([^/]+)\//.exec(source) || [])[1];
      // The hub page itself is not a `lib-entry`, so it carries no type facet.
      // An empty key sorts first and renders under the section's own title,
      // which is what it is — the index of the collections, not a collection.
      const key = (enSlug && types.get(enSlug)) || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(page);
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([type, list]) => {
        const local = type ? libraryTypeLabel(locale, type) : '';
        return { title: local ? `${type} (${local})` : type, pages: list.sort(byUrl) };
      });
  }

  if (sectionId === 'printables') {
    const jobs = printableJobBySlug();
    const families = new Map();
    const letters = new Map();
    for (const page of pages) {
      const family = printableFamily(page);
      const isLetterSheet = page.depth >= 3;
      const bucket = isLetterSheet ? letters : families;
      const key = isLetterSheet ? family : (jobs.get(family) || 'reference');
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(page);
    }
    const out = [];
    for (const job of PRINTABLE_JOB_TITLES.keys()) {
      if (!families.has(job)) continue;
      out.push({ title: PRINTABLE_JOB_TITLES.get(job), pages: families.get(job).sort(byUrl) });
    }
    for (const [key, list] of [...families].filter(([k]) => !PRINTABLE_JOB_TITLES.has(k))) {
      out.push({ title: `More printables (${key})`, pages: list.sort(byUrl) });
    }
    // Per-letter sheets are 186 of the 212 English printables. They go last,
    // one H2 per family, so an agent reading top-down meets the generators
    // first and can stop before the alphabet.
    for (const key of [...letters.keys()].sort()) {
      const familyHub = pages.find((p) => p.depth === 2 && printableFamily(p) === key);
      const name = familyHub ? familyHub.title : key;
      out.push({ title: `${name}: letter by letter`, pages: letters.get(key).sort(byUrl) });
    }
    return out.filter((g) => g.pages.length);
  }

  return [{ title: '', pages: pages.slice().sort(byUrl) }];
}

/** One directory index, e.g. /es/imprimibles/llms.txt. */
function renderDirFile(section, file, loc) {
  const groups = groupPages(section.id, file.pages, loc.code);
  const localeSuffix = loc.code === 'en' ? '' : ` (${loc.code})`;
  const lines = [];
  lines.push(`# UltraTextGen — ${section.title}${localeSuffix}`);
  lines.push('');
  lines.push(`> ${dirSummary(file)}`);
  lines.push('');
  lines.push(
    `${plural(file.pages.length, 'page')} under ${BASE_URL}/`
    + `${loc.code === 'en' ? '' : `${loc.code}/`}${file.dir}/, in ${loc.code}. `
    + `Site index: ${BASE_URL}/${FILE_NAME}`
    + (loc.code === 'en' ? '.' : ` — ${loc.code} index: ${BASE_URL}/${loc.code}/${FILE_NAME}.`)
    + ` Complete canonical URL list: ${BASE_URL}/sitemap.xml`
  );
  lines.push('');
  for (const group of groups) {
    lines.push(`## ${group.title || section.title}`);
    lines.push('');
    for (const page of group.pages) lines.push(pageLine(page));
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

/** The "## Section indexes" list shared by the locale files and the root. */
function indexLinkLines(sectionList) {
  const lines = [];
  for (const section of sectionList) {
    for (const file of section.files) {
      const label = section.label && !sameLabel(section.label, section.title)
        ? `${section.title} (${section.label})`
        : section.title;
      lines.push(linkLine(
        file.indexUrl,
        section.files.length > 1 ? `${label} — /${file.dir}/` : label,
        `${dirSummary(file)} ${plural(file.pages.length, 'page')}.`
      ));
    }
  }
  return lines;
}

/** The inline `## Section` blocks — everything with no directory index. */
function inlineSectionLines(sectionList, locale, { skip = [] } = {}) {
  const lines = [];
  for (const section of sectionList) {
    if (skip.includes(section.id)) continue;
    if (!section.inlinePages.length) continue;
    // Flat, never sub-grouped. Sub-groups exist to make a 339-entry directory
    // index navigable; an inline block is small by construction (everything
    // large enough got its own file), and grouping it produced compound
    // headings like "Symbol & emoji library: Symbols (Symbole)" over one page.
    lines.push(heading(section));
    lines.push('');
    for (const page of section.inlinePages.slice().sort(byUrl)) lines.push(pageLine(page));
    lines.push('');
  }
  return lines;
}

function renderLocaleFile(loc) {
  const home = loc.home;
  const lines = [];
  lines.push(`# UltraTextGen — ${loc.code}`);
  lines.push('');
  lines.push(`> ${home ? home.summary : `UltraTextGen pages in ${loc.code}.`}`);
  lines.push('');
  lines.push(
    `${plural(loc.pages.length, 'page')} under ${BASE_URL}/${loc.code}/, `
    + `written in ${loc.code}. Site index: ${BASE_URL}/${FILE_NAME}. `
    + `Complete canonical URL list for the whole site: ${BASE_URL}/sitemap.xml`
  );
  lines.push('');

  if (home) {
    lines.push('## Main generator');
    lines.push('');
    lines.push(pageLine(home));
    lines.push('');
  }

  const indexes = indexLinkLines(loc.sectionList);
  if (indexes.length) {
    lines.push('## Section indexes');
    lines.push('');
    lines.push(...indexes);
    lines.push('');
  }

  lines.push(...inlineSectionLines(loc.sectionList, loc.code));
  return lines.join('\n').replace(/\n+$/, '\n');
}

function renderRootFile(locales) {
  const en = locales.get('en');
  const totalPages = [...locales.values()].reduce((n, l) => n + l.pages.length, 0);
  const lines = [];

  lines.push('# UltraTextGen');
  lines.push('');
  lines.push(`> ${en.home.summary}`);
  lines.push('');
  lines.push(
    'UltraTextGen is a free, no-sign-up text tool: Unicode font styles to copy '
    + 'and paste, a browsable symbol and emoji library, one reference page per '
    + 'individual symbol, printable lettering and handwriting sheets rendered '
    + 'in the browser, and explanatory guides and answers. Everything runs '
    + 'client-side.'
  );
  lines.push('');
  lines.push(
    `${totalPages} indexable pages in ${locales.size} languages. This file is a `
    + 'navigation index, not a URL list: '
    + `${BASE_URL}/sitemap.xml is the complete canonical URL list and stays the `
    + 'authority on what exists. Links below point to a narrower llms.txt index '
    + 'where one exists, and straight to a page where it does not.'
  );
  lines.push('');
  lines.push(
    'English pages are served from the site root, so this file is also the '
    + `English index (${BASE_URL}/en/${FILE_NAME} redirects here). Every other `
    + `language has its own index at ${BASE_URL}/<code>/${FILE_NAME}.`
  );
  lines.push('');

  if (en.home) {
    lines.push('## Main generator');
    lines.push('');
    lines.push(pageLine(en.home));
    lines.push('');
  }

  lines.push('## Languages');
  lines.push('');
  for (const code of [...locales.keys()].filter((c) => c !== 'en').sort()) {
    const loc = locales.get(code);
    lines.push(linkLine(
      `${BASE_URL}/${code}/${FILE_NAME}`,
      code,
      `${plural(loc.pages.length, 'page')}. ${loc.home ? loc.home.description : ''}`
    ));
  }
  lines.push('');

  const indexes = indexLinkLines(en.sectionList);
  if (indexes.length) {
    lines.push('## Sections (English)');
    lines.push('');
    lines.push(...indexes);
    lines.push('');
  }

  lines.push(...inlineSectionLines(en.sectionList, 'en', { skip: ['about'] }));

  // The spec reserves `## Optional` for "links an agent can skip when a shorter
  // context is needed", which is exactly what the company and policy pages are.
  const about = en.sectionList.find((s) => s.id === 'about');
  if (about && about.inlinePages.length) {
    lines.push('## Optional');
    lines.push('');
    for (const page of about.inlinePages) lines.push(pageLine(page));
    lines.push('');
  }

  return lines.join('\n').replace(/\n+$/, '\n');
}

// ─── Plan ────────────────────────────────────────────────────────────────────

/** Every file this system owns, as {relPath, content}, in deterministic order. */
function plan(locales) {
  const files = [];
  files.push({ relPath: FILE_NAME, content: renderRootFile(locales) });
  for (const code of [...locales.keys()].filter((c) => c !== 'en').sort()) {
    files.push({
      relPath: `${code}/${FILE_NAME}`,
      content: renderLocaleFile(locales.get(code)),
    });
  }
  for (const code of [...locales.keys()].sort()) {
    const loc = locales.get(code);
    for (const section of loc.sectionList) {
      for (const file of section.files) {
        files.push({ relPath: file.indexPath, content: renderDirFile(section, file, loc) });
      }
    }
  }
  files.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return files;
}

function build() {
  const { pages, skippedNoindex } = collectPages();
  const locales = buildTree(pages);
  return { pages, skippedNoindex, locales, files: plan(locales) };
}

// ─── Validation ──────────────────────────────────────────────────────────────

const LINK_RE = /^- \[(.*?)\]\((\S+?)\)(?::\s(.*))?$/;

/**
 * Everything the brief asks to be true of the output, asserted against the
 * emitted text rather than against the model that produced it — so a rendering
 * bug is caught, not just a modelling one.
 */
function validate(result) {
  const problems = [];
  const known = new Map(result.pages.map((p) => [p.url, p]));
  const emitted = new Set(result.files.map((f) => `${BASE_URL}/${f.relPath}`));
  const seenPageUrls = new Map();

  for (const file of result.files) {
    const where = `/${file.relPath}`;
    const lines = file.content.split('\n');

    if (!lines[0].startsWith('# ')) problems.push(`${where}: first line is not an H1`);
    if (lines[1] !== '') problems.push(`${where}: no blank line after the H1`);
    if (!lines[2] || !lines[2].startsWith('> ')) {
      problems.push(`${where}: no blockquote summary after the H1`);
    }
    if (!file.content.includes('\n## ')) problems.push(`${where}: no H2 section`);
    if (!file.content.endsWith('\n')) problems.push(`${where}: no trailing newline`);

    const inFile = new Set();
    let links = 0;
    for (const line of lines) {
      if (!line.startsWith('- ')) continue;
      const m = LINK_RE.exec(line);
      if (!m) { problems.push(`${where}: malformed list item: ${line}`); continue; }
      const [, text, url, note] = m;
      links += 1;
      if (!text.trim()) problems.push(`${where}: empty link text for ${url}`);
      if (!note || !note.trim()) problems.push(`${where}: ${url} has no description`);

      if (!url.startsWith(`${BASE_URL}/`)) {
        problems.push(`${where}: non-production URL ${url}`);
        continue;
      }
      if (/[?#]/.test(url)) problems.push(`${where}: URL carries a query or fragment: ${url}`);
      if (/([^:])\/\//.test(url)) problems.push(`${where}: duplicate slash in ${url}`);
      if (inFile.has(url)) problems.push(`${where}: duplicate URL ${url}`);
      inFile.add(url);

      const isIndex = emitted.has(url);
      if (!isIndex) {
        const page = known.get(url);
        if (!page) {
          problems.push(`${where}: ${url} is not a known indexable route`);
          continue;
        }
        if (page.noindex) problems.push(`${where}: ${url} is noindex`);
        if (page.canonical && page.canonical !== url) {
          problems.push(`${where}: ${url} is not its own canonical (${page.canonical})`);
        }
        if (!seenPageUrls.has(url)) seenPageUrls.set(url, []);
        seenPageUrls.get(url).push(where);
      }
    }
    if (!links) problems.push(`${where}: contains no links`);
  }

  // Every indexable page is represented exactly once.
  for (const page of result.pages) {
    const homes = seenPageUrls.get(page.url);
    if (!homes) problems.push(`page not represented anywhere: ${page.url}`);
    else if (homes.length > 1) {
      problems.push(`page listed in ${homes.length} files (${homes.join(', ')}): ${page.url}`);
    }
  }

  // A locale index for every locale that has pages, and none for one that does not.
  for (const [code, loc] of result.locales) {
    if (code === 'en') continue;
    const relPath = `${code}/${FILE_NAME}`;
    const has = result.files.some((f) => f.relPath === relPath);
    if (loc.pages.length && !has) problems.push(`locale ${code} has pages but no ${relPath}`);
    if (!loc.pages.length && has) problems.push(`locale ${code} has no pages but emits ${relPath}`);
  }

  // No empty or near-empty index file.
  for (const file of result.files) {
    const links = file.content.split('\n').filter((l) => l.startsWith('- ')).length;
    if (links === 0) problems.push(`/${file.relPath}: empty index`);
  }

  // A description must never be the page's own title restated.
  for (const page of result.pages) {
    if (!page.description) problems.push(`no description available for ${page.url}`);
    else if (page.description.toLowerCase() === page.title.toLowerCase()) {
      problems.push(`description is just the title for ${page.url}`);
    }
  }

  return problems;
}

/** Per-file size and link count, for the audit. */
function fileStats(files) {
  return files.map((f) => ({
    relPath: f.relPath,
    bytes: byteLength(f.content),
    links: f.content.split('\n').filter((l) => l.startsWith('- ')).length,
  }));
}

module.exports = {
  BASE_URL,
  FILE_NAME,
  SECTIONS,
  SECTION_ORDER,
  SECTION_MIN_PAGES,
  ROOT_PAGE_SECTION,
  ROOT,
  build,
  classify,
  collectPages,
  buildTree,
  plan,
  validate,
  fileStats,
  firstSentence,
  descriptionFor,
  splitSentences,
  echoesTitle,
  escapeLinkText,
  readPage,
  byteLength,
};
