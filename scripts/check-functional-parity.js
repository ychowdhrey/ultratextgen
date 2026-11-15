#!/usr/bin/env node
'use strict';

/**
 * check-functional-parity.js
 *
 * Diff-scoped gate: a change must not INTRODUCE a functional parity gap, that
 * is, a capability (tool module, opt-in surface, control, copy tiles) that a
 * cluster's reference page offers and a sibling lacks, where that gap did not
 * exist at the merge base. Shares scripts/lib/functional-fingerprint.js with
 * audit-functional-parity.js (the informational whole-site dashboard).
 *
 * What it catches, each a real shape on this site:
 *   - a translated page shipped without the tool its reference runs (a NEW page
 *     has no base, so every capability it lacks is introduced by this change);
 *   - the reference page gains a tool and no sibling follows;
 *   - a sibling loses a module, a control or its copy tiles in an edit.
 * What it does not fail: pre-existing gaps (reported, never silenced, as debt);
 * a local addition a sibling has and the reference lacks (reported); a repair,
 * which shrinks the gap set (reported as converged).
 *
 * A deliberate divergence is a discussed decision recorded in
 * data/translation_parity_exceptions.json (`suppress.functional`: true or a list
 * of capability keys). This gate never writes that file.
 *
 * Usage:
 *   node scripts/check-functional-parity.js               # against origin/main
 *   node scripts/check-functional-parity.js --base main
 *
 * Exit: 0 no new gap · 1 a change introduced a gap · 2 UNKNOWN (base unresolved).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters } = require('./lib/translation-clusters');
const { buildIntentModel } = require('./lib/intent-clusters');
const ff = require('./lib/functional-fingerprint');
const { loadExceptions, createExceptionResolver, EXCEPTIONS_PATH } = require('./lib/parity-exceptions');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

function git(a, opts = {}) {
  return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', base], { stdio: 'ignore' });
    return base;
  } catch {
    const branch = base.replace(/^origin\//, '');
    try {
      git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
      git(['rev-parse', '--verify', `origin/${branch}`], { stdio: 'ignore' });
      return `origin/${branch}`;
    } catch (e) {
      console.error(`UNKNOWN: could not resolve or fetch base ref "${base}": ${e.message}`);
      process.exit(2);
    }
  }
  return base;
}

function main() {
  const base = resolveBase(requestedBase);
  let mergeBase;
  try {
    mergeBase = git(['merge-base', base, 'HEAD']).trim();
  } catch (e) {
    console.error(`UNKNOWN: could not compute merge-base of ${base} and HEAD: ${e.message}`);
    process.exit(2);
  }
  const changed = git(['diff', '--name-only', '--diff-filter=ACMRD', mergeBase, 'HEAD', '--', '*.html'])
    .split('\n').map((l) => l.trim()).filter(Boolean);
  if (!changed.length) {
    console.log('Functional Parity Check: no changed HTML files — nothing to check.');
    process.exit(0);
  }
  const changedSet = new Set(changed);

  const discovered = discoverClusters(ROOT);
  const { byUrl, clusters } = discovered;
  const model = buildIntentModel(ROOT, { discovered });
  for (const c of model.clusters.values()) {
    if (c.enUrl || c.members.length < 2 || clusters.has(c.representative)) continue;
    clusters.set(c.representative, new Set(c.members));
  }
  const refOf = new Map();
  for (const [ref, members] of clusters) for (const m of members) refOf.set(m, ref);
  const relOf = new Map([...byUrl].map(([u, r]) => [u, r.rel]));
  const { findException } = createExceptionResolver(loadExceptions(EXCEPTIONS_PATH));

  // Clusters a change touches: any member whose file changed.
  const touched = new Set();
  for (const [u, r] of byUrl) if (changedSet.has(r.rel) && refOf.has(u)) touched.add(refOf.get(u));

  const baseHtml = (rel) => {
    try {
      return git(['show', `${mergeBase}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return null; // new at HEAD
    }
  };

  const introduced = [];
  const converged = [];
  let preexisting = 0;
  for (const ref of [...touched].sort()) {
    const members = [...clusters.get(ref)];
    const headFps = new Map();
    const baseFps = new Map();
    for (const u of members) {
      const rel = relOf.get(u);
      const rec = byUrl.get(u);
      if (!rec) continue;
      headFps.set(u, ff.functionalFingerprint(rec.html));
      if (changedSet.has(rel)) {
        const h = baseHtml(rel);
        if (h != null) baseFps.set(u, ff.functionalFingerprint(h));
      } else {
        baseFps.set(u, headFps.get(u));
      }
    }
    const headSet = ff.missingSet(ref, headFps, findException);
    // A member with no base version (a new page) contributes nothing at base, so
    // every gap it carries is new. A reference with no base makes the whole base
    // set empty: a brand-new cluster's gaps are all introduced by this change.
    const baseSet = ff.missingSet(ref, baseFps, findException);
    for (const k of headSet) {
      if (baseSet.has(k)) preexisting++;
      else introduced.push({ ref, key: k });
    }
    for (const k of baseSet) if (!headSet.has(k)) converged.push({ ref, key: k });
  }

  console.log('Functional Parity Check (delta vs merge base)');
  console.log(`  changed HTML files:          ${changed.length}`);
  console.log(`  hreflang clusters touched:   ${touched.size}`);
  console.log(`  gaps introduced:             ${introduced.length}`);
  console.log(`  gaps closed (converged):     ${converged.length}`);
  console.log(`  pre-existing gaps (debt):    ${preexisting} (reported, not failed; npm run audit:functional-parity)`);
  const path0 = (u) => u.replace(/^https:\/\/ultratextgen\.com\//, '/');
  if (converged.length) {
    console.log('\nClosed by this change:');
    for (const c of converged.slice(0, 40)) {
      const [u, cap] = c.key.split('\t');
      console.log(`  ✓ ${path0(u)} now has ${cap} (reference ${path0(c.ref)})`);
    }
  }
  if (introduced.length) {
    console.log('\nIntroduced by this change (the sibling lacks what its reference page offers):');
    for (const c of introduced) {
      const [u, cap] = c.key.split('\t');
      console.log(`  ✗ ${path0(u)} lacks ${cap} — reference ${path0(c.ref)}`);
    }
    console.log('\nFix: give the sibling the same capability (load the module, add the control or flag) in this change,');
    console.log('or, if the divergence is deliberate, raise it with the owner: a `suppress.functional` entry in');
    console.log('data/translation_parity_exceptions.json is a discussed decision, never a way to make this pass.');
    process.exit(1);
  }
  console.log('\nNo new functional parity gap.');
  process.exit(0);
}

main();
