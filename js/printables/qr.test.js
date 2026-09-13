/* node js/printables/qr.test.js  —  npm run test:qr
   ---------------------------------------------------------------
   The QR encoder in js/printables/qr.js is the only thing standing between a
   printed sheet and no way back to the site, and it has exactly one failure
   mode that matters: a symbol that looks perfectly well-formed and that no
   phone can read. Nothing about that is visible by eye, so this file reads
   the symbols back the way a scanner does.

   The decoder below is deliberately NOT a mirror of the encoder's private
   helpers. It recovers the mask from the format strip written into the
   matrix, rather than being told which mask was used — which is the whole
   point, because the real bug this file was written against was a format
   block written along the wrong axis. Every symbol still decoded "correctly"
   under a decoder that assumed the mask; not one decoded under a real
   scanner.

   Cross-validated when it was written (2026-09-13), outside CI because
   neither tool is a dependency of this repo:
     - every symbol below decoded by zxing-cpp, an independent reader
     - every matrix compared module-for-module against segno, a reference
       encoder: identical on all eight masks for content that fills the
       symbol's data capacity exactly.

   ONE DELIBERATE DIVERGENCE FROM segno, do not "fix" it: when the bit stream
   already ends on a codeword boundary, segno appends a whole spurious zero
   codeword (`[0] * (8 - length % 8)` with length % 8 == 0 yields 8 bits).
   ISO/IEC 18004 §7.4.10 pads only when the stream does NOT end on a
   boundary, which is what qr.js does. The bytes sit after the terminator, so
   no reader ever looks at them and both forms scan; reproducing segno's
   quirk makes the matrices agree 64/64, which is how the divergence was
   isolated. Ours is the one that follows the spec. */
"use strict";

const fs = require("fs");
const path = require("path");

global.window = {};
global.document = {
  createElementNS: () => ({ setAttribute() {}, appendChild() {}, set textContent(v) {} })
};
// eslint-disable-next-line no-eval
eval(fs.readFileSync(path.join(__dirname, "qr.js"), "utf8"));
const QR = global.window.UltraTextGen.qr;

let pass = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return; }
  failures.push(msg);
}
function eq(actual, expected, msg) {
  ok(actual === expected, msg + " — expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
}

/* ---------- an independent reader ---------- */

const ALIGN = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const BLOCKS_M = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]
];

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

// Which modules a reader must skip: everything that is not payload.
function functionModules(version) {
  const n = version * 4 + 17;
  const res = [];
  for (let i = 0; i < n; i++) res.push(new Array(n).fill(false));
  const finder = (row, col) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) res[rr][cc] = true;
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  const centres = ALIGN[version - 1];
  for (const a of centres) for (const b of centres) {
    if (res[a][b]) continue;                       // overlaps a finder
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) res[a + r][b + c] = true;
  }
  for (let i = 8; i < n - 8; i++) { res[6][i] = true; res[i][6] = true; }
  res[n - 8][8] = true;
  for (let k = 0; k <= 8; k++) { res[8][k] = true; res[k][8] = true; }
  for (let j = 0; j < 8; j++) { res[8][n - 1 - j] = true; res[n - 1 - j][8] = true; }
  if (version >= 7) for (let v = 0; v < 18; v++) {
    const r = Math.floor(v / 3), c = v % 3;
    res[r][n - 11 + c] = true; res[n - 11 + c][r] = true;
  }
  return res;
}

// Read the mask number out of the symbol itself — never from the encoder.
// Both copies are read and required to agree, so a block written along one
// axis only is a failure here rather than a coin flip.
function readFormat(m) {
  const n = m.length;
  const copy1 = [];
  for (let i = 0; i <= 5; i++) copy1[i] = m[i][8];
  copy1[6] = m[7][8]; copy1[7] = m[8][8]; copy1[8] = m[8][7];
  for (let j = 9; j < 15; j++) copy1[j] = m[8][14 - j];
  const copy2 = [];
  for (let k = 0; k < 8; k++) copy2[k] = m[8][n - 1 - k];
  for (let l = 8; l < 15; l++) copy2[l] = m[n - 15 + l][8];

  let bits1 = 0, bits2 = 0;
  for (let i = 14; i >= 0; i--) { bits1 = (bits1 << 1) | copy1[i]; bits2 = (bits2 << 1) | copy2[i]; }
  const unmasked = bits1 ^ 0x5412;
  return {
    agree: bits1 === bits2,
    ecc: (unmasked >>> 13) & 0x3,
    mask: (unmasked >>> 10) & 0x7,
    // BCH(15,5) syndrome: zero means the 15 bits are a valid format string.
    valid: (function () {
      let rem = unmasked;
      for (let i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
      return (rem & 0x3ff) === 0;
    })()
  };
}

function readPayload(qr) {
  const m = qr.modules;
  const n = m.length;
  const version = (n - 17) / 4;
  const fmt = readFormat(m);
  const res = functionModules(version);

  const bits = [];
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step;
      for (let k = 0; k < 2; k++) {
        const c = right - k;
        if (res[r][c]) continue;
        let b = m[r][c];
        if (maskFn(fmt.mask, r, c)) b ^= 1;
        bits.push(b);
      }
    }
    upward = !upward;
  }
  const stream = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    stream.push(v);
  }

  // De-interleave back into blocks, then keep only the data half.
  const spec = BLOCKS_M[version - 1];
  const sizes = [];
  for (let b = 0; b < spec[1]; b++) sizes.push(spec[2]);
  for (let b = 0; b < spec[3]; b++) sizes.push(spec[4]);
  const blocks = sizes.map(() => []);
  let idx = 0;
  const maxLen = Math.max.apply(null, sizes);
  for (let c = 0; c < maxLen; c++) {
    for (let bi = 0; bi < sizes.length; bi++) if (c < sizes[bi]) blocks[bi].push(stream[idx++]);
  }
  // Error-correction check, independent of how the encoder builds its
  // generator polynomial: evaluate each full block (data + EC) as a
  // polynomial at a^0 .. a^(ecLen-1). A valid Reed-Solomon codeword is zero
  // at every one of those points. Without this the test reads only the data
  // half and cannot tell correct parity from garbage — verified, by
  // reversing every EC block and watching an earlier version of this file
  // still report 477 passed.
  const ecLen = spec[0];
  const ecBlocks = sizes.map(() => []);
  for (let e = 0; e < ecLen; e++) {
    for (let bi = 0; bi < sizes.length; bi++) ecBlocks[bi].push(stream[idx++]);
  }
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
  let ecClean = true;
  blocks.forEach((blk, bi) => {
    const full = blk.concat(ecBlocks[bi]);
    for (let s = 0; s < ecLen; s++) {
      let acc = 0;
      for (let i = 0; i < full.length; i++) acc = mul(acc, EXP[s]) ^ full[i];
      if (acc !== 0) ecClean = false;
    }
  });

  const data = [].concat.apply([], blocks);

  // Parse: 4 mode bits, then the character count, then the bytes.
  let bitPos = 0;
  const take = (count) => {
    let v = 0;
    for (let i = 0; i < count; i++) {
      const byte = data[(bitPos >>> 3)] || 0;
      v = (v << 1) | ((byte >>> (7 - (bitPos & 7))) & 1);
      bitPos++;
    }
    return v;
  };
  const mode = take(4);
  const len = take(version < 10 ? 8 : 16);
  let out = "";
  for (let i = 0; i < len; i++) out += String.fromCharCode(take(8));
  // A corrupt symbol yields bytes that are not valid UTF-8, and escape/
  // decodeURIComponent throws on those. Report that as a failed round trip
  // rather than a stack trace, so a probe says which assertion broke.
  let text;
  try { text = decodeURIComponent(escape(out)); } catch (err) { text = "<undecodable: " + err.name + ">"; }
  return { mode, text, format: fmt, version, ecClean };
}

/* ---------- 1. Format strings against ISO/IEC 18004 Table C.1 ---------- */
// The published 15-bit format strings for error-correction level M. These
// are the computation; readFormat() above covers the placement.
const FORMAT_M = [
  "101010000010010", "101000100100101", "101111001111100", "101101101001011",
  "100010111111001", "100000011001110", "100111110010111", "100101010100000"
];
FORMAT_M.forEach((expected, mask) => {
  const qr = QR.encode("A", { mask });
  const m = qr.modules;
  const n = m.length;
  const read = [];
  for (let i = 0; i <= 5; i++) read[i] = m[i][8];
  read[6] = m[7][8]; read[7] = m[8][8]; read[8] = m[8][7];
  for (let j = 9; j < 15; j++) read[j] = m[8][14 - j];
  let bits = "";
  for (let i = 14; i >= 0; i--) bits += read[i];
  eq(bits, expected, "format string for ECC M mask " + mask);
});

/* ---------- 2. Round trip, every mask, across the version range ---------- */
const SAMPLES = [
  "A",
  "ultratextgen.com",
  "ultratextgen.com/printables/alphabet-coloring-pages/letter-a",
  "https://ultratextgen.com/printables/name-tracing/?name=Emma",
  "https://ultratextgen.com/printables/handwriting-worksheet-generator/?name=Alexandra&rows=5&level=3&case=title",
  "https://ultratextgen.com/printables/name-tracing/?roster=Emma|Noah|Olivia|Liam|Ava|Ethan|Mia|Lucas|Sofia|Mason|Isabella|James",
  "ultratextgen.com/printables/cursive-alphabet/letter-é",   // multi-byte UTF-8
  "x".repeat(180)
];
const versionsSeen = new Set();
SAMPLES.forEach((text) => {
  for (let mask = 0; mask < 8; mask++) {
    const qr = QR.encode(text, { mask });
    ok(!!qr, "encodes: " + text.slice(0, 30));
    if (!qr) continue;
    versionsSeen.add(qr.version);
    const got = readPayload(qr);
    eq(got.format.mask, mask, "mask recovered from the symbol (" + text.slice(0, 20) + ", mask " + mask + ")");
    ok(got.format.agree, "both format copies agree (" + text.slice(0, 20) + ", mask " + mask + ")");
    ok(got.format.valid, "format block passes its BCH check (" + text.slice(0, 20) + ", mask " + mask + ")");
    eq(got.format.ecc, 0, "format block declares ECC level M (" + text.slice(0, 20) + ", mask " + mask + ")");
    eq(got.mode, 4, "byte mode (" + text.slice(0, 20) + ", mask " + mask + ")");
    ok(got.ecClean, "error-correction codewords check out (" + text.slice(0, 20) + ", mask " + mask + ")");
    eq(got.text, text, "round trip (" + text.slice(0, 30) + ", mask " + mask + ")");
  }
});
ok(versionsSeen.size >= 5, "samples span at least five versions — saw " + Array.from(versionsSeen).sort((a, b) => a - b).join(","));
ok(Array.from(versionsSeen).some((v) => v >= 7), "at least one sample is version 7+, which carries a version-information block");

/* ---------- 3. Structure ---------- */
const s = QR.encode("ultratextgen.com/printables/", {});
eq(s.size, s.version * 4 + 17, "size follows the version");
eq(s.modules.length, s.size, "matrix is square (rows)");
eq(s.modules[0].length, s.size, "matrix is square (cols)");
// Finder patterns: the centre 3x3 is dark and the ring around it is light.
[[0, 0], [0, s.size - 7], [s.size - 7, 0]].forEach(([r0, c0], i) => {
  let centre = 0, ring = 0;
  for (let r = 2; r <= 4; r++) for (let c = 2; c <= 4; c++) centre += s.modules[r0 + r][c0 + c];
  for (let k = 0; k < 7; k++) { ring += s.modules[r0 + 1][c0 + k] === 0 ? 0 : 1; }
  eq(centre, 9, "finder " + i + " has a solid 3x3 centre");
  ok(ring === 2, "finder " + i + " has a light separator row inside its border");
});
eq(s.modules[s.size - 8][8], 1, "the dark module is set");
let timingOk = true;
for (let i = 8; i < s.size - 8; i++) {
  if (s.modules[6][i] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
  if (s.modules[i][6] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
}
ok(timingOk, "both timing patterns alternate");

/* ---------- 4. Capacity boundary ---------- */
// Version 10 at ECC M holds 213 bytes once the 4 mode bits and the 16-bit
// character count are taken out of 216 codewords. One byte past that has to
// return null rather than a symbol that silently drops characters.
const atLimit = QR.encode("y".repeat(213), {});
ok(!!atLimit, "213 bytes still encodes");
if (atLimit) {
  eq(atLimit.version, 10, "213 bytes lands on version 10");
  eq(readPayload(atLimit).text, "y".repeat(213), "213 bytes round-trips");
}
eq(QR.encode("y".repeat(214), {}), null, "214 bytes returns null rather than truncating");
eq(QR.encode("", {}) && QR.encode("", {}).version, 1, "empty string still yields a valid version 1 symbol");

/* ---------- 5. Mask selection ---------- */
// With no mask forced the encoder must choose one, and report which.
const auto = QR.encode("ultratextgen.com/printables/bubble-letters/");
ok(auto.mask >= 0 && auto.mask <= 7, "auto mask is in range");
eq(readPayload(auto).format.mask, auto.mask, "the reported mask is the one written into the symbol");
eq(readPayload(auto).text, "ultratextgen.com/printables/bubble-letters/", "auto-masked symbol round-trips");

/* ---------- report ---------- */
console.log("qr.test.js: " + pass + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.log("  FAIL " + f));
  process.exit(1);
}
