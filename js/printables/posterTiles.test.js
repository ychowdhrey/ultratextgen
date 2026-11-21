/* node js/printables/posterTiles.test.js  —  npm run test:poster-tiles
   ---------------------------------------------------------------
   The bulletin board letter maker cuts what is typed at 12 characters. Two
   facts about that cut are asserted here, because a wrong one is invisible on
   screen until the visitor has printed the sheets:

   1. A character is a grapheme, after NFC. "Nguyễn Thị Ánh" typed with a
      separate accent counts and cuts exactly like the same name typed with
      precomposed letters, and an emoji sequence (a family, a flag) is never cut
      in half. The characters the cut leaves off are named in the notice under
      the field, so the visitor sees them before they print.
   2. Text that was already 12 characters or fewer is untouched. Every
      scenario in posterTiles.fixtures.json was recorded from the module as it
      stood before the cut was made grapheme-aware, and records the plan (sheet
      counts, tile geometry, glyph placement), every canvas call that paints
      each sheet, and everything handed to the PDF writer. A change that moves
      one tile, one mark or one page fails here.

   Painting is recorded, not rasterised: a stand-in canvas logs each call and
   draws a deterministic block for a string's ink, so the test needs no browser
   and no font. The bytes a real browser writes for the same sheets are
   measured by driving the page, not here.

   Run:    node js/printables/posterTiles.test.js
   Record: node js/printables/posterTiles.test.js --record <path to the module as it was>
   (exit 1 on any failure) */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MODULE = path.join(__dirname, "posterTiles.js");
const FIXTURES = path.join(__dirname, "posterTiles.fixtures.json");

/* ---------------- a recording stand-in for the browser ---------------- */

function boot(src, opts) {
  const o = opts || {};
  const log = [];
  let nextId = 0;
  const els = {};
  const fontPx = (f) => { const m = /(\d+(?:\.\d+)?)px/.exec(f || ""); return m ? Number(m[1]) : 10; };
  const ser = (v) => (v && v.__canvas !== undefined ? "canvas#" + v.__canvas : v);

  function makeCanvas() {
    const cv = { __canvas: nextId++, width: 300, height: 150, className: "", fills: [], setAttribute() {} };
    const st = { font: "10px sans-serif" };
    cv.getContext = function () {
      if (cv.__ctx) return cv.__ctx;
      cv.__ctx = new Proxy({}, {
        get(_t, k) {
          if (k === "canvas") return cv;
          if (k === "measureText") return (s) => ({ width: fontPx(st.font) * 0.6 * Array.from(String(s)).length });
          if (k === "getImageData") {
            // The ink of the last string drawn on this canvas: a block 0.6 em
            // wide per code point, 0.7 em above the baseline, 0.05 em below.
            return (x, y, w, h) => {
              const data = new Uint8ClampedArray(w * h * 4);
              cv.fills.forEach((f) => {
                const size = fontPx(f.font), n = Array.from(f.str).length;
                const x0 = Math.max(0, Math.round(f.x)), x1 = Math.min(w, Math.round(f.x + 0.6 * size * n));
                const y0 = Math.max(0, Math.round(f.y - 0.7 * size)), y1 = Math.min(h, Math.round(f.y + 0.05 * size));
                for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) data[(yy * w + xx) * 4 + 3] = 255;
              });
              return { data: data };
            };
          }
          if (k in st) return st[k];
          return (...a) => {
            log.push([cv.__canvas, k, a.map(ser)]);
            if (k === "fillText") cv.fills.push({ str: a[0], x: a[1], y: a[2], font: st.font });
          };
        },
        set(_t, k, v) { st[k] = v; log.push([cv.__canvas, "=" + k, ser(v)]); return true; }
      });
      return cv.__ctx;
    };
    return cv;
  }

  global.window = { UltraTextGen: {}, devicePixelRatio: 1, innerHeight: 800, addEventListener() {} };
  global.document = {
    readyState: "loading",
    title: "Bulletin Board Letters",
    documentElement: { lang: "en" },
    head: { appendChild() {} },
    createElement: (tag) => (tag === "canvas" ? makeCanvas() : { setAttribute() {}, appendChild() {}, style: {} }),
    getElementById: (id) => (id in els ? els[id] : null),
    querySelector: () => null
  };
  global.location = { pathname: "/printables/bulletin-board-letters/" };
  global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  global.requestAnimationFrame = (fn) => { fn(); return 0; };
  global.cancelAnimationFrame = () => {};
  const realSegmenter = Intl.Segmenter;
  if (o.noSegmenter) Intl.Segmenter = undefined;
  try {
    new Function(fs.readFileSync(path.join(__dirname, "printPrefs.js"), "utf8"))();
    new Function(src)();
  } finally {
    Intl.Segmenter = realSegmenter;
  }

  const pdfCalls = [];
  const UTG = global.window.UltraTextGen;
  // Stand in for the PDF writer: it records what it is handed and paints each
  // page, which is everything the real writer reads.
  UTG.pdf = {
    supported: () => true,
    fromCanvases: (pages, popts) => {
      const painted = pages.map((p) => { p.getContext("2d"); return [p.width, p.height]; });
      pdfCalls.push({ pages: painted, opts: popts });
      return Promise.resolve({});
    },
    download: (_blob, name) => pdfCalls.push({ download: name })
  };
  return { UTG, T: UTG.posterTiles, log, els, pdfCalls };
}

const sha = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");

/* ---------------- recording a scenario ---------------- */

const SCENARIOS = [
  { name: "A, block outline, 12 in, Letter", text: "A", style: "block", fill: "outline", layout: "each", paper: "letter", unit: "in", height: 12 },
  { name: "Hello, block outline, each letter", text: "Hello", style: "block", fill: "outline", layout: "each", paper: "letter", unit: "in", height: 12 },
  { name: "Hello, block outline, word together", text: "Hello", style: "block", fill: "outline", layout: "word", paper: "letter", unit: "in", height: 8 },
  { name: "Ana, bubble filled, A4 in cm", text: "Ana", style: "bubble", fill: "filled", layout: "each", paper: "a4", unit: "cm", height: 30 },
  { name: "Hi 5, block filled, a space between", text: "Hi 5", style: "block", fill: "filled", layout: "each", paper: "letter", unit: "in", height: 10 },
  { name: "twelve characters, bubble outline", text: "abcdefghijkl", style: "bubble", fill: "outline", layout: "each", paper: "a4", unit: "in", height: 6 },
  { name: "twelve characters with spaces, word together", text: "Go Team Go 1", style: "block", fill: "outline", layout: "word", paper: "letter", unit: "in", height: 5 },
  { name: "precomposed accents, ordinary text", text: "Zoë Ánh", style: "block", fill: "outline", layout: "each", paper: "letter", unit: "in", height: 9 }
];

async function record(src, sc) {
  const b = boot(src);
  Object.assign(b.T.state, { text: sc.text, style: sc.style, fill: sc.fill, layout: sc.layout, paper: sc.paper, unit: sc.unit, height: sc.height });
  // A real page installs a document title and the stencil/PDF modules before
  // this point; the plan is the same call the preview and the PDF both make.
  const P = b.T.plan();
  if (!P) return { plan: null };
  const planOut = JSON.parse(JSON.stringify(P, (k, v) => (k === "st" ? sc.style : v)));
  const planHash = sha(planOut);
  b.log.length = 0;
  const ppi = 100;
  const pages = b.T.pagesOf(P);
  pages.forEach((pg, i) => {
    const cv = global.document.createElement("canvas");
    cv.width = Math.round(P.pw * ppi); cv.height = Math.round(P.ph * ppi);
    b.T.drawTile(cv, P, pg.pi, pg.r, pg.c, ppi, i);
  });
  const sheetOps = sha(b.log);
  // The whole PDF path: pages, links, bookmarks and the options handed over.
  b.log.length = 0;
  await b.T.makePdf();
  const pdf = b.pdfCalls;
  return {
    sheets: P.total, orient: P.orient, pieces: P.pieces.map((p) => p.text),
    plan: planHash, sheetOps: sheetOps, pdfInput: sha({ pdf: pdf, ops: b.log })
  };
}

/* ---------------- the checks ---------------- */

let failed = 0;
function check(name, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log("ok   " + name),
    (e) => { failed++; console.log("FAIL " + name + "\n     " + e.message); }
  );
}
const assert = require("assert");

async function main() {
  const src = fs.readFileSync(MODULE, "utf8");

  if (process.argv[2] === "--record") {
    // The module as it was does not expose makePdf; the test needs the same
    // call the Download PDF button makes, so the export line gains it here.
    const base = fs.readFileSync(path.resolve(process.argv[3]), "utf8")
      .replace("UTG.posterTiles = { state: state,", "UTG.posterTiles = { makePdf: makePdf, state: state,");
    if (base.indexOf("makePdf: makePdf") < 0) throw new Error("the module's export line was not found");
    const out = {};
    for (const sc of SCENARIOS) out[sc.name] = await record(base, sc);
    fs.writeFileSync(FIXTURES, JSON.stringify(out, null, 2) + "\n");
    console.log("recorded " + SCENARIOS.length + " scenarios to " + path.basename(FIXTURES));
    return;
  }

  const split = (text, o) => { const b = boot(src, o); b.T.state.text = text; return { sp: b.T.splitText(), notice: b.T.limitNotice(), b: b }; };
  const NAME_NFC = "Nguyễn Thị Ánh";
  const NAME_NFD = NAME_NFC.normalize("NFD");

  await check("Nguyễn Thị Ánh (NFC): the first 12 characters print and \"nh\" is named", () => {
    assert.strictEqual(NAME_NFC.normalize("NFC"), NAME_NFC);
    const r = split(NAME_NFC);
    assert.strictEqual(r.sp.kept.join(""), "Nguyễn Thị Á");
    assert.strictEqual(r.sp.dropped.join(""), "nh");
    assert.ok(r.notice.indexOf("“nh”") >= 0, "notice names nh: " + r.notice);
    assert.ok(r.notice.indexOf("12") >= 0, "notice states the limit: " + r.notice);
    assert.ok(!/—/.test(r.notice), "no em dash in the notice");
  });

  await check("Nguyễn Thị Ánh (NFD) gives the same result as NFC", () => {
    assert.notStrictEqual(NAME_NFD, NAME_NFC);
    const a = split(NAME_NFC), d = split(NAME_NFD);
    assert.deepStrictEqual(d.sp, a.sp);
    assert.strictEqual(d.notice, a.notice);
    // ị kept: the kept text still holds the dot-below letter, in NFC.
    assert.ok(d.sp.kept.join("").indexOf("ị") >= 0, "ị kept");
    const pa = a.b.T.plan(), pd = d.b.T.plan();
    assert.deepStrictEqual(pd.pieces.map((p) => p.text), pa.pieces.map((p) => p.text));
    assert.strictEqual(sha(JSON.parse(JSON.stringify(pd, (k, v) => (k === "st" ? 0 : v)))), sha(JSON.parse(JSON.stringify(pa, (k, v) => (k === "st" ? 0 : v)))));
    pd.pieces.forEach((p) => assert.ok(!/^\p{M}+$/u.test(p.text), "no sheet of a bare accent: " + JSON.stringify(p.text)));
  });

  const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";
  const FLAG = "\u{1F1F0}\u{1F1F7}";
  await check("seven emoji, three of them sequences, count as seven", () => {
    const seven = ["\u{1F600}", "\u{1F389}", FAMILY, FLAG, "❤️", "\u{1F44D}\u{1F3FD}", "\u{1F31F}"];
    const r = split(seven.join(""));
    assert.deepStrictEqual(r.sp.kept, seven);
    assert.strictEqual(r.sp.dropped.length, 0);
    assert.strictEqual(r.notice, "");
    const P = r.b.T.plan();
    assert.deepStrictEqual(P.pieces.map((p) => p.text), seven, "each emoji is one piece");
  });

  await check("13 graphemes drop exactly the 13th and name it, whole", () => {
    const eleven = new Array(11).fill("\u{1F600}");
    [FLAG, FAMILY].forEach((last) => {
      const r = split(eleven.join("") + FAMILY + last);
      assert.strictEqual(r.sp.kept.length, 12);
      assert.strictEqual(r.sp.kept[11], FAMILY, "the 12th is whole");
      assert.deepStrictEqual(r.sp.dropped, [last]);
      assert.ok(r.notice.indexOf("“" + last + "”") >= 0, "the 13th is named whole: " + r.notice);
    });
  });

  await check("where Intl.Segmenter is missing it falls back to code points, and says nothing wrong for plain text", () => {
    const r = split("abcdefghijklmn", { noSegmenter: true });
    assert.strictEqual(r.sp.kept.join(""), "abcdefghijkl");
    assert.strictEqual(r.sp.dropped.join(""), "mn");
    const e = split(NAME_NFD, { noSegmenter: true });
    assert.ok(e.sp.kept.length === 12 && e.sp.kept.join("").normalize("NFC") === e.sp.kept.join(""), "NFC first, then counted");
  });

  await check("a long run names the first characters and counts the rest", () => {
    const r = split("a".repeat(12) + "b".repeat(30));
    assert.ok(/“b{20}” and 10 more/.test(r.notice), r.notice);
  });

  await check("the notice is written to the page's status line, and cleared when the text fits", async () => {
    const b = boot(src);
    b.els["bb-trim"] = { textContent: "" };
    b.els["bb-warn"] = { textContent: "" };
    b.T.state.text = NAME_NFC;
    b.T.refresh();
    assert.ok(b.els["bb-trim"].textContent.indexOf("“nh”") >= 0, b.els["bb-trim"].textContent);
    b.T.state.text = "Nguyễn";
    b.T.refresh();
    assert.strictEqual(b.els["bb-trim"].textContent, "");
  });

  await check("the page carries the notice as a polite status line and no maxlength on the field", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "..", "printables", "bulletin-board-letters", "index.html"), "utf8");
    assert.ok(/<p[^>]*id="bb-trim"[^>]*role="status"/.test(html) || /<p[^>]*role="status"[^>]*id="bb-trim"/.test(html), "bb-trim is a role=status element");
    const input = /<input[^>]*id="bb-text"[^>]*>/.exec(html);
    assert.ok(input && !/maxlength/i.test(input[0]), "bb-text has no maxlength, which would cut the text before the notice can see it");
  });

  // Short NFC text: identical to the module as it was.
  const fixtures = JSON.parse(fs.readFileSync(FIXTURES, "utf8"));
  for (const sc of SCENARIOS) {
    await check("12 characters or fewer, unchanged: " + sc.name, async () => {
      const want = fixtures[sc.name];
      assert.ok(want, "a fixture exists for this scenario");
      const got = await record(src, sc);
      assert.strictEqual(got.sheets, want.sheets, "sheet count");
      assert.deepStrictEqual(got.pieces, want.pieces, "pieces");
      assert.strictEqual(got.plan, want.plan, "plan: tile counts, geometry and glyph placement");
      assert.strictEqual(got.sheetOps, want.sheetOps, "every canvas call that paints each sheet");
      assert.strictEqual(got.pdfInput, want.pdfInput, "everything handed to the PDF writer");
    });
  }

  if (failed) { console.log("\n" + failed + " failed"); process.exit(1); }
  console.log("\nall passed");
}

main().catch((e) => { console.log("FAIL (harness) " + e.stack); process.exit(1); });
