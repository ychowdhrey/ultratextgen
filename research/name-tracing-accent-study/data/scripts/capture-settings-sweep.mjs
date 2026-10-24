#!/usr/bin/env node
// accent study: capture exact UTG native previews, PDF exports, and PNG exports.
// No published research conclusion is encoded here; this is an evidence collector.
// Run from the repository root: node <this-file> --repo . --fixtures fixtures/names-main-26.json --plan fixtures/settings-sweep-plan.json --out /tmp/accent-sweep
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {createRequire} from "node:module";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(flag("--fixtures"),"utf8"));
function flag(n,fallback="") { const i=process.argv.indexOf(n); return i<0?fallback:(process.argv[i+1]||fallback); }
const root = path.resolve(flag("--repo"));
const out = path.resolve(flag("--out",path.join(here,"local-output")));
const plan = JSON.parse(fs.readFileSync(flag("--plan"),"utf8"));
const limit = spec.cases.length;
const chromiumPath = flag("--chromium",process.env.CHROMIUM_PATH||"");
if(!process.argv.includes("--repo") || !fs.existsSync(path.join(root,"js/printables/printablesEngine.js"))) {
  throw Error("Pass --repo with a real checked-out UltraTextGen public repository");
}
if(!Number.isSafeInteger(limit)||limit<1) throw Error("--limit must be a positive integer");
let sha="unknown";
try { sha=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(); }catch {}
if(sha==="unknown") throw Error("Public checkout must be a Git worktree for an auditable source SHA");
fs.mkdirSync(out,{recursive:true});
let chromium;
try { chromium=require("playwright").chromium; }
catch { chromium=require("playwright-core").chromium; }
const MIME={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",
  ".webp":"image/webp",".woff2":"font/woff2",".woff":"font/woff",".ico":"image/x-icon"};
const server=http.createServer((req,res)=>{
  let route;
  try {route=decodeURIComponent((req.url||"/").split("?")[0]);}
  catch {res.writeHead(400).end();return;}
  if(route.endsWith("/")) route+="index.html";
  const abs=path.resolve(root,"."+route);
  if(!abs.startsWith(root+path.sep)||!fs.existsSync(abs)||!fs.statSync(abs).isFile()) {
    res.writeHead(404).end();return;
  }
  res.writeHead(200,{"content-type":MIME[path.extname(abs)]||"application/octet-stream"});
  fs.createReadStream(abs).pipe(res);
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch(chromiumPath?{executablePath:chromiumPath,headless:true}:{headless:true});
const rows=[];
const started=new Date().toISOString();
const cases=spec.cases.filter(c=>plan.fixtures.includes(c.id));
const surfaces=spec.surfaces.filter(x=>plan.routes.includes(x.id));
try {
  for(const setting of plan.settings) for(const surface of surfaces) {
    if(!fs.existsSync(path.join(root,surface.url,"index.html"))) {
      rows.push({setting:setting.id,surface:surface.id,status:"MISSING_SURFACE",route:surface.url});
      continue;
    }
    for(const item of cases) {
      const key=surface.id+"__"+item.id;
      const dir=path.join(out,setting.id,key);
      fs.mkdirSync(dir,{recursive:true});
      const record={setting:setting.id,prefs:setting.prefs,rows:setting.rows,surface:surface.id,route:surface.url,id:item.id,fixture_class:item.class,
        input:item.text,input_codepoints:[...item.text].map(x=>"U+"+x.codePointAt(0).toString(16).toUpperCase()),
        public_sha:sha,at:new Date().toISOString(),status:"NOT_TESTED"};
      const ctx=await browser.newContext({viewport:{width:1280,height:1000},
        deviceScaleFactor:1,locale:"en",acceptDownloads:true});
      // No ad, analytics, consent or external source is necessary to render a worksheet.
      await ctx.route(/googletagmanager|googlesyndication|fundingchoices|doubleclick|google-analytics/,r=>r.abort());
      await ctx.addInitScript(p=>{try{localStorage.setItem("utg_print_prefs",JSON.stringify(p));}catch(e){}},setting.prefs);
      const page=await ctx.newPage();
      const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      try {
        await page.goto(base+surface.url,{waitUntil:"load",timeout:45000});
        await page.evaluate(()=>document.fonts.ready);
        if(await page.locator("#pt-name-input").count()!==1) throw Error("Missing canonical name input");
        if(setting.rows&&await page.locator("#pt-name-rows").count()) await page.locator("#pt-name-rows").selectOption(String(setting.rows)); else if(setting.rows) record.rows_control="MISSING";
        await page.locator("#pt-name-input").fill(item.text);
        await page.waitForTimeout(400);
        record.preview=await page.evaluate(()=>{
          const box=document.querySelector("#pt-name-preview");
          const svgs=box?[...box.querySelectorAll("svg")]:[];
          return {input_value:document.querySelector("#pt-name-input").value,
            svg_count:svgs.length,svg_text:svgs.map(s=>s.textContent),
            svg_viewboxes:svgs.map(s=>s.getAttribute("viewBox")),
            has_replacement_character:!!box && box.textContent.includes("\uFFFD"),
            bounding_box:box?(()=>{const b=box.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};})():null,
            font_status:document.fonts.status};
        });
        await page.locator("#pt-name-preview").screenshot({path:path.join(dir,"preview.png")});
        // Preserve the real PDF export; merely mirror the same source canvas that is handed
        // to printablePdf.js. This is UTG's own page and own renderer, not a mocked font.
        // The engine fetches printablePdf.js lazily on the first PDF click and reuses
        // window.UltraTextGen.pdf if present (printablesEngine.js loadPdfModule), so loading
        // the same file first does not change the code path; it only lets the hook attach.
        await page.addScriptTag({url:"/js/printables/printablePdf.js"});
        await page.evaluate(()=>{
          const pdf=window.UltraTextGen?.pdf;
          if(!pdf||!pdf.fromCanvases) throw Error("PDF export engine not available");
          const orig=pdf.fromCanvases;
          window.__s17capture=null;
          pdf.fromCanvases=async function(canvases,opts){
            window.__s17capture={pages:canvases.length,
              first_canvas:canvases[0]?.toDataURL("image/png")||null,
              canvas_sizes:canvases.map(c=>[c.width,c.height]),
              paper:opts?.paperIn||null,margin:opts?.marginIn||null};
            return orig.call(this,canvases,opts);
          };
        });
        const pdfDownload=page.waitForEvent("download",{timeout:45000});
        await page.locator("#pt-name-print").click();
        const pdf=await pdfDownload;
        await pdf.saveAs(path.join(dir,"sheet.pdf"));
        const cap=await page.evaluate(()=>window.__s17capture);
        if(!cap||!cap.first_canvas) throw Error("Native PDF export had no captured raster");
        fs.writeFileSync(path.join(dir,"pdf-first-canvas.png"),Buffer.from(cap.first_canvas.split(",")[1],"base64"));
        record.export={pages:cap.pages,paper:cap.paper,margin:cap.margin,
          canvas_sizes:cap.canvas_sizes,pdf_filename:pdf.suggestedFilename()};
        if(await page.locator("#pt-name-png").count()) {
          const pngDownload=page.waitForEvent("download",{timeout:45000});
          await page.locator("#pt-name-png").click();
          const png=await pngDownload;
          await png.saveAs(path.join(dir,"download.png"));
          record.export.png_filename=png.suggestedFilename();
        } else record.export.png_status="NO_PNG_CONTROL";
        record.status=errors.length?"PAGE_SCRIPT_ERRORS":"CAPTURED";
      } catch(e) {
        record.status="CAPTURE_FAILED";
        record.error=String(e.message||e);
      } finally {
        record.page_errors=errors;
        fs.writeFileSync(path.join(dir,"metadata.json"),JSON.stringify(record,null,2)+"\n");
        rows.push(record);
        console.log(record.status+"\t"+setting.id+"/"+key+(record.error?"\t"+record.error:""));
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
const statusCount={};
for(const r of rows) statusCount[r.status]=(statusCount[r.status]||0)+1;
const manifest={study:"accent study",run_at:started,finished_at:new Date().toISOString(),
  fixture_version:spec.fixture_version,public_sha:sha,chromium_version:await (async()=>chromiumPath||"bundled")(),
  cases_requested:cases.length,surfaces_requested:surfaces.length,settings_requested:plan.settings.length,status_count:statusCount};
fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({manifest,rows},null,2)+"\n");
console.log(JSON.stringify(manifest,null,2));
if(rows.some(r=>r.status!=="CAPTURED")) process.exitCode=1;
