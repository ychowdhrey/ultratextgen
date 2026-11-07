#!/usr/bin/env node
'use strict';

/**
 * check-jsonld-parse.js
 *
 * Per-PR gate: a branch must not add a JSON-LD block that no consumer can
 * read. Every other structured-data check here skips a block that fails
 * JSON.parse, so an unparseable block used to pass all of them; see
 * scripts/lib/jsonld-parse.js for what counts as unreadable and why.
 *
 * Gates on the DELTA against the merge base. A failure counts against this
 * branch when a changed page carries an unreadable block whose text was not
 * already an unreadable block on that page at the merge base (a new page's
 * baseline is empty). Pre-existing failures are reported every run, on the
 * changed pages and site-wide, and never fail the job. The site stood at zero
 * unreadable blocks when this gate was added, so today the delta and the
 * state agree; the delta keeps an old defect elsewhere from turning every PR
 * red if one ever lands.
 *
 * Usage:
 *   node scripts/check-jsonld-parse.js                # diff against origin/main
 *   node scripts/check-jsonld-parse.js --base main    # diff against another ref
 *
 * Exit 0 = nothing introduced, 1 = this branch adds an unreadable block,
 * 2 = UNKNOWN (base unresolvable or the tree could not be listed).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { jsonLdFailures, isPageFile, scanTree } = require('./lib/jsonld-parse');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts
  });
}

function unknown(msg) {
  console.error(`UNKNOWN: ${msg}`);
  process.exit(2);
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
      return unknown(`could not resolve or fetch base ref "${base}": ${e.message}`);
    }
  }
}

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  unknown(`could not compute merge-base of ${base} and HEAD: ${e.message}`);
}

// name-status with rename detection, so a moved page is compared against its
// old path rather than treated as new.
const changed = [];
for (const line of git(['diff', '--name-status', '-M', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html']).split('\n')) {
  if (!line.trim()) continue;
  const cols = line.split('\t');
  const status = cols[0];
  const rel = cols[cols.length - 1];
  const before = status.startsWith('R') ? cols[1] : status.startsWith('A') ? null : rel;
  if (isPageFile(rel)) changed.push({ rel, before });
}

console.log('JSON-LD Parse Check');
console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed pages:      ${changed.length}`);

const introduced = [];
const preExisting = [];
const changedSet = new Set();

for (const { rel, before } of changed) {
  changedSet.add(rel);
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const now = jsonLdFailures(fs.readFileSync(abs, 'utf8'));
  if (!now.length) continue;

  let baseHtml = '';
  if (before) {
    try {
      baseHtml = git(['show', `${mergeBase}:${before}`]);
    } catch {
      baseHtml = '';
    }
  }
  // Multiset of block texts that were already unreadable on this page.
  const owed = new Map();
  for (const f of jsonLdFailures(baseHtml)) {
    const k = f.raw.trim();
    owed.set(k, (owed.get(k) || 0) + 1);
  }
  for (const f of now) {
    const k = f.raw.trim();
    if (owed.get(k) > 0) {
      owed.set(k, owed.get(k) - 1);
      preExisting.push({ rel, ...f });
    } else {
      introduced.push({ rel, ...f });
    }
  }
}

let site;
try {
  site = scanTree(ROOT);
} catch (e) {
  unknown(`could not scan the tree for pre-existing failures: ${e.message}`);
}
const elsewhere = site.failures.filter((f) => !changedSet.has(f.rel));

console.log(`  introduced:         ${introduced.length}`);
console.log(`  pre-existing on changed pages (reported, not failed): ${preExisting.length}`);
console.log(`  pre-existing elsewhere (reported, not failed): ${elsewhere.length} of ${site.blocks} blocks on ${site.scanned} pages`);
console.log('');

function show(list, limit) {
  for (const f of list.slice(0, limit)) {
    console.log(`    · ${f.rel}:${f.line} ${f.error}`);
  }
  if (list.length > limit) console.log(`    … and ${list.length - limit} more`);
}

if (preExisting.length || elsewhere.length) {
  console.log('Reported, not failed: unreadable JSON-LD already present at the merge base.');
  show(preExisting.concat(elsewhere), 20);
  console.log('  Whole-site list: npm run audit:jsonld-parse');
  console.log('');
}

if (!introduced.length) {
  console.log('This branch adds no JSON-LD block that fails to parse. ✓');
  process.exit(0);
}

console.log('✗ This branch adds JSON-LD that no consumer can read:');
show(introduced, introduced.length);
console.log('');
console.log(
  'Fix: make each block valid JSON whose top level is an object or array. The usual\n' +
    '     causes are an unescaped " inside a string (write \\" or use typographic quotes),\n' +
    '     a trailing comma, or a raw line break inside a string. If a generator wrote\n' +
    '     the block, fix the generator and regenerate rather than patching the page.'
);
process.exit(1);
