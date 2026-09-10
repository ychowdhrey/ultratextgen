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
      printThisLetter: "Print this letter", printThisNumber: "Print this number",
      downloadPng: "Download PNG",
      copyPaste: "Copy-paste", copy: "Copy", howToDraw: "How to draw it", lowerSuffix: " · lower",
      level: "Level", nameLabel: "Name:", dateLabel: "Date:", space: "space",
      dotToDot: "dot to dot", bannerFlag: "Banner flag —",
      dotsCount: "dots", dotNumbers: "Numbered dots",
      dotLadderTitle: "Practice ladder",
      dotLadderText: "Start easy and add dots as it gets comfortable. Mastered Expert? Turn the numbers off, then try drawing it freehand.",
      pdfHint: "Tip: Print → “Save as PDF” downloads this sheet as a PDF.",
      printBook: "Print as a book — one page per letter",
      nameStyleLabel: "Style", nameFillLabel: "Fill", nameStrokeLabel: "Outline",
      nameSolidLabel: "Colour it in now (solid fill)",
      pngTransparent: "PNG (transparent)",
      classSet: "Class set — one sheet per name", sheets: "sheets",
      classSetPngHint: "PNG downloads the current name; use Print for the whole set.",
      bannerInstr: "Cut each flag along its dashed line, punch a hole at each dot, then thread string or ribbon through in order (1, 2, 3…) to spell it out.",
      puzzleCut: "Cut along the dashed lines to separate each letter piece.",
      usLetter: "US Letter",
      bannerFlagsLabel: "banner flags", ofWord: "of",
      flagCount: { one: "flag", other: "flags" },
      pageCount: { one: "page", other: "pages" },
      modelCount: { one: "model", other: "model" },
      traceCount: { one: "trace", other: "trace" },
      blankCount: { one: "blank", other: "blank" },
      trace: {
        solid:    { label: "Solid model", hint: "Full dark letters — trace right on top" },
        "bold-dot": { label: "Bold dotted", hint: "Thick, closely-spaced dots to join" },
        "fine-dot": { label: "Fine dotted", hint: "Thinner dots with a little more space" },
        dashed:   { label: "Dashed", hint: "Broken dashes — more line to complete" },
        faded:    { label: "Faded ghost", hint: "Light gray letters to write over" },
        faint:    { label: "Faint guide", hint: "Barely-there outline — almost solo" },
        blank:    { label: "Blank line", hint: "No guide — write it from memory" }
      },
      dot: {
        easy:   { label: "Easy", hint: "Big gaps, few dots — the youngest kids" },
        medium: { label: "Medium", hint: "A balanced connect-the-dots" },
        hard:   { label: "Hard", hint: "More dots and finer letter detail" },
        expert: { label: "Expert", hint: "Lots of dots — a real challenge" }
      },
      size: {
        label: "Print size",
        full:   { label: "Full page", hint: "One big letter per sheet — today's default" },
        medium: { label: "Medium (~4 in)", hint: "Several letters per sheet — good for posters" },
        small:  { label: "Small (~2 in)", hint: "Many letters per sheet — great for bulletin boards" }
      }
    },
    fr: {
      letterWord: "lettre", numberWord: "chiffre",
      copied: "Copié !",
      printThisLetter: "Imprimer cette lettre", printThisNumber: "Imprimer ce chiffre",
      downloadPng: "Télécharger le PNG",
      copyPaste: "Copier-coller", copy: "Copier", howToDraw: "Comment la dessiner", lowerSuffix: " · min.",
      level: "Niveau", nameLabel: "Prénom :", dateLabel: "Date :", space: "espace",
      dotToDot: "point à point", bannerFlag: "Fanion —",
      dotsCount: "points", dotNumbers: "Points numérotés",
      dotLadderTitle: "Échelle de difficulté",
      dotLadderText: "Commencez facile, puis ajoutez des points. Niveau Expert maîtrisé ? Retirez les numéros, puis essayez de dessiner à main levée.",
      pdfHint: "Astuce : Imprimer → « Enregistrer au format PDF » télécharge la feuille en PDF.",
      printBook: "Imprimer en livret — une page par lettre",
      nameStyleLabel: "Style", nameFillLabel: "Remplissage", nameStrokeLabel: "Contour",
      nameSolidLabel: "Colorier maintenant (remplissage plein)",
      pngTransparent: "PNG (transparent)",
      classSet: "Série pour la classe — une feuille par prénom", sheets: "feuilles",
      classSetPngHint: "Le PNG télécharge le prénom affiché ; utilisez Imprimer pour toute la série.",
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
      printThisLetter: "Imprimir esta letra", printThisNumber: "Imprimir este número",
      downloadPng: "Descargar PNG",
      copyPaste: "Copiar y pegar", copy: "Copiar", howToDraw: "Cómo dibujarla", lowerSuffix: " · min.",
      level: "Nivel", nameLabel: "Nombre:", dateLabel: "Fecha:", space: "espacio",
      dotToDot: "unir los puntos", bannerFlag: "Banderín —",
      dotsCount: "puntos", dotNumbers: "Puntos numerados",
      dotLadderTitle: "Escalera de dificultad",
      dotLadderText: "Empieza en fácil y añade puntos poco a poco. ¿Dominas el nivel experto? Quita los números y prueba a dibujar a mano alzada.",
      pdfHint: "Consejo: Imprimir → «Guardar como PDF» descarga la hoja en PDF.",
      printBook: "Imprimir como libro — una página por letra",
      nameStyleLabel: "Estilo", nameFillLabel: "Relleno", nameStrokeLabel: "Contorno",
      nameSolidLabel: "Colorear ahora (relleno sólido)",
      pngTransparent: "PNG (transparente)",
      classSet: "Juego para la clase — una hoja por nombre", sheets: "hojas",
      classSetPngHint: "El PNG descarga el nombre actual; usa Imprimir para el juego completo.",
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
      printThisLetter: "Imprimir esta letra", printThisNumber: "Imprimir este número",
      downloadPng: "Baixar PNG",
      copyPaste: "Copiar e colar", copy: "Copiar", howToDraw: "Como desenhar", lowerSuffix: " · min.",
      level: "Nível", nameLabel: "Nome:", dateLabel: "Data:", space: "espaço",
      dotToDot: "ligar os pontos", bannerFlag: "Bandeirinha —",
      dotsCount: "pontos", dotNumbers: "Pontos numerados",
      dotLadderTitle: "Escada de dificuldade",
      dotLadderText: "Comece no fácil e adicione pontos aos poucos. Dominou o nível especialista? Desligue os números e tente desenhar à mão livre.",
      pdfHint: "Dica: Imprimir → “Salvar como PDF” baixa a folha em PDF.",
      printBook: "Imprimir como livro — uma página por letra",
      nameStyleLabel: "Estilo", nameFillLabel: "Preenchimento", nameStrokeLabel: "Contorno",
      nameSolidLabel: "Colorir agora (preenchimento sólido)",
      pngTransparent: "PNG (transparente)",
      classSet: "Conjunto para a turma — uma folha por nome", sheets: "folhas",
      classSetPngHint: "O PNG baixa o nome atual; use Imprimir para o conjunto completo.",
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
      printThisLetter: "Stampa questa lettera", printThisNumber: "Stampa questo numero",
      downloadPng: "Scarica PNG",
      copyPaste: "Copia e incolla", copy: "Copia", howToDraw: "Come disegnarla", lowerSuffix: " · min.",
      level: "Livello", nameLabel: "Nome:", dateLabel: "Data:", space: "spazio",
      dotToDot: "unisci i puntini", bannerFlag: "Bandierina —",
      dotsCount: "punti", dotNumbers: "Punti numerati",
      dotLadderTitle: "Scala di difficoltà",
      dotLadderText: "Inizia dal facile e aggiungi punti man mano. Livello esperto superato? Togli i numeri e prova a disegnare a mano libera.",
      pdfHint: "Suggerimento: Stampa → “Salva come PDF” scarica il foglio in PDF.",
      printBook: "Stampa come libretto — una pagina per lettera",
      nameStyleLabel: "Stile", nameFillLabel: "Riempimento", nameStrokeLabel: "Contorno",
      nameSolidLabel: "Colora adesso (riempimento pieno)",
      pngTransparent: "PNG (trasparente)",
      classSet: "Set per la classe — un foglio per nome", sheets: "fogli",
      classSetPngHint: "Il PNG scarica il nome corrente; usa Stampa per l'intero set.",
      bannerInstr: "Ritaglia ogni bandierina lungo la linea tratteggiata, fai un foro su ogni punto, poi infila uno spago o un nastro in ordine (1, 2, 3…) per comporre la parola.",
      puzzleCut: "Ritaglia lungo le linee tratteggiate per separare ogni pezzo-lettera.",
      trace: {
        solid:    { label: "Modello pieno", hint: "Lettere piene e scure — ricalca sopra" },
        "bold-dot": { label: "Puntinato spesso", hint: "Punti spessi e ravvicinati da unire" },
        "fine-dot": { label: "Puntinato fine", hint: "Punti più sottili e un po' più distanziati" },
        dashed:   { label: "Tratteggiato", hint: "Trattini spezzati — più linea da completare" },
        faded:    { label: "Fantasma chiaro", hint: "Lettere grigio chiaro da ripassare" },
        faint:    { label: "Guida leggera", hint: "Contorno appena visibile — quasi da solo" },
        blank:    { label: "Riga vuota", hint: "Nessuna guida — scrivila a memoria" }
      },
      dot: {
        easy:   { label: "Facile", hint: "Spazi ampi, pochi punti — i più piccoli" },
        medium: { label: "Medio", hint: "Un unisci-i-puntini equilibrato" },
        hard:   { label: "Difficile", hint: "Più punti e più dettaglio nella lettera" },
        expert: { label: "Esperto", hint: "Tanti punti — una vera sfida" }
      },
      size: {
        label: "Formato di stampa",
        full:   { label: "Pagina intera", hint: "Una grande lettera per foglio — l'opzione predefinita" },
        medium: { label: "Medio (~10 cm)", hint: "Diverse lettere per foglio — comodo per i poster" },
        small:  { label: "Piccolo (~5 cm)", hint: "Tante lettere per foglio — ideale per una bacheca" }
      }
    },
    pl: {
      letterWord: "litera", numberWord: "cyfra",
      copied: "Skopiowano!",
      printThisLetter: "Wydrukuj tę literę", printThisNumber: "Wydrukuj tę cyfrę",
      downloadPng: "Pobierz PNG",
      copyPaste: "Kopiuj i wklej", copy: "Kopiuj", howToDraw: "Jak ją narysować", lowerSuffix: " · mała",
      level: "Poziom", nameLabel: "Imię:", dateLabel: "Data:", space: "spacja",
      dotToDot: "połącz kropki", bannerFlag: "Chorągiewka —",
      dotsCount: "kropek", dotNumbers: "Ponumerowane kropki",
      dotLadderTitle: "Drabinka trudności",
      dotLadderText: "Zacznij od łatwego poziomu i stopniowo dodawaj kropki. Opanowane? Wyłącz numery i spróbuj narysować odręcznie.",
      pdfHint: "Wskazówka: Drukuj → „Zapisz jako PDF”, aby pobrać arkusz w PDF.",
      printBook: "Wydrukuj jako książeczkę — jedna strona na literę",
      nameStyleLabel: "Styl", nameFillLabel: "Wypełnienie", nameStrokeLabel: "Kontur",
      nameSolidLabel: "Pokoloruj od razu (pełne wypełnienie)",
      pngTransparent: "PNG (przezroczyste tło)",
      classSet: "Zestaw dla klasy — jedna karta na imię", sheets: "kart",
      classSetPngHint: "PNG pobiera bieżące imię; użyj Drukuj dla całego zestawu.",
      bannerInstr: "Wytnij każdą chorągiewkę wzdłuż przerywanej linii, zrób dziurkę w każdym punkcie, a następnie przewlecz sznurek lub wstążkę po kolei (1, 2, 3…), aby ułożyć napis.",
      puzzleCut: "Tnij wzdłuż przerywanych linii, aby oddzielić każdy element-literę.",
      usLetter: "US Letter",
      bannerFlagsLabel: "chorągiewki", ofWord: "z",
      flagCount: { one: "chorągiewka", few: "chorągiewki", many: "chorągiewek" },
      pageCount: { one: "strona", few: "strony", many: "stron" },
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
      printThisLetter: "Diesen Buchstaben drucken", printThisNumber: "Diese Zahl drucken",
      downloadPng: "PNG herunterladen",
      copyPaste: "Kopieren", copy: "Kopieren", howToDraw: "So wird er gezeichnet", lowerSuffix: " · klein",
      level: "Stufe", nameLabel: "Name:", dateLabel: "Datum:", space: "Leerzeichen",
      dotToDot: "Punkte verbinden", bannerFlag: "Wimpel —",
      dotsCount: "Punkte", dotNumbers: "Nummerierte Punkte",
      dotLadderTitle: "Schwierigkeitsleiter",
      dotLadderText: "Leicht anfangen, dann Punkte dazunehmen. Experte geschafft? Zahlen ausblenden und frei zeichnen.",
      pdfHint: "Tipp: Drucken → „Als PDF speichern“ lädt das Blatt als PDF herunter.",
      printBook: "Als Heft drucken — eine Seite pro Buchstabe",
      nameStyleLabel: "Stil", nameFillLabel: "Füllung", nameStrokeLabel: "Kontur",
      nameSolidLabel: "Jetzt ausmalen (volle Füllung)",
      pngTransparent: "PNG (transparent)",
      classSet: "Klassensatz — ein Blatt pro Name", sheets: "Blätter",
      classSetPngHint: "PNG lädt den aktuellen Namen; für den ganzen Satz Drucken verwenden.",
      bannerInstr: "Schneide jeden Wimpel entlang der gestrichelten Linie aus, stich an jedem Punkt ein Loch und fädle eine Schnur oder ein Band der Reihe nach (1, 2, 3…) durch, um das Wort zu bilden.",
      puzzleCut: "Schneide entlang der gestrichelten Linien, um jedes Buchstaben-Teil zu trennen.",
      usLetter: "US Letter",
      modelCount: { one: "Vorlagenzeile", other: "Vorlagenzeilen" },
      traceCount: { one: "Nachspurzeile", other: "Nachspurzeilen" },
      blankCount: { one: "Leerzeile", other: "Leerzeilen" },
      trace: {
        solid:    { label: "Volle Vorlage", hint: "Dunkle, volle Buchstaben — direkt nachfahren" },
        "bold-dot": { label: "Dick gepunktet", hint: "Dicke, eng gesetzte Punkte zum Verbinden" },
        "fine-dot": { label: "Fein gepunktet", hint: "Dünnere Punkte mit etwas mehr Abstand" },
        dashed:   { label: "Gestrichelt", hint: "Unterbrochene Striche — mehr Linie zu ergänzen" },
        faded:    { label: "Blasser Schatten", hint: "Hellgraue Buchstaben zum Überschreiben" },
        faint:    { label: "Leichte Hilfe", hint: "Kaum sichtbarer Umriss — fast allein" },
        blank:    { label: "Leere Linie", hint: "Keine Hilfe — aus dem Gedächtnis schreiben" }
      },
      dot: {
        easy:   { label: "Leicht", hint: "Große Abstände, wenige Punkte — die Jüngsten" },
        medium: { label: "Mittel", hint: "Ausgewogenes Punkte-Verbinden" },
        hard:   { label: "Schwer", hint: "Mehr Punkte und feinere Details" },
        expert: { label: "Experte", hint: "Viele Punkte — eine echte Herausforderung" }
      },
      size: {
        label: "Druckgröße",
        full:   { label: "Ganze Seite", hint: "Ein großer Buchstabe pro Blatt — die heutige Standardeinstellung" },
        medium: { label: "Mittel (~10 cm)", hint: "Mehrere Buchstaben pro Blatt — gut für Poster" },
        small:  { label: "Klein (~5 cm)", hint: "Viele Buchstaben pro Blatt — ideal für eine Pinnwand" }
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
      printThisLetter: "Cetak huruf ini", printThisNumber: "Cetak angka ini",
      downloadPng: "Unduh PNG",
      copyPaste: "Salin-tempel", copy: "Salin", howToDraw: "Cara menulisnya", lowerSuffix: " \u00b7 kecil",
      level: "Tingkat", nameLabel: "Nama:", dateLabel: "Tanggal:", space: "spasi",
      dotToDot: "sambung titik", bannerFlag: "Bendera banner \u2014",
      dotsCount: "titik", dotNumbers: "Titik bernomor",
      dotLadderTitle: "Tangga latihan",
      dotLadderText: "Mulai dari yang mudah, lalu tambah titiknya begitu sudah terbiasa. Sudah lancar di tingkat Ahli? Matikan nomornya, lalu coba gambar sendiri tanpa panduan.",
      pdfHint: "Tips: Cetak \u2192 \u201cSimpan sebagai PDF\u201d akan mengunduh lembar ini sebagai PDF.",
      printBook: "Cetak sebagai buku \u2014 satu halaman per huruf",
      nameStyleLabel: "Gaya", nameFillLabel: "Warna isi", nameStrokeLabel: "Garis tepi",
      nameSolidLabel: "Langsung diwarnai (isi penuh)",
      pngTransparent: "PNG (transparan)",
      classSet: "Set kelas \u2014 satu lembar per nama", sheets: "lembar",
      classSetPngHint: "PNG mengunduh nama yang sedang tampil; pakai Cetak untuk seluruh setnya.",
      bannerInstr: "Gunting tiap bendera mengikuti garis putus-putus, lubangi di setiap titik, lalu masukkan tali atau pita berurutan (1, 2, 3\u2026) sampai membentuk katanya.",
      puzzleCut: "Gunting mengikuti garis putus-putus untuk memisahkan tiap kepingan huruf.",
      usLetter: "US Letter",
      bannerFlagsLabel: "bendera banner", ofWord: "dari",
      flagCount: { one: "bendera", other: "bendera" },
      pageCount: { one: "halaman", other: "halaman" },
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
  const T = I18N[LANG] || I18N.en;

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
  const STROKE = CFG.strokeWidth || 9;
  const NOUN = CFG.noun || "letter";                // "bubble letter", "block letter"…
  // Extra space between letters in multi-letter (word/name) output, expressed
  // as a fraction of the font size (em). Puffy, non-connecting outlines
  // (bubble, block) read better with a little breathing room so each letter
  // can be traced and colored on its own; connected glyphs (cursive) leave
  // this at 0 so their joins stay intact.
  const LETTER_SPACING = Number(CFG.letterSpacing) || 0;
  const PNG_PREFIX = CFG.pngPrefix || "printable";
  const GLYPH_STYLE = CFG.glyphStyle || "";         // primary registry style (glyph mode)
  const INK = "#1a1a2e";

  const el = {
    strip: $("#pt-strip"),
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
    text.setAttribute("stroke-width", String(o.small ? Math.max(4, STROKE - 2) : STROKE));
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    text.textContent = ch;
    svg.appendChild(text);
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
    const spacing = fontSize * (o.spacing != null ? o.spacing : LETTER_SPACING);
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
    text.setAttribute("fill", o.solid ? (o.fill || INK) : "#ffffff");
    text.setAttribute("stroke", o.solid ? (o.strokeColor || "none") : (o.strokeColor || "#8b93a7"));
    text.setAttribute("stroke-width", o.solid ? String(o.strokeColor ? (o.strokeWidth != null ? o.strokeWidth : 4) : 0) : String(o.strokeWidth != null ? o.strokeWidth : 3));
    text.setAttribute("stroke-linejoin", "round");
    text.setAttribute("paint-order", "stroke");
    // Nudge the anchor left by half a letter-gap so the trailing space SVG adds
    // after the final glyph doesn't push the centered word off-center.
    if (spacing) {
      text.setAttribute("letter-spacing", String(spacing));
      text.setAttribute("dx", String(-spacing / 2));
    }
    text.textContent = word;
    svg.appendChild(text);
    if (o.overlay) addWordStrokeOverlay(svg, word, fontSize, spacing, 112, "central", w);
    return svg;
  }

  // The big figure for the detail panel: outline SVG, a script-glyph pair, or
  // (RENDER === "dots") a single-character numbered dot-to-dot.
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

  function withFont(cb, famOverride) {
    const fam = famOverride || primaryFontName();
    if (fam && document.fonts && document.fonts.load) {
      document.fonts.load("700 200px " + fam).then(cb).catch(cb);
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

  function downloadCanvas(canvas, filename, sheet) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackPrintable("download_png", sheet);
    }, "image/png");
  }

  // Small, low-contrast site credit near the bottom edge — the same
  // sheet-like-printable convention used elsewhere in this engine (print
  // titles, other PNG exports). Not drawn for RENDER === "glyph" (cursive/
  // calligraphy pages): those are typed-word art the visitor downloads to
  // use as-is, not a practice/coloring sheet, so they stay clean by design.
  function drawCredit(ctx, w, h) {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.font = "22px " + FONT;
    ctx.fillStyle = "#aeb4c0";
    ctx.fillText("ultratextgen.com", w / 2, h - 24);
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
        drawDotWordCanvas(ctx, ch.toUpperCase(), dotPageState.level, { x: pad, y: pad, w: size - pad * 2, h: size - pad * 2 }, CFG.dotHint !== false, dotPageState.numbers);
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
      ctx.font = "700 " + Math.round(size * (RENDER === "glyph" ? 0.4 : 0.66)) + "px " + FONT;
      if (RENDER === "outline") {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(glyph, size / 2, size * 0.5);
        ctx.lineWidth = Math.round(size * 0.045);
        ctx.strokeStyle = INK;
        ctx.strokeText(glyph, size / 2, size * 0.5);
      } else {
        ctx.fillStyle = INK;
        ctx.fillText(glyph, size / 2, size * 0.54);
      }
      if (RENDER !== "glyph") drawCredit(ctx, size, size);
      downloadCanvas(canvas, PNG_PREFIX + "-" + charSlug(ch) + ".png", "character");
    });
  }

  // A word / name -> wide PNG. opts (all optional — the name-style designer
  // path): font / spacing / fill / strokeColor / solid / transparent.
  function wordPNG(text, opts) {
    const o = opts || {};
    const fam = o.font || FONT;
    const spacingEm = o.spacing != null ? o.spacing : LETTER_SPACING;
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
        // Hollow outline. On a transparent canvas a white interior would
        // read as a white slab — keep the interior a real hole instead.
        if (!o.transparent) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(out, width / 2, height * 0.52);
        }
        ctx.lineWidth = Math.max(6, Math.round(fontSize * 0.06));
        ctx.strokeStyle = o.strokeColor || INK;
        ctx.strokeText(out, width / 2, height * 0.52);
      } else {
        ctx.fillStyle = INK;
        ctx.fillText(out, width / 2, height * 0.52);
      }
      if (RENDER !== "glyph") drawCredit(ctx, width, height);
      downloadCanvas(canvas, PNG_PREFIX + "-" + (slugify(text) || "word") + ".png", "word");
    }, o.font ? String(o.font).split(",")[0].trim().replace(/^['"]|['"]$/g, "") : null);
  }

  /* ---------------------------------------------------------------
     Print surface
     --------------------------------------------------------------- */

  function printWrap(titleText, bodyNode, sheet) {
    trackPrintable("print", sheet);
    if (!el.printRoot) { window.print(); return; }
    el.printRoot.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "bubble-print-wrap";
    if (titleText) {
      const h = document.createElement("h2");
      h.className = "bubble-print-title";
      h.textContent = titleText;
      wrap.appendChild(h);
    }
    wrap.appendChild(bodyNode);
    el.printRoot.appendChild(wrap);
    document.body.classList.add("is-printing");
    window.print();
    document.body.classList.remove("is-printing");
    el.printRoot.innerHTML = "";
  }

  /* ---------------------------------------------------------------
     Section: detail panel
     --------------------------------------------------------------- */

  let activeChar = "A";

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
    figure.appendChild(figureNode(ch));

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "bubble-btn bubble-btn-primary";
    printBtn.textContent = /[0-9]/.test(ch) ? T.printThisNumber : T.printThisLetter;
    printBtn.addEventListener("click", () => {
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
    actions.appendChild(printBtn);
    actions.appendChild(pngBtn);
    figure.appendChild(actions);

    // "Save as PDF" is the print dialog's native destination — say so, since
    // PDF is the format most printable searchers are looking for.
    const pdfTip = document.createElement("p");
    pdfTip.className = "pt-pdf-hint";
    pdfTip.textContent = T.pdfHint;
    figure.appendChild(pdfTip);

    // Right — copy-paste variants (glyph mode) and/or how-to steps.
    const detail = document.createElement("div");
    detail.className = "bubble-detail";

    const variants = (CFG.variantStyles || CFG.variantFamily) ? buildVariants(ch) : null;
    if (variants) {
      const title = document.createElement("h3");
      title.className = "bubble-detail-title";
      title.textContent = T.copyPaste + " " + NOUN + " " + charLabel(ch);
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
    if (detail.childNodes.length) stage.appendChild(detail);
    el.panel.appendChild(stage);

    if ((!opts || !opts.silent) && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + charSlug(ch));
    }
  }

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
    familyStyles().forEach(({ name, style }) => {
      cases.forEach((kind) => {
        const src = kind === "upper" ? ch.toUpperCase() : ch.toLowerCase();
        const rendered = renderGlyph(src, name);
        if (!rendered || rendered === src) return;
        any = true;
        const row = document.createElement("button");
        row.type = "button";
        row.className = "bubble-variant glyph-copy";
        row.dataset.text = rendered;
        row.setAttribute("aria-label", T.copy + " " + name + " " + NOUN + " " + charLabel(src));
        const glyph = document.createElement("span");
        glyph.className = "bubble-variant-glyph";
        glyph.textContent = rendered;
        const meta = document.createElement("span");
        meta.className = "bubble-variant-name";
        meta.textContent = name.replace(/^Ultra /, "") + (kind === "upper" ? "" : T.lowerSuffix);
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
  function printAlphabetBook() {
    const book = document.createElement("div");
    book.className = "bubble-print-book";
    CHARS.forEach((ch) => {
      const page = document.createElement("div");
      page.className = "bubble-print-book-page";
      const t = document.createElement("h3");
      t.className = "bubble-print-title";
      t.textContent = cap(NOUN) + " " + charLabel(ch) + " — ultratextgen.com";
      page.appendChild(t);
      page.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch) : outlineSVG(ch)));
      book.appendChild(page);
    });
    printWrap("", book, "alphabet_book");
  }

  function printAlphabetSheet() {
    const sheet = document.createElement("div");
    sheet.className = "bubble-print-sheet";
    CHARS.forEach((ch) => sheet.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch) : outlineSVG(ch, { small: true }))));
    printWrap(cap(NOUN) + " alphabet — ultratextgen.com", sheet, "alphabet_sheet");
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
  const TILE_PAGE_W_IN = 7.0;
  const TILE_PAGE_H_IN = 9.3;
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
    const cols = Math.max(1, Math.floor((TILE_PAGE_W_IN + TILE_GAP_IN) / (cellW + TILE_GAP_IN)));
    const rows = Math.max(1, Math.floor((TILE_PAGE_H_IN + TILE_GAP_IN) / (heightIn + TILE_GAP_IN)));
    return { cols: cols, rows: rows, perPage: cols * rows, cellW: cellW };
  }

  // The whole A–Z (or A–Z + 0–9) run, tiled several-per-page at a fixed real
  // letter height, paginated across as many sheets as needed — the
  // "bulletin board" size option. Reuses the exact same per-character figure
  // the compact sheet/book prints already draw (outlineSVG / singleDotSVG /
  // bigGlyphForPrint) and the same printWrap print call as every other
  // multi-page job in this file — just a new size-driven grid layout, no new
  // render primitive and no new print mechanism.
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
      title.textContent = cap(NOUN) + " alphabet — " + preset.label + " — page " + (pi + 1) + " of " + pages.length + " — ultratextgen.com";
      page.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "pt-tile-grid";
      grid.style.gridTemplateColumns = "repeat(" + layout.cols + ", " + layout.cellW.toFixed(2) + "in)";
      grid.style.gap = TILE_GAP_IN.toFixed(2) + "in";
      chunk.forEach((ch) => {
        const cell = document.createElement("div");
        cell.className = "pt-tile-cell";
        cell.style.height = heightIn.toFixed(2) + "in";
        cell.appendChild(RENDER === "glyph" ? bigGlyphForPrint(ch) : (RENDER === "dots" ? singleDotSVG(ch, { small: small }) : outlineSVG(ch, { small: small })));
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
    if (!el.sizeControl) return;
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
      });
      group.appendChild(b);
    });
    el.sizeControl.appendChild(group);
  }

  function buildAlphabetGrid() {
    buildSizeControl();
    if (el.bookPrint) el.bookPrint.addEventListener("click", printAlphabetBook);
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
        bookBtn.textContent = T.printBook;
        bookBtn.addEventListener("click", printAlphabetBook);
        el.alphaPrint.insertAdjacentElement("afterend", bookBtn);
      }
    }
    if (!el.alphaGrid) return;
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
    printWrap(cap(NOUN) + " practice sheet — ultratextgen.com", sheet, "practice_sheet");
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
      spacing: style.letterSpacing != null ? style.letterSpacing : LETTER_SPACING
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

  function nameValue() {
    const raw = el.nameInput ? el.nameInput.value : "";
    return (raw && raw.trim()) ? raw.trim().slice(0, 40) : NAME_DEMO;
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
    return rows;
  }

  function buildNameWorksheet() {
    const names = rosterNames(el.nameRoster);
    if (names.length >= 2) {
      const set = document.createElement("div");
      set.className = "pt-class-set";
      names.forEach((n) => {
        const page = document.createElement("div");
        page.className = "pt-sheet-page";
        page.appendChild(nameSheetNode(n));
        set.appendChild(page);
      });
      printWrap(names.length + " " + T.sheets + " — tracing worksheets · ultratextgen.com", set, "name_worksheet");
      return;
    }
    printWrap(nameValue() + " — tracing worksheet · ultratextgen.com", nameSheetNode(), "name_worksheet");
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

  function levelSpec(level) {
    const i = Math.max(0, Math.min(TRACE_LEVELS.length - 1, (level || 1) - 1));
    return TRACE_LEVELS[i];
  }

  // Ruled guideline (top / midline / baseline) inside a worksheet SVG.
  function addGuide(svg, w, y, dashed) {
    const l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", "8");
    l.setAttribute("x2", String(w - 8));
    l.setAttribute("y1", String(y));
    l.setAttribute("y2", String(y));
    l.setAttribute("stroke", dashed ? GUIDE_MID : GUIDE);
    l.setAttribute("stroke-width", dashed ? "1.5" : "2");
    if (dashed) l.setAttribute("stroke-dasharray", "6 8");
    svg.appendChild(l);
  }

  // A word rendered at a difficulty level, on a ruled baseline. The single
  // primitive behind both the live preview and every printed row.
  const TRACE_FONT_SIZE = 132;
  const TRACE_BASE = 158, TRACE_MID = 104, TRACE_TOP = 50, TRACE_H = 210;

  function traceWordSVG(word, level, opts) {
    const o = opts || {};
    const spec = levelSpec(level);
    const chars = [...String(word)];
    const w = Math.max(360, chars.length * 116 + 120);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " " + TRACE_H);
    svg.setAttribute("class", "pt-trace-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", word + " — " + spec.label);
    if (o.guides !== false) {
      addGuide(svg, w, TRACE_TOP, false);
      addGuide(svg, w, TRACE_MID, true);
      addGuide(svg, w, TRACE_BASE, false);
    }
    if (!spec.blank) {
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", String(w / 2));
      t.setAttribute("y", String(TRACE_BASE));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", FONT);
      t.setAttribute("font-weight", "700");
      t.setAttribute("font-size", String(TRACE_FONT_SIZE));
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
      if (o.overlay) addWordStrokeOverlay(svg, word, TRACE_FONT_SIZE, 0, TRACE_BASE, "alphabetic", w);
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
  function rosterNames(mount) {
    if (!mount) return [];
    return mount.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, ROSTER_CAP);
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
    const svg = traceWordSVG("Aa", level, { guides: false });
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
      el.genPreviewMeta.textContent = parts.join(" · ") + " · " + T.usLetter;
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
    const names = rosterNames(el.genRoster);
    if (names.length >= 2) {
      const set = document.createElement("div");
      set.className = "pt-class-set";
      names.forEach((n) => {
        const page = document.createElement("div");
        page.className = "pt-sheet-page";
        page.appendChild(genSheetNode(n));
        set.appendChild(page);
      });
      printWrap(names.length + " " + T.sheets + " — " + spec.label + " · ultratextgen.com", set, "generator_sheet");
      return;
    }
    printWrap(genValue() + " — " + spec.label + " worksheet · ultratextgen.com", genSheetNode(), "generator_sheet");
  }

  // The whole difficulty ladder as one print job — one sheet per level,
  // easiest to hardest, same word. The graded progression is the thing the
  // level engine can batch that a static-PDF sheet never can.
  function buildGeneratorLadder() {
    const word = genValue();
    const set = document.createElement("div");
    set.className = "pt-class-set";
    TRACE_LEVELS.forEach((spec, i) => {
      const page = document.createElement("div");
      page.className = "pt-sheet-page";
      page.appendChild(genSheetNode(word, i + 1));
      set.appendChild(page);
    });
    printWrap(word + " — " + TRACE_LEVELS.length + " " + T.sheets + " · ultratextgen.com", set, "generator_ladder");
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
      const drawGuide = (y, dashed) => {
        ctx.beginPath();
        ctx.setLineDash(dashed ? [6, 8] : []);
        ctx.lineWidth = dashed ? 1.5 : 2;
        ctx.strokeStyle = dashed ? GUIDE_MID : GUIDE;
        ctx.moveTo(pad * 0.5, y); ctx.lineTo(width - pad * 0.5, y); ctx.stroke();
      };
      drawGuide(base, false);
      drawGuide(base - Math.round(fontSize * 0.52), true);
      drawGuide(base - Math.round(fontSize * 0.74), false);

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
  const designState = { fill: "plain", border: "none", mode: "outline", density: "medium", hint: true };

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

  function designText() {
    const raw = el.designInput ? el.designInput.value : "";
    return (raw && raw.trim()) ? raw.trim().slice(0, 24) : DESIGN_DEMO;
  }
  // Optional second line ("Happy Birthday" / "Emma") — empty string when the
  // page has no line-2 mount or it's blank.
  function designLine2() {
    const raw = el.designInput2 ? el.designInput2.value : "";
    return raw ? raw.trim().slice(0, 24) : "";
  }
  function designHeadingText() {
    return el.designHeading ? el.designHeading.value.trim().slice(0, 48) : "";
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
  const DOT_LEVELS = [
    { key: "easy",   label: T.dot.easy.label,   total: 26, single: 12, hint: T.dot.easy.hint },
    { key: "medium", label: T.dot.medium.label, total: 42, single: 16, hint: T.dot.medium.hint },
    { key: "hard",   label: T.dot.hard.label,   total: 60, single: 19, hint: T.dot.hard.hint },
    { key: "expert", label: T.dot.expert.label, total: 84, single: 22, hint: T.dot.expert.hint }
  ];
  function dotLevel(key) {
    for (let i = 0; i < DOT_LEVELS.length; i++) if (DOT_LEVELS[i].key === key) return DOT_LEVELS[i];
    return DOT_LEVELS[1];
  }

  // Raster geometry constants (offscreen, per letter). A shared baseline and
  // height keep every letter's y-coordinates comparable so the word sits on
  // one line with ascenders/descenders in the right place.
  const DOT_FS = 240, DOT_BASELINE = 270, DOT_CANVAS_H = 390, DOT_TRACKING = 0.14;
  const DOT_MIN = 5, DOT_MAX = 22;
  // 8-neighbourhood in clockwise order (E, SE, S, SW, W, NW, N, NE).
  const DOT_N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function dotDirIndex(dx, dy) { for (let i = 0; i < 8; i++) if (DOT_N8[i][0] === dx && DOT_N8[i][1] === dy) return i; return 4; }

  // Rasterize one character to a black-on-white bitmap and return an ink mask.
  function dotRasterChar(ch) {
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
    return { mask: mask, w: w, h: h, adv: adv };
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

  // Resample a closed polyline into n points evenly spaced by arc length.
  function dotResampleClosed(pts, n) {
    const m = pts.length;
    if (m < 2 || n < 1) return pts.slice(0, Math.max(1, n));
    const cum = [0];
    for (let i = 1; i <= m; i++) {
      const a = pts[(i - 1) % m], b = pts[i % m];
      cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const total = cum[m] || 1;
    const out = [];
    for (let k = 0; k < n; k++) {
      const t = (k / n) * total;
      let lo = 0, hi = m;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] <= t) lo = mid + 1; else hi = mid; }
      const i = Math.max(1, lo) - 1;
      const segLen = (cum[i + 1] - cum[i]) || 1;
      const f = (t - cum[i]) / segLen;
      const a = pts[i % m], b = pts[(i + 1) % m];
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return out;
  }

  // Trace a whole word into per-letter dot sets laid out on a shared baseline.
  // Returns { letters:[{mainPts,accentPts,cx,cy}], bbox } in raster units.
  function dotWordGeometry(text, total) {
    const chars = [...String(text)];
    const raw = [];
    let xoff = 0;
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
      let perim = 0;
      for (let i = 0; i < boundary.length; i++) {
        const a = boundary[i], b = boundary[(i + 1) % boundary.length];
        perim += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
      raw.push({ boundary: boundary, perim: perim, xoff: xoff, main: main, accents: kept.slice(1) });
      xoff += R.adv * (1 + DOT_TRACKING);
    });
    const totalPerim = raw.reduce((s, r) => s + r.perim, 0) || 1;
    const letters = [];
    raw.forEach((r) => {
      let n = Math.round((r.perim / totalPerim) * total);
      n = Math.max(DOT_MIN, Math.min(DOT_MAX, n));
      const mainPts = dotResampleClosed(r.boundary, n).map((p) => [p[0] + r.xoff, p[1]]);
      const accentPts = r.accents.map((c) => [c.cx + r.xoff, c.cy]);
      letters.push({ mainPts: mainPts, accentPts: accentPts, cx: r.main.cx + r.xoff, cy: r.main.cy });
    });
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    letters.forEach((L) => {
      L.mainPts.concat(L.accentPts).forEach((p) => {
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
  function layoutDotWord(text, level, box) {
    const lvl = dotLevel(level);
    const drawn = [...String(text)].filter((c) => c !== " ").length;
    const geom = dotWordGeometry(text, drawn === 1 ? lvl.single : lvl.total);
    const b = geom.bbox;
    const bw = Math.max(1, b.maxx - b.minx), bh = Math.max(1, b.maxy - b.miny);
    const scale = Math.min(box.w / bw, box.h / bh);
    const ox = box.x + (box.w - bw * scale) / 2 - b.minx * scale;
    const oy = box.y + (box.h - bh * scale) / 2 - b.miny * scale;
    const tx = (p) => [p[0] * scale + ox, p[1] * scale + oy];
    const letters = [];
    const all = [];
    geom.letters.forEach((L) => {
      const cpt = tx([L.cx, L.cy]);
      const loop = L.mainPts.map(tx);
      const dots = [];
      let num = 1;
      loop.forEach((p) => { dots.push({ x: p[0], y: p[1], label: num++, accent: false, cx: cpt[0], cy: cpt[1] }); all.push(p); });
      L.accentPts.map(tx).forEach((p) => { dots.push({ x: p[0], y: p[1], label: num++, accent: true, cx: cpt[0], cy: cpt[1] }); all.push(p); });
      letters.push({ loop: loop, dots: dots });
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
    return { letters: letters, dotR: dotR, numF: numF };
  }

  // Offset a number label radially outward from its letter centroid so it sits
  // clear of the outline where possible.
  function dotLabelPos(dot, dotR, numF) {
    let vx = dot.x - dot.cx, vy = dot.y - dot.cy;
    const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
    const off = dotR + numF * 0.62;
    return { x: dot.x + vx * off, y: dot.y + vy * off + numF * 0.34 };
  }

  // Render the dot-to-dot word into an SVG within the given box.
  // `numbers` (default true) toggles the printed dot numbers — turning them
  // off is the ladder's final stage before drawing freehand.
  function addDotWordSVG(svg, text, level, box, hint, numbers) {
    const lay = layoutDotWord(text, level, box);
    const numbered = numbers !== false;
    lay.letters.forEach((L) => {
      if (hint && L.loop.length > 1) {
        svgMake("polygon", {
          points: L.loop.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "),
          fill: "none", stroke: "#c7bdf0", "stroke-width": 2.2, "stroke-dasharray": "5 7", "stroke-linejoin": "round"
        }, svg);
      }
      L.dots.forEach((d) => {
        svgMake("circle", { cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: (d.accent ? lay.dotR * 0.9 : lay.dotR).toFixed(1), fill: INK }, svg);
        if (!numbered) return;
        const lp = dotLabelPos(d, lay.dotR, lay.numF);
        const t = svgMake("text", {
          x: lp.x.toFixed(1), y: lp.y.toFixed(1), "text-anchor": "middle",
          "font-family": FONT, "font-weight": 700, "font-size": lay.numF.toFixed(1),
          fill: INK, stroke: "#ffffff", "stroke-width": (lay.numF * 0.16).toFixed(1), "paint-order": "stroke"
        }, svg);
        t.textContent = String(d.label);
      });
    });
  }

  // Render the dot-to-dot word onto a Canvas within the given box.
  function drawDotWordCanvas(ctx, text, level, box, hint, numbers) {
    const lay = layoutDotWord(text, level, box);
    const numbered = numbers !== false;
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    lay.letters.forEach((L) => {
      if (hint && L.loop.length > 1) {
        ctx.beginPath();
        L.loop.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.closePath();
        ctx.setLineDash([5, 7]); ctx.lineWidth = 2.2; ctx.strokeStyle = "#c7bdf0"; ctx.stroke();
        ctx.setLineDash([]);
      }
      L.dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.accent ? lay.dotR * 0.9 : lay.dotR, 0, Math.PI * 2);
        ctx.fillStyle = INK; ctx.fill();
        if (!numbered) return;
        const lp = dotLabelPos(d, lay.dotR, lay.numF);
        ctx.font = "700 " + lay.numF.toFixed(1) + "px " + FONT;
        ctx.lineWidth = lay.numF * 0.16; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
        ctx.strokeText(String(d.label), lp.x, lp.y);
        ctx.fillStyle = INK; ctx.fillText(String(d.label), lp.x, lp.y);
      });
    });
    ctx.restore();
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
    numbers: true
  };
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
    addDotWordSVG(svg, ch.toUpperCase(), dotPageState.level, { x: 70, y: 70, w: 660, h: 820 }, CFG.dotHint !== false, dotPageState.numbers);
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
      small.textContent = lvl.single + " " + T.dotsCount;
      b.appendChild(small);
      b.addEventListener("click", () => {
        dotPageState.level = lvl.key;
        selectChar(activeChar, { silent: true });
      });
      group.appendChild(b);
    });
    wrap.appendChild(group);

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

  // The whole designed sheet as one portrait SVG (1000x1400). `textOverride`
  // is the class-set print path (one roster name per sheet — always a single
  // line); interactive use reads the input fields, including the optional
  // second line.
  function designSheetSVG(textOverride) {
    const text = textOverride != null ? String(textOverride).slice(0, 24) : designText();
    const line2 = textOverride != null ? "" : designLine2();
    const lines = line2 ? [text, line2] : [text];
    const heading = designHeadingText();
    const fill = designFillKind();
    const borderSym = designBorderSym();
    const footer = designFooterOn();
    const uid = ++designUid;
    const W = 1000, H = 1400, M = 70;

    const svg = svgMake("svg", { viewBox: "0 0 " + W + " " + H, class: "pt-design-sheet-svg", role: "img", "aria-label": (heading || lines.join(" ")) + " coloring sheet" });
    const defs = svgMake("defs", null, svg);

    svgMake("rect", { x: 18, y: 18, width: W - 36, height: H - 36, rx: 26, fill: "#ffffff", stroke: "#e2e6ee", "stroke-width": 3 }, svg);

    if (borderSym) {
      const strip = borderSym.split(" ").filter(Boolean);
      addBorderRow(svg, strip, 78);
      addBorderRow(svg, strip, H - 48);
    }

    if (heading) {
      const h = svgMake("text", { x: W / 2, y: 168, "text-anchor": "middle", "font-family": FONT, "font-weight": 700, "font-size": 62, fill: INK }, svg);
      h.textContent = heading;
    }

    const availW = W - M * 2;

    if (designModeIsDots()) {
      // Dot-to-dot: numbered dots along each letter's outline (uppercased for
      // iconic silhouettes). Sits in the same central band the outline would;
      // with a second line the band is split into two stacked half-bands.
      const cy = heading ? 720 : 690;
      const half = Math.min(cy - (heading ? 250 : 200), (footer ? H - 250 : H - 150) - cy);
      if (lines.length === 2) {
        const bandH = half - 18;
        addDotWordSVG(svg, String(lines[0]).toUpperCase(), designState.density, { x: M, y: cy - half, w: availW, h: bandH }, designState.hint);
        addDotWordSVG(svg, String(lines[1]).toUpperCase(), designState.density, { x: M, y: cy + 18, w: availW, h: bandH }, designState.hint);
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

    const cred = svgMake("text", { x: W / 2, y: H - 24, "text-anchor": "middle", "font-family": FONT, "font-size": 22, fill: "#aeb4c0" }, svg);
    cred.textContent = "ultratextgen.com";
    return svg;
  }

  function renderDesignPreview() {
    if (!el.designPreview) return;
    el.designPreview.innerHTML = "";
    el.designPreview.appendChild(designSheetSVG());
  }

  function printDesign() {
    const holder = document.createElement("div");
    holder.className = "pt-design-print-holder";
    const names = rosterNames(el.designRoster);
    if (names.length >= 2) {
      holder.classList.add("pt-class-set");
      names.forEach((n) => {
        const page = document.createElement("div");
        page.className = "pt-sheet-page";
        page.appendChild(designSheetSVG(n));
        holder.appendChild(page);
      });
      printWrap("", holder, "design");
      return;
    }
    holder.appendChild(designSheetSVG());
    printWrap("", holder, "design");
  }

  // Dot-to-dot difficulty ladder as one print job — the same word at every
  // density, easy to expert. designSheetSVG reads designState.density, so the
  // loop swaps it per page and restores the picked value afterwards.
  function printDesignLadder() {
    const holder = document.createElement("div");
    holder.className = "pt-design-print-holder pt-class-set";
    const picked = designState.density;
    DOT_LEVELS.forEach((lvl) => {
      designState.density = lvl.key;
      const page = document.createElement("div");
      page.className = "pt-sheet-page";
      page.appendChild(designSheetSVG());
      holder.appendChild(page);
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
      const W = 1000, H = 1400, scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale; canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#e2e6ee"; ctx.lineWidth = 3;
      roundRectPath(ctx, 18, 18, W - 36, H - 36, 26); ctx.stroke();

      const text = designText(), line2 = designLine2(), heading = designHeadingText();
      const lines = line2 ? [text, line2] : [text];
      const borderSym = designBorderSym();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";

      if (borderSym) {
        const strip = borderSym.split(" ").filter(Boolean);
        const count = 11, gap = (W - 120) / (count - 1);
        ctx.font = "34px " + FONT; ctx.fillStyle = "#c8ccd6";
        for (let i = 0; i < count; i++) {
          ctx.fillText(strip[i % strip.length], 60 + i * gap, 78);
          ctx.fillText(strip[i % strip.length], 60 + i * gap, H - 48);
        }
      }

      const hasHeading = !!heading;
      if (hasHeading) { ctx.font = "700 62px " + FONT; ctx.fillStyle = INK; ctx.fillText(heading, W / 2, 168); }

      if (designModeIsDots()) {
        const footerOn = designFooterOn();
        const cyD = hasHeading ? 720 : 690;
        const half = Math.min(cyD - (hasHeading ? 250 : 200), (footerOn ? H - 250 : H - 150) - cyD);
        if (lines.length === 2) {
          const bandH = half - 18;
          drawDotWordCanvas(ctx, String(lines[0]).toUpperCase(), designState.density, { x: 70, y: cyD - half, w: W - 140, h: bandH }, designState.hint);
          drawDotWordCanvas(ctx, String(lines[1]).toUpperCase(), designState.density, { x: 70, y: cyD + 18, w: W - 140, h: bandH }, designState.hint);
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
        const drawLine = (str, y) => {
          ctx.fillStyle = "#ffffff"; ctx.fillText(str, W / 2, y);
          ctx.lineWidth = Math.max(6, STROKE); ctx.strokeStyle = INK; ctx.strokeText(str, W / 2, y);
        };
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

      ctx.font = "22px " + FONT; ctx.fillStyle = "#aeb4c0"; ctx.fillText("ultratextgen.com", W / 2, H - 24);
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

  function buildDesigner() {
    if (!el.designInput || !el.designPreview) return;
    let timer = null;
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(renderDesignPreview, 120); };
    el.designInput.addEventListener("input", schedule);
    if (el.designInput2) el.designInput2.addEventListener("input", schedule);
    if (el.designHeading) el.designHeading.addEventListener("input", schedule);
    wireSwatchGroup(el.designFillGroup, "fill", fillSwatchSVG, designState, renderDesignPreview);
    wireSwatchGroup(el.designBorderGroup, "border", borderSwatchSVG, designState, renderDesignPreview);
    // Dot-to-dot mode toggle + difficulty ladder + hint switch (all optional).
    wireChoiceGroup(el.designModeGroup, "mode", syncDesignMode);
    wireChoiceGroup(el.designDensityGroup, "density");
    if (el.designHint) {
      designState.hint = el.designHint.checked;
      el.designHint.addEventListener("change", () => { designState.hint = el.designHint.checked; renderDesignPreview(); });
    }
    [el.designFill, el.designBorder, el.designFooter].forEach((c) => { if (c) c.addEventListener("change", renderDesignPreview); });
    if (el.designPrint) el.designPrint.addEventListener("click", printDesign);
    if (el.designLadder) el.designLadder.addEventListener("click", printDesignLadder);
    if (el.designPng) el.designPng.addEventListener("click", designPNG);
    syncDesignMode();
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
      foot.textContent = "ultratextgen.com";
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
    cred.textContent = "ultratextgen.com";
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
      names.forEach((n) => {
        const page = document.createElement("div");
        page.className = "pt-sheet-page";
        page.appendChild(puzzleSheetNode(n));
        holder.appendChild(page);
      });
      printWrap("", holder, "puzzle");
      return;
    }
    holder.appendChild(puzzleSheetNode());
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
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
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
          ctx.fillStyle = "#ffffff";
          ctx.fillText(ch, cx, cy);
          ctx.lineWidth = Math.max(4, fs * 0.06);
          ctx.strokeStyle = INK;
          ctx.strokeText(ch, cx, cy);
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

      ctx.font = "22px " + FONT;
      ctx.fillStyle = "#aeb4c0";
      ctx.fillText("ultratextgen.com", W / 2, 860);

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

  function init() {
    initStrokeToggle();
    buildStrip();
    buildAlphabetGrid();
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
