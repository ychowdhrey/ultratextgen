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
  backlogSince, planRun, BACKLOG_PER_RUN,
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
  const other = '0123456789abcdef0123456789abcdef';
  const r = discoverKey('/r', fsStub({ [`${KEY}.txt`]: KEY, [`${other}.txt`]: other }));
  assert.strictEqual(r.key, null);
  assert.ok(/exactly one/.test(r.reason));
});
// The site root as it stood from 2026-11-11: the key, Seznam's verification
// token (added 2026-10-04, which stopped every run from 2026-10-05) and Petal
// Search's, which contains its own stem exactly like a key does.
const ROOT_2026_11 = {
  [`${KEY}.txt`]: KEY,
  'seznam-wmt-OYYRrpCRT8ceh7oE7zNlN8u55zXFZyEW.txt': 'OYYRrpCRT8ceh7oE7zNlN8u55zXFZyEW',
  'ff044916b7.txt': 'ff044916b7',
  'robots.txt': 'User-agent: *',
  'ads.txt': 'google.com, pub-0, DIRECT',
  'llms.txt': '# UltraTextGen',
};
t('the real root: verification tokens beside the key do not stop discovery', () => {
  const r = discoverKey('/r', fsStub(ROOT_2026_11));
  assert.strictEqual(r.key, KEY, r.reason);
  assert.strictEqual(r.file, `${KEY}.txt`);
});
t('a self-named token that is not 32-hex (Petal) is never taken for the key', () => {
  const r = discoverKey('/r', fsStub({ 'ff044916b7.txt': 'ff044916b7' }));
  assert.strictEqual(r.key, null);
});
t('an uppercase or short hex stem is not the Bing-generated key form', () => {
  assert.strictEqual(discoverKey('/r', fsStub({ [`${KEY.toUpperCase()}.txt`]: KEY.toUpperCase() })).key, null);
  assert.strictEqual(discoverKey('/r', fsStub({ [`${KEY.slice(1)}.txt`]: KEY.slice(1) })).key, null);
});

// ─── backlogSince: what to catch up on after announcements stopped ──────────

{
  const announced = {
    '/a/': { hash: 'h1', lastmod: '2026-10-01' },
    '/b/': { hash: 'h1', lastmod: '2026-10-01' },
    '/c/': { hash: 'h1', lastmod: '2026-10-01' },
    '/gone/': { hash: 'h1', lastmod: '2026-10-01' },
  };
  const current = {
    '/a/': { hash: 'h2', lastmod: '2026-10-20' },   // changed
    '/b/': { hash: 'h1', lastmod: '2026-10-01' },   // unchanged
    '/c/': { hash: 'h9', lastmod: '2026-10-01' },   // re-baselined hash, no reader-visible change
    '/new/': { hash: 'h1', lastmod: '2026-10-07' }, // added after the last announcement
  };
  const live = ['/a/', '/b/', '/c/', '/new/'];
  t('backlog = lastmod advanced or page new, oldest change first', () => {
    assert.deepStrictEqual(backlogSince(announced, current, live, BASE), [`${BASE}/new/`, `${BASE}/a/`]);
  });
  t('a hash that moved without its lastmod (a re-baseline) is not a change', () => {
    assert.ok(!backlogSince(announced, current, live, BASE).includes(`${BASE}/c/`));
  });
  t('a page no longer live is not announced', () => {
    assert.ok(!backlogSince(announced, { ...current, '/gone/': { hash: 'x', lastmod: '2026-11-01' } }, live, BASE).includes(`${BASE}/gone/`));
  });
}

// ─── planRun: today's changes plus a bounded slice of the queue ─────────────

{
  const live = urls(4887).concat(urls(10, 'today'));
  const base = { liveUrls: live, totalUrls: live.length, baseUrl: BASE, key: KEY, enabled: true };
  t('a 4,368-page backlog drains BACKLOG_PER_RUN at a time, today first', () => {
    const p = planRun({ ...base, bumpedUrls: urls(10, 'today'), pending: urls(4368) });
    assert.strictEqual(p.action, 'submit');
    assert.strictEqual(p.urls.length, 10 + BACKLOG_PER_RUN);
    assert.deepStrictEqual(p.urls.slice(0, 10), urls(10, 'today'));
    assert.strictEqual(p.carry.length, 4368 - BACKLOG_PER_RUN);
    assert.strictEqual(p.carry[0], urls(4368)[BACKLOG_PER_RUN]);
  });
  t('no single run exceeds the mass-bump ceiling while draining', () => {
    const p = planRun({ ...base, bumpedUrls: [], pending: urls(4368) });
    assert.ok(p.urls.length / live.length <= MASS_BUMP_CEILING, String(p.urls.length));
  });
  t('the whole 4,368-page backlog is gone in five runs', () => {
    let q = urls(4368); let runs = 0;
    while (q.length) { q = planRun({ ...base, bumpedUrls: [], pending: q }).carry; runs++; }
    assert.strictEqual(runs, 5);
  });
  t('a page both changed today and queued is sent once', () => {
    const p = planRun({ ...base, bumpedUrls: [`${BASE}/p1/`], pending: [`${BASE}/p1/`, `${BASE}/p2/`] });
    assert.deepStrictEqual(p.urls, [`${BASE}/p1/`, `${BASE}/p2/`]);
  });
  t('a queued page that has since been deleted is dropped', () => {
    const p = planRun({ ...base, bumpedUrls: [], pending: [`${BASE}/deleted/`, `${BASE}/p1/`] });
    assert.deepStrictEqual(p.urls, [`${BASE}/p1/`]);
  });
  t('a mass bump today is still refused and not queued, but the backlog still drains', () => {
    const p = planRun({ ...base, bumpedUrls: urls(3000), pending: urls(5, 'today') });
    assert.strictEqual(p.action, 'submit');
    assert.deepStrictEqual(p.urls, urls(5, 'today'));
    assert.ok(p.refusedToday && /ceiling/.test(p.refusedToday));
    assert.deepStrictEqual(p.carry, []);
  });
  t('nothing changed and nothing queued is a skip with an empty carry', () => {
    const p = planRun({ ...base, bumpedUrls: [], pending: [] });
    assert.strictEqual(p.action, 'skip');
    assert.deepStrictEqual(p.carry, []);
  });
  t('not enabled leaves the queue untouched', () => {
    const p = planRun({ ...base, enabled: false, bumpedUrls: urls(3), pending: urls(7) });
    assert.strictEqual(p.action, 'skip');
    assert.strictEqual(p.carry.length, 7);
  });
}

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
