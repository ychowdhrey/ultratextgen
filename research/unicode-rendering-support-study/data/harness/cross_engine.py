#!/usr/bin/env python3
"""Layer F: the same font sets seen by three browser engines (Chromium 155, Firefox 155, WebKit 26.6 as built by Playwright).
Scope is the engine's text shaping and font fallback on Linux with fontconfig: NOT Safari, NOT Firefox on Windows or macOS.
Code points: a stratified sample (by Unicode version, half 'hard' = unsupported in some Chromium condition). Verdict per engine:
  TOFU  = pixel-identical to a sentinel (unassigned / noncharacter code point) drawn by the same engine in the same font set
  BLANK = no ink for a code point that should draw
  DRAWN = anything else
Emoji sequences: a stratified sample of fully-qualified sequences. COMPOSED = advance width <= 1.5 x the engine's own width of U+1F600 and not a sentinel hash.
Truth for comparison = this study's Chromium 155 classification for the same item and font set (results/classified)."""
import sys, os, io, csv, gzip, json, random, hashlib, time
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
import render_harness as H
from conditions import *
ROOT_ = ROOT; OUT = f'{ROOT_}/results/raw/cross_engine'; os.makedirs(OUT, exist_ok=True)
random.seed(20261013)
FULL = os.environ.get('CROSS_FULL') == '1'   # CROSS_FULL=1: every code point and every fully-qualified sequence instead of the stratified sample
def read(run):
    with gzip.open(f'{ROOT_}/results/classified/{run}.csv.gz', 'rt', encoding='utf-8') as f: return list(csv.DictReader(f))
UNSUP = {'TOFU', 'LASTRESORT_HEXBOX', 'BLANK', 'REPLACEMENT_GLYPH'}
CONDS = ['A_minimal', 'A_distro', 'B_noto']
cls = {c: {r['item_id']: r for r in read(f'{c}__codepoints__c155')} for c in CONDS}
sent = [r for r in cls['A_distro'].values() if r['item_kind'].startswith('sentinel')]
# --- code point sample
by_ver = {}
for iid, r in cls['A_distro'].items():
    if r['item_kind'] != 'codepoint' or r['study_role'] not in ('study', 'control') or r['emoji'] == '1' or r['default_ignorable'] == '1' or r['combining'] == '1': continue
    if r['general_category'] in ('Cc', 'Cf', 'Zs', 'Zl', 'Zp', 'Cs', 'Co'): continue
    by_ver.setdefault(r['unicode_version'], []).append(iid)
cp_items = []
for v, ids in sorted(by_ver.items()):
    hard = [i for i in ids if any(cls[c][i]['render_class'] in UNSUP for c in CONDS)]
    easy = [i for i in ids if i not in set(hard)]
    pick = ids if FULL else random.sample(hard, min(70, len(hard))) + random.sample(easy, min(50, len(easy)))
    for i in pick: cp_items.append((i, cls['A_distro'][i]['text'], v))
print('code point sample', len(cp_items), 'versions', len(by_ver), flush=True)
# --- emoji sample
seqrows = {c: {r['item_id']: r for r in read(f'{c}__sequences__c155')} for c in CONDS}
byv = {}
for iid, r in seqrows['A_distro'].items():
    if r.get('status') != 'fully-qualified' or r['item_kind'] != 'sequence': continue
    byv.setdefault((r.get('unicode_version') or r.get('emoji_version', '')), []).append(iid)
seq_items = []
for v, ids in sorted(byv.items()):
    hard = [i for i in ids if any(seqrows[c][i]['render_class'] not in ('FULL',) for c in CONDS)]
    easy = [i for i in ids if i not in set(hard)]
    for i in (ids if FULL else random.sample(hard, min(40, len(hard))) + random.sample(easy, min(25, len(easy)))): seq_items.append((i, seqrows['A_distro'][i]['text'], v))
print('emoji sample', len(seq_items), 'versions', len(byv), flush=True)

def render(engine_name, br, cond_name, items, geom_key):
    cond = condition(cond_name); geom = H.GEOM[geom_key]; per = geom['cols'] * geom['rows']
    ctx = br.new_context(viewport={'width': H.VIEW_W, 'height': geom['rows'] * geom['ch']}, device_scale_factor=1, locale='en-US')
    page = ctx.new_page(); res = []
    for pi in range((len(items) + per - 1) // per):
        chunk = items[pi * per:(pi + 1) * per]
        page.set_content(H.page_html([c[1] for c in chunk], cond['css'], geom, 'en'), wait_until='load'); page.evaluate('document.fonts.ready')
        widths = page.evaluate('Array.from(document.querySelectorAll(".g")).map(e=>e.getBoundingClientRect().width)')
        png = page.screenshot(clip={'x': 0, 'y': 0, 'width': geom['cols'] * geom['cw'], 'height': geom['rows'] * geom['ch']}, type='png')
        im = np.asarray(Image.open(io.BytesIO(png)).convert('RGB'))
        for k, c in enumerate(chunk):
            x, y = (k % geom['cols']) * geom['cw'], (k // geom['cols']) * geom['ch']
            cell = im[y:y + geom['ch'], x:x + geom['cw']]
            f = H.cell_features(cell); f['adv_width'] = widths[k]
            mask = (cell.astype(np.int32) @ np.array([299, 587, 114]) // 1000) < 160
            ys_, xs_ = np.where(mask); f['bw'] = f['bh'] = 0; f['frame'] = f['interior'] = 0.0
            if len(xs_):
                sub = mask[ys_.min():ys_.max() + 1, xs_.min():xs_.max() + 1]; h_, w_ = sub.shape; f['bw'], f['bh'] = w_, h_
                if h_ >= 6 and w_ >= 6:
                    ring = np.concatenate([sub[0, :], sub[-1, :], sub[:, 0], sub[:, -1]]); f['frame'] = round(float(ring.mean()), 3); f['interior'] = round(float(sub[2:-2, 2:-2].mean()), 3)
            res.append((c, f))
    ctx.close(); return res

def run_engine(pw, engine):
    out = []
    if engine == 'chromium': br = pw.chromium.launch(executable_path=H.CHROME, args=H.FLAGS, headless=True)
    else: br = getattr(pw, engine).launch()
    ver = br.version
    for cond_name in CONDS:
        cond = condition(cond_name)
        env = dict(os.environ); env['FONTCONFIG_FILE'] = cond['fc_file']; env['LANG'] = 'en_US.UTF-8'
        br.close()
        if engine == 'chromium': br = pw.chromium.launch(executable_path=H.CHROME, args=H.FLAGS, env=env, headless=True)
        else: br = getattr(pw, engine).launch(env=env)
        sres = render(engine, br, cond_name, [(s['item_id'], s['text'], '') for s in sent], 'cp')
        shash = {f['pixel_sha1'] for _, f in sres}
        sdims = {(f['bw'], f['bh']) for _, f in sres if f['ink_px'] > 0}; sframe = min((f['frame'] for _, f in sres if f['ink_px'] > 0), default=1.0)
        def is_box(f):   # hex-code placeholder box: same outer size as a sentinel's box and a (nearly) closed frame
            return f['frame'] >= max(0.0, sframe - 0.05) and any(abs(f['bw'] - a) <= 1 and abs(f['bh'] - b) <= 1 for a, b in sdims)
        cres = render(engine, br, cond_name, cp_items, 'cp')
        eres = render(engine, br, cond_name, seq_items + [('REF', '\U0001F600', '')], 'seq')
        ref_w = [f['adv_width'] for c, f in eres if c[0] == 'REF'][0]
        # engine's sentinel for sequences: the nonsense ZWJ sequence is not needed; composed = narrow and not tofu
        for (iid, text, v), f in cres:
            verdict = 'TOFU' if (f['pixel_sha1'] in shash or is_box(f)) else ('BLANK' if f['ink_px'] == 0 else 'DRAWN')
            out.append(dict(engine=engine, engine_version=ver, condition=cond_name, arm='cp', item_id=iid, version=v, verdict=verdict, ink=f['ink_px'], adv=f['adv_width'], sha=f['pixel_sha1'], bw=f['bw'], bh=f['bh'], frame=f['frame']))
        for (iid, text, v), f in eres:
            if iid == 'REF': continue
            verdict = 'TOFU' if f['pixel_sha1'] in shash else ('COMPOSED' if f['adv_width'] <= 1.5 * ref_w and f['ink_px'] > 0 else 'DECOMPOSED_OR_WIDE')
            out.append(dict(engine=engine, engine_version=ver, condition=cond_name, arm='seq', item_id=iid, version=v, verdict=verdict, ink=f['ink_px'], adv=f['adv_width'], sha=f['pixel_sha1'], bw=f['bw'], bh=f['bh'], frame=f['frame']))
        print(engine, cond_name, 'done', flush=True)
    br.close(); return out

if __name__ == '__main__':
    engines = sys.argv[1:] or ['chromium', 'firefox', 'webkit']
    allrows = []
    with sync_playwright() as pw:
        for e in engines: allrows += run_engine(pw, e)
    # truth columns
    for r in allrows:
        t = (cls if r['arm'] == 'cp' else seqrows)[r['condition']].get(r['item_id'])
        r['chromium_truth'] = t['render_class'] if t else ''
    fn = f'{OUT}/cross_engine_{"full_" if FULL else ""}{"_".join(engines)}.csv'
    with open(fn, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(allrows[0])); w.writeheader(); w.writerows(allrows)
    print('wrote', fn, len(allrows))
