#!/usr/bin/env node
'use strict';

/**
 * practiceRow.test.js — the practice-style row composer, checked against
 * RECORDED output of the real function.
 *
 * The composer lives in printablesEngine.js (a module of its own would need a
 * <script> tag hand-added to 20 pages in 7 languages, which is the
 * localization cost this feature exists to avoid), so it cannot be required
 * here. It is published as `window.UltraTextGen.practiceRow` and its output
 * across a grid of box and model widths is recorded in
 * practiceRow.fixtures.json. These assertions then hold that recording to the
 * rules the composition has to obey, the same way renderInvariants.test.js
 * holds a recorded export to its geometry.
 *
 * Re-record the fixtures by calling `practiceRow.compose` in a browser over
 * the same grid; a fixture that no longer satisfies these rules is a real
 * regression in the composer, not a stale file.
 */

const fs = require('fs');
const path = require('path');

const FIX = path.join(__dirname, 'practiceRow.fixtures.json');
const TOL = 0.51;                       // half a unit: the recording is rounded

let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fails.push(name + (detail ? '  — ' + detail : ''));
}

const data = JSON.parse(fs.readFileSync(FIX, 'utf8'));
check('fixtures carry the four styles', data.styles.length === 4, data.styles.join(','));
check('the default is repeat tracing', data.default === 'repeat', String(data.default));
check('fixtures are not empty', data.cases.length > 0, String(data.cases.length));

data.cases.forEach((c) => {
  const id = 'box ' + c.boxW + ' model ' + c.modelW;
  const wide = c.modelW + 2 * c.margin > c.boxW;   // a name wider than the line

  data.styles.forEach((style) => {
    const xs = c.styles[style];
    check(id + ' / ' + style + ': composes at least one model', xs.length >= 1, JSON.stringify(xs));

    // No clipping. Every model starts at or after the writing margin and ends
    // at or before the far margin -- unless the word is wider than the line,
    // where the box itself is widened instead (wordOutlineGeom's floor) and a
    // model may legitimately reach the edge.
    check(id + ' / ' + style + ': first model is at or after the margin',
      xs[0] >= c.margin - TOL, 'x=' + xs[0] + ' margin=' + c.margin);
    if (!wide) {
      const last = xs[xs.length - 1] + c.modelW;
      check(id + ' / ' + style + ': last model ends inside the line',
        last <= c.boxW - c.margin + TOL, 'end=' + last.toFixed(1) + ' box=' + c.boxW);
    }

    // No overlap, left to right, with real air between copies.
    for (let i = 1; i < xs.length; i++) {
      check(id + ' / ' + style + ': models do not overlap',
        xs[i] - (xs[i - 1] + c.modelW) >= -TOL,
        'gap=' + (xs[i] - xs[i - 1] - c.modelW).toFixed(1));
      check(id + ' / ' + style + ': models keep the minimum gap',
        xs[i] - (xs[i - 1] + c.modelW) >= c.gap - TOL,
        'gap=' + (xs[i] - xs[i - 1] - c.modelW).toFixed(1) + ' min=' + c.gap);
    }
  });

  // Repeat tracing fills the line: one more copy would not fit. This is the
  // rule that stops a half-drawn name, which is the one thing a tracing sheet
  // must never show.
  const rep = c.styles.repeat;
  const usable = c.boxW - 2 * c.margin;
  const needed = (rep.length + 1) * c.modelW + rep.length * c.gap;
  check(id + ' / repeat: is as full as it can be', needed > usable + TOL,
    rep.length + ' copies, one more needs ' + needed.toFixed(1) + ' of ' + usable.toFixed(1));
  check(id + ' / repeat: never fewer than one', rep.length >= 1, String(rep.length));

  // Trace then write puts exactly one model, at the writing margin.
  check(id + ' / trace_write: one model at the margin',
    c.styles.trace_write.length === 1 && Math.abs(c.styles.trace_write[0] - c.margin) < TOL,
    JSON.stringify(c.styles.trace_write));

  // Write then check puts exactly one model, at the far end.
  check(id + ' / write_check: one model at the end', c.styles.write_check.length === 1,
    JSON.stringify(c.styles.write_check));

  // Trace, write, check is two models with writing room between them, or
  // honestly one when there is no room for two.
  const twc = c.styles.trace_write_check;
  check(id + ' / trace_write_check: one or two models', twc.length === 1 || twc.length === 2,
    JSON.stringify(twc));
  if (twc.length === 2) {
    const room = twc[1] - (twc[0] + c.modelW);
    check(id + ' / trace_write_check: leaves room to write', room >= c.gap * 2 - TOL,
      'room=' + room.toFixed(1));
    check(id + ' / trace_write_check: both models share the line',
      Math.abs(twc[0] - c.margin) < TOL, JSON.stringify(twc));
  }

  // The starting margin is the same in every mode that starts with a model.
  ['repeat', 'trace_write', 'trace_write_check'].forEach((st) => {
    check(id + ' / ' + st + ': starts at the same margin as the others',
      Math.abs(c.styles[st][0] - c.margin) < TOL, JSON.stringify(c.styles[st]));
  });

  // Progressive disclosure: `differ` must agree with the compositions it is
  // describing. A control shown for four identical rows, or hidden for four
  // different ones, is the defect this flag exists to prevent.
  const keys = data.styles.map((st) => c.styles[st].map((x) => Math.round(x)).join(','));
  const actuallyDiffer = keys.some((k) => k !== keys[0]);
  check(id + ': differ() matches the compositions', c.differ === actuallyDiffer,
    'differ=' + c.differ + ' actual=' + actuallyDiffer);
});

// A line that cannot hold two copies must collapse, and the flag must say so.
const tight = data.cases.filter((c) => c.styles.repeat.length === 1 &&
  c.modelW + 2 * c.margin >= c.boxW);
check('a line narrower than its word reports no choice',
  tight.every((c) => c.differ === false),
  tight.filter((c) => c.differ).map((c) => c.boxW + '/' + c.modelW).join(' '));

fails.forEach((f) => console.log('  FAIL  ' + f));
console.log(fails.length
  ? '\nFAIL — ' + fails.length + ' failed, ' + pass + ' passed'
  : '\nPASS — ' + pass + ' passed, 0 failed');
process.exit(fails.length ? 1 : 0);
