(function () {
  "use strict";

  // Context-aware footer: printables/learn pages serve parents, teachers and
  // crafters — the social-fonts columns (Zalgo, LinkedIn Headline, Bold
  // Fonts…) are the wrong audience there and leak the cluster's internal
  // link equity into the fonts cluster. Those pages get printables-native
  // columns plus one bridge line back to the font generator.
  var path = (window.location && window.location.pathname) || "";
  var isPrintablesContext = path.indexOf("/printables/") === 0 || path.indexOf("/learn/") === 0;

  // Locales with their own native printables hub get the SAME printables-
  // audience treatment as English /printables/ — translated, linking to
  // their own on-disk sub-pages, not the generic locale footer. tr/id have
  // no native printables hub yet (their "printables" nav item still points
  // at the English /printables/), so they correctly fall through to the
  // plain isPrintablesContext branch below when a tr/id visitor lands there.
  var PRINTABLES_NATIVE_PREFIX = {
    pt: "/pt/imprimiveis/",
    fr: "/fr/imprimables/",
    de: "/de/zum-ausdrucken/",
    it: "/it/da-stampare/",
    es: "/es/imprimibles/"
  };
  var nativePrintablesLocale = null;
  for (var _ppl in PRINTABLES_NATIVE_PREFIX) {
    if (path.indexOf(PRINTABLES_NATIVE_PREFIX[_ppl]) === 0) {
      nativePrintablesLocale = _ppl;
      break;
    }
  }

  // Locale-aware footer — same Tier-1 locale set and same no-hub fallback
  // rule as header.js (see that file's NAV comment for why Category/Use
  // Cases/Answers/Events still point at the English hub for every locale
  // today). "tools" and "categories"
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
        { label: "Respostas", href: "/pt/answers/" },
        { label: "Usos", href: "/pt/usecase/" },
        { label: "Categorias", href: "/pt/category/" },
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
        { label: "Réponses", href: "/fr/answers/" },
        { label: "Usages", href: "/fr/usecase/" },
        { label: "Catégories", href: "/fr/category/" },
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
        { label: "Anwendungen", href: "/de/usecase/" },
        { label: "Kategorien", href: "/de/category/" },
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
        { label: "Risposte", href: "/it/answers/" },
        { label: "Usi", href: "/it/usecase/" },
        { label: "Categorie", href: "/it/category/" },
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
        { label: "Yanıtlar", href: "/tr/answers/" },
        { label: "Kullanımlar", href: "/tr/usecase/" },
        { label: "Kategoriler", href: "/tr/category/" },
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
        { label: "Respuestas", href: "/es/answers/" },
        { label: "Usos", href: "/es/usecase/" },
        { label: "Categorías", href: "/es/category/" },
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
        { label: "Jawaban", href: "/id/answers/" },
        { label: "Kegunaan", href: "/id/usecase/" },
        { label: "Kategori", href: "/id/category/" },
        { label: "Perpustakaan", href: "/id/library/" },
        { label: "Cetak", href: "/id/printables/" },
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
    },
    ar: {
      home: { label: "الرئيسية", href: "/ar/" },
      explore: [
        { label: "الأدلة", href: "/ar/guide/" },
        { label: "الإجابات", href: "/ar/answers/" },
        { label: "الاستخدامات", href: "/ar/usecase/" },
        { label: "الفئات", href: "/category/" },
        { label: "المكتبة", href: "/ar/library/" },
        { label: "للطباعة", href: "/printables/" },
        { label: "المناسبات", href: "/events/" }
      ],
      tools: [
        { label: "خط للبايو", href: "/ar/usecase/khat-bio/" },
        { label: "خط للوشم", href: "/usecase/tattoo-fonts/" },
        { label: "مترجم إيموجي", href: "/ar/usecase/mutarjim-emoji/" },
        { label: "كتابة عمودية", href: "/ar/usecase/vertical-text/" }
      ],
      categories: [
        { label: "خط عريض", href: "/category/bold-fonts/" },
        { label: "خط مائل", href: "/category/cursive-fonts/" },
        { label: "خط قوطي", href: "/category/gothic-fonts/" },
        { label: "نص صغير", href: "/category/small-text/" },
        { label: "نص مشطوب", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "من نحن", href: "/about/" },
        { label: "سياسة الخصوصية", href: "/privacy/" },
        { label: "شروط الخدمة", href: "/terms/" },
        { label: "اتصل بنا", href: "/contact/" }
      ],
      colTitles: { explore: "استكشف", tools: "أدوات شائعة", categories: "فئات شائعة", company: "الشركة" },
      copyright: "© 2026 UltraTextGen. خطوط ورموز مميزة تُلصق في أي مكان."
    },
    bs: {
      home: { label: "Početna", href: "/bs/" },
      explore: [
        { label: "Vodiči", href: "/bs/guide/" },
        { label: "Odgovori", href: "/answers/" },
        { label: "Upotrebe", href: "/usecase/" },
        { label: "Kategorije", href: "/category/" },
        { label: "Biblioteka", href: "/library/" },
        { label: "Za štampanje", href: "/printables/" },
        { label: "Događaji", href: "/events/" }
      ],
      tools: [
        { label: "Font za bio", href: "/usecase/bio-font/" },
        { label: "Slova za tetovažu", href: "/usecase/tattoo-fonts/" },
        { label: "Prevodilac emojija", href: "/usecase/text-to-emoji/" },
        { label: "Vertikalni tekst", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Podebljana Slova", href: "/bs/podebljana-slova/" },
        { label: "Kurziv", href: "/bs/kurziv/" },
        { label: "Gotička Slova", href: "/bs/goticka-slova/" },
        { label: "Mala Slova", href: "/bs/mala-slova/" },
        { label: "Precrtan Tekst", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "O nama", href: "/about/" },
        { label: "Politika privatnosti", href: "/privacy/" },
        { label: "Uslovi korištenja", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Istraži", tools: "Popularni alati", categories: "Popularne kategorije", company: "Kompanija" },
      copyright: "© 2026 UltraTextGen. Stilizovana slova za kopiranje bilo gdje."
    },
    cs: {
      home: { label: "Domů", href: "/cs/" },
      explore: [
        { label: "Návody", href: "/cs/guide/" },
        { label: "Odpovědi", href: "/answers/" },
        { label: "Použití", href: "/usecase/" },
        { label: "Kategorie", href: "/category/" },
        { label: "Knihovna", href: "/library/" },
        { label: "K tisku", href: "/printables/" },
        { label: "Události", href: "/events/" }
      ],
      tools: [
        { label: "Písmo pro bio", href: "/cs/usecase/pismo-pro-bio/" },
        { label: "Písmo pro tetování", href: "/usecase/tattoo-fonts/" },
        { label: "Překladač emoji", href: "/usecase/text-to-emoji/" },
        { label: "Svislý text", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Tučné písmo", href: "/cs/tucne-pismo/" },
        { label: "Kurzíva", href: "/cs/kurziva/" },
        { label: "Gotické písmo", href: "/cs/goticke-pismo/" },
        { label: "Malé písmo", href: "/cs/male-pismo/" },
        { label: "Přeškrtnutý text", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "O nás", href: "/about/" },
        { label: "Zásady ochrany osobních údajů", href: "/privacy/" },
        { label: "Podmínky služby", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Prozkoumat", tools: "Oblíbené nástroje", categories: "Oblíbené kategorie", company: "Společnost" },
      copyright: "© 2026 UltraTextGen. Stylové písmo, které funguje kdekoli."
    },
    da: {
      home: { label: "Hjem", href: "/da/" },
      explore: [
        { label: "Guides", href: "/da/guide/" },
        { label: "Svar", href: "/answers/" },
        { label: "Anvendelser", href: "/usecase/" },
        { label: "Kategorier", href: "/category/" },
        { label: "Bibliotek", href: "/da/library/" },
        { label: "Til print", href: "/printables/" },
        { label: "Begivenheder", href: "/events/" }
      ],
      tools: [
        { label: "Bio-skrifttype", href: "/usecase/bio-font/" },
        { label: "Tatoveringsskrift", href: "/usecase/tattoo-fonts/" },
        { label: "Emoji-oversætter", href: "/usecase/text-to-emoji/" },
        { label: "Lodret tekst", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Fed skrift", href: "/category/bold-fonts/" },
        { label: "Kursiv skrift", href: "/category/cursive-fonts/" },
        { label: "Gotisk skrift", href: "/category/gothic-fonts/" },
        { label: "Lille tekst", href: "/category/small-text/" },
        { label: "Gennemstreget tekst", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Om os", href: "/about/" },
        { label: "Privatlivspolitik", href: "/privacy/" },
        { label: "Servicevilkår", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Udforsk", tools: "Populære værktøjer", categories: "Populære kategorier", company: "Virksomhed" },
      copyright: "© 2026 UltraTextGen. Stilfulde bogstaver, der virker overalt."
    },
    hi: {
      home: { label: "होम", href: "/hi/" },
      explore: [
        { label: "गाइड", href: "/hi/guide/" },
        { label: "जवाब", href: "/answers/" },
        { label: "उपयोग", href: "/usecase/" },
        { label: "श्रेणियाँ", href: "/category/" },
        { label: "लाइब्रेरी", href: "/library/" },
        { label: "प्रिंट के लिए", href: "/printables/" },
        { label: "इवेंट्स", href: "/events/" }
      ],
      tools: [
        { label: "बायो फॉन्ट", href: "/usecase/bio-font/" },
        { label: "टैटू फॉन्ट", href: "/usecase/tattoo-fonts/" },
        { label: "इमोजी अनुवादक", href: "/hi/usecase/emoji-anuvadak/" },
        { label: "वर्टिकल टेक्स्ट", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "बोल्ड फॉन्ट", href: "/category/bold-fonts/" },
        { label: "कर्सिव फॉन्ट", href: "/category/cursive-fonts/" },
        { label: "गॉथिक फॉन्ट", href: "/category/gothic-fonts/" },
        { label: "स्मॉल टेक्स्ट", href: "/category/small-text/" },
        { label: "स्ट्राइकथ्रू टेक्स्ट", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "हमारे बारे में", href: "/about/" },
        { label: "गोपनीयता नीति", href: "/privacy/" },
        { label: "सेवा की शर्तें", href: "/terms/" },
        { label: "संपर्क करें", href: "/contact/" }
      ],
      colTitles: { explore: "एक्सप्लोर करें", tools: "लोकप्रिय टूल्स", categories: "लोकप्रिय श्रेणियाँ", company: "कंपनी" },
      copyright: "© 2026 UltraTextGen. स्टाइलिश फॉन्ट जो हर जगह चलते हैं।"
    },
    hr: {
      home: { label: "Početna", href: "/hr/" },
      explore: [
        { label: "Vodiči", href: "/hr/guide/" },
        { label: "Odgovori", href: "/answers/" },
        { label: "Upotrebe", href: "/usecase/" },
        { label: "Kategorije", href: "/category/" },
        { label: "Biblioteka", href: "/library/" },
        { label: "Za ispis", href: "/printables/" },
        { label: "Događaji", href: "/events/" }
      ],
      tools: [
        { label: "Font za bio", href: "/usecase/bio-font/" },
        { label: "Slova za tetovažu", href: "/usecase/tattoo-fonts/" },
        { label: "Prevoditelj emojija", href: "/usecase/text-to-emoji/" },
        { label: "Okomiti tekst", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Podebljana Slova", href: "/hr/podebljana-slova/" },
        { label: "Kurziv", href: "/hr/kurziv/" },
        { label: "Gotička Slova", href: "/hr/goticka-slova/" },
        { label: "Mala Slova", href: "/hr/mala-slova/" },
        { label: "Precrtani Tekst", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "O nama", href: "/about/" },
        { label: "Pravila privatnosti", href: "/privacy/" },
        { label: "Uvjeti korištenja", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Istraži", tools: "Popularni alati", categories: "Popularne kategorije", company: "Tvrtka" },
      copyright: "© 2026 UltraTextGen. Stilizirana slova za kopiranje bilo gdje."
    },
    hu: {
      home: { label: "Kezdőlap", href: "/hu/" },
      explore: [
        { label: "Útmutatók", href: "/hu/guide/" },
        { label: "Válaszok", href: "/answers/" },
        { label: "Felhasználások", href: "/usecase/" },
        { label: "Kategóriák", href: "/category/" },
        { label: "Könyvtár", href: "/library/" },
        { label: "Nyomtatható", href: "/printables/" },
        { label: "Események", href: "/events/" }
      ],
      tools: [
        { label: "Bio betűtípus", href: "/usecase/bio-font/" },
        { label: "Tetoválás betűtípus", href: "/usecase/tattoo-fonts/" },
        { label: "Emoji fordító", href: "/usecase/text-to-emoji/" },
        { label: "Függőleges szöveg", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Félkövér Szöveg", href: "/hu/felkover-szoveg/" },
        { label: "Dőlt Szöveg", href: "/hu/dolt-szoveg/" },
        { label: "Gotikus Betűk", href: "/hu/gotikus-betuk/" },
        { label: "Apró Betűk", href: "/hu/apro-betuk/" },
        { label: "Áthúzott Szöveg", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Rólunk", href: "/about/" },
        { label: "Adatvédelmi irányelvek", href: "/privacy/" },
        { label: "Felhasználási feltételek", href: "/terms/" },
        { label: "Kapcsolat", href: "/contact/" }
      ],
      colTitles: { explore: "Felfedezés", tools: "Népszerű eszközök", categories: "Népszerű kategóriák", company: "Cég" },
      copyright: "© 2026 UltraTextGen. Stílusos betűk, amik mindenhol működnek."
    },
    ja: {
      home: { label: "ホーム", href: "/ja/" },
      explore: [
        { label: "ガイド", href: "/ja/guide/" },
        { label: "回答", href: "/ja/answers/" },
        { label: "使い方", href: "/usecase/" },
        { label: "カテゴリー", href: "/category/" },
        { label: "ライブラリ", href: "/ja/library/" },
        { label: "印刷用", href: "/printables/" },
        { label: "イベント", href: "/events/" }
      ],
      tools: [
        { label: "プロフィール文字装飾", href: "/ja/usecase/bio-font/" },
        { label: "タトゥーフォント", href: "/usecase/tattoo-fonts/" },
        { label: "絵文字トランスレーター", href: "/usecase/text-to-emoji/" },
        { label: "縦書きジェネレーター", href: "/ja/usecase/vertical-text/" }
      ],
      categories: [
        { label: "太字フォント", href: "/category/bold-fonts/" },
        { label: "筆記体変換", href: "/ja/hikkitai/" },
        { label: "ブラックレター風文字", href: "/category/gothic-fonts/" },
        { label: "小さい文字", href: "/category/small-text/" },
        { label: "取り消し線テキスト", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "サイトについて", href: "/about/" },
        { label: "プライバシーポリシー", href: "/privacy/" },
        { label: "利用規約", href: "/terms/" },
        { label: "お問い合わせ", href: "/contact/" }
      ],
      colTitles: { explore: "探す", tools: "人気ツール", categories: "人気カテゴリー", company: "会社情報" },
      copyright: "© 2026 UltraTextGen. どこにでも貼れるおしゃれなフォント。"
    },
    ko: {
      home: { label: "홈", href: "/ko/" },
      explore: [
        { label: "가이드", href: "/ko/guide/" },
        { label: "답변", href: "/answers/" },
        { label: "활용법", href: "/usecase/" },
        { label: "카테고리", href: "/category/" },
        { label: "라이브러리", href: "/ko/library/" },
        { label: "인쇄용", href: "/printables/" },
        { label: "이벤트", href: "/events/" }
      ],
      tools: [
        { label: "바이오 폰트", href: "/usecase/bio-font/" },
        { label: "타투 폰트", href: "/usecase/tattoo-fonts/" },
        { label: "이모지 번역기", href: "/usecase/text-to-emoji/" },
        { label: "세로 텍스트 생성기", href: "/ko/usecase/vertical-text/" }
      ],
      categories: [
        { label: "굵은 글씨", href: "/category/bold-fonts/" },
        { label: "필기체 변환", href: "/ko/pilgichae-byeonhwan/" },
        { label: "블랙레터체", href: "/category/gothic-fonts/" },
        { label: "작은 글씨", href: "/category/small-text/" },
        { label: "취소선 텍스트", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "소개", href: "/about/" },
        { label: "개인정보처리방침", href: "/privacy/" },
        { label: "이용약관", href: "/terms/" },
        { label: "문의하기", href: "/contact/" }
      ],
      colTitles: { explore: "둘러보기", tools: "인기 도구", categories: "인기 카테고리", company: "회사" },
      copyright: "© 2026 UltraTextGen. 어디에나 붙여넣을 수 있는 스타일리시한 글꼴."
    },
    nl: {
      home: { label: "Home", href: "/nl/" },
      explore: [
        { label: "Gidsen", href: "/nl/guide/" },
        { label: "Antwoorden", href: "/nl/answers/" },
        { label: "Toepassingen", href: "/nl/usecase/" },
        { label: "Categorieën", href: "/category/" },
        { label: "Bibliotheek", href: "/nl/library/" },
        { label: "Afdrukbaar", href: "/printables/" },
        { label: "Evenementen", href: "/events/" }
      ],
      tools: [
        { label: "Lettertype voor Bio", href: "/nl/usecase/lettertype-voor-bio/" },
        { label: "Tattoo Letters", href: "/nl/usecase/tattoo-letters/" },
        { label: "Emoji Vertaler", href: "/usecase/text-to-emoji/" },
        { label: "Verticale Tekst", href: "/nl/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Vetgedrukte Letters", href: "/nl/vetgedrukte-letters/" },
        { label: "Cursieve Letters", href: "/nl/cursieve-letters/" },
        { label: "Gotische Letters", href: "/nl/gotische-letters/" },
        { label: "Kleine Letters", href: "/nl/kleine-letters/" },
        { label: "Doorgestreepte Tekst", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Over ons", href: "/about/" },
        { label: "Privacybeleid", href: "/privacy/" },
        { label: "Servicevoorwaarden", href: "/terms/" },
        { label: "Contact", href: "/contact/" }
      ],
      colTitles: { explore: "Verkennen", tools: "Populaire Tools", categories: "Populaire Categorieën", company: "Bedrijf" },
      copyright: "© 2026 UltraTextGen. Stijlvolle letters die overal werken."
    },
    no: {
      home: { label: "Hjem", href: "/no/" },
      explore: [
        { label: "Guider", href: "/no/guide/" },
        { label: "Svar", href: "/answers/" },
        { label: "Bruksområder", href: "/usecase/" },
        { label: "Kategorier", href: "/category/" },
        { label: "Bibliotek", href: "/no/library/" },
        { label: "Til utskrift", href: "/printables/" },
        { label: "Arrangementer", href: "/events/" }
      ],
      tools: [
        { label: "Bio-skrift", href: "/usecase/bio-font/" },
        { label: "Tatoveringsskrift", href: "/usecase/tattoo-fonts/" },
        { label: "Emoji-oversetter", href: "/usecase/text-to-emoji/" },
        { label: "Vertikal tekst", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Fet skrift", href: "/category/bold-fonts/" },
        { label: "Kursiv Tekst", href: "/no/kursiv-tekst/" },
        { label: "Gotisk skrift", href: "/category/gothic-fonts/" },
        { label: "Liten tekst", href: "/category/small-text/" },
        { label: "Gjennomstreket tekst", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Om oss", href: "/about/" },
        { label: "Personvernerklæring", href: "/privacy/" },
        { label: "Vilkår for bruk", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Utforsk", tools: "Populære verktøy", categories: "Populære kategorier", company: "Selskap" },
      copyright: "© 2026 UltraTextGen. Stilige bokstaver som fungerer overalt."
    },
    ro: {
      home: { label: "Acasă", href: "/ro/" },
      explore: [
        { label: "Ghiduri", href: "/ro/guide/" },
        { label: "Răspunsuri", href: "/answers/" },
        { label: "Utilizări", href: "/usecase/" },
        { label: "Categorii", href: "/category/" },
        { label: "Bibliotecă", href: "/library/" },
        { label: "De printat", href: "/printables/" },
        { label: "Evenimente", href: "/events/" }
      ],
      tools: [
        { label: "Font pentru bio", href: "/usecase/bio-font/" },
        { label: "Litere pentru tatuaj", href: "/usecase/tattoo-fonts/" },
        { label: "Traducător emoji", href: "/usecase/text-to-emoji/" },
        { label: "Text vertical", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Text Îngroșat", href: "/ro/text-ingrosat/" },
        { label: "Text Cursiv", href: "/ro/text-cursiv/" },
        { label: "Scriere Gotică", href: "/ro/scriere-gotica/" },
        { label: "Text Mic", href: "/ro/text-mic/" },
        { label: "Text Tăiat", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Despre noi", href: "/about/" },
        { label: "Politica de confidențialitate", href: "/privacy/" },
        { label: "Termeni și condiții", href: "/terms/" },
        { label: "Contact", href: "/contact/" }
      ],
      colTitles: { explore: "Explorează", tools: "Instrumente populare", categories: "Categorii populare", company: "Companie" },
      copyright: "© 2026 UltraTextGen. Litere stilate, gata de copiat oriunde."
    },
    ru: {
      home: { label: "Главная", href: "/ru/" },
      explore: [
        { label: "Руководства", href: "/ru/guide/" },
        { label: "Ответы", href: "/ru/answers/" },
        { label: "Применение", href: "/usecase/" },
        { label: "Категории", href: "/category/" },
        { label: "Библиотека", href: "/ru/library/" },
        { label: "Для печати", href: "/printables/" },
        { label: "События", href: "/events/" }
      ],
      tools: [
        { label: "Шрифт для био", href: "/usecase/bio-font/" },
        { label: "Шрифт для тату", href: "/usecase/tattoo-fonts/" },
        { label: "Переводчик эмодзи", href: "/usecase/text-to-emoji/" },
        { label: "Вертикальный текст", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Жирный шрифт", href: "/ru/zhirnyy-shrift/" },
        { label: "Курсив", href: "/ru/kursiv/" },
        { label: "Готический шрифт", href: "/ru/goticheskiy-shrift/" },
        { label: "Маленький текст", href: "/ru/malenkiy-tekst/" },
        { label: "Зачёркнутый текст", href: "/ru/zacherknutyy-tekst/" }
      ],
      company: [
        { label: "О нас", href: "/about/" },
        { label: "Политика конфиденциальности", href: "/privacy/" },
        { label: "Условия использования", href: "/terms/" },
        { label: "Контакты", href: "/contact/" }
      ],
      colTitles: { explore: "Разделы", tools: "Популярные инструменты", categories: "Популярные категории", company: "Компания" },
      copyright: "© 2026 UltraTextGen. Стильный текст, который вставляется куда угодно."
    },
    sk: {
      home: { label: "Domov", href: "/sk/" },
      explore: [
        { label: "Sprievodcovia", href: "/sk/guide/" },
        { label: "Odpovede", href: "/answers/" },
        { label: "Použitie", href: "/usecase/" },
        { label: "Kategórie", href: "/category/" },
        { label: "Knižnica", href: "/library/" },
        { label: "Na tlač", href: "/printables/" },
        { label: "Podujatia", href: "/events/" }
      ],
      tools: [
        { label: "Písmo pre bio", href: "/sk/usecase/pismo-pre-bio/" },
        { label: "Písmo pre tetovanie", href: "/usecase/tattoo-fonts/" },
        { label: "Prekladač emoji", href: "/usecase/text-to-emoji/" },
        { label: "Zvislý text", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Tučné písmo", href: "/sk/tucne-pismo/" },
        { label: "Kurzíva", href: "/sk/kurziva/" },
        { label: "Gotické písmo", href: "/sk/goticke-pismo/" },
        { label: "Malé písmo", href: "/sk/male-pismo/" },
        { label: "Preškrtnutý text", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "O nás", href: "/about/" },
        { label: "Zásady ochrany osobných údajov", href: "/privacy/" },
        { label: "Podmienky používania", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Preskúmať", tools: "Obľúbené nástroje", categories: "Obľúbené kategórie", company: "Spoločnosť" },
      copyright: "© 2026 UltraTextGen. Štýlové písmo, ktoré funguje kdekoľvek."
    },
    sr: {
      home: { label: "Početna", href: "/sr/" },
      explore: [
        { label: "Vodiči", href: "/sr/guide/" },
        { label: "Odgovori", href: "/answers/" },
        { label: "Upotrebe", href: "/usecase/" },
        { label: "Kategorije", href: "/category/" },
        { label: "Biblioteka", href: "/library/" },
        { label: "Za štampu", href: "/printables/" },
        { label: "Događaji", href: "/events/" }
      ],
      tools: [
        { label: "Font za bio", href: "/usecase/bio-font/" },
        { label: "Slova za tetovažu", href: "/usecase/tattoo-fonts/" },
        { label: "Prevodilac emodžija", href: "/usecase/text-to-emoji/" },
        { label: "Vertikalni tekst", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Podebljana Slova", href: "/sr/podebljana-slova/" },
        { label: "Kurziv", href: "/sr/kurziv/" },
        { label: "Gotička Slova", href: "/sr/goticka-slova/" },
        { label: "Mala Slova", href: "/sr/mala-slova/" },
        { label: "Precrtan Tekst", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "O nama", href: "/about/" },
        { label: "Politika privatnosti", href: "/privacy/" },
        { label: "Uslovi korišćenja", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Istraži", tools: "Popularni alati", categories: "Popularne kategorije", company: "Kompanija" },
      copyright: "© 2026 UltraTextGen. Stilizovana slova za kopiranje bilo gde."
    },
    sv: {
      home: { label: "Startsida", href: "/sv/" },
      explore: [
        { label: "Guider", href: "/sv/guide/" },
        { label: "Svar", href: "/answers/" },
        { label: "Användningar", href: "/usecase/" },
        { label: "Kategorier", href: "/category/" },
        { label: "Bibliotek", href: "/sv/library/" },
        { label: "Utskrifter", href: "/printables/" },
        { label: "Evenemang", href: "/events/" }
      ],
      tools: [
        { label: "Bio-typsnitt", href: "/usecase/bio-font/" },
        { label: "Tatueringstypsnitt", href: "/usecase/tattoo-fonts/" },
        { label: "Emoji-översättare", href: "/usecase/text-to-emoji/" },
        { label: "Vertikal text", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Fet text", href: "/category/bold-fonts/" },
        { label: "Kursiv text", href: "/category/cursive-fonts/" },
        { label: "Gotisk text", href: "/category/gothic-fonts/" },
        { label: "Liten text", href: "/category/small-text/" },
        { label: "Genomstruken text", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Om oss", href: "/about/" },
        { label: "Integritetspolicy", href: "/privacy/" },
        { label: "Användarvillkor", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Utforska", tools: "Populära verktyg", categories: "Populära kategorier", company: "Företag" },
      copyright: "© 2026 UltraTextGen. Snygga typsnitt som fungerar överallt."
    },
    th: {
      home: { label: "หน้าแรก", href: "/th/" },
      explore: [
        { label: "คู่มือ", href: "/th/guide/" },
        { label: "คำตอบ", href: "/th/answers/" },
        { label: "การใช้งาน", href: "/th/usecase/" },
        { label: "หมวดหมู่", href: "/category/" },
        { label: "คลังสัญลักษณ์", href: "/th/library/" },
        { label: "พิมพ์ได้", href: "/printables/" },
        { label: "กิจกรรม", href: "/events/" }
      ],
      tools: [
        { label: "ฟอนต์ไบโอไอจี", href: "/th/usecase/bio-font-ig/" },
        { label: "ฟอนต์รอยสัก", href: "/usecase/tattoo-fonts/" },
        { label: "ตัวแปลอีโมจิ", href: "/usecase/text-to-emoji/" },
        { label: "ข้อความแนวตั้ง", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "ตัวหนา", href: "/category/bold-fonts/" },
        { label: "ตัวเอียง", href: "/category/cursive-fonts/" },
        { label: "ฟอนต์กอทิก", href: "/category/gothic-fonts/" },
        { label: "ตัวอักษรเล็ก", href: "/category/small-text/" },
        { label: "ขีดฆ่า", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "เกี่ยวกับเรา", href: "/about/" },
        { label: "นโยบายความเป็นส่วนตัว", href: "/privacy/" },
        { label: "ข้อกำหนดการใช้บริการ", href: "/terms/" },
        { label: "ติดต่อเรา", href: "/contact/" }
      ],
      colTitles: { explore: "สำรวจ", tools: "เครื่องมือยอดนิยม", categories: "หมวดหมู่ยอดนิยม", company: "บริษัท" },
      copyright: "© 2026 UltraTextGen. ฟอนต์สวยๆ คัดลอกวางได้ทุกที่"
    },
    tl: {
      home: { label: "Home", href: "/tl/" },
      explore: [
        { label: "Mga Gabay", href: "/tl/guide/" },
        { label: "Mga Sagot", href: "/answers/" },
        { label: "Mga Gamit", href: "/usecase/" },
        { label: "Mga Kategorya", href: "/category/" },
        { label: "Aklatan", href: "/library/" },
        { label: "Pwedeng I-print", href: "/printables/" },
        { label: "Mga Kaganapan", href: "/events/" }
      ],
      tools: [
        { label: "Bio Font", href: "/tl/usecase/bio-font/" },
        { label: "Tattoo Font", href: "/usecase/tattoo-fonts/" },
        { label: "Emoji Translator", href: "/usecase/text-to-emoji/" },
        { label: "Vertical Text", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Bold Text", href: "/category/bold-fonts/" },
        { label: "Cursive Text", href: "/category/cursive-fonts/" },
        { label: "Gothic Font", href: "/category/gothic-fonts/" },
        { label: "Maliit na Text", href: "/category/small-text/" },
        { label: "Strikethrough Text", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "Tungkol Sa Amin", href: "/about/" },
        { label: "Patakaran sa Privacy", href: "/privacy/" },
        { label: "Mga Tuntunin ng Serbisyo", href: "/terms/" },
        { label: "Makipag-ugnayan", href: "/contact/" }
      ],
      colTitles: { explore: "Tuklasin", tools: "Sikat na Tools", categories: "Sikat na Kategorya", company: "Kumpanya" },
      copyright: "© 2026 UltraTextGen. Cute at stylish na font na pwedeng i-paste kahit saan."
    },
    vi: {
      home: { label: "Trang chủ", href: "/vi/" },
      explore: [
        { label: "Hướng dẫn", href: "/vi/guide/" },
        { label: "Câu trả lời", href: "/answers/" },
        { label: "Cách dùng", href: "/usecase/" },
        { label: "Danh mục", href: "/category/" },
        { label: "Thư viện", href: "/vi/library/" },
        { label: "Bản in", href: "/printables/" },
        { label: "Sự kiện", href: "/events/" }
      ],
      tools: [
        { label: "Font Chữ Cho Bio", href: "/usecase/bio-font/" },
        { label: "Chữ Xăm Hình", href: "/usecase/tattoo-fonts/" },
        { label: "Dịch Emoji", href: "/vi/usecase/dich-emoji/" },
        { label: "Chữ Dọc", href: "/vi/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Chữ In Đậm", href: "/vi/chu-in-dam/" },
        { label: "Chữ Nghiêng", href: "/vi/chu-nghieng/" },
        { label: "Font Gothic", href: "/vi/font-gothic/" },
        { label: "Chữ Nhỏ", href: "/vi/chu-nho/" },
        { label: "Chữ Gạch Ngang", href: "/vi/chu-gach-ngang/" }
      ],
      company: [
        { label: "Giới thiệu", href: "/about/" },
        { label: "Chính sách bảo mật", href: "/privacy/" },
        { label: "Điều khoản dịch vụ", href: "/terms/" },
        { label: "Liên hệ", href: "/contact/" }
      ],
      colTitles: { explore: "Khám phá", tools: "Công cụ phổ biến", categories: "Danh mục phổ biến", company: "Công ty" },
      copyright: "© 2026 UltraTextGen. Chữ đẹp dán được ở mọi nơi."
    },
    "zh-tw": {
      home: { label: "首頁", href: "/zh-tw/" },
      explore: [
        { label: "指南", href: "/zh-tw/guide/" },
        { label: "問答", href: "/answers/" },
        { label: "使用情境", href: "/usecase/" },
        { label: "分類", href: "/category/" },
        { label: "符號庫", href: "/zh-tw/library/" },
        { label: "可列印", href: "/printables/" },
        { label: "活動", href: "/events/" }
      ],
      tools: [
        { label: "個人簡介字體", href: "/usecase/bio-font/" },
        { label: "刺青字體", href: "/zh-tw/usecase/ciqing-ziti/" },
        { label: "Emoji 翻譯器", href: "/usecase/text-to-emoji/" },
        { label: "直式文字", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "粗體字", href: "/category/bold-fonts/" },
        { label: "手寫斜體字", href: "/zh-tw/shufa-ziti/" },
        { label: "哥德字體", href: "/category/gothic-fonts/" },
        { label: "小型文字", href: "/category/small-text/" },
        { label: "刪除線文字", href: "/category/strikethrough-text/" }
      ],
      company: [
        { label: "關於我們", href: "/about/" },
        { label: "隱私權政策", href: "/privacy/" },
        { label: "服務條款", href: "/terms/" },
        { label: "聯絡我們", href: "/contact/" }
      ],
      colTitles: { explore: "探索", tools: "熱門工具", categories: "熱門分類", company: "公司" },
      copyright: "© 2026 UltraTextGen. 時尚字體，到處都能貼上使用。"
    },
    fi: {
      home: { label: "Etusivu", href: "/fi/" },
      explore: [
        { label: "Oppaat", href: "/fi/guide/" },
        { label: "Vastaukset", href: "/answers/" },
        { label: "Käyttötavat", href: "/usecase/" },
        { label: "Kategoriat", href: "/category/" },
        { label: "Kirjasto", href: "/library/" },
        { label: "Tulostettavat", href: "/printables/" },
        { label: "Tapahtumat", href: "/events/" }
      ],
      tools: [
        { label: "Merkkilaskuri", href: "/fi/merkkilaskuri/" },
        { label: "Bio-fontti", href: "/usecase/bio-font/" },
        { label: "Tatuointifontit", href: "/usecase/tattoo-fonts/" },
        { label: "Emoji-kääntäjä", href: "/usecase/text-to-emoji/" }
      ],
      categories: [
        { label: "Lihavoitu teksti", href: "/fi/lihavoitu-teksti/" },
        { label: "Kursivoitu teksti", href: "/fi/kursivoitu-teksti/" },
        { label: "Goottilaiset kirjaimet", href: "/fi/goottilaiset-kirjaimet/" },
        { label: "Pieni teksti", href: "/fi/pieni-teksti/" },
        { label: "Kaunokirjoitus", href: "/fi/kaunokirjoitus/" }
      ],
      company: [
        { label: "Tietoa meistä", href: "/about/" },
        { label: "Tietosuojakäytäntö", href: "/privacy/" },
        { label: "Käyttöehdot", href: "/terms/" },
        { label: "Ota yhteyttä", href: "/contact/" }
      ],
      colTitles: { explore: "Selaa", tools: "Suositut työkalut", categories: "Suositut kategoriat", company: "Yritys" },
      copyright: "© 2026 UltraTextGen. Tyylikkäät kirjaimet, jotka toimivat kaikkialla."
    },
    ms: {
      home: { label: "Laman Utama", href: "/ms/" },
      explore: [
        { label: "Panduan", href: "/ms/guide/" },
        { label: "Jawapan", href: "/answers/" },
        { label: "Kegunaan", href: "/usecase/" },
        { label: "Kategori", href: "/category/" },
        { label: "Pustaka", href: "/library/" },
        { label: "Boleh Cetak", href: "/printables/" },
        { label: "Acara", href: "/events/" }
      ],
      tools: [
        { label: "Nama Free Fire", href: "/ms/usecase/nama-ff-hebat/" },
        { label: "Nama Mobile Legends", href: "/ms/usecase/nama-ml-hebat/" },
        { label: "Font Bio", href: "/usecase/bio-font/" },
        { label: "Teks Menegak", href: "/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Tulisan Tebal", href: "/ms/tulisan-tebal/" },
        { label: "Tulisan Condong", href: "/ms/tulisan-condong/" },
        { label: "Tulisan Gotik", href: "/ms/tulisan-gotik/" },
        { label: "Tulisan Kecil", href: "/ms/tulisan-kecil/" },
        { label: "Huruf Besar Kecil", href: "/ms/huruf-besar-kecil/" }
      ],
      company: [
        { label: "Tentang Kami", href: "/about/" },
        { label: "Dasar Privasi", href: "/privacy/" },
        { label: "Terma Perkhidmatan", href: "/terms/" },
        { label: "Hubungi Kami", href: "/contact/" }
      ],
      colTitles: { explore: "Terokai", tools: "Alat Popular", categories: "Kategori Popular", company: "Syarikat" },
      copyright: "© 2026 UltraTextGen. Tulisan bergaya yang berfungsi di mana-mana."
    },
    pl: {
      home: { label: "Strona główna", href: "/pl/" },
      explore: [
        { label: "Poradniki", href: "/pl/guide/" },
        { label: "Odpowiedzi", href: "/pl/answers/" },
        { label: "Zastosowania", href: "/pl/usecase/" },
        { label: "Kategorie", href: "/pl/category/" },
        { label: "Biblioteka", href: "/pl/library/" },
        { label: "Do druku", href: "/pl/do-druku/" },
        { label: "Wydarzenia", href: "/events/" }
      ],
      tools: [
        { label: "Licznik znaków", href: "/pl/licznik-slow-i-znakow/" },
        { label: "Czcionki na tatuaż", href: "/pl/usecase/czcionki-tatuaze/" },
        { label: "Tłumacz emoji", href: "/pl/usecase/tlumacz-emoji/" },
        { label: "Tekst pionowy", href: "/pl/usecase/vertical-text/" }
      ],
      categories: [
        { label: "Pogrubiona czcionka", href: "/pl/pogrubiona-czcionka/" },
        { label: "Kursywa", href: "/pl/kursywa/" },
        { label: "Czcionki gotyckie", href: "/pl/czcionki-gotyckie/" },
        { label: "Małe litery", href: "/pl/male-litery/" },
        { label: "Przekreślony tekst", href: "/pl/przekreslony-tekst/" }
      ],
      company: [
        { label: "O nas", href: "/about/" },
        { label: "Polityka prywatności", href: "/privacy/" },
        { label: "Regulamin", href: "/terms/" },
        { label: "Kontakt", href: "/contact/" }
      ],
      colTitles: { explore: "Przeglądaj", tools: "Popularne narzędzia", categories: "Popularne kategorie", company: "Firma" },
      copyright: "© 2026 UltraTextGen. Stylowe litery, które działają wszędzie."
    }
  };

  function detectLocale() {
    var m = path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
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

  // Native printables sub-pages, verified on-disk 2026-07-21 — same rule as
  // the FOOTER "tools"/"categories" links above: real slugs, not translated
  // guesses. "Company" reuses the exact FOOTER[loc].company entries so the
  // About/Privacy/Terms/Contact links stay identical everywhere on a locale.
  var PRINTABLES_LOCALE = {
    pt: {
      colTitle: "Imprimíveis",
      items: [
        { label: "Todos os Imprimíveis", href: "/pt/imprimiveis/" },
        { label: "Alfabeto Cursivo", href: "/pt/imprimiveis/alfabeto-cursivo/" },
        { label: "Alfabeto para Colorir", href: "/pt/imprimiveis/alfabeto-para-colorir/" },
        { label: "Letras Bolha A–Z", href: "/pt/imprimiveis/letras-bolha/" },
        { label: "Ficha de Nome para Traçar", href: "/pt/imprimiveis/nome-para-tracar/" }
      ],
      bridge: 'Procurando fontes para bio e posts? <a href="/pt/" class="footer-link">Experimente o gerador de fontes →</a>',
      copyright: "© 2026 UltraTextGen. Letras e alfabetos grátis para imprimir."
    },
    fr: {
      colTitle: "Imprimables",
      items: [
        { label: "Tous les Imprimables", href: "/fr/imprimables/" },
        { label: "Alphabet Cursif", href: "/fr/imprimables/alphabet-cursif/" },
        { label: "Coloriages Alphabet", href: "/fr/imprimables/coloriage-alphabet/" },
        { label: "Lettres Bulles A–Z", href: "/fr/imprimables/lettres-bulles/" },
        { label: "Fiche de Prénom à Tracer", href: "/fr/imprimables/prenom-a-tracer/" }
      ],
      bridge: 'Vous cherchez des polices pour bio et posts ? <a href="/fr/" class="footer-link">Essayez le générateur de polices →</a>',
      copyright: "© 2026 UltraTextGen. Lettres et alphabets gratuits à imprimer."
    },
    de: {
      colTitle: "Zum Ausdrucken",
      items: [
        { label: "Alle Schreibvorlagen", href: "/de/zum-ausdrucken/" },
        { label: "Schreibschrift-Generator", href: "/de/zum-ausdrucken/schreibschrift/" },
        { label: "Schreibübungen-Generator", href: "/de/zum-ausdrucken/schreibuebungen/" },
        { label: "Namen Nachspuren", href: "/de/zum-ausdrucken/namen-schreiben/" },
        { label: "Name-Ausmalbild", href: "/de/zum-ausdrucken/name-ausmalen/" }
      ],
      bridge: 'Suchst du Schriftarten für Bio und Beiträge? <a href="/de/" class="footer-link">Schriftgenerator ausprobieren →</a>',
      copyright: "© 2026 UltraTextGen. Kostenlose Buchstaben und Alphabete zum Ausdrucken."
    },
    it: {
      colTitle: "Da Stampare",
      items: [
        { label: "Tutte le Schede da Stampare", href: "/it/da-stampare/" },
        { label: "Alfabeto Corsivo", href: "/it/da-stampare/alfabeto-corsivo/" },
        { label: "Nome da Colorare", href: "/it/da-stampare/nome-da-colorare/" },
        { label: "Nome da Tracciare", href: "/it/da-stampare/tracciare-il-nome/" }
      ],
      bridge: 'Cerchi font per bio e post? <a href="/it/" class="footer-link">Prova il generatore di font →</a>',
      copyright: "© 2026 UltraTextGen. Lettere e alfabeti gratuiti da stampare."
    },
    es: {
      colTitle: "Imprimibles",
      items: [
        { label: "Todos los Imprimibles", href: "/es/imprimibles/" },
        { label: "Alfabeto en Cursiva", href: "/es/imprimibles/alfabeto-cursiva/" },
        { label: "Abecedario para Colorear", href: "/es/imprimibles/abecedario-para-colorear/" },
        { label: "Letras Burbuja A–Z", href: "/es/imprimibles/letras-burbuja/" },
        { label: "Ficha para Trazar el Nombre", href: "/es/imprimibles/nombre-para-trazar/" }
      ],
      bridge: '¿Buscas fuentes para bio y publicaciones? <a href="/es/" class="footer-link">Prueba el generador de fuentes →</a>',
      copyright: "© 2026 UltraTextGen. Letras y alfabetos gratis para imprimir."
    },
    tr: {
      colTitle: "Baskılar",
      items: [
        { label: "Tüm Baskılar", href: "/printables/" },
        { label: "El Yazısı Alfabesi", href: "/printables/cursive-alphabet/" },
        { label: "Alfabe Boyama Sayfaları", href: "/printables/alphabet-coloring-pages/" },
        { label: "Balon Harfler A–Z", href: "/printables/bubble-letters/" },
        { label: "İsim İzleme Sayfası", href: "/printables/name-tracing/" }
      ],
      bridge: 'Biyografi ve gönderiler için yazı tipi mi arıyorsun? <a href="/tr/" class="footer-link">Yazı tipi oluşturucuyu dene →</a>',
      copyright: "© 2026 UltraTextGen. Yazdırılabilir harfler ve alfabeler ücretsiz."
    },
    id: {
      colTitle: "Cetak",
      items: [
        { label: "Semua Cetakan", href: "/printables/" },
        { label: "Alfabet Kursif", href: "/printables/cursive-alphabet/" },
        { label: "Halaman Mewarnai Alfabet", href: "/printables/alphabet-coloring-pages/" },
        { label: "Huruf Balon A–Z", href: "/printables/bubble-letters/" },
        { label: "Lembar Jiplak Nama", href: "/printables/name-tracing/" }
      ],
      bridge: 'Mencari font untuk bio dan postingan? <a href="/id/" class="footer-link">Coba generator font →</a>',
      copyright: "© 2026 UltraTextGen. Huruf dan alfabet cetak gratis."
    }
  };

  function buildLocalePrintablesFooterHTML(locale) {
    var p = PRINTABLES_LOCALE[locale];
    var f = FOOTER[locale];
    return '<div class="footer-columns">' +
        '<div class="footer-col">' +
          '<span class="footer-col-title">' + p.colTitle + '</span>' +
          linksHTML(p.items) +
        '</div>' +
        '<div class="footer-col">' +
          '<span class="footer-col-title">' + f.colTitles.company + '</span>' +
          linksHTML(f.company) +
        '</div>' +
      '</div>' +
      '<div class="footer-bridge">' + p.bridge + '</div>' +
      '<div class="footer-social-links">' +
        '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
        '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
        '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
        '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
      '</div>' +
      '<div class="footer-bottom">' + p.copyright + '</div>';
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
        '<span class="footer-col-title">Learn</span>' +
        '<a href="/learn/handwriting/" class="footer-link">Teaching Handwriting</a>' +
        '<a href="/learn/handwriting/when-to-start-handwriting/" class="footer-link">When to Start</a>' +
        '<a href="/learn/handwriting/stroke-order-and-start-dots/" class="footer-link">Stroke Order &amp; Start Dots</a>' +
        '<a href="/learn/handwriting/from-tracing-to-writing/" class="footer-link">From Tracing to Writing</a>' +
        '<a href="/learn/handwriting/cursive-when-and-how/" class="footer-link">Cursive: When &amp; How</a>' +
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

  if (nativePrintablesLocale) {
    footerLinksHTML = buildLocalePrintablesFooterHTML(nativePrintablesLocale);
  } else if (isPrintablesContext) {
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
