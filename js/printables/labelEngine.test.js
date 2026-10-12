/* labelEngine.test.js — the label sheet's geometry is a set of facts, and
   the pages quote them ("80 labels", "12 label dalam satu lembar A4"), so
   they are asserted rather than eyeballed.

   1. Every label stock sums to its own sheet: side margins + columns +
      gaps = sheet width, top margin * 2 + rows = sheet height. A typo in
      one number would move a whole column off the stock's labels, and no
      screen preview shows it.
   2. The cut-mode counts the copy states are the counts the engine lays out.

   Run: node js/printables/labelEngine.test.js  (exit 1 on any failure) */
"use strict";

const path = require("path");
const assert = require("assert");

// The engine is a browser IIFE; give it the smallest window it needs and
// keep it from booting the UI.
const store = {};
global.window = { UltraTextGen: {}, UTG_LABELS: {}, devicePixelRatio: 1 };
global.document = {
  readyState: "loading",
  documentElement: { lang: "en" },
  getElementById: () => null,
  querySelector: () => null
};
global.window.addEventListener = () => {};
global.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
global.location = { pathname: "/printables/name-labels/" };
require(path.join(__dirname, "labelEngine.js"));
const L = window.UltraTextGen.labels;

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, msg + ": " + a.toFixed(4) + " vs " + b.toFixed(4));

// 1. Stocks sum to their sheets (to 0.02in, half a millimetre).
Object.keys(L.STOCKS).forEach((key) => {
  const s = L.STOCKS[key];
  const paper = L.PAPER[s.paper];
  check(key + " width sums to the sheet", () => {
    near(2 * s.left + s.cols * s.w + (s.cols - 1) * s.gapX, paper.w, 0.02, "width");
  });
  check(key + " height sums to the sheet", () => {
    near(2 * s.top + s.rows * s.h + (s.rows - 1) * s.gapY, paper.h, 0.02, "height");
  });
});

// 2. Counts per sheet, as the pages state them.
function count(paper, sheet, size) {
  L.state.sheet = sheet;
  L.state.size = size;
  window.UTG_LABELS.paper = paper;
  // paperKey() reads printPrefs when present; absent here, it reads CFG.paper.
  const g = L.geometry();
  return g.cols * g.rows;
}
const expect = [
  ["letter", "avery-5160", "s", 30],
  ["letter", "avery-5167", "xs", 80],
  ["letter", "avery-5163", "l", 10],
  ["a4", "avery-l7160", "s", 21],
  ["a4", "avery-l7651", "xs", 65],
  ["a4", "avery-l7163", "l", 14],
  ["letter", "cut", "xs", 80],   // EN: "80 labels" on Letter
  ["letter", "cut", "s", 30],    // three across, as on an Avery 5160
  ["a4", "cut", "xs", 84],       // ID FAQ: 84 label per lembar A4
  ["a4", "cut", "m", 12],        // ID FAQ: 12 label dalam satu lembar A4
  ["a4", "cut", "l", 10]
];
expect.forEach((e) => {
  check(e[0] + " " + e[1] + " " + e[2] + " = " + e[3] + " labels", () => {
    assert.strictEqual(count(e[0], e[1], e[2]), e[3]);
  });
});

// 3. A cut-mode sheet stays inside the 0.25in a home printer can reach.
["letter", "a4"].forEach((paper) => {
  ["xs", "s", "m", "l"].forEach((size) => {
    check("cut " + paper + " " + size + " stays inside the printable area", () => {
      L.state.sheet = "cut"; L.state.size = size; window.UTG_LABELS.paper = paper;
      const g = L.geometry();
      assert.ok(g.left >= 0.25 - 1e-6, "left margin " + g.left);
      assert.ok(g.left + g.cols * g.w <= g.paper.w - 0.25 + 1e-6, "right edge");
      assert.ok(g.top + g.rows * g.h <= g.paper.h - 0.25 - 0.3 + 1e-6, "foot band");
    });
  });
});

if (failed) { console.log("\n" + failed + " failed"); process.exit(1); }
console.log("\nall label geometry checks pass");
