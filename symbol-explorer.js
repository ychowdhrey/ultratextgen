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
  /* @collection-grid-icons:begin */
  var COPY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="20 6 9 17 4 12"/></svg>';
  /* @collection-grid-icons:end */

  /* ============================
     UI strings (localized by <html lang>)
     ============================ */
  /* @collection-grid-strings:begin */
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
      linkCopied: "Link copied",
      failed: "✗ Failed",
      clearAll: "Clear all",
      copyLabel: "Copy",
      selectImage: "Select and share image",
      viewSelection: "View selection ({n})",
      lookPlain: "Copy plain version",
      lookEmoji: "Copy emoji version",
      lookNote: "Some apps show it in colour anyway.",
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
      selectImage: "Chọn và chia sẻ ảnh",
      viewSelection: "Xem lựa chọn ({n})",
      lookPlain: "Sao chép bản thường",
      lookEmoji: "Sao chép bản emoji",
      lookNote: "Một số ứng dụng vẫn hiển thị có màu.",
      linkCopied: "Đã sao chép liên kết",
      failed: "✗ Thất bại",
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
      selectImage: "Selecionar e compartilhar imagem",
      viewSelection: "Ver seleção ({n})",
      lookPlain: "Copiar versão simples",
      lookEmoji: "Copiar versão emoji",
      lookNote: "Alguns apps mostram em cores mesmo assim.",
      linkCopied: "Link copiado",
      failed: "✗ Falhou",
      formats: { inline: "Em linha", vertical: "Na vertical", comma: "Vírgula", space: "Espaço", bullet: "Lista" }
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
      selectImage: "Seleccionar y compartir imagen",
      viewSelection: "Ver selección ({n})",
      lookPlain: "Copiar versión simple",
      lookEmoji: "Copiar versión emoji",
      lookNote: "Algunas apps lo muestran en color de todos modos.",
      linkCopied: "Enlace copiado",
      failed: "✗ Falló",
      formats: { inline: "En línea", vertical: "En vertical", comma: "Coma", space: "Espacio", bullet: "Viñeta" }
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
      selectImage: "Auswählen und als Bild teilen",
      viewSelection: "Auswahl ansehen ({n})",
      lookPlain: "Schlichte Version kopieren",
      lookEmoji: "Emoji-Version kopieren",
      lookNote: "Manche Apps zeigen das Symbol trotzdem farbig.",
      linkCopied: "Link kopiert",
      failed: "✗ Fehlgeschlagen",
      formats: { inline: "Nebeneinander", vertical: "Vertikal", comma: "Komma", space: "Leerzeichen", bullet: "Aufzählung" }
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
      selectImage: "Pilih dan bagikan gambar",
      viewSelection: "Lihat pilihan ({n})",
      lookPlain: "Salin versi polos",
      lookEmoji: "Salin versi emoji",
      lookNote: "Beberapa aplikasi tetap menampilkannya berwarna.",
      linkCopied: "Tautan disalin",
      failed: "✗ Gagal",
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
      selectImage: "Seç ve görsel olarak paylaş",
      viewSelection: "Seçimi gör ({n})",
      lookPlain: "Düz sürümü kopyala",
      lookEmoji: "Emoji sürümünü kopyala",
      lookNote: "Bazı uygulamalar yine de renkli gösterir.",
      linkCopied: "Bağlantı kopyalandı",
      failed: "✗ Başarısız",
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
      selectImage: "Choisir et partager en image",
      viewSelection: "Voir la sélection ({n})",
      lookPlain: "Copier la version simple",
      lookEmoji: "Copier la version emoji",
      lookNote: "Certaines applis l’affichent quand même en couleur.",
      linkCopied: "Lien copié",
      failed: "✗ Échec",
      formats: { inline: "En ligne", vertical: "Verticale", comma: "Virgules", space: "Espaces", bullet: "Liste" }
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
      selectImage: "Selecteer en deel als afbeelding",
      viewSelection: "Selectie bekijken ({n})",
      lookPlain: "Gewone versie kopiëren",
      lookEmoji: "Emojiversie kopiëren",
      lookNote: "Sommige apps tonen het symbool toch in kleur.",
      linkCopied: "Link gekopieerd",
      failed: "✗ Mislukt",
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
      selectImage: "Seleziona e condividi immagine",
      viewSelection: "Vedi selezione ({n})",
      lookPlain: "Copia la versione semplice",
      lookEmoji: "Copia la versione emoji",
      lookNote: "Alcune app lo mostrano comunque a colori.",
      linkCopied: "Link copiato",
      failed: "✗ Errore",
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
      selectImage: "Wybierz i udostępnij obraz",
      viewSelection: "Zobacz wybór ({n})",
      lookPlain: "Kopiuj zwykłą wersję",
      lookEmoji: "Kopiuj wersję emoji",
      lookNote: "Niektóre aplikacje i tak pokazują symbol w kolorze.",
      linkCopied: "Link skopiowany",
      failed: "✗ Błąd",
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
      selectImage: "เลือกแล้วแชร์เป็นรูปภาพ",
      viewSelection: "ดูที่เลือก ({n})",
      lookPlain: "คัดลอกแบบธรรมดา",
      lookEmoji: "คัดลอกแบบอีโมจิ",
      lookNote: "บางแอปยังคงแสดงเป็นสีอยู่ดี",
      linkCopied: "คัดลอกลิงก์แล้ว",
      failed: "✗ ล้มเหลว",
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
      selectImage: "選取並以圖片分享",
      viewSelection: "查看已選（{n}）",
      lookPlain: "複製純文字版",
      lookEmoji: "複製表情符號版",
      lookNote: "部分 App 仍會以彩色顯示。",
      linkCopied: "已複製連結",
      failed: "✗ 失敗",
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
      selectImage: "골라서 이미지로 공유",
      viewSelection: "선택 보기 ({n})",
      lookPlain: "기본 기호로 복사",
      lookEmoji: "이모지로 복사",
      lookNote: "일부 앱에서는 그래도 컬러로 표시됩니다.",
      linkCopied: "링크 복사됨",
      failed: "✗ 실패",
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
      selectImage: "اختر وشارك كصورة",
      viewSelection: "عرض التحديد ({n})",
      lookPlain: "انسخ النسخة العادية",
      lookEmoji: "انسخ نسخة الإيموجي",
      lookNote: "بعض التطبيقات تعرض الرمز بالألوان رغم ذلك.",
      linkCopied: "تم نسخ الرابط",
      failed: "✗ فشل",
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
      selectImage: "Velg og del som bilde",
      viewSelection: "Se utvalg ({n})",
      lookPlain: "Kopier vanlig versjon",
      lookEmoji: "Kopier emoji-versjon",
      lookNote: "Noen apper viser symbolet i farger likevel.",
      linkCopied: "Lenke kopiert",
      failed: "✗ Mislyktes",
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
      selectImage: "選んで画像で共有",
      viewSelection: "選択を表示（{n}）",
      lookPlain: "テキスト版をコピー",
      lookEmoji: "絵文字版をコピー",
      lookNote: "アプリによってはカラーで表示されます。",
      linkCopied: "リンクをコピーしました",
      failed: "✗ 失敗しました",
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
      selectImage: "Выбрать и поделиться картинкой",
      viewSelection: "Показать выбор ({n})",
      lookPlain: "Копировать обычный символ",
      lookEmoji: "Копировать эмодзи",
      lookNote: "Некоторые приложения всё равно показывают его в цвете.",
      linkCopied: "Ссылка скопирована",
      failed: "✗ Ошибка",
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
      selectImage: "Vælg og del som billede",
      viewSelection: "Se udvalg ({n})",
      lookPlain: "Kopiér almindelig version",
      lookEmoji: "Kopiér emoji-version",
      lookNote: "Nogle apps viser alligevel symbolet i farver.",
      linkCopied: "Link kopieret",
      failed: "✗ Mislykkedes",
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
      selectImage: "Välj och dela som bild",
      viewSelection: "Visa urval ({n})",
      lookPlain: "Kopiera vanlig version",
      lookEmoji: "Kopiera emoji-version",
      lookNote: "Vissa appar visar ändå symbolen i färg.",
      linkCopied: "Länk kopierad",
      failed: "✗ Misslyckades",
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
      selectImage: "Vybrat a sdílet jako obrázek",
      viewSelection: "Zobrazit výběr ({n})",
      lookPlain: "Kopírovat jednoduchou verzi",
      lookEmoji: "Kopírovat verzi emoji",
      lookNote: "Některé aplikace symbol přesto zobrazí barevně.",
      linkCopied: "Odkaz zkopírován",
      failed: "✗ Selhalo",
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
      selectImage: "Vybrať a zdieľať ako obrázok",
      viewSelection: "Zobraziť výber ({n})",
      lookPlain: "Kopírovať jednoduchú verziu",
      lookEmoji: "Kopírovať verziu emoji",
      lookNote: "Niektoré aplikácie symbol aj tak zobrazia farebne.",
      linkCopied: "Odkaz skopírovaný",
      failed: "✗ Zlyhalo",
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
      selectImage: "Odaberi i podijeli kao sliku",
      viewSelection: "Pogledaj odabir ({n})",
      lookPlain: "Kopiraj običnu verziju",
      lookEmoji: "Kopiraj emoji verziju",
      lookNote: "Neke aplikacije ipak prikazuju simbol u boji.",
      linkCopied: "Poveznica kopirana",
      failed: "✗ Neuspjelo",
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
      selectImage: "Odaberi i podijeli kao sliku",
      viewSelection: "Pogledaj odabir ({n})",
      lookPlain: "Kopiraj običnu verziju",
      lookEmoji: "Kopiraj emoji verziju",
      lookNote: "Neke aplikacije ipak prikazuju simbol u boji.",
      linkCopied: "Link kopiran",
      failed: "✗ Neuspjelo",
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
      selectImage: "Izaberi i podeli kao sliku",
      viewSelection: "Pogledaj izbor ({n})",
      lookPlain: "Kopiraj običnu verziju",
      lookEmoji: "Kopiraj emodži verziju",
      lookNote: "Neke aplikacije ipak prikazuju simbol u boji.",
      linkCopied: "Link kopiran",
      failed: "✗ Neuspelo",
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
      selectImage: "Selectează și distribuie ca imagine",
      viewSelection: "Vezi selecția ({n})",
      lookPlain: "Copiază varianta simplă",
      lookEmoji: "Copiază varianta emoji",
      lookNote: "Unele aplicații îl afișează oricum color.",
      linkCopied: "Link copiat",
      failed: "✗ Eșuat",
      formats: { inline: "Pe un rând", vertical: "Pe verticală", comma: "Cu virgulă", space: "Cu spațiu", bullet: "Listă" }
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
      selectImage: "Kiválasztás és megosztás képként",
      viewSelection: "Kiválasztottak ({n})",
      lookPlain: "Egyszerű változat másolása",
      lookEmoji: "Emoji változat másolása",
      lookNote: "Egyes alkalmazások így is színesen jelenítik meg.",
      linkCopied: "Link másolva",
      failed: "✗ Sikertelen",
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
      selectImage: "चुनें और इमेज शेयर करें",
      viewSelection: "चुने हुए देखें ({n})",
      lookPlain: "सादा वर्ज़न कॉपी करें",
      lookEmoji: "इमोजी वर्ज़न कॉपी करें",
      lookNote: "कुछ ऐप फिर भी इसे रंगीन दिखाते हैं।",
      linkCopied: "लिंक कॉपी हो गया",
      failed: "✗ विफल",
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
      selectImage: "Pumili at i-share bilang larawan",
      viewSelection: "Tingnan ang napili ({n})",
      lookPlain: "Kopyahin ang simpleng bersyon",
      lookEmoji: "Kopyahin ang emoji na bersyon",
      lookNote: "May mga app na nagpapakita pa rin nito nang may kulay.",
      linkCopied: "Nakopya ang link",
      failed: "✗ Nabigo",
      formats: { inline: "Isang linya", vertical: "Patayo", comma: "Kuwit", space: "Espasyo", bullet: "Listahan" }
    },
    /* fi and ms were missing until 2026-09-10, so their 5 collection pages
       fell through to UI_STRINGS.en and rendered English buttons. Invisible
       while the grids were built by JS; pre-rendering them would have put that
       English into static HTML. Every word below is attested on this site's own
       pages in that language — see docs/collection-grid-prerender.md §4 for
       where each one was harvested and which two are compounds of attested
       stems rather than attested strings. */
    fi: {
      copied: "Kopioitu: ",
      copyFormat: "Kopiointimuoto",
      copyCollection: " Kopioi kokoelma",
      copiedBtn: " Kopioitu!",
      save: "Tallenna",
      saved: "Tallennettu",
      share: "Jaa",
      shareImage: "Jaa kuvana",
      clearAll: "Tyhjennä kaikki",
      copyLabel: "Kopioi",
      selectImage: "Valitse ja jaa kuvana",
      viewSelection: "Näytä valinta ({n})",
      lookPlain: "Kopioi tavallinen versio",
      lookEmoji: "Kopioi emojiversio",
      lookNote: "Jotkin sovellukset näyttävät symbolin silti värillisenä.",
      linkCopied: "Linkki kopioitu",
      failed: "✗ Epäonnistui",
      formats: { inline: "Rivi", vertical: "Pysty", comma: "Pilkku", space: "V\u00e4lily\u00f6nti", bullet: "Luettelo" }
    },
    ms: {
      copied: "Disalin: ",
      copyFormat: "Format Salinan",
      copyCollection: " Salin Koleksi",
      copiedBtn: " Disalin!",
      save: "Simpan",
      saved: "Disimpan",
      share: "Kongsi",
      shareImage: "Kongsi sebagai imej",
      clearAll: "Kosongkan semua",
      copyLabel: "Salin",
      selectImage: "Pilih dan kongsi imej",
      viewSelection: "Lihat pilihan ({n})",
      lookPlain: "Salin versi biasa",
      lookEmoji: "Salin versi emoji",
      lookNote: "Sesetengah aplikasi tetap memaparkannya berwarna.",
      linkCopied: "Pautan disalin",
      failed: "✗ Gagal",
      formats: { inline: "Satu baris", vertical: "Menegak", comma: "Koma", space: "Ruang", bullet: "Senarai" }
    },
    uk: {
      copied: "Скопійовано: ",
      copyFormat: "Формат копіювання",
      copyCollection: " Копіювати добірку",
      copiedBtn: " Скопійовано!",
      save: "Зберегти",
      saved: "Збережено",
      share: "Поділитися",
      shareImage: "Поділитися як зображенням",
      clearAll: "Очистити все",
      copyLabel: "Копіювати",
      selectImage: "Вибрати й поділитися зображенням",
      viewSelection: "Переглянути вибране ({n})",
      lookPlain: "Скопіювати звичайну версію",
      lookEmoji: "Скопіювати версію емодзі",
      lookNote: "Деякі застосунки все одно показують його кольоровим.",
      linkCopied: "Посилання скопійовано",
      failed: "✗ Помилка",
      formats: { inline: "В один рядок", vertical: "Стовпчиком", comma: "Через кому", space: "Через пробіл", bullet: "Списком" }
    }
  };
  /* @collection-grid-strings:end */
  const PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const STR = UI_STRINGS[PAGE_LANG] || UI_STRINGS.en;

  /* ============================
     Toast
     ============================ */
  var toastEl = null;
  var toastTimer = null;

  function getToast() {
    if (!toastEl) {
      toastEl = document.getElementById("symbolToast");
      // A toast carrying a button stays up while the pointer or focus is on
      // it, so the button cannot vanish under a finger that is reaching it.
      if (toastEl) {
        const hold = function () { if (toastTimer) clearTimeout(toastTimer); };
        const resume = function () {
          if (toastEl.classList.contains("has-action")) hideToastIn(1500);
        };
        toastEl.addEventListener("pointerenter", hold);
        toastEl.addEventListener("focusin", hold);
        toastEl.addEventListener("pointerleave", resume);
        toastEl.addEventListener("focusout", resume);
      }
    }
    return toastEl;
  }

  function hideToastIn(ms) {
    const t = getToast();
    if (!t) return;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-visible");
      t.classList.remove("has-action");
    }, ms);
  }

  // `offer` (optional) adds one button to the toast: the other look of a
  // two-look symbol (see copySymbol). It stays up 4s instead of 1s, because a
  // button that disappears in one second cannot be pressed.
  // `plain` (optional) shows `msg` as given, without the "Copied" prefix: the
  // failure message is a whole sentence of its own.
  function showToast(msg, offer, plain) {
    var t = getToast();
    if (!t) return;
    t.textContent = plain ? msg : STR.copied + msg;
    t.classList.toggle("has-action", !!offer);
    if (offer) {
      // The confirmation keeps one line; the button wraps if anything does.
      const said = document.createElement("span");
      said.className = "symbol-toast-text";
      said.textContent = t.textContent;
      t.textContent = "";
      t.appendChild(said);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "symbol-toast-action";
      btn.textContent = offer.label + " ";
      if (offer.title) btn.title = offer.title;
      const glyph = document.createElement("span");
      glyph.className = "symbol-toast-glyph is-" + offer.look;
      glyph.textContent = offer.text;
      btn.appendChild(glyph);
      btn.addEventListener("click", offer.run);
      t.appendChild(btn);
    }
    t.classList.add("is-visible");
    hideToastIn(offer ? 4000 : 1000);
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
    let ok = false;
    try { ok = !!document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  ns.fallbackCopy = fallbackCopy;

  // `method` is the copy_text copy_method; it defaults to "symbol_tile" so
  // existing callers keep their meaning. A caller that copies something other
  // than one tile passes its own, so one action sends exactly one event.
  // `opts` (optional, used by the two-look path): `item` is the identity to
  // record when it differs from the copied text, `extra` goes on the event,
  // `offer` goes to the toast.
  //
  // A copy that neither path completed says so (the localized "failed" string)
  // and records nothing: a copy_text row fires on success, as a share row does,
  // never on intent.
  function copyText(text, el, label, method, opts) {
    label = label || text;
    function viaFallback() {
      if (fallbackCopy(text)) feedback(el, label, text, method, opts);
      else showToast(t("failed", "✗ Failed"), null, true);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        feedback(el, label, text, method, opts);
      }).catch(viaFallback);
    } else {
      viaFallback();
    }
  }
  ns.copyText = copyText;

  // A tile's payload is not always visible, and one that isn't must still be
  // copyable and still confirm itself. Two things follow, both learned from
  // real markup rather than reasoned up front:
  //
  //  1. Do NOT trim a payload away. The invisible-character family ships
  //     tiles whose ENTIRE value is whitespace — U+00A0, U+2000..U+200A,
  //     U+202F, U+205F, U+3000, U+FEFF — all of which JS `.trim()` removes.
  //     The old `(getAttribute(...) || "").trim()` reduced those to "" and
  //     returned early, so 311 tiles across 41 pages in 18 locales were dead
  //     buttons: click, nothing copied, no feedback. Trim only when something
  //     survives it, so padded markup is still cleaned up.
  //  2. Toast the tile's own LABEL when the payload has no visible glyph.
  //     Echoing an invisible character back gives a blank toast at exactly
  //     the moment a user most needs to be told the copy worked.
  function tileLabel(tile, symbol) {
    if (symbol.trim()) return symbol;
    var row = tile.parentElement;
    var label = row && row.querySelector ? row.querySelector(".flag-label") : null;
    var text = label && label.textContent ? label.textContent.trim() : "";
    return text || tile.getAttribute("aria-label") || symbol;
  }

  /* ============================
     Symbols with two looks
     ============================
     About 120 characters (♥ ❤ ☀ ↗ ⚔ ☠ ✈ …) exist as plain text AND as colour
     emoji; which one a reader sees is chosen by the font, or by a variation
     selector after the character (U+FE0E text, U+FE0F emoji). A tile drew one
     look and copied the bare character, so the paste could come out as the
     other: what you saw was not what you got. Now the copy carries the
     selector for the look the tile shows, and the toast offers the other
     look in one tap, for readers who wanted it and never had the word for it.

     The look is MEASURED on this device, not assumed from the font stack:
     the character is drawn three ways (as is, +FE0E, +FE0F) in the tile's own
     font and the pixels compared. Where the device draws both forms the same
     there is nothing to offer, and the tile copies exactly as before. Emoji-
     only characters (💕, ⚡) have one look and are never touched. */
  const VS_TEXT = "\uFE0E";
  const VS_EMOJI = "\uFE0F";
  let lookCanvas = null;

  function lookSignature(ch, font) {
    const ctx = lookCanvas.getContext("2d");
    ctx.clearRect(0, 0, 40, 40);
    ctx.font = "32px " + font;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000";
    ctx.fillText(ch, 2, 2);
    const d = ctx.getImageData(0, 0, 40, 40).data;
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0;
    return h;
  }

  // -> { base, shown: "emoji" | "plain" } or null
  function twoLook(tile, symbol) {
    let base = symbol;
    let vs = "";
    const last = symbol.slice(-1);
    if (last === VS_TEXT || last === VS_EMOJI) { vs = last; base = symbol.slice(0, -1); }
    if (Array.from(base).length !== 1 || /[0-9#*]/.test(base)) return null;
    if (!/\p{Emoji}/u.test(base) || /\p{Emoji_Presentation}/u.test(base)) return null;
    try {
      if (!lookCanvas) {
        lookCanvas = document.createElement("canvas");
        lookCanvas.width = lookCanvas.height = 40;
      }
      const font = getComputedStyle(tile).fontFamily || "sans-serif";
      const asEmoji = lookSignature(base + VS_EMOJI, font);
      const asText = lookSignature(base + VS_TEXT, font);
      if (asEmoji === asText) return null;
      if (vs) return { base: base, shown: vs === VS_EMOJI ? "emoji" : "plain" };
      const asIs = lookSignature(base, font);
      if (asIs === asEmoji) return { base: base, shown: "emoji" };
      if (asIs === asText) return { base: base, shown: "plain" };
    } catch (e) { /* no canvas: copy as before */ }
    return null;
  }

  // copy_item stays the bare character, so a symbol's history in Analytics
  // does not split in two; copy_look says which look left the page.
  function copyLook(tile, base, look, method) {
    const text = base + (look === "emoji" ? VS_EMOJI : VS_TEXT);
    const other = look === "emoji" ? "plain" : "emoji";
    copyText(text, tile, text, method, {
      item: base,
      extra: { copy_look: look },
      offer: method === "symbol_tile" ? {
        look: other,
        label: other === "plain" ? STR.lookPlain : STR.lookEmoji,
        title: other === "plain" ? STR.lookNote : "",
        text: base + (other === "emoji" ? VS_EMOJI : VS_TEXT),
        run: function () { copyLook(tile, base, other, "symbol_look_switch"); }
      } : null
    });
  }

  function copySymbol(tile) {
    var raw = tile.getAttribute("data-symbol");
    if (raw == null) return;
    var symbol = raw.trim() || raw;
    if (!symbol) return;
    const look = twoLook(tile, symbol);
    if (look) { copyLook(tile, look.base, look.shown, "symbol_tile"); return; }
    copyText(symbol, tile, tileLabel(tile, symbol));
  }
  ns.copySymbol = copySymbol;

  /* ============================
     Glyph vs text object
     ============================ */
  // A .flag-emoji tile inherits `aspect-ratio: 1` from .symbol-tile. For a
  // glyph that is what gives it a 43x43 target, but a composed expression
  // like (╯°□°）╯︵ ┻━┻ becomes a box as tall as it is wide and overflows its
  // grid cell. A grid holding one of those gets `flag-rows--text` in its
  // static HTML, and symbol-explorer.css lays it out as expression cards.
  //
  // Width is counted in terminal columns per grapheme cluster, never by
  // string length: 👨‍👩‍👧 is 8 UTF-16 units and one emoji. An emoji or a
  // CJK/Hangul/fullwidth grapheme counts 2, anything else 1. At 3 or more
  // the glyph box can no longer hold the item (measured across every
  // rendered tile on the site: at width 2 no tile outgrew its box, at 6 all
  // of them did). scripts/lib/text-object-grid.js runs this block in Node,
  // so the build and the browser share one definition.
  /* @text-object:begin */
  const TEXT_OBJECT_MIN_WIDTH = 3;
  const TEXT_GRID_CLASS = "flag-rows--text";
  const WIDE_RE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
  const PICTO_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

  function copyItemWidth(value) {
    const s = String(value == null ? "" : value).trim();
    if (!s) return 0;
    let width = 0;
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      for (const part of seg.segment(s)) {
        width += PICTO_RE.test(part.segment) || WIDE_RE.test(part.segment) ? 2 : 1;
      }
    } else {
      width = Array.from(s).length;
    }
    return width;
  }

  function isTextObject(value) {
    return copyItemWidth(value) >= TEXT_OBJECT_MIN_WIDTH;
  }
  /* @text-object:end */
  ns.copyItemWidth = copyItemWidth;
  ns.isTextObject = isTextObject;

  function feedback(el, label, copied, method, opts) {
    method = method || "symbol_tile";
    opts = opts || {};
    el.classList.add("is-copied");
    setTimeout(function () {
      el.classList.remove("is-copied");
    }, 1000);
    showToast(label, opts.offer);
    if (opts.item !== undefined) copied = opts.item;
    // Record WHAT was copied, not just that a copy happened. header.js owns
    // the identity helper (it is on every page these tiles ship on); the
    // guard keeps the copy working if it is ever absent.
    var utg = window.UltraTextGen;
    if (utg && utg.trackCopy) {
      utg.trackCopy(method, copied === undefined ? label : copied, opts.extra);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "copy_text", copy_method: method,
        copy_look: opts.extra ? opts.extra.copy_look : undefined });
    }
  }

  /* ============================
     ISO alpha-2 → flag emoji
     ============================ */
  /* @collection-grid-iso:begin */
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
  /* @collection-grid-iso:end */
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
  /* @collection-grid:begin */
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
      case "bullet":   return items.map(function (f) { return "\u2022 " + f; }).join("\n");
      default:         return items.join(" "); // inline
    }
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function activeFormatsFor(groups) {
    return groups.map(function (g) {
      return (g && g.defaultFormat) ? g.defaultFormat : "vertical";
    });
  }

  /* One collection section, as a markup STRING.

     It is a string rather than createElement calls so that the build-time
     pre-renderer can emit byte-identical markup by slicing THIS function out
     of THIS file (scripts/lib/collection-grid-engine.js) and running it — the
     same arrangement the library-hub builders use, and for the reason
     CLAUDE.md records there: a second copy of the markup in the generator
     drifts from the first and nothing says so. */
  function gridSectionHTML(group, gi, activeFormat, str, formats, copyIcon) {
    var tabs = formats.map(function (fmt) {
      return '<button class="format-tab' + (fmt.id === activeFormat ? " active" : "") +
        '" data-format="' + fmt.id + '" data-group="' + gi + '">' +
        escHtml(str.formats[fmt.id] || fmt.label) + "</button>";
    }).join("");
    return '<div class="mood-explainer flag-grid-section">' +
      "<h3>" + escHtml(group.name) + "</h3>" +
      (group.desc ? "<p>" + escHtml(group.desc) + "</p>" : "") +
      '<div class="flag-grid-display">' + escHtml(group.flags.join(" ")) + "</div>" +
      '<div class="format-selector">' +
      '<div class="format-selector-label">' + escHtml(str.copyFormat) + "</div>" +
      '<div class="format-tabs">' + tabs + "</div>" +
      "</div>" +
      '<div class="format-preview" id="preview-' + gi + '">' +
      escHtml(formatItems(group.flags, activeFormat)) + "</div>" +
      '<button class="copy-collection-btn" id="copyBtn-' + gi + '" data-group="' + gi + '">' +
      copyIcon + escHtml(str.copyCollection) + "</button>" +
      "</div>";
  }

  function gridSectionsHTML(groups, activeFormats, str, formats, copyIcon) {
    return groups.map(function (group, gi) {
      return gridSectionHTML(group, gi, activeFormats[gi], str, formats, copyIcon);
    }).join("");
  }
  /* @collection-grid:end */
  ns.formatItems = formatItems;

  /* ============================
     Country flag rows
     ============================ */
  /* The 17 emoji-flag pages each hold their own COUNTRIES registry, already
     translated into that page's language, and used to build 195 tiles per
     page. They built them with createElement on load, so a client that runs
     no JavaScript saw an empty box where the page's payload should be.

     The markup lives here, once, so scripts/prerender-country-flags.js can
     write the SAME markup into the page at build time by calling this
     function rather than carrying a copy of it — the arrangement
     gridSectionsHTML above already uses, for the reason CLAUDE.md gives for
     the library-hub builders.

     `aria` carries the page's own label template, split around the country
     name (EN "Copy " + name + " flag", ja "" + name + "の国旗をコピー").
     Nothing is translated here: each page passes the strings it already
     shipped. */
  /* @country-flag-rows:begin */
  function countryFlagRowHTML(country, aria) {
    var flag = isoToFlag(country.code);
    var label = (aria && aria.before ? aria.before : "") + country.name +
      (aria && aria.after ? aria.after : "");
    return '<div class="flag-row" data-region="' + escHtml(country.region) + '">' +
      '<button class="flag-emoji symbol-tile" data-symbol="' + escHtml(flag) +
      '" aria-label="' + escHtml(label) + '">' + escHtml(flag) + "</button>" +
      '<span class="flag-label">' + escHtml(country.name) + "</span>" +
      "</div>";
  }

  function countryFlagRowsHTML(countries, aria) {
    return (countries || []).map(function (country) {
      return countryFlagRowHTML(country, aria);
    }).join("");
  }
  /* @country-flag-rows:end */
  ns.countryFlagRowsHTML = countryFlagRowsHTML;

  /* ============================
     Build grid UI
     Call:  UltraTextGen.buildGrids("containerId", groups)
     where groups = [{ name: "EU", flags: ["\ud83c\udde6\ud83c\uddf9", \u2026] }, \u2026]
     An optional `desc` on a group renders as one line under its heading. Use
     it to name the members in words: a flag emoji is two regional-indicator
     letters, so a crawler sees no country names in the grid itself.
     ============================ */
  /* Every collection set this page builds, so an image selection can offer
     "Add all" on one. The registry holds the group's own item array rather
     than reading the rendered text back: twemoji replaces that text with
     <img> tags on some pages, and an item may itself contain a space. */
  var collectionRegistry = [];
  ns.collectionGroups = function () { return collectionRegistry.slice(); };

  function buildGrids(containerId, groups) {
    var container = document.getElementById(containerId);
    if (!container) return;
    collectionRegistry.push({ container: container, groups: groups });

    var activeFormats = activeFormatsFor(groups);

    /* scripts/prerender-collection-grids.js writes these sections into the
       page at build time so a crawler that runs no JavaScript still sees the
       collections, which on these pages are the payload. Re-appending them
       here would double every section, so only build what is not already
       there. */
    if (!container.querySelector(".flag-grid-section")) {
      container.insertAdjacentHTML(
        "beforeend",
        gridSectionsHTML(groups, activeFormats, STR, FORMATS, COPY_ICON)
      );
    }

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
        var utgGrid = window.UltraTextGen;
        if (utgGrid && utgGrid.trackCopy) {
          // For a whole collection the group's own name is the identity that
          // matters; the concatenated payload would be neither readable nor
          // within the event's size budget.
          utgGrid.trackCopy("grid_collection", groups[gi2].flags[0], {
            copy_collection: (groups[gi2].label || groups[gi2].name || "").slice(0, 80),
            copy_item_count: groups[gi2].flags.length
          });
        } else {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "copy_text", copy_method: "grid_collection" });
        }
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
  /* While an image selection is open (js/share/image-selection.js), a tile
     press chooses the item instead of copying it. Outside that mode nothing
     here changes: a press copies, exactly as before. */
  function imageSelectionActive() {
    return !!(ns.imageSelection && ns.imageSelection.isActive());
  }

  document.addEventListener("click", function (e) {
    var tile = e.target.closest(".symbol-tile");
    if (!tile) return;
    if (imageSelectionActive()) {
      ns.imageSelection.toggleTile(tile);
      return;
    }
    copySymbol(tile);
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
    copyText(pre.textContent.replace(/\s+$/, ""), btn, label, "ascii_art");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var tile = e.target.closest(".symbol-tile");
    if (!tile) return;
    /* The default is always cancelled, so the browser's own click never
       arrives: a held Enter makes the browser click again on every
       auto-repeat, and a press would otherwise run once here and again
       there. The key then acts once, on the first keydown, never on a
       repeat (a held key used to select, unselect, select... or copy over
       and over). */
    e.preventDefault();
    if (e.repeat) return;
    if (imageSelectionActive()) {
      ns.imageSelection.toggleTile(tile);
      return;
    }
    copySymbol(tile);
  });

  // Firefox clicks a button on Space KEYUP even when keydown was cancelled.
  document.addEventListener("keyup", function (e) {
    if (e.key !== " ") return;
    var tile = e.target.closest && e.target.closest(".symbol-tile");
    if (tile) e.preventDefault();
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
    linkCopied: "shareResult.linkCopied",
    failed: "copyButtons.failed",
    clearAll: "savedStyles.clearAll",
    copyLabel: "copyButtons.copy",
    selectImage: "imageSelection.selectImage",
    viewSelection: "imageSelection.viewSelection"
  };

  const STAR_OUTLINE = "☆";
  const STAR_FILLED = "★";

  /* The name a page gives a tile's ROW, for Save and its saved-strip caption.
     The visible .flag-label is authoritative (it is what the reader sees and
     what the locale pages translate). Without one, the glyph itself is the
     name: the aria-label is "<copy verb> <glyph>" in the page's language
     ("Salin ♡", "Copiar nombre"), and stripping only an English "Copy " left
     the localized verb inside saved captions and save_style.item_label.

     This used to be a second `function tileLabel` in this same scope. Function
     declarations hoist, so it silently replaced the copy toast's glyph-first
     tileLabel(tile, symbol) above and every toast showed a label instead of
     the glyph. Keep the two names distinct. */
  function rowLabel(tile) {
    const row = tile.closest(".flag-row");
    const label = row ? row.querySelector(".flag-label") : null;
    if (label && label.textContent.trim()) return label.textContent.trim();
    return (tile.getAttribute("data-symbol") || "").trim();
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
      btn.setAttribute("aria-label", t("save", "Save") + " " + rowLabel(tile));
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
      label: tile ? rowLabel(tile) : symbol,
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
      UTGX.saved.clear("symbol"); // utg:savedchange repaints the strip and the stars
    });
    head.appendChild(clear);
    strip.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "symbol-saved-grid flag-rows";
    if (items.some(function (r) { return isTextObject(r.value); })) {
      grid.classList.add(TEXT_GRID_CLASS);
    }
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
      copyText(joined, copyAll, joined, "saved_collection");
    });
    actions.appendChild(copyAll);

    if (UTGX.buildShareActions) {
      actions.appendChild(UTGX.buildShareActions({
        text: joined,
        input: joined,
        name: t("saved", "Saved"),
        // One saved symbol shares as that symbol's own deep link, so the
        // recipient lands with it highlighted; a set shares as the page.
        // This is also what makes ?symbol= a link anything actually produces
        // rather than a reader with no writer.
        url: items.length === 1 ? symbolShareUrl(items[0].value) : pageUrl(),
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

  /* ---- per-section Share + "Select and share image" ----------------- */

  /* After each tile section: "Share" (the link to this section, unchanged in
     what it does; only its icon is now a link) and "Select and share image".

     The image entry replaced a per-section image button on 2026-10-01. That
     button drew EVERY symbol in its section onto the card, so a visitor who
     wanted one heart got all forty, under the section heading. The image is
     now made only from what the visitor picks: the entry opens one selection
     for the whole page (js/share/image-selection.js), whichever section's
     button was pressed, and every entry button then reads
     "View selection (n)" for that same selection. */

  // Can this value be drawn? The invisible-character pages ship tiles whose
  // whole payload is a space or a joiner; a picture of one is a blank card.
  // U+2800 (braille blank) and the Hangul fillers draw nothing either, and
  // the invisible-character page ships them as tiles: an audit exported a
  // blank card from one. They are listed because Unicode does not class all
  // of them as ignorable.
  const DRAWABLE_RE = /[^\s\p{Default_Ignorable_Code_Point}\u2800\u115F\u1160\u3164\uFFA0]/u;
  function isDrawable(value) {
    return DRAWABLE_RE.test(String(value == null ? "" : value));
  }
  ns.isDrawableSymbol = isDrawable;

  /* A collection set can be added to an image as its members only when it IS
     a list of members: two or more items, each a single grapheme (one emoji,
     one flag, one symbol), none repeated. ASEAN's ten flags and a
     "Soft Girl" emoji combo are lists. A bio trail such as ♪ ˚ ♫ ˚ ♪ (a
     repeat whose spacing is the design), a kaomoji set and a text-art piece
     are not: splitting those into removable members would change what they
     are. They stay out of the image selection until that unit is decided. */
  function isMemberList(items) {
    if (!items || items.length < 2) return false;
    if (typeof Intl === "undefined" || !Intl.Segmenter) return false;
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const seen = {};
    for (let i = 0; i < items.length; i++) {
      const v = String(items[i] == null ? "" : items[i]).trim();
      if (!v || !isDrawable(v) || seen[v]) return false;
      seen[v] = true;
      let count = 0;
      for (const part of seg.segment(v)) { count++; if (count > 1) return false; }
    }
    return true;
  }
  ns.isMemberList = isMemberList;

  function selectionCount() {
    return ns.imageSelection && ns.imageSelection.isActive() ? ns.imageSelection.count() : null;
  }

  function paintSelectEntry(btn) {
    const n = selectionCount();
    const label = btn.querySelector(".symbol-select-label");
    const text = n === null
      ? t("selectImage", "Select and share image")
      : t("viewSelection", "View selection ({n})").replace("{n}", String(n));
    if (label) label.textContent = text;
    if (n === null) {
      btn.removeAttribute("aria-controls");
    } else {
      btn.setAttribute("aria-controls", "utgImageSelection");
    }
  }

  function buildSelectEntry() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "symbol-select-btn";
    btn.innerHTML = (UTGX.icons && UTGX.icons.image ? UTGX.icons.image : "") +
      '<span class="symbol-select-label"></span>';
    paintSelectEntry(btn);
    return btn;
  }

  function decorateSections() {
    if (!UTGX.buildShareButton) return;
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
      const row = document.createElement("div");
      row.className = "result-share-row";
      // The same Share as before 2026-10-01, field for field: native sheet
      // with the section link (and its symbols as text), else copy the link.
      row.appendChild(UTGX.buildShareButton({
        text: symbols,
        input: symbols,
        name: name,
        url: section && section.id ? pageUrl() + "#" + section.id : pageUrl(),
        surface: "library_section",
        itemType: "collection",
        label: t("share", "Share"),
        linkCopied: t("linkCopied", "Link copied"),
        failedLabel: t("failed", "✗ Failed"),
        icon: "link"
      }));
      if (Array.prototype.some.call(tiles, function (tile) { return isDrawable(tile.getAttribute("data-symbol")); })) {
        row.appendChild(buildSelectEntry());
      }
      wrap.appendChild(row);
      group.parentNode.insertBefore(wrap, group.nextSibling);
    });
    decorateCollectionSections();
  }

  /* A collection container (the named sets buildGrids renders, ASEAN among
     them) gets the image entry only: it has never had a section Share, and
     adding one is not part of this change. The entry appears only where at
     least one set is a member list that "Add all" can actually offer. */
  function decorateCollectionSections() {
    collectionRegistry.forEach(function (entry) {
      const container = entry.container;
      if (!container || !container.parentNode) return;
      const next = container.nextElementSibling;
      if (next && next.classList.contains("symbol-section-actions")) return;
      if (!entry.groups.some(function (g) { return isMemberList(g && g.flags); })) return;
      const wrap = document.createElement("div");
      wrap.className = "symbol-section-actions symbol-section-actions--collections";
      const row = document.createElement("div");
      row.className = "result-share-row";
      row.appendChild(buildSelectEntry());
      wrap.appendChild(row);
      container.parentNode.insertBefore(wrap, container.nextSibling);
    });
  }

  function repaintSelectEntries() {
    document.querySelectorAll(".symbol-select-btn").forEach(paintSelectEntry);
  }
  document.addEventListener("utg:imageselectionchange", repaintSelectEntries);

  /* The selection UI is loaded on the first press, not with the page: it is
     only needed by visitors who ask for an image, and this file runs on
     every library and symbol page. */
  let selectionModule = null;
  function loadSelectionModule() {
    if (ns.imageSelection) return Promise.resolve(ns.imageSelection);
    if (selectionModule) return selectionModule;
    selectionModule = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = "/js/share/image-selection.js";
      s.async = true;
      s.onload = function () {
        if (ns.imageSelection) resolve(ns.imageSelection);
        else reject(new Error("image-selection.js loaded without registering"));
      };
      s.onerror = function () { reject(new Error("image-selection.js failed to load")); };
      document.head.appendChild(s);
    }).catch(function (err) {
      selectionModule = null; // let the next press try again
      throw err;
    });
    return selectionModule;
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".symbol-select-btn");
    if (!btn || btn.getAttribute("aria-busy") === "true") return;
    btn.setAttribute("aria-busy", "true");
    loadSelectionModule().then(function (sel) {
      btn.removeAttribute("aria-busy");
      sel.open(btn);
    }).catch(function (err) {
      btn.removeAttribute("aria-busy");
      console.error(err);
      btn.classList.add("share-error");
      setTimeout(function () { btn.classList.remove("share-error"); }, 1500);
    });
  });

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

  /* Repaint every star whenever the store changes, not just the strip. A
     clear() leaves the grid's stars lit otherwise — the strip empties and the
     tiles still claim to be saved. The strip's own Clear button used to repaint
     them itself, which meant any other path into clear() (another tab, a future
     caller) skipped it. */
  function repaintStars() {
    document.querySelectorAll(".symbol-save-btn").forEach(function (b) {
      paintSaveBtn(b, isSavedSymbol(b.getAttribute("data-symbol")));
    });
  }

  document.addEventListener("utg:savedchange", function () {
    renderSavedStrip();
    repaintStars();
  });
  // i18n.js resolves its locale fetch after this file runs, so every label
  // injected above is re-read once it lands. Without this a Korean library
  // page would show Korean prose with English buttons on it — the exact bug
  // i18n.js's own comment records for the shadow locales.
  document.addEventListener("utg:i18nready", function () {
    repaintStars();
    document.querySelectorAll(".symbol-save-btn").forEach(function (b) {
      // Re-read the row's own label rather than falling back to the raw
      // glyph: "Save Black Star" is the announcement, not "Save ★".
      const row = b.closest(".flag-row");
      const tile = row ? row.querySelector(".symbol-tile") : null;
      b.setAttribute("aria-label", t("save", "Save") + " " + (tile ? rowLabel(tile) : b.getAttribute("data-symbol")));
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

  // A page that calls buildGrids from its own DOMContentLoaded handler may
  // register its sets after initSaveShare ran; decorateSections is
  // idempotent, so a second pass at load picks those up.
  window.addEventListener("load", function () { decorateSections(); });

})();
