/* ==========================================================================
   UltraTextGen — script.js (UI + DOM)
   Requires:
   1) styles.js (window.textStyles, window.UI_CATEGORIES, etc.)
   2) renderer.js (window.UltraTextGenRender)
   ========================================================================== */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const stylesRegistry = window.textStyles || {};
  const Render = window.UltraTextGenRender;

  if (!Render || typeof Render.renderAny !== "function") {
    console.error("renderer.js is missing or UltraTextGenRender.renderAny is not available.");
  }
  if (!stylesRegistry || Object.keys(stylesRegistry).length === 0) {
    console.error("styles.js is missing or window.textStyles is empty.");
  }

 /* ===================
   DATA: Decorations
   =================== */
const decorations = window.UTG_DECORATIONS || {
   symbols: [
    { text: "★ text ★", prefix: "★ ", suffix: " ★" },
    { text: "☆ text ☆", prefix: "☆ ", suffix: " ☆" },
    { text: "✦ text ✦", prefix: "✦ ", suffix: " ✦" },
    { text: "✧ text ✧", prefix: "✧ ", suffix: " ✧" },
    { text: "✫ text ✫", prefix: "✫ ", suffix: " ✫" },
    { text: "✭ text ✭", prefix: "✭ ", suffix: " ✭" },
    { text: "✮ text ✮", prefix: "✮ ", suffix: " ✮" },
    { text: "✯ text ✯", prefix: "✯ ", suffix: " ✯" },
    { text: "♥ text ♥", prefix: "♥ ", suffix: " ♥" },
    { text: "♠ text ♠", prefix: "♠ ", suffix: " ♠" },
    { text: "♣ text ♣", prefix: "♣ ", suffix: " ♣" },
    { text: "♦ text ♦", prefix: "♦ ", suffix: " ♦" },
    { text: "♡ text ♡", prefix: "♡ ", suffix: " ♡" },
    { text: "❣ text ❣", prefix: "❣ ", suffix: " ❣" },
    { text: "✿ text ✿", prefix: "✿ ", suffix: " ✿" },
    { text: "❂ text ❂", prefix: "❂ ", suffix: " ❂" },
    { text: "❄ text ❄", prefix: "❄ ", suffix: " ❄" },
    { text: "❆ text ❆", prefix: "❆ ", suffix: " ❆" },
    { text: "☀ text ☀", prefix: "☀ ", suffix: " ☀" },
    { text: "☾ text ☾", prefix: "☾ ", suffix: " ☾" },
    { text: "⚜ text ⚜", prefix: "⚜ ", suffix: " ⚜" },
    { text: "⚓ text ⚓", prefix: "⚓ ", suffix: " ⚓" },
    { text: "♪ text ♪", prefix: "♪ ", suffix: " ♪" },
    { text: "♫ text ♫", prefix: "♫ ", suffix: " ♫" },
    { text: "⚘ text ⚘", prefix: "⚘ ", suffix: " ⚘" }
  ],
   frames: [
    { text: "( text )", prefix: "( ", suffix: " )" },
    { text: "[ text ]", prefix: "[ ", suffix: " ]" },
    { text: "{ text }", prefix: "{ ", suffix: " }" },
    { text: "< text >", prefix: "< ", suffix: " >" },
    { text: "« text »", prefix: "« ", suffix: " »" },
    { text: "‹ text ›", prefix: "‹ ", suffix: " ›" },
    { text: "（ text ）", prefix: "（ ", suffix: " ）" },
    { text: "［ text ］", prefix: "［ ", suffix: " ］" },
    { text: "｛ text ｝", prefix: "｛ ", suffix: " ｝" },
    { text: "〔 text 〕", prefix: "〔 ", suffix: " 〕" },
    { text: "【 text 】", prefix: "【 ", suffix: " 】" },
    { text: "「 text 」", prefix: "「 ", suffix: " 」" },
    { text: "『 text 』", prefix: "『 ", suffix: " 』" },
    { text: "〖 text 〗", prefix: "〖 ", suffix: " 〗" },
    { text: "〘 text 〙", prefix: "〘 ", suffix: " 〙" },
    { text: "〚 text 〛", prefix: "〚 ", suffix: " 〛" },
    { text: "⟨ text ⟩", prefix: "⟨ ", suffix: " ⟩" },
    { text: "⟪ text ⟫", prefix: "⟪ ", suffix: " ⟫" },
    { text: "⟮ text ⟯", prefix: "⟮ ", suffix: " ⟯" },
    { text: "⸨ text ⸩", prefix: "⸨ ", suffix: " ⸩" }
  ],
   dividers: [
    { text: "═══ text ═══", prefix: "═══ ", suffix: " ═══" },
    { text: "━━━ text ━━━", prefix: "━━━ ", suffix: " ━━━" },
    { text: "─── text ───", prefix: "─── ", suffix: " ───" },
    { text: "••• text •••", prefix: "••• ", suffix: " •••" },
    { text: "··· text ···", prefix: "··· ", suffix: " ···" },
    { text: "— text —", prefix: "— ", suffix: " —" },
    { text: "≡ text ≡", prefix: "≡ ", suffix: " ≡" },
    { text: "✥ text ✥", prefix: "✥ ", suffix: " ✥" },
    { text: "❧ text ❧", prefix: "❧ ", suffix: " ❧" },
    { text: "༒ text ༒", prefix: "༒ ", suffix: " ༒" },
    { text: "〰 text 〰", prefix: "〰 ", suffix: " 〰" },
    { text: "❨ text ❩", prefix: "❨ ", suffix: " ❩" },
    { text: "❪ text ❫", prefix: "❪ ", suffix: " ❫" },
    { text: "❴ text ❵", prefix: "❴ ", suffix: " ❵" },
    { text: "❬ text ❭", prefix: "❬ ", suffix: " ❭" },
    { text: "❮ text ❯", prefix: "❮ ", suffix: " ❯" },
    { text: "❰ text ❱", prefix: "❰ ", suffix: " ❱" },
    { text: "❲ text ❳", prefix: "❲ ", suffix: " ❳" },
    { text: "【 text 】", prefix: "【 ", suffix: " 】" },
    { text: "〖 text 〗", prefix: "〖 ", suffix: " 〗" },
    { text: "『 text 』", prefix: "『 ", suffix: " 』" },
    { text: "〘 text 〙", prefix: "〘 ", suffix: " 〙" },
    { text: "〔 text 〕", prefix: "〔 ", suffix: " 〕" },
    { text: "༺ text ༻", prefix: "༺ ", suffix: " ༻" },
    { text: "༼ text ༽", prefix: "༼ ", suffix: " ༽" },
    { text: "꧁ text ꧂", prefix: "꧁ ", suffix: " ꧂" },
    { text: "▕ text ▏", prefix: "▕ ", suffix: " ▏" },
    { text: "▌ text ▐", prefix: "▌ ", suffix: " ▐" },
    { text: "❏ text ❏", prefix: "❏ ", suffix: " ❏" },
    { text: "❐ text ❐", prefix: "❐ ", suffix: " ❐" },
    { text: "❑ text ❑", prefix: "❑ ", suffix: " ❑" },
    { text: "❒ text ❒", prefix: "❒ ", suffix: " ❒" },
    { text: "▣ text ▣", prefix: "▣ ", suffix: " ▣" },
    { text: "⦋ text ⦌", prefix: "⦋ ", suffix: " ⦌" },
    { text: "⦍ text ⦎", prefix: "⦍ ", suffix: " ⦎" },
    { text: "⧘ text ⧙", prefix: "⧘ ", suffix: " ⧙" },
    { text: "⧚ text ⧛", prefix: "⧚ ", suffix: " ⧛" }
  ],
  arrows: [
    { text: "← text →", prefix: "← ", suffix: " →" },
    { text: "⇐ text ⇒", prefix: "⇐ ", suffix: " ⇒" },
    { text: "⇚ text ⇛", prefix: "⇚ ", suffix: " ⇛" },
    { text: "⇇ text ⇉", prefix: "⇇ ", suffix: " ⇉" },
    { text: "↞ text ↠", prefix: "↞ ", suffix: " ↠" },
    { text: "↢ text ↣", prefix: "↢ ", suffix: " ↣" },
    { text: "⇜ text ⇝", prefix: "⇜ ", suffix: " ⇝" },
    { text: "⟵ text ⟶", prefix: "⟵ ", suffix: " ⟶" },
    { text: "⟸ text ⟹", prefix: "⟸ ", suffix: " ⟹" },
    { text: "◄ text ►", prefix: "◄ ", suffix: " ►" },
    { text: "◁ text ▷", prefix: "◁ ", suffix: " ▷" },
    { text: "☚ text ☛", prefix: "☚ ", suffix: " ☛" },
    { text: "☜ text ☞", prefix: "☜ ", suffix: " ☞" },
    { text: "↼ text ⇀", prefix: "↼ ", suffix: " ⇀" },
    { text: "↽ text ⇁", prefix: "↽ ", suffix: " ⇁" },
    { text: "⮜ text ⮞", prefix: "⮜ ", suffix: " ⮞" },
    { text: "⇤ text ⇥", prefix: "⇤ ", suffix: " ⇥" },
    { text: "↩ text ↪", prefix: "↩ ", suffix: " ↪" },
    { text: "↺ text ↻", prefix: "↺ ", suffix: " ↻" },
    { text: "⥼ text ⥽", prefix: "⥼ ", suffix: " ⥽" }
  ],
  minimal: [
    { text: "• text •", prefix: "• ", suffix: " •" },
    { text: "· text ·", prefix: "· ", suffix: " ·" },
    { text: "° text °", prefix: "° ", suffix: " °" },
    { text: "⁕ text ⁕", prefix: "⁕ ", suffix: " ⁕" },
    { text: "† text †", prefix: "† ", suffix: " †" },
    { text: "‡ text ‡", prefix: "‡ ", suffix: " ‡" },
    { text: "○ text ○", prefix: "○ ", suffix: " ○" },
    { text: "◦ text ◦", prefix: "◦ ", suffix: " ◦" },
    { text: "＊ text ＊", prefix: "＊ ", suffix: " ＊" },
    { text: "⁓ text ⁓", prefix: "⁓ ", suffix: " ⁓" },
    { text: "⋆ text ⋆", prefix: "⋆ ", suffix: " ⋆" },
    { text: "» text «", prefix: "» ", suffix: " «" },
    { text: "› text ‹", prefix: "› ", suffix: " ‹" },
    { text: "¤ text ¤", prefix: "¤ ", suffix: " ¤" },
    { text: "§ text §", prefix: "§ ", suffix: " §" },
    { text: "¶ text ¶", prefix: "¶ ", suffix: " ¶" }
  ],
  emojis: [
    { text: "✨ text ✨", prefix: "✨ ", suffix: " ✨" },
    { text: "🔥 text 🔥", prefix: "🔥 ", suffix: " 🔥" },
    { text: "💫 text 💫", prefix: "💫 ", suffix: " 💫" },
    { text: "⭐ text ⭐", prefix: "⭐ ", suffix: " ⭐" },
    { text: "💖 text 💖", prefix: "💖 ", suffix: " 💖" },
    { text: "🌟 text 🌟", prefix: "🌟 ", suffix: " 🌟" },
    { text: "🦋 text 🦋", prefix: "🦋 ", suffix: " 🦋" },
    { text: "🌸 text 🌸", prefix: "🌸 ", suffix: " 🌸" },
    { text: "💎 text 💎", prefix: "💎 ", suffix: " 💎" },
    { text: "🎀 text 🎀", prefix: "🎀 ", suffix: " 🎀" },
    { text: "🌈 text 🌈", prefix: "🌈 ", suffix: " 🌈" },
    { text: "👑 text 👑", prefix: "👑 ", suffix: " 👑" },
    { text: "🐶 text 🐶", prefix: "🐶 ", suffix: " 🐶" },
    { text: "😎 text 😎", prefix: "😎 ", suffix: " 😎" },
    { text: "🥳 text 🥳", prefix: "🥳 ", suffix: " 🥳" },
    { text: "😍 text 😍", prefix: "😍 ", suffix: " 😍" },
    { text: "🦄 text 🦄", prefix: "🦄 ", suffix: " 🦄" },
    { text: "🍀 text 🍀", prefix: "🍀 ", suffix: " 🍀" },
    { text: "🌞 text 🌞", prefix: "🌞 ", suffix: " 🌞" },
    { text: "⚡ text ⚡", prefix: "⚡ ", suffix: " ⚡" },
    { text: "😃 text 😃", prefix: "😃 ", suffix: " 😃" },
    { text: "😂 text 😂", prefix: "😂 ", suffix: " 😂" },
    { text: "💜 text 💜", prefix: "💜 ", suffix: " 💜" },
    { text: "🤍 text 🤍", prefix: "🤍 ", suffix: " 🤍" }
  ],
     flags: [
    { text: "🇺🇸 text 🇺🇸", prefix: "🇺🇸 ", suffix: " 🇺🇸" },
    { text: "🇬🇧 text 🇬🇧", prefix: "🇬🇧 ", suffix: " 🇬🇧" },
    { text: "🇨🇦 text 🇨🇦", prefix: "🇨🇦 ", suffix: " 🇨🇦" },
    { text: "🇦🇺 text 🇦🇺", prefix: "🇦🇺 ", suffix: " 🇦🇺" },
    { text: "🇮🇳 text 🇮🇳", prefix: "🇮🇳 ", suffix: " 🇮🇳" },
    { text: "🇨🇳 text 🇨🇳", prefix: "🇨🇳 ", suffix: " 🇨🇳" },
    { text: "🇯🇵 text 🇯🇵", prefix: "🇯🇵 ", suffix: " 🇯🇵" },
    { text: "🇰🇷 text 🇰🇷", prefix: "🇰🇷 ", suffix: " 🇰🇷" },
    { text: "🇫🇷 text 🇫🇷", prefix: "🇫🇷 ", suffix: " 🇫🇷" },
    { text: "🇩🇪 text 🇩🇪", prefix: "🇩🇪 ", suffix: " 🇩🇪" },
    { text: "🇮🇹 text 🇮🇹", prefix: "🇮🇹 ", suffix: " 🇮🇹" },
    { text: "🇪🇸 text 🇪🇸", prefix: "🇪🇸 ", suffix: " 🇪🇸" },
    { text: "🇧🇷 text 🇧🇷", prefix: "🇧🇷 ", suffix: " 🇧🇷" },
    { text: "🇲🇽 text 🇲🇽", prefix: "🇲🇽 ", suffix: " 🇲🇽" },
    { text: "🇦🇷 text 🇦🇷", prefix: "🇦🇷 ", suffix: " 🇦🇷" },
    { text: "🇸🇬 text 🇸🇬", prefix: "🇸🇬 ", suffix: " 🇸🇬" },
    { text: "🇵🇭 text 🇵🇭", prefix: "🇵🇭 ", suffix: " 🇵🇭" },
    { text: "🇹🇭 text 🇹🇭", prefix: "🇹🇭 ", suffix: " 🇹🇭" },
    { text: "🇵🇸 text 🇵🇸", prefix: "🇵🇸 ", suffix: " 🇵🇸" }
  ]
};

  /* ===================
     STATE
     =================== */
  const currentFamily = (window.UTG_FAMILY || "all").toLowerCase();
  const currentGroup = (window.UTG_GROUP || "all").toLowerCase();
  
  // Category URL pattern for detecting category pages
  const CATEGORY_URL_PATTERN = /^\/category\/([^\/]+)\/?/;
  
  // Detect category from URL if on a category page
  const categoryMatch = window.location.pathname.match(CATEGORY_URL_PATTERN);
  let currentCategory = categoryMatch ? categoryMatch[1] : "popular";
  
  let currentDecoTab = window.UTG_DEFAULT_DECO_TAB || "symbols";
  let selectedDecoration = null;
  let searchQuery = "";
  let fontCategories = null;
  let categoryFontMap = {};

  // Saved styles (return-driving mechanic) — persisted per device in localStorage
  const SAVED_KEY = "utg_saved_styles";
  let savedStyles = loadSavedStyles();

  // Emphasis scope — how much of the input gets styled. Persisted per device.
  //   'whole'      → style the entire input (default; best for bios/usernames)
  //   'first-line' → style only the first line, leave the rest plain text.
  //                  This is the accessibility-friendly pattern for social
  //                  posts: the hook stands out while the body stays plain
  //                  (readable by search and screen readers).
  const SCOPE_KEY = "utg_scope_pref";
  const SCOPE_VALUES = ["whole", "first-line"];
  let currentScope = loadScopePref();

  // Format marks — optional combining underline / strikethrough layered on top
  // of whatever style is generated. Opt-in per page via window.UTG_FORMAT_MARKS
  // so the control only surfaces where the job calls for it (e.g. the bold
  // italic page, where users explicitly search "bold italic underline").
  // Persisted per device so the choice survives reloads.
  const FORMAT_KEY = "utg_format_marks";
  let formatMarks = loadFormatMarks();

  // Demo text rendered through every style while the input is empty, so the
  // first paint shows the whole catalog styled instead of placeholder rows.
  // Two lines on purpose: the first-line scope and heading use cases read
  // naturally. Pages can override via window.UTG_DEMO_TEXT.
  const DEMO_TEXT = window.UTG_DEMO_TEXT ||
    "Welcome to UltraTextGen.\nType anything. Make it ultra.";

  // Per-style copy counts + last-used timestamps, persisted per device.
  // Most-copied styles float to the top of the grid on the next render.
  const USAGE_KEY = "utg_style_usage";
  let styleUsage = loadStyleUsage();

  /* ===================
     ELEMENTS
     =================== */
  const el = {
    mainInput: $("#mainInput"),
    charCount: $("#charCount"),
    charCountWrapper: $("#charCountWrapper"),
    inputClearBtn: $("#inputClearBtn"),
    searchInput: $("#searchInput"),
    resultsGrid: $("#resultsGrid"),
    decorationGrid: $("#decorationGrid"),
    darkModeBtn: $("#darkModeBtn"),
    copyToast: $("#copyToast")
  };

  /* ===================
     HELPERS
     =================== */
  function safeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  // Escape converted text before it lands in innerHTML. Styles that don't
  // remap ASCII (decorators, redact) pass < > & through verbatim, so a
  // crafted ?q= link could otherwise inject markup into every card.
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function loadSavedStyles() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((name) => typeof name === "string") : [];
    } catch (err) {
      return [];
    }
  }

  function persistSavedStyles() {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedStyles));
    } catch (err) {
      // Storage may be unavailable (private mode / quota) — fail silently
    }
  }

  function loadScopePref() {
    try {
      const saved = localStorage.getItem(SCOPE_KEY);
      return SCOPE_VALUES.indexOf(saved) !== -1 ? saved : "whole";
    } catch (err) {
      return "whole";
    }
  }

  function persistScopePref() {
    try {
      localStorage.setItem(SCOPE_KEY, currentScope);
    } catch (err) {
      // Storage may be unavailable — fail silently
    }
  }

  function loadFormatMarks() {
    const fallback = { underline: false, strike: false };
    try {
      const raw = localStorage.getItem(FORMAT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== "object") return fallback;
      return { underline: !!parsed.underline, strike: !!parsed.strike };
    } catch (err) {
      return fallback;
    }
  }

  function persistFormatMarks() {
    try {
      localStorage.setItem(FORMAT_KEY, JSON.stringify(formatMarks));
    } catch (err) {
      // Storage may be unavailable — fail silently
    }
  }

  function loadStyleUsage() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function recordStyleUsage(name) {
    if (!name || !stylesRegistry[name]) return;
    const entry = styleUsage[name] || { c: 0, t: 0 };
    entry.c += 1;
    entry.t = Date.now();
    styleUsage[name] = entry;
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify(styleUsage));
    } catch (err) {
      // Storage may be unavailable — fail silently
    }
  }

  function usageCount(name) {
    return styleUsage[name] ? styleUsage[name].c || 0 : 0;
  }

  function usageLast(name) {
    return styleUsage[name] ? styleUsage[name].t || 0 : 0;
  }

  function isSaved(name) {
    return savedStyles.indexOf(name) !== -1;
  }

  function toggleSaved(name) {
    if (!name || !stylesRegistry[name]) return;
    const idx = savedStyles.indexOf(name);
    const nowSaved = idx === -1;
    if (nowSaved) {
      savedStyles.push(name);
    } else {
      savedStyles.splice(idx, 1);
    }
    persistSavedStyles();

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: nowSaved ? "save_style" : "unsave_style",
      style_name: name
    });

    renderSavedStyles();
    renderResults();
  }

  function applyDecoration(text) {
    if (!selectedDecoration || !text) return text;
    return selectedDecoration.prefix + text + selectedDecoration.suffix;
  }

  // Layer combining underline (U+0332) and/or strikethrough (U+0336) onto every
  // rendered glyph. Combining marks attach to the preceding base character, so
  // we iterate by code point — the spread operator keeps astral chars (e.g. the
  // bold-italic 𝘼) intact. Newlines are skipped; spaces are kept so the line
  // runs continuously, matching what people expect from a real underline.
  // No toggles active → returns the text untouched, so other pages are unaffected.
  function applyFormatMarks(text) {
    if (!text || (!formatMarks.underline && !formatMarks.strike)) return text;
    const marks = (formatMarks.strike ? "\u0336" : "") + (formatMarks.underline ? "\u0332" : "");
    return [...text].map((ch) => (ch === "\n" ? ch : ch + marks)).join("");
  }

  // Render input through a style, honoring the current emphasis scope.
  // 'first-line' styles only the first line and leaves the remaining lines as
  // plain text — the recommended pattern for social posts (the hook pops while
  // the body stays searchable and screen-reader friendly). Single-line input
  // falls back to styling the whole thing.
  function applyScope(text, style) {
    if (!text || !Render || typeof Render.renderAny !== "function") return "";
    if (currentScope === "first-line") {
      const nlIndex = text.indexOf("\n");
      if (nlIndex === -1) return Render.renderAny(text, style);
      const firstLine = text.slice(0, nlIndex);
      const rest = text.slice(nlIndex); // original newline(s) + body, untouched
      return Render.renderAny(firstLine, style) + rest;
    }
    return Render.renderAny(text, style);
  }

   function isStyleInFamily(style, familyKey) {
    if (!familyKey || familyKey === "all") return true;
    const slug = style.familySlug || "";
    if (Array.isArray(slug)) {
      return slug.includes(familyKey);
    }
    return slug === familyKey;
}
   
  function isStyleInCategory(name, categoryKey) {
    // Dynamic category filtering based on fonts.json
    if (!fontCategories || !categoryKey) return true;
    
    // Check if the font name is in the current category's font list
    const categoryFonts = categoryFontMap[categoryKey];
    if (!categoryFonts) return true;
    
    return categoryFonts.includes(name);
  }

  function isStyleInGroup(style, groupKey) {
    if (!groupKey || groupKey === "all") return true;
    return (style.groupSlug || "") === groupKey;
  }

  function isStyleMatchingSearch(name, q) {
    if (!q) return true;
    return String(name).toLowerCase().includes(String(q).toLowerCase());
  }

  // Where a style works, surfaced on each result card (opt-in per page via
  // window.UTG_SHOW_PLATFORMS). Reads the style's own `platforms` array.
  const PLATFORM_LABELS = {
    instagram: "IG", x: "X", discord: "Discord", tiktok: "TikTok",
    whatsapp: "WhatsApp", facebook: "Facebook", telegram: "Telegram",
    youtube: "YouTube", snapchat: "Snapchat", linkedin: "LinkedIn"
  };

  function platformChipsHtml(style) {
    if (!window.UTG_SHOW_PLATFORMS) return "";
    const list = Array.isArray(style && style.platforms) ? style.platforms : null;
    if (!list || !list.length) return "";
    if (list.includes("all")) {
      return `<div class="style-platforms"><span class="plat-chip is-all">Works everywhere</span></div>`;
    }
    const chips = list
      .map(p => PLATFORM_LABELS[p])
      .filter(Boolean)
      .map(lbl => `<span class="plat-chip">${lbl}</span>`)
      .join("");
    return chips ? `<div class="style-platforms">${chips}</div>` : "";
  }

  /* ===================
     RENDER SAFETY
     =================== */
  // Does the visitor's own device have a glyph for this character? Compares
  // the canvas rasterization against a guaranteed-unassigned code point: an
  // identical bitmap means the font fell back to the same missing-glyph box.
  // Results are cached per character — the check runs once per style.
  const glyphSupportCache = {};
  let glyphCtx = null;
  function deviceRendersGlyph(ch) {
    if (!ch) return true;
    if (ch in glyphSupportCache) return glyphSupportCache[ch];
    let supported = true;
    try {
      if (!glyphCtx) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        glyphCtx = canvas.getContext("2d", { willReadFrequently: true });
      }
      const draw = (c) => {
        glyphCtx.clearRect(0, 0, 24, 24);
        glyphCtx.font = "18px sans-serif";
        glyphCtx.fillText(c, 2, 18);
        return glyphCtx.getImageData(0, 0, 24, 24).data.join(",");
      };
      const tofu = "\u{E01ED}"; // unassigned code point → always the .notdef box
      supported = draw(ch) !== draw(tofu);
    } catch (err) {
      supported = true; // canvas unavailable → don't cry wolf
    }
    glyphSupportCache[ch] = supported;
    return supported;
  }

  // A representative converted character for a style (astral-safe), used to
  // probe device support for the style's Unicode block.
  function sampleGlyph(style) {
    const maps = [style && style.upper, style && style.lower, style && style.nums];
    for (const map of maps) {
      if (map) {
        for (const key in map) {
          if (map[key]) return [...String(map[key])][0];
        }
      }
    }
    return "";
  }

  // Compact per-card trust signal built from the style's own `platforms`
  // data plus the device glyph probe. Tooltips carry the honest caveats no
  // competitor surfaces (platform filters, screen readers, tofu boxes).
  function safetyPillHtml(name, style) {
    if (!style) return "";
    const glyph = sampleGlyph(style);
    if (glyph && !deviceRendersGlyph(glyph)) {
      return `<span class="ts-pill ts-pill-risk" title="Your device's fonts can't display this style — it may show as boxes (□). It can still look fine on other devices.">⚠ May not show on your device</span>`;
    }
    const platforms = Array.isArray(style.platforms) ? style.platforms : null;
    // Pages that render the platform chip row already say where a style
    // works — only the device warning above adds signal there.
    if (window.UTG_SHOW_PLATFORMS && platforms && platforms.length) return "";
    if (platforms && platforms.includes("all")) {
      return `<span class="ts-pill ts-pill-safe" title="Renders on all major platforms. Heads up: screen readers may spell styled letters out character by character, so keep body text plain.">✓ Safe to paste anywhere</span>`;
    }
    if (platforms && platforms.length) {
      const names = platforms.map((p) => PLATFORM_LABELS[p]).filter(Boolean).join(", ");
      return `<span class="ts-pill ts-pill-risk" title="Best on: ${safeAttr(names)}. Other platforms may strip or garble it — paste a test first.">⚠ Works best on ${safeAttr(names)}</span>`;
    }
    return "";
  }

  function createStyleCard(name, convertedText, decoratedText, style, isDemo) {
    const card = document.createElement("div");
    card.className = "style-card";

    const fullText = isDemo ? "" : decoratedText || convertedText;
    const safeText = safeAttr(fullText);
    const previewText = decoratedText && isDemo ? decoratedText : convertedText;

    let decoHtml = "";
    if (selectedDecoration && convertedText && !isDemo) {
      decoHtml = `<div class="style-decoration">${escapeHtml(decoratedText)}</div>`;
    }

    const saved = isSaved(name);
    const safeName = safeAttr(name);

    card.innerHTML = `
      <div class="style-info">
        <p class="style-name">${name}</p>
         ${style?.note ? `<p class="style-note">${style.note}</p>` : ""}
        <p class="style-preview ${!previewText ? "placeholder" : ""}${isDemo ? " is-demo" : ""}">${previewText ? escapeHtml(previewText) : "Type something above..."}</p>
        ${decoHtml}
        ${safetyPillHtml(name, style)}
        ${platformChipsHtml(style)}
      </div>
      <div class="style-actions">
        <button class="copy-btn" data-text="${safeText}" data-style="${safeName}" ${!fullText ? "disabled" : ""} title="${isDemo ? "Type your text above to copy" : "Copy to clipboard"}">Copy <kbd class="copy-kbd">↵</kbd></button>
        <button class="preview-btn" data-style="${safeName}" type="button" title="Preview on Instagram, LinkedIn, Discord &amp; more">👁 <span class="preview-label">Preview</span></button>
        <button class="save-btn ${saved ? "is-saved" : ""}" data-style="${safeName}" type="button" aria-pressed="${saved}" title="${saved ? "Remove from saved styles" : "Save this style"}"><span class="save-icon" aria-hidden="true">${saved ? "★" : "☆"}</span><span class="save-label">${saved ? "Saved" : "Save"}</span></button>
      </div>
    `;

    return card;
  }

  /* ===================
     RENDER: Decorations
     =================== */
  function renderCategoryTabs() {
    const tabsContainer = $("#categoryTabs");
    if (!tabsContainer || !fontCategories) return;

    // Detect category mode from URL
    const categoryMatch = window.location.pathname.match(CATEGORY_URL_PATTERN);
    const isCategoryMode = !!categoryMatch;
    const urlCategorySlug = categoryMatch ? categoryMatch[1] : null;

    tabsContainer.innerHTML = "";

    // Render tabs from the loaded categories
    Object.entries(fontCategories.categories).forEach(([key, category]) => {
      let tab;
      const isActive = isCategoryMode ? (key === urlCategorySlug) : (key === currentCategory);
      const tabText = category.icon ? `${category.icon} ${category.label}` : category.label;
      
      if (isCategoryMode) {
        // Category mode: render as <a> elements
        tab = document.createElement("a");
        tab.className = "category-tab";
        
        if (isActive) {
          tab.classList.add("active");
          // Active tab should not be clickable - don't set href
        } else {
          // Other tabs navigate to their category pages
          tab.href = `/category/${key}/`;
        }
        
        tab.textContent = tabText;
      } else {
        // Homepage mode: render as buttons with click handlers
        tab = document.createElement("button");
        tab.className = "category-tab";
        if (isActive) {
          tab.classList.add("active");
        }
        tab.dataset.category = key;
        tab.textContent = tabText;
        
        tab.addEventListener("click", () => {
          $$(".category-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          currentCategory = key;
          renderResults();
        });
      }
      
      tabsContainer.appendChild(tab);
    });

    // Defer collapse logic so layout is ready
    setTimeout(() => {
      collapseCategoryTabs();
    }, 0);
  }

  // Collapse overflowing category tabs into two visible rows on desktop,
  // hide the rest and render a "More" button to expand and show all.
  function collapseCategoryTabs() {
    const tabsContainer = $("#categoryTabs");
    if (!tabsContainer) return;

    // Cleanup any previous "More" button
    const prevMore = tabsContainer.querySelector(".category-more");
    if (prevMore) prevMore.remove();

    // Reset any previously hidden tabs
    $$(".category-tab", tabsContainer).forEach(t => {
      t.style.display = "";
      t.removeAttribute("aria-hidden");
      t.classList.remove("hidden-category");
    });
    tabsContainer.classList.remove("expanded");

    // Only apply desktop behavior (leave mobile/tablet as-is)
    if (window.innerWidth < 641) return;

    const tabs = Array.from(tabsContainer.querySelectorAll(".category-tab"));
    if (tabs.length === 0) return;

    // Determine unique row top offsets (order-preserving)
    const uniqueTops = [];
    for (const t of tabs) {
      const top = t.offsetTop;
      if (!uniqueTops.includes(top)) {
        uniqueTops.push(top);
      }
      if (uniqueTops.length > 2) break;
    }

    // If there are 2 or fewer rows, nothing to collapse
    if (uniqueTops.length <= 2) return;

    const secondRowTop = uniqueTops[1];

    // Find tabs that are beyond the second row
    const hiddenTabs = [];
    let lastVisibleIndex = -1;
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      if (t.offsetTop > secondRowTop) {
        hiddenTabs.push(t);
      } else {
        lastVisibleIndex = i;
      }
    }

    if (hiddenTabs.length === 0) return;

    // Hide overflowing tabs
    hiddenTabs.forEach(h => {
      h.style.display = "none";
      h.setAttribute("aria-hidden", "true");
      h.classList.add("hidden-category");
    });

    // Create the More button and insert it after the last visible tab
    const moreBtn = document.createElement("button");
    moreBtn.className = "category-more";
    moreBtn.type = "button";
    moreBtn.textContent = "More";
    moreBtn.addEventListener("click", () => {
      const isExpanded = tabsContainer.classList.contains("expanded");
      if (isExpanded) {
        // Collapse: re-run the collapse logic from scratch
        collapseCategoryTabs();
      } else {
        // Expand: reveal all hidden tabs and switch button to "Less"
        hiddenTabs.forEach(h => {
          h.style.display = "";
          h.removeAttribute("aria-hidden");
          h.classList.remove("hidden-category");
        });
        moreBtn.textContent = "Less";
        tabsContainer.classList.add("expanded");
      }
    });

    // Insert after last visible tab; if lastVisibleIndex is last element, append to end
    const insertBeforeEl = tabs[lastVisibleIndex + 1] || null;
    tabsContainer.insertBefore(moreBtn, insertBeforeEl);
  }

  // Debounce helper for resize
  function debounce(fn, wait = 120) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function createSkeletonCard() {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `
      <div class="style-info">
        <div class="skeleton skeleton-line" style="width:28%"></div>
        <div class="skeleton skeleton-line" style="width:65%"></div>
      </div>
      <div class="skeleton skeleton-btn"></div>
    `;
    return card;
  }

  function showLoadingState() {
    const tabsContainer = $("#categoryTabs");
    if (tabsContainer) {
      tabsContainer.innerHTML = "";
      [80, 60, 92, 68, 76, 52, 84, 64].forEach(w => {
        const s = document.createElement("span");
        s.className = "category-tab skeleton skeleton-tab";
        s.style.width = w + "px";
        s.setAttribute("aria-hidden", "true");
        tabsContainer.appendChild(s);
      });
    }

    if (el.resultsGrid) {
      el.resultsGrid.innerHTML = "";
      for (let i = 0; i < 8; i++) {
        el.resultsGrid.appendChild(createSkeletonCard());
      }
    }
  }

  async function loadFontCategories() {
    try {
      const response = await fetch('/fonts.json');
      if (!response.ok) {
        throw new Error(`Failed to load fonts.json: ${response.statusText}`);
      }
      fontCategories = await response.json();
      
      // Build a map for quick lookup
      Object.entries(fontCategories.categories).forEach(([key, category]) => {
        categoryFontMap[key] = category.fonts || [];
      });
      
      renderCategoryTabs();
      renderResults();
    } catch (error) {
      console.error("Error loading font categories:", error);
      // Fallback: show error message and render all fonts
      const tabsContainer = $("#categoryTabs");
      if (tabsContainer) {
        tabsContainer.innerHTML = '<div style="color: var(--text-muted); padding: 10px; text-align: center;">Failed to load categories. Showing all fonts.</div>';
      }
      renderResults();
    }
  }

  /* ===================
     RENDER: Decorations
     =================== */
  function renderDecorations() {
    if (window.UTG_VERTICAL_MODE) return;
    if (window.UTG_ZALGO_MODE) return;
    if (!el.decorationGrid) return;

    const grid = el.decorationGrid;
    grid.innerHTML = "";

    const clearBtn = document.createElement("span");
    clearBtn.className = "clear-decoration";
    clearBtn.textContent = "✕ None";
    clearBtn.addEventListener("click", () => {
      selectedDecoration = null;
      $$(".decoration-item").forEach((i) => i.classList.remove("selected"));
      renderResults();
    });
    grid.appendChild(clearBtn);

    const list = decorations[currentDecoTab] || [];
    list.forEach((deco) => {
      const item = document.createElement("span");
      item.className = "decoration-item";
      if (selectedDecoration && selectedDecoration.text === deco.text) {
        item.classList.add("selected");
      }
      item.textContent = deco.text;
      item.addEventListener("click", () => {
        const isSame = selectedDecoration && selectedDecoration.text === deco.text;

        $$(".decoration-item").forEach((i) => i.classList.remove("selected"));

        if (isSame) {
          selectedDecoration = null;
        } else {
          selectedDecoration = deco;
          item.classList.add("selected");
        }
        renderResults();
      });
      grid.appendChild(item);
    });
  }

  /* ===================
     RENDER: Scope control
     =================== */
  // Lazily inject the "Apply style to" control row directly above the results
  // grid. Injected from JS so it appears on every generator page without
  // editing each HTML file (skipped on the dedicated vertical/zalgo pages,
  // which run their own controllers).
  function ensureScopeControl() {
    if (window.UTG_VERTICAL_MODE || window.UTG_ZALGO_MODE) return null;
    if (!el.resultsGrid) return null;

    let control = $("#scopeControl");
    if (control) return control;

    const host = el.resultsGrid.parentElement;
    if (!host) return null;

    control = document.createElement("div");
    control.className = "scope-control";
    control.id = "scopeControl";
    control.innerHTML = `
      <span class="scope-control-label">Apply style to</span>
      <div class="scope-chips" role="group" aria-label="Choose how much text to style">
        <button class="scope-chip${currentScope === "whole" ? " active" : ""}" type="button" data-scope="whole">Whole text</button>
        <button class="scope-chip${currentScope === "first-line" ? " active" : ""}" type="button" data-scope="first-line">First line only <span class="scope-chip-tag">for posts</span></button>
      </div>
      <button class="share-btn" id="shareBtn" type="button" title="Share a link that reopens this page with your text filled in">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684m0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684"/></svg>
        Share
      </button>
    `;
    host.insertBefore(control, el.resultsGrid);

    const shareBtn = $("#shareBtn", control);
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const val = el.mainInput ? el.mainInput.value : "";
        const url = window.location.origin + window.location.pathname +
          (val ? "?q=" + encodeURIComponent(val) : "");

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "share_text", share_method: navigator.share ? "native" : "link_copy" });

        if (navigator.share) {
          try {
            await navigator.share({ title: document.title, url });
            return;
          } catch (err) {
            if (err && err.name === "AbortError") return; // user closed the sheet
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          const label = shareBtn.lastChild;
          shareBtn.classList.add("copied");
          label.textContent = " Link copied";
          setTimeout(() => {
            shareBtn.classList.remove("copied");
            label.textContent = " Share";
          }, 1500);
        } catch (err) {
          console.error("Share failed:", err);
        }
      });
    }

    $$(".scope-chip", control).forEach((chip) => {
      chip.addEventListener("click", () => {
        const scope = chip.getAttribute("data-scope");
        if (!scope || scope === currentScope || SCOPE_VALUES.indexOf(scope) === -1) return;
        currentScope = scope;
        persistScopePref();
        $$(".scope-chip", control).forEach((c) => c.classList.toggle("active", c === chip));

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "set_scope", scope: currentScope });

        renderSavedStyles();
        renderResults();
      });
    });

    return control;
  }

  // Lazily inject the "Add formatting" control (underline / strikethrough)
  // directly above the results grid. Opt-in per page via window.UTG_FORMAT_MARKS
  // so it only appears where the job calls for it — searchers explicitly want
  // "bold italic underline" / "bold italic strikethrough", a layer no
  // competitor generator serves cleanly. The toggles stack on top of whichever
  // style is generated, so every card in the grid gains the formatting at once.
  function ensureFormatControl() {
    if (!window.UTG_FORMAT_MARKS) return null;
    if (window.UTG_VERTICAL_MODE || window.UTG_ZALGO_MODE) return null;
    if (!el.resultsGrid) return null;

    let control = $("#formatControl");
    if (control) return control;

    const host = el.resultsGrid.parentElement;
    if (!host) return null;

    control = document.createElement("div");
    control.className = "format-control";
    control.id = "formatControl";
    control.innerHTML = `
      <span class="format-control-label">Add formatting</span>
      <div class="format-chips" role="group" aria-label="Layer underline or strikethrough on every style">
        <button class="format-chip${formatMarks.underline ? " active" : ""}" type="button" data-format="underline" aria-pressed="${formatMarks.underline}"><span class="format-chip-demo">U̲n̲d̲e̲r̲l̲i̲n̲e̲</span></button>
        <button class="format-chip${formatMarks.strike ? " active" : ""}" type="button" data-format="strike" aria-pressed="${formatMarks.strike}"><span class="format-chip-demo">S̶t̶r̶i̶k̶e̶</span></button>
      </div>
    `;
    // Sit alongside the scope control if present, otherwise straight above the grid.
    const scopeControl = $("#scopeControl");
    if (scopeControl && scopeControl.parentElement === host) {
      host.insertBefore(control, scopeControl.nextSibling);
    } else {
      host.insertBefore(control, el.resultsGrid);
    }

    $$(".format-chip", control).forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.getAttribute("data-format");
        if (key !== "underline" && key !== "strike") return;
        formatMarks[key] = !formatMarks[key];
        persistFormatMarks();
        chip.classList.toggle("active", formatMarks[key]);
        chip.setAttribute("aria-pressed", String(formatMarks[key]));

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "set_format_mark", mark: key, on: formatMarks[key] });

        renderSavedStyles();
        renderResults();
      });
    });

    return control;
  }

  /* ===================
     RENDER: Saved styles
     =================== */
  // Lazily build the "Your saved styles" section above the results grid.
  function ensureSavedSection() {
    if (!el.resultsGrid) return null;
    let section = $("#savedSection");
    if (section) return section;

    const host = el.resultsGrid.closest("main") || el.resultsGrid.parentElement;
    if (!host) return null;

    section = document.createElement("section");
    section.className = "saved-section";
    section.id = "savedSection";
    section.setAttribute("aria-label", "Your saved styles");
    section.hidden = true;
    section.innerHTML = `
      <div class="saved-header">
        <h2 class="saved-title">★ Your saved styles</h2>
        <button class="saved-clear" id="savedClearBtn" type="button">Clear all</button>
      </div>
      <p class="saved-hint">Saved on this device — they'll be waiting here when you come back.</p>
      <div class="results-grid saved-grid" id="savedGrid"></div>
    `;
    host.insertBefore(section, host.firstChild);

    const clearBtn = $("#savedClearBtn", section);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        savedStyles = [];
        persistSavedStyles();
        renderSavedStyles();
        renderResults();
      });
    }
    return section;
  }

  function renderSavedStyles() {
    if (window.UTG_VERTICAL_MODE) return;
    if (window.UTG_ZALGO_MODE) return;
    if (!el.resultsGrid) return;

    const section = ensureSavedSection();
    if (!section) return;

    const grid = $("#savedGrid", section);
    if (!grid) return;

    const valid = savedStyles.filter((name) => stylesRegistry[name]);

    // Drop any saved names that no longer exist in the registry
    if (valid.length !== savedStyles.length) {
      savedStyles = valid;
      persistSavedStyles();
    }

    if (valid.length === 0) {
      section.hidden = true;
      grid.innerHTML = "";
      return;
    }

    section.hidden = false;
    grid.innerHTML = "";

    const inputText = el.mainInput ? el.mainInput.value : "";
    const isDemo = !inputText;
    valid.forEach((name) => {
      const style = stylesRegistry[name];
      const converted = applyFormatMarks(applyScope(inputText || DEMO_TEXT, style));
      const decorated = converted ? applyDecoration(converted) : "";
      grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null, style, isDemo));
    });
  }

  /* ===================
     RENDER: Results
     =================== */
  function renderResults() {
    if (window.UTG_VERTICAL_MODE) return;
    if (window.UTG_ZALGO_MODE) return;
    if (!el.resultsGrid) return;

    const grid = el.resultsGrid;
    const inputText = el.mainInput ? el.mainInput.value : "";

    grid.innerHTML = "";

    const entries = Object.entries(stylesRegistry);

    // Apply family/group filtering with priority logic:
    // If UTG_GROUP is set, show only that group
    // Else if UTG_FAMILY is set, show only that family
    // Else show all
    let familyGroupFiltered = entries;
    if (currentGroup !== "all") {
      // Group filter takes priority
      familyGroupFiltered = entries.filter(([name, style]) => {
        return style && isStyleInGroup(style, currentGroup);
      });
    } else if (currentFamily !== "all") {
      // Family filter if no group specified
      familyGroupFiltered = entries.filter(([name, style]) => {
        return style && isStyleInFamily(style, currentFamily);
      });
    }

   // Slug-based filtering (for usecase pages that curate specific fonts)
    const allowedSlugs = window.UTG_FONT_SLUGS || null;
    if (allowedSlugs) {
      familyGroupFiltered = familyGroupFiltered.filter(([name, style]) => {
        return style && style.slug && allowedSlugs.includes(style.slug);
      });
    }

    // Apply remaining filters
    const filtered = familyGroupFiltered.filter(([name, style]) => {
      if (!style) return false;
      if (!allowedSlugs && !isStyleInCategory(name, currentCategory)) return false;
      if (!isStyleMatchingSearch(name, searchQuery)) return false;
      return true;
    });

    // Most-copied styles first (recency breaks ties); untouched styles keep
    // registry order thanks to stable sort. Copying doesn't rerender, so
    // cards never jump around mid-session — the order upgrades on return.
    filtered.sort((a, b) =>
      usageCount(b[0]) - usageCount(a[0]) || usageLast(b[0]) - usageLast(a[0])
    );

    const isDemo = !inputText;
    let count = 0;

    filtered.forEach(([name, style]) => {
      const converted = applyFormatMarks(applyScope(inputText || DEMO_TEXT, style));
      const decorated = converted ? applyDecoration(converted) : "";
      grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null, style, isDemo));
      count += 1;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "style-card";
      empty.innerHTML = `
        <div class="style-info">
          <p class="style-preview placeholder">No styles found. Try a different filter or search term.</p>
        </div>
      `;
      grid.appendChild(empty);
    }
  }

  /* ===================
     PLATFORM PREVIEW
     =================== */
  // "See it before you paste it" — renders the styled text inside lightweight
  // CSS mockups of real platform UIs. One shared modal, built on first use.
  const PREVIEW_PLATFORMS = [
    { key: "instagram", label: "Instagram" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "discord", label: "Discord" },
    { key: "x", label: "X" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "tiktok", label: "TikTok" }
  ];

  function defaultPreviewPlatform() {
    const forced = (window.UTG_PREVIEW_PLATFORM || "").toLowerCase();
    if (PREVIEW_PLATFORMS.some((p) => p.key === forced)) return forced;
    const seg = (window.location.pathname.split("/")[1] || "").toLowerCase();
    if (PREVIEW_PLATFORMS.some((p) => p.key === seg)) return seg;
    return "instagram";
  }

  let previewPlatform = defaultPreviewPlatform();
  let previewStyleName = "";
  let previewLastFocus = null;

  // Each mockup takes the styled text as a plain string; it is inserted with
  // textContent (never innerHTML), so no escaping gymnastics are needed.
  function buildMockup(platform) {
    const av = `<span class="pv-avatar" aria-hidden="true"></span>`;
    switch (platform) {
      case "instagram":
        return `
          <div class="pv-mock pv-instagram">
            <div class="pv-ig-head">${av}<div class="pv-ig-stats"><span><b>128</b> posts</span><span><b>3,410</b> followers</span><span><b>512</b> following</span></div></div>
            <div class="pv-ig-name">yourname</div>
            <div class="pv-text pv-ig-bio"></div>
            <div class="pv-ig-btn">Edit profile</div>
          </div>`;
      case "linkedin":
        return `
          <div class="pv-mock pv-linkedin">
            <div class="pv-li-head">${av}<div><div class="pv-li-name">Your Name</div><div class="pv-li-sub">Marketing Lead · 1st</div><div class="pv-li-sub">2h · 🌐</div></div></div>
            <div class="pv-text pv-li-body"></div>
            <div class="pv-li-actions"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
          </div>`;
      case "discord":
        return `
          <div class="pv-mock pv-discord">
            <div class="pv-dc-row">${av}<div><span class="pv-dc-name">yourname</span><span class="pv-dc-time">Today at 9:41 AM</span><div class="pv-text pv-dc-msg"></div></div></div>
          </div>`;
      case "x":
        return `
          <div class="pv-mock pv-x">
            <div class="pv-x-head">${av}<div><span class="pv-x-name">Your Name</span> <span class="pv-x-handle">@yourname · 2h</span></div></div>
            <div class="pv-text pv-x-body"></div>
            <div class="pv-x-actions"><span>💬 12</span><span>🔁 34</span><span>♥ 208</span></div>
          </div>`;
      case "whatsapp":
        return `
          <div class="pv-mock pv-whatsapp">
            <div class="pv-wa-bubble"><div class="pv-text pv-wa-msg"></div><span class="pv-wa-meta">9:41 ✓✓</span></div>
          </div>`;
      case "tiktok":
        return `
          <div class="pv-mock pv-tiktok">
            <div class="pv-tt-row">${av}<div><div class="pv-tt-name">yourname</div><div class="pv-text pv-tt-msg"></div><div class="pv-tt-meta">2h ago · Reply</div></div><span class="pv-tt-like">♥<br>1.2K</span></div>
          </div>`;
      default:
        return `<div class="pv-mock"><div class="pv-text"></div></div>`;
    }
  }

  function ensurePreviewModal() {
    let modal = $("#previewModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "preview-modal";
    modal.id = "previewModal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="preview-backdrop" data-preview-close></div>
      <div class="preview-dialog" role="dialog" aria-modal="true" aria-label="Platform preview">
        <div class="preview-head">
          <span class="preview-title" id="previewTitle">Preview</span>
          <button class="preview-close" type="button" data-preview-close aria-label="Close preview">✕</button>
        </div>
        <div class="preview-tabs" role="tablist">
          ${PREVIEW_PLATFORMS.map((p) =>
            `<button class="preview-tab" type="button" role="tab" data-platform="${p.key}">${p.label}</button>`
          ).join("")}
        </div>
        <div class="preview-body" id="previewBody"></div>
        <p class="preview-note">Simulated look — fonts can differ slightly per device and app version.</p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-preview-close]")) closePreview();
      const tab = e.target.closest(".preview-tab");
      if (tab) {
        previewPlatform = tab.dataset.platform || previewPlatform;
        renderPreviewBody();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closePreview();
    });

    return modal;
  }

  function previewTextFor(styleName) {
    const style = stylesRegistry[styleName];
    if (!style) return "";
    const source = (el.mainInput && el.mainInput.value) || DEMO_TEXT;
    const converted = applyFormatMarks(applyScope(source, style));
    return selectedDecoration ? applyDecoration(converted) : converted;
  }

  function renderPreviewBody() {
    const modal = ensurePreviewModal();
    const body = $("#previewBody", modal);
    const title = $("#previewTitle", modal);
    if (!body) return;

    $$(".preview-tab", modal).forEach((t) =>
      t.classList.toggle("active", t.dataset.platform === previewPlatform)
    );
    if (title) title.textContent = previewStyleName ? `${previewStyleName} — preview` : "Preview";

    body.innerHTML = buildMockup(previewPlatform);
    const textEl = $(".pv-text", body);
    if (textEl) textEl.textContent = previewTextFor(previewStyleName);
  }

  function openPreview(styleName) {
    if (!stylesRegistry[styleName]) return;
    previewStyleName = styleName;
    previewLastFocus = document.activeElement;
    const modal = ensurePreviewModal();
    renderPreviewBody();
    modal.hidden = false;
    document.body.classList.add("preview-open");
    const closeBtn = $(".preview-close", modal);
    if (closeBtn) closeBtn.focus();

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "preview_open",
      preview_platform: previewPlatform,
      style_name: styleName
    });
  }

  function closePreview() {
    const modal = $("#previewModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("preview-open");
    if (previewLastFocus && typeof previewLastFocus.focus === "function") {
      previewLastFocus.focus();
    }
  }

  /* ===================
     EVENTS
     =================== */
  function bindEvents() {
    let urlSyncTimer = null;
    function syncInputUI() {
      const len = el.mainInput.value.length;
      if (el.charCount) el.charCount.textContent = String(len);
      if (el.charCountWrapper) el.charCountWrapper.hidden = len === 0;
      if (el.inputClearBtn) el.inputClearBtn.hidden = len === 0;
    }
    function pushUrlState() {
      const params = new URLSearchParams(window.location.search);
      const val = el.mainInput.value;
      if (val) {
        params.set("q", val);
      } else {
        params.delete("q");
      }
      const newSearch = params.toString() ? "?" + params.toString() : window.location.pathname;
      history.replaceState(null, "", newSearch);
    }

    if (el.mainInput) {
      el.mainInput.addEventListener("input", () => {
        syncInputUI();
        clearTimeout(urlSyncTimer);
        urlSyncTimer = setTimeout(pushUrlState, 400);
        renderSavedStyles();
        renderResults();
      });

      // Ctrl/Cmd+Enter copies the top result (saved styles first) without
      // leaving the input — plain Enter still inserts a newline.
      el.mainInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || (!e.ctrlKey && !e.metaKey)) return;
        const topBtn = $("#savedGrid .copy-btn:not([disabled])") ||
          $("#resultsGrid .copy-btn:not([disabled])");
        if (!topBtn) return;
        e.preventDefault();
        topBtn.click();
      });
    }

    if (el.inputClearBtn && el.mainInput) {
      el.inputClearBtn.addEventListener("click", () => {
        el.mainInput.value = "";
        syncInputUI();
        pushUrlState();
        el.mainInput.focus();
        renderSavedStyles();
        renderResults();
      });
    }

    if (el.searchInput) {
      el.searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value || "";
        renderResults();
      });
    }

    $$(".decoration-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".decoration-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentDecoTab = tab.dataset.decoTab || "symbols";
        selectedDecoration = null;
        renderDecorations();
        renderResults();
      });
    });

$$(".faq-question").forEach((q) => {
      q.addEventListener("click", () => {
        q.parentElement.classList.toggle("open");
      });
    });
  let toastTimer = null;
  function showCopyToast() {
    const toast = el.copyToast;
    if (!toast) return;
    toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

document.addEventListener("click", async (e) => {
  const btn = e.target.closest ? e.target.closest(".copy-btn") : null;
  if (!btn || btn.disabled) return;

  const text = btn.dataset.text || "";

  try {
    await navigator.clipboard.writeText(text);

    const styleName = btn.dataset.style || "";
    recordStyleUsage(styleName);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "copy_text",
      copy_method: "button",
      style_name: styleName
    });

    btn.textContent = "✓ Copied";
    btn.classList.add("copied");
    showCopyToast();
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1500);
  } catch (err) {
    console.error("Copy failed:", err);
    btn.textContent = "✗ Failed";
    btn.classList.add("copy-error");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copy-error");
    }, 1500);
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest ? e.target.closest(".glyph-copy") : null;
  if (!btn) return;

  const text = btn.dataset.text || btn.textContent || "";
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "copy_text",
      copy_method: "glyph"
    });

    btn.classList.add("copied");
    showCopyToast();
    setTimeout(() => btn.classList.remove("copied"), 1200);
  } catch (err) {
    console.error("Copy failed:", err);
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest ? e.target.closest(".save-btn") : null;
  if (!btn) return;
  const name = btn.dataset.style || "";
  if (!name) return;
  toggleSaved(name);
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest ? e.target.closest(".preview-btn") : null;
  if (!btn) return;
  const name = btn.dataset.style || "";
  if (!name) return;
  openPreview(name);
});

document.addEventListener("copy", () => {
  const selection = window.getSelection()?.toString();
  if (selection && selection.length > 0) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "copy_text",
      copy_method: "manual"
    });
  }
});
     }

  /* ===================
     INIT
     =================== */
  function init() {
    // Restore input text from URL ?q= param (shareable links)
    if (el.mainInput) {
      const urlQ = new URLSearchParams(window.location.search).get("q");
      if (urlQ) {
        el.mainInput.value = urlQ;
      }
    }

    bindEvents();

    if (el.charCount && el.mainInput) {
      const initLen = el.mainInput.value.length;
      el.charCount.textContent = String(initLen);
      if (el.charCountWrapper) el.charCountWrapper.hidden = initLen === 0;
      if (el.inputClearBtn) el.inputClearBtn.hidden = initLen === 0;
    }

    renderDecorations();
    ensureScopeControl();
    ensureFormatControl();
    renderSavedStyles();

    // Show skeleton placeholders while fonts.json loads
    showLoadingState();

    // Load font categories and render tabs
    loadFontCategories();

    // Expose rerender hook for context-specific pages that adjust filters
    window.UTG_RENDER_RESULTS = renderResults;

    // collapse/expand behavior should respond to resize on desktop
    window.addEventListener('resize', debounce(() => {
      collapseCategoryTabs();
    }, 150));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
