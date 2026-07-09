/*
 * printablesEngine.js — shared, config-driven controller for /printables/ pages.
 *
 * One engine powers every printables page (bubble-letters, cursive-alphabet,
 * block-letters, name-tracing). A page declares window.UTG_PRINTABLE = {...}
 * and includes whichever mount points it wants; the engine builds only the
 * sections whose mounts exist on the page. This generalizes the two original
 * per-page controllers (js/bubble/bubbleExplorer.js and
 * js/cursive/cursivePageController.js) into reusable primitives:
 *   - a letter / number picker strip
 *   - a selected-character detail panel (big glyph + print + PNG + variants)
 *   - a printable alphabet grid (print the whole A–Z / 0–9 sheet)
 *   - a ruled practice sheet (model + trace rows)
 *   - a personalized name / word tracing worksheet
 *
 * Two render modes:
 *   - "outline": white-fill + rounded dark-stroke shapes (bubble, block) —
 *     traceable / colorable. Needs no font registry.
 *   - "glyph":   Unicode style glyphs from the registry (cursive) via
 *     window.UltraTextGenRender. Copy-paste variants are available in this mode.
 *
 * Self-contained IIFE. Document-level .copy-btn / .glyph-copy clipboard
 * delegation from the shared script.js is reused via the data-text contract;
 * copy inside the panel uses a local fallback so the engine works standalone.
 *
 * Mount points (all optional except the print surface, which is required for
 * any print action):
 *   #pt-strip            character picker
 *   #pt-panel            selected-character detail
 *   #pt-alphabet-grid    printable alphabet grid   (+ button #pt-alphabet-print)
 *   #pt-practice-print   button: print ruled practice sheet
 *   #pt-name-input       name / word field  (+ #pt-name-print, #pt-name-png,
 *                        #pt-name-preview, #pt-name-rows)
 *   #pt-print-root       hidden print surface (REQUIRED to print)
 */
(function () {
  "use strict";

  const CFG = window.UTG_PRINTABLE;
  if (!CFG) return;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const SVGNS = "http://www.w3.org/2000/svg";

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const DIGITS = "0123456789".split("");
  const CHARS = (CFG.charset === "digits") ? DIGITS.slice()
    : (CFG.charset === "alnum") ? LETTERS.concat(DIGITS)
    : LETTERS.slice();

  const RENDER = CFG.render || "outline";           // "outline" | "glyph"
  const FONT = CFG.font || "'Plus Jakarta Sans', 'Segoe UI Symbol', sans-serif";
  const STROKE = CFG.strokeWidth || 9;
  const NOUN = CFG.noun || "letter";                // "bubble letter", "block letter"…
  const PNG_PREFIX = CFG.pngPrefix || "printable";
  const GLYPH_STYLE = CFG.glyphStyle || "";         // primary registry style (glyph mode)
  const INK = "#1a1a2e";

  const el = {
    strip: $("#pt-strip"),
    panel: $("#pt-panel"),
    alphaGrid: $("#pt-alphabet-grid"),
    alphaPrint: $("#pt-alphabet-print"),
    practicePrint: $("#pt-practice-print"),
    nameInput: $("#pt-name-input"),
    namePrint: $("#pt-name-print"),
    namePng: $("#pt-name-png"),
    namePreview: $("#pt-name-preview"),
    nameRows: $("#pt-name-rows"),
    printRoot: $("#pt-print-root")
  };

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */

  function charLabel(ch) { return /[0-9]/.test(ch) ? ("number " + ch) : ("letter " + ch); }
  function charSlug(ch) { return /[0-9]/.test(ch) ? ("number-" + ch) : ("letter-" + ch.toLowerCase()); }
  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function primaryFontName() {
    // "Fredoka, '…', sans-serif" -> "Fredoka" (for document.fonts.load)
    return (FONT.split(",")[0] || "").replace(/['"]/g, "").trim();
  }
  function registry() { return window.textStyles || {}; }

  function renderGlyph(text, styleKey) {
    const style = registry()[styleKey || GLYPH_STYLE];
    const R = window.UltraTextGenRender;
    if (!style || !R || typeof R.renderAny !== "function") return text;
    try { return R.renderAny(text, style); } catch (e) { return text; }
  }

  // Copy-paste Unicode variants of a single character. A page may supply an
  // explicit curated list of registry style keys (CFG.variantStyles) — useful
  // when the set spans more than one familySlug (e.g. calligraphy = blackletter
  // + elegant script) — otherwise all map styles in CFG.variantFamily are used.
  function familyStyles() {
    const reg = registry();
    if (Array.isArray(CFG.variantStyles) && CFG.variantStyles.length) {
      const out = [];
      CFG.variantStyles.forEach((name) => {
        const s = reg[name];
        if (s && s.type === "map") out.push({ name: name, style: s });
      });
      return out;
    }
    if (!CFG.variantFamily) return [];
    const out = [];
    Object.keys(reg).forEach((name) => {
      const s = reg[name];
      if (!s || s.type !== "map") return;
      const fam = s.familySlug;
      const inFam = fam === CFG.variantFamily || (Array.isArray(fam) && fam.indexOf(CFG.variantFamily) !== -1);
      if (inFam) out.push({ name: name, style: s });
    });
    return out;
  }

  function copyText(value, btn) {
    const done = () => {
      if (!btn) return;
      const prev = btn.textContent;
      btn.classList.add("is-copied");
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = prev; btn.classList.remove("is-copied"); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = value; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      document.body.removeChild(ta); done();
    }
  }

  /* ---------------------------------------------------------------
     Glyph builders (SVG for outline mode, text for glyph mode)
     --------------------------------------------------------------- */

  // A single character as a rounded, traceable SVG outline (outline mode).
  function outlineSVG(ch, opts) {
    const o = opts || {};
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 240");
    svg.setAttribute("class", "bubble-outline" + (o.small ? " is-small" : ""));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", NOUN + " " + charLabel(ch));
    const text = document.createElementNS(SVGNS, "text");
    text.setAttribute("x", "100");
    text.setAttribute("y", "128");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", FONT);
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", "210");
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("stroke", INK);
    text.setAttribute("stroke-width", String(o.small ? Math.max(4, STROKE - 2) : STROKE));
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    text.textContent = ch;
    svg.appendChild(text);
    return svg;
  }

  // A whole word as one rounded outline SVG (used by the name worksheet in
  // outline mode). Width scales with the word so long names stay readable.
  function wordOutlineSVG(word, opts) {
    const o = opts || {};
    const chars = [...String(word)];
    const w = Math.max(200, chars.length * 118 + 80);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " 200");
    svg.setAttribute("class", "pt-word-outline");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", word);
    const text = document.createElementNS(SVGNS, "text");
    text.setAttribute("x", String(w / 2));
    text.setAttribute("y", "112");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", FONT);
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", "150");
    text.setAttribute("fill", o.solid ? INK : "#ffffff");
    text.setAttribute("stroke", o.solid ? "none" : "#8b93a7");
    text.setAttribute("stroke-width", o.solid ? "0" : "3");
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    text.textContent = word;
    svg.appendChild(text);
    return svg;
  }

  // The big figure for the detail panel: outline SVG or a script-glyph pair.
  function figureNode(ch) {
    if (RENDER === "glyph") {
      const p = document.createElement("p");
      p.className = "pt-glyph-figure";
      const u = renderGlyph(ch.toUpperCase());
      const l = renderGlyph(ch.toLowerCase());
      p.textContent = /[0-9]/.test(ch) ? u : (u + " " + l);
      return p;
    }
    return outlineSVG(ch);
  }

  /* ---------------------------------------------------------------
     PNG export (Canvas)
     --------------------------------------------------------------- */

  function withFont(cb) {
    const fam = primaryFontName();
    if (fam && document.fonts && document.fonts.load) {
      document.fonts.load("700 200px " + fam).then(cb).catch(cb);
    } else {
      cb();
    }
  }

  function downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  // Single character -> square PNG.
  function letterPNG(ch) {
    withFont(() => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const glyph = RENDER === "glyph"
        ? (/[0-9]/.test(ch) ? renderGlyph(ch.toUpperCase()) : (renderGlyph(ch.toUpperCase()) + renderGlyph(ch.toLowerCase())))
        : ch;
      ctx.font = "700 " + Math.round(size * (RENDER === "glyph" ? 0.4 : 0.74)) + "px " + FONT;
      if (RENDER === "outline") {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(glyph, size / 2, size * 0.54);
        ctx.lineWidth = Math.round(size * 0.045);
        ctx.strokeStyle = INK;
        ctx.strokeText(glyph, size / 2, size * 0.54);
      } else {
        ctx.fillStyle = INK;
        ctx.fillText(glyph, size / 2, size * 0.54);
      }
      downloadCanvas(canvas, PNG_PREFIX + "-" + charSlug(ch) + ".png");
    });
  }

  // A word / name -> wide PNG.
  function wordPNG(text) {
    withFont(() => {
      const width = 1600, height = 520, pad = 90;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const out = RENDER === "glyph" ? renderGlyph(text) : text;
      let fontSize = 300;
      ctx.font = "700 " + fontSize + "px " + FONT;
      const measured = ctx.measureText(out).width;
      if (measured > width - pad * 2) {
        fontSize = Math.max(54, Math.floor(fontSize * (width - pad * 2) / measured));
        ctx.font = "700 " + fontSize + "px " + FONT;
      }
      if (RENDER === "outline") {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(out, width / 2, height * 0.52);
        ctx.lineWidth = Math.max(6, Math.round(fontSize * 0.06));
        ctx.strokeStyle = INK;
        ctx.strokeText(out, width / 2, height * 0.52);
      } else {
        ctx.fillStyle = INK;
        ctx.fillText(out, width / 2, height * 0.52);
      }
      downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(text) || "word") + ".png");
    });
  }

  /* ---------------------------------------------------------------
     Print surface
     --------------------------------------------------------------- */

  function printWrap(titleText, bodyNode) {
    if (!el.printRoot) { window.print(); return; }
    el.printRoot.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";
    const h = document.createElement("h2");
    h.className = "bubble-print-title";
    h.textContent = titleText;
    wrap.appendChild(h);
    wrap.appendChild(bodyNode);
    el.printRoot.appendChild(wrap);
    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    el.printRoot.innerHTML = "";
  }

  /* ---------------------------------------------------------------
     Section: detail panel
     --------------------------------------------------------------- */

  let activeChar = "A";

  function selectChar(ch, opts) {
    activeChar = ch;
    $$(".pt-chip", el.strip).forEach((b) => {
      const on = b.dataset.char === ch;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (!el.panel) return;

    el.panel.innerHTML = "";
    const stage = document.createElement("div");
    stage.className = "bubble-stage";

    // Left — big figure + print + PNG.
    const figure = document.createElement("div");
    figure.className = "bubble-outline-card";
    figure.appendChild(figureNode(ch));

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "bubble-btn bubble-btn-primary";
    printBtn.textContent = "Print this " + (/[0-9]/.test(ch) ? "number" : "letter");
    printBtn.addEventListener("click", () => {
      const holder = document.createElement("div");
      holder.className = "bubble-print-single";
      holder.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : outlineSVG(ch));
      printWrap(cap(NOUN) + " " + charLabel(ch), holder);
    });
    const pngBtn = document.createElement("button");
    pngBtn.type = "button";
    pngBtn.className = "bubble-btn";
    pngBtn.textContent = "Download PNG";
    pngBtn.addEventListener("click", () => letterPNG(ch));
    actions.appendChild(printBtn);
    actions.appendChild(pngBtn);
    figure.appendChild(actions);

    // Right — copy-paste variants (glyph mode) and/or how-to steps.
    const detail = document.createElement("div");
    detail.className = "bubble-detail";

    const variants = (CFG.variantStyles || CFG.variantFamily) ? buildVariants(ch) : null;
    if (variants) {
      const title = document.createElement("h3");
      title.className = "bubble-detail-title";
      title.textContent = "Copy-paste " + NOUN + " " + charLabel(ch);
      detail.appendChild(title);
      detail.appendChild(variants);
    }

    if (CFG.howto && CFG.howto.steps) {
      const how = document.createElement("div");
      how.className = "bubble-howto";
      const ht = document.createElement("h3");
      ht.className = "bubble-detail-title";
      ht.textContent = (CFG.howto.title || "How to draw it").replace("{ch}", charLabel(ch));
      how.appendChild(ht);
      const ol = document.createElement("ol");
      ol.className = "bubble-howto-steps";
      CFG.howto.steps.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s.replace("{ch}", charLabel(ch));
        ol.appendChild(li);
      });
      how.appendChild(ol);
      if (CFG.howto.tip) {
        const tip = document.createElement("p");
        tip.className = "bubble-howto-tip";
        tip.textContent = CFG.howto.tip;
        how.appendChild(tip);
      }
      detail.appendChild(how);
    }

    stage.appendChild(figure);
    if (detail.childNodes.length) stage.appendChild(detail);
    el.panel.appendChild(stage);

    if ((!opts || !opts.silent) && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + charSlug(ch));
    }
  }

  function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

  function bigGlyphForPrint(ch) {
    const p = document.createElement("p");
    p.className = "pt-glyph-print";
    const u = renderGlyph(ch.toUpperCase());
    const l = renderGlyph(ch.toLowerCase());
    p.textContent = /[0-9]/.test(ch) ? u : (u + " " + l);
    return p;
  }

  function buildVariants(ch) {
    const list = document.createElement("div");
    list.className = "bubble-variants";
    const cases = /[0-9]/.test(ch) ? ["upper"] : ["upper", "lower"];
    let any = false;
    familyStyles().forEach(({ name, style }) => {
      cases.forEach((kind) => {
        const src = kind === "upper" ? ch.toUpperCase() : ch.toLowerCase();
        const rendered = renderGlyph(src, name);
        if (!rendered || rendered === src) return;
        any = true;
        const row = document.createElement("button");
        row.type = "button";
        row.className = "bubble-variant glyph-copy";
        row.dataset.text = rendered;
        row.setAttribute("aria-label", "Copy " + name + " " + NOUN + " " + charLabel(src));
        const glyph = document.createElement("span");
        glyph.className = "bubble-variant-glyph";
        glyph.textContent = rendered;
        const meta = document.createElement("span");
        meta.className = "bubble-variant-name";
        meta.textContent = name.replace(/^Ultra /, "") + (kind === "upper" ? "" : " · lower");
        const cta = document.createElement("span");
        cta.className = "bubble-variant-copy";
        cta.textContent = "Copy";
        row.appendChild(glyph); row.appendChild(meta); row.appendChild(cta);
        row.addEventListener("click", () => copyText(rendered, cta));
        list.appendChild(row);
      });
    });
    return any ? list : null;
  }

  /* ---------------------------------------------------------------
     Section: picker strip
     --------------------------------------------------------------- */

  function buildStrip() {
    if (!el.strip) return;
    const make = (ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-chip bubble-chip";
      b.dataset.char = ch;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-label", cap(NOUN) + " " + charLabel(ch));
      b.textContent = ch;
      b.addEventListener("click", () => selectChar(ch));
      return b;
    };
    if (CFG.charset === "digits") {
      const digitRow = document.createElement("div");
      digitRow.className = "bubble-strip-row bubble-strip-digits";
      DIGITS.forEach((ch) => digitRow.appendChild(make(ch)));
      el.strip.appendChild(digitRow);
      return;
    }
    const letterRow = document.createElement("div");
    letterRow.className = "bubble-strip-row";
    LETTERS.forEach((ch) => letterRow.appendChild(make(ch)));
    el.strip.appendChild(letterRow);
    if (CFG.charset === "alnum") {
      const digitRow = document.createElement("div");
      digitRow.className = "bubble-strip-row bubble-strip-digits";
      DIGITS.forEach((ch) => digitRow.appendChild(make(ch)));
      el.strip.appendChild(digitRow);
    }
  }

  /* ---------------------------------------------------------------
     Section: printable alphabet grid (outline mode)
     --------------------------------------------------------------- */

  function buildAlphabetGrid() {
    if (!el.alphaGrid) return;
    CHARS.forEach((ch) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bubble-alpha-cell";
      cell.setAttribute("aria-label", cap(NOUN) + " " + charLabel(ch) + " — open");
      cell.appendChild(RENDER === "glyph" ? smallGlyphCell(ch) : outlineSVG(ch, { small: true }));
      cell.addEventListener("click", () => {
        selectChar(ch);
        if (el.panel) el.panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      el.alphaGrid.appendChild(cell);
    });
    if (el.alphaPrint) {
      el.alphaPrint.addEventListener("click", () => {
        const sheet = document.createElement("div");
        sheet.className = "bubble-print-sheet";
        CHARS.forEach((ch) => sheet.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : outlineSVG(ch, { small: true })));
        printWrap(cap(NOUN) + " " + (CFG.gridNoun || "alphabet") + " — ultratextgen.com", sheet);
      });
    }
  }

  function smallGlyphCell(ch) {
    const s = document.createElement("span");
    s.className = "pt-glyph-cell";
    s.textContent = renderGlyph(ch.toUpperCase()) + " " + renderGlyph(ch.toLowerCase());
    return s;
  }

  /* ---------------------------------------------------------------
     Section: ruled practice sheet (model + trace + baseline rows)
     --------------------------------------------------------------- */

  function buildPracticeSheet() {
    const sheet = document.createElement("div");
    sheet.className = "cursive-print-sheet";
    CHARS.forEach((ch) => {
      const row = document.createElement("div");
      row.className = "cursive-print-row";
      const model = document.createElement("span");
      model.className = "cursive-print-model";
      const trace = document.createElement("span");
      trace.className = "cursive-print-trace";
      if (RENDER === "glyph") {
        model.textContent = renderGlyph(ch.toUpperCase()) + " " + renderGlyph(ch.toLowerCase());
        trace.textContent = renderGlyph(ch.toUpperCase()) + " " + renderGlyph(ch.toLowerCase());
      } else {
        model.appendChild(outlineSVG(ch, { small: true }));
        model.classList.add("pt-model-svg");
        trace.textContent = /[0-9]/.test(ch) ? ch : (ch + " " + ch.toLowerCase());
      }
      const line = document.createElement("span");
      line.className = "cursive-print-line";
      row.appendChild(model); row.appendChild(trace); row.appendChild(line);
      sheet.appendChild(row);
    });
    printWrap(cap(NOUN) + " practice sheet — ultratextgen.com", sheet);
  }

  /* ---------------------------------------------------------------
     Section: personalized name / word worksheet
     --------------------------------------------------------------- */

  const NAME_DEMO = CFG.nameDemo || "Alex";

  function nameValue() {
    const raw = el.nameInput ? el.nameInput.value : "";
    return (raw && raw.trim()) ? raw.trim().slice(0, 40) : NAME_DEMO;
  }

  function renderNamePreview() {
    if (!el.namePreview) return;
    const name = nameValue();
    el.namePreview.innerHTML = "";
    if (RENDER === "glyph") {
      const p = document.createElement("p");
      p.className = "pt-glyph-figure pt-name-glyph";
      p.textContent = renderGlyph(name);
      el.namePreview.appendChild(p);
    } else {
      el.namePreview.appendChild(wordOutlineSVG(name, { solid: false }));
    }
  }

  function buildNameWorksheet() {
    const name = nameValue();
    const rows = document.createElement("div");
    rows.className = "pt-name-sheet";

    // Solid model row.
    rows.appendChild(nameRow(name, "model"));
    // Trace rows (hollow / faded).
    const traceCount = Math.max(1, Math.min(6, parseInt((el.nameRows && el.nameRows.value) || "3", 10) || 3));
    for (let i = 0; i < traceCount; i++) rows.appendChild(nameRow(name, "trace"));
    // Blank ruled rows for free practice.
    for (let i = 0; i < 2; i++) rows.appendChild(nameRow(name, "blank"));

    printWrap(name + " — tracing worksheet · ultratextgen.com", rows);
  }

  function nameRow(name, kind) {
    const row = document.createElement("div");
    row.className = "pt-name-row pt-name-" + kind;
    if (kind === "blank") return row;
    if (RENDER === "glyph") {
      const span = document.createElement("span");
      span.className = "pt-name-word" + (kind === "trace" ? " is-trace" : "");
      span.textContent = renderGlyph(name);
      row.appendChild(span);
    } else {
      row.appendChild(wordOutlineSVG(name, { solid: kind === "model" }));
    }
    return row;
  }

  /* ---------------------------------------------------------------
     Wiring
     --------------------------------------------------------------- */

  function init() {
    buildStrip();
    buildAlphabetGrid();

    if (el.practicePrint) el.practicePrint.addEventListener("click", buildPracticeSheet);

    if (el.nameInput) {
      let timer = null;
      el.nameInput.addEventListener("input", () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(renderNamePreview, 120);
      });
      renderNamePreview();
    }
    if (el.namePrint) el.namePrint.addEventListener("click", buildNameWorksheet);
    if (el.namePng) el.namePng.addEventListener("click", () => wordPNG(nameValue()));

    if (el.strip || el.panel) {
      // CFG.initialChar locks a page to a single letter on load (spoke pages);
      // falls back to CHARS[0] when unset so existing pages are unaffected.
      let initial = CHARS[0];
      if (CFG.initialChar && CHARS.indexOf(String(CFG.initialChar).toUpperCase()) !== -1) {
        initial = String(CFG.initialChar).toUpperCase();
      }
      const h = (window.location.hash || "").replace(/^#/, "");
      const match = CHARS.filter((c) => charSlug(c) === h)[0];
      if (match) initial = match;
      selectChar(initial, { silent: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
