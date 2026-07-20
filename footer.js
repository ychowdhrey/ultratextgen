(function () {
  "use strict";

  // Context-aware footer: printables/learn pages serve parents, teachers and
  // crafters — the social-fonts columns (Zalgo, LinkedIn Headline, Bold
  // Fonts…) are the wrong audience there and leak the cluster's internal
  // link equity into the fonts cluster. Those pages get printables-native
  // columns plus one bridge line back to the font generator.
  var path = (window.location && window.location.pathname) || "";
  var isPrintablesContext = path.indexOf("/printables/") === 0 || path.indexOf("/learn/") === 0;

  // Locale-aware footer — same Tier-1 locale set and same no-hub fallback
  // rule as header.js (see that file's NAV comment + the roadmap doc in the
  // private lab repo for why Category/Use Cases/Answers/Events still point
  // at the English hub for every locale today). "tools" and "categories"
  // link to real, on-disk native-slug pages verified 2026-07-20 — not
  // translated guesses. "company" labels are translated but the About/
  // Privacy/Terms/Contact pages themselves have no locale versions yet, so
  // those hrefs stay English (same pattern yaytext.com uses for its own
  // untranslated Privacy Policy link, verified live 2026-07-20).
  var FOOTER = {
    pt: {
      home: { label: "Início", href: "/pt/" },
      explore: [
        { label: "Guias", href: "/pt/guide/" },
        { label: "Respostas", href: "/answers/" },
        { label: "Usos", href: "/usecase/" },
        { label: "Categorias", href: "/category/" },
        { label: "Biblioteca", href: "/pt/library/" },
        { label: "Imprimíveis", href: "/pt/imprimiveis/" },
        { label: "Eventos", href: "/events/" }
      ],
      tools: [
        { label: "Fontes para Bio", href: "/pt/usecase/fontes-para-bio/" },
        { label: "Letras para Tatuagem", href: "/pt/usecase/letras-para-tatuagem/" },
        { label: "Tradutor de Emojis", href: "/pt/usecase/tradutor-de-emojis/" },
        { label: "Texto Vertical", href: "/pt/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Letras Negrito", href: "/pt/letras-negrito/" },
        { label: "Letra Cursiva", href: "/pt/letra-cursiva/" },
        { label: "Fonte Gótica", href: "/pt/fonte-gotica/" },
        { label: "Letras Pequenas", href: "/pt/letras-pequenas/" },
        { label: "Letra Tachada", href: "/pt/letra-tachada/" }
      ],
      company: [
        { label: "Sobre", href: "/about/" },
        { label: "Política de Privacidade", href: "/privacy/" },
        { label: "Termos de Serviço", href: "/terms/" },
        { label: "Contato", href: "/contact/" }
      ],
      colTitles: { explore: "Explorar", tools: "Ferramentas Populares", categories: "Categorias Populares", company: "Empresa" },
      copyright: "© 2026 UltraTextGen. Letras diferentes pra usar em qualquer canto da internet."
    },
    fr: {
      home: { label: "Accueil", href: "/fr/" },
      explore: [
        { label: "Guides", href: "/fr/guide/" },
        { label: "Réponses", href: "/answers/" },
        { label: "Usages", href: "/usecase/" },
        { label: "Catégories", href: "/category/" },
        { label: "Bibliothèque", href: "/fr/library/" },
        { label: "Imprimables", href: "/fr/imprimables/" },
        { label: "Événements", href: "/events/" }
      ],
      tools: [
        { label: "Écriture pour Bio", href: "/fr/usecase/ecriture-bio/" },
        { label: "Écriture Tatouage", href: "/fr/usecase/ecriture-tatouage/" },
        { label: "Traducteur Emoji", href: "/fr/usecase/traducteur-emoji/" },
        { label: "Texte Vertical", href: "/fr/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Texte en Gras", href: "/fr/texte-en-gras/" },
        { label: "Écriture Cursive", href: "/fr/ecriture-cursive/" },
        { label: "Écriture Gothique", href: "/fr/ecriture-gothique/" },
        { label: "Petite Écriture", href: "/fr/petite-ecriture/" },
        { label: "Écriture Aesthetic", href: "/fr/ecriture-aesthetic/" }
      ],
      company: [
        { label: "À Propos", href: "/about/" },
        { label: "Politique de Confidentialité", href: "/privacy/" },
        { label: "Conditions d'Utilisation", href: "/terms/" },
        { label: "Contact", href: "/contact/" }
      ],
      colTitles: { explore: "Explorer", tools: "Outils Populaires", categories: "Catégories Populaires", company: "Entreprise" },
      copyright: "© 2026 UltraTextGen. Une écriture stylée qui marche partout."
    },
    de: {
      home: { label: "Startseite", href: "/de/" },
      explore: [
        { label: "Ratgeber", href: "/de/guide/" },
        { label: "Antworten", href: "/answers/" },
        { label: "Anwendungen", href: "/usecase/" },
        { label: "Kategorien", href: "/category/" },
        { label: "Bibliothek", href: "/de/library/" },
        { label: "Zum Ausdrucken", href: "/de/zum-ausdrucken/" },
        { label: "Anlässe", href: "/events/" }
      ],
      tools: [
        { label: "Bio-Schriftart", href: "/de/usecase/bio-schriftart/" },
        { label: "Tattoo-Schrift", href: "/de/usecase/tattoo-schrift/" },
        { label: "Emoji-Übersetzer", href: "/de/usecase/emoji-uebersetzer/" },
        { label: "Vertikaler Text", href: "/de/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Fette Schrift", href: "/de/fette-schrift/" },
        { label: "Schreibschrift", href: "/de/schreibschrift/" },
        { label: "Gotische Schrift", href: "/de/gotische-schrift/" },
        { label: "Kleine Schrift", href: "/de/kleine-schrift/" },
        { label: "Durchgestrichener Text", href: "/de/durchgestrichener-text/" }
      ],
      company: [
        { label: "Über Uns", href: "/about/" },
        { label: "Datenschutzerklärung", href: "/privacy/" },
        { label: "Nutzungsbedingungen", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Entdecken", tools: "Beliebte Tools", categories: "Beliebte Kategorien", company: "Unternehmen" },
      copyright: "© 2026 UltraTextGen. Schnelle Schriftarten, die überall funktionieren."
    },
    it: {
      home: { label: "Home", href: "/it/" },
      explore: [
        { label: "Guide", href: "/it/guide/" },
        { label: "Risposte", href: "/answers/" },
        { label: "Usi", href: "/usecase/" },
        { label: "Categorie", href: "/category/" },
        { label: "Libreria", href: "/it/library/" },
        { label: "Da Stampare", href: "/it/da-stampare/" },
        { label: "Eventi", href: "/events/" }
      ],
      tools: [
        { label: "Font per Bio", href: "/it/usecase/font-per-bio/" },
        { label: "Font per Tatuaggi", href: "/it/usecase/font-tatuaggi/" },
        { label: "Traduttore Emoji", href: "/it/usecase/traduttore-emoji/" },
        { label: "Testo Verticale", href: "/it/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Grassetto", href: "/it/grassetto/" },
        { label: "Corsivo", href: "/it/lettere-in-corsivo/" },
        { label: "Gotico", href: "/it/gotico/" },
        { label: "Testo Piccolo", href: "/it/testo-piccolo/" },
        { label: "Testo Barrato", href: "/it/testo-barrato/" }
      ],
      company: [
        { label: "Chi Siamo", href: "/about/" },
        { label: "Informativa sulla Privacy", href: "/privacy/" },
        { label: "Termini di Servizio", href: "/terms/" },
        { label: "Contatti", href: "/contact/" }
      ],
      colTitles: { explore: "Esplora", tools: "Strumenti Popolari", categories: "Categorie Popolari", company: "Azienda" },
      copyright: "© 2026 UltraTextGen. Scritte stilizzate che reggono ovunque le incolli."
    },
    tr: {
      home: { label: "Ana Sayfa", href: "/tr/" },
      explore: [
        { label: "Rehberler", href: "/tr/guide/" },
        { label: "Yanıtlar", href: "/answers/" },
        { label: "Kullanımlar", href: "/usecase/" },
        { label: "Kategoriler", href: "/category/" },
        { label: "Kütüphane", href: "/tr/library/" },
        { label: "Baskılar", href: "/printables/" },
        { label: "Etkinlikler", href: "/events/" }
      ],
      tools: [
        { label: "Biyografi Yazı Tipi", href: "/tr/usecase/biyografi-yazi-tipi/" },
        { label: "Dövme Yazı Fontları", href: "/tr/usecase/dovme-yazi-fontlari/" },
        { label: "Emoji Çevirici", href: "/tr/usecase/emoji-ceviri/" },
        { label: "Dikey Yazı", href: "/tr/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Kalın Yazı", href: "/tr/kalin-yazi/" },
        { label: "El Yazısı Fontu", href: "/tr/el-yazisi-fontu/" },
        { label: "İtalik Yazı", href: "/tr/italik-yazi/" },
        { label: "Küçük Yazı", href: "/tr/kucuk-yazi/" },
        { label: "Üstü Çizili Yazı", href: "/tr/ustu-cizili-yazi/" }
      ],
      company: [
        { label: "Hakkımızda", href: "/about/" },
        { label: "Gizlilik Politikası", href: "/privacy/" },
        { label: "Kullanım Şartları", href: "/terms/" },
        { label: "İletişim", href: "/contact/" }
      ],
      colTitles: { explore: "Keşfet", tools: "Popüler Araçlar", categories: "Popüler Kategoriler", company: "Şirket" },
      copyright: "© 2026 UltraTextGen. Her yerde aynı görünen şekilli yazı."
    },
    es: {
      home: { label: "Inicio", href: "/es/" },
      explore: [
        { label: "Guías", href: "/es/guide/" },
        { label: "Respuestas", href: "/answers/" },
        { label: "Usos", href: "/usecase/" },
        { label: "Categorías", href: "/category/" },
        { label: "Biblioteca", href: "/es/library/" },
        { label: "Imprimibles", href: "/es/imprimibles/" },
        { label: "Eventos", href: "/events/" }
      ],
      tools: [
        { label: "Letras para Bio", href: "/es/usecase/letras-para-bio/" },
        { label: "Letras para Tatuajes", href: "/es/usecase/letras-para-tatuajes/" },
        { label: "Traductor de Emojis", href: "/es/usecase/traductor-de-emojis/" },
        { label: "Texto Vertical", href: "/es/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Letras Negritas", href: "/es/letras-negritas/" },
        { label: "Letra Cursiva", href: "/es/letra-cursiva/" },
        { label: "Letras Góticas", href: "/es/letras-goticas/" },
        { label: "Texto Pequeño", href: "/es/texto-pequeno/" },
        { label: "Letra Tachada", href: "/es/letra-tachada/" }
      ],
      company: [
        { label: "Sobre Nosotros", href: "/about/" },
        { label: "Política de Privacidad", href: "/privacy/" },
        { label: "Términos de Servicio", href: "/terms/" },
        { label: "Contacto", href: "/contact/" }
      ],
      colTitles: { explore: "Explorar", tools: "Herramientas Populares", categories: "Categorías Populares", company: "Empresa" },
      copyright: "© 2026 UltraTextGen. Letras bonitas que funcionan en todas partes."
    },
    id: {
      home: { label: "Beranda", href: "/id/" },
      explore: [
        { label: "Panduan", href: "/id/guide/" },
        { label: "Jawaban", href: "/answers/" },
        { label: "Kegunaan", href: "/usecase/" },
        { label: "Kategori", href: "/category/" },
        { label: "Perpustakaan", href: "/id/library/" },
        { label: "Cetak", href: "/printables/" },
        { label: "Acara", href: "/events/" }
      ],
      tools: [
        { label: "Bio Aesthetic", href: "/id/usecase/bio-ig-aesthetic/" },
        { label: "Font Tato", href: "/id/usecase/font-tato/" },
        { label: "Penerjemah Emoji", href: "/id/usecase/penerjemah-emoji/" },
        { label: "Teks Vertikal", href: "/id/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Tulisan Tebal", href: "/id/tulisan-tebal/" },
        { label: "Tulisan Sambung", href: "/id/tulisan-sambung/" },
        { label: "Tulisan Gotik", href: "/id/tulisan-gotik/" },
        { label: "Tulisan Kecil", href: "/id/tulisan-kecil/" },
        { label: "Tulisan Coret", href: "/id/tulisan-coret/" }
      ],
      company: [
        { label: "Tentang Kami", href: "/about/" },
        { label: "Kebijakan Privasi", href: "/privacy/" },
        { label: "Syarat Layanan", href: "/terms/" },
        { label: "Kontak", href: "/contact/" }
      ],
      colTitles: { explore: "Jelajahi", tools: "Alat Populer", categories: "Kategori Populer", company: "Perusahaan" },
      copyright: "© 2026 UltraTextGen. Tulisan aesthetic & font keren yang nempel ke mana pun."
    }
  };

  function detectLocale() {
    var m = path.match(/^\/([a-z]{2})\//);
    return m && FOOTER[m[1]] ? m[1] : "en";
  }

  function linksHTML(items) {
    return items.map(function (item) {
      return '<a href="' + item.href + '" class="footer-link">' + item.label + '</a>';
    }).join('');
  }

  function buildLocaleFooterHTML(locale) {
    var f = FOOTER[locale];
    return '<div class="footer-columns">' +
        '<div class="footer-col">' +
          '<span class="footer-col-title">' + f.colTitles.explore + '</span>' +
          '<a href="' + f.home.href + '" class="footer-link">' + f.home.label + '</a>' +
          linksHTML(f.explore) +
        '</div>' +
        '<div class="footer-col">' +
          '<span class="footer-col-title">' + f.colTitles.tools + '</span>' +
          linksHTML(f.tools) +
        '</div>' +
        '<div class="footer-col">' +
          '<span class="footer-col-title">' + f.colTitles.categories + '</span>' +
          linksHTML(f.categories) +
        '</div>' +
        '<div class="footer-col">' +
          '<span class="footer-col-title">' + f.colTitles.company + '</span>' +
          linksHTML(f.company) +
        '</div>' +
      '</div>' +
      '<div class="footer-social-links">' +
        '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
        '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
        '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
        '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
      '</div>' +
      '<div class="footer-bottom">' + f.copyright + '</div>';
  }

  var printablesLinksHTML =
    '<div class="footer-columns">' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Printables</span>' +
        '<a href="/printables/" class="footer-link">All Printables</a>' +
        '<a href="/printables/bubble-letters/" class="footer-link">Bubble Letters A–Z</a>' +
        '<a href="/printables/alphabet-coloring-pages/" class="footer-link">Alphabet Coloring Pages</a>' +
        '<a href="/printables/dot-to-dot-alphabet/" class="footer-link">Dot-to-Dot Alphabet</a>' +
        '<a href="/printables/cursive-alphabet/" class="footer-link">Cursive Alphabet</a>' +
        '<a href="/printables/block-letters/" class="footer-link">Block Letters &amp; Stencils</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Generators</span>' +
        '<a href="/printables/handwriting-worksheet-generator/" class="footer-link">Handwriting Worksheets</a>' +
        '<a href="/printables/coloring-page-maker/" class="footer-link">Coloring Page Maker</a>' +
        '<a href="/printables/name-tracing/" class="footer-link">Name Tracing</a>' +
        '<a href="/printables/dot-to-dot-name/" class="footer-link">Dot-to-Dot Name</a>' +
        '<a href="/printables/banner-maker/" class="footer-link">Banner Maker</a>' +
        '<a href="/printables/monogram-maker/" class="footer-link">Monogram Maker</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Company</span>' +
        '<a href="/about/" class="footer-link">About</a>' +
        '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
        '<a href="/terms/" class="footer-link">Terms of Service</a>' +
        '<a href="/contact/" class="footer-link">Contact</a>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bridge">Looking for text fonts for bios and posts? <a href="/" class="footer-link">Try the font generator →</a></div>' +
    '<div class="footer-social-links">' +
      '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
      '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
      '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '© 2026 UltraTextGen. Free printable letters, worksheets and generators.' +
    '</div>';

  var footerLinksHTML =
    '<div class="footer-columns">' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Explore</span>' +
        '<a href="/" class="footer-link">Home</a>' +
        '<a href="/guide/" class="footer-link">Guides</a>' +
        '<a href="/answers/" class="footer-link">Answers</a>' +
        '<a href="/usecase/" class="footer-link">Use Cases</a>' +
        '<a href="/category/" class="footer-link">Categories</a>' +
        '<a href="/library/" class="footer-link">Library</a>' +
        '<a href="/printables/" class="footer-link">Printables</a>' +
        '<a href="/events/" class="footer-link">Events</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Popular Tools</span>' +
        '<a href="/usecase/text-to-emoji/" class="footer-link">Text to Emoji</a>' +
        '<a href="/usecase/linkedin-headline/" class="footer-link">LinkedIn Headline</a>' +
        '<a href="/usecase/comment-font/" class="footer-link">Comment Font</a>' +
        '<a href="/usecase/bio-font/" class="footer-link">Bio Font</a>' +
        '<a href="/usecase/vertical-text/" class="footer-link">Vertical Text</a>' +
        '<a href="/usecase/scrolling-text/" class="footer-link">Scrolling Text</a>' +
        '<a href="/usecase/repeat-text/" class="footer-link">Repeat Text</a>' +
        '<a href="/usecase/zalgo-text/" class="footer-link">Zalgo Text</a>' +
        '<a href="/ascii-art-generator/" class="footer-link">ASCII Art Generator</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Popular Categories</span>' +
        '<a href="/category/bold-fonts/" class="footer-link">Bold Fonts</a>' +
        '<a href="/category/cursive-fonts/" class="footer-link">Cursive Fonts</a>' +
        '<a href="/category/gothic-fonts/" class="footer-link">Gothic Fonts</a>' +
        '<a href="/category/bubble-fonts/" class="footer-link">Bubble Fonts</a>' +
        '<a href="/category/strikethrough-text/" class="footer-link">Strikethrough</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Company</span>' +
        '<a href="/about/" class="footer-link">About</a>' +
        '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
        '<a href="/terms/" class="footer-link">Terms of Service</a>' +
        '<a href="/contact/" class="footer-link">Contact</a>' +
      '</div>' +
    '</div>' +
    '<div class="footer-social-links">' +
      '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
      '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
      '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '© 2026 UltraTextGen. Fast text styles that work everywhere.' +
    '</div>';

  var locale = detectLocale();

  if (isPrintablesContext) {
    footerLinksHTML = printablesLinksHTML;
  } else if (locale !== "en") {
    footerLinksHTML = buildLocaleFooterHTML(locale);
  }

  // Idempotency guard — do nothing if footer-bottom already exists
  if (document.querySelector(".footer-bottom")) {
    return;
  }

  var footer = document.querySelector("footer.footer");

  if (footer) {
    var inner = footer.querySelector(".footer-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "footer-inner";
      footer.appendChild(inner);
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = footerLinksHTML;
    while (tmp.firstChild) {
      inner.appendChild(tmp.firstChild);
    }
  } else {
    var fullFooterHTML =
      '<footer class="footer">' +
        '<div class="footer-inner">' +
          footerLinksHTML +
        '</div>' +
      '</footer>';
    var tmpFull = document.createElement("div");
    tmpFull.innerHTML = fullFooterHTML;
    document.body.appendChild(tmpFull.firstChild);
  }
})();
