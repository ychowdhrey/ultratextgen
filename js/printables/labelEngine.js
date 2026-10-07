/*
 * labelEngine.js — self-contained controller for the name-label sheet maker
 * (/printables/name-labels/ and its locale siblings).
 *
 * Why a separate engine rather than a printablesEngine.js surface: a label
 * sheet is judged by where the ink lands on the paper, to the millimetre,
 * because it is printed onto pre-cut label stock (Avery 5160 starts its first
 * row 0.5in from the top edge). printablesEngine.js rasterises a DOM clone,
 * scales any unit that overflows its page and reserves a 1.2in credit band,
 * so its output cannot be pinned to a stock's grid. This engine draws each
 * page straight onto a canvas at the exact physical size and hands the
 * canvases to printablePdf.js with a zero margin, so one CSS inch on the
 * canvas is one inch on the paper. Same pattern as monogramEngine.js and
 * crossStitchEngine.js: shared printPrefs.js (paper default, ink saver,
 * recent sheets), shared printablePdf.js, shared header.js credit and
 * printable_output telemetry.
 *
 * Mount points (all optional except #lb-preview):
 *   #lb-what            .pt-choice-row  "What are you labeling?" presets
 *   #lb-name            the name input
 *   #lb-line2 #lb-line3 the detail lines (class, date, subject, ...)
 *   #lb-list            textarea: one label set per line (names or subjects)
 *   #lb-list-target     select: what each list line replaces
 *   #lb-copies          select: labels per list entry
 *   #lb-stock           select: what the sheet is printed on
 *   #lb-size            select: label size (plain/sticker paper only)
 *   #lb-font            .pt-choice-row
 *   #lb-symbol          .pt-choice-row (optional picture)
 *   #lb-border          checkbox
 *   #lb-nudge-x/-y      alignment nudge in mm (label stock only)
 *   #lb-preview         the live preview (a canvas is put in it)
 *   #lb-summary         "30 labels · 1 page · Avery 5160" line
 *   #lb-warn            fit warnings (aria-live)
 *   #lb-pdf #lb-test    Download PDF / alignment test page
 *
 * Nothing typed here ever reaches the dataLayer: the name and the list stay
 * in this tab and, when the visitor asks for it, in this device's
 * localStorage. Telemetry carries only the preset, the stock and the counts.
 */
(function () {
  "use strict";

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  const CFG = window.UTG_LABELS || {};
  const LANG = CFG.lang || (document.documentElement.lang || "en").slice(0, 2);
  const PP = UTG.printPrefs || null;

  const MM = 1 / 25.4; // inches per millimetre
  const INK = "#1a1a2e";
  const CUT = "#9aa3b2";

  /* ---------------- strings ---------------- */

  const I18N = {
    en: {
      labels: "labels", label: "label", page: "page", pages: "pages",
      howMany: "How many", perNameCount: "Labels per name", perLineCount: "Labels per line", fromList: "Filled from your list", tooLong: "Some text is very small on this label size. Try a shorter line or a bigger label.",
      empty: "Type a name to see your labels.",
      testTitle: "Alignment test: print on plain paper, hold it against your label sheet up to the light.",
      cutHint: "Cut along the grey lines",
      stockNote: "Print at 100% (Actual size). Fit to page moves every label.",
      fileName: "name-labels",
      testFile: "label-alignment-test"
    },
    pt: {
      labels: "etiquetas", label: "etiqueta", page: "página", pages: "páginas",
      howMany: "Quantas etiquetas", perNameCount: "Etiquetas por nome", perLineCount: "Etiquetas por linha", fromList: "Preenchido pela lista", tooLong: "Algum texto ficou muito pequeno neste tamanho. Tente uma linha mais curta ou uma etiqueta maior.",
      empty: "Digite um nome para ver as etiquetas.",
      testTitle: "Teste de posição: imprima em papel comum, encoste na folha de etiquetas e olhe contra a luz.",
      cutHint: "Recorte nas linhas cinza",
      stockNote: "Imprima em 100% (tamanho real). Ajustar à página tira todas as etiquetas do lugar.",
      fileName: "etiquetas-escolares",
      testFile: "teste-posicao-etiquetas"
    },
    id: {
      labels: "label", label: "label", page: "halaman", pages: "halaman",
      howMany: "Jumlah label", perNameCount: "Label per nama", perLineCount: "Label per baris", fromList: "Diisi dari daftar", tooLong: "Ada tulisan yang sangat kecil di ukuran label ini. Coba baris yang lebih pendek atau label yang lebih besar.",
      empty: "Ketik nama untuk melihat labelnya.",
      testTitle: "Tes posisi: cetak di kertas biasa, tempelkan ke lembar label dan terawang ke arah cahaya.",
      cutHint: "Gunting di garis abu-abu",
      stockNote: "Cetak 100% (Actual size). Pilihan Fit to page menggeser semua label.",
      fileName: "label-nama",
      testFile: "tes-posisi-label"
    }
  };
  const T = Object.assign({}, I18N.en, I18N[LANG] || {}, CFG.strings || {});

  /* ---------------- sheets ----------------
     Label stock geometry, in inches. Each layout sums to its own sheet:
     side*2 + cols*w + (cols-1)*gapX = sheet width, and top*2 + rows*h +
     (rows-1)*gapY = sheet height (checked in labelEngine.test.js). The
     inkjet and laser versions of one Avery layout share a geometry, so
     each entry names both numbers. */
  const STOCKS = {
    "avery-5160": { name: "Avery 5160 / 8160", paper: "letter", w: 2.625, h: 1, cols: 3, rows: 10, left: 0.1875, top: 0.5, gapX: 0.125, gapY: 0, r: 0.0625 },
    "avery-5167": { name: "Avery 5167 / 8167", paper: "letter", w: 1.75, h: 0.5, cols: 4, rows: 20, left: 0.3, top: 0.5, gapX: 0.3, gapY: 0, r: 0.0625 },
    "avery-5163": { name: "Avery 5163 / 8163", paper: "letter", w: 4, h: 2, cols: 2, rows: 5, left: 0.15625, top: 0.5, gapX: 0.1875, gapY: 0, r: 0.0625 },
    "avery-l7160": { name: "Avery L7160 / J8160", paper: "a4", w: 63.5 * MM, h: 38.1 * MM, cols: 3, rows: 7, left: 7.21 * MM, top: 15.15 * MM, gapX: 2.54 * MM, gapY: 0, r: 2 * MM },
    "avery-l7651": { name: "Avery L7651 / J8651", paper: "a4", w: 38.1 * MM, h: 21.2 * MM, cols: 5, rows: 13, left: 4.67 * MM, top: 10.7 * MM, gapX: 2.54 * MM, gapY: 0, r: 2 * MM },
    "avery-l7163": { name: "Avery L7163 / J8163", paper: "a4", w: 99.1 * MM, h: 38.1 * MM, cols: 2, rows: 7, left: 4.65 * MM, top: 15.15 * MM, gapX: 2.5 * MM, gapY: 0, r: 2 * MM }
  };
  const PAPER = { letter: { w: 8.5, h: 11 }, a4: { w: 210 * MM, h: 297 * MM } };

  /* Label sizes for plain or full-sheet sticker paper, where the visitor cuts
     the labels out. Each is the size of a common label so a sheet printed
     today on plain paper and a label sheet bought later carry the same tile. */
  const SIZES = {
    letter: {
      xs: { w: 1.75, h: 0.5 },          // pencils and crayons (Avery 5167)
      s:  { w: 2.625, h: 1 },           // bottles and supplies (Avery 5160)
      m:  { w: 80 * MM, h: 40 * MM },   // 8 x 4 cm, the Indonesian book label
      l:  { w: 4, h: 2 }                // folders and bins (Avery 5163)
    },
    a4: {
      xs: { w: 1.75, h: 0.5 },          // 44 x 13 mm, four across A4 too
      s:  { w: 63.5 * MM, h: 25.4 * MM },
      m:  { w: 80 * MM, h: 40 * MM },
      l:  { w: 97 * MM, h: 50 * MM }    // two across A4; 4in would fit one
    }
  };
  const SIZE_STOCK = { letter: { xs: "avery-5167", s: "avery-5160", m: "avery-5160", l: "avery-5163" },
                       a4: { xs: "avery-l7651", s: "avery-l7160", m: "avery-l7160", l: "avery-l7163" } };

  /* Fonts the site self-hosts (assets/fonts/manifest.json); each at a weight
     the family ships, never a synthetic bold. */
  const FONTS = {
    rounded: { family: "Fredoka", weight: 600, detail: 500 },
    clear:   { family: "Quicksand", weight: 700, detail: 600 },
    bold:    { family: "Baloo 2", weight: 700, detail: 500 },
    hand:    { family: "Comic Neue", weight: 700, detail: 700 }
  };

  /* Presets: what changes when the visitor says what they are labeling. The
     page's own config supplies the visible words (lines, placeholders); the
     engine owns the size, the copies and the list target. */
  const PRESETS = Object.assign({
    supplies: { size: "xs", line2: "", line3: "", list: "name" },
    books:    { size: "s",  line2: "", line3: "", list: "name" },
    bottles:  { size: "s",  line2: "", line3: "", list: "name" },
    bins:     { size: "l",  line2: "", line3: "", list: "name" },
    camp:     { size: "s",  line2: "", line3: "", list: "name" }
  }, CFG.presets || {});

  /* ---------------- state ---------------- */

  const STORE = "utg_label_sheet";
  const state = {
    preset: CFG.defaultPreset || "supplies",
    font: "rounded",
    symbol: "",
    border: false,
    sheet: "cut",          // "cut" (plain/sticker paper) or a STOCKS key
    size: "xs",
    copies: "fill",        // "fill" or a number per list entry
    listTarget: "name",
    nudgeX: 0, nudgeY: 0,  // mm, label stock only
    nameStyle: "full"
  };

  function $(id) { return document.getElementById(id); }

  function paperKey() {
    if (state.sheet !== "cut") return STOCKS[state.sheet].paper;
    const p = PP && PP.values ? PP.values.paper : (CFG.paper || "letter");
    return p === "a4" ? "a4" : "letter";
  }

  /* ---------------- layout ---------------- */

  /* Cut mode: labels edge to edge, so one straight cut separates two rows.
     0.25in is the margin home inkjets and lasers reach (and what lets three
     2.625in labels sit across Letter, as on an Avery 5160); a band at the
     foot holds the credit line. */
  const CUT_MARGIN = 0.25, CUT_FOOT = 0.3;

  function geometry() {
    const pk = paperKey();
    const paper = PAPER[pk];
    if (state.sheet !== "cut") {
      const s = STOCKS[state.sheet];
      return { paper: paper, w: s.w, h: s.h, cols: s.cols, rows: s.rows, left: s.left, top: s.top,
               gapX: s.gapX, gapY: s.gapY, r: s.r, stock: true, name: s.name };
    }
    const z = SIZES[pk][state.size] || SIZES[pk].s;
    const cols = Math.max(1, Math.floor((paper.w - 2 * CUT_MARGIN + 1e-6) / z.w));
    const rows = Math.max(1, Math.floor((paper.h - 2 * CUT_MARGIN - CUT_FOOT + 1e-6) / z.h));
    const left = (paper.w - cols * z.w) / 2;
    const top = CUT_MARGIN;
    return { paper: paper, w: z.w, h: z.h, cols: cols, rows: rows, left: left, top: top,
             gapX: 0, gapY: 0, r: 0, stock: false, name: "" };
  }

  /* The labels the sheet carries, in order. Each list entry's labels stay
     together so a teacher hands one strip to one child. */
  function readLines() {
    const v = (id) => { const el = $(id); return el ? el.value.replace(/\s+/g, " ").trim() : ""; };
    return { name: v("lb-name"), line2: v("lb-line2"), line3: v("lb-line3") };
  }

  function readList() {
    const el = $("lb-list");
    if (!el) return [];
    return el.value.split(/\r?\n/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 200);
  }

  /* What the label shows of a name. Parents choose: a full name inside a
     bag, initials or a first name on the outside, a surname alone on things
     that pass between siblings. Applied to every name, typed or listed. */
  function styleName(n) {
    const words = String(n || "").split(" ").filter(Boolean);
    if (words.length < 2 || state.nameStyle === "full") return n;
    const initial = (w) => Array.from(w)[0].toLocaleUpperCase();
    switch (state.nameStyle) {
      case "firstInitial": return words[0] + " " + initial(words[words.length - 1]) + ".";
      case "first": return words[0];
      case "surname": return words[words.length - 1];
      case "initials": return words.map((w) => initial(w) + ".").join("");
      default: return n;
    }
  }

  function labelsFor(g) {
    const base = readLines();
    base.name = styleName(base.name);
    const list = readList();
    const per = g.cols * g.rows;
    if (!list.length) {
      if (!base.name && !base.line2 && !base.line3) return [];
      const n = state.copies === "fill" ? per : Math.max(1, Number(state.copies) || 1);
      return new Array(n).fill(base);
    }
    const target = state.listTarget;
    let each;
    if (state.copies === "fill") {
      each = Math.max(1, Math.floor(per / list.length));
    } else {
      each = Math.max(1, Number(state.copies) || 1);
    }
    const out = [];
    list.forEach((item) => {
      const lab = Object.assign({}, base);
      lab[target] = target === "name" ? styleName(item) : item;
      for (let i = 0; i < each; i++) out.push(lab);
    });
    return out;
  }

  /* ---------------- drawing ---------------- */

  function fontSpec(weight, px, family) {
    return weight + " " + px.toFixed(2) + "px '" + family + "', 'Plus Jakarta Sans', system-ui, sans-serif";
  }

  /* A detail line that ends in a colon ("Date:", "Kelas:") is a field to
     fill in by hand, so it gets a rule to write on: the label is printed
     once and the changing part (a bottle's date, a camp cabin) is written
     each time. */
  function isWriteIn(s) { return /[:：]\s*$/.test(s); }

  function drawLabel(ctx, lab, x, y, w, h, ppi, opt) {
    const f = FONTS[state.font] || FONTS.rounded;
    // Clear the border (inset 6% of the short side) plus a margin a printer
    // that is off by a millimetre cannot push the text across.
    const inset = state.border ? Math.min(w, h) * 0.06 : 0;
    const padX = inset + Math.min(w, h) * 0.1 + 0.05 * ppi;
    const padY = inset + Math.min(w, h) * 0.1 + 0.015 * ppi;
    const pad = padX;
    let bx = x + padX, by = y + padY, bw = w - 2 * padX, bh = h - 2 * padY;
    if (bw <= 0 || bh <= 0) return { small: true };
    let small = false;

    // Optional picture on the left, square, for children who cannot read yet.
    if (state.symbol && w / h >= 1.6) {
      const sz = Math.min(bh, bw * 0.3);
      ctx.save();
      ctx.font = (sz * 0.86).toFixed(1) + "px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK;
      ctx.fillText(state.symbol, bx + sz / 2, by + bh / 2 + sz * 0.04);
      ctx.restore();
      bx += sz + pad * 0.6;
      bw -= sz + pad * 0.6;
    }

    const details = [lab.line2, lab.line3].filter(Boolean);
    const name = lab.name;
    const k = details.length;
    // Height shares: the name line is the label; detail lines sit under it.
    const DETAIL = 0.56, LEAD = 1.18;
    ctx.textBaseline = "alphabetic";
    ctx.font = fontSpec(f.weight, 100, f.family);
    const widthOf = (t) => ctx.measureText(t).width / 100;

    /* A long name may read bigger on two lines than squeezed onto one, so
       both are measured and the larger type wins. The break goes at the
       space that balances the two halves; a name with no space stays one
       line, because a word is never hyphenated on a child's label. */
    const options = [];
    if (name) {
      options.push([name]);
      const words = name.split(" ");
      if (words.length > 1) {
        let best = null;
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
          const w = Math.max(widthOf(a), widthOf(b));
          if (!best || w < best.w) best = { w: w, lines: [a, b] };
        }
        options.push(best.lines);
      }
    } else {
      options.push([]);
    }
    let nameLines = options[0], nameSize = 0;
    options.forEach((lines, i) => {
      const units = lines.length + k * DETAIL;
      if (!units) return;
      let size = bh / (units * LEAD);
      lines.forEach((t) => { size = Math.min(size, bw / widthOf(t)); });
      // Prefer one line unless two are clearly bigger.
      if (i === 0 || size > nameSize * 1.15) { nameLines = lines; nameSize = size; }
    });
    const units = nameLines.length + k * DETAIL;
    if (!units) return { small: false };
    let detailSize = (bh / (units * LEAD)) * DETAIL;

    details.forEach((d) => {
      ctx.font = fontSpec(f.detail, 100, f.family);
      const t = isWriteIn(d) ? d + " \u2003\u2003\u2003" : d;
      const wid = ctx.measureText(t).width / 100;
      if (wid * detailSize > bw) detailSize = bw / wid;
    });
    if (nameLines.length && detailSize > nameSize * 0.9) detailSize = nameSize * 0.9;
    // 6pt is the smallest size a label is read at; below it, say so.
    const minPx = 6 / 72 * ppi;
    if ((nameLines.length && nameSize < minPx) || (k && detailSize < minPx * 0.9)) small = true;

    const blockH = nameLines.length * nameSize * LEAD + k * detailSize * LEAD;
    let cy = by + (bh - blockH) / 2;
    const cx = bx + bw / 2;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    nameLines.forEach((t) => {
      ctx.font = fontSpec(f.weight, nameSize, f.family);
      cy += nameSize * LEAD;
      ctx.fillText(t, cx, cy - nameSize * 0.22);
    });
    details.forEach((d) => {
      ctx.font = fontSpec(f.detail, detailSize, f.family);
      cy += detailSize * LEAD;
      const base = cy - detailSize * 0.22;
      if (isWriteIn(d)) {
        // Text at the left of the block, then a rule to the block's edge.
        ctx.textAlign = "left";
        const tw = ctx.measureText(d).width;
        const lineW = Math.min(bw - tw - detailSize * 0.3, bw * 0.75);
        const start = cx - (tw + detailSize * 0.3 + lineW) / 2;
        ctx.fillText(d, start, base);
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1, ppi * 0.008);
        ctx.beginPath();
        ctx.moveTo(start + tw + detailSize * 0.3, base + detailSize * 0.08);
        ctx.lineTo(start + tw + detailSize * 0.3 + lineW, base + detailSize * 0.08);
        ctx.stroke();
        ctx.restore();
        ctx.textAlign = "center";
      } else {
        ctx.fillText(d, cx, base);
      }
    });
    return { small: small };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function siteCredit() {
    if (UTG.printableCredit) return UTG.printableCredit();
    return "ultratextgen.com" + String(location.pathname || "/").replace(/\/$/, "");
  }

  /* One page as a canvas at `ppi` pixels per inch. `test` draws only the
     label outlines and their numbers: the alignment check. */
  function drawPage(g, labels, pageIndex, ppi, opts) {
    const o = opts || {};
    const W = Math.round(g.paper.w * ppi), H = Math.round(g.paper.h * ppi);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (!o.preview && PP && PP.values && PP.values.ink === "saver") ctx.globalAlpha = 0.72;

    const per = g.cols * g.rows;
    const dx = g.stock ? state.nudgeX * MM : 0, dy = g.stock ? state.nudgeY * MM : 0;
    let small = false;

    // On plain paper the cut grid is the whole sheet's guide, drawn first.
    if (!g.stock && !o.test) {
      ctx.save();
      ctx.strokeStyle = CUT;
      ctx.lineWidth = Math.max(1, ppi * 0.006);
      ctx.setLineDash([ppi * 0.05, ppi * 0.04]);
      const x0 = g.left * ppi, y0 = g.top * ppi;
      const x1 = (g.left + g.cols * g.w) * ppi, y1 = (g.top + g.rows * g.h) * ppi;
      const used = Math.min(per, Math.max(0, labels.length - pageIndex * per));
      const rowsUsed = Math.max(1, Math.ceil(used / g.cols));
      for (let r = 0; r <= rowsUsed; r++) {
        const yy = Math.round((g.top + r * g.h) * ppi) + 0.5;
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
      }
      for (let c = 0; c <= g.cols; c++) {
        const xx = Math.round((g.left + c * g.w) * ppi) + 0.5;
        ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, Math.min(y1, (g.top + rowsUsed * g.h) * ppi)); ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < per; i++) {
      const idx = pageIndex * per + i;
      const lab = labels[idx];
      if (!lab && !o.test) break;
      const c = i % g.cols, r = Math.floor(i / g.cols);
      const x = (g.left + c * (g.w + g.gapX) + dx) * ppi;
      const y = (g.top + r * (g.h + g.gapY) + dy) * ppi;
      const w = g.w * ppi, h = g.h * ppi;
      if (o.test || o.showStock) {
        ctx.save();
        ctx.strokeStyle = o.test ? INK : "#cfd6e3";
        ctx.lineWidth = Math.max(1, ppi * (o.test ? 0.01 : 0.006));
        roundRect(ctx, x, y, w, h, g.r * ppi);
        ctx.stroke();
        ctx.restore();
      }
      if (o.test) {
        ctx.save();
        ctx.fillStyle = "#64748b";
        ctx.font = fontSpec(600, Math.min(h * 0.35, ppi * 0.16), "Plus Jakarta Sans");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x + w / 2, y + h / 2);
        ctx.restore();
        continue;
      }
      if (state.border) {
        // Inset so the border survives a printer that is off by a millimetre.
        const ins = Math.min(w, h) * 0.06;
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.globalAlpha *= 0.55;
        ctx.lineWidth = Math.max(1, ppi * 0.012);
        roundRect(ctx, x + ins, y + ins, w - 2 * ins, h - 2 * ins, Math.min(w, h) * 0.18);
        ctx.stroke();
        ctx.restore();
      }
      const res = drawLabel(ctx, lab, x, y, w, h, ppi, o);
      if (res.small) small = true;
    }

    // Credit: low contrast, in the foot margin every one of these sheets has.
    if (!o.preview) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#aeb4c0";
      ctx.font = fontSpec(500, ppi * 0.09, "Plus Jakarta Sans");
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const footY = g.stock ? (g.paper.h - Math.min(0.2, g.top * 0.45)) * ppi : (g.paper.h - CUT_MARGIN + 0.05) * ppi;
      let note = siteCredit();
      if (o.test) note = T.testTitle;
      else if (!g.stock) note = T.cutHint + "  ·  " + note;
      ctx.fillText(note, W / 2, footY);
      ctx.restore();
    }
    canvas.labelSmall = small;
    return canvas;
  }

  function pageCount(g, n) { return Math.max(1, Math.ceil(n / (g.cols * g.rows))); }

  /* ---------------- preview + summary ---------------- */

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; render(); });
  }

  function fmtWH(w, h) {
    if (paperKey() === "a4" || CFG.metric) return Math.round(w / MM) + " × " + Math.round(h / MM) + " mm";
    const fr = (v) => (Math.round(v * 100) / 100).toString();
    return fr(w) + " × " + fr(h) + " in";
  }
  function fmtSize(g) { return fmtWH(g.w, g.h); }

  function render() {
    const g = geometry();
    const labels = labelsFor(g);
    const box = $("lb-preview");
    const sum = $("lb-summary");
    const warn = $("lb-warn");
    if (!box) return;
    const pages = pageCount(g, labels.length);
    if (sum) {
      if (!labels.length) sum.textContent = T.empty;
      else {
        const n = labels.length;
        const where = g.stock ? g.name : (paperKey() === "a4" ? "A4" : "US Letter");
        sum.textContent = n + " " + (n === 1 ? T.label : T.labels) + " · " + fmtSize(g) +
          " · " + pages + " " + (pages === 1 ? T.page : T.pages) + " · " + where;
      }
    }
    // The preview is page 1 at screen resolution: the same drawing code as
    // the PDF, so what is seen is what prints.
    const cw = Math.max(240, Math.min(720, box.clientWidth || 480));
    const ppi = cw / g.paper.w * (window.devicePixelRatio || 1);
    const canvas = drawPage(g, labels, 0, ppi, { preview: true, showStock: g.stock });
    canvas.className = "lb-preview-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", sum ? sum.textContent : "");
    const old = box.querySelector("canvas.lb-preview-canvas");
    if (old) box.replaceChild(canvas, old); else box.appendChild(canvas);
    const placeholder = box.querySelector(".pt-sheet-preview");
    if (placeholder) placeholder.remove();
    if (warn) warn.textContent = canvas.labelSmall ? T.tooLong : "";
    const pdfBtn = $("lb-pdf");
    if (pdfBtn) pdfBtn.disabled = !labels.length;
    // The third line appears once the second is in use (or the preset or
    // the list needs it), so a first-time visitor sees one optional line.
    const row3 = $("lb-line3-row");
    if (row3) {
      const v = readLines();
      const lines = (CFG.presetLines && CFG.presetLines[state.preset]) || {};
      const need = v.line2 || v.line3 || (lines.line3 && lines.line3.value) || state.listTarget === "line3";
      row3.hidden = !need;
    }
    const listed = readList().length > 0;
    const countLab = $("lb-copies-label");
    if (countLab) countLab.textContent = !listed ? T.howMany : (state.listTarget === "name" ? T.perNameCount : T.perLineCount);
    // The field a list fills is read from the list, so typing in it would do
    // nothing: say so on the field itself rather than let it look broken.
    [["lb-name", "name"], ["lb-line2", "line2"], ["lb-line3", "line3"]].forEach((pair) => {
      const el = $(pair[0]);
      if (!el) return;
      const filled = listed && state.listTarget === pair[1];
      el.disabled = filled;
      el.classList.toggle("is-from-list", filled);
      if (filled) el.setAttribute("aria-description", T.fromList); else el.removeAttribute("aria-description");
      if (filled && !el.dataset.ph) { el.dataset.ph = el.placeholder; el.placeholder = T.fromList; }
      if (!filled && el.dataset.ph !== undefined) { el.placeholder = el.dataset.ph; delete el.dataset.ph; }
    });
    persist();
  }

  /* ---------------- PDF ---------------- */

  let pdfPromise = null;
  function loadPdf() {
    if (UTG.pdf) return Promise.resolve(UTG.pdf);
    if (pdfPromise) return pdfPromise;
    pdfPromise = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = "/js/printables/printablePdf.js";
      sc.onload = () => resolve(UTG.pdf);
      sc.onerror = () => { pdfPromise = null; reject(new Error("pdf module failed to load")); };
      document.head.appendChild(sc);
    });
    return pdfPromise;
  }

  function fontsReady() {
    const f = FONTS[state.font] || FONTS.rounded;
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load(f.weight + " 40px '" + f.family + "'"),
      document.fonts.load(f.detail + " 40px '" + f.family + "'"),
      document.fonts.load("500 20px 'Plus Jakarta Sans'")
    ]).catch(() => {});
  }

  function track(action, extra) {
    if (UTG.trackPrintable) UTG.trackPrintable(action, "labels-" + state.preset);
    if (UTG.trackPrintableEvent && extra) UTG.trackPrintableEvent("printable_output", extra);
  }

  function engage(control, value) {
    if (!UTG.trackPrintableEvent) return;
    const key = "lb:" + control + ":" + value;
    if (engage.seen[key]) return;
    engage.seen[key] = true;
    UTG.trackPrintableEvent("printable_engage", { printable_control: control, printable_value: String(value) });
  }
  engage.seen = {};

  function makePdf(test) {
    const btn = test ? $("lb-test") : $("lb-pdf");
    if (btn) btn.setAttribute("aria-busy", "true");
    const g = geometry();
    const labels = test ? [] : labelsFor(g);
    if (!test && !labels.length) return;
    const n = test ? 1 : pageCount(g, labels.length);
    const ppi = 96 * (PP && PP.scale ? PP.scale() : 2);
    return Promise.all([loadPdf(), fontsReady()]).then((res) => {
      const P = res[0];
      if (!P || !P.supported()) throw new Error("pdf unsupported");
      const canvases = [];
      for (let i = 0; i < n; i++) canvases.push(drawPage(g, labels, i, ppi, { test: test }));
      return P.fromCanvases(canvases, {
        paperIn: { w: g.paper.w, h: g.paper.h },
        marginIn: { x: 0, y: 0 },
        title: document.title,
        printScaling: "none"
      }).then((blob) => {
        P.download(blob, (test ? T.testFile : T.fileName) + "-" + (g.stock ? state.sheet : paperKey() + "-" + state.size) + ".pdf");
        if (test) {
          track("download_pdf_test");
        } else {
          track("download_pdf", { printable_action: "pdf_saved", printable_sheet: "labels-" + state.preset, printable_pages: n,
            printable_stock: g.stock ? state.sheet : "cut-" + state.size, printable_count: labels.length,
            printable_list: readList().length ? "list" : "single" });
          remember();
        }
      });
    }).catch(() => {
      // The PDF writer cannot run here (old browser): print the canvases.
      printFallback(g, labels, n, test);
    }).finally(() => { if (btn) btn.removeAttribute("aria-busy"); });
  }

  function printFallback(g, labels, n, test) {
    const root = $("pt-print-root");
    if (!root) return;
    root.innerHTML = "";
    const ppi = 192;
    for (let i = 0; i < n; i++) {
      const c = drawPage(g, labels, i, ppi, { test: test });
      const img = document.createElement("img");
      img.src = c.toDataURL("image/png");
      img.style.width = g.paper.w + "in";
      img.style.height = g.paper.h + "in";
      img.style.display = "block";
      img.style.breakAfter = "page";
      root.appendChild(img);
    }
    const st = document.createElement("style");
    st.textContent = "@page { size: " + g.paper.w + "in " + g.paper.h + "in; margin: 0 } #pt-print-root { padding: 0 !important }";
    root.appendChild(st);
    document.body.classList.add("is-printing");
    if (UTG.hideForPrint) UTG.hideForPrint();
    setTimeout(() => {
      window.print();
      document.body.classList.remove("is-printing");
    }, 60);
    track(test ? "print_test" : "print");
  }

  /* ---------------- memory ----------------
     The form state is kept on this device only, so a teacher who comes back
     next term finds the class list where she left it. Never sent anywhere. */

  function persist() {
    try {
      const keep = $("lb-remember");
      if (keep && !keep.checked) { localStorage.removeItem(STORE); return; }
      const data = Object.assign({}, state, readLines(), { list: ($("lb-list") || {}).value || "" });
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch (e) { /* storage blocked: nothing to keep */ }
  }

  function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { data = null; }
    if (!data || data.preset && !PRESETS[data.preset]) return false;
    ["preset", "font", "symbol", "border", "sheet", "size", "copies", "listTarget", "nameStyle"].forEach((k) => {
      if (data[k] !== undefined) state[k] = data[k];
    });
    if (state.sheet !== "cut" && !STOCKS[state.sheet]) state.sheet = "cut";
    const set = (id, v) => { const el = $(id); if (el && typeof v === "string") el.value = v; };
    set("lb-name", data.name); set("lb-line2", data.line2); set("lb-line3", data.line3); set("lb-list", data.list);
    return true;
  }

  function remember() {
    if (!PP || !PP.rememberRecent) return;
    const page = location.pathname;
    PP.rememberRecent({ href: page, label: (readLines().name || T.labels), page: page, sheet: "labels-" + state.preset });
  }

  /* ---------------- controls ---------------- */

  function setChoice(rowId, value) {
    const row = $(rowId);
    if (!row) return;
    row.querySelectorAll("[data-value]").forEach((b) => {
      const on = b.getAttribute("data-value") === value;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function wireChoices(rowId, onPick) {
    const row = $(rowId);
    if (!row) return;
    row.addEventListener("click", (e) => {
      const b = e.target.closest("[data-value]");
      if (!b || !row.contains(b)) return;
      onPick(b.getAttribute("data-value"));
    });
    // Arrow keys move within a radiogroup, as the role promises.
    row.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) < 0) return;
      const items = Array.from(row.querySelectorAll("[data-value]"));
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
      next.focus();
      onPick(next.getAttribute("data-value"));
    });
  }

  function syncSheetControls() {
    const stockSel = $("lb-stock");
    if (stockSel) stockSel.value = state.sheet === "cut" ? "cut" : state.sheet;
    const sizeSel = $("lb-size");
    if (sizeSel) {
      const pk = paperKey(), names = CFG.sizeNames || {};
      Array.from(sizeSel.options).forEach((opt) => {
        const z = SIZES[pk][opt.value];
        if (z && names[opt.value]) opt.textContent = names[opt.value] + " \u00b7 " + fmtWH(z.w, z.h);
      });
      sizeSel.value = state.size;
    }
    const sizeRow = $("lb-size-row");
    if (sizeRow) sizeRow.hidden = state.sheet !== "cut";
    const nudge = $("lb-nudge-row");
    if (nudge) nudge.hidden = state.sheet === "cut";
    const testBtn = $("lb-test");
    if (testBtn) testBtn.hidden = state.sheet === "cut";
    const note = $("lb-stock-note");
    if (note) note.hidden = state.sheet === "cut";
    const copies = $("lb-copies");
    if (copies) copies.value = String(state.copies);
    const target = $("lb-list-target");
    if (target) target.value = state.listTarget;
    const border = $("lb-border");
    if (border) border.checked = !!state.border;
    const ns = $("lb-name-style");
    if (ns) ns.value = state.nameStyle || "full";
    setChoice("lb-what", state.preset);
    setChoice("lb-font", state.font);
    setChoice("lb-symbol", state.symbol);
  }

  /* A label for each day. Daycares ask for the date on every bottle, rim
     and lid, every day, so parents re-write the same name on tape each
     night. Here the dates become a list (one per day), each day's labels
     print together, and the name is typed once. It reuses the list: the
     dates fill the second line. */
  function fillDates() {
    const start = $("lb-date-start"), daysSel = $("lb-date-days"), perSel = $("lb-date-per"), list = $("lb-list");
    if (!list) return;
    let d = start && start.value ? new Date(start.value + "T12:00:00") : new Date();
    if (isNaN(d.getTime())) d = new Date();
    const spec = (daysSel && daysSel.value) || "5w";
    const n = parseInt(spec, 10) || 1;
    const weekdays = /w$/.test(spec);
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat(CFG.dateLocale || LANG, { weekday: "short", month: "short", day: "numeric" });
    } catch (e) { fmt = null; }
    const out = [];
    while (out.length < n) {
      const day = d.getDay();
      if (!weekdays || (day !== 0 && day !== 6)) out.push(fmt ? fmt.format(d) : d.toDateString());
      d = new Date(d.getTime() + 864e5);
    }
    list.value = out.join("\n");
    list.dataset.auto = "";
    state.listTarget = "line2";
    state.copies = Math.max(1, parseInt((perSel && perSel.value) || "1", 10));
    const det = list.closest("details");
    if (det) det.open = true;
    syncSheetControls();
    engage("dates", spec + "x" + state.copies);
    schedule();
  }

  /* A preset sets the size, the list target and the detail-line placeholders;
     it never overwrites what the visitor already typed in a line. */
  function applyPreset(key, fromUser) {
    const p = PRESETS[key];
    if (!p) return;
    state.preset = key;
    state.size = p.size;
    state.listTarget = p.list || "name";
    if (state.sheet !== "cut") {
      const want = SIZE_STOCK[STOCKS[state.sheet].paper][p.size];
      if (want) state.sheet = want;
    }
    const lines = (CFG.presetLines && CFG.presetLines[key]) || {};
    [["lb-line2", "line2"], ["lb-line3", "line3"]].forEach((pair) => {
      const el = $(pair[0]);
      if (!el) return;
      const spec = lines[pair[1]] || {};
      el.placeholder = spec.placeholder || "";
      if (fromUser && (!el.value || el.dataset.auto === "1")) {
        el.value = spec.value || "";
        el.dataset.auto = spec.value ? "1" : "";
      }
      const lab = document.querySelector("label[for='" + pair[0] + "']");
      if (lab && spec.label) lab.textContent = spec.label;
    });
    // The preset's example list follows the same rule as its example lines:
    // replaced on a preset change unless the visitor has typed in it.
    const listEl = $("lb-list");
    if (listEl && fromUser && (!listEl.value || listEl.dataset.auto === "1")) {
      listEl.value = lines.list || "";
      listEl.dataset.auto = lines.list ? "1" : "";
    }
    const listLab = document.querySelector("label[for='lb-list']");
    if (listLab && lines.listLabel) listLab.textContent = lines.listLabel;
    if (lines.listPlaceholder && $("lb-list")) $("lb-list").placeholder = lines.listPlaceholder;
    const hint = $("lb-what-hint");
    if (hint) hint.textContent = lines.hint || "";
    const dates = $("lb-dates");
    if (dates) dates.hidden = !(lines.dates);
    syncSheetControls();
    if (fromUser) engage("preset", key);
  }

  let restoredOnce = false;
  function init() {
    if (!$("lb-preview")) return;
    if (PP && PP.values) state.sheet = "cut";
    const restored = restore();
    restoredOnce = restored;
    applyPreset(state.preset, false);
    if (!restored) {
      const listEl = $("lb-list");
      if (listEl && listEl.value) listEl.dataset.auto = "1";
      // First visit: fill the default preset's example detail lines.
      const lines = (CFG.presetLines && CFG.presetLines[state.preset]) || {};
      [["lb-line2", "line2"], ["lb-line3", "line3"]].forEach((pair) => {
        const el = $(pair[0]);
        const spec = lines[pair[1]] || {};
        if (el && !el.value && spec.value) { el.value = spec.value; el.dataset.auto = "1"; }
      });
    }
    syncSheetControls();

    wireChoices("lb-what", (v) => { applyPreset(v, true); schedule(); });
    wireChoices("lb-font", (v) => { state.font = v; setChoice("lb-font", v); engage("font", v); fontsReady().then(schedule); schedule(); });
    wireChoices("lb-symbol", (v) => { state.symbol = v; setChoice("lb-symbol", v); engage("symbol", v ? "on" : "off"); schedule(); });

    ["lb-name", "lb-line2", "lb-line3", "lb-list"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => { el.dataset.auto = ""; schedule(); });
    });
    const onSel = (id, fn) => { const el = $(id); if (el) el.addEventListener("change", () => { fn(el); schedule(); }); };
    onSel("lb-stock", (el) => {
      state.sheet = el.value === "cut" ? "cut" : el.value;
      if (state.sheet !== "cut" && PP && PP.values) {
        // Keep the region's paper in step with the stock that was picked.
        PP.values.paper = STOCKS[state.sheet].paper;
        if (PP.save) PP.save();
      }
      syncSheetControls();
      engage("stock", state.sheet);
    });
    onSel("lb-size", (el) => { state.size = el.value; engage("size", el.value); });
    onSel("lb-copies", (el) => { state.copies = el.value === "fill" ? "fill" : Number(el.value); engage("copies", el.value); });
    onSel("lb-list-target", (el) => { state.listTarget = el.value; });
    onSel("lb-paper", (el) => {
      if (PP && PP.values) { PP.values.paper = el.value; if (PP.save) PP.save(); }
      if (state.sheet !== "cut") state.sheet = SIZE_STOCK[el.value][state.size] || state.sheet;
      syncSheetControls();
    });
    const border = $("lb-border");
    if (border) border.addEventListener("change", () => { state.border = border.checked; schedule(); });
    onSel("lb-name-style", (el) => { state.nameStyle = el.value; engage("name_style", el.value); });
    const ds = $("lb-date-start");
    if (ds && !ds.value) {
      const t = new Date();
      ds.value = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    }
    const df = $("lb-date-fill");
    if (df) df.addEventListener("click", fillDates);
    ["lb-nudge-x", "lb-nudge-y"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        const v = Math.max(-5, Math.min(5, Number(el.value) || 0));
        if (id === "lb-nudge-x") state.nudgeX = v; else state.nudgeY = v;
        schedule();
      });
    });
    const keep = $("lb-remember");
    if (keep) {
      try { keep.checked = !!localStorage.getItem(STORE) || keep.checked; } catch (e) { /* no storage */ }
      keep.addEventListener("change", persist);
    }
    const paperSel = $("lb-paper");
    if (paperSel && PP && PP.values) paperSel.value = PP.values.paper === "a4" ? "a4" : "letter";

    const pdf = $("lb-pdf");
    if (pdf) pdf.addEventListener("click", () => makePdf(false));
    const test = $("lb-test");
    if (test) test.addEventListener("click", () => makePdf(true));
    const reset = $("lb-reset");
    if (reset) reset.addEventListener("click", () => {
      try { localStorage.removeItem(STORE); } catch (e) { /* nothing kept */ }
      ["lb-name", "lb-line2", "lb-line3", "lb-list"].forEach((id) => { const el = $(id); if (el) el.value = ""; });
      state.symbol = ""; state.copies = "fill"; state.nudgeX = 0; state.nudgeY = 0; state.nameStyle = "full";
      ["lb-nudge-x", "lb-nudge-y"].forEach((id) => { const el = $(id); if (el) el.value = "0"; });
      applyPreset(CFG.defaultPreset || "supplies", true);
      const nm = $("lb-name"); if (nm) nm.focus();
      schedule();
    });

    let t = 0;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(schedule, 150); });
    fontsReady().then(schedule);
    schedule();

    // The sample name is there to show the output; the first tap selects it
    // so typing replaces it instead of appending to it.
    const sample = $("lb-name");
    if (sample && !restoredOnce) {
      const once = () => { if (sample.value === sample.defaultValue) sample.select(); sample.removeEventListener("focus", once); };
      sample.addEventListener("focus", once);
    }

    // printable_generate: the visitor typed (a count, never the text).
    const nm = $("lb-name");
    if (nm && UTG.trackPrintableEvent) {
      let sent = false;
      nm.addEventListener("input", () => {
        if (sent) return;
        sent = true;
        UTG.trackPrintableEvent("printable_generate", { printable_sheet: "labels" });
      });
    }
  }

  // Exposed for the geometry test and the scenario harness; not a public API.
  UTG.labels = { STOCKS: STOCKS, SIZES: SIZES, PAPER: PAPER, geometry: geometry, labelsFor: labelsFor, state: state, drawPage: drawPage };

  if (document.readyState === "complete") init();
  else window.addEventListener("DOMContentLoaded", init);
})();
