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
 * it. Every choice below follows the letter as its face's school model
 * writes it: the downstroke of a looped ascender is the straight arm, an oval
 * letter (a, d, g) closes counterclockwise and then retraces its stem, i is
 * dotted and t is crossed after the word.
 *
 * Coordinates are canvas px at the builder's own raster (F = 400px type,
 * baseline at y = `base`, text origin at x0), because that is where they were
 * read. `base` and `height` are per face because the faces differ in how far
 * they reach: Playwrite ID's ascenders stand 1.43em above the baseline, so at
 * US Trad's baseline of 500px its capitals were cut off at the top of the
 * canvas. x0 is recorded per phrase and the builder refuses to run when its
 * raster puts the text anywhere else: a font update that moved the glyphs
 * would otherwise snap every waypoint to the wrong stroke. The output is
 * converted to em units from the text origin, so nothing downstream depends
 * on these numbers.
 *
 * Each phrase is one exact string. A route drawn for "happy birthday" is not
 * valid for any other text, and the engine uses it only on an exact match.
 */
"use strict";

const sh = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);

// ======== Playwrite US Trad (baseline y = 500) ========

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


// ======== Playwrite ID (baseline y = 700) ========
// The Indonesian school model the face follows is upright, and its letters
// share three shapes, so they are written once here: an oval letter (a, g)
// whose join arrives at the foot of its left side, a straight stem the pen
// goes down and back up (m, n), and a looped ascender (l, h) whose upstroke
// is the curved right arm and whose downstroke is the straight left one.
// Capitals S and T do not join the next letter; U does.

// An oval letter joined from the left: up the left side to the top of the
// stem, back round counterclockwise, then up the stem and down it again.
const oval = (L, S) => {
  const mid = Math.round((L + S) / 2);
  return [[L, 648], [L, 592], [mid, 509], [S, 519], [mid, 509], [L, 592], [L, 648], [mid, 688], [S - 25, 664], [S, 650], [S, 580], [S, 519], [S, 580], [S, 650]];
};
// Down a straight stem from its top to the baseline and back up it.
const stem = (x, top, bot) => [[x, top], [x, 620], [x, bot], [x, 620], [x, top]];

// ---- "Selamat Ulang Tahun" (x0 = 77) ----
const idS = [[417, 191], [285, 135], [162, 262], [292, 408], [422, 546], [273, 688], [138, 629]];
const idElamat = [].concat(
  [[472, 692], [558, 659], [619, 558], [581, 509], [527, 562], [558, 659], [623, 691], [708, 642], [731, 631]],
  [[738, 554], [804, 354], [812, 192], [769, 135], [733, 254], [733, 450], [738, 554], [731, 631], [769, 685], [858, 655], [873, 648]],
  oval(873, 1012), [[1046, 691], [1100, 638], [1131, 531], [1165, 508], [1200, 546]],
  stem(1203, 546, 682), [[1227, 537], [1285, 509], [1336, 545]],
  stem(1336, 545, 681), [[1358, 537], [1423, 509], [1468, 562], [1468, 646], [1504, 691], [1562, 658], [1583, 648]],
  oval(1583, 1723), [[1762, 690], [1823, 665], [1852, 648], [1852, 560], [1852, 431], [1852, 560], [1852, 648], [1881, 690], [1921, 677]]
);
const idUlang = [].concat(
  [[2073, 208], [2162, 135], [2200, 146], [2218, 300], [2219, 554], [2246, 638], [2315, 688], [2400, 662], [2465, 608], [2487, 596], [2487, 400], [2487, 140], [2487, 400], [2487, 596], [2508, 654], [2577, 691], [2654, 645], [2675, 636]],
  [[2679, 554], [2750, 315], [2754, 185], [2715, 135], [2675, 254], [2675, 450], [2679, 554], [2675, 636], [2681, 654], [2738, 691], [2800, 654], [2815, 648]],
  oval(2815, 2954), [[2985, 690], [3031, 669], [3054, 608], [3069, 538], [3112, 509], [3145, 550]],
  stem(3145, 550, 682), [[3169, 540], [3238, 509], [3282, 562], [3285, 646], [3319, 691], [3377, 662], [3398, 650]],
  oval(3398, 3537), [[3537, 735], [3537, 777], [3537, 900], [3537, 985], [3481, 1065], [3435, 969], [3462, 846], [3500, 785], [3537, 777], [3537, 735], [3565, 727], [3592, 704]]
);
const idTbar = [[3742, 219], [3800, 154], [3865, 145], [3952, 145], [4129, 145]];
const idTstem = [[3952, 145], [3952, 400], [3952, 608], [3938, 662], [3885, 688], [3812, 645]];
const idAhun = [].concat(
  [[4262, 519], [4192, 509], [4138, 531], [4123, 592], [4131, 654], [4177, 688], [4238, 660], [4262, 650], [4262, 580], [4262, 519], [4262, 580], [4262, 650], [4300, 690], [4365, 631], [4391, 621]],
  [[4394, 546], [4400, 522], [4446, 408], [4469, 292], [4473, 185], [4435, 135], [4400, 154], [4394, 300], [4394, 450], [4394, 546], [4394, 621], [4394, 681], [4394, 621], [4394, 546], [4400, 522], [4477, 509], [4523, 531], [4532, 562], [4535, 654], [4569, 690], [4631, 673], [4662, 645]],
  [[4662, 580], [4662, 515], [4662, 580], [4662, 645], [4708, 690], [4773, 660], [4798, 650], [4798, 580], [4798, 515], [4798, 580], [4798, 650], [4846, 690], [4900, 612], [4912, 554], [4946, 509], [4990, 550]],
  stem(4990, 550, 682), [[5013, 540], [5077, 509], [5127, 562], [5129, 669], [5146, 690], [5181, 681]]
);

// ---- "selamat ulang tahun" (x0 = 102) ----
// Word-initial s starts at its top and ends in a tail at the lower left; the
// pen comes back along the baseline to join the e.
const ids = [].concat(
  [[259, 523], [208, 506], [158, 554], [208, 592], [254, 631], [246, 686], [200, 692], [140, 671], [200, 692], [246, 686], [300, 688], [362, 668], [377, 658]],
  [[442, 554], [400, 509], [350, 562], [377, 658], [392, 673], [446, 690], [531, 642], [554, 631]],
  [[560, 552], [615, 408], [631, 254], [596, 135], [554, 254], [554, 450], [560, 552], [554, 631], [565, 662], [615, 691], [677, 658], [695, 648]],
  oval(695, 835), [[869, 690], [912, 673], [935, 608], [946, 554], [985, 509], [1023, 548]],
  stem(1023, 548, 682), [[1046, 538], [1100, 509], [1156, 546]],
  stem(1156, 546, 681), [[1177, 538], [1231, 509], [1286, 562], [1290, 640], [1327, 690], [1388, 658], [1404, 648]],
  oval(1404, 1544), [[1577, 690], [1646, 658], [1673, 646], [1673, 560], [1673, 431], [1673, 560], [1673, 646], [1704, 690], [1742, 677]]
);
const idu = [].concat(
  [[1938, 515], [1938, 600], [1942, 654], [1985, 690], [2050, 662], [2075, 650], [2075, 580], [2075, 517], [2075, 580], [2075, 650], [2112, 690], [2185, 646], [2208, 636]],
  [[2214, 554], [2269, 408], [2286, 254], [2250, 135], [2209, 254], [2209, 450], [2214, 554], [2208, 636], [2215, 654], [2269, 690], [2331, 658], [2350, 648]],
  oval(2350, 2488), [[2523, 690], [2577, 646], [2604, 538], [2638, 509], [2678, 550]],
  stem(2678, 550, 682), [[2704, 540], [2762, 509], [2817, 562], [2819, 640], [2854, 690], [2915, 658], [2931, 648]],
  oval(2931, 3071), [[3071, 735], [3071, 777], [3071, 900], [3071, 985], [3015, 1065], [2969, 969], [2996, 846], [3042, 785], [3071, 777], [3071, 735], [3100, 727], [3127, 704]]
);
const idt = [].concat(
  [[3321, 431], [3321, 560], [3321, 654], [3381, 690], [3442, 658], [3460, 648]],
  oval(3460, 3600), [[3635, 690], [3685, 658], [3729, 621]],
  [[3732, 546], [3738, 522], [3781, 438], [3800, 331], [3810, 192], [3773, 135], [3732, 177], [3732, 350], [3732, 546], [3732, 621], [3732, 681], [3732, 621], [3732, 546], [3738, 522], [3815, 509], [3854, 527], [3869, 562], [3871, 640], [3900, 690], [3962, 662], [4000, 645]],
  [[4000, 580], [4000, 517], [4000, 580], [4000, 645], [4046, 690], [4112, 662], [4136, 650], [4136, 580], [4136, 517], [4136, 580], [4136, 650], [4173, 690], [4219, 665], [4250, 554], [4292, 509], [4328, 550]],
  stem(4328, 550, 682), [[4350, 540], [4419, 509], [4465, 562], [4468, 640], [4488, 690], [4519, 681]]
);

module.exports = {
  faces: [
    {
      font: "Playwrite US Trad",
      weight: 400,
      base: 500,
      height: 800,
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
    },
    {
      font: "Playwrite ID",
      weight: 400,
      base: 700,
      height: 1100,
      phrases: [
        {
          text: "selamat ulang tahun",
          x0: 102,
          strokes: [
            { kind: "line", pts: ids },
            { kind: "line", pts: [[1636, 515], [1731, 515]] },
            { kind: "line", pts: idu },
            { kind: "line", pts: idt },
            { kind: "line", pts: [[3283, 515], [3378, 515]] }
          ]
        },
        {
          text: "Selamat Ulang Tahun",
          x0: 77,
          strokes: [
            { kind: "line", pts: idS },
            { kind: "line", pts: idElamat },
            { kind: "line", pts: [[1815, 515], [1909, 515]] },
            { kind: "line", pts: idUlang },
            { kind: "line", pts: idTbar },
            { kind: "line", pts: idTstem },
            { kind: "line", pts: idAhun }
          ]
        }
      ]
    }
  ]
};
