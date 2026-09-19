/*
 * glyphMetrics.js — the one owner of "where is the ink" for every printables surface.
 *
 * Before this module the engine had no way to ask that question. Every letter on
 * every sheet is an SVG <text> node, and the three things available to place it
 * all measure the FONT rather than the LETTER:
 *
 *   getBBox()                  returns the font's em box. "A" and "a" at
 *                              font-size 132 both report y=25, height=168,
 *                              because that is the ascent-to-descent span and
 *                              has nothing to do with either letter.
 *   dominant-baseline=central  centres that same em box, so a letter with no
 *                              descender is pushed down by half the descender
 *                              space it does not use.
 *   text-anchor=middle         centres the ADVANCE width, including side
 *                              bearings, so "E" lands right of centre.
 *
 * All three are correct implementations of the wrong measurement, and four
 * separate render defects followed from the gap (audit 2026-09-17, see
 * docs/printables/render-defect-registry.md R-002, R-005, R-006, R-010):
 * caps sat 13-15 units low in every tile with the top gap twice the bottom,
 * descenders reached y=239.7 in a 240-unit box, the word viewBox was
 * `chars.length * 118 + 80` so "WMWMWM" clipped 43 units off both ends, and the
 * hand-calibrated stroke overlay missed the glyph on 7 of 12 start dots.
 *
 * The measurement itself is not new here. The engine already measured text with
 * a hidden canvas in two narrow places (addWordStrokeOverlay, wordPNG); this
 * promotes it into the layout path and adds the ink extents those two did not
 * need. Canvas TextMetrics.actualBoundingBox* is exact ink, so nothing has to be
 * rasterised and scanned.
 *
 * Exposes window.UltraTextGen.glyphMetrics:
 *   ink(text, font, size)        {left,right,top,bottom,width,height,advance}
 *                                relative to an origin at the text baseline,
 *                                y NEGATIVE above the baseline.
 *   faceMetrics(font, size)      {capHeight, xHeight, ascender, descender}
 *   centreOffsets(text, font, size, box)  what to add to x/y to optically centre
 *   pathBox(d)                   bbox of an SVG path's own coordinates
 *   strokesBox(strokes)          bbox across a skeleton's stroke list
 *   fitTransform(fromBox, toBox) {scale, tx, ty} mapping one box onto another
 *
 * No dependencies. Load it BEFORE any engine that uses it.
 */
(function () {
  "use strict";
  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  if (UTG.glyphMetrics) return;

  let ctx = null;
  function context() {
    if (!ctx) {
      const c = document.createElement("canvas");
      c.width = 8; c.height = 8;
      ctx = c.getContext("2d");
    }
    return ctx;
  }

  /* Canvas wants "weight size family". Every caller here draws the printable
     faces at 700, which is what the sheets use; a caller needing another weight
     passes it in the font string itself. */
  function fontSpec(font, size, weight) {
    return (weight || 700) + " " + size + "px " + font;
  }

  const inkCache = new Map();

  /* Ink extents relative to the BASELINE origin, y negative upward — the same
     sign convention SVG uses for a <text> at y=baseline, so a caller can add
     these straight onto its own coordinates with no flipping.

     actualBoundingBoxLeft is positive LEFTWARD in the spec, which is the one
     genuinely surprising sign in this API and the reason `left` is negated. */
  function ink(text, font, size, weight) {
    const key = text + "|" + font + "|" + size + "|" + (weight || 700);
    const hit = inkCache.get(key);
    if (hit) return hit;
    const c = context();
    c.font = fontSpec(font, size, weight);
    let m;
    try { m = c.measureText(text); } catch (e) { m = null; }
    if (!m) return null;
    const hasInk = typeof m.actualBoundingBoxAscent === "number" &&
                   typeof m.actualBoundingBoxLeft === "number";
    let out;
    if (hasInk) {
      const left = -m.actualBoundingBoxLeft;
      const right = m.actualBoundingBoxRight;
      const top = -m.actualBoundingBoxAscent;
      const bottom = m.actualBoundingBoxDescent;
      out = {
        left: left, right: right, top: top, bottom: bottom,
        width: right - left, height: bottom - top,
        advance: m.width, exact: true
      };
    } else {
      /* No actualBoundingBox support. Fall back to the advance width and the
         face's own ascent/descent — worse, but never wrong in a way that
         throws. A caller that needs to know can read `exact`. */
      const asc = (typeof m.fontBoundingBoxAscent === "number") ? m.fontBoundingBoxAscent : size * 0.8;
      const desc = (typeof m.fontBoundingBoxDescent === "number") ? m.fontBoundingBoxDescent : size * 0.2;
      out = {
        left: 0, right: m.width, top: -asc, bottom: desc,
        width: m.width, height: asc + desc, advance: m.width, exact: false
      };
    }
    inkCache.set(key, out);
    return out;
  }

  /* Cap height, x-height, ascender and descender measured from probe glyphs
     rather than read from a table, because the sheets swap faces (Quicksand,
     Fredoka, Archivo Black, Baloo 2, Playfair Display) and no table covers them
     all. "H" and "x" are the conventional probes; "b" reaches the ascender and
     "p" the descender in every Latin face here. */
  const faceCache = new Map();
  function faceMetrics(font, size, weight) {
    const key = font + "|" + size + "|" + (weight || 700);
    const hit = faceCache.get(key);
    if (hit) return hit;
    const H = ink("H", font, size, weight);
    const x = ink("x", font, size, weight);
    const b = ink("b", font, size, weight);
    const p = ink("p", font, size, weight);
    if (!H) return null;
    const out = {
      capHeight: -H.top,
      xHeight: x ? -x.top : -H.top * 0.72,
      ascender: b ? -b.top : -H.top,
      descender: p ? p.bottom : size * 0.21,
      exact: H.exact
    };
    faceCache.set(key, out);
    return out;
  }

  /* Where to put a text-anchor=middle <text> so its visible INK, rather than
     its em box and advance width, sits in the middle of `box`.

     Returns { dx, baselineY }:
       dx         add to the anchor x (which the caller keeps at box.w/2)
       baselineY  absolute y for the baseline — NOT an offset

     text-anchor=middle centres the ADVANCE, and the advance includes side
     bearings that are not symmetric, so the ink centre sits off the anchor by
     (inkCentre - advance/2). "E" is +3.45 units right at font-size 210 and "Q"
     is +6.70; both match what the audit measured by rasterising, which is how
     this formula was checked rather than reasoned.

     `opts.shareBaselineWith` takes a string — usually the whole alphabet — and
     centres THAT set's combined ink instead, returning the one baseline every
     member should use. A tiled A-Z sheet needs this: centring each cell's own
     ink independently gives "A" and "g" different baselines and the grid reads
     as jittering. A single big letter on a page wants the default. */
  function centreOffsets(text, font, size, box, weight, opts) {
    const i = ink(text, font, size, weight);
    if (!i) return { dx: 0, baselineY: box.h / 2, ink: null };
    const dx = -((i.left + i.right) / 2 - i.advance / 2);

    const share = opts && opts.shareBaselineWith;
    let top = i.top, bottom = i.bottom;
    if (share) {
      /* Union of the set's extents. Measured per character rather than on the
         whole string, because a string's own ink box is its advance run and
         says nothing about the tallest and deepest members. */
      let t = Infinity, b = -Infinity;
      const chars = Array.from(String(share));
      for (let k = 0; k < chars.length; k++) {
        const ci = ink(chars[k], font, size, weight);
        if (!ci) continue;
        if (ci.top < t) t = ci.top;
        if (ci.bottom > b) b = ci.bottom;
      }
      if (t < Infinity) { top = t; bottom = b; }
    }
    const baselineY = (box.h / 2) - (top + bottom) / 2;
    return { dx: dx, baselineY: baselineY, ink: i };
  }

  /* ---- skeleton geometry -------------------------------------------------

     strokeDirectionData.js holds a centreline skeleton for all 52 letters,
     hand-authored in a 200x240 / font-size-210 box against a generic sans
     ("cap top ~ y 55, baseline ~ y 198-200"). No shipped face actually hits
     those numbers — Quicksand's baseline lands near 205 and Fredoka's near 211
     in that box — so the skeleton has to be fitted to the glyph it annotates
     rather than dropped on top of it. These three functions do that fitting.
     They are pure arithmetic on path strings, no DOM. */

  /* Every coordinate pair in a path's `d`. Good enough for a bbox because the
     skeleton uses only M/L/C, whose control points bound the curve — a cubic
     never leaves its own control hull, so a hull bbox is conservative in the
     safe direction (never too small). */
  function pathPoints(d) {
    const nums = String(d).match(/-?\d*\.?\d+/g);
    if (!nums) return [];
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      pts.push([parseFloat(nums[i]), parseFloat(nums[i + 1])]);
    }
    return pts;
  }

  function boxOf(points) {
    if (!points.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function pathBox(d) { return boxOf(pathPoints(d)); }

  function strokesBox(strokes) {
    let all = [];
    for (let i = 0; i < strokes.length; i++) all = all.concat(pathPoints(strokes[i]));
    return boxOf(all);
  }

  /* Uniform scale + translate mapping `fromBox` onto `toBox`, centred.

     Uniform on purpose: the skeleton and the glyph are the same letter but not
     the same typeface, so their aspect ratios differ slightly. Stretching to
     fill both axes would skew the letterform — an "o" drawn as an ellipse the
     font never had. Fitting uniformly and centring keeps the skeleton's shape
     and accepts a small margin on one axis, which is the error that does not
     look wrong. */
  function fitTransform(fromBox, toBox) {
    if (!fromBox || !toBox || !fromBox.w || !fromBox.h) return { scale: 1, tx: 0, ty: 0 };
    const s = Math.min(toBox.w / fromBox.w, toBox.h / fromBox.h);
    const tx = toBox.x + (toBox.w - fromBox.w * s) / 2 - fromBox.x * s;
    const ty = toBox.y + (toBox.h - fromBox.h * s) / 2 - fromBox.y * s;
    return { scale: s, tx: tx, ty: ty };
  }

  /* Cheap invalidation hook: webfonts arrive after first paint, and a metric
     measured against the fallback face is wrong for every caller that cached
     it. The engine calls this once document.fonts.ready settles. */
  function reset() { inkCache.clear(); faceCache.clear(); }

  UTG.glyphMetrics = {
    ink: ink,
    faceMetrics: faceMetrics,
    centreOffsets: centreOffsets,
    pathBox: pathBox,
    strokesBox: strokesBox,
    fitTransform: fitTransform,
    reset: reset
  };
})();
