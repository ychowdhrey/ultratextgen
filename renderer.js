/* ==========================================================================
   UltraTextGen — renderer.js
   Handles ALL text rendering based on style.type
   ========================================================================== */

(function () {

  /* ==========================================================================
     UPSIDE DOWN TEXT UTILITIES
     ========================================================================== */

  // Flip character mapping
  const flipMap = {
    'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ',
    'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'ן', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'r': 'ɹ', 's': 's', 't': 'ʇ',
    'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
    'A': '∀', 'C': 'Ɔ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'J': 'ſ', 'L': '˥', 'M': 'W',
    'N': 'N', 'O': 'O', 'P': 'Ԁ', 'R': 'ᴚ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
    '1': '⇂', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
    '.': '˙', ',': '\'', '\'': ',', '"': '„', '_': '‾', '?': '¿', '!': '¡',
    '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
    '&': '⅋', ';': '؛'
  };

  // Illusion character mapping for characters without good flips
  const illusionMap = {
    'o': 'o', 'O': 'O', 's': 's', 'S': 'S', 'x': 'x', 'X': 'X', 'z': 'z', 'Z': 'Z'
  };

  // Gyaru-moji (ギャル文字) — the 2002-2005 Japanese schoolgirl cipher that
  // replaced kana with visually similar symbols/kanji/Greek letters. It
  // never had one fixed standard (contemporary sources describe it as a
  // folk cipher with many regional/personal variants), so this is a
  // deliberately conservative subset of substitutions that are consistently
  // cited across multiple independent sources (English & Japanese
  // Wikipedia's "Gyaru-moji"/"ギャル文字" articles, cross-checked against
  // community reference lists), not an invented "complete" table. Unmapped
  // kana and all kanji pass through unchanged — itself authentic to the
  // style, since real usage freely mixed converted and unconverted text.
  const galMojiMap = {
    'あ': 'ぁ', 'い': 'ﾚヽ', 'う': 'ぅ', 'え': 'ぇ', 'お': 'ぉ',
    'か': 'ヵ', 'く': '＜', 'け': 'ヶ', 'こ': '⊇',
    'し': 'ι', 'す': '£',
    'ん': 'ω',
    'セ': '世', 'チ': '干'
  };

  // Reverse a string by user-perceived characters, not code points. A code-point
  // reversal turned 🇫🇷 into 🇷🇫, reordered family emoji, detached skin tones and
  // moved Thai and Devanagari vowel and tone marks onto the wrong consonant.
  function reverseString(str) {
    return splitGraphemes(str).reverse().join('');
  }

  // Flip a single character
  function flipChar(ch) {
    return flipMap[ch] || null;
  }

  // Flip one user-perceived character. A base letter that carries combining
  // marks (e + U+0301) keeps its marks after the flipped base; anything whose
  // first code point has no flip (an emoji sequence, a Thai cluster) is left whole.
  function flipCluster(cluster) {
    const direct = flipChar(cluster);
    if (direct) return direct;
    const cps = Array.from(cluster);
    if (cps.length > 1) {
      const base = flipChar(cps[0]);
      if (base) return base + cps.slice(1).join('');
    }
    return null;
  }

  // Apply flip and reverse (standard upside down)
  function applyFlipAndReverse(str, fallbackMode = 'fallback') {
    const chars = splitGraphemes(str);
    const reversed = chars.reverse();
    const flipped = reversed.map(ch => {
      const flip = flipCluster(ch);
      if (flip) return flip;
      if (fallbackMode === 'fallback') return ch;
      return ch;
    });
    return flipped.join('');
  }

  // Transform functions for each variant
  const upsideDownTransforms = {
    // Flip all characters and reverse - pure upside down
    fullyFlipped: (text) => {
      return applyFlipAndReverse(text, 'fallback');
    },

    // Same as fullyFlipped - kept for backward compatibility
    mixedFlipFallback: (text) => {
      return applyFlipAndReverse(text, 'fallback');
    },

    // Only reverse character order, no flipping
    reverseOnly: (text) => {
      return reverseString(text);
    },

    // Reverse and flip combo - same as fullyFlipped
    reverseFlipCombo: (text) => {
      return applyFlipAndReverse(text, 'fallback');
    },

    // Flip only the last word (or text in [[brackets]] or {braces})
    partialEmphasis: (text) => {
      const markerRegex = /\[\[(.*?)\]\]|\{(.*?)\}/g;
      let hasMarkers = false;
      
      const result = text.replace(markerRegex, (match, bracket, brace) => {
        hasMarkers = true;
        const content = bracket || brace;
        return applyFlipAndReverse(content, 'fallback');
      });
      
      if (hasMarkers) return result;
      
      const words = text.split(' ');
      if (words.length === 0) return text;
      
      const lastWord = words[words.length - 1];
      words[words.length - 1] = applyFlipAndReverse(lastWord, 'fallback');
      
      return words.join(' ');
    },

    // Flip each line separately (for multiline text)
    lineLevel: (text) => {
      const lines = text.split('\n');
      return lines.map(line => applyFlipAndReverse(line, 'fallback')).join('\n');
    },

    // Alternate between normal and flipped words
    alternating: (text) => {
      const words = text.split(' ');
      return words.map((word, index) => {
        // Even index words: flip characters (no reverse)
        if (index % 2 === 0) {
          return Array.from(word).map(ch => flipChar(ch) || ch).join('');
        }
        // Odd index words: keep normal
        return word;
      }).join(' ');
    },

    mirrorIllusion: (text) => {
      const chars = splitGraphemes(text);
      const reversed = chars.reverse();
      const transformed = reversed.map(ch => {
        const flip = flipCluster(ch);
        if (flip) return flip;
        
        const illusion = illusionMap[ch];
        if (illusion) return illusion;
        
        return ch;
      });
      return transformed.join('');
    },

    emojiAssisted: (text) => {
      return '🙃 ' + text + ' 🙃';
    },

    fauxSymbols: (text) => {
      return '⟲ ' + reverseString(text) + ' ⟲';
    },

    microText: (text) => {
      const flipped = applyFlipAndReverse(text, 'fallback');
      return flipped.replace(/\s+/g, ' ').trim();
    }
  };

  // Apply upside down transform
  function applyUpsideDownTransform(text, transformName) {
    if (upsideDownTransforms[transformName]) {
      return upsideDownTransforms[transformName](text);
    }
    return text;
  }

/* -----------------------------
   MAP RENDERER
   ----------------------------- */

// Split into user-perceived characters (emoji + combining-mark safe)
function splitGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(seg.segment(str), x => x.segment);
  }
  return Array.from(str);
}

// Convert a style.upper/lower/nums into an array of 26/26/10 tokens
function mapToArray(mapStrOrArr, kind) {
  if (Array.isArray(mapStrOrArr)) return mapStrOrArr;
  const s = String(mapStrOrArr || '');

  // **NEW** - Nested double wrap: "⦅❨A❩⦆⦅❨B❩⦆..."
  if (s.includes('⦅❨') && s.includes('❩⦆')) {
    if (kind === 'alphaUpper') return s.match(/⦅❨[A-Z]❩⦆/g) || [];
    if (kind === 'alphaLower') return s.match(/⦅❨[a-z]❩⦆/g) || [];
    if (kind === 'nums')      return s.match(/⦅❨\d❩⦆/g)     || [];
  }

  // **NEW** - Arrow wrap: "→A←→B←..."
  if (s.includes('→') && s.includes('←')) {
    if (kind === 'alphaUpper') return s.match(/→[A-Z]←/g) || [];
    if (kind === 'alphaLower') return s.match(/→[a-z]←/g) || [];
    if (kind === 'nums')      return s.match(/→\d←/g)     || [];
  }

  // **NEW** - Forward arrow only: "→A→B..."
  if (s.includes('→') && !s.includes('←')) {
    if (kind === 'alphaUpper') return s.match(/→[A-Z]/g) || [];
    if (kind === 'alphaLower') return s.match(/→[a-z]/g) || [];
    if (kind === 'nums')      return s.match(/→\d/g)     || [];
  }

  // **NEW** - Backward arrow only: "A←B←..."
  if (s.includes('←') && !s.includes('→')) {
    if (kind === 'alphaUpper') return s.match(/[A-Z]←/g) || [];
    if (kind === 'alphaLower') return s.match(/[a-z]←/g) || [];
    if (kind === 'nums')      return s.match(/\d←/g)     || [];
  }

  // **NEW** - Bracket: "[A][B]..."
  if (s.includes('[') && s.includes(']')) {
    if (kind === 'alphaUpper') return s.match(/\[[A-Z]\]/g) || [];
    if (kind === 'alphaLower') return s.match(/\[[a-z]\]/g) || [];
    if (kind === 'nums')      return s.match(/\[\d\]/g)     || [];
  }

  // **NEW** - Chevron: "‹A›‹B›..."
  if (s.includes('‹') && s.includes('›')) {
    if (kind === 'alphaUpper') return s.match(/‹[A-Z]›/g) || [];
    if (kind === 'alphaLower') return s.match(/‹[a-z]›/g) || [];
    if (kind === 'nums')      return s.match(/‹\d›/g)     || [];
  }

  // **NEW** - Double bar: "‖A‖‖B‖..."
  if (s.includes('‖')) {
    if (kind === 'alphaUpper') return s.match(/‖[A-Z]‖/g) || [];
    if (kind === 'alphaLower') return s.match(/‖[a-z]‖/g) || [];
    if (kind === 'nums')      return s.match(/‖\d‖/g)     || [];
  }

  // **NEW** - Single bar: "|A||B|..."
  if (s.includes('|')) {
    if (kind === 'alphaUpper') return s.match(/\|[A-Z]\|/g) || [];
    if (kind === 'alphaLower') return s.match(/\|[a-z]\|/g) || [];
    if (kind === 'nums')      return s.match(/\|\d\|/g)     || [];
  }

  // EXISTING - Curly: "❨A❩❨B❩..."
  if (s.includes('❨') && s.includes('❩')) {
    if (kind === 'alphaUpper') return s.match(/❨[A-Z]❩/g) || [];
    if (kind === 'alphaLower') return s.match(/❨[a-z]❩/g) || [];
    if (kind === 'nums')      return s.match(/❨\d❩/g)     || [];
  }

  // Angle: "⦅A⦆⦅B⦆..."
  if (s.includes('⦅') && s.includes('⦆')) {
    if (kind === 'alphaUpper') return s.match(/⦅[A-Z]⦆/g) || [];
    if (kind === 'alphaLower') return s.match(/⦅[a-z]⦆/g) || [];
    if (kind === 'nums')      return s.match(/⦅\d⦆/g)     || [];
  }

  // Parentheses: "( A )( B )..."
  if (s.includes('(') && s.includes(')')) {
    if (kind === 'alphaUpper') return s.match(/\( ?[A-Z] ?\)/g) || [];
    if (kind === 'alphaLower') return s.match(/\( ?[a-z] ?\)/g) || [];
    if (kind === 'nums')      return s.match(/\( ?\d ?\)/g)     || [];
  }

  // Default: grapheme split, and drop spaces (for your spaced strings)
  return splitGraphemes(s).filter(x => x !== ' ');
}

/* -----------------------------
   ACCENT / DIACRITIC SUPPORT

   Unicode's styled alphabets (Mathematical Alphanumeric Symbols — bold,
   italic, fraktur, bubble, etc.) only define glyphs for plain A-Z/a-z/0-9,
   so an accented letter like "é" or "ệ" has no styled twin to map to.
   Rather than pass it through untouched (the old behaviour — the rest of
   the word styles, the accented letter doesn't), we decompose it to its
   base letter + combining accent mark(s), style the base like any other
   letter, and re-append the original mark(s) so the accent rides on the
   styled glyph — the same trick the strikethrough/underline styles already
   use for their marks.

   A handful of Latin-extended letters (ł đ ø ß ı ...) have no Unicode
   decomposition at all — they're distinct atomic characters, not a base
   letter plus a mark — so there's no accent to reattach. Those fall back
   to their nearest plain-ASCII base letter so they still pick up the
   style, matching the visual weight of the surrounding text instead of
   sitting out unstyled.
   ----------------------------- */
const BASE_LETTER_FALLBACK = {
  'ł': 'l', 'Ł': 'L',
  'đ': 'd', 'Đ': 'D',
  // Turkish dotless ı is deliberately not here: no style has a dotless letter,
  // and a dotted i is a different letter (ışık is not isik), so it passes
  // through as typed, which is what the notice tells the reader.
  'ø': 'o', 'Ø': 'O',
  // Ligature letters stand for two letters, so they are written out in full
  // (Straße -> Strasse, cœur -> coeur). Folding them to one letter changed the
  // word (Strase, cour). mapChar styles each letter of a two-letter value.
  'ß': 'ss', 'ẞ': 'SS',
  'æ': 'ae', 'Æ': 'AE',
  'œ': 'oe', 'Œ': 'OE',
  'ð': 'd', 'Ð': 'D',
  'þ': 't', 'Þ': 'T',
  'ħ': 'h', 'Ħ': 'H'
};

// Resolves any single character to a { base, marks } pair a style's A-Z/a-z
// map can use: base is a plain letter (or the char itself if there's
// nothing to decompose), marks is the combining accent(s) to keep, if any.
function resolveBaseAndMarks(char) {
  if (BASE_LETTER_FALLBACK[char]) return { base: BASE_LETTER_FALLBACK[char], marks: '' };

  const nfd = char.normalize('NFD');
  if (nfd.length > 1 && /[A-Za-z0-9]/.test(nfd[0])) {
    return { base: nfd[0], marks: nfd.slice(1) };
  }

  return { base: char, marks: '' };
}

// Reattaches a combining mark right after the base letter inside its mapped
// token, rather than at the very end of the token. Most styles map a letter
// to a single styled glyph (e.g. bold 'c' -> "𝗰"), where "end of token" and
// "right after the letter" are the same position. But the bracket/paren
// "wrap" styles (Ultra Bubble Curly/Angle/Parentheses, etc.) map a letter to
// a multi-character token like "❨c❩" — appending a mark at the end used to
// land the accent on the closing bracket instead of the letter (e.g. Turkish
// ç coming out as "❨c❩̧" instead of "❨ç❩"). Locating the base letter inside
// the token and inserting there fixes those styles; for single-glyph tokens
// the base letter never appears literally (bold's "𝗰" isn't the string "c"),
// so this falls through to the original append-at-the-end behaviour.
function attachMarks(token, base, marks) {
  if (!marks) return token;
  const idx = token.indexOf(base);
  if (idx === -1) return token + marks;
  return token.slice(0, idx + base.length) + marks + token.slice(idx + base.length);
}

// Shared per-character lookup used by both renderMap branches below.
// `accentSafe` gates ONLY the combining-mark-carrying path: a handful of
// styles substitute into Unicode blocks (Enclosed Alphanumerics, Fullwidth,
// Katakana, Bopomofo, Squared, Runic, Canadian Syllabics...) where real font
// stacks either show a tofu box or silently drop a combining mark reattached
// to them (verified by rendering every style through Chromium, not guessed).
// Those styles set `accentSafe: false` in styles.js and fall back to the old
// plain-passthrough behaviour for marked accents. The base-letter-only
// fallback (ł→l, đ→d, ø→o...) never carries a mark, so it's always safe and
// still applies regardless of accentSafe.
function mapChar(ch, normalUpper, normalLower, normalNums, upperArr, lowerArr, numsArr, accentSafe) {
  const u = normalUpper.indexOf(ch);
  if (u !== -1) return upperArr[u] || ch;

  const l = normalLower.indexOf(ch);
  if (l !== -1) return lowerArr[l] || ch;

  const n = normalNums.indexOf(ch);
  if (n !== -1) return numsArr[n] || ch;

  const { base, marks } = resolveBaseAndMarks(ch);
  // Only a fallback that writes a letter out as several letters (ß -> ss) recurses.
  // A lone astral character (an emoji, a styled math letter) has .length 2 but is
  // its own base, and recursing on it never ends.
  if (base !== ch && base.length > 1 && !marks) {
    return Array.from(base).map(function (letter) {
      return mapChar(letter, normalUpper, normalLower, normalNums, upperArr, lowerArr, numsArr, accentSafe);
    }).join('');
  }
  if (base !== ch && (accentSafe || !marks)) {
    const bu = normalUpper.indexOf(base);
    if (bu !== -1) return attachMarks(upperArr[bu] || base, base, marks);

    const bl = normalLower.indexOf(base);
    if (bl !== -1) return attachMarks(lowerArr[bl] || base, base, marks);
  }

  return ch;
}

   // renderMap logic

// A grapheme cluster that starts with a letter (or mark) of a script other than
// Latin, or with a joiner. Used by the spaced path below to keep such runs whole.
const NATIVE_RUN_RE = /^(?:(?![\p{Script=Latin}\p{Script=Common}])[\p{L}\p{M}]|[‌‍])/u;

function renderMap(text, style) {
  if (!text) return '';

  const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const normalLower = 'abcdefghijklmnopqrstuvwxyz';
  const normalNums  = '0123456789';

  const upperArr = mapToArray(style.upper, 'alphaUpper');
  const lowerArr = mapToArray(style.lower, 'alphaLower');
  const numsArr  = mapToArray(style.nums,  'nums');

  const isSpaced =
    style.groupSlug === 'spaced' ||
    (style.slug || '').endsWith('-spaced');

  const accentSafe = style.accentSafe !== false;

  // Optional per-style sign map (superscript and subscript only): + - = ( )
  // have real raised and lowered forms, and a formula with a bare + in it
  // reads wrong. A style without `signs` takes the plain path unchanged.
  const signs = style.signs || null;
  const mapOne = signs
    ? (char) => (Object.prototype.hasOwnProperty.call(signs, char) ? signs[char]
      : mapChar(char, normalUpper, normalLower, normalNums, upperArr, lowerArr, numsArr, accentSafe))
    : (char) => mapChar(char, normalUpper, normalLower, normalNums, upperArr, lowerArr, numsArr, accentSafe);

  // Map integrity check — only warn when a debug flag is set, never in production
  if (window.UTG_DEBUG &&
      (upperArr.length !== 26 || lowerArr.length !== 26 || numsArr.length !== 10)) {
    console.warn('Bad map lengths', style.slug, {
      upper: upperArr.length,
      lower: lowerArr.length,
      nums: numsArr.length
    });
  }

  if (!isSpaced) {
    return Array.from(text).map(mapOne).join('');
  }

  // Spaced output mode (adds spacing after each mapped glyph). Walks grapheme
  // clusters, not code points: a pre-decomposed accent (e + U+0301) or a ZWJ
  // emoji sequence is ONE glyph, and a space wedged inside it detaches the mark
  // or breaks the sequence apart. Each cluster is mapped code point by code
  // point exactly as the unspaced path does, then followed by one space.
  //
  // The style maps Latin letters and digits only. A run of letters in any other
  // script (Arabic, Devanagari, Han, Thai, Hebrew...) passes through unmapped,
  // and spacing it apart is not a style: it breaks the run. Arabic loses its
  // joining (عيد مبارك -> ع ي د  م ب ا ر ك) and Devanagari conjuncts fall apart.
  // So no space goes between two consecutive clusters of a non-Latin script;
  // the run stays exactly as typed. Text with no such letters is untouched,
  // byte for byte.
  const out = [];
  let prevNative = false;
  for (const cluster of splitGraphemes(text)) {
    const native = NATIVE_RUN_RE.test(cluster);
    if (native && prevNative && out[out.length - 1] === ' ') out.pop();
    prevNative = native;
    if (cluster === '\n' || cluster === '\r\n') {
      if (out[out.length - 1] === ' ') out.pop();
      out.push(cluster);
      continue;
    }

    if (cluster === ' ') {
      if (out[out.length - 1] === ' ') out.pop();
      out.push(' ');
      continue;
    }

    out.push(Array.from(cluster).map(mapOne).join(''));
    out.push(' ');
  }

  if (out[out.length - 1] === ' ') out.pop();
  return out.join('');
}

  /* -----------------------------
     Strikethrough and Underline
     ----------------------------- */
  // splitGraphemes (not a raw spread) so a pre-decomposed accented letter \u2014
  // e.g. Vietnamese/Mac clipboard text pasted as base + separate combining
  // marks \u2014 is treated as one cluster and gets exactly one decorator mark,
  // not one wedged between the base letter and its own accent.
  const decorators = {
    strike:   t => splitGraphemes(t).map(c => c + '\u0336').join(''),
    shortStrike: t => splitGraphemes(t).map(c => c + '\u0335').join(''),
    doubleStrike: t => splitGraphemes(t).map(c => c + '\u0336' + '\u0335').join(''),
    heavyStrike: t => splitGraphemes(t).map(c => c + '\u0336' + '\u0336').join(''),
    wavyStrike: t => splitGraphemes(t).map(c => c + '\u0334').join(''),
    crossedOut: t => splitGraphemes(t).map(c => c === ' ' ? c : c + '\u0336' + '\u0338').join(''),
    underline:t => splitGraphemes(t).map(c => c + '\u0332').join(''),
    doubleUnderline: t => splitGraphemes(t).map(c => c + '\u0333').join(''),
    wavyUnderline: t => splitGraphemes(t).map(c => c + '\u0330').join(''),
    overline: t => splitGraphemes(t).map(c => c + '\u0305').join(''),
    doubleOverline: t => splitGraphemes(t).map(c => c + '\u033f').join(''),
    wavy:    t => splitGraphemes(t).map((c,i)=> c + (i%2===0 ? '\u0303':'' )).join(''),
    slash:   t => splitGraphemes(t).map(c => c + '\u0338').join(''),
    shortSlash: t => splitGraphemes(t).map(c => c + '\u0337').join(''),
    strikeUnderline: t => splitGraphemes(t).map(c => c + '\u0336' + '\u0332').join('')
  };

  function renderDecorator(text, style) {
    if (!text) return '';
    const fn = decorators[style.decoratorId];
    return fn ? fn(text) : text;
  }

  /* -----------------------------
     CASE CONVERSION HELPERS
     Small-word list + "already intentionally cased" detection (ALL-CAPS
     acronyms like NASA, internal caps like McDonald/iPhone) so Title/
     Sentence case don't mangle words a naive lowercase-then-capitalize
     pass would destroy.
     ----------------------------- */
  const CASE_SMALL_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of',
    'off', 'on', 'or', 'per', 'so', 'the', 'to', 'up', 'via', 'vs'
  ]);

  // Reads the page's declared language (e.g. lang="tr") so case conversion
  // follows locale casing rules (Turkish i/İ vs ı/I) instead of the default
  // ASCII-only mapping. Falls back to the locale-unaware default when no
  // document is available (e.g. classify-accent-support.js's Node shim).
  function caseLocale() {
    return (typeof document !== 'undefined' && document.documentElement &&
      document.documentElement.lang) || undefined;
  }

  function caseUpper(token) {
    const locale = caseLocale();
    return locale ? token.toLocaleUpperCase(locale) : token.toUpperCase();
  }

  function caseLower(token) {
    const locale = caseLocale();
    return locale ? token.toLocaleLowerCase(locale) : token.toLowerCase();
  }

  function caseHasIntentionalCasing(token) {
    const letters = token.replace(/[^\p{L}]/gu, '');
    if (letters.length < 2) return false;
    if (letters === caseUpper(letters)) return true; // acronym: NASA, FBI
    return /\p{Lu}/u.test(letters.slice(1)); // internal caps: McDonald, iPhone
  }

  // Caps-Lock text: it has capitals and not one lowercase letter, so an
  // all-caps word in it is shouting, not an acronym. An acronym is only
  // readable as one against lowercase neighbours ("the NASA team"). Text that
  // holds a letter from an uncased script (kana, Hangul, Arabic, ...) is left
  // alone: Caps Lock does not exist there, so a Latin "AI" next to it is far
  // more likely an acronym than shouting.
  function caseIsShouting(text) {
    return /\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text) && !/\p{Lo}/u.test(text);
  }

  // Applied by Capitalized, Title and Sentence case: shouting text is
  // lower-cased first so the per-word rules below see ordinary words.
  function caseUnshout(text) {
    return caseIsShouting(text) ? caseLower(text) : text;
  }

  // Surnames that a lower-cased pass would flatten: mcdavid -> McDavid,
  // o'brien -> O'Brien. Runs on a word already lower-cased and first-letter
  // capitalised. Deliberately narrow: Mc needs three more letters with a
  // vowel among them (so mcg, mcq stay as they are), O' skips o'clock and
  // o'er. Mac, van, de and the like are not attempted: mac and van are also
  // ordinary words, and no rule here can tell the two apart.
  const CASE_O_APOSTROPHE_WORDS = new Set(['clock', 'er']);
  function caseSurnameFix(seg) {
    return seg
      .replace(/^([^\p{L}]*Mc)(\p{L}{3,})/u, (m, head, rest) =>
        /[aeiouy]/i.test(rest) ? head + caseUpper(rest[0]) + rest.slice(1) : m)
      .replace(/^([^\p{L}]*O['\u2019])(\p{L}+)/u, (m, head, rest) =>
        CASE_O_APOSTROPHE_WORDS.has(rest.toLowerCase())
          ? m : head + caseUpper(rest[0]) + rest.slice(1));
  }

  function caseLowerWord(token) {
    return caseHasIntentionalCasing(token) ? token : caseLower(token);
  }

  function caseCapFirstAlpha(token) {
    const m = token.match(/\p{L}/u);
    if (!m) return token;
    const idx = token.indexOf(m[0]);
    return token.slice(0, idx) + caseUpper(token[idx]) + token.slice(idx + 1);
  }

  function caseCapWord(token) {
    if (caseHasIntentionalCasing(token)) return token;
    return token.split('-')
      .map(seg => caseSurnameFix(caseCapFirstAlpha(caseLower(seg)))).join('-');
  }

  // "i" is the English first-person pronoun only. In Polish, Italian, Croatian
  // and Czech it is the word "and", so the fix is gated on the page language.
  function caseFixPronounI(token) {
    const lang = caseLocale();
    if (lang && !/^en(-|$)/i.test(lang)) return token;
    return /^i(['’](m|ve|ll|d))?$/i.test(token) ? 'I' + token.slice(1) : token;
  }

  /* -----------------------------
     LOCALE CASE POLICY (opt-in per page)
     Title, Capitalized and Sentence case above were written for English: one
     English small-word list, English surname fixes. On a German page
     "der hund und die katze" became "Der Hund Und Die Katze".

     A page opts in with <html lang="xx" data-case-policy="locale">. Without
     that attribute every procedure runs the code above, unchanged, so a page
     that has not been cleared (a protected revenue page, the homepages that
     list every style) renders exactly what it rendered before. A page whose
     language has no entry here also stays on the code above: an unverified
     language keeps its old output rather than getting an invented rule.

     Each entry is a language's minor words: the words Title Case leaves
     lowercase unless they open the text. They are closed word classes
     (articles, coordinating conjunctions, short prepositions), and each list
     names the rule it comes from:
       en  the list above (Chicago-style title case), unchanged
       tr  TDK / Dil Derneği: in a title, "ve, de, ile, ki, ya, ya da" and the
           question particle "mi" stay lowercase (da, veya, mı/mu/mü are the
           same words in their other written forms)
       id  PUEBI (Permendikbud 50/2015): every word of a title is capitalised
           "kecuali kata tugas, seperti di, ke, dari, dan, yang, dan untuk";
           only the enumerated six are used
       es  RAE Ortografía 2010: names of periodicals and collections
           capitalise nouns and adjectives ("El Barco de Vapor")
       pt  Acordo Ortográfico 1990, Base XIX: words after the first in a title
           may be capitalised, function words stay lowercase ("Menino de Engenho")
       pl  PWN: in institution names every word is capitalised except
           conjunctions and prepositions
       de, fr, it, nl  no native title-case convention (headings capitalise the
           first word only, German also nouns). Title Case keeps the meaning
           every case-converter page gives it, "articles, conjunctions and
           short prepositions stay lowercase", applied to that language's own
           articles, conjunctions and prepositions.
     capLast: the last word is capitalised even when minor (English rule).
     TDK and PUEBI exempt only the first word, so tr and id keep it lowercase.

     The page language is a guess about the text, not a fact: people paste
     English into a German page. So Title Case counts the minor words that
     belong to only one of the two lists and uses English rules when English
     has more of them, the page language's when it has more, and both lists
     on a tie. "i" is not counted: it is English, Polish and Italian.

     Uncased scripts (ko, ja, zh) have nothing to convert; Latin text typed
     on those pages is read as English, which is what the pages say it is.

     Policy-only fixes, all from Unicode case data: a letter outside the BMP
     is capitalised as one character (the old code split its surrogate pair),
     the Latin digraph letters take their titlecase form (ǆ -> ǅ), and Dutch
     capitalises IJ as one letter (ijs -> IJs). French and Italian elided
     articles (l', d', dell', ...) are split so the word after them is
     capitalised: "la communauté de l'anneau" -> "La Communauté de l'Anneau".
     English surname fixes (McDavid, O'Brien) and the pronoun "i" run only
     when the text reads as English.
     ----------------------------- */
  function caseWordSet(words) {
    return new Set(words.split(' '));
  }

  const CASE_POLICIES = {
    en: { minor: CASE_SMALL_WORDS, capLast: true, english: true },
    de: { minor: caseWordSet('der die das den dem des ein eine einer eines einem einen ' +
      'und oder aber sondern denn als wie an am auf aus bei beim im in mit nach von vom ' +
      'vor zu zum zur für um über unter durch gegen ohne bis'), capLast: true },
    es: { minor: caseWordSet('el la los las lo un una unos unas y e o u ni pero que ' +
      'a al de del en con por para sin sobre entre hasta desde hacia'), capLast: true },
    fr: { minor: caseWordSet('le la les un une des du de au aux et ou ni mais ' +
      'à en dans par pour sur sous sans avec chez entre vers'), capLast: true,
      elision: caseWordSet('l d') },
    it: { minor: caseWordSet('il lo la i gli le un uno una e ed o od ma né ' +
      'di del dello della dei degli delle a ad al allo alla ai agli alle ' +
      'da dal dallo dalla dai dagli dalle in nel nello nella nei negli nelle ' +
      'con col su sul sullo sulla sui sugli sulle per tra fra'), capLast: true,
      elision: caseWordSet('l d un dell all dall nell sull') },
    nl: { minor: caseWordSet('de het een en of maar van in op met voor naar aan bij ' +
      'uit om tot te door over onder'), capLast: true, ij: true },
    pl: { minor: caseWordSet('i a o u w we z ze na do od po za ku pod nad przy przez ' +
      'dla bez oraz lub albo czy ale lecz'), capLast: true },
    pt: { minor: caseWordSet('o a os as um uma uns umas e ou nem mas de do da dos das ' +
      'em no na nos nas num numa por pelo pela pelos pelas para com sem sobre entre ' +
      'até ao aos à às'), capLast: true },
    tr: { minor: caseWordSet('ve de da ile ki ya veya mi mı mu mü'), capLast: false },
    id: { minor: caseWordSet('di ke dari dan yang untuk'), capLast: false },
    ja: { uncased: true },
    ko: { uncased: true },
    zh: { uncased: true },
    'zh-tw': { uncased: true },
  };

  // The policy for this page, or null for the unchanged code above.
  function casePolicy() {
    if (typeof document === 'undefined' || !document.documentElement ||
        typeof document.documentElement.getAttribute !== 'function') return null;
    if (document.documentElement.getAttribute('data-case-policy') !== 'locale') return null;
    const lang = String(caseLocale() || '').toLowerCase();
    return CASE_POLICIES[lang] || CASE_POLICIES[lang.split('-')[0]] || null;
  }

  function caseMinorKey(token) {
    return caseLower(token.replace(/[^\p{L}]/gu, ''));
  }

  // Which rules a text gets on this page: English, the page language's, or
  // both (see "The page language is a guess" above).
  function caseTextRules(text, pol) {
    const en = CASE_POLICIES.en;
    if (pol.english || pol.uncased) return en;
    let enScore = 0;
    let locScore = 0;
    for (const w of text.split(/\s+/)) {
      const k = caseMinorKey(w);
      if (!k || k === 'i') continue;
      const inEn = en.minor.has(k);
      const inLoc = pol.minor.has(k);
      if (inEn && !inLoc) enScore++;
      else if (inLoc && !inEn) locScore++;
    }
    if (enScore > locScore) return en;
    if (locScore > enScore) return pol;
    return { minor: new Set([...en.minor, ...pol.minor]), capLast: true,
      elision: pol.elision, ij: pol.ij, english: false };
  }

  const CASE_DIGRAPH_TITLE = {
    'Ǆ': 'ǅ', 'ǅ': 'ǅ', 'ǆ': 'ǅ', 'Ǉ': 'ǈ', 'ǈ': 'ǈ', 'ǉ': 'ǈ',
    'Ǌ': 'ǋ', 'ǋ': 'ǋ', 'ǌ': 'ǋ', 'Ǳ': 'ǲ', 'ǲ': 'ǲ', 'ǳ': 'ǲ'
  };

  function casePolicyCapFirst(token, pol) {
    const m = token.match(/\p{L}/u);
    if (!m) return token;
    const idx = m.index;
    if (pol.ij && /^i[jJ]/.test(token.slice(idx, idx + 2))) {
      return token.slice(0, idx) + 'IJ' + token.slice(idx + 2);
    }
    const ch = m[0];
    const up = CASE_DIGRAPH_TITLE[ch] || caseUpper(ch);
    return token.slice(0, idx) + up + token.slice(idx + ch.length);
  }

  function casePolicyCapWord(token, rules, pol) {
    if (caseHasIntentionalCasing(token)) return token;
    const capPol = { ij: pol.ij || rules.ij };
    return token.split('-').map(seg => {
      const out = casePolicyCapFirst(caseLower(seg), capPol);
      return rules.english ? caseSurnameFix(out) : out;
    }).join('-');
  }

  // "l'anneau" -> ['', 'l', "'", 'anneau'] when l is an elided article here.
  function caseSplitElision(token, rules) {
    if (!rules.elision) return null;
    const m = token.match(/^([^\p{L}]*)(\p{L}+)(['’])(\p{L}.*)$/u);
    if (!m || !rules.elision.has(caseLower(m[2]))) return null;
    return m.slice(1);
  }

  function casePolicyWords(text, pol, wordFn) {
    const src = caseUnshout(text);
    const rules = caseTextRules(src, pol);
    const words = src.split(/(\s+)/);
    const idxs = words.map((w, i) => (w.trim() ? i : -1)).filter(i => i >= 0);
    const ctx = { rules, first: idxs[0], last: idxs[idxs.length - 1] };
    return words.map((w, i) => (w.trim() ? wordFn(w, i, ctx) : w)).join('');
  }

  function casePolicyTitle(text, pol) {
    return casePolicyWords(text, pol, (w, i, { rules, first, last }) => {
      const el = caseSplitElision(w, rules);
      if (el) {
        const [lead, art, apos, rest] = el;
        const head = i === first
          ? casePolicyCapFirst(caseLower(lead + art), rules)
          : lead + caseLower(art);
        return head + apos + casePolicyCapWord(rest, rules, pol);
      }
      const edge = i === first || (rules.capLast && i === last);
      if (!edge && rules.minor.has(caseMinorKey(w))) return caseLowerWord(w);
      return casePolicyCapWord(w, rules, pol);
    });
  }

  function casePolicyCapitalized(text, pol) {
    return casePolicyWords(text, pol, (w, i, { rules }) => {
      const el = caseSplitElision(w, rules);
      if (el) {
        const [lead, art, apos, rest] = el;
        return casePolicyCapFirst(caseLower(lead + art), rules) + apos +
          casePolicyCapWord(rest, rules, pol);
      }
      return casePolicyCapWord(w, rules, pol);
    });
  }

  function casePolicySentence(text, pol) {
    let capNext = true;
    return casePolicyWords(text, pol, (w, i, { rules }) => {
      let out = caseLowerWord(w);
      if (capNext && !caseHasIntentionalCasing(w)) {
        out = casePolicyCapFirst(out, rules);
        if (rules.english) out = caseSurnameFix(out);
      }
      if (rules.english && /^i(['’](m|ve|ll|d))?$/i.test(out)) out = 'I' + out.slice(1);
      capNext = /[.!?]['")\]]*$/.test(w);
      return out;
    });
  }

  /* -----------------------------
     PROCEDURES
     ----------------------------- */
  const procedures = {
    'alternating-bold': text =>
      [...text].map((c,i)=> i%2===0 ? renderMap(c, textStyles['Ultra Bold']) : c).join(''),

    'alternating-italic': text =>
      [...text].map((c,i)=> i%2===0 ? renderMap(c, textStyles['Ultra Italic']) : c).join(''),

    'bold-alternating-italic': text =>
      [...text].map((c,i)=> i%2===0
        ? renderMap(c, textStyles['Ultra Bold'])
        : renderMap(c, textStyles['Ultra Italic'])
      ).join(''),

    'italic-switch-serifs': text =>
      [...text].map((c,i)=> i%2===0
        ? renderMap(c, textStyles['Ultra Italic'])
        : renderMap(c, textStyles['Ultra Italic Serif'])
      ).join(''),

    // === WORD WRAPPERS - Wrap entire words ===
    'ultra_word_curly_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `❨${word}❩` : word
      ).join(''),

    'ultra_word_angle_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `⦅${word}⦆` : word
      ).join(''),

    'ultra_word_double_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `⦅❨${word}❩⦆` : word
      ).join(''),

    'ultra_word_arrow_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `→${word}←` : word
      ).join(''),

    'ultra_word_forward_arrow_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `→${word}` : word
      ).join(''),

    'ultra_word_backward_arrow_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `${word}←` : word
      ).join(''),

    'ultra_word_bracket_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `[${word}]` : word
      ).join(''),

    'ultra_word_chevron_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `‹${word}›` : word
      ).join(''),

    'ultra_word_bar_wrap': text =>
      text.split(/(\s+)/).map(word => 
        word.trim() ? `|${word}|` : word
      ).join(''),

    'ultra_word_double_bar_wrap': text =>
      text.split(/(\s+)/).map(word =>
        word.trim() ? `‖${word}‖` : word
      ).join(''),

    // === CURSIVE PROCEDURES ===
    // Chicano / lowrider nametag: bold script inside ornate flourishes.
    'ultra_cursive_chicano': text =>
      text.trim()
        ? `꧁༺ ${renderMap(text, textStyles['Ultra Script Bold'])} ༻꧂`
        : text,

    // Aesthetic bio line: script wrapped in sparkle accents (the top cursive pairing).
    'ultra_cursive_sparkle': text =>
      text.trim()
        ? `⋆˚꒰ ${renderMap(text, textStyles['Ultra Script'])} ꒱˚⋆`
        : text,

    // === GOTHIC PROCEDURES ===
    // Keyed by style.slug (see renderProcedure). Each builds on the Fraktur /
    // Bold Fraktur maps and adds a combining mark or symbol wrapper.

    // Fraktur + combining underline — the "gothic underline" intent.
    // splitGraphemes (not a raw spread) so an accented letter's styled base
    // and its reattached combining mark are treated as one cluster and only
    // get a single underline mark, not one wedged between base and accent.
    'ultra-gothic-underline': text =>
      text.trim()
        ? splitGraphemes(renderMap(text, textStyles['Ultra Gothic']))
            .map(c => (c === ' ' || c === '\n') ? c : c + '̲').join('')
        : text,

    // Bold Fraktur bookended with crosses — religious / bible-verse intent.
    'ultra-gothic-cross': text =>
      text.trim()
        ? `✝ ${renderMap(text, textStyles['Ultra Gothic Bold'])} ✝`
        : text,

    // Fraktur wrapped in occult accents — goth / metal / dark-aesthetic intent.
    'ultra-gothic-occult': text =>
      text.trim()
        ? `⛧ ${renderMap(text, textStyles['Ultra Gothic'])} ⛧`
        : text,

    // Fraktur struck through — grunge / edgy intent. See splitGraphemes note above.
    'ultra-gothic-strike': text =>
      text.trim()
        ? splitGraphemes(renderMap(text, textStyles['Ultra Gothic']))
            .map(c => (c === ' ' || c === '\n') ? c : c + '̶').join('')
        : text,

    // Old English name inside a chicano-style banner — the nameplate intent.
    'ultra-old-english-banner': text =>
      text.trim()
        ? `꧁༺ ${renderMap(text, textStyles['Ultra Gothic Bold'])} ༻꧂`
        : text,

    // === CASE CONVERTER — plain ASCII case transforms, no Unicode mapping ===
    // Locale-aware (see caseUpper/caseLower) so Turkish-tagged pages get
    // correct i/İ/ı/I casing instead of JS's default ASCII-only rules.
    'case-upper': text => caseUpper(text),

    'case-lower': text => caseLower(text),

    // First letter of every word capitalized, no small-word exceptions.
    'case-capitalized': text => {
      const pol = casePolicy();
      if (pol) return casePolicyCapitalized(text, pol);
      return caseUnshout(text).split(/(\s+)/).map(w => (w.trim() ? caseCapWord(w) : w)).join('');
    },

    // Title Case: capitalizes major words, lowercases short articles/
    // conjunctions/prepositions (unless first/last word), preserves acronyms
    // and already-intentional internal caps (NASA, iPhone, McDonald) in text
    // that also has lowercase letters. Text with no lowercase at all is
    // Caps-Lock text and is lower-cased first (see caseIsShouting).
    'case-title': text => {
      const pol = casePolicy();
      if (pol) return casePolicyTitle(text, pol);
      const words = caseUnshout(text).split(/(\s+)/);
      const wordIdxs = words.map((w, i) => (w.trim() ? i : -1)).filter(i => i >= 0);
      const first = wordIdxs[0];
      const last = wordIdxs[wordIdxs.length - 1];
      return words.map((w, i) => {
        if (!w.trim()) return w;
        const bare = w.replace(/[^\p{L}]/gu, '').toLowerCase();
        if (i !== first && i !== last && CASE_SMALL_WORDS.has(bare)) {
          return caseLowerWord(w);
        }
        return caseCapWord(w);
      }).join('');
    },

    // Sentence case: capitalizes the first word of every sentence, keeps the
    // rest lowercase (except acronyms/intentional caps), and fixes the
    // standalone pronoun "i" / "i'm" / "i've" / "i'll" / "i'd".
    'case-sentence': text => {
      const pol = casePolicy();
      if (pol) return casePolicySentence(text, pol);
      let capNext = true;
      return caseUnshout(text).split(/(\s+)/).map(w => {
        if (!w.trim()) return w;
        let out = caseLowerWord(w);
        if (capNext && !caseHasIntentionalCasing(w)) {
          out = caseSurnameFix(caseCapFirstAlpha(out));
        }
        out = caseFixPronounI(out);
        capNext = /[.!?]['")\]]*$/.test(w);
        return out;
      }).join('');
    },

    // aLtErNaTiNg cAsE — the "mocking SpongeBob" meme case.
    'case-alternating': text =>
      [...text].map((c, i) => (i % 2 === 0 ? caseLower(c) : caseUpper(c))).join(''),

    // tOGGLE cASE — inverts whatever case each character already is.
    'case-toggle': text =>
      [...text].map(c => (c === caseUpper(c) ? caseLower(c) : caseUpper(c))).join(''),

    // ギャル文字 (gyaru-moji) — see galMojiMap above for scope/sourcing notes.
    // splitGraphemes so a base kana + any trailing combining mark is treated
    // as one unit rather than substituted mid-cluster.
    'gal-moji': text =>
      splitGraphemes(text).map(c => galMojiMap[c] || c).join(''),

    // Font Cuping ("cute typing") — Indonesian RP/Telegram phonetic respelling.
    // A handful of everyday words have a community-fixed cute form that the
    // general r→l / s→c / drop-final-h formula doesn't derive cleanly (e.g.
    // "marah" is attested as "mayah", not the rule's "mala"), so those are
    // looked up first; everything else falls back to the general formula.
    'cuping': text => {
      const CUPING_LEXICON = {
        jangan: 'janan', boleh: 'bole', sering: 'celing',
        marah: 'mayah', sendiri: 'cendili', lucu: 'luwssyu'
      };
      return text.split(/(\s+)/).map(token => {
        if (!token.trim()) return token;
        const m = token.match(/^(\p{L}+)(.*)$/su);
        if (!m) return token;
        const [, word, rest] = m;
        const lower = word.toLowerCase();
        let out = CUPING_LEXICON[lower] ||
          lower.replace(/r/g, 'l').replace(/s/g, 'c').replace(/h$/, '');
        if (word.length > 1 && word === word.toUpperCase()) {
          out = out.toUpperCase();
        } else if (/^\p{Lu}/u.test(word)) {
          out = out.charAt(0).toUpperCase() + out.slice(1);
        }
        return out + rest;
      }).join('');
    }
  };

  /* -----------------------------
     MASTER SWITCH
     ----------------------------- */
function renderProcedure(text, style) {
  if (!text) return '';
  // Slug first (most procedure keys are the slug itself), then procedureId —
  // four styles (the alternating/switch-serifs family) register their
  // algorithm under procedureId only, and the slug-only lookup silently
  // rendered them as plain text: fn undefined -> input returned unchanged.
  const fn = procedures[style.slug] || procedures[style.procedureId];
  return fn ? fn(text) : text;
}

// ✅ renderPattern goes HERE — after renderProcedure, before renderAny
function renderPattern(text, style) {
  if (!text) return '';
  const pattern = style.pattern || '███';
  return text.split(/(\s+)/).map(segment => {
    if (segment.trim() === '') return segment;
    return pattern;
  }).join('');
}

/* -----------------------------
   REDACT RENDERER
   Length-preserving blackout of the user's OWN text. Each visible character
   becomes a redact block (style.redactChar), so the redaction traces the
   shape of the sentence — the way real classified/redacted text reads.

   Modes (style.redactMode):
     'all'        → redact every word (default)
     'selective'  → redact only text wrapped in [[double brackets]],
                    e.g. "The [[agent]] arrived at [[9 PM]]"
     'alternate'  → redact every other word, leaving the rest readable
   ----------------------------- */
function renderRedact(text, style) {
  if (!text) return '';
  const ch = style.redactChar || '█';
  const mode = style.redactMode || 'all';

  // Replace each visible grapheme with the redact char; keep spaces/newlines.
  const blackout = chunk =>
    splitGraphemes(chunk)
      .map(g => (g === ' ' || g === '\n' || g === '\t') ? g : ch)
      .join('');

  // Selective: only the parts inside [[ ]] get redacted; markers are removed.
  if (mode === 'selective') {
    return text.replace(/\[\[([\s\S]*?)\]\]/g, (m, inner) => blackout(inner));
  }

  // Word-aware modes (preserve the original whitespace between words).
  let wordIndex = -1;
  return text.split(/(\s+)/).map(segment => {
    if (segment.trim() === '') return segment;
    wordIndex += 1;
    if (mode === 'alternate' && wordIndex % 2 === 1) return segment; // keep readable
    return blackout(segment);
  }).join('');
}

  function renderAny(text, style) {
    // Handle function-based transforms (upside down)
    if (style.type === 'function' && style.transform) {
      return applyUpsideDownTransform(text, style.transform);
    }
     
    switch (style.type) {
      case 'map':
        return renderMap(text, style);
      case 'decorator':
        return renderDecorator(text, style);
      case 'procedure':
        return renderProcedure(text, style);
      case 'pattern':
      return renderPattern(text, style);
      case 'redact':
      return renderRedact(text, style);
      default:
        return renderMap(text, style); // fallback
    }
  }

  /* -----------------------------
     EXPOSE GLOBAL
     ----------------------------- */
  window.UltraTextGenRender = {
    renderAny,
    // Languages with a verified case policy (read by check-case-policy.js).
    casePolicyLanguages: Object.keys(CASE_POLICIES)
  };

})();
