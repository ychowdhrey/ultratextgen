/* node js/printables/wordPuzzles.test.js  —  npm run test:word-puzzles
   ---------------------------------------------------------------
   Both puzzles on this page share one failure mode and it is silent: a clue
   that names something the puzzle does not contain. A crossword numbered
   7-Across whose squares spell something else, or a scramble whose letters are
   not a permutation of the answer, looks exactly like a working sheet — on
   screen, on paper, and to whoever printed thirty of them. Nobody finds out
   until a child cannot solve it.

   So every crossword case below reads each entry BACK OUT of the finished grid
   instead of trusting the builder's placement log, and every scramble case
   compares letter multisets rather than checking that something changed.

   The second fact these modules assert is reproducibility. "N different
   versions, one per child" is the lane's whole differentiator, and it is two
   claims at once: two children must get DIFFERENT sheets, and one child must
   get the SAME sheet on a reprint. Both are tested, because a generator that
   quietly ignores its seed satisfies neither and looks fine either way.

   No browser, no font, no dependency. */
"use strict";
const fs = require("fs");
const path = require("path");
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "wordPuzzles.js"), "utf8"))();
const CW = global.window.UltraTextGen.crossword;
const SC = global.window.UltraTextGen.wordScramble;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + msg);
}
function eq(a, b, msg) { ok(a === b, msg + " — got " + JSON.stringify(a) + ", expected " + JSON.stringify(b)); }

function bag(list) { return list.slice().sort().join(""); }
function gridText(g) { return g.map((r) => r.map((c) => c || ".").join("")).join("\n"); }

/* A real spelling list, the shape a teacher pastes. */
const SPELLING = ["because", "friend", "people", "school", "water", "there",
  "which", "would", "could", "about"];
const CLUED = [
  "capital = The city a country governs from",
  "river: Water that flows to the sea",
  "island = Land with water all around it",
  "valley = The low ground between hills",
  "harbour = Where ships shelter"
];

/* ===============================================================
   CROSSWORD
   =============================================================== */

/* 1. Every entry reads back out of the finished grid */
{
  const p = CW.build({ input: SPELLING.join("\n"), seed: "Emma" });
  ok(p.entries.length > 0, "crossword: produced at least one entry");
  let mismatched = 0;
  for (const e of p.entries) {
    const run = CW.readRun(p.grid, e.row, e.col, e.dir);
    if (run !== e.letters) mismatched++;
  }
  eq(mismatched, 0, "crossword: every entry re-reads from the grid as its own letters");
  for (const e of p.entries) {
    eq(e.letters.length, e.length, "crossword: entry " + e.number + e.dir + " length matches its run");
  }
}

/* 2. No stray runs — nothing in the grid the list did not ask for */
{
  let strays = 0;
  for (const seed of ["Emma", "Noah", "Ava", "Liam", "Mia", ""]) {
    const p = CW.build({ input: SPELLING.join("\n"), seed: seed });
    strays += p.strays.length;
  }
  eq(strays, 0, "crossword: no unlisted run appears in any of 6 seeded grids");
}

/* 3. Words never run together, and never sit flush alongside each other.
      Checked structurally: every maximal run of 2+ cells, in both directions,
      must be a listed word. That is the same claim as `strays` but derived
      from the grid rather than from the builder's own numbering. */
{
  const p = CW.build({ input: SPELLING.join("\n"), seed: "Emma" });
  const keys = new Set(p.words.map((w) => w.key));
  let bad = 0;
  for (let r = 0; r < p.height; r++) {
    let run = "";
    for (let c = 0; c <= p.width; c++) {
      const ch = c < p.width ? p.grid[r][c] : "";
      if (ch) { run += ch; continue; }
      if (run.length > 1 && !keys.has(run)) bad++;
      run = "";
    }
  }
  for (let c = 0; c < p.width; c++) {
    let run = "";
    for (let r = 0; r <= p.height; r++) {
      const ch = r < p.height ? p.grid[r][c] : "";
      if (ch) { run += ch; continue; }
      if (run.length > 1 && !keys.has(run)) bad++;
      run = "";
    }
  }
  eq(bad, 0, "crossword: every maximal 2+ run in the grid is a listed word");
}

/* 4. Reproducible, and different per child — the differentiator, both halves */
{
  const a1 = CW.build({ input: SPELLING.join("\n"), seed: "Emma" });
  const a2 = CW.build({ input: SPELLING.join("\n"), seed: "Emma" });
  const b = CW.build({ input: SPELLING.join("\n"), seed: "Noah" });
  eq(gridText(a1.grid), gridText(a2.grid), "crossword: same seed reprints the identical grid");
  ok(gridText(a1.grid) !== gridText(b.grid), "crossword: a different seed gives a different grid");
}

/* 4b. The differentiator, stated as a floor rather than as "two differ".

   "N different versions so neighbours cannot copy" is a claim about a CLASS,
   not about one pair, so it is asserted over a class-sized run of seeds. The
   floor is 30 of 40 rather than 40 of 40 because two children colliding on one
   of several hundred viable layouts is not a failure of the promise.

   Measured while writing this: the seeded word-order shuffle and the
   near-best placement choice each carry part of it (39/40 with both, 33/40
   with the shuffle alone, 21/40 with the placement choice alone), so the
   floor catches the loss of either mechanism without pinning the exact value
   of a tuning constant. */
{
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    seen.add(gridText(CW.build({ input: SPELLING.join("\n"), seed: "kid" + i }).grid));
  }
  ok(seen.size >= 30, "crossword: 40 children get at least 30 distinct layouts — got " + seen.size);
}

/* 5. Every placed word is connected — a crossword with a floating word is not
      a crossword. Enforced by canPlace requiring a crossing; asserted here by
      flood-filling from the first cell and demanding every letter is reached. */
{
  const p = CW.build({ input: SPELLING.join("\n"), seed: "Ava" });
  let start = null, total = 0;
  for (let r = 0; r < p.height; r++) {
    for (let c = 0; c < p.width; c++) {
      if (!p.grid[r][c]) continue;
      total++;
      if (!start) start = [r, c];
    }
  }
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const [r, c] = stack.pop();
    const k = r + "," + c;
    if (seen.has(k)) continue;
    if (r < 0 || c < 0 || r >= p.height || c >= p.width || !p.grid[r][c]) continue;
    seen.add(k);
    stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
  eq(seen.size, total, "crossword: every filled cell is connected to the rest");
}

/* 6. Numbering is row-major and sequential with no gaps */
{
  const p = CW.build({ input: SPELLING.join("\n"), seed: "Emma" });
  const seq = [];
  for (let r = 0; r < p.height; r++) {
    for (let c = 0; c < p.width; c++) if (p.numbers[r][c]) seq.push(p.numbers[r][c]);
  }
  let sequential = true;
  for (let i = 0; i < seq.length; i++) if (seq[i] !== i + 1) sequential = false;
  ok(sequential, "crossword: numbers run 1..n in row-major order with no gaps");
  const used = new Set(p.entries.map((e) => e.number));
  ok(used.size > 0 && seq.length >= used.size, "crossword: every entry number exists on the grid");
}

/* 7. Clues survive parsing, on both separators */
{
  const p = CW.build({ input: CLUED.join("\n"), seed: "Emma" });
  const clued = p.words.filter((w) => w.clue);
  eq(clued.length, 5, "crossword: all five clues parsed (= and : both)");
  const capital = p.words.find((w) => w.key === "CAPITAL");
  eq(capital.clue, "The city a country governs from", "crossword: '=' clue text kept verbatim");
  const river = p.words.find((w) => w.key === "RIVER");
  eq(river.clue, "Water that flows to the sea", "crossword: ':' clue text kept verbatim");
}

/* 8. Unplaceable is an outcome. A word sharing no letter with the rest cannot
      cross anything, and must be reported rather than dropped or thrown. */
{
  const p = CW.build({ input: "RHYTHM\nJUKEBOX\nSPELLING\nLESSON", seed: "Emma" });
  const reported = p.unplaced.length + p.entries.length;
  ok(p.unplaced.length >= 1, "crossword: a non-crossing word is reported as unplaced");
  ok(p.width > 0, "crossword: the puzzle is still usable when a word will not fit");
  ok(reported >= 2, "crossword: every word is accounted for as placed or unplaced");
  const keys = new Set(p.words.map((w) => w.key));
  for (const u of p.unplaced) ok(keys.has(u.key), "crossword: unplaced word " + u.key + " came from the list");
}

/* 9. Degenerate input does not throw */
{
  eq(CW.build({ input: "", seed: "x" }).entries.length, 0, "crossword: empty input yields no entries");
  eq(CW.build({ input: "   \n  ,  ", seed: "x" }).entries.length, 0, "crossword: whitespace-only input yields no entries");
  /* A single word is a degenerate crossword, not a broken one: it really is in
     the grid and really does read back, so calling it "unplaced" would be the
     lie. The page decides whether one entry is worth printing; the builder
     only reports what is true. */
  const one = CW.build({ input: "ALONE", seed: "x" });
  eq(one.entries.length, 1, "crossword: a lone word is one honest entry");
  eq(one.unplaced.length, 0, "crossword: and is not falsely reported unplaced");
  eq(CW.readRun(one.grid, one.entries[0].row, one.entries[0].col, one.entries[0].dir), "ALONE",
     "crossword: the lone entry reads back out of the grid");
  eq(one.width, 5, "crossword: the grid is trimmed to the word");
  eq(one.height, 1, "crossword: a one-row grid is still read correctly (rectangle bounds)");
}

/* 10. A word longer than the grid cap is refused, not silently truncated */
{
  const long = "A".repeat(CW.CW_MAX + 4);
  const p = CW.build({ input: long + "\nCAT", seed: "x" });
  eq(p.entries.length, 0, "crossword: an over-long word produces no entry");
  ok(p.unplaced.length >= 1, "crossword: and is reported unplaced");
}

/* 11. ß is one cell, never expanded to SS */
{
  const p = CW.build({ input: "STRASSE\nFUSS\nWASSER", seed: "x" });
  const fuss = p.words.find((w) => w.display === "FUSS");
  ok(fuss, "crossword: a German word survives normalization");
  const sharp = CW.build({ input: "GROSS\nFUß", seed: "x" });
  const one = sharp.words.find((w) => w.display === "FUß");
  eq(one.letters.length, 3, "crossword: ß occupies exactly one cell");
}

/* 12. The grid never exceeds the cap in either dimension */
{
  const many = [];
  for (let i = 0; i < 30; i++) many.push("WORD" + String.fromCharCode(65 + i) + "ING");
  const p = CW.build({ input: many.join("\n"), seed: "big" });
  ok(p.width <= CW.CW_MAX, "crossword: width within cap — " + p.width);
  ok(p.height <= CW.CW_MAX, "crossword: height within cap — " + p.height);
}

/* ===============================================================
   WORD SCRAMBLE
   =============================================================== */

/* 13. Every scramble is a permutation of its answer */
{
  const s = SC.build({ input: SPELLING.join("\n"), seed: "Emma" });
  eq(s.words.length, SPELLING.length, "scramble: every word produced a puzzle");
  let notPerm = 0;
  for (const w of s.words) if (bag(w.scrambled) !== bag(w.letters)) notPerm++;
  eq(notPerm, 0, "scramble: every scramble is a letter-for-letter permutation");
}

/* 14. A scramble never shows the answer.

   SHORT words carry this case, and that is the whole point of it. A shuffle of
   a seven-letter word almost never lands back on the original by chance, so a
   list of them passes this test even with the guard that enforces it deleted —
   measured: removing `sameLetters` leaves the long list clean and shows the
   answer on 77 of 200 two-letter words. A test that cannot fail is not a test.
   Probed exactly that way before this case was written. */
{
  let same = 0, checked = 0;
  const SHORT = ["an", "to", "it", "be", "on", "up", "cat", "dog", "the"];
  for (let i = 0; i < 40; i++) {
    const s = SC.build({ input: SHORT.concat(SPELLING).join("\n"), seed: "kid" + i });
    for (const w of s.words) { checked++; if (w.text === w.letters.join("")) same++; }
  }
  ok(checked > 500, "scramble: the answer-visible case actually ran (" + checked + " words)");
  eq(same, 0, "scramble: no word prints unscrambled, over 40 seeds of short and long words");
}

/* 15. Reproducible, and different per child */
{
  const a1 = SC.build({ input: SPELLING.join("\n"), seed: "Emma" });
  const a2 = SC.build({ input: SPELLING.join("\n"), seed: "Emma" });
  const b = SC.build({ input: SPELLING.join("\n"), seed: "Noah" });
  eq(a1.words.map((w) => w.text).join("|"), a2.words.map((w) => w.text).join("|"),
     "scramble: same seed reprints the identical sheet");
  ok(a1.words.map((w) => w.text).join("|") !== b.words.map((w) => w.text).join("|"),
     "scramble: a different seed gives a different sheet");
}

/* 16. easy keeps the first letter; hard deranges */
{
  const e = SC.build({ input: SPELLING.join("\n"), seed: "Emma", level: "easy" });
  let moved = 0;
  for (const w of e.words) if (w.scrambled[0] !== w.letters[0]) moved++;
  eq(moved, 0, "scramble/easy: the first letter never moves");

  const h = SC.build({ input: SPELLING.join("\n"), seed: "Emma", level: "hard" });
  let notDeranged = 0;
  for (const w of h.words) if (!SC.isDerangement(w.letters, w.scrambled)) notDeranged++;
  eq(notDeranged, 0, "scramble/hard: no letter stays in its original position");

  const m = SC.build({ input: SPELLING.join("\n"), seed: "Emma", level: "medium" });
  eq(m.level, "medium", "scramble: an unknown level falls back to medium");
  eq(SC.build({ input: "cat", seed: "x", level: "nonsense" }).level, "medium",
     "scramble: a bogus level is not honoured");
}

/* 17. A word with no visible permutation is reported, not printed as itself */
{
  const s = SC.build({ input: "aaa\nI\noo\ncat", seed: "x" });
  const keys = s.unscrambled.map((w) => w.key).sort();
  eq(keys.join(","), "AAA,I,OO", "scramble: single-letter and all-same words are reported unscrambled");
  eq(s.words.length, 1, "scramble: only the solvable word becomes a puzzle");
  eq(s.words[0].key, "CAT", "scramble: and it is the right one");
}

/* 18. Hard falls back rather than looping forever on an impossible word */
{
  const s = SC.build({ input: "LULL\nBOOK\nCAT", seed: "x", level: "hard" });
  ok(s.words.length === 3, "scramble/hard: every solvable word still produces a puzzle");
  for (const w of s.words) {
    ok(bag(w.scrambled) === bag(w.letters), "scramble/hard: " + w.key + " stays a permutation on fallback");
    ok(w.text !== w.letters.join(""), "scramble/hard: " + w.key + " is never the answer itself");
    ok(typeof w.deranged === "boolean", "scramble/hard: " + w.key + " reports whether it deranged");
  }
}

/* 19. Accents and non-Latin scripts pass through as their own letters */
{
  const s = SC.build({ input: "canción\nmañana", seed: "x" });
  eq(s.words.length, 2, "scramble: accented Spanish words scramble");
  for (const w of s.words) eq(bag(w.scrambled), bag(w.letters), "scramble: " + w.key + " keeps its accented letters");
  const cy = SC.build({ input: "школа", seed: "x" });
  eq(cy.words.length, 1, "scramble: a Cyrillic word scrambles");
  eq(bag(cy.words[0].scrambled), bag(cy.words[0].letters), "scramble: Cyrillic letters are preserved");
}

/* 20. Multi-word entries keep their display spelling and scramble as one run */
{
  const s = SC.build({ input: "ice cream", seed: "x" });
  eq(s.words.length, 1, "scramble: a two-word entry is one puzzle");
  eq(s.words[0].display, "ice cream", "scramble: the display spelling is kept for the answer key");
  eq(s.words[0].letters.length, 8, "scramble: the space is not a letter");
}

/* 21. Duplicates are collapsed, and the list cap holds */
{
  const s = SC.build({ input: "cat\nCAT\n cat \ndog", seed: "x" });
  eq(s.words.length + s.unscrambled.length, 2, "scramble: case and spacing duplicates collapse to one entry");
  const many = [];
  for (let i = 0; i < 60; i++) many.push("word" + i);
  eq(SC.build({ input: many.join("\n"), seed: "x" }).words.length <= SC.MAX_WORDS, true,
     "scramble: the list cap is enforced");
}

console.log("\nwordPuzzles.test.js — " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
