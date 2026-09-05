/* ══════════════════════════════════════════════════════════════════
   Zalgo Text Generator — zalgo-text.js
   Pure vanilla JS. No dependencies.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── i18n — read translated strings from window.zalgoI18n if provided,
  //           otherwise fall back to English defaults.
  const i18n = Object.assign({
    controlCharacters:       'Characters',
    controlPosition:         'Position',
    controlShape:            'Shape',
    controlFrequency:        'Frequency',
    controlAmplitude:        'Amplitude',
    tooltipCharacters:       'Choose which type of combining marks to use',
    tooltipPosition:         'Where marks appear relative to each character. Mid (overlay) marks can show as □ boxes on some devices and are filtered by Roblox.',
    tooltipShape:            'How mark density varies across the text length',
    tooltipFrequency:        'Probability each character gets marks (0 = none, 100% = all)',
    tooltipAmplitude:        'Number of marks stacked per character (1 = subtle, 20 = chaos)',
    pillAll:                 'All',
    pillBars:                'Bars',
    pillLetters:             'Letters',
    pillSymbols:             'Symbols',
    pillNoise:               'Noise',
    pillUpDown:              'Up & Down',
    pillUp:                  'Up',
    pillMid:                 'Mid',
    pillDown:                'Down',
    shapeUniform:            'Uniform',
    shapeSlopeUp:            'Slope Up',
    shapeSlopeDown:          'Slope Down',
    shapeWave:               'Wave',
    shapePyramid:            'Pyramid',
    shapeValley:             'Valley',
    shapeStaircase:          'Steps',
    shapeRandom:             'Random',
    outputBadge:             'Live Output',
    outputChars:             'chars',
    btnRegenerate:           '↻ Regenerate',
    btnCopy:                 'Copy',
    btnCopied:               '✓ Copied',
    outputPlaceholder:       'Start typing to generate zalgo text…',
    decodeTitle:             'Decode Zalgo',
    decodeTooltip:           'Paste any zalgo text to strip combining marks and reveal the original',
    decodePlaceholder:       'Paste zalgo text here to decode…',
    decodeOutputPlaceholder: 'Clean text appears here',
    controlPresets:          'Quick Presets',
    tooltipPresets:          'One-click starting points — pick one, then fine-tune any control below',
    presetSubtle:            'Subtle',
    presetClassic:           'Classic',
    presetCursed:            'Cursed',
    presetChaos:             'HE COMES',
    presetTinyStack:         'Tiny Stack',
    presetCustom:            'Custom',
    fitTitle:                'Will it fit?',
    fitTooltip:              'Zalgo marks count toward platform character limits. Green = your output fits.',
    fitDiscordMsg:           'Discord message',
    fitXPost:                'X / Tweet',
    fitInstaBio:             'Instagram bio',
    fitDiscordNick:          'Discord nickname',
    decodeCopy:              'Copy',
    decodeCopied:            '✓ Copied',
    decodeRemoved:           'marks removed',
    variantsTitle:           'More styles',
    variantsTooltip:         'Your text in other zalgo flavours — copy any of them without touching the controls',
    variantUpDown:           'Up & Down',
    variantSpires:           'Spires',
    variantRoots:            'Roots',
    variantStrike:           'Strikethrough',
    variantTinyStack:        'Tiny Stack',
    // Cascade (Thai stack) mode. Its controls render only on pages that opt in
    // with data-cascade on #zalgoControlPanel, so a locale page never shows
    // these strings in English by accident (issue #864, criterion 12).
    presetCascade:           'Thai Cascade',
    controlCascade:          'Thai Cascade',
    tooltipCascade:          'One Thai tone mark repeated many times on one carrier letter. Depending on the app and font it renders as a tall column, a diagonal, or gets clipped.',
    cascadeDepth:            'Stack depth',
    tooltipCascadeDepth:     'How many times the mark repeats (10 = short, 150 = the full internet spike)',
    cascadePlacement:        'Placement',
    cascadePrefix:           'Before text',
    cascadeSuffix:           'After text',
    cascadeEach:             'Every character',
    cascadeMark:             'Mark',
    cascadeMarkMaiEk:        'Mai Ek',
    cascadeMarkMaiTho:       'Mai Tho',
    cascadeMarkMaiTri:       'Mai Tri',
    cascadeMarkMaiChattawa:  'Mai Chattawa',
    cascadeAnchor:           'Carrier',
    cascadeAnchorThai:       'Thai letter',
    cascadeAnchorText:       'Your text',
    cascadeNote:             'Direction and height vary by app and font. Every repeat counts as one character, screen readers announce each one, and some platforms truncate or reject the stack.',
    cascadeCopyLabel:        'Copy Thai cascade output',
    cascadeOutputLabel:      'Thai cascade output for: {text}'
  }, window.zalgoI18n || {});


  /* @zalgo-engine:begin */
  // Everything between the engine markers is pure: no DOM, no i18n, no
  // state. scripts/lib/zalgo-engine.js slices this block out of the shipped
  // file for the Node tests and the check-zalgo-decodes gate, so the pools,
  // the cascade and the decoder exist in exactly one copy, the one users run.

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
        // Multiple positions: split budget proportionally
        if (useUp && upPool.length) {
          const count = useMid
            ? Math.max(1, Math.round(markCount * 0.55))
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
            : Math.max(1, Math.round(markCount * 0.35));
          marks += pickUnique(downPool, count);
        }
      }

      return ch + marks;
    }).join('');
  }

  // ── Cascade: the "side spike" (one script-specific mark, repeated) ──
  // The viral effect is NOT classic zalgo at a higher amplitude. Classic
  // zalgo scatters many DIFFERENT general combining marks (U+0300 block)
  // around every letter. The cascade repeats ONE Thai tone mark dozens of
  // times on ONE carrier glyph; the renderer's attempt to place every repeat
  // relative to the same base is what produces the tall, often diagonal,
  // trail. It is its own engine so the classic pools, presets and amplitude
  // 1-20 stay exactly as they were, and so these marks never reach
  // pickUnique(): they are real Thai orthography, not noise.
  //
  // Direction and height are renderer-dependent (font, shaping engine, line
  // clipping). The UI says so; nothing here promises a diagonal.
  const CASCADE_MARKS = [
    { id: 'mai-ek',       char: '\u0E48', labelKey: 'cascadeMarkMaiEk' },       // THAI CHARACTER MAI EK
    { id: 'mai-tho',      char: '\u0E49', labelKey: 'cascadeMarkMaiTho' },      // THAI CHARACTER MAI THO
    { id: 'mai-tri',      char: '\u0E4A', labelKey: 'cascadeMarkMaiTri' },      // THAI CHARACTER MAI TRI
    { id: 'mai-chattawa', char: '\u0E4B', labelKey: 'cascadeMarkMaiChattawa' }  // THAI CHARACTER MAI CHATTAWA
  ];
  const CASCADE_DEFAULT_MARK = 'mai-tho';   // U+0E49, the mark in the known example
  const CASCADE_ANCHOR      = '\u0E01';     // THAI CHARACTER KO KAI, the carrier
  const CASCADE_DEPTH       = { min: 10, max: 150, step: 1, default: 80 };
  const CASCADE_PLACEMENTS  = ['prefix', 'suffix', 'each'];
  const CASCADE_ANCHORS     = ['thai', 'text'];

  function cascadeMark(id) {
    return CASCADE_MARKS.find(m => m.id === id) ||
           CASCADE_MARKS.find(m => m.id === CASCADE_DEFAULT_MARK);
  }

  function clampDepth(n) {
    const d = parseInt(n, 10);
    if (!Number.isFinite(d)) return CASCADE_DEPTH.default;
    return Math.min(CASCADE_DEPTH.max, Math.max(CASCADE_DEPTH.min, d));
  }

  // Deterministic: the same options always give the same string, which is
  // what makes it a shareable URL and a decodable example card.
  //   prefix / suffix + 'thai' carrier:  "ก้้้…้ text"  /  "text ก้้้…้"
  //   prefix / suffix + 'text' carrier:  "J้้้…้ust Ken" / "Just Ke้้้…้n"
  //   each:                              every non-whitespace code point
  function generateCascade(text, opts) {
    const o = opts || {};
    const stack     = cascadeMark(o.mark).char.repeat(clampDepth(o.depth));
    const placement = CASCADE_PLACEMENTS.indexOf(o.placement) !== -1 ? o.placement : 'prefix';
    const anchor    = CASCADE_ANCHORS.indexOf(o.anchor) !== -1 ? o.anchor : 'thai';
    const src       = text == null ? '' : String(text);

    if (placement === 'each') {
      return [...src].map(ch => (/\s/.test(ch) ? ch : ch + stack)).join('');
    }

    if (anchor === 'text' && src) {
      // Ride on the text's own first (prefix) or last (suffix) visible
      // character. Support for Thai marks on a Latin base varies more than
      // on the Thai carrier, which is why 'thai' is the default.
      const chars = [...src];
      const step  = placement === 'suffix' ? -1 : 1;
      let i = placement === 'suffix' ? chars.length - 1 : 0;
      while (i >= 0 && i < chars.length && /\s/.test(chars[i])) i += step;
      if (i >= 0 && i < chars.length) {
        chars[i] += stack;
        return chars.join('');
      }
    }

    const spike = CASCADE_ANCHOR + stack;
    if (!src) return spike;
    return placement === 'suffix' ? src + ' ' + spike : spike + ' ' + src;
  }

  // ── Decoder (unzalgo) ───────────────────────────────────────────
  // Strips by codepoint RANGE, never by decomposition, which is why every
  // example card on the site must stay base + combining mark (see
  // scripts/check-zalgo-decodes.js). Two stages:
  //   1. the classic combining-mark blocks, every occurrence;
  //   2. cascade runs: the SAME Thai tone mark (U+0E48..U+0E4B) two or more
  //      times in a row. Thai writes at most one tone mark per consonant, so
  //      a repeat is never language; it is a stack. A single mark is left
  //      alone, so "น้ำ" pasted into the box comes back as "น้ำ".
  // The tool's own carrier (ก + run, standing apart from the text) goes with
  // the separator space the tool inserted, so prefix and suffix output decode
  // to exactly the text that went in. No lookbehind: older mobile Safari
  // would refuse to parse the whole file.
  const DECODE_CLASSIC      = /[\u0300-\u036f\u0488\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g;
  const DECODE_CASCADE_RUN  = /([\u0E48-\u0E4B])\1+/g;
  const DECODE_SPIKE_PREFIX = /^(?:\u0E01([\u0E48-\u0E4B])\1+[ \t]?)+/;
  const DECODE_SPIKE_SUFFIX = /(?:[ \t]?\u0E01([\u0E48-\u0E4B])\1+)+$/;
  const DECODE_SPIKE_INLINE = /[ \t]\u0E01([\u0E48-\u0E4B])\1+(?=[ \t])/g;

  function decodeZalgo(raw) {
    const s = raw == null ? '' : String(raw);
    return s
      .replace(DECODE_CLASSIC, '')
      .replace(DECODE_SPIKE_PREFIX, '')
      .replace(DECODE_SPIKE_SUFFIX, '')
      .replace(DECODE_SPIKE_INLINE, '')
      .replace(DECODE_CASCADE_RUN, '');
  }
  /* @zalgo-engine:end */

  // ── Presets ─────────────────────────────────────────────────────
  // One-click starting points. Previews are pre-rendered (deterministic)
  // so the buttons read as a visual intensity scale at a glance.
  const PRESETS = [
    { id: 'subtle',    labelKey: 'presetSubtle',    preview: 'he̾͢ll͚͘o̡͡',
      settings: { charType: 'all', position: 'up-down', shape: 'uniform', frequency: 0.5, amplitude: 2 } },
    { id: 'classic',   labelKey: 'presetClassic',   preview: 'h̩̺̑̈́e̫̖͒l̨̰͂́l̪̈͋ͅō̫͇̌',
      settings: { charType: 'all', position: 'all', shape: 'uniform', frequency: 0.8, amplitude: 5 } },
    { id: 'cursed',    labelKey: 'presetCursed',    preview: 'ḩ̸͈̗́͊͋͗͑e̸̡̲̭̓̑̍͐̎l̷̳̪̲̒̍͒́̏l̶̡̙͍̃̀̽̔̍o̵̢̺̼͗́̋̕͝',
      settings: { charType: 'all', position: 'all', shape: 'uniform', frequency: 0.95, amplitude: 9 } },
    { id: 'chaos',     labelKey: 'presetChaos',     preview: 'h̵̶̘͖̭̠͓͚́̀̌͌̓̐̋̍͒ͅe̶̸̢͇̤̯̪̔͌̐̀̒̄̌̿͟͢͡',
      settings: { charType: 'all', position: 'all', shape: 'uniform', frequency: 1.0, amplitude: 18 } },
    { id: 'tinystack', labelKey: 'presetTinyStack', preview: 'hͪeͦlͪlͯoͫ',
      settings: { charType: 'letters', position: 'up', shape: 'uniform', frequency: 1.0, amplitude: 1 } }
  ];

  // The cascade is a mode, not a setting bundle: it switches the generator to
  // generateCascade() and leaves the classic controls untouched underneath.
  // Listed only when the page opts in (data-cascade on #zalgoControlPanel).
  const CASCADE_PRESET = {
    id: 'cascade', labelKey: 'presetCascade', cascade: true,
    preview: CASCADE_ANCHOR + cascadeMark(CASCADE_DEFAULT_MARK).char.repeat(8)
  };
  let cascadeAvailable = false;
  function presetList() {
    return cascadeAvailable ? PRESETS.concat([CASCADE_PRESET]) : PRESETS;
  }

  // ── Output Variants ─────────────────────────────────────────────
  // Fixed-flavour renders of the same input shown under the main
  // output, so users can grab an alternate look without learning the
  // controls (the one thing list-style generators did better).
  const VARIANTS = [
    { id: 'updown', labelKey: 'variantUpDown',
      opts: { charType: 'all', position: 'up-down', shape: 'uniform', frequency: 0.9, amplitude: 5 } },
    { id: 'spires', labelKey: 'variantSpires',
      opts: { charType: 'all', position: 'up', shape: 'uniform', frequency: 1, amplitude: 6 } },
    { id: 'roots', labelKey: 'variantRoots',
      opts: { charType: 'all', position: 'down', shape: 'uniform', frequency: 1, amplitude: 6 } },
    { id: 'strike', labelKey: 'variantStrike',
      opts: { charType: 'all', position: 'mid', shape: 'uniform', frequency: 1, amplitude: 2 } },
    { id: 'tiny', labelKey: 'variantTinyStack',
      opts: { charType: 'letters', position: 'up', shape: 'uniform', frequency: 1, amplitude: 1 } }
  ];

  // ── Platform Character Limits ───────────────────────────────────
  // Combining marks each count toward these limits, so heavy zalgo
  // "eats" a platform budget far faster than plain text.
  const PLATFORM_LIMITS = [
    { id: 'discord-msg',  labelKey: 'fitDiscordMsg',  limit: 2000 },
    { id: 'x-post',       labelKey: 'fitXPost',       limit: 280 },
    { id: 'insta-bio',    labelKey: 'fitInstaBio',    limit: 150 },
    { id: 'discord-nick', labelKey: 'fitDiscordNick', limit: 32 }
  ];

  // ── State ───────────────────────────────────────────────────────
  const state = {
    charType:  'all',
    position:  'all',
    shape:     'uniform',
    frequency: 0.8,
    amplitude: 5,
    output:    '',
    preset:    'classic',
    cascade: {
      enabled:   false,
      depth:     CASCADE_DEPTH.default,
      placement: 'prefix',
      mark:      CASCADE_DEFAULT_MARK,
      anchor:    'thai'
    }
  };

  // ── DOM References ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Helpers ─────────────────────────────────────────────────────
  // Tooltip trigger is a real button so it works by tap and keyboard,
  // not just mouse hover (mobile is the majority of traffic).
  function tooltip(text) {
    return `<button type="button" class="tooltip-trigger" aria-label="${text}">?<span class="tooltip-text" role="tooltip">${text}</span></button>`;
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

  // ── Cascade controls ───────────────────────────────────────────
  // Rendered only when the page opts in; hidden until the Thai Cascade
  // preset is picked. The Thai glyphs inside the mark pills are decorative
  // (aria-hidden); the accessible name is the mark's own name.
  function cascadeGroupHtml() {
    const c = state.cascade;
    const pills = (group, items) => `<div class="pill-group">${items.map(it =>
      `<button type="button" class="pill${it.id === c[group] ? ' active' : ''}" data-cascade="${group}" data-value="${it.id}">${it.label}</button>`
    ).join('')}</div>`;
    return `
      <div class="control-group cascade-group" id="cascadeGroup"${c.enabled ? '' : ' hidden'}>
        <div class="control-label">
          <span class="icon">⇈</span> ${i18n.controlCascade}
          ${tooltip(i18n.tooltipCascade)}
        </div>
        <div class="cascade-grid">
          <div class="cascade-field">
            <div class="cascade-field-label">${i18n.cascadeDepth} ${tooltip(i18n.tooltipCascadeDepth)}</div>
            <div class="slider-row">
              <input type="range" class="slider-track" id="cascadeDepthSlider"
                min="${CASCADE_DEPTH.min}" max="${CASCADE_DEPTH.max}" step="${CASCADE_DEPTH.step}"
                value="${c.depth}" aria-label="${i18n.cascadeDepth}">
              <span class="slider-value" id="cascadeDepthValue">${c.depth}</span>
            </div>
          </div>
          <div class="cascade-field">
            <div class="cascade-field-label">${i18n.cascadePlacement}</div>
            ${pills('placement', [
              { id: 'prefix', label: i18n.cascadePrefix },
              { id: 'suffix', label: i18n.cascadeSuffix },
              { id: 'each',   label: i18n.cascadeEach }
            ])}
          </div>
          <div class="cascade-field">
            <div class="cascade-field-label">${i18n.cascadeMark}</div>
            ${pills('mark', CASCADE_MARKS.map(m => ({
              id: m.id,
              label: `<span class="cascade-glyph" aria-hidden="true">${CASCADE_ANCHOR}${m.char}</span>${i18n[m.labelKey]}`
            })))}
          </div>
          <div class="cascade-field">
            <div class="cascade-field-label">${i18n.cascadeAnchor}</div>
            ${pills('anchor', [
              { id: 'thai', label: i18n.cascadeAnchorThai },
              { id: 'text', label: i18n.cascadeAnchorText }
            ])}
          </div>
        </div>
        <p class="cascade-note">${i18n.cascadeNote}</p>
      </div>`;
  }

  // In cascade mode the classic controls do nothing, so they are disabled
  // rather than left live and silent. The presets row stays active: that is
  // the way back to classic zalgo.
  function setClassicControlsMuted(muted) {
    const panel = $('#zalgoControlPanel');
    const controls = panel && panel.querySelector('.controls');
    if (!controls) return;
    controls.classList.toggle('is-muted', muted);
    controls.querySelectorAll('.pill, .shape-option, .slider-track').forEach(el => {
      el.disabled = muted;
    });
  }

  // ── Build Controls ──────────────────────────────────────────────
  function buildControls() {
    const panel = $('#zalgoControlPanel');
    if (!panel) return;

    const charTypes = [
      { id: 'all',     label: i18n.pillAll },
      { id: 'bars',    label: i18n.pillBars },
      { id: 'letters', label: i18n.pillLetters },
      { id: 'symbols', label: i18n.pillSymbols },
      { id: 'noise',   label: i18n.pillNoise }
    ];

    const positions = [
      { id: 'all',     label: i18n.pillAll },
      { id: 'up-down', label: i18n.pillUpDown },
      { id: 'up',      label: i18n.pillUp },
      { id: 'mid',     label: i18n.pillMid },
      { id: 'down',    label: i18n.pillDown }
    ];

    const shapeList = [
      { id: 'uniform',    label: i18n.shapeUniform },
      { id: 'slope-up',   label: i18n.shapeSlopeUp },
      { id: 'slope-down', label: i18n.shapeSlopeDown },
      { id: 'wave',       label: i18n.shapeWave },
      { id: 'pyramid',    label: i18n.shapePyramid },
      { id: 'valley',     label: i18n.shapeValley },
      { id: 'staircase',  label: i18n.shapeStaircase },
      { id: 'random',     label: i18n.shapeRandom }
    ];

    panel.innerHTML = `
      <div class="control-group preset-group">
        <div class="control-label">
          <span class="icon">✦</span> ${i18n.controlPresets}
          ${tooltip(i18n.tooltipPresets)}
        </div>
        <div class="preset-row">
          ${presetList().map(p => `
            <button class="preset-option${state.preset === p.id ? ' active' : ''}" data-preset="${p.id}">
              <span class="preset-preview">${p.preview}</span>
              <span class="preset-name">${i18n[p.labelKey]}</span>
            </button>
          `).join('')}
        </div>
      </div>
      ${cascadeAvailable ? cascadeGroupHtml() : ''}
      <div class="controls">
        <!-- Characters -->
        <div class="control-group">
          <div class="control-label">
            <span class="icon">◆</span> ${i18n.controlCharacters}
            ${tooltip(i18n.tooltipCharacters)}
          </div>
          ${pillGroup(charTypes, 'charType')}
        </div>

        <!-- Position -->
        <div class="control-group">
          <div class="control-label">
            <span class="icon">↕</span> ${i18n.controlPosition}
            ${tooltip(i18n.tooltipPosition)}
          </div>
          ${pillGroup(positions, 'position')}
        </div>

        <!-- Shape -->
        <div class="control-group full-width">
          <div class="control-label">
            <span class="icon">〰</span> ${i18n.controlShape}
            ${tooltip(i18n.tooltipShape)}
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
            <span class="icon">⚡</span> ${i18n.controlFrequency}
            ${tooltip(i18n.tooltipFrequency)}
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
            <span class="icon">◉</span> ${i18n.controlAmplitude}
            ${tooltip(i18n.tooltipAmplitude)}
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
            <span class="output-badge">${i18n.outputBadge}</span>
            <span class="output-chars" id="outputCharCount">0 ${i18n.outputChars}</span>
          </div>
          <div class="output-actions">
            <button class="btn btn-regen" id="regenBtn">${i18n.btnRegenerate}</button>
            <button class="btn btn-copy" id="copyBtn" disabled>${i18n.btnCopy}</button>
          </div>
        </div>
        <div class="output-body" id="outputBody">
          <span class="output-placeholder">${i18n.outputPlaceholder}</span>
        </div>
        <div class="platform-fit" id="platformFit" hidden>
          <span class="fit-title">${i18n.fitTitle}
            ${tooltip(i18n.fitTooltip)}
          </span>
          <span class="fit-badges" id="fitBadges"></span>
        </div>
      </div>
      <div class="variant-strip" id="variantStrip" hidden>
        <div class="control-label variant-strip-label">
          <span class="icon">⌁</span> ${i18n.variantsTitle}
          ${tooltip(i18n.variantsTooltip)}
        </div>
        <div id="variantRows">
          ${VARIANTS.map(v => `
            <div class="variant-row" data-variant="${v.id}">
              <span class="variant-label">${i18n[v.labelKey]}</span>
              <span class="variant-text" data-variant-text="${v.id}"></span>
              <button class="btn variant-copy" type="button" data-variant-copy="${v.id}">${i18n.btnCopy}</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Re-render each fixed-flavour variant from the current input text.
  // Full strings are kept here so Copy always copies the whole text
  // even when the visible row is ellipsis-truncated.
  const variantOutputs = {};
  function updateVariants() {
    const strip = $('#variantStrip');
    if (!strip) return;

    const input = $('#mainInput');
    const text = input ? input.value.trim() : '';
    if (!text) {
      strip.hidden = true;
      return;
    }

    strip.hidden = false;
    VARIANTS.forEach(v => {
      variantOutputs[v.id] = generateZalgo(text, v.opts);
      const el = strip.querySelector(`[data-variant-text="${v.id}"]`);
      if (el) el.textContent = variantOutputs[v.id];
    });
  }

  // ── Platform Fit Badges ─────────────────────────────────────────
  // Combining marks count toward character limits everywhere, so a
  // 10-char name can become 200+ chars of zalgo. Show at a glance
  // which platform budgets the current output still fits.
  function updatePlatformFit() {
    const wrap   = $('#platformFit');
    const badges = $('#fitBadges');
    if (!wrap || !badges) return;

    if (!state.output) {
      wrap.hidden = true;
      return;
    }

    const len = state.output.length;
    wrap.hidden = false;
    badges.innerHTML = PLATFORM_LIMITS.map(p => {
      const fits = len <= p.limit;
      return `<span class="fit-badge ${fits ? 'fit-yes' : 'fit-no'}" title="${len} / ${p.limit}">
        ${fits ? '✓' : '✕'} ${i18n[p.labelKey]}
      </span>`;
    }).join('');
  }

  // ── Build Decode Section ────────────────────────────────────────
  function buildDecode() {
    const container = $('#zalgoDecodeSection');
    if (!container) return;

    container.innerHTML = `
      <div class="decode-section" id="unzalgo">
        <div class="decode-header">
          <div class="control-label">
            <span class="icon">🔓</span> ${i18n.decodeTitle}
            ${tooltip(i18n.decodeTooltip)}
          </div>
          <div class="decode-meta">
            <span class="decode-removed" id="decodeRemoved" hidden></span>
            <button class="btn btn-copy" id="decodeCopyBtn" disabled>${i18n.decodeCopy}</button>
          </div>
        </div>
        <div class="decode-row">
          <textarea class="decode-input" id="decodeInput"
            placeholder="${i18n.decodePlaceholder}" rows="2"></textarea>
          <div class="decode-arrow">→</div>
          <div class="decode-output" id="decodeOutput">
            <span class="placeholder">${i18n.decodeOutputPlaceholder}</span>
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

    state.output = state.cascade.enabled
      ? generateCascade(text, state.cascade)
      : generateZalgo(text, {
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
      body.innerHTML = `<span class="output-placeholder">${i18n.outputPlaceholder}</span>`;
    }

    if (chars) chars.textContent = state.output.length + ' ' + i18n.outputChars;
    if (btn)   btn.disabled = !state.output;

    // Cascade mode: clip the PREVIEW (never the copied string), keep the raw
    // stack out of accessible names, and hide Regenerate, which would do
    // nothing on a deterministic output.
    const cascadeLive = !!(state.cascade.enabled && state.output);
    body.classList.toggle('is-cascade', cascadeLive);
    const regen = $('#regenBtn');
    if (regen) regen.hidden = state.cascade.enabled;
    if (cascadeLive) {
      const input = $('#mainInput');
      const plain = input ? input.value.trim() : '';
      body.setAttribute('role', 'img');
      body.setAttribute('aria-label', i18n.cascadeOutputLabel.replace('{text}', plain));
      if (btn) btn.setAttribute('aria-label', i18n.cascadeCopyLabel);
    } else {
      body.removeAttribute('role');
      body.removeAttribute('aria-label');
      if (btn) btn.removeAttribute('aria-label');
    }

    updatePlatformFit();
    updateVariants();
  }

  // ── Preset Handling ─────────────────────────────────────────────
  // Applying a preset updates state AND the visible controls in place
  // (no innerHTML rebuild, so slider/input listeners stay attached).
  function syncControlsToState() {
    const panel = $('#zalgoControlPanel');
    if (!panel) return;
    panel.querySelectorAll('.pill[data-group="charType"]').forEach(p =>
      p.classList.toggle('active', p.dataset.value === state.charType));
    panel.querySelectorAll('.pill[data-group="position"]').forEach(p =>
      p.classList.toggle('active', p.dataset.value === state.position));
    panel.querySelectorAll('.shape-option').forEach(s =>
      s.classList.toggle('active', s.dataset.shape === state.shape));
    const freqSlider = $('#frequencySlider');
    const freqValue  = $('#frequencyValue');
    if (freqSlider) freqSlider.value = state.frequency;
    if (freqValue)  freqValue.textContent = Math.round(state.frequency * 100) + '%';
    const ampSlider = $('#amplitudeSlider');
    const ampValue  = $('#amplitudeValue');
    if (ampSlider) ampSlider.value = state.amplitude;
    if (ampValue)  ampValue.textContent = state.amplitude;

    const group = $('#cascadeGroup');
    if (group) {
      group.hidden = !state.cascade.enabled;
      group.querySelectorAll('.pill[data-cascade]').forEach(p =>
        p.classList.toggle('active', p.dataset.value === String(state.cascade[p.dataset.cascade])));
      const depthSlider = $('#cascadeDepthSlider');
      const depthValue  = $('#cascadeDepthValue');
      if (depthSlider) depthSlider.value = state.cascade.depth;
      if (depthValue)  depthValue.textContent = state.cascade.depth;
    }
    setClassicControlsMuted(state.cascade.enabled);
  }

  function setActivePreset(id) {
    state.preset = id;
    const panel = $('#zalgoControlPanel');
    if (!panel) return;
    panel.querySelectorAll('.preset-option').forEach(b =>
      b.classList.toggle('active', b.dataset.preset === id));
  }

  // Any manual tweak means the user has left the preset
  function clearActivePreset() {
    if (state.preset) setActivePreset(null);
  }

  // ── Event Binding ───────────────────────────────────────────────
  function bindEvents() {
    const panel = $('#zalgoControlPanel');

    // Pill buttons (characters + position)
    panel.addEventListener('click', (e) => {
      // Preset buttons
      const presetBtn = e.target.closest('.preset-option[data-preset]');
      if (presetBtn) {
        const preset = presetList().find(p => p.id === presetBtn.dataset.preset);
        if (preset) {
          if (preset.cascade) {
            state.cascade.enabled = true;
          } else {
            state.cascade.enabled = false;
            Object.assign(state, preset.settings);
          }
          setActivePreset(preset.id);
          syncControlsToState();
          runGenerate();
        }
        return;
      }

      // Cascade pills (placement / mark / carrier). The cascade preset stays
      // active: it is the mode, and these are its settings.
      const cascadePill = e.target.closest('.pill[data-cascade]');
      if (cascadePill) {
        const group = cascadePill.dataset.cascade;
        state.cascade[group] = cascadePill.dataset.value;
        panel.querySelectorAll(`.pill[data-cascade="${group}"]`).forEach(p =>
          p.classList.toggle('active', p === cascadePill));
        runGenerate();
        return;
      }

      const pill = e.target.closest('.pill[data-group]');
      if (pill) {
        const group = pill.dataset.group;
        const value = pill.dataset.value;
        state[group] = value;

        // Update active class
        panel.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        clearActivePreset();
        runGenerate();
        return;
      }

      // Shape buttons
      const shapeBtn = e.target.closest('.shape-option[data-shape]');
      if (shapeBtn) {
        state.shape = shapeBtn.dataset.shape;
        panel.querySelectorAll('.shape-option').forEach(s => s.classList.remove('active'));
        shapeBtn.classList.add('active');
        clearActivePreset();
        runGenerate();
      }
    });

    // Tooltips: tap/click to toggle (hover still works via CSS).
    // One listener on document handles all tooltip triggers, including
    // ones injected later, and closes any open tooltip on outside tap.
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.tooltip-trigger');
      document.querySelectorAll('.tooltip-trigger.open').forEach(t => {
        if (t !== trigger) t.classList.remove('open');
      });
      if (trigger) trigger.classList.toggle('open');
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

    // Cascade depth slider
    const depthSlider = $('#cascadeDepthSlider');
    const depthValue  = $('#cascadeDepthValue');
    if (depthSlider) {
      depthSlider.addEventListener('input', () => {
        state.cascade.depth = clampDepth(depthSlider.value);
        if (depthValue) depthValue.textContent = state.cascade.depth;
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
      copyBtn.addEventListener('click', () => {
        if (state.output) copyToClipboard(state.output, copyBtn, i18n.btnCopy);
      });
    }

    // Regenerate button
    const regenBtn = $('#regenBtn');
    if (regenBtn) {
      regenBtn.addEventListener('click', runGenerate);
    }

    // Variant strip copy buttons (delegated — strip is rebuilt per input)
    const variantStrip = $('#variantStrip');
    if (variantStrip) {
      variantStrip.addEventListener('click', (e) => {
        const copyBtnEl = e.target.closest('[data-variant-copy]');
        if (!copyBtnEl) return;
        const text = variantOutputs[copyBtnEl.dataset.variantCopy];
        if (text) copyToClipboard(text, copyBtnEl, i18n.btnCopy);
      });
    }

    // Decode input
    const decodeInput   = $('#decodeInput');
    const decodeOutput  = $('#decodeOutput');
    const decodeCopyBtn = $('#decodeCopyBtn');
    const decodeRemoved = $('#decodeRemoved');
    let decodedText = '';
    if (decodeInput && decodeOutput) {
      decodeInput.addEventListener('input', () => {
        const raw = decodeInput.value;
        const clean = decodeZalgo(raw);
        decodedText = clean;
        if (clean) {
          decodeOutput.textContent = clean;
          decodeOutput.classList.remove('placeholder');
        } else {
          decodeOutput.innerHTML = `<span class="placeholder">${i18n.decodeOutputPlaceholder}</span>`;
        }
        if (decodeCopyBtn) decodeCopyBtn.disabled = !clean;
        if (decodeRemoved) {
          const removed = raw.length - clean.length;
          decodeRemoved.hidden = removed <= 0;
          decodeRemoved.textContent = removed + ' ' + i18n.decodeRemoved;
        }
      });
    }
    if (decodeCopyBtn) {
      decodeCopyBtn.addEventListener('click', () => {
        if (decodedText) copyToClipboard(decodedText, decodeCopyBtn, i18n.decodeCopy);
      });
    }

    // One-click copy for the static "copy & paste examples" gallery.
    // Cards live in page HTML (indexable), the behaviour lives here.
    document.querySelectorAll('.zx-example').forEach(card => {
      const copyCard = () => {
        const textEl = card.querySelector('.zx-text');
        const btnEl  = card.querySelector('.zx-copy');
        if (textEl) copyToClipboard(textEl.textContent, btnEl, i18n.btnCopy);
      };
      card.addEventListener('click', copyCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copyCard();
        }
      });
    });
  }

  // Shared clipboard helper with execCommand fallback + button feedback
  function copyToClipboard(text, btn, idleLabel) {
    const done = () => {
      if (!btn) return;
      btn.textContent = i18n.btnCopied;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = idleLabel;
        btn.classList.remove('copied');
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        legacyCopy(text); done();
      });
    } else {
      legacyCopy(text); done();
    }
  }

  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
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
    // Cascade settings round-trip only where the mode exists; a locale page
    // that has not opted in ignores them rather than half-rendering the mode.
    if (cascadeAvailable && params.get('cascade') === '1') {
      state.cascade.enabled = true;
      state.preset = 'cascade';
      if (params.has('depth')) state.cascade.depth = clampDepth(params.get('depth'));
      if (CASCADE_PLACEMENTS.indexOf(params.get('place')) !== -1)        state.cascade.placement = params.get('place');
      if (CASCADE_MARKS.some(m => m.id === params.get('mark')))          state.cascade.mark      = params.get('mark');
      if (CASCADE_ANCHORS.indexOf(params.get('anchor')) !== -1)          state.cascade.anchor    = params.get('anchor');
    }
    if (params.has('variant') && VARIANTS.some(v => v.id === params.get('variant'))) {
      sharedVariant = params.get('variant');
    }
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
    if (state.cascade.enabled) {
      params.set('cascade', '1');
      if (state.cascade.depth !== CASCADE_DEPTH.default)  params.set('depth',  state.cascade.depth);
      if (state.cascade.placement !== 'prefix')           params.set('place',  state.cascade.placement);
      if (state.cascade.mark !== CASCADE_DEFAULT_MARK)    params.set('mark',   state.cascade.mark);
      if (state.cascade.anchor !== 'thai')                params.set('anchor', state.cascade.anchor);
    }

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
  // ── Result sharing ──────────────────────────────────────────────
  // The shared UltraTextGen core (script.js, loaded headless on this page)
  // owns the act of sharing; this block only builds the buttons and keeps
  // their creation-state datasets current. This page already live-syncs its
  // settings into the address bar (syncToURL above), so the exact current
  // URL is the share link — stamped via data-share-url, which the delegated
  // handlers prefer over composing ?q=&style=.
  let sharedVariant = null;

  function syncShareState() {
    const UTG = window.UltraTextGen;
    if (!UTG || !UTG.buildShareActions) return;
    const input = $('#mainInput');
    const q = input ? input.value.trim() : '';

    const stamp = (row, text, url) => {
      if (!row) return;
      row.querySelectorAll('.share-result-btn, .share-image-btn').forEach(btn => {
        btn.dataset.shareText = text || '';
        btn.dataset.shareQ = q;
        btn.dataset.shareUrl = url;
        btn.disabled = !text;
      });
    };

    // The live URL minus any incoming variant marker — otherwise a recipient
    // re-sharing a variant would stack variant params.
    let base = window.location.href;
    try {
      const u = new URL(base);
      u.searchParams.delete('variant');
      base = u.toString();
    } catch (e) { /* keep href as-is */ }
    stamp($('#zalgoShareRow'), state.output, base);
    VARIANTS.forEach(v => {
      const row = document.querySelector('[data-variant-share="' + v.id + '"]');
      const url = base + (base.indexOf('?') === -1 ? '?' : '&') + 'variant=' + v.id;
      stamp(row, variantOutputs[v.id] || '', url);
    });
  }

  function wireShare() {
    const UTG = window.UltraTextGen;
    if (!UTG || !UTG.buildShareActions) return;

    // Main output: the pair rides under the output panel.
    const outputSection = document.querySelector('#zalgoOutputSection .output-section');
    if (outputSection && !$('#zalgoShareRow')) {
      const row = UTG.buildShareActions({ styleId: 'zalgo', name: 'Zalgo', disabled: !state.output });
      row.id = 'zalgoShareRow';
      row.classList.add('zalgo-share-row');
      outputSection.appendChild(row);
    }

    // One compact pair per fixed-flavour variant row.
    VARIANTS.forEach(v => {
      const varRow = document.querySelector('.variant-row[data-variant="' + v.id + '"]');
      if (!varRow || varRow.querySelector('.result-share-row')) return;
      const pair = UTG.buildShareActions({ styleId: 'zalgo-' + v.id, name: i18n[v.labelKey] || v.id, disabled: true });
      pair.setAttribute('data-variant-share', v.id);
      varRow.appendChild(pair);
    });

    syncShareState();

    // A shared variant link scrolls to and pulses its row once.
    if (sharedVariant) {
      const target = document.querySelector('.variant-row[data-variant="' + sharedVariant + '"]');
      sharedVariant = null; // wireShare can run twice (DOMContentLoaded + load)
      if (target) {
        target.classList.add('variant-shared');
        setTimeout(() => {
          if (target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
      }
    }
  }

  function init() {
    const panel = $('#zalgoControlPanel');
    cascadeAvailable = !!(panel && panel.hasAttribute('data-cascade'));
    loadFromURL();
    buildControls();
    buildOutput();
    buildDecode();
    bindEvents();
    // A cascade restored from the URL needs the classic controls muted and
    // the cascade group shown; buildControls only knows the pill states.
    syncControlsToState();

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
      syncTimer = setTimeout(() => { syncToURL(); syncShareState(); }, 300);
    });
    const outputBody = $('#outputBody');
    if (outputBody) {
      observer.observe(outputBody, { childList: true, characterData: true, subtree: true });
    }

    // Initial generate
    runGenerate();

    // The share core arrives with the deferred script.js; this file runs at
    // parse time, so wire the buttons once the deferred scripts have run.
    if (document.readyState === 'loading' || document.readyState === 'interactive') {
      window.addEventListener('load', wireShare);
      document.addEventListener('DOMContentLoaded', wireShare);
    } else {
      wireShare();
    }
  }

  // ── Boot ────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
