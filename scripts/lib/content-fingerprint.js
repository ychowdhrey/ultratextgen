'use strict';

/**
 * content-fingerprint.js
 *
 * Language-independent "structural fingerprint" of a page: which content
 * pages it links to (resolved through the hreflang cluster map so a
 * locale-native link and its EN equivalent count as the same target — see
 * "Locale-native internal linking" in CLAUDE.md), plus FAQ/h2/symbol-tile
 * counts. Shared by audit-translation-parity.js (point-in-time site sweep)
 * and check-translation-parity.js (per-PR diff gate) so "did this page's
 * content actually change" means the same thing in both places.
 */

const cheerio = require('cheerio');
const { normalizeUrl } = require('./translation-clusters');

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

  function countJsonLdQuestions(html) {
    const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    let count = 0;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node['@type'] === 'Question') count++;
      for (const k of Object.keys(node)) walk(node[k]);
    };
    while ((m = scriptRe.exec(html))) {
      try {
        walk(JSON.parse(m[1]));
      } catch {
        // malformed JSON-LD is a separate problem, not this tool's job
      }
    }
    return count;
  }

  function fingerprint(html) {
    const $ = cheerio.load(html);
    const links = new Set();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const norm = normalizeContentHref(href);
      if (norm && CONTENT_LINK_RE.test(norm)) links.add(norm);
    });
    return {
      links,
      h2Count: $('h2').length,
      faqCount: countJsonLdQuestions(html),
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

  function score(d) {
    return (
      d.onlyInEN.length +
      d.onlyInLocale.length +
      (d.h2Delta !== 0 ? 1 : 0) +
      (d.faqDelta !== 0 ? 1 : 0) +
      (d.symbolTilesDelta !== 0 ? 1 : 0)
    );
  }

  return { fingerprint, diff, score, normalizeContentHref };
}

module.exports = { createFingerprinter, CONTENT_LINK_RE };
