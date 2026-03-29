/* ==========================================================================
   UltraTextGen — verticalLayouts.js
   Pure layout engine functions for the Vertical Text Generator.
   Exposes window.UTGVerticalLayouts.
   ========================================================================== */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     Standalone flip map (mirrors renderer.js flipMap — no coupling)
     -------------------------------------------------------------------------- */
  var FLIP_MAP = {
    'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ',
    'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'ן', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'r': 'ɹ',
    's': 's', 't': 'ʇ', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
    'A': '∀', 'C': 'Ɔ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'J': 'ſ', 'L': '˥', 'M': 'W',
    'N': 'N', 'O': 'O', 'P': 'Ԁ', 'R': 'ᴚ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ',
    'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
    '1': '⇂', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8',
    '9': '6', '0': '0',
    '.': '˙', ',': "'", "'": ',', '"': '„', '_': '‾', '?': '¿', '!': '¡',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
    '&': '⅋', ';': '؛'
  };

  /* --------------------------------------------------------------------------
     Helper: split input into words
     -------------------------------------------------------------------------- */
  function splitWords(input) {
    return input.replace(/\s+/g, ' ').trim().split(' ').filter(function (w) { return w.length > 0; });
  }

  /* --------------------------------------------------------------------------
     Internal: build a divider row string used between word blocks
     -------------------------------------------------------------------------- */
  function wordBlockSeparator(mode) {
    if (mode === 'divider-line') return '\n────────\n';
    return '\n\n'; // 'none' or 'blank-line' → single blank line between blocks
  }

  /* --------------------------------------------------------------------------
     Internal: turn an array of chars into stacked lines for one word block
     -------------------------------------------------------------------------- */
  function stackChars(chars) {
    return chars.join('\n');
  }

  /* --------------------------------------------------------------------------
     Internal: get char array for a word (Array.from handles emoji/surrogate pairs)
     -------------------------------------------------------------------------- */
  function chars(word) {
    return Array.from(word);
  }

  /* --------------------------------------------------------------------------
     Layout 1: Stacked — each character on its own line
     -------------------------------------------------------------------------- */
  function makeLayoutStacked(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    if (mode === 'continuous') {
      var all = chars(input.replace(/\s+/g, ''));
      return stackChars(all);
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(function (w) { return stackChars(chars(w)); }).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 2: Reverse Stacked — characters in reverse order, each on own line
     -------------------------------------------------------------------------- */
  function makeLayoutReverseStacked(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    if (mode === 'continuous') {
      var all = chars(input.replace(/\s+/g, '')).reverse();
      return stackChars(all);
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(function (w) { return stackChars(chars(w).reverse()); }).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 3: Upside-Down Stacked — flip each char, then reverse order and stack
     -------------------------------------------------------------------------- */
  function makeLayoutUpsideDownStacked(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function flipAndStack(word) {
      var flipped = chars(word).map(function (ch) { return FLIP_MAP[ch] || ch; });
      return stackChars(flipped.reverse());
    }

    if (mode === 'continuous') {
      return flipAndStack(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(flipAndStack).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 4: Extra Spaced — blank line between each character line
     -------------------------------------------------------------------------- */
  function makeLayoutExtraSpaced(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function extraStack(word) {
      return chars(word).join('\n\n');
    }

    if (mode === 'continuous') {
      return extraStack(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(extraStack).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 5: Staircase — each line indented by N*indentStep spaces
     -------------------------------------------------------------------------- */
  function makeLayoutStaircase(input, mode, options) {
    options = options || {};
    var indentStep = options.indentStep != null ? options.indentStep : 1;
    var wdMode = options.wordDividerMode || 'none';

    function staircaseWord(word, startIndex) {
      return chars(word).map(function (ch, i) {
        return ' '.repeat((startIndex + i) * indentStep) + ch;
      }).join('\n');
    }

    if (mode === 'continuous') {
      return staircaseWord(input.replace(/\s+/g, ''), 0);
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    var index = 0;
    var blocks = words.map(function (w) {
      var block = staircaseWord(w, index);
      index += chars(w).length;
      return block;
    });
    return blocks.join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 6: Pyramid — progressive build: each line adds one more character
       Y
       Y a
       Y a s
     -------------------------------------------------------------------------- */
  function makeLayoutPyramid(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function pyramidWord(word) {
      var cs = chars(word);
      return cs.map(function (_, i) { return cs.slice(0, i + 1).join(' '); }).join('\n');
    }

    if (mode === 'continuous') {
      return pyramidWord(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(pyramidWord).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 7: Reverse Pyramid — start full then shrink
     -------------------------------------------------------------------------- */
  function makeLayoutReversePyramid(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function reversePyramidWord(word) {
      var cs = chars(word);
      return cs.map(function (_, i) { return cs.slice(i).join(' '); }).join('\n');
    }

    if (mode === 'continuous') {
      return reversePyramidWord(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(reversePyramidWord).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 8: Centered Pyramid — pyramid rows centered by max width
     -------------------------------------------------------------------------- */
  function makeLayoutCenteredPyramid(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function centeredPyramidWord(word) {
      var cs = chars(word);
      var maxWidth = cs.length * 2 - 1; // "a b c" for n chars
      return cs.map(function (_, i) {
        var row = cs.slice(0, i + 1).join(' ');
        var pad = Math.floor((maxWidth - row.length) / 2);
        return ' '.repeat(pad) + row;
      }).join('\n');
    }

    if (mode === 'continuous') {
      return centeredPyramidWord(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(centeredPyramidWord).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 9: Diagonal Right — each char indented +2 spaces per line
     -------------------------------------------------------------------------- */
  function makeLayoutDiagonalRight(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function diagonalRightWord(word, startIndex) {
      return chars(word).map(function (ch, i) {
        return ' '.repeat((startIndex + i) * 2) + ch;
      }).join('\n');
    }

    if (mode === 'continuous') {
      return diagonalRightWord(input.replace(/\s+/g, ''), 0);
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    var index = 0;
    var blocks = words.map(function (w) {
      var block = diagonalRightWord(w, index);
      index += chars(w).length;
      return block;
    });
    return blocks.join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 10: Diagonal Left — indent decreases from max to 0
     -------------------------------------------------------------------------- */
  function makeLayoutDiagonalLeft(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function diagonalLeftWord(word) {
      var cs = chars(word);
      var max = (cs.length - 1) * 2;
      return cs.map(function (ch, i) {
        return ' '.repeat(max - i * 2) + ch;
      }).join('\n');
    }

    if (mode === 'continuous') {
      return diagonalLeftWord(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(diagonalLeftWord).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 11: Box — stacked output inside a Unicode frame
       ╔═══╗
       ║ Y ║
       ║ a ║
       ╚═══╝
     -------------------------------------------------------------------------- */
  function makeLayoutBox(input, mode, options) {
    options = options || {};
    var wdMode = options.wordDividerMode || 'none';

    function boxWord(word) {
      var cs = chars(word);
      var maxLen = Math.max.apply(null, cs.map(function (ch) { return ch.length; }));
      var innerWidth = maxLen + 2; // 1 space padding each side
      var top = '╔' + '═'.repeat(innerWidth) + '╗';
      var bottom = '╚' + '═'.repeat(innerWidth) + '╝';
      var rows = cs.map(function (ch) {
        var pad = ' '.repeat(innerWidth - 1 - ch.length);
        return '║ ' + ch + pad + '║';
      });
      return [top].concat(rows).concat([bottom]).join('\n');
    }

    if (mode === 'continuous') {
      return boxWord(input.replace(/\s+/g, ''));
    }

    var words = splitWords(input);
    if (words.length === 0) return '';
    var sep = wordBlockSeparator(wdMode);
    return words.map(boxWord).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 12: Double Column — two words side by side with 3-space gap.
     Falls back to Stacked for continuous mode or <2 words.
     -------------------------------------------------------------------------- */
  function makeLayoutDoubleColumn(input, mode, options) {
    options = options || {};

    if (mode === 'continuous') {
      return makeLayoutStacked(input, mode, options);
    }

    var words = splitWords(input);
    if (words.length < 2) {
      return makeLayoutStacked(input, mode, options);
    }

    var word1 = chars(words[0]);
    var word2 = chars(words[1]);
    var maxLen = Math.max(word1.length, word2.length);
    var lines = [];
    for (var i = 0; i < maxLen; i++) {
      var c1 = i < word1.length ? word1[i] : ' ';
      var c2 = i < word2.length ? word2[i] : '';
      lines.push(c1 + '   ' + c2);
    }
    return lines.join('\n');
  }

  /* --------------------------------------------------------------------------
     LAYOUTS registry — array of { id, label, description, fn } for UI iteration
     -------------------------------------------------------------------------- */
  var LAYOUTS = [
    { id: 'stacked',           label: 'Stacked',           description: 'Each character on its own line — most readable format',           fn: makeLayoutStacked },
    { id: 'reverse-stacked',   label: 'Reverse Stacked',   description: 'Characters in reverse order, bottom to top',                      fn: makeLayoutReverseStacked },
    { id: 'upside-down',       label: 'Upside-Down',       description: 'Flipped characters stacked vertically',                           fn: makeLayoutUpsideDownStacked },
    { id: 'extra-spaced',      label: 'Extra Spaced',      description: 'Double spacing between each character for an airy look',          fn: makeLayoutExtraSpaced },
    { id: 'staircase',         label: 'Staircase',         description: 'Characters indented progressively — diagonal flow',               fn: makeLayoutStaircase },
    { id: 'pyramid',           label: 'Pyramid',           description: 'Characters build up line by line — full word at bottom',          fn: makeLayoutPyramid },
    { id: 'reverse-pyramid',   label: 'Reverse Pyramid',   description: 'Full word at top, tapers down to the last character',             fn: makeLayoutReversePyramid },
    { id: 'centered-pyramid',  label: 'Centered Pyramid',  description: 'Pyramid rows centered for a balanced, symmetrical appearance',    fn: makeLayoutCenteredPyramid },
    { id: 'diagonal-right',    label: 'Diagonal Right',    description: 'Each character shifted progressively right — diagonal column',    fn: makeLayoutDiagonalRight },
    { id: 'diagonal-left',     label: 'Diagonal Left',     description: 'Each character shifted progressively left — reverse diagonal',    fn: makeLayoutDiagonalLeft },
    { id: 'box',               label: 'Box',               description: 'Stacked text wrapped in a Unicode border frame',                  fn: makeLayoutBox },
    { id: 'double-column',     label: 'Double Column',     description: 'Two words displayed side by side in parallel columns',            fn: makeLayoutDoubleColumn }
  ];

  /* --------------------------------------------------------------------------
     Expose
     -------------------------------------------------------------------------- */
  window.UTGVerticalLayouts = {
    splitWords: splitWords,
    makeLayoutStacked: makeLayoutStacked,
    makeLayoutReverseStacked: makeLayoutReverseStacked,
    makeLayoutUpsideDownStacked: makeLayoutUpsideDownStacked,
    makeLayoutExtraSpaced: makeLayoutExtraSpaced,
    makeLayoutStaircase: makeLayoutStaircase,
    makeLayoutPyramid: makeLayoutPyramid,
    makeLayoutReversePyramid: makeLayoutReversePyramid,
    makeLayoutCenteredPyramid: makeLayoutCenteredPyramid,
    makeLayoutDiagonalRight: makeLayoutDiagonalRight,
    makeLayoutDiagonalLeft: makeLayoutDiagonalLeft,
    makeLayoutBox: makeLayoutBox,
    makeLayoutDoubleColumn: makeLayoutDoubleColumn,
    LAYOUTS: LAYOUTS
  };

})();
