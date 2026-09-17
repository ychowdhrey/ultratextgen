/*
 * printablesEngine.js — shared, config-driven controller for /printables/ pages.
 *
 * One engine powers every printables page (bubble-letters, cursive-alphabet,
 * block-letters, name-tracing). A page declares window.UTG_PRINTABLE = {...}
 * and includes whichever mount points it wants; the engine builds only the
 * sections whose mounts exist on the page. This generalizes the two original
 * per-page controllers (js/bubble/bubbleExplorer.js and
 * js/cursive/cursivePageController.js) into reusable primitives:
 *   - a letter / number picker strip
 *   - a selected-character detail panel (big glyph + print + PNG + variants)
 *   - a printable alphabet grid (print the whole A–Z / 0–9 sheet)
 *   - a ruled practice sheet (model + trace rows)
 *   - a personalized name / word tracing worksheet
 *
 * Three render modes:
 *   - "outline": white-fill + rounded dark-stroke shapes (bubble, block) —
 *     traceable / colorable. Needs no font registry.
 *   - "glyph":   Unicode style glyphs from the registry (cursive) via
 *     window.UltraTextGenRender. Copy-paste variants are available in this mode.
 *   - "dots":    a single character as a numbered dot-to-dot (dot-to-dot-alphabet),
 *     via singleDotSVG()/addDotWordSVG() — the same tracer the coloring-page-maker
 *     designer's dot-to-dot mode uses, locked to CFG.dotDifficulty/CFG.dotHint
 *     instead of exposing a live picker (see the "Single-character dot-to-dot"
 *     comment near singleDotSVG for why the difficulty picker is skipped).
 *
 * Self-contained IIFE. Document-level .copy-btn / .glyph-copy clipboard
 * delegation from the shared script.js is reused via the data-text contract;
 * copy inside the panel uses a local fallback so the engine works standalone.
 *
 * Mount points (all optional except the print surface, which is required for
 * any print action):
 *   #pt-strip            character picker
 *   #pt-panel            selected-character detail
 *   #pt-alphabet-grid    printable alphabet grid
 *   #pt-alphabet-print   button: print the full alphabet (works with or without
 *                        the grid; CFG.alphabetPrint: "book" prints one character
 *                        per page instead of the compact sheet — see
 *                        printAlphabetBook. Sheet-mode pages get an auto-added
 *                        secondary book button beside it)
 *   #pt-book-print       optional extra button (e.g. on a promo card) that
 *                        prints the one-page-per-character alphabet book
 *   #pt-practice-print   button: print ruled practice sheet
 *   #pt-name-input       name / word field  (+ #pt-name-print, #pt-name-png,
 *                        #pt-name-preview, #pt-name-rows)
 *   #pt-banner-input     phrase field for the banner maker (+ #pt-banner-print,
 *                        #pt-banner-png, #pt-banner-preview, #pt-banner-meta)
 *   #pt-stroke-toggle    checkbox: overlay a numbered start-dot + direction
 *                        arrows on traceable letters (off by default). Reads
 *                        window.UTG_STROKE_DIRECTION_DATA (js/printables/
 *                        strokeDirectionData.js) — a page must load that
 *                        script for the toggle to draw anything.
 *   #pt-print-root       hidden print surface (REQUIRED to print)
 */
(function () {
  "use strict";

  const CFG = window.UTG_PRINTABLE;
  if (!CFG) return;

  /* ---------------------------------------------------------------
     Localization. All engine-injected UI text flows through T, keyed
     off the page's language (html lang="…", or an explicit CFG.lang).
     English is the default and its values are the original strings, so
     existing English pages render byte-for-byte the same. New locales
     add a block here and only need to set <html lang> + a translated
     UTG_PRINTABLE config (noun, howto, headings) on the page itself.
     --------------------------------------------------------------- */
  const LANG = String(CFG.lang || document.documentElement.getAttribute("lang") || "en")
    .slice(0, 2).toLowerCase();
  const I18N = {
    en: {
      letterWord: "letter", numberWord: "number",
      copied: "Copied!",
      downloadPng: "Download PNG",
      copyPaste: "Copy-paste", copy: "Copy", howToDraw: "How to draw it", lowerSuffix: " · lower",
      level: "Level", nameLabel: "Name:", dateLabel: "Date:", space: "space",
      dotToDot: "dot to dot", bannerFlag: "Banner flag:",
      dotsCount: "dots", dotNumbers: "Numbered dots",
      dotLadderTitle: "Practice ladder",
      dotLadderText: "Start easy and add dots as it gets comfortable. Mastered Expert? Turn the numbers off, then try drawing it freehand.",
      pdfHint: "Tip: Print → “Save as PDF” downloads this sheet as a PDF.",
      printOpts: { settings: "PDF settings", paper: "Paper", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Orientation", portrait: "Portrait", landscape: "Landscape", margins: "Margins", normal: "Normal", narrow: "Narrow", inkSaver: "Ink saver (lighter lines)", savePdf: "Save as PDF", pdfToast: "In the print dialog, choose Save as PDF as the destination.", share: "Share", shareImage: "Share as image", copyLink: "Copy link", linkCopied: "Link copied", pinterest: "Pin on Pinterest", recent: "Your recent sheets", clear: "Clear", madeAt: "Made at" },
      printBook: "Save as a book: one page per letter",
      save: "Save",
      saved: "Saved",
      nameStyleLabel: "Style", nameFillLabel: "Fill", nameStrokeLabel: "Outline",
      nameSolidLabel: "Colour it in now (solid fill)",
      pngTransparent: "PNG (transparent)",
      classSet: "Class set: one sheet per name", sheets: "sheets",
      classSetPngHint: "PNG downloads the current name; use Save as PDF for the whole set.",
      bannerInstr: "Cut each flag along its dashed line, punch a hole at each dot, then thread string or ribbon through in order (1, 2, 3…) to spell it out.",
      puzzleCut: "Cut along the dashed lines to separate each letter piece.",
      usLetter: "US Letter",
      bannerFlagsLabel: "banner flags", ofWord: "of",
      flagCount: { one: "flag", other: "flags" },
      pageCount: { one: "page", other: "pages" },
      alphabetWord: "alphabet",
      caseUpper: "Uppercase", caseLower: "Lowercase",
      modelCount: { one: "model", other: "model" },
      traceCount: { one: "trace", other: "trace" },
      blankCount: { one: "blank", other: "blank" },
      trace: {
        solid:    { label: "Solid model", hint: "Full dark letters: trace right on top" },
        "bold-dot": { label: "Bold dotted", hint: "Thick, closely-spaced dots to join" },
        "fine-dot": { label: "Fine dotted", hint: "Thinner dots with a little more space" },
        dashed:   { label: "Dashed", hint: "Broken dashes: more line to complete" },
        faded:    { label: "Faded ghost", hint: "Light gray letters to write over" },
        faint:    { label: "Faint guide", hint: "Barely-there outline: almost solo" },
        blank:    { label: "Blank line", hint: "No guide: write it from memory" }
      },
      dot: {
        easy:   { label: "Easy", hint: "Big gaps, few dots: the youngest kids" },
        medium: { label: "Medium", hint: "A balanced connect-the-dots" },
        hard:   { label: "Hard", hint: "More dots and finer letter detail" },
        expert: { label: "Expert", hint: "Lots of dots: a real challenge" }
      },
      size: {
        label: "Print size",
        full:   { label: "Full page", hint: "One big letter per sheet: today's default" },
        medium: { label: "Medium (~4 in)", hint: "Several letters per sheet: good for posters" },
        small:  { label: "Small (~2 in)", hint: "Many letters per sheet: great for bulletin boards" }
      }
    },
    fr: {
      letterWord: "lettre", numberWord: "chiffre",
      copied: "Copié !",
      downloadPng: "Télécharger le PNG",
      copyPaste: "Copier-coller", copy: "Copier", howToDraw: "Comment la dessiner", lowerSuffix: " · min.",
      level: "Niveau", nameLabel: "Prénom :", dateLabel: "Date :", space: "espace",
      dotToDot: "point à point", bannerFlag: "Fanion —",
      dotsCount: "points", dotNumbers: "Points numérotés",
      dotLadderTitle: "Échelle de difficulté",
      dotLadderText: "Commencez facile, puis ajoutez des points. Niveau Expert maîtrisé ? Retirez les numéros, puis essayez de dessiner à main levée.",
      pdfHint: "Astuce : Imprimer → « Enregistrer au format PDF » télécharge la feuille en PDF.",
      printOpts: { settings: "Réglages du PDF", paper: "Papier", letter: "Lettre US", a4: "A4", legal: "Legal", orientation: "Orientation", portrait: "Portrait", landscape: "Paysage", margins: "Marges", normal: "Normales", narrow: "Étroites", inkSaver: "Économie d'encre (traits plus clairs)", savePdf: "Enregistrer en PDF", pdfToast: "Dans la boîte d'impression, choisissez Enregistrer au format PDF comme destination.", share: "Partager", shareImage: "Partager en image", copyLink: "Copier le lien", linkCopied: "Lien copié", pinterest: "Épingler sur Pinterest", recent: "Vos fiches récentes", clear: "Effacer", madeAt: "Créé sur" },
      printBook: "Enregistrer en livret — une page par lettre",
      pageCount: { one: "page", other: "pages" },
      ofWord: "sur",
      alphabetWord: "alphabet",
      caseUpper: "Majuscules", caseLower: "Minuscules",
      save: "Enregistrer",
      saved: "Enregistré",
      nameStyleLabel: "Style", nameFillLabel: "Remplissage", nameStrokeLabel: "Contour",
      nameSolidLabel: "Colorier maintenant (remplissage plein)",
      pngTransparent: "PNG (transparent)",
      classSet: "Série pour la classe — une feuille par prénom", sheets: "feuilles",
      classSetPngHint: "Le PNG télécharge le prénom affiché ; utilisez Enregistrer en PDF pour toute la série.",
      bannerInstr: "Découpez chaque fanion le long de sa ligne pointillée, percez un trou à chaque point, puis passez une ficelle ou un ruban dans l'ordre (1, 2, 3…) pour former le mot.",
      puzzleCut: "Découpez le long des lignes pointillées pour séparer chaque pièce-lettre.",
      trace: {
        solid:    { label: "Modèle plein", hint: "Lettres pleines et foncées — tracez par-dessus" },
        "bold-dot": { label: "Pointillé épais", hint: "Points épais et rapprochés à relier" },
        "fine-dot": { label: "Pointillé fin", hint: "Points plus fins, un peu plus espacés" },
        dashed:   { label: "Tirets", hint: "Tirets espacés — plus de trait à compléter" },
        faded:    { label: "Fantôme pâle", hint: "Lettres gris clair à repasser" },
        faint:    { label: "Guide léger", hint: "Contour à peine visible — presque en autonomie" },
        blank:    { label: "Ligne vierge", hint: "Aucun guide — à écrire de mémoire" }
      },
      dot: {
        easy:   { label: "Facile", hint: "Grands écarts, peu de points — les plus jeunes" },
        medium: { label: "Moyen", hint: "Un point à point équilibré" },
        hard:   { label: "Difficile", hint: "Plus de points et de détails dans la lettre" },
        expert: { label: "Expert", hint: "Beaucoup de points — un vrai défi" }
      },
      size: {
        label: "Taille d'impression",
        full:   { label: "Pleine page", hint: "Une grande lettre par feuille — le réglage par défaut" },
        medium: { label: "Moyenne (~10 cm)", hint: "Plusieurs lettres par feuille — pratique pour des affiches" },
        small:  { label: "Petite (~5 cm)", hint: "Beaucoup de lettres par feuille — idéal pour un panneau d'affichage" }
      }
    },
    es: {
      letterWord: "letra", numberWord: "número",
      copied: "¡Copiado!",
      downloadPng: "Descargar PNG",
      copyPaste: "Copiar y pegar", copy: "Copiar", howToDraw: "Cómo dibujarla", lowerSuffix: " · min.",
      level: "Nivel", nameLabel: "Nombre:", dateLabel: "Fecha:", space: "espacio",
      dotToDot: "unir los puntos", bannerFlag: "Banderín —",
      dotsCount: "puntos", dotNumbers: "Puntos numerados",
      dotLadderTitle: "Escalera de dificultad",
      dotLadderText: "Empieza en fácil y añade puntos poco a poco. ¿Dominas el nivel experto? Quita los números y prueba a dibujar a mano alzada.",
      pdfHint: "Consejo: Imprimir → «Guardar como PDF» descarga la hoja en PDF.",
      printOpts: { settings: "Ajustes del PDF", paper: "Papel", letter: "Carta", a4: "A4", legal: "Oficio", orientation: "Orientación", portrait: "Vertical", landscape: "Horizontal", margins: "Márgenes", normal: "Normales", narrow: "Estrechos", inkSaver: "Ahorro de tinta (líneas más claras)", savePdf: "Guardar como PDF", pdfToast: "En el cuadro de impresión, elige Guardar como PDF como destino.", share: "Compartir", shareImage: "Compartir como imagen", copyLink: "Copiar enlace", linkCopied: "Enlace copiado", pinterest: "Guardar en Pinterest", recent: "Tus hojas recientes", clear: "Borrar", madeAt: "Hecho en" },
      printBook: "Guardar como libro — una página por letra",
      pageCount: { one: "página", other: "páginas" },
      ofWord: "de",
      alphabetWord: "alfabeto",
      caseUpper: "Mayúsculas", caseLower: "Minúsculas",
      save: "Guardar",
      saved: "Guardado",
      nameStyleLabel: "Estilo", nameFillLabel: "Relleno", nameStrokeLabel: "Contorno",
      nameSolidLabel: "Colorear ahora (relleno sólido)",
      pngTransparent: "PNG (transparente)",
      classSet: "Juego para la clase — una hoja por nombre", sheets: "hojas",
      classSetPngHint: "El PNG descarga el nombre actual; usa Guardar como PDF para el juego completo.",
      bannerInstr: "Recorta cada banderín por su línea punteada, haz un agujero en cada punto y pasa un cordel o cinta en orden (1, 2, 3…) para formar la palabra.",
      puzzleCut: "Recorta por las líneas punteadas para separar cada pieza-letra.",
      trace: {
        solid:    { label: "Modelo sólido", hint: "Letras oscuras y llenas — traza justo encima" },
        "bold-dot": { label: "Punteado grueso", hint: "Puntos gruesos y juntos para unir" },
        "fine-dot": { label: "Punteado fino", hint: "Puntos más finos con un poco más de espacio" },
        dashed:   { label: "Discontinuo", hint: "Guiones discontinuos — más línea que completar" },
        faded:    { label: "Fantasma tenue", hint: "Letras gris claro para repasar" },
        faint:    { label: "Guía tenue", hint: "Contorno apenas visible — casi solo" },
        blank:    { label: "Línea en blanco", hint: "Sin guía — escríbela de memoria" }
      },
      dot: {
        easy:   { label: "Fácil", hint: "Huecos grandes, pocos puntos — los más pequeños" },
        medium: { label: "Medio", hint: "Un unir-los-puntos equilibrado" },
        hard:   { label: "Difícil", hint: "Más puntos y más detalle en la letra" },
        expert: { label: "Experto", hint: "Muchos puntos — todo un reto" }
      },
      size: {
        label: "Tamaño de impresión",
        full:   { label: "Página completa", hint: "Una letra grande por hoja — la opción por defecto" },
        medium: { label: "Mediano (~10 cm)", hint: "Varias letras por hoja — ideal para pósteres" },
        small:  { label: "Pequeño (~5 cm)", hint: "Muchas letras por hoja — ideal para un mural" }
      }
    },
    pt: {
      letterWord: "letra", numberWord: "número",
      copied: "Copiado!",
      downloadPng: "Baixar PNG",
      copyPaste: "Copiar e colar", copy: "Copiar", howToDraw: "Como desenhar", lowerSuffix: " · min.",
      level: "Nível", nameLabel: "Nome:", dateLabel: "Data:", space: "espaço",
      dotToDot: "ligar os pontos", bannerFlag: "Bandeirinha —",
      dotsCount: "pontos", dotNumbers: "Pontos numerados",
      dotLadderTitle: "Escada de dificuldade",
      dotLadderText: "Comece no fácil e adicione pontos aos poucos. Dominou o nível especialista? Desligue os números e tente desenhar à mão livre.",
      pdfHint: "Dica: Imprimir → “Salvar como PDF” baixa a folha em PDF.",
      printOpts: { settings: "Configurações do PDF", paper: "Papel", letter: "Carta", a4: "A4", legal: "Ofício", orientation: "Orientação", portrait: "Retrato", landscape: "Paisagem", margins: "Margens", normal: "Normais", narrow: "Estreitas", inkSaver: "Economia de tinta (linhas mais claras)", savePdf: "Salvar como PDF", pdfToast: "Na caixa de impressão, escolha Salvar como PDF como destino.", share: "Compartilhar", shareImage: "Compartilhar como imagem", copyLink: "Copiar link", linkCopied: "Link copiado", pinterest: "Salvar no Pinterest", recent: "Suas folhas recentes", clear: "Limpar", madeAt: "Feito em" },
      printBook: "Salvar como livro — uma página por letra",
      pageCount: { one: "página", other: "páginas" },
      ofWord: "de",
      alphabetWord: "alfabeto",
      caseUpper: "Maiúsculas", caseLower: "Minúsculas",
      save: "Salvar",
      saved: "Salvo",
      nameStyleLabel: "Estilo", nameFillLabel: "Preenchimento", nameStrokeLabel: "Contorno",
      nameSolidLabel: "Colorir agora (preenchimento sólido)",
      pngTransparent: "PNG (transparente)",
      classSet: "Conjunto para a turma — uma folha por nome", sheets: "folhas",
      classSetPngHint: "O PNG baixa o nome atual; use Salvar como PDF para o conjunto completo.",
      bannerInstr: "Recorte cada bandeirinha na linha pontilhada, faça um furo em cada ponto e passe um barbante ou fita na ordem (1, 2, 3…) para formar a palavra.",
      puzzleCut: "Recorte nas linhas pontilhadas para separar cada peça-letra.",
      trace: {
        solid:    { label: "Modelo cheio", hint: "Letras escuras e cheias — trace por cima" },
        "bold-dot": { label: "Pontilhado grosso", hint: "Pontos grossos e juntos para ligar" },
        "fine-dot": { label: "Pontilhado fino", hint: "Pontos mais finos, um pouco mais espaçados" },
        dashed:   { label: "Tracejado", hint: "Traços interrompidos — mais linha para completar" },
        faded:    { label: "Fantasma claro", hint: "Letras cinza-claro para cobrir" },
        faint:    { label: "Guia leve", hint: "Contorno quase invisível — quase sozinho" },
        blank:    { label: "Linha em branco", hint: "Sem guia — escreva de memória" }
      },
      dot: {
        easy:   { label: "Fácil", hint: "Espaços grandes, poucos pontos — os menores" },
        medium: { label: "Médio", hint: "Um ligar-os-pontos equilibrado" },
        hard:   { label: "Difícil", hint: "Mais pontos e mais detalhe na letra" },
        expert: { label: "Expert", hint: "Muitos pontos — um baita desafio" }
      },
      size: {
        label: "Tamanho de impressão",
        full:   { label: "Página inteira", hint: "Uma letra grande por folha — o padrão de hoje" },
        medium: { label: "Médio (~10 cm)", hint: "Várias letras por folha — bom para cartazes" },
        small:  { label: "Pequeno (~5 cm)", hint: "Muitas letras por folha — ótimo para mural" }
      }
    },
    it: {
      letterWord: "lettera", numberWord: "numero",
      copied: "Copiato!",
      downloadPng: "Scarica PNG",
      copyPaste: "Copia e incolla", copy: "Copia", howToDraw: "Come disegnarla", lowerSuffix: " · min.",
      level: "Livello", nameLabel: "Nome:", dateLabel: "Data:", space: "spazio",
      dotToDot: "unisci i puntini", bannerFlag: "Bandierina – ",
      dotsCount: "punti", dotNumbers: "Punti numerati",
      dotLadderTitle: "Scala di difficoltà",
      dotLadderText: "Inizia dal facile e aggiungi punti man mano. Livello esperto superato? Togli i numeri e prova a disegnare a mano libera.",
      pdfHint: "Suggerimento: Stampa → “Salva come PDF” scarica il foglio in PDF.",
      printOpts: { settings: "Impostazioni PDF", paper: "Carta", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientamento", portrait: "Verticale", landscape: "Orizzontale", margins: "Margini", normal: "Normali", narrow: "Stretti", inkSaver: "Risparmio inchiostro (linee più chiare)", savePdf: "Salva come PDF", pdfToast: "Nella finestra di stampa scegli Salva come PDF come destinazione.", share: "Condividi", shareImage: "Condividi come immagine", copyLink: "Copia link", linkCopied: "Link copiato", pinterest: "Salva su Pinterest", recent: "I tuoi fogli recenti", clear: "Cancella", madeAt: "Creato su" },
      printBook: "Salva come libretto – una pagina per lettera",
      pageCount: { one: "pagina", other: "pagine" },
      ofWord: "di",
      alphabetWord: "alfabeto",
      caseUpper: "Maiuscole", caseLower: "Minuscole",
      save: "Salva",
      saved: "Salvato",
      nameStyleLabel: "Stile", nameFillLabel: "Riempimento", nameStrokeLabel: "Contorno",
      nameSolidLabel: "Colora adesso (riempimento pieno)",
      pngTransparent: "PNG (trasparente)",
      classSet: "Set per la classe – un foglio per nome", sheets: "fogli",
      classSetPngHint: "Il PNG scarica il nome corrente; usa Salva come PDF per l'intero set.",
      bannerInstr: "Ritaglia ogni bandierina lungo la linea tratteggiata, fai un foro su ogni punto, poi infila uno spago o un nastro in ordine (1, 2, 3…) per comporre la parola.",
      puzzleCut: "Ritaglia lungo le linee tratteggiate per separare ogni pezzo-lettera.",
      trace: {
        solid:    { label: "Modello pieno", hint: "Lettere piene e scure – ricalca sopra" },
        "bold-dot": { label: "Puntinato spesso", hint: "Punti spessi e ravvicinati da unire" },
        "fine-dot": { label: "Puntinato fine", hint: "Punti più sottili e un po' più distanziati" },
        dashed:   { label: "Tratteggiato", hint: "Trattini spezzati – più linea da completare" },
        faded:    { label: "Fantasma chiaro", hint: "Lettere grigio chiaro da ripassare" },
        faint:    { label: "Guida leggera", hint: "Contorno appena visibile – quasi da solo" },
        blank:    { label: "Riga vuota", hint: "Nessuna guida – scrivila a memoria" }
      },
      dot: {
        easy:   { label: "Facile", hint: "Spazi ampi, pochi punti – i più piccoli" },
        medium: { label: "Medio", hint: "Un unisci-i-puntini equilibrato" },
        hard:   { label: "Difficile", hint: "Più punti e più dettaglio nella lettera" },
        expert: { label: "Esperto", hint: "Tanti punti – una vera sfida" }
      },
      size: {
        label: "Formato di stampa",
        full:   { label: "Pagina intera", hint: "Una grande lettera per foglio – l'opzione predefinita" },
        medium: { label: "Medio (~10 cm)", hint: "Diverse lettere per foglio – comodo per i poster" },
        small:  { label: "Piccolo (~5 cm)", hint: "Tante lettere per foglio – ideale per una bacheca" }
      }
    },
    pl: {
      letterWord: "litera", numberWord: "cyfra",
      copied: "Skopiowano!",
      downloadPng: "Pobierz PNG",
      copyPaste: "Kopiuj i wklej", copy: "Kopiuj", howToDraw: "Jak ją narysować", lowerSuffix: " · mała",
      level: "Poziom", nameLabel: "Imię:", dateLabel: "Data:", space: "spacja",
      dotToDot: "połącz kropki", bannerFlag: "Chorągiewka —",
      dotsCount: "kropek", dotNumbers: "Ponumerowane kropki",
      dotLadderTitle: "Drabinka trudności",
      dotLadderText: "Zacznij od łatwego poziomu i stopniowo dodawaj kropki. Opanowane? Wyłącz numery i spróbuj narysować odręcznie.",
      pdfHint: "Wskazówka: Drukuj → „Zapisz jako PDF”, aby pobrać arkusz w PDF.",
      printOpts: { settings: "Ustawienia PDF", paper: "Papier", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientacja", portrait: "Pionowa", landscape: "Pozioma", margins: "Marginesy", normal: "Normalne", narrow: "Wąskie", inkSaver: "Oszczędzanie tuszu (jaśniejsze linie)", savePdf: "Zapisz jako PDF", pdfToast: "W oknie drukowania wybierz Zapisz jako PDF jako miejsce docelowe.", share: "Udostępnij", shareImage: "Udostępnij jako obraz", copyLink: "Kopiuj link", linkCopied: "Link skopiowany", pinterest: "Zapisz na Pintereście", recent: "Twoje ostatnie arkusze", clear: "Wyczyść", madeAt: "Utworzono na" },
      printBook: "Zapisz jako książeczkę — jedna strona na literę",
      save: "Zapisz",
      saved: "Zapisano",
      nameStyleLabel: "Styl", nameFillLabel: "Wypełnienie", nameStrokeLabel: "Kontur",
      nameSolidLabel: "Pokoloruj od razu (pełne wypełnienie)",
      pngTransparent: "PNG (przezroczyste tło)",
      classSet: "Zestaw dla klasy — jedna karta na imię", sheets: "kart",
      classSetPngHint: "PNG pobiera bieżące imię; użyj Zapisz jako PDF dla całego zestawu.",
      bannerInstr: "Wytnij każdą chorągiewkę wzdłuż przerywanej linii, zrób dziurkę w każdym punkcie, a następnie przewlecz sznurek lub wstążkę po kolei (1, 2, 3…), aby ułożyć napis.",
      puzzleCut: "Tnij wzdłuż przerywanych linii, aby oddzielić każdy element-literę.",
      usLetter: "US Letter",
      bannerFlagsLabel: "chorągiewki", ofWord: "z",
      flagCount: { one: "chorągiewka", few: "chorągiewki", many: "chorągiewek" },
      pageCount: { one: "strona", few: "strony", many: "stron" },
      alphabetWord: "alfabet",
      caseUpper: "Wielkie litery", caseLower: "Małe litery",
      trace: {
        solid:    { label: "Pełny wzór", hint: "Ciemne, pełne litery — pisz po śladzie" },
        "bold-dot": { label: "Grube kropki", hint: "Grube, gęsto rozmieszczone kropki do połączenia" },
        "fine-dot": { label: "Drobne kropki", hint: "Cieńsze kropki z nieco większym odstępem" },
        dashed:   { label: "Kreski", hint: "Przerywane kreski — więcej linii do uzupełnienia" },
        faded:    { label: "Blady cień", hint: "Jasnoszare litery do pisania po śladzie" },
        faint:    { label: "Lekki wzór", hint: "Ledwo widoczny kontur — prawie samodzielnie" },
        blank:    { label: "Pusta linia", hint: "Bez wzoru — napisz z pamięci" }
      },
      dot: {
        easy:   { label: "Łatwy", hint: "Duże odstępy, mało kropek — dla najmłodszych" },
        medium: { label: "Średni", hint: "Zrównoważone łączenie kropek" },
        hard:   { label: "Trudny", hint: "Więcej kropek i drobniejsze szczegóły litery" },
        expert: { label: "Ekspert", hint: "Mnóstwo kropek — prawdziwe wyzwanie" }
      },
      size: {
        label: "Rozmiar wydruku",
        full:   { label: "Cała strona", hint: "Jedna duża litera na kartkę — dzisiejsze ustawienie domyślne" },
        medium: { label: "Średni (~10 cm)", hint: "Kilka liter na kartkę — dobre na plakaty" },
        small:  { label: "Mały (~5 cm)", hint: "Wiele liter na kartkę — świetne na tablicę ogłoszeń" }
      }
    },
    de: {
      letterWord: "Buchstabe", numberWord: "Zahl",
      copied: "Kopiert!",
      downloadPng: "PNG herunterladen",
      copyPaste: "Kopieren", copy: "Kopieren", howToDraw: "So wird er gezeichnet", lowerSuffix: " · klein",
      level: "Stufe", nameLabel: "Name:", dateLabel: "Datum:", space: "Leerzeichen",
      dotToDot: "Punkte verbinden", bannerFlag: "Wimpel – ",
      dotsCount: "Punkte", dotNumbers: "Nummerierte Punkte",
      dotLadderTitle: "Schwierigkeitsleiter",
      dotLadderText: "Leicht anfangen, dann Punkte dazunehmen. Experte geschafft? Zahlen ausblenden und frei zeichnen.",
      pdfHint: "Tipp: Drucken → „Als PDF speichern“ lädt das Blatt als PDF herunter.",
      printOpts: { settings: "PDF-Einstellungen", paper: "Papier", letter: "US Letter", a4: "A4", legal: "Legal", orientation: "Ausrichtung", portrait: "Hochformat", landscape: "Querformat", margins: "Ränder", normal: "Normal", narrow: "Schmal", inkSaver: "Tintensparmodus (hellere Linien)", savePdf: "Als PDF speichern", pdfToast: "Wähle im Druckdialog Als PDF speichern als Ziel.", share: "Teilen", shareImage: "Als Bild teilen", copyLink: "Link kopieren", linkCopied: "Link kopiert", pinterest: "Auf Pinterest merken", recent: "Deine letzten Blätter", clear: "Löschen", madeAt: "Erstellt auf" },
      printBook: "Als Heft speichern \u2013 eine Seite pro Buchstabe",
      pageCount: { one: "Seite", other: "Seiten" },
      ofWord: "von",
      alphabetWord: "Alphabet",
      caseUpper: "Großbuchstaben", caseLower: "Kleinbuchstaben",
      save: "Speichern",
      saved: "Gespeichert",
      nameStyleLabel: "Stil", nameFillLabel: "Füllung", nameStrokeLabel: "Kontur",
      nameSolidLabel: "Jetzt ausmalen (volle Füllung)",
      pngTransparent: "PNG (transparent)",
      classSet: "Klassensatz – ein Blatt pro Name", sheets: "Blätter",
      classSetPngHint: "PNG lädt den aktuellen Namen; für den ganzen Satz Als PDF speichern verwenden.",
      bannerInstr: "Schneide jeden Wimpel entlang der gestrichelten Linie aus, stich an jedem Punkt ein Loch und fädle eine Schnur oder ein Band der Reihe nach (1, 2, 3…) durch, um das Wort zu bilden.",
      puzzleCut: "Schneide entlang der gestrichelten Linien, um jedes Buchstaben-Teil zu trennen.",
      usLetter: "US Letter",
      modelCount: { one: "Vorlagenzeile", other: "Vorlagenzeilen" },
      traceCount: { one: "Nachspurzeile", other: "Nachspurzeilen" },
      blankCount: { one: "Leerzeile", other: "Leerzeilen" },
      trace: {
        solid:    { label: "Volle Vorlage", hint: "Dunkle, volle Buchstaben – direkt nachfahren" },
        "bold-dot": { label: "Dick gepunktet", hint: "Dicke, eng gesetzte Punkte zum Verbinden" },
        "fine-dot": { label: "Fein gepunktet", hint: "Dünnere Punkte mit etwas mehr Abstand" },
        dashed:   { label: "Gestrichelt", hint: "Unterbrochene Striche – mehr Linie zu ergänzen" },
        faded:    { label: "Blasser Schatten", hint: "Hellgraue Buchstaben zum Überschreiben" },
        faint:    { label: "Leichte Hilfe", hint: "Kaum sichtbarer Umriss – fast allein" },
        blank:    { label: "Leere Linie", hint: "Keine Hilfe – aus dem Gedächtnis schreiben" }
      },
      dot: {
        easy:   { label: "Leicht", hint: "Große Abstände, wenige Punkte – die Jüngsten" },
        medium: { label: "Mittel", hint: "Ausgewogenes Punkte-Verbinden" },
        hard:   { label: "Schwer", hint: "Mehr Punkte und feinere Details" },
        expert: { label: "Experte", hint: "Viele Punkte – eine echte Herausforderung" }
      },
      size: {
        label: "Druckgröße",
        full:   { label: "Ganze Seite", hint: "Ein großer Buchstabe pro Blatt – die heutige Standardeinstellung" },
        medium: { label: "Mittel (~10 cm)", hint: "Mehrere Buchstaben pro Blatt – gut für Poster" },
        small:  { label: "Klein (~5 cm)", hint: "Viele Buchstaben pro Blatt – ideal für eine Pinnwand" }
      }
    }
,
    /* Indonesian. Sizes are metric (like de/fr/es/pt, unlike en's inches).
       "mading" (majalah dinding) is the Indonesian school wall-display that
       does the job en calls a bulletin board. Indonesian marks no plural, so
       every count form deliberately repeats one word. */
    id: {
      letterWord: "huruf", numberWord: "angka",
      copied: "Tersalin!",
      downloadPng: "Unduh PNG",
      copyPaste: "Salin-tempel", copy: "Salin", howToDraw: "Cara menulisnya", lowerSuffix: " \u00b7 kecil",
      level: "Tingkat", nameLabel: "Nama:", dateLabel: "Tanggal:", space: "spasi",
      dotToDot: "sambung titik", bannerFlag: "Bendera banner \u2014",
      dotsCount: "titik", dotNumbers: "Titik bernomor",
      dotLadderTitle: "Tangga latihan",
      dotLadderText: "Mulai dari yang mudah, lalu tambah titiknya begitu sudah terbiasa. Sudah lancar di tingkat Ahli? Matikan nomornya, lalu coba gambar sendiri tanpa panduan.",
      pdfHint: "Tips: Cetak \u2192 \u201cSimpan sebagai PDF\u201d akan mengunduh lembar ini sebagai PDF.",
      printOpts: { settings: "Pengaturan PDF", paper: "Kertas", letter: "Letter", a4: "A4", legal: "Legal", orientation: "Orientasi", portrait: "Potret", landscape: "Lanskap", margins: "Margin", normal: "Normal", narrow: "Sempit", inkSaver: "Hemat tinta (garis lebih tipis)", savePdf: "Simpan sebagai PDF", pdfToast: "Di dialog cetak, pilih Simpan sebagai PDF sebagai tujuan.", share: "Bagikan", shareImage: "Bagikan sebagai gambar", copyLink: "Salin tautan", linkCopied: "Tautan disalin", pinterest: "Simpan ke Pinterest", recent: "Lembar terbaru Anda", clear: "Hapus", madeAt: "Dibuat di" },
      printBook: "Simpan sebagai buku \u2014 satu halaman per huruf",
      save: "Simpan",
      saved: "Tersimpan",
      nameStyleLabel: "Gaya", nameFillLabel: "Warna isi", nameStrokeLabel: "Garis tepi",
      nameSolidLabel: "Langsung diwarnai (isi penuh)",
      pngTransparent: "PNG (transparan)",
      classSet: "Set kelas \u2014 satu lembar per nama", sheets: "lembar",
      classSetPngHint: "PNG mengunduh nama yang sedang tampil; pakai Simpan sebagai PDF untuk seluruh setnya.",
      bannerInstr: "Gunting tiap bendera mengikuti garis putus-putus, lubangi di setiap titik, lalu masukkan tali atau pita berurutan (1, 2, 3\u2026) sampai membentuk katanya.",
      puzzleCut: "Gunting mengikuti garis putus-putus untuk memisahkan tiap kepingan huruf.",
      usLetter: "US Letter",
      bannerFlagsLabel: "bendera banner", ofWord: "dari",
      flagCount: { one: "bendera", other: "bendera" },
      pageCount: { one: "halaman", other: "halaman" },
      alphabetWord: "alfabet",
      caseUpper: "Huruf besar", caseLower: "Huruf kecil",
      modelCount: { one: "contoh", other: "contoh" },
      traceCount: { one: "tebalkan", other: "tebalkan" },
      blankCount: { one: "kosong", other: "kosong" },
      trace: {
        solid:    { label: "Contoh penuh", hint: "Huruf gelap utuh \u2014 langsung ditebalkan di atasnya" },
        "bold-dot": { label: "Titik tebal", hint: "Titik besar dan rapat sehingga mudah dihubungkan" },
        "fine-dot": { label: "Titik halus", hint: "Titik lebih tipis dengan jarak sedikit lebih renggang" },
        dashed:   { label: "Garis putus-putus", hint: "Garis terputus \u2014 lebih banyak yang harus dilengkapi" },
        faded:    { label: "Bayangan samar", hint: "Huruf abu-abu muda untuk ditimpa" },
        faint:    { label: "Panduan tipis", hint: "Garis nyaris tak terlihat \u2014 hampir tanpa bantuan" },
        blank:    { label: "Garis kosong", hint: "Tanpa panduan \u2014 tulis dari ingatan" }
      },
      dot: {
        easy:   { label: "Mudah", hint: "Jarak lebar, titik sedikit \u2014 untuk anak paling kecil" },
        medium: { label: "Sedang", hint: "Sambung titik yang seimbang" },
        hard:   { label: "Sulit", hint: "Lebih banyak titik dan detail hurufnya lebih halus" },
        expert: { label: "Ahli", hint: "Titiknya banyak \u2014 tantangan sungguhan" }
      },
      size: {
        label: "Ukuran cetak",
        full:   { label: "Satu halaman penuh", hint: "Satu huruf besar per lembar \u2014 setelan bawaan saat ini" },
        medium: { label: "Sedang (~10 cm)", hint: "Beberapa huruf per lembar \u2014 cocok untuk poster" },
        small:  { label: "Kecil (~5 cm)", hint: "Banyak huruf per lembar \u2014 pas untuk mading" }
      }
    }
  };
  /* Shallow-merged over English rather than replaced, so a key a locale block
     does not define falls back instead of being undefined. `T.pageCount` was
     missing from five of the eight blocks, and the first read of `.one`
     threw before buildPrintOptions ran -- which took the settings panel, the
     share row and the print-to-PDF relabelling down with it, on every German,
     Spanish, French, Italian and Portuguese printables page at once. Nothing
     could see it: the markup was valid, every gate passed, and a page whose
     init aborted looks exactly like a page that never had those features.
     The merge is shallow on purpose -- each locale's own plural `forms`
     objects are complete units and must not be merged key-by-key with
     English's. */
  const T = Object.assign({}, I18N.en, I18N[LANG] || {});

  // Locale-aware pluralizer for the small count labels below (banner flags/
  // pages, handwriting model/trace/blank rows). English deliberately keeps
  // its labels invariant ("3 trace", not "3 traces" — a byte-for-byte-
  // preserved stylistic choice, not an oversight), so its `forms` objects
  // just repeat the same word for `one` and `other`. German only needs a
  // one/other split. Polish needs a real one/few(2-4)/many(5+, excluding
  // 12-14) split, per standard Polish cardinal-number agreement.
  function plural(n, forms) {
    if (LANG === "pl") {
      if (n === 1) return forms.one;
      const mod10 = n % 10, mod100 = n % 100;
      if (forms.few && mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms.few;
      return forms.many || forms.other || forms.one;
    }
    return n === 1 ? forms.one : (forms.other || forms.one);
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const SVGNS = "http://www.w3.org/2000/svg";

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const DIGITS = "0123456789".split("");
  // CFG.chars lets a page hand the engine an explicit, ordered character set
  // instead of the default English A-Z (+0-9) — e.g. the 27-letter Spanish
  // alphabet, which inserts Ñ between N and O. Purely additive: every page
  // that doesn't set CFG.chars keeps computing CHARS exactly as before.
  const CHARS = (Array.isArray(CFG.chars) && CFG.chars.length)
    ? CFG.chars.slice()
    : (CFG.charset === "alnum") ? LETTERS.concat(DIGITS) : LETTERS.slice();

  const RENDER = CFG.render || "outline";           // "outline" | "glyph"
  // Mutable (not const): pages that set CFG.scriptOptions let the visitor
  // switch the active font at runtime (e.g. choosing which German school
  // handwriting standard to practice). Every render function below reads
  // FONT fresh on each call, so reassigning it here is enough to repaint
  // every surface (preview, print sheet, PNG) in the new script — no other
  // function needs to change. Pages that don't set scriptOptions never call
  // setGenScript(), so FONT stays exactly as constant as it always was.
  let FONT = CFG.font || "'Plus Jakarta Sans', 'Segoe UI Symbol', sans-serif";
  const SCRIPT_OPTIONS = Array.isArray(CFG.scriptOptions) && CFG.scriptOptions.length
    ? CFG.scriptOptions
    : null;
  let genScriptKey = SCRIPT_OPTIONS ? SCRIPT_OPTIONS[0].key : null;
  /* Letterform picker for the SINGLE-CHARACTER surface (CFG.charStyles).
     Mutable for the same reason FONT is: the A-Z picker, the alphabet sheet
     and the tiled batch all read FONT / STROKE / LETTER_SPACING fresh on
     every call, so reassigning them here repaints all three. Pages that do
     not set CFG.charStyles never call setCharStyle(), so these stay exactly
     as constant as they have always been.

     Why it exists: /printables/graffiti-letters/ shipped with CFG.font set
     to Fredoka, which is /printables/bubble-letters/'s own face. The first
     thing a visitor met on a graffiti page was therefore a bubble letter,
     while the page's four real graffiti faces were already loading and were
     bound to the name input alone. `charStyles: true` reuses that same
     nameStyles array rather than restating it, so the two surfaces cannot
     drift apart. */
  const CHAR_STYLES = CFG.charStyles === true
    ? (Array.isArray(CFG.nameStyles) && CFG.nameStyles.length ? CFG.nameStyles : null)
    : (Array.isArray(CFG.charStyles) && CFG.charStyles.length ? CFG.charStyles : null);
  let charStyleKey = CHAR_STYLES ? CHAR_STYLES[0].key : null;
  let STROKE = CFG.strokeWidth || 9;
  const NOUN = CFG.noun || "letter";                // "bubble letter", "block letter"…
  // Extra space between letters in multi-letter (word/name) output, expressed
  // as a fraction of the font size (em). Puffy, non-connecting outlines
  // (bubble, block) read better with a little breathing room so each letter
  // can be traced and colored on its own; connected glyphs (cursive) leave
  // this at 0 so their joins stay intact.
  let LETTER_SPACING = Number(CFG.letterSpacing) || 0;
  const PNG_PREFIX = CFG.pngPrefix || "printable";
  const GLYPH_STYLE = CFG.glyphStyle || "";         // primary registry style (glyph mode)
  /* The noun the copy-paste variant section uses, which is NOT always the
     page's own noun. /printables/graffiti-letters/ headed that section
     "Copy-paste graffiti letter A" over twenty-one circled and parenthesised
     Unicode letters, none of which is graffiti. A page sets variantNoun: ""
     to drop the adjective, leaving "Copy-paste letter A" -- true, and built
     from charLabel(), so it needs no new string in any of the eight
     languages this engine ships in. */
  const VARIANT_NOUN = CFG.variantNoun != null ? CFG.variantNoun : (CFG.noun || "letter");
  function joinWords(parts) { return parts.filter((x) => x != null && x !== "").join(" "); }

  /* A style may declare `skew` in degrees. SVG's skewX shears about the
     origin, so a glyph set on a baseline at y moves left by y*tan(skew); the
     translate puts the anchor back where it was, leaving a slant instead of a
     slide. Used by the graffiti Blockbuster face, which was rendering Archivo
     Black upright -- /printables/block-letters/'s own typeface, under a
     graffiti style name. A blockbuster piece is heavy block capitals set on a
     slant, so the slant is the part that was missing, not the weight. */
  function skewTransform(deg, anchorY) {
    const d = Number(deg) || 0;
    if (!d) return null;
    const shift = -anchorY * Math.tan(d * Math.PI / 180);
    return "translate(" + shift.toFixed(2) + ",0) skewX(" + d + ")";
  }
  const INK = "#1a1a2e";

  const el = {
    strip: $("#pt-strip"),
    charStyles: $("#pt-char-styles"),
    panel: $("#pt-panel"),
    alphaGrid: $("#pt-alphabet-grid"),
    alphaPrint: $("#pt-alphabet-print"),
    bookPrint: $("#pt-book-print"),
    sizeControl: $("#pt-size-control"),
    practicePrint: $("#pt-practice-print"),
    nameInput: $("#pt-name-input"),
    nameRoster: $("#pt-name-roster"),
    namePrint: $("#pt-name-print"),
    namePng: $("#pt-name-png"),
    namePngT: $("#pt-name-png-transparent"),
    namePreview: $("#pt-name-preview"),
    nameRows: $("#pt-name-rows"),
    nameStyles: $("#pt-name-styles"),
    nameFill: $("#pt-name-fill"),
    nameStroke: $("#pt-name-stroke"),
    nameSolid: $("#pt-name-solid"),
    strokeToggle: $("#pt-stroke-toggle"),
    // Difficulty generator (handwriting-worksheet-generator)
    genInput: $("#pt-gen-input"),
    genPreview: $("#pt-gen-preview"),
    genPreviewMeta: $("#pt-gen-preview-meta"),
    genSlider: $("#pt-gen-slider"),
    genLevels: $("#pt-gen-levels"),
    genLevel: $("#pt-gen-level"),
    genHint: $("#pt-gen-hint"),
    genPresets: $("#pt-gen-presets"),
    genRows: $("#pt-gen-rows"),
    genCase: $("#pt-gen-case"),
    genModel: $("#pt-gen-model"),
    genPrint: $("#pt-gen-print"),
    genPng: $("#pt-gen-png"),
    genScript: $("#pt-gen-script"),
    genRoster: $("#pt-gen-roster"),
    genLadder: $("#pt-gen-ladder"),
    // Coloring-sheet designer (optional; gated on its own mounts)
    designInput: $("#pt-design-input"),
    designInput2: $("#pt-design-input2"),
    designCount: $("#pt-design-count"),
    designFillNote: $("#pt-design-fill-note"),
    designAudienceGroup: $("#pt-design-audience"),
    designClassFields: $("#pt-design-class-fields"),
    designPreviewMeta: $("#pt-design-preview-meta"),
    designSettingsMount: $("#pt-design-settings-mount"),
    designHeading: $("#pt-design-heading"),
    designRoster: $("#pt-design-roster"),
    designFill: $("#pt-design-fill"),
    designBorder: $("#pt-design-border"),
    designFillGroup: $("#pt-design-fill-group"),
    designBorderGroup: $("#pt-design-border-group"),
    designFooter: $("#pt-design-footer"),
    // Dot-to-dot mode (optional; gated on #pt-design-mode-group)
    designModeGroup: $("#pt-design-mode-group"),
    designFillField: $("#pt-design-fill-field"),
    designDotsOptions: $("#pt-design-dots-options"),
    designDensityGroup: $("#pt-design-density-group"),
    designDensityNote: $("#pt-design-density-note"),
    designHint: $("#pt-design-hint"),
    designPreview: $("#pt-design-preview"),
    designPrint: $("#pt-design-print"),
    designLadder: $("#pt-design-ladder"),
    designPng: $("#pt-design-png"),
    // Banner maker (optional; gated on its own mounts)
    bannerInput: $("#pt-banner-input"),
    bannerPreview: $("#pt-banner-preview"),
    bannerMeta: $("#pt-banner-meta"),
    bannerPrint: $("#pt-banner-print"),
    bannerPng: $("#pt-banner-png"),
    // Name puzzle maker (optional; gated on its own mounts)
    puzzleInput: $("#pt-puzzle-input"),
    puzzleRoster: $("#pt-puzzle-roster"),
    puzzleHeading: $("#pt-puzzle-heading"),
    puzzleBorderGroup: $("#pt-puzzle-border-group"),
    puzzleFooter: $("#pt-puzzle-footer"),
    puzzlePreview: $("#pt-puzzle-preview"),
    puzzlePrint: $("#pt-puzzle-print"),
    puzzlePng: $("#pt-puzzle-png"),
    printRoot: $("#pt-print-root")
  };

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */

  function charLabel(ch) { return /[0-9]/.test(ch) ? (T.numberWord + " " + ch) : (T.letterWord + " " + ch); }
  // ASCII-safe slug for the one Latin letter in CFG.chars sets with no plain
  // a-z form (Ñ, from the Spanish alphabet) — keeps PNG filenames and #hash
  // anchors free of non-ASCII characters. Every other letter is unaffected.
  function charSlug(ch) {
    if (/[0-9]/.test(ch)) return "number-" + ch;
    const lower = ch.toLowerCase();
    if (lower === "ñ") return "letter-enye";
    return "letter-" + lower;
  }
  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function primaryFontName() {
    // "Fredoka, '…', sans-serif" -> "Fredoka" (for document.fonts.load)
    return (FONT.split(",")[0] || "").replace(/['"]/g, "").trim();
  }
  function registry() { return window.textStyles || {}; }

  function renderGlyph(text, styleKey) {
    const style = registry()[styleKey || GLYPH_STYLE];
    const R = window.UltraTextGenRender;
    if (!style || !R || typeof R.renderAny !== "function") return text;
    try { return R.renderAny(text, style); } catch (e) { return text; }
  }

  // Copy-paste Unicode variants of a single character. A page may supply an
  // explicit curated list of registry style keys (CFG.variantStyles) — useful
  // when the set spans more than one familySlug (e.g. calligraphy = blackletter
  // + elegant script) — otherwise all map styles in CFG.variantFamily are used.
  function familyStyles() {
    const reg = registry();
    if (Array.isArray(CFG.variantStyles) && CFG.variantStyles.length) {
      const out = [];
      CFG.variantStyles.forEach((name) => {
        const s = reg[name];
        if (s && s.type === "map") out.push({ name: name, style: s });
      });
      return out;
    }
    if (!CFG.variantFamily) return [];
    const out = [];
    Object.keys(reg).forEach((name) => {
      const s = reg[name];
      if (!s || s.type !== "map") return;
      const fam = s.familySlug;
      const inFam = fam === CFG.variantFamily || (Array.isArray(fam) && fam.indexOf(CFG.variantFamily) !== -1);
      if (inFam) out.push({ name: name, style: s });
    });
    return out;
  }

  function copyText(value, btn) {
    const done = () => {
      if (!btn) return;
      const prev = btn.textContent;
      btn.classList.add("is-copied");
      btn.textContent = T.copied;
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

  /* ---------------------------------------------------------------
     Glyph builders (SVG for outline mode, text for glyph mode)
     --------------------------------------------------------------- */

  // A single character as a rounded, traceable SVG outline (outline mode).
  /* OUT-15 -- bridged stencils.

     /printables/block-letters/ is titled "Block Letters & Letter Stencils",
     its how-to step 2 says "cut along the border for a reusable stencil", and
     cutting along the border of A B D O P Q R 0 4 6 8 9 drops the counter on
     the floor. Twelve of its thirty-six characters could not be made into the
     thing the page is named after.

     The bridges are found from the glyph, by js/printables/stencil.js, rather
     than from a per-letter table: a table would be tuned to one typeface and
     silently wrong for the next, and a page here can choose its own face.

     ADDITIVE AND OFF BY DEFAULT. This page is the site's largest single
     revenue URL and its registry action is PROTECT/additive-only, so the
     ordinary outline is byte-for-byte what it was and the stencil is a second
     mode behind a control the visitor has to turn on.

     Geometry is mapped INK BOX TO INK BOX, never by assuming the two
     rasterisers agree about baselines: canvas has no equivalent of SVG's
     dominant-baseline:central, so the mask is measured from its own pixels
     and the stencil variant places its text by an explicitly computed ink
     box. That is also why the stencil variant sits fractionally differently
     from the plain outline -- it is centred on its ink rather than on the
     font's central axis. */
  const STENCIL_TYPE_PX = 200;        // canvas type size the mask is drawn at
  const STENCIL_BRIDGE_EM = 0.055;    // strip width, as a fraction of ink height
  let stencilOnFlag = false;
  let stencilWarned = false;

  function stencilModule() {
    const ns = window.UltraTextGen && window.UltraTextGen.stencil;
    if (!ns && !stencilWarned) {
      stencilWarned = true;
      console.warn("[printables] js/printables/stencil.js has not loaded; the stencil mode draws the plain outline, with no bridges.");
    }
    return ns || null;
  }
  function loadStencilModule() {
    if (window.UltraTextGen && window.UltraTextGen.stencil) return;
    if (document.querySelector("script[data-pt-stencil]")) return;
    const sc = document.createElement("script");
    sc.src = "/js/printables/stencil.js";
    sc.async = true;
    sc.setAttribute("data-pt-stencil", "");
    sc.onerror = () => console.warn("[printables] js/printables/stencil.js failed to load; the stencil mode draws the plain outline.");
    document.head.appendChild(sc);
  }
  function stencilOn() { return stencilOnFlag && CFG.stencil === true && RENDER === "outline"; }

  /* The glyph as a bitmap, plus the ink box measured from the bitmap itself
     and the type metrics the caller needs to place the same glyph elsewhere.
     Returns null for a character with no ink (a space) or before the face has
     loaded, and the caller then draws the plain outline. */
  function stencilMask(ch) {
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return null;
    const M = STENCIL_TYPE_PX;
    probe.font = "700 " + M + "px " + FONT;
    const m = probe.measureText(ch);
    const left = -m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
    const top = -m.actualBoundingBoxAscent, bottom = m.actualBoundingBoxDescent;
    const iw = right - left, ih = bottom - top;
    if (!(iw > 1 && ih > 1)) return null;
    const pad = Math.ceil(Math.max(iw, ih) * 0.1) + 4;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(iw) + pad * 2;
    canvas.height = Math.ceil(ih) + pad * 2;
    const g = canvas.getContext("2d");
    g.font = "700 " + M + "px " + FONT;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#000000";
    g.fillText(ch, pad - left, pad - top);
    const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
    const mask = new Uint8Array(canvas.width * canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      if (data[i + 3] <= 128) continue;
      mask[j] = 1;
      const x = j % canvas.width, y = (j - x) / canvas.width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxX < 0) return null;
    return {
      mask: mask, w: canvas.width, h: canvas.height,
      box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      M: M, left: left, right: right, top: top, bottom: bottom
    };
  }

  /* Bridge rectangles in a destination ink box. strokePx is the outline's own
     stroke weight in destination units, so the strip is wide enough to cover
     the cut line on both sides of the wall rather than leaving two hairlines
     the scissors follow anyway. */
  function stencilRects(geo, dst, strokePx) {
    const sten = stencilModule();
    if (!sten || !geo) return [];
    const toDst = dst.h / geo.box.h;
    const width = Math.max(2, Math.round(dst.h * STENCIL_BRIDGE_EM / toDst));
    const pad = Math.max(1, Math.round((strokePx || 0) / toDst));
    const rects = sten.findBridges(geo.mask, geo.w, geo.h, { width: width, pad: pad });
    const sx = dst.w / geo.box.w, sy = dst.h / geo.box.h;
    return rects.map((r) => ({
      x: dst.x + (r.x - geo.box.x) * sx,
      y: dst.y + (r.y - geo.box.y) * sy,
      w: r.w * sx,
      h: r.h * sy
    }));
  }

  function outlineSVG(ch, opts) {
    const o = opts || {};
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 240");
    svg.setAttribute("class", "bubble-outline" + (o.small ? " is-small" : ""));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", NOUN + " " + charLabel(ch));
    const text = document.createElementNS(SVGNS, "text");
    text.setAttribute("x", "100");
    text.setAttribute("y", "128");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", FONT);
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", "210");
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("stroke", INK);
    /* o.strokeScale thins the outline as the printed glyph gets physically
       smaller. In vector terms it would not need to: the SVG scales as a
       unit, so a stroke held at a fixed fraction of the type never closes a
       counter. The sheet is rasterised though, and a 2in tile gets a quarter
       of the pixels an 8in single letter does, so the two walls of a narrow
       counter anti-alias into one another and fill. Measured on
       block-letters' G, whose spur notch went solid on the tiled sheet while
       staying clean at single-letter size in both render paths. The floor of
       4 is the weight the old binary `small` branch settled on and is where
       the outline stops reading as an outline. */
    const strokeScale = o.strokeScale != null ? o.strokeScale : (o.small ? (STROKE > 6 ? (STROKE - 2) / STROKE : 1) : 1);
    text.setAttribute("stroke-width", String(Math.max(4, STROKE * strokeScale)));
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    const skew = skewTransform(o.skew != null ? o.skew : CFG.skew, 128);
    if (skew) text.setAttribute("transform", skew);
    text.textContent = ch;
    svg.appendChild(text);
    /* The stencil variant re-places the glyph on its own ink box so the
       bridges can be mapped onto it exactly, and then breaks the cut line
       where the walls are thinnest. A character with no counter gets no
       rects, which is why nothing had to enumerate which twelve they are. */
    const wantStencil = o.stencil != null ? o.stencil : stencilOn();
    if (wantStencil && !skew) {
      const geo = stencilMask(ch);
      if (geo) {
        const k = 210 / geo.M;
        const dst = {
          w: (geo.right - geo.left) * k,
          h: (geo.bottom - geo.top) * k,
          x: 0, y: 0
        };
        dst.x = 100 - dst.w / 2;
        dst.y = 120 - dst.h / 2;
        text.setAttribute("text-anchor", "start");
        text.setAttribute("dominant-baseline", "alphabetic");
        text.setAttribute("x", String(dst.x - geo.left * k));
        text.setAttribute("y", String(dst.y - geo.top * k));
        const sw = Math.max(4, STROKE * strokeScale);
        stencilRects(geo, dst, sw).forEach((r) => {
          const rect = document.createElementNS(SVGNS, "rect");
          rect.setAttribute("x", String(r.x));
          rect.setAttribute("y", String(r.y));
          rect.setAttribute("width", String(r.w));
          rect.setAttribute("height", String(r.h));
          rect.setAttribute("fill", "#ffffff");
          svg.appendChild(rect);
        });
      }
    }
    if (o.overlay) addStrokeOverlay(svg, ch);
    return svg;
  }

  // A whole word as one rounded outline SVG (used by the name worksheet in
  // outline mode). Width scales with the word so long names stay readable.
  // opts.font / opts.spacing / opts.fill / opts.strokeColor / opts.strokeWidth
  // override the page defaults — the name-style designer path; every default
  // preserves the original behaviour for pages without a designer.
  function wordOutlineSVG(word, opts) {
    const o = opts || {};
    const chars = [...String(word)];
    const fontSize = 150;
    const spacing = fontSize * ((o.spacing != null ? o.spacing : LETTER_SPACING) + spacingBoost);
    const w = Math.max(200, chars.length * 118 + 80 + Math.max(0, chars.length - 1) * spacing);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " 200");
    svg.setAttribute("class", "pt-word-outline");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", word);
    const text = document.createElementNS(SVGNS, "text");
    text.setAttribute("x", String(w / 2));
    text.setAttribute("y", "112");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", o.font || FONT);
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", String(fontSize));
    /* The name-tracing family draws its rows here rather than through
       levelSpec, so high contrast has to be applied again: its trace outline
       is #8b93a7 at width 3, which is exactly the light grey a copier
       dithers away. Only the hollow rows change -- a solid model row is
       already INK. */
    const hc = highContrastOn();
    text.setAttribute("fill", o.solid ? (o.fill || INK) : "#ffffff");
    text.setAttribute("stroke", o.solid ? (o.strokeColor || "none") : (hc ? CONTRAST_INK : (o.strokeColor || "#8b93a7")));
    /* o.strokeWidth arrives quoted in outlineSVG()'s units (font-size 210) --
       it comes from CFG.strokeWidth or a nameStyles entry, the same field the
       single-letter surface reads. This function draws at font-size 150, so
       the number has to be converted or the same style renders a stroke 40%
       fatter relative to the type on a name than on a letter. Measured on the
       graffiti Spray face, whose outline is all contour: at 4/150 (2.67% of
       the type) the speckles merge into a smear, while the canvas export drew
       the same style at 2% and stayed legible. Same control state, two
       products. WORD_OUTLINE_STROKE is this constant's inverse and exists for
       the same reason. */
    const wordStroke = o.strokeWidth != null ? o.strokeWidth * fontSize / OUTLINE_SVG_FONT : 3;
    text.setAttribute("stroke-width", o.solid ? String(o.strokeColor ? (o.strokeWidth != null ? wordStroke : 4) : 0) : String(hc ? contrastStroke(fontSize, wordStroke) : wordStroke));
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    // Nudge the anchor left by half a letter-gap so the trailing space SVG adds
    // after the final glyph doesn't push the centered word off-center.
    if (spacing) {
      text.setAttribute("letter-spacing", String(spacing));
      text.setAttribute("dx", String(-spacing / 2));
    }
    const wskew = skewTransform(o.skew, 112);
    if (wskew) text.setAttribute("transform", wskew);
    text.textContent = word;
    svg.appendChild(text);
    if (o.overlay) addWordStrokeOverlay(svg, word, fontSize, spacing, 112, "central", w);
    return svg;
  }

  // The big figure for the detail panel: outline SVG, a script-glyph pair, or
  // (RENDER === "dots") a single-character numbered dot-to-dot.
  /* The on-screen preview as a sheet of the paper that was chosen.

     Print settings used to change the @page rule and nothing a visitor could
     see: the preview card rendered the same 518x622 figure whether you picked
     US Letter portrait or Legal landscape, so the only way to find out what
     the settings did was to print. Measured before the change — the preview
     was byte-identical at 518x622 before and after switching to Legal /
     Landscape / Narrow.

     Now the card IS the page: it takes the chosen paper's aspect ratio, its
     margin, and the ink-saver setting, and the letter fills it the way it will
     fill the sheet. Landscape is short and wide on screen because it is short
     and wide on paper. The caption underneath names the same settings in
     words, composed only from strings the print-settings panel already ships
     translated — nothing new was authored for it. */
  let paperPreviewNode = null;
  function paperCaption() {
    // "auto" is no longer selectable and a saved one migrates to a real paper,
    // so the fallback names a real sheet rather than a mode that is gone.
    const paperLabel = { letter: PO.letter, a4: PO.a4, legal: PO.legal }[printPrefs.paper] || PO.letter;
    const parts = [
      paperLabel,
      printPrefs.orient === "landscape" ? PO.landscape : PO.portrait,
      printPrefs.margin === "narrow" ? PO.narrow : PO.normal
    ];
    if (printPrefs.ink === "saver") parts.push(PO.inkSaver);
    // English-only like the control itself; printPrefs.buildPanel resets a
    // stored "contrast" on any other locale, so this can never be the one
    // English word in a translated caption.
    if (printPrefs.ink === "contrast") parts.push("High contrast");
    return parts.join(" · ");
  }
  function paintPaperPreview() {
    // The designer's own "paper" strip is repainted from here too, so one
    // panel change updates every surface that names the paper.
    if (typeof syncDesignPreviewMeta === "function") syncDesignPreviewMeta();
    // No isConnected guard: paperPreview() paints once while the holder is
    // still detached (selectChar appends it afterwards), and an isConnected
    // check there silently skipped that first paint — the sheet took the
    // default aspect and the caption rendered EMPTY. A stale node cannot be
    // painted anyway, because paperPreviewNode is reassigned on every
    // selectChar. Caught by driving a browser; nothing else could see it.
    const node = paperPreviewNode;
    if (!node) return;
    const full = paperFull();
    const sheet = $(".pt-paper-sheet", node);
    // One custom property carries both the shape and the on-screen size: the
    // sheet is capped by HEIGHT, so a landscape page spreads across the panel
    // instead of being held to a portrait page's width.
    if (sheet) {
      sheet.style.setProperty("--pt-paper-aspect", (full.w / full.h).toFixed(4));
      // The preview's glyph scale comes from the SAME constant the print uses
      // (see .pt-paper-inner .pt-glyph-figure in style.css). Publishing it
      // rather than repeating 0.34 in CSS is what keeps a cursive preview and
      // a cursive printout the same shape.
      sheet.style.setProperty("--pt-glyph-ratio", String(GLYPH_RATIO));
    }
    node.classList.toggle("is-ink-saver", printPrefs.ink === "saver");
    node.classList.toggle("is-high-contrast", printPrefs.ink === "contrast");
    node.classList.toggle("is-narrow", printPrefs.margin === "narrow");
    const cap = $(".pt-paper-caption", node);
    if (cap) cap.textContent = paperCaption();
  }
  function paperPreview(ch) {
    const holder = document.createElement("div");
    holder.className = "pt-paper";
    const sheet = document.createElement("div");
    sheet.className = "pt-paper-sheet";
    // The figure sits in its own absolutely-positioned box, not directly in
    // the sheet. Percentage heights need a DEFINITE containing height and an
    // aspect-ratio box does not give one, so a figure placed straight into
    // the sheet fell back to its intrinsic aspect at full width and made the
    // sheet 893px tall where the ratio called for 461. Same trap as the print
    // surface, second instance in one change.
    const inner = document.createElement("div");
    inner.className = "pt-paper-inner";
    inner.appendChild(figureNode(ch));
    sheet.appendChild(inner);
    holder.appendChild(sheet);
    const caption = document.createElement("p");
    caption.className = "pt-paper-caption";
    holder.appendChild(caption);
    paperPreviewNode = holder;
    paintPaperPreview();
    return holder;
  }

  function figureNode(ch) {
    if (RENDER === "glyph") {
      const p = document.createElement("p");
      p.className = "pt-glyph-figure";
      const u = renderGlyph(ch.toUpperCase());
      const l = renderGlyph(ch.toLowerCase());
      p.textContent = /[0-9]/.test(ch) ? u : (u + " " + l);
      return p;
    }
    if (RENDER === "dots") return singleDotSVG(ch);
    return outlineSVG(ch);
  }

  /* ---------------------------------------------------------------
     Stroke-direction overlay ("Show stroke direction" toggle)
     ---------------------------------------------------------------
     Occupational-therapy guidance: tracing without a numbered start-dot and
     a direction arrow can teach poor motor plans. window.UTG_STROKE_DIRECTION_DATA
     (js/printables/strokeDirectionData.js) hand-authors, per letter, a
     numbered start-dot + 1-4 short arrow strokes in the SAME 200x240 /
     font-size-210 / x=100,y=128 / dominant-baseline:central coordinate
     space that outlineSVG() already draws letters in — so for a single
     letter (outlineSVG) the overlay drops straight on top with no math.
     For a whole traced word/name (wordOutlineSVG, traceWordSVG) the word is
     still rendered as ONE unbroken <text> node exactly as before — visual
     output is byte-for-byte unchanged when the toggle is off — and the
     overlay is added as a separate layer whose per-letter groups are placed
     using Canvas-measured advance widths (the same "measure with a hidden
     canvas" technique already used elsewhere in this file, e.g. wordPNG).
     Off by default; gated entirely on the optional #pt-stroke-toggle mount,
     so pages that don't add it are completely unaffected. SVG only — PNG
     downloads intentionally don't include the overlay.
     --------------------------------------------------------------- */

  const STROKE_COLOR = "#2451c9";     // legible on white, distinct from the ink-black glyph
  const STROKE_BASELINE_UNIT_Y = 200; // where the type baseline falls inside outlineSVG's own
                                       // 200x240 / font-size-210 / central-baseline box
  let strokeOverlayUid = 0;
  let strokeMeasureCtx = null;

  function strokeOverlayOn() { return !!(el.strokeToggle && el.strokeToggle.checked); }

  function strokeDataFor(ch) {
    const table = window.UTG_STROKE_DIRECTION_DATA;
    return (table && table[ch]) ? table[ch] : null;
  }

  // Numbered start-dot + direction arrow for every stroke of one letter,
  // drawn directly into `parent`'s own coordinate space (the 200x240 unit
  // box, or a <g> already transformed into an equivalent local box).
  function addStrokeOverlay(parent, ch) {
    const data = strokeDataFor(ch);
    if (!data || !data.strokes || !data.strokes.length) return;
    const uid = "ptsd" + (++strokeOverlayUid);
    const g = svgMake("g", { class: "pt-stroke-overlay", "aria-hidden": "true" }, parent);
    const defs = svgMake("defs", null, g);
    const markerId = "ptArrow" + uid;
    // markerUnits defaults to "strokeWidth", which would silently multiply
    // markerWidth/Height by the path's stroke-width below (6x) — pin it to
    // userSpaceOnUse so the arrowhead size stays fixed and predictable.
    const marker = svgMake("marker", {
      id: markerId, viewBox: "0 0 10 10", refX: 8, refY: 5, markerUnits: "userSpaceOnUse",
      markerWidth: 20, markerHeight: 20, orient: "auto"
    }, defs);
    svgMake("path", { d: "M0,0 L10,5 L0,10 Z", fill: STROKE_COLOR }, marker);

    data.strokes.forEach((d, i) => {
      svgMake("path", {
        d: d, fill: "none", stroke: STROKE_COLOR,
        "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round",
        "marker-end": "url(#" + markerId + ")", opacity: 0.9
      }, g);
      const m = /M\s*([\d.\-]+)[,\s]+([\d.\-]+)/.exec(d);
      if (!m) return;
      const sx = parseFloat(m[1]), sy = parseFloat(m[2]);
      svgMake("circle", { cx: sx, cy: sy, r: 11, fill: "#ffffff", stroke: STROKE_COLOR, "stroke-width": 2.5 }, g);
      const label = svgMake("text", {
        x: sx, y: sy + 0.5, "text-anchor": "middle", "dominant-baseline": "central",
        "font-family": "'Plus Jakarta Sans', sans-serif", "font-weight": 700,
        "font-size": 13, fill: STROKE_COLOR
      }, g);
      label.textContent = String(i + 1);
    });
  }

  function getStrokeMeasureCtx() {
    if (!strokeMeasureCtx) strokeMeasureCtx = document.createElement("canvas").getContext("2d");
    return strokeMeasureCtx;
  }

  // Per-character center-x offsets (0-based, left edge at 0) for `word` when
  // rendered at `fontPx`, using the SAME technique wordPNG/genWordPNG already
  // use to size text on Canvas — real per-glyph advance widths, reconciled
  // so they sum to the actual measured word width (covers minor
  // kerning/rounding drift between the per-char and whole-word measurements).
  function charAdvanceCenters(word, fontPx) {
    const ctx = getStrokeMeasureCtx();
    ctx.font = "700 " + fontPx + "px " + FONT;
    const chars = [...String(word)];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const rawTotal = widths.reduce((a, b) => a + b, 0) || 1;
    const measuredTotal = ctx.measureText(word).width;
    const scale = measuredTotal / rawTotal;
    let x = 0;
    const centers = chars.map((c, i) => {
      const w = widths[i] * scale;
      const cx = x + w / 2;
      x += w; // any letter-spacing gap is added by the caller, not here
      return { ch: c, cx: cx };
    });
    return { centers: centers, total: measuredTotal };
  }

  // Draws one letter's stroke overlay, scaled + translated from its 200x240
  // authoring box into a destination slot centered at (cx, anchorY) with an
  // em-size of `emPx`. `mode` picks which point of the authoring box maps to
  // (cx, anchorY): "central" (box center, matching wordOutlineSVG's own
  // dominant-baseline:central text) or "alphabetic" (the type baseline,
  // matching traceWordSVG's default alphabetic-baseline text).
  function letterOverlayCell(parent, ch, cx, anchorY, emPx, mode) {
    if (!strokeDataFor(ch)) return;
    const scale = emPx / 210;
    const anchorUnitY = mode === "alphabetic" ? STROKE_BASELINE_UNIT_Y : 128;
    const tx = cx - 100 * scale;
    const ty = anchorY - anchorUnitY * scale;
    const g = svgMake("g", { transform: "translate(" + tx.toFixed(2) + "," + ty.toFixed(2) + ") scale(" + scale.toFixed(4) + ")" }, parent);
    addStrokeOverlay(g, ch);
  }

  // Overlays every letter of a word/name rendered as a single centered
  // <text> (wordOutlineSVG / traceWordSVG) without touching that <text>
  // node itself. `spacingPx` mirrors the `letter-spacing` attribute those
  // functions may set so the overlay tracks the same extra gaps.
  function addWordStrokeOverlay(svg, word, fontPx, spacingPx, anchorY, mode, totalW) {
    const measured = charAdvanceCenters(word, fontPx);
    const extra = spacingPx ? spacingPx * (measured.centers.length - 1) : 0;
    const fullWidth = measured.total + extra;
    let runningExtra = 0;
    const leftEdge = totalW / 2 - fullWidth / 2;
    measured.centers.forEach((c, i) => {
      const cx = leftEdge + c.cx + runningExtra;
      if (spacingPx) runningExtra += spacingPx;
      if (!/[A-Za-z]/.test(c.ch)) return;
      letterOverlayCell(svg, c.ch, cx, anchorY, fontPx, mode);
    });
  }

  const STROKE_TOGGLE_LS_KEY = "utg-pt-stroke-overlay";

  function initStrokeToggle() {
    if (!el.strokeToggle) return;
    try {
      if (localStorage.getItem(STROKE_TOGGLE_LS_KEY) === "1") el.strokeToggle.checked = true;
    } catch (e) { /* noop — storage unavailable, default unchecked */ }
    el.strokeToggle.addEventListener("change", () => {
      try { localStorage.setItem(STROKE_TOGGLE_LS_KEY, el.strokeToggle.checked ? "1" : "0"); } catch (e) { /* noop */ }
      if (el.nameInput || el.namePreview) renderNamePreview();
      if (el.genInput || el.genPreview) renderGenPreview();
    });
  }

  /* ---------------------------------------------------------------
     PNG export (Canvas)
     --------------------------------------------------------------- */

  /* Every sheet on this site is drawn in a Google Font fetched at runtime
     (Baloo 2, Archivo Black, Fredoka, Quicksand, Playwrite). The build-time
     preview PNGs are rasterised with the real face and can never fail; the
     live tool can, and when it does the browser substitutes a system sans
     with no error and no visible difference except the letterform itself.
     A visitor on a blocked, filtered or offline connection then prints a
     sheet that is not the sheet the page shows a picture of -- and nothing
     anywhere recorded that it had happened. Reproduced accidentally while
     auditing this engine on 2026-09-13, which is the only reason it is known
     to be reachable at all.

     Deliberately not a warning banner: the sheet is still usable, the CSS
     stack already names sensible fallbacks, and inventing a caveat string in
     eight languages to describe a font substitution most visitors cannot see
     would cost more than it returns. What was missing is that the state was
     unobservable, so it is made observable instead -- a root class for CSS or
     a future decision to hang off, and one event so the rate is a number
     rather than a guess. */
  let fontFallbackReported = false;
  function reportFontFallback(fam, reason) {
    if (fontFallbackReported) return;
    fontFallbackReported = true;
    document.documentElement.classList.add("pt-font-fallback");
    trackPrintableEvent("printable_font_fallback", { printable_font: fam, printable_font_reason: reason });
  }

  function noteFontAvailability(fam) {
    if (fontFallbackReported || !fam) return;
    if (!document.fonts || !document.fonts.check) return;
    let loaded = true;
    try { loaded = document.fonts.check("700 200px " + fam); } catch (err) { return; }
    if (loaded) return;
    reportFontFallback(fam, "not_loaded");
  }

  /* The family-name check above cannot see the real failure on a glyph-mode
     page. There the letterform is a Unicode math alphanumeric produced by
     renderGlyph(), and it is set in the page's body font -- Plus Jakarta
     Sans, which always loads. So document.fonts.check() answers "yes" about a
     font containing not one of the codepoints actually on the sheet, and
     printable_font_fallback could never fire on the 69 pages whose letterform
     is 100% substitution. A check that reports nothing is indistinguishable
     from a check that passes.

     What the platform does expose is an advance width. Measure the glyph in
     the declared stack, then in a bare generic: if the two agree, the
     generic's own fallback drew it both times and the declared family
     contributed nothing. Reported with its own reason so a transient network
     failure and a page that never had a face for its letterform stay two
     different numbers. */
  let measureCtx = null;
  function glyphAdvance(text, family) {
    if (!measureCtx) {
      const c = document.createElement("canvas");
      measureCtx = c.getContext ? c.getContext("2d") : null;
    }
    if (!measureCtx) return null;
    measureCtx.font = "700 200px " + family;
    try { return measureCtx.measureText(text).width; } catch (err) { return null; }
  }

  function noteGlyphCoverage(sample, fam) {
    if (fontFallbackReported || !sample) return;
    const declared = glyphAdvance(sample, fam);
    const generic = glyphAdvance(sample, "sans-serif");
    if (declared == null || generic == null) return;
    // A tolerance, not equality: sub-pixel metric differences are normal even
    // when the same physical face draws both.
    if (Math.abs(declared - generic) > 0.5) return;
    reportFontFallback(fam, "no_coverage");
  }

  function withFont(cb, famOverride) {
    const fam = famOverride || primaryFontName();
    if (fam && document.fonts && document.fonts.load) {
      const done = () => { noteFontAvailability(fam); cb(); };
      document.fonts.load("700 200px " + fam).then(done).catch(done);
    } else {
      cb();
    }
  }

  // Printable output telemetry lives in header.js (window.UltraTextGen.
  // trackPrintable) because crossStitchEngine.js and monogramEngine.js are
  // separate IIFEs on pages that do not load this file, and three copies of
  // one event's shape would drift. The guard keeps printing working if the
  // helper is ever absent.
  function trackPrintable(action, sheet) {
    if (window.UltraTextGen && window.UltraTextGen.trackPrintable) {
      window.UltraTextGen.trackPrintable(action, sheet);
    }
  }

  // Extra printables events (printable_generate, print_dialog_closed) go
  // through the same header.js helper family so the payload shape stays in
  // one place; the guard keeps the engine working if header.js is older.
  function trackPrintableEvent(name, params) {
    if (window.UltraTextGen && window.UltraTextGen.trackPrintableEvent) {
      window.UltraTextGen.trackPrintableEvent(name, params);
    }
  }

  /* ---------------------------------------------------------------
     Print settings, presets and sharing (2026-09-10).
     Every sheet on this site used to print with whatever paper size the
     browser dialog defaulted to, and the only way to a PDF was to know that
     the dialog can save one. Teachers' own workflow language ("print on
     Letter", "A4", "black ink only", "here is the sheet I made") is what the
     block below serves: a per-device print-settings panel, a Save as PDF
     button that opens the dialog with the sheet already sized, a preset URL
     for every sheet so it can be sent to a colleague or a parent and
     reopened exactly, and a small "recent sheets" memory. All native APIs;
     nothing leaves the browser except what the user explicitly shares.
     --------------------------------------------------------------- */
  const PO = Object.assign({}, I18N.en.printOpts, (I18N[LANG] && I18N[LANG].printOpts) || {});
  /* The print verbs each locale's own page labels actually open with, longest
     first so "Imprimir el" is tried before "Imprimir". Harvested from the
     printables pages in that language (the survey behind the 2026-09-15
     change), never guessed: only a leading verb is swapped, so German -- which
     puts "drucken" last ("Arbeitsblatt drucken") -- deliberately has none and
     those labels are left for the i18n table to set outright. */
  const PRINT_VERBS = {
    en: ["Print"], fr: ["Imprimer"], es: ["Imprimir"], pt: ["Imprimir"],
    it: ["Stampa"], pl: ["Wydrukuj", "Drukuj"], id: ["Cetak"], de: []
  };
  const RECENT_KEY = "utg_printables_recent";
  /* ONE roster for the whole pillar, not one per URL. It was keyed on
     location.pathname, so a class typed on /printables/name-tracing/ was
     invisible on the puzzle, sight-word, coloring and dot-to-dot tools that
     mount the same control -- a teacher retyped thirty names to move between
     two sheets of the same class. The per-path key is read once as a
     migration source, exactly as saved-items.js absorbed utg_saved_styles and
     printPrefs absorbed "auto", so nobody's typed roster disappears. */
  const ROSTER_KEY = "utg_printables_roster";
  const ROSTER_KEY_LEGACY = "utg_printables_roster:" + window.location.pathname;
  function readRoster() {
    try {
      const shared = localStorage.getItem(ROSTER_KEY);
      if (shared) return shared;
      const legacy = localStorage.getItem(ROSTER_KEY_LEGACY);
      if (legacy) { localStorage.setItem(ROSTER_KEY, legacy); return legacy; }
    } catch (err) { /* private mode: no roster memory, which is not an error */ }
    return null;
  }
  function writeRoster(value) {
    try {
      if (value && value.trim()) localStorage.setItem(ROSTER_KEY, value);
      else localStorage.removeItem(ROSTER_KEY);
      // The legacy key is not kept in step: it exists only to be read once.
      localStorage.removeItem(ROSTER_KEY_LEGACY);
    } catch (err) { /* optional */ }
  }
  const RECENT_MAX = 6;
  /* Sheet setup (paper, orientation, margins, ink saver, render scale) is
     owned by js/printables/printPrefs.js, so this engine, monogramEngine and
     crossStitchEngine cannot disagree about what page a sheet is written on.
     The names below are the local aliases the rest of this file already uses;
     `printPrefs` is a REFERENCE to the shared object, never a copy, so a panel
     edit is visible to every reader of it immediately. */
  const PP = window.UltraTextGen && window.UltraTextGen.printPrefs;
  if (!PP) {
    // Never fail silently: without the module every sheet would quietly fall
    // back to one hardcoded page size, which looks exactly like a working
    // panel whose controls do nothing.
    console.warn("[printables] printPrefs.js has not loaded; sheet setup is unavailable. Check that /js/printables/printPrefs.js is tagged before this engine.");
  }
  const PAPERS = PP ? PP.PAPERS : { letter: { css: "letter", w: 7.5, h: 10.0 } };
  const MARGINS = PP ? PP.MARGINS : { normal: "0.5in", narrow: "0.25in" };
  const printPrefs = PP ? PP.values : { paper: "letter", orient: "portrait", margin: "normal", ink: "normal", quality: "normal" };
  const paperFull = PP ? PP.paperFull : (() => ({ w: 8.5, h: 11.0 }));
  const savePrintPrefs = PP ? PP.save : (() => {});
  const renderScale = PP ? PP.scale : (() => 2);
  // The @page rule is injected only for the duration of a print job, so a
  // visitor's saved preference never leaks into another page's print CSS.
  const pageStyleCss = PP ? PP.pageStyleCss : (() => "@page { margin: 0.5in; }");
  function applyPageStyle() {
    removePageStyle();
    const st = document.createElement("style");
    st.id = "pt-page-style";
    st.textContent = pageStyleCss();
    document.head.appendChild(st);
  }
  function removePageStyle() {
    const old = document.getElementById("pt-page-style");
    if (old) old.remove();
  }
  // Usable page area for the tiled/bulletin print, following the chosen
  // paper and orientation (landscape swaps the two).
  function printArea() {
    // PAPERS.auto was removed with the "Automatic" option, so this fallback
    // resolved to undefined and threw on the next property read instead of
    // degrading. letter is the module's own documented default.
    const paper = PAPERS[printPrefs.paper] || PAPERS.letter;
    const a = printPrefs.orient === "landscape" ? { w: paper.h, h: paper.w } : { w: paper.w, h: paper.h };
    // Every printed page carries a credit footer now (attachCredit), so the
    // tile budget has to leave room for it. Without this the "Small" (2in)
    // alphabet run fits four rows by the old arithmetic, 8.75in of tiles plus
    // 1.6in of title and footer, which runs past a Letter page and costs a
    // whole extra sheet. The width is untouched: PAPERS keeps its deliberately
    // conservative figures there, which is what makes "auto" safe on Letter
    // and A4 at once.
    return { w: a.w, h: Math.max(1.5, a.h - PRINT_CREDIT_BAND_IN) };
  }

  // "ultratextgen.com/printables/name-tracing": the credit every printed or
  // exported sheet carries, so a sheet that travels (a class set going home,
  // a PNG forwarded to a colleague) points back at the exact tool.
  function siteCredit() {
    if (window.UltraTextGen && window.UltraTextGen.printableCredit) return window.UltraTextGen.printableCredit();
    const path = String(window.location.pathname || "/").replace(/index\.html$/, "").replace(/\/$/, "");
    return "ultratextgen.com" + (path || "");
  }
  /* The same page as a real URL, for the QR code and the PDF link annotation.
     siteCredit() strips the trailing slash for display; putting it back keeps
     a scan off a redirect hop.

     Deliberately the PAGE path and not presetUrl(), even though a scan that
     reopened this exact sheet would be the nicer trick. A preset carrying a
     class roster runs to 200+ characters, which is a version-9 symbol: 53
     modules plus its quiet zone across the same 0.95in is 0.39mm per module,
     under what a phone can read. A QR that works every time beats one that
     works until someone types a long name. The Share row is where the preset
     link lives, and the text credit beside the QR matches what it encodes. */
  function creditUrl() { return "https://" + siteCredit() + "/"; }

  /* How much of the chosen sheet a printed figure may occupy, in inches.
     Everything in the Print settings panel feeds this: paper, orientation and
     margin.

     Before it existed, the single-letter and book prints hardcoded 8.4in and
     8.2in figure heights regardless of what the visitor had chosen, so the
     panel changed the @page rule and nothing else. Choosing Landscape then
     asked for a figure taller than the page: measured across all eight
     paper/orientation/margin combinations, every portrait one printed a
     letter on 1 sheet and every landscape one on 3. That is the "Print this
     letter renders 3 pages" report, and it is the same defect as "the print
     settings do not change anything" seen from the other end.

     printAlphabetTiled already derived its grid from printArea(); this is
     that idea applied to the two layouts that did not. */
  const PRINT_PADDING_IN = 0.34;   // #pt-print-root's 1rem top+bottom under @media print
  /* Two heights, because the layouts need different things and only one of
     them can be exact.

     --pt-page-h is the real printable height and involves no guessing: paper,
     minus the chosen margins, minus the print root's own padding. The single
     and book prints are flex columns that take that height and let the title
     and the credit footer claim their natural space, so the figure gets
     whatever is left. Nothing there has to know how tall a heading is.

     --pt-body-h is for the layouts that set a min-height instead (the name
     and puzzle sheets), which cannot self-size that way. It subtracts a
     deliberately GENEROUS chrome allowance. Measured at a 7.5in page width:
     a 0.4in title, a 0.95in credit band (the QR sets that height) and its
     0.25in margin, so 1.6in on a layout carrying all three; 1.9in leaves a
     sheet slightly short of the bottom. That direction is the safe one -- a
     min-height that overshoots spills onto a second page, one that
     undershoots just does not stretch to the edge.

     The first attempt at this did the arithmetic for every layout and was
     wrong by 0.11in, which printed a letter on 2 pages instead of 1. Measured
     after the change, the flex wrap lands on exactly --pt-page-h (9.66in on
     Letter portrait) with the figure absorbing 8.14in of it, which is the
     point: nothing had to know the title is 0.4in tall. Measure, or let the
     layout measure itself; do not estimate where you can avoid it. */
  const PRINT_CHROME_IN = 1.9;
  // What the credit footer costs a layout that budgets its own page (the
  // tiled alphabet run), measured: a 0.95in QR plus its 0.25in margin.
  const PRINT_CREDIT_BAND_IN = 1.2;
  // .pt-glyph-print shipped 2.8in type inside an 8.2in box; keeping the ratio
  // means a cursive sheet scales with the paper like an outline one does.
  const GLYPH_RATIO = 0.34;
  function sheetMetrics() {
    const full = paperFull();
    const marginIn = parseFloat(MARGINS[printPrefs.margin] || MARGINS.normal) || 0.5;
    // Floor these rather than letting a tiny page produce a negative height:
    // a cramped sheet is recoverable, a broken one is not.
    const page = Math.max(2, full.h - 2 * marginIn - PRINT_PADDING_IN);
    const body = Math.max(1.4, page - PRINT_CHROME_IN);
    // Width is not published: every figure is width:100% with the SVG's own
    // preserveAspectRatio, so a landscape sheet letterboxes rather than
    // overflowing, and a property nothing reads is a property that goes stale.
    return { page: page, body: body };
  }
  // Published to the print CSS as custom properties, so one measurement
  // drives every print layout instead of each one carrying its own constant.
  function applySheetMetrics(node) {
    if (!node) return;
    const m = sheetMetrics();
    node.style.setProperty("--pt-page-h", m.page.toFixed(2) + "in");
    node.style.setProperty("--pt-body-h", m.body.toFixed(2) + "in");
    node.style.setProperty("--pt-glyph-size", (m.body * GLYPH_RATIO).toFixed(2) + "in");
  }

  /* The footer every printed sheet and PDF page now carries: the exact page
     this sheet came from, as text AND as a QR code.

     Printed paper has no other way back. The text credit alone is a URL a
     parent has to retype, and a PNG cannot carry a link at all — a QR is the
     only route back from an image or from a sheet that has been printed. Only
     the tiled alphabet print carried any credit before this; the
     single-letter and book prints named nothing at all. */
  function creditNode() {
    const wrap = document.createElement("div");
    wrap.className = "pt-credit";
    const qrNs = qrModule();
    const url = creditUrl();
    if (qrNs) {
      // A symbol too long to encode returns null rather than a broken one, so
      // an unusually long preset URL degrades to the text credit alone.
      const svg = qrNs.qrSvg(url, { px: 56, title: url });
      if (svg) { svg.setAttribute("class", "pt-credit-qr"); wrap.appendChild(svg); }
    }
    const a = document.createElement("a");
    a.className = "pt-credit-text";
    a.href = url;
    a.textContent = siteCredit();
    wrap.appendChild(a);
    return wrap;
  }

  // printablePdf.js's renderPages rasterises explicit page elements one
  // canvas each and DROPS everything outside them, so a footer appended to
  // the wrap would print from the browser dialog and silently vanish from the
  // PDF. Give each page unit its own; the wrap gets one only when there are
  // none. Same selector as that module's own PAGES, kept in step by name.
  const PT_PAGE_UNITS = ".pt-sheet-page, .bubble-print-book-page, .pt-tile-page, .pt-banner-page";

  /* One sheet is still a page, and it has to SAY so.

     renderPages() has two branches: explicit page units become one canvas
     each, and a body with none is measured as a flowed column and cut at
     page height. Every tool here wrapped its class set in .pt-sheet-page and
     its single sheet in nothing, so the single sheet took the flow branch,
     where attachCredit's ~92px credit block is part of the measured column.
     Measured on the coloring page maker: the sheet is 952px inside a 960px
     box, the credit takes it to 1068px, and 11.3% is past the 6% single-page
     tolerance -- so a PDF of one coloring page came out as two, the second
     carrying nothing but the credit. Same arithmetic on the dot-to-dot name
     sheet (1068px), the name worksheet (1053px) and the handwriting
     generator sheet (1114px); the name puzzle sheet escaped at 999px only
     because it is shorter than the tolerance, not because it differs. */
  function sheetPageNode(node) {
    const page = document.createElement("div");
    page.className = "pt-sheet-page";
    page.appendChild(node);
    return page;
  }
  function attachCredit(wrap) {
    const pages = $$(PT_PAGE_UNITS, wrap).filter((p) => !p.parentElement.closest(PT_PAGE_UNITS));
    if (pages.length) { pages.forEach((p) => p.appendChild(creditNode())); return pages; }
    wrap.appendChild(creditNode());
    return [];
  }

  function showToast(msg) {
    let t = document.getElementById("pt-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "pt-toast";
      t.className = "pt-toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("is-visible"), 4500);
  }

  // Export mode for the canvas builders: "download" (the Download PNG
  // buttons) or "share" (the Share as image button hands the same PNG to the
  // native share sheet). Set by the caller right before invoking a builder
  // and reset by exportCanvas, so every builder stays a one-liner.
  let exportMode = "download";
  let pdfMode = false;
  let pngMode = false;

  // Preset URL: the page's own inputs as query parameters, so "here is the
  // sheet I made" is a link that reopens the same sheet. The parameters are
  // read back by applyPresetInputs()/applyPresetState() on load. Nothing
  // typed here is ever sent to analytics (see header.js trackPrintable).
  function firstEl(list) { return list.filter(Boolean)[0] || null; }
  function primaryInput() { return firstEl([el.nameInput, el.genInput, el.designInput, el.bannerInput, el.puzzleInput]); }
  function primaryRoster() { return firstEl([el.nameRoster, el.genRoster, el.designRoster, el.puzzleRoster]); }
  function presetParams() {
    const p = {};
    const input = primaryInput();
    if (input && input.value.trim()) p.name = input.value.trim();
    const roster = primaryRoster();
    if (roster && roster.value.trim()) p.roster = rosterNames(roster).join("|");
    if (el.genSlider || el.genLevels) p.level = genLevel();
    const rows = firstEl([el.nameRows, el.genRows]);
    if (rows && rows.value) p.rows = rows.value;
    if (el.genCase && el.genCase.value && el.genCase.value !== "as-typed") p.case = el.genCase.value;
    if (typeof nameStyleKey !== "undefined" && nameStyleKey) p.style = nameStyleKey;
    if (typeof genScriptKey !== "undefined" && genScriptKey) p.script = genScriptKey;
    if (CHAR_STYLES && charStyleKey) p.cstyle = charStyleKey;
    if (nameCase !== "as-typed") p.ncase = nameCase;
    if (nUp > 1) p.nup = String(nUp);
    if (spacingKey !== "normal") p.sp = spacingKey;
    if (stencilOnFlag) p.st = "1";
    if (el.sizeControl && alphaSizeKey !== "full") p.size = alphaSizeKey;
    const heading = firstEl([el.designHeading, el.puzzleHeading]);
    if (heading && heading.value.trim()) p.heading = heading.value.trim();
    if (el.strip && activeChar && !CFG.initialChar) p.ch = activeChar;
    /* Paper travels, but only as a suggestion -- see the read side, which
       ignores it for a visitor who has chosen their own. The old guard tested
       for "auto", a value printPrefs.js removed, so it was dead and every
       shared link carried the sender's paper unconditionally. */
    p.paper = printPrefs.paper;
    if (printPrefs.orient !== "portrait") p.orient = printPrefs.orient;
    return p;
  }
  function presetUrl() {
    const params = new URLSearchParams();
    const p = presetParams();
    Object.keys(p).forEach((k) => { if (p[k] !== "" && p[k] != null) params.set(k, String(p[k])); });
    const qs = params.toString();
    return window.location.origin + window.location.pathname + (qs ? "?" + qs : "");
  }
  let presetQuery = null;
  try { presetQuery = new URLSearchParams(window.location.search); } catch (err) { presetQuery = null; }
  function presetGet(k) { return presetQuery ? presetQuery.get(k) : null; }
  // Phase 1 (before the sections initialise): fill the inputs.
  function applyPresetInputs() {
    if (!presetQuery) return;
    const name = presetGet("name") || presetGet("text") || presetGet("q");
    const input = primaryInput();
    if (name && input) input.value = String(name).slice(0, input.maxLength > 0 ? input.maxLength : 60);
    const roster = presetGet("roster");
    const rosterEl = primaryRoster();
    if (roster && rosterEl) {
      // ROSTER_CAP, not 40: a 41-name class lost its tail on the round trip
      // and nothing said so.
      rosterEl.value = String(roster).split("|").map((x) => x.trim()).filter(Boolean).slice(0, ROSTER_CAP).join("\n");
      const field = rosterEl.closest("details"); if (field) field.open = true;
    }
    const rows = presetGet("rows"); const rowsEl = firstEl([el.nameRows, el.genRows]);
    if (rows && rowsEl && /^[1-8]$/.test(rows)) rowsEl.value = rows;
    const cs = presetGet("case");
    if (cs && el.genCase && ["as-typed", "upper", "lower", "title"].indexOf(cs) !== -1) el.genCase.value = cs;
    const heading = presetGet("heading"); const headingEl = firstEl([el.designHeading, el.puzzleHeading]);
    if (heading && headingEl) headingEl.value = String(heading).slice(0, 60);
    /* A link's paper seeds a visitor who has never chosen, and never
       overrides one who has. Paper is a property of the recipient's printer,
       not of the sheet: an A4 teacher opening a US colleague's link was being
       handed a US Letter page box, silently, on a sheet they were about to
       print and cut. Orientation below is the sender's design decision and
       does travel. */
    const paper = presetGet("paper");
    if (paper && PAPERS[paper] && !(PP && PP.hasStored && PP.hasStored())) printPrefs.paper = paper;
    const orient = presetGet("orient"); if (orient === "landscape" || orient === "portrait") printPrefs.orient = orient;
    if (!roster && rosterEl && !rosterEl.value.trim()) {
      // Roster memory: a teacher's class list stays on the device between
      // visits (this device only, never sent anywhere).
      const remembered = readRoster(); if (remembered) rosterEl.value = remembered;
    }
  }
  // Phase 2 (after the sections initialise): apply state that has setters.
  function applyPresetState() {
    if (!presetQuery) return;
    const level = parseInt(presetGet("level"), 10);
    if (level && typeof setGenLevel === "function" && (el.genSlider || el.genLevels)) setGenLevel(level);
    const style = presetGet("style");
    if (style && typeof setNameStyle === "function" && typeof NAME_STYLES !== "undefined" && NAME_STYLES && NAME_STYLES.some((x) => x.key === style)) setNameStyle(style);
    const script = presetGet("script");
    if (script && typeof setGenScript === "function" && typeof SCRIPT_OPTIONS !== "undefined" && SCRIPT_OPTIONS && SCRIPT_OPTIONS.some((x) => x.key === script)) setGenScript(script);
    const ncase = presetGet("ncase");
    if (ncase === "upper" || ncase === "lower") {
      const chip = $("#pt-name-case [data-case=\"" + ncase + "\"]");
      if (chip) chip.click();
    }
    if (presetGet("st") === "1") {
      const stBox = $("#pt-stencil");
      if (stBox) { stBox.checked = true; stencilOnFlag = true; }
    }
    const sp = presetGet("sp");
    if (sp && SPACING_STEPS.some((x) => x.key === sp)) setSpacing(sp, { quiet: true });
    const nup = parseInt(presetGet("nup"), 10);
    if (NUP_CHOICES.indexOf(nup) !== -1) setNUp(nup);
    const cstyle = presetGet("cstyle");
    if (cstyle && typeof setCharStyle === "function" && CHAR_STYLES && CHAR_STYLES.some((x) => x.key === cstyle)) setCharStyle(cstyle);
    const size = presetGet("size");
    if (size && el.sizeControl && SIZE_PRESETS.some((x) => x.key === size)) {
      alphaSizeKey = size;
      $$(".pt-size-row .pt-choice", el.sizeControl).forEach((o, i) => {
        const on = SIZE_PRESETS[i] && SIZE_PRESETS[i].key === size;
        o.classList.toggle("is-active", on); o.setAttribute("aria-checked", on ? "true" : "false");
      });
    }
    const ch = presetGet("ch");
    if (ch && el.strip && CHARS.indexOf(String(ch).toUpperCase()) !== -1) selectChar(String(ch).toUpperCase(), { silent: true });
    [typeof renderNamePreview === "function" && el.nameInput ? renderNamePreview : null,
     typeof renderGenPreview === "function" && el.genInput ? renderGenPreview : null,
     typeof renderDesignPreview === "function" && el.designInput ? renderDesignPreview : null,
     typeof renderBannerPreview === "function" && el.bannerInput ? renderBannerPreview : null,
     typeof renderPuzzlePreview === "function" && el.puzzleInput ? renderPuzzlePreview : null
    ].forEach((fn) => { if (fn) { try { fn(); } catch (err) { /* section not mounted */ } } });
  }

  // "Recent sheets" memory (this device): the last few sheets made here,
  // as preset links, so a teacher who printed Emma's sheet last week finds
  // it without retyping. Stored alongside the site's other per-device keys.
  function readRecent() {
    try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (err) { return []; }
  }
  function rememberSheet(sheet) {
    const input = primaryInput();
    const label = (input && input.value.trim()) || (el.strip ? charLabel(activeChar) : "") || document.title.split("|")[0].trim();
    const href = presetUrl();
    const list = readRecent().filter((r) => r && r.href !== href);
    list.unshift({ href: href, label: label.slice(0, 40), page: (document.title || "").split("|")[0].trim().slice(0, 60), sheet: sheet || "sheet", t: Date.now() });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch (err) { /* optional */ }
    const roster = primaryRoster();
    if (roster) writeRoster(roster.value);
    renderRecent();
  }
  let recentMount = null;
  function renderRecent() {
    if (!recentMount) return;
    const list = readRecent();
    recentMount.innerHTML = "";
    if (!list.length) { recentMount.hidden = true; return; }
    recentMount.hidden = false;
    const title = document.createElement("span");
    title.className = "pt-recent-title";
    title.textContent = PO.recent;
    recentMount.appendChild(title);
    list.forEach((r) => {
      const a = document.createElement("a");
      a.className = "pt-recent-link";
      a.href = r.href;
      a.textContent = r.label;
      a.title = r.page || "";
      recentMount.appendChild(a);
    });
    const clear = document.createElement("button");
    clear.type = "button"; clear.className = "pt-recent-clear"; clear.textContent = PO.clear;
    clear.addEventListener("click", () => { try { localStorage.removeItem(RECENT_KEY); } catch (err) { /* optional */ } renderRecent(); });
    recentMount.appendChild(clear);
  }

  /* Saved sheets, from the shared store rather than this page's own recency
     key. Without it Save had nowhere to lead: the button remembered its own
     state and the record was invisible until the visitor happened back onto
     the same URL. This strip is cross-page and cross-surface by construction
     -- a sheet saved on the coloring hub shows up on block-letters -- which
     is the whole reason the record went into js/saved/saved-items.js instead
     of another private key.

     No copy was authored for it: the heading is T.saved and the button is
     PO.clear, both already translated in all eight locales. */
  let savedMount = null;
  function renderSaved() {
    if (!savedMount) return;
    const store = window.UltraTextGen && window.UltraTextGen.saved;
    const list = store ? store.all("printable") : [];
    savedMount.innerHTML = "";
    if (!list.length) { savedMount.hidden = true; return; }
    savedMount.hidden = false;
    const title = document.createElement("span");
    title.className = "pt-recent-title";
    title.textContent = T.saved;
    savedMount.appendChild(title);
    list.forEach((r) => {
      const a = document.createElement("a");
      a.className = "pt-recent-link";
      a.href = r.href || r.value;
      a.textContent = r.label || r.value;
      savedMount.appendChild(a);
    });
    const clear = document.createElement("button");
    clear.type = "button"; clear.className = "pt-recent-clear"; clear.textContent = PO.clear;
    clear.addEventListener("click", () => { if (store) store.clear("printable"); });
    savedMount.appendChild(clear);
  }
  // saved-items.js fires this on every write, including one made by another
  // surface on the same page, so the strip and the Save button cannot drift.
  document.addEventListener("utg:savedchange", () => { renderSaved(); });

  // The image a pin should carry: the SHEET preview, never the branded OG
  // card. scripts/wire-printables-previews.py writes the figure as
  // `.pt-sheet-preview`; the first two selectors here named classes that have
  // never existed in the tree, so every pin between 2026-09-12 and 09-13 fell
  // through to og:image -- a 1200x630 landscape brand card, on the one
  // platform that is vertical-first. `.pt-sheet-preview` is the class the
  // wiring script actually writes and is checked first; the older names stay
  // as a fallback in case a page is wired by hand.
  function previewImageUrl() {
    const img = $(".pt-sheet-preview img") || $("img.pt-preview-img") || $(".pt-preview-figure img");
    if (img && img.src) return img.src;
    const og = $('meta[property="og:image"]');
    return og ? og.getAttribute("content") : "";
  }
  // The page's primary PNG builder, reused by "Share as image": whichever
  // section this page mounts decides what the sheet is.
  function primaryPngExport() {
    if (el.namePng && typeof wordPNG === "function") { el.namePng.click(); return true; }
    if (el.genPng) { el.genPng.click(); return true; }
    if (el.designPng) { el.designPng.click(); return true; }
    if (el.bannerPng) { el.bannerPng.click(); return true; }
    if (el.puzzlePng) { el.puzzlePng.click(); return true; }
    if (el.panel && typeof letterPNG === "function") { letterPNG(activeChar); return true; }
    return false;
  }
  function makeBtn(cls, text, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = cls; b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }
  // Mount the print-settings panel, the share row and the recent-sheets
  // strip once per page, above the first print action the page carries (or
  // into an explicit #pt-print-options mount).
  function buildPrintOptions() {
    const explicit = $("#pt-print-options");
    const firstAction = firstEl([el.alphaPrint, el.practicePrint, el.namePrint, el.genPrint, el.designPrint, el.bannerPrint, el.puzzlePrint]);
    const anchor = explicit || (firstAction ? (firstAction.closest(".bubble-actions, .pt-actions, .pt-preview-actions") || firstAction) : (el.panel || null));
    if (!anchor) return;
    if (document.getElementById("pt-print-settings")) return;
    const wrap = document.createElement("div");
    wrap.className = "pt-print-tools";
    wrap.id = "pt-print-settings";

    /* The panel itself is built by printPrefs.js so the two standalone tools
       (monogram, cross-stitch) get the identical control set instead of no
       panel at all. Labels stay this engine's own strings -- nothing is
       translated at the module boundary. Every edit repaints the preview:
       without that the panel is a set of controls with no visible
       consequence, which is the report it was rebuilt for on 2026-09-13. */
    if (PP) wrap.appendChild(PP.buildPanel({ labels: PO, onChange: paintPaperPreview }));

    if (explicit) explicit.appendChild(wrap);
    else anchor.parentNode.insertBefore(wrap, anchor);

    /* Share sits AFTER the sheet, not before it (audit 2026-09-13, question d).
       Print settings is a pre-print decision and stays above; sharing is a
       post-completion act, and it shipped 2026-09-12 above the sheet -- four
       full-width buttons asking a visitor to endorse something they had not
       seen yet, each of them visually heavier than the "Print this letter"
       button below. presetUrl() also serialises the generator's state, so on
       a hub before a letter is picked, or a name tool before a name is typed,
       the link being offered is the emptiest it will ever be. */
    const shareWrap = document.createElement("div");
    shareWrap.className = "pt-share-tools";
    shareWrap.id = "pt-share-tools";

    // The share row is share-core's (js/share/share-core.js buildShareRow),
    // the same builder the monogram and cross-stitch engines use, so the
    // three surfaces cannot drift. Labels are this engine's own strings.
    const UTGns = window.UltraTextGen;
    if (UTGns && UTGns.buildShareRow) {
      shareWrap.appendChild(UTGns.buildShareRow({
        className: "pt-share-row",
        url: presetUrl,
        surface: "printables",
        itemType: "printable",
        labels: { share: PO.share, shareImage: PO.shareImage, copyLink: PO.copyLink, linkCopied: PO.linkCopied, pinterest: PO.pinterest },
        // Only where the OS can actually take the file. Without that this
        // button downloads a PNG, which every printables sheet already offers
        // as "Download PNG" a few pixels above -- two labels, one action, and
        // no way for the visitor to tell which is which.
        onShareImage: ((primaryInput() || el.panel) && UTGns.canShareFiles && UTGns.canShareFiles())
          ? () => { exportMode = "share"; if (!primaryPngExport()) exportMode = "download"; }
          : null,
        pinMedia: previewImageUrl,
        onShared: () => rememberSheet("share")
      }));
    } else if (!(window.UltraTextGen && window.UltraTextGen.buildShareRow)) {
      // Never fail silently. This branch means js/share/share-core.js did not
      // execute before this engine did -- almost always a tag-order change --
      // and the visible symptom is simply no share row, which looks identical
      // to a page that never had one. Say so (2026-09-13).
      console.warn("[printables] share-core.js has not loaded; the share row is not rendered. Check that /js/share/share-core.js is tagged before this engine.");
    }

    savedMount = document.createElement("div");
    savedMount.className = "pt-recent pt-saved-strip";
    savedMount.hidden = true;
    shareWrap.appendChild(savedMount);
    renderSaved();

    recentMount = document.createElement("div");
    recentMount.className = "pt-recent";
    recentMount.hidden = true;
    shareWrap.appendChild(recentMount);
    renderRecent();

    // After the sheet, and after the spoke's batch block when it has one, so
    // the order on a page is always: choose -> see -> get -> share.
    const after = $(".pt-spoke-batch") || el.panel || anchor;
    if (after && after.parentNode) after.parentNode.insertBefore(shareWrap, after.nextSibling);
    else wrap.appendChild(shareWrap);
  }
  /* Every sheet action writes a PDF; the browser print dialog is the fallback
     only (owner decision 2026-09-15).

     Until now each section carried BOTH a "Print ..." button and a "Save as
     PDF" button that worked by clicking it -- two buttons, one outcome, and
     the print dialog's own "Save as PDF" destination as a third route to the
     same file. The print path itself is unchanged and still runs when
     pdfFromWrap() cannot write the file (a tainted canvas on Safari); what
     goes away is the UI that offered it as a separate, equal choice.

     The buttons are CONVERTED IN PLACE rather than rewritten in the pages:
     the label lives in 102 page files across 8 languages in ~55 spellings
     ("Print the worksheet", "Print the sheet", "Print worksheet" are all the
     same action in English alone), so relabelling from this file's own i18n
     table both removes the print wording and settles that drift. No page
     HTML changes, so no locale page is "touched" for the parity, translation
     or em-dash gates. */
  function convertPrintButtonsToPdf() {
    [el.alphaPrint, el.practicePrint, el.namePrint, el.genPrint, el.designPrint, el.bannerPrint, el.puzzlePrint].filter(Boolean).forEach((btn) => {
      if (btn.dataset.ptPdf) return;
      btn.dataset.ptPdf = "1";
      btn.textContent = PO.savePdf;
      btn.classList.add("bubble-btn-primary");
      // A stale "Save as PDF" sibling from an earlier build would now be a
      // duplicate of the button beside it.
      const sib = btn.nextElementSibling;
      if (sib && sib.classList && sib.classList.contains("pt-pdf-btn")) sib.remove();
    });
    /* The alphabet and practice sheets get the Download PNG their siblings
       already have. Injected here rather than added to 57 page files: the
       button is identical on every one of them, and a runtime injection keeps
       this out of the parity, locale-translation and em-dash gates exactly as
       the 2026-09-15 relabelling did. Multi-sheet actions are deliberately
       excluded below -- a 36-page A-Z book is not a PNG. */
    [[el.alphaPrint, "alphabet_sheet", "pt-alphabet-png"], [el.practicePrint, "practice_sheet", "pt-practice-png"]].forEach((pair) => {
      const btn = pair[0];
      if (!btn || btn.dataset.ptPng) return;
      btn.dataset.ptPng = "1";
      const png = document.createElement("button");
      png.type = "button";
      png.className = "bubble-btn";
      // The id every other section's PNG button carries in page HTML, so this
      // one is addressable by the same convention even though it is injected.
      if (!document.getElementById(pair[2])) png.id = pair[2];
      png.textContent = T.downloadPng;
      png.addEventListener("click", () => { pngMode = true; btn.click(); });
      btn.insertAdjacentElement("afterend", png);
    });
    // The multi-sheet actions keep their own object ("all 7 levels", "the
    // A-Z + 0-9 book") and swap only the verb, per the owner's rule that
    // "Print all 7 levels" reads "Save all 7 levels".
    [el.bookPrint, el.genLadder, el.designLadder].filter(Boolean).forEach((btn) => {
      if (btn.dataset.ptPdf) return;
      btn.dataset.ptPdf = "1";
      btn.textContent = saveVerbLabel(btn.textContent);
    });
  }
  /* Swap a print verb for this locale's own save verb, leaving the rest of
     the label alone. Both words come from this file's i18n table for the
     active locale -- nothing is translated here. Returns the label unchanged
     when the verb is not recognised, which is the safe direction: a label
     that still says "Print" is wrong but readable, an invented translation is
     neither. */
  function saveVerbLabel(label) {
    const text = String(label || "").trim();
    const verbs = PRINT_VERBS[LANG] || PRINT_VERBS.en;
    for (const verb of verbs) {
      const re = new RegExp("^" + verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      if (re.test(text)) return text.replace(re, T.save);
    }
    return text;
  }
  // Delegated on document in the CAPTURE phase so it runs before the click
  // handler the section wired on the button itself, whichever order the two
  // were registered in.
  document.addEventListener("click", (e) => {
    const t = e.target;
    const btn = t && t.closest ? t.closest("[data-pt-pdf]") : null;
    if (btn) pdfMode = true;
  }, true);
  // printable_generate: the visitor typed something (count only, never the
  // text). Debounced per input, throttled so a long session is one event
  // per half minute at most.
  function wireGenerateEvents() {
    let last = 0;
    [["name_worksheet", el.nameInput], ["generator_sheet", el.genInput], ["design", el.designInput], ["banner", el.bannerInput], ["puzzle", el.puzzleInput]].forEach((pair) => {
      const input = pair[1];
      if (!input) return;
      let timer = null;
      input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const now = Date.now();
          if (now - last < 30000) return;
          last = now;
          trackPrintableEvent("printable_generate", { printable_sheet: pair[0] });
        }, 1500);
      });
    });
    const roster = primaryRoster();
    if (roster) {
      let t2 = null;
      roster.addEventListener("input", () => { clearTimeout(t2); t2 = setTimeout(() => writeRoster(roster.value), 800); });
    }
  }

  function downloadCanvas(canvas, filename, sheet) {
    const mode = exportMode;
    exportMode = "download";
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (mode === "share") {
        shareBlob(blob, filename, sheet);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackPrintable("download_png", sheet);
      rememberSheet(sheet);
    }, "image/png");
  }

  // Share a rendered sheet as a PNG file through the native share sheet,
  // with the preset link riding along as text. share-core owns the act
  // (js/share/share-core.js shareImageBlob); a plain download is the fallback
  // if the module is somehow absent.
  async function shareBlob(blob, filename, sheet) {
    rememberSheet(sheet);
    const UTGns = window.UltraTextGen;
    if (UTGns && UTGns.shareImageBlob) {
      await UTGns.shareImageBlob(blob, { filename: filename, title: document.title, text: presetUrl(), surface: "printables", itemType: "printable" });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Small, low-contrast site credit near the bottom edge — the same
  // sheet-like-printable convention used elsewhere in this engine (print
  // titles, other PNG exports). Not drawn for RENDER === "glyph" (cursive/
  // calligraphy pages): those are typed-word art the visitor downloads to
  // use as-is, not a practice/coloring sheet, so they stay clean by design.
  /* The credit on an exported PNG: the page path as text, and the same URL as
     a QR code beside it.

     A PNG cannot carry a link — that is the whole reason the QR is here
     rather than only in the PDF. An image forwarded to a colleague, or
     printed and handed to a class, has no other route back to the tool than
     retyping what it says, and the QR removes that step for anyone holding a
     phone. Scaled off the canvas rather than fixed, because this same
     function signs a 1024px square letter and a 1600x520 word strip. */
  /* Height of the credit strip appended below a sheet that fills its own
     canvas edge to edge.

     drawCredit() puts the QR in the bottom-right CORNER, which is right for a
     single big glyph but lands on the furniture of a full sheet: on the
     coloring sheet the corner box (x 838-958, y 1238-1358) covers the end of
     the Date rule and two symbols of the bottom border row. So those sheets
     get a strip below them instead, which is also what the PRINTED page looks
     like -- attachCredit() appends its credit block beneath the sheet rather
     than inside it. 170 clears the 162 units drawCredit reserves (a 120 QR
     plus its 42 pad) with a little air above. */
  const PNG_CREDIT_BAND = 170;

  function drawCredit(ctx, w, h, light) {
    const url = creditUrl();
    const qrNs = qrModule();
    /* Floored at 120px, from the print case rather than from taste. A credit
       URL is a version-5 symbol: 37 modules plus an 8-module quiet zone is 45
       across, and a phone needs about 0.5mm per module. A 1024px sheet
       printed 8in wide therefore needs 45 * 0.0197in * 1024 / 8 = 113px of
       QR, so 120 leaves a little room. The 7% term only matters on a canvas
       larger than ~1700px, where it takes over from the floor. */
    const qrSize = Math.max(120, Math.round(Math.min(w, h) * 0.07));
    const pad = Math.round(qrSize * 0.35);
    let drewQr = false;
    if (qrNs) {
      drewQr = qrNs.drawQrOnCanvas(ctx, url, w - qrSize - pad, h - qrSize - pad, qrSize, {
        dark: light ? "#7d8494" : INK,
        light: "#ffffff"
      });
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.font = (light ? "18px " : "22px ") + FONT;
    ctx.fillStyle = light ? "#c9ced8" : "#aeb4c0";
    // The page path, not just the domain: a sheet that gets forwarded should
    // open the same tool (2026-09-10 share pass). It stays centred on the
    // canvas rather than moving to make room for the QR — the QR sits in the
    // corner, and re-centring the text on the remaining width would shift the
    // credit line on every existing export for no gain.
    ctx.fillText(siteCredit(), w / 2, h - 24);
    ctx.restore();
    return drewQr;
  }

  /* ---------------------------------------------------------------
     Canvas outlines: the one rule, so a PNG cannot drift from its sheet
     ---------------------------------------------------------------
     outlineSVG() draws every hollow letter at font-size 210 with
     stroke-width STROKE and paint-order="stroke". Two things follow from
     that, and a canvas export has to reproduce BOTH or it stops being the
     sheet it previews:

       1. The width is a RATIO of the type, not of the canvas. STROKE is
          quoted against font-size 210, so at canvas font size F the
          equivalent is F * STROKE / 210.
       2. paint-order="stroke" puts the stroke UNDER the fill, so only its
          outer half is visible and the counters stay open. Canvas has no
          paint-order: the same result is a stroke pass followed by a fill
          pass on top. This is exactly what
          scripts/generate-printables-previews.py's svg_text() already does
          for cairosvg, which is why the build-time preview PNGs were right
          while these were not.

     Shipped 2026-09-10 and found 2026-09-13: letterPNG used a fixed 4.5% of
     the CANVAS size against a 66% font size (6.8% of the type, 3.6x the
     alphabet-coloring sheet's 1.9%) and stroked OVER the fill, doubling the
     visible band again. Measured on letter A: 9.35% dark pixels against the
     preview's 1.83% on a larger glyph, about 10x the ink. The download was a
     solid black letter with a sliver of white in it -- not a coloring page.
     wordPNG (6%), the design sheet (STROKE as raw px) and the puzzle strip
     (6%) all carried a version of the same divergence.

     Every canvas outline in this file goes through these two functions. */
  const OUTLINE_SVG_FONT = 210;   // outlineSVG()'s font-size: the unit STROKE is quoted in
  // wordOutlineSVG() draws at font-size 150 with stroke-width 3 (2% of the
  // type). Restated in outlineSVG's 210 units so both go through one helper.
  const WORD_OUTLINE_STROKE = 3 / 150 * OUTLINE_SVG_FONT;   // 4.2

  function outlineLineWidth(fontSizePx, strokeUnits) {
    const units = strokeUnits == null ? STROKE : strokeUnits;
    return Math.max(1, fontSizePx * units / OUTLINE_SVG_FONT);
  }

  // paint-order="stroke" on a canvas: stroke first, fill over it. opts:
  // strokeWidth (in outlineSVG units) / strokeColor / fill / hollow (skip the
  // fill entirely -- a transparent sticker export keeps a real hole, so both
  // halves of the stroke read as ink and the outer silhouette still matches).
  function paintOutlineText(ctx, text, x, y, fontSizePx, opts) {
    const o = opts || {};
    ctx.lineJoin = "round";
    ctx.lineWidth = outlineLineWidth(fontSizePx, o.strokeWidth);
    ctx.strokeStyle = o.strokeColor || INK;
    ctx.strokeText(text, x, y);
    if (!o.hollow) {
      ctx.fillStyle = o.fill || "#ffffff";
      ctx.fillText(text, x, y);
    }
  }

  // Single character -> square PNG.
  function letterPNG(ch) {
    withFont(() => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      if (RENDER === "dots") {
        // Same generous ~9% margin as singleDotSVG so number labels near the
        // box edges (e.g. a wide M/W) don't clip against the canvas edge.
        const pad = Math.round(size * 0.0875);
        drawDotWordCanvas(ctx, dotCase(ch), dotPageState.level, { x: pad, y: pad, w: size - pad * 2, h: size - pad * 2 }, CFG.dotHint !== false, dotPageState.numbers);
        drawCredit(ctx, size, size);
        downloadCanvas(canvas, PNG_PREFIX + "-" + charSlug(ch) + "-" + dotPageState.level + (dotPageState.numbers ? "" : "-no-numbers") + ".png", "character");
        return;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const glyph = RENDER === "glyph"
        ? (/[0-9]/.test(ch) ? renderGlyph(ch.toUpperCase()) : (renderGlyph(ch.toUpperCase()) + renderGlyph(ch.toLowerCase())))
        : ch;
      const letterFs = Math.round(size * (RENDER === "glyph" ? 0.4 : 0.66));
      ctx.font = "700 " + letterFs + "px " + FONT;
      if (RENDER === "outline") {
        paintOutlineText(ctx, glyph, size / 2, size * 0.5, letterFs);
        /* The PNG is the one artifact that leaves the site, so a stencil
           downloaded as an image has to carry its bridges too. The ink box is
           read from measureText under the SAME textAlign/textBaseline the
           glyph was drawn with, so this needs no assumption about where
           "middle" puts the em box -- it maps ink box to ink box exactly as
           the SVG path does. */
        if (stencilOn()) {
          const geo = stencilMask(glyph);
          if (geo) {
            const mm = ctx.measureText(glyph);
            const dst = {
              x: size / 2 - mm.actualBoundingBoxLeft,
              y: size * 0.5 - mm.actualBoundingBoxAscent,
              w: mm.actualBoundingBoxLeft + mm.actualBoundingBoxRight,
              h: mm.actualBoundingBoxAscent + mm.actualBoundingBoxDescent
            };
            ctx.fillStyle = "#ffffff";
            stencilRects(geo, dst, outlineLineWidth(letterFs)).forEach((r) => {
              ctx.fillRect(r.x, r.y, r.w, r.h);
            });
          }
        }
      } else {
        ctx.fillStyle = INK;
        ctx.fillText(glyph, size / 2, size * 0.54);
      }
      drawCredit(ctx, size, size, RENDER === "glyph");
      downloadCanvas(canvas, PNG_PREFIX + "-" + charSlug(ch) + ".png", "character");
    });
  }

  /* PR-10, second half: carry the stroke-order overlay into the PNG.

     strokeDirectionData.js has shipped on 13 pages since 2026-09-05 and
     addWordStrokeOverlay() draws it into SVG only, so the numbered start dots
     and arrows were on the screen and on the printed sheet and absent from
     the PNG -- the one artifact that leaves the site. Every one of those 13
     pages is a name or word tool, so the WORD export is where this is
     reachable; the single-character export is not, because no page both
     renders one character and loads the stroke data.

     The overlay is rasterised from the engine's OWN addWordStrokeOverlay()
     rather than redrawn against Canvas primitives. A second copy of that
     geometry would drift from the first, which is the failure this file
     documents in four other places, and the SVG path data is the only source
     of the stroke shapes anyway. */
  function strokeOverlayImage(word, width, height, fontSize, spacingPx, anchorY) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("xmlns", SVGNS);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    addWordStrokeOverlay(svg, word, fontSize, spacingPx, anchorY, "central", width);
    if (!svg.querySelector("path")) return Promise.resolve(null);
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      // A failed overlay must not cost the visitor the sheet itself.
      img.onerror = () => { URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  }

  // A word / name -> wide PNG. opts (all optional — the name-style designer
  // path): font / spacing / fill / strokeColor / solid / transparent.
  function wordPNG(text, opts) {
    const o = opts || {};
    const fam = o.font || FONT;
    const spacingEm = (o.spacing != null ? o.spacing : LETTER_SPACING) + spacingBoost;
    withFont(() => {
      const width = 1600, height = 520, pad = 90;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!o.transparent) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const out = RENDER === "glyph" ? renderGlyph(text) : text;
      // Match the on-screen/print letter spacing (em fraction of the font size).
      const applySpacing = (px) => {
        if (spacingEm && "letterSpacing" in ctx) ctx.letterSpacing = px + "px";
      };
      let fontSize = 300;
      ctx.font = "700 " + fontSize + "px " + fam;
      applySpacing(fontSize * spacingEm);
      const measured = ctx.measureText(out).width;
      if (measured > width - pad * 2) {
        fontSize = Math.max(54, Math.floor(fontSize * (width - pad * 2) / measured));
        ctx.font = "700 " + fontSize + "px " + fam;
        applySpacing(fontSize * spacingEm);
      }
      if (o.solid) {
        ctx.fillStyle = o.fill || INK;
        ctx.fillText(out, width / 2, height * 0.52);
        if (o.strokeColor) {
          ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.025));
          ctx.strokeStyle = o.strokeColor;
          ctx.strokeText(out, width / 2, height * 0.52);
        }
      } else if (RENDER === "outline") {
        /* Hollow outline, matching wordOutlineSVG(). Its stroke-width default
           is 3 against font-size 150, i.e. 2% of the type, which
           WORD_OUTLINE_STROKE restates in outlineSVG's 210 units. A page that
           supplies its own weight (a nameStyles entry) already quotes it in
           those units, so it passes straight through; hardcoding the default
           here was why a styled name exported at one weight and previewed at
           another. On a transparent canvas a white interior would read as a
           white slab, so the fill is skipped and the interior stays a real
           hole. */
        paintOutlineText(ctx, out, width / 2, height * 0.52, fontSize, {
          strokeWidth: o.strokeWidth != null ? o.strokeWidth : WORD_OUTLINE_STROKE,
          strokeColor: o.strokeColor,
          hollow: !!o.transparent
        });
      } else {
        ctx.fillStyle = INK;
        ctx.fillText(out, width / 2, height * 0.52);
      }
      if (!o.transparent) drawCredit(ctx, width, height, RENDER === "glyph");
      const finish = () => downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(text) || "word") + ".png", "word");
      if (RENDER === "outline" && strokeOverlayOn()) {
        strokeOverlayImage(out, width, height, fontSize, spacingEm ? fontSize * spacingEm : 0, height * 0.52)
          .then((img) => { if (img) ctx.drawImage(img, 0, 0, width, height); finish(); })
          .catch(finish);
      } else {
        finish();
      }
    }, o.font ? String(o.font).split(",")[0].trim().replace(/^['"]|['"]$/g, "") : null);
  }

  /* ---------------------------------------------------------------
     Print surface
     --------------------------------------------------------------- */

  // js/printables/printablePdf.js is fetched the first time a PDF is asked
  // for, never on page load: the writer is only needed by the visitors who
  // click Save as PDF, and the sheet engines stay the size they are.
  let pdfModulePromise = null;
  function loadPdfModule() {
    if (window.UltraTextGen && window.UltraTextGen.pdf) return Promise.resolve(window.UltraTextGen.pdf);
    if (pdfModulePromise) return pdfModulePromise;
    pdfModulePromise = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = "/js/printables/printablePdf.js";
      sc.async = true;
      sc.onload = () => resolve(window.UltraTextGen && window.UltraTextGen.pdf);
      sc.onerror = () => { pdfModulePromise = null; reject(new Error("pdf module failed to load")); };
      document.head.appendChild(sc);
    });
    return pdfModulePromise;
  }
  function pdfFilename(sheet) {
    const input = primaryInput();
    const base = input && input.value.trim() ? slugify(input.value.trim()) : "";
    return PNG_PREFIX + "-" + (base || sheet || "sheet") + ".pdf";
  }
  // Rasterise the mounted print surface and write the PDF. Resolves true on
  // success; false means "use the print dialog instead" (module missing,
  // an unsupported browser, a tainted canvas on Safari).
  /* One canvas for the whole sheet, not one per page: a PNG of a worksheet
     is the worksheet, so pagination is deliberately defeated by handing the
     rasteriser a page height nothing can exceed. Returns false when the
     writer cannot run (a tainted canvas on Safari), and the caller then falls
     back to the same PDF hint every other export path uses -- rather than
     failing silently, which looks exactly like a button that does nothing. */
  /* Chromium and Safari both refuse a canvas dimension past 32,767px, and a
     refused canvas comes back unusable rather than throwing where you can see
     it. Held just under. */
  const MAX_CANVAS_PX = 32000;

  function stitchCanvases(pages) {
    const w = Math.max(...pages.map((c) => c.width));
    const h = pages.reduce((t, c) => t + c.height, 0);
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    let y = 0;
    pages.forEach((c) => { ctx.drawImage(c, 0, y); y += c.height; });
    return out;
  }

  async function pngFromWrap(wrap, sheet) {
    let P = null;
    try { P = await loadPdfModule(); } catch (err) { return false; }
    if (!P || !P.supported()) return false;
    const full = paperFull();
    const marginIn = PP ? PP.marginIn() : 0.5;
    const widthPx = Math.round((full.w - 2 * marginIn) * 96);
    document.body.classList.add("pt-pdf-rendering");
    document.body.classList.toggle("pt-ink-saver", printPrefs.ink === "saver");
    document.body.classList.toggle("pt-high-contrast", printPrefs.ink === "contrast");
    el.printRoot.style.width = widthPx + "px";
    let pages = null;
    try {
      /* The page height has to be the real content height, measured INSIDE
         the rendering state -- the print surface is display:none outside it
         and every rectangle reads zero. It cannot simply be a large number:
         renderPages allocates a canvas pageHeightPx * scale tall in every
         branch, so asking for 100000 asked Chromium for a 200,000px canvas,
         which it refuses. That failed silently and returned no pages, which
         is indistinguishable from a button that does nothing.
         For a sheet built from explicit page units (the tiled alphabet) the
         tallest unit is the page height; for ordinary flow content it is the
         whole wrap, which yields exactly one canvas. */
      const units = wrap.querySelectorAll(PT_PAGE_UNITS);
      let contentH = 0;
      if (units.length) units.forEach((u) => { contentH = Math.max(contentH, Math.ceil(u.getBoundingClientRect().height)); });
      else contentH = Math.ceil(wrap.getBoundingClientRect().height);
      const maxH = Math.floor(MAX_CANVAS_PX / renderScale());
      const pageHeightPx = Math.max(200, Math.min(contentH, maxH));
      pages = await P.renderPages(wrap, { widthPx: widthPx, pageHeightPx: pageHeightPx, scale: renderScale() });
    } catch (err) {
      pages = null;
    } finally {
      document.body.classList.remove("pt-pdf-rendering");
      document.body.classList.remove("pt-ink-saver");
      document.body.classList.remove("pt-high-contrast");
      el.printRoot.style.width = "";
    }
    if (!pages || !pages.length) return false;
    /* The tiled alphabet ("bulletin board" sizes) renders explicit .pt-tile-page
       units, so it comes back as several canvases however tall a page we ask
       for. Taking pages[0] would hand the visitor a PNG missing most of its
       letters and say nothing, so the pages are stitched into one tall image
       instead -- which is what a PNG of a multi-page sheet is. */
    const stitchedH = pages.reduce((t, c) => t + c.height, 0);
    if (pages.length > 1 && stitchedH > MAX_CANVAS_PX) return false;
    const canvas = pages.length === 1 ? pages[0] : stitchCanvases(pages);
    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = PNG_PREFIX + "-" + sheet.replace(/_/g, "-") + ".png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        trackPrintable("download_png", sheet);
        rememberSheet(sheet);
        resolve();
      }, "image/png");
    });
    return true;
  }

  async function pdfFromWrap(wrap, sheet) {
    let P = null;
    try { P = await loadPdfModule(); } catch (err) { return false; }
    if (!P || !P.supported()) return false;
    // The PDF knows its exact sheet, so it lays out on the real page box
    // (paper minus the chosen margin), not the conservative "auto" area the
    // tile layout budgets for unknown paper. That is what the print dialog
    // gives the same sheet, so the file and the printout paginate alike.
    const full = paperFull();
    const marginIn = parseFloat(MARGINS[printPrefs.margin] || MARGINS.normal) || 0.5;
    const area = { w: full.w - 2 * marginIn, h: full.h - 2 * marginIn };
    const widthPx = Math.round(area.w * 96);
    const pageHPx = Math.round(area.h * 96);
    document.body.classList.add("pt-pdf-rendering");
    document.body.classList.toggle("pt-ink-saver", printPrefs.ink === "saver");
    document.body.classList.toggle("pt-high-contrast", printPrefs.ink === "contrast");
    el.printRoot.style.width = widthPx + "px";
    let pages = null;
    let links = [];
    try {
      pages = await P.renderPages(wrap, { widthPx: widthPx, pageHeightPx: pageHPx, scale: renderScale() });
      // Measure the credit blocks HERE, inside the rendering state: the print
      // surface is display:none the moment pt-pdf-rendering comes off, and
      // every rectangle then reads zero. The rects are computed by the PDF
      // module's own rectOnCanvas, against the placement it recorded while
      // rasterising — the alternative is reimplementing its page-cut logic
      // out here, which is the drift this file keeps paying for elsewhere.
      if (pages && P.rectOnCanvas) {
        const credits = $$(".pt-credit", wrap);
        pages.forEach((canvas, i) => {
          credits.forEach((credit) => {
            const rect = P.rectOnCanvas(canvas, credit);
            if (rect) links.push({ page: i, rect: rect, url: creditUrl() });
          });
        });
      }
    } catch (err) {
      pages = null;
    } finally {
      document.body.classList.remove("pt-pdf-rendering");
      document.body.classList.remove("pt-ink-saver");
      document.body.classList.remove("pt-high-contrast");
      el.printRoot.style.width = "";
    }
    if (!pages || !pages.length) return false;
    try {
      /* A multi-page PDF gets an outline, derived from the page units' own
         headings rather than passed in by each caller: renderPages records
         which element produced each canvas, so the 36-page A-Z book names its
         letters and the level ladders name their levels without any of them
         having to know about bookmarks. A single-page file gets none -- an
         outline with one entry is clutter. */
      const marks = [];
      if (pages.length > 1) {
        pages.forEach((c, i) => {
          const src = c.ptPlacement && c.ptPlacement.mode === "explicit" && c.ptPlacement.el;
          if (!src) return;
          /* A flashcard page carries several headings, so the bookmark names
             all of them: the first in full, then each further card's last
             word, giving "Dot-to-dot letter A · B" rather than a list of
             four near-identical sentences -- or, worse, only the first card,
             which makes half the book unreachable from the outline. */
          const hs = [...src.querySelectorAll(".bubble-print-title, .pt-sheet-title, h2, h3")]
            .map((h) => h.textContent.trim()).filter(Boolean);
          if (!hs.length) return;
          const rest = hs.slice(1).map((t) => t.split(/\s+/).pop());
          marks.push({ page: i, title: rest.length ? hs[0] + " \u00b7 " + rest.join(" \u00b7 ") : hs[0] });
        });
      }
      const blob = await P.fromCanvases(pages, {
        paperIn: full,
        marginIn: { x: marginIn, y: marginIn },
        title: document.title,
        links: links,
        bookmarks: marks
      });
      P.download(blob, pdfFilename(sheet));
    } catch (err) {
      return false;
    }
    trackPrintable("download_pdf", sheet);
    trackPrintableEvent("printable_output", { printable_action: "pdf_saved", printable_sheet: sheet || "sheet", printable_pages: pages.length });
    return true;
  }

  // Every rendered copy of the PDF fallback hint, so the reveal reaches the
  // one on screen whichever section mounted it.
  const pdfHints = [];
  let pdfFellBack = false;
  function makePdfHint() {
    const p = document.createElement("p");
    p.className = "pt-pdf-hint";
    p.textContent = T.pdfHint;
    p.hidden = !pdfFellBack;
    pdfHints.push(p);
    return p;
  }
  function markPdfFallback() {
    pdfFellBack = true;
    pdfHints.forEach((p) => { p.hidden = false; });
  }

  function printWrap(titleText, bodyNode, sheet) {
    /* The PNG button works by re-clicking the section's own PDF button, and
       that button carries [data-pt-pdf], whose capture-phase handler sets
       pdfMode on the way through. So both flags are set on a PNG click and
       the precedence is stated here rather than left to branch order. */
    const wantPng = pngMode;
    const wantPdf = pdfMode && !wantPng;
    pdfMode = false;
    pngMode = false;
    /* Only a real print attempt counts as "print". Until 2026-09-15 this line
       sat above the pdfMode read and fired for PDF clicks too -- the PDF
       button works by invoking this same path -- so `print` counted prints
       plus every Save as PDF, which is the exact split register #111 exists
       to read. `download_pdf` (pdfFromWrap) and the dialog outcomes carry the
       PDF side. Now that the UI offers no print button, a `print` event means
       the PDF writer handed off to the dialog: a fallback rate, which is the
       number worth watching. */
    if (!wantPdf && !wantPng) trackPrintable("print", sheet);
    rememberSheet(sheet);
    if (!el.printRoot) { applyPageStyle(); window.print(); removePageStyle(); return; }
    el.printRoot.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";
    // The one-figure sheets fill the page by flexing rather than by a
    // computed figure height. Marked here because CSS cannot ask "does this
    // wrap contain a single-character print".
    if (sheet === "character") wrap.classList.add("pt-fill-page");
    wrap.appendChild(bodyNode);
    if (titleText) {
      const h = document.createElement("h2");
      h.className = "bubble-print-title";
      h.textContent = titleText;
      /* renderPages rasterises explicit page units and drops everything
         outside them, so on a job that is exactly one page the title has to
         live inside the unit or it prints from the dialog and is missing
         from the PDF. Scoped to the single-unit case on purpose: a multi-page
         job's title placement is unchanged, so no existing PDF moves. */
      const units = $$(PT_PAGE_UNITS, wrap).filter((u) => !u.parentElement.closest(PT_PAGE_UNITS));
      if (units.length === 1) units[0].insertBefore(h, units[0].firstChild);
      else wrap.insertBefore(h, wrap.firstChild);
    }
    // Size the sheet to the paper the visitor chose, then sign it. Both have
    // to happen before anything measures or rasterises the surface.
    applySheetMetrics(el.printRoot);
    attachCredit(wrap);
    el.printRoot.appendChild(wrap);

    /* Download PNG for the sheets that have no canvas builder of their own
       (the A-Z alphabet sheet and the practice sheet). Every other section
       rasterises a word or a letter it drew itself; these two only ever
       existed as DOM handed to printWrap, which is why they shipped as the
       only two jobs on the site offering one output where their siblings
       offer two. The rasteriser that writes the PDF turns the same DOM into
       a canvas, so the PNG comes from it rather than from a second drawing
       path that could drift from the printed sheet. */
    if (wantPng) {
      pngFromWrap(wrap, sheet).then((ok) => {
        el.printRoot.innerHTML = "";
        if (!ok) { markPdfFallback(); showToast(PO.pdfToast); }
      });
      return;
    }

    // Save as PDF writes the file itself (printablePdf.js); the browser's
    // print dialog is the fallback, with the destination named in a toast.
    if (wantPdf) {
      pdfFromWrap(wrap, sheet).then((ok) => {
        if (ok) { el.printRoot.innerHTML = ""; return; }
        markPdfFallback();
        showToast(PO.pdfToast);
        openPrintDialog(sheet, true);
      });
      return;
    }
    openPrintDialog(sheet, false);
  }

  /* Everything the printed page must not carry, hidden inline at the same
     priority the thing hiding from us uses.

     style.css's `body.is-printing > *:not(#pt-print-root)` rule covers only
     DIRECT children of <body>, and a stylesheet `!important` LOSES to an
     inline `!important` -- which is how a bottom-anchored ad unit styles
     itself. Measured in Chromium: an in-content ad is hidden correctly, while
     a body child carrying inline `display:block !important` renders at
     1280x90 and a node appended to <html> at 1280x60, both landing in the
     printed sheet. CSS cannot win that cascade, so the hide is inline here
     and unwound when the dialog closes. */
  let printHidden = [];
  function hideEverythingButPrintRoot() {
    printHidden = [];
    const keep = el.printRoot;
    const hide = (node) => {
      if (!node || node === keep || node.contains && keep && node.contains(keep)) return;
      const tag = node.tagName;
      if (tag === "HEAD" || tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" || tag === "TITLE" || tag === "META") return;
      printHidden.push([node, node.style.getPropertyValue("display"), node.style.getPropertyPriority("display")]);
      node.style.setProperty("display", "none", "important");
    };
    Array.prototype.forEach.call(document.body.children, hide);
    Array.prototype.forEach.call(document.documentElement.children, hide);
  }
  function restoreAfterPrint() {
    printHidden.forEach((row) => {
      if (row[1]) row[0].style.setProperty("display", row[1], row[2]);
      else row[0].style.removeProperty("display");
    });
    printHidden = [];
  }
  function openPrintDialog(sheet, wantPdf) {
    applyPageStyle();
    document.body.classList.add("is-printing");
    hideEverythingButPrintRoot();
    document.body.classList.toggle("pt-ink-saver", printPrefs.ink === "saver");
    document.body.classList.toggle("pt-high-contrast", printPrefs.ink === "contrast");

    // Tear the print surface down when the dialog closes, not when
    // window.print() returns: on desktop the two coincide, on iOS/Android
    // print() can return before the preview is composed, and tearing down
    // synchronously there printed the whole page. afterprint is the primary
    // signal; the user coming back to the page is the fallback; a long timer
    // is the last resort so the page can never stay hidden.
    const started = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("afterprint", finish);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      document.body.classList.remove("is-printing");
      document.body.classList.remove("pt-ink-saver");
      document.body.classList.remove("pt-high-contrast");
      restoreAfterPrint();
      removePageStyle();
      el.printRoot.innerHTML = "";
      trackPrintableEvent("printable_output", { printable_action: wantPdf ? "pdf_dialog_closed" : "print_dialog_closed", printable_sheet: sheet || "sheet", printable_dialog_ms: Date.now() - started });
    };
    const onVisible = () => { if (document.visibilityState !== "hidden") setTimeout(finish, 300); };
    window.addEventListener("afterprint", finish);
    const t0 = Date.now();
    window.print();
    // Desktop browsers block in print(); if we are back within a tick and
    // afterprint has not fired, the dialog is already closed.
    if (Date.now() - t0 > 250) { setTimeout(finish, 50); return; }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    setTimeout(finish, 60000);
  }

  /* ---------------------------------------------------------------
     Section: detail panel
     --------------------------------------------------------------- */

  let activeChar = "A";

  /* Switch the letterform the single-character surface draws in. Reassigns
     the shared FONT / STROKE / LETTER_SPACING, so the detail panel, the
     printable alphabet sheet, the tiled batch and every PNG repaint in the
     new face without any of them knowing this function exists. Mirrors
     setGenScript() exactly; the chips are page-authored inside
     #pt-char-styles so they stay crawlable and translated, same as the
     handwriting script picker and the name-style designer. */
  function activeCharStyle() {
    if (!CHAR_STYLES) return null;
    return CHAR_STYLES.find((s) => s.key === charStyleKey) || CHAR_STYLES[0];
  }

  function setCharStyle(key, opts) {
    if (!CHAR_STYLES) return;
    const style = CHAR_STYLES.find((s) => s.key === key) || CHAR_STYLES[0];
    charStyleKey = style.key;
    if (style.font) FONT = style.font;
    if (style.strokeWidth != null) STROKE = style.strokeWidth;
    if (style.letterSpacing != null) LETTER_SPACING = style.letterSpacing;
    CFG.skew = style.skew;
    if (el.charStyles) {
      $$(".pt-char-style-opt", el.charStyles).forEach((b) => {
        const on = b.dataset.style === charStyleKey;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    // The alphabet sheet is built once at init and cached in the DOM, so it
    // has to be rebuilt rather than merely repainted.
    if (!(opts && opts.quiet)) {
      withFont(() => {
        paintAlphabetGrid();
        if (activeChar) selectChar(activeChar);
      });
    }
  }

  function selectChar(ch, opts) {
    activeChar = ch;
    $$(".pt-chip", el.strip).forEach((b) => {
      const on = b.dataset.char === ch;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (!el.panel) return;

    el.panel.innerHTML = "";
    const stage = document.createElement("div");
    stage.className = "bubble-stage";

    // Left — big figure + print + PNG.
    const figure = document.createElement("div");
    figure.className = "bubble-outline-card";
    figure.appendChild(paperPreview(ch));

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    // One primary action, and it writes a PDF. The print dialog is still the
    // fallback inside printWrap(); it is no longer offered as its own button
    // (owner decision 2026-09-15).
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "bubble-btn bubble-btn-primary pt-pdf-btn";
    printBtn.textContent = PO.savePdf;
    printBtn.addEventListener("click", () => {
      pdfMode = true;
      const holder = document.createElement("div");
      holder.className = "bubble-print-single";
      holder.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch) : outlineSVG(ch)));
      printWrap(cap(NOUN) + " " + charLabel(ch), holder, "character");
    });
    const pngBtn = document.createElement("button");
    pngBtn.type = "button";
    pngBtn.className = "bubble-btn";
    pngBtn.textContent = T.downloadPng;
    pngBtn.addEventListener("click", () => letterPNG(ch));
    /* Two actions, not four (user decision, 2026-09-13).

       The row shipped as Print this letter / Save as PDF / Download PNG /
       Save — four equal-weight pills, two of them labelled Save, meaning
       different things. The second Save was the weaker one: presetUrl() has
       nothing to encode on a per-letter spoke (CFG.initialChar is set, so no
       ?ch=), so it bookmarked the page the visitor was already looking at,
       and its only in-viewport feedback was the word changing — the saved
       strip that confirms it renders 303px further down the page. Measured,
       not assumed: it did write to the shared store.

       Save as PDF went with it, on the reasoning that a PDF was one step
       away through the print dialog's own Save as PDF destination, that the
       credit line on that sheet is a real <a> so the browser's own writer
       makes it clickable, and that the other printable families kept their
       own print buttons.

       Superseded 2026-09-15 (owner decision; see CLAUDE.md, "Print settings
       drive the printed sheet"). Every sheet action writes a PDF and the
       print dialog is the fallback only. So the pair that survives here is
       Save as PDF + Download PNG rather than Print + PNG, no printable
       family offers a print button any more, and the helper that added them
       to the other families no longer exists. The paragraph above is the
       record of what was decided on 09-13, not a description of this row. */
    actions.appendChild(printBtn);
    actions.appendChild(pngBtn);
    figure.appendChild(actions);

    // The PDF hint describes the FALLBACK, so it only appears once the
    // fallback is used. printablePdf.js (2026-09-10) writes the file directly
    // on browsers that support it, but this line shipped unconditionally, so
    // every coloring page rendered "Tip: Print -> Save as PDF downloads this
    // sheet" in eight languages directly under a one-click Save as PDF
    // button, describing the site's own working feature as a workaround.
    // markPdfFallback() reveals it the first time a PDF attempt has to hand
    // off to the print dialog.
    figure.appendChild(makePdfHint());

    // Right — copy-paste variants (glyph mode) and/or how-to steps.
    const detail = document.createElement("div");
    detail.className = "bubble-detail";

    const variants = (CFG.variantStyles || CFG.variantFamily) ? buildVariants(ch) : null;
    if (variants) {
      const title = document.createElement("h3");
      title.className = "bubble-detail-title";
      title.textContent = joinWords([T.copyPaste, VARIANT_NOUN, charLabel(ch)]);
      detail.appendChild(title);
      detail.appendChild(variants);
    }

    if (CFG.howto && CFG.howto.steps) {
      const how = document.createElement("div");
      how.className = "bubble-howto";
      const ht = document.createElement("h3");
      ht.className = "bubble-detail-title";
      ht.textContent = (CFG.howto.title || T.howToDraw).replace("{ch}", charLabel(ch));
      how.appendChild(ht);
      const ol = document.createElement("ol");
      ol.className = "bubble-howto-steps";
      CFG.howto.steps.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s.replace("{ch}", charLabel(ch));
        ol.appendChild(li);
      });
      how.appendChild(ol);
      if (CFG.howto.tip) {
        const tip = document.createElement("p");
        tip.className = "bubble-howto-tip";
        tip.textContent = CFG.howto.tip;
        how.appendChild(tip);
      }
      detail.appendChild(how);
    }

    // Static dot-to-dot pages carry the live practice ladder (difficulty +
    // numbers toggle) — the differentiator vs a fixed-PDF competitor page.
    if (RENDER === "dots") detail.appendChild(dotControlsNode());

    stage.appendChild(figure);
    // .bubble-stage is a two-column grid whose second track holds the detail
    // panel (copy-paste variants, how-to steps, the dot ladder). A page whose
    // config supplies none of those never appends it, and the 1fr track stayed
    // reserved: on alphabet-coloring the sheet was pinned to 320px inside an
    // 852px panel with 508px (60%) of dead space beside it. Seven families
    // rendered that way -- alphabet-coloring, coloring-page-maker,
    // cursive-alphabet, dot-to-dot-name, handwriting-worksheet-generator,
    // sight-word-tracing, name-puzzle-maker. Collapsing the grid when there is
    // nothing to put in the second column is the whole fix (audit 2026-09-13).
    const hasDetail = detail.childNodes.length > 0;
    if (hasDetail) stage.appendChild(detail);
    else stage.classList.add("is-solo");
    el.panel.appendChild(stage);

    if ((!opts || !opts.silent) && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + charSlug(ch));
    }
  }

  /* The saved-sheets strip stays; the Save button that fed it does not
     (2026-09-13). buildSaveButton() lived only in the per-character action
     row, and on a spoke it saved the page the visitor was already on — see
     that row's own note. renderSaved() is kept because the store is shared
     across the whole site (js/saved/saved-items.js): a visitor who saved
     sheets before this change still sees them, and deleting the strip would
     orphan their records rather than tidy anything. */

  function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

  function bigGlyphForPrint(ch) {
    const p = document.createElement("p");
    p.className = "pt-glyph-print";
    const u = renderGlyph(ch.toUpperCase());
    const l = renderGlyph(ch.toLowerCase());
    p.textContent = /[0-9]/.test(ch) ? u : (u + " " + l);
    return p;
  }

  function buildVariants(ch) {
    const list = document.createElement("div");
    list.className = "bubble-variants";
    const cases = /[0-9]/.test(ch) ? ["upper"] : ["upper", "lower"];
    let any = false;
    /* One character cannot show the difference between a style and its Spaced
       sibling, and a case-identical style renders its upper and lower cases
       the same. Both produced real, byte-identical duplicate cards: the
       graffiti page shipped 21 of which 14 were repeats. Deduplicating on the
       rendered value fixes it wherever it occurs rather than per page, and it
       cannot hide a genuine variant, because two cards that copy the same
       characters ARE the same card to the visitor. */
    const seen = new Set();
    familyStyles().forEach(({ name, style }) => {
      cases.forEach((kind) => {
        const src = kind === "upper" ? ch.toUpperCase() : ch.toLowerCase();
        const rendered = renderGlyph(src, name);
        if (!rendered || rendered === src) return;
        if (seen.has(rendered)) return;
        seen.add(rendered);
        any = true;
        const row = document.createElement("button");
        row.type = "button";
        row.className = "bubble-variant glyph-copy";
        row.dataset.text = rendered;
        // One label, read once: the aria-label used the raw registry key while
        // the visible chip stripped the "Ultra " prefix, so a screen reader
        // heard a different style name than the page showed.
        const label = name.replace(/^Ultra /, "");
        row.setAttribute("aria-label", joinWords([T.copy, label, VARIANT_NOUN, charLabel(src)]));
        const glyph = document.createElement("span");
        glyph.className = "bubble-variant-glyph";
        glyph.textContent = rendered;
        const meta = document.createElement("span");
        meta.className = "bubble-variant-name";
        meta.textContent = label + (kind === "upper" ? "" : T.lowerSuffix);
        const cta = document.createElement("span");
        cta.className = "bubble-variant-copy";
        cta.textContent = T.copy;
        row.appendChild(glyph); row.appendChild(meta); row.appendChild(cta);
        row.addEventListener("click", () => copyText(rendered, cta));
        list.appendChild(row);
      });
    });
    return any ? list : null;
  }

  /* ---------------------------------------------------------------
     Section: picker strip
     --------------------------------------------------------------- */

  function buildStrip() {
    if (!el.strip) return;
    const make = (ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-chip bubble-chip";
      b.dataset.char = ch;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-label", cap(NOUN) + " " + charLabel(ch));
      b.textContent = ch;
      b.addEventListener("click", () => selectChar(ch));
      return b;
    };
    const letterRow = document.createElement("div");
    letterRow.className = "bubble-strip-row";
    // Read from CHARS (not the fixed LETTERS constant) so a page that sets
    // CFG.chars — e.g. the 27-letter Spanish alphabet — gets every one of
    // its letters in the picker too. For every existing page CHARS's letter
    // portion is exactly LETTERS, so this filter reproduces the prior output
    // byte-for-byte; digits (alnum charset) still come from the row below.
    CHARS.filter((ch) => !/[0-9]/.test(ch)).forEach((ch) => letterRow.appendChild(make(ch)));
    el.strip.appendChild(letterRow);
    if (CFG.charset === "alnum") {
      const digitRow = document.createElement("div");
      digitRow.className = "bubble-strip-row bubble-strip-digits";
      DIGITS.forEach((ch) => digitRow.appendChild(make(ch)));
      el.strip.appendChild(digitRow);
    }
  }

  /* ---------------------------------------------------------------
     Section: printable alphabet grid (outline mode)
     --------------------------------------------------------------- */

  // "Print the alphabet" has two print layouts:
  //   - "sheet" (default): the original compact grid — the whole set on as
  //     few pages as possible, for a single-sheet reference/center activity.
  //   - "book"  (CFG.alphabetPrint === "book"): every character on its own
  //     full printed page, in order, so the print dialog's "Save as PDF"
  //     produces a ready-made alphabet workbook.
  // Book-mode pages print the book from the main #pt-alphabet-print button;
  // sheet-mode pages keep the sheet there and get an auto-added secondary
  // book button beside it. An optional #pt-book-print button anywhere else
  // on the page (e.g. a promo card) triggers the same book print.
  /* Which characters the A-Z book prints. The whole set is the default and
     the historical behaviour; the control below narrows it.

     This is the one thing a PDF makes newly possible that the print dialog
     never did well -- "just the vowels", "just the letters in my name" -- and
     the forum-evidenced ask behind it is a parent who wants five pages, not
     thirty-six. A print dialog's page range cannot do it, because the reader
     does not know which page carries which letter.

     Every VISIBLE string in the control is character data (A-Z, 0-9, a typed
     run of letters), so it needs no translation in any of the eight languages
     these pages ship in. The accessible name is T.letterWord, which is
     already translated in all of them. Nothing here is authored copy. */
  let bookRange = null;   // null = the whole set
  /* Cards per page. 1 is the book (the historical behaviour); 2 and 4 turn the
     same pages into flashcards, which is the forum-evidenced ask this reuses
     the book for rather than building a separate sheet type. The chips are
     numerals, so nothing about it needs translating, and the cut instruction
     is T.puzzleCut -- the sentence the name-puzzle sheet already ships in all
     eight languages, about cutting along the dashed lines to separate each
     letter piece, which is exactly what these are. */
  let bookPerPage = 1;

  function bookChars() {
    if (!bookRange) return CHARS;
    const want = new Set(bookRange);
    const picked = CHARS.filter((ch) => want.has(ch.toUpperCase()));
    // Never render an empty book: an unmatched filter falls back to the whole
    // set rather than producing a zero-page PDF, which reads as a broken button.
    return picked.length ? picked : CHARS;
  }

  /* Accept anything this page actually prints, not [A-Z0-9]: CFG.chars takes
     an arbitrary array, so a lowercase or symbol page is config rather than
     code, and a hardcoded class would silently reject every character such a
     page is about.

     Ranges ("A-E", "M-P") are parsed as well as plain runs ("ABC", "MIA"),
     which is what makes arbitrary letter GROUPS possible without a chip for
     each one. A chip needs a label, and "consonants" is a word this site has
     in no language -- a typed range needs none, works for any group a teacher
     actually wants, and the separator may be a hyphen or an en dash because
     both are what people type. Endpoints are resolved against CHARS order, so
     "A-E" means the first five characters THIS page prints rather than five
     codepoints it may not have. */
  function parseRange(text) {
    const order = CHARS.map((c) => c.toUpperCase());
    const printable = new Set(order);
    const raw = String(text || "").toUpperCase();
    const set = [];
    const add = (ch) => { if (printable.has(ch) && !set.includes(ch)) set.push(ch); };
    let i = 0;
    while (i < raw.length) {
      const ch = raw[i];
      const sep = raw[i + 1];
      const end = raw[i + 2];
      if (printable.has(ch) && (sep === "-" || sep === "\u2013") && end && printable.has(end)) {
        let a = order.indexOf(ch), b = order.indexOf(end);
        if (a > b) { const t = a; a = b; b = t; }
        for (let k = a; k <= b; k++) add(order[k]);
        i += 3;
        continue;
      }
      add(ch);
      i += 1;
    }
    return set.length ? set : null;
  }

  const BOOK_PRESETS = [
    { key: "all", label: "A\u2013Z 0\u20139", chars: null },
    { key: "az",  label: "A\u2013Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") },
    { key: "num", label: "0\u20139", chars: "0123456789".split("") },
    { key: "vow", label: "AEIOU", chars: ["A", "E", "I", "O", "U"] },
    // Not a letter group in itself -- it is the hint that the field beside it
    // takes one. "A-E" is the shape a teacher types for "this week's letters".
    { key: "first5", label: "A\u2013E", chars: ["A", "B", "C", "D", "E"] }
  ];

  function buildBookRangeControl(bookBtn) {
    if (!bookBtn || document.getElementById("pt-book-range")) return;
    /* Only offer presets this page can actually honour. "A-Z" on a page whose
       charset is punctuation is a button that does nothing, and the whole
       control is pointless when only "everything" is left. */
    const have = new Set(CHARS.map((c) => c.toUpperCase()));
    const presets = BOOK_PRESETS.filter((pr) => !pr.chars || pr.chars.some((c) => have.has(c)));
    if (presets.length < 2) return;
    const wrap = document.createElement("div");
    wrap.className = "pt-choice-row pt-book-range";
    wrap.id = "pt-book-range";
    wrap.setAttribute("role", "radiogroup");
    wrap.setAttribute("aria-label", T.letterWord);
    const custom = document.createElement("input");
    const chips = [];
    const select = (key) => {
      chips.forEach((c) => {
        const on = c.dataset.key === key;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-checked", on ? "true" : "false");
      });
    };
    presets.forEach((preset) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice pt-choice-sm";
      b.dataset.key = preset.key;
      b.textContent = preset.label;
      b.setAttribute("role", "radio");
      const on = preset.key === "all";
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.addEventListener("click", () => { bookRange = preset.chars; custom.value = ""; select(preset.key); });
      chips.push(b);
      wrap.appendChild(b);
    });
    custom.type = "text";
    custom.className = "pt-book-range-input";
    custom.maxLength = 40;
    custom.placeholder = "A-E";
    // An input with only a placeholder is an unlabelled form control, which is
    // one of the accessibility gate's blocking classes. This is its real name.
    custom.setAttribute("aria-label", T.letterWord);
    custom.addEventListener("input", () => {
      bookRange = parseRange(custom.value);
      select(custom.value.trim() ? null : "all");
    });
    wrap.appendChild(custom);

    /* Cards per page, its own radiogroup so the two axes are not conflated.
       Its accessible name is T.pageCount.one -- the locale's own word for
       "page", already translated in all eight. */
    const perWrap = document.createElement("div");
    perWrap.className = "pt-choice-row pt-book-per";
    perWrap.setAttribute("role", "radiogroup");
    perWrap.setAttribute("aria-label", T.pageCount.one);
    const perChips = [];
    [1, 2, 4].forEach((n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice pt-choice-sm";
      b.textContent = String(n);
      b.setAttribute("role", "radio");
      const on = n === 1;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.addEventListener("click", () => {
        bookPerPage = n;
        perChips.forEach((c) => {
          const sel = c === b;
          c.classList.toggle("is-active", sel);
          c.setAttribute("aria-checked", sel ? "true" : "false");
        });
      });
      perChips.push(b);
      perWrap.appendChild(b);
    });
    wrap.appendChild(perWrap);
    bookBtn.parentNode.insertBefore(wrap, bookBtn);
  }

  function printAlphabetBook() {
    const book = document.createElement("div");
    book.className = "bubble-print-book";
    const chars = bookChars();
    const per = bookPerPage;
    for (let i = 0; i < chars.length; i += per) {
      const page = document.createElement("div");
      page.className = "bubble-print-book-page" + (per > 1 ? " is-" + per + "up" : "");
      chars.slice(i, i + per).forEach((ch) => {
        // At one per page the card IS the page, so the single-page layout is
        // byte-for-byte what it always was and needs no new CSS to hold up.
        const card = per > 1 ? document.createElement("div") : page;
        if (per > 1) card.className = "pt-card";
        const t = document.createElement("h3");
        t.className = "bubble-print-title";
        // The credit lives in the footer block now (attachCredit), with a QR
        // beside it, so the heading stops repeating the URL.
        t.textContent = cap(NOUN) + " " + charLabel(ch);
        card.appendChild(t);
        // The figure gets its own box so the page can flex: title and credit
        // take their natural height, this absorbs the rest. Same reason the
        // single-character print has one — see .pt-fill-page in style.css.
        const figure = document.createElement("div");
        figure.className = "bubble-figure";
        figure.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch) : outlineSVG(ch)));
        card.appendChild(figure);
        if (per > 1) page.appendChild(card);
      });
      if (per > 1) {
        const cut = document.createElement("p");
        cut.className = "pt-cut-hint";
        cut.textContent = T.puzzleCut;
        page.appendChild(cut);
      }
      book.appendChild(page);
    }
    printWrap("", book, "alphabet_book");
  }

  function printAlphabetSheet() {
    const sheet = document.createElement("div");
    sheet.className = "bubble-print-sheet";
    CHARS.forEach((ch) => sheet.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch) : outlineSVG(ch, { small: true }))));
    // The credit is in the footer block now (attachCredit), with a QR beside
    // it, so the heading stops carrying a second copy of the domain.
    printWrap(cap(NOUN) + " alphabet", sheet, "alphabet_sheet");
  }

  /* ---------------------------------------------------------------
     "Print size" — bulletin-board / poster tiling for the full A–Z
     alphabet print (forum-evidenced pain: "letters for bulletin board!!",
     large display letters at 2–4in, not one more fixed-size sheet).
     "full" is the default and pre-selected option and maps straight to the
     print handler `buildAlphabetGrid` already wires (printAlphabetSheet or
     printAlphabetBook per CFG.alphabetPrint) — completely unchanged output.
     Only "medium"/"small" branch into printAlphabetTiled() below, and that
     branch only exists at all on pages that add the optional
     #pt-size-control mount (see buildSizeControl). Pages that don't add the
     mount never build this control and never see the new code path.
     --------------------------------------------------------------- */
  const SIZE_PRESETS = [
    { key: "full",   heightIn: null, label: T.size.full.label,   hint: T.size.full.hint },
    { key: "medium", heightIn: 4,    label: T.size.medium.label, hint: T.size.medium.hint },
    { key: "small",  heightIn: 2,    label: T.size.small.label,  hint: T.size.small.hint }
  ];
  let alphaSizeKey = "full";

  // Conservative usable print area, safe across both US Letter (8.5x11in)
  // and A4 (8.27x11.69in) with room left for default browser print margins
  // plus the page title line — the same portrait budget printAlphabetBook's
  // own fixed 8.2in single-letter height already assumes.
  // Historical defaults; the live values follow the print-settings panel
  // (printArea()) so a "4 in" letter tiles correctly on A4 or Letter,
  // portrait or landscape.
  const TILE_GAP_IN = 0.25;

  // How tall a rendered character is relative to its width, per render mode
  // — used to size each tile's grid column so a "4 in" letter really is
  // ~4in tall on paper, not just labeled that way.
  function tileAspect() {
    if (RENDER === "glyph") return 1.6; // "A a" pair (glyph mode) is wider than tall
    return 200 / 240; // outlineSVG / singleDotSVG's own viewBox ratio
  }

  // How many CHARS fit on one tiled page at a given letter height, and the
  // grid geometry to lay them out — the floor() below guarantees the tiles
  // never overflow the safe usable area even when the division isn't exact.
  function tileLayout(heightIn) {
    const cellW = heightIn * tileAspect();
    const area = printArea();
    const cols = Math.max(1, Math.floor((area.w + TILE_GAP_IN) / (cellW + TILE_GAP_IN)));
    const rows = Math.max(1, Math.floor((area.h + TILE_GAP_IN) / (heightIn + TILE_GAP_IN)));
    return { cols: cols, rows: rows, perPage: cols * rows, cellW: cellW };
  }

  // The whole A–Z (or A–Z + 0–9) run, tiled several-per-page at a fixed real
  // letter height, paginated across as many sheets as needed — the
  // "bulletin board" size option. Reuses the exact same per-character figure
  // the compact sheet/book prints already draw (outlineSVG / singleDotSVG /
  // bigGlyphForPrint) and the same printWrap print call as every other
  // multi-page job in this file — just a new size-driven grid layout, no new
  // render primitive and no new print mechanism.
  /* Reference height for a printed single letter: one glyph on a portrait
     sheet inside the default margins. A tile at that height keeps the page's
     own stroke; anything smaller is thinned on a square-root curve, which
     holds visual weight far better than scaling linearly while still opening
     the counters back up. 2in -> 0.5, 4in -> 0.71, 8in -> 1. */
  const TILE_STROKE_REF_IN = 8;
  function tileStrokeScale(heightIn) {
    const h = Math.max(0.5, Number(heightIn) || TILE_STROKE_REF_IN);
    return Math.min(1, Math.sqrt(h / TILE_STROKE_REF_IN));
  }

  function printAlphabetTiled(sizeKey) {
    const preset = SIZE_PRESETS.filter((p) => p.key === sizeKey)[0] || SIZE_PRESETS[1];
    const heightIn = preset.heightIn || 4;
    const layout = tileLayout(heightIn);
    const small = heightIn <= 2;
    const pages = [];
    for (let i = 0; i < CHARS.length; i += layout.perPage) pages.push(CHARS.slice(i, i + layout.perPage));

    const root = document.createElement("div");
    root.className = "pt-tile-set";
    pages.forEach((chunk, pi) => {
      const page = document.createElement("div");
      page.className = "pt-tile-page";
      const title = document.createElement("h3");
      title.className = "bubble-print-title";
      /* Same: the per-page footer carries the credit, so it comes off the
         heading. Every word here is now the locale's own: NOUN from the
         page config, preset.label from T.size, and alphabetWord /
         pageCount.one / ofWord from the i18n table. Until 2026-09-16 this
         read "alphabet ... page 1 of 3" in English on all 16 non-EN pages
         that offer tiled printing. The separator is the middle dot the
         table already uses in lowerSuffix, never an em dash. */
      title.textContent = cap(NOUN) + " " + T.alphabetWord + " \u00b7 " + preset.label +
        " \u00b7 " + T.pageCount.one + " " + (pi + 1) + " " + T.ofWord + " " + pages.length;
      page.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "pt-tile-grid";
      grid.style.gridTemplateColumns = "repeat(" + layout.cols + ", " + layout.cellW.toFixed(2) + "in)";
      grid.style.gap = TILE_GAP_IN.toFixed(2) + "in";
      chunk.forEach((ch) => {
        const cell = document.createElement("div");
        cell.className = "pt-tile-cell";
        cell.style.height = heightIn.toFixed(2) + "in";
        cell.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch, { small: small }) : outlineSVG(ch, { small: small, strokeScale: tileStrokeScale(heightIn) })));
        grid.appendChild(cell);
      });
      page.appendChild(grid);
      root.appendChild(page);
    });
    printWrap("", root, "alphabet_tiled");
  }

  // Optional "print size" radiogroup (#pt-size-control). Entirely opt-in:
  // pages that don't add the mount never call this and the alphabet-print
  // button keeps calling exactly the same default handler it always has.
  // "Full page" is pre-selected, so even a page that DOES add the mount
  // still defaults to today's unaffected output until the visitor actively
  // picks Medium or Small.
  function buildSizeControl() {
    /* Mount it for a page that prints an alphabet and never declared the hook.
       All 24 English landings gained the control on 2026-09-13; sixteen locale
       pages that print the same A-Z sheet did not, among them
       es/imprimibles/moldes-de-letras, the third-largest Bing click page on
       the site. Created here rather than added to sixteen files for the reason
       the injected PNG button already records: the markup is identical on
       every one of them, and a runtime mount keeps a UI control out of the
       parity, locale-translation and em-dash gates. The control labels itself
       from T.size.label, which ships in all eight languages, so this adds no
       string anywhere. Only where alphaPrint exists -- a size control on a
       page with no alphabet sheet would be a control with no consequence. */
    if (!el.sizeControl && el.alphaPrint) {
      const field = document.createElement("div");
      field.className = "pt-size-field";
      const mount = document.createElement("div");
      mount.id = "pt-size-control";
      field.appendChild(mount);
      const host = el.alphaPrint.closest(".bubble-actions, .pt-actions") || el.alphaPrint;
      host.insertAdjacentElement("beforebegin", field);
      el.sizeControl = mount;
    }
    if (!el.sizeControl) return;
    // Label itself when the page did not supply one. T.size.label ships
    // translated in all eight locales, so a hub only has to declare the bare
    // mount and nothing about print size has to be authored per language.
    // Pages that already carry a .pt-size-field-label (the EN hubs, the six
    // Spanish-alphabet pages) keep theirs and get no second heading.
    const field = el.sizeControl.parentNode;
    if (field && !field.querySelector(".pt-size-field-label")) {
      const lab = document.createElement("p");
      lab.className = "pt-size-field-label";
      lab.textContent = T.size.label;
      field.insertBefore(lab, el.sizeControl);
    }
    const group = document.createElement("div");
    group.className = "pt-choice-row pt-size-row";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", T.size.label);
    SIZE_PRESETS.forEach((preset) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice";
      const on = preset.key === alphaSizeKey;
      b.classList.toggle("is-active", on);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.appendChild(document.createTextNode(preset.label));
      const small = document.createElement("small");
      small.textContent = preset.hint;
      b.appendChild(small);
      b.addEventListener("click", () => {
        alphaSizeKey = preset.key;
        $$(".pt-choice", group).forEach((o) => {
          const isOn = o === b;
          o.classList.toggle("is-active", isOn);
          o.setAttribute("aria-checked", isOn ? "true" : "false");
        });
        updateSheetCost();
      });
      group.appendChild(b);
    });
    el.sizeControl.appendChild(group);
  }

  /* A per-letter spoke is a dead end without this (audit 2026-09-13).
     /printables/alphabet-coloring-pages/letter-a/ mounts #pt-panel and
     #pt-print-root and nothing else: you could print A, and to print the
     alphabet -- the job a teacher actually arrived with -- you had to notice
     the A-Z list further down, click through to the hub and find its batch
     button. The 223 spokes are 73% of the printables estate and earned about
     $0.50 between them in 18 days; a dead end is part of why.

     Built in JS from strings the engine already ships in all eight locales
     (T.printBook, T.size.*), so 223 pages in 8 languages gain the batch print
     without one line of new copy or one hand-edited page. Only ever added
     where the page has a sheet panel, no strip and no batch button of its own
     -- a hub keeps exactly the markup it declares. */
  function buildSpokeBatch() {
    if (!el.panel || el.strip || el.alphaPrint || el.bookPrint) return;
    if (!Array.isArray(CHARS) || CHARS.length < 2) return;

    const wrap = document.createElement("section");
    wrap.className = "pt-spoke-batch";

    const field = document.createElement("div");
    field.className = "pt-size-field";   // buildSizeControl() adds the label
    const mount = document.createElement("div");
    mount.id = "pt-size-control";
    field.appendChild(mount);
    el.sizeControl = mount;
    wrap.appendChild(field);

    const actions = document.createElement("div");
    actions.className = "bubble-actions pt-batch-actions";
    const book = document.createElement("button");
    book.type = "button";
    // Secondary: "Print this letter" in the card above is this page's primary
    // job, and two purple buttons in one column read as two primaries.
    book.className = "bubble-btn";
    book.dataset.ptPdf = "1";
    book.textContent = T.printBook;
    book.addEventListener("click", () => {
      if (alphaSizeKey !== "full") { printAlphabetTiled(alphaSizeKey); return; }
      printAlphabetBook();
    });
    actions.appendChild(book);
    buildBookRangeControl(book);
    wrap.appendChild(actions);
    wrap.appendChild(makePdfHint());

    el.panel.insertAdjacentElement("afterend", wrap);
    buildSizeControl();
  }

  function buildAlphabetGrid() {
    buildSizeControl();
    if (el.bookPrint) {
      el.bookPrint.addEventListener("click", printAlphabetBook);
      buildBookRangeControl(el.bookPrint);
    }
    if (el.alphaPrint) {
      const bookMode = CFG.alphabetPrint === "book";
      const printDefault = bookMode ? printAlphabetBook : printAlphabetSheet;
      el.alphaPrint.addEventListener("click", () => {
        if (el.sizeControl && alphaSizeKey !== "full") { printAlphabetTiled(alphaSizeKey); return; }
        printDefault();
      });
      if (!bookMode) {
        const bookBtn = document.createElement("button");
        bookBtn.type = "button";
        bookBtn.className = "bubble-btn";
        bookBtn.dataset.ptPdf = "1";
        bookBtn.textContent = T.printBook;
        bookBtn.addEventListener("click", printAlphabetBook);
        el.alphaPrint.insertAdjacentElement("afterend", bookBtn);
        buildBookRangeControl(bookBtn);
      }
    }
    paintAlphabetGrid();
  }

  /* The cells alone, separated from the one-time wiring above so a letterform
     change can repaint them. buildAlphabetGrid() binds click handlers to
     #pt-alphabet-print and inserts the book button next to it, so calling the
     whole thing twice would double-bind the print action and grow a second
     button; this half clears first and is safe to call on every repaint. */
  function paintAlphabetGrid() {
    if (!el.alphaGrid) return;
    el.alphaGrid.innerHTML = "";
    CHARS.forEach((ch) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bubble-alpha-cell";
      cell.setAttribute("aria-label", cap(NOUN) + " " + charLabel(ch) + " — open");
      cell.appendChild(RENDER === "glyph" ? smallGlyphCell(ch) : (RENDER === "dots" ? singleDotSVG(ch, { small: true }) : outlineSVG(ch, { small: true })));
      cell.addEventListener("click", () => {
        selectChar(ch);
        if (el.panel) el.panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      el.alphaGrid.appendChild(cell);
    });
  }

  function smallGlyphCell(ch) {
    const s = document.createElement("span");
    s.className = "pt-glyph-cell";
    s.textContent = renderGlyph(ch.toUpperCase()) + " " + renderGlyph(ch.toLowerCase());
    return s;
  }

  /* ---------------------------------------------------------------
     Section: ruled practice sheet (model + trace + baseline rows)
     --------------------------------------------------------------- */

  function buildPracticeSheet() {
    const overlayOn = strokeOverlayOn();
    const sheet = document.createElement("div");
    sheet.className = "cursive-print-sheet" + (overlayOn ? " pt-stroke-on" : "");
    CHARS.forEach((ch) => {
      const row = document.createElement("div");
      row.className = "cursive-print-row";
      const model = document.createElement("span");
      model.className = "cursive-print-model";
      const trace = document.createElement("span");
      trace.className = "cursive-print-trace";
      if (RENDER === "glyph") {
        model.textContent = renderGlyph(ch.toUpperCase()) + " " + renderGlyph(ch.toLowerCase());
        trace.textContent = renderGlyph(ch.toUpperCase()) + " " + renderGlyph(ch.toLowerCase());
      } else {
        // Model column only ever shows the uppercase letter (CHARS is A-Z +
        // 0-9), so the overlay's uppercase coverage lines up exactly here.
        model.appendChild(outlineSVG(ch, { small: true, overlay: overlayOn }));
        model.classList.add("pt-model-svg");
        trace.textContent = /[0-9]/.test(ch) ? ch : (ch + " " + ch.toLowerCase());
      }
      const line = document.createElement("span");
      line.className = "cursive-print-line";
      row.appendChild(model); row.appendChild(trace); row.appendChild(line);
      sheet.appendChild(row);
    });
    printWrap(cap(NOUN) + " practice sheet", sheet, "practice_sheet");
  }

  /* ---------------------------------------------------------------
     Section: personalized name / word worksheet
     --------------------------------------------------------------- */

  const NAME_DEMO = CFG.nameDemo || "Alex";

  // Optional style/colour designer for the name tool (CFG.nameStyles — the
  // graffiti-generator pages). Each entry: { key, font, strokeWidth,
  // letterSpacing }; the buttons themselves are page-authored (crawlable,
  // translated) inside #pt-name-styles, same pattern as the handwriting
  // script picker. Absent config leaves every existing page untouched.
  const NAME_STYLES = Array.isArray(CFG.nameStyles) && CFG.nameStyles.length ? CFG.nameStyles : null;
  let nameStyleKey = NAME_STYLES ? NAME_STYLES[0].key : null;

  function activeNameStyle() {
    if (!NAME_STYLES) return null;
    return NAME_STYLES.find((s) => s.key === nameStyleKey) || NAME_STYLES[0];
  }

  function nameSolidOn() { return !!(el.nameSolid && el.nameSolid.checked); }

  // Render options for one name row/preview. kind: "preview" | "model" |
  // "trace". Without a designer this returns the legacy opts unchanged.
  function nameRenderOpts(kind) {
    const style = activeNameStyle();
    if (!style) return { solid: kind === "model" };
    const o = {
      font: style.font,
      spacing: style.letterSpacing != null ? style.letterSpacing : LETTER_SPACING,
      skew: style.skew
    };
    const solid = nameSolidOn();
    if (kind === "trace") {
      // Trace rows stay the light guide regardless of colour choices —
      // they exist to be drawn over.
      o.solid = false;
      return o;
    }
    if (solid) {
      o.solid = true;
      o.fill = el.nameFill ? el.nameFill.value : INK;
      o.strokeColor = el.nameStroke ? el.nameStroke.value : INK;
      o.strokeWidth = Math.max(3, Math.round((style.strokeWidth != null ? style.strokeWidth : STROKE) / 2));
    } else if (kind === "model") {
      o.solid = true;
    } else {
      // Hollow preview: the page's fat colour-it-in outline, in the chosen
      // style's own weight, outline colour still user-pickable.
      o.solid = false;
      o.strokeColor = el.nameStroke ? el.nameStroke.value : INK;
      o.strokeWidth = style.strokeWidth != null ? style.strokeWidth : STROKE;
    }
    return o;
  }

  function setNameStyle(key) {
    if (!NAME_STYLES) return;
    const style = NAME_STYLES.find((s) => s.key === key) || NAME_STYLES[0];
    nameStyleKey = style.key;
    if (el.nameStyles) {
      $$(".pt-name-style-opt", el.nameStyles).forEach((b) => {
        const on = b.dataset.style === nameStyleKey;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    withFont(renderNamePreview, nameFontFamily());
  }

  // First family name of the active style, for document.fonts.load.
  function nameFontFamily() {
    const style = activeNameStyle();
    if (!style || !style.font) return null;
    const first = String(style.font).split(",")[0].trim();
    return first.replace(/^['"]|['"]$/g, "");
  }

  /* Case on the name sheet (PR-17). The three generator tools have carried a
     case control since they shipped and the name tool never did, so a teacher
     could not print EMMA for a child still learning capitals, or emma for one
     who has moved on -- while applyCase() sat right there, reading a select
     the name tool does not have.

     Two toggle chips rather than a four-option select, because a select needs
     "As typed" and "Title Case" in eight languages and neither exists in the
     table, while T.caseUpper and T.caseLower are already there and already
     harvested. Pressing the active chip releases it, so all three outcomes
     are reachable from two translated words. The visible chip is the
     letterform itself, which needs no translation; the accessible name is
     this locale's own word. Same pattern, and the same reasoning, as the
     dot-to-dot page's case chips. */
  let nameCase = "as-typed";
  /* PR-19 -- the same word, on another kind of sheet.

     One name could become a tracing sheet, a coloring page, a dot-to-dot, a
     puzzle and a banner, and nothing on any of those pages offered the next
     one: the journey map's own arrows existed as a diagram and as zero links.
     Preset URLs already make it a link rather than a build, so this carries
     whatever is typed into the sibling tool that takes a word.

     ENGLISH ONLY, and that is a requirement rather than a shortcut: every
     destination is an English tool, and linking one from a locale page is
     exactly what the locale-native internal linking rule forbids. The labels
     are read from the page's own rendered footer, so they cannot drift from
     the site's own names for these tools and nothing is authored here.

     Runtime rather than static markup, unlike the /learn/ bridge: the href
     carries a word that only exists once someone types it, so there is no
     crawlable link to lose. */
  const CARRY_TOOLS = [
    "/printables/name-tracing/", "/printables/letter-tracing/",
    "/printables/handwriting-worksheet-generator/", "/printables/sight-word-tracing/",
    "/printables/coloring-page-maker/", "/printables/dot-to-dot-name/",
    "/printables/name-puzzle-maker/", "/printables/banner-maker/"
  ];
  /* PR-12 -- "how many sheets will this cost me?" was unanswerable before
     pressing the button, on a family whose own community evidence is
     "we can only afford printer ink a couple times a year". Every number here
     is already computed: the roster length for a class set, tileLayout()'s
     perPage for a tiled alphabet. This only displays what the engine knows.
     T.sheets and T.pageCount ship in all eight languages, so it needs no
     string; the paper is named by printPrefs rather than the hardcoded
     "US Letter" the meta line used to print in every locale. */
  function sheetCostText(count, pages) {
    const bits = [];
    if (count > 1) bits.push(count + " " + T.sheets);
    if (pages > 1) bits.push(pages + " " + plural(pages, T.pageCount));
    // The paper qualifies a count; on its own it is not a cost, and a line
    // reading only "US Letter" under a button is noise.
    if (bits.length && PP && PP.paperLabel) bits.push(PP.paperLabel());
    return bits.join(" \u00b7 ");
  }
  function updateSheetCost() {
    const host = $("#pt-sheet-cost");
    if (!host) return;
    const roster = primaryRoster();
    const n = roster ? rosterEntries(roster).length : 0;
    // A roster's own page count, which the line never reported: at 1 it is
    // the number every teacher was already paying, and it is what makes the
    // N chips above legible without a sentence.
    let pages = n > 1 ? Math.ceil(n / (nUp > 1 ? nUp : 1)) : 0;
    if (el.sizeControl && alphaSizeKey !== "full") {
      const preset = SIZE_PRESETS.filter((x) => x.key === alphaSizeKey)[0];
      if (preset && preset.heightIn) {
        const per = tileLayout(preset.heightIn).perPage;
        if (per > 0) pages = Math.ceil(CHARS.length / per);
      }
    }
    const text = sheetCostText(n, pages);
    host.textContent = text;
    host.hidden = !text;
  }
  /* PR-33 -- "give students fewer items per page or line" is a named
     accommodation (Understood.org states it twice), and the row count was the
     only density lever on these sheets while every select started at 2. One
     row is a real setting for a child who cannot face a full page, and it is
     one <option> whose label is a digit, so it needs no translating. Added at
     runtime rather than to each page's HTML for the same reason the size
     control is: identical markup everywhere, and it keeps a UI change out of
     the copy gates. */
  function addLowDensityOption(sel) {
    if (!sel || sel.querySelector('option[value="1"]')) return;
    const o = document.createElement("option");
    o.value = "1";
    o.textContent = "1";
    sel.insertBefore(o, sel.firstChild);
  }

  /* PR-11 -- N-per-sheet. A 30-name class set cost 30 sheets of paper, on a
     family whose own community evidence is "we can only afford printer ink a
     couple times a year". Every sheet builder below already emitted one
     .pt-sheet-page per item, so grouping them is the whole feature.

     1 and 4, never 2, and that is geometry rather than an omission. A portrait
     sheet dropped unrotated into half a portrait page scales by 0.5 -- the
     same factor a 2x2 grid uses -- so unrotated 2-up prints the SAME letter
     size on twice the paper and is strictly dominated by 4-up. A 2-up worth
     offering has to rotate the sheet 90 degrees and derive its scale from
     printArea(); that is its own piece of work, not a third chip here.

     The chips are digits, so this adds no string in any language -- the same
     reasoning addLowDensityOption already records. What explains them is the
     sheet-cost line directly beneath, which is already localized and now
     reports a roster's page count at whatever N is selected: 30 sheets / 30
     pages at 1, 30 sheets / 8 pages at 4. */
  const NUP_CHOICES = [1, 4];
  let nUp = 1;

  function appendSheetPages(container, items, makeNode) {
    const per = nUp > 1 ? nUp : 1;
    for (let i = 0; i < items.length; i += per) {
      const chunk = items.slice(i, i + per);
      const page = document.createElement("div");
      page.className = "pt-sheet-page";
      if (per === 1) {
        page.appendChild(makeNode(chunk[0], i));
      } else {
        page.classList.add("is-nup", "is-nup-" + per);
        /* The cells live in their own grid rather than directly on the page,
           because the page also carries chrome it does not control: printWrap
           inserts the job title into the unit when a job is exactly one page,
           and attachCredit appends the credit to every unit. Both were landing
           in grid cells -- measured, the title took cell 1 and pushed the
           fourth sheet into the credit's auto row at 0px tall, and its
           min-content width split the columns 504/205 instead of in half.
           A flex column with the grid as its one growing child lets the title
           and the credit claim their natural height and the sheets take what
           is left, so nothing here has to know how tall a heading is. */
        const grid = document.createElement("div");
        grid.className = "pt-nup-grid";
        chunk.forEach((it, j) => {
          const cell = document.createElement("div");
          cell.className = "pt-nup-cell";
          cell.appendChild(makeNode(it, i + j));
          grid.appendChild(cell);
        });
        page.appendChild(grid);
      }
      container.appendChild(page);
    }
  }

  function setNUp(n) {
    nUp = NUP_CHOICES.indexOf(n) === -1 ? 1 : n;
    const row = $("#pt-nup-row");
    if (row) $$(".pt-choice", row).forEach((b) => {
      const on = Number(b.dataset.nup) === nUp;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    updateSheetCost();
  }

  /* Only where a roster exists: N-per-sheet changes nothing on a page that
     prints one sheet, and a control with no consequence is the defect the
     print-settings panel already records. Named by T.classSet, which ships in
     all eight languages and is the thing being configured. */
  function mountNUp() {
    if ($("#pt-nup-row") || !primaryRoster()) return;
    const host = $("#pt-sheet-cost");
    if (!host) return;
    const row = document.createElement("div");
    row.id = "pt-nup-row";
    row.className = "pt-choice-row pt-nup-row";
    row.setAttribute("role", "radiogroup");
    row.setAttribute("aria-label", T.classSet);
    NUP_CHOICES.forEach((n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice";
      b.dataset.nup = String(n);
      b.textContent = String(n);
      b.setAttribute("role", "radio");
      const on = n === nUp;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      b.addEventListener("click", () => setNUp(n));
      row.appendChild(b);
    });
    host.insertAdjacentElement("beforebegin", row);
  }

  function mountSheetCost() {
    if ($("#pt-sheet-cost")) return;
    const btn = el.namePrint || el.genPrint || el.designPrint || el.puzzlePrint || el.alphaPrint;
    if (!btn) return;
    const out = document.createElement("p");
    out.id = "pt-sheet-cost";
    out.className = "pt-sheet-cost";
    out.setAttribute("aria-live", "polite");
    out.hidden = true;
    (btn.closest(".bubble-actions, .pt-actions") || btn).insertAdjacentElement("afterend", out);
    const roster = primaryRoster();
    if (roster) roster.addEventListener("input", () => updateSheetCost());
    updateSheetCost();
  }

  function mountCarryRow() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    if (lang !== "en") return null;
    const input = primaryInput();
    if (!input || $("#pt-carry-row")) return null;
    const here = window.location.pathname.replace(/\/?$/, "/");
    const links = [];
    $$("footer .footer-link").forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/?$/, "/");
      if (href === here || CARRY_TOOLS.indexOf(href) === -1) return;
      if (links.some((l) => l.href === href)) return;
      links.push({ href: href, label: a.textContent.trim() });
    });
    if (links.length < 2) return null;
    const row = document.createElement("div");
    row.id = "pt-carry-row";
    row.className = "pt-carry-row";
    const lab = document.createElement("span");
    lab.className = "pt-carry-label";
    lab.textContent = "Same word, another sheet:";
    row.appendChild(lab);
    links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "pt-carry-link";
      a.href = l.href;
      a.textContent = l.label;
      a.dataset.carry = l.href;
      row.appendChild(a);
    });
    const host = input.closest(".pt-field, .pt-name-field") || input.parentElement;
    (host.closest("section") || host).appendChild(row);
    updateCarryRow();
    input.addEventListener("input", () => updateCarryRow());
    return row;
  }
  function updateCarryRow() {
    const row = $("#pt-carry-row");
    const input = primaryInput();
    if (!row || !input) return;
    const word = (input.value || "").trim().slice(0, 40);
    $$(".pt-carry-link", row).forEach((a) => {
      a.href = a.dataset.carry + (word ? "?name=" + encodeURIComponent(word) : "");
    });
  }

  function mountNameCase() {
    if (!el.nameInput || $("#pt-name-case")) return;
    const row = document.createElement("div");
    row.id = "pt-name-case";
    row.className = "pt-choice-row pt-name-case";
    row.setAttribute("aria-label", T.letterWord);
    const chips = [];
    [["upper", "AA", T.caseUpper], ["lower", "aa", T.caseLower]].forEach((spec) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice pt-choice-sm";
      b.textContent = spec[1];
      b.dataset.case = spec[0];
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", spec[2]);
      b.addEventListener("click", () => {
        nameCase = nameCase === spec[0] ? "as-typed" : spec[0];
        chips.forEach((x) => {
          const on = x.dataset.case === nameCase;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
        renderNamePreview();
      });
      chips.push(b);
      row.appendChild(b);
    });
    const host = el.nameInput.closest(".pt-field, .pt-name-field") || el.nameInput.parentElement;
    host.insertAdjacentElement("afterend", row);
  }
  function applyNameCase(word) {
    if (nameCase === "upper") return String(word).toUpperCase();
    if (nameCase === "lower") return String(word).toLowerCase();
    return word;
  }
  function nameValue() {
    const raw = el.nameInput ? el.nameInput.value : "";
    return applyNameCase((raw && raw.trim()) ? raw.trim().slice(0, 40) : NAME_DEMO);
  }

  function renderNamePreview() {
    if (!el.namePreview) return;
    const name = nameValue();
    el.namePreview.innerHTML = "";
    if (RENDER === "glyph") {
      const p = document.createElement("p");
      p.className = "pt-glyph-figure pt-name-glyph";
      p.textContent = renderGlyph(name);
      el.namePreview.appendChild(p);
    } else if (NAME_STYLES) {
      const o = nameRenderOpts("preview");
      o.overlay = strokeOverlayOn();
      el.namePreview.appendChild(wordOutlineSVG(name, o));
    } else {
      el.namePreview.appendChild(wordOutlineSVG(name, { solid: false, overlay: strokeOverlayOn() }));
    }
  }

  // The full name worksheet as a DOM node — one primitive behind the single
  // print and the class-set print, so every sheet in a set matches the solo
  // one. `nameOverride` lets the roster path build one sheet per child.
  /* A Name and Date line on the sheets that get handed out and collected
     (PR-04). #pt-design-footer and #pt-puzzle-footer have existed since those
     tools shipped, and the four sheets a teacher actually collects -- name
     tracing, letter tracing, handwriting, sight words -- had none, so thirty
     finished worksheets came back with nothing on them saying whose they were.
     Every competitor the 2026-09-16 audit fetched offers this.

     No toggle and no new string: T.nameLabel and T.dateLabel already ship in
     all eight languages, and a practice sheet carrying a name line is the
     field norm rather than a decoration. The design and puzzle sheets keep
     their toggles, because those are display pieces where a name line is a
     choice. */
  function nameDateRow() {
    const row = document.createElement("div");
    row.className = "pt-sheet-footer";
    [T.nameLabel, T.dateLabel].forEach((label) => {
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

  function nameSheetNode(nameOverride) {
    const name = nameOverride != null ? String(nameOverride).slice(0, 40) : nameValue();
    const rows = document.createElement("div");
    rows.className = "pt-name-sheet";

    // Solid model row.
    rows.appendChild(nameRow(name, "model"));
    // Trace rows (hollow / faded).
    const traceCount = Math.max(1, Math.min(6, parseInt((el.nameRows && el.nameRows.value) || "3", 10) || 3));
    for (let i = 0; i < traceCount; i++) rows.appendChild(nameRow(name, "trace"));
    // Blank ruled rows for free practice.
    for (let i = 0; i < 2; i++) rows.appendChild(nameRow(name, "blank"));
    rows.appendChild(nameDateRow());
    return rows;
  }

  function buildNameWorksheet() {
    const names = rosterNames(el.nameRoster);
    if (names.length >= 2) {
      const set = document.createElement("div");
      set.className = "pt-class-set";
      appendSheetPages(set, names, (n) => nameSheetNode(applyNameCase(n)));
      printWrap(joinWords([names.length + " " + T.sheets, "·", cap(NOUN)]), set, "name_worksheet");
      return;
    }
    /* "<name> - tracing worksheet" was hardcoded English on all eight
       languages, and it framed the sheet as handwriting practice on
       /printables/graffiti-letters/, whose reader is a teenager making name
       art rather than a child learning letters. CFG.noun is already the
       page's own word in its own language ("Graffiti", "kolorowanka",
       "tracing"), so the title is composed from it and needs nothing
       translated here. The separator is the middle dot printAlphabetTiled
       already uses, never an em dash. */
    printWrap(joinWords([nameValue(), "·", cap(NOUN)]), sheetPageNode(nameSheetNode()), "name_worksheet");
  }

  /* PR-09 -- left-handed mode. A right-handed child writing left to right
     keeps the model at the start of the line in view the whole way across; a
     left-handed child's own hand covers it. Two practitioners state the same
     concrete remedy independently -- Learning Without Tears: "Pages should
     provide letter models on the left and right, so left-handed children can
     always see the model they are copying"; The OT Toolbox: "ensure that the
     model/example is on the right side of the page". LWT's both-sides
     formulation is the one implemented, because a right-only model breaks
     right-handers. Not one of the 43 generators the 2026-09-16 audit fetched
     has this toggle.

     It states what it changes and makes no medical claim: paper tilt, grip
     and seating are the writer's, not the sheet's.

     ENGLISH ONLY for now. The label needs a word in eight languages and
     `npm run audit:locale-attestation` reports "Linkshänder", "gaucher" and
     "mancini" attested on this site's own de, fr and it pages while "zurdos",
     "leworęczni", "canhotos" and "kidal" are not. This repo does not invent a
     locale string, so those four wait for a native reader rather than a
     guess. */
  let leftHanded = false;
  function mountLeftHanded() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    if (lang !== "en") return;
    const rows = el.nameRows || el.genRows;
    if (!rows || $("#pt-lefty")) return;
    const wrap = document.createElement("label");
    wrap.className = "pt-lefty-field";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.id = "pt-lefty";
    box.addEventListener("change", () => {
      leftHanded = box.checked;
      if (el.nameInput || el.namePreview) renderNamePreview();
      if (el.genInput || el.genPreview) renderGenPreview();
    });
    wrap.appendChild(box);
    wrap.appendChild(document.createTextNode(" Left-handed (model on both sides)"));
    const host = rows.closest(".pt-field, .pt-opt, .pt-name-rows-field") || rows.parentElement;
    host.insertAdjacentElement("afterend", wrap);
  }
  /* PR-31 -- letter spacing as a control.

     CFG.letterSpacing has always existed as a per-page config value and was
     exposed nowhere, so the one formatting change with primary evidence behind
     it could not be made by the person printing the sheet. The steps are the
     British Dyslexia Association Style Guide's own quantification: tracking
     "ideally around 35% of the average letter width".

     It is offered as A FORMATTING OPTION AND NOTHING ELSE. No label, hint or
     aria string here names a condition, a reading outcome or a study; this
     site is not qualified to make that claim and the audit that asked for the
     control said so in the same sentence that asked for it.

     A boost added to whatever the active style says, never a replacement for
     it: setCharStyle() and the name-style designer both write LETTER_SPACING /
     opts.spacing, and overwriting either would silently undo a chosen
     letterform's own tracking.

     English only, the same bail mountCarryRow and mountLeftHanded already
     take. "Letter spacing" is a new string and the site's own corpus does not
     attest a translation of it in six of the seven other locales (de, it and
     pl have none at all; fr, es and pt have one page each), so there is
     nothing to harvest and nothing here will be invented. */
  const SPACING_STEPS = [
    { key: "normal", em: 0, label: "Normal" },
    { key: "wide", em: 0.12, label: "Wide" },
    { key: "widest", em: 0.35, label: "Extra wide" }
  ];
  let spacingBoost = 0;
  let spacingKey = "normal";

  function repaintWordSurfaces() {
    if (el.nameInput || el.namePreview) renderNamePreview();
    if (el.genInput || el.genPreview) renderGenPreview();
  }

  function setSpacing(key, opts) {
    const step = SPACING_STEPS.filter((x) => x.key === key)[0] || SPACING_STEPS[0];
    spacingKey = step.key;
    spacingBoost = step.em;
    const row = $("#pt-spacing-row");
    if (row) $$(".pt-choice", row).forEach((b) => {
      const on = b.dataset.spacing === spacingKey;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    if (!(opts && opts.quiet)) repaintWordSurfaces();
  }

  function mountSpacing() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    if (lang !== "en") return;
    const rows = el.nameRows || el.genRows;
    if (!rows || $("#pt-spacing-row")) return;
    const field = document.createElement("div");
    field.className = "pt-spacing-field";
    const lab = document.createElement("span");
    lab.className = "pt-field-label";
    lab.textContent = "Letter spacing";
    field.appendChild(lab);
    const row = document.createElement("div");
    row.id = "pt-spacing-row";
    row.className = "pt-choice-row pt-spacing-row";
    row.setAttribute("role", "radiogroup");
    row.setAttribute("aria-label", "Letter spacing");
    SPACING_STEPS.forEach((step) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice";
      b.dataset.spacing = step.key;
      // The chip IS the demonstration: the same two letters at the tracking
      // it sets, so the difference is visible before anything is printed.
      const demo = document.createElement("span");
      demo.className = "pt-sp-demo is-sp-" + step.key;
      demo.textContent = "Aa";
      b.appendChild(demo);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", step.label);
      const on = step.key === spacingKey;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      b.addEventListener("click", () => setSpacing(step.key));
      row.appendChild(b);
    });
    field.appendChild(row);
    const host = rows.closest(".pt-field, .pt-opt, .pt-name-rows-field") || rows.parentElement;
    host.insertAdjacentElement("afterend", field);
  }

  /* OUT-15's control. ENGLISH ONLY, the same bail mountCarryRow and
     mountLeftHanded take: "bridged stencil" is a new string and neither the
     engine's I18N table nor locales/*.json carries a word for a stencil
     bridge in any of the eight, so the four locale siblings keep today's
     behaviour until a native reading exists. Per the owner's decision of
     2026-09-17 on the label-blocked items. Off by default on a PROTECT page. */
  function mountStencilToggle() {
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    if (lang !== "en" || CFG.stencil !== true || RENDER !== "outline") return;
    const host = el.sizeControl ? el.sizeControl.parentNode : (el.alphaPrint && el.alphaPrint.closest(".bubble-actions, .pt-actions"));
    if (!host || $("#pt-stencil")) return;
    const wrap = document.createElement("label");
    wrap.className = "pt-stencil-field";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.id = "pt-stencil";
    box.addEventListener("change", () => {
      stencilOnFlag = box.checked;
      withFont(() => {
        paintAlphabetGrid();
        if (activeChar) selectChar(activeChar);
      });
    });
    wrap.appendChild(box);
    wrap.appendChild(document.createTextNode(" Bridged stencil (counters stay attached when cut)"));
    host.insertAdjacentElement("afterend", wrap);
  }

  // A small second copy of the model at the right-hand end of a trace row.
  function leftyModel(node) {
    const aside = document.createElement("span");
    aside.className = "pt-lefty-model";
    aside.setAttribute("aria-hidden", "true");
    aside.appendChild(node);
    return aside;
  }

  function nameRow(name, kind) {
    const row = document.createElement("div");
    row.className = "pt-name-row pt-name-" + kind;
    if (kind === "blank") return row;
    if (RENDER === "glyph") {
      const span = document.createElement("span");
      span.className = "pt-name-word" + (kind === "trace" ? " is-trace" : "");
      span.textContent = renderGlyph(name);
      row.appendChild(span);
    } else if (NAME_STYLES) {
      const o = nameRenderOpts(kind);
      o.overlay = strokeOverlayOn();
      row.appendChild(wordOutlineSVG(name, o));
    } else {
      row.appendChild(wordOutlineSVG(name, { solid: kind === "model", overlay: strokeOverlayOn() }));
    }
    if (leftHanded && kind === "trace" && RENDER !== "glyph") {
      row.appendChild(leftyModel(wordOutlineSVG(name, { solid: true })));
    }
    return row;
  }

  /* ---------------------------------------------------------------
     Section: adjustable-difficulty tracing generator
     ---------------------------------------------------------------
     One difficulty slider is the source of truth (7 steps). Age presets
     are shortcuts that snap the slider to a sensible starting level; the
     user can nudge from there. Each level is a coherent combination of the
     three knobs a teacher thinks in — thickness (stroke width), nearness
     (dash gap) and intensity (ink / opacity) — driven from one control.
     All native SVG (stroke-dasharray / stroke-width / opacity); no fonts
     bundled, no server render.
     --------------------------------------------------------------- */

  const GHOST = "#c3c9d6";
  const FAINT = "#d7dbe4";
  const GUIDE = "#9aa2b1";
  const GUIDE_MID = "#c7ccd8";

  // Level 1 (easiest) → 7 (hardest). Round caps + a near-zero dash render
  // the stroke as a row of dots; longer dashes read as a broken guideline.
  const TRACE_LEVELS = [
    { key: "solid",    label: T.trace.solid.label,      hint: T.trace.solid.hint,
      fill: INK,   stroke: "none", sw: 0, dash: "",        cap: "round", opacity: 1 },
    { key: "bold-dot", label: T.trace["bold-dot"].label, hint: T.trace["bold-dot"].hint,
      fill: "none", stroke: INK,   sw: 8, dash: "0.1 11",  cap: "round", opacity: 1 },
    { key: "fine-dot", label: T.trace["fine-dot"].label, hint: T.trace["fine-dot"].hint,
      fill: "none", stroke: INK,   sw: 5, dash: "0.1 16",  cap: "round", opacity: 0.92 },
    { key: "dashed",   label: T.trace.dashed.label,     hint: T.trace.dashed.hint,
      fill: "none", stroke: INK,   sw: 4, dash: "15 15",   cap: "butt",  opacity: 0.85 },
    { key: "faded",    label: T.trace.faded.label,      hint: T.trace.faded.hint,
      fill: GHOST,  stroke: "none", sw: 0, dash: "",        cap: "round", opacity: 1 },
    { key: "faint",    label: T.trace.faint.label,      hint: T.trace.faint.hint,
      fill: "none", stroke: FAINT, sw: 2, dash: "0.1 22",  cap: "round", opacity: 1 },
    { key: "blank",    label: T.trace.blank.label,      hint: T.trace.blank.hint,
      blank: true }
  ];

  /* PR-13 / PR-32 -- the photocopy case is the OPPOSITE of the ink saver, and
     the two had been treated as one axis. A copier smooths light shades toward
     white and renders grey only by dithering, so the rungs that survive the
     machine a classroom actually uses are pure black at a real line weight.
     Every guide colour on these sheets is grey -- FAINT #d7dbe4, GUIDE
     #9aa2b1, GUIDE_MID #c7ccd8, GHOST #c3c9d6 -- and the faint rung is 2 units
     wide with a 0.1/22 dash, which is the first thing a copier drops.

     Applied at levelSpec() and addGuide() rather than by CSS selector, because
     what has to change differs per rung: a GHOST FILL cannot simply go black
     (a child would be tracing over a solid letter), so it is redrawn as the
     outline of the same letter, while a stroked rung keeps its own dash and
     only gains colour and a weight floor. The solid model row is INK already
     and is left alone. */
  function highContrastOn() { return printPrefs.ink === "contrast"; }
  const CONTRAST_INK = "#000000";
  /* ~3 units at the 132-unit trace type size, held as a FRACTION of type size
     so the same weight lands on the word surface, which draws at 150. On a
     7in-wide sheet whose viewBox is ~552 units, one unit is about 0.9pt, so
     this is the 1-2pt line the guidance asks for rather than a number picked
     to look right on screen. A floor, never a rewrite: a rung already heavier
     than this keeps its own weight. */
  const CONTRAST_MIN_EM = 3 / 132;
  function contrastStroke(fontSize, sw) {
    return Math.max(fontSize * CONTRAST_MIN_EM, Number(sw) || 0);
  }

  function contrastSpec(spec) {
    if (spec.blank) return spec;
    const out = Object.assign({}, spec);
    out.opacity = 1;
    if (spec.fill && spec.fill !== "none" && spec.fill !== INK) {
      out.fill = "none";
      out.stroke = CONTRAST_INK;
      out.sw = contrastStroke(TRACE_FONT_SIZE, spec.sw);
      out.cap = spec.cap || "round";
    } else if (spec.stroke && spec.stroke !== "none") {
      out.stroke = CONTRAST_INK;
      out.sw = contrastStroke(TRACE_FONT_SIZE, spec.sw);
    }
    return out;
  }

  function levelSpec(level) {
    const i = Math.max(0, Math.min(TRACE_LEVELS.length - 1, (level || 1) - 1));
    const spec = TRACE_LEVELS[i];
    return highContrastOn() ? contrastSpec(spec) : spec;
  }

  // Ruled guideline (top / midline / baseline) inside a worksheet SVG.
  /* PR-21 -- ruled-line models.

     These sheets shipped ONE ruling into every market. France and Germany both
     have a national school ruling, and a French or German worksheet drawn on a
     US three-line rule is the wrong exercise book, not a style preference --
     which is why this follows the page's own language rather than sitting
     behind a control. It also means it needs no label in any language: there
     was no word to harvest for "Seyes", "Lineatur" or "standard ruling", and
     a control is not what the finding asked for.

     Both models are sourced, not eyeballed:

     SEYES (fr) -- Wikipedia, "Ruled paper": heavy lines 8 mm apart with
     "three lighter lines ... spaced 2 mm apart between each pair of heavy
     lines", plus the heavy verticals at the same 8 mm pitch. So the ascender
     band IS the 8 mm unit and 2 mm is a quarter of it.

     LINEATUR 1 (de) -- the Klasse-1 Schreiblernlineatur: "vier Linien pro
     Zeile, je 5 mm Abstand" (Staehlin, Grundschul-Guide), marking three equal
     zones -- Oberlange, Mittelband, Unterlange -- with a Kontrastlineatur
     shading "der Bereich zwischen Grund- und Mittellinie", the band small
     letters live in. Equal 5 mm zones map to equal half-bands here, and the
     row grows downward because a Lineatur row carries a fourth line for the
     Unterlange that a three-line rule does not.

     Everything else keeps the ruling it has: Spain, Poland and the rest have
     their own conventions and this had no source for them, and inventing one
     would be worse than the single rule it replaces. CFG.ruling overrides the
     language default on any page that wants to. */
  function rulingKey() {
    if (CFG.ruling && RULINGS[CFG.ruling]) return CFG.ruling;
    const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    if (lang === "fr") return "seyes";
    if (lang === "de") return "lineatur";
    return "standard";
  }
  /* `at` is measured UPWARD from the baseline as a fraction of the ascender
     band, so one table serves the SVG sheet and the canvas PNG, which do not
     share a coordinate system. `extra` is how far below the baseline the row
     has to grow, in the same units. */
  const RULINGS = {
    standard: {
      lines: [{ at: 0 }, { at: 0.5, faint: true, dashed: true }, { at: 1 }],
      band: null, verticals: 0, extra: 0
    },
    seyes: {
      lines: [{ at: 0 }, { at: 0.25, faint: true }, { at: 0.5, faint: true },
              { at: 0.75, faint: true }, { at: 1 }],
      band: null, verticals: 1, extra: 0
    },
    lineatur: {
      lines: [{ at: 1 }, { at: 0.5, faint: true, dashed: true }, { at: 0 }, { at: -0.5 }],
      band: { from: 0, to: 0.5 }, verticals: 0, extra: 0.5
    }
  };
  function ruling() { return RULINGS[rulingKey()] || RULINGS.standard; }

  /* `faint` and `dashed` are separate properties. The house three-line rule
     draws its midline dashed, but a Seyes interline is lighter and SOLID --
     the source calls them "three lighter lines", not broken ones -- and
     drawing them dashed made the French ruling look like three midlines. */
  function addGuide(svg, w, y, dashed, faint) {
    const l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", "8");
    l.setAttribute("x2", String(w - 8));
    l.setAttribute("y1", String(y));
    l.setAttribute("y2", String(y));
    const hc = highContrastOn();
    const light = dashed || faint;
    l.setAttribute("stroke", hc ? CONTRAST_INK : (light ? GUIDE_MID : GUIDE));
    l.setAttribute("stroke-width", hc ? (light ? "2" : "2.5") : (light ? "1.5" : "2"));
    if (dashed) l.setAttribute("stroke-dasharray", "6 8");
    svg.appendChild(l);
  }

  // The band a ruling is measured against: baseline up to the top line.
  function traceBand() { return TRACE_BASE - TRACE_TOP; }
  // How tall one row has to be for the active ruling. A Lineatur row carries a
  // fourth line below the baseline that a three-line rule does not, so the row
  // grows rather than the Unterlange falling off the bottom of the viewBox.
  function traceRowHeight() {
    const r = ruling();
    return Math.max(TRACE_H, Math.round(TRACE_BASE + r.extra * traceBand() + 10));
  }

  function addRuling(svg, w) {
    const r = ruling();
    const band = traceBand();
    const y = (at) => TRACE_BASE - at * band;
    // The shaded Mittelband goes down first so every line still reads over it.
    if (r.band) {
      const top = y(r.band.to), bottom = y(r.band.from);
      const rect = document.createElementNS(SVGNS, "rect");
      rect.setAttribute("x", "8");
      rect.setAttribute("y", String(top));
      rect.setAttribute("width", String(Math.max(0, w - 16)));
      rect.setAttribute("height", String(Math.max(0, bottom - top)));
      rect.setAttribute("fill", GUIDE_MID);
      rect.setAttribute("opacity", highContrastOn() ? "0.28" : "0.16");
      svg.appendChild(rect);
    }
    if (r.verticals) {
      const step = r.verticals * band;
      const hc = highContrastOn();
      for (let x = 8 + step; x < w - 8; x += step) {
        const l = document.createElementNS(SVGNS, "line");
        l.setAttribute("x1", String(x));
        l.setAttribute("x2", String(x));
        l.setAttribute("y1", String(y(1)));
        l.setAttribute("y2", String(y(r.extra ? -r.extra : 0)));
        l.setAttribute("stroke", hc ? CONTRAST_INK : GUIDE_MID);
        l.setAttribute("stroke-width", hc ? "2" : "1.5");
        svg.appendChild(l);
      }
    }
    r.lines.forEach((line) => addGuide(svg, w, y(line.at), !!line.dashed, !!line.faint));
  }

  // A word rendered at a difficulty level, on a ruled baseline. The single
  // primitive behind both the live preview and every printed row.
  const TRACE_FONT_SIZE = 132;
  const TRACE_BASE = 158, TRACE_MID = 104, TRACE_TOP = 50, TRACE_H = 210;

  function traceWordSVG(word, level, opts) {
    const o = opts || {};
    const spec = levelSpec(level);
    const chars = [...String(word)];
    // The trace rows had no tracking at all, so a spacing choice that moved
    // the name preview would have left the sheet under it unchanged. The
    // viewBox grows with the gap, or a wider word is clipped instead of set.
    // track:false opts out, which the difficulty-ladder legend takes: those
    // samples illustrate fill, stroke and dash, and are built once at init,
    // so a spacing change must neither move them nor leave them stale.
    const trackPx = o.track === false ? 0 : TRACE_FONT_SIZE * spacingBoost;
    const w = Math.max(360, chars.length * (116 + trackPx) + 120);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " " + traceRowHeight());
    svg.setAttribute("class", "pt-trace-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", word + " — " + spec.label);
    if (o.guides !== false) {
      addRuling(svg, w);
    }
    if (!spec.blank) {
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", String(w / 2));
      t.setAttribute("y", String(TRACE_BASE));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", FONT);
      t.setAttribute("font-weight", "700");
      t.setAttribute("font-size", String(TRACE_FONT_SIZE));
      if (trackPx) {
        // dx pulls back half the trailing gap letter-spacing adds after the
        // final glyph, so a centred word stays centred -- the same correction
        // wordOutlineSVG already makes.
        t.setAttribute("letter-spacing", String(trackPx));
        t.setAttribute("dx", String(-trackPx / 2));
      }
      t.setAttribute("fill", spec.fill);
      if (spec.stroke && spec.stroke !== "none") {
        t.setAttribute("stroke", spec.stroke);
        t.setAttribute("stroke-width", String(spec.sw));
        if (spec.dash) t.setAttribute("stroke-dasharray", spec.dash);
        t.setAttribute("stroke-linecap", spec.cap || "round");
        t.setAttribute("stroke-linejoin", "round");
      }
      if (spec.opacity != null && spec.opacity !== 1) t.setAttribute("opacity", String(spec.opacity));
      t.textContent = word;
      svg.appendChild(t);
      if (o.overlay) addWordStrokeOverlay(svg, word, TRACE_FONT_SIZE, trackPx, TRACE_BASE, "alphabetic", w);
    }
    return svg;
  }

  const GEN_DEMO = CFG.genDemo || "Emma";

  function applyCase(word) {
    const mode = el.genCase ? el.genCase.value : "as-typed";
    if (mode === "upper") return word.toUpperCase();
    if (mode === "lower") return word.toLowerCase();
    if (mode === "title") return word.replace(/\b\w/g, (c) => c.toUpperCase());
    return word;
  }
  function genValue() {
    const raw = el.genInput ? el.genInput.value : "";
    const v = (raw && raw.trim()) ? raw.trim().slice(0, 42) : GEN_DEMO;
    return applyCase(v);
  }

  // Difficulty is one internal source of truth (1..7). The level buttons
  // (authored as crawlable HTML) and the age presets both set it; an optional
  // slider stays in sync when a page still ships one.
  let genLevelState = 2;
  function clampLevel(v) { return Math.max(1, Math.min(TRACE_LEVELS.length, v || 2)); }
  function genLevel() {
    if (el.genSlider) return clampLevel(parseInt(el.genSlider.value, 10));
    return clampLevel(genLevelState);
  }
  function setGenLevel(v) {
    genLevelState = clampLevel(v);
    if (el.genSlider) el.genSlider.value = String(genLevelState);
    renderGenPreview();
  }
  function genRowCount() {
    return Math.max(1, Math.min(8, parseInt((el.genRows && el.genRows.value) || "3", 10) || 3));
  }
  function genModelOn() { return !el.genModel || el.genModel.checked; }

  // Script picker (CFG.scriptOptions only, e.g. choosing between real German
  // school handwriting standards). Reassigns the shared FONT so every render
  // path — live preview, print sheet, PNG — repaints in the new script.
  function setGenScript(key) {
    if (!SCRIPT_OPTIONS) return;
    const opt = SCRIPT_OPTIONS.find((o) => o.key === key) || SCRIPT_OPTIONS[0];
    genScriptKey = opt.key;
    FONT = opt.font;
    if (el.genScript) {
      $$(".pt-gen-script-opt", el.genScript).forEach((b) => {
        const on = b.dataset.script === genScriptKey;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    withFont(renderGenPreview);
  }

  // A pasted class roster (one name per line) turns one print job into one
  // sheet per child — the workflow every teacher-facing worksheet generator
  // is expected to support. Capped so a stray paste can't build 500 sheets;
  // 60 leaves room for the whole Dolch primer list (52 words) as one packet.
  const ROSTER_CAP = 60;
  /* A roster line may carry its own difficulty: "Noah 2" prints Noah's sheet
     at level 2 while the rest of the class stays on the level the picker
     shows. This is the site's answer to the best-evidenced pain in the
     printables corpus -- a mixed-ability class needs one sheet per child AT
     THAT CHILD'S LEVEL, and the only way to get it was to set the level, print
     one child, change the level and print again. genSheetNode(word, level)
     has always taken both arguments; only the class-set loop passed one.

     A trailing number, because a number needs no translating: the level names
     ship in eight languages and a syntax built on them would work in one. The
     number must be separated by whitespace and be within the ladder, so
     "Anna 2" is a level and "R2D2" is a name. Anything else is the whole line.
     A line with no number gets the picker's level, which is what every line
     got before. */
  function rosterEntries(mount) {
    if (!mount) return [];
    return mount.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, ROSTER_CAP)
      .map((line) => {
        const m = line.match(/^(.*\S)\s+(\d{1,2})$/);
        if (m) {
          const lv = parseInt(m[2], 10);
          if (lv >= 1 && lv <= TRACE_LEVELS.length) return { name: m[1], level: lv };
        }
        return { name: line, level: null };
      });
  }
  function rosterNames(mount) {
    return rosterEntries(mount).map((e) => e.name);
  }

  /* Mount a class roster on a page that wants one but does not author the
     markup (CFG.roster === true). Seven English tools ship a roster and none
     of their locale siblings did, while T.classSet and T.classSetPngHint have
     shipped translated in all eight languages the whole time: a mount gap, not
     a translation gap. Every string here is one of those, so nothing is
     authored or translated at the call site, and the sample names in the
     placeholder are the same Emma/Noah/Ava the English and German pages
     already use. A page that authors its own roster is left alone. */
  function mountRoster(kind) {
    const input = $("#pt-" + kind + "-input");
    if (!input || $("#pt-" + kind + "-roster")) return null;
    const field = document.createElement("details");
    field.className = "pt-roster-field";
    const summary = document.createElement("summary");
    summary.textContent = T.classSet;
    field.appendChild(summary);
    const ta = document.createElement("textarea");
    ta.id = "pt-" + kind + "-roster";
    ta.className = "main-input";
    ta.rows = 5;
    ta.placeholder = "Emma\nNoah\nAva";
    ta.setAttribute("aria-label", T.classSet);
    field.appendChild(ta);
    const hint = document.createElement("p");
    hint.className = "pt-roster-hint";
    hint.textContent = T.classSetPngHint;
    field.appendChild(hint);
    const host = input.closest(".pt-field, .pt-name-field, .bubble-field") || input.parentElement;
    host.insertAdjacentElement("afterend", field);
    return ta;
  }

  /* Append a level to the sample names already in a roster placeholder, so the
     syntax is visible without a sentence. Idempotent, and it leaves the first
     sample bare so both forms are shown: a line with a level and a line
     without. Lines that are not plain sample names (the leading "one name per
     line" instruction, which every locale writes its own way) are recognised
     by already containing a space, and left alone. */
  function annotateRosterPlaceholder(mount) {
    if (!mount || !mount.placeholder || /\s\d+$/m.test(mount.placeholder)) return;
    const mid = Math.max(2, Math.min(TRACE_LEVELS.length, 2));
    const high = Math.max(mid + 1, Math.min(TRACE_LEVELS.length, 5));
    let sample = 0;
    mount.placeholder = mount.placeholder.split("\n").map((line) => {
      const t = line.trim();
      if (!t || /\s/.test(t)) return line;
      sample++;
      if (sample === 2) return line + " " + mid;
      if (sample === 3) return line + " " + high;
      return line;
    }).join("\n");
  }

  // Word-list preset buttons (page-authored, crawlable): a .pt-roster-preset
  // carries its whole list in data-words ("word|word|…") and one click fills
  // the roster textarea with it — the "print the whole Dolch list in one job"
  // path. Wired against whichever roster mount the page ships.
  function wireRosterPresets(mount, onFill) {
    if (!mount) return;
    $$(".pt-roster-preset").forEach((b) => {
      b.addEventListener("click", () => {
        const words = String(b.dataset.words || "").split("|").map((s) => s.trim()).filter(Boolean);
        if (!words.length) return;
        mount.value = words.join("\n");
        const field = mount.closest("details");
        if (field) field.open = true;
        if (onFill) onFill();
      });
    });
  }

  // The full worksheet as a DOM node — the SINGLE primitive behind both the
  // live paper preview and the printed sheet, so what you see is what prints.
  // `wordOverride` lets the class-set print path build one sheet per roster
  // name without touching the input field; `levelOverride` lets the ladder
  // pack build one sheet per difficulty level the same way.
  function genSheetNode(wordOverride, levelOverride) {
    const word = wordOverride != null ? applyCase(String(wordOverride).slice(0, 42)) : genValue();
    const level = levelOverride != null ? levelOverride : genLevel();
    const sheet = document.createElement("div");
    sheet.className = "pt-gen-sheet";
    // A solid model row on top so the target is always visible (unless the
    // chosen level already IS the solid model, or the user turned it off).
    if (genModelOn() && level !== 1) sheet.appendChild(genRow(word, 1));
    const traceCount = genRowCount();
    for (let i = 0; i < traceCount; i++) sheet.appendChild(genRow(word, level));
    // Finish on blank ruled lines for independent writing (skip if already blank).
    const blanks = level === TRACE_LEVELS.length ? 0 : 2;
    for (let i = 0; i < blanks; i++) sheet.appendChild(genRow(word, TRACE_LEVELS.length));
    sheet.appendChild(nameDateRow());
    return sheet;
  }

  function genRow(word, level) {
    const row = document.createElement("div");
    row.className = "pt-gen-row";
    row.appendChild(traceWordSVG(word, level, { guides: true, overlay: strokeOverlayOn() }));
    return row;
  }

  // A small inline sample of a level's look, injected into each level button
  // so the ladder shows — not just tells — dotted vs dashed vs faded.
  function levelSampleSVG(level) {
    if (levelSpec(level).blank) {
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("viewBox", "0 0 120 60");
      svg.setAttribute("class", "pt-level-sample");
      svg.setAttribute("aria-hidden", "true");
      addGuide(svg, 120, 42, false);
      return svg;
    }
    const svg = traceWordSVG("Aa", level, { guides: false, track: false });
    svg.setAttribute("class", "pt-trace-svg pt-level-sample");
    svg.setAttribute("aria-hidden", "true");
    return svg;
  }

  function updateGenUI() {
    const level = genLevel();
    const spec = levelSpec(level);
    if (el.genLevel) el.genLevel.textContent = T.level + " " + level + " · " + spec.label;
    if (el.genHint) el.genHint.textContent = spec.hint;
    // Level ladder buttons.
    $$(".pt-level", el.genLevels || document).forEach((b) => {
      const on = parseInt(b.dataset.level, 10) === level;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    // Age presets are shortcuts; light up the one that matches the level.
    if (el.genPresets) {
      $$(".pt-gen-preset", el.genPresets).forEach((b) => {
        const on = parseInt(b.dataset.level, 10) === level;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    if (el.genPreviewMeta) {
      const parts = [];
      if (genModelOn() && level !== 1) parts.push("1 " + plural(1, T.modelCount));
      parts.push(genRowCount() + " " + plural(genRowCount(), T.traceCount));
      if (level !== TRACE_LEVELS.length) parts.push("2 " + plural(2, T.blankCount));
      const rosterN = rosterNames(el.genRoster).length;
      if (rosterN >= 2) parts.push(rosterN + " " + T.sheets);
      el.genPreviewMeta.textContent = parts.join(" \u00b7 ") + " \u00b7 " + (PP && PP.paperLabel ? PP.paperLabel() : T.usLetter);
    }
    if (SCRIPT_OPTIONS) {
      const active = SCRIPT_OPTIONS.find((o) => o.key === genScriptKey) || SCRIPT_OPTIONS[0];
      const hintEl = $("#pt-gen-script-hint");
      if (hintEl) hintEl.textContent = active.hint || "";
    }
  }

  function renderGenPreview() {
    updateGenUI();
    if (!el.genPreview) return;
    el.genPreview.innerHTML = "";
    el.genPreview.appendChild(genSheetNode());
  }

  function buildGeneratorSheet() {
    const spec = levelSpec(genLevel());
    const entries = rosterEntries(el.genRoster);
    if (entries.length >= 2) {
      const set = document.createElement("div");
      set.className = "pt-class-set";
      appendSheetPages(set, entries, (e) => genSheetNode(e.name, e.level));
      // A mixed set has no one level to name, so the title says how many
      // sheets rather than asserting a level that is only true of some.
      const mixed = entries.some((e) => e.level != null && e.level !== genLevel());
      printWrap(joinWords([entries.length + " " + T.sheets, "\u00b7", mixed ? "" : spec.label, "\u00b7", siteCredit()]), set, "generator_sheet");
      return;
    }
    printWrap(joinWords([genValue(), "\u00b7", spec.label]), sheetPageNode(genSheetNode()), "generator_sheet");
  }

  // The whole difficulty ladder as one print job — one sheet per level,
  // easiest to hardest, same word. The graded progression is the thing the
  // level engine can batch that a static-PDF sheet never can.
  function buildGeneratorLadder() {
    const word = genValue();
    const set = document.createElement("div");
    set.className = "pt-class-set";
    appendSheetPages(set, TRACE_LEVELS, (spec, i) => genSheetNode(word, i + 1));
    printWrap(joinWords([word, "\u00b7", TRACE_LEVELS.length + " " + T.sheets, "\u00b7", siteCredit()]), set, "generator_ladder");
  }

  // Word at a level -> wide PNG (mirrors the SVG spec on Canvas).
  function genWordPNG(word, level) {
    const spec = levelSpec(level);
    withFont(() => {
      const width = 1600, height = 460, pad = 96;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      let fontSize = 300;
      ctx.font = "700 " + fontSize + "px " + FONT;
      const measured = ctx.measureText(word).width;
      if (measured > width - pad * 2) {
        fontSize = Math.max(60, Math.floor(fontSize * (width - pad * 2) / measured));
      }
      const base = Math.round(height * 0.72);
      // Ruled guides.
      const drawGuide = (y, dashed, faint) => {
        const light = dashed || faint;
        ctx.beginPath();
        ctx.setLineDash(dashed ? [6, 8] : []);
        ctx.lineWidth = light ? 1.5 : 2;
        ctx.strokeStyle = highContrastOn() ? CONTRAST_INK : (light ? GUIDE_MID : GUIDE);
        ctx.moveTo(pad * 0.5, y); ctx.lineTo(width - pad * 0.5, y); ctx.stroke();
      };
      // Same RULINGS table as the SVG sheet, so a French PNG and a French
      // printout cannot disagree about what a French exercise book looks like.
      const gBand = Math.round(fontSize * 0.74);
      const gr = ruling();
      const gy = (at) => Math.round(base - at * gBand);
      if (gr.band) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = GUIDE_MID;
        ctx.fillRect(pad * 0.5, gy(gr.band.to), width - pad, gy(gr.band.from) - gy(gr.band.to));
        ctx.restore();
      }
      if (gr.verticals) {
        const step = gr.verticals * gBand;
        ctx.save();
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = highContrastOn() ? CONTRAST_INK : GUIDE_MID;
        for (let x = pad * 0.5 + step; x < width - pad * 0.5; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, gy(1));
          ctx.lineTo(x, gy(gr.extra ? -gr.extra : 0));
          ctx.stroke();
        }
        ctx.restore();
      }
      gr.lines.forEach((l) => drawGuide(gy(l.at), !!l.dashed, !!l.faint));

      if (!spec.blank) {
        ctx.font = "700 " + fontSize + "px " + FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.lineJoin = "round";
        const scale = fontSize / TRACE_FONT_SIZE;
        ctx.globalAlpha = spec.opacity == null ? 1 : spec.opacity;
        if (spec.fill && spec.fill !== "none") {
          ctx.fillStyle = spec.fill;
          ctx.fillText(word, width / 2, base);
        }
        if (spec.stroke && spec.stroke !== "none") {
          ctx.strokeStyle = spec.stroke;
          ctx.lineWidth = Math.max(1, spec.sw * scale);
          ctx.lineCap = spec.cap || "round";
          const dash = (spec.dash || "").split(/\s+/).filter(Boolean).map((n) => Math.max(0.01, parseFloat(n) * scale));
          ctx.setLineDash(dash.length ? dash : []);
          ctx.strokeText(word, width / 2, base);
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
      }
      downloadCanvas(canvas, (PNG_PREFIX || "handwriting") + "-" + (slugify(word) || "word") + "-L" + level + ".png", "generator_word");
    });
  }

  function initGenerator() {
    if (!el.genInput && !el.genSlider && !el.genLevels) return;
    if (el.genInput) {
      let timer = null;
      el.genInput.addEventListener("input", () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(renderGenPreview, 120);
      });
    }
    if (el.genSlider) el.genSlider.addEventListener("input", () => setGenLevel(parseInt(el.genSlider.value, 10)));
    if (el.genCase) el.genCase.addEventListener("change", renderGenPreview);
    if (el.genRows) el.genRows.addEventListener("change", renderGenPreview);
    if (el.genModel) el.genModel.addEventListener("change", renderGenPreview);
    if (el.genScript && SCRIPT_OPTIONS) {
      $$(".pt-gen-script-opt", el.genScript).forEach((b) => {
        b.addEventListener("click", () => setGenScript(b.dataset.script));
      });
      setGenScript(genScriptKey);
    }
    // Level ladder — buttons authored in HTML (crawlable); wire + add samples.
    if (el.genLevels) {
      $$(".pt-level", el.genLevels).forEach((b) => {
        const lvl = parseInt(b.dataset.level, 10);
        const slot = b.querySelector(".pt-level-sample-slot");
        if (slot) slot.appendChild(levelSampleSVG(lvl));
        b.addEventListener("click", () => setGenLevel(lvl));
      });
    }
    if (el.genPresets) {
      $$(".pt-gen-preset", el.genPresets).forEach((b) => {
        b.addEventListener("click", () => setGenLevel(parseInt(b.dataset.level, 10)));
      });
    }
    if (el.genRoster) {
      /* Teach the per-line level by example rather than by sentence. The
         placeholder already lists sample names in the page's own language;
         appending a level to two of them shows the syntax with no word that
         needs translating, and it stays in step with whatever each of the
         eight locales wrote. Only the ladder tools get it -- the puzzle,
         design and name rosters have no levels and must not imply one. */
      annotateRosterPlaceholder(el.genRoster);
      let rosterTimer = null;
      el.genRoster.addEventListener("input", () => {
        if (rosterTimer) clearTimeout(rosterTimer);
        rosterTimer = setTimeout(updateGenUI, 150);
      });
      wireRosterPresets(el.genRoster, updateGenUI);
    }
    if (el.genPrint) el.genPrint.addEventListener("click", buildGeneratorSheet);
    if (el.genLadder) el.genLadder.addEventListener("click", buildGeneratorLadder);
    if (el.genPng) el.genPng.addEventListener("click", () => genWordPNG(genValue(), genLevel()));
    if (el.genSlider) genLevelState = clampLevel(parseInt(el.genSlider.value, 10));
    renderGenPreview();
  }

  /* ---------------------------------------------------------------
     Section: coloring-sheet designer
     Type a word/name -> a decorated, colorable, print-ready sheet with
     an optional heading, a signature/date footer, a decorative symbol
     border, and a multi-color interior fill (dots / stripes / hearts /
     stars) so a child colors many small regions (fine-motor practice).
     Everything is one self-contained SVG (native, client-side) so the
     preview, the print sheet, and the PNG stay in sync. Gated on
     #pt-design-input + #pt-design-preview so other pages are untouched.
     --------------------------------------------------------------- */

  const DESIGN = CFG.designer || {};
  const DESIGN_DEMO = DESIGN.demo || CFG.nameDemo || "Hello";

  /* Character budgets. Measured on the printed sheet (US Letter portrait,
     1 SVG unit = 0.175mm), not chosen by eye:

       chars   colourable interior (median)   verdict
         1-7            6.9 - 8.8 mm          a crayon tip (6-8mm) fits
           9                  3.6 mm          pencil only
       14-24            2.0 - 2.9 mm          a line to trace, not a region

     The interior HALVES between 7 and 9 characters, so `maxChars` caps the
     word where the sheet still does the job it claims to. Separately, the
     interior fill pattern tile is a fixed 8.41mm regardless of letter size,
     so past ~8 characters a letter is narrower than one tile and "Hearts"
     renders heart fragments rather than hearts -- `fillMaxChars` is that
     tighter, second limit on the same field. `headingMaxChars` is the width
     the heading band actually fits (~26 at 62px on a 1000-unit sheet); the
     field used to allow 48 and ran off both edges of the paper.
     All three are per-page config; the defaults keep every page that has not
     opted in rendering exactly as before. */
  const DESIGN_MAX = Math.max(1, DESIGN.maxChars || 24);
  const DESIGN_FILL_MAX = Math.max(1, DESIGN.fillMaxChars || DESIGN_MAX);
  const DESIGN_HEADING_MAX = Math.max(1, DESIGN.headingMaxChars || 48);
  // A roster heading carries this token where each child's name goes.
  const DESIGN_NAME_TOKEN = "{name}";
  const FILL_KINDS = ["plain", "dots", "stripes", "hearts", "stars"];
  const BORDER_SETS = Object.assign({
    none: "",
    stars: "★",
    hearts: "♥",
    dots: "●",
    flowers: "✿",
    party: "★ ♥ ✿"
  }, DESIGN.borders || {});

  let designUid = 0;
  // Selection state for the swatch button groups (fill + border). Buttons are
  // authored in HTML (crawlable) and drive this; falls back to <select> values
  // for any page still shipping selects.
  //   mode:    "outline" (colorable letters) | "dots" (numbered dot-to-dot)
  //   density: dot-to-dot difficulty key (see DOT_LEVELS)
  //   hint:    show the faint guide line through the dots
  const designState = { fill: "plain", border: "none", mode: "outline", density: "medium", hint: true, audience: "one" };

  function svgMake(tag, attrs, parent) {
    const node = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => { if (attrs[k] !== "" && attrs[k] != null) node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function starPath(cx, cy, outer, inner, points) {
    let d = "";
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outer : inner;
      const a = -Math.PI / 2 + i * step;
      d += (i === 0 ? "M" : "L") + (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1);
    }
    return d + "Z";
  }
  function heartPath(cx, cy, s) {
    const y = cy - s * 0.55;
    return "M" + cx + " " + (y + s * 0.35) +
      " C" + cx + " " + y + " " + (cx - s) + " " + y + " " + (cx - s) + " " + (y + s * 0.5) +
      " C" + (cx - s) + " " + (y + s * 1.05) + " " + cx + " " + (y + s * 1.35) + " " + cx + " " + (y + s * 1.65) +
      " C" + cx + " " + (y + s * 1.35) + " " + (cx + s) + " " + (y + s * 1.05) + " " + (cx + s) + " " + (y + s * 0.5) +
      " C" + (cx + s) + " " + y + " " + cx + " " + y + " " + cx + " " + (y + s * 0.35) + " Z";
  }

  /* The word field is authored either as one <textarea> holding up to two
     lines, or (older pages) as two separate <input>s. Both shapes resolve
     here so the rest of the designer never has to know which it is: two
     fields labelled "Name or word" and "Second line" were two answers to one
     question, which is the repetition this field set was collapsed to remove. */
  function designLines() {
    const raw = el.designInput ? el.designInput.value : "";
    const parts = (el.designInput && el.designInput.tagName === "TEXTAREA")
      ? String(raw).split(/\r?\n/)
      : [raw, el.designInput2 ? el.designInput2.value : ""];
    return parts.map((x) => String(x || "").trim().slice(0, DESIGN_MAX)).filter(Boolean).slice(0, 2);
  }
  function designText() {
    const lines = designLines();
    return lines.length ? lines[0] : DESIGN_DEMO;
  }
  // Optional second line ("Happy Birthday" / "Emma"): empty string when the
  // page has no second line or it is blank.
  function designLine2() {
    const lines = designLines();
    return lines.length > 1 ? lines[1] : "";
  }
  function designHeadingText() {
    return el.designHeading ? el.designHeading.value.trim().slice(0, DESIGN_HEADING_MAX) : "";
  }
  // The heading a given sheet carries. On a class set the heading is a
  // per-child string, not a constant: typing "Emma's Coloring Page" (which is
  // exactly what the placeholder suggested) and pasting a roster used to
  // print every child's sheet headed "Emma's". A {name} token wins where the
  // author used one; otherwise the Step-1 word is substituted, which is the
  // case a placeholder-follower actually lands in.
  function headingForName(heading, name) {
    if (!heading || !name) return heading;
    if (heading.indexOf(DESIGN_NAME_TOKEN) !== -1) return heading.split(DESIGN_NAME_TOKEN).join(name);
    const word = designText();
    if (!word) return heading;
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return heading.replace(new RegExp(esc, "gi"), name);
  }
  function designFillKind() {
    const v = el.designFillGroup ? designState.fill : (el.designFill ? el.designFill.value : "plain");
    return FILL_KINDS.indexOf(v) === -1 ? "plain" : v;
  }
  function designBorderKey() {
    return el.designBorderGroup ? designState.border : (el.designBorder ? el.designBorder.value : "none");
  }
  function designBorderSym() {
    return BORDER_SETS[designBorderKey()] || "";
  }

  // Mini swatch previews injected into the fill / border option buttons so the
  // choices are visible (not hidden inside a <select>).
  function fillSwatchSVG(kind) {
    const svg = svgMake("svg", { viewBox: "0 0 44 44", class: "pt-swatch-svg", "aria-hidden": "true" });
    const defs = svgMake("defs", null, svg);
    // White base so the swatch reads the same in light and dark mode…
    svgMake("rect", { x: 4, y: 4, width: 36, height: 36, rx: 9, fill: "#ffffff", stroke: INK, "stroke-width": 2.5 }, svg);
    // …then the tiled fill pattern on top for the non-plain kinds.
    if (kind !== "plain") {
      svgMake("rect", { x: 5, y: 5, width: 34, height: 34, rx: 8, fill: addFillPattern(defs, kind, "sw-" + kind), stroke: "none" }, svg);
    }
    return svg;
  }
  function borderSwatchSVG(key) {
    const sym = BORDER_SETS[key] || "";
    const svg = svgMake("svg", { viewBox: "0 0 44 44", class: "pt-swatch-svg", "aria-hidden": "true" });
    svgMake("rect", { x: 4, y: 4, width: 36, height: 36, rx: 9, fill: "#ffffff", stroke: "#d7dbe4", "stroke-width": 2 }, svg);
    const symbols = sym.split(" ").filter(Boolean);
    if (!symbols.length) {
      const dash = svgMake("text", { x: 22, y: 22, "text-anchor": "middle", "dominant-baseline": "central", "font-family": FONT, "font-size": 18, fill: "#c8ccd6" }, svg);
      dash.textContent = "—";
      return svg;
    }
    [10, 22, 34].forEach((x, i) => {
      const t = svgMake("text", { x: x, y: 12, "text-anchor": "middle", "dominant-baseline": "central", "font-family": FONT, "font-size": 11, fill: "#aab0bd" }, svg);
      t.textContent = symbols[i % symbols.length];
    });
    const big = svgMake("text", { x: 22, y: 27, "text-anchor": "middle", "dominant-baseline": "central", "font-family": FONT, "font-size": 17, fill: "#8b93a7" }, svg);
    big.textContent = symbols[0];
    return svg;
  }
  function designFooterOn() { return !!(el.designFooter && el.designFooter.checked); }

  // A tiled pattern of small outline shapes. Applied as the glyph's own
  // fill (fill="url(#pattern)") so it paints only inside the letters —
  // no clipPath needed (text-as-clip is unreliable across renderers).
  // Each little shape is a region a child colors -> multi-color / fine-motor.
  function addFillPattern(defs, kind, uid) {
    const isStripe = kind === "stripes";
    const pat = svgMake("pattern", {
      id: "ptpat" + uid, patternUnits: "userSpaceOnUse",
      width: isStripe ? 30 : 48, height: isStripe ? 30 : 48,
      patternTransform: isStripe ? "rotate(45)" : ""
    }, defs);
    const col = "#9aa3b2", sw = 3;
    if (kind === "dots") svgMake("circle", { cx: 24, cy: 24, r: 12, fill: "none", stroke: col, "stroke-width": sw }, pat);
    else if (kind === "stripes") svgMake("line", { x1: 15, y1: 0, x2: 15, y2: 30, stroke: col, "stroke-width": 6 }, pat);
    else if (kind === "hearts") svgMake("path", { d: heartPath(24, 24, 13), fill: "none", stroke: col, "stroke-width": sw }, pat);
    else if (kind === "stars") svgMake("path", { d: starPath(24, 25, 15, 7, 5), fill: "none", stroke: col, "stroke-width": sw }, pat);
    return "url(#ptpat" + uid + ")";
  }

  function addBorderRow(svg, symbols, y) {
    const count = 11, W = 1000, gap = (W - 120) / (count - 1);
    for (let i = 0; i < count; i++) {
      const t = svgMake("text", { x: 60 + i * gap, y: y, "text-anchor": "middle", "font-size": 34, fill: "#c8ccd6", "font-family": FONT }, svg);
      t.textContent = symbols[i % symbols.length];
    }
  }

  function addFooter(svg, y) {
    const field = (x, label, lineEnd) => {
      const t = svgMake("text", { x: x, y: y, "font-family": FONT, "font-size": 30, "font-weight": 600, fill: INK }, svg);
      t.textContent = label;
      svgMake("line", { x1: x + 110, y1: y + 6, x2: lineEnd, y2: y + 6, stroke: "#9aa3b2", "stroke-width": 2 }, svg);
    };
    field(90, T.nameLabel, 470);
    field(560, T.dateLabel, 910);
  }

  /* ---------------------------------------------------------------
     Dot-to-dot engine
     ---------------------------------------------------------------
     Type a name -> a numbered connect-the-dots version of it. There is no
     glyph path data in this project (letters are drawn via SVG/Canvas <text>
     with a font-family), so "points along the outline" are recovered by
     RASTERIZING each letter to an offscreen canvas, reading the pixels back
     with getImageData, and walking the ink boundary with Moore-neighbor
     contour tracing. The traced boundary is then resampled at even arc-length
     into the dots. Pure native Canvas — no path library, no server render.

     Design decisions (documented for future maintainers):
       * Per-LETTER rasterization (not one big word bitmap). Guarantees one
         clean silhouette per letter regardless of the font's letter-spacing,
         so adjacent letters never merge into an unreadable blob.
       * OUTER silhouette only (largest connected component per letter). A
         name reads fine from letter silhouettes; tracing counters/holes would
         need extra sub-sequences and hurt legibility. Uppercase is forced in
         the UI because capital silhouettes (A L E X) are far more iconic than
         lowercase counters (a e o), but the tracer itself is case-agnostic.
       * Disconnected accents (the tittle of i / j, or any smaller component)
         become a SINGLE dot at their centroid, numbered right after the main
         loop of the same letter — so "i" is a little stem plus one dot on top.
       * Numbering RESTARTS at 1 for each letter. A single 1..N run across a
         whole name forces long "pen-up" diagonals between letters and giant
         numbers on long names; per-letter closed loops render each letter as a
         self-contained, recognizable connect-the-dots shape — which is exactly
         how printable name dot-to-dots work.
       * Dot COUNT is allocated from a difficulty target total, shared across
         letters by outline perimeter and clamped, so the sheet stays legible
         whatever the name's length (fewer, bigger-gap dots = easier).
     --------------------------------------------------------------- */

  // Difficulty ladder: more dots = harder / more detail. `total` is the
  // whole-name target dot budget, shared out across the letters. `single` is
  // the per-character dot count used when the text is exactly one character —
  // the whole-word budgets all exceed the per-letter clamp for one character,
  // so without it every level would render a single letter identically (which
  // is why the per-letter pages historically hid the picker).
  /* Difficulty is DOTS PER LETTER, not dots per word, and that distinction is
     the whole fix. `total` was a whole-word budget divided across the letters
     while DOT_MIN floored each letter at 5, so on a long word the floor beat
     the budget and the levels collapsed into each other: measured, Easy and
     Medium rendered BYTE-IDENTICAL sheets from 11 characters up, and all four
     levels sat within 4% of each other by 20. The same arithmetic inverted
     the labels, since Easy on a 24-letter word produced 120 dots against
     Expert's 76 on a 4-letter one. Per-letter figures are calibrated to what
     each level drew for a 4-letter name before this change, so a short name
     looks the way it always did. `single` still drives the one-character
     pages, which were never affected. `total` is kept for any caller that
     still wants the old whole-word reading. */
  const DOT_LEVELS = [
    /* MERGE 2026-09-16 (PR #891 x PR #889): both sides changed this table for
       different surfaces and both changes are kept.

       `perLetter` is #891's: the shared whole-word `total` made the levels
       indistinguishable on long words (within 4% of each other by 20
       characters) and inverted the labels, so a word now gets a per-letter
       budget instead. `single` is #889's, and its easy value is the measured
       one: at 12 dots, 16 of 62 glyphs reproduced worse than 10% of their
       height and m, s and a were visibly mangled -- m lost a whole stem. 14
       fixes all three while staying clearly below medium's 16, so the ladder
       still means something; 15 was tried and rejected for sitting one dot
       under medium. #891 did not touch `single` (its own note says the
       one-character pages "were never affected"), so taking #889's numbers
       here loses nothing from either side. */
    { key: "easy",   label: T.dot.easy.label,   total: 26, perLetter: 7,  single: 14, hint: T.dot.easy.hint },
    { key: "medium", label: T.dot.medium.label, total: 42, perLetter: 10, single: 16, hint: T.dot.medium.hint },
    { key: "hard",   label: T.dot.hard.label,   total: 60, perLetter: 14, single: 19, hint: T.dot.hard.hint },
    { key: "expert", label: T.dot.expert.label, total: 84, perLetter: 19, single: 22, hint: T.dot.expert.hint }
  ];
  /* The smallest number face worth printing, in sheet units. A sheet unit is
     0.175mm on US Letter, so 17 units is about 8.5pt -- the point below which
     a dot-to-dot stops being usable by the child it is drawn for. Measured
     before this change: the old code let the face fall to its 12-unit clamp
     (6.0pt) with dots 1.12mm across and 0.83mm apart, i.e. overlapping. The
     count is now reduced until the numbers fit, rather than the numbers being
     shrunk until they do not. */
  const DOT_NUM_MIN = 17;
  /* What a level actually yields for one character, so the picker can say the
     real number instead of the nominal floor. Memoised per character and font
     because it traces, and the trace is the expensive half of a render. */
  const dotCountCache = new Map();
  function dotCornerCountFor(ch) {
    const key = String(ch) + "|" + FONT;
    if (dotCountCache.has(key)) return dotCountCache.get(key);
    let corners = 0;
    try {
      const R = dotRasterChar(ch);
      const cc = dotComponents(R.mask, R.w, R.h);
      const minArea = Math.max(24, R.w * R.h * 0.00035);
      const kept = cc.comps.filter((c) => c.area >= minArea).sort((a, b) => b.area - a.area);
      if (kept.length) {
        const main = kept[0];
        let sx = -1, sy = -1;
        for (let y = main.miny; y <= main.maxy && sy < 0; y++) {
          for (let x = main.minx; x <= main.maxx; x++) {
            if (cc.labels[y * R.w + x] === main.label) { sx = x; sy = y; break; }
          }
        }
        if (sx >= 0) corners = dotCornerIndices(dotMooreTrace(cc.labels, R.w, R.h, main.label, sx, sy), DOT_CORNER_DEGS[1]).length;
      }
    } catch (err) { corners = 0; }
    dotCountCache.set(key, corners);
    return corners;
  }
  function dotCountFor(ch, nominal) {
    const outer = Math.max(DOT_MIN, Math.min(DOT_MAX, Math.max(nominal, dotCornerCountFor(ch))));
    return outer + dotExtraCountFor(ch, outer);
  }

  /* Dots the counters and second shapes add on top of the outline, so the
     picker reports what the sheet actually draws: an O is its outline plus a
     ring, not just the outline. */
  const dotExtraCache = new Map();
  function dotExtraCountFor(ch, outerN) {
    const key = String(ch) + "|" + FONT + "|" + outerN;
    if (dotExtraCache.has(key)) return dotExtraCache.get(key);
    let extra = 0;
    try {
      const R = dotRasterChar(ch);
      const cc = dotComponents(R.mask, R.w, R.h);
      const minArea = Math.max(24, R.w * R.h * 0.00035);
      const kept = cc.comps.filter((c) => c.area >= minArea).sort((a, b) => b.area - a.area);
      if (kept.length) {
        const main = kept[0];
        let sx = -1, sy = -1;
        for (let y = main.miny; y <= main.maxy && sy < 0; y++) {
          for (let x = main.minx; x <= main.maxx; x++) { if (cc.labels[y * R.w + x] === main.label) { sx = x; sy = y; break; } }
        }
        if (sx >= 0) {
          const base = dotPerimeter(dotMooreTrace(cc.labels, R.w, R.h, main.label, sx, sy)) || 1;
          const rest = [];
          if (CFG.dotHoles !== false) dotHoleBoundaries(R.mask, R.w, R.h, main.area * DOT_HOLE_RATIO).forEach((b) => rest.push(b));
          kept.slice(1).forEach((cmp) => {
            if (cmp.area < main.area * DOT_SHAPE_RATIO) return;
            let ax = -1, ay = -1;
            for (let y = cmp.miny; y <= cmp.maxy && ay < 0; y++) {
              for (let x = cmp.minx; x <= cmp.maxx; x++) { if (cc.labels[y * R.w + x] === cmp.label) { ax = x; ay = y; break; } }
            }
            if (ax >= 0) rest.push(dotMooreTrace(cc.labels, R.w, R.h, cmp.label, ax, ay));
          });
          rest.forEach((b) => { extra += Math.max(DOT_LOOP_MIN, Math.min(DOT_MAX, Math.round(outerN * dotPerimeter(b) / base))); });
        }
      }
    } catch (err) { extra = 0; }
    dotExtraCache.set(key, extra);
    return extra;
  }

  function dotLevel(key) {
    for (let i = 0; i < DOT_LEVELS.length; i++) if (DOT_LEVELS[i].key === key) return DOT_LEVELS[i];
    return DOT_LEVELS[1];
  }

  // Raster geometry constants (offscreen, per letter). A shared baseline and
  // height keep every letter's y-coordinates comparable so the word sits on
  // one line with ascenders/descenders in the right place.
  const DOT_FS = 240, DOT_BASELINE = 270, DOT_CANVAS_H = 390, DOT_TRACKING = 0.14;
  const DOT_MIN = 5, DOT_MAX = 22;
  // Fewest dots a single contour may get, so a counter stays a recognisable ring.
  const DOT_LOOP_MIN = 5;
  // 8-neighbourhood in clockwise order (E, SE, S, SW, W, NW, N, NE).
  const DOT_N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function dotDirIndex(dx, dy) { for (let i = 0; i < 8; i++) if (DOT_N8[i][0] === dx && DOT_N8[i][1] === dy) return i; return 4; }

  // Rasterize one character to a black-on-white bitmap and return an ink mask.
  // Rasters are pure functions of the character and the font, and the ceiling
  // search below lays the same word out several times, so cache them.
  const dotRasterCache = Object.create(null);
  function dotRasterChar(ch) {
    if (dotRasterCache[ch]) return dotRasterCache[ch];
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = "700 " + DOT_FS + "px " + FONT;
    const adv = Math.max(DOT_FS * 0.28, probe.measureText(ch).width);
    const padX = Math.round(DOT_FS * 0.22);
    const w = Math.round(adv + padX * 2), h = DOT_CANVAS_H;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "700 " + DOT_FS + "px " + FONT;
    ctx.fillText(ch, padX, DOT_BASELINE);
    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = data[i * 4] < 128 ? 1 : 0;
    dotRasterCache[ch] = { mask: mask, w: w, h: h, adv: adv };
    return dotRasterCache[ch];
  }

  // Label 8-connected ink components (flood fill). Returns labels + per-component
  // area, bbox and centroid.
  function dotComponents(mask, w, h) {
    const labels = new Int32Array(w * h);
    const comps = [];
    const stack = [];
    let cur = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!mask[p] || labels[p]) continue;
      cur++;
      let minx = x, miny = y, maxx = x, maxy = y, area = 0, sx = 0, sy = 0;
      stack.length = 0; stack.push(p); labels[p] = cur;
      while (stack.length) {
        const q = stack.pop();
        const qx = q % w, qy = (q / w) | 0;
        area++; sx += qx; sy += qy;
        if (qx < minx) minx = qx; if (qx > maxx) maxx = qx;
        if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
        for (let k = 0; k < 8; k++) {
          const nx = qx + DOT_N8[k][0], ny = qy + DOT_N8[k][1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = ny * w + nx;
          if (mask[np] && !labels[np]) { labels[np] = cur; stack.push(np); }
        }
      }
      comps.push({ label: cur, area: area, minx: minx, miny: miny, maxx: maxx, maxy: maxy, cx: sx / area, cy: sy / area });
    }
    return { labels: labels, comps: comps };
  }

  // Moore-neighbor boundary tracing (clockwise) with Jacob's stopping
  // criterion. Returns the ordered outer-boundary pixels of one component.
  function dotMooreTrace(labels, w, h, label, startX, startY) {
    const ink = (x, y) => x >= 0 && y >= 0 && x < w && y < h && labels[y * w + x] === label;
    const boundary = [];
    let px = startX, py = startY, bx = startX - 1, by = startY;
    const first = [px, py];
    let second = null;
    boundary.push([px, py]);
    const maxG = w * h * 8;
    for (let guard = 0; guard < maxG; guard++) {
      const startIdx = dotDirIndex(bx - px, by - py);
      let foundIdx = -1;
      for (let k = 1; k <= 8; k++) {
        const ni = (startIdx + k) % 8;
        if (ink(px + DOT_N8[ni][0], py + DOT_N8[ni][1])) { foundIdx = ni; break; }
      }
      if (foundIdx === -1) break; // isolated pixel
      const prevIdx = (foundIdx + 7) % 8;
      bx = px + DOT_N8[prevIdx][0]; by = py + DOT_N8[prevIdx][1];
      px = px + DOT_N8[foundIdx][0]; py = py + DOT_N8[foundIdx][1];
      if (px === first[0] && py === first[1]) {
        if (second === null) break;
        const s2 = dotDirIndex(bx - px, by - py);
        let nxt = null;
        for (let k = 1; k <= 8; k++) {
          const ni = (s2 + k) % 8, ax = px + DOT_N8[ni][0], ay = py + DOT_N8[ni][1];
          if (ink(ax, ay)) { nxt = [ax, ay]; break; }
        }
        if (nxt && nxt[0] === second[0] && nxt[1] === second[1]) break;
      }
      if (second === null) second = [px, py];
      boundary.push([px, py]);
    }
    return boundary;
  }

  /* Resample a closed polyline into n points.

     CORNERS FIRST, then even arc length between them. The original was pure
     even-arc-length, which is optimal for a circle and wrong for a letter: it
     places dots wherever the spacing falls, so every corner of the letterform
     lands BETWEEN two dots and joining the dots cuts it off. Measured on the
     shipped tracer at medium (16 dots), against the real traced outline:

       E  12 corners, 9 with no dot within 4% of letter height, arms visibly
          tilted because the horizontals were being cut diagonally
       M  10 of 13 corners missed, outline off by 16.9% of letter height
       W  10 of 13 missed, 16.5%          A  6 of 8 missed, the crossbar
                                             notch skipped entirely
       O  0 corners, 1.6% -- already perfect, and must stay that way

     A dot-to-dot is drawn by a child joining the dots with a ruler or a
     freehand line, so a corner with no dot on it cannot be drawn at all. That
     makes corner placement correctness, not polish. Curves are unaffected:
     with no corners detected this falls through to the original even spacing,
     byte for byte. */
  /* Which candidate sampling wins is DECIDED, not assumed. Forcing a dot onto
     every corner is right for a letter built from straight strokes and can be
     wrong for a mostly-round one: on S it spent dots on two gentle turns and
     starved the curves, making the outline worse than plain even spacing
     (10.4% -> 11.4%). So three samplings are built and scored against the real
     traced boundary, and the best one is returned. That makes a regression
     impossible by construction rather than by threshold-tuning, and it costs
     about 13k float ops for a 22-dot letter. */
  function dotWorstDeviation(boundary, dots) {
    let worst = 0;
    for (let i = 0; i < boundary.length; i++) {
      const p = boundary[i];
      let best = Infinity;
      for (let k = 0; k < dots.length; k++) {
        const a = dots[k], b = dots[(k + 1) % dots.length];
        const vx = b[0] - a[0], vy = b[1] - a[1];
        const L2 = vx * vx + vy * vy;
        let t = L2 ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2 : 0;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const d = Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t));
        if (d < best) best = d;
      }
      if (best > worst) worst = best;
    }
    return worst;
  }

  function dotResampleClosed(pts, n) {
    const m = pts.length;
    if (m < 2 || n < 1) return pts.slice(0, Math.max(1, n));
    const candidates = [dotEvenClosed(pts, n)];
    for (const deg of DOT_CORNER_DEGS) {
      const c = dotCornerClosed(pts, n, deg);
      if (c && c.length) candidates.push(c);
    }
    let best = candidates[0], bestErr = dotWorstDeviation(pts, candidates[0]);
    for (let i = 1; i < candidates.length; i++) {
      const err = dotWorstDeviation(pts, candidates[i]);
      if (err < bestErr) { bestErr = err; best = candidates[i]; }
    }
    return best;
  }

  const DOT_CORNER_WIN = 8;    // +/- boundary samples the turning angle spans
  const DOT_CORNER_DEGS = [45, 55, 75];  // corner thresholds to try, in degrees
  const DOT_CORNER_GAP = 10;   // min samples between two kept corners

  // Turning angle at every boundary sample, then local maxima above the
  // threshold, thinned so one physical corner yields one index.
  function dotCornerIndices(pts, minDeg) {
    const m = pts.length;
    if (m < DOT_CORNER_WIN * 2 + 1) return [];
    const deg = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      const a = pts[(i - DOT_CORNER_WIN + m) % m], p = pts[i], b = pts[(i + DOT_CORNER_WIN) % m];
      const a1 = Math.atan2(p[1] - a[1], p[0] - a[0]);
      const a2 = Math.atan2(b[1] - p[1], b[0] - p[0]);
      let d = Math.abs(a2 - a1);
      if (d > Math.PI) d = 2 * Math.PI - d;
      deg[i] = d * 180 / Math.PI;
    }
    const picked = [];
    for (let i = 0; i < m; i++) {
      if (deg[i] < minDeg) continue;
      let top = true;
      for (let k = -6; k <= 6; k++) { if (deg[(i + k + m) % m] > deg[i]) { top = false; break; } }
      if (!top) continue;
      if (picked.some((j) => Math.min(Math.abs(j - i), m - Math.abs(j - i)) < DOT_CORNER_GAP)) continue;
      picked.push(i);
    }
    return picked.map((i) => ({ i: i, deg: deg[i] }));
  }

  function dotCumulative(pts) {
    const m = pts.length;
    const cum = new Float64Array(m + 1);
    for (let i = 1; i <= m; i++) {
      const a = pts[i - 1], b = pts[i % m];
      cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return cum;
  }

  function dotPointAtArc(pts, cum, t) {
    const m = pts.length;
    let lo = 0, hi = m;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] <= t) lo = mid + 1; else hi = mid; }
    const i = Math.max(1, lo) - 1;
    const segLen = (cum[i + 1] - cum[i]) || 1;
    const f = (t - cum[i]) / segLen;
    const a = pts[i % m], b = pts[(i + 1) % m];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  // The original algorithm, kept intact as the no-corner path.
  function dotEvenClosed(pts, n) {
    const m = pts.length;
    const cum = dotCumulative(pts);
    const total = cum[m] || 1;
    const out = [];
    for (let k = 0; k < n; k++) out.push(dotPointAtArc(pts, cum, (k / n) * total));
    return out;
  }

  function dotCornerClosed(pts, n, minDeg) {
    const m = pts.length;
    let corners = dotCornerIndices(pts, minDeg);
    // More corners than the budget: keep the sharpest, so a low difficulty
    // still spends every dot it has on the most letter-defining turns.
    if (corners.length > n) {
      corners = corners.slice().sort((a, b) => b.deg - a.deg).slice(0, n).sort((a, b) => a.i - b.i);
    }
    if (!corners.length) return null;

    const cum = dotCumulative(pts);
    const total = cum[m] || 1;
    const keep = corners.map((c) => c.i);
    const gaps = keep.map((a, gi) => {
      const b = keep[(gi + 1) % keep.length];
      return { a: a, len: (b > a ? cum[b] - cum[a] : total - cum[a] + cum[b]) };
    });
    // Share the leftover dots across the gaps by arc length, largest-remainder
    // so the count comes out exactly n and a hairline gap gets none.
    const remain = n - keep.length;
    const spanTotal = gaps.reduce((t, g) => t + g.len, 0) || 1;
    const exact = gaps.map((g) => remain * g.len / spanTotal);
    const extra = exact.map(Math.floor);
    let used = extra.reduce((t, v) => t + v, 0);
    const byFrac = exact.map((e, i) => ({ i: i, frac: e - Math.floor(e) })).sort((x, y) => y.frac - x.frac);
    for (let k = 0; used < remain && byFrac.length; k++, used++) extra[byFrac[k % byFrac.length].i]++;

    const out = [];
    gaps.forEach((g, gi) => {
      out.push([pts[g.a][0], pts[g.a][1]]);
      const k = extra[gi];
      for (let sIdx = 1; sIdx <= k; sIdx++) {
        out.push(dotPointAtArc(pts, cum, (cum[g.a] + g.len * sIdx / (k + 1)) % total));
      }
    });
    return out;
  }

  /* ---- multi-contour tracing (2026-09-16) ----------------------------
     Until now the tracer kept the OUTER SILHOUETTE of the largest connected
     component and nothing else, which cost two different things:

       * counters. O lost 65.6% of its area to a hole that was never drawn,
         Q 56.2%, D 53.6%, o 44.2%, 0 43.8% -- so a dot-to-dot O was a disc.
         20 glyphs have a counter, the smallest being e at 13.3%.
       * second shapes. "=" is two bars and the second one IS 100% of the
         first, so half the glyph became a single centroid dot; "%" lost two
         circles at 99.9% and 74.7%.

     Both are now traced as their own closed loops. The thresholds come from
     that measurement rather than taste: a second component is a SHAPE at
     >= 50% of the main (= and % sit at 74.7-100) and a DOT below it (the i
     tittle is 18.9%, j 12.9%, ? 16.6%, ! 29%), and a hole counts at >= 5%
     (every real counter is >= 13.3%, and nothing at all falls between 1% and
     13.3%, so the cut is unambiguous). */
  const DOT_SHAPE_RATIO = 0.50;   // second component this big is traced, not dotted
  const DOT_HOLE_RATIO  = 0.05;   // hole this big relative to the main is a counter

  // Background reachable from the border. Anything not ink and not reached is
  // inside a counter.
  function dotOuterBackground(mask, w, h) {
    const seen = new Uint8Array(w * h);
    const st = [];
    for (let x = 0; x < w; x++) { st.push(x); st.push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { st.push(y * w); st.push(y * w + w - 1); }
    while (st.length) {
      const q = st.pop();
      if (seen[q] || mask[q]) continue;
      seen[q] = 1;
      const x = q % w, y = (q / w) | 0;
      if (x > 0) st.push(q - 1);
      if (x < w - 1) st.push(q + 1);
      if (y > 0) st.push(q - w);
      if (y < h - 1) st.push(q + w);
    }
    return seen;
  }

  /* The counters of one glyph, as traced boundaries. Each hole is labelled as
     if it were ink and handed to the same Moore tracer the outline uses, so
     there is one boundary walker in this file rather than two that could
     disagree. */
  function dotHoleBoundaries(mask, w, h, minArea) {
    const outside = dotOuterBackground(mask, w, h);
    const hl = new Int32Array(w * h);
    const out = [];
    let n = 0;
    for (let i = 0; i < w * h; i++) {
      if (mask[i] || outside[i] || hl[i]) continue;
      n++;
      let area = 0, sx = -1, sy = -1;
      const st = [i];
      hl[i] = n;
      while (st.length) {
        const q = st.pop();
        area++;
        const x = q % w, y = (q / w) | 0;
        if (sy < 0 || y < sy || (y === sy && x < sx)) { sx = x; sy = y; }
        const nb = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1];
        for (const nq of nb) { if (nq < 0 || mask[nq] || outside[nq] || hl[nq]) continue; hl[nq] = n; st.push(nq); }
      }
      if (area >= minArea && sx >= 0) out.push(dotMooreTrace(hl, w, h, n, sx, sy));
    }
    return out;
  }

  function dotPerimeter(pts) {
    let p = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      p += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return p;
  }

  // Trace a whole word into per-letter dot sets laid out on a shared baseline.
  // Returns { letters:[{loops,accentPts,cx,cy}], bbox } in raster units, where
  // loops is the outline plus any counters and second shapes.
  /* A single fixed dot count cannot serve both O and m. O has no corners and
     is drawn perfectly by 8; lowercase m has about twenty and is a zigzag at
     twelve. Measured across all 62 glyphs at the old easy budget of 12, 16 of
     them reproduced worse than 10% of their height, worst W at 23.0% and m at
     21.1%.

     Raising the whole ladder was the obvious fix and the wrong one: 15 dots
     gets easy to 4 glyphs over 10%, but the ladder is 12/16/19/22, so easy
     would then sit one dot below medium and the difficulty picker would stop
     meaning anything.

     So the level sets a FLOOR, not a fixed count, and a letter gets at least
     as many dots as it has corners (capped at DOT_MAX). Easy now means "the
     fewest dots that still draw this letter" rather than "twelve dots
     whatever the letter is". A round letter is unchanged; only corner-rich
     ones lift, and they lift exactly as far as they need to.

     Single characters only. For a word the budget is shared out by perimeter
     and a per-letter floor would blow it.

     MEASURED 2026-09-16: with the shipped font this floor never fires. The
     most cornered glyph in the charset is 13 (M, W, w) and the lowest level
     is now 14, so every level already clears every letter. It is kept rather
     than deleted because FONT is mutable at runtime (CFG.scriptOptions lets a
     page switch script), and a different face has different corner counts --
     which is also why dotCountCache keys on FONT. Do not read a passing sheet
     as evidence that this code path works; it is currently unreachable. */
  /* MERGE 2026-09-16: the third parameter meant different things on the two
     sides and both are needed, so both are here. `perLetterMode` (#891) gives
     each letter of a WORD its own budget; `singleMode` (#889) applies the
     corner floor above, and only ever to a ONE-character sheet -- as #889's
     note says, a per-letter floor would blow a shared word budget. They are
     mutually exclusive by construction: dotBudgetFor() sets one or the other.
     `singleMode` is last so dotCeiling()'s existing 4-argument call still
     reads correctly. */
  function dotWordGeometry(text, budget, perLetterMode, singleMode) {
    const chars = [...String(text)];
    const raw = [];
    let xoff = 0;
    const wantExtra = !!singleMode;
    chars.forEach((ch) => {
      if (ch === " ") { xoff += DOT_FS * 0.34; return; }
      const R = dotRasterChar(ch);
      const cc = dotComponents(R.mask, R.w, R.h);
      const minArea = Math.max(24, R.w * R.h * 0.00035);
      const kept = cc.comps.filter((c) => c.area >= minArea).sort((a, b) => b.area - a.area);
      if (!kept.length) { xoff += R.adv * (1 + DOT_TRACKING); return; }
      const main = kept[0];
      let sx = -1, sy = -1;
      for (let y = main.miny; y <= main.maxy && sy < 0; y++) {
        for (let x = main.minx; x <= main.maxx; x++) { if (cc.labels[y * R.w + x] === main.label) { sx = x; sy = y; break; } }
      }
      const boundary = dotMooreTrace(cc.labels, R.w, R.h, main.label, sx, sy);
      const contours = [boundary];
      /* Counters, then any second component big enough to be a shape rather
         than a tittle. Everything below that ratio stays a single centroid
         dot, which is what an i/j tittle and the dot of a ! or ? should be. */
      /* Counters and second shapes are for a SINGLE-character sheet only.
         Measured: on a word they roughly double the dot density in a layout
         that is already tight, and "BOB" at medium went from 42 dots to 71 and
         stopped reading as a word -- several letters share the page width
         there, so a counter ring sits a few millimetres inside an already
         small O. On a per-letter page the glyph fills the sheet and the ring
         has room. Typing a single "=" into the name tool still counts as
         single, which is how that glyph gets both of its bars. */
      if (wantExtra && CFG.dotHoles !== false) {
        dotHoleBoundaries(R.mask, R.w, R.h, main.area * DOT_HOLE_RATIO).forEach((b) => contours.push(b));
      }
      const accents = [];
      kept.slice(1).forEach((cmp) => {
        if (wantExtra && cmp.area >= main.area * DOT_SHAPE_RATIO) {
          let ax = -1, ay = -1;
          for (let y = cmp.miny; y <= cmp.maxy && ay < 0; y++) {
            for (let x = cmp.minx; x <= cmp.maxx; x++) { if (cc.labels[y * R.w + x] === cmp.label) { ax = x; ay = y; break; } }
          }
          if (ax >= 0) {
            contours.push(dotMooreTrace(cc.labels, R.w, R.h, cmp.label, ax, ay));
            if (CFG.dotHoles !== false) {
              // "%" carries a counter inside each of its circles.
              dotHoleBoundaries(R.mask, R.w, R.h, cmp.area * DOT_HOLE_RATIO)
                .filter((hb) => hb.some((pt) => pt[0] >= cmp.minx && pt[0] <= cmp.maxx && pt[1] >= cmp.miny && pt[1] <= cmp.maxy))
                .forEach((hb) => { if (!contours.some((c) => c[0][0] === hb[0][0] && c[0][1] === hb[0][1])) contours.push(hb); });
            }
            return;
          }
        }
        accents.push(cmp);
      });
      const perims = contours.map(dotPerimeter);
      const perim = perims.reduce((t, v) => t + v, 0);
      raw.push({ boundary: boundary, contours: contours, perims: perims, perim: perim, xoff: xoff, main: main, accents: accents });
      xoff += R.adv * (1 + DOT_TRACKING);
    });
    const totalPerim = raw.reduce((s, r) => s + r.perim, 0) || 1;
    // Per-letter mode shares the budget around the MEAN letter, so a letter
    // with more outline than its neighbours still gets proportionally more
    // dots while the average stays at the level the visitor picked.
    const meanPerim = totalPerim / (raw.length || 1);
    const letters = [];
    raw.forEach((r) => {
      let n = perLetterMode
        ? Math.round(budget * (r.perim / meanPerim))
        : Math.round((r.perim / totalPerim) * budget);
      // #889's corner floor: a letter gets at least as many dots as it has
      // corners, so easy means "the fewest dots that still draw this letter".
      if (singleMode) n = Math.max(n, dotCornerIndices(r.boundary, DOT_CORNER_DEGS[1]).length);
      n = Math.max(DOT_MIN, Math.min(DOT_MAX, n));
      /* The level's count is the OUTLINE's count, and every further contour
         gets dots ON TOP of it rather than a share of it.

         Sharing was tried first and is a real regression, which is why this is
         written down: at 16 dots an O came out as an 11-dot outer ring around a
         5-dot inner one and read worse than the filled disc it replaced, and B
         split three ways into something unrecognisable. That is exactly the
         cost the original tracer's comment predicted when it chose outer
         silhouette only. Additive keeps the outline byte-for-byte what it was
         before counters existed, so nothing that works today gets worse. A
         counter is scaled by its own perimeter against the outline's, floored
         at DOT_LOOP_MIN so it stays a ring rather than a triangle. */
      const loops = [];
      const outerN = n;
      loops.push(dotResampleClosed(r.contours[0], outerN).map((p) => [p[0] + r.xoff, p[1]]));
      const basePerim = r.perims[0] || 1;
      for (let ci = 1; ci < r.contours.length; ci++) {
        const k = Math.max(DOT_LOOP_MIN, Math.min(DOT_MAX, Math.round(outerN * r.perims[ci] / basePerim)));
        loops.push(dotResampleClosed(r.contours[ci], k).map((p) => [p[0] + r.xoff, p[1]]));
      }
      const accentPts = r.accents.map((c) => [c.cx + r.xoff, c.cy]);
      letters.push({ loops: loops, accentPts: accentPts, cx: r.main.cx + r.xoff, cy: r.main.cy });
    });
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    letters.forEach((L) => {
      L.loops.reduce((a, l) => a.concat(l), []).concat(L.accentPts).forEach((p) => {
        if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
      });
    });
    if (!letters.length) return { letters: letters, bbox: { minx: 0, miny: 0, maxx: 1, maxy: 1 } };
    return { letters: letters, bbox: { minx: minx, miny: miny, maxx: maxx, maxy: maxy } };
  }

  // Fit the traced geometry into a target box and produce final, output-ready
  // dots (with numbers) + closed hint loops. Consumed by both SVG and Canvas
  // so the preview, print and PNG stay identical.
  /* One pass at a given budget. Split out of layoutDotWord so the budget can
     be reduced and the pass re-run until the printed numbers are legible --
     see DOT_NUM_MIN. `med` is returned because it is what decides that.

     MERGE 2026-09-16: #889's own layoutDotWord() is superseded by this plus
     dotBudgetFor() below, which already branches on a one-character sheet.
     Keeping both definitions would have left two functions of the same name
     in one scope, the second silently shadowing the first. #889's behaviour
     is not lost -- its single-character branch is dotBudgetFor's `drawn <= 1`
     case and its corner floor rides `singleMode` into dotWordGeometry. */
  function layoutDotWordAt(text, budget, perLetterMode, box, singleMode, startAt) {
    const geom = dotWordGeometry(text, budget, perLetterMode, singleMode);
    const b = geom.bbox;
    const bw = Math.max(1, b.maxx - b.minx), bh = Math.max(1, b.maxy - b.miny);
    const scale = Math.min(box.w / bw, box.h / bh);
    const ox = box.x + (box.w - bw * scale) / 2 - b.minx * scale;
    const oy = box.y + (box.h - bh * scale) / 2 - b.miny * scale;
    const tx = (p) => [p[0] * scale + ox, p[1] * scale + oy];
    const letters = [];
    const all = [];
    /* ONE sequence for the whole word, not one per letter. A name restarting
       at 1 on every letter cannot be solved as a name: the child finishes E,
       finds a second 1 somewhere to the right and has no way to know it comes
       next. Numbering already ran on across the contours WITHIN a letter for
       exactly this reason; it simply stopped at the letter boundary. A
       single-character sheet is unaffected, because it has one letter. */
    let num = startAt || 1;
    geom.letters.forEach((L) => {
      const cpt = tx([L.cx, L.cy]);
      // One closed loop per contour: the outline, then any counter, then any
      // second shape. Numbering runs on across them, so the child finishes one
      // ring, lifts the pen and starts the next at the following number.
      const loops = L.loops.map((lp) => lp.map(tx));
      const dots = [];
      loops.forEach((lp) => {
        lp.forEach((p) => { dots.push({ x: p[0], y: p[1], label: num++, accent: false, cx: cpt[0], cy: cpt[1] }); all.push(p); });
      });
      L.accentPts.map(tx).forEach((p) => { dots.push({ x: p[0], y: p[1], label: num++, accent: true, cx: cpt[0], cy: cpt[1] }); all.push(p); });
      letters.push({ loops: loops, dots: dots });
    });
    // Adaptive dot / number size from the MEDIAN nearest-neighbour distance
    // (median, not min, so a single coincident pair doesn't shrink everything).
    const nn = [];
    for (let i = 0; i < all.length; i++) {
      let best = 1e9;
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(all[i][0] - all[j][0], all[i][1] - all[j][1]);
        if (d < best) best = d;
      }
      if (best < 1e8) nn.push(best);
    }
    nn.sort((a, b2) => a - b2);
    const med = nn.length ? nn[Math.floor(nn.length / 2)] : 40;
    const dotR = Math.max(3.2, Math.min(11, med * 0.17));
    const numF = Math.max(12, Math.min(30, med * 0.6));
    return { letters: letters, dotR: dotR, numF: numF, med: med, nextLabel: num };
  }

  /* The most dots per letter this word can carry in this box before the
     printed numbers fall below DOT_NUM_MIN. Computed ONCE per word, not per
     level, and that is the point: the first version searched down from each
     level's own starting budget and the search was not monotonic, so at ten
     characters Medium and Hard switched off while Expert came back with MORE
     dots than either. A single ceiling every level is clamped against cannot
     invert. Spacing is inversely proportional to the count, so one corrective
     step from a reference layout lands close and a second refines it. */
  const dotCeilCache = { key: "", value: 0 };
  function dotCeiling(text, box) {
    const key = text + "|" + [box.x, box.y, box.w, box.h].join(",");
    if (dotCeilCache.key === key) return dotCeilCache.value;
    const need = DOT_NUM_MIN / 0.6;
    let per = DOT_MAX;
    // Every pass must make progress, or a Newton step that rounds back to
    // where it started stalls and the search returns a budget it has not
    // actually shown to be legible -- which is how Hard still printed 7.4pt
    // numbers after the first version of this loop said it was fine.
    for (let pass = 0; pass < 8 && per > DOT_MIN; pass++) {
      const trial = layoutDotWordAt(text, per, true, box);
      if (trial.med >= need) break;
      const step = Math.floor(per * (trial.med / need));
      per = Math.max(DOT_MIN, Math.min(per - 1, step));
    }
    dotCeilCache.key = key;
    dotCeilCache.value = per;
    return per;
  }

  /* What a given level actually delivers here. Returned separately from the
     layout so the UI can switch off a level it cannot draw instead of
     silently rendering a sheet identical to the level below. */
  function dotBudgetFor(text, level, box) {
    const lvl = dotLevel(level);
    const chars = [...String(text)].filter((c) => c !== " ");
    const drawn = chars.length;
    if (drawn <= 1) {
      /* MERGE 2026-09-16: the one-character branch reports the FLOORED count,
         not the nominal one, so the picker's number is the number the sheet
         actually draws. That is #889's dotCountFor() reading, kept here rather
         than in its own layoutDotWord(); dotWordGeometry applies the same
         floor via singleMode, and max(max(n,c),c) === max(n,c), so the two
         agree by construction instead of by coincidence. */
      const budget = dotCountFor(chars[0] || CHARS[0], lvl.single);
      return { budget: budget, perLetterMode: false, singleMode: true, capped: false, wanted: lvl.single };
    }
    const wanted = lvl.perLetter;
    const budget = Math.max(DOT_MIN, Math.min(wanted, dotCeiling(text, box)));
    return { budget: budget, perLetterMode: true, singleMode: false, capped: budget < wanted, wanted: wanted };
  }

  function layoutDotWord(text, level, box, startAt) {
    const plan = dotBudgetFor(text, level, box);
    const lay = layoutDotWordAt(text, plan.budget, plan.perLetterMode, box, plan.singleMode, startAt);
    lay.budget = plan.budget;
    lay.capped = plan.capped;
    return lay;
  }

  // Offset a number label radially outward from its letter centroid so it sits
  // clear of the outline where possible.
  function dotLabelPos(dot, dotR, numF, angleDeg) {
    let vx = dot.x - dot.cx, vy = dot.y - dot.cy;
    const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
    if (angleDeg) {
      const a = angleDeg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
      const rx = vx * c - vy * sn, ry = vx * sn + vy * c;
      vx = rx; vy = ry;
    }
    const off = dotR + numF * 0.62;
    return { x: dot.x + vx * off, y: dot.y + vy * off + numF * 0.34 };
  }

  /* Place every number once, for the whole sheet, avoiding the ones already
     placed. Each label is pushed outward from its own letter's centroid, and
     two dots from neighbouring letters can push their labels into the same
     spot: measured on "EMMA", the 5 of one letter and the 13 of the next
     printed as "513", which reads as a dot to visit after 512. Continuous
     numbering makes two-digit labels arrive sooner, so this is the other half
     of that fix rather than a separate polish.

     The search only rotates the outward direction, never moves a label off
     its dot, so a number always sits on the ring it belongs to. A label that
     cannot be placed anywhere keeps its first position -- an overlap is worse
     than a wrong-looking gap, but a missing number is worse than both. */
  /* A dot-to-dot word is fitted to the band by width, so a long name is drawn
     small: measured on /printables/dot-to-dot-name/, "Alexander" reaches 86%
     of the sheet width and 6.6% of its height, which is the geometry of nine
     letters in a row on a portrait page rather than a layout defect. Splitting
     a long single-line name across the two stacked bands the designer already
     builds for a deliberate two-line entry roughly doubles the letter size.

     Only when it genuinely helps: the split is taken when the longer half is
     meaningfully shorter than the whole, so a short name is never broken up
     and a visitor who typed their own second line is never overridden. The
     break prefers a space, so "Anna Marie" splits where a person would. */
  const DOT_WRAP_MIN = 6;
  function dotAutoLines(text, lines) {
    if (lines.length !== 1) return lines;
    const str = String(text);
    const chars = [...str];
    if (chars.length < DOT_WRAP_MIN) return lines;
    const sp = str.lastIndexOf(" ", Math.ceil(str.length / 2) + 2);
    const cut = sp > 0 && sp < str.length - 1 ? sp : Math.ceil(chars.length / 2);
    const a = chars.slice(0, cut).join("").trim();
    const b = chars.slice(sp > 0 ? cut + 1 : cut).join("").trim();
    if (!a || !b) return lines;
    // Two half-bands are each a little under half the full band, so the split
    // has to buy more than a 2x reduction in line length to be worth taking.
    const longer = Math.max([...a].length, [...b].length);
    return longer * 2 <= chars.length + 1 ? [a, b] : lines;
  }

  const DOT_LABEL_ANGLES = [0, 28, -28, 56, -56, 84, -84, 112, -112, 140, -140, 168];
  function placeDotLabels(lay) {
    const placed = [];
    const hits = (r) => placed.some((q) =>
      Math.abs(r.x - q.x) * 2 < (r.w + q.w) && Math.abs(r.y - q.y) * 2 < (r.h + q.h));
    lay.letters.forEach((L) => {
      L.dots.forEach((d) => {
        const digits = String(d.label).length;
        // Advance of a bold numeral is close to 0.6em; the white halo the
        // painters stroke around it adds a little on every side.
        const w = lay.numF * 0.62 * digits + lay.numF * 0.2;
        const h = lay.numF * 1.02;
        let chosen = null;
        for (let i = 0; i < DOT_LABEL_ANGLES.length; i++) {
          const pos = dotLabelPos(d, lay.dotR, lay.numF, DOT_LABEL_ANGLES[i]);
          const rect = { x: pos.x, y: pos.y - lay.numF * 0.34, w: w, h: h };
          if (i === 0) chosen = { pos: pos, rect: rect };
          if (!hits(rect)) { chosen = { pos: pos, rect: rect }; break; }
        }
        placed.push(chosen.rect);
        d.labelPos = chosen.pos;
      });
    });
    return lay;
  }

  // Render the dot-to-dot word into an SVG within the given box.
  // `numbers` (default true) toggles the printed dot numbers — turning them
  // off is the ladder's final stage before drawing freehand.
  /* Returns the next unused number, so a name split across two bands numbers
     straight on from one line to the next. Two DELIBERATE lines are two words
     and each starts at 1; an auto-wrapped name is one word on two rows and
     must not, or the second row looks like a second puzzle. */
  function addDotWordSVG(svg, text, level, box, hint, numbers, startAt) {
    const lay = placeDotLabels(layoutDotWord(text, level, box, startAt));
    const numbered = numbers !== false;
    lay.letters.forEach((L) => {
      if (hint) {
        L.loops.forEach((lp) => {
          if (lp.length < 2) return;
          svgMake("polygon", {
            points: lp.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "),
            fill: "none", stroke: "#c7bdf0", "stroke-width": 2.2, "stroke-dasharray": "5 7", "stroke-linejoin": "round"
          }, svg);
        });
      }
      L.dots.forEach((d) => {
        svgMake("circle", { cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: (d.accent ? lay.dotR * 0.9 : lay.dotR).toFixed(1), fill: INK }, svg);
        if (!numbered) return;
        const lp = d.labelPos;
        const t = svgMake("text", {
          x: lp.x.toFixed(1), y: lp.y.toFixed(1), "text-anchor": "middle",
          "font-family": FONT, "font-weight": 700, "font-size": lay.numF.toFixed(1),
          fill: INK, stroke: "#ffffff", "stroke-width": (lay.numF * 0.16).toFixed(1), "paint-order": "stroke"
        }, svg);
        t.textContent = String(d.label);
      });
    });
    return lay.nextLabel;
  }

  // Render the dot-to-dot word onto a Canvas within the given box.
  function drawDotWordCanvas(ctx, text, level, box, hint, numbers, startAt) {
    const lay = placeDotLabels(layoutDotWord(text, level, box, startAt));
    const numbered = numbers !== false;
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    lay.letters.forEach((L) => {
      if (hint) {
        L.loops.forEach((lp) => {
          if (lp.length < 2) return;
          ctx.beginPath();
          lp.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
          ctx.closePath();
          ctx.setLineDash([5, 7]); ctx.lineWidth = 2.2; ctx.strokeStyle = "#c7bdf0"; ctx.stroke();
          ctx.setLineDash([]);
        });
      }
      L.dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.accent ? lay.dotR * 0.9 : lay.dotR, 0, Math.PI * 2);
        ctx.fillStyle = INK; ctx.fill();
        if (!numbered) return;
        const lp = d.labelPos;
        ctx.font = "700 " + lay.numF.toFixed(1) + "px " + FONT;
        ctx.lineWidth = lay.numF * 0.16; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
        ctx.strokeText(String(d.label), lp.x, lp.y);
        ctx.fillStyle = INK; ctx.fillText(String(d.label), lp.x, lp.y);
      });
    });
    ctx.restore();
    return lay.nextLabel;
  }

  /* ---------------------------------------------------------------
     Single-character dot-to-dot (RENDER === "dots")
     ---------------------------------------------------------------
     Static per-letter pages (e.g. /printables/dot-to-dot-alphabet/letter-a/)
     reuse the exact same addDotWordSVG/drawDotWordCanvas primitives the
     coloring-page-maker designer uses above — a single letter is just a
     1-character "word". No second tracer, no duplicated geometry.

     Single-letter pages get their own live difficulty picker (mirroring the
     designer's Easy/Medium/Hard/Expert ladder) because DOT_LEVELS.single
     gives each level a distinct per-character dot count (12/16/19/22) —
     see layoutDotWord. CFG.dotDifficulty (defaults to "medium") only seeds
     the initial level. The picker also carries a "numbered dots" toggle:
     numbers-off is the progression's final printable stage before drawing
     the letter freehand, so one static page serves the whole practice
     ladder instead of one fixed sheet. CFG.dotHint (defaults on) mirrors
     the designer's "Show faint guide lines" default for this same audience.
     --------------------------------------------------------------- */
  const dotPageState = {
    level: CFG.dotDifficulty || "medium",
    numbers: true,
    /* "upper" | "lower". The tracer has always force-uppercased, because a
       capital silhouette (A L E X) is far more iconic than a lowercase one --
       but a child learning to write learns lowercase second, and the tracer
       handles it: measured after the corner fix, 24 of 26 lowercase letters
       reproduce within 8% of their height at medium, and the two that do not
       (m, s) are the same shape problem their capitals have at easy.

       This is a toggle on the existing page rather than a lowercase PAGE, and
       that was a measured call, not a preference: Semrush US puts "lowercase
       dot to dot" at 0/mo and "dot to dot lowercase letters" at 20, against
       110 for the head term this page already owns. It fails the site's own
       spoke test on standalone demand, so a separate URL would have been a
       thin page competing with its own parent. */
    case: "upper"
  };
  // Applied at the RENDER boundary only. CHARS, the picker, every data-char
  // and the book range all stay uppercase, so nothing that addresses a
  // character by name has to know about this.
  function dotCase(ch) {
    return dotPageState.case === "lower" ? String(ch).toLowerCase() : String(ch).toUpperCase();
  }
  // viewBox is 4x outlineSVG's 200x240 (same 5:6 aspect; on-screen size is
  // unchanged since CSS scales the SVG to width:100%). dotR/numF are clamped
  // to an ABSOLUTE unit range (see layoutDotWord), so a small viewBox makes
  // the numbers huge relative to the box and clips their labels at the
  // edges for wide letters (M, W); a bigger internal coordinate space keeps
  // the same clamp comfortably inside a generous margin instead.
  function singleDotSVG(ch, opts) {
    const o = opts || {};
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 800 960");
    svg.setAttribute("class", "bubble-outline" + (o.small ? " is-small" : ""));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", T.dotToDot + " " + charLabel(ch));
    addDotWordSVG(svg, dotCase(ch), dotPageState.level, { x: 70, y: 70, w: 660, h: 820 }, CFG.dotHint !== false, dotPageState.numbers);
    return svg;
  }

  // Difficulty picker + numbers toggle + practice-ladder note for the static
  // per-letter dot-to-dot pages. Rebuilt on every selectChar so the active
  // states always match dotPageState.
  function dotControlsNode() {
    const wrap = document.createElement("div");
    wrap.className = "bubble-howto pt-dot-controls";

    const title = document.createElement("h3");
    title.className = "bubble-detail-title";
    title.textContent = T.dotLadderTitle;
    wrap.appendChild(title);

    const group = document.createElement("div");
    group.className = "pt-choice-row";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", T.dotLadderTitle);
    DOT_LEVELS.forEach((lvl) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pt-choice";
      const on = lvl.key === dotPageState.level;
      b.classList.toggle("is-active", on);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.appendChild(document.createTextNode(lvl.label));
      const small = document.createElement("small");
      // The real count for THIS character, not the level's floor: the control
      // is rebuilt on every selectChar, so it can be specific. A picker that
      // said "12 dots" while the sheet drew 20 would be the same class of
      // defect as a setting with no visible consequence.
      small.textContent = dotCountFor(dotCase(activeChar || CHARS[0]), lvl.single) + " " + T.dotsCount;
      b.appendChild(small);
      b.addEventListener("click", () => {
        dotPageState.level = lvl.key;
        selectChar(activeChar, { silent: true });
      });
      group.appendChild(b);
    });
    wrap.appendChild(group);

    /* Case. Both chips are the character itself, so the control needs no
       translated label in any of the eight languages; the group takes its
       accessible name from T.letterWord, which every locale already ships.
       Digits have no case, so the toggle is hidden on a digits-only page. */
    if (CHARS.some((c) => /[a-z]/i.test(c))) {
      const caseRow = document.createElement("div");
      caseRow.className = "pt-choice-row pt-dot-case";
      caseRow.setAttribute("role", "radiogroup");
      caseRow.setAttribute("aria-label", T.letterWord);
      const caseChips = [];
      [["upper", "A"], ["lower", "a"]].forEach((pair) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pt-choice pt-choice-sm";
        b.textContent = pair[1];
        b.setAttribute("role", "radio");
        /* The visible chip is the character itself, which needs no
           translation; the ACCESSIBLE name is this locale's own word, so a
           screen-reader user hears "Kleinbuchstaben" rather than a bare "a"
           under a group vaguely labelled "letter". Every one of the sixteen
           words is harvested from that locale's own pages -- Kleinbuchstaben
           94 uses, minuscules 492, minúsculas 645, huruf kecil 368 -- not
           authored here.

           Checked against native children's-worksheet publishers as well,
           because harvesting proves a word is not invented and nothing more
           (2026-09-16): de Grundschulkönig and Twinkl.de use "Groß und
           Kleinbuchstaben" on tracing sheets; fr Nathan, Tipirate and
           Caboucadin use "lettres majuscules et minuscules"; it
           PianetaBambini and Maestra Chiara use "lettere maiuscole /
           minuscole", which settles the one form that was a judgement call
           here -- plural feminine, agreeing with lettere; pl childdevelop.pl
           uses "wielkie i małe litery"; id lembarkerjaanak.com titles a sheet
           "Menebalkan Huruf Besar dan Kecil A-Z", the same phrase as this
           site's own id/printables/menebalkan-huruf/. es and pt were not
           searched: mayúsculas / minúsculas and maiúsculas / minúsculas are
           unambiguous and already carry 645 and 294 uses here. */
        b.setAttribute("aria-label", pair[0] === "upper" ? T.caseUpper : T.caseLower);
        const on = pair[0] === dotPageState.case;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.addEventListener("click", () => {
          dotPageState.case = pair[0];
          caseChips.forEach((x) => {
            const sel = x === b;
            x.classList.toggle("is-active", sel);
            x.setAttribute("aria-checked", sel ? "true" : "false");
          });
          selectChar(activeChar, { silent: true });
        });
        caseChips.push(b);
        caseRow.appendChild(b);
      });
      wrap.appendChild(caseRow);
    }

    const toggle = document.createElement("label");
    toggle.className = "pt-dot-numbers-toggle";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = dotPageState.numbers;
    cb.addEventListener("change", () => {
      dotPageState.numbers = cb.checked;
      selectChar(activeChar, { silent: true });
    });
    toggle.appendChild(cb);
    toggle.appendChild(document.createTextNode(" " + T.dotNumbers));
    wrap.appendChild(toggle);

    const note = document.createElement("p");
    note.className = "bubble-howto-tip";
    note.textContent = T.dotLadderText;
    wrap.appendChild(note);
    return wrap;
  }

  function designModeIsDots() { return designState.mode === "dots"; }

  /* Sheet geometry. The decorative border's bottom row and the credit line
     both used to be placed by a hand-picked y, and they collided: measured on
     the live preview, the border glyphs spanned 1320.5-1358.8 and the credit
     text 1355.7-1380.5, with a border symbol sitting at x=500 directly on top
     of the centred URL. The relationship is expressed here instead so it
     cannot drift again -- the border row is derived FROM the credit band. */
  const SHEET_W = 1000, SHEET_H = 1400, SHEET_M = 70;
  const CREDIT_FS = 22;
  const CREDIT_BASE = SHEET_H - 24;
  // Measured ascent of the credit face at font-size 22: 0.92em above baseline.
  const CREDIT_TOP = CREDIT_BASE - CREDIT_FS * 0.92;
  const BORDER_FS = 34;
  // Measured descent of the border face at font-size 34 is about 0.20em below
  // the baseline, but the face varies with the page's own font stack, so the
  // daylight allowance is 12 units rather than a hairline: at 6 the measured
  // clearance came out at 4 units (0.7mm), which is closer than a decorative
  // row should ever sit to the line that carries the page address. The SVG
  // sheet no longer draws that line, but the PNG export still does, at this
  // same baseline, so the band stays reserved for both.
  const BORDER_BOTTOM_Y = Math.round(CREDIT_TOP - BORDER_FS * 0.20 - 12);
  const BORDER_TOP_Y = 78;

  // Exact text width on the sheet, in sheet units, via the same Canvas
  // measurer the PNG path already uses -- so the SVG heading and the PNG
  // heading can never disagree about whether a title fits.
  let sheetProbe = null;
  function sheetTextWidth(str, weight, fs) {
    if (!sheetProbe) sheetProbe = document.createElement("canvas").getContext("2d");
    sheetProbe.font = weight + " " + fs + "px " + FONT;
    return sheetProbe.measureText(String(str)).width;
  }

  // The whole designed sheet as one portrait SVG (1000x1400). `textOverride`
  // is the class-set print path (one roster name per sheet — always a single
  // line); interactive use reads the input fields, including the optional
  // second line.
  function designSheetSVG(textOverride) {
    const text = textOverride != null ? String(textOverride).slice(0, DESIGN_MAX) : designText();
    const line2 = textOverride != null ? "" : designLine2();
    let lines = line2 ? [text, line2] : [text];
    let wrapped = false;
    const heading = headingForName(designHeadingText(), textOverride != null ? String(textOverride) : null);
    const fill = designFillKind();
    const borderSym = designBorderSym();
    const footer = designFooterOn();
    const uid = ++designUid;
    const W = SHEET_W, H = SHEET_H, M = SHEET_M;

    const svg = svgMake("svg", { viewBox: "0 0 " + W + " " + H, class: "pt-design-sheet-svg", role: "img", "aria-label": (heading || lines.join(" ")) + " coloring sheet" });
    const defs = svgMake("defs", null, svg);

    svgMake("rect", { x: 18, y: 18, width: W - 36, height: H - 36, rx: 26, fill: "#ffffff", stroke: "#e2e6ee", "stroke-width": 3 }, svg);

    if (borderSym) {
      const strip = borderSym.split(" ").filter(Boolean);
      addBorderRow(svg, strip, BORDER_TOP_Y);
      addBorderRow(svg, strip, BORDER_BOTTOM_Y);
    }

    if (heading) {
      const hFs = 62;
      const attrs = { x: W / 2, y: 168, "text-anchor": "middle", "font-family": FONT, "font-weight": 700, "font-size": hFs, fill: INK };
      // The heading band is capped at DESIGN_HEADING_MAX characters, but a
      // run of wide glyphs can still overrun it, so compress rather than let
      // the title walk off the edge of the paper the way it used to.
      if (sheetTextWidth(heading, 700, hFs) > W - M * 2) {
        attrs.textLength = W - M * 2;
        attrs.lengthAdjust = "spacingAndGlyphs";
      }
      const h = svgMake("text", attrs, svg);
      h.textContent = heading;
    }

    const availW = W - M * 2;

    if (designModeIsDots()) {
      const before = lines.length;
      lines = dotAutoLines(text, lines);
      wrapped = lines.length !== before;
      // Dot-to-dot: numbered dots along each letter's outline (uppercased for
      // iconic silhouettes). Sits in the same central band the outline would;
      // with a second line the band is split into two stacked half-bands.
      const cy = heading ? 720 : 690;
      const half = Math.min(cy - (heading ? 250 : 200), (footer ? H - 250 : H - 150) - cy);
      if (lines.length === 2) {
        const bandH = half - 18;
        const next = addDotWordSVG(svg, String(lines[0]).toUpperCase(), designState.density, { x: M, y: cy - half, w: availW, h: bandH }, designState.hint);
        addDotWordSVG(svg, String(lines[1]).toUpperCase(), designState.density, { x: M, y: cy + 18, w: availW, h: bandH }, designState.hint, undefined, wrapped ? next : 1);
      } else {
        addDotWordSVG(svg, String(text).toUpperCase(), designState.density, { x: M, y: cy - half, w: availW, h: half * 2 }, designState.hint);
      }
    } else {
      // Interior: plain white (open to color), or a tiled pattern painted as
      // the glyph fill. Plain keeps stroke under fill (thin clean edge); a
      // pattern draws stroke on top so the letter boundary stays crisp.
      const fillRef = (fill !== "plain") ? addFillPattern(defs, fill, uid) : "#ffffff";
      const cy = heading ? 740 : 700;
      const maxLen = Math.max(1, ...lines.map((s) => [...s].length));
      // Two lines get a tighter size cap so both fit the central band.
      const fs = lines.length === 2
        ? Math.max(90, Math.min(230, Math.round(availW * 1.3 / maxLen)))
        : Math.max(110, Math.min(360, Math.round(availW * 1.3 / maxLen)));
      const addOutlineLine = (str, y) => {
        const fontAttrs = {
          x: W / 2, y: y, "text-anchor": "middle", "dominant-baseline": "central",
          "font-family": FONT, "font-weight": 700, "font-size": fs, "stroke-linejoin": "round"
        };
        // Guarantee the word fits the width; only compress when it would overflow.
        if ([...str].length * fs * 0.66 > availW) { fontAttrs.textLength = availW; fontAttrs.lengthAdjust = "spacingAndGlyphs"; }
        const outline = svgMake("text", Object.assign({}, fontAttrs, {
          fill: fillRef, stroke: INK, "stroke-width": Math.max(4, STROKE),
          "paint-order": (fill === "plain") ? "stroke" : ""
        }), svg);
        outline.textContent = str;
      };
      if (lines.length === 2) {
        addOutlineLine(lines[0], cy - fs * 0.68);
        addOutlineLine(lines[1], cy + fs * 0.68);
      } else {
        addOutlineLine(text, cy);
      }
    }

    if (footer) addFooter(svg, H - 150);

    /* No credit line inside the sheet. attachCredit() puts the real one on
       every printed page unit, as the page path plus the same URL as a QR,
       so a printed sheet carried the address FOUR times: this line, the
       credit block's text, its link href and the QR payload. The block is
       the one that scans and the one the PDF lays a /Link annotation over,
       so this is the copy that goes. The PNG export is a different artifact
       and draws its own credit at the same y (designPNG), which is why
       CREDIT_TOP still reserves the band and the border row still clears it. */
    return svg;
  }

  // The band the dot-to-dot word is laid into, mirroring designSheetSVG's own
  // arithmetic so a difficulty judged deliverable here is the one that is
  // actually drawn there.
  function designDotBox() {
    const heading = !!designHeadingText();
    const footer = designFooterOn();
    const twoLine = !!designLine2();
    const cy = heading ? 720 : 690;
    const half = Math.min(cy - (heading ? 250 : 200), (footer ? SHEET_H - 250 : SHEET_H - 150) - cy);
    // A second line splits the band in two, so each line gets half the height.
    return { x: SHEET_M, y: cy - half, w: SHEET_W - SHEET_M * 2, h: twoLine ? half - 18 : half * 2 };
  }

  /* The exact string the dot sheet draws. designSheetSVG uppercases the word
     for the iconic silhouette, so anything that judges how many dots fit has
     to measure the SAME string: measuring "Benjamin" while the sheet drew
     "BENJAMIN" made the difficulty pass and the renderer disagree, and two
     levels that rendered identical sheets both stayed switched on. With a
     second line the longer of the two is what binds. */
  function designDotText() {
    const a = String(designText()).toUpperCase();
    const b = String(designLine2() || "").toUpperCase();
    return ([...b].length > [...a].length) ? b : a;
  }

  /* A difficulty level that cannot draw more dots than the level below it is
     not a difficulty level, it is a button that does nothing -- which is
     exactly what Easy and Medium became at 11 characters. Rather than keep
     rendering four identical sheets, the levels this word cannot carry are
     switched off and the page's own sentence says why. */
  function syncDesignDensity() {
    if (!el.designDensityGroup) return false;
    const text = designDotText();
    const box = designDotBox();
    const delivered = {};
    DOT_LEVELS.forEach((lvl) => { delivered[lvl.key] = dotBudgetFor(text, lvl.key, box).budget; });
    const enabled = {};
    let floor = 0;
    DOT_LEVELS.forEach((lvl) => {
      const ok = delivered[lvl.key] > floor;
      enabled[lvl.key] = ok;
      if (ok) floor = delivered[lvl.key];
    });
    const anyOff = DOT_LEVELS.some((lvl) => !enabled[lvl.key]);
    if (el.designDensityNote) el.designDensityNote.hidden = !anyOff;
    let moved = false;
    if (!enabled[designState.density]) {
      const best = DOT_LEVELS.filter((lvl) => enabled[lvl.key]).pop();
      if (best) { designState.density = best.key; moved = true; }
    }
    $$(".pt-choice", el.designDensityGroup).forEach((b) => {
      const off = enabled[b.dataset.value] === false;
      b.disabled = off;
      b.classList.toggle("is-disabled", off);
      b.setAttribute("aria-disabled", off ? "true" : "false");
      const on = !off && b.dataset.value === designState.density;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    return moved;
  }

  function renderDesignPreview() {
    if (!el.designPreview) return;
    if (designModeIsDots()) syncDesignDensity();
    // In class mode the preview is the FIRST CHILD'S sheet, not the Step-1
    // word: it is the only place the per-child heading is visible before 30
    // sheets are committed to paper, and showing the typed word there is how
    // a roster of 30 used to print silently headed with one child's name.
    const names = designIsClassMode() ? rosterNames(el.designRoster) : [];
    el.designPreview.innerHTML = "";
    el.designPreview.appendChild(names.length >= 2 ? designSheetSVG(names[0]) : designSheetSVG());
  }

  function printDesign() {
    const holder = document.createElement("div");
    holder.className = "pt-design-print-holder";
    const names = designIsClassMode() ? rosterNames(el.designRoster) : [];
    if (names.length >= 2) {
      holder.classList.add("pt-class-set");
      appendSheetPages(holder, names, (n) => designSheetSVG(n));
      printWrap("", holder, "design");
      return;
    }
    holder.appendChild(sheetPageNode(designSheetSVG()));
    printWrap("", holder, "design");
  }

  // Dot-to-dot difficulty ladder as one print job — the same word at every
  // density, easy to expert. designSheetSVG reads designState.density, so the
  // loop swaps it per page and restores the picked value afterwards.
  function printDesignLadder() {
    const holder = document.createElement("div");
    holder.className = "pt-design-print-holder pt-class-set";
    const picked = designState.density;
    // Only the levels this word can actually carry. Printing all four for a
    // nine-letter name used to hand back four sheets that were identical
    // apart from the label on the page you never see.
    const box = designDotBox();
    const text = designDotText();
    let floor = 0;
    const levels = DOT_LEVELS.filter((lvl) => {
      const got = dotBudgetFor(text, lvl.key, box).budget;
      if (got <= floor) return false;
      floor = got;
      return true;
    });
    appendSheetPages(holder, levels, (lvl) => {
      designState.density = lvl.key;
      return designSheetSVG();
    });
    designState.density = picked;
    printWrap("", holder, "design_ladder");
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // PNG mirrors the sheet layout via Canvas text (outline + heading +
  // border + footer). Interior fill patterns are print-only; the PNG
  // saves the clean outline, which is what most "download" users reuse.
  function designPNG() {
    withFont(() => {
      const W = SHEET_W, H = SHEET_H, scale = 2;
      // The sheet keeps its own 1000x1400 geometry; the canvas is taller by
      // the credit strip, so nothing on the sheet moves and the PNG carries
      // the same QR the printed page and every other export already do.
      const canvasH = H + PNG_CREDIT_BAND;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale; canvas.height = canvasH * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, canvasH);
      ctx.strokeStyle = "#e2e6ee"; ctx.lineWidth = 3;
      roundRectPath(ctx, 18, 18, W - 36, H - 36, 26); ctx.stroke();

      const text = designText(), line2 = designLine2(), heading = designHeadingText();
      let lines = line2 ? [text, line2] : [text];
    let wrapped = false;
      const borderSym = designBorderSym();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";

      if (borderSym) {
        const strip = borderSym.split(" ").filter(Boolean);
        const count = 11, gap = (W - 120) / (count - 1);
        ctx.font = BORDER_FS + "px " + FONT; ctx.fillStyle = "#c8ccd6";
        for (let i = 0; i < count; i++) {
          ctx.fillText(strip[i % strip.length], 60 + i * gap, BORDER_TOP_Y);
          ctx.fillText(strip[i % strip.length], 60 + i * gap, BORDER_BOTTOM_Y);
        }
      }

      const hasHeading = !!heading;
      if (hasHeading) {
        ctx.font = "700 62px " + FONT; ctx.fillStyle = INK;
        // fillText's maxWidth condenses the glyphs, which is the Canvas
        // equivalent of the SVG path's lengthAdjust="spacingAndGlyphs".
        ctx.fillText(heading, W / 2, 168, W - SHEET_M * 2);
      }

      if (designModeIsDots()) {
        const beforeC = lines.length;
        lines = dotAutoLines(text, lines);
        wrapped = lines.length !== beforeC;
        const footerOn = designFooterOn();
        const cyD = hasHeading ? 720 : 690;
        const half = Math.min(cyD - (hasHeading ? 250 : 200), (footerOn ? H - 250 : H - 150) - cyD);
        if (lines.length === 2) {
          const bandH = half - 18;
          const next = drawDotWordCanvas(ctx, String(lines[0]).toUpperCase(), designState.density, { x: 70, y: cyD - half, w: W - 140, h: bandH }, designState.hint);
          drawDotWordCanvas(ctx, String(lines[1]).toUpperCase(), designState.density, { x: 70, y: cyD + 18, w: W - 140, h: bandH }, designState.hint, undefined, wrapped ? next : 1);
        } else {
          drawDotWordCanvas(ctx, String(text).toUpperCase(), designState.density, { x: 70, y: cyD - half, w: W - 140, h: half * 2 }, designState.hint);
        }
      } else {
        const cy = hasHeading ? 740 : 700;
        const maxLen = Math.max(1, ...lines.map((s) => [...s].length));
        let fs = lines.length === 2
          ? Math.max(90, Math.min(230, Math.round((W - 140) * 1.3 / maxLen)))
          : Math.max(110, Math.min(360, Math.round((W - 140) * 1.3 / maxLen)));
        ctx.font = "700 " + fs + "px " + FONT;
        const widest = Math.max(...lines.map((s) => ctx.measureText(s).width));
        if (widest > W - 140) { fs = Math.floor(fs * (W - 140) / widest); ctx.font = "700 " + fs + "px " + FONT; }
        ctx.lineJoin = "round";
        const drawLine = (str, y) => paintOutlineText(ctx, str, W / 2, y, fs);
        if (lines.length === 2) {
          drawLine(lines[0], cy - fs * 0.68);
          drawLine(lines[1], cy + fs * 0.68);
        } else {
          drawLine(text, cy);
        }
      }

      if (designFooterOn()) {
        ctx.textAlign = "left"; ctx.font = "600 30px " + FONT; ctx.fillStyle = INK;
        const fy = H - 150;
        ctx.fillText(T.nameLabel, 90, fy); ctx.fillText(T.dateLabel, 560, fy);
        ctx.strokeStyle = "#9aa3b2"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(200, fy + 16); ctx.lineTo(470, fy + 16);
        ctx.moveTo(670, fy + 16); ctx.lineTo(910, fy + 16); ctx.stroke();
        ctx.textAlign = "center";
      }

      drawCredit(ctx, W, canvasH);
      downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(lines.join(" ")) || "sheet") + ".png", "design");
    });
  }

  // Wire one swatch button group: inject each swatch preview, set the active
  // state, and re-render on click. `state` is the plain object the group
  // drives (e.g. designState / puzzleState) and `field` is its key; `onChange`
  // re-renders whatever preview that state feeds. Generalized (rather than
  // hardcoded to the coloring designer) so other mounts — e.g. the name
  // puzzle maker's border picker — can reuse the exact same swatch UI.
  function wireSwatchGroup(group, field, swatchFor, state, onChange) {
    if (!group) return;
    const buttons = $$(".pt-swatch", group);
    const preset = buttons.filter((b) => b.classList.contains("is-active"))[0] || buttons[0];
    if (preset) state[field] = preset.dataset.value;
    buttons.forEach((b) => {
      const slot = b.querySelector(".pt-swatch-art");
      if (slot) slot.appendChild(swatchFor(b.dataset.value));
      b.setAttribute("aria-checked", b === preset ? "true" : "false");
      b.classList.toggle("is-active", b === preset);
      b.addEventListener("click", () => {
        state[field] = b.dataset.value;
        buttons.forEach((o) => {
          const on = o === b;
          o.classList.toggle("is-active", on);
          o.setAttribute("aria-checked", on ? "true" : "false");
        });
        onChange();
      });
    });
  }

  // Wire a plain label-only button radiogroup (.pt-choice) that drives a
  // designState field. `after` runs after the state changes, before re-render.
  function wireChoiceGroup(group, field, after) {
    if (!group) return;
    const buttons = $$(".pt-choice", group);
    const preset = buttons.filter((b) => b.classList.contains("is-active"))[0] || buttons[0];
    if (preset) designState[field] = preset.dataset.value;
    buttons.forEach((b) => {
      b.setAttribute("aria-checked", b === preset ? "true" : "false");
      b.classList.toggle("is-active", b === preset);
      b.addEventListener("click", () => {
        designState[field] = b.dataset.value;
        buttons.forEach((o) => {
          const on = o === b;
          o.classList.toggle("is-active", on);
          o.setAttribute("aria-checked", on ? "true" : "false");
        });
        if (after) after();
        renderDesignPreview();
      });
    });
  }

  // Show the dot-to-dot options and hide the (irrelevant) letter-fill picker
  // when in dot mode, and vice-versa.
  function syncDesignMode() {
    const dots = designModeIsDots();
    if (el.designDotsOptions) el.designDotsOptions.hidden = !dots;
    if (el.designFillField) el.designFillField.hidden = dots;
  }

  // Longest line the sheet has to render, which is what every budget below
  // is actually about: a two-line sheet is sized by its longer line.
  function designLongestLine() {
    const lines = designLines();
    return lines.length ? Math.max.apply(null, lines.map((x) => [...x].length)) : 0;
  }

  /* The word field carries a visible budget rather than silently truncating
     at maxlength, and the patterned fills switch off past their own tighter
     limit with the page's own sentence saying why. Both numbers are measured
     (see DESIGN_MAX): a control that quietly stops working is the failure
     this whole pass exists to remove. */
  function syncDesignBudget() {
    const used = designLongestLine();
    if (el.designCount) {
      el.designCount.textContent = used + " / " + DESIGN_MAX;
      el.designCount.classList.toggle("is-full", used >= DESIGN_MAX);
    }
    if (!el.designFillGroup) return;
    const gated = used > DESIGN_FILL_MAX;
    if (el.designFillNote) el.designFillNote.hidden = !gated;
    let forced = false;
    $$(".pt-swatch", el.designFillGroup).forEach((b) => {
      const off = gated && b.dataset.value !== "plain";
      b.disabled = off;
      b.classList.toggle("is-disabled", off);
      b.setAttribute("aria-disabled", off ? "true" : "false");
      if (off && b.classList.contains("is-active")) forced = true;
    });
    if (forced) {
      designState.fill = "plain";
      $$(".pt-swatch", el.designFillGroup).forEach((b) => {
        const on = b.dataset.value === "plain";
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    }
  }

  // "One sheet" vs "Whole class" is an audience, not a step: steps 1-3 are
  // the same work for a parent and a teacher, and only the batch is extra.
  function designIsClassMode() {
    return el.designAudienceGroup ? designState.audience === "class" : true;
  }
  function syncDesignAudience() {
    if (el.designClassFields) el.designClassFields.hidden = !designIsClassMode();
  }

  /* The strip above the sheet used to read a hardcoded "US Letter", so
     choosing A4 in the print-settings panel left the tool asserting the paper
     the visitor had just changed away from. paperCaption() is the same
     composer the per-character paper preview already uses, built from the
     panel's own localized strings, so the label cannot drift from the setting
     or need a translation of its own. */
  function syncDesignPreviewMeta() {
    if (el.designPreviewMeta) el.designPreviewMeta.textContent = paperCaption();
  }

  function buildDesigner() {
    if (!el.designInput || !el.designPreview) return;
    let timer = null;
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(renderDesignPreview, 120); };
    const onWordInput = () => { syncDesignBudget(); schedule(); };
    if (DESIGN.maxChars) el.designInput.setAttribute("maxlength", String(DESIGN_MAX * 2 + 1));
    el.designInput.addEventListener("input", onWordInput);
    if (el.designInput2) el.designInput2.addEventListener("input", onWordInput);
    if (el.designHeading) {
      if (DESIGN.headingMaxChars) el.designHeading.setAttribute("maxlength", String(DESIGN_HEADING_MAX));
      el.designHeading.addEventListener("input", schedule);
    }
    wireSwatchGroup(el.designFillGroup, "fill", fillSwatchSVG, designState, renderDesignPreview);
    wireSwatchGroup(el.designBorderGroup, "border", borderSwatchSVG, designState, renderDesignPreview);
    // Dot-to-dot mode toggle + difficulty ladder + hint switch (all optional).
    wireChoiceGroup(el.designModeGroup, "mode", syncDesignMode);
    wireChoiceGroup(el.designDensityGroup, "density");
    wireChoiceGroup(el.designAudienceGroup, "audience", syncDesignAudience);
    if (el.designRoster) el.designRoster.addEventListener("input", schedule);
    if (el.designHint) {
      designState.hint = el.designHint.checked;
      el.designHint.addEventListener("change", () => { designState.hint = el.designHint.checked; renderDesignPreview(); });
    }
    [el.designFill, el.designBorder, el.designFooter].forEach((c) => { if (c) c.addEventListener("change", renderDesignPreview); });
    if (el.designPrint) el.designPrint.addEventListener("click", printDesign);
    if (el.designLadder) el.designLadder.addEventListener("click", printDesignLadder);
    if (el.designPng) el.designPng.addEventListener("click", designPNG);
    syncDesignMode();
    syncDesignAudience();
    syncDesignBudget();
    syncDesignPreviewMeta();
    renderDesignPreview();
  }

  /* ---------------------------------------------------------------
     Section: banner maker
     Type a word/phrase -> a printable letter banner: one pennant flag
     per letter, each with a dashed cut line and two string-hole
     markers. Long phrases don't fit one sheet, so the flags are laid
     out into fixed-size pages (BANNER_PER_PAGE each) in strict reading
     order, and each page break is a real CSS page break — cut and
     string the flags in page order, left-to-right, top-to-bottom, and
     they spell the phrase. bannerPagesNode() is the single primitive
     behind both the live on-screen preview and the printed sheet, and
     the geometry constants below are shared with the Canvas flag
     drawer used for the PNG export, so all three stay in sync.
     Gated on #pt-banner-input + #pt-banner-preview so other pages are
     untouched.
     --------------------------------------------------------------- */

  // 3 columns x 2 rows keeps a page's title + instructions + footer + six
  // flags comfortably inside one US Letter sheet with margin to spare
  // (measured against actual Chromium print output — a 3x3 grid overflowed
  // onto a second physical sheet before its own page-break-after fired).
  const BANNER_COLS = 3, BANNER_ROWS = 2;
  const BANNER_PER_PAGE = BANNER_COLS * BANNER_ROWS;
  const BANNER_DEMO = CFG.bannerDemo || CFG.nameDemo || "HAPPY BIRTHDAY";

  // Flag geometry, in SVG viewBox units — the single source of truth for both
  // the SVG flag (screen + print) and the Canvas flag (PNG export).
  const FLAG_W = 220, FLAG_H = 260;
  const FLAG_TOP = 16, FLAG_LEFT = 16, FLAG_RIGHT = 204;
  const FLAG_APEX_X = 110, FLAG_APEX_Y = 248;
  const FLAG_HOLE_L = [42, 46], FLAG_HOLE_R = [178, 46], FLAG_HOLE_R_PX = 7;
  const FLAG_TEXT_Y = 100, FLAG_TEXT_SIZE = 104;

  function bannerValue() {
    const raw = el.bannerInput ? el.bannerInput.value : "";
    return (raw && raw.trim()) ? raw.trim().slice(0, 40) : BANNER_DEMO;
  }

  // A phrase -> an ordered list of "cards": one per non-space character
  // (a flag to cut) plus one per space (a gap card — no flag, just a visual
  // placeholder so word breaks stay visible in reading order). Letters are
  // uppercased to match the classic bunting-banner look; digits and
  // punctuation are kept as typed.
  function bannerCards(phraseRaw) {
    const phrase = String(phraseRaw || "").trim().replace(/\s+/g, " ");
    const cards = [];
    let n = 0;
    [...phrase].forEach((ch) => {
      if (/\s/.test(ch)) { cards.push({ type: "gap" }); return; }
      n++;
      cards.push({ type: "flag", ch: /[a-z]/i.test(ch) ? ch.toUpperCase() : ch, index: n });
    });
    return cards;
  }

  function bannerFlagTotal(cards) {
    return cards.reduce((sum, c) => sum + (c.type === "flag" ? 1 : 0), 0);
  }

  // Chunk cards into fixed-size pages, in order — this (not organic CSS
  // reflow) is what guarantees each printed sheet holds an exact, predictable
  // run of the phrase, so assembly order is never in doubt.
  function bannerPages(cards) {
    const pages = [];
    for (let i = 0; i < cards.length; i += BANNER_PER_PAGE) pages.push(cards.slice(i, i + BANNER_PER_PAGE));
    return pages.length ? pages : [[]];
  }

  // One flag: a dashed-outline pennant with two dashed string-hole markers
  // near the top corners and the letter set in the wide part of the flag.
  function flagSVG(ch) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + FLAG_W + " " + FLAG_H);
    svg.setAttribute("class", "pt-banner-flag");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", T.bannerFlag + " " + ch);

    const shape = document.createElementNS(SVGNS, "polygon");
    shape.setAttribute("points", FLAG_LEFT + "," + FLAG_TOP + " " + FLAG_RIGHT + "," + FLAG_TOP + " " + FLAG_APEX_X + "," + FLAG_APEX_Y);
    shape.setAttribute("fill", "#ffffff");
    shape.setAttribute("stroke", INK);
    shape.setAttribute("stroke-width", "3");
    shape.setAttribute("stroke-dasharray", "10 7");
    shape.setAttribute("stroke-linejoin", "round");
    svg.appendChild(shape);

    [FLAG_HOLE_L, FLAG_HOLE_R].forEach((pt) => {
      const hole = document.createElementNS(SVGNS, "circle");
      hole.setAttribute("cx", String(pt[0]));
      hole.setAttribute("cy", String(pt[1]));
      hole.setAttribute("r", String(FLAG_HOLE_R_PX));
      hole.setAttribute("fill", "none");
      hole.setAttribute("stroke", INK);
      hole.setAttribute("stroke-width", "2.5");
      hole.setAttribute("stroke-dasharray", "3 4");
      svg.appendChild(hole);
    });

    const text = document.createElementNS(SVGNS, "text");
    text.setAttribute("x", String(FLAG_W / 2));
    text.setAttribute("y", String(FLAG_TEXT_Y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-family", FONT);
    text.setAttribute("font-weight", "800");
    text.setAttribute("font-size", String(FLAG_TEXT_SIZE));
    text.setAttribute("fill", INK);
    text.textContent = ch;
    svg.appendChild(text);
    return svg;
  }

  // The whole banner as paginated page nodes — used identically for the live
  // preview and the printed sheet, so what you see is exactly what prints.
  function bannerPagesNode(phraseRaw) {
    const phrase = phraseRaw || BANNER_DEMO;
    const cards = bannerCards(phrase);
    const total = bannerFlagTotal(cards);
    const pages = bannerPages(cards);
    const root = document.createElement("div");
    root.className = "pt-banner-pages";
    pages.forEach((pageCards, pi) => {
      const page = document.createElement("div");
      page.className = "pt-banner-page";

      const head = document.createElement("div");
      head.className = "pt-banner-page-head";
      const title = document.createElement("p");
      title.className = "pt-banner-page-title";
      title.textContent = phrase.toUpperCase() + " — " + T.bannerFlagsLabel + " — " +
        T.pageCount.one + " " + (pi + 1) + " " + T.ofWord + " " + pages.length;
      head.appendChild(title);
      if (pi === 0) {
        const instr = document.createElement("p");
        instr.className = "pt-banner-instructions";
        instr.textContent = T.bannerInstr;
        head.appendChild(instr);
      }
      page.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "pt-banner-grid";
      pageCards.forEach((card) => {
        if (card.type === "gap") {
          const gap = document.createElement("div");
          gap.className = "pt-banner-gap";
          const label = document.createElement("span");
          label.textContent = T.space;
          gap.appendChild(label);
          grid.appendChild(gap);
          return;
        }
        const cell = document.createElement("div");
        cell.className = "pt-banner-cell";
        const idx = document.createElement("span");
        idx.className = "pt-banner-index";
        idx.textContent = card.index + " / " + total;
        cell.appendChild(idx);
        cell.appendChild(flagSVG(card.ch));
        grid.appendChild(cell);
      });
      page.appendChild(grid);

      const foot = document.createElement("p");
      foot.className = "pt-banner-page-foot";
      foot.textContent = siteCredit();
      page.appendChild(foot);

      root.appendChild(page);
    });
    return root;
  }

  function renderBannerPreview() {
    if (!el.bannerPreview) return;
    const phrase = bannerValue();
    const cards = bannerCards(phrase);
    const total = bannerFlagTotal(cards);
    const pages = bannerPages(cards);
    el.bannerPreview.innerHTML = "";
    el.bannerPreview.appendChild(bannerPagesNode(phrase));
    if (el.bannerMeta) {
      el.bannerMeta.textContent = total + " " + plural(total, T.flagCount) + " · " +
        pages.length + " " + plural(pages.length, T.pageCount) + " · " + T.usLetter;
    }
  }

  function printBanner() {
    printWrap("", bannerPagesNode(bannerValue()), "banner");
  }

  // Canvas equivalent of flagSVG, scaled from the same geometry constants —
  // used only for the PNG export (a single continuous strip; PNG has no
  // concept of pages, so it is not paginated the way print is).
  function drawFlagCanvas(ctx, x, y, w, ch) {
    const s = w / FLAG_W;
    const leftX = x + FLAG_LEFT * s, rightX = x + FLAG_RIGHT * s, apexX = x + FLAG_APEX_X * s;
    const topY = y + FLAG_TOP * s, apexY = y + FLAG_APEX_Y * s;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    ctx.lineTo(rightX, topY);
    ctx.lineTo(apexX, apexY);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.strokeStyle = INK;
    ctx.setLineDash([10 * s, 7 * s]);
    ctx.stroke();

    [FLAG_HOLE_L, FLAG_HOLE_R].forEach((pt) => {
      ctx.beginPath();
      ctx.setLineDash([3 * s, 4 * s]);
      ctx.lineWidth = Math.max(1, 2.5 * s);
      ctx.strokeStyle = INK;
      ctx.arc(x + pt[0] * s, y + pt[1] * s, FLAG_HOLE_R_PX * s, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 " + Math.round(FLAG_TEXT_SIZE * s) + "px " + FONT;
    ctx.fillText(ch, x + (FLAG_W / 2) * s, y + FLAG_TEXT_Y * s);
    ctx.restore();
  }

  function bannerPNG(phraseRaw) {
    const phrase = phraseRaw || BANNER_DEMO;
    const cards = bannerCards(phrase);
    if (!cards.length) return;
    withFont(() => {
      const flagW = 260, gapW = 130, gap = 22, pad = 60;
      const flagH = Math.round(flagW * (FLAG_H / FLAG_W));
      const widths = cards.map((c) => (c.type === "flag" ? flagW : gapW));
      const totalW = Math.round(pad * 2 + widths.reduce((a, b) => a + b, 0) + gap * (cards.length - 1));
      const height = flagH + pad * 2;
      const canvas = document.createElement("canvas");
      canvas.width = totalW; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalW, height);

      let x = pad;
      cards.forEach((card, i) => {
        const w = widths[i];
        if (card.type === "flag") {
          drawFlagCanvas(ctx, x, pad, flagW, card.ch);
        } else {
          ctx.save();
          ctx.strokeStyle = "#c3c9d6";
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, pad + flagH * 0.15);
          ctx.lineTo(x + w / 2, pad + flagH * 0.75);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "600 20px " + FONT;
          ctx.textAlign = "center";
          ctx.fillText(T.space, x + w / 2, pad + flagH + 30);
          ctx.restore();
        }
        x += w + gap;
      });
      drawCredit(ctx, totalW, height);
      downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(phrase) || "banner") + ".png", "banner");
    });
  }

  function buildBanner() {
    if (!el.bannerInput || !el.bannerPreview) return;
    let timer = null;
    el.bannerInput.addEventListener("input", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(renderBannerPreview, 120);
    });
    if (el.bannerPrint) el.bannerPrint.addEventListener("click", printBanner);
    if (el.bannerPng) el.bannerPng.addEventListener("click", () => bannerPNG(bannerValue()));
    renderBannerPreview();
  }

  /* ---------------------------------------------------------------
     Section: name puzzle maker
     Type a name -> each letter becomes a big outline "puzzle piece" in a
     row, with a dashed cut line between every pair of pieces, an optional
     custom heading, an optional Name/Date footer line, and an optional
     decorative shape-frame border. The border reuses the exact BORDER_SETS /
     addBorderRow / borderSwatchSVG primitives the coloring-sheet designer
     already ships — no second border system. Letters reuse outlineSVG(ch),
     the same per-character primitive buildAlphabetGrid lays out in a grid,
     just arranged in a single row here. Gated on #pt-puzzle-input +
     #pt-puzzle-preview so other pages are untouched.
     --------------------------------------------------------------- */

  const PUZZLE_DEMO = CFG.puzzleDemo || CFG.nameDemo || "Alex";
  const puzzleState = { border: "none" };

  function puzzleValue() {
    const raw = el.puzzleInput ? el.puzzleInput.value : "";
    return (raw && raw.trim()) ? raw.trim().slice(0, 20) : PUZZLE_DEMO;
  }
  function puzzleHeadingText() {
    return el.puzzleHeading ? el.puzzleHeading.value.trim().slice(0, 48) : "";
  }
  function puzzleBorderKey() {
    return el.puzzleBorderGroup ? puzzleState.border : "none";
  }
  function puzzleBorderSym() {
    return BORDER_SETS[puzzleBorderKey()] || "";
  }
  function puzzleFooterOn() {
    return !!(el.puzzleFooter && el.puzzleFooter.checked);
  }

  // One row of symbols reusing the coloring designer's own border primitive
  // (addBorderRow draws across a fixed 0..1000 viewBox, so a dedicated
  // 1000x60 strip drops straight in).
  function puzzleBorderStripSVG(symbols) {
    const svg = svgMake("svg", { viewBox: "0 0 1000 60", class: "pt-puzzle-border-strip", "aria-hidden": "true" });
    addBorderRow(svg, symbols, 40);
    return svg;
  }

  function puzzleFooterRow() {
    const row = document.createElement("div");
    row.className = "pt-puzzle-footer-row";
    const field = (label) => {
      const f = document.createElement("span");
      f.className = "pt-puzzle-footer-field";
      const l = document.createElement("span");
      l.textContent = label;
      const line = document.createElement("span");
      line.className = "pt-puzzle-footer-line";
      f.appendChild(l); f.appendChild(line);
      return f;
    };
    row.appendChild(field(T.nameLabel));
    row.appendChild(field(T.dateLabel));
    return row;
  }

  // The row of cut-apart letter pieces. Each non-space character becomes an
  // outlineSVG(ch) piece with a dashed cut line on its trailing edge (pure
  // CSS border, so it prints identically to the screen preview); spaces
  // become a narrower gap column with no piece and no cut line. Column
  // widths are set directly (not via a CSS custom property + repeat()) so
  // any letter count — 3 or 13 — always fits the sheet width; long names
  // just render smaller pieces instead of overflowing.
  function puzzleRowNode(word) {
    const row = document.createElement("div");
    row.className = "pt-puzzle-row";
    const cols = [];
    [...word].forEach((rawCh) => {
      if (rawCh === " ") {
        const gap = document.createElement("div");
        gap.className = "pt-puzzle-gap";
        row.appendChild(gap);
        cols.push("0.6fr");
        return;
      }
      const ch = /[a-z]/i.test(rawCh) ? rawCh.toUpperCase() : rawCh;
      const piece = document.createElement("div");
      piece.className = "pt-puzzle-piece";
      piece.appendChild(outlineSVG(ch));
      row.appendChild(piece);
      cols.push("1fr");
    });
    row.style.gridTemplateColumns = cols.join(" ");
    return row;
  }

  // The whole puzzle as one DOM sheet — the single primitive behind both the
  // live preview and the printed page, so what's on screen is what prints.
  // `wordOverride` lets the class-set print path build one puzzle per roster
  // name; a typed heading (if any) applies to every sheet, while the default
  // heading stays per-name.
  function puzzleSheetNode(wordOverride) {
    const word = wordOverride != null ? String(wordOverride).slice(0, 20) : puzzleValue();
    const heading = puzzleHeadingText();
    const strip = puzzleBorderSym().split(" ").filter(Boolean);
    const footer = puzzleFooterOn();

    const sheet = document.createElement("div");
    sheet.className = "pt-puzzle-sheet";

    if (strip.length) sheet.appendChild(puzzleBorderStripSVG(strip));

    const h = document.createElement("h3");
    h.className = "pt-puzzle-heading-text";
    h.textContent = heading || (word + "’s Name Puzzle");
    sheet.appendChild(h);

    sheet.appendChild(puzzleRowNode(word));

    const cap = document.createElement("p");
    cap.className = "pt-puzzle-caption";
    cap.textContent = T.puzzleCut;
    sheet.appendChild(cap);

    if (footer) sheet.appendChild(puzzleFooterRow());
    if (strip.length) sheet.appendChild(puzzleBorderStripSVG(strip));

    const cred = document.createElement("p");
    cred.className = "pt-puzzle-credit";
    cred.textContent = siteCredit();
    sheet.appendChild(cred);

    return sheet;
  }

  function renderPuzzlePreview() {
    if (!el.puzzlePreview) return;
    el.puzzlePreview.innerHTML = "";
    el.puzzlePreview.appendChild(puzzleSheetNode());
  }

  function printPuzzle() {
    const holder = document.createElement("div");
    holder.className = "pt-puzzle-print-holder";
    const names = rosterNames(el.puzzleRoster);
    if (names.length >= 2) {
      holder.classList.add("pt-class-set");
      appendSheetPages(holder, names, (n) => puzzleSheetNode(n));
      printWrap("", holder, "puzzle");
      return;
    }
    holder.appendChild(sheetPageNode(puzzleSheetNode()));
    printWrap("", holder, "puzzle");
  }

  // Word -> wide PNG mirroring the sheet: border strips, heading, a row of
  // outlined letter pieces with dashed cut lines between them, and an
  // optional Name/Date footer. Canvas has no CSS grid, so column widths and
  // cut-line x-positions are computed with the same weighting (space = 0.6,
  // letter = 1) as puzzleRowNode's grid-template-columns.
  function puzzlePNG() {
    const word = puzzleValue();
    const heading = puzzleHeadingText();
    const strip = puzzleBorderSym().split(" ").filter(Boolean);
    const footer = puzzleFooterOn();
    withFont(() => {
      const chars = [...word];
      const W = Math.max(1000, chars.length * 140 + 240);
      const H = 900;
      const pad = 70;
      // Same as the coloring sheet: the puzzle keeps its own geometry and the
      // canvas is taller by the credit strip, so the QR has somewhere to sit
      // that is not on top of the Name and Date rules.
      const canvasH = H + PNG_CREDIT_BAND;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, canvasH);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";

      if (strip.length) {
        const count = 11, gap = (W - 120) / (count - 1);
        ctx.font = "34px " + FONT; ctx.fillStyle = "#c8ccd6";
        for (let i = 0; i < count; i++) {
          ctx.fillText(strip[i % strip.length], 60 + i * gap, 60);
          ctx.fillText(strip[i % strip.length], 60 + i * gap, H - 40);
        }
      }

      ctx.font = "700 48px " + FONT;
      ctx.fillStyle = INK;
      ctx.fillText(heading || (word + "’s Name Puzzle"), W / 2, 130);

      const rowTop = 190, rowBottom = 620, rowH = rowBottom - rowTop;
      const availW = W - pad * 2;
      const weights = chars.map((c) => (c === " " ? 0.6 : 1));
      const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
      let x = pad;
      const boundaries = [];
      chars.forEach((rawCh, i) => {
        const w = availW * (weights[i] / totalWeight);
        if (rawCh !== " ") {
          const ch = /[a-z]/i.test(rawCh) ? rawCh.toUpperCase() : rawCh;
          const cx = x + w / 2, cy = rowTop + rowH / 2;
          const fs = Math.min(rowH * 0.8, w * 0.85);
          ctx.font = "700 " + Math.round(fs) + "px " + FONT;
          paintOutlineText(ctx, ch, cx, cy, fs);
          if (x > pad) boundaries.push(x);
        }
        x += w;
      });
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      boundaries.forEach((bx) => {
        ctx.beginPath();
        ctx.moveTo(bx, rowTop); ctx.lineTo(bx, rowBottom); ctx.stroke();
      });
      ctx.setLineDash([]);

      if (footer) {
        ctx.textAlign = "left";
        ctx.font = "600 30px " + FONT;
        ctx.fillStyle = INK;
        const fy = 700;
        ctx.fillText(T.nameLabel, pad, fy);
        ctx.fillText(T.dateLabel, W / 2 + 40, fy);
        ctx.strokeStyle = "#9aa3b2"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad + 110, fy + 12); ctx.lineTo(W / 2 - 40, fy + 12);
        ctx.moveTo(W / 2 + 150, fy + 12); ctx.lineTo(W - pad, fy + 12);
        ctx.stroke();
        ctx.textAlign = "center";
      }

      drawCredit(ctx, W, canvasH);

      downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(word) || "puzzle") + ".png", "puzzle");
    });
  }

  function buildPuzzle() {
    if (!el.puzzleInput || !el.puzzlePreview) return;
    let timer = null;
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(renderPuzzlePreview, 120); };
    el.puzzleInput.addEventListener("input", schedule);
    if (el.puzzleHeading) el.puzzleHeading.addEventListener("input", schedule);
    if (el.puzzleFooter) el.puzzleFooter.addEventListener("change", renderPuzzlePreview);
    wireSwatchGroup(el.puzzleBorderGroup, "border", borderSwatchSVG, puzzleState, renderPuzzlePreview);
    if (el.puzzlePrint) el.puzzlePrint.addEventListener("click", printPuzzle);
    if (el.puzzlePng) el.puzzlePng.addEventListener("click", puzzlePNG);
    renderPuzzlePreview();
  }

  /* ---------------------------------------------------------------
     Wiring
     --------------------------------------------------------------- */

  /* js/printables/qr.js is fetched by this engine rather than tagged on all
     293 printables pages, the same ownership loadPdfModule() already uses for
     printablePdf.js. The difference is WHEN: a PDF is wanted only by the
     visitor who asks for one, but the QR is stamped on every print and every
     PNG, and both build their markup synchronously — so this one loads at
     init, not on demand.

     creditNode() and drawCredit() both degrade to the plain text credit if it
     has not arrived (a click within the first few hundred ms of a very slow
     connection). That degradation is announced rather than silent: a sheet
     that quietly loses its QR looks exactly like one that never had it. */
  let qrWarned = false;
  function qrModule() {
    const ns = window.UltraTextGen && window.UltraTextGen.qr;
    if (!ns && !qrWarned) {
      qrWarned = true;
      console.warn("[printables] js/printables/qr.js has not loaded; this sheet carries the text credit without a QR code.");
    }
    return ns || null;
  }
  function loadQrModule() {
    if (window.UltraTextGen && window.UltraTextGen.qr) return;
    if (document.querySelector('script[data-pt-qr]')) return;
    const sc = document.createElement("script");
    sc.src = "/js/printables/qr.js";
    sc.async = true;
    sc.setAttribute("data-pt-qr", "");
    sc.onerror = () => console.warn("[printables] js/printables/qr.js failed to load; sheets will carry the text credit only.");
    document.head.appendChild(sc);
  }

  function init() {
    loadQrModule();
    /* Before applyPresetInputs(), which fills a roster from ?roster= and
       therefore has to find one. el is built at module scope, so a roster
       created here is written back onto it rather than re-queried everywhere. */
    mountNameCase();
    mountLeftHanded();
    mountSpacing();
    if (CFG.stencil === true) loadStencilModule();
    mountStencilToggle();
    [el.nameRows, el.genRows].forEach(addLowDensityOption);
    /* After load, not here: footer.js is deferred and sits AFTER this file in
       document order, so at init() the footer this reads its labels from does
       not exist yet. The same deferred-script trap symbol-explorer.js hit with
       readyState, in its other form. */
    if (document.readyState === "complete") mountCarryRow();
    else window.addEventListener("load", mountCarryRow, { once: true });
    if (CFG.roster === true) {
      ["name", "gen", "design", "puzzle"].forEach((kind) => {
        const made = mountRoster(kind);
        if (made) el[kind + "Roster"] = made;
      });
    }
    /* AFTER mountRoster, not before it. Both of these read primaryRoster():
       the cost line binds its input listener to one, and the N chips exist
       only where one does. el.*Roster is captured at module scope, so on the
       nine locale pages that take CFG.roster === true it is still null when
       init starts -- which left those pages with a cost line that never
       updated as you typed, and would have left them with no N control at
       all. Measured on de/zum-ausdrucken/namen-schreiben before the move. */
    mountSheetCost();
    mountNUp();
    applyPresetInputs();
    initStrokeToggle();
    /* Before the first paint, not after: setCharStyle() reassigns the FONT
       every surface below reads, so wiring it here means the picker and the
       alphabet sheet are drawn in the chosen letterform once instead of
       drawn in the page default and then repainted. `quiet` skips the
       repaint for exactly that reason. */
    if (CHAR_STYLES && el.charStyles) {
      $$(".pt-char-style-opt", el.charStyles).forEach((b) => {
        b.addEventListener("click", () => setCharStyle(b.dataset.style));
      });
      setCharStyle(charStyleKey, { quiet: true });
    }
    buildStrip();
    buildAlphabetGrid();
    buildSpokeBatch();
    initGenerator();
    buildDesigner();
    buildBanner();
    buildPuzzle();

    if (el.practicePrint) el.practicePrint.addEventListener("click", buildPracticeSheet);

    if (el.nameInput) {
      let timer = null;
      el.nameInput.addEventListener("input", () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(renderNamePreview, 120);
      });
      renderNamePreview();
    }
    if (el.namePrint) el.namePrint.addEventListener("click", buildNameWorksheet);
    const namePngOpts = (transparent) => {
      if (!NAME_STYLES) return transparent ? { transparent: true } : undefined;
      const o = nameRenderOpts("preview");
      o.transparent = !!transparent;
      return o;
    };
    if (el.namePng) el.namePng.addEventListener("click", () => wordPNG(nameValue(), namePngOpts(false)));
    if (el.namePngT) el.namePngT.addEventListener("click", () => wordPNG(nameValue(), namePngOpts(true)));

    // Name-style designer (CFG.nameStyles pages): style chips + colour
    // inputs + the solid-fill toggle all repaint the live preview.
    if (NAME_STYLES && el.nameStyles) {
      $$(".pt-name-style-opt", el.nameStyles).forEach((b) => {
        b.addEventListener("click", () => setNameStyle(b.dataset.style));
      });
      setNameStyle(nameStyleKey);
    }
    [el.nameFill, el.nameStroke, el.nameSolid].forEach((c) => {
      if (c) c.addEventListener("input", renderNamePreview);
    });

    if (el.strip || el.panel) {
      // CFG.initialChar locks a page to a single letter on load (spoke pages);
      // falls back to CHARS[0] when unset so existing pages are unaffected.
      let initial = CHARS[0];
      if (CFG.initialChar && CHARS.indexOf(String(CFG.initialChar).toUpperCase()) !== -1) {
        initial = String(CFG.initialChar).toUpperCase();
      }
      const h = (window.location.hash || "").replace(/^#/, "");
      const match = CHARS.filter((c) => charSlug(c) === h)[0];
      if (match) initial = match;
      selectChar(initial, { silent: true });
    }

    buildPrintOptions();
    convertPrintButtonsToPdf();
    wireGenerateEvents();
    applyPresetState();
    /* Glyph-mode pages draw a Unicode math alphanumeric, so their letterform
       is whatever the OS substitutes; the family-name check can never see it.
       Once after the declared faces have settled, measure whether the family
       draws the codepoint at all. See noteGlyphCoverage(). */
    if (RENDER === "glyph" && document.fonts && document.fonts.ready) {
      const sample = renderGlyph("A");
      if (sample && sample !== "A") {
        document.fonts.ready
          .then(() => noteGlyphCoverage(sample, primaryFontName()))
          .catch(() => { /* measurement is best-effort */ });
      }
    }
  }

  /* Keyed on "complete", not on "loading" — the idiom symbol-explorer.js
     settled on after shipping the bug. This file and the two modules it
     depends on are all `defer`, and every deferred script runs BEFORE
     DOMContentLoaded fires. During this file's own execution readyState is
     already "interactive", so a `=== "loading"` guard runs init() immediately;
     it worked only because share-core.js and saved-items.js happen to sit
     earlier in document order on every page that loads this engine. Move a
     tag and the share row and the saved-sheets strip stop rendering, with no
     error and no failing check. Keying on "complete" makes the wiring
     independent of tag order (2026-09-13). */
  if (document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
