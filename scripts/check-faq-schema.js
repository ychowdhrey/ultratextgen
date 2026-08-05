#!/usr/bin/env node
'use strict';

/**
 * check-faq-schema.js
 *
 * Per-PR gate: every page this branch adds or changes that ships FAQPage /
 * QAPage JSON-LD must have each of those questions actually visible in the
 * rendered body. Google requires structured data to mirror on-page content;
 * a FAQPage block describing Q&A the reader never sees is invisible-content
 * markup, which forfeits the rich result and is manual-action territory.
 *
 * This is the enforcement half of scripts/audit-faq-schema.js. Both share
 * scripts/lib/faq-schema-audit.js so "visible" can never mean two different
 * things. Diff-scoped like scripts/check-translation-parity.js and
 * scripts/check-new-page-image-assets.py, so pre-existing backlog elsewhere
 * on the site can never make this permanently red — only a problem this PR
 * introduces (or leaves behind on a page it touched) fails it.
 *
 * Usage:
 *   node scripts/check-faq-schema.js                # diff against origin/main
 *   node scripts/check-faq-schema.js --base main    # diff against another ref
 *
 * Exit code 0 = clean (or nothing to check), 1 = mismatch found.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { auditHtml } = require('./lib/faq-schema-audit');

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

const changedFiles = git([
  'diff',
  '--name-only',
  '--diff-filter=ACMR',
  mergeBase,
  'HEAD',
  '--',
  '*.html'
])
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

console.log('FAQ Schema Visibility Check');
console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed HTML files: ${changedFiles.length}`);

if (changedFiles.length === 0) {
  console.log('\nNo changed HTML files — nothing to check. ✓');
  process.exit(0);
}

const flagged = [];
let checked = 0;

for (const rel of changedFiles) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue; // deleted in a later commit
  const result = auditHtml(fs.readFileSync(filePath, 'utf8'));
  if (!result.hasFaqSchema) continue;
  checked++;
  if (result.status === 'ok') continue;
  flagged.push({ rel, ...result });
}

console.log(`  with FAQ schema:    ${checked}`);
console.log(`  mismatched:         ${flagged.length}`);
console.log('');

if (!flagged.length) {
  console.log('Every FAQ schema question on the changed pages is visible on the page. ✓');
  process.exit(0);
}

for (const f of flagged) {
  const label =
    f.status === 'no-visible-faq'
      ? 'ships FAQ schema but NO question is visible on the page'
      : `ships FAQ schema with ${f.missingQuestions.length} question(s) not visible on the page`;
  console.log(`✗ ${f.rel} ${label}:`);
  for (const q of f.missingQuestions) console.log(`    · ${q}`);
  console.log('');
}

console.log(
  'Fix: render the Q&A on the page (house style: .faq-item > .faq-question + .faq-answer),\n' +
    '     or remove the unmatched questions from the JSON-LD. Schema must mirror visible\n' +
    '     content — see CLAUDE.md, "FAQ schema must mirror visible page content".\n' +
    '     Whole-site picture: npm run audit:faq-schema'
);
process.exit(1);
