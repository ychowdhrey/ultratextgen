/* ==========================================================================
   UltraTextGen — asciiBannerController.js
   Wires the /ascii-art-generator/ page to asciiBannerFonts.js. Live-renders a
   FIGlet-style block-letter banner as the user types and lets them switch
   between font styles one at a time. Reuses the shared copy/toast helper from
   symbol-explorer.js (UltraTextGen.copyText) rather than reinventing clipboard
   handling — same as asciiConverterController.js.

   Requires (loaded before this): asciiBannerFonts.js, and symbol-explorer.js
   for the shared copy/toast helper (falls back to the Clipboard API alone if
   it isn't present).
   ========================================================================== */

(function () {
  "use strict";

  var Banner = window.UTG_ASCII_BANNER_FONTS;
  if (!Banner) return;

  var el = {};
  var currentFont = Banner.fonts.length ? Banner.fonts[0].key : "standard";
  var lastArt = "";

  function $(sel, root) { return (root || document).querySelector(sel); }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function renderArt() {
    var raw = el.input ? el.input.value : "";
    lastArt = Banner.render(raw, currentFont);
    if (el.output) {
      el.output.textContent = lastArt || "";
    }
    if (el.empty) {
      el.empty.hidden = !!raw.trim();
    }
  }

  function buildPicker() {
    if (!el.picker) return;
    Banner.fonts.forEach(function (font) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ascii-font-tab" + (font.key === currentFont ? " active" : "");
      btn.setAttribute("data-font", font.key);
      btn.setAttribute("aria-pressed", font.key === currentFont ? "true" : "false");

      var name = document.createElement("span");
      name.className = "ascii-font-tab-name";
      name.textContent = font.name;
      btn.appendChild(name);

      var desc = document.createElement("span");
      desc.className = "ascii-font-tab-desc";
      desc.textContent = font.description;
      btn.appendChild(desc);

      el.picker.appendChild(btn);
    });

    el.picker.addEventListener("click", function (e) {
      var btn = e.target.closest(".ascii-font-tab");
      if (!btn) return;
      var key = btn.getAttribute("data-font");
      if (!key || key === currentFont) return;
      currentFont = key;

      Array.prototype.forEach.call(el.picker.querySelectorAll(".ascii-font-tab"), function (b) {
        var isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      renderArt();
    });
  }

  function copyArt(btn) {
    if (!lastArt) return;
    var ns = window.UltraTextGen;
    if (ns && typeof ns.copyText === "function") {
      ns.copyText(lastArt, btn, "ASCII art");
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastArt);
    }
    btn.classList.add("copied");
    window.clearTimeout(btn._copiedTimer);
    btn._copiedTimer = window.setTimeout(function () {
      btn.classList.remove("copied");
    }, 1500);
  }

  ready(function () {
    el.input = $("#asciiBannerInput");
    el.picker = $("#asciiFontPicker");
    el.output = $("#asciiBannerOutput");
    el.empty = $("#asciiBannerEmpty");
    el.copyBtn = $("#asciiBannerCopy");

    buildPicker();

    if (el.input) el.input.addEventListener("input", renderArt);
    if (el.copyBtn) el.copyBtn.addEventListener("click", function () { copyArt(el.copyBtn); });

    renderArt();
  });
})();
