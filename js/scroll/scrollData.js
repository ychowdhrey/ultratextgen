/* ==========================================================================
   UltraTextGen — scrollData.js
   Data-only module for the scrolling-text generator (/usecase/scrolling-text/).
   No DOM, no logic — just the divider glyphs, quick-fill preset phrases,
   approximate platform bio limits, and the marquee defaults.

   Divider glyphs are drawn from the Box Drawing (U+2500–U+257F) and General
   Punctuation (U+2000–U+206F) blocks, grouped so the picker can show tabs.
   Shape mirrors verticalDecoratorData.js: { id, label, symbol } per item,
   grouped by key.

   Exposes: window.UTG_SCROLL_DATA
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_SCROLL_DATA = {

    /* ----------------------------------------------------------------------
       Divider glyphs, grouped for the tabbed picker. `symbol` is what goes
       between (or on its own line between) each repeated message.
         - The "Basics" group carries the no-divider and blank-gap options.
         - "blank" uses U+2800 (Braille Pattern Blank) so an empty-looking
           separator line survives Instagram/TikTok bio saving, which strips
           truly empty lines (same trick the vertical-text tool uses).
       ---------------------------------------------------------------------- */
    DIVIDERS: {
      "basics": [
        { id: "none",  label: "None",       symbol: "" },
        { id: "blank", label: "Blank gap",  symbol: "⠀" },
        { id: "space", label: "· dot ·",    symbol: "·" }
      ],
      "lines": [
        { id: "line-thin",   label: "─", symbol: "──────" },
        { id: "line-heavy",  label: "━", symbol: "━━━━━━" },
        { id: "line-double", label: "═", symbol: "══════" },
        { id: "line-dash8",  label: "┈", symbol: "┈┈┈┈┈┈" },
        { id: "line-dash4",  label: "┄", symbol: "┄┄┄┄┄┄" },
        { id: "line-mixed",  label: "━╍", symbol: "━╍━╍━╍" }
      ],
      "dots": [
        { id: "dot-bullet",  label: "•", symbol: "• • •" },
        { id: "dot-mid",     label: "∙", symbol: "∙ ∙ ∙" },
        { id: "dot-ring",    label: "◦", symbol: "◦ ◦ ◦" },
        { id: "dot-tri",     label: "‣", symbol: "‣‣‣" },
        { id: "dot-ellip",   label: "⋯", symbol: "⋯⋯⋯" },
        { id: "dot-hellip",  label: "…", symbol: "…" }
      ],
      "stars": [
        { id: "star-filled", label: "★", symbol: "★ ★ ★" },
        { id: "star-spark",  label: "✦", symbol: "✦ ✦ ✦" },
        { id: "star-open",   label: "✧", symbol: "✧ ✧ ✧" },
        { id: "star-flor",   label: "❈", symbol: "❈ ❈ ❈" },
        { id: "star-shadow", label: "❍", symbol: "❍ ❍ ❍" },
        { id: "star-heart",  label: "♥", symbol: "♥ ♥ ♥" }
      ]
    },

    /* ----------------------------------------------------------------------
       Quick-fill example phrases. Weighted toward what real searchers want:
       "I love you" is the confirmed high-volume variant, plus a handful of
       similarly short romantic / cute / status-y phrases. A convenience, not
       a content library — keep it short and tasteful.
       ---------------------------------------------------------------------- */
    PRESET_MESSAGES: [
      "I love you",
      "Miss you",
      "Good vibes only",
      "New phone who dis",
      "Best day ever",
      "Happy birthday",
      "You're my favorite",
      "Thinking of you",
      "Stay golden",
      "On repeat"
    ],

    /* ----------------------------------------------------------------------
       Approximate bio / about character limits for the platforms this site
       already has dedicated pages for. Platforms change these often, so the
       UI always labels them "approx." Used to compute how many repeats fit
       under a target field, and to flag which boxes the output overflows
       (overflowing the fixed-height box is what makes a bio scroll).
       ---------------------------------------------------------------------- */
    PLATFORM_LIMITS: [
      { id: "instagram", label: "Instagram bio", limit: 150 },
      { id: "tiktok",    label: "TikTok bio",    limit: 80 },
      { id: "x",         label: "X / Twitter bio", limit: 160 },
      { id: "facebook",  label: "Facebook bio",  limit: 101 },
      { id: "discord",   label: "Discord About Me", limit: 190 },
      { id: "snapchat",  label: "Snapchat bio",  limit: 80 },
      { id: "pinterest", label: "Pinterest about", limit: 160 },
      { id: "linkedin",  label: "LinkedIn headline", limit: 220 },
      { id: "youtube",   label: "YouTube description", limit: 1000 }
    ],

    /* ----------------------------------------------------------------------
       Marquee mode defaults. Colors are literal on purpose: the marquee is an
       embeddable, self-contained snippet, so it carries real values (not this
       site's CSS tokens). Purple-on-dark matches the brand look by default.
       `speed` is seconds per loop (lower = faster).
       ---------------------------------------------------------------------- */
    MARQUEE_DEFAULTS: {
      text: "Breaking news — your scrolling text here",
      speed: 12,
      direction: "left",
      gap: 48,
      textColor: "#8b5cf6",
      bgColor: "#0f172a",
      fontSize: 28,
      repeatCount: 4
    }
  };
})();
