'use strict';

/**
 * locale-link-rewrite.js
 *
 * Given discoverClusters()'s { byUrl, clusters } and one page record, finds
 * every internal <a href="..."> on that page pointing at an English
 * (non-locale-prefixed) hub/spoke URL under one of the sections named in
 * CLAUDE.md's "Locale-native internal linking" rule — category/, library/,
 * usecase/, guide/, answers/, symbol/, or any of the eleven platform roots —
 * for which a locale-native equivalent already exists, in THIS page's own
 * locale, inside that URL's hreflang cluster.
 *
 * This turns that CLAUDE.md rule from an after-the-fact audit (fixed
 * manually across PR #586 and its 21-locale follow-up audit) into
 * generation-time tooling: scripts/sync-locale-mesh.js is the CLI that
 * reports/applies these candidates, scripts/check-locale-mesh.js is the PR
 * gate that requires them already applied.
 *
 * Deliberately narrow scope, matching the rule it automates: only the
 * sections named above are considered, not every internal link on a page
 * (footer legal links, symbol-explorer runtime hooks, etc. are out of
 * scope — CLAUDE.md's rule, and the recurring bug it documents, is specific
 * to these content sections).
 */

const { getAttr, normalizeUrl } = require('./translation-clusters');

const BASE = 'https://ultratextgen.com';

// Mirrors audit-hreflang.js's isHomepage(): a page's own placeholder link to
// a bare site root or bare locale homepage is never a rewrite candidate. It
// wouldn't match MONITORED_PREFIX_RE below anyway (a bare homepage path has
// no monitored first segment) — kept as an explicit guard per the same
// defensive reasoning audit-hreflang.js documents, and in case this helper
// is ever reused against a broader link set.
function isHomepage(url) {
  return /^https:\/\/ultratextgen\.com\/([a-z]{2}(-[a-z]+)?\/)?$/.test(url);
}

const PLATFORM_ROOTS = [
  'discord',
  'facebook',
  'instagram',
  'linkedin',
  'pinterest',
  'snapchat',
  'telegram',
  'tiktok',
  'whatsapp',
  'x',
  'youtube',
];

const MONITORED_SECTIONS = ['category', 'library', 'usecase', 'guide', 'answers', 'symbol', ...PLATFORM_ROOTS];

const MONITORED_PREFIX_RE = new RegExp('^/(' + MONITORED_SECTIONS.join('|') + ')/');

const ANCHOR_RE = /<a\b[^>]*>/gi;

function resolveHref(href) {
  if (!href) return null;
  if (href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return null;
  if (/^https?:\/\//i.test(href)) {
    const normalized = href.replace(/^http:/, 'https:');
    if (!normalized.startsWith(BASE)) return null; // external domain — out of scope
    return normalizeUrl(normalized);
  }
  if (href.startsWith('/')) return normalizeUrl(BASE + href);
  return null; // relative (non-rooted) hrefs aren't the site's internal-link convention
}

/**
 * @param {{byUrl: Map, clusters: Map}} clusterData - from discoverClusters()
 * @param {object} page - a byUrl record: { rel, html, canonical, ownLang, alternates }
 * @returns {Array<{originalHref: string, rewrittenHref: string, matchIndex: number, context: string}>}
 */
function findRewriteCandidates({ byUrl, clusters }, page) {
  if (!page || !page.ownLang || page.ownLang === 'en') return [];

  const candidates = [];
  const html = page.html;
  ANCHOR_RE.lastIndex = 0;
  let m;
  while ((m = ANCHOR_RE.exec(html))) {
    const tag = m[0];
    const href = getAttr(tag, 'href');
    if (!href) continue;
    // A tag carrying its own hreflang attribute is a language-switcher /
    // explicit cross-locale pointer (e.g. the footer "EN" link on a
    // translated page), not a content link that should point locale-native —
    // it is SUPPOSED to point at the English version.
    if (getAttr(tag, 'hreflang')) continue;

    const resolved = resolveHref(href);
    if (!resolved || isHomepage(resolved)) continue;

    let pathname;
    try {
      pathname = new URL(resolved).pathname;
    } catch {
      continue;
    }
    if (!MONITORED_PREFIX_RE.test(pathname)) continue; // not a monitored section, or already locale-prefixed

    const targetRec = byUrl.get(resolved);
    if (!targetRec || targetRec.ownLang !== 'en') continue; // not a known EN canonical page

    const members = clusters.get(targetRec.canonical);
    if (!members) continue;

    let nativeMember = null;
    for (const memberUrl of members) {
      if (memberUrl === targetRec.canonical) continue;
      const memberRec = byUrl.get(memberUrl);
      if (memberRec && memberRec.ownLang === page.ownLang) {
        nativeMember = memberRec;
        break;
      }
    }
    if (!nativeMember) continue; // no locale-native equivalent exists yet — nothing to rewrite to

    let rewrittenHref;
    try {
      rewrittenHref = new URL(nativeMember.canonical).pathname;
    } catch {
      continue;
    }
    if (rewrittenHref === href || nativeMember.canonical === resolved) continue; // already correct

    candidates.push({
      originalHref: href,
      rewrittenHref,
      matchIndex: m.index,
      context: tag,
    });
  }

  return candidates;
}

module.exports = { findRewriteCandidates, isHomepage, MONITORED_PREFIX_RE, MONITORED_SECTIONS };
