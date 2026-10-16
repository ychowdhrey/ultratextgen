// Renders every face through three Markdown engines that follow the standard, in three placements, and measures whether the visible text survives.
// Usage (after `npm install` with markdown-package.json saved as package.json): node markdown-test.mjs <faces.csv from this study, or faces-all-columns.csv from reproduce-corpus.py> <output folder>
// Not tested: the Markdown rules of Discord, Reddit, WhatsApp or any app.
import fs from "node:fs"; import path from "node:path";
import * as commonmark from "commonmark"; import MarkdownIt from "markdown-it"; import { marked } from "marked";
const FACES = process.argv[2], OUTDIR = process.argv[3];
function parse(t){const rows=[];let r=[],f="",q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==","){r.push(f);f=""}else if(c=="\n"){r.push(f);rows.push(r);r=[];f=""}else f+=c}return rows}
const [h, ...rows] = parse(fs.readFileSync(FACES, "utf8")); const H = Object.fromEntries(h.map((x, i) => [x, i]));
const faces = rows.filter(r => r.length > 1).map(r => ({ id: r[H.face_id], s: r[H.expression_raw] ?? r[H.face] }));
const cmR = new commonmark.Parser(), cmW = new commonmark.HtmlRenderer({ safe: true }); const mdit = new MarkdownIt({ html: false });
const engines = { commonmark: s => cmW.render(cmR.parse(s)), "markdown-it": s => mdit.render(s), marked: s => marked.parse(s, { async: false }) };
const ents = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const text = html => html.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, m => ents[m]).replace(/\n+$/, "");
const tags = html => (html.match(/<([a-z0-9]+)/g) || []).map(x => x.slice(1)).filter(t => t !== "p");
const ctxs = { alone: s => s, inline: s => `I think ${s} today`, line_start_after_text: s => `hello\n${s}` };
const out = { engines: Object.fromEntries(Object.keys(engines).map(e => [e, {}])), examples: {} };
const perFace = new Map(faces.map(f => [f.id, { face_id: f.id }]));
for (const [en, fn] of Object.entries(engines)) for (const [cn, cf] of Object.entries(ctxs)) {
  let same = 0, tagged = 0, altered = 0; const ex = [];
  for (const f of faces) { const input = cf(f.s); const html = fn(input); const got = text(html); const expect = input.replace(/\n/g, "\n");
    const ok = got.replace(/\n/g, "\n") === expect; const tg = tags(html);
    perFace.get(f.id)[`${en}__${cn}`] = (ok && !tg.length) ? 0 : 1;
    if (ok && !tg.length) same++; else { if (tg.length) tagged++; if (!ok) altered++; if (ex.length < 6) ex.push([f.s, got.slice(0, 60), tg.join(",")]); } }
  out.engines[en][cn] = { faces: faces.length, text_identical_and_no_markup: same, markup_tags_created: tagged, visible_text_changed: altered, share_changed_or_marked: +(1 - same / faces.length).toFixed(4) }; out.examples[`${en}/${cn}`] = ex; }
// which characters are implicated: leading characters and backslash/underscore/asterisk/tilde/angle
const imp = { backslash: 0, underscore: 0, asterisk: 0, angle_start: 0, tilde: 0 };
for (const f of faces) { if (f.s.includes("\\")) imp.backslash++; if (f.s.includes("_")) imp.underscore++; if (f.s.includes("*")) imp.asterisk++; if (/^\s*>/.test(f.s)) imp.angle_start++; if (f.s.includes("~")) imp.tilde++; }
out.faces_with_markdown_significant_ascii = imp; // the fix a reader needs for the most common casualty, the shrug: three backslashes, or a code span (checked in all three engines)
const SHRUG = "¯\\_(ツ)_/¯"; out.shrug_check = {};
for (const [name, input] of [["as_typed", SHRUG], ["three_backslashes", "¯\\\\\\_(ツ)_/¯"], ["code_span", "`" + SHRUG + "`"]])
  out.shrug_check[name] = Object.fromEntries(Object.entries(engines).map(([en, fn]) => [en, text(fn(input)) === SHRUG]));
out.versions = { commonmark: "0.31.2", "markdown-it": "14.1.0", marked: "15.0.12", node: process.version };
fs.writeFileSync(path.join(OUTDIR, "markdown-per-face.csv"), [Object.keys([...perFace.values()][0]).join(","), ...[...perFace.values()].map(r => Object.values(r).join(","))].join("\n") + "\n");
fs.writeFileSync(path.join(OUTDIR, "markdown-bench.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out.engines, null, 1), JSON.stringify(out.faces_with_markdown_significant_ascii)); console.log(JSON.stringify(out.examples["commonmark/alone"]));
