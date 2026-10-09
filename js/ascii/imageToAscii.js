/* ==========================================================================
   UltraTextGen — imageToAscii.js
   Pure engine for /image-to-ascii/: turns a grid of RGBA pixels into ASCII
   (or block / braille) text. No DOM access here, so the same code runs in the
   browser and under node (the page's static example is generated from it).

   The controller (imageToAsciiController.js) owns the Canvas: it draws the
   picture at the sample size this module asks for (sampleSize) and hands the
   ImageData pixels to convert(). Nothing leaves the browser.

   Exposes window.UTG_IMAGE_TO_ASCII.
   ========================================================================== */

(function (root) {
  "use strict";

  /* A monospace cell is about twice as tall as it is wide, so one character
     row covers two "pixels" of height per pixel of width. Without this the
     picture comes out stretched to double height. */
  const CHAR_ASPECT = 0.5;

  /* Each ramp runs from darkest (most ink) to lightest (least ink). */
  const CHARSETS = [
    {
      key: "standard",
      name: "Standard",
      ramp: "@%#*+=-:. ",
      note: "10 plain keyboard characters. Pastes cleanly anywhere."
    },
    {
      key: "detailed",
      name: "Detailed",
      ramp: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
      note: "70 keyboard characters for finer shading."
    },
    {
      key: "blocks",
      name: "Blocks",
      ramp: "█▓▒░ ",
      note: "Shade blocks █▓▒░. Bold and readable at small widths."
    },
    {
      key: "braille",
      name: "Braille dots",
      ramp: null,
      note: "Braille patterns pack 8 dots into each character for the sharpest detail."
    }
  ];

  const BRAILLE_BASE = 0x2800;
  /* Dot bit for (x, y) inside a 2 x 4 braille cell. */
  const BRAILLE_BITS = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80]
  ];

  function getCharset(key) {
    for (let i = 0; i < CHARSETS.length; i++) {
      if (CHARSETS[i].key === key) return CHARSETS[i];
    }
    return CHARSETS[0];
  }

  /* How many pixels to sample, and the character grid that produces.
     Ramps sample one pixel per character; braille samples 2 x 4 per
     character, which keeps each dot square on screen. */
  function sampleSize(imgW, imgH, cols, charsetKey) {
    const w = Math.max(1, imgW);
    const h = Math.max(1, imgH);
    const c = Math.max(1, Math.round(cols));
    if (getCharset(charsetKey).key === "braille") {
      const pw = c * 2;
      const rows = Math.max(1, Math.round((pw * h / w) / 4));
      return { pw: pw, ph: rows * 4, cols: c, rows: rows };
    }
    const rows = Math.max(1, Math.round(c * (h / w) * CHAR_ASPECT));
    return { pw: c, ph: rows, cols: c, rows: rows };
  }

  function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : v);
  }

  /* RGBA -> one luminance value per pixel (0 dark .. 255 light), with
     transparency composited onto white, then brightness, contrast and
     invert applied. brightness and contrast run -100..100. */
  function luminance(pixels, pw, ph, opts) {
    const o = opts || {};
    const bright = (Number(o.brightness) || 0) * 2.55;
    const c = (Number(o.contrast) || 0) * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    const out = new Float32Array(pw * ph);
    for (let i = 0, p = 0; i < out.length; i++, p += 4) {
      const a = pixels[p + 3] / 255;
      let l = 0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2];
      l = l * a + 255 * (1 - a);
      l = clamp255(factor * (l - 128) + 128 + bright);
      if (o.invert) l = 255 - l;
      out[i] = l;
    }
    return out;
  }

  function rampText(lum, pw, ph, ramp) {
    const chars = Array.from(ramp);
    const n = chars.length;
    const lines = [];
    for (let y = 0; y < ph; y++) {
      let line = "";
      for (let x = 0; x < pw; x++) {
        const idx = Math.min(n - 1, Math.floor(lum[y * pw + x] / 256 * n));
        line += chars[idx];
      }
      lines.push(line.replace(/ +$/, ""));
    }
    return lines.join("\n");
  }

  /* Floyd-Steinberg dithering before thresholding: a plain threshold turns
     every soft gradient into one hard edge, while dithering keeps the shading
     as dot density. */
  function brailleText(lum, pw, ph) {
    const buf = Float32Array.from(lum);
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = y * pw + x;
        const old = buf[i];
        const val = old < 128 ? 0 : 255;
        const err = old - val;
        buf[i] = val;
        if (x + 1 < pw) buf[i + 1] += err * 7 / 16;
        if (y + 1 < ph) {
          if (x > 0) buf[i + pw - 1] += err * 3 / 16;
          buf[i + pw] += err * 5 / 16;
          if (x + 1 < pw) buf[i + pw + 1] += err * 1 / 16;
        }
      }
    }
    const lines = [];
    for (let cy = 0; cy < ph; cy += 4) {
      let line = "";
      for (let cx = 0; cx < pw; cx += 2) {
        let bits = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            if (x < pw && y < ph && buf[y * pw + x] === 0) bits |= BRAILLE_BITS[dy][dx];
          }
        }
        /* An empty cell stays U+2800 (blank braille), not a space: in most
           fonts a space is a different width from a braille glyph, and the
           rows would drift apart. */
        line += String.fromCharCode(BRAILLE_BASE + bits);
      }
      lines.push(line);
    }
    return lines.join("\n");
  }

  /* pixels: RGBA array of pw * ph pixels, sized by sampleSize(). */
  function convert(pixels, pw, ph, opts) {
    const o = opts || {};
    const set = getCharset(o.charset);
    const lum = luminance(pixels, pw, ph, o);
    if (set.key === "braille") return brailleText(lum, pw, ph);
    return rampText(lum, pw, ph, set.ramp);
  }

  /* A shaded sphere with a soft shadow, drawn as square RGBA pixels. It is
     the picture the tool shows before one is loaded, and the source of the
     page's static example, so both come from this same engine. */
  function sampleSphere(w, h) {
    const px = new Uint8ClampedArray(w * h * 4);
    const r = Math.min(w, h) * 0.4;
    const cx = w / 2;
    const cy = h * 0.45;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / r;
        const dy = (y + 0.5 - cy) / r;
        const d2 = dx * dx + dy * dy;
        let l = 255;
        if (d2 <= 1) {
          const dz = Math.sqrt(1 - d2);
          /* light from the upper left */
          const lambert = Math.max(0, -0.5 * dx - 0.6 * dy + 0.62 * dz);
          l = 25 + 185 * Math.pow(lambert, 1.2);
        } else {
          /* flattened shadow under the ball */
          const shx = (x + 0.5 - cx - r * 0.2) / (r * 1.05);
          const shy = (y + 0.5 - (cy + r * 0.98)) / (r * 0.16);
          const s2 = shx * shx + shy * shy;
          if (s2 < 1) l = 255 - 110 * (1 - s2);
        }
        const p = (y * w + x) * 4;
        px[p] = px[p + 1] = px[p + 2] = Math.round(l);
        px[p + 3] = 255;
      }
    }
    return px;
  }

  const api = {
    CHAR_ASPECT: CHAR_ASPECT,
    CHARSETS: CHARSETS,
    getCharset: getCharset,
    sampleSize: sampleSize,
    convert: convert,
    sampleSphere: sampleSphere
  };

  root.UTG_IMAGE_TO_ASCII = api;
})(typeof window !== "undefined" ? window : globalThis);
