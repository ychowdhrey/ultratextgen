/* UltraTextGen — stencil bridges.
   ------------------------------------------------------------------
   Why this file exists: /printables/block-letters/ is titled "Block Letters &
   Letter Stencils", its how-to step 2 says "cut along the border for a
   reusable stencil", and cutting along the border of an A, B, D, O, P, Q, R,
   0, 4, 6, 8 or 9 drops the counter on the floor. Twelve of its thirty-six
   characters could not be made into the thing the page is named after.

   A bridge is the strip of material a real stencil leaves uncut so the island
   inside a letter stays attached. This file finds where those strips have to
   go, from the glyph itself rather than from a hand-tuned table: a per-letter
   table would be tuned to one typeface and silently wrong for the next, and
   this engine already lets a page choose its own face.

   The algorithm is deliberately plain, and pure -- it takes a bitmap and
   returns rectangles, so it can be tested without a browser (see
   stencil.test.js):

     1. flood the paper inward from the border. What it reaches is OUTSIDE.
     2. paper it never reaches is an enclosed counter. Label each one.
     3. for each counter, walk out from its centre in the four axis
        directions, counting the ink crossed before reaching OUTSIDE. The
        shortest crossing is the thinnest wall, and that is where a bridge
        costs the letter least.

   A walk that reaches another counter, or paper that is neither counter nor
   outside, is discarded rather than bridged: that is a second island behind
   the first, and cutting through it would sever the wrong thing.

   Diagonal walls (the apex of an A, the bowl of a 4) are crossed by an
   axis-aligned walk at more than their true thickness. That is accepted on
   purpose -- it errs toward a slightly wider bridge, which is the safe
   direction for something that is about to be cut with scissors. */
(function () {
  "use strict";
  const ns = (typeof window !== "undefined" ? window : globalThis).UltraTextGen =
    (typeof window !== "undefined" ? window : globalThis).UltraTextGen || {};

  const OUTSIDE = 1;
  const COUNTER = 2;

  /* mask: Uint8Array(w*h), non-zero = ink. Returns
     [{ x, y, w, h, vertical }] in mask pixels: the rectangle that must stay
     uncut, already padded by opts.pad on the crossing axis so it covers the
     outline stroke on both sides of the wall. */
  function findBridges(mask, w, h, opts) {
    const o = opts || {};
    const minArea = o.minArea != null ? o.minArea : Math.max(12, Math.round(w * h * 0.0015));
    const width = o.width != null ? o.width : Math.max(3, Math.round(Math.min(w, h) * 0.07));
    const pad = o.pad != null ? o.pad : 0;
    const region = new Uint8Array(w * h);

    const stack = [];
    const seed = (x, y) => {
      const i = y * w + x;
      if (mask[i] || region[i]) return;
      region[i] = OUTSIDE;
      stack.push(i);
    };
    for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
    for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0) seed(x - 1, y);
      if (x < w - 1) seed(x + 1, y);
      if (y > 0) seed(x, y - 1);
      if (y < h - 1) seed(x, y + 1);
    }

    // Label every counter BEFORE measuring any wall: a walk out of counter A
    // has to be able to recognise counter B as an island rather than as
    // ordinary paper, and it cannot if B has not been marked yet.
    const comps = [];
    const seen = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (mask[i] || region[i] || seen[i]) continue;
      const comp = [];
      const q = [i];
      seen[i] = 1;
      while (q.length) {
        const j = q.pop();
        comp.push(j);
        const x = j % w;
        const y = (j - x) / w;
        const nb = [];
        if (x > 0) nb.push(j - 1);
        if (x < w - 1) nb.push(j + 1);
        if (y > 0) nb.push(j - w);
        if (y < h - 1) nb.push(j + w);
        for (let n = 0; n < nb.length; n++) {
          const k = nb[n];
          if (!mask[k] && !region[k] && !seen[k]) { seen[k] = 1; q.push(k); }
        }
      }
      if (comp.length < minArea) continue;
      for (let n = 0; n < comp.length; n++) region[comp[n]] = COUNTER;
      comps.push(comp);
    }

    const out = [];
    const member = new Uint8Array(w * h);
    for (let c = 0; c < comps.length; c++) {
      const comp = comps[c];
      /* Membership in THIS component, not merely "is some counter". A
         concentric pair (the outer ring of a stencilled frame around an inner
         hole) puts one counter's centroid inside the OTHER counter, and a
         value test reads that as "the centroid is fine" and then walks out of
         the wrong region. Measured: it returned no bridge at all. */
      member.fill(0);
      for (let n = 0; n < comp.length; n++) member[comp[n]] = 1;
      const b = wallFor(comp, member, mask, region, w, h);
      if (!b) continue;
      if (b.vertical) {
        out.push({ x: b.mid - Math.floor(width / 2), y: b.from - pad,
                   w: width, h: (b.to - b.from) + pad * 2, vertical: true });
      } else {
        out.push({ x: b.from - pad, y: b.mid - Math.floor(width / 2),
                   w: (b.to - b.from) + pad * 2, h: width, vertical: false });
      }
    }
    return out;
  }

  /* The thinnest axis-aligned wall between one counter and the outside.
     Returns { from, to, mid, vertical } in mask pixels, or null when no
     direction reaches the outside cleanly. */
  function wallFor(comp, member, mask, region, w, h) {
    let sx = 0, sy = 0;
    for (let n = 0; n < comp.length; n++) {
      const j = comp[n];
      const x = j % w;
      sx += x;
      sy += (j - x) / w;
    }
    let cx = Math.round(sx / comp.length);
    let cy = Math.round(sy / comp.length);
    // A crescent counter (the bowl of a 6, a tight R) can have its centroid
    // outside itself, so fall back to the member pixel nearest to it rather
    // than walking from a point that is not in the region at all.
    if (!member[cy * w + cx]) {
      let best = Infinity, bj = comp[0];
      for (let n = 0; n < comp.length; n++) {
        const j = comp[n];
        const x = j % w;
        const y = (j - x) / w;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d < best) { best = d; bj = j; }
      }
      cx = bj % w;
      cy = (bj - cx) / w;
    }

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let best = null;
    for (let d = 0; d < dirs.length; d++) {
      const dx = dirs[d][0], dy = dirs[d][1];
      let x = cx, y = cy;
      // leave the counter
      while (x >= 0 && x < w && y >= 0 && y < h && member[y * w + x]) { x += dx; y += dy; }
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      if (!mask[y * w + x]) continue;           // counter touching paper that is not ink: not enclosed
      const startX = x, startY = y;
      let run = 0;
      while (x >= 0 && x < w && y >= 0 && y < h && mask[y * w + x]) { x += dx; y += dy; run++; }
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      if (region[y * w + x] !== OUTSIDE) continue;   // another island behind this wall
      if (!best || run < best.run) {
        const vertical = dy !== 0;
        const step = vertical ? dy : dx;
        const first = vertical ? startY : startX;   // the first INK pixel
        const past = vertical ? y : x;              // the first OUTSIDE pixel
        /* Walking in a negative direction, the ink lies at past+1 .. first,
           not at past .. first-1. A min/max of the two endpoints covers the
           outside pixel and leaves the last ink pixel standing, which seals
           the counter shut by one pixel -- so a left-hand or upward wall got
           a bridge that did not connect. Measured: 6 8 9 B Q R all still had
           an enclosed region after their bridges were cut. */
        const from = step > 0 ? first : past + 1;
        const to = step > 0 ? past : first + 1;
        best = { run: run, from: from, to: to, mid: vertical ? cx : cy, vertical: vertical };
      }
    }
    return best;
  }

  ns.stencil = { findBridges: findBridges, OUTSIDE: OUTSIDE, COUNTER: COUNTER };
})();
