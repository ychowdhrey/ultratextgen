/* ==========================================================================
   UltraTextGen - lettersToNumbersController.js
   Wires the /letters-to-numbers/ controls to lettersToNumbers.js.

   Requires (loaded before this, document order): lettersToNumbers.js. The
   copy event goes through UltraTextGen.trackCopy from header.js with the
   method "button", which sends copy_item_group only: what a visitor types
   never reaches the dataLayer (see header.js CATALOGUE_COPY_METHODS).
   ========================================================================== */
(function () {
  "use strict";

  const engine = window.UltraTextGen && window.UltraTextGen.lettersToNumbers;
  if (!engine) return;

  const COPIED_RESET_MS = 1500;

  const el = {};
  const lastValues = {};

  function byId(id) { return document.getElementById(id); }

  function plural(n, one, many) { return n === 1 ? one : many; }

  function options() {
    return { zeroBased: !!(el.zero && el.zero.checked) };
  }

  function range(opts) {
    return engine.firstNumber(opts) + " to " + engine.lastNumber(opts);
  }

  function renderEncode() {
    const opts = options();
    opts.separator = el.separator ? el.separator.value : "space";
    opts.keepOthers = el.keep ? el.keep.checked : true;
    const result = engine.encode(el.textInput ? el.textInput.value : "", opts);

    lastValues.l2nNumbersOut = result.text;
    if (el.numbersOut) el.numbersOut.textContent = result.text;

    if (el.encodeNote) {
      if (result.leftAsTyped > 0) {
        const n = result.leftAsTyped;
        el.encodeNote.textContent =
          n + " " + plural(n, "letter", "letters") + " outside A to Z " +
          plural(n, "was", "were") + (opts.keepOthers ? " left as typed." : " left out.") +
          " This converter counts the Latin alphabet only.";
        el.encodeNote.hidden = false;
      } else {
        el.encodeNote.textContent = "";
        el.encodeNote.hidden = true;
      }
    }
  }

  function renderDecode() {
    const raw = el.numberInput ? el.numberInput.value : "";
    const opts = options();
    const result = engine.decode(raw, opts);

    lastValues.l2nLettersOut = result.text;
    if (el.lettersOut) el.lettersOut.textContent = result.text;

    if (!el.decodeNote) return;
    if (result.outOfRange > 0) {
      const n = result.outOfRange;
      el.decodeNote.textContent =
        n + " " + plural(n, "number", "numbers") + " outside " + range(opts) +
        " " + plural(n, "is", "are") + " shown as typed.";
    } else if (raw.trim() && result.letterCount === 0) {
      el.decodeNote.textContent = "No numbers from " + range(opts) + " found. Separate them with spaces, commas or dashes.";
    } else {
      el.decodeNote.textContent = "";
    }
  }

  function renderAll() {
    renderEncode();
    renderDecode();
    if (el.rangeLabel) el.rangeLabel.textContent = range(options());
  }

  /* Clipboard write with the old textarea route as the fallback. Resolves
     true when the text reached the clipboard. */
  function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "l2n-offscreen";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  function flash(btn, className, label) {
    const original = btn.getAttribute("data-label-default") || btn.textContent;
    btn.setAttribute("data-label-default", original);
    btn.textContent = label;
    btn.classList.add(className);
    window.clearTimeout(btn._resetTimer);
    btn._resetTimer = window.setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove(className);
    }, COPIED_RESET_MS);
  }

  function copyOutput(btn) {
    const text = lastValues[btn.getAttribute("data-copy-target")];
    if (!text) return;
    writeClipboard(text).then(function (ok) {
      if (!ok) { flash(btn, "copy-error", "Copy failed"); return; }
      const ns = window.UltraTextGen;
      if (ns && typeof ns.trackCopy === "function") ns.trackCopy("button", text);
      flash(btn, "copied", "Copied");
    });
  }

  function init() {
    el.zero = byId("l2nZero");
    el.rangeLabel = byId("l2nRange");

    el.textInput = byId("l2nTextInput");
    el.separator = byId("l2nSeparator");
    el.keep = byId("l2nKeep");
    el.numbersOut = byId("l2nNumbersOut");
    el.encodeNote = byId("l2nEncodeNote");

    el.numberInput = byId("l2nNumberInput");
    el.lettersOut = byId("l2nLettersOut");
    el.decodeNote = byId("l2nDecodeNote");

    [el.textInput, el.numberInput].forEach(function (node) {
      if (node) node.addEventListener("input", renderAll);
    });
    [el.zero, el.separator, el.keep].forEach(function (node) {
      if (node) node.addEventListener("change", renderAll);
    });

    Array.prototype.forEach.call(document.querySelectorAll(".l2n-copy-btn"), function (btn) {
      btn.addEventListener("click", function () { copyOutput(btn); });
    });

    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
