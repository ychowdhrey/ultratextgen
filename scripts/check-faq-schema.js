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
 * It checks BOTH halves of the rule. Questions: every schema question must
 * be visible. Answers: a schema answer must not claim a sentence's worth of
 * content its own visible answer never renders — the half that used to be
 * computed and then never read, which is how an appended JSON-LD-only
 * sentence shipped on updates/unicode-18-most-anticipated-emoji on
 * 2026-08-21 with this gate reporting "mismatched: 0".
 *
 * The answer half gates on the DELTA against the merge base, never on the
 * state. The site carries ~920 paraphrase-drifted pairs across ~336 pages
 * (measured 2026-08-21) — real, mostly benign rewording that a state check
 * would fire on forever. Same reasoning, and same shape, as
 * check-locale-translation.js. Pre-existing drift is reported, never failed.
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
const {
  auditHtml,
  answerDrift,
  findBinderScripts,
  unboundFaqItems
} = require('./lib/faq-schema-audit');

const ROOT = path.resolve(__dirname, '..');

/**
 * How many content tokens a schema answer may gain over its own visible
 * answer before this branch is held responsible. 4 is roughly a clause;
 * the real 2026-08-21 regression added 5. Below this, ordinary rewording
 * and markup churn dominate.
 */
const DRIFT_TOLERANCE = 4;

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
const unbound = [];
const driftFlagged = [];
const driftPreExisting = [];
let checked = 0;

// Which local JS files bind the accordion. Scanned once, not per page.
const binderScripts = findBinderScripts(ROOT);

for (const rel of changedFiles) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue; // deleted in a later commit
  const html = fs.readFileSync(filePath, 'utf8');

  // A button-variant FAQ with nothing bound to open it renders its answers
  // never (style.css: .faq-answer{display:none}). Checked independently of
  // the schema comparison below, which cannot see CSS.
  const hidden = unboundFaqItems(html, { pagePath: rel, binderScripts });
  if (hidden) unbound.push({ rel, hidden });

  const result = auditHtml(html);
  if (!result.hasFaqSchema) continue;
  checked++;

  // Answer half, delta-scoped. A page absent from the base is new: its
  // baseline is zero, so a new page must render what its schema claims.
  const nowDrift = answerDrift(html);
  let baseHtml = null;
  try {
    baseHtml = git(['show', `${mergeBase}:${rel}`]);
  } catch {
    baseHtml = null;
  }
  const baseDrift = baseHtml ? answerDrift(baseHtml) : new Map();
  for (const [question, extra] of nowDrift) {
    const before = baseDrift.has(question) ? baseDrift.get(question) : 0;
    if (extra - before >= DRIFT_TOLERANCE) {
      driftFlagged.push({ rel, question, before, after: extra });
    } else if (extra > 0) {
      driftPreExisting.push({ rel, question, extra });
    }
  }

  if (result.status === 'ok') continue;
  flagged.push({ rel, ...result });
}

console.log(`  with FAQ schema:    ${checked}`);
console.log(`  mismatched:         ${flagged.length}`);
console.log(`  unbound accordions: ${unbound.length}`);
console.log(`  answer drift introduced: ${driftFlagged.length}`);
console.log(`  answer drift pre-existing (reported, not failed): ${driftPreExisting.length}`);
console.log('');

if (unbound.length) {
  for (const u of unbound) {
    console.log(
      `\u2717 ${u.rel} has ${u.hidden} button-variant FAQ item(s) with no accordion binder — ` +
        'their answers can never be opened:'
    );
    console.log(
      '    style.css sets .faq-answer{display:none} and only .faq-item.open (added by JS)\n' +
        '    or details[open] reveals it. This page loads neither /script.js, nor an inline\n' +
        '    .faq-question handler, nor a local script that binds one.'
    );
    console.log('');
  }
  console.log(
    'Fix: use the JS-free disclosure variant instead —\n' +
      '     <details class="faq-item"><summary class="faq-question">Q</summary>\n' +
      '       <p class="faq-answer">A</p></details>\n' +
      '     See CLAUDE.md, "FAQ schema must mirror visible page content".'
  );
  console.log('');
}

if (driftPreExisting.length) {
  console.log(
    'Reported, not failed — schema answers already diverging from their own visible\n' +
      'answer at the merge base, on pages this branch touched:'
  );
  for (const d of driftPreExisting.slice(0, 10)) {
    console.log(`    · ${d.rel} — "${d.question.slice(0, 60)}" (+${d.extra} tokens)`);
  }
  if (driftPreExisting.length > 10) {
    console.log(`    … and ${driftPreExisting.length - 10} more`);
  }
  console.log('  Whole-site picture: npm run audit:faq-schema');
  console.log('');
}

if (!flagged.length && !unbound.length && !driftFlagged.length) {
  console.log('Every FAQ schema question on the changed pages is visible, and no');
  console.log('schema answer claims content its own visible answer omits. ✓');
  process.exit(0);
}

for (const d of driftFlagged) {
  console.log(
    `✗ ${d.rel} — this branch left the JSON-LD answer claiming content the page does not show:`
  );
  console.log(`    Q: ${d.question}`);
  console.log(
    `    content tokens in the schema answer but not in its own visible answer: ` +
      `${d.before} at the merge base -> ${d.after} now`
  );
  console.log('');
}

if (driftFlagged.length) console.log(
  'Fix: make the two copies say the same thing. Either side may be the one that moved —\n' +
    '     the JSON-LD grew a sentence the page never renders, or the visible answer was\n' +
    '     trimmed and the JSON-LD kept the old wording. Render the missing content, or\n' +
    '     drop it from the JSON-LD. Google compares the actual strings; paraphrase is not\n' +
    '     a match. See CLAUDE.md, "FAQ schema must mirror visible page content".'
);

for (const f of flagged) {
  const label =
    f.status === 'no-visible-faq'
      ? 'ships FAQ schema but NO question is visible on the page'
      : `ships FAQ schema with ${f.missingQuestions.length} question(s) not visible on the page`;
  console.log(`✗ ${f.rel} ${label}:`);
  for (const q of f.missingQuestions) console.log(`    · ${q}`);
  console.log('');
}

if (flagged.length) console.log(
  'Fix: render the Q&A on the page (house style: .faq-item > .faq-question + .faq-answer),\n' +
    '     or remove the unmatched questions from the JSON-LD. Schema must mirror visible\n' +
    '     content — see CLAUDE.md, "FAQ schema must mirror visible page content".\n' +
    '     Whole-site picture: npm run audit:faq-schema'
);
process.exit(1);
