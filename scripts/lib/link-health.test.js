#!/usr/bin/env node
'use strict';

/**
 * link-health.test.js — the rot rules, tested without touching the network.
 *
 * The audit that fetches can never gate (see docs/source-attribution.md §10),
 * but the reasoning it applies to a fetch result has no backlog and no
 * external dependency, so THIS gates. Every case below is a shape that was
 * observed live while building the checker, not an invented one.
 *
 *   node scripts/lib/link-health.test.js
 */

const H = require('./link-health.js');

let pass = 0;
const fails = [];
function ok(label, cond) { if (cond) pass++; else fails.push(label); }
function eq(label, got, want) {
  ok(`${label} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, JSON.stringify(got) === JSON.stringify(want));
}

// ── the threshold itself, pinned to a VALUE ───────────────────────────────
// Asserted absolutely, not as `>= H.ROT_THRESHOLD`. Every other check here
// referenced the constant, so lowering it to 1 — the precise change that would
// have reported the live Roblox Terms-of-Service citation as dead, after one
// 404 among three 403s — left the whole suite green. A test that moves with
// the bug it exists to catch is not a test. Changing this number is a
// deliberate decision and must break this line.
eq('ROT_THRESHOLD is 3', H.ROT_THRESHOLD, 3);

// ── classification, by cause ───────────────────────────────────────────────
const cls = (status, url = 'https://x.test/p', finalUrl) =>
  H.classify({ status, url: finalUrl || url }, null, url).status;

eq('200 is ok', cls(200), 'ok');
eq('204 is ok', cls(204), 'ok');
eq('404 is gone', cls(404), 'gone');
eq('410 is gone', cls(410), 'gone');
eq('403 is blocked', cls(403), 'blocked');
eq('429 is blocked', cls(429), 'blocked');
// The real cbo.gov.om response. 503 must NOT read as a dead link.
eq('503 is blocked, not gone', cls(503), 'blocked');
eq('500 is server', cls(500), 'server');
eq('DNS failure is unreachable',
  H.classify(null, Object.assign(new Error('x'), { cause: { code: 'ENOTFOUND' } }), 'https://x.test/').status,
  'unreachable');

// ── redirect noise vs a real move ──────────────────────────────────────────
ok('trailing slash is not a move', !H.isMeaningfulRedirect('https://a.test', 'https://a.test/'));
ok('bare root to region is not a move', !H.isMeaningfulRedirect('https://a.test', 'https://a.test/en-US/'));
ok('same path, slash only, is not a move', !H.isMeaningfulRedirect('https://a.test/d/', 'https://a.test/d'));
ok('a real path change is a move', H.isMeaningfulRedirect('https://a.test/old', 'https://a.test/new'));
ok('a host change is a move', H.isMeaningfulRedirect('https://a.test/x', 'https://b.test/x'));

// ── the streak: one bad fetch is never rot ─────────────────────────────────
const run = (entry, status, day, httpCode) =>
  H.record(entry, { status, httpCode }, day, ['p/index.html']);

// A URL that is genuinely gone, three runs running.
let e = null;
for (const [i, d] of ['2026-01-01', '2026-01-02', '2026-01-03'].entries()) {
  e = run(e, 'gone', d, 404);
  eq(`gone streak after run ${i + 1}`, e.consecutiveFailures, i + 1);
}
ok('3 consecutive gone reaches the threshold', e.consecutiveFailures >= H.ROT_THRESHOLD);
eq('never-good URL keeps lastGood null', e.lastGood, null);

// The real Roblox case: 404 once, then 403. Must NOT accumulate.
let r = run(null, 'gone', '2026-01-01', 404);
eq('roblox: first run counts', r.consecutiveFailures, 1);
r = run(r, 'blocked', '2026-01-02', 403);
eq('roblox: a blocked run RESETS the streak', r.consecutiveFailures, 0);
r = run(r, 'blocked', '2026-01-03', 403);
eq('roblox: still zero', r.consecutiveFailures, 0);

// blocked must never move lastGood — a URL blocked for a year is not healthy.
let b = run(null, 'ok', '2026-01-01', 200);
eq('ok sets lastGood', b.lastGood, '2026-01-01');
b = run(b, 'blocked', '2026-06-01', 503);
eq('blocked leaves lastGood where it was', b.lastGood, '2026-01-01');
b = run(b, 'unreachable', '2026-07-01');
eq('unreachable leaves lastGood where it was', b.lastGood, '2026-01-01');

// A recovery clears the streak.
let c = run(run(null, 'server', '2026-01-01', 502), 'server', '2026-01-02', 502);
eq('two server failures accumulate', c.consecutiveFailures, 2);
c = run(c, 'ok', '2026-01-03', 200);
eq('a success clears the streak', c.consecutiveFailures, 0);
eq('a success moves lastGood', c.lastGood, '2026-01-03');

// redirect counts as reachable: it resolves, it just moved.
const rd = run(null, 'redirect', '2026-01-01', 200);
eq('redirect does not count as a failure', rd.consecutiveFailures, 0);
eq('redirect moves lastGood', rd.lastGood, '2026-01-01');

// ── rotted() only reports at the threshold ─────────────────────────────────
const ledger = { urls: {
  'https://a.test/gone': { consecutiveFailures: H.ROT_THRESHOLD, lastStatus: 'gone' },
  'https://a.test/nearly': { consecutiveFailures: H.ROT_THRESHOLD - 1, lastStatus: 'gone' },
  'https://a.test/blocked': { consecutiveFailures: 0, lastStatus: 'blocked' },
} };
eq('only the URL at the threshold is reported', H.rotted(ledger).map(([u]) => u), ['https://a.test/gone']);

// The Roblox sequence, run through rotted() at the real threshold: a 404
// followed by 403s must never be reported, however many runs accumulate.
const roblox = { urls: { 'https://help.test/a': run(run(run(null, 'gone', 'd1', 404), 'blocked', 'd2', 403), 'blocked', 'd3', 403) } };
eq('404-then-403 is never reported as rotted', H.rotted(roblox).length, 0);

console.log(`link-health: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
