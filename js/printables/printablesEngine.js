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
 *   #pt-stroke-toggle    checkbox: overlay a numbered start-dot + direction
 *                        arrows on traceable letters (off by default). Reads
 *                        window.UTG_STROKE_DIRECTION_DATA (js/printables/
 *                        strokeDirectionData.js) — a page must load that
 *                        script for the toggle to draw anything.
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
  const CHARS = (CFG.charset === "alnum") ? LETTERS.concat(DIGITS) : LETTERS.slice();

  const RENDER = CFG.render || "outline";           // "outline" | "glyph"
  const FONT = CFG.font || "'Plus Jakarta Sans', 'Segoe UI Symbol', sans-serif";
  const STROKE = CFG.strokeWidth || 9;
  const NOUN = CFG.noun || "letter";                // "bubble letter", "block letter"…
  // Extra space between letters in multi-letter (word/name) output, expressed
  // as a fraction of the font size (em). Puffy, non-connecting outlines
  // (bubble, block) read better with a little breathing room so each letter
  // can be traced and colored on its own; connected glyphs (cursive) leave
  // this at 0 so their joins stay intact.
  const LETTER_SPACING = Number(CFG.letterSpacing) || 0;
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
    strokeToggle: $("#pt-stroke-toggle"),
    // Difficulty generator (handwriting-worksheet-generator)
    genInput: $("#pt-gen-input"),
    genPreview: $("#pt-gen-preview"),
    genPreviewMeta: $("#pt-gen-preview-meta"),
    genSlider: $("#pt-gen-slider"),
    genLevels: $("#pt-gen-levels"),
    genLevel: $("#pt-gen-level"),
    genHint: $("#pt-gen-hint"),
    genPresets: $("#pt-gen-presets"),
    genRows: $("#pt-gen-rows"),
    genCase: $("#pt-gen-case"),
    genModel: $("#pt-gen-model"),
    genPrint: $("#pt-gen-print"),
    genPng: $("#pt-gen-png"),
    // Coloring-sheet designer (optional; gated on its own mounts)
    designInput: $("#pt-design-input"),
    designHeading: $("#pt-design-heading"),
    designFill: $("#pt-design-fill"),
    designBorder: $("#pt-design-border"),
    designFillGroup: $("#pt-design-fill-group"),
    designBorderGroup: $("#pt-design-border-group"),
    designFooter: $("#pt-design-footer"),
    designPreview: $("#pt-design-preview"),
    designPrint: $("#pt-design-print"),
    designPng: $("#pt-design-png"),
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
    if (o.overlay) addStrokeOverlay(svg, ch);
    return svg;
  }

  // A whole word as one rounded outline SVG (used by the name worksheet in
  // outline mode). Width scales with the word so long names stay readable.
  function wordOutlineSVG(word, opts) {
    const o = opts || {};
    const chars = [...String(word)];
    const fontSize = 150;
    const spacing = fontSize * LETTER_SPACING;
    const w = Math.max(200, chars.length * 118 + 80 + Math.max(0, chars.length - 1) * spacing);
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
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("fill", o.solid ? INK : "#ffffff");
    text.setAttribute("stroke", o.solid ? "none" : "#8b93a7");
    text.setAttribute("stroke-width", o.solid ? "0" : "3");
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    // Nudge the anchor left by half a letter-gap so the trailing space SVG adds
    // after the final glyph doesn't push the centered word off-center.
    if (spacing) {
      text.setAttribute("letter-spacing", String(spacing));
      text.setAttribute("dx", String(-spacing / 2));
    }
    text.textContent = word;
    svg.appendChild(text);
    if (o.overlay) addWordStrokeOverlay(svg, word, fontSize, spacing, 112, "central", w);
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
     Stroke-direction overlay ("Show stroke direction" toggle)
     ---------------------------------------------------------------
     Occupational-therapy guidance: tracing without a numbered start-dot and
     a direction arrow can teach poor motor plans. window.UTG_STROKE_DIRECTION_DATA
     (js/printables/strokeDirectionData.js) hand-authors, per letter, a
     numbered start-dot + 1-4 short arrow strokes in the SAME 200x240 /
     font-size-210 / x=100,y=128 / dominant-baseline:central coordinate
     space that outlineSVG() already draws letters in — so for a single
     letter (outlineSVG) the overlay drops straight on top with no math.
     For a whole traced word/name (wordOutlineSVG, traceWordSVG) the word is
     still rendered as ONE unbroken <text> node exactly as before — visual
     output is byte-for-byte unchanged when the toggle is off — and the
     overlay is added as a separate layer whose per-letter groups are placed
     using Canvas-measured advance widths (the same "measure with a hidden
     canvas" technique already used elsewhere in this file, e.g. wordPNG).
     Off by default; gated entirely on the optional #pt-stroke-toggle mount,
     so pages that don't add it are completely unaffected. SVG only — PNG
     downloads intentionally don't include the overlay.
     --------------------------------------------------------------- */

  const STROKE_COLOR = "#2451c9";     // legible on white, distinct from the ink-black glyph
  const STROKE_BASELINE_UNIT_Y = 200; // where the type baseline falls inside outlineSVG's own
                                       // 200x240 / font-size-210 / central-baseline box
  let strokeOverlayUid = 0;
  let strokeMeasureCtx = null;

  function strokeOverlayOn() { return !!(el.strokeToggle && el.strokeToggle.checked); }

  function strokeDataFor(ch) {
    const table = window.UTG_STROKE_DIRECTION_DATA;
    return (table && table[ch]) ? table[ch] : null;
  }

  // Numbered start-dot + direction arrow for every stroke of one letter,
  // drawn directly into `parent`'s own coordinate space (the 200x240 unit
  // box, or a <g> already transformed into an equivalent local box).
  function addStrokeOverlay(parent, ch) {
    const data = strokeDataFor(ch);
    if (!data || !data.strokes || !data.strokes.length) return;
    const uid = "ptsd" + (++strokeOverlayUid);
    const g = svgMake("g", { class: "pt-stroke-overlay", "aria-hidden": "true" }, parent);
    const defs = svgMake("defs", null, g);
    const markerId = "ptArrow" + uid;
    // markerUnits defaults to "strokeWidth", which would silently multiply
    // markerWidth/Height by the path's stroke-width below (6x) — pin it to
    // userSpaceOnUse so the arrowhead size stays fixed and predictable.
    const marker = svgMake("marker", {
      id: markerId, viewBox: "0 0 10 10", refX: 8, refY: 5, markerUnits: "userSpaceOnUse",
      markerWidth: 20, markerHeight: 20, orient: "auto"
    }, defs);
    svgMake("path", { d: "M0,0 L10,5 L0,10 Z", fill: STROKE_COLOR }, marker);

    data.strokes.forEach((d, i) => {
      svgMake("path", {
        d: d, fill: "none", stroke: STROKE_COLOR,
        "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round",
        "marker-end": "url(#" + markerId + ")", opacity: 0.9
      }, g);
      const m = /M\s*([\d.\-]+)[,\s]+([\d.\-]+)/.exec(d);
      if (!m) return;
      const sx = parseFloat(m[1]), sy = parseFloat(m[2]);
      svgMake("circle", { cx: sx, cy: sy, r: 11, fill: "#ffffff", stroke: STROKE_COLOR, "stroke-width": 2.5 }, g);
      const label = svgMake("text", {
        x: sx, y: sy + 0.5, "text-anchor": "middle", "dominant-baseline": "central",
        "font-family": "'Plus Jakarta Sans', sans-serif", "font-weight": 700,
        "font-size": 13, fill: STROKE_COLOR
      }, g);
      label.textContent = String(i + 1);
    });
  }

  function getStrokeMeasureCtx() {
    if (!strokeMeasureCtx) strokeMeasureCtx = document.createElement("canvas").getContext("2d");
    return strokeMeasureCtx;
  }

  // Per-character center-x offsets (0-based, left edge at 0) for `word` when
  // rendered at `fontPx`, using the SAME technique wordPNG/genWordPNG already
  // use to size text on Canvas — real per-glyph advance widths, reconciled
  // so they sum to the actual measured word width (covers minor
  // kerning/rounding drift between the per-char and whole-word measurements).
  function charAdvanceCenters(word, fontPx) {
    const ctx = getStrokeMeasureCtx();
    ctx.font = "700 " + fontPx + "px " + FONT;
    const chars = [...String(word)];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const rawTotal = widths.reduce((a, b) => a + b, 0) || 1;
    const measuredTotal = ctx.measureText(word).width;
    const scale = measuredTotal / rawTotal;
    let x = 0;
    const centers = chars.map((c, i) => {
      const w = widths[i] * scale;
      const cx = x + w / 2;
      x += w; // any letter-spacing gap is added by the caller, not here
      return { ch: c, cx: cx };
    });
    return { centers: centers, total: measuredTotal };
  }

  // Draws one letter's stroke overlay, scaled + translated from its 200x240
  // authoring box into a destination slot centered at (cx, anchorY) with an
  // em-size of `emPx`. `mode` picks which point of the authoring box maps to
  // (cx, anchorY): "central" (box center, matching wordOutlineSVG's own
  // dominant-baseline:central text) or "alphabetic" (the type baseline,
  // matching traceWordSVG's default alphabetic-baseline text).
  function letterOverlayCell(parent, ch, cx, anchorY, emPx, mode) {
    if (!strokeDataFor(ch)) return;
    const scale = emPx / 210;
    const anchorUnitY = mode === "alphabetic" ? STROKE_BASELINE_UNIT_Y : 128;
    const tx = cx - 100 * scale;
    const ty = anchorY - anchorUnitY * scale;
    const g = svgMake("g", { transform: "translate(" + tx.toFixed(2) + "," + ty.toFixed(2) + ") scale(" + scale.toFixed(4) + ")" }, parent);
    addStrokeOverlay(g, ch);
  }

  // Overlays every letter of a word/name rendered as a single centered
  // <text> (wordOutlineSVG / traceWordSVG) without touching that <text>
  // node itself. `spacingPx` mirrors the `letter-spacing` attribute those
  // functions may set so the overlay tracks the same extra gaps.
  function addWordStrokeOverlay(svg, word, fontPx, spacingPx, anchorY, mode, totalW) {
    const measured = charAdvanceCenters(word, fontPx);
    const extra = spacingPx ? spacingPx * (measured.centers.length - 1) : 0;
    const fullWidth = measured.total + extra;
    let runningExtra = 0;
    const leftEdge = totalW / 2 - fullWidth / 2;
    measured.centers.forEach((c, i) => {
      const cx = leftEdge + c.cx + runningExtra;
      if (spacingPx) runningExtra += spacingPx;
      if (!/[A-Za-z]/.test(c.ch)) return;
      letterOverlayCell(svg, c.ch, cx, anchorY, fontPx, mode);
    });
  }

  const STROKE_TOGGLE_LS_KEY = "utg-pt-stroke-overlay";

  function initStrokeToggle() {
    if (!el.strokeToggle) return;
    try {
      if (localStorage.getItem(STROKE_TOGGLE_LS_KEY) === "1") el.strokeToggle.checked = true;
    } catch (e) { /* noop — storage unavailable, default unchecked */ }
    el.strokeToggle.addEventListener("change", () => {
      try { localStorage.setItem(STROKE_TOGGLE_LS_KEY, el.strokeToggle.checked ? "1" : "0"); } catch (e) { /* noop */ }
      if (el.nameInput || el.namePreview) renderNamePreview();
      if (el.genInput || el.genPreview) renderGenPreview();
    });
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
      // Match the on-screen/print letter spacing (em fraction of the font size).
      const applySpacing = (px) => {
        if (LETTER_SPACING && "letterSpacing" in ctx) ctx.letterSpacing = px + "px";
      };
      let fontSize = 300;
      ctx.font = "700 " + fontSize + "px " + FONT;
      applySpacing(fontSize * LETTER_SPACING);
      const measured = ctx.measureText(out).width;
      if (measured > width - pad * 2) {
        fontSize = Math.max(54, Math.floor(fontSize * (width - pad * 2) / measured));
        ctx.font = "700 " + fontSize + "px " + FONT;
        applySpacing(fontSize * LETTER_SPACING);
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
    if (titleText) {
      const h = document.createElement("h2");
      h.className = "bubble-print-title";
      h.textContent = titleText;
      wrap.appendChild(h);
    }
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
        printWrap(cap(NOUN) + " alphabet — ultratextgen.com", sheet);
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
    const overlayOn = strokeOverlayOn();
    const sheet = document.createElement("div");
    sheet.className = "cursive-print-sheet" + (overlayOn ? " pt-stroke-on" : "");
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
        // Model column only ever shows the uppercase letter (CHARS is A-Z +
        // 0-9), so the overlay's uppercase coverage lines up exactly here.
        model.appendChild(outlineSVG(ch, { small: true, overlay: overlayOn }));
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
      el.namePreview.appendChild(wordOutlineSVG(name, { solid: false, overlay: strokeOverlayOn() }));
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
      row.appendChild(wordOutlineSVG(name, { solid: kind === "model", overlay: strokeOverlayOn() }));
    }
    return row;
  }

  /* ---------------------------------------------------------------
     Section: adjustable-difficulty tracing generator
     ---------------------------------------------------------------
     One difficulty slider is the source of truth (7 steps). Age presets
     are shortcuts that snap the slider to a sensible starting level; the
     user can nudge from there. Each level is a coherent combination of the
     three knobs a teacher thinks in — thickness (stroke width), nearness
     (dash gap) and intensity (ink / opacity) — driven from one control.
     All native SVG (stroke-dasharray / stroke-width / opacity); no fonts
     bundled, no server render.
     --------------------------------------------------------------- */

  const GHOST = "#c3c9d6";
  const FAINT = "#d7dbe4";
  const GUIDE = "#9aa2b1";
  const GUIDE_MID = "#c7ccd8";

  // Level 1 (easiest) → 7 (hardest). Round caps + a near-zero dash render
  // the stroke as a row of dots; longer dashes read as a broken guideline.
  const TRACE_LEVELS = [
    { key: "solid",    label: "Solid model",  hint: "Full dark letters — trace right on top",
      fill: INK,   stroke: "none", sw: 0, dash: "",        cap: "round", opacity: 1 },
    { key: "bold-dot", label: "Bold dotted",  hint: "Thick, closely-spaced dots to join",
      fill: "none", stroke: INK,   sw: 8, dash: "0.1 11",  cap: "round", opacity: 1 },
    { key: "fine-dot", label: "Fine dotted",  hint: "Thinner dots with a little more space",
      fill: "none", stroke: INK,   sw: 5, dash: "0.1 16",  cap: "round", opacity: 0.92 },
    { key: "dashed",   label: "Dashed",       hint: "Broken dashes — more line to complete",
      fill: "none", stroke: INK,   sw: 4, dash: "15 15",   cap: "butt",  opacity: 0.85 },
    { key: "faded",    label: "Faded ghost",  hint: "Light gray letters to write over",
      fill: GHOST,  stroke: "none", sw: 0, dash: "",        cap: "round", opacity: 1 },
    { key: "faint",    label: "Faint guide",  hint: "Barely-there outline — almost solo",
      fill: "none", stroke: FAINT, sw: 2, dash: "0.1 22",  cap: "round", opacity: 1 },
    { key: "blank",    label: "Blank line",   hint: "No guide — write it from memory",
      blank: true }
  ];

  function levelSpec(level) {
    const i = Math.max(0, Math.min(TRACE_LEVELS.length - 1, (level || 1) - 1));
    return TRACE_LEVELS[i];
  }

  // Ruled guideline (top / midline / baseline) inside a worksheet SVG.
  function addGuide(svg, w, y, dashed) {
    const l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", "8");
    l.setAttribute("x2", String(w - 8));
    l.setAttribute("y1", String(y));
    l.setAttribute("y2", String(y));
    l.setAttribute("stroke", dashed ? GUIDE_MID : GUIDE);
    l.setAttribute("stroke-width", dashed ? "1.5" : "2");
    if (dashed) l.setAttribute("stroke-dasharray", "6 8");
    svg.appendChild(l);
  }

  // A word rendered at a difficulty level, on a ruled baseline. The single
  // primitive behind both the live preview and every printed row.
  const TRACE_FONT_SIZE = 132;
  const TRACE_BASE = 158, TRACE_MID = 104, TRACE_TOP = 50, TRACE_H = 210;

  function traceWordSVG(word, level, opts) {
    const o = opts || {};
    const spec = levelSpec(level);
    const chars = [...String(word)];
    const w = Math.max(360, chars.length * 116 + 120);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " " + TRACE_H);
    svg.setAttribute("class", "pt-trace-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", word + " — " + spec.label);
    if (o.guides !== false) {
      addGuide(svg, w, TRACE_TOP, false);
      addGuide(svg, w, TRACE_MID, true);
      addGuide(svg, w, TRACE_BASE, false);
    }
    if (!spec.blank) {
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", String(w / 2));
      t.setAttribute("y", String(TRACE_BASE));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", FONT);
      t.setAttribute("font-weight", "700");
      t.setAttribute("font-size", String(TRACE_FONT_SIZE));
      t.setAttribute("fill", spec.fill);
      if (spec.stroke && spec.stroke !== "none") {
        t.setAttribute("stroke", spec.stroke);
        t.setAttribute("stroke-width", String(spec.sw));
        if (spec.dash) t.setAttribute("stroke-dasharray", spec.dash);
        t.setAttribute("stroke-linecap", spec.cap || "round");
        t.setAttribute("stroke-linejoin", "round");
      }
      if (spec.opacity != null && spec.opacity !== 1) t.setAttribute("opacity", String(spec.opacity));
      t.textContent = word;
      svg.appendChild(t);
      if (o.overlay) addWordStrokeOverlay(svg, word, TRACE_FONT_SIZE, 0, TRACE_BASE, "alphabetic", w);
    }
    return svg;
  }

  const GEN_DEMO = CFG.genDemo || "Emma";

  function applyCase(word) {
    const mode = el.genCase ? el.genCase.value : "as-typed";
    if (mode === "upper") return word.toUpperCase();
    if (mode === "lower") return word.toLowerCase();
    if (mode === "title") return word.replace(/\b\w/g, (c) => c.toUpperCase());
    return word;
  }
  function genValue() {
    const raw = el.genInput ? el.genInput.value : "";
    const v = (raw && raw.trim()) ? raw.trim().slice(0, 42) : GEN_DEMO;
    return applyCase(v);
  }

  // Difficulty is one internal source of truth (1..7). The level buttons
  // (authored as crawlable HTML) and the age presets both set it; an optional
  // slider stays in sync when a page still ships one.
  let genLevelState = 2;
  function clampLevel(v) { return Math.max(1, Math.min(TRACE_LEVELS.length, v || 2)); }
  function genLevel() {
    if (el.genSlider) return clampLevel(parseInt(el.genSlider.value, 10));
    return clampLevel(genLevelState);
  }
  function setGenLevel(v) {
    genLevelState = clampLevel(v);
    if (el.genSlider) el.genSlider.value = String(genLevelState);
    renderGenPreview();
  }
  function genRowCount() {
    return Math.max(1, Math.min(8, parseInt((el.genRows && el.genRows.value) || "3", 10) || 3));
  }
  function genModelOn() { return !el.genModel || el.genModel.checked; }

  // The full worksheet as a DOM node — the SINGLE primitive behind both the
  // live paper preview and the printed sheet, so what you see is what prints.
  function genSheetNode() {
    const word = genValue();
    const level = genLevel();
    const sheet = document.createElement("div");
    sheet.className = "pt-gen-sheet";
    // A solid model row on top so the target is always visible (unless the
    // chosen level already IS the solid model, or the user turned it off).
    if (genModelOn() && level !== 1) sheet.appendChild(genRow(word, 1));
    const traceCount = genRowCount();
    for (let i = 0; i < traceCount; i++) sheet.appendChild(genRow(word, level));
    // Finish on blank ruled lines for independent writing (skip if already blank).
    const blanks = level === TRACE_LEVELS.length ? 0 : 2;
    for (let i = 0; i < blanks; i++) sheet.appendChild(genRow(word, TRACE_LEVELS.length));
    return sheet;
  }

  function genRow(word, level) {
    const row = document.createElement("div");
    row.className = "pt-gen-row";
    row.appendChild(traceWordSVG(word, level, { guides: true, overlay: strokeOverlayOn() }));
    return row;
  }

  // A small inline sample of a level's look, injected into each level button
  // so the ladder shows — not just tells — dotted vs dashed vs faded.
  function levelSampleSVG(level) {
    if (levelSpec(level).blank) {
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("viewBox", "0 0 120 60");
      svg.setAttribute("class", "pt-level-sample");
      svg.setAttribute("aria-hidden", "true");
      addGuide(svg, 120, 42, false);
      return svg;
    }
    const svg = traceWordSVG("Aa", level, { guides: false });
    svg.setAttribute("class", "pt-trace-svg pt-level-sample");
    svg.setAttribute("aria-hidden", "true");
    return svg;
  }

  function updateGenUI() {
    const level = genLevel();
    const spec = levelSpec(level);
    if (el.genLevel) el.genLevel.textContent = "Level " + level + " · " + spec.label;
    if (el.genHint) el.genHint.textContent = spec.hint;
    // Level ladder buttons.
    $$(".pt-level", el.genLevels || document).forEach((b) => {
      const on = parseInt(b.dataset.level, 10) === level;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    // Age presets are shortcuts; light up the one that matches the level.
    if (el.genPresets) {
      $$(".pt-gen-preset", el.genPresets).forEach((b) => {
        const on = parseInt(b.dataset.level, 10) === level;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    if (el.genPreviewMeta) {
      const parts = [];
      if (genModelOn() && level !== 1) parts.push("1 model");
      parts.push(genRowCount() + " trace");
      if (level !== TRACE_LEVELS.length) parts.push("2 blank");
      el.genPreviewMeta.textContent = parts.join(" · ") + " · US Letter";
    }
  }

  function renderGenPreview() {
    updateGenUI();
    if (!el.genPreview) return;
    el.genPreview.innerHTML = "";
    el.genPreview.appendChild(genSheetNode());
  }

  function buildGeneratorSheet() {
    const spec = levelSpec(genLevel());
    printWrap(genValue() + " — " + spec.label + " worksheet · ultratextgen.com", genSheetNode());
  }

  // Word at a level -> wide PNG (mirrors the SVG spec on Canvas).
  function genWordPNG(word, level) {
    const spec = levelSpec(level);
    withFont(() => {
      const width = 1600, height = 460, pad = 96;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      let fontSize = 300;
      ctx.font = "700 " + fontSize + "px " + FONT;
      const measured = ctx.measureText(word).width;
      if (measured > width - pad * 2) {
        fontSize = Math.max(60, Math.floor(fontSize * (width - pad * 2) / measured));
      }
      const base = Math.round(height * 0.72);
      // Ruled guides.
      const drawGuide = (y, dashed) => {
        ctx.beginPath();
        ctx.setLineDash(dashed ? [6, 8] : []);
        ctx.lineWidth = dashed ? 1.5 : 2;
        ctx.strokeStyle = dashed ? GUIDE_MID : GUIDE;
        ctx.moveTo(pad * 0.5, y); ctx.lineTo(width - pad * 0.5, y); ctx.stroke();
      };
      drawGuide(base, false);
      drawGuide(base - Math.round(fontSize * 0.52), true);
      drawGuide(base - Math.round(fontSize * 0.74), false);

      if (!spec.blank) {
        ctx.font = "700 " + fontSize + "px " + FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.lineJoin = "round";
        const scale = fontSize / TRACE_FONT_SIZE;
        ctx.globalAlpha = spec.opacity == null ? 1 : spec.opacity;
        if (spec.fill && spec.fill !== "none") {
          ctx.fillStyle = spec.fill;
          ctx.fillText(word, width / 2, base);
        }
        if (spec.stroke && spec.stroke !== "none") {
          ctx.strokeStyle = spec.stroke;
          ctx.lineWidth = Math.max(1, spec.sw * scale);
          ctx.lineCap = spec.cap || "round";
          const dash = (spec.dash || "").split(/\s+/).filter(Boolean).map((n) => Math.max(0.01, parseFloat(n) * scale));
          ctx.setLineDash(dash.length ? dash : []);
          ctx.strokeText(word, width / 2, base);
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
      }
      downloadCanvas(canvas, (PNG_PREFIX || "handwriting") + "-" + (slugify(word) || "word") + "-L" + level + ".png");
    });
  }

  function initGenerator() {
    if (!el.genInput && !el.genSlider && !el.genLevels) return;
    if (el.genInput) {
      let timer = null;
      el.genInput.addEventListener("input", () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(renderGenPreview, 120);
      });
    }
    if (el.genSlider) el.genSlider.addEventListener("input", () => setGenLevel(parseInt(el.genSlider.value, 10)));
    if (el.genCase) el.genCase.addEventListener("change", renderGenPreview);
    if (el.genRows) el.genRows.addEventListener("change", renderGenPreview);
    if (el.genModel) el.genModel.addEventListener("change", renderGenPreview);
    // Level ladder — buttons authored in HTML (crawlable); wire + add samples.
    if (el.genLevels) {
      $$(".pt-level", el.genLevels).forEach((b) => {
        const lvl = parseInt(b.dataset.level, 10);
        const slot = b.querySelector(".pt-level-sample-slot");
        if (slot) slot.appendChild(levelSampleSVG(lvl));
        b.addEventListener("click", () => setGenLevel(lvl));
      });
    }
    if (el.genPresets) {
      $$(".pt-gen-preset", el.genPresets).forEach((b) => {
        b.addEventListener("click", () => setGenLevel(parseInt(b.dataset.level, 10)));
      });
    }
    if (el.genPrint) el.genPrint.addEventListener("click", buildGeneratorSheet);
    if (el.genPng) el.genPng.addEventListener("click", () => genWordPNG(genValue(), genLevel()));
    if (el.genSlider) genLevelState = clampLevel(parseInt(el.genSlider.value, 10));
    renderGenPreview();
  }

  /* ---------------------------------------------------------------
     Section: coloring-sheet designer
     Type a word/name -> a decorated, colorable, print-ready sheet with
     an optional heading, a signature/date footer, a decorative symbol
     border, and a multi-color interior fill (dots / stripes / hearts /
     stars) so a child colors many small regions (fine-motor practice).
     Everything is one self-contained SVG (native, client-side) so the
     preview, the print sheet, and the PNG stay in sync. Gated on
     #pt-design-input + #pt-design-preview so other pages are untouched.
     --------------------------------------------------------------- */

  const DESIGN = CFG.designer || {};
  const DESIGN_DEMO = DESIGN.demo || CFG.nameDemo || "Hello";
  const FILL_KINDS = ["plain", "dots", "stripes", "hearts", "stars"];
  const BORDER_SETS = Object.assign({
    none: "",
    stars: "★",
    hearts: "♥",
    dots: "●",
    flowers: "✿",
    party: "★ ♥ ✿"
  }, DESIGN.borders || {});

  let designUid = 0;
  // Selection state for the swatch button groups (fill + border). Buttons are
  // authored in HTML (crawlable) and drive this; falls back to <select> values
  // for any page still shipping selects.
  const designState = { fill: "plain", border: "none" };

  function svgMake(tag, attrs, parent) {
    const node = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => { if (attrs[k] !== "" && attrs[k] != null) node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function starPath(cx, cy, outer, inner, points) {
    let d = "";
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outer : inner;
      const a = -Math.PI / 2 + i * step;
      d += (i === 0 ? "M" : "L") + (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1);
    }
    return d + "Z";
  }
  function heartPath(cx, cy, s) {
    const y = cy - s * 0.55;
    return "M" + cx + " " + (y + s * 0.35) +
      " C" + cx + " " + y + " " + (cx - s) + " " + y + " " + (cx - s) + " " + (y + s * 0.5) +
      " C" + (cx - s) + " " + (y + s * 1.05) + " " + cx + " " + (y + s * 1.35) + " " + cx + " " + (y + s * 1.65) +
      " C" + cx + " " + (y + s * 1.35) + " " + (cx + s) + " " + (y + s * 1.05) + " " + (cx + s) + " " + (y + s * 0.5) +
      " C" + (cx + s) + " " + y + " " + cx + " " + y + " " + cx + " " + (y + s * 0.35) + " Z";
  }

  function designText() {
    const raw = el.designInput ? el.designInput.value : "";
    return (raw && raw.trim()) ? raw.trim().slice(0, 24) : DESIGN_DEMO;
  }
  function designHeadingText() {
    return el.designHeading ? el.designHeading.value.trim().slice(0, 48) : "";
  }
  function designFillKind() {
    const v = el.designFillGroup ? designState.fill : (el.designFill ? el.designFill.value : "plain");
    return FILL_KINDS.indexOf(v) === -1 ? "plain" : v;
  }
  function designBorderKey() {
    return el.designBorderGroup ? designState.border : (el.designBorder ? el.designBorder.value : "none");
  }
  function designBorderSym() {
    return BORDER_SETS[designBorderKey()] || "";
  }

  // Mini swatch previews injected into the fill / border option buttons so the
  // choices are visible (not hidden inside a <select>).
  function fillSwatchSVG(kind) {
    const svg = svgMake("svg", { viewBox: "0 0 44 44", class: "pt-swatch-svg", "aria-hidden": "true" });
    const defs = svgMake("defs", null, svg);
    // White base so the swatch reads the same in light and dark mode…
    svgMake("rect", { x: 4, y: 4, width: 36, height: 36, rx: 9, fill: "#ffffff", stroke: INK, "stroke-width": 2.5 }, svg);
    // …then the tiled fill pattern on top for the non-plain kinds.
    if (kind !== "plain") {
      svgMake("rect", { x: 5, y: 5, width: 34, height: 34, rx: 8, fill: addFillPattern(defs, kind, "sw-" + kind), stroke: "none" }, svg);
    }
    return svg;
  }
  function borderSwatchSVG(key) {
    const sym = BORDER_SETS[key] || "";
    const svg = svgMake("svg", { viewBox: "0 0 44 44", class: "pt-swatch-svg", "aria-hidden": "true" });
    svgMake("rect", { x: 4, y: 4, width: 36, height: 36, rx: 9, fill: "#ffffff", stroke: "#d7dbe4", "stroke-width": 2 }, svg);
    const symbols = sym.split(" ").filter(Boolean);
    if (!symbols.length) {
      const dash = svgMake("text", { x: 22, y: 22, "text-anchor": "middle", "dominant-baseline": "central", "font-family": FONT, "font-size": 18, fill: "#c8ccd6" }, svg);
      dash.textContent = "—";
      return svg;
    }
    [10, 22, 34].forEach((x, i) => {
      const t = svgMake("text", { x: x, y: 12, "text-anchor": "middle", "dominant-baseline": "central", "font-family": FONT, "font-size": 11, fill: "#aab0bd" }, svg);
      t.textContent = symbols[i % symbols.length];
    });
    const big = svgMake("text", { x: 22, y: 27, "text-anchor": "middle", "dominant-baseline": "central", "font-family": FONT, "font-size": 17, fill: "#8b93a7" }, svg);
    big.textContent = symbols[0];
    return svg;
  }
  function designFooterOn() { return !!(el.designFooter && el.designFooter.checked); }

  // A tiled pattern of small outline shapes. Applied as the glyph's own
  // fill (fill="url(#pattern)") so it paints only inside the letters —
  // no clipPath needed (text-as-clip is unreliable across renderers).
  // Each little shape is a region a child colors -> multi-color / fine-motor.
  function addFillPattern(defs, kind, uid) {
    const isStripe = kind === "stripes";
    const pat = svgMake("pattern", {
      id: "ptpat" + uid, patternUnits: "userSpaceOnUse",
      width: isStripe ? 30 : 48, height: isStripe ? 30 : 48,
      patternTransform: isStripe ? "rotate(45)" : ""
    }, defs);
    const col = "#9aa3b2", sw = 3;
    if (kind === "dots") svgMake("circle", { cx: 24, cy: 24, r: 12, fill: "none", stroke: col, "stroke-width": sw }, pat);
    else if (kind === "stripes") svgMake("line", { x1: 15, y1: 0, x2: 15, y2: 30, stroke: col, "stroke-width": 6 }, pat);
    else if (kind === "hearts") svgMake("path", { d: heartPath(24, 24, 13), fill: "none", stroke: col, "stroke-width": sw }, pat);
    else if (kind === "stars") svgMake("path", { d: starPath(24, 25, 15, 7, 5), fill: "none", stroke: col, "stroke-width": sw }, pat);
    return "url(#ptpat" + uid + ")";
  }

  function addBorderRow(svg, symbols, y) {
    const count = 11, W = 1000, gap = (W - 120) / (count - 1);
    for (let i = 0; i < count; i++) {
      const t = svgMake("text", { x: 60 + i * gap, y: y, "text-anchor": "middle", "font-size": 34, fill: "#c8ccd6", "font-family": FONT }, svg);
      t.textContent = symbols[i % symbols.length];
    }
  }

  function addFooter(svg, y) {
    const field = (x, label, lineEnd) => {
      const t = svgMake("text", { x: x, y: y, "font-family": FONT, "font-size": 30, "font-weight": 600, fill: INK }, svg);
      t.textContent = label;
      svgMake("line", { x1: x + 110, y1: y + 6, x2: lineEnd, y2: y + 6, stroke: "#9aa3b2", "stroke-width": 2 }, svg);
    };
    field(90, "Name:", 470);
    field(560, "Date:", 910);
  }

  // The whole designed sheet as one portrait SVG (1000x1400).
  function designSheetSVG() {
    const text = designText();
    const heading = designHeadingText();
    const fill = designFillKind();
    const borderSym = designBorderSym();
    const footer = designFooterOn();
    const uid = ++designUid;
    const W = 1000, H = 1400, M = 70;

    const svg = svgMake("svg", { viewBox: "0 0 " + W + " " + H, class: "pt-design-sheet-svg", role: "img", "aria-label": (heading || text) + " coloring sheet" });
    const defs = svgMake("defs", null, svg);

    svgMake("rect", { x: 18, y: 18, width: W - 36, height: H - 36, rx: 26, fill: "#ffffff", stroke: "#e2e6ee", "stroke-width": 3 }, svg);

    if (borderSym) {
      const strip = borderSym.split(" ").filter(Boolean);
      addBorderRow(svg, strip, 78);
      addBorderRow(svg, strip, H - 48);
    }

    if (heading) {
      const h = svgMake("text", { x: W / 2, y: 168, "text-anchor": "middle", "font-family": FONT, "font-weight": 700, "font-size": 62, fill: INK }, svg);
      h.textContent = heading;
    }

    const availW = W - M * 2;
    const len = Math.max(1, [...text].length);
    const fs = Math.max(110, Math.min(360, Math.round(availW * 1.3 / len)));
    const cy = heading ? 740 : 700;
    const fontAttrs = {
      x: W / 2, y: cy, "text-anchor": "middle", "dominant-baseline": "central",
      "font-family": FONT, "font-weight": 700, "font-size": fs, "stroke-linejoin": "round"
    };
    // Guarantee the word fits the width; only compress when it would overflow.
    if (len * fs * 0.66 > availW) { fontAttrs.textLength = availW; fontAttrs.lengthAdjust = "spacingAndGlyphs"; }

    // Interior: plain white (open to color), or a tiled pattern painted as
    // the glyph fill. Plain keeps stroke under fill (thin clean edge); a
    // pattern draws stroke on top so the letter boundary stays crisp.
    const fillRef = (fill !== "plain") ? addFillPattern(defs, fill, uid) : "#ffffff";
    const outline = svgMake("text", Object.assign({}, fontAttrs, {
      fill: fillRef, stroke: INK, "stroke-width": Math.max(4, STROKE),
      "paint-order": (fill === "plain") ? "stroke" : ""
    }), svg);
    outline.textContent = text;

    if (footer) addFooter(svg, H - 150);

    const cred = svgMake("text", { x: W / 2, y: H - 24, "text-anchor": "middle", "font-family": FONT, "font-size": 22, fill: "#aeb4c0" }, svg);
    cred.textContent = "ultratextgen.com";
    return svg;
  }

  function renderDesignPreview() {
    if (!el.designPreview) return;
    el.designPreview.innerHTML = "";
    el.designPreview.appendChild(designSheetSVG());
  }

  function printDesign() {
    const holder = document.createElement("div");
    holder.className = "pt-design-print-holder";
    holder.appendChild(designSheetSVG());
    printWrap("", holder);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // PNG mirrors the sheet layout via Canvas text (outline + heading +
  // border + footer). Interior fill patterns are print-only; the PNG
  // saves the clean outline, which is what most "download" users reuse.
  function designPNG() {
    withFont(() => {
      const W = 1000, H = 1400, scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale; canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#e2e6ee"; ctx.lineWidth = 3;
      roundRectPath(ctx, 18, 18, W - 36, H - 36, 26); ctx.stroke();

      const text = designText(), heading = designHeadingText();
      const borderSym = designBorderSym();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";

      if (borderSym) {
        const strip = borderSym.split(" ").filter(Boolean);
        const count = 11, gap = (W - 120) / (count - 1);
        ctx.font = "34px " + FONT; ctx.fillStyle = "#c8ccd6";
        for (let i = 0; i < count; i++) {
          ctx.fillText(strip[i % strip.length], 60 + i * gap, 78);
          ctx.fillText(strip[i % strip.length], 60 + i * gap, H - 48);
        }
      }

      let cy = 700;
      if (heading) { ctx.font = "700 62px " + FONT; ctx.fillStyle = INK; ctx.fillText(heading, W / 2, 168); cy = 740; }

      const len = Math.max(1, [...text].length);
      let fs = Math.max(110, Math.min(360, Math.round((W - 140) * 1.3 / len)));
      ctx.font = "700 " + fs + "px " + FONT;
      const measured = ctx.measureText(text).width;
      if (measured > W - 140) { fs = Math.floor(fs * (W - 140) / measured); ctx.font = "700 " + fs + "px " + FONT; }
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff"; ctx.fillText(text, W / 2, cy);
      ctx.lineWidth = Math.max(6, STROKE); ctx.strokeStyle = INK; ctx.strokeText(text, W / 2, cy);

      if (designFooterOn()) {
        ctx.textAlign = "left"; ctx.font = "600 30px " + FONT; ctx.fillStyle = INK;
        const fy = H - 150;
        ctx.fillText("Name:", 90, fy); ctx.fillText("Date:", 560, fy);
        ctx.strokeStyle = "#9aa3b2"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(200, fy + 16); ctx.lineTo(470, fy + 16);
        ctx.moveTo(670, fy + 16); ctx.lineTo(910, fy + 16); ctx.stroke();
        ctx.textAlign = "center";
      }

      ctx.font = "22px " + FONT; ctx.fillStyle = "#aeb4c0"; ctx.fillText("ultratextgen.com", W / 2, H - 24);
      downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(text) || "sheet") + ".png");
    });
  }

  // Wire one swatch button group: inject each swatch preview, set the active
  // state, and re-render on click. `field` is the designState key it drives.
  function wireSwatchGroup(group, field, swatchFor) {
    if (!group) return;
    const buttons = $$(".pt-swatch", group);
    const preset = buttons.filter((b) => b.classList.contains("is-active"))[0] || buttons[0];
    if (preset) designState[field] = preset.dataset.value;
    buttons.forEach((b) => {
      const slot = b.querySelector(".pt-swatch-art");
      if (slot) slot.appendChild(swatchFor(b.dataset.value));
      b.setAttribute("aria-checked", b === preset ? "true" : "false");
      b.classList.toggle("is-active", b === preset);
      b.addEventListener("click", () => {
        designState[field] = b.dataset.value;
        buttons.forEach((o) => {
          const on = o === b;
          o.classList.toggle("is-active", on);
          o.setAttribute("aria-checked", on ? "true" : "false");
        });
        renderDesignPreview();
      });
    });
  }

  function buildDesigner() {
    if (!el.designInput || !el.designPreview) return;
    let timer = null;
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(renderDesignPreview, 120); };
    el.designInput.addEventListener("input", schedule);
    if (el.designHeading) el.designHeading.addEventListener("input", schedule);
    wireSwatchGroup(el.designFillGroup, "fill", fillSwatchSVG);
    wireSwatchGroup(el.designBorderGroup, "border", borderSwatchSVG);
    [el.designFill, el.designBorder, el.designFooter].forEach((c) => { if (c) c.addEventListener("change", renderDesignPreview); });
    if (el.designPrint) el.designPrint.addEventListener("click", printDesign);
    if (el.designPng) el.designPng.addEventListener("click", designPNG);
    renderDesignPreview();
  }

  /* ---------------------------------------------------------------
     Wiring
     --------------------------------------------------------------- */

  function init() {
    initStrokeToggle();
    buildStrip();
    buildAlphabetGrid();
    initGenerator();
    buildDesigner();

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
