#!/usr/bin/env node
'use strict';

/**
 * build-style-coverage.js
 *
 * Writes js/style-coverage.js: for every style in styles.js and every plain
 * letter and digit, whether the style converts it, keeps it plain, changes its
 * case or respells it. script.js reads the table for the per-card coverage
 * line on pages that set window.UTG_COVERAGE_LINE ("Q stays a regular letter
 * here.").
 *
 * The states come from running the real renderer over each character
 * (scripts/lib/style-coverage.js); nothing re-implements a style map. A style
 * edit without a regenerate leaves the table stale, which --check catches.
 *
 * Usage:
 *   node scripts/build-style-coverage.js            # write
 *   node scripts/build-style-coverage.js --check    # verify; exit 1 on drift, 2 when the file is missing
 *   npm run build:style-coverage
 *   npm run check:style-coverage
 */

const fs = require('fs');
const { OUTPUT, OUTPUT_REL, computeCoverage, renderFile } = require('./lib/style-coverage');

function main() {
  const check = process.argv.includes('--check');
  let expected;
  try {
    expected = renderFile(computeCoverage());
  } catch (err) {
    console.error(`UNKNOWN: could not compute the style coverage table: ${err.message}`);
    return 2;
  }

  if (!check) {
    const before = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : null;
    if (before === expected) {
      console.log(`${OUTPUT_REL} is up to date.`);
      return 0;
    }
    fs.writeFileSync(OUTPUT, expected);
    console.log(`Wrote ${OUTPUT_REL}.`);
    return 0;
  }

  if (!fs.existsSync(OUTPUT)) {
    console.error(`UNKNOWN: ${OUTPUT_REL} is missing. Run \`npm run build:style-coverage\`.`);
    return 2;
  }
  const actual = fs.readFileSync(OUTPUT, 'utf8');
  if (actual === expected) {
    const rows = (expected.match(/^ {6}"[^"]+": "[cpkr]+",?$/gm) || []).length;
    console.log(`OK: ${OUTPUT_REL} matches styles.js and renderer.js (${rows} styles).`);
    return 0;
  }
  const a = actual.split('\n');
  const e = expected.split('\n');
  const diffs = [];
  for (let i = 0; i < Math.max(a.length, e.length) && diffs.length < 10; i++) {
    if (a[i] !== e[i]) diffs.push(`  line ${i + 1}\n    file:      ${a[i] === undefined ? '(none)' : a[i]}\n    generated: ${e[i] === undefined ? '(none)' : e[i]}`);
  }
  console.error(`DRIFT: ${OUTPUT_REL} does not match what styles.js and renderer.js produce now.`);
  console.error(diffs.join('\n'));
  console.error('Run `npm run build:style-coverage` and commit the result. Never edit the file by hand.');
  return 1;
}

process.exitCode = main();
