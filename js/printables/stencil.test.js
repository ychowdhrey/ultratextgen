/* node js/printables/stencil.test.js  —  npm run test:stencil
   ---------------------------------------------------------------
   The bridge finder has one failure mode that matters and it is silent: it
   returns an empty array. A letter with no bridge looks exactly like a letter
   that needed none, on screen and on paper, and the person only finds out
   after cutting. So every case below states how many bridges it expects and
   where, and the shapes are built here rather than rendered, so the test
   needs no browser and no font.

   The negative cases are the point as much as the positive ones: a solid
   shape and an open C must produce NOTHING, or the finder would be drawing
   gaps into cut lines that are already safe to cut. */
"use strict";
const fs = require("fs");
const path = require("path");
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "stencil.js"), "utf8"))();
const S = global.window.UltraTextGen.stencil;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + msg);
}
function eq(a, b, msg) { ok(a === b, msg + " — got " + a + ", expected " + b); }

const W = 64, H = 64;
function blank() { return new Uint8Array(W * H); }
function rect(m, x0, y0, x1, y1, v) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = v;
}
// A ring: solid block with a hole punched out of it.
function ring(x0, y0, x1, y1, t) {
  const m = blank();
  rect(m, x0, y0, x1, y1, 1);
  rect(m, x0 + t, y0 + t, x1 - t, y1 - t, 0);
  return m;
}

// 1. a solid block has no counter and must yield no bridge
{
  const m = blank();
  rect(m, 8, 8, 56, 56, 1);
  eq(S.findBridges(m, W, H).length, 0, "solid block: no bridge");
}

// 2. an O: one counter, one bridge, on the THINNEST wall
{
  // walls: left/right 6px, top/bottom 12px -> the bridge must be horizontal
  const m = blank();
  rect(m, 10, 6, 54, 58, 1);
  rect(m, 16, 18, 48, 46, 0);
  const b = S.findBridges(m, W, H);
  eq(b.length, 1, "O: one bridge");
  ok(b[0] && b[0].vertical === false, "O: bridge crosses the thin left/right wall, not the thick top/bottom");
  ok(b[0] && b[0].w <= 8, "O: bridge spans the 6px wall, got " + (b[0] && b[0].w));
}

// 3. a figure 8: two counters, two bridges
{
  const m = blank();
  rect(m, 10, 4, 54, 60, 1);
  rect(m, 18, 10, 46, 26, 0);
  rect(m, 18, 38, 46, 54, 0);
  eq(S.findBridges(m, W, H).length, 2, "8: two bridges");
}

// 4. an open C is not enclosed and must yield no bridge
{
  const m = ring(10, 10, 54, 54, 8);
  // cut the right-hand wall open
  rect(m, 46, 24, 54, 40, 0);
  eq(S.findBridges(m, W, H).length, 0, "open C: no bridge");
}

// 5. a counter behind another counter is never bridged through
{
  // concentric rings: the inner counter's every walk crosses the middle ring
  // and lands in the OUTER counter, which is not the outside.
  const m = blank();
  rect(m, 4, 4, 60, 60, 1);
  rect(m, 10, 10, 54, 54, 0);   // outer counter
  rect(m, 18, 18, 46, 46, 1);   // island of ink inside it
  rect(m, 24, 24, 40, 40, 0);   // inner counter
  const b = S.findBridges(m, W, H);
  eq(b.length, 1, "concentric: only the outer counter is bridged");
}

// 6. a speck of paper smaller than minArea is noise, not a counter
{
  const m = blank();
  rect(m, 8, 8, 56, 56, 1);
  rect(m, 30, 30, 32, 32, 0);   // 4px
  eq(S.findBridges(m, W, H).length, 0, "4px speck: not a counter");
}

// 7. the bridge sits ON the wall it crosses, not adrift of it
{
  const m = blank();
  rect(m, 10, 6, 54, 58, 1);
  rect(m, 16, 18, 48, 46, 0);
  const b = S.findBridges(m, W, H)[0];
  // Either vertical wall is 6px, so either is a correct answer; what must
  // not happen is a bridge adrift of both.
  const onLeft = b.x >= 9 && b.x + b.w <= 18;
  const onRight = b.x >= 46 && b.x + b.w <= 55;
  ok(onLeft || onRight, "O: bridge lies across one of the two 6px walls, got " + b.x + ".." + (b.x + b.w));
  ok(b.y > 18 && b.y < 46, "O: bridge sits within the counter's vertical span, got " + b.y);
}

// 8. pad widens the crossing axis only
{
  const m = blank();
  rect(m, 10, 6, 54, 58, 1);
  rect(m, 16, 18, 48, 46, 0);
  const a = S.findBridges(m, W, H)[0];
  const p = S.findBridges(m, W, H, { pad: 3 })[0];
  eq(p.w, a.w + 6, "pad: crossing axis grows by 2*pad");
  eq(p.h, a.h, "pad: the other axis is unchanged");
}

// 9. width sets the strip's own thickness
{
  const m = blank();
  rect(m, 10, 6, 54, 58, 1);
  rect(m, 16, 18, 48, 46, 0);
  eq(S.findBridges(m, W, H, { width: 11 })[0].h, 11, "width: honoured on a horizontal bridge");
}


/* THE PROPERTY THAT ACTUALLY MATTERS, and the one the earlier cases could not
   see: cut the bridges out of the ink and nothing must still be enclosed. It
   caught a real off-by-one -- a wall crossed in a NEGATIVE direction had its
   last ink pixel left standing, so the counter stayed sealed shut by one
   pixel while the bridge looked perfectly well placed. On the real face that
   was 6, 8, 9, B, Q and R. */
function enclosedCount(ink, w, h) {
  const reg = new Uint8Array(w * h);
  const st = [];
  const seed = (x, y) => { const i = y * w + x; if (ink[i] || reg[i]) return; reg[i] = 1; st.push(i); };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (st.length) {
    const i = st.pop(); const x = i % w, y = (i - x) / w;
    if (x > 0) seed(x - 1, y); if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1); if (y < h - 1) seed(x, y + 1);
  }
  const seen = new Uint8Array(w * h);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    if (ink[i] || reg[i] || seen[i]) continue;
    const q = [i]; seen[i] = 1; let a = 0;
    while (q.length) {
      const j = q.pop(); a++; const x = j % w, y = (j - x) / w;
      const nb = [];
      if (x > 0) nb.push(j - 1); if (x < w - 1) nb.push(j + 1);
      if (y > 0) nb.push(j - w); if (y < h - 1) nb.push(j + w);
      for (let k = 0; k < nb.length; k++) { const t = nb[k]; if (!ink[t] && !reg[t] && !seen[t]) { seen[t] = 1; q.push(t); } }
    }
    if (a >= 8) n++;
  }
  return n;
}
function cut(m, bridges) {
  const out = Uint8Array.from(m);
  for (let n = 0; n < bridges.length; n++) {
    const r = bridges[n];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++)
      if (x >= 0 && x < W && y >= 0 && y < H) out[y * W + x] = 0;
  }
  return out;
}

// 10. every wall direction, one at a time: the thin side is placed N, S, E and
//     W in turn so each of the four walks is the winner exactly once.
[["left", 6, 20, 20, 20], ["right", 20, 6, 20, 20], ["top", 20, 20, 6, 20], ["bottom", 20, 20, 20, 6]].forEach((cse) => {
  const m = blank();
  rect(m, 2, 2, 62, 62, 1);
  rect(m, 2 + cse[1], 2 + cse[3], 62 - cse[2], 62 - cse[4], 0);
  const bridges = S.findBridges(m, W, H);
  eq(bridges.length, 1, "thin wall on the " + cse[0] + ": one bridge");
  eq(enclosedCount(m, W, H), 1, "thin wall on the " + cse[0] + ": one counter before");
  eq(enclosedCount(cut(m, bridges), W, H), 0, "thin wall on the " + cse[0] + ": NOTHING enclosed once the bridge is cut");
});

// 11. two counters, both attached
{
  const m = blank();
  rect(m, 10, 4, 54, 60, 1);
  rect(m, 18, 10, 46, 26, 0);
  rect(m, 18, 38, 46, 54, 0);
  const bridges = S.findBridges(m, W, H);
  eq(bridges.length, 2, "8: two bridges");
  eq(enclosedCount(cut(m, bridges), W, H), 0, "8: BOTH counters attached once the bridges are cut");
}

console.log((fail ? "FAIL" : "PASS") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
