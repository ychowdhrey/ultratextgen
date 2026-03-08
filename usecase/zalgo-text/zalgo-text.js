/* ══════════════════════════════════════════════════════════════════
   Zalgo Text Generator — zalgo-text.js
   Pure vanilla JS. No dependencies.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Unicode Combining Mark Pools ────────────────────────────────
  const MARKS_UP = [
    '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307',
    '\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F',
    '\u0310','\u0311','\u0312','\u0313','\u0314','\u0315','\u031A','\u033D',
    '\u033E','\u033F','\u0340','\u0341','\u0342','\u0343','\u0344','\u0346',
    '\u034A','\u034B','\u034C','\u0350','\u0351','\u0352','\u0357','\u0358',
    '\u035B','\u035D','\u035E','\u0360','\u0361','\u0363','\u0364','\u0365',
    '\u0366','\u0367','\u0368','\u0369','\u036A','\u036B','\u036C','\u036D',
    '\u036E','\u036F'
  ];

  const MARKS_MID = [
    '\u0334','\u0335','\u0336','\u0337','\u0338','\u0488','\u0489',
    '\u20D0','\u20D1','\u20D2','\u20D3','\u20D4','\u20D5','\u20D6','\u20D7',
    '\u20D8','\u20D9','\u20DA','\u20DB','\u20DC','\u20DD','\u20DE','\u20DF',
    '\u20E0','\u20E1','\u20E2','\u20E3','\u20E4','\u20E5','\u20E6','\u20E7',
    '\u20E8','\u20E9'
  ];

  const MARKS_DOWN = [
    '\u0316','\u0317','\u0318','\u0319','\u031C','\u031D','\u031E','\u031F',
    '\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327',
    '\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F',
    '\u0330','\u0331','\u0332','\u0333','\u0339','\u033A','\u033B','\u033C',
    '\u0345','\u0347','\u0348','\u0349','\u034D','\u034E','\u0353','\u0354',
    '\u0355','\u0356','\u0359','\u035A','\u035C','\u035F','\u0362'
  ];

  // ── Character Type Filters ──────────────────────────────────────
  const CHAR_POOLS = {
    bars:    new Set(['\u0336','\u0335','\u0334','\u0337','\u0338']),
    letters: new Set([
      '\u0363','\u0364','\u0365','\u0366','\u0367','\u0368','\u0369','\u036A',
      '\u036B','\u036C','\u036D','\u036E','\u036F'
    ]),
    symbols: new Set([
      '\u0488','\u0489','\u20D0','\u20D1','\u20D2','\u20D3','\u20D4','\u20D5',
      '\u20D6','\u20D7','\u20D8','\u20D9','\u20DA','\u20DB','\u20DC','\u20DD',
      '\u20DE','\u20DF','\u20E0','\u20E1','\u20E2','\u20E3','\u20E4'
    ]),
    noise: new Set([
      '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307',
      '\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F',
      '\u0310','\u0311','\u0312','\u0313','\u0314','\u0315','\u0316','\u0317',
      '\u0318','\u0319','\u031C','\u031D','\u031E','\u031F','\u0320','\u0321',
      '\u0322','\u0323','\u0324','\u0325','\u0326','\u0327','\u0328','\u0329',
      '\u032A','\u032B','\u032C','\u032D','\u032E','\u032F','\u0330','\u0331',
      '\u0332','\u0333'
    ])
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

  // ── Core Generator ──────────────────────────────────────────────
  function generateZalgo(text, opts) {
    const charType  = opts.charType  || 'all';
    const position  = opts.position  || 'all';
    const shape     = opts.shape     || 'uniform';
    const frequency = opts.frequency != null ? opts.frequency : 0.7;
    const amplitude = opts.amplitude != null ? opts.amplitude : 5;

    // Build filtered pools
    let upPool   = MARKS_UP.slice();
    let midPool  = MARKS_MID.slice();
    let downPool = MARKS_DOWN.slice();

    if (charType !== 'all' && CHAR_POOLS[charType]) {
      const allowed = CHAR_POOLS[charType];
      const filterPool = (pool) => {
        const filtered = pool.filter(m => allowed.has(m));
        return filtered.length > 0 ? filtered : pool; // fallback to full
      };
      upPool   = filterPool(upPool);
      midPool  = filterPool(midPool);
      downPool = filterPool(downPool);
    }

    // Position flags
    const useUp   = position === 'all' || position === 'up' || position === 'up-down';
    const useMid  = position === 'all' || position === 'mid';
    const useDown = position === 'all' || position === 'down' || position === 'up-down';

    const shapeFn = SHAPES[shape] || SHAPES.uniform;
    const chars = [...text];
    const len = chars.length;

    return chars.map((ch, i) => {
      if (ch === ' ') return ch;
      if (Math.random() > frequency) return ch;

      const shapeMultiplier = shapeFn(i, len);
      const markCount = Math.max(1, Math.round(amplitude * shapeMultiplier));

      let marks = '';
      for (let m = 0; m < markCount; m++) {
        const pools = [];
        if (useUp   && upPool.length)   pools.push(upPool);
        if (useMid  && midPool.length)  pools.push(midPool);
        if (useDown && downPool.length) pools.push(downPool);
        if (pools.length === 0) continue;
        const pool = pools[Math.floor(Math.random() * pools.length)];
        marks += pool[Math.floor(Math.random() * pool.length)];
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
