/* ══════════════════════════════════════════════════════════════════
   Zalgo Text Generator — zalgo-text.js
   Pure vanilla JS. No dependencies.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Unicode Combining Mark Pools ────────────────────────────────
  // Only true combining diacritical marks (Mn category) that stack
  // vertically without adding visible width or box glyphs.

  // ABOVE marks (U+0300 block — accents, dots, rings, hooks that render above)
  const MARKS_UP = [
    '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307',
    '\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F',
    '\u0310','\u0311','\u0312','\u0313','\u0314','\u0315','\u031A','\u033D',
    '\u033E','\u033F','\u0340','\u0341','\u0342','\u0343','\u0344','\u0346',
    '\u034A','\u034B','\u034C','\u0350','\u0351','\u0352','\u0357','\u0358',
    '\u035B','\u035D','\u035E','\u0360','\u0361'
  ];

  // MID marks (strikethroughs and overlays — only the 5 that truly overlay)
  const MARKS_MID = [
    '\u0334',  // combining tilde overlay
    '\u0335',  // combining short stroke overlay
    '\u0336',  // combining long stroke overlay (strikethrough)
    '\u0337',  // combining short solidus overlay
    '\u0338'   // combining long solidus overlay
  ];

  // BELOW marks (cedillas, underlines, hooks below)
  const MARKS_DOWN = [
    '\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F',
    '\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327',
    '\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F',
    '\u0330','\u0331','\u0332','\u0333','\u0339','\u033A','\u033B','\u033C',
    '\u0345','\u0347','\u0348','\u0349','\u034D','\u034E','\u0353','\u0354',
    '\u0355','\u0356','\u0359','\u035A','\u035C','\u035F','\u0362'
  ];

  // ── Character Type Sub-Pools ────────────────────────────────────
  // These filter WITHIN each position pool to change the visual flavour.
  // "all" = full pool, others select subsets that produce a distinct look.

  // "bars" — strikethrough/line marks only (clean horizontal lines)
  const CHAR_TYPE_UP_bars   = ['\u0305','\u030D','\u030E','\u033F','\u0310'];
  const CHAR_TYPE_MID_bars  = ['\u0334','\u0335','\u0336','\u0337','\u0338'];
  const CHAR_TYPE_DOWN_bars = ['\u0331','\u0332','\u0333','\u0320'];

  // "letters" — superscript combining letter marks (small letters above)
  const CHAR_TYPE_UP_letters   = [
    '\u0363','\u0364','\u0365','\u0366','\u0367','\u0368','\u0369','\u036A',
    '\u036B','\u036C','\u036D','\u036E','\u036F'
  ];
  const CHAR_TYPE_MID_letters  = MARKS_MID; // no letter mid marks exist, use full mid
  const CHAR_TYPE_DOWN_letters = MARKS_DOWN; // no letter below marks exist, use full below

  // "symbols" — dots, rings, hooks, exotic diacritics
  const CHAR_TYPE_UP_symbols   = [
    '\u0307','\u0308','\u030A','\u030B','\u0312','\u0313','\u0314',
    '\u0344','\u0346','\u034A','\u034B','\u034C'
  ];
  const CHAR_TYPE_MID_symbols  = ['\u0334','\u0337','\u0338'];
  const CHAR_TYPE_DOWN_symbols = [
    '\u0323','\u0324','\u0325','\u0326','\u0328','\u0329','\u032A',
    '\u0339','\u033A','\u033B','\u033C'
  ];

  // "noise" — dense accent/tonal marks (graves, acutes, breves, tildes)
  const CHAR_TYPE_UP_noise   = [
    '\u0300','\u0301','\u0302','\u0303','\u0304','\u0306','\u0309',
    '\u030C','\u030F','\u0311','\u0340','\u0341','\u0342','\u0343',
    '\u0350','\u0351','\u0352','\u0357','\u0358','\u035B'
  ];
  const CHAR_TYPE_MID_noise  = ['\u0335','\u0336'];
  const CHAR_TYPE_DOWN_noise = [
    '\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F',
    '\u0321','\u0322','\u0327','\u032B','\u032C','\u032D','\u032E','\u032F',
    '\u0330','\u0345','\u0347','\u0348','\u0349','\u034D','\u034E',
    '\u0353','\u0354','\u0355','\u0356','\u0359','\u035A','\u035C','\u035F'
  ];

  // Map charType name → {up, mid, down} arrays
  const CHAR_TYPE_MAP = {
    bars:    { up: CHAR_TYPE_UP_bars,    mid: CHAR_TYPE_MID_bars,    down: CHAR_TYPE_DOWN_bars },
    letters: { up: CHAR_TYPE_UP_letters, mid: CHAR_TYPE_MID_letters, down: CHAR_TYPE_DOWN_letters },
    symbols: { up: CHAR_TYPE_UP_symbols, mid: CHAR_TYPE_MID_symbols, down: CHAR_TYPE_DOWN_symbols },
    noise:   { up: CHAR_TYPE_UP_noise,   mid: CHAR_TYPE_MID_noise,   down: CHAR_TYPE_DOWN_noise }
  };

  // ── Shape Functions ─────────────────────────────────────────────
  const SHAPES = {
    uniform:      (i, len) => 1.0,
    'slope-up':   (i, len) => len <= 1 ? 1 : i / (len - 1),
    'slope-down': (i, len) => len <= 1 ? 1 : 1 - i / (len - 1),
    wave:         (i, len) => 0.3 + 0.7 * Math.abs(Math.sin((i / Math.max(len - 1, 1)) * Math.PI * 2)),
    pyramid: (i, len) => {
      if (len <= 1) return 1;
      const mid = (len - 1) / 2;
      return 1 - Math.abs(i - mid) / mid;
    },
    valley: (i, len) => {
      if (len <= 1) return 1;
      const mid = (len - 1) / 2;
      return 0.15 + 0.85 * (Math.abs(i - mid) / mid);
    },
    staircase: (i, len) => {
      if (len <= 1) return 1;
      const steps = 4;
      return Math.floor((i / (len - 1)) * steps) / steps + 0.25;
    },
    random: () => 0.2 + Math.random() * 0.8
  };

  // Shape bar heights for visual selector
  const SHAPE_VISUALS = {
    uniform:      [14,14,14,14,14,14,14],
    'slope-up':   [3,5,7,9,12,15,19],
    'slope-down': [19,15,12,9,7,5,3],
    wave:         [14,20,8,3,8,20,14],
    pyramid:      [3,8,14,20,14,8,3],
    valley:       [20,12,5,3,5,12,20],
    staircase:    [5,5,10,10,15,15,20],
    random:       [8,18,5,15,10,20,6]
  };

  // ── Helpers ────────────────────────────────────────────────────
  // Fisher-Yates shuffle (returns a new array)
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Pick `count` unique marks from a pool. If count > pool size, cycle
  // through the pool again (re-shuffled) so duplicates only appear after
  // every unique mark has been used once.
  function pickUnique(pool, count) {
    if (!pool.length) return '';
    let result = '';
    let deck = [];
    for (let m = 0; m < count; m++) {
      if (deck.length === 0) deck = shuffle(pool);
      result += deck.pop();
    }
    return result;
  }

  // ── Core Generator ──────────────────────────────────────────────
  function generateZalgo(text, opts) {
    const charType  = opts.charType  || 'all';
    const position  = opts.position  || 'all';
    const shape     = opts.shape     || 'uniform';
    const frequency = opts.frequency != null ? opts.frequency : 0.7;
    const amplitude = opts.amplitude != null ? opts.amplitude : 5;

    // Resolve mark pools based on character type
    let upPool, midPool, downPool;
    if (charType !== 'all' && CHAR_TYPE_MAP[charType]) {
      const ct = CHAR_TYPE_MAP[charType];
      upPool   = ct.up;
      midPool  = ct.mid;
      downPool = ct.down;
    } else {
      upPool   = MARKS_UP;
      midPool  = MARKS_MID;
      downPool = MARKS_DOWN;
    }

    // Position flags
    const useUp   = position === 'all' || position === 'up' || position === 'up-down';
    const useMid  = position === 'all' || position === 'mid';
    const useDown = position === 'all' || position === 'down' || position === 'up-down';

    // Count active positions for even budget distribution
    const activePositions = (useUp ? 1 : 0) + (useMid ? 1 : 0) + (useDown ? 1 : 0);

    const shapeFn = SHAPES[shape] || SHAPES.uniform;
    const chars = [...text];
    const len = chars.length;

    return chars.map((ch, i) => {
      if (ch === ' ' || ch === '\n' || ch === '\t') return ch;

      // Frequency: probability this char gets marks at all
      if (Math.random() > frequency) return ch;

      const shapeMultiplier = shapeFn(i, len);
      // Allow 0 marks when shape multiplier is very low (preserves shape contrast)
      const markCount = Math.round(amplitude * shapeMultiplier);
      if (markCount <= 0) return ch;

      // Distribute full amplitude budget to active positions.
      // Up/down get the lion's share; mid gets fewer (strikethroughs stack flat).
      let marks = '';

      if (activePositions === 1) {
        // Single position gets the entire budget
        if (useUp)   marks += pickUnique(upPool, markCount);
        if (useMid)  marks += pickUnique(midPool, markCount);
        if (useDown) marks += pickUnique(downPool, markCount);
      } else {
        // Multiple positions: split budget proportionally.
        // Down-marks are visually heavier (cedillas, underlines extend further
        // than above-accents), so we give down fewer marks to look balanced.
        if (useUp && upPool.length) {
          const count = useMid
            ? Math.max(1, Math.round(markCount * 0.50))
            : Math.max(1, Math.round(markCount * 0.60));
          marks += pickUnique(upPool, count);
        }

        if (useMid && midPool.length) {
          // Mid marks are visually dense — cap at 2 to avoid illegibility
          const count = Math.min(2, Math.max(1, Math.round(markCount * 0.10)));
          marks += pickUnique(midPool, count);
        }

        if (useDown && downPool.length) {
          const count = useMid
            ? Math.max(1, Math.round(markCount * 0.35))
            : Math.max(1, Math.round(markCount * 0.40));
          marks += pickUnique(downPool, count);
        }
      }

      return ch + marks;
    }).join('');
  }

  // ── State ───────────────────────────────────────────────────────
  const state = {
    charType:  'all',
    position:  'all',
    shape:     'uniform',
    frequency: 0.8,
    amplitude: 5,
    output:    ''
  };

  // ── DOM References ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Helpers ─────────────────────────────────────────────────────
  function tooltip(text) {
    return `<span class="tooltip-trigger">?<span class="tooltip-text">${text}</span></span>`;
  }

  function pillGroup(items, groupAttr) {
    return `<div class="pill-group">${items.map(item =>
      `<button class="pill${item.id === state[groupAttr] ? ' active' : ''}" data-group="${groupAttr}" data-value="${item.id}">${item.label}</button>`
    ).join('')}</div>`;
  }

  function shapeBars(shapeId) {
    return SHAPE_VISUALS[shapeId].map(h =>
      `<div class="bar" style="height:${h}px"></div>`
    ).join('');
  }

  // ── Build Controls ──────────────────────────────────────────────
  function buildControls() {
    const panel = $('#zalgoControlPanel');
    if (!panel) return;

    const charTypes = [
      { id: 'all', label: 'All' },
      { id: 'bars', label: 'Bars' },
      { id: 'letters', label: 'Letters' },
      { id: 'symbols', label: 'Symbols' },
      { id: 'noise', label: 'Noise' }
    ];

    const positions = [
      { id: 'all', label: 'All' },
      { id: 'up-down', label: 'Up & Down' },
      { id: 'up', label: 'Up' },
      { id: 'mid', label: 'Mid' },
      { id: 'down', label: 'Down' }
    ];

    const shapeList = [
      { id: 'uniform', label: 'Uniform' },
      { id: 'slope-up', label: 'Slope Up' },
      { id: 'slope-down', label: 'Slope Down' },
      { id: 'wave', label: 'Wave' },
      { id: 'pyramid', label: 'Pyramid' },
      { id: 'valley', label: 'Valley' },
      { id: 'staircase', label: 'Steps' },
      { id: 'random', label: 'Random' }
    ];

    panel.innerHTML = `
      <div class="controls">
        <!-- Characters -->
        <div class="control-group">
          <div class="control-label">
            <span class="icon">◆</span> Characters
            ${tooltip('Choose which type of combining marks to use')}
          </div>
          ${pillGroup(charTypes, 'charType')}
        </div>

        <!-- Position -->
        <div class="control-group">
          <div class="control-label">
            <span class="icon">↕</span> Position
            ${tooltip('Where marks appear relative to each character')}
          </div>
          ${pillGroup(positions, 'position')}
        </div>

        <!-- Shape -->
        <div class="control-group full-width">
          <div class="control-label">
            <span class="icon">〰</span> Shape
            ${tooltip('How mark density varies across the text length')}
          </div>
          <div class="shape-grid">
            ${shapeList.map(s => `
              <button class="shape-option${state.shape === s.id ? ' active' : ''}" data-shape="${s.id}">
                <div class="shape-bars">${shapeBars(s.id)}</div>
                <span>${s.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Frequency -->
        <div class="control-group">
          <div class="control-label">
            <span class="icon">⚡</span> Frequency
            ${tooltip('Probability each character gets marks (0 = none, 100% = all)')}
          </div>
          <div class="slider-row">
            <input type="range" class="slider-track" id="frequencySlider"
              min="0" max="1" step="0.05" value="${state.frequency}">
            <span class="slider-value" id="frequencyValue">${Math.round(state.frequency * 100)}%</span>
          </div>
        </div>

        <!-- Amplitude -->
        <div class="control-group">
          <div class="control-label">
            <span class="icon">◉</span> Amplitude
            ${tooltip('Number of marks stacked per character (1 = subtle, 20 = chaos)')}
          </div>
          <div class="slider-row">
            <input type="range" class="slider-track" id="amplitudeSlider"
              min="1" max="20" step="1" value="${state.amplitude}">
            <span class="slider-value" id="amplitudeValue">${state.amplitude}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── Build Output Section ────────────────────────────────────────
  function buildOutput() {
    const container = $('#zalgoOutputSection');
    if (!container) return;

    container.innerHTML = `
      <div class="output-section">
        <div class="output-header">
          <div class="output-header-left">
            <span class="output-badge">Live Output</span>
            <span class="output-chars" id="outputCharCount">0 chars</span>
          </div>
          <div class="output-actions">
            <button class="btn btn-regen" id="regenBtn">↻ Regenerate</button>
            <button class="btn btn-copy" id="copyBtn" disabled>Copy</button>
          </div>
        </div>
        <div class="output-body" id="outputBody">
          <span class="output-placeholder">Start typing to generate zalgo text…</span>
        </div>
      </div>
    `;
  }

  // ── Build Decode Section ────────────────────────────────────────
  function buildDecode() {
    const container = $('#zalgoDecodeSection');
    if (!container) return;

    container.innerHTML = `
      <div class="decode-section">
        <div class="control-label" style="margin-bottom:12px">
          <span class="icon">🔓</span> Decode Zalgo
          ${tooltip('Paste any zalgo text to strip combining marks and reveal the original')}
        </div>
        <div class="decode-row">
          <textarea class="decode-input" id="decodeInput"
            placeholder="Paste zalgo text here to decode…" rows="2"></textarea>
          <div class="decode-arrow">→</div>
          <div class="decode-output" id="decodeOutput">
            <span class="placeholder">Clean text appears here</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── Render / Update ─────────────────────────────────────────────
  function runGenerate() {
    const input = $('#mainInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
      state.output = '';
      updateOutput();
      return;
    }

    state.output = generateZalgo(text, {
      charType:  state.charType,
      position:  state.position,
      shape:     state.shape,
      frequency: state.frequency,
      amplitude: state.amplitude
    });
    updateOutput();
  }

  function updateOutput() {
    const body  = $('#outputBody');
    const chars = $('#outputCharCount');
    const btn   = $('#copyBtn');

    if (!body) return;

    if (state.output) {
      body.textContent = state.output;
      body.classList.remove('output-placeholder');
    } else {
      body.innerHTML = '<span class="output-placeholder">Start typing to generate zalgo text…</span>';
    }

    if (chars) chars.textContent = state.output.length + ' chars';
    if (btn)   btn.disabled = !state.output;
  }

  // ── Event Binding ───────────────────────────────────────────────
  function bindEvents() {
    const panel = $('#zalgoControlPanel');

    // Pill buttons (characters + position)
    panel.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill[data-group]');
      if (pill) {
        const group = pill.dataset.group;
        const value = pill.dataset.value;
        state[group] = value;

        // Update active class
        panel.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        runGenerate();
        return;
      }

      // Shape buttons
      const shapeBtn = e.target.closest('.shape-option[data-shape]');
      if (shapeBtn) {
        state.shape = shapeBtn.dataset.shape;
        panel.querySelectorAll('.shape-option').forEach(s => s.classList.remove('active'));
        shapeBtn.classList.add('active');
        runGenerate();
      }
    });

    // Frequency slider
    const freqSlider = $('#frequencySlider');
    const freqValue  = $('#frequencyValue');
    if (freqSlider) {
      freqSlider.addEventListener('input', () => {
        state.frequency = parseFloat(freqSlider.value);
        freqValue.textContent = Math.round(state.frequency * 100) + '%';
        runGenerate();
      });
    }

    // Amplitude slider
    const ampSlider = $('#amplitudeSlider');
    const ampValue  = $('#amplitudeValue');
    if (ampSlider) {
      ampSlider.addEventListener('input', () => {
        state.amplitude = parseInt(ampSlider.value, 10);
        ampValue.textContent = state.amplitude;
        runGenerate();
      });
    }

    // Text input
    const mainInput  = $('#mainInput');
    const charCount  = $('#charCount');
    if (mainInput) {
      mainInput.addEventListener('input', () => {
        if (mainInput.value.length > 500) {
          mainInput.value = mainInput.value.slice(0, 500);
        }
        if (charCount) charCount.textContent = mainInput.value.length;
        runGenerate();
      });
    }

    // Copy button
    const copyBtn = $('#copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!state.output) return;
        try {
          await navigator.clipboard.writeText(state.output);
          copyBtn.textContent = '✓ Copied';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 1500);
        } catch (err) {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = state.output;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.textContent = '✓ Copied';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 1500);
        }
      });
    }

    // Regenerate button
    const regenBtn = $('#regenBtn');
    if (regenBtn) {
      regenBtn.addEventListener('click', runGenerate);
    }

    // Decode input
    const decodeInput  = $('#decodeInput');
    const decodeOutput = $('#decodeOutput');
    if (decodeInput && decodeOutput) {
      decodeInput.addEventListener('input', () => {
        const raw = decodeInput.value;
        const clean = raw.replace(/[\u0300-\u036f\u0488\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, '');
        if (clean) {
          decodeOutput.textContent = clean;
          decodeOutput.classList.remove('placeholder');
        } else {
          decodeOutput.innerHTML = '<span class="placeholder">Clean text appears here</span>';
        }
      });
    }
  }

  // ── URL State Sync ──────────────────────────────────────────────
  function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('text')) {
      const input = $('#mainInput');
      if (input) {
        input.value = params.get('text').slice(0, 500);
        const charCount = $('#charCount');
        if (charCount) charCount.textContent = input.value.length;
      }
    }
    if (params.has('chars'))     state.charType  = params.get('chars');
    if (params.has('pos'))       state.position  = params.get('pos');
    if (params.has('shape'))     state.shape     = params.get('shape');
    if (params.has('freq'))      state.frequency = parseFloat(params.get('freq'));
    if (params.has('amp'))       state.amplitude = parseInt(params.get('amp'), 10);
  }

  function syncToURL() {
    const input = $('#mainInput');
    if (!input) return;
    const params = new URLSearchParams();
    if (input.value)                       params.set('text',  input.value);
    if (state.charType  !== 'all')         params.set('chars', state.charType);
    if (state.position  !== 'all')         params.set('pos',   state.position);
    if (state.shape     !== 'uniform')     params.set('shape', state.shape);
    if (state.frequency !== 0.8)           params.set('freq',  state.frequency);
    if (state.amplitude !== 5)             params.set('amp',   state.amplitude);

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState(null, '', url);
  }

  // Debounced URL sync
  let syncTimer = null;
  const origRunGenerate = runGenerate;
  // Monkey-patch to add URL sync after every generate
  const wrappedRunGenerate = function () {
    origRunGenerate();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToURL, 300);
  };

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    loadFromURL();
    buildControls();
    buildOutput();
    buildDecode();
    bindEvents();

    // Override runGenerate calls to also sync URL
    // Re-bind slider & input events to use URL-syncing version
    const freqSlider = $('#frequencySlider');
    const ampSlider  = $('#amplitudeSlider');
    const mainInput  = $('#mainInput');
    const regenBtn   = $('#regenBtn');

    // We need to re-wrap because bindEvents already attached listeners.
    // Instead, we hook into the state update to sync URL separately.
    // Use a MutationObserver-style approach: just observe output changes.
    const observer = new MutationObserver(() => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncToURL, 300);
    });
    const outputBody = $('#outputBody');
    if (outputBody) {
      observer.observe(outputBody, { childList: true, characterData: true, subtree: true });
    }

    // Initial generate
    runGenerate();
  }

  // ── Boot ────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
