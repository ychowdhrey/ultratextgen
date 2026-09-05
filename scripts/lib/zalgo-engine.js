'use strict';

/**
 * zalgo-engine.js
 *
 * Loads the zalgo generator's PURE engine (mark pools, generateZalgo, the
 * cascade generator and the unzalgo decoder) out of the shipped widget,
 * usecase/zalgo-text/zalgo-text.js, for headless use in Node.
 *
 * WHY SLICE INSTEAD OF REQUIRE
 * ----------------------------
 * The widget is an IIFE that touches `document` at boot, so it cannot be
 * required. And the site's rule for every check here is that the site is the
 * authority: check-zalgo-decodes.js used to lift the decoder's regex out of
 * the file with a matcher, because a second copy of that range list would
 * drift from the first, which is the class of bug the check exists to catch.
 * This module is that same idea generalised: the block between the two
 * `@zalgo-engine` markers in the widget is evaluated in a fresh VM context,
 * and the functions users actually run are what the tests and gates call.
 *
 * If the markers are missing (someone refactored the widget), this throws
 * rather than returning a stale reimplementation.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const GENERATOR_JS = path.join(ROOT, 'usecase', 'zalgo-text', 'zalgo-text.js');
const BEGIN = '/* @zalgo-engine:begin */';
const END = '/* @zalgo-engine:end */';

/** The bindings the sliced block must define; the factory returns exactly these. */
const EXPORTS = [
  'MARKS_UP', 'MARKS_MID', 'MARKS_DOWN', 'CHAR_TYPE_MAP', 'generateZalgo',
  'CASCADE_MARKS', 'CASCADE_DEFAULT_MARK', 'CASCADE_ANCHOR', 'CASCADE_DEPTH',
  'CASCADE_PLACEMENTS', 'CASCADE_ANCHORS', 'generateCascade', 'decodeZalgo'
];

function loadZalgoEngine(file) {
  const src = fs.readFileSync(file || GENERATOR_JS, 'utf8');
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    throw new Error(
      `Could not find the ${BEGIN} … ${END} block in ${path.relative(ROOT, file || GENERATOR_JS)}.\n` +
        'If the widget was refactored, move the markers with it. Do NOT reimplement the engine here.'
    );
  }
  const body = src.slice(b + BEGIN.length, e);
  const script = new vm.Script(
    `(function () { 'use strict';\n${body}\nreturn { ${EXPORTS.join(', ')} }; })()`,
    { filename: 'zalgo-text.js#engine' }
  );
  return script.runInNewContext({});
}

module.exports = { loadZalgoEngine, GENERATOR_JS, BEGIN, END, EXPORTS };
