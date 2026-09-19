#!/usr/bin/env node
'use strict';
/**
 * check-printable-tool-duplication.js — the enforcing half, diff-scoped.
 *
 * Fails a branch that makes two pages in one language offer the SAME
 * typed-word printable tool: same noun, same renderer, same font (see
 * lib/printable-tool-registry.js for why that is the signature).
 *
 * IT MEASURES THE DELTA, NOT THE STATE, for the reason CLAUDE.md gives for
 * check-locale-translation.js and check-faq-schema.js: the site already
 * carries legitimate collisions — the seven "in cursive" one-word spokes share
 * one surface deliberately, and the de/pl coloring pairs are waiting on a
 * locale decision — and a check that is red regardless of your change is one
 * people learn to ignore. A collision PAIR counts against a branch only if it
 * did not already exist at the merge base. Pre-existing pairs are reported,
 * never silenced.
 *
 * It catches both shapes the real regression could take:
 *   - a NEW page mounting a tool an existing page already owns;
 *   - an EXISTING page GAINING a mount (which is what actually happened on
 *     2026-09-13, when the alphabet coloring hub grew a name tool the
 *     Coloring Page Maker already owned).
 *
 * The fix is never to delete the older page: it is Hub-vs-Spoke Rule 3 —
 * whichever page owns the query keeps the tool, and the other one keeps a
 * one-line pointer to it. A genuinely intended pair goes in
 * data/printable_tool_duplication_exclusions.json with a reason, and that is a
 * discussed decision like every other ledger here, never a way to make a PR
 * pass.
 *
 * Usage:  node scripts/check-printable-tool-duplication.js [--base origin/main]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { globSync } = require('glob');
const reg = require('./lib/printable-tool-registry.js');

const REPO = path.resolve(__dirname, '..');
const LEDGER = path.join(REPO, 'data', 'printable_tool_duplication_exclusions.json');

const argv = process.argv.slice(2);
const baseArg = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

function mergeBase() {
  for (const ref of [baseArg, 'origin/main', 'origin/master', 'main', 'master'].filter(Boolean)) {
    try { return git('merge-base', 'HEAD', ref).trim(); } catch { /* try next */ }
  }
  return null;
}

function ledger() {
  if (!fs.existsSync(LEDGER)) return [];
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')).exceptions || []; }
  catch { return []; }
}

/** Pages on disk now. */
function pagesNow() {
  const out = [];
  for (const rel of globSync('**/index.html', { cwd: REPO, ignore: ['node_modules/**', 'scripts/**'] })) {
    const p = reg.readPage(rel, fs.readFileSync(path.join(REPO, rel), 'utf8'));
    if (p) out.push(p);
  }
  return out;
}

/**
 * Pages as of `rev`. Read through `git show` rather than a worktree so the
 * check needs no checkout and cannot disturb the tree it is validating.
 */
function pagesAt(rev) {
  // Narrow with one `git grep` before reading anything: 58 of the site's ~4,600
  // pages carry a typed-word mount, and `git show`-ing every file to find that
  // out costs ~20s per run. Any of the mount ids is enough to be a candidate;
  // readPage() still decides.
  const ids = Object.values(reg.WORD_SURFACES).map((v) => `id="${v}"`);
  let files;
  try {
    const args = ['grep', '-l', '-F'];
    for (const id of ids) args.push('-e', id);
    args.push(rev, '--', '*index.html');
    files = git(...args).split('\n')
      .map((l) => l.replace(new RegExp(`^${rev}:`), '').trim())
      .filter(Boolean);
  } catch {
    // `git grep` exits 1 when nothing matches; fall back to the full listing so
    // an empty result can never be mistaken for "no duplicates anywhere".
    files = git('ls-tree', '-r', '--name-only', rev).split('\n')
      .filter((f) => f.endsWith('index.html'));
  }
  files = files.filter((f) => !f.startsWith('node_modules/') && !f.startsWith('scripts/'));
  const out = [];
  for (const rel of files) {
    let html;
    try { html = git('show', `${rev}:${rel}`); } catch { continue; }
    const p = reg.readPage(rel, html);
    if (p) out.push(p);
  }
  return out;
}

function main() {
  const base = mergeBase();
  if (!base) {
    console.log('No merge base resolvable — skipping printable tool duplication check.');
    return;
  }

  const after = reg.collisionPairs(pagesNow());
  const before = reg.collisionPairs(pagesAt(base));
  const allowed = ledger();

  const introduced = [];
  const preexisting = [];
  for (const [key, info] of after) {
    if (before.has(key)) { preexisting.push([key, info]); continue; }
    const excused = allowed.some((e) => reg.pairKey(e.pages?.[0], e.pages?.[1]) === key);
    if (excused) { preexisting.push([key, info]); continue; }
    introduced.push([key, info]);
  }

  console.log('Printable tool duplication (diff-scoped)');
  console.log('='.repeat(72));
  console.log(`base ${base.slice(0, 12)} — ${before.size} pre-existing pair(s), ${after.size} now\n`);

  const resolved = [...before.keys()].filter((k) => !after.has(k));
  for (const k of resolved) console.log(`  resolved: ${k}`);
  if (resolved.length) console.log('');

  for (const [key, info] of preexisting) {
    console.log(`  pre-existing (reported, not billed): ${key}`);
    console.log(`      ${info.label}`);
  }
  if (preexisting.length) console.log('');

  if (!introduced.length) {
    console.log(`OK — this branch introduces no duplicated typed-word tool. (${preexisting.length} pre-existing)`);
    return;
  }

  console.log(`FAIL — this branch makes ${introduced.length} pair(s) of pages offer the same tool:\n`);
  for (const [key, info] of introduced) {
    console.log(`  ${key}`);
    console.log(`      ${info.label}`);
    console.log(`      ${info.a.route}  key=${info.a.key || '-'}  mounts=${info.a.mounts.join(',')}`);
    console.log(`      ${info.b.route}  key=${info.b.key || '-'}  mounts=${info.b.mounts.join(',')}`);
    console.log('');
  }
  console.log('Both pages render the same sheet from the same typed input, so they compete');
  console.log('for one query. Apply Hub-vs-Spoke Rule 3: the page that owns the query keeps');
  console.log('the tool, the other keeps a one-line pointer to it. Do not delete the older');
  console.log('page. If the pair is genuinely intended, that is a discussed decision recorded');
  console.log('in data/printable_tool_duplication_exclusions.json, never an entry added to');
  console.log('make this pass.');
  process.exitCode = 1;
}

main();
