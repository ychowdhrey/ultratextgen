#!/usr/bin/env python3
"""Alternative emoji fonts: share of fully-qualified emoji sequences that compose (browser, FULL) by Emoji version, per font file.
Same Chromium 155, same fallback text font (DejaVu Sans), fontconfig set with ONE emoji font. Writes results/tables/alt_emoji_fonts_by_version.csv
and alt_emoji_fonts_class_agreement.csv (item-level differences between the three Noto 2.057 builds)."""
import csv, gzip, os, collections
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); T = f'{ROOT}/results/tables'
def read(run):
    with gzip.open(f'{ROOT}/results/classified/{run}.csv.gz', 'rt', encoding='utf-8') as f: return list(csv.DictReader(f))
FONTS = {'Noto-CBDT-2.057': 'R_ALT-CBDT-1ffdd21', 'Noto-COLRv1-2.057': 'R_ALT-COLRv1-1ffdd21', 'Noto-WindowsCompatible-2.057': 'R_ALT-WinCompat-1ffdd21', 'Twemoji-Mozilla-COLR-0.7.0': 'R_ALT-Twemoji15'}
data = {f: {r['item_id']: r for r in read(f'{run}__sequences__c155') if r['item_kind'] == 'sequence' and r.get('status') == 'fully-qualified'} for f, run in FONTS.items()}
ids = sorted(next(iter(data.values())))
ver = {i: next(iter(data.values()))[i].get('emoji_version') or next(iter(data.values()))[i].get('unicode_version') for i in ids}
def vkey(v): return tuple(int(x) for x in v.split('.')) if v and v[0].isdigit() else (99,)
vs = sorted(set(ver.values()), key=vkey)
rows = []
for v in vs:
    sel = [i for i in ids if ver[i] == v]
    row = dict(emoji_version=v, n_fully_qualified=len(sel))
    for f in FONTS: row[f] = round(100 * sum(data[f][i]['render_class'] == 'FULL' for i in sel) / len(sel), 1)
    rows.append(row)
with open(f'{T}/alt_emoji_fonts_by_version.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
base = data['Noto-CBDT-2.057']; ag = []
for f in ('Noto-COLRv1-2.057', 'Noto-WindowsCompatible-2.057'):
    diff = [i for i in ids if data[f][i]['render_class'] != base[i]['render_class']]
    ag.append(dict(font=f, compared_with='Noto-CBDT-2.057', items=len(ids), items_with_different_class=len(diff), examples=' | '.join(diff[:5])))
with open(f'{T}/alt_emoji_fonts_class_agreement.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(ag[0])); w.writeheader(); w.writerows(ag)
for r in rows: print(r)
print(ag)
