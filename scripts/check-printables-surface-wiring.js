#!/usr/bin/env node
'use strict';

/**
 * check-printables-surface-wiring.js — every printables action surface the
 * engine reads must be one the mount logic and the export logic know about.
 *
 * THE INCIDENT. `printables/word-search-maker/`, `crossword-maker/` and
 * `word-scramble-maker/` shipped 2026-09-19/20 with **no print-settings panel
 * and no share row at all**. Their surfaces (`#pt-search-print`,
 * `#pt-cw-print`, `#pt-sc-print`) were wired into the engine's `el` map and
 * into their own builders, but were absent from the hand-ordered list
 * `buildPrintOptions()` used to choose its anchor. That list matched nothing,
 * the anchor resolved to null, the function returned at its first line — and
 * the panel, the share row, the saved strip and the recent strip are all
 * mounted there. The pages went on writing to the recent-sheets store that
 * nothing displayed.
 *
 * All 58 gating checks passed the whole time, and each was right to: the
 * markup is written by the engine at runtime, so there is nothing in the HTML
 * for a static check to miss. This gate does not look at pages. It compares
 * the engine against ITSELF — the surfaces it reads against the surfaces it
 * routes — which is where the inconsistency actually lives.
 *
 * WHOLE-FILE AND GATING, not diff-scoped and not informational. The backlog is
 * zero by construction after the 2026-09-22 repair, so there is nothing to be
 * permanently red against (the same call as check:share-save-tags), and the
 * file is one source file, so scoping the read to a diff would buy nothing and
 * could miss a surface added by a PR that edits only its own section.
 *
 *   node scripts/check-printables-surface-wiring.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.join(ROOT, 'js/printables/printablesEngine.js');

/* `#pt-name-png-transparent` is a deliberate ALTERNATE of `#pt-name-png`, not a
   second sheet: the graffiti pages offer a transparent-background copy of the
   same PNG the primary button writes. `pngExportTarget()` routes the primary
   and must not prefer the variant, so this one key is exempt by name and by
   reason rather than by a pattern that would silently exempt a future
   `somethingPng2`. If a second genuine variant ever appears, add it here with
   its own reason — this is the whole exemption surface. */
const PNG_VARIANTS = new Map([
  ['namePngT', 'transparent-background alternate of namePng, same sheet'],
]);

function readEngine() {
  if (!fs.existsSync(ENGINE)) {
    console.error(`UNKNOWN: ${path.relative(ROOT, ENGINE)} not found — nothing was compared.`);
    process.exit(2);
  }
  return fs.readFileSync(ENGINE, 'utf8');
}

/* The `el = { ... }` map, sliced by brace depth rather than by a regex over
   the whole file: several later functions also contain `$("#pt-...")` calls,
   and matching those would report surfaces the map never declared. */
function elBlock(src) {
  const start = src.indexOf('const el = {');
  if (start === -1) return null;
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

/* The body of a named top-level function, same brace walk. Returning null
   rather than an empty string matters: an empty body would make every surface
   look unrouted, and a RENAMED function would then report eleven false
   defects instead of the one real "this check can no longer see its subject". */
function functionBody(src, name) {
  const sig = `function ${name}(`;
  const at = src.indexOf(sig);
  if (at === -1) return null;
  let depth = 0;
  for (let i = src.indexOf('{', at); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(at, i + 1); }
  }
  return null;
}

/* Keys in the el map of the form `somethingPrint: $("#pt-...")`.
   `word` is matched ANYWHERE in the key, not as a suffix: `namePngT` does not
   end in "Png", so a suffix match dropped it from the set entirely and the
   PNG_VARIANTS exemption above was inert — it excluded a key the scan never
   produced, and the summary line under-counted by one. Found by reading the
   count rather than the code, which is the repo's own "confirm structure, not
   syntax" lesson arriving inside a check written to enforce it. The id must
   still name the matching kind of control, so a key like `pngHint` cannot
   creep in. */
function keysMatching(block, word) {
  const out = [];
  const re = new RegExp(`(\\w*${word}\\w*)\\s*:\\s*\\$\\((['"])(#pt-[^'"]+)\\2\\)`, 'g');
  const wantId = word.toLowerCase();
  let m;
  while ((m = re.exec(block)) !== null) {
    if (!m[3].toLowerCase().includes(wantId)) continue;
    out.push({ key: m[1], id: m[3] });
  }
  return out;
}

const src = readEngine();
const errors = [];
const unknown = [];

const block = elBlock(src);
if (!block) unknown.push('the `const el = { … }` map could not be located');

const anchor = functionBody(src, 'firstActionSurface');
if (!anchor) unknown.push('firstActionSurface() could not be located');

const pngTarget = functionBody(src, 'pngExportTarget');
if (!pngTarget) unknown.push('pngExportTarget() could not be located');

/* Fail closed. A renamed function or a restructured map means this check has
   lost sight of its subject, which is NOT the same as finding nothing wrong —
   the distinction this repo has paid for six times. */
if (unknown.length) {
  console.error('UNKNOWN — printables surface wiring was NOT verified:');
  unknown.forEach((u) => console.error(`  - ${u}`));
  console.error('\nThis check reads printablesEngine.js structurally. If you renamed or');
  console.error('restructured one of the above, update this script in the same change.');
  process.exit(2);
}

// Rule 1 — every action surface is one the panel/share mount can anchor on.
const printSurfaces = keysMatching(block, 'Print');
for (const s of printSurfaces) {
  if (!new RegExp(`\\bel\\.${s.key}\\b`).test(anchor)) {
    errors.push(
      `firstActionSurface() does not consider el.${s.key} (${s.id}).\n` +
      `      A page whose only action surface is that one gets NO print-settings panel,\n` +
      `      NO share row, and NO recent-sheets strip — all four mount in buildPrintOptions(),\n` +
      `      which returns early when its anchor is null. Add el.${s.key} to the list in\n` +
      `      firstActionSurface().`
    );
  }
}

// Rule 2 — every primary PNG surface is one "Share as image" can reach.
const pngSurfaces = keysMatching(block, 'Png');
for (const s of pngSurfaces) {
  if (PNG_VARIANTS.has(s.key)) continue;
  if (!new RegExp(`\\bel\\.${s.key}\\b`).test(pngTarget)) {
    errors.push(
      `pngExportTarget() does not consider el.${s.key} (${s.id}).\n` +
      `      "Share as image" is gated on that function, so the button is not rendered\n` +
      `      on a page whose only PNG builder is this one. Add el.${s.key} to\n` +
      `      pngExportTarget(), or record it in PNG_VARIANTS with its reason if it is an\n` +
      `      alternate of a surface already routed.`
    );
  }
}

if (errors.length) {
  console.error(`Printables surface wiring: ${errors.length} unrouted surface(s).\n`);
  errors.forEach((e) => console.error(`  - ${e}\n`));
  process.exit(1);
}

console.log(
  `Printables surface wiring OK — ${printSurfaces.length} action surface(s) routed by ` +
  `firstActionSurface(), ${pngSurfaces.length - PNG_VARIANTS.size} PNG surface(s) by ` +
  `pngExportTarget() (${PNG_VARIANTS.size} documented variant excluded).`
);
