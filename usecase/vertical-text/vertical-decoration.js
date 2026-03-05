/* ==========================================================================
   UltraTextGen — vertical-decoration.js
   Vertical-specific decoration logic.
   MUST NOT be mixed with horizontal decoration (script.js applyDecoration).
   ========================================================================== */

(function (exports) {
  "use strict";

  /* ---------- Vertical Decoration Library ---------- */

  var verticalDecorations = {
    bullets: [
      { text: "• line",   symbol: "•",  type: "prefix" },
      { text: "‣ line",   symbol: "‣",  type: "prefix" },
      { text: "⁃ line",   symbol: "⁃",  type: "prefix" },
      { text: "◦ line",   symbol: "◦",  type: "prefix" },
      { text: "● line",   symbol: "●",  type: "prefix" },
      { text: "○ line",   symbol: "○",  type: "prefix" },
      { text: "■ line",   symbol: "■",  type: "prefix" },
      { text: "□ line",   symbol: "□",  type: "prefix" },
      { text: "▪ line",   symbol: "▪",  type: "prefix" },
      { text: "▫ line",   symbol: "▫",  type: "prefix" },
      { text: "◆ line",   symbol: "◆",  type: "prefix" },
      { text: "◇ line",   symbol: "◇",  type: "prefix" },
      { text: "★ line",   symbol: "★",  type: "prefix" },
      { text: "☆ line",   symbol: "☆",  type: "prefix" },
      { text: "✦ line",   symbol: "✦",  type: "prefix" }
    ],
    arrows: [
      { text: "→ line",   symbol: "→",  type: "prefix" },
      { text: "➜ line",   symbol: "➜",  type: "prefix" },
      { text: "➤ line",   symbol: "➤",  type: "prefix" },
      { text: "▸ line",   symbol: "▸",  type: "prefix" },
      { text: "▹ line",   symbol: "▹",  type: "prefix" },
      { text: "▶ line",   symbol: "▶",  type: "prefix" },
      { text: "➔ line",   symbol: "➔",  type: "prefix" },
      { text: "⇒ line",   symbol: "⇒",  type: "prefix" },
      { text: "⇨ line",   symbol: "⇨",  type: "prefix" },
      { text: "↳ line",   symbol: "↳",  type: "prefix" },
      { text: "⤷ line",   symbol: "⤷",  type: "prefix" },
      { text: "» line",   symbol: "»",  type: "prefix" },
      { text: "› line",   symbol: "›",  type: "prefix" },
      { text: "⊳ line",   symbol: "⊳",  type: "prefix" },
      { text: "⇢ line",   symbol: "⇢",  type: "prefix" }
    ],
    dots: [
      { text: "· line",   symbol: "·",  type: "prefix" },
      { text: ".. line",  symbol: "..", type: "prefix" },
      { text: "… line",   symbol: "…",  type: "prefix" },
      { text: "⋅ line",   symbol: "⋅",  type: "prefix" },
      { text: "∙ line",   symbol: "∙",  type: "prefix" },
      { text: "⊙ line",   symbol: "⊙",  type: "prefix" },
      { text: "⊛ line",   symbol: "⊛",  type: "prefix" },
      { text: "⊚ line",   symbol: "⊚",  type: "prefix" },
      { text: "∘ line",   symbol: "∘",  type: "prefix" },
      { text: "⊕ line",   symbol: "⊕",  type: "prefix" }
    ],
    dividers: [
      { text: "── divider",  symbol: "──────",   type: "divider" },
      { text: "—— divider",  symbol: "——————",   type: "divider" },
      { text: "·· divider",  symbol: "······",   type: "divider" },
      { text: "-- divider",  symbol: "------",   type: "divider" },
      { text: "== divider",  symbol: "======",   type: "divider" },
      { text: "~~ divider",  symbol: "~~~~~~",   type: "divider" },
      { text: "** divider",  symbol: "******",   type: "divider" },
      { text: "## divider",  symbol: "######",   type: "divider" },
      { text: "++ divider",  symbol: "++++++",   type: "divider" },
      { text: ":: divider",  symbol: "::::::",   type: "divider" },
      { text: "•• divider",  symbol: "••••••",   type: "divider" },
      { text: "▬▬ divider",  symbol: "▬▬▬▬▬▬",  type: "divider" },
      { text: "─ · ─ div",   symbol: "─ · ─ · ─", type: "divider" },
      { text: "⎯⎯ divider",  symbol: "⎯⎯⎯⎯⎯⎯",  type: "divider" },
      { text: "━━ divider",  symbol: "━━━━━━",   type: "divider" }
    ],
    emojis: [
      { text: "✨ line",  symbol: "✨", type: "prefix" },
      { text: "🔥 line",  symbol: "🔥", type: "prefix" },
      { text: "💫 line",  symbol: "💫", type: "prefix" },
      { text: "⚡ line",  symbol: "⚡", type: "prefix" },
      { text: "🌟 line",  symbol: "🌟", type: "prefix" },
      { text: "💎 line",  symbol: "💎", type: "prefix" },
      { text: "🎯 line",  symbol: "🎯", type: "prefix" },
      { text: "🌸 line",  symbol: "🌸", type: "prefix" },
      { text: "🍀 line",  symbol: "🍀", type: "prefix" },
      { text: "❤️ line",  symbol: "❤️", type: "prefix" },
      { text: "🦋 line",  symbol: "🦋", type: "prefix" },
      { text: "🌈 line",  symbol: "🌈", type: "prefix" },
      { text: "🎵 line",  symbol: "🎵", type: "prefix" },
      { text: "🔮 line",  symbol: "🔮", type: "prefix" },
      { text: "🌙 line",  symbol: "🌙", type: "prefix" }
    ],
    flags: [
      { text: "🇺🇸 line",  symbol: "🇺🇸", type: "prefix" },
      { text: "🇬🇧 line",  symbol: "🇬🇧", type: "prefix" },
      { text: "🇫🇷 line",  symbol: "🇫🇷", type: "prefix" },
      { text: "🇩🇪 line",  symbol: "🇩🇪", type: "prefix" },
      { text: "🇪🇸 line",  symbol: "🇪🇸", type: "prefix" },
      { text: "🇮🇹 line",  symbol: "🇮🇹", type: "prefix" },
      { text: "🇧🇷 line",  symbol: "🇧🇷", type: "prefix" },
      { text: "🇯🇵 line",  symbol: "🇯🇵", type: "prefix" },
      { text: "🇰🇷 line",  symbol: "🇰🇷", type: "prefix" },
      { text: "🇮🇳 line",  symbol: "🇮🇳", type: "prefix" },
      { text: "🇲🇽 line",  symbol: "🇲🇽", type: "prefix" },
      { text: "🇨🇦 line",  symbol: "🇨🇦", type: "prefix" },
      { text: "🇦🇺 line",  symbol: "🇦🇺", type: "prefix" },
      { text: "🇹🇷 line",  symbol: "🇹🇷", type: "prefix" },
      { text: "🇵🇹 line",  symbol: "🇵🇹", type: "prefix" }
    ]
  };

  /* ---------- Layouts that support divider insertion ---------- */

  var DIVIDER_SUPPORTED_LAYOUTS = [
    "stacked", "reverse", "upsidedown", "spaced", "box", "staircase",
    "pyramid", "reversepyramid", "centeredpyramid"
  ];

  /* ---------- Apply functions ---------- */

  /**
   * Prefix every non-empty line: prefix + space + line
   */
  function applyVerticalPrefixDecorator(output, prefix) {
    if (!output || !prefix) return output || "";
    return output.split("\n").map(function (line) {
      return line.trim() !== "" ? prefix + " " + line : line;
    }).join("\n");
  }

  /**
   * Insert divider line between consecutive non-empty lines inside each word block.
   * Preserve blank lines between word blocks.
   *
   * For layouts with indentation/columns (diagonal, doublecolumn),
   * fallback to prefix mode using the divider symbol.
   */
  function applyVerticalDividerDecorator(output, divider, layoutId) {
    if (!output || !divider) return output || "";

    // Fallback: for layouts that don't support divider insertion,
    // use the divider symbol as a prefix instead.
    if (DIVIDER_SUPPORTED_LAYOUTS.indexOf(layoutId) === -1) {
      return applyVerticalPrefixDecorator(output, divider);
    }

    var lines = output.split("\n");
    var result = [];

    for (var i = 0; i < lines.length; i++) {
      result.push(lines[i]);
      // Insert divider between two consecutive non-empty lines
      if (
        lines[i].trim() !== "" &&
        i + 1 < lines.length &&
        lines[i + 1].trim() !== ""
      ) {
        result.push(divider);
      }
    }
    return result.join("\n");
  }

  /**
   * Switch between prefix or divider behavior depending on decorator type.
   */
  function applyVerticalDecorator(output, decorator, layoutId) {
    if (!decorator || !output) return output || "";
    if (decorator.type === "divider") {
      return applyVerticalDividerDecorator(output, decorator.symbol, layoutId);
    }
    return applyVerticalPrefixDecorator(output, decorator.symbol);
  }

  /* ---------- Public API ---------- */

  var VerticalDecoration = {
    verticalDecorations: verticalDecorations,
    DIVIDER_SUPPORTED_LAYOUTS: DIVIDER_SUPPORTED_LAYOUTS,
    applyVerticalPrefixDecorator: applyVerticalPrefixDecorator,
    applyVerticalDividerDecorator: applyVerticalDividerDecorator,
    applyVerticalDecorator: applyVerticalDecorator
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = VerticalDecoration;
  } else {
    exports.VerticalDecoration = VerticalDecoration;
  }

})(typeof window !== "undefined" ? window : this);
