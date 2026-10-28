/* UltraTextGen: one reader for a pasted word list.
   ------------------------------------------------------------------
   Why this file exists: the word search, the crossword and the word scramble
   all take "your words" from one textarea, and a teacher pastes that list
   from wherever it already lives: a spreadsheet (word<TAB>clue), a chat
   assistant ("1. **Apple** - a red fruit"), a handout ("cat, dog, bird").
   Each tool used to read the paste its own way, so the same list meant three
   different things: "cat, dog, bird" was three words in the word search and
   one ten-letter answer in the crossword, and a two-column spreadsheet row
   became one entry, "cat a small pet", in all three.

   So the reading of a list lives here, once, and wordSearch.js and
   wordPuzzles.js keep only what is theirs: the letters a word puts in a grid,
   accent folding, de-duplication and the cap. Pure, no DOM, so it is tested
   in node (wordSearch.test.js and wordPuzzles.test.js load it first).

   The rules, in the order they apply to each line:

   * A NEW LINE always separates entries.
   * LEADING NUMBERING AND BULLETS ARE NOT THE WORD: "1." "2)" "(3)" "-" "*"
     and the usual bullet glyphs are dropped, as are markdown emphasis marks.
   * A TAB MAKES A TABLE ROW. The first column is the word and the rest is its
     clue, which is how a two-column vocabulary sheet copies out of a
     spreadsheet. A first column that is only a number ("1<TAB>cat<TAB>pet")
     is a row number and is skipped.
   * A CLUE SEPARATOR is the first "=", ":" or dash with a space either side
     ("Apple - a red fruit"), so "ice-cream" stays one word. With clues on
     (the crossword) everything after it is the clue and may hold commas.
   * COMMAS AND SEMICOLONS SPLIT A LINE THAT HOLDS A LIST. With clues on, only
     a line with no clue separator is split, because a comma inside a clue is
     punctuation. With clues off, a definition after the separator is dropped,
     unless what follows it is itself a short list ("Fruits: pear, plum"),
     in which case the part before it was a heading.

   Every tool therefore agrees on what one list is: a list that yields ten
   crossword entries yields the same ten words in the search and the
   scramble. Nothing here touches letters, so accents, Ñ, ß and the vowel
   signs of Hindi or Thai pass through exactly as typed. */
(function () {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const ns = root.UltraTextGen = root.UltraTextGen || {};

  const LIST_MARK_RE = /^\s*(?:[-*+\u2022\u2023\u2043\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1\u25BA\u25B8\u2013\u2014\u00B7]+\s*|\(?\d{1,3}[.)\]](?=\s|\p{L})\s*|\d{1,3}\s+[-\u2013\u2014:]\s+)/u;
  const TAIL_RE = /\s+[-\u2013\u2014]\s+|\s*[:=]\s*/u;
  const EMPHASIS_RE = /^[*_`"]+|[*_`"]+$/g;
  const LIST_SEP_RE = /[,;\uFF0C\uFF1B\u3001\u060C]+/;
  const ROW_NUMBER_RE = /^\(?\d{1,3}[.)\]]?$/;

  function unmark(text) {
    return String(text).replace(LIST_MARK_RE, "").replace(EMPHASIS_RE, "").trim();
  }

  function splitList(text) {
    return String(text).split(LIST_SEP_RE).map(unmark).filter(Boolean);
  }

  function isShortList(text) {
    const items = String(text).split(LIST_SEP_RE).map((x) => x.trim()).filter(Boolean);
    return items.length >= 2 && items.every((x) => x.split(/\s+/).length <= 2);
  }

  // { head, tail } around the first clue separator, or null when there is none.
  function splitAtClue(text) {
    const m = TAIL_RE.exec(text);
    if (!m || m.index === 0) return null;
    return { head: text.slice(0, m.index), tail: text.slice(m.index + m[0].length) };
  }

  // A table row: [word cell, clue cells...], with a bare row number dropped.
  function tableCells(line) {
    const cells = line.split("\t").map((x) => x.trim()).filter(Boolean);
    if (cells.length > 1 && ROW_NUMBER_RE.test(cells[0])) cells.shift();
    return cells;
  }

  function entriesFromLine(line, clues) {
    const s = String(line).replace(LIST_MARK_RE, "");
    if (!s.trim()) return [];

    if (s.indexOf("\t") !== -1) {
      const cells = tableCells(s);
      if (!cells.length) return [];
      if (clues) {
        const word = unmark(cells[0]);
        return word ? [{ display: word, clue: cells.slice(1).join("; ") }] : [];
      }
      // Without clues the word column may itself hold a list or a definition.
      return entriesFromLine(cells[0], false);
    }

    const parts = splitAtClue(s);
    if (clues) {
      if (parts) {
        const word = unmark(parts.head);
        return word ? [{ display: word, clue: parts.tail.trim() }] : [];
      }
      return splitList(s).map((w) => ({ display: w, clue: "" }));
    }

    const bare = unmark(s);
    if (!bare) return [];
    const p = splitAtClue(bare);
    const body = !p ? bare : (isShortList(p.tail) ? p.tail : p.head);
    return splitList(body).map((w) => ({ display: w, clue: "" }));
  }

  /* The whole paste, as entries in typed order: [{ display, clue }].
     `clues` is true for the crossword. Display text is the word as typed,
     marks and numbering removed; de-duplication and the cap are the caller's,
     because they depend on the letters each tool puts in its grid. */
  /* An array is already a list: each item is one entry, never split on its
     commas. With clues on, an item still carries its own clue ("capital =
     the city a country governs from"). */
  function arrayEntry(item, clues) {
    const s = String(item == null ? "" : item);
    if (!clues) return [{ display: s, clue: "" }];
    const cells = s.indexOf("\t") !== -1 ? tableCells(s.replace(LIST_MARK_RE, "")) : null;
    if (cells) return cells.length ? [{ display: unmark(cells[0]), clue: cells.slice(1).join("; ") }] : [];
    const parts = splitAtClue(s.replace(LIST_MARK_RE, ""));
    return parts ? [{ display: unmark(parts.head), clue: parts.tail }] : [{ display: unmark(s), clue: "" }];
  }

  function parse(input, clues) {
    const out = [];
    const groups = Array.isArray(input)
      ? input.map((item) => arrayEntry(item, !!clues))
      : String(input == null ? "" : input).split(/\r\n|[\r\n\u2028\u2029]/).map((line) => entriesFromLine(line, !!clues));
    for (const group of groups) {
      for (const e of group) {
        const display = e.display.replace(/\s+/g, " ").trim();
        if (display) out.push({ display: display, clue: e.clue.replace(/\s+/g, " ").trim() });
      }
    }
    return out;
  }

  ns.wordList = {
    parse: parse,
    unmark: unmark
  };
})();
