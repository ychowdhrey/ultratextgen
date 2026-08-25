/* ==========================================================================
   UltraTextGen — tattooPageController.js
   Takes over rendering for the tattoo fonts page.
   Must be loaded AFTER script.js (which it suppresses via UTG_TATTOO_MODE).
   Requires: styles.js, renderer.js, tattooData.js.

   Four modes, one per tattoo-lettering job:
     names   — compare lettering families on the exact word/name
     date    — date or number → roman numerals + plain-figure fonts
     letters — single letters and two-initial monograms
     symbols — copyable tattoo symbols with their meanings

   Localized pages define window.tattooI18n before this script loads (same
   pattern as window.verticalI18n / window.zalgoI18n). Missing keys fall
   back to the built-in English strings.
   ========================================================================== */

(function () {
  "use strict";

  const Render = window.UltraTextGenRender;
  const stylesRegistry = window.textStyles || {};
  const DATA = window.UTG_TATTOO_DATA;
  /* Shared namespace owned by script.js — result sharing lives there so every
     generator uses one implementation (script.js loads before this file). */
  const UTG = window.UltraTextGen || {};
  if (!Render || !DATA) return;

  const I18N = window.tattooI18n || {};
  function t(key, fallback) {
    return I18N[key] != null ? I18N[key] : fallback;
  }
  /* Lookup in a nested i18n table (e.g. I18N.symbols['∞']). */
  function pick(table, id, fallback) {
    const sec = I18N[table];
    return (sec && sec[id] != null) ? sec[id] : fallback;
  }
  /* Lookup a field of a nested i18n record (e.g. I18N.lettering[key].note). */
  function pickField(table, id, field, fallback) {
    const sec = I18N[table];
    const item = sec && sec[id];
    return (item && item[field] != null) ? item[field] : fallback;
  }

  const SAMPLE_TEXT = t('sampleName', 'Sofia');
  const SAMPLE_DATE = { d: 12, m: 6, y: 2020 };

  const MODES = [
    { id: 'names',   label: t('modeNamesLabel', 'Names & words'),
      hint: t('modeNamesHint', 'Type a name, word or quote') },
    { id: 'date',    label: t('modeDateLabel', 'Date → Roman'),
      hint: t('modeDateHint', 'Turn a date or number into roman numerals') },
    { id: 'letters', label: t('modeLettersLabel', 'Letters & initials'),
      hint: t('modeLettersHint', 'Single letters and monograms') },
    { id: 'symbols', label: t('modeSymbolsLabel', 'Symbols'),
      hint: t('modeSymbolsHint', 'Small symbols with meaning') }
  ];

  const SIZE_VIEWS = [
    { id: 'close', label: t('sizeClose', 'Close-up') },
    { id: 'arm',   label: t('sizeArm', 'At arm’s length') },
    { id: 'room',  label: t('sizeRoom', 'Across the room') }
  ];

  /* ---- State ---- */
  let mode = 'names';
  let sizeView = 'close';
  let dateOrder = 'dmy';        // 'dmy' | 'mdy' | 'y'
  let dateSep = 'interpunct';
  let monoFirst = 'A';
  let monoSecond = '';          // '' = single letter
  let monoJoiner = 'heart';
  let renderTimer = null;

  /* ---- Helpers ---- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function styleFor(key) {
    return key ? stylesRegistry[key] : null;
  }

  function applyStyle(text, key) {
    const style = styleFor(key);
    if (!style) return text;
    try { return Render.renderAny(text, style); } catch (e) { return text; }
  }

  /* --------------------------------------------------------------------------
     Roman numerals (classic subtractive notation, 1–3999)
     -------------------------------------------------------------------------- */
  const ROMAN_TABLE = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];

  function toRoman(num) {
    if (!Number.isInteger(num) || num < 1 || num > 3999) return null;
    let out = '';
    let n = num;
    ROMAN_TABLE.forEach(function (pair) {
      while (n >= pair[0]) { out += pair[1]; n -= pair[0]; }
    });
    return out;
  }

  /* --------------------------------------------------------------------------
     Card building — same .style-card / .copy-btn contract as the core
     generator, so script.js's document-level copy handler does copy + toast.
     -------------------------------------------------------------------------- */
  /* Result sharing — a lettering/roman card's id is its style's own registry
     slug (the LETTERING/ROMAN_STYLES keys ARE registry names), so it matches
     the identifier every other generator uses. Cards with no style behind them
     (plain figures, classic roman) get a stable slug from their own label,
     namespaced by kind so the two families can never collide. */
  function slugify(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function shareIdForStyle(styleKey, fallbackLabel, prefix) {
    const style = styleKey && window.textStyles ? window.textStyles[styleKey] : null;
    if (style && style.slug) return style.slug;
    const base = slugify(fallbackLabel);
    return base ? (prefix ? prefix + "-" + base : base) : "";
  }

  /* The state a shared link needs to rebuild this exact card: always the mode,
     plus whichever inputs that mode actually reads. */
  function shareParams() {
    const params = { mode: mode, size: sizeView !== 'close' ? sizeView : '' };
    if (mode === 'date') {
      const typed = readDateInputs();
      params.order = dateOrder;
      params.sep = dateSep;
      if (!isNaN(typed.d)) params.d = typed.d;
      if (!isNaN(typed.m)) params.m = typed.m;
      if (!isNaN(typed.y)) params.y = typed.y;
    } else if (mode === 'letters') {
      params.a = monoFirst;
      params.b = monoSecond;
      params.joiner = monoJoiner;
    }
    return params;
  }

  function buildCard(opts) {
    const card = el('div', 'style-card tattoo-card');

    const info = el('div', 'style-info');
    const nameRow = el('div', 'style-name');
    nameRow.appendChild(el('span', null, opts.label));
    if (opts.family) nameRow.appendChild(el('span', 'style-tag', pick('families', opts.family, opts.family)));
    if (opts.hold) {
      nameRow.appendChild(el('span', 'tattoo-badge ' + (opts.hold === 'safe' ? 'is-safe' : 'is-roomy'),
        opts.hold === 'safe' ? t('badgeSafe', 'holds up small') : t('badgeRoomy', 'needs room')));
    }
    info.appendChild(nameRow);

    if (opts.note) info.appendChild(el('div', 'style-note', opts.note));

    const preview = el('div', 'style-preview tattoo-preview', opts.text);
    if (opts.sample) preview.classList.add('is-sample');
    info.appendChild(preview);
    card.appendChild(info);

    const btn = el('button', 'copy-btn', t('copy', 'Copy'));
    btn.type = 'button';
    btn.dataset.text = opts.text;
    if (opts.styleKey) btn.dataset.style = opts.styleKey;
    if (UTG.decorateCopyButton) UTG.decorateCopyButton(btn);
    card.appendChild(btn);

    /* Result-level Share, built by the shared factory in script.js. Sample
       cards (no text typed yet) disable it, matching the core generator. */
    const shareId = opts.shareId || '';
    if (UTG && UTG.buildShareButton) {
      card.appendChild(UTG.buildShareButton({
        styleId: shareId,
        name: opts.label,
        params: shareParams(),
        disabled: !opts.text || !!opts.sample
      }));
    }

    if (UTG && UTG.markSharedCard) UTG.markSharedCard(card, shareId);
    return card;
  }

  function gridHeading(text) {
    return el('h3', 'tattoo-grid-heading', text);
  }

  function sampleHint(text) {
    return el('p', 'tattoo-sample-hint', text);
  }

  /* --------------------------------------------------------------------------
     Mode: names & words
     -------------------------------------------------------------------------- */
  function renderNames(grid) {
    const input = $('#mainInput');
    const raw = input ? input.value.trim() : '';
    const text = raw || SAMPLE_TEXT;
    if (!raw) {
      grid.appendChild(sampleHint(
        t('sampleHintName', 'Showing “{text}” — type your name, word or quote above.')
          .replace('{text}', SAMPLE_TEXT)));
    }

    DATA.LETTERING.forEach(function (entry) {
      if (!styleFor(entry.key)) return;
      grid.appendChild(buildCard({
        label: pickField('lettering', entry.key, 'label', entry.label),
        family: entry.family,
        hold: entry.hold,
        note: pickField('lettering', entry.key, 'note', entry.note),
        text: applyStyle(text, entry.key),
        styleKey: entry.key,
        shareId: shareIdForStyle(entry.key, entry.label, 'lettering'),
        sample: !raw
      }));
    });
  }

  /* --------------------------------------------------------------------------
     Mode: date → roman numerals + plain figures
     -------------------------------------------------------------------------- */
  function readDateInputs() {
    const d = parseInt(($('#tattooDay') || {}).value, 10);
    const m = parseInt(($('#tattooMonth') || {}).value, 10);
    const y = parseInt(($('#tattooYear') || {}).value, 10);
    return { d: d, m: m, y: y };
  }

  function dateParts() {
    const typed = readDateInputs();
    const isSample = isNaN(typed.d) && isNaN(typed.m) && isNaN(typed.y);
    const d = isNaN(typed.d) ? SAMPLE_DATE.d : typed.d;
    const m = isNaN(typed.m) ? SAMPLE_DATE.m : typed.m;
    const y = isNaN(typed.y) ? SAMPLE_DATE.y : typed.y;

    let parts;
    if (dateOrder === 'y') parts = [y];
    else if (dateOrder === 'mdy') parts = [m, d, y];
    else parts = [d, m, y];
    return { parts: parts, sample: isSample };
  }

  function currentSeparator() {
    const found = DATA.DATE_SEPARATORS.filter(function (s) { return s.id === dateSep; })[0];
    return found || DATA.DATE_SEPARATORS[0];
  }

  function renderDate(grid) {
    const state = dateParts();
    const sep = currentSeparator();
    if (state.sample) {
      grid.appendChild(sampleHint(
        t('sampleHintDate', 'Showing a sample date (12 · 6 · 2020) — enter your date or number above.')));
    }

    const romanParts = state.parts.map(toRoman);
    if (romanParts.some(function (p) { return p === null; })) {
      grid.appendChild(sampleHint(t('romanRange', 'Roman numerals cover 1–3999 — check the values above.')));
      return;
    }

    grid.appendChild(gridHeading(t('headingRoman', 'Roman numerals')));
    const romanPlain = romanParts.join(sep.ch);
    DATA.ROMAN_STYLES.forEach(function (entry) {
      if (entry.key && !styleFor(entry.key)) return;
      grid.appendChild(buildCard({
        label: pickField('roman', entry.label, 'label', entry.label),
        family: 'Roman',
        note: pickField('roman', entry.label, 'note', entry.note),
        text: entry.key ? applyStyle(romanPlain, entry.key) : romanPlain,
        styleKey: entry.key || '',
        shareId: shareIdForStyle(entry.key, entry.label, 'roman'),
        sample: state.sample
      }));
    });

    grid.appendChild(gridHeading(t('headingFigures', 'Plain figures')));
    const digitsPlain = state.parts
      .map(function (n, i) {
        // Two-digit day/month (12.06.2020) — the standard tattoo date format.
        return (dateOrder !== 'y' && i < 2 && n < 10) ? '0' + n : String(n);
      })
      .join(sep.ch);
    DATA.DIGIT_FONTS.forEach(function (font) {
      const text = digitsPlain.replace(/[0-9]/g, function (dch) {
        return Array.from(font.digits)[Number(dch)] || dch;
      });
      grid.appendChild(buildCard({
        label: pickField('digits', font.label, 'label', font.label),
        family: 'Figures',
        note: pickField('digits', font.label, 'note', font.note),
        text: text,
        shareId: shareIdForStyle('', font.label, 'figures'),
        sample: state.sample
      }));
    });
  }

  /* --------------------------------------------------------------------------
     Mode: letters & initials
     -------------------------------------------------------------------------- */
  function currentJoiner() {
    const found = DATA.JOINERS.filter(function (j) { return j.id === monoJoiner; })[0];
    return found || DATA.JOINERS[0];
  }

  function renderLetters(grid) {
    const joiner = currentJoiner();

    DATA.LETTERING.forEach(function (entry) {
      if (!styleFor(entry.key)) return;
      // Style the combined string: joiner symbols pass through the letter
      // maps untouched, and banner procedures frame the whole monogram.
      const plain = monoSecond ? monoFirst + joiner.ch + monoSecond : monoFirst;
      const text = applyStyle(plain, entry.key);
      grid.appendChild(buildCard({
        label: pickField('lettering', entry.key, 'label', entry.label),
        family: entry.family,
        hold: entry.hold,
        text: text,
        styleKey: entry.key,
        shareId: shareIdForStyle(entry.key, entry.label, 'lettering')
      }));
    });
  }

  /* --------------------------------------------------------------------------
     Mode: symbols
     -------------------------------------------------------------------------- */
  function renderSymbols(grid) {
    DATA.SYMBOL_GROUPS.forEach(function (group) {
      grid.appendChild(gridHeading(pick('groups', group.id, group.label)));
      const wrap = el('div', 'tattoo-symbol-grid');
      group.items.forEach(function (item) {
        const name = pick('symbols', item.ch, item.name);
        const tile = el('button', 'glyph-copy tattoo-symbol-tile');
        tile.type = 'button';
        tile.dataset.text = item.ch;
        tile.setAttribute('aria-label', t('copyAria', 'Copy {name}').replace('{name}', name));
        tile.appendChild(el('span', 'tattoo-symbol-glyph', item.ch));
        tile.appendChild(el('span', 'tattoo-symbol-name', name));
        wrap.appendChild(tile);
      });
      grid.appendChild(wrap);
    });
  }

  /* --------------------------------------------------------------------------
     Master render
     -------------------------------------------------------------------------- */
  function render() {
    const grid = $('#resultsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.classList.remove('tattoo-size-arm', 'tattoo-size-room');
    if (sizeView === 'arm') grid.classList.add('tattoo-size-arm');
    if (sizeView === 'room') grid.classList.add('tattoo-size-room');

    if (mode === 'names') renderNames(grid);
    else if (mode === 'date') renderDate(grid);
    else if (mode === 'letters') renderLetters(grid);
    else renderSymbols(grid);

    if (UTG && UTG.revealSharedCard) UTG.revealSharedCard(grid);
  }

  function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
  }

  /* --------------------------------------------------------------------------
     Controls
     -------------------------------------------------------------------------- */
  function buildModeTabs() {
    const host = $('#tattooModeTabs');
    if (!host) return;
    MODES.forEach(function (m) {
      const tab = el('button', 'tattoo-mode-tab' + (m.id === mode ? ' active' : ''));
      tab.type = 'button';
      tab.dataset.mode = m.id;
      tab.appendChild(el('span', 'tattoo-mode-tab-label', m.label));
      tab.appendChild(el('span', 'tattoo-mode-tab-hint', m.hint));
      tab.addEventListener('click', function () { setMode(m.id); });
      host.appendChild(tab);
    });
  }

  function setMode(next) {
    mode = next;
    $$('.tattoo-mode-tab').forEach(function (t2) {
      t2.classList.toggle('active', t2.dataset.mode === mode);
    });
    const textWrap = $('#tattooTextWrap');
    if (textWrap) textWrap.classList.toggle('u-hidden', mode !== 'names');
    $$('[data-tattoo-panel]').forEach(function (panel) {
      panel.classList.toggle('u-hidden', panel.dataset.tattooPanel !== mode);
    });
    // The ink test only makes sense where lettering renders at display size.
    $$('[data-tattoo-size]').forEach(function (panel) {
      panel.classList.toggle('u-hidden', mode !== 'names' && mode !== 'letters');
    });
    try {
      const url = new URL(window.location.href);
      if (mode === 'names') url.searchParams.delete('mode');
      else url.searchParams.set('mode', mode);
      history.replaceState(null, '', url.toString());
    } catch (e) {}
    render();
  }

  function chipRow(labelText, chips, isActive, onPick) {
    const row = el('div', 'vertical-control-row');
    row.appendChild(el('span', 'vertical-control-label', labelText));
    const group = el('div', 'vertical-mode-chips');
    chips.forEach(function (chip) {
      const btn = el('button', 'vertical-chip' + (isActive(chip) ? ' active' : ''), chip.label);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        onPick(chip);
        $$('.vertical-chip', group).forEach(function (b, i) {
          b.classList.toggle('active', isActive(chips[i]));
        });
        render();
      });
      group.appendChild(btn);
    });
    row.appendChild(group);
    return row;
  }

  function buildSizePanel(host) {
    // The ink test applies to names + letters — the "will it stay readable?" check.
    const panel = el('div', 'tattoo-control-group');
    panel.dataset.tattooSize = '1';
    panel.appendChild(chipRow(t('inkTest', 'Ink test'), SIZE_VIEWS,
      function (chip) { return chip.id === sizeView; },
      function (chip) { sizeView = chip.id; }));
    host.appendChild(panel);
  }

  function buildDatePanel(host) {
    const panel = el('div', 'tattoo-control-group u-hidden');
    panel.dataset.tattooPanel = 'date';

    const inputRow = el('div', 'vertical-control-row');
    inputRow.appendChild(el('span', 'vertical-control-label', t('yourDate', 'Your date')));
    const fields = el('div', 'tattoo-date-fields');

    function numField(id, placeholder, label, max) {
      const wrap = el('label', 'tattoo-date-field');
      const input = document.createElement('input');
      input.type = 'number';
      input.id = id;
      input.min = '1';
      input.max = String(max);
      input.placeholder = placeholder;
      input.setAttribute('aria-label', label);
      input.addEventListener('input', triggerRender);
      wrap.appendChild(input);
      wrap.appendChild(el('span', 'tattoo-date-field-label', label));
      return wrap;
    }

    fields.appendChild(numField('tattooDay', '12', t('day', 'Day'), 31));
    fields.appendChild(numField('tattooMonth', '6', t('month', 'Month'), 12));
    fields.appendChild(numField('tattooYear', '2020', t('yearOrNumber', 'Year or number'), 3999));
    inputRow.appendChild(fields);
    panel.appendChild(inputRow);

    panel.appendChild(chipRow(t('order', 'Order'),
      DATA.DATE_ORDERS.map(function (o) {
        return { id: o.id, label: pick('orders', o.id, o.label) };
      }),
      function (chip) { return chip.id === dateOrder; },
      function (chip) { dateOrder = chip.id; }));

    panel.appendChild(chipRow(t('separator', 'Separator'),
      DATA.DATE_SEPARATORS.map(function (s) {
        return { id: s.id, label: pick('seps', s.id, s.label) };
      }),
      function (chip) { return chip.id === dateSep; },
      function (chip) { dateSep = chip.id; }));

    host.appendChild(panel);
  }

  function buildLettersPanel(host) {
    const panel = el('div', 'tattoo-control-group u-hidden');
    panel.dataset.tattooPanel = 'letters';

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const firstRow = el('div', 'vertical-control-row');
    firstRow.appendChild(el('span', 'vertical-control-label', t('yourLetter', 'Your letter')));
    const letterGrid = el('div', 'tattoo-letter-grid');
    alphabet.forEach(function (letter) {
      const btn = el('button', 'tattoo-letter-btn' + (letter === monoFirst ? ' active' : ''), letter);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        monoFirst = letter;
        $$('.tattoo-letter-btn', letterGrid).forEach(function (b) {
          b.classList.toggle('active', b.textContent === monoFirst);
        });
        render();
      });
      letterGrid.appendChild(btn);
    });
    firstRow.appendChild(letterGrid);
    panel.appendChild(firstRow);

    const secondRow = el('div', 'vertical-control-row');
    secondRow.appendChild(el('span', 'vertical-control-label', t('secondInitial', 'Second initial')));
    const secondWrap = el('div', 'vertical-mode-chips');
    const select = document.createElement('select');
    select.className = 'vertical-layout-select tattoo-second-select';
    select.setAttribute('aria-label', t('secondInitial', 'Second initial'));
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = t('secondNone', 'None — single letter');
    select.appendChild(noneOpt);
    alphabet.forEach(function (letter) {
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      monoSecond = select.value;
      joinerRow.classList.toggle('disabled-row', !monoSecond);
      render();
    });
    secondWrap.appendChild(select);
    secondRow.appendChild(secondWrap);
    panel.appendChild(secondRow);

    const joinerRow = chipRow(t('joinedBy', 'Joined by'),
      DATA.JOINERS.map(function (j) {
        return { id: j.id, label: pick('joiners', j.id, j.label), ch: j.ch };
      }),
      function (chip) { return chip.id === monoJoiner; },
      function (chip) { monoJoiner = chip.id; });
    joinerRow.classList.add('vertical-divider-row', 'disabled-row');
    panel.appendChild(joinerRow);

    host.appendChild(panel);
  }

  function buildSymbolsPanel(host) {
    const panel = el('div', 'tattoo-control-group u-hidden');
    panel.dataset.tattooPanel = 'symbols';
    panel.appendChild(el('p', 'tattoo-panel-note',
      t('symbolsNote', 'Tap any symbol to copy it — pair one with a name or date, or wear it alone.')));
    host.appendChild(panel);
  }

  /* --------------------------------------------------------------------------
     Init
     -------------------------------------------------------------------------- */
  /* Values a shared link restored that must wait for their own panel to exist. */
  const restoredDate = {};

  function applyRestoredFields() {
    [['day', '#tattooDay'], ['month', '#tattooMonth'], ['year', '#tattooYear']]
      .forEach(function (spec) {
        if (restoredDate[spec[0]] == null) return;
        const field = $(spec[1]);
        if (field && !field.value) field.value = String(restoredDate[spec[0]]);
      });
    /* The select is built with no explicit value, so a restored second
       initial has to be reflected back into it or the control contradicts
       the result it produced. */
    const select = $('.tattoo-second-select');
    if (select && monoSecond) select.value = monoSecond;
  }

  function readUrlState() {
    try {
      const params = new URLSearchParams(window.location.search);
      const text = params.get('text') || params.get('q');
      const input = $('#mainInput');
      if (text && input && !input.value) input.value = text;
      const urlMode = params.get('mode');
      if (urlMode && MODES.some(function (m) { return m.id === urlMode; })) mode = urlMode;

      /* Per-mode state from a result-level share link. Everything is validated
         against this page's own vocabulary and clamped to sane ranges; unknown
         or out-of-range values are ignored and the page opens with defaults. */
      const size = params.get('size');
      if (size === 'arm' || size === 'room') sizeView = size;

      const order = params.get('order');
      if (order === 'dmy' || order === 'mdy' || order === 'y') dateOrder = order;

      const sep = params.get('sep');
      if (sep && DATA.DATE_SEPARATORS.some(function (x) { return x.id === sep; })) dateSep = sep;

      /* The date inputs and the second-initial select do not exist yet —
         buildDatePanel/buildLettersPanel run after this. Stash the validated
         values and apply them once those panels are built (see
         applyRestoredFields below). Getting this wrong is silent: the page
         still renders the SAMPLE date, which looks like a working restore. */
      [['d', 'day', 31], ['m', 'month', 12], ['y', 'year', 3999]].forEach(function (spec) {
        const raw = parseInt(params.get(spec[0]), 10);
        if (!isNaN(raw) && raw >= 1 && raw <= spec[2]) restoredDate[spec[1]] = raw;
      });

      const first = params.get('a');
      if (first) monoFirst = String(first).slice(0, 1).toUpperCase();
      const second = params.get('b');
      if (second != null) monoSecond = String(second).slice(0, 1).toUpperCase();
      const joiner = params.get('joiner');
      if (joiner && DATA.JOINERS.some(function (j) { return j.id === joiner; })) monoJoiner = joiner;
    } catch (e) {}
  }

  function init() {
    const host = $('#tattooControlPanel');
    if (!host) return;

    readUrlState();
    buildModeTabs();
    buildSizePanel(host);
    buildDatePanel(host);
    buildLettersPanel(host);
    buildSymbolsPanel(host);

    /* Panels exist now — push any shared-link values into their controls. */
    applyRestoredFields();

    const input = $('#mainInput');
    if (input) input.addEventListener('input', triggerRender);

    // Apply initial visibility for a non-default URL mode, then paint.
    setMode(mode);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
