#!/usr/bin/env python3
"""Does THIS Chromium binary compose the 60 Emoji 17.0 two-tone 'people wrestling' sequences with NotoColorEmoji 2.051?
Usage: bisect_probe.py <chrome-binary> [--detail]   -> prints 'composed N/60' ; exit 0 if all composed, 1 if none, 2 if mixed.
Method: render each sequence alone in a nowrap span; composed = advance width < 1.6 x the width of one plain emoji (U+1F600)."""
import sys, csv, os, json
from playwright.sync_api import sync_playwright
from conditions import condition, CACHE
chrome = sys.argv[1]; detail = '--detail' in sys.argv
seqs = []
for r in csv.DictReader(open(os.path.join(os.path.dirname(__file__), '../data/derived/emoji_sequences.csv'))):
    cps = [int(x, 16) for x in r['seq_hex'].split()]
    tones = {c for c in cps if 0x1F3FB <= c <= 0x1F3FF}
    if 0x1FAEF in cps and len({c for c in cps if 0x1F3FB <= c <= 0x1F3FF}) == 2 and r['emoji_version'].startswith('17'): seqs.append(''.join(map(chr, cps)))
assert len(seqs) == 60, len(seqs)
cond = condition('R_2025-09-12_f3ae03f'); env = dict(os.environ); env['FONTCONFIG_FILE'] = cond['fc_file']; env['LANG'] = 'en_US.UTF-8'
flags = ['--no-sandbox', '--headless=new', '--disable-gpu', '--lang=en-US', '--font-render-hinting=none']
html = '<meta charset=utf-8><style>span{font-family:%s;font-size:48px;white-space:pre}</style>' % cond['css'] + \
       '<span id=ref>\U0001F600</span><br>' + ''.join(f'<span class=s>{s}</span><br>' for s in seqs)
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=chrome, args=flags, env=env, headless=True)
    pg = br.new_page(); pg.set_content(html); pg.evaluate('document.fonts.ready')
    ref = pg.evaluate('document.getElementById("ref").getBoundingClientRect().width')
    ws = pg.evaluate('[...document.querySelectorAll(".s")].map(e=>e.getBoundingClientRect().width)')
    ver = br.version; br.close()
n = sum(w < 1.6 * ref for w in ws)
print(f'{ver} composed {n}/60 (ref {ref:.1f}px; widths min {min(ws):.1f} max {max(ws):.1f})')
if detail: print(json.dumps(ws))
sys.exit(0 if n == 60 else 1 if n == 0 else 2)
