/* ==========================================================
   symbol-explorer.js
   Shared runtime for UltraTextGen symbol / emoji explorer pages.

   Provides:
     - UltraTextGen.isoToFlag(code)   — ISO alpha-2 → flag emoji
     - UltraTextGen.toast(msg)        — show a brief toast
     - UltraTextGen.copyText(text, el, label) — clipboard helper
     - UltraTextGen.copySymbol(tile)  — copy data-symbol from a tile
     - UltraTextGen.buildGrids(containerId, groups) — build grid UI
     - UltraTextGen.parseTwemoji(root) — safe twemoji parse wrapper
     - Auto-wired delegated click/keyboard for .symbol-tile elements
   ========================================================== */
(function () {
  "use strict";

  var ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================
     Icons (inline SVG strings)
     ============================ */
  var COPY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="20 6 9 17 4 12"/></svg>';

  /* ============================
     UI strings (localized by <html lang>)
     ============================ */
  const UI_STRINGS = {
    en: {
      copied: "Copied: ",
      copyFormat: "Copy Format",
      copyCollection: " Copy Collection",
      copiedBtn: " Copied!",
      formats: { inline: "Inline", vertical: "Vertical", comma: "Comma", space: "Space", bullet: "Bullet" }
    },
    vi: {
      copied: "Đã sao chép: ",
      copyFormat: "Kiểu sao chép",
      copyCollection: " Sao chép cả bộ",
      copiedBtn: " Đã chép!",
      formats: { inline: "Một hàng", vertical: "Dọc", comma: "Dấu phẩy", space: "Cách", bullet: "Gạch đầu dòng" }
    },
    pt: {
      copied: "Copiado: ",
      copyFormat: "Formato de cópia",
      copyCollection: " Copiar coleção",
      copiedBtn: " Copiado!",
      formats: { inline: "Em linha", vertical: "Vertical", comma: "Vírgula", space: "Espaço", bullet: "Lista" }
    },
    es: {
      copied: "Copiado: ",
      copyFormat: "Formato de copia",
      copyCollection: " Copiar colección",
      copiedBtn: " ¡Copiado!",
      formats: { inline: "En línea", vertical: "Vertical", comma: "Coma", space: "Espacio", bullet: "Viñeta" }
    },
    de: {
      copied: "Kopiert: ",
      copyFormat: "Kopierformat",
      copyCollection: " Sammlung kopieren",
      copiedBtn: " Kopiert!",
      formats: { inline: "Inline", vertical: "Vertikal", comma: "Komma", space: "Leerzeichen", bullet: "Aufzählung" }
    },
    id: {
      copied: "Disalin: ",
      copyFormat: "Format Salin",
      copyCollection: " Salin Koleksi",
      copiedBtn: " Tersalin!",
      formats: { inline: "Sebaris", vertical: "Vertikal", comma: "Koma", space: "Spasi", bullet: "Butir" }
    },
    tr: {
      copied: "Kopyalandı: ",
      copyFormat: "Kopyalama Biçimi",
      copyCollection: " Koleksiyonu Kopyala",
      copiedBtn: " Kopyalandı!",
      formats: { inline: "Yan yana", vertical: "Alt alta", comma: "Virgüllü", space: "Boşluklu", bullet: "Maddeli" }
    },
    fr: {
      copied: "Copié : ",
      copyFormat: "Format de copie",
      copyCollection: " Copier la collection",
      copiedBtn: " Copié !",
      formats: { inline: "En ligne", vertical: "Vertical", comma: "Virgules", space: "Espaces", bullet: "Liste" }
    },
    nl: {
      copied: "Gekopieerd: ",
      copyFormat: "Kopieerformaat",
      copyCollection: " Kopieer collectie",
      copiedBtn: " Gekopieerd!",
      formats: { inline: "Op één regel", vertical: "Verticaal", comma: "Komma's", space: "Spaties", bullet: "Lijst" }
    },
    it: {
      copied: "Copiato: ",
      copyFormat: "Formato di copia",
      copyCollection: " Copia collezione",
      copiedBtn: " Copiato!",
      formats: { inline: "In linea", vertical: "Verticale", comma: "Virgola", space: "Spazio", bullet: "Elenco puntato" }
    },
    pl: {
      copied: "Skopiowano: ",
      copyFormat: "Format kopiowania",
      copyCollection: " Kopiuj zestaw",
      copiedBtn: " Skopiowano!",
      formats: { inline: "W linii", vertical: "Pionowo", comma: "Przecinki", space: "Spacje", bullet: "Punktory" }
    },
    th: {
      copied: "คัดลอกแล้ว: ",
      copyFormat: "รูปแบบการคัดลอก",
      copyCollection: " คัดลอกคอลเลกชัน",
      copiedBtn: " คัดลอกแล้ว!",
      formats: { inline: "เรียงบรรทัดเดียว", vertical: "แนวตั้ง", comma: "จุลภาค", space: "เว้นวรรค", bullet: "บุลเล็ต" }
    },
    zh: {
      copied: "已複製：",
      copyFormat: "複製格式",
      copyCollection: " 複製整組",
      copiedBtn: " 已複製！",
      formats: { inline: "單行", vertical: "直式", comma: "逗號", space: "空格", bullet: "項目符號" }
    },
    ko: {
      copied: "복사됨: ",
      copyFormat: "복사 형식",
      copyCollection: " 컬렉션 전체 복사",
      copiedBtn: " 복사됨!",
      formats: { inline: "한 줄로", vertical: "세로로", comma: "쉼표로", space: "공백으로", bullet: "불릿으로" }
    },
    ar: {
      copied: "تم النسخ: ",
      copyFormat: "صيغة النسخ",
      copyCollection: " نسخ المجموعة",
      copiedBtn: " تم النسخ!",
      formats: { inline: "متتالٍ", vertical: "عمودي", comma: "بفواصل", space: "بمسافات", bullet: "نقطي" }
    },
    no: {
      copied: "Kopiert: ",
      copyFormat: "Kopieringsformat",
      copyCollection: " Kopier samling",
      copiedBtn: " Kopiert!",
      formats: { inline: "På linje", vertical: "Vertikalt", comma: "Komma", space: "Mellomrom", bullet: "Punktliste" }
    },
    ja: {
      copied: "コピーしました: ",
      copyFormat: "コピー形式",
      copyCollection: " コレクションをコピー",
      copiedBtn: " コピーしました！",
      formats: { inline: "1行", vertical: "縦並び", comma: "カンマ区切り", space: "スペース区切り", bullet: "箇条書き" }
    },
    ru: {
      copied: "Скопировано: ",
      copyFormat: "Формат копирования",
      copyCollection: " Копировать всё",
      copiedBtn: " Скопировано!",
      formats: { inline: "В строку", vertical: "Столбиком", comma: "Через запятую", space: "Через пробел", bullet: "Список" }
    },
    da: {
      copied: "Kopieret: ",
      copyFormat: "Kopieringsformat",
      copyCollection: " Kopiér samling",
      copiedBtn: " Kopieret!",
      formats: { inline: "På linje", vertical: "Lodret", comma: "Komma", space: "Mellemrum", bullet: "Punktopstilling" }
    },
    sv: {
      copied: "Kopierat: ",
      copyFormat: "Kopieringsformat",
      copyCollection: " Kopiera samling",
      copiedBtn: " Kopierat!",
      formats: { inline: "På rad", vertical: "Vertikalt", comma: "Kommatecken", space: "Mellanslag", bullet: "Punktlista" }
    },
    cs: {
      copied: "Zkopírováno: ",
      copyFormat: "Formát kopírování",
      copyCollection: " Kopírovat kolekci",
      copiedBtn: " Zkopírováno!",
      formats: { inline: "Na řádek", vertical: "Svisle", comma: "Čárky", space: "Mezery", bullet: "Odrážky" }
    },
    sk: {
      copied: "Skopírované: ",
      copyFormat: "Formát kopírovania",
      copyCollection: " Kopírovať kolekciu",
      copiedBtn: " Skopírované!",
      formats: { inline: "Na riadok", vertical: "Zvisle", comma: "Čiarky", space: "Medzery", bullet: "Odrážky" }
    },
    hr: {
      copied: "Kopirano: ",
      copyFormat: "Format kopiranja",
      copyCollection: " Kopiraj zbirku",
      copiedBtn: " Kopirano!",
      formats: { inline: "U nizu", vertical: "Okomito", comma: "Zarezi", space: "Razmaci", bullet: "Popis" }
    },
    bs: {
      copied: "Kopirano: ",
      copyFormat: "Format kopiranja",
      copyCollection: " Kopiraj zbirku",
      copiedBtn: " Kopirano!",
      formats: { inline: "U nizu", vertical: "Okomito", comma: "Zarezi", space: "Razmaci", bullet: "Spisak" }
    },
    sr: {
      copied: "Копирано: ",
      copyFormat: "Формат копирања",
      copyCollection: " Копирај збирку",
      copiedBtn: " Копирано!",
      formats: { inline: "У низу", vertical: "Усправно", comma: "Зарези", space: "Размаци", bullet: "Списак" }
    },
    ro: {
      copied: "Copiat: ",
      copyFormat: "Format de copiere",
      copyCollection: " Copiază colecția",
      copiedBtn: " Copiat!",
      formats: { inline: "Pe un rând", vertical: "Vertical", comma: "Cu virgulă", space: "Cu spațiu", bullet: "Listă" }
    },
    hu: {
      copied: "Másolva: ",
      copyFormat: "Másolási formátum",
      copyCollection: " Gyűjtemény másolása",
      copiedBtn: " Másolva!",
      formats: { inline: "Egy sorban", vertical: "Függőlegesen", comma: "Vesszővel", space: "Szóközzel", bullet: "Felsorolás" }
    },
    hi: {
      copied: "कॉपी हुआ: ",
      copyFormat: "कॉपी फ़ॉर्मैट",
      copyCollection: " पूरा कलेक्शन कॉपी करें",
      copiedBtn: " कॉपी हो गया!",
      formats: { inline: "एक लाइन में", vertical: "ऊपर-नीचे", comma: "कॉमा से", space: "स्पेस से", bullet: "बुलेट में" }
    },
    tl: {
      copied: "Kinopya: ",
      copyFormat: "Format ng Pagkopya",
      copyCollection: " Kopyahin ang Koleksyon",
      copiedBtn: " Nakopya!",
      formats: { inline: "Isang linya", vertical: "Patayo", comma: "Kuwit", space: "Espasyo", bullet: "Bullet" }
    }
  };
  const PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const STR = UI_STRINGS[PAGE_LANG] || UI_STRINGS.en;

  /* ============================
     Toast
     ============================ */
  var toastEl = null;
  var toastTimer = null;

  function getToast() {
    if (!toastEl) toastEl = document.getElementById("symbolToast");
    return toastEl;
  }

  function showToast(msg) {
    var t = getToast();
    if (!t) return;
    t.textContent = STR.copied + msg;
    t.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-visible");
    }, 1000);
  }
  ns.toast = showToast;

  /* ============================
     Clipboard helpers
     ============================ */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }
  ns.fallbackCopy = fallbackCopy;

  function copyText(text, el, label) {
    label = label || text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        feedback(el, label);
      }).catch(function () {
        fallbackCopy(text);
        feedback(el, label);
      });
    } else {
      fallbackCopy(text);
      feedback(el, label);
    }
  }
  ns.copyText = copyText;

  function copySymbol(tile) {
    var symbol = (tile.getAttribute("data-symbol") || "").trim();
    if (!symbol) return;
    copyText(symbol, tile, symbol);
  }
  ns.copySymbol = copySymbol;

  function feedback(el, label) {
    el.classList.add("is-copied");
    setTimeout(function () {
      el.classList.remove("is-copied");
    }, 1000);
    showToast(label);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "copy_text", copy_method: "symbol_tile" });
  }

  /* ============================
     ISO alpha-2 → flag emoji
     ============================ */
  function isoToFlag(code) {
    if (!code) return "";
    var cc = String(code).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return "";
    var base = 0x1F1E6;
    return String.fromCodePoint(
      base + (cc.charCodeAt(0) - 65),
      base + (cc.charCodeAt(1) - 65)
    );
  }
  ns.isoToFlag = isoToFlag;

  /* ============================
     Twemoji wrapper
     ============================ */
  function parseTwemoji(root) {
    if (typeof twemoji !== "undefined") {
      twemoji.parse(root || document.body, { folder: "svg", ext: ".svg" });
    }
  }
  ns.parseTwemoji = parseTwemoji;

  /* ============================
     Format helpers
     ============================ */
  var FORMATS = [
    { id: "inline",   label: "Inline" },
    { id: "vertical", label: "Vertical" },
    { id: "comma",    label: "Comma" },
    { id: "space",    label: "Space" },
    { id: "bullet",   label: "Bullet" }
  ];

  function formatItems(items, formatId) {
    switch (formatId) {
      case "vertical": return items.join("\n");
      case "comma":    return items.join(", ");
      case "space":    return items.join(" ");
      case "bullet":   return items.map(function (f) { return "• " + f; }).join("\n");
      default:         return items.join(" "); // inline
    }
  }
  ns.formatItems = formatItems;

  /* ============================
     Build grid UI
     Call:  UltraTextGen.buildGrids("containerId", groups)
     where groups = [{ name: "EU", flags: ["🇦🇹", …] }, …]
     ============================ */
  function buildGrids(containerId, groups) {
    var container = document.getElementById(containerId);
    if (!container) return;

   var activeFormats = groups.map(function (g) {
     return (g && g.defaultFormat) ? g.defaultFormat : "vertical";
   });

    groups.forEach(function (group, gi) {
      var defaultFormat = activeFormats[gi];
      var section = document.createElement("div");
      section.className = "mood-explainer flag-grid-section";

      /* Title */
      var h3 = document.createElement("h3");
      h3.textContent = group.name;
      section.appendChild(h3);

      /* Browse grid (static) */
      var grid = document.createElement("div");
      grid.className = "flag-grid-display";
      grid.textContent = group.flags.join(" ");
      section.appendChild(grid);

      /* Format selector */
      var selWrap = document.createElement("div");
      selWrap.className = "format-selector";

      var selLabel = document.createElement("div");
      selLabel.className = "format-selector-label";
      selLabel.textContent = STR.copyFormat;
      selWrap.appendChild(selLabel);

      var tabs = document.createElement("div");
      tabs.className = "format-tabs";

      FORMATS.forEach(function (fmt, fi) {
        var tab = document.createElement("button");
         tab.className = "format-tab" + (fmt.id === defaultFormat ? " active" : "");
        tab.setAttribute("data-format", fmt.id);
        tab.setAttribute("data-group", gi);
        tab.textContent = STR.formats[fmt.id] || fmt.label;
        tabs.appendChild(tab);
      });

      selWrap.appendChild(tabs);
      section.appendChild(selWrap);

      /* Preview */
      var preview = document.createElement("div");
      preview.className = "format-preview";
      preview.id = "preview-" + gi;
      preview.textContent = formatItems(group.flags, defaultFormat);
      section.appendChild(preview);

      /* Copy button */
      var copyBtn = document.createElement("button");
      copyBtn.className = "copy-collection-btn";
      copyBtn.id = "copyBtn-" + gi;
      copyBtn.setAttribute("data-group", gi);
      copyBtn.innerHTML = COPY_ICON + STR.copyCollection;
      section.appendChild(copyBtn);

      container.appendChild(section);
    });

    /* Delegated events for this container */
    container.addEventListener("click", function (e) {
      /* Format tab */
      var tab = e.target.closest(".format-tab");
      if (tab) {
        var gi = parseInt(tab.getAttribute("data-group"), 10);
        var fmt = tab.getAttribute("data-format");
        activeFormats[gi] = fmt;

        tab.parentNode.querySelectorAll(".format-tab").forEach(function (s) {
          s.classList.remove("active");
        });
        tab.classList.add("active");

        var preview = document.getElementById("preview-" + gi);
        preview.textContent = formatItems(groups[gi].flags, fmt);
        parseTwemoji(preview);
        return;
      }

      /* Copy button */
      var btn = e.target.closest(".copy-collection-btn");
      if (btn) {
        var gi2 = parseInt(btn.getAttribute("data-group"), 10);
        var text = formatItems(groups[gi2].flags, activeFormats[gi2]);

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyCollectionFeedback(btn);
          }).catch(function () {
            fallbackCopy(text);
            copyCollectionFeedback(btn);
          });
        } else {
          fallbackCopy(text);
          copyCollectionFeedback(btn);
        }

        showToast(groups[gi2].flags[0] + "…");
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "copy_text", copy_method: "grid_collection" });
      }
    });
  }
  ns.buildGrids = buildGrids;

  function copyCollectionFeedback(btn) {
    btn.classList.add("is-copied");
    btn.innerHTML = CHECK_ICON + STR.copiedBtn;
    setTimeout(function () {
      btn.classList.remove("is-copied");
      btn.innerHTML = COPY_ICON + STR.copyCollection;
    }, 1500);
  }

  /* ============================
     Auto-wire: delegated click / keyboard for .symbol-tile
     ============================ */
  document.addEventListener("click", function (e) {
    var tile = e.target.closest(".symbol-tile");
    if (tile) copySymbol(tile);
  });

  /* ============================
     Auto-wire: per-piece copy buttons on multi-line ASCII art pages.
     A .art-piece-copy button copies the whitespace-preserved text of the
     <pre class="art-piece-pre"> inside the same .art-piece-card.
     ============================ */
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".art-piece-copy");
    if (!btn) return;
    const card = btn.closest(".art-piece-card");
    const pre = card ? card.querySelector(".art-piece-pre") : null;
    if (!pre) return;
    const label = btn.getAttribute("data-label") || "ASCII art";
    copyText(pre.textContent.replace(/\s+$/, ""), btn, label);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var tile = e.target.closest(".symbol-tile");
    if (!tile) return;
    e.preventDefault();
    copySymbol(tile);
  });

})();
