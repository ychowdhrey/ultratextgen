/* ==========================================================================
   UltraTextGen — snapchat-context.js (NL)
   Surface-aware UI layer for the Dutch Snapchat page.

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
        "Je zichtbare naam die vrienden overal op Snapchat zien. <strong>Anders dan je @gebruikersnaam</strong> — die accepteert geen speciale letters, alleen je weergavenaam wel.",
      previewType: "name",
      presets: [
        { label: "Cursief", category: "cursive-fonts" },
        { label: "Kleine kapitalen", category: "small-caps" },
        { label: "Gotisch", category: "gothic-fonts" },
        { label: "Bubbel", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Sarah"
    },
    "username": {
      limit: 15,
      guidance:
        "Je unieke @handle. <strong>Alleen platte ASCII-tekens — hier wordt geen enkel Unicode-lettertype weergegeven.</strong> Letters, cijfers, streepjes, underscores en punten; 3–15 tekens, moet beginnen met een letter en eindigen op een letter of cijfer.",
      previewType: "username",
      presets: [],
      showUsernameNote: true,
      showPublicNote: false,
      placeholder: "sarah.styles"
    },
    "story-caption": {
      limit: null,
      guidance:
        "Plak dit in een Snap of Story na het tikken op het <strong>T</strong>-icoon. Volledige Unicode wordt correct weergegeven, naast Snapchat's eigen ingebouwde lettertype-carrousel (Classic, Strong, Typewriter, Neon en meer).",
      previewType: "caption",
      presets: [
        { label: "Vet", category: "bold-fonts" },
        { label: "Kleine kapitalen", category: "small-caps" },
        { label: "Bubbel", category: "bubble-fonts" },
        { label: "Cursief", category: "cursive-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Gouden uur"
    },
    "chat": {
      limit: null,
      guidance:
        "Unicode-lettertypes werken als geplakte tekens in DM's en groepschats. Snapchat heeft <strong>geen ingebouwde vet- of cursiefknop in chat</strong> — dit is de enige manier om daar gestylede tekst te krijgen.",
      previewType: "chat",
      presets: [
        { label: "Vet", category: "bold-fonts" },
        { label: "Cursief (italic)", category: "italic-fonts" },
        { label: "Doorgestreept", category: "strikethrough-text" },
        { label: "Bubbel", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Hey daar!"
    },
    "public-bio": {
      limit: null,
      guidance:
        "De naam en bio van je Openbaar profiel, zichtbaar voor iedereen die je openbare profiel vindt. Snapchat raadt hier <strong>duidelijke, leesbare</strong> styling aan, in plaats van zware decoratie.",
      previewType: "bio",
      presets: [
        { label: "Kleine kapitalen", category: "small-caps" },
        { label: "Cursief (italic)", category: "italic-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: true,
      placeholder: "leef mijn beste leven"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">@Gebruikersnaam kan niet gestyled worden</span>' +
    "Het @gebruikersnaam-veld van Snapchat accepteert alleen platte ASCII: letters, cijfers, streepjes ( - ), underscores ( _ ) en punten ( . ). Elk Unicode-lettertype — vet, cursief, gotisch, bubbel — kan hier niet worden opgeslagen. Gebruik deze generator voor <em>ideeën</em> voor je gebruikersnaam, en typ daarna de platte, ongestylede versie in het @gebruikersnaam-veld. Bewaar je gestylede resultaat voor je <strong>weergavenaam</strong>.";

  const PUBLIC_NOTE =
    '<span class="note-title">Vindbaarheid van je Openbaar profiel</span>' +
    "Snapchat raadt aan om de naam en bio van je Openbaar profiel duidelijk en leesbaar te houden. Overdreven speciale tekens of emoji's kunnen hier je vindbaarheid in de zoekresultaten van Snapchat verminderen.";

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
        "-tekenlimiet</span>";
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
    let html = '<span class="presets-label">Aanbevolen stijlen</span>';
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
          '<div class="preview-label">Voorbeeld · Weergavenaam</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">@jouw_gebruikersnaam</div>' +
          "</div>" +
          "</div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Voorbeeld · @Gebruikersnaam (alleen ASCII)</div>' +
          '<div class="preview-username">@' + t + "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Voorbeeld · Story-/Snap-caption</div>' +
          '<div class="preview-caption">' + t + "</div>";
        break;
      case "chat":
        html =
          '<div class="preview-label">Voorbeeld · Chatbericht</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar small"></div>' +
          "<div>" +
          '<div class="preview-name">Jij <span class="preview-meta" style="margin-left:4px;">vandaag</span></div>' +
          '<div class="preview-message">' + t + "</div>" +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Voorbeeld · Bio Openbaar profiel</div>' +
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
