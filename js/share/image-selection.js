/* =====================================================================
   image-selection.js — "Select and share image" on library and symbol
   pages (2026-10-01).

   THE PRINCIPLE: an image's content comes from the visitor's deliberate
   selection, never from where the button happens to sit. The per-section
   image button this replaced drew every symbol in its section under the
   section's heading, so someone who wanted one heart got forty. Here the
   visitor picks items one by one, from any section on the page, in the
   order they want them, and the picture holds exactly those.

   How it fits:
   - symbol-explorer.js renders "Select and share image" after each tile
     section and loads this file on the first press (it runs on every
     library page; this is only needed by visitors who ask for an image).
   - While a selection is open, symbol-explorer.js routes a tile press to
     toggleTile() instead of copying. Close it and copying is back.
   - The picture is drawn by share-core.js's renderSelectionImage and handed
     to the OS share sheet by its shareImageBlob, the site's one image-share
     path, so the share event keeps its single writer.
   - Saved items (the star) are a separate, lasting store. Nothing here reads
     or writes it: this selection lives only as long as the page.

   Strings: harvested from locales/<lang>.json (ui.imageSelection) by
   scripts/sync-explorer-strings.js, never authored here, for the reason that
   file gives. These pages load no i18n.js.
   ===================================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});
  if (ns.imageSelection) return;

  /* @image-selection-strings:begin */
  const UI_STRINGS = {
    en: {
      hint: "Choose emojis or symbols from any section to make your image.",
      count: "{n} selected",
      empty: "Nothing selected yet",
      shareImage: "Share image",
      downloadImage: "Download image",
      cancel: "Cancel",
      preview: "Preview image",
      close: "Close",
      remove: "Remove {item}",
      addAll: "Add all {n}",
      removeAll: "Remove all {n}",
      limit: "You can add up to {max}.",
      tooBig: "Too many to fit. Remove some.",
      making: "Making image…",
      shared: "Image shared",
      downloaded: "Image downloaded",
      shareFailed: "Couldn't share. Try Download.",
      renderFailed: "Couldn't make the image. Try again.",
      trayLabel: "Image selection",
      setUnavailable: "This set can't be added to an image yet."
    },
    ar: {
      hint: "اختر رموزًا تعبيرية أو رموزًا من أي قسم لصنع صورتك.",
      count: "تم تحديد {n}",
      empty: "لم يتم تحديد شيء بعد",
      shareImage: "مشاركة الصورة",
      downloadImage: "تنزيل الصورة",
      cancel: "إلغاء",
      preview: "معاينة الصورة",
      close: "إغلاق",
      remove: "إزالة {item}",
      addAll: "إضافة الكل ({n})",
      removeAll: "إزالة الكل ({n})",
      limit: "يمكنك إضافة {max} كحد أقصى.",
      tooBig: "العدد كبير على صورة واحدة. أزل بعضها.",
      making: "جارٍ إنشاء الصورة…",
      shared: "تمت مشاركة الصورة",
      downloaded: "تم تنزيل الصورة",
      shareFailed: "تعذرت المشاركة. جرّب التنزيل.",
      renderFailed: "تعذر إنشاء الصورة. حاول مرة أخرى.",
      trayLabel: "تحديد الصورة",
      setUnavailable: "لا يمكن إضافة هذه المجموعة إلى صورة بعد."
    },
    bs: {
      hint: "Odaberi emojije ili simbole iz bilo kojeg dijela za svoju sliku.",
      count: "Odabrano: {n}",
      empty: "Još ništa nije odabrano",
      shareImage: "Podijeli sliku",
      downloadImage: "Preuzmi sliku",
      cancel: "Otkaži",
      preview: "Pregled slike",
      close: "Zatvori",
      remove: "Ukloni {item}",
      addAll: "Dodaj sve ({n})",
      removeAll: "Ukloni sve ({n})",
      limit: "Možeš dodati najviše {max}.",
      tooBig: "Previše za jednu sliku. Ukloni nekoliko.",
      making: "Pravim sliku…",
      shared: "Slika podijeljena",
      downloaded: "Slika preuzeta",
      shareFailed: "Dijeljenje nije uspjelo. Probaj preuzeti.",
      renderFailed: "Slika nije napravljena. Probaj ponovo.",
      trayLabel: "Odabir za sliku",
      setUnavailable: "Ovaj set se još ne može dodati u sliku."
    },
    cs: {
      hint: "Vyber emoji nebo symboly z libovolné sekce pro svůj obrázek.",
      count: "Vybráno: {n}",
      empty: "Zatím nic nevybráno",
      shareImage: "Sdílet obrázek",
      downloadImage: "Stáhnout obrázek",
      cancel: "Zrušit",
      preview: "Náhled obrázku",
      close: "Zavřít",
      remove: "Odebrat {item}",
      addAll: "Přidat všechny ({n})",
      removeAll: "Odebrat všechny ({n})",
      limit: "Můžeš přidat nejvýš {max}.",
      tooBig: "Na jeden obrázek je jich moc. Pár jich odeber.",
      making: "Vytváří se obrázek…",
      shared: "Obrázek sdílen",
      downloaded: "Obrázek stažen",
      shareFailed: "Sdílení se nepovedlo. Zkus stáhnout.",
      renderFailed: "Obrázek se nepovedlo vytvořit. Zkus to znovu.",
      trayLabel: "Výběr pro obrázek",
      setUnavailable: "Tuhle sadu zatím nejde přidat do obrázku."
    },
    da: {
      hint: "Vælg emojis eller symboler fra en hvilken som helst sektion til dit billede.",
      count: "{n} valgt",
      empty: "Intet valgt endnu",
      shareImage: "Del billede",
      downloadImage: "Download billede",
      cancel: "Annuller",
      preview: "Forhåndsvis billede",
      close: "Luk",
      remove: "Fjern {item}",
      addAll: "Tilføj alle {n}",
      removeAll: "Fjern alle {n}",
      limit: "Du kan tilføje op til {max}.",
      tooBig: "For mange til ét billede. Fjern nogle.",
      making: "Laver billede…",
      shared: "Billede delt",
      downloaded: "Billede downloadet",
      shareFailed: "Kunne ikke dele. Prøv at downloade.",
      renderFailed: "Kunne ikke lave billedet. Prøv igen.",
      trayLabel: "Billedudvalg",
      setUnavailable: "Dette sæt kan ikke tilføjes til et billede endnu."
    },
    de: {
      hint: "Wähle Emojis oder Symbole aus beliebigen Abschnitten für dein Bild.",
      count: "{n} ausgewählt",
      empty: "Noch nichts ausgewählt",
      shareImage: "Bild teilen",
      downloadImage: "Bild herunterladen",
      cancel: "Abbrechen",
      preview: "Bildvorschau",
      close: "Schließen",
      remove: "{item} entfernen",
      addAll: "Alle {n} hinzufügen",
      removeAll: "Alle {n} entfernen",
      limit: "Du kannst bis zu {max} hinzufügen.",
      tooBig: "Zu viele für ein Bild. Entferne einige.",
      making: "Bild wird erstellt…",
      shared: "Bild geteilt",
      downloaded: "Bild heruntergeladen",
      shareFailed: "Teilen ging nicht. Lade es herunter.",
      renderFailed: "Bild ging nicht. Versuch es noch mal.",
      trayLabel: "Bildauswahl",
      setUnavailable: "Dieses Set kann noch nicht ins Bild."
    },
    es: {
      hint: "Elige emojis o símbolos de cualquier sección para crear tu imagen.",
      count: "{n} seleccionados",
      empty: "Aún no has elegido nada",
      shareImage: "Compartir imagen",
      downloadImage: "Descargar imagen",
      cancel: "Cancelar",
      preview: "Vista previa de la imagen",
      close: "Cerrar",
      remove: "Quitar {item}",
      addAll: "Añadir los {n}",
      removeAll: "Quitar los {n}",
      limit: "Puedes añadir hasta {max}.",
      tooBig: "Demasiados para una imagen. Quita algunos.",
      making: "Creando imagen…",
      shared: "Imagen compartida",
      downloaded: "Imagen descargada",
      shareFailed: "No se pudo compartir. Prueba a descargarla.",
      renderFailed: "No se pudo crear la imagen. Inténtalo de nuevo.",
      trayLabel: "Selección de imagen",
      setUnavailable: "Este conjunto aún no se puede añadir a una imagen."
    },
    fi: {
      hint: "Valitse emojeja tai symboleja mistä tahansa osiosta kuvaasi.",
      count: "{n} valittu",
      empty: "Mitään ei ole vielä valittu",
      shareImage: "Jaa kuva",
      downloadImage: "Lataa kuva",
      cancel: "Peruuta",
      preview: "Esikatsele kuvaa",
      close: "Sulje",
      remove: "Poista {item}",
      addAll: "Lisää kaikki {n}",
      removeAll: "Poista kaikki {n}",
      limit: "Voit lisätä enintään {max}.",
      tooBig: "Liian monta yhteen kuvaan. Poista muutama.",
      making: "Luodaan kuvaa…",
      shared: "Kuva jaettu",
      downloaded: "Kuva ladattu",
      shareFailed: "Jakaminen ei onnistunut. Kokeile latausta.",
      renderFailed: "Kuvan luominen ei onnistunut. Yritä uudelleen.",
      trayLabel: "Kuvan valinta",
      setUnavailable: "Tätä sarjaa ei voi vielä lisätä kuvaan."
    },
    fr: {
      hint: "Choisis des emojis ou des symboles dans n’importe quelle section pour créer ton image.",
      count: "Sélection : {n}",
      empty: "Rien de sélectionné pour l’instant",
      shareImage: "Partager l’image",
      downloadImage: "Télécharger l’image",
      cancel: "Annuler",
      preview: "Aperçu de l’image",
      close: "Fermer",
      remove: "Retirer {item}",
      addAll: "Ajouter les {n}",
      removeAll: "Retirer les {n}",
      limit: "Tu peux en ajouter jusqu’à {max}.",
      tooBig: "Trop d’éléments pour une image. Retires-en quelques-uns.",
      making: "Création de l’image…",
      shared: "Image partagée",
      downloaded: "Image téléchargée",
      shareFailed: "Partage impossible. Essaie de télécharger.",
      renderFailed: "Impossible de créer l’image. Réessaie.",
      trayLabel: "Sélection pour l’image",
      setUnavailable: "Cet ensemble ne peut pas encore aller dans une image."
    },
    hi: {
      hint: "अपनी इमेज के लिए किसी भी सेक्शन से इमोजी या सिंबल चुनें।",
      count: "{n} चुने गए",
      empty: "अभी कुछ नहीं चुना",
      shareImage: "इमेज शेयर करें",
      downloadImage: "इमेज डाउनलोड करें",
      cancel: "रद्द करें",
      preview: "इमेज का प्रीव्यू",
      close: "बंद करें",
      remove: "{item} हटाएं",
      addAll: "सभी {n} जोड़ें",
      removeAll: "सभी {n} हटाएं",
      limit: "आप ज़्यादा से ज़्यादा {max} जोड़ सकते हैं।",
      tooBig: "एक इमेज के लिए बहुत ज़्यादा हैं। कुछ हटाएं।",
      making: "इमेज बन रही है…",
      shared: "इमेज शेयर हो गई",
      downloaded: "इमेज डाउनलोड हो गई",
      shareFailed: "शेयर नहीं हो पाया। डाउनलोड करके देखें।",
      renderFailed: "इमेज नहीं बन पाई। फिर से कोशिश करें।",
      trayLabel: "इमेज के लिए चुनाव",
      setUnavailable: "यह सेट अभी इमेज में नहीं जोड़ा जा सकता।"
    },
    hr: {
      hint: "Odaberi emojije ili simbole iz bilo kojeg odjeljka za svoju sliku.",
      count: "Odabrano: {n}",
      empty: "Još ništa nije odabrano",
      shareImage: "Podijeli sliku",
      downloadImage: "Preuzmi sliku",
      cancel: "Odustani",
      preview: "Pregled slike",
      close: "Zatvori",
      remove: "Ukloni {item}",
      addAll: "Dodaj sve ({n})",
      removeAll: "Ukloni sve ({n})",
      limit: "Možeš dodati najviše {max}.",
      tooBig: "Previše za jednu sliku. Ukloni nekoliko.",
      making: "Izrada slike…",
      shared: "Slika podijeljena",
      downloaded: "Slika preuzeta",
      shareFailed: "Dijeljenje nije uspjelo. Pokušaj preuzeti.",
      renderFailed: "Slika nije izrađena. Pokušaj ponovno.",
      trayLabel: "Odabir za sliku",
      setUnavailable: "Ovaj set još se ne može dodati u sliku."
    },
    hu: {
      hint: "Válassz emojikat vagy szimbólumokat bármelyik részből a képedhez.",
      count: "{n} kiválasztva",
      empty: "Még nincs kiválasztva semmi",
      shareImage: "Kép megosztása",
      downloadImage: "Kép letöltése",
      cancel: "Mégse",
      preview: "Kép előnézete",
      close: "Bezárás",
      remove: "{item} eltávolítása",
      addAll: "Mind hozzáadása ({n})",
      removeAll: "Mind eltávolítása ({n})",
      limit: "Legfeljebb {max} elemet adhatsz hozzá.",
      tooBig: "Túl sok egy képhez. Távolíts el néhányat.",
      making: "Kép készítése…",
      shared: "Kép megosztva",
      downloaded: "Kép letöltve",
      shareFailed: "Nem sikerült megosztani. Próbáld letölteni.",
      renderFailed: "Nem sikerült elkészíteni a képet. Próbáld újra.",
      trayLabel: "Képhez választás",
      setUnavailable: "Ez a készlet még nem tehető képre."
    },
    id: {
      hint: "Pilih emoji atau simbol dari bagian mana saja untuk membuat gambarmu.",
      count: "{n} dipilih",
      empty: "Belum ada yang dipilih",
      shareImage: "Bagikan gambar",
      downloadImage: "Unduh gambar",
      cancel: "Batal",
      preview: "Pratinjau gambar",
      close: "Tutup",
      remove: "Hapus {item}",
      addAll: "Tambah semua {n}",
      removeAll: "Hapus semua {n}",
      limit: "Kamu bisa menambahkan hingga {max}.",
      tooBig: "Terlalu banyak untuk satu gambar. Hapus beberapa.",
      making: "Membuat gambar…",
      shared: "Gambar dibagikan",
      downloaded: "Gambar diunduh",
      shareFailed: "Gagal membagikan. Coba unduh.",
      renderFailed: "Gagal membuat gambar. Coba lagi.",
      trayLabel: "Pilihan gambar",
      setUnavailable: "Set ini belum bisa ditambahkan ke gambar."
    },
    it: {
      hint: "Scegli emoji o simboli da qualsiasi sezione per creare la tua immagine.",
      count: "Selezionati: {n}",
      empty: "Ancora nessuna selezione",
      shareImage: "Condividi immagine",
      downloadImage: "Scarica immagine",
      cancel: "Annulla",
      preview: "Anteprima immagine",
      close: "Chiudi",
      remove: "Rimuovi {item}",
      addAll: "Aggiungi tutti ({n})",
      removeAll: "Rimuovi tutti ({n})",
      limit: "Puoi aggiungerne fino a {max}.",
      tooBig: "Troppi per un’immagine. Rimuovine alcuni.",
      making: "Creazione immagine…",
      shared: "Immagine condivisa",
      downloaded: "Immagine scaricata",
      shareFailed: "Condivisione non riuscita. Prova a scaricarla.",
      renderFailed: "Impossibile creare l’immagine. Riprova.",
      trayLabel: "Selezione per l’immagine",
      setUnavailable: "Questo set non si può ancora aggiungere a un’immagine."
    },
    ja: {
      hint: "好きなセクションから絵文字や記号を選んで、画像を作りましょう。",
      count: "{n}個選択中",
      empty: "まだ何も選んでいません",
      shareImage: "画像を共有",
      downloadImage: "画像をダウンロード",
      cancel: "キャンセル",
      preview: "画像のプレビュー",
      close: "閉じる",
      remove: "{item}を外す",
      addAll: "{n}個すべて追加",
      removeAll: "{n}個すべて外す",
      limit: "追加できるのは{max}個までです。",
      tooBig: "1枚に収まりません。いくつか外してください。",
      making: "画像を作成中…",
      shared: "画像を共有しました",
      downloaded: "画像をダウンロードしました",
      shareFailed: "共有できませんでした。ダウンロードをお試しください。",
      renderFailed: "画像を作成できませんでした。もう一度お試しください。",
      trayLabel: "画像用の選択",
      setUnavailable: "このセットはまだ画像に追加できません。"
    },
    ko: {
      hint: "어느 섹션에서든 이모지나 기호를 골라 이미지를 만드세요.",
      count: "{n}개 선택됨",
      empty: "선택한 항목 없음",
      shareImage: "이미지 공유",
      downloadImage: "이미지 다운로드",
      cancel: "취소",
      preview: "이미지 미리보기",
      close: "닫기",
      remove: "{item} 빼기",
      addAll: "{n}개 모두 추가",
      removeAll: "{n}개 모두 빼기",
      limit: "최대 {max}개까지 추가할 수 있습니다.",
      tooBig: "항목이 너무 많습니다. 일부를 빼 주세요.",
      making: "이미지 만드는 중…",
      shared: "이미지 공유 완료",
      downloaded: "이미지 다운로드 완료",
      shareFailed: "공유하지 못했습니다. 다운로드해 보세요.",
      renderFailed: "이미지를 만들지 못했습니다. 다시 시도하세요.",
      trayLabel: "이미지 선택",
      setUnavailable: "이 세트는 아직 이미지에 넣을 수 없습니다."
    },
    ms: {
      hint: "Pilih emoji atau simbol dari mana-mana bahagian untuk membuat imej anda.",
      count: "{n} dipilih",
      empty: "Belum ada yang dipilih",
      shareImage: "Kongsi imej",
      downloadImage: "Muat turun imej",
      cancel: "Batal",
      preview: "Pratonton imej",
      close: "Tutup",
      remove: "Buang {item}",
      addAll: "Tambah semua {n}",
      removeAll: "Buang semua {n}",
      limit: "Anda boleh tambah sehingga {max}.",
      tooBig: "Terlalu banyak untuk satu imej. Buang sebahagian.",
      making: "Membuat imej…",
      shared: "Imej dikongsi",
      downloaded: "Imej dimuat turun",
      shareFailed: "Gagal berkongsi. Cuba muat turun.",
      renderFailed: "Gagal membuat imej. Cuba lagi.",
      trayLabel: "Pilihan imej",
      setUnavailable: "Set ini belum boleh ditambah ke imej."
    },
    nl: {
      hint: "Kies emoji's of symbolen uit elke sectie voor je afbeelding.",
      count: "{n} geselecteerd",
      empty: "Nog niets geselecteerd",
      shareImage: "Afbeelding delen",
      downloadImage: "Afbeelding downloaden",
      cancel: "Annuleren",
      preview: "Voorbeeld van afbeelding",
      close: "Sluiten",
      remove: "{item} verwijderen",
      addAll: "Alle {n} toevoegen",
      removeAll: "Alle {n} verwijderen",
      limit: "Je kunt er maximaal {max} toevoegen.",
      tooBig: "Te veel voor één afbeelding. Verwijder er een paar.",
      making: "Afbeelding maken…",
      shared: "Afbeelding gedeeld",
      downloaded: "Afbeelding gedownload",
      shareFailed: "Delen mislukt. Probeer te downloaden.",
      renderFailed: "Afbeelding maken mislukt. Probeer het opnieuw.",
      trayLabel: "Selectie voor afbeelding",
      setUnavailable: "Deze set kan nog niet in een afbeelding."
    },
    no: {
      hint: "Velg emojier eller symboler fra hvilken som helst seksjon til bildet ditt.",
      count: "{n} valgt",
      empty: "Ingenting valgt ennå",
      shareImage: "Del bilde",
      downloadImage: "Last ned bilde",
      cancel: "Avbryt",
      preview: "Forhåndsvis bilde",
      close: "Lukk",
      remove: "Fjern {item}",
      addAll: "Legg til alle {n}",
      removeAll: "Fjern alle {n}",
      limit: "Du kan legge til opptil {max}.",
      tooBig: "For mange til ett bilde. Fjern noen.",
      making: "Lager bilde…",
      shared: "Bilde delt",
      downloaded: "Bilde lastet ned",
      shareFailed: "Kunne ikke dele. Prøv å laste ned.",
      renderFailed: "Kunne ikke lage bildet. Prøv igjen.",
      trayLabel: "Bildeutvalg",
      setUnavailable: "Dette settet kan ikke legges i et bilde ennå."
    },
    pl: {
      hint: "Wybierz emoji lub symbole z dowolnej sekcji, żeby stworzyć obraz.",
      count: "Wybrano: {n}",
      empty: "Nic jeszcze nie wybrano",
      shareImage: "Udostępnij obraz",
      downloadImage: "Pobierz obraz",
      cancel: "Anuluj",
      preview: "Podgląd obrazu",
      close: "Zamknij",
      remove: "Usuń {item}",
      addAll: "Dodaj wszystkie ({n})",
      removeAll: "Usuń wszystkie ({n})",
      limit: "Możesz dodać maksymalnie {max}.",
      tooBig: "Za dużo na jeden obraz. Usuń kilka.",
      making: "Tworzenie obrazu…",
      shared: "Obraz udostępniony",
      downloaded: "Obraz pobrany",
      shareFailed: "Nie udało się udostępnić. Spróbuj pobrać.",
      renderFailed: "Nie udało się stworzyć obrazu. Spróbuj ponownie.",
      trayLabel: "Wybór do obrazu",
      setUnavailable: "Tego zestawu nie można jeszcze dodać do obrazu."
    },
    pt: {
      hint: "Escolha emojis ou símbolos de qualquer seção para criar sua imagem.",
      count: "{n} selecionados",
      empty: "Nada selecionado ainda",
      shareImage: "Compartilhar imagem",
      downloadImage: "Baixar imagem",
      cancel: "Cancelar",
      preview: "Prévia da imagem",
      close: "Fechar",
      remove: "Remover {item}",
      addAll: "Adicionar todos ({n})",
      removeAll: "Remover todos ({n})",
      limit: "Você pode adicionar até {max}.",
      tooBig: "Muitos para uma imagem. Remova alguns.",
      making: "Criando imagem…",
      shared: "Imagem compartilhada",
      downloaded: "Imagem baixada",
      shareFailed: "Não deu para compartilhar. Tente baixar.",
      renderFailed: "Não deu para criar a imagem. Tente de novo.",
      trayLabel: "Seleção da imagem",
      setUnavailable: "Este conjunto ainda não pode entrar em uma imagem."
    },
    ro: {
      hint: "Alege emoji sau simboluri din orice secțiune pentru imaginea ta.",
      count: "{n} selectate",
      empty: "Nimic selectat încă",
      shareImage: "Distribuie imaginea",
      downloadImage: "Descarcă imaginea",
      cancel: "Anulează",
      preview: "Previzualizare imagine",
      close: "Închide",
      remove: "Elimină {item}",
      addAll: "Adaugă toate ({n})",
      removeAll: "Elimină toate ({n})",
      limit: "Poți adăuga cel mult {max}.",
      tooBig: "Prea multe pentru o imagine. Elimină câteva.",
      making: "Se creează imaginea…",
      shared: "Imagine distribuită",
      downloaded: "Imagine descărcată",
      shareFailed: "Nu s-a putut distribui. Încearcă descărcarea.",
      renderFailed: "Imaginea nu s-a putut crea. Încearcă din nou.",
      trayLabel: "Selecție pentru imagine",
      setUnavailable: "Acest set nu poate fi adăugat încă într-o imagine."
    },
    ru: {
      hint: "Выберите эмодзи или символы из любого раздела для своей картинки.",
      count: "Выбрано: {n}",
      empty: "Пока ничего не выбрано",
      shareImage: "Поделиться картинкой",
      downloadImage: "Скачать картинку",
      cancel: "Отмена",
      preview: "Предпросмотр картинки",
      close: "Закрыть",
      remove: "Убрать {item}",
      addAll: "Добавить все ({n})",
      removeAll: "Убрать все ({n})",
      limit: "Можно добавить не больше {max}.",
      tooBig: "Слишком много для одной картинки. Уберите часть.",
      making: "Создаём картинку…",
      shared: "Картинка отправлена",
      downloaded: "Картинка скачана",
      shareFailed: "Не удалось поделиться. Попробуйте скачать.",
      renderFailed: "Не удалось создать картинку. Попробуйте ещё раз.",
      trayLabel: "Выбор для картинки",
      setUnavailable: "Этот набор пока нельзя добавить в картинку."
    },
    sk: {
      hint: "Vyber emoji alebo symboly z ľubovoľnej sekcie pre svoj obrázok.",
      count: "Vybrané: {n}",
      empty: "Zatiaľ nič nevybraté",
      shareImage: "Zdieľať obrázok",
      downloadImage: "Stiahnuť obrázok",
      cancel: "Zrušiť",
      preview: "Náhľad obrázka",
      close: "Zavrieť",
      remove: "Odobrať {item}",
      addAll: "Pridať všetky ({n})",
      removeAll: "Odobrať všetky ({n})",
      limit: "Môžeš pridať najviac {max}.",
      tooBig: "Na jeden obrázok je ich priveľa. Niektoré odober.",
      making: "Vytvára sa obrázok…",
      shared: "Obrázok zdieľaný",
      downloaded: "Obrázok stiahnutý",
      shareFailed: "Zdieľanie zlyhalo. Skús stiahnuť.",
      renderFailed: "Obrázok sa nepodarilo vytvoriť. Skús to znova.",
      trayLabel: "Výber pre obrázok",
      setUnavailable: "Túto sadu zatiaľ nemožno pridať do obrázka."
    },
    sr: {
      hint: "Izaberi emodžije ili simbole iz bilo kog odeljka za svoju sliku.",
      count: "Izabrano: {n}",
      empty: "Još ništa nije izabrano",
      shareImage: "Podeli sliku",
      downloadImage: "Preuzmi sliku",
      cancel: "Otkaži",
      preview: "Pregled slike",
      close: "Zatvori",
      remove: "Ukloni {item}",
      addAll: "Dodaj sve ({n})",
      removeAll: "Ukloni sve ({n})",
      limit: "Možeš da dodaš najviše {max}.",
      tooBig: "Previše za jednu sliku. Ukloni nekoliko.",
      making: "Pravim sliku…",
      shared: "Slika podeljena",
      downloaded: "Slika preuzeta",
      shareFailed: "Deljenje nije uspelo. Probaj da preuzmeš.",
      renderFailed: "Slika nije napravljena. Probaj ponovo.",
      trayLabel: "Izbor za sliku",
      setUnavailable: "Ovaj set još ne može da se doda u sliku."
    },
    sv: {
      hint: "Välj emojis eller symboler från valfri sektion till din bild.",
      count: "{n} valda",
      empty: "Inget valt än",
      shareImage: "Dela bild",
      downloadImage: "Ladda ner bild",
      cancel: "Avbryt",
      preview: "Förhandsvisa bild",
      close: "Stäng",
      remove: "Ta bort {item}",
      addAll: "Lägg till alla {n}",
      removeAll: "Ta bort alla {n}",
      limit: "Du kan lägga till högst {max}.",
      tooBig: "För många för en bild. Ta bort några.",
      making: "Skapar bild…",
      shared: "Bild delad",
      downloaded: "Bild nedladdad",
      shareFailed: "Kunde inte dela. Prova att ladda ner.",
      renderFailed: "Kunde inte skapa bilden. Försök igen.",
      trayLabel: "Bildurval",
      setUnavailable: "Den här samlingen kan inte läggas i en bild än."
    },
    th: {
      hint: "เลือกอีโมจิหรือสัญลักษณ์จากส่วนไหนก็ได้เพื่อสร้างรูปภาพของคุณ",
      count: "เลือกแล้ว {n}",
      empty: "ยังไม่ได้เลือก",
      shareImage: "แชร์รูปภาพ",
      downloadImage: "ดาวน์โหลดรูปภาพ",
      cancel: "ยกเลิก",
      preview: "ดูตัวอย่างรูปภาพ",
      close: "ปิด",
      remove: "เอา {item} ออก",
      addAll: "เพิ่มทั้งหมด {n}",
      removeAll: "เอาออกทั้งหมด {n}",
      limit: "เพิ่มได้สูงสุด {max} รายการ",
      tooBig: "มากเกินไปสำหรับรูปเดียว ลองเอาออกบ้าง",
      making: "กำลังสร้างรูปภาพ…",
      shared: "แชร์รูปภาพแล้ว",
      downloaded: "ดาวน์โหลดรูปภาพแล้ว",
      shareFailed: "แชร์ไม่สำเร็จ ลองดาวน์โหลดแทน",
      renderFailed: "สร้างรูปภาพไม่สำเร็จ ลองอีกครั้ง",
      trayLabel: "การเลือกสำหรับรูปภาพ",
      setUnavailable: "ชุดนี้ยังใส่ในรูปภาพไม่ได้"
    },
    tl: {
      hint: "Pumili ng emoji o simbolo mula sa kahit anong seksyon para gawin ang larawan mo.",
      count: "{n} ang napili",
      empty: "Wala pang napili",
      shareImage: "I-share ang larawan",
      downloadImage: "I-download ang larawan",
      cancel: "Kanselahin",
      preview: "I-preview ang larawan",
      close: "Isara",
      remove: "Alisin ang {item}",
      addAll: "Idagdag lahat ({n})",
      removeAll: "Alisin lahat ({n})",
      limit: "Hanggang {max} lang ang puwede.",
      tooBig: "Sobrang dami para sa isang larawan. Mag-alis ng ilan.",
      making: "Ginagawa ang larawan…",
      shared: "Na-share ang larawan",
      downloaded: "Na-download ang larawan",
      shareFailed: "Hindi na-share. Subukang i-download.",
      renderFailed: "Hindi nagawa ang larawan. Subukan ulit.",
      trayLabel: "Pagpili para sa larawan",
      setUnavailable: "Hindi pa maidaragdag ang set na ito sa larawan."
    },
    tr: {
      hint: "Görselin için herhangi bir bölümden emoji veya sembol seç.",
      count: "{n} seçildi",
      empty: "Henüz bir şey seçilmedi",
      shareImage: "Görseli paylaş",
      downloadImage: "Görseli indir",
      cancel: "İptal",
      preview: "Görseli önizle",
      close: "Kapat",
      remove: "Kaldır: {item}",
      addAll: "Tümünü ekle ({n})",
      removeAll: "Tümünü kaldır ({n})",
      limit: "En fazla {max} tane ekleyebilirsin.",
      tooBig: "Bir görsele sığmayacak kadar çok. Birkaçını kaldır.",
      making: "Görsel hazırlanıyor…",
      shared: "Görsel paylaşıldı",
      downloaded: "Görsel indirildi",
      shareFailed: "Paylaşılamadı. İndirmeyi dene.",
      renderFailed: "Görsel oluşturulamadı. Tekrar dene.",
      trayLabel: "Görsel seçimi",
      setUnavailable: "Bu set henüz bir görsele eklenemiyor."
    },
    vi: {
      hint: "Chọn emoji hoặc ký hiệu từ bất kỳ mục nào để tạo ảnh của bạn.",
      count: "Đã chọn {n}",
      empty: "Chưa chọn gì",
      shareImage: "Chia sẻ ảnh",
      downloadImage: "Tải ảnh xuống",
      cancel: "Hủy",
      preview: "Xem trước ảnh",
      close: "Đóng",
      remove: "Bỏ {item}",
      addAll: "Thêm cả {n}",
      removeAll: "Bỏ cả {n}",
      limit: "Bạn có thể thêm tối đa {max}.",
      tooBig: "Quá nhiều cho một ảnh. Hãy bỏ bớt.",
      making: "Đang tạo ảnh…",
      shared: "Đã chia sẻ ảnh",
      downloaded: "Đã tải ảnh xuống",
      shareFailed: "Không chia sẻ được. Thử tải xuống.",
      renderFailed: "Không tạo được ảnh. Thử lại.",
      trayLabel: "Chọn cho ảnh",
      setUnavailable: "Chưa thể thêm bộ này vào ảnh."
    },
    zh: {
      hint: "從任何區塊挑選表情符號或符號，製作你的圖片。",
      count: "已選 {n} 個",
      empty: "尚未選取",
      shareImage: "分享圖片",
      downloadImage: "下載圖片",
      cancel: "取消",
      preview: "預覽圖片",
      close: "關閉",
      remove: "移除 {item}",
      addAll: "全部加入（{n}）",
      removeAll: "全部移除（{n}）",
      limit: "最多可加入 {max} 個。",
      tooBig: "太多了，一張圖放不下。請移除一些。",
      making: "正在製作圖片…",
      shared: "已分享圖片",
      downloaded: "已下載圖片",
      shareFailed: "無法分享，試試下載。",
      renderFailed: "無法製作圖片，請再試一次。",
      trayLabel: "圖片選取",
      setUnavailable: "這組目前還不能加入圖片。"
    },
    uk: {
      hint: "Виберіть емодзі або символи з будь-якого розділу, щоб створити своє зображення.",
      count: "Вибрано: {n}",
      empty: "Ще нічого не вибрано",
      shareImage: "Поділитися зображенням",
      downloadImage: "Завантажити зображення",
      cancel: "Скасувати",
      preview: "Попередній перегляд зображення",
      close: "Закрити",
      remove: "Прибрати {item}",
      addAll: "Додати всі ({n})",
      removeAll: "Прибрати всі ({n})",
      limit: "Можна додати не більше {max}.",
      tooBig: "Забагато для одного зображення. Приберіть частину.",
      making: "Створюємо зображення…",
      shared: "Зображенням поділилися",
      downloaded: "Зображення завантажено",
      shareFailed: "Не вдалося поділитися. Спробуйте завантажити.",
      renderFailed: "Не вдалося створити зображення. Спробуйте ще раз.",
      trayLabel: "Вибрані для зображення",
      setUnavailable: "Цей набір поки не можна додати до зображення."
    }
  };
  /* @image-selection-strings:end */

  const PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const STR = UI_STRINGS[PAGE_LANG] || UI_STRINGS.en;
  const IS_RTL = (document.documentElement.dir || "").toLowerCase() === "rtl" ||
    (!!document.body && getComputedStyle(document.body).direction === "rtl");

  // A page that does load i18n.js (the zh-tw set) wins, as in symbol-explorer.
  function t(key, vars) {
    const i18n = window.UTG_I18N;
    const fetched = i18n && i18n.ui && i18n.ui.imageSelection ? i18n.ui.imageSelection[key] : undefined;
    let s = fetched || STR[key] || UI_STRINGS.en[key] || "";
    if (vars) Object.keys(vars).forEach((k) => { s = s.split("{" + k + "}").join(String(vars[k])); });
    return s;
  }

  /* 50 is where a page of single emoji still draws at about 70px on the
     1080px card; past it, glyphs shrink toward unreadable on a phone. Wide
     items (a kaomoji, a long combo) can stop fitting sooner, which the
     renderer reports and the tray says, rather than exporting it tiny. */
  const MAX_ITEMS = 50;

  /* ---- the selection, as plain data ------------------------------------
     Identity is the exact string. The same heart in two sections is one
     item: choosing it in either lights both, and it is never added twice.
     Exposed so node can test it without a DOM. */
  function createSelection(max) {
    const limit = max || MAX_ITEMS;
    let items = []; // [{ value, label }] in the order chosen
    const has = (v) => items.some((i) => i.value === v);
    return {
      items: () => items.slice(),
      values: () => items.map((i) => i.value),
      has: has,
      count: () => items.length,
      // "added" | "removed" | "limit"
      toggle(value, label) {
        if (has(value)) {
          items = items.filter((i) => i.value !== value);
          return "removed";
        }
        if (items.length >= limit) return "limit";
        items.push({ value: value, label: label || value });
        return "added";
      },
      remove(value) {
        const before = items.length;
        items = items.filter((i) => i.value !== value);
        return items.length !== before;
      },
      // All or nothing: a set that would pass the limit adds none of its
      // members, so a visitor never gets half of ASEAN without being told.
      addMany(list) {
        const fresh = [];
        list.forEach((it) => {
          if (!has(it.value) && !fresh.some((f) => f.value === it.value)) fresh.push(it);
        });
        if (items.length + fresh.length > limit) return { result: "limit", added: 0 };
        fresh.forEach((it) => items.push({ value: it.value, label: it.label || it.value }));
        return { result: "added", added: fresh.length };
      },
      removeMany(values) {
        const drop = new Set(values);
        const before = items.length;
        items = items.filter((i) => !drop.has(i.value));
        return before - items.length;
      },
      clear() { items = []; }
    };
  }

  const sel = createSelection(MAX_ITEMS);
  let active = false;
  let opener = null;       // the entry button that last opened or revealed us
  let busy = false;        // an image is being made or shared
  let tray = null;
  let dialog = null;
  let render = null;       // { version, blob, url, fits } for the current selection
  let version = 0;
  let renderTimer = null;
  let lastShareFailed = false;

  /* ---- analytics --------------------------------------------------------
     image_selection records what people do on the way to an image: start,
     reopen, preview, add_collection, remove_collection, limit, cancel,
     share_cancelled, share_failed, render_failed. None of these is a share.
     A completed share or download is recorded once, by share-core's
     pushShare, as a share event with share_surface "library_selection".
     Never the chosen items: a count is enough to read the feature. Every
     key is pushed on every row (null where it does not apply), because
     GTM's data layer keeps a key's last value. */
  function track(action) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "image_selection",
        selection_action: action,
        selection_count: sel.count(),
        locale: PAGE_LANG
      });
    } catch (e) { /* analytics never breaks the feature */ }
  }

  /* ---- tiles ------------------------------------------------------------ */

  function valueOf(tile) {
    return (tile.getAttribute("data-symbol") || "").trim();
  }

  function drawable(v) {
    return ns.isDrawableSymbol ? ns.isDrawableSymbol(v) : /\S/.test(v);
  }

  // The visible name the page gives the item, else the item itself (a
  // screen reader names an emoji on its own).
  function nameOf(tile) {
    const row = tile.closest(".flag-row");
    const label = row ? row.querySelector(".flag-label") : null;
    const text = label && label.textContent ? label.textContent.trim() : "";
    return text || valueOf(tile);
  }

  function allTiles() {
    return Array.prototype.slice.call(document.querySelectorAll(".symbol-tile[data-symbol]"));
  }

  /* In selection mode a tile is a toggle button named by what it is
     ("Holding back tears, pressed"), not "Copy …", which would no longer be
     true. The original name is kept and put back on exit. */
  function paintTile(tile) {
    const v = valueOf(tile);
    if (!tile.hasAttribute("data-utg-aria")) {
      tile.setAttribute("data-utg-aria", tile.getAttribute("aria-label") || "");
    }
    if (!v || !drawable(v)) {
      // Named by what it is, not "Copy …": pressing it copies nothing here.
      tile.setAttribute("aria-label", nameOf(tile));
      tile.setAttribute("aria-disabled", "true");
      tile.classList.add("is-image-unavailable");
      tile.removeAttribute("aria-pressed");
      return;
    }
    const on = sel.has(v);
    tile.setAttribute("aria-label", nameOf(tile));
    tile.setAttribute("aria-pressed", on ? "true" : "false");
    tile.classList.toggle("is-image-selected", on);
  }

  function paintAllTiles() { allTiles().forEach(paintTile); }

  function restoreTiles() {
    allTiles().forEach((tile) => {
      if (tile.hasAttribute("data-utg-aria")) {
        const a = tile.getAttribute("data-utg-aria");
        if (a) tile.setAttribute("aria-label", a); else tile.removeAttribute("aria-label");
        tile.removeAttribute("data-utg-aria");
      }
      tile.removeAttribute("aria-pressed");
      tile.removeAttribute("aria-disabled");
      tile.classList.remove("is-image-selected", "is-image-unavailable");
    });
  }

  function labelFor(value) {
    const tile = allTiles().find((t2) => valueOf(t2) === value);
    return tile ? nameOf(tile) : value;
  }

  /* ---- named collections -------------------------------------------------
     A set is added only by its own explicit button, "Add all 10", which
     appears inside the set while a selection is open. The entry button
     below a set never selects it. Members then behave like any other item:
     each can be removed on its own from the tray. */
  function collectionEntries() {
    const out = [];
    const reg = ns.collectionGroups ? ns.collectionGroups() : [];
    reg.forEach((entry) => {
      const sections = entry.container.querySelectorAll(".flag-grid-section");
      entry.groups.forEach((g, gi) => {
        const section = sections[gi];
        if (!section || !g || !ns.isMemberList || !ns.isMemberList(g.flags)) return;
        out.push({ section: section, name: g.label || g.name || "", values: g.flags.map((v) => String(v).trim()) });
      });
    });
    return out;
  }

  /* A set whose order, spacing or repetition is the design (a ♪ ˚ ♫ ˚ ♪
     trail, a kaomoji set, text art) is not offered as members: which unit it
     should join as is an open owner decision. Say so on the set, rather than
     leaving it the one thing on the page that silently does nothing. */
  function addCollectionNotes() {
    const reg = ns.collectionGroups ? ns.collectionGroups() : [];
    reg.forEach((entry) => {
      const sections = entry.container.querySelectorAll(".flag-grid-section");
      entry.groups.forEach((g, gi) => {
        const section = sections[gi];
        if (!section || !g || (ns.isMemberList && ns.isMemberList(g.flags))) return;
        if (section.querySelector(".symbol-collection-note")) return;
        const note = el("p", "symbol-collection-note", t("setUnavailable"));
        const display = section.querySelector(".flag-grid-display");
        if (display && display.nextSibling) display.parentNode.insertBefore(note, display.nextSibling);
        else section.appendChild(note);
      });
    });
  }

  let collectionSeq = 0;
  function addCollectionButtons() {
    addCollectionNotes();
    collectionEntries().forEach((c) => {
      if (c.section.querySelector(".symbol-collection-add")) return;
      const heading = c.section.querySelector("h3, h2");
      if (heading && !heading.id) heading.id = "utgSet" + (++collectionSeq);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "symbol-collection-add";
      if (heading) btn.setAttribute("aria-describedby", heading.id);
      btn.addEventListener("click", () => toggleCollection(c, btn));
      const display = c.section.querySelector(".flag-grid-display");
      if (display && display.nextSibling) display.parentNode.insertBefore(btn, display.nextSibling);
      else c.section.appendChild(btn);
      btn._utgValues = c.values;
    });
    paintCollectionButtons();
  }

  function paintCollectionButtons() {
    document.querySelectorAll(".symbol-collection-add").forEach((btn) => {
      const values = btn._utgValues || [];
      const all = values.length && values.every((v) => sel.has(v));
      btn.textContent = all ? t("removeAll", { n: values.length }) : t("addAll", { n: values.length });
      btn.classList.toggle("is-all-selected", !!all);
    });
  }

  function toggleCollection(c, btn) {
    const all = c.values.every((v) => sel.has(v));
    if (all) {
      sel.removeMany(c.values);
      track("remove_collection");
      changed();
      return;
    }
    const r = sel.addMany(c.values.map((v) => ({ value: v, label: labelFor(v) })));
    if (r.result === "limit") {
      say(t("limit", { max: MAX_ITEMS }));
      track("limit");
      return;
    }
    track("add_collection");
    changed();
    if (btn) btn.focus();
  }

  /* ---- the tray ----------------------------------------------------------
     One compact bar, fixed to the bottom of the viewport, above the anchor
     ad when there is one (--utg-anchor-h, published by header.js). The page
     gets matching bottom padding and scroll padding while it is open, so
     the last row of tiles and a keyboard focus ring are never under it. */

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  const X_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function buildChips(list) {
    const ul = el("ul", "utg-sel-chips");
    sel.items().forEach((it) => {
      const li = el("li");
      const b = el("button", "utg-sel-chip");
      b.type = "button";
      b.setAttribute("aria-label", t("remove", { item: it.label && it.label !== it.value ? it.value + " " + it.label : it.value }));
      const glyph = el("span", "utg-sel-chip-glyph", it.value);
      if (window.twemoji && typeof window.twemoji.parse === "function") {
        try { window.twemoji.parse(glyph, { folder: "svg", ext: ".svg" }); } catch (e) { /* text is fine */ }
      }
      b.appendChild(glyph);
      b.insertAdjacentHTML("beforeend", X_ICON);
      b.addEventListener("click", () => {
        // Keep focus in the list: on the next chip, else the previous, else
        // the list's own container, so a keyboard user can keep removing.
        const chips = Array.prototype.slice.call(ul.querySelectorAll(".utg-sel-chip"));
        const i = chips.indexOf(b);
        sel.remove(it.value);
        changed();
        const fresh = Array.prototype.slice.call((list.querySelector(".utg-sel-chips") || list).querySelectorAll(".utg-sel-chip"));
        const target = fresh[i] || fresh[i - 1];
        if (target) target.focus();
        else {
          // The last chip is gone, so Share is disabled and cannot take
          // focus: land on the dialog's Close or the tray's Cancel instead.
          const host = list.closest(".utg-sel-dialog") || list.closest(".utg-selection-tray");
          const fallback = host ? host.querySelector(".utg-sel-dialog-close, .utg-sel-cancel") : null;
          if (fallback) fallback.focus();
        }
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    return ul;
  }

  function renderList(host) {
    host.innerHTML = "";
    if (!sel.count()) {
      host.appendChild(el("p", "utg-sel-empty", t("empty")));
      return;
    }
    host.appendChild(buildChips(host));
  }

  function buildTray() {
    tray = el("section", "utg-selection-tray");
    tray.id = "utgImageSelection";
    tray.setAttribute("aria-label", t("trayLabel"));
    if (IS_RTL) tray.setAttribute("dir", "rtl");

    tray.appendChild(el("p", "utg-sel-hint", t("hint")));

    const body = el("div", "utg-sel-body");
    const thumb = el("button", "utg-sel-thumb");
    thumb.type = "button";
    thumb.setAttribute("aria-label", t("preview"));
    thumb.appendChild(el("img"));
    thumb.querySelector("img").alt = "";
    thumb.addEventListener("click", () => openDialog(thumb, "preview"));
    body.appendChild(thumb);

    const main = el("div", "utg-sel-main");
    const count = el("p", "utg-sel-count");
    count.setAttribute("aria-live", "polite");
    main.appendChild(count);
    main.appendChild(el("div", "utg-sel-list"));
    body.appendChild(main);
    tray.appendChild(body);

    const status = el("p", "utg-sel-status");
    status.setAttribute("role", "status");
    tray.appendChild(status);
    // Spoken-only messages (entering the mode), so the hint is not printed
    // a second time under itself.
    const sr = el("p", "utg-sel-sr");
    sr.setAttribute("aria-live", "polite");
    tray.appendChild(sr);

    const actions = el("div", "utg-sel-actions");
    const cancel = el("button", "utg-sel-cancel", t("cancel"));
    cancel.type = "button";
    cancel.addEventListener("click", () => { track("cancel"); close(); });
    actions.appendChild(cancel);
    actions.appendChild(buildDownloadButton());
    actions.appendChild(buildShareButton());
    tray.appendChild(actions);

    document.body.appendChild(tray);

    if (typeof ResizeObserver === "function") {
      new ResizeObserver(syncTrayHeight).observe(tray);
    }
    syncTrayHeight();
  }

  function syncTrayHeight() {
    if (!tray) return;
    document.documentElement.style.setProperty("--utg-sel-tray-h", tray.offsetHeight + "px");
  }

  // The primary action. Says Download outright where this browser cannot
  // hand a file to the share sheet (most desktops), rather than promising a
  // share and then saving a file.
  function primaryIsShare() {
    return !!(ns.canShareFiles && ns.canShareFiles());
  }

  function buildShareButton() {
    const b = el("button", "utg-sel-share");
    b.type = "button";
    b.innerHTML = (ns.icons && ns.icons.image ? ns.icons.image : "") + '<span class="utg-sel-share-label"></span>';
    b.addEventListener("click", () => shareImage(b, primaryIsShare() ? "share" : "download"));
    return b;
  }

  // Shown only after a share attempt failed on a device that can share
  // files: the way out that keeps the selection.
  function buildDownloadButton() {
    const b = el("button", "utg-sel-download", t("downloadImage"));
    b.type = "button";
    b.hidden = true;
    b.addEventListener("click", () => shareImage(b, "download"));
    return b;
  }

  function paintSurface(host) {
    if (!host) return;
    const n = sel.count();
    const fits = !render || render.fits !== false;
    const count = host.querySelector(".utg-sel-count");
    if (count) count.textContent = t("count", { n: n });
    const list = host.querySelector(".utg-sel-list");
    if (list) renderList(list);
    host.querySelectorAll(".utg-sel-share").forEach((b) => {
      const label = b.querySelector(".utg-sel-share-label");
      if (label) label.textContent = busy ? t("making") : (primaryIsShare() ? t("shareImage") : t("downloadImage"));
      const off = busy || !n || !fits;
      b.disabled = !n || !fits;
      b.setAttribute("aria-disabled", off ? "true" : "false");
      b.classList.toggle("is-busy", busy);
    });
    host.querySelectorAll(".utg-sel-download").forEach((b) => {
      b.hidden = !(lastShareFailed && primaryIsShare());
      b.disabled = !n || !fits;
    });
    const thumb = host.querySelector(".utg-sel-thumb");
    if (thumb) {
      thumb.hidden = !n;
      const img = thumb.querySelector("img");
      if (img && render && render.url && img.src !== render.url) img.src = render.url;
    }
    const preview = host.querySelector(".utg-sel-preview");
    if (preview) {
      preview.hidden = !n;
      if (render && render.url && preview.src !== render.url) preview.src = render.url;
      preview.alt = sel.items().map((i) => (i.label && i.label !== i.value ? i.label : i.value)).join(", ");
    }
  }

  function paint() {
    paintSurface(tray);
    if (dialog && dialog.open) paintSurface(dialog);
    syncTrayHeight();
  }

  function currentStatus() {
    const st = tray && tray.querySelector(".utg-sel-status");
    return st ? st.textContent : "";
  }

  function say(msg) {
    [tray, dialog].forEach((host) => {
      const s = host && host.querySelector(".utg-sel-status");
      if (s) s.textContent = msg || "";
    });
  }

  /* ---- the image ---------------------------------------------------------
     One render per selection state, reused by the tray thumbnail, the
     preview and the export, so what the visitor previews is byte for byte
     what they share. */

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      makeRender().catch(() => { if (active) say(t("renderFailed")); });
    }, 120);
  }

  /* Pages that show their emoji as Twemoji pictures (the flags pages) get
     the same pictures on the card, so the image matches what was tapped:
     without this, Windows, which has no colour flag glyphs, exported
     "SG MY ID" for flags the page showed as flags. Loaded with CORS so the
     canvas stays exportable; anything that fails to load falls back to the
     device's own glyph rather than holding the image up. */
  const artCache = {};
  function twemojiUrl(value) {
    if (!window.twemoji || typeof window.twemoji.parse !== "function") return null;
    const probe = document.createElement("span");
    probe.textContent = value;
    try { window.twemoji.parse(probe, { folder: "svg", ext: ".svg" }); } catch (e) { return null; }
    const imgs = probe.querySelectorAll("img");
    // Only a value that is exactly one picture and nothing else; a kaomoji
    // with one emoji inside it stays text.
    if (imgs.length !== 1 || probe.textContent.replace(imgs[0].alt || "", "").trim()) return null;
    return imgs[0].src || null;
  }
  function loadArt(url) {
    if (!artCache[url]) {
      artCache[url] = new Promise((resolve) => {
        const img = new Image();
        // A stalled request (slow CDN, a blocker that hangs rather than
        // fails) must not hold the image up: after 1.5s the device glyph is
        // used, and a Share tap is not left waiting on the network.
        const timer = setTimeout(() => { delete artCache[url]; resolve(null); }, 1500);
        img.crossOrigin = "anonymous";
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
      });
    }
    return artCache[url];
  }
  function artworkFor(values) {
    if (!window.twemoji) return Promise.resolve(null);
    return Promise.all(values.map((v) => {
      const url = twemojiUrl(v);
      return url ? loadArt(url).then((img) => [v, img]) : Promise.resolve([v, null]);
    })).then((pairs) => {
      const map = new Map();
      pairs.forEach((p) => { if (p[1]) map.set(p[0], p[1]); });
      return map.size ? map : null;
    });
  }

  function toBlob(canvas) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png");
      } catch (err) {
        reject(err); // a tainted canvas throws SecurityError here
      }
    });
  }

  // One render per selection version. A second caller (Share pressed while
  // the debounced render is still running) waits for the same one.
  let inflight = null;
  function makeRender() {
    const v = version;
    if (render && render.version === v) return Promise.resolve(render);
    if (inflight && inflight.version === v) return inflight.promise;
    if (!sel.count()) {
      dropRender();
      paint();
      return Promise.resolve(null);
    }
    const values = sel.values();
    const draw = (images) => {
      const out = ns.renderSelectionImage(values, { rtl: IS_RTL, images: images });
      if (!out) throw new Error("render");
      return toBlob(out.canvas).then((blob) => ({ blob: blob, fits: out.fits }));
    };
    const promise = artworkFor(values)
      .then((images) => draw(images).catch((err) => {
        if (!images) throw err;
        console.warn("Selection artwork unusable, drawing system glyphs:", err);
        return draw(null);
      }))
      .then((res) => {
        if (inflight && inflight.version === v) inflight = null;
        if (v !== version) return makeRender(); // changed meanwhile
        dropRender();
        render = { version: v, blob: res.blob, url: URL.createObjectURL(res.blob), fits: res.fits };
        // Only this render's own message is cleared here: a "you can add
        // up to 50" said a moment ago must stay on screen.
        if (!res.fits) say(t("tooBig"));
        else if (currentStatus() === t("tooBig")) say("");
        paint();
        return render;
      }, (err) => {
        if (inflight && inflight.version === v) inflight = null;
        console.error("Selection image failed:", err);
        throw err;
      });
    inflight = { version: v, promise: promise };
    return promise;
  }

  function dropRender() {
    if (render && render.url) {
      const old = render.url;
      setTimeout(() => URL.revokeObjectURL(old), 4000);
    }
    render = null;
  }

  async function shareImage(btn, mode) {
    if (busy || !sel.count()) return;
    busy = true;
    say("");
    paint();
    let r;
    try {
      clearTimeout(renderTimer);
      r = await makeRender();
    } catch (err) {
      r = null;
    }
    if (!active) { busy = false; return; } // Cancel pressed while rendering
    if (!r) {
      busy = false;
      say(t("renderFailed"));
      track("render_failed");
      paint();
      refocus(btn);
      return;
    }
    if (!r.fits) {
      busy = false;
      paint();
      refocus(btn);
      return;
    }
    let outcome;
    try {
      outcome = await ns.shareImageBlob(r.blob, {
        filename: "ultratextgen-emoji.png",
        surface: "library_selection",
        itemType: "selection",
        format: "png",
        noTitle: true,
        downloadOnError: false,
        mode: mode === "download" ? "download" : undefined
      });
    } catch (err) {
      console.error("Selection share failed:", err);
      outcome = "failed";
    }
    busy = false;
    if (!active) return; // Cancel was pressed while the sheet was open
    if (outcome === "native") {
      lastShareFailed = false;
      say(t("shared"));
    } else if (outcome === "downloaded") {
      lastShareFailed = false;
      say(t("downloaded"));
    } else if (outcome === "aborted") {
      // Closing the share sheet is not an error and not a share. The
      // selection stays exactly as it was, ready for another try.
      say("");
      track("share_cancelled");
    } else {
      lastShareFailed = true;
      say(t("shareFailed"));
      track("share_failed");
    }
    paint();
    refocus(btn);
  }

  // Disabling a focused button drops focus to <body>; put it back.
  function refocus(btn) {
    if (btn && btn.isConnected && !btn.hidden && document.activeElement === document.body) btn.focus();
  }

  /* ---- the preview dialog ------------------------------------------------
     A native modal <dialog>: the browser traps focus, Escape closes it, and
     the page behind is inert. Focus returns to whatever opened it. */

  function buildDialog() {
    dialog = el("dialog", "utg-sel-dialog");
    dialog.id = "utgImageSelectionDialog";
    dialog.setAttribute("aria-labelledby", "utgSelDialogTitle");
    if (IS_RTL) dialog.setAttribute("dir", "rtl");

    const head = el("div", "utg-sel-dialog-head");
    const h = el("h2", "utg-sel-dialog-title", t("preview"));
    h.id = "utgSelDialogTitle";
    head.appendChild(h);
    const x = el("button", "utg-sel-dialog-close");
    x.type = "button";
    x.setAttribute("aria-label", t("close"));
    x.innerHTML = X_ICON;
    x.addEventListener("click", () => dialog.close());
    head.appendChild(x);
    dialog.appendChild(head);

    const img = el("img", "utg-sel-preview");
    img.alt = "";
    dialog.appendChild(img);

    const count = el("p", "utg-sel-count");
    count.setAttribute("aria-live", "polite");
    dialog.appendChild(count);
    dialog.appendChild(el("div", "utg-sel-list"));

    const status = el("p", "utg-sel-status");
    status.setAttribute("role", "status");
    dialog.appendChild(status);

    const actions = el("div", "utg-sel-actions");
    const closeBtn = el("button", "utg-sel-cancel", t("close"));
    closeBtn.type = "button";
    closeBtn.addEventListener("click", () => dialog.close());
    actions.appendChild(closeBtn);
    actions.appendChild(buildDownloadButton());
    actions.appendChild(buildShareButton());
    dialog.appendChild(actions);

    // A press on the backdrop (outside the box) closes it, as people expect.
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    });
    dialog.addEventListener("close", () => {
      const back = dialog._utgReturn;
      dialog._utgReturn = null;
      if (back && back.isConnected) back.focus();
    });
    document.body.appendChild(dialog);
  }

  function openDialog(from, action) {
    if (!dialog) buildDialog();
    if (typeof dialog.showModal !== "function") {
      // No <dialog> support: the tray already carries every control.
      if (tray) tray.querySelector(".utg-sel-share").focus();
      return;
    }
    dialog._utgReturn = from || null;
    if (!dialog.open) dialog.showModal();
    track(action || "preview");
    makeRender().catch(() => { say(t("renderFailed")); });
    paint();
    // Start on the primary action when there is something to share, else
    // on Close: never on a disabled control.
    const primary = dialog.querySelector(".utg-sel-share");
    if (sel.count() && primary && !primary.disabled) primary.focus();
    else dialog.querySelector(".utg-sel-dialog-close").focus();
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  function announceChange() {
    document.dispatchEvent(new CustomEvent("utg:imageselectionchange", {
      detail: { active: active, count: sel.count() }
    }));
  }

  function changed() {
    version++;
    paintAllTiles();
    paintCollectionButtons();
    lastShareFailed = false;
    say("");
    paint();
    scheduleRender();
    announceChange();
  }

  function open(entry) {
    opener = entry || null;
    if (active) {
      // Every entry button controls this one selection: pressing any of
      // them again shows it, never resets it.
      openDialog(entry, "reopen");
      return;
    }
    active = true;
    sel.clear();
    version++;
    document.documentElement.classList.add("utg-image-selecting");
    if (!tray) buildTray();
    tray.hidden = false;
    say(""); // nothing from a previous session carries over
    paintAllTiles();
    addCollectionButtons();
    paint();
    // The instruction, spoken once on entry; it also stays on screen. Set
    // after a beat so the new live region is in the tree before it changes.
    const sr = tray.querySelector(".utg-sel-sr");
    if (sr) { sr.textContent = ""; setTimeout(() => { sr.textContent = t("hint"); }, 60); }
    track("start");
    announceChange();
  }

  function close() {
    if (!active) return;
    active = false;
    sel.clear();
    version++;
    lastShareFailed = false;
    clearTimeout(renderTimer);
    dropRender();
    if (dialog && dialog.open) dialog.close();
    if (tray) {
      tray.hidden = true;
      say("");
      const sr = tray.querySelector(".utg-sel-sr");
      if (sr) sr.textContent = "";
    }
    document.documentElement.classList.remove("utg-image-selecting");
    document.documentElement.style.removeProperty("--utg-sel-tray-h");
    restoreTiles();
    document.querySelectorAll(".symbol-collection-add, .symbol-collection-note").forEach((b) => b.remove());
    announceChange();
    // Without preventScroll the page jumped to the entry button, up to a
    // couple of thousand pixels away from where the visitor was working.
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }

  function toggleTile(tile) {
    if (!active || !tile) return;
    const v = valueOf(tile);
    if (!v || !drawable(v)) return;
    const r = sel.toggle(v, nameOf(tile));
    if (r === "limit") {
      say(t("limit", { max: MAX_ITEMS }));
      track("limit");
      return;
    }
    changed();
  }

  // A saved-strip re-render rebuilds its tiles; paint the new ones.
  document.addEventListener("utg:savedchange", () => { if (active) paintAllTiles(); });

  ns.imageSelection = {
    open: open,
    close: close,
    isActive: () => active,
    count: () => sel.count(),
    values: () => sel.values(),
    toggleTile: toggleTile,
    MAX_ITEMS: MAX_ITEMS
  };
  ns.createImageSelection = createSelection;
})();
