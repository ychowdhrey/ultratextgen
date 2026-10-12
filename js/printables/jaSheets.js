/*
 * jaSheets.js — the page module for the Japanese worksheet generators under
 * /ja/purinto/. One module for all nine tools; a page picks its tool with
 * window.UTG_JA_SHEET = { tool: "kana" | "kanji" | "name" | "alphabet" |
 * "eigo4sen" | "romaji" | "unpitsu" | "nurie", ... }.
 *
 * Division of labour:
 *   jaSheetData.js   character sets, romanisation, normalisation (pure)
 *   jaSheetsCore.js  every sheet as an SVG string in millimetres (pure)
 *   this file        reads the page's controls, previews, prints, exports
 *
 * The controls are static HTML on each page (labels a crawler and a screen
 * reader can read without this script); this module finds them by
 * [data-ja-opt] and never builds a second set.
 *
 * Export does NOT go through printablePdf.renderPages(). That function clones
 * HTML and copies a fixed list of computed properties, which would re-derive
 * these sheets from CSS; here the exact SVG the preview shows is rasterised
 * directly, with its fonts inlined, so the PDF is the preview by construction.
 * Only the PDF writer (fromCanvases) and the QR encoder (qr.js) are shared.
 *
 * Privacy: a child's name or any typed text is never sent anywhere. Analytics
 * receive option keys only ("typed" for a text box, never its content), the
 * URL never carries input, and the PDF file name and title are the tool's own.
 */
(function () {
  "use strict";

  const CFG = window.UTG_JA_SHEET || {};
  const D = window.UTG_JA_DATA;
  const C = window.UTG_JA_SHEETS_CORE;
  const root = document.getElementById("ja-sheet-tool");
  if (!root || !D || !C) return;

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const SHEET_KEY = CFG.sheet || CFG.tool || "ja";
  const MAX_PAGES = 40;

  /* ---- options --------------------------------------------------------- */

  function readOpts() {
    const st = {};
    $$("[data-ja-opt]", root).forEach((el) => {
      const k = el.getAttribute("data-ja-opt");
      if (el.type === "checkbox") {
        if (el.hasAttribute("data-ja-multi")) { (st[k] = st[k] || []); if (el.checked) st[k].push(el.value); }
        else st[k] = el.checked;
      } else if (el.type === "radio") { if (el.checked) st[k] = el.value; }
      else st[k] = el.value;
    });
    return st;
  }

  function prefs() { return UTG.printPrefs && UTG.printPrefs.values; }
  function paperKey() {
    const sel = $("[data-ja-paper]", root);
    return sel ? sel.value : (prefs() && prefs().paper) || "a4";
  }
  function orientKey() {
    const st = readOpts();
    return st.orient === "landscape" ? "landscape" : "portrait";
  }
  function marginKey() {
    const sel = $("[data-ja-margin]", root);
    return sel ? sel.value : (prefs() && prefs().margin) || "normal";
  }

  function creditText() {
    if (UTG.printableCredit) return UTG.printableCredit();
    return "ultratextgen.com" + String(location.pathname || "/").replace(/index\.html$/, "").replace(/\/$/, "");
  }
  function qrInner(url, mm) {
    const q = UTG.qr;
    if (!q) return "";
    const el = q.qrSvg(url, { px: 96, dark: "#111111" });
    if (!el) return "";
    el.setAttribute("width", mm);
    el.setAttribute("height", mm);
    el.removeAttribute("role");
    return new XMLSerializer().serializeToString(el);
  }
  const env = () => ({ creditText: creditText(), qrSvg: qrInner });

  /* ---- what each tool prints ------------------------------------------- */

  function lines(text) {
    return String(text || "").split(/\r?\n/).map((s) => D.normalize(s)).filter(Boolean);
  }
  function uniq(arr) { const seen = new Set(); return arr.filter((x) => (seen.has(x) ? false : (seen.add(x), true))); }

  function kanaChars(st) {
    const table = CFG.script === "katakana" ? D.KATAKANA : D.HIRAGANA;
    let out = [];
    (st.sets || []).forEach((k) => { if (table.sets[k]) out = out.concat(table.sets[k].chars); });
    (st.rows || []).forEach((r) => {
      const row = table.rows[+r];
      if (row) out = out.concat(Array.from(row[1]).filter((c) => c !== "　"));
    });
    const own = D.normalize(st.custom || "");
    if (own) out = out.concat(D.graphemes(own).filter((c) => c.trim()));
    return uniq(out);
  }

  function masuOpts(st, title) {
    return {
      cell: +st.cell || 20, vertical: st.dir !== "yoko", mode: st.mode || "nazori-kaki",
      fade: !!st.fade, cross: st.cross !== false, nameLine: st.nameLine !== false, title: title
    };
  }

  function fourOpts(st, title) {
    const h = +st.rowH || 15;
    // ノート式: equal bands, red baseline, dashed second line (英習罫 and the
    // free sheets compared). 教科書式: a widened middle band and a blue
    // baseline, the form MEXT's materials and the 2020 textbooks adopted; the
    // exact textbook ratio is not published, so 5:9:5 (the ratio children
    // preferred in Kaneshige et al. 2020) stands for it and the page says so.
    const textbook = st.ruling === "textbook";
    return {
      rowH: h, rowGap: st.rowGap != null && st.rowGap !== "" ? +st.rowGap : Math.round(h * 0.45),
      bands: textbook ? [5, 9, 5] : [1, 1, 1], baseColor: textbook ? "#1f5fbf" : "#d1302f", dashMiddle: !textbook,
      redBase: st.redBase !== false, shadeMiddle: !!st.shade, dotted: !!st.dotted, fade: !!st.fade,
      nameLine: st.nameLine !== false, title: title
    };
  }

  function traceCount(mode) { return mode === "mite" ? 0 : mode === "nazori-kaki" ? 2 : Infinity; }

  function fourPages(A, o, rows, skel) {
    const per = C.fourLineCapacity(A, o);
    const out = [];
    for (let i = 0; i < rows.length; i += per) {
      out.push(C.svgDoc(A, C.header(A, o) + C.fourLinePage(A, o, rows.slice(i, i + per), skel) + C.credit(A, env()), o.title));
    }
    return out;
  }

  // Practice rows for a list of units (letters, romaji, a name): a row with
  // the model and its なぞり, then (unless なぞり多め fills it) a row to write.
  function practiceRows(units, mode, labelOf) {
    const rows = [];
    units.forEach((u) => {
      rows.push({ text: u.text, kind: "model", repeat: true, modelFirst: true, traces: traceCount(mode), label: labelOf ? labelOf(u) : "" });
      if (mode !== "nazori-oome") rows.push({ text: "", kind: "blank", label: "" });
    });
    return rows;
  }

  const BUILD = {
    kana(A, st) {
      const chars = kanaChars(st);
      return { pages: C.buildCharSheets(A, masuOpts(st, CFG.sheetTitle), chars, D, env()), empty: !chars.length, text: chars.join("") };
    },
    kanji(A, st) {
      let chars;
      const own = D.normalize(st.custom || "");
      if (own) chars = uniq(D.graphemes(own).filter((c) => c.trim()));
      else {
        const g = (window.UTG_JA_KANJI_GRADES || {})[st.grade] || "";
        const all = Array.from(g);
        const start = Math.max(0, (+st.from || 1) - 1);
        chars = all.slice(start, start + (+st.count || 10));
      }
      return { pages: C.buildCharSheets(A, Object.assign(masuOpts(st, CFG.sheetTitle), { glyphScale: 0.84 }), chars, D, env()), empty: !chars.length, text: chars.join(""), check: true };
    },
    name(A, st) {
      const names = st.who === "class" ? lines(st.roster).slice(0, 40) : [D.normalize(st.name || "")].filter(Boolean);
      let pages = [];
      names.forEach((nm) => {
        const script = D.scriptOf(nm);
        if (script === "latin") {
          const o = fourOpts(st, CFG.sheetTitle);
          const latin = D.normalize(nm, { latin: true });
          const per = C.fourLineCapacity(A, o);
          const rows = [];
          const traceRows = st.mode === "mite" ? 0 : st.mode === "nazori-kaki" ? 2 : Math.max(1, Math.ceil((per - 1) * 0.6));
          for (let i = 0; i < per; i++) rows.push({ text: latin, repeat: true, kind: i === 0 ? "model" : i <= traceRows ? "trace" : "blank", step: o.fade ? i - 1 : 0 });
          pages = pages.concat(fourPages(A, o, rows, window.UTG_STROKE_DIRECTION_DATA));
        } else {
          pages = pages.concat(C.buildNameMasu(A, masuOpts(st, CFG.sheetTitle), nm, D, env()));
        }
      });
      return { pages: pages, empty: !names.length, text: names.join(""), check: true };
    },
    alphabet(A, st) {
      const o = fourOpts(st, CFG.sheetTitle);
      let letters = [];
      const up = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), lo = up.map((c) => c.toLowerCase());
      if (st.pick) {
        const own = D.normalize(st.pick, { latin: true }).replace(/[^A-Za-z]/g, "");
        letters = uniq(own.split(""));
      } else letters = st.case === "lower" ? lo : st.case === "upper" ? up : null;
      let units;
      if (!letters) units = up.map((c) => ({ text: c + c.toLowerCase() }));
      else units = letters.map((c) => ({ text: st.case === "both" && !st.pick ? c + c.toLowerCase() : c }));
      if (st.pick && st.case === "both") units = letters.map((c) => ({ text: c.toUpperCase() + c.toLowerCase() }));
      return { pages: fourPages(A, o, practiceRows(units, st.mode), window.UTG_STROKE_DIRECTION_DATA), empty: !units.length };
    },
    eigo4sen(A, st) {
      const o = Object.assign(fourOpts(st, CFG.sheetTitle), { header: st.nameLine !== false || !!CFG.sheetTitle });
      const per = C.fourLineCapacity(A, o);
      const sample = D.normalize(st.sample || "", { latin: true });
      const rows = [];
      for (let i = 0; i < per; i++) rows.push({ text: "", kind: "blank" });
      if (sample) {
        rows[0] = { text: sample, kind: "model" };
        if (per > 1) rows[1] = { text: sample, kind: "trace" };
      }
      const copies = Math.min(10, Math.max(1, +st.pages || 1));
      const pages = [];
      for (let i = 0; i < copies; i++) pages.push(C.svgDoc(A, C.header(A, o) + C.fourLinePage(A, o, i === 0 ? rows : rows.map(() => ({ text: "", kind: "blank" })), window.UTG_STROKE_DIRECTION_DATA) + C.credit(A, env()), o.title));
      return { pages: pages, empty: false };
    },
    romaji(A, st) {
      const sys = st.system === "kunrei" ? "kunrei" : "hepburn";
      const o = Object.assign(fourOpts(st, CFG.sheetTitle), { labelW: 30 });
      let words = [];
      if (st.source === "own") words = lines(st.own).slice(0, 30);
      else if (st.source === "words") words = (D.ROMAJI_WORDS[st.words] || D.ROMAJI_WORDS.animals).words;
      else {
        (st.rows || []).forEach((r) => {
          const row = D.HIRAGANA.rows[+r];
          if (row) words = words.concat(Array.from(row[1]).filter((c) => c !== "　"));
        });
        if (st.yoon) words = words.concat(D.HIRAGANA.sets.yoon.chars);
      }
      const units = words.map((w) => ({ kana: w, text: D.toRomaji(w, sys) })).filter((u) => u.text && /[a-zâîûêôāīūēō']/i.test(u.text));
      return { pages: fourPages(A, o, practiceRows(units, st.mode, (u) => u.kana), window.UTG_STROKE_DIRECTION_DATA), empty: !units.length };
    },
    unpitsu(A, st) {
      const kinds = st.kinds || [];
      return { pages: C.buildUnpitsu(A, { kinds: kinds, level: +st.level || 1, title: CFG.sheetTitle, titles: CFG.patternTitles, nameLine: st.nameLine !== false }, env()), empty: !kinds.length };
    },
    nurie(A, st) {
      let chars = [];
      const table = D.HIRAGANA;
      if (st.set === "own") chars = D.graphemes(D.normalize(st.custom || "")).filter((c) => c.trim());
      else if (st.set && table.sets[st.set]) chars = table.sets[st.set].chars;
      else if (st.set && st.set.indexOf("row") === 0) chars = Array.from((table.rows[+st.set.slice(3)] || ["", ""])[1]).filter((c) => c !== "　");
      chars = uniq(chars).slice(0, 80);
      return { pages: C.buildNurie(A, { perPage: +st.per || 1, words: !!st.words, title: CFG.sheetTitle, nameLine: st.nameLine !== false }, chars, D, env()), empty: !chars.length, text: chars.join(""), check: st.set === "own" };
    }
  };

  /* ---- preview ------------------------------------------------------------ */

  const preview = $("#ja-sheet-preview", root);
  const pager = $("#ja-sheet-pager", root);
  const status = $("#ja-sheet-status", root);
  const pdfBtn = $("#ja-sheet-pdf", root);
  const printBtn = $("#ja-sheet-print", root);
  let current = { pages: [] }, pageIx = 0;

  function build() {
    const st = readOpts();
    const A = C.area(paperKey(), marginKey(), orientKey());
    const fn = BUILD[CFG.tool];
    if (!fn) return { pages: [], empty: true, A: A };
    const r = fn(A, st);
    r.A = A;
    r.pages = r.pages.slice(0, MAX_PAGES);
    return r;
  }

  function render() {
    current = build();
    if (pageIx >= current.pages.length) pageIx = 0;
    const n = current.pages.length;
    if (preview) {
      preview.style.aspectRatio = current.A.w + " / " + current.A.h;
      preview.innerHTML = n ? current.pages[pageIx] : "";
      const svg = preview.querySelector("svg");
      if (svg) { svg.removeAttribute("width"); svg.removeAttribute("height"); }
    }
    if (pager) {
      pager.hidden = n < 2;
      const label = $(".ja-pager-label", pager);
      if (label) label.textContent = (pageIx + 1) + " / " + n;
    }
    const msg = current.empty ? (CFG.emptyMessage || "文字をえらんでください。") : "";
    setStatus(msg);
    if (pdfBtn) {
      pdfBtn.disabled = !n || current.empty;
      const c = $(".ja-btn-count", pdfBtn);
      if (c) c.textContent = n ? "（" + n + "ページ）" : "";
    }
    if (printBtn) printBtn.disabled = !n || current.empty;
    if (current.check && current.text) checkGlyphs(current.text);
    else setFontNote("");
  }

  function setStatus(msg) { if (status) status.textContent = msg; }

  /* A character the textbook face does not carry falls back to the device's
     own font: legible, but not the 教科書体 shape. Say which ones, instead of
     letting a child trace a different letterform without knowing. The check
     is the browser's own: FontFaceSet.load() returns no face for text outside
     every Klee One unicode-range. */
  const fontNote = $("#ja-font-note", root);
  function setFontNote(s) { if (fontNote) { fontNote.textContent = s; fontNote.hidden = !s; } }
  let checkSeq = 0;
  function checkGlyphs(text) {
    if (!document.fonts || !document.fonts.load) return;
    const seq = ++checkSeq;
    const chars = uniq(Array.from(text).filter((c) => c.codePointAt(0) > 0x2E80));
    Promise.all(chars.map((c) => document.fonts.load("600 32px 'Klee One'", c).then((f) => (f.length ? "" : c), () => "")))
      .then((missing) => {
        if (seq !== checkSeq) return;
        const m = missing.filter(Boolean);
        setFontNote(m.length ? (CFG.fontNote || "次の字は教科書体のフォントにないため、お使いの端末のフォントで表示されます：") + m.join(" ") : "");
      });
  }

  /* ---- export --------------------------------------------------------------- */

  function loadScript(src, ready) {
    if (ready()) return Promise.resolve(ready());
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => (ready() ? res(ready()) : rej(new Error(src)));
      s.onerror = () => rej(new Error(src));
      document.head.appendChild(s);
    });
  }
  const pdfModule = () => loadScript("/js/printables/printablePdf.js", () => UTG.pdf);

  // The Klee One faces (and their unicode-ranges) the page's stylesheets declare.
  let facesCache = null;
  function faces() {
    if (facesCache) return facesCache;
    const out = [];
    Array.from(document.styleSheets).forEach((sh) => {
      let rules;
      try { rules = sh.cssRules; } catch (err) { return; }
      Array.from(rules || []).forEach((r) => {
        if (r.type !== 5) return;
        const fam = (r.style.getPropertyValue("font-family") || "").replace(/["']/g, "").trim();
        if (fam !== "Klee One") return;
        const m = /url\(["']?([^"')]+)/.exec(r.style.getPropertyValue("src") || "");
        if (!m) return;
        const ranges = (r.style.getPropertyValue("unicode-range") || "").split(",").map((x) => {
          const mm = /U\+([0-9A-F]+)(?:-([0-9A-F]+))?/i.exec(x.trim());
          return mm ? [parseInt(mm[1], 16), parseInt(mm[2] || mm[1], 16)] : null;
        }).filter(Boolean);
        out.push({ url: new URL(m[1], sh.href || location.href).href, ranges: ranges });
      });
    });
    facesCache = out;
    return out;
  }
  const dataCache = new Map();
  function dataUrl(url) {
    if (!dataCache.has(url)) {
      dataCache.set(url, fetch(url).then((r) => r.blob()).then((b) => new Promise((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b);
      })));
    }
    return dataCache.get(url);
  }
  // An SVG drawn as an <img> cannot fetch fonts, so the chunks its text needs
  // are inlined as data URLs — only those chunks.
  async function fontStyle(text) {
    const codes = new Set(Array.from(text, (c) => c.codePointAt(0)));
    const want = faces().filter((f) => f.ranges.some((r) => { for (const c of codes) if (c >= r[0] && c <= r[1]) return true; return false; }));
    const css = await Promise.all(want.map(async (f) => "@font-face{font-family:'Klee One';font-weight:600;font-style:normal;src:url(" + (await dataUrl(f.url)) + ") format('woff2');unicode-range:" +
      f.ranges.map((r) => "U+" + r[0].toString(16) + (r[1] !== r[0] ? "-" + r[1].toString(16) : "")).join(",") + ";}"));
    return css.join("");
  }

  function textOf(svg) {
    const m = svg.match(/>([^<>]+)</g) || [];
    return m.join("");
  }

  async function rasterize(svg, A, dpi) {
    const style = await fontStyle(textOf(svg).replace(/&[a-z]+;/g, ""));
    const withFonts = svg.replace(/(<svg[^>]*>)/, "$1<style>" + style + "</style>");
    const pxW = Math.round(A.w / 25.4 * dpi), pxH = Math.round(A.h / 25.4 * dpi);
    const sized = withFonts.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="' + pxW + '" height="' + pxH + '"');
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.decoding = "sync";
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("sheet image failed")); img.src = url; });
      if (img.decode) { try { await img.decode(); } catch (err) { /* already loaded */ } }
      const c = document.createElement("canvas");
      c.width = pxW; c.height = pxH;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pxW, pxH);
      ctx.drawImage(img, 0, 0, pxW, pxH);
      return c;
    } finally { URL.revokeObjectURL(url); }
  }

  let busy = false;
  async function downloadPdf() {
    if (busy || !current.pages.length) return;
    busy = true;
    if (pdfBtn) pdfBtn.setAttribute("aria-busy", "true");
    setStatus(CFG.workingMessage || "PDFを作っています…");
    try {
      await loadScript("/js/printables/qr.js", () => UTG.qr).catch(() => null);
      current = build();            // rebuild now the QR encoder is certainly present
      const pdf = await pdfModule();
      const A = current.A;
      const dpi = current.pages.length > 6 ? 200 : 300;
      const canvases = [];
      for (const s of current.pages) canvases.push(await rasterize(s, A, dpi));
      const rect = C.creditRect(A);
      const blob = await pdf.fromCanvases(canvases, {
        paperIn: { w: A.paper[0] / 25.4, h: A.paper[1] / 25.4 },
        marginIn: { x: A.margin / 25.4, y: A.margin / 25.4 },
        title: CFG.pdfTitle || document.title,
        links: canvases.map((c, i) => ({ page: i, rect: rect, url: "https://" + creditText() + "/" }))
      });
      pdf.download(blob, (CFG.fileName || SHEET_KEY) + ".pdf");
      track("download_pdf");
      if (UTG.trackPrintableEvent) UTG.trackPrintableEvent("printable_output", { printable_action: "pdf_saved", printable_sheet: SHEET_KEY, printable_pages: canvases.length });
      setStatus("");
    } catch (err) {
      // A browser that cannot rasterise (a tainted canvas, an old engine)
      // still gets the sheet through its print dialog.
      setStatus(CFG.fallbackMessage || "PDFを作れなかったため、印刷画面を開きます。");
      printSheets();
    } finally {
      busy = false;
      if (pdfBtn) pdfBtn.removeAttribute("aria-busy");
    }
  }

  function printSheets() {
    if (!current.pages.length) return;
    const printRoot = document.getElementById("pt-print-root");
    if (!printRoot) return;
    const A = current.A;
    printRoot.innerHTML = current.pages.map((s) => '<div class="pt-sheet-page ja-print-page">' + s + "</div>").join("");
    let pageStyle = document.getElementById("ja-page-style");
    if (!pageStyle) { pageStyle = document.createElement("style"); pageStyle.id = "ja-page-style"; document.head.appendChild(pageStyle); }
    const paper = { a4: "A4", letter: "letter", legal: "legal" }[paperKey()] || "A4";
    pageStyle.textContent = "@page{size:" + paper + " " + A.orient + ";margin:" + A.margin + "mm}";
    document.body.classList.add("is-printing", "ja-printing");
    if (UTG.hideForPrint) UTG.hideForPrint(printRoot);
    const done = () => {
      document.body.classList.remove("is-printing", "ja-printing");
      if (UTG.restorePrint) UTG.restorePrint();
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    track("print");
    // Fonts used only by the print surface must be loaded before the dialog
    // snapshots the page.
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(() => window.print());
  }

  /* ---- analytics (option keys only, never typed text) ---------------------- */

  function track(action) { if (UTG.trackPrintable) UTG.trackPrintable(action, SHEET_KEY); }
  const engaged = new Set();
  function trackControl(el) {
    if (!UTG.trackPrintableEvent) return;
    const k = el.getAttribute("data-ja-opt") || el.getAttribute("data-ja-paper") != null && "paper" || "margin";
    const isText = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /text|search/.test(el.type));
    const v = isText ? "typed" : el.type === "checkbox" ? (el.hasAttribute("data-ja-multi") ? el.value + (el.checked ? ":on" : ":off") : (el.checked ? "on" : "off")) : el.value;
    const key = k + ":" + v;
    if (engaged.has(key)) return;
    engaged.add(key);
    UTG.trackPrintableEvent("printable_engage", { printable_control: k, printable_value: String(v).slice(0, 40) });
  }
  let genTimer = null, lastGen = 0;
  function trackGenerate() {
    clearTimeout(genTimer);
    genTimer = setTimeout(() => {
      if (!UTG.trackPrintableEvent || Date.now() - lastGen < 30000) return;
      lastGen = Date.now();
      UTG.trackPrintableEvent("printable_generate", { printable_sheet: SHEET_KEY });
    }, 1500);
  }

  /* ---- wiring ---------------------------------------------------------------- */

  // Show/hide option groups that depend on another option (data-ja-show="opt=value").
  function syncVisibility() {
    const st = readOpts();
    $$("[data-ja-show]", root).forEach((el) => {
      const [k, v] = el.getAttribute("data-ja-show").split("=");
      const val = st[k];
      el.hidden = !(Array.isArray(val) ? val.indexOf(v) >= 0 : String(val) === v);
    });
  }

  let raf = 0;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { syncVisibility(); render(); }); }

  root.addEventListener("input", (e) => {
    const t = e.target;
    if (!t.matches("[data-ja-opt], [data-ja-paper], [data-ja-margin]")) return;
    if (t.matches("[data-ja-paper], [data-ja-margin]") && prefs()) {
      if (t.matches("[data-ja-paper]")) prefs().paper = t.value; else prefs().margin = t.value;
      if (UTG.printPrefs.save) UTG.printPrefs.save();
    }
    schedule();
    trackControl(t);
    trackGenerate();
  });
  root.addEventListener("change", (e) => { if (e.target.matches("select, input[type=checkbox], input[type=radio]")) schedule(); });

  if (pager) {
    pager.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-ja-step]");
      if (!b || !current.pages.length) return;
      pageIx = (pageIx + (+b.getAttribute("data-ja-step")) + current.pages.length) % current.pages.length;
      render();
    });
  }
  if (pdfBtn) pdfBtn.addEventListener("click", downloadPdf);
  if (printBtn) printBtn.addEventListener("click", printSheets);

  // Paper defaults to the shared print preference (A4 for a Japanese reader).
  const paperSel = $("[data-ja-paper]", root);
  if (paperSel && prefs() && UTG.printPrefs.hasStored && UTG.printPrefs.hasStored()) {
    if ($('option[value="' + prefs().paper + '"]', paperSel)) paperSel.value = prefs().paper;
  }
  const marginSel = $("[data-ja-margin]", root);
  if (marginSel && prefs() && prefs().margin && $('option[value="' + prefs().margin + '"]', marginSel)) marginSel.value = prefs().margin;

  // The face is loaded before the first paint of the preview so the masu do
  // not reflow from a fallback font into Klee One a moment later.
  const go = () => { syncVisibility(); render(); };
  if (document.fonts && document.fonts.load) document.fonts.load("600 20px 'Klee One'", CFG.warmText || "あア").then(go, go);
  else go();
  loadScript("/js/printables/qr.js", () => UTG.qr).then(() => render(), () => {});

  // For tests and the QA harness: the exact sheets a click would export.
  UTG.jaSheets = { build: build, rasterize: rasterize, render: render };
})();
