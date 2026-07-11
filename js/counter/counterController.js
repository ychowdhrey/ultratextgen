/* ==========================================================
   counterController.js
   Page controller for /character-counter/ — the standalone
   character & word counter tool. Pairs with counterRules.js
   (platform-limit checker engine + UI).
   ========================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  const READING_WPM = 225;

  function countWords(str) {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function countSentences(str) {
    const trimmed = str.trim();
    if (!trimmed) return 0;
    const matches = trimmed.match(/[^.!?]+[.!?]+/g) || [];
    const consumed = matches.join("").length;
    const remainder = trimmed.slice(consumed).trim();
    return matches.length + (remainder ? 1 : 0);
  }

  function countParagraphs(str) {
    return str.split(/\n+/).map((p) => p.trim()).filter(Boolean).length;
  }

  function formatReadingTime(words) {
    if (!words) return "0 sec";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " sec";
    }
    return Math.ceil(minutes) + " min";
  }

  function init() {
    const input = document.getElementById("counterInput");
    if (!input) return;

    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ) input.value = urlQ;

    const stat = {
      chars: $("#statChars"),
      charsNoSpaces: $("#statCharsNoSpaces"),
      words: $("#statWords"),
      sentences: $("#statSentences"),
      paragraphs: $("#statParagraphs"),
      readingTime: $("#statReadingTime")
    };
    const clearBtn = document.getElementById("counterClearBtn");
    const copyBtn = document.getElementById("counterCopyBtn");

    function render() {
      const val = input.value;
      const chars = Array.from(val).length;
      const charsNoSpaces = Array.from(val.replace(/\s/g, "")).length;
      const words = countWords(val);

      if (stat.chars) stat.chars.textContent = chars.toLocaleString();
      if (stat.charsNoSpaces) stat.charsNoSpaces.textContent = charsNoSpaces.toLocaleString();
      if (stat.words) stat.words.textContent = words.toLocaleString();
      if (stat.sentences) stat.sentences.textContent = countSentences(val).toLocaleString();
      if (stat.paragraphs) stat.paragraphs.textContent = countParagraphs(val).toLocaleString();
      if (stat.readingTime) stat.readingTime.textContent = formatReadingTime(words);

      if (clearBtn) clearBtn.hidden = chars === 0;
    }

    input.addEventListener("input", render);

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        input.focus();
        render();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        if (!input.value) return;
        try {
          await navigator.clipboard.writeText(input.value);
          const original = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("is-copied");
          setTimeout(() => {
            copyBtn.textContent = original;
            copyBtn.classList.remove("is-copied");
          }, 1500);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });
    }

    render();

    const ns = window.UltraTextGen;
    if (ns && ns.counterRules) {
      ns.counterRules.initChecker({
        mount: "platformChecker",
        inputId: "counterInput",
        text: {
          label: "Check your text against a platform limit",
          ok: "Fits ✓",
          fail: "Over the limit ✕"
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
