(function () {
  "use strict";

  const CONTEXTS = {
    "display-name": {
      limit: 30,
      guidance: "Best for profile identity. Full Unicode works. Keep it short so it stays readable in feed and comments.",
      previewType: "display-name",
      presets: [
        { label: "Bold", category: "bold" },
        { label: "Cursive", category: "cursive" },
        { label: "Bubble", category: "bubble" },
        { label: "Gothic", category: "gothic" }
      ],
      showUsernameNote: false,
      showRoundedNote: false,
      placeholder: "your name"
    },
    "bio": {
      limit: 80,
      guidance: "Bio text supports Unicode and emojis. Use one strong style plus symbols so the line stays clean.",
      previewType: "bio",
      presets: [
        { label: "Cursive", category: "cursive" },
        { label: "Bold", category: "bold" },
        { label: "Fancy", category: "fancy" },
        { label: "Special", category: "special" }
      ],
      showUsernameNote: false,
      showRoundedNote: false,
      placeholder: "creator | daily posts"
    },
    "caption": {
      limit: null,
      guidance: "Captions support Unicode styles. High-contrast styles tend to perform best in fast scroll feeds.",
      previewType: "caption",
      presets: [
        { label: "Bold", category: "bold" },
        { label: "Gothic", category: "gothic" },
        { label: "Cool", category: "cool" },
        { label: "Special", category: "special" }
      ],
      showUsernameNote: false,
      showRoundedNote: false,
      placeholder: "new drop tonight"
    },
    "comment": {
      limit: null,
      guidance: "Comments support Unicode styles and are the easiest place to test if a style renders correctly.",
      previewType: "comment",
      presets: [
        { label: "Bold", category: "bold" },
        { label: "Cool", category: "cool" },
        { label: "Bubble", category: "bubble" },
        { label: "Fancy", category: "fancy" }
      ],
      showUsernameNote: false,
      showRoundedNote: false,
      placeholder: "this deserves more likes"
    },
    "username": {
      limit: 24,
      guidance: "@Username is your unique handle. TikTok accepts ASCII only (letters, numbers, underscore, period).",
      previewType: "username",
      presets: [
        { label: "TikTok names", category: "all" }
      ],
      showUsernameNote: true,
      showRoundedNote: false,
      placeholder: "your_handle"
    },
    "rounded-box": {
      limit: null,
      guidance: "Use this mode for short caption-box copy. The rounded box itself is in-app styling; this tool generates the text inside.",
      previewType: "rounded-box",
      presets: [
        { label: "Bold", category: "bold" },
        { label: "Cool", category: "cool" },
        { label: "Special", category: "special" }
      ],
      showUsernameNote: false,
      showRoundedNote: true,
      placeholder: "POV: you finally posted"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">Important: @username cannot be styled</span>' +
    "Use plain ASCII for your handle. If you want a styled look, apply fonts to your display name or bio instead.";

  const ROUNDED_NOTE =
    '<span class="note-title">Rounded box quick tip</span>' +
    "Use 1 short phrase, high contrast text, and minimal symbols. Keep it punchy so it reads instantly.";

  let currentContext = "display-name";
  let tabsEl, guidanceEl, previewEl, presetsEl, usernameEl, roundedEl, inputEl;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function previewText() {
    const raw = inputEl && inputEl.value ? inputEl.value : "";
    if (raw) return raw;
    return CONTEXTS[currentContext].placeholder;
  }

  function renderGuidance() {
    if (!guidanceEl) return;
    const ctx = CONTEXTS[currentContext];
    let limitHtml = "";
    if (ctx.limit) {
      limitHtml = ' <span class="limit-pill" id="tiktokContextLimit">' + ctx.limit + "-character limit</span>";
    }
    guidanceEl.innerHTML = ctx.guidance + limitHtml;
  }

  function renderPresets() {
    if (!presetsEl) return;
    const ctx = CONTEXTS[currentContext];
    let html = '<span class="presets-label">Suggested style filter</span>';
    for (let i = 0; i < ctx.presets.length; i++) {
      const p = ctx.presets[i];
      html +=
        '<button type="button" class="tiktok-context-preset platform-pill" data-category="' +
        escapeHtml(p.category) +
        '">' +
        escapeHtml(p.label) +
        "</button>";
    }
    presetsEl.innerHTML = html;
  }

  function renderNotes() {
    const ctx = CONTEXTS[currentContext];
    if (usernameEl) {
      if (ctx.showUsernameNote) {
        usernameEl.innerHTML = USERNAME_NOTE;
        usernameEl.classList.add("show");
      } else {
        usernameEl.classList.remove("show");
      }
    }
    if (roundedEl) {
      if (ctx.showRoundedNote) {
        roundedEl.innerHTML = ROUNDED_NOTE;
        roundedEl.classList.add("show");
      } else {
        roundedEl.classList.remove("show");
      }
    }
  }

  function renderPreview() {
    if (!previewEl) return;
    const ctx = CONTEXTS[currentContext];
    const t = escapeHtml(previewText());
    let html;

    switch (ctx.previewType) {
      case "display-name":
        html =
          '<div class="preview-label">Preview · Display name</div>' +
          '<div class="preview-row"><div class="preview-avatar"></div><div><div class="preview-name">' +
          t +
          '</div><div class="preview-meta">@your_username</div></div></div>';
        break;
      case "bio":
        html =
          '<div class="preview-label">Preview · Bio</div>' +
          '<div class="preview-bio">' +
          t +
          "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Preview · Video caption</div>' +
          '<div class="preview-caption">' +
          t +
          "</div>";
        break;
      case "comment":
        html =
          '<div class="preview-label">Preview · Comment</div>' +
          '<div class="preview-row"><div class="preview-avatar small"></div><div><div class="preview-name">you</div><div class="preview-comment">' +
          t +
          "</div></div></div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Preview · @Username (ASCII only)</div>' +
          '<div class="preview-username">@' +
          t +
          "</div>";
        break;
      case "rounded-box":
        html =
          '<div class="preview-label">Preview · Rounded caption box text</div>' +
          '<div class="preview-rounded">' +
          t +
          "</div>";
        break;
      default:
        html = '<div class="preview-bio">' + t + "</div>";
    }

    previewEl.innerHTML = html;
  }

  function updateLimitPill() {
    const ctx = CONTEXTS[currentContext];
    if (!ctx.limit) return;
    const pill = document.getElementById("tiktokContextLimit");
    if (!pill) return;
    const len = inputEl && inputEl.value ? inputEl.value.length : 0;
    pill.classList.toggle("over", len > ctx.limit);
  }

  function setContext(key) {
    if (!CONTEXTS[key]) return;
    currentContext = key;

    if (tabsEl) {
      const tabs = tabsEl.querySelectorAll(".tiktok-context-tab");
      for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle("active", tabs[i].dataset.context === key);
      }
    }

    renderGuidance();
    renderPresets();
    renderNotes();
    renderPreview();
    updateLimitPill();
  }

  function activateCategoryTab(slug) {
    const tabs = document.querySelectorAll(".category-tab");
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      if (t.dataset && t.dataset.category === slug) {
        t.click();
        return true;
      }
    }
    return false;
  }

  function handlePresetClick(presetBtn) {
    const slug = presetBtn.dataset.category;
    if (!slug) return;

    const presets = document.querySelectorAll(".tiktok-context-preset");
    for (let i = 0; i < presets.length; i++) {
      presets[i].classList.remove("active");
    }
    presetBtn.classList.add("active");

    activateCategoryTab(slug);
  }

  function init() {
    const root = document.getElementById("tiktokContext");
    if (!root) return;

    tabsEl = document.getElementById("tiktokContextTabs");
    guidanceEl = document.getElementById("tiktokContextGuidance");
    previewEl = document.getElementById("tiktokContextPreview");
    presetsEl = document.getElementById("tiktokContextPresets");
    usernameEl = document.getElementById("tiktokContextUsername");
    roundedEl = document.getElementById("tiktokContextRounded");
    inputEl = document.getElementById("mainInput");

    if (!tabsEl || !inputEl) return;

    tabsEl.addEventListener("click", function (e) {
      const tab = e.target.closest(".tiktok-context-tab");
      if (!tab || !tab.dataset.context) return;
      setContext(tab.dataset.context);
    });

    if (presetsEl) {
      presetsEl.addEventListener("click", function (e) {
        const btn = e.target.closest(".tiktok-context-preset");
        if (!btn) return;
        handlePresetClick(btn);
      });
    }

    inputEl.addEventListener("input", function () {
      renderPreview();
      updateLimitPill();
    });

    setContext(currentContext);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
