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
  copyLabel: 'copyButtons.copy',
  // The two entry-button labels for "Select and share image" (2026-10-01).
  selectImage: 'imageSelection.selectImage',
  viewSelection: 'imageSelection.viewSelection'
};

/** The selection UI itself (js/share/image-selection.js) is loaded only when
 *  a visitor asks for an image, so its strings travel with it rather than in
 *  symbol-explorer.js, which every library page downloads. Same source, same
 *  check, second table. */
const SELECTION_KEYS = {};
['hint', 'count', 'empty', 'shareImage', 'downloadImage', 'cancel', 'preview', 'close',
  'remove', 'addAll', 'removeAll', 'limit', 'tooBig', 'making', 'shared', 'downloaded',
  'shareFailed', 'renderFailed', 'trayLabel', 'setUnavailable'].forEach((k) => { SELECTION_KEYS[k] = `imageSelection.${k}`; });

const TARGETS = [
  { file: path.join(ROOT, 'symbol-explorer.js'), keys: KEYS },
  { file: path.join(ROOT, 'js', 'share', 'image-selection.js'), keys: SELECTION_KEYS, createMissing: true }
];

/** English is the in-code fallback and ships no copyButtons block, by design
 *  (i18n.js returns early for "en"). Its values live in the source literal. */
const SKIP_LANGS = new Set(['en']);

function get(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

function localeStrings(lang, keys) {
  const file = path.join(ROOT, 'locales', `${FILE_FOR_LANG[lang] || lang}.json`);
  if (!fs.existsSync(file)) return null;
  const ui = (JSON.parse(fs.readFileSync(file, 'utf8')).ui) || {};
  const out = {};
  for (const [key, dotted] of Object.entries(keys)) {
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
  if (start === -1) throw new Error('UI_STRINGS literal not found');
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

/** Every locale this site ships a locales/<file>.json for, keyed the way
 *  UI_STRINGS is (zh-tw -> zh). */
function shippedLangs() {
  return fs.readdirSync(path.join(ROOT, 'locales'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .map((f) => (f === 'zh-tw' ? 'zh' : f))
    .filter((l) => !SKIP_LANGS.has(l));
}

/** Insert a whole new `    <lang>: { … }` entry before UI_STRINGS' closing
 *  brace. Only the selection table is built this way: it starts with English
 *  alone and gains one entry per locale from the JSON. */
function addEntry(src, lang, want, keys) {
  const start = src.indexOf('  const UI_STRINGS = {');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const body = Object.keys(keys).filter((k) => k in want)
    .map((k) => `      ${k}: "${esc(want[k])}"`).join(',\n');
  // i is UI_STRINGS' closing brace; the entry before it ends with "    }".
  const before = src.slice(0, i).replace(/\s*$/, '');
  return `${before},\n    ${lang}: {\n${body}\n    }\n  ${src.slice(i)}`;
}

function runTarget(target, write) {
  const label = path.relative(ROOT, target.file);
  let src = fs.readFileSync(target.file, 'utf8');
  const drift = [];
  const missing = [];

  // Right-to-left so earlier offsets stay valid as we splice.
  const list = entries(src).reverse();
  const present = new Set(list.map((e) => e.lang));

  for (const ent of list) {
    if (SKIP_LANGS.has(ent.lang)) continue;
    const want = localeStrings(ent.lang, target.keys);
    if (!want) { missing.push(`${ent.lang}: no locales/*.json`); continue; }

    const body = src.slice(ent.open, ent.close);
    const patch = {};
    for (const key of Object.keys(target.keys)) {
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
      } else if (/\n\s+formats: \{/.test(next)) {
        // New key: insert before the entry's nested formats block, which is
        // always last, so the literal keeps its existing shape.
        next = next.replace(/(\n\s+formats: \{)/, `\n      ${key}: "${esc(val)}",$1`);
      } else {
        // A table with no formats block: append as the entry's last key.
        next = next.replace(/\s*$/, '') + `,\n      ${key}: "${esc(val)}"\n    `;
      }
    }
    src = src.slice(0, ent.open) + next + src.slice(ent.close);
  }

  // A locale with a JSON file but no entry at all in a table that is built
  // from the JSON (the selection table): that is drift too.
  if (target.createMissing) {
    for (const lang of shippedLangs()) {
      if (present.has(lang)) continue;
      const want = localeStrings(lang, target.keys);
      if (!want || !Object.keys(want).length) continue;
      drift.push(`${lang}: whole entry`);
      if (write) src = addEntry(src, lang, want, target.keys);
    }
  }

  if (write && drift.length) {
    fs.writeFileSync(target.file, src);
    console.log(`sync-explorer-strings: updated ${drift.length} string(s) in ${label}`);
  }

  if (missing.length) {
    console.log(`\nNot available in locales/*.json for ${label} (left as the English fallback):`);
    missing.forEach((m) => console.log(`  - ${m}`));
  }

  if (!write) {
    if (drift.length) {
      console.error(`\n${label} is out of sync with locales/*.json (${drift.length}):`);
      drift.forEach((d) => console.error(`  - ${d}`));
      console.error('\nFix: node scripts/sync-explorer-strings.js --write');
      return 1;
    }
    console.log(`${label} UI strings agree with locales/*.json.`);
  }
  return 0;
}

function run(write) {
  let status = 0;
  for (const target of TARGETS) status = Math.max(status, runTarget(target, write));
  return status;
}

process.exit(run(process.argv.includes('--write')));
