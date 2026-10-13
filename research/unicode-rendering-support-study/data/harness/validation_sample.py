#!/usr/bin/env python3
"""Stratified manual-validation sample + contact sheets (predictions are NOT drawn on the sheets, so labelling is blind to the detector).
  validation_sample.py make     -> validation/sample.csv (with predictions) + validation/sheets/sheet_NN.png (cell crops, index, hex, name)
  validation_sample.py score    -> reads validation/manual_labels.csv, writes validation/confusion*.csv and validation/summary.json
Seed fixed; strata:
  S_SUP  100 single code points predicted supported (25 per condition)
  S_UNS  100 single code points predicted unsupported (TOFU / LASTRESORT_HEXBOX / BLANK) (25 per condition, hexbox only exists in A_stock)
  S_ODD  every UNKNOWN / BLANK / TEXT_FALLBACK / INVISIBLE_OK single code point in the four primary conditions (the 'unusual clusters')
  Q_OK   50 sequences predicted FULL      Q_BAD 50 sequences predicted PARTIAL/DECOMPOSED/MISSING/TEXT_FALLBACK/UNKNOWN"""
import sys, os, csv, gzip, random, json, collections
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from conditions import *
V = f'{ROOT}/validation'; os.makedirs(f'{V}/sheets', exist_ok=True)
CONDS = ['A_stock', 'A_minimal', 'A_distro', 'B_noto']; CH = 'c155'
def load(run):
    with gzip.open(f'{ROOT}/results/classified/{run}.csv.gz', 'rt', encoding='utf-8', newline='') as f: return list(csv.DictReader(f))
def sample():
    rnd = random.Random(20261012); out = []
    cp = {c: [r for r in load(f'{c}__codepoints__{CH}') if r['item_kind'] == 'codepoint'] for c in CONDS}
    sq = {c: [r for r in load(f'{c}__sequences__{CH}') if r['item_kind'] == 'sequence'] for c in CONDS}
    def pick(rows, n, tag, cond, kind):
        for r in rnd.sample(rows, min(n, len(rows))): out.append(dict(stratum=tag, condition=cond, kind=kind, row=r))
    for c in CONDS:
        sup = [r for r in cp[c] if r['render_class'] in ('MONO_GLYPH', 'COLOR_EMOJI')]
        # stratify supported by Unicode version so old and new are both represented
        byv = collections.defaultdict(list)
        for r in sup: byv[r['unicode_version']].append(r)
        vs = sorted(byv); k = 0
        while k < 25 and vs:
            for v in vs:
                if k >= 25: break
                if byv[v]: out.append(dict(stratum='S_SUP', condition=c, kind='cp', row=byv[v].pop(rnd.randrange(len(byv[v]))))); k += 1
            vs = [v for v in vs if byv[v]]
        uns = [r for r in cp[c] if r['render_class'] in ('TOFU',)]; hexb = [r for r in cp[c] if r['render_class'] == 'LASTRESORT_HEXBOX']; blank = [r for r in cp[c] if r['render_class'] == 'BLANK']
        if c == 'A_stock': pick(uns, 10, 'S_UNS', c, 'cp'); pick(hexb, 12, 'S_UNS', c, 'cp'); pick(blank, 3, 'S_UNS', c, 'cp')
        else:
            nb = min(1, len(blank)); pick(uns, 25 - nb, 'S_UNS', c, 'cp'); pick(blank, nb, 'S_UNS', c, 'cp')
        for r in cp[c]:
            if r['render_class'] in ('UNKNOWN', 'TEXT_FALLBACK', 'INVISIBLE_OK') or (r['render_class'] == 'BLANK' and r not in blank[:0]):
                if not any(o['row'] is r for o in out): out.append(dict(stratum='S_ODD', condition=c, kind='cp', row=r))
        ok = [r for r in sq[c] if r['render_class'] == 'FULL']; bad = [r for r in sq[c] if r['render_class'] not in ('FULL', 'SENTINEL')]
        byt = collections.defaultdict(list)
        for r in ok: byt[r['sequence_type']].append(r)
        k = 0; ts = sorted(byt)
        while k < 13 and ts:
            for t in ts:
                if k >= 13: break
                if byt[t]: out.append(dict(stratum='Q_OK', condition=c, kind='seq', row=byt[t].pop(rnd.randrange(len(byt[t]))))); k += 1
            ts = [t for t in ts if byt[t]]
        byc = collections.defaultdict(list)
        for r in bad: byc[r['render_class']].append(r)
        k = 0; cs = sorted(byc); quota = 15 if c != 'B_noto' else 99
        while k < quota and cs:
            for t in cs:
                if k >= quota: break
                if byc[t]: out.append(dict(stratum='Q_BAD', condition=c, kind='seq', row=byc[t].pop(rnd.randrange(len(byc[t]))))); k += 1
            cs = [t for t in cs if byc[t]]
    return out
def font(sz):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',):
        return ImageFont.truetype(p, sz)
def make():
    S = sample(); rnd = random.Random(7); rnd.shuffle(S)   # shuffle so a sheet mixes conditions and strata (blind)
    for i, s in enumerate(S): s['sample_id'] = f'V{i:04d}'
    cache = {}
    pagecache = {}
    def cell(s):
        r = s['row']; run = f"{s['condition']}__{'codepoints' if s['kind']=='cp' else 'sequences'}__{CH}"
        k = (run, int(r['page']))
        if k not in pagecache:
            pagecache.clear(); pagecache[k] = Image.open(f"{CACHE}/screens/{run}/pages/p{int(r['page']):04d}.png").convert('RGB')
        im = pagecache[k]; x, y = int(r['x']), int(r['y']); w = 88 if s['kind'] == 'cp' else 330
        return im.crop((x, y, x + w, y + 80))
    fnt = font(10)
    sheets = {'cp': [x for x in S if x['kind'] == 'cp'], 'seq': [x for x in S if x['kind'] == 'seq']}
    n = 0
    for kind, items in sheets.items():
        per, cols, cw = (60, 10, 92) if kind == 'cp' else (28, 4, 334)
        for s0 in range(0, len(items), per):
            chunk = items[s0:s0 + per]; rows = (len(chunk) + cols - 1) // cols; cellh = 80 + 26
            sh = Image.new('RGB', (cols * cw, rows * cellh), 'white'); dr = ImageDraw.Draw(sh)
            for j, s in enumerate(chunk):
                cx, cy = (j % cols) * cw, (j // cols) * cellh
                sh.paste(cell(s), (cx + 2, cy + 12))
                dr.rectangle([cx, cy, cx + cw - 2, cy + cellh - 2], outline=(200, 200, 200))
                dr.text((cx + 3, cy + 1), s['sample_id'], fill=(180, 0, 0), font=fnt)
                lab = (s['row']['item_id'] if kind == 'cp' else s['row']['item_id'][4:]) 
                if kind == 'seq': lab = (s['row'].get('name') or '')[:46] + ' | ' + lab[:30]
                dr.text((cx + 3, cy + 94), lab[:(14 if kind == 'cp' else 70)], fill=(60, 60, 60), font=fnt)
            sh.save(f'{V}/sheets/sheet_{kind}_{s0 // per:02d}.png'); n += 1
    with open(f'{V}/sample.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['sample_id', 'stratum', 'condition', 'kind', 'item_id', 'predicted_class', 'class_reason', 'fonts_used', 'run_id', 'page', 'x', 'y'])
        for s in sorted(S, key=lambda x: x['sample_id']):
            r = s['row']; w.writerow([s['sample_id'], s['stratum'], s['condition'], s['kind'], r['item_id'], r['render_class'], r['class_reason'], r['fonts_used'], r['run_id'], r['page'], r['x'], r['y']])
    print(len(S), 'samples;', n, 'sheets', collections.Counter((s['stratum']) for s in S))
if __name__ == '__main__':
    if sys.argv[1] == 'make': make()
