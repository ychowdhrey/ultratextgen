#!/usr/bin/env node
/*
 * build-cursive-routes.js — the writing route of a cursive phrase: where the
 * pen goes, in order, measured from the letters the site actually draws.
 *
 * Why it exists
 * -------------
 * The print-letter sheets trace a writing centreline (R-001). Their data,
 * js/printables/strokeDirectionData.js, is a hand-drawn skeleton per letter,
 * fitted to the glyph afterwards, and that works because a print letter
 * stands alone. A cursive word does not: its letters join, the joins belong
 * to the word rather than to either letter, and the same glyph's lead-in
 * changes with its neighbour ("i" after "b" has one, after "B" it has none).
 * So a cursive route is built per PHRASE, from the phrase's own ink:
 *
 *   1. render the phrase in its webfont in headless Chromium (canvas, the
 *      same shaping the SVG <text> on the sheet gets);
 *   2. thin the ink to a one-pixel centreline (Zhang-Suen);
 *   3. join the authored waypoints (scripts/lib/cursive-route-spec.js) by
 *      the shortest way along that centreline, smooth each leg with its ends
 *      pinned, and simplify;
 *   4. verify, and refuse to write when either check fails:
 *        on-glyph  share of the route's length that lies on ink   >= 99.5%
 *        coverage  share of centreline pixels within 6px of it    >= 97%
 *        gap       longest run of centreline it never comes near  <= 1 stem
 *      The first proves the route is on the letters; the last proves no part
 *      of a letter was skipped, which a route can do while being 100%
 *      on-glyph and 97.8% covered (a waypoint list missing the top of a "p"
 *      did exactly that, and only the gap measure caught it).
 *
 * Output: js/printables/cursiveRouteData.js, em units from the text origin
 * on the baseline, so the engine places it with one translate and one scale
 * wherever it sets the same text in the same face. Do not edit that file;
 * change the spec and run this.
 *
 * Build-time only, like capture-printables-previews.js: nothing here ships
 * and nothing is added to package.json. Install the driver for the run
 * (`npm i --no-save playwright-core`) and point it at a Chromium with
 * --chromium or CHROMIUM_PATH.
 *
 * Usage
 *   node scripts/build-cursive-routes.js --check    build and verify, write nothing
 *   node scripts/build-cursive-routes.js --write    build, verify, write the data file
 * A bare run is refused (exit 2). Exit 1 when a phrase fails verification.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "js", "printables", "cursiveRouteData.js");
const SPEC = require("./lib/cursive-route-spec.js");
const F = 400;              // raster type size, px (the baseline and canvas height are per face, in the spec)
const MIN_ON_GLYPH = 0.995;
const MIN_COVERAGE = 0.97;
const COVER_R = 6;          // px: a centreline pixel this close to the route counts as drawn
const GAP_STEMS = 1;        // the longest undrawn run of centreline may be at most one stem width...
const MIN_GAP_FLOOR = 12;   // ...and never less than this, px
const SNAP_WARN = 16;       // px: a waypoint further than this from the centreline is a typo
const SMOOTH_R = 6;         // px: gaussian half-window along each leg
const RDP_EPS = 0.7;        // px: simplification tolerance (0.00175 em)

function usage(code) {
  process.stderr.write("usage: build-cursive-routes.js (--check | --write) [--chromium PATH]\n");
  process.exit(code);
}
function parseArgs(argv) {
  const a = { write: false, check: false, chromium: process.env.CHROMIUM_PATH || "" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--write") a.write = true;
    else if (k === "--check") a.check = true;
    else if (k === "--chromium") a.chromium = argv[++i] || "";
    else if (k === "-h" || k === "--help") usage(0);
    else { process.stderr.write("unknown argument " + k + "\n"); usage(2); }
  }
  if (a.write === a.check) { process.stderr.write("pass exactly one of --check or --write\n"); usage(2); }
  return a;
}
function loadDriver() {
  for (const name of ["playwright", "playwright-core"]) {
    try { return require(name).chromium; } catch (e) { /* try the next */ }
  }
  process.stderr.write("No browser driver. Run `npm i --no-save playwright-core` (nothing is added to package.json).\n");
  process.exit(2);
}
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") {
      // An empty page that loads only the site's stylesheet, so the webfont
      // resolves exactly as the sheets resolve it.
      res.writeHead(200, { "content-type": TYPES[".html"] });
      res.end('<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body></body></html>');
      return;
    }
    const file = path.join(REPO, path.normalize(p));
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// In the page: rasterise, thin, and measure the stem and the dots.
async function rasterInPage(args) {
  const { text, font, weight, F, BASE, H } = args;
  const spec = weight + " " + F + "px '" + font + "'";
  await document.fonts.load(spec);
  if (!document.fonts.check(spec)) return { error: "font did not load: " + font };
  const m0 = document.createElement("canvas").getContext("2d");
  m0.font = spec;
  const m = m0.measureText(text);
  const pad = Math.round(F * 0.3);
  const W = Math.ceil(m.actualBoundingBoxRight + m.actualBoundingBoxLeft + 2 * pad);
  const x0 = pad + Math.ceil(m.actualBoundingBoxLeft);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); ctx.font = spec; ctx.fillStyle = "#000"; ctx.fillText(text, x0, BASE);
  const d = ctx.getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) ink[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  // Ink on the canvas's top or bottom row means the letters were cut off there,
  // and a cut letter thins to a stroke that is not in the font. Playwrite ID's
  // capitals were, at US Trad's baseline of 500px.
  for (let x = 0; x < W; x++) {
    if (ink[x] || ink[(H - 1) * W + x]) return { error: "ink reaches the " + (ink[x] ? "top" : "bottom") + " of the " + H + "px canvas; raise this face's base or height in the spec" };
  }
  const img = ink.slice();
  const I = (x, y) => img[y * W + x];
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const del = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (!I(x, y)) continue;
        const P = [I(x, y - 1), I(x + 1, y - 1), I(x + 1, y), I(x + 1, y + 1), I(x, y + 1), I(x - 1, y + 1), I(x - 1, y), I(x - 1, y - 1)];
        const B = P.reduce((a, b) => a + b, 0);
        if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (P[k] === 0 && P[(k + 1) % 8] === 1) A++;
        if (A !== 1) continue;
        if (step === 0) { if (P[0] * P[2] * P[4] !== 0 || P[2] * P[4] * P[6] !== 0) continue; }
        else { if (P[0] * P[2] * P[6] !== 0 || P[0] * P[4] * P[6] !== 0) continue; }
        del.push(y * W + x);
      }
      if (del.length) { changed = true; for (const k of del) img[k] = 0; }
    }
  }
  const skel = []; for (let k = 0; k < W * H; k++) if (img[k]) skel.push(k);
  // Stem: twice the distance from the centreline to the nearest background,
  // median over a sample of centreline pixels.
  const dists = [];
  for (let i = 0; i < skel.length; i += 7) {
    const x = skel[i] % W, y = (skel[i] / W) | 0;
    let r = 1;
    for (; r < 60; r++) {
      let hit = false;
      for (let a = 0; a < 32 && !hit; a++) {
        const xx = Math.round(x + r * Math.cos(a * Math.PI / 16)), yy = Math.round(y + r * Math.sin(a * Math.PI / 16));
        if (xx < 0 || yy < 0 || xx >= W || yy >= H || !ink[yy * W + xx]) hit = true;
      }
      if (hit) break;
    }
    dists.push(r);
  }
  dists.sort((a, b) => a - b);
  return { W, H, x0, base: BASE, advance: m.width, skel, ink: Array.from(ink), stem: 2 * dists[dists.length >> 1] };
}

function buildPhrase(ph, R) {
  const { W, H, x0 } = R;
  const BASE = R.base;
  const pix = new Set(R.skel);
  const P = R.skel;
  const nb = (k) => {
    const x = k % W, y = (k / W) | 0, o = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const kk = (y + dy) * W + x + dx;
      if (pix.has(kk)) o.push([kk, dx && dy ? Math.SQRT2 : 1]);
    }
    return o;
  };
  const snap = ([x, y]) => {
    let best = null, bd = Infinity;
    for (const k of P) { const d = Math.hypot(k % W - x, ((k / W) | 0) - y); if (d < bd) { bd = d; best = k; } }
    return { k: best, d: bd };
  };
  const dijkstra = (a, b) => {
    const dist = new Map([[a, 0]]), prev = new Map(), done = new Set();
    const pq = [[0, a]];
    while (pq.length) {
      let bi = 0; for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[bi][0]) bi = i;
      const [d, u] = pq.splice(bi, 1)[0];
      if (done.has(u)) continue;
      done.add(u);
      if (u === b) break;
      for (const [v, w] of nb(u)) {
        const nd = d + w;
        if (nd < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, nd); prev.set(v, u); pq.push([nd, v]); }
      }
    }
    if (!dist.has(b)) return null;
    const out = [b]; let c = b;
    while (c !== a) { c = prev.get(c); out.push(c); }
    return out.reverse();
  };
  const smooth = (pts, r) => {
    if (pts.length < 3) return pts;
    const out = pts.map((p) => p.slice());
    for (let i = 1; i < pts.length - 1; i++) {
      let sx = 0, sy = 0, sw = 0;
      for (let j = -r; j <= r; j++) {
        const q = pts[Math.max(0, Math.min(pts.length - 1, i + j))];
        const w = Math.exp(-(j * j) / (2 * (r / 2) ** 2));
        sx += q[0] * w; sy += q[1] * w; sw += w;
      }
      out[i] = [sx / sw, sy / sw];
    }
    return out;
  };
  const rdp = (pts, eps) => {
    if (pts.length < 3) return pts;
    const a = pts[0], b = pts[pts.length - 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
    let md = 0, mi = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md <= eps) return [a, b];
    return rdp(pts.slice(0, mi + 1), eps).slice(0, -1).concat(rdp(pts.slice(mi), eps));
  };
  const em = ([x, y]) => [+((x - x0) / F).toFixed(4), +((y - BASE) / F).toFixed(4)];
  const isInk = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    return x >= 0 && y >= 0 && x < W && y < H && R.ink[y * W + x] === 1;
  };
  const problems = [];
  const strokes = [];
  const drawnPx = [];
  ph.strokes.forEach((st, si) => {
    if (st.kind === "dot") {
      // The dot's size is the blob it sits in: area -> equivalent radius.
      const [cx, cy] = st.at.map(Math.round);
      if (!isInk(cx, cy)) problems.push("stroke " + (si + 1) + ": dot is not on ink");
      const seen = new Set([cy * W + cx]); const stack = [cy * W + cx]; let area = 0;
      while (stack.length) {
        const k = stack.pop(); area++;
        const x = k % W, y = (k / W) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const kk = (y + dy) * W + x + dx;
          if (!seen.has(kk) && R.ink[kk] === 1) { seen.add(kk); stack.push(kk); }
        });
      }
      strokes.push({ kind: "dot", at: em(st.at), r: +(Math.sqrt(area / Math.PI) / F).toFixed(4) });
      return;
    }
    const snaps = st.pts.map(snap);
    snaps.forEach((s, i) => {
      if (s.d > SNAP_WARN) problems.push("stroke " + (si + 1) + " waypoint " + i + " " + JSON.stringify(st.pts[i]) + " is " + s.d.toFixed(1) + "px from the centreline");
    });
    let poly = [];
    for (let i = 1; i < snaps.length; i++) {
      const seg = dijkstra(snaps[i - 1].k, snaps[i].k);
      if (!seg) { problems.push("stroke " + (si + 1) + ": no centreline path between waypoints " + (i - 1) + " and " + i); return; }
      const pts = smooth(seg.map((k) => [k % W, (k / W) | 0]), SMOOTH_R);
      poly = poly.length ? poly.concat(pts.slice(1)) : pts;
    }
    drawnPx.push(poly);
    strokes.push({ kind: "line", pts: rdp(poly, RDP_EPS).map(em) });
  });
  // Verify: on-glyph along the emitted (simplified) route, coverage of the centreline.
  let on = 0, tot = 0;
  const near = new Set();
  strokes.forEach((s) => {
    if (s.kind !== "line") return;
    const Ppx = s.pts.map(([u, v]) => [x0 + u * F, BASE + v * F]);
    for (let i = 1; i < Ppx.length; i++) {
      const a = Ppx[i - 1], b = Ppx[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = 0; t < L; t += 1) {
        const x = a[0] + (b[0] - a[0]) * t / L, y = a[1] + (b[1] - a[1]) * t / L;
        tot++; if (isInk(x, y)) on++;
        for (let dy = -COVER_R; dy <= COVER_R; dy++) for (let dx = -COVER_R; dx <= COVER_R; dx++) near.add(Math.round(y + dy) * W + Math.round(x + dx));
      }
    }
  });
  // Centreline pixels that are part of a dot are drawn by the dot.
  const dotPx = new Set();
  strokes.forEach((s) => {
    if (s.kind !== "dot") return;
    const cx = x0 + s.at[0] * F, cy = BASE + s.at[1] * F, r = s.r * F + COVER_R;
    for (const k of P) if (Math.hypot(k % W - cx, ((k / W) | 0) - cy) <= r) dotPx.add(k);
  });
  const covered = P.filter((k) => near.has(k) || dotPx.has(k)).length;
  const onGlyph = tot ? on / tot : 0, coverage = covered / P.length;
  /* The longest run of centreline the route never comes near. A share cannot
     catch a skipped stroke: the top of one "p" is 0.6% of the phrase's
     centreline, so a route missing it still read 97.8% covered. What is left
     uncovered by a correct route is thinning spurs at round stroke ends, each
     shorter than half the stem; a skipped stroke is a run many times that. */
  const gapSeen = new Set();
  let maxGap = 0, gapAt = null;
  P.forEach((k) => {
    if (near.has(k) || dotPx.has(k) || gapSeen.has(k)) return;
    const stack = [k]; gapSeen.add(k); let n = 0;
    while (stack.length) {
      const q = stack.pop(); n++;
      nb(q).forEach(([v]) => { if (!near.has(v) && !dotPx.has(v) && !gapSeen.has(v)) { gapSeen.add(v); stack.push(v); } });
    }
    if (n > maxGap) { maxGap = n; gapAt = [k % W, (k / W) | 0]; }
  });
  const gapLimit = Math.max(MIN_GAP_FLOOR, Math.round(R.stem * GAP_STEMS));
  if (onGlyph < MIN_ON_GLYPH) problems.push("on-glyph " + (onGlyph * 100).toFixed(2) + "% < " + MIN_ON_GLYPH * 100 + "%");
  if (coverage < MIN_COVERAGE) problems.push("coverage " + (coverage * 100).toFixed(2) + "% < " + MIN_COVERAGE * 100 + "%");
  if (maxGap > gapLimit) problems.push("a run of " + maxGap + "px of centreline near " + JSON.stringify(gapAt) + " is never drawn (limit " + gapLimit + "px): a stroke is skipped");
  return {
    out: {
      advance: +(R.advance / F).toFixed(4),
      stem: +(R.stem / F).toFixed(4),
      strokes: strokes
    },
    onGlyph, coverage, maxGap, gapLimit, problems
  };
}

function fmtPath(pts) {
  return pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
}

function render(results) {
  const lines = [];
  lines.push("/*");
  lines.push(" * cursiveRouteData.js — GENERATED by scripts/build-cursive-routes.js from");
  lines.push(" * scripts/lib/cursive-route-spec.js. Do not edit; change the spec and run");
  lines.push(" * `node scripts/build-cursive-routes.js --write`.");
  lines.push(" *");
  lines.push(" * The writing route of each phrase: where the pen goes, in order, measured");
  lines.push(" * from the phrase's own rendered ink. Em units from the text origin on the");
  lines.push(" * baseline (y grows downward), so a surface that sets the same text in the");
  lines.push(" * same face places it with translate(originX, baselineY) scale(fontSize).");
  lines.push(" * Valid for the exact string only.");
  lines.push(" *");
  lines.push(" *   kind \"line\": `d` is one pen stroke, including where it doubles back over");
  lines.push(" *                itself (the retrace up an \"a\" stem is part of the stroke).");
  lines.push(" *   kind \"dot\":  a mark made with the pen down once (the tittle of i).");
  lines.push(" *   stem:        the face's stroke width at this weight, for drawing the route");
  lines.push(" *                as ink rather than as a hairline.");
  lines.push(" *");
  lines.push(" * Verified at build (share of route length on ink; share of centreline pixels");
  lines.push(" * within " + COVER_R + "px of the route; longest run of centreline never drawn,");
  lines.push(" * at the builder's " + F + "px raster):");
  results.forEach((r) => {
    lines.push(" *   " + r.font + ", " + JSON.stringify(r.text) + ": on-glyph " + (r.onGlyph * 100).toFixed(2) + "%, coverage " + (r.coverage * 100).toFixed(2) + "%, longest undrawn run " + r.maxGap + "px of " + r.gapLimit + " allowed, " + r.out.strokes.length + " strokes");
  });
  lines.push(" */");
  lines.push("(function () {");
  lines.push("  \"use strict\";");
  lines.push("  const data = window.UTG_CURSIVE_ROUTE_DATA = window.UTG_CURSIVE_ROUTE_DATA || {};");
  lines.push("  const face = (name) => (data[name] = data[name] || {});");
  results.forEach((r) => {
    const o = r.out;
    lines.push("  face(" + JSON.stringify(r.font) + ")[" + JSON.stringify(r.text) + "] = {");
    lines.push("    weight: " + r.weight + ", advance: " + o.advance + ", stem: " + o.stem + ",");
    lines.push("    strokes: [");
    o.strokes.forEach((s, i) => {
      const tail = i < o.strokes.length - 1 ? "," : "";
      if (s.kind === "dot") lines.push("      { kind: \"dot\", x: " + s.at[0] + ", y: " + s.at[1] + ", r: " + s.r + " }" + tail);
      else lines.push("      { kind: \"line\", d: \"" + fmtPath(s.pts) + "\" }" + tail);
    });
    lines.push("    ]");
    lines.push("  };");
  });
  lines.push("})();");
  return lines.join("\n") + "\n";
}

(async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chromium = loadDriver();
  const server = await serve();
  const port = server.address().port;
  const launch = {};
  if (args.chromium) launch.executablePath = args.chromium;
  const browser = await chromium.launch(launch);
  let failed = false;
  const results = [];
  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "load" });
    for (const fc of SPEC.faces) for (const ph of fc.phrases) {
      const R = await page.evaluate(rasterInPage, { text: ph.text, font: fc.font, weight: fc.weight, F, BASE: fc.base, H: fc.height });
      if (R.error) { process.stderr.write(ph.text + ": " + R.error + "\n"); failed = true; continue; }
      if (R.x0 !== ph.x0) {
        process.stderr.write(JSON.stringify(ph.text) + ": the raster puts the text origin at x=" + R.x0 + ", the spec was read at x=" + ph.x0 + ". The face changed; re-read the waypoints.\n");
        failed = true; continue;
      }
      const r = buildPhrase(ph, R);
      r.text = ph.text; r.font = fc.font; r.weight = fc.weight;
      results.push(r);
      const status = r.problems.length ? "FAIL" : "ok";
      process.stdout.write(status + "  " + fc.font + "  " + JSON.stringify(ph.text) + "  on-glyph " + (r.onGlyph * 100).toFixed(2) + "%  coverage " + (r.coverage * 100).toFixed(2) + "%  longest gap " + r.maxGap + "/" + r.gapLimit + "px  strokes " + r.out.strokes.length + "  stem " + r.out.stem + "em\n");
      r.problems.forEach((p) => process.stdout.write("      " + p + "\n"));
      if (r.problems.length) failed = true;
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (failed) process.exit(1);
  const text = render(results);
  if (args.write) {
    fs.writeFileSync(OUT, text);
    process.stdout.write("wrote " + path.relative(REPO, OUT) + " (" + text.length + " bytes)\n");
  } else {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (cur !== text) { process.stdout.write(path.relative(REPO, OUT) + " is out of date; run with --write\n"); process.exit(1); }
    process.stdout.write(path.relative(REPO, OUT) + " is up to date\n");
  }
})().catch((e) => { process.stderr.write(String(e && e.stack || e) + "\n"); process.exit(1); });
