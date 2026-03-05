/* ==========================================================================
   UltraTextGen — vertical-layouts.js
   Pure transform functions for vertical text layouts.
   ========================================================================== */

(function (exports) {
  "use strict";

  /* ---------- helpers ---------- */

  /** Split input into words (non-empty tokens). */
  function splitWords(input) {
    if (!input) return [];
    return input.split(/\s+/).filter(Boolean);
  }

  /** Upside-down flip map (subset needed for vertical). */
  var flipMap = {
    'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ',
    'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'ן', 'm': 'ɯ', 'n': 'u',
    'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n',
    'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
    'A': '∀', 'B': 'B', 'C': 'Ɔ', 'D': 'D', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ',
    'H': 'H', 'I': 'I', 'J': 'ſ', 'K': 'K', 'L': '˥', 'M': 'W', 'N': 'N',
    'O': 'O', 'P': 'Ԁ', 'Q': 'Q', 'R': 'ᴚ', 'S': 'S', 'T': '┴', 'U': '∩',
    'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
    '1': '⇂', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ',
    '8': '8', '9': '6', '0': '0',
    '.': '˙', ',': "'", "'": ',', '"': '„', '_': '‾', '?': '¿', '!': '¡',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
    '&': '⅋', ';': '؛'
  };

  function flipChar(ch) {
    return flipMap[ch] || ch;
  }

  /** Get letters from words based on mode. */
  function getLetters(words, mode) {
    if (mode === "continuous") {
      return [Array.from(words.join(""))];
    }
    // stack mode (default): each word is its own block
    return words.map(function (w) { return Array.from(w); });
  }

  /** Join blocks with blank-line separator (stack mode). */
  function joinBlocks(blocks) {
    return blocks.filter(function (b) { return b.length > 0; }).join("\n\n");
  }

  /* ---------- layout functions ---------- */

  /**
   * Stacked Letters — one letter per line, blank line between words.
   */
  function makeVerticalStacked(words, mode) {
    var blocks = getLetters(words, mode);
    return joinBlocks(blocks.map(function (letters) {
      return letters.join("\n");
    }));
  }

  /**
   * Reverse Stacked — letters reversed within each word block.
   */
  function makeVerticalReverse(words, mode) {
    var blocks = getLetters(words, mode);
    return joinBlocks(blocks.map(function (letters) {
      return letters.slice().reverse().join("\n");
    }));
  }

  /**
   * Upside Down Stacked — flip each character and reverse order.
   */
  function makeVerticalUpsideDown(words, mode) {
    var blocks = getLetters(words, mode);
    return joinBlocks(blocks.map(function (letters) {
      return letters.slice().reverse().map(flipChar).join("\n");
    }));
  }

  /**
   * Extra Spaced Vertical — blank line between every letter.
   */
  function makeVerticalSpaced(words, mode) {
    var blocks = getLetters(words, mode);
    return joinBlocks(blocks.map(function (letters) {
      return letters.join("\n\n");
    }));
  }

  /**
   * Box Vertical — wrap vertical output inside a text frame.
   *
   * Example:
   * ╔═══╗
   * ║ Y ║
   * ║ a ║
   * ║ s ║
   * ╚═══╝
   */
  function makeVerticalBox(words, mode) {
    var blocks = getLetters(words, mode);
    var results = blocks.map(function (letters) {
      // Determine the max display width of a single character (usually 1).
      var maxW = 1;
      letters.forEach(function (ch) {
        if (ch.length > maxW) maxW = ch.length;
      });
      var inner = maxW + 2; // 1 space padding each side
      var top = "╔" + "═".repeat(inner) + "╗";
      var bottom = "╚" + "═".repeat(inner) + "╝";
      var body = letters.map(function (ch) {
        var pad = maxW - ch.length;
        return "║ " + ch + " ".repeat(pad) + " ║";
      }).join("\n");
      return top + "\n" + body + "\n" + bottom;
    });
    return results.join("\n\n");
  }

  /**
   * Staircase Vertical — each letter indented progressively.
   *
   * Example:
   * H
   *  e
   *   l
   *    l
   *     o
   */
  function makeVerticalStaircase(words, mode) {
    var blocks = getLetters(words, mode);
    return joinBlocks(blocks.map(function (letters) {
      return letters.map(function (ch, i) {
        return " ".repeat(i) + ch;
      }).join("\n");
    }));
  }

  /**
   * Double Column Vertical — first two words side by side.
   * If only one word exists, fallback to single column.
   */
  function makeVerticalDoubleColumn(words) {
    if (!words || words.length === 0) return "";
    var left = Array.from(words[0]);
    var right = words.length > 1 ? Array.from(words[1]) : null;
    if (!right) {
      return left.join("\n");
    }
    var maxLen = Math.max(left.length, right.length);
    var lines = [];
    for (var i = 0; i < maxLen; i++) {
      var l = i < left.length ? left[i] : " ";
      var r = i < right.length ? right[i] : " ";
      lines.push(l + "   " + r);
    }
    return lines.join("\n");
  }

  /**
   * Pyramid — growing triangle, adds one letter per row.
   *
   * Example:
   * Y
   * Y a
   * Y a s
   * Y a s i
   */
  function makeVerticalPyramid(words) {
    var letters = Array.from(words.join(" "));
    var lines = [];
    for (var i = 0; i < letters.length; i++) {
      lines.push(letters.slice(0, i + 1).join(" "));
    }
    return lines.join("\n");
  }

  /**
   * Reverse Pyramid — shrinking triangle.
   *
   * Example:
   * Y a s i
   * Y a s
   * Y a
   * Y
   */
  function makeVerticalReversePyramid(words) {
    var letters = Array.from(words.join(" "));
    var lines = [];
    for (var i = letters.length; i >= 1; i--) {
      lines.push(letters.slice(0, i).join(" "));
    }
    return lines.join("\n");
  }

  /**
   * Centered Pyramid — centered growing triangle.
   */
  function makeVerticalCenteredPyramid(words) {
    var letters = Array.from(words.join(" "));
    var maxWidth = letters.length * 2 - 1;
    var lines = [];
    for (var i = 0; i < letters.length; i++) {
      var row = letters.slice(0, i + 1).join(" ");
      var pad = Math.floor((maxWidth - row.length) / 2);
      lines.push(" ".repeat(pad) + row);
    }
    return lines.join("\n");
  }

  /**
   * Diagonal Right — each letter indented with increasing spaces.
   */
  function makeVerticalDiagonalRight(words) {
    var letters = Array.from(words.join(" "));
    return letters.map(function (ch, i) {
      return " ".repeat(i * 2) + ch;
    }).join("\n");
  }

  /**
   * Diagonal Left — indentation decreases (starts high, moves left).
   */
  function makeVerticalDiagonalLeft(words) {
    var letters = Array.from(words.join(" "));
    var maxIndent = (letters.length - 1) * 2;
    return letters.map(function (ch, i) {
      return " ".repeat(maxIndent - i * 2) + ch;
    }).join("\n");
  }

  /* ---------- layout registry ---------- */

  var LAYOUTS = [
    { id: "stacked",          name: "Stacked Letters",       fn: makeVerticalStacked,        usesMode: true },
    { id: "reverse",          name: "Reverse Stacked",       fn: makeVerticalReverse,        usesMode: true },
    { id: "upsidedown",       name: "Upside Down Stacked",   fn: makeVerticalUpsideDown,     usesMode: true },
    { id: "spaced",           name: "Extra Spaced Vertical", fn: makeVerticalSpaced,         usesMode: true },
    { id: "box",              name: "Box Vertical",          fn: makeVerticalBox,            usesMode: true },
    { id: "staircase",        name: "Staircase Vertical",    fn: makeVerticalStaircase,      usesMode: true },
    { id: "doublecolumn",     name: "Double Column Vertical",fn: makeVerticalDoubleColumn,   usesMode: false },
    { id: "pyramid",          name: "Pyramid",               fn: makeVerticalPyramid,        usesMode: false },
    { id: "reversepyramid",   name: "Reverse Pyramid",       fn: makeVerticalReversePyramid, usesMode: false },
    { id: "centeredpyramid",  name: "Centered Pyramid",      fn: makeVerticalCenteredPyramid,usesMode: false },
    { id: "diagonalright",    name: "Diagonal Right",        fn: makeVerticalDiagonalRight,  usesMode: false },
    { id: "diagonalleft",     name: "Diagonal Left",         fn: makeVerticalDiagonalLeft,   usesMode: false }
  ];

  /* ---------- public API ---------- */

  var VerticalLayouts = {
    LAYOUTS: LAYOUTS,
    splitWords: splitWords,
    makeVerticalStacked: makeVerticalStacked,
    makeVerticalReverse: makeVerticalReverse,
    makeVerticalUpsideDown: makeVerticalUpsideDown,
    makeVerticalSpaced: makeVerticalSpaced,
    makeVerticalBox: makeVerticalBox,
    makeVerticalStaircase: makeVerticalStaircase,
    makeVerticalDoubleColumn: makeVerticalDoubleColumn,
    makeVerticalPyramid: makeVerticalPyramid,
    makeVerticalReversePyramid: makeVerticalReversePyramid,
    makeVerticalCenteredPyramid: makeVerticalCenteredPyramid,
    makeVerticalDiagonalRight: makeVerticalDiagonalRight,
    makeVerticalDiagonalLeft: makeVerticalDiagonalLeft
  };

  // UMD-like export: browser sets window, Node sets module.exports
  if (typeof module !== "undefined" && module.exports) {
    module.exports = VerticalLayouts;
  } else {
    exports.VerticalLayouts = VerticalLayouts;
  }

})(typeof window !== "undefined" ? window : this);
