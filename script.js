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
     UI strings (localized by <html lang>)
     =================== */
  const UI_STRINGS = {
    en: { copy: "Copy", copied: "✓ Copied", failed: "✗ Failed", copyTitle: "Copy to clipboard",
          save: "Save", saved: "Saved", saveTitle: "Save this style", unsaveTitle: "Remove from saved styles",
          empty: "Type something above...",
          noStyles: "No styles found. Try a different filter or search term." },
    pt: { copy: "Copiar", copied: "✓ Copiado", failed: "✗ Falhou", copyTitle: "Copiar para a área de transferência",
          save: "Salvar", saved: "Salvo", saveTitle: "Salvar este estilo", unsaveTitle: "Remover dos estilos salvos",
          empty: "Digite algo aí em cima...",
          noStyles: "Nenhum estilo encontrado. Tente outro filtro ou termo de busca." },
    id: { copy: "Salin", copied: "✓ Tersalin", failed: "✗ Gagal", copyTitle: "Salin ke papan klip",
          save: "Simpan", saved: "Tersimpan", saveTitle: "Simpan gaya ini", unsaveTitle: "Hapus dari gaya tersimpan",
          empty: "Ketik sesuatu di atas...",
          noStyles: "Tidak ada gaya yang ditemukan. Coba filter atau kata kunci lain." },
    tr: { copy: "Kopyala", copied: "✓ Kopyalandı", failed: "✗ Başarısız", copyTitle: "Panoya kopyala",
          save: "Kaydet", saved: "Kaydedildi", saveTitle: "Bu stili kaydet", unsaveTitle: "Kayıtlı stillerden çıkar",
          empty: "Yukarıya bir şeyler yaz...",
          noStyles: "Stil bulunamadı. Başka bir filtre veya arama terimi dene." },
    fr: { copy: "Copier", copied: "✓ Copié", failed: "✗ Échec", copyTitle: "Copier dans le presse-papiers",
          save: "Enregistrer", saved: "Enregistré", saveTitle: "Enregistrer ce style", unsaveTitle: "Retirer des styles enregistrés",
          empty: "Tape quelque chose au-dessus…",
          noStyles: "Aucun style trouvé. Essaie un autre filtre ou terme de recherche." }
  };
  const PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const STR = UI_STRINGS[PAGE_LANG] || UI_STRINGS.en;

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
  // On family-scoped pages (window.UTG_FAMILY) the default "popular" category
  // may not intersect the family at all, leaving the grid empty on load —
  // start unfiltered there so the family's styles render immediately.
  let currentCategory = categoryMatch ? categoryMatch[1] : (currentFamily !== "all" ? null : "popular");
  
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

  function createStyleCard(name, convertedText, decoratedText, style) {
    const card = document.createElement("div");
    card.className = "style-card";

    const fullText = decoratedText || convertedText;
    const safeText = safeAttr(fullText);

    let decoHtml = "";
    if (selectedDecoration && convertedText) {
      decoHtml = `<div class="style-decoration">${decoratedText}</div>`;
    }

    const saved = isSaved(name);
    const safeName = safeAttr(name);

    card.innerHTML = `
      <div class="style-info">
        <p class="style-name">${name}</p>
         ${style?.note ? `<p class="style-note">${style.note}</p>` : ""}
        <p class="style-preview ${!convertedText ? "placeholder" : ""}">${convertedText || STR.empty}</p>
        ${decoHtml}
        ${platformChipsHtml(style)}
      </div>
      <div class="style-actions">
        <button class="copy-btn" data-text="${safeText}" ${!fullText ? "disabled" : ""} title="${STR.copyTitle}">${STR.copy} <kbd class="copy-kbd">↵</kbd></button>
        <button class="save-btn ${saved ? "is-saved" : ""}" data-style="${safeName}" type="button" aria-pressed="${saved}" title="${saved ? STR.unsaveTitle : STR.saveTitle}"><span class="save-icon" aria-hidden="true">${saved ? "★" : "☆"}</span><span class="save-label">${saved ? STR.saved : STR.save}</span></button>
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
    `;
    host.insertBefore(control, el.resultsGrid);

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
    valid.forEach((name) => {
      const style = stylesRegistry[name];
      let converted = "";
      if (inputText) {
        converted = applyFormatMarks(applyScope(inputText, style));
      }
      const decorated = converted ? applyDecoration(converted) : "";
      grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null, style));
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

    let count = 0;

    filtered.forEach(([name, style]) => {
      let converted = "";
      if (inputText) {
        converted = applyFormatMarks(applyScope(inputText, style));
      }

      const decorated = converted ? applyDecoration(converted) : "";
      grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null, style));
      count += 1;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "style-card";
      empty.innerHTML = `
        <div class="style-info">
          <p class="style-preview placeholder">${STR.noStyles}</p>
        </div>
      `;
      grid.appendChild(empty);
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

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "copy_text",
      copy_method: "button"
    });

    btn.textContent = STR.copied;
    btn.classList.add("copied");
    showCopyToast();
    setTimeout(() => {
      btn.textContent = STR.copy;
      btn.classList.remove("copied");
    }, 1500);
  } catch (err) {
    console.error("Copy failed:", err);
    btn.textContent = STR.failed;
    btn.classList.add("copy-error");
    setTimeout(() => {
      btn.textContent = STR.copy;
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
