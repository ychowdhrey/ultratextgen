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
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const GLYPH_FONT = "'Plus Jakarta Sans', 'Segoe UI Symbol', 'Noto Sans Symbols 2', sans-serif";
  const DEMO_TEXT = "Hello";

  const el = {
    input: $("#mainInput"),
    charCount: $("#charCount"),
    quickRow: $("#cursiveQuickRow"),
    fitRow: $("#cursiveFitRow"),
    resultsGrid: $("#resultsGrid"),
    letterPanel: $("#cursiveLetterPanel"),
    nameInput: $("#cursiveNameInput"),
    nameChips: $("#cursiveNameChips"),
    nameResults: $("#cursiveNameResults"),
    printRoot: $("#cursivePrintRoot"),
    printBtn: $("#cursivePrintSheet")
  };

  /* ---------------------------------------------------------------
     Rendering helpers
     --------------------------------------------------------------- */

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

  // Apply a preset: render through its base style, then wrap or add a
  // combining mark per visible character (the underline-flourish look).
  function renderPreset(text, preset) {
    let out = renderWith(text, preset.base);
    if (!out || !out.trim()) return "";
    if (preset.combining) {
      out = [...out].map((c) => (c === " " || c === "\n") ? c : c + preset.combining).join("");
    }
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

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    if (o.demo || !text) {
      btn.disabled = true;
      btn.title = "Type your text above first";
    } else {
      btn.dataset.text = text;
      btn.dataset.style = o.styleName || name;
    }
    card.appendChild(btn);
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
      frag.appendChild(buildCard(name, out, { demo: isDemo, styleName: name }));
    });

    (D.presets || []).forEach((preset) => {
      const out = renderPreset(text, preset);
      if (!out || seen[out]) return;
      seen[out] = true;
      frag.appendChild(buildCard(preset.name, out, { demo: isDemo, styleName: preset.name }));
    });

    el.resultsGrid.innerHTML = "";
    el.resultsGrid.appendChild(frag);
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
    note.textContent = count + " characters";
    el.fitRow.appendChild(note);

    (D.platformLimits || []).forEach((p) => {
      const ok = count <= p.limit;
      const badge = document.createElement("span");
      badge.className = "vertical-fit-badge " + (ok ? "fit" : "no-fit");
      badge.textContent = (ok ? "✓ " : "✗ ") + p.label + " (" + p.limit + ")";
      el.fitRow.appendChild(badge);
    });
  }

  function buildQuickRow() {
    if (!el.quickRow || !el.input) return;
    (D.quickWords || []).forEach((word) => {
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

    // Left: the big letter pair + actions.
    const figure = document.createElement("div");
    figure.className = "bubble-outline-card cursive-letter-figure";

    const big = document.createElement("p");
    big.className = "cursive-letter-big";
    big.textContent = primary.upper + " " + primary.lower;
    figure.appendChild(big);

    const tag = document.createElement("p");
    tag.className = "bubble-az-intro";
    tag.textContent = "Capital and lowercase " + ch + " in cursive";
    figure.appendChild(tag);

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    const copyPair = document.createElement("button");
    copyPair.type = "button";
    copyPair.className = "bubble-btn bubble-btn-primary copy-btn";
    copyPair.textContent = "Copy both";
    copyPair.dataset.text = primary.upper + " " + primary.lower;
    copyPair.dataset.style = primary.name;
    actions.appendChild(copyPair);
    const dl = document.createElement("button");
    dl.type = "button";
    dl.className = "bubble-btn";
    dl.textContent = "Download PNG";
    dl.addEventListener("click", () => downloadLetterPNG(ch, primary.upper + " " + primary.lower));
    actions.appendChild(dl);
    figure.appendChild(actions);

    // Right: every cursive variant of this letter, capital + lowercase.
    const detail = document.createElement("div");
    detail.className = "bubble-detail";
    const title = document.createElement("h3");
    title.className = "bubble-detail-title";
    title.textContent = ch + " in cursive — every style, click to copy";
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
        meta.textContent = v.name.replace(/^Ultra /, "") + (kind === "upper" ? " — capital" : " — lowercase");
        const cta = document.createElement("span");
        cta.className = "bubble-variant-copy";
        cta.textContent = "Copy";
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
      meta.textContent = acc.name + " accent";
      const cta = document.createElement("span");
      cta.className = "bubble-variant-copy";
      cta.textContent = "Copy";
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
    h.textContent = "Cursive alphabet practice sheet — ultratextgen.com";
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

  function renderNames() {
    if (!el.nameResults) return;
    const raw = el.nameInput ? el.nameInput.value : "";
    const name = raw.trim() ? raw.trim() : "Olivia";
    const isDemo = !raw.trim();

    const frag = document.createDocumentFragment();
    const seen = {};
    (D.signatures || []).forEach((preset) => {
      const source = preset.initials ? initialsOf(name).split(" ").join(preset.joiner || ".") + (preset.joiner || ".") : name;
      const out = renderPreset(source, preset);
      if (!out || seen[out]) return;
      seen[out] = true;
      frag.appendChild(buildCard(preset.name, out, { demo: isDemo, styleName: preset.name }));
    });

    el.nameResults.innerHTML = "";
    el.nameResults.appendChild(frag);
  }

  function buildNameChips() {
    if (!el.nameChips || !el.nameInput) return;
    (D.nameChips || []).forEach((name) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "vertical-chip cursive-quick-chip";
      chip.textContent = name;
      chip.addEventListener("click", () => {
        el.nameInput.value = name;
        renderNames();
      });
      el.nameChips.appendChild(chip);
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
    buildNameChips();

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
