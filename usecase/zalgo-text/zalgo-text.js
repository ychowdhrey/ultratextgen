/* =============================================================
   Zalgo Text Page Controller
   /usecase/zalgo-text/zalgo-text.js
   ============================================================= */
(function () {
  'use strict';

  if (!window.UTG_ZALGO_MODE) return;

  /* ----------------------------------------------------------
     Unicode combining-mark pools
     ---------------------------------------------------------- */

  /* U+0300–U+036F: Combining Diacritical Marks (standard — top) */
  var TOP_MARKS = [
    '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307',
    '\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F',
    '\u0310','\u0311','\u0312','\u0313','\u0314','\u0315','\u031A','\u033D',
    '\u033E','\u033F','\u0340','\u0341','\u0342','\u0343','\u0344','\u0346',
    '\u034A','\u034B','\u034C','\u0350','\u0351','\u0352','\u0357','\u035B',
    '\u0363','\u0364','\u0365','\u0366','\u0367','\u0368','\u0369','\u036A',
    '\u036B','\u036C','\u036D','\u036E','\u036F'
  ];

  /* U+0334–U+0489: mid/overlay marks */
  var MID_MARKS = [
    '\u0334','\u0335','\u0336','\u0337','\u0338','\u0488','\u0489'
  ];

  /* U+0316–U+035F: Combining Diacritical Marks (bottom) */
  var BOT_MARKS = [
    '\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F',
    '\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327',
    '\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F',
    '\u0330','\u0331','\u0332','\u0333','\u0339','\u033A','\u033B','\u033C',
    '\u0345','\u0347','\u0348','\u0349','\u034D','\u034E','\u0353','\u0354',
    '\u0355','\u0356','\u0359','\u035A','\u035C','\u035D','\u035E','\u035F'
  ];

  /* U+1AB0–U+1ABF: Combining Diacritical Marks Extended (Unicode 7.0)
     Produces visually distinct shapes — double loops, waves, infinity signs */
  var EXTENDED_MARKS = [
    '\u1AB0','\u1AB1','\u1AB2','\u1AB3','\u1AB4','\u1AB5',
    '\u1AB8','\u1ABB','\u1ABC','\u1ABE','\u1ABF','\u1AC0'
  ];

  /* U+1DC0–U+1DCD: Combining Diacritical Marks Supplement
     Denser and more geometrically distinct than the base block */
  var SUPPLEMENT_MARKS = [
    '\u1DC0','\u1DC1','\u1DC2','\u1DC3','\u1DC4','\u1DC5','\u1DC6',
    '\u1DC7','\u1DC8','\u1DC9','\u1DCA','\u1DCB','\u1DCC','\u1DCD'
  ];

  /* U+20D0–U+20DC + U+20E1: Combining Diacritical Marks for Symbols
     Arrow overlays, ring overlays, harpoons — entirely different topology */
  var SYMBOL_MARKS = [
    '\u20D0','\u20D1','\u20D2','\u20D3','\u20D4','\u20D5',
    '\u20D6','\u20D7','\u20D8','\u20D9','\u20DA','\u20DB','\u20DC',
    '\u20E1'
  ];

  /* U+20DD–U+20E4: Combining Enclosing Marks
     Draws shapes (circle, square, diamond, keycap) around each base char */
  var ENCLOSING_MARKS = [
    '\u20DD','\u20DE','\u20DF','\u20E0','\u20E3','\u20E4'
  ];

  /* ----------------------------------------------------------
     Random helpers
     ---------------------------------------------------------- */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(arr, n) {
    var result = '';
    for (var i = 0; i < n; i++) {
      result += arr[Math.floor(Math.random() * arr.length)];
    }
    return result;
  }

  /* ----------------------------------------------------------
     Core Zalgo generator
     opts: { topMax, midMax, botMax, extMax, symMax, encMax }
     ---------------------------------------------------------- */
  function zalgoChar(ch, opts) {
    var topN = opts.topMax  > 0 ? randInt(0, opts.topMax)  : 0;
    var midN = opts.midMax  > 0 ? randInt(0, opts.midMax)  : 0;
    var botN = opts.botMax  > 0 ? randInt(0, opts.botMax)  : 0;
    var extN = (opts.extMax || 0) > 0 ? randInt(0, opts.extMax) : 0;
    var symN = (opts.symMax || 0) > 0 ? randInt(0, opts.symMax) : 0;
    var encN = (opts.encMax || 0) > 0 ? randInt(0, opts.encMax) : 0;
    return ch +
      pickRandom(TOP_MARKS,       topN) +
      pickRandom(MID_MARKS,       midN) +
      pickRandom(BOT_MARKS,       botN) +
      pickRandom(EXTENDED_MARKS,  extN) +
      pickRandom(SUPPLEMENT_MARKS, Math.ceil(extN / 2)) +
      pickRandom(SYMBOL_MARKS,    symN) +
      pickRandom(ENCLOSING_MARKS, encN);
  }

  function zalgoText(text, opts) {
    return Array.from(text).map(function (ch) {
      if (/\s/.test(ch)) return ch;
      return zalgoChar(ch, opts);
    }).join('');
  }

  /* ----------------------------------------------------------
     Style definitions
     ---------------------------------------------------------- */
  var STYLES = {
    light: function (text, intensity) {
      var v = Math.ceil(intensity / 3);
      return zalgoText(text, { topMax: v, midMax: Math.ceil(v / 2), botMax: v });
    },
    top: function (text, intensity) {
      var v = Math.round(intensity * 1.5);
      return zalgoText(text, { topMax: v, midMax: 0, botMax: 0 });
    },
    bottom: function (text, intensity) {
      var v = Math.round(intensity * 1.5);
      return zalgoText(text, { topMax: 0, midMax: 0, botMax: v });
    },
    glitch: function (text, intensity) {
      var v = Math.round(intensity * 1.2);
      return zalgoText(text, {
        topMax: Math.ceil(intensity / 5),
        midMax: v,
        botMax: Math.ceil(intensity / 5)
      });
    },
    chaos: function (text, intensity) {
      var v = Math.round(intensity * 1.5);
      return zalgoText(text, { topMax: v, midMax: Math.ceil(v / 2), botMax: v });
    },

    /* NEW: Symbol Overlay — arrow overlays, ring overlays, and enclosing shapes
       from U+20D0–U+20FF and U+1AB0–U+1ABF. Visually distinct from traditional
       diacritic stacking: characters acquire halos, arrows, and directional marks */
    symbol: function (text, intensity) {
      var v = Math.ceil(intensity / 2);
      return zalgoText(text, {
        topMax:  Math.ceil(v / 2),
        midMax:  0,
        botMax:  0,
        extMax:  v,
        symMax:  v,
        encMax:  Math.ceil(v / 3)
      });
    },

    /* NEW: Extended Marks — combines all three extended Unicode blocks
       (Supplement U+1DC0, Extended U+1AB0, Symbols U+20D0) for a denser,
       more exotic stack that looks different from standard chaos */
    extended: function (text, intensity) {
      var v = Math.round(intensity * 1.1);
      return zalgoText(text, {
        topMax:  Math.ceil(v / 2),
        midMax:  Math.ceil(v / 3),
        botMax:  Math.ceil(v / 2),
        extMax:  v,
        symMax:  Math.ceil(v / 2),
        encMax:  0
      });
    }
  };

  /* ----------------------------------------------------------
     Platform-safe presets
     Map human intent ("Instagram bio") to (style, intensity) pairs.
     Title text explains the tradeoff to users.
     ---------------------------------------------------------- */
  var PLATFORM_PRESETS = [
    {
      id: 'twitter',
      label: 'Twitter / X',
      style: 'light',
      intensity: 2,
      title: 'Light marks — stays under character limits, readable in timeline'
    },
    {
      id: 'instagram',
      label: 'Instagram',
      style: 'light',
      intensity: 4,
      title: 'Renders cleanly in Instagram bios and captions'
    },
    {
      id: 'discord',
      label: 'Discord',
      style: 'chaos',
      intensity: 8,
      title: 'Discord renders heavy combining marks — heavy chaos, very visible'
    },
    {
      id: 'maxchaos',
      label: 'Max Chaos',
      style: 'chaos',
      intensity: 10,
      title: 'Maximum intensity — every mark group at full power'
    }
  ];

  /* ----------------------------------------------------------
     Predefined result variants shown in the grid
     Fixed intensities intentionally — the grid is a comparison view,
     not a configurator. The live preview above is the configurator.
     ---------------------------------------------------------- */
  var VARIANTS = [
    { id: 'light',    label: 'Light Zalgo',     fn: function (t) { return STYLES.light(t, 2); } },
    { id: 'medium',   label: 'Medium Zalgo',    fn: function (t) { return STYLES.chaos(t, 5); } },
    { id: 'heavy',    label: 'Heavy Zalgo',     fn: function (t) { return STYLES.chaos(t, 8); } },
    { id: 'top',      label: 'Top Zalgo',       fn: function (t) { return STYLES.top(t, 6); } },
    { id: 'bottom',   label: 'Bottom Zalgo',    fn: function (t) { return STYLES.bottom(t, 6); } },
    { id: 'glitch',   label: 'Glitch Zalgo',    fn: function (t) { return STYLES.glitch(t, 6); } },
    { id: 'chaos',    label: 'Full Chaos',      fn: function (t) { return STYLES.chaos(t, 10); } },
    { id: 'symbol',   label: 'Symbol Overlay',  fn: function (t) { return STYLES.symbol(t, 6); } },
    { id: 'extended', label: 'Extended Marks',  fn: function (t) { return STYLES.extended(t, 7); } }
  ];

  /* ----------------------------------------------------------
     State
     ---------------------------------------------------------- */
  var currentStyle     = 'light';
  var currentIntensity = 5;
  var renderTimer      = null;
  var DEFAULT_TEXT     = 'Hello';

  /* ----------------------------------------------------------
     DOM references (resolved once on init)
     ---------------------------------------------------------- */
  var mainInput, charCountEl, previewOutput, previewCopyBtn, resultsGrid;
  var outputCharCountEl = null;

  /* ----------------------------------------------------------
     URL state management — encodes text+style+intensity so users
     can share a specific configuration as a link
     ---------------------------------------------------------- */
  function readUrlParams() {
    if (!window.URLSearchParams) return null;
    var params = new URLSearchParams(window.location.search);
    var text      = params.get('text');
    var style     = params.get('style');
    var intensity = parseInt(params.get('intensity'), 10);
    if (!text) return null;
    return {
      text:      text.substring(0, 500),
      style:     STYLES[style] ? style : 'light',
      intensity: (intensity >= 1 && intensity <= 10) ? intensity : 5
    };
  }

  function updateUrl(text, style, intensity) {
    if (!history.replaceState || !window.URLSearchParams) return;
    if (!text) {
      history.replaceState(null, '', window.location.pathname);
      return;
    }
    var params = new URLSearchParams();
    params.set('text', text);
    params.set('style', style);
    params.set('intensity', String(intensity));
    history.replaceState(null, '', window.location.pathname + '?' + params.toString());
  }

  /* ----------------------------------------------------------
     Decode / clean zalgo
     Strips all Unicode combining marks (category M: Mn, Mc, Me)
     using the \p{M} Unicode property escape.
     ---------------------------------------------------------- */
  function decodeZalgo(text) {
    try {
      return text.replace(/\p{M}/gu, '');
    } catch (e) {
      /* Fallback for environments without Unicode property escapes */
      return text.replace(
        /[\u0300-\u036F\u0488-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF]/g,
        ''
      );
    }
  }

  /* ----------------------------------------------------------
     Control panel builder
     ---------------------------------------------------------- */
  function buildControlPanel() {
    var panel = document.getElementById('zalgoControlPanel');
    if (!panel) return;

    /* --- Platform preset row --- */
    var presetRow = document.createElement('div');
    presetRow.className = 'zalgo-preset-row';

    var presetLabel = document.createElement('span');
    presetLabel.className = 'zalgo-preset-label';
    presetLabel.textContent = 'Platform preset:';
    presetRow.appendChild(presetLabel);

    PLATFORM_PRESETS.forEach(function (preset) {
      var btn = document.createElement('button');
      btn.className = 'zalgo-preset-pill';
      btn.textContent = preset.label;
      btn.type = 'button';
      btn.title = preset.title;
      btn.dataset.presetId = preset.id;

      btn.addEventListener('click', function () {
        currentStyle     = preset.style;
        currentIntensity = preset.intensity;

        /* Sync style pills */
        panel.querySelectorAll('.zalgo-style-pill').forEach(function (p) {
          p.classList.toggle('active', p.dataset.styleId === currentStyle);
        });
        /* Sync intensity slider */
        var slider       = document.getElementById('zalgoIntensity');
        var valueDisplay = document.getElementById('zalgoIntensityValue');
        if (slider)       slider.value            = String(currentIntensity);
        if (valueDisplay) valueDisplay.textContent = currentIntensity;

        /* Highlight active preset */
        panel.querySelectorAll('.zalgo-preset-pill').forEach(function (p) {
          p.classList.toggle('active', p.dataset.presetId === preset.id);
        });
        triggerRender();
      });

      presetRow.appendChild(btn);
    });

    /* --- Style pill row --- */
    var styleLabels = [
      { id: 'light',    label: 'Light Zalgo' },
      { id: 'top',      label: 'Top Zalgo' },
      { id: 'bottom',   label: 'Bottom Zalgo' },
      { id: 'glitch',   label: 'Glitch Zalgo' },
      { id: 'chaos',    label: 'Full Chaos' },
      { id: 'symbol',   label: 'Symbol Overlay' },
      { id: 'extended', label: 'Extended Marks' }
    ];

    var pillRow = document.createElement('div');
    pillRow.className = 'zalgo-style-pills';

    styleLabels.forEach(function (s) {
      var btn = document.createElement('button');
      btn.className = 'zalgo-style-pill decoration-tab' + (s.id === currentStyle ? ' active' : '');
      btn.textContent = s.label;
      btn.dataset.styleId = s.id;
      btn.type = 'button';

      btn.addEventListener('click', function () {
        currentStyle = s.id;
        panel.querySelectorAll('.zalgo-style-pill').forEach(function (p) {
          p.classList.toggle('active', p.dataset.styleId === currentStyle);
        });
        /* Deactivate presets when user manually picks a style */
        panel.querySelectorAll('.zalgo-preset-pill').forEach(function (p) {
          p.classList.remove('active');
        });
        triggerRender();
      });

      pillRow.appendChild(btn);
    });

    /* --- Intensity row --- */
    var intensityRow = document.createElement('div');
    intensityRow.className = 'zalgo-intensity-row';

    var intensityLabel = document.createElement('label');
    intensityLabel.className = 'zalgo-intensity-label';
    intensityLabel.htmlFor = 'zalgoIntensity';

    var labelText    = document.createElement('span');
    labelText.textContent = 'Intensity';

    var valueDisplay = document.createElement('span');
    valueDisplay.className  = 'zalgo-intensity-value';
    valueDisplay.id         = 'zalgoIntensityValue';
    valueDisplay.textContent = currentIntensity;

    intensityLabel.appendChild(labelText);
    intensityLabel.appendChild(valueDisplay);

    var slider = document.createElement('input');
    slider.type      = 'range';
    slider.id        = 'zalgoIntensity';
    slider.className = 'zalgo-slider';
    slider.min       = '1';
    slider.max       = '10';
    slider.value     = String(currentIntensity);

    slider.addEventListener('input', function () {
      currentIntensity = parseInt(this.value, 10);
      valueDisplay.textContent = currentIntensity;
      /* Clear preset highlight — user is now in custom territory */
      panel.querySelectorAll('.zalgo-preset-pill').forEach(function (p) {
        p.classList.remove('active');
      });
      triggerRender();
    });

    intensityRow.appendChild(intensityLabel);
    intensityRow.appendChild(slider);

    panel.appendChild(presetRow);
    panel.appendChild(pillRow);
    panel.appendChild(intensityRow);
  }

  /* ----------------------------------------------------------
     Inject output char count into the existing preview card header
     so users know the real output length (relevant for platform limits)
     ---------------------------------------------------------- */
  function buildOutputCharCount() {
    var previewHeader = document.querySelector('.zalgo-preview-header');
    if (!previewHeader) return;

    outputCharCountEl = document.createElement('span');
    outputCharCountEl.className = 'zalgo-output-char-count';
    outputCharCountEl.style.display = 'none';

    /* Insert between the label and the copy button */
    var label = previewHeader.querySelector('.zalgo-preview-label');
    if (label && label.nextSibling) {
      previewHeader.insertBefore(outputCharCountEl, label.nextSibling);
    } else {
      previewHeader.appendChild(outputCharCountEl);
    }
  }

  /* ----------------------------------------------------------
     Build "Regenerate All" row — inserted before the results grid.
     Since zalgo marks are random, re-rolling produces a different
     visual arrangement without changing text or settings.
     ---------------------------------------------------------- */
  function buildRegenRow() {
    if (!resultsGrid) return;

    var row = document.createElement('div');
    row.className = 'zalgo-regen-row';

    var btn = document.createElement('button');
    btn.className = 'zalgo-regen-btn';
    btn.type      = 'button';
    btn.innerHTML = '&#8635;&nbsp;Regenerate All';
    btn.title     = 'Generate new random marks for all variants without changing the text';

    btn.addEventListener('click', function () {
      var text = mainInput ? mainInput.value : '';
      updatePreview(text);
      populateResultsGrid(text);
    });

    row.appendChild(btn);
    resultsGrid.parentNode.insertBefore(row, resultsGrid);
  }

  /* ----------------------------------------------------------
     Build decode section — inserted after the results grid.
     Strips all Unicode combining marks from pasted zalgo text
     to recover the original clean text.
     ---------------------------------------------------------- */
  function buildDecodeSection() {
    if (!resultsGrid) return;

    var section = document.createElement('div');
    section.className = 'zalgo-decode-section';

    var heading = document.createElement('h2');
    heading.className   = 'zalgo-decode-heading';
    heading.textContent = 'Decode Zalgo Text';

    var desc = document.createElement('p');
    desc.className   = 'zalgo-decode-desc';
    desc.textContent = 'Paste any zalgo-corrupted text below to strip all combining marks and recover the original.';

    var decodeInput = document.createElement('textarea');
    decodeInput.className   = 'main-input zalgo-decode-input';
    decodeInput.placeholder = 'Paste zalgo text here\u2026';
    decodeInput.rows        = 3;
    decodeInput.spellcheck  = false;

    var outputRow = document.createElement('div');
    outputRow.className = 'zalgo-decode-output-row';

    var outputLabel = document.createElement('span');
    outputLabel.className   = 'zalgo-preview-label';
    outputLabel.textContent = 'Decoded text';

    var copyBtn = document.createElement('button');
    copyBtn.className        = 'copy-btn';
    copyBtn.type             = 'button';
    copyBtn.textContent      = 'Copy';
    copyBtn.disabled         = true;
    copyBtn.dataset.text     = '';

    outputRow.appendChild(outputLabel);
    outputRow.appendChild(copyBtn);

    var decodeOutput = document.createElement('div');
    decodeOutput.className   = 'zalgo-decode-output';
    decodeOutput.textContent = 'Paste zalgo text above\u2026';

    decodeInput.addEventListener('input', function () {
      var raw   = decodeInput.value;
      var clean = decodeZalgo(raw);

      if (!raw) {
        decodeOutput.textContent = 'Paste zalgo text above\u2026';
        copyBtn.disabled         = true;
        copyBtn.dataset.text     = '';
      } else if (raw === clean) {
        decodeOutput.textContent = 'No combining marks found \u2014 text is already clean.';
        copyBtn.disabled         = true;
        copyBtn.dataset.text     = '';
      } else {
        decodeOutput.textContent = clean;
        copyBtn.dataset.text     = clean;
        copyBtn.disabled         = false;
      }
    });

    section.appendChild(heading);
    section.appendChild(desc);
    section.appendChild(decodeInput);
    section.appendChild(outputRow);
    section.appendChild(decodeOutput);

    /* Insert directly after the results grid */
    resultsGrid.parentNode.insertBefore(section, resultsGrid.nextSibling);
  }

  /* ----------------------------------------------------------
     Rendering helpers
     ---------------------------------------------------------- */
  function getCurrentZalgoText(inputText) {
    if (!inputText) return '';
    var fn = STYLES[currentStyle];
    return fn ? fn(inputText, currentIntensity) : inputText;
  }

  function updatePreview(inputText) {
    if (!previewOutput) return;
    var output = getCurrentZalgoText(inputText);
    previewOutput.textContent = output || 'Your zalgo text will appear here\u2026';

    /* Show output character count so users know real length for platform limits */
    if (outputCharCountEl) {
      if (output) {
        outputCharCountEl.textContent = output.length + '\u00a0output chars';
        outputCharCountEl.style.display = '';
      } else {
        outputCharCountEl.style.display = 'none';
      }
    }

    if (previewCopyBtn) {
      previewCopyBtn.dataset.text = output;
      previewCopyBtn.disabled     = !output;
    }
  }

  function createResultCard(variant, inputText) {
    var output = variant.fn(inputText || DEFAULT_TEXT);

    var card = document.createElement('div');
    card.className = 'style-card';

    var info = document.createElement('div');
    info.className = 'style-info';

    /* Name row with char-count badge */
    var nameRow = document.createElement('div');
    nameRow.className = 'zalgo-card-name-row';

    var name = document.createElement('div');
    name.className   = 'style-name';
    name.textContent = variant.label;

    var charBadge = document.createElement('span');
    charBadge.className   = 'zalgo-char-badge';
    charBadge.textContent = output.length + '\u00a0chars';

    nameRow.appendChild(name);
    nameRow.appendChild(charBadge);

    var preview = document.createElement('div');
    preview.className   = 'style-preview zalgo-preview-text';
    preview.textContent = output;

    info.appendChild(nameRow);
    info.appendChild(preview);

    var copyBtn = document.createElement('button');
    copyBtn.className    = 'copy-btn';
    copyBtn.type         = 'button';
    copyBtn.textContent  = 'Copy';
    copyBtn.dataset.text = output;
    if (!output) copyBtn.disabled = true;

    card.appendChild(info);
    card.appendChild(copyBtn);

    return card;
  }

  function populateResultsGrid(inputText) {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = '';
    VARIANTS.forEach(function (variant) {
      resultsGrid.appendChild(createResultCard(variant, inputText));
    });
  }

  /* ----------------------------------------------------------
     Debounced render entry point
     Also updates the shareable URL on every change.
     ---------------------------------------------------------- */
  function triggerRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      var text = mainInput ? mainInput.value : '';
      updatePreview(text);
      populateResultsGrid(text);
      updateUrl(text, currentStyle, currentIntensity);
    }, 120);
  }

  /* ----------------------------------------------------------
     Bind main input events
     ---------------------------------------------------------- */
  function bindInputEvents() {
    if (!mainInput) return;

    mainInput.addEventListener('input', function () {
      if (charCountEl) charCountEl.textContent = mainInput.value.length;
      triggerRender();
    });
  }

  /* ----------------------------------------------------------
     Apply URL params after control panel is built
     ---------------------------------------------------------- */
  function applyUrlParams(params) {
    if (mainInput) {
      mainInput.value = params.text;
      if (charCountEl) charCountEl.textContent = params.text.length;
    }
    currentStyle     = params.style;
    currentIntensity = params.intensity;

    var panel = document.getElementById('zalgoControlPanel');
    if (panel) {
      panel.querySelectorAll('.zalgo-style-pill').forEach(function (p) {
        p.classList.toggle('active', p.dataset.styleId === currentStyle);
      });
      var slider       = document.getElementById('zalgoIntensity');
      var valueDisplay = document.getElementById('zalgoIntensityValue');
      if (slider)       slider.value            = String(currentIntensity);
      if (valueDisplay) valueDisplay.textContent = currentIntensity;
    }
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  function init() {
    mainInput      = document.getElementById('mainInput');
    charCountEl    = document.getElementById('charCount');
    previewOutput  = document.getElementById('zalgoPreviewOutput');
    previewCopyBtn = document.getElementById('previewCopyBtn');
    resultsGrid    = document.getElementById('resultsGrid');

    buildControlPanel();
    buildOutputCharCount();
    bindInputEvents();

    /* Seed from URL params or default text */
    var urlParams   = readUrlParams();
    var initialText = DEFAULT_TEXT;

    if (urlParams) {
      initialText = urlParams.text;
      applyUrlParams(urlParams);
    } else {
      if (mainInput) {
        mainInput.value = DEFAULT_TEXT;
        if (charCountEl) charCountEl.textContent = DEFAULT_TEXT.length;
      }
    }

    updatePreview(initialText);
    populateResultsGrid(initialText);

    /* These must come after the grid is in the DOM */
    buildRegenRow();
    buildDecodeSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
