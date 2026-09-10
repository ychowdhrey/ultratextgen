#!/usr/bin/env node
'use strict';

/**
 * audit-link-rot.js — does every cited URL still load?
 *
 * INFORMATIONAL, NEVER GATING, and not wired into validate.yml. It depends on
 * the public internet, on hosts that rate-limit, and on whatever egress the
 * runner happens to have — a gate on that would go red for reasons no PR
 * author can fix, which is the failure CLAUDE.md documents for check:images.
 * There is deliberately no check-link-rot.js counterpart.
 *
 * It reads the citation inventory from scripts/lib/source-attribution.js, so
 * "what counts as a citation" has exactly one definition site-wide, and folds
 * each run into data/source_link_health.json via scripts/lib/link-health.js,
 * which owns classification and the rot threshold.
 *
 * Usage:
 *   npm run audit:link-rot                 # fetch, update the ledger, report
 *   npm run audit:link-rot -- --dry-run    # list what would be fetched
 *   npm run audit:link-rot -- --no-write   # fetch and report, leave ledger alone
 *   npm run audit:link-rot -- --only unicode.org   # one host
 *   npm run audit:link-rot -- --json out.json
 */

const fs = require('fs');
const path = require('path');
const S = require('./lib/source-attribution.js');
const H = require('./lib/link-health.js');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => (argv.indexOf(f) >= 0 ? argv[argv.indexOf(f) + 1] : null);

const DRY = has('--dry-run');
const WRITE = !has('--no-write') && !DRY;
const ONLY = val('--only');
const TIMEOUT = Number(val('--timeout') || 20000);
const UA = 'Mozilla/5.0 (compatible; UltraTextGenLinkCheck/1.0; +https://ultratextgen.com/)';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'assets') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(path.relative(S.REPO, p));
  }
  return out;
}

/** url -> [pages citing it]. Resource links are checked too: a dead "install
 *  this font" link is just as broken for the reader, even though it is not
 *  evidence and owes no Sources block. */
function inventory() {
  const map = new Map();
  for (const rel of walk(S.REPO)) {
    if (S.isExempt(rel)) continue;
    const body = S.bodyOf(fs.readFileSync(path.join(S.REPO, rel), 'utf8'));
    for (const c of S.citationLinks(body)) {
      if (ONLY && c.host !== ONLY) continue;
      if (!map.has(c.url)) map.set(c.url, []);
      const pages = map.get(c.url);
      if (!pages.includes(rel)) pages.push(rel);
    }
  }
  return map;
}

async function fetchOnce(url, method) {
  const ctl = AbortSignal.timeout(TIMEOUT);
  return fetch(url, { method, redirect: 'follow', signal: ctl, headers: { 'user-agent': UA } });
}

/** HEAD first, then GET. Many servers reject HEAD outright (405), and that is
 *  a property of the server, not of the link. */
async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetchOnce(url, method);
      if (method === 'HEAD' && (res.status === 405 || res.status === 501)) continue;
      return H.classify(res, null, url);
    } catch (err) {
      if (method === 'HEAD') continue;
      return H.classify(null, err, url);
    }
  }
  return { status: 'unreachable', detail: 'no method succeeded' };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const inv = inventory();
  const byHost = new Map();
  for (const [url, pages] of inv) {
    const host = S.hostOf(url);
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push([url, pages]);
  }

  console.log('LINK ROT AUDIT');
  console.log('='.repeat(72));
  console.log(`distinct cited URLs .......... ${inv.size}`);
  console.log(`distinct hosts ............... ${byHost.size}`);
  if (ONLY) console.log(`scoped to host ............... ${ONLY}`);

  if (DRY) {
    console.log('\n--dry-run: nothing fetched.\n');
    for (const [host, entries] of [...byHost].sort()) {
      console.log(`  ${host}  (${entries.length})`);
      for (const [url] of entries) console.log(`      ${url}`);
    }
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const ledger = H.loadLedger();
  const results = [];

  // One host at a time internally, several hosts in parallel: never more than
  // one in-flight request to any single source, which is the polite shape.
  await Promise.all([...byHost].map(async ([, entries]) => {
    for (const [url, pages] of entries) {
      const r = await probe(url);
      results.push([url, r, pages]);
      ledger.urls[url] = H.record(ledger.urls[url], r, today, pages);
      await sleep(400);
    }
  }));

  const counts = {};
  for (const [, r] of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log('');
  for (const k of ['ok', 'redirect', 'blocked', 'server', 'unreachable', 'gone']) {
    if (counts[k]) console.log(`${k.padEnd(12)} ${String(counts[k]).padStart(4)}`);
  }

  const redirects = results.filter(([, r]) => r.status === 'redirect');
  if (redirects.length) {
    console.log('\nMOVED — the citation still resolves, but not to the URL we cite');
    console.log('-'.repeat(72));
    for (const [url, r, pages] of redirects) {
      console.log(`  ${url}\n      -> ${r.finalUrl}\n      cited by ${pages.length} page(s), e.g. ${pages[0]}`);
    }
  }

  const rot = H.rotted(ledger);
  console.log('');
  if (rot.length) {
    console.log(`ROTTED — ${H.ROT_THRESHOLD}+ consecutive failing runs`);
    console.log('-'.repeat(72));
    for (const [url, e] of rot) {
      console.log(`  ${url}\n      ${e.lastStatus}${e.httpCode ? ` ${e.httpCode}` : ''} · ${e.consecutiveFailures} runs · last good ${e.lastGood || 'never'}`);
      for (const p of (e.citedBy || []).slice(0, 3)) console.log(`      cited by ${p}`);
    }
  } else {
    console.log(`No URL has failed ${H.ROT_THRESHOLD} consecutive runs. Nothing is reported as rotted.`);
  }

  const failingNow = results.filter(([, r]) => H.FAILING.has(r.status));
  if (failingNow.length) {
    console.log(`\n${failingNow.length} URL(s) failed THIS run but have not reached the threshold:`);
    for (const [url, r] of failingNow) {
      const e = ledger.urls[url];
      console.log(`  ${r.status}${r.httpCode ? ` ${r.httpCode}` : ''} (${e.consecutiveFailures}/${H.ROT_THRESHOLD})  ${url}`);
    }
    console.log('  A single failure is not a dead link — see scripts/lib/link-health.js.');
  }

  if (WRITE) {
    H.saveLedger(ledger);
    console.log(`\nLedger updated: data/source_link_health.json (${Object.keys(ledger.urls).length} URLs).`);
  } else {
    console.log('\n--no-write: ledger left unchanged.');
  }
  if (val('--json')) fs.writeFileSync(val('--json'), JSON.stringify(results.map(([url, r, pages]) => ({ url, ...r, citedBy: pages })), null, 2));
}

main().catch((e) => { console.error(e); process.exit(2); });
