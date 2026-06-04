(function () {
  "use strict";

  const CONTEXTS = {
    post: {
      limit: null,
      guidance: "Default for status updates and feed posts. Style only the hook line or key phrase.",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Cursive", category: "cursive-fonts" },
        { label: "Italic", category: "italic-fonts" },
        { label: "Small-caps style", category: "bold-fonts", safeSlugs: ["ultra-bold-serif"] }
      ],
      placeholder: "Big launch tomorrow — details below",
      safeMode: false
    },
    "profile-name": {
      limit: 50,
      guidance: "Name field is stricter than posts. Use cleaner styles and avoid symbols for higher approval.",
      presets: [
        { label: "Clean bold", category: "bold-fonts", safeSlugs: ["ultra-bold", "ultra-bold-serif"] },
        { label: "Light italic", category: "italic-fonts", safeSlugs: ["ultra-italic", "ultra-italic-serif"] },
        { label: "Script (test first)", category: "cursive-fonts", safeSlugs: ["ultra-script"] }
      ],
      placeholder: "Alex Morgan",
      safeMode: true,
      safeSlugs: [
        "ultra-bold",
        "ultra-bold-serif",
        "ultra-italic",
        "ultra-italic-serif",
        "ultra-script"
      ]
    },
    bio: {
      limit: 101,
      guidance: "Use short, scannable lines for your About section. Keep your primary keywords plain text.",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Cursive", category: "cursive-fonts" },
        { label: "Italic", category: "italic-fonts" },
        { label: "Bubble accent", category: "bubble-fonts" }
      ],
      placeholder: "Builder · Coffee lover · Travel notes",
      safeMode: false
    },
    comment: {
      limit: null,
      guidance: "Comments perform best with short emphasis. Bold and strikethrough are most readable.",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Strikethrough", category: "strikethrough-text" },
        { label: "Italic", category: "italic-fonts" },
        { label: "Cursive", category: "cursive-fonts" }
      ],
      placeholder: "Love this update",
      safeMode: false
    }
  };

  const SAFE_MODE_NOTE =
    '<span class="note-title">Rejection-safe name mode</span>' +
    'This mode keeps the result list to cleaner Unicode styles and disables decorations. ' +
    'If Facebook still rejects a name, remove accents/symbols and avoid mixing character styles in the same word.';

  const STANDARD_NOTE =
    '<span class="note-title">Accessibility reminder</span>' +
    'Keep names, core keywords, and critical information in plain text where possible. ' +
    'Use styled characters as light emphasis, not full-paragraph formatting.';

  let currentContext = "post";
  let tabsEl, guidanceEl, presetsEl, noteEl, inputEl, decorationSectionEl;

  function setCategoryBySlug(slug) {
    const tabs = document.querySelectorAll(".category-tab");
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (tab.dataset && tab.dataset.category === slug) {
        tab.click();
        return true;
      }
    }
    return false;
  }

  function setSafeMode(active, safeSlugs) {
    if (active) {
      window.UTG_FONT_SLUGS = Array.isArray(safeSlugs) ? safeSlugs : null;
      if (decorationSectionEl) {
        decorationSectionEl.classList.add("is-disabled");
      }
      const clearBtn = document.querySelector(".clear-decoration");
      if (clearBtn) clearBtn.click();
    } else {
      window.UTG_FONT_SLUGS = null;
      if (decorationSectionEl) {
        decorationSectionEl.classList.remove("is-disabled");
      }
    }

    if (typeof window.UTG_RENDER_RESULTS === "function") {
      window.UTG_RENDER_RESULTS();
    }
  }

  function renderGuidance() {
    if (!guidanceEl) return;
    const ctx = CONTEXTS[currentContext];
    let limitHtml = "";
    if (ctx.limit) {
      const len = inputEl && inputEl.value ? inputEl.value.length : 0;
      const overClass = len > ctx.limit ? " over" : "";
      limitHtml = ' <span class="limit-pill' + overClass + '">' + ctx.limit + '-character target</span>';
    }
    guidanceEl.innerHTML = ctx.guidance + limitHtml;
  }

  function renderPresets() {
    if (!presetsEl) return;
    const ctx = CONTEXTS[currentContext];
    let html = '<span class="presets-label">Style presets</span>';
    for (let i = 0; i < ctx.presets.length; i++) {
      const p = ctx.presets[i];
      html += '<button type="button" class="facebook-context-preset platform-pill" data-category="' + p.category + '" data-preset-index="' + i + '">' + p.label + '</button>';
    }
    presetsEl.innerHTML = html;
  }

  function renderNote() {
    if (!noteEl) return;
    const safe = CONTEXTS[currentContext].safeMode;
    noteEl.innerHTML = safe ? SAFE_MODE_NOTE : STANDARD_NOTE;
    noteEl.classList.add("show");
    noteEl.classList.toggle("safe", safe);
  }

  function setContext(key) {
    if (!CONTEXTS[key]) return;
    currentContext = key;

    const tabs = tabsEl ? tabsEl.querySelectorAll(".facebook-context-tab") : [];
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle("active", tabs[i].dataset.context === key);
    }

    if (inputEl) {
      inputEl.placeholder = CONTEXTS[key].placeholder;
    }

    setSafeMode(!!CONTEXTS[key].safeMode, CONTEXTS[key].safeSlugs);
    renderGuidance();
    renderPresets();
    renderNote();
  }

  function handlePresetClick(btn) {
    const slug = btn.dataset.category;
    if (!slug) return;

    const presetIndex = Number(btn.dataset.presetIndex || "0");
    const preset = CONTEXTS[currentContext].presets[presetIndex];

    const all = document.querySelectorAll(".facebook-context-preset");
    for (let i = 0; i < all.length; i++) {
      all[i].classList.remove("active");
    }
    btn.classList.add("active");

    if (preset && Array.isArray(preset.safeSlugs) && preset.safeSlugs.length) {
      window.UTG_FONT_SLUGS = preset.safeSlugs;
      if (typeof window.UTG_RENDER_RESULTS === "function") {
        window.UTG_RENDER_RESULTS();
      }
    } else {
      setSafeMode(!!CONTEXTS[currentContext].safeMode, CONTEXTS[currentContext].safeSlugs);
      if (!setCategoryBySlug(slug)) {
        window.location.href = "/category/" + slug + "/";
      }
    }
  }

  function init() {
    const root = document.getElementById("facebookContext");
    if (!root) return;

    tabsEl = document.getElementById("facebookContextTabs");
    guidanceEl = document.getElementById("facebookContextGuidance");
    presetsEl = document.getElementById("facebookContextPresets");
    noteEl = document.getElementById("facebookContextNote");
    inputEl = document.getElementById("mainInput");
    decorationSectionEl = document.getElementById("facebookDecorationSection");

    if (!tabsEl || !inputEl) return;

    tabsEl.addEventListener("click", function (e) {
      const tab = e.target.closest(".facebook-context-tab");
      if (!tab || !tab.dataset.context) return;
      setContext(tab.dataset.context);
    });

    presetsEl.addEventListener("click", function (e) {
      const btn = e.target.closest(".facebook-context-preset");
      if (!btn) return;
      handlePresetClick(btn);
    });

    inputEl.addEventListener("input", renderGuidance);

    setContext(currentContext);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
