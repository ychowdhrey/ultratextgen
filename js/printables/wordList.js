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
   * COMMAS, SEMICOLONS AND "|" SPLIT A LINE THAT HOLDS A LIST. With clues
     on, only a line with no clue separator is split, because a comma inside a
     clue is punctuation. With clues off, a definition after the separator is
     dropped, unless the separator is a colon and what follows it is itself a
     short list ("Fruits: pear, plum"), in which case the part before it was a
     heading. "Apple = a red, crunchy fruit" is always the word Apple.

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
  const LIST_SEP_RE = /[,;|\uFF0C\uFF1B\u3001\u060C]+/;
  const ARTICLE_RE = /^(?:a|an|the)\s/i;
  const ROW_NUMBER_RE = /^\(?\d{1,3}[.)\]]?$/;

  function unmark(text) {
    return String(text).replace(LIST_MARK_RE, "").replace(EMPHASIS_RE, "").trim();
  }

  function splitList(text) {
    return String(text).split(LIST_SEP_RE).map(unmark).filter(Boolean);
  }

  /* "Fruits: pear, plum" is a heading over a list; "Apple = a red, crunchy
     fruit" is a word and its definition. Only a colon introduces a heading:
     "=" and a spaced dash are how a word is defined, and a definition's commas
     are punctuation. Even after a colon, a tail that opens with an article
     ("Apple: a red, crunchy fruit") is a description, not a list. */
  function isShortList(text, sep) {
    if (sep && !/:/.test(sep)) return false;
    const items = String(text).split(LIST_SEP_RE).map((x) => x.trim()).filter(Boolean);
    return items.length >= 2 && !ARTICLE_RE.test(items[0]) && items.every((x) => x.split(/\s+/).length <= 2);
  }

  // { head, tail } around the first clue separator, or null when there is none.
  function splitAtClue(text) {
    const m = TAIL_RE.exec(text);
    if (!m || m.index === 0) return null;
    return { head: text.slice(0, m.index), tail: text.slice(m.index + m[0].length), sep: m[0] };
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
    const body = !p ? bare : (isShortList(p.tail, p.sep) ? p.tail : p.head);
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

  /* The spelling generator's reading of the same paste: parse() first, so a
     list is the same words here as on the puzzles, then the two rules that
     are spelling's own. A teacher marks the tricky part in brackets,
     fr[ie]nd, and that span is kept. An entry must be one word of letters
     (apostrophes and hyphens allowed, up to `maxLetters`), because every
     sheet sets it as one traced word; anything else is reported in
     `skipped`. Past `cap` words an entry is reported in `over`, never
     dropped in silence. Duplicates, by lowercase spelling, are dropped. */
  const SPELLING_BRACKET_RE = /^([\p{L}'-]*)\[([\p{L}'-]+)\]([\p{L}'-]*)$/u;
  function spellingList(input, cap, maxLetters) {
    const limit = cap == null ? Infinity : cap;
    const longest = maxLetters || 20;
    const wordRe = new RegExp("^[\\p{L}'-]{1," + longest + "}$", "u");
    const words = [];
    const skipped = [];
    const over = [];
    const seen = new Set();
    parse(input, false).forEach((e) => {
      const entry = e.display;
      const m = entry.match(SPELLING_BRACKET_RE);
      const word = m ? m[1] + m[2] + m[3] : entry;
      if (!wordRe.test(word)) { skipped.push(entry); return; }
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      if (words.length >= limit) { over.push(word); return; }
      words.push({ word: word, typed: entry, tricky: m ? [m[1].length, m[1].length + m[2].length] : null });
    });
    return { words: words, skipped: skipped, over: over };
  }

  /* A list as it travels in a link (?words=a|b|c): one item per entry, read
     by the same parse() the receiving tool uses, so a clue's comma is never
     taken for a list break. With `clues` an entry keeps "word = clue" (the
     crossword); without, it is the bare word, which is what every other tool
     prints. A "|" inside an entry would split it on the way back, so it is
     written as "/". fromParam() is the read side: one entry per line, which
     parse() reads back as the same list. */
  function toCarry(input, clues) {
    const bar = (x) => String(x).replace(/\|/g, "/").trim();
    return parse(input, !!clues)
      .map((e) => bar(clues && e.clue ? e.display + " = " + e.clue : e.display))
      .filter(Boolean);
  }
  /* The list a link carries to ANOTHER tool, by what that tool is:
     "clues" (the crossword) gets the paste as the crossword reads it, clues
     and all; "spelling" keeps the fr[ie]nd brackets that mark a tricky part;
     "words" (the word search, the scramble, the handwriting Word list) gets
     the bare words, brackets removed, since only spelling reads them. */
  function carryFor(input, kind) {
    const list = toCarry(input, kind === "clues");
    if (kind === "spelling") return list;
    return list.map((x) => x.replace(/[[\]]/g, "").trim()).filter(Boolean);
  }
  function fromParam(value) {
    return String(value == null ? "" : value).split("|").map((x) => x.trim()).filter(Boolean).join("\n");
  }

  ns.wordList = {
    parse: parse,
    unmark: unmark,
    spelling: spellingList,
    toCarry: toCarry,
    carryFor: carryFor,
    fromParam: fromParam
  };
})();
