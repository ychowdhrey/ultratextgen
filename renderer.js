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
   
function renderMap(text, style) {
  if (!text) return '';

  const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const normalLower = 'abcdefghijklmnopqrstuvwxyz';
  const normalNums  = '0123456789';

  // IMPORTANT: split as graphemes, not code units
  // Also ignore spaces in mapping strings if you included "spaced" variants
  const upperArr = splitGraphemes(style.upper).filter(x => x !== ' ');
  const lowerArr = splitGraphemes(style.lower).filter(x => x !== ' ');
  const numsArr  = splitGraphemes(style.nums).filter(x => x !== ' ');

  // Optional: sanity check in console
  // if (upperArr.length !== 26 || lowerArr.length !== 26) console.warn(style.slug, upperArr.length, lowerArr.length);
  // if (numsArr.length !== 10) console.warn(style.slug, numsArr.length);

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

  /* -----------------------------
     DECORATORS
     ----------------------------- */
  const decorators = {
    strike:   t => [...t].map(c => c + '\u0336').join(''),
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
      ).join('')
  };

  function renderProcedure(text, style) {
    if (!text) return '';
    const fn = procedures[style.procedureId];
    return fn ? fn(text) : text;
  }

  /* -----------------------------
     MASTER SWITCH
     ----------------------------- */
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
