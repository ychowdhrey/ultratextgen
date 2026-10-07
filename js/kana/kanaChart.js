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
 *   #kana-reading-toggle  show / hide the locale reading line (optional)
 *   #kana-sec-dakuten     include the voiced section
 *   #kana-sec-yoon        include the combinations section
 *   #kana-print / #kana-png   export the visible chart
 *   #kana-practice        print a write-in practice sheet (optional)
 * Mounts: #kana-chart (grids), #kana-print-root (print surface), #kana-toast.
 *
 * Locale pages add three optional keys to window.UTG_KANA, all absent on the
 * English pages so their output is unchanged:
 *   text      UI strings (toast, copy label, print titles), see TEXT below
 *   sections  { <section key>: { label, note } } replacing the English labels
 *   readings  a key into window.UltraKanaReadings (js/kana/kanaReadings<Xx>.js):
 *             a second reading line per cell, e.g. Hangul for Korean learners.
 *             Katakana is looked up through its hiragana twin (U+30A1..30F6 is
 *             U+3041..3096 + 0x60), so one table serves both charts.
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
  const ROMAJI_FONT =
    "'Plus Jakarta Sans', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', " +
    "'Noto Sans KR', 'Noto Sans CJK KR', sans-serif";
  const INK = "#1a1a2e";

  // UI strings. English defaults are the strings the English pages always
  // shipped; a locale page overrides any of them through CFG.text.
  const TEXT = Object.assign({
    copied: "Copied {k}",
    copiedWithReading: "Copied {k} ({r})",
    copyLabel: "Copy {k} — {r}",
    blankSuffix: " (blank — fill in the romaji)",
    practiceTitle: NAME + " — writing practice",
    practiceNote: "",
    practiceName: ""
  }, CFG.text || {});
  const SECTION_TEXT = CFG.sections || {};
  const READINGS = CFG.readings
    ? ((window.UltraKanaReadings || {})[CFG.readings] || null)
    : null;

  function fill(tpl, k, r) {
    return String(tpl).replace("{k}", k).replace("{r}", r || "");
  }

  // Reading for one cell from the locale table: { h: text, approx: bool }.
  function toHiragana(str) {
    return String(str).replace(/[\u30A1-\u30F6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }
  function readingOf(kana) {
    if (!READINGS) return null;
    const v = READINGS[toHiragana(kana)];
    if (!v) return null;
    return typeof v === "string" ? { h: v, approx: false } : v;
  }
  function sectionLabel(section) {
    return (SECTION_TEXT[section.key] && SECTION_TEXT[section.key].label) || section.label;
  }
  function sectionNote(section) {
    const o = SECTION_TEXT[section.key];
    return o && Object.prototype.hasOwnProperty.call(o, "note") ? o.note : section.note;
  }

  const el = {
    chart: $("#kana-chart"),
    romaji: $("#kana-romaji-toggle"),
    reading: $("#kana-reading-toggle"),
    practice: $("#kana-practice"),
    dakuten: $("#kana-sec-dakuten"),
    yoon: $("#kana-sec-yoon"),
    print: $("#kana-print"),
    png: $("#kana-png"),
    printRoot: $("#kana-print-root"),
    toast: $("#kana-toast")
  };

  const state = { romaji: true, reading: !!READINGS, dakuten: true, yoon: true };

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
    const done = () => showToast(fill(romaji ? TEXT.copiedWithReading : TEXT.copied, kana, romaji));
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
    const showReading = !!READINGS && o.showReading !== false;
    const wrap = document.createElement("section");
    wrap.className = "kana-section";
    wrap.dataset.section = section.key;

    const head = document.createElement("div");
    head.className = "kana-section-head";
    const h = document.createElement("h2");
    h.className = "kana-section-title";
    h.textContent = sectionLabel(section);
    head.appendChild(h);
    const note = sectionNote(section);
    if (note && o.notes !== false) {
      const p = document.createElement("p");
      p.className = "kana-section-note";
      p.textContent = note;
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
        const rd = readingOf(cell.k);
        if (o.interactive) {
          node.type = "button";
          node.setAttribute("aria-label", fill(TEXT.copyLabel, cell.k, rd ? rd.h + " · " + cell.r : cell.r));
          node.addEventListener("click", () => copyKana(cell.k, rd ? rd.h : cell.r));
        }
        const glyph = document.createElement("span");
        glyph.className = "kana-glyph";
        glyph.lang = "ja";
        glyph.textContent = cell.k;
        node.appendChild(glyph);
        if (READINGS) {
          const rl = document.createElement("span");
          rl.className = "kana-reading" + (rd && rd.approx ? " is-approx" : "");
          rl.textContent = rd ? rd.h : "";
          if (!showReading) rl.classList.add("is-hidden");
          node.appendChild(rl);
        }
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
    el.chart.classList.toggle("kana-no-romaji", !state.romaji && !(READINGS && state.reading));
    el.chart.classList.toggle("kana-has-reading", !!READINGS);
    el.chart.innerHTML = "";
    visibleSections().forEach((section) => {
      el.chart.appendChild(buildSection(section, { interactive: true, showRomaji: state.romaji, showReading: state.reading }));
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
    const anyReading = state.romaji || (READINGS && state.reading);
    title.textContent = NAME + (anyReading ? "" : TEXT.blankSuffix);
    wrap.appendChild(title);
    visibleSections().forEach((section) => {
      wrap.appendChild(buildSection(section, { interactive: false, showRomaji: state.romaji, showReading: state.reading }));
    });
    const cred = document.createElement("p");
    cred.className = "kana-print-cred";
    cred.textContent = URL_LINE;
    wrap.appendChild(cred);
    el.printRoot.appendChild(wrap);
    sendToPrinter();
  }

  function sendToPrinter() {
    document.body.classList.add("is-printing");
    // Hide the page inline as well: the stylesheet rule cannot beat an
    // inline !important (an ad anchor unit), so without this the printed
    // sheet carries the page's ads. Shared with printablesEngine.js.
    if (window.UltraTextGen && window.UltraTextGen.hideForPrint) window.UltraTextGen.hideForPrint(document.getElementById("kana-print-root"));
    window.print();
    document.body.classList.remove("is-printing");
    if (window.UltraTextGen && window.UltraTextGen.restorePrint) window.UltraTextGen.restorePrint();
    el.printRoot.innerHTML = "";
  }

  /* --------------------------------------------------------------
     Writing practice sheet (print). One row per single kana: the model
     glyph with its readings, then empty squares carrying a dashed cross
     guide. No faint tracing glyphs: the system font is a printed (gothic)
     form, not a handwriting model, so it is shown once as a reference and
     the squares are left for the learner's own hand. Combinations (yōon)
     are two shapes already practised, so the sheet covers single kana from
     the visible sections only.
     -------------------------------------------------------------- */

  const PRACTICE_BOXES = 5;

  function printPractice() {
    if (!el.printRoot) return;
    el.printRoot.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "kana-print-wrap kana-practice-wrap";
    const title = document.createElement("h1");
    title.className = "kana-print-title";
    title.textContent = TEXT.practiceTitle;
    wrap.appendChild(title);
    if (TEXT.practiceName) {
      const nm = document.createElement("p");
      nm.className = "kana-practice-name";
      nm.textContent = TEXT.practiceName;
      wrap.appendChild(nm);
    }
    if (TEXT.practiceNote) {
      const p = document.createElement("p");
      p.className = "kana-practice-note";
      p.textContent = TEXT.practiceNote;
      wrap.appendChild(p);
    }
    visibleSections().filter((s) => s.key !== "yoon").forEach((section) => {
      const sec = document.createElement("section");
      sec.className = "kana-practice-section";
      const h = document.createElement("h2");
      h.className = "kana-section-title";
      h.textContent = sectionLabel(section);
      sec.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "kana-practice-grid";
      section.rows.forEach((row) => {
        row.cells.forEach((cell) => {
          if (!cell) return;
          const line = document.createElement("div");
          line.className = "kana-practice-row";
          const model = document.createElement("div");
          model.className = "kana-practice-model";
          const g = document.createElement("span");
          g.className = "kana-glyph";
          g.lang = "ja";
          g.textContent = cell.k;
          model.appendChild(g);
          const rd = readingOf(cell.k);
          const cap = document.createElement("span");
          cap.className = "kana-practice-cap";
          cap.textContent = rd ? rd.h + " · " + cell.r : cell.r;
          model.appendChild(cap);
          line.appendChild(model);
          for (let i = 0; i < PRACTICE_BOXES; i++) {
            const box = document.createElement("div");
            box.className = "kana-practice-box";
            line.appendChild(box);
          }
          grid.appendChild(line);
        });
      });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
    const cred = document.createElement("p");
    cred.className = "kana-print-cred";
    cred.textContent = URL_LINE;
    wrap.appendChild(cred);
    el.printRoot.appendChild(wrap);
    sendToPrinter();
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
    const showReading = !!READINGS && state.reading;
    const scale = 2;
    const MARGIN = 48;
    const CELL_W = 132;
    const lines = (showRomaji ? 1 : 0) + (showReading ? 1 : 0);
    const CELL_H = lines === 2 ? 156 : lines === 1 ? 132 : 112;
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
      ctx.fillText(sectionLabel(section), MARGIN, y + 30);
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
          ctx.font = "500 " + (lines ? 52 : 60) + "px " + KANA_FONT;
          ctx.textBaseline = "middle";
          ctx.fillText(cell.k, x + CELL_W / 2, cy + (lines === 2 ? 52 : lines ? CELL_H * 0.42 : CELL_H * 0.5));
          let ly = lines === 2 ? 108 : CELL_H * 0.82;
          if (showReading) {
            const rd = readingOf(cell.k);
            ctx.fillStyle = INK;
            ctx.font = "700 22px " + ROMAJI_FONT;
            ctx.fillText(rd ? rd.h : "", x + CELL_W / 2, cy + ly);
            ly += 28;
          }
          if (showRomaji) {
            ctx.fillStyle = "#64748b";
            ctx.font = "600 20px " + ROMAJI_FONT;
            ctx.fillText(cell.r, x + CELL_W / 2, cy + ly);
          }
        });
      });
      y += section.rows.length * CELL_H + SECTION_GAP;
    });

    downloadCanvas(canvas, PNG_PREFIX + (lines ? "" : "-blank") + ".png");
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
    if (el.reading) {
      state.reading = !!READINGS && el.reading.checked;
      el.reading.addEventListener("change", () => { state.reading = el.reading.checked; renderChart(); });
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
    if (el.practice) el.practice.addEventListener("click", printPractice);
    renderChart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
