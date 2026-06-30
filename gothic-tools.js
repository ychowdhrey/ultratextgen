/* ==========================================================================
   UltraTextGen — gothic-tools.js
   Live "will it render on your device?" compatibility tester for gothic /
   blackletter styles. Self-contained IIFE. Loads AFTER styles.js + renderer.js.

   It mounts into #gothicCompat (if present) and answers the single biggest
   gothic complaint: "why do I see boxes/squares?" — by detecting, on THIS
   device, whether each blackletter style actually has glyphs.
   ========================================================================== */
(function () {
  "use strict";

  const mount = document.getElementById("gothicCompat");
  if (!mount) return;

  const Render = window.UltraTextGenRender;
  const styles = window.textStyles || {};
  if (!Render || typeof Render.renderAny !== "function") return;

  // Styles surfaced in the tester, in display order. Each maps to a registry key.
  const TESTS = [
    { label: "Fraktur — 𝔤𝔬𝔱𝔥𝔦𝔠", key: "Ultra Gothic" },
    { label: "Bold Fraktur / Old English — 𝖌𝖔𝖙𝖍𝖎𝖈", key: "Ultra Gothic Bold" },
    { label: "Gothic Underline", key: "Ultra Gothic Underline" },
    { label: "Gothic + Cross", key: "Ultra Gothic Cross" },
    { label: "Gothic Occult", key: "Ultra Gothic Occult" },
    { label: "Gothic Strikethrough", key: "Ultra Gothic Strikethrough" }
  ].filter(t => styles[t.key]);

  // --- Canvas glyph-support detector -------------------------------------
  // Compares the drawn width of a glyph against the width of a code point no
  // font has (every browser falls back to the same .notdef "tofu" box, so an
  // unsupported glyph measures identical to the reference).
  function makeDetector() {
    let ctx;
    try {
      ctx = document.createElement("canvas").getContext("2d");
    } catch (e) {
      return null;
    }
    if (!ctx) return null;
    const family = (getComputedStyle(mount).fontFamily || "sans-serif");
    ctx.font = "36px " + family;
    const refWidth = ctx.measureText(String.fromCodePoint(0x10fffd)).width;
    return function supported(ch) {
      if (!ch) return true;
      return ctx.measureText(ch).width !== refWidth;
    };
  }

  const detect = makeDetector();

  // Representative base glyph for a style: render lowercase "a" and grab the
  // first Mathematical-Alphanumeric code point (skips wrapper symbols like ✝/⛧).
  function baseGlyph(key) {
    const out = Render.renderAny("a", styles[key]);
    for (const c of out) {
      if (c.codePointAt(0) >= 0x1d400) return c;
    }
    return null;
  }

  const supportMap = {};
  TESTS.forEach(t => {
    supportMap[t.key] = detect ? detect(baseGlyph(t.key)) : true;
  });

  // --- Build the widget ---------------------------------------------------
  const input = document.createElement("input");
  input.type = "text";
  input.className = "compat-input";
  input.maxLength = 60;
  input.setAttribute("aria-label", "Text to test for gothic compatibility");
  input.placeholder = "Type a name to test…";

  // Seed from the main generator input if it already has text.
  const mainInput = document.getElementById("mainInput");
  input.value = (mainInput && mainInput.value.trim()) || "Your Name";

  const list = document.createElement("div");
  list.className = "compat-rows";

  const note = document.createElement("p");
  note.className = "compat-note";
  note.innerHTML = detect
    ? 'Checked live on <strong>this device</strong>. A ⚠ flag means your current device is missing those glyphs — they may show as boxes for some viewers too. Tap a sample to copy it.'
    : "Showing how each style renders. Tap a sample to copy it.";

  function badge(ok) {
    const b = document.createElement("span");
    b.className = "compat-badge " + (ok ? "is-ok" : "is-warn");
    b.textContent = ok ? "✓ Renders" : "⚠ May break";
    return b;
  }

  function rowFor(t) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "compat-row";
    row.dataset.ok = String(supportMap[t.key]);

    const name = document.createElement("span");
    name.className = "compat-name";
    name.textContent = t.label;

    const sample = document.createElement("span");
    sample.className = "compat-sample";

    row.appendChild(badge(supportMap[t.key]));
    row.appendChild(name);
    row.appendChild(sample);
    row.addEventListener("click", () => copyRow(t, sample.textContent, row));
    return { row, sample, key: t.key };
  }

  const built = TESTS.map(rowFor);
  built.forEach(b => list.appendChild(b.row));

  function render() {
    const text = input.value.trim() || "Your Name";
    built.forEach(b => {
      b.sample.textContent = Render.renderAny(text, styles[b.key]);
    });
  }

  function copyRow(t, text, row) {
    if (!text) return;
    const done = () => {
      row.classList.add("is-copied");
      setTimeout(() => row.classList.remove("is-copied"), 1100);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
    }
  }

  input.addEventListener("input", render);
  if (mainInput) {
    mainInput.addEventListener("input", () => {
      const v = mainInput.value.trim();
      if (v) {
        input.value = v.slice(0, 60);
        render();
      }
    });
  }

  mount.appendChild(input);
  mount.appendChild(list);
  mount.appendChild(note);
  render();
})();
