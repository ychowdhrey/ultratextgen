/* ==========================================================================
   UltraTextGen — repeatData.js
   Data-only module for the repeat-text generator (/usecase/repeat-text/).
   No DOM, no logic — just the quick-fill phrases, the quick-fill repeat
   counts, and the page's defaults. The divider glyphs are NOT redeclared here:
   the page reuses window.UTG_SCROLL_DATA.DIVIDERS from the scrolling-text build.

   Exposes: window.UTG_REPEAT_DATA
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_REPEAT_DATA = {

    /* ----------------------------------------------------------------------
       Quick-fill example phrases. Deliberately distinct from the scrolling
       page's more general list: this page's demand is apology / love, so the
       presets lead with the phrases people actually search to repeat
       ("sorry 100 times", "i love you 100 times"). Short and tasteful — a
       convenience, not a content library.
       ---------------------------------------------------------------------- */
    PRESET_MESSAGES: [
      "Sorry",
      "I'm sorry",
      "Please forgive me",
      "My bad",
      "I love you",
      "I miss you",
      "Thank you",
      "I appreciate you",
      "❤️"
    ],

    /* ----------------------------------------------------------------------
       Quick sets: phrase + count + arrangement in one tap. The heart is
       U+2764 U+FE0F (the variation selector makes it render as the red
       emoji rather than a black text heart), so each copy is two code
       points. Inline with no divider puts the hearts on one line with a
       single space between them: 1000 hearts is 2,999 characters.
       ---------------------------------------------------------------------- */
    QUICK_SETS: [
      { label: "❤️ ×1000", phrase: "❤️", count: 1000, shape: "inline", divider: "none" }
    ],

    /* ----------------------------------------------------------------------
       Quick-fill repeat counts. 100 is the literal searched number
       ("sorry 100 times"); the rest give a spread around it, up to the
       1000 cap ("1000 hearts").
       ---------------------------------------------------------------------- */
    COUNT_PRESETS: [10, 25, 50, 100, 200, 500, 1000],

    /* ----------------------------------------------------------------------
       First-paint defaults so there is meaningful output on load. "Sorry"
       repeated 100 times as a plain block is the most literal answer to the
       primary query, so that is the default arrangement.
       ---------------------------------------------------------------------- */
    DEFAULTS: {
      phrase: "Sorry",
      count: 100,
      shape: "block",
      columns: 5
    }
  };
})();
