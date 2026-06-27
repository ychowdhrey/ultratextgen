/* ==========================================================
   tag-studio.js
   Live clan / guild / squad TAG builder for UltraTextGen.

   Turns the static "swap YourName" wrappers into a LIVE studio:
   the tag the user types is styled (font) + framed (bracket +
   separator) in real time, with render-safety badges, a length
   counter, a "rare combination" generator, and a shareable TEAM
   TEMPLATE link that carries the RECIPE (font/bracket/sep) — not a
   finished string — so every squad member can open it, type their
   OWN name, and get the identical styling applied automatically.

   Public API:
     UltraTextGen.tagStudio.init(config)

   The module is language-agnostic: every UI label is passed in via
   config.text, so the same engine drives the ID and EN pages.
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================
     Small helpers
     ============================ */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Count user-perceived characters (code points; good enough for a counter)
  function glyphLength(str) {
    return str ? Array.from(str).length : 0;
  }

  // Style a string with a textStyles key via the shared renderer.
  function styleText(text, fontKey) {
    if (!text) return "";
    const styles = window.textStyles || {};
    const style = styles[fontKey];
    const R = window.UltraTextGenRender;
    if (style && R && typeof R.renderAny === "function") {
      return R.renderAny(text, style);
    }
    return text;
  }

  // Assemble bracket + separator + styled tag.
  // Separator only appears BETWEEN present parts, so "no bracket" stays clean.
  function frameText(styled, leftSym, rightSym, sep) {
    const parts = [];
    if (leftSym) parts.push(leftSym);
    parts.push(styled);
    if (rightSym) parts.push(rightSym);
    return parts.join(sep || "");
  }

  function copy(text, sourceEl, label) {
    if (ns.copyText) {
      ns.copyText(text, sourceEl, label || text);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
  }

  /* ============================
     Controller
     ============================ */
  function init(config) {
    const cfg = config || {};
    const text = cfg.text || {};
    const input = document.getElementById(cfg.inputId || "mainInput");
    if (!input) return;

    const fonts = cfg.fonts || [];
    const brackets = cfg.brackets || [];
    const separators = cfg.separators || [];
    const frames = cfg.frames || [];
    const rareSymbols = cfg.rareSymbols || [];
    const rareFonts = cfg.rareFonts || fonts.map(function (f) { return f.key; });
    const charLimit = cfg.charLimit || 0; // 0 = no warning

    // ---- State (defaults to first option, overridable by URL recipe) ----
    const state = {
      fontKey: (fonts[0] && fonts[0].key) || "Ultra Small Caps",
      bracketId: (brackets[0] && brackets[0].id) || "none",
      sepId: (separators[0] && separators[0].id) || "none",
      rareSeed: 0
    };

    function currentBracket() {
      return brackets.filter(function (b) { return b.id === state.bracketId; })[0] || { l: "", r: "" };
    }
    function currentSep() {
      const s = separators.filter(function (s) { return s.id === state.sepId; })[0];
      return s ? s.value : "";
    }
    function currentFont() {
      return fonts.filter(function (f) { return f.key === state.fontKey; })[0] || fonts[0] || {};
    }

    function rawInput() {
      return (input.value || "").trim();
    }

    // ---- Apply a URL-encoded recipe BEFORE wiring, so a shared template
    //      opens with the leader's font/bracket/sep already selected ----
    let isSharedTemplate = false;
    (function applyRecipeFromUrl() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") !== "tag") return;
      const f = params.get("font");
      const b = params.get("bracket");
      const s = params.get("sep");
      const t = params.get("tag");
      if (f && fonts.some(function (x) { return x.key === f; })) state.fontKey = f;
      if (b && brackets.some(function (x) { return x.id === b; })) state.bracketId = b;
      if (s && separators.some(function (x) { return x.id === s; })) state.sepId = s;
      if (f || b || s) isSharedTemplate = true;
      if (t) {
        // Pre-fill an example tag; the member can replace it with their own.
        input.value = t;
        if (input.dispatchEvent) input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    })();

    /* ----------------------------------------------------------
       STUDIO (font + bracket + separator + live preview)
       ---------------------------------------------------------- */
    const studioMount = document.getElementById(cfg.studioMount);
    let previewEl, countEl, safetyEl;

    function buildStudio() {
      if (!studioMount) return;
      studioMount.innerHTML = "";

      studioMount.appendChild(makeTabRow(text.fontLabel || "Font", fonts.map(function (f) {
        return { id: f.key, label: f.label, safe: f.safe };
      }), "font"));

      studioMount.appendChild(makeTabRow(text.bracketLabel || "Frame", brackets.map(function (b) {
        return { id: b.id, label: b.label };
      }), "bracket"));

      studioMount.appendChild(makeTabRow(text.sepLabel || "Separator", separators.map(function (s) {
        return { id: s.id, label: s.label };
      }), "sep"));

      // Live preview
      const previewWrap = el("div", "ts-preview-wrap");
      previewEl = el("div", "ts-preview");
      previewWrap.appendChild(previewEl);

      const meta = el("div", "ts-preview-meta");
      countEl = el("span", "ts-count");
      safetyEl = el("span", "ts-safety");
      meta.appendChild(safetyEl);
      meta.appendChild(countEl);
      previewWrap.appendChild(meta);
      studioMount.appendChild(previewWrap);

      // Actions
      const actions = el("div", "ts-actions");
      const copyBtn = el("button", "ts-btn ts-btn-primary", text.copyTag || "Copy");
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () {
        const out = previewEl.textContent;
        if (out) copy(out, copyBtn, out);
      });
      actions.appendChild(copyBtn);

      const shareBtn = el("button", "ts-btn ts-btn-ghost", text.shareTemplate || "Share team template");
      shareBtn.type = "button";
      shareBtn.addEventListener("click", function () {
        const url = buildShareUrl();
        copy(url, shareBtn, text.shareCopied || url);
      });
      actions.appendChild(shareBtn);
      studioMount.appendChild(actions);
    }

    function makeTabRow(labelText, items, kind) {
      const row = el("div", "ts-row");
      row.appendChild(el("div", "ts-row-label", labelText));
      const tabs = el("div", "ts-tabs");
      items.forEach(function (item) {
        const tab = el("button", "ts-tab");
        tab.type = "button";
        tab.setAttribute("data-kind", kind);
        tab.setAttribute("data-id", item.id);
        tab.appendChild(el("span", "ts-tab-label", item.label));
        if (kind === "font" && item.safe) {
          tab.appendChild(el("span", "ts-pill ts-pill-safe", text.safeBadge || "Safe"));
        } else if (kind === "font") {
          tab.appendChild(el("span", "ts-pill ts-pill-risk", text.riskBadge || "May box"));
        }
        tabs.appendChild(tab);
      });
      row.appendChild(tabs);

      tabs.addEventListener("click", function (e) {
        const tab = e.target.closest(".ts-tab");
        if (!tab) return;
        const id = tab.getAttribute("data-id");
        if (kind === "font") state.fontKey = id;
        else if (kind === "bracket") state.bracketId = id;
        else if (kind === "sep") state.sepId = id;
        renderAll();
      });
      return row;
    }

    function refreshActiveTabs() {
      if (!studioMount) return;
      studioMount.querySelectorAll(".ts-tab").forEach(function (tab) {
        const kind = tab.getAttribute("data-kind");
        const id = tab.getAttribute("data-id");
        const active =
          (kind === "font" && id === state.fontKey) ||
          (kind === "bracket" && id === state.bracketId) ||
          (kind === "sep" && id === state.sepId);
        tab.classList.toggle("active", active);
      });
    }

    function renderStudio() {
      if (!previewEl) return;
      const raw = rawInput();
      const styled = styleText(raw, state.fontKey);
      const b = currentBracket();
      const out = raw ? frameText(styled, b.l, b.r, currentSep()) : "";
      previewEl.textContent = out || (text.previewPlaceholder || "");
      previewEl.classList.toggle("is-empty", !out);

      // Counter
      if (countEl) {
        const n = glyphLength(out);
        countEl.textContent = charLimit ? n + " / " + charLimit : String(n);
        countEl.classList.toggle("is-over", !!charLimit && n > charLimit);
      }
      // Safety note for the selected font
      if (safetyEl) {
        const f = currentFont();
        safetyEl.textContent = f.safe ? (text.safeNote || "") : (text.riskNote || "");
        safetyEl.classList.toggle("is-risk", !f.safe);
      }
      refreshActiveTabs();
    }

    /* ----------------------------------------------------------
       LIVE FRAMES (ready-made wrappers, now reactive)
       ---------------------------------------------------------- */
    const framesMount = document.getElementById(cfg.framesMount);

    function buildFrames() {
      if (!framesMount) return;
      framesMount.innerHTML = "";
      frames.forEach(function (fr, i) {
        const card = el("div", "ts-frame-card");
        card.appendChild(el("div", "ts-frame-name", fr.name));
        const out = el("div", "ts-frame-out");
        out.id = "ts-frame-" + i;
        card.appendChild(out);
        const btn = el("button", "ts-frame-copy", text.copy || "Copy");
        btn.type = "button";
        btn.setAttribute("data-frame", String(i));
        card.appendChild(btn);
        framesMount.appendChild(card);
      });
      framesMount.addEventListener("click", function (e) {
        const btn = e.target.closest(".ts-frame-copy");
        if (!btn) return;
        const out = document.getElementById("ts-frame-" + btn.getAttribute("data-frame"));
        if (out && out.textContent) copy(out.textContent, btn, out.textContent);
      });
    }

    function renderFrames() {
      if (!framesMount) return;
      const raw = rawInput();
      frames.forEach(function (fr, i) {
        const out = document.getElementById("ts-frame-" + i);
        if (!out) return;
        // Each frame uses the user's CURRENT font so the whole page stays consistent.
        const styled = styleText(raw, fr.fontKey || state.fontKey);
        out.textContent = raw ? frameText(styled, fr.l, fr.r, fr.sep != null ? fr.sep : " ") : (text.framePlaceholder || "");
      });
    }

    /* ----------------------------------------------------------
       KOMBINASI LANGKA (rare combinations)
       ---------------------------------------------------------- */
    const rareMount = document.getElementById(cfg.rareMount);
    const RARE_COUNT = cfg.rareCount || 6;

    function buildRare() {
      if (!rareMount) return;
      rareMount.innerHTML = "";

      if (text.rareShuffle) {
        const shuffle = el("button", "ts-btn ts-btn-ghost ts-shuffle", text.rareShuffle);
        shuffle.type = "button";
        shuffle.addEventListener("click", function () {
          state.rareSeed = (state.rareSeed + 1) % 9973; // bounded, deterministic step
          renderRare();
        });
        rareMount.appendChild(shuffle);
      }

      const grid = el("div", "ts-rare-grid");
      grid.id = "ts-rare-grid";
      for (let i = 0; i < RARE_COUNT; i++) {
        const chip = el("button", "uname-chip symbol-tile ts-rare-chip");
        chip.type = "button";
        chip.id = "ts-rare-" + i;
        grid.appendChild(chip);
      }
      rareMount.appendChild(grid);

      grid.addEventListener("click", function (e) {
        const chip = e.target.closest(".ts-rare-chip");
        if (!chip) return;
        const val = chip.getAttribute("data-symbol");
        if (val) copy(val, chip, val);
      });
    }

    function renderRare() {
      if (!rareMount) return;
      const raw = rawInput();
      for (let i = 0; i < RARE_COUNT; i++) {
        const chip = document.getElementById("ts-rare-" + i);
        if (!chip) continue;
        if (!raw || !rareSymbols.length) {
          chip.textContent = text.rarePlaceholder || "…";
          chip.removeAttribute("data-symbol");
          continue;
        }
        // Deterministic pick from seed + index — no Math.random (resume/SSR safe).
        const s = (state.rareSeed * 7 + i * 31);
        const fontKey = rareFonts[s % rareFonts.length];
        const pair = rareSymbols[(s + 3) % rareSymbols.length];
        const styled = styleText(raw, fontKey);
        const out = frameText(styled, pair.l, pair.r, pair.sep != null ? pair.sep : " ");
        chip.textContent = out;
        chip.setAttribute("data-symbol", out);
      }
    }

    /* ----------------------------------------------------------
       SHARE TEMPLATE LINK
       ---------------------------------------------------------- */
    function buildShareUrl() {
      const base = window.location.origin + window.location.pathname;
      const params = new URLSearchParams();
      params.set("mode", "tag");
      params.set("font", state.fontKey);
      params.set("bracket", state.bracketId);
      params.set("sep", state.sepId);
      const raw = rawInput();
      if (raw) params.set("tag", raw);
      return base + "?" + params.toString();
    }

    const bannerMount = document.getElementById(cfg.bannerMount);
    function showBannerIfShared() {
      if (!isSharedTemplate || !bannerMount || !text.sharedBanner) return;
      bannerMount.textContent = text.sharedBanner;
      bannerMount.hidden = false;
    }

    /* ----------------------------------------------------------
       Wire up
       ---------------------------------------------------------- */
    function renderAll() {
      renderStudio();
      renderFrames();
      renderRare();
    }

    buildStudio();
    buildFrames();
    buildRare();
    showBannerIfShared();
    renderAll();

    input.addEventListener("input", renderAll);

    // Expose minimal handle for debugging / future pages.
    ns.tagStudio._instances = ns.tagStudio._instances || [];
    ns.tagStudio._instances.push({ state: state, buildShareUrl: buildShareUrl });
  }

  ns.tagStudio = { init: init };
})();
