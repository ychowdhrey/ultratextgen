/* ==========================================================================
   counterControllerFr.js
   French-language wiring for /fr/compteur-de-mots-et-de-caracteres/. A
   small fork of counterController.js with a translated strings table —
   kept separate so the shared English controller stays untouched. Reuses
   counterRules.js unchanged (pure logic + platform-limit numbers, no
   user-facing strings).
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
    if (!words) return "0 sec";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " sec";
    }
    return Math.ceil(minutes) + " min";
  }

  const LABELS = {
    "x-post": "Publication X / Twitter",
    "discord-message": "Message Discord",
    "ig-caption": "Légende Instagram",
    "tiktok-caption": "Légende TikTok",
    "li-post": "Publication LinkedIn",
    "fb-post": "Publication Facebook",
    "yt-description": "Description YouTube",
    "pinterest-description": "Description d'épingle Pinterest",
    "telegram-message": "Message Telegram",
    "telegram-caption": "Légende photo/vidéo Telegram",
    "threads-post": "Publication Threads",
    "bluesky-post": "Publication Bluesky",
    "zalo-post": "Publication/statut Zalo",
    "ig-bio": "Bio Instagram",
    "tiktok-bio": "Bio TikTok",
    "li-headline": "Titre LinkedIn",
    "whatsapp-about": "À propos WhatsApp",
    "telegram-bio": "Bio Telegram",
    "vk-status": "Statut VK",
    "discord-nick": "Pseudo Discord",
    "tiktok-username": "Nom d'utilisateur TikTok",
    "ig-username": "Nom d'utilisateur Instagram",
    "yt-title": "Titre YouTube",
    "meta-title": "Balise meta titre SEO",
    "meta-description": "Balise meta description SEO",
    "sms": "SMS (1 segment)"
  };
  const GROUPS = {
    posts: "Publications",
    bios: "Bios et profils",
    usernames: "Noms d'utilisateur",
    titles: "Titres et SEO"
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
          copyBtn.textContent = "Copié !";
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
          label: "Vérifiez votre texte par rapport à une limite de plateforme",
          ok: "Ça passe ✓",
          fail: "Dépasse la limite ✕"
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
