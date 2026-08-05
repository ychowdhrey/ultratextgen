#!/usr/bin/env node
'use strict';

/**
 * check-locale-mesh.js
 *
 * Per-PR gate: for every HTML file ADDED or CHANGED in this branch that is a
 * locale page (path starts with one of the canonical locale codes) and is
 * part of an hreflang cluster, requires:
 *
 *   (a) its cluster has no non-reciprocal or headless member — same
 *       detection logic as scripts/audit-hreflang.js (broken/non-reciprocal/
 *       headless pairs), scoped to just this file's own cluster instead of
 *       the whole site;
 *   (b) scripts/lib/locale-link-rewrite.js finds no un-rewritten English-hub
 *       link on this file — i.e. `npm run sync:locale-mesh -- --fix` was run
 *       before pushing.
 *
 * This is the enforcement half of scripts/sync-locale-mesh.js, the same way
 * check-translation-parity.js enforces what audit-translation-parity.js
 * would otherwise only ever discover after the fact.
 *
 * Usage:
 *   node scripts/check-locale-mesh.js                 # diff against origin/main
 *   node scripts/check-locale-mesh.js --base main      # diff against a different ref
 *
 * Exit code 0 = clean (or nothing to check), 1 = a mesh problem found.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters } = require('./lib/translation-clusters');
const { findRewriteCandidates } = require('./lib/locale-link-rewrite');
const { LOCALES } = require('./lib/locale-parent-registry');

const ROOT = path.resolve(__dirname, '..');

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
}

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(2);
}

const changedFiles = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html'])
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

if (changedFiles.length === 0) {
  console.log('Locale Mesh Check: no changed HTML files — nothing to check.');
  process.exit(0);
}

const LOCALE_PREFIX_RE = new RegExp(`^(${LOCALES.join('|')})/`);
const changedLocaleFiles = changedFiles.filter((f) => LOCALE_PREFIX_RE.test(f));

if (changedLocaleFiles.length === 0) {
  console.log('Locale Mesh Check: no changed locale-page HTML files — nothing to check.');
  process.exit(0);
}

// ─── Current site state (HEAD / working tree) ──────────────────────────────

const { byUrl, clusters } = discoverClusters(ROOT);

// enUrl -> Set of member urls (same lookup shape check-translation-parity.js uses)
const clusterOf = new Map();
for (const [enUrl, members] of clusters) {
  for (const m of members) clusterOf.set(m, enUrl);
}

// ─── (a) reciprocity/headless — same logic as audit-hreflang.js, scoped to one cluster ──

// A bare site root or bare `/xx/` locale homepage. Mirrors audit-hreflang.js's
// own isHomepage() exactly: some pages (the ratified local-only exceptions —
// ja/gal-moji, ko/font-byeonhwan + zh-tw/yingwen-ziti, the fr/calligraphie
// trio, and any future pair built the same way) legitimately claim the bare
// homepage as a placeholder "EN version" instead of a real translation. That
// claim is permanently, correctly non-reciprocal — the homepage must never
// link back to one arbitrary subpage — so it must never fail this gate.
// Without this guard, touching any such page in a PR would false-positive.
function isHomepage(url) {
  return /^https:\/\/ultratextgen\.com\/([a-z]{2}(-[a-z]+)?\/)?$/.test(url);
}

function reciprocityIssuesForCluster(enUrl) {
  const members = clusters.get(enUrl);
  if (!members) return [];
  const issues = [];
  for (const url of members) {
    const rec = byUrl.get(url);
    if (!rec || !rec.alternates || rec.alternates.length === 0) continue; // not a declared cluster page itself
    for (const alt of rec.alternates) {
      if (alt.hreflang === 'x-default') continue;
      if (alt.href === rec.canonical) continue;
      const target = byUrl.get(alt.href);
      if (!target) {
        issues.push({ type: 'broken', from: rec.rel, hreflang: alt.hreflang, href: alt.href });
        continue;
      }
      if (!target.alternates || target.alternates.length === 0) {
        issues.push({ type: 'headless', from: rec.rel, to: target.rel, hreflang: alt.hreflang });
        continue;
      }
      const linksBack = target.alternates.some((a) => a.href === rec.canonical);
      if (!linksBack) {
        if (isHomepage(target.canonical) && !isHomepage(rec.canonical)) continue;
        issues.push({ type: 'non-reciprocal', from: rec.rel, to: target.rel, hreflang: alt.hreflang });
      }
    }
  }
  return issues;
}

const flaggedMesh = []; // { rel, issues }
const flaggedLinks = []; // { rel, candidates }

for (const rel of changedLocaleFiles) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue; // deleted file

  const rec = [...byUrl.values()].find((r) => r.rel === rel);
  if (!rec) continue; // no canonical tag — not part of the hreflang system at all

  const enAnchor = clusterOf.get(rec.canonical) || rec.canonical;
  const issues = reciprocityIssuesForCluster(enAnchor);
  if (issues.length) flaggedMesh.push({ rel, issues });

  const candidates = findRewriteCandidates({ byUrl, clusters }, rec);
  if (candidates.length) flaggedLinks.push({ rel, candidates });
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('Locale Mesh Check');
console.log(`  base:                        ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed locale HTML files:   ${changedLocaleFiles.length}`);
console.log(`  files with mesh (hreflang) problems:      ${flaggedMesh.length}`);
console.log(`  files with un-rewritten hub-link candidates: ${flaggedLinks.length}`);
console.log('');

let hasProblems = false;

if (flaggedMesh.length) {
  hasProblems = true;
  for (const f of flaggedMesh) {
    console.log(`✗ ${f.rel} — hreflang cluster has unresolved issue(s):`);
    for (const issue of f.issues) {
      if (issue.type === 'broken') {
        console.log(`    broken target: hreflang="${issue.hreflang}" -> ${issue.href} (page not found)`);
      } else if (issue.type === 'headless') {
        console.log(`    headless target: ${issue.to} has no hreflang block of its own (referenced by ${issue.from})`);
      } else {
        console.log(`    non-reciprocal: ${issue.from} -> ${issue.to} (missing hreflang="${issue.hreflang}" back)`);
      }
    }
    console.log('    Fix: run `npm run sync:locale-mesh -- --fix` before pushing.');
    console.log('');
  }
}

if (flaggedLinks.length) {
  hasProblems = true;
  for (const f of flaggedLinks) {
    console.log(`✗ ${f.rel} — links an English hub/spoke where a locale-native equivalent already exists:`);
    for (const c of f.candidates) {
      console.log(`    "${c.originalHref}"  should point to  "${c.rewrittenHref}"`);
    }
    console.log(
      '    Fix: run `npm run sync:locale-mesh -- --fix` before pushing (see CLAUDE.md, ' +
        '"Locale-native internal linking").'
    );
    console.log('');
  }
}

if (hasProblems) {
  process.exit(1);
} else {
  console.log('No locale-mesh problems introduced by this branch.');
  process.exit(0);
}
