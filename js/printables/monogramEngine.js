/*
 * monogramEngine.js — self-contained controller for /printables/monogram-maker/.
 *
 * Turns up to three initials (left / center / right) into a printable monogram
 * in one of three layouts (classic three-letter, stacked, circle frame) and one
 * of two styles (solid ink, or white-fill traceable outline). Everything is
 * rendered client-side as native SVG (live preview + print) and Canvas 2D (PNG
 * download) — no server render, no image library, no bundled font binary. The
 * elegant serif is Playfair Display, loaded on the page via a Google Fonts
 * <link> tag; this tool does NOT use the site's Unicode font registry, so the
 * output is for print / PNG only, not copy-paste.
 *
 * Mount points on the page:
 *   #mono-left #mono-center #mono-right   the three 1-char initial inputs
 *   #mono-layout-group                    .pt-swatches radiogroup (classic|stacked|circle)
 *   #mono-style-group                     .pt-swatches radiogroup (solid|outline)
 *   #mono-preview                         live SVG preview surface (.pt-paper)
 *   #mono-print #mono-png                 print + PNG download buttons
 *   #pt-print-root                        hidden print surface (shared, print CSS wired)
 */
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const INK = "#1a1a2e";
  const FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";
  const WEIGHT = "700";
  const VB = 400; // SVG viewBox is 0 0 400 400

  // State the swatch groups drive. Initials are always read live from the DOM.
  const state = { layout: "classic", style: "solid" };

  /* ---------- tiny DOM / SVG helpers ---------- */

  function byId(id) { return document.getElementById(id); }

  function svgEl(name, attrs) {
    const n = document.createElementNS(SVGNS, name);
    if (attrs) {
      Object.keys(attrs).forEach((k) => { n.setAttribute(k, attrs[k]); });
    }
    return n;
  }

  // Current initials, uppercased, one char each, in [left, center, right] order.
  function vals() {
    const read = (id) => {
      const el = byId(id);
      return el ? el.value.trim().slice(0, 1).toUpperCase() : "";
    };
    return { l: read("mono-left"), c: read("mono-center"), r: read("mono-right") };
  }

  /* ---------- glyph measurement (shared canvas) ---------- */

  let measureCtx = null;
  function measure(ch, px) {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    measureCtx.font = WEIGHT + " " + px + "px " + FONT;
    return measureCtx.measureText(ch).width;
  }

  /* ---------- SVG letter builder ---------- */

  // A single monogram letter as an SVG <text>, inked per the active style.
  function letterText(ch, x, y, size, opts) {
    const o = opts || {};
    const t = svgEl("text", {
      x: x, y: y,
      "text-anchor": o.anchor || "middle",
      "font-family": FONT,
      "font-weight": WEIGHT,
      "font-size": size
    });
    if (o.central) t.setAttribute("dominant-baseline", "central");
    if (state.style === "outline") {
      t.setAttribute("fill", "#ffffff");
      t.setAttribute("stroke", INK);
      t.setAttribute("stroke-width", String(Math.max(3, size * 0.045)));
      t.setAttribute("stroke-linejoin", "round");
      t.setAttribute("paint-order", "stroke");
    } else {
      t.setAttribute("fill", INK);
    }
    t.textContent = ch;
    return t;
  }

  // Lay a horizontal row of letters, centered on x=200, sitting on baseline `y`
  // (or vertically centered at `y` when central). Widths are measured so wide
  // center letters (M, W) never collide with the side letters.
  function layoutRow(svg, items, y, central) {
    if (!items.length) return;
    const gap = central ? 8 : 10;
    const widths = items.map((it) => measure(it.ch, it.size));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = VB / 2 - total / 2;
    items.forEach((it, i) => {
      const w = widths[i];
      svg.appendChild(letterText(it.ch, x + w / 2, y, it.size, { anchor: "middle", central: central }));
      x += w + gap;
    });
  }

  // Classic three-letter: small · BIG center (~1.7x) · small, on one baseline.
  function buildClassic(svg, v) {
    const items = [];
    if (v.l) items.push({ ch: v.l, size: 116 });
    if (v.c) items.push({ ch: v.c, size: 196 });
    if (v.r) items.push({ ch: v.r, size: 116 });
    if (!items.length) return;
    const maxSize = Math.max.apply(null, items.map((it) => it.size));
    const baselineY = 200 + maxSize * 0.36; // vertically centers the tallest cap
    layoutRow(svg, items, baselineY, false);
  }

  // Stacked: the provided initials stacked vertically, centered, tight leading.
  function buildStacked(svg, v) {
    const present = [v.l, v.c, v.r].filter(Boolean);
    const n = present.length;
    if (!n) return;
    const size = n >= 3 ? 150 : (n === 2 ? 180 : 220);
    const lineH = size * 0.82;
    const firstCY = 200 - (n - 1) * lineH / 2;
    present.forEach((ch, i) => {
      svg.appendChild(letterText(ch, 200, firstCY + i * lineH, size, { anchor: "middle", central: true }));
    });
  }

  // Circle frame: small · BIG · small centered inside a double ring (wax-seal look).
  function buildCircle(svg, v) {
    const ringW = state.style === "solid" ? 6 : 5;
    svg.appendChild(svgEl("circle", { cx: 200, cy: 200, r: 186, fill: "none", stroke: INK, "stroke-width": ringW }));
    svg.appendChild(svgEl("circle", { cx: 200, cy: 200, r: 171, fill: "none", stroke: INK, "stroke-width": 2.5 }));
    const items = [];
    if (v.l) items.push({ ch: v.l, size: 78 });
    if (v.c) items.push({ ch: v.c, size: 132 });
    if (v.r) items.push({ ch: v.r, size: 78 });
    layoutRow(svg, items, 200, true);
  }

  function buildMonogramSVG() {
    const v = vals();
    const svg = svgEl("svg", {
      viewBox: "0 0 " + VB + " " + VB,
      class: "pt-design-sheet-svg",
      role: "img"
    });
    const initials = (v.l + v.c + v.r);
    svg.setAttribute("aria-label", initials ? ("Monogram " + initials + " — " + state.layout + " layout") : "Monogram preview");

    if (!v.l && !v.c && !v.r) {
      const hint = svgEl("text", {
        x: 200, y: 200, "text-anchor": "middle", "dominant-baseline": "central",
        "font-family": FONT, "font-size": 26, fill: "#9aa2b1"
      });
      hint.textContent = "Type initials";
      svg.appendChild(hint);
      return svg;
    }

    if (state.layout === "stacked") buildStacked(svg, v);
    else if (state.layout === "circle") buildCircle(svg, v);
    else buildClassic(svg, v);
    return svg;
  }

  /* ---------- live preview ---------- */

  function render() {
    const host = byId("mono-preview");
    if (!host) return;
    host.innerHTML = "";
    host.appendChild(buildMonogramSVG());
  }

  let debounceTimer = null;
  function schedule() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 120);
  }

  /* ---------- fonts ---------- */

  // Playfair Display arrives asynchronously via the page's Google Fonts <link>.
  // Canvas measuring/drawing before it loads would use fallback metrics, so we
  // re-run `cb` once the face is ready.
  function whenFontReady(cb) {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 40px "Playfair Display"').then(cb).catch(cb);
    } else {
      cb();
    }
  }

  /* ---------- PNG export (Canvas 2D, 1600x1600) ---------- */

  function inkCanvas(ctx, ch, x, y, px) {
    if (state.style === "outline") {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ch, x, y);
      ctx.lineWidth = Math.max(3, px * 0.045);
      ctx.strokeStyle = INK;
      ctx.strokeText(ch, x, y);
    } else {
      ctx.fillStyle = INK;
      ctx.fillText(ch, x, y);
    }
  }

  function drawRowCanvas(ctx, s, items, y, central) {
    if (!items.length) return;
    const gap = (central ? 8 : 10) * s;
    ctx.textBaseline = central ? "middle" : "alphabetic";
    const widths = items.map((it) => {
      ctx.font = WEIGHT + " " + (it.size * s) + "px " + FONT;
      return ctx.measureText(it.ch).width;
    });
    const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = (VB / 2) * s - total / 2;
    items.forEach((it, i) => {
      const w = widths[i];
      ctx.font = WEIGHT + " " + (it.size * s) + "px " + FONT;
      inkCanvas(ctx, it.ch, x + w / 2, y, it.size * s);
      x += w + gap;
    });
  }

  function drawClassicCanvas(ctx, s, v) {
    const items = [];
    if (v.l) items.push({ ch: v.l, size: 116 });
    if (v.c) items.push({ ch: v.c, size: 196 });
    if (v.r) items.push({ ch: v.r, size: 116 });
    if (!items.length) return;
    const maxSize = Math.max.apply(null, items.map((it) => it.size));
    drawRowCanvas(ctx, s, items, (200 + maxSize * 0.36) * s, false);
  }

  function drawStackedCanvas(ctx, s, v) {
    const present = [v.l, v.c, v.r].filter(Boolean);
    const n = present.length;
    if (!n) return;
    ctx.textBaseline = "middle";
    const size = n >= 3 ? 150 : (n === 2 ? 180 : 220);
    const lineH = size * 0.82 * s;
    const firstCY = 200 * s - (n - 1) * lineH / 2;
    ctx.font = WEIGHT + " " + (size * s) + "px " + FONT;
    present.forEach((ch, i) => {
      inkCanvas(ctx, ch, 200 * s, firstCY + i * lineH, size * s);
    });
  }

  function drawCircleCanvas(ctx, s, v) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = (state.style === "solid" ? 6 : 5) * s;
    ctx.beginPath();
    ctx.arc(200 * s, 200 * s, 186 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.arc(200 * s, 200 * s, 171 * s, 0, Math.PI * 2);
    ctx.stroke();
    const items = [];
    if (v.l) items.push({ ch: v.l, size: 78 });
    if (v.c) items.push({ ch: v.c, size: 132 });
    if (v.r) items.push({ ch: v.r, size: 78 });
    drawRowCanvas(ctx, s, items, 200 * s, true);
  }

  function downloadPNG() {
    whenFontReady(function () {
      const v = vals();
      const size = 1600;
      const s = size / VB; // 4x
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.textAlign = "center";
      ctx.lineJoin = "round";

      if (v.l || v.c || v.r) {
        if (state.layout === "stacked") drawStackedCanvas(ctx, s, v);
        else if (state.layout === "circle") drawCircleCanvas(ctx, s, v);
        else drawClassicCanvas(ctx, s, v);
      }

      const slug = (v.l + v.c + v.r).toLowerCase() || "initials";
      canvas.toBlob(function (blob) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "monogram-" + slug + ".png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }, "image/png");
    });
  }

  /* ---------- print (isolated #pt-print-root surface) ---------- */

  function printMonogram() {
    const root = byId("pt-print-root");
    if (!root) { window.print(); return; }
    const v = vals();
    const initials = (v.l + v.c + v.r) || "Monogram";
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";
    const h = document.createElement("h2");
    h.className = "bubble-print-title";
    h.textContent = "Monogram — " + initials;
    wrap.appendChild(h);
    const holder = document.createElement("div");
    holder.className = "pt-design-print-holder";
    holder.appendChild(buildMonogramSVG());
    wrap.appendChild(holder);
    root.appendChild(wrap);
    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    root.innerHTML = "";
  }

  /* ---------- swatch groups (radiogroup pill pattern) ---------- */

  // Small preview icons injected into each swatch's .pt-swatch-art slot.
  function miniSVG() {
    return svgEl("svg", { viewBox: "0 0 44 44", class: "pt-swatch-svg", "aria-hidden": "true" });
  }
  function miniText(parent, ch, x, y, size, outline) {
    const t = svgEl("text", {
      x: x, y: y, "text-anchor": "middle",
      "font-family": FONT, "font-weight": WEIGHT, "font-size": size
    });
    if (outline) {
      t.setAttribute("fill", "#ffffff");
      t.setAttribute("stroke", INK);
      t.setAttribute("stroke-width", "2");
      t.setAttribute("stroke-linejoin", "round");
      t.setAttribute("paint-order", "stroke");
    } else {
      t.setAttribute("fill", INK);
    }
    t.textContent = ch;
    parent.appendChild(t);
  }
  function layoutIcon(value) {
    const s = miniSVG();
    if (value === "stacked") {
      miniText(s, "A", 22, 15, 12);
      miniText(s, "B", 22, 27, 12);
      miniText(s, "C", 22, 39, 12);
    } else if (value === "circle") {
      s.appendChild(svgEl("circle", { cx: 22, cy: 22, r: 19, fill: "none", stroke: INK, "stroke-width": 2.5 }));
      s.appendChild(svgEl("circle", { cx: 22, cy: 22, r: 15.5, fill: "none", stroke: INK, "stroke-width": 1.2 }));
      miniText(s, "B", 22, 28, 17);
    } else {
      miniText(s, "A", 9, 30, 13);
      miniText(s, "B", 22, 32, 22);
      miniText(s, "C", 35, 30, 13);
    }
    return s;
  }
  function styleIcon(value) {
    const s = miniSVG();
    miniText(s, "M", 22, 33, 30, value === "outline");
    return s;
  }

  function wireSwatchGroup(group, field, iconFor) {
    if (!group) return;
    const buttons = Array.prototype.slice.call(group.querySelectorAll(".pt-swatch"));
    if (!buttons.length) return;
    const preset = buttons.filter((b) => b.classList.contains("is-active"))[0] || buttons[0];
    if (preset) state[field] = preset.dataset.value;
    buttons.forEach((b) => {
      const slot = b.querySelector(".pt-swatch-art");
      if (slot && iconFor) { slot.innerHTML = ""; slot.appendChild(iconFor(b.dataset.value)); }
      const on = b === preset;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.addEventListener("click", function () {
        state[field] = b.dataset.value;
        buttons.forEach((o) => {
          const active = o === b;
          o.classList.toggle("is-active", active);
          o.setAttribute("aria-checked", active ? "true" : "false");
        });
        render();
      });
    });
  }

  /* ---------- inputs ---------- */

  function wireInput(id) {
    const el = byId(id);
    if (!el) return;
    el.addEventListener("input", function () {
      const up = el.value.toUpperCase();
      if (el.value !== up) el.value = up;
      schedule();
    });
  }

  /* ---------- init ---------- */

  function init() {
    wireInput("mono-left");
    wireInput("mono-center");
    wireInput("mono-right");
    wireSwatchGroup(byId("mono-layout-group"), "layout", layoutIcon);
    wireSwatchGroup(byId("mono-style-group"), "style", styleIcon);

    const printBtn = byId("mono-print");
    if (printBtn) printBtn.addEventListener("click", printMonogram);
    const pngBtn = byId("mono-png");
    if (pngBtn) pngBtn.addEventListener("click", downloadPNG);

    render();
    // Re-render once Playfair loads so measured positions are exact.
    whenFontReady(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
