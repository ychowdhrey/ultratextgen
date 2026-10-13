#!/usr/bin/env python3
"""Materialise the alternative-emoji-font sets: DejaVu Sans + ONE emoji font of another format, so the Layer C replay question
('does the font format change what composes?') can be asked with everything else fixed."""
import os, shutil
from fontTools.ttLib import TTFont
from conditions import *
ALT = {
 'COLRv1-1ffdd21': 'Noto-COLRv1-1ffdd21.ttf',
 'WinCompat-1ffdd21': 'NotoColorEmoji_WindowsCompatible-1ffdd21.ttf',
 'CBDT-1ffdd21': 'NotoColorEmoji-1ffdd21.ttf',
 'Twemoji15': 'Twemoji-COLR-15.0.3.ttf',
}
dj = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for tag, fn in ALT.items():
    n = f'R_ALT-{tag}'; d = f'{FONTSETS}/{n}'; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    src = f'{CACHE}/altfonts/{fn}'; os.symlink(dj, f'{d}/DejaVuSans.ttf'); os.symlink(src, f'{d}/{fn}')
    fam = TTFont(src)['name'].getBestFamilyName()
    # Noto variants share the family 'Noto Color Emoji'; only one is ever in a set so there is no clash
    open(f'{d}/family.txt', 'w').write(fam)
    write_fc(n, [d], {'sans-serif': 'DejaVu Sans'}); print(n, fam)
