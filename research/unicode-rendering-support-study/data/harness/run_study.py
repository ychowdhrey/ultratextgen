#!/usr/bin/env python3
"""Run one (condition, kind) rendering pass and store raw observations.
  run_study.py --condition A_desktop --kind codepoints [--limit-pages N]
kinds: codepoints (Dataset 1 + sentinels) | vs (VS15/VS16 presentation pairs) | sequences (Dataset 2, all statuses) | emoji_cp (emoji code points, bare)
Raw output: results/raw/<run_id>.csv.gz ; env/meta: results/env/<run_id>.json ; page PNGs: cache/screens/<run_id>/ (not committed)"""
import argparse, csv, gzip, json, os, sys, datetime, platform, subprocess, hashlib
import ucd_lib as U
import render_harness as H
from conditions import *
ap = argparse.ArgumentParser()
ap.add_argument('--condition', required=True); ap.add_argument('--kind', required=True)
ap.add_argument('--limit-pages', type=int); ap.add_argument('--tag', default='')
ap.add_argument('--dpr', type=int, default=1); ap.add_argument('--lang', default='en'); ap.add_argument('--headed', action='store_true'); ap.add_argument('--fc-cold', action='store_true'); ap.add_argument('--chrome', default=H.DEFAULT_CHROME); ap.add_argument('--only-versions', default='')
a = ap.parse_args()
D = f'{ROOT}/data/derived'

def build_items(kind):
    items = []
    if kind == 'codepoints':
        # sentinels first: one-to-three unassigned code points per block + noncharacters + known-good controls
        age = U.derived_age(); ud, udr = U.unicode_data(); blocks = U.simple_prop('Blocks.txt')
        assigned = lambda cp: age.get(cp) is not None or cp in ud or any(lo <= cp <= hi for lo, hi, *_ in udr)
        for lo, hi, f in sorted(blocks.r):
            n = 0
            for cp in range(lo, min(hi, lo + 4000) + 1):
                if not assigned(cp) and (cp & 0xFFFE) != 0xFFFE and not (0xFDD0 <= cp <= 0xFDEF):
                    items.append(dict(item_id=f'U+{cp:04X}', item_kind='sentinel_unassigned', text=chr(cp), unicode_version='', study_role='sentinel', block=f[0]))
                    n += 1
                    if n >= 3: break
        for cp in (0xFFFE, 0xFFFF, 0x1FFFE, 0x10FFFE, 0x10FFFF, 0xFDD0):
            items.append(dict(item_id=f'U+{cp:04X}', item_kind='sentinel_noncharacter', text=chr(cp), unicode_version='', study_role='sentinel'))
        for cp, nm in ((0x20, 'SPACE'), (0x41, 'A'), (0x4E2D, 'CJK'), (0x1F600, 'GRINNING FACE'), (0x25A0, 'BLACK SQUARE'), (0xFFFD, 'REPLACEMENT CHARACTER'), (0x25CC, 'DOTTED CIRCLE'), (0x2764, 'HEAVY BLACK HEART')):
            items.append(dict(item_id=f'U+{cp:04X}', item_kind='control_known', text=chr(cp), unicode_version='', study_role='control_known', name=nm))
        for r in csv.DictReader(open(f'{D}/codepoints.csv', encoding='utf-8')):
            cp = int(r['cp_int']); ch = chr(cp)
            text = '◌' + ch if r['combining_character'] == '1' else ch
            items.append(dict(item_id=r['codepoint'], item_kind='codepoint', text=text, cp_int=cp, unicode_version=r['unicode_version'], study_role=r['study_role'],
                              general_category=r['general_category'], script=r['script'], block=r['block'], emoji=r['emoji_property'], emoji_presentation=r['emoji_presentation_property'],
                              combining=r['combining_character'], default_ignorable=r['default_ignorable'], age_days=r['age_days']))
    elif kind == 'vs':
        age = U.derived_age(); dates = U.release_dates(); ep = U.binary_props('emoji-data.txt')['Emoji_Presentation']
        for cp in sorted(U.vs_sequences()):
            v = age.get(cp) or '?'
            for vs, nm in ((0xFE0E, 'VS15_text'), (0xFE0F, 'VS16_emoji')):
                items.append(dict(item_id=f'U+{cp:04X}+{vs:04X}', item_kind=nm, text=chr(cp) + chr(vs), cp_int=cp, unicode_version=v, emoji_presentation_default=int(ep.get(cp) is not None),
                                  study_role='study' if v != '?' and tuple(map(int, v.split('.'))) >= (10, 0) else 'control'))
            items.append(dict(item_id=f'U+{cp:04X}+bare', item_kind='VS_none', text=chr(cp), cp_int=cp, unicode_version=v, emoji_presentation_default=int(ep.get(cp) is not None),
                              study_role='study' if v != '?' and tuple(map(int, v.split('.'))) >= (10, 0) else 'control'))
    elif kind in ('utgcp', 'utgseq'):
        units = list(csv.DictReader(open(f'{D}/utg_units.csv', encoding='utf-8')))
        if kind == 'utgseq':
            items.append(dict(item_id='SEQ SENT-NONSENSE', item_kind='sentinel_sequence', text='\U0001F34E\u200D\U0001F697\u200D\U0001F4A9', sequence_type='zwj', status='sentinel', length=5, unicode_version='', study_role='sentinel', name='nonsense'))
            for r in units:
                if r['kind'] != 'emoji_unit': continue
                items.append(dict(item_id='SEQ ' + r['unit_hex'], item_kind='sequence', text=r['text'], sequence_type=U.sequence_type(tuple(ord(c) for c in r['text'])), status='utg', length=r['n_cps'],
                                  unicode_version='', study_role='utg', in_copy_surface=r['in_copy_surface'], name=''))
        else:
            # sentinels / controls: reuse the codepoints kind's definition
            items.extend(i for i in build_items('codepoints') if i['item_kind'] != 'codepoint')
            seen = set()
            for r in units:
                if r['kind'] == 'codepoint':
                    cp = int(r['cp_int']); seen.add(cp)
                    items.append(dict(item_id=f'U+{cp:04X}', item_kind='codepoint', text=('\u25CC' if r['combining_character'] == '1' else '') + chr(cp), cp_int=cp, unicode_version=r['unicode_version'], study_role='utg',
                                      general_category=r['general_category'], script=r['script'], block=r['block'], emoji=r['emoji_property'], emoji_presentation=r['emoji_presentation_property'],
                                      combining=r['combining_character'], default_ignorable=r['default_ignorable'], age_days='', in_copy_surface=r['in_copy_surface']))
            age = U.derived_age(); ud, udr = U.unicode_data(); epp = U.binary_props('emoji-data.txt'); dcp = U.binary_props('DerivedCoreProperties.txt')
            for r in units:
                if r['kind'] != 'emoji_unit': continue
                for c in (ord(ch) for ch in r['text']):
                    if c in seen or c in (0x200D, 0xFE0F, 0xFE0E) or 0xE0020 <= c <= 0xE007F: continue
                    seen.add(c); gc = ud[c]['gc'] if c in ud else 'So'
                    items.append(dict(item_id=f'U+{c:04X}', item_kind='codepoint', text=chr(c), cp_int=c, unicode_version=age.get(c) or '?', study_role='utg_component', general_category=gc, script='', block='',
                                      emoji='1', emoji_presentation=str(int(epp['Emoji_Presentation'].get(c) is not None)), combining='0', default_ignorable='0', age_days='', in_copy_surface='1'))
    elif kind == 'emojicp':
        for r in csv.DictReader(open(f'{D}/codepoints.csv', encoding='utf-8')):
            if r['emoji_property'] == '1' or r['extended_pictographic'] == '1':
                items.append(dict(item_id=r['codepoint'], item_kind='codepoint', text=r['character'], cp_int=int(r['cp_int']), unicode_version=r['unicode_version'], study_role=r['study_role'],
                                  emoji=r['emoji_property'], emoji_presentation=r['emoji_presentation_property'], general_category=r['general_category']))
    elif kind == 'components':
        # every distinct non-ZWJ/VS/tag component of every emoji sequence, rendered bare (used to classify DECOMPOSED vs PARTIAL vs MISSING)
        comps = set()
        for r in csv.DictReader(open(f'{D}/emoji_sequences.csv', encoding='utf-8')):
            for h in r['seq_hex'].split():
                c = int(h, 16)
                if c not in (0x200D, 0xFE0F, 0xFE0E) and not (0xE0020 <= c <= 0xE007F): comps.add(c)
        for c in sorted(comps):
            items.append(dict(item_id=f'U+{c:04X}', item_kind='component', text=chr(c), cp_int=c, unicode_version='', study_role='component'))
    elif kind == 'sequences':
        for r in csv.DictReader(open(f'{D}/emoji_sequences.csv', encoding='utf-8')):
            items.append(dict(item_id='SEQ ' + r['seq_hex'], item_kind='sequence', text=r['sequence'], sequence_type=r['sequence_type'], status=r['status'], length=r['length'],
                              unicode_version=r['emoji_version'], study_role=r['study_role'], name=r['name'], age_days=r['age_days']))
        # sentinel for sequence layout: a made-up ZWJ sequence that no font composes
        items.insert(0, dict(item_id='SEQ SENT-NONSENSE', item_kind='sentinel_sequence', text='\U0001F34E‍\U0001F697‍\U0001F4A9', sequence_type='zwj', status='sentinel', length=5, unicode_version='', study_role='sentinel', name='apple ZWJ car ZWJ poo (nonexistent)'))
        items.insert(1, dict(item_id='SEQ SENT-NONFLAG', item_kind='sentinel_sequence', text='\U0001F1FF\U0001F1FF', sequence_type='flag_regional_indicator', status='sentinel', length=2, unicode_version='', study_role='sentinel', name='ZZ (no such flag)'))
    return items

kind = a.kind
items = build_items(kind)
if a.only_versions: items = [i for i in items if i.get('unicode_version') in a.only_versions.split(',') or i['study_role'] == 'sentinel']
run_id = f"{a.condition}__{kind}__c{a.chrome.split('.')[0]}{'__' + a.tag if a.tag else ''}"
out = f'{CACHE}/screens/{run_id}'
t0 = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
H_kind = 'sequences' if kind in ('sequences', 'utgseq') else 'codepoints'
obs, meta = H.run(a.condition, H_kind, items, out, page_limit=a.limit_pages, dpr=a.dpr, chrome=H.chrome_path(a.chrome), lang=a.lang, headed=a.headed, fc_cold=a.fc_cold)
t1 = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
meta.update(run_id=run_id, kind=kind, n_items=len(items), n_obs=len(obs), started_utc=t0.isoformat() + 'Z', finished_utc=t1.isoformat() + 'Z',
            python=platform.python_version(), platform=platform.platform(), items_sha256=hashlib.sha256(json.dumps([i['item_id'] for i in items]).encode()).hexdigest(),
            dataset_meta=json.load(open(f'{D}/dataset_meta.json')))
os.makedirs(f'{ROOT}/results/raw', exist_ok=True); os.makedirs(f'{ROOT}/results/env', exist_ok=True)
cols = []
for o in obs:
    for k in o:
        if k not in cols: cols.append(k)
with gzip.open(f'{ROOT}/results/raw/{run_id}.csv.gz', 'wt', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=['run_id', 'timestamp_utc', 'condition', 'browser_version'] + cols, extrasaction='ignore'); w.writeheader()
    for o in obs:
        o = dict(o); o.update(run_id=run_id, timestamp_utc=t1.isoformat() + 'Z', condition=a.condition, browser_version=meta['browser_version']); w.writerow(o)
json.dump(meta, open(f'{ROOT}/results/env/{run_id}.json', 'w'), indent=1, default=str)
print('done', run_id, len(obs), 'observations', (t1 - t0).total_seconds(), 's')
