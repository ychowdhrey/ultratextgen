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
      "I appreciate you"
    ],

    /* ----------------------------------------------------------------------
       Quick-fill repeat counts. 100 is the literal searched number
       ("sorry 100 times"); the rest give a spread around it, up to the
       shared 200 cap ("say it 200 times").
       ---------------------------------------------------------------------- */
    COUNT_PRESETS: [10, 25, 50, 100, 200],

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
