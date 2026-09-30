/* ══════════════════════════════════════════════════════════════════
   Zalgo GIF export — zalgo-gif.js
   Loaded on demand by zalgo-text.js when someone presses "GIF".
   Pure vanilla JS, no dependencies: each frame is drawn on a <canvas>,
   reduced to a 16-step greyscale palette (light text on a dark ground) and
   written as an animated GIF89a with a hand-rolled LZW encoder. Nothing
   leaves the browser.

   window.UTGZalgoGif.make(frames, { delay, holdLast }) -> Promise<Blob>
     frames    array of output strings, one per frame
     delay     centiseconds per frame (default 12)
     holdLast  extra centiseconds on the last frame (default 0)
   window.UTGZalgoGif.encode(width, height, framesOfIndexes, palette, delays)
     -> Uint8Array, the encoder on its own (used by the Node test)
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const BG = [17, 17, 20];
  const FG = [245, 245, 245];
  const LEVELS = 16;                 // palette size (a power of two)
  const FONT_PX = 44;
  const MIN_FONT_PX = 20;
  const MAX_WIDTH = 1080;
  const MAX_HEIGHT = 1920;
  const PAD = 32;
  // The same family the live output uses (system-ui), so the GIF stacks
  // marks the way the preview does, with fallbacks that carry combining
  // marks and Thai.
  const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "DejaVu Sans", "Noto Sans Thai", Tahoma, Arial, sans-serif';

  // ── GIF encoder ────────────────────────────────────────────────
  function ByteWriter() {
    const chunks = [];
    let cur = new Uint8Array(65536);
    let pos = 0;
    return {
      byte(b) {
        if (pos === cur.length) { chunks.push(cur); cur = new Uint8Array(65536); pos = 0; }
        cur[pos++] = b & 0xFF;
      },
      word(w) { this.byte(w & 0xFF); this.byte((w >> 8) & 0xFF); },
      bytes(arr) { for (let i = 0; i < arr.length; i++) this.byte(arr[i]); },
      str(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); },
      finish() {
        chunks.push(cur.subarray(0, pos));
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const out = new Uint8Array(total);
        let o = 0;
        chunks.forEach(c => { out.set(c, o); o += c.length; });
        return out;
      }
    };
  }

  // Variable-width LZW as GIF specifies it, packed LSB-first into
  // sub-blocks of at most 255 bytes.
  function lzw(indexes, minCodeSize, w) {
    const clear = 1 << minCodeSize;
    const eoi = clear + 1;
    let codeSize = minCodeSize + 1;
    let next = eoi + 1;
    let dict = new Map();
    let bitBuf = 0;
    let bitCount = 0;
    const block = [];

    const flushBlock = () => {
      if (!block.length) return;
      w.byte(block.length);
      w.bytes(block);
      block.length = 0;
    };
    const emit = (code) => {
      bitBuf |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        block.push(bitBuf & 0xFF);
        if (block.length === 255) flushBlock();
        bitBuf >>>= 8;
        bitCount -= 8;
      }
    };

    w.byte(minCodeSize);
    emit(clear);
    let prefix = indexes[0];
    for (let i = 1; i < indexes.length; i++) {
      const k = indexes[i];
      const key = prefix * 4096 + k;
      const found = dict.get(key);
      if (found !== undefined) {
        prefix = found;
        continue;
      }
      emit(prefix);
      if (next < 4096) {
        dict.set(key, next++);
        if (next > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clear);
        dict = new Map();
        codeSize = minCodeSize + 1;
        next = eoi + 1;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (bitCount > 0) { block.push(bitBuf & 0xFF); bitBuf = 0; bitCount = 0; }
    flushBlock();
    w.byte(0);
  }

  function encode(width, height, frames, palette, delays) {
    const w = ByteWriter();
    const size = palette.length;
    let bits = 1;
    while ((1 << bits) < size) bits++;
    const minCodeSize = Math.max(2, bits);

    w.str('GIF89a');
    w.word(width);
    w.word(height);
    w.byte(0x80 | ((bits - 1) << 4) | (bits - 1));   // global colour table
    w.byte(0);                                        // background colour index
    w.byte(0);                                        // pixel aspect ratio
    for (let i = 0; i < (1 << bits); i++) {
      const c = palette[i] || [0, 0, 0];
      w.byte(c[0]); w.byte(c[1]); w.byte(c[2]);
    }
    // Loop forever (NETSCAPE2.0 application extension)
    w.bytes([0x21, 0xFF, 0x0B]);
    w.str('NETSCAPE2.0');
    w.bytes([0x03, 0x01, 0x00, 0x00, 0x00]);

    frames.forEach((idx, f) => {
      const delay = delays[f] != null ? delays[f] : 10;
      w.bytes([0x21, 0xF9, 0x04, 0x04]);   // graphic control: dispose = do not dispose
      w.word(delay);
      w.byte(0);
      w.byte(0);
      w.byte(0x2C);                          // image descriptor
      w.word(0); w.word(0); w.word(width); w.word(height);
      w.byte(0);
      lzw(idx, minCodeSize, w);
    });
    w.byte(0x3B);
    return w.finish();
  }

  // ── Rendering ──────────────────────────────────────────────────
  function palette() {
    const p = [];
    for (let i = 0; i < LEVELS; i++) {
      const t = i / (LEVELS - 1);
      p.push([0, 1, 2].map(c => Math.round(BG[c] + (FG[c] - BG[c]) * t)));
    }
    return p;
  }

  // Wrap on the plain words so every frame breaks its lines in the same
  // places (combining marks add no width, so the base text decides).
  function wrap(ctx, text, maxWidth) {
    const out = [];
    text.split('\n').forEach(para => {
      const words = para.split(/(\s+)/);
      let line = '';
      // A single word wider than the canvas is broken between graphemes.
      const pieces = [];
      words.forEach(word => {
        if (!word.trim() || ctx.measureText(word).width <= maxWidth) { pieces.push(word); return; }
        let chunk = '';
        const gs = (typeof Intl !== 'undefined' && Intl.Segmenter)
          ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), x => x.segment)
          : [...word];
        gs.forEach(g => {
          if (chunk && ctx.measureText(chunk + g).width > maxWidth) { pieces.push(chunk); pieces.push(' '); chunk = ''; }
          chunk += g;
        });
        if (chunk) pieces.push(chunk);
      });
      pieces.forEach(word => {
        const tryLine = line + word;
        if (line && ctx.measureText(tryLine).width > maxWidth && word.trim()) {
          out.push(line.replace(/\s+$/, ''));
          line = word.replace(/^\s+/, '');
        } else {
          line = tryLine;
        }
      });
      out.push(line);
    });
    return out;
  }

  function layout(frames) {
    const probe = document.createElement('canvas').getContext('2d');
    let font = FONT_PX;
    let plan = null;
    for (; font >= MIN_FONT_PX; font -= 4) {
      probe.font = font + 'px ' + FONT_STACK;
      const maxW = MAX_WIDTH - PAD * 2;
      const framesLines = frames.map(f => wrap(probe, f, maxW));
      const lineCount = Math.max(...framesLines.map(l => l.length));
      let width = 0, ascent = font, descent = font * 0.3;
      framesLines.forEach(lines => lines.forEach(line => {
        const m = probe.measureText(line);
        width = Math.max(width, m.width);
        ascent = Math.max(ascent, m.actualBoundingBoxAscent || font);
        descent = Math.max(descent, m.actualBoundingBoxDescent || font * 0.3);
      }));
      const lineGap = font * 1.4;
      const height = ascent + descent + (lineCount - 1) * lineGap;
      plan = { font, framesLines, width, ascent, descent, lineGap, height };
      // Shrink until it fits both ways; a stack taller than the canvas even
      // at the smallest size is cropped at the top (see make()).
      if (width <= maxW && height <= MAX_HEIGHT - PAD * 2) break;
    }
    const w = Math.min(MAX_WIDTH, Math.ceil(plan.width) + PAD * 2);
    const h = Math.min(MAX_HEIGHT, Math.ceil(plan.height) + PAD * 2);
    return Object.assign(plan, { w: Math.max(w, 120), h: Math.max(h, 80) });
  }

  function toIndexes(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    const out = new Uint8Array(w * h);
    const range = (FG[0] - BG[0]) + (FG[1] - BG[1]) + (FG[2] - BG[2]);
    for (let i = 0, p = 0; p < out.length; i += 4, p++) {
      const v = ((data[i] - BG[0]) + (data[i + 1] - BG[1]) + (data[i + 2] - BG[2])) / range;
      out[p] = Math.max(0, Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1))));
    }
    return out;
  }

  const tick = () => new Promise(r => setTimeout(r, 0));

  async function make(frames, opts) {
    const o = opts || {};
    const plan = layout(frames);
    const canvas = document.createElement('canvas');
    canvas.width = plan.w;
    canvas.height = plan.h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const indexed = [];
    const delays = [];
    for (let f = 0; f < frames.length; f++) {
      ctx.fillStyle = 'rgb(' + BG.join(',') + ')';
      ctx.fillRect(0, 0, plan.w, plan.h);
      ctx.fillStyle = 'rgb(' + FG.join(',') + ')';
      ctx.font = plan.font + 'px ' + FONT_STACK;
      ctx.textBaseline = 'alphabetic';
      // Anchor to the bottom: the text always shows, and a stack taller than
      // the canvas runs off the top edge, the way it climbs over a feed.
      const lines = plan.framesLines[f];
      const last = plan.h - PAD - plan.descent;
      lines.forEach((line, i) => ctx.fillText(line, PAD, last - (lines.length - 1 - i) * plan.lineGap));
      indexed.push(toIndexes(ctx, plan.w, plan.h));
      delays.push((o.delay || 12) + (f === frames.length - 1 ? (o.holdLast || 0) : 0));
      await tick();
    }
    const bytes = encode(plan.w, plan.h, indexed, palette(), delays);
    return new Blob([bytes], { type: 'image/gif' });
  }

  window.UTGZalgoGif = { make, encode };
})();
