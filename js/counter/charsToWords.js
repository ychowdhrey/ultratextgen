/* ==========================================================
   charsToWords.js
   Live characters ↔ words converter for
   /character-counter/characters-to-words/.

   The conversion is an honest estimate, not a fixed ratio: English
   averages ~4.7 letters per word, plus the space that follows it, so
   1,000 characters (with spaces) lands around 140–170 words. We show
   the range and a midpoint, never a false-precision single number.
   Page estimates use the common manuscript conventions of ~3,000
   characters per single-spaced page and ~1,500 double-spaced.
   ========================================================== */
(function () {
  "use strict";

  const CHARS_PER_WORD_LOW = 7;    // conservative: longer words
  const CHARS_PER_WORD_HIGH = 6;   // generous: shorter words
  const CHARS_PER_PAGE_SINGLE = 3000;
  const CHARS_PER_PAGE_DOUBLE = 1500;
  const READING_WPM = 225;

  function fmt(n) {
    return Math.round(n).toLocaleString();
  }

  function init() {
    const input = document.getElementById("ctwInput");
    if (!input) return;

    const out = {
      words: document.getElementById("ctwWords"),
      pagesSingle: document.getElementById("ctwPagesSingle"),
      pagesDouble: document.getElementById("ctwPagesDouble"),
      reading: document.getElementById("ctwReading")
    };

    function render() {
      const chars = Math.max(0, parseInt(input.value, 10) || 0);
      const lo = chars / CHARS_PER_WORD_LOW;
      const hi = chars / CHARS_PER_WORD_HIGH;
      if (out.words) out.words.textContent = chars === 0 ? "0" : fmt(lo) + "–" + fmt(hi);
      if (out.pagesSingle) out.pagesSingle.textContent = (chars / CHARS_PER_PAGE_SINGLE).toLocaleString(undefined, { maximumFractionDigits: 1 });
      if (out.pagesDouble) out.pagesDouble.textContent = (chars / CHARS_PER_PAGE_DOUBLE).toLocaleString(undefined, { maximumFractionDigits: 1 });
      if (out.reading) {
        const midWords = (lo + hi) / 2;
        const minutes = midWords / READING_WPM;
        out.reading.textContent = minutes < 1
          ? Math.max(1, Math.round(minutes * 60)) + " sec"
          : Math.ceil(minutes) + " min";
      }
    }

    input.addEventListener("input", render);

    document.querySelectorAll("[data-ctw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = btn.getAttribute("data-ctw");
        render();
        input.focus();
      });
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
