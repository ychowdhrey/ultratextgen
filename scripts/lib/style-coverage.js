'use strict';

/**
 * scripts/lib/style-coverage.js
 *
 * The one definition of what a style does to each plain letter and digit.
 * Used by scripts/build-style-coverage.js (write and --check) and by
 * script.coverage-line.test.js, so the generated table and its tests can never
 * disagree about a state.
 *
 * Nothing here re-implements a style. Each character is run through the real
 * renderer (`renderAny` from renderer.js over the registry in styles.js), both
 * loaded unchanged into a fresh VM context, and the output is classified:
 *
 *   c  converted     the style changed the character (any non-ASCII output,
 *                    or the character kept inside an ASCII wrapper like [A])
 *   p  kept plain    the output is the character exactly as typed
 *   k  case changed  the output is the same letter in the other case: plain
 *                    (S -> s) or styled the same as the other case in a style
 *                    that otherwise keeps capitals and small letters apart
 *                    (superscript F -> the small superscript f)
 *   r  respelled     the output is other plain ASCII without the character
 *                    (M -> W, S -> $, or the character dropped)
 *
 * A style whose output for a character depends on its neighbours (word
 * wrappers, alternating styles, reversal, title or sentence case) is listed
 * as contextual: its per-character states are still recorded, but they do not
 * describe a typed word, so the live line stays silent for it.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const STYLES_JS = path.join(ROOT, 'styles.js');
const RENDERER_JS = path.join(ROOT, 'renderer.js');
const OUTPUT_REL = 'js/style-coverage.js';
const OUTPUT = path.join(ROOT, OUTPUT_REL);

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const CHARS = UPPER + LOWER + DIGITS;

// Words that expose context: case, word boundaries, spaces, digits, repeats.
const CONTEXT_PROBES = [
  'Quick',
  'hello World',
  'ABC xyz 123',
  'The Quick Brown Fox Jumps Over 2 Lazy Dogs',
  'aAbBcC09',
];

function loadRenderer() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(STYLES_JS, 'utf8'), sandbox, { filename: STYLES_JS });
  vm.runInContext(fs.readFileSync(RENDERER_JS, 'utf8'), sandbox, { filename: RENDERER_JS });
  const styles = sandbox.textStyles;
  const render = sandbox.UltraTextGenRender;
  if (!styles || typeof styles !== 'object' || !Object.keys(styles).length) {
    throw new Error('styles.js did not define window.textStyles');
  }
  if (!render || typeof render.renderAny !== 'function') {
    throw new Error('renderer.js did not define window.UltraTextGenRender.renderAny');
  }
  return { styles, renderAny: (text, style) => String(render.renderAny(text, style) ?? '') };
}

function swapCase(ch) {
  const lower = ch.toLowerCase();
  return lower === ch ? ch.toUpperCase() : lower;
}

const isAscii = (s) => /^[\x00-\x7f]*$/.test(s);
const stripSpace = (s) => s.replace(/\s+/g, '');

function classifyStyle(style, renderAny) {
  const out = {};
  for (const ch of CHARS) out[ch] = renderAny(ch, style);

  // Does this style keep capitals and small letters apart? Small caps, the
  // redaction blocks and most non-Latin alphabets map both cases to one form
  // by design; there a shared form is the style, not a case change.
  let distinctPairs = 0;
  for (let i = 0; i < 26; i++) if (out[UPPER[i]] !== out[LOWER[i]]) distinctPairs++;
  const keepsCase = distinctPairs > 13;

  let states = '';
  for (const ch of CHARS) {
    const o = out[ch];
    const isLetter = /[A-Za-z]/.test(ch);
    const other = isLetter ? swapCase(ch) : null;
    let state;
    if (o === ch) state = 'p';
    else if (other && o === other) state = 'k';
    else if (isAscii(o) && !o.includes(ch)) state = 'r';
    else if (other && keepsCase && !isAscii(o) && o === out[other]) {
      // Both cases share one styled form, so one of the two lost its case.
      // A capital form (Lu) means the small letter did; anything else (a
      // small letter, or a modifier letter such as superscript f) means the
      // capital did.
      const isCapital = ch !== ch.toLowerCase();
      state = (/^\p{Lu}/u.test(o) ? !isCapital : isCapital) ? 'k' : 'c';
    }
    else state = 'c';
    states += state;
  }

  // Per-character answers describe a typed word only when the style works one
  // character at a time. Spacing between letters is not context.
  const contextual = CONTEXT_PROBES.some((probe) =>
    stripSpace(renderAny(probe, style)) !== stripSpace(Array.from(probe).map((c) => renderAny(c, style)).join('')));

  return { states, contextual };
}

function computeCoverage() {
  const { styles, renderAny } = loadRenderer();
  const table = {};
  const contextual = [];
  const seen = new Map();
  for (const [name, style] of Object.entries(styles)) {
    const slug = style && style.slug;
    if (!slug || typeof slug !== 'string') throw new Error(`style "${name}" has no slug`);
    if (seen.has(slug)) throw new Error(`slug "${slug}" is used by both "${seen.get(slug)}" and "${name}"`);
    seen.set(slug, name);
    const row = classifyStyle(style, renderAny);
    table[slug] = row.states;
    if (row.contextual) contextual.push(slug);
  }
  return { chars: CHARS, states: table, contextual };
}

function renderFile(coverage) {
  const lines = [];
  lines.push('/* GENERATED by scripts/build-style-coverage.js from styles.js and renderer.js.');
  lines.push(' * Do not edit by hand: run `npm run build:style-coverage`; `npm run check:style-coverage`');
  lines.push(' * fails on drift.');
  lines.push(' *');
  lines.push(' * For each style (by registry slug), one state per character of `chars`:');
  lines.push(' *   c converted, p kept plain, k case changed, r respelled.');
  lines.push(' * `contextual` lists styles whose output for a character depends on its');
  lines.push(' * neighbours; their rows do not describe a typed word.');
  lines.push(' * Read by script.js for the per-card coverage line (window.UTG_COVERAGE_LINE). */');
  lines.push('(function () {');
  lines.push('  "use strict";');
  lines.push('  window.UTG_STYLE_COVERAGE = {');
  lines.push(`    chars: ${JSON.stringify(coverage.chars)},`);
  lines.push('    states: {');
  const slugs = Object.keys(coverage.states);
  slugs.forEach((slug, i) => {
    lines.push(`      ${JSON.stringify(slug)}: ${JSON.stringify(coverage.states[slug])}${i < slugs.length - 1 ? ',' : ''}`);
  });
  lines.push('    },');
  lines.push('    contextual: [');
  coverage.contextual.forEach((slug, i) => {
    lines.push(`      ${JSON.stringify(slug)}${i < coverage.contextual.length - 1 ? ',' : ''}`);
  });
  lines.push('    ]');
  lines.push('  };');
  lines.push('})();');
  return lines.join('\n') + '\n';
}

module.exports = {
  OUTPUT,
  OUTPUT_REL,
  CHARS,
  loadRenderer,
  classifyStyle,
  computeCoverage,
  renderFile,
};
