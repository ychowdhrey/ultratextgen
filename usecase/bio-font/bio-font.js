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
    tinder:    { label: "Tinder About me", limit: 500, note: "Tinder has no native font option, so Unicode is the only way to style your profile. Style your name or one key line so it stays readable." },
    whatsapp:  { label: "WhatsApp About", limit: 139, note: "WhatsApp's About field supports Unicode fonts and emoji. It's short — 139 characters — so style your name or one short line, not a paragraph." },
    facebook:  { label: "Facebook bio",   limit: 101, note: "Facebook's personal-profile Intro/bio is tight — 101 characters. Style a short phrase or your name; save longer text for a post instead." }
  };

  /* ----------------------------------------------------------------------
     DATA: Symbols & dividers (click-to-copy) — what “aesthetic” searchers
     actually assemble alongside fonts.
     ---------------------------------------------------------------------- */
  const SYMBOL_TABS = {
    hearts:   { label: "♡ Hearts",  items: ["♡", "♥", "❤", "❥", "❣", "ღ", "❦", "❧", "♥︎", "💗", "💖", "🤍", "💜", "💞", "💝"] },
    stars:    { label: "✦ Stars",   items: ["✦", "✧", "⋆", "✩", "✯", "✰", "✵", "✷", "✸", "✹", "✻", "❂", "⁑", "⁕", "✨"] },
    celestial:{ label: "☾ Celestial", items: ["☾", "☽", "★", "☆", "☀", "✦", "✷", "⊹", "⟡", "⋆｡°✩", "☄", "✺", "❈", "✶", "✴"] },
    cute:     { label: "❀ Cute",    items: ["❀", "✿", "❁", "✾", "⚘", "♧", "♤", "ꕥ", "꒰꒱", "ʚɞ", "𖧧", "𖦹", "ꕤ", "⌗", "ᯓ"] },
    dividers: { label: "— Dividers", items: [
      "·",
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
     A page can override this list before bio-font.js loads by setting
     window.UTG_BIO_TEMPLATES (same merge-over-defaults convention as
     window.UTG_DECORATIONS) — used by platform-locked spoke pages that
     want niche-matched examples instead of the generic default set.
     ---------------------------------------------------------------------- */
  const DEFAULT_TEMPLATES = [
    "✦ {name} ✦ · dreamer · creator ·",
    "🌙 {name} ✦ just vibes ✦",
    "✧⁕·˙˚ {name} ˚˙·⁕✧",
    "♡ {name} ♡ | living my best life",
    "『 {name} 』 ⚔ grind · win · repeat",
    "⋆ {name} ⋆ — keep it simple",
    "☾ {name} · coffee · chaos · ✨",
    "❀ {name} ❀ · she/her · 🌸",
    // Multi-line block templates. Every entry above is a single line, but a
    // real Instagram/TikTok bio is 3–4 stacked lines, and the layout people
    // actually search for ("bio template", "bio layout") is a bordered block
    // — the one shape this list was missing. Newlines paste through fine on
    // Instagram, TikTok, Discord and Telegram; X/Twitter collapses them, so
    // the platform picker's own limit warning still applies.
    "╭┈┈┈┈┈┈┈┈┈┈╮\n  ✦ {name} ✦\n  ˚ · dreamer\n  ˚ · creator\n╰┈┈┈┈┈┈┈┈┈┈╯",
    "┌─────────────┐\n   {name}\n   ✧ 18 · she/her\n   ✧ dm open\n└─────────────┘",
    "· · · · · · · · · ·\n   ♡ {name} ♡\n   ⋆ living slow\n   ⋆ coffee first\n· · · · · · · · · ·",
    "◜◝◜◝◜◝◜◝◜◝\n  ☾ {name}\n  ✦ new post ↓\n  ✦ link below\n◟◞◟◞◟◞◟◞◟◞",
    "▸ {name}\n▸ ⚔ rank grind\n▸ 🎮 daily uploads\n▸ ↓ join the squad",
    "❀ ────────── ❀\n    {name}\n  ˚ · art · 🌸\n  ˚ · commissions open\n❀ ────────── ❀"
  ];

  /* ----------------------------------------------------------------------
     STATE + ELEMENTS
     currentPlatform reads whichever .bf-platform-tab already carries
     .active in the markup, so a spoke page can lock the picker to one
     platform (e.g. Instagram) just by marking that tab active in HTML —
     no separate JS config needed. Falls back to "all" (the hub page's
     default markup) when no tab is pre-marked.
     ---------------------------------------------------------------------- */
  const initialTab = document.querySelector(".bf-platform-tab.active[data-platform]");
  let currentPlatform = (initialTab && initialTab.dataset.platform) || "all";

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
  function platformData() {
    // A page can override label/note text per platform (translated locale
    // pages) before bio-font.js loads via window.UTG_BIO_PLATFORMS — same
    // merge-over-defaults convention as window.UTG_DECORATIONS. Only limit
    // numbers live in PLATFORMS; a locale only needs to supply label/note.
    const overrides = window.UTG_BIO_PLATFORMS || {};
    const merged = {};
    Object.keys(PLATFORMS).forEach((key) => {
      merged[key] = Object.assign({}, PLATFORMS[key], overrides[key]);
    });
    return merged;
  }

  function syncPlatform() {
    const p = platformData()[currentPlatform] || platformData().all;
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
    // \n is encoded explicitly rather than left literal: a raw newline inside
    // an attribute value survives most parsers, but &#10; is the only form
    // guaranteed to round-trip, and the multi-line block templates below
    // depend on the copied text matching the previewed text exactly.
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "&#10;");
  }
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderTemplates() {
    if (!el.templateGrid) return;
    const name = firstName() || "name";
    const templates = window.UTG_BIO_TEMPLATES || DEFAULT_TEMPLATES;
    el.templateGrid.innerHTML = templates.map((tpl) => {
      const filled = tpl.replace(/\{name\}/g, name);
      // Multi-line blocks need the newlines preserved on screen (the CSS
      // class below) and carried intact through the copy button's data
      // attribute, so what gets pasted matches what was previewed.
      const multi = filled.indexOf("\n") !== -1;
      return (
        '<div class="bf-template' + (multi ? " bf-template-block" : "") + '">' +
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
