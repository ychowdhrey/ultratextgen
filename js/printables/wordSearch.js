/* UltraTextGen — word search grid placement.
   ------------------------------------------------------------------
   Why this file exists: /printables/word-search-maker/ takes a teacher's own
   spelling list and hides it in a grid. The differentiator is N DIFFERENT
   versions of one list — a grid per child, so neighbours cannot copy — and
   that is only worth anything if each grid is genuinely different AND the
   same one comes back on a reprint. So placement is driven by a SEEDED
   generator: seed the grid with a child's name and that child's sheet is
   reproducible for the rest of the term, while the child beside them gets a
   different arrangement of the same words.

   The algorithm is plain, and pure — it takes words and returns a grid, so it
   can be tested without a browser (see wordSearch.test.js):

     1. normalize each entry into a display form (kept for the clue list) and
        a letters form (what goes in the grid, spaces and punctuation gone).
     2. longest word first, enumerate every (row, col, direction) where it
        fits and every cell it lands on is empty or already holds the letter
        it needs.
     3. shuffle those candidates with the seeded generator, then take the one
        crossing the most already-placed letters. Shuffling first is what
        makes two seeds differ; preferring overlaps is what keeps the grid
        dense instead of a word-per-row ladder.
     4. fill the gaps, and re-scan to confirm every word is really findable.

   Four decisions worth keeping:

   * FILL LETTERS COME FROM THE WORDS' OWN ALPHABET, not A–Z. A lone Q or W in
     a grid of Spanish words is a giveaway, and sampling the letters the list
     already uses removes that tell. It also makes this module script-agnostic
     for free: a Polish, German or French list fills with its own letters, and
     nothing here carries a per-locale alphabet table to go stale.

   * THE GRID IS RE-SCANNED, and a word that cannot be found is reported as
     unplaced rather than trusted from the placement log. The failure mode is
     silent: a clue list naming a word the grid does not contain is an
     unsolvable sheet, and it looks exactly like a solvable one — on screen,
     on paper, and to whoever printed thirty of them.

   * A CHARACTER WHOSE UPPERCASE IS LONGER THAN ITSELF STAYS AS IT IS. German
     ß uppercases to SS, and a grid cell holds one character; splitting it
     would shift every letter after it and silently break the word.

   * UNPLACEABLE IS AN OUTCOME, NOT AN ERROR. A word longer than the grid, or
     a list too long for the space, comes back in `unplaced` with the grid
     still usable, so the page can say which word did not fit instead of
     rendering nothing. */
(function () {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const ns = root.UltraTextGen = root.UltraTextGen || {};

  const MIN_SIZE = 8;
  const MAX_SIZE = 22;
  const MAX_WORDS = 40;
  const EMPTY = "";

  // Eight directions as [rowStep, colStep]. Named so a difficulty level and a
  // shareable URL can both refer to them as text.
  const DIRS = {
    E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1],
    W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1]
  };

  /* Difficulty is which directions are allowed, not grid size — a 10x10 of
     forwards-only words is an early-primary puzzle and a 10x10 with reversals
     is not. Backwards words are the single biggest jump in difficulty, which
     is why they are the whole of the step from medium to hard. */
  const LEVELS = {
    easy: ["E", "S"],
    medium: ["E", "S", "SE", "NE"],
    hard: ["E", "S", "SE", "NE", "W", "N", "NW", "SW"]
  };

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

  function gridLetters(text) {
    return Array.from(String(text))
      .filter((ch) => LETTER_RE.test(ch))
      .map(upperOne);
  }

  /* Accepts a textarea's value (one entry per line, commas also split) or an
     array. Keeps the entry's own spelling for the clue list and derives a
     separate letters-only form for the grid, so "ICE CREAM" is one nine-letter
     run in the grid and still reads as two words underneath it. */
  function normalizeWords(input) {
    const raw = Array.isArray(input)
      ? input
      : String(input == null ? "" : input).split(/[\r\n,;]+/);
    const seen = Object.create(null);
    const out = [];
    for (const entry of raw) {
      const display = String(entry).replace(/\s+/g, " ").trim();
      if (!display) continue;
      const letters = gridLetters(display);
      if (!letters.length) continue;
      const key = letters.join("");
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ display: display, letters: letters, key: key });
      if (out.length >= MAX_WORDS) break;
    }
    return out;
  }

  /* Big enough that the words are not the only thing in it, never smaller than
     the longest word, and clamped so a pasted essay cannot ask for a 90x90
     sheet. 2.2 letters of space per letter of word is the ratio that reads as
     a puzzle rather than as a wall of text at these list sizes. */
  function gridSize(words, requested) {
    const longest = words.reduce((m, w) => Math.max(m, w.letters.length), 0);
    const total = words.reduce((n, w) => n + w.letters.length, 0);
    let size = requested ? Math.round(requested) : Math.ceil(Math.sqrt(total * 2.2));
    size = Math.max(size, longest, MIN_SIZE);
    return Math.min(size, MAX_SIZE);
  }

  function blankGrid(size) {
    const g = new Array(size);
    for (let r = 0; r < size; r++) {
      g[r] = new Array(size).fill(EMPTY);
    }
    return g;
  }

  function fits(grid, letters, row, col, dr, dc) {
    const size = grid.length;
    let overlap = 0;
    for (let i = 0; i < letters.length; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || c < 0 || r >= size || c >= size) return -1;
      const cell = grid[r][c];
      if (cell === EMPTY) continue;
      if (cell !== letters[i]) return -1;
      overlap++;
    }
    return overlap;
  }

  function place(grid, letters, row, col, dr, dc) {
    for (let i = 0; i < letters.length; i++) {
      grid[row + dr * i][col + dc * i] = letters[i];
    }
  }

  /* Every occurrence of a word in a finished grid, in any of the eight
     directions. Used to VERIFY a build rather than to trust it, and exported
     because the test must be able to check the grid without reading the same
     placement log the builder wrote. */
  function findWord(grid, word) {
    const letters = Array.isArray(word) ? word.slice() : gridLetters(word);
    const size = grid.length;
    const hits = [];
    if (!letters.length) return hits;
    const names = Object.keys(DIRS);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const name of names) {
          const d = DIRS[name];
          let ok = true;
          for (let i = 0; i < letters.length; i++) {
            const rr = r + d[0] * i, cc = c + d[1] * i;
            if (rr < 0 || cc < 0 || rr >= size || cc >= size || grid[rr][cc] !== letters[i]) { ok = false; break; }
          }
          if (ok) hits.push({ row: r, col: c, dir: name, dr: d[0], dc: d[1] });
        }
      }
    }
    return hits;
  }

  /* The alphabet the filler draws from: every distinct letter the list itself
     uses, weighted by how often it uses it, so the fill matches the words'
     own texture. Falls back to A–Z only when the list is too narrow to fill
     from (a 3-letter list would otherwise produce a grid of three repeating
     characters, which is its own kind of tell). */
  function fillAlphabet(words) {
    const pool = [];
    const distinct = Object.create(null);
    let count = 0;
    for (const w of words) {
      for (const ch of w.letters) {
        pool.push(ch);
        if (!distinct[ch]) { distinct[ch] = true; count++; }
      }
    }
    if (count >= 8) return pool;
    const ascii = [];
    for (let i = 65; i <= 90; i++) ascii.push(String.fromCharCode(i));
    return pool.concat(ascii);
  }

  /* Build a grid.

     Options: words (string or array), size, level ("easy"|"medium"|"hard") or
     an explicit directions array, seed (any text — a child's name), and
     fill:false to leave the gaps empty.

     Returns { size, grid, solution, words, placed, unplaced, level, seed } —
     `solution` is a same-shape boolean grid marking the cells a word occupies,
     so one grid renders both the puzzle and the answer key and the two cannot
     disagree. */
  function build(opts) {
    const o = opts || {};
    const words = Array.isArray(o.words) && o.words.length && o.words[0] && o.words[0].letters
      ? o.words
      : normalizeWords(o.words);
    const level = LEVELS[o.level] ? o.level : "medium";
    const dirNames = Array.isArray(o.directions) && o.directions.length
      ? o.directions.filter((d) => DIRS[d])
      : LEVELS[level];
    const size = gridSize(words, o.size);
    const grid = blankGrid(size);
    const next = rng(o.seed == null ? "utg" : o.seed);

    // Longest first: a long word has the fewest legal homes, so placing it
    // while the grid is empty is the difference between a full puzzle and one
    // that drops its hardest word.
    const order = words.slice().sort((a, b) => b.letters.length - a.letters.length);
    const placed = [];
    const unplaced = [];

    for (const w of order) {
      if (w.letters.length > size) { unplaced.push(w); continue; }
      const candidates = [];
      for (const name of dirNames) {
        const d = DIRS[name];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const overlap = fits(grid, w.letters, r, c, d[0], d[1]);
            if (overlap >= 0) candidates.push({ row: r, col: c, dir: name, dr: d[0], dc: d[1], overlap: overlap });
          }
        }
      }
      if (!candidates.length) { unplaced.push(w); continue; }
      // Shuffle first (so two seeds differ), then take the densest — a stable
      // max over a shuffled list, which is deterministic for a given seed.
      shuffle(candidates, next);
      let best = candidates[0];
      for (const cand of candidates) if (cand.overlap > best.overlap) best = cand;
      place(grid, w.letters, best.row, best.col, best.dr, best.dc);
      placed.push({
        display: w.display, letters: w.letters, key: w.key,
        row: best.row, col: best.col, dir: best.dir, dr: best.dr, dc: best.dc
      });
    }

    // Mark the answer cells before the gaps are filled — after the fill there
    // is no way to tell a word's letter from a coincidence.
    const solution = blankGrid(size).map((row) => row.map(() => false));
    for (const p of placed) {
      for (let i = 0; i < p.letters.length; i++) {
        solution[p.row + p.dr * i][p.col + p.dc * i] = true;
      }
    }

    if (o.fill !== false) {
      const pool = fillAlphabet(words);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === EMPTY) grid[r][c] = pool[Math.floor(next() * pool.length)];
        }
      }
    }

    /* Verify, do not trust. Anything the finished grid does not actually
       contain moves to `unplaced`, so the clue list and the grid can never
       disagree about what is in there. */
    const verified = [];
    for (const p of placed) {
      if (findWord(grid, p.letters).length) verified.push(p);
      else unplaced.push({ display: p.display, letters: p.letters, key: p.key });
    }

    // Back to the order the visitor typed, which is the order the clue list
    // should read in.
    const byKey = Object.create(null);
    for (const p of verified) byKey[p.key] = p;
    const inOrder = [];
    for (const w of words) {
      const hit = byKey[w.key];
      inOrder.push({
        display: w.display, letters: w.letters, key: w.key,
        placed: !!hit,
        row: hit ? hit.row : -1, col: hit ? hit.col : -1,
        dir: hit ? hit.dir : "", dr: hit ? hit.dr : 0, dc: hit ? hit.dc : 0
      });
    }

    return {
      size: size, grid: grid, solution: solution,
      words: inOrder, placed: verified, unplaced: unplaced,
      level: level, directions: dirNames.slice(), seed: o.seed == null ? "" : String(o.seed)
    };
  }

  ns.wordSearch = {
    build: build,
    findWord: findWord,
    normalizeWords: normalizeWords,
    gridSize: gridSize,
    fillAlphabet: fillAlphabet,
    DIRS: DIRS,
    LEVELS: LEVELS,
    MIN_SIZE: MIN_SIZE,
    MAX_SIZE: MAX_SIZE,
    MAX_WORDS: MAX_WORDS
  };
})();
