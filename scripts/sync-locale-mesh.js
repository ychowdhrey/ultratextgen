#!/usr/bin/env node
'use strict';

/**
 * sync-locale-mesh.js
 *
 * Phase-0 mesh automation: generates the reciprocal hreflang set and
 * locale-native internal links CLAUDE.md's "Locale-native internal linking"
 * and "Localization Workflow" sections require, instead of leaving them to
 * manual vigilance (the failure mode PR #586 and its 21-locale follow-up
 * audit had to hand-repair).
 *
 * Two repairs, in order:
 *   1. hreflang reciprocity + headless targets — delegated entirely to the
 *      existing scripts/audit-hreflang.js (never reimplemented here). In
 *      --fix mode, this runs `node scripts/audit-hreflang.js --fix` first,
 *      before touching internal links, so link-rewriting always sees an
 *      accurate, reciprocal cluster map. When --files is given, the fix is
 *      forwarded as --scope-files: the audit still SCANS the whole tree
 *      (reciprocity can't be judged from a subset) but only WRITES to the
 *      named files and members of their own hreflang clusters — a scoped
 *      run must never mutate unrelated clusters (that unscoped behavior
 *      once edited two ratified local-only pages in an unrelated PR,
 *      `148fcd59`). Without --files, --fix remains site-wide. In report
 *      mode (the default — no --fix), it instead runs audit-hreflang.js
 *      WITHOUT --fix, to surface hreflang health as read-only context
 *      alongside the link candidates below, without mutating anything.
 *
 *      (Design note: hreflang repair is gated on THIS script's own --fix
 *      flag, not unconditional, specifically so a bare
 *      `node scripts/sync-locale-mesh.js` stays a safe, side-effect-free
 *      report — matching audit-hreflang.js's and check-translation-parity.js's
 *      own report-vs-fix convention, and matching how every other --fix
 *      tool in this repo behaves. `--fix` is required to mutate anything.)
 *
 *   2. locale-native internal-link rewrite candidates — via
 *      scripts/lib/locale-link-rewrite.js, scoped to --files if given
 *      (the generator hook's use case: rewrite just the page it *just*
 *      wrote) or the whole tree by default (the manual/backlog use case).
 *      Report mode (default) prints each candidate; --fix rewrites the
 *      href in place, at its exact recorded position (not a blind
 *      find-and-replace — see rewriteFile() below), so a coincidental
 *      identical href elsewhere on the page that ISN'T a real candidate
 *      (e.g. a language-switcher link the candidate-finder already
 *      excluded) is never touched.
 *
 * This is a fixer tool, not a gate — no meaningful "failure" exit here, it
 * always exits 0 (mirrors audit-hreflang.js's own non-strict tone when not
 * run with --fix). See scripts/check-locale-mesh.js for the enforcing PR
 * gate that requires this already applied.
 *
 * Usage:
 *   node scripts/sync-locale-mesh.js                        # report, whole tree
 *   node scripts/sync-locale-mesh.js --fix                  # fix, whole tree
 *   node scripts/sync-locale-mesh.js --files id/symbol/foo/index.html --fix
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters } = require('./lib/translation-clusters');
const { findRewriteCandidates } = require('./lib/locale-link-rewrite');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const filesIdx = args.indexOf('--files');
const explicitFiles = [];
if (filesIdx !== -1) {
  for (let i = filesIdx + 1; i < args.length && !args[i].startsWith('--'); i++) explicitFiles.push(args[i]);
}

// ─── 1. hreflang reciprocity/headless-target repair — delegate, don't reimplement ──

console.log('Locale Mesh Sync');
console.log(`  mode: ${FIX ? 'fix' : 'report'}${explicitFiles.length ? `, scoped to ${explicitFiles.length} file(s)` : ', whole tree'}`);
console.log('');
console.log(`── Step 1: hreflang reciprocity (scripts/audit-hreflang.js${FIX ? ' --fix' : ''}) ──`);
console.log('');
try {
  execFileSync(
    'node',
    [
      'scripts/audit-hreflang.js',
      ...(FIX ? ['--fix'] : []),
      // Scope the fix pass to the named files + their own cluster members,
      // so a scoped run can never mutate unrelated clusters (the `148fcd59`
      // failure). Report mode ignores this — it never writes anyway.
      ...(FIX && explicitFiles.length ? ['--scope-files', ...explicitFiles] : []),
    ],
    {
      cwd: ROOT,
      stdio: 'inherit',
    }
  );
} catch {
  // audit-hreflang.js exits 1 when it finds (or, in report mode, still has)
  // unresolved issues — that's expected, informational output, not a reason
  // for this fixer tool to fail.
}
console.log('');

// ─── 2. locale-native internal-link rewrite candidates ─────────────────────

console.log('── Step 2: locale-native internal-link candidates (scripts/lib/locale-link-rewrite.js) ──');
console.log('');

const { byUrl, clusters } = discoverClusters(ROOT);

let targetRecs;
if (explicitFiles.length) {
  targetRecs = explicitFiles
    .map((f) => {
      const rel = path.relative(ROOT, path.resolve(ROOT, f)).replace(/\\/g, '/');
      return [...byUrl.values()].find((r) => r.rel === rel);
    })
    .filter(Boolean);
} else {
  targetRecs = [...byUrl.values()].filter((r) => r.ownLang && r.ownLang !== 'en');
}

let totalCandidates = 0;
let filesWithCandidates = 0;
let filesFixed = 0;
let hrefsRewritten = 0;

function rewriteFile(rec, candidates) {
  let html = rec.html;
  // Splice from the end backward so earlier matchIndex positions stay valid
  // as later ones are edited.
  const sorted = [...candidates].sort((a, b) => b.matchIndex - a.matchIndex);
  for (const c of sorted) {
    const before = html.slice(0, c.matchIndex);
    const tagSlice = html.slice(c.matchIndex, c.matchIndex + c.context.length);
    const after = html.slice(c.matchIndex + c.context.length);
    if (tagSlice !== c.context) continue; // tree shifted under us — skip rather than corrupt the file
    const newTag = tagSlice.replace(/(href\s*=\s*)(["'])([^"']*)\2/i, (m0, p1, quote) => `${p1}${quote}${c.rewrittenHref}${quote}`);
    html = before + newTag + after;
  }
  fs.writeFileSync(path.join(ROOT, rec.rel), html, 'utf8');
}

for (const rec of targetRecs) {
  const candidates = findRewriteCandidates({ byUrl, clusters }, rec);
  if (!candidates.length) continue;

  filesWithCandidates++;
  totalCandidates += candidates.length;

  console.log(`${rec.rel} (locale: ${rec.ownLang}) — ${candidates.length} candidate(s):`);
  for (const c of candidates) {
    console.log(`  ${c.originalHref}  ->  ${c.rewrittenHref}`);
  }

  if (FIX) {
    rewriteFile(rec, candidates);
    filesFixed++;
    hrefsRewritten += candidates.length;
    console.log(`  fixed: rewrote ${candidates.length} href(s) in ${rec.rel}`);
  }
  console.log('');
}

console.log(`Scanned ${targetRecs.length} locale page(s): ${filesWithCandidates} file(s) with a rewrite candidate, ${totalCandidates} candidate(s) total.`);
if (FIX) {
  console.log(`Fixed ${filesFixed} file(s), rewrote ${hrefsRewritten} href(s).`);
} else if (totalCandidates) {
  console.log('Run with --fix to rewrite these in place, or `npm run check:locale-mesh` to see this enforced as a PR gate.');
}

process.exit(0);
