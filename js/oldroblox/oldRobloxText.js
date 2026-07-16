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
    // glyphs and heavy weights never run past the viewBox.
    let longest = 1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > longest) longest = lines[i].length;
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

  window.UltraOldRobloxText = { build: build, PRESETS: PRESETS };
})();
