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
     - UltraTextGen.decorateSymbolActions() — (re)attach Save/Share to tiles
     - Auto-wired delegated click/keyboard for .symbol-tile elements
     - Auto-wired Save star per tile, Share + Share-as-image per section,
       a saved-symbols strip, and the incoming ?symbol= deep link. These
       need /js/saved/saved-items.js and /js/share/share-core.js on the
       page and no-op without them.
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
      save: "Save",
      saved: "Saved",
      share: "Share",
      shareImage: "Share as an image",
      clearAll: "Clear all",
      copyLabel: "Copy",
      formats: { inline: "Inline", vertical: "Vertical", comma: "Comma", space: "Space", bullet: "Bullet" }
    },
    vi: {
      copied: "Đã sao chép: ",
      copyFormat: "Kiểu sao chép",
      copyCollection: " Sao chép cả bộ",
      copiedBtn: " Đã chép!",
      save: "Lưu",
      saved: "Đã lưu",
      share: "Chia sẻ",
      shareImage: "Chia sẻ dưới dạng ảnh",
      clearAll: "Xóa tất cả",
      copyLabel: "Sao chép",
      formats: { inline: "Một hàng", vertical: "Dọc", comma: "Dấu phẩy", space: "Cách", bullet: "Gạch đầu dòng" }
    },
    pt: {
      copied: "Copiado: ",
      copyFormat: "Formato de cópia",
      copyCollection: " Copiar coleção",
      copiedBtn: " Copiado!",
      save: "Salvar",
      saved: "Salvo",
      share: "Compartilhar",
      shareImage: "Compartilhar como imagem",
      clearAll: "Limpar tudo",
      copyLabel: "Copiar",
      formats: { inline: "Em linha", vertical: "Vertical", comma: "Vírgula", space: "Espaço", bullet: "Lista" }
    },
    es: {
      copied: "Copiado: ",
      copyFormat: "Formato de copia",
      copyCollection: " Copiar colección",
      copiedBtn: " ¡Copiado!",
      save: "Guardar",
      saved: "Guardado",
      share: "Compartir",
      shareImage: "Compartir como imagen",
      clearAll: "Borrar todo",
      copyLabel: "Copiar",
      formats: { inline: "En línea", vertical: "Vertical", comma: "Coma", space: "Espacio", bullet: "Viñeta" }
    },
    de: {
      copied: "Kopiert: ",
      copyFormat: "Kopierformat",
      copyCollection: " Sammlung kopieren",
      copiedBtn: " Kopiert!",
      save: "Speichern",
      saved: "Gespeichert",
      share: "Teilen",
      shareImage: "Als Bild teilen",
      clearAll: "Alle löschen",
      copyLabel: "Kopieren",
      formats: { inline: "Inline", vertical: "Vertikal", comma: "Komma", space: "Leerzeichen", bullet: "Aufzählung" }
    },
    id: {
      copied: "Disalin: ",
      copyFormat: "Format Salin",
      copyCollection: " Salin Koleksi",
      copiedBtn: " Tersalin!",
      save: "Simpan",
      saved: "Tersimpan",
      share: "Bagikan",
      shareImage: "Bagikan sebagai gambar",
      clearAll: "Hapus semua",
      copyLabel: "Salin",
      formats: { inline: "Sebaris", vertical: "Vertikal", comma: "Koma", space: "Spasi", bullet: "Butir" }
    },
    tr: {
      copied: "Kopyalandı: ",
      copyFormat: "Kopyalama Biçimi",
      copyCollection: " Koleksiyonu Kopyala",
      copiedBtn: " Kopyalandı!",
      save: "Kaydet",
      saved: "Kaydedildi",
      share: "Paylaş",
      shareImage: "Görsel olarak paylaş",
      clearAll: "Tümünü temizle",
      copyLabel: "Kopyala",
      formats: { inline: "Yan yana", vertical: "Alt alta", comma: "Virgüllü", space: "Boşluklu", bullet: "Maddeli" }
    },
    fr: {
      copied: "Copié : ",
      copyFormat: "Format de copie",
      copyCollection: " Copier la collection",
      copiedBtn: " Copié !",
      save: "Enregistrer",
      saved: "Enregistré",
      share: "Partager",
      shareImage: "Partager en image",
      clearAll: "Tout effacer",
      copyLabel: "Copier",
      formats: { inline: "En ligne", vertical: "Vertical", comma: "Virgules", space: "Espaces", bullet: "Liste" }
    },
    nl: {
      copied: "Gekopieerd: ",
      copyFormat: "Kopieerformaat",
      copyCollection: " Kopieer collectie",
      copiedBtn: " Gekopieerd!",
      save: "Bewaar",
      saved: "Bewaard",
      share: "Delen",
      shareImage: "Delen als afbeelding",
      clearAll: "Alles wissen",
      copyLabel: "Kopieer",
      formats: { inline: "Op één regel", vertical: "Verticaal", comma: "Komma's", space: "Spaties", bullet: "Lijst" }
    },
    it: {
      copied: "Copiato: ",
      copyFormat: "Formato di copia",
      copyCollection: " Copia collezione",
      copiedBtn: " Copiato!",
      save: "Salva",
      saved: "Salvato",
      share: "Condividi",
      shareImage: "Condividi come immagine",
      clearAll: "Cancella tutto",
      copyLabel: "Copia",
      formats: { inline: "In linea", vertical: "Verticale", comma: "Virgola", space: "Spazio", bullet: "Elenco puntato" }
    },
    pl: {
      copied: "Skopiowano: ",
      copyFormat: "Format kopiowania",
      copyCollection: " Kopiuj zestaw",
      copiedBtn: " Skopiowano!",
      save: "Zapisz",
      saved: "Zapisano",
      share: "Udostępnij",
      shareImage: "Udostępnij jako obraz",
      clearAll: "Wyczyść wszystko",
      copyLabel: "Kopiuj",
      formats: { inline: "W linii", vertical: "Pionowo", comma: "Przecinki", space: "Spacje", bullet: "Punktory" }
    },
    th: {
      copied: "คัดลอกแล้ว: ",
      copyFormat: "รูปแบบการคัดลอก",
      copyCollection: " คัดลอกคอลเลกชัน",
      copiedBtn: " คัดลอกแล้ว!",
      save: "บันทึก",
      saved: "บันทึกแล้ว",
      share: "แชร์",
      shareImage: "แชร์เป็นรูปภาพ",
      clearAll: "ล้างทั้งหมด",
      copyLabel: "คัดลอก",
      formats: { inline: "เรียงบรรทัดเดียว", vertical: "แนวตั้ง", comma: "จุลภาค", space: "เว้นวรรค", bullet: "บุลเล็ต" }
    },
    zh: {
      copied: "已複製：",
      copyFormat: "複製格式",
      copyCollection: " 複製整組",
      copiedBtn: " 已複製！",
      save: "儲存",
      saved: "已儲存",
      share: "分享",
      shareImage: "以圖片分享",
      clearAll: "全部清除",
      copyLabel: "複製",
      formats: { inline: "單行", vertical: "直式", comma: "逗號", space: "空格", bullet: "項目符號" }
    },
    ko: {
      copied: "복사됨: ",
      copyFormat: "복사 형식",
      copyCollection: " 컬렉션 전체 복사",
      copiedBtn: " 복사됨!",
      save: "저장",
      saved: "저장됨",
      share: "공유",
      shareImage: "이미지로 공유",
      clearAll: "모두 지우기",
      copyLabel: "복사",
      formats: { inline: "한 줄로", vertical: "세로로", comma: "쉼표로", space: "공백으로", bullet: "불릿으로" }
    },
    ar: {
      copied: "تم النسخ: ",
      copyFormat: "صيغة النسخ",
      copyCollection: " نسخ المجموعة",
      copiedBtn: " تم النسخ!",
      save: "حفظ",
      saved: "تم الحفظ",
      share: "مشاركة",
      shareImage: "مشاركة كصورة",
      clearAll: "مسح الكل",
      copyLabel: "نسخ",
      formats: { inline: "متتالٍ", vertical: "عمودي", comma: "بفواصل", space: "بمسافات", bullet: "نقطي" }
    },
    no: {
      copied: "Kopiert: ",
      copyFormat: "Kopieringsformat",
      copyCollection: " Kopier samling",
      copiedBtn: " Kopiert!",
      save: "Lagre",
      saved: "Lagret",
      share: "Del",
      shareImage: "Del som bilde",
      clearAll: "Fjern alle",
      copyLabel: "Kopier",
      formats: { inline: "På linje", vertical: "Vertikalt", comma: "Komma", space: "Mellomrom", bullet: "Punktliste" }
    },
    ja: {
      copied: "コピーしました: ",
      copyFormat: "コピー形式",
      copyCollection: " コレクションをコピー",
      copiedBtn: " コピーしました！",
      save: "保存",
      saved: "保存済み",
      share: "共有",
      shareImage: "画像として共有",
      clearAll: "すべて削除",
      copyLabel: "コピー",
      formats: { inline: "1行", vertical: "縦並び", comma: "カンマ区切り", space: "スペース区切り", bullet: "箇条書き" }
    },
    ru: {
      copied: "Скопировано: ",
      copyFormat: "Формат копирования",
      copyCollection: " Копировать всё",
      copiedBtn: " Скопировано!",
      save: "Сохранить",
      saved: "Сохранено",
      share: "Поделиться",
      shareImage: "Поделиться картинкой",
      clearAll: "Очистить всё",
      copyLabel: "Копировать",
      formats: { inline: "В строку", vertical: "Столбиком", comma: "Через запятую", space: "Через пробел", bullet: "Список" }
    },
    da: {
      copied: "Kopieret: ",
      copyFormat: "Kopieringsformat",
      copyCollection: " Kopiér samling",
      copiedBtn: " Kopieret!",
      save: "Gem",
      saved: "Gemt",
      share: "Del",
      shareImage: "Del som billede",
      clearAll: "Ryd alle",
      copyLabel: "Kopiér",
      formats: { inline: "På linje", vertical: "Lodret", comma: "Komma", space: "Mellemrum", bullet: "Punktopstilling" }
    },
    sv: {
      copied: "Kopierat: ",
      copyFormat: "Kopieringsformat",
      copyCollection: " Kopiera samling",
      copiedBtn: " Kopierat!",
      save: "Spara",
      saved: "Sparad",
      share: "Dela",
      shareImage: "Dela som bild",
      clearAll: "Rensa allt",
      copyLabel: "Kopiera",
      formats: { inline: "På rad", vertical: "Vertikalt", comma: "Kommatecken", space: "Mellanslag", bullet: "Punktlista" }
    },
    cs: {
      copied: "Zkopírováno: ",
      copyFormat: "Formát kopírování",
      copyCollection: " Kopírovat kolekci",
      copiedBtn: " Zkopírováno!",
      save: "Uložit",
      saved: "Uloženo",
      share: "Sdílet",
      shareImage: "Sdílet jako obrázek",
      clearAll: "Vymazat vše",
      copyLabel: "Kopírovat",
      formats: { inline: "Na řádek", vertical: "Svisle", comma: "Čárky", space: "Mezery", bullet: "Odrážky" }
    },
    sk: {
      copied: "Skopírované: ",
      copyFormat: "Formát kopírovania",
      copyCollection: " Kopírovať kolekciu",
      copiedBtn: " Skopírované!",
      save: "Uložiť",
      saved: "Uložené",
      share: "Zdieľať",
      shareImage: "Zdieľať ako obrázok",
      clearAll: "Vymazať všetko",
      copyLabel: "Kopírovať",
      formats: { inline: "Na riadok", vertical: "Zvisle", comma: "Čiarky", space: "Medzery", bullet: "Odrážky" }
    },
    hr: {
      copied: "Kopirano: ",
      copyFormat: "Format kopiranja",
      copyCollection: " Kopiraj zbirku",
      copiedBtn: " Kopirano!",
      save: "Spremi",
      saved: "Spremljeno",
      share: "Podijeli",
      shareImage: "Podijeli kao sliku",
      clearAll: "Obriši sve",
      copyLabel: "Kopiraj",
      formats: { inline: "U nizu", vertical: "Okomito", comma: "Zarezi", space: "Razmaci", bullet: "Popis" }
    },
    bs: {
      copied: "Kopirano: ",
      copyFormat: "Format kopiranja",
      copyCollection: " Kopiraj zbirku",
      copiedBtn: " Kopirano!",
      save: "Sačuvaj",
      saved: "Sačuvano",
      share: "Podijeli",
      shareImage: "Podijeli kao sliku",
      clearAll: "Obriši sve",
      copyLabel: "Kopiraj",
      formats: { inline: "U nizu", vertical: "Okomito", comma: "Zarezi", space: "Razmaci", bullet: "Spisak" }
    },
    sr: {
      copied: "Копирано: ",
      copyFormat: "Формат копирања",
      copyCollection: " Копирај збирку",
      copiedBtn: " Копирано!",
      save: "Sačuvaj",
      saved: "Sačuvano",
      share: "Podeli",
      shareImage: "Podeli kao sliku",
      clearAll: "Obriši sve",
      copyLabel: "Kopiraj",
      formats: { inline: "У низу", vertical: "Усправно", comma: "Зарези", space: "Размаци", bullet: "Списак" }
    },
    ro: {
      copied: "Copiat: ",
      copyFormat: "Format de copiere",
      copyCollection: " Copiază colecția",
      copiedBtn: " Copiat!",
      save: "Salvează",
      saved: "Salvat",
      share: "Distribuie",
      shareImage: "Distribuie ca imagine",
      clearAll: "Șterge tot",
      copyLabel: "Copiază",
      formats: { inline: "Pe un rând", vertical: "Vertical", comma: "Cu virgulă", space: "Cu spațiu", bullet: "Listă" }
    },
    hu: {
      copied: "Másolva: ",
      copyFormat: "Másolási formátum",
      copyCollection: " Gyűjtemény másolása",
      copiedBtn: " Másolva!",
      save: "Mentés",
      saved: "Mentve",
      share: "Megosztás",
      shareImage: "Megosztás képként",
      clearAll: "Összes törlése",
      copyLabel: "Másolás",
      formats: { inline: "Egy sorban", vertical: "Függőlegesen", comma: "Vesszővel", space: "Szóközzel", bullet: "Felsorolás" }
    },
    hi: {
      copied: "कॉपी हुआ: ",
      copyFormat: "कॉपी फ़ॉर्मैट",
      copyCollection: " पूरा कलेक्शन कॉपी करें",
      copiedBtn: " कॉपी हो गया!",
      save: "सेव",
      saved: "सेव हो गया",
      share: "शेयर",
      shareImage: "छवि के रूप में साझा करें",
      clearAll: "सभी हटाएं",
      copyLabel: "कॉपी",
      formats: { inline: "एक लाइन में", vertical: "ऊपर-नीचे", comma: "कॉमा से", space: "स्पेस से", bullet: "बुलेट में" }
    },
    tl: {
      copied: "Kinopya: ",
      copyFormat: "Format ng Pagkopya",
      copyCollection: " Kopyahin ang Koleksyon",
      copiedBtn: " Nakopya!",
      save: "I-save",
      saved: "Na-save",
      share: "I-share",
      shareImage: "Ibahagi bilang larawan",
      clearAll: "I-clear lahat",
      copyLabel: "Kopyahin",
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

  /* ============================
     SAVE / SHARE  (added 2026-09-05)

     Library and symbol pages carry 34% of every copy on the site and had
     none of the three actions that follow a copy: no Save, no Share, no
     Share-as-image. Not a design decision — Save's data model could only
     describe a font style, and the share core was private to script.js.
     Both are now shared modules (/js/saved/saved-items.js,
     /js/share/share-core.js) and this block is their first second caller.

     The tiles themselves are static HTML, written into 1,651 pages by the
     page generators. Nothing here edits that markup: the affordances are
     attached at runtime to what the page already renders, so the crawlable
     content of every one of those pages is untouched.

     Every string is read from window.UTG_I18N (see i18n.js) and reuses a
     key the site already ships translated for all 29 locales. Nothing here
     invents a translation, which is why the saved strip is headed with the
     one-word copyButtons.saved rather than a new "Your saved symbols".
     ============================ */

  const UTGX = window.UltraTextGen;

  /* String lookup for the runtime-injected controls.
     STR (this file's own 28-locale table, kept in agreement with
     locales/<lang>.json by scripts/sync-explorer-strings.js) is the source,
     because these pages deliberately do not load i18n.js — a ~30KB locale
     fetch on the site's highest-traffic lane, to read five short strings, is
     not a trade worth making. The 19 pages that DO load it (the zh-tw set)
     still win, so a page carrying a fresher translation is never overridden
     by a stale table. */
  function t(key, fallback) {
    const i18n = window.UTG_I18N;
    const fromFetch = i18n && i18n.ui && I18N_PATHS[key]
      ? I18N_PATHS[key].split(".").reduce(function (acc, k) {
          return acc != null ? acc[k] : undefined;
        }, i18n.ui)
      : undefined;
    if (fromFetch != null && fromFetch !== "") return fromFetch;
    if (STR[key] != null && STR[key] !== "") return STR[key];
    return fallback;
  }

  /* Where each key lives in a fetched locales/<lang>.json, for the pages that
     have one. Mirrors KEYS in scripts/sync-explorer-strings.js. */
  const I18N_PATHS = {
    save: "copyButtons.save",
    saved: "copyButtons.saved",
    share: "shareResult.label",
    shareImage: "shareResult.imageTitle",
    clearAll: "savedStyles.clearAll",
    copyLabel: "copyButtons.copy"
  };

  const STAR_OUTLINE = "☆";
  const STAR_FILLED = "★";

  /* The name a page gives a tile. The visible .flag-label is authoritative
     (it is what the reader sees and what the locale pages translate); the
     aria-label is the fallback, with its leading "Copy " verb dropped. */
  function tileLabel(tile) {
    const row = tile.closest(".flag-row");
    const label = row ? row.querySelector(".flag-label") : null;
    if (label && label.textContent.trim()) return label.textContent.trim();
    const aria = (tile.getAttribute("aria-label") || "").trim();
    return aria.replace(/^Copy\s+/i, "") || (tile.getAttribute("data-symbol") || "").trim();
  }

  function symbolOf(tile) {
    return (tile.getAttribute("data-symbol") || "").trim();
  }

  function pageUrl(params) {
    const url = window.location.origin + window.location.pathname;
    return params ? url + "?" + params : url;
  }

  /* A shared symbol link opens the page with that tile marked. Mirrors the
     generator's ?style= deep link, which share-core.js already owns. */
  function symbolShareUrl(symbol) {
    return pageUrl("symbol=" + encodeURIComponent(symbol));
  }

  /* ---- per-tile Save ----------------------------------------------- */

  function isSavedSymbol(symbol) {
    return !!(UTGX.saved && UTGX.saved.has("symbol", symbol));
  }

  function paintSaveBtn(btn, saved) {
    btn.textContent = saved ? STAR_FILLED : STAR_OUTLINE;
    btn.classList.toggle("is-saved", saved);
    btn.setAttribute("aria-pressed", saved ? "true" : "false");
    btn.title = saved ? t("saved", "Saved") : t("save", "Save");
  }

  /* Attach a star to every grid tile that does not have one. Idempotent, so
     it can run again after a page builds more grids at runtime. Scoped to
     .flag-row on purpose: .copy-cell tiles are table cells inside reference
     tables, where a floating star would sit on top of the text. */
  function decorateTiles(root) {
    if (!UTGX.saved) return;
    const rows = (root || document).querySelectorAll(".flag-row");
    Array.prototype.forEach.call(rows, function (row) {
      const tile = row.querySelector(".symbol-tile");
      if (!tile || row.querySelector(".symbol-save-btn")) return;
      const symbol = symbolOf(tile);
      if (!symbol) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "symbol-save-btn";
      btn.setAttribute("data-symbol", symbol);
      btn.setAttribute("aria-label", t("save", "Save") + " " + tileLabel(tile));
      paintSaveBtn(btn, isSavedSymbol(symbol));
      row.insertBefore(btn, row.firstChild);
      row.classList.add("has-symbol-actions");
    });
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".symbol-save-btn");
    if (!btn || !UTGX.saved) return;
    e.stopPropagation(); // the row's tile is a copy target; the star is not
    const symbol = btn.getAttribute("data-symbol");
    const row = btn.closest(".flag-row");
    const tile = row ? row.querySelector(".symbol-tile") : null;
    const nowSaved = UTGX.saved.toggle({
      type: "symbol",
      value: symbol,
      label: tile ? tileLabel(tile) : symbol,
      href: window.location.pathname
    });
    if (nowSaved === null) return;
    paintSaveBtn(btn, nowSaved);
  });

  /* ---- the saved strip --------------------------------------------- */

  /* Rendered above the page's first tile section, and only when the device
     has saved symbols — an empty strip on every library page would be
     furniture, not a feature. */
  function savedHost() {
    const first = document.querySelector(".flag-rows, .symbol-grid, #libDirectory");
    if (!first) return null;
    const anchor = first.closest("section") || first;
    let strip = document.getElementById("symbolSavedStrip");
    if (strip) return strip;
    strip = document.createElement("section");
    strip.id = "symbolSavedStrip";
    strip.className = "symbol-saved-strip";
    strip.hidden = true;
    anchor.parentNode.insertBefore(strip, anchor);
    return strip;
  }

  function renderSavedStrip() {
    if (!UTGX.saved) return;
    const strip = savedHost();
    if (!strip) return;
    const items = UTGX.saved.all("symbol");
    if (!items.length) {
      strip.hidden = true;
      strip.innerHTML = "";
      return;
    }

    const joined = items.map(function (r) { return r.value; }).join(" ");
    strip.hidden = false;
    strip.innerHTML = "";

    const head = document.createElement("div");
    head.className = "symbol-saved-head";
    const title = document.createElement("h2");
    title.className = "symbol-saved-title";
    title.textContent = STAR_FILLED + " " + t("saved", "Saved") + " (" + items.length + ")";
    head.appendChild(title);

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "symbol-saved-clear";
    clear.textContent = t("clearAll", "Clear all");
    clear.addEventListener("click", function () {
      UTGX.saved.clear("symbol");
      decorateTiles();
      document.querySelectorAll(".symbol-save-btn").forEach(function (b) {
        paintSaveBtn(b, isSavedSymbol(b.getAttribute("data-symbol")));
      });
    });
    head.appendChild(clear);
    strip.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "symbol-saved-grid flag-rows";
    items.forEach(function (r) {
      const row = document.createElement("div");
      row.className = "flag-row";
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "flag-emoji symbol-tile";
      tile.setAttribute("data-symbol", r.value);
      tile.setAttribute("aria-label", t("copyLabel", "Copy") + " " + (r.label || r.value));
      tile.textContent = r.value;
      const cap = document.createElement("span");
      cap.className = "flag-label";
      cap.textContent = r.label || r.value;
      row.appendChild(tile);
      row.appendChild(cap);
      grid.appendChild(row);
    });
    strip.appendChild(grid);

    /* Copy / Share / Share-as-image for the saved set as a whole. The set is
       the shareable unit here: a shortlist someone assembled is worth more to
       a recipient than any one glyph out of it. */
    const actions = document.createElement("div");
    actions.className = "symbol-saved-actions";

    const copyAll = document.createElement("button");
    copyAll.type = "button";
    copyAll.className = "copy-collection-btn";
    copyAll.textContent = (STR.copyCollection || " Copy Collection").trim();
    copyAll.addEventListener("click", function () {
      copyText(joined, copyAll, joined);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "copy_text", copy_method: "saved_collection" });
    });
    actions.appendChild(copyAll);

    if (UTGX.buildShareActions) {
      actions.appendChild(UTGX.buildShareActions({
        text: joined,
        input: joined,
        name: t("saved", "Saved"),
        url: pageUrl(),
        surface: "library_saved",
        itemType: "collection",
        // These pages carry no window.UTG_I18N, so the share core's own
        // lookup would fall back to English under localized prose. Hand it
        // this file's table instead.
        label: t("share", "Share"),
        imageTitle: t("shareImage", "Share as an image")
      }));
    }
    strip.appendChild(actions);
    decorateTiles(strip);
  }

  /* ---- per-section Share ------------------------------------------- */

  /* One Share pair per tile section, carrying that section's symbols. Placed
     next to the collection's own copy control so the four actions read as one
     set, which is the whole point of the rollout. */
  function decorateSections() {
    if (!UTGX.buildShareActions) return;
    const groups = document.querySelectorAll(".flag-rows");
    Array.prototype.forEach.call(groups, function (group) {
      if (group.closest(".symbol-saved-strip")) return;      // its own row exists
      if (group.parentNode.querySelector(".symbol-section-actions")) return;

      const tiles = group.querySelectorAll(".symbol-tile[data-symbol]");
      if (tiles.length < 2) return;   // a lone tile shares fine on its own
      const symbols = Array.prototype.map.call(tiles, symbolOf).filter(Boolean).join(" ");
      if (!symbols) return;

      const section = group.closest("section");
      const heading = section ? section.querySelector("h2, h3") : null;
      const name = heading ? heading.textContent.trim() : document.title;

      const wrap = document.createElement("div");
      wrap.className = "symbol-section-actions";
      wrap.appendChild(UTGX.buildShareActions({
        text: symbols,
        input: symbols,
        name: name,
        url: section && section.id ? pageUrl() + "#" + section.id : pageUrl(),
        surface: "library_section",
        itemType: "collection",
        label: t("share", "Share"),
        imageTitle: t("shareImage", "Share as an image")
      }));
      group.parentNode.insertBefore(wrap, group.nextSibling);
    });
  }

  /* ---- incoming ?symbol= link -------------------------------------- */

  /* The recipient of a shared symbol link lands with that tile marked and
     scrolled to, the same courtesy the generator extends to ?style=. */
  function revealSharedSymbol() {
    let wanted;
    try {
      wanted = new URLSearchParams(window.location.search).get("symbol");
    } catch (e) {
      return;
    }
    if (!wanted) return;
    const tiles = document.querySelectorAll(".symbol-tile[data-symbol]");
    for (let i = 0; i < tiles.length; i++) {
      if (symbolOf(tiles[i]) !== wanted) continue;
      const row = tiles[i].closest(".flag-row") || tiles[i];
      row.classList.add("is-shared-symbol");
      if (row.scrollIntoView) {
        setTimeout(function () { row.scrollIntoView({ block: "center", behavior: "smooth" }); }, 150);
      }
      return;
    }
  }

  /* ---- boot --------------------------------------------------------- */

  function initSaveShare() {
    decorateTiles();
    decorateSections();
    renderSavedStrip();
    revealSharedSymbol();
  }

  document.addEventListener("utg:savedchange", renderSavedStrip);
  // i18n.js resolves its locale fetch after this file runs, so every label
  // injected above is re-read once it lands. Without this a Korean library
  // page would show Korean prose with English buttons on it — the exact bug
  // i18n.js's own comment records for the shadow locales.
  document.addEventListener("utg:i18nready", function () {
    document.querySelectorAll(".symbol-save-btn").forEach(function (b) {
      paintSaveBtn(b, isSavedSymbol(b.getAttribute("data-symbol")));
      // Re-read the row's own label rather than falling back to the raw
      // glyph: "Save Black Star" is the announcement, not "Save ★".
      const row = b.closest(".flag-row");
      const tile = row ? row.querySelector(".symbol-tile") : null;
      b.setAttribute("aria-label", t("save", "Save") + " " + (tile ? tileLabel(tile) : b.getAttribute("data-symbol")));
    });
    renderSavedStrip();
  });

  /* Wait for DOMContentLoaded rather than only for "loading".
     This file and the two modules it depends on are all `defer`, and every
     deferred script runs BEFORE DOMContentLoaded fires. During this file's
     own execution readyState is already "interactive", so a `=== "loading"`
     guard runs init immediately — at which point share-core.js and
     saved-items.js, which the injector places after this tag, have not
     executed yet, UltraTextGen.saved is undefined, and every attach silently
     no-ops. That was the first draft, and it shipped zero Save buttons.
     Keying on "complete" instead makes the wiring independent of tag order. */
  if (document.readyState === "complete") {
    initSaveShare();
  } else {
    document.addEventListener("DOMContentLoaded", initSaveShare);
  }

  ns.decorateSymbolActions = initSaveShare;

})();
