/* node js/printables/centreline.test.js  —  npm run test:centreline
   ---------------------------------------------------------------
   The centreline is what a child traces on a joined-script sheet, so its
   failures are the ones a child would follow: a stroke that comes back as two
   parallel lines (the contour defect this file exists to replace), a join
   that comes back broken (the defect that started it: separate print
   skeletons under a joined model line), a mark that vanishes (the dot of an
   i), or a spur that adds a stroke the letter does not have.

   Shapes are built here, not rendered, so the test needs no browser and no
   font. Each case states what the skeleton must be: how many strokes, where
   they lie, and what must touch what. */
"use strict";
const fs = require("fs");
const path = require("path");
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "centreline.js"), "utf8"))();
const C = global.window.UltraTextGen.centreline;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + msg);
}

const W = 120, H = 80;
function blank() { return new Uint8Array(W * H); }
function rect(m, x0, y0, x1, y1) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1;
}
function disc(m, cx, cy, r) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) m[y * W + x] = 1;
  }
}
function ring(m, cx, cy, r0, r1) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d >= r0 && d <= r1) m[y * W + x] = 1;
  }
}
const allPts = (strokes) => strokes.reduce((a, s) => a.concat(s), []);
const near = (p, q, tol) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;

// 1. A thick bar with round caps is ONE stroke down its middle, not two edges.
{
  const m = blank();
  rect(m, 20, 34, 100, 46);       // 12 px thick, centre y = 39.5
  disc(m, 20, 40, 6); disc(m, 100, 40, 6);
  const r = C.centrelines(m, W, H);
  ok(r.strokes.length === 1, "bar: one stroke (got " + r.strokes.length + ")");
  const ys = allPts(r.strokes).map((p) => p[1]);
  ok(ys.every((y) => Math.abs(y - 39.5) <= 2), "bar: every point within 2px of the centre line");
  const xs = allPts(r.strokes).map((p) => p[0]);
  ok(Math.min(...xs) <= 24 && Math.max(...xs) >= 96, "bar: stroke spans the bar (" + Math.min(...xs).toFixed(1) + ".." + Math.max(...xs).toFixed(1) + ")");
  ok(r.width > 8 && r.width < 16, "bar: measured width near 12 (got " + r.width.toFixed(1) + ")");
}

// 2. A ring (an o) is one closed loop on its mid-radius.
{
  const m = blank();
  ring(m, 60, 40, 14, 24);       // mid-radius 19
  const r = C.centrelines(m, W, H);
  ok(r.strokes.length === 1, "ring: one stroke (got " + r.strokes.length + ")");
  const P = r.strokes[0] || [];
  ok(P.length > 4 && near(P[0], P[P.length - 1], 1.5), "ring: the stroke closes on itself");
  ok(P.every((p) => Math.abs(Math.hypot(p[0] - 60, p[1] - 40) - 19) <= 2.5), "ring: every point within 2.5px of the mid-radius");
}

// 3. A cross is four strokes that all meet at one point.
{
  const m = blank();
  rect(m, 20, 35, 100, 45);
  rect(m, 55, 5, 65, 75);
  const r = C.centrelines(m, W, H);
  ok(r.strokes.length === 4, "cross: four strokes (got " + r.strokes.length + ")");
  const ends = r.strokes.map((s) => [s[0], s[s.length - 1]]);
  const atCentre = ends.filter((e) => near(e[0], [59.5, 39.5], 4) || near(e[1], [59.5, 39.5], 4)).length;
  ok(atCentre === 4, "cross: all four strokes end at the crossing (got " + atCentre + ")");
}

// 4. Two letter bodies joined by a connecting stroke stay ONE connected
//    route: the defect this file replaces printed them as separate letters.
{
  const m = blank();
  ring(m, 30, 40, 9, 15);
  ring(m, 90, 40, 9, 15);
  rect(m, 42, 48, 78, 53);       // the join, low like a cursive connector
  const r = C.centrelines(m, W, H);
  // Connected means: from any stroke you can reach any other through shared endpoints.
  const S = r.strokes;
  const parent = S.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = [S[i][0], S[i][S[i].length - 1]], b = [S[j][0], S[j][S[j].length - 1]];
    if (a.some((p) => b.some((q) => near(p, q, 3)))) parent[find(i)] = find(j);
  }
  const groups = new Set(S.map((_, i) => find(i))).size;
  ok(S.length >= 3, "join: the two bodies and the connector all appear (got " + S.length + " strokes)");
  ok(groups === 1, "join: the route is one connected piece (got " + groups + " pieces)");
  // A straight connector simplifies to its two ends, so test the SEGMENTS:
  // some segment must cross x = 60 at the connector's height.
  const crosses = S.some((s) => s.some((p, k) => k > 0 &&
    (s[k - 1][0] - 60) * (p[0] - 60) <= 0 && Math.abs((s[k - 1][1] + p[1]) / 2 - 50.5) <= 4));
  ok(crosses, "join: the connector itself is traced");
}

// 5. An isolated dot (the tittle of an i) is kept as a mark, never dropped.
{
  const m = blank();
  rect(m, 56, 30, 64, 70);       // the stem
  disc(m, 60, 15, 4);            // the dot, separate
  const r = C.centrelines(m, W, H);
  const dot = r.strokes.filter((s) => s.every((p) => p[1] < 24));
  ok(dot.length === 1, "tittle: exactly one stroke for the dot (got " + dot.length + ")");
  ok(dot[0] && dot[0].length >= 2, "tittle: the mark has two points, so it can carry a dot");
  ok(r.strokes.length === 2, "tittle: stem + dot, nothing else (got " + r.strokes.length + ")");
}

// 6. Nothing in, nothing out — and no throw.
{
  const r = C.centrelines(blank(), W, H);
  ok(r.strokes.length === 0 && r.width === 0, "empty: no strokes");
}

console.log("centreline: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
