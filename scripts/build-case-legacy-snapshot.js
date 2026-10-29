#!/usr/bin/env node
/* build-case-legacy-snapshot.js — record what every page that does NOT opt in
   to the locale case policy renders today, so case-policy.test.js can prove the
   renderer change leaves those pages byte-identical.

   Usage:
     node scripts/build-case-legacy-snapshot.js --ref origin/main   # write fixture from a git ref's renderer.js
     node scripts/build-case-legacy-snapshot.js --diff origin/main  # print every input whose output differs from the ref

   The fixture stores one sha256 per (page language, case style) over the whole
   corpus, plus one per registry style for a page with no lang. It is a digest,
   not the outputs, to keep the file small; --diff names the inputs when a
   digest moves. Regenerate it only when a legacy output is meant to change,
   and say so in the PR. */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, loadRenderer, CASE_STYLES, PAGE_LANGS, CORPUS } = require('./lib/case-policy-harness');

const FIXTURE = path.join(ROOT, 'scripts/lib/fixtures/case-legacy-digests.json');

function sha(list) {
  return crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex');
}

function outputs(r) {
  const byLangStyle = {};
  for (const lang of PAGE_LANGS) {
    for (const s of CASE_STYLES) {
      byLangStyle[`${lang || '(none)'}|${s}`] = CORPUS.map(t => r.render(t, s, lang, null));
    }
  }
  const byStyle = {};
  for (const name of Object.keys(r.styles).sort()) {
    byStyle[name] = CORPUS.map(t => r.render(t, name, '', null));
  }
  return { byLangStyle, byStyle };
}

function refRenderer(ref) {
  const src = execFileSync('git', ['show', `${ref}:renderer.js`], { cwd: ROOT, encoding: 'utf8' });
  return loadRenderer(src);
}

function main() {
  const args = process.argv.slice(2);
  const refIdx = args.indexOf('--ref');
  const diffIdx = args.indexOf('--diff');
  if (refIdx >= 0) {
    const o = outputs(refRenderer(args[refIdx + 1]));
    const out = {
      note: 'Legacy (no data-case-policy) case outputs. See scripts/build-case-legacy-snapshot.js.',
      source_ref: execFileSync('git', ['rev-parse', args[refIdx + 1]], { cwd: ROOT, encoding: 'utf8' }).trim(),
      corpus_sha256: sha(CORPUS),
      by_lang_style: Object.fromEntries(Object.entries(o.byLangStyle).map(([k, v]) => [k, sha(v)])),
      by_style: Object.fromEntries(Object.entries(o.byStyle).map(([k, v]) => [k, sha(v)])),
    };
    fs.writeFileSync(FIXTURE, JSON.stringify(out, null, 1) + '\n');
    console.log(`wrote ${path.relative(ROOT, FIXTURE)}: ${Object.keys(out.by_lang_style).length} lang×case digests, ${Object.keys(out.by_style).length} style digests`);
    return 0;
  }
  if (diffIdx >= 0) {
    const a = outputs(refRenderer(args[diffIdx + 1]));
    const b = outputs(loadRenderer());
    let n = 0;
    for (const group of ['byLangStyle', 'byStyle']) {
      for (const k of Object.keys(a[group])) {
        (a[group][k] || []).forEach((v, i) => {
          const w = (b[group][k] || [])[i];
          if (v !== w) { n++; console.log(`${k} ${JSON.stringify(CORPUS[i])}: ${JSON.stringify(v)} -> ${JSON.stringify(w)}`); }
        });
      }
    }
    console.log(`${n} differing outputs`);
    return n ? 1 : 0;
  }
  console.error('usage: --ref <git ref> | --diff <git ref>');
  return 2;
}
process.exit(main());
