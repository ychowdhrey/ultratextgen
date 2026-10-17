#!/usr/bin/env node
// Browser check of the faces in one font environment (headless Chromium): drawing check for missing characters, widths, copy and paste.
// Usage: PLAYWRIGHT_NODE_MODULES=<folder containing playwright> CHROMIUM_PATH=<chrome binary> node font-test-browser.mjs <name> <fontconfig file | system> <font-test-input.json> <output.json> [--roundtrip]
import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import { execSync } from "node:child_process"; import os from "node:os";
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.PLAYWRIGHT_NODE_MODULES + "/")("playwright");
const here = path.dirname(new URL(import.meta.url).pathname);
const env = process.argv[2]; const fcArg = process.argv[3]; const inputPath = process.argv[4]; const outPath = process.argv[5]; const doRT = process.argv.includes("--roundtrip");
const stim = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const childEnv = { ...process.env }; let fcfile = null;
if (fcArg !== "system") { fcfile = path.resolve(fcArg); childEnv.FONTCONFIG_FILE = fcfile; }
const fcList = execSync("fc-list : family file | sort", { env: childEnv }).toString();
const srv = http.createServer((q, s) => { s.writeHead(200, { "content-type": "text/html; charset=utf-8" }); s.end("<!doctype html><meta charset=utf-8><body></body>"); });
await new Promise(r => srv.listen(0, "127.0.0.1", r)); const origin = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--font-render-hinting=none"], env: childEnv });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage(); await page.goto(origin);
const out = { env, started: new Date().toISOString(), chromium: browser.version(), playwright: "1.56.1", node: process.version, os: `${os.type()} ${os.release()}`, fontconfig_file: fcfile ? path.basename(fcfile) : "(system default)", fonts: fcList.split("\n").filter(Boolean), dpr: 1, viewport: "1200x800", lang: await page.evaluate(() => navigator.language) };
// ---- Detector 1: per-scalar canvas notdef-bitmap match
out.scalar_glyph = await page.evaluate(({ scalars, refs, controls }) => {
  const cv = document.createElement("canvas"); cv.width = 90; cv.height = 90; const x = cv.getContext("2d", { willReadFrequently: true });
  x.font = "48px sans-serif"; x.textBaseline = "alphabetic";
  const draw = s => { x.clearRect(0, 0, 90, 90); x.fillStyle = "#000"; x.fillText(s, 8, 60); const d = x.getImageData(0, 0, 90, 90).data; let h = "", n = 0; for (let i = 3; i < d.length; i += 4) { const on = d[i] > 127; h += on ? "1" : "0"; if (on) n++; } return { h, n, w: x.measureText(s).width }; };
  const isMark = cp => /[\p{M}\p{Cf}]/u.test(String.fromCodePoint(cp));
  const R = refs.map(c => ({ c, a: draw(String.fromCodePoint(c)), m: draw("o" + String.fromCodePoint(c)) }));
  const res = {}; for (const { cp } of scalars) { const mk = isMark(cp); const r = draw(mk ? "o" + String.fromCodePoint(cp) : String.fromCodePoint(cp)); let tofu = false; for (const rf of R) { const ref = mk ? rf.m : rf.a; if (r.h === ref.h && r.n > 0) { tofu = true; break; } } res[cp] = { tofu, blank: r.n === 0 || (mk && r.n === draw("o").n), n: r.n }; }
  const ctl = {}; for (const [k, v] of Object.entries(controls)) { const r = draw(v); ctl[k] = { missing_any: [...v].some(ch => R.some(rf => draw(ch).h === rf.a.h && draw(ch).n > 0)) }; }
  return { per_scalar: res, controls: ctl, ref_ink: R.map(r => r.a.n) };
}, { scalars: stim.scalars, refs: stim.refs, controls: stim.controls });
// ---- CDP font attribution + width + overflow per face
const cdp = await ctx.newCDPSession(page); await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
await page.evaluate(() => { document.body.innerHTML = '<div id="h" style="position:absolute;left:0;top:0;font:24px sans-serif;white-space:pre"><span id="t"></span></div>'; });
const faceRows = [];
for (const f of stim.faces) {
  const r = await page.evaluate(s => { const t = document.getElementById("t"); const m = {};
    const w = fam => { t.style.fontFamily = fam; t.textContent = s; return t.getBoundingClientRect().width; };
    m.w_dejavu_mono = w('"DejaVu Sans Mono", monospace'); m.w_wqy_mono = w('"WenQuanYi Zen Hei Mono", monospace'); m.w_sans = w("sans-serif");
    t.style.fontFamily = "sans-serif"; t.textContent = s; m.w_sans_px = t.getBoundingClientRect().width; m.ref_em = 24; return m; }, f.s);
  const doc = await cdp.send("DOM.getDocument", { depth: 1 }); const q = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "#t" });
  await page.evaluate(s => { const t = document.getElementById("t"); t.style.fontFamily = "sans-serif"; t.textContent = s; }, f.s);
  const pf = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: q.nodeId });
  faceRows.push({ id: f.id, ...r, fonts_used: pf.fonts.map(x => `${x.familyName}:${x.glyphCount}`).join("|"), n_families: pf.fonts.length });
}
out.faces = faceRows;
// ---- Outcome (a) round trips, real input pipeline
if (doRT) {
  await page.evaluate(() => { document.body.innerHTML = '<input id="i"><textarea id="a"></textarea><div id="c" contenteditable="true"></div>'; });
  const nf = (s, k) => s.normalize(k);
  const rt = [];
  for (const f of stim.faces) {
    const s = f.s, row = { id: f.id };
    for (const [ctxname, sel] of [["input", "#i"], ["textarea", "#a"], ["contenteditable", "#c"]]) {
      await page.evaluate(sel => { const e = document.querySelector(sel); if ("value" in e) e.value = ""; else e.textContent = ""; e.focus(); }, sel);
      await page.keyboard.insertText(s);
      const got = await page.evaluate(sel => { const e = document.querySelector(sel); return "value" in e ? { v: e.value } : { v: e.textContent, inner: e.innerText }; }, sel);
      row[ctxname] = got.v === s; if (got.inner !== undefined) row.contenteditable_innerText = got.inner === s;
      if (got.v !== s) row[ctxname + "_got"] = got.v;
    }
    row.clipboard = await page.evaluate(async s => { try { await navigator.clipboard.writeText(s); return (await navigator.clipboard.readText()) === s; } catch (e) { return "ERR:" + e.message; } }, s);
    row.json = JSON.parse(JSON.stringify({ s })).s === s; row.uri = decodeURIComponent(encodeURIComponent(s)) === s;
    row.localStorage = await page.evaluate(s => { try { localStorage.setItem("k", s); return localStorage.getItem("k") === s; } catch (e) { return "ERR"; } }, s);
    row.nfc_changes_corpus_string = nf(s, "NFC") !== s; row.nfkc_changes_corpus_string = nf(s, "NFKC") !== s;
    rt.push(row);
  }
  out.roundtrip = rt;
}
out.finished = new Date().toISOString();
fs.writeFileSync(outPath, JSON.stringify(out) + "\n");
await browser.close(); srv.close();
console.log(env, "faces", faceRows.length, "controls", JSON.stringify(out.scalar_glyph.controls), doRT ? "roundtrip " + out.roundtrip.length : "");
