/* ==========================================================================
   UltraTextGen — eventPageController.js
   ONE shared controller for every /events/<slug>/ page. What a page shows is
   decided by its spec (data/event_page_specs/<occasion>.json) and the
   capability registry (data/event_capabilities.json); this file only makes
   the sections the generator wrote come alive. There is no per-occasion code
   here and there must never be: an occasion that needs something new gets it
   as a shared behaviour switched on by spec data.

   Mode takeover, as before: a page sets `window.UTG_EVENT_MODE = true` inline
   BEFORE script.js loads, so script.js's own renderers no-op and leave
   #mainInput and the result grids to this controller. script.js still wires
   the input's base listeners (char count, ?q= sync, generate_text) and the
   delegated .copy-btn / .glyph-copy copy handlers; symbol-explorer.js still
   owns .art-piece-copy and the collection grids.

   Static first. Every section's default output is already in the HTML
   (scripts/lib/event-prerender.js renders it at build time from the same
   js/events/eventCompose.js this file uses), so this controller HYDRATES:
   it attaches behaviour to the markup that is there and re-renders only the
   two input-driven grids (compositions, fonts) when the visitor types.

   window.UTG_EVENT_DATA (built by scripts/generate_event_page_from_spec.py):
     slug, language, eventName, samplePhrase, analyticsLabel,
     fonts: { curatedKeys }, emojiCollections: { containerId, groups },
     kaomoji, asciiArt, phraseBank, phraseDisplay, inputs,
     compositions?: { theme, cards, intensity: {default, control, labels}, couple? },
     handoffs?: [{ id, target, title, desc, text, params, ..., targetDef }],
     ui: { copyButton, copyAriaPrefix, shareLabel, linkCopied, styleWords, ... }

   Privacy: the visitor's text and the second name never enter analytics.
   Composition copies send copy_method "event_composition" with
   copy_item_group "<occasion>:<recipe>:<intensity>" (header.js trackCopy
   drops copy_item for every non-catalogue method); hand-off clicks send the
   destination PATH only (header.js, data-cta-path-only).

   Requires (all deferred, in this order on the page): styles.js, renderer.js,
   share-core.js, script.js, decoratorEngine.js, eventCompose.js, this file,
   eventDates.js, symbol-explorer.js.
   ========================================================================== */

(function () {
  "use strict";

  const Render = window.UltraTextGenRender;
  const Compose = window.UTGEventCompose;
  const DATA = window.UTG_EVENT_DATA;
  if (!Render || !Compose || !DATA) return;

  const stylesRegistry = window.textStyles || {};
  const UI = DATA.ui || {};
  const SAMPLE = DATA.samplePhrase || DATA.eventName || "";
  const COMP = DATA.compositions || null;
  const HANDOFFS = DATA.handoffs || [];

  let renderTimer = null;
  let seed = 1;
  let intensity = COMP ? COMP.intensity.default : 2;
  let multiLineNoted = false;

  function t(key, fallback) {
    return UI[key] != null ? UI[key] : fallback;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function utg() { return window.UltraTextGen || {}; }

  function typedText() {
    const input = $("#mainInput");
    return input ? input.value.trim() : "";
  }
  function partnerText() {
    const input = $("#eventPartnerInput");
    return input ? input.value.trim() : "";
  }

  /* Rebuild a results grid without destroying the Auto Ads units placed inside
     it (script.js clearGridKeepingAds). Falls back to a plain clear only where
     script.js is not loaded. */
  function rebuildGrid(grid, build) {
    const U = utg();
    if (U.rebuildGridKeepingAds) U.rebuildGridKeepingAds(grid, build);
    else { grid.innerHTML = ""; build(); }
  }

  function appendHTML(grid, html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    grid.appendChild(tpl.content);
  }

  function updateHint(id, raw) {
    const hint = document.getElementById(id);
    if (hint) hint.hidden = !!raw;
  }

  function pageShareUrl(text) {
    return window.location.origin + window.location.pathname +
      (text ? "?q=" + encodeURIComponent(text) : "");
  }

  /* --------------------------------------------------------------------------
     Compositions
     -------------------------------------------------------------------------- */
  function renderCompositions() {
    const grid = $("#eventCompGrid");
    if (!grid || !COMP || !window.UTGDecoratorEngine) return;
    const raw = typedText();
    const text = raw || SAMPLE;
    updateHint("eventCompHint", raw);
    const cards = Compose.compose(COMP, text, partnerText(), intensity, seed, {
      renderAny: Render.renderAny,
      styles: stylesRegistry,
      engine: window.UTGDecoratorEngine
    });
    rebuildGrid(grid, function () {
      cards.forEach(function (card) {
        appendHTML(grid, Compose.html.compositionCard(card, UI));
        const node = grid.lastElementChild;
        const actions = node && node.querySelector(".event-comp-actions");
        const U = utg();
        if (actions && U.buildShareActions) {
          actions.appendChild(U.buildShareActions({
            name: card.label,
            text: card.text,
            url: pageShareUrl(raw),
            surface: "event_composition",
            itemType: "composition",
            label: t("shareLabel", "Share"),
            linkCopied: t("linkCopied", "Link copied")
          }));
        }
      });
    });
  }

  function onCompositionCopy(btn) {
    const text = btn.getAttribute("data-text") || "";
    if (!text) return;
    const recipe = btn.getAttribute("data-recipe") || "";
    const extra = {
      copy_item_group: (DATA.analyticsLabel || DATA.slug) + ":" + recipe + ":" + intensity,
      copy_has_pair: !!partnerText()
    };
    const label = (btn.closest(".event-comp-card") || btn).querySelector(".event-comp-label");
    const U = utg();
    if (U.copyText) {
      U.copyText(text, btn, label ? label.textContent : t("copiedToast", "Copied"), "event_composition", { extra: extra });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        if (U.trackCopy) U.trackCopy("event_composition", text, extra);
      });
    }
    if (text.indexOf("\n") !== -1 && !multiLineNoted && U.showToast) {
      multiLineNoted = true;
      setTimeout(function () { U.showToast(t("multiLineNote", "Copied. Some apps join the lines of a banner in a bio.")); }, 900);
    }
  }

  /* --------------------------------------------------------------------------
     Fonts. Same .style-card / .copy-btn contract as the core generator, so
     script.js's document-level copy handler does copy + toast + copy_text.
     -------------------------------------------------------------------------- */
  function renderFonts() {
    const grid = $("#eventFontsGrid");
    if (!grid) return;
    const raw = typedText();
    const text = raw || SAMPLE;
    updateHint("eventFontsHint", raw);
    const keys = (DATA.fonts && DATA.fonts.curatedKeys) || [];
    rebuildGrid(grid, function () {
      keys.forEach(function (key) {
        const style = stylesRegistry[key];
        if (!style) return;
        let out = text;
        try { out = Render.renderAny(text, style); } catch (e) { out = text; }
        const label = Compose.styleLabel(key, UI.styleWords);
        appendHTML(grid, Compose.html.fontCard(label, out, key, UI));
        const card = grid.lastElementChild;
        const U = utg();
        const btn = card && card.querySelector(".copy-btn");
        if (btn && U.decorateCopyButton) U.decorateCopyButton(btn);
        const shareId = style.slug || "";
        if (card && shareId && U.buildShareActions) {
          card.appendChild(U.buildShareActions({
            styleId: shareId,
            name: label,
            text: out,
            disabled: !raw
          }));
        }
        if (card && U.markSharedCard) U.markSharedCard(card, shareId);
      });
    });
    const U = utg();
    if (U.revealSharedCard) U.revealSharedCard(grid);
  }

  /* --------------------------------------------------------------------------
     Hand-offs: the href follows the input, so the link the visitor opens (or
     long-presses) carries their text. The static href carries fixed data only.
     -------------------------------------------------------------------------- */
  function updateHandoffs() {
    if (!HANDOFFS.length) return;
    const raw = typedText();
    const pair = partnerText();
    HANDOFFS.forEach(function (h) {
      const link = document.querySelector('.event-handoff[data-handoff="' + h.id + '"]');
      if (link) link.setAttribute("href", Compose.handoffHref(h, h.targetDef, raw, pair));
    });
  }

  /* --------------------------------------------------------------------------
     Live render
     -------------------------------------------------------------------------- */
  function renderLive() {
    renderCompositions();
    renderFonts();
    updateHandoffs();
  }

  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderLive, 120);
  }

  /* --------------------------------------------------------------------------
     Phrase bank: a tap puts the line in the box and brings the first output
     into view (it used to scroll back to the input, away from the result).
     -------------------------------------------------------------------------- */
  function onPhrase(btn) {
    const input = $("#mainInput");
    if (!input) return;
    input.value = btn.getAttribute("data-phrase") || "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const target = $("#eventCompSection") || $("#eventFontsSection");
    if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /* --------------------------------------------------------------------------
     Collection grids: the markup is static; buildGrids sees it and only binds
     the format tabs and Copy collection buttons. symbol-explorer.js loads
     after this file, so it may not exist yet; retry on load.
     -------------------------------------------------------------------------- */
  function bindCollections() {
    const cfg = DATA.emojiCollections;
    if (!cfg || !cfg.groups || !cfg.groups.length) return;
    const id = cfg.containerId || "eventEmojiGrids";
    if (!document.getElementById(id)) return;
    const ns = utg();
    if (typeof ns.buildGrids === "function") { ns.buildGrids(id, cfg.groups); return; }
    window.addEventListener("load", function () {
      const late = utg();
      if (typeof late.buildGrids === "function") late.buildGrids(id, cfg.groups);
    }, { once: true });
  }

  function readUrlState() {
    try {
      const params = new URLSearchParams(window.location.search);
      const text = params.get("text") || params.get("q");
      const input = $("#mainInput");
      if (text && input && !input.value) input.value = text;
    } catch (e) {}
  }

  function init() {
    if (!$("#eventFontsGrid") && !$("#eventCompGrid")) return;
    readUrlState();

    const input = $("#mainInput");
    if (input) input.addEventListener("input", triggerRender);
    const partner = $("#eventPartnerInput");
    if (partner) partner.addEventListener("input", triggerRender);

    $$('input[name="eventIntensity"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        intensity = parseInt(radio.value, 10) || 2;
        renderCompositions();
      });
    });
    const shuffle = $("#eventShuffle");
    if (shuffle) shuffle.addEventListener("click", function () { seed += 1; renderCompositions(); });

    document.addEventListener("click", function (e) {
      const target = e.target;
      if (!target || !target.closest) return;
      const copy = target.closest(".event-comp-copy");
      if (copy) { onCompositionCopy(copy); return; }
      const phrase = target.closest("[data-phrase]");
      if (phrase && phrase.closest("#eventPhraseGrid")) onPhrase(phrase);
    });

    renderLive();
    bindCollections();
  }

  /* Deferred scripts run before DOMContentLoaded, but the modules after this
     one (symbol-explorer.js) have not run yet; init does not depend on them. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
