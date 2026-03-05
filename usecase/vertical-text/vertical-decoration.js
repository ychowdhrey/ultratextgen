/* ==========================================================================
   Vertical Decoration Apply Logic
   This is a NEW module — does NOT reuse horizontal applyDecoration().

   Vertical decoration is fundamentally different:
     • Prefix decorators → prepend to EACH NON-EMPTY LINE
     • Divider decorators → insert a divider line BETWEEN letter lines

   ========================================================================== */

(function () {
  "use strict";

  /**
   * Prefix each non-empty line: `${prefix} ${line}`
   * @param {string} output  - multi-line vertical text
   * @param {string} prefix  - decorator symbol
   * @returns {string}
   */
  function applyVerticalPrefixDecorator(output, prefix) {
    if (!output || !prefix) return output || "";
    return output
      .split("\n")
      .map(function (line) {
        return line.length > 0 ? prefix + " " + line : line;
      })
      .join("\n");
  }

  /**
   * Insert a divider line BETWEEN consecutive non-empty letter lines
   * within each word block. Preserve blank lines between words.
   *
   * For Double Column layout, divider insertion is disabled;
   * falls back to prefix mode using the divider symbol as prefix.
   *
   * @param {string} output  - multi-line vertical text
   * @param {string} divider - divider string (e.g. "───", "• • •")
   * @param {string} layout  - one of: simple, spaced, box, staircase, double-column
   * @returns {string}
   */
  function applyVerticalDividerDecorator(output, divider, layout) {
    if (!output || !divider) return output || "";

    // Double Column: fallback to prefix mode
    if (layout === "double-column") {
      return applyVerticalPrefixDecorator(output, divider);
    }

    var lines = output.split("\n");
    var result = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      result.push(line);

      // Insert divider between two consecutive non-empty lines
      if (
        line.length > 0 &&
        i + 1 < lines.length &&
        lines[i + 1].length > 0
      ) {
        result.push(divider);
      }
    }

    return result.join("\n");
  }

  /**
   * Apply vertical decorator based on its type.
   * @param {string} output     - multi-line vertical text
   * @param {object} decorator  - { symbol, type: "prefix"|"divider" }
   * @param {string} layout     - layout identifier
   * @returns {string}
   */
  function applyVerticalDecorator(output, decorator, layout) {
    if (!output || !decorator || !decorator.symbol) return output || "";

    if (decorator.type === "divider") {
      return applyVerticalDividerDecorator(output, decorator.symbol, layout);
    }
    // Default to prefix
    return applyVerticalPrefixDecorator(output, decorator.symbol);
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */
  window.VerticalDecoration = {
    applyVerticalPrefixDecorator: applyVerticalPrefixDecorator,
    applyVerticalDividerDecorator: applyVerticalDividerDecorator,
    applyVerticalDecorator: applyVerticalDecorator,
  };
})();
