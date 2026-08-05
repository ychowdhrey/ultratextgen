/* ==========================================================================
   UltraTextGen — snapchat-context.js (ID)
   Surface-aware UI layer for the Indonesian Snapchat page.

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
        "Nama kece yang dilihat teman-temanmu di mana-mana di Snapchat. <strong>Beda sama @username kamu</strong> — username gak nerima font kece, cuma Nama Tampilan yang bisa.",
      previewType: "name",
      presets: [
        { label: "Kursif", category: "cursive-fonts" },
        { label: "Small Caps", category: "small-caps" },
        { label: "Gotik", category: "gothic-fonts" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Raka"
    },
    "username": {
      limit: 15,
      guidance:
        "Handle @ unikmu. <strong>Cuma ASCII polos — font Unicode gak muncul di sini.</strong> Huruf, angka, tanda hubung, dan titik; 3–15 karakter, harus mulai dengan huruf dan berakhir dengan huruf atau angka.",
      previewType: "username",
      presets: [],
      showUsernameNote: true,
      showPublicNote: false,
      placeholder: "raka.keren"
    },
    "story-caption": {
      limit: null,
      guidance:
        "Tempel ke Snap atau Story setelah tap ikon <strong>T</strong>. Unicode penuh muncul dengan benar, bareng carousel font bawaan Snapchat (Classic, Strong, Typewriter, Neon, dan lainnya).",
      previewType: "caption",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Small Caps", category: "small-caps" },
        { label: "Bubble", category: "bubble-fonts" },
        { label: "Kursif", category: "cursive-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Golden hour"
    },
    "chat": {
      limit: null,
      guidance:
        "Font Unicode jalan sebagai karakter yang ditempel di DM dan grup chat. Snapchat <strong>gak punya toggle bold atau miring bawaan di chat</strong> — ini satu-satunya cara dapetin tulisan bergaya di situ.",
      previewType: "chat",
      presets: [
        { label: "Bold", category: "bold-fonts" },
        { label: "Miring", category: "italic-fonts" },
        { label: "Coret", category: "strikethrough-text" },
        { label: "Bubble", category: "bubble-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: false,
      placeholder: "Halo, kamu!"
    },
    "public-bio": {
      limit: null,
      guidance:
        "Nama dan bio Profil Publikmu, keliatan buat siapa aja yang nemuin Profil Publikmu. Snapchat nyaranin gaya yang <strong>jelas dan gampang dibaca</strong> di sini, bukan dekorasi berat.",
      previewType: "bio",
      presets: [
        { label: "Small Caps", category: "small-caps" },
        { label: "Miring", category: "italic-fonts" }
      ],
      showUsernameNote: false,
      showPublicNote: true,
      placeholder: "menikmati hidup"
    }
  };

  const USERNAME_NOTE =
    '<span class="note-title">@Username gak bisa dibikin bergaya</span>' +
    "Kolom @username Snapchat cuma nerima ASCII polos: huruf, angka, tanda hubung ( - ), garis bawah ( _ ), dan titik ( . ). Font Unicode bergaya apa pun — bold, kursif, gotik, bubble — bakal gagal disimpan di sini. Pakai generator ini buat cari <em>ide</em> username, terus ketik versi polos tanpa gaya ke kolom @username. Simpen hasil bergayamu buat <strong>Nama Tampilan</strong> aja.";

  const PUBLIC_NOTE =
    '<span class="note-title">Keterlihatan Profil Publik</span>' +
    "Snapchat nyaranin biar nama tampilan dan bio Profil Publikmu tetap jelas dan gampang dibaca. Pakai tulisan kece atau emoji berlebihan di sini bisa ngurangin keterlihatanmu di hasil pencarian Snapchat.";

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
        " karakter</span>";
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
    let html = '<span class="presets-label">Gaya yang disaranin</span>';
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
          '<div class="preview-label">Preview · Nama tampilan</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar"></div>' +
          "<div>" +
          '<div class="preview-name">' + t + "</div>" +
          '<div class="preview-meta">@username_kamu</div>' +
          "</div>" +
          "</div>";
        break;
      case "username":
        html =
          '<div class="preview-label">Preview · @Username (cuma ASCII)</div>' +
          '<div class="preview-username">@' + t + "</div>";
        break;
      case "caption":
        html =
          '<div class="preview-label">Preview · Caption Story / Snap</div>' +
          '<div class="preview-caption">' + t + "</div>";
        break;
      case "chat":
        html =
          '<div class="preview-label">Preview · Pesan chat</div>' +
          '<div class="preview-row">' +
          '<div class="preview-avatar small"></div>' +
          "<div>" +
          '<div class="preview-name">Kamu <span class="preview-meta" style="margin-left:4px;">hari ini</span></div>' +
          '<div class="preview-message">' + t + "</div>" +
          "</div>" +
          "</div>";
        break;
      case "bio":
        html =
          '<div class="preview-label">Preview · Bio Profil Publik</div>' +
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
