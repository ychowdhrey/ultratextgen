#!/usr/bin/env node
'use strict';

/**
 * audit-functional-parity.js
 *
 * Whole-site, INFORMATIONAL dashboard of functional parity: for every hreflang
 * cluster (English-anchored, and English-less clusters against their registered
 * reference page), which sibling lacks a capability its reference page offers
 * (a tool module, an opt-in surface, a control, copy tiles). Shares
 * scripts/lib/functional-fingerprint.js with check-functional-parity.js, the
 * diff-scoped gate, so the dashboard and the gate define "missing" identically.
 *
 * The site carries functional parity debt, so this never fails on findings:
 * a gate that is red regardless of the change is a gate people learn to ignore
 * (.claude/rules/tooling-and-gates.md). It exits 2 (UNKNOWN) when it found no
 * clusters to compare, because "0 gaps" from a run that read nothing is not a
 * pass.
 *
 * Usage:
 *   node scripts/audit-functional-parity.js                 # summary
 *   node scripts/audit-functional-parity.js --json out.json # also write every pair
 *   node scripts/audit-functional-parity.js --locale ko     # one locale's pairs
 *   node scripts/audit-functional-parity.js --compare <url|path> <url|path>
 *       print one JSON diff of two arbitrary pages (any clusters). Used to check
 *       that a broader page really carries the functionality of the job it is
 *       claimed to serve (a fold), not just its words.
 *
 * Exit: 0 report written · 2 UNKNOWN (nothing compared / page not found).
 */

const fs = require('fs');
const path = require('path');
const { discoverClusters, normalizeUrl } = require('./lib/translation-clusters');
const { buildIntentModel } = require('./lib/intent-clusters');
const ff = require('./lib/functional-fingerprint');
const { loadExceptions, createExceptionResolver, EXCEPTIONS_PATH } = require('./lib/parity-exceptions');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};

function toUrl(x) {
  const s = String(x || '');
  if (/^https?:\/\//.test(s)) return normalizeUrl(s);
  const p = s.replace(/^\/+/, '').replace(/\/?index\.html$/, '').replace(/\/+$/, '');
  return normalizeUrl(`https://ultratextgen.com/${p}${p ? '/' : ''}`);
}

function compareMode(a, b) {
  const read = (x) => {
    const url = toUrl(x);
    const rel = url.replace(/^https:\/\/ultratextgen\.com\/?/, '').replace(/\/+$/, '');
    const file = path.join(ROOT, rel ? `${rel}/index.html` : 'index.html');
    if (!fs.existsSync(file)) return { url, file, fp: null };
    return { url, file, fp: ff.functionalFingerprint(fs.readFileSync(file, 'utf8')) };
  };
  const A = read(a);
  const B = read(b);
  if (!A.fp || !B.fp) {
    const missing = [A, B].filter((x) => !x.fp).map((x) => path.relative(ROOT, x.file));
    process.stdout.write(JSON.stringify({ status: 'unknown', reason: `page not found: ${missing.join(', ')}` }) + '\n');
    process.exit(2);
  }
  const d = ff.diffFunctional(A.fp, B.fp);
  process.stdout.write(JSON.stringify({
    status: 'ok', reference: A.url, other: B.url,
    referenceCapabilities: A.fp.capabilities, otherCapabilities: B.fp.capabilities,
    missing: d.missing, added: d.added, covers: d.missing.length === 0,
  }, null, 1) + '\n');
  process.exit(0);
}

function main() {
  const cmpIdx = args.indexOf('--compare');
  if (cmpIdx !== -1) return compareMode(args[cmpIdx + 1], args[cmpIdx + 2]);
  const jsonPath = opt('--json');
  const onlyLocale = opt('--locale');

  const discovered = discoverClusters(ROOT);
  const { byUrl, clusters } = discovered;
  const model = buildIntentModel(ROOT, { discovered });
  for (const c of model.clusters.values()) {
    if (c.enUrl || c.members.length < 2 || clusters.has(c.representative)) continue;
    clusters.set(c.representative, new Set(c.members));
  }
  const { findException } = createExceptionResolver(loadExceptions(EXCEPTIONS_PATH));

  const fpCache = new Map();
  const fpOf = (u) => {
    if (!fpCache.has(u)) {
      const r = byUrl.get(u);
      fpCache.set(u, r ? ff.functionalFingerprint(r.html) : null);
    }
    return fpCache.get(u);
  };

  const pairs = [];
  let compared = 0;
  const byCap = new Map();
  const byLocale = new Map();
  for (const [refUrl, members] of clusters) {
    const ref = fpOf(refUrl);
    if (!ref) continue;
    for (const u of members) {
      if (u === refUrl) continue;
      const rec = byUrl.get(u);
      const fp = fpOf(u);
      if (!rec || !fp) continue;
      const loc = String(rec.ownLang || '').toLowerCase();
      if (onlyLocale && loc !== onlyLocale.toLowerCase()) continue;
      compared++;
      const d = ff.diffFunctional(ref, fp);
      const ex = findException(refUrl, u);
      const missing = d.missing.filter((c) => !ff.functionalSuppressed(ex, c));
      const excused = d.missing.filter((c) => ff.functionalSuppressed(ex, c));
      if (!missing.length && !excused.length && !d.added.length) continue;
      pairs.push({ reference: refUrl, url: u, locale: loc, missing, excused, added: d.added });
      if (missing.length) byLocale.set(loc, (byLocale.get(loc) || 0) + 1);
      for (const c of missing) byCap.set(c, (byCap.get(c) || 0) + 1);
    }
  }

  const withGap = pairs.filter((p) => p.missing.length);
  console.log('Functional Parity Audit (informational)');
  console.log(`  pairs compared:                    ${compared}`);
  console.log(`  pairs missing a capability:        ${withGap.length}`);
  console.log(`  pairs with only local additions:   ${pairs.filter((p) => !p.missing.length && p.added.length).length}`);
  console.log(`  pairs excused by an exception:     ${pairs.filter((p) => p.excused.length).length}`);
  if (byLocale.size) {
    console.log('');
    console.log('Pairs missing a capability, by locale:');
    for (const [l, n] of [...byLocale].sort((a, b) => b[1] - a[1])) console.log(`  ${l.padEnd(6)} ${n}`);
    console.log('');
    console.log('Most-missed capabilities:');
    for (const [c, n] of [...byCap].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(5)}  ${c}`);
  }
  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ generated_by: 'scripts/audit-functional-parity.js', compared, pairs }, null, 1) + '\n');
    console.log(`\nJSON: ${jsonPath} (${pairs.length} pairs with any difference)`);
  }
  if (!compared) {
    console.log('\nUNKNOWN: no sibling pair was compared, so nothing above is a pass.');
    process.exit(2);
  }
  process.exit(0);
}

main();
