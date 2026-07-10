/* ==========================================================================
   UltraTextGen — curvedTextController.js
   Wires the /curved-text/ page controls to the curvedText.js SVG builder.
   Optionally runs the text through the Unicode style engine first, so users
   can curve bold / script / rune text, not just plain letters.

   Requires (loaded before this): curvedText.js, and optionally styles.js +
   renderer.js for the Unicode style dropdown.
   ========================================================================== */

(function () {
  "use strict";

  var Curved = window.UltraCurvedText;
  var Render = window.UltraTextGenRender;
  var stylesRegistry = window.textStyles || {};
  if (!Curved) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Curated Unicode styles that read well on a curve. Only names that exist
  // in the registry are shown, so this stays correct as the registry changes.
  var STYLE_CHOICES = [
    ["", "Normal"],
    ["Ultra Bold", "Bold"],
    ["Ultra Italic", "Italic"],
    ["Ultra Script", "Script"],
    ["Ultra Gothic", "Gothic"],
    ["Ultra Bubble", "Bubble"],
    ["Ultra Fullwidth", "Fullwidth"],
    ["Ultra Runic", "Runic"],
    ["Ultra Faux Cyrillic", "Faux Cyrillic"]
  ];

  var FONT_CHOICES = [
    ["system-ui, sans-serif", "Sans"],
    ["Georgia, 'Times New Roman', serif", "Serif"],
    ["'Courier New', monospace", "Mono"],
    ["'Brush Script MT', cursive", "Cursive"]
  ];

  var el = {};

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function fillSelect(select, choices, isStyle) {
    if (!select) return;
    select.innerHTML = "";
    choices.forEach(function (pair) {
      var val = pair[0];
      if (isStyle && val && !stylesRegistry[val]) return; // skip missing styles
      var opt = document.createElement("option");
      opt.value = val;
      opt.textContent = pair[1];
      select.appendChild(opt);
    });
  }

  var FAMILY_ORDER = ["circular", "flow", "geometric", "novelty"];

  function populateShapeSelect(select) {
    if (!select) return;
    select.innerHTML = "";
    var shapes = Curved.SHAPES || [];
    var familyLabels = Curved.FAMILY_LABELS || {};
    FAMILY_ORDER.forEach(function (familyKey) {
      var inFamily = shapes.filter(function (shape) { return shape.family === familyKey; });
      if (!inFamily.length) return;
      var group = document.createElement("optgroup");
      group.label = familyLabels[familyKey] || familyKey;
      inFamily.forEach(function (shape) {
        var opt = document.createElement("option");
        opt.value = shape.key;
        opt.textContent = shape.label;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });
  }

  function updateLinesHint() {
    var hint = el.linesHint;
    if (!hint) return;
    var key = el.direction ? el.direction.value : "arch";
    var shapes = Curved.SHAPES || [];
    var shape = null;
    for (var i = 0; i < shapes.length; i++) {
      if (shapes[i].key === key) { shape = shapes[i]; break; }
    }
    var maxLines = shape ? shape.maxLines : 1;
    hint.textContent = maxLines === 1
      ? "This shape supports up to 1 line"
      : "This shape supports up to " + maxLines + " lines";
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function transform(text) {
    var key = el.style ? el.style.value : "";
    if (!key || !Render || typeof Render.renderAny !== "function") return text;
    var style = stylesRegistry[key];
    if (!style) return text;
    try { return Render.renderAny(text, style); } catch (e) { return text; }
  }

  var lastSvg = "";

  function render() {
    if (!el.preview) return;
    var raw = el.input ? el.input.value : "";
    var text = transform(raw || "Curved text");

    var result = Curved.build({
      text: text,
      shape: el.direction ? el.direction.value : "arch",
      intensity: num(el.curve ? el.curve.value : 55, 55) / 100,
      fontSize: num(el.size ? el.size.value : 36, 36),
      fontFamily: el.font ? el.font.value : "system-ui, sans-serif",
      fontWeight: el.bold && el.bold.checked ? "bold" : "normal",
      fill: el.color ? el.color.value : "#111111",
      letterSpacing: num(el.spacing ? el.spacing.value : 0, 0)
    });

    lastSvg = result.svg;
    el.preview.innerHTML = result.svg;
    updateLinesHint();
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

  function copySvg() {
    if (!lastSvg) return;
    var done = function () { toast("SVG copied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastSvg).then(done, function () { fallbackCopy(lastSvg, done); });
    } else {
      fallbackCopy(lastSvg, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadSvg() {
    if (!lastSvg) return;
    downloadBlob(new Blob([lastSvg], { type: "image/svg+xml" }), "curved-text.svg");
    toast("SVG downloaded");
  }

  function downloadPng() {
    if (!lastSvg) return;
    var svgNode = el.preview.querySelector("svg");
    var w = svgNode ? num(svgNode.getAttribute("width"), 600) : 600;
    var h = svgNode ? num(svgNode.getAttribute("height"), 300) : 300;
    var scale = 2; // retina-crisp export
    var img = new Image();
    var blob = new Blob([lastSvg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      var ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (pngBlob) {
        if (pngBlob) { downloadBlob(pngBlob, "curved-text.png"); toast("PNG downloaded"); }
      }, "image/png");
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast("PNG export failed"); };
    img.src = url;
  }

  ready(function () {
    el.input = $("#curvedInput");
    el.style = $("#curvedStyle");
    el.direction = $("#curvedDirection");
    el.curve = $("#curvedCurve");
    el.size = $("#curvedSize");
    el.bold = $("#curvedBold");
    el.font = $("#curvedFont");
    el.color = $("#curvedColor");
    el.spacing = $("#curvedSpacing");
    el.preview = $("#curvedPreview");
    el.toast = $("#curvedToast");
    el.linesHint = $("#curvedLinesHint");

    fillSelect(el.style, STYLE_CHOICES, true);
    fillSelect(el.font, FONT_CHOICES, false);
    populateShapeSelect(el.direction);

    [el.input, el.style, el.direction, el.curve, el.size, el.bold, el.font, el.color, el.spacing]
      .forEach(function (node) {
        if (!node) return;
        var ev = (node.tagName === "TEXTAREA" || node.type === "range" || node.type === "color") ? "input" : "change";
        node.addEventListener(ev, render);
      });

    var copyBtn = $("#curvedCopySvg");
    var svgBtn = $("#curvedDownloadSvg");
    var pngBtn = $("#curvedDownloadPng");
    if (copyBtn) copyBtn.addEventListener("click", copySvg);
    if (svgBtn) svgBtn.addEventListener("click", downloadSvg);
    if (pngBtn) pngBtn.addEventListener("click", downloadPng);

    render();
  });
})();
