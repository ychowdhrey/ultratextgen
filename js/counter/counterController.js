/* ==========================================================
   counterController.js
   Page controller for /character-counter/ — the standalone
   character & word counter tool. Pairs with counterRules.js
   (platform-limit checker engine + counting helpers + UI).
   ========================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  const READING_WPM = 225;
  const SPEAKING_WPM = 130;

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

  function countLines(str) {
    if (!str) return 0;
    return str.split("\n").length;
  }

  /* Locale overrides. A page sets window.UTG_COUNTER_I18N before this script
     runs; anything it omits falls back to the English default below, the same
     merge-over-defaults pattern script.js uses for window.UTG_DECORATIONS.
     `units` lets a locale add billing/page-unit stat tiles: each entry is
     { id: <element id>, per: <chars per unit>, of: "chars"|"charsNoSpaces",
       decimals: <fraction digits, default 1> } — e.g. Poland's billing page
     (1800 characters with spaces) or Italy's cartella. The tile's markup
     lives in the page HTML; the controller only fills the number. */
  const I18N = Object.assign({
    sec: "sec",
    min: "min",
    copied: "Copied!",
    label: "Check your text against a platform limit",
    ok: "Fits ✓",
    fail: "Over the limit ✕",
    xNote: null,
    smsSegments: null,
    smsUnicode: null,
    labels: null,
    groups: null,
    units: null
  }, window.UTG_COUNTER_I18N || {});

  function formatTime(words, wpm) {
    if (!words) return "0 " + I18N.sec;
    const minutes = words / wpm;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " " + I18N.sec;
    }
    return Math.ceil(minutes) + " " + I18N.min;
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
      readingTime: $("#statReadingTime"),
      speakingTime: $("#statSpeakingTime"),
      lines: $("#statLines"),
      graphemes: $("#statGraphemes"),
      utf16: $("#statUtf16"),
      bytes: $("#statBytes")
    };
    const clearBtn = document.getElementById("counterClearBtn");
    const copyBtn = document.getElementById("counterCopyBtn");
    const counts = (window.UltraTextGen && window.UltraTextGen.counterCounts) || null;

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
      if (stat.readingTime) stat.readingTime.textContent = formatTime(words, READING_WPM);
      if (stat.speakingTime) stat.speakingTime.textContent = formatTime(words, SPEAKING_WPM);
      if (stat.lines) stat.lines.textContent = countLines(val).toLocaleString();

      if (counts) {
        if (stat.graphemes) stat.graphemes.textContent = counts.graphemes(val).toLocaleString();
        if (stat.utf16) stat.utf16.textContent = counts.utf16Units(val).toLocaleString();
        if (stat.bytes) stat.bytes.textContent = counts.utf8Bytes(val).toLocaleString();
      }

      if (I18N.units) {
        I18N.units.forEach((unit) => {
          const node = document.getElementById(unit.id);
          if (!node || !unit.per) return;
          const base = unit.of === "charsNoSpaces" ? charsNoSpaces : chars;
          const decimals = unit.decimals != null ? unit.decimals : 1;
          node.textContent = (base / unit.per).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
          });
        });
      }

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
          copyBtn.textContent = I18N.copied;
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
          label: I18N.label,
          ok: I18N.ok,
          fail: I18N.fail,
          xNote: I18N.xNote || undefined,
          smsSegments: I18N.smsSegments || undefined,
          smsUnicode: I18N.smsUnicode || undefined
        },
        labels: I18N.labels || undefined,
        groups: I18N.groups || undefined
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
