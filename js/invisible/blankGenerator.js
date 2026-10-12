/* ==========================================================
   blankGenerator.js
   The "make blank text of any length" tool on /library/invisible-character/.

   One job: pick a blank character, pick how many, copy them in one go.
   Players need several to fill a name field with a minimum length, and a
   bio or caption needs one per empty line, because apps collapse a run of
   plain line breaks.

   Markup (pre-rendered in the page, this file only wires it):
     #blankGen                 the panel
       [data-blank-char]       chips, data-blank-char="2800" (hex code point)
       #blankGenCount          number input, 1..MAX_COUNT
       #blankGenLines          checkbox: one character per line
       #blankGenCopy           the copy button
       #blankGenNote           live line: what will be copied

   Copying goes through UltraTextGen.copyText() in symbol-explorer.js, so
   the toast, the clipboard fallback and the copy event are the same ones
   every tile on the page uses. The method is "blank_generator": it is not
   in header.js's catalogue allowlist, so the copied text never reaches the
   dataLayer, only the method does.
   ========================================================== */
(function () {
  "use strict";

  const MAX_COUNT = 500;
  const DEFAULT_COUNT = 10;
  const METHOD = "blank_generator";

  function clampCount(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, MAX_COUNT);
  }

  function build(cp, count, perLine) {
    const ch = String.fromCodePoint(parseInt(cp, 16));
    const parts = new Array(count).fill(ch);
    return perLine ? parts.join("\n") : parts.join("");
  }

  function fmt(t, vars) {
    return String(t).replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] != null ? vars[k] : m;
    });
  }

  function init() {
    const panel = document.getElementById("blankGen");
    if (!panel) return;
    const chips = Array.prototype.slice.call(panel.querySelectorAll("[data-blank-char]"));
    const countInput = document.getElementById("blankGenCount");
    const linesInput = document.getElementById("blankGenLines");
    const copyBtn = document.getElementById("blankGenCopy");
    const note = document.getElementById("blankGenNote");
    if (!chips.length || !countInput || !copyBtn) return;

    const text = {
      note: panel.getAttribute("data-note") || "{n} × {name}",
      noteLines: panel.getAttribute("data-note-lines") || "{n} lines of {name}",
      copied: panel.getAttribute("data-copied") || "{n} blank characters copied"
    };

    let current = chips.filter(function (c) { return c.classList.contains("active"); })[0] || chips[0];

    function currentName() {
      return current.getAttribute("data-blank-name") || ("U+" + current.getAttribute("data-blank-char"));
    }

    function renderNote() {
      if (!note) return;
      const n = clampCount(countInput.value);
      const perLine = !!(linesInput && linesInput.checked);
      note.textContent = fmt(perLine ? text.noteLines : text.note, { n: n, name: currentName() });
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.toggle("active", c === chip);
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        current = chip;
        renderNote();
      });
    });

    countInput.addEventListener("input", renderNote);
    countInput.addEventListener("change", function () {
      countInput.value = String(clampCount(countInput.value));
      renderNote();
    });
    if (linesInput) linesInput.addEventListener("change", renderNote);

    copyBtn.addEventListener("click", function () {
      const n = clampCount(countInput.value);
      countInput.value = String(n);
      const perLine = !!(linesInput && linesInput.checked);
      const payload = build(current.getAttribute("data-blank-char"), n, perLine);
      const label = fmt(text.copied, { n: n, name: currentName() });
      const ns = window.UltraTextGen || {};
      if (ns.copyText) {
        ns.copyText(payload, copyBtn, label, METHOD);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload);
      }
    });

    if (!countInput.value) countInput.value = String(DEFAULT_COUNT);
    renderNote();
  }

  /* Deferred script: wait for "complete" rather than readyState "loading"
     (see .claude/rules/frontend-javascript.md), so symbol-explorer.js has
     registered UltraTextGen.copyText whatever the tag order. */
  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
