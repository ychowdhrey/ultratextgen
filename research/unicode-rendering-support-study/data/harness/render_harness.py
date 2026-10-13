#!/usr/bin/env python3
"""Controlled Chromium rendering harness.
Renders items in fixed-size cells of a grid page, screenshots the page, and records for each cell
raw, classifier-independent features:  pixel hash, ink/chroma stats, advance width, CDP platform fonts.
Classification is a separate step (classify.py) so raw observations never change when the classifier does.

  render_harness.py --condition B_noto --kind codepoints --out ../results/runs/<run_id>
  --kind: codepoints | vs | sequences | sentinels
"""
import argparse, asyncio, csv, hashlib, io, json, os, sys, time, datetime, html
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
from conditions import *

DEFAULT_CHROME = '155.0.8059.39'   # Chrome for Testing 'Stable' on 2026-10-11 (last-known-good-versions.json)
def chrome_path(ver):
    return f'{CACHE}/chrome/{ver}/chrome-linux64/chrome'
CHROME = chrome_path(DEFAULT_CHROME)
FONT_PX, LINE_PX = 48, 64
VIEW_W = 1760
FLAGS = ['--no-sandbox', '--headless=new', '--disable-lcd-text', '--font-render-hinting=none', '--disable-font-subpixel-positioning',
         '--force-device-scale-factor=1', '--disable-gpu', '--lang=en-US', '--disable-extensions', '--disable-background-networking',
         '--hide-scrollbars', '--force-color-profile=srgb', '--disable-features=FontAccess,LocalFontsAccess']
GEOM = {  # cell width, cell height, columns, rows per page
    'cp':  dict(cw=88, ch=80, cols=20, rows=12),
    'seq': dict(cw=330, ch=80, cols=5, rows=12),
}

def page_html(texts, css, geom, lang='en'):
    cw, ch, cols = geom['cw'], geom['ch'], geom['cols']
    cells = []
    for i, t in enumerate(texts):
        cells.append(f'<div class="c"><span class="g" id="g{i}">{html.escape(t, quote=False)}</span></div>')
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>
html,body{{margin:0;padding:0;background:#fff;color:#000}}
.grid{{display:grid;grid-template-columns:repeat({cols},{cw}px);grid-auto-rows:{ch}px;width:{cols*cw}px}}
.c{{width:{cw}px;height:{ch}px;overflow:hidden;position:relative}}
.g{{position:absolute;left:8px;top:8px;font-size:{FONT_PX}px;line-height:{LINE_PX}px;white-space:pre;font-family:{css};font-weight:400;font-style:normal;font-variant-emoji:normal;text-rendering:auto;font-kerning:auto;-webkit-font-smoothing:auto}}
</style></head><body><div class="grid" id="grid">{''.join(cells)}</div></body></html>'''

def cell_features(arr):
    """arr: HxWx3 uint8 crop of one cell"""
    a = arr.astype(np.int32)
    lum = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    ink = lum < 250
    chroma = (a.max(-1) - a.min(-1)) > 40
    n = int(ink.sum())
    if n:
        ys, xs = np.where(ink); bb = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    else: bb = (-1, -1, -1, -1)
    # 8x8 average hash on the ink-cropped glyph (translation-tolerant shape fingerprint)
    if n:
        sub = Image.fromarray(arr[bb[1]:bb[3] + 1, bb[0]:bb[2] + 1]).convert('L').resize((8, 8), Image.BILINEAR)
        s = np.asarray(sub, dtype=np.float32); bits = (s < s.mean()).flatten()
        ah = int(''.join('1' if b else '0' for b in bits), 2)
    else: ah = 0
    return dict(pixel_sha1=hashlib.sha1(arr.tobytes()).hexdigest(), ink_px=n, chroma_px=int(chroma.sum()),
                bbox=f'{bb[0]},{bb[1]},{bb[2]},{bb[3]}', ahash=f'{ah:016x}')

def run(cond_name, kind, items, out, page_limit=None, save_png=True, dpr=1, chrome=None, lang='en', headed=False, fc_cold=False):
    """items: list of dict(item_id, text, ...) ; returns list of observation dicts"""
    cond = condition(cond_name)
    geom = GEOM['seq' if kind in ('sequences',) else 'cp']
    os.makedirs(out, exist_ok=True); os.makedirs(f'{out}/pages', exist_ok=True)
    env = dict(os.environ); env['LANG'] = 'en_US.UTF-8'; env['LC_ALL'] = 'C.UTF-8'
    if cond['fc_file']: env['FONTCONFIG_FILE'] = cond['fc_file']
    if fc_cold and cond['fc_file']:      # same font set, brand-new empty fontconfig cache directory
        import tempfile, re as _re
        td = tempfile.mkdtemp(prefix='fc-cold-', dir=f'{CACHE}'); txt = open(cond['fc_file']).read()
        txt = _re.sub(r'<cachedir>[^<]*</cachedir>', f'<cachedir>{td}</cachedir>', txt); p = f'{td}/cold.fonts.conf'; open(p, 'w').write(txt); env['FONTCONFIG_FILE'] = p
    flags = [f for f in FLAGS if not (headed and f.startswith('--headless'))]
    per = geom['cols'] * geom['rows']
    obs = []
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=chrome or CHROME, args=flags, env=env, headless=not headed)
        ctx = br.new_context(viewport={'width': VIEW_W, 'height': geom['rows'] * geom['ch']}, device_scale_factor=dpr, locale='en-US')
        meta = dict(browser_version=br.version, condition=cond_name, css=cond['css'], flags=flags, lang=lang, headed=headed, fc_cold=fc_cold, viewport_w=VIEW_W, font_px=FONT_PX, line_px=LINE_PX,
                    geom=geom, dpr=dpr, fc_file=cond['fc_file'], chrome_path=chrome or CHROME)
        page = ctx.new_page(); cdp = ctx.new_cdp_session(page)
        meta['user_agent'] = page.evaluate('navigator.userAgent')
        npages = (len(items) + per - 1) // per
        if page_limit: npages = min(npages, page_limit)
        for pi in range(npages):
            chunk = items[pi * per:(pi + 1) * per]
            page.set_content(page_html([c['text'] for c in chunk], cond['css'], geom, lang), wait_until='load')
            page.evaluate('document.fonts.ready')
            widths = page.evaluate('Array.from(document.querySelectorAll(".g")).map(e=>e.getBoundingClientRect().width)')
            cdp.send('DOM.enable'); cdp.send('CSS.enable')
            root = cdp.send('DOM.getDocument', {'depth': 0})['root']['nodeId']
            ids = cdp.send('DOM.querySelectorAll', {'nodeId': root, 'selector': '.g'})['nodeIds']
            fonts = []
            for nid in ids:
                r = cdp.send('CSS.getPlatformFontsForNode', {'nodeId': nid})['fonts']
                fonts.append(r)
            cdp.send('CSS.disable'); cdp.send('DOM.disable')
            png = page.screenshot(clip={'x': 0, 'y': 0, 'width': geom['cols'] * geom['cw'], 'height': geom['rows'] * geom['ch']}, type='png')
            ppath = f'pages/p{pi:04d}.png'
            if save_png: open(f'{out}/{ppath}', 'wb').write(png)
            im = np.asarray(Image.open(io.BytesIO(png)).convert('RGB'))
            S = dpr
            for k, c in enumerate(chunk):
                col, row = k % geom['cols'], k // geom['cols']
                x0, y0 = col * geom['cw'] * S, row * geom['ch'] * S
                crop = im[y0:y0 + geom['ch'] * S, x0:x0 + geom['cw'] * S]
                f = cell_features(crop)
                fl = fonts[k]
                o = dict(c); o.update(f)
                o.update(page=pi, cell=k, x=x0, y=y0, adv_width=round(widths[k], 3),
                         fonts_used='|'.join(f"{x['familyName']}#{x.get('postScriptName','')}#{x['glyphCount']}" for x in fl),
                         glyph_count=sum(x['glyphCount'] for x in fl), n_fonts=len(fl), screenshot=f'{os.path.basename(out)}/{ppath}')
                obs.append(o)
            if pi % 10 == 0: print(f'[{cond_name}/{kind}] page {pi+1}/{npages}', flush=True)
        br.close()
    return obs, meta
