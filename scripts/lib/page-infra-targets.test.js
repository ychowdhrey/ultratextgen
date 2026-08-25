#!/usr/bin/env node
'use strict';

// node scripts/lib/page-infra-targets.test.js
//
// Locks the page-selection rule that check-gtm.js / check-ads.js /
// check-funding-choices.js share. No DOM, no dependencies, no runner — same
// idiom as scripts/lib/content-significance.test.js and
// js/counter/counterRules.test.js.
//
// The case that earns this file: a search-engine verification stub must stay
// skipped. When Naver's landed in the repo root (PR #793) it turned all three
// checks red site-wide, and `validate` failed on every open PR until the
// exemption shipped. That exemption now has exactly one home, so it gets
// exactly one test.

const path = require('path');
const {
  shouldSkipPath,
  isVerificationStub,
  SKIP_SEGMENTS,
  SKIP_DIRS
} = require('./page-infra-targets');

const ROOT = path.resolve(__dirname, '../..');
const at = (rel) => path.join(ROOT, rel);

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}  expected=${expected} got=${actual}`);
  }
}

/* ---- real pages are checked, not skipped ---------------------------------- */
check('homepage is a page', shouldSkipPath(at('index.html'), ROOT), false);
check('locale homepage is a page', shouldSkipPath(at('id/index.html'), ROOT), false);
check('library page is a page',
  shouldSkipPath(at('library/emoji-combos/index.html'), ROOT), false);
check('symbol page is a page',
  shouldSkipPath(at('symbol/euro-sign/index.html'), ROOT), false);
check('answers page is a page',
  shouldSkipPath(at('answers/what-font-does-tiktok-use/index.html'), ROOT), false);

/* ---- non-pages are skipped by path ---------------------------------------- */
check('embed dir is skipped', shouldSkipPath(at('embed/index.html'), ROOT), true);
check('node_modules is skipped',
  shouldSkipPath(at('node_modules/pkg/readme.html'), ROOT), true);
check('data dir is skipped', shouldSkipPath(at('data/thing.html'), ROOT), true);
check('functions dir is skipped', shouldSkipPath(at('functions/x.html'), ROOT), true);
check('.test. filename is skipped',
  shouldSkipPath(at('js/counter/counter.test.html'), ROOT), true);
check('nested embed segment is skipped',
  shouldSkipPath(at('some/deep/widget/page.html'), ROOT), true);

/* ---- a page is not skipped just because a word appears mid-segment --------- */
check('"embedded" in a slug is NOT a skip',
  shouldSkipPath(at('guide/embedded-fonts/index.html'), ROOT), false);
check('"latest" containing "test" is NOT a skip',
  shouldSkipPath(at('updates/latest/index.html'), ROOT), false);

/* ---- SKIP_SEGMENTS matches whole segments, which makes two entries inert ---
   '404' and '_root' only ever match a path segment that IS exactly that — a
   directory named 404/, or an extensionless file. They do NOT match the files
   404.html and _root.html, both of which ship in this repo and are therefore
   CHECKED, and both of which carry the tags and pass. That is long-standing
   behaviour, asserted here so a future "the skip list looks broken" tidy-up
   has to notice it is silently dropping two live pages from coverage before
   it changes anything. */
check('404.html is checked, not skipped', shouldSkipPath(at('404.html'), ROOT), false);
check('_root.html is checked, not skipped', shouldSkipPath(at('_root.html'), ROOT), false);
check('a directory literally named 404/ IS skipped',
  shouldSkipPath(at('404/index.html'), ROOT), true);

/* ---- verification stubs are skipped by content ---------------------------- */
check('naver stub is a stub',
  isVerificationStub('naver-site-verification: naverfc08aab.html'), true);
check('google stub is a stub',
  isVerificationStub('google-site-verification: googlea1b2c3.html'), true);
check('yandex stub is a stub',
  isVerificationStub('yandex-site-verification: 1a2b3c4d.html'), true);
check('leading whitespace still matches',
  isVerificationStub('\n  naver-site-verification: x.html\n'), true);

/* ---- and a real page is never mistaken for one ---------------------------- */
check('an HTML document is not a stub',
  isVerificationStub('<!DOCTYPE html>\n<html lang="en">'), false);
check('prose mentioning site-verification is not a stub',
  isVerificationStub('<p>Add a google-site-verification: token to your root.</p>'), false);
check('empty file is not a stub', isVerificationStub(''), false);

/* ---- the shipped Naver file itself, end to end ---------------------------- */
{
  const fs = require('fs');
  const { globSync } = require('glob');
  const stubs = globSync('*.html', { cwd: ROOT, absolute: true })
    .filter((f) => !shouldSkipPath(f, ROOT))
    .filter((f) => isVerificationStub(fs.readFileSync(f, 'utf8')));
  // The repo currently ships exactly one: Naver's. If a second engine's file
  // is added it should land here too — that is the point of the rule.
  check('every root-level verification stub is exempted', stubs.length >= 1, true);
}

/* ---- the constants are still the ones the checks were written against ----- */
check('SKIP_SEGMENTS unchanged',
  SKIP_SEGMENTS.join(','), 'embed,widget,test,demo,404,_root');
check('SKIP_DIRS unchanged',
  SKIP_DIRS.join(','), 'node_modules,reports,data,functions,fonts');

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
