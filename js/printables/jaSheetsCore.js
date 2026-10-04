/*
 * jaSheetsCore.js — the Japanese worksheet geometry, as pure functions.
 *
 * Every sheet the /ja/purinto/ pages print is built here as an SVG string whose
 * user unit is ONE MILLIMETRE. That is the whole point of the module: a 20mm
 * masu is 20mm on the paper, and a 12mm four-line band is 12mm, whatever the
 * screen did. The page module (jaSheets.js) only chooses options, previews and
 * exports; it never draws.
 *
 * No DOM. Loads in the browser (window.UTG_JA_SHEETS_CORE) and in Node
 * (module.exports) so js/printables/jaSheets.test.js can assert the geometry.
 *
 * Six primitives, each page is a configuration of them:
 *   masu      square-cell grid (kana, kanji, kana/kanji names), 縦書き or 横書き,
 *             with 十字リーダー; model → なぞり → 書く progression per line
 *   fourLine  the Japanese English 4-line ruling (alphabet, romaji, Latin names,
 *             blank 英語4線 paper); letters are drawn from stroke skeletons so
 *             capitals, x-height and descenders land on the right lines
 *   unpitsu   pre-writing pencil paths (運筆): guide lines and roads
 *   nurie     hollow, colourable kana built from the textbook face itself
 *   header    title + なまえ line;  credit  page URL as text and QR
 */
(function (root) {
  "use strict";

  const FONT = "'Klee One', 'Hiragino Mincho ProN', 'Yu Mincho', serif";
  const FONT_WEIGHT = 600;
  // Klee One's ideographic em box runs from -0.120em to +0.880em around the
  // alphabetic baseline (BASE table 'ideo' = -120, 1000 upm). A glyph centred
  // in a cell therefore sits with its baseline 0.38em below the cell centre.
  const EM_CENTRE = 0.38;
  const PAPER_MM = { a4: [210, 297], letter: [215.9, 279.4], legal: [215.9, 355.6] };
  const MARGIN_MM = { normal: 12.7, narrow: 6.35 };
  // The credit QR is 0.95in because a smaller one does not decode (the
  // printables rule). Its band is the QR plus a little air.
  const QR_MM = 24.13;
  const CREDIT_MM = 27;
  const HEADER_MM = 15;

  const INK = "#1a1a1a";
  const RULE = "#4d4d4d";
  const GUIDE = "#9a9a9a";
  const TRACE = ["#a3a3a3", "#b8b8b8", "#cbcbcb", "#dadada"];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function n(x) { return Math.round(x * 100) / 100; }

  /* The printable area in mm. landscape turns the sheet: native kana and
     kanji practice sheets (ちびむす, ぷりんときっず, すきるま, measured
     2026-10-04) are 縦書き columns on A4 turned sideways. */
  function area(paper, margin, orient) {
    const base = PAPER_MM[paper] || PAPER_MM.a4;
    const p = orient === "landscape" ? [base[1], base[0]] : base;
    const m = MARGIN_MM[margin] != null ? MARGIN_MM[margin] : MARGIN_MM.normal;
    return { w: n(p[0] - 2 * m), h: n(p[1] - 2 * m), paper: p, margin: m, orient: orient === "landscape" ? "landscape" : "portrait" };
  }

  /* ---- page frame: header, body box, credit ---------------------------- */

  function frame(a, o) {
    const top = o.header === false ? 0 : HEADER_MM;
    return { x: 0, y: top, w: a.w, h: a.h - top - CREDIT_MM };
  }

  function header(a, o) {
    if (o.header === false) return "";
    const t = esc(o.title || "");
    let s = '<text x="0" y="9.5" font-size="7" font-family="' + FONT + '" font-weight="' + FONT_WEIGHT + '" fill="' + INK + '">' + t + "</text>";
    if (o.nameLine !== false) {
      // 「なまえ」 and a writing line, the way Japanese school sheets head a page.
      const x0 = a.w - 78;
      s += '<text x="' + n(x0) + '" y="10" font-size="4.6" font-family="' + FONT + '" font-weight="' + FONT_WEIGHT + '" fill="' + INK + '">なまえ</text>' +
        '<line x1="' + n(x0 + 17) + '" y1="11.5" x2="' + n(a.w) + '" y2="11.5" stroke="' + RULE + '" stroke-width="0.35"/>';
    }
    return s + '<line x1="0" y1="' + (HEADER_MM - 1.5) + '" x2="' + n(a.w) + '" y2="' + (HEADER_MM - 1.5) + '" stroke="#d0d0d0" stroke-width="0.25"/>';
  }

  // env.creditText: "ultratextgen.com/ja/purinto/…"; env.qrSvg(url, mm): inner
  // markup of a QR in a 0..mm box, from js/printables/qr.js (the one encoder).
  function credit(a, env) {
    if (!env || !env.creditText) return "";
    const y = a.h - CREDIT_MM;
    let s = '<line x1="0" y1="' + n(y + 1) + '" x2="' + n(a.w) + '" y2="' + n(y + 1) + '" stroke="#d0d0d0" stroke-width="0.25"/>';
    const qr = env.qrSvg ? env.qrSvg("https://" + env.creditText + "/", QR_MM) : "";
    if (qr) s += '<g transform="translate(' + n(a.w - QR_MM) + " " + n(y + 2.5) + ')">' + qr + "</g>";
    s += '<text x="' + n(qr ? a.w - QR_MM - 3 : a.w) + '" y="' + n(y + 2.5 + QR_MM / 2 + 1.2) + '" font-size="3.4" text-anchor="end" font-family="' + FONT +
      '" font-weight="' + FONT_WEIGHT + '" fill="#555">' + esc(env.creditText) + "</text>";
    return s;
  }
  // Where the credit's link sits, as fractions of the sheet, for the PDF link.
  function creditRect(a) {
    const y = a.h - CREDIT_MM + 2.5;
    return { x: (a.w - QR_MM - 75) / a.w, y: y / a.h, w: (QR_MM + 75) / a.w, h: QR_MM / a.h };
  }

  function svgDoc(a, body, label) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n(a.w) + " " + n(a.h) + '" width="' + n(a.w) + 'mm" height="' + n(a.h) +
      'mm" role="img" aria-label="' + esc(label || "") + '"><rect width="100%" height="100%" fill="#fff"/>' + body + "</svg>";
  }

  /* ---- a glyph in a square ---------------------------------------------- */

  function glyph(ch, cx, cy, size, fill, vertical, data) {
    const fs = size;
    const base = cy + EM_CENTRE * fs;
    let tr = "";
    if (vertical && data) {
      const shift = data.VERT_SHIFT[ch];
      if (shift) tr = ' transform="translate(' + n(shift[0] * fs) + " " + n(-shift[1] * fs) + ')"';
      else if (data.VERT_ROTATE.indexOf(ch) >= 0) tr = ' transform="rotate(90 ' + n(cx) + " " + n(cy) + ')"';
    }
    return '<text x="' + n(cx) + '" y="' + n(base) + '" font-size="' + n(fs) + '" text-anchor="middle" font-family="' + FONT +
      '" font-weight="' + FONT_WEIGHT + '" fill="' + fill + '"' + tr + ">" + esc(ch) + "</text>";
  }

  /* ---- masu ------------------------------------------------------------- */

  /* How many lines fit and how many cells each holds, for a cell size in mm.
     縦書き: a line is a column, filled right to left. 横書き: a row. */
  function masuCapacity(a, o) {
    const f = frame(a, o);
    const s = o.cell;
    const across = Math.floor((f.w + 0.01) / s), down = Math.floor((f.h + 0.01) / s);
    return o.vertical ? { lines: across, perLine: down, f: f } : { lines: down, perLine: across, f: f };
  }

  /* lines: [[{ch, kind:"model"|"trace"|"blank", step}]]; renders one page. */
  function masuPage(a, o, lines, data) {
    const cap = masuCapacity(a, o);
    const s = o.cell, f = cap.f;
    const gridW = (o.vertical ? cap.lines : cap.perLine) * s;
    const gridH = (o.vertical ? cap.perLine : cap.lines) * s;
    const x0 = f.x + (f.w - gridW) / 2, y0 = f.y + (f.h - gridH) / 2;
    let g = "";
    const size = s * (o.glyphScale || 0.8);
    for (let li = 0; li < cap.lines; li++) {
      const line = lines[li] || [];
      for (let ci = 0; ci < cap.perLine; ci++) {
        const cx = o.vertical ? x0 + gridW - (li + 0.5) * s : x0 + (ci + 0.5) * s;
        const cy = o.vertical ? y0 + (ci + 0.5) * s : y0 + (li + 0.5) * s;
        const c = line[ci];
        if (c && c.ch && c.kind !== "blank") {
          const fill = c.kind === "model" ? INK : TRACE[Math.min(TRACE.length - 1, c.step || 0)];
          g += glyph(c.ch, cx, cy, size, fill, o.vertical, data);
        }
      }
    }
    // Ruling drawn over the glyphs' bounding boxes but under nothing: cells,
    // then the dotted cross (十字リーダー) the child centres each stroke on.
    let r = "";
    if (o.cross !== false) {
      const d = [];
      const cols = gridW / s, rows = gridH / s;
      for (let i = 0; i < cols; i++) d.push("M" + n(x0 + (i + 0.5) * s) + " " + n(y0) + "V" + n(y0 + gridH));
      for (let j = 0; j < rows; j++) d.push("M" + n(x0) + " " + n(y0 + (j + 0.5) * s) + "H" + n(x0 + gridW));
      r += '<path d="' + d.join("") + '" stroke="' + GUIDE + '" stroke-width="0.25" stroke-dasharray="0.8 0.8" fill="none"/>';
    }
    const cd = [];
    for (let i = 1; i < gridW / s; i++) cd.push("M" + n(x0 + i * s) + " " + n(y0) + "V" + n(y0 + gridH));
    for (let j = 1; j < gridH / s; j++) cd.push("M" + n(x0) + " " + n(y0 + j * s) + "H" + n(x0 + gridW));
    r += '<path d="' + cd.join("") + '" stroke="' + RULE + '" stroke-width="0.3" fill="none"/>';
    r += '<rect x="' + n(x0) + '" y="' + n(y0) + '" width="' + n(gridW) + '" height="' + n(gridH) + '" fill="none" stroke="' + RULE + '" stroke-width="0.6"/>';
    // Separate each practice line with a slightly heavier rule so a column (or
    // row) reads as one character's line.
    if (o.lineRules !== false) {
      const ld = [];
      for (let li = 1; li < cap.lines; li++) {
        if (o.vertical) ld.push("M" + n(x0 + li * s) + " " + n(y0) + "V" + n(y0 + gridH));
        else ld.push("M" + n(x0) + " " + n(y0 + li * s) + "H" + n(x0 + gridW));
      }
      if (ld.length) r += '<path d="' + ld.join("") + '" stroke="' + RULE + '" stroke-width="0.45" fill="none"/>';
    }
    return { svg: g + r, grid: { x: x0, y: y0, w: gridW, h: gridH, cell: s, lines: cap.lines, perLine: cap.perLine } };
  }

  /* One practice line for one character: the model, then なぞり, then blank
     cells, by the chosen ladder. fade: each なぞり a step lighter. */
  function practiceLine(ch, perLine, mode, fade) {
    const traces = mode === "mite" ? 0 : mode === "nazori-kaki" ? Math.min(2, perLine - 1) : perLine - 1;
    const out = [{ ch: ch, kind: "model" }];
    for (let i = 0; i < traces; i++) out.push({ ch: ch, kind: "trace", step: fade ? Math.min(3, Math.floor(i * 4 / Math.max(1, traces))) : 0 });
    while (out.length < perLine) out.push({ ch: ch, kind: "blank" });
    return out.slice(0, perLine);
  }

  function paginate(lines, perPage) {
    const pages = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    return pages.length ? pages : [[]];
  }

  /* Character practice (hiragana, katakana, kanji): one line per character. */
  function buildCharSheets(a, o, chars, data, env) {
    const cap = masuCapacity(a, o);
    if (cap.lines < 1 || cap.perLine < 2) return [];
    const lines = [];
    chars.forEach((c) => {
      const g = data.graphemes(c);
      // A combination such as きゃ or ファ is written in two cells, the small
      // kana in its own cell exactly as on 原稿用紙, so it practises as one line
      // of pairs: model pair, then なぞり pairs, then blank pairs.
      if (g.length > 1) {
        const pairs = Math.floor(cap.perLine / g.length);
        const one = practiceLine("x", pairs, o.mode, o.fade);
        const line = [];
        one.forEach((cell) => g.forEach((gc) => line.push({ ch: gc, kind: cell.kind, step: cell.step })));
        while (line.length < cap.perLine) line.push({ ch: "", kind: "blank" });
        lines.push(line);
      } else lines.push(practiceLine(c, cap.perLine, o.mode, o.fade));
    });
    return paginate(lines, cap.lines).map((pg) => {
      const m = masuPage(a, o, pg, data);
      return svgDoc(a, header(a, o) + m.svg + credit(a, env), o.title);
    });
  }

  /* A name in masu: whole columns (or rows) of the name, first as the model,
     then as なぞり, then empty for writing it unaided. A name longer than a
     line continues on the next line, never squeezed. */
  function buildNameMasu(a, o, name, data, env) {
    const cap = masuCapacity(a, o);
    const g = data.graphemes(name).filter((c) => c !== " " && c !== "　");
    if (!g.length || cap.perLine < 1) return [];
    const kinds = [];
    const traceLines = o.mode === "mite" ? 0 : o.mode === "nazori-kaki" ? 2 : Math.max(1, Math.ceil((cap.lines - 1) * 0.6));
    const modelLines = 1;
    // Lines needed for one copy of the name.
    const per = Math.ceil(g.length / cap.perLine);
    const unitsPerPage = Math.max(1, Math.floor(cap.lines / per));
    for (let u = 0; u < unitsPerPage; u++) kinds.push(u < modelLines ? "model" : u < modelLines + traceLines ? "trace" : "blank");
    const lines = [];
    kinds.forEach((kind, u) => {
      // Within one line, repeat the name with an empty cell between copies.
      const seq = [];
      if (per === 1) {
        while (seq.length + g.length <= cap.perLine) {
          g.forEach((c) => seq.push({ ch: c, kind: kind, step: o.fade ? Math.min(3, u - modelLines) : 0 }));
          if (seq.length < cap.perLine) seq.push({ ch: "", kind: "blank" });
        }
        while (seq.length < cap.perLine) seq.push({ ch: "", kind: "blank" });
        lines.push(seq);
      } else {
        for (let k = 0; k < per; k++) {
          const part = g.slice(k * cap.perLine, (k + 1) * cap.perLine).map((c) => ({ ch: c, kind: kind, step: 0 }));
          while (part.length < cap.perLine) part.push({ ch: "", kind: "blank" });
          lines.push(part);
        }
      }
    });
    const m = masuPage(a, o, lines, data);
    return [svgDoc(a, header(a, o) + m.svg + credit(a, env), o.title)];
  }

  /* ---- four-line English ruling ------------------------------------------ */

  /* The ruling Japanese schools use for English: four lines, the THIRD from
     the top (second from the bottom) is the baseline, printed thicker and in
     colour. Two forms are in use (research 2026-10-04): exercise books and
     free sheets space the lines EQUALLY with a red baseline (Kokuyo 英習罫
     8段 = 5mm spacing; the sheets compared measure the same), while MEXT's
     Let's Try!/We Can! and the 2020 textbooks widen the middle band and print
     the baseline blue. bands is [upper, middle, lower]. Capitals and ascenders
     reach line 1, the x-height fills the middle band, descenders reach line 4. */
  function ruling(o) {
    const b = o.bands || [5, 6, 5];
    const t = b[0] + b[1] + b[2];
    return { l2: b[0] / t, l3: (b[0] + b[1]) / t };
  }

  function fourLineRule(x0, x1, y, h, o) {
    const r = ruling(o);
    const ys = [y, y + h * r.l2, y + h * r.l3, y + h];
    let s = "";
    if (o.shadeMiddle) s += '<rect x="' + n(x0) + '" y="' + n(ys[1]) + '" width="' + n(x1 - x0) + '" height="' + n(ys[2] - ys[1]) + '" fill="#eef4fb"/>';
    ys.forEach((yy, i) => {
      const red = i === 2 && o.redBase !== false;
      const base = o.baseColor || "#d1302f";
      const dash = (i === 1 && o.dashMiddle) ? ' stroke-dasharray="1.2 0.9"' : "";
      s += '<line x1="' + n(x0) + '" y1="' + n(yy) + '" x2="' + n(x1) + '" y2="' + n(yy) + '" stroke="' + (red ? base : "#6b6b6b") +
        '" stroke-width="' + (red ? 0.4 : 0.25) + '"' + dash + "/>";
    });
    return s;
  }

  /* Map the shared stroke skeletons (js/printables/strokeDirectionData.js,
     authored in a 200x240 box: cap top 55, x-height 88, baseline 198,
     descender 237) onto one four-line row. Vertical mapping is piecewise
     linear per band so each landmark lands ON its line; horizontal scale is
     per letter case so a lowercase bowl stays round in a 6/16 middle band. */
  const SRC = { cap: 55, x: 88, base: 198, desc: 237 };
  function mapper(y, h, o, isLower) {
    const r = ruling(o);
    const L2 = y + h * r.l2, L3 = y + h * r.l3, L4 = y + h;
    const fy = (v) => {
      if (v <= SRC.cap) return y;
      if (v <= SRC.x) return y + (v - SRC.cap) / (SRC.x - SRC.cap) * (L2 - y);
      if (v <= SRC.base) return L2 + (v - SRC.x) / (SRC.base - SRC.x) * (L3 - L2);
      return L3 + Math.min(1, (v - SRC.base) / (SRC.desc - SRC.base)) * (L4 - L3);
    };
    const sx = isLower ? (L3 - L2) / (SRC.base - SRC.x) : (L3 - y) / (SRC.base - SRC.cap);
    return { fy: fy, sx: sx };
  }

  /* Where Japanese four-line teaching places a letter differently from the US
     manuscript skeletons: the crossbars of t and f sit ON the second line, and
     t stops partway up the top band rather than reaching line 1 like b, d, h,
     k and l. (Japanese 4-line exercise books and the alphabet sheets compared
     for this page agree on both.) Same 200x240 source box. */
  const JA_OVERRIDES = {
    t: { strokes: ["M80,70 L80,176 C80,190 90,198 104,196", "M52,88 L112,88"] },
    f: { strokes: ["M124,60 C112,50 88,52 88,80 L88,198", "M60,88 L118,88"] }
  };
  function skelFor(skel, ch) { return JA_OVERRIDES[ch] || (skel && skel[ch]); }

  function pathBounds(strokes) {
    let lo = Infinity, hi = -Infinity;
    strokes.forEach((d) => {
      const nums = d.match(/-?\d+(\.\d+)?/g) || [];
      for (let i = 0; i < nums.length; i += 2) { const v = +nums[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    });
    return { lo: lo, hi: hi };
  }

  function mapPath(d, x0, srcLo, m) {
    return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (all, xs, ys) =>
      n(x0 + (+xs - srcLo) * m.sx) + "," + n(m.fy(+ys)));
  }

  /* Lay a string out on one four-line row; returns {svg, width}. Letters with
     no skeleton (accented letters, punctuation) are set in the face, sized so
     a capital spans line 1 to the baseline. */
  function latinRow(text, x, y, h, o, skel, style) {
    const r = ruling(o);
    let s = "", cx = x;
    const sw = Math.max(0.35, h * (style.weight || 0.055));
    const gap = h * 0.2;
    Array.from(text).forEach((ch) => {
      if (ch === " ") { cx += h * 0.45; return; }
      const e = skelFor(skel, ch);
      if (e) {
        const lower = ch >= "a" && ch <= "z";
        const m = mapper(y, h, o, lower);
        const b = pathBounds(e.strokes);
        const w = (b.hi - b.lo) * m.sx;
        const dash = style.dotted ? ' stroke-dasharray="0.01 ' + n(sw * 1.9) + '"' : "";
        e.strokes.forEach((d) => {
          s += '<path d="' + mapPath(d, cx, b.lo, m) + '" fill="none" stroke="' + style.color + '" stroke-width="' + n(sw) +
            '" stroke-linecap="round" stroke-linejoin="round"' + dash + "/>";
        });
        // i and j carry their dot as a short stroke in the skeleton already.
        cx += Math.max(w, h * 0.08) + gap;
      } else {
        const capH = h * r.l3;
        const fs = capH / 0.695;          // Klee One cap height 695/1000
        s += '<text x="' + n(cx) + '" y="' + n(y + h * r.l3) + '" font-size="' + n(fs) + '" font-family="' + FONT + '" font-weight="' + FONT_WEIGHT +
          '" fill="' + style.color + '">' + esc(ch) + "</text>";
        cx += fs * 0.62 + gap * 0.4;
      }
    });
    return { svg: s, width: cx - x };
  }

  function latinWidth(text, h, o, skel) { return latinRow(text, 0, 0, h, o, skel, { color: "#000" }).width; }

  /* A page of four-line rows. rows: [{text, kind:"model"|"trace"|"blank",
     label?}] — label is a kana prompt printed in a box at the row's left (the
     romaji sheet). Row height and gap are millimetres. */
  function fourLinePage(a, o, rows, skel) {
    const f = frame(a, o);
    const h = o.rowH, gap = o.rowGap;
    const labelW = o.labelW || 0;
    let s = "", y = f.y + 2;
    rows.forEach((row) => {
      const x0 = f.x + labelW, x1 = f.x + f.w;
      if (labelW && row.label) {
        s += '<rect x="' + n(f.x) + '" y="' + n(y) + '" width="' + n(labelW - 3) + '" height="' + n(h) + '" fill="none" stroke="#bdbdbd" stroke-width="0.3" rx="1"/>';
        const lfs = Math.min(h * 0.62, (labelW - 5) / Math.max(1, Array.from(row.label).length));
        s += '<text x="' + n(f.x + (labelW - 3) / 2) + '" y="' + n(y + h / 2 + EM_CENTRE * lfs) + '" font-size="' + n(lfs) +
          '" text-anchor="middle" font-family="' + FONT + '" font-weight="' + FONT_WEIGHT + '" fill="' + INK + '">' + esc(row.label) + "</text>";
      }
      s += fourLineRule(x0, x1, y, h, o);
      if (row.text && row.kind !== "blank") {
        const style = row.kind === "model" ? { color: INK } : { color: TRACE[Math.min(3, row.step || 0)], dotted: o.dotted };
        const pad = h * 0.25;
        let cx = x0 + pad;
        const unit = row.repeat ? row.text : null;
        if (unit) {
          // modelFirst: the first copy is the model, then up to `traces`
          // copies to trace, and the rest of the line is left to write.
          const uw = latinWidth(unit, h, o, skel);
          const traces = row.traces == null ? Infinity : row.traces;
          let k = 0;
          while (cx + uw <= x1 - pad) {
            let st = style;
            if (row.modelFirst) {
              if (k === 0) st = { color: INK };
              else if (k > traces) break;
              else st = { color: TRACE[o.fade ? Math.min(3, k - 1) : 0], dotted: o.dotted };
            }
            s += latinRow(unit, cx, y, h, o, skel, st).svg;
            cx += uw + h * 0.9;
            k++;
          }
        } else s += latinRow(row.text, cx, y, h, o, skel, style).svg;
      }
      y += h + gap;
    });
    return s;
  }

  function fourLineCapacity(a, o) {
    const f = frame(a, o);
    return Math.max(1, Math.floor((f.h - 2 + o.rowGap) / (o.rowH + o.rowGap)));
  }

  /* ---- unpitsu (運筆) ---------------------------------------------------- */

  /* Each pattern is a function of t in [0,1] returning a point in a lane box
     (x across the lane, y from -1..1 of its half-height). Sampled, then drawn
     either as the guide line itself (なぞる) or as the two edges of a road the
     child keeps the pencil inside (道). */
  const PATTERNS = {
    yoko: (t) => [t, 0],
    nami: (t) => [t, Math.sin(t * Math.PI * 2 * 3) * 0.75],
    yama: (t) => { const k = t * 8, f = k - Math.floor(k); return [t, (Math.floor(k) % 2 ? 1 - 2 * f : -1 + 2 * f) * 0.8]; },
    kurukuru: (t) => { const u = t * Math.PI * 2 * 5; return [(u - 1.9 * Math.sin(u)) / (Math.PI * 2 * 5 + 0.0001) * 0.86 + 0.07, -Math.cos(u) * 0.8]; },
    kunekune: (t) => [t, Math.sin(t * Math.PI * 2 * 1.3) * 0.55 + Math.sin(t * Math.PI * 2 * 3.1 + 1) * 0.25]
  };
  // The square wave is clearer as explicit corners than as a function.
  function kakuPoints() {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const y = i % 2 ? -0.75 : 0.75;
      pts.push([i / 6, y], [(i + 1) / 6, y]);
    }
    return pts;
  }
  function sample(kind, steps) {
    if (kind === "kaku") return kakuPoints();
    const f = PATTERNS[kind] || PATTERNS.yoko;
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push(f(i / steps));
    return pts;
  }
  function polyD(pts) { return pts.map((p, i) => (i ? "L" : "M") + n(p[0]) + " " + n(p[1])).join(""); }
  function offset(pts, d) {
    // Offset a polyline by d along each vertex's averaged normal.
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      return [p[0] - dy * d, p[1] + dx * d];
    });
  }

  /* Small start/goal pictures, drawn in a 0..10 box. Simple outlines a child
     recognises, coloured in by them if they like. */
  const ICONS = {
    ichigo: '<path d="M5 2.4c2.8 0 4.2 1.8 3.6 4.1C8 8.6 6.4 9.8 5 9.8S2 8.6 1.4 6.5C.8 4.2 2.2 2.4 5 2.4z" fill="#fff" stroke="#222" stroke-width=".45"/><path d="M3.2 2.6L5 1.2l1.8 1.4" fill="none" stroke="#222" stroke-width=".45"/><circle cx="3.6" cy="5" r=".25"/><circle cx="6.2" cy="5.4" r=".25"/><circle cx="4.8" cy="7.2" r=".25"/>',
    hoshi: '<path d="M5 .8l1.25 2.9 3.1.3-2.35 2.05.7 3.05L5 7.5 2.3 9.1 3 6.05.65 4l3.1-.3z" fill="#fff" stroke="#222" stroke-width=".45" stroke-linejoin="round"/>',
    hana: '<g fill="#fff" stroke="#222" stroke-width=".45"><circle cx="5" cy="2.6" r="1.7"/><circle cx="7.3" cy="4.3" r="1.7"/><circle cx="6.4" cy="7" r="1.7"/><circle cx="3.6" cy="7" r="1.7"/><circle cx="2.7" cy="4.3" r="1.7"/><circle cx="5" cy="5" r="1.3"/></g>',
    sakana: '<path d="M1.2 5c1.5-2.4 4.6-2.8 6.4-1l1.8-1.4v4.8L7.6 6C5.8 7.8 2.7 7.4 1.2 5z" fill="#fff" stroke="#222" stroke-width=".45" stroke-linejoin="round"/><circle cx="3.2" cy="4.6" r=".35"/>',
    ie: '<path d="M1.3 5.2L5 1.6l3.7 3.6M2.4 4.3v4.9h5.2V4.3" fill="#fff" stroke="#222" stroke-width=".45" stroke-linejoin="round"/><rect x="4.2" y="6.4" width="1.6" height="2.8" fill="#fff" stroke="#222" stroke-width=".45"/>',
    heart: '<path d="M5 8.8C1.5 6.4.8 4.6 1.4 3.2 2 1.8 4 1.6 5 3.2c1-1.6 3-1.4 3.6 0 .6 1.4-.1 3.2-3.6 5.6z" fill="#fff" stroke="#222" stroke-width=".45" stroke-linejoin="round"/>',
    kuruma: '<path d="M1 7V5.2l1.6-2h4.2l1.8 2H9V7z" fill="#fff" stroke="#222" stroke-width=".45" stroke-linejoin="round"/><circle cx="3" cy="7.3" r="1" fill="#fff" stroke="#222" stroke-width=".45"/><circle cx="7.1" cy="7.3" r="1" fill="#fff" stroke="#222" stroke-width=".45"/>',
    ringo: '<path d="M5 3.3C3 2 1.2 3 1.2 5.3 1.2 7.6 3 9.4 5 8.6c2 .8 3.8-1 3.8-3.3C8.8 3 7 2 5 3.3z" fill="#fff" stroke="#222" stroke-width=".45"/><path d="M5 3.2c0-1 .3-1.7 1-2.2" fill="none" stroke="#222" stroke-width=".45"/>'
  };
  const PAIRS = [["sakana", "ie"], ["kuruma", "ie"], ["hoshi", "heart"], ["hana", "ringo"], ["ichigo", "heart"], ["sakana", "hana"]];
  function icon(name, x, y, size) {
    return '<g transform="translate(' + n(x) + " " + n(y) + ") scale(" + n(size / 10) + ')">' + (ICONS[name] || ICONS.hoshi) + "</g>";
  }

  // Level: 1 太い点線をなぞる, 2 細い点線をなぞる, 3 広い道, 4 細い道.
  function strokeFor(level, d) {
    if (level === 1) return '<path d="' + d + '" fill="none" stroke="#9e9e9e" stroke-width="1.6" stroke-dasharray="2.4 1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    if (level === 2) return '<path d="' + d + '" fill="none" stroke="#7d7d7d" stroke-width="0.6" stroke-dasharray="0.01 1.6" stroke-linecap="round"/>';
    return "";
  }

  function lanePattern(kind, level, x0, x1, yc, half, iconMm, pair) {
    const pts = sample(kind, 240).map((p) => [x0 + p[0] * (x1 - x0), yc + p[1] * half]);
    let s = "";
    if (level >= 3) {
      const w = level === 3 ? 10 : 6;
      const L = offset(pts, w / 2), R = offset(pts, -w / 2);
      s += '<path d="' + polyD(L) + '" fill="none" stroke="#333" stroke-width="0.5" stroke-linejoin="round"/>' +
        '<path d="' + polyD(R) + '" fill="none" stroke="#333" stroke-width="0.5" stroke-linejoin="round"/>';
    } else s += strokeFor(level, polyD(pts));
    const p0 = pts[0], p1 = pts[pts.length - 1];
    s += '<circle cx="' + n(p0[0]) + '" cy="' + n(p0[1]) + '" r="1.3" fill="#d1302f"/>';
    s += icon(pair[0], p0[0] - iconMm - 2, p0[1] - iconMm / 2, iconMm) + icon(pair[1], p1[0] + 2, p1[1] - iconMm / 2, iconMm);
    return s;
  }

  // Grid shapes: spirals, circles, triangles, squares, traced in place.
  function shapeCell(kind, level, cx, cy, r) {
    let d = "";
    if (kind === "uzumaki") {
      const pts = [];
      const turns = 3.2;
      for (let i = 0; i <= 260; i++) {
        const t = i / 260, a = t * turns * Math.PI * 2, rr = r * (1 - t * 0.92);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      d = polyD(pts);
      if (level >= 3) {
        const w = level === 3 ? 7 : 4.5;
        return '<path d="' + polyD(offset(pts, w / 2)) + '" fill="none" stroke="#333" stroke-width="0.5"/><path d="' + polyD(offset(pts, -w / 2)) +
          '" fill="none" stroke="#333" stroke-width="0.5"/><circle cx="' + n(pts[0][0]) + '" cy="' + n(pts[0][1]) + '" r="1.3" fill="#d1302f"/>';
      }
      return strokeFor(level, d) + '<circle cx="' + n(pts[0][0]) + '" cy="' + n(pts[0][1]) + '" r="1.3" fill="#d1302f"/>';
    }
    let pts;
    if (kind === "maru") { pts = []; for (let i = 0; i <= 120; i++) { const a = -Math.PI / 2 + i / 120 * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }
    else if (kind === "sankaku") pts = [[cx, cy - r], [cx + r * 0.95, cy + r * 0.75], [cx - r * 0.95, cy + r * 0.75], [cx, cy - r]];
    else pts = [[cx - r * 0.85, cy - r * 0.85], [cx + r * 0.85, cy - r * 0.85], [cx + r * 0.85, cy + r * 0.85], [cx - r * 0.85, cy + r * 0.85], [cx - r * 0.85, cy - r * 0.85]];
    d = polyD(pts) + (kind === "maru" ? "" : "Z");
    if (level >= 3) {
      const w = level === 3 ? 7 : 4.5;
      if (kind === "maru") {
        return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r + w / 2) + '" fill="none" stroke="#333" stroke-width="0.5"/><circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r - w / 2) +
          '" fill="none" stroke="#333" stroke-width="0.5"/><circle cx="' + n(cx) + '" cy="' + n(cy - r) + '" r="1.3" fill="#d1302f"/>';
      }
      // A polygon road: the shape drawn twice, scaled about its centre.
      const sc = (k) => pts.map((p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
      return '<path d="' + polyD(sc(1 + (w / 2) / r)) + 'Z" fill="none" stroke="#333" stroke-width="0.5" stroke-linejoin="round"/><path d="' + polyD(sc(1 - (w / 2) / r)) +
        'Z" fill="none" stroke="#333" stroke-width="0.5" stroke-linejoin="round"/><circle cx="' + n(pts[0][0]) + '" cy="' + n(pts[0][1]) + '" r="1.3" fill="#d1302f"/>';
    }
    return strokeFor(level, d) + '<circle cx="' + n(pts[0][0]) + '" cy="' + n(pts[0][1]) + '" r="1.3" fill="#d1302f"/>';
  }

  const GRID_KINDS = { uzumaki: 1, maru: 1, sankaku: 1, shikaku: 1 };

  function buildUnpitsu(a, o, env) {
    const f = frame(a, o);
    const kinds = o.kinds && o.kinds.length ? o.kinds : ["yoko"];
    const pages = [];
    kinds.forEach((kind) => {
      let s = "";
      const level = o.level || 1;
      if (GRID_KINDS[kind]) {
        const cols = 2, rows = 3;
        const cw = f.w / cols, rh = f.h / rows;
        const r = Math.min(cw, rh) * 0.36;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) s += shapeCell(kind, level, f.x + (i + 0.5) * cw, f.y + (j + 0.5) * rh, r);
      } else if (kind === "tate" || kind === "naname") {
        // Columns: top picture to bottom picture (たて) or a slant (ななめ).
        const cols = 6, cw = f.w / cols, iconMm = 11;
        for (let i = 0; i < cols; i++) {
          const x = f.x + (i + 0.5) * cw;
          const y0 = f.y + iconMm + 4, y1 = f.y + f.h - iconMm - 4;
          const xs = kind === "naname" ? [x - cw * 0.3, x + cw * 0.3] : [x, x];
          const pts = [[xs[0], y0], [xs[1], y1]];
          const pair = PAIRS[i % PAIRS.length];
          if (level >= 3) {
            const w = level === 3 ? 10 : 6;
            s += '<path d="' + polyD(offset(pts, w / 2)) + '" fill="none" stroke="#333" stroke-width="0.5"/><path d="' + polyD(offset(pts, -w / 2)) + '" fill="none" stroke="#333" stroke-width="0.5"/>';
          } else s += strokeFor(level, polyD(pts));
          s += '<circle cx="' + n(xs[0]) + '" cy="' + n(y0) + '" r="1.3" fill="#d1302f"/>';
          s += icon(pair[0], xs[0] - iconMm / 2, y0 - iconMm - 2, iconMm) + icon(pair[1], xs[1] - iconMm / 2, y1 + 2, iconMm);
        }
      } else {
        const lanes = kind === "kurukuru" || kind === "kunekune" ? 5 : 6;
        const lh = f.h / lanes, iconMm = 12;
        for (let i = 0; i < lanes; i++) {
          const yc = f.y + (i + 0.5) * lh;
          s += lanePattern(kind, level, f.x + iconMm + 5, f.x + f.w - iconMm - 5, yc, lh * 0.32, iconMm, PAIRS[i % PAIRS.length]);
        }
      }
      pages.push(svgDoc(a, header(a, Object.assign({}, o, { title: (o.titles && o.titles[kind]) || o.title })) + s + credit(a, env), o.title));
    });
    return pages;
  }

  /* ---- nurie (ぬりえ) ------------------------------------------------------ */

  /* A hollow kana made from the textbook face itself: the glyph stroked wide in
     the outline colour, then stroked a little narrower in white on top. What is
     left is a channel the width of the stroke, with an outline that follows the
     textbook letterform (とめ, はね and the separate strokes of き and さ) rather
     than a gothic face's joined strokes. Widths are em fractions, measured on
     Klee One SemiBold 2026-10-04 (stem ~0.075em). */
  function hollowGlyph(ch, cx, cy, fs) {
    const base = cy + EM_CENTRE * fs;
    // Expand each side by 0.02em only: き's two bars and あ's loop sit about
    // 0.06em apart, and a wider expansion (0.075em was tried) fused them into
    // one blob. The channel is then stem + 0.04em, ~0.115em: 20mm wide on a
    // one-per-page sheet, 8mm at six per page.
    const line = Math.max(0.45, fs * 0.008), outer = fs * 0.04 + 2 * line;
    const common = ' x="' + n(cx) + '" y="' + n(base) + '" font-size="' + n(fs) + '" text-anchor="middle" font-family="' + FONT + '" font-weight="' + FONT_WEIGHT +
      '" stroke-linejoin="round" stroke-linecap="round"';
    return "<text" + common + ' fill="#222" stroke="#222" stroke-width="' + n(outer) + '">' + esc(ch) + "</text>" +
      "<text" + common + ' fill="#fff" stroke="#fff" stroke-width="' + n(outer - 2 * line) + '">' + esc(ch) + "</text>";
  }

  function buildNurie(a, o, chars, data, env) {
    const f = frame(a, o);
    const per = o.perPage || 1;
    const grid = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] }[per] || [1, 1];
    const pages = [];
    for (let i = 0; i < chars.length; i += per) {
      const items = chars.slice(i, i + per);
      let s = "";
      const cw = f.w / grid[0], rh = f.h / grid[1];
      items.forEach((ch, k) => {
        const col = k % grid[0], row = Math.floor(k / grid[0]);
        const word = o.words ? (data.NURIE_WORDS[data.toHira(ch)] || "") : "";
        const wordBand = word ? Math.min(rh * 0.16, 16) : 0;
        const fs = Math.min(cw, rh - wordBand) * 0.98;
        const cx = f.x + (col + 0.5) * cw, cy = f.y + row * rh + (rh - wordBand) / 2;
        s += hollowGlyph(ch, cx, cy, fs);
        if (word) {
          const shown = data.toHira(ch) === ch ? word : data.toKata(word);
          const wfs = Math.min(wordBand * 0.7, (cw * 0.8) / Math.max(2, Array.from(shown).length));
          s += '<text x="' + n(cx) + '" y="' + n(f.y + (row + 1) * rh - wordBand * 0.3) + '" font-size="' + n(wfs) + '" text-anchor="middle" font-family="' + FONT +
            '" font-weight="' + FONT_WEIGHT + '" fill="#555">' + esc(shown) + "</text>";
        }
      });
      pages.push(svgDoc(a, header(a, o) + s + credit(a, env), o.title));
    }
    return pages;
  }

  const api = {
    FONT: FONT, FONT_WEIGHT: FONT_WEIGHT, EM_CENTRE: EM_CENTRE, PAPER_MM: PAPER_MM, MARGIN_MM: MARGIN_MM,
    QR_MM: QR_MM, CREDIT_MM: CREDIT_MM, HEADER_MM: HEADER_MM, TRACE: TRACE,
    area: area, frame: frame, header: header, credit: credit, creditRect: creditRect, svgDoc: svgDoc,
    masuCapacity: masuCapacity, masuPage: masuPage, practiceLine: practiceLine,
    buildCharSheets: buildCharSheets, buildNameMasu: buildNameMasu,
    ruling: ruling, fourLineRule: fourLineRule, fourLinePage: fourLinePage, fourLineCapacity: fourLineCapacity,
    latinRow: latinRow, latinWidth: latinWidth, mapper: mapper,
    buildUnpitsu: buildUnpitsu, sample: sample, PATTERNS: PATTERNS, ICONS: ICONS,
    buildNurie: buildNurie, hollowGlyph: hollowGlyph, esc: esc
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.UTG_JA_SHEETS_CORE = api;
})(typeof window !== "undefined" ? window : this);
