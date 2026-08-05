/* ==========================================================================
   UltraTextGen — snapchat-context.js (DE)
   Surface-aware UI layer for the Snapchat page.

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
        "Der Name, den deine Freunde überall auf Snapchat sehen. <strong>Unterscheidet sich von deinem @Benutzernamen</strong> — der Benutzername akzeptiert keine stylische Schrift, nur dein Anzeigename.",
      previewType: "name",
      presets: [
        { label: "Schreibschrift", category: "cursive-fonts" },
        { label: "Kapitälchen", category: "small-caps" },
        { label: "Gotisch", category: "gothic-fonts" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Sarah"
    },
    "username": {
      limit: 15,
      guidance:
        "Dein eindeutiger @Handle. <strong>Nur einfaches ASCII — hier wird keine Unicode-Schrift dargestellt.</strong> Buchstaben, Zahlen, Bindestriche, Unterstriche und Punkte; 3–15 Zeichen, muss mit einem Buchstaben beginnen und mit einem Buchstaben oder einer Zahl enden.",
      previewType: "username",
      presets: [],
      showUsernameNote: true,
      showPublicNote: false,
      placeholder: "sarah.styles"
    },
    "story-caption": {
      limit: null,
      guidance:
        "Wird in einen Snap oder eine Story eingefügt, nachdem du auf das <strong>T</strong>-Symbol getippt hast. Volles Unicode wird korrekt dargestellt, neben Snapchats eigenem eingebauten Schriftkarussell (Classic, Strong, Typewriter, Neon und mehr).",
      previewType: "caption",
      presets: [
        { label: "Fett", category: "bold-fonts" },
        { label: "Kapitälchen", category: "small-caps" },
        { label: "Bubble", category: "bubble-fonts" },
        { label: "Schreibschrift", category: "cursive-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Goldene Stunde"
    },
    "chat": {
      limit: null,
      guidance:
        "Unicode-Schriften funktionieren als eingefügte Zeichen in Direktnachrichten und Gruppenchats. Snapchat hat <strong>keinen nativen Fett- oder Kursiv-Umschalter im Chat</strong> — das ist der einzige Weg, dort stylischen Text zu bekommen.",
      previewType: "chat",
      presets: [
        { label: "Fett", category: "bold-fonts" },
        { label: "Kursiv", category: "italic-fonts" },
        { label: "Durchgestrichen", category: "strikethrough-text" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Hey, wie geht's?"
    },
    "public-bio": {
      limit: null,
      guidance:
        "Dein Public-Profile-Name und deine Bio, sichtbar für alle, die dein Public Profile finden. Snapchat empfiehlt hier <strong>klare, gut lesbare</strong> Stylisierung statt starker Verzierung.",
      previewType: "bio",
      presets: [
        { label: "Kapitälchen", category: "small-caps" },
        { label: "Kursiv", category: "italic-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: true,
      placeholder: "lebe mein bestes Leben"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">@Benutzername lässt sich nicht stylen</span>' +
    "Snapchats @Benutzername-Feld akzeptiert nur einfaches ASCII: Buchstaben, Zahlen, Bindestriche ( - ), Unterstriche ( _ ) und Punkte ( . ). Jede stylische Unicode-Schrift — fett, Schreibschrift, gotisch, Bubble — lässt sich hier nicht speichern. Nutze diesen Generator für <em>Ideen</em> zum Benutzernamen und tippe dann die einfache, unstylische Version in das @Benutzername-Feld. Speichere dein stylisches Ergebnis stattdessen für deinen <strong>Anzeigenamen</strong> auf.";

  const PUBLIC_NOTE =
    '<span class="note-title">Auffindbarkeit deines Public Profiles</span>' +
    "Snapchat empfiehlt, den Anzeigenamen und die Bio deines Public Profiles klar und gut lesbar zu halten. Übermäßige stylische Schrift oder Emojis können hier deine Auffindbarkeit in der Snapchat-Suche verringern.";

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
        "-Zeichen-Limit</span>";
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
    let html = '<span class="presets-label">Empfohlene Stile</span>';
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
          '<div class="preview-label">Vorschau · Anzeigename</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">@dein_username</div>' +
          "</div>" +
          "</div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Vorschau · @Benutzername (nur ASCII)</div>' +
          '<div class="preview-username">@' + t + "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Vorschau · Story-/Snap-Caption</div>' +
          '<div class="preview-caption">' + t + "</div>";
        break;
      case "chat":
        html =
          '<div class="preview-label">Vorschau · Chat-Nachricht</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar small"></div>' +
          "<div>" +
          '<div class="preview-name">Du <span class="preview-meta" style="margin-left:4px;">heute</span></div>' +
          '<div class="preview-message">' + t + "</div>" +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Vorschau · Public-Profile-Bio</div>' +
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
