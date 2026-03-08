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
  var TOP_MARKS = [
    '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307',
    '\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F',
    '\u0310','\u0311','\u0312','\u0313','\u0314','\u0315','\u031A','\u033D',
    '\u033E','\u033F','\u0340','\u0341','\u0342','\u0343','\u0344','\u0346',
    '\u034A','\u034B','\u034C','\u0350','\u0351','\u0352','\u0357','\u035B',
    '\u0363','\u0364','\u0365','\u0366','\u0367','\u0368','\u0369','\u036A',
    '\u036B','\u036C','\u036D','\u036E','\u036F'
  ];

  var MID_MARKS = [
    '\u0334','\u0335','\u0336','\u0337','\u0338','\u0488','\u0489'
  ];

  var BOT_MARKS = [
    '\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F',
    '\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327',
    '\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F',
    '\u0330','\u0331','\u0332','\u0333','\u0339','\u033A','\u033B','\u033C',
    '\u0345','\u0347','\u0348','\u0349','\u034D','\u034E','\u0353','\u0354',
    '\u0355','\u0356','\u0359','\u035A','\u035C','\u035D','\u035E','\u035F'
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
     opts: { topMax, midMax, botMax }
     ---------------------------------------------------------- */
  function zalgoChar(ch, opts) {
    var topN = opts.topMax > 0 ? randInt(0, opts.topMax) : 0;
    var midN = opts.midMax > 0 ? randInt(0, opts.midMax) : 0;
    var botN = opts.botMax > 0 ? randInt(0, opts.botMax) : 0;
    return ch +
      pickRandom(TOP_MARKS, topN) +
      pickRandom(MID_MARKS, midN) +
      pickRandom(BOT_MARKS, botN);
  }

  function zalgoText(text, opts) {
    return Array.from(text).map(function (ch) {
      // Don't corrupt whitespace or control characters
      if (/\s/.test(ch)) return ch;
      return zalgoChar(ch, opts);
    }).join('');
  }

  /* ----------------------------------------------------------
     Style definitions
     intensity: 1-10 scale applied by callers
     ---------------------------------------------------------- */
  var STYLES = {
    light:  function (text, intensity) {
      var v = Math.ceil(intensity / 3);
      return zalgoText(text, { topMax: v, midMax: Math.ceil(v / 2), botMax: v });
    },
    top:    function (text, intensity) {
      var v = Math.round(intensity * 1.5);
      return zalgoText(text, { topMax: v, midMax: 0, botMax: 0 });
    },
    bottom: function (text, intensity) {
      var v = Math.round(intensity * 1.5);
      return zalgoText(text, { topMax: 0, midMax: 0, botMax: v });
    },
    glitch: function (text, intensity) {
      var v = Math.round(intensity * 1.2);
      return zalgoText(text, { topMax: Math.ceil(intensity / 5), midMax: v, botMax: Math.ceil(intensity / 5) });
    },
    chaos:  function (text, intensity) {
      var v = Math.round(intensity * 1.5);
      return zalgoText(text, { topMax: v, midMax: Math.ceil(v / 2), botMax: v });
    }
  };

  /* ----------------------------------------------------------
     Predefined result variants (fixed intensity levels)
     ---------------------------------------------------------- */
  var VARIANTS = [
    { id: 'light',  label: 'Light Zalgo',   fn: function (t) { return STYLES.light(t, 2); } },
    { id: 'medium', label: 'Medium Zalgo',  fn: function (t) { return STYLES.chaos(t, 5); } },
    { id: 'heavy',  label: 'Heavy Zalgo',   fn: function (t) { return STYLES.chaos(t, 8); } },
    { id: 'top',    label: 'Top Zalgo',     fn: function (t) { return STYLES.top(t, 6); } },
    { id: 'bottom', label: 'Bottom Zalgo',  fn: function (t) { return STYLES.bottom(t, 6); } },
    { id: 'glitch', label: 'Glitch Zalgo',  fn: function (t) { return STYLES.glitch(t, 6); } },
    { id: 'chaos',  label: 'Full Chaos',    fn: function (t) { return STYLES.chaos(t, 10); } }
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
  var mainInput, charCountEl, previewOutput, resultsGrid;

  /* ----------------------------------------------------------
     Control panel builder
     ---------------------------------------------------------- */
  function buildControlPanel() {
    var panel = document.getElementById('zalgoControlPanel');
    if (!panel) return;

    var styleLabels = [
      { id: 'light',  label: 'Light Zalgo' },
      { id: 'top',    label: 'Top Zalgo' },
      { id: 'bottom', label: 'Bottom Zalgo' },
      { id: 'glitch', label: 'Glitch Zalgo' },
      { id: 'chaos',  label: 'Full Chaos' }
    ];

    // Style pill row
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
        triggerRender();
      });
      pillRow.appendChild(btn);
    });

    // Intensity row
    var intensityRow = document.createElement('div');
    intensityRow.className = 'zalgo-intensity-row';

    var intensityLabel = document.createElement('label');
    intensityLabel.className = 'zalgo-intensity-label';
    intensityLabel.htmlFor = 'zalgoIntensity';

    var labelText = document.createElement('span');
    labelText.textContent = 'Intensity';

    var valueDisplay = document.createElement('span');
    valueDisplay.className = 'zalgo-intensity-value';
    valueDisplay.id = 'zalgoIntensityValue';
    valueDisplay.textContent = currentIntensity;

    intensityLabel.appendChild(labelText);
    intensityLabel.appendChild(valueDisplay);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'zalgoIntensity';
    slider.className = 'zalgo-slider';
    slider.min = '1';
    slider.max = '10';
    slider.value = String(currentIntensity);

    slider.addEventListener('input', function () {
      currentIntensity = parseInt(this.value, 10);
      valueDisplay.textContent = currentIntensity;
      triggerRender();
    });

    intensityRow.appendChild(intensityLabel);
    intensityRow.appendChild(slider);

    panel.appendChild(pillRow);
    panel.appendChild(intensityRow);
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
    previewOutput.textContent = output || 'Your zalgo text will appear here…';
    // Update the copy button on the preview card
    var copyBtn = document.getElementById('previewCopyBtn');
    if (copyBtn) {
      copyBtn.dataset.text = output;
      copyBtn.disabled = !output;
    }
  }

  function createResultCard(variant, inputText) {
    var output = variant.fn(inputText || DEFAULT_TEXT);

    var card = document.createElement('div');
    card.className = 'style-card';

    var info = document.createElement('div');
    info.className = 'style-info';

    var name = document.createElement('div');
    name.className = 'style-name';
    name.textContent = variant.label;

    var preview = document.createElement('div');
    preview.className = 'style-preview zalgo-preview-text';
    preview.textContent = output;

    info.appendChild(name);
    info.appendChild(preview);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy';
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
     ---------------------------------------------------------- */
  function triggerRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      var text = mainInput ? mainInput.value : '';
      updatePreview(text);
      populateResultsGrid(text);
    }, 120);
  }

  /* ----------------------------------------------------------
     Bind input events
     ---------------------------------------------------------- */
  function bindInputEvents() {
    if (!mainInput) return;

    mainInput.addEventListener('input', function () {
      if (charCountEl) charCountEl.textContent = mainInput.value.length;
      triggerRender();
    });
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  function init() {
    mainInput    = document.getElementById('mainInput');
    charCountEl  = document.getElementById('charCount');
    previewOutput = document.getElementById('zalgoPreviewOutput');
    resultsGrid  = document.getElementById('resultsGrid');

    buildControlPanel();
    bindInputEvents();

    // Seed with default text
    if (mainInput) {
      mainInput.value = DEFAULT_TEXT;
      if (charCountEl) charCountEl.textContent = DEFAULT_TEXT.length;
    }
    updatePreview(DEFAULT_TEXT);
    populateResultsGrid(DEFAULT_TEXT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
