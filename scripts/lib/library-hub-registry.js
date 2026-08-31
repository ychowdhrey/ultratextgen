'use strict';

/**
 * library-hub-registry.js
 *
 * Shared logic for "does this locale's library/symbol hub actually know about
 * the pages that exist in that lane?" — used by both
 * scripts/audit-library-hub-coverage.js (whole-site dashboard) and
 * scripts/check-library-hub-coverage.js (the diff-scoped PR gate), so the audit
 * and the gate can never disagree about what "registered" means. Same split,
 * and the same reason, as scripts/lib/faq-schema-audit.js and
 * scripts/lib/content-fingerprint.js.
 *
 * WHY THIS EXISTS
 * ---------------
 * A hub's inventory is a hand-maintained list living inside the hub file.
 * Nothing generates it and, until this file, nothing compared it to the pages
 * on disk. A page could ship correct in every other respect — indexable,
 * self-canonical, meshed, in the sitemap — and simply never be announced by the
 * hub it belongs to. A 2026-08-26 audit found 374 such pages, 210 of them in
 * `es` alone (253 Spanish library pages, 42% hub coverage).
 *
 * FIVE MECHANISMS, NOT ONE — the part that must not be simplified
 * --------------------------------------------------------------
 * There is no shared registry and no route manifest. Each hub carries its own
 * copy of its inventory in one of five forms, and which form is a property of
 * the hub, not of the locale:
 *
 *   1. `libraryArray`  — `var/const LIBRARY = [{ slug, title, … }]`, the
 *                        search/filter directory. NOT visible to a crawler
 *                        that does not execute JavaScript.
 *   2. `libEntry`      — `<article class="lib-entry">` pre-rendered into
 *                        `#libDirectory` by scripts/build-library-directory.js.
 *   3. `azIndex`       — `<ul class="lib-index-list">`, the crawlable A–Z list.
 *   4. `compareCard`   — `<a class="compare-card">` grids (every `symbol` hub,
 *                        and the editorial-template library hubs).
 *   5. `tipCard`       — `<a class="tip-card">` grids inside `.tips-grid`.
 *
 * Mechanisms 2–5 are visible in the HTML; mechanism 1 is not. `registered`
 * therefore means "listed in any of the five" and `crawlable` means "listed in
 * any of 2–5", and they are reported separately because they answer different
 * questions.
 *
 * A checker that knew only `compare-card` would report `da`, `no` and `sv` as
 * broken (they use `tip-card`) and `es` as fine. That is not hypothetical: the
 * first pass of the audit did exactly that, and reported those three locales as
 * 3, 11 and 10 pages short when all three are complete. Do not narrow this set
 * without re-checking those locales.
 *
 * TWO PARSING RULES THAT ARE LOAD-BEARING
 * ---------------------------------------
 * - **Script bodies are stripped before anchor scanning.** Directory hubs embed
 *   an `<article class="lib-entry">` *inside a JS template string*, whose href
 *   is `'/library/' + encodeURIComponent(item.slug) + '/'`. A naïve anchor scan
 *   reads that interpolation as a link and invents a hub entry for a slug that
 *   is not a slug. The `LIBRARY` array is parsed from the raw text separately,
 *   before the strip.
 * - **Off-lane pages are matched by declared English parent, never by slug.**
 *   38 pages declare an `hreflang="en"` pointing into `/library/` or `/symbol/`
 *   while living at `<lang>/<slug>/` (e.g. `es/simbolos-de-corazon/` →
 *   `/library/heart-symbols/`). Any comparison scoped to the lane reports them
 *   as neither present nor missing, which is how they went unexamined.
 */

const fs = require('fs');
const path = require('path');
const { LOCALES } = require('./locale-parent-registry');

const ROOT = path.resolve(__dirname, '..', '..');
const LANES = ['library', 'symbol'];
const EXCLUSIONS_FILE = path.join(ROOT, 'data', 'library_hub_exclusions.json');

// Locale discovery comes from the canonical code list, never from a filesystem
// glob. scripts/validate_library_pages.py used `REPO.glob("??")`, which is two
// characters — so `zh-tw` (five) was silently never scanned, hiding 73 pages,
// while `js/` was scanned as though it were a locale.
const LOCALE_SET = new Set(LOCALES);

function readFileOrNull(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** Strip `<script>…</script>` bodies. See "TWO PARSING RULES" above. */
function stripScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>');
}

/**
 * Slice a balanced bracketed literal beginning at `start` (the opening bracket).
 * Deliberately simple: the LIBRARY arrays in these hubs are plain object
 * literals with double-quoted strings, no template literals and no regexes.
 */
function sliceBalanced(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function laneHref(locale, lane) {
  return locale ? `/${locale}/${lane}/` : `/${lane}/`;
}

/** `/es/library/foo/` under prefix `/es/library/` → `foo`; the hub itself → null. */
function slugFromHref(href, prefix) {
  if (!href.startsWith(prefix)) return null;
  const rest = href.slice(prefix.length).split('#')[0].split('?')[0].replace(/\/+$/, '');
  return rest || null;
}

function anchorsWithClass(html, className, prefix) {
  const out = [];
  const tagRe = /<a\b[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    const cls = /\sclass="([^"]*)"/i.exec(tag);
    const href = /\shref="([^"]*)"/i.exec(tag);
    if (!cls || !href) continue;
    if (!cls[1].split(/\s+/).includes(className)) continue;
    const slug = slugFromHref(href[1], prefix);
    if (slug) out.push(slug);
  }
  return out;
}

function allAnchorSlugs(html, prefix) {
  const out = [];
  const re = /<a\b[^>]*\shref="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = slugFromHref(m[1], prefix);
    if (slug) out.push(slug);
  }
  return out;
}

/**
 * Read one hub file and report, per mechanism, which slugs it lists.
 * Returns null when the hub file does not exist — a real state (`fi` and `ms`
 * have library and symbol pages and no hub page at all), distinct from a hub
 * that exists and lists nothing.
 */
function readHub(locale, lane, root = ROOT) {
  const rel = path.posix.join(...[locale, lane, 'index.html'].filter(Boolean));
  const raw = readFileOrNull(path.join(root, rel));
  if (raw === null) return null;

  const prefix = laneHref(locale, lane);

  // The LIBRARY array is read from the RAW text — it lives inside a <script>.
  const libraryArray = [];
  const decl = /\b(?:var|const|let)\s+LIBRARY\s*=\s*\[/.exec(raw);
  if (decl) {
    const block = sliceBalanced(raw, raw.indexOf('[', decl.index));
    if (block) {
      const slugRe = /slug\s*:\s*"([^"]+)"/g;
      let s;
      while ((s = slugRe.exec(block)) !== null) libraryArray.push(s[1]);
    }
  }

  // Everything else is read from the script-stripped text.
  const html = stripScripts(raw);

  const libEntry = [];
  const entryRe = /<article class="lib-entry">[\s\S]*?<\/article>/g;
  let a;
  while ((a = entryRe.exec(html)) !== null) {
    for (const slug of allAnchorSlugs(a[0], prefix)) libEntry.push(slug);
  }

  const azIndex = [];
  const az = /<ul class="lib-index-list">([\s\S]*?)<\/ul>/.exec(html);
  if (az) {
    const hrefRe = /href="([^"]+)"/g;
    let h;
    while ((h = hrefRe.exec(az[1])) !== null) {
      const slug = slugFromHref(h[1], prefix);
      if (slug) azIndex.push(slug);
    }
  }

  const mechanisms = {
    libraryArray,
    libEntry,
    azIndex,
    compareCard: anchorsWithClass(html, 'compare-card', prefix),
    tipCard: anchorsWithClass(html, 'tip-card', prefix),
  };

  const anyLink = new Set(allAnchorSlugs(html, prefix));

  let template = 'minimal';
  if (libraryArray.length || azIndex.length) template = 'directory';
  else if (mechanisms.tipCard.length) template = 'tip-grid';
  else if (mechanisms.compareCard.length) template = 'editorial';

  return { file: rel, prefix, template, mechanisms, anyLink };
}

/** Union of every mechanism (crawlable HTML *and* the JS-only array). */
function registeredSlugs(hub) {
  const s = new Set();
  for (const list of Object.values(hub.mechanisms)) for (const slug of list) s.add(slug);
  return s;
}

/** Union of the four mechanisms present in the HTML — no JS execution needed. */
function crawlableSlugs(hub) {
  const s = new Set();
  for (const key of ['libEntry', 'azIndex', 'compareCard', 'tipCard']) {
    for (const slug of hub.mechanisms[key]) s.add(slug);
  }
  return s;
}

function mechanismsListing(hub, slug) {
  return Object.entries(hub.mechanisms)
    .filter(([, list]) => list.includes(slug))
    .map(([name]) => name);
}

/** Directories under `<locale>/<lane>/` (or `<lane>/`) that hold an index.html. */
function lanePages(locale, lane, root = ROOT) {
  const dir = path.join(root, ...[locale, lane].filter(Boolean));
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'index.html')))
    .map((e) => e.name)
    .sort();
}

// ─── _redirects ────────────────────────────────────────────────────────────
// A hub entry whose page is gone is not automatically a 404: the lane migration
// (`<lang>/library/<slug>` → `<lang>/symbol/<slug>`) left `_redirects` rules
// behind, so the visitor lands correctly after one hop. That is a warning, not
// an error, and the two must not be conflated.

let redirectCache = null;
function redirectMap(root = ROOT) {
  if (redirectCache) return redirectCache;
  redirectCache = new Map();
  const raw = readFileOrNull(path.join(root, '_redirects'));
  if (raw) {
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const parts = t.split(/\s+/);
      if (parts.length < 2 || !parts[0].startsWith('/')) continue;
      let from = parts[0].replace(/index\.html$/, '');
      from = from.replace(/\/+$/, '') + '/';
      redirectCache.set(from, parts[1]);
    }
  }
  return redirectCache;
}

// ─── off-lane pages ────────────────────────────────────────────────────────

const EN_ALTERNATE_RE =
  /hreflang="en"\s+href="https:\/\/ultratextgen\.com(\/[^"]*)"/;

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'assets', 'data', 'scripts', 'docs', 'js', 'functions', 'embed',
]);

/**
 * Every page anywhere in the tree whose declared English parent is a
 * `/library/` or `/symbol/` page but which does not itself live in that lane.
 * Matched by parent, never by slug — see "TWO PARSING RULES" above.
 */
function findOffLanePages(root = ROOT) {
  const found = [];
  (function walk(dir, rel) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === 'index.html') && rel) {
      const segments = rel.split('/');
      const inLane = segments[0] === 'library' || segments[0] === 'symbol' || LANES.includes(segments[1]);
      if (!inLane) {
        const html = readFileOrNull(path.join(dir, 'index.html'));
        const m = html && EN_ALTERNATE_RE.exec(html);
        if (m && (m[1].startsWith('/library/') || m[1].startsWith('/symbol/'))) {
          found.push({ locale: segments[0], route: `/${rel}/`, file: `${rel}/index.html`, enParent: m[1] });
        }
      }
    }
    for (const e of entries) {
      if (!e.isDirectory() || SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name);
    }
  })(root, '');
  return found.filter((p) => LOCALE_SET.has(p.locale)).sort((a, b) => a.route.localeCompare(b.route));
}

// ─── exclusions ────────────────────────────────────────────────────────────

/**
 * The repo previously had no way to say "this page deliberately does not belong
 * in the hub" — so every absence was indistinguishable from an oversight, and a
 * gate would have had nowhere to record a legitimate exception. Keyed by route.
 *
 * Same bar as every other ledger here (data/translation_parity_exceptions.json,
 * data/english_parent_exceptions.json): entries are discussed decisions, never
 * added unilaterally to make a page pass.
 */
function loadExclusions(root = ROOT) {
  const raw = readFileOrNull(root === ROOT ? EXCLUSIONS_FILE : path.join(root, 'data', 'library_hub_exclusions.json'));
  if (!raw) return new Map();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`data/library_hub_exclusions.json is not valid JSON: ${e.message}`);
  }
  const map = new Map();
  for (const entry of parsed.exclusions || []) {
    if (!entry.route) continue;
    map.set(entry.route.replace(/\/+$/, '') + '/', entry);
  }
  return map;
}

// ─── the analysis ──────────────────────────────────────────────────────────

/**
 * Full picture for one (locale, lane). `locale` is '' for English.
 *
 * missing  — page exists on disk, no mechanism lists it (minus exclusions)
 * orphans  — a mechanism lists it, no page on disk; `redirect` set when
 *            `_redirects` covers it (warning) and null when it does not (error)
 * jsOnly   — listed only in the JS array, so invisible to a non-JS crawler
 * unsearchable — in the crawlable HTML but absent from the search directory
 * duplicates   — listed more than once inside a single mechanism
 */
function analyseLane(locale, lane, opts = {}) {
  const root = opts.root || ROOT;
  const exclusions = opts.exclusions || loadExclusions(root);
  const pages = lanePages(locale, lane, root);
  const hub = readHub(locale, lane, root);
  const prefix = laneHref(locale, lane);

  const result = {
    locale: locale || 'EN',
    lane,
    prefix,
    hubFile: hub ? hub.file : null,
    template: hub ? hub.template : 'none',
    pages,
    registered: [],
    crawlable: [],
    missing: [],
    excluded: [],
    orphans: [],
    jsOnly: [],
    unsearchable: [],
    duplicates: [],
  };

  if (!hub) {
    // No hub file. Every page in the lane is unreachable from a hub that does
    // not exist — reported, so `fi`/`ms` do not read as "0 problems".
    result.missing = pages.map((slug) => ({
      slug,
      route: `${prefix}${slug}/`,
      reason: 'no-hub-file',
      linkedInProse: false,
    }));
    return result;
  }

  const registered = registeredSlugs(hub);
  const crawlable = crawlableSlugs(hub);
  const pageSet = new Set(pages);

  result.registered = pages.filter((s) => registered.has(s));
  result.crawlable = pages.filter((s) => crawlable.has(s));

  for (const slug of pages) {
    if (registered.has(slug)) continue;
    const route = `${prefix}${slug}/`;
    if (exclusions.has(route)) {
      result.excluded.push({ slug, route, entry: exclusions.get(route) });
      continue;
    }
    result.missing.push({
      slug,
      route,
      reason: 'not-registered',
      linkedInProse: hub.anyLink.has(slug),
    });
  }

  const redirects = redirectMap(root);
  for (const slug of registered) {
    if (pageSet.has(slug)) continue;
    const route = `${prefix}${slug}/`;
    result.orphans.push({
      slug,
      route,
      listedIn: mechanismsListing(hub, slug),
      redirect: redirects.get(route) || null,
    });
  }

  if (hub.template === 'directory') {
    const array = new Set(hub.mechanisms.libraryArray);
    for (const slug of pages) {
      if (array.has(slug) && !crawlable.has(slug)) {
        result.jsOnly.push({ slug, route: `${prefix}${slug}/` });
      }
      if (crawlable.has(slug) && !array.has(slug)) {
        result.unsearchable.push({ slug, route: `${prefix}${slug}/` });
      }
    }
  }

  for (const [name, list] of Object.entries(hub.mechanisms)) {
    const seen = new Map();
    for (const slug of list) seen.set(slug, (seen.get(slug) || 0) + 1);
    for (const [slug, count] of seen) {
      if (count > 1) result.duplicates.push({ slug, route: `${prefix}${slug}/`, mechanism: name, count });
    }
  }

  return result;
}

/** Every (locale, lane) that has pages or a hub, English included. */
function analyseAll(opts = {}) {
  const root = opts.root || ROOT;
  const exclusions = loadExclusions(root);
  const out = [];
  for (const lane of LANES) {
    for (const locale of ['', ...LOCALES]) {
      const hasPages = lanePages(locale, lane, root).length > 0;
      const hasHub = readHub(locale, lane, root) !== null;
      if (!hasPages && !hasHub) continue;
      out.push(analyseLane(locale, lane, { root, exclusions }));
    }
  }
  return out;
}

/**
 * Off-lane pages joined to whether their locale's library hub links them.
 * Reported, never failed: several are the locale's strongest assets sitting at
 * the locale root deliberately, and moving one is a 301 decision needing GSC
 * evidence. Whether the hub *links* them is the part that is code-only.
 */
function offLaneCoverage(root = ROOT) {
  return findOffLanePages(root).map((page) => {
    const hub = readHub(page.locale, 'library', root);
    const linked = hub
      ? readFileOrNull(path.join(root, hub.file)).includes(`href="${page.route}"`)
      : false;
    return { ...page, hubFile: hub ? hub.file : null, hubLinks: linked };
  });
}

/** `es/library/foo/index.html` → `{ locale:'es', lane:'library', slug:'foo' }`. */
function parseLanePath(relPath) {
  const m = /^(?:([a-z]{2}(?:-[a-z]{2})?)\/)?(library|symbol)\/([^/]+)\/index\.html$/.exec(relPath);
  if (!m) return null;
  const locale = m[1] || '';
  if (locale && !LOCALE_SET.has(locale)) return null;
  return { locale, lane: m[2], slug: m[3] };
}

/** `es/library/index.html` → `{ locale:'es', lane:'library' }`. */
function parseHubPath(relPath) {
  const m = /^(?:([a-z]{2}(?:-[a-z]{2})?)\/)?(library|symbol)\/index\.html$/.exec(relPath);
  if (!m) return null;
  const locale = m[1] || '';
  if (locale && !LOCALE_SET.has(locale)) return null;
  return { locale, lane: m[2] };
}

module.exports = {
  LANES,
  LOCALES,
  ROOT,
  analyseAll,
  analyseLane,
  crawlableSlugs,
  findOffLanePages,
  lanePages,
  loadExclusions,
  offLaneCoverage,
  parseHubPath,
  parseLanePath,
  readHub,
  redirectMap,
  registeredSlugs,
  stripScripts,
};
