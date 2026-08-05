/* ==========================================================================
   counterControllerPl.js
   Polish-language wiring for /pl/licznik-slow-i-znakow/. A small fork of
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
    if (!words) return "0 s";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " s";
    }
    return Math.ceil(minutes) + " min";
  }

  const LABELS = {
    "x-post": "Post na X / Twitterze",
    "discord-message": "Wiadomość na Discordzie",
    "ig-caption": "Podpis na Instagramie",
    "tiktok-caption": "Podpis na TikToku",
    "li-post": "Post na LinkedIn",
    "fb-post": "Post na Facebooku",
    "yt-description": "Opis filmu na YouTube",
    "pinterest-description": "Opis pinu na Pintereście",
    "telegram-message": "Wiadomość na Telegramie",
    "telegram-caption": "Podpis zdjęcia/wideo na Telegramie",
    "threads-post": "Post na Threads",
    "bluesky-post": "Post na Bluesky",
    "zalo-post": "Post/status na Zalo",
    "ig-bio": "Bio na Instagramie",
    "tiktok-bio": "Bio na TikToku",
    "li-headline": "Nagłówek LinkedIn",
    "whatsapp-about": "Sekcja „O mnie” WhatsApp",
    "telegram-bio": "Bio na Telegramie",
    "vk-status": "Status na VK",
    "discord-nick": "Pseudonim na Discordzie",
    "tiktok-username": "Nazwa użytkownika TikTok",
    "ig-username": "Nazwa użytkownika Instagram",
    "yt-title": "Tytuł filmu YouTube",
    "meta-title": "Tytuł meta SEO",
    "meta-description": "Opis meta SEO",
    "sms": "SMS (1 wiadomość)"
  };
  const GROUPS = {
    posts: "Posty",
    bios: "Bio i profile",
    usernames: "Nazwy użytkownika",
    titles: "Tytuły i SEO"
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
          copyBtn.textContent = "Skopiowano!";
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
          label: "Sprawdź tekst względem limitu platformy",
          ok: "Mieści się ✓",
          fail: "Przekroczono limit ✕"
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
