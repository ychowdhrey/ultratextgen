/* ==========================================================================
   UltraTextGen - lettersToNumbers.js
   Pure A1Z26 letter-position cipher: letters to numbers and back. No DOM, so
   the page controller and the node test load the same file.

   Exposes window.UltraTextGen.lettersToNumbers = {
     encode(text, opts) -> { text, letterCount, leftAsTyped, numbers }
     decode(input, opts) -> { text, letterCount, outOfRange, outOfRangeTokens }
     SEPARATORS, firstNumber(opts), lastNumber(opts)
   }

   opts.zeroBased  true counts A=0 ... Z=25 (A0Z25); default A=1 ... Z=26.
   opts.separator  'space' (default), 'dash' or 'comma'. There is no "none":
                   8512 reads as 8 5 12, 85 12 or 8 51 2.
   opts.keepOthers encode only. true (default) leaves every character that is
                   not a letter where it was typed; false drops them.
   ========================================================================== */
(function () {
  "use strict";

  const SEPARATORS = { space: " ", dash: "-", comma: ", " };

  const CODE_UPPER_A = 65;
  const CODE_LOWER_A = 97;
  const ALPHABET_SIZE = 26;
  const MAX_TOKEN_DIGITS = 3;

  function offset(opts) {
    return opts && opts.zeroBased ? 0 : 1;
  }

  function firstNumber(opts) { return offset(opts); }
  function lastNumber(opts) { return offset(opts) + ALPHABET_SIZE - 1; }

  function separatorFor(opts) {
    const key = opts && opts.separator;
    return Object.prototype.hasOwnProperty.call(SEPARATORS, key) ? SEPARATORS[key] : SEPARATORS.space;
  }

  /* The A-Z index (0-25) of one code point, or -1 when it is not a Latin
     letter. A letter with diacritics counts as its base letter: NFD splits
     "é" into "e" + a combining mark, and only when everything after the base
     is a combining mark. Letters that do not decompose (ß, ø, ł) and every
     non-Latin script return -1, so they are left as typed instead of being
     mapped to a guess. */
  function latinIndex(ch) {
    const decomposed = ch.normalize("NFD");
    const base = decomposed.charCodeAt(0);
    let index = -1;
    if (base >= CODE_UPPER_A && base < CODE_UPPER_A + ALPHABET_SIZE) index = base - CODE_UPPER_A;
    else if (base >= CODE_LOWER_A && base < CODE_LOWER_A + ALPHABET_SIZE) index = base - CODE_LOWER_A;
    if (index === -1) return -1;
    return /^\p{M}*$/u.test(decomposed.slice(1)) ? index : -1;
  }

  /* Text to numbers. */
  function encode(text, opts) {
    const first = offset(opts);
    const keepOthers = !(opts && opts.keepOthers === false);
    const sep = separatorFor(opts);
    const chars = Array.from(String(text == null ? "" : text));

    let out = "";
    const numbers = [];
    let leftAsTyped = 0;
    // What the last thing written was: "letter" (a letter number), "digit"
    // (a digit typed in the text and kept) or "" (anything else, or nothing).
    // A kept character other than a digit breaks the run; a dropped one does
    // not. A digit typed next to a letter number gets the separator too,
    // because "a1b" written as 112 could be read three ways.
    let prev = "";
    // True while the last code point read was a Latin letter, so a combining
    // mark typed apart from its base ("e" then U+0301) is absorbed into it.
    let afterBase = false;

    chars.forEach(function (ch) {
      const index = latinIndex(ch);
      if (index !== -1) {
        const n = index + first;
        if (prev !== "") out += sep;
        out += String(n);
        numbers.push(n);
        prev = "letter";
        afterBase = true;
        return;
      }
      if (afterBase && /^\p{M}$/u.test(ch)) return;
      afterBase = false;
      if (/^\p{L}$/u.test(ch)) leftAsTyped += 1;
      if (!keepOthers) return;
      if (/^[0-9]$/.test(ch)) {
        if (prev === "letter") out += sep;
        out += ch;
        prev = "digit";
        return;
      }
      out += ch;
      prev = "";
    });

    return { text: out, letterCount: numbers.length, leftAsTyped: leftAsTyped, numbers: numbers };
  }

  /* What a stretch of text between two numbers turns into. Spaces, tabs,
     commas and dashes only separate the numbers. A slash is a word break and
     becomes a space, a line break stays a line break, and any other
     character is kept as typed. */
  function gapToText(gap) {
    let out = "";
    for (let i = 0; i < gap.length; i += 1) {
      const c = gap[i];
      if (c === "/") out += " ";
      else if (c === "\n") out += "\n";
      else if (/[ \t\r, \-‐-―−]/.test(c)) continue;
      else out += c;
    }
    return out;
  }

  /* Numbers to text. */
  function decode(input, opts) {
    const first = offset(opts);
    const last = lastNumber(opts);
    const source = String(input == null ? "" : input);
    const pattern = /[0-9]+/g;

    let out = "";
    let letterCount = 0;
    const outOfRangeTokens = [];
    let cursor = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      out += gapToText(source.slice(cursor, match.index));
      cursor = match.index + match[0].length;
      const token = match[0];
      const digits = token.replace(/^0+(?=[0-9])/, "");
      const n = digits.length > MAX_TOKEN_DIGITS ? Infinity : parseInt(digits, 10);
      if (n >= first && n <= last) {
        out += String.fromCharCode(CODE_UPPER_A + n - first);
        letterCount += 1;
      } else {
        out += token;
        outOfRangeTokens.push(token);
      }
    }
    out += gapToText(source.slice(cursor));

    return {
      text: out,
      letterCount: letterCount,
      outOfRange: outOfRangeTokens.length,
      outOfRangeTokens: outOfRangeTokens
    };
  }

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  UTG.lettersToNumbers = {
    encode: encode,
    decode: decode,
    SEPARATORS: SEPARATORS,
    firstNumber: firstNumber,
    lastNumber: lastNumber
  };
})();
