/* ══════════════════════════════════════════════════════════════════
   Upside Down Text Generator — upside-down.js
   Self-contained. No dependencies, no shared homepage machinery.
   (Mirrors the zalgo-text.js controller pattern.)

   Share (2026-11-01): the one thing this page borrows is the site's share
   core (/js/share/share-core.js, tagged before this file), which builds the
   Share / Share-as-image pair under the output and owns the act of sharing.
   The link it shares is this page's own live URL (q, mode, wrap), so the
   recipient opens the exact same result and can change it. Until then this
   was the only Unicode generator on the site with Copy and no Share.
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
    btnCopyFailed:      'Copy failed',
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

  // Reverse by user-perceived character. Reversing code points turned a flag
  // into its mirror image (the wrong country), reordered family emoji, split
  // skin tones off their emoji and moved Thai and Devanagari vowel and tone
  // marks onto the wrong consonant.
  const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

  function clusters(str) {
    return segmenter ? Array.from(segmenter.segment(str), x => x.segment) : Array.from(str);
  }

  // A base letter that carries combining marks keeps them after the flipped
  // base; a cluster whose first code point has no flip stays whole.
  function flipCluster(cl) {
    const whole = flipChar(cl);
    if (whole) return whole;
    const cps = Array.from(cl);
    if (cps.length > 1) {
      const base = flipChar(cps[0]);
      if (base) return base + cps.slice(1).join('');
    }
    return null;
  }

  function flipReverse(str) {
    return clusters(str).reverse().map(ch => flipCluster(ch) || ch).join('');
  }

  function reverseOnly(str) {
    return clusters(str).reverse().join('');
  }

  function mirror(str) {
    return clusters(str).reverse()
      .map(ch => flipCluster(ch) || ILLUSION[ch] || ILLUSION[ch.toLowerCase()] || ch)
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

  // Visible names of the five modes: the pills, and the name the share
  // button reads out ("Share: Mirror").
  const MODE_LABELS = {
    flip: 'Upside Down', backwards: 'Backwards', mirror: 'Mirror',
    perline: 'Flip Each Line', emphasis: 'Last Word'
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

    const modes = Object.keys(MODES).map(id => ({ id, label: MODE_LABELS[id] }));
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
    buildShare(container);
  }

  // ── Share ───────────────────────────────────────────────────────
  // The Share / Share-as-image pair from the site's share core, beside Copy.
  // The core's delegated handlers read the creation from data-share-* on the
  // buttons; syncShareState() keeps those current. Nothing is wired here.
  function buildShare(container) {
    const UTG = window.UltraTextGen;
    const actions = container.querySelector('.output-actions');
    if (!actions || !UTG || !UTG.buildShareActions || $('#udShareRow')) return;
    const row = UTG.buildShareActions({
      styleId: 'upside-down',
      name: MODE_LABELS[state.mode],
      text: state.output,
      url: shareUrl(),
      surface: 'upside_down',
      itemType: 'style',
      disabled: !state.output
    });
    row.id = 'udShareRow';
    actions.appendChild(row);
    syncShareState();
  }

  function syncShareState() {
    const row = $('#udShareRow');
    if (!row) return;
    const input = $('#mainInput');
    const url = shareUrl();
    row.querySelectorAll('.share-result-btn, .share-image-btn').forEach(btn => {
      btn.dataset.shareText = state.output;
      btn.dataset.shareQ = input ? input.value : '';
      btn.dataset.shareUrl = url;
      btn.dataset.shareId = 'upside-down-' + state.mode;
      btn.dataset.shareName = MODE_LABELS[state.mode];
      btn.disabled = !state.output;
    });
    // The mode is part of each button's accessible name ("Copy link: Mirror"),
    // so a mode change repaints the labels from the datasets just stamped.
    const UTG = window.UltraTextGen;
    if (UTG && UTG.relabelShareButtons) UTG.relabelShareButtons();
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
    syncShareState();

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
        // A copy row fires on success, as everywhere else on the site; the
        // execCommand fallback reports whether it worked, and a refused copy
        // says so instead of "Copied". The row names its own method, which
        // is not catalogue content, so the typed text never reaches the
        // dataLayer (header.js trackCopy sends copy_item_group only).
        let copied = false;
        try {
          await navigator.clipboard.writeText(state.output);
          copied = true;
        } catch (err) {
          const ta = document.createElement('textarea');
          ta.value = state.output;
          document.body.appendChild(ta);
          ta.select();
          try { copied = document.execCommand('copy') === true; } catch (e2) { copied = false; }
          document.body.removeChild(ta);
        }
        if (copied && window.UltraTextGen && window.UltraTextGen.trackCopy) {
          window.UltraTextGen.trackCopy('upside_down', state.output);
        }
        copyBtn.textContent = copied ? i18n.btnCopied : i18n.btnCopyFailed;
        copyBtn.classList.add(copied ? 'copied' : 'copy-error');
        setTimeout(() => {
          copyBtn.textContent = i18n.btnCopy;
          copyBtn.classList.remove('copied', 'copy-error');
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

  // The page's state as a query string: what the address bar shows and what
  // a share link carries, from one definition so they can never disagree.
  function stateQuery() {
    const input = $('#mainInput');
    const params = new URLSearchParams();
    if (input && input.value)    params.set('q', input.value);
    if (state.mode !== 'flip')   params.set('mode', state.mode);
    if (state.wrap !== 'none')   params.set('wrap', state.wrap);
    const qs = params.toString();
    return qs ? '?' + qs : '';
  }

  function shareUrl() {
    return window.location.origin + window.location.pathname + stateQuery();
  }

  function syncToURL() {
    if (!$('#mainInput')) return;
    window.history.replaceState(null, '', window.location.pathname + stateQuery());
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
