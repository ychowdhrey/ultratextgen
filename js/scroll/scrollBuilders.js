/* ==========================================================================
   UltraTextGen — scrollBuilders.js
   Pure logic for the scrolling-text generator. No DOM calls: options in,
   string / plain-object out — so it can be reasoned about and tested in
   isolation, mirroring curvedText.js's build() shape.

   Exposes: window.UTG_SCROLL_BUILDERS = {
     buildBioScrollText,   // -> string   (repeated, divider-separated block)
     computeFillRepeats,   // -> integer  (how many repeats fit a bio limit)
     buildMarqueeSnippet   // -> { previewHtml, embedHtml, embedCss }
   }
   ========================================================================== */

(function () {
  "use strict";

  /* Hard cap on repeats so a runaway control can't build megabytes of text,
     mirroring verticalLayouts.js's maxUnits guard. Shared with the repeat-text
     generator (/usecase/repeat-text/), whose whole point is "100 times" (and
     its "200 times" sibling), so the cap is 200 — read dynamically by both
     pages, so raising it just gives the scrolling-text slider more headroom. */
  const MAX_REPEATS = 200;

  /* Unicode-aware length (counts code points the way platforms roughly do). */
  function charLen(str) {
    return str ? Array.from(str).length : 0;
  }

  function clampRepeats(n) {
    let r = Math.floor(Number(n));
    if (!isFinite(r) || r < 1) return 1;
    if (r > MAX_REPEATS) return MAX_REPEATS;
    return r;
  }

  /* --------------------------------------------------------------------------
     buildBioScrollText
       { text, divider, repeats, joinMode } -> string

     Repeats `text` `repeats` times, joined by `divider`.
       joinMode: "own-line" — divider sits on its own line between repeats
                              (message \n divider \n message …). This is the
                              block people paste into a bio so it overflows.
                 "inline"   — divider sits inline between repeats on the flow
                              (message · divider · message …), one long line.
     An empty divider ("None") collapses to a bare newline (own-line) or a
     single space (inline).
     -------------------------------------------------------------------------- */
  function buildBioScrollText(opts) {
    opts = opts || {};
    let text = (opts.text == null ? "" : String(opts.text)).trim();
    if (!text) return "";

    let divider = opts.divider == null ? "" : String(opts.divider);
    let joinMode = opts.joinMode === "inline" ? "inline" : "own-line";
    let repeats = clampRepeats(opts.repeats);

    let parts = [];
    for (let i = 0; i < repeats; i++) parts.push(text);

    if (joinMode === "inline") {
      let inlineSep = divider ? " " + divider + " " : " ";
      return parts.join(inlineSep);
    }

    let lineSep = divider ? "\n" + divider + "\n" : "\n";
    return parts.join(lineSep);
  }

  /* --------------------------------------------------------------------------
     computeFillRepeats
       { text, dividerLength, platformLimit } -> integer

     Pure arithmetic: how many repeats fit under a target field's character
     budget. `dividerLength` is the per-join cost (in characters) the caller
     already worked out for the chosen divider + join mode.

       n repeats cost:  n * unit + (n - 1) * dividerLength  <= platformLimit
       => n <= (platformLimit + dividerLength) / (unit + dividerLength)

     Always returns at least 1 and never more than the shared MAX_REPEATS cap.
     -------------------------------------------------------------------------- */
  function computeFillRepeats(opts) {
    opts = opts || {};
    let unit = charLen((opts.text == null ? "" : String(opts.text)).trim());
    if (unit <= 0) return 1;

    let dividerLength = Math.max(0, Number(opts.dividerLength) || 0);
    let limit = Math.max(0, Number(opts.platformLimit) || 0);

    let n = Math.floor((limit + dividerLength) / (unit + dividerLength));
    return clampRepeats(n);
  }

  /* --------------------------------------------------------------------------
     Deterministic id from the inputs (no Math.random / Date.now), so the same
     settings always produce the same namespace and two marquees on one page
     never collide. djb2 hash -> base36.
     -------------------------------------------------------------------------- */
  function hashId(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  }

  const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return HTML_ESCAPE[c]; });
  }

  /* Keep colors / numbers safe to splice into CSS. */
  function safeColor(v, fallback) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(v)) ? String(v) : fallback;
  }
  function num(v, fallback, min, max) {
    let n = Number(v);
    if (!isFinite(n)) n = fallback;
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  }

  /* --------------------------------------------------------------------------
     buildMarqueeSnippet
       { text, speed, direction, gap, textColor, bgColor, fontSize, repeatCount }
       -> { previewHtml, embedHtml, embedCss }

     A self-contained, uniquely-namespaced CSS-animation marquee built with the
     doubled-track technique (mirrors the 404.css marquee: two identical passes,
     translateX(-50%) loops seamlessly). embedHtml + embedCss together are a
     portable snippet a user can paste into their own site, forum signature, or
     OBS browser source — they lean on no UltraTextGen CSS classes. Honors
     prefers-reduced-motion in the embeddable CSS too.

     previewHtml bundles a <style> so assigning it to innerHTML animates live.
     -------------------------------------------------------------------------- */
  function buildMarqueeSnippet(opts) {
    opts = opts || {};
    let text = (opts.text == null ? "" : String(opts.text)) || "Your scrolling text";
    let speed = num(opts.speed, 12, 1, 600);
    let direction = opts.direction === "right" ? "right" : "left";
    let gap = num(opts.gap, 48, 0, 400);
    let fontSize = num(opts.fontSize, 28, 8, 200);
    let textColor = safeColor(opts.textColor, "#8b5cf6");
    let bgColor = safeColor(opts.bgColor, "#0f172a");
    let repeatCount = clampRepeats(num(opts.repeatCount, 4, 1, MAX_REPEATS));

    let ns = "utg-marquee-" + hashId([
      text, speed, direction, gap, fontSize, textColor, bgColor, repeatCount
    ].join("|"));

    let trackCls = ns + "__track";
    let itemCls = ns + "__item";
    let kf = ns + "__scroll";
    let gapHalf = gap / 2;

    /* "right" travels the opposite way along the same doubled track. */
    let fromX = direction === "right" ? "-50%" : "0";
    let toX = direction === "right" ? "0" : "-50%";

    let embedCss = [
      "." + ns + " {",
      "  overflow: hidden;",
      "  width: 100%;",
      "  box-sizing: border-box;",
      "  background: " + bgColor + ";",
      "  padding: 12px 0;",
      "}",
      "." + ns + " ." + trackCls + " {",
      "  display: inline-flex;",
      "  flex-wrap: nowrap;",
      "  white-space: nowrap;",
      "  width: max-content;",
      "  will-change: transform;",
      "  animation: " + kf + " " + speed + "s linear infinite;",
      "}",
      "." + ns + ":hover ." + trackCls + " {",
      "  animation-play-state: paused;",
      "}",
      "." + ns + " ." + itemCls + " {",
      "  display: inline-block;",
      "  padding: 0 " + gapHalf + "px;",
      "  font-size: " + fontSize + "px;",
      "  line-height: 1.3;",
      "  color: " + textColor + ";",
      "  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;",
      "}",
      "@keyframes " + kf + " {",
      "  from { transform: translateX(" + fromX + "); }",
      "  to   { transform: translateX(" + toX + "); }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  ." + ns + " ." + trackCls + " { animation: none; }",
      "}"
    ].join("\n");

    /* One pass of items, then the pass is duplicated for a seamless -50% loop. */
    let onePass = "";
    for (let i = 0; i < repeatCount; i++) {
      onePass += '      <span class="' + itemCls + '">' + esc(text) + "</span>\n";
    }
    let embedHtml =
      '<div class="' + ns + '" role="img" aria-label="' + esc(text) + '">\n' +
      '  <div class="' + trackCls + '">\n' +
      onePass +
      onePass +
      "  </div>\n" +
      "</div>";

    let previewHtml = "<style>\n" + embedCss + "\n</style>\n" + embedHtml;

    return { previewHtml: previewHtml, embedHtml: embedHtml, embedCss: embedCss };
  }

  window.UTG_SCROLL_BUILDERS = {
    MAX_REPEATS: MAX_REPEATS,
    charLen: charLen,
    buildBioScrollText: buildBioScrollText,
    computeFillRepeats: computeFillRepeats,
    buildMarqueeSnippet: buildMarqueeSnippet
  };
})();
