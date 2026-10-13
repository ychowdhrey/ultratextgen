#!/usr/bin/env python3
"""Check 1 (font character map). For each condition build {postscript_name: frozenset(codepoints)} from the font files themselves
(fontTools cmap, all Unicode subtables), plus family->union. Cached in cache/cmap_<cond>.pkl.
For every replay condition the emoji font is one file, so the index is tiny."""
import os, sys, pickle, subprocess
from fontTools.ttLib import TTFont, TTCollection
from conditions import *
def faces(path):
    try:
        if path.lower().endswith(('.ttc', '.otc')):
            for f in TTCollection(path, lazy=True).fonts: yield f
        else: yield TTFont(path, lazy=True)
    except Exception: return
def build(cname):
    c = condition(cname); env = dict(os.environ)
    if c['fc_file']: env['FONTCONFIG_FILE'] = c['fc_file']
    files = sorted({f for f in subprocess.run(['fc-list', '--format', '%{file}\n'], env=env, capture_output=True, text=True).stdout.split('\n') if f})
    ps, fam = {}, {}
    for p in files:
        if p.endswith(('.pfb', '.pfa', '.pcf.gz', '.afm', '.pfm')): continue
        for f in faces(p):
            try:
                nm = f['name']; cm = set()
                for t in f['cmap'].tables:
                    if t.isUnicode(): cm.update(t.cmap.keys())
                psn = nm.getDebugName(6) or os.path.basename(p); fm = nm.getDebugName(1) or ''
            except Exception: continue
            ps[psn] = frozenset(cm); fam[fm] = frozenset(fam.get(fm, frozenset()) | cm)
    pickle.dump(dict(ps=ps, fam=fam), open(f'{CACHE}/cmap_{cname}.pkl', 'wb'))
    return len(ps)
def load(cname):
    p = f'{CACHE}/cmap_{cname}.pkl'
    if not os.path.exists(p): build(cname)
    return pickle.load(open(p, 'rb'))
if __name__ == '__main__':
    for c in sys.argv[1:]: print(c, build(c))
