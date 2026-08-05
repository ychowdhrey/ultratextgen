/* ==========================================================================
   UltraTextGen — decoratorPageController.js
   Takes over rendering for the text decorator page.
   Must be loaded AFTER script.js (which it suppresses via UTG_DECORATOR_MODE).
   Requires: decoratorData.js, decoratorEngine.js; renderer.js + styles.js
   for the optional font layer.
   ========================================================================== */

(function () {
  "use strict";

  var Engine = window.UTGDecoratorEngine;
  var Render = window.UltraTextGenRender;
  var stylesRegistry = window.textStyles || {};

  if (!Engine) return;

  var PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var UI = {
    en: {
      allVibes: 'All vibes',
      vibe: 'Vibe',
      decorate: 'Decorate',
      wholeText: 'Whole text',
      eachWord: 'Each word',
      eachLetter: 'Each letter',
      intensity: 'Intensity',
      light: 'Light',
      normal: 'Normal',
      extra: 'Extra',
      font: 'Font',
      normalText: 'Normal text',
      yourSymbol: 'Your symbol',
      symbolPlaceholder: '🇵🇰 ★ 🐐 …',
      symbolTitle: 'Paste any emoji or symbol to decorate your text with it',
      shuffle: '🎲 Shuffle',
      shuffleTitle: 'Generate a fresh set of decorations',
      empty: 'Type something above to decorate it.',
      copy: 'Copy',
      sample: 'Hello World',
      themes: {}
    },
    tr: {
      allVibes: 'Tüm tarzlar',
      vibe: 'Tarz',
      decorate: 'Süsleme',
      wholeText: 'Tüm metin',
      eachWord: 'Her kelime',
      eachLetter: 'Her harf',
      intensity: 'Yoğunluk',
      light: 'Hafif',
      normal: 'Normal',
      extra: 'Ekstra',
      font: 'Font',
      normalText: 'Normal yazı',
      yourSymbol: 'Sembolün',
      symbolPlaceholder: '🇹🇷 ★ ♡ …',
      symbolTitle: 'Metnini süslemek için herhangi bir emoji veya sembol yapıştır',
      shuffle: '🎲 Karıştır',
      shuffleTitle: 'Yeni süslemeler oluştur',
      empty: 'Süslemek için yukarıya bir şey yaz.',
      copy: 'Kopyala',
      sample: 'Merhaba Dünya',
      themes: {
        sparkle: 'Parıltı',
        hearts: 'Kalpler',
        coquette: 'Coquette',
        kawaii: 'Kawaii',
        gaming: 'Oyun',
        gothic: 'Gotik',
        celestial: 'Gökyüzü',
        flowers: 'Çiçekler',
        birthday: 'Doğum günü',
        energy: 'Ateş ve buz',
        y2k: 'Y2K',
        arrows: 'Oklar',
        music: 'Müzik',
        minimal: 'Minimal',
        brackets: 'Parantezler',
        custom: 'Özel'
      }
    },
    es: {
      allVibes: 'Todos los estilos',
      vibe: 'Estilo',
      decorate: 'Decorar',
      wholeText: 'Todo el texto',
      eachWord: 'Cada palabra',
      eachLetter: 'Cada letra',
      intensity: 'Intensidad',
      light: 'Suave',
      normal: 'Normal',
      extra: 'Extra',
      font: 'Fuente',
      normalText: 'Texto normal',
      yourSymbol: 'Tu símbolo',
      symbolPlaceholder: '🇪🇸 ★ ♡ …',
      symbolTitle: 'Pega cualquier emoji o símbolo para decorar tu texto con él',
      shuffle: '🎲 Mezclar',
      shuffleTitle: 'Genera un nuevo conjunto de decoraciones',
      empty: 'Escribe algo arriba para decorarlo.',
      copy: 'Copiar',
      sample: 'Hola Mundo',
      themes: {
        sparkle: 'Destellos',
        hearts: 'Corazones',
        coquette: 'Coquette',
        kawaii: 'Kawaii',
        gaming: 'Gamer',
        gothic: 'Gótico',
        'dark-academia': 'Dark Academia',
        celestial: 'Celestial',
        flowers: 'Flores',
        cottagecore: 'Cottagecore',
        birthday: 'Cumpleaños',
        energy: 'Fuego y hielo',
        y2k: 'Y2K',
        arrows: 'Flechas',
        music: 'Música',
        minimal: 'Minimalista',
        brackets: 'Corchetes',
        custom: 'Personalizado'
      }
    }
  };
  var STR = UI[PAGE_LANG] || UI.en;

  function ui(key) {
    return STR[key] || UI.en[key] || key;
  }

  function localThemeLabel(theme) {
    return (STR.themes && STR.themes[theme.key]) || theme.label;
  }

  var PREF_KEY = 'utg_decorator_prefs';
  var DEFAULT_SAMPLE_TEXT = ui('sample');

  /* Optional Unicode font applied before decorating. Names must exist in
     styles.js — verified at build time by decoratorEngine.test.html. */
  var FONT_OPTIONS = [
    { key: 'none',    label: ui('normalText'), styleName: null },
    { key: 'bold',    label: '𝗕𝗼𝗹𝗱',          styleName: 'Ultra Bold' },
    { key: 'italic',  label: '𝘐𝘵𝘢𝘭𝘪𝘤',        styleName: 'Ultra Italic' },
    { key: 'script',  label: '𝓢𝓬𝓻𝓲𝓹𝓽',       styleName: 'Ultra Script' },
    { key: 'gothic',  label: '𝔊𝔬𝔱𝔥𝔦𝔠',       styleName: 'Ultra Gothic' },
    { key: 'bubble',  label: 'Ⓑⓤⓑⓑⓛⓔ',       styleName: 'Ultra Bubble' },
    { key: 'smallcaps', label: 'sᴍᴀʟʟ ᴄᴀᴘs', styleName: 'Ultra Small Caps' },
    { key: 'double',  label: '𝔻𝕠𝕦𝕓𝕝𝕖',       styleName: 'Ultra Double-Struck' }
  ];

  /* ---- State ---- */
  var selectedTheme = 'all';
  var scope         = 'text';   // 'text' | 'words' | 'letters'
  var intensity     = 2;        // 1..3
  var seed          = 1;
  var selectedFont  = 'none';
  var customSymbol  = '';       // user-supplied emoji/symbol (🇵🇰, ★, …)

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /* ---- Preference persistence ---- */
  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      if (p.theme && (p.theme === 'all' || Engine.THEMES.some(function (t) { return t.key === p.theme; }))) {
        selectedTheme = p.theme;
      }
      if (p.scope === 'words' || p.scope === 'text' || p.scope === 'letters') scope = p.scope;
      if (p.intensity >= 1 && p.intensity <= 3) intensity = p.intensity;
      if (FONT_OPTIONS.some(function (f) { return f.key === p.font; })) selectedFont = p.font;
      if (typeof p.symbol === 'string') customSymbol = p.symbol.slice(0, 8);
    } catch (e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        theme: selectedTheme, scope: scope, intensity: intensity,
        font: selectedFont, symbol: customSymbol
      }));
    } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     Control panel
     -------------------------------------------------------------------------- */
  function buildControlPanel() {
    var panel = $('#decoratorControlPanel');
    if (!panel) return;

    var themeChips = [{ key: 'all', icon: '✳︎', label: ui('allVibes') }]
      .concat(Engine.THEMES)
      .map(function (t) {
        return '<button class="deco-theme-chip' + (t.key === selectedTheme ? ' active' : '') +
          '" data-theme="' + t.key + '"><span class="deco-theme-icon">' + t.icon +
          '</span>' + localThemeLabel(t) + '</button>';
      }).join('');

    var intensityChips = [
      { val: 1, label: ui('light') },
      { val: 2, label: ui('normal') },
      { val: 3, label: ui('extra') }
    ].map(function (c) {
      return '<button class="vertical-chip deco-intensity-chip' + (c.val === intensity ? ' active' : '') +
        '" data-intensity="' + c.val + '">' + c.label + '</button>';
    }).join('');

    var fontOptions = FONT_OPTIONS.map(function (f) {
      return '<option value="' + f.key + '"' + (f.key === selectedFont ? ' selected' : '') + '>' + f.label + '</option>';
    }).join('');

    panel.innerHTML =
      '<div class="vertical-control-panel decorator-control-panel">' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">' + ui('vibe') + '</label>' +
          '<div class="deco-theme-chips">' + themeChips + '</div>' +
        '</div>' +

        '<div class="vertical-control-row deco-options-row">' +
          '<span class="deco-option-group">' +
            '<label class="vertical-control-label">' + ui('decorate') + '</label>' +
            '<span class="vertical-mode-chips">' +
              '<button class="vertical-chip deco-scope-chip' + (scope === 'text' ? ' active' : '') + '" data-scope="text">' + ui('wholeText') + '</button>' +
              '<button class="vertical-chip deco-scope-chip' + (scope === 'words' ? ' active' : '') + '" data-scope="words">' + ui('eachWord') + '</button>' +
              '<button class="vertical-chip deco-scope-chip' + (scope === 'letters' ? ' active' : '') + '" data-scope="letters">' + ui('eachLetter') + '</button>' +
            '</span>' +
          '</span>' +

          '<span class="deco-option-group">' +
            '<label class="vertical-control-label">' + ui('intensity') + '</label>' +
            '<span class="vertical-mode-chips">' + intensityChips + '</span>' +
          '</span>' +

          '<span class="deco-option-group">' +
            '<label class="vertical-control-label" for="decoFontSelect">' + ui('font') + '</label>' +
            '<select class="vertical-layout-select deco-font-select" id="decoFontSelect">' + fontOptions + '</select>' +
          '</span>' +

          '<span class="deco-option-group">' +
            '<label class="vertical-control-label" for="decoSymbolInput">' + ui('yourSymbol') + '</label>' +
            '<input class="deco-symbol-input" id="decoSymbolInput" type="text" maxlength="8" ' +
              'placeholder="' + ui('symbolPlaceholder') + '" autocomplete="off" spellcheck="false" ' +
              'title="' + ui('symbolTitle') + '">' +
          '</span>' +

          '<button class="deco-shuffle-btn" id="decoShuffleBtn" type="button" title="' + ui('shuffleTitle') + '">' + ui('shuffle') + '</button>' +
        '</div>' +

      '</div>';

    bindControlPanelEvents(panel);
  }

  function bindControlPanelEvents(panel) {
    $$('.deco-theme-chip', panel).forEach(function (chip) {
      chip.addEventListener('click', function () {
        selectedTheme = this.dataset.theme;
        $$('.deco-theme-chip', panel).forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        savePrefs();
        triggerRender();
      });
    });

    $$('.deco-scope-chip', panel).forEach(function (chip) {
      chip.addEventListener('click', function () {
        scope = this.dataset.scope;
        $$('.deco-scope-chip', panel).forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        savePrefs();
        triggerRender();
      });
    });

    $$('.deco-intensity-chip', panel).forEach(function (chip) {
      chip.addEventListener('click', function () {
        intensity = parseInt(this.dataset.intensity, 10) || 2;
        $$('.deco-intensity-chip', panel).forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        savePrefs();
        triggerRender();
      });
    });

    var fontSelect = $('#decoFontSelect', panel);
    if (fontSelect) {
      fontSelect.addEventListener('change', function () {
        selectedFont = this.value;
        savePrefs();
        triggerRender();
      });
    }

    var symbolInput = $('#decoSymbolInput', panel);
    if (symbolInput) {
      symbolInput.value = customSymbol;
      symbolInput.addEventListener('input', function () {
        customSymbol = this.value;
        savePrefs();
        triggerRender();
      });
    }

    var shuffleBtn = $('#decoShuffleBtn', panel);
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', function () {
        seed += 1;
        triggerRender();
      });
    }
  }

  /* --------------------------------------------------------------------------
     Input binding
     -------------------------------------------------------------------------- */
  function bindMainInput() {
    var input = $('#mainInput');
    var charCount = $('#charCount');
    if (!input) return;
    input.addEventListener('input', function () {
      if (charCount) charCount.textContent = String(input.value.length);
      triggerRender();
    });
  }

  var renderTimer = null;
  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderDecoratorResults, 0);
  }

  /* --------------------------------------------------------------------------
     Render pipeline
     -------------------------------------------------------------------------- */
  function applyFontLayer(text) {
    var opt = FONT_OPTIONS.find(function (f) { return f.key === selectedFont; });
    if (!opt || !opt.styleName) return text;
    var style = stylesRegistry[opt.styleName];
    if (!style || !Render || typeof Render.renderAny !== 'function') return text;
    return Render.renderAny(text, style);
  }

  function renderDecoratorResults() {
    var grid = $('#resultsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    var inputText = ($('#mainInput') || {}).value || '';
    inputText = inputText.trim();
    if (!inputText) {
      var empty = document.createElement('div');
      empty.className = 'style-card';
      empty.innerHTML = '<div class="style-info"><p class="style-preview placeholder">' + ui('empty') + '</p></div>';
      grid.appendChild(empty);
      return;
    }

    var styledText = applyFontLayer(inputText);
    var results = Engine.generate(styledText, {
      theme: selectedTheme,
      scope: scope,
      intensity: intensity,
      seed: seed,
      customSymbol: customSymbol.trim()
    });

    results.forEach(function (r) {
      grid.appendChild(createDecoratorCard(r));
    });
  }

  function createDecoratorCard(result) {
    var card = document.createElement('div');
    card.className = 'style-card decorator-card';

    var info = document.createElement('div');
    info.className = 'style-info';

    var nameLine = document.createElement('p');
    nameLine.className = 'style-name';
    nameLine.textContent = result.icon + ' ' + localThemeLabel({ key: result.theme, label: result.themeLabel }) + ' · ' + result.recipe;

    var preview = document.createElement('p');
    preview.className = 'style-preview decorator-preview';
    preview.textContent = result.text;

    info.appendChild(nameLine);
    info.appendChild(preview);
    card.appendChild(info);

    var actions = document.createElement('div');
    actions.className = 'style-actions';

    /* script.js's document-level click handler powers this button
       (clipboard write + toast), same as on the vertical text page. */
    var copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = ui('copy');
    copyBtn.dataset.text = result.text;

    actions.appendChild(copyBtn);
    card.appendChild(actions);
    return card;
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  function init() {
    var grid = $('#resultsGrid');
    if (grid) grid.classList.add('decorator-results-grid');

    loadPrefs();

    /* ?vibe= deep link (e.g. /category/text-decorator/?vibe=birthday) lets
       use-case pages land visitors on a preselected theme. Beats saved prefs. */
    try {
      var vibe = new URLSearchParams(window.location.search).get('vibe');
      if (vibe && (vibe === 'all' || Engine.THEMES.some(function (t) { return t.key === vibe; }))) {
        selectedTheme = vibe;
      }
    } catch (e) {}

    /* Preload sample text (or ?q= share param) so the page always shows
       finished decorations — never an empty grid. */
    var input = $('#mainInput');
    var charCount = $('#charCount');
    if (input && !input.value.trim()) {
      var q = '';
      try { q = new URLSearchParams(window.location.search).get('q') || ''; } catch (e) {}
      input.value = (q || DEFAULT_SAMPLE_TEXT).slice(0, 500);
      if (charCount) charCount.textContent = String(input.value.length);
    }

    buildControlPanel();
    bindMainInput();
    triggerRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
