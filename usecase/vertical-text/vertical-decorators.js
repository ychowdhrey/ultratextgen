/* ==========================================================================
   UltraTextGen — vertical-decorators.js
   Vertical-specific decoration apply logic.
   Completely separate from horizontal decoration in script.js.
   Exposes: window.VerticalDecorators
   ========================================================================== */

(function (global) {
  "use strict";

  /* Layouts where divider insertion makes sense (line-by-line) */
  var DIVIDER_COMPATIBLE_LAYOUTS = [
    "stacked", "reverse", "upside-down", "extra-spaced", "box",
    "staircase", "pyramid", "reverse-pyramid", "centered-pyramid"
  ];

  /* ------------------------------------------------------------------
     applyVerticalPrefixDecorator(output, prefix)
     For every non-empty line: prefix + " " + line.
     Empty lines pass through unchanged.
     ------------------------------------------------------------------ */
  function applyVerticalPrefixDecorator(output, prefix) {
    if (!prefix || !output) return output;
    return output.split("\n").map(function (line) {
      if (line.trim() === "") return line;
      return prefix + " " + line;
    }).join("\n");
  }

  /* ------------------------------------------------------------------
     applyVerticalDividerDecorator(output, divider, layoutKey)
     For compatible layouts: insert divider line between consecutive
     non-empty lines inside each word block.
     Preserve blank lines between word blocks.
     For incompatible layouts (diagonal-right, diagonal-left,
     double-column): fallback to prefix mode.
     ------------------------------------------------------------------ */
  function applyVerticalDividerDecorator(output, divider, layoutKey) {
    if (!divider || !output) return output;

    /* Fallback: use divider symbol as a prefix for incompatible layouts */
    if (DIVIDER_COMPATIBLE_LAYOUTS.indexOf(layoutKey) === -1) {
      return applyVerticalPrefixDecorator(output, divider);
    }

    var lines = output.split("\n");
    var result = [];
    var prevWasNonEmpty = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var isEmpty = line.trim() === "";

      if (isEmpty) {
        /* Blank line — word block boundary, reset tracking */
        result.push(line);
        prevWasNonEmpty = false;
      } else {
        /* Non-empty line — insert divider before it if prev was also non-empty */
        if (prevWasNonEmpty) {
          result.push(divider);
        }
        result.push(line);
        prevWasNonEmpty = true;
      }
    }

    return result.join("\n");
  }

  /* ------------------------------------------------------------------
     applyVerticalDecorator(output, decorator, layoutKey)
     Switches between prefix or divider behavior depending on
     decorator.mode ("prefix" or "divider").
     decorator = { symbol: string, mode: "prefix"|"divider" }
     ------------------------------------------------------------------ */
  function applyVerticalDecorator(output, decorator, layoutKey) {
    if (!decorator || !decorator.symbol || !output) return output;

    if (decorator.mode === "divider") {
      return applyVerticalDividerDecorator(output, decorator.symbol, layoutKey);
    }
    /* Default: prefix mode */
    return applyVerticalPrefixDecorator(output, decorator.symbol);
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */
  global.VerticalDecorators = {
    applyVerticalPrefixDecorator: applyVerticalPrefixDecorator,
    applyVerticalDividerDecorator: applyVerticalDividerDecorator,
    applyVerticalDecorator: applyVerticalDecorator
  };

}(typeof window !== "undefined" ? window : global));
