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

  // Reverse a string by code points (emoji-safe)
  function reverseString(str) {
    return Array.from(str).reverse().join('');
  }

  // Flip a single character
  function flipChar(ch) {
    return flipMap[ch] || null;
  }

  // Apply flip and reverse (standard upside down)
  function applyFlipAndReverse(str, fallbackMode = 'fallback') {
    const chars = Array.from(str);
    const reversed = chars.reverse();
    const flipped = reversed.map(ch => {
      const flip = flipChar(ch);
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
      const chars = Array.from(text);
      const reversed = chars.reverse();
      const transformed = reversed.map(ch => {
        const flip = flipChar(ch);
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

  // Default: grapheme split, and drop spaces (for your spaced strings)
  return splitGraphemes(s).filter(x => x !== ' ');
}

   // renderMap logic

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

  // Debug only (remove later if you want)
  if (upperArr.length !== 26 || lowerArr.length !== 26 || numsArr.length !== 10) {
    console.warn('Bad map lengths', style.slug, {
      upper: upperArr.length,
      lower: lowerArr.length,
      nums: numsArr.length
    });
  }

  if (!isSpaced) {
    return Array.from(text).map(char => {
      const u = normalUpper.indexOf(char);
      if (u !== -1) return upperArr[u] || char;

      const l = normalLower.indexOf(char);
      if (l !== -1) return lowerArr[l] || char;

      const n = normalNums.indexOf(char);
      if (n !== -1) return numsArr[n] || char;

      return char;
    }).join('');
  }

  // Spaced output mode (adds spacing after each mapped glyph)
  const out = [];
  for (const ch of Array.from(text)) {
    if (ch === '\n') {
      if (out[out.length - 1] === ' ') out.pop();
      out.push('\n');
      continue;
    }

    if (ch === ' ') {
      if (out[out.length - 1] === ' ') out.pop();
      out.push(' ');
      continue;
    }

    let mapped = ch;

    const u = normalUpper.indexOf(ch);
    if (u !== -1) mapped = upperArr[u] || ch;

    const l = normalLower.indexOf(ch);
    if (l !== -1) mapped = lowerArr[l] || ch;

    const n = normalNums.indexOf(ch);
    if (n !== -1) mapped = numsArr[n] || ch;

    out.push(mapped);
    out.push(' ');
  }

  if (out[out.length - 1] === ' ') out.pop();
  return out.join('');
}

  /* -----------------------------
     Strikethrough and Underline
     ----------------------------- */
  const decorators = {
    strike:   t => [...t].map(c => c + '\u0336').join(''),
    doubleStrike: t => [...t].map(c => c + '\u0336' + '\u0335').join(''),
    crossedOut: t => [...t].map(c => c === ' ' ? c : c + '\u0336' + '\u0338').join(''),
    underline:t => [...t].map(c => c + '\u0332').join(''),
    wavy:    t => [...t].map((c,i)=> c + (i%2===0 ? '\u0303':'' )).join(''),
    slash:   t => [...t].map(c => c + '\u0338').join('')
  };

  function renderDecorator(text, style) {
    if (!text) return '';
    const fn = decorators[style.decoratorId];
    return fn ? fn(text) : text;
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
      ).join('')
  };

  /* -----------------------------
     MASTER SWITCH
     ----------------------------- */
function renderProcedure(text, style) {
  if (!text) return '';
  const fn = procedures[style.slug];
  return fn ? fn(text) : text;
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
      default:
        return renderMap(text, style); // fallback
    }
  }

  /* -----------------------------
     EXPOSE GLOBAL
     ----------------------------- */
  window.UltraTextGenRender = {
    renderAny
  };

})();
