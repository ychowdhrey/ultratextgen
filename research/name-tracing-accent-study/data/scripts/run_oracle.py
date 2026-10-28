#!/usr/bin/env python3
"""Score every captured cell of a capture run against the expected names.
Usage: run_oracle.py <repository> <capture-dir> <expected-fixtures.json> <out.csv> [--pdfcheck]
Expected names come from <expected-fixtures.json>, NOT from what was typed, so a run that was fed
deliberately damaged input (fault injection) is judged against the name that SHOULD have appeared."""
import sys, json, csv, os
from multiprocessing import Pool
import cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle
repo, run, expfx, outcsv = sys.argv[1:5]; pdfcheck = '--pdfcheck' in sys.argv
EXP = {c['id']: c['text'] for c in json.load(open(expfx))['cases']}
F = None
def init():
    global F; F = oracle.Fonts(repo)
def load(p):
    im = cv2.imread(p); return None if im is None else cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
def pdf_vs_canvas(d, canvas):
    import pymupdf
    doc = pymupdf.open(os.path.join(d,'sheet.pdf')); pg = doc[0]
    z = canvas.shape[1] / pg.rect.width
    pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
    a = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)
    h = min(a.shape[0], canvas.shape[0]); w = min(a.shape[1], canvas.shape[1])
    ga = cv2.cvtColor(a[:h,:w], cv2.COLOR_RGB2GRAY).astype(int); gc = cv2.cvtColor(canvas[:h,:w], cv2.COLOR_RGB2GRAY).astype(int)
    return float((abs(ga-gc) > 48).mean()), (a.shape[1]-canvas.shape[1], a.shape[0]-canvas.shape[0])
def work(item):
    key, d = item; surf, cid = key.split('__', 1); text = EXP[cid]; kind = 'cursive' if surf=='en_cursive' else 'print'
    row = dict(surface=surf, fixture=cid, expected=text, kind=kind)
    cv = load(os.path.join(d,'pdf-first-canvas.png')); png = load(os.path.join(d,'download.png'))
    try:
        roi, band = oracle.roi_solid(cv)
        s = oracle.evaluate(roi, F, text, kind, 'solid')
        o = oracle.evaluate(oracle.roi_outline(cv, band[1]) if band else None, F, text, kind, 'edge')
        p = oracle.evaluate(oracle.roi_outline(png, None, tallest=True), F, text, kind, 'edge') if png is not None else dict(ncc=None, mark_recall=None, n_marks=None)
    except Exception as ex:
        row['error'] = repr(ex); return row
    for tag, r in (('solid',s),('outline',o),('png',p)):
        row[tag+'_ncc'] = r['ncc']; row[tag+'_recall'] = r['mark_recall']; row[tag+'_nmarks'] = r['n_marks']; row[tag+'_size'] = r.get('size')
    if pdfcheck:
        try: row['pdf_canvas_diff'], row['pdf_canvas_dsize'] = pdf_vs_canvas(d, cv)
        except Exception as ex: row['pdf_canvas_diff'] = None; row['error'] = repr(ex)
    return row
if __name__ == '__main__':
    cells = sorted((n, os.path.join(run, n)) for n in os.listdir(run) if '__' in n and os.path.isdir(os.path.join(run, n)))
    with Pool(4, initializer=init) as pool: rows = pool.map(work, cells, chunksize=2)
    keys = []
    for r in rows:
        for k in r:
            if k not in keys: keys.append(k)
    with open(outcsv, 'w', newline='') as f:
        w = csv.DictWriter(f, keys); w.writeheader(); w.writerows(rows)
    print(len(rows), 'cells ->', outcsv, '| errors:', sum('error' in r for r in rows))
