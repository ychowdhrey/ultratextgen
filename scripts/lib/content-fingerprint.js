'use strict';

/**
 * content-fingerprint.js
 *
 * Language-independent "structural fingerprint" of a page: which content
 * pages it links to (resolved through the hreflang cluster map so a
 * locale-native link and its EN equivalent count as the same target — see
 * "Locale-native internal linking" in CLAUDE.md), plus rendered-FAQ/h2/
 * symbol-tile counts. Shared by audit-translation-parity.js (point-in-time site sweep)
 * and check-translation-parity.js (per-PR diff gate) so "did this page's
 * content actually change" means the same thing in both places.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { normalizeUrl } = require('./translation-clusters');

// Catalogue pages — pillar indexes whose internal-link list is an inventory of
// what exists in that locale, not translated content. EN library/index carries
// ~306 content links against 7-50 on its locale siblings, and category/index
// carries 25 against 0, because a locale catalogue must not link English-only
// pages. Counting those links as structural drift made every new EN page demand
// a locale sibling edit, which is why the link set is dropped for these pages
// (and only these). Every other fingerprint component still applies — see
// data/parity_catalogue_pages.json for the full rationale and the scope limit.
const CATALOGUE_CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'parity_catalogue_pages.json');

let cataloguePatterns = null;

function loadCataloguePatterns() {
  if (cataloguePatterns) return cataloguePatterns;
  try {
    const parsed = JSON.parse(fs.readFileSync(CATALOGUE_CONFIG_PATH, 'utf8'));
    cataloguePatterns = Array.isArray(parsed.cataloguePatterns) ? parsed.cataloguePatterns : [];
  } catch {
    // Missing/malformed config must not silently disable the gate's link
    // coverage for every page — fall back to "nothing is a catalogue".
    cataloguePatterns = [];
  }
  return cataloguePatterns;
}

/**
 * Is this repo-relative path a pillar catalogue index (EN or locale)?
 * Matches `library/index.html` and `<lang>/library/index.html`, but not
 * `library/currency-symbols/index.html`.
 */
function isCataloguePage(relPath) {
  if (!relPath) return false;
  const rel = String(relPath).replace(/^[./]+/, '').replace(/\\/g, '/');
  return loadCataloguePatterns().some(
    (pattern) => rel === pattern || rel.endsWith(`/${pattern}`)
  );
}

// `events` was missing until 2026-07-31: the section shipped after this regex
// was written, so every /events/ link was invisible to the fingerprint. A PR
// adding event links across 26 library hubs reported "0 pairs with unsynced
// content change" — a blind pass, not a clean one. Any new content type has to
// be added here or the parity gate silently stops covering it.
const CONTENT_LINK_RE = /^\/(category|library|symbol|guide|answers|usecase|updates|events)\//;

/**
 * @param {Map} byUrl - from discoverClusters(): normalized canonical -> record
 * @param {Set} localeCodes - from discoverClusters(): known locale hreflang codes
 */
function createFingerprinter(byUrl, localeCodes) {
  const localeCodesSorted = [...localeCodes].sort((a, b) => b.length - a.length); // longest first (zh-tw before zh)

  function stripLocalePrefix(pathname) {
    for (const code of localeCodesSorted) {
      const prefix = `/${code}/`;
      if (pathname.toLowerCase().startsWith(prefix)) {
        return pathname.slice(prefix.length - 1); // keep leading slash
      }
    }
    return pathname;
  }

  // A raw href diff produces false positives from *correct* locale-native
  // linking (a locale page linking its own translated sibling instead of the
  // EN slug). Resolve every link through the cluster map to its EN-canonical
  // identity before comparing; fall back to locale-prefix stripping only when
  // the target isn't part of any known cluster.
  function identityHref(absUrl) {
    const rec = byUrl.get(absUrl);
    if (rec) {
      if (rec.ownLang === 'en') return rec.canonical;
      const enAlt = rec.alternates.find((a) => a.hreflang === 'en');
      if (enAlt) return enAlt.href;
    }
    return absUrl;
  }

  function normalizeContentHref(href) {
    try {
      const u = href.startsWith('http') ? new URL(href) : new URL(href, 'https://ultratextgen.com/');
      const full = normalizeUrl(u.origin + u.pathname);
      const resolved = identityHref(full);
      let p = new URL(resolved).pathname.replace(/\/+$/, '/') || '/';
      p = stripLocalePrefix(p);
      return p;
    } catch {
      return null;
    }
  }

  /**
   * How many FAQ entries the page actually RENDERS.
   *
   * This counted `@type: "Question"` entries in the page's JSON-LD until
   * 2026-08-21. That is metadata describing the content, not the content,
   * and the two routinely disagree: CLAUDE.md names the stale-schema case
   * (visible FAQ edited, JSON-LD left behind) as the more common of the two
   * FAQ failure modes, and the site once carried 214 pages of it at once.
   *
   * Counting the schema made this fingerprint read a *repair* as *drift*.
   * Backfilling category/underline-text's JSON-LD from 10 questions to the
   * 24 its page had been rendering all along changed no page copy at all,
   * yet moved faqCount by 14 and flagged all 10 of its locale siblings —
   * whose own real gap against it had not moved by one item. Worse, it made
   * the two gates pull against each other: check-faq-schema requires the
   * JSON-LD to match the visible FAQ, and fixing it cost you this one.
   *
   * `.faq-item` covers both house variants (the JS-bound `div` accordion and
   * the JS-free `details` disclosure). A page rendering no FAQ counts 0
   * whether or not it ships orphan schema — that defect belongs to
   * check-faq-schema.js, which owns it and gates on it.
   *
   * Blast radius when this changed: 2,813 of the 2,871 FAQ-bearing pages
   * already had visible === schema, so this is a no-op for 98% of the site;
   * the 58 that differ are precisely the pages whose schema is stale.
   */
  function countVisibleFaqItems($) {
    return $('.faq-item').length;
  }

  /**
   * The combo-set sections this page renders AT RUNTIME, as containerId ->
   * number of groups.
   *
   * Every other axis here reads static markup, and a `copy_pattern:
   * "collection"` section has none: its tiles are built by
   * `UltraTextGen.buildGrids(containerId, GROUPS)` after load, so the page
   * ships an empty `<div id="…Container"></div>` and nothing else. A page
   * missing an entire section therefore fingerprinted identically to one that
   * had it, on links, FAQs and `.symbol-tile` alike.
   *
   * That blind spot shipped: 16 locale library pages went live without the
   * combo-set section their English parent carries (ar/library/fire-emoji,
   * de/library/krone-emoji, ja/library/dokuro-emoji, …), and no check on this
   * site could see it. The one axis that did move — `<h2>` — moved the WRONG
   * WAY when the section was restored, because those pages already carried
   * two sections their parent lacks (a visible FAQ and an editorial block),
   * so the h2 gap went from +1 to +2 and the repair scored as drift. Same
   * inversion as the faqCount and boolean-score defects above, from a third
   * cause.
   *
   * Container ids are language-independent by construction — a locale spec
   * inherits `collection_container_id` from its EN parent verbatim — so they
   * compare across languages the way translated headings never could. The
   * group count gives the axis a magnitude, which is what lets a partially
   * ported section register as movement (see score()).
   *
   * Groups are counted by `flags:`, not `defaultFormat:`. Both appear once
   * per group in the generator's emitted `GROUPS` array, but hand-written
   * arrays do not always carry `defaultFormat` — library/emoji-flags'
   * FLAG_GROUPS has none, so counting it reported that page's section as 0
   * groups, i.e. as empty. Across all 808 pages carrying a `buildGrids` call
   * (exactly one each) `flags:` is never absent and never disagrees with
   * `defaultFormat:` where both exist — verified 2026-09-01.
   */
  function collectionSets($) {
    const sets = new Map();
    $('script').each((_, el) => {
      const js = $(el).html() || '';
      const m = /\bbuildGrids\(\s*["']([^"']+)["']/.exec(js);
      if (!m) return;
      sets.set(m[1], (js.match(/\bflags\s*:/g) || []).length);
    });
    return sets;
  }

  /**
   * @param {string} html
   * @param {object} [opts]
   * @param {string} [opts.relPath] - repo-relative path; when it names a
   *        catalogue index the inventory link set is excluded (see
   *        isCataloguePage / data/parity_catalogue_pages.json).
   */
  function fingerprint(html, opts) {
    const $ = cheerio.load(html);
    const catalogue = isCataloguePage(opts && opts.relPath);
    const links = new Set();
    if (!catalogue) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const norm = normalizeContentHref(href);
        if (norm && CONTENT_LINK_RE.test(norm)) links.add(norm);
      });
    }
    return {
      links,
      catalogue,
      h2Count: $('h2').length,
      faqCount: countVisibleFaqItems($),
      symbolTileCount: $('.symbol-tile').length,
      collectionSets: collectionSets($),
    };
  }

  /**
   * Match a page's combo-set sections against its sibling's.
   *
   * Container ids are USUALLY shared — a locale spec inherits
   * `collection_container_id` from its EN parent — but not always: 40 of the
   * site's 539 EN/locale pairs that render a combo set on both sides use
   * different ids for the same section (`asciiSetsContainer` vs
   * `textArtContainer`, `laughSetsContainer` vs `laughingSetsContainer`,
   * `geldSetsContainerDE` vs `moneySetsContainer`).
   *
   * Matching on the id alone therefore reported both sides as missing a
   * section the other has — and because an unmatched section is scored by its
   * size, SHRINKING one then read as convergence. Probed exactly that way:
   * deleting three of five groups from tr/library/gulen-emoji passed the gate
   * with exit 0. Positional fallback (every page on this site carries exactly
   * one buildGrids call — verified across all 808) pairs the leftovers, so a
   * differently-named section is compared on its group count and a genuinely
   * absent one still costs its full size.
   *
   * An id mismatch itself is reported, never scored: it is a naming
   * inconsistency, not a content gap, and scoring it would flag those 40
   * pairs with no edit able to converge them.
   */
  function pairCollections(enSets, loSets) {
    const onlyEN = [...enSets.keys()].filter((id) => !loSets.has(id)).sort();
    const onlyLocale = [...loSets.keys()].filter((id) => !enSets.has(id)).sort();
    const deltas = [...enSets.keys()]
      .filter((id) => loSets.has(id))
      .sort()
      .map((id) => ({ id, delta: enSets.get(id) - loSets.get(id) }));
    const renamed = [];
    while (onlyEN.length && onlyLocale.length) {
      const a = onlyEN.shift();
      const b = onlyLocale.shift();
      renamed.push({ enId: a, localeId: b });
      deltas.push({ id: `${a} / ${b}`, delta: enSets.get(a) - loSets.get(b) });
    }
    return {
      collectionsOnlyInEN: onlyEN.map((id) => ({ id, groups: enSets.get(id) })),
      collectionsOnlyInLocale: onlyLocale.map((id) => ({ id, groups: loSets.get(id) })),
      collectionGroupDeltas: deltas.filter((d) => d.delta !== 0),
      collectionsRenamed: renamed,
    };
  }

  function diff(enFp, fp) {
    const enSets = enFp.collectionSets || new Map();
    const loSets = fp.collectionSets || new Map();
    return {
      onlyInEN: [...enFp.links].filter((l) => !fp.links.has(l)).sort(),
      onlyInLocale: [...fp.links].filter((l) => !enFp.links.has(l)).sort(),
      h2Delta: enFp.h2Count - fp.h2Count,
      faqDelta: enFp.faqCount - fp.faqCount,
      symbolTilesDelta: enFp.symbolTileCount - fp.symbolTileCount,
      ...pairCollections(enSets, loSets),
    };
  }

  /**
   * How far apart two pages are. Used two ways: `> 0` answers "did anything
   * structural move", and before/after comparison answers "did this edit move
   * the page toward its sibling" (check-translation-parity.js's convergence
   * carve-out).
   *
   * The three count axes were scored as booleans until 2026-08-21 — a page
   * 20 sections short of its sibling scored the same 1 as a page short by
   * one. That silently broke the convergence carve-out on those axes: a page
   * catching up could only ever register as converged by landing *exactly*
   * equal, so every partial step read as no movement and got flagged as
   * drift. Both real cases in the PR that surfaced this were exactly that —
   * tr/symbol/dolar-isareti porting in the "why $ shows up outside pricing"
   * section its EN parent already had (h2 gap 3 -> 2, tiles 5 -> 4), and
   * ru/library/html-spetssimvoly deleting an empty section its EN parent
   * never had (h2 gap 2 -> 1). Both moved toward their sibling; both were
   * reported as having moved away from it.
   *
   * Magnitudes fix that without weakening the check: adding a section the
   * sibling lacks still raises the score, trading one divergence for another
   * still nets non-negative, and convergence still requires a strict
   * decrease. Units are deliberately mixed (links + sections + FAQs + tiles)
   * — this is only ever compared against itself for one pair, never against
   * a threshold.
   */
  function score(d) {
    // Defensive `|| []`: applySuppression() in parity-exceptions.js rebuilds
    // the diff object field by field, so a diff that has been through it
    // carries only the fields that file knows about.
    const missingSection = (list) =>
      (list || []).reduce((n, c) => n + 1 + c.groups, 0);
    return (
      d.onlyInEN.length +
      d.onlyInLocale.length +
      Math.abs(d.h2Delta) +
      Math.abs(d.faqDelta) +
      Math.abs(d.symbolTilesDelta) +
      // A section one side does not render at all costs its whole size, so
      // restoring it outweighs the +1 the h2 axis can move in the wrong
      // direction on a page that is otherwise richer than its parent.
      missingSection(d.collectionsOnlyInEN) +
      missingSection(d.collectionsOnlyInLocale) +
      (d.collectionGroupDeltas || []).reduce((n, c) => n + Math.abs(c.delta), 0)
    );
  }

  return { fingerprint, diff, score, normalizeContentHref };
}

module.exports = { createFingerprinter, isCataloguePage, CONTENT_LINK_RE };
