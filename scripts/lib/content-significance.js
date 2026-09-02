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
 * Significant (bumps lastmod): visible words, <title>, H1, meta description,
 * the internal link set the page's own body carries, and copy payloads
 * (data-symbol/text/copy/char) — anything a reader reads, pastes, or follows.
 *
 * Not significant (must NOT bump): aria-label and other a11y attributes,
 * hreflang <link> tags, canonical/OG/Twitter meta, JSON-LD, GTM/ad/consent
 * script tags, whitespace and comments — and, since 2026-09-02, two more:
 *
 *   - THE STATIC FOOTER BLOCK. It is generated site-wide from footer.js by
 *     scripts/build-static-footer.js and carries ~27 internal links. A change
 *     to it is a change to the site's chrome, never to the page. PR #790 added
 *     it to all 4,582 pages and the next sitemap run would have advanced every
 *     <lastmod> on the site at once, which is why the schedule was paused.
 *   - PUNCTUATION. An em dash becoming a colon, a full stop or a comma pair is
 *     a joint moving, not a word changing; the 2026-09-02 template-tier em-dash
 *     pass touched ~2,800 pages exactly that way. Punctuation (\p{P}) is
 *     stripped from visible text, <title>, H1 and meta description before
 *     hashing and the words are case-folded. Symbols (\p{S}) are kept, and copy
 *     payloads are hashed verbatim:
 *     on this site a currency sign, an arrow, a kaomoji IS the content.
 *
 * Measured on the tree pair 2026-08-20 (last sitemap run) → 2026-09-02, 4,576
 * URLs: the old hash would advance 4,576; footer excluded, 3,236; footer
 * excluded and punctuation-blind, see the number recorded in
 * .github/workflows/update-sitemap.yml — and those remaining are real changes
 * a reader can see: translations landed, sections added, hubs pre-rendered,
 * tone rewrites.
 *
 * Encoded from a measured failure: on 2026-08-15/16 two cosmetic passes
 * (breadcrumb aria-labels, three template strings) bumped 2,533 pages'
 * lastmod without changing a word a reader could see.
 *
 * WHEN THIS FILE CHANGES WHAT IT HASHES, RE-BASELINE THE CACHE. The stored
 * hashes in data/sitemap-lastmod-cache.json were made by the previous
 * function, so the next run would read every URL as changed — the exact
 * failure the cache exists to prevent. Run
 *   node scripts/rebaseline-sitemap-lastmod-cache.js <commit-of-last-sitemap-run>
 * and commit the result with the change.
 */

const crypto = require('crypto');

const COPY_ATTR_RE = /\bdata-(?:symbol|text|copy|char)="([^"]*)"/gi;
const HREF_RE      = /<a\s[^>]*href="(\/[^"#?]*)"/gi;
const TITLE_RE     = /<title>([\s\S]*?)<\/title>/i;
const H1_RE        = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i;
const DESC_RE      = /<meta\s+name="description"\s+content="([^"]*)"/i;
/** The block scripts/build-static-footer.js writes, markers included. */
const STATIC_FOOTER_RE = /<!--\s*BEGIN static footer\b[\s\S]*?<!--\s*END static footer\b[^>]*-->/i;

/** Drop the generated static footer so site-wide chrome never dates a page. */
function stripStaticFooter(html) {
  return html.replace(STATIC_FOOTER_RE, ' ');
}

/**
 * Words only, case-folded: punctuation becomes whitespace, symbols and letters
 * survive. Case is folded because the em-dash remedy "a full stop where it is
 * a separate thought" capitalises the next word, and a reader does not meet a
 * capital letter as new content.
 */
function normalizeText(s) {
  return (s || '').replace(/\p{P}/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

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
  const body = stripStaticFooter(html);
  const parts = [
    normalizeText(visibleText(body)),
    normalizeText((TITLE_RE.exec(html) || ['', ''])[1]),
    normalizeText((H1_RE.exec(body)    || ['', ''])[1].replace(/<[^>]+>/g, '')),
    normalizeText((DESC_RE.exec(html)  || ['', ''])[1]),
    collect(HREF_RE, body).sort().join('\n'),
    collect(COPY_ATTR_RE, body).sort().join('\n'),
  ];
  return crypto.createHash('sha1').update(parts.join(' ')).digest('hex').slice(0, 16);
}

/**
 * Given a page's history as (hash, date) pairs NEWEST FIRST, return the date of
 * the newest commit that actually changed the hash — not the newest commit that
 * touched the file. A mesh pass, a footer rebuild or a template fix that lands
 * after the real edit must not re-date it. If no pair differs, the oldest entry
 * is where the page appeared (or where the walk was capped), so its date is the
 * best honest answer. Pure; tested directly.
 */
function pickSignificantDate(entries) {
  if (!entries || !entries.length) return null;
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].hash !== entries[i + 1].hash) return entries[i].date;
  }
  return entries[entries.length - 1].date;
}

module.exports = { significanceHash, visibleText, normalizeText, stripStaticFooter, pickSignificantDate, STATIC_FOOTER_RE };
