#!/usr/bin/env python3
"""Whole-glyph loss scan: for each cell, what share of the EXPECTED name's ink is missing from the export,
and do all the missing pixels sit beyond one straight horizontal line (a clip edge)?
Usage: clipscan.py <repository> <capture-dir> <expected-fixtures.json> <out.csv>"""
import sys, os, json, csv
from multiprocessing import Pool
import cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle
repo, run, expfx, outcsv = sys.argv[1:5]
EXP = {c['id']: c['text'] for c in json.load(open(expfx))['cases']}
F = None
def init():
    global F; F = oracle.Fonts(repo)
def work(item):
    key, d = item; surf, cid = key.split('__', 1); text = EXP[cid]; kind = 'cursive' if surf=='en_cursive' else 'print'
    cv = cv2.cvtColor(cv2.imread(os.path.join(d,'pdf-first-canvas.png')), cv2.COLOR_BGR2RGB)
    roi, band = oracle.roi_solid(cv); row = dict(surface=surf, fixture=cid)
    v, sz, pos = oracle._locate(roi, F, text, kind, 'solid')
    if sz is None: row.update(ncc=v); return row
    pair = oracle.render_pair(F, text, kind, sz)
    if pair is None: row.update(ncc=v); return row
    e, st, (bx, by, ex, ey) = pair; em = (e>128).astype(np.uint8)[by:ey, bx:ex]
    H, W = roi.shape; tol = max(2, int(round(sz*0.03)))
    d_ = cv2.dilate(roi.astype(np.uint8), np.ones((2*tol+1,2*tol+1), np.uint8))
    ys, xs = np.where(em>0); cy = ys+pos[1]; cx = xs+pos[0]
    ok = (cy>=0)&(cy<H)&(cx>=0)&(cx<W); hit = np.zeros(len(ys), bool); hit[ok] = d_[cy[ok], cx[ok]]>0
    miss = ~hit; row.update(ncc=v, size=sz, ink_px=int(len(ys)), missing_px=int(miss.sum()), missing_frac=float(miss.mean()))
    if miss.sum() > 0.002*len(ys):
        my = ys[miss]; row['miss_ymin'] = int(my.min()); row['miss_ymax'] = int(my.max())
        # clip-line test: every present expected pixel in the missing columns' band is above ymin-ish
        row['present_ymax'] = int(ys[hit].max()) if hit.any() else None
        row['clip_line_test'] = bool(hit.any() and ys[hit].max() <= my.min()+tol) # nothing drawn at/under the first missing row
        row['rows_below_clip_px'] = int(em.shape[0]-my.min())
        row['expected_height_px'] = int(em.shape[0])
    return row
if __name__ == '__main__':
    cells = sorted((n, os.path.join(run, n)) for n in os.listdir(run) if '__' in n and os.path.isdir(os.path.join(run, n)))
    with Pool(4, initializer=init) as p: rows = p.map(work, cells, chunksize=2)
    keys = []
    for r in rows:
        for k in r:
            if k not in keys: keys.append(k)
    with open(outcsv, 'w', newline='') as f:
        w = csv.DictWriter(f, keys); w.writeheader(); w.writerows(rows)
    print(len(rows), 'cells ->', outcsv)
