#!/usr/bin/env python3
"""Layer D follow-up: for the 60 Emoji 17 two-tone sequences that Chrome <=141 leaves DECOMPOSED with NotoColorEmoji 2.051, which Chrome release first composes them?
Uses raw observations only (glyph_count == 1 means composed); no classifier involved."""
import pandas as pd, glob, os, json, re
from conditions import ROOT
raw = lambda p: pd.read_csv(p, dtype=str, keep_default_na=False)
base = raw(f'{ROOT}/results/classified/R_2025-09-12_f3ae03f__sequences__c155.csv.gz').set_index('item_id')
ref = raw(f'{ROOT}/results/classified/R_2025-09-12_f3ae03f__sequences__c141.csv.gz').set_index('item_id')
items = [i for i in base.index if base.loc[i, 'render_class'] == 'FULL' and ref.loc[i, 'render_class'] != 'FULL']
rows = []
for p in sorted(glob.glob(f'{ROOT}/results/raw/R_2025-09-12_f3ae03f__sequences__c*.csv.gz'), key=lambda s: int(re.search(r'__c(\d+)', s).group(1))):
    run = os.path.basename(p)[:-7]; d = raw(p).set_index('item_id'); ver = json.load(open(f'{ROOT}/results/env/{run}.json'))['browser_version']
    comp = sum(1 for i in items if d.loc[i, 'glyph_count'] == '1'); rows.append(dict(chrome=ver, items=len(items), composed=comp, pct=round(100 * comp / len(items), 1)))
out = pd.DataFrame(rows); out.to_csv(f'{ROOT}/results/tables/bisect_chrome_two_tone_wrestling.csv', index=False); print(out.to_string())
