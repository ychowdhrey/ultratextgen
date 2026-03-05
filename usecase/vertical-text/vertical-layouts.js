/* ==========================================================================
   Vertical Text Layouts — pure transform functions
   Each function returns a plain string with newline separators.
   ========================================================================== */

(function () {
  "use strict";

  /**
   * Split input into words (whitespace-separated, trimmed).
   * @param {string} input
   * @returns {string[]}
   */
  function splitWords(input) {
    if (!input || !input.trim()) return [];
    return input.trim().split(/\s+/);
  }

  /* ------------------------------------------------------------------
     Helper: turn a single word into an array of its visible characters.
     Uses Array.from so multi-byte / emoji characters are kept intact.
     ------------------------------------------------------------------ */
  function chars(word) {
    return Array.from(word);
  }

  /* ------------------------------------------------------------------
     SIMPLE — each letter on its own line.
     Stack mode  : blank line between words.
     Continuous  : remove spaces, treat as one stream.
     ------------------------------------------------------------------ */
  function makeVerticalSimple(words, mode) {
    if (!words || words.length === 0) return "";
    if (mode === "continuous") {
      return chars(words.join("")).join("\n");
    }
    return words
      .map(function (w) {
        return chars(w).join("\n");
      })
      .join("\n\n");
  }

  /* ------------------------------------------------------------------
     EXTRA SPACED — blank line between every letter.
     Stack mode  : double blank line between words.
     Continuous  : remove spaces, treat as one stream.
     ------------------------------------------------------------------ */
  function makeVerticalSpaced(words, mode) {
    if (!words || words.length === 0) return "";
    if (mode === "continuous") {
      return chars(words.join("")).join("\n\n");
    }
    return words
      .map(function (w) {
        return chars(w).join("\n\n");
      })
      .join("\n\n\n");
  }

  /* ------------------------------------------------------------------
     BOX — each letter line is wrapped in a box: | X |
     Stack mode  : blank line between words.
     Continuous  : remove spaces, treat as one stream.
     ------------------------------------------------------------------ */
  function makeVerticalBox(words, mode) {
    if (!words || words.length === 0) return "";

    function boxLine(ch) {
      return "| " + ch + " |";
    }

    if (mode === "continuous") {
      return chars(words.join(""))
        .map(boxLine)
        .join("\n");
    }
    return words
      .map(function (w) {
        return chars(w).map(boxLine).join("\n");
      })
      .join("\n\n");
  }

  /* ------------------------------------------------------------------
     STAIRCASE — each letter indented one more space than the previous.
     Stack mode  : indent resets per word, blank line between words.
     Continuous  : continuous indent across all characters.
     ------------------------------------------------------------------ */
  function makeVerticalStaircase(words, mode) {
    if (!words || words.length === 0) return "";

    function indent(ch, level) {
      var spaces = "";
      for (var i = 0; i < level; i++) spaces += " ";
      return spaces + ch;
    }

    if (mode === "continuous") {
      var all = chars(words.join(""));
      return all
        .map(function (ch, i) {
          return indent(ch, i);
        })
        .join("\n");
    }
    return words
      .map(function (w) {
        return chars(w)
          .map(function (ch, i) {
            return indent(ch, i);
          })
          .join("\n");
      })
      .join("\n\n");
  }

  /* ------------------------------------------------------------------
     DOUBLE COLUMN — first two words side by side, padded.
     If only one word, falls back to simple single column.
     Continuous mode is ignored (always uses first two words).
     ------------------------------------------------------------------ */
  function makeVerticalDoubleColumn(words) {
    if (!words || words.length === 0) return "";
    if (words.length === 1) {
      return chars(words[0]).join("\n");
    }

    var left = chars(words[0]);
    var right = chars(words[1]);
    var rows = Math.max(left.length, right.length);
    var lines = [];

    for (var i = 0; i < rows; i++) {
      var l = i < left.length ? left[i] : " ";
      var r = i < right.length ? right[i] : " ";
      lines.push(l + "   " + r);
    }
    return lines.join("\n");
  }

  /* ------------------------------------------------------------------
     Public API — attach to window.VerticalLayouts
     ------------------------------------------------------------------ */
  window.VerticalLayouts = {
    splitWords: splitWords,
    makeVerticalSimple: makeVerticalSimple,
    makeVerticalSpaced: makeVerticalSpaced,
    makeVerticalBox: makeVerticalBox,
    makeVerticalStaircase: makeVerticalStaircase,
    makeVerticalDoubleColumn: makeVerticalDoubleColumn,
  };
})();
