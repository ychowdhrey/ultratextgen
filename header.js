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
  // pageview. See ultratextgen-lab- docs/adsense-coverage-and-monetization-
  // diversification-2026-07-16.md §11 for the full analysis.
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
      printables: { label: "Cetak", href: "/printables/" },
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
      usecase: { label: "الاستخدامات", href: "/usecase/" },
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
      usecase: { label: "Toepassingen", href: "/usecase/" },
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
      usecase: { label: "การใช้งาน", href: "/usecase/" },
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
      library: { label: "符號庫", href: "/library/" },
      printables: { label: "可列印", href: "/printables/" },
      events: { label: "活動", href: "/events/" },
      search: "搜尋字體樣式…",
      darkMode: "切換深色模式"
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

  if (document.body) {
    initializeSharedHeader();
  } else {
    document.addEventListener("DOMContentLoaded", initializeSharedHeader);
  }
})();
