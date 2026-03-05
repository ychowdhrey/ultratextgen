/* ==========================================================================
   UltraTextGen — verticalDecorators.js
   Vertical-specific decoration engine. No dependency on horizontal applyDecoration.
   Exposes window.UTGVerticalDecorators.
   ========================================================================== */

(function () {
  "use strict";

  /* Layouts where divider insertion is disabled — fall back to prefix */
  var DIVIDER_FALLBACK_LAYOUTS = ['diagonal-right', 'diagonal-left', 'double-column'];

  /* --------------------------------------------------------------------------
     applyVerticalPrefixDecorator
     Prefix each non-empty line with "symbol " + line. Blank lines stay blank.
     -------------------------------------------------------------------------- */
  function applyVerticalPrefixDecorator(output, symbol) {
    return output.split('\n').map(function (line) {
      if (line.trim() === '') return '';
      return symbol + ' ' + line;
    }).join('\n');
  }

  /* --------------------------------------------------------------------------
     applyVerticalDividerDecorator
     Insert the symbol as its own line between consecutive non-empty lines
     within each word block. Blank lines (word block separators) are preserved
     and no dividers are inserted around them.

     For layouts that can't support dividers, fall back to prefix behavior.
     -------------------------------------------------------------------------- */
  function applyVerticalDividerDecorator(output, symbol, layoutName) {
    if (DIVIDER_FALLBACK_LAYOUTS.indexOf(layoutName) !== -1) {
      return applyVerticalPrefixDecorator(output, symbol);
    }

    var lines = output.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.trim() === '') {
        // Preserve blank lines as-is (they separate word blocks)
        result.push('');
      } else {
        result.push(line);
        // Look ahead: if next non-blank line exists (i.e., same block continues)
        if (i + 1 < lines.length && lines[i + 1].trim() !== '') {
          result.push(symbol);
        }
      }
    }
    return result.join('\n');
  }

  /* --------------------------------------------------------------------------
     applyVerticalDecorator
     Main entry point. Routes to the correct decorator by mode.
     -------------------------------------------------------------------------- */
  function applyVerticalDecorator(output, decorator, layoutName) {
    if (!decorator || decorator.mode === 'none') return output;
    switch (decorator.mode) {
      case 'prefix':
        return applyVerticalPrefixDecorator(output, decorator.symbol);
      case 'divider':
        return applyVerticalDividerDecorator(output, decorator.symbol, layoutName || '');
      default:
        return output;
    }
  }

  /* --------------------------------------------------------------------------
     Expose
     -------------------------------------------------------------------------- */
  window.UTGVerticalDecorators = {
    applyVerticalPrefixDecorator: applyVerticalPrefixDecorator,
    applyVerticalDividerDecorator: applyVerticalDividerDecorator,
    applyVerticalDecorator: applyVerticalDecorator
  };

})();
