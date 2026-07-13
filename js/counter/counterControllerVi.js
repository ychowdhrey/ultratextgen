/* ==========================================================================
   counterControllerVi.js
   Vietnamese-language wiring for /vi/dem-tu-dem-ky-tu/. A small fork of
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
    if (!words) return "0 giây";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " giây";
    }
    return Math.ceil(minutes) + " phút";
  }

  const LABELS = {
    "x-post": "Bài đăng X / Twitter",
    "discord-message": "Tin nhắn Discord",
    "ig-caption": "Chú thích Instagram",
    "tiktok-caption": "Chú thích TikTok",
    "li-post": "Bài đăng LinkedIn",
    "fb-post": "Bài đăng Facebook",
    "yt-description": "Mô tả video YouTube",
    "pinterest-description": "Mô tả ghim Pinterest",
    "telegram-message": "Tin nhắn Telegram",
    "telegram-caption": "Chú thích ảnh/video Telegram",
    "threads-post": "Bài đăng Threads",
    "bluesky-post": "Bài đăng Bluesky",
    "zalo-post": "Bài đăng / trạng thái Zalo",
    "ig-bio": "Tiểu sử Instagram",
    "tiktok-bio": "Tiểu sử TikTok",
    "li-headline": "Tiêu đề LinkedIn",
    "whatsapp-about": "Giới thiệu WhatsApp",
    "telegram-bio": "Tiểu sử Telegram",
    "vk-status": "Trạng thái VK",
    "discord-nick": "Biệt danh Discord",
    "tiktok-username": "Tên người dùng TikTok",
    "ig-username": "Tên người dùng Instagram",
    "yt-title": "Tiêu đề video YouTube",
    "meta-title": "Thẻ tiêu đề SEO",
    "meta-description": "Thẻ mô tả SEO",
    "sms": "SMS (1 đoạn)"
  };
  const GROUPS = {
    posts: "Bài đăng",
    bios: "Tiểu sử & hồ sơ",
    usernames: "Tên người dùng",
    titles: "Tiêu đề & SEO"
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
          copyBtn.textContent = "Đã sao chép!";
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
        selected: "zalo-post",
        text: {
          label: "Kiểm tra văn bản theo giới hạn nền tảng",
          ok: "Vừa đủ ✓",
          fail: "Vượt quá giới hạn ✕"
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
