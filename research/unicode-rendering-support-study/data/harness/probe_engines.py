#!/usr/bin/env python3
"""Calibrate candidate versions of the site's device glyph probe in Chromium, Firefox and WebKit against this study's classification.
Variants:  fix    = compare with two unassigned references (the check as fixed in the first change)
           frame  = fix, plus: where the engine draws a DIFFERENT box for each missing character (hex-code boxes), also flag a closed frame whose outer size matches a reference box.
Truth = this study's Chromium class for the same code point and font set. Usage: probe_engines.py <engine> <condition> [variant ...]"""
import sys, os, json, csv, gzip
from playwright.sync_api import sync_playwright
import render_harness as H
from conditions import *
engine, cond = sys.argv[1], sys.argv[2]
JS = r'''(() => {
  const SIZE = 24;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  function stats(c) {
    ctx.clearRect(0, 0, SIZE, SIZE); ctx.font = "18px sans-serif"; ctx.fillText(c, 2, 18);
    const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let x0 = SIZE, y0 = SIZE, x1 = -1, y1 = -1;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (d[(y * SIZE + x) * 4 + 3] > 96) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const key = d.join(",");
    if (x1 < 0) return { key, w: 0, h: 0, frame: 0 };
    const w = x1 - x0 + 1, h = y1 - y0 + 1; let ring = 0, n = 0;
    const on = (x, y) => d[(y * SIZE + x) * 4 + 3] > 96;
    for (let x = x0; x <= x1; x++) { ring += on(x, y0) + on(x, y1); n += 2; }
    for (let y = y0 + 1; y < y1; y++) { ring += on(x0, y) + on(x1, y); n += 2; }
    return { key, w, h, frame: w >= 6 && h >= 6 ? ring / n : 0 };
  }
  const REFS = ["͸", "￿", "\u{E0000}", "\u{10FFFF}"].map(stats);
  const perChar = REFS[0].key !== REFS[1].key;          // the engine draws a different box for each missing character
  const boxes = REFS.filter((r) => r.frame >= 0.8);
  window.__variant = (cps, variant) => cps.map((cp) => {
    const s = stats(String.fromCodePoint(cp));
    let missing = REFS.slice(0, 2).some((r) => r.key === s.key);
    if (variant === "frame" && !missing && perChar && boxes.length && s.frame >= 0.8) missing = boxes.some((r) => Math.abs(r.w - s.w) <= 1 && Math.abs(r.h - s.h) <= 1);
    return missing ? 0 : 1;
  });
  window.__info = { perChar, boxes: boxes.map((b) => [b.w, b.h, +b.frame.toFixed(2)]) };
})();'''
def truth(c):
    out = {}
    with gzip.open(f'{ROOT}/results/classified/{c}__codepoints__c155.csv.gz', 'rt', encoding='utf-8', newline='') as f:
        for r in csv.DictReader(f):
            if r['item_kind'] != 'codepoint' or r['render_class'] in ('INVISIBLE_OK', 'UNKNOWN') or r['combining'] == '1': continue
            out[int(r['item_id'][2:], 16)] = r['render_class'] in ('MONO_GLYPH', 'COLOR_EMOJI')
    return out
variants = sys.argv[3:] or ['fix', 'frame']
c = condition(cond); env = dict(os.environ); env['LANG'] = 'en_US.UTF-8'; env['LC_ALL'] = 'C.UTF-8'
if c['fc_file']: env['FONTCONFIG_FILE'] = c['fc_file']
t = truth(cond); cps = sorted(t)
with sync_playwright() as pw:
    if engine == 'chromium': br = pw.chromium.launch(executable_path=H.CHROME, args=H.FLAGS, env=env, headless=True)
    else: br = getattr(pw, engine).launch(env=env)
    pg = br.new_context(viewport={'width': 400, 'height': 300}).new_page(); pg.set_content('<html></html>'); pg.evaluate(JS); info = pg.evaluate('window.__info')
    rows = []
    for v in variants:
        out = []
        for i in range(0, len(cps), 4000): out += pg.evaluate('([c, v]) => window.__variant(c, v)', [cps[i:i + 4000], v])
        tp = sum(1 for cp, o in zip(cps, out) if not t[cp] and o == 0); miss = sum(1 for cp, o in zip(cps, out) if not t[cp] and o == 1)
        fa = sum(1 for cp, o in zip(cps, out) if t[cp] and o == 0); ok = sum(1 for cp, o in zip(cps, out) if t[cp] and o == 1)
        fas = [f'U+{cp:04X}' for cp, o in zip(cps, out) if t[cp] and o == 0][:12]
        if fas: print('  false alarms:', fas)
        rows.append(dict(engine=engine, engine_version=br.version, condition=cond, variant=v, n=len(cps), truly_unsupported=tp + miss, flagged=tp, missed=miss, truly_supported=ok + fa, false_alarms=fa,
                         pct_detected=round(100 * tp / max(1, tp + miss), 2), per_char_boxes=int(info['perChar'])))
        print(rows[-1], flush=True)
    br.close()
fn = f'{ROOT}/results/tables/probe_engines.csv'; new = not os.path.exists(fn)
with open(fn, 'a', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    if new: w.writeheader()
    w.writerows(rows)
