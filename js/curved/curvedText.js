/* ==========================================================================
   UltraTextGen — curvedText.js
   Pure SVG shape-registry text builder. No DOM dependencies beyond returning
   markup, so it can be unit-tested in isolation and reused anywhere.

   Pairs with the vertical-text module: same "one feature, one self-contained
   module" pattern. Output is an <svg> string (not copy-paste plain text),
   because curved/shaped layout can only be expressed visually.

   Architecture: every named shape is a `layout(params)` function registered
   in SHAPES. Most shapes are `mode: "path"` — they hand back one SVG <path>
   "d" string per input line (the caller drives a <textPath> along each), and
   support multiple lines via a family-appropriate stacking rule (concentric
   rings for the circular family, parallel offset for the flow family).
   `mode: "glyph"` shapes (fan, twist) can't be expressed as text-on-one-path,
   so they hand back one {x,y,rotation} per grapheme instead, rendered as
   individually positioned/rotated <text> elements.

   Exposes: window.UltraCurvedText.build(options) -> { svg, width, height }
            window.UltraCurvedText.SHAPES  (for populating a shape picker UI)
            window.UltraCurvedText.FAMILY_LABELS
   ========================================================================== */

(function () {
  "use strict";

  let XML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return XML_ESCAPE[c]; });
  }

  // Deterministic id so re-renders with the same inputs are stable and two
  // SVGs on one page never collide. (No Math.random — keeps output pure.)
  let idSeq = 0;
  function nextId() { idSeq += 1; return "utg-arc-" + idSeq; }

  function num(v, fallback) {
    let n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  // Grapheme-safe splitting for glyph-mode shapes (emoji/combining marks stay
  // intact as one "character"), matching the Intl.Segmenter convention the
  // flair engine already uses elsewhere in this codebase.
  let segmenter = (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function")
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
  function toGraphemes(str) {
    if (!str) return [];
    if (segmenter) {
      let out = [];
      let iter = segmenter.segment(str)[Symbol.iterator]();
      let next = iter.next();
      while (!next.done) {
        out.push(next.value.segment);
        next = iter.next();
      }
      return out;
    }
    return str.split("");
  }

  /* ------------------------------------------------------------------------
     Path-mode shapes.
     Each layout(params) receives:
       { lines: string[], fontSize: number, letterSpacing: number,
         intensity: number (0..1, 1 = most pronounced), lineGap: number }
     and returns:
       { paths: [ { d, startOffset, textAnchor } ... ] (one per line),
         width: number, height: number }
     ------------------------------------------------------------------------ */

  // Circular family — concentric stacking (same center, shrinking radius).
  // baseRadius formula preserves the original single-shape 40 (tight) .. 420
  // (flat) range so `intensity` is exactly the old 0-100 curve-amount slider
  // fraction, unchanged.

  function layout_arch(params) {
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let lineGap = params.lineGap;
    let lines = params.lines;
    let baseRadius = 40 + (1 - intensity) * 380;
    let pad = fontSize;
    let cx = pad + baseRadius;
    let cy = pad + fontSize + baseRadius;
    let width = 2 * (pad + baseRadius);
    let height = pad + fontSize + baseRadius + pad;
    let paths = lines.map(function (line, i) {
      let r = Math.max(20, baseRadius - i * lineGap);
      let d = "M " + (cx - r) + " " + cy + " A " + r + " " + r + " 0 0 1 " + (cx + r) + " " + cy;
      return { d: d, startOffset: "50%", textAnchor: "middle" };
    });
    return { paths: paths, width: width, height: height };
  }

  function layout_valley(params) {
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let lineGap = params.lineGap;
    let lines = params.lines;
    let baseRadius = 40 + (1 - intensity) * 380;
    let pad = fontSize;
    let cx = pad + baseRadius;
    let cy = pad;
    let width = 2 * (pad + baseRadius);
    let height = pad + baseRadius + fontSize + pad;
    let paths = lines.map(function (line, i) {
      let r = Math.max(20, baseRadius - i * lineGap);
      let d = "M " + (cx - r) + " " + cy + " A " + r + " " + r + " 0 0 0 " + (cx + r) + " " + cy;
      return { d: d, startOffset: "50%", textAnchor: "middle" };
    });
    return { paths: paths, width: width, height: height };
  }

  function layout_circle(params) {
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let lineGap = params.lineGap;
    let lines = params.lines;
    let baseRadius = 40 + (1 - intensity) * 380;
    let pad = fontSize;
    let cx = pad + fontSize + baseRadius;
    let cy = pad + fontSize + baseRadius;
    let width = 2 * (pad + fontSize + baseRadius);
    let height = width;
    let paths = lines.map(function (line, i) {
      let r = Math.max(20, baseRadius - i * lineGap);
      let d =
        "M " + cx + " " + (cy + r) +
        " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy - r) +
        " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy + r) + " Z";
      return { d: d, startOffset: "50%", textAnchor: "middle" };
    });
    return { paths: paths, width: width, height: height };
  }

  // circle-in / oval contributed against the same "circular / concentric"
  // contract as arch/valley/circle above (circle-in's radius range aligned to
  // the same 40..420 span for a consistent feel across the family).
  function layout_circleIn(params) {
    let lines = params.lines;
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    let baseRadius = 40 + (1 - intensity) * 380;

    let pad = fontSize;
    let cx = pad + fontSize + baseRadius;
    let cy = pad + fontSize + baseRadius;
    let width = 2 * (pad + fontSize + baseRadius);
    let height = width;

    let paths = lines.map(function (line, i) {
      let r = Math.max(20, baseRadius - i * lineGap);
      // Same full-circle path as the outward "circle" shape but with both
      // sweep flags flipped (1 -> 0), which reverses the path's direction of
      // travel and moves the rendered text to the inner side of the ring,
      // upright, with baselines curving toward the center.
      let d =
        "M " + cx + " " + (cy + r) +
        " A " + r + " " + r + " 0 1 0 " + cx + " " + (cy - r) +
        " A " + r + " " + r + " 0 1 0 " + cx + " " + (cy + r) + " Z";
      return { d: d, startOffset: "50%", textAnchor: "middle" };
    });

    return { paths: paths, width: width, height: height };
  }

  function layout_oval(params) {
    let lines = params.lines;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    let estCharWidth = fontSize * 0.62 + letterSpacing;
    let longestLineLen = Math.max(1, lines.reduce(function (max, line) {
      return Math.max(max, line.length);
    }, 1));
    let estLineWidth0 = longestLineLen * estCharWidth;

    // Outer horizontal radius: sized to comfortably fit the LONGEST line's estimated
    // width (not just line 0) so a longer second/third line never overflows its ring.
    let rx0 = Math.max(80, estLineWidth0 * 0.55);
    // Outer vertical radius: intensity 0 -> near-circular arch (ry ~= rx), intensity 1 ->
    // a wide, shallow oval (ry ~= 0.25 * rx).
    let ry0 = Math.max(14, rx0 * (1 - intensity * 0.75));
    let aspect = ry0 / rx0;

    let pad = fontSize;
    let cx = pad + fontSize + rx0;
    let cy = pad + fontSize + ry0;
    let width = 2 * (pad + fontSize + rx0);
    let height = cy + fontSize + pad;

    let paths = lines.map(function (line, i) {
      // Concentric shrink: each subsequent line uses a smaller oval, same aspect ratio,
      // sharing the same center point as line 0.
      let rx = Math.max(20, rx0 - i * lineGap);
      let ry = Math.max(10, rx * aspect);
      let d =
        "M " + (cx - rx) + " " + cy +
        " A " + rx + " " + ry + " 0 0 1 " + (cx + rx) + " " + cy;
      return { d: d, startOffset: "50%", textAnchor: "middle" };
    });

    return { paths: paths, width: width, height: height };
  }

  // Flow family — parallel stacking (each line is the same curve translated
  // straight down by lineGap). Contributed as-is against the shared contract.

  function layout_wave(params) {
    let lines = params.lines;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    function r2(n) { return Math.round(n * 100) / 100; }

    let estCharWidth = fontSize * 0.62 + letterSpacing;
    let longest = 0;
    for (let i = 0; i < lines.length; i++) {
      let w = Math.max(1, lines[i].length) * estCharWidth;
      if (w > longest) longest = w;
    }

    let amplitude = 6 + intensity * 34; // single hump-then-dip swing
    let pad = fontSize;
    let ampRoom = amplitude + fontSize; // amplitude swing + glyph ascender/descender room
    let spanWidth = longest;
    let width = pad * 2 + spanWidth;
    let height = pad * 2 + ampRoom * 2 + (lines.length - 1) * lineGap;

    let x0 = pad;
    let x1 = pad + spanWidth;
    let xMid = pad + spanWidth / 2;
    let span1 = spanWidth / 2;
    let span2 = spanWidth / 2;
    let ybBase = pad + ampRoom; // baseline y for line 0

    let paths = [];
    for (let li = 0; li < lines.length; li++) {
      let yb = ybBase + li * lineGap; // parallel translation for stacked lines
      let d = "M " + r2(x0) + " " + r2(yb) +
        " C " + r2(x0 + span1 / 3) + " " + r2(yb - amplitude) + " " + r2(x0 + 2 * span1 / 3) + " " + r2(yb - amplitude) + " " + r2(xMid) + " " + r2(yb) +
        " C " + r2(xMid + span2 / 3) + " " + r2(yb + amplitude) + " " + r2(xMid + 2 * span2 / 3) + " " + r2(yb + amplitude) + " " + r2(x1) + " " + r2(yb);
      paths.push({ d: d, startOffset: "50%", textAnchor: "middle" });
    }

    return { paths: paths, width: width, height: height };
  }

  function layout_ripple(params) {
    let lines = params.lines;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    function r2(n) { return Math.round(n * 100) / 100; }

    let estCharWidth = fontSize * 0.62 + letterSpacing;
    let longest = 0;
    for (let i = 0; i < lines.length; i++) {
      let w = Math.max(1, lines[i].length) * estCharWidth;
      if (w > longest) longest = w;
    }

    let periods = 2 + Math.round(intensity * 2); // 2..4 repeated sine periods, more intensity = more/tighter ripples
    let amplitude = 4 + intensity * 22; // shallower swing than "wave"
    let pad = fontSize;
    let ampRoom = amplitude + fontSize;
    let spanWidth = longest;
    let width = pad * 2 + spanWidth;
    let height = pad * 2 + ampRoom * 2 + (lines.length - 1) * lineGap;

    let x0 = pad;
    let ybBase = pad + ampRoom;
    let periodWidth = spanWidth / periods;
    let half = periodWidth / 2;

    let paths = [];
    for (let li = 0; li < lines.length; li++) {
      let yb = ybBase + li * lineGap; // parallel translation for stacked lines
      let d = "M " + r2(x0) + " " + r2(yb);
      let cx = x0;
      for (let p = 0; p < periods; p++) {
        let xMid = cx + half;
        let xEnd = cx + periodWidth;
        d += " C " + r2(cx + half / 3) + " " + r2(yb - amplitude) + " " + r2(cx + 2 * half / 3) + " " + r2(yb - amplitude) + " " + r2(xMid) + " " + r2(yb);
        d += " C " + r2(xMid + half / 3) + " " + r2(yb + amplitude) + " " + r2(xMid + 2 * half / 3) + " " + r2(yb + amplitude) + " " + r2(xEnd) + " " + r2(yb);
        cx = xEnd;
      }
      paths.push({ d: d, startOffset: "50%", textAnchor: "middle" });
    }

    return { paths: paths, width: width, height: height };
  }

  function layout_zigzag(params) {
    let lines = params.lines;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    function r2(n) { return Math.round(n * 100) / 100; }

    let estCharWidth = fontSize * 0.62 + letterSpacing;
    let longest = 0;
    for (let i = 0; i < lines.length; i++) {
      let w = Math.max(1, lines[i].length) * estCharWidth;
      if (w > longest) longest = w;
    }

    let peaks = 3 + Math.round(intensity * 5); // 3..8 sharp up/down repeats
    let amplitude = 8 + intensity * 28;
    let pad = fontSize;
    let ampRoom = amplitude + fontSize;
    let spanWidth = longest;
    let width = pad * 2 + spanWidth;
    let height = pad * 2 + ampRoom * 2 + (lines.length - 1) * lineGap;

    let x0 = pad;
    let ybBase = pad + ampRoom;
    let segments = peaks * 2;
    let segWidth = spanWidth / segments;

    let paths = [];
    for (let li = 0; li < lines.length; li++) {
      let yb = ybBase + li * lineGap; // parallel translation for stacked lines
      let d = "M " + r2(x0) + " " + r2(yb);
      for (let s = 1; s <= segments; s++) {
        let x = x0 + s * segWidth;
        let y = (s % 2 === 1) ? (yb - amplitude) : (yb + amplitude);
        d += " L " + r2(x) + " " + r2(y);
      }
      paths.push({ d: d, startOffset: "50%", textAnchor: "middle" });
    }

    return { paths: paths, width: width, height: height };
  }

  function layout_spiral(params) {
    let lines = params.lines;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;

    function r2(n) { return Math.round(n * 100) / 100; }

    let estCharWidth = fontSize * 0.62 + letterSpacing;

    let turns = 1.5 + intensity * 2.5; // more intensity = more turns = visually tighter coil
    let thetaMax = turns * 2 * Math.PI;
    let pitch = fontSize * 0.95; // radial growth per full turn, keeps successive rings from overlapping glyphs
    let rMin = Math.max(fontSize * 1.3, estCharWidth * 0.5); // clamp so innermost text doesn't overlap itself
    let rMax = rMin + pitch * turns;
    let spiralSpan = rMax - rMin; // radial thickness of one full spiral track

    let pad = fontSize;
    // Multi-line choice: rather than nesting a second full spiral inside the first (visually messy) or
    // rotating its start angle on the same track (can still cross), give each extra line its own spiral
    // track offset radially just outside the previous one's outer edge, so tracks never overlap.
    let lineOffset = spiralSpan + fontSize * 0.4;
    let maxOuterRadius = rMax + (lines.length - 1) * lineOffset;
    let size = (maxOuterRadius + pad) * 2;
    let cx = maxOuterRadius + pad;
    let cy = maxOuterRadius + pad;

    let samples = 72;

    let paths = [];
    for (let li = 0; li < lines.length; li++) {
      let rMinLine = rMin + li * lineOffset;
      let rMaxLine = rMax + li * lineOffset;
      let d = "";
      for (let s = 0; s <= samples; s++) {
        let theta = (s / samples) * thetaMax;
        let rad = rMinLine + (rMaxLine - rMinLine) * (theta / thetaMax);
        let x = cx + rad * Math.cos(theta);
        let y = cy + rad * Math.sin(theta);
        d += (s === 0 ? "M " : " L ") + r2(x) + " " + r2(y);
      }
      paths.push({ d: d, startOffset: "50%", textAnchor: "middle" });
    }

    return { paths: paths, width: size, height: size };
  }

  // Geometric family — single-outline decorative shapes, one line only
  // (maxLines enforced by the SHAPES table / build() below).

  function layout_heart(params) {
    // Classic two-lobed heart curve: 4 cubic Beziers on a 100-unit template (top notch at (50,15),
    // bottom point at (50,95)), scaled by k = s/50 where s = 24 + intensity*90. Path starts at the
    // top-center notch, so startOffset "0%" begins the text right there.
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let s = 24 + intensity * 90;
    let k = s / 50;
    let pad = fontSize;
    function fx(tx) { return pad + tx * k; }
    function fy(ty) { return pad + (ty + 5) * k; }
    let pathD =
      "M " + fx(50) + " " + fy(15) +
      " C " + fx(35) + " " + fy(-5) + ", " + fx(0) + " " + fy(10) + ", " + fx(0) + " " + fy(40) +
      " C " + fx(0) + " " + fy(60) + ", " + fx(25) + " " + fy(80) + ", " + fx(50) + " " + fy(95) +
      " C " + fx(75) + " " + fy(80) + ", " + fx(100) + " " + fy(60) + ", " + fx(100) + " " + fy(40) +
      " C " + fx(100) + " " + fy(10) + ", " + fx(65) + " " + fy(-5) + ", " + fx(50) + " " + fy(15) +
      " Z";
    let width = pad * 2 + 100 * k;
    let height = pad * 2 + 100 * k;
    return {
      paths: [{ d: pathD, startOffset: "0%", textAnchor: "start" }],
      width: width,
      height: height
    };
  }

  function layout_star(params) {
    // 5-point star: 10 vertices alternating outer/inner radius, 36 degrees apart, starting at the
    // top outer point (angle -90deg) so startOffset "0%" begins the text there.
    // outerR = 24 + intensity*90; innerR = outerR*0.45 (classic 5-point star proportion).
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let outerR = 24 + intensity * 90;
    let innerR = outerR * 0.45;
    let pad = fontSize;
    let cx = pad + outerR;
    let cy = pad + outerR;
    let points = [];
    for (let i = 0; i < 10; i++) {
      let r = i % 2 === 0 ? outerR : innerR;
      let angle = (-90 + i * 36) * (Math.PI / 180);
      let x = cx + r * Math.cos(angle);
      let y = cy + r * Math.sin(angle);
      points.push(x + " " + y);
    }
    let pathD = "M " + points[0] + " L " + points.slice(1).join(" L ") + " Z";
    let width = 2 * (pad + outerR);
    let height = width;
    return {
      paths: [{ d: pathD, startOffset: "0%", textAnchor: "start" }],
      width: width,
      height: height
    };
  }

  function layout_diamond(params) {
    // Simple rhombus: top/right/bottom/left vertices, starting at the top vertex.
    // halfW = 24 + intensity*90; halfH = halfW*1.3 for classic taller-than-wide diamond proportions.
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let halfW = 24 + intensity * 90;
    let halfH = halfW * 1.3;
    let pad = fontSize;
    let cx = pad + halfW;
    let cy = pad + halfH;
    let top = cx + " " + (cy - halfH);
    let right = (cx + halfW) + " " + cy;
    let bottom = cx + " " + (cy + halfH);
    let left = (cx - halfW) + " " + cy;
    let pathD = "M " + top + " L " + right + " L " + bottom + " L " + left + " Z";
    let width = 2 * (pad + halfW);
    let height = 2 * (pad + halfH);
    return {
      paths: [{ d: pathD, startOffset: "0%", textAnchor: "start" }],
      width: width,
      height: height
    };
  }

  function layout_bulge(params) {
    // Open lens/eye "bulge": a single cubic Bezier hump from a left baseline point to a right
    // baseline point. base = 24 + intensity*90; totalWidth = base*2.4 (wide); amp = base*0.75 is the
    // peak height above baseline. Control points are offset by h = amp*4/3 so the Bezier's t=0.5
    // point (peak) lands exactly `amp` above the baseline. startOffset "50%" centers text on the peak.
    let fontSize = params.fontSize;
    let intensity = params.intensity;
    let base = 24 + intensity * 90;
    let totalWidth = base * 2.4;
    let amp = base * 0.75;
    let h = amp * (4 / 3);
    let pad = fontSize;
    let x0 = pad;
    let x1 = pad + totalWidth;
    let y0 = pad + amp;
    let cp1x = x0 + totalWidth * 0.15;
    let cp2x = x1 - totalWidth * 0.15;
    let cpy = y0 - h;
    let pathD =
      "M " + x0 + " " + y0 +
      " C " + cp1x + " " + cpy + ", " + cp2x + " " + cpy + ", " + x1 + " " + y0;
    let width = totalWidth + 2 * pad;
    let height = amp + 2 * pad;
    return {
      paths: [{ d: pathD, startOffset: "50%", textAnchor: "middle" }],
      width: width,
      height: height
    };
  }

  /* ------------------------------------------------------------------------
     Glyph-mode shapes.
     Each layout(params) receives:
       { graphemesPerLine: string[][], fontSize: number, letterSpacing: number,
         intensity: number (0..1), lineGap: number }
     and returns:
       { lines: [ { glyphs: [ {ch, x, y, rotation} ... ] } ... ],
         width: number, height: number }
     ------------------------------------------------------------------------ */

  function layout_fan(params) {
    let graphemesPerLine = params.graphemesPerLine;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    let advance = fontSize * 0.62 + letterSpacing;
    let radius = 260 - intensity * 160 + letterSpacing * 2;

    let rawLines = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let li = 0; li < graphemesPerLine.length; li++) {
      let glyphsSrc = graphemesPerLine[li];
      let n = glyphsSrc.length;
      let rawGlyphs = [];
      let lineOffsetY = li * lineGap;

      if (n > 0) {
        let sweepDeg = Math.min(140, n * (4 + intensity * 10) + letterSpacing * 0.5);
        let angleStep = n > 1 ? sweepDeg / (n - 1) : 0;
        let startAngle = -sweepDeg / 2;

        for (let i = 0; i < n; i++) {
          let thetaDeg = n > 1 ? startAngle + i * angleStep : 0;
          let thetaRad = (thetaDeg * Math.PI) / 180;
          let x = radius * Math.sin(thetaRad);
          let y = -radius * Math.cos(thetaRad) + lineOffsetY;

          rawGlyphs.push({ ch: glyphsSrc[i], x: x, y: y, rotation: thetaDeg });

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      rawLines.push(rawGlyphs);
    }

    if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; }

    let margin = Math.max(fontSize * 1.5, advance);
    let shiftX = margin - minX;
    let shiftY = margin - minY;

    let lines = rawLines.map(function (rawGlyphs) {
      return {
        glyphs: rawGlyphs.map(function (g) {
          return { ch: g.ch, x: g.x + shiftX, y: g.y + shiftY, rotation: g.rotation };
        })
      };
    });

    let width = maxX - minX + margin * 2;
    let height = maxY - minY + margin * 2;

    return { lines: lines, width: width, height: height };
  }

  function layout_twist(params) {
    let graphemesPerLine = params.graphemesPerLine;
    let fontSize = params.fontSize;
    let letterSpacing = params.letterSpacing;
    let intensity = params.intensity;
    let lineGap = params.lineGap;

    let advance = fontSize * 0.62 + letterSpacing;
    let angle = 6 + intensity * 24;

    let rawLines = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let li = 0; li < graphemesPerLine.length; li++) {
      let glyphsSrc = graphemesPerLine[li];
      let n = glyphsSrc.length;
      let rawGlyphs = [];
      let lineOffsetY = li * lineGap;

      if (n > 0) {
        let totalWidth = (n - 1) * advance;
        let startX = -totalWidth / 2;

        for (let i = 0; i < n; i++) {
          let x = startX + i * advance;
          let wobble = Math.sin(i * 1.3) * (2 + intensity * 6);
          let y = lineOffsetY + wobble;
          let rotation = i % 2 === 0 ? angle : -angle;

          rawGlyphs.push({ ch: glyphsSrc[i], x: x, y: y, rotation: rotation });

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      rawLines.push(rawGlyphs);
    }

    if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; }

    let margin = Math.max(fontSize * 1.2, advance);
    let shiftX = margin - minX;
    let shiftY = margin - minY;

    let lines = rawLines.map(function (rawGlyphs) {
      return {
        glyphs: rawGlyphs.map(function (g) {
          return { ch: g.ch, x: g.x + shiftX, y: g.y + shiftY, rotation: g.rotation };
        })
      };
    });

    let width = maxX - minX + margin * 2;
    let height = maxY - minY + margin * 2;

    return { lines: lines, width: width, height: height };
  }

  /* ------------------------------------------------------------------------
     Registry
     ------------------------------------------------------------------------ */

  let SHAPES = [
    { key: "arch", label: "Arch (∩)", family: "circular", mode: "path", maxLines: 4, layout: layout_arch },
    { key: "valley", label: "Valley (∪)", family: "circular", mode: "path", maxLines: 4, layout: layout_valley },
    { key: "circle", label: "Circle – outside (○)", family: "circular", mode: "path", maxLines: 4, layout: layout_circle },
    { key: "circle-in", label: "Circle – inside (◐)", family: "circular", mode: "path", maxLines: 4, layout: layout_circleIn },
    { key: "oval", label: "Oval (⬭)", family: "circular", mode: "path", maxLines: 4, layout: layout_oval },
    { key: "wave", label: "Wave (∿)", family: "flow", mode: "path", maxLines: 4, layout: layout_wave },
    { key: "ripple", label: "Ripple (≈)", family: "flow", mode: "path", maxLines: 4, layout: layout_ripple },
    { key: "zigzag", label: "Zigzag (⚡)", family: "flow", mode: "path", maxLines: 4, layout: layout_zigzag },
    { key: "spiral", label: "Spiral (@)", family: "flow", mode: "path", maxLines: 2, layout: layout_spiral },
    { key: "heart", label: "Heart (♡)", family: "geometric", mode: "path", maxLines: 1, layout: layout_heart },
    { key: "star", label: "Star (★)", family: "geometric", mode: "path", maxLines: 1, layout: layout_star },
    { key: "diamond", label: "Diamond (◆)", family: "geometric", mode: "path", maxLines: 1, layout: layout_diamond },
    { key: "bulge", label: "Bulge", family: "geometric", mode: "path", maxLines: 1, layout: layout_bulge },
    { key: "fan", label: "Fan", family: "novelty", mode: "glyph", maxLines: 3, layout: layout_fan },
    { key: "twist", label: "Twist", family: "novelty", mode: "glyph", maxLines: 3, layout: layout_twist }
  ];

  let FAMILY_LABELS = { circular: "Circular", flow: "Flow", geometric: "Geometric", novelty: "Novelty" };

  // Back-compat for the pre-existing "direction" option values.
  let SHAPE_ALIASES = { up: "arch", down: "valley" };

  function findShape(key) {
    let k = SHAPE_ALIASES[key] || key || "arch";
    for (let i = 0; i < SHAPES.length; i++) {
      if (SHAPES[i].key === k) return SHAPES[i];
    }
    return SHAPES[0];
  }

  /* Build the curved-text SVG.
     options:
       text          {string}  the (already Unicode-transformed) text. "\n" splits into
                                multiple curved/stacked lines, up to the shape's maxLines.
       shape         {string}  a SHAPES[].key (default 'arch'). `direction` ('up'|'down'|'circle')
                                is still accepted for back-compat.
       intensity     {number}  0..1, how pronounced the shape is (default derived from `radius`)
       radius        {number}  legacy px control (40..420); used only if `intensity` is absent
       fontSize      {number}  px (default 32)
       fontFamily    {string}  CSS font-family (default sans-serif)
       fontWeight    {'normal'|'bold'} (default 'normal')
       fill          {string}  text color (default '#111111')
       letterSpacing {number}  px (default 0)
  */
  function build(options) {
    let o = options || {};
    let rawText = (o.text == null ? "" : String(o.text));
    let shape = findShape(o.shape || o.direction);
    let fs = Math.max(8, num(o.fontSize, 32));
    let fontFamily = o.fontFamily || "system-ui, sans-serif";
    let weight = o.fontWeight === "bold" ? "bold" : "normal";
    let fill = o.fill || "#111111";
    let spacing = num(o.letterSpacing, 0);

    let intensity;
    if (o.intensity != null) {
      intensity = Math.max(0, Math.min(1, num(o.intensity, 0.55)));
    } else {
      let legacyRadius = Math.max(20, num(o.radius, 211));
      intensity = Math.max(0, Math.min(1, (420 - legacyRadius) / 380));
    }

    let lines = rawText.split("\n");
    if (lines.length > shape.maxLines) lines = lines.slice(0, shape.maxLines);
    if (lines.length === 0) lines = [""];

    let lineGap = fs * 1.2;
    let svgBody, width, height;

    if (shape.mode === "glyph") {
      let graphemesPerLine = lines.map(toGraphemes);
      let glyphResult = shape.layout({
        graphemesPerLine: graphemesPerLine,
        fontSize: fs,
        letterSpacing: spacing,
        intensity: intensity,
        lineGap: lineGap
      });
      width = glyphResult.width;
      height = glyphResult.height;
      let glyphMarkup = "";
      glyphResult.lines.forEach(function (lineResult) {
        lineResult.glyphs.forEach(function (g) {
          let rot = g.rotation || 0;
          let transformAttr = rot ? ' transform="rotate(' + rot + " " + g.x + " " + g.y + ')"' : "";
          glyphMarkup +=
            '<text x="' + g.x + '" y="' + g.y + '" text-anchor="middle" dominant-baseline="middle" ' +
            'font-family="' + esc(fontFamily) + '" font-size="' + fs + '" font-weight="' + weight + '" ' +
            'fill="' + esc(fill) + '"' + transformAttr + ">" + esc(g.ch) + "</text>";
        });
      });
      svgBody = glyphMarkup;
    } else {
      let pathResult = shape.layout({
        lines: lines,
        fontSize: fs,
        letterSpacing: spacing,
        intensity: intensity,
        lineGap: lineGap
      });
      width = pathResult.width;
      height = pathResult.height;
      let spacingAttr = spacing ? ' letter-spacing="' + spacing + '"' : "";
      let defsMarkup = "";
      let textMarkup = "";
      pathResult.paths.forEach(function (p, i) {
        let id = nextId();
        defsMarkup += '<path id="' + id + '" d="' + p.d + '" fill="none"/>';
        textMarkup +=
          '<text font-family="' + esc(fontFamily) + '" font-size="' + fs + '" font-weight="' + weight + '" ' +
          'fill="' + esc(fill) + '"' + spacingAttr + '>' +
          '<textPath href="#' + id + '" xlink:href="#' + id + '" startOffset="' + p.startOffset + '" ' +
          'text-anchor="' + p.textAnchor + '" dominant-baseline="middle">' + esc(lines[i] || "") + "</textPath></text>";
      });
      svgBody = "<defs>" + defsMarkup + "</defs>" + textMarkup;
    }

    let ariaLabel = esc(lines.join(" ").trim() || rawText);
    let svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'viewBox="0 0 ' + width + " " + height + '" ' +
      'width="' + width + '" height="' + height + '" class="utg-curved-svg" role="img" ' +
      'aria-label="' + ariaLabel + '">' + svgBody + "</svg>";

    return { svg: svg, width: width, height: height };
  }

  window.UltraCurvedText = { build: build, SHAPES: SHAPES, FAMILY_LABELS: FAMILY_LABELS };
})();
