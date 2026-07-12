/* ==========================================================================
   UltraTextGen — repeatShapes.js
   Pure logic for the repeat-text generator. No DOM calls: (phrase, count,
   options) in, plain multi-line string out — so it can be reasoned about in
   isolation, mirroring verticalLayouts.js's LAYOUTS shape.

   The atomic "unit" being arranged is one full repeated copy of the phrase
   (not a grapheme, like verticalLayouts.js, and not a word). The two "flat"
   arrangements (inline / block) are thin wrappers over the shared repeat
   engine (window.UTG_SCROLL_BUILDERS.buildBioScrollText) — that logic is not
   reimplemented here. The remaining arrangements borrow verticalLayouts.js's
   shape vocabulary (pyramid, reverse pyramid, staircase, diagonal, box) and
   its centering technique: plain leading-space padding (the controller
   converts those to a Braille blank so the indentation survives copy-paste
   into apps that strip whitespace — same split as verticalPageController.js).

   Deterministic: no Math.random / Date.now. Every arrangement is clamped to
   the shared MAX_REPEATS cap so a shape can never run past the engine's limit.

   Exposes: window.UTG_REPEAT_SHAPES
   ========================================================================== */

(function () {
  "use strict";

  const B = window.UTG_SCROLL_BUILDERS || {};
  const MAX = B.MAX_REPEATS || 200;

  const DEFAULT_COLUMNS = 5;
  const MAX_COLUMNS = 12;

  /* ---- Small helpers ---- */
  function normPhrase(p) {
    return (p == null ? "" : String(p)).trim();
  }

  /* Clamp a requested copy count to [1, MAX] using the SHARED cap, so no shape
     can ever render past what the repeat engine itself allows. */
  function clampCount(n) {
    let r = Math.floor(Number(n));
    if (!isFinite(r) || r < 1) return 1;
    if (r > MAX) return MAX;
    return r;
  }

  function clampColumns(c) {
    let n = Math.floor(Number(c));
    if (!isFinite(n) || n < 1) return DEFAULT_COLUMNS;
    if (n > MAX_COLUMNS) return MAX_COLUMNS;
    return n;
  }

  function spaces(n) {
    return n > 0 ? " ".repeat(n) : "";
  }

  /* Join `n` copies of `phrase` with `sep` between them. */
  function repeatJoin(phrase, n, sep) {
    let parts = [];
    for (let i = 0; i < n; i++) parts.push(phrase);
    return parts.join(sep);
  }

  /* --------------------------------------------------------------------------
     Growing row sizes: [1, 2, 3, …] until `count` copies are placed. The last
     row may be partial (smaller than its position) when count is not a perfect
     triangular number. e.g. count = 11 -> [1, 2, 3, 4, 1].
     -------------------------------------------------------------------------- */
  function growingSizes(count) {
    let sizes = [];
    let placed = 0;
    let k = 1;
    while (placed < count) {
      let inRow = Math.min(k, count - placed);
      sizes.push(inRow);
      placed += inRow;
      k += 1;
    }
    return sizes;
  }

  /* --------------------------------------------------------------------------
     Turn an array of row sizes into a centered block of phrase copies. Each
     row is `size` copies joined by a single space; rows are centered relative
     to the widest row using leading spaces (same technique as
     verticalLayouts.js's centered pyramid — the controller later swaps those
     leading spaces for a Braille blank so the shape survives paste).
     -------------------------------------------------------------------------- */
  function centeredFromSizes(phrase, sizes) {
    let rows = sizes.map(function (s) { return repeatJoin(phrase, s, " "); });
    let maxWidth = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    return rows.map(function (r) {
      let pad = Math.max(0, Math.floor((maxWidth - r.length) / 2));
      return spaces(pad) + r;
    }).join("\n");
  }

  /* --------------------------------------------------------------------------
     Arrangement 1 & 2: Inline / Block — thin wrappers over the shared engine.
     buildBioScrollText already trims, clamps and handles the divider + join
     mode, so these do not reimplement any repeat-and-join logic.
     -------------------------------------------------------------------------- */
  function shapeInline(phrase, count, options) {
    options = options || {};
    if (typeof B.buildBioScrollText !== "function") return "";
    return B.buildBioScrollText({
      text: phrase,
      divider: options.divider || "",
      repeats: clampCount(count),
      joinMode: "inline"
    });
  }

  function shapeBlock(phrase, count, options) {
    options = options || {};
    if (typeof B.buildBioScrollText !== "function") return "";
    return B.buildBioScrollText({
      text: phrase,
      divider: options.divider || "",
      repeats: clampCount(count),
      joinMode: "own-line"
    });
  }

  /* --------------------------------------------------------------------------
     Arrangement 3: Pyramid — row k holds k copies, growing until `count`
     copies are placed (last row may be partial), centered.
        Sorry
      Sorry Sorry
     Sorry Sorry Sorry
     -------------------------------------------------------------------------- */
  function shapePyramid(phrase, count) {
    phrase = normPhrase(phrase);
    if (!phrase) return "";
    return centeredFromSizes(phrase, growingSizes(clampCount(count)));
  }

  /* --------------------------------------------------------------------------
     Arrangement 4: Reverse Pyramid — the same row sizes as the pyramid, but
     ordered widest-first so the block starts full and tapers down, centered.
     -------------------------------------------------------------------------- */
  function shapeReversePyramid(phrase, count) {
    phrase = normPhrase(phrase);
    if (!phrase) return "";
    let sizes = growingSizes(clampCount(count)).slice().sort(function (a, b) { return b - a; });
    return centeredFromSizes(phrase, sizes);
  }

  /* --------------------------------------------------------------------------
     Arrangement 5: Staircase — one copy per row, each row indented one gentle
     step (2 spaces) further than the last. Leading spaces only (the controller
     Braille-pads them for paste survival).
     -------------------------------------------------------------------------- */
  function shapeStaircase(phrase, count) {
    phrase = normPhrase(phrase);
    if (!phrase) return "";
    count = clampCount(count);
    const STEP = 2;
    let rows = [];
    for (let i = 0; i < count; i++) rows.push(spaces(i * STEP) + phrase);
    return rows.join("\n");
  }

  /* --------------------------------------------------------------------------
     Arrangement 6: Diagonal — like verticalLayouts.js's diagonal-right, one
     copy per row stepping right, but a steeper step (4 spaces) so it reads
     distinctly from the staircase.
     -------------------------------------------------------------------------- */
  function shapeDiagonal(phrase, count) {
    phrase = normPhrase(phrase);
    if (!phrase) return "";
    count = clampCount(count);
    const STEP = 4;
    let rows = [];
    for (let i = 0; i < count; i++) rows.push(spaces(i * STEP) + phrase);
    return rows.join("\n");
  }

  /* --------------------------------------------------------------------------
     Arrangement 7: Box Grid — copies tiled left-to-right, wrapping into rows
     at `columns` copies per row, so `count` copies form a roughly rectangular
     block. Every cell is the identical phrase, so the columns line up without
     any padding.
     -------------------------------------------------------------------------- */
  function shapeBox(phrase, count, options) {
    phrase = normPhrase(phrase);
    if (!phrase) return "";
    count = clampCount(count);
    let columns = clampColumns(options && options.columns);
    const GAP = "  "; // two spaces between columns
    let rows = [];
    let placed = 0;
    while (placed < count) {
      let inRow = Math.min(columns, count - placed);
      rows.push(repeatJoin(phrase, inRow, GAP));
      placed += inRow;
    }
    return rows.join("\n");
  }

  /* --------------------------------------------------------------------------
     Descriptor registry — array of { id, label, description, fn } for UI
     iteration, mirroring verticalLayouts.js's LAYOUTS. `divider: true` marks
     the arrangements a between-copies divider makes sense for (inline / block);
     `columns: true` marks the one that takes a column count (box).
     -------------------------------------------------------------------------- */
  const SHAPES = [
    { id: "block",           label: "Block",           description: "Each copy on its own line — the literal “say it N times” list.", fn: shapeBlock,          divider: true },
    { id: "inline",          label: "Inline",          description: "Every copy on one long line, separated by your divider.",                  fn: shapeInline,         divider: true },
    { id: "pyramid",         label: "Pyramid",         description: "Copies build up row by row into a centered pyramid.",                      fn: shapePyramid },
    { id: "reverse-pyramid", label: "Reverse Pyramid", description: "Starts wide at the top and tapers down to a point.",                       fn: shapeReversePyramid },
    { id: "staircase",       label: "Staircase",       description: "One copy per row, each stepped a little further right.",                   fn: shapeStaircase },
    { id: "diagonal",        label: "Diagonal",        description: "One copy per row on a steeper rightward diagonal.",                        fn: shapeDiagonal },
    { id: "box",             label: "Box Grid",        description: "Copies tiled left-to-right into a rectangular grid.",                      fn: shapeBox,            columns: true }
  ];

  window.UTG_REPEAT_SHAPES = {
    SHAPES: SHAPES,
    DEFAULT_COLUMNS: DEFAULT_COLUMNS,
    MAX_COLUMNS: MAX_COLUMNS,
    clampCount: clampCount,
    clampColumns: clampColumns,
    shapeInline: shapeInline,
    shapeBlock: shapeBlock,
    shapePyramid: shapePyramid,
    shapeReversePyramid: shapeReversePyramid,
    shapeStaircase: shapeStaircase,
    shapeDiagonal: shapeDiagonal,
    shapeBox: shapeBox
  };
})();
