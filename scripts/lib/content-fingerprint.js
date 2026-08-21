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
    };
  }

  function diff(enFp, fp) {
    return {
      onlyInEN: [...enFp.links].filter((l) => !fp.links.has(l)).sort(),
      onlyInLocale: [...fp.links].filter((l) => !enFp.links.has(l)).sort(),
      h2Delta: enFp.h2Count - fp.h2Count,
      faqDelta: enFp.faqCount - fp.faqCount,
      symbolTilesDelta: enFp.symbolTileCount - fp.symbolTileCount,
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
    return (
      d.onlyInEN.length +
      d.onlyInLocale.length +
      Math.abs(d.h2Delta) +
      Math.abs(d.faqDelta) +
      Math.abs(d.symbolTilesDelta)
    );
  }

  return { fingerprint, diff, score, normalizeContentHref };
}

module.exports = { createFingerprinter, isCataloguePage, CONTENT_LINK_RE };
