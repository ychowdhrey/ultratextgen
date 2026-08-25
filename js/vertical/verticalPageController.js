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
  /* Shared namespace owned by script.js — result sharing lives there so every
     generator uses one implementation (script.js loads before this file). */
  var UTG        = window.UltraTextGen || {};

  /* Localized pages define window.verticalI18n before this script loads
     (same pattern as window.zalgoI18n on the zalgo page). Missing keys fall
     back to the built-in English strings. */
  var I18N = window.verticalI18n || {};
  function t(key, fallback) {
    return I18N[key] != null ? I18N[key] : fallback;
  }

  /* verticalDecoratorData.js ships ~103 English decoration labels
     ("• Bullet", "🌟 Star", …) used as picker-chip text/tooltips. Locale
     pages translate them under 'deco_<id>' keys in their window.verticalI18n
     block; missing keys (English page, or a locale that hasn't set one)
     fall back to the built-in deco.label with zero behavior change. */
  function decoLabel(deco) {
    return t('deco_' + deco.id, deco.label);
  }

  var RECENT_KEY      = 'utg_vertical_recent_decos';
  var RECENT_MAX      = 6;
  var LAYOUT_PREF_KEY = 'utg_vertical_layout_pref';
  var SAFE_PREF_KEY   = 'utg_vertical_safe_pref';

  /* Invisible-but-real character (Braille Pattern Blank). Instagram and
     TikTok strip empty lines and leading/trailing spaces on save; lines and
     indents built from U+2800 survive. */
  var BRAILLE_BLANK = '⠀';

  /* Cards rendered immediately; the rest render when scrolled near. */
  var INITIAL_CARDS = 24;

  /* Character budgets for the fit badges (counted in code points, which is
     how platforms approximately count). Styled Unicode letters can count as
     2 on some platforms — the row tooltip says so. */
  var PLATFORM_LIMITS = [
    { label: t('fitInstagram', 'Instagram bio'), limit: 150 },
    { label: t('fitTikTok',    'TikTok bio'),    limit: 80 },
    { label: t('fitX',         'X bio'),         limit: 160 }
  ];

  /* ---- State ---- */
  var selectedLayoutId   = 'stacked';
  var wordBreakMode      = 'stack';      // 'stack' | 'continuous' | 'word-lines'
  var wordDividerMode    = 'none';       // 'none' | 'blank-line' | 'divider-line'
  var selectedDecorator  = null;         // { id, label, symbol, mode } or null
  var currentDecoTab     = Object.keys(DecoData)[0] || 'bullets';
  var platformSafe       = true;
  var searchFilter       = '';
  var lazyObserver       = null;

  /* ---- Helpers ---- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function countChars(text) { return Array.from(text).length; }

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
     Preference persistence
     -------------------------------------------------------------------------- */
  function loadLayoutPref() {
    try {
      var saved = localStorage.getItem(LAYOUT_PREF_KEY);
      if (saved && Layouts.LAYOUTS.some(function (l) { return l.id === saved; })) {
        return saved;
      }
    } catch (e) {}
    return 'stacked';
  }

  function saveLayoutPref(layoutId) {
    try { localStorage.setItem(LAYOUT_PREF_KEY, layoutId); } catch (e) {}
  }

  function loadSafePref() {
    try { return localStorage.getItem(SAFE_PREF_KEY) !== 'off'; } catch (e) { return true; }
  }

  function saveSafePref(on) {
    try { localStorage.setItem(SAFE_PREF_KEY, on ? 'on' : 'off'); } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     Platform-safe output: pad blank lines with U+2800 and rebuild leading
     indents from U+2800 so the result survives Instagram/TikTok saving.
     Applied as the last step, after styling and decoration.
     -------------------------------------------------------------------------- */
  function makePlatformSafe(text) {
    return text.split('\n').map(function (line) {
      var noTrail = line.replace(/[ \t]+$/, '');
      if (noTrail === '') return BRAILLE_BLANK;
      return noTrail.replace(/^ +/, function (m) {
        return new Array(m.length + 1).join(BRAILLE_BLANK);
      });
    }).join('\n');
  }

  /* --------------------------------------------------------------------------
     Quadratic layouts (pyramids) expand to n²/2 characters — cap their input.
     Counts layout units (letters, or words in word-lines mode) and truncates
     the raw input once the layout's maxUnits is reached.
     -------------------------------------------------------------------------- */
  function truncateForLayout(input, layoutEntry, mode) {
    var max = layoutEntry.maxUnits;
    if (!max) return { text: input, truncated: false };

    if (mode === 'word-lines') {
      var words = Layouts.splitWords(input);
      if (words.length <= max) return { text: input, truncated: false };
      return { text: words.slice(0, max).join(' '), truncated: true };
    }

    var out = '';
    var units = 0;
    var graphemes = Layouts.chars(input);
    for (var i = 0; i < graphemes.length; i++) {
      var g = graphemes[i];
      if (!/^\s+$/.test(g)) {
        if (units === max) return { text: out, truncated: true };
        units += 1;
      }
      out += g;
    }
    return { text: input, truncated: false };
  }

  /* --------------------------------------------------------------------------
     Build the vertical control panel HTML and insert it
     -------------------------------------------------------------------------- */
  function layoutPreview(layoutEntry) {
    var sample = layoutEntry.id === 'double-column' ? 'ab cd' : 'abc';
    return layoutEntry.fn(sample, 'stack', { wordDividerMode: 'none', indentStep: 1 });
  }

  function buildControlPanel() {
    var panel = $('#verticalControlPanel');
    if (!panel) return;

    /* Visual layout picker — every layout as a button with a mini preview */
    var layoutOptions = Layouts.LAYOUTS.map(function (l) {
      var active = l.id === selectedLayoutId;
      return '<button type="button" class="vertical-layout-option' + (active ? ' active' : '') + '"' +
        ' data-layout="' + l.id + '" title="' + t('layoutTip_' + l.id, l.description) + '" aria-pressed="' + active + '">' +
        '<pre class="vertical-layout-mini" aria-hidden="true">' + layoutPreview(l) + '</pre>' +
        '<span class="vertical-layout-name">' + t('layout_' + l.id, l.label) + '</span>' +
        '</button>';
    }).join('');

    /* Word mode chips */
    var modeChips = [
      { val: 'stack',      label: t('modeStack', 'Stack'),             tip: t('modeStackTip', 'Each word becomes its own vertical block') },
      { val: 'continuous', label: t('modeContinuous', 'Continuous'),   tip: t('modeContinuousTip', 'All letters flow in one column — spaces are removed') },
      { val: 'word-lines', label: t('modeWordLines', 'Word per Line'), tip: t('modeWordLinesTip', 'Each whole word on its own line instead of each letter') }
    ].map(function (c) {
      return '<button type="button" class="vertical-chip vertical-mode-chip' + (c.val === wordBreakMode ? ' active' : '') + '"' +
        ' data-mode="' + c.val + '" title="' + c.tip + '" aria-pressed="' + (c.val === wordBreakMode) + '">' + c.label + '</button>';
    }).join('');

    /* Word Divider chips — only meaningful in stack mode */
    var dividerChips = [
      { val: 'none',         label: t('dividerNone', 'None'),         tip: t('dividerNoneTip', 'Single blank line between word blocks') },
      { val: 'blank-line',   label: t('dividerBlank', 'Blank Line'),  tip: t('dividerBlankTip', 'Two blank lines between word blocks for extra spacing') },
      { val: 'divider-line', label: t('dividerLine', 'Divider Line'), tip: t('dividerLineTip', 'A ──────── line between word blocks') }
    ].map(function (c) {
      return '<button type="button" class="vertical-chip vertical-divider-chip' + (c.val === wordDividerMode ? ' active' : '') + '"' +
        ' data-divider="' + c.val + '" title="' + c.tip + '" aria-pressed="' + (c.val === wordDividerMode) + '">' + c.label + '</button>';
    }).join('');

    /* Spacing (platform-safe) chips */
    var safeChips = [
      { val: 'safe', label: t('spacingSafe', 'Platform-safe'), tip: t('spacingSafeTip', 'Pads blank lines and indents with an invisible character (U+2800) so the layout survives Instagram and TikTok, which strip empty lines and extra spaces') },
      { val: 'raw',  label: t('spacingRaw', 'Raw'),            tip: t('spacingRawTip', 'Plain spaces and empty lines — exact characters, but Instagram/TikTok may collapse them') }
    ].map(function (c) {
      var active = (c.val === 'safe') === platformSafe;
      return '<button type="button" class="vertical-chip vertical-safe-chip' + (active ? ' active' : '') + '"' +
        ' data-safe="' + c.val + '" title="' + c.tip + '" aria-pressed="' + active + '">' + c.label + '</button>';
    }).join('');

    /* Decoration tabs */
    var decoTabs = Object.keys(DecoData).map(function (tabKey) {
      return '<button type="button" class="decoration-tab' + (tabKey === currentDecoTab ? ' active' : '') + '" data-vert-deco-tab="' + tabKey + '">' + t('tab_' + tabKey, capitalize(tabKey)) + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="vertical-control-panel">' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">' + t('labelLayout', 'Layout') + '</label>' +
          '<div class="vertical-layout-picker" id="vertLayoutPicker">' + layoutOptions + '</div>' +
        '</div>' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">' + t('labelWordMode', 'Word Mode') + '</label>' +
          '<div class="vertical-mode-chips">' + modeChips + '</div>' +
        '</div>' +

        '<div class="vertical-control-row vertical-divider-row' + (wordBreakMode !== 'stack' ? ' disabled-row' : '') + '">' +
          '<label class="vertical-control-label">' + t('labelWordDivider', 'Word Divider') + '</label>' +
          '<div class="vertical-divider-chips">' + dividerChips + '</div>' +
        '</div>' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">' + t('labelSpacing', 'Spacing') + '</label>' +
          '<div class="vertical-safe-chips">' + safeChips + '</div>' +
        '</div>' +

        '<div class="vertical-control-row">' +
          '<label class="vertical-control-label">' + t('labelLineDecoration', 'Line Decoration') + '</label>' +
          '<div class="decoration-tabs vertical-deco-tabs">' + decoTabs + '</div>' +
          '<div id="vertDecoGrid" class="decoration-grid"></div>' +
          '<div class="vertical-custom-sep-row">' +
            '<label class="vertical-custom-sep-label" for="vertCustomSep">' + t('labelCustom', 'Custom:') + '</label>' +
            '<input type="text" id="vertCustomSep" class="vertical-custom-sep" maxlength="8"' +
              ' placeholder="' + t('customPlaceholder', 'any symbol') + '" title="' + t('customTip', 'Type your own separator — it goes between each line of the stack') + '">' +
          '</div>' +
        '</div>' +

        '<div class="vertical-fit-row" id="vertFitRow"' +
          ' title="' + t('fitRowTip', 'Counted in characters incl. line breaks. Styled Unicode fonts can count as 2 characters on some platforms.') + '"></div>' +

        '<div class="vertical-caps-hint" id="vertCapsHint" hidden>' +
          '💡 ' + t('capsHint', 'Stacked text reads best in CAPS and short words.') + ' ' +
          '<button type="button" class="vertical-caps-btn" id="vertCapsBtn">' + t('capsBtn', 'Use CAPS') + '</button>' +
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
      recentLabel.textContent = t('recentLabel', 'Recent:');
      recentRow.appendChild(recentLabel);
      recent.forEach(function (deco) {
        recentRow.appendChild(makeDecoItem(deco, true));
      });
      grid.appendChild(recentRow);
    }

    /* Clear button */
    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-decoration';
    clearBtn.textContent = '✕ ' + t('clearDecoration', 'None');
    clearBtn.title = t('clearDecorationTip', 'Remove the line decoration');
    clearBtn.addEventListener('click', function () {
      selectDecorator(null);
    });
    grid.appendChild(clearBtn);

    /* Current tab items */
    var list = DecoData[currentDecoTab] || [];
    list.forEach(function (deco) {
      grid.appendChild(makeDecoItem(deco, false));
    });
  }

  function makeDecoItem(deco, fromRecent) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'decoration-item';
    var selected = selectedDecorator && selectedDecorator.id === deco.id;
    if (selected) item.classList.add('selected');
    item.setAttribute('aria-pressed', String(!!selected));
    var label = decoLabel(deco);
    item.title = deco.mode === 'prefix'
      ? label + ' — ' + t('decoBesideTip', 'appears beside each letter')
      : label + ' — ' + t('decoBetweenTip', 'appears between each letter');
    item.textContent = label;
    item.dataset.decoId = deco.id;
    item.addEventListener('click', function () {
      var isSame = selectedDecorator && selectedDecorator.id === deco.id;
      if (!isSame && !fromRecent) addToRecent(deco);
      selectDecorator(isSame ? null : deco);
    });
    return item;
  }

  function selectDecorator(deco) {
    selectedDecorator = deco;
    $$('.decoration-item').forEach(function (i) {
      var on = deco && i.dataset.decoId === deco.id;
      i.classList.toggle('selected', !!on);
      i.setAttribute('aria-pressed', String(!!on));
    });
    var customInput = $('#vertCustomSep');
    if (customInput && (!deco || deco.id !== 'custom')) customInput.value = '';
    triggerRender();
  }

  /* --------------------------------------------------------------------------
     Bind events on control panel
     -------------------------------------------------------------------------- */
  function bindControlPanelEvents(panel) {
    /* Layout picker */
    $$('.vertical-layout-option', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedLayoutId = this.dataset.layout;
        saveLayoutPref(selectedLayoutId);
        $$('.vertical-layout-option', panel).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        triggerRender();
      });
    });

    /* Word mode chips */
    $$('.vertical-mode-chip', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        wordBreakMode = this.dataset.mode;
        $$('.vertical-mode-chip', panel).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        /* Word dividers only apply when words become separate blocks */
        var divRow = $('.vertical-divider-row', panel);
        var dividersOff = wordBreakMode !== 'stack';
        if (divRow) divRow.classList.toggle('disabled-row', dividersOff);
        $$('.vertical-divider-chip', panel).forEach(function (b) {
          b.disabled = dividersOff;
        });
        triggerRender();
      });
    });

    /* Divider chips */
    $$('.vertical-divider-chip', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (wordBreakMode !== 'stack') return;
        wordDividerMode = this.dataset.divider;
        $$('.vertical-divider-chip', panel).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        triggerRender();
      });
    });

    /* Spacing (platform-safe) chips */
    $$('.vertical-safe-chip', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        platformSafe = this.dataset.safe === 'safe';
        saveSafePref(platformSafe);
        $$('.vertical-safe-chip', panel).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
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

    /* Custom separator */
    var customInput = $('#vertCustomSep', panel);
    if (customInput) {
      customInput.addEventListener('input', function () {
        var val = this.value;
        if (val.trim() === '') {
          if (selectedDecorator && selectedDecorator.id === 'custom') {
            selectedDecorator = null;
            triggerRender();
          }
          return;
        }
        selectedDecorator = { id: 'custom', label: val, symbol: val, mode: 'divider' };
        $$('.decoration-item').forEach(function (i) {
          i.classList.remove('selected');
          i.setAttribute('aria-pressed', 'false');
        });
        triggerRender();
      });
    }

    /* Caps hint button */
    var capsBtn = $('#vertCapsBtn', panel);
    if (capsBtn) {
      capsBtn.addEventListener('click', function () {
        var input = document.getElementById('mainInput');
        if (!input) return;
        input.value = input.value.toUpperCase();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
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

  /* Header search filters the style cards by name (script.js's own filter is
     suppressed on this page). The header is injected after us, so listen at
     the document level. */
  function bindHeaderSearch() {
    document.addEventListener('input', function (e) {
      if (!e.target || e.target.id !== 'searchInput') return;
      searchFilter = (e.target.value || '').trim().toLowerCase();
      triggerRender();
    });
  }

  /* --------------------------------------------------------------------------
     Trigger render (debounced for typing performance)
     -------------------------------------------------------------------------- */
  var renderTimer = null;
  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderVerticalResults, 120);
  }

  /* --------------------------------------------------------------------------
     Fit badges + caps hint
     -------------------------------------------------------------------------- */
  function updateFitRow(plainText, truncatedNote) {
    var row = $('#vertFitRow');
    if (!row) return;
    if (!plainText) { row.innerHTML = ''; return; }

    var count = countChars(plainText);
    var html = '<span class="vertical-fit-count">' + t('fitOutput', 'Output:') + ' ' + count + ' ' + t('charsUnit', 'chars') + '</span>';
    PLATFORM_LIMITS.forEach(function (p) {
      var fits = count <= p.limit;
      html += '<span class="vertical-fit-badge ' + (fits ? 'fit' : 'no-fit') + '">' +
        (fits ? '✓' : '✗') + ' ' + p.label + ' (' + p.limit + ')</span>';
    });
    if (truncatedNote) {
      html += '<span class="vertical-fit-note">' + truncatedNote + '</span>';
    }
    row.innerHTML = html;
  }

  function updateCapsHint(inputText) {
    var hint = $('#vertCapsHint');
    if (!hint) return;
    var isCharMode = wordBreakMode !== 'word-lines';
    var longestWord = Layouts.splitWords(inputText).reduce(function (m, w) {
      return Math.max(m, Layouts.chars(w).length);
    }, 0);
    var show = isCharMode && /[a-z]/.test(inputText) && longestWord >= 6;
    hint.hidden = !show;
  }

  /* --------------------------------------------------------------------------
     Core render pipeline
     -------------------------------------------------------------------------- */
  function renderVerticalResults() {
    var grid = document.getElementById('resultsGrid');
    if (!grid) return;
    if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
    grid.innerHTML = '';

    var inputText = (document.getElementById('mainInput') || {}).value || '';
    if (!inputText.trim()) {
      updateFitRow('');
      updateCapsHint('');
      return;
    }

    /* Find selected layout function */
    var layoutEntry = Layouts.LAYOUTS.find(function (l) { return l.id === selectedLayoutId; });
    if (!layoutEntry) return;

    /* Cap quadratic layouts before they explode */
    var capped = truncateForLayout(inputText, layoutEntry, wordBreakMode);

    var layoutOptions = {
      wordDividerMode: wordBreakMode !== 'stack' ? 'none' : wordDividerMode,
      indentStep: 1
    };

    /* Compute layout output (plain text, layout only) */
    var layoutText = layoutEntry.fn(capped.text, wordBreakMode, layoutOptions);

    /* Plain (unstyled) final output drives the fit badges */
    var plainDecorated = Decorators.applyVerticalDecorator(layoutText, selectedDecorator, selectedLayoutId);
    var plainFinal = platformSafe ? makePlatformSafe(plainDecorated) : plainDecorated;
    updateFitRow(plainFinal, capped.truncated
      ? t('truncatedNote', '{layout} uses the first {n} characters')
          .replace('{layout}', t('layout_' + layoutEntry.id, layoutEntry.label))
          .replace('{n}', String(layoutEntry.maxUnits))
      : '');
    updateCapsHint(inputText);

    /* Compute every style's final text, collapsing identical results */
    var items = [];
    var seenOutput = {};
    Object.keys(stylesRegistry).forEach(function (name) {
      var style = stylesRegistry[name];
      if (!style) return;

      var styledLines = layoutText.split('\n').map(function (line) {
        if (line.trim() === '') return '';
        if (Render && typeof Render.renderAny === 'function') {
          return Render.renderAny(line, style);
        }
        return line;
      }).join('\n');

      var decoratedText = Decorators.applyVerticalDecorator(styledLines, selectedDecorator, selectedLayoutId);
      var finalText = platformSafe ? makePlatformSafe(decoratedText) : decoratedText;

      var prev = seenOutput[finalText];
      if (prev) {
        prev.dupes.push(name);
        return;
      }
      var item = { name: name, text: finalText, dupes: [] };
      seenOutput[finalText] = item;
      items.push(item);
    });

    /* Header search filter */
    if (searchFilter) {
      items = items.filter(function (item) {
        var hay = item.name + ' ' + item.dupes.join(' ');
        return hay.toLowerCase().indexOf(searchFilter) !== -1;
      });
      if (items.length === 0) {
        var empty = document.createElement('p');
        empty.className = 'vertical-empty-note';
        empty.textContent = t('noStylesMatch', 'No styles match "{query}".').replace('{query}', searchFilter);
        grid.appendChild(empty);
        return;
      }
    }

    /* Render the first chunk now, the rest when scrolled near */
    items.slice(0, INITIAL_CARDS).forEach(function (item) {
      grid.appendChild(createVerticalStyleCard(item));
    });

    if (items.length > INITIAL_CARDS) {
      var sentinel = document.createElement('div');
      sentinel.className = 'vertical-lazy-sentinel';
      grid.appendChild(sentinel);

      var renderRest = function () {
        if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
        var frag = document.createDocumentFragment();
        items.slice(INITIAL_CARDS).forEach(function (item) {
          frag.appendChild(createVerticalStyleCard(item));
        });
        sentinel.replaceWith(frag);
      };

      if ('IntersectionObserver' in window) {
        /* Huge top margin catches jumps PAST the sentinel (End key, anchor
           links) — those never intersect a plain viewport-sized root. */
        lazyObserver = new IntersectionObserver(function (observed) {
          if (observed.some(function (entry) { return entry.isIntersecting; })) renderRest();
        }, { rootMargin: '100000px 0px 600px 0px' });
        lazyObserver.observe(sentinel);
      } else {
        renderRest();
      }
    }

    if (UTG && UTG.revealSharedCard) UTG.revealSharedCard(grid);
  }

  /* --------------------------------------------------------------------------
     Result sharing — the stable id is the style's own registry slug (never its
     display name), matching every other generator on the site. The page's own
     arrangement state rides along as extra params so a shared link reopens the
     same layout, not just the same text.
     -------------------------------------------------------------------------- */
  function shareIdFor(styleName) {
    var style = stylesRegistry[styleName];
    return (style && style.slug) || '';
  }

  function shareParams() {
    return {
      layout: selectedLayoutId,
      wrap: wordBreakMode,
      divider: wordDividerMode !== 'none' ? wordDividerMode : '',
      deco: selectedDecorator && selectedDecorator.id !== 'custom' ? selectedDecorator.id : '',
      safe: platformSafe ? '' : 'off'
    };
  }

  /* --------------------------------------------------------------------------
     Create a vertical style card
     -------------------------------------------------------------------------- */
  function createVerticalStyleCard(item) {
    var card = document.createElement('div');
    card.className = 'style-card vertical-style-card';

    var info = document.createElement('div');
    info.className = 'style-info';

    var nameLine = document.createElement('p');
    nameLine.className = 'style-name';
    nameLine.textContent = item.name;

    var meta = document.createElement('p');
    meta.className = 'vertical-card-meta';
    var count = document.createElement('span');
    count.className = 'vertical-card-count';
    count.textContent = countChars(item.text) + ' ' + t('charsUnit', 'chars');
    meta.appendChild(count);
    if (item.dupes.length > 0) {
      var dupeNote = document.createElement('span');
      dupeNote.className = 'vertical-dupe-note';
      dupeNote.textContent = (item.dupes.length > 1
        ? t('identicalStyles', '+{n} identical styles')
        : t('identicalStyle', '+{n} identical style')).replace('{n}', String(item.dupes.length));
      dupeNote.title = t('sameResultAs', 'Same result as:') + ' ' + item.dupes.join(', ');
      meta.appendChild(dupeNote);
    }

    var preview = document.createElement('p');
    preview.className = 'style-preview vertical-preview';
    preview.textContent = item.text;

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = t('btnCopy', 'Copy');
    copyBtn.title = t('btnCopyTip', 'Copy to clipboard');
    copyBtn.dataset.text = item.text;
    copyBtn.dataset.style = item.name;
    if (!item.text || !item.text.trim()) copyBtn.disabled = true;
    if (UTG.decorateCopyButton) UTG.decorateCopyButton(copyBtn);

    info.appendChild(nameLine);
    info.appendChild(meta);
    info.appendChild(preview);

    /* Copy + Share share one action row. These compact cards carry no Save
       button, so the core generator's Copy/Save/Share triangle reduces to a
       pair here — same classes, same spacing language. */
    var actions = document.createElement('div');
    actions.className = 'result-share-row';
    actions.appendChild(copyBtn);
    info.appendChild(actions);

    /* Result-level Share — built by the shared factory in script.js so this
       page gets the same button, handler, label and localisation as the core
       generator. The creation is the input plus this layout/decorator/wrap
       state, so the recipient sees exactly this arrangement, not a default. */
    var shareId = shareIdFor(item.name);
    if (UTG && UTG.buildShareButton) {
      actions.appendChild(UTG.buildShareButton({
        styleId: shareId,
        name: item.name,
        params: shareParams(),
        disabled: !item.text || !item.text.trim()
      }));
    }

    card.appendChild(info);
    if (UTG && UTG.markSharedCard) UTG.markSharedCard(card, shareId);
    return card;
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  var DEFAULT_SAMPLE_TEXT = t('sampleText', 'Hello');

  /* Restore the arrangement a shared link encodes. Every value is validated
     against this page's own vocabulary — an unknown layout, wrap or decorator
     is ignored and the page opens normally, and nothing read here is ever
     rendered into the DOM. Runs after the persisted prefs so an explicit link
     wins over this device's last session. */
  function readUrlState() {
    try {
      var params = new URLSearchParams(window.location.search);

      var layout = params.get('layout');
      if (layout && Layouts.LAYOUTS.some(function (l) { return l.id === layout; })) {
        selectedLayoutId = layout;
      }

      var wrap = params.get('wrap');
      if (wrap === 'stack' || wrap === 'continuous' || wrap === 'word-lines') wordBreakMode = wrap;

      var divider = params.get('divider');
      if (divider === 'blank-line' || divider === 'divider-line') wordDividerMode = divider;

      if (params.get('safe') === 'off') platformSafe = false;

      var deco = params.get('deco');
      if (deco) {
        Object.keys(DecoData).forEach(function (tab) {
          (DecoData[tab] || []).forEach(function (d) {
            if (d && d.id === deco && !selectedDecorator) {
              selectedDecorator = d;
              currentDecoTab = tab;
            }
          });
        });
      }
    } catch (e) { /* malformed query — open with the defaults */ }
  }

  function init() {
    /* Add vertical-specific class to results grid */
    var grid = document.getElementById('resultsGrid');
    if (grid) grid.classList.add('vertical-results-grid');

    /* Restore persisted preferences */
    selectedLayoutId = loadLayoutPref();
    platformSafe = loadSafePref();

    /* …then let an explicit shared link override them */
    readUrlState();

    /* Preload sample text so results are visible on first load */
    var input = document.getElementById('mainInput');
    var charCount = document.getElementById('charCount');
    if (input && !input.value.trim()) {
      input.value = DEFAULT_SAMPLE_TEXT;
      if (charCount) charCount.textContent = String(DEFAULT_SAMPLE_TEXT.length);
    }

    buildControlPanel();
    bindMainInput();
    bindHeaderSearch();
    renderVerticalResults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
