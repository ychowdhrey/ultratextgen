#!/usr/bin/env python3
"""Static glyph-coverage check: for every fixture character, does the shipped @font-face
subset that the browser will pick (by unicode-range) actually contain a glyph for it?
Usage: font-coverage.py <repository> <fixtures.json> > font-coverage.csv"""
import re, sys, json, csv, unicodedata, io
from pathlib import Path
from fontTools.ttLib import TTFont
repo = Path(sys.argv[1]); fx = json.load(open(sys.argv[2]))
css = (repo/'style.css').read_text()
faces = []
for m in re.finditer(r'@font-face\s*\{(.*?)\}', css, re.S):
    b = m.group(1)
    fam = re.search(r"font-family:\s*'([^']+)'", b); w = re.search(r'font-weight:\s*(\d+)', b)
    src = re.search(r"url\('([^']+\.woff2)'\)", b); ur = re.search(r'unicode-range:\s*([^;]+);', b)
    if not (fam and src): continue
    rng = []
    if ur:
        for part in ur.group(1).split(','):
            part = part.strip()[2:]
            lo, _, hi = part.partition('-'); rng.append((int(lo,16), int((hi or lo),16)))
    faces.append(dict(fam=fam.group(1), w=int(w.group(1)) if w else 400, src=src.group(1), rng=rng))
cache = {}
def cmap(src):
    if src not in cache: cache[src] = set(TTFont(str(repo/src.lstrip('/'))).getBestCmap().keys())
    return cache[src]
def pick(fam, w, cp):
    c = [f for f in faces if f['fam']==fam and f['w']==w and (not f['rng'] or any(a<=cp<=b for a,b in f['rng']))]
    return c[0] if c else None
out = csv.writer(sys.stdout); out.writerow(['fixture','form','family','codepoint','char','subset_file','in_cmap'])
bad = 0
for case in fx['cases']:
    for form in ('as_typed','NFC'):
        s = case['text'] if form=='as_typed' else unicodedata.normalize('NFC', case['text'])
        for ch in s:
            if ch in ' -': continue
            for fam, w in (('Quicksand',700),('Playwrite US Trad',400)):
                f = pick(fam, w, ord(ch))
                ok = bool(f) and ord(ch) in cmap(f['src'])
                bad += (not ok)
                out.writerow([case['id'], form, fam, 'U+%04X'%ord(ch), ch, f['src'] if f else 'NO_FACE_FOR_RANGE', ok])
print('missing_glyph_rows', bad, file=sys.stderr)
sys.exit(1 if bad else 0)
