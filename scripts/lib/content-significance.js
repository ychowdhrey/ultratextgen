'use strict';
/**
 * content-significance.js — "did this page meaningfully change?"
 *
 * Deliberately SEPARATE from content-fingerprint.js. That module is
 * language-INDEPENDENT on purpose: it compares an EN page against its
 * translations, so it ignores prose. Reusing it here would make every
 * translation fix invisible to <lastmod> — the exact opposite of what this
 * is for. Do not merge the two.
 *
 * Significant (bumps lastmod): visible text, <title>, H1, meta description,
 * the internal link set, and copy payloads (data-symbol/text/copy/char) —
 * anything a reader reads, pastes, or follows.
 *
 * Not significant (must NOT bump): aria-label and other a11y attributes,
 * hreflang <link> tags, canonical/OG/Twitter meta, JSON-LD, GTM/ad/consent
 * script tags, whitespace and comments.
 *
 * Encoded from a measured failure: on 2026-08-15/16 two cosmetic passes
 * (breadcrumb aria-labels, three template strings) bumped 2,533 pages'
 * lastmod without changing a word a reader could see.
 */

const crypto = require('crypto');

const COPY_ATTR_RE = /\bdata-(?:symbol|text|copy|char)="([^"]*)"/gi;
const HREF_RE      = /<a\s[^>]*href="(\/[^"#?]*)"/gi;
const TITLE_RE     = /<title>([\s\S]*?)<\/title>/i;
const H1_RE        = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i;
const DESC_RE      = /<meta\s+name="description"\s+content="([^"]*)"/i;

function visibleText(html) {
  let h = html;
  h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<head[\s\S]*?<\/head>/i, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  h = h.replace(/<[^>]+>/g, ' ');            // drops ALL attributes, incl. aria-label
  h = h.replace(/&[a-z#0-9]+;/gi, ' ');
  return h.replace(/\s+/g, ' ').trim();
}

function collect(re, html) {
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Stable short hash of everything that counts as a meaningful change. */
function significanceHash(html) {
  const parts = [
    visibleText(html),
    (TITLE_RE.exec(html) || ['', ''])[1].trim(),
    (H1_RE.exec(html)    || ['', ''])[1].replace(/<[^>]+>/g, '').trim(),
    (DESC_RE.exec(html)  || ['', ''])[1].trim(),
    collect(HREF_RE, html).sort().join('\n'),
    collect(COPY_ATTR_RE, html).sort().join('\n'),
  ];
  return crypto.createHash('sha1').update(parts.join(' ')).digest('hex').slice(0, 16);
}

module.exports = { significanceHash, visibleText };
