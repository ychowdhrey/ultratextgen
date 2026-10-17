/*
 * posterTiles.js — big letters split across several sheets
 * (/printables/bulletin-board-letters/).
 *
 * One letter, number or short word is printed at a finished height the
 * visitor chooses, cut into page-sized tiles that overlap a little, with cut
 * lines, line-up lines and a sheet map on every page, so the tiles tape back
 * together into one letter for a bulletin board or a wall.
 *
 * Why a separate engine rather than a printablesEngine.js surface: a tiled
 * letter is judged by its measured size on the wall. printablesEngine.js
 * rasterises a DOM clone and scales a unit that overflows its page, so its
 * output has no fixed physical scale. This engine draws each page straight
 * onto a canvas at the paper's exact size and hands the pages to
 * printablePdf.js with a zero margin and printScaling "none", so one inch in
 * the drawing is one inch on the paper. Same pattern as labelEngine.js.
 * Shared, read only: printPrefs.js (paper default, ink saver, recent sheets),
 * printablePdf.js (the PDF writer), stencil.js (bridge placement), header.js
 * (credit line and printable_output telemetry). Nothing in them is changed.
 *
 * HEIGHT IS THE HEIGHT OF THE INK. The height the visitor types is the
 * distance from the top of the tallest letter to the bottom of the lowest
 * one, outline included, measured from the rendered glyph pixels (see
 * inkBox), never the font size. A font
 * size is the em box: a capital A in Archivo Black is 688 px tall at a
 * 1000 px font size, so labelling by font size would print every letter
 * about a third short.
 *
 * Mount points (all optional except #bb-preview):
 *   #bb-text     the letter, number or word (12 characters at most)
 *   #bb-style    .pt-choice-row  block | bubble | stencil
 *   #bb-fill     .pt-choice-row  outline | filled
 *   #bb-height   number input; #bb-unit select in | cm
 *   #bb-layout   .pt-choice-row  each | word (shown for two or more characters)
 *   #bb-paper    select letter | a4
 *   #bb-overlap  select (inches)
 *   #bb-marks    checkbox: cut and line-up marks
 *   #bb-preview  the live preview (a canvas is put in it)
 *   #bb-summary  "4 sheets (2 across, 2 down)" line; #bb-counts per letter
 *   #bb-warn     limits (aria-live)
 *   #bb-pdf #bb-png  the two downloads
 *
 * Nothing typed here reaches the dataLayer. Telemetry carries the style and
 * the page count only.
 */
(function () {
  "use strict";

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  const PP = UTG.printPrefs || null;
  const $ = (id) => document.getElementById(id);

  const INK = "#1a1a2e";
  const MARK = "#6f7889";
  const FAINT = "#aeb5c2";
  const UI_FONT = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";

  /* The faces the site already self-hosts (assets/fonts/manifest.json), at a
     weight each family actually ships. puff is the round dilation that turns
     Fredoka into a bubble letter, as a fraction of the finished height. */
  const STYLES = {
    block: { family: "Archivo Black", weight: 400, puff: 0 },
    bubble: { family: "Fredoka", weight: 700, puff: 0.02 },
    stencil: { family: "Archivo Black", weight: 400, puff: 0, bridges: true }
  };

  const FS = 1000;          // design units: the font size glyphs are measured and drawn at
  const PAPER = { letter: { w: 8.5, h: 11 }, a4: { w: 8.27, h: 11.69 } };
  const MARGIN = 0.4;       // in: no ink here, so a printer's unprintable edge never cuts the letter
  const PAD = 0.15;         // in: paper left around the ink of each letter
  const MAX_CHARS = 12;
  const MAX_PAGES = 150;
  const LIMITS = { in: [3, 96], cm: [8, 244] };
  const STENCIL_BRIDGE = 0.055;   // bridge width as a fraction of ink height, as on block-letters
  const MASK_H = 320;             // px: ink height of the bitmap the bridges are found on
  const STORE = "utg_bb_letters";

  const state = {
    text: "A",
    style: "block",
    fill: "outline",
    unit: "in",
    height: 12,
    layout: "each",
    paper: "letter",
    overlap: 0.5,
    marks: true
  };

  /* ---------------- measuring ---------------- */

  let probe = null;
  function probeCtx() {
    if (!probe) probe = document.createElement("canvas").getContext("2d");
    return probe;
  }
  function fontFor(st) { return st.weight + " " + FS + "px '" + st.family + "', sans-serif"; }

  /* Ink box of a string drawn at (0, 0) on the alphabetic baseline, in design
     units, read from the pixels rather than from measureText. Measured in
     Chromium: at 1000px Archivo Black's "A" reports an actualBoundingBoxAscent
     of 703.1 while its ink is 688 pixels tall, so a height taken from the
     metrics printed a 24 in letter at 23.49 in. The pixels decide here.
     Cached per string and face. */
  const inkCache = {};
  function faceLoaded(st) {
    try { return !document.fonts || document.fonts.check(st.weight + " 40px '" + st.family + "'"); }
    catch (e) { return true; }
  }
  function inkBox(str, st) {
    const key = st.family + "|" + st.weight + "|" + str;
    if (key in inkCache) return inkCache[key];
    const g0 = probeCtx();
    g0.font = fontFor(st);
    const adv = g0.measureText(str).width;
    // The scratch canvas is sized from the advance with a generous pad, and
    // grown until no ink touches its edge: actualBoundingBox* came back short
    // enough in testing to clip the right side of an A.
    let pad = Math.ceil(FS * 0.5);
    let box = null;
    for (let attempt = 0; attempt < 4; attempt++, pad *= 2) {
      const c = document.createElement("canvas");
      c.width = Math.ceil(adv) + pad * 2;
      c.height = Math.ceil(FS * 1.6) + pad * 2;
      const ox = pad, oy = pad + Math.ceil(FS * 1.1);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.font = fontFor(st);
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.fillStyle = "#000";
      g.fillText(str, ox, oy);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
      for (let y = 0, i = 3; y < c.height; y++) {
        for (let x = 0; x < c.width; x++, i += 4) {
          if (d[i] < 128) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) { box = null; break; }
      box = { l: minX - ox, r: maxX + 1 - ox, t: minY - oy, b: maxY + 1 - oy };
      if (minX > 0 && minY > 0 && maxX < c.width - 1 && maxY < c.height - 1) break;
    }
    // Never remember a measurement taken in the fallback face.
    if (faceLoaded(st)) inkCache[key] = box;
    return box;
  }

  function heightIn() {
    const h = Number(state.height) || 0;
    return state.unit === "cm" ? h / 2.54 : h;
  }

  function cleanText() {
    return Array.from(String(state.text || "").replace(/\s+/g, " ").trim()).slice(0, MAX_CHARS).join("");
  }

  /* Outline weight in inches: heavy enough to cut along at arm's length,
     light enough to leave room to colour. */
  function lineIn(Hin) {
    return state.fill === "outline" ? Math.max(0.04, Math.min(0.16, Hin * 0.012)) : 0;
  }

  /* ---------------- planning ----------------
     Every piece (one letter, or the whole word) is a box of ink plus PAD,
     covered by a grid of tiles. A tile is the paper minus MARGIN on every
     side; neighbouring tiles share `overlap` inches, so the stride is the
     tile size minus the overlap. Both orientations are tried and the one
     that needs fewer sheets in all wins (portrait on a tie). */
  function plan() {
    const text = cleanText();
    const st = STYLES[state.style] || STYLES.block;
    const Hin = heightIn();
    if (!text) return null;
    const pieces = (state.layout === "word" || Array.from(text).length === 1
      ? [text]
      : Array.from(text).filter((c) => c !== " ")).filter((p) => inkBox(p, st));
    if (!pieces.length) return null;
    // Every letter shares one scale: the set's tallest top to its lowest bottom is the height.
    const boxes = pieces.map((p) => inkBox(p, st));
    const glyphH = Math.max.apply(null, boxes.map((b) => b.b)) - Math.min.apply(null, boxes.map((b) => b.t));
    if (!(glyphH > 0) || !(Hin > 0)) return null;
    const line = lineIn(Hin);
    const puff = st.puff * Hin;
    const ext = puff + line;                         // ink outside the glyph outline, per side
    const k = (Hin - 2 * ext) / glyphH;              // inches per design unit
    const o = state.overlap;
    const base = PAPER[state.paper] || PAPER.letter;

    const measured = pieces.map((p) => {
      const box = inkBox(p, st);
      return {
        text: p, box: box,
        inkW: (box.r - box.l) * k + 2 * ext,
        inkH: (box.b - box.t) * k + 2 * ext
      };
    });

    function tileOut(pw, ph) {
      const cw = pw - 2 * MARGIN, ch = ph - 2 * MARGIN;
      let total = 0;
      const out = measured.map((m) => {
        const w = m.inkW + 2 * PAD, h = m.inkH + 2 * PAD;
        const cols = w <= cw ? 1 : Math.ceil((w - o) / (cw - o));
        const rows = h <= ch ? 1 : Math.ceil((h - o) / (ch - o));
        total += cols * rows;
        const covW = cols * (cw - o) + o, covH = rows * (ch - o) + o;
        // Centre the letter in the area the tiles cover; gx/gy is where the
        // glyph's own origin (left bearing, baseline) lands in that area.
        const offX = (covW - w) / 2 + PAD + ext, offY = (covH - h) / 2 + PAD + ext;
        return Object.assign({}, m, {
          cols: cols, rows: rows, covW: covW, covH: covH,
          gx: offX - m.box.l * k, gy: offY - m.box.t * k
        });
      });
      return { pw: pw, ph: ph, cw: cw, ch: ch, pieces: out, total: total };
    }
    const portrait = tileOut(base.w, base.h);
    const landscape = tileOut(base.h, base.w);
    const pick = landscape.total < portrait.total ? landscape : portrait;
    return Object.assign(pick, {
      orient: pick === landscape ? "landscape" : "portrait",
      st: st, k: k, line: line, puff: puff, ext: ext, Hin: Hin, overlap: o, text: text
    });
  }

  /* ---------------- stencil bridges ----------------
     Found by stencil.js on a bitmap of the piece, exactly as block-letters
     does, then carried back into design units. */
  const bridgeCache = {};
  function bridgesFor(piece, P) {
    if (!P.st.bridges) return [];
    const sten = UTG.stencil;
    if (!sten || !sten.findBridges) return [];
    const key = piece.text + "|" + state.fill + "|" + P.line.toFixed(4) + "|" + P.k.toFixed(6);
    if (bridgeCache[key]) return bridgeCache[key];
    const box = piece.box;
    const s = MASK_H / (box.b - box.t);              // mask px per design unit
    const pad = Math.ceil(Math.max(box.r - box.l, box.b - box.t) * s * 0.06) + 4;
    const c = document.createElement("canvas");
    c.width = Math.ceil((box.r - box.l) * s) + pad * 2;
    c.height = Math.ceil((box.b - box.t) * s) + pad * 2;
    const g = c.getContext("2d");
    g.setTransform(s, 0, 0, s, pad - box.l * s, pad - box.t * s);
    g.font = fontFor(P.st);
    g.textBaseline = "alphabetic";
    g.fillStyle = "#000";
    g.fillText(piece.text, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height).data;
    const mask = new Uint8Array(c.width * c.height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) if (data[i + 3] > 128) mask[j] = 1;
    const width = Math.max(3, Math.round(MASK_H * STENCIL_BRIDGE));
    const strokePx = (P.line / P.k) * s;
    const rects = sten.findBridges(mask, c.width, c.height, { width: width, pad: Math.ceil(strokePx) + 1 });
    const out = rects.map((r) => ({
      x: (r.x - pad) / s + box.l, y: (r.y - pad) / s + box.t,
      w: r.w / s, h: r.h / s, vertical: r.vertical
    }));
    if (faceLoaded(P.st)) bridgeCache[key] = out;
    return out;
  }

  /* ---------------- drawing ----------------
     drawGlyph paints one piece into ctx, whose transform already maps design
     units to device pixels. Outline: the glyph grown by puff + line, minus
     the glyph grown by puff, so the ring sits OUTSIDE the letter and the
     letter's own shape stays the cut line's inside edge. */
  function shape(g, text, grow) {
    g.fillText(text, 0, 0);
    if (grow > 0) {
      g.lineJoin = "round";
      g.lineCap = "round";
      g.lineWidth = grow * 2;
      g.strokeText(text, 0, 0);
    }
  }

  let layerA = null, layerB = null;
  function layer(which, w, h) {
    let c = which === "a" ? layerA : layerB;
    if (!c) { c = document.createElement("canvas"); if (which === "a") layerA = c; else layerB = c; }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, w, h);
    return { c: c, g: g };
  }

  function drawGlyph(ctx, piece, P, m) {
    // m: [a, b, c, d, e, f] design units -> device px
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const puffDu = P.puff / P.k, lineDu = P.line / P.k;
    const bridges = bridgesFor(piece, P);
    const L = layer("a", W, H);
    const g = L.g;
    g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    g.font = fontFor(P.st);
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    g.fillStyle = INK;
    g.strokeStyle = INK;
    if (state.fill === "filled") {
      shape(g, piece.text, puffDu);
      if (bridges.length) {
        g.globalCompositeOperation = "destination-out";
        bridges.forEach((r) => g.fillRect(r.x, r.y, r.w, r.h));
      }
    } else {
      shape(g, piece.text, puffDu + lineDu);
      g.globalCompositeOperation = "destination-out";
      shape(g, piece.text, puffDu);
      if (bridges.length) {
        bridges.forEach((r) => g.fillRect(r.x, r.y, r.w, r.h));
        // The bridge's two long sides become cut lines, kept inside the ring.
        const E = layer("b", W, H);
        const e = E.g;
        e.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
        e.fillStyle = INK;
        e.strokeStyle = INK;
        e.font = fontFor(P.st);
        e.textBaseline = "alphabetic";
        bridges.forEach((r) => {
          if (r.vertical) { e.fillRect(r.x, r.y, lineDu, r.h); e.fillRect(r.x + r.w - lineDu, r.y, lineDu, r.h); }
          else { e.fillRect(r.x, r.y, r.w, lineDu); e.fillRect(r.x, r.y + r.h - lineDu, r.w, lineDu); }
        });
        e.globalCompositeOperation = "destination-in";
        shape(e, piece.text, puffDu + lineDu);
        g.globalCompositeOperation = "source-over";
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(E.c, 0, 0);
      }
    }
    ctx.save();
    if (PP && PP.values && PP.values.ink === "saver") ctx.globalAlpha = 0.72;
    ctx.drawImage(L.c, 0, 0);
    ctx.restore();
  }

  function siteCredit() {
    if (UTG.printableCredit) return UTG.printableCredit();
    return "ultratextgen.com" + String(location.pathname || "").replace(/index\.html$/, "").replace(/\/$/, "");
  }

  function fmtLen(inches) {
    if (state.unit === "cm") return (Math.round(inches * 2.54 * 10) / 10).toLocaleString("en-US") + " cm";
    return (Math.round(inches * 10) / 10).toLocaleString("en-US") + " in";
  }

  /* One printed page: tile (r, c) of piece pi. Returns the canvas fraction
     of the credit line, for the PDF's link annotation. */
  function drawTile(cv, P, pi, r, c, ppi, seq) {
    const piece = P.pieces[pi];
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const o = P.overlap;
    const X0 = c * (P.cw - o), Y0 = r * (P.ch - o);   // this tile's corner in the covered area

    // The letter, clipped to the tile so the margins stay clear.
    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN * ppi, MARGIN * ppi, P.cw * ppi, P.ch * ppi);
    ctx.clip();
    const s = P.k * ppi;
    drawGlyph(ctx, piece, P, [s, 0, 0, s, (MARGIN - X0 + piece.gx) * ppi, (MARGIN - Y0 + piece.gy) * ppi]);
    ctx.restore();

    ctx.save();
    ctx.setTransform(ppi, 0, 0, ppi, 0, 0);          // inches from here on
    const pw = P.pw, ph = P.ph, M = MARGIN, cw = P.cw, ch = P.ch;
    const left = M, top = M, right = M + cw, bottom = M + ch;
    const hair = 0.012;
    ctx.lineWidth = hair;
    ctx.strokeStyle = MARK;
    ctx.fillStyle = MARK;
    const line = (x1, y1, x2, y2, dash) => {
      ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const text = (str, x, y, size, align, weight, rot) => {
      ctx.save();
      ctx.font = (weight || 600) + " " + size + "px " + UI_FONT;
      ctx.textAlign = align || "left";
      ctx.textBaseline = "alphabetic";
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      ctx.fillText(str, 0, 0);
      ctx.restore();
    };

    if (state.marks) {
      // Corner marks: where the tile's printed area ends.
      [[left, top, -1, -1], [right, top, 1, -1], [left, bottom, -1, 1], [right, bottom, 1, 1]].forEach((q) => {
        line(q[0] + q[2] * 0.06, q[1], q[0] + q[2] * 0.26, q[1]);
        line(q[0], q[1] + q[3] * 0.06, q[0], q[1] + q[3] * 0.26);
      });
      const dash = [0.08, 0.06];
      // Cut edges: this sheet goes ON TOP of its left and upper neighbours.
      if (c > 0) {
        line(left, 0, left, ph, dash);
        text("CUT on this line, then lay this sheet over the sheet to its left", left - 0.13, top + ch / 2, 0.1, "center", 700, -Math.PI / 2);
      }
      if (r > 0) {
        line(0, top, pw, top, dash);
        text("CUT on this line, then lay this sheet over the sheet above", left + cw / 2, top - 0.13, 0.1, "center", 700);
      }
      // Line-up edges: the next sheet's cut edge lands on this line.
      ctx.strokeStyle = FAINT;
      if (c < piece.cols - 1) {
        line(right - o, top, right - o, bottom, [0.03, 0.05]);
        ctx.strokeStyle = MARK;
        line(right - o, top - 0.3, right - o, top - 0.04);
        line(right - o, bottom + 0.04, right - o, bottom + 0.3);
        // Inside the overlap strip, so the next sheet covers it once joined.
        ctx.fillStyle = MARK;
        text("Next sheet's cut edge goes on the dotted line", right - o / 2 + 0.03, bottom - 0.3, 0.08, "left", 600, -Math.PI / 2);
        ctx.strokeStyle = FAINT;
      }
      if (r < piece.rows - 1) {
        line(left, bottom - o, right, bottom - o, [0.03, 0.05]);
        ctx.strokeStyle = MARK;
        line(left - 0.3, bottom - o, left - 0.04, bottom - o);
        line(right + 0.04, bottom - o, right + 0.3, bottom - o);
        ctx.fillStyle = MARK;
        text("Sheet below: its cut edge goes on the dotted line", left + 0.3, bottom - o / 2 + 0.03, 0.08, "left", 600);
      }
      ctx.strokeStyle = MARK;
    }

    // Which sheet this is, and a map of where it goes.
    const n = piece.cols * piece.rows;
    const idx = r * piece.cols + c + 1;
    const name = P.pieces.length > 1 || piece.text.length > 1 ? "“" + piece.text + "” · " : "";
    text(name + "sheet " + idx + " of " + n + " · row " + (r + 1) + ", column " + (c + 1), left, 0.27, 0.12, "left", 700);
    const cell = Math.min(0.11, 0.26 / Math.max(piece.rows, 1), 1.6 / Math.max(piece.cols, 1));
    const mapX = right - piece.cols * cell, mapY = 0.33 - piece.rows * cell;
    ctx.setLineDash([]);
    ctx.lineWidth = 0.008;
    for (let rr = 0; rr < piece.rows; rr++) {
      for (let cc = 0; cc < piece.cols; cc++) {
        const x = mapX + cc * cell, y = mapY + rr * cell;
        if (rr === r && cc === c) ctx.fillRect(x, y, cell, cell);
        else ctx.strokeRect(x + 0.004, y + 0.004, cell - 0.008, cell - 0.008);
      }
    }

    // A check bar of known length: the visitor can tell at once whether the
    // printer scaled the page.
    const metric = state.unit === "cm";
    const barLen = metric ? 2 / 2.54 : 1;
    const barY = ph - 0.2;
    ctx.fillRect(left, barY - 0.05, barLen, 0.05);
    ctx.fillRect(left, barY - 0.1, 0.012, 0.1);
    ctx.fillRect(left + barLen - 0.012, barY - 0.1, 0.012, 0.1);
    text((metric ? "This bar is 2 cm long." : "This bar is 1 inch long.") + " Shorter? Print at 100% (Actual size).", left + barLen + 0.1, barY, 0.09, "left", 600);
    const credit = siteCredit();
    ctx.fillStyle = FAINT;
    text(credit, right, barY, 0.09, "right", 600);
    ctx.font = "600 0.09px " + UI_FONT;
    const cwid = ctx.measureText(credit).width;
    ctx.restore();
    return { x: (right - cwid) / pw, y: (barY - 0.1) / ph, w: cwid / pw, h: 0.14 / ph, seq: seq };
  }

  /* ---------------- preview ---------------- */

  let previewCanvas = null;
  function paintPreview(P) {
    const box = $("bb-preview");
    if (!box) return;
    if (!previewCanvas) {
      box.innerHTML = "";
      previewCanvas = document.createElement("canvas");
      previewCanvas.className = "bb-canvas";
      previewCanvas.setAttribute("role", "img");
      box.appendChild(previewCanvas);
    }
    const cv = previewCanvas;
    const availW = Math.max(220, box.clientWidth - 24);
    const availH = Math.max(220, Math.min(460, window.innerHeight * 0.55));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!P) {
      cv.width = availW * dpr; cv.height = 160 * dpr;
      cv.style.width = availW + "px"; cv.style.height = "160px";
      const g = cv.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, availW, 160);
      g.fillStyle = MARK; g.font = "600 14px " + UI_FONT; g.textAlign = "center";
      g.fillText("Type a letter, number or word", availW / 2, 84);
      cv.setAttribute("aria-label", "Empty preview");
      return;
    }
    const gap = 0.6;
    const totW = P.pieces.reduce((a, p) => a + p.covW, 0) + gap * (P.pieces.length - 1);
    const totH = Math.max.apply(null, P.pieces.map((p) => p.covH));
    const sc = Math.min(availW / totW, availH / totH);    // px per inch
    const W = Math.ceil(totW * sc), H = Math.ceil(totH * sc);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#f3f4f7";
    g.fillRect(0, 0, cv.width, cv.height);
    let x = 0;
    const o = P.overlap;
    P.pieces.forEach((p) => {
      const y = (totH - p.covH) / 2;
      const ppi = sc * dpr;
      // the sheets, as they sit once assembled
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
        g.fillStyle = "#ffffff";
        g.fillRect((x + c * (P.cw - o)) * ppi, (y + r * (P.ch - o)) * ppi, P.cw * ppi, P.ch * ppi);
      }
      const s = P.k * ppi;
      drawGlyph(g, p, P, [s, 0, 0, s, (x + p.gx) * ppi, (y + p.gy) * ppi]);
      g.save();
      g.setTransform(ppi, 0, 0, ppi, 0, 0);
      g.lineWidth = 1.2 / ppi * dpr;
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
        const sx = x + c * (P.cw - o), sy = y + r * (P.ch - o);
        g.setLineDash([5 / ppi * dpr, 4 / ppi * dpr]);
        g.strokeStyle = "rgba(124, 92, 255, 0.85)";
        g.strokeRect(sx, sy, P.cw, P.ch);
      }
      g.restore();
      x += p.covW + gap;
    });
    const n = P.total;
    cv.setAttribute("aria-label", "Preview: " + P.pieces.length + (P.pieces.length === 1 ? " piece" : " pieces") + " on " + n + (n === 1 ? " sheet" : " sheets") + ", dashed lines show each sheet");
  }

  function summarize(P) {
    const sum = $("bb-summary"), counts = $("bb-counts"), warn = $("bb-warn");
    const pdf = $("bb-pdf"), png = $("bb-png");
    const say = (el, s) => { if (el) el.textContent = s; };
    const lim = LIMITS[state.unit];
    let problem = "";
    const h = Number(state.height);
    if (!(h >= lim[0] && h <= lim[1])) problem = "Choose a height from " + lim[0] + " to " + lim[1] + " " + state.unit + ".";
    else if (P && P.total > MAX_PAGES) problem = "That is " + P.total + " sheets. Up to " + MAX_PAGES + " fit in one file: choose a smaller height or fewer letters.";
    say(warn, problem);
    const ok = !!P && !problem;
    if (pdf) pdf.disabled = !ok;
    if (png) png.disabled = !ok;
    if (!P) { say(sum, ""); if (counts) counts.innerHTML = ""; return; }
    const paper = (state.paper === "a4" ? "A4" : "US Letter") + ", " + P.orient;
    if (P.pieces.length === 1) {
      const p = P.pieces[0];
      const n = p.cols * p.rows;
      say(sum, n + (n === 1 ? " sheet" : " sheets") + (n > 1 ? " (" + p.cols + " across, " + p.rows + " down)" : "") +
        " · " + fmtLen(p.inkH) + " tall, " + fmtLen(p.inkW) + " wide · " + paper);
      if (counts) counts.innerHTML = "";
    } else {
      say(sum, P.total + " sheets in all · " + fmtLen(P.Hin) + " tall · " + paper);
      if (counts) {
        counts.innerHTML = "";
        P.pieces.forEach((p) => {
          const li = document.createElement("li");
          const b = document.createElement("strong");
          b.textContent = p.text;
          li.appendChild(b);
          const n = p.cols * p.rows;
          li.appendChild(document.createTextNode(" " + n + (n === 1 ? " sheet" : " sheets")));
          counts.appendChild(li);
        });
      }
    }
  }

  let pending = 0;
  let lastPlan = null;
  function refresh() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      const P = plan();
      lastPlan = P;
      summarize(P);
      paintPreview(P);
      const lay = $("bb-layout-field");
      if (lay) lay.hidden = Array.from(cleanText().replace(/ /g, "")).length < 2;
    });
  }

  /* ---------------- export ---------------- */

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

  function loadStencil() {
    if (UTG.stencil || !(STYLES[state.style] || {}).bridges) return Promise.resolve();
    if (loadStencil.p) return loadStencil.p;
    loadStencil.p = new Promise((resolve) => {
      const sc = document.createElement("script");
      sc.src = "/js/printables/stencil.js";
      sc.onload = () => resolve();
      sc.onerror = () => { loadStencil.p = null; resolve(); };
      document.head.appendChild(sc);
    });
    return loadStencil.p;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const st = STYLES[state.style] || STYLES.block;
    return Promise.all([
      document.fonts.load(st.weight + " 40px '" + st.family + "'", cleanText() || "A"),
      document.fonts.load("600 20px 'Plus Jakarta Sans'"),
      document.fonts.load("700 20px 'Plus Jakarta Sans'")
    ]).catch(() => {});
  }

  function sheetKey() { return "poster-" + state.style; }

  function pagesOf(P) {
    const list = [];
    P.pieces.forEach((p, pi) => {
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) list.push({ pi: pi, r: r, c: c });
    });
    return list;
  }

  /* The PDF writer reads each page's width, height, 2D context and (for its
     JPEG fallback) toBlob, one page at a time. A tiled letter can run to a
     hundred sheets, and holding a hundred page-sized canvases at once is
     more memory than a phone gives a tab, so each entry here paints its
     page into ONE shared canvas when the writer asks for it. */
  function pageSources(P, ppi, links) {
    const shared = document.createElement("canvas");
    shared.width = Math.round(P.pw * ppi);
    shared.height = Math.round(P.ph * ppi);
    let painted = -1;
    const credit = siteCredit();
    const href = "https://" + credit;
    return pagesOf(P).map((pg, i) => {
      const paint = () => {
        if (painted !== i) { drawTile(shared, P, pg.pi, pg.r, pg.c, ppi, i); painted = i; }
        return shared;
      };
      links.push({ page: i, rect: creditRect(P, i), url: href });
      return {
        width: shared.width,
        height: shared.height,
        getContext: (kind, opts) => paint().getContext(kind, opts),
        toBlob: (cb, type, q) => paint().toBlob(cb, type, q)
      };
    });
  }

  function creditRect(P) {
    const g = probeCtx();
    g.font = "600 9px " + UI_FONT;          // 0.09in at 100 px per inch
    const w = g.measureText(siteCredit()).width / 100;
    const right = MARGIN + P.cw, barY = P.ph - 0.2;
    return { x: (right - w) / P.pw, y: (barY - 0.1) / P.ph, w: w / P.pw, h: 0.14 / P.ph };
  }

  /* 200 or 100 pixels per inch, because both put a whole number of pixels
     across Letter (8.5 x 11) AND A4 (8.27 x 11.69). Any other value rounds
     one side, and the PDF writer then letterboxes the page by a fraction of
     a point, which shrinks the letter by the same fraction. */
  function exportPpi(n) { return n <= 40 ? 200 : 100; }

  function busy(btn, on) { if (btn) { if (on) btn.setAttribute("aria-busy", "true"); else btn.removeAttribute("aria-busy"); } }

  function makePdf() {
    const btn = $("bb-pdf");
    busy(btn, true);
    return Promise.all([loadPdf(), fontsReady(), loadStencil()]).then((res) => {
      const P = plan();
      if (!P || P.total > MAX_PAGES) return;
      const Pdf = res[0];
      if (!Pdf || !Pdf.supported()) throw new Error("pdf unsupported");
      const links = [];
      const pages = pageSources(P, exportPpi(P.total), links);
      const marks = [];
      let at = 0;
      if (P.pieces.length > 1) P.pieces.forEach((p) => { marks.push({ page: at, title: p.text }); at += p.cols * p.rows; });
      return Pdf.fromCanvases(pages, {
        paperIn: { w: P.pw, h: P.ph },
        marginIn: { x: 0, y: 0 },
        title: document.title,
        printScaling: "none",
        links: links,
        bookmarks: marks
      }).then((blob) => {
        Pdf.download(blob, "bulletin-board-letters-" + state.style + "-" + fileSize() + ".pdf");
        if (UTG.trackPrintable) UTG.trackPrintable("download_pdf", sheetKey());
        if (UTG.trackPrintableEvent) UTG.trackPrintableEvent("printable_output", { printable_action: "pdf_saved", printable_sheet: sheetKey(), printable_pages: P.total });
        remember();
      });
    }).catch(() => printFallback()).finally(() => busy(btn, false));
  }

  function fileSize() { return String(state.height).replace(/[^0-9.]/g, "") + state.unit; }

  function printFallback() {
    const P = plan();
    const root = $("pt-print-root");
    if (!P || !root || P.total > MAX_PAGES) return;
    root.innerHTML = "";
    const ppi = 120;
    pagesOf(P).forEach((pg) => {
      const cv = document.createElement("canvas");
      cv.width = Math.round(P.pw * ppi); cv.height = Math.round(P.ph * ppi);
      drawTile(cv, P, pg.pi, pg.r, pg.c, ppi, 0);
      const img = document.createElement("img");
      img.src = cv.toDataURL("image/png");
      img.alt = "";
      img.className = "bb-print-page";
      root.appendChild(img);
    });
    const st = document.createElement("style");
    st.textContent = "@page { size: " + P.pw + "in " + P.ph + "in; margin: 0 } #pt-print-root { padding: 0 !important } .bb-print-page { display: block; width: " + P.pw + "in; height: " + P.ph + "in; break-after: page; }";
    root.appendChild(st);
    document.body.classList.add("is-printing");
    if (UTG.hideForPrint) UTG.hideForPrint(root);
    const done = () => {
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("is-printing");
      if (UTG.restorePrint) UTG.restorePrint();
      if (st.parentNode) st.parentNode.removeChild(st);
    };
    window.addEventListener("afterprint", done);
    setTimeout(() => { try { window.print(); } catch (e) { done(); } }, 60);
    if (UTG.trackPrintable) UTG.trackPrintable("print", sheetKey());
  }

  /* The assembled letters as one image, for a print shop or a slide. */
  function makePng() {
    const btn = $("bb-png");
    busy(btn, true);
    return Promise.all([fontsReady(), loadStencil()]).then(() => {
      const P = plan();
      if (!P) return;
      const gap = 0.5;
      const totW = P.pieces.reduce((a, p) => a + p.inkW + 2 * PAD, 0) + gap * (P.pieces.length - 1);
      const totH = Math.max.apply(null, P.pieces.map((p) => p.inkH + 2 * PAD));
      const ppi = Math.min(150, 4000 / Math.max(totW, totH));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(totW * ppi));
      cv.height = Math.max(1, Math.round(totH * ppi));
      const g = cv.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, cv.width, cv.height);
      let x = 0;
      P.pieces.forEach((p) => {
        const w = p.inkW + 2 * PAD, h = p.inkH + 2 * PAD;
        const y = (totH - h) / 2;
        const gx = x + PAD + P.ext - p.box.l * P.k, gy = y + PAD + P.ext - p.box.t * P.k;
        const s = P.k * ppi;
        drawGlyph(g, p, P, [s, 0, 0, s, gx * ppi, gy * ppi]);
        x += w + gap;
      });
      return new Promise((resolve) => cv.toBlob((blob) => {
        if (blob) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "bulletin-board-letters-" + state.style + ".png";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          if (UTG.trackPrintable) UTG.trackPrintable("download_png", sheetKey());
        }
        resolve();
      }, "image/png"));
    }).finally(() => busy(btn, false));
  }

  function remember() {
    if (!PP || !PP.rememberRecent) return;
    PP.rememberRecent({ href: location.pathname, label: cleanText(), page: location.pathname, sheet: sheetKey() });
  }

  /* ---------------- controls ---------------- */

  function persist() {
    try {
      const keep = {};
      ["style", "fill", "unit", "height", "layout", "paper", "overlap", "marks"].forEach((k) => { keep[k] = state[k]; });
      localStorage.setItem(STORE, JSON.stringify(keep));
    } catch (e) { /* storage blocked: nothing to keep */ }
  }

  function restore() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || "null");
      if (!d) return false;
      if (STYLES[d.style]) state.style = d.style;
      if (d.fill === "outline" || d.fill === "filled") state.fill = d.fill;
      if (d.unit === "in" || d.unit === "cm") state.unit = d.unit;
      if (Number(d.height) > 0) state.height = Number(d.height);
      if (d.layout === "each" || d.layout === "word") state.layout = d.layout;
      if (PAPER[d.paper]) state.paper = d.paper;
      if ([0.25, 0.5, 1].indexOf(Number(d.overlap)) >= 0) state.overlap = Number(d.overlap);
      if (typeof d.marks === "boolean") state.marks = d.marks;
      return true;
    } catch (e) { return false; }
  }

  function setChoice(rowId, value) {
    const row = $(rowId);
    if (!row) return;
    row.querySelectorAll("[data-value]").forEach((b) => {
      const on = b.getAttribute("data-value") === value;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
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
    row.addEventListener("keydown", (e) => {
      const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
      if (keys.indexOf(e.key) < 0) return;
      const btns = Array.from(row.querySelectorAll("[data-value]"));
      const cur = btns.findIndex((b) => b.classList.contains("is-active"));
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = btns[(cur + step + btns.length) % btns.length];
      e.preventDefault();
      onPick(next.getAttribute("data-value"));
      next.focus();
    });
  }

  const engaged = {};
  function engage(control, value) {
    if (!UTG.trackPrintableEvent) return;
    const key = control + ":" + value;
    if (engaged[key]) return;
    engaged[key] = true;
    UTG.trackPrintableEvent("printable_engage", { printable_control: control, printable_value: String(value) });
  }

  function syncControls() {
    setChoice("bb-style", state.style);
    setChoice("bb-fill", state.fill);
    setChoice("bb-layout", state.layout);
    const set = (id, v) => { const el = $(id); if (el) el.value = String(v); };
    set("bb-height", state.height);
    set("bb-unit", state.unit);
    set("bb-paper", state.paper);
    set("bb-overlap", state.overlap);
    const mk = $("bb-marks");
    if (mk) mk.checked = state.marks;
    const lim = LIMITS[state.unit];
    const h = $("bb-height");
    if (h) { h.min = lim[0]; h.max = lim[1]; }
  }

  function init() {
    if (!$("bb-preview")) return;
    if (PP && PP.mountPrintNote) {
      const b = $("bb-pdf");
      PP.mountPrintNote({ lang: "en", button: b && b.textContent.trim() });
    }
    const fresh = !restore();
    if (fresh && PP && PP.values && PP.values.paper === "a4") { state.paper = "a4"; state.unit = "cm"; state.height = 30; }
    const input = $("bb-text");
    if (input && input.value) state.text = input.value;
    syncControls();

    if (input) {
      let sent = false;
      input.addEventListener("input", () => {
        state.text = input.value;
        if (!sent && UTG.trackPrintableEvent) { sent = true; UTG.trackPrintableEvent("printable_generate", { printable_sheet: "poster" }); }
        fontsReady().then(refresh);
        refresh();
      });
    }
    wireChoices("bb-style", (v) => {
      if (!STYLES[v]) return;
      state.style = v; setChoice("bb-style", v); engage("style", v); persist();
      Promise.all([fontsReady(), loadStencil()]).then(refresh);
      refresh();
    });
    wireChoices("bb-fill", (v) => { state.fill = v === "filled" ? "filled" : "outline"; setChoice("bb-fill", state.fill); engage("fill", state.fill); persist(); refresh(); });
    wireChoices("bb-layout", (v) => { state.layout = v === "word" ? "word" : "each"; setChoice("bb-layout", state.layout); engage("layout", state.layout); persist(); refresh(); });
    const h = $("bb-height");
    if (h) h.addEventListener("input", () => { state.height = Number(h.value); persist(); refresh(); });
    const unit = $("bb-unit");
    if (unit) unit.addEventListener("change", () => {
      const was = state.unit;
      state.unit = unit.value === "cm" ? "cm" : "in";
      if (was !== state.unit) {
        const v = Number(state.height) || 0;
        state.height = state.unit === "cm" ? Math.round(v * 2.54) : Math.round(v / 2.54 * 2) / 2;
      }
      syncControls(); engage("unit", state.unit); persist(); refresh();
    });
    const paper = $("bb-paper");
    if (paper) paper.addEventListener("change", () => {
      state.paper = PAPER[paper.value] ? paper.value : "letter";
      if (PP && PP.values) { PP.values.paper = state.paper; if (PP.save) PP.save(); }
      engage("paper", state.paper); persist(); refresh();
    });
    const ov = $("bb-overlap");
    if (ov) ov.addEventListener("change", () => { state.overlap = Number(ov.value) || 0.5; engage("overlap", state.overlap); persist(); refresh(); });
    const mk = $("bb-marks");
    if (mk) mk.addEventListener("change", () => { state.marks = mk.checked; persist(); refresh(); });
    const pdf = $("bb-pdf");
    if (pdf) pdf.addEventListener("click", makePdf);
    const png = $("bb-png");
    if (png) png.addEventListener("click", makePng);

    let t = 0;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(refresh, 150); });
    Promise.all([fontsReady(), loadStencil()]).then(refresh);
    refresh();
  }

  // Exposed for the geometry check and the scenario harness; not a public API.
  UTG.posterTiles = { state: state, plan: plan, drawTile: drawTile, pagesOf: pagesOf, MARGIN: MARGIN, PAD: PAD, PAPER: PAPER, refresh: refresh, last: () => lastPlan };

  if (document.readyState === "complete") init();
  else window.addEventListener("DOMContentLoaded", init);
})();
