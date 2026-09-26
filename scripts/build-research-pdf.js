#!/usr/bin/env node
/*
 * build-research-pdf.js — the downloadable PDF of a /research/ study, printed
 * from the study's own page.
 *
 * Why it exists
 * -------------
 * A study's HTML page is its canonical record: the findings, method and
 * limitations have to be in static HTML for readers and crawlers alike. The
 * PDF is the same record in a file a reader can keep, cite and pass on. If the
 * two were written separately they would drift, and a corrected finding could
 * survive in whichever copy nobody re-edited. So the PDF is the page, printed:
 * the @media print block in style.css (scoped to .research-page) hides the
 * site chrome, and this script adds a running header with the study title and
 * version and a footer with the canonical URL and page numbers, all read off
 * the page itself, so a downloaded copy stays identifiable on its own.
 *
 * Build-time only, the same line capture-printables-previews.js draws: nothing
 * here ships, the site serves the PDF. Nothing is added to package.json —
 * install the browser driver for the run (`npm i --no-save playwright-core`)
 * and point it at a Chromium with --chromium or CHROMIUM_PATH.
 *
 * Usage
 * -----
 *   node scripts/build-research-pdf.js --study printable-ink-efficiency-study
 * writes research/<study>.pdf from research/<study>/index.html. Exit 1 when the
 * page is missing, an image fails to load, or the page reports a script error.
 * Re-run it in the same change as any edit to the study page.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const REPO = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const a = { study: "", chromium: process.env.CHROMIUM_PATH || "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--study") a.study = argv[++i] || "";
    else if (argv[i] === "--chromium") a.chromium = argv[++i] || "";
    else { process.stderr.write(`unknown argument: ${argv[i]}\n`); process.exit(2); }
  }
  if (!/^[a-z0-9-]+$/.test(a.study)) {
    process.stderr.write("usage: build-research-pdf.js --study SLUG [--chromium PATH]\n");
    process.exit(2);
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

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const src = path.join(REPO, "research", a.study, "index.html");
  if (!fs.existsSync(src)) { process.stderr.write(`missing ${path.relative(REPO, src)}\n`); process.exit(1); }
  const out = path.join(REPO, "research", `${a.study}.pdf`);

  const chromium = loadDriver();
  const server = await serve();
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch(a.chromium ? { executablePath: a.chromium } : {});
  let code = 0;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 }, locale: "en" });
    // Third-party tags add nothing to a printed record and make the run depend on the network.
    await ctx.route(/googletagmanager|googlesyndication|fundingchoices|doubleclick|google-analytics/, (r) => r.abort());
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(`${base}/research/${a.study}/`, { waitUntil: "load" });
    // Lazy images below the fold never load for print unless asked to.
    const broken = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("main img, .hero img")];
      imgs.forEach((i) => { i.loading = "eager"; });
      await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      return imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src"));
    });
    if (broken.length) throw new Error("images failed to load: " + broken.join(", "));
    if (errs.length) throw new Error("page errors: " + errs.join(" | "));
    // Reference tables folded into <details> on screen belong in the printed record.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));

    // Links resolve against the local server; a printed copy must point at the live site.
    const rewritten = await page.evaluate((origin) => {
      const canonical = new URL(document.querySelector('link[rel="canonical"]').href).origin;
      let n = 0;
      document.querySelectorAll("a[href]").forEach((el) => {
        if (el.href.startsWith(origin)) { el.href = canonical + el.href.slice(origin.length); n++; }
      });
      return n;
    }, base);
    const meta = await page.evaluate(() => {
      const dd = [...document.querySelectorAll(".research-meta div")]
        .reduce((m, d) => (m[d.querySelector("dt").textContent.trim()] = d.querySelector("dd").textContent.trim(), m), {});
      return {
        title: document.querySelector("h1").textContent.trim(),
        canonical: document.querySelector('link[rel="canonical"]').href,
        version: dd.Version || "",
        published: dd.Published || ""
      };
    });
    if (!meta.version || !meta.published) throw new Error("the page carries no Version/Published in .research-meta");
    const small = "font-family:Helvetica,Arial,sans-serif;font-size:7.5px;color:#475569;width:100%;padding:0 14mm;";
    await page.pdf({
      path: out,
      format: "Letter",
      printBackground: false,
      margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="${small}display:flex;justify-content:space-between;"><span>UltraTextGen Research</span><span>${esc(meta.title.split(":")[0])} · Version ${esc(meta.version)} · ${esc(meta.published)}</span></div>`,
      footerTemplate: `<div style="${small}display:flex;justify-content:space-between;"><span>${esc(meta.canonical)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`
    });
    const kb = Math.round(fs.statSync(out).size / 1024);
    process.stdout.write(`wrote ${path.relative(REPO, out)} (${kb} KB) from ${meta.canonical}, version ${meta.version}; ${rewritten} links pointed at the live site\n`);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    code = 1;
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(code);
}

main();
