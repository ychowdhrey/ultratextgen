#!/usr/bin/env node
/* check-case-policy.js — every case-converter page states which case rules it
   runs, and a new one gets its language's rules by default.

   renderer.js applies the locale case policy only to a page whose <html>
   carries data-case-policy="locale" (see the LOCALE CASE POLICY block there).
   The opt-in is what keeps protected pages byte-identical; this gate is what
   keeps a new page from silently missing it.

   State checks (every case-converter page):
   - data-case-policy, when present, is "locale" or "legacy";
   - "locale" names a language renderer.js has a verified policy for
     (UltraTextGenRender.casePolicyLanguages, base language accepted);
   - data-case-policy on a page that is not a case-converter page is reported:
     it does nothing there.
   Delta check (pages added since the merge base):
   - a new case-converter page must declare data-case-policy;
   - a new page in a verified language must declare "locale". "legacy" is for
     a language with no verified policy, and is a decision to record.
   Pages that existed at the merge base without the attribute are reported,
   never failed: some are protected and stay on the old code on purpose.

   Usage: node scripts/check-case-policy.js [--base origin/main] [--inventory]
   Exit:  0 pass · 1 fail · 2 UNKNOWN (renderer or git base unreadable) */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, FAMILY_RE, readPolicyAttr, listCaseConverterPages, trackedHtml, evaluatePage } = require('./lib/case-policy-pages');
const { loadRenderer } = require('./lib/case-policy-harness');

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

function git(a, opts = {}) { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', ...opts }); }

function resolveMergeBase(base) {
  try { git(['rev-parse', '--verify', base], { stdio: 'ignore' }); } catch {
    const branch = base.replace(/^origin\//, '');
    try { git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' }); base = `origin/${branch}`; } catch (e) {
      return null;
    }
  }
  try { return git(['merge-base', base, 'HEAD']).trim(); } catch { return null; }
}

function main() {
  let verified;
  try {
    verified = new Set(loadRenderer().api.casePolicyLanguages || []);
  } catch (e) {
    console.error(`case-policy: UNKNOWN — renderer.js could not be loaded (${e.message})`);
    return 2;
  }
  if (!verified.size) { console.error('case-policy: UNKNOWN — renderer.js exports no casePolicyLanguages'); return 2; }
  const isVerified = lang => verified.has(lang.toLowerCase()) || verified.has(lang.toLowerCase().split('-')[0]);

  const pages = listCaseConverterPages();
  if (!pages.length) { console.error('case-policy: UNKNOWN — no case-converter pages found'); return 2; }

  if (args.includes('--inventory')) {
    console.log('file\tlang\tdata-case-policy\tverified-language');
    for (const p of pages) console.log(`${p.file}\t${p.lang}\t${p.policy || '(none)'}\t${isVerified(p.lang) ? 'yes' : 'no'}`);
    return 0;
  }

  const mergeBase = resolveMergeBase(requestedBase);
  if (!mergeBase) { console.error(`case-policy: UNKNOWN — no merge base with ${requestedBase}`); return 2; }
  const added = new Set(git(['diff', '--name-only', '--diff-filter=A', mergeBase, 'HEAD', '--', '*.html'])
    .split('\n').filter(Boolean));

  const errors = [];
  const notes = [];
  for (const p of pages) {
    const r = evaluatePage(p, added.has(p.file), isVerified);
    errors.push(...r.errors);
    notes.push(...r.notes);
  }

  // The attribute does nothing outside the case-converter family.
  for (const rel of trackedHtml()) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (readPolicyAttr(html) !== null && !FAMILY_RE.test(html)) {
      errors.push(`${rel}: data-case-policy on a page that is not a case-converter page (it has no effect there)`);
    }
  }

  console.log(`case-policy: ${pages.length} case-converter pages, ${pages.filter(p => p.policy === 'locale').length} on the locale policy, ` +
    `${added.size} HTML files added since ${mergeBase.slice(0, 8)}`);
  for (const n of notes) console.log(`  note: ${n}`);
  for (const e of errors) console.log(`  FAIL ${e}`);
  return errors.length ? 1 : 0;
}

process.exit(main());
