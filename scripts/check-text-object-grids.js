#!/usr/bin/env node
'use strict';
/**
 * check-text-object-grids.js — every `.flag-rows` grid carries the layout its
 * contents need.
 *
 * `.flag-emoji` tiles are drawn for ONE visual character: `.symbol-tile`'s
 * `aspect-ratio: 1` makes each a 43x43 target. Put a kaomoji through the same
 * tile and the box grows as tall as it is wide, the expression overflows its
 * sixth-of-a-row cell, and on a phone it wraps mid-face. A grid holding such
 * text objects carries `flag-rows--text` and gets the expression-card layout
 * in symbol-explorer.css instead.
 *
 * This checks, whole-tree, that the class is present exactly where the
 * contents call for it, both ways:
 *   - MISSING: a grid holding a text object is still in the glyph layout
 *     (a new hand-built locale page, or a spec gaining an expression);
 *   - STALE: a grid marked for text holds only glyphs, so it lost its
 *     43x43 glyph targets for nothing.
 *
 * Whole-tree rather than diff-scoped: the definition lives in
 * symbol-explorer.js, and a change to it re-classifies pages the PR never
 * touched. The scan is a regex pass over static HTML and takes seconds.
 *
 * Usage:
 *   node scripts/check-text-object-grids.js            # report, exit 1 on drift
 *   node scripts/check-text-object-grids.js --write    # repair in place
 *   node scripts/check-text-object-grids.js --write path/a.html path/b.html
 *   node scripts/check-text-object-grids.js --stdin < page.html  # prints it fixed
 *     (what generate_library_page_from_spec.py pipes a page through before
 *     writing it, so the generator has no second copy of the rule)
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const lib = require('./lib/text-object-grid.js');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--stdin')) {
  process.stdout.write(lib.applyClasses(fs.readFileSync(0, 'utf8')).html);
  process.exit(0);
}

const write = args.includes('--write');
const explicit = args.filter((a) => !a.startsWith('--'));

let files;
if (explicit.length) {
  files = explicit.map((f) => path.relative(ROOT, path.resolve(f)));
} else {
  try {
    files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    console.error(`UNKNOWN: could not list tracked HTML (${e.message}). Nothing was checked.`);
    process.exit(3);
  }
}
files = files.filter((f) => !f.startsWith('node_modules/') && fs.existsSync(path.join(ROOT, f)));
if (!files.length) {
  console.error('UNKNOWN: no HTML files to check. Nothing was checked.');
  process.exit(3);
}

let grids = 0;
let textGrids = 0;
const missing = [];
const stale = [];
let repaired = 0;

for (const f of files) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!html.includes('flag-rows')) continue;
  const found = lib.findGrids(html);
  for (const g of found) {
    grids++;
    if (g.shouldHaveClass) textGrids++;
    if (g.shouldHaveClass && !g.hasClass) missing.push({ f, sample: g.textObjects.slice(0, 3) });
    if (!g.shouldHaveClass && g.hasClass) stale.push({ f });
  }
  if (write) {
    const res = lib.applyClasses(html);
    if (res.changed) {
      fs.writeFileSync(path.join(ROOT, f), res.html);
      repaired += res.changed;
    }
  }
}

console.log('Text-object grid check (whole-tree)');
console.log(`  pages scanned:   ${files.length}`);
console.log(`  .flag-rows grids: ${grids} (${textGrids} hold text objects)`);

if (!grids) {
  console.log('\nUNKNOWN: found no .flag-rows grid anywhere; the markup has moved. Nothing was checked.');
  process.exit(3);
}

if (write) {
  console.log(`\nRepaired ${repaired} grid(s).`);
  process.exit(0);
}

if (!missing.length && !stale.length) {
  console.log('\nEvery grid carries the layout its contents need. ✓');
  process.exit(0);
}

const show = (list, fmt) => {
  list.slice(0, 25).forEach((x) => console.log('  ' + fmt(x)));
  if (list.length > 25) console.log(`  … and ${list.length - 25} more`);
};
if (missing.length) {
  console.log(`\n${missing.length} grid(s) hold text objects but use the single-glyph layout:`);
  show(missing, (x) => `${x.f}  ${x.sample.map((s) => JSON.stringify(s)).join(' ')}`);
}
if (stale.length) {
  console.log(`\n${stale.length} grid(s) are marked flag-rows--text but hold only single glyphs:`);
  show(stale, (x) => x.f);
}
console.log(`\nA tile ${lib.TEXT_OBJECT_MIN_WIDTH}+ columns wide (kaomoji, combos, borders) cannot fit a glyph tile.`);
console.log('Fix:  npm run fix:text-object-grids   (then commit the pages)');
process.exit(1);
