/* ==========================================================================
   counterControllerDe.js
   German-language wiring for /de/woerter-zeichen-zaehlen/. A small fork of
   counterController.js with a translated strings table — kept separate so
   the shared English controller stays untouched. Reuses counterRules.js
   unchanged (pure logic + platform-limit numbers, no user-facing strings).
   ========================================================================== */
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
    if (!words) return "0 Sek.";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " Sek.";
    }
    return Math.ceil(minutes) + " Min.";
  }

  const LABELS = {
    "x-post": "X- / Twitter-Beitrag",
    "discord-message": "Discord-Nachricht",
    "ig-caption": "Instagram-Bildunterschrift",
    "tiktok-caption": "TikTok-Bildunterschrift",
    "li-post": "LinkedIn-Beitrag",
    "fb-post": "Facebook-Beitrag",
    "yt-description": "YouTube-Beschreibung",
    "pinterest-description": "Pinterest-Pin-Beschreibung",
    "telegram-message": "Telegram-Nachricht",
    "telegram-caption": "Telegram-Foto-/Video-Bildunterschrift",
    "threads-post": "Threads-Beitrag",
    "bluesky-post": "Bluesky-Beitrag",
    "zalo-post": "Zalo-Beitrag/Status",
    "ig-bio": "Instagram-Bio",
    "tiktok-bio": "TikTok-Bio",
    "li-headline": "LinkedIn-Headline",
    "whatsapp-about": "WhatsApp-Info",
    "telegram-bio": "Telegram-Bio",
    "vk-status": "VK-Status",
    "discord-nick": "Discord-Spitzname",
    "tiktok-username": "TikTok-Benutzername",
    "ig-username": "Instagram-Benutzername",
    "yt-title": "YouTube-Titel",
    "meta-title": "SEO-Meta-Titel",
    "meta-description": "SEO-Meta-Beschreibung",
    "sms": "SMS (1 Segment)"
  };
  const GROUPS = {
    posts: "Beiträge",
    bios: "Bios & Profile",
    usernames: "Benutzernamen",
    titles: "Titel & SEO"
  };

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
          copyBtn.textContent = "Kopiert!";
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
          label: "Text gegen ein Plattformlimit prüfen",
          ok: "Passt ✓",
          fail: "Limit überschritten ✕"
        },
        labels: LABELS,
        groups: GROUPS
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
