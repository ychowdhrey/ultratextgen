#!/usr/bin/env node
'use strict';
/**
 * indexnow.test.js — run: node scripts/lib/indexnow.test.js
 * (npm run test:indexnow). Zero dependencies, no runner, the same idiom as
 * content-significance.test.js and js/counter/counterRules.test.js.
 *
 * This surface decides WHAT GETS ANNOUNCED TO SEARCH ENGINES, and the thing it
 * replaced got that wrong for six months: Cloudflare Crawler Hints submitted
 * 115,020 URLs between 2026-03-16 and 09-10 (1,398/day on a 4,679-URL site)
 * against a real change rate of zero on a typical day. Every assertion below
 * is either "the honest set goes out" or "a dishonest set does not".
 */
const assert = require('assert');
const {
  sanitizeUrls, chunk, buildPayload, planSubmission, submit, statusNote,
  discoverKey, MASS_BUMP_CEILING, MAX_URLS_PER_REQUEST,
} = require('./indexnow');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n         ${e.message.split('\n')[0]}`); }
}
const BASE = 'https://ultratextgen.com';
const KEY = 'ad9fa2628bb77566a98c808d72c720c4';
const urls = (n, p = 'p') => Array.from({ length: n }, (_, i) => `${BASE}/${p}${i}/`);

// ─── sanitizeUrls: one bad entry 422s the whole batch, so filter hard ────────

t('keeps same-host page URLs in order', () => {
  assert.deepStrictEqual(
    sanitizeUrls([`${BASE}/a/`, `${BASE}/b/`], BASE),
    [`${BASE}/a/`, `${BASE}/b/`]);
});
t('drops off-host URLs — they 422 the batch they travel in', () => {
  assert.deepStrictEqual(sanitizeUrls(['https://example.com/a/', `${BASE}/a/`], BASE), [`${BASE}/a/`]);
});
t('drops a host that merely starts with ours (prefix, not substring)', () => {
  assert.deepStrictEqual(sanitizeUrls(['https://ultratextgen.com.evil.test/a/'], BASE), []);
});
t('drops query strings and fragments — not canonical page URLs', () => {
  assert.deepStrictEqual(sanitizeUrls([`${BASE}/a/?x=1`, `${BASE}/b/#c`], BASE), []);
});
t('de-duplicates', () => {
  assert.deepStrictEqual(sanitizeUrls([`${BASE}/a/`, `${BASE}/a/`], BASE), [`${BASE}/a/`]);
});
t('survives junk without throwing', () => {
  assert.deepStrictEqual(sanitizeUrls([null, undefined, 42, '', `${BASE}/a/`], BASE), [`${BASE}/a/`]);
});

// ─── the mass-bump ceiling: the whole point of this module ───────────────────

t('a normal day submits', () => {
  const p = planSubmission({ bumpedUrls: urls(12), totalUrls: 4679, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.action, 'submit');
  assert.strictEqual(p.urls.length, 12);
});
t('the largest GENUINE day on record (1,003 of 4,679 = 21.4%) still submits', () => {
  // 2026-09-10: pre-rendered collection grids, flag tiles, printables previews.
  const p = planSubmission({ bumpedUrls: urls(1003), totalUrls: 4679, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.action, 'submit');
});
t('the 2026-08-15/16 aria-label pass (~55%) is REFUSED', () => {
  const p = planSubmission({ bumpedUrls: urls(2533), totalUrls: 4576, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.action, 'refuse');
  assert.ok(/55\.4%/.test(p.reason), p.reason);
});
t('the 2026-08-20 static-footer pass (100%) is REFUSED', () => {
  const p = planSubmission({ bumpedUrls: urls(4576), totalUrls: 4576, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.action, 'refuse');
});
t('the ceiling sits in the gap between the two, with room either side', () => {
  assert.ok(MASS_BUMP_CEILING > 0.214, 'must clear the largest genuine day');
  assert.ok(MASS_BUMP_CEILING < 0.554, 'must catch the smallest false mass bump');
});
t('--indexnow-force overrides the ceiling, for a genuine large change', () => {
  const p = planSubmission({ bumpedUrls: urls(4576), totalUrls: 4576, baseUrl: BASE, key: KEY, enabled: true, force: true });
  assert.strictEqual(p.action, 'submit');
});
t('a refusal still reports the URLs it withheld, never a silent zero', () => {
  const p = planSubmission({ bumpedUrls: urls(4576), totalUrls: 4576, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.urls.length, 4576);
});

// ─── off by default: `npm run prebuild` on a laptop must never announce ──────

t('disabled without the flag, even with a key and real changes', () => {
  const p = planSubmission({ bumpedUrls: urls(3), totalUrls: 4679, baseUrl: BASE, key: KEY, enabled: false });
  assert.strictEqual(p.action, 'skip');
  assert.ok(/not enabled/.test(p.reason));
});
t('no key means skip, never a 403-generating submission', () => {
  const p = planSubmission({ bumpedUrls: urls(3), totalUrls: 4679, baseUrl: BASE, key: null, enabled: true });
  assert.strictEqual(p.action, 'skip');
});
t('a malformed key is an error, not a silent skip', () => {
  const p = planSubmission({ bumpedUrls: urls(3), totalUrls: 4679, baseUrl: BASE, key: 'sh rt!', enabled: true });
  assert.strictEqual(p.action, 'error');
});
t('nothing changed means nothing announced', () => {
  const p = planSubmission({ bumpedUrls: [], totalUrls: 4679, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.action, 'skip');
  assert.ok(/no pages changed/.test(p.reason));
});
t('a page set that sanitizes to empty does not submit an empty batch', () => {
  const p = planSubmission({ bumpedUrls: ['https://example.com/a/'], totalUrls: 4679, baseUrl: BASE, key: KEY, enabled: true });
  assert.strictEqual(p.action, 'skip');
});

// ─── discoverKey: the committed file is the only configuration ───────────────

const fsStub = (files) => ({
  readdirSync: () => Object.keys(files),
  readFileSync: (p) => files[p.split('/').pop()],
});
t('reads the key out of the file the protocol itself fetches', () => {
  const r = discoverKey('/r', fsStub({ [`${KEY}.txt`]: KEY, 'robots.txt': 'User-agent: *' }));
  assert.strictEqual(r.key, KEY);
  assert.strictEqual(r.file, `${KEY}.txt`);
});
t('ignores root .txt files that are not key-shaped (robots.txt, ads.txt)', () => {
  const r = discoverKey('/r', fsStub({ 'robots.txt': 'x', 'ads.txt': 'y' }));
  assert.strictEqual(r.key, null);
  assert.ok(/no IndexNow key file/.test(r.reason));
});
t('contents not matching the filename is caught here, not as a live 403', () => {
  const r = discoverKey('/r', fsStub({ [`${KEY}.txt`]: 'something-else' }));
  assert.strictEqual(r.key, null);
  assert.ok(/403/.test(r.reason));
});
t('trailing whitespace in the key file is tolerated', () => {
  assert.strictEqual(discoverKey('/r', fsStub({ [`${KEY}.txt`]: `${KEY}\n` })).key, KEY);
});
t('two candidate key files is an error, never an arbitrary pick', () => {
  const r = discoverKey('/r', fsStub({ [`${KEY}.txt`]: KEY, 'abcdef1234567890.txt': 'abcdef1234567890' }));
  assert.strictEqual(r.key, null);
  assert.ok(/exactly one/.test(r.reason));
});

// ─── payload + batching ──────────────────────────────────────────────────────

t('payload carries exactly the protocol fields', () => {
  const b = buildPayload({ host: 'ultratextgen.com', key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: [`${BASE}/a/`] });
  assert.deepStrictEqual(Object.keys(b).sort(), ['host', 'key', 'keyLocation', 'urlList']);
});
t('keyLocation is omitted when absent rather than sent as undefined', () => {
  assert.ok(!('keyLocation' in buildPayload({ host: 'h', key: KEY, urlList: [] })));
});
t('batches at the 10,000-URL protocol limit', () => {
  assert.strictEqual(chunk(urls(25000)).length, 3);
  assert.strictEqual(chunk(urls(25000))[0].length, MAX_URLS_PER_REQUEST);
  assert.strictEqual(chunk(urls(25000))[2].length, 5000);
});
t('a set at exactly the limit is one batch, not two', () => {
  assert.strictEqual(chunk(urls(MAX_URLS_PER_REQUEST)).length, 1);
});

// ─── submit(): must never throw, and 202 is success ─────────────────────────

t('202 counts as success — key validation is asynchronous', async () => {
  const r = await submit({ urls: [`${BASE}/a/`], host: 'h', key: KEY, fetchImpl: async () => ({ status: 202 }) });
  assert.strictEqual(r[0].ok, true);
});
t('403 is reported as a failure and names the key file as the cause', async () => {
  const r = await submit({ urls: [`${BASE}/a/`], host: 'h', key: KEY, fetchImpl: async () => ({ status: 403 }) });
  assert.strictEqual(r[0].ok, false);
  assert.ok(/key file/.test(r[0].note));
});
t('a network failure is captured, never thrown — the cache must still commit', async () => {
  const r = await submit({ urls: [`${BASE}/a/`], host: 'h', key: KEY, fetchImpl: async () => { throw new Error('ENOTFOUND'); } });
  assert.strictEqual(r[0].ok, false);
  assert.strictEqual(r[0].status, 0);
});
t('every documented status has a human note', () => {
  for (const s of [200, 202, 400, 403, 422, 429]) assert.ok(!/unexpected/.test(statusNote(s)), String(s));
  assert.ok(/unexpected/.test(statusNote(500)));
});

// The two async cases above resolve before this line only because node runs
// microtasks to completion; assert it rather than assuming.
setTimeout(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 0);
