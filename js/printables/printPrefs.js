/*
 * printPrefs.js — the one owner of sheet setup for every printables surface.
 *
 * Paper, orientation, margins, ink saver and render scale used to live inside
 * printablesEngine.js, so the two standalone tools (monogram-maker,
 * cross-stitch-letters) had no panel at all and wrote a hardcoded 8.5x11in
 * page forever. Six live pages, no way to ask for A4. This module holds the
 * state, the paper tables and the panel builder so all three engines read one
 * copy — the same "one owner" rule gridSectionsHTML() and cta_routing.py
 * already follow.
 *
 * Exposes window.UltraTextGen.printPrefs:
 *   values          the live prefs object (read it, do not replace it)
 *   paperFull()     {w,h} inches — the real page box, orientation applied
 *   marginIn()      margin in inches
 *   scale()         render scale for the PDF rasteriser (2 = 192dpi, 3 = 288)
 *   pageStyleCss()  the @page rule for the print fallback
 *   save()          persist to localStorage
 *   buildPanel(o)   the <details> panel; o = { labels, onChange }
 *   defaultPaper()  the region default, exported for tests
 *
 * Load it BEFORE any engine that uses it. It has no dependencies.
 */
(function () {
  "use strict";
  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  if (UTG.printPrefs) return;

  const KEY = "utg_print_prefs";

  /* Usable content budget per paper (inches), after the browser's own default
     margin and the sheet title. Kept as the LAYOUT budget so a PDF page and a
     printed page of the same sheet paginate alike. */
  const PAPERS = {
    letter: { css: "letter", w: 7.5,  h: 10.0 },
    a4:     { css: "A4",     w: 7.27, h: 10.7 },
    legal:  { css: "legal",  w: 7.5,  h: 13.0 }
  };
  /* Full sheet sizes, for the PDF page box. */
  const PAPER_FULL = {
    letter: { w: 8.5,  h: 11.0 },
    a4:     { w: 8.27, h: 11.69 },
    legal:  { w: 8.5,  h: 14.0 }
  };
  const MARGINS = { normal: "0.5in", narrow: "0.25in" };
  /* 2 = 192dpi against a 96px CSS inch, 3 = 288dpi. Above 3 the file grows
     faster than the sheet improves and mobile Safari starts failing the
     allocation, so the control offers two steps rather than a slider. */
  const SCALES = { normal: 2, high: 3 };

  /* ISO 3166-1 alpha-2 regions that use US Letter (ANSI A) rather than ISO
     A4. The short list is the whole of the Letter world: North America plus
     the Philippines and the parts of Latin America that followed US practice.
     Everywhere else is A4.

     This matters because "Automatic" used to mean "let the print dialog
     decide" — a real answer while printing was the default path. Once every
     action writes a PDF there is no dialog left to defer to, and the writer
     has to name a page box, so "Automatic" silently resolved to 8.5x11in for
     everybody. That handed a US Letter file to every visitor on the 93 A4
     locale pages. The option is gone; this is what replaced it. */
  const LETTER_REGIONS = new Set([
    "US", "CA", "MX", "PH", "CL", "CO", "CR", "DO", "GT", "NI", "PA", "PE",
    "PR", "SV", "VE", "BO", "EC", "HN", "CU"
  ]);

  /* Read the region the visitor's own browser reports, never the page's
     language: es covers both Spain (A4) and Mexico (Carta), and a Mexican
     parent on /es/imprimibles/ wants Letter. navigator.languages is ordered
     by the visitor's own preference, so the first entry carrying a region
     subtag wins. A language with no region tells us nothing about paper and
     is skipped rather than guessed at. */
  function defaultPaper() {
    let tags = [];
    try {
      tags = (navigator.languages && navigator.languages.length)
        ? navigator.languages.slice()
        : (navigator.language ? [navigator.language] : []);
    } catch (err) { tags = []; }
    for (const tag of tags) {
      const parts = String(tag || "").split("-");
      for (let i = 1; i < parts.length; i++) {
        const seg = parts[i].toUpperCase();
        if (/^[A-Z]{2}$/.test(seg)) {
          return LETTER_REGIONS.has(seg) ? "letter" : "a4";
        }
      }
    }
    /* No region anywhere in the list. An English page is overwhelmingly a US
       audience for printables; every other language this site ships is an A4
       one. That is a weaker signal than the region subtag, which is why it is
       the fallback and not the rule. */
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return lang === "en" ? "letter" : "a4";
  }

  const values = {
    paper: defaultPaper(),
    orient: "portrait",
    margin: "normal",
    ink: "normal",
    quality: "normal"
  };

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      /* A stored "auto" is a pref from before this module existed. Resolve it
         to the detected paper rather than dropping it: the visitor never
         chose Letter, the old default chose it for them. */
      if (saved.paper === "auto") values.paper = defaultPaper();
      else if (PAPERS[saved.paper]) values.paper = saved.paper;
      if (saved.orient === "landscape" || saved.orient === "portrait") values.orient = saved.orient;
      if (MARGINS[saved.margin]) values.margin = saved.margin;
      if (saved.ink === "saver" || saved.ink === "normal") values.ink = saved.ink;
      if (SCALES[saved.quality]) values.quality = saved.quality;
    }
  } catch (err) { /* private mode or corrupt value: defaults apply */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(values)); } catch (err) { /* optional */ }
  }
  function paperFull() {
    const p = PAPER_FULL[values.paper] || PAPER_FULL.letter;
    return values.orient === "landscape" ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
  }
  function marginIn() {
    return parseFloat(MARGINS[values.margin] || MARGINS.normal) || 0.5;
  }
  function scale() { return SCALES[values.quality] || SCALES.normal; }
  function pageStyleCss() {
    const paper = PAPERS[values.paper] || PAPERS.letter;
    const size = paper.css ? paper.css + " " + values.orient : values.orient;
    return "@page { size: " + size + "; margin: " + (MARGINS[values.margin] || MARGINS.normal) + "; }";
  }

  /* ---------------- the panel ---------------- */

  /* The panel's own strings, in the eight languages these pages ship in.
     MOVED here from printablesEngine.js's I18N table rather than retyped --
     every value is that table's own already-translated string, extracted
     programmatically. The panel owns them because the panel is what renders
     them: before this, monogramEngine and crossStitchEngine had no access to
     them at all, which is half the reason those six pages had no panel.
     printablesEngine still passes its own PO and so is unaffected. */
  const PANEL_I18N = {
    en:  { settings: "Print settings", paper: "Paper", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Orientation", portrait: "Portrait", landscape: "Landscape", margins: "Margins", normal: "Normal", narrow: "Narrow", inkSaver: "Ink saver (lighter lines)" },
    fr:  { settings: "Réglages d'impression", paper: "Papier", letter: "Lettre US", a4: "A4", legal: "Legal", orientation: "Orientation", portrait: "Portrait", landscape: "Paysage", margins: "Marges", normal: "Normales", narrow: "Étroites", inkSaver: "Économie d'encre (traits plus clairs)" },
    es:  { settings: "Ajustes de impresión", paper: "Papel", letter: "Carta", a4: "A4", legal: "Oficio", orientation: "Orientación", portrait: "Vertical", landscape: "Horizontal", margins: "Márgenes", normal: "Normales", narrow: "Estrechos", inkSaver: "Ahorro de tinta (líneas más claras)" },
    pt:  { settings: "Configurações de impressão", paper: "Papel", letter: "Carta", a4: "A4", legal: "Ofício", orientation: "Orientação", portrait: "Retrato", landscape: "Paisagem", margins: "Margens", normal: "Normais", narrow: "Estreitas", inkSaver: "Economia de tinta (linhas mais claras)" },
    it:  { settings: "Impostazioni di stampa", paper: "Carta", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientamento", portrait: "Verticale", landscape: "Orizzontale", margins: "Margini", normal: "Normali", narrow: "Stretti", inkSaver: "Risparmio inchiostro (linee più chiare)" },
    pl:  { settings: "Ustawienia druku", paper: "Papier", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientacja", portrait: "Pionowa", landscape: "Pozioma", margins: "Marginesy", normal: "Normalne", narrow: "Wąskie", inkSaver: "Oszczędzanie tuszu (jaśniejsze linie)" },
    de:  { settings: "Druckeinstellungen", paper: "Papier", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Ausrichtung", portrait: "Hochformat", landscape: "Querformat", margins: "Ränder", normal: "Normal", narrow: "Schmal", inkSaver: "Tintensparmodus (hellere Linien)" },
    id:  { settings: "Pengaturan cetak", paper: "Kertas", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientasi", portrait: "Potret", landscape: "Lanskap", margins: "Margin", normal: "Normal", narrow: "Sempit", inkSaver: "Hemat tinta (garis lebih tipis)" },
  };

  /* The action-row strings the three engines share (Share, Copy link,
     Pinterest, Save as PDF). Same provenance as PANEL_I18N above: every value
     is printablesEngine.js's own already-translated string, extracted, not
     retyped. They live here because this is the one module all three engines
     load, and without it a locale page that does not spell them out in its
     own inline config falls back to English -- which is exactly what
     fr/imprimables/alphabet-point-de-croix was doing, rendering a French
     panel above an English share row. It also keeps EN's "Pin on Pinterest"
     (chosen 2026-09-15, because "Save to" collided with the Save buttons)
     from drifting back to "Save to Pinterest" on the two standalone tools. */
  const SHARE_I18N = {
    en:  { share: "Share", shareImage: "Share as image", copyLink: "Copy link", linkCopied: "Link copied", pinterest: "Pin on Pinterest", savePdf: "Save as PDF" },
    fr:  { share: "Partager", shareImage: "Partager en image", copyLink: "Copier le lien", linkCopied: "Lien copié", pinterest: "Épingler sur Pinterest", savePdf: "Enregistrer en PDF" },
    es:  { share: "Compartir", shareImage: "Compartir como imagen", copyLink: "Copiar enlace", linkCopied: "Enlace copiado", pinterest: "Guardar en Pinterest", savePdf: "Guardar como PDF" },
    pt:  { share: "Compartilhar", shareImage: "Compartilhar como imagem", copyLink: "Copiar link", linkCopied: "Link copiado", pinterest: "Salvar no Pinterest", savePdf: "Salvar como PDF" },
    it:  { share: "Condividi", shareImage: "Condividi come immagine", copyLink: "Copia link", linkCopied: "Link copiato", pinterest: "Salva su Pinterest", savePdf: "Salva come PDF" },
    pl:  { share: "Udostępnij", shareImage: "Udostępnij jako obraz", copyLink: "Kopiuj link", linkCopied: "Link skopiowany", pinterest: "Zapisz na Pintereście", savePdf: "Zapisz jako PDF" },
    de:  { share: "Teilen", shareImage: "Als Bild teilen", copyLink: "Link kopieren", linkCopied: "Link kopiert", pinterest: "Auf Pinterest merken", savePdf: "Als PDF speichern" },
    id:  { share: "Bagikan", shareImage: "Bagikan sebagai gambar", copyLink: "Salin tautan", linkCopied: "Tautan disalin", pinterest: "Simpan ke Pinterest", savePdf: "Simpan sebagai PDF" },
  };
  function shareLabels() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return Object.assign({}, SHARE_I18N.en, SHARE_I18N[lang] || {});
  }

  function panelLabels() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return Object.assign({}, PANEL_I18N.en, PANEL_I18N[lang] || {});
  }


  function choiceRow(labelText, options, current, onPick) {
    const row = document.createElement("div");
    row.className = "pt-print-opt";
    const lab = document.createElement("span");
    lab.className = "pt-print-opt-label"; lab.textContent = labelText;
    row.appendChild(lab);
    const group = document.createElement("div");
    group.className = "pt-choice-row pt-print-opt-choices";
    group.setAttribute("role", "radiogroup"); group.setAttribute("aria-label", labelText);
    options.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pt-choice pt-choice-sm"; b.textContent = o.label;
      b.setAttribute("role", "radio");
      const on = o.key === current;
      b.classList.toggle("is-active", on); b.setAttribute("aria-checked", on ? "true" : "false");
      b.addEventListener("click", () => {
        onPick(o.key);
        [...group.children].forEach((x) => {
          const sel = x === b;
          x.classList.toggle("is-active", sel);
          x.setAttribute("aria-checked", sel ? "true" : "false");
        });
      });
      group.appendChild(b);
    });
    row.appendChild(group);
    return row;
  }

  function checkRow(labelText, checked, onToggle, extraClass) {
    const lab = document.createElement("label");
    lab.className = "pt-print-opt " + (extraClass || "");
    const box = document.createElement("input");
    box.type = "checkbox"; box.checked = !!checked;
    box.addEventListener("change", () => onToggle(box.checked));
    lab.appendChild(box); lab.appendChild(document.createTextNode(" " + labelText));
    return lab;
  }

  /* o.labels carries this locale's own words — every engine already ships
     them, so nothing is translated here. o.onChange fires after each edit so
     the caller can repaint its preview; a control with no visible consequence
     is indistinguishable from a control that does nothing, which is the
     report the panel was rebuilt for on 2026-09-13. */
  UTG.printPrefs = {
    values: values,
    PAPERS: PAPERS,
    PAPER_FULL: PAPER_FULL,
    MARGINS: MARGINS,
    SCALES: SCALES,
    defaultPaper: defaultPaper,
    shareLabels: shareLabels,
    paperFull: paperFull,
    marginIn: marginIn,
    scale: scale,
    pageStyleCss: pageStyleCss,
    save: save,
    /* o.only, when given, lists the controls this caller actually honours.
       A surface must never render a control it ignores: that is exactly the
       "the print settings don't change the display" report the panel was
       rebuilt for on 2026-09-13, and a panel of five controls where two do
       nothing is worse than a panel of three that all work. */
    buildPanel: function (o) {
      const opt = o || {};
      const L = Object.assign(panelLabels(), opt.labels || {});
      const only = opt.only ? new Set(opt.only) : null;
      const wants = (k) => !only || only.has(k);
      const changed = () => { save(); if (opt.onChange) opt.onChange(); };
      const details = document.createElement("details");
      details.className = "pt-print-options";
      const summary = document.createElement("summary");
      summary.textContent = L.settings || "Print settings";
      details.appendChild(summary);
      if (wants("paper")) details.appendChild(choiceRow(L.paper || "Paper", [
        { key: "letter", label: L.letter || "US Letter" },
        { key: "a4", label: L.a4 || "A4" },
        { key: "legal", label: L.legal || "Legal" }
      ], values.paper, (k) => { values.paper = k; changed(); }));
      if (wants("orientation")) details.appendChild(choiceRow(L.orientation || "Orientation", [
        { key: "portrait", label: L.portrait || "Portrait" },
        { key: "landscape", label: L.landscape || "Landscape" }
      ], values.orient, (k) => { values.orient = k; changed(); }));
      if (wants("margins")) details.appendChild(choiceRow(L.margins || "Margins", [
        { key: "normal", label: L.normal || "Normal" },
        { key: "narrow", label: L.narrow || "Narrow" }
      ], values.margin, (k) => { values.margin = k; changed(); }));
      if (wants("ink")) details.appendChild(checkRow(L.inkSaver || "Ink saver (lighter lines)",
        values.ink === "saver",
        (on) => { values.ink = on ? "saver" : "normal"; changed(); }, "pt-print-ink"));
      /* Deliberately labelled with a numeral and an international unit rather
         than a translated phrase. There is no word for "quality" attested
         anywhere on this site in any of the eight languages these pages ship
         in, and locales/*.json has none either — so a translated label would
         be eight invented strings, which this repo does not do. "300 DPI" is
         the same in every one of them. (fr printing UIs sometimes prefer
         "PPP"; worth a native read, noted rather than guessed.) */
      if (wants("quality")) details.appendChild(checkRow("300 DPI", values.quality === "high",
        (on) => { values.quality = on ? "high" : "normal"; changed(); }, "pt-print-dpi"));
      return details;
    }
  };
})();
