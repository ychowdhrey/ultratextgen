#!/usr/bin/env node
/*
 * capture-printables-previews.js — one indexable sheet preview per printables
 * page, captured from the page's own engine.
 *
 * Why it exists
 * -------------
 * The preview PNG is what a crawler that runs no JavaScript sees in the
 * tool's preview box, what the sitemap declares with an <image:title>, and
 * what the Pinterest button pins. It used to be drawn by a 1,456-line Python
 * re-implementation of the engine (generate-printables-previews.py, retired
 * 2026-09-23), and a second copy drifts: measured that day, it still dotted
 * the letter OUTLINE after the engine had moved to the writing centreline
 * (double columns of dots, doubled dots where contours overlap), it drew no
 * counters on the dot-to-dot A, it centred words the engine starts at the
 * left, it printed "E mma" from a font-metrics mismatch, and a re-render
 * drew the calligraphy pages in script because their config had changed.
 *
 * So the preview is now page 1 of the PDF a visitor downloads. Each page is
 * opened in headless Chromium, its own primary "Download PDF" is pressed, and
 * the canvases printablePdf.js is about to write are captured instead of
 * downloaded. The image cannot disagree with the product, because it is the
 * product.
 *
 * Build-time only, the same line generate-site-art.py draws: nothing here
 * ships, the site serves the PNG. Nothing is added to package.json — install
 * the browser driver for the run (`npm i --no-save playwright-core`) and point
 * it at a Chromium with --chromium or CHROMIUM_PATH.
 *
 * Which PDF
 * ---------
 * PRIMARY lists each tool's own PDF button, most specific first; the first
 * one a page carries is pressed. Two page shapes take a URL preset first, a
 * real configuration the tool offers:
 *   - an alphabet landing prints `?size=small`, the whole set tiled on a
 *     sheet. Its default is one big letter per page, which would make the
 *     landing's image a duplicate of its own letter-A spoke's.
 * and the coloring-page maker presses its own heart-fill and star-border
 * controls and types the page's example heading first (capture_setup()).
 * The page list, slugs and alt text come from scripts/lib/printables_previews.py
 * (via wire-printables-previews.py --list-json), so they have one owner.
 *
 * Usage
 * -----
 *   node scripts/capture-printables-previews.js --only printables-name-tracing
 *   node scripts/capture-printables-previews.js --all
 *   node scripts/capture-printables-previews.js --all --dry-run
 * A bare run is refused (exit 2). --only matches the slug by PREFIX. Exit 1
 * when any page fails to capture or captures blank; a failure never leaves
 * the previous file half-written.
 * Then: python3 scripts/wire-printables-previews.py --write (it reads each
 * PNG's real size into the <img>).
 */
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const OUT_W = 1000;                 // px; the height follows the page's paper
const BORDER = "#e2e8f0";           // a hairline so a white sheet reads as a sheet
const MIN_INK = 0.002;              // share of dark pixels below which a capture is blank

const PRIMARY = [
  "#pt-gen-print", "#pt-design-print", "#pt-banner-print", "#pt-puzzle-print",
  "#mono-print", "#cs-print", "#pt-practice-print", "#pt-alphabet-print",
  "#pt-name-print", ".pt-pdf-btn"
];

function usage(code) {
  process.stderr.write("usage: capture-printables-previews.js (--all | --only PREFIX ...) [--dry-run] [--chromium PATH]\n");
  process.exit(code);
}

function parseArgs(argv) {
  const a = { only: [], all: false, dryRun: false, chromium: process.env.CHROMIUM_PATH || "" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--all") a.all = true;
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--only") a.only.push(argv[++i] || "");
    else if (k === "--chromium") a.chromium = argv[++i] || "";
    else if (k === "-h" || k === "--help") usage(0);
    else { process.stderr.write("unknown argument " + k + "\n"); usage(2); }
  }
  if (!a.all && !a.only.length) {
    process.stderr.write("refusing a bare run: pass --all or --only PREFIX\n");
    usage(2);
  }
  return a;
}

function loadDriver() {
  for (const name of ["playwright", "playwright-core"]) {
    try { return require(name).chromium; } catch (e) { /* try the next */ }
  }
  process.stderr.write("No browser driver. Run `npm i --no-save playwright-core` (nothing is added to package.json).\n");
  process.exit(2);
}

function pageList() {
  const out = execFileSync("python3", [path.join(__dirname, "wire-printables-previews.py"), "--list-json"],
    { cwd: REPO, encoding: "utf8" });
  return JSON.parse(out);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".txt": "text/plain"
};

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(REPO, path.normalize(p));
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Runs in the page: press the primary PDF button and hand back page 1 of what
// printablePdf.js was about to write, composed the way fromCanvases() places
// it on the paper.
async function captureInPage(args) {
  const { primary, outW, border, minInk } = args;
  const UTG = window.UltraTextGen;
  if (!UTG || !UTG.pdf) return { error: "printablePdf.js did not load" };
  let cap = null;
  UTG.pdf.fromCanvases = async (canvases, opts) => { cap = { c: canvases[0], opts: opts || {} }; return new Blob([]); };
  UTG.pdf.download = () => {};
  let btn = null, used = "";
  for (const sel of primary) {
    const el = Array.from(document.querySelectorAll(sel)).find((b) => b.getBoundingClientRect().width > 0);
    if (el) { btn = el; used = sel; break; }
  }
  if (!btn) return { error: "no primary PDF button on the page" };
  btn.click();
  const t0 = Date.now();
  while (!cap && Date.now() - t0 < 90000) await new Promise((r) => setTimeout(r, 100));
  if (!cap || !cap.c) return { error: "no page was rendered after pressing " + used };
  const paper = cap.opts.paperIn || { w: 8.5, h: 11 };
  const margin = cap.opts.marginIn || { x: 0.5, y: 0.5 };
  const k = outW / paper.w;
  const W = outW, H = Math.round(paper.h * k);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  // fromCanvases(): fit the box's width (or height), centre across, top-align.
  const boxW = W - 2 * margin.x * k, boxH = H - 2 * margin.y * k;
  let dw = boxW, dh = boxW * cap.c.height / cap.c.width;
  if (dh > boxH) { dh = boxH; dw = boxH * cap.c.width / cap.c.height; }
  x.imageSmoothingQuality = "high";
  x.drawImage(cap.c, margin.x * k + (boxW - dw) / 2, margin.y * k, dw, dh);
  x.strokeStyle = border; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
  const px = x.getImageData(0, 0, W, H).data;
  let ink = 0;
  for (let i = 0; i < px.length; i += 16) if (px[i] < 128) ink++;
  const inkShare = ink / (px.length / 16);
  if (inkShare < minInk) return { error: "blank capture (" + (100 * inkShare).toFixed(2) + "% ink) from " + used };
  return { png: cv.toDataURL("image/png"), used, w: W, h: H, paper: paper.w + "x" + paper.h };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  let pages = pageList();
  if (a.only.length) pages = pages.filter((p) => a.only.some((o) => p.slug.startsWith(o)));
  if (!pages.length) { process.stderr.write("no pages matched\n"); process.exit(2); }
  if (a.dryRun) {
    pages.forEach((p) => console.log(p.slug + "\t" + p.url + p.query));
    console.log(pages.length + " page(s) would be captured");
    return;
  }
  const chromium = loadDriver();
  const server = await serve();
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch(a.chromium ? { executablePath: a.chromium } : {});
  let wrote = 0, same = 0;
  const failed = [];
  try {
    for (const p of pages) {
      // A fresh context per page: the print settings persist in localStorage
      // across the whole pillar, and one page's choice must not leak into the
      // next capture.
      // A locale with NO region, so printPrefs.defaultPaper() falls through
      // to the page's own language: Letter for an English page, A4 for every
      // other language this site ships -- the paper that page's visitors get.
      // "en-US" captured the German, Polish and Indonesian sheets on Letter.
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, locale: "en" });
      await ctx.route(/googletagmanager|googlesyndication|fundingchoices|doubleclick|google-analytics/, (r) => r.abort());
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      try {
        await page.goto(base + p.url + p.query, { waitUntil: "load", timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(700);
        if (p.setup) {
          await page.evaluate((st) => {
            const hd = document.querySelector("#pt-design-heading");
            if (hd && st.heading) { hd.value = st.heading; hd.dispatchEvent(new Event("input", { bubbles: true })); }
            (st.click || []).forEach((sel) => {
              const el = document.querySelector(sel);
              if (!el) throw new Error("setup control missing: " + sel);
              el.click();
            });
          }, p.setup);
          await page.waitForTimeout(400);
        }
        await page.addScriptTag({ url: "/js/printables/printablePdf.js" });
        const r = await page.evaluate(captureInPage, { primary: PRIMARY, outW: OUT_W, border: BORDER, minInk: MIN_INK });
        if (r.error || errs.length) {
          failed.push(p.slug + ": " + (r.error || "page error: " + errs[0]));
        } else {
          const buf = Buffer.from(r.png.split(",")[1], "base64");
          const out = path.join(REPO, p.out);
          if (fs.existsSync(out) && fs.readFileSync(out).equals(buf)) { same++; }
          else { fs.writeFileSync(out + ".tmp", buf); fs.renameSync(out + ".tmp", out); wrote++; }
          console.log(p.slug + "\t" + r.used + "\t" + r.w + "x" + r.h + "\t" + r.paper + "in");
        }
      } catch (e) {
        failed.push(p.slug + ": " + e.message.split("\n")[0]);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(wrote + " written, " + same + " unchanged, " + failed.length + " failed");
  failed.forEach((f) => console.log("FAIL " + f));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
