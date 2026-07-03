/* ==========================================================================
   UltraTextGen — decoratorEngine.js
   Composition engine for decorated text. Builds finished decorations from
   the theme parts in decoratorData.js instead of serving fixed presets:
   every render mixes wrapper pairs, stacked charms, banner lines, and word
   joiners, and a seed change ("Shuffle") produces a brand-new set.

   Exposes window.UTGDecoratorEngine:
     generate(text, options) -> [{ theme, themeLabel, icon, recipe, text }]
     THEMES                  -> the loaded theme packs

   options:
     theme:     'all' | theme key            (default 'all')
     scope:     'text' | 'words'             (default 'text')
     intensity: 1 | 2 | 3                    (default 2)
     seed:      integer — same seed, same output; bump it to reshuffle
     perTheme:  cap of variants per theme    (default 3 for 'all', 8 single)
   ========================================================================== */

(function () {
  "use strict";

  var THEMES = window.UTG_DECORATOR_THEMES || [];

  /* Deterministic PRNG (mulberry32) — typing must not reshuffle results,
     so randomness comes only from the seed, never from the text. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  /* Sample n distinct items (order shuffled) without mutating the source. */
  function sample(rng, list, n) {
    var copy = list.slice();
    var out = [];
    while (copy.length && out.length < n) {
      out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    }
    return out;
  }

  /* Directional characters flip when a left-end sequence is mirrored to the
     right end. Anything absent from the map is its own mirror. */
  var MIRROR = {
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
    '⟨': '⟩', '⟩': '⟨', '«': '»', '»': '«', '‹': '›', '›': '‹',
    '꒰': '꒱', '꒱': '꒰', '⌜': '⌝', '⌝': '⌜', '⌞': '⌟', '⌟': '⌞',
    '☾': '☽', '☽': '☾', '→': '←', '←': '→', '⇢': '⇠', '⇠': '⇢',
    '↝': '↜', '↜': '↝', '⸜': '⸝', '⸝': '⸜', 'ʚ': 'ɞ', 'ɞ': 'ʚ',
    '◤': '◥', '◥': '◤', '彡': '彡'
  };

  /* Split into user-perceived characters so emoji with variation selectors
     (❤︎, ☠︎) and combining marks (×͜×) survive reversal intact. */
  function graphemes(str) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return Array.from(
        new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(str),
        function (s) { return s.segment; }
      );
    }
    return Array.from(str);
  }

  function mirrorSequence(seq) {
    var chars = graphemes(seq);
    chars.reverse();
    return chars.map(function (ch) { return MIRROR[ch] || ch; }).join('');
  }

  /* Enclosing punctuation hugs the text (【hello】); ornament sequences
     breathe (✧･ﾟ hello ﾟ･✧). */
  function joinPair(left, text, right) {
    var lastLeft = Array.from(left).pop() || '';
    var tight = /[\p{Ps}\p{Pi}]/u.test(lastLeft);
    var sep = tight ? '' : ' ';
    return left + sep + text + sep + right;
  }

  function words(text) {
    return text.split(/\s+/).filter(Boolean);
  }

  /* --------------------------------------------------------------------------
     Recipes — each returns one finished string (may be multi-line).
     Signature: (text, theme, rng, intensity, scope)
     -------------------------------------------------------------------------- */

  /* Per-word grapheme arrays: "Hi yo" -> [['H','i'], ['y','o']].
     Word gaps survive letter-scope decoration as double spaces. */
  function letterWords(text) {
    return words(text).map(graphemes);
  }

  function spacedLetters(text) {
    return letterWords(text).map(function (ls) { return ls.join(' '); }).join('   ');
  }

  /* Curated wrapper pair around the text, each word, or each letter. */
  function recipeClassic(text, theme, rng, intensity, scope) {
    var pair = pick(rng, theme.pairs);
    if (scope === 'words') {
      return words(text).map(function (w) {
        return joinPair(pair[0], w, pair[1]);
      }).join(' ');
    }
    if (scope === 'letters') {
      return letterWords(text).map(function (ls) {
        return ls.map(function (ch) { return joinPair(pair[0], ch, pair[1]); }).join(' ');
      }).join('  ');
    }
    return joinPair(pair[0], text, pair[1]);
  }

  /* Charm sequence stacked at both ends, right side mirrored.
     Intensity controls how many charms stack. */
  function recipeStacked(text, theme, rng, intensity, scope) {
    var seq = sample(rng, theme.charms, Math.min(intensity + 1, theme.charms.length)).join('');
    var right = mirrorSequence(seq);
    if (scope === 'words') {
      return words(text).map(function (w) {
        return seq + ' ' + w + ' ' + right;
      }).join('  ');
    }
    var core = scope === 'letters' ? spacedLetters(text) : text;
    return seq + ' ' + core + ' ' + right;
  }

  /* Wrapper pair with extra charms tucked inside — the "extra" look.
     Letter scope gives the [Y | A | S | I | R] name-card style. */
  function recipeLayered(text, theme, rng, intensity, scope) {
    var pair = pick(rng, theme.pairs);
    var charm = pick(rng, theme.charms);
    var inner = charm.repeat(Math.max(1, intensity - 1));
    var sprinkle = pick(rng, theme.sprinkles);
    var core = text;
    if (scope === 'words') {
      core = words(text).join(' ' + sprinkle + ' ');
    } else if (scope === 'letters') {
      core = letterWords(text).map(function (ls) {
        return ls.join(' ' + sprinkle + ' ');
      }).join(' ' + sprinkle + ' ');
    }
    return joinPair(pair[0] + inner, core, mirrorSequence(inner) + pair[1]);
  }

  /* Divider line above and below — bios, headers, announcements. */
  function recipeBanner(text, theme, rng, intensity, scope) {
    var line = pick(rng, theme.lines);
    var core = scope === 'letters' ? spacedLetters(text) : text;
    if (intensity >= 3) {
      var charm = pick(rng, theme.charms);
      core = charm + ' ' + core + ' ' + mirrorSequence(charm);
    }
    return line + '\n' + core + '\n' + line;
  }

  /* Sprinkles woven between words (or letters) — caption rhythm.
     Letter scope + a custom symbol gives 🇵🇰 Y 🇵🇰 A 🇵🇰 S 🇵🇰. */
  function recipeInterleave(text, theme, rng, intensity, scope) {
    var sprinkle = pick(rng, theme.sprinkles);
    var joined;
    if (scope === 'letters') {
      if (graphemes(text.replace(/\s+/g, '')).length < 2) return null;
      joined = letterWords(text).map(function (ls) {
        return ls.join(' ' + sprinkle + ' ');
      }).join(' ' + sprinkle + ' ');
    } else {
      var w = words(text);
      if (w.length < 2) return null;
      joined = w.join(' ' + sprinkle + ' ');
    }
    if (intensity >= 2) {
      var pair = pick(rng, theme.pairs);
      return joinPair(pair[0], joined, pair[1]);
    }
    return joined;
  }

  var RECIPES = [
    { id: 'classic',    label: 'Classic',  fn: recipeClassic },
    { id: 'stacked',    label: 'Stacked',  fn: recipeStacked },
    { id: 'layered',    label: 'Layered',  fn: recipeLayered },
    { id: 'banner',     label: 'Banner',   fn: recipeBanner },
    { id: 'interleave', label: 'Rhythm',   fn: recipeInterleave }
  ];

  /* --------------------------------------------------------------------------
     Custom symbol theme — the user drops in any emoji or symbol (🇵🇰, ★, 🐐)
     and every recipe composes with it. This is how names get flag-framed:
     🇵🇰 YASIR 🇵🇰  or  🇵🇰 Y 🇵🇰 A 🇵🇰 S 🇵🇰 I 🇵🇰 R 🇵🇰.
     -------------------------------------------------------------------------- */
  function buildCustomTheme(symbol) {
    var s = symbol.trim();
    if (!s) return null;
    return {
      key: 'custom',
      label: 'Your symbol',
      icon: graphemes(s)[0],
      pairs: [[s, s]],
      charms: [s],
      sprinkles: [s],
      lines: [[s, s, s, s, s].join(' '), s + ' ⎯⎯⎯ ' + s + ' ⎯⎯⎯ ' + s]
    };
  }

  /* --------------------------------------------------------------------------
     generate()
     -------------------------------------------------------------------------- */
  function generate(text, options) {
    var opts = options || {};
    var themeKey  = opts.theme || 'all';
    var scope     = (opts.scope === 'words' || opts.scope === 'letters') ? opts.scope : 'text';
    var intensity = Math.min(3, Math.max(1, opts.intensity || 2));
    var seed      = (opts.seed === undefined ? 1 : opts.seed) | 0;

    var selected = themeKey === 'all'
      ? THEMES.slice()
      : THEMES.filter(function (t) { return t.key === themeKey; });

    /* A custom symbol always leads the results, whatever vibe is active. */
    var custom = opts.customSymbol ? buildCustomTheme(opts.customSymbol) : null;
    if (custom) selected.unshift(custom);

    var perTheme = opts.perTheme || (themeKey === 'all' ? 3 : 8);

    var results = [];
    var seen = Object.create(null);

    selected.forEach(function (theme, themeIndex) {
      /* Per-theme rng: reshuffling one theme chip doesn't disturb others. */
      var rng = mulberry32(seed * 2654435761 + themeIndex * 97 + 1);
      var produced = 0;
      var attempt = 0;

      /* The custom symbol is an explicit user request — give it a full row
         of variations even in "all vibes" mode. */
      var quota = theme.key === 'custom' ? Math.max(perTheme, 5) : perTheme;

      /* Cycle recipes until the per-theme quota is met; a recipe can appear
         twice with different picks, which is what makes single-theme view
         feel deep rather than repetitive. */
      while (produced < quota && attempt < quota * 3) {
        var recipe = RECIPES[attempt % RECIPES.length];
        attempt += 1;
        var out = recipe.fn(text, theme, rng, intensity, scope);
        if (!out || seen[out]) continue;
        seen[out] = true;
        results.push({
          theme: theme.key,
          themeLabel: theme.label,
          icon: theme.icon,
          recipe: recipe.label,
          text: out
        });
        produced += 1;
      }
    });

    return results;
  }

  window.UTGDecoratorEngine = {
    THEMES: THEMES,
    generate: generate
  };

})();
