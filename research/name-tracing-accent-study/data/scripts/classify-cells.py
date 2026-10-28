#!/usr/bin/env python3
"""Turn oracle and clip-scan output into one verdict per cell.

A cell is FLAGGED when any of these holds. The first two were fixed before the fault-injection run; the third was
added after that run showed the first two caught 154 of 161 names with their marks removed (the misses were a
thin Polish bar and one small accent), and the combined rule was then re-tested on the same data, so its 161 of
161 is a tuned result and not an independent one:
  * the weakest mark region is less than 60% present in the export (solid_recall < 0.6)
  * the expected name fits the export worse than 0.85 (solid_ncc < 0.85)
  * more than 0.2% of the expected glyph ink is missing from the export (missing_frac > 0.002)

Usage: classify-cells.py <oracle.csv> <clipscan.csv> <out.csv>
"""
import csv, sys
def num(x): return float(x) if x not in ('', None) else None
oracle = {(r['surface'], r['fixture']): r for r in csv.DictReader(open(sys.argv[1]))}
clip = {(r['surface'], r['fixture']): r for r in csv.DictReader(open(sys.argv[2]))}
rows = []
for k, o in oracle.items():
    c = clip[k]; why = []
    rc, nc, mf = num(o.get('solid_recall')), num(o.get('solid_ncc')), num(c.get('missing_frac')) or 0.0
    if rc is not None and rc < 0.6: why.append('mark_recall<0.6')
    if nc is not None and nc < 0.85: why.append('fit<0.85')
    if mf > 0.002: why.append('missing_ink>0.2%')
    rows.append(dict(surface=k[0], fixture=k[1], flagged=bool(why), reasons='+'.join(why), solid_fit=o.get('solid_ncc'),
                     mark_recall=o.get('solid_recall'), missing_ink_share=c.get('missing_frac'), clip_line=c.get('clip_line_test'),
                     missing_rows_below_clip=c.get('rows_below_clip_px'), expected_height_px=c.get('expected_height_px')))
with open(sys.argv[3], 'w', newline='') as f:
    w = csv.DictWriter(f, list(rows[0])); w.writeheader(); w.writerows(rows)
print(sum(r['flagged'] for r in rows), 'flagged of', len(rows))
