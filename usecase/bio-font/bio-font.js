/* ==========================================================================
   Bio Font Generator — page controller
   Enhances the shared generator (script.js) with:
   - platform selector → platform-aware character counter + compatibility note
   - a live profile preview so users see how the bio fits before saving
   - font-style (mood) filtering via window.STYLE_MAP / window.UTG_FONT_SLUGS
   - click-to-copy Symbols & Dividers and ready-made Bio Templates
   Follows the repo IIFE pattern; no frameworks, no ES modules.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ----------------------------------------------------------------------
     DATA: platforms (bio character limits + compatibility guidance)
     Sourced from each platform's profile/bio field limits.
     ---------------------------------------------------------------------- */
  const PLATFORMS = {
    all:       { label: "All platforms", limit: 500, note: "Unicode fonts and symbols work anywhere text is supported — bios, usernames, captions and more. Always paste-test in the field before saving." },
    instagram: { label: "Instagram bio",  limit: 150, note: "Instagram bios support most Unicode fonts and emoji. A few characters are blocked in usernames specifically — paste-test before saving." },
    tiktok:    { label: "TikTok bio",      limit: 80,  note: "TikTok bios render Unicode fonts well. The field is short — only 80 characters — so style a key phrase, not everything." },
    discord:   { label: "Discord About Me", limit: 190, note: "Discord “About Me” supports full Unicode — styled fonts, symbols and emoji all work in bios, nicknames and server names." },
    x:         { label: "X (Twitter) bio", limit: 160, note: "X supports Unicode in both your bio and display name. Bold or script styles help a personal brand stand out." },
    tinder:    { label: "Tinder About me", limit: 500, note: "Tinder has no native font option, so Unicode is the only way to style your profile. Style your name or one key line so it stays readable." }
  };

  /* ----------------------------------------------------------------------
     DATA: Symbols & dividers (click-to-copy) — what “aesthetic” searchers
     actually assemble alongside fonts.
     ---------------------------------------------------------------------- */
  const SYMBOL_TABS = {
    hearts:   { label: "♡ Hearts",  items: ["♡", "♥", "❤︎", "❥", "❣", "ღ", "♡̆", "❦", "❧", "💗", "💖", "🤍", "🩷", "💞", "💝"] },
    stars:    { label: "✦ Stars",   items: ["✦", "✧", "⋆", "✩", "✯", "✰", "✵", "✷", "✸", "✹", "✻", "❂", "⁑", "⁕", "✨"] },
    celestial:{ label: "☾ Celestial", items: ["☾", "☽", "★", "☆", "☀", "✦", "✷", "⊹", "⟡", "⋆｡°✩", "☄", "✺", "❈", "✶", "✴"] },
    cute:     { label: "❀ Cute",    items: ["❀", "✿", "❁", "✾", "⚘", "♧", "♤", "ꕥ", "꒰꒱", "ʚɞ", "𖧧", "𖦹", "ꕤ", "⌗", "ᯓ"] },
    dividers: { label: "— Dividers", items: [
      "─────────",
      "━━━━━━━━━",
      "·  ·  ·  ·  ·",
      "✦ ·············· ✦",
      "⋆｡°✩ ────── ✩°｡⋆",
      "˚｡⋆｡˚☽˚｡⋆｡˚",
      "꒰ ꒱",
      "♡ ⸝⸝ ♡ ⸝⸝ ♡",
      "❀ ────── ❀",
      "❦ ────── ❦",
      "·˚ ༘ ⋆｡˚",
      "▸ ◂ ▸ ◂ ▸ ◂"
    ] }
  };

  /* ----------------------------------------------------------------------
     DATA: ready-made bio templates ({name} is swapped for the typed text)
     ---------------------------------------------------------------------- */
  const TEMPLATES = [
    "✦ {name} ✦ · dreamer · creator ·",
    "🌙 {name} ✦ just vibes ✦",
    "✧⁕·˙˚ {name} ˚˙·⁕✧",
    "♡ {name} ♡ | living my best life",
    "『 {name} 』 ⚔ grind · win · repeat",
    "⋆ {name} ⋆ — keep it simple",
    "☾ {name} · coffee · chaos · ✨",
    "❀ {name} ❀ · she/her · 🌸"
  ];

  /* ----------------------------------------------------------------------
     STATE + ELEMENTS
     ---------------------------------------------------------------------- */
  let currentPlatform = "all";

  const el = {
    mainInput: $("#mainInput"),
    charCount: $("#charCount"),
    charLimit: $("#charLimit"),
    counter: $("#bfCounter"),
    compat: $("#bfCompat"),
    compatText: $("#bfCompatText"),
    previewBio: $("#bfPreviewBio"),
    previewName: $("#bfPreviewName"),
    previewAvatar: $("#bfPreviewAvatar"),
    previewPlatform: $("#bfPreviewPlatform"),
    platformRow: $("#bfPlatformRow"),
    symbolTabs: $("#bfSymbolTabs"),
    symbolGrid: $("#bfSymbolGrid"),
    templateGrid: $("#bfTemplateGrid")
  };

  function inputValue() {
    return el.mainInput ? el.mainInput.value : "";
  }

  function firstName() {
    const v = inputValue().trim();
    if (!v) return "";
    return v.split(/\s+/)[0];
  }

  /* ----------------------------------------------------------------------
     Platform-aware counter + compatibility + preview sync
     ---------------------------------------------------------------------- */
  function syncPlatform() {
    const p = PLATFORMS[currentPlatform] || PLATFORMS.all;
    const len = inputValue().length;

    if (el.charLimit) el.charLimit.textContent = String(p.limit);
    if (el.counter) el.counter.classList.toggle("over", len > p.limit);
    if (el.compatText) el.compatText.textContent = p.note;
    if (el.previewPlatform) el.previewPlatform.textContent = p.label;

    syncPreview();
  }

  function syncPreview() {
    const v = inputValue();
    if (el.previewBio) {
      el.previewBio.textContent = v || "Your styled bio will appear here as you type…";
      el.previewBio.classList.toggle("placeholder", !v);
    }
    const name = firstName();
    if (el.previewName) el.previewName.textContent = name || "your_handle";
    if (el.previewAvatar) el.previewAvatar.textContent = (name || "U").charAt(0).toUpperCase();
  }

  /* ----------------------------------------------------------------------
     Font-style (mood) filtering — drives the shared #resultsGrid
     ---------------------------------------------------------------------- */
  function bindMoodTabs() {
    const map = window.STYLE_MAP || null;
    const moodTabs = $$("#moodTabs [data-mood]");
    moodTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        moodTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const mood = tab.dataset.mood;
        if (map && map[mood]) window.UTG_FONT_SLUGS = map[mood];
        // Trigger script.js re-render
        if (el.mainInput) el.mainInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }

  /* ----------------------------------------------------------------------
     Platform tabs
     ---------------------------------------------------------------------- */
  function bindPlatformTabs() {
    if (!el.platformRow) return;
    $$(".bf-platform-tab", el.platformRow).forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".bf-platform-tab", el.platformRow).forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentPlatform = tab.dataset.platform || "all";
        syncPlatform();
      });
    });
  }

  /* ----------------------------------------------------------------------
     Copy helper (shared visual + analytics behavior)
     ---------------------------------------------------------------------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "copy_text", copy_method: "button" });
      return true;
    } catch (err) {
      console.error("Copy failed:", err);
      return false;
    }
  }

  /* ----------------------------------------------------------------------
     Symbols & dividers
     ---------------------------------------------------------------------- */
  function renderSymbols(tabKey) {
    if (!el.symbolGrid) return;
    const tab = SYMBOL_TABS[tabKey] || SYMBOL_TABS.hearts;
    el.symbolGrid.innerHTML = "";
    tab.items.forEach((sym) => {
      const chip = document.createElement("span");
      chip.className = "bf-chip";
      chip.textContent = sym;
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      chip.setAttribute("aria-label", "Copy " + sym);
      el.symbolGrid.appendChild(chip);
    });
  }

  function bindSymbols() {
    if (el.symbolTabs) {
      $$("[data-symbol-tab]", el.symbolTabs).forEach((tab) => {
        tab.addEventListener("click", () => {
          $$("[data-symbol-tab]", el.symbolTabs).forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          renderSymbols(tab.dataset.symbolTab);
        });
      });
    }
    if (el.symbolGrid) {
      const handleChip = async (chip) => {
        const ok = await copyText(chip.textContent);
        if (!ok) return;
        chip.classList.add("copied");
        setTimeout(() => chip.classList.remove("copied"), 900);
      };
      el.symbolGrid.addEventListener("click", (e) => {
        const chip = e.target.closest(".bf-chip");
        if (chip) handleChip(chip);
      });
      el.symbolGrid.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const chip = e.target.closest(".bf-chip");
        if (chip) { e.preventDefault(); handleChip(chip); }
      });
    }
  }

  /* ----------------------------------------------------------------------
     Bio templates ({name} swapped for the first word of the input)
     Rendered with .copy-btn[data-text] so the global script.js copy
     handler (and analytics) work without duplication.
     ---------------------------------------------------------------------- */
  function escapeAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderTemplates() {
    if (!el.templateGrid) return;
    const name = firstName() || "name";
    el.templateGrid.innerHTML = TEMPLATES.map((tpl) => {
      const filled = tpl.replace(/\{name\}/g, name);
      return (
        '<div class="bf-template">' +
          '<div class="bf-template-text">' + escapeHtml(filled) + "</div>" +
          '<button class="copy-btn" data-text="' + escapeAttr(filled) + '" title="Copy to clipboard">Copy</button>' +
        "</div>"
      );
    }).join("");
  }

  /* ----------------------------------------------------------------------
     INIT
     ---------------------------------------------------------------------- */
  function init() {
    bindPlatformTabs();
    bindMoodTabs();
    bindSymbols();
    renderSymbols("hearts");
    renderTemplates();
    syncPlatform();

    if (el.mainInput) {
      el.mainInput.addEventListener("input", () => {
        syncPlatform();
        renderTemplates();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
