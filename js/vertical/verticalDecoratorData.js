/* ==========================================================================
   UltraTextGen — verticalDecoratorData.js
   Data-only module: vertical decorator groups.
   Exposes window.UTG_VERTICAL_DECORATORS.
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_VERTICAL_DECORATORS = {
    "bullets": [
      { id: "bullet-dot",      label: "• Bullet",        symbol: "•",  mode: "prefix" },
      { id: "bullet-open",     label: "◦ Open",          symbol: "◦",  mode: "prefix" },
      { id: "bullet-square",   label: "▪ Square",        symbol: "▪",  mode: "prefix" },
      { id: "bullet-tri",      label: "‣ Triangle",      symbol: "‣",  mode: "prefix" },
      { id: "bullet-ptr",      label: "▸ Pointer",       symbol: "▸",  mode: "prefix" },
      { id: "bullet-diamond",  label: "◆ Diamond",       symbol: "◆",  mode: "prefix" },
      { id: "bullet-diam-o",   label: "◇ Diamond Open",  symbol: "◇",  mode: "prefix" },
      { id: "bullet-circle",   label: "○ Circle",        symbol: "○",  mode: "prefix" },
      { id: "bullet-fill",     label: "● Fill Circle",   symbol: "●",  mode: "prefix" },
      { id: "bullet-target",   label: "⊙ Target",        symbol: "⊙",  mode: "prefix" },
      { id: "bullet-double",   label: "⊚ Double Circle", symbol: "⊚",  mode: "prefix" },
      { id: "bullet-star-f",   label: "✦ Star Filled",   symbol: "✦",  mode: "prefix" },
      { id: "bullet-star-o",   label: "✧ Star Open",     symbol: "✧",  mode: "prefix" },
      { id: "bullet-fleur",    label: "⁕ Fleur",         symbol: "⁕",  mode: "prefix" },
      { id: "bullet-right",    label: "▹ Right Tri",     symbol: "▹",  mode: "prefix" },
      { id: "bullet-arrow",    label: "► Arrow",         symbol: "►",  mode: "prefix" },
      { id: "bullet-arr2",     label: "▻ Double Tri",    symbol: "▻",  mode: "prefix" },
      { id: "bullet-sq-dot",   label: "◈ Sq Dot",        symbol: "◈",  mode: "prefix" },
      { id: "bullet-hex",      label: "⬥ Hex",           symbol: "⬥",  mode: "prefix" }
    ],
    "arrows": [
      { id: "arrow-right",     label: "→ Right",         symbol: "→",  mode: "prefix" },
      { id: "arrow-down",      label: "↓ Down",          symbol: "↓",  mode: "prefix" },
      { id: "arrow-down-b",    label: "⬇ Bold Down",     symbol: "⬇",  mode: "prefix" },
      { id: "arrow-tri-d",     label: "▼ Triangle",      symbol: "▼",  mode: "prefix" },
      { id: "arrow-dbl-d",     label: "⏬ Double Down",   symbol: "⏬",  mode: "prefix" },
      { id: "arrow-updown",    label: "↕ Up-Down",       symbol: "↕",  mode: "prefix" },
      { id: "arrow-fat",       label: "⇒ Fat Arrow",     symbol: "⇒",  mode: "prefix" },
      { id: "arrow-long",      label: "⟶ Long Arrow",    symbol: "⟶",  mode: "prefix" },
      { id: "arrow-turn",      label: "↳ Turn Down",     symbol: "↳",  mode: "prefix" },
      { id: "arrow-curve",     label: "⤵ Curve Down",    symbol: "⤵",  mode: "prefix" },
      { id: "arrow-two",       label: "↠ Two Right",     symbol: "↠",  mode: "prefix" },
      { id: "arrow-dashed",    label: "⇢ Dashed",        symbol: "⇢",  mode: "prefix" },
      { id: "arrow-impl",      label: "⟹ Implies",       symbol: "⟹",  mode: "prefix" },
      { id: "arrow-thick",     label: "➤ Thick Right",   symbol: "➤",  mode: "prefix" },
      { id: "arrow-circle",    label: "➜ Circle Arrow",  symbol: "➜",  mode: "prefix" },
      { id: "arrow-play",      label: "▶ Play",          symbol: "▶",  mode: "prefix" },
      { id: "arrow-open-tri",  label: "⊳ Open Tri",      symbol: "⊳",  mode: "prefix" },
      { id: "arrow-fast",      label: "⏩ Fast Fwd",      symbol: "⏩",  mode: "prefix" }
    ],
    "dots": [
      { id: "dot-mid",         label: "· Middle Dot",    symbol: "·",  mode: "divider" },
      { id: "dot-bull",        label: "• Bullet",        symbol: "•",  mode: "divider" },
      { id: "dot-cdot",        label: "∙ Centre Dot",    symbol: "∙",  mode: "divider" },
      { id: "dot-thin",        label: "⋅ Thin",          symbol: "⋅",  mode: "divider" },
      { id: "dot-two",         label: "‥ Two Dot",       symbol: "‥",  mode: "divider" },
      { id: "dot-four",        label: "⁘ Four Dot",      symbol: "⁘",  mode: "divider" },
      { id: "dot-five",        label: "⁙ Five Dot",      symbol: "⁙",  mode: "divider" },
      { id: "dot-tri",         label: "⁛ Tri Dot",       symbol: "⁛",  mode: "divider" },
      { id: "dot-cross",       label: "⁜ Cross",         symbol: "⁜",  mode: "divider" },
      { id: "dot-vert3",       label: "⁝ Vert 3",        symbol: "⁝",  mode: "divider" },
      { id: "dot-vert4",       label: "⁞ Vert 4",        symbol: "⁞",  mode: "divider" },
      { id: "dot-ring",        label: "∘ Ring",          symbol: "∘",  mode: "divider" },
      { id: "dot-circle",      label: "○ Circle",        symbol: "○",  mode: "divider" },
      { id: "dot-dashed",      label: "◌ Dashed",        symbol: "◌",  mode: "divider" },
      { id: "dot-open",        label: "◦ Open",          symbol: "◦",  mode: "divider" }
    ],
    "dividers": [
      { id: "div-thin",        label: "─ Thin Line",     symbol: "─",  mode: "divider" },
      { id: "div-thick",       label: "━ Thick Line",    symbol: "━",  mode: "divider" },
      { id: "div-double",      label: "═ Double Line",   symbol: "═",  mode: "divider" },
      { id: "div-dash4",       label: "┄ Dash 4",        symbol: "┄",  mode: "divider" },
      { id: "div-dash8",       label: "┈ Dash 8",        symbol: "┈",  mode: "divider" },
      { id: "div-ldash",       label: "╌ Light Dash",    symbol: "╌",  mode: "divider" },
      { id: "div-hdash",       label: "╍ Heavy Dash",    symbol: "╍",  mode: "divider" },
      { id: "div-lrnd",        label: "╺ Round Left",    symbol: "╺",  mode: "divider" },
      { id: "div-rrnd",        label: "╸ Round Right",   symbol: "╸",  mode: "divider" },
      { id: "div-block",       label: "▬ Block",         symbol: "▬",  mode: "divider" },
      { id: "div-rect",        label: "▭ Rect",          symbol: "▭",  mode: "divider" },
      { id: "div-em",          label: "― Em Dash",       symbol: "―",  mode: "divider" },
      { id: "div-hor",         label: "⎯ Hor Line",      symbol: "⎯",  mode: "divider" },
      { id: "div-spc",         label: "⏤ Space Dash",    symbol: "⏤",  mode: "divider" }
    ],
    "emojis": [
      { id: "emo-star",        label: "🌟 Star",          symbol: "🌟", mode: "divider" },
      { id: "emo-sparkle",     label: "✨ Sparkle",       symbol: "✨", mode: "divider" },
      { id: "emo-dizzy",       label: "💫 Dizzy",         symbol: "💫", mode: "divider" },
      { id: "emo-fire",        label: "🔥 Fire",          symbol: "🔥", mode: "divider" },
      { id: "emo-diamond",     label: "💎 Diamond",       symbol: "💎", mode: "divider" },
      { id: "emo-rainbow",     label: "🌈 Rainbow",       symbol: "🌈", mode: "divider" },
      { id: "emo-flower",      label: "🌸 Flower",        symbol: "🌸", mode: "divider" },
      { id: "emo-heart",       label: "💖 Heart",         symbol: "💖", mode: "divider" },
      { id: "emo-bolt",        label: "⚡ Bolt",          symbol: "⚡", mode: "divider" },
      { id: "emo-butterfly",   label: "🦋 Butterfly",     symbol: "🦋", mode: "divider" },
      { id: "emo-crown",       label: "👑 Crown",         symbol: "👑", mode: "divider" },
      { id: "emo-ribbon",      label: "🎀 Ribbon",        symbol: "🎀", mode: "divider" },
      { id: "emo-clover",      label: "🍀 Clover",        symbol: "🍀", mode: "divider" },
      { id: "emo-sun",         label: "🌞 Sun",           symbol: "🌞", mode: "divider" },
      { id: "emo-target",      label: "🎯 Target",        symbol: "🎯", mode: "divider" },
      { id: "emo-blue",        label: "🔷 Blue",          symbol: "🔷", mode: "divider" },
      { id: "emo-purple",      label: "💜 Purple",        symbol: "💜", mode: "divider" },
      { id: "emo-white",       label: "🤍 White",         symbol: "🤍", mode: "divider" }
    ],
    "flags": [
      { id: "flag-us",         label: "🇺🇸 US",           symbol: "🇺🇸", mode: "prefix" },
      { id: "flag-gb",         label: "🇬🇧 UK",           symbol: "🇬🇧", mode: "prefix" },
      { id: "flag-ca",         label: "🇨🇦 Canada",       symbol: "🇨🇦", mode: "prefix" },
      { id: "flag-au",         label: "🇦🇺 Australia",    symbol: "🇦🇺", mode: "prefix" },
      { id: "flag-in",         label: "🇮🇳 India",        symbol: "🇮🇳", mode: "prefix" },
      { id: "flag-jp",         label: "🇯🇵 Japan",        symbol: "🇯🇵", mode: "prefix" },
      { id: "flag-kr",         label: "🇰🇷 Korea",        symbol: "🇰🇷", mode: "prefix" },
      { id: "flag-fr",         label: "🇫🇷 France",       symbol: "🇫🇷", mode: "prefix" },
      { id: "flag-de",         label: "🇩🇪 Germany",      symbol: "🇩🇪", mode: "prefix" },
      { id: "flag-it",         label: "🇮🇹 Italy",        symbol: "🇮🇹", mode: "prefix" },
      { id: "flag-es",         label: "🇪🇸 Spain",        symbol: "🇪🇸", mode: "prefix" },
      { id: "flag-br",         label: "🇧🇷 Brazil",       symbol: "🇧🇷", mode: "prefix" },
      { id: "flag-mx",         label: "🇲🇽 Mexico",       symbol: "🇲🇽", mode: "prefix" },
      { id: "flag-ar",         label: "🇦🇷 Argentina",    symbol: "🇦🇷", mode: "prefix" },
      { id: "flag-sg",         label: "🇸🇬 Singapore",    symbol: "🇸🇬", mode: "prefix" },
      { id: "flag-ph",         label: "🇵🇭 Philippines",  symbol: "🇵🇭", mode: "prefix" },
      { id: "flag-th",         label: "🇹🇭 Thailand",     symbol: "🇹🇭", mode: "prefix" },
      { id: "flag-ps",         label: "🇵🇸 Palestine",    symbol: "🇵🇸", mode: "prefix" },
      { id: "flag-cn",         label: "🇨🇳 China",        symbol: "🇨🇳", mode: "prefix" }
    ]
  };

})();
