/* labelEngine.test.js — the label sheet's geometry is a set of facts, and
   the pages quote them ("80 labels", "12 label dalam satu lembar A4"), so
   they are asserted rather than eyeballed.

   1. Every label stock sums to its own sheet: side margins + columns +
      gaps = sheet width, top margin * 2 + rows = sheet height. A typo in
      one number would move a whole column off the stock's labels, and no
      screen preview shows it.
   2. The cut-mode counts the copy states are the counts the engine lays out.
   3. The desk plate: two per Letter or A4 sheet, the fold on each plate's
      centre line, the back copy turned 180 degrees at the same size, one
      plate per class-list name, and the small-name warning.

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

// 4. The desk plate. A recording canvas stands in for the browser's: it keeps
// the current transform, so where each copy of the name lands on the paper
// and which way up it reads are facts the test can read back.
function recordingCanvas() {
  const calls = [];
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let dash = [];
  let path = [];
  const mul = (n) => {
    const [a, b, c, d, e, f] = m;
    m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3],
      a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f];
  };
  const ctx = {
    globalAlpha: 1, font: "10px x", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "", textBaseline: "",
    save() { stack.push({ m: m.slice(), alpha: this.globalAlpha, dash: dash.slice() }); },
    restore() { const s = stack.pop(); m = s.m; this.globalAlpha = s.alpha; dash = s.dash; },
    translate(x, y) { mul([1, 0, 0, 1, x, y]); },
    rotate(t) { const c = Math.cos(t), s = Math.sin(t); mul([c, s, -s, c, 0, 0]); },
    setLineDash(d) { dash = d.slice(); },
    fillRect() {}, beginPath() { path = []; }, closePath() {}, arcTo() {},
    moveTo(x, y) { path.push([x, y]); }, lineTo(x, y) { path.push([x, y]); },
    stroke() { calls.push({ op: "stroke", path: path.slice(), dash: dash.slice() }); },
    measureText(t) { return { width: String(t).length * 0.55 * parseFloat(/([\d.]+)px/.exec(this.font)[1]) }; },
    fillText(t, x, y) {
      calls.push({ op: "text", t: t, font: this.font, m: m.slice(),
        at: [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] });
    }
  };
  return { width: 0, height: 0, calls: calls, getContext: () => ctx };
}
let lastCanvas = null;
document.createElement = () => (lastCanvas = recordingCanvas());

// The DOM fields labelsFor reads: a name, and a list in list mode.
const fields = { "lb-name": { value: "" }, "lb-list": { value: "" } };
document.getElementById = (id) => fields[id] || null;
function plateState(paper, opts) {
  const o = opts || {};
  Object.assign(L.state, { preset: "plate", sheet: o.sheet || "cut", size: "xs", mode: o.list ? "list" : "one",
    listTarget: o.target || "name", copies: "fill", dates: false, border: !!o.border, symbol: "", nameStyle: "full", font: "rounded" });
  window.UTG_LABELS.paper = paper;
  fields["lb-name"].value = o.name !== undefined ? o.name : "Maya Lopez";
  fields["lb-list"].value = o.list || "";
}
const MM_IN = 1 / 25.4;
// The paper, measured independently of the engine.
const SHEETS = { letter: { w: 8.5, h: 11 }, a4: { w: 210 * MM_IN, h: 297 * MM_IN } };

["letter", "a4"].forEach((paper) => {
  const P = SHEETS[paper];
  // The strip: paper width minus the 0.25in margins; two strips fill the
  // height between the margins and the 0.3in credit band.
  const plateW = P.w - 0.5, plateH = (P.h - 0.5 - 0.3) / 2;

  check("plate " + paper + ": two plates per sheet, the paper's width minus margins", () => {
    plateState(paper);
    const g = L.geometry();
    assert.strictEqual(g.cols * g.rows, 2, "plates per sheet");
    assert.ok(g.fold, "fold layout");
    near(g.w, plateW, 1e-6, "plate width");
    near(g.h, plateH, 1e-6, "plate height");
    near(g.left, 0.25, 1e-6, "left margin");
    assert.ok(g.top + 2 * g.h <= P.h - 0.25 - 0.3 + 1e-6, "plates stay above the credit band");
  });

  check("plate " + paper + ": a label sheet choice does not move the plate off the paper", () => {
    plateState(paper, { sheet: paper === "a4" ? "avery-l7160" : "avery-5160" });
    const g = L.geometry();
    assert.ok(g.fold && !g.stock, "fold, not stock");
    near(g.w, plateW, 1e-6, "plate width");
  });

  check("plate " + paper + ": the fold is each plate's centre line, to 1 mm", () => {
    plateState(paper);
    const g = L.geometry();
    for (let r = 0; r < 2; r++) {
      const top = 0.25 + r * plateH;
      const f = L.plateFaces(g.left, g.top + r * g.h, g.w, g.h);
      near(f.foldY, top + plateH / 2, MM_IN, "plate " + (r + 1) + " fold");
      near(f.front.y, f.foldY, 1e-9, "front face starts at the fold");
      near(f.back.y + f.back.h, f.foldY, 1e-9, "back face ends at the fold");
    }
  });

  check("plate " + paper + ": both faces are one size; only the back is turned", () => {
    plateState(paper);
    const g = L.geometry();
    const f = L.plateFaces(g.left, g.top, g.w, g.h);
    assert.deepStrictEqual([f.front.w, f.front.h], [f.back.w, f.back.h], "face sizes");
    assert.strictEqual(f.front.rotate, 0);
    assert.strictEqual(f.back.rotate, 180);
  });

  check("plate " + paper + ": drawn, the name is set twice at one size, the top copy upside down", () => {
    plateState(paper);
    const g = L.geometry();
    const labs = L.labelsFor(g);
    const ppi = 96;
    const c = L.drawPage(g, labs, 0, ppi, {});
    const names = c.calls.filter((k) => k.op === "text" && k.t === "Maya Lopez");
    assert.strictEqual(names.length, 4, "two plates x two faces");
    for (let r = 0; r < 2; r++) {
      const plateTop = (0.25 + r * plateH) * ppi, fold = plateTop + plateH / 2 * ppi;
      const mine = names.filter((k) => k.at[1] > plateTop && k.at[1] < plateTop + plateH * ppi);
      assert.strictEqual(mine.length, 2, "plate " + (r + 1) + " carries two copies");
      const up = mine.find((k) => k.m[0] === 1 && k.m[3] === 1);
      const turned = mine.find((k) => Math.abs(k.m[0] + 1) < 1e-9 && Math.abs(k.m[3] + 1) < 1e-9);
      assert.ok(up && turned, "one upright, one turned 180 degrees");
      assert.strictEqual(up.font, turned.font, "same font and size");
      assert.ok(up.at[1] > fold, "upright copy on the front (bottom) face");
      assert.ok(turned.at[1] < fold, "turned copy on the back (top) face");
      // Mirror images about the fold: same distance from it, to a pixel.
      near(up.at[1] - fold, fold - turned.at[1], 1, "copies sit symmetric about the fold");
    }
    const folds = c.calls.filter((k) => k.op === "stroke" && k.dash.length && k.dash[0] > ppi * 0.1);
    assert.strictEqual(folds.length, 2, "one fold line per plate");
    folds.forEach((k, r) => near(k.path[0][1] / ppi, 0.25 + r * plateH + plateH / 2, MM_IN, "fold line " + (r + 1)));
  });

  check("plate " + paper + ": 3 names in list mode = 3 plates on 2 pages, the last half empty", () => {
    plateState(paper, { list: "Noah Kim\nAisha Rahman\nLeo Park" });
    const g = L.geometry();
    const labs = L.labelsFor(g);
    assert.deepStrictEqual(labs.map((l) => l.name), ["Noah Kim", "Aisha Rahman", "Leo Park"]);
    assert.strictEqual(Math.ceil(labs.length / (g.cols * g.rows)), 2, "pages");
    const last = L.drawPage(g, labs, 1, 96, {});
    assert.strictEqual(last.calls.filter((k) => k.op === "text" && k.t === "Leo Park").length, 2, "one plate, both faces");
    const folds = last.calls.filter((k) => k.op === "stroke" && k.dash.length && k.dash[0] > 96 * 0.1);
    assert.strictEqual(folds.length, 1, "one fold line on the half-empty page");
  });

  check("plate " + paper + ": a list that targets a detail line still fills the name", () => {
    plateState(paper, { list: "Noah Kim\nAisha Rahman", target: "line3" });
    const labs = L.labelsFor(L.geometry());
    assert.deepStrictEqual(labs.map((l) => [l.name, l.line2, l.line3]), [["Noah Kim", "", ""], ["Aisha Rahman", "", ""]]);
  });
});

check("plate: a 20-character name fits; a 40-character one raises the small-name warning", () => {
  plateState("letter", { name: "Maximiliana Ferreira" });
  assert.strictEqual("Maximiliana Ferreira".length, 20);
  let g = L.geometry();
  assert.strictEqual(L.drawPage(g, L.labelsFor(g), 0, 96, {}).labelSmall, false, "20 characters");
  plateState("letter", { name: "Bartholomewmaximilianjohannesfitzgerald" + "x" });
  g = L.geometry();
  assert.strictEqual(L.drawPage(g, L.labelsFor(g), 0, 96, {}).labelSmall, true, "40 characters, no space");
});

check("plate: the preset is offered only where the page carries its chip", () => {
  const qs = document.querySelector;
  try {
    document.querySelector = () => null;              // a locale page: no chip
    assert.strictEqual(L.presetOffered("plate"), false, "no chip, no plate");
    assert.strictEqual(L.presetOffered("supplies"), true, "label presets need no chip");
    document.querySelector = (sel) => (sel === "#lb-what [data-value='plate']" ? {} : null);
    assert.strictEqual(L.presetOffered("plate"), true, "chip on the page");
  } finally { document.querySelector = qs; }
});

if (failed) { console.log("\n" + failed + " failed"); process.exit(1); }
console.log("\nall label geometry checks pass");
