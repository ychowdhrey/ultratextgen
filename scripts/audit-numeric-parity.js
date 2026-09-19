#!/usr/bin/env node
'use strict';

/**
 * audit-numeric-parity.js — whole-site view of the axis check-numeric-parity
 * gates on a delta. Informational, never gating: locale pages legitimately
 * differ on some values, so this has a standing backlog by construction and a
 * permanently-red check is one people learn to ignore (see check-images).
 *
 * Reports, per hreflang cluster, salient slots where a locale sibling carries
 * a >=3-digit value its EN parent does not carry ANYWHERE in the same slot —
 * the shape of a fact that was corrected upstream and never propagated.
 *
 * Usage: node scripts/audit-numeric-parity.js [--full] [--locale <code>]
 */

const fs = require('fs');
const path = require('path');
const { slotNumbers } = require('./lib/numeric-parity.js');

const REPO = path.resolve(__dirname, '..');
const FULL = process.argv.includes('--full');
const LOC = process.argv.includes('--locale') ? process.argv[process.argv.indexOf('--locale') + 1] : null;
const CAT = (() => { try {
  return JSON.parse(fs.readFileSync(path.join(REPO, 'data/parity_catalogue_pages.json'), 'utf8')).cataloguePatterns || [];
} catch { return []; } })();
const isCat = (r) => CAT.includes(r.replace(/^[a-z]{2}(-[a-z]{2})?\//, ''));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(path.relative(REPO, p));
  }
  return out;
}

const files = walk(REPO).filter((f) => /^[a-z]{2}(-[a-z]{2})?\//.test(f) && !isCat(f));
const rows = [];
for (const f of files) {
  const lc = f.split('/')[0];
  if (LOC && lc !== LOC) continue;
  const html = fs.readFileSync(path.join(REPO, f), 'utf8');
  const m = html.match(/<link rel="alternate" hreflang="en" href="https:\/\/ultratextgen\.com\/([^"]*)"/);
  if (!m) continue;
  const en = (m[1].replace(/^\/+|\/+$/g, '') || 'index') + '/index.html';
  if (!fs.existsSync(path.join(REPO, en)) || isCat(en)) continue;
  const enSlots = slotNumbers(fs.readFileSync(path.join(REPO, en), 'utf8'));
  const loSlots = slotNumbers(html);
  const diffs = [];
  for (const [slot, have] of loSlots) {
    const enHave = enSlots.get(slot) || new Set();
    const only = [...have].filter((n) => n.length >= 3 && !enHave.has(n));
    if (only.length) diffs.push(`<${slot}> ${only.join(',')}`);
  }
  if (diffs.length) rows.push({ f, lc, en, diffs });
}

const byLocale = new Map();
for (const r of rows) byLocale.set(r.lc, (byLocale.get(r.lc) || 0) + 1);
console.log(`numeric divergence — a locale slot carrying a 3+ digit value its EN parent's same slot does not\n`);
console.log(`${rows.length} page(s) across ${byLocale.size} locale(s)`);
console.log('  ' + [...byLocale.entries()].sort().map(([l, n]) => `${l}:${n}`).join('  '));
if (FULL) for (const r of rows) console.log(`\n  ${r.f}\n    vs ${r.en}\n    ${r.diffs.join('\n    ')}`);
else if (rows.length) console.log('\n  --full for the per-page detail.');
console.log('\nNot every row is a defect — a translation may legitimately localise or omit a figure.');
console.log('This is triage; check-numeric-parity.js is what gates, and only on a value this branch changed.');
