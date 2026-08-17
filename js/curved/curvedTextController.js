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

  // Optional page-level translations (see js/vertical/verticalPageController.js
  // for the same pattern). Undefined on the EN page, so every lookup below
  // falls back to the English default and behavior is unchanged there.
  var I18N = window.curvedI18n || {};

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Curated Unicode styles that read well on a curve. Only names that exist
  // in the registry are shown, so this stays correct as the registry changes.
  var STYLE_CHOICES = [
    ["", I18N.styleNormal || "Normal"],
    ["Ultra Bold", I18N.styleBold || "Bold"],
    ["Ultra Italic", I18N.styleItalic || "Italic"],
    ["Ultra Script", I18N.styleScript || "Script"],
    ["Ultra Gothic", I18N.styleGothic || "Gothic"],
    ["Ultra Bubble", I18N.styleBubble || "Bubble"],
    ["Ultra Fullwidth", I18N.styleFullwidth || "Fullwidth"],
    ["Ultra Runic", I18N.styleRunic || "Runic"],
    ["Ultra Faux Cyrillic", I18N.styleFauxCyrillic || "Faux Cyrillic"]
  ];

  var FONT_CHOICES = [
    ["system-ui, sans-serif", I18N.fontSans || "Sans"],
    ["Georgia, 'Times New Roman', serif", I18N.fontSerif || "Serif"],
    ["'Courier New', monospace", I18N.fontMono || "Mono"],
    ["'Brush Script MT', cursive", I18N.fontCursive || "Cursive"]
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
      var familyI18n = I18N.familyLabels || {};
      group.label = familyI18n[familyKey] || familyLabels[familyKey] || familyKey;
      var shapeI18n = I18N.shapeLabels || {};
      inFamily.forEach(function (shape) {
        var opt = document.createElement("option");
        opt.value = shape.key;
        opt.textContent = shapeI18n[shape.key] || shape.label;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });
  }

  // Real browser measurement (not an estimate): compares each rendered
  // <textPath>'s actual advance width against its <path>'s actual length, so
  // shapes with a fixed, non-text-scaling outline (heart/star/diamond/bulge)
  // can warn instead of silently dropping characters past the path's end.
  function hasPathOverflow() {
    if (!el.preview) return false;
    var svg = el.preview.querySelector("svg");
    if (!svg) return false;
    var textPaths = svg.querySelectorAll("textPath");
    for (var i = 0; i < textPaths.length; i++) {
      var textPathEl = textPaths[i];
      var href = textPathEl.getAttribute("href") || textPathEl.getAttribute("xlink:href");
      if (!href) continue;
      var pathEl = svg.querySelector(href);
      if (!pathEl) continue;
      try {
        var textLen = textPathEl.getComputedTextLength();
        var pathLen = pathEl.getTotalLength();
        if (textLen > pathLen + 1) return true;
      } catch (e) { /* pre-layout measurement can throw in rare cases; ignore */ }
    }
    return false;
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
    var lineMsg = maxLines === 1
      ? (I18N.lineMsgOne || "This shape supports up to 1 line")
      : (I18N.lineMsgMany
          ? I18N.lineMsgMany.replace("{n}", maxLines)
          : "This shape supports up to " + maxLines + " lines");
    var overflowMsg = hasPathOverflow()
      ? (I18N.overflowMsg || " — your text is longer than this shape's outline, so some characters may not display. Try a shorter phrase or a higher curve amount.")
      : "";
    hint.textContent = lineMsg + overflowMsg;
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
    var text = transform(raw || I18N.demoText || "Curved text");

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
    var done = function () { toast(I18N.toastSvgCopied || "SVG copied"); };
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
    toast(I18N.toastSvgDownloaded || "SVG downloaded");
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
        if (pngBlob) { downloadBlob(pngBlob, "curved-text.png"); toast(I18N.toastPngDownloaded || "PNG downloaded"); }
      }, "image/png");
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast(I18N.toastPngFailed || "PNG export failed"); };
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
