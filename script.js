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

  // Shared namespace (also owned by game-rules.js / symbol-explorer.js). Used
  // to bridge the live decoration ("flair") state to the game name-checker.
  const UTG = (window.UltraTextGen = window.UltraTextGen || {});

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
          noStyles: "Aucun style trouvé. Essaie un autre filtre ou terme de recherche." },
    nl: { copy: "Kopieer", copied: "✓ Gekopieerd", failed: "✗ Mislukt", copyTitle: "Kopiëren naar klembord",
          save: "Bewaar", saved: "Bewaard", saveTitle: "Bewaar deze stijl", unsaveTitle: "Verwijder uit bewaarde stijlen",
          empty: "Typ hierboven iets…",
          noStyles: "Geen stijlen gevonden. Probeer een ander filter of zoekwoord." },
    es: { copy: "Copiar", copied: "✓ Copiado", failed: "✗ Falló", copyTitle: "Copiar al portapapeles",
          save: "Guardar", saved: "Guardado", saveTitle: "Guardar este estilo", unsaveTitle: "Quitar de los estilos guardados",
          empty: "Escribe algo arriba...",
          noStyles: "No se encontraron estilos. Prueba otro filtro o término de búsqueda." },
    de: { copy: "Kopieren", copied: "✓ Kopiert", failed: "✗ Fehlgeschlagen", copyTitle: "In die Zwischenablage kopieren",
          save: "Speichern", saved: "Gespeichert", saveTitle: "Diesen Stil speichern", unsaveTitle: "Aus gespeicherten Stilen entfernen",
          empty: "Tipp oben etwas ein...",
          noStyles: "Keine Stile gefunden. Probiere einen anderen Filter oder Suchbegriff." },
    it: { copy: "Copia", copied: "✓ Copiato", failed: "✗ Errore", copyTitle: "Copia negli appunti",
          save: "Salva", saved: "Salvato", saveTitle: "Salva questo stile", unsaveTitle: "Rimuovi dagli stili salvati",
          empty: "Scrivi qualcosa qui sopra...",
          noStyles: "Nessuno stile trovato. Prova un altro filtro o termine di ricerca." },
    pl: { copy: "Kopiuj", copied: "✓ Skopiowano", failed: "✗ Błąd", copyTitle: "Kopiuj do schowka",
          save: "Zapisz", saved: "Zapisano", saveTitle: "Zapisz ten styl", unsaveTitle: "Usuń z zapisanych stylów",
          empty: "Wpisz coś powyżej...",
          noStyles: "Nie znaleziono stylów. Spróbuj innego filtra lub hasła." },
    vi: { copy: "Sao chép", copied: "✓ Đã sao chép", failed: "✗ Thất bại", copyTitle: "Sao chép vào bộ nhớ tạm",
          save: "Lưu", saved: "Đã lưu", saveTitle: "Lưu kiểu chữ này", unsaveTitle: "Xóa khỏi kiểu chữ đã lưu",
          empty: "Nhập gì đó ở trên...",
          noStyles: "Không tìm thấy kiểu chữ nào. Thử bộ lọc hoặc từ khóa khác." }
  };
  const PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();

  // Read a nested window.UTG_I18N.ui.<dot.path> value, falling back to the
  // given English default when the locale fetch hasn't resolved yet (or
  // doesn't cover this key). Same shape as i18n.js's own nested-value lookup
  // and as this file's existing getCategoryTabLabel() (see "RENDER:
  // Decorations" below) — this is the generalized version of that pattern,
  // used for every other hardcoded string in this file. getCategoryTabLabel
  // itself is left as its own hand-written lookup, untouched.
  function uiText(path, fallback) {
    const i18n = window.UTG_I18N;
    if (!i18n || !i18n.ui) return fallback;
    const val = path.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), i18n.ui);
    return val != null ? val : fallback;
  }

  // UI_STRINGS above is the older, per-locale copy/save button dictionary —
  // it only covers 11 of the ~28 supported locales. window.UTG_I18N.ui.copyButtons
  // (populated once i18n.js's locale fetch resolves, see i18n.js) is the
  // newer, fuller-coverage source; when present its keys are merged over the
  // UI_STRINGS fallback tier so the other locales get real translations too,
  // without breaking the ones that already work via the old dictionary.
  function computeStr() {
    const fallback = UI_STRINGS[PAGE_LANG] || UI_STRINGS.en;
    const i18n = window.UTG_I18N;
    const localized = i18n && i18n.ui && i18n.ui.copyButtons;
    return localized ? Object.assign({}, fallback, localized) : fallback;
  }
  let STR = computeStr();

 /* ===================
   DATA: Decorations
   =================== */
const DEFAULT_DECORATIONS = {
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

// Page-specific decorations (window.UTG_DECORATIONS) are MERGED over the
// defaults rather than replacing them — so a game page can register one extra
// tab (e.g. `ff`) while keeping the Symbols / Minimal / Emoji defaults, with no
// duplicated data. Existing override pages are unaffected: their tab keys line
// up 1:1 with their own buttons, so the added default keys are simply
// unreachable, and any key they redefine (frames, dividers, minimal…) still
// wins because it is applied last.
const decorations = window.UTG_DECORATIONS
  ? Object.assign({}, DEFAULT_DECORATIONS, window.UTG_DECORATIONS)
  : DEFAULT_DECORATIONS;

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

  // Safe mode (F2) — cross-device render-safety. Opt-in per device, default
  // OFF so the normal experience is untouched and nothing is classified until
  // a user turns it on. When on, every style card carries a badge saying
  // whether the style is likely to show as blank boxes (▯) for the *recipient*
  // — the "blank boxes for other people" frustration, distinct from the
  // existing device probe (which tests the visitor's OWN device).
  const SAFE_MODE_KEY = "utg_safe_mode";
  let safeMode = loadSafeMode();

  // Demo text rendered through every style while the input is empty, so the
  // first paint shows the whole catalog styled instead of placeholder rows.
  // Two lines on purpose: the first-line scope and heading use cases read
  // naturally. Precedence: window.UTG_DEMO_TEXT (per-page override, set by
  // some pages explicitly and must keep winning) → window.UTG_I18N.ui.demoText
  // (locale default) → hardcoded English (final fallback).
  function computeDemoText() {
    return window.UTG_DEMO_TEXT ||
      uiText("demoText", "Welcome to UltraTextGen.\nType anything. Make it ultra.");
  }
  let DEMO_TEXT = computeDemoText();

  // Per-style copy counts + last-used timestamps, persisted per device.
  // Most-copied styles float to the top of the grid on the next render.
  const USAGE_KEY = "utg_style_usage";
  let styleUsage = loadStyleUsage();

  // Result-level sharing — the URL identifies a creation as ?q=<input> +
  // ?style=<slug> (the registry's stable per-style slug, never a translated
  // display name). When a visitor arrives on such a link, sharedStyleName
  // holds the registry key of that style so its card can be emphasized.
  const SHARE_STYLE_PARAM = "style";
  let sharedStyleName = null;
  let sharedCardRevealed = false;

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

  function loadSafeMode() {
    try {
      return localStorage.getItem(SAFE_MODE_KEY) === "true";
    } catch (err) {
      return false;
    }
  }

  function persistSafeMode() {
    try {
      localStorage.setItem(SAFE_MODE_KEY, safeMode ? "true" : "false");
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

  // Grapheme splitter (native) keeps a base char and its combining marks
  // together, so interleave never slices an accent off its letter.
  const flairSeg =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  function graphemes(str) {
    return flairSeg ? Array.from(flairSeg.segment(str), (s) => s.segment) : Array.from(str);
  }

  // Apply the selected flair to a rendered string.
  //   mode "wrap"       (default): prefix + text + suffix
  //   mode "space"      : also replace ASCII spaces with `fill` (an invisible
  //                       or decorative char) — for games that reject a plain
  //                       space in the name field (Free Fire, PUBG…)
  //   mode "interleave" : insert `sep` between graphemes, per line
  // Output is always paste-safe Unicode — no images, fonts, or dependencies.
  function applyDecoration(text) {
    if (!selectedDecoration || !text) return text;
    const d = selectedDecoration;
    let body = text;
    if (d.mode === "space") {
      body = body.replace(/ /g, d.fill || "ㅤ"); // U+3164 Hangul filler (invisible)
    } else if (d.mode === "interleave") {
      const sep = d.sep || "";
      body = body.split("\n").map((line) => graphemes(line).join(sep)).join("\n");
    }
    return (d.prefix || "") + body + (d.suffix || "");
  }

  // Bridge for the game name-checker (game-rules.js): the string a player will
  // actually paste is the typed name plus whatever flair is selected. Expose it
  // and fire an event on change, so the checker counts what really ships — a
  // frame like ꧁༒…༒꧂ that pushes a "fits" name over the limit now shows up.
  UTG.flairedMainInput = function () {
    return applyDecoration(el.mainInput ? el.mainInput.value : "");
  };
  function notifyFlairChange() {
    try {
      document.dispatchEvent(new CustomEvent("utg:flairchange"));
    } catch (e) {
      /* CustomEvent unsupported — checker falls back to the raw name */
    }
  }

  /* ===================
     RESULT SHARING (shared core)
     =================== */
  // Turn a creation (input + style) into a shareable URL and hand it to the
  // browser's native share sheet, falling back to copying the link. Exposed on
  // the shared UltraTextGen namespace so specialized generators can reuse the
  // same mechanism later without rebuilding it: callers (result cards today)
  // provide the creation state; this owns the act of sharing. Only `q` and
  // `style` go into the URL — the same params init() restores from.
  UTG.buildShareUrl = function (creation) {
    const c = creation || {};
    const params = new URLSearchParams();
    if (c.input) params.set("q", c.input);
    if (c.styleId) params.set(SHARE_STYLE_PARAM, c.styleId);
    const qs = params.toString();
    return window.location.origin + window.location.pathname + (qs ? "?" + qs : "");
  };

  // creation: { input, output, styleId, title, url? } — url wins when given.
  // Resolves to "native" | "aborted" | "copied" | "failed" so the caller owns
  // its own button feedback.
  UTG.shareCreation = async function (creation) {
    const c = creation || {};
    const url = c.url || UTG.buildShareUrl(c);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "share_text", share_method: navigator.share ? "native" : "link_copy" });

    if (navigator.share) {
      try {
        const payload = { title: c.title || document.title, url };
        // The styled output itself rides along where the share target shows
        // text — the recipient sees the creation, not just a bare link.
        if (c.output) payload.text = c.output;
        await navigator.share(payload);
        return "native";
      } catch (err) {
        if (err && err.name === "AbortError") return "aborted"; // user closed the sheet
        // Any other native failure falls through to the link-copy fallback.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch (err) {
      console.error("Share failed:", err);
      return "failed";
    }
  };

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

  /* ===================
     SAFE MODE (F2) — cross-device render classification
     ===================
     "Will this show as blank boxes (▯) for the person I paste it to?" — asked
     on every style page, so the logic lives here in the shared script and
     surfaces on all ~350 generator pages (opt-in; only runs when safe mode is
     on).

     Classification REUSES game-rules.js as the single source of truth for what
     counts as "safe Unicode": on game / nickname pages, where that engine is
     loaded, we call its classifyChar() directly (classifyCharSafe below), so
     there is exactly one active definition. game-rules.js is not on the other
     ~350 generator pages, so there we fall back to a lean classifier over the
     SAME styled-Unicode ranges — a deliberate, kept-in-sync mirror of
     game-rules' STYLED_RANGES, scoped to the characters our styles actually
     emit (alphabets), NOT a second, rival "what's safe" table. The gaming
     SAFE_SYMBOLS ornament allow-list is intentionally not mirrored: those
     glyphs (꧁ ༒ …) genuinely box for a general recipient, so leaving them to
     classify as risky here is the honest read, and copying that table would be
     the wasteful duplication we're avoiding. If game-rules is ever refactored,
     both should read one shared module. */

  // Mirror of game-rules.js STYLED_RANGES — kept identical on purpose. Blocks
  // whose letters render on essentially all *modern* devices, but can still box
  // on very old / low-Unicode Android system fonts.
  const SAFE_MODE_STYLED_RANGES = [
    [0x1d400, 0x1d7ff], [0x1d100, 0x1d1ff], [0x2460, 0x24ff],
    [0x1f100, 0x1f1ff], [0xff00, 0xffef], [0x1e00, 0x1eff],
    [0x0100, 0x024f], [0x0400, 0x04ff], [0x0250, 0x02af],
    [0x1d00, 0x1d7f], [0x02b0, 0x02ff], [0x1d2c, 0x1d6a],
    [0x2070, 0x209f], [0x0300, 0x036f], [0x3040, 0x30ff],
    [0x0e00, 0x0e7f], [0x0600, 0x06ff]
  ];
  // Additional widely-supported alphabet blocks that the general style
  // generator legitimately emits but game nicknames don't, so game-rules'
  // gaming-tuned list never needed them: Letterlike Symbols (script letters
  // ℯ ℊ ℬ ℰ …), Latin Extended-D (small-cap ꜰ ꜱ), Greek, and Currency. This is
  // a deliberate SUPERSET of game-rules' ranges — it only ever adds "safe"
  // blocks, never re-labels anything game-rules calls safe as risky, so it
  // cannot contradict game-rules. Without it, mainstream Script and Small Caps
  // would raise a false "may box" alarm on the very hub this cluster targets.
  const SAFE_MODE_EXTRA_RANGES = [
    [0x00a0, 0x00ff], // Latin-1 Supplement (superscript ¹²³, accents, £ ¥, ª º)
    [0x2100, 0x214f], // Letterlike Symbols (script-letter fallbacks, ™ ℠)
    [0xa720, 0xa7ff], // Latin Extended-D (small-caps ꜰ ꜱ and more)
    [0x0370, 0x03ff], // Greek and Coptic
    [0x20a0, 0x20bf]  // Currency Symbols
  ];
  function safeModeWideBlock(cp) {
    let i;
    for (i = 0; i < SAFE_MODE_STYLED_RANGES.length; i++) {
      if (cp >= SAFE_MODE_STYLED_RANGES[i][0] && cp <= SAFE_MODE_STYLED_RANGES[i][1]) return true;
    }
    for (i = 0; i < SAFE_MODE_EXTRA_RANGES.length; i++) {
      if (cp >= SAFE_MODE_EXTRA_RANGES[i][0] && cp <= SAFE_MODE_EXTRA_RANGES[i][1]) return true;
    }
    return false;
  }

  // Lean local classifier — returns the same class vocabulary
  // game-rules.classifyChar produces ("ascii" | "space" | "safe" | "styled" |
  // "emoji" | "unknown"), restricted to the branches a style's OUTPUT can hit.
  // Used only when the game-rules engine isn't on the page.
  function classifyCharLocal(ch) {
    const cp = ch.codePointAt(0);
    // All printable Basic Latin is universal for a *render-safety* question
    // (broader than game-rules' name-field isAsciiWord, which is a charset
    // policy, not a rendering one — punctuation like $ or & renders everywhere
    // even where a game name field would reject it).
    if (cp >= 0x20 && cp <= 0x7e) return "ascii";
    if (safeModeWideBlock(cp)) return "styled";
    if (cp >= 0x1f000 && cp <= 0x1faff) return "emoji";
    if (cp >= 0x2190 && cp <= 0x2bff) return "safe"; // arrows / geometry / blocks
    return "unknown";
  }
  function classifyCharSafe(ch) {
    // Reuse game-rules' engine as the shared classifier when it's on the page.
    if (UTG.gameRules && typeof UTG.gameRules.classifyChar === "function") {
      const cls = UTG.gameRules.classifyChar(ch);
      // game-rules' ranges are gaming-tuned and omit a few universally-supported
      // alphabet blocks the general generator emits (Latin-1 superscript ¹²³,
      // Letterlike script letters, small-cap ꜰ ꜱ). Rescue only a would-be
      // "unknown" into "styled" so the badge is calibrated identically on every
      // page — never downgrading anything game-rules already calls safe.
      if (cls === "unknown") {
        const cp = ch.codePointAt(0);
        if ((cp >= 0x20 && cp <= 0x7e) || safeModeWideBlock(cp)) return "styled";
      }
      return cls;
    }
    return classifyCharLocal(ch);
  }

  // Worst render-safety severity of a style's own output, 0..3. Deterministic
  // per style, so cached — the classification never runs on the default
  // (safe-mode-off) path. A mixed probe exercises the letter + digit maps.
  //   0 universal  — plain ASCII only (case converters): renders literally everywhere
  //   1 wide       — remapped Unicode alphabets: renders on modern devices, may box on very old phones
  //   2 emoji      — contains emoji: can look different / box on old devices
  //   3 risk       — contains rare characters that may show as boxes for some people
  const SAFE_MODE_PROBE = "Sample Text 123";
  const coverageCache = {};
  function styleCoverage(name, style) {
    if (name in coverageCache) return coverageCache[name];
    let worst = 0;
    try {
      const out = (Render && typeof Render.renderAny === "function")
        ? String(Render.renderAny(SAFE_MODE_PROBE, style) || "")
        : "";
      for (const ch of out) {
        if (ch === " " || ch === "\n" || ch === "\t") continue;
        const cls = classifyCharSafe(ch);
        const sev = cls === "unknown" ? 3 : cls === "emoji" ? 2
          : (cls === "styled" || cls === "safe") ? 1 : 0;
        if (sev > worst) worst = sev;
        if (worst === 3) break;
      }
    } catch (err) {
      worst = 1; // couldn't classify → treat as ordinary Unicode, don't cry wolf
    }
    coverageCache[name] = worst;
    return worst;
  }

  // The safe-mode coverage badge. Quiet, muted states for the common cases
  // (reusing .ts-pill-safe, borderless on cards) so there's no alarm-fatigue;
  // the genuine box-risk states keep the prominent boxed .ts-pill-risk.
  function coverageBadgeHtml(name, style) {
    const w = styleCoverage(name, style);
    if (w >= 3) {
      const title = uiText("safetyBadges.boxesWarningTitle", "This style uses rare Unicode characters that some phones and older devices don't include a glyph for. It can show as boxes (▯) for the person you paste it to. Prefer a plain or wide-support style if your audience may be on older devices.");
      const label = uiText("safetyBadges.boxesWarning", "⚠ May show as boxes for some people");
      return `<span class="ts-pill ts-pill-risk" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
    }
    if (w === 2) {
      const title = uiText("safetyBadges.emojiWarningTitle", "This style includes emoji. Emoji render on modern devices but can look different, or show as boxes, on very old phones.");
      const label = uiText("safetyBadges.emojiWarning", "⚠ Uses emoji — may vary on old devices");
      return `<span class="ts-pill ts-pill-risk" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
    }
    if (w === 1) {
      const title = uiText("safetyBadges.modernDevicesTitle", "These styled Unicode letters display on all current phones and computers. On very old Android (roughly pre-2016) or minimal system fonts, a few may still show as boxes (▯). Test first if your audience uses older devices.");
      const label = uiText("safetyBadges.modernDevices", "Renders on modern devices");
      return `<span class="ts-pill ts-pill-safe" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
    }
    const title = uiText("safetyBadges.rendersEverywhereTitle", "This style is plain text — it renders everywhere, with no risk of boxes on any device.");
    const label = uiText("safetyBadges.rendersEverywhere", "✓ Renders everywhere");
    return `<span class="ts-pill ts-pill-safe" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
  }

  // Compact per-card trust signal built from the style's own `platforms`
  // data plus the device glyph probe. Tooltips carry the honest caveats no
  // competitor surfaces (platform filters, screen readers, tofu boxes).
  function safetyPillHtml(name, style) {
    if (!style) return "";
    const glyph = sampleGlyph(style);
    if (glyph && !deviceRendersGlyph(glyph)) {
      const title = uiText("safetyBadges.deviceWarningTitle", "Your device's fonts can't display this style — it may show as boxes (□). It can still look fine on other devices.");
      const label = uiText("safetyBadges.deviceWarning", "⚠ May not show on your device");
      return `<span class="ts-pill ts-pill-risk" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
    }
    // Safe mode on → answer the cross-device "will this box for others?"
    // question with a coverage badge (supersedes the platform hints below,
    // which it subsumes). Off → nothing changes here.
    if (safeMode) {
      return coverageBadgeHtml(name, style);
    }
    const platforms = Array.isArray(style.platforms) ? style.platforms : null;
    // Pages that render the platform chip row already say where a style
    // works — only the device warning above adds signal there.
    if (window.UTG_SHOW_PLATFORMS && platforms && platforms.length) return "";
    if (platforms && platforms.includes("all")) {
      const title = uiText("safetyBadges.safeAnywhereTitle", "Renders on all major platforms. Heads up: screen readers may spell styled letters out character by character, so keep body text plain.");
      const label = uiText("safetyBadges.safeAnywhere", "✓ Safe anywhere");
      return `<span class="ts-pill ts-pill-safe" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
    }
    if (platforms && platforms.length) {
      const names = platforms.map((p) => PLATFORM_LABELS[p]).filter(Boolean).join(", ");
      const label = uiText("safetyBadges.worksBestOn", "⚠ Works best on {platforms}").replace("{platforms}", names);
      const title = uiText("safetyBadges.worksBestOnTitle", "Best on: {platforms}. Other platforms may strip or garble it — paste a test first.").replace("{platforms}", names);
      return `<span class="ts-pill ts-pill-risk" title="${safeAttr(title)}">${escapeHtml(label)}</span>`;
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

    // Result-level sharing: every card carries its own Share, bound to this
    // exact creation (input + this style) via data-style — never a generic
    // page link. Disabled alongside Copy while the card is only a demo.
    const isShared = sharedStyleName === name;
    if (isShared) card.classList.add("is-shared");
    const sharedTagHtml = isShared
      ? ` <span class="style-tag shared-style-tag">${escapeHtml(uiText("shareResult.sharedTag", "Shared style"))}</span>`
      : "";
    const shareLabel = uiText("shareResult.label", "Share");
    const shareTitle = uiText("shareResult.title", "Share this result — the link opens with your text in this style");
    const shareAria = uiText("shareResult.ariaLabel", "Share {style} result").replace("{style}", name);

    card.innerHTML = `
      <div class="style-info">
        <p class="style-name">${name}${sharedTagHtml}</p>
         ${style?.note ? `<p class="style-note">${style.note}</p>` : ""}
        <p class="style-preview ${!convertedText ? "placeholder" : ""}">${convertedText || STR.empty}</p>
        ${decoHtml}
        ${safetyPillHtml(name, style)}
        ${platformChipsHtml(style)}
      </div>
      <div class="style-actions-stack">
        <div class="style-actions">
          <button class="copy-btn" data-text="${safeText}" ${!fullText ? "disabled" : ""} title="${STR.copyTitle}">${STR.copy} <kbd class="copy-kbd">↵</kbd></button>
          <button class="save-btn ${saved ? "is-saved" : ""}" data-style="${safeName}" type="button" aria-pressed="${saved}" title="${saved ? STR.unsaveTitle : STR.saveTitle}"><span class="save-icon" aria-hidden="true">${saved ? "★" : "☆"}</span><span class="save-label">${saved ? STR.saved : STR.save}</span></button>
        </div>
        <button class="share-result-btn" data-style="${safeName}" type="button" ${!fullText ? "disabled" : ""} title="${safeAttr(shareTitle)}" aria-label="${safeAttr(shareAria)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684m0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684"/></svg><span class="share-result-label">${escapeHtml(shareLabel)}</span>
        </button>
      </div>
    `;

    return card;
  }

  /* ===================
     RENDER: Decorations
     =================== */
  // Translated label for a category tab, with English fallback. Reads the
  // object i18n.js stores on window.UTG_I18N once its locale fetch resolves
  // (see i18n.js's "utg:i18nready" event) — on the English site that fetch
  // never happens, window.UTG_I18N stays undefined, and category.label (the
  // English text from fonts.json) is used unchanged.
  function getCategoryTabLabel(key, category) {
    const i18n = window.UTG_I18N;
    const translated = i18n && i18n.ui && i18n.ui.categoryTabs && i18n.ui.categoryTabs[key];
    return translated || category.label;
  }

  function categoryTabText(key, category) {
    const label = getCategoryTabLabel(key, category);
    return category.icon ? `${category.icon} ${label}` : label;
  }

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
      const tabText = categoryTabText(key, category);

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

        tab.dataset.categoryId = key;
        tab.textContent = tabText;
      } else {
        // Homepage mode: render as buttons with click handlers
        tab = document.createElement("button");
        tab.className = "category-tab";
        if (isActive) {
          tab.classList.add("active");
        }
        tab.dataset.category = key;
        tab.dataset.categoryId = key;
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

  // i18n.js's translation fetch is async and may resolve after this page has
  // already rendered category tabs once with the English fallback labels.
  // Rather than tearing the tabs down and rebuilding them (which would drop
  // the collapse/"More" state and cause a jarring re-flow), just swap each
  // existing tab's text in place once the translations land.
  function updateCategoryTabLabels() {
    if (!fontCategories) return;
    const tabsContainer = $("#categoryTabs");
    if (!tabsContainer) return;

    $$(".category-tab[data-category-id]", tabsContainer).forEach((tab) => {
      const key = tab.dataset.categoryId;
      const category = fontCategories.categories[key];
      if (!category) return;
      tab.textContent = categoryTabText(key, category);
    });
  }

  // On English pages i18n.js returns early and never fetches, so this event
  // never fires and tabs stay exactly as rendered (English) — zero behavior
  // change there.
  document.addEventListener("utg:i18nready", updateCategoryTabLabels);

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
    moreBtn.textContent = uiText("categoryTabsToggle.more", "More");
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
        moreBtn.textContent = uiText("categoryTabsToggle.less", "Less");
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
    if (window.UTG_DECORATOR_MODE) return;
    if (window.UTG_TATTOO_MODE) return;
    if (window.UTG_SCROLL_MODE) return;
    if (window.UTG_REPEAT_MODE) return;
    if (window.UTG_CURSIVE_MODE) return;
    if (window.UTG_EVENT_MODE) return;
    if (!el.decorationGrid) return;

    const grid = el.decorationGrid;
    grid.innerHTML = "";

    const clearBtn = document.createElement("span");
    clearBtn.className = "clear-decoration";
    clearBtn.textContent = "✕ " + uiText("decorationsNone", "None");
    clearBtn.addEventListener("click", () => {
      selectedDecoration = null;
      $$(".decoration-item").forEach((i) => i.classList.remove("selected"));
      renderResults();
      notifyFlairChange();
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
        notifyFlairChange();
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
    if (window.UTG_VERTICAL_MODE || window.UTG_ZALGO_MODE || window.UTG_DECORATOR_MODE || window.UTG_TATTOO_MODE || window.UTG_CURSIVE_MODE || window.UTG_EVENT_MODE || window.UTG_SCROLL_MODE || window.UTG_REPEAT_MODE) return null;
    if (!el.resultsGrid) return null;

    let control = $("#scopeControl");
    if (control) return control;

    const host = el.resultsGrid.parentElement;
    if (!host) return null;

    control = document.createElement("div");
    control.className = "scope-control";
    control.id = "scopeControl";
    const scopeLabel = uiText("scopeControl.label", "Apply style to");
    const scopeAriaLabel = uiText("scopeControl.ariaLabel", "Choose how much text to style");
    const wholeText = uiText("scopeControl.whole", "Whole text");
    const wholeTitle = uiText("scopeControl.wholeTitle", "Style every line of your text.");
    const firstLineText = uiText("scopeControl.firstLine", "First line only");
    const firstLineTag = uiText("scopeControl.firstLineTag", "for posts");
    const firstLineTitle = uiText("scopeControl.firstLineTitle", "Style only the first line (your headline or hook) and leave the rest as plain, readable text — ideal for social posts.");
    // Sharing is a per-result action now (each card's own Share button, see
    // createStyleCard) — the scope row stays focused on how much text gets
    // styled, so the old page-level Share button is gone by design.
    control.innerHTML = `
      <span class="scope-control-label">${escapeHtml(scopeLabel)}</span>
      <div class="scope-chips" role="group" aria-label="${safeAttr(scopeAriaLabel)}">
        <button class="scope-chip${currentScope === "whole" ? " active" : ""}" type="button" data-scope="whole" title="${safeAttr(wholeTitle)}">${escapeHtml(wholeText)}</button>
        <button class="scope-chip${currentScope === "first-line" ? " active" : ""}" type="button" data-scope="first-line" title="${safeAttr(firstLineTitle)}">${escapeHtml(firstLineText)} <span class="scope-chip-tag">${escapeHtml(firstLineTag)}</span></button>
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
    if (window.UTG_VERTICAL_MODE || window.UTG_ZALGO_MODE || window.UTG_DECORATOR_MODE || window.UTG_TATTOO_MODE || window.UTG_CURSIVE_MODE || window.UTG_EVENT_MODE || window.UTG_SCROLL_MODE || window.UTG_REPEAT_MODE) return null;
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

  // Lazily inject the "Safe mode" toggle (F2) above the results grid. Present
  // on every standard generator page (same gating as the scope control) via
  // this JS injection — no per-page HTML edit, the same "build once in the
  // shared script, appears everywhere" pattern as the scope / format / word
  // counter rows. Default OFF, so cards render exactly as before until toggled.
  function ensureSafeModeControl() {
    if (window.UTG_VERTICAL_MODE || window.UTG_ZALGO_MODE || window.UTG_DECORATOR_MODE || window.UTG_TATTOO_MODE || window.UTG_CURSIVE_MODE || window.UTG_EVENT_MODE || window.UTG_SCROLL_MODE || window.UTG_REPEAT_MODE) return null;
    if (!el.resultsGrid) return null;

    let control = $("#safeModeControl");
    if (control) return control;

    const host = el.resultsGrid.parentElement;
    if (!host) return null;

    control = document.createElement("div");
    control.className = "safemode-control";
    control.id = "safeModeControl";
    const safeModeLabel = uiText("safeMode.label", "Paste safety");
    const safeModeAriaLabel = uiText("safeMode.ariaLabel", "Check which styles render on other people's devices");
    const safeModeToggleLabel = uiText("safeMode.toggleLabel", "Safe mode");
    const safeModeHint = uiText("safeMode.hint", "Flags styles that may show as boxes (▯) on other people's older phones.");
    control.innerHTML = `
      <span class="safemode-control-label">${escapeHtml(safeModeLabel)}</span>
      <div class="safemode-chips" role="group" aria-label="${safeAttr(safeModeAriaLabel)}">
        <button class="safemode-chip${safeMode ? " active" : ""}" type="button" data-safemode aria-pressed="${safeMode}">
          <span class="safemode-chip-dot" aria-hidden="true"></span>${escapeHtml(safeModeToggleLabel)}
        </button>
      </div>
      <span class="safemode-hint">${escapeHtml(safeModeHint)}</span>
    `;
    // Sit after the format control if present, else after the scope control,
    // else straight above the grid.
    const formatControl = $("#formatControl");
    const scopeControl = $("#scopeControl");
    const anchor = (formatControl && formatControl.parentElement === host && formatControl) ||
      (scopeControl && scopeControl.parentElement === host && scopeControl) || null;
    if (anchor) {
      host.insertBefore(control, anchor.nextSibling);
    } else {
      host.insertBefore(control, el.resultsGrid);
    }

    const chip = $(".safemode-chip", control);
    if (chip) {
      chip.addEventListener("click", () => {
        safeMode = !safeMode;
        persistSafeMode();
        chip.classList.toggle("active", safeMode);
        chip.setAttribute("aria-pressed", String(safeMode));

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "set_safe_mode", on: safeMode });

        renderSavedStyles();
        renderResults();
      });
    }

    return control;
  }

  // Live word/character stats under the main input. charCount/charCountWrapper
  // already show a bare "n/max" limit indicator inside the box (kept as-is);
  // this adds the word count competitors bundle next to their font tools
  // (see word-counter / character-counter search demand) as one small line
  // right under the input, on every page that shares this generator — no
  // per-page markup needed since it's anchored off #mainInput itself.
  function ensureTextStats() {
    if (!el.mainInput) return null;
    let bar = $("#textStatsBar");
    if (bar) return bar;

    const anchor = el.mainInput.parentElement;
    if (!anchor || !anchor.parentNode) return null;

    bar = document.createElement("div");
    bar.className = "text-stats-bar";
    bar.id = "textStatsBar";
    bar.hidden = true;
    const zeroWords = uiText("textStats.wordPlural", "{n} words").replace("{n}", "0");
    const zeroChars = uiText("textStats.charPlural", "{n} characters").replace("{n}", "0");
    bar.innerHTML =
      `<span id="textStatsWords">${escapeHtml(zeroWords)}</span>` +
      '<span class="text-stats-sep" aria-hidden="true">·</span>' +
      `<span id="textStatsChars">${escapeHtml(zeroChars)}</span>`;
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);

    el.textStatsBar = bar;
    el.textStatsWords = $("#textStatsWords", bar);
    el.textStatsChars = $("#textStatsChars", bar);
    return bar;
  }

  function applyTextStats(val) {
    if (!el.textStatsBar) return;
    const trimmed = val.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = Array.from(val).length;
    el.textStatsBar.hidden = chars === 0;
    el.textStatsWords.textContent = words === 1
      ? uiText("textStats.wordSingular", "1 word")
      : uiText("textStats.wordPlural", "{n} words").replace("{n}", String(words));
    el.textStatsChars.textContent = chars === 1
      ? uiText("textStats.charSingular", "1 character")
      : uiText("textStats.charPlural", "{n} characters").replace("{n}", String(chars));
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
    section.setAttribute("aria-label", uiText("savedStyles.ariaLabel", "Your saved styles"));
    section.hidden = true;
    const savedHeading = uiText("savedStyles.heading", "Your saved styles");
    const savedClearAll = uiText("savedStyles.clearAll", "Clear all");
    const savedHint = uiText("savedStyles.hint", "Saved on this device — they'll be waiting here when you come back.");
    section.innerHTML = `
      <div class="saved-header">
        <h2 class="saved-title">★ ${escapeHtml(savedHeading)}</h2>
        <button class="saved-clear" id="savedClearBtn" type="button">${escapeHtml(savedClearAll)}</button>
      </div>
      <p class="saved-hint">${escapeHtml(savedHint)}</p>
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
    if (window.UTG_DECORATOR_MODE) return;
    if (window.UTG_TATTOO_MODE) return;
    if (window.UTG_SCROLL_MODE) return;
    if (window.UTG_REPEAT_MODE) return;
    if (window.UTG_CURSIVE_MODE) return;
    if (window.UTG_EVENT_MODE) return;
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
    if (window.UTG_DECORATOR_MODE) return;
    if (window.UTG_TATTOO_MODE) return;
    if (window.UTG_SCROLL_MODE) return;
    if (window.UTG_REPEAT_MODE) return;
    if (window.UTG_CURSIVE_MODE) return;
    if (window.UTG_EVENT_MODE) return;
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
          <p class="style-preview placeholder">${STR.noStyles}</p>
        </div>
      `;
      grid.appendChild(empty);
    }

    maybeRevealSharedCard(grid);
  }

  // First time the shared result's card lands in the grid, bring it into view
  // and pulse its emphasis once — after that the card just keeps its subtle
  // is-shared border (re-applied by createStyleCard on every rerender) while
  // the recipient browses, edits, and shares normally.
  function maybeRevealSharedCard(grid) {
    if (!sharedStyleName || sharedCardRevealed) return;
    const card = $(".style-card.is-shared", grid);
    if (!card) return;
    sharedCardRevealed = true;
    setTimeout(() => {
      // A rerender (e.g. the async i18n pass) can replace the grid before
      // this fires — release the flag so the next render retries the reveal.
      if (!card.isConnected) {
        sharedCardRevealed = false;
        return;
      }
      const rect = card.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const fullyVisible = rect.top >= 0 && rect.bottom <= viewportH;
      if (!fullyVisible && card.scrollIntoView) {
        card.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      card.classList.add("shared-reveal");
      setTimeout(() => card.classList.remove("shared-reveal"), 2400);
    }, 150);
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

    // Analytics: one generate_text per page session, ~800ms after the visitor
    // stops typing. The generator renders on every keystroke, so the event has
    // to mean "someone used it", not "renderResults() ran".
    let generateEventSent = false;
    const queueGenerateEvent = debounce(() => {
      const len = el.mainInput.value.trim().length;
      if (generateEventSent || len < 2) return;
      generateEventSent = true;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "generate_text",
        input_length: len,
        locale: PAGE_LANG
      });
    }, 800);

    // Only a real change to the text counts. A ?q= link fills the field before
    // any listener is bound, and several pages dispatch a synthetic "input" on
    // #mainInput purely to force a re-render (the mood tabs on
    // category/classified and usecase/bio-font, before-after-emoji's arc
    // switcher) — neither is generator use. Quick-fill chips, which do change
    // the text, still count.
    let lastTrackedValue = el.mainInput ? el.mainInput.value : "";
    function trackGenerateUse() {
      const val = el.mainInput.value;
      if (generateEventSent || val === lastTrackedValue) return;
      lastTrackedValue = val;
      if (val.trim().length >= 2) queueGenerateEvent();
    }

    function syncInputUI() {
      const val = el.mainInput.value;
      const len = val.length;
      if (el.charCount) el.charCount.textContent = String(len);
      if (el.charCountWrapper) el.charCountWrapper.hidden = len === 0;
      if (el.inputClearBtn) el.inputClearBtn.hidden = len === 0;
      applyTextStats(val);
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
        trackGenerateUse();
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
        trackGenerateUse();
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
        notifyFlairChange();
      });
    });

    // "Surprise" — one tap generates a full ready-to-paste name: a random flair
    // from the active tab applied across the grid, then a random styled card
    // copied to the clipboard (reusing the normal copy path + toast). Generative
    // selection, deterministic paste-safe output.
    const surpriseBtn = $("#surpriseBtn");
    if (surpriseBtn) {
      surpriseBtn.addEventListener("click", () => {
        const list = decorations[currentDecoTab] || [];
        if (list.length) {
          selectedDecoration =
            UTG.flair && UTG.flair.pickRandom
              ? UTG.flair.pickRandom(list)
              : list[Math.floor(Math.random() * list.length)];
          renderDecorations();
        }
        renderResults();
        notifyFlairChange();
        // Copy a random result so one tap yields a finished name. Falls back
        // silently when the input is empty (every card is a disabled demo).
        const copyable = $$("#resultsGrid .copy-btn:not([disabled])");
        if (copyable.length) {
          const pick = copyable[Math.floor(Math.random() * copyable.length)];
          if (pick.scrollIntoView) pick.scrollIntoView({ block: "center", behavior: "smooth" });
          const card = pick.closest(".style-card");
          if (card) {
            card.classList.add("surprise-hit");
            setTimeout(() => card.classList.remove("surprise-hit"), 1200);
          }
          pick.click();
        }
      });
    }

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

    btn.textContent = STR.copied;
    btn.classList.add("copied");
    showCopyToast();
    setTimeout(() => {
      btn.textContent = STR.copy;
      btn.classList.remove("copied");
    }, 1500);

    // Copy is the "I like this one" moment — briefly point the same card's
    // Share label at sharing this exact creation. Label-only swap, no new
    // elements, so the card's layout doesn't move.
    const copiedCard = btn.closest(".style-card");
    if (copiedCard) nudgeShareAfterCopy(copiedCard);
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

// Per-result Share — delegated like copy/save, so it needs no per-card
// listeners, carries no IDs, and survives every rerender. The card only
// provides the creation state (its style via data-style, the live input);
// UTG.shareCreation owns the act of sharing.
function nudgeShareAfterCopy(card) {
  const shareBtn = $(".share-result-btn", card);
  if (!shareBtn || shareBtn.disabled || shareBtn.classList.contains("copied")) return;
  const label = $(".share-result-label", shareBtn);
  if (!label) return;
  label.textContent = uiText("shareResult.afterCopy", "Share this style");
  setTimeout(() => {
    if (!label.isConnected || shareBtn.classList.contains("copied")) return;
    label.textContent = uiText("shareResult.label", "Share");
  }, 2500);
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest ? e.target.closest(".share-result-btn") : null;
  if (!btn || btn.disabled) return;

  const name = btn.dataset.style || "";
  const style = stylesRegistry[name];
  if (!style) return;

  const input = el.mainInput ? el.mainInput.value : "";
  const converted = applyFormatMarks(applyScope(input, style));
  const output = selectedDecoration ? applyDecoration(converted) : converted;

  const outcome = await UTG.shareCreation({
    input,
    output,
    styleId: style.slug,
    title: document.title
  });

  const label = $(".share-result-label", btn);
  if (outcome === "copied") {
    btn.classList.add("copied");
    if (label) label.textContent = uiText("shareResult.linkCopied", "Link copied");
    setTimeout(() => {
      btn.classList.remove("copied");
      if (label && label.isConnected) label.textContent = uiText("shareResult.label", "Share");
    }, 1500);
  } else if (outcome === "failed") {
    btn.classList.add("share-error");
    if (label) label.textContent = STR.failed;
    setTimeout(() => {
      btn.classList.remove("share-error");
      if (label && label.isConnected) label.textContent = uiText("shareResult.label", "Share");
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
     RUNTIME I18N PATCH-ON-ARRIVAL
     =================== */
  // Everything else in this file that's hardcoded English, beyond the
  // per-category tab labels getCategoryTabLabel/updateCategoryTabLabels
  // already handle above (left untouched). Same reasoning as that pair:
  // i18n.js's locale fetch is async, so anything already painted before it
  // resolves used the English fallback via uiText()/computeStr()/
  // computeDemoText() above. The scope control, safe-mode control, and
  // saved-styles section are singleton controls built once and never torn
  // down (their ensure*() functions no-op on repeat calls), so they need
  // their static text patched in place here. The results grid, saved grid,
  // and decoration chips are already fully torn down and rebuilt on almost
  // every user interaction elsewhere in this file (scope/format/safe-mode
  // toggles, typing, decoration picks), so a plain re-render is enough for
  // those — no special-case DOM patching needed, and it picks up the
  // localized copy/save button chrome, safety badges, empty/no-styles
  // placeholders, and demo text all at once.
  //
  // On the English site window.UTG_I18N is never set and this event never
  // fires (see i18n.js's init(), which returns early for lang === "en"), so
  // none of this ever runs there — zero behavior change.
  function applyRuntimeI18nUpdates() {
    STR = computeStr();
    DEMO_TEXT = computeDemoText();

    const scopeControl = $("#scopeControl");
    if (scopeControl) {
      const label = $(".scope-control-label", scopeControl);
      if (label) label.textContent = uiText("scopeControl.label", "Apply style to");
      const chipsGroup = $(".scope-chips", scopeControl);
      if (chipsGroup) chipsGroup.setAttribute("aria-label", uiText("scopeControl.ariaLabel", "Choose how much text to style"));
      const wholeBtn = $('[data-scope="whole"]', scopeControl);
      if (wholeBtn) {
        wholeBtn.title = uiText("scopeControl.wholeTitle", "Style every line of your text.");
        wholeBtn.textContent = uiText("scopeControl.whole", "Whole text");
      }
      const firstLineBtn = $('[data-scope="first-line"]', scopeControl);
      if (firstLineBtn) {
        firstLineBtn.title = uiText("scopeControl.firstLineTitle",
          "Style only the first line (your headline or hook) and leave the rest as plain, readable text — ideal for social posts.");
        const firstTextNode = Array.from(firstLineBtn.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
        if (firstTextNode) firstTextNode.textContent = uiText("scopeControl.firstLine", "First line only") + " ";
        const tag = $(".scope-chip-tag", firstLineBtn);
        if (tag) tag.textContent = uiText("scopeControl.firstLineTag", "for posts");
      }
    }

    const safeModeControl = $("#safeModeControl");
    if (safeModeControl) {
      const label = $(".safemode-control-label", safeModeControl);
      if (label) label.textContent = uiText("safeMode.label", "Paste safety");
      const chipsGroup = $(".safemode-chips", safeModeControl);
      if (chipsGroup) chipsGroup.setAttribute("aria-label", uiText("safeMode.ariaLabel", "Check which styles render on other people's devices"));
      const chip = $(".safemode-chip", safeModeControl);
      if (chip) {
        const textNode = Array.from(chip.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = uiText("safeMode.toggleLabel", "Safe mode");
      }
      const hint = $(".safemode-hint", safeModeControl);
      if (hint) hint.textContent = uiText("safeMode.hint", "Flags styles that may show as boxes (▯) on other people's older phones.");
    }

    const savedSection = $("#savedSection");
    if (savedSection) {
      savedSection.setAttribute("aria-label", uiText("savedStyles.ariaLabel", "Your saved styles"));
      const title = $(".saved-title", savedSection);
      if (title) title.textContent = "★ " + uiText("savedStyles.heading", "Your saved styles");
      const clearBtn = $("#savedClearBtn", savedSection);
      if (clearBtn) clearBtn.textContent = uiText("savedStyles.clearAll", "Clear all");
      const hint = $(".saved-hint", savedSection);
      if (hint) hint.textContent = uiText("savedStyles.hint", "Saved on this device — they'll be waiting here when you come back.");
    }

    if (el.textStatsBar) {
      applyTextStats(el.mainInput ? el.mainInput.value : "");
    }

    const moreBtn = $("#categoryTabs .category-more");
    if (moreBtn) {
      const tabsContainer = $("#categoryTabs");
      const expanded = tabsContainer && tabsContainer.classList.contains("expanded");
      moreBtn.textContent = expanded
        ? uiText("categoryTabsToggle.less", "Less")
        : uiText("categoryTabsToggle.more", "More");
    }

    // Re-render the pieces that are already idempotently rebuilt elsewhere in
    // this file — picks up the localized "None" chip, copy/save button
    // chrome, safety badges, empty/no-styles placeholders, and demo text.
    renderDecorations();
    renderSavedStyles();
    renderResults();
  }

  document.addEventListener("utg:i18nready", applyRuntimeI18nUpdates);

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

    // Restore the shared style from the URL ?style= param (result-level share
    // links). Matched against the registry's stable slugs only — an unknown or
    // stale identifier is simply ignored (the generator opens normally), and
    // the raw param value is never rendered into the page.
    const urlStyle = new URLSearchParams(window.location.search).get(SHARE_STYLE_PARAM);
    if (urlStyle) {
      const slug = String(urlStyle).toLowerCase().replace(/_/g, "-");
      for (const [name, style] of Object.entries(stylesRegistry)) {
        if (style && style.slug === slug) {
          sharedStyleName = name;
          break;
        }
      }
      // The homepage's default "Popular" tab could filter the shared card out
      // of the grid entirely — start unfiltered there (same as family-scoped
      // pages already do) so the shared result is guaranteed to render.
      if (sharedStyleName && !categoryMatch && currentCategory === "popular") {
        currentCategory = null;
      }
    }

    ensureTextStats();
    bindEvents();

    if (el.charCount && el.mainInput) {
      const initVal = el.mainInput.value;
      const initLen = initVal.length;
      el.charCount.textContent = String(initLen);
      if (el.charCountWrapper) el.charCountWrapper.hidden = initLen === 0;
      if (el.inputClearBtn) el.inputClearBtn.hidden = initLen === 0;
      applyTextStats(initVal);
    }

    renderDecorations();
    ensureScopeControl();
    ensureFormatControl();
    ensureSafeModeControl();
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
