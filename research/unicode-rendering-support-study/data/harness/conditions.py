"""Rendering conditions. A condition = (fontconfig font set, CSS font stack). Chromium, flags, viewport, DPR, lang are identical.
A_stock    : the container's stock fonts exactly as installed (includes GNU Unifont, a pan-Unicode last-resort bitmap-style font family).
A_minimal  : stock fonts minus Unifont and Inter: a minimal server/container image (DejaVu, Liberation, FreeFont, Noto Color Emoji 2.047, WenQuanYi, IPA, Thai). NOT a desktop.
A_distro   : A_minimal + Ubuntu 24.04's own Noto packages (fonts-noto-core/extra/mono/ui-core 20201225-2, fonts-noto-cjk 20230817) - the 'what the distro ships' condition.
B_noto     : explicit latest Noto set only (notofonts.github.io 'full/ttf' Regular of every family + Noto Sans/Serif CJK + newest Noto Color Emoji).
G_noemoji : DejaVu Sans + Liberation + FreeSans only, NO emoji font. A constructed condition for the failure gallery (the analogue of a deleted/never-installed emoji font); never part of a statistic.
R_ALT-<tag>: same as R_ but with a different emoji font (COLRv1, Windows-compatible CBDT build, Twemoji COLR); see make_alt_fontsets.py
R_<ver>    : replay — DejaVu Sans + ONE historical NotoColorEmoji.ttf; used only for emoji items.
"""
import os, glob
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CACHE = f'{ROOT}/cache'
FONTSETS = f'{CACHE}/fontsets'

CSS_A = ('system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, '
         '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"')
# emoji-first variant: identical families, colour emoji families moved to the front
CSS_A_EF = ('"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif')
# B: explicit Noto stack, colour emoji BEFORE the symbol families (the order recommended for sites that want emoji presentation)
CSS_B = ('"Noto Sans", "Noto Color Emoji", "Noto Sans Symbols", "Noto Sans Symbols 2", "Noto Sans Math", "Noto Music", '
         '"Noto Sans CJK SC", sans-serif')
# B+symfirst: same families, symbol families BEFORE colour emoji (the order of the first draft of this study; kept as an experimental factor)
CSS_B_SYMFIRST = ('"Noto Sans", "Noto Sans Symbols", "Noto Sans Symbols 2", "Noto Sans Math", "Noto Music", '
                  '"Noto Sans CJK SC", "Noto Color Emoji", sans-serif')
CSS_R = '"DejaVu Sans", "Noto Color Emoji"'

STOCK_EXCLUDE_MINIMAL = ('/usr/share/fonts/opentype/unifont', '/usr/share/fonts/opentype/inter')

def split(name):
    """'B_noto+symfirst' -> ('B_noto', 'symfirst')"""
    b, _, v = name.partition('+'); return b, v

def condition(full):
    name, variant = split(full)
    c = _condition(name)
    c['name'] = full; c['variant'] = variant
    if variant == 'ef' and name.startswith('A_'): c['css'] = CSS_A_EF
    elif variant == 'symfirst' and name == 'B_noto': c['css'] = CSS_B_SYMFIRST
    elif variant: raise KeyError(full)
    return c

def _condition(name):
    if name == 'A_stock':   return dict(name=name, css=CSS_A, fc_file=None, dirs=None)
    if name == 'G_noemoji': return dict(name=name, css=CSS_A, fc_file=f'{FONTSETS}/G_noemoji.fonts.conf', dirs=[f'{FONTSETS}/G_noemoji'])
    if name == 'A_minimal': return dict(name=name, css=CSS_A, fc_file=f'{FONTSETS}/A_minimal.fonts.conf', dirs=None)
    if name == 'A_distro':  return dict(name=name, css=CSS_A, fc_file=f'{FONTSETS}/A_distro.fonts.conf', dirs=None)
    if name == 'B_noto':    return dict(name=name, css=CSS_B, fc_file=f'{FONTSETS}/B_noto.fonts.conf', dirs=[f'{FONTSETS}/B_noto'])
    if name.startswith('R_'):
        css = CSS_R
        fam = f'{FONTSETS}/{name}/family.txt'      # R_ALT-<tag> sets (alternative emoji fonts): the emoji family has another name
        if os.path.exists(fam): css = '"DejaVu Sans", "%s"' % open(fam).read().strip()
        return dict(name=name, css=css, fc_file=f'{FONTSETS}/{name}.fonts.conf', dirs=[f'{FONTSETS}/{name}'])
    raise KeyError(name)

def write_fc(name, dirs, aliases=None):
    os.makedirs(FONTSETS, exist_ok=True)
    cache = f'{CACHE}/fc-cache/{name}'; os.makedirs(cache, exist_ok=True)
    txt = ['<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>']
    txt += [f'<dir>{d}</dir>' for d in dirs]
    txt += [f'<cachedir>{cache}</cachedir>', '<include ignore_missing="yes">/etc/fonts/conf.d</include>']
    for fam, target in (aliases or {}).items():
        txt.append(f'<alias binding="same"><family>{fam}</family><prefer><family>{target}</family></prefer></alias>')
    txt.append('</fontconfig>')
    p = f'{FONTSETS}/{name}.fonts.conf'; open(p, 'w').write('\n'.join(txt)); return p
