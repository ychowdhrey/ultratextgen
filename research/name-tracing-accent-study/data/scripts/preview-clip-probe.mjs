#!/usr/bin/env node
// In-browser root-cause probe, independent of the PDF/PNG exporters.
// For each route x name: screenshot the preview area with the page's own SVG clipping, then again with the
// SVG overflow made visible; ink that exists only in the second image is ink the page itself clips.
// Usage: node previewclip.mjs --repo <public-repo> --fixtures <fixtures.json> --out <results.json>
import fs from "node:fs"; import path from "node:path"; import http from "node:http"; import {createRequire} from "node:module";
const require = createRequire(import.meta.url); const {chromium} = require("playwright"); const {PNG} = require("pngjs");
const arg = (n,d="") => { const i=process.argv.indexOf(n); return i<0?d:process.argv[i+1]; };
const root = path.resolve(arg("--repo")); const spec = JSON.parse(fs.readFileSync(arg("--fixtures"),"utf8"));
const MIME={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
const srv = http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split("?")[0]); if(u.endsWith("/"))u+="index.html"; const a=path.resolve(root,"."+u);
  if(!a.startsWith(root+path.sep)||!fs.existsSync(a)||!fs.statSync(a).isFile()){r.writeHead(404).end();return;} r.writeHead(200,{"content-type":MIME[path.extname(a)]||"application/octet-stream"}); fs.createReadStream(a).pipe(r);});
await new Promise(r=>srv.listen(0,"127.0.0.1",r)); const base="http://127.0.0.1:"+srv.address().port;
const browser = await chromium.launch(); const rows=[];
for (const surf of spec.surfaces) {
  const ctx = await browser.newContext({viewport:{width:1280,height:1400},deviceScaleFactor:2,locale:"en"});
  await ctx.route(/googletagmanager|googlesyndication|fundingchoices|doubleclick|google-analytics/,r=>r.abort());
  const page = await ctx.newPage();
  await page.goto(base+surf.url,{waitUntil:"load"}); await page.evaluate(()=>document.fonts.ready);
  for (const item of spec.cases) {
    const rec = {surface:surf.id, fixture:item.id, input:item.text};
    try {
      await page.locator("#pt-name-input").fill(item.text); await page.waitForTimeout(350); await page.evaluate(()=>document.fonts.ready);
      const info = await page.evaluate(()=>{const e=document.querySelector("#pt-name-preview"); e.scrollIntoView({block:"start"}); const b=e.getBoundingClientRect();
        return {box:{x:b.x,y:b.y,w:b.width,h:b.height}, svgs:[...e.querySelectorAll("svg")].map(v=>{const r=v.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};})};});
      const box = info.box; const pad = 160;
      const clip = {x:Math.max(0,box.x-20), y:Math.max(0,box.y-pad), width:box.w+40, height:Math.min(box.h+2*pad, 1400-Math.max(0,box.y-pad))};
      const DPR = 2;
      await page.addStyleTag({content:"#pt-name-preview svg{overflow:visible !important}", });
      const withText = PNG.sync.read(await page.screenshot({clip}));
      const st = await page.addStyleTag({content:"#pt-name-preview svg text{visibility:hidden !important}"});
      const noText = PNG.sync.read(await page.screenshot({clip}));
      const inside = (px,py)=>info.svgs.some(r=>{const x=(px/DPR)+clip.x, y=(py/DPR)+clip.y; return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;});
      let out=0, inn=0, minY=1e9, maxY=-1; const W=withText.width;
      for (let i=0;i<withText.data.length;i+=4){ const d=Math.abs(withText.data[i]-noText.data[i])+Math.abs(withText.data[i+1]-noText.data[i+1])+Math.abs(withText.data[i+2]-noText.data[i+2]);
        if(d>60){ const px=(i/4)%W, py=Math.floor(i/4/W); if(inside(px,py)) inn++; else {out++; if(py<minY)minY=py; if(py>maxY)maxY=py;} } }
      rec.text_ink_inside_svg_px = inn; rec.text_ink_outside_svg_px = out; rec.outside_y_range = out?[minY,maxY]:null;
      rec.clipped_frac = (inn+out)? out/(inn+out) : 0;
      await page.evaluate(()=>{ [...document.querySelectorAll("style")].filter(s=>/overflow:visible !important|visibility:hidden !important/.test(s.textContent)).forEach(s=>s.remove()); });
    } catch(e) { rec.error=String(e.message||e); }
    rows.push(rec); console.log(rec.surface, rec.fixture, rec.error||rec.text_ink_outside_svg_px);
  }
  await ctx.close();
}
await browser.close(); srv.close(); fs.writeFileSync(arg("--out"), JSON.stringify(rows,null,1)+"\n");
