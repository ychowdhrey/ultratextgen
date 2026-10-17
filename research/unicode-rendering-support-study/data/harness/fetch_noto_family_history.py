#!/usr/bin/env python3
"""Layer B (non-emoji): for every per-family release tag in notofonts.github.io ('NotoSansVithkuqi-v1.000'), read that family's
font as committed at the tag, record its code-point coverage and the tag date.
Left-censored: the monorepo starts 2022-04-07, so coverage already present in the first tag of a family is only an upper bound.
Output: data/derived/noto_family_releases.csv (family, version, date, commit, font path, bytes, sha256, n_cmap)
        data/derived/noto_family_cmap.json   ({family@version: [[lo,hi],...]})"""
import subprocess, re, io, os, csv, json, hashlib, sys
from concurrent.futures import ThreadPoolExecutor
from fontTools.ttLib import TTFont
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
REPO = f'{ROOT}/cache/notofonts-site'
def git(*a, text=True):
    r = subprocess.run(['git', '-C', REPO, *a], capture_output=True, text=text)
    return r.stdout if r.returncode == 0 else None
tags = []
for l in git('for-each-ref', '--format=%(refname:short)|%(objecttype)|%(*objectname)|%(objectname)|%(creatordate:iso-strict)|%(*committerdate:iso-strict)', 'refs/tags').splitlines():
    n, typ, peeled, obj, cdate, ccdate = l.split('|')
    m = re.match(r'^(Noto[A-Za-z0-9]+)-v(\d+\.\d+)$', n)
    if m: tags.append(dict(tag=n, family=m[1], version=m[2], commit=peeled or obj, date=(ccdate or cdate)[:10]))
print(len(tags), 'family tags')
def ranges(cps):
    cps = sorted(cps); out = []
    for c in cps:
        if out and c == out[-1][1] + 1: out[-1][1] = c
        else: out.append([c, c])
    return out
def one(t):
    ls = git('ls-tree', '-r', '--name-only', t['commit'], f"fonts/{t['family']}/full/")
    if not ls: return t, None
    files = [f for f in ls.splitlines() if f.endswith('.ttf')]
    pref = [f for f in files if f.endswith('-Regular.ttf')] or [f for f in files if '[' in f] or files
    if not pref: return t, None
    p = pref[0]
    blob = subprocess.run(['git', '-C', REPO, 'show', f"{t['commit']}:{p}"], capture_output=True).stdout
    if not blob: return t, None
    f = TTFont(io.BytesIO(blob), lazy=True)
    cps = set()
    for st in f['cmap'].tables:
        if st.isUnicode(): cps.update(st.cmap.keys())
    t = dict(t, path=p, bytes=len(blob), sha256=hashlib.sha256(blob).hexdigest(), n_cmap=len(cps), name_version=f['name'].getDebugName(5) or '')
    return t, ranges(cps)
rows, cm = [], {}
with ThreadPoolExecutor(8) as ex:
    for i, (t, rg) in enumerate(ex.map(one, tags)):
        if rg is None: print('skip', t['tag']); continue
        rows.append(t); cm[f"{t['family']}@{t['version']}"] = rg
        if i % 40 == 0: print(i, t['tag'], flush=True)
os.makedirs(f'{ROOT}/data/derived', exist_ok=True)
with open(f'{ROOT}/data/derived/noto_family_releases.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
json.dump(cm, open(f'{ROOT}/data/derived/noto_family_cmap.json', 'w'))
print('ok', len(rows))
