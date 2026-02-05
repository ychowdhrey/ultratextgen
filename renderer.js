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
    'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'ן', 'm': 'ɯ', 'n': 'u', 'r': 'ɹ', 't': 'ʇ',
    'v': 'ʌ', 'w': 'ʍ', 'y': 'ʎ',
    'A': '∀', 'C': 'Ɔ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'J': 'ſ', 'L': '˥', 'M': 'W',
    'N': 'N', 'P': 'Ԁ', 'R': 'ᴚ', 'T': '┴', 'U': '∩', 'V': 'Λ', 'W': 'M', 'Y': '⅄',
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
    fullyFlipped: (text) => {
      const words = text.split(' ');
      const processed = words.map(word => {
        const chars = Array.from(word);
        const allSupported = chars.every(ch => flipChar(ch) !== null || ch === ' ');
        if (allSupported) {
          return applyFlipAndReverse(word, 'fallback');
        }
        return word;
      });
      return processed.join(' ');
    },

    mixedFlipFallback: (text) => {
      return applyFlipAndReverse(text, 'fallback');
    },

    reverseOnly: (text) => {
      return reverseString(text);
    },

    reverseFlipCombo: (text) => {
      return applyFlipAndReverse(text, 'fallback');
    },

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

    lineLevel: (text) => {
      const lines = text.split('\n');
      return lines.map(line => applyFlipAndReverse(line, 'fallback')).join('\n');
    },

    alternating: (text) => {
      const words = text.split(' ');
      return words.map((word, index) => {
        if (index % 2 === 0) {
          return Array.from(word).map(ch => flipChar(ch) || ch).join('');
        }
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
  function renderMap(text, style) {
    if (!text) return '';

    const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const normalLower = 'abcdefghijklmnopqrstuvwxyz';
    const normalNums  = '0123456789';

    const upperArr = [...style.upper];
    const lowerArr = [...style.lower];
    const numsArr  = [...style.nums];

    return [...text].map(char => {
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
