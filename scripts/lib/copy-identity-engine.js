'use strict';

/**
 * copy-identity-engine.js
 *
 * Loads the PURE copy-identity engine (the Unicode block table, the
 * modifier-codepoint predicate, blockName() and copyIdentity()) out of the
 * shipped header.js, for headless use in Node.
 *
 * WHY SLICE INSTEAD OF REQUIRE — the same reasoning as
 * scripts/lib/zalgo-engine.js, which this mirrors deliberately rather than
 * inventing a second mechanism. header.js is an IIFE that touches `document`
 * and `window.location` at boot, so it cannot be required; and a second copy
 * of a 120-entry Unicode block table in a test would drift from the shipped
 * one, which is exactly the failure this repo has documented repeatedly.
 *
 * If the markers are missing (someone refactored header.js), this throws
 * rather than returning a stale reimplementation.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const HEADER_JS = path.join(ROOT, 'header.js');
const BEGIN = '/* @copy-identity:begin */';
const END = '/* @copy-identity:end */';

/** The bindings the sliced block must define; the factory returns exactly these. */
const EXPORTS = ['COPY_BLOCKS', 'isModifierCp', 'blockName', 'copyIdentity'];

function loadCopyIdentity(file) {
  const target = file || HEADER_JS;
  const src = fs.readFileSync(target, 'utf8');
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(
      `Could not find the ${BEGIN} … ${END} block in ${path.relative(ROOT, target)}.\n` +
        'If header.js was refactored, move the markers with it. Do NOT reimplement the engine here.'
    );
  }
  const body = src.slice(b + BEGIN.length, e);
  const script = new vm.Script(
    `(function () { 'use strict';\n${body}\nreturn { ${EXPORTS.join(', ')} }; })()`,
    { filename: 'header.js#copy-identity' }
  );
  return script.runInNewContext({});
}

module.exports = { loadCopyIdentity, HEADER_JS, BEGIN, END, EXPORTS };
