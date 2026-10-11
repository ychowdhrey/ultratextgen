/* UltraTextGen — glyph centreline.
   ------------------------------------------------------------------
   Why this file exists: the handwriting generator's dotted, dashed and faint
   trace rows draw a WRITING ROUTE, and the only routes this site has
   (strokeDirectionData.js) are US manuscript print letters, one per letter
   cell. That is right for a print face and wrong for a joined school script.
   On de/zum-ausdrucken/schreibschrift with Schulausgangsschrift selected, the
   model line read "Sonne und Mond" in joined cursive while every trace row
   under it printed "S o n n e  u n d  M o n d" as separate print skeletons:
   no joins, the wrong letterforms, and an M flattened to fit a print cell.
   Rendered 2026-10-05 on main ba007635d.

   Hand-authored cursive routes exist only for fixed phrases
   (cursiveRouteData.js, built per phrase per face), so a typed word cannot
   have one. The glyph contour is not an answer either: a stroked contour puts
   a dot on BOTH edges of every stem (R-001), and on a joined script that
   prints as a smudged double row.

   So the route is taken from the glyph itself. The caller rasterises the word
   in its own face; this file thins the ink to a one-pixel skeleton and walks
   that skeleton into polylines. A monoline school script is close to its own
   centreline already, which is why this is a faithful route for it: the joins
   come out joined because the ink is joined.

   Pure and browser-free, like stencil.js: a bitmap in, polylines out, tested
   by centreline.test.js with shapes built in the test, no font.

     1. thin()   — Zhang-Suen thinning. Removes boundary pixels in two
                   alternating sub-passes until only a one-pixel-wide,
                   8-connected skeleton is left, without breaking a stroke.
     2. trace()  — splits the skeleton at its junctions (3+ neighbours) and
                   walks each run between two nodes into a polyline; a closed
                   loop with no node (an o) is walked once round.
     3. prune    — thinning grows short spurs where a stroke ends with a round
                   cap or bends sharply. A branch that ends free and is
                   shorter than the stroke is wide is a spur, not a stroke,
                   and is dropped. The width is measured, not guessed: ink
                   area divided by skeleton length.
     4. smooth + simplify — the raw walk is a pixel staircase. A short moving
                   average takes the stair out, then Ramer-Douglas-Peucker
                   keeps the shape at a fraction of the points.

   An isolated mark (the dot of an i, a tittle) thins to a pixel or two. It is
   returned as a two-point segment so it still gets one dot on the sheet. */
(function () {
  "use strict";

  /* Zhang-Suen's two sub-pass rules, precomputed for all 256 neighbourhoods.
     Bit k of the code is neighbour P(k+2), clockwise from north (P2..P9). */
  const THIN_LUT = [new Uint8Array(256), new Uint8Array(256)];
  for (let code = 0; code < 256; code++) {
    const p = [];
    for (let k = 0; k < 8; k++) p.push((code >> k) & 1);
    const [p2, p3, p4, p5, p6, p7, p8, p9] = p;
    const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
    const a = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) +
              (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
    const ok = b >= 2 && b <= 6 && a === 1;
    THIN_LUT[0][code] = ok && !(p2 && p4 && p6) && !(p4 && p6 && p8) ? 1 : 0;
    THIN_LUT[1][code] = ok && !(p2 && p4 && p8) && !(p2 && p6 && p8) ? 1 : 0;
  }

  function thin(src, w, h) {
    const m = new Uint8Array(src.length);
    for (let i = 0; i < src.length; i++) m[i] = src[i] ? 1 : 0;
    // The one-pixel border is never removed by the rules below; clear it so a
    // stroke touching the edge cannot leave a ragged frame.
    for (let x = 0; x < w; x++) { m[x] = 0; m[(h - 1) * w + x] = 0; }
    for (let y = 0; y < h; y++) { m[y * w] = 0; m[y * w + w - 1] = 0; }
    /* Visit ink only. A 50-character line rasterises to ~2M pixels of which
       under a tenth are ink, and a full scan per sub-pass made one line cost
       ~0.8s (measured 2026-10-05: 1,000ms per keystroke against 160ms on
       main). The live list shrinks as pixels are removed. */
    let live = [];
    for (let i = 0; i < m.length; i++) if (m[i]) live.push(i);
    const del = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        const lut = THIN_LUT[pass];
        del.length = 0;
        for (let li = 0; li < live.length; li++) {
          const i = live[li];
          const code = m[i - w] | (m[i - w + 1] << 1) | (m[i + 1] << 2) | (m[i + w + 1] << 3) |
                       (m[i + w] << 4) | (m[i + w - 1] << 5) | (m[i - 1] << 6) | (m[i - w - 1] << 7);
          if (lut[code]) del.push(i);
        }
        if (del.length) {
          changed = true;
          for (let k = 0; k < del.length; k++) m[del[k]] = 0;
          live = live.filter((i) => m[i]);
        }
      }
    }
    return m;
  }

  const NB = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

  function neighbours(m, w, h, i) {
    const x = i % w, y = (i - x) / w;
    const out = [];
    for (let k = 0; k < 8; k++) {
      const nx = x + NB[k][0], ny = y + NB[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (m[j]) out.push(j);
    }
    return out;
  }

  /* A skeleton pixel with 3+ skeleton neighbours is a junction, but on an
     8-connected skeleton a single crossing often shows up as a small cluster
     of such pixels. They are merged into one node so a crossing is one place,
     not three runs a pixel long between neighbouring junction pixels. */
  function graph(sk, w, h) {
    const pix = [];
    for (let i = 0; i < sk.length; i++) if (sk[i]) pix.push(i);
    const deg = new Uint8Array(sk.length);
    // The border is clear after thin(), so the eight reads never wrap a row.
    for (let k = 0; k < pix.length; k++) {
      const i = pix[k];
      deg[i] = sk[i - w] + sk[i - w + 1] + sk[i + 1] + sk[i + w + 1] +
               sk[i + w] + sk[i + w - 1] + sk[i - 1] + sk[i - w - 1];
    }
    const node = new Int32Array(sk.length).fill(-1);
    const nodes = [];
    for (let k = 0; k < pix.length; k++) {
      const i = pix[k];
      if (node[i] !== -1) continue;
      if (deg[i] !== 1 && deg[i] < 3) continue;
      const id = nodes.length;
      const members = [];
      const stack = [i];
      node[i] = id;
      while (stack.length) {
        const c = stack.pop();
        members.push(c);
        if (deg[c] === 1) continue;   // an end pixel is a node on its own
        neighbours(sk, w, h, c).forEach((j) => {
          if (node[j] === -1 && deg[j] >= 3) { node[j] = id; stack.push(j); }
        });
      }
      let sx = 0, sy = 0;
      members.forEach((c) => { sx += c % w; sy += (c - (c % w)) / w; });
      nodes.push({ id: id, members: members, end: deg[i] === 1,
                   x: sx / members.length, y: sy / members.length });
    }
    return { deg: deg, node: node, nodes: nodes, pix: pix };
  }

  function xy(i, w) { const x = i % w; return [x, (i - x) / w]; }

  function trace(sk, w, h) {
    const G = graph(sk, w, h);
    const seen = new Uint8Array(sk.length);
    const runs = [];
    // Walk out of every node along each unvisited branch.
    G.nodes.forEach((n) => {
      n.members.forEach((start) => {
        neighbours(sk, w, h, start).forEach((first) => {
          if (G.node[first] === n.id || seen[first]) return;
          const pts = [[n.x, n.y]];
          let prev = start, cur = first, endNode = -1;
          for (;;) {
            if (G.node[cur] !== -1) { endNode = G.node[cur]; break; }
            seen[cur] = 1;
            pts.push(xy(cur, w));
            const next = neighbours(sk, w, h, cur).filter((j) => j !== prev && (!seen[j] || G.node[j] !== -1));
            if (!next.length) break;
            // Prefer a node if one is adjacent, so a run ends ON its junction.
            const nodeNext = next.find((j) => G.node[j] !== -1);
            prev = cur;
            cur = nodeNext !== undefined ? nodeNext : next[0];
          }
          if (endNode !== -1) {
            const e = G.nodes[endNode];
            pts.push([e.x, e.y]);
          }
          runs.push({ pts: pts, a: n.id, b: endNode });
        });
      });
    });
    // Closed loops with no node at all (an o, a 0) are still unvisited.
    for (let k = 0; k < G.pix.length; k++) {
      const i = G.pix[k];
      if (seen[i] || G.node[i] !== -1) continue;
      const pts = [];
      let prev = -1, cur = i;
      while (cur !== -1 && !seen[cur]) {
        seen[cur] = 1;
        pts.push(xy(cur, w));
        const next = neighbours(sk, w, h, cur).filter((j) => j !== prev && !seen[j]);
        prev = cur;
        cur = next.length ? next[0] : -1;
      }
      if (pts.length > 1) { pts.push(pts[0].slice()); runs.push({ pts: pts, a: -1, b: -1, loop: true }); }
      else if (pts.length === 1) runs.push({ pts: pts, a: -1, b: -1 });
    }
    // An isolated node (a one-pixel mark) has no branches; give it a run.
    G.nodes.forEach((n) => {
      if (G.deg[n.members[0]] === 0 || (n.members.length && !runs.some((r) => r.a === n.id || r.b === n.id))) {
        runs.push({ pts: [[n.x, n.y]], a: n.id, b: n.id, mark: true });
      }
    });
    return { runs: mergeThrough(runs, G.nodes), nodes: G.nodes };
  }

  /* A node where exactly two runs meet is not a junction: it is a pixel
     staircase on a thinned curve, which has three 8-neighbours without being
     a fork. Measured on a plain ring before this pass: one loop came back as
     four runs between four such nodes. Left split, the dots would restart at
     every fake node (each run is dotted from its own ends), so the two runs
     are joined into one through the node. A run that comes back to its own
     start becomes a closed loop. Repeats until no such node is left. */
  function mergeThrough(runs, nodes) {
    let list = runs.filter((r) => !(r.a === r.b && r.a !== -1 && !r.mark && r.pts.length <= 3));
    for (let guard = 0; guard < 10000; guard++) {
      const inc = new Map();
      list.forEach((r, i) => {
        if (r.mark || r.loop) return;
        [r.a, r.b].forEach((id, side) => {
          if (id < 0 || (nodes[id] && nodes[id].end)) return;
          if (!inc.has(id)) inc.set(id, []);
          inc.get(id).push({ i: i, side: side });
        });
      });
      let hit = null;
      for (const [id, ends] of inc) if (ends.length === 2) { hit = { id: id, ends: ends }; break; }
      if (!hit) break;
      const [e1, e2] = hit.ends;
      if (e1.i === e2.i) {
        // Both ends of one run meet at this node: it is a closed loop.
        const r = list[e1.i];
        list[e1.i] = { pts: r.pts.concat([r.pts[0].slice()]), a: -1, b: -1, loop: true };
        continue;
      }
      const r1 = list[e1.i], r2 = list[e2.i];
      // Orient so r1 ENDS at the node and r2 STARTS at it.
      const p1 = e1.side === 1 ? r1.pts : r1.pts.slice().reverse();
      const p2 = e2.side === 0 ? r2.pts : r2.pts.slice().reverse();
      const a = e1.side === 1 ? r1.a : r1.b;
      const b = e2.side === 0 ? r2.b : r2.a;
      const merged = { pts: p1.concat(p2.slice(1)), a: a, b: b };
      list = list.filter((_, k) => k !== e1.i && k !== e2.i);
      list.push(merged);
    }
    return list;
  }

  function polyLen(P) {
    let L = 0;
    for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    return L;
  }

  function smooth(P, r) {
    if (P.length < 3 || r < 1) return P;
    const closed = P.length > 3 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1];
    const out = P.map((p, i) => {
      if (!closed && (i === 0 || i === P.length - 1)) return p.slice();   // ends stay put: they meet other runs
      let sx = 0, sy = 0, n = 0;
      for (let k = -r; k <= r; k++) {
        let j = i + k;
        if (closed) j = (j + P.length - 1) % (P.length - 1);
        else if (j < 0 || j >= P.length) continue;
        sx += P[j][0]; sy += P[j][1]; n++;
      }
      return [sx / n, sy / n];
    });
    if (closed) out[out.length - 1] = out[0].slice();
    return out;
  }

  function rdp(P, eps) {
    if (P.length < 3) return P;
    const keep = new Uint8Array(P.length);
    keep[0] = keep[P.length - 1] = 1;
    const stack = [[0, P.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      let best = -1, bi = -1;
      for (let i = a + 1; i < b; i++) {
        const d = L ? Math.abs(dy * P[i][0] - dx * P[i][1] + bx * ay - by * ax) / L
                    : Math.hypot(P[i][0] - ax, P[i][1] - ay);
        if (d > best) { best = d; bi = i; }
      }
      if (best > eps) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
    }
    return P.filter((p, i) => keep[i]);
  }

  /* Where a joined script doubles back over itself (the downstroke and
     upstroke of an m, the loop of a k, a double s), thinning puts two
     junctions a few pixels apart with a run between them shorter than the
     stroke is wide. That run is one crossing drawn as two, and on the dashed
     rung each of the pieces starts its own dash, which printed as small "+"
     ticks inside u, m and e (rendered "Bäume küssen", VA, 2026-10-05). Such a
     link is removed and its two junctions become one, at their midpoint; the
     runs that met either junction are moved onto it. Runs with a free end are
     left to the spur rule, and loops and marks are never touched. */
  function collapseShortLinks(t, maxLen, isEnd) {
    const nodes = t.nodes;
    const parent = nodes.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const short = [];
    t.runs.forEach((r, k) => {
      if (r.mark || r.loop || r.a < 0 || r.b < 0 || isEnd(r.a) || isEnd(r.b)) return;
      if (r.a === r.b || polyLen(r.pts) >= maxLen) return;
      short.push(k);
      parent[find(r.a)] = find(r.b);
    });
    if (!short.length) return;
    const acc = new Map();
    nodes.forEach((n, i) => {
      if (isEnd(i)) return;
      const root = find(i);
      const a = acc.get(root) || { x: 0, y: 0, n: 0 };
      a.x += n.x; a.y += n.y; a.n++;
      acc.set(root, a);
    });
    const drop = new Set(short);
    t.runs = t.runs.filter((_, k) => !drop.has(k));
    t.runs.forEach((r) => {
      [["a", 0], ["b", -1]].forEach(([side, at]) => {
        const id = r[side];
        if (id < 0 || isEnd(id)) return;
        const root = find(id);
        const a = acc.get(root);
        r[side] = root;
        if (!a || a.n < 2) return;
        const idx = at === 0 ? 0 : r.pts.length - 1;
        r.pts[idx] = [a.x / a.n, a.y / a.n];
      });
    });
    t.runs = mergeThrough(t.runs, nodes);
  }

  /* The whole pipeline. Returns { strokes: [[ [x,y], ... ], ...], width }
     in the bitmap's own pixel coordinates. `width` is the measured mean
     stroke width (ink area / skeleton length), returned so a caller can
     sanity-check that the face really is monoline. */
  function centrelines(mask, w, h, opts) {
    const o = opts || {};
    let ink = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i]) ink++;
    if (!ink) return { strokes: [], width: 0 };
    const sk = thin(mask, w, h);
    let skLen = 0;
    for (let i = 0; i < sk.length; i++) if (sk[i]) skLen++;
    const width = skLen ? ink / skLen : 0;
    const t = trace(sk, w, h);
    const nodes = t.nodes;
    const spur = o.spur != null ? o.spur : Math.max(2, width * 1.0);
    // A run that ends at a free end (an end node) on one side and is shorter
    // than the stroke is wide is a thinning spur. A run that is free at BOTH
    // ends is a whole stroke (or a mark) and is never pruned.
    const isEnd = (id) => id >= 0 && nodes[id] && nodes[id].end;
    collapseShortLinks(t, Math.max(2, width * 0.9), isEnd);
    const kept = t.runs.filter((r) => {
      if (r.mark || r.loop) return true;
      const freeA = isEnd(r.a), freeB = isEnd(r.b);
      if (freeA && freeB) return true;
      if (!freeA && !freeB) return true;
      return polyLen(r.pts) >= spur;
    });
    const sm = o.smooth != null ? o.smooth : 2;
    const eps = o.epsilon != null ? o.epsilon : 0.6;
    const strokes = kept.map((r) => {
      let P = r.pts;
      if (P.length === 1) return [P[0].slice(), [P[0][0] + 0.5, P[0][1]]];
      P = rdp(smooth(P, sm), eps);
      if (P.length === 1) P = [P[0], [P[0][0] + 0.5, P[0][1]]];
      return P;
    });
    return { strokes: strokes, width: width };
  }

  const ns = (window.UltraTextGen = window.UltraTextGen || {});
  ns.centreline = { thin: thin, trace: trace, centrelines: centrelines, rdp: rdp, polyLen: polyLen };
})();
