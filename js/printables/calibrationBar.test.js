/* node js/printables/calibrationBar.test.js  —  npm run test:calibration-bar
   ---------------------------------------------------------------
   The actual-size check bar exists for one reason: a printer that scales the
   page ("fit to page") does it silently, and a bar of stated length that
   measures short is the only thing on the paper that shows it. So the bar is
   only worth printing if its own length is exact. A bar that is wrong is worse
   than none: it tells a teacher the page was scaled when it was not, or the
   reverse.

   This test holds the geometry in printPrefs.calibrationBar, the one owner
   that both the tiled wall letters (posterTiles.js, a canvas in inches) and
   the millimetre-ruled sheets (printablesEngine.js, an SVG in CSS inches)
   draw from. It needs no browser: the length is arithmetic, and the place it
   could drift is the arithmetic. What reaches the bitmap is measured by
   scripts/smoke-runtime.js. */
"use strict";
const fs = require("fs");
const path = require("path");
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "printPrefs.js"), "utf8"))();
const PP = global.window.UltraTextGen.printPrefs;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + msg);
}
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + " — got " + a + ", expected " + b + " +/- " + tol); }

const CSS_PX_PER_IN = 96;   // a CSS pixel is 1/96 in on the print surface
const MM_PER_IN = 25.4;

ok(typeof PP.calibrationBar === "function", "printPrefs exposes calibrationBar");

// Ink extent of the bar: from the leftmost to the rightmost painted edge.
function extent(rects) {
  const x0 = Math.min.apply(null, rects.map((r) => r[0]));
  const x1 = Math.max.apply(null, rects.map((r) => r[0] + r[2]));
  const y0 = Math.min.apply(null, rects.map((r) => r[1]));
  const y1 = Math.max.apply(null, rects.map((r) => r[1] + r[3]));
  return { w: x1 - x0, h: y1 - y0, x0: x0, y1: y1 };
}

[
  { unit: "cm", mm: 20, label: "2 cm" },
  { unit: "in", mm: 25.4, label: "1 in" }
].forEach((c) => {
  const bar = PP.calibrationBar(c.unit);
  near(bar.lengthIn * MM_PER_IN, c.mm, 1e-9, c.unit + ": stated length in mm");
  ok(bar.lengthMm === c.mm, c.unit + ": lengthMm is " + c.mm + " (got " + bar.lengthMm + ")");
  ok(bar.label === c.label, c.unit + ": label is the numeral and unit '" + c.label + "' (got '" + bar.label + "')");

  // The ink is exactly the stated length, wherever it is drawn.
  [[0, bar.heightIn], [0.4, 10.89], [1.237, 3]].forEach((at) => {
    const e = extent(bar.rects(at[0], at[1]));
    near(e.w, bar.lengthIn, 1e-12, c.unit + ": ink extent at x=" + at[0] + " equals the stated length");
    near(e.x0, at[0], 1e-12, c.unit + ": ink starts at x");
    near(e.y1, at[1], 1e-12, c.unit + ": baseY is the bar's bottom edge");
    near(e.h, bar.heightIn, 1e-12, c.unit + ": bar is heightIn tall");
  });
  // Every rect has positive size, and the ticks stand inside the length.
  bar.rects(0, bar.heightIn).forEach((r, i) => {
    ok(r[2] > 0 && r[3] > 0, c.unit + ": rect " + i + " has positive size");
    ok(r[0] >= 0 && r[0] + r[2] <= bar.lengthIn + 1e-12, c.unit + ": rect " + i + " lies inside the stated length");
  });

  // Length in mm -> pixels at print scale. The engine sizes the SVG in CSS
  // inches; the PDF writer rasterises at 96 CSS px/in times its render scale
  // (2 = 192 dpi, 3 = 288 dpi). At every scale the bar must come back as the
  // stated millimetres when the pixels are read at that scale's dpi.
  [1, 2, 3].forEach((scale) => {
    const dpi = CSS_PX_PER_IN * scale;
    const px = bar.lengthIn * dpi;
    near(px / dpi * MM_PER_IN, c.mm, 1e-9, c.unit + ": " + dpi + " dpi round trip");
    near(px, c.mm / MM_PER_IN * dpi, 1e-9, c.unit + ": " + dpi + " dpi pixel length");
  });
  // A page scaled by "fit to page" (here 94%) must measure SHORT by the same
  // ratio. That is the whole signal the bar carries.
  near(bar.lengthIn * 0.94 * MM_PER_IN, c.mm * 0.94, 1e-9, c.unit + ": a 94% page shows a 94% bar");
});

// The 2 cm bar at 192 dpi: the number scripts/smoke-runtime.js measures.
near(PP.calibrationBar("cm").lengthIn * 192, 151.1811, 1e-3, "2 cm is 151.18 px at 192 dpi");

/* The tiled wall letters drew this bar before it was shared, with literal
   numbers. Their PDF must not move by a pixel, so the shared rects must equal
   that arithmetic bit for bit, in the same operation order. */
[["cm", 2 / 2.54], ["in", 1]].forEach((c) => {
  const barLen = c[1];
  [[0.4, 11 - 0.2], [0.4, 11.69 - 0.2], [0.55, 10.8]].forEach((at) => {
    const left = at[0], barY = at[1];
    const legacy = [
      [left, barY - 0.05, barLen, 0.05],
      [left, barY - 0.1, 0.012, 0.1],
      [left + barLen - 0.012, barY - 0.1, 0.012, 0.1]
    ];
    const got = PP.calibrationBar(c[0]).rects(left, barY);
    ok(JSON.stringify(got) === JSON.stringify(legacy), c[0] + ": rects equal the wall letters' original arithmetic at (" + left + ", " + barY + ")");
  });
});

console.log("calibration bar: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
