/* ==========================================================================
   UltraTextGen — accent-notice.js

   Input-aware hint. Watches the generator's input and, only when the user
   has typed accented / diacritic characters (á é ñ ü ç, Vietnamese ữ ế đ …),
   reveals a small note explaining that most styles leave accented letters
   plain and pointing to the styles that keep them. Silent for plain ASCII,
   so English users never see it.

   Companion to the guide at /guide/fancy-fonts-and-accents/ and the accent
   classification in data/accent-support.json.
   ========================================================================== */

(function () {
  "use strict";

  const input = document.getElementById('mainInput');
  const notice = document.getElementById('accentNotice');
  if (!input || !notice) return;

  const closeBtn = document.getElementById('accentNoticeClose');
  let dismissed = false;

  // True when the text carries a diacritic. Decomposing to NFD turns every
  // precomposed accented Latin/Vietnamese letter into base + a combining mark
  // (U+0300–U+036F), so one test covers á, ñ, ü, ữ, ế and the rest. đ/Đ has no
  // decomposition and no combining mark, so it is checked explicitly.
  function hasAccentedText(value) {
    if (!value) return false;
    if (/[đĐ]/.test(value)) return true;          // đ / Đ
    return /[̀-ͯ]/.test(value.normalize('NFD'));  // combining marks
  }

  function update() {
    if (dismissed) return;
    notice.hidden = !hasAccentedText(input.value);
  }

  input.addEventListener('input', update);

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      dismissed = true;
      notice.hidden = true;
    });
  }

  // Reflect any text already present (e.g. restored from ?q= or autofill).
  update();
})();
