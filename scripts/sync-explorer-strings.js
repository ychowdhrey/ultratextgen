#!/usr/bin/env node
'use strict';

/**
 * sync-explorer-strings.js — keep symbol-explorer.js's UI_STRINGS table in
 * agreement with locales/<lang>.json, which is the site's source of truth for
 * runtime UI copy.
 *
 * Why this exists (2026-09-05). symbol-explorer.js runs on 3,605 library and
 * symbol pages and hand-maintains its own 28-locale string table, because
 * those pages deliberately do NOT load i18n.js: that would cost a ~30KB
 * locale-JSON fetch on the site's highest-traffic lane to read four short
 * strings. Giving those pages Save and Share meant the table needed four more
 * strings per locale — and hand-authoring 112 translations is exactly the
 * invention this repo's locale rules forbid.
 *
 * So the strings are HARVESTED, not written: every one already ships in
 * locales/<lang>.json (ui.copyButtons.save/saved/copy, ui.shareResult.label
 * and .imageTitle, ui.savedStyles.clearAll), translated when the generator's
 * own Save and Share shipped. This script copies them across and, run without
 * --write, fails when the two drift apart.
 *
 * The duplication is deliberate and bounded: locales/*.json stays the source,
 * this file is the only thing allowed to write the copy, and the check makes
 * the copy self-correcting. That is the same arrangement as the pre-rendered
 * library hub directories, which mirror data the hub also renders at runtime.
 *
 *   node scripts/sync-explorer-strings.js            # report drift, exit 1 if any
 *   node scripts/sync-explorer-strings.js --write    # apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'symbol-explorer.js');

/** symbol-explorer.js keys its table by PAGE_LANG, which is the first two
 *  characters of <html lang> — so zh-TW pages look up "zh". */
const FILE_FOR_LANG = { zh: 'zh-tw' };

/** key in UI_STRINGS  ->  dotted path in locales/<lang>.json's ui object */
const KEYS = {
  save: 'copyButtons.save',
  saved: 'copyButtons.saved',
  share: 'shareResult.label',
  shareImage: 'shareResult.imageTitle',
  clearAll: 'savedStyles.clearAll',
  copyLabel: 'copyButtons.copy'
};

/** English is the in-code fallback and ships no copyButtons block, by design
 *  (i18n.js returns early for "en"). Its values live in the source literal. */
const SKIP_LANGS = new Set(['en']);

function get(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

function localeStrings(lang) {
  const file = path.join(ROOT, 'locales', `${FILE_FOR_LANG[lang] || lang}.json`);
  if (!fs.existsSync(file)) return null;
  const ui = (JSON.parse(fs.readFileSync(file, 'utf8')).ui) || {};
  const out = {};
  for (const [key, dotted] of Object.entries(KEYS)) {
    const val = get(ui, dotted);
    if (typeof val === 'string' && val) out[key] = val;
  }
  return out;
}

/** Locate each `    <lang>: {` … matching `    }` entry in the UI_STRINGS
 *  object literal. Brace-counting rather than a regex, because each entry
 *  contains a nested `formats: { … }`. */
function entries(src) {
  const start = src.indexOf('  const UI_STRINGS = {');
  if (start === -1) throw new Error('UI_STRINGS literal not found in symbol-explorer.js');
  const found = [];
  const re = /\n {4}([a-z]{2}): \{/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(src))) {
    const lang = m[1];
    let i = m.index + m[0].length - 1; // at the opening brace
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) throw new Error(`unbalanced braces in UI_STRINGS entry "${lang}"`);
    found.push({ lang, open: m.index + m[0].length, close: i });
    re.lastIndex = i;
  }
  return found;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function currentValue(body, key) {
  const m = body.match(new RegExp(`\\b${key}: "((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : undefined;
}

function run(write) {
  let src = fs.readFileSync(TARGET, 'utf8');
  const drift = [];
  const missing = [];

  // Right-to-left so earlier offsets stay valid as we splice.
  const list = entries(src).reverse();

  for (const ent of list) {
    if (SKIP_LANGS.has(ent.lang)) continue;
    const want = localeStrings(ent.lang);
    if (!want) { missing.push(`${ent.lang}: no locales/*.json`); continue; }

    const body = src.slice(ent.open, ent.close);
    const patch = {};
    for (const key of Object.keys(KEYS)) {
      if (!(key in want)) { missing.push(`${ent.lang}.${key}: absent from locales JSON`); continue; }
      if (currentValue(body, key) !== want[key]) {
        drift.push(`${ent.lang}.${key}`);
        patch[key] = want[key];
      }
    }
    if (!write || !Object.keys(patch).length) continue;

    let next = body;
    for (const [key, val] of Object.entries(patch)) {
      const re = new RegExp(`(\\b${key}: )"(?:[^"\\\\]|\\\\.)*"`);
      if (re.test(next)) {
        next = next.replace(re, `$1"${esc(val)}"`);
      } else {
        // New key: insert before the entry's nested formats block, which is
        // always last, so the literal keeps its existing shape.
        next = next.replace(/(\n\s+formats: \{)/, `\n      ${key}: "${esc(val)}",$1`);
      }
    }
    src = src.slice(0, ent.open) + next + src.slice(ent.close);
  }

  if (write && drift.length) {
    fs.writeFileSync(TARGET, src);
    console.log(`sync-explorer-strings: updated ${drift.length} string(s) in symbol-explorer.js`);
  }

  if (missing.length) {
    console.log('\nNot available in locales/*.json (left as the English fallback):');
    missing.forEach((m) => console.log(`  - ${m}`));
  }

  if (!write) {
    if (drift.length) {
      console.error(`\nsymbol-explorer.js is out of sync with locales/*.json (${drift.length}):`);
      drift.forEach((d) => console.error(`  - ${d}`));
      console.error('\nFix: node scripts/sync-explorer-strings.js --write');
      return 1;
    }
    console.log('symbol-explorer.js UI strings agree with locales/*.json.');
  }
  return 0;
}

process.exit(run(process.argv.includes('--write')));
