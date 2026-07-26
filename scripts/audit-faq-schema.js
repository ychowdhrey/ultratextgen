#!/usr/bin/env node
'use strict';

/**
 * audit-faq-schema.js — whole-site dashboard for FAQ schema/content mismatch.
 *
 * Reports every page whose FAQPage/QAPage JSON-LD declares questions that are
 * not visible in the rendered body. See scripts/lib/faq-schema-audit.js for
 * what "visible" means and why it is shared with the PR gate.
 *
 * This is the discovery half; scripts/check-faq-schema.js is the diff-scoped
 * gate wired into CI. Unlike the gate, this scans the whole tree and so can
 * surface pre-existing backlog.
 *
 * Usage:
 *   node scripts/audit-faq-schema.js               # summary + offender list
 *   node scripts/audit-faq-schema.js --full        # list every missing question
 *   node scripts/audit-faq-schema.js --json out.json
 *   node scripts/audit-faq-schema.js --report out.md
 *   node scripts/audit-faq-schema.js --strict      # exit 1 if any violation
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { auditHtml } = require('./lib/faq-schema-audit');

const ROOT = path.resolve(__dirname, '..');
const IGNORE = ['node_modules/**', 'reports/**', '**/*.test.html'];

function parseArgs(argv) {
  const opts = { full: false, json: null, report: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') opts.full = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--json') opts.json = argv[++i];
    else if (arg === '--report') opts.report = argv[++i];
  }
  return opts;
}

function localeOf(relPath) {
  const first = relPath.split('/')[0];
  return /^[a-z]{2}(-[a-z]{2})?$/.test(first) ? first : 'en';
}

function run() {
  const opts = parseArgs(process.argv.slice(2));
  const files = globSync('**/*.html', { cwd: ROOT, ignore: IGNORE }).sort();

  const violations = [];
  let pagesWithSchema = 0;

  for (const rel of files) {
    const result = auditHtml(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    if (!result.hasFaqSchema) continue;
    pagesWithSchema++;
    if (result.status === 'ok') continue;
    violations.push({ file: rel, locale: localeOf(rel), ...result });
  }

  const noVisible = violations.filter((v) => v.status === 'no-visible-faq');
  const partial = violations.filter((v) => v.status === 'partial');
  const orphanQuestions = violations.reduce((n, v) => n + v.missingQuestions.length, 0);

  const lines = [];
  const say = (line = '') => lines.push(line);

  say('FAQ schema / visible-content audit');
  say('');
  say(`  Pages with FAQ schema        : ${pagesWithSchema}`);
  say(`  Schema with NO visible FAQ   : ${noVisible.length}`);
  say(`  Schema partially visible     : ${partial.length}`);
  say(`  Clean                        : ${pagesWithSchema - violations.length}`);
  say(`  Questions claimed but unseen : ${orphanQuestions}`);

  if (violations.length) {
    const byLocale = {};
    for (const v of violations) byLocale[v.locale] = (byLocale[v.locale] || 0) + 1;
    say('');
    say('  By locale:');
    for (const [locale, count] of Object.entries(byLocale).sort((a, b) => b[1] - a[1])) {
      say(`    ${locale.padEnd(6)} ${count}`);
    }
  }

  for (const [heading, group] of [
    ['Schema with NO visible FAQ (Google policy violation)', noVisible],
    ['Schema partially visible (stale/orphan questions)', partial]
  ]) {
    if (!group.length) continue;
    say('');
    say(`${heading} — ${group.length}`);
    for (const v of group) {
      say(`  ✗ ${v.file}  (${v.missingQuestions.length}/${v.totalQuestions} questions not on page)`);
      if (opts.full) {
        for (const q of v.missingQuestions) say(`      · ${q}`);
      }
    }
  }

  const answerGaps = violations
    .concat([])
    .filter((v) => v.answersMissing.length > 0);
  if (opts.full && answerGaps.length) {
    say('');
    say(`Advisory — visible question, but the schema answer has little counterpart in the body (${answerGaps.length})`);
    for (const v of answerGaps) say(`  · ${v.file} (${v.answersMissing.length})`);
  }

  say('');
  say(
    violations.length
      ? 'Fix: render the Q&A the schema claims, or drop the unmatched questions from the JSON-LD.'
      : 'Every FAQ schema question is visible on its page. ✓'
  );

  const output = lines.join('\n');
  console.log(output);

  if (opts.json) {
    fs.writeFileSync(
      path.resolve(opts.json),
      JSON.stringify({ pagesWithSchema, violations }, null, 2)
    );
    console.log(`\nJSON written to ${opts.json}`);
  }
  if (opts.report) {
    fs.writeFileSync(
      path.resolve(opts.report),
      `# FAQ schema / visible-content audit\n\n\`\`\`\n${output}\n\`\`\`\n`
    );
    console.log(`Report written to ${opts.report}`);
  }

  process.exit(opts.strict && violations.length ? 1 : 0);
}

run();
