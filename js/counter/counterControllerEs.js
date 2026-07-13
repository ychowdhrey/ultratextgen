/* ==========================================================================
   counterControllerEs.js
   Spanish-language wiring for /es/contador-de-palabras-y-caracteres/. A
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
    if (!words) return "0 seg";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " seg";
    }
    return Math.ceil(minutes) + " min";
  }

  const LABELS = {
    "x-post": "Publicación en X / Twitter",
    "discord-message": "Mensaje de Discord",
    "ig-caption": "Descripción de Instagram",
    "tiktok-caption": "Descripción de TikTok",
    "li-post": "Publicación de LinkedIn",
    "fb-post": "Publicación de Facebook",
    "yt-description": "Descripción de YouTube",
    "pinterest-description": "Descripción de pin de Pinterest",
    "telegram-message": "Mensaje de Telegram",
    "telegram-caption": "Descripción de foto/video de Telegram",
    "threads-post": "Publicación de Threads",
    "bluesky-post": "Publicación de Bluesky",
    "zalo-post": "Publicación/estado de Zalo",
    "ig-bio": "Biografía de Instagram",
    "tiktok-bio": "Biografía de TikTok",
    "li-headline": "Titular de LinkedIn",
    "whatsapp-about": "Info de WhatsApp",
    "telegram-bio": "Biografía de Telegram",
    "vk-status": "Estado de VK",
    "discord-nick": "Apodo de Discord",
    "tiktok-username": "Nombre de usuario de TikTok",
    "ig-username": "Nombre de usuario de Instagram",
    "yt-title": "Título de YouTube",
    "meta-title": "Meta título SEO",
    "meta-description": "Meta descripción SEO",
    "sms": "SMS (1 segmento)"
  };
  const GROUPS = {
    posts: "Publicaciones",
    bios: "Bios y perfiles",
    usernames: "Nombres de usuario",
    titles: "Títulos y SEO"
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
          copyBtn.textContent = "¡Copiado!";
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
          label: "Comprueba tu texto contra el límite de una plataforma",
          ok: "Cabe ✓",
          fail: "Supera el límite ✕"
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
