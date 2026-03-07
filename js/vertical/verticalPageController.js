/* ==========================================================================
   UltraTextGen — verticalPageController.js
   Takes over rendering for the vertical text page.
   Must be loaded AFTER script.js (which it suppresses via UTG_VERTICAL_MODE).
   Requires: verticalLayouts.js, verticalDecorators.js, verticalDecoratorData.js
   ========================================================================== */

(function () {
  "use strict";

  var Layouts    = window.UTGVerticalLayouts;
  var Decorators = window.UTGVerticalDecorators;
  var DecoData   = window.UTG_VERTICAL_DECORATORS || {};
  var Render     = window.UltraTextGenRender;
  var stylesRegistry = window.textStyles || {};

  var RECENT_KEY     = 'utg_vertical_recent_decos';
  var RECENT_MAX     = 6;

  /* ---- State ---- */
  var selectedLayoutId   = 'stacked';
  var wordBreakMode      = 'stack';      // 'stack' | 'continuous'
  var wordDividerMode    = 'none';       // 'none' | 'blank-line' | 'divider-line'
  var selectedDecorator  = null;         // { id, label, symbol, mode } or null
  var currentDecoTab     = Object.keys(DecoData)[0] || 'bullets';

  /* ---- Helpers ---- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /* --------------------------------------------------------------------------
     Recently-used decorators
     -------------------------------------------------------------------------- */
  function loadRecent() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveRecent(decoList) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(decoList)); } catch (e) {}
  }

  function addToRecent(deco) {
    var list = loadRecent().filter(function (d) { return d.id !== deco.id; });
    list.unshift(deco);
    if (list.length > RECENT_MAX) list = list.slice(0, RECENT_MAX);
    saveRecent(list);
  }

  /* --------------------------------------------------------------------------
     Build the vertical control panel HTML and insert it
     -------------------------------------------------------------------------- */
  function buildControlPanel() {
    var panel = $('#verticalControlPanel');
    if (!panel) return;

    /* Layout selector */
    var layoutOptions = Layouts.LAYOUTS.map(function (l) {
      return '<option value="' + l.id + '"' + (l.id === selectedLayoutId ? ' selected' : '') + '>' + l.label + '</option>';
    }).join('');

    /* Word Divider chips — only visible in stack mode */
    var dividerChips = [
      { val: 'none',         label: 'None' },
      { val: 'blank-line',   label: 'Blank Line' },
      { val: 'divider-line', label: 'Divider Line' }
    ].map(function (c) {
      return '<button class="vertical-chip vertical-divider-chip' + (c.val === wordDividerMode ? ' active' : '') + '" data-divider="' + c.val + '">' + c.label + '</button>';
    }).join('');

    /* Decoration tabs */
    var decoTabs = Object.keys(DecoData).map(function (tabKey) {
      return '<button class="decoration-tab' + (tabKey === currentDecoTab ? ' active' : '') + '" data-vert-deco-tab="' + tabKey + '">' + capitalize(tabKey) + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="vertical-control-panel">' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">Layout</label>' +
          '<select class="vertical-layout-select" id="vertLayoutSelect">' + layoutOptions + '</select>' +
        '</div>' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">Word Mode</label>' +
          '<div class="vertical-mode-chips">' +
            '<button class="vertical-chip vertical-mode-chip' + (wordBreakMode === 'stack' ? ' active' : '') + '" data-mode="stack">Stack</button>' +
            '<button class="vertical-chip vertical-mode-chip' + (wordBreakMode === 'continuous' ? ' active' : '') + '" data-mode="continuous">Continuous</button>' +
          '</div>' +
        '</div>' +

        '<div class="vertical-control-row vertical-divider-row' + (wordBreakMode === 'continuous' ? ' disabled-row' : '') + '">' +
          '<label class="vertical-control-label">Word Divider</label>' +
          '<div class="vertical-divider-chips">' + dividerChips + '</div>' +
        '</div>' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">Line Decoration</label>' +
          '<div class="decoration-tabs vertical-deco-tabs">' + decoTabs + '</div>' +
          '<div id="vertDecoGrid" class="decoration-grid"></div>' +
        '</div>' +

      '</div>';

    renderDecoGrid();
    bindControlPanelEvents(panel);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* --------------------------------------------------------------------------
     Render the decoration grid (including Recent row)
     -------------------------------------------------------------------------- */
  function renderDecoGrid() {
    var grid = $('#vertDecoGrid');
    if (!grid) return;
    grid.innerHTML = '';

    /* Recent row */
    var recent = loadRecent();
    if (recent.length > 0) {
      var recentRow = document.createElement('div');
      recentRow.className = 'vertical-recent-row';
      var recentLabel = document.createElement('span');
      recentLabel.className = 'vertical-recent-label';
      recentLabel.textContent = 'Recent:';
      recentRow.appendChild(recentLabel);
      recent.forEach(function (deco) {
        recentRow.appendChild(makeDecoItem(deco, true));
      });
      grid.appendChild(recentRow);
    }

    /* Clear button */
    var clearBtn = document.createElement('span');
    clearBtn.className = 'clear-decoration';
    clearBtn.textContent = '✕ None';
    clearBtn.addEventListener('click', function () {
      selectedDecorator = null;
      $$('.decoration-item').forEach(function (i) { i.classList.remove('selected'); });
      triggerRender();
    });
    grid.appendChild(clearBtn);

    /* Current tab items */
    var list = DecoData[currentDecoTab] || [];
    list.forEach(function (deco) {
      grid.appendChild(makeDecoItem(deco, false));
    });
  }

  function makeDecoItem(deco, fromRecent) {
    var item = document.createElement('span');
    item.className = 'decoration-item';
    if (selectedDecorator && selectedDecorator.id === deco.id) {
      item.classList.add('selected');
    }
    item.textContent = deco.label;
    item.dataset.decoId = deco.id;
    item.addEventListener('click', function () {
      var isSame = selectedDecorator && selectedDecorator.id === deco.id;
      $$('.decoration-item').forEach(function (i) { i.classList.remove('selected'); });
      if (isSame) {
        selectedDecorator = null;
      } else {
        selectedDecorator = deco;
        item.classList.add('selected');
        if (!fromRecent) addToRecent(deco);
      }
      triggerRender();
    });
    return item;
  }

  /* --------------------------------------------------------------------------
     Bind events on control panel
     -------------------------------------------------------------------------- */
  function bindControlPanelEvents(panel) {
    /* Layout select */
    var layoutSelect = $('#vertLayoutSelect', panel);
    if (layoutSelect) {
      layoutSelect.addEventListener('change', function () {
        selectedLayoutId = this.value;
        triggerRender();
      });
    }

    /* Word mode chips */
    $$('.vertical-mode-chip', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        wordBreakMode = this.dataset.mode;
        $$('.vertical-mode-chip', panel).forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        /* Enable/disable divider row */
        var divRow = $('.vertical-divider-row', panel);
        if (divRow) {
          divRow.classList.toggle('disabled-row', wordBreakMode === 'continuous');
        }
        $$('.vertical-divider-chip', panel).forEach(function (b) {
          b.disabled = wordBreakMode === 'continuous';
        });
        triggerRender();
      });
    });

    /* Divider chips */
    $$('.vertical-divider-chip', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (wordBreakMode === 'continuous') return;
        wordDividerMode = this.dataset.divider;
        $$('.vertical-divider-chip', panel).forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        triggerRender();
      });
    });

    /* Decoration tabs */
    $$('.vertical-deco-tabs .decoration-tab', panel).forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentDecoTab = this.dataset.vertDecoTab;
        $$('.vertical-deco-tabs .decoration-tab', panel).forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        renderDecoGrid();
      });
    });
  }

  /* --------------------------------------------------------------------------
     Main textarea input listener — re-render on any change
     -------------------------------------------------------------------------- */
  function bindMainInput() {
    var input = document.getElementById('mainInput');
    var charCount = document.getElementById('charCount');
    if (input) {
      input.addEventListener('input', function () {
        if (charCount) charCount.textContent = String(input.value.length);
        triggerRender();
      });
    }
  }

  /* --------------------------------------------------------------------------
     Trigger render (debounced slightly for performance)
     -------------------------------------------------------------------------- */
  var renderTimer = null;
  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderVerticalResults, 0);
  }

  /* --------------------------------------------------------------------------
     Core render pipeline
     -------------------------------------------------------------------------- */
  function renderVerticalResults() {
    var grid = document.getElementById('resultsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    var inputText = (document.getElementById('mainInput') || {}).value || '';
    if (!inputText.trim()) return;

    /* Find selected layout function */
    var layoutEntry = Layouts.LAYOUTS.find(function (l) { return l.id === selectedLayoutId; });
    if (!layoutEntry) return;

    var layoutOptions = {
      wordDividerMode: wordBreakMode === 'continuous' ? 'none' : wordDividerMode,
      indentStep: 1
    };

    /* Compute layout output (plain text, layout only) */
    var layoutText = layoutEntry.fn(inputText, wordBreakMode, layoutOptions);

    /* Iterate over all registered styles */
    var entries = Object.entries(stylesRegistry);
    var count = 0;

    entries.forEach(function (entry) {
      var name  = entry[0];
      var style = entry[1];
      if (!style) return;

      /* Apply font style per line */
      var styledLines = layoutText.split('\n').map(function (line) {
        if (line.trim() === '') return '';
        if (Render && typeof Render.renderAny === 'function') {
          return Render.renderAny(line, style);
        }
        return line;
      }).join('\n');

      /* Apply vertical decoration */
      var decoratedText = Decorators.applyVerticalDecorator(styledLines, selectedDecorator, selectedLayoutId);

      /* Render card */
      grid.appendChild(createVerticalStyleCard(name, decoratedText, style));
      count += 1;

      if (count % 8 === 0) {
        grid.appendChild(createAdCard());
      }
    });
  }

  /* --------------------------------------------------------------------------
     Create a vertical style card
     -------------------------------------------------------------------------- */
  function createVerticalStyleCard(name, text, style) {
    var card = document.createElement('div');
    card.className = 'style-card vertical-style-card';

    var info = document.createElement('div');
    info.className = 'style-info';

    var nameLine = document.createElement('p');
    nameLine.className = 'style-name';
    nameLine.textContent = name;

    var preview = document.createElement('p');
    preview.className = 'style-preview vertical-preview';
    preview.textContent = text;

    var copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.dataset.text = text;
    if (!text || !text.trim()) copyBtn.disabled = true;

    info.appendChild(nameLine);
    info.appendChild(preview);
    info.appendChild(copyBtn);
    card.appendChild(info);
    return card;
  }

  /* --------------------------------------------------------------------------
     Ad card (mirrors script.js createAdCard)
     -------------------------------------------------------------------------- */
  function createAdCard() {
    var card = document.createElement('div');
    card.className = 'style-card ad-card';
    card.innerHTML = '<div class="ad-block"><span class="ad-block-label">Advertisement</span></div>';
    return card;
  }

  /* --------------------------------------------------------------------------
     Update decoration section label
     -------------------------------------------------------------------------- */
  function updateDecoLabel() {
    var label = document.querySelector('.decoration-label');
    if (label) {
      var svgEl = label.querySelector('svg');
      label.textContent = 'Add line decoration';
      if (svgEl) label.insertBefore(svgEl, label.firstChild);
    }
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  var DEFAULT_SAMPLE_TEXT = 'Hello';

  function init() {
    /* Add vertical-specific class to results grid */
    var grid = document.getElementById('resultsGrid');
    if (grid) grid.classList.add('vertical-results-grid');

    /* Preload sample text so results are visible on first load */
    var input = document.getElementById('mainInput');
    var charCount = document.getElementById('charCount');
    if (input && !input.value.trim()) {
      input.value = DEFAULT_SAMPLE_TEXT;
      if (charCount) charCount.textContent = String(DEFAULT_SAMPLE_TEXT.length);
    }

    buildControlPanel();
    bindMainInput();
    updateDecoLabel();
    triggerRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
