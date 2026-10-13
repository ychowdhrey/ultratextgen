#!/usr/bin/env python3
"""Failure gallery: the same inputs rendered under four conditions, one row per failure class, so the classes can be told apart by eye.
G_noemoji is a CONSTRUCTED condition (no emoji font installed: the analogue of a deleted or never-installed emoji font); it exists only to
show failure modes the real conditions rarely produce. It contributes to no statistic."""
import os, io, sys, csv, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import render_harness as H
from conditions import *
OUT = f'{ROOT}/figures'; os.makedirs(OUT, exist_ok=True)
E = lambda *c: ''.join(chr(x) for x in c)
ITEMS = [  # (row label, text, note)
 ('tofu: new emoji absent from the emoji font (Emoji 17.0)', E(0x1FAEF), 'U+1FAEF fight cloud'),
 ('tofu: new CJK/seal character (Unicode 18.0)', E(0x3D000), 'U+3D000 seal character'),
 ('blank output (a font maps the mark but draws nothing)', E(0x25CC, 0x11A52), 'U+11A52 on a dotted circle'),
 ('replacement symbol (what a decoder emits for bad bytes)', E(0xFFFD), 'U+FFFD, rendered for reference'),
 ('unexpected monochrome fallback (emoji intended)', E(0x1F600), 'U+1F600 grinning face'),
 ('unexpected monochrome fallback (VS16 requested)', E(0x2764, 0xFE0F), 'U+2764 U+FE0F'),
 ('broken keycap (components drawn separately)', E(0x31, 0x20E3), 'U+0031 U+20E3 (unqualified)'),
 ('broken keycap, fully-qualified', E(0x31, 0xFE0F, 0x20E3), 'U+0031 U+FE0F U+20E3'),
 ('broken ZWJ sequence (family)', E(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467), 'man ZWJ woman ZWJ girl'),
 ('broken ZWJ sequence (Emoji 17.0, two-tone people wrestling)', E(0x1F9D1, 0x1F3FB, 0x200D, 0x1FAEF, 0x200D, 0x1F9D1, 0x1F3FC), 'person ZWJ fight cloud ZWJ person, two tones'),
 ('regional indicator letters instead of a flag', E(0x1F1E9, 0x1F1EA), 'U+1F1E9 U+1F1EA (DE)'),
 ('subdivision flag with no emoji font (tag characters)', E(0x1F3F4, 0xE0067, 0xE0062, 0xE0065, 0xE006E, 0xE0067, 0xE007F), 'England: tag sequence'),
 ('partial sequence (base missing, modifier drawn)', E(0x1FAF9, 0x1F3FD), 'U+1FAF9 U+1F3FD'),
 ('skin-tone modifier on its own (a colour patch)', E(0x1F3FD), 'U+1F3FD'),
]
CONDS = [('G_noemoji', 'G: no emoji font\n(constructed)'), ('A_minimal', 'A_minimal\nNoto Color Emoji 2.047'), ('A_distro', 'A_distro\nUbuntu 24.04 Noto\n(2020/2023) + 2.047'), ('A_stock', 'A_stock\n(+ Unifont 15.1)'), ('B_noto', 'B_noto\nlatest Noto (2.057)')]
geom = H.GEOM['seq']; cells = {}
for cname, _ in CONDS:
    items = [dict(item_id=f'G{i}', text=t) for i, (_, t, _) in enumerate(ITEMS)]
    obs, meta = H.run(cname, 'sequences', items, f'{CACHE}/screens/gallery_{cname}')
    im = Image.open(f'{CACHE}/screens/gallery_{cname}/pages/p0000.png').convert('RGB')
    for k, o in enumerate(obs): cells[(cname, k)] = im.crop((o['x'], o['y'], o['x'] + 200, o['y'] + 80)); 
    cells[(cname, 'meta')] = meta
fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12); fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
LW, CW, RH, HH = 330, 200, 84, 54
W = LW + CW * len(CONDS); Hh = HH + RH * len(ITEMS) + 30
sheet = Image.new('RGB', (W, Hh), 'white'); d = ImageDraw.Draw(sheet)
d.text((8, 6), 'Failure gallery: identical input, five font sets (one constructed), Chromium ' + cells[('B_noto', 'meta')]['browser_version'], font=fb, fill=(20, 20, 20))
for j, (cn, lab) in enumerate(CONDS): d.multiline_text((LW + j * CW + 6, 24), lab, font=fnt, fill=(60, 60, 60), spacing=1)
for i, (lab, txt, note) in enumerate(ITEMS):
    y = HH + i * RH + 12
    d.line([(0, y - 2), (W, y - 2)], fill=(225, 225, 225)); __import__('textwrap'); wl = __import__('textwrap').wrap(lab, 46)[:2]; [d.text((8, y + 12 + 17 * i), t, font=fnt, fill=(20, 20, 20)) for i, t in enumerate(wl)]; d.text((8, y + 50), note, font=fnt, fill=(110, 110, 110))
    for j, (cn, _) in enumerate(CONDS): sheet.paste(cells[(cn, i)], (LW + j * CW, y - 2))
d.text((8, Hh - 20), 'G is a constructed condition (no emoji font installed). Rendering at 48 px, DPR 1. Classes follow the detector described in the study method.', font=fnt, fill=(110, 110, 110))
sheet.save(f'{OUT}/figure_failure_gallery.png', optimize=True)
json.dump({c: cells[(c, 'meta')]['browser_version'] for c, _ in CONDS}, open(f'{OUT}/figure_failure_gallery.meta.json', 'w'))
print('ok', sheet.size)
