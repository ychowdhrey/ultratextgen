#!/usr/bin/env python3
"""Limitation 6 of the study: combining marks were tested on a dotted circle (U+25CC), and Chromium picks a font per cluster, so a mark can fail
there only because the dotted circle drags in another font. Here every mark that FAILED in the main run is re-tested on a real base letter of its own script
(or Latin 'a' for Common/Inherited marks), in the same font set and Chromium.
Verdict: SUPPORTED_REAL_BASE = a font used for the cluster maps the mark (cmap, from CDP platform fonts) AND the pixels differ from the base letter alone;
STILL_FAILS otherwise. Output: results/tables/combining_real_base.csv and combining_real_base_summary.csv"""
import csv, gzip, os, pickle, collections, sys, tempfile
import render_harness as H
from conditions import *
OUTT = f'{ROOT}/results/tables'
def read(run):
    with gzip.open(f'{ROOT}/results/classified/{run}.csv.gz', 'rt', encoding='utf-8') as f: return list(csv.DictReader(f))
UNSUP = {'TOFU', 'LASTRESORT_HEXBOX', 'BLANK', 'REPLACEMENT_GLYPH'}
allcp = {r['codepoint']: r for r in csv.DictReader(open(f'{ROOT}/data/derived/codepoints.csv', encoding='utf-8'))}
def vtuple(v): return tuple(int(x) for x in v.split('.'))
summary = []; rows = []
for cond in ('A_stock', 'A_minimal', 'A_distro'):
    cls = {r['item_id']: r for r in read(f'{cond}__codepoints__c155')}
    cm = pickle.load(open(f'{CACHE}/cmap_{cond}.pkl', 'rb'))
    failed = [r for r in cls.values() if r['item_kind'] == 'codepoint' and r.get('combining') == '1' and r['render_class'] in UNSUP]
    # base letters that this font set draws as a real glyph, per script (oldest first, so the base is never newer than the mark)
    bases = collections.defaultdict(list)
    for r in cls.values():
        if r['item_kind'] == 'codepoint' and r['general_category'] in ('Lo', 'Ll', 'Lu') and r['render_class'] in ('MONO_GLYPH',) and r.get('combining') != '1':
            bases[r['script']].append((vtuple(r['unicode_version']), r['item_id'], r['text']))
    for s in bases: bases[s].sort()
    items = []; meta = {}
    for r in failed:
        sc = r['script']; cand = [b for b in bases.get(sc, []) if b[0] <= vtuple(r['unicode_version'])]
        if sc in ('Common', 'Inherited', 'Zyyy', 'Zinh') or not cand: base = ('a-fallback', 'U+0061', 'a'); how = 'latin_a'
        else: base = cand[len(cand) // 2]; how = 'script_letter'
        m = chr(int(r['item_id'][2:], 16))
        meta[r['item_id']] = (base, how)
        items.append(dict(item_id=r['item_id'] + '|mark', item_kind='real_base', text=base[2] + m, cp_int=int(r['item_id'][2:], 16)))
        items.append(dict(item_id=r['item_id'] + '|base', item_kind='base_alone', text=base[2], cp_int=int(base[1][2:], 16)))
    if not items: summary.append(dict(condition=cond, failed_on_dotted_circle=0)); continue
    out = tempfile.mkdtemp(prefix='cb-', dir=CACHE)
    obs, _ = H.run(cond, 'codepoints', items, out, save_png=False)
    by = {o['item_id']: o for o in obs}
    n_ok = 0
    for r in failed:
        iid = r['item_id']; cp = int(iid[2:], 16); o = by[iid + '|mark']; b = by[iid + '|base']
        fams = [p.split('#') for p in o['fonts_used'].split('|') if p]
        mapped = any(cp in cm['ps'].get(p[1], ()) for p in fams)
        differs = o['pixel_sha1'] != b['pixel_sha1']
        ok = mapped and differs; n_ok += ok
        rows.append(dict(condition=cond, mark=iid, name=r['unicode_name'], script=r['script'], version=r['unicode_version'], dotted_circle_class=r['render_class'],
                         base=meta[iid][0][1], base_choice=meta[iid][1], font_for_cluster=o['fonts_used'], mark_mapped_by_used_font=int(mapped), pixels_differ_from_base=int(differs),
                         verdict='SUPPORTED_REAL_BASE' if ok else 'STILL_FAILS'))
    summary.append(dict(condition=cond, failed_on_dotted_circle=len(failed), supported_on_real_base=n_ok, still_fails=len(failed) - n_ok))
    print(summary[-1], flush=True)
with open(f'{OUTT}/combining_real_base.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
with open(f'{OUTT}/combining_real_base_summary.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['condition', 'failed_on_dotted_circle', 'supported_on_real_base', 'still_fails']); w.writeheader(); w.writerows(summary)
