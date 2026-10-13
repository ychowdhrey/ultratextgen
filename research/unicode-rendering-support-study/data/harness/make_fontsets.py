#!/usr/bin/env python3
"""Materialise the font sets and fontconfig files used by every condition (idempotent)."""
import os, glob, shutil, csv, sys
from conditions import *
os.makedirs(FONTSETS, exist_ok=True)
# --- A_desktop: stock system dirs minus Unifont/Inter
stock = [d for d in sorted(glob.glob('/usr/share/fonts/*/*')) if os.path.isdir(d) and d not in STOCK_EXCLUDE_MINIMAL]
write_fc('A_minimal', stock)
# --- A_distro: minimal + Ubuntu's Noto .deb contents (extracted with dpkg -x, never installed; versions in cache/debs/SHA256SUMS)
pk = f'{CACHE}/debs/x/usr/share/fonts/truetype'
distro_dirs = stock + [d for d in sorted(glob.glob(f'{CACHE}/debs/x/usr/share/fonts/*/*')) if os.path.isdir(d) and 'emoji' not in d.lower()]
write_fc('A_distro', distro_dirs, {'sans-serif': 'DejaVu Sans'})
# --- B_noto: latest Noto
b = f'{FONTSETS}/B_noto'; shutil.rmtree(b, ignore_errors=True); os.makedirs(b)
for p in sorted(glob.glob(f'{CACHE}/notofonts-site/fonts/*/full/ttf/*-Regular.ttf')):
    os.symlink(p, f'{b}/{os.path.basename(p)}')
for p in glob.glob(f'{CACHE}/noto-cjk-fonts/*.ttc'): os.symlink(p, f'{b}/{os.path.basename(p)}')
man = list(csv.DictReader(open(f'{ROOT}/data/derived/noto_emoji_font_manifest.csv')))
latest = man[-1]
os.symlink(f"{ROOT}/{latest['file']}", f'{b}/NotoColorEmoji.ttf')
write_fc('B_noto', [b], {'sans-serif': 'Noto Sans', 'serif': 'Noto Serif', 'monospace': 'Noto Sans Mono', 'system-ui': 'Noto Sans'})
# --- R_<commit>: DejaVu Sans + one emoji binary
dj = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for m in man:
    n = f"R_{m['commit_date']}_{m['commit'][:7]}"; d = f'{FONTSETS}/{n}'
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    os.symlink(dj, f'{d}/DejaVuSans.ttf'); os.symlink(f"{ROOT}/{m['file']}", f'{d}/NotoColorEmoji.ttf')
    write_fc(n, [d], {'sans-serif': 'DejaVu Sans'})
g = f'{FONTSETS}/G_noemoji'; shutil.rmtree(g, ignore_errors=True); os.makedirs(g)
for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/freefont/FreeSans.ttf'):
    if os.path.exists(p): os.symlink(p, f'{g}/{os.path.basename(p)}')
write_fc('G_noemoji', [g], {'sans-serif': 'DejaVu Sans'})
print('ok', len(man), 'replay sets;', len(os.listdir(b)), 'files in B_noto')
