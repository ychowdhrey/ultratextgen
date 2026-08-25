/* ==========================================================================
   UltraTextGen — scrollPageController.js
   Takes over the /usecase/scrolling-text/ page. Must load AFTER script.js
   (which it suppresses via window.UTG_SCROLL_MODE). Two modes, one per job:

     bio      — a repeated, divider-separated block you paste into a profile
                bio so it overflows the fixed-height box and forces a scroll.
                Reuses #resultsGrid + the .style-card / .copy-btn contract, so
                script.js's document-level clipboard + toast handler does the
                copying (we never reimplement it here).
     marquee  — a self-contained CSS-animation banner/ticker for a website,
                forum signature, or OBS overlay, with its own live preview and
                "Copy embed code" button (its own toast, since it isn't a card).

   Mode is tab-switchable and persisted in ?mode=. Mirrors the MODES-tab +
   URL-persisted-mode pattern of tattooPageController.js.

   Requires (loaded before this): styles.js, renderer.js, scrollData.js,
   scrollBuilders.js, script.js.
   ========================================================================== */

(function () {
  "use strict";

  const Render = window.UltraTextGenRender;
  /* Shared namespace owned by script.js — result sharing lives there so every
     generator uses one implementation (script.js loads before this file). */
  const UTG = window.UltraTextGen || {};
  const stylesRegistry = window.textStyles || {};
  const DATA = window.UTG_SCROLL_DATA;
  const B = window.UTG_SCROLL_BUILDERS;
  if (!Render || !DATA || !B) return;

  /* Cards rendered immediately; the rest render when scrolled near. Bio cards
     hold repeated multi-line text, so they are taller than normal style cards —
     start with fewer and cap the total to keep the DOM bounded. */
  const INITIAL_CARDS = 18;
  const MAX_STYLE_CARDS = 60;

  /* Curated Unicode styles that read well in a running banner. Only names that
     exist in the registry are offered (mirrors curved-text's STYLE_CHOICES), so
     this stays correct as the registry changes. */
  const STYLE_CHOICES = [
    ["", "Normal"],
    ["Ultra Bold", "Bold"],
    ["Ultra Italic", "Italic"],
    ["Ultra Script", "Script"],
    ["Ultra Gothic", "Gothic"],
    ["Ultra Bubble", "Bubble"],
    ["Ultra Fullwidth", "Fullwidth"],
    ["Ultra Runic", "Runic"]
  ];

  const MODES = [
    { id: "bio", label: "Bio Scroll Text",
      hint: "A repeated block that overflows a bio and scrolls" },
    { id: "marquee", label: "Marquee Banner",
      hint: "An animated ticker to embed on a site or OBS" }
  ];

  /* ---- State ---- */
  let mode = "bio";
  let currentDivider = pickDefaultDivider();
  /* Open the picker on the tab that actually holds the default divider, so its
     active chip is visible on first paint. */
  let currentDividerTab = dividerTabFor(currentDivider) || Object.keys(DATA.DIVIDERS)[0] || "basics";
  let repeatMode = "count";          // 'count' | 'fill'
  let repeatCount = 6;
  let fillPlatformId = (DATA.PLATFORM_LIMITS[0] || {}).id || "instagram";
  let joinMode = "own-line";         // 'own-line' | 'inline'
  let lazyObserver = null;
  let renderTimer = null;
  let lastEmbedSnippet = "";

  /* ---- Helpers ---- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function el(tag, className, text) {
    let node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function pickDefaultDivider() {
    let dots = DATA.DIVIDERS.dots;
    if (dots && dots.length) return dots[0];
    let first = DATA.DIVIDERS[Object.keys(DATA.DIVIDERS)[0]];
    return (first && first[0]) || { id: "none", label: "None", symbol: "" };
  }

  /* Which divider-group key holds a given divider item. */
  function dividerTabFor(divider) {
    if (!divider) return null;
    let keys = Object.keys(DATA.DIVIDERS);
    for (let i = 0; i < keys.length; i++) {
      let list = DATA.DIVIDERS[keys[i]] || [];
      for (let j = 0; j < list.length; j++) {
        if (list[j].id === divider.id) return keys[i];
      }
    }
    return null;
  }

  function styleObj(key) {
    return key ? stylesRegistry[key] : null;
  }

  /* Style a possibly multi-line string line-by-line, so reversing/transform
     styles never fold across newlines. Blank lines stay blank. */
  function applyStylePerLine(text, key) {
    let style = styleObj(key);
    if (!style) return text;
    return text.split("\n").map(function (line) {
      if (line === "") return "";
      try { return Render.renderAny(line, style); } catch (e) { return line; }
    }).join("\n");
  }

  /* Per-join character cost of the current divider + join mode. own-line adds
     "\n" + divider + "\n"; inline adds " " + divider + " " — both divider+2.
     Empty divider collapses to a single separator char. */
  function perJoinCost() {
    let sym = currentDivider ? currentDivider.symbol : "";
    return sym ? B.charLen(sym) + 2 : 1;
  }

  function resolveRepeats(text) {
    if (repeatMode === "fill") {
      let platform = DATA.PLATFORM_LIMITS.filter(function (p) { return p.id === fillPlatformId; })[0];
      return B.computeFillRepeats({
        text: text,
        dividerLength: perJoinCost(),
        platformLimit: platform ? platform.limit : 150
      });
    }
    return repeatCount;
  }

  /* --------------------------------------------------------------------------
     BIO MODE
     -------------------------------------------------------------------------- */
  function currentBioText() {
    let input = $("#scrollBioInput");
    return input ? input.value : "";
  }

  function buildBio() {
    let raw = currentBioText();
    let repeats = resolveRepeats(raw);
    return {
      text: B.buildBioScrollText({
        text: raw,
        divider: currentDivider ? currentDivider.symbol : "",
        repeats: repeats,
        joinMode: joinMode
      }),
      repeats: repeats
    };
  }

  function renderBioNote(built) {
    let note = $("#scrollBioNote");
    if (!note) return;
    note.innerHTML = "";
    if (!built.text) return;

    let count = B.charLen(built.text);
    let row = el("div", "scroll-fit-row");
    row.appendChild(el("span", "scroll-fit-count",
      "Output: " + count + " characters · " + built.repeats + " repeats"));

    DATA.PLATFORM_LIMITS.forEach(function (p) {
      let scrolls = count > p.limit;
      let badge = el("span", "scroll-fit-badge" + (scrolls ? " scrolls" : ""),
        (scrolls ? "↕ " : "· ") + p.label + " (~" + p.limit + ")");
      badge.title = scrolls
        ? "Longer than the " + p.label + " limit, so it overflows the box and scrolls."
        : "Fits inside the " + p.label + " limit — add repeats to make it overflow and scroll.";
      row.appendChild(badge);
    });

    note.appendChild(row);
    note.appendChild(el("p", "scroll-fit-legend",
      "↕ = longer than that field's limit, so it overflows the fixed-height box and scrolls. Counts are approximate and use the plain (unstyled) text."));
  }

  /* Result sharing — id is the style's own registry slug ("normal" for the
     unstyled card), matching every other generator. Page state rides along so
     the link reopens this exact arrangement. */
  function shareIdFor(name) {
    let style = stylesRegistry[name];
    return (style && style.slug) || (name ? String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-") : "");
  }

  function shareParams() {
    return {
      mode: "bio",
      divider: currentDivider ? currentDivider.id : "",
      rep: repeatMode,
      n: repeatMode === "count" ? repeatCount : "",
      fill: repeatMode === "fill" ? fillPlatformId : "",
      join: joinMode
    };
  }

  function buildBioCard(name, text) {
    let card = el("div", "style-card scroll-style-card");
    let info = el("div", "style-info");
    info.appendChild(el("p", "style-name", name));
    info.appendChild(el("p", "scroll-card-meta", B.charLen(text) + " chars"));

    let preview = el("div", "style-preview scroll-preview");
    preview.textContent = text;
    info.appendChild(preview);

    let btn = el("button", "copy-btn");
    btn.type = "button";
    btn.textContent = "Copy";
    btn.dataset.text = text;
    btn.dataset.style = name;
    if (!text) btn.disabled = true;

    /* Copy + Share share one action row — these cards carry no Save button,
       so the core generator's triangle reduces to a pair here. */
    let actions = el("div", "result-share-row");
    actions.appendChild(btn);
    info.appendChild(actions);

    /* Result-level Share, built by the shared factory in script.js. The
       creation is this bio's own text plus the divider/repeat/join settings
       that produced it, so a shared link rebuilds the same block. The input
       lives in #scrollBioInput, not #mainInput, so it is stamped explicitly. */
    let shareId = shareIdFor(name);
    if (UTG && UTG.buildShareButton) {
      actions.appendChild(UTG.buildShareButton({
        styleId: shareId,
        name: name,
        input: (($("#scrollBioInput") || {}).value || ""),
        params: shareParams(),
        disabled: !text
      }));
    }

    card.appendChild(info);
    if (UTG && UTG.markSharedCard) UTG.markSharedCard(card, shareId);
    return card;
  }

  function renderBio() {
    let grid = $("#resultsGrid");
    if (!grid) return;
    if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
    grid.innerHTML = "";

    let built = buildBio();
    renderBioNote(built);

    if (!built.text) return;

    /* Compute every style's output, collapsing identical results. */
    let items = [];
    let seen = {};
    Object.keys(stylesRegistry).forEach(function (name) {
      if (items.length >= MAX_STYLE_CARDS) return;
      let styled = applyStylePerLine(built.text, name);
      if (seen[styled]) return;
      seen[styled] = true;
      items.push({ name: name, text: styled });
    });

    if (UTG && UTG.revealSharedCard) setTimeout(function () { UTG.revealSharedCard(grid); }, 0);

    items.slice(0, INITIAL_CARDS).forEach(function (item) {
      grid.appendChild(buildBioCard(item.name, item.text));
    });

    if (items.length > INITIAL_CARDS) {
      let sentinel = el("div", "scroll-lazy-sentinel");
      grid.appendChild(sentinel);
      let renderRest = function () {
        if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
        let frag = document.createDocumentFragment();
        items.slice(INITIAL_CARDS).forEach(function (item) {
          frag.appendChild(buildBioCard(item.name, item.text));
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
     MARQUEE MODE
     -------------------------------------------------------------------------- */
  function marqueeTransform(text) {
    let sel = $("#scrollMarqueeStyle");
    let key = sel ? sel.value : "";
    if (!key) return text;
    let style = styleObj(key);
    if (!style) return text;
    try { return Render.renderAny(text, style); } catch (e) { return text; }
  }

  function readMarqueeControls() {
    let d = DATA.MARQUEE_DEFAULTS;
    function val(id, fallback) {
      let node = $(id);
      return node ? node.value : fallback;
    }
    let input = $("#scrollMarqueeInput");
    let raw = input ? input.value : d.text;
    return {
      text: marqueeTransform(raw || d.text),
      speed: val("#scrollMarqueeSpeed", d.speed),
      direction: val("#scrollMarqueeDirection", d.direction),
      gap: val("#scrollMarqueeGap", d.gap),
      fontSize: val("#scrollMarqueeSize", d.fontSize),
      textColor: val("#scrollMarqueeColor", d.textColor),
      bgColor: val("#scrollMarqueeBg", d.bgColor),
      repeatCount: val("#scrollMarqueeRepeat", d.repeatCount)
    };
  }

  function syncRangeLabels(opts) {
    setText("#scrollSpeedVal", opts.speed + "s");
    setText("#scrollGapVal", opts.gap + "px");
    setText("#scrollSizeVal", opts.fontSize + "px");
    setText("#scrollRepeatVal", String(opts.repeatCount));
  }

  function setText(sel, text) {
    let node = $(sel);
    if (node) node.textContent = text;
  }

  function renderMarquee() {
    let preview = $("#scrollMarqueePreview");
    if (!preview) return;
    let opts = readMarqueeControls();
    let snippet = B.buildMarqueeSnippet(opts);

    preview.innerHTML = snippet.previewHtml;
    syncRangeLabels(opts);

    lastEmbedSnippet = "<style>\n" + snippet.embedCss + "\n</style>\n" + snippet.embedHtml;
    let code = $("#scrollEmbedCode");
    if (code) code.value = lastEmbedSnippet;
  }

  function copyEmbed() {
    if (!lastEmbedSnippet) return;
    let done = function () { marqueeToast("Embed code copied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastEmbedSnippet).then(done, function () {
        fallbackCopy(lastEmbedSnippet, done);
      });
    } else {
      fallbackCopy(lastEmbedSnippet, done);
    }
  }

  function fallbackCopy(text, done) {
    let ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  let marqueeToastTimer = null;
  function marqueeToast(msg) {
    let toast = $("#scrollToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-visible");
    if (marqueeToastTimer) clearTimeout(marqueeToastTimer);
    marqueeToastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1600);
  }

  /* --------------------------------------------------------------------------
     Debounced render dispatch
     -------------------------------------------------------------------------- */
  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      if (mode === "bio") renderBio();
      else renderMarquee();
    }, 120);
  }

  /* --------------------------------------------------------------------------
     Mode tabs + panel switching
     -------------------------------------------------------------------------- */
  function buildModeTabs() {
    let host = $("#scrollModeTabs");
    if (!host) return;
    MODES.forEach(function (m) {
      let tab = el("button", "scroll-mode-tab" + (m.id === mode ? " active" : ""));
      tab.type = "button";
      tab.dataset.mode = m.id;
      tab.appendChild(el("span", "scroll-mode-tab-label", m.label));
      tab.appendChild(el("span", "scroll-mode-tab-hint", m.hint));
      tab.addEventListener("click", function () { setMode(m.id); });
      host.appendChild(tab);
    });
  }

  function setMode(next) {
    mode = (next === "marquee") ? "marquee" : "bio";
    $$(".scroll-mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.mode === mode);
    });
    $$("[data-scroll-panel]").forEach(function (panel) {
      panel.classList.toggle("u-hidden", panel.dataset.scrollPanel !== mode);
    });
    try {
      let url = new URL(window.location.href);
      if (mode === "bio") url.searchParams.delete("mode");
      else url.searchParams.set("mode", mode);
      history.replaceState(null, "", url.toString());
    } catch (e) {}

    if (mode === "bio") renderBio();
    else renderMarquee();
  }

  /* --------------------------------------------------------------------------
     Bio controls
     -------------------------------------------------------------------------- */
  function buildPresets() {
    let host = $("#scrollPresets");
    if (!host) return;
    DATA.PRESET_MESSAGES.forEach(function (phrase) {
      let chip = el("button", "scroll-preset-chip", phrase);
      chip.type = "button";
      chip.addEventListener("click", function () {
        let input = $("#scrollBioInput");
        if (!input) return;
        input.value = phrase;
        renderBio();
      });
      host.appendChild(chip);
    });
  }

  function buildDividerPicker() {
    let tabsHost = $("#scrollDividerTabs");
    let gridHost = $("#scrollDividerGrid");
    if (!tabsHost || !gridHost) return;

    Object.keys(DATA.DIVIDERS).forEach(function (tabKey) {
      let tab = el("button", "scroll-tab" + (tabKey === currentDividerTab ? " active" : ""),
        capitalize(tabKey));
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
    let gridHost = $("#scrollDividerGrid");
    if (!gridHost) return;
    gridHost.innerHTML = "";
    let list = DATA.DIVIDERS[currentDividerTab] || [];
    list.forEach(function (item) {
      let active = currentDivider && currentDivider.id === item.id;
      let chip = el("button", "vertical-chip" + (active ? " active" : ""), item.label);
      chip.type = "button";
      chip.title = item.symbol ? "Divider: " + item.symbol : "No divider";
      chip.addEventListener("click", function () {
        currentDivider = item;
        $$(".vertical-chip", gridHost).forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        renderBio();
      });
      gridHost.appendChild(chip);
    });
  }

  function buildRepeatControls() {
    /* Repeat-mode chips: explicit count vs. fill to a platform limit. */
    let modeHost = $("#scrollRepeatModeTabs");
    if (modeHost) {
      [["count", "Set count"], ["fill", "Fill to platform"]].forEach(function (pair) {
        let chip = el("button", "vertical-chip" + (pair[0] === repeatMode ? " active" : ""), pair[1]);
        chip.type = "button";
        chip.dataset.repeatMode = pair[0];
        chip.addEventListener("click", function () {
          repeatMode = pair[0];
          $$(".vertical-chip", modeHost).forEach(function (c) {
            c.classList.toggle("active", c.dataset.repeatMode === repeatMode);
          });
          syncRepeatRows();
          renderBio();
        });
        modeHost.appendChild(chip);
      });
    }

    let range = $("#scrollRepeatCount");
    if (range) {
      range.value = String(repeatCount);
      range.max = String(B.MAX_REPEATS);
      let label = $("#scrollRepeatValue");
      if (label) label.textContent = String(repeatCount);
      range.addEventListener("input", function () {
        repeatCount = Math.max(1, Math.min(B.MAX_REPEATS, parseInt(range.value, 10) || 1));
        if (label) label.textContent = String(repeatCount);
        renderBio();
      });
    }

    let select = $("#scrollPlatformSelect");
    if (select) {
      DATA.PLATFORM_LIMITS.forEach(function (p) {
        let opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.label + " (~" + p.limit + ")";
        select.appendChild(opt);
      });
      select.value = fillPlatformId;
      select.addEventListener("change", function () {
        fillPlatformId = select.value;
        renderBio();
      });
    }
    syncRepeatRows();
  }

  function syncRepeatRows() {
    let countRow = $("#scrollCountRow");
    let fillRow = $("#scrollFillRow");
    if (countRow) countRow.classList.toggle("u-hidden", repeatMode !== "count");
    if (fillRow) fillRow.classList.toggle("u-hidden", repeatMode !== "fill");
  }

  function buildJoinControls() {
    let host = $("#scrollJoinTabs");
    if (!host) return;
    [["own-line", "Divider on its own line"], ["inline", "Divider inline"]].forEach(function (pair) {
      let chip = el("button", "vertical-chip" + (pair[0] === joinMode ? " active" : ""), pair[1]);
      chip.type = "button";
      chip.dataset.joinMode = pair[0];
      chip.addEventListener("click", function () {
        joinMode = pair[0];
        $$(".vertical-chip", host).forEach(function (c) {
          c.classList.toggle("active", c.dataset.joinMode === joinMode);
        });
        renderBio();
      });
      host.appendChild(chip);
    });
  }

  function bindBioInput() {
    let input = $("#scrollBioInput");
    if (input) input.addEventListener("input", triggerRender);
  }

  /* --------------------------------------------------------------------------
     Marquee controls
     -------------------------------------------------------------------------- */
  function fillSelect(select, choices, isStyle) {
    if (!select) return;
    select.innerHTML = "";
    choices.forEach(function (pair) {
      let val = pair[0];
      if (isStyle && val && !stylesRegistry[val]) return;
      let opt = document.createElement("option");
      opt.value = val;
      opt.textContent = pair[1];
      select.appendChild(opt);
    });
  }

  function buildMarqueeControls() {
    let d = DATA.MARQUEE_DEFAULTS;

    fillSelect($("#scrollMarqueeStyle"), STYLE_CHOICES, true);
    fillSelect($("#scrollMarqueeDirection"),
      [["left", "Right → Left"], ["right", "Left → Right"]], false);

    setVal("#scrollMarqueeInput", d.text);
    setVal("#scrollMarqueeSpeed", d.speed);
    setVal("#scrollMarqueeGap", d.gap);
    setVal("#scrollMarqueeSize", d.fontSize);
    setVal("#scrollMarqueeRepeat", d.repeatCount);
    setVal("#scrollMarqueeColor", d.textColor);
    setVal("#scrollMarqueeBg", d.bgColor);

    let controls = [
      "#scrollMarqueeInput", "#scrollMarqueeStyle", "#scrollMarqueeDirection",
      "#scrollMarqueeSpeed", "#scrollMarqueeGap", "#scrollMarqueeSize",
      "#scrollMarqueeColor", "#scrollMarqueeBg", "#scrollMarqueeRepeat"
    ];
    controls.forEach(function (sel) {
      let node = $(sel);
      if (!node) return;
      let ev = (node.tagName === "SELECT") ? "change" : "input";
      node.addEventListener(ev, renderMarquee);
    });

    let copyBtn = $("#scrollCopyEmbed");
    if (copyBtn) copyBtn.addEventListener("click", copyEmbed);
  }

  function setVal(sel, value) {
    let node = $(sel);
    if (node) node.value = value;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  function readUrlState() {
    try {
      let params = new URLSearchParams(window.location.search);
      let urlMode = params.get("mode");
      if (urlMode && MODES.some(function (m) { return m.id === urlMode; })) mode = urlMode;
      let text = params.get("text") || params.get("q");
      let input = $("#scrollBioInput");
      if (text && input && !input.value) input.value = text;

      /* Arrangement state from a result-level share link. Every value is
         validated against this page's own vocabulary; anything unknown is
         ignored and the page opens with its defaults. */
      let divider = params.get("divider");
      if (divider) {
        Object.keys(DATA.DIVIDERS || {}).forEach(function (tab) {
          (DATA.DIVIDERS[tab] || []).forEach(function (d) {
            if (d && d.id === divider) {
              currentDivider = d;
              currentDividerTab = tab;
            }
          });
        });
      }

      let rep = params.get("rep");
      if (rep === "count" || rep === "fill") repeatMode = rep;

      let n = params.get("n");
      if (n) {
        let parsed = parseInt(n, 10);
        if (parsed > 0) repeatCount = Math.min(parsed, 50);
      }

      let fill = params.get("fill");
      if (fill && (DATA.PLATFORM_LIMITS || []).some(function (pl) { return pl.id === fill; })) {
        fillPlatformId = fill;
      }

      let join = params.get("join");
      if (join === "own-line" || join === "inline") joinMode = join;
    } catch (e) {}
  }

  function init() {
    /* URL state first, so a ?q=/?text= link fills the input before we fall
       back to the preloaded sample. */
    readUrlState();

    let bioInput = $("#scrollBioInput");
    /* Preload a sample so there is output on first paint (mirrors the other
       studio pages). "I love you" is the confirmed high-intent variant. */
    if (bioInput && !bioInput.value.trim()) bioInput.value = "I love you";

    buildModeTabs();
    buildPresets();
    buildDividerPicker();
    buildRepeatControls();
    buildJoinControls();
    bindBioInput();
    buildMarqueeControls();

    setMode(mode);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
