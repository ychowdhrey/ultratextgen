/* ==========================================================================
   UltraTextGen — repeatPageController.js
   Takes over the /usecase/repeat-text/ page. Must load AFTER script.js
   (which it suppresses via window.UTG_REPEAT_MODE). One job, one arrangement
   picker (no mode tabs): repeat a phrase N times and arrange the copies —
   inline, block, or a shape (pyramid, reverse pyramid, staircase, diagonal,
   box grid).

   It reuses #resultsGrid + the .style-card / .copy-btn contract (with
   dataset.text), so script.js's document-level clipboard + toast handler does
   the copying — never reimplemented here. It reuses the scrolling-text build:
   window.UTG_SCROLL_DATA.DIVIDERS for the divider picker and
   window.UTG_SCROLL_BUILDERS (via repeatShapes.js) for the repeat-and-join.

   applyStylePerLine and makePlatformSafe are re-implemented locally on purpose
   (each is tiny), keeping this module independent — same spirit as
   verticalLayouts.js's intentionally-duplicated FLIP_MAP.

   Requires (loaded before this): styles.js, renderer.js, scrollData.js,
   scrollBuilders.js, repeatData.js, repeatShapes.js, script.js.
   ========================================================================== */

(function () {
  "use strict";

  const Render = window.UltraTextGenRender;
  const stylesRegistry = window.textStyles || {};
  const DATA = window.UTG_REPEAT_DATA;
  const SCROLL_DATA = window.UTG_SCROLL_DATA;
  const B = window.UTG_SCROLL_BUILDERS;
  const SHAPES_API = window.UTG_REPEAT_SHAPES;
  if (!Render || !DATA || !SCROLL_DATA || !B || !SHAPES_API) return;

  const SHAPES = SHAPES_API.SHAPES;

  /* Cards rendered immediately; the rest render when scrolled near. A repeated
     block can be tall, so start with fewer and cap the total (mirrors the
     scrolling-text controller's exact constants). */
  const INITIAL_CARDS = 18;
  const MAX_STYLE_CARDS = 60;

  /* Invisible-but-real character (Braille Pattern Blank). Instagram/TikTok and
     similar apps strip empty lines and leading spaces on save; indentation and
     blank lines rebuilt from U+2800 survive (same trick as vertical text). */
  const BRAILLE_BLANK = "⠀";

  /* Sample used to draw each shape's mini preview in the picker. */
  const SAMPLE_PHRASE = "hi";

  /* ---- State ---- */
  let currentShapeId = (DATA.DEFAULTS && DATA.DEFAULTS.shape) || "block";
  let repeatCount = (DATA.DEFAULTS && DATA.DEFAULTS.count) || 100;
  let columns = (DATA.DEFAULTS && DATA.DEFAULTS.columns) || SHAPES_API.DEFAULT_COLUMNS;
  let currentDivider = pickDefaultDivider();
  let currentDividerTab = dividerTabFor(currentDivider) || Object.keys(SCROLL_DATA.DIVIDERS)[0] || "basics";
  let lazyObserver = null;
  let renderTimer = null;

  /* ---- Helpers ---- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function el(tag, className, text) {
    let node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function charLen(str) { return B.charLen(str); }

  function shapeById(id) {
    return SHAPES.filter(function (s) { return s.id === id; })[0] || SHAPES[0];
  }

  function pickDefaultDivider() {
    /* Default to "None" so the primary output ("sorry 100 times") is a clean
       repeated list; users can add a divider for inline/block if they want. */
    let basics = SCROLL_DATA.DIVIDERS.basics;
    if (basics && basics.length) return basics[0];
    let first = SCROLL_DATA.DIVIDERS[Object.keys(SCROLL_DATA.DIVIDERS)[0]];
    return (first && first[0]) || { id: "none", label: "None", symbol: "" };
  }

  function dividerTabFor(divider) {
    if (!divider) return null;
    let keys = Object.keys(SCROLL_DATA.DIVIDERS);
    for (let i = 0; i < keys.length; i++) {
      let list = SCROLL_DATA.DIVIDERS[keys[i]] || [];
      for (let j = 0; j < list.length; j++) {
        if (list[j].id === divider.id) return keys[i];
      }
    }
    return null;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* Style a possibly multi-line string line-by-line, so reversing/transform
     styles never fold across newlines. Blank lines stay blank. */
  function applyStylePerLine(text, key) {
    let style = key ? stylesRegistry[key] : null;
    if (!style) return text;
    return text.split("\n").map(function (line) {
      if (line === "") return "";
      try { return Render.renderAny(line, style); } catch (e) { return line; }
    }).join("\n");
  }

  /* Pad blank lines and rebuild leading indents from U+2800 so a shape's
     centering / indentation survives apps that strip whitespace. Applied last,
     after styling — mirrors verticalPageController.js's makePlatformSafe. */
  function makePlatformSafe(text) {
    return text.split("\n").map(function (line) {
      let noTrail = line.replace(/[ \t]+$/, "");
      if (noTrail === "") return BRAILLE_BLANK;
      return noTrail.replace(/^ +/, function (m) {
        return BRAILLE_BLANK.repeat(m.length);
      });
    }).join("\n");
  }

  /* --------------------------------------------------------------------------
     Build the plain (unstyled) arrangement from the current controls.
     -------------------------------------------------------------------------- */
  function currentPhrase() {
    let input = $("#repeatPhraseInput");
    return input ? input.value : "";
  }

  function buildArrangement() {
    let shape = shapeById(currentShapeId);
    return shape.fn(currentPhrase(), repeatCount, {
      divider: currentDivider ? currentDivider.symbol : "",
      columns: columns
    });
  }

  /* --------------------------------------------------------------------------
     Output note (copies / characters / lines)
     -------------------------------------------------------------------------- */
  function renderNote(rawText) {
    let note = $("#repeatNote");
    if (!note) return;
    note.innerHTML = "";
    if (!rawText) return;
    let copies = SHAPES_API.clampCount(repeatCount);
    let lines = rawText.split("\n").length;
    note.appendChild(el("span", "scroll-fit-count",
      "Output: " + copies + " copies · " + charLen(rawText) + " characters · " + lines + " lines"));
  }

  /* --------------------------------------------------------------------------
     Result cards
     -------------------------------------------------------------------------- */
  function buildCard(name, text) {
    let card = el("div", "style-card scroll-style-card repeat-style-card");
    let info = el("div", "style-info");
    info.appendChild(el("p", "style-name", name));
    info.appendChild(el("p", "scroll-card-meta", charLen(text) + " chars"));

    let preview = el("div", "style-preview repeat-preview");
    preview.textContent = text;
    info.appendChild(preview);

    let btn = el("button", "copy-btn");
    btn.type = "button";
    btn.textContent = "Copy";
    btn.dataset.text = text;
    btn.dataset.style = name;
    if (!text) btn.disabled = true;
    info.appendChild(btn);

    card.appendChild(info);
    return card;
  }

  function renderResults() {
    let grid = $("#resultsGrid");
    if (!grid) return;
    if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
    grid.innerHTML = "";

    let rawText = buildArrangement();
    renderNote(rawText);
    if (!rawText) return;

    /* Compute every style's output, collapsing identical results. The plain
       (unstyled) block is the primary want on this page ("sorry 100 times"),
       so it leads as its own "Normal" card before the Unicode styles. */
    let items = [];
    let seen = {};

    let plain = makePlatformSafe(rawText);
    items.push({ name: "Normal", text: plain });
    seen[plain] = true;

    Object.keys(stylesRegistry).forEach(function (name) {
      if (items.length >= MAX_STYLE_CARDS) return;
      let styled = makePlatformSafe(applyStylePerLine(rawText, name));
      if (seen[styled]) return;
      seen[styled] = true;
      items.push({ name: name, text: styled });
    });

    items.slice(0, INITIAL_CARDS).forEach(function (item) {
      grid.appendChild(buildCard(item.name, item.text));
    });

    if (items.length > INITIAL_CARDS) {
      let sentinel = el("div", "scroll-lazy-sentinel");
      grid.appendChild(sentinel);
      let renderRest = function () {
        if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
        let frag = document.createDocumentFragment();
        items.slice(INITIAL_CARDS).forEach(function (item) {
          frag.appendChild(buildCard(item.name, item.text));
        });
        sentinel.replaceWith(frag);
      };
      if ("IntersectionObserver" in window) {
        lazyObserver = new IntersectionObserver(function (entries) {
          if (entries.some(function (e) { return e.isIntersecting; })) renderRest();
        }, { rootMargin: "100000px 0px 600px 0px" });
        lazyObserver.observe(sentinel);
      } else {
        renderRest();
      }
    }
  }

  /* --------------------------------------------------------------------------
     Debounced render dispatch (for typing performance)
     -------------------------------------------------------------------------- */
  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderResults, 120);
  }

  /* --------------------------------------------------------------------------
     Phrase presets
     -------------------------------------------------------------------------- */
  function buildPresets() {
    let host = $("#repeatPresets");
    if (!host) return;
    DATA.PRESET_MESSAGES.forEach(function (phrase) {
      let chip = el("button", "scroll-preset-chip", phrase);
      chip.type = "button";
      chip.addEventListener("click", function () {
        let input = $("#repeatPhraseInput");
        if (!input) return;
        input.value = phrase;
        renderResults();
      });
      host.appendChild(chip);
    });
  }

  /* --------------------------------------------------------------------------
     Arrangement (shape) picker — visual buttons with a mini preview each,
     mirroring verticalPageController.js's layout picker.
     -------------------------------------------------------------------------- */
  function shapeMini(shape) {
    let count = shapeMiniCount(shape.id);
    let out = shape.fn(SAMPLE_PHRASE, count, { divider: "", columns: 3 });
    return out || SAMPLE_PHRASE;
  }

  function shapeMiniCount(id) {
    if (id === "inline" || id === "block") return 3;
    if (id === "staircase" || id === "diagonal") return 4;
    return 6; // pyramids + box
  }

  function buildShapePicker() {
    let host = $("#repeatShapePicker");
    if (!host) return;
    host.innerHTML = "";
    SHAPES.forEach(function (shape) {
      let active = shape.id === currentShapeId;
      let btn = el("button", "repeat-shape-option" + (active ? " active" : ""));
      btn.type = "button";
      btn.dataset.shape = shape.id;
      btn.title = shape.description;
      btn.setAttribute("aria-pressed", String(active));

      let mini = el("pre", "repeat-shape-mini");
      mini.setAttribute("aria-hidden", "true");
      mini.textContent = shapeMini(shape);
      btn.appendChild(mini);
      btn.appendChild(el("span", "repeat-shape-name", shape.label));

      btn.addEventListener("click", function () {
        currentShapeId = shape.id;
        $$(".repeat-shape-option", host).forEach(function (b) {
          let on = b.dataset.shape === currentShapeId;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", String(on));
        });
        syncContextControls();
        renderResults();
      });
      host.appendChild(btn);
    });
  }

  /* Show the divider block only for inline/block, the columns block only for
     box — a divider or a column count is meaningless for the other shapes. */
  function syncContextControls() {
    let shape = shapeById(currentShapeId);
    let dividerBlock = $("#repeatDividerBlock");
    let columnsBlock = $("#repeatColumnsBlock");
    if (dividerBlock) dividerBlock.classList.toggle("u-hidden", !shape.divider);
    if (columnsBlock) columnsBlock.classList.toggle("u-hidden", !shape.columns);
  }

  /* --------------------------------------------------------------------------
     Count controls — quick-fill chips + a slider bounded by MAX_REPEATS
     -------------------------------------------------------------------------- */
  function setCount(n) {
    repeatCount = Math.max(1, Math.min(B.MAX_REPEATS, Math.floor(Number(n)) || 1));
    let range = $("#repeatCountRange");
    if (range) range.value = String(repeatCount);
    let label = $("#repeatCountValue");
    if (label) label.textContent = String(repeatCount);
    syncCountChips();
  }

  function syncCountChips() {
    $$("#repeatCountPresets .scroll-preset-chip").forEach(function (chip) {
      chip.classList.toggle("active", parseInt(chip.dataset.count, 10) === repeatCount);
    });
  }

  function buildCountControls() {
    let host = $("#repeatCountPresets");
    if (host) {
      DATA.COUNT_PRESETS.forEach(function (n) {
        let chip = el("button", "scroll-preset-chip", "×" + n);
        chip.type = "button";
        chip.dataset.count = String(n);
        chip.addEventListener("click", function () {
          setCount(n);
          renderResults();
        });
        host.appendChild(chip);
      });
    }

    let range = $("#repeatCountRange");
    if (range) {
      range.max = String(B.MAX_REPEATS);
      range.value = String(repeatCount);
      let label = $("#repeatCountValue");
      if (label) label.textContent = String(repeatCount);
      range.addEventListener("input", function () {
        setCount(range.value);
        renderResults();
      });
    }
    syncCountChips();
  }

  /* --------------------------------------------------------------------------
     Columns control (box grid only)
     -------------------------------------------------------------------------- */
  function buildColumnsControl() {
    let range = $("#repeatColumnsRange");
    if (!range) return;
    range.max = String(SHAPES_API.MAX_COLUMNS || 12);
    range.value = String(columns);
    let label = $("#repeatColumnsValue");
    if (label) label.textContent = String(columns);
    range.addEventListener("input", function () {
      columns = SHAPES_API.clampColumns(range.value);
      if (label) label.textContent = String(columns);
      renderResults();
    });
  }

  /* --------------------------------------------------------------------------
     Divider picker — reuses window.UTG_SCROLL_DATA.DIVIDERS
     -------------------------------------------------------------------------- */
  function buildDividerPicker() {
    let tabsHost = $("#repeatDividerTabs");
    let gridHost = $("#repeatDividerGrid");
    if (!tabsHost || !gridHost) return;

    Object.keys(SCROLL_DATA.DIVIDERS).forEach(function (tabKey) {
      let tab = el("button", "scroll-tab" + (tabKey === currentDividerTab ? " active" : ""), capitalize(tabKey));
      tab.type = "button";
      tab.dataset.dividerTab = tabKey;
      tab.addEventListener("click", function () {
        currentDividerTab = tabKey;
        $$(".scroll-tab", tabsHost).forEach(function (t) {
          t.classList.toggle("active", t.dataset.dividerTab === currentDividerTab);
        });
        renderDividerGrid();
      });
      tabsHost.appendChild(tab);
    });
    renderDividerGrid();
  }

  function renderDividerGrid() {
    let gridHost = $("#repeatDividerGrid");
    if (!gridHost) return;
    gridHost.innerHTML = "";
    let list = SCROLL_DATA.DIVIDERS[currentDividerTab] || [];
    list.forEach(function (item) {
      let active = currentDivider && currentDivider.id === item.id;
      let chip = el("button", "vertical-chip" + (active ? " active" : ""), item.label);
      chip.type = "button";
      chip.title = item.symbol ? "Divider: " + item.symbol : "No divider";
      chip.addEventListener("click", function () {
        currentDivider = item;
        $$(".vertical-chip", gridHost).forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        renderResults();
      });
      gridHost.appendChild(chip);
    });
  }

  function bindPhraseInput() {
    let input = $("#repeatPhraseInput");
    if (input) input.addEventListener("input", triggerRender);
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  function readUrlState() {
    try {
      let params = new URLSearchParams(window.location.search);
      let text = params.get("text") || params.get("q");
      let input = $("#repeatPhraseInput");
      if (text && input && !input.value) input.value = text;

      let n = params.get("n") || params.get("count");
      if (n != null && n !== "") repeatCount = Math.max(1, Math.min(B.MAX_REPEATS, parseInt(n, 10) || repeatCount));

      let shape = params.get("shape");
      if (shape && SHAPES.some(function (s) { return s.id === shape; })) currentShapeId = shape;
    } catch (e) {}
  }

  function init() {
    readUrlState();

    let input = $("#repeatPhraseInput");
    if (input && !input.value.trim()) input.value = (DATA.DEFAULTS && DATA.DEFAULTS.phrase) || "Sorry";

    buildPresets();
    buildShapePicker();
    buildCountControls();
    buildColumnsControl();
    buildDividerPicker();
    bindPhraseInput();
    syncContextControls();
    renderResults();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
