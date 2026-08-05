/* ==========================================================================
   counter-ru.js
   Русскоязычная логика для /ru/schetchik-slov-i-simvolov/. Самодостаточный
   контроллер (без внешних зависимостей): считает слова, символы, предложения,
   абзацы и время чтения, а также проверяет текст на лимиты платформ. В таблицу
   лимитов добавлены ВКонтакте (запись, статус, личное сообщение), которых нет
   в общей таблице. Стили используют те же классы cc-*, что и общий чекер.
   Паттерн модуля — IIFE, только const/let, нативные Web API.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  const READING_WPM = 200;

  /* ============================
     Таблица лимитов. `limit` — число символов; `group` — стабильный ключ
     группы. Подсчёт через Array.from() (по кодовым точкам Unicode), как и на
     основных платформах, поэтому эмодзи и буквы с диакритикой считаются так же.
     ============================ */
  const LIMITS = [
    { id: "vk-post", label: "Запись ВКонтакте (стена)", limit: 15940, group: "posts" },
    { id: "vk-message", label: "Личное сообщение ВКонтакте", limit: 4096, group: "posts" },
    { id: "x-post", label: "Пост в X / Twitter", limit: 280, group: "posts" },
    { id: "telegram-message", label: "Сообщение в Telegram", limit: 4096, group: "posts" },
    { id: "telegram-caption", label: "Подпись к фото/видео в Telegram", limit: 1024, group: "posts" },
    { id: "discord-message", label: "Сообщение в Discord", limit: 2000, group: "posts" },
    { id: "ig-caption", label: "Подпись в Instagram", limit: 2200, group: "posts" },
    { id: "tiktok-caption", label: "Подпись в TikTok", limit: 2200, group: "posts" },
    { id: "li-post", label: "Пост в LinkedIn", limit: 3000, group: "posts" },
    { id: "yt-description", label: "Описание видео на YouTube", limit: 5000, group: "posts" },
    { id: "fb-post", label: "Пост в Facebook", limit: 63206, group: "posts" },
    { id: "threads-post", label: "Пост в Threads", limit: 500, group: "posts" },

    { id: "vk-status", label: "Статус ВКонтакте", limit: 140, group: "bios" },
    { id: "ig-bio", label: "Описание профиля Instagram", limit: 150, group: "bios" },
    { id: "tiktok-bio", label: "Описание профиля TikTok", limit: 80, group: "bios" },
    { id: "telegram-bio", label: "Описание профиля Telegram", limit: 70, group: "bios" },
    { id: "whatsapp-about", label: "Статус «О себе» в WhatsApp", limit: 139, group: "bios" },
    { id: "li-headline", label: "Заголовок профиля LinkedIn", limit: 220, group: "bios" },

    { id: "discord-nick", label: "Ник на сервере Discord", limit: 32, group: "usernames" },
    { id: "tiktok-username", label: "Имя пользователя TikTok", limit: 24, group: "usernames" },
    { id: "ig-username", label: "Имя пользователя Instagram", limit: 30, group: "usernames" },

    { id: "yt-title", label: "Название видео на YouTube", limit: 100, group: "titles" },
    { id: "meta-title", label: "SEO title (заголовок)", limit: 60, group: "titles" },
    { id: "meta-description", label: "SEO description (описание)", limit: 155, group: "titles" },
    { id: "sms", label: "SMS (1 сегмент)", limit: 70, group: "titles" }
  ];

  const GROUP_NAMES = {
    posts: "Посты и сообщения",
    bios: "Профили и статусы",
    usernames: "Ники",
    titles: "Заголовки и SEO"
  };

  /* ============================
     Подсчёт
     ============================ */
  function countWords(str) {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function countSentences(str) {
    const trimmed = str.trim();
    if (!trimmed) return 0;
    const matches = trimmed.match(/[^.!?…]+[.!?…]+/g) || [];
    const consumed = matches.join("").length;
    const remainder = trimmed.slice(consumed).trim();
    return matches.length + (remainder ? 1 : 0);
  }

  function countParagraphs(str) {
    return str.split(/\n+/).map((p) => p.trim()).filter(Boolean).length;
  }

  function formatReadingTime(words) {
    if (!words) return "0 сек";
    const minutes = words / READING_WPM;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " сек";
    }
    return Math.ceil(minutes) + " мин";
  }

  function analyze(str, limitId) {
    const rule = LIMITS.find((r) => r.id === limitId) || LIMITS[0];
    const glyphs = Array.from(str || "").length;
    const fits = glyphs <= rule.limit;
    return { rule: rule, glyphs: glyphs, limit: rule.limit, fits: fits, remaining: rule.limit - glyphs };
  }

  /* ============================
     Чекер лимитов (те же классы cc-*, что и в общем чекере)
     ============================ */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function initChecker(mountId, inputId) {
    const mount = document.getElementById(mountId);
    if (!mount) return null;

    const state = { limitId: LIMITS[0].id };

    mount.innerHTML = "";
    mount.classList.add("cc-checker");
    mount.appendChild(el("div", "cc-label", "Проверьте текст на лимит платформы"));

    const select = document.createElement("select");
    select.className = "cc-select";
    select.setAttribute("aria-label", "Проверьте текст на лимит платформы");
    const groups = {};
    LIMITS.forEach((rule) => {
      if (!groups[rule.group]) {
        groups[rule.group] = document.createElement("optgroup");
        groups[rule.group].label = GROUP_NAMES[rule.group] || rule.group;
        select.appendChild(groups[rule.group]);
      }
      const opt = document.createElement("option");
      opt.value = rule.id;
      opt.textContent = rule.label + " (" + rule.limit.toLocaleString("ru-RU") + ")";
      if (rule.id === state.limitId) opt.selected = true;
      groups[rule.group].appendChild(opt);
    });
    mount.appendChild(select);

    const meta = el("div", "cc-meta");
    const badge = el("span", "cc-badge");
    const count = el("span", "cc-count");
    meta.appendChild(badge);
    meta.appendChild(count);
    mount.appendChild(meta);

    const bar = el("div", "cc-bar");
    const fill = el("div", "cc-bar-fill");
    bar.appendChild(fill);
    mount.appendChild(bar);

    const input = inputId ? document.getElementById(inputId) : null;

    function render() {
      const report = analyze(input ? input.value : "", state.limitId);
      badge.className = "cc-badge cc-badge-" + (report.glyphs === 0 ? "empty" : report.fits ? "ok" : "fail");
      badge.textContent = report.glyphs === 0 ? "" : report.fits ? "Помещается ✓" : "Превышен лимит ✕";
      count.textContent = report.glyphs.toLocaleString("ru-RU") + " / " + report.limit.toLocaleString("ru-RU");
      count.classList.toggle("is-over", !report.fits);
      const pct = Math.min(100, (report.glyphs / report.limit) * 100);
      fill.style.width = pct + "%";
      fill.classList.toggle("is-over", !report.fits);
    }

    select.addEventListener("change", function () {
      state.limitId = select.value;
      render();
    });
    if (input) input.addEventListener("input", render);

    render();
    return { render: render };
  }

  /* ============================
     Инициализация страницы
     ============================ */
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

      if (stat.chars) stat.chars.textContent = chars.toLocaleString("ru-RU");
      if (stat.charsNoSpaces) stat.charsNoSpaces.textContent = charsNoSpaces.toLocaleString("ru-RU");
      if (stat.words) stat.words.textContent = words.toLocaleString("ru-RU");
      if (stat.sentences) stat.sentences.textContent = countSentences(val).toLocaleString("ru-RU");
      if (stat.paragraphs) stat.paragraphs.textContent = countParagraphs(val).toLocaleString("ru-RU");
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
          copyBtn.textContent = "Скопировано!";
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
    initChecker("platformChecker", "counterInput");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
