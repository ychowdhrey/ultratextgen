'use strict';
/**
 * indexnow.js — announce the URLs whose visible content actually changed.
 *
 * REPLACES CLOUDFLARE CRAWLER HINTS (decided 2026-09-13, user-directed).
 *
 * Crawler Hints was the site's IndexNow submitter from ~2026-03-16 and it
 * fires on CACHE state, not content. Measured from Bing Webmaster Tools'
 * own IndexNow coverage export (16 Mar → 10 Sep):
 *
 *     submitted 115,020 · crawled 7,792 (6.77%) · indexed 1
 *     recent rate 1,398 URLs/day against a 4,679-URL site
 *
 * That announces the whole site every 3.3 days. The real rate, from the
 * sitemap's own significance hash, is ZERO on a typical day and 1,003 on the
 * busiest day of the preceding month. Bing's July 2025 sitemap guidance is
 * explicit that inflating freshness signals backfires, because the engine
 * learns to discount a source whose claims do not predict real change — the
 * same reasoning behind <lastmod> accuracy, on the same engine, which is the
 * site's highest-RPM surface.
 *
 * update-sitemap.js already computes the honest answer as a side effect of
 * deciding which <lastmod> to advance: the `bumped` set. This submits exactly
 * that and nothing else.
 *
 * WHY THERE IS NO DEPLOY RACE. The nightly run announces pages whose content
 * changed in commits that merged EARLIER — Cloudflare deployed them when their
 * PR landed. The sitemap run is noticing the change, not shipping it, so a URL
 * is always live before it is announced.
 *
 * THE KEY IS PUBLIC BY DESIGN, not a leaked secret. IndexNow verifies
 * ownership by fetching `https://<host>/<key>.txt` and comparing its contents
 * to the submitted key, so the file MUST be world-readable and committed. It
 * grants nothing except the ability to submit URLs on this host, which is why
 * the protocol is content with it being visible.
 */

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10000; // protocol limit
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

/**
 * Refuse to announce a mass bump.
 *
 * Derived from this site's own runs, not picked: the largest GENUINE content
 * day on record is 2026-09-10 at 1,003 URLs (21.4% — pre-rendered collection
 * grids, flag tiles and printables previews), and the smallest FALSE mass bump
 * is the 2026-08-15/16 aria-label pass at ~55%, with the 2026-08-20 static
 * footer at 100%. 40% sits in the gap with room on both sides.
 *
 * A run over the cap still writes the sitemap — it just does not announce,
 * because a false mass bump is precisely the signal this module exists to stop
 * sending. It is reported loudly rather than skipped quietly.
 */
const MASS_BUMP_CEILING = 0.40;

/**
 * Only same-host https page URLs, de-duplicated, order preserved.
 *
 * Conservative on purpose: a malformed or off-host entry makes the whole
 * batch 422 (URLs don't match host), so one bad URL would silently cost the
 * announcement for every good one beside it.
 */
function sanitizeUrls(urls, baseUrl) {
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const seen = new Set();
  const out = [];
  for (const u of urls || []) {
    if (typeof u !== 'string') continue;
    const url = u.trim();
    if (!url.startsWith(prefix)) continue;
    if (url.includes('#') || url.includes('?')) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function chunk(arr, size = MAX_URLS_PER_REQUEST) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildPayload({ host, key, keyLocation, urlList }) {
  const body = { host, key, urlList };
  if (keyLocation) body.keyLocation = keyLocation;
  return body;
}

/**
 * The committed key file IS the configuration — there is no env var and no
 * second place to keep this in step.
 *
 * IndexNow verifies by fetching `https://<host>/<key>.txt` and comparing its
 * contents to the submitted key, so that file must exist and must match or
 * every submission 403s. Reading the key back out of it means the thing the
 * protocol checks and the thing we send cannot disagree, and rotating the key
 * is one file rename with no code change.
 *
 * Cloudflare Pages serves a root `.txt` directly at 200 — verified on
 * production 2026-09-13 against the existing `/ads.txt` and `/robots.txt`.
 * Note this holds for `.txt` and NOT for `.html`, which Pages 308s to its
 * extensionless form (the Naver verification token does exactly that), so do
 * not "tidy" this file to another extension.
 */
function discoverKey(rootDir, fs) {
  const candidates = fs.readdirSync(rootDir)
    .filter((f) => f.endsWith('.txt') && KEY_RE.test(f.slice(0, -4)));
  if (candidates.length === 0) return { key: null, reason: 'no IndexNow key file at the repo root' };
  if (candidates.length > 1) {
    return { key: null, reason: `several candidate key files at the repo root (${candidates.join(', ')}) — exactly one must exist` };
  }
  const file = candidates[0];
  const expected = file.slice(0, -4);
  const contents = fs.readFileSync(`${rootDir}/${file}`, 'utf8').trim();
  if (contents !== expected) {
    return { key: null, reason: `${file} must contain exactly its own filename stem; IndexNow will 403 otherwise` };
  }
  return { key: expected, file };
}

/**
 * What a run should do, decided before any network call is made so it can be
 * tested without one. Returns {action, reason, urls}.
 */
function planSubmission({ bumpedUrls, totalUrls, baseUrl, key, enabled, force = false }) {
  if (!enabled) return { action: 'skip', reason: 'not enabled (no --submit-indexnow flag)', urls: [] };
  if (!key) return { action: 'skip', reason: 'no key configured', urls: [] };
  if (!KEY_RE.test(key)) return { action: 'error', reason: `key must be 8-128 chars of [A-Za-z0-9-], got ${key.length}`, urls: [] };

  const urls = sanitizeUrls(bumpedUrls, baseUrl);
  if (!urls.length) return { action: 'skip', reason: 'no pages changed', urls: [] };

  if (!force && totalUrls > 0 && urls.length / totalUrls > MASS_BUMP_CEILING) {
    const pct = ((urls.length / totalUrls) * 100).toFixed(1);
    return {
      action: 'refuse',
      reason: `${urls.length} of ${totalUrls} URLs (${pct}%) exceeds the ${MASS_BUMP_CEILING * 100}% mass-bump ceiling — `
            + 'this looks like a template/mesh pass rather than real content change, so it is NOT being announced. '
            + 'If the change is genuine, re-run with --indexnow-force.',
      urls,
    };
  }
  return { action: 'submit', reason: `${urls.length} changed page(s)`, urls };
}

/**
 * POST each batch. Never throws and never exits non-zero: the sitemap and its
 * cache must still commit if IndexNow is unreachable, because losing the cache
 * makes the NEXT run read every URL as changed.
 */
async function submit({ urls, host, key, keyLocation, endpoint = INDEXNOW_ENDPOINT, fetchImpl = globalThis.fetch }) {
  const results = [];
  for (const batch of chunk(urls)) {
    const payload = buildPayload({ host, key, keyLocation, urlList: batch });
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      results.push({ ok: res.status === 200 || res.status === 202, status: res.status, count: batch.length, note: statusNote(res.status) });
    } catch (err) {
      results.push({ ok: false, status: 0, count: batch.length, note: `request failed: ${err.message}` });
    }
  }
  return results;
}

// 202 is a SUCCESS: the URLs are accepted and the key is validated
// asynchronously. Treating it as a failure would make every healthy run of a
// freshly-rotated key look broken.
function statusNote(status) {
  return {
    200: 'OK, submitted',
    202: 'Accepted, key validation pending',
    400: 'Bad request (malformed payload)',
    403: 'Forbidden — key file missing or does not match',
    422: 'Unprocessable — URLs do not match host, or key mismatch',
    429: 'Rate limited',
  }[status] || `unexpected status ${status}`;
}

module.exports = {
  INDEXNOW_ENDPOINT,
  MAX_URLS_PER_REQUEST,
  MASS_BUMP_CEILING,
  KEY_RE,
  discoverKey,
  sanitizeUrls,
  chunk,
  buildPayload,
  planSubmission,
  submit,
  statusNote,
};
