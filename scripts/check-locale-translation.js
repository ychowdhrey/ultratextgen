#!/usr/bin/env node
'use strict';

/**
 * check-locale-translation.js
 *
 * Per-PR gate: no locale page this branch adds or changes may still carry a
 * translatable string verbatim from its own English parent.
 *
 * This is the one thing no other gate measures. check-translation-parity.js
 * compares structure (links, <h2>/FAQ/tile counts), so a page that is 90%
 * translated passes exactly like one that is 100% translated. check-locale-mesh
 * reads hrefs. check-new-page-image-assets reads asset paths. check-faq-schema
 * compares a page against itself. All five were green on pages that shipped with
 * English intro paragraphs, English CTA cards, English visible tile labels, and
 * clipboard payloads that pasted English from a localised page.
 *
 * Diff-scoped like check-translation-parity.js / check-faq-schema.js, so the
 * site's pre-existing backlog can never make it permanently red — only a page
 * this branch adds or touches can fail it.
 *
 * Usage:
 *   node scripts/check-locale-translation.js               # diff against origin/main
 *   node scripts/check-locale-translation.js --base main   # diff against another ref
 *
 * Exit code 0 = clean (or nothing to check), 1 = untranslated strings found.
 *
 * NOTE: it diffs merge-base..HEAD, so uncommitted work is invisible to it.
 * Commit first, then run — same caveat as every other diff-scoped gate here.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  auditLocalePage,
  auditPair,
  englishParentOf,
  LEDGER_PATH
} = require('./lib/locale-translation-audit');

const ROOT = path.resolve(__dirname, '..');
const MAX_SHOWN = 6;

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

const changedFiles = git(
  ['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD', '--', '*.html']
)
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

console.log('Locale Translation Completeness Check');
console.log(`  base:               ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed HTML files: ${changedFiles.length}`);

if (changedFiles.length === 0) {
  console.log('\nNo changed HTML files — nothing to check. ✓');
  process.exit(0);
}

/**
 * The state at the merge base, or null if the path did not exist there.
 * A new page has no prior state, so every survivor on it is this branch's.
 */
function blobAt(rev, rel) {
  try {
    return git(['show', `${rev}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/**
 * Is this file byte-identical to a version that already existed in the
 * repository's own history, before the merge base?
 *
 * The delta rule below infers "this branch introduced English" from "surviving
 * now, not surviving at the merge base". That inference INVERTS on a deliberate
 * revert: restoring a page to a state the site previously shipped necessarily
 * re-introduces whatever English that state carried, so the gate reads the
 * restoration exactly like a regression. Same failure check-translation-parity.js
 * documents for repairs, where convergedTowards() measures the thing the rule is
 * about instead of inferring it from "one side moved".
 *
 * The honest predicate is content identity, not similarity: a page whose exact
 * bytes already existed in history is being restored, not written. A hand-edit
 * that puts English back produces a blob matching nothing in history, and still
 * fails — verified against exactly that probe.
 *
 * Restorations are REPORTED in their own section, never silenced.
 */
/**
 * The words of a string, with punctuation, case and spacing removed. Used only
 * to decide whether a survivor is the SAME debt as one at the merge base — never
 * to decide whether a string is English in the first place.
 */
function wordKey(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const HISTORY_DEPTH = 200;
function restoredFromHistory(rel, currentBlob) {
  let revs;
  try {
    revs = git(['log', `--max-count=${HISTORY_DEPTH}`, '--format=%H', mergeBase, '--', rel])
      .trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
  for (const rev of revs) {
    let blob;
    try {
      blob = git(['rev-parse', `${rev}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      continue;
    }
    if (blob === currentBlob) return rev.slice(0, 8);
  }
  return null;
}

/**
 * Measure the DELTA, not the state — the same reasoning check-translation-parity.js
 * applies with convergedTowards().
 *
 * The site carries a real backlog of partially-translated pages (npm run
 * audit:locale-translation sizes it), and mesh/hreflang/asset passes legitimately
 * touch hundreds of them without changing a word of their copy. Failing a PR for
 * English it did not introduce, on a page it only touched structurally, is how a
 * gate gets ignored. So a string is only counted against this branch if it is
 * surviving NOW and was not surviving at the merge base — compared against the
 * base's own EN parent, so an English page growing a new string cannot silently
 * indict every translation that hasn't caught up yet.
 *
 * Pre-existing survivors are still reported, never silenced.
 */
const flagged = [];
const preExisting = [];
const restored = [];
const noParent = [];
let checked = 0;
let ledgeredTotal = 0;

for (const rel of changedFiles) {
  if (!fs.existsSync(path.join(ROOT, rel))) continue; // deleted in a later commit
  const result = auditLocalePage(rel, { root: ROOT });
  if (result.status === 'not-a-locale-page') continue;
  if (result.status === 'no-parent' || result.status === 'parent-missing') {
    // Not this gate's job. A locale page with no live EN parent is the
    // English-Parent Rule's business and check-locale-parent-gap.js already
    // owns it; reporting it here too would just be noise on ratified
    // local-only pages, which legitimately have no parent to compare against.
    noParent.push(rel);
    continue;
  }
  checked++;
  ledgeredTotal += result.ledgered.length;
  if (result.status !== 'untranslated') continue;

  const before = blobAt(mergeBase, rel);
  let priorSurvivors = new Set();
  if (before) {
    const priorParentRel = englishParentOf(before);
    const priorParent = priorParentRel ? blobAt(mergeBase, priorParentRel) : null;
    if (priorParent) {
      priorSurvivors = new Set(auditPair(before, priorParent, result.locale).survivors);
    } else {
      // The page existed but its parent can't be resolved at the base (parent
      // added in this branch, or the claim changed). Treat the page as new
      // rather than guessing — the stricter reading.
      priorSurvivors = new Set();
    }
  }

  // Punctuation is not English. Re-punctuating a survivor — rewriting a tile
  // label `Name — gloss` as `Name: gloss` — leaves exactly the same words
  // untranslated on exactly the same page, but a set comparison sees a string
  // that was not in the base set and reads the edit as an introduction. That is
  // the third instance of the inversion this file already documents for reverts
  // above, and it is measured the same way: on the thing the rule is about.
  // Verified against the em-dash template pass that surfaced it — 9 pages whose
  // flagged strings were byte-identical survivors at the merge base with one
  // dash swapped for a colon.
  //
  // Scoped per page, so a survivor on one page can never excuse a new string on
  // another, and the words must match exactly: any change to the English itself
  // still fails.
  const priorWords = new Set([...priorSurvivors].map(wordKey));
  const isCarried = (s) => priorSurvivors.has(s) || priorWords.has(wordKey(s));
  const introduced = result.survivors.filter((s) => !isCarried(s));
  const carried = result.survivors.filter(isCarried);
  if (introduced.length) {
    const blob = git(['rev-parse', `HEAD:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const from = restoredFromHistory(rel, blob);
    if (from) restored.push({ rel, count: introduced.length, from });
    else flagged.push({ rel, ...result, survivors: introduced, carried });
  } else if (carried.length) {
    preExisting.push({ rel, count: carried.length });
  }
}

console.log(`  locale pages checked: ${checked}`);
console.log(`  English introduced:   ${flagged.length}`);
if (restored.length) console.log(`  restored from history (not introduced): ${restored.length}`);
if (preExisting.length) console.log(`  pre-existing (not this branch's): ${preExisting.length}`);
if (noParent.length) console.log(`  no EN parent (skipped): ${noParent.length}`);
if (ledgeredTotal) console.log(`  ledgered identities:  ${ledgeredTotal}`);
console.log('');

if (restored.length) {
  const shown = restored.slice().sort((a, b) => b.count - a.count).slice(0, MAX_SHOWN);
  console.log(
    `\nReported, not failed — ${restored.length} page(s) were RESTORED to a state\n` +
    'this repository already shipped. Their bytes are identical to a prior commit, so\n' +
    'the English they carry was not written by this branch. A hand-edit that put\n' +
    'English back would match no historical blob and would still fail.'
  );
  for (const r of shown) console.log(`    \u00b7 ${r.rel} (${r.count}) \u2190 ${r.from}`);
  if (restored.length > shown.length) {
    console.log(`    \u2026 and ${restored.length - shown.length} more`);
  }
}

if (preExisting.length) {
  const shown = preExisting
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p) => `${p.rel} (${p.count})`);
  console.log(
    `Reported, not failed — ${preExisting.length} page(s) this branch touched already carried\n` +
      'untranslated English at the merge base, and this branch did not add to it:'
  );
  for (const s of shown) console.log(`    · ${s}`);
  if (preExisting.length > shown.length) {
    console.log(`    … and ${preExisting.length - shown.length} more`);
  }
  console.log('  Size the whole backlog with: npm run audit:locale-translation');
  console.log('');
}

if (!flagged.length) {
  console.log(
    checked === 0
      ? 'No locale pages with an English parent changed — nothing to check. ✓'
      : 'This branch introduced no untranslated English on any locale page. ✓'
  );
  process.exit(0);
}

for (const f of flagged) {
  const carried = f.carried.length ? ` (plus ${f.carried.length} pre-existing)` : '';
  console.log(
    `✗ ${f.rel} (${f.locale}) newly carries ${f.survivors.length} string(s) ` +
      `verbatim from ${f.parent}${carried}:`
  );
  for (const s of f.survivors.slice(0, MAX_SHOWN)) {
    console.log(`    · ${s.length > 110 ? `${s.slice(0, 110)}…` : s}`);
  }
  if (f.survivors.length > MAX_SHOWN) {
    console.log(`    … and ${f.survivors.length - MAX_SHOWN} more`);
  }
  console.log('');
}

console.log(
  'Fix: translate them. Check all of these surfaces, not just the obvious one —\n' +
    '     body prose and the shared CTA card; aria-label="Copy X" AND the visible\n' +
    '     <span class="flag-label">X</span> that repeats the same name; data-symbol\n' +
    '     payloads (a locale page whose one-click copy pastes English defeats the\n' +
    '     page); JS combo names; table cells; FAQ questions.\n' +
    '\n' +
    `     If a string's CORRECT translation is genuinely byte-identical to the\n` +
    `     English ("Cupcake" in Dutch, "Joystick" in German), add it — with its\n` +
    `     reason — to ${path.relative(ROOT, LEDGER_PATH)}. That ledger is for real\n` +
    '     identities only; never use it to silence a string you have not translated.\n' +
    '\n' +
    '     Whole-site picture: npm run audit:locale-translation'
);
process.exit(1);
