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
  Symbols: [
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
  Frames: [
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
  Dividers: [
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
  Arrows: [
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
  Minimal: [
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
  boxesAndLabels: [
   
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
  let currentPlatform = "all";
  let currentCategory = "all";
  let currentDecoTab = "symbols";
  let selectedDecoration = null;
  let searchQuery = "";

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

  function isStyleInCategory(style, categoryKey) {
    if (categoryKey === "all") return true;
    return (style.category || "") === categoryKey;
  }

  function isStyleMatchingSearch(name, q) {
    if (!q) return true;
    return String(name).toLowerCase().includes(String(q).toLowerCase());
  }

  function createStyleCard(name, convertedText, decoratedText, isSponsored = false) {
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

    const filtered = entries.filter(([name, style]) => {
      if (!style) return false;
      if (!isStylePlatformCompatible(style, currentPlatform)) return false;
      if (!isStyleInCategory(style, currentCategory)) return false;
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
      grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null, false));
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

    $$(".platform-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        $$(".platform-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        currentPlatform = pill.dataset.platform || "all";
        renderResults();
      });
    });

    $$(".category-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".category-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentCategory = tab.dataset.category || "all";
        renderResults();
      });
    });

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
      const btn = e.target && e.target.classList && e.target.classList.contains("copy-btn") ? e.target : null;
      if (!btn || btn.disabled) return;

      const text = btn.dataset.text || "";
      try {
        await navigator.clipboard.writeText(text);
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
    renderResults();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

