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
const decorations = {
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
  const currentPlatform = (window.UTG_PLATFORM || "all").toLowerCase();
  const currentFamily = (window.UTG_FAMILY || "all").toLowerCase();
  const currentGroup = (window.UTG_GROUP || "all").toLowerCase();
  
  // Category URL pattern for detecting category pages
  const CATEGORY_URL_PATTERN = /^\/category\/([^\/]+)\/?/;
  
  // Detect category from URL if on a category page
  const categoryMatch = window.location.pathname.match(CATEGORY_URL_PATTERN);
  let currentCategory = categoryMatch ? categoryMatch[1] : "popular";
  
  let currentDecoTab = "symbols";
  let selectedDecoration = null;
  let searchQuery = "";
  let fontCategories = null;
  let categoryFontMap = {};

  /* ===================
     ELEMENTS
     =================== */
  const el = {
    mainInput: $("#mainInput"),
    charCount: $("#charCount"),
    searchInput: $("#searchInput"),
    resultsGrid: $("#resultsGrid"),
    decorationGrid: $("#decorationGrid"),
    compatNotice: $("#compatNotice"),
    compatText: $("#compatText"),
    darkModeBtn: $("#darkModeBtn")
  };

  /* ===================
     HELPERS
     =================== */
  function safeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  function applyDecoration(text) {
    if (!selectedDecoration || !text) return text;
    return selectedDecoration.prefix + text + selectedDecoration.suffix;
  }

  function getPlatformLabel(platformKey) {
    const names = {
      instagram: "Instagram",
      tiktok: "TikTok",
      x: "X (Twitter)",
      whatsapp: "WhatsApp",
      discord: "Discord",
      all: "All"
    };
    return names[platformKey] || platformKey;
  }

 function isStylePlatformCompatible(style, platformKey) {
    const platforms = style.platforms || ["all"];
    if (platformKey === "all") return true;
    return platforms.includes(platformKey);
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

  function createStyleCard(name, convertedText, decoratedText, style, isSponsored = false) {
    const card = document.createElement("div");
    card.className = "style-card" + (isSponsored ? " sponsored-card" : "");

    const fullText = decoratedText || convertedText;
    const safeText = safeAttr(fullText);

    let decoHtml = "";
    if (selectedDecoration && convertedText) {
      decoHtml = `<div class="style-decoration">${decoratedText}</div>`;
    }

    card.innerHTML = `
      <div class="style-info">
        <p class="style-name">
          ${name}
          ${isSponsored ? '<span class="sponsored-label">Sponsored</span>' : ""}
        </p>
         ${style?.note ? `<p class="style-note">${style.note}</p>` : ""}
        <p class="style-preview ${!convertedText ? "placeholder" : ""}">${convertedText || "Type something above..."}</p>
        ${decoHtml}
      </div>
      <button class="copy-btn" data-text="${safeText}" ${!fullText ? "disabled" : ""}>Copy</button>
    `;

    return card;
  }

  function createAdCard() {
    const adCard = document.createElement("div");
    adCard.className = "style-card sponsored-card";
    adCard.innerHTML = `
      <div class="style-info">
        <p class="style-name"><span class="sponsored-label">Sponsored</span></p>
        <p class="style-preview placeholder">Ad content here</p>
      </div>
    `;
    return adCard;
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
      // Reveal all tabs and remove the More button
      hiddenTabs.forEach(h => {
        h.style.display = "";
        h.removeAttribute("aria-hidden");
        h.classList.remove("hidden-category");
      });
      moreBtn.remove();
      tabsContainer.classList.add("expanded");
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
     RENDER: Results
     =================== */
  function renderResults() {
    if (!el.resultsGrid) return;

    const grid = el.resultsGrid;
    const inputText = el.mainInput ? el.mainInput.value : "";

    grid.innerHTML = "";

    if (el.compatNotice && el.compatText) {
      if (currentPlatform !== "all") {
        el.compatNotice.style.display = "flex";
        el.compatText.textContent = `Showing styles optimized for ${getPlatformLabel(currentPlatform)}`;
      } else {
        el.compatNotice.style.display = "none";
      }
    }

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

    // Apply remaining filters
    const filtered = familyGroupFiltered.filter(([name, style]) => {
      if (!style) return false;
      if (!isStylePlatformCompatible(style, currentPlatform)) return false;
      if (!isStyleInCategory(name, currentCategory)) return false;
      if (!isStyleMatchingSearch(name, searchQuery)) return false;
      return true;
    });

    let count = 0;

    filtered.forEach(([name, style]) => {
      let converted = "";
      if (inputText && Render && typeof Render.renderAny === "function") {
        converted = Render.renderAny(inputText, style);
      }

      const decorated = converted ? applyDecoration(converted) : "";
      grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null, style));
      count += 1;

      if (count % 8 === 0) {
        grid.appendChild(createAdCard());
      }
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
     EVENTS
     =================== */
  function bindEvents() {
    if (el.mainInput && el.charCount) {
      el.mainInput.addEventListener("input", () => {
        el.charCount.textContent = String(el.mainInput.value.length);
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
        renderDecorations();
      });
    });

    if (el.darkModeBtn) {
      el.darkModeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
      });
    }

    $$(".faq-question").forEach((q) => {
      q.addEventListener("click", () => {
        q.parentElement.classList.toggle("open");
      });
    });
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

    btn.textContent = "✓ Copied";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1500);
  } catch (err) {
    console.error("Copy failed:", err);
  }
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
    bindEvents();

    if (el.charCount && el.mainInput) {
      el.charCount.textContent = String(el.mainInput.value.length);
    }

    renderDecorations();
    
    // Load font categories and render tabs
    loadFontCategories();

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
