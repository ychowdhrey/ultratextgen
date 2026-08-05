/* ==========================================================================
   counterControllerTr.js
   Turkish-language wiring for /tr/karakter-sayaci/. A small fork of
   counterController.js with a translated strings table — kept separate so
   the shared English controller stays untouched. Reuses counterRules.js
   unchanged (pure logic + platform-limit numbers, no user-facing strings).
   Lives under /tr/js/ (locale folder) rather than /js/counter/; move it
   next to its siblings whenever a cross-locale pass touches that folder.
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
    if (!words) return "0 sn";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " sn";
    }
    return Math.ceil(minutes) + " dk";
  }

  const LABELS = {
    "x-post": "X / Twitter gönderisi",
    "discord-message": "Discord mesajı",
    "ig-caption": "Instagram açıklaması",
    "tiktok-caption": "TikTok açıklaması",
    "li-post": "LinkedIn gönderisi",
    "fb-post": "Facebook gönderisi",
    "yt-description": "YouTube video açıklaması",
    "pinterest-description": "Pinterest pin açıklaması",
    "telegram-message": "Telegram mesajı",
    "telegram-caption": "Telegram fotoğraf/video açıklaması",
    "threads-post": "Threads gönderisi",
    "bluesky-post": "Bluesky gönderisi",
    "zalo-post": "Zalo gönderisi/durumu",
    "ig-bio": "Instagram biyografisi",
    "tiktok-bio": "TikTok biyografisi",
    "li-headline": "LinkedIn başlığı",
    "whatsapp-about": "WhatsApp Hakkında yazısı",
    "telegram-bio": "Telegram biyografisi",
    "vk-status": "VK durumu",
    "discord-nick": "Discord takma adı",
    "tiktok-username": "TikTok kullanıcı adı",
    "ig-username": "Instagram kullanıcı adı",
    "yt-title": "YouTube video başlığı",
    "meta-title": "SEO meta başlığı",
    "meta-description": "SEO meta açıklaması",
    "sms": "SMS (1 mesaj)"
  };
  const GROUPS = {
    posts: "Gönderiler",
    bios: "Biyografi ve profiller",
    usernames: "Kullanıcı adları",
    titles: "Başlıklar ve SEO"
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
          copyBtn.textContent = "Kopyalandı!";
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
          label: "Metnini bir platform sınırıyla karşılaştır",
          ok: "Sığıyor ✓",
          fail: "Sınır aşıldı ✕"
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
