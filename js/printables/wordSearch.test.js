/* node js/printables/wordSearch.test.js  —  npm run test:word-search
   ---------------------------------------------------------------
   A word search has one failure mode that matters and it is silent: a word in
   the clue list that is not actually in the grid. The sheet looks right, it
   prints right, and nobody finds out until a child has spent twenty minutes
   looking for a word that was never there — by which time thirty copies are
   on thirty desks. Nothing about that is visible in a preview, so every case
   below re-scans the finished grid instead of reading the builder's own
   placement log.

   The second fact this module asserts is reproducibility. "N different
   versions, one per child" is the page's whole differentiator, and it is two
   claims at once: two children must get DIFFERENT grids, and one child must
   get the SAME grid on a reprint. Both are tested, because a generator that
   quietly ignores its seed satisfies neither and looks fine either way.

   No browser, no font, no dependency. */
"use strict";
const fs = require("fs");
const path = require("path");
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "wordSearch.js"), "utf8"))();
const WS = global.window.UltraTextGen.wordSearch;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + msg);
}
function eq(a, b, msg) { ok(a === b, msg + " — got " + JSON.stringify(a) + ", expected " + JSON.stringify(b)); }

function gridText(g) { return g.map((r) => r.join("")).join("\n"); }
function cellCount(mask) {
  return mask.reduce((n, row) => n + row.filter(Boolean).length, 0);
}

/* A real spelling list: 12 words, mixed lengths, the shape a teacher pastes. */
const SPELLING = ["because", "friend", "people", "school", "water", "there",
  "which", "would", "could", "about", "their", "other"];

/* ---------------------------------------------------------------
   1. Every listed word is really in the grid
   --------------------------------------------------------------- */
{
  const r = WS.build({ words: SPELLING, seed: "Emma", level: "hard" });
  eq(r.unplaced.length, 0, "a 12-word spelling list places every word");
  eq(r.words.length, 12, "the clue list carries all 12 entries");
  let found = 0;
  for (const w of r.words) {
    if (!w.placed) continue;
    if (WS.findWord(r.grid, w.letters).length) found++;
    else ok(false, "listed word is absent from the grid: " + w.display);
  }
  eq(found, 12, "all 12 words are findable by an independent scan");

  // The builder's own coordinates must agree with the grid, not just exist.
  for (const w of r.words) {
    let walked = "";
    for (let i = 0; i < w.letters.length; i++) walked += r.grid[w.row + w.dr * i][w.col + w.dc * i];
    eq(walked, w.letters.join(""), "recorded coordinates spell " + w.display);
  }
}

/* ---------------------------------------------------------------
   2. Reproducibility, in both directions
   --------------------------------------------------------------- */
{
  const a = WS.build({ words: SPELLING, seed: "Emma", level: "hard" });
  const b = WS.build({ words: SPELLING, seed: "Emma", level: "hard" });
  eq(gridText(a.grid), gridText(b.grid), "the same seed reprints an identical grid");

  const c = WS.build({ words: SPELLING, seed: "Noah", level: "hard" });
  ok(gridText(a.grid) !== gridText(c.grid), "a different seed gives a different grid");

  // The N-versions promise across a whole class, not just a pair: 25 distinct
  // seeds must give 25 distinct grids, or two children sit next to identical
  // sheets and the feature has silently done nothing.
  const roster = [];
  for (let i = 1; i <= 25; i++) roster.push("child" + i);
  const seen = new Set(roster.map((n) => gridText(WS.build({ words: SPELLING, seed: n, level: "hard" }).grid)));
  eq(seen.size, 25, "25 roster names give 25 distinct grids");
}

/* ---------------------------------------------------------------
   3. Difficulty is which directions are allowed
   --------------------------------------------------------------- */
{
  const easy = WS.build({ words: SPELLING, seed: "Emma", level: "easy" });
  const dirs = new Set(easy.words.filter((w) => w.placed).map((w) => w.dir));
  ok([...dirs].every((d) => d === "E" || d === "S"), "easy places words only across and down — got " + [...dirs].join(","));

  const med = WS.build({ words: SPELLING, seed: "Emma", level: "medium" });
  const mdirs = new Set(med.words.filter((w) => w.placed).map((w) => w.dir));
  ok([...mdirs].every((d) => ["E", "S", "SE", "NE"].indexOf(d) >= 0), "medium adds forward diagonals and no reversals");

  // An unknown level falls back to medium rather than throwing or placing
  // nothing — a bad ?level= in a shared URL must still produce a sheet.
  eq(WS.build({ words: SPELLING, seed: "x", level: "impossible" }).level, "medium", "an unknown level falls back to medium");

  // An explicit direction list overrides the level.
  const down = WS.build({ words: SPELLING, seed: "Emma", directions: ["S"] });
  ok(down.words.filter((w) => w.placed).every((w) => w.dir === "S"), "an explicit directions list is honoured");
}

/* ---------------------------------------------------------------
   4. Grid sizing and its clamps
   --------------------------------------------------------------- */
{
  ok(WS.gridSize(WS.normalizeWords(["at", "in"]), 0) >= WS.MIN_SIZE, "a tiny list still gets the minimum grid");
  const long = WS.normalizeWords(["photosynthesis"]);
  ok(WS.gridSize(long, 0) >= 14, "the grid is never narrower than the longest word");
  const many = [];
  for (let i = 0; i < 40; i++) many.push("abcdefghij" + i);
  ok(WS.gridSize(WS.normalizeWords(many), 0) <= WS.MAX_SIZE, "a huge list is clamped to MAX_SIZE");
  eq(WS.build({ words: SPELLING, seed: "x", size: 15 }).size, 15, "an explicit size is honoured");

  // Longer than any grid can hold: reported, not thrown, and the rest survive.
  const over = WS.build({ words: ["antidisestablishmentarianism", "cat", "dog"], seed: "x" });
  eq(over.unplaced.length, 1, "a word longer than MAX_SIZE is reported as unplaced");
  eq(over.unplaced[0].display, "antidisestablishmentarianism", "the unplaced word is named");
  eq(over.words.filter((w) => w.placed).length, 2, "the placeable words still place");
  eq(over.grid.length, over.size, "the grid is still built around the failure");
}

/* ---------------------------------------------------------------
   5. Fill letters come from the list's own alphabet
   --------------------------------------------------------------- */
{
  const r = WS.build({ words: SPELLING, seed: "Emma", level: "hard" });
  const allowed = new Set();
  for (const w of r.words) for (const ch of w.letters) allowed.add(ch);
  const strays = [];
  for (const row of r.grid) for (const ch of row) if (!allowed.has(ch)) strays.push(ch);
  eq(strays.length, 0, "no character outside the list's own alphabet appears in the grid");

  // A list too narrow to fill from falls back to A–Z, or the grid would be
  // three characters repeating — a tell of its own.
  const narrow = WS.build({ words: ["cat"], seed: "x" });
  const distinct = new Set();
  for (const row of narrow.grid) for (const ch of row) distinct.add(ch);
  ok(distinct.size > 3, "a 3-letter list fills from A–Z rather than from itself — got " + distinct.size);
}

/* ---------------------------------------------------------------
   6. Non-English lists — the locale mirrors depend on this
   --------------------------------------------------------------- */
{
  // Spanish, Polish and French lists, each with letters an A–Z filler would
  // have to drop. The words must survive normalization AND be findable.
  const es = WS.build({ words: ["niño", "árbol", "cigüeña", "mañana", "corazón"], seed: "es", level: "hard" });
  eq(es.unplaced.length, 0, "a Spanish list with diacritics places completely");
  ok(gridText(es.grid).indexOf("Ñ") >= 0, "Ñ reaches the grid as one cell");
  for (const w of es.words) ok(WS.findWord(es.grid, w.letters).length > 0, "findable: " + w.display);

  const pl = WS.build({ words: ["łódka", "żółw", "ćma", "gęś", "źrebak"], seed: "pl", level: "hard" });
  eq(pl.unplaced.length, 0, "a Polish list places completely");
  ok(gridText(pl.grid).indexOf("Ł") >= 0, "Ł reaches the grid as one cell");

  const fr = WS.build({ words: ["école", "fenêtre", "cœur", "à côté"], seed: "fr", level: "hard" });
  eq(fr.unplaced.length, 0, "a French list places completely");

  // ß uppercases to SS. One grid cell holds one character, so it must stay ß
  // or every letter after it shifts and the word silently breaks.
  const de = WS.normalizeWords(["straße"]);
  eq(de[0].letters.join(""), "STRAßE", "ß survives uppercasing as a single cell");
  eq(de[0].letters.length, 6, "straße is six cells, not seven");
  const deGrid = WS.build({ words: ["straße", "schule", "wasser"], seed: "de", level: "hard" });
  eq(deGrid.unplaced.length, 0, "a German list with ß places completely");
}

/* ---------------------------------------------------------------
   7. Normalization: what the grid takes vs what the clue list shows
   --------------------------------------------------------------- */
{
  const w = WS.normalizeWords("ice cream\nhot-dog\n  \nfish & chips");
  eq(w.length, 3, "blank lines are dropped");
  eq(w[0].display, "ice cream", "the clue list keeps the entry's own spelling");
  eq(w[0].letters.join(""), "ICECREAM", "the grid gets the letters only, space gone");
  eq(w[1].letters.join(""), "HOTDOG", "a hyphen is dropped from the grid form");
  eq(w[2].letters.join(""), "FISHCHIPS", "an ampersand is dropped from the grid form");

  eq(WS.normalizeWords("cat, dog; bird").length, 3, "commas and semicolons split entries");
  eq(WS.normalizeWords("cat\nCAT\n cat ").length, 1, "the same word twice is one entry");
  eq(WS.normalizeWords("").length, 0, "an empty list is empty, not an error");
  eq(WS.normalizeWords("!!! ???").length, 0, "an entry with no letters is dropped");
  eq(WS.normalizeWords(null).length, 0, "null is empty, not an error");

  const many = [];
  for (let i = 0; i < 80; i++) many.push("word" + i);
  eq(WS.normalizeWords(many).length, WS.MAX_WORDS, "the list is capped at MAX_WORDS");

  // Digits are legal: "grade 5" and a numbers list are both real inputs.
  eq(WS.normalizeWords(["level 9"])[0].letters.join(""), "LEVEL9", "digits reach the grid");
}

/* ---------------------------------------------------------------
   8. The answer key cannot disagree with the puzzle
   --------------------------------------------------------------- */
{
  const r = WS.build({ words: SPELLING, seed: "Emma", level: "hard" });
  eq(r.solution.length, r.size, "the solution mask is the grid's own shape");
  eq(r.solution[0].length, r.size, "the solution mask is square");

  // Every cell the mask marks must be a cell some placed word occupies, and
  // every cell a placed word occupies must be marked. Built independently
  // here from the words' coordinates.
  const expect = new Set();
  for (const w of r.words) {
    if (!w.placed) continue;
    for (let i = 0; i < w.letters.length; i++) expect.add((w.row + w.dr * i) + ":" + (w.col + w.dc * i));
  }
  const marked = new Set();
  for (let rr = 0; rr < r.size; rr++) for (let cc = 0; cc < r.size; cc++) if (r.solution[rr][cc]) marked.add(rr + ":" + cc);
  eq(marked.size, expect.size, "the mask marks exactly the word cells");
  let same = true;
  for (const k of expect) if (!marked.has(k)) same = false;
  ok(same, "every word cell is marked in the solution");

  // A mask that marked everything would pass a count test on a dense grid, so
  // assert it marks less than the whole sheet.
  ok(cellCount(r.solution) < r.size * r.size, "the mask does not mark the whole grid");
}

/* ---------------------------------------------------------------
   9. fill:false leaves the gaps empty (the answer-key render path)
   --------------------------------------------------------------- */
{
  const r = WS.build({ words: SPELLING, seed: "Emma", fill: false });
  let empty = 0;
  for (const row of r.grid) for (const ch of row) if (ch === "") empty++;
  ok(empty > 0, "fill:false leaves gaps empty");
  for (let rr = 0; rr < r.size; rr++) {
    for (let cc = 0; cc < r.size; cc++) {
      if (r.grid[rr][cc] === "") ok(!r.solution[rr][cc], "an empty cell is never marked as solution");
    }
  }
}

/* ---------------------------------------------------------------
   10. Overlap density — the reason candidates are scored at all
   --------------------------------------------------------------- */
{
  // A grid built with overlap preference should use fewer cells than the sum
  // of its words' lengths, i.e. words genuinely cross. Without the scoring
  // step this lands at exactly the sum and the puzzle reads as a ladder.
  const r = WS.build({ words: SPELLING, seed: "Emma", level: "hard" });
  const total = r.words.reduce((n, w) => n + (w.placed ? w.letters.length : 0), 0);
  ok(cellCount(r.solution) < total, "words cross each other — " + cellCount(r.solution) + " cells for " + total + " letters");
}

console.log("\nwordSearch.js — " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
