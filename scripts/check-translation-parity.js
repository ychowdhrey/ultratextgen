#!/usr/bin/env node
'use strict';

/**
 * check-translation-parity.js
 *
 * Per-PR gate: for every HTML file changed in this branch, if the page is
 * part of an EN <-> locale hreflang cluster AND its structural content
 * fingerprint actually changed (a link/FAQ/section/symbol-tile added or
 * removed — not just a wording tweak), require that at least one sibling in
 * the same cluster (the EN parent, if a locale page changed; any locale
 * child, if the EN parent changed) was ALSO touched in this branch.
 *
 * This is the enforcement half of scripts/audit-translation-parity.js: the
 * audit finds existing drift across the whole site; this stops NEW drift
 * from being introduced, going both directions (EN -> locale and locale ->
 * EN), per CLAUDE.md's "Translation Parity" section.
 *
 * A flagged pair is not necessarily wrong — EN and a locale page are
 * allowed to diverge when there's an explicit, agreed reason. Record that
 * reason in data/translation_parity_exceptions.json (see its own comment
 * for the entry shape) rather than silencing this check by leaving the
 * sibling stale.
 *
 * Usage:
 *   node scripts/check-translation-parity.js                 # diff against origin/main
 *   node scripts/check-translation-parity.js --base main      # diff against a different ref
 *
 * Exit code 0 = clean (or nothing to check), 1 = unresolved drift found.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters } = require('./lib/translation-clusters');
const { createFingerprinter } = require('./lib/content-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const EXCEPTIONS_PATH = path.join(ROOT, 'data', 'translation_parity_exceptions.json');

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', base], { stdio: 'ignore' });
    return base;
  } catch {
    // Shallow CI checkouts often don't have the base branch locally at all.
    const branch = base.replace(/^origin\//, '');
    try {
      git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
      const candidate = `origin/${branch}`;
      git(['rev-parse', '--verify', candidate], { stdio: 'ignore' });
      return candidate;
    } catch (e) {
      console.error(`Could not resolve or fetch base ref "${base}": ${e.message}`);
      process.exit(2);
    }
  }
  return base;
}

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(2);
}

const changedFiles = git(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}`, 'HEAD', '--', '*.html'])
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

if (changedFiles.length === 0) {
  console.log('Translation Parity Check: no changed HTML files — nothing to check.');
  process.exit(0);
}

function oldContent(rel) {
  try {
    return git(['show', `${mergeBase}:${rel}`]);
  } catch {
    return null; // new file — no "before" to diff against
  }
}

// ─── Current site state (HEAD / working tree) ──────────────────────────────

const { byUrl, clusters, localeCodes } = discoverClusters(ROOT);
const { fingerprint, diff, score } = createFingerprinter(byUrl, localeCodes);

const changedSet = new Set(changedFiles);

// enUrl -> Set of member urls, for quick "which cluster is this page in" lookups
const clusterOf = new Map(); // canonical url -> en anchor url
for (const [enUrl, members] of clusters) {
  for (const m of members) clusterOf.set(m, enUrl);
}

// ─── Exceptions ledger ──────────────────────────────────────────────────

let exceptions = [];
if (fs.existsSync(EXCEPTIONS_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf8'));
    exceptions = Array.isArray(parsed) ? parsed : parsed.exceptions || [];
  } catch (e) {
    console.error(`WARNING: could not parse ${path.relative(ROOT, EXCEPTIONS_PATH)}: ${e.message}`);
  }
}

function hasException(enUrl, localeUrl) {
  return exceptions.some((ex) => ex.enUrl === enUrl && ex.localeUrl === localeUrl);
}

// ─── Check every changed page that belongs to a cluster ────────────────────

const flagged = []; // { enUrl, localeUrl, changedRel, unsyncedSiblingRels: [] }
const checkedPairs = new Set(); // dedupe: "enUrl|localeUrl"

for (const rel of changedFiles) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue; // deleted file
  const newHtml = fs.readFileSync(filePath, 'utf8');

  const rec = [...byUrl.values()].find((r) => r.rel === rel);
  if (!rec) continue; // not part of any hreflang-bearing page at all

  const enAnchor = clusterOf.get(rec.canonical);
  if (!enAnchor) continue; // no cluster info — not this check's job (see audit-hreflang.js)

  const before = oldContent(rel);
  const changedFingerprint = before === null || score(diff(fingerprint(before), fingerprint(newHtml))) > 0;
  if (!changedFingerprint) continue; // byte-level edit only (typo, meta tweak) — nothing structural moved

  const members = [...clusters.get(enAnchor)].filter((u) => u !== rec.canonical);

  // Per this file's header (and CLAUDE.md "Translation Parity"): a
  // structural change passes when AT LEAST ONE sibling in the cluster was
  // also touched in this branch — the EN parent for a locale-page change,
  // any sibling for an EN-parent change. (Bug fixed 2026-08-02: the loop
  // below used to flag every untouched (EN, locale) pair individually, so
  // an EN edit with one synced locale sibling still failed on the other
  // N-1 locales — a requirement neither the spec comment nor CLAUDE.md
  // states, and one that made any EN structural edit on a wide cluster
  // unshippable without touching every locale.)
  if (rec.canonical !== enAnchor) {
    // locale page changed — the sibling that must move with it is the EN parent
    const enRec = byUrl.get(enAnchor);
    if (!enRec) continue; // headless/broken — audit-hreflang.js's job
    const pairKey = `${enAnchor}|${rec.canonical}`;
    if (checkedPairs.has(pairKey)) continue;
    checkedPairs.add(pairKey);
    if (hasException(enAnchor, rec.canonical)) continue;
    if (changedSet.has(enRec.rel)) continue; // EN parent touched — presumed synced
    flagged.push({ enUrl: enAnchor, localeUrl: rec.canonical, enRel: enRec.rel, localeRel: rec.rel, changedRel: rel });
  } else {
    // EN parent changed — any touched locale sibling counts as the sync
    const siblingRecs = members.map((u) => ({ url: u, rec: byUrl.get(u) })).filter((s) => s.rec);
    if (siblingRecs.length === 0) continue;
    const nonExcepted = siblingRecs.filter((s) => !hasException(rec.canonical, s.url));
    if (nonExcepted.length === 0) continue; // every pair individually excepted
    if (nonExcepted.some((s) => changedSet.has(s.rec.rel))) continue; // at least one sibling synced
    for (const s of nonExcepted) {
      const pairKey = `${rec.canonical}|${s.url}`;
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);
      flagged.push({ enUrl: rec.canonical, localeUrl: s.url, enRel: rec.rel, localeRel: s.rec.rel, changedRel: rel });
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('Translation Parity Check');
console.log(`  base:                    ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed HTML files:      ${changedFiles.length}`);
console.log(`  pairs with unsynced content change: ${flagged.length}`);
console.log('');

if (flagged.length) {
  for (const f of flagged) {
    console.log(`✗ ${f.changedRel} changed content, but its translation sibling was not updated in this branch:`);
    console.log(`    EN:     ${f.enRel}`);
    console.log(`    locale: ${f.localeRel}`);
    console.log(
      `    Fix: update the sibling in this PR, or add an entry to data/translation_parity_exceptions.json` +
        ` documenting why they're allowed to diverge (see CLAUDE.md, "Translation Parity").`
    );
    console.log('');
  }
  process.exit(1);
} else {
  console.log('No unresolved translation-parity drift introduced by this branch.');
  process.exit(0);
}
