/* ==========================================================================
   Vertical Decoration Data
   Groups: Bullets, Arrows, Dots, Dividers, Emojis, Flags
   Each item: { symbol, label, type: "prefix"|"divider" }
   ========================================================================== */

(function () {
  "use strict";

  var VERTICAL_DECORATIONS = {
    bullets: [
      { symbol: "•", label: "• Bullet", type: "prefix" },
      { symbol: "‣", label: "‣ Triangle", type: "prefix" },
      { symbol: "◦", label: "◦ Open", type: "prefix" },
      { symbol: "▪", label: "▪ Square", type: "prefix" },
      { symbol: "▸", label: "▸ Right", type: "prefix" },
      { symbol: "▹", label: "▹ Open Right", type: "prefix" },
      { symbol: "◆", label: "◆ Diamond", type: "prefix" },
      { symbol: "◇", label: "◇ Open Diamond", type: "prefix" },
      { symbol: "★", label: "★ Star", type: "prefix" },
      { symbol: "☆", label: "☆ Open Star", type: "prefix" },
      { symbol: "✦", label: "✦ Four Star", type: "prefix" },
      { symbol: "✧", label: "✧ Open Four", type: "prefix" },
      { symbol: "⬥", label: "⬥ Fill Diamond", type: "prefix" },
      { symbol: "⬦", label: "⬦ Outline Diamond", type: "prefix" },
      { symbol: "●", label: "● Circle", type: "prefix" },
      { symbol: "○", label: "○ Open Circle", type: "prefix" },
    ],

    arrows: [
      { symbol: "→", label: "→ Right", type: "prefix" },
      { symbol: "➜", label: "➜ Heavy Right", type: "prefix" },
      { symbol: "➤", label: "➤ Pointer", type: "prefix" },
      { symbol: "►", label: "► Play", type: "prefix" },
      { symbol: "▶", label: "▶ Filled Play", type: "prefix" },
      { symbol: "⟶", label: "⟶ Long Right", type: "prefix" },
      { symbol: "⇒", label: "⇒ Double Right", type: "prefix" },
      { symbol: "⟹", label: "⟹ Long Double", type: "prefix" },
      { symbol: "↝", label: "↝ Squiggle", type: "prefix" },
      { symbol: "↳", label: "↳ Curved Down", type: "prefix" },
      { symbol: "⤷", label: "⤷ Hook Down", type: "prefix" },
      { symbol: "⟫", label: "⟫ Chevron", type: "prefix" },
      { symbol: "»", label: "» Guillemet", type: "prefix" },
      { symbol: "›", label: "› Single", type: "prefix" },
      { symbol: "⊳", label: "⊳ Triangle Right", type: "prefix" },
    ],

    dots: [
      { symbol: "·", label: "· Middle Dot", type: "prefix" },
      { symbol: "∙", label: "∙ Bullet Op", type: "prefix" },
      { symbol: "⋅", label: "⋅ Dot Op", type: "prefix" },
      { symbol: "⁃", label: "⁃ Hyphen Bullet", type: "prefix" },
      { symbol: "⊙", label: "⊙ Circled Dot", type: "prefix" },
      { symbol: "⊚", label: "⊚ Circled Ring", type: "prefix" },
      { symbol: "⊛", label: "⊛ Circled Star", type: "prefix" },
      { symbol: "◌", label: "◌ Dotted Circle", type: "prefix" },
      { symbol: "꘎", label: "꘎ Vai Full Stop", type: "prefix" },
      { symbol: "᛫", label: "᛫ Runic Dot", type: "prefix" },
      { symbol: "⸱", label: "⸱ Raised Dot", type: "prefix" },
      { symbol: "‧", label: "‧ Hyphenation", type: "prefix" },
    ],

    dividers: [
      { symbol: "───", label: "─── Line", type: "divider" },
      { symbol: "═══", label: "═══ Double", type: "divider" },
      { symbol: "- - -", label: "- - - Dash", type: "divider" },
      { symbol: "· · ·", label: "· · · Dots", type: "divider" },
      { symbol: "• • •", label: "• • • Bullets", type: "divider" },
      { symbol: "~ ~ ~", label: "~ ~ ~ Wave", type: "divider" },
      { symbol: "___", label: "___ Under", type: "divider" },
      { symbol: "***", label: "*** Stars", type: "divider" },
      { symbol: "+++", label: "+++ Plus", type: "divider" },
      { symbol: "☆ ☆ ☆", label: "☆ ☆ ☆ Stars", type: "divider" },
      { symbol: "✧ ✧ ✧", label: "✧ ✧ ✧ Sparkle", type: "divider" },
      { symbol: "◇ ◇ ◇", label: "◇ ◇ ◇ Diamond", type: "divider" },
      { symbol: "○ ○ ○", label: "○ ○ ○ Circles", type: "divider" },
      { symbol: "♦ ♦ ♦", label: "♦ ♦ ♦ Suit", type: "divider" },
      { symbol: "⊹ ⊹ ⊹", label: "⊹ ⊹ ⊹ Hermitian", type: "divider" },
    ],

    emojis: [
      { symbol: "✨", label: "✨ Sparkles", type: "prefix" },
      { symbol: "⭐", label: "⭐ Star", type: "prefix" },
      { symbol: "🌟", label: "🌟 Glowing", type: "prefix" },
      { symbol: "💫", label: "💫 Dizzy", type: "prefix" },
      { symbol: "🔹", label: "🔹 Blue Diamond", type: "prefix" },
      { symbol: "🔸", label: "🔸 Orange Diamond", type: "prefix" },
      { symbol: "💠", label: "💠 Gem", type: "prefix" },
      { symbol: "🌀", label: "🌀 Swirl", type: "prefix" },
      { symbol: "🎯", label: "🎯 Target", type: "prefix" },
      { symbol: "🔥", label: "🔥 Fire", type: "prefix" },
      { symbol: "⚡", label: "⚡ Lightning", type: "prefix" },
      { symbol: "💎", label: "💎 Diamond", type: "prefix" },
      { symbol: "🌸", label: "🌸 Blossom", type: "prefix" },
      { symbol: "🍃", label: "🍃 Leaf", type: "prefix" },
      { symbol: "🎵", label: "🎵 Music", type: "prefix" },
      { symbol: "❤️", label: "❤️ Heart", type: "prefix" },
    ],

    flags: [
      { symbol: "🇺🇸", label: "🇺🇸 US", type: "prefix" },
      { symbol: "🇬🇧", label: "🇬🇧 UK", type: "prefix" },
      { symbol: "🇫🇷", label: "🇫🇷 France", type: "prefix" },
      { symbol: "🇩🇪", label: "🇩🇪 Germany", type: "prefix" },
      { symbol: "🇯🇵", label: "🇯🇵 Japan", type: "prefix" },
      { symbol: "🇰🇷", label: "🇰🇷 Korea", type: "prefix" },
      { symbol: "🇧🇷", label: "🇧🇷 Brazil", type: "prefix" },
      { symbol: "🇮🇳", label: "🇮🇳 India", type: "prefix" },
      { symbol: "🇮🇹", label: "🇮🇹 Italy", type: "prefix" },
      { symbol: "🇪🇸", label: "🇪🇸 Spain", type: "prefix" },
      { symbol: "🇨🇦", label: "🇨🇦 Canada", type: "prefix" },
      { symbol: "🇦🇺", label: "🇦🇺 Australia", type: "prefix" },
      { symbol: "🇲🇽", label: "🇲🇽 Mexico", type: "prefix" },
      { symbol: "🇳🇬", label: "🇳🇬 Nigeria", type: "prefix" },
      { symbol: "🇿🇦", label: "🇿🇦 South Africa", type: "prefix" },
    ],
  };

  window.VERTICAL_DECORATIONS = VERTICAL_DECORATIONS;
})();
