/* ==========================================================================
   UltraTextGen — discord-context.js
   Surface-aware UI layer for the Discord page.

   Reads from #mainInput and switches preview, guidance, presets, and notes
   when the user picks which Discord surface they're targeting. Does not
   modify generator state or registry — just nudges the existing category
   tabs into a sensible default for the chosen surface.
   ========================================================================== */

(function () {
  "use strict";

  /* Configuration: each surface gets its own limit, guidance, presets,
     preview shape, and which side notes to show. */
  const CONTEXTS = {
    "display-name": {
      limit: 32,
      guidance:
        "Cosmetic name shown in DMs and servers. <strong>Different from your @username</strong> — usernames don't accept fancy fonts.",
      previewType: "name",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Cursive", category: "cursive-fonts" },
        { label: "Gothic", category: "gothic-fonts" },
        { label: "Bubble", category: "bubble-fonts" },
        { label: "Italic", category: "italic-fonts" }
      ],
      showNitro: true,
      showMarkdown: false,
      placeholder: "Wumpus"
    },
    "server-nickname": {
      limit: 32,
      guidance:
        "Per-server name. Overrides your display name in that server only. Set via <strong>Edit Server Profile</strong>.",
      previewType: "server-nickname",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Cursive", category: "cursive-fonts" },
        { label: "Gothic", category: "gothic-fonts" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showNitro: false,
      showMarkdown: false,
      placeholder: "Wumpus"
    },
    "bio": {
      limit: 190,
      guidance:
        "Your About Me. Supports Unicode characters and emoji. Only the first line shows in profile popouts.",
      previewType: "bio",
      presets: [
        { label: "Cursive", category: "cursive-fonts" },
        { label: "Italic", category: "italic-fonts" },
        { label: "Bold", category: "bold-fonts" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showNitro: false,
      showMarkdown: false,
      placeholder: "just vibing"
    },
    "chat": {
      limit: null,
      guidance:
        "Unicode fonts work as copied characters — best for emphasis or aesthetic styling. For formatting that stays editable and searchable, use Discord <strong>Markdown</strong> instead.",
      previewType: "chat",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Italic", category: "italic-fonts" },
        { label: "Strikethrough", category: "strikethrough-text" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showNitro: false,
      showMarkdown: true,
      placeholder: "Hello world"
    },
    "channel-name": {
      limit: 100,
      guidance:
        "Channel and category names. Clean styles read best — heavy fonts hurt scanability in the sidebar.",
      previewType: "channel",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Gothic", category: "gothic-fonts" },
        { label: "Bubble", category: "bubble-fonts" },
        { label: "Italic", category: "italic-fonts" }
      ],
      showNitro: false,
      showMarkdown: false,
      placeholder: "announcements"
    },
    "role-name": {
      limit: 100,
      guidance:
        "Role names appear as colored badges next to members. Short, simple styles read best.",
      previewType: "role",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Gothic", category: "gothic-fonts" },
        { label: "Italic", category: "italic-fonts" }
      ],
      showNitro: false,
      showMarkdown: false,
      placeholder: "Moderator"
    }
  };

  const NITRO_NOTE =
    '<span class="note-title">No Nitro needed</span>' +
    "UltraTextGen creates Unicode characters you copy and paste. Discord <strong>Display Name Styles</strong> are a separate Nitro feature for built-in colors and animated effects — they don't affect Unicode text.";

  const MARKDOWN_NOTE =
    '<span class="note-title">Unicode vs Markdown</span>' +
    "Use Markdown for formatting that stays editable: " +
    "<code>**bold**</code>, <code>*italic*</code>, <code>__underline__</code>, " +
    "<code>~~strike~~</code>, <code>||spoiler||</code>, <code># Header</code>, " +
    "<code>&gt; quote</code>, <code>`code`</code>. " +
    "Use Unicode fonts when you want the styling to survive copy-paste anywhere.";

  let currentContext = "display-name";
  let tabsEl, guidanceEl, previewEl, presetsEl, nitroEl, markdownEl, inputEl;

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
        ' <span class="limit-pill" id="discordContextLimit">' +
        ctx.limit +
        "-character limit</span>";
    }
    guidanceEl.innerHTML = ctx.guidance + limitHtml;
  }

  function renderPresets() {
    if (!presetsEl) return;
    const ctx = CONTEXTS[currentContext];
    let html = '<span class="presets-label">Suggested styles</span>';
    for (let i = 0; i < ctx.presets.length; i++) {
      const p = ctx.presets[i];
      html +=
        '<button type="button" class="discord-context-preset" data-category="' +
        escapeHtml(p.category) +
        '">' +
        escapeHtml(p.label) +
        "</button>";
    }
    presetsEl.innerHTML = html;
  }

  function renderNotes() {
    const ctx = CONTEXTS[currentContext];
    if (nitroEl) {
      if (ctx.showNitro) {
        nitroEl.innerHTML = NITRO_NOTE;
        nitroEl.classList.add("show");
      } else {
        nitroEl.classList.remove("show");
      }
    }
    if (markdownEl) {
      if (ctx.showMarkdown) {
        markdownEl.innerHTML = MARKDOWN_NOTE;
        markdownEl.classList.add("show");
      } else {
        markdownEl.classList.remove("show");
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
      case "server-nickname":
        html =
          '<div class="preview-label">Preview · Server nickname</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">in your-server</div>' +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Preview · About Me</div>' +
          '<div class="preview-bio">' + t + "</div>";
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
      case "channel":
        html =
          '<div class="preview-label">Preview · Channel name</div>' +
          '<div class="preview-channel"><span class="hash">#</span>' + t + "</div>";
        break;
      case "role":
        html =
          '<div class="preview-label">Preview · Role badge</div>' +
          '<span class="preview-role"><span class="dot"></span>' + t + "</span>";
        break;
      default:
        html = '<div class="preview-bio">' + t + "</div>";
    }

    previewEl.innerHTML = html;
  }

  function updateLimitPill() {
    const ctx = CONTEXTS[currentContext];
    if (!ctx.limit) return;
    const pill = document.getElementById("discordContextLimit");
    if (!pill) return;
    const len = inputEl && inputEl.value ? inputEl.value.length : 0;
    pill.classList.toggle("over", len > ctx.limit);
  }

  /* ----- behavior ----- */

  function setContext(key) {
    if (!CONTEXTS[key]) return;
    currentContext = key;

    if (tabsEl) {
      const tabs = tabsEl.querySelectorAll(".discord-context-tab");
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

    const presets = document.querySelectorAll(".discord-context-preset");
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
    const root = document.getElementById("discordContext");
    if (!root) return;

    tabsEl = document.getElementById("discordContextTabs");
    guidanceEl = document.getElementById("discordContextGuidance");
    previewEl = document.getElementById("discordContextPreview");
    presetsEl = document.getElementById("discordContextPresets");
    nitroEl = document.getElementById("discordContextNitro");
    markdownEl = document.getElementById("discordContextMarkdown");
    inputEl = document.getElementById("mainInput");

    if (!tabsEl || !inputEl) return;

    tabsEl.addEventListener("click", function (e) {
      const tab = e.target.closest(".discord-context-tab");
      if (!tab || !tab.dataset.context) return;
      setContext(tab.dataset.context);
    });

    if (presetsEl) {
      presetsEl.addEventListener("click", function (e) {
        const btn = e.target.closest(".discord-context-preset");
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
