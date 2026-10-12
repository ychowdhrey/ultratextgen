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
  //     Paweł  → Pawel · Đông → Dông
  // Turkish ı passes through as typed (a dotted i would be another letter).
  // ß æ œ are the exception: they stand for two letters, so renderer.js writes
  // them out (Straße → Strasse, cœur → coeur) and nothing is lost.
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

  /* ---- Letters from another script (English pages only) -----------------

     The styles are built from the Latin alphabet. Typed Cyrillic, Arabic,
     Thai, Hebrew, Devanagari, Korean, Japanese or Chinese text comes back in
     its own shape from about half of them, and from the rest with spacing,
     lines or marks added, so a visitor who types `жирный шрифт` sees the same
     letters under every card and nothing says why. This says it once, and says
     what still works.

     English pages only: the sentence has no translation yet, and the accent
     notice above is the precedent for a locale getting its own wording rather
     than an English line on a translated page. It is built here rather than in
     the page so no HTML changes; it reuses the accent notice's own styling and
     sits right after it. Any letter that is not Latin counts, so the test is
     the script of each letter and not a list of languages. */
  var lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  if (lang !== 'en' && lang.indexOf('en-') !== 0) return;

  var scriptNotice = document.createElement('div');
  scriptNotice.className = 'accent-notice';
  scriptNotice.id = 'scriptNotice';
  scriptNotice.setAttribute('role', 'note');
  scriptNotice.hidden = true;
  scriptNotice.innerHTML =
    '<span class="accent-notice-icon" aria-hidden="true">Aa</span>' +
    '<span class="accent-notice-text">These styles are built from the Latin alphabet, so letters from other scripts keep their own shape. Styles that only add spacing, lines or marks still work on them, and any English letters and numbers in the same text are styled.</span>' +
    '<button type="button" class="accent-notice-close" id="scriptNoticeClose" aria-label="Dismiss">\u2715</button>';
  notice.parentNode.insertBefore(scriptNotice, notice.nextSibling);

  var scriptDismissed = false;
  var LETTER = /\p{L}/u;
  var LATIN = /\p{Script=Latin}/u;

  function hasOtherScript(value) {
    if (!value) return false;
    for (var ch of value) {
      if (LETTER.test(ch) && !LATIN.test(ch)) return true;
    }
    return false;
  }

  function updateScript() {
    if (scriptDismissed) return;
    scriptNotice.hidden = !hasOtherScript(input.value);
  }

  input.addEventListener('input', updateScript);
  scriptNotice.querySelector('#scriptNoticeClose').addEventListener('click', function () {
    scriptDismissed = true;
    scriptNotice.hidden = true;
  });
  updateScript();
})();
