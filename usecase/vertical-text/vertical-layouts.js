/* ==========================================================================
   UltraTextGen — vertical-layouts.js
   Pure layout transform functions for vertical text generation.
   Exposes: window.VerticalLayouts
   ========================================================================== */

(function (global) {
  "use strict";

  /* ------------------------------------------------------------------
     Upside-down character map (a→ɐ, b→q, etc.)
     ------------------------------------------------------------------ */
  var UPSIDE_DOWN_MAP = {
    a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ",
    i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d",
    q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x",
    y: "ʎ", z: "z",
    A: "∀", B: "ᴮ", C: "Ɔ", D: "ᴰ", E: "Ǝ", F: "Ⅎ", G: "פ", H: "H",
    I: "I", J: "ſ", K: "ʞ", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ",
    Q: "Q", R: "ᴚ", S: "S", T: "┴", U: "∩", V: "Λ", W: "M", X: "X",
    Y: "⅄", Z: "Z",
    "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ",
    "6": "9", "7": "ㄥ", "8": "8", "9": "6",
    ".": "˙", ",": "'", "?": "¿", "!": "¡", "'": ",", "(": ")", ")": "(",
    "[": "]", "]": "[", "{": "}", "}": "{"
  };

  /* ------------------------------------------------------------------
     splitWords(input) — split input by whitespace into word array
     ------------------------------------------------------------------ */
  function splitWords(input) {
    if (!input || !input.trim()) return [];
    return input.trim().split(/\s+/);
  }

  /* ------------------------------------------------------------------
     helpers
     ------------------------------------------------------------------ */
  function wordToChars(word) {
    return word.split("");
  }

  /* Join word blocks with appropriate separator */
  function joinBlocks(blocks, mode, divider) {
    if (mode === "continuous") {
      return blocks.join("\n");
    }
    /* stack mode */
    var separator = divider || "";
    if (separator) {
      return blocks.join("\n" + separator + "\n");
    }
    return blocks.join("\n\n");
  }

  /* ------------------------------------------------------------------
     1. makeVerticalStacked(words, mode)
        One letter per line. Stack → blank line between words.
        Continuous → merge all letters into one stream.
     ------------------------------------------------------------------ */
  function makeVerticalStacked(words, mode) {
    if (!words || !words.length) return "";
    if (mode === "continuous") {
      return words.join("").split("").join("\n");
    }
    return words.map(function (w) { return wordToChars(w).join("\n"); }).join("\n\n");
  }

  /* ------------------------------------------------------------------
     2. makeVerticalReverse(words, mode)
        Same as stacked but each word's letters are reversed.
     ------------------------------------------------------------------ */
  function makeVerticalReverse(words, mode) {
    if (!words || !words.length) return "";
    if (mode === "continuous") {
      return words.join("").split("").reverse().join("\n");
    }
    return words.map(function (w) {
      return wordToChars(w).reverse().join("\n");
    }).join("\n\n");
  }

  /* ------------------------------------------------------------------
     3. makeVerticalUpsideDown(words, mode)
        Applies upside-down char map and reverses order of letters.
     ------------------------------------------------------------------ */
  function makeVerticalUpsideDown(words, mode) {
    if (!words || !words.length) return "";

    function flipChar(c) {
      return UPSIDE_DOWN_MAP[c] || c;
    }

    if (mode === "continuous") {
      return words.join("").split("").reverse().map(flipChar).join("\n");
    }
    return words.map(function (w) {
      return wordToChars(w).reverse().map(flipChar).join("\n");
    }).join("\n\n");
  }

  /* ------------------------------------------------------------------
     4. makeVerticalSpaced(words, mode)
        Double-spaced: blank line between each letter line.
     ------------------------------------------------------------------ */
  function makeVerticalSpaced(words, mode) {
    if (!words || !words.length) return "";
    if (mode === "continuous") {
      return words.join("").split("").join("\n\n");
    }
    return words.map(function (w) {
      return wordToChars(w).join("\n\n");
    }).join("\n\n\n");
  }

  /* ------------------------------------------------------------------
     5. makeVerticalBox(words, mode)
        Wraps vertical output in a Unicode box frame.
        Stack mode → each word gets its own box.
     ------------------------------------------------------------------ */
  function makeVerticalBox(words, mode) {
    if (!words || !words.length) return "";

    function buildBox(letters) {
      var top = "╔═══╗";
      var bottom = "╚═══╝";
      var rows = letters.map(function (ch) { return "║ " + ch + " ║"; });
      return [top].concat(rows).concat([bottom]).join("\n");
    }

    if (mode === "continuous") {
      return buildBox(words.join("").split(""));
    }
    return words.map(function (w) {
      return buildBox(wordToChars(w));
    }).join("\n\n");
  }

  /* ------------------------------------------------------------------
     6. makeVerticalStaircase(words, mode)
        Each letter indented progressively (2 spaces per step).
     ------------------------------------------------------------------ */
  function makeVerticalStaircase(words, mode) {
    if (!words || !words.length) return "";

    function buildStair(letters) {
      return letters.map(function (ch, i) {
        return "  ".repeat(i) + ch;
      }).join("\n");
    }

    if (mode === "continuous") {
      return buildStair(words.join("").split(""));
    }
    return words.map(function (w) {
      return buildStair(wordToChars(w));
    }).join("\n\n");
  }

  /* ------------------------------------------------------------------
     7. makeVerticalDoubleColumn(words)
        Uses first two words side by side; if one word, fallback to
        single column.
     ------------------------------------------------------------------ */
  function makeVerticalDoubleColumn(words) {
    if (!words || !words.length) return "";
    if (words.length === 1) {
      return wordToChars(words[0]).join("\n");
    }
    var w1 = wordToChars(words[0]);
    var w2 = wordToChars(words[1]);
    var maxLen = Math.max(w1.length, w2.length);
    var rows = [];
    for (var i = 0; i < maxLen; i++) {
      var c1 = i < w1.length ? w1[i] : " ";
      var c2 = i < w2.length ? w2[i] : " ";
      rows.push(c1 + "  " + c2);
    }
    return rows.join("\n");
  }

  /* ------------------------------------------------------------------
     8. makeVerticalPyramid(words)
        Growing triangle: each line adds one more letter.
        Uses first word (or all in continuous mode).
     ------------------------------------------------------------------ */
  function makeVerticalPyramid(words) {
    if (!words || !words.length) return "";
    var letters = words.join("").split("");
    var rows = [];
    for (var i = 0; i < letters.length; i++) {
      rows.push(letters.slice(0, i + 1).join(" "));
    }
    return rows.join("\n");
  }

  /* ------------------------------------------------------------------
     9. makeVerticalReversePyramid(words)
        Shrinking triangle: each line removes one letter from end.
     ------------------------------------------------------------------ */
  function makeVerticalReversePyramid(words) {
    if (!words || !words.length) return "";
    var letters = words.join("").split("");
    var rows = [];
    for (var i = letters.length; i > 0; i--) {
      rows.push(letters.slice(0, i).join(" "));
    }
    return rows.join("\n");
  }

  /* ------------------------------------------------------------------
     10. makeVerticalCenteredPyramid(words)
         Centered diamond-like growing pattern.
     ------------------------------------------------------------------ */
  function makeVerticalCenteredPyramid(words) {
    if (!words || !words.length) return "";
    var letters = words.join("").split("");
    var n = letters.length;
    var rows = [];
    for (var i = 0; i < n; i++) {
      var line = letters.slice(0, i + 1).join(" ");
      var totalWidth = (n - 1) * 2 + 1; /* max width in chars */
      var lineWidth = i * 2 + 1;
      var padding = Math.floor((totalWidth - lineWidth) / 2);
      rows.push(" ".repeat(padding) + line);
    }
    return rows.join("\n");
  }

  /* ------------------------------------------------------------------
     11. makeVerticalDiagonalRight(words)
         Each letter indented with increasing spaces (1 space per step).
     ------------------------------------------------------------------ */
  function makeVerticalDiagonalRight(words) {
    if (!words || !words.length) return "";
    var letters = words.join("").split("");
    return letters.map(function (ch, i) {
      return " ".repeat(i) + ch;
    }).join("\n");
  }

  /* ------------------------------------------------------------------
     12. makeVerticalDiagonalLeft(words)
         Indent decreases (start at max, go to 0).
     ------------------------------------------------------------------ */
  function makeVerticalDiagonalLeft(words) {
    if (!words || !words.length) return "";
    var letters = words.join("").split("");
    var maxIndent = letters.length - 1;
    return letters.map(function (ch, i) {
      return " ".repeat(maxIndent - i) + ch;
    }).join("\n");
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */
  global.VerticalLayouts = {
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

}(typeof window !== "undefined" ? window : global));
