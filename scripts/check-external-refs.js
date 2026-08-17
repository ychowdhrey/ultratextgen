#!/usr/bin/env node
'use strict';

/**
 * Fails if any tracked file points readers at a source outside this
 * repository — another repo by name, an internal doc path, or tooling that
 * isn't published here.
 *
 * Why this exists: comments, docstrings, ledger evidence text and generated
 * file headers accumulate "cite your source" pointers one at a time, each
 * written in good faith. A public tree should carry the *substance* — the
 * figures, the finding, the rationale, the decision — and never a pointer to
 * somewhere the reader cannot follow. A dangling pointer is worse than no
 * pointer: it tells a maintainer the reasoning lives elsewhere and then
 * strands them. A 2026-08-06 sweep found ~35 across 28 files; they were
 * removed, and this check is what stops them coming back.
 *
 * It is deliberately a *content* check, not a commit-message check: messages
 * can't be corrected after publication without rewriting shared history, so
 * the enforceable line is "nothing in the tree."
 *
 * Patterns are assembled from fragments at runtime. This file necessarily has
 * to know what it looks for, and writing those strings out as literals would
 * make it the very reference it exists to remove.
 *
 * Usage:
 *   node scripts/check-external-refs.js          # all tracked files
 *   node scripts/check-external-refs.js --staged # staged changes only
 */

const { execFileSync } = require('child_process');

const PATTERNS = [
  { rx: ['ultratextgen', 'lab'].join('-'), why: 'names a repository other than this one' },
  { rx: ['private', 'research', 'repo'].join(' '), why: 'points at an unpublished source' },
  { rx: ['private', 'research', 'tooling'].join(' '), why: 'points at unpublished tooling' },
  { rx: ['internal', 'docs/'].join(' '), why: 'points at documentation outside this repo' },
];

// This file is excluded from its own scan.
const SELF = 'scripts/check-external-refs.js';

function grep(pattern, stagedOnly) {
  const args = ['grep', '-n', '-I', '-i', '--no-color'];
  if (stagedOnly) args.push('--cached');
  args.push('-e', pattern, '--', '.', `:!${SELF}`, ':!node_modules');
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      .filter(Boolean);
  } catch (err) {
    // git grep exits 1 when there are no matches — that is success here.
    if (err.status === 1) return [];
    throw err;
  }
}

function main() {
  const stagedOnly = process.argv.includes('--staged');
  const seen = new Map();

  for (const { rx, why } of PATTERNS) {
    for (const line of grep(rx, stagedOnly)) {
      // format: path:lineno:content
      const m = line.match(/^([^:]+):(\d+):(.*)$/);
      if (!m) continue;
      const key = `${m[1]}:${m[2]}`;
      if (!seen.has(key)) {
        seen.set(key, { file: m[1], line: m[2], why, text: m[3].trim().slice(0, 120) });
      }
    }
  }

  const hits = [...seen.values()];
  console.log('External-reference check');
  console.log(`  scope:            ${stagedOnly ? 'staged changes' : 'all tracked files'}`);
  console.log(`  references found: ${hits.length}`);
  console.log('');

  if (!hits.length) {
    console.log('No references to sources outside this repository. ✓');
    return 0;
  }

  for (const h of hits) {
    console.log(`  ${h.file}:${h.line}`);
    console.log(`    ${h.why}`);
    console.log(`    ${h.text}`);
  }
  console.log('');
  console.log('Remove the pointer and keep the substance: state the figure, the');
  console.log('finding or the rationale inline, so this file stands on its own.');
  return 1;
}

process.exit(main());
