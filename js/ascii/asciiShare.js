/* ==========================================================================
   UltraTextGen — asciiShare.js
   The two paste formats and the length rule shared by the ASCII tools
   (/image-to-ascii/ and /ascii-art-generator/): a fenced code block for
   Discord, a four-space indented block for Reddit, and the Discord message
   length check. One owner, so a banner and a picture are wrapped, measured
   and described the same way.

   Pure logic, no DOM. Exposes window.UTG_ASCII_SHARE.
   ========================================================================== */

(function () {
  "use strict";

  /* Discord's per-message limit for an account without Nitro; the same
     figure js/counter/counterRules.js uses for "discord-message". */
  const DISCORD_LIMIT = 2000;
  const FENCE_OPEN = "```\n";
  const FENCE_CLOSE = "\n```";

  /* Three backticks on their own lines make a code block on Discord. */
  function discordBlock(text) {
    return FENCE_OPEN + text + FENCE_CLOSE;
  }

  /* Four leading spaces make a code block on both new and old Reddit;
     a fenced block only renders on the new site. */
  function redditBlock(text) {
    return text.split("\n").map(function (line) { return "    " + line; }).join("\n");
  }

  function fencedLength(text) {
    return FENCE_OPEN.length + text.length + FENCE_CLOSE.length;
  }

  /* { fits, length, message } for the art as a Discord code block. */
  function discordFit(text) {
    const length = fencedLength(text);
    const fits = length <= DISCORD_LIMIT;
    const shown = length.toLocaleString("en-US");
    return {
      fits: fits,
      length: length,
      message: fits
        ? "Fits in one Discord message as a code block (" + shown + " of 2,000 characters)."
        : "Too long for one Discord message: " + shown + " of 2,000 characters as a code block."
    };
  }

  window.UTG_ASCII_SHARE = {
    DISCORD_LIMIT: DISCORD_LIMIT,
    FENCE_OPEN: FENCE_OPEN,
    FENCE_CLOSE: FENCE_CLOSE,
    discordBlock: discordBlock,
    redditBlock: redditBlock,
    fencedLength: fencedLength,
    discordFit: discordFit
  };
})();
