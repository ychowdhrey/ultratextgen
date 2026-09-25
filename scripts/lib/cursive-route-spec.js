/*
 * cursive-route-spec.js — the pen order for each cursive phrase that has a
 * writing route, read by scripts/build-cursive-routes.js.
 *
 * What is authored here and what is measured
 * ------------------------------------------
 * The PATH is measured: the builder renders the phrase in its real webfont,
 * thins the ink to a one-pixel centreline, and joins consecutive waypoints
 * below by the shortest way ALONG that centreline. So a route lies on the
 * letters by construction, and the builder checks it (on-glyph and coverage,
 * see its header).
 *
 * The ORDER is authored: which way round a loop goes, where the pen doubles
 * back over a stroke it has just drawn, where it lifts. A centreline cannot
 * say that, because a retrace and a single pass leave the same ink. A waypoint
 * placed on one arm of a loop, or at the tip the pen turns on, is what forces
 * it. Every choice below follows the letter as a US traditional cursive
 * model writes it: the downstroke of a looped ascender is the straight arm,
 * an oval letter (a, d) closes counterclockwise and then retraces its stem,
 * i is dotted and t is crossed after the word.
 *
 * Coordinates are canvas px at the builder's own raster (F = 400px type,
 * baseline at y = 500, text origin at x0), because that is where they were
 * read. x0 is recorded per phrase and the builder refuses to run when its
 * raster puts the text anywhere else: a font update that moved the glyphs
 * would otherwise snap every waypoint to the wrong stroke. The output is converted to em units from the
 * text origin, so nothing downstream depends on these numbers.
 *
 * Each phrase is one exact string. A route drawn for "happy birthday" is not
 * valid for any other text, and the engine uses it only on an exact match.
 */
"use strict";

const sh = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);

// ---- lowercase letters, as laid out in "happy birthday" ----
const h1 = [[142, 489], [272, 385], [300, 311], [405, 210], [400, 110], [335, 205], [300, 311], [272, 385], [238, 487], [272, 385], [400, 312], [410, 400], [398, 488], [480, 442], [505, 427]];
const a1 = [[530, 370], [600, 309], [688, 324], [600, 309], [530, 370], [505, 427], [540, 488], [633, 426], [668, 372], [688, 324], [668, 372], [633, 426], [645, 482], [700, 470], [782, 393]];
const p1 = [[817, 313], [782, 393], [807, 395], [764, 477], [737, 522], [663, 640], [668, 690], [705, 640], [737, 522], [764, 477], [807, 395], [925, 310], [945, 370], [913, 440], [886, 477], [764, 478], [886, 477], [960, 470], [1036, 393]];
const p2 = sh(p1.slice(0, 16), 254).concat([[1140, 477]]);
const y1 = [[1190, 470], [1245, 429], [1300, 360], [1330, 312], [1293, 420], [1305, 488], [1360, 470], [1400, 420], [1463, 308], [1420, 440], [1370, 590], [1340, 665], [1290, 692], [1262, 640], [1302, 586], [1408, 500], [1457, 480]];
const b1 = [[1552, 492], [1673, 425], [1717, 345], [1795, 258], [1820, 112], [1740, 240], [1717, 345], [1673, 425], [1690, 488], [1800, 430], [1825, 330], [1900, 322], [1948, 322]];
const i1 = [[1920, 420], [1920, 488], [1990, 470], [2060, 380], [2089, 330]];
const r1 = [[2096, 290], [2089, 330], [2150, 318], [2188, 320], [2160, 420], [2155, 488], [2230, 460], [2284, 412]];
const t1 = [[2316, 316], [2352, 226], [2316, 316], [2284, 412], [2290, 480], [2330, 490], [2400, 430], [2458, 386]];
const h2 = [[2487, 311], [2595, 210], [2590, 110], [2525, 200], [2487, 311], [2458, 386], [2424, 487], [2458, 386], [2600, 312], [2585, 420], [2575, 488], [2640, 470], [2685, 434]];
const d1 = [[2700, 380], [2790, 309], [2863, 320], [2790, 309], [2700, 380], [2685, 434], [2720, 488], [2818, 424], [2848, 370], [2863, 320], [2905, 210], [2938, 114], [2905, 210], [2863, 320], [2848, 370], [2818, 424], [2840, 490], [2900, 470], [2946, 427]];
const a2 = sh(a1.slice(0, 13), 2441).concat([[3095, 488], [3179, 429]]);
const y2 = sh(y1.slice(2), 1934);

// ---- title case: H, a (no lead-in after H), B and i (no lead-in after B)
// are their own glyphs; "ppy" and "rthday" are the lowercase glyphs, moved by
// the measured difference in advance (+39 and +187 px at this raster). ----
const H1 = [[141, 144], [205, 121], [288, 107], [230, 289], [210, 350], [159, 490]];
const H2 = [[512, 107], [438, 347], [413, 362], [383, 492], [413, 362], [300, 376], [210, 350], [230, 289], [320, 280], [405, 330], [438, 347], [508, 332]];
const A1 = [[714, 346], [702, 315], [659, 308], [586, 345], [548, 447], [592, 486], [680, 422], [714, 346], [680, 422], [689, 489], [751, 462], [822, 394]];
const PPY = sh([].concat(p1, p2, y1), 39);
const B1 = [[1754, 211], [1843, 156], [1870, 105], [1843, 156], [1844, 188], [1790, 340], [1738, 491], [1790, 340], [1844, 188], [1917, 137], [1989, 110], [2048, 151], [2046, 195], [2000, 256], [1967, 271], [1914, 283], [1967, 271], [1999, 316], [2022, 380], [2015, 414], [1962, 472], [1904, 486], [1829, 474]];
const I1 = [[2147, 311], [2107, 431], [2116, 490], [2170, 473], [2252, 368], [2276, 329]];
const RTHDAY = sh([].concat(r1, t1, h2, d1, a2, y2), 187);

module.exports = {
  font: "Playwrite US Trad",
  weight: 400,
  phrases: [
    {
      text: "happy birthday",
      x0: 202,
      strokes: [
        { kind: "line", pts: [].concat(h1, a1, p1, p2, y1) },
        { kind: "line", pts: [].concat(b1, i1, r1, t1, h2, d1, a2, y2) },
        { kind: "dot", at: [1989.7, 208.1] },
        { kind: "line", pts: [[2278, 319], [2380, 313]] }
      ]
    },
    {
      text: "Happy Birthday",
      x0: 39,
      strokes: [
        { kind: "line", pts: H1 },
        { kind: "line", pts: H2 },
        { kind: "line", pts: [].concat(A1, PPY) },
        { kind: "line", pts: B1 },
        { kind: "line", pts: [].concat(I1, RTHDAY) },
        { kind: "dot", at: [2176.7, 208.1] },
        { kind: "line", pts: [[2465, 319], [2567, 313]] }
      ]
    }
  ]
};
