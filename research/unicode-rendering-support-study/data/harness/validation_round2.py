#!/usr/bin/env python3
"""Holdout validation round (fresh seed, never used to tune the detector).
  validation_round2.py make   -> validation/round2_holdout/sample.csv + sheets (predictions hidden)
  validation_round2.py score  -> reads validation/round2_holdout/manual_labels.csv
Strata: 60 supported single cp, 60 unsupported single cp (4 conditions), every remaining UNKNOWN/BLANK/TEXT_FALLBACK cp,
        40 sequences predicted FULL, 40 predicted not-FULL; 25 of the sequences come from historical-font replay conditions (old Noto binaries)."""
import sys, os, csv, gzip, random, json, collections, glob
from PIL import Image, ImageDraw, ImageFont
from conditions import *
V = f'{ROOT}/validation/round2_holdout'; os.makedirs(f'{V}/sheets', exist_ok=True)
CONDS = ['A_stock', 'A_minimal', 'A_distro', 'B_noto']; CH = 'c155'
def load(run):
    with gzip.open(f'{ROOT}/results/classified/{run}.csv.gz', 'rt', encoding='utf-8', newline='') as f: return list(csv.DictReader(f))
used = {(r['run_id'], r['item_id']) for r in csv.DictReader(open(f'{ROOT}/validation/sample.csv', encoding='utf-8'))}
def make():
    rnd = random.Random(20261013); S = []
    def add(stratum, cond, kind, r): S.append(dict(stratum=stratum, condition=cond, kind=kind, row=r))
    for c in CONDS:
        cp = [r for r in load(f'{c}__codepoints__{CH}') if r['item_kind'] == 'codepoint' and (r['run_id'], r['item_id']) not in used]
        for r in rnd.sample([r for r in cp if r['render_class'] in ('MONO_GLYPH', 'COLOR_EMOJI')], 15): add('S_SUP', c, 'cp', r)
        for r in rnd.sample([r for r in cp if r['render_class'] in ('TOFU', 'LASTRESORT_HEXBOX')], 15): add('S_UNS', c, 'cp', r)
        for r in cp:
            if r['render_class'] in ('UNKNOWN', 'TEXT_FALLBACK', 'BLANK'): add('S_ODD', c, 'cp', r)
        sq = [r for r in load(f'{c}__sequences__{CH}') if r['item_kind'] == 'sequence' and (r['run_id'], r['item_id']) not in used]
        ok = [r for r in sq if r['render_class'] == 'FULL']; bad = [r for r in sq if r['render_class'] not in ('FULL', 'SENTINEL')]
        for r in rnd.sample(ok, min(5, len(ok))): add('Q_OK', c, 'seq', r)
        for r in rnd.sample(bad, min(5, len(bad))): add('Q_BAD', c, 'seq', r)
    for c in CONDS:        # UTG-inventory code points (mostly old, BMP): incl. every normalization-fallback case
        u = [r for r in load(f'{c}__utgcp__{CH}') if r['item_kind'] == 'codepoint']
        sup = [r for r in u if r['render_class'] in ('MONO_GLYPH', 'COLOR_EMOJI') and r.get('decomposition_fallback') != '1']; uns = [r for r in u if r['render_class'] in ('TOFU', 'LASTRESORT_HEXBOX', 'BLANK')]; dec = [r for r in u if r.get('decomposition_fallback') == '1']
        for r in rnd.sample(sup, 6): add('U_UTG', c, 'cp', r)
        for r in rnd.sample(uns, 5): add('U_UTG', c, 'cp', r)
        for r in rnd.sample(dec, min(5, len(dec))): add('U_UTG', c, 'cp', r)
    reps = sorted(glob.glob(f'{ROOT}/results/classified/R_*__sequences__{CH}.csv.gz'))
    rr = rnd.sample(reps, 10)
    for p in rr:
        rows = [r for r in load(os.path.basename(p)[:-7]) if r['item_kind'] == 'sequence']
        ok = [r for r in rows if r['render_class'] == 'FULL']; bad = [r for r in rows if r['render_class'] != 'FULL']
        for r in rnd.sample(ok, 2): add('Q_OK', r['condition'], 'seq', r)
        for r in rnd.sample(bad, min(3, len(bad))): add('Q_BAD', r['condition'], 'seq', r)
    rnd.shuffle(S)
    for i, s in enumerate(S): s['sample_id'] = f'W{i:04d}'
    pagecache = {}
    def cell(s):
        r = s['row']; run = r['run_id']; k = (run, int(r['page']))
        if k not in pagecache:
            pagecache.clear(); pagecache[k] = Image.open(f"{CACHE}/screens/{run}/pages/p{int(r['page']):04d}.png").convert('RGB')
        x, y = int(r['x']), int(r['y']); w = 88 if s['kind'] == 'cp' else 330
        return pagecache[k].crop((x, y, x + w, y + 80))
    fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 10)
    for kind in ('cp', 'seq'):
        items = [x for x in S if x['kind'] == kind]; per, cols, cw = (60, 10, 92) if kind == 'cp' else (28, 4, 334)
        for s0 in range(0, len(items), per):
            chunk = items[s0:s0 + per]; rows = (len(chunk) + cols - 1) // cols; ch = 106
            sh = Image.new('RGB', (cols * cw, rows * ch), 'white'); dr = ImageDraw.Draw(sh)
            for j, s in enumerate(chunk):
                cx, cy = (j % cols) * cw, (j // cols) * ch
                sh.paste(cell(s), (cx + 2, cy + 12)); dr.rectangle([cx, cy, cx + cw - 2, cy + ch - 2], outline=(200, 200, 200)); dr.text((cx + 3, cy + 1), s['sample_id'], fill=(180, 0, 0), font=fnt)
                lab = s['row']['item_id'] if kind == 'cp' else (s['row'].get('name') or '')[:40] + ' | ' + s['row']['item_id'][4:34]
                dr.text((cx + 3, cy + 94), lab[:(14 if kind == 'cp' else 70)], fill=(60, 60, 60), font=fnt)
            sh.save(f'{V}/sheets/sheet_{kind}_{s0 // per:02d}.png')
    with open(f'{V}/sample.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['sample_id', 'stratum', 'condition', 'kind', 'item_id', 'predicted_class', 'class_reason', 'fonts_used', 'run_id', 'page', 'x', 'y'])
        for s in sorted(S, key=lambda x: x['sample_id']):
            r = s['row']; w.writerow([s['sample_id'], s['stratum'], s['condition'], s['kind'], r['item_id'], r['render_class'], r['class_reason'], r['fonts_used'], r['run_id'], r['page'], r['x'], r['y']])
    print(len(S), collections.Counter(s['stratum'] for s in S), collections.Counter(s['kind'] for s in S))
if __name__ == '__main__' and sys.argv[1] == 'make': make()
