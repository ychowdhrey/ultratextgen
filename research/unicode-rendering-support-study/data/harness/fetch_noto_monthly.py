#!/usr/bin/env python3
"""Layer B (non-emoji, cmap level): replay Noto's monthly releases (tags noto-monthly-release-* in notofonts.github.io, 2023-01..newest).
For each monthly snapshot take, per family, the 'full' TTF (static Regular preferred, else the variable font) and its Unicode cmap.
Output: data/derived/noto_monthly_manifest.csv  (tag, date, n_families, n_cps_union)
        data/derived/noto_monthly_cmap.json     ({tag: {'date': d, 'fonts': {family: blob_sha}}}  + {blob_sha: ranges})
Caveats written into the output: a cmap entry means the font maps the code point; it does not prove the glyph is correct/complete (see the limitations on the study page)."""
import subprocess, re, io, os, csv, json, hashlib, sys
from concurrent.futures import ThreadPoolExecutor
from fontTools.ttLib import TTFont
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
REPO = f'{ROOT}/cache/notofonts-site'
def git(*a):
    r = subprocess.run(['git', '-C', REPO, *a], capture_output=True, text=True); return r.stdout if r.returncode == 0 else ''
tags = []
for l in git('for-each-ref', '--sort=creatordate', '--format=%(refname:short)|%(objecttype)|%(*objectname)|%(objectname)|%(creatordate:short)|%(*committerdate:short)', 'refs/tags/noto-monthly-release-*').splitlines():
    n, typ, peeled, obj, cd, ccd = l.split('|'); tags.append(dict(tag=n, commit=peeled or obj, date=ccd or cd))
snap = {}; blobs = set()
for t in tags:
    fonts = {}
    for l in git('ls-tree', '-r', t['commit'], 'fonts/').splitlines():
        meta, path = l.split('\t'); sha = meta.split()[2]
        m = re.match(r'^fonts/([^/]+)/full/(ttf|variable)/(.+\.ttf)$', path)
        if not m: continue
        fam, kind, fn = m.groups()
        rank = 0 if fn.endswith('-Regular.ttf') else (1 if '[' in fn else 2)
        if fam not in fonts or rank < fonts[fam][0]: fonts[fam] = (rank, sha, fn)
    snap[t['tag']] = dict(date=t['date'], commit=t['commit'], fonts={f: v[1] for f, v in fonts.items()}); blobs |= {v[1] for v in fonts.values()}
print(len(tags), 'monthly tags;', len(blobs), 'unique font blobs', flush=True)
def ranges(cps):
    out = []
    for c in sorted(cps):
        if out and c == out[-1][1] + 1: out[-1][1] = c
        else: out.append([c, c])
    return out
def cmap_of(sha):
    b = subprocess.run(['git', '-C', REPO, 'cat-file', 'blob', sha], capture_output=True).stdout
    try:
        f = TTFont(io.BytesIO(b), lazy=True); cps = set()
        for st in f['cmap'].tables:
            if st.isUnicode(): cps.update(st.cmap.keys())
        return sha, ranges(cps), len(b)
    except Exception as e: return sha, None, len(b)
cm = {}
with ThreadPoolExecutor(12) as ex:
    for i, (sha, rg, n) in enumerate(ex.map(cmap_of, sorted(blobs))):
        cm[sha] = rg
        if i % 300 == 0: print(i, flush=True)
bad = [s for s, r in cm.items() if r is None]
print('unparseable blobs', len(bad))
os.makedirs(f'{ROOT}/data/derived', exist_ok=True)
json.dump(dict(snapshots=snap, cmaps=cm), open(f'{ROOT}/data/derived/noto_monthly_cmap.json', 'w'))
with open(f'{ROOT}/data/derived/noto_monthly_manifest.csv', 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['tag', 'date', 'commit', 'n_families'])
    for t in tags: w.writerow([t['tag'], t['date'], t['commit'][:10], len(snap[t['tag']]['fonts'])])
