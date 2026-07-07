/* ==========================================================================
   UltraTextGen — tattooData.js
   Data for the tattoo lettering studio: curated lettering styles, digit
   fonts for dates, roman-numeral rendering styles, monogram joiners and
   the tattoo symbol library. Data only — logic lives in
   tattooPageController.js.
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_TATTOO_DATA = {

    /* ----------------------------------------------------------------------
       Curated lettering, most-requested first. `key` must exist in
       window.textStyles. `hold` drives the aging badge:
         'safe'  — keeps its shape at small sizes
         'roomy' — thin strokes / small loops, needs room to age well
       ---------------------------------------------------------------------- */
    LETTERING: [
      {
        key: 'Ultra Script Bold', label: 'Bold Script', family: 'Script', hold: 'safe',
        note: 'The classic name tattoo — connected and warm, holds its shape at small sizes.'
      },
      {
        key: 'Ultra Script', label: 'Fine Script', family: 'Script', hold: 'roomy',
        note: 'Delicate and airy — beautiful at medium size; the thin loops need room to age well.'
      },
      {
        key: 'Ultra Chicano Script', label: 'Chicano Nameplate', family: 'Script', hold: 'safe',
        note: 'Bold script inside an ornamental banner — the classic nameplate framing.'
      },
      {
        key: 'Ultra Gothic', label: 'Gothic Blackletter', family: 'Gothic', hold: 'roomy',
        note: 'Fraktur blackletter — dense and assertive, built to carry a strong word.'
      },
      {
        key: 'Ultra Gothic Bold', label: 'Heavy Old English', family: 'Gothic', hold: 'safe',
        note: 'The heavy Old English look — an old-school and Chicano lettering staple.'
      },
      {
        key: 'Ultra Old English Banner', label: 'Old English Banner', family: 'Gothic', hold: 'safe',
        note: 'Heavy blackletter in a banner — a nameplate with maximum presence.'
      },
      {
        key: 'Ultra Italic', label: 'Fine Italic', family: 'Italic', hold: 'safe',
        note: 'Understated slant — slips quietly along a rib, wrist or collarbone.'
      },
      {
        key: 'Ultra Italic Serif', label: 'Italic Serif', family: 'Italic', hold: 'safe',
        note: 'Bookish serif italic — reads like a line lifted from a novel.'
      },
      {
        key: 'Ultra Typewriter Document', label: 'Typewriter', family: 'Minimal', hold: 'safe',
        note: 'Raw, literary monospace — perfect for a date or a short line.'
      },
      {
        key: 'Ultra Small Caps', label: 'Small Caps', family: 'Minimal', hold: 'safe',
        note: 'Tiny even capitals — the fine-line minimalist pick.'
      }
    ],

    /* ----------------------------------------------------------------------
       Styles used to render roman numerals (letters I V X L C D M).
       `key: null` = plain unstyled letters.
       ---------------------------------------------------------------------- */
    ROMAN_STYLES: [
      { key: null,                        label: 'Classic',           note: 'Plain capitals — what most artists ink.' },
      { key: 'Ultra Italic Serif',        label: 'Serif Italic',      note: 'The engraved-monument look, slanted.' },
      { key: 'Ultra Script Bold',         label: 'Script',            note: 'Roman numerals in flowing script.' },
      { key: 'Ultra Gothic',              label: 'Blackletter',       note: 'Fraktur numerals — dark and ornate.' },
      { key: 'Ultra Gothic Bold',         label: 'Heavy Old English', note: 'Maximum-weight blackletter numerals.' },
      { key: 'Ultra Typewriter Document', label: 'Typewriter',        note: 'Monospaced numerals — clean and documentary.' }
    ],

    /* ----------------------------------------------------------------------
       Digit fonts for plain-figure dates and numbers.
       `digits` maps 0–9 in order.
       ---------------------------------------------------------------------- */
    DIGIT_FONTS: [
      { label: 'Typewriter',    digits: '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿', note: 'Monospace figures — the classic date look.' },
      { label: 'Bold Serif',    digits: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗', note: 'Heavy bookface figures — pairs with blackletter.' },
      { label: 'Bold Sans',     digits: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵', note: 'Modern heavy figures — pairs with bold script.' },
      { label: 'Fine Sans',     digits: '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫', note: 'Light figures — pairs with fine script and italic.' },
      { label: 'Double-Struck', digits: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡', note: 'Outlined figures — an unexpected fine-line pick.' },
      { label: 'Wide Spaced',   digits: '０１２３４５６７８９', note: 'Fullwidth figures — airy, editorial spacing.' },
      { label: 'Tiny',          digits: '⁰¹²³⁴⁵⁶⁷⁸⁹', note: 'Miniature figures — behind-the-ear scale.' }
    ],

    /* Separators offered between date parts. `ch` is what goes in the text. */
    DATE_SEPARATORS: [
      { id: 'interpunct', label: '·',       ch: ' · ' },
      { id: 'period',     label: '.',       ch: '.' },
      { id: 'dash',       label: '–',       ch: ' – ' },
      { id: 'bar',        label: '|',       ch: ' | ' },
      { id: 'space',      label: 'space',   ch: '  ' },
      { id: 'stack',      label: 'stacked', ch: '\n' }
    ],

    /* Date part orders. */
    DATE_ORDERS: [
      { id: 'dmy', label: 'Day · Month · Year' },
      { id: 'mdy', label: 'Month · Day · Year' },
      { id: 'y',   label: 'Year only' }
    ],

    /* Joiners between two initials in a monogram. */
    JOINERS: [
      { id: 'none',   label: 'None',  ch: ' ' },
      { id: 'heart',  label: '♡',     ch: ' ♡ ' },
      { id: 'inf',    label: '∞',     ch: ' ∞ ' },
      { id: 'dot',    label: '·',     ch: ' · ' },
      { id: 'amp',    label: '&',     ch: ' & ' },
      { id: 'cross',  label: '✕',     ch: ' ✕ ' },
      { id: 'star',   label: '⋆',     ch: ' ⋆ ' }
    ],

    /* ----------------------------------------------------------------------
       Tattoo symbol library. Broadly-supported glyphs only; every symbol
       carries the meaning people search for.
       ---------------------------------------------------------------------- */
    SYMBOL_GROUPS: [
      {
        id: 'minimal', label: 'Fine line & minimal',
        items: [
          { ch: ';',  name: 'Semicolon — the story continues' },
          { ch: '∞',  name: 'Infinity — without end' },
          { ch: '·',  name: 'Single dot — a pause' },
          { ch: '—',  name: 'Dash — a line, a path' },
          { ch: '~',  name: 'Wave — calm, flow' },
          { ch: '✕',  name: 'Cross mark — a crossing point' },
          { ch: '°',  name: 'Small circle — wholeness' },
          { ch: '⋮',  name: 'Three dots — mi vida loca / unfinished' }
        ]
      },
      {
        id: 'celestial', label: 'Celestial',
        items: [
          { ch: '☾', name: 'Crescent moon — change, cycles' },
          { ch: '☽', name: 'Waxing moon — growth' },
          { ch: '☼', name: 'Sun — vitality' },
          { ch: '✦', name: 'Four-point star — guidance' },
          { ch: '✧', name: 'Open star — hope' },
          { ch: '⋆', name: 'Small star — a quiet spark' },
          { ch: '★', name: 'Filled star — ambition' },
          { ch: '✵', name: 'Rayed star — energy' }
        ]
      },
      {
        id: 'love', label: 'Love & remembrance',
        items: [
          { ch: '♡', name: 'Open heart — love, lightly held' },
          { ch: '❥', name: 'Turned heart — devotion' },
          { ch: '❦', name: 'Floral heart — remembrance' },
          { ch: '➳', name: 'Arrow — struck by love' },
          { ch: '✿', name: 'Flower — in bloom' },
          { ch: '❀', name: 'Blossom — memory of someone' }
        ]
      },
      {
        id: 'faith', label: 'Faith & protection',
        items: [
          { ch: '✝', name: 'Latin cross — faith' },
          { ch: '†', name: 'Dagger cross — sacrifice' },
          { ch: '☦', name: 'Orthodox cross' },
          { ch: '☯', name: 'Yin yang — balance' },
          { ch: 'ॐ', name: 'Om — the first sound' },
          { ch: '✡', name: 'Star of David' },
          { ch: '☪', name: 'Star and crescent' },
          { ch: 'ᛉ', name: 'Algiz rune — protection' }
        ]
      },
      {
        id: 'journey', label: 'Strength & journey',
        items: [
          { ch: '⚓', name: 'Anchor — hold fast' },
          { ch: '✈', name: 'Plane — leaving, returning' },
          { ch: '➵', name: 'Arrow — forward only' },
          { ch: '→', name: 'Arrow right — onward' },
          { ch: '⚔', name: 'Crossed swords — fight on' },
          { ch: '♆', name: 'Trident — the sea' },
          { ch: 'Δ',  name: 'Delta — change' },
          { ch: 'Ω',  name: 'Omega — the end, endurance' }
        ]
      },
      {
        id: 'music', label: 'Music & art',
        items: [
          { ch: '♪', name: 'Eighth note' },
          { ch: '♫', name: 'Beamed notes' },
          { ch: '♬', name: 'Double beamed notes' },
          { ch: '𝄞', name: 'Treble clef' },
          { ch: '✎', name: 'Pencil — maker’s mark' }
        ]
      },
      {
        id: 'zodiac', label: 'Zodiac',
        items: [
          { ch: '♈', name: 'Aries' },
          { ch: '♉', name: 'Taurus' },
          { ch: '♊', name: 'Gemini' },
          { ch: '♋', name: 'Cancer' },
          { ch: '♌', name: 'Leo' },
          { ch: '♍', name: 'Virgo' },
          { ch: '♎', name: 'Libra' },
          { ch: '♏', name: 'Scorpio' },
          { ch: '♐', name: 'Sagittarius' },
          { ch: '♑', name: 'Capricorn' },
          { ch: '♒', name: 'Aquarius' },
          { ch: '♓', name: 'Pisces' }
        ]
      }
    ]
  };
})();
