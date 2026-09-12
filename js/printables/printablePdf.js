/* printablePdf.js — a PDF file from a printable, built in the browser.
   ------------------------------------------------------------------
   The print dialog's "Save as PDF" depends on the visitor finding that
   destination, and on mobile it often is not there at all. This module
   writes the PDF itself: every page of a sheet is rasterised in the
   visitor's own browser (native SVG foreignObject + Canvas, nothing
   bundled, no font binaries), and the raster pages are wrapped in a
   minimal PDF whose image streams are compressed with the browser's own
   CompressionStream (FlateDecode). Where CompressionStream is missing the
   page image is embedded as JPEG (DCTDecode) instead, so the file still
   opens everywhere.

   Loaded on demand by the printables engines (printablesEngine.js,
   monogramEngine.js, crossStitchEngine.js) the first time a visitor asks
   for a PDF, never on page load.

   Exposed as window.UltraTextGen.pdf:
     supported()                        -> boolean (the APIs exist)
     renderPages(rootEl, opts)          -> Promise<HTMLCanvasElement[]>
       rootEl must already be laid out in the document at the sheet's
       width. opts: { widthPx, pageHeightPx, scale }
     fromCanvases(canvases, opts)       -> Promise<Blob>
       opts: { paperIn: {w,h}, marginIn: {x,y}, title }
     download(blob, filename)

   Rasterising a DOM subtree paints it through an <img> whose source is an
   SVG document; browsers give that image no access to the page's fonts or
   stylesheets, so every computed style the sheet depends on is inlined
   onto a clone, and the web fonts the sheet uses are embedded as data
   URLs read from the page's own Google Fonts stylesheet. Safari taints a
   canvas drawn from such an image; renderPages() then rejects, and the
   engines fall back to the print dialog, which is what they did before. */
(function () {
  "use strict";
  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  if (UTG.pdf) return;

  const CSS_PX_PER_IN = 96;
  const PT_PER_IN = 72;
  const enc = new TextEncoder();

  /* ---------------- fonts ---------------- */

  const faceCache = new Map(); // url -> Promise<string data URL>
  let facesPromise = null;     // Promise<Array<{family, weight, style, ranges, url}>>

  function parseRanges(str) {
    return String(str || "").split(",").map((r) => {
      const m = r.trim().match(/^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i);
      if (!m) return null;
      if (m[1].includes("?")) {
        const lo = parseInt(m[1].replace(/\?/g, "0"), 16), hi = parseInt(m[1].replace(/\?/g, "F"), 16);
        return [lo, hi];
      }
      const lo = parseInt(m[1], 16);
      return [lo, m[2] ? parseInt(m[2], 16) : lo];
    }).filter(Boolean);
  }

  function parseFaces(css) {
    const out = [];
    const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
    blocks.forEach((b) => {
      const fam = (b.match(/font-family:\s*['"]?([^;'"]+)['"]?/) || [])[1];
      const url = (b.match(/src:\s*url\(([^)]+)\)/) || [])[1];
      if (!fam || !url) return;
      out.push({
        family: fam.trim(),
        weight: (b.match(/font-weight:\s*([^;]+)/) || [, "400"])[1].trim(),
        style: (b.match(/font-style:\s*([^;]+)/) || [, "normal"])[1].trim(),
        ranges: parseRanges((b.match(/unicode-range:\s*([^;]+)/) || [])[1]),
        url: url.replace(/^['"]|['"]$/g, "")
      });
    });
    return out;
  }

  function loadFaces() {
    if (facesPromise) return facesPromise;
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]'));
    facesPromise = Promise.all(links.map((l) => fetch(l.href, { mode: "cors" }).then((r) => (r.ok ? r.text() : "")).catch(() => "")))
      .then((texts) => texts.map(parseFaces).reduce((a, b) => a.concat(b), []));
    return facesPromise;
  }

  function faceData(face) {
    if (!faceCache.has(face.url)) {
      faceCache.set(face.url, fetch(face.url, { mode: "cors" }).then((r) => r.blob()).then((blob) => new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      })));
    }
    return faceCache.get(face.url);
  }

  function rangeHits(ranges, codes) {
    if (!ranges.length) return true;
    for (const c of codes) for (const r of ranges) if (c >= r[0] && c <= r[1]) return true;
    return false;
  }

  // @font-face CSS for the families the subtree renders, restricted to the
  // weights and Unicode subsets its text actually needs.
  async function fontCssFor(families, weights, text) {
    const faces = await loadFaces();
    const codes = new Set();
    for (const ch of text) codes.add(ch.codePointAt(0));
    const wanted = faces.filter((f) => families.has(f.family.toLowerCase()) && rangeHits(f.ranges, codes)
      && (weights.size === 0 || weights.has(f.weight) || f.weight.includes(" ")));
    const parts = await Promise.all(wanted.map(async (f) => {
      try {
        const data = await faceData(f);
        const fmt = /\.woff2/.test(f.url) ? "woff2" : (/\.woff/.test(f.url) ? "woff" : "truetype");
        return "@font-face{font-family:'" + f.family + "';font-style:" + f.style + ";font-weight:" + f.weight + ";src:url(" + data + ") format('" + fmt + "');}";
      } catch (err) { return ""; }
    }));
    return parts.join("\n");
  }

  /* ---------------- DOM -> image ---------------- */

  const PROPS = [
    "display", "position", "top", "left", "right", "bottom", "width", "height", "min-width", "min-height", "max-width", "max-height",
    "box-sizing", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border-top-width", "border-top-style", "border-top-color", "border-right-width", "border-right-style", "border-right-color",
    "border-bottom-width", "border-bottom-style", "border-bottom-color", "border-left-width", "border-left-style", "border-left-color",
    "border-radius", "background-color", "background-image", "background-size", "background-position", "background-repeat",
    "color", "font-family", "font-size", "font-weight", "font-style", "font-variant", "line-height", "letter-spacing", "word-spacing",
    "text-align", "text-transform", "text-decoration", "text-indent", "white-space", "vertical-align", "direction", "opacity", "overflow",
    "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "justify-content", "align-items", "align-content", "align-self",
    "gap", "row-gap", "column-gap", "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "grid-auto-flow", "grid-auto-rows", "order",
    "transform", "transform-origin", "visibility", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
    "stroke-opacity", "paint-order", "text-anchor", "dominant-baseline", "list-style-type", "writing-mode", "float", "clear", "border-collapse", "border-spacing"
  ];

  function inlineStyles(src, dst, meta) {
    const cs = window.getComputedStyle(src);
    const bits = [];
    for (const p of PROPS) {
      const v = cs.getPropertyValue(p);
      if (v && v !== "" ) bits.push(p + ":" + v);
    }
    if (bits.length) dst.setAttribute("style", bits.join(";"));
    const fam = cs.getPropertyValue("font-family");
    if (fam) fam.split(",").forEach((f) => meta.families.add(f.trim().replace(/^['"]|['"]$/g, "").toLowerCase()));
    const w = cs.getPropertyValue("font-weight");
    if (w) meta.weights.add(w === "bold" ? "700" : (w === "normal" ? "400" : w));
    const sc = src.children, dc = dst.children;
    for (let i = 0; i < sc.length && i < dc.length; i++) inlineStyles(sc[i], dc[i], meta);
  }

  function serialize(el) {
    let xml = new XMLSerializer().serializeToString(el);
    // HTML entities that XML does not know; the serializer emits a few.
    xml = xml.replace(/&nbsp;/g, "&#160;").replace(/&copy;/g, "&#169;");
    return xml;
  }

  async function subtreeToImage(el, widthPx, heightPx) {
    const clone = el.cloneNode(true);
    const meta = { families: new Set(), weights: new Set() };
    inlineStyles(el, clone, meta);
    clone.querySelectorAll("script, .pt-print-tools, .pt-toast").forEach((n) => n.remove());
    const fontCss = await fontCssFor(meta.families, meta.weights, el.textContent || "");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + widthPx + '" height="' + heightPx + '">' +
      '<style>' + fontCss + '</style>' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + widthPx + 'px;height:' + heightPx + 'px;overflow:hidden;background:#ffffff;margin:0;padding:0">' +
      serialize(clone) + '</div></foreignObject></svg>';
    const img = new Image();
    img.decoding = "sync";
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("sheet image failed to load"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
    return img;
  }

  function blankCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // Elements a page cut must never pass through.
  const ATOMS = ".cursive-print-row, .pt-name-row, .pt-gen-row, .pt-tile-cell, .pt-glyph-cell, .bubble-outline, .pt-word-outline, .pt-trace-svg, .pt-puzzle-sheet, .bubble-print-single, .pt-banner-cell, .pt-banner-gap, h2, h3, p, li";
  const PAGES = ".pt-sheet-page, .bubble-print-book-page, .pt-tile-page, .pt-banner-page";

  function cutPoints(root, total, pageH) {
    const r0 = root.getBoundingClientRect().top;
    const atoms = Array.from(root.querySelectorAll(ATOMS)).map((a) => {
      const r = a.getBoundingClientRect();
      return { top: r.top - r0, bottom: r.bottom - r0 };
    }).filter((a) => a.bottom > a.top);
    const candidates = Array.from(new Set(atoms.map((a) => a.bottom).concat(atoms.map((a) => a.top)))).sort((a, b) => a - b);
    const cuts = [];
    let start = 0;
    while (start < total - 1) {
      const limit = start + pageH;
      if (limit >= total) { cuts.push([start, total]); break; }
      let best = null;
      for (const p of candidates) {
        if (p <= start + 1 || p > limit) continue;
        const straddles = atoms.some((a) => a.top < p - 0.5 && a.bottom > p + 0.5);
        if (!straddles) best = p;
      }
      const end = best != null ? best : limit;
      cuts.push([start, end]);
      start = end;
    }
    return cuts;
  }

  async function renderPages(root, opts) {
    const o = opts || {};
    const scale = o.scale || 2;
    const widthPx = o.widthPx || Math.round(root.getBoundingClientRect().width);
    const pageH = o.pageHeightPx || Math.round(widthPx * 11 / 8.5);
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (err) { /* proceed */ } }
    const out = [];
    const explicit = Array.from(root.querySelectorAll(PAGES)).filter((p) => !p.parentElement.closest(PAGES));
    if (explicit.length) {
      for (const page of explicit) {
        const h = Math.ceil(page.getBoundingClientRect().height);
        const img = await subtreeToImage(page, widthPx, h);
        const fit = Math.min(1, pageH / h);
        const canvas = blankCanvas(widthPx * scale, pageH * scale);
        const ctx = canvas.getContext("2d");
        const dw = widthPx * fit * scale, dh = h * fit * scale;
        ctx.drawImage(img, (canvas.width - dw) / 2, 0, dw, dh);
        ctx.getImageData(0, 0, 1, 1); // throws on a tainted canvas (Safari): let the caller fall back
        out.push(canvas);
      }
      return out;
    }
    const total = Math.ceil(root.getBoundingClientRect().height);
    const img = await subtreeToImage(root, widthPx, total);
    const cuts = cutPoints(root, total, pageH);
    for (const [start, end] of cuts) {
      const canvas = blankCanvas(widthPx * scale, pageH * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, start, widthPx, end - start, 0, 0, widthPx * scale, (end - start) * scale);
      ctx.getImageData(0, 0, 1, 1);
      out.push(canvas);
    }
    return out;
  }

  /* ---------------- canvases -> PDF ---------------- */

  async function deflate(bytes) {
    if (typeof CompressionStream === "undefined") return null;
    try {
      const cs = new CompressionStream("deflate");
      const writer = cs.writable.getWriter();
      writer.write(bytes); writer.close();
      const buf = await new Response(cs.readable).arrayBuffer();
      return new Uint8Array(buf);
    } catch (err) { return null; }
  }

  async function imageStream(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext("2d");
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const rgb = new Uint8Array(w * h * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) { rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2]; }
    const flate = await deflate(rgb);
    if (flate) return { filter: "/FlateDecode", bytes: flate };
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    return { filter: "/DCTDecode", bytes: new Uint8Array(await blob.arrayBuffer()) };
  }

  function pdfHexString(str) {
    let hex = "FEFF";
    for (const ch of String(str)) {
      let cp = ch.codePointAt(0);
      if (cp > 0xFFFF) { cp -= 0x10000; hex += (0xD800 + (cp >> 10)).toString(16).padStart(4, "0") + (0xDC00 + (cp & 0x3FF)).toString(16).padStart(4, "0"); }
      else hex += cp.toString(16).padStart(4, "0");
    }
    return "<" + hex.toUpperCase() + ">";
  }

  async function fromCanvases(canvases, opts) {
    const o = opts || {};
    const paper = o.paperIn || { w: 8.5, h: 11 };
    const margin = o.marginIn || { x: 0.5, y: 0.5 };
    const W = paper.w * PT_PER_IN, H = paper.h * PT_PER_IN;
    const boxW = W - 2 * margin.x * PT_PER_IN, boxH = H - 2 * margin.y * PT_PER_IN;

    const parts = []; let offset = 0; const offsets = [];
    const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); offset += b.length; };
    const obj = (num, body) => { offsets[num] = offset; push(num + " 0 obj\n" + body + "\nendobj\n"); };
    const streamObj = (num, dict, bytes) => { offsets[num] = offset; push(num + " 0 obj\n" + dict + "\nstream\n"); push(bytes); push("\nendstream\nendobj\n"); };

    push("%PDF-1.4\n"); push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    const n = canvases.length;
    const pageNum = (i) => 4 + i * 3, contentNum = (i) => 5 + i * 3, imageNum = (i) => 6 + i * 3;
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [" + canvases.map((c, i) => pageNum(i) + " 0 R").join(" ") + "] /Count " + n + " >>");
    const d = new Date();
    const stamp = "D:" + d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0") +
      String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") + String(d.getUTCSeconds()).padStart(2, "0") + "Z";
    obj(3, "<< /Producer (UltraTextGen printables) /Creator (ultratextgen.com) /Title " + pdfHexString(o.title || document.title || "Printable") + " /CreationDate (" + stamp + ") >>");

    for (let i = 0; i < n; i++) {
      const c = canvases[i];
      const img = await imageStream(c);
      let dw = boxW, dh = boxW * c.height / c.width;
      if (dh > boxH) { dh = boxH; dw = boxH * c.width / c.height; }
      const x = margin.x * PT_PER_IN + (boxW - dw) / 2;
      const y = H - margin.y * PT_PER_IN - dh;
      obj(pageNum(i), "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W.toFixed(2) + " " + H.toFixed(2) + "] /Resources << /XObject << /Im0 " + imageNum(i) + " 0 R >> >> /Contents " + contentNum(i) + " 0 R >>");
      const content = "q " + dw.toFixed(2) + " 0 0 " + dh.toFixed(2) + " " + x.toFixed(2) + " " + y.toFixed(2) + " cm /Im0 Do Q";
      streamObj(contentNum(i), "<< /Length " + enc.encode(content).length + " >>", enc.encode(content));
      streamObj(imageNum(i), "<< /Type /XObject /Subtype /Image /Width " + c.width + " /Height " + c.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter " + img.filter + " /Length " + img.bytes.length + " >>", img.bytes);
    }
    const count = 4 + n * 3;
    const xref = offset;
    let table = "xref\n0 " + count + "\n0000000000 65535 f \n";
    for (let k = 1; k < count; k++) table += String(offsets[k]).padStart(10, "0") + " 00000 n \n";
    push(table);
    push("trailer\n<< /Size " + count + " /Root 1 0 R /Info 3 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    return new Blob(parts, { type: "application/pdf" });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename || "printable.pdf";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function supported() {
    return typeof XMLSerializer !== "undefined" && typeof TextEncoder !== "undefined" &&
      !!(window.HTMLCanvasElement && HTMLCanvasElement.prototype.toBlob) && typeof fetch === "function";
  }

  UTG.pdf = { supported, renderPages, fromCanvases, download, CSS_PX_PER_IN };
})();
