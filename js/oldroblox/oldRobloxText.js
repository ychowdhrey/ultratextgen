/* ==========================================================================
   UltraTextGen — oldRobloxText.js
   Pure SVG builder for the /roblox/old-roblox-font/ generator. No DOM
   dependencies beyond returning markup, so it can be tested in isolation —
   same "one feature, one self-contained module" pattern as js/curved/.

   Renders typed text as centered multi-line SVG <text> in one of two
   nostalgia presets. Both presets are honest, free Google-Font stand-ins:
   no historical Roblox font was ever named or released, so this module
   deliberately renders "the closest free look", never "the real thing".

   Exposes: window.UltraOldRobloxText.build(options) -> { svg, width, height }
            window.UltraOldRobloxText.PRESETS (for populating the preset UI)
   ========================================================================== */

(function () {
  "use strict";

  let XML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return XML_ESCAPE[c]; });
  }

  function num(v, fallback) {
    let n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  /* Preset registry.
     - fontFamily: CSS stack used in the SVG. Both lead with a Google Font
       loaded by the page via <link> (never a bundled binary).
     - advance: estimated glyph advance per character in em, used to size the
       canvas generously enough that centered text never clips (same
       estimate-not-measure approach as js/curved/curvedText.js).
     - note: the honesty microcopy the controller surfaces next to the
       preset picker — a content-integrity requirement, not flavor text. */
  let PRESETS = {
    chat: {
      label: "2008 Chat Text",
      fontFamily: "'Comic Neue', 'Comic Sans MS', cursive",
      fontWeight: "700",
      advance: 0.58,
      lineHeight: 1.3,
      note: "Rendered in Comic Neue — a free, open-source stand-in for the " +
        "Comic Sans-style text players remember. The real pre-2017 Roblox " +
        "font was never named or released, so this is the closest free " +
        "approximation, not the authentic font."
    },
    logo: {
      label: "Old Logo Style",
      fontFamily: "'Baloo 2', 'Arial Rounded MT Bold', sans-serif",
      fontWeight: "800",
      advance: 0.66,
      lineHeight: 1.2,
      note: "Rendered in Baloo 2 — a bold, rounded homage to the 2008–2016 " +
        "Roblox logo. That logo was hand-drawn custom lettering, never a " +
        "typeface, so no font can recreate it — this is a stylistic " +
        "tribute, not a recreation."
    }
  };

  let MAX_LINES = 4;

  /* Characters whose Unicode East Asian Width is W (wide) or F (fullwidth)
     occupy about two Latin advances: Hangul, kana, CJK ideographs, fullwidth
     forms and emoji-presentation symbols. Only BMP ranges are listed: an
     astral character is already counted twice (two UTF-16 units), so it
     needs no entry. Unassigned code points inside a range only widen the
     canvas, never narrow it. Source: Unicode EastAsianWidth.txt (W, F). */
  let WIDE_BMP = [
    [0x1100, 0x115F], [0x231A, 0x231B], [0x2329, 0x232A], [0x23E9, 0x23EC],
    [0x23F0, 0x23F0], [0x23F3, 0x23F3], [0x25FD, 0x25FE], [0x2614, 0x2615],
    [0x2648, 0x2653], [0x267F, 0x267F], [0x2693, 0x2693], [0x26A1, 0x26A1],
    [0x26AA, 0x26AB], [0x26BD, 0x26BE], [0x26C4, 0x26C5], [0x26CE, 0x26CE],
    [0x26D4, 0x26D4], [0x26EA, 0x26EA], [0x26F2, 0x26F3], [0x26F5, 0x26F5],
    [0x26FA, 0x26FA], [0x26FD, 0x26FD], [0x2705, 0x2705], [0x270A, 0x270B],
    [0x2728, 0x2728], [0x274C, 0x274C], [0x274E, 0x274E], [0x2753, 0x2755],
    [0x2757, 0x2757], [0x2795, 0x2797], [0x27B0, 0x27B0], [0x27BF, 0x27BF],
    [0x2B1B, 0x2B1C], [0x2B50, 0x2B50], [0x2B55, 0x2B55],
    [0x2E80, 0x303E], [0x3041, 0x33FF], [0x3400, 0x4DBF], [0x4E00, 0x9FFF],
    [0xA000, 0xA4CF], [0xA960, 0xA97F], [0xAC00, 0xD7A3], [0xF900, 0xFAFF],
    [0xFE10, 0xFE19], [0xFE30, 0xFE6F], [0xFF00, 0xFF60], [0xFFE0, 0xFFE6]
  ];

  function isWideBmp(cp) {
    for (let i = 0; i < WIDE_BMP.length; i++) {
      if (cp < WIDE_BMP[i][0]) return false;
      if (cp <= WIDE_BMP[i][1]) return true;
    }
    return false;
  }

  /* Advance columns for one line. Every character counts as before (its
     UTF-16 length, so Latin and every other non-wide line is unchanged
     byte for byte); a wide BMP character counts as two. The estimate can
     only grow, so a name that fitted before still fits. */
  function columns(line) {
    let n = line.length;
    for (let i = 0; i < line.length; i++) {
      if (isWideBmp(line.charCodeAt(i))) n++;
    }
    return n;
  }

  /* Build the old-Roblox-style SVG.
     options:
       text     {string} the text to render. "\n" splits into stacked,
                         centered lines (up to MAX_LINES).
       preset   {string} a PRESETS key: 'chat' | 'logo' (default 'chat')
       fontSize {number} px (default 64)
       fill     {string} text color (default '#e2231a')
  */
  function build(options) {
    let o = options || {};
    let preset = PRESETS[o.preset] || PRESETS.chat;
    let fs = Math.max(12, num(o.fontSize, 64));
    let fill = o.fill || "#e2231a";

    let rawText = (o.text == null ? "" : String(o.text));
    let lines = rawText.split("\n");
    if (lines.length > MAX_LINES) lines = lines.slice(0, MAX_LINES);
    if (lines.length === 0) lines = [""];

    // Generous width estimate (advance factor + 15% safety margin) so wide
    // glyphs and heavy weights never run past the viewBox. Columns, not
    // characters: a Hangul or kana name counts its wide characters twice,
    // or the export (SVG viewBox and the PNG canvas sized from it) crops it.
    let longest = 1;
    for (let i = 0; i < lines.length; i++) {
      let cols = columns(lines[i]);
      if (cols > longest) longest = cols;
    }
    let pad = fs * 0.75;
    let lineHeight = fs * preset.lineHeight;
    let width = Math.ceil(longest * fs * preset.advance * 1.15 + pad * 2);
    let height = Math.ceil(lines.length * lineHeight + pad * 2);
    let cx = width / 2;

    let textMarkup = "";
    for (let i = 0; i < lines.length; i++) {
      let y = pad + (i + 0.5) * lineHeight;
      textMarkup +=
        '<text x="' + cx + '" y="' + y + '" text-anchor="middle" ' +
        'dominant-baseline="middle" font-family="' + esc(preset.fontFamily) + '" ' +
        'font-size="' + fs + '" font-weight="' + preset.fontWeight + '" ' +
        'fill="' + esc(fill) + '">' + esc(lines[i]) + "</text>";
    }

    let ariaLabel = esc(lines.join(" ").trim() || rawText);
    let svg =
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
      'viewBox="0 0 ' + width + " " + height + '" ' +
      'width="' + width + '" height="' + height + '" class="utg-oldroblox-svg" ' +
      'role="img" aria-label="' + ariaLabel + '">' + textMarkup + "</svg>";

    return { svg: svg, width: width, height: height };
  }

  window.UltraOldRobloxText = { build: build, PRESETS: PRESETS, columns: columns };
})();
