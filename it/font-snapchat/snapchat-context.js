/* ==========================================================================
   UltraTextGen — snapchat-context.js (IT)
   Surface-aware UI layer for the Italian Snapchat page.

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
        "Il nome che i tuoi amici vedono ovunque su Snapchat. <strong>Diverso dal tuo @username</strong> — lo username non accetta font stilosi, solo il tuo Nome Visualizzato sì.",
      previewType: "name",
      presets: [
        { label: "Corsivo", category: "cursive-fonts" },
        { label: "Maiuscoletto", category: "small-caps" },
        { label: "Gotico", category: "gothic-fonts" },
        { label: "Bolle", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Sara"
    },
    "username": {
      limit: 15,
      guidance:
        "Il tuo @handle unico. <strong>Solo ASCII semplice — qui nessun font Unicode viene visualizzato.</strong> Lettere, numeri, trattini, underscore e punti; 3–15 caratteri, deve iniziare con una lettera e finire con una lettera o un numero.",
      previewType: "username",
      presets: [],
      showUsernameNote: true,
      showPublicNote: false,
      placeholder: "sara.stile"
    },
    "story-caption": {
      limit: null,
      guidance:
        "Incolla in uno Snap o in una Story dopo aver toccato l'icona <strong>T</strong>. L'Unicode completo viene visualizzato correttamente, insieme al carosello di font integrato di Snapchat (Classic, Strong, Typewriter, Neon e altri).",
      previewType: "caption",
      presets: [
        { label: "Grassetto", category: "bold-fonts" },
        { label: "Maiuscoletto", category: "small-caps" },
        { label: "Bolle", category: "bubble-fonts" },
        { label: "Corsivo", category: "cursive-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Ora dorata"
    },
    "chat": {
      limit: null,
      guidance:
        "I font Unicode funzionano come caratteri incollati nei DM e nelle chat di gruppo. Snapchat <strong>non ha un interruttore nativo per grassetto o italico in chat</strong> — questo è l'unico modo per avere testo stilizzato lì.",
      previewType: "chat",
      presets: [
        { label: "Grassetto", category: "bold-fonts" },
        { label: "Italico", category: "italic-fonts" },
        { label: "Barrato", category: "strikethrough-text" },
        { label: "Bolle", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Ciao a tutti!"
    },
    "public-bio": {
      limit: null,
      guidance:
        "Il nome e la bio del tuo Profilo pubblico, visibili a chiunque trovi il tuo Profilo pubblico. Snapchat consiglia uno stile <strong>chiaro e leggibile</strong> qui, invece di decorazioni pesanti.",
      previewType: "bio",
      presets: [
        { label: "Maiuscoletto", category: "small-caps" },
        { label: "Italico", category: "italic-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: true,
      placeholder: "vivo la mia vita al massimo"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">L\'@Username non può essere stilizzato</span>' +
    "Il campo @username di Snapchat accetta solo ASCII semplice: lettere, numeri, trattini ( - ), underscore ( _ ) e punti ( . ). Qualsiasi font Unicode stilizzato — grassetto, corsivo, gotico, bolle — non verrà salvato qui. Usa questo generatore per avere <em>idee</em> per lo username, poi scrivi la versione semplice, senza stile, nel campo @username. Tieni il tuo risultato stilizzato per il tuo <strong>Nome Visualizzato</strong>, invece.";

  const PUBLIC_NOTE =
    '<span class="note-title">Visibilità del Profilo pubblico</span>' +
    "Snapchat consiglia di tenere il nome visualizzato e la bio del tuo Profilo pubblico chiari e leggibili. Usare testo stiloso o emoji in eccesso qui potrebbe ridurre la tua visibilità nei risultati di ricerca di Snapchat.";

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
        " caratteri max</span>";
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
    let html = '<span class="presets-label">Stili consigliati</span>';
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
          '<div class="preview-label">Anteprima · Nome visualizzato</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">@tuo_username</div>' +
          "</div>" +
          "</div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Anteprima · @Username (solo ASCII)</div>' +
          '<div class="preview-username">@' + t + "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Anteprima · Caption Story / Snap</div>' +
          '<div class="preview-caption">' + t + "</div>";
        break;
      case "chat":
        html =
          '<div class="preview-label">Anteprima · Messaggio in chat</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar small"></div>' +
          "<div>" +
          '<div class="preview-name">Tu <span class="preview-meta" style="margin-left:4px;">oggi</span></div>' +
          '<div class="preview-message">' + t + "</div>" +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Anteprima · Bio Profilo pubblico</div>' +
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
