/* ==========================================================================
   UltraTextGen — asciiBannerFonts.js
   FIGlet-style block-letter ASCII art fonts. Pure logic, no DOM — so it can
   be reused or eyeballed in Node exactly like asciiConverter.js /
   verticalLayouts.js (the "one feature, one self-contained pure-logic
   module" pattern).

   Font-binary rule (see CLAUDE.md): no .ttf/.otf is bundled. Every glyph is
   hand-authored here in plain JS, in two families:

   1. "Standard" — literal pre-drawn rows per character (like real FIGlet
      .flf fonts), line art built ONLY from 7-bit ASCII punctuation
      (/ \ | _ ( ) < > etc.), so the output pastes cleanly even where
      Unicode block characters break (some terminals, old forums, code
      comments). See STANDARD_GLYPHS.

   2. The five block styles — *derived transforms* of ONE validated 5x5
      on/off source bitmap (see BITMAPS), so they are aligned by
      construction — a letter can never go ragged in one style while
      looking fine in another.

   Exposes: window.UTG_ASCII_BANNER_FONTS = {
     fonts: [ { key, name, description }, ... ]  // picker order
     render(text, fontKey) -> string             // multi-line banner
   }
   ========================================================================== */

(function () {
  "use strict";

  /* --------------------------------------------------------------------
     Source bitmaps. Each glyph is an array of 5 equal-width rows; '#' is
     an "on" cell, '.' is "off". Widths may differ between glyphs (the art
     is variable-width, like real FIGlet) but every row inside one glyph is
     the same length, which is what keeps columns aligned.
     -------------------------------------------------------------------- */
  var BITMAPS = {
    "A": [".###.", "#...#", "#####", "#...#", "#...#"],
    "B": ["####.", "#...#", "####.", "#...#", "####."],
    "C": [".####", "#....", "#....", "#....", ".####"],
    "D": ["###..", "#..#.", "#...#", "#..#.", "###.."],
    "E": ["#####", "#....", "###..", "#....", "#####"],
    "F": ["#####", "#....", "###..", "#....", "#...."],
    "G": [".####", "#....", "#..##", "#...#", ".###."],
    "H": ["#...#", "#...#", "#####", "#...#", "#...#"],
    "I": ["#####", "..#..", "..#..", "..#..", "#####"],
    "J": ["..###", "...#.", "...#.", "#..#.", ".##.."],
    "K": ["#...#", "#..#.", "###..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "####.", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "####.", "#..#.", "#...#"],
    "S": [".####", "#....", ".###.", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
    "X": ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    "Y": ["#...#", ".#.#.", "..#..", "..#..", "..#.."],
    "Z": ["#####", "...#.", "..#..", ".#...", "#####"],
    "0": [".###.", "#..##", "#.#.#", "##..#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "..##.", ".#...", "#####"],
    "3": ["####.", "....#", ".###.", "....#", "####."],
    "4": ["#..#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "####.", "....#", "####."],
    "6": [".###.", "#....", "####.", "#...#", ".###."],
    "7": ["#####", "...#.", "..#..", ".#...", ".#..."],
    "8": [".###.", "#...#", ".###.", "#...#", ".###."],
    "9": [".###.", "#...#", ".####", "....#", ".###."],
    " ": ["....", "....", "....", "....", "...."],
    "!": ["..#..", "..#..", "..#..", ".....", "..#.."],
    "?": [".###.", "#...#", "..##.", ".....", "..#.."],
    ".": [".....", ".....", ".....", ".....", "..#.."],
    "-": [".....", ".....", ".###.", ".....", "....."]
  };

  var SRC_ROWS = 5;

  /* --------------------------------------------------------------------
     "Standard" glyphs. Unlike BITMAPS these are NOT on/off grids to be
     filled — each row is the literal output, hand-drawn as genre-classic
     ASCII line art: diagonals as / and \, verticals as |, horizontals as
     _ or -, curves approximated with ( ) < > ' . , — every character is
     genuine 7-bit ASCII (0x20–0x7E), no Unicode. Same alignment contract
     as BITMAPS: 5 rows per glyph, every row inside one glyph exactly the
     same length; widths vary glyph to glyph like real FIGlet fonts.
     -------------------------------------------------------------------- */
  const STANDARD_GLYPHS = {
    "A": ["    _    ", "   / \\   ", "  / _ \\  ", " / ___ \\ ", "/_/   \\_\\"],
    "B": [" ____  ", "| __ ) ", "|  _ \\ ", "| |_) |", "|____/ "],
    "C": ["  ____ ", " / ___|", "| |    ", "| |___ ", " \\____|"],
    "D": [" ____  ", "|  _ \\ ", "| | | |", "| |_| |", "|____/ "],
    "E": [" _____ ", "| ____|", "|  _|  ", "| |___ ", "|_____|"],
    "F": [" _____ ", "|  ___|", "| |_   ", "|  _|  ", "|_|    "],
    "G": ["  ____ ", " / ___|", "| |  _ ", "| |_| |", " \\____|"],
    "H": [" _   _ ", "| | | |", "| |_| |", "|  _  |", "|_| |_|"],
    "I": [" _ ", "| |", "| |", "| |", "|_|"],
    "J": ["     _ ", "    | |", " _  | |", "| |_| |", " \\___/ "],
    "K": [" _  __", "| |/ /", "| ' / ", "| . \\ ", "|_|\\_\\"],
    "L": [" _     ", "| |    ", "| |    ", "| |___ ", "|_____|"],
    "M": [" __  __ ", "|  \\/  |", "| |\\/| |", "| |  | |", "|_|  |_|"],
    "N": [" _   _ ", "| \\ | |", "|  \\| |", "| |\\  |", "|_| \\_|"],
    "O": ["  ___  ", " / _ \\ ", "| | | |", "| |_| |", " \\___/ "],
    "P": [" ____  ", "|  _ \\ ", "| |_) |", "|  __/ ", "|_|    "],
    "Q": ["  ___  ", " / _ \\ ", "| | | |", "| |_| |", " \\__\\_\\"],
    "R": [" ____  ", "|  _ \\ ", "| |_) |", "|  _ < ", "|_| \\_\\"],
    "S": [" ____  ", "/ ___| ", "\\___ \\ ", " ___) |", "|____/ "],
    "T": [" _____ ", "|_   _|", "  | |  ", "  | |  ", "  |_|  "],
    "U": [" _   _ ", "| | | |", "| | | |", "| |_| |", " \\___/ "],
    "V": ["__     __", "\\ \\   / /", " \\ \\ / / ", "  \\ V /  ", "   \\_/   "],
    "W": ["__        __", "\\ \\      / /", " \\ \\ /\\ / / ", "  \\ V  V /  ", "   \\_/\\_/   "],
    "X": ["__  __", "\\ \\/ /", " \\  / ", " /  \\ ", "/_/\\_\\"],
    "Y": ["__   __", "\\ \\ / /", " \\ V / ", "  | |  ", "  |_|  "],
    "Z": [" _____", "|__  /", "  / / ", " / /_ ", "/____|"],
    "0": ["  ___  ", " / _ \\ ", "| | | |", "| |_| |", " \\___/ "],
    "1": [" _ ", "/ |", "| |", "| |", "|_|"],
    "2": [" ____  ", "|___ \\ ", "  __) |", " / __/ ", "|_____|"],
    "3": [" _____ ", "|___ / ", "  |_ \\ ", " ___) |", "|____/ "],
    "4": [" _  _   ", "| || |  ", "| || |_ ", "|__   _|", "   |_|  "],
    "5": [" ____  ", "| ___| ", "|___ \\ ", " ___) |", "|____/ "],
    "6": ["  __   ", " / /_  ", "| '_ \\ ", "| (_) |", " \\___/ "],
    "7": [" _____ ", "|___  |", "   / / ", "  / /  ", " /_/   "],
    "8": ["  ___  ", " ( _ ) ", " / _ \\ ", "| (_) |", " \\___/ "],
    "9": ["  ___  ", " / _ \\ ", "| (_) |", " \\__, |", "   /_/ "],
    " ": ["    ", "    ", "    ", "    ", "    "],
    "!": [" _ ", "| |", "| |", "|_|", "(_)"],
    "?": [" ___  ", "|__ \\ ", "  / / ", " |_|  ", " (_)  "],
    ".": ["   ", "   ", "   ", " _ ", "(_)"],
    "-": ["      ", " ____ ", "|____|", "      ", "      "]
  };

  /* Turn a glyph's string rows into a boolean grid [row][col]. */
  function toGrid(rows) {
    return rows.map(function (row) {
      return row.split("").map(function (ch) { return ch === "#"; });
    });
  }

  function repeat(ch, n) {
    var s = "";
    for (var i = 0; i < n; i += 1) s += ch;
    return s;
  }

  /* --------------------------------------------------------------------
     Style renderers. Each takes a boolean grid (5 rows) for one glyph and
     returns an array of output rows (all equal width). Height is fixed per
     style so glyphs stack on a shared baseline.
     -------------------------------------------------------------------- */

  // Solid full-block letters.
  function renderBlock(grid, on) {
    return grid.map(function (row) {
      return row.map(function (cell) { return cell ? on : " "; }).join("");
    });
  }

  // Classic "banner" hash letters (same shapes, '#' fill).
  function styleBlock(grid) { return renderBlock(grid, "█"); } // █
  function styleBanner(grid) { return renderBlock(grid, "#"); }

  // Italic shear: top rows pushed right, bottom rows flush left. Constant
  // total width (SRC_ROWS-1 extra columns) keeps every row equal length.
  function styleSlant(grid) {
    var lean = SRC_ROWS - 1;
    return grid.map(function (row, r) {
      var lead = lean - r;
      var trail = r;
      var body = row.map(function (cell) { return cell ? "█" : " "; }).join("");
      return repeat(" ", lead) + body + repeat(" ", trail);
    });
  }

  // Drop-shadow / 3D: solid block plus a light-shade ghost one cell down-right.
  function styleShadow(grid) {
    var h = SRC_ROWS + 1;
    var w = grid[0].length + 1;
    var out = [];
    var r, c;
    for (r = 0; r < h; r += 1) out.push(new Array(w).fill(" "));
    // shadow first…
    for (r = 0; r < SRC_ROWS; r += 1) {
      for (c = 0; c < grid[r].length; c += 1) {
        if (grid[r][c]) out[r + 1][c + 1] = "░"; // ░
      }
    }
    // …then the solid face on top.
    for (r = 0; r < SRC_ROWS; r += 1) {
      for (c = 0; c < grid[r].length; c += 1) {
        if (grid[r][c]) out[r][c] = "█"; // █
      }
    }
    return out.map(function (row) { return row.join(""); });
  }

  // Compact half-height: pair each two source rows into one row using
  // half-block glyphs. 5 rows -> 3 rows, same width. Stays readable.
  function styleMini(grid) {
    var padded = grid.slice();
    if (padded.length % 2 === 1) {
      padded = padded.concat([grid[0].map(function () { return false; })]);
    }
    var out = [];
    for (var r = 0; r < padded.length; r += 2) {
      var top = padded[r];
      var bot = padded[r + 1];
      var line = "";
      for (var c = 0; c < top.length; c += 1) {
        var t = top[c];
        var b = bot[c];
        line += t && b ? "█" : t ? "▀" : b ? "▄" : " "; // █ ▀ ▄
      }
      out.push(line);
    }
    return out;
  }

  // True-ASCII line art: pure lookup into the pre-drawn STANDARD_GLYPHS
  // rows. Takes the character itself (not a grid) — flagged with
  // `literal: true` in STYLES so render() skips the toGrid pipeline.
  function styleStandard(ch) {
    if (Object.prototype.hasOwnProperty.call(STANDARD_GLYPHS, ch)) {
      return STANDARD_GLYPHS[ch];
    }
    return STANDARD_GLYPHS[" "];
  }

  var STYLES = {
    standard: { render: styleStandard, gap: 1, literal: true },
    block: { render: styleBlock, gap: 1 },
    slant: { render: styleSlant, gap: 1 },
    shadow: { render: styleShadow, gap: 1 },
    banner: { render: styleBanner, gap: 2 },
    mini: { render: styleMini, gap: 1 }
  };

  var FONTS = [
    { key: "standard", name: "Standard", description: "Real ASCII line art — pastes cleanly everywhere" },
    { key: "block", name: "Block", description: "Solid full-block capitals" },
    { key: "slant", name: "Slant", description: "Leaning italic block letters" },
    { key: "shadow", name: "Shadow", description: "3D letters with a drop shadow" },
    { key: "banner", name: "Banner", description: "Classic hash-mark banner style" },
    { key: "mini", name: "Mini", description: "Compact half-height letters" }
  ];

  function glyphFor(ch) {
    if (Object.prototype.hasOwnProperty.call(BITMAPS, ch)) return BITMAPS[ch];
    return BITMAPS[" "];
  }

  /* Render a whole string into a multi-line banner in the given style.
     Unknown characters fall back to a blank glyph; input is upper-cased
     because this genre reuses one set of capital shapes for both cases. */
  function render(text, fontKey) {
    var style = STYLES[fontKey] || STYLES.standard;
    var chars = String(text == null ? "" : text).toUpperCase().split("");
    if (!chars.length) return "";

    // Render each glyph to its block of rows. Literal styles look up
    // pre-drawn rows by character; bitmap styles fill a boolean grid.
    var blocks = chars.map(function (ch) {
      if (style.literal) return style.render(ch);
      return style.render(toGrid(glyphFor(ch)));
    });

    var height = blocks.length ? blocks[0].length : 0;
    var gap = repeat(" ", style.gap);
    var lines = [];
    for (var r = 0; r < height; r += 1) {
      var parts = blocks.map(function (block) { return block[r] || ""; });
      lines.push(parts.join(gap));
    }

    // Trim only the trailing whitespace every row shares in common, so
    // dead width is dropped without leaving rows ragged relative to each
    // other (a glyph like "I" is narrower than "#####" on some of its own
    // rows, so per-row rstrip made those rows shorter than their neighbors).
    var minTrailing = Infinity;
    for (var i = 0; i < lines.length; i += 1) {
      var m = lines[i].match(/\s+$/);
      minTrailing = Math.min(minTrailing, m ? m[0].length : 0);
    }
    if (minTrailing > 0 && minTrailing !== Infinity) {
      lines = lines.map(function (line) { return line.slice(0, line.length - minTrailing); });
    }
    return lines.join("\n");
  }

  window.UTG_ASCII_BANNER_FONTS = { fonts: FONTS, render: render };
})();
