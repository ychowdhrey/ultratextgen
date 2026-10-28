/*
 * labelEngine.js — self-contained controller for the name-label sheet maker
 * (/printables/name-labels/ and its locale siblings).
 *
 * Why a separate engine rather than a printablesEngine.js surface: a label
 * sheet is judged by where the ink lands on the paper, to the millimetre,
 * because it is printed onto pre-cut label stock (Avery 5160 starts its first
 * row 0.5in from the top edge). printablesEngine.js rasterises a DOM clone,
 * scales any unit that overflows its page and reserves a 1.2in credit band,
 * so its output cannot be pinned to a stock's grid. This engine draws each
 * page straight onto a canvas at the exact physical size and hands the
 * canvases to printablePdf.js with a zero margin, so one CSS inch on the
 * canvas is one inch on the paper. Same pattern as monogramEngine.js and
 * crossStitchEngine.js: shared printPrefs.js (paper default, ink saver,
 * recent sheets), shared printablePdf.js, shared header.js credit and
 * printable_output telemetry.
 *
 * The journey (reordered 2026-10-25 after a live-browser audit): the name
 * comes first and starts empty, the sheet answers it at once, and every
 * later choice refines the sheet without undoing an earlier one.
 *   - The example name lives in the preview only (greyed, badged), never in
 *     the field. A field pre-filled with a sample read as a finished value,
 *     and a remembered sample turned "click, type Ava" into "Maya LopezAva".
 *   - "What is it for?" sets the label size and the example lines. It never
 *     changes a size or a label sheet the visitor chose (it suggests
 *     instead), and never retargets a list the visitor typed. A preset that
 *     did both printed a week of dates as the child's name and moved an
 *     Avery 5160 sheet's labels onto a 5163 grid.
 *   - A list REPLACES the field it fills (the field is hidden and a note
 *     takes its place); nothing is ever disabled.
 *   - Dated daycare labels are their own setting, never text in the list.
 *
 * Mount points (all optional except #lb-preview):
 *   #lb-what            .pt-choice-row  "What is it for?" presets
 *   #lb-name            the name input
 *   #lb-line2 #lb-line3 the detail lines (class, date, subject, ...)
 *   #lb-mode            .pt-choice-row  one / list
 *   #lb-list            textarea: one label set per line (names or subjects)
 *   #lb-list-target     select: what each list line fills
 *   #lb-date-mode       .pt-choice-row  hand / print (dated labels)
 *   #lb-copies          select: labels (per list entry)
 *   #lb-on              .pt-choice-row  cut paper / label sheet
 *   #lb-stock           select: which label sheet
 *   #lb-size #lb-paper  selects: label size and paper (cut paper only)
 *   #lb-font            .pt-choice-row
 *   #lb-symbol          .pt-choice-row (optional picture)
 *   #lb-border          checkbox
 *   #lb-nudge-x/-y      alignment nudge in mm (label stock only)
 *   #lb-preview         the live preview (a canvas is put in it)
 *   #lb-summary         "30 labels · 1 page · Avery 5160" line
 *   #lb-status          the polite live region (debounced summary + notes)
 *   #lb-warn            fit warnings
 *   #lb-pdf #lb-test    Download PDF / alignment test page
 *   #lb-sticky          the phone's sticky Download bar
 *
 * Nothing typed here ever reaches the dataLayer: the name and the list stay
 * in this tab and, once the visitor has typed something, in this device's
 * localStorage. Telemetry carries only the preset, the stock and the counts.
 */
(function () {
  "use strict";

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  const CFG = window.UTG_LABELS || {};
  const LANG = CFG.lang || (document.documentElement.lang || "en").slice(0, 2);
  const PP = UTG.printPrefs || null;

  const MM = 1 / 25.4; // inches per millimetre
  const INK = "#1a1a2e";
  const CUT = "#9aa3b2";

  /* ---------------- strings ---------------- */

  const I18N = {
    en: {
      labels: "labels", label: "label", page: "page", pages: "pages",
      howMany: "How many", perNameCount: "Labels per name", perLineCount: "Labels per line", tooLong: "Some text is very small on this label size. Try a shorter line or a bigger label.",
      empty: "Type a name to see your labels.",
      testTitle: "Alignment test: print on plain paper, hold it against your label sheet up to the light.",
      cutHint: "Cut along the grey lines",
      stockNote: "Print at 100% (Actual size). Fit to page moves every label.",
      fileName: "name-labels",
      testFile: "label-alignment-test",
      needName: "Type the name to print.", needList: "Type the list, one per line.",
      example: "Example sheet", exampleEdit: "✎ Type your name", exampleSummary: "Example",
      editName: "✎ Edit name", editList: "✎ Edit list",
      pageOf: "Page {n} of {t}", prevPage: "Previous page", nextPage: "Next page",
      keptSize: "Kept your {what}. {preset} usually uses {want}.", useIt: "Use it",
      fromList: "Filled from your list below.", typeOne: "Type one instead",
      dateHere: "Each day's date prints on this line.",
      restored: "Your last labels are back: {what}.", startFresh: "Start fresh",
      datesResult: "{n} labels: {first} to {last}, {per} a day", datesResultOne: "{n} labels for {first}",
      maxLen: "40 characters is the most one line holds.",
      closeUp: "One label, up close",
      listCount: "{n} on your list"
    },
    pt: {
      labels: "etiquetas", label: "etiqueta", page: "página", pages: "páginas",
      howMany: "Quantas etiquetas", perNameCount: "Etiquetas por nome", perLineCount: "Etiquetas por linha", tooLong: "Algum texto ficou muito pequeno neste tamanho. Tente uma linha mais curta ou uma etiqueta maior.",
      empty: "Digite um nome para ver as etiquetas.",
      testTitle: "Teste de posição: imprima em papel comum, encoste na folha de etiquetas e olhe contra a luz.",
      cutHint: "Recorte nas linhas cinza",
      stockNote: "Imprima em 100% (tamanho real). Ajustar à página tira todas as etiquetas do lugar.",
      fileName: "etiquetas-escolares",
      testFile: "teste-posicao-etiquetas",
      needName: "Digite o nome que vai na etiqueta.", needList: "Escreva a lista, um item por linha.",
      example: "Folha de exemplo", exampleEdit: "\u270e Digite o seu nome", exampleSummary: "Exemplo",
      editName: "\u270e Editar nome", editList: "\u270e Editar lista",
      pageOf: "Página {n} de {t}", prevPage: "Página anterior", nextPage: "Próxima página",
      keptSize: "Mantivemos {what}. {preset} costuma usar {want}.", useIt: "Usar",
      fromList: "Preenchido pela lista abaixo.", typeOne: "Digitar um só",
      dateHere: "A data de cada dia sai nesta linha.",
      restored: "Suas últimas etiquetas voltaram: {what}.", startFresh: "Começar do zero",
      datesResult: "{n} etiquetas: de {first} a {last}, {per} por dia", datesResultOne: "{n} etiquetas para {first}",
      maxLen: "Cada linha cabe até 40 caracteres.",
      closeUp: "Uma etiqueta, de perto",
      listCount: "{n} na lista"
    },
    ja: {
      labels: "枚", label: "枚", page: "ページ", pages: "ページ",
      howMany: "枚数", perNameCount: "1人あたりの枚数", perLineCount: "1行あたりの枚数", tooLong: "このサイズでは文字がとても小さくなります。短くするか、大きいサイズを選んでください。",
      empty: "名前を入力するとラベルが表示されます。",
      testTitle: "位置合わせテスト：普通紙に印刷してラベルシートに重ね、光に透かして確認してください。",
      cutHint: "グレーの線で切ってください",
      stockNote: "「実際のサイズ」か「100%」を選んで印刷してください。「ページに合わせる」で印刷すると、すべてのラベルの位置がずれます。",
      fileName: "onamae-seal",
      testFile: "label-ichiawase-test",
      needName: "印刷する名前を入力してください。", needList: "リストを1行に1つずつ入力してください。",
      example: "見本", exampleEdit: "\u270e 名前を入力", exampleSummary: "見本",
      editName: "\u270e 名前を編集", editList: "\u270e リストを編集",
      pageOf: "{n} / {t} ページ", prevPage: "前のページ", nextPage: "次のページ",
      keptSize: "{what}のままにしました。{preset}にはふつう{want}を使います。", useIt: "それにする",
      fromList: "下のリストから入ります。", typeOne: "1つだけ入力する",
      dateHere: "この行に毎日の日付が入ります。",
      restored: "前回のラベルを復元しました：{what}。", startFresh: "最初から作る",
      datesResult: "{n}枚：{first}から{last}まで、1日{per}枚", datesResultOne: "{first}の{n}枚",
      maxLen: "1行は40文字までです。",
      closeUp: "ラベル1枚の拡大",
      listCount: "リストに{n}件"
    },
    id: {
      labels: "label", label: "label", page: "halaman", pages: "halaman",
      howMany: "Jumlah label", perNameCount: "Label per nama", perLineCount: "Label per baris", tooLong: "Ada tulisan yang sangat kecil di ukuran label ini. Coba baris yang lebih pendek atau label yang lebih besar.",
      empty: "Ketik nama untuk melihat labelnya.",
      testTitle: "Tes posisi: cetak di kertas biasa, tempelkan ke lembar label dan terawang ke arah cahaya.",
      cutHint: "Gunting di garis abu-abu",
      stockNote: "Cetak 100% (Actual size). Pilihan Fit to page menggeser semua label.",
      fileName: "label-nama",
      testFile: "tes-posisi-label",
      needName: "Ketik nama yang mau dicetak.", needList: "Isi daftarnya, satu per baris.",
      example: "Contoh lembar", exampleEdit: "✎ Ketik nama kamu", exampleSummary: "Contoh",
      editName: "✎ Ubah nama", editList: "✎ Ubah daftar",
      pageOf: "Halaman {n} dari {t}", prevPage: "Halaman sebelumnya", nextPage: "Halaman berikutnya",
      keptSize: "{what} tetap dipakai. {preset} biasanya memakai {want}.", useIt: "Pakai itu",
      fromList: "Diisi dari daftar di bawah.", typeOne: "Ketik satu saja",
      dateHere: "Tanggal tiap hari dicetak di baris ini.",
      restored: "Label terakhir kamu dimuat lagi: {what}.", startFresh: "Mulai baru",
      datesResult: "{n} label: {first} sampai {last}, {per} per hari", datesResultOne: "{n} label untuk {first}",
      maxLen: "Satu baris paling banyak 40 karakter.",
      closeUp: "Satu label dari dekat",
      listCount: "{n} di daftar"
    }
  };
  const T = Object.assign({}, I18N.en, I18N[LANG] || {}, CFG.strings || {});
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));

  /* ---------------- sheets ----------------
     Label stock geometry, in inches. Each layout sums to its own sheet:
     side*2 + cols*w + (cols-1)*gapX = sheet width, and top*2 + rows*h +
     (rows-1)*gapY = sheet height (checked in labelEngine.test.js). The
     inkjet and laser versions of one Avery layout share a geometry, so
     each entry names both numbers. */
  const STOCKS = {
    "avery-5160": { name: "Avery 5160 / 8160", paper: "letter", w: 2.625, h: 1, cols: 3, rows: 10, left: 0.1875, top: 0.5, gapX: 0.125, gapY: 0, r: 0.0625 },
    "avery-5167": { name: "Avery 5167 / 8167", paper: "letter", w: 1.75, h: 0.5, cols: 4, rows: 20, left: 0.3, top: 0.5, gapX: 0.3, gapY: 0, r: 0.0625 },
    "avery-5163": { name: "Avery 5163 / 8163", paper: "letter", w: 4, h: 2, cols: 2, rows: 5, left: 0.15625, top: 0.5, gapX: 0.1875, gapY: 0, r: 0.0625 },
    "avery-l7160": { name: "Avery L7160 / J8160", paper: "a4", w: 63.5 * MM, h: 38.1 * MM, cols: 3, rows: 7, left: 7.21 * MM, top: 15.15 * MM, gapX: 2.54 * MM, gapY: 0, r: 2 * MM },
    "avery-l7651": { name: "Avery L7651 / J8651", paper: "a4", w: 38.1 * MM, h: 21.2 * MM, cols: 5, rows: 13, left: 4.67 * MM, top: 10.7 * MM, gapX: 2.54 * MM, gapY: 0, r: 2 * MM },
    "avery-l7163": { name: "Avery L7163 / J8163", paper: "a4", w: 99.1 * MM, h: 38.1 * MM, cols: 2, rows: 7, left: 4.65 * MM, top: 15.15 * MM, gapX: 2.5 * MM, gapY: 0, r: 2 * MM }
  };
  const PAPER = { letter: { w: 8.5, h: 11 }, a4: { w: 210 * MM, h: 297 * MM } };

  /* Label sizes for plain or full-sheet sticker paper, where the visitor cuts
     the labels out. Each is the size of a common label so a sheet printed
     today on plain paper and a label sheet bought later carry the same tile. */
  const SIZES = {
    letter: {
      xs: { w: 1.75, h: 0.5 },          // pencils and crayons (Avery 5167)
      s:  { w: 2.625, h: 1 },           // bottles and supplies (Avery 5160)
      m:  { w: 80 * MM, h: 40 * MM },   // 8 x 4 cm, the Indonesian book label
      l:  { w: 4, h: 2 }                // folders and bins (Avery 5163)
    },
    a4: {
      xs: { w: 1.75, h: 0.5 },          // 44 x 13 mm, four across A4 too
      s:  { w: 63.5 * MM, h: 25.4 * MM },
      m:  { w: 80 * MM, h: 40 * MM },
      l:  { w: 97 * MM, h: 50 * MM }    // two across A4; 4in would fit one
    }
  };
  const SIZE_STOCK = { letter: { xs: "avery-5167", s: "avery-5160", m: "avery-5160", l: "avery-5163" },
                       a4: { xs: "avery-l7651", s: "avery-l7160", m: "avery-l7160", l: "avery-l7163" } };

  /* Fonts the site self-hosts (assets/fonts/manifest.json); each at a weight
     the family ships, never a synthetic bold. */
  const FONTS = {
    rounded: { family: "Fredoka", weight: 600, detail: 500 },
    clear:   { family: "Quicksand", weight: 700, detail: 600 },
    bold:    { family: "Baloo 2", weight: 700, detail: 500 },
    hand:    { family: "Comic Neue", weight: 700, detail: 700 }
  };
  /* A page whose script these Latin faces do not cover names its own (the
     Japanese page: Klee One, and the reader's system gothic). `chunked` marks
     a family split into unicode-range files: see glyphsFor. */
  Object.assign(FONTS, CFG.fonts || {});

  /* Presets: what changes when the visitor says what the labels are for. The
     page's own config supplies the visible words (lines, placeholders); the
     engine owns the size and the list target. A preset's size is a default,
     not an order: once the visitor picks a size or a label sheet, a preset
     only suggests (see applyPreset). */
  const PRESETS = Object.assign({
    supplies: { size: "xs", list: "name" },
    books:    { size: "s",  list: "name" },
    bottles:  { size: "s",  list: "name" },
    lunch:    { size: "s",  list: "name" },
    bins:     { size: "l",  list: "name" },
    camp:     { size: "s",  list: "name" }
  }, CFG.presets || {});

  /* ---------------- state ---------------- */

  const STORE = "utg_label_sheet";
  const state = {
    preset: CFG.defaultPreset || "supplies",
    font: "rounded",
    symbol: "",
    border: false,
    sheet: "cut",          // "cut" (plain/sticker paper) or a STOCKS key
    size: "xs",
    sizeChosen: false,     // the visitor picked the size; presets only suggest
    copies: "fill",        // "fill" or a number per list entry
    mode: "one",           // "one" or "list"
    listTarget: "name",
    dates: false,          // print a date per day (presets with a dates panel)
    nudgeX: 0, nudgeY: 0,  // mm, label stock only
    nameStyle: "full",
    page: 0                // the preview page
  };
  let touched = false;      // nothing is remembered until the visitor acts
  let nameSource = "typed"; // typed | restored | carried (telemetry, never text)

  function $(id) { return document.getElementById(id); }

  function paperKey() {
    if (state.sheet !== "cut") return STOCKS[state.sheet].paper;
    const p = PP && PP.values ? PP.values.paper : (CFG.paper || "letter");
    return p === "a4" ? "a4" : "letter";
  }

  /* ---------------- layout ---------------- */

  /* Cut mode: labels edge to edge, so one straight cut separates two rows.
     0.25in is the margin home inkjets and lasers reach (and what lets three
     2.625in labels sit across Letter, as on an Avery 5160); a band at the
     foot holds the credit line. */
  const CUT_MARGIN = 0.25, CUT_FOOT = 0.3;

  function geometry() {
    const pk = paperKey();
    const paper = PAPER[pk];
    if (state.sheet !== "cut") {
      const s = STOCKS[state.sheet];
      return { paper: paper, w: s.w, h: s.h, cols: s.cols, rows: s.rows, left: s.left, top: s.top,
               gapX: s.gapX, gapY: s.gapY, r: s.r, stock: true, name: s.name };
    }
    const z = SIZES[pk][state.size] || SIZES[pk].s;
    const cols = Math.max(1, Math.floor((paper.w - 2 * CUT_MARGIN + 1e-6) / z.w));
    const rows = Math.max(1, Math.floor((paper.h - 2 * CUT_MARGIN - CUT_FOOT + 1e-6) / z.h));
    const left = (paper.w - cols * z.w) / 2;
    const top = CUT_MARGIN;
    return { paper: paper, w: z.w, h: z.h, cols: cols, rows: rows, left: left, top: top,
             gapX: 0, gapY: 0, r: 0, stock: false, name: "" };
  }

  /* What the label shows of a name. Parents choose: a full name inside a
     bag, initials or a first name on the outside, a surname alone on things
     that pass between siblings. Applied to every name, typed or listed. */
  function styleName(n) {
    const words = String(n || "").split(" ").filter(Boolean);
    if (words.length < 2 || state.nameStyle === "full") return n;
    const initial = (w) => Array.from(w)[0].toLocaleUpperCase();
    switch (state.nameStyle) {
      case "firstInitial": return words[0] + " " + initial(words[words.length - 1]) + ".";
      case "first": return words[0];
      case "surname": return words[words.length - 1];
      case "initials": return words.map((w) => initial(w) + ".").join("");
      default: return n;
    }
  }

  /* The labels the sheet carries, in order. Each list entry's labels stay
     together so a teacher hands one strip to one child. */
  function readLines() {
    const v = (id) => { const el = $(id); return el ? el.value.replace(/\s+/g, " ").trim() : ""; };
    return { name: v("lb-name"), line2: v("lb-line2"), line3: v("lb-line3") };
  }

  function readList() {
    const el = $("lb-list");
    if (!el || state.mode !== "list") return [];
    return el.value.split(/\r?\n/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 200);
  }

  function presetLines(key) {
    return (CFG.presetLines && CFG.presetLines[key || state.preset]) || {};
  }

  // Dates are a setting of the presets that offer them, never list text.
  function datesOn() { return !!(state.dates && presetLines().dates); }

  /* One date per day from the dates panel: weekdays only for "5w"/"10w". */
  function dateStrings() {
    const start = $("lb-date-start"), daysSel = $("lb-date-days");
    let d = start && start.value ? new Date(start.value + "T12:00:00") : new Date();
    if (isNaN(d.getTime())) d = new Date();
    const spec = (daysSel && daysSel.value) || "5w";
    const n = parseInt(spec, 10) || 1;
    const weekdays = /w$/.test(spec);
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat(CFG.dateLocale || LANG, { weekday: "short", month: "short", day: "numeric" });
    } catch (e) { fmt = null; }
    const out = [];
    while (out.length < n) {
      const day = d.getDay();
      if (!weekdays || (day !== 0 && day !== 6)) out.push(fmt ? fmt.format(d) : d.toDateString());
      d = new Date(d.getTime() + 864e5);
    }
    return out;
  }
  function datesPerDay() {
    const el = $("lb-date-per");
    return Math.max(1, parseInt((el && el.value) || "1", 10) || 1);
  }

  /* What is missing before the sheet is the visitor's own: "name" (single
     mode, or a list that fills another line), "list" (list mode, empty
     list), or "" (nothing). While something is missing the preview shows the
     example and Download asks for it instead of printing the example. */
  function missing() {
    const base = readLines();
    if (state.mode === "list") {
      if (!readList().length) return "list";
      if (state.listTarget !== "name" && !base.name) return "name";
      return "";
    }
    return base.name ? "" : "name";
  }

  function labelsFor(g) {
    const per = g.cols * g.rows;
    const base = readLines();
    const lines = presetLines();
    let list = readList();
    let example = false;
    const need = missing();
    if (need) {
      // The example: the page's sample name and each empty line's example.
      example = true;
      if (!base.name || (need === "list" && state.listTarget === "name")) base.name = CFG.sampleName || "";
      ["line2", "line3"].forEach((k) => {
        if (!base[k] && lines[k] && lines[k].example) base[k] = lines[k].example;
      });
      if (need === "list" && state.listTarget === "name") list = [];
    }
    base.name = styleName(base.name);
    const target = state.listTarget;
    let entries = list.length
      ? list.map((item) => Object.assign({}, base, { [target]: target === "name" ? styleName(item) : item }))
      : [base];
    if (!entries[0].name && !entries[0].line2 && !entries[0].line3) return [];
    let each;
    if (datesOn()) {
      const days = dateStrings();
      entries = [].concat.apply([], entries.map((e) => days.map((d) => Object.assign({}, e, { line2: d }))));
      each = datesPerDay();
    } else if (state.copies === "fill") {
      each = Math.max(1, Math.floor(per / entries.length));
    } else {
      each = Math.max(1, Number(state.copies) || 1);
    }
    const out = [];
    entries.forEach((lab) => { for (let i = 0; i < each; i++) out.push(lab); });
    out.example = example;
    return out;
  }

  /* ---------------- drawing ---------------- */

  function fontSpec(weight, px, family) {
    return weight + " " + px.toFixed(2) + "px '" + family + "', 'Plus Jakarta Sans', system-ui, sans-serif";
  }

  /* A detail line that ends in a colon ("Date:", "Kelas:") is a field to
     fill in by hand, so it gets a rule to write on: the label is printed
     once and the changing part (a bottle's date, a camp cabin) is written
     each time. */
  function isWriteIn(s) { return /[:：]\s*$/.test(s); }

  function drawLabel(ctx, lab, x, y, w, h, ppi, opt) {
    const f = FONTS[state.font] || FONTS.rounded;
    // Clear the border (inset 6% of the short side) plus a margin a printer
    // that is off by a millimetre cannot push the text across.
    const inset = state.border ? Math.min(w, h) * 0.06 : 0;
    const padX = inset + Math.min(w, h) * 0.1 + 0.05 * ppi;
    const padY = inset + Math.min(w, h) * 0.1 + 0.015 * ppi;
    const pad = padX;
    let bx = x + padX, by = y + padY, bw = w - 2 * padX, bh = h - 2 * padY;
    if (bw <= 0 || bh <= 0) return { small: true };
    let small = false;

    // Optional picture on the left, square, for children who cannot read yet.
    if (state.symbol && w / h >= 1.6) {
      const sz = Math.min(bh, bw * 0.3);
      ctx.save();
      ctx.font = (sz * 0.86).toFixed(1) + "px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = INK;
      ctx.fillText(state.symbol, bx + sz / 2, by + bh / 2 + sz * 0.04);
      ctx.restore();
      bx += sz + pad * 0.6;
      bw -= sz + pad * 0.6;
    }

    const details = [lab.line2, lab.line3].filter(Boolean);
    const name = lab.name;
    const k = details.length;
    // Height shares: the name line is the label; detail lines sit under it.
    const DETAIL = 0.56, LEAD = 1.18;
    ctx.textBaseline = "alphabetic";
    ctx.font = fontSpec(f.weight, 100, f.family);
    const widthOf = (t) => ctx.measureText(t).width / 100;

    /* A long name may read bigger on two lines than squeezed onto one, so
       both are measured and the larger type wins. The break goes at the
       space that balances the two halves; a name with no space stays one
       line, because a word is never hyphenated on a child's label. */
    const options = [];
    if (name) {
      options.push([name]);
      const words = name.split(" ");
      if (words.length > 1) {
        let best = null;
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
          const w = Math.max(widthOf(a), widthOf(b));
          if (!best || w < best.w) best = { w: w, lines: [a, b] };
        }
        options.push(best.lines);
      }
    } else {
      options.push([]);
    }
    let nameLines = options[0], nameSize = 0;
    options.forEach((lines, i) => {
      const units = lines.length + k * DETAIL;
      if (!units) return;
      let size = bh / (units * LEAD);
      lines.forEach((t) => { size = Math.min(size, bw / widthOf(t)); });
      // Prefer one line unless two are clearly bigger.
      if (i === 0 || size > nameSize * 1.15) { nameLines = lines; nameSize = size; }
    });
    const units = nameLines.length + k * DETAIL;
    if (!units) return { small: false };
    let detailSize = (bh / (units * LEAD)) * DETAIL;

    details.forEach((d) => {
      ctx.font = fontSpec(f.detail, 100, f.family);
      const t = isWriteIn(d) ? d + " \u2003\u2003\u2003" : d;
      const wid = ctx.measureText(t).width / 100;
      if (wid * detailSize > bw) detailSize = bw / wid;
    });
    if (nameLines.length && detailSize > nameSize * 0.9) detailSize = nameSize * 0.9;
    // 6pt is the smallest size a label is read at; below it, say so.
    const minPx = 6 / 72 * ppi;
    if ((nameLines.length && nameSize < minPx) || (k && detailSize < minPx * 0.9)) small = true;

    const blockH = nameLines.length * nameSize * LEAD + k * detailSize * LEAD;
    let cy = by + (bh - blockH) / 2;
    const cx = bx + bw / 2;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    nameLines.forEach((t) => {
      ctx.font = fontSpec(f.weight, nameSize, f.family);
      cy += nameSize * LEAD;
      ctx.fillText(t, cx, cy - nameSize * 0.22);
    });
    details.forEach((d) => {
      ctx.font = fontSpec(f.detail, detailSize, f.family);
      cy += detailSize * LEAD;
      const base = cy - detailSize * 0.22;
      if (isWriteIn(d)) {
        // Text at the left of the block, then a rule to the block's edge.
        ctx.textAlign = "left";
        const tw = ctx.measureText(d).width;
        const lineW = Math.min(bw - tw - detailSize * 0.3, bw * 0.75);
        const start = cx - (tw + detailSize * 0.3 + lineW) / 2;
        ctx.fillText(d, start, base);
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1, ppi * 0.008);
        ctx.beginPath();
        ctx.moveTo(start + tw + detailSize * 0.3, base + detailSize * 0.08);
        ctx.lineTo(start + tw + detailSize * 0.3 + lineW, base + detailSize * 0.08);
        ctx.stroke();
        ctx.restore();
        ctx.textAlign = "center";
      } else {
        ctx.fillText(d, cx, base);
      }
    });
    return { small: small };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function siteCredit() {
    if (UTG.printableCredit) return UTG.printableCredit();
    return "ultratextgen.com" + String(location.pathname || "/").replace(/\/$/, "");
  }

  /* One page as a canvas at `ppi` pixels per inch. `test` draws only the
     label outlines and their numbers: the alignment check. */
  function drawPage(g, labels, pageIndex, ppi, opts) {
    const o = opts || {};
    const W = Math.round(g.paper.w * ppi), H = Math.round(g.paper.h * ppi);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (!o.preview && PP && PP.values && PP.values.ink === "saver") ctx.globalAlpha = 0.72;

    const per = g.cols * g.rows;
    const dx = g.stock ? state.nudgeX * MM : 0, dy = g.stock ? state.nudgeY * MM : 0;
    let small = false;

    // On plain paper the cut grid is the whole sheet's guide, drawn first.
    if (!g.stock && !o.test) {
      ctx.save();
      ctx.strokeStyle = CUT;
      ctx.lineWidth = Math.max(1, ppi * 0.006);
      ctx.setLineDash([ppi * 0.05, ppi * 0.04]);
      const x0 = g.left * ppi, y0 = g.top * ppi;
      const x1 = (g.left + g.cols * g.w) * ppi, y1 = (g.top + g.rows * g.h) * ppi;
      const used = Math.min(per, Math.max(0, labels.length - pageIndex * per));
      const rowsUsed = Math.max(1, Math.ceil(used / g.cols));
      for (let r = 0; r <= rowsUsed; r++) {
        const yy = Math.round((g.top + r * g.h) * ppi) + 0.5;
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
      }
      for (let c = 0; c <= g.cols; c++) {
        const xx = Math.round((g.left + c * g.w) * ppi) + 0.5;
        ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, Math.min(y1, (g.top + rowsUsed * g.h) * ppi)); ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < per; i++) {
      const idx = pageIndex * per + i;
      const lab = labels[idx];
      if (!lab && !o.test) break;
      const c = i % g.cols, r = Math.floor(i / g.cols);
      const x = (g.left + c * (g.w + g.gapX) + dx) * ppi;
      const y = (g.top + r * (g.h + g.gapY) + dy) * ppi;
      const w = g.w * ppi, h = g.h * ppi;
      if (o.test || o.showStock) {
        ctx.save();
        ctx.strokeStyle = o.test ? INK : "#cfd6e3";
        ctx.lineWidth = Math.max(1, ppi * (o.test ? 0.01 : 0.006));
        roundRect(ctx, x, y, w, h, g.r * ppi);
        ctx.stroke();
        ctx.restore();
      }
      if (o.test) {
        ctx.save();
        ctx.fillStyle = "#64748b";
        ctx.font = fontSpec(600, Math.min(h * 0.35, ppi * 0.16), "Plus Jakarta Sans");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x + w / 2, y + h / 2);
        ctx.restore();
        continue;
      }
      if (state.border) {
        // Inset so the border survives a printer that is off by a millimetre.
        const ins = Math.min(w, h) * 0.06;
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.globalAlpha *= 0.55;
        ctx.lineWidth = Math.max(1, ppi * 0.012);
        roundRect(ctx, x + ins, y + ins, w - 2 * ins, h - 2 * ins, Math.min(w, h) * 0.18);
        ctx.stroke();
        ctx.restore();
      }
      const res = drawLabel(ctx, lab, x, y, w, h, ppi, o);
      if (res.small) small = true;
    }

    // Credit: low contrast, in the foot margin every one of these sheets has.
    if (!o.preview) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#aeb4c0";
      ctx.font = fontSpec(500, ppi * 0.09, "Plus Jakarta Sans");
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const footY = g.stock ? (g.paper.h - Math.min(0.2, g.top * 0.45)) * ppi : (g.paper.h - CUT_MARGIN + 0.05) * ppi;
      let note = siteCredit();
      if (o.test) note = T.testTitle;
      else if (!g.stock) note = T.cutHint + "  ·  " + note;
      ctx.fillText(note, W / 2, footY);
      ctx.restore();
    }
    canvas.labelSmall = small;
    return canvas;
  }

  function pageCount(g, n) { return Math.max(1, Math.ceil(n / (g.cols * g.rows))); }

  /* ---------------- preview + summary ---------------- */

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; render(); });
  }

  function fmtWH(w, h) {
    if (paperKey() === "a4" || CFG.metric) return Math.round(w / MM) + " × " + Math.round(h / MM) + " mm";
    const fr = (v) => (Math.round(v * 100) / 100).toString();
    return fr(w) + " × " + fr(h) + " in";
  }
  function fmtSize(g) { return fmtWH(g.w, g.h); }
  function sizeLabel(key) {
    const z = SIZES[paperKey()][key];
    const name = (CFG.sizeNames || {})[key] || key;
    return z ? name + " " + fmtWH(z.w, z.h) : name;
  }
  /* A sheet's name as this page's own picker writes it ("Pimaco 6180 /
     Avery 5160" on the Brazilian page), without its count; the engine's
     Avery name is the fallback. */
  function stockName(key) {
    const opt = document.querySelector("#lb-stock option[value='" + key + "']");
    const own = opt ? opt.textContent.replace(/\s*\([^)]*\)\s*$/, "").trim() : "";
    return own || (STOCKS[key] ? STOCKS[key].name : key);
  }
  function stockLabel(key) {
    const s = STOCKS[key];
    return s ? stockName(key) + " (" + fmtWH(s.w, s.h) + ")" : key;
  }
  function presetName(key) {
    const b = document.querySelector("#lb-what [data-value='" + key + "']");
    return b ? b.textContent.trim() : key;
  }

  /* The polite live region carries the summary once typing pauses, rather
     than the preview container re-announcing a replaced canvas on every
     keystroke (8 announcements for an 8-letter name, measured 2026-10-25). */
  let statusTimer = 0;
  function announce(text) {
    const el = $("lb-status");
    if (!el) return;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { if (el.textContent !== text) el.textContent = text; }, 700);
  }

  function setNeed(text) {
    const el = $("lb-need");
    if (el) el.textContent = text || "";
  }

  /* A field the list (or the dates) fills is hidden, and a note takes its
     place saying where its words come from, with a way back. A disabled
     field explained only by its placeholder read as "this name cannot be
     edited": the placeholder never showed behind the field's own value. */
  function fieldNote(input) {
    let note = input.parentNode.querySelector(".lb-from-list[data-for='" + input.id + "']");
    if (!note) {
      note = document.createElement("p");
      note.className = "lb-from-list";
      note.dataset.for = input.id;
      const text = document.createElement("span");
      note.appendChild(text);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-link-btn";
      btn.textContent = T.typeOne;
      btn.addEventListener("click", () => { touched = true; setMode("one", true); render(); input.focus(); });
      note.appendChild(btn);
      input.insertAdjacentElement("afterend", note);
    }
    return note;
  }
  function syncFields() {
    const listed = state.mode === "list";
    [["lb-name", "name"], ["lb-line2", "line2"], ["lb-line3", "line3"]].forEach((pair) => {
      const el = $(pair[0]);
      if (!el) return;
      const fromList = listed && state.listTarget === pair[1];
      const fromDates = pair[1] === "line2" && datesOn();
      const hide = fromList || fromDates;
      el.hidden = hide;
      el.disabled = false;
      const note = (hide || el.parentNode.querySelector(".lb-from-list[data-for='" + el.id + "']")) ? fieldNote(el) : null;
      if (note) {
        note.hidden = !hide;
        note.firstChild.textContent = fromDates ? T.dateHere : T.fromList + " ";
        note.lastChild.hidden = !fromList;
      }
    });
    const helper = $("lb-name-help");
    if (helper) helper.hidden = !!readLines().name || (listed && state.listTarget === "name");
    const max = $("lb-name"), maxNote = $("lb-name-note");
    if (max && maxNote) maxNote.hidden = max.value.length < (max.maxLength > 0 ? max.maxLength : 40);
    const row3 = $("lb-line3-row");
    if (row3) {
      const v = readLines();
      const lines = presetLines();
      const need = v.line2 || v.line3 || (lines.line3 && lines.line3.value) || (listed && state.listTarget === "line3");
      row3.hidden = !need;
    }
    const countLab = $("lb-copies-label");
    const listN = readList().length;
    if (countLab) countLab.textContent = !listN ? T.howMany : (state.listTarget === "name" ? T.perNameCount : T.perLineCount);
    const copiesField = $("lb-copies-field");
    if (copiesField) copiesField.hidden = datesOn();
    const listCount = $("lb-list-count");
    if (listCount) listCount.textContent = listN ? fill(T.listCount, { n: listN }) : "";
    const target = $("lb-list-target");
    if (target) {
      const opt = target.querySelector("option[value='line2']");
      if (opt) opt.disabled = datesOn();
    }
  }

  function render() {
    const g = geometry();
    const labels = labelsFor(g);
    const box = $("lb-preview");
    const sum = $("lb-summary");
    const warn = $("lb-warn");
    if (!box) return;
    const pages = pageCount(g, labels.length);
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    let text = T.empty;
    if (labels.length) {
      const n = labels.length;
      const where = g.stock ? stockName(state.sheet) : (paperKey() === "a4" ? "A4" : "US Letter");
      text = (labels.example ? T.exampleSummary + " · " : "") + n + " " + (n === 1 ? T.label : T.labels) + " · " + fmtSize(g) +
        " · " + pages + " " + (pages === 1 ? T.page : T.pages) + " · " + where;
    }
    if (sum) sum.textContent = text;
    announce(text);
    // The preview is the chosen page at screen resolution: the same drawing
    // code as the PDF, so what is seen is what prints.
    const cw = Math.max(240, Math.min(720, box.clientWidth || 480));
    const ppi = cw / g.paper.w * (window.devicePixelRatio || 1);
    glyphsFor(labels);
    const canvas = drawPage(g, labels, state.page, ppi, { preview: true, showStock: g.stock });
    canvas.className = "lb-preview-canvas" + (labels.example ? " is-example" : "");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", text);
    const old = box.querySelector("canvas.lb-preview-canvas");
    if (old) box.replaceChild(canvas, old); else box.insertBefore(canvas, box.firstChild);
    const placeholder = box.querySelector(".pt-sheet-preview");
    if (placeholder) placeholder.remove();
    drawActual(g, labels);
    const badge = $("lb-example-badge");
    if (badge) badge.hidden = !labels.example;
    const pill = $("lb-edit-pill");
    if (pill) {
      pill.hidden = !!labels.example;
      pill.textContent = state.mode === "list" && state.listTarget === "name" ? T.editList : T.editName;
    }
    if (warn) warn.textContent = canvas.labelSmall && !labels.example ? T.tooLong : "";
    if (!labels.example) setNeed("");
    // Pages: every page can be seen, not only the first.
    const pl = $("lb-page-label"), prev = $("lb-page-prev"), next = $("lb-page-next");
    if (pl) pl.textContent = fill(T.pageOf, { n: state.page + 1, t: pages });
    if (prev) { prev.hidden = pages < 2; prev.disabled = state.page === 0; }
    if (next) { next.hidden = pages < 2; next.disabled = state.page >= pages - 1; }
    // Dated labels: what the dates panel will print, in words.
    const dr = $("lb-date-result");
    if (dr) {
      if (datesOn() && labels.length) {
        const days = dateStrings();
        dr.textContent = days.length > 1
          ? fill(T.datesResult, { n: labels.length, first: days[0], last: days[days.length - 1], per: datesPerDay() })
          : fill(T.datesResultOne, { n: labels.length, first: days[0] });
      } else dr.textContent = "";
    }
    const st = $("lb-sticky-text");
    if (st) {
      const v = readLines();
      st.textContent = labels.example ? text : (state.mode === "list" ? fill(T.listCount, { n: readList().length }) : v.name) + " · " + labels.length + " " + T.labels;
    }
    syncFields();
    persist();
  }

  /* The first labels at 96 CSS px to the inch, scaled down only when one
     label is wider than the column. Not a claim of physical size: a CSS
     inch is not an inch on a phone. It shows how the name reads on one
     label, which the whole-page preview shrinks to a few millimetres. */
  function drawActual(g, labels) {
    const wrap = $("lb-actual");
    if (!wrap) return;
    const cap = $("lb-actual-cap");
    wrap.hidden = !labels.length;
    if (!labels.length) return;
    const avail = Math.max(160, (wrap.clientWidth || 320) - 2);
    const fit = Math.min(1, avail / (g.w * 96));
    const n = Math.max(1, Math.min(3, labels.length, Math.floor(avail / (g.w * 96 * fit))));
    const dpr = window.devicePixelRatio || 1;
    const ppi = 96 * fit * dpr;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(n * g.w * ppi) + 2;
    canvas.height = Math.round(g.h * ppi) + 2;
    canvas.style.width = (canvas.width / dpr) + "px";
    canvas.style.height = (canvas.height / dpr) + "px";
    canvas.className = "lb-actual-canvas" + (labels.example ? " is-example" : "");
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < n; i++) {
      const x = 1 + i * g.w * ppi, w = g.w * ppi, h = g.h * ppi;
      ctx.save();
      ctx.strokeStyle = CUT;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.strokeRect(x, 1, w, h);
      ctx.restore();
      drawLabel(ctx, labels[i], x, 1, w, h, ppi);
    }
    const old = wrap.querySelector("canvas");
    if (old) wrap.replaceChild(canvas, old); else wrap.appendChild(canvas);
    if (cap) cap.textContent = T.closeUp;
  }

  /* ---------------- PDF ---------------- */

  let pdfPromise = null;
  function loadPdf() {
    if (UTG.pdf) return Promise.resolve(UTG.pdf);
    if (pdfPromise) return pdfPromise;
    pdfPromise = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = "/js/printables/printablePdf.js";
      sc.onload = () => resolve(UTG.pdf);
      sc.onerror = () => { pdfPromise = null; reject(new Error("pdf module failed to load")); };
      document.head.appendChild(sc);
    });
    return pdfPromise;
  }

  function fontsReady(text) {
    const f = FONTS[state.font] || FONTS.rounded;
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    // a chunked family loads only the files covering the text it is asked
    // for, so the labels' own text is passed; for the others it is ignored
    const t = f.chunked && text ? text : undefined;
    return Promise.all([
      document.fonts.load(f.weight + " 40px '" + f.family + "'", t),
      document.fonts.load(f.detail + " 40px '" + f.family + "'", t),
      document.fonts.load("500 20px 'Plus Jakarta Sans'")
    ]).catch(() => {});
  }

  function textOf(labels) {
    return labels.map((l) => (l.name || "") + (l.line2 || "") + (l.line3 || "")).join("");
  }

  /* A family split into unicode-range files (Klee One on the Japanese page)
     downloads only the files a string needs, and canvas text never asks:
     drawn before they arrive, a name falls back to another face in the
     preview. So ask for the text on the labels, once per text, and redraw
     when files arrive. */
  const asked = {};
  function glyphsFor(labels) {
    const f = FONTS[state.font] || FONTS.rounded;
    if (!f.chunked || !document.fonts || !document.fonts.load) return;
    const text = textOf(labels);
    const key = state.font + "|" + text;
    if (!text || asked[key]) return;
    asked[key] = true;
    fontsReady(text).then((res) => {
      if (res && res.some((faces) => faces && faces.length)) schedule();
    });
  }

  function track(action, extra) {
    if (UTG.trackPrintable) UTG.trackPrintable(action, "labels-" + state.preset);
    if (UTG.trackPrintableEvent && extra) UTG.trackPrintableEvent("printable_output", extra);
  }

  function engage(control, value) {
    if (!UTG.trackPrintableEvent) return;
    const key = "lb:" + control + ":" + value;
    if (engage.seen[key]) return;
    engage.seen[key] = true;
    UTG.trackPrintableEvent("printable_engage", { printable_control: control, printable_value: String(value) });
  }
  engage.seen = {};

  /* The editable thing behind the preview: the list when the list makes
     the names (or is still empty), otherwise the name. */
  function focusEditable() {
    const need = missing();
    const useList = state.mode === "list" && (need === "list" || (!need && state.listTarget === "name"));
    const el = useList ? $("lb-list") : $("lb-name");
    if (!el) return;
    el.focus();
    if (el.select) el.select();
  }

  function makePdf(test) {
    if (!test) {
      // The example is never printed: ask for what is missing instead of
      // disabling the button, which explained nothing.
      const need = missing();
      if (need) {
        setNeed(need === "list" ? T.needList : T.needName);
        focusEditable();
        engage("download_blocked_empty", need);
        return;
      }
    }
    const btn = test ? $("lb-test") : $("lb-pdf");
    if (btn) btn.setAttribute("aria-busy", "true");
    const g = geometry();
    const labels = test ? [] : labelsFor(g);
    if (!test && !labels.length) return;
    const n = test ? 1 : pageCount(g, labels.length);
    const ppi = 96 * (PP && PP.scale ? PP.scale() : 2);
    return Promise.all([loadPdf(), fontsReady(textOf(labels))]).then((res) => {
      const P = res[0];
      if (!P || !P.supported()) throw new Error("pdf unsupported");
      const canvases = [];
      for (let i = 0; i < n; i++) canvases.push(drawPage(g, labels, i, ppi, { test: test }));
      return P.fromCanvases(canvases, {
        paperIn: { w: g.paper.w, h: g.paper.h },
        marginIn: { x: 0, y: 0 },
        title: document.title,
        printScaling: "none"
      }).then((blob) => {
        P.download(blob, (test ? T.testFile : T.fileName) + "-" + (g.stock ? state.sheet : paperKey() + "-" + state.size) + ".pdf");
        if (test) {
          track("download_pdf_test");
        } else {
          track("download_pdf", { printable_action: "pdf_saved", printable_sheet: "labels-" + state.preset, printable_pages: n,
            printable_stock: g.stock ? state.sheet : "cut-" + state.size, printable_count: labels.length,
            printable_list: readList().length ? "list" : "single",
            printable_name_source: state.mode === "list" && state.listTarget === "name" ? "list" : nameSource });
          remember();
        }
      });
    }).catch(() => {
      // The PDF writer cannot run here (old browser): print the canvases.
      printFallback(g, labels, n, test);
    }).finally(() => { if (btn) btn.removeAttribute("aria-busy"); });
  }

  function printFallback(g, labels, n, test) {
    const root = $("pt-print-root");
    if (!root) return;
    root.innerHTML = "";
    const ppi = 192;
    for (let i = 0; i < n; i++) {
      const c = drawPage(g, labels, i, ppi, { test: test });
      const img = document.createElement("img");
      img.src = c.toDataURL("image/png");
      img.style.width = g.paper.w + "in";
      img.style.height = g.paper.h + "in";
      img.style.display = "block";
      img.style.breakAfter = "page";
      root.appendChild(img);
    }
    const st = document.createElement("style");
    st.textContent = "@page { size: " + g.paper.w + "in " + g.paper.h + "in; margin: 0 } #pt-print-root { padding: 0 !important }";
    root.appendChild(st);
    document.body.classList.add("is-printing");
    // Keep the print root itself visible (hiding every body child, root
    // included, printed a blank page) and always put the page back: nothing
    // used to restore it, so the fallback left the whole site display:none
    // until reload, and its @page rule behind.
    if (UTG.hideForPrint) UTG.hideForPrint(root);
    const done = () => {
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("is-printing");
      if (UTG.restorePrint) UTG.restorePrint();
      if (st.parentNode) st.parentNode.removeChild(st);
    };
    window.addEventListener("afterprint", done);
    setTimeout(() => {
      try { window.print(); } catch (e) { done(); }
    }, 60);
    track(test ? "print_test" : "print");
  }

  /* ---------------- memory ----------------
     The form state is kept on this device only, so a teacher who comes back
     next term finds the class list where she left it. Never sent anywhere.
     Nothing is kept until the visitor has typed or chosen something: the
     page used to save its own untouched example on the first render, so the
     next visit "restored" a sample nobody typed. */

  function persist() {
    try {
      const keep = $("lb-remember");
      if (keep && !keep.checked) { localStorage.removeItem(STORE); return; }
      if (!touched) return;
      const data = Object.assign({}, state, readLines(), {
        list: ($("lb-list") || {}).value || "",
        listAuto: !!($("lb-list") && $("lb-list").dataset.auto === "1"),
        dateDays: ($("lb-date-days") || {}).value || "",
        datePer: ($("lb-date-per") || {}).value || ""
      });
      delete data.page;
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch (e) { /* storage blocked: nothing to keep */ }
  }

  /* Returns null (nothing kept) or { meaningful }: whether the visitor's own
     words came back, which is when the restore line is shown. */
  function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { data = null; }
    if (!data || data.preset && !PRESETS[data.preset]) return null;
    ["preset", "font", "symbol", "border", "sheet", "size", "sizeChosen", "copies", "listTarget", "nameStyle", "dates", "mode"].forEach((k) => {
      if (data[k] !== undefined) state[k] = data[k];
    });
    if (state.sheet !== "cut" && !STOCKS[state.sheet]) state.sheet = "cut";
    // Older saves: the sample the page used to pre-fill was saved untouched.
    // It is nobody's name, so it does not come back as one.
    const legacy = CFG.legacyDefaults || {};
    ["name", "line2", "line3"].forEach((k) => { if (legacy[k] && data[k] === legacy[k]) data[k] = ""; });
    if (data.mode === undefined) state.mode = data.list && String(data.list).trim() ? "list" : "one";
    const lines = presetLines(state.preset);
    const set = (id, v, auto) => {
      const el = $(id);
      if (!el || typeof v !== "string") return;
      el.value = v;
      el.dataset.auto = auto ? "1" : "";
    };
    set("lb-name", data.name, false);
    ["line2", "line3"].forEach((k) => {
      const spec = lines[k] || {};
      set("lb-" + k, data[k], !!(spec.value && data[k] === spec.value));
    });
    const listAuto = data.listAuto || (lines.list && data.list === lines.list);
    set("lb-list", data.list, listAuto);
    if (data.dateDays && $("lb-date-days")) $("lb-date-days").value = data.dateDays;
    if (data.datePer && $("lb-date-per")) $("lb-date-per").value = data.datePer;
    if (data.name) nameSource = "restored";
    touched = true;
    const meaningful = !!(data.name || (data.list && !listAuto) ||
      ["line2", "line3"].some((k) => data[k] && !((lines[k] || {}).value === data[k])));
    return { meaningful: meaningful };
  }

  function remember() {
    if (!PP || !PP.rememberRecent) return;
    const page = location.pathname;
    PP.rememberRecent({ href: page, label: (readLines().name || T.labels), page: page, sheet: "labels-" + state.preset });
  }

  /* ---------------- controls ---------------- */

  function setChoice(rowId, value) {
    const row = $(rowId);
    if (!row) return;
    row.querySelectorAll("[data-value]").forEach((b) => {
      const on = b.getAttribute("data-value") === value;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
  }

  function wireChoices(rowId, onPick) {
    const row = $(rowId);
    if (!row) return;
    row.addEventListener("click", (e) => {
      const b = e.target.closest("[data-value]");
      if (!b || !row.contains(b)) return;
      touched = true;
      onPick(b.getAttribute("data-value"));
    });
    // Arrow keys move within a radiogroup, as the role promises.
    row.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) < 0) return;
      const items = Array.from(row.querySelectorAll("[data-value]"));
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
      next.focus();
      touched = true;
      onPick(next.getAttribute("data-value"));
    });
  }

  function syncSheetControls() {
    const cut = state.sheet === "cut";
    setChoice("lb-on", cut ? "cut" : "stock");
    const stockSel = $("lb-stock");
    if (stockSel && !cut) stockSel.value = state.sheet;
    const sizeSel = $("lb-size");
    if (sizeSel) {
      const pk = paperKey(), names = CFG.sizeNames || {};
      Array.from(sizeSel.options).forEach((opt) => {
        const z = SIZES[pk][opt.value];
        if (z && names[opt.value]) opt.textContent = names[opt.value] + " · " + fmtWH(z.w, z.h);
      });
      sizeSel.value = state.size;
    }
    const show = (id, on) => { const el = $(id); if (el) el.hidden = !on; };
    show("lb-size-row", cut);
    show("lb-stock-row", !cut);
    show("lb-nudge-row", !cut);
    show("lb-test", !cut);
    show("lb-stock-note", !cut);
    const copies = $("lb-copies");
    if (copies) copies.value = String(state.copies);
    const target = $("lb-list-target");
    if (target) target.value = state.listTarget;
    const border = $("lb-border");
    if (border) border.checked = !!state.border;
    const ns = $("lb-name-style");
    if (ns) ns.value = state.nameStyle || "full";
    setChoice("lb-what", state.preset);
    setChoice("lb-font", state.font);
    setChoice("lb-symbol", state.symbol);
    setChoice("lb-mode", state.mode);
    setChoice("lb-date-mode", state.dates ? "print" : "hand");
    show("lb-list-box", state.mode === "list");
    show("lb-date-opts", !!state.dates);
  }

  function setMode(mode, fromUser) {
    state.mode = mode === "list" ? "list" : "one";
    if (fromUser) engage("mode", state.mode);
    syncSheetControls();
    if (fromUser && state.mode === "list") { const l = $("lb-list"); if (l) l.focus(); }
    schedule();
  }

  /* A preset's suggestion, when the visitor already chose a size or a sheet
     the preset would have changed. One line, one button; nothing changes
     unless they press it. */
  let suggestion = null;
  function showSuggestion(text, apply) {
    const box = $("lb-what-note");
    suggestion = apply;
    if (!box) return;
    box.textContent = "";
    box.hidden = !text;
    if (!text) return;
    box.appendChild(document.createTextNode(text + " "));
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lb-link-btn";
    btn.textContent = T.useIt;
    btn.addEventListener("click", () => {
      if (suggestion) suggestion();
      showSuggestion("");
      syncSheetControls();
      schedule();
    });
    box.appendChild(btn);
  }

  /* A preset sets the size (unless the visitor chose one), the example lines
     and, when the visitor has no list of their own, the list target. It
     never changes a chosen size or label sheet, never overwrites a line or a
     list the visitor typed, and never retargets their list. */
  function applyPreset(key, fromUser) {
    const p = PRESETS[key];
    if (!p) return;
    state.preset = key;
    let note = "", apply = null;
    if (state.sheet !== "cut") {
      const want = SIZE_STOCK[STOCKS[state.sheet].paper][p.size];
      if (!state.sizeChosen) state.size = p.size;
      if (fromUser && want && want !== state.sheet) {
        note = fill(T.keptSize, { what: stockName(state.sheet), preset: presetName(key), want: stockLabel(want) });
        apply = () => { state.sheet = want; };
      }
    } else if (!state.sizeChosen) {
      state.size = p.size;
    } else if (fromUser && state.size !== p.size) {
      note = fill(T.keptSize, { what: sizeLabel(state.size), preset: presetName(key), want: sizeLabel(p.size) });
      apply = () => { state.size = p.size; state.sizeChosen = false; };
    }
    showSuggestion(note, apply);
    if (note) engage("preset_kept", state.sheet !== "cut" ? "stock" : "size");
    const lines = presetLines(key);
    [["lb-line2", "line2"], ["lb-line3", "line3"]].forEach((pair) => {
      const el = $(pair[0]);
      if (!el) return;
      const spec = lines[pair[1]] || {};
      el.placeholder = spec.placeholder || "";
      if (fromUser && (!el.value || el.dataset.auto === "1")) {
        el.value = spec.value || "";
        el.dataset.auto = spec.value ? "1" : "";
      }
      const lab = document.querySelector("label[for='" + pair[0] + "']");
      if (lab && spec.label) lab.textContent = spec.label;
    });
    // The preset's example list follows the rule of its example lines: it
    // comes and goes with the preset, unless the visitor typed their own.
    const listEl = $("lb-list");
    const ownList = !!(listEl && listEl.value.trim() && listEl.dataset.auto !== "1");
    if (listEl && !ownList) {
      state.listTarget = p.list || "name";
      if (fromUser || !listEl.value) {
        listEl.value = lines.list || "";
        listEl.dataset.auto = lines.list ? "1" : "";
      }
      if (lines.list) state.mode = "list";
      else if (fromUser && state.mode === "list" && !listEl.value) state.mode = "one";
    }
    const listLab = document.querySelector("label[for='lb-list']");
    if (listLab) {
      if (!listLab.dataset.orig) listLab.dataset.orig = listLab.textContent;
      listLab.textContent = lines.listLabel || listLab.dataset.orig;
    }
    if (listEl && lines.listPlaceholder) listEl.placeholder = lines.listPlaceholder;
    const hint = $("lb-what-hint");
    if (hint) hint.textContent = lines.hint || "";
    const dates = $("lb-dates");
    if (dates) dates.hidden = !lines.dates;
    syncSheetControls();
    if (fromUser) engage("preset", key);
  }

  function reset() {
    try { localStorage.removeItem(STORE); } catch (e) { /* nothing kept */ }
    ["lb-name", "lb-line2", "lb-line3", "lb-list"].forEach((id) => { const el = $(id); if (el) { el.value = ""; el.dataset.auto = ""; } });
    state.symbol = ""; state.copies = "fill"; state.nudgeX = 0; state.nudgeY = 0; state.nameStyle = "full";
    state.mode = "one"; state.dates = false; state.sizeChosen = false; state.page = 0;
    ["lb-nudge-x", "lb-nudge-y"].forEach((id) => { const el = $(id); if (el) el.value = "0"; });
    const notice = $("lb-restored");
    if (notice) notice.hidden = true;
    nameSource = "typed";
    applyPreset(CFG.defaultPreset || "supplies", true);
    touched = false;
    engage("start_fresh", "1");
    const nm = $("lb-name"); if (nm) nm.focus();
    schedule();
  }

  function showRestored() {
    const box = $("lb-restored");
    if (!box) return;
    const parts = [presetName(state.preset)];
    parts.push(state.sheet !== "cut" ? stockName(state.sheet) : sizeLabel(state.size));
    const n = readList().length;
    if (n) parts.push(fill(T.listCount, { n: n }));
    box.textContent = "";
    box.appendChild(document.createTextNode(fill(T.restored, { what: parts.join(", ") }) + " "));
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lb-link-btn";
    btn.textContent = T.startFresh;
    btn.addEventListener("click", reset);
    box.appendChild(btn);
    box.hidden = false;
    engage("restore_shown", "1");
  }

  /* The phone's sticky Download bar: shown while the tool is on screen and
     its own Download button is not. */
  function mountSticky() {
    const bar = $("lb-sticky"), pdf = $("lb-pdf"), tool = document.querySelector(".lb-tool");
    if (!bar || !pdf || !tool || !("IntersectionObserver" in window)) return;
    const mq = window.matchMedia ? window.matchMedia("(max-width: 900px)") : { matches: false };
    let pdfVisible = true, toolVisible = false;
    const sync = () => { bar.hidden = !(mq.matches && toolVisible && !pdfVisible); };
    new IntersectionObserver((es) => { pdfVisible = es[0].isIntersecting; sync(); }).observe(pdf);
    new IntersectionObserver((es) => { toolVisible = es[0].isIntersecting; sync(); }).observe(tool);
    if (mq.addEventListener) mq.addEventListener("change", sync);
    const btn = $("lb-sticky-pdf");
    if (btn) btn.addEventListener("click", () => makePdf(false));
  }

  function init() {
    if (!$("lb-preview")) return;
    /* Ctrl+P without Download PDF: hide the site chrome and say which button
       prints the sheet (printPrefs.js owns the note and its translations).
       The button's own text is the page's label, so the note names what the
       visitor can actually see. */
    if (PP && PP.mountPrintNote) {
      const pdfBtn = $("lb-pdf");
      PP.mountPrintNote({ lang: LANG, button: pdfBtn && pdfBtn.textContent.trim() });
    }
    if (PP && PP.values) state.sheet = "cut";
    const restored = restore();
    /* A name carried from another sheet (?name=, the name kit row) fills the
       name line, over whatever this device remembered: the link is the newer
       intent. Only the name line; the detail lines and the class list stay. */
    const carried = PP && PP.carriedName ? PP.carriedName() : "";
    const nameBox = $("lb-name");
    if (carried && nameBox) {
      nameBox.value = carried.slice(0, nameBox.maxLength > 0 ? nameBox.maxLength : 40);
      nameBox.dataset.auto = "";
      nameSource = "carried";
      touched = true;
      if (state.mode === "list" && state.listTarget === "name") state.mode = "one";
    }
    applyPreset(state.preset, false);
    if (!restored) {
      // First visit: the default preset's working lines ("Date:" on a
      // bottle label), never an example value.
      const lines = presetLines();
      [["lb-line2", "line2"], ["lb-line3", "line3"]].forEach((pair) => {
        const el = $(pair[0]);
        const spec = lines[pair[1]] || {};
        if (el && !el.value && spec.value) { el.value = spec.value; el.dataset.auto = "1"; }
      });
    }
    syncSheetControls();
    if (restored && restored.meaningful && !carried) showRestored();

    // Preview: the badge and the edit pill, and a click anywhere on the
    // sheet goes to the field that makes it.
    const box = $("lb-preview");
    if (!$("lb-example-badge")) {
      const badge = document.createElement("button");
      badge.type = "button";
      badge.id = "lb-example-badge";
      badge.className = "lb-example-badge";
      badge.hidden = true;
      const strong = document.createElement("strong");
      strong.textContent = T.example;
      const span = document.createElement("span");
      span.textContent = T.exampleEdit;
      badge.appendChild(strong); badge.appendChild(span);
      box.appendChild(badge);
      // One label up close, under the sheet: the whole page shrinks a
      // 1.75in label to a few millimetres on a phone, which says nothing
      // about whether the name will be readable.
      const actual = document.createElement("div");
      actual.id = "lb-actual";
      actual.className = "lb-actual";
      const head = document.createElement("div");
      head.className = "lb-actual-head";
      const cap = document.createElement("span");
      cap.id = "lb-actual-cap";
      cap.className = "lb-actual-cap";
      head.appendChild(cap);
      const pill = document.createElement("button");
      pill.type = "button";
      pill.id = "lb-edit-pill";
      pill.className = "lb-link-btn lb-edit-pill";
      pill.hidden = true;
      head.appendChild(pill);
      actual.appendChild(head);
      // After Download PDF, so the button keeps its place above the fold.
      const actions = box.parentNode.querySelector(".pt-preview-actions");
      (actions || box).insertAdjacentElement("afterend", actual);
      actual.addEventListener("click", (e) => {
        if (e.target.closest("canvas, .lb-edit-pill")) { engage("preview_click", "1"); focusEditable(); }
      });
    }
    box.addEventListener("click", (e) => {
      if (e.target.closest("canvas, .lb-example-badge")) {
        engage("preview_click", "1");
        focusEditable();
      }
    });

    wireChoices("lb-what", (v) => { applyPreset(v, true); state.page = 0; schedule(); });
    wireChoices("lb-font", (v) => { state.font = v; setChoice("lb-font", v); engage("font", v); fontsReady().then(schedule); schedule(); });
    wireChoices("lb-symbol", (v) => { state.symbol = v; setChoice("lb-symbol", v); engage("symbol", v ? "on" : "off"); schedule(); });
    wireChoices("lb-mode", (v) => setMode(v, true));
    wireChoices("lb-date-mode", (v) => { state.dates = v === "print"; engage("dates", v); syncSheetControls(); state.page = 0; schedule(); });
    wireChoices("lb-on", (v) => {
      if (v === "cut") state.sheet = "cut";
      else if (state.sheet === "cut") state.sheet = SIZE_STOCK[paperKey()][state.size] || "avery-5160";
      if (state.sheet !== "cut" && PP && PP.values) { PP.values.paper = STOCKS[state.sheet].paper; if (PP.save) PP.save(); }
      showSuggestion("");
      syncSheetControls();
      engage("stock", state.sheet);
      schedule();
    });

    ["lb-name", "lb-line2", "lb-line3", "lb-list"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        el.dataset.auto = "";
        touched = true;
        if (id === "lb-name") nameSource = "typed";
        schedule();
      });
    });
    ["lb-date-start", "lb-date-days", "lb-date-per"].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener("change", () => { touched = true; schedule(); });
    });
    const onSel = (id, fn) => { const el = $(id); if (el) el.addEventListener("change", () => { touched = true; fn(el); schedule(); }); };
    onSel("lb-stock", (el) => {
      if (!STOCKS[el.value]) return;
      state.sheet = el.value;
      if (PP && PP.values) {
        // Keep the region's paper in step with the stock that was picked.
        PP.values.paper = STOCKS[state.sheet].paper;
        if (PP.save) PP.save();
      }
      showSuggestion("");
      syncSheetControls();
      engage("stock", state.sheet);
    });
    onSel("lb-size", (el) => { state.size = el.value; state.sizeChosen = true; showSuggestion(""); engage("size", el.value); });
    onSel("lb-copies", (el) => { state.copies = el.value === "fill" ? "fill" : Number(el.value); engage("copies", el.value); });
    onSel("lb-list-target", (el) => { state.listTarget = el.value; });
    onSel("lb-paper", (el) => {
      if (PP && PP.values) { PP.values.paper = el.value; if (PP.save) PP.save(); }
      syncSheetControls();
    });
    const border = $("lb-border");
    if (border) border.addEventListener("change", () => { touched = true; state.border = border.checked; schedule(); });
    onSel("lb-name-style", (el) => { state.nameStyle = el.value; engage("name_style", el.value); });
    const ds = $("lb-date-start");
    if (ds && !ds.value) {
      const t = new Date();
      ds.value = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    }
    ["lb-nudge-x", "lb-nudge-y"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        const v = Math.max(-5, Math.min(5, Number(el.value) || 0));
        if (id === "lb-nudge-x") state.nudgeX = v; else state.nudgeY = v;
        schedule();
      });
    });
    const keep = $("lb-remember");
    if (keep) keep.addEventListener("change", () => { if (keep.checked) touched = true; persist(); });
    const paperSel = $("lb-paper");
    if (paperSel && PP && PP.values) paperSel.value = PP.values.paper === "a4" ? "a4" : "letter";

    const step = (d) => { state.page += d; engage("page_step", "1"); schedule(); };
    const prev = $("lb-page-prev"), next = $("lb-page-next");
    if (prev) { prev.setAttribute("aria-label", T.prevPage); prev.addEventListener("click", () => step(-1)); }
    if (next) { next.setAttribute("aria-label", T.nextPage); next.addEventListener("click", () => step(1)); }

    const pdf = $("lb-pdf");
    if (pdf) pdf.addEventListener("click", () => makePdf(false));
    const test = $("lb-test");
    if (test) test.addEventListener("click", () => makePdf(true));
    const resetBtn = $("lb-reset");
    if (resetBtn) resetBtn.addEventListener("click", reset);
    mountSticky();

    let t = 0;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(schedule, 150); });
    fontsReady().then(schedule);
    schedule();

    // The name kit row. On load: the English list is
    // read from the footer, which footer.js renders.
    const mountCarry = () => {
      const box = $("lb-name");
      if (!box || !PP || !PP.mountNameCarry) return;
      PP.mountNameCarry({
        // An empty field carries nothing: the example is nobody's name.
        word: () => box.value,
        watch: [box],
        // At the end of the tool's section, where the sheet engine puts it.
        place: (row) => {
          (box.closest("section") || box.parentNode).appendChild(row);
        }
      });
    };
    if (document.readyState === "complete") mountCarry();
    else window.addEventListener("load", mountCarry, { once: true });

    // printable_generate: the visitor typed (a count, never the text).
    const nm = $("lb-name");
    if (nm && UTG.trackPrintableEvent) {
      let sent = false;
      nm.addEventListener("input", () => {
        if (sent) return;
        sent = true;
        UTG.trackPrintableEvent("printable_generate", { printable_sheet: "labels" });
      });
    }
    UTG.labels.ready = true;
  }

  // Exposed for the geometry test and the scenario harness; not a public API.
  UTG.labels = { STOCKS: STOCKS, SIZES: SIZES, PAPER: PAPER, geometry: geometry, labelsFor: labelsFor, state: state, drawPage: drawPage, ready: false };

  if (document.readyState === "complete") init();
  else window.addEventListener("DOMContentLoaded", init);
})();
