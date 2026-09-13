/* UltraTextGen — QR encoder (byte mode, ECC level M, versions 1–10).
   ------------------------------------------------------------------
   Why this file exists: a printed sheet that leaves the browser has no way
   back. The PNG and PDF exports already stamp "ultratextgen.com/<page>" as
   flat text, which is a URL a parent has to retype off paper. A PDF can
   carry a /Link annotation (printablePdf.js does that now), but a PNG is
   pixels — a QR code is the only route back from an image, and from a sheet
   that has actually been printed.

   No dependencies, by the repo's hard rule: this is a complete ISO/IEC
   18004 encoder in ~300 lines rather than a library. Scope is deliberately
   the smallest that serves the job:

     - byte mode only (URLs are ASCII; alphanumeric mode would encode an
       uppercase URL more densely, but ours are lowercase paths)
     - ECC level M (~15% recovery) — the level that survives a home printer
       and a phone camera at an angle, without inflating the symbol
     - versions 1–10 (up to 213 bytes), which covers every preset URL this
       site can build, including a name-tracing sheet with a class roster

   encode() returns a square array of 0/1 rows. Rendering is the caller's:
   drawQrOnCanvas() for the PNG exports, qrSvg() for the print surface.
   Verified module-for-module against a reference encoder (segno) across
   every version and mask in js/printables/qr.test.js. */
(function () {
  "use strict";

  var ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ---- GF(256) log tables, primitive polynomial 0x11D ---- */
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  // Generator polynomial for `degree` error-correction codewords.
  function rsGenerator(degree) {
    var poly = [1];
    for (var d = 0; d < degree; d++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var i = 0; i < poly.length; i++) {
        next[i] ^= poly[i];
        next[i + 1] ^= gfMul(poly[i], EXP[d]);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, degree) {
    var gen = rsGenerator(degree);
    var rem = new Array(degree).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift();
      rem.push(0);
      for (var j = 0; j < degree; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
    return rem;
  }

  /* ---- Per-version block structure for ECC level M (ISO/IEC 18004 table 9).
     [ecCodewordsPerBlock, group1Blocks, group1DataCodewords,
      group2Blocks, group2DataCodewords] — index 0 is version 1. ---- */
  var BLOCKS_M = [
    [10, 1, 16, 0, 0],
    [16, 1, 28, 0, 0],
    [26, 1, 44, 0, 0],
    [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0],
    [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],
    [26, 4, 43, 1, 44]
  ];

  // Alignment-pattern centre coordinates per version (version 1 has none).
  var ALIGN = [
    [], [6, 18], [6, 22], [6, 26], [6, 30],
    [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ];

  // 18-bit version information, versions 7–10 (versions 1–6 carry none).
  var VERSION_INFO = { 7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3 };

  var MAX_VERSION = BLOCKS_M.length;

  function dataCapacity(version) {
    var b = BLOCKS_M[version - 1];
    return b[1] * b[2] + b[3] * b[4];
  }

  function sizeOf(version) { return version * 4 + 17; }

  /* ---- Bit buffer ---- */
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };
  BitBuffer.prototype.bytes = function () {
    var out = [];
    for (var i = 0; i < this.bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] || 0);
      out.push(b);
    }
    return out;
  };

  function utf8Bytes(str) {
    var out = [];
    var encoded = unescape(encodeURIComponent(String(str)));
    for (var i = 0; i < encoded.length; i++) out.push(encoded.charCodeAt(i) & 0xff);
    return out;
  }

  function pickVersion(byteLen) {
    for (var v = 1; v <= MAX_VERSION; v++) {
      // 4 mode bits + the character-count indicator (8 bits below version 10,
      // 16 from version 10 up) + the payload itself, in whole codewords.
      var countBits = v < 10 ? 8 : 16;
      var needed = Math.ceil((4 + countBits + byteLen * 8) / 8);
      if (needed <= dataCapacity(v)) return v;
    }
    return 0;
  }

  /* ---- Data codewords: encode, pad, split into blocks, interleave ---- */
  function codewords(text, version) {
    var payload = utf8Bytes(text);
    var countBits = version < 10 ? 8 : 16;
    var buf = new BitBuffer();
    buf.put(0x4, 4);                        // byte mode
    buf.put(payload.length, countBits);
    for (var i = 0; i < payload.length; i++) buf.put(payload[i], 8);

    var capacityBits = dataCapacity(version) * 8;
    // Terminator: up to four 0 bits, then pad to a byte boundary.
    var terminator = Math.min(4, capacityBits - buf.bits.length);
    buf.put(0, terminator);
    while (buf.bits.length % 8 !== 0) buf.bits.push(0);

    var data = buf.bytes();
    var pad = [0xec, 0x11];
    for (var p = 0; data.length < dataCapacity(version); p++) data.push(pad[p % 2]);

    var spec = BLOCKS_M[version - 1];
    var ecLen = spec[0];
    var blocks = [];
    var ecBlocks = [];
    var offset = 0;
    var groups = [[spec[1], spec[2]], [spec[3], spec[4]]];
    groups.forEach(function (g) {
      for (var b = 0; b < g[0]; b++) {
        var chunk = data.slice(offset, offset + g[1]);
        offset += g[1];
        blocks.push(chunk);
        ecBlocks.push(rsRemainder(chunk, ecLen));
      }
    });

    // Interleave: one codeword from each block in turn, data then EC.
    var out = [];
    var maxData = Math.max.apply(null, blocks.map(function (b) { return b.length; }));
    for (var c = 0; c < maxData; c++) {
      for (var bi = 0; bi < blocks.length; bi++) if (c < blocks[bi].length) out.push(blocks[bi][c]);
    }
    for (var e = 0; e < ecLen; e++) {
      for (var ei = 0; ei < ecBlocks.length; ei++) out.push(ecBlocks[ei][e]);
    }
    return out;
  }

  /* ---- Matrix ---- */
  // `reserved` marks every module the data stream must skip: the function
  // patterns and the format/version areas. It is built before any data is
  // placed and is what keeps the zig-zag walk honest.
  function blankMatrix(version) {
    var n = sizeOf(version);
    var m = [];
    var reserved = [];
    for (var r = 0; r < n; r++) {
      m.push(new Array(n).fill(0));
      reserved.push(new Array(n).fill(false));
    }
    return { n: n, m: m, reserved: reserved };
  }

  function placeFinder(g, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= g.n || cc < 0 || cc >= g.n) continue;
        var inner = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        var on = inner && (r === 0 || r === 6 || c === 0 || c === 6 ||
                           (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        g.m[rr][cc] = on ? 1 : 0;
        g.reserved[rr][cc] = true;
      }
    }
  }

  function placeAlignment(g, version) {
    var centres = ALIGN[version - 1];
    for (var a = 0; a < centres.length; a++) {
      for (var b = 0; b < centres.length; b++) {
        var row = centres[a], col = centres[b];
        // Skip the three corners already occupied by finder patterns.
        if (g.reserved[row][col]) continue;
        for (var r = -2; r <= 2; r++) {
          for (var c = -2; c <= 2; c++) {
            var on = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            g.m[row + r][col + c] = on ? 1 : 0;
            g.reserved[row + r][col + c] = true;
          }
        }
      }
    }
  }

  function placeFunctionPatterns(g, version) {
    placeFinder(g, 0, 0);
    placeFinder(g, 0, g.n - 7);
    placeFinder(g, g.n - 7, 0);
    placeAlignment(g, version);
    for (var i = 8; i < g.n - 8; i++) {
      var on = i % 2 === 0 ? 1 : 0;
      g.m[6][i] = on; g.reserved[6][i] = true;
      g.m[i][6] = on; g.reserved[i][6] = true;
    }
    // Dark module, always set, always just above the lower-left finder.
    g.m[g.n - 8][8] = 1;
    g.reserved[g.n - 8][8] = true;
    // Reserve the two format-information strips.
    for (var k = 0; k <= 8; k++) {
      if (!g.reserved[8][k]) g.reserved[8][k] = true;
      if (!g.reserved[k][8]) g.reserved[k][8] = true;
    }
    for (var j = 0; j < 8; j++) {
      g.reserved[8][g.n - 1 - j] = true;
      g.reserved[g.n - 1 - j][8] = true;
    }
    if (version >= 7) {
      for (var v = 0; v < 18; v++) {
        var r = Math.floor(v / 3), c = v % 3;
        g.reserved[r][g.n - 11 + c] = true;
        g.reserved[g.n - 11 + c][r] = true;
      }
    }
  }

  function placeVersionInfo(g, version) {
    if (version < 7) return;
    var bits = VERSION_INFO[version];
    for (var i = 0; i < 18; i++) {
      var bit = (bits >>> i) & 1;
      var r = Math.floor(i / 3), c = i % 3;
      g.m[r][g.n - 11 + c] = bit;
      g.m[g.n - 11 + c][r] = bit;
    }
  }

  // Format information: 5 data bits (2 ECC level + 3 mask) extended by a
  // BCH(15,5) remainder, then XORed with the fixed 0x5412 pattern.
  function formatBits(mask) {
    var data = (0x00 << 3) | mask;      // 0b00 = ECC level M
    var rem = data;
    for (var i = 0; i < 10; i++) {
      rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
    }
    return (((data << 10) | rem) ^ 0x5412) & 0x7fff;
  }

  // The 15 format bits are written twice, and the two copies run along
  // DIFFERENT axes: the first copy climbs column 8 then turns left along row
  // 8, the second runs up column 8 from the bottom and along row 8 to the
  // right edge. Writing both copies on the same axis produces a symbol that
  // looks perfectly well-formed and that no reader can decode at all — the
  // format block is the first thing a decoder reads, so a wrong mask number
  // there fails the whole symbol rather than corrupting part of it.
  function placeFormat(g, mask) {
    var bits = formatBits(mask);
    var n = g.n;
    // Copy 1: bits 0–5 up column 8, bits 6–8 around the corner, 9–14 along row 8.
    for (var i = 0; i <= 5; i++) g.m[i][8] = (bits >>> i) & 1;
    g.m[7][8] = (bits >>> 6) & 1;
    g.m[8][8] = (bits >>> 7) & 1;
    g.m[8][7] = (bits >>> 8) & 1;
    for (var j = 9; j < 15; j++) g.m[8][14 - j] = (bits >>> j) & 1;
    // Copy 2: bits 0–7 along row 8 from the right edge, 8–14 up column 8.
    for (var k = 0; k < 8; k++) g.m[8][n - 1 - k] = (bits >>> k) & 1;
    for (var l = 8; l < 15; l++) g.m[n - 15 + l][8] = (bits >>> l) & 1;
    g.m[n - 8][8] = 1;
  }

  function maskFn(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  // Zig-zag placement: two-module-wide columns, right to left, alternating
  // upward and downward, skipping the vertical timing column at x=6.
  function placeData(g, bytes, mask) {
    var bitIndex = 0;
    var total = bytes.length * 8;
    var upward = true;
    for (var right = g.n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var step = 0; step < g.n; step++) {
        var r = upward ? g.n - 1 - step : step;
        for (var k = 0; k < 2; k++) {
          var c = right - k;
          if (g.reserved[r][c]) continue;
          var bit = 0;
          if (bitIndex < total) {
            bit = (bytes[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
            bitIndex++;
          }
          if (maskFn(mask, r, c)) bit ^= 1;
          g.m[r][c] = bit;
        }
      }
      upward = !upward;
    }
  }

  /* ---- Mask penalty (ISO/IEC 18004 §8.8.2) ---- */
  function penalty(g) {
    var n = g.n, m = g.m, score = 0, r, c, i;

    // Rule 1: runs of five or more same-coloured modules in a line.
    for (i = 0; i < n; i++) {
      var runRow = 1, runCol = 1;
      for (var j = 1; j < n; j++) {
        runRow = m[i][j] === m[i][j - 1] ? runRow + 1 : 1;
        if (runRow === 5) score += 3; else if (runRow > 5) score += 1;
        runCol = m[j][i] === m[j - 1][i] ? runCol + 1 : 1;
        if (runCol === 5) score += 3; else if (runCol > 5) score += 1;
      }
    }
    // Rule 2: 2x2 blocks of one colour.
    for (r = 0; r < n - 1; r++) {
      for (c = 0; c < n - 1; c++) {
        var v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }
    // Rule 3: the 1:1:3:1:1 finder-lookalike, with four light modules either side.
    var A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    var matches = function (get) {
      var hits = 0;
      for (var s = 0; s + 11 <= n; s++) {
        var okA = true, okB = true;
        for (var t = 0; t < 11; t++) {
          var val = get(s + t);
          if (val !== A[t]) okA = false;
          if (val !== B[t]) okB = false;
        }
        if (okA) hits++;
        if (okB) hits++;
      }
      return hits;
    };
    for (i = 0; i < n; i++) {
      score += 40 * matches((function (row) { return function (x) { return m[row][x]; }; })(i));
      score += 40 * matches((function (col) { return function (x) { return m[x][col]; }; })(i));
    }
    // Rule 4: deviation from a 50/50 dark ratio.
    var dark = 0;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += m[r][c];
    var percent = (dark * 100) / (n * n);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return score;
  }

  /* ---- Public API ---- */
  // encode(text) -> { size, modules: [[0|1, …], …], version, mask }
  // Returns null when the text does not fit version 10 at ECC M, so a caller
  // can fall back to the flat text credit rather than draw a broken symbol.
  function encode(text, opts) {
    var o = opts || {};
    var payload = utf8Bytes(text);
    var version = pickVersion(payload.length);
    if (!version) return null;
    var bytes = codewords(text, version);

    var best = null;
    var masks = typeof o.mask === "number" ? [o.mask] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (var mi = 0; mi < masks.length; mi++) {
      var g = blankMatrix(version);
      placeFunctionPatterns(g, version);
      placeVersionInfo(g, version);
      placeData(g, bytes, masks[mi]);
      placeFormat(g, masks[mi]);
      var score = penalty(g);
      if (!best || score < best.score) best = { score: score, grid: g, mask: masks[mi] };
    }
    return { size: best.grid.n, modules: best.grid.m, version: version, mask: best.mask };
  }

  /* ---- Renderers ---- */
  // Canvas, for the PNG exports. `size` is the drawn edge in device pixels;
  // the quiet zone (4 modules, required by the spec for a reliable scan) is
  // drawn inside it, so a caller reserving `size` px reserves the whole
  // symbol and never has to know about the margin.
  function drawQrOnCanvas(ctx, text, x, y, size, opts) {
    var qr = encode(text, opts);
    if (!qr) return false;
    var o = opts || {};
    var quiet = o.quiet == null ? 4 : o.quiet;
    var total = qr.size + quiet * 2;
    var scale = size / total;
    ctx.save();
    ctx.fillStyle = o.light || "#ffffff";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = o.dark || "#1a1a2e";
    for (var r = 0; r < qr.size; r++) {
      for (var c = 0; c < qr.size; c++) {
        if (!qr.modules[r][c]) continue;
        // Ceil the edge so adjacent modules never leave a hairline gap at
        // fractional scales — a seam a camera reads as a light module.
        ctx.fillRect(
          x + (c + quiet) * scale,
          y + (r + quiet) * scale,
          Math.ceil(scale),
          Math.ceil(scale)
        );
      }
    }
    ctx.restore();
    return true;
  }

  // SVG, for the print surface (and therefore for the browser's own
  // Save-as-PDF). One <path> of module rectangles rather than one <rect>
  // each: a version-10 symbol is 3,249 modules, and 3,249 elements in the
  // print DOM is a measurable layout cost for a decoration.
  function qrSvg(text, opts) {
    var qr = encode(text, opts);
    if (!qr) return null;
    var o = opts || {};
    var quiet = o.quiet == null ? 4 : o.quiet;
    var total = qr.size + quiet * 2;
    var d = "";
    for (var r = 0; r < qr.size; r++) {
      for (var c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) d += "M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z";
      }
    }
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + total + " " + total);
    svg.setAttribute("width", o.px || 96);
    svg.setAttribute("height", o.px || 96);
    svg.setAttribute("role", "img");
    if (o.title) {
      var t = document.createElementNS("http://www.w3.org/2000/svg", "title");
      t.textContent = o.title;
      svg.appendChild(t);
    }
    var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", total); bg.setAttribute("height", total);
    bg.setAttribute("fill", o.light || "#ffffff");
    svg.appendChild(bg);
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", o.dark || "#1a1a2e");
    svg.appendChild(path);
    return svg;
  }

  ns.qr = { encode: encode, drawQrOnCanvas: drawQrOnCanvas, qrSvg: qrSvg, MAX_VERSION: MAX_VERSION };
})();
