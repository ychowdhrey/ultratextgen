#!/usr/bin/env python3
"""Long-name check: does a horizontal stretch of the oracle's template remove the flag? If it does, the flag is a
spacing difference on a long fitted name, not ink cut off. Usage: long-name-stretch-check.py <repo> <capture-root> <setting:surface> ..."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import oracle
repo, root = sys.argv[1], sys.argv[2]; F = oracle.Fonts(repo)
text = [c['text'] for c in json.load(open('fixtures/names-main-26.json'))['cases'] if c['id'] == 'stress-long'][0]
_rt, _rp = oracle.render_template, oracle.render_pair
def stretch(a, k): return cv2.resize(a, (max(1, int(round(a.shape[1]*k))), a.shape[0]), interpolation=cv2.INTER_LINEAR)
def run(cell, kind, k):
    oracle.render_template = lambda f, t, kd, s: (lambda a: None if a is None else stretch(a, k))(_rt(f, t, kd, s))
    def rp(f, t, kd, s):
        p = _rp(f, t, kd, s)
        if p is None: return None
        e, st, (bx, by, ex, ey) = p; e2, st2 = stretch(e, k), stretch(st, k)
        return e2, st2, (int(bx*k), by, int(ex*k), ey)
    oracle.render_pair = rp
    rgb = cv2.cvtColor(cv2.imread(os.path.join(root, cell, 'pdf-first-canvas.png')), cv2.COLOR_BGR2RGB)
    roi, band = oracle.roi_solid(rgb); v, sz, pos = oracle._locate(roi, F, text, kind, 'solid')
    e, st, (bx, by, ex, ey) = oracle.render_pair(F, text, kind, sz); em = (e > 128).astype(np.uint8)[by:ey, bx:ex]
    H, W = roi.shape; tol = max(2, int(round(sz*0.03))); d = cv2.dilate(roi.astype(np.uint8), np.ones((2*tol+1, 2*tol+1), np.uint8))
    ys, xs = np.where(em > 0); cy = ys+pos[1]; cx = xs+pos[0]; ok = (cy >= 0)&(cy < H)&(cx >= 0)&(cx < W)
    hit = np.zeros(len(ys), bool); hit[ok] = d[cy[ok], cx[ok]] > 0
    return v, float((~hit).mean()), (ey-by, int(ys[~hit].min()) if (~hit).any() else None)
import csv
out = csv.writer(open('long-name-stretch-check.csv', 'w', newline='')); out.writerow(['setting', 'surface', 'best_horizontal_stretch', 'fit', 'missing_ink_share', 'flag_cleared'])
for arg in sys.argv[3:]:
    setting, surf = arg.split(':'); kind = 'cursive' if surf == 'en_cursive' else 'print'; cell = f'{setting}/{surf}__stress-long'
    best = min(((run(cell, kind, k), k) for k in (1.00, 1.02, 1.04, 1.05, 1.06, 1.08)), key=lambda t: t[0][1])
    (v, miss, (h, ymin)), k = best
    out.writerow([setting, surf, f'{k:.2f}', f'{v:.3f}', f'{miss:.4f}', miss <= 0.002])
    print(f'{arg:34s} best stretch x{k:.2f}: fit {v:.3f}, missing ink {100*miss:.2f}%', '(flag threshold 0.20%)')
