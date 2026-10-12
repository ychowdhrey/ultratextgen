/* ==========================================================================
   UltraTextGen — imageToAsciiController.js
   Wires /image-to-ascii/ to imageToAscii.js. Loads a picture from the file
   picker, a drop or a paste, draws it onto an offscreen Canvas at the sample
   size the engine asks for, and renders the text into a monospace <pre>.

   The picture is decoded and read in this tab only. Nothing is uploaded, and
   the copy event sends no part of the result (method "image_to_ascii" is not
   in header.js's CATALOGUE_COPY_METHODS, so copy_item stays undefined).

   Requires (loaded before this): imageToAscii.js, and symbol-explorer.js for
   the shared copy/toast helper (falls back to the Clipboard API alone).
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.UTG_IMAGE_TO_ASCII;
  if (!Engine) return;

  /* Discord's per-message limit for an account without Nitro; the same
     figure js/counter/counterRules.js uses for "discord-message". */
  const DISCORD_LIMIT = 2000;
  const FENCE_OPEN = "```\n";
  const FENCE_CLOSE = "\n```";
  const MIN_WIDTH = 20;
  const SAMPLE_W = 480;
  const SAMPLE_H = 330;

  const el = {};
  let source = null; /* a canvas holding the current picture at full size */
  let sourceName = "";
  let lastArt = "";
  let renderQueued = false;

  function $(sel) { return document.querySelector(sel); }

  function onReady(fn) {
    /* Keyed on "complete", not "loading": inside a deferred script
       readyState is already "interactive" while DOMContentLoaded has not
       fired yet, so waiting for it puts init after every deferred module. */
    if (document.readyState === "complete") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  function settings() {
    return {
      cols: Number(el.width.value) || 80,
      charset: el.charset.value,
      invert: el.invert.checked,
      brightness: Number(el.brightness.value) || 0,
      contrast: Number(el.contrast.value) || 0
    };
  }

  function renderWith(cols) {
    if (!source) return "";
    const s = settings();
    const size = Engine.sampleSize(source.width, source.height, cols, s.charset);
    const canvas = document.createElement("canvas");
    canvas.width = size.pw;
    canvas.height = size.ph;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.pw, size.ph);
    ctx.drawImage(source, 0, 0, size.pw, size.ph);
    const data = ctx.getImageData(0, 0, size.pw, size.ph).data;
    return Engine.convert(data, size.pw, size.ph, s);
  }

  /* Four leading spaces make a code block on both new and old Reddit;
     a fenced block only renders on the new site. */
  function redditBlock(text) {
    return text.split("\n").map(function (line) { return "    " + line; }).join("\n");
  }

  function fencedLength(text) {
    return FENCE_OPEN.length + text.length + FENCE_CLOSE.length;
  }

  function render() {
    renderQueued = false;
    lastArt = renderWith(Number(el.width.value) || 80);
    el.output.textContent = lastArt;
    /* The preview shows the art the way it will read: dark ink on a light
       page, or light text on a dark one once Invert is on. */
    if (el.wrap) el.wrap.classList.toggle("is-inverted", el.invert.checked);

    const lines = lastArt ? lastArt.split("\n").length : 0;
    const chars = lastArt.length;
    const fenced = fencedLength(lastArt);
    el.stats.textContent = chars.toLocaleString("en-US") + " characters, " +
      lines + " lines";

    const fits = fenced <= DISCORD_LIMIT;
    el.discord.textContent = fits
      ? "Fits in one Discord message as a code block (" +
        fenced.toLocaleString("en-US") + " of 2,000 characters)."
      : "Too long for one Discord message: " + fenced.toLocaleString("en-US") +
        " of 2,000 characters as a code block.";
    el.discord.classList.toggle("is-over", !fits);
    el.fit.hidden = fits;
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(render);
  }

  function syncOutputs() {
    el.widthOut.textContent = el.width.value;
    el.brightnessOut.textContent = el.brightness.value;
    el.contrastOut.textContent = el.contrast.value;
    const set = Engine.getCharset(el.charset.value);
    el.charsetNote.textContent = set.note;
  }

  function setStatus(text) {
    el.status.textContent = text;
  }

  function useCanvas(canvas, name) {
    source = canvas;
    sourceName = name;
    syncOutputs();
    render();
  }

  function loadSample() {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(SAMPLE_W, SAMPLE_H);
    img.data.set(Engine.sampleSphere(SAMPLE_W, SAMPLE_H));
    ctx.putImageData(img, 0, 0);
    useCanvas(canvas, "");
    setStatus("Showing a sample sphere. Load a picture to convert it.");
  }

  function loadFile(file) {
    if (!file) return;
    if (file.type && file.type.indexOf("image/") !== 0) {
      setStatus("That file is not an image. Try a JPG, PNG, GIF or WebP.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const name = file.name || "Pasted image";
      useCanvas(canvas, name);
      setStatus("Converted " + name + " (" + canvas.width + " × " +
        canvas.height + " px).");
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      setStatus("This browser could not read that image. Try saving it as a JPG or PNG first.");
    };
    img.src = url;
  }

  function firstImageFile(list) {
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const file = item.getAsFile ? (item.kind === "file" ? item.getAsFile() : null) : item;
      if (file && (!file.type || file.type.indexOf("image/") === 0)) return file;
    }
    return null;
  }

  function flash(btn) {
    btn.classList.add("copied");
    window.clearTimeout(btn._copiedTimer);
    btn._copiedTimer = window.setTimeout(function () {
      btn.classList.remove("copied");
    }, 1500);
  }

  function copy(text, btn, label) {
    if (!text) return;
    const ns = window.UltraTextGen;
    if (ns && typeof ns.copyText === "function") {
      ns.copyText(text, btn, label, "image_to_ascii");
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    flash(btn);
  }

  function download() {
    if (!lastArt) return;
    const blob = new Blob([lastArt + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (sourceName || "sample").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-") || "image";
    a.href = url;
    a.download = base + "-ascii.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    flash(el.download);
  }

  /* Largest width at or below the current one whose code block fits in one
     Discord message. Output length grows with width, so a binary search. */
  function fitDiscord() {
    /* Search in slider steps, so the width we settle on is one the slider
       can actually hold (it would snap an odd value up, past the limit). */
    const min = Number(el.width.min) || MIN_WIDTH;
    const step = Number(el.width.step) || 1;
    const widthAt = function (k) { return min + k * step; };
    let lo = 0;
    let hi = Math.max(0, Math.floor(((Number(el.width.value) || 80) - min) / step));
    if (fencedLength(renderWith(widthAt(lo))) > DISCORD_LIMIT) {
      el.width.value = String(widthAt(lo));
      syncOutputs();
      render();
      setStatus("Even at " + el.width.value + " characters wide this picture runs past 2,000 characters. " +
        "Braille dots keep the same detail at half the width, in about a quarter of the characters.");
      return;
    }
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fencedLength(renderWith(widthAt(mid))) <= DISCORD_LIMIT) lo = mid;
      else hi = mid - 1;
    }
    el.width.value = String(widthAt(lo));
    syncOutputs();
    render();
    setStatus("Width set to " + el.width.value + " characters so the code block fits in one Discord message.");
  }

  function bindDrop() {
    const zone = el.drop;
    ["dragenter", "dragover"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        zone.classList.add("is-dragging");
      });
    });
    ["dragleave", "dragend"].forEach(function (type) {
      zone.addEventListener(type, function () {
        zone.classList.remove("is-dragging");
      });
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("is-dragging");
      const file = firstImageFile(e.dataTransfer && e.dataTransfer.files);
      if (file) loadFile(file);
      else setStatus("Nothing to convert in that drop. Drop an image file.");
    });
    /* A drop that misses the zone would otherwise open the image in the tab
       and lose the page. */
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) {
      if (!zone.contains(e.target)) {
        e.preventDefault();
        const file = firstImageFile(e.dataTransfer && e.dataTransfer.files);
        if (file) loadFile(file);
      }
    });
  }

  function bindPaste() {
    document.addEventListener("paste", function (e) {
      const items = e.clipboardData && e.clipboardData.items;
      const file = firstImageFile(items);
      if (!file) return;
      e.preventDefault();
      loadFile(file);
    });
  }

  function init() {
    el.file = $("#i2aFile");
    el.drop = $("#i2aDrop");
    el.status = $("#i2aStatus");
    el.width = $("#i2aWidth");
    el.widthOut = $("#i2aWidthOut");
    el.charset = $("#i2aCharset");
    el.charsetNote = $("#i2aCharsetNote");
    el.invert = $("#i2aInvert");
    el.brightness = $("#i2aBrightness");
    el.brightnessOut = $("#i2aBrightnessOut");
    el.contrast = $("#i2aContrast");
    el.contrastOut = $("#i2aContrastOut");
    el.reset = $("#i2aReset");
    el.output = $("#i2aOutput");
    el.stats = $("#i2aStats");
    el.discord = $("#i2aDiscord");
    el.fit = $("#i2aFit");
    el.copy = $("#i2aCopy");
    el.copyBlock = $("#i2aCopyBlock");
    el.copyReddit = $("#i2aCopyReddit");
    el.wrap = el.output ? el.output.parentElement : null;
    el.download = $("#i2aDownload");
    if (!el.output || !el.width || !el.charset) return;

    el.file.addEventListener("change", function () {
      loadFile(el.file.files && el.file.files[0]);
      el.file.value = "";
    });
    [el.width, el.brightness, el.contrast].forEach(function (input) {
      input.addEventListener("input", function () { syncOutputs(); queueRender(); });
    });
    el.charset.addEventListener("change", function () { syncOutputs(); queueRender(); });
    el.invert.addEventListener("change", queueRender);
    el.reset.addEventListener("click", function () {
      el.brightness.value = "0";
      el.contrast.value = "0";
      el.invert.checked = false;
      syncOutputs();
      queueRender();
    });
    el.fit.addEventListener("click", fitDiscord);
    el.copy.addEventListener("click", function () { copy(lastArt, el.copy, "ASCII art"); });
    el.copyBlock.addEventListener("click", function () {
      copy(FENCE_OPEN + lastArt + FENCE_CLOSE, el.copyBlock, "ASCII art code block");
    });
    el.copyReddit.addEventListener("click", function () {
      copy(redditBlock(lastArt), el.copyReddit, "ASCII art for Reddit");
    });
    el.download.addEventListener("click", download);

    bindDrop();
    bindPaste();
    loadSample();
  }

  onReady(init);
})();
