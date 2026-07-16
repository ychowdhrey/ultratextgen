/* ==========================================================================
   UltraTextGen — oldRobloxController.js
   Wires the /roblox/old-roblox-font/ page controls to the oldRobloxText.js
   SVG builder and handles export. Same export technique as
   js/curved/curvedTextController.js: direct SVG Blob download, and PNG via
   drawing the SVG into an Image, onto a <canvas>, then canvas.toBlob().

   One addition the curved tool doesn't need: this page's presets use Google
   webfonts (Comic Neue / Baloo 2), and an SVG rasterized through an <img>
   cannot load external fonts. So before exporting, the Google Fonts CSS and
   its woff2 files are fetched (native fetch, client-side only) and inlined
   into the SVG as data: URIs — the download is self-contained without ever
   bundling a font binary in this repo.

   Requires (loaded before this): oldRobloxText.js.
   ========================================================================== */

(function () {
  "use strict";

  const Builder = window.UltraOldRobloxText;
  if (!Builder) return;

  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Only the weights the two presets actually use.
  const FONT_CSS_URL =
    "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Baloo+2:wght@800&display=swap";

  const el = {};
  let lastSvg = "";
  let lastWidth = 0;
  let lastHeight = 0;
  let embeddedCssPromise = null;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function num(v, fallback) {
    const n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function populatePresetSelect(select) {
    if (!select) return;
    select.innerHTML = "";
    Object.keys(Builder.PRESETS).forEach(function (key) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = Builder.PRESETS[key].label;
      select.appendChild(opt);
    });
  }

  function updatePresetNote() {
    if (!el.presetNote) return;
    const preset = Builder.PRESETS[el.preset ? el.preset.value : "chat"] || Builder.PRESETS.chat;
    el.presetNote.textContent = preset.note;
  }

  function render() {
    if (!el.preview) return;
    const raw = el.input ? el.input.value : "";
    const result = Builder.build({
      text: raw || "Old Roblox",
      preset: el.preset ? el.preset.value : "chat",
      fontSize: num(el.size ? el.size.value : 64, 64),
      fill: el.color ? el.color.value : "#e2231a"
    });
    lastSvg = result.svg;
    lastWidth = result.width;
    lastHeight = result.height;
    el.preview.innerHTML = result.svg;
    updatePresetNote();
  }

  function toast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add("is-visible");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () {
      el.toast.classList.remove("is-visible");
    }, 1600);
  }

  /* Fetch the Google Fonts stylesheet once, replace each font URL with a
     base64 data: URI, and cache the result. Falls back to an empty string
     (export still works, in a fallback font) if the network fetch fails. */
  function inlineFontCss() {
    if (!embeddedCssPromise) {
      embeddedCssPromise = fetch(FONT_CSS_URL)
        .then(function (res) {
          if (!res.ok) throw new Error("font css " + res.status);
          return res.text();
        })
        .then(function (css) {
          const urls = [];
          css.replace(/url\((https:[^)]+)\)/g, function (m, u) {
            if (urls.indexOf(u) === -1) urls.push(u);
            return m;
          });
          return Promise.all(urls.map(function (u) {
            return fetch(u)
              .then(function (r) {
                if (!r.ok) throw new Error("font file " + r.status);
                return r.blob();
              })
              .then(function (b) {
                return new Promise(function (resolve, reject) {
                  const fr = new FileReader();
                  fr.onload = function () { resolve([u, fr.result]); };
                  fr.onerror = reject;
                  fr.readAsDataURL(b);
                });
              });
          })).then(function (pairs) {
            let out = css;
            pairs.forEach(function (pair) {
              out = out.split(pair[0]).join(pair[1]);
            });
            return out;
          });
        })
        .catch(function () {
          embeddedCssPromise = null; // allow retry on the next export
          return "";
        });
    }
    return embeddedCssPromise;
  }

  function svgWithEmbeddedFonts() {
    const svg = lastSvg;
    return inlineFontCss().then(function (css) {
      if (!css) return svg;
      // Insert the <style> right after the opening <svg …> tag.
      return svg.replace(/>/, "><style>" + css + "</style>");
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  function copySvg() {
    if (!lastSvg) return;
    svgWithEmbeddedFonts().then(function (svg) {
      const done = function () { toast("SVG copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(svg).then(done, function () { fallbackCopy(svg, done); });
      } else {
        fallbackCopy(svg, done);
      }
    });
  }

  function downloadSvg() {
    if (!lastSvg) return;
    svgWithEmbeddedFonts().then(function (svg) {
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "old-roblox-font.svg");
      toast("SVG downloaded");
    });
  }

  function downloadPng() {
    if (!lastSvg) return;
    const w = lastWidth || 600;
    const h = lastHeight || 300;
    svgWithEmbeddedFonts().then(function (svg) {
      const scale = 2; // retina-crisp export
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (pngBlob) {
          if (pngBlob) { downloadBlob(pngBlob, "old-roblox-font.png"); toast("PNG downloaded"); }
        }, "image/png");
      };
      img.onerror = function () { URL.revokeObjectURL(url); toast("PNG export failed"); };
      img.src = url;
    });
  }

  ready(function () {
    el.input = $("#orfInput");
    el.preset = $("#orfPreset");
    el.size = $("#orfSize");
    el.color = $("#orfColor");
    el.preview = $("#orfPreview");
    el.presetNote = $("#orfPresetNote");
    el.toast = $("#orfToast");

    populatePresetSelect(el.preset);

    [el.input, el.preset, el.size, el.color].forEach(function (node) {
      if (!node) return;
      const ev = (node.tagName === "TEXTAREA" || node.type === "range" || node.type === "color") ? "input" : "change";
      node.addEventListener(ev, render);
    });

    const copyBtn = $("#orfCopySvg");
    const svgBtn = $("#orfDownloadSvg");
    const pngBtn = $("#orfDownloadPng");
    if (copyBtn) copyBtn.addEventListener("click", copySvg);
    if (svgBtn) svgBtn.addEventListener("click", downloadSvg);
    if (pngBtn) pngBtn.addEventListener("click", downloadPng);

    render();
    // Re-render once the Google webfonts finish loading, so the first paint's
    // fallback-font preview snaps to the real preset fonts.
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(render);
    }
  });
})();
