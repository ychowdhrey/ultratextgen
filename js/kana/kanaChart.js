/*
 * kanaChart.js — shared engine for the interactive + printable kana charts.
 *
 * One engine powers both /hiragana-chart/ and /katakana-chart/. A page declares
 *   window.UTG_KANA = { set: "hiragana"|"katakana", name, pngPrefix, url }
 * and includes the matching data file (js/kana/<set>Data.js), which registers
 * window.UltraKanaData[set]. Everything is client-side: an on-screen grid, a
 * print sheet (window.print() into a hidden surface), and a Canvas-rendered
 * PNG. No font binaries are bundled — kana use the visitor's system Japanese
 * font stack.
 *
 * Controls (authored as crawlable HTML, wired here):
 *   #kana-romaji-toggle   show / hide romaji  (hidden = self-quiz mode)
 *   #kana-sec-dakuten     include the voiced section
 *   #kana-sec-yoon        include the combinations section
 *   #kana-print / #kana-png   export the visible chart
 * Mounts: #kana-chart (grids), #kana-print-root (print surface), #kana-toast.
 *
 * IIFE + global-namespace, matching the rest of the frontend (no imports).
 */
(function () {
  "use strict";

  const CFG = window.UTG_KANA || {};
  const SET = CFG.set || "hiragana";
  const NAME = CFG.name || "Kana Chart";
  const PNG_PREFIX = CFG.pngPrefix || "kana-chart";
  const URL_LINE = CFG.url || "ultratextgen.com";

  const $ = (sel, root) => (root || document).querySelector(sel);

  // System Japanese font stack — no bundled webfont (client-side, native only).
  const KANA_FONT =
    "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', 'YuGothic', " +
    "'Noto Sans JP', 'Noto Sans CJK JP', Meiryo, 'MS PGothic', sans-serif";
  const ROMAJI_FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
  const INK = "#1a1a2e";

  const el = {
    chart: $("#kana-chart"),
    romaji: $("#kana-romaji-toggle"),
    dakuten: $("#kana-sec-dakuten"),
    yoon: $("#kana-sec-yoon"),
    print: $("#kana-print"),
    png: $("#kana-png"),
    printRoot: $("#kana-print-root"),
    toast: $("#kana-toast")
  };

  const state = { romaji: true, dakuten: true, yoon: true };

  function dataset() {
    return (window.UltraKanaData || {})[SET] || null;
  }

  /* --------------------------------------------------------------
     State
     -------------------------------------------------------------- */

  function visibleSections() {
    const data = dataset();
    if (!data) return [];
    return data.sections.filter((s) => {
      if (s.key === "dakuten") return state.dakuten;
      if (s.key === "yoon") return state.yoon;
      return true; // gojuon always shown
    });
  }

  /* --------------------------------------------------------------
     Copy + toast
     -------------------------------------------------------------- */

  let toastTimer = null;
  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 1400);
  }

  function copyKana(kana, romaji) {
    const done = () => showToast("Copied " + kana + (romaji ? " (" + romaji + ")" : ""));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(kana).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = kana;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
      done();
    }
  }

  /* --------------------------------------------------------------
     Grid builder (shared by screen + print)
     -------------------------------------------------------------- */

  // Build one section as a DOM node. interactive=true -> click-to-copy buttons
  // (screen); false -> plain cells (print sheet).
  function buildSection(section, opts) {
    const o = opts || {};
    const showRomaji = o.showRomaji !== false;
    const wrap = document.createElement("section");
    wrap.className = "kana-section";
    wrap.dataset.section = section.key;

    const head = document.createElement("div");
    head.className = "kana-section-head";
    const h = document.createElement("h2");
    h.className = "kana-section-title";
    h.textContent = section.label;
    head.appendChild(h);
    if (section.note && o.notes !== false) {
      const p = document.createElement("p");
      p.className = "kana-section-note";
      p.textContent = section.note;
      head.appendChild(p);
    }
    wrap.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "kana-grid kana-cols-" + section.cols.length;

    section.rows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (!cell) {
          const gap = document.createElement("div");
          gap.className = "kana-cell kana-cell-empty";
          gap.setAttribute("aria-hidden", "true");
          grid.appendChild(gap);
          return;
        }
        const node = o.interactive ? document.createElement("button") : document.createElement("div");
        node.className = "kana-cell";
        if (o.interactive) {
          node.type = "button";
          node.setAttribute("aria-label", "Copy " + cell.k + " — " + cell.r);
          node.addEventListener("click", () => copyKana(cell.k, cell.r));
        }
        const glyph = document.createElement("span");
        glyph.className = "kana-glyph";
        glyph.textContent = cell.k;
        node.appendChild(glyph);
        const rom = document.createElement("span");
        rom.className = "kana-romaji";
        rom.textContent = cell.r;
        if (!showRomaji) rom.classList.add("is-hidden");
        node.appendChild(rom);
        grid.appendChild(node);
      });
    });

    wrap.appendChild(grid);
    return wrap;
  }

  function renderChart() {
    if (!el.chart) return;
    el.chart.classList.toggle("kana-no-romaji", !state.romaji);
    el.chart.innerHTML = "";
    visibleSections().forEach((section) => {
      el.chart.appendChild(buildSection(section, { interactive: true, showRomaji: state.romaji }));
    });
  }

  /* --------------------------------------------------------------
     Print
     -------------------------------------------------------------- */

  function printChart() {
    if (!el.printRoot) { window.print(); return; }
    el.printRoot.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "kana-print-wrap";
    const title = document.createElement("h1");
    title.className = "kana-print-title";
    title.textContent = NAME + (state.romaji ? "" : " (blank — fill in the romaji)");
    wrap.appendChild(title);
    visibleSections().forEach((section) => {
      wrap.appendChild(buildSection(section, { interactive: false, showRomaji: state.romaji }));
    });
    const cred = document.createElement("p");
    cred.className = "kana-print-cred";
    cred.textContent = URL_LINE;
    wrap.appendChild(cred);
    el.printRoot.appendChild(wrap);
    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    el.printRoot.innerHTML = "";
  }

  /* --------------------------------------------------------------
     PNG export (Canvas — mirrors the visible chart)
     -------------------------------------------------------------- */

  function downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  function chartPNG() {
    const sections = visibleSections();
    if (!sections.length) return;
    const showRomaji = state.romaji;
    const scale = 2;
    const MARGIN = 48;
    const CELL_W = 132;
    const CELL_H = showRomaji ? 132 : 112;
    const TITLE_H = 70;
    const SECTION_GAP = 40;
    const HEADER_H = 96;

    const maxCols = sections.reduce((m, s) => Math.max(m, s.cols.length), 5);
    const gridW = maxCols * CELL_W;
    const W = MARGIN * 2 + gridW;

    let H = MARGIN + HEADER_H;
    sections.forEach((s) => { H += TITLE_H + s.rows.length * CELL_H + SECTION_GAP; });
    H += MARGIN - SECTION_GAP;

    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Header.
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 40px " + ROMAJI_FONT;
    ctx.fillText(NAME, MARGIN, MARGIN + 34);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 18px " + ROMAJI_FONT;
    ctx.fillText(URL_LINE, MARGIN, MARGIN + 62);

    let y = MARGIN + HEADER_H;
    sections.forEach((section) => {
      ctx.fillStyle = INK;
      ctx.textAlign = "left";
      ctx.font = "700 24px " + ROMAJI_FONT;
      ctx.fillText(section.label, MARGIN, y + 30);
      y += TITLE_H;

      section.rows.forEach((row, ri) => {
        row.cells.forEach((cell, ci) => {
          const x = MARGIN + ci * CELL_W;
          const cy = y + ri * CELL_H;
          // Cell border.
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, cy + 0.5, CELL_W, CELL_H);
          if (!cell) { drawGap(ctx, x, cy, CELL_W, CELL_H); return; }
          ctx.fillStyle = INK;
          ctx.textAlign = "center";
          ctx.font = "500 " + (showRomaji ? 52 : 60) + "px " + KANA_FONT;
          ctx.textBaseline = "middle";
          ctx.fillText(cell.k, x + CELL_W / 2, cy + (showRomaji ? CELL_H * 0.42 : CELL_H * 0.5));
          if (showRomaji) {
            ctx.fillStyle = "#64748b";
            ctx.font = "600 20px " + ROMAJI_FONT;
            ctx.fillText(cell.r, x + CELL_W / 2, cy + CELL_H * 0.82);
          }
        });
      });
      y += section.rows.length * CELL_H + SECTION_GAP;
    });

    downloadCanvas(canvas, PNG_PREFIX + (showRomaji ? "" : "-blank") + ".png");
  }

  // Faint diagonal hatch for empty grid slots (yi/ye, wi/wu/we) so the PNG
  // reads as an intentional gap, not a printing error.
  function drawGap(ctx, x, cy, w, h) {
    ctx.save();
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, cy + 8);
    ctx.lineTo(x + w - 8, cy + h - 8);
    ctx.stroke();
    ctx.restore();
  }

  /* --------------------------------------------------------------
     Wiring
     -------------------------------------------------------------- */

  function init() {
    if (!dataset()) return;
    if (el.romaji) {
      state.romaji = el.romaji.checked;
      el.romaji.addEventListener("change", () => { state.romaji = el.romaji.checked; renderChart(); });
    }
    if (el.dakuten) {
      state.dakuten = el.dakuten.checked;
      el.dakuten.addEventListener("change", () => { state.dakuten = el.dakuten.checked; renderChart(); });
    }
    if (el.yoon) {
      state.yoon = el.yoon.checked;
      el.yoon.addEventListener("change", () => { state.yoon = el.yoon.checked; renderChart(); });
    }
    if (el.print) el.print.addEventListener("click", printChart);
    if (el.png) el.png.addEventListener("click", chartPNG);
    renderChart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
