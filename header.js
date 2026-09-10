(function () {
  "use strict";

  // GTM loads solely via the inline snippet each page ships in <head>;
  // this selector only locates the noscript iframe to position the header.
  const GTM_NOSCRIPT_SELECTOR = 'noscript iframe[src*="googletagmanager.com/ns.html"]';

  // Dedicated ad slot — injected once here so every page that loads
  // header.js gets it automatically, with no per-page markup to maintain.
  // Auto ads (Anchor, etc.) still runs from the loader script each page
  // already ships in <head>; this is the one remaining fixed, hand-placed unit.
  // A top-banner unit (slot 7584734719) used to live here too — removed
  // 2026-07-27 after a 7-day AdSense pull showed 3 impressions / SGD0.00
  // sitewide while permanently reserving 100-250px under the nav on every
  // pageview. Full earnings analysis recorded internally.
  const AD_CLIENT = "ca-pub-8242324164413945";

  const rightRailHTML = '<aside class="ad-slot ad-rail-right">' +
      '<ins class="adsbygoogle" style="display:inline-block;width:300px;height:600px" ' +
        'data-ad-client="' + AD_CLIENT + '" ' +
        'data-ad-slot="5968968934"></ins>' +
    '</aside>';

  // Locale-aware nav — Tier-1 locales only (real guide/library hubs + native
  // category/usecase pages to point at). Everyone else falls through to EN.
  // Where a locale has no hub page at all yet (category/usecase/answers/events
  // hubs exist in zero locales; printables only in 5/7), the label is still
  // translated but the href falls back to the English hub — same pattern
  // yaytext.com uses for its own untranslated pages (verified live 2026-07-20).
  // Fallbacks close out as each locale's hub pages get built.
  const NAV = {
    pt: {
      home: "/pt/",
      guide: { label: "Guias", href: "/pt/guide/" },
      answers: { label: "Respostas", href: "/pt/answers/" },
      category: { label: "Categorias", href: "/pt/category/" },
      usecase: { label: "Usos", href: "/pt/usecase/" },
      library: { label: "Biblioteca", href: "/pt/library/" },
      printables: { label: "Imprimíveis", href: "/pt/imprimiveis/" },
      events: { label: "Eventos", href: "/events/" },
      search: "Buscar estilos de fonte…",
      darkMode: "Alternar modo escuro"
    },
    fr: {
      home: "/fr/",
      guide: { label: "Guides", href: "/fr/guide/" },
      answers: { label: "Réponses", href: "/fr/answers/" },
      category: { label: "Catégories", href: "/fr/category/" },
      usecase: { label: "Usages", href: "/fr/usecase/" },
      library: { label: "Bibliothèque", href: "/fr/library/" },
      printables: { label: "Imprimables", href: "/fr/imprimables/" },
      events: { label: "Événements", href: "/events/" },
      search: "Rechercher un style d'écriture…",
      darkMode: "Basculer le mode sombre"
    },
    de: {
      home: "/de/",
      guide: { label: "Ratgeber", href: "/de/guide/" },
      answers: { label: "Antworten", href: "/answers/" },
      category: { label: "Kategorien", href: "/de/category/" },
      usecase: { label: "Anwendungen", href: "/de/usecase/" },
      library: { label: "Bibliothek", href: "/de/library/" },
      printables: { label: "Zum Ausdrucken", href: "/de/zum-ausdrucken/" },
      events: { label: "Anlässe", href: "/events/" },
      search: "Schriftstile suchen…",
      darkMode: "Dunkelmodus umschalten"
    },
    it: {
      home: "/it/",
      guide: { label: "Guide", href: "/it/guide/" },
      answers: { label: "Risposte", href: "/it/answers/" },
      category: { label: "Categorie", href: "/it/category/" },
      usecase: { label: "Usi", href: "/it/usecase/" },
      library: { label: "Libreria", href: "/it/library/" },
      printables: { label: "Da Stampare", href: "/it/da-stampare/" },
      events: { label: "Eventi", href: "/events/" },
      search: "Cerca stili di carattere…",
      darkMode: "Attiva/disattiva modalità scura"
    },
    tr: {
      home: "/tr/",
      guide: { label: "Rehberler", href: "/tr/guide/" },
      answers: { label: "Yanıtlar", href: "/tr/answers/" },
      category: { label: "Kategoriler", href: "/tr/category/" },
      usecase: { label: "Kullanımlar", href: "/tr/usecase/" },
      library: { label: "Kütüphane", href: "/tr/library/" },
      printables: { label: "Baskılar", href: "/printables/" },
      events: { label: "Etkinlikler", href: "/events/" },
      search: "Yazı stili ara…",
      darkMode: "Karanlık modu değiştir"
    },
    es: {
      home: "/es/",
      guide: { label: "Guías", href: "/es/guide/" },
      answers: { label: "Respuestas", href: "/es/answers/" },
      category: { label: "Categorías", href: "/es/category/" },
      usecase: { label: "Usos", href: "/es/usecase/" },
      library: { label: "Biblioteca", href: "/es/library/" },
      printables: { label: "Imprimibles", href: "/es/imprimibles/" },
      events: { label: "Eventos", href: "/events/" },
      search: "Buscar estilos de fuente…",
      darkMode: "Alternar modo oscuro"
    },
    id: {
      home: "/id/",
      guide: { label: "Panduan", href: "/id/guide/" },
      answers: { label: "Jawaban", href: "/id/answers/" },
      category: { label: "Kategori", href: "/id/category/" },
      usecase: { label: "Kegunaan", href: "/id/usecase/" },
      library: { label: "Perpustakaan", href: "/id/library/" },
      printables: { label: "Cetak", href: "/id/printables/" },
      events: { label: "Acara", href: "/events/" },
      search: "Cari gaya font…",
      darkMode: "Alihkan mode gelap"
    },
    pl: {
      home: "/pl/",
      guide: { label: "Poradniki", href: "/pl/guide/" },
      answers: { label: "Odpowiedzi", href: "/pl/answers/" },
      category: { label: "Kategorie", href: "/pl/category/" },
      usecase: { label: "Zastosowania", href: "/pl/usecase/" },
      library: { label: "Biblioteka", href: "/pl/library/" },
      printables: { label: "Do druku", href: "/pl/do-druku/" },
      events: { label: "Wydarzenia", href: "/events/" },
      search: "Szukaj stylów czcionek…",
      darkMode: "Przełącz tryb ciemny"
    },
    ar: {
      home: "/ar/",
      guide: { label: "الأدلة", href: "/ar/guide/" },
      answers: { label: "الإجابات", href: "/ar/answers/" },
      category: { label: "الفئات", href: "/category/" },
      usecase: { label: "الاستخدامات", href: "/ar/usecase/" },
      library: { label: "المكتبة", href: "/ar/library/" },
      printables: { label: "للطباعة", href: "/printables/" },
      events: { label: "المناسبات", href: "/events/" },
      search: "ابحث عن أنماط الخطوط…",
      darkMode: "تبديل الوضع الليلي"
    },
    bs: {
      home: "/bs/",
      guide: { label: "Vodiči", href: "/bs/guide/" },
      answers: { label: "Odgovori", href: "/answers/" },
      category: { label: "Kategorije", href: "/category/" },
      usecase: { label: "Upotrebe", href: "/usecase/" },
      library: { label: "Biblioteka", href: "/library/" },
      printables: { label: "Za štampanje", href: "/printables/" },
      events: { label: "Događaji", href: "/events/" },
      search: "Pretraži stilove fonta…",
      darkMode: "Prebaci tamni način rada"
    },
    cs: {
      home: "/cs/",
      guide: { label: "Návody", href: "/cs/guide/" },
      answers: { label: "Odpovědi", href: "/answers/" },
      category: { label: "Kategorie", href: "/category/" },
      usecase: { label: "Použití", href: "/usecase/" },
      library: { label: "Knihovna", href: "/library/" },
      printables: { label: "K tisku", href: "/printables/" },
      events: { label: "Události", href: "/events/" },
      search: "Hledat styly písma…",
      darkMode: "Přepnout tmavý režim"
    },
    da: {
      home: "/da/",
      guide: { label: "Guides", href: "/da/guide/" },
      answers: { label: "Svar", href: "/answers/" },
      category: { label: "Kategorier", href: "/category/" },
      usecase: { label: "Anvendelser", href: "/usecase/" },
      library: { label: "Bibliotek", href: "/da/library/" },
      printables: { label: "Til print", href: "/printables/" },
      events: { label: "Begivenheder", href: "/events/" },
      search: "Søg efter skrifttypestile…",
      darkMode: "Skift mørk tilstand"
    },
    hi: {
      home: "/hi/",
      guide: { label: "गाइड", href: "/hi/guide/" },
      answers: { label: "जवाब", href: "/answers/" },
      category: { label: "श्रेणियाँ", href: "/category/" },
      usecase: { label: "उपयोग", href: "/usecase/" },
      library: { label: "लाइब्रेरी", href: "/library/" },
      printables: { label: "प्रिंट के लिए", href: "/printables/" },
      events: { label: "इवेंट्स", href: "/events/" },
      search: "फॉन्ट स्टाइल खोजें…",
      darkMode: "डार्क मोड टॉगल करें"
    },
    hr: {
      home: "/hr/",
      guide: { label: "Vodiči", href: "/hr/guide/" },
      answers: { label: "Odgovori", href: "/answers/" },
      category: { label: "Kategorije", href: "/category/" },
      usecase: { label: "Upotrebe", href: "/usecase/" },
      library: { label: "Biblioteka", href: "/library/" },
      printables: { label: "Za ispis", href: "/printables/" },
      events: { label: "Događaji", href: "/events/" },
      search: "Pretraži stilove fonta…",
      darkMode: "Prebaci tamni način rada"
    },
    hu: {
      home: "/hu/",
      guide: { label: "Útmutatók", href: "/hu/guide/" },
      answers: { label: "Válaszok", href: "/answers/" },
      category: { label: "Kategóriák", href: "/category/" },
      usecase: { label: "Felhasználások", href: "/usecase/" },
      library: { label: "Könyvtár", href: "/library/" },
      printables: { label: "Nyomtatható", href: "/printables/" },
      events: { label: "Események", href: "/events/" },
      search: "Betűstílusok keresése…",
      darkMode: "Sötét mód váltása"
    },
    ja: {
      home: "/ja/",
      guide: { label: "ガイド", href: "/ja/guide/" },
      answers: { label: "回答", href: "/ja/answers/" },
      category: { label: "カテゴリー", href: "/category/" },
      usecase: { label: "使い方", href: "/usecase/" },
      library: { label: "ライブラリ", href: "/ja/library/" },
      printables: { label: "印刷用", href: "/printables/" },
      events: { label: "イベント", href: "/events/" },
      search: "フォントスタイルを検索…",
      darkMode: "ダークモード切り替え"
    },
    ko: {
      home: "/ko/",
      guide: { label: "가이드", href: "/ko/guide/" },
      answers: { label: "답변", href: "/answers/" },
      category: { label: "카테고리", href: "/category/" },
      usecase: { label: "활용법", href: "/usecase/" },
      library: { label: "라이브러리", href: "/ko/library/" },
      printables: { label: "인쇄용", href: "/printables/" },
      events: { label: "이벤트", href: "/events/" },
      search: "폰트 스타일 검색…",
      darkMode: "다크 모드 전환"
    },
    nl: {
      home: "/nl/",
      guide: { label: "Guides", href: "/nl/guide/" },
      answers: { label: "Antwoorden", href: "/nl/answers/" },
      category: { label: "Categorieën", href: "/category/" },
      usecase: { label: "Toepassingen", href: "/nl/usecase/" },
      library: { label: "Bibliotheek", href: "/nl/library/" },
      printables: { label: "Afdrukbaar", href: "/printables/" },
      events: { label: "Evenementen", href: "/events/" },
      search: "Zoek lettertypestijlen…",
      darkMode: "Donkere modus wisselen"
    },
    no: {
      home: "/no/",
      guide: { label: "Guider", href: "/no/guide/" },
      answers: { label: "Svar", href: "/answers/" },
      category: { label: "Kategorier", href: "/category/" },
      usecase: { label: "Bruksområder", href: "/usecase/" },
      library: { label: "Bibliotek", href: "/no/library/" },
      printables: { label: "Til utskrift", href: "/printables/" },
      events: { label: "Arrangementer", href: "/events/" },
      search: "Søk etter fontstiler…",
      darkMode: "Bytt mørk modus"
    },
    ro: {
      home: "/ro/",
      guide: { label: "Ghiduri", href: "/ro/guide/" },
      answers: { label: "Răspunsuri", href: "/answers/" },
      category: { label: "Categorii", href: "/category/" },
      usecase: { label: "Utilizări", href: "/usecase/" },
      library: { label: "Bibliotecă", href: "/library/" },
      printables: { label: "De printat", href: "/printables/" },
      events: { label: "Evenimente", href: "/events/" },
      search: "Caută stiluri de font…",
      darkMode: "Comută modul întunecat"
    },
    ru: {
      home: "/ru/",
      guide: { label: "Руководства", href: "/ru/guide/" },
      answers: { label: "Ответы", href: "/ru/answers/" },
      category: { label: "Категории", href: "/category/" },
      usecase: { label: "Применение", href: "/usecase/" },
      library: { label: "Библиотека", href: "/ru/library/" },
      printables: { label: "Для печати", href: "/printables/" },
      events: { label: "События", href: "/events/" },
      search: "Поиск стилей шрифта…",
      darkMode: "Переключить тёмный режим"
    },
    sk: {
      home: "/sk/",
      guide: { label: "Sprievodcovia", href: "/sk/guide/" },
      answers: { label: "Odpovede", href: "/answers/" },
      category: { label: "Kategórie", href: "/category/" },
      usecase: { label: "Použitie", href: "/usecase/" },
      library: { label: "Knižnica", href: "/library/" },
      printables: { label: "Na tlač", href: "/printables/" },
      events: { label: "Podujatia", href: "/events/" },
      search: "Hľadať štýly písma…",
      darkMode: "Prepnúť tmavý režim"
    },
    sr: {
      home: "/sr/",
      guide: { label: "Vodiči", href: "/sr/guide/" },
      answers: { label: "Odgovori", href: "/answers/" },
      category: { label: "Kategorije", href: "/category/" },
      usecase: { label: "Upotrebe", href: "/usecase/" },
      library: { label: "Biblioteka", href: "/library/" },
      printables: { label: "Za štampu", href: "/printables/" },
      events: { label: "Događaji", href: "/events/" },
      search: "Pretraži stilove fonta…",
      darkMode: "Promeni tamni režim"
    },
    sv: {
      home: "/sv/",
      guide: { label: "Guider", href: "/sv/guide/" },
      answers: { label: "Svar", href: "/answers/" },
      category: { label: "Kategorier", href: "/category/" },
      usecase: { label: "Användningar", href: "/usecase/" },
      library: { label: "Bibliotek", href: "/sv/library/" },
      printables: { label: "Utskrifter", href: "/printables/" },
      events: { label: "Evenemang", href: "/events/" },
      search: "Sök typsnittsstilar…",
      darkMode: "Växla mörkt läge"
    },
    th: {
      home: "/th/",
      guide: { label: "คู่มือ", href: "/th/guide/" },
      answers: { label: "คำตอบ", href: "/th/answers/" },
      category: { label: "หมวดหมู่", href: "/category/" },
      usecase: { label: "การใช้งาน", href: "/th/usecase/" },
      library: { label: "คลังสัญลักษณ์", href: "/th/library/" },
      printables: { label: "พิมพ์ได้", href: "/printables/" },
      events: { label: "กิจกรรม", href: "/events/" },
      search: "ค้นหาสไตล์ฟอนต์…",
      darkMode: "สลับโหมดมืด"
    },
    tl: {
      home: "/tl/",
      guide: { label: "Mga Gabay", href: "/tl/guide/" },
      answers: { label: "Mga Sagot", href: "/answers/" },
      category: { label: "Mga Kategorya", href: "/category/" },
      usecase: { label: "Mga Gamit", href: "/usecase/" },
      library: { label: "Aklatan", href: "/library/" },
      printables: { label: "Pwedeng I-print", href: "/printables/" },
      events: { label: "Mga Kaganapan", href: "/events/" },
      search: "Maghanap ng font style…",
      darkMode: "I-toggle ang dark mode"
    },
    vi: {
      home: "/vi/",
      guide: { label: "Hướng dẫn", href: "/vi/guide/" },
      answers: { label: "Câu trả lời", href: "/answers/" },
      category: { label: "Danh mục", href: "/category/" },
      usecase: { label: "Cách dùng", href: "/usecase/" },
      library: { label: "Thư viện", href: "/vi/library/" },
      printables: { label: "Bản in", href: "/printables/" },
      events: { label: "Sự kiện", href: "/events/" },
      search: "Tìm kiểu chữ…",
      darkMode: "Bật/tắt chế độ tối"
    },
    "zh-tw": {
      home: "/zh-tw/",
      guide: { label: "指南", href: "/zh-tw/guide/" },
      answers: { label: "問答", href: "/answers/" },
      category: { label: "分類", href: "/category/" },
      usecase: { label: "使用情境", href: "/usecase/" },
      library: { label: "符號庫", href: "/zh-tw/library/" },
      printables: { label: "可列印", href: "/printables/" },
      events: { label: "活動", href: "/events/" },
      search: "搜尋字體樣式…",
      darkMode: "切換深色模式"
    },
    fi: {
      home: "/fi/",
      guide: { label: "Oppaat", href: "/fi/guide/" },
      answers: { label: "Vastaukset", href: "/answers/" },
      category: { label: "Kategoriat", href: "/category/" },
      usecase: { label: "Käyttötavat", href: "/usecase/" },
      library: { label: "Kirjasto", href: "/library/" },
      printables: { label: "Tulostettavat", href: "/printables/" },
      events: { label: "Tapahtumat", href: "/events/" },
      search: "Hae fonttityylejä…",
      darkMode: "Vaihda tumma tila"
    },
    ms: {
      home: "/ms/",
      guide: { label: "Panduan", href: "/ms/guide/" },
      answers: { label: "Jawapan", href: "/answers/" },
      category: { label: "Kategori", href: "/category/" },
      usecase: { label: "Kegunaan", href: "/usecase/" },
      library: { label: "Pustaka", href: "/library/" },
      printables: { label: "Boleh Cetak", href: "/printables/" },
      events: { label: "Acara", href: "/events/" },
      search: "Cari gaya font…",
      darkMode: "Tukar mod gelap"
    }
  };

  const EN = {
    home: "/",
    guide: { label: "Guide", href: "/guide/" },
    answers: { label: "Answers", href: "/answers/" },
    category: { label: "Category", href: "/category/" },
    usecase: { label: "Use cases", href: "/usecase/" },
    library: { label: "Library", href: "/library/" },
    printables: { label: "Printables", href: "/printables/" },
    events: { label: "Events", href: "/events/" },
    search: "Search font styles…",
    darkMode: "Toggle dark mode"
  };

  function detectLocale() {
    const path = (window.location && window.location.pathname) || "";
    const m = path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
    return m && NAV[m[1]] ? m[1] : "en";
  }

  const nav = NAV[detectLocale()] || EN;

  // Fixed icon set — only the label/href per nav item change per locale.
  const NAV_ITEMS = [
    { key: "guide", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l7-7 3 3-7 7-3-3zM18 13l-6-6-8 8v6h6l8-8z" />' },
    { key: "answers", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />' },
    { key: "category", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h6v6H3V7zm12 0h6v6h-6V7zM3 17h6v4H3v-4zm12 0h6v4h-6v-4z"></path>' },
    { key: "usecase", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />' },
    { key: "library", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />' },
    { key: "printables", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />' },
    { key: "events", icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />' }
  ];

  var navButtonsHTML = NAV_ITEMS.map(function (item) {
    var entry = nav[item.key];
    return '<a class="header-btn" href="' + entry.href + '" aria-label="' + entry.label + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
          item.icon +
        '</svg>' +
        '<span>' + entry.label + '</span>' +
      '</a>';
  }).join('');

  var headerHTML = '<header class="header">' +
    '<div class="header-inner">' +
      '<a href="' + nav.home + '" class="logo">' +
        '<span class="logo-icon">U</span>' +
        '<span>UltraTextGen</span>' +
      '</a>' +
      '<div class="search-bar">' +
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>' +
        '</svg>' +
        '<input type="search" id="searchInput" placeholder="' + nav.search + '" aria-label="' + nav.search + '">' +
      '</div>' +
      '<div class="header-actions">' +
        navButtonsHTML +
        '<button class="header-btn" id="darkModeBtn" aria-label="' + nav.darkMode + '" type="button">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</header>';

  function initializeSharedHeader() {
    var placeholder = document.getElementById("shared-header");
    if (placeholder) {
      placeholder.outerHTML = headerHTML;
    } else {
      const body = document.body;
      let insertAfter = body.querySelector(GTM_NOSCRIPT_SELECTOR);
      if (insertAfter) {
        insertAfter = insertAfter.parentNode;
      } else {
        for (let i = 0; i < body.childNodes.length; i++) {
          const node = body.childNodes[i];
          if (node.nodeType === 8 && node.nodeValue.trim() === "End Google Tag Manager (noscript)") {
            insertAfter = node;
            break;
          }
        }
      }
      const tmp = document.createElement("div");
      tmp.innerHTML = headerHTML;
      const header = tmp.firstChild;
      body.insertBefore(header, insertAfter ? insertAfter.nextSibling : body.firstChild);
    }

    // Ad slot: right rail appended to <body> (it's position:fixed, so its
    // DOM position doesn't matter).
    document.body.insertAdjacentHTML("beforeend", rightRailHTML);
    if (window.adsbygoogle === undefined) {
      window.adsbygoogle = [];
    }
    // Right rail is CSS-hidden below 1600px (see .ad-rail-right in style.css);
    // only request it when it'll actually be seen, so narrow viewports don't
    // burn an impression on a slot nobody can view.
    if (window.matchMedia("(min-width: 1600px)").matches) {
      window.adsbygoogle.push({});
    }

    // Dark mode: apply saved preference immediately (before paint)
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark-mode");
    }

    // Dark mode toggle
    var dmBtn = document.getElementById("darkModeBtn");
    if (dmBtn) {
      dmBtn.addEventListener("click", function () {
        var isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", isDark ? "true" : "false");
      });
    }
  }

  // ── CTA card instrumentation ─────────────────────────────────────────────
  //
  // The shared CTA card sits on 3,955 pages and, until 2026-08-26, was not
  // instrumented at all: no dataLayer push, no gtag call, no listener anywhere
  // in script.js or js/. So there was no way to answer "what does this card
  // convert at" — and therefore no way to know whether a change to it helped.
  //
  // It lives in header.js rather than script.js on purpose: of the 3,955 pages
  // carrying a CTA button, 3,955 load header.js and only 148 load script.js.
  //
  // Delegated on document, so it also covers a card injected after load, and
  // capture:false + no preventDefault, so navigation is never delayed or
  // blocked by this. GTM's own tag then decides what to do with the event.
  var CTA_SELECTOR = ".cta-btn, .cta-card a[href]";

  var PILLARS = ["library", "symbol", "category", "usecase", "guide",
                 "answers", "events", "printables", "updates"];

  // Drop a leading locale segment, using NAV as the authority rather than a
  // /^[a-z]{2}/ regex. That distinction is load-bearing: `/js/` is a real
  // two-letter top-level directory on this site and is not a locale, and a
  // regex would silently treat it as one.
  function stripLocale(parts) {
    if (parts.length && NAV[parts[0]]) return parts.slice(1);
    return parts;
  }

  // Classify the destination so the data is usable without a page-by-page
  // lookup. "homepage" is the case that matters most: 2,758 of 3,955 CTA
  // buttons pointed at a bare homepage when this was written.
  function ctaDestinationType(href) {
    var path;
    try {
      path = new URL(href, window.location.href).pathname;
    } catch (err) {
      return "unknown";
    }
    var parts = stripLocale(path.split("/").filter(Boolean));
    if (!parts.length) return "homepage";
    if (PILLARS.indexOf(parts[0]) !== -1) {
      // A pillar INDEX is a browse hub; a deeper path is a specific page.
      return parts.length === 1 ? parts[0] + "_index" : parts[0];
    }
    return "tool";
  }

  // The page the click happened ON, so a click can be attributed without
  // joining against a separate page-family table.
  function ctaSourceFamily() {
    var parts = stripLocale((window.location.pathname || "/").split("/").filter(Boolean));
    return parts.length ? parts[0] : "homepage";
  }


  /* ============================================================
     Copy identity — shared by every copy_text call site
     ============================================================
     `copy_text` recorded WHICH item was copied on the generator-button
     path only (style_name). The symbol-tile path — live on 3,608 pages —
     recorded nothing, so "what the world actually copies" was
     unmeasurable on the site's largest copy surface, and that data
     cannot be backfilled.

     It lives HERE, not in symbol-explorer.js or script.js, for the same
     reason cta_click does: header.js is on 4,635 of 4,647 pages
     (including all 3,608 symbol-explorer pages), and a second copy of
     this table in each consumer would drift from the first.

     TWO parameters, because one cannot do the job alone. The site
     carries 8,806 distinct copy payloads, far past the cardinality GA4
     will keep as distinct rows — so `copy_item` alone would very likely
     arrive as a column of "(other)". `copy_item_group` is the
     low-cardinality companion (a real Unicode block, ~60 values) that
     survives standard GA4 reports regardless, while `copy_item` stays
     exact in the BigQuery raw-event export.

     Decisions each one serves:
       copy_item       → which specific symbols deserve their own page,
                         tile placement, or feature work.
       copy_item_group → which Unicode families the site should invest
                         in, readable even when copy_item buckets.
     ============================================================ */

  // Flat [firstCodepoint, name] table, sorted ascending; a block runs
  // until the next entry starts. Derived from the Unicode block list and
  // trimmed to the ranges this site actually ships, measured across every
  // data-symbol attribute in the tree. Entries named "" are gaps — real
  // Unicode blocks the site does not use — and resolve to "Other".
  /* @copy-identity:begin */
  var COPY_BLOCKS = [
    [0x0000, "Basic Latin"],
    [0x0080, "Latin-1 Supplement"],
    [0x0100, "Latin Extended-A"],
    [0x0180, "Latin Extended-B"],
    [0x0250, "IPA Extensions"],
    [0x02B0, "Spacing Modifier Letters"],
    [0x0300, "Combining Diacritical Marks"],
    [0x0370, "Greek and Coptic"],
    [0x0400, "Cyrillic"],
    [0x0500, "Cyrillic Supplement"],
    [0x0530, "Armenian"],
    [0x0590, "Hebrew"],
    [0x0600, "Arabic"],
    [0x0700, "Syriac"],
    [0x0750, "Arabic Supplement"],
    [0x0780, "Thaana"],
    [0x07C0, "NKo"],
    [0x0800, "Samaritan"],
    [0x0840, "Mandaic"],
    [0x08A0, "Arabic Extended-A"],
    [0x0900, "Devanagari"],
    [0x0980, "Bengali"],
    [0x0A00, "Gurmukhi"],
    [0x0A80, "Gujarati"],
    [0x0B00, "Oriya"],
    [0x0B80, "Tamil"],
    [0x0C00, "Telugu"],
    [0x0C80, "Kannada"],
    [0x0D00, "Malayalam"],
    [0x0D80, "Sinhala"],
    [0x0E00, "Thai"],
    [0x0E80, "Lao"],
    [0x0F00, "Tibetan"],
    [0x1000, "Myanmar"],
    [0x10A0, "Georgian"],
    [0x1100, "Hangul Jamo"],
    [0x1200, "Ethiopic"],
    [0x1400, "Unified Canadian Aboriginal Syllabics"],
    [0x1680, "Ogham"],
    [0x16A0, "Runic"],
    [0x1700, "Philippine Scripts"],
    [0x1780, "Khmer"],
    [0x1800, "Mongolian"],
    [0x18B0, "Unified Canadian Aboriginal Syllabics Extended"],
    [0x1900, "Limbu"],
    [0x1950, "Tai Le"],
    [0x1980, "New Tai Lue"],
    [0x19E0, "Khmer Symbols"],
    [0x1A00, "Buginese"],
    [0x1A20, "Tai Tham"],
    [0x1AB0, "Combining Diacritical Marks Extended"],
    [0x1B00, "Balinese"],
    [0x1B80, "Sundanese"],
    [0x1BC0, "Batak"],
    [0x1C00, "Lepcha"],
    [0x1C50, "Ol Chiki"],
    [0x1CC0, ""],
    [0x1D00, "Phonetic Extensions"],
    [0x1D80, "Phonetic Extensions Supplement"],
    [0x1DC0, ""],
    [0x1E00, "Latin Extended Additional"],
    [0x1F00, "Greek Extended"],
    [0x2000, "General Punctuation"],
    [0x2070, "Superscripts and Subscripts"],
    [0x20A0, "Currency Symbols"],
    [0x20D0, "Combining Marks for Symbols"],
    [0x2100, "Letterlike Symbols"],
    [0x2150, "Number Forms"],
    [0x2190, "Arrows"],
    [0x2200, "Mathematical Operators"],
    [0x2300, "Miscellaneous Technical"],
    [0x2400, "Control Pictures"],
    [0x2440, "OCR"],
    [0x2460, "Enclosed Alphanumerics"],
    [0x2500, "Box Drawing"],
    [0x2580, "Block Elements"],
    [0x25A0, "Geometric Shapes"],
    [0x2600, "Miscellaneous Symbols"],
    [0x2700, "Dingbats"],
    [0x27C0, "Miscellaneous Mathematical Symbols-A"],
    [0x27F0, "Supplemental Arrows-A"],
    [0x2800, "Braille Patterns"],
    [0x2900, "Supplemental Arrows-B"],
    [0x2980, "Miscellaneous Mathematical Symbols-B"],
    [0x2A00, "Supplemental Mathematical Operators"],
    [0x2B00, "Miscellaneous Symbols and Arrows"],
    [0x2C00, "Glagolitic"],
    [0x2C80, "Coptic"],
    [0x2D00, "Tifinagh and Ethiopic Extended"],
    [0x2E00, "Supplemental Punctuation"],
    [0x2E80, "CJK Radicals"],
    [0x3000, "CJK Symbols and Punctuation"],
    [0x3040, "Hiragana"],
    [0x30A0, "Katakana"],
    [0x3100, "Bopomofo"],
    [0x3130, "Hangul Compatibility Jamo"],
    [0x3190, "Kanbun"],
    [0x31A0, "Bopomofo Extended"],
    [0x3200, "Enclosed CJK Letters and Months"],
    [0x3300, "CJK Compatibility"],
    [0x3400, "CJK Unified Ideographs"],
    [0xA000, "Yi Syllables"],
    [0xA490, "Yi Radicals"],
    [0xA4D0, "Lisu"],
    [0xA500, "Vai"],
    [0xA640, "Cyrillic Extended-B"],
    [0xA700, "Modifier Tone Letters"],
    [0xA720, "Latin Extended-D"],
    [0xA800, "Syloti Nagri"],
    [0xA840, "Phags-pa"],
    [0xA880, "Saurashtra"],
    [0xA900, "Kayah Li"],
    [0xA930, "Rejang"],
    [0xA960, ""],
    [0xA980, "Javanese"],
    [0xA9E0, "Myanmar Extended-B"],
    [0xAA00, "Cham"],
    [0xAA80, "Meetei and Ethiopic Extended-A"],
    [0xAC00, "Hangul Syllables"],
    [0xD7B0, ""],
    [0xF900, "CJK Compatibility Ideographs"],
    [0xFB00, "Alphabetic Presentation Forms"],
    [0xFB50, "Arabic Presentation Forms"],
    [0xFE00, "Variation Selectors"],
    [0xFE10, "Vertical Forms"],
    [0xFE20, "Combining Half Marks"],
    [0xFE30, "CJK Compatibility Forms"],
    [0xFE50, "Small Form Variants"],
    [0xFE70, "Arabic Presentation Forms-B"],
    [0xFF00, "Halfwidth and Fullwidth Forms"],
    [0xFFF0, "Specials"],
    [0x10000, "Ancient Scripts"],
    [0x10100, "Aegean and Ancient Numbers"],
    [0x10200, "Ancient Scripts"],
    [0x10600, "Linear A"],
    [0x10800, "Ancient Scripts"],
    [0x13000, "Egyptian Hieroglyphs"],
    [0x13460, "Egyptian Hieroglyph Format Controls"],
    [0x14400, "Anatolian Hieroglyphs"],
    [0x16800, "Bamum Supplement"],
    [0x16A40, "Historic Scripts"],
    [0x16E40, "Medefaidrin"],
    [0x16F00, "Miao"],
    [0x1D000, "Byzantine Musical Symbols"],
    [0x1D100, "Musical Symbols"],
    [0x1D200, ""],
    [0x1D400, "Mathematical Alphanumeric Symbols"],
    [0x1D800, ""],
    [0x1F000, "Mahjong Tiles"],
    [0x1F030, "Domino Tiles"],
    [0x1F0A0, "Playing Cards"],
    [0x1F100, "Enclosed Alphanumeric Supplement"],
    [0x1F200, "Enclosed Ideographic Supplement"],
    [0x1F300, "Miscellaneous Symbols and Pictographs"],
    [0x1F600, "Emoticons"],
    [0x1F650, "Ornamental Dingbats"],
    [0x1F680, "Transport and Map Symbols"],
    [0x1F700, "Alchemical Symbols"],
    [0x1F780, "Geometric Shapes Extended"],
    [0x1F800, "Supplemental Arrows-C"],
    [0x1F900, "Supplemental Symbols and Pictographs"],
    [0x1FA00, "Symbols and Pictographs Extended-A"],
    [0x1FB00, "Symbols for Legacy Computing"],
    [0x20000, ""]
  ];

  // Codepoints that are never the *identity* of what was copied: they
  // modify or join the character before them. Skipping them is what makes
  // an emoji ZWJ sequence report as its lead pictograph rather than as
  // "Variation Selectors", and a Zalgo string as its base letter.
  function isModifierCp(cp) {
    return (
      (cp >= 0x0300 && cp <= 0x036F) || // combining diacriticals
      (cp >= 0x1AB0 && cp <= 0x1AFF) ||
      (cp >= 0x1DC0 && cp <= 0x1DFF) ||
      (cp >= 0x20D0 && cp <= 0x20FF) || // combining marks for symbols
      (cp >= 0xFE00 && cp <= 0xFE0F) || // variation selectors
      (cp >= 0x1F3FB && cp <= 0x1F3FF) || // skin-tone modifiers
      cp === 0x200D || // ZWJ
      cp === 0x200B ||
      cp === 0x2060 ||
      cp === 0xFEFF
    );
  }

  function blockName(cp) {
    // Regional indicators are technically Enclosed Alphanumeric
    // Supplement, but a flag is the analytically interesting thing —
    // flag pages are their own family on this site.
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF) return "Flags";
    var lo = 0;
    var hi = COPY_BLOCKS.length - 1;
    var ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (COPY_BLOCKS[mid][0] <= cp) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (ans === -1) return "Other";
    return COPY_BLOCKS[ans][1] || "Other";
  }

  // Returns { item, group } for any copied payload. `item` is the exact
  // text (capped so a whole-paragraph copy cannot blow the event size);
  // `group` is the Unicode block of its first non-modifier codepoint.
  function copyIdentity(text) {
    var raw = String(text == null ? "" : text);
    if (!raw) return { item: "", group: "" };
    // Trim only when something survives it. The invisible-character family —
    // a real, load-bearing family on this site — ships tiles whose ENTIRE
    // payload is whitespace (U+0020, U+00A0, U+2000..U+200A), and trimming
    // would erase precisely the identity being recorded. Measured: 26 of the
    // site's 8,806 distinct payloads are in that state.
    var s = raw.trim() || raw;

    var lead = null;
    for (var i = 0; i < s.length; ) {
      var cp = s.codePointAt(i);
      i += cp > 0xFFFF ? 2 : 1;
      if (!isModifierCp(cp)) {
        lead = cp;
        break;
      }
    }
    // An all-modifier payload (a bare combining mark tile, of which this
    // site ships several) is legitimate — fall back to its first
    // codepoint rather than reporting nothing.
    if (lead === null) lead = s.codePointAt(0);

    return {
      item: s.length > 60 ? s.slice(0, 60) : s,
      group: blockName(lead)
    };
  }

  // Push a copy_text event carrying the item identity. Every copy surface
  // on the site routes through here so the payload shape cannot diverge
  // between them — the reason this is one function and not five pushes.
  function trackCopy(method, text, extra) {
    var id = copyIdentity(text);
    var payload = {
      event: "copy_text",
      copy_method: method,
      copy_item: id.item,
      copy_item_group: id.group
    };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k) && extra[k] !== undefined) {
          payload[k] = extra[k];
        }
      }
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  /* @copy-identity:end */

  /* ---------------------------------------------------------------
     Printable output telemetry

     Every print and every PNG export on every /printables/ page funnels
     through exactly these two functions, so instrumenting them here covers
     the whole family from two places instead of 23 call sites — and a new
     sheet type added later is measured the moment it calls one of them.

     Before this, the printables family fired NO product events at all: the
     engines contained zero dataLayer pushes, so the one question that
     decides investment here — do people who land actually make a sheet —
     had no answer, on the family that earns the largest share of revenue
     per user on the site. That data cannot be backfilled.

     Decisions each parameter serves:
       printable_action → print vs. PNG. Decides whether print-CSS work or
                          canvas/export work is the one worth doing.
       printable_sheet  → which surface inside the engine got used. Says
                          whether the personalisation (name_worksheet,
                          banner, puzzle) or the preset alphabet sheets are
                          what people came for — a question page-level
                          analytics cannot answer, since both live on one URL.
       printable_page   → which printable earned it, robust against the
                          page_location rewrites GA4 configs tend to grow.

     WHAT IS DELIBERATELY NOT SENT: the text the user typed. These pages take
     children's names (name-tracing, dot-to-dot-name, name-puzzle-maker,
     monogram-maker). Sending that to Analytics would be collecting personal
     data about a child and is prohibited by Google's own policy on PII in
     Analytics. `printable_sheet` already separates personalised sheets from
     preset ones, which is the decision the text was tempting for — so there
     is nothing to trade off here. Do not add the input, its length, or its
     initials.
     --------------------------------------------------------------- */
  function trackPrintable(action, sheet) {
    var parts = (window.location.pathname || "/").split("/").filter(Boolean);
    // e.g. /printables/block-letters/letter-a/ -> "block-letters/letter-a";
    // a locale build (/es/imprimibles/...) keeps its own first segment.
    var page = parts.length > 1 ? parts.slice(1).join("/") : (parts[0] || "index");
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "printable_output",
      printable_action: action,
      printable_sheet: sheet || "sheet",
      printable_page: page
    });
  }

  var ns = (window.UltraTextGen = window.UltraTextGen || {});
  ns.copyIdentity = copyIdentity;
  ns.trackCopy = trackCopy;
  ns.trackPrintable = trackPrintable;

  function initializeCtaTracking() {
    document.addEventListener("click", function (evt) {
      var link = evt.target && evt.target.closest && evt.target.closest(CTA_SELECTOR);
      if (!link || !link.getAttribute("href")) return;
      var href = link.getAttribute("href");
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "cta_click",
        cta_href: href,
        cta_destination_type: ctaDestinationType(href),
        cta_text: (link.textContent || "").trim().slice(0, 80),
        cta_source_family: ctaSourceFamily(),
        cta_source_locale: detectLocale(),
        cta_source_path: window.location.pathname
      });
    }, false);
  }

  if (document.body) {
    initializeSharedHeader();
    initializeCtaTracking();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      initializeSharedHeader();
      initializeCtaTracking();
    });
  }
})();
