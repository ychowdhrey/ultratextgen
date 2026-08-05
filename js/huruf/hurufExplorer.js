/*
 * hurufExplorer.js — Huruf Keren A sampai Z explorer (Indonesian)
 * Builds the letter/number picker, shows the selected character big in the
 * chosen style, lists every copy-paste Unicode style for it, and wires up
 * print + PNG download for the "gambar/logo huruf" jobs. Self-contained IIFE;
 * depends on window.textStyles (styles.js) and window.UltraTextGenRender
 * (renderer.js). Layout reuses the bubble-* classes from style.css.
 */
(function () {
  "use strict";

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const DIGITS = "0123456789".split("");
  const CHARS = LETTERS.concat(DIGITS);
  const GLYPH_FONT = "'Plus Jakarta Sans', 'Segoe UI Symbol', 'Noto Sans Symbols 2', sans-serif";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const strip = $("#hurufLetterStrip");
  const panel = $("#hurufLetterPanel");
  const printRoot = $("#hurufPrintRoot");
  if (!strip || !panel) return;

  // Selected style follows the copy row the user last tapped, so the big
  // preview (and its PNG/print) always match what they are about to use.
  let currentStyleName = null;

  // ---- helpers -------------------------------------------------------------

  function charLabel(ch) {
    return /[0-9]/.test(ch) ? "angka " + ch : "huruf " + ch;
  }

  function charSlug(ch) {
    return /[0-9]/.test(ch) ? "angka-" + ch : "huruf-" + ch.toLowerCase();
  }

  function renderChar(ch, style) {
    const R = window.UltraTextGenRender;
    if (R && typeof R.renderAny === "function") {
      try { return R.renderAny(ch, style); } catch (e) { /* fall through */ }
    }
    return ch;
  }

  // Every style in the registry that gives this character a distinct glyph,
  // deduped on the rendered result (many styles share digit glyphs).
  function kerenVariants(ch) {
    const styles = window.textStyles || {};
    const seen = {};
    const out = [];
    Object.keys(styles).forEach((name) => {
      const s = styles[name];
      if (!s) return;
      const rendered = renderChar(ch, s);
      if (!rendered || rendered === ch) return;
      if (seen[rendered]) return;
      seen[rendered] = true;
      out.push({ name, rendered });
    });
    return out;
  }

  function currentGlyph(ch) {
    const variants = kerenVariants(ch);
    if (!variants.length) return { name: "", rendered: ch };
    const match = variants.filter((v) => v.name === currentStyleName)[0];
    return match || variants[0];
  }

  function buildGlyphSVG(glyph, ch, opts) {
    const o = opts || {};
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 240");
    svg.setAttribute("class", "bubble-outline" + (o.small ? " is-small" : ""));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Huruf keren " + charLabel(ch));

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "100");
    text.setAttribute("y", "128");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", GLYPH_FONT);
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", o.small ? "150" : "160");
    text.setAttribute("fill", "#1a1a2e");
    text.textContent = glyph;
    svg.appendChild(text);
    return svg;
  }

  function copyText(value, btn) {
    const done = () => {
      const prev = btn.textContent;
      btn.classList.add("is-copied");
      btn.textContent = "Tersalin!";
      setTimeout(() => { btn.textContent = prev; btn.classList.remove("is-copied"); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = value; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      document.body.removeChild(ta); done();
    }
  }

  // ---- print + download ----------------------------------------------------

  function printNodes(nodes, title) {
    if (!printRoot) { window.print(); return; }
    printRoot.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";
    const h = document.createElement("h2");
    h.className = "bubble-print-title";
    h.textContent = title;
    wrap.appendChild(h);
    const sheet = document.createElement("div");
    sheet.className = "bubble-print-sheet";
    nodes.forEach((n) => sheet.appendChild(n));
    wrap.appendChild(sheet);
    printRoot.appendChild(wrap);
    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    printRoot.innerHTML = "";
  }

  function downloadPNG(ch) {
    const glyph = currentGlyph(ch).rendered;
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + Math.round(size * 0.6) + "px " + GLYPH_FONT;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(glyph, size / 2, size * 0.5);
    ctx.font = "22px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#aeb4c0";
    ctx.fillText("ultratextgen.com", size / 2, size - 32);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "huruf-keren-" + charSlug(ch) + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  // ---- panel render --------------------------------------------------------

  function buildVariants(ch, onPick) {
    const list = document.createElement("div");
    list.className = "bubble-variants";
    kerenVariants(ch).forEach(({ name, rendered }) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "bubble-variant" + (name === currentStyleName ? " is-active" : "");
      row.setAttribute("aria-label", "Salin " + charLabel(ch) + " gaya " + name);

      const glyph = document.createElement("span");
      glyph.className = "bubble-variant-glyph";
      glyph.textContent = rendered;

      const meta = document.createElement("span");
      meta.className = "bubble-variant-name";
      meta.textContent = name.replace(/^Ultra /, "");

      const cta = document.createElement("span");
      cta.className = "bubble-variant-copy";
      cta.textContent = "Salin";

      row.appendChild(glyph);
      row.appendChild(meta);
      row.appendChild(cta);
      row.addEventListener("click", () => {
        copyText(rendered, cta);
        onPick(name);
      });
      list.appendChild(row);
    });
    return list;
  }

  function selectChar(ch, opts) {
    $$(".bubble-strip .bubble-chip", strip).forEach((b) => {
      const on = b.dataset.char === ch;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });

    panel.innerHTML = "";

    const stage = document.createElement("div");
    stage.className = "bubble-stage";

    const active = currentGlyph(ch);
    currentStyleName = active.name;

    const figure = document.createElement("div");
    figure.className = "bubble-outline-card";
    figure.appendChild(buildGlyphSVG(active.rendered, ch));

    const styleTag = document.createElement("p");
    styleTag.className = "bubble-az-intro";
    styleTag.textContent = active.name ? "Gaya: " + active.name.replace(/^Ultra /, "") : "";
    figure.appendChild(styleTag);

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "bubble-btn bubble-btn-primary";
    printBtn.textContent = "Cetak huruf ini";
    printBtn.addEventListener("click", () => {
      printNodes([buildGlyphSVG(currentGlyph(ch).rendered, ch)], "Huruf keren — " + charLabel(ch));
    });
    const dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.className = "bubble-btn";
    dlBtn.textContent = "Download PNG";
    dlBtn.addEventListener("click", () => downloadPNG(ch));
    actions.appendChild(printBtn);
    actions.appendChild(dlBtn);
    figure.appendChild(actions);

    const right = document.createElement("div");
    right.className = "bubble-detail";
    const title = document.createElement("h3");
    title.className = "bubble-detail-title";
    title.textContent = "Semua gaya " + charLabel(ch) + " keren — klik buat nyalin";
    right.appendChild(title);
    right.appendChild(buildVariants(ch, (name) => {
      currentStyleName = name;
      selectChar(ch, { silent: true });
    }));

    stage.appendChild(figure);
    stage.appendChild(right);
    panel.appendChild(stage);

    if (!opts || !opts.silent) {
      const hash = "#" + charSlug(ch);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", hash);
      }
    }
  }

  // ---- build strip ----------------------------------------------------------

  function buildStrip() {
    const make = (ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bubble-chip";
      b.dataset.char = ch;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-label", "Huruf keren " + charLabel(ch));
      b.textContent = ch;
      b.addEventListener("click", () => {
        currentStyleName = null;
        selectChar(ch);
      });
      return b;
    };
    const letterRow = document.createElement("div");
    letterRow.className = "bubble-strip-row";
    LETTERS.forEach((ch) => letterRow.appendChild(make(ch)));
    const digitRow = document.createElement("div");
    digitRow.className = "bubble-strip-row bubble-strip-digits";
    DIGITS.forEach((ch) => digitRow.appendChild(make(ch)));
    strip.appendChild(letterRow);
    strip.appendChild(digitRow);
  }

  // ---- init ----------------------------------------------------------------

  function init() {
    buildStrip();
    let initial = "A";
    const h = (window.location.hash || "").replace(/^#/, "");
    const match = CHARS.filter((c) => charSlug(c) === h)[0];
    if (match) initial = match;
    selectChar(initial, { silent: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
