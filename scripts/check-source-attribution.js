#!/usr/bin/env node
'use strict';

/**
 * check-source-attribution.js — the enforcing half of the Sources standard.
 *
 * DIFF-SCOPED, like check-faq-schema.js and check-locale-translation.js, and
 * for the same measured reason: 32 pages cite external sources with no
 * Sources block today. That backlog is real content work — each page needs a
 * sentence written about what its sources establish, in its own language —
 * and a check that is red on every PR regardless of what the PR touched is a
 * check people learn to route around. So a page counts against a branch only
 * if the branch ADDED or CHANGED it. Pre-existing violations elsewhere are
 * reported, never billed; npm run audit:source-attribution is the whole-site
 * picture and the backlog's running total.
 *
 * IT GATES RATHER THAN INFORMS, which is the opposite call from
 * check:images, because for the pages a PR actually touches there is nothing
 * to be permanently red against: a citation either sits in the block with
 * the right rel or it does not, and scripts/fix-source-attribution.js closes
 * any gap in one idempotent run.
 *
 * WHAT IS AN ERROR vs A WARNING — the two are deliberately different
 * strengths, the same split check-library-hub-coverage.js makes:
 *
 *   ERROR    a citation with no Sources block; a citation stranded outside
 *            the block; a wrong rel (an unearned followed link to a press
 *            site, or a nofollow'd standards body); a block that is not a
 *            .source-note panel. Each is a defect a reader or a crawler can
 *            observe.
 *   WARNING  a legacy-but-recognised locale label; a cited domain nobody has
 *            classified. Neither is wrong on the page; both are decisions
 *            somebody still owes, and failing a PR for them would push the
 *            author to edit the ledger to go green, which is the one thing
 *            every ledger in this repo forbids.
 *
 * Usage:
 *   node scripts/check-source-attribution.js [--base origin/main]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib/source-attribution.js');

const ROOT = L.REPO;
const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

const git = (a, o = {}) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', ...o });

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

const changed = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html'])
  .split('\n').map((s) => s.trim()).filter(Boolean)
  .filter((f) => f.endsWith('index.html'));

console.log('SOURCE ATTRIBUTION CHECK');
console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed HTML files: ${changed.length}`);

if (!changed.length) {
  console.log('\nNo HTML changed. Nothing to check.');
  process.exit(0);
}

let errors = 0;
let warnings = 0;
const failing = [];

for (const rel of changed) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const r = L.inspect(rel, fs.readFileSync(abs, 'utf8'));
  if (r.exempt) continue;
  if (!r.errors.length && !r.warnings.length) continue;
  failing.push(r);
  errors += r.errors.length;
  warnings += r.warnings.length;
}

if (failing.length) {
  console.log('');
  for (const r of failing) {
    console.log(`  ${r.relPath}`);
    for (const e of r.errors) console.log(`      ERROR   ${e}`);
    for (const w of r.warnings) console.log(`      warning ${w}`);
  }
}

console.log('');
console.log(`${errors} error(s), ${warnings} warning(s) across ${changed.length} changed page(s).`);

if (errors) {
  console.log('');
  console.log('FIX: run  node scripts/fix-source-attribution.js --write  and commit the result.');
  console.log('It wraps the block in a .source-note panel, sets each citation\'s rel from');
  console.log('data/source_authority.json, and migrates a legacy locale label. What it cannot');
  console.log('do is invent the sentence that says what a source establishes — a page with no');
  console.log('Sources block needs that written, in the page\'s own language, by hand.');
  process.exit(1);
}
process.exit(0);
