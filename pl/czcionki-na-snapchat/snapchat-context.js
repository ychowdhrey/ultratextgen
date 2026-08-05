/* ==========================================================================
   UltraTextGen — snapchat-context.js (pl)
   Surface-aware UI layer for the Snapchat page. Translated copy of
   /snapchat/snapchat-context.js — logic, structure, class names, and IDs
   are unchanged; only user-facing strings are localized.

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
        "Ozdobna nazwa, którą twoi znajomi widzą wszędzie na Snapchacie. <strong>To co innego niż @nazwa użytkownika</strong> — nazwa użytkownika nie przyjmuje ozdobnych czcionek, tylko nazwa wyświetlana.",
      previewType: "name",
      presets: [
        { label: "Kaligrafia", category: "cursive-fonts" },
        { label: "Małe kapitaliki", category: "small-caps" },
        { label: "Gotyckie", category: "gothic-fonts" },
        { label: "Bąbelkowe", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Zosia"
    },
    "username": {
      limit: 15,
      guidance:
        "Twój unikalny uchwyt @. <strong>Tylko zwykłe ASCII — żadne czcionki Unicode się tu nie wyświetlą.</strong> Litery, cyfry, myślniki, podkreślenia i kropki; 3–15 znaków, musi zaczynać się literą i kończyć literą lub cyfrą.",
      previewType: "username",
      presets: [],
      showUsernameNote: true,
      showPublicNote: false,
      placeholder: "zosia.styl"
    },
    "story-caption": {
      limit: null,
      guidance:
        "Wklej w Snapie albo Historii po dotknięciu ikony <strong>T</strong>. Pełny Unicode wyświetla się poprawnie, obok wbudowanej karuzeli czcionek Snapchata (Classic, Strong, Typewriter, Neon i innych).",
      previewType: "caption",
      presets: [
        { label: "Pogrubione", category: "bold-fonts" },
        { label: "Małe kapitaliki", category: "small-caps" },
        { label: "Bąbelkowe", category: "bubble-fonts" },
        { label: "Kaligrafia", category: "cursive-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Złota godzina"
    },
    "chat": {
      limit: null,
      guidance:
        "Czcionki Unicode działają jako wklejone znaki w wiadomościach prywatnych i czatach grupowych. Snapchat <strong>nie ma natywnego przełącznika pogrubienia ani kursywy na czacie</strong> — to jedyny sposób, żeby mieć tam ostylowany tekst.",
      previewType: "chat",
      presets: [
        { label: "Pogrubione", category: "bold-fonts" },
        { label: "Kursywa", category: "italic-fonts" },
        { label: "Przekreślenie", category: "strikethrough-text" },
        { label: "Bąbelkowe", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Cześć wszystkim!"
    },
    "public-bio": {
      limit: null,
      guidance:
        "Twoja nazwa i bio Profilu Publicznego, widoczne dla każdego, kto trafi na twój Profil Publiczny. Snapchat zaleca tu <strong>czysty, czytelny</strong> styl zamiast mocnej dekoracji.",
      previewType: "bio",
      presets: [
        { label: "Małe kapitaliki", category: "small-caps" },
        { label: "Kursywa", category: "italic-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: true,
      placeholder: "żyję pełnią życia"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">@Nazwy użytkownika nie da się ostylować</span>' +
    "Pole @nazwy użytkownika na Snapchacie przyjmuje wyłącznie zwykłe znaki ASCII: litery, cyfry, myślniki ( - ), podkreślenia ( _ ) i kropki ( . ). Każda ostylowana czcionka Unicode — pogrubiona, kaligrafia, gotycka, bąbelkowa — nie zapisze się w tym polu. Użyj tego generatora, żeby wymyślić <em>pomysł</em> na nazwę użytkownika, a potem wpisz jej zwykłą, nieostylowaną wersję w pole @nazwy użytkownika. Ostylowany wynik zachowaj na swoją <strong>nazwę wyświetlaną</strong>.";

  const PUBLIC_NOTE =
    '<span class="note-title">Widoczność Profilu Publicznego</span>' +
    "Snapchat zaleca, żeby nazwa wyświetlana i bio twojego Profilu Publicznego były czyste i czytelne. Nadmiar ozdobnego tekstu lub emoji może obniżyć twoją widoczność w wynikach wyszukiwania Snapchata.";

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
        " znaków</span>";
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
    let html = '<span class="presets-label">Polecane style</span>';
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
          '<div class="preview-label">Podgląd · Nazwa wyświetlana</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">@twoja_nazwa</div>' +
          "</div>" +
          "</div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Podgląd · @Nazwa użytkownika (tylko ASCII)</div>' +
          '<div class="preview-username">@' + t + "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Podgląd · Podpis Historii / Snapa</div>' +
          '<div class="preview-caption">' + t + "</div>";
        break;
      case "chat":
        html =
          '<div class="preview-label">Podgląd · Wiadomość na czacie</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar small"></div>' +
          "<div>" +
          '<div class="preview-name">Ty <span class="preview-meta" style="margin-left:4px;">dzisiaj</span></div>' +
          '<div class="preview-message">' + t + "</div>" +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Podgląd · Bio Profilu Publicznego</div>' +
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
