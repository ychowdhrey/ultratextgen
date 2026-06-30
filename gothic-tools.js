/* ==========================================================================
   UltraTextGen — gothic-tools.js
   Progressive enhancements for the Gothic / Old English pages. Loads AFTER
   styles.js + renderer.js + script.js (all defer, so order is preserved).

   Adds, without touching the shared generator:
     1. Live blackletter preview in the hero (#gLive)
     2. Click-to-copy glyph tiles + "copy series" for the A–Z / 0–9 charts
     3. Copyable gothic-symbol strips (.gsym-strip[data-symbols])
     4. The device compatibility tester (#gothicCompat)

   Raw glyph text stays in the DOM for SEO; JS only enhances it in place.
   ========================================================================== */
(function () {
  "use strict";

  const Render = window.UltraTextGenRender;
  const styles = window.textStyles || {};
  const hasRender = Render && typeof Render.renderAny === "function";

  /* ---- shared copy helper ---------------------------------------------- */
  function flashCopy(text, el) {
    if (!text) return;
    const done = () => {
      el.classList.add("is-copied");
      setTimeout(() => el.classList.remove("is-copied"), 1000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
    } else {
      done();
    }
  }

  /* ---- 1. Live hero preview -------------------------------------------- */
  function initLivePreview() {
    const live = document.getElementById("gLive");
    const input = document.getElementById("mainInput");
    if (!live || !input || !hasRender) return;

    const styleKey = live.dataset.style && styles[live.dataset.style]
      ? live.dataset.style
      : (styles["Ultra Gothic Bold"] ? "Ultra Gothic Bold" : Object.keys(styles)[0]);
    const placeholder = live.dataset.placeholder || "Your name";

    function update() {
      const text = input.value.trim();
      if (text) {
        live.classList.remove("is-empty");
        live.textContent = Render.renderAny(text, styles[styleKey]);
      } else {
        live.classList.add("is-empty");
        live.textContent = Render.renderAny(placeholder, styles[styleKey]);
      }
    }
    input.addEventListener("input", update);
    update();
  }

  /* ---- 2. Click-to-copy glyph charts ----------------------------------- */
  function initGlyphCharts() {
    document.querySelectorAll(".glyph-row").forEach(row => {
      if (row.dataset.enhanced) return;
      const tokens = (row.textContent || "").trim().split(/\s+/).filter(Boolean);
      if (tokens.length < 2) return;
      row.dataset.enhanced = "1";
      row.textContent = "";

      tokens.forEach(tok => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "glyph-tile";
        b.textContent = tok;
        b.setAttribute("aria-label", "Copy " + tok);
        b.addEventListener("click", () => flashCopy(tok, b));
        row.appendChild(b);
      });

      const series = document.createElement("button");
      series.type = "button";
      series.className = "copy-series";
      series.textContent = "Copy series";
      series.title = "Copy the whole row: " + tokens.join(" ");
      series.addEventListener("click", () => flashCopy(tokens.join(" "), series));
      row.appendChild(series);
    });
  }

  /* ---- 3. Copyable gothic-symbol strips -------------------------------- */
  function initSymbolStrips() {
    document.querySelectorAll(".gsym-strip[data-symbols]").forEach(strip => {
      if (strip.dataset.enhanced) return;
      strip.dataset.enhanced = "1";
      const syms = strip.dataset.symbols.trim().split(/\s+/).filter(Boolean);
      strip.textContent = "";
      syms.forEach(s => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "gsym-tile";
        b.textContent = s;
        b.setAttribute("aria-label", "Copy " + s);
        b.addEventListener("click", () => flashCopy(s, b));
        strip.appendChild(b);
      });
    });
  }

  /* ---- 4. Device compatibility tester ---------------------------------- */
  function initCompatTester() {
    const mount = document.getElementById("gothicCompat");
    if (!mount || !hasRender) return;

    const TESTS = [
      { label: "Fraktur — 𝔤𝔬𝔱𝔥𝔦𝔠", key: "Ultra Gothic" },
      { label: "Bold Fraktur / Old English — 𝖌𝖔𝖙𝖍", key: "Ultra Gothic Bold" },
      { label: "Gothic Underline", key: "Ultra Gothic Underline" },
      { label: "Gothic + Cross", key: "Ultra Gothic Cross" },
      { label: "Gothic Occult", key: "Ultra Gothic Occult" },
      { label: "Gothic Strikethrough", key: "Ultra Gothic Strikethrough" }
    ].filter(t => styles[t.key]);

    function makeDetector() {
      let ctx;
      try { ctx = document.createElement("canvas").getContext("2d"); }
      catch (e) { return null; }
      if (!ctx) return null;
      ctx.font = "36px " + (getComputedStyle(mount).fontFamily || "sans-serif");
      const refWidth = ctx.measureText(String.fromCodePoint(0x10fffd)).width;
      return ch => !ch ? true : ctx.measureText(ch).width !== refWidth;
    }
    const detect = makeDetector();

    function baseGlyph(key) {
      const out = Render.renderAny("a", styles[key]);
      for (const c of out) if (c.codePointAt(0) >= 0x1d400) return c;
      return null;
    }
    const supportMap = {};
    TESTS.forEach(t => { supportMap[t.key] = detect ? detect(baseGlyph(t.key)) : true; });

    const input = document.createElement("input");
    input.type = "text";
    input.className = "compat-input";
    input.maxLength = 60;
    input.setAttribute("aria-label", "Text to test for gothic compatibility");
    input.placeholder = "Type a name to test…";
    const mainInput = document.getElementById("mainInput");
    input.value = (mainInput && mainInput.value.trim()) || "Your Name";

    const list = document.createElement("div");
    list.className = "compat-rows";

    const note = document.createElement("p");
    note.className = "compat-note";
    note.innerHTML = detect
      ? 'Checked live on <strong>this device</strong>. A ⚠ flag means your device is missing those glyphs — they may show as boxes for some viewers too. Tap a sample to copy it.'
      : "Showing how each style renders. Tap a sample to copy it.";

    function badge(ok) {
      const b = document.createElement("span");
      b.className = "compat-badge " + (ok ? "is-ok" : "is-warn");
      b.textContent = ok ? "✓ Renders" : "⚠ May break";
      return b;
    }

    const built = TESTS.map(t => {
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
      row.addEventListener("click", () => flashCopy(sample.textContent, row));
      list.appendChild(row);
      return { sample, key: t.key };
    });

    function render() {
      const text = input.value.trim() || "Your Name";
      built.forEach(b => { b.sample.textContent = Render.renderAny(text, styles[b.key]); });
    }
    input.addEventListener("input", render);
    if (mainInput) {
      mainInput.addEventListener("input", () => {
        const v = mainInput.value.trim();
        if (v) { input.value = v.slice(0, 60); render(); }
      });
    }
    mount.appendChild(input);
    mount.appendChild(list);
    mount.appendChild(note);
    render();
  }

  /* ---- 5. Quick-fill use-case chips ------------------------------------ */
  function initQuickfill() {
    const input = document.getElementById("mainInput");
    if (!input) return;
    document.querySelectorAll(".quickfill [data-fill]").forEach(btn => {
      btn.addEventListener("click", () => {
        input.value = btn.dataset.fill;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        const top = input.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight) input.scrollIntoView({ block: "center" });
      });
    });
  }

  /* ---- 6. Old English Roman-numeral / date tool ------------------------ */
  function toRoman(n) {
    n = Math.max(1, Math.min(3999, Math.floor(n || 0)));
    const map = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],
      [50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
    let out = "";
    for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
    return out;
  }

  function initRomanTool() {
    const wrap = document.getElementById("oeRoman");
    if (!wrap || !hasRender) return;
    const styleKey = styles["Ultra Gothic Bold"] ? "Ultra Gothic Bold" : Object.keys(styles)[0];

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "3999";
    input.value = "2024";
    input.className = "compat-input roman-input";
    input.setAttribute("aria-label", "Year or number to convert to Old English Roman numerals");

    const plain = document.createElement("span");
    plain.className = "roman-plain";

    const out = document.createElement("button");
    out.type = "button";
    out.className = "gsym-tile roman-out";
    out.setAttribute("aria-label", "Copy Old English Roman numerals");

    function update() {
      const roman = toRoman(parseInt(input.value, 10));
      plain.textContent = roman || "—";
      out.textContent = roman ? Render.renderAny(roman, styles[styleKey]) : "—";
    }
    out.addEventListener("click", () => flashCopy(out.textContent, out));
    input.addEventListener("input", update);

    const row = document.createElement("div");
    row.className = "roman-row";
    row.appendChild(input);
    row.appendChild(plain);
    row.appendChild(out);
    wrap.appendChild(row);
    update();
  }

  /* ---- boot ------------------------------------------------------------ */
  function boot() {
    initLivePreview();
    initGlyphCharts();
    initSymbolStrips();
    initCompatTester();
    initQuickfill();
    initRomanTool();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
