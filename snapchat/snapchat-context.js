/* ==========================================================================
   UltraTextGen — snapchat-context.js
   Surface-aware UI layer for the Snapchat page.

   Reads from #mainInput and switches preview, guidance, presets, and notes
   when the user picks which Snapchat surface they're targeting. Does not
   modify generator state or registry — just nudges the existing category
   tabs into a sensible default for the chosen surface.
   ========================================================================== */

(function () {
  "use strict";

  /* Configuration: each surface gets its own limit, guidance, presets,
     preview shape, and which side notes to show. */
  const CONTEXTS = {
    "display-name": {
      limit: 30,
      guidance:
        "Cosmetic name your friends see everywhere on Snapchat. <strong>Different from your @username</strong> — usernames don't accept fancy fonts, only your Display Name does.",
      previewType: "name",
      presets: [
        { label: "Cursive", category: "cursive-fonts" },
        { label: "Small Caps", category: "small-caps" },
        { label: "Gothic", category: "gothic-fonts" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Sarah"
    },
    "username": {
      limit: 15,
      guidance:
        "Your unique @handle. <strong>Plain ASCII only — no Unicode fonts render here.</strong> Letters, numbers, hyphens, underscores, and periods; 3–15 characters, must start with a letter and end with a letter or number.",
      previewType: "username",
      presets: [],
      showUsernameNote: true,
      showPublicNote: false,
      placeholder: "sarah.styles"
    },
    "story-caption": {
      limit: null,
      guidance:
        "Paste into a Snap or Story after tapping the <strong>T</strong> icon. Full Unicode renders correctly, alongside Snapchat's own built-in font carousel (Classic, Strong, Typewriter, Neon, and more).",
      previewType: "caption",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Small Caps", category: "small-caps" },
        { label: "Bubble", category: "bubble-fonts" },
        { label: "Cursive", category: "cursive-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Golden hour"
    },
    "chat": {
      limit: null,
      guidance:
        "Unicode fonts work as pasted characters in DMs and group chats. Snapchat has <strong>no native bold or italic toggle in chat</strong> — this is the only way to get styled text there.",
      previewType: "chat",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Italic", category: "italic-fonts" },
        { label: "Strikethrough", category: "strikethrough-text" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Hey there!"
    },
    "public-bio": {
      limit: null,
      guidance:
        "Your Public Profile name and bio, visible to anyone who finds your Public Profile. Snapchat recommends <strong>clear, legible</strong> styling here over heavy decoration.",
      previewType: "bio",
      presets: [
        { label: "Small Caps", category: "small-caps" },
        { label: "Italic", category: "italic-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: true,
      placeholder: "living my best life"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">@Username can\'t be styled</span>' +
    "Snapchat's @username field only accepts plain ASCII: letters, numbers, hyphens ( - ), underscores ( _ ), and periods ( . ). Any Unicode styled font — bold, cursive, gothic, bubble — will fail to save here. Use this generator for username <em>ideas</em>, then type the plain, unstyled version into the @username field. Save your styled result for your <strong>Display Name</strong> instead.";

  const PUBLIC_NOTE =
    '<span class="note-title">Public Profile discoverability</span>' +
    "Snapchat recommends keeping your Public Profile display name and bio clear and legible. Using excessive fancy text or emojis here may reduce your discoverability in Snapchat search results.";

  let currentContext = "display-name";
  let tabsEl, guidanceEl, previewEl, presetsEl, usernameEl, publicEl, inputEl;

  /* ----- helpers ----- */

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

  /* ----- renderers ----- */

  function renderGuidance() {
    if (!guidanceEl) return;
    const ctx = CONTEXTS[currentContext];
    let limitHtml = "";
    if (ctx.limit) {
      limitHtml =
        ' <span class="limit-pill" id="snapchatContextLimit">' +
        ctx.limit +
        "-character limit</span>";
    }
    guidanceEl.innerHTML = ctx.guidance + limitHtml;
  }

  function renderPresets() {
    if (!presetsEl) return;
    const ctx = CONTEXTS[currentContext];
    if (!ctx.presets || !ctx.presets.length) {
      presetsEl.innerHTML = "";
      return;
    }
    let html = '<span class="presets-label">Suggested styles</span>';
    for (let i = 0; i < ctx.presets.length; i++) {
      const p = ctx.presets[i];
      html +=
        '<button type="button" class="snapchat-context-preset platform-pill" data-category="' +
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
    if (publicEl) {
      if (ctx.showPublicNote) {
        publicEl.innerHTML = PUBLIC_NOTE;
        publicEl.classList.add("show");
      } else {
        publicEl.classList.remove("show");
      }
    }
  }

  function renderPreview() {
    if (!previewEl) return;
    const ctx = CONTEXTS[currentContext];
    const t = escapeHtml(previewText());
    let html;

    switch (ctx.previewType) {
      case "name":
        html =
          '<div class="preview-label">Preview · Display name</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">@your_username</div>' +
          "</div>" +
          "</div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Preview · @Username (ASCII only)</div>' +
          '<div class="preview-username">@' + t + "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Preview · Story / Snap caption</div>' +
          '<div class="preview-caption">' + t + "</div>";
        break;
      case "chat":
        html =
          '<div class="preview-label">Preview · Chat message</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar small"></div>' +
          "<div>" +
          '<div class="preview-name">You <span class="preview-meta" style="margin-left:4px;">today</span></div>' +
          '<div class="preview-message">' + t + "</div>" +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Preview · Public Profile bio</div>' +
          '<div class="preview-bio">' + t + "</div>";
        break;
      default:
        html = '<div class="preview-bio">' + t + "</div>";
    }

    previewEl.innerHTML = html;
  }

  function updateLimitPill() {
    const ctx = CONTEXTS[currentContext];
    if (!ctx.limit) return;
    const pill = document.getElementById("snapchatContextLimit");
    if (!pill) return;
    const len = inputEl && inputEl.value ? inputEl.value.length : 0;
    pill.classList.toggle("over", len > ctx.limit);
  }

  /* ----- behavior ----- */

  function setContext(key) {
    if (!CONTEXTS[key]) return;
    currentContext = key;

    if (tabsEl) {
      const tabs = tabsEl.querySelectorAll(".snapchat-context-tab");
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

    const presets = document.querySelectorAll(".snapchat-context-preset");
    for (let i = 0; i < presets.length; i++) {
      presets[i].classList.remove("active");
    }
    presetBtn.classList.add("active");

    /* Filter results in place if the tab exists; otherwise navigate to the
       full category page. This preserves user flow on the generator. */
    if (!activateCategoryTab(slug)) {
      window.location.href = "/category/" + slug + "/";
    }
  }

  /* ----- init ----- */

  function init() {
    const root = document.getElementById("snapchatContext");
    if (!root) return;

    tabsEl = document.getElementById("snapchatContextTabs");
    guidanceEl = document.getElementById("snapchatContextGuidance");
    previewEl = document.getElementById("snapchatContextPreview");
    presetsEl = document.getElementById("snapchatContextPresets");
    usernameEl = document.getElementById("snapchatContextUsername");
    publicEl = document.getElementById("snapchatContextPublic");
    inputEl = document.getElementById("mainInput");

    if (!tabsEl || !inputEl) return;

    tabsEl.addEventListener("click", function (e) {
      const tab = e.target.closest(".snapchat-context-tab");
      if (!tab || !tab.dataset.context) return;
      setContext(tab.dataset.context);
    });

    if (presetsEl) {
      presetsEl.addEventListener("click", function (e) {
        const btn = e.target.closest(".snapchat-context-preset");
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
