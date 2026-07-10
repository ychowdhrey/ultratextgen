/* ==========================================================================
   UltraTextGen — eventPageController.js
   ONE shared controller for every /events/<slug>/ page (Chinese New Year,
   Eid, Christmas, New Year, Valentine's Day, and any future calendar-event
   page). Mirrors the tattoo "mode takeover" pattern exactly:

     - A page sets `window.UTG_EVENT_MODE = true` inline BEFORE script.js
       loads. script.js checks that flag at its render guard points
       (renderDecorations / ensureScopeControl / ensureFormatControl /
       renderSavedStyles / renderResults) and no-ops, so it never fights
       this controller for the shared #mainInput / results area.
     - This file loads AFTER script.js (deferred), so it runs after
       script.js's own init() has already wired #mainInput's base listeners
       (char count, ?q= URL sync, Enter-to-copy) — those keep working
       for free; only the *rendering* is taken over.

   Unlike tattooData.js (one shared mutable data file for every tattoo
   mode), each event page defines its OWN small inline
   `window.UTG_EVENT_DATA = {...}` script block before this controller
   loads — the same per-page inline-config precedent as `window.tattooI18n`
   / `window.verticalI18n`. That way multiple future event-content agents
   never need to edit one shared data file concurrently; they only ever
   touch their own page's inline block (best authored via
   scripts/generate_event_page_from_spec.py).

   window.UTG_EVENT_DATA shape (see data/event_page_specs/_TEMPLATE.example.json
   for the authoring-time JSON spec this is generated from):

     {
       slug, eventName, aliases: [string],
       fonts: { curatedKeys: [string] },            // keys into window.textStyles
       emojiCollections: {
         containerId: "eventEmojiGrids",             // defaults to that id
         groups: [{ name, flags: [string], defaultFormat }]
       },
       kaomoji:  [{ text, label }],
       asciiArt: [{ art, label }],
       phraseBank: [{ text, nativeScript, romanization, translation }]
     }

   DOM contract a generated page must provide (see
   scripts/generate_event_page_from_spec.py):
     #mainInput          shared textarea driving every live section
     #eventFontsGrid     .results-grid — fonts section (this file renders)
     #eventEmojiGrids    container for UltraTextGen.buildGrids(...)
     #eventKaomojiGrid   .glyph-grid — kaomoji tiles
     #eventAsciiGrid     .art-piece-grid — curated ASCII art cards
     #eventPhraseGrid    .compare-grid — click-to-style phrase bank cards

   Requires (loaded before this): styles.js, renderer.js, script.js,
   symbol-explorer.js (for UltraTextGen.buildGrids / copyText — may load
   either just before or just after this file; both are read lazily, not
   at parse time).
   ========================================================================== */

(function () {
  "use strict";

  const Render = window.UltraTextGenRender;
  const stylesRegistry = window.textStyles || {};
  const DATA = window.UTG_EVENT_DATA;
  if (!Render || !DATA) return;

  const SAMPLE_TEXT = DATA.samplePhrase || DATA.eventName || "your text";
  let renderTimer = null;

  /* ---- Helpers (same tiny DOM helpers as tattooPageController.js) ---- */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function styleFor(key) {
    return key ? stylesRegistry[key] : null;
  }

  function applyStyle(text, key) {
    const style = styleFor(key);
    if (!style) return text;
    try { return Render.renderAny(text, style); } catch (e) { return text; }
  }

  /* --------------------------------------------------------------------------
     1. Fonts section — curated style keys rendered live against #mainInput.
     Same .style-card / .copy-btn contract the core generator and the tattoo
     page use, so script.js's document-level copy handler does copy + toast
     + GTM automatically — no new copy JS needed here.
     -------------------------------------------------------------------------- */
  function buildFontCard(label, text, styleKey, isSample) {
    const card = el("div", "style-card");

    const info = el("div", "style-info");
    info.appendChild(el("p", "style-name", label));
    const preview = el("p", "style-preview" + (isSample ? " is-sample" : ""), text);
    info.appendChild(preview);
    card.appendChild(info);

    const actions = el("div", "style-actions");
    const btn = el("button", "copy-btn", "Copy");
    btn.type = "button";
    btn.dataset.text = text;
    btn.dataset.style = styleKey;
    actions.appendChild(btn);
    card.appendChild(actions);

    return card;
  }

  function renderFonts() {
    const grid = $("#eventFontsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const input = $("#mainInput");
    const raw = input ? input.value.trim() : "";
    const text = raw || SAMPLE_TEXT;

    if (!raw) {
      grid.appendChild(el("p", "u-secondary-tight",
        "Showing “" + SAMPLE_TEXT + "” — type your own name, wish, or greeting above."));
    }

    const keys = (DATA.fonts && DATA.fonts.curatedKeys) || [];
    keys.forEach(function (key) {
      if (!styleFor(key)) return; // silently skip a key that doesn't exist in styles.js
      grid.appendChild(buildFontCard(key, applyStyle(text, key), key, !raw));
    });
  }

  /* --------------------------------------------------------------------------
     2. Emoji / symbol collection section — the existing, shared
     UltraTextGen.buildGrids(containerId, GROUPS) helper (same one the
     /library/ "collection" pages use) does the rendering, format-switching,
     and whole-set copy. Nothing new to build here.
     -------------------------------------------------------------------------- */
  function renderEmojiCollections() {
    const cfg = DATA.emojiCollections;
    if (!cfg || !cfg.groups || !cfg.groups.length) return;
    const ns = window.UltraTextGen;
    if (!ns || typeof ns.buildGrids !== "function") return;
    const containerId = cfg.containerId || "eventEmojiGrids";
    if (!$("#" + containerId)) return;
    ns.buildGrids(containerId, cfg.groups);
  }

  /* --------------------------------------------------------------------------
     3. Kaomoji section — .glyph-copy tiles in the existing generic
     .glyph-grid wrapper. Each tile's data-text is the whole fused kaomoji
     string (one click = one paste) — script.js's document-level
     .glyph-copy click handler already does copy + toast + GTM.
     -------------------------------------------------------------------------- */
  function renderKaomoji() {
    const grid = $("#eventKaomojiGrid");
    if (!grid) return;
    grid.innerHTML = "";

    (DATA.kaomoji || []).forEach(function (item) {
      if (!item || !item.text) return;
      const tile = el("button", "glyph-copy");
      tile.type = "button";
      tile.dataset.text = item.text;
      tile.textContent = item.text;
      if (item.label) tile.setAttribute("aria-label", "Copy " + item.label);
      grid.appendChild(tile);
    });
  }

  /* --------------------------------------------------------------------------
     4. ASCII art section — curated static pieces, built from data at
     runtime with the SAME art-piece-card component/copy mechanism as
     library/heart-ascii-art/index.html: a whitespace-preserving monospace
     <pre> plus a per-piece Copy button wired through
     UltraTextGen.copyText (symbol-explorer.js), not the .copy-btn contract.
     -------------------------------------------------------------------------- */
  function copyArt(pre, btn, label) {
    const text = pre.textContent.replace(/\s+$/, "");
    const ns = window.UltraTextGen;
    if (ns && typeof ns.copyText === "function") {
      ns.copyText(text, btn, label || "ASCII art");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
  }

  function renderAsciiArt() {
    const grid = $("#eventAsciiGrid");
    if (!grid) return;
    grid.innerHTML = "";

    (DATA.asciiArt || []).forEach(function (piece) {
      if (!piece || !piece.art) return;
      const card = el("div", "art-piece-card");

      const head = el("div", "art-piece-head");
      head.appendChild(el("span", "art-piece-label", piece.label || "ASCII Art"));
      const copyBtn = el("button", "art-piece-copy", "Copy");
      copyBtn.type = "button";
      copyBtn.dataset.label = piece.label || "ASCII art";
      copyBtn.setAttribute("aria-label", "Copy " + (piece.label || "ASCII art"));
      head.appendChild(copyBtn);
      card.appendChild(head);

      const body = el("div", "art-piece-body");
      const pre = el("pre", "art-piece-pre", piece.art);
      body.appendChild(pre);
      card.appendChild(body);

      copyBtn.addEventListener("click", function () {
        copyArt(pre, copyBtn, piece.label);
      });

      grid.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------------
     5. Phrase bank — click a card (native script / romanization /
     translation) and it sets #mainInput's value + fires a real "input"
     event, which re-triggers the live render across the fonts section
     (and keeps script.js's own char-count / URL-sync listeners in sync).
     `phrase.text` is the Latin-alphabet form used for font styling —
     styles.js only maps A-Z/a-z/0-9, so native-script characters (e.g. 恭喜發財)
     pass through the Unicode font maps unchanged.
     -------------------------------------------------------------------------- */
  function renderPhraseBank() {
    const grid = $("#eventPhraseGrid");
    if (!grid) return;
    grid.innerHTML = "";

    (DATA.phraseBank || []).forEach(function (phrase) {
      if (!phrase || !phrase.text) return;
      const card = el("button", "compare-card event-phrase-card");
      card.type = "button";

      if (phrase.nativeScript) card.appendChild(el("h4", null, phrase.nativeScript));
      if (phrase.romanization) card.appendChild(el("p", null, phrase.romanization));
      if (phrase.translation) card.appendChild(el("p", null, phrase.translation));

      card.addEventListener("click", function () {
        const input = $("#mainInput");
        if (!input) return;
        input.value = phrase.text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.scrollIntoView({ block: "center", behavior: "smooth" });
      });

      grid.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------------
     Master render — only the input-driven fonts section needs to re-run on
     every keystroke; the other four sections are static per page load.
     -------------------------------------------------------------------------- */
  function renderLive() {
    renderFonts();
  }

  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderLive, 120);
  }

  function renderStatic() {
    renderEmojiCollections();
    renderKaomoji();
    renderAsciiArt();
    renderPhraseBank();
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  function readUrlState() {
    try {
      const params = new URLSearchParams(window.location.search);
      const text = params.get("text") || params.get("q");
      const input = $("#mainInput");
      if (text && input && !input.value) input.value = text;
    } catch (e) {}
  }

  function init() {
    if (!$("#eventFontsGrid")) return; // not an event page after all

    readUrlState();

    const input = $("#mainInput");
    if (input) input.addEventListener("input", triggerRender);

    renderFonts();
    renderStatic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
