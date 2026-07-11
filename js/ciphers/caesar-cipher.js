/* ==========================================================
   caesar-cipher.js
   Self-contained, adjustable Caesar-cipher widget for the
   /category/codes-and-ciphers/ page.

   The registry ships a fixed ROT13 style (shift 13). "Caesar
   cipher" as a search term implies an ADJUSTABLE shift — the
   historical original used shift 3, and people expect to pick
   any shift 1–25. This widget does that properly rather than
   faking it with fixed presets.

   Fully independent of renderer.js / styles.js / script.js —
   it only shifts Latin letters (A–Z, a–z) and passes every
   other character (digits, punctuation, spaces, emoji) through
   unchanged. Decode is Encode with (26 − shift) % 26.

   Mounts into #caesarCipherWidget.
   ========================================================== */
(function () {
  "use strict";

  const MOUNT_ID = "caesarCipherWidget";
  const MIN_SHIFT = 1;
  const MAX_SHIFT = 25;
  const DEFAULT_SHIFT = 3; // the historical Caesar shift

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Shift a single character. Non-letters are returned untouched.
  function shiftChar(ch, shift) {
    const cp = ch.charCodeAt(0);
    if (cp >= 65 && cp <= 90) {
      // A–Z
      return String.fromCharCode(((cp - 65 + shift) % 26) + 65);
    }
    if (cp >= 97 && cp <= 122) {
      // a–z
      return String.fromCharCode(((cp - 97 + shift) % 26) + 97);
    }
    return ch;
  }

  // Encode = forward shift; decode = the inverse shift (26 − shift).
  function transform(text, shift, decode) {
    const base = ((shift % 26) + 26) % 26;
    const eff = decode ? (26 - base) % 26 : base;
    // Iterate by code point so multi-unit characters (emoji) stay intact;
    // shiftChar only ever changes ASCII letters, so everything else passes
    // through unchanged.
    let out = "";
    for (const ch of text) out += shiftChar(ch, eff);
    return out;
  }

  function init() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const state = { shift: DEFAULT_SHIFT, decode: false };

    mount.innerHTML = "";
    mount.classList.add("caesar-widget");

    // ---- Text input ---------------------------------------------------
    const inputField = el("div", "caesar-field");
    const inputLabel = el("label", "caesar-label", "Your text");
    inputLabel.setAttribute("for", "caesarInput");
    const input = document.createElement("textarea");
    input.className = "caesar-input";
    input.id = "caesarInput";
    input.setAttribute("rows", "3");
    input.setAttribute("maxlength", "1000");
    input.placeholder = "Type text to encode or decode…";
    inputField.appendChild(inputLabel);
    inputField.appendChild(input);
    mount.appendChild(inputField);

    // ---- Shift slider -------------------------------------------------
    const shiftField = el("div", "caesar-field");
    const shiftHead = el("div", "caesar-range-head");
    const shiftLabel = el("label", "caesar-label", "Shift amount");
    shiftLabel.setAttribute("for", "caesarShift");
    const shiftVal = el("span", "caesar-shift-val", String(DEFAULT_SHIFT));
    shiftVal.id = "caesarShiftVal";
    shiftHead.appendChild(shiftLabel);
    shiftHead.appendChild(shiftVal);
    const shift = document.createElement("input");
    shift.type = "range";
    shift.className = "caesar-range";
    shift.id = "caesarShift";
    shift.min = String(MIN_SHIFT);
    shift.max = String(MAX_SHIFT);
    shift.value = String(DEFAULT_SHIFT);
    shift.setAttribute("aria-label", "Caesar cipher shift amount");
    shiftField.appendChild(shiftHead);
    shiftField.appendChild(shift);
    mount.appendChild(shiftField);

    // ---- Encode / Decode toggle --------------------------------------
    const modes = el("div", "caesar-modes");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Encode or decode");
    const encodeBtn = el("button", "caesar-mode-btn active", "Encode");
    encodeBtn.type = "button";
    encodeBtn.setAttribute("data-mode", "encode");
    encodeBtn.setAttribute("aria-pressed", "true");
    const decodeBtn = el("button", "caesar-mode-btn", "Decode");
    decodeBtn.type = "button";
    decodeBtn.setAttribute("data-mode", "decode");
    decodeBtn.setAttribute("aria-pressed", "false");
    modes.appendChild(encodeBtn);
    modes.appendChild(decodeBtn);
    mount.appendChild(modes);

    // ---- Output box ---------------------------------------------------
    const outputField = el("div", "caesar-field");
    const outputLabel = el("label", "caesar-label", "Result");
    outputLabel.setAttribute("for", "caesarOutput");
    const output = document.createElement("textarea");
    output.className = "caesar-output";
    output.id = "caesarOutput";
    output.setAttribute("rows", "3");
    output.setAttribute("readonly", "readonly");
    output.setAttribute("aria-live", "polite");
    output.placeholder = "Result appears here…";
    outputField.appendChild(outputLabel);
    outputField.appendChild(output);
    mount.appendChild(outputField);

    // ---- Actions ------------------------------------------------------
    const actions = el("div", "caesar-actions");
    const copyBtn = el("button", "copy-btn caesar-copy", "Copy result");
    copyBtn.type = "button";
    actions.appendChild(copyBtn);
    mount.appendChild(actions);

    // ---- Behavior -----------------------------------------------------
    function render() {
      output.value = transform(input.value, state.shift, state.decode);
    }

    input.addEventListener("input", render);

    shift.addEventListener("input", function () {
      state.shift = parseInt(shift.value, 10) || DEFAULT_SHIFT;
      shiftVal.textContent = String(state.shift);
      render();
    });

    modes.addEventListener("click", function (e) {
      const btn = e.target.closest(".caesar-mode-btn");
      if (!btn) return;
      state.decode = btn.getAttribute("data-mode") === "decode";
      encodeBtn.classList.toggle("active", !state.decode);
      decodeBtn.classList.toggle("active", state.decode);
      encodeBtn.setAttribute("aria-pressed", String(!state.decode));
      decodeBtn.setAttribute("aria-pressed", String(state.decode));
      render();
    });

    copyBtn.addEventListener("click", function () {
      if (!output.value) return;

      function flash() {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = original;
          copyBtn.classList.remove("copied");
        }, 1500);
      }

      function fallback() {
        // Older browsers / insecure contexts: select the output box and copy.
        try {
          output.removeAttribute("readonly");
          output.focus();
          output.select();
          document.execCommand("copy");
          output.setAttribute("readonly", "readonly");
          flash();
        } catch (err) {
          console.error("Copy failed:", err);
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(output.value).then(flash, fallback);
      } else {
        fallback();
      }
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
