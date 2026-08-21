#!/usr/bin/env node
'use strict';

/**
 * audit-translation-parity.js
 *
 * Point-in-time audit: for every EN <-> locale hreflang cluster, diff a
 * language-independent "structural fingerprint" (internal content links,
 * FAQ question count, <h2> count, .symbol-tile count) between the EN page
 * and each of its locale siblings. A non-empty diff means one side gained
 * or lost content after the translation was made and the other side was
 * never caught up — the failure mode this script exists to surface.
 *
 * This is NOT a hreflang correctness check (see audit-hreflang.js) — a
 * cluster can be perfectly reciprocal and still have drifted content.
 *
 * Usage:
 *   node scripts/audit-translation-parity.js            # full report to stdout
 *   node scripts/audit-translation-parity.js --report out.md   # also write markdown
 *   node scripts/audit-translation-parity.js --json out.json   # also write raw JSON
 *
 * Known, agreed-upon divergences are suppressed via
 * data/translation_parity_exceptions.json — see that file's own comment
 * for the entry shape. Nothing is auto-added to it; every entry there
 * represents an explicit decision made with the user (see CLAUDE.md,
 * "Translation Parity" section).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters } = require('./lib/translation-clusters');
const { createFingerprinter } = require('./lib/content-fingerprint');
const { loadExceptions, createExceptionResolver, EXCEPTIONS_PATH } = require('./lib/parity-exceptions');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const reportIdx = args.indexOf('--report');
const jsonIdx = args.indexOf('--json');
const reportPath = reportIdx !== -1 ? args[reportIdx + 1] : null;
const jsonPath = jsonIdx !== -1 ? args[jsonIdx + 1] : null;

// ─── Discover every page + its declared hreflang cluster ──────────────────

const { byUrl, clusters, localeCodes } = discoverClusters(ROOT);

// ─── Fingerprinting ─────────────────────────────────────────────────────

const { fingerprint: fingerprintHtml, diff: diffFingerprints, score: scoreDiff } = createFingerprinter(
  byUrl,
  localeCodes
);
// relPath is what tells the fingerprinter whether this is a pillar catalogue
// index (inventory links, expected to diverge) — the audit and the PR gate must
// classify pages identically, so both pass it. See content-fingerprint.js.
const fingerprint = (rec) => fingerprintHtml(rec.html, { relPath: rec.rel });

function lastCommit(rel) {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%h|%ad|%s', '--date=short', '--', rel],
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
    if (!out) return null;
    const [hash, date, ...rest] = out.split('|');
    return { hash, date, subject: rest.join('|') };
  } catch {
    return null;
  }
}

// ─── Exceptions ledger ──────────────────────────────────────────────────
// Semantics (including what `suppress` scopes) live in
// scripts/lib/parity-exceptions.js, shared with check-translation-parity.js
// so the audit and the gate can't read the same entry two different ways.

const exceptions = loadExceptions(EXCEPTIONS_PATH);
const { findException, applySuppression } = createExceptionResolver(exceptions);

// ─── Diff every cluster ────────────────────────────────────────────────

const results = [];

for (const [enUrl, members] of clusters) {
  const enRec = byUrl.get(enUrl);
  if (!enRec) continue; // broken anchor — audit-hreflang.js already reports this
  const enFp = fingerprint(enRec);
  const enCommit = lastCommit(enRec.rel);

  for (const memberUrl of members) {
    if (memberUrl === enUrl) continue;
    const rec = byUrl.get(memberUrl);
    if (!rec) continue; // broken/headless target — audit-hreflang.js's job
    if (rec.ownLang === 'en' || !rec.ownLang) continue; // not a real locale member

    const fp = fingerprint(rec);
    const rawDiff = diffFingerprints(enFp, fp);

    const ex = findException(enUrl, memberUrl);
    const diff = applySuppression(ex, rawDiff);
    const score = scoreDiff(diff);

    if (score === 0 && !ex) continue; // clean pair, nothing to report

    results.push({
      enUrl,
      enRel: enRec.rel,
      localeUrl: memberUrl,
      localeRel: rec.rel,
      lang: rec.ownLang,
      diff,
      rawScore: scoreDiff(rawDiff),
      score,
      exception: ex,
      enCommit,
      localeCommit: lastCommit(rec.rel),
    });
  }
}

results.sort((a, b) => b.score - a.score || b.rawScore - a.rawScore);

// ─── Report ─────────────────────────────────────────────────────────────

const flagged = results.filter((r) => r.score > 0);
const excusedOnly = results.filter((r) => r.score === 0 && r.exception);

// A big diff (dozens of links) almost always means "this locale's translation
// coverage just hasn't caught up to the whole site yet" — a known, tracked,
// separate backlog (see CLAUDE.md's grandfathered-exception / gradual-rollout
// language) — not "someone edited one side and forgot the other," which is
// what this tool exists to catch. Bucket by size so the small, actionable
// drift (the currency-symbols-style case) isn't buried under hub pages that
// legitimately link to hundreds of not-yet-translated spokes.
const thresholdIdx = args.indexOf('--threshold');
const BULK_THRESHOLD = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 12;
const showBulk = args.includes('--show-bulk');

const actionable = flagged.filter((r) => r.score <= BULK_THRESHOLD).sort((a, b) => b.score - a.score);
const bulk = flagged.filter((r) => r.score > BULK_THRESHOLD).sort((a, b) => b.score - a.score);

const lines = [];
const log = (s = '') => {
  lines.push(s);
  console.log(s);
};

log('Translation Parity Audit');
log(`  hreflang clusters with an EN anchor:     ${clusters.size}`);
log(`  locale pairs compared:                   ${[...clusters.values()].reduce((n, s) => n + s.size - 1, 0)}`);
log(`  actionable drift (likely a missed sync): ${actionable.length}`);
log(`  bulk/coverage-gap pairs (score > ${BULK_THRESHOLD}):     ${bulk.length}`);
log(`  pairs fully excused by ledger:           ${excusedOnly.length}`);
log('');
log(`Showing actionable drift only. Bulk coverage-gap pairs are summarized below${showBulk ? '' : ' (pass --show-bulk for full detail, --threshold N to change the cutoff)'}.`);
log('');

// ─── Highest-signal view: group by the EN commit that likely caused it ────
//
// A raw per-pair diff can't tell "accidental drift" apart from "the locale
// page was always written with different editorial choices." A commit
// whose subject is a feat: commit that touched the EN page, landed strictly
// after the locale sibling's own last commit, is the sharpest available
// proxy for "EN gained content and the translation was never caught up" —
// which is exactly the failure mode this audit exists to catch. This is
// necessarily a heuristic (not every un-synced feat commit is a real miss,
// and some real misses use other commit-message verbs), but grouping by
// root commit turns a flat list of ~1000+ noisy pairs into a short list of
// specific, reviewable changes.
const FEAT_RE = /^feat(\(|:)/;
const rootCauseCandidates = flagged.filter(
  (r) => r.enCommit && FEAT_RE.test(r.enCommit.subject) && (!r.localeCommit || r.localeCommit.date < r.enCommit.date)
);
const byCommit = new Map();
for (const r of rootCauseCandidates) {
  const key = `${r.enCommit.hash} ${r.enCommit.subject}`;
  if (!byCommit.has(key)) byCommit.set(key, { date: r.enCommit.date, pages: new Set(), langs: new Set(), pairs: [] });
  const g = byCommit.get(key);
  g.pages.add(r.enRel);
  g.langs.add(r.lang);
  g.pairs.push(r);
}
const commitRows = [...byCommit.entries()].sort((a, b) => b[1].date.localeCompare(a[1].date) || b[1].langs.size - a[1].langs.size);

log(`── High-confidence: EN feat commits with un-synced locale siblings (${commitRows.length}) ──`);
log('');
for (const [key, g] of commitRows) {
  log(`${g.date}  ${key}`);
  log(`  pages:            ${[...g.pages].join(', ')}`);
  log(`  un-synced locales (${g.langs.size}): ${[...g.langs].sort().join(', ')}`);
  log('');
}

function printPair(r) {
  log(`✗ [${r.lang}] ${r.enRel}  <->  ${r.localeRel}  (score ${r.score})`);
  if (r.enCommit) log(`    EN last touched:     ${r.enCommit.date}  ${r.enCommit.hash}  ${r.enCommit.subject}`);
  if (r.localeCommit)
    log(`    ${r.lang} last touched:    ${r.localeCommit.date}  ${r.localeCommit.hash}  ${r.localeCommit.subject}`);
  if (r.diff.onlyInEN.length) {
    log(`    EN has, ${r.lang} missing (${r.diff.onlyInEN.length}):`);
    for (const h of r.diff.onlyInEN) log(`      - ${h}`);
  }
  if (r.diff.onlyInLocale.length) {
    log(`    ${r.lang} has, EN missing (${r.diff.onlyInLocale.length}):`);
    for (const h of r.diff.onlyInLocale) log(`      - ${h}`);
  }
  if (r.diff.h2Delta !== 0) log(`    <h2> section count delta (EN - ${r.lang}): ${r.diff.h2Delta}`);
  if (r.diff.faqDelta !== 0) log(`    FAQ question count delta (EN - ${r.lang}): ${r.diff.faqDelta}`);
  if (r.diff.symbolTilesDelta !== 0)
    log(`    .symbol-tile count delta (EN - ${r.lang}): ${r.diff.symbolTilesDelta}`);
  if (r.exception) log(`    (partial exception on file, reason: "${r.exception.reason}")`);
  log('');
}

// The full per-pair dump is mostly editorial variance across ~1000+ pairs,
// not accidental drift — the commit-grouped section above is the actual
// signal. Keep the raw dump available (it's the ground truth the heuristic
// above was built from) but opt-in only, so a plain run stays readable.
const showFull = args.includes('--full');
if (showFull) {
  log(`── Actionable drift (score <= ${BULK_THRESHOLD}) ──`);
  log('');
  for (const r of actionable) printPair(r);

  log(`── Bulk / translation-coverage-gap pairs (score > ${BULK_THRESHOLD}) ──`);
  log('');
  if (showBulk) {
    for (const r of bulk) printPair(r);
  } else {
    for (const r of bulk) log(`  ${r.score.toString().padStart(4)}  [${r.lang}] ${r.enRel}  <->  ${r.localeRel}`);
    log('');
  }
} else {
  log(`(${actionable.length} smaller-diff pairs and ${bulk.length} bulk/coverage-gap pairs omitted — pass --full to print every pair, or --json <path> for the raw data.)`);
  log('');
}

if (excusedOnly.length) {
  log('Pairs with a recorded, agreed exception (no unresolved drift):');
  for (const r of excusedOnly) {
    log(`  ✓ [${r.lang}] ${r.enRel} <-> ${r.localeRel} — ${r.exception.reason} (agreed ${r.exception.agreed})`);
  }
  log('');
}

if (reportPath) {
  const md = [
    `# Translation Parity Audit`,
    ``,
    `Generated ${new Date().toISOString().slice(0, 10)}. Run \`node scripts/audit-translation-parity.js\` to regenerate.`,
    ``,
    '```',
    ...lines,
    '```',
  ].join('\n');
  fs.writeFileSync(path.resolve(ROOT, reportPath), md, 'utf8');
  console.log(`\nMarkdown report written to ${reportPath}`);
}

if (jsonPath) {
  fs.writeFileSync(path.resolve(ROOT, jsonPath), JSON.stringify(results, null, 2), 'utf8');
  console.log(`JSON written to ${jsonPath}`);
}

process.exit(flagged.length > 0 ? 0 : 0); // informational by default; see check-translation-parity.js for the enforcing check
