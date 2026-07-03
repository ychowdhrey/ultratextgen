/* ==========================================================================
   UltraTextGen — verticalLayouts.js
   Pure layout engine functions for the Vertical Text Generator.
   Exposes window.UTGVerticalLayouts.

   Word modes:
     'stack'      — one vertical block per word (units = letters)
     'continuous' — a single block, spaces removed (units = letters)
     'word-lines' — a single block where each WORD is a unit (one word per line)
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
     Grapheme-safe character splitting.
     Intl.Segmenter keeps ZWJ emoji (👩‍👩‍👧‍👦), flags and skin tones whole;
     Array.from is the fallback for older engines.
     -------------------------------------------------------------------------- */
  var GRAPHEME_SEGMENTER = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

  function chars(word) {
    if (GRAPHEME_SEGMENTER) {
      return Array.from(GRAPHEME_SEGMENTER.segment(word), function (s) { return s.segment; });
    }
    return Array.from(word);
  }

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
    if (mode === 'blank-line')   return '\n\n\n';  // two blank lines between blocks
    return '\n\n';                                 // 'none' → single blank line
  }

  /* --------------------------------------------------------------------------
     Internal: resolve input + mode into an array of unit blocks.
     Each block is an array of units (graphemes or whole words) that a layout
     arranges vertically. Layouts stay mode-agnostic by operating on units.
     -------------------------------------------------------------------------- */
  function unitBlocks(input, mode) {
    if (mode === 'continuous') {
      var all = chars(input.replace(/\s+/g, ''));
      return all.length ? [all] : [];
    }
    if (mode === 'word-lines') {
      var words = splitWords(input);
      return words.length ? [words] : [];
    }
    return splitWords(input).map(chars);
  }

  /* --------------------------------------------------------------------------
     Internal: render blocks through a per-block function and join them
     -------------------------------------------------------------------------- */
  function renderBlocks(input, mode, options, blockFn) {
    options = options || {};
    var blocks = unitBlocks(input, mode);
    if (blocks.length === 0) return '';
    var sep = wordBlockSeparator(options.wordDividerMode || 'none');
    return blocks.map(blockFn).join(sep);
  }

  /* --------------------------------------------------------------------------
     Layout 1: Stacked — each unit on its own line
     -------------------------------------------------------------------------- */
  function makeLayoutStacked(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      return units.join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 2: Reverse Stacked — units in reverse order, each on own line
     -------------------------------------------------------------------------- */
  function makeLayoutReverseStacked(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      return units.slice().reverse().join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 3: Upside-Down Stacked — flip each unit, then reverse order and stack
     -------------------------------------------------------------------------- */
  function makeLayoutUpsideDownStacked(input, mode, options) {
    function flipUnit(unit) {
      return chars(unit).map(function (ch) { return FLIP_MAP[ch] || ch; }).reverse().join('');
    }
    return renderBlocks(input, mode, options, function (units) {
      return units.map(flipUnit).reverse().join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 4: Extra Spaced — blank line between each unit line
     -------------------------------------------------------------------------- */
  function makeLayoutExtraSpaced(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      return units.join('\n\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 5: Staircase — each line indented by N*indentStep spaces.
     The indent keeps climbing across word blocks in stack mode.
     -------------------------------------------------------------------------- */
  function makeLayoutStaircase(input, mode, options) {
    options = options || {};
    var indentStep = options.indentStep != null ? options.indentStep : 1;
    var index = 0;
    return renderBlocks(input, mode, options, function (units) {
      return units.map(function (unit) {
        return ' '.repeat((index++) * indentStep) + unit;
      }).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 6: Pyramid — progressive build: each line adds one more unit
       Y
       Y a
       Y a s
     -------------------------------------------------------------------------- */
  function makeLayoutPyramid(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      return units.map(function (_, i) { return units.slice(0, i + 1).join(' '); }).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 7: Reverse Pyramid — start full then shrink
     -------------------------------------------------------------------------- */
  function makeLayoutReversePyramid(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      return units.map(function (_, i) { return units.slice(i).join(' '); }).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 8: Centered Pyramid — pyramid rows centered by max width
     -------------------------------------------------------------------------- */
  function makeLayoutCenteredPyramid(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      var rows = units.map(function (_, i) { return units.slice(0, i + 1).join(' '); });
      var maxWidth = rows[rows.length - 1].length;
      return rows.map(function (row) {
        var pad = Math.floor((maxWidth - row.length) / 2);
        return ' '.repeat(pad) + row;
      }).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 9: Diagonal Right — each unit indented +2 spaces per line.
     Indent keeps climbing across word blocks in stack mode.
     -------------------------------------------------------------------------- */
  function makeLayoutDiagonalRight(input, mode, options) {
    var index = 0;
    return renderBlocks(input, mode, options, function (units) {
      return units.map(function (unit) {
        return ' '.repeat((index++) * 2) + unit;
      }).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 10: Diagonal Left — indent decreases from max to 0 within each block
     -------------------------------------------------------------------------- */
  function makeLayoutDiagonalLeft(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      var max = (units.length - 1) * 2;
      return units.map(function (unit, i) {
        return ' '.repeat(max - i * 2) + unit;
      }).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 11: Box — stacked output inside a Unicode frame
       ╔═══╗
       ║ Y ║
       ║ a ║
       ╚═══╝
     -------------------------------------------------------------------------- */
  function makeLayoutBox(input, mode, options) {
    return renderBlocks(input, mode, options, function (units) {
      var maxLen = Math.max.apply(null, units.map(function (u) { return u.length; }));
      var innerWidth = maxLen + 2; // 1 space padding each side
      var top = '╔' + '═'.repeat(innerWidth) + '╗';
      var bottom = '╚' + '═'.repeat(innerWidth) + '╝';
      var rows = units.map(function (u) {
        var pad = ' '.repeat(innerWidth - 1 - u.length);
        return '║ ' + u + pad + '║';
      });
      return [top].concat(rows).concat([bottom]).join('\n');
    });
  }

  /* --------------------------------------------------------------------------
     Layout 12: Double Column — words side by side in column pairs with a
     3-space gap. Every word is shown: words are chunked into pairs and each
     pair becomes its own block (an odd last word stands alone).
     Falls back to Stacked for continuous / word-lines modes or <2 words.
     -------------------------------------------------------------------------- */
  function makeLayoutDoubleColumn(input, mode, options) {
    options = options || {};

    if (mode !== 'stack') {
      return makeLayoutStacked(input, mode, options);
    }

    var words = splitWords(input);
    if (words.length < 2) {
      return makeLayoutStacked(input, mode, options);
    }

    function pairBlock(w1, w2) {
      var u1 = chars(w1);
      var u2 = w2 ? chars(w2) : [];
      var maxLen = Math.max(u1.length, u2.length);
      var lines = [];
      for (var i = 0; i < maxLen; i++) {
        var c1 = i < u1.length ? u1[i] : ' ';
        var c2 = i < u2.length ? u2[i] : '';
        lines.push(c2 ? c1 + '   ' + c2 : c1);
      }
      return lines.join('\n');
    }

    var blocks = [];
    for (var i = 0; i < words.length; i += 2) {
      blocks.push(pairBlock(words[i], words[i + 1]));
    }
    var sep = wordBlockSeparator(options.wordDividerMode || 'none');
    return blocks.join(sep);
  }

  /* --------------------------------------------------------------------------
     LAYOUTS registry — array of { id, label, description, fn } for UI iteration.
     maxUnits caps quadratic layouts (pyramids expand to n²/2 characters).
     -------------------------------------------------------------------------- */
  var LAYOUTS = [
    { id: 'stacked',           label: 'Stacked',           description: 'Each character on its own line — most readable format',           fn: makeLayoutStacked },
    { id: 'reverse-stacked',   label: 'Reverse Stacked',   description: 'Characters in reverse order, bottom to top',                      fn: makeLayoutReverseStacked },
    { id: 'upside-down',       label: 'Upside-Down',       description: 'Flipped characters stacked vertically',                           fn: makeLayoutUpsideDownStacked },
    { id: 'extra-spaced',      label: 'Extra Spaced',      description: 'Double spacing between each character for an airy look',          fn: makeLayoutExtraSpaced },
    { id: 'staircase',         label: 'Staircase',         description: 'Characters indented progressively — diagonal flow',               fn: makeLayoutStaircase },
    { id: 'pyramid',           label: 'Pyramid',           description: 'Characters build up line by line — full word at bottom',          fn: makeLayoutPyramid,         maxUnits: 40 },
    { id: 'reverse-pyramid',   label: 'Reverse Pyramid',   description: 'Full word at top, tapers down to the last character',             fn: makeLayoutReversePyramid,  maxUnits: 40 },
    { id: 'centered-pyramid',  label: 'Centered Pyramid',  description: 'Pyramid rows centered for a balanced, symmetrical appearance',    fn: makeLayoutCenteredPyramid, maxUnits: 40 },
    { id: 'diagonal-right',    label: 'Diagonal Right',    description: 'Each character shifted progressively right — diagonal column',    fn: makeLayoutDiagonalRight },
    { id: 'diagonal-left',     label: 'Diagonal Left',     description: 'Each character shifted progressively left — reverse diagonal',    fn: makeLayoutDiagonalLeft },
    { id: 'box',               label: 'Box',               description: 'Stacked text wrapped in a Unicode border frame',                  fn: makeLayoutBox },
    { id: 'double-column',     label: 'Double Column',     description: 'Words paired side by side in parallel columns',                   fn: makeLayoutDoubleColumn }
  ];

  /* --------------------------------------------------------------------------
     Expose
     -------------------------------------------------------------------------- */
  window.UTGVerticalLayouts = {
    chars: chars,
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
