/* ==========================================================================
   UltraTextGen — accent-notice.js

   Input-aware hint. Watches the generator's input and, only when the user
   has typed accented / diacritic characters (á é ñ ü ç, Vietnamese ữ ế đ …),
   reveals a small note explaining that the generator keeps accents styled
   (renderer.js reattaches the original combining mark to the styled base
   letter) and flagging the remaining exceptions — upside-down styles, and
   the handful of Latin-extended letters with no Unicode decomposition to
   carry a mark on (ł, đ, ø, ß, ı …). Silent for plain ASCII, so English
   users never see it.

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
  // (U+0300–U+036F), so one test covers á, ñ, ü, ữ, ế and the rest (İ included
  // — it decomposes to I + combining dot above). đ/Đ and Turkish dotless ı
  // have no decomposition and no combining mark, so they're checked explicitly.
  // Every Latin letter that has NO Unicode decomposition, so NFD cannot turn it
  // into base + combining mark and renderer.js's BASE_LETTER_FALLBACK folds it
  // to a plain ASCII letter instead. Measured 2026-08-31: 63 of 106 non-redact
  // styles do this, regardless of a style's own accentSafe flag, so the notice
  // is the only thing that can warn the user. What it costs them:
  //     Straße → Strase   (ß→s, not ss — a letter is lost)
  //     cœur   → cour     (a different French word)
  //     Paweł  → Pawel · æble → able · Đông → Dông · ışık → isik
  // The original test covered only đ/Đ/ı, so ł ø ß æ œ þ ð ħ could never
  // trigger it — silently, on the eight European locales that need it most.
  var UNDECOMPOSABLE = /[łŁđĐıøØßẞæÆœŒðÐþÞħĦ]/;

  function hasAccentedText(value) {
    if (!value) return false;
    if (UNDECOMPOSABLE.test(value)) return true;
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
