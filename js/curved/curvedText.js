/* ==========================================================================
   UltraTextGen — curvedText.js
   Pure SVG arc / curved text builder. No DOM dependencies beyond returning
   markup, so it can be unit-tested in isolation and reused anywhere.

   Pairs with the vertical-text module: same "one feature, one self-contained
   module" pattern. Output is an <svg> string (not copy-paste plain text),
   because curved layout can only be expressed visually.

   Exposes: window.UltraCurvedText.build(options) -> { svg, width, height }
   ========================================================================== */

(function () {
  "use strict";

  var XML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return XML_ESCAPE[c]; });
  }

  // Deterministic id so re-renders with the same inputs are stable and two
  // SVGs on one page never collide. (No Math.random — keeps output pure.)
  var idSeq = 0;
  function nextId() { idSeq += 1; return "utg-arc-" + idSeq; }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  /* Build the curved-text SVG.
     options:
       text        {string}  the (already Unicode-transformed) text
       direction   {'up'|'down'|'circle'}  arch shape (default 'up')
       radius      {number}  circle radius in px (default 120)
       fontSize    {number}  px (default 32)
       fontFamily  {string}  CSS font-family (default sans-serif)
       fontWeight  {'normal'|'bold'} (default 'normal')
       fill        {string}  text color (default '#111111')
       letterSpacing {number} px (default 0)
  */
  function build(options) {
    var o = options || {};
    var text = (o.text == null ? "" : String(o.text));
    var dir = o.direction === "down" || o.direction === "circle" ? o.direction : "up";
    var r = Math.max(20, num(o.radius, 120));
    var fs = Math.max(8, num(o.fontSize, 32));
    var family = o.fontFamily || "system-ui, sans-serif";
    var weight = o.fontWeight === "bold" ? "bold" : "normal";
    var fill = o.fill || "#111111";
    var spacing = num(o.letterSpacing, 0);

    var pad = fs; // breathing room so glyphs never clip the viewBox
    var id = nextId();
    var pathD, width, height, startOffset, cx, cy;

    if (dir === "circle") {
      cx = pad + fs + r;
      cy = pad + fs + r;
      width = 2 * (pad + fs + r);
      height = width;
      // Start at the bottom, sweep clockwise; 50% along lands at the top so
      // the text reads left-to-right across the top of the ring.
      pathD =
        "M " + cx + " " + (cy + r) +
        " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy - r) +
        " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy + r) + " Z";
      startOffset = "50%";
    } else if (dir === "down") {
      // Valley (∪): text hangs along the lower half, room needed below.
      cx = pad + r;
      cy = pad;
      width = 2 * r + 2 * pad;
      height = r + fs + 2 * pad;
      pathD = "M " + pad + " " + cy + " A " + r + " " + r + " 0 0 0 " + (pad + 2 * r) + " " + cy;
      startOffset = "50%";
    } else {
      // Arch up (∩ / rainbow): text rides the upper half, room needed above.
      cx = pad + r;
      cy = pad + fs + r;
      width = 2 * r + 2 * pad;
      height = r + fs + 2 * pad;
      pathD = "M " + pad + " " + cy + " A " + r + " " + r + " 0 0 1 " + (pad + 2 * r) + " " + cy;
      startOffset = "50%";
    }

    var spacingAttr = spacing ? ' letter-spacing="' + spacing + '"' : "";

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'viewBox="0 0 ' + width + " " + height + '" ' +
      'width="' + width + '" height="' + height + '" class="utg-curved-svg" role="img" ' +
      'aria-label="' + esc(text) + '">' +
      '<defs><path id="' + id + '" d="' + pathD + '" fill="none"/></defs>' +
      '<text font-family="' + esc(family) + '" font-size="' + fs + '" font-weight="' + weight + '" ' +
      'fill="' + esc(fill) + '"' + spacingAttr + '>' +
      '<textPath href="#' + id + '" xlink:href="#' + id + '" startOffset="' + startOffset + '" ' +
      'text-anchor="middle" dominant-baseline="middle">' + esc(text) + "</textPath>" +
      "</text></svg>";

    return { svg: svg, width: width, height: height };
  }

  window.UltraCurvedText = { build: build };
})();
