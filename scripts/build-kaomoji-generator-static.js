#!/usr/bin/env node
'use strict';

/**
 * build-kaomoji-generator-static.js
 *
 * Pre-renders the kaomoji generator's mood chips, starter presets and part
 * picker into `kaomoji-generator/index.html` as real static HTML.
 *
 * WHY
 * ---
 * The generator's whole interface used to be built by JavaScript into three
 * empty <div>s. A crawler that fetches HTML without executing JavaScript saw a
 * preview box, four buttons and an FAQ: no moods, no presets, no parts, so
 * nothing that made the page a kaomoji maker.
 *
 * HOW
 * ---
 * Nothing here re-implements the markup. The script evaluates
 * `js/kaomoji/kaomojiData.js`, slices the block between
 * `@kaomoji-markup:begin` / `:end` out of `js/kaomoji/kaomojiPageController.js`,
 * runs its `moodsHtml()` / `presetsHtml()` / `partsHtml()` over that data, and
 * writes the result between the `kaomoji-static:<name>` comment markers inside
 * each container. The controller adopts that markup at runtime, or builds it
 * from the same functions when it is missing, so the two cannot drift.
 *
 * It throws when a marker is missing rather than falling back to a local copy.
 *
 * Usage:
 *   node scripts/build-kaomoji-generator-static.js            # write
 *   node scripts/build-kaomoji-generator-static.js --check    # verify, exit 1 on drift
 *   npm run build:kaomoji-generator-static
 *   npm run check:kaomoji-generator-static
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'kaomoji-generator', 'index.html');
const DATA_JS = path.join(ROOT, 'js', 'kaomoji', 'kaomojiData.js');
const CONTROLLER_JS = path.join(ROOT, 'js', 'kaomoji', 'kaomojiPageController.js');

const BEGIN = '/* @kaomoji-markup:begin */';
const END = '/* @kaomoji-markup:end */';

/* container id -> [static marker name, markup function] */
const REGIONS = [
  ['kaomojiMoods', 'moods', 'moodsHtml'],
  ['kaomojiPresets', 'presets', 'presetsHtml'],
  ['kaomojiParts', 'parts', 'partsHtml'],
];

function loadMarkup() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(DATA_JS, 'utf8'), sandbox, { filename: DATA_JS });
  const DATA = sandbox.window.UTG_KAOMOJI_DATA;
  if (!DATA || !DATA.MOODS || !DATA.PARTS || !DATA.PRESETS) {
    throw new Error(`${path.relative(ROOT, DATA_JS)} did not define window.UTG_KAOMOJI_DATA with MOODS, PARTS and PRESETS`);
  }

  const src = fs.readFileSync(CONTROLLER_JS, 'utf8');
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(`${path.relative(ROOT, CONTROLLER_JS)}: markers ${BEGIN} / ${END} not found`);
  }
  const block = src.slice(b + BEGIN.length, e);

  const ctx = { DATA, t: (key, fallback) => fallback, out: {} };
  vm.createContext(ctx);
  vm.runInContext(
    block + '\nout.moodsHtml = moodsHtml; out.presetsHtml = presetsHtml; out.partsHtml = partsHtml;',
    ctx,
    { filename: 'kaomojiPageController.js (markup block)' }
  );
  return ctx.out;
}

function render(html, markup) {
  let next = html;
  for (const [id, name, fn] of REGIONS) {
    const open = `<!-- kaomoji-static:${name}:begin -->`;
    const close = `<!-- kaomoji-static:${name}:end -->`;
    const containerRe = new RegExp(`<div id="${id}"[^>]*>`);
    const m = containerRe.exec(next);
    if (!m) throw new Error(`${path.relative(ROOT, PAGE)}: no <div id="${id}">`);

    const body = open + markup[fn]() + close;
    const start = m.index + m[0].length;
    if (next.startsWith(open, start)) {
      const stop = next.indexOf(close, start);
      if (stop === -1) throw new Error(`${path.relative(ROOT, PAGE)}: ${open} has no ${close}`);
      next = next.slice(0, start) + body + next.slice(stop + close.length);
    } else if (next.startsWith('</div>', start)) {
      // First build: the container is still empty.
      next = next.slice(0, start) + body + next.slice(start);
    } else {
      throw new Error(`${path.relative(ROOT, PAGE)}: <div id="${id}"> holds content outside the ${open} markers`);
    }
  }
  return next;
}

function main() {
  const check = process.argv.includes('--check');
  const rel = path.relative(ROOT, PAGE);
  const html = fs.readFileSync(PAGE, 'utf8');
  const next = render(html, loadMarkup());

  if (check) {
    if (next !== html) {
      console.error(`DRIFT ${rel} — the static kaomoji picker does not match js/kaomoji/. Run: npm run build:kaomoji-generator-static`);
      process.exit(1);
    }
    console.log(`ok    ${rel} — static moods, presets and parts are current`);
    return;
  }
  if (next === html) {
    console.log(`ok    ${rel} — already current`);
    return;
  }
  fs.writeFileSync(PAGE, next);
  console.log(`wrote ${rel} — static moods, presets and parts`);
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(2);
}
