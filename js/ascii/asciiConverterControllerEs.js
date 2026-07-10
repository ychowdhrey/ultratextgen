/* ==========================================================================
   UltraTextGen — asciiConverterControllerEs.js
   Spanish-language wiring for /es/conversor-ascii/. A small fork of
   asciiConverterController.js with a translated strings table — kept
   separate so the shared English controller (asciiConverterController.js)
   stays untouched. Reuses asciiConverter.js unchanged (pure logic, no
   user-facing strings) and the shared copy/toast helper from
   symbol-explorer.js.

   Requires (loaded before this): asciiConverter.js, and symbol-explorer.js
   for the shared copy/toast helper (falls back to the Clipboard API alone
   if it isn't present).
   ========================================================================== */

(function () {
  "use strict";

  var Ascii = window.UltraAsciiConverter;
  if (!Ascii) return;

  var MODE_LABEL = {
    decimal: "decimal",
    hex: "hexadecimal",
    binary: "binario",
    octal: "octal"
  };

  var el = {};
  var lastValues = {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function renderEncode() {
    var raw = el.textInput ? el.textInput.value : "";
    var result = Ascii.encode(raw);

    lastValues.asciiDecimalOut = result.decimal;
    lastValues.asciiHexOut = result.hex;
    lastValues.asciiBinaryOut = result.binary;
    lastValues.asciiOctalOut = result.octal;

    if (el.decimalOut) el.decimalOut.textContent = result.decimal;
    if (el.hexOut) el.hexOut.textContent = result.hex;
    if (el.binaryOut) el.binaryOut.textContent = result.binary;
    if (el.octalOut) el.octalOut.textContent = result.octal;

    if (el.nonAsciiNote) {
      if (result.nonAsciiCount > 0) {
        var noun = result.nonAsciiCount === 1 ? "carácter" : "caracteres";
        el.nonAsciiNote.textContent =
          result.nonAsciiCount + " " + noun + " no-ASCII en tu texto" +
          " — se muestran con su punto de código Unicode completo en lugar de un código ASCII estándar.";
        el.nonAsciiNote.hidden = false;
      } else {
        el.nonAsciiNote.textContent = "";
        el.nonAsciiNote.hidden = true;
      }
    }
  }

  function renderDecode() {
    var raw = el.codeInput ? el.codeInput.value : "";
    var mode = el.decodeMode ? el.decodeMode.value : "auto";
    var result = Ascii.decode(raw, mode);

    lastValues.asciiDecodedOut = result.text;
    if (el.decodedOut) el.decodedOut.textContent = result.text;

    if (el.decodeNote) {
      if (!raw.trim()) {
        el.decodeNote.textContent = "";
      } else if (!result.mode) {
        el.decodeNote.textContent =
          "No se pudo detectar el formato — separa los códigos con espacios o comas, o elige un formato arriba.";
      } else if (!result.ok) {
        el.decodeNote.textContent =
          "Decodificado como " + MODE_LABEL[result.mode] + ", pero se omitieron código(s) inválido(s): " + result.invalidTokens.join(", ");
      } else if (mode === "auto") {
        el.decodeNote.textContent = "Detectado automáticamente como " + MODE_LABEL[result.mode] + ".";
      } else {
        el.decodeNote.textContent = "";
      }
    }
  }

  function copyOutput(btn) {
    var targetId = btn.getAttribute("data-copy-target");
    var label = btn.getAttribute("data-label") || "texto";
    var text = targetId ? lastValues[targetId] : "";
    if (!text) return;

    var ns = window.UltraTextGen;
    if (ns && typeof ns.copyText === "function") {
      ns.copyText(text, btn, label);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }

    btn.classList.add("copied");
    window.clearTimeout(btn._copiedTimer);
    btn._copiedTimer = window.setTimeout(function () {
      btn.classList.remove("copied");
    }, 1500);
  }

  ready(function () {
    el.textInput = $("#asciiTextInput");
    el.decimalOut = $("#asciiDecimalOut");
    el.hexOut = $("#asciiHexOut");
    el.binaryOut = $("#asciiBinaryOut");
    el.octalOut = $("#asciiOctalOut");
    el.nonAsciiNote = $("#asciiNonAsciiNote");

    el.codeInput = $("#asciiCodeInput");
    el.decodeMode = $("#asciiDecodeMode");
    el.decodeNote = $("#asciiDecodeNote");
    el.decodedOut = $("#asciiDecodedOut");

    if (el.textInput) el.textInput.addEventListener("input", renderEncode);
    if (el.codeInput) el.codeInput.addEventListener("input", renderDecode);
    if (el.decodeMode) el.decodeMode.addEventListener("change", renderDecode);

    $all(".ascii-copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { copyOutput(btn); });
    });

    renderEncode();
    renderDecode();
  });
})();
