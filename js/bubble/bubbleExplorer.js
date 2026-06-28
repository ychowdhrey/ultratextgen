/*
 * bubbleExplorer.js — Bubble Letters A–Z explorer
 * Builds the letter/number picker, renders a large printable bubble outline
 * for the selected character, lists every copy-paste Unicode bubble style for
 * it, and wires up print + PNG download. Self-contained IIFE; depends on
 * window.textStyles (styles.js) and window.UltraTextGenRender (renderer.js).
 */
(function () {
  "use strict";

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const DIGITS = "0123456789".split("");
  const CHARS = LETTERS.concat(DIGITS);
  const OUTLINE_FONT = "Fredoka, 'Plus Jakarta Sans', sans-serif";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const strip = $("#bubbleLetterStrip");
  const panel = $("#bubbleLetterPanel");
  const alphabetGrid = $("#bubbleAlphabetGrid");
  const printRoot = $("#bubblePrintRoot");
  if (!strip || !panel) return;

  // ---- helpers -------------------------------------------------------------

  function charLabel(ch) {
    return /[0-9]/.test(ch) ? "number " + ch : "letter " + ch;
  }

  function charSlug(ch) {
    return /[0-9]/.test(ch) ? "number-" + ch : "letter-" + ch.toLowerCase();
  }

  // Build an SVG outline of a single character: white "paper" fill, thick
  // rounded dark stroke => printable, traceable, colorable.
  function buildOutlineSVG(ch, opts) {
    const o = opts || {};
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 240");
    svg.setAttribute("class", "bubble-outline" + (o.small ? " is-small" : ""));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Bubble " + charLabel(ch));

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "100");
    text.setAttribute("y", "128");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", OUTLINE_FONT);
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", "210");
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("stroke", "#1a1a2e");
    text.setAttribute("stroke-width", o.small ? "7" : "9");
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    text.textContent = ch;
    svg.appendChild(text);
    return svg;
  }

  // Collect the bubble Unicode styles available in the registry.
  function bubbleStyles() {
    const styles = window.textStyles || {};
    const out = [];
    Object.keys(styles).forEach((name) => {
      const s = styles[name];
      if (!s) return;
      const fam = s.familySlug;
      const isBubble = fam === "bubble" || (Array.isArray(fam) && fam.indexOf("bubble") !== -1);
      if (isBubble) out.push({ name, style: s });
    });
    return out;
  }

  function renderChar(ch, style) {
    const R = window.UltraTextGenRender;
    if (R && typeof R.renderAny === "function") {
      try { return R.renderAny(ch, style); } catch (e) { /* fall through */ }
    }
    return ch;
  }

  function copyText(value, btn) {
    const done = () => {
      const prev = btn.textContent;
      btn.classList.add("is-copied");
      btn.textContent = "Copied!";
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
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 " + Math.round(size * 0.74) + "px " + OUTLINE_FONT;
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ch, size / 2, size * 0.54);
      ctx.lineWidth = Math.round(size * 0.045);
      ctx.strokeStyle = "#1a1a2e";
      ctx.strokeText(ch, size / 2, size * 0.54);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bubble-" + charSlug(ch) + ".png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load("700 200px Fredoka", ch).then(draw).catch(draw);
    } else {
      draw();
    }
  }

  // ---- panel render --------------------------------------------------------

  function buildVariants(ch) {
    const list = document.createElement("div");
    list.className = "bubble-variants";
    bubbleStyles().forEach(({ name, style }) => {
      const rendered = renderChar(ch, style);
      if (!rendered || rendered === ch) return; // skip styles with no glyph
      const row = document.createElement("button");
      row.type = "button";
      row.className = "bubble-variant";
      row.setAttribute("aria-label", "Copy " + name + " bubble " + charLabel(ch));

      const glyph = document.createElement("span");
      glyph.className = "bubble-variant-glyph";
      glyph.textContent = rendered;

      const meta = document.createElement("span");
      meta.className = "bubble-variant-name";
      meta.textContent = name.replace(/^Ultra /, "");

      const cta = document.createElement("span");
      cta.className = "bubble-variant-copy";
      cta.textContent = "Copy";

      row.appendChild(glyph);
      row.appendChild(meta);
      row.appendChild(cta);
      row.addEventListener("click", () => copyText(rendered, cta));
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

    const figure = document.createElement("div");
    figure.className = "bubble-outline-card";
    const svg = buildOutlineSVG(ch);
    figure.appendChild(svg);

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "bubble-btn bubble-btn-primary";
    printBtn.textContent = "Print this letter";
    printBtn.addEventListener("click", () => {
      printNodes([buildOutlineSVG(ch)], "Bubble " + charLabel(ch));
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
    title.textContent = "Copy-paste bubble " + charLabel(ch);
    right.appendChild(title);
    right.appendChild(buildVariants(ch));

    const draw = document.createElement("div");
    draw.className = "bubble-howto";
    draw.innerHTML =
      "<h3 class=\"bubble-detail-title\">How to draw a bubble " + charLabel(ch) + "</h3>" +
      "<ol class=\"bubble-howto-steps\">" +
      "<li>Lightly pencil the plain " + charLabel(ch) + " as a skeleton.</li>" +
      "<li>Draw a rounded, puffy outline a finger-width around every stroke.</li>" +
      "<li>Round off the corners, erase the skeleton, then ink and color it in.</li>" +
      "</ol>" +
      "<p class=\"bubble-howto-tip\">Tip: print the outline above and trace it until the shape feels natural.</p>";
    right.appendChild(draw);

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

  // ---- build strip + alphabet ---------------------------------------------

  function buildStrip() {
    const make = (ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bubble-chip";
      b.dataset.char = ch;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-label", "Bubble " + charLabel(ch));
      b.textContent = ch;
      b.addEventListener("click", () => selectChar(ch));
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

  function buildAlphabet() {
    if (!alphabetGrid) return;
    LETTERS.forEach((ch) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bubble-alpha-cell";
      cell.setAttribute("aria-label", "Bubble letter " + ch + " — open");
      cell.appendChild(buildOutlineSVG(ch, { small: true }));
      cell.addEventListener("click", () => {
        selectChar(ch);
        const az = document.getElementById("bubbleAZ");
        if (az) az.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      alphabetGrid.appendChild(cell);
    });

    const printAll = document.getElementById("bubblePrintAlphabet");
    if (printAll) {
      printAll.addEventListener("click", () => {
        printNodes(LETTERS.map((ch) => buildOutlineSVG(ch, { small: true })), "Bubble letter alphabet A–Z");
      });
    }
  }

  // ---- init ----------------------------------------------------------------

  function init() {
    buildStrip();
    buildAlphabet();
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
