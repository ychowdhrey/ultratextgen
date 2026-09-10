/* ══════════════════════════════════════════════════════════════════
   Cross-Stitch Letter Generator — crossStitchEngine.js
   Self-contained page controller. Pure vanilla JS, no dependencies,
   no framework, no external font. Renders a 5×7 bitmap alphabet as a
   client-side SVG cross-stitch chart, with PNG export and print.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* User-facing strings. printablesEngine.js carries a full I18N table; these
     do not warrant a second copy of that machinery, so a translated page
     overrides them from its own config the same way it already supplies
     UTG_PRINTABLE. Every key falls back to English.
     Note stitchOne/stitchMany are whole words, not a suffix: English pluralises
     "stitch" -> "stitches" by appending, Spanish needs "puntada"/"puntadas". */
  const CS_CFG = window.UTG_CROSS_STITCH || {};
  const T = {
    printTitle:      CS_CFG.printTitle      || "Cross-Stitch Pattern — ",
    chartAriaPrefix: CS_CFG.chartAriaPrefix || "Cross-stitch chart for ",
    oneStitch:       CS_CFG.oneStitch       || "= 1 stitch",
    columnsWord:     CS_CFG.columnsWord     || "columns",
    rowsWord:        CS_CFG.rowsWord        || "rows",
    stitchOne:       CS_CFG.stitchOne       || "stitch",
    stitchMany:      CS_CFG.stitchMany      || "stitches",
    emptyHint:       CS_CFG.emptyHint       || "Type a word or name above to see its cross-stitch chart."
  };

  /* ── The 5×7 stitch alphabet ──────────────────────────────────────
     Each glyph is 7 rows of a 5-character string: '1' = a stitch,
     '0' = empty. Uppercase + digits + a blank space column. This is a
     classic cross-stitch letter grid — intentionally simple and blocky. */
  const STITCH_FONT = {
    "A": ["01110","10001","10001","11111","10001","10001","10001"],
    "B": ["11110","10001","10001","11110","10001","10001","11110"],
    "C": ["01111","10000","10000","10000","10000","10000","01111"],
    "D": ["11110","10001","10001","10001","10001","10001","11110"],
    "E": ["11111","10000","10000","11110","10000","10000","11111"],
    "F": ["11111","10000","10000","11110","10000","10000","10000"],
    "G": ["01111","10000","10000","10011","10001","10001","01111"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"],
    "I": ["01110","00100","00100","00100","00100","00100","01110"],
    "J": ["00111","00010","00010","00010","00010","10010","01100"],
    "K": ["10001","10010","10100","11000","10100","10010","10001"],
    "L": ["10000","10000","10000","10000","10000","10000","11111"],
    "M": ["10001","11011","10101","10101","10001","10001","10001"],
    "N": ["10001","11001","10101","10101","10011","10001","10001"],
    "O": ["01110","10001","10001","10001","10001","10001","01110"],
    "P": ["11110","10001","10001","11110","10000","10000","10000"],
    "Q": ["01110","10001","10001","10001","10101","10010","01101"],
    "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"],
    "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"],
    "V": ["10001","10001","10001","10001","10001","01010","00100"],
    "W": ["10001","10001","10001","10101","10101","10101","01010"],
    "X": ["10001","10001","01010","00100","01010","10001","10001"],
    "Y": ["10001","10001","01010","00100","00100","00100","00100"],
    "Z": ["11111","00001","00010","00100","01000","10000","11111"],
    "0": ["01110","10001","10011","10101","11001","10001","01110"],
    "1": ["00100","01100","00100","00100","00100","00100","01110"],
    "2": ["01110","10001","00001","00010","00100","01000","11111"],
    "3": ["11110","00001","00001","00110","00001","00001","11110"],
    "4": ["00010","00110","01010","10010","11111","00010","00010"],
    "5": ["11111","10000","11110","00001","00001","10001","01110"],
    "6": ["00110","01000","10000","11110","10001","10001","01110"],
    "7": ["11111","00001","00010","00100","01000","01000","01000"],
    "8": ["01110","10001","10001","01110","10001","10001","01110"],
    "9": ["01110","10001","10001","01111","00001","00010","01100"],
    " ": ["00000","00000","00000","00000","00000","00000","00000"]
  };

  const GLYPH_ROWS = 7;      // every glyph is 7 rows tall
  const GLYPH_COLS = 5;      // …and 5 columns wide
  const LETTER_GAP = 1;      // blank columns between adjacent letters
  const CELL = 16;           // SVG grid unit (px) for the on-screen chart
  const GRID_LINE = "#d3d7de";   // light neutral gray — crisp on white in both themes
  const TITLE_INK = "#1a1a2e";   // print/PNG title colour (matches --text-primary light)

  /* ── DOM helpers ──────────────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);

  function svgNode(str) {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(str).trim();
    return tpl.content.firstElementChild;
  }

  // Printable output telemetry lives in header.js (window.UltraTextGen.
  // trackPrintable) — this engine is a separate IIFE from printablesEngine.js
  // and a second copy of the event's shape would drift from it.
  function trackPrintable(action, sheet) {
    if (window.UltraTextGen && window.UltraTextGen.trackPrintable) {
      window.UltraTextGen.trackPrintable(action, sheet);
    }
  }

  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /* ── State ─────────────────────────────────────────────────────── */
  const state = {
    text: "HOME",
    color: "#2b2b2b",
    style: "x-stitch"
  };

  /* ── Grid model ────────────────────────────────────────────────────
     Turn the input word into 7 equal-length row strings of '0'/'1'.
     Unknown characters fall back to a blank space column (never a made-up
     glyph); lowercase is uppercased first (charts are uppercase-only). */
  function buildRows(text) {
    // Keep every input char; map anything without a glyph (punctuation,
    // accents, symbols) to a blank space column — never invent a glyph.
    const chars = String(text).toUpperCase().split("");
    const rows = ["", "", "", "", "", "", ""];
    chars.forEach((ch, idx) => {
      const glyph = STITCH_FONT[ch] || STITCH_FONT[" "];
      for (let r = 0; r < GLYPH_ROWS; r++) {
        rows[r] += glyph[r];
        if (idx < chars.length - 1) {
          for (let g = 0; g < LETTER_GAP; g++) rows[r] += "0";
        }
      }
    });
    return { rows: rows, cols: rows[0] ? rows[0].length : 0, empty: chars.length === 0 };
  }

  function countStitches(rows) {
    let n = 0;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] === "1") n++;
      }
    }
    return n;
  }

  /* ── SVG chart builder ─────────────────────────────────────────────
     Returns an <svg> string: white background, light-gray grid lines, and
     one X-stitch (two diagonals) or filled square per set cell. Sized with
     an explicit width/height + inline max-width so it scales inside the
     card and prints to page width, staying crisp regardless of site theme. */
  function buildChartSVG(rows, color, style, label) {
    const cols = rows[0] ? rows[0].length : 0;
    const rc = rows.length;
    const w = cols * CELL;
    const h = rc * CELL;

    let grid = "";
    for (let c = 0; c <= cols; c++) {
      const x = c * CELL;
      grid += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '"/>';
    }
    for (let r = 0; r <= rc; r++) {
      const y = r * CELL;
      grid += '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '"/>';
    }

    let marks = "";
    const pad = CELL * 0.17;
    const inset = CELL * 0.1;
    for (let r = 0; r < rc; r++) {
      const row = rows[r];
      for (let c = 0; c < cols; c++) {
        if (row[c] !== "1") continue;
        const x = c * CELL;
        const y = r * CELL;
        if (style === "filled") {
          marks += '<rect x="' + (x + inset) + '" y="' + (y + inset) +
            '" width="' + (CELL - 2 * inset) + '" height="' + (CELL - 2 * inset) +
            '" rx="' + (CELL * 0.12) + '"/>';
        } else {
          const x1 = x + pad, y1 = y + pad, x2 = x + CELL - pad, y2 = y + CELL - pad;
          marks += '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 +
            ' M' + x2 + ' ' + y1 + ' L' + x1 + ' ' + y2 + '"/>';
        }
      }
    }

    const stitchLayer = style === "filled"
      ? '<g fill="' + color + '">' + marks + "</g>"
      : '<g stroke="' + color + '" stroke-width="' + (CELL * 0.17) +
        '" stroke-linecap="round" fill="none">' + marks + "</g>";

    const aria = label ? ' role="img" aria-label="' + T.chartAriaPrefix + label + '"' : ' aria-hidden="true"';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" width="' + w + '" height="' + h + '"' + aria +
      ' style="max-width:100%;height:auto;display:block;margin:0 auto;">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#ffffff"/>' +
      '<g stroke="' + GRID_LINE + '" stroke-width="1">' + grid + "</g>" +
      stitchLayer +
      "</svg>";
  }

  /* Small symbol swatch used in the legend + PNG/print. */
  function symbolSVG(color, style, size) {
    if (style === "filled") {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="' + size + '" height="' + size +
        '" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="2" fill="' + color + '"/></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="' + size + '" height="' + size +
      '" aria-hidden="true"><path d="M5 5 L15 15 M15 5 L5 15" stroke="' + color +
      '" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
  }

  function legendHTML(rows, color, style) {
    const cols = rows[0] ? rows[0].length : 0;
    const stitches = countStitches(rows);
    return '<div class="cross-stitch-legend" ' +
      'style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem 0.9rem;' +
      'margin-top:0.85rem;font-size:0.85rem;font-weight:600;color:#334155;">' +
      '<span style="display:inline-flex;align-items:center;gap:0.4rem;">' +
      '<span style="display:inline-flex;width:20px;height:20px;">' + symbolSVG(color, style, 20) + "</span>" +
      "<span>" + T.oneStitch + "</span></span>" +
      '<span style="color:#64748b;">' + cols + " " + T.columnsWord + " × " + GLYPH_ROWS + " " + T.rowsWord + " · " +
      stitches + " " + (stitches === 1 ? T.stitchOne : T.stitchMany) + "</span>" +
      "</div>";
  }

  /* ── Live preview ──────────────────────────────────────────────── */
  function render() {
    const chart = $("#cs-chart");
    const legend = $("#cs-legend");
    if (!chart) return;

    const model = buildRows(state.text);
    if (model.empty || model.cols === 0) {
      chart.innerHTML = '<p class="cross-stitch-empty" ' +
        'style="text-align:center;color:#94a3b8;font-weight:600;padding:1.5rem 0;margin:0;">' +
        T.emptyHint + "</p>";
      if (legend) legend.innerHTML = "";
      return;
    }

    const label = state.text.trim().replace(/"/g, "”");
    chart.innerHTML = buildChartSVG(model.rows, state.color, state.style, label);
    if (legend) legend.innerHTML = legendHTML(model.rows, state.color, state.style);
  }

  /* ── Canvas / PNG export ───────────────────────────────────────────
     Redraws the identical grid onto a canvas at a larger fixed px-per-cell,
     with a word title on top and a legend at the bottom, then downloads it. */
  function drawSymbolOnCanvas(ctx, x, y, size, color, style) {
    if (style === "filled") {
      const inset = size * 0.16;
      ctx.fillStyle = color;
      ctx.fillRect(x + inset, y + inset, size - 2 * inset, size - 2 * inset);
    } else {
      const pad = size * 0.2;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.13);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + pad, y + pad);
      ctx.lineTo(x + size - pad, y + size - pad);
      ctx.moveTo(x + size - pad, y + pad);
      ctx.lineTo(x + pad, y + size - pad);
      ctx.stroke();
    }
  }

  function drawChartOnCanvas(ctx, ox, oy, rows, color, style, cell) {
    const cols = rows[0] ? rows[0].length : 0;
    const rc = rows.length;
    const w = cols * cell;
    const h = rc * cell;

    // Grid lines.
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = Math.round(ox + c * cell) + 0.5;
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + h);
    }
    for (let r = 0; r <= rc; r++) {
      const y = Math.round(oy + r * cell) + 0.5;
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + w, y);
    }
    ctx.stroke();

    // Stitches.
    const pad = cell * 0.17;
    const inset = cell * 0.1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = cell * 0.17;
    ctx.lineCap = "round";
    for (let r = 0; r < rc; r++) {
      const row = rows[r];
      for (let c = 0; c < cols; c++) {
        if (row[c] !== "1") continue;
        const x = ox + c * cell;
        const y = oy + r * cell;
        if (style === "filled") {
          ctx.fillRect(x + inset, y + inset, cell - 2 * inset, cell - 2 * inset);
        } else {
          ctx.beginPath();
          ctx.moveTo(x + pad, y + pad);
          ctx.lineTo(x + cell - pad, y + cell - pad);
          ctx.moveTo(x + cell - pad, y + pad);
          ctx.lineTo(x + pad, y + cell - pad);
          ctx.stroke();
        }
      }
    }
  }

  function downloadPNG() {
    const model = buildRows(state.text);
    if (model.empty || model.cols === 0) return;

    const cell = 40;
    const margin = 40;
    const titleH = 64;
    const legendH = 72;
    const chartW = model.cols * cell;
    const chartH = GLYPH_ROWS * cell;
    const canvasW = Math.max(chartW + margin * 2, 520);
    const canvasH = titleH + chartH + legendH + margin;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");

    // White page.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Title (the word).
    const word = state.text.toUpperCase().trim();
    ctx.fillStyle = TITLE_INK;
    ctx.font = "700 34px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(word, canvasW / 2, titleH * 0.55);

    // Chart, centred.
    const ox = Math.round((canvasW - chartW) / 2);
    const oy = titleH;
    drawChartOnCanvas(ctx, ox, oy, model.rows, state.color, state.style, cell);

    // Legend at the bottom: symbol swatch + text.
    const stitches = countStitches(model.rows);
    const legendText = T.oneStitch + "     ·     " + model.cols + " " + T.columnsWord + " × " +
      GLYPH_ROWS + " " + T.rowsWord + " · " + stitches + " " +
      (stitches === 1 ? T.stitchOne : T.stitchMany);
    const symSize = 26;
    const gap = 10;
    ctx.font = "600 20px 'Plus Jakarta Sans', system-ui, sans-serif";
    const textW = ctx.measureText(legendText).width;
    const total = symSize + gap + textW;
    const startX = (canvasW - total) / 2;
    const legendMidY = titleH + chartH + margin * 0.5 + legendH * 0.4;
    drawSymbolOnCanvas(ctx, startX, legendMidY - symSize / 2, symSize, state.color, state.style);
    ctx.fillStyle = "#334155";
    ctx.textAlign = "left";
    ctx.fillText(legendText, startX + symSize + gap, legendMidY);

    // Small, low-contrast site credit in the reserved bottom margin —
    // matches the existing printablesEngine/kanaChart footer convention.
    ctx.font = "22px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#aeb4c0";
    ctx.textAlign = "center";
    ctx.fillText("ultratextgen.com", canvasW / 2, canvasH - 16);

    canvas.toBlob(function (blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cross-stitch-" + (slugify(state.text) || "pattern") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      trackPrintable("download_png", "cross_stitch");
    }, "image/png");
  }

  /* ── Print ─────────────────────────────────────────────────────────
     Build title + chart + legend into #pt-print-root, flip the global
     print class (CSS isolates that root), print, then clean up. */
  function printPattern() {
    const model = buildRows(state.text);
    if (model.empty || model.cols === 0) return;

    trackPrintable("print", "cross_stitch");
    const root = $("#pt-print-root");
    if (!root) { window.print(); return; }
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";

    const h = document.createElement("h2");
    h.className = "bubble-print-title";
    /* The only user-facing string this engine generates. printablesEngine.js
       carries a full I18N table; one string does not warrant a second copy of
       that machinery, so a translated page overrides it from its own config
       the same way it already supplies UTG_PRINTABLE. Falls back to English. */
    h.textContent = T.printTitle + state.text.toUpperCase().trim();
    wrap.appendChild(h);

    const label = state.text.trim().replace(/"/g, "”");
    const chartHolder = document.createElement("div");
    chartHolder.className = "cs-print-chart";
    chartHolder.innerHTML = buildChartSVG(model.rows, state.color, state.style, label);
    wrap.appendChild(chartHolder);

    const legend = document.createElement("div");
    legend.innerHTML = legendHTML(model.rows, state.color, state.style);
    wrap.appendChild(legend);

    root.appendChild(wrap);
    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    root.innerHTML = "";
  }

  /* ── Swatch groups ─────────────────────────────────────────────────
     Inject each swatch's mini preview, reflect active state, and pick on
     click (toggles is-active + aria-checked) — the shared printables pattern. */
  function wireSwatchGroup(group, artFn, onPick) {
    if (!group) return;
    const buttons = Array.prototype.slice.call(group.querySelectorAll(".pt-swatch"));
    const preset = buttons.filter(function (b) { return b.classList.contains("is-active"); })[0] || buttons[0];
    buttons.forEach(function (b) {
      const slot = b.querySelector(".pt-swatch-art");
      if (slot && artFn) {
        slot.innerHTML = "";
        const node = artFn(b.dataset.value);
        if (node) slot.appendChild(node);
      }
      const on = b === preset;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.addEventListener("click", function () {
        buttons.forEach(function (o) {
          const active = o === b;
          o.classList.toggle("is-active", active);
          o.setAttribute("aria-checked", active ? "true" : "false");
        });
        onPick(b.dataset.value);
      });
    });
    if (preset) onPick(preset.dataset.value, true);
  }

  function colorArt(value) {
    return svgNode('<svg viewBox="0 0 40 40" class="pt-swatch-svg" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="14" fill="' + value + '"/></svg>');
  }

  function styleArt(value) {
    if (value === "filled") {
      return svgNode('<svg viewBox="0 0 40 40" class="pt-swatch-svg" aria-hidden="true">' +
        '<rect x="11" y="11" width="18" height="18" rx="3" fill="#2b2b2b"/></svg>');
    }
    return svgNode('<svg viewBox="0 0 40 40" class="pt-swatch-svg" aria-hidden="true">' +
      '<path d="M12 12 L28 28 M28 12 L12 28" stroke="#2b2b2b" stroke-width="4" ' +
      'stroke-linecap="round" fill="none"/></svg>');
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  function init() {
    const input = $("#cs-input");
    if (input) {
      state.text = input.value || state.text;
      let timer = null;
      input.addEventListener("input", function () {
        state.text = input.value;
        clearTimeout(timer);
        timer = setTimeout(render, 120);
      });
    }

    wireSwatchGroup($("#cs-color-group"), colorArt, function (value, silent) {
      state.color = value;
      if (!silent) render();
    });

    wireSwatchGroup($("#cs-style-group"), styleArt, function (value, silent) {
      state.style = value;
      if (!silent) render();
    });

    const printBtn = $("#cs-print");
    if (printBtn) printBtn.addEventListener("click", printPattern);

    const pngBtn = $("#cs-png");
    if (pngBtn) pngBtn.addEventListener("click", downloadPNG);

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
