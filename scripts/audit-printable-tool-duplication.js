#!/usr/bin/env node
'use strict';
/**
 * audit-printable-tool-duplication.js — whole-site dashboard.
 *
 * Lists every group of pages that offer the SAME typed-word printable tool in
 * the same language: same noun, same renderer, same font. Two pages in one
 * group produce the same sheet from the same input, so at most one of them
 * should be targeting that query (Hub-vs-Spoke Rule 3).
 *
 * INFORMATIONAL, NEVER GATING — the site carries a real standing backlog of
 * these (the seven "in cursive" spokes share one surface by design, and the
 * de/pl coloring pairs are awaiting a locale decision), and CLAUDE.md is
 * explicit that a permanently-red check is one people learn to ignore. The
 * enforcing half is check-printable-tool-duplication.js, which is diff-scoped
 * and therefore has no backlog to be red against.
 *
 * Usage:
 *   node scripts/audit-printable-tool-duplication.js [--full] [--locale de] [--json out.json]
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const reg = require('./lib/printable-tool-registry.js');

const REPO = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);

function allPages() {
  const files = globSync('**/index.html', {
    cwd: REPO,
    ignore: ['node_modules/**', 'scripts/**'],
  }).sort();
  const out = [];
  for (const rel of files) {
    const html = fs.readFileSync(path.join(REPO, rel), 'utf8');
    const p = reg.readPage(rel, html);
    if (p) out.push(p);
  }
  return out;
}

function main() {
  const localeFilter = value('--locale');
  let pages = allPages();
  const total = pages.length;
  if (localeFilter) pages = pages.filter((p) => p.locale === localeFilter);

  const groups = reg.collisions(pages);
  const duplicated = groups.reduce((n, g) => n + g.pages.length, 0);

  console.log('Printable tool duplication');
  console.log('='.repeat(72));
  console.log(`${total} page(s) offer a typed-word printable surface`
    + (localeFilter ? ` (showing locale ${localeFilter}: ${pages.length})` : ''));
  console.log(`${groups.length} collision group(s), ${duplicated} page(s) involved\n`);

  for (const g of groups) {
    console.log(g.label);
    for (const p of g.pages) {
      console.log(`    ${p.route.padEnd(50)} key=${(p.key || '-').padEnd(30)} mounts=${p.mounts.join(',')}`);
    }
    console.log('');
  }

  if (flag('--full')) {
    console.log('\nEvery typed-word surface on the site');
    console.log('-'.repeat(72));
    for (const p of pages.slice().sort((a, b) => a.route.localeCompare(b.route))) {
      console.log(`${p.route.padEnd(50)} ${reg.describeSignature(p)} mounts=${p.mounts.join(',')}`);
    }
  }

  const out = value('--json');
  if (out) {
    fs.writeFileSync(out, `${JSON.stringify({
      generated: new Date().toISOString().slice(0, 10),
      total,
      groups: groups.map((g) => ({ label: g.label, pages: g.pages })),
      pages,
    }, null, 2)}\n`);
    console.log(`\nwrote ${out}`);
  }

  if (!groups.length) console.log('No duplicated typed-word tools.');
  // Informational by construction: never a non-zero exit.
}

main();
