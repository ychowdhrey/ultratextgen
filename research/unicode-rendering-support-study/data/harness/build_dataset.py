#!/usr/bin/env python3
"""Build Dataset 1 (assigned code points, Unicode 10.0..newest + older controls) and
Dataset 2 (emoji sequences) from the official UCD / emoji files in data/raw.
The newest Unicode version is discovered from DerivedAge.txt; nothing is hard-coded.
Usage: build_dataset.py [--ref-date YYYY-MM-DD]   (age_days is measured at ref-date; default = today)"""
import csv, os, sys, datetime, argparse
import ucd_lib as U

ap = argparse.ArgumentParser(); ap.add_argument('--ref-date', default=str(datetime.date.today()))
a = ap.parse_args()
ref = datetime.date.fromisoformat(a.ref_date)
OUT = os.path.normpath(os.path.join(U.HERE, '..', 'data', 'derived')); os.makedirs(OUT, exist_ok=True)

dates = U.release_dates()
vkey = lambda v: tuple(int(x) for x in v.split('.'))
age = U.derived_age()
ud, ud_ranges = U.unicode_data()
scripts = U.simple_prop('Scripts.txt'); blocks = U.simple_prop('Blocks.txt')
emo = U.binary_props('emoji-data.txt')
dcp = U.binary_props('DerivedCoreProperties.txt')
vs_bases = U.vs_sequences()

# newest version = max version present in DerivedAge
all_versions = sorted({r[2] for r in age.r}, key=vkey)
newest = all_versions[-1]
STUDY_MIN, CONTROL_VERSIONS = '10.0', ('8.0', '9.0')
role = lambda v: 'study' if vkey(v) >= vkey(STUDY_MIN) else ('control' if v in CONTROL_VERSIONS else None)

def name_of(cp):
    if cp in ud: return ud[cp]['name'], ud[cp]['gc'], ud[cp]['ccc']
    for lo, hi, nm, gc, ccc in ud_ranges:
        if lo <= cp <= hi: return f'{nm.upper()}-{cp:04X}', gc, ccc
    return None, 'Cn', 0   # assigned in DerivedAge but absent from UnicodeData => should not happen

rows = []
for lo, hi, ver in age.r:
    if role(ver) is None: continue
    rel = dates[ver]; reld = datetime.date.fromisoformat(rel)
    for cp in range(lo, hi + 1):
        name, gc, ccc = name_of(cp)
        sc = scripts.get(cp) or 'Unknown'
        bl = blocks.get(cp) or 'No_Block'
        rows.append(dict(
            codepoint=f'U+{cp:04X}', cp_int=cp, character=chr(cp) if not (0xD800 <= cp <= 0xDFFF) else '', unicode_name=name,
            unicode_version=ver, unicode_release_date=rel, age_days=(ref - reld).days, study_role=role(ver),
            general_category=gc, script=sc, block=bl,
            emoji_property=int(emo['Emoji'].get(cp) is not None) if 'Emoji' in emo else 0,
            emoji_presentation_property=int(emo['Emoji_Presentation'].get(cp) is not None),
            extended_pictographic=int(emo['Extended_Pictographic'].get(cp) is not None),
            emoji_modifier=int(emo['Emoji_Modifier'].get(cp) is not None),
            emoji_component=int(emo['Emoji_Component'].get(cp) is not None),
            variation_selector_relevance=int(cp in vs_bases),
            combining_character=int(gc in ('Mn', 'Mc', 'Me') or ccc > 0),
            default_ignorable=int(dcp['Default_Ignorable_Code_Point'].get(cp) is not None),
            assigned_status='assigned', source='DerivedAge.txt+UnicodeData.txt+Scripts.txt+Blocks.txt+emoji-data.txt'))
with open(f'{OUT}/codepoints.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

# ---- Dataset 2: emoji sequences (emoji-test.txt, every status recorded; study uses fully-qualified+component)
seqs = []
etab = U.emoji_release_table()
for e in U.emoji_test():
    ev = e['version']
    if ev in etab: rel, uv = etab[ev]
    elif ev in ('0.6', '0.7'):                     # pre-table: dated by the Unicode release that carried them
        uv = ev.replace('0.', '') + '.0'; rel = dates[uv]
    else: raise SystemExit(f'emoji version {ev} has no release date')
    r = 'study' if vkey(ev) >= vkey('5.0') else 'control'
    reld = datetime.date.fromisoformat(rel)
    seq = e['seq']
    seqs.append(dict(seq_hex=' '.join(f'{c:04X}' for c in seq), sequence=''.join(map(chr, seq)), name=e['name'],
        status=e['status'], emoji_version=e['version'], unicode_version=uv, emoji_release_date=rel, age_days=(ref - reld).days,
        study_role=r, sequence_type=U.sequence_type(seq), length=len(seq), group=e['group'], subgroup=e['subgroup'],
        source='emoji-test.txt+UTS51 emoji versions table'))
with open(f'{OUT}/emoji_sequences.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(seqs[0])); w.writeheader(); w.writerows(seqs)

import collections, json
meta = dict(ref_date=str(ref), newest_unicode_version=newest, newest_release_date=dates[newest],
            codepoints=len(rows), sequences=len(seqs),
            per_version_codepoints=dict(collections.Counter(r['unicode_version'] for r in rows)),
            per_emoji_version_sequences=dict(collections.Counter(s['emoji_version'] for s in seqs)),
            ucd_file_sha256={fn: __import__('hashlib').sha256(open(os.path.join(U.RAW, d, fn), 'rb').read()).hexdigest()
                             for d, fn in [('ucd', 'DerivedAge.txt'), ('ucd', 'UnicodeData.txt'), ('emoji', 'emoji-test.txt'), ('ucd', 'emoji-data.txt'), ('ucd', 'Scripts.txt'), ('ucd', 'Blocks.txt')]})
json.dump(meta, open(f'{OUT}/dataset_meta.json', 'w'), indent=1)
print(json.dumps({k: meta[k] for k in ('newest_unicode_version', 'codepoints', 'sequences', 'per_version_codepoints', 'per_emoji_version_sequences')}, indent=1))
