#!/usr/bin/env node
'use strict';

/**
 * audit-source-attribution.js — whole-site view of how the site cites.
 *
 * INFORMATIONAL, never gating. Same call as check:images and
 * audit:locale-parent-gap: the backlog this found on its first run (33 pages
 * citing with no Sources block) is real work that lands over more than one
 * PR, and a check that is red regardless of your change is one people learn
 * to ignore. scripts/check-source-attribution.js is the diff-scoped half
 * that gates.
 *
 * Usage:
 *   node scripts/audit-source-attribution.js [--full] [--locale <code>]
 *                                            [--json <path>] [--report <path>]
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib/source-attribution.js');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => (argv.indexOf(f) >= 0 ? argv[argv.indexOf(f) + 1] : null);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'assets') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(path.relative(L.REPO, p));
  }
  return out;
}

const only = val('--locale');
const pages = walk(L.REPO).sort().filter((p) => !only || L.localeOf(p) === only);

const rows = [];
for (const rel of pages) {
  const html = fs.readFileSync(path.join(L.REPO, rel), 'utf8');
  const r = L.inspect(rel, html);
  if (!r.citations.length && !(r.external||[]).length && !r.section) continue;
  rows.push(r);
}

const citing = rows.filter((r) => r.citations.length);
const withBlock = citing.filter((r) => r.section);
const noBlock = citing.filter((r) => !r.section && !r.exempt);
const badRel = rows.filter((r) => r.errors.some((e) => e.includes('rel=')));
const legacyLabel = rows.filter((r) => r.section && !r.section.canonical);
const unclassified = new Map();
for (const r of rows) { if (r.exempt) continue; for (const c of (r.external || r.citations)) if (!L.isClassified(c.url)) unclassified.set(c.host, (unclassified.get(c.host) || 0) + 1); }

const lines = [];
const say = (s = '') => { lines.push(s); console.log(s); };

say('SOURCE ATTRIBUTION AUDIT');
say('='.repeat(72));
say(`pages carrying an external citation .......... ${citing.length}`);
say(`  ...presenting them in a Sources block ...... ${withBlock.length}`);
say(`  ...with no Sources block .................... ${noBlock.length}`);
say(`total citations .............................. ${citing.reduce((n, r) => n + r.citations.length, 0)}`);
say(`pages with a non-canonical Sources label ..... ${legacyLabel.length}`);
say(`pages with a wrong rel on a citation ......... ${badRel.length}`);
say(`unclassified domains ......................... ${unclassified.size}`);

const byTier = { primary: 0, secondary: 0 };
for (const r of rows) { if (r.exempt) continue; for (const c of (r.external || [])) byTier[L.tierOf(c.url)]++; }
const resourceCount = rows.reduce((n, r) => n + (r.exempt ? 0 : (r.resources || []).length), 0);
say('');
say(`citations to PRIMARY sources (followed) ...... ${byTier.primary}`);
say(`citations to SECONDARY sources (nofollow) .... ${byTier.secondary}`);
say(`resource links (destinations, ledgered) ...... ${resourceCount}`);

if (noBlock.length) {
  say('');
  say('PAGES CITING WITH NO SOURCES BLOCK — the backlog');
  say('-'.repeat(72));
  const byLane = new Map();
  for (const r of noBlock) {
    const lane = r.relPath.includes('/') ? r.relPath.split('/').slice(0, r.locale === 'en' ? 1 : 2).join('/') : 'root';
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push(r);
  }
  for (const [lane, rs] of [...byLane].sort((a, b) => b[1].length - a[1].length)) {
    say(`  ${lane}  (${rs.length})`);
    for (const r of rs) say(`      ${r.relPath}  — ${r.citations.length} citation(s): ${[...new Set(r.citations.map((c) => c.host))].join(', ')}`);
  }
}

if (legacyLabel.length) {
  say('');
  say('NON-CANONICAL SOURCES LABELS');
  say('-'.repeat(72));
  for (const r of legacyLabel) say(`  ${r.relPath}  "${r.section.label}" -> "${L.LOCALE_LABELS[r.locale][0]}"`);
}

if (unclassified.size) {
  say('');
  say('DOMAINS NOT IN data/source_authority.json (treated as secondary)');
  say('-'.repeat(72));
  for (const [h, n] of [...unclassified].sort((a, b) => b[1] - a[1])) say(`  ${h}  (${n} citation(s))`);
}

if (has('--full')) {
  say('');
  say('EVERY CITATION');
  say('-'.repeat(72));
  for (const r of citing) {
    say(`  ${r.relPath}${r.section ? '' : '   [NO BLOCK]'}`);
    for (const c of r.citations) say(`      ${L.tierOf(c.url).padEnd(9)} ${c.host.padEnd(26)} rel="${c.rel || ''}"`);
  }
}

const problems = rows.filter((r) => r.errors.length);
say('');
say(`${problems.length} page(s) would fail the gate if they were in a PR's diff.`);

if (val('--json')) fs.writeFileSync(val('--json'), JSON.stringify(rows.map((r) => ({ ...r, citations: r.citations.map((c) => ({ url: c.url, host: c.host, rel: c.rel, tier: L.tierOf(c.url) })) })), null, 2));
if (val('--report')) fs.writeFileSync(val('--report'), `# Source attribution audit\n\n_Generated ${new Date().toISOString().slice(0, 10)} by \`npm run audit:source-attribution\`._\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
