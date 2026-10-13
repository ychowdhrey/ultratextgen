#!/usr/bin/env python3
"""Does THIS Chromium binary draw text-default emoji followed by U+FE0F (for example U+2764 U+FE0F) with the colour emoji font, when the CSS stack lists a text font that also has the glyph first?
Usage: bisect_probe_vs16.py <chrome-binary>  -> 'colour N/12'; exit 0 if all colour, 1 if none, 2 mixed. Fonts: DejaVu Sans then Noto Color Emoji 2.047 (the study's replay stack)."""
import sys, os
from playwright.sync_api import sync_playwright
from conditions import condition
chrome = sys.argv[1]
ITEMS = [0x2764, 0x263A, 0x2639, 0x2620, 0x270C, 0x261D, 0x2600, 0x2601, 0x2602, 0x2744, 0x2660, 0x2665]
cond = condition('R_2024-10-02_60ac8a9'); env = dict(os.environ); env['FONTCONFIG_FILE'] = cond['fc_file']; env['LANG'] = 'en_US.UTF-8'
html = '<meta charset=utf-8><style>div{font-family:%s;font-size:48px}</style>' % cond['css'] + ''.join(f'<div class=s>{chr(c)}️</div>' for c in ITEMS)
n = 0
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=chrome, args=['--no-sandbox', '--headless=new', '--disable-gpu'], env=env, headless=True)
    pg = br.new_page(); pg.set_content(html); pg.evaluate('document.fonts.ready'); cdp = pg.context.new_cdp_session(pg)
    cdp.send('DOM.enable'); cdp.send('CSS.enable'); root = cdp.send('DOM.getDocument', {'depth': 0})['root']['nodeId']
    for nid in cdp.send('DOM.querySelectorAll', {'nodeId': root, 'selector': '.s'})['nodeIds']:
        fonts = [f['familyName'] for f in cdp.send('CSS.getPlatformFontsForNode', {'nodeId': nid})['fonts']]
        n += fonts == ['Noto Color Emoji']
    ver = br.version; br.close()
print(f'{ver} colour {n}/{len(ITEMS)}'); sys.exit(0 if n == len(ITEMS) else 1 if n == 0 else 2)
