'use strict';

/**
 * translation-clusters.js
 *
 * Shared hreflang-cluster discovery, used by both
 * scripts/audit-translation-parity.js (point-in-time site-wide audit) and
 * scripts/check-translation-parity.js (per-PR diff gate). Kept in one place
 * so the two scripts can never silently disagree on what counts as a
 * cluster, a locale, or an EN anchor.
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

function shouldSkip(root, filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (rel === '_root.html') return true;
  const segments = rel.split('/');
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (SKIP_SEGMENTS.includes(lower)) return true;
    if (SKIP_DIRS.includes(lower)) return true;
    if (/\.(test|demo|widget|embed)\b/i.test(seg)) return true;
  }
  return false;
}

function getAttr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i'));
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

function normalizeUrl(url) {
  if (!url) return url;
  return url.trim().replace(/^http:/, 'https:').replace(/\/+$/, '/');
}

function extractLinks(html) {
  let canonical = null;
  const alternates = [];
  const tagRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    const rel = (getAttr(tag, 'rel') || '').toLowerCase();
    const href = getAttr(tag, 'href');
    if (!href) continue;
    if (rel === 'canonical') canonical = href;
    else if (rel === 'alternate') {
      const hreflang = getAttr(tag, 'hreflang');
      if (hreflang) alternates.push({ hreflang, href });
    }
  }
  return { canonical, alternates };
}

/**
 * Scan every HTML file under `root` and return { byUrl, clusters, localeCodes }.
 *   byUrl:       normalized canonical URL -> { rel, filePath, canonical, alternates, ownLang, html }
 *   clusters:    EN canonical URL -> Set of member canonical URLs (includes the EN URL itself)
 *   localeCodes: Set of every non-"en" hreflang code seen on a self-referencing <link>
 */
function discoverClusters(root) {
  const files = globSync('**/*.html', { cwd: root, absolute: true }).filter((f) => !shouldSkip(root, f));

  const byUrl = new Map();
  const localeCodes = new Set();

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf8');
    const { canonical, alternates } = extractLinks(html);
    if (!canonical) continue;

    const canon = normalizeUrl(canonical);
    const alts = alternates.map((a) => ({ hreflang: a.hreflang, href: normalizeUrl(a.href) }));
    const selfEntry = alts.find((a) => a.href === canon && a.hreflang !== 'x-default');
    const ownLang = selfEntry ? selfEntry.hreflang : null;
    if (ownLang && ownLang !== 'en') localeCodes.add(ownLang.toLowerCase());

    byUrl.set(canon, { rel, filePath: file, canonical: canon, alternates: alts, ownLang, html });
  }

  const clusters = new Map();
  for (const [url, rec] of byUrl) {
    let anchor = null;
    if (rec.ownLang === 'en') {
      anchor = rec.canonical;
    } else {
      const enAlt = rec.alternates.find((a) => a.hreflang === 'en');
      if (enAlt) anchor = enAlt.href;
    }
    if (!anchor) continue;
    if (!clusters.has(anchor)) clusters.set(anchor, new Set());
    clusters.get(anchor).add(url);
    clusters.get(anchor).add(anchor);
  }

  return { byUrl, clusters, localeCodes };
}

module.exports = { shouldSkip, getAttr, normalizeUrl, extractLinks, discoverClusters, SKIP_SEGMENTS, SKIP_DIRS };
