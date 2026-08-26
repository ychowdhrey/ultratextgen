/*
 * cursivePageController.js — dedicated controller for the cursive experience
 * (category/cursive-fonts/). Owns rendering on the page: the flourish-preset
 * generator, the cursive letters A–Z explorer, the printable alphabet
 * practice sheet, and the name & signature studio. The page sets
 * window.UTG_CURSIVE_MODE = true so the shared script.js stands down, but its
 * document-level .copy-btn / .glyph-copy delegation (clipboard + toast) is
 * reused via the standard data-text contract. Self-contained IIFE; depends on
 * window.textStyles (styles.js), window.UltraTextGenRender (renderer.js) and
 * window.UTG_CURSIVE_DATA (cursiveData.js).
 */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const D = window.UTG_CURSIVE_DATA || {};

  // Optional per-page localization table (see the translated cursive pages).
  // Every user-facing string falls back to English, so the English page needs
  // no cursiveI18n at all and behaves exactly as before.
  const I18N = window.cursiveI18n || {};
  function t(key, fallback) {
    return I18N[key] != null ? I18N[key] : fallback;
  }
  // Look up a localized value in a nested table (e.g. I18N.presets['Script Hearts']).
  function pick(table, id, fallback) {
    const sec = I18N[table];
    return (sec && sec[id] != null) ? sec[id] : fallback;
  }
  // Fill {placeholders} in a template string.
  function fmt(str, map) {
    return String(str).replace(/\{(\w+)\}/g, (m, k) => (map[k] != null ? map[k] : m));
  }
  // Display label for a registry style key ("Ultra Script" → localized name).
  function styleLabel(name) { return pick("styles", name, name); }

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const GLYPH_FONT = "'Plus Jakarta Sans', 'Segoe UI Symbol', 'Noto Sans Symbols 2', sans-serif";
  const DEMO_TEXT = t("demoText", "Hello");

  const el = {
    input: $("#mainInput"),
    charCount: $("#charCount"),
    quickRow: $("#cursiveQuickRow"),
    fitRow: $("#cursiveFitRow"),
    resultsGrid: $("#resultsGrid"),
    letterPanel: $("#cursiveLetterPanel"),
    nameInput: $("#cursiveNameInput"),
    sigControls: $("#cursiveSignatureControls"),
    nameResults: $("#cursiveNameResults"),
    printRoot: $("#cursivePrintRoot"),
    printBtn: $("#cursivePrintSheet")
  };

  /* ---------------------------------------------------------------
     Rendering helpers
     --------------------------------------------------------------- */

  const UTG = window.UltraTextGen || {};

  function registry() { return window.textStyles || {}; }

  function cursiveStyles() {
    const reg = registry();
    return Object.keys(reg).filter((name) => {
      const fam = reg[name] && reg[name].familySlug;
      return fam === "cursive" || (Array.isArray(fam) && fam.indexOf("cursive") !== -1);
    });
  }

  function renderWith(text, styleName) {
    const style = registry()[styleName];
    const R = window.UltraTextGenRender;
    if (!style || !R || typeof R.renderAny !== "function") return text;
    try { return R.renderAny(text, style); } catch (e) { return text; }
  }

  function applyCombining(text, mark) {
    return [...text].map((c) => (c === " " || c === "\n") ? c : c + mark).join("");
  }

  function applyWrap(text, wrap) {
    let out = text;
    if (wrap.combining) out = applyCombining(out, wrap.combining);
    return (wrap.pre || "") + out + (wrap.post || "");
  }

  // Apply a preset: render through its base style, add the preset's combining
  // mark to the letters only, then let the decorator and the preset's own
  // pre/post wrap around — so an underlined name keeps its flourish clean.
  function renderPreset(text, preset, decorator) {
    let out = renderWith(text, preset.base);
    if (!out || !out.trim()) return "";
    if (preset.combining) out = applyCombining(out, preset.combining);
    if (decorator && decorator.name !== "None") out = applyWrap(out, decorator);
    return (preset.pre || "") + out + (preset.post || "");
  }

  function initialsOf(text) {
    return text.trim().split(/\s+/).map((w) => [...w][0] || "").join(" ").toUpperCase();
  }

  function buildCard(name, text, opts) {
    const o = opts || {};
    const card = document.createElement("div");
    card.className = "style-card cursive-card";

    const info = document.createElement("div");
    info.className = "style-info";

    const label = document.createElement("p");
    label.className = "style-name";
    label.textContent = name;
    info.appendChild(label);

    const preview = document.createElement("p");
    preview.className = "style-preview cursive-preview";
    preview.textContent = text;
    info.appendChild(preview);

    card.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "cursive-card-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = t("copy", "Copy");
    if (UTG.decorateCopyButton) UTG.decorateCopyButton(btn);
    if (o.demo || !text) {
      btn.disabled = true;
      btn.title = t("typeFirst", "Type your text above first");
    } else {
      btn.dataset.text = text;
      btn.dataset.style = o.styleName || name;
    }
    actions.appendChild(btn);

    if (o.png && text && !o.demo) {
      const png = document.createElement("button");
      png.type = "button";
      png.className = "cursive-png-btn";
      png.textContent = "PNG";
      png.title = t("downloadPngTitle", "Download as PNG image");
      png.addEventListener("click", () => downloadTextPNG(text, o.pngName || name, { transparent: transparentBg }));
      actions.appendChild(png);

      const svg = document.createElement("button");
      svg.type = "button";
      svg.className = "cursive-png-btn";
      svg.textContent = "SVG";
      svg.title = t("downloadSvgTitle", "Download as SVG — stays sharp at any size");
      svg.addEventListener("click", () => downloadTextSVG(text, o.pngName || name, { transparent: transparentBg }));
      actions.appendChild(svg);
    }

    card.appendChild(actions);

    if (o.shareId && !o.demo && text && UTG.buildShareActions) {
      card.appendChild(UTG.buildShareActions({
        styleId: o.shareId,
        name: name,
        text: text
      }));
    }
    if (o.shareId && UTG.markSharedCard) UTG.markSharedCard(card, o.shareId);
    return card;
  }

  /* ---------------------------------------------------------------
     Main generator — registry cursive styles + flourish presets
     --------------------------------------------------------------- */

  function renderResults() {
    if (!el.resultsGrid) return;
    const raw = el.input ? el.input.value : "";
    const text = raw.trim() ? raw : DEMO_TEXT;
    const isDemo = !raw.trim();

    const frag = document.createDocumentFragment();
    const seen = {};

    cursiveStyles().forEach((name) => {
      const out = renderWith(text, name);
      if (!out || seen[out]) return;
      seen[out] = true;
      const reg = registry()[name] || {};
      frag.appendChild(buildCard(styleLabel(name), out, { demo: isDemo, styleName: name, shareId: reg.slug || "" }));
    });

    (D.presets || []).forEach((preset) => {
      const out = renderPreset(text, preset);
      if (!out || seen[out]) return;
      seen[out] = true;
      const presetId = "cur-" + String(preset.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      frag.appendChild(buildCard(pick("presets", preset.name, preset.name), out, { demo: isDemo, styleName: preset.name, shareId: presetId }));
    });

    el.resultsGrid.innerHTML = "";
    el.resultsGrid.appendChild(frag);
    if (UTG.revealSharedCard) UTG.revealSharedCard(el.resultsGrid);
    renderFitBadges(isDemo ? "" : renderWith(raw, "Ultra Script"));
  }

  function renderFitBadges(rendered) {
    if (!el.fitRow) return;
    el.fitRow.innerHTML = "";
    if (!rendered) { el.fitRow.hidden = true; return; }
    el.fitRow.hidden = false;

    const count = [...rendered].length;
    const note = document.createElement("span");
    note.className = "vertical-fit-count";
    note.textContent = count + " " + t("characters", "characters");
    el.fitRow.appendChild(note);

    (D.platformLimits || []).forEach((p) => {
      const ok = count <= p.limit;
      const badge = document.createElement("span");
      badge.className = "vertical-fit-badge " + (ok ? "fit" : "no-fit");
      badge.textContent = (ok ? "✓ " : "✗ ") + pick("platformLimits", p.label, p.label) + " (" + p.limit + ")";
      el.fitRow.appendChild(badge);
    });
  }

  function buildQuickRow() {
    if (!el.quickRow || !el.input) return;
    const words = Array.isArray(I18N.quickWords) ? I18N.quickWords : (D.quickWords || []);
    words.forEach((word) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "vertical-chip cursive-quick-chip";
      chip.textContent = word;
      chip.addEventListener("click", () => {
        el.input.value = word;
        el.input.dispatchEvent(new Event("input", { bubbles: true }));
        el.input.focus();
      });
      el.quickRow.appendChild(chip);
    });
  }

  /* ---------------------------------------------------------------
     Cursive letters A–Z explorer
     --------------------------------------------------------------- */

  function letterVariants(ch) {
    const upper = ch.toUpperCase();
    const lower = ch.toLowerCase();
    const out = [];
    const seen = {};
    cursiveStyles().forEach((name) => {
      const style = registry()[name];
      if (!style || style.type !== "map") return; // single letters need plain maps
      const u = renderWith(upper, name);
      const l = renderWith(lower, name);
      if (u === upper && l === lower) return;
      const key = u + l;
      if (seen[key]) return;
      seen[key] = true;
      out.push({ name, upper: u, lower: l });
    });
    return out;
  }

  // Shared filename slug for every signature download.
  function sigSlug(label) {
    return String(label || "signature").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "signature";
  }

  // Hand a Blob to the browser as a download, then release the object URL.
  function saveBlob(blob, filename) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Render any text (signature, word) onto a wide canvas, scaling the font
  // down so long names still fit, and download it as a PNG. Leaving the
  // canvas unpainted keeps the alpha channel intact, which is what makes a
  // signature usable over a document, a photo, or a dark email footer —
  // painting white first (the old behaviour) baked in a background that
  // could never be removed afterwards.
  function downloadTextPNG(text, label, opts) {
    const o = opts || {};
    const width = 1600, height = 640, pad = 120;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!o.transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontSize = 220;
    ctx.font = "700 " + fontSize + "px " + GLYPH_FONT;
    const measured = ctx.measureText(text).width;
    if (measured > width - pad * 2) {
      fontSize = Math.max(60, Math.floor(fontSize * (width - pad * 2) / measured));
      ctx.font = "700 " + fontSize + "px " + GLYPH_FONT;
    }
    ctx.fillStyle = o.ink || "#1a1a2e";
    ctx.fillText(text, width / 2, height * 0.52);
    canvas.toBlob((blob) => saveBlob(blob, "cursive-" + sigSlug(label) + ".png"), "image/png");
  }

  // Vector export. Same <text>-element approach printablesEngine.js already
  // uses for its word outlines: native SVG, no bundled font binary, and it
  // stays sharp at any size — which a 1600px raster cannot do when someone
  // scales a signature up for print or a logo.
  function downloadTextSVG(text, label, opts) {
    const o = opts || {};
    const width = 1600, height = 640, pad = 120;
    // Measure with a throwaway canvas so the viewBox fits the actual glyphs.
    const probe = document.createElement("canvas").getContext("2d");
    let fontSize = 220;
    probe.font = "700 " + fontSize + "px " + GLYPH_FONT;
    const measured = probe.measureText(text).width;
    if (measured > width - pad * 2) {
      fontSize = Math.max(60, Math.floor(fontSize * (width - pad * 2) / measured));
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", text);
    if (!o.transparent) {
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("width", String(width));
      bg.setAttribute("height", String(height));
      bg.setAttribute("fill", "#ffffff");
      svg.appendChild(bg);
    }
    const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
    node.setAttribute("x", String(width / 2));
    node.setAttribute("y", String(height * 0.52));
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("dominant-baseline", "central");
    node.setAttribute("font-family", GLYPH_FONT);
    node.setAttribute("font-weight", "700");
    node.setAttribute("font-size", String(fontSize));
    node.setAttribute("fill", o.ink || "#1a1a2e");
    node.textContent = text;
    svg.appendChild(node);
    const markup = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
    saveBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), "cursive-" + sigSlug(label) + ".svg");
  }

  function downloadLetterPNG(ch, glyphPair) {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + Math.round(size * 0.4) + "px " + GLYPH_FONT;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(glyphPair, size / 2, size * 0.54);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cursive-letter-" + ch.toLowerCase() + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  // Which case the letter panel's preview/copy/PNG act on: capital letters
  // are what most "cursive s" searches want, but the pair is the default view.
  let letterCase = "both";
  const CASES = [
    { id: "upper", label: t("caseUpper", "Capital") },
    { id: "lower", label: t("caseLower", "Lowercase") },
    { id: "both",  label: t("caseBoth", "Both") }
  ];

  function caseGlyph(primary, ch) {
    if (letterCase === "upper") return primary.upper;
    if (letterCase === "lower") return primary.lower;
    return primary.upper + " " + primary.lower;
  }

  function caseLabel(ch) {
    if (letterCase === "upper") return fmt(t("labelUpper", "Capital {ch} in cursive"), { ch: ch });
    if (letterCase === "lower") return fmt(t("labelLower", "Lowercase {ch} in cursive"), { ch: ch.toLowerCase() });
    return fmt(t("labelBoth", "Capital and lowercase {ch} in cursive"), { ch: ch });
  }

  function selectLetter(ch, opts) {
    if (!el.letterPanel) return;
    $$(".cursive-letter-cell").forEach((cell) => {
      cell.classList.toggle("is-active", cell.dataset.char === ch);
    });

    const variants = letterVariants(ch);
    const primary = variants[0] || { upper: ch.toUpperCase(), lower: ch.toLowerCase(), name: "" };

    el.letterPanel.innerHTML = "";
    const stage = document.createElement("div");
    stage.className = "bubble-stage";

    // Left: the big letter + case toggle + actions.
    const figure = document.createElement("div");
    figure.className = "bubble-outline-card cursive-letter-figure";

    const caseRow = document.createElement("div");
    caseRow.className = "cursive-case-row";
    CASES.forEach((c) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "vertical-chip" + (letterCase === c.id ? " active" : "");
      chip.textContent = c.label;
      chip.addEventListener("click", () => {
        letterCase = c.id;
        selectLetter(ch, { silent: true });
      });
      caseRow.appendChild(chip);
    });
    figure.appendChild(caseRow);

    const big = document.createElement("p");
    big.className = "cursive-letter-big";
    big.textContent = caseGlyph(primary, ch);
    figure.appendChild(big);

    const tag = document.createElement("p");
    tag.className = "bubble-az-intro";
    tag.textContent = caseLabel(ch);
    figure.appendChild(tag);

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "bubble-btn bubble-btn-primary copy-btn";
    copyBtn.textContent = letterCase === "both" ? t("copyBoth", "Copy both") : t("copy", "Copy") + " " + (letterCase === "upper" ? primary.upper : primary.lower);
    copyBtn.dataset.text = caseGlyph(primary, ch);
    copyBtn.dataset.style = primary.name;
    actions.appendChild(copyBtn);
    const dl = document.createElement("button");
    dl.type = "button";
    dl.className = "bubble-btn";
    dl.textContent = t("downloadPng", "Download PNG");
    dl.addEventListener("click", () => downloadLetterPNG(ch, caseGlyph(primary, ch)));
    actions.appendChild(dl);
    figure.appendChild(actions);

    // Right: every cursive variant of this letter, capital + lowercase.
    const detail = document.createElement("div");
    detail.className = "bubble-detail";
    const title = document.createElement("h3");
    title.className = "bubble-detail-title";
    title.textContent = fmt(t("everyStyle", "{ch} in cursive — every style, click to copy"), { ch: ch });
    detail.appendChild(title);

    const list = document.createElement("div");
    list.className = "bubble-variants";
    variants.forEach((v) => {
      ["upper", "lower"].forEach((kind) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "bubble-variant glyph-copy";
        row.dataset.text = v[kind];
        const glyph = document.createElement("span");
        glyph.className = "bubble-variant-glyph";
        glyph.textContent = v[kind];
        const meta = document.createElement("span");
        meta.className = "bubble-variant-name";
        meta.textContent = pick("styles", v.name, v.name.replace(/^Ultra /, "")) + (kind === "upper" ? t("suffixCapital", " — capital") : t("suffixLowercase", " — lowercase"));
        const cta = document.createElement("span");
        cta.className = "bubble-variant-copy";
        cta.textContent = t("copy", "Copy");
        row.appendChild(glyph); row.appendChild(meta); row.appendChild(cta);
        list.appendChild(row);
      });
    });

    // Accent-wrapped versions of the capital letter (fancy single letters).
    (D.letterAccents || []).forEach((acc) => {
      const glyphText = (acc.pre || "") + primary.upper + (acc.post || "");
      const row = document.createElement("button");
      row.type = "button";
      row.className = "bubble-variant glyph-copy";
      row.dataset.text = glyphText;
      const glyph = document.createElement("span");
      glyph.className = "bubble-variant-glyph";
      glyph.textContent = glyphText;
      const meta = document.createElement("span");
      meta.className = "bubble-variant-name";
      meta.textContent = fmt(t("accentLabel", "{name} accent"), { name: pick("accents", acc.name, acc.name) });
      const cta = document.createElement("span");
      cta.className = "bubble-variant-copy";
      cta.textContent = t("copy", "Copy");
      row.appendChild(glyph); row.appendChild(meta); row.appendChild(cta);
      list.appendChild(row);
    });

    detail.appendChild(list);
    stage.appendChild(figure);
    stage.appendChild(detail);
    el.letterPanel.appendChild(stage);

    if (!opts || !opts.silent) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", "#cursive-" + ch.toLowerCase());
      }
    }
  }

  function bindLetterGrid() {
    $$(".cursive-letter-cell").forEach((cell) => {
      cell.addEventListener("click", () => selectLetter(cell.dataset.char));
    });
  }

  /* ---------------------------------------------------------------
     Printable alphabet practice sheet
     --------------------------------------------------------------- */

  function buildPracticeSheet() {
    if (!el.printRoot) { window.print(); return; }
    el.printRoot.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";
    const h = document.createElement("h2");
    h.className = "bubble-print-title";
    h.textContent = t("practiceTitle", "Cursive alphabet practice sheet — ultratextgen.com");
    wrap.appendChild(h);

    const sheet = document.createElement("div");
    sheet.className = "cursive-print-sheet";
    LETTERS.forEach((ch) => {
      const row = document.createElement("div");
      row.className = "cursive-print-row";
      const model = document.createElement("span");
      model.className = "cursive-print-model";
      model.textContent = renderWith(ch, "Ultra Script") + " " + renderWith(ch.toLowerCase(), "Ultra Script");
      const trace = document.createElement("span");
      trace.className = "cursive-print-trace";
      trace.textContent = ch + " " + ch.toLowerCase();
      const line = document.createElement("span");
      line.className = "cursive-print-line";
      row.appendChild(model); row.appendChild(trace); row.appendChild(line);
      sheet.appendChild(row);
    });
    wrap.appendChild(sheet);
    el.printRoot.appendChild(wrap);

    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    el.printRoot.innerHTML = "";
  }

  /* ---------------------------------------------------------------
     Name & signature studio
     --------------------------------------------------------------- */

  let activeDecorator = null;   // one of D.signatureDecorators, null = None
  let activeJoiner = ".";       // monogram-initials joiner
  let transparentBg = true;     // PNG/SVG export background — transparent by default

  function renderNames() {
    if (!el.nameResults) return;
    const raw = el.nameInput ? el.nameInput.value : "";
    const name = raw.trim() ? raw.trim() : t("demoName", "Olivia");
    const isDemo = !raw.trim();

    const frag = document.createDocumentFragment();
    const seen = {};
    (D.signatures || []).forEach((preset) => {
      // Trailing joiner only for the classic dotted form (O.G.); symbol
      // joiners read better between initials only (O♡G, O&G).
      const trail = activeJoiner === "." ? "." : "";
      const source = preset.initials ? initialsOf(name).split(" ").join(activeJoiner) + trail : name;
      // The flourish decorator styles the name itself; monogram initials
      // stay clean so the joiner remains readable.
      const out = renderPreset(source, preset, preset.initials ? null : activeDecorator);
      if (!out || seen[out]) return;
      seen[out] = true;
      frag.appendChild(buildCard(pick("signatures", preset.name, preset.name), out, { demo: isDemo, styleName: preset.name, png: true, pngName: preset.name }));
    });

    el.nameResults.innerHTML = "";
    el.nameResults.appendChild(frag);
  }

  // Chip-row control (same look as the vertical/tattoo control panels).
  function chipRow(labelText, chips, isActive, onPick) {
    const row = document.createElement("div");
    row.className = "vertical-control-row";
    const label = document.createElement("span");
    label.className = "vertical-control-label";
    label.textContent = labelText;
    row.appendChild(label);
    const wrap = document.createElement("div");
    wrap.className = "vertical-mode-chips";
    chips.forEach((chip) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vertical-chip" + (isActive(chip) ? " active" : "");
      btn.textContent = chip.label;
      btn.addEventListener("click", () => {
        onPick(chip);
        $$(".vertical-chip", wrap).forEach((b) => b.classList.toggle("active", b === btn));
        renderNames();
      });
      wrap.appendChild(btn);
    });
    row.appendChild(wrap);
    return row;
  }

  function buildSignatureControls() {
    if (!el.sigControls) return;
    const decos = D.signatureDecorators || [];
    el.sigControls.appendChild(chipRow(
      t("flourishLabel", "Flourish"),
      decos.map((d) => ({ label: pick("decorators", d.name, d.name), value: d })),
      (chip) => (activeDecorator ? activeDecorator.name : "None") === chip.value.name,
      (chip) => { activeDecorator = chip.value.name === "None" ? null : chip.value; }
    ));
    el.sigControls.appendChild(chipRow(
      t("monogramLabel", "Monogram joiner"),
      (D.monogramJoiners || ["."]).map((j) => ({ label: "O" + j + "G", value: j })),
      (chip) => chip.value === activeJoiner,
      (chip) => { activeJoiner = chip.value; }
    ));
    el.sigControls.appendChild(chipRow(
      t("backgroundLabel", "Download background"),
      [
        { label: t("bgTransparent", "Transparent"), value: true },
        { label: t("bgWhite", "White"), value: false },
      ],
      (chip) => chip.value === transparentBg,
      (chip) => { transparentBg = chip.value; }
    ));
  }

  // The popular-names gallery doubles as the studio's example picker.
  function bindNameExamples() {
    $$(".cursive-name-example").forEach((card) => {
      const load = () => {
        if (!el.nameInput) return;
        el.nameInput.value = card.dataset.name || "";
        renderNames();
        el.nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
        el.nameInput.focus({ preventScroll: true });
      };
      card.addEventListener("click", (e) => {
        if (e.target.closest(".copy-btn")) return; // copy stays copy
        load();
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); }
      });
    });
  }

  /* ---------------------------------------------------------------
     Wiring
     --------------------------------------------------------------- */

  let renderTimer = null;
  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderResults, 120);
  }

  function readUrlText() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("text") || params.get("q") || "";
    } catch (e) { return ""; }
  }

  function init() {
    if (!window.textStyles || !window.UltraTextGenRender) return;

    buildQuickRow();
    bindLetterGrid();
    buildSignatureControls();
    bindNameExamples();

    if (el.input) {
      const seeded = readUrlText();
      if (seeded && !el.input.value) el.input.value = seeded.slice(0, 500);
      el.input.addEventListener("input", () => {
        if (el.charCount) el.charCount.textContent = String([...el.input.value].length);
        triggerRender();
      });
      if (el.charCount) el.charCount.textContent = String([...el.input.value].length);
    }

    if (el.nameInput) {
      let nameTimer = null;
      el.nameInput.addEventListener("input", () => {
        if (nameTimer) clearTimeout(nameTimer);
        nameTimer = setTimeout(renderNames, 120);
      });
    }

    if (el.printBtn) el.printBtn.addEventListener("click", buildPracticeSheet);

    renderResults();
    renderNames();

    // Deep link: #cursive-s selects (and scrolls to) that letter.
    const hash = (window.location.hash || "").replace(/^#cursive-/, "");
    const match = LETTERS.filter((c) => c.toLowerCase() === hash.toLowerCase())[0];
    selectLetter(match || "A", { silent: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
