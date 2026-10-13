#!/usr/bin/env python3
"""Confounder probes: same items, one factor changed (DPR 2, cold fontconfig cache, headed Chromium under Xvfb, page lang). Compare render_class with the main run."""
import pandas as pd, glob, os, json
from conditions import ROOT
CL = f'{ROOT}/results/classified'; T = f'{ROOT}/results/tables'
rows = []
for p in sorted(glob.glob(f'{CL}/*__probe_*.csv.gz')):
    run = os.path.basename(p)[:-7]; cond, kind, ch, _, tag = run.split('__')[0], run.split('__')[1], run.split('__')[2], '', run.split('__')[3]
    k = 'sequences' if kind == 'sequences' else 'codepoints'
    a = pd.read_csv(p, dtype=str, keep_default_na=False); b = pd.read_csv(f'{CL}/{cond}__{k}__{ch}.csv.gz', dtype=str, keep_default_na=False)
    a = a[a.item_kind.isin(['codepoint', 'sequence'])]; b = b.set_index('item_id')
    a = a[a.item_id.isin(b.index)]
    ra = a.set_index('item_id').render_class; rb = b.loc[a.item_id, 'render_class']; rb.index = a.item_id
    ok = lambda s: s.isin(['MONO_GLYPH', 'COLOR_EMOJI', 'FULL'])
    both = ~(ra.isin(['UNKNOWN']) | rb.isin(['UNKNOWN']))
    same_class = (ra == rb)[both]; same_ok = (ok(ra) == ok(rb))[both]
    # pixel identity only meaningful at equal DPR
    ph_same = (a.set_index('item_id').pixel_sha1 == b.loc[a.item_id, 'pixel_sha1'].values) if 'dpr2' not in tag else None
    d = ra[both][(ok(ra) != ok(rb))[both]]
    rows.append(dict(probe=tag, condition=cond, n_compared=int(both.sum()), identical_class_pct=round(100 * same_class.mean(), 3), same_supported_decision_pct=round(100 * same_ok.mean(), 3),
                     n_decision_changes=int((~same_ok).sum()), identical_pixels_pct=round(100 * ph_same.mean(), 2) if ph_same is not None else '', example_changed_items=' '.join(d.index[:6])))
pd.DataFrame(rows).to_csv(f'{T}/confounder_probes.csv', index=False); print(pd.DataFrame(rows).to_string())
