#!/usr/bin/env node
'use strict';

/**
 * check-fitted-page-fit.js — a page unit pinned to the paper must be able to
 * shrink its content to fit, because nothing downstream will.
 *
 * THE INCIDENT (RF-016, 2026-09-23). `markFittedPage()` gives a page unit
 * `is-fitted`, and `.pt-sheet-page.is-fitted` is a flex column with
 * `height: var(--pt-page-h)` — 927.4px at Letter with normal margins. On
 * /printables/name-tracing the unit's children are the title (38.4px, + a
 * 16px row gap), the ruled sheet and the credit band. The sheet still carried
 * `min-height: var(--pt-sheet-h)` = 812.2px, which is the page MINUS THE
 * CREDIT BAND — a budget written for a unit that had no title. A min-height
 * is a floor `flex-shrink` cannot cross, so the column could not fit itself:
 * 38.4 + 16 + 812.2 + 115.2 = 981.7px of content in a 927.4px box.
 *
 * NOTHING IN THE DOM SHOWS THIS. The unit reports 927.4px, every rectangle
 * inside it measures correctly, and the geometry harness's own overflow
 * metric — `fit = pageHeight / unitHeight` — reads 1.0000, because that
 * number measures a unit SIZED BY ITS CONTENT and this one is not. Then
 * `printablePdf.js` paints the unit through a `<div style="overflow:hidden">`
 * at the unit's own height, and the 54.3px past the box is cut IN THE FILE:
 * the bottom 60% of the credit QR and the whole credit URL, on all 20 routes
 * that build a ruled name sheet. Measured by decoding the exported bitmap —
 * before the fix nothing decoded at all.
 *
 * WHAT THIS CHECKS. For every sheet class the engine hands a fixed-height
 * page variant, and for every class the stylesheet places inside one: if any
 * rule sets a non-zero `min-height` on it, a rule scoped to that variant must
 * set `min-height: 0` and must win the cascade. The variants and the sheet
 * classes are READ FROM THE ENGINE, not listed here, so fitting a new sheet
 * cannot quietly escape the check.
 *
 * WHAT IT DOES NOT CHECK. It cannot add up a layout — a fixed `height` on a
 * child, or content simply too tall to shrink, is beyond a stylesheet reader.
 * It catches the floor that makes shrinking impossible, which is the shape
 * this defect had and the shape a `--pt-*-h` budget keeps producing.
 *
 * WHOLE-FILE AND GATING, not diff-scoped: the backlog is zero after the
 * 2026-09-23 repair, so there is nothing to be permanently red against.
 *
 * FAILS CLOSED. If the engine's variant list or sheet list cannot be read, if
 * a variant no longer pins a height, or if the stylesheet yields no rules, it
 * exits 2 and says nothing was compared rather than reporting a clean it did
 * not earn.
 *
 *   node scripts/check-fitted-page-fit.js
 */

const fs = require('fs');
const path = require('path');
const { rules, specificity, beats, subject, classesIn } = require('./lib/css-rules');

const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.join(ROOT, 'js/printables/printablesEngine.js');
const CSS = path.join(ROOT, 'style.css');

const ZERO = /^(0|0px|0%|0in|auto)$/;

function unknown(lines) {
  for (const l of lines) console.error(l);
  process.exit(2);
}

if (!fs.existsSync(ENGINE)) unknown(['UNKNOWN: js/printables/printablesEngine.js not found — nothing was compared.']);
if (!fs.existsSync(CSS)) unknown(['UNKNOWN: style.css not found — nothing was compared.']);

const engineSrc = fs.readFileSync(ENGINE, 'utf8');

/* The variants a page unit can be given. Read from the engine so a new one
   (`is-nup` was the second) is covered the day it is written. */
const variants = new Set();
for (const m of engineSrc.matchAll(/page\.classList\.add\(\s*"(is-[\w-]+)"/g)) variants.add(m[1]);

/* The sheet classes that earn `is-fitted`, from markFittedPage's own test. */
const fn = engineSrc.match(/function markFittedPage\([\s\S]*?\n  \}/);
const sheets = new Set();
if (fn) for (const m of fn[0].matchAll(/contains\("([\w-]+)"\)/g)) sheets.add(m[1]);

if (!variants.size) {
  unknown([
    'UNKNOWN: no `page.classList.add("is-…")` found in printablesEngine.js —',
    'the fixed-height page variants could not be read, so nothing was compared.',
    'If they were renamed or restructured, update this script in the same change.'
  ]);
}
if (!sheets.size) {
  unknown([
    'UNKNOWN: markFittedPage() could not be read from printablesEngine.js —',
    'the sheet classes that get a fixed-height page are unknown, so nothing was compared.'
  ]);
}

const css = fs.readFileSync(CSS, 'utf8');
const all = rules(css);
if (!all.length) unknown(['UNKNOWN: style.css yielded no rules — nothing was compared.']);

/* A comma list is several selectors sharing one block; each is judged on its
   own, or a rule that happens to mention a variant in ONE of its selectors
   would count as variant-scoped for all of them. */
const selectorsOf = (r) => r.selector.split(',').map((s) => s.trim()).filter(Boolean);

/* The classes a selector places INSIDE the variant — the compounds to the
   right of the one carrying it. Without this, an ANCESTOR named in the same
   selector (`.bubble-print-wrap … .pt-sheet-page.is-fitted > .pt-name-sheet`)
   reads as something inside the unit, and its own min-height is reported as a
   floor it is not. */
function insideOf(sel, vars) {
  const compounds = sel.trim().split(/\s*[\s>+~]\s*/).filter(Boolean);
  const at = compounds.findIndex((c) => [...vars].some((v) => classesIn(c).has(v)));
  if (at < 0) return null;
  const out = new Set();
  for (let i = at; i < compounds.length; i++) {
    for (const c of classesIn(compounds[i])) if (!vars.has(c) && c !== 'pt-sheet-page') out.add(c);
  }
  return out;
}

const decls = (body) => {
  const out = new Map();
  for (const d of body.split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    out.set(d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim().toLowerCase());
  }
  return out;
};

/* A variant only matters while it pins a height. If one stops doing so this
   check has nothing to be about, and saying so is better than passing. */
const pinned = new Set();
for (const r of all) {
  const d = decls(r.body);
  const h = d.get('height');
  if (!h || ZERO.test(h)) continue;
  for (const sel of selectorsOf(r)) {
    /* The SUBJECT must be the variant. A descendant rule inside the variant
       (`.pt-sheet-page.is-fitted .pt-gen-row > .pt-trace-svg { height: 100% }`)
       names it too, and reading that as "the variant pins a height" made this
       check survive the deliberate removal of the only rule that does. */
    const cls = classesIn(subject(sel));
    for (const v of variants) if (cls.has(v)) pinned.add(v);
  }
}
if (!pinned.size) {
  unknown([
    'UNKNOWN: none of ' + [...variants].map((v) => '.' + v).join(', ') + ' declares a height in style.css —',
    'a fixed-height page unit is what this check is about, and there is none. Nothing was compared.'
  ]);
}

/* Everything the stylesheet places inside a pinned unit, plus the sheets the
   engine puts there. Derived rather than listed: a class the CSS never names
   beside a variant cannot be checked, and a sheet the engine fits is checked
   whether or not the CSS has caught up. */
const inside = new Set(sheets);
for (const r of all) {
  for (const sel of selectorsOf(r)) {
    const found = insideOf(sel, pinned);
    if (found) for (const c of found) inside.add(c);
  }
}

/* Floors: a non-zero min-height on something inside a pinned unit, declared
   by a rule that is not itself scoped to the variant. */
const floors = [];
for (const r of all) {
  const d = decls(r.body);
  const mh = d.get('min-height');
  if (!mh || ZERO.test(mh)) continue;
  for (const sel of selectorsOf(r)) {
    if ([...pinned].some((v) => classesIn(sel).has(v))) continue;   // already variant-scoped
    const subj = classesIn(subject(sel));
    const hit = [...subj].filter((c) => inside.has(c));
    if (hit.length) floors.push({ rule: r, sel, classes: hit, value: mh, spec: specificity(sel) });
  }
}

/* Releases: a variant-scoped rule setting min-height:0 on the same subject. */
const releases = [];
for (const r of all) {
  const d = decls(r.body);
  if (!d.has('min-height') || !ZERO.test(d.get('min-height'))) continue;
  for (const sel of selectorsOf(r)) {
    if (![...pinned].some((v) => classesIn(sel).has(v))) continue;
    releases.push({ rule: r, subj: classesIn(subject(sel)), spec: specificity(sel) });
  }
}

const bad = [];
for (const f of floors) {
  for (const c of f.classes) {
    const ok = releases.some((rel) => rel.subj.has(c)
      && (beats(rel.spec, f.spec) || (!beats(f.spec, rel.spec) && rel.rule.line > f.rule.line)));
    if (!ok) bad.push({ f, c });
  }
}

if (bad.length) {
  console.error('FAIL: a page unit pinned to the paper carries a min-height it cannot shrink past.\n');
  for (const { f, c } of bad) {
    console.error('  style.css:' + f.rule.line + '  ' + f.sel);
    console.error('    min-height: ' + f.value + ' on .' + c + ', which lives inside '
      + [...pinned].map((v) => '.pt-sheet-page.' + v).join(' / ') + '.');
    console.error('    A fitted unit has a fixed height and the exporter paints it through');
    console.error('    overflow:hidden, so content past the box is cut in the file, not scaled.');
    console.error('    Add a rule scoped to the variant setting `min-height: 0` on .' + c + ',');
    console.error('    and let `flex: 1 1 auto` decide the height instead.\n');
  }
  console.error(bad.length + ' unshrinkable floor(s). See docs/printables/render-fidelity-audit-2026-09-22.md (RF-016).');
  process.exit(1);
}

console.log('OK: ' + floors.length + ' min-height floor(s) inside '
  + [...pinned].map((v) => '.' + v).join(' / ') + ' are all released by a variant-scoped rule ('
  + inside.size + ' classes checked against ' + all.length + ' rules).');
