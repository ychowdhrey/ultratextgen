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
 *   sheetPreviewUrl() the image that represents this SHEET, never the OG card
 *   stateSummary(L) the active non-default settings, in this page's language
 *   readRecent() / rememberRecent(entry)   the "recent sheets" list, one key
 *   renderRecentInto(m, L) / renderSavedInto(m, L) / buildMemoryStrips(L)
 *                   the recent and saved strips under the share row
 *   moreSection(scope, o) / nameDateRow() / frameCanvas(art, o)
 *                   the sheet's title + name-and-date line, for all three engines
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
    /* 288 DPI by default, not 192. The print dialog used to be the primary
       route and the browser rendered vector text at the printer's own
       resolution; since 2026-09-15 every sheet action writes a raster PDF, so
       the render scale IS the resolution of the thing the visitor gets, and
       "normal" was handing a 169x175 DPI image to someone about to print and
       cut it. Kept behind the same one-line switch rather than removed, and
       renderPages() drops long batch jobs back to 2 on its own. */
    quality: "high"
  };

  /* Whether this visitor has print settings of their own. A shared preset
     carries the SENDER's paper, and paper is a property of the recipient's
     printer rather than of the sheet -- an A4 teacher opening a US colleague's
     link was being handed US Letter. So a link may seed paper for someone who
     has never chosen, and never overrides someone who has. */
  let stored = false;
  /* High contrast, translated 2026-09-25 (owner: every option in every
     language), checked against native software and teaching pages. A
     language with no row still gets no control, and a stored "contrast" is
     still cleared there, for the reason given where it is read. */
  const CONTRAST_I18N = {
    en: "High contrast (for photocopying)",
    de: "Hoher Kontrast (zum Kopieren)",
    it: "Alto contrasto (per le fotocopie)",
    pl: "Wysoki kontrast (do kserowania)",
    fr: "Contraste élevé (pour la photocopie)",
    es: "Alto contraste (para fotocopiar)",
    pt: "Alto contraste (para fotocópia)",
    id: "Kontras tinggi (untuk difotokopi)",
    nl:  "Hoog contrast (om te kopiëren)",
    tr:  "Yüksek kontrast (fotokopi için)"
  };
  function contrastLabel() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return CONTRAST_I18N[lang] || null;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      stored = true;
      /* A stored "auto" is a pref from before this module existed. Resolve it
         to the detected paper rather than dropping it: the visitor never
         chose Letter, the old default chose it for them. */
      if (saved.paper === "auto") values.paper = defaultPaper();
      else if (PAPERS[saved.paper]) values.paper = saved.paper;
      if (saved.orient === "landscape" || saved.orient === "portrait") values.orient = saved.orient;
      if (MARGINS[saved.margin]) values.margin = saved.margin;
      if (saved.ink === "saver" || saved.ink === "normal" || saved.ink === "contrast") values.ink = saved.ink;
      /* One localStorage key serves every page, so a visitor who turns high
         contrast on in English and then opens a locale page would carry a mode
         with no control to see or clear it. Cleared HERE rather than when the
         panel is built, because the paper preview is painted first: resetting
         later left the German caption reading "High contrast" over a sheet
         that was not. */
      if (values.ink === "contrast" && !contrastLabel()) values.ink = "normal";
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
    en:  { settings: "PDF settings", paper: "Paper", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Orientation", portrait: "Portrait", landscape: "Landscape", margins: "Margins", normal: "Normal", narrow: "Narrow", inkSaver: "Ink saver (lighter lines)" },
    fr:  { settings: "Réglages du PDF", paper: "Papier", letter: "Lettre US", a4: "A4", legal: "Legal", orientation: "Orientation", portrait: "Portrait", landscape: "Paysage", margins: "Marges", normal: "Normales", narrow: "Étroites", inkSaver: "Économie d'encre (traits plus clairs)" },
    es:  { settings: "Ajustes del PDF", paper: "Papel", letter: "Carta", a4: "A4", legal: "Oficio", orientation: "Orientación", portrait: "Vertical", landscape: "Horizontal", margins: "Márgenes", normal: "Normales", narrow: "Estrechos", inkSaver: "Ahorro de tinta (líneas más claras)" },
    pt:  { settings: "Configurações do PDF", paper: "Papel", letter: "Carta", a4: "A4", legal: "Ofício", orientation: "Orientação", portrait: "Retrato", landscape: "Paisagem", margins: "Margens", normal: "Normais", narrow: "Estreitas", inkSaver: "Economia de tinta (linhas mais claras)" },
    it:  { settings: "Impostazioni PDF", paper: "Carta", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientamento", portrait: "Verticale", landscape: "Orizzontale", margins: "Margini", normal: "Normali", narrow: "Stretti", inkSaver: "Risparmio inchiostro (linee più chiare)" },
    pl:  { settings: "Ustawienia PDF", paper: "Papier", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientacja", portrait: "Pionowa", landscape: "Pozioma", margins: "Marginesy", normal: "Normalne", narrow: "Wąskie", inkSaver: "Oszczędzanie tuszu (jaśniejsze linie)" },
    de:  { settings: "PDF-Einstellungen", paper: "Papier", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Ausrichtung", portrait: "Hochformat", landscape: "Querformat", margins: "Ränder", normal: "Normal", narrow: "Schmal", inkSaver: "Tintensparmodus (hellere Linien)" },
    id:  { settings: "Pengaturan PDF", paper: "Kertas", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientasi", portrait: "Potret", landscape: "Lanskap", margins: "Margin", normal: "Normal", narrow: "Sempit", inkSaver: "Hemat tinta (garis lebih tipis)" },
    nl:  {"settings": "PDF-instellingen", "paper": "Papier", "letter": "US Letter", "a4": "A4", "legal": "Legal", "orientation": "Afdrukstand", "portrait": "Staand", "landscape": "Liggend", "margins": "Marges", "normal": "Normaal", "narrow": "Smal", "inkSaver": "Inkt besparen (lichtere lijnen)"},
    tr:  { settings: "PDF ayarları", paper: "Kâğıt", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Yön", portrait: "Dikey", landscape: "Yatay", margins: "Kenar boşlukları", normal: "Normal", narrow: "Dar", inkSaver: "Mürekkep tasarrufu (daha açık çizgiler)" }
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
  /* savePdf here and PO.savePdf in printablesEngine.js are two tables for one
     label. Both read "Download PDF" (2026-09-17): "Save as PDF" sat beside
     "Download PNG", two verbs for one kind of action. Each locale's string is
     derived from that locale's own downloadPng, not translated. Change one and
     you must change the other, or the monogram and cross-stitch tools drift
     from the 297 sheet pages. */
  const SHARE_I18N = {
    en:  { share: "Share", shareImage: "Share as image", copyLink: "Copy link", linkCopied: "Link copied", pinterest: "Pin on Pinterest", savePdf: "Download PDF" },
    fr:  { share: "Partager", shareImage: "Partager en image", copyLink: "Copier le lien", linkCopied: "Lien copié", pinterest: "Épingler sur Pinterest", savePdf: "Télécharger le PDF" },
    es:  { share: "Compartir", shareImage: "Compartir como imagen", copyLink: "Copiar enlace", linkCopied: "Enlace copiado", pinterest: "Guardar en Pinterest", savePdf: "Descargar PDF" },
    pt:  { share: "Compartilhar", shareImage: "Compartilhar como imagem", copyLink: "Copiar link", linkCopied: "Link copiado", pinterest: "Salvar no Pinterest", savePdf: "Baixar PDF" },
    it:  { share: "Condividi", shareImage: "Condividi come immagine", copyLink: "Copia link", linkCopied: "Link copiato", pinterest: "Salva su Pinterest", savePdf: "Scarica PDF" },
    pl:  { share: "Udostępnij", shareImage: "Udostępnij jako obraz", copyLink: "Kopiuj link", linkCopied: "Link skopiowany", pinterest: "Zapisz na Pintereście", savePdf: "Pobierz PDF" },
    de:  { share: "Teilen", shareImage: "Als Bild teilen", copyLink: "Link kopieren", linkCopied: "Link kopiert", pinterest: "Auf Pinterest merken", savePdf: "PDF herunterladen" },
    id:  { share: "Bagikan", shareImage: "Bagikan sebagai gambar", copyLink: "Salin tautan", linkCopied: "Tautan disalin", pinterest: "Simpan ke Pinterest", savePdf: "Unduh PDF" },
    nl:  {"share": "Delen", "shareImage": "Delen als afbeelding", "copyLink": "Link kopiëren", "linkCopied": "Link gekopieerd", "pinterest": "Bewaren op Pinterest", "savePdf": "PDF downloaden"},
    tr:  { share: "Paylaş", shareImage: "Görsel olarak paylaş", copyLink: "Bağlantıyı kopyala", linkCopied: "Bağlantı kopyalandı", pinterest: "Pinterest'e kaydet", savePdf: "PDF indir" }
  };
  function shareLabels() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return Object.assign({}, SHARE_I18N.en, SHARE_I18N[lang] || {});
  }

  function panelLabels() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return Object.assign({}, PANEL_I18N.en, PANEL_I18N[lang] || {});
  }

  /* The image that represents THIS SHEET: the rendered preview
     scripts/wire-printables-previews.py writes as `.pt-sheet-preview`, never
     the branded OG card. It lives here because all three engines load this
     module and only one of them had the rule.

     printablesEngine.js fixed its own copy on 2026-09-13 -- before that every
     pin fell through to og:image, a 1200x630 LANDSCAPE brand card on the one
     platform that is vertical-first -- and the fix was never ported. Measured
     2026-09-22 by reading the composed pin href in a browser: all six
     monogram/cross-stitch pages (EN + es x2 + fr + id) were still pinning the
     OG card, and all six carry a `.pt-sheet-preview` that was right there. The
     older class names stay as a fallback for a page wired by hand.

     Since 2026-09-23 the <img> is the preview box's no-JavaScript content,
     and every engine empties that box before drawing, so by the time anyone
     clicks Pin the <img> is gone. The URL is read from the box's
     `data-sheet-preview` attribute first, which survives the box being
     emptied, and resolved to an absolute URL as img.src would be. */
  function sheetPreviewUrl() {
    const box = document.querySelector("[data-sheet-preview]");
    const rel = box && box.getAttribute("data-sheet-preview");
    if (rel) {
      try { return new URL(rel, document.baseURI).href; } catch (e) { /* fall through */ }
    }
    const img = document.querySelector("img.pt-sheet-preview")
      || document.querySelector(".pt-sheet-preview img")
      || document.querySelector("img.pt-preview-img")
      || document.querySelector(".pt-preview-figure img");
    if (img && img.src) return img.src;
    const og = document.querySelector('meta[property="og:image"]');
    return og ? og.getAttribute("content") : "";
  }

  /* The settings this visitor is actually on, for the collapsed summary.

     Only deviations from the default are listed, after the paper, which is
     always named: prefs persist in ONE localStorage key across the whole
     pillar, so someone who picks Legal/Landscape on one page carries it to the
     next -- and the summary read the static words "PDF settings" while 14 of
     the 27 EN families named the active paper nowhere on the page at all.
     Verified by seeding those prefs and reading the rendered text: the word
     "Legal" appeared nowhere on banner-maker, monogram-maker, name-puzzle-maker
     or any of the six *-in-cursive pages.

     Every word comes from PANEL_I18N, already translated. The parenthetical is
     dropped from the ink label because the summary is one line at 390px and
     every one of the eight locales writes that gloss in brackets -- trimming a
     bracket is not authoring a string. */
  function stateSummary(L) {
    const labels = L || panelLabels();
    const bits = [labels[values.paper] || labels.letter];
    if (values.orient === "landscape") bits.push(labels.landscape);
    if (values.margin === "narrow") bits.push(labels.narrow);
    if (values.ink === "saver") bits.push(String(labels.inkSaver || "").replace(/\s*\([^)]*\)\s*$/, ""));
    // English-only, exactly like the control: buildPanel() clears a stored
    // "contrast" on every other locale, so this can never be the one English
    // word in a translated summary.
    if (values.ink === "contrast" && contrastLabel()) bits.push(contrastLabel().replace(/\s*\([^)]*\)\s*$/, ""));
    return bits.join(" \u00b7 ");
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
  /* ---------------- recent and saved sheets ---------------- */

  /* "Your recent sheets" and "Saved", the two strips under the share row.
     They lived only in printablesEngine.js, so the two standalone tools
     (monogram-maker, cross-stitch-letters) were the only printables pages where
     a sheet you had just made was not listed and a sheet you had saved on
     another page was not reachable. Moved here -- the one module all three
     engines load -- rather than copied, so there is one reader of the key and
     one markup for the strip. The key and the six-entry cap are unchanged, so
     every list a visitor already has keeps working.

     STRIP_I18N is the same provenance as SHARE_I18N: printablesEngine.js's own
     printOpts.recent / printOpts.clear and T.saved, extracted, not retyped. */
  const RECENT_KEY = "utg_printables_recent";
  const RECENT_MAX = 6;
  const STRIP_I18N = {
    en:  { recent: "Your recent sheets", saved: "Saved", clear: "Clear" },
    fr:  { recent: "Vos fiches récentes", saved: "Enregistré", clear: "Effacer" },
    es:  { recent: "Tus hojas recientes", saved: "Guardado", clear: "Borrar" },
    pt:  { recent: "Suas folhas recentes", saved: "Salvo", clear: "Limpar" },
    it:  { recent: "I tuoi fogli recenti", saved: "Salvato", clear: "Cancella" },
    pl:  { recent: "Twoje ostatnie arkusze", saved: "Zapisano", clear: "Wyczyść" },
    de:  { recent: "Deine letzten Blätter", saved: "Gespeichert", clear: "Löschen" },
    id:  { recent: "Lembar terbaru Anda", saved: "Tersimpan", clear: "Hapus" },
    nl:  {"recent": "Je recente vellen", "saved": "Bewaard", "clear": "Wissen"},
    tr:  { recent: "Son sayfaların", saved: "Kaydedildi", clear: "Temizle" }
  };
  function stripLabels() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return Object.assign({}, STRIP_I18N.en, STRIP_I18N[lang] || {});
  }
  function readRecent() {
    try {
      const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (err) { return []; }
  }
  // entry = { href, label, page, sheet }. The newest first, one row per link.
  function rememberRecent(entry) {
    if (!entry || !entry.href) return;
    const list = readRecent().filter(function (r) { return r && r.href !== entry.href; });
    list.unshift({
      href: entry.href,
      label: String(entry.label || "").slice(0, 40),
      page: String(entry.page || "").slice(0, 60),
      sheet: entry.sheet || "sheet",
      t: Date.now()
    });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch (err) { /* optional */ }
  }
  function stripInto(mount, title, rows, clearText, onClear) {
    mount.innerHTML = "";
    if (!rows.length) { mount.hidden = true; return; }
    mount.hidden = false;
    const t = document.createElement("span");
    t.className = "pt-recent-title";
    t.textContent = title;
    mount.appendChild(t);
    rows.forEach(function (r) {
      const a = document.createElement("a");
      a.className = "pt-recent-link";
      a.href = r.href;
      a.textContent = r.label;
      if (r.title) a.title = r.title;
      mount.appendChild(a);
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "pt-recent-clear";
    clear.textContent = clearText;
    clear.addEventListener("click", onClear);
    mount.appendChild(clear);
  }
  // L = { recent, clear } -- a caller's own strings win; defaults are STRIP_I18N.
  function renderRecentInto(mount, L) {
    if (!mount) return;
    const labels = Object.assign(stripLabels(), L || {});
    const rows = readRecent().map(function (r) { return { href: r.href, label: r.label, title: r.page || "" }; });
    stripInto(mount, labels.recent, rows, labels.clear, function () {
      try { localStorage.removeItem(RECENT_KEY); } catch (err) { /* optional */ }
      renderRecentInto(mount, L);
    });
  }
  // The cross-page saved store (js/saved/saved-items.js); L = { saved, clear }.
  function renderSavedInto(mount, L) {
    if (!mount) return;
    const labels = Object.assign(stripLabels(), L || {});
    const store = UTG.saved;
    const rows = (store ? store.all("printable") : []).map(function (r) {
      return { href: r.href || r.value, label: r.label || r.value };
    });
    stripInto(mount, labels.saved, rows, labels.clear, function () { if (store) store.clear("printable"); });
  }
  /* Both strips in one node, for an engine that has nowhere else to put them.
     Returns { node, refresh }; the saved strip follows every write to the
     store, including one made by another surface on the same page. */
  function buildMemoryStrips(L) {
    const node = document.createElement("div");
    node.className = "pt-memory-strips";
    const saved = document.createElement("div");
    saved.className = "pt-recent pt-saved-strip";
    saved.hidden = true;
    const recent = document.createElement("div");
    recent.className = "pt-recent";
    recent.hidden = true;
    node.appendChild(saved);
    node.appendChild(recent);
    const refresh = function () { renderSavedInto(saved, L); renderRecentInto(recent, L); };
    document.addEventListener("utg:savedchange", function () { renderSavedInto(saved, L); });
    refresh();
    return { node: node, refresh: refresh };
  }

  /* ---------------- the sheet's "More" section ---------------- */

  /* The title field and the name-and-date line every printables sheet offers
     (owner decision 2026-09-25: an option follows the job, not the page).
     Here rather than in printablesEngine.js so the monogram and cross-stitch
     tools, which draw their sheet on one canvas in engines of their own, get
     the same control, the same strings and the same printed line. What each
     engine DRAWS stays its own; the title and the line are added around it.

     NAMEDATE_I18N is printablesEngine.js's own T.nameLabel / T.dateLabel,
     extracted, not retyped. MORE_I18N moved here from that file. */
  const MORE_I18N = {
    en: { summary: "More: sheet title and name and date line", title: "Sheet title", optional: "optional", nameDate: "Add a name and date line", nameHint: "Write {name} to put each child's name in it." },
    de: { summary: "Mehr: Überschrift und eine Name-und-Datum-Zeile", title: "Überschrift", optional: "optional", nameDate: "Name-und-Datum-Zeile hinzufügen", nameHint: "Schreibe {name}, um den Namen jedes Kindes einzusetzen." },
    it: { summary: "Altro: un titolo e una riga nome e data", title: "Titolo", optional: "facoltativo", nameDate: "Aggiungi una riga nome e data", nameHint: "Scrivi {name} per inserire il nome di ogni bambino." },
    pl: { summary: "Więcej: nagłówek oraz linia na imię i datę", title: "Nagłówek", optional: "opcjonalny", nameDate: "Dodaj linię na imię i datę", nameHint: "Wpisz {name}, aby wstawić imię każdego dziecka." },
    fr: { summary: "Plus : titre de la fiche, ligne prénom et date", title: "Titre de la fiche", optional: "facultatif", nameDate: "Ajouter une ligne prénom et date", nameHint: "Tapez {name} pour y insérer le prénom de chaque enfant." },
    es: { summary: "Más: título de la hoja, línea de nombre y fecha", title: "Título de la hoja", optional: "opcional", nameDate: "Añadir una línea de nombre y fecha", nameHint: "Escribe {name} para poner el nombre de cada niño." },
    pt: { summary: "Mais: título da folha e linha de nome e data", title: "Título da folha", optional: "opcional", nameDate: "Incluir linha de nome e data", nameHint: "Escreva {name} para colocar o nome de cada criança." },
    id: { summary: "Lainnya: judul lembar serta baris nama dan tanggal", title: "Judul lembar", optional: "opsional", nameDate: "Tambahkan baris nama dan tanggal", nameHint: "Tulis {name} untuk memasukkan nama tiap anak." },
    nl:  {"summary": "Meer: titel en een regel voor naam en datum", "title": "Titel", "optional": "optioneel", "nameDate": "Regel voor naam en datum toevoegen", "nameHint": "Schrijf {name} om de naam van elk kind in te vullen."},
    tr:  { summary: "Daha fazla: başlık ile ad ve tarih satırı", title: "Başlık", optional: "isteğe bağlı", nameDate: "Ad ve tarih satırı ekle", nameHint: "Her çocuğun adını yerleştirmek için {name} yaz." }
  };
  const NAMEDATE_I18N = {
    en: { name: "Name:", date: "Date:" },
    fr: { name: "Prénom :", date: "Date :" },
    es: { name: "Nombre:", date: "Fecha:" },
    pt: { name: "Nome:", date: "Data:" },
    it: { name: "Nome:", date: "Data:" },
    pl: { name: "Imię:", date: "Data:" },
    de: { name: "Name:", date: "Datum:" },
    id: { name: "Nama:", date: "Tanggal:" },
    nl:  {"name": "Naam:", "date": "Datum:"},
    tr:  { name: "Ad:", date: "Tarih:" }
  };
  function langKey() {
    return (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
  }
  // null where the page's language has no row: the caller does not mount the
  // section rather than show English labels on a translated page.
  function moreLabels() {
    const own = MORE_I18N[langKey()];
    return own ? Object.assign({}, MORE_I18N.en, own) : null;
  }
  function nameDateLabels() {
    return Object.assign({}, NAMEDATE_I18N.en, NAMEDATE_I18N[langKey()] || {});
  }
  function moreDetails(L) {
    const d = document.createElement("details");
    d.className = "pt-more-field pt-sheet-more";
    const sum = document.createElement("summary");
    sum.textContent = L.summary;
    d.appendChild(sum);
    return d;
  }
  function moreTitleField(L, scope, placeholder, withHint) {
    const f = document.createElement("div");
    f.className = "pt-field";
    const id = "pt-" + scope + "-title";
    const lab = document.createElement("label");
    lab.className = "pt-field-label";
    lab.setAttribute("for", id);
    lab.appendChild(document.createTextNode(L.title + " "));
    const opt = document.createElement("span");
    opt.className = "pt-field-opt";
    opt.textContent = L.optional;
    lab.appendChild(opt);
    f.appendChild(lab);
    const input = document.createElement("input");
    input.type = "text";
    input.className = "main-input";
    input.id = id;
    input.maxLength = 60;
    input.autocomplete = "off";
    if (placeholder) input.placeholder = placeholder;
    f.appendChild(input);
    if (withHint) {
      const hint = document.createElement("p");
      hint.className = "pt-field-hint";
      hint.textContent = L.nameHint;
      f.appendChild(hint);
    }
    return { field: f, input: input };
  }
  function moreCheckField(L, scope, checked) {
    const f = document.createElement("div");
    f.className = "pt-field";
    const lab = document.createElement("label");
    lab.className = "pt-check";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.id = "pt-" + scope + "-namedate";
    box.checked = !!checked;
    lab.appendChild(box);
    lab.appendChild(document.createTextNode(" " + L.nameDate));
    f.appendChild(lab);
    return { field: f, input: box };
  }
  // The whole section. o = { placeholder, checked, withHint }.
  function moreSection(scope, o) {
    const L = moreLabels();
    if (!L) return null;
    const opts = o || {};
    const d = moreDetails(L);
    const t = moreTitleField(L, scope, opts.placeholder || "", !!opts.withHint);
    const c = moreCheckField(L, scope, !!opts.checked);
    d.appendChild(t.field);
    d.appendChild(c.field);
    return { node: d, title: t.input, check: c.input };
  }
  // The printed line, as DOM. Same markup as the sheets' own footer row.
  function nameDateRow() {
    const L = nameDateLabels();
    const row = document.createElement("div");
    row.className = "pt-sheet-footer";
    [L.name, L.date].forEach(function (label) {
      const f = document.createElement("span");
      f.className = "pt-sheet-footer-field";
      const l = document.createElement("span");
      l.className = "pt-sheet-footer-label";
      l.textContent = label;
      f.appendChild(l);
      const rule = document.createElement("span");
      rule.className = "pt-sheet-footer-rule";
      f.appendChild(rule);
      row.appendChild(f);
    });
    return row;
  }
  /* The title and the line added AROUND a finished drawing, for the engines
     that export one canvas. The art is copied untouched; above it go an
     optional title band and an optional name-and-date band, both sized from
     the art's own width, so they print at the same physical size however
     many pixels the drawing has. Returns the art itself when neither is
     asked for, so a sheet nobody changed is byte-for-byte what it was. */
  function frameCanvas(art, o) {
    const opts = o || {};
    const title = String(opts.title || "").trim();
    const withLine = !!opts.nameDate;
    if (!art || (!title && !withLine)) return art;
    const W = art.width;
    const titlePx = Math.round(W * 0.042);
    const titleBand = title ? Math.round(titlePx * 2.4) : 0;
    const linePx = Math.round(W * 0.022);
    const lineBand = withLine ? Math.round(linePx * 3.4) : 0;
    const out = document.createElement("canvas");
    out.width = W;
    out.height = titleBand + lineBand + art.height;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = "#1a1a2e";
    ctx.textBaseline = "middle";
    if (title) {
      ctx.font = "700 " + titlePx + "px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.textAlign = "center";
      let text = title;
      while (ctx.measureText(text).width > W * 0.92 && text.length > 1) text = text.slice(0, -1);
      ctx.fillText(text, W / 2, titleBand * 0.55);
    }
    if (withLine) {
      const L = nameDateLabels();
      const y = titleBand + lineBand * 0.55;
      const pad = W * 0.06;
      const half = (W - pad * 2) / 2;
      ctx.font = "700 " + linePx + "px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = Math.max(2, Math.round(W / 800));
      [[L.name, pad], [L.date, pad + half + W * 0.02]].forEach(function (f) {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillText(f[0], f[1], y);
        const x0 = f[1] + ctx.measureText(f[0]).width + linePx * 0.5;
        const x1 = f[1] + half - W * 0.03;
        ctx.beginPath();
        ctx.moveTo(x0, y + linePx * 0.6);
        ctx.lineTo(x1, y + linePx * 0.6);
        ctx.stroke();
      });
    }
    ctx.drawImage(art, 0, titleBand + lineBand);
    return out;
  }

  UTG.printPrefs = {
    values: values,
    PAPERS: PAPERS,
    PAPER_FULL: PAPER_FULL,
    MARGINS: MARGINS,
    SCALES: SCALES,
    defaultPaper: defaultPaper,
    shareLabels: shareLabels,
    sheetPreviewUrl: sheetPreviewUrl,
    stateSummary: stateSummary,
    readRecent: readRecent,
    rememberRecent: rememberRecent,
    renderRecentInto: renderRecentInto,
    renderSavedInto: renderSavedInto,
    buildMemoryStrips: buildMemoryStrips,
    stripLabels: stripLabels,
    moreLabels: moreLabels,
    moreDetails: moreDetails,
    moreTitleField: moreTitleField,
    moreCheckField: moreCheckField,
    moreSection: moreSection,
    nameDateRow: nameDateRow,
    frameCanvas: frameCanvas,
    paperFull: paperFull,
    marginIn: marginIn,
    scale: scale,
    hasStored: function () { return stored; },
    /* The chosen paper's own name, in this page's language. The printables
       preview meta printed a hardcoded "US Letter" on every page in every
       locale, which stopped being true the moment paper became a control --
       the same "a control with no visible consequence" defect from the other
       end, where the display asserts a setting nobody chose. */
    paperLabel: function () {
      const L = panelLabels();
      return L[values.paper] || L.letter || "US Letter";
    },
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
      const details = document.createElement("details");
      details.className = "pt-print-options";
      const summary = document.createElement("summary");
      summary.textContent = L.settings || "Print settings";
      /* A separate node so the state can be restyled and, more importantly, so
         repainting it cannot overwrite the label. */
      const state = document.createElement("span");
      state.className = "pt-print-state";
      summary.appendChild(state);
      const paintSummary = () => { state.textContent = " \u00b7 " + stateSummary(L); };
      paintSummary();
      const changed = () => { save(); paintSummary(); if (opt.onChange) opt.onChange(); };
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
      if (wants("ink")) {
        const saverRow = checkRow(L.inkSaver || "Ink saver (lighter lines)",
          values.ink === "saver",
          (on) => {
            values.ink = on ? "saver" : "normal";
            const other = details.querySelector(".pt-print-contrast input");
            if (on && other) other.checked = false;
            changed();
          }, "pt-print-ink");
        details.appendChild(saverRow);
        /* PR-13 -- the photocopy case is the OPPOSITE of the ink saver, and it
           had no control at all: `ink` was a two-value enum where both values
           are "normal or lighter". A classroom copier drops the faint dotted
           guides these sheets are built from, so the sheet that reaches thirty
           children is the one this setting renders.

           ENGLISH ONLY, and not for want of trying. Unlike "300 DPI" above
           there is no numeral or international unit that says this, and unlike
           every other label on this panel there is no already-shipped string
           to reuse: neither printablesEngine's I18N table nor locales/*.json
           carries a word for contrast or for photocopying in any of the eight.
           Eight invented strings is not something this repo does, so the seven
           other locales keep the panel they have until a native reading or
           corpus evidence exists. Per the owner's decision of 2026-09-17. */
        if (contrastLabel()) {
          details.appendChild(checkRow(contrastLabel(),
            values.ink === "contrast",
            (on) => {
              values.ink = on ? "contrast" : "normal";
              const other = details.querySelector(".pt-print-ink input");
              if (on && other) other.checked = false;
              changed();
            }, "pt-print-contrast"));
        }
      }
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
