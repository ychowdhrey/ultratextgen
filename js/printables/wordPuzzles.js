/* UltraTextGen — crossword and word-scramble builders.
   ------------------------------------------------------------------
   Why this file exists: /printables/crossword-maker/ and
   /printables/word-scramble-maker/ take a teacher's own spelling list and turn
   it into a puzzle, the same job /printables/word-search-maker/ already does
   with a grid. The differentiator is the same one, and it is the only thing
   this lane has that a tracing sheet cannot offer: N DIFFERENT versions of one
   list, so neighbours cannot copy. A tracing sheet has no order to vary; a
   puzzle is nothing but order.

   So placement and scrambling are both driven by a SEEDED generator. Seed with
   a child's name and that child's sheet is reproducible for the rest of the
   term, while the child beside them gets a different arrangement of the same
   words.

   Both builders are pure — words in, puzzle out, no DOM — so they can be
   tested without a browser (see wordPuzzles.test.js).

   ONE FILE, TWO PUZZLES, ON PURPOSE. Crossword and scramble need the same
   seeded RNG and the same entry parsing, and the two pages must agree on what
   "one word list" means: a list that yields ten crossword entries must yield
   the same ten scrambles. Splitting them into two files would put that
   agreement in two places.

   KNOWN DUPLICATION, RECORDED RATHER THAN HIDDEN. hashSeed/rng/shuffle/
   upperOne here are byte-equivalent to wordSearch.js's own copies. They were
   NOT extracted into a shared module in this change: wordSearch.js ships on a
   live page, is lazy-loaded as a single standalone script, and changing its
   load path to pull a dependency is a regression risk that this change does
   not need to take. The three copies must stay behaviourally identical — if
   you touch one, touch all three, and the honest fix when wordSearch.js is
   next opened for its own reasons is to extract them once.

   Four decisions worth keeping:

   * A WORD THE PUZZLE DOES NOT ACTUALLY CONTAIN IS THE FAILURE THAT MATTERS,
     and it is silent. A crossword clue numbered 7-Across whose grid run spells
     something else looks exactly like a working sheet, on screen and on paper,
     until thirty copies are on thirty desks. So the finished grid is re-scanned
     and every entry is read back out of it, rather than trusted from the
     placement log.

   * A RUN THE LIST NEVER ASKED FOR IS THE SAME BUG WEARING A DIFFERENT HAT.
     Two words placed side by side create a third, unlisted, unclued run. It is
     reported in `strays` and prevented during placement, because a solver
     cannot tell an accidental run from a missing clue.

   * UNPLACEABLE IS AN OUTCOME, NOT AN ERROR. A word that shares no letter with
     anything already placed, or a list too long for the sheet, comes back in
     `unplaced` with the puzzle still usable, so the page can name the word that
     did not fit instead of rendering nothing.

   * A CHARACTER WHOSE UPPERCASE IS LONGER THAN ITSELF STAYS AS IT IS. German ß
     uppercases to SS, and a crossword cell holds one character; splitting it
     would shift every square after it and silently break the word. */
(function () {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const ns = root.UltraTextGen = root.UltraTextGen || {};

  const MAX_WORDS = 30;
  const CW_MAX = 24;          // widest/tallest finished grid, in cells
  const WORK = 41;            // odd, so the working canvas has a true centre
  const CROSS_WEIGHT = 12;    // one crossing outranks 12 cells of drift
  const SLACK = CROSS_WEIGHT - 1; // vary position freely, never trade a crossing
  const SCRAMBLE_TRIES = 200; // bounded, so a seed always terminates

  /* ---------------------------------------------------------------
     Shared primitives. See the header note on the wordSearch.js copies.
     --------------------------------------------------------------- */

  // FNV-1a over the seed text, so a seed can be a child's name and still land
  // on a well-spread 32-bit value.
  function hashSeed(text) {
    let h = 0x811c9dc5;
    const s = String(text == null ? "" : text);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // mulberry32: small, fast, no dependency, and identical across engines —
  // which is what makes a reprint match the original sheet.
  function rng(seedText) {
    let a = hashSeed(seedText);
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, next) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }

  // Uppercase one character, unless doing so makes it more than one character
  // (ß → SS). See the header.
  function upperOne(ch) {
    const up = ch.toUpperCase();
    return Array.from(up).length === 1 ? up : ch;
  }

  const LETTER_RE = /[\p{L}\p{N}]/u;

  function puzzleLetters(text) {
    return Array.from(String(text))
      .filter((ch) => LETTER_RE.test(ch))
      .map(upperOne);
  }

  /* A crossword needs clues, and a teacher types them on the same line as the
     word. Split on the FIRST "=" or the first ":", so "capital = Paris is the
     ___ of France" and "capital: the ___ of France" both work and a clue may
     then contain anything, commas included. That is also why clue-bearing
     input splits on newlines only: a comma is punctuation inside a clue, not a
     separator between entries. */
  function splitEntry(line) {
    const s = String(line);
    const eq = s.indexOf("=");
    const co = s.indexOf(":");
    let at = -1;
    if (eq >= 0 && co >= 0) at = Math.min(eq, co);
    else if (eq >= 0) at = eq;
    else if (co >= 0) at = co;
    if (at < 0) return { display: s.trim(), clue: "" };
    return { display: s.slice(0, at).trim(), clue: s.slice(at + 1).trim() };
  }

  /* Accepts a textarea's value or an array. Keeps the entry's own spelling for
     the answer list and derives a separate letters-only form for the grid, so
     "ICE CREAM" is one eight-letter run and still reads as two words under it.
     With `clues` off, commas and semicolons separate entries too, which is how
     a scramble list is usually pasted. */
  function normalizeWords(input, clues) {
    const raw = Array.isArray(input)
      ? input
      : String(input == null ? "" : input).split(clues ? /[\r\n]+/ : /[\r\n,;]+/);
    const seen = Object.create(null);
    const out = [];
    for (const entry of raw) {
      const parsed = clues ? splitEntry(entry) : { display: String(entry).trim(), clue: "" };
      const display = parsed.display.replace(/\s+/g, " ").trim();
      if (!display) continue;
      const letters = puzzleLetters(display);
      if (!letters.length) continue;
      const key = letters.join("");
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ display: display, letters: letters, key: key, clue: parsed.clue });
      if (out.length >= MAX_WORDS) break;
    }
    return out;
  }

  /* ---------------------------------------------------------------
     Crossword
     --------------------------------------------------------------- */

  const ACROSS = "across";
  const DOWN = "down";

  function blank(size) {
    const g = new Array(size);
    for (let r = 0; r < size; r++) g[r] = new Array(size).fill("");
    return g;
  }

  /* Rectangle-safe on purpose. This is used on BOTH the square working canvas
     and the trimmed result, and the trimmed grid is almost never square. An
     earlier version bounded the column by grid.length -- the ROW count -- so
     on a 10x12 finished grid every column past 9 read as empty and readRun
     returned "BECAUSE" as "BECAU". The clue list said one thing and the
     squares said another, which is precisely the silent failure this module
     exists to prevent; it was caught by the verify-do-not-trust re-scan and
     not by anything looking at the placement log. */
  function cell(grid, r, c) {
    if (r < 0 || c < 0 || r >= grid.length) return null;
    const row = grid[r];
    if (c >= row.length) return null;
    return row[c];
  }

  /* Can `letters` sit at (r,c) running `dir`, on a grid that already holds
     `bbox`? Four rules, and the last two are what stop the grid inventing runs
     nobody clued:

       1. every cell is empty or already holds the letter we need;
       2. the finished grid stays inside CW_MAX in both dimensions;
       3. the cells immediately before and after the word are empty, so two
          words cannot run together into a longer one;
       4. for every cell we WRITE (as opposed to cross), both perpendicular
          neighbours are empty, so the new word cannot sit flush alongside an
          existing one and spell a second word down the join.

     A crossing cell is exempt from rule 4 by construction: its perpendicular
     neighbours belong to the word we are crossing, which was itself checked
     when it was placed. */
  function canPlace(grid, letters, r, c, dir, bbox) {
    const dr = dir === DOWN ? 1 : 0;
    const dc = dir === ACROSS ? 1 : 0;
    const len = letters.length;
    const endR = r + dr * (len - 1);
    const endC = c + dc * (len - 1);
    if (r < 0 || c < 0 || endR >= grid.length || endC >= grid.length) return null;

    const minR = Math.min(bbox.minR, r), maxR = Math.max(bbox.maxR, endR);
    const minC = Math.min(bbox.minC, c), maxC = Math.max(bbox.maxC, endC);
    if (maxR - minR + 1 > CW_MAX || maxC - minC + 1 > CW_MAX) return null;

    if (cell(grid, r - dr, c - dc)) return null;
    if (cell(grid, endR + dr, endC + dc)) return null;

    let crossings = 0;
    for (let i = 0; i < len; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      const have = grid[rr][cc];
      if (have) {
        if (have !== letters[i]) return null;
        crossings++;
        continue;
      }
      // rule 4, on the axis perpendicular to this word
      if (dir === ACROSS) {
        if (cell(grid, rr - 1, cc) || cell(grid, rr + 1, cc)) return null;
      } else {
        if (cell(grid, rr, cc - 1) || cell(grid, rr, cc + 1)) return null;
      }
    }
    if (!crossings) return null;
    return { row: r, col: c, dir: dir, crossings: crossings };
  }

  function write(grid, letters, r, c, dir) {
    const dr = dir === DOWN ? 1 : 0;
    const dc = dir === ACROSS ? 1 : 0;
    for (let i = 0; i < letters.length; i++) grid[r + dr * i][c + dc * i] = letters[i];
  }

  function readRun(grid, r, c, dir) {
    const dr = dir === DOWN ? 1 : 0;
    const dc = dir === ACROSS ? 1 : 0;
    const out = [];
    let rr = r, cc = c;
    while (cell(grid, rr, cc)) { out.push(grid[rr][cc]); rr += dr; cc += dc; }
    return out.join("");
  }

  /* Number the finished grid the way a crossword is numbered: row-major, and a
     cell takes the next number if it STARTS a run of two or more in either
     direction. One number can head both an Across and a Down entry, which is
     why the number is assigned to the cell and then read twice. */
  function numberGrid(grid, height, width) {
    const numbers = [];
    for (let r = 0; r < height; r++) numbers.push(new Array(width).fill(0));
    const starts = [];
    let n = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (!grid[r][c]) continue;
        const leftOpen = c === 0 || !grid[r][c - 1];
        const rightRuns = c + 1 < width && !!grid[r][c + 1];
        const upOpen = r === 0 || !grid[r - 1][c];
        const downRuns = r + 1 < height && !!grid[r + 1][c];
        const a = leftOpen && rightRuns;
        const d = upOpen && downRuns;
        if (!a && !d) continue;
        n++;
        numbers[r][c] = n;
        if (a) starts.push({ number: n, row: r, col: c, dir: ACROSS });
        if (d) starts.push({ number: n, row: r, col: c, dir: DOWN });
      }
    }
    return { numbers: numbers, starts: starts };
  }

  /* Build a crossword from a word list.

       build({ input | words, seed, maxWords })

     Returns the trimmed grid, the numbered entries split into across/down, the
     words that could not be placed, and any run the grid contains that the
     list never asked for. */
  function buildCrossword(opts) {
    const o = opts || {};
    const words = Array.isArray(o.words) && o.words.length && typeof o.words[0] === "object"
      ? o.words.slice(0, o.maxWords || MAX_WORDS)
      : normalizeWords(o.input != null ? o.input : o.words, true).slice(0, o.maxWords || MAX_WORDS);

    const empty = {
      width: 0, height: 0, grid: [], numbers: [], across: [], down: [],
      entries: [], words: [], unplaced: [], strays: [],
      seed: o.seed == null ? "" : String(o.seed)
    };
    if (!words.length) return empty;

    const next = rng(o.seed == null ? "" : String(o.seed));
    const grid = blank(WORK);
    /* Shuffle BEFORE the length sort, so words of equal length enter in seed
       order. Without this, a list whose words are mostly the same length lays
       itself down in the order it was typed no matter what the seed says. */
    const order = shuffle(words.slice(), next).sort((a, b) => b.letters.length - a.letters.length);

    // The longest word goes down the middle, horizontally. Everything else
    // hangs off it, which is why it is the longest: it offers the most letters
    // to cross.
    const first = order[0];
    if (first.letters.length > CW_MAX) {
      return Object.assign({}, empty, { unplaced: words.slice(), words: words.slice() });
    }
    const mid = Math.floor(WORK / 2);
    const startC = mid - Math.floor(first.letters.length / 2);
    write(grid, first.letters, mid, startC, ACROSS);
    const placed = [{ key: first.key, row: mid, col: startC, dir: ACROSS }];
    const bbox = {
      minR: mid, maxR: mid,
      minC: startC, maxC: startC + first.letters.length - 1
    };
    const unplaced = [];

    for (let w = 1; w < order.length; w++) {
      const word = order[w];
      const cands = [];
      for (let i = 0; i < word.letters.length; i++) {
        const need = word.letters[i];
        for (let r = bbox.minR - 1; r <= bbox.maxR + 1; r++) {
          for (let c = bbox.minC - 1; c <= bbox.maxC + 1; c++) {
            if (cell(grid, r, c) !== need) continue;
            const a = canPlace(grid, word.letters, r, c - i, ACROSS, bbox);
            if (a) cands.push(a);
            const d = canPlace(grid, word.letters, r - i, c, DOWN, bbox);
            if (d) cands.push(d);
          }
        }
      }
      if (!cands.length) { unplaced.push(word); continue; }

      /* Shuffle FIRST, then take the best score. Shuffling is what makes two
         seeds differ; scoring is what keeps the grid compact instead of a
         staircase. Ties therefore break on the seed, not on scan order. */
      shuffle(cands, next);
      let bestScore = -Infinity;
      for (const cand of cands) {
        const dr = cand.dir === DOWN ? 1 : 0;
        const dc = cand.dir === ACROSS ? 1 : 0;
        const cr = cand.row + dr * (word.letters.length - 1) / 2;
        const cc = cand.col + dc * (word.letters.length - 1) / 2;
        cand.score = cand.crossings * CROSS_WEIGHT - (Math.abs(cr - mid) + Math.abs(cc - mid));
        if (cand.score > bestScore) bestScore = cand.score;
      }
      /* Take any candidate within SLACK of the best, not the best itself.
         Scoring alone is deterministic, so a strict argmax hands every child
         the identical grid whenever one placement is even slightly better than
         the rest — which is most of the time, and which is the differentiator
         failing silently. SLACK is one point under CROSS_WEIGHT, so position
         varies freely but a crossing is never traded away for a prettier one.
         The list is already shuffled, so taking the first qualifier is a
         uniform seeded choice among them. */
      let best = cands[0];
      for (const cand of cands) {
        if (cand.score >= bestScore - SLACK) { best = cand; break; }
      }
      write(grid, word.letters, best.row, best.col, best.dir);
      placed.push({ key: word.key, row: best.row, col: best.col, dir: best.dir });
      bbox.minR = Math.min(bbox.minR, best.row);
      bbox.minC = Math.min(bbox.minC, best.col);
      bbox.maxR = Math.max(bbox.maxR, best.row + (best.dir === DOWN ? word.letters.length - 1 : 0));
      bbox.maxC = Math.max(bbox.maxC, best.col + (best.dir === ACROSS ? word.letters.length - 1 : 0));
    }

    // Trim the working canvas down to what was actually used.
    const height = bbox.maxR - bbox.minR + 1;
    const width = bbox.maxC - bbox.minC + 1;
    const out = [];
    for (let r = 0; r < height; r++) {
      const row = new Array(width);
      for (let c = 0; c < width; c++) row[c] = grid[bbox.minR + r][bbox.minC + c];
      out.push(row);
    }

    const numbered = numberGrid(out, height, width);
    const byKey = Object.create(null);
    for (const p of placed) {
      byKey[p.key] = { row: p.row - bbox.minR, col: p.col - bbox.minC, dir: p.dir };
    }

    /* Verify, do not trust. Read every numbered run back out of the finished
       grid and match it to the list. A run the list never asked for is a
       stray; a listed word whose run does not read back is unplaced, however
       confidently the placement log records it. */
    const wantKeys = Object.create(null);
    for (const word of words) wantKeys[word.key] = word;
    const entries = [];
    const strays = [];
    const found = Object.create(null);
    for (const s of numbered.starts) {
      const run = readRun(out, s.row, s.col, s.dir);
      const word = wantKeys[run];
      if (!word) { strays.push({ number: s.number, dir: s.dir, letters: run }); continue; }
      found[run] = true;
      entries.push({
        number: s.number, dir: s.dir, row: s.row, col: s.col,
        length: run.length, display: word.display, letters: run, clue: word.clue || ""
      });
    }
    entries.sort((a, b) => (a.dir === b.dir ? a.number - b.number : (a.dir === ACROSS ? -1 : 1)));

    const finalUnplaced = [];
    for (const word of words) {
      if (!found[word.key]) finalUnplaced.push({ display: word.display, letters: word.letters, key: word.key, clue: word.clue || "" });
    }

    return {
      width: width, height: height, grid: out, numbers: numbered.numbers,
      across: entries.filter((e) => e.dir === ACROSS),
      down: entries.filter((e) => e.dir === DOWN),
      entries: entries,
      words: words.map((w) => ({ display: w.display, letters: w.letters, key: w.key, clue: w.clue || "", placed: !!found[w.key] })),
      unplaced: finalUnplaced,
      strays: strays,
      placedAt: byKey,
      seed: o.seed == null ? "" : String(o.seed)
    };
  }

  /* ---------------------------------------------------------------
     Word scramble
     --------------------------------------------------------------- */

  /* Difficulty is a property of the PERMUTATION, not of the word list, so it
     can be stated exactly and tested:

       easy   — the first letter stays put. A child who knows the word can
                anchor on it, which is the whole point at early-primary level.
       medium — any permutation, as long as it is not the word itself.
       hard   — a derangement: no letter sits where it started. This is the
                strongest scramble a word admits, and it is what stops a
                six-letter word coming back with five letters in place.

     `hard` is not always reachable. "LULL" has no derangement that its
     repeated letters allow to look different, and rather than loop forever the
     builder falls back to the best permutation it found and says so in
     `deranged: false`. Bounded attempts, so a seed always terminates. */
  const LEVELS = { easy: "easy", medium: "medium", hard: "hard" };

  function sameLetters(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function isDerangement(original, candidate) {
    for (let i = 0; i < original.length; i++) if (original[i] === candidate[i]) return false;
    return true;
  }

  function scrambleOne(letters, next, level) {
    const n = letters.length;
    const distinct = new Set(letters).size;
    // A word of one letter, or one repeated letter, has no visible permutation.
    if (n < 2 || distinct < 2) return null;

    const fixFirst = level === LEVELS.easy && n > 2;
    let fallback = null;
    for (let t = 0; t < SCRAMBLE_TRIES; t++) {
      const work = fixFirst ? letters.slice(1) : letters.slice();
      shuffle(work, next);
      const cand = fixFirst ? [letters[0]].concat(work) : work;
      if (sameLetters(cand, letters)) continue;
      if (!fallback) fallback = cand;
      if (level !== LEVELS.hard) return { letters: cand, deranged: isDerangement(letters, cand) };
      if (isDerangement(letters, cand)) return { letters: cand, deranged: true };
    }
    if (fallback) return { letters: fallback, deranged: isDerangement(letters, fallback) };
    return null;
  }

  /* Build a scramble sheet from a word list.

       build({ input | words, seed, level, maxWords })

     Every entry keeps its own spelling for the answer key and carries the
     scrambled letters for the puzzle. A word that cannot be scrambled (one
     letter, or the same letter repeated) comes back in `unscrambled` rather
     than being printed unchanged next to a blank — which would read as a
     puzzle with the answer already filled in. */
  function buildScramble(opts) {
    const o = opts || {};
    const level = LEVELS[o.level] || LEVELS.medium;
    const words = Array.isArray(o.words) && o.words.length && typeof o.words[0] === "object"
      ? o.words.slice(0, o.maxWords || MAX_WORDS)
      : normalizeWords(o.input != null ? o.input : o.words, false).slice(0, o.maxWords || MAX_WORDS);

    const next = rng(o.seed == null ? "" : String(o.seed));
    const out = [];
    const unscrambled = [];
    for (const w of words) {
      const got = scrambleOne(w.letters, next, level);
      if (!got) {
        unscrambled.push({ display: w.display, letters: w.letters, key: w.key });
        continue;
      }
      out.push({
        display: w.display,
        letters: w.letters,
        key: w.key,
        scrambled: got.letters,
        text: got.letters.join(""),
        first: w.letters[0],
        length: w.letters.length,
        deranged: got.deranged
      });
    }
    return {
      words: out,
      unscrambled: unscrambled,
      level: level,
      seed: o.seed == null ? "" : String(o.seed)
    };
  }

  ns.crossword = {
    build: buildCrossword,
    normalizeWords: function (input) { return normalizeWords(input, true); },
    splitEntry: splitEntry,
    readRun: readRun,
    ACROSS: ACROSS,
    DOWN: DOWN,
    CW_MAX: CW_MAX,
    MAX_WORDS: MAX_WORDS
  };

  ns.wordScramble = {
    build: buildScramble,
    normalizeWords: function (input) { return normalizeWords(input, false); },
    scrambleOne: scrambleOne,
    isDerangement: isDerangement,
    LEVELS: LEVELS,
    MAX_WORDS: MAX_WORDS
  };
})();
