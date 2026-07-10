/* ==========================================================================
   UltraTextGen — asciiConverter.js
   Pure text <-> ASCII/Unicode code-point converter. No DOM dependencies, so
   it can be reused or unit-tested anywhere it's loaded.

   Pairs with curvedText.js / verticalLayouts.js: same "one feature, one
   self-contained pure-logic module" pattern.

   Exposes: window.UltraAsciiConverter = {
     encode(text) -> { decimal, hex, binary, octal, charCount, nonAsciiCount }
     decode(input, mode) -> { text, ok, mode, invalidTokens }
     detectMode(input) -> 'decimal' | 'hex' | 'binary' | 'octal' | null
   }
   ========================================================================== */

(function () {
  "use strict";

  var MAX_CODE_POINT = 0x10ffff; // highest valid Unicode code point

  function toChars(text) {
    // Array.from iterates by Unicode code point, so surrogate pairs
    // (emoji, etc.) are handled as single "characters".
    return Array.from(String(text == null ? "" : text));
  }

  /* Text -> codes. Every character is encoded, ASCII (0-127) or not; codes
     above 127 use the character's full Unicode code point. */
  function encode(text) {
    var chars = toChars(text);
    var decimal = [];
    var hex = [];
    var binary = [];
    var octal = [];
    var nonAsciiCount = 0;

    chars.forEach(function (ch) {
      var cp = ch.codePointAt(0);
      if (cp > 127) nonAsciiCount += 1;
      decimal.push(String(cp));
      hex.push(cp.toString(16).toUpperCase().padStart(2, "0"));
      binary.push(cp.toString(2).padStart(8, "0"));
      octal.push(cp.toString(8).padStart(3, "0"));
    });

    return {
      decimal: decimal.join(" "),
      hex: hex.join(" "),
      binary: binary.join(" "),
      octal: octal.join(" "),
      charCount: chars.length,
      nonAsciiCount: nonAsciiCount
    };
  }

  function stripPrefix(tok) {
    return tok.replace(/^0[xXbBoO]/, "");
  }

  function splitTokens(input) {
    return input.trim().split(/[\s,;]+/).filter(Boolean);
  }

  function chunk(str, size) {
    var out = [];
    for (var i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
    return out;
  }

  function isValidToken(tok, mode) {
    if (!tok) return false;
    if (mode === "hex") return /^[0-9a-f]+$/i.test(tok);
    if (mode === "binary") return /^[01]+$/.test(tok);
    if (mode === "octal") return /^[0-7]+$/.test(tok);
    return /^[0-9]+$/.test(tok);
  }

  /* Guess the most likely code format for a pasted string. Decimal is
     preferred over octal when a set of tokens is ambiguous (all digits
     0-7), since "ascii to decimal" / "decimal to ascii" is the far more
     common query — octal needs an explicit mode pick. */
  function detectMode(input) {
    var trimmed = String(input == null ? "" : input).trim();
    if (!trimmed) return null;

    var tokens = splitTokens(trimmed);

    if (tokens.length > 1) {
      if (tokens.every(function (t) { return /^[01]{1,8}$/.test(t); })) return "binary";

      var hexLike = tokens.every(function (t) { return /^(0x)?[0-9a-f]{1,2}$/i.test(t); });
      var hasHexLetter = tokens.some(function (t) { return /[a-f]/i.test(t); });
      if (hexLike && hasHexLetter) return "hex";

      var decimalLike = tokens.every(function (t) {
        return /^[0-9]{1,7}$/.test(t) && parseInt(t, 10) <= MAX_CODE_POINT;
      });
      if (decimalLike) return "decimal";

      if (tokens.every(function (t) { return /^[0-7]{1,3}$/.test(t); })) return "octal";
      return null;
    }

    // Single contiguous token, no separators — only binary and hex have an
    // unambiguous fixed width to chunk by without extra hints.
    var single = stripPrefix(tokens[0] || "");
    if (/^[01]+$/.test(single) && single.length % 8 === 0) return "binary";
    if (/^[0-9a-f]+$/i.test(single) && single.length % 2 === 0) return "hex";
    return null;
  }

  /* Codes -> text. mode is 'auto' | 'decimal' | 'hex' | 'binary' | 'octal'. */
  function decode(input, mode) {
    var trimmed = String(input == null ? "" : input).trim();
    var requested = mode && mode !== "auto" ? mode : null;

    if (!trimmed) {
      return { text: "", ok: true, mode: requested, invalidTokens: [] };
    }

    var useMode = requested || detectMode(trimmed);
    if (!useMode) {
      return { text: "", ok: false, mode: null, invalidTokens: [] };
    }

    var tokens = splitTokens(trimmed);
    if (tokens.length === 1) {
      var single = stripPrefix(tokens[0]);
      var size = useMode === "hex" ? 2 : useMode === "binary" ? 8 : useMode === "octal" ? 3 : 0;
      tokens = size && single.length > size && single.length % size === 0
        ? chunk(single, size)
        : [single];
    } else {
      tokens = tokens.map(stripPrefix);
    }

    var base = useMode === "hex" ? 16 : useMode === "binary" ? 2 : useMode === "octal" ? 8 : 10;
    var invalidTokens = [];
    var text = "";

    tokens.forEach(function (tok) {
      if (!isValidToken(tok, useMode)) { invalidTokens.push(tok); return; }
      var n = parseInt(tok, base);
      if (!isFinite(n) || n < 0 || n > MAX_CODE_POINT) { invalidTokens.push(tok); return; }
      text += String.fromCodePoint(n);
    });

    return { text: text, ok: invalidTokens.length === 0, mode: useMode, invalidTokens: invalidTokens };
  }

  window.UltraAsciiConverter = { encode: encode, decode: decode, detectMode: detectMode };
})();
