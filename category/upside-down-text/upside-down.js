/* ══════════════════════════════════════════════════════════════════
   Upside Down Text Generator — upside-down.js
   Self-contained. No dependencies, no shared homepage machinery.
   (Mirrors the zalgo-text.js controller pattern.)
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── i18n — translated strings via window.upsideDownI18n, else English ──
  const i18n = Object.assign({
    controlMode:        'Style',
    controlWrap:        'Wrap',
    controlPresets:     'Quick phrases',
    tooltipMode:        'How your text is transformed',
    tooltipWrap:        'Optional decoration wrapped around the result',
    tooltipPresets:     'Load a ready-made phrase to flip',
    outputBadge:        'Live Output',
    outputChars:        'chars',
    btnCopy:            'Copy',
    btnCopied:          '✓ Copied',
    outputPlaceholder:  'Start typing to flip your text…',
    coveragePrefix:     'No upside-down twin for:',
    modeFlipDesc:       'Flipped and reversed — reads right-side up when the phone is rotated 180° (the classic "flip your phone" trick).',
    modeBackwardsDesc:  'Character order reversed only, not flipped — a mirror-writing / backwards effect.',
    modeMirrorDesc:     'Left-to-right mirror illusion using look-alike characters.',
    modePerlineDesc:    'Each line is flipped in place but lines keep their order — best for multi-line bios and captions.',
    modeEmphasisDesc:   'Flips only the last word, or any text you wrap in [[double brackets]].'
  }, window.upsideDownI18n || {});

  // ── Flip map (complete & symmetric — fixes the missing p/q/u twins) ──
  const FLIP = {
    a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ',
    j: 'ɾ', k: 'ʞ', l: 'ן', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
    s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
    A: '∀', B: 'ᗺ', C: 'Ɔ', D: 'ᗡ', E: 'Ǝ', F: 'Ⅎ', G: 'פ', H: 'H', I: 'I',
    J: 'ſ', K: 'ʞ', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ò', R: 'ᴚ',
    S: 'S', T: '┴', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
    '0': '0', '1': '⇂', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9',
    '7': 'ㄥ', '8': '8', '9': '6',
    '.': '˙', ',': '\'', '\'': ',', '"': '„', '`': ',', '_': '‾',
    '?': '¿', '!': '¡', '¿': '?', '¡': '!',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
    '&': '⅋', ';': '؛', '∴': '∵', '‿': '⁀', '⁅': '⁆'
  };

  // Look-alike map for the mirror illusion (chars with no true flip)
  const ILLUSION = { b: 'd', d: 'b', p: 'q', q: 'p', n: 'u', u: 'n' };

  // ── Core transforms ─────────────────────────────────────────────
  function flipChar(ch) {
    // Try exact case first, then the opposite case so K → ʞ instead of passing through.
    return FLIP[ch] || FLIP[ch.toLowerCase()] || FLIP[ch.toUpperCase()] || null;
  }

  function flipReverse(str) {
    return Array.from(str).reverse().map(ch => flipChar(ch) || ch).join('');
  }

  function reverseOnly(str) {
    return Array.from(str).reverse().join('');
  }

  function mirror(str) {
    return Array.from(str).reverse()
      .map(ch => flipChar(ch) || ILLUSION[ch] || ILLUSION[ch.toLowerCase()] || ch)
      .join('');
  }

  function perLine(str) {
    return str.split('\n').map(line => flipReverse(line)).join('\n');
  }

  function emphasis(str) {
    const markerRegex = /\[\[(.*?)\]\]/g;
    if (markerRegex.test(str)) {
      return str.replace(/\[\[(.*?)\]\]/g, (_, inner) => flipReverse(inner));
    }
    // No markers: flip the last word of each line, keep the rest upright.
    return str.split('\n').map(line => {
      const words = line.split(' ');
      if (!words.length) return line;
      words[words.length - 1] = flipReverse(words[words.length - 1]);
      return words.join(' ');
    }).join('\n');
  }

  const MODES = {
    flip:      { fn: flipReverse, desc: i18n.modeFlipDesc,      flips: true  },
    backwards: { fn: reverseOnly, desc: i18n.modeBackwardsDesc, flips: false },
    mirror:    { fn: mirror,      desc: i18n.modeMirrorDesc,    flips: true  },
    perline:   { fn: perLine,     desc: i18n.modePerlineDesc,   flips: true  },
    emphasis:  { fn: emphasis,    desc: i18n.modeEmphasisDesc,  flips: true  }
  };

  const WRAPS = {
    none:     (t) => t,
    face:     (t) => '🙃 ' + t + ' 🙃',
    cross:    (t) => '⸸ ' + t + ' ⸸',
    brackets: (t) => '「' + t + '」',
    stars:    (t) => '✦ ' + t + ' ✦'
  };

  // ── State ───────────────────────────────────────────────────────
  const state = { mode: 'flip', wrap: 'none', output: '' };

  // ── DOM helpers ─────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);

  function tooltip(text) {
    return `<span class="tooltip-trigger">?<span class="tooltip-text">${text}</span></span>`;
  }

  function pillGroup(items, groupAttr) {
    return `<div class="pill-group">${items.map(item =>
      `<button class="pill${item.id === state[groupAttr] ? ' active' : ''}" data-group="${groupAttr}" data-value="${item.id}">${item.label}</button>`
    ).join('')}</div>`;
  }

  // ── Build controls ──────────────────────────────────────────────
  function buildControls() {
    const panel = $('#udControlPanel');
    if (!panel) return;

    const modes = [
      { id: 'flip',      label: 'Upside Down' },
      { id: 'backwards', label: 'Backwards' },
      { id: 'mirror',    label: 'Mirror' },
      { id: 'perline',   label: 'Flip Each Line' },
      { id: 'emphasis',  label: 'Last Word' }
    ];
    const wraps = [
      { id: 'none',     label: 'None' },
      { id: 'face',     label: '🙃 Face' },
      { id: 'cross',    label: '⸸ Cross' },
      { id: 'brackets', label: '「」 Brackets' },
      { id: 'stars',    label: '✦ Stars' }
    ];
    const presets = [
      'I love you', 'turn that frown upside down', 'happy birthday', 'hello'
    ];

    panel.innerHTML = `
      <div class="controls">
        <div class="control-group full-width">
          <div class="control-label">
            <span class="icon">↻</span> ${i18n.controlMode}
            ${tooltip(i18n.tooltipMode)}
          </div>
          ${pillGroup(modes, 'mode')}
          <p class="mode-desc" id="udModeDesc">${MODES[state.mode].desc}</p>
        </div>

        <div class="control-group">
          <div class="control-label">
            <span class="icon">◈</span> ${i18n.controlWrap}
            ${tooltip(i18n.tooltipWrap)}
          </div>
          ${pillGroup(wraps, 'wrap')}
        </div>

        <div class="control-group">
          <div class="control-label">
            <span class="icon">✎</span> ${i18n.controlPresets}
            ${tooltip(i18n.tooltipPresets)}
          </div>
          <div class="pill-group">
            ${presets.map(p =>
              `<button class="pill" data-preset="${p.replace(/"/g, '&quot;')}">${p}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── Build output ────────────────────────────────────────────────
  function buildOutput() {
    const container = $('#udOutputSection');
    if (!container) return;
    container.innerHTML = `
      <div class="output-section">
        <div class="output-header">
          <div class="output-header-left">
            <span class="output-badge">${i18n.outputBadge}</span>
            <span class="output-chars" id="udCharCount">0 ${i18n.outputChars}</span>
          </div>
          <div class="output-actions">
            <button class="btn btn-copy" id="udCopyBtn" disabled>${i18n.btnCopy}</button>
          </div>
        </div>
        <div class="output-body" id="udOutputBody">
          <span class="output-placeholder">${i18n.outputPlaceholder}</span>
        </div>
        <div class="coverage-note" id="udCoverage" hidden></div>
      </div>
    `;
  }

  // ── Generate / update ───────────────────────────────────────────
  function runGenerate() {
    const input = $('#mainInput');
    if (!input) return;
    const text = input.value;
    state.output = text ? WRAPS[state.wrap](MODES[state.mode].fn(text)) : '';
    updateOutput(text);
  }

  function updateOutput(rawText) {
    const body  = $('#udOutputBody');
    const chars = $('#udCharCount');
    const btn   = $('#udCopyBtn');
    const cov   = $('#udCoverage');
    if (!body) return;

    if (state.output) {
      body.textContent = state.output;
      body.classList.remove('output-placeholder');
    } else {
      body.innerHTML = `<span class="output-placeholder">${i18n.outputPlaceholder}</span>`;
    }
    if (chars) chars.textContent = state.output.length + ' ' + i18n.outputChars;
    if (btn)   btn.disabled = !state.output;

    // Honesty / coverage note: which alphanumerics had no upside-down twin.
    if (cov) {
      let missing = [];
      if (rawText && MODES[state.mode].flips) {
        const seen = new Set();
        for (const ch of rawText) {
          if (/[a-z0-9]/i.test(ch) && !flipChar(ch) && !seen.has(ch.toLowerCase())) {
            seen.add(ch.toLowerCase());
            missing.push(ch);
          }
        }
      }
      if (missing.length) {
        cov.textContent = i18n.coveragePrefix + ' ' + missing.join(' ') +
          ' — these stay upright (no Unicode flip exists).';
        cov.hidden = false;
      } else {
        cov.hidden = true;
      }
    }
  }

  // ── Events ──────────────────────────────────────────────────────
  function bindEvents() {
    const panel = $('#udControlPanel');

    panel.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill[data-group]');
      if (pill) {
        const group = pill.dataset.group;
        state[group] = pill.dataset.value;
        panel.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        if (group === 'mode') {
          const desc = $('#udModeDesc');
          if (desc) desc.textContent = MODES[state.mode].desc;
        }
        runGenerate();
        syncToURL();
        return;
      }
      const preset = e.target.closest('.pill[data-preset]');
      if (preset) {
        const input = $('#mainInput');
        if (input) {
          input.value = preset.dataset.preset;
          const cc = $('#charCount');
          if (cc) cc.textContent = input.value.length;
        }
        runGenerate();
        syncToURL();
      }
    });

    const mainInput = $('#mainInput');
    const charCount = $('#charCount');
    if (mainInput) {
      mainInput.addEventListener('input', () => {
        if (mainInput.value.length > 500) mainInput.value = mainInput.value.slice(0, 500);
        if (charCount) charCount.textContent = mainInput.value.length;
        runGenerate();
        debounceSync();
      });
    }

    const copyBtn = $('#udCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!state.output) return;
        try {
          await navigator.clipboard.writeText(state.output);
        } catch (err) {
          const ta = document.createElement('textarea');
          ta.value = state.output;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        copyBtn.textContent = i18n.btnCopied;
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = i18n.btnCopy;
          copyBtn.classList.remove('copied');
        }, 1500);
      });
    }

    // FAQ accordion (self-contained — replaces script.js behaviour)
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
    });
  }

  // ── URL state sync ──────────────────────────────────────────────
  function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const input = $('#mainInput');
    // ?q= is the site-wide shareable-text param; ?text= kept for parity.
    const text = params.get('q') || params.get('text');
    if (text && input) {
      input.value = text.slice(0, 500);
      const cc = $('#charCount');
      if (cc) cc.textContent = input.value.length;
    }
    if (params.has('mode') && MODES[params.get('mode')]) state.mode = params.get('mode');
    if (params.has('wrap') && WRAPS[params.get('wrap')]) state.wrap = params.get('wrap');
  }

  function syncToURL() {
    const input = $('#mainInput');
    if (!input) return;
    const params = new URLSearchParams();
    if (input.value)             params.set('q', input.value);
    if (state.mode !== 'flip')   params.set('mode', state.mode);
    if (state.wrap !== 'none')   params.set('wrap', state.wrap);
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  let syncTimer = null;
  function debounceSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToURL, 300);
  }

  // ── Init ────────────────────────────────────────────────────────
  function init() {
    loadFromURL();
    buildControls();
    buildOutput();
    bindEvents();
    runGenerate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
