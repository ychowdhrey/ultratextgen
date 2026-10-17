#!/usr/bin/env python3
"""Layer B tables: font support lag for (1) emoji items against 45 committed NotoColorEmoji binaries, (2) all other code points against Noto monthly releases (cmap level)."""
import pandas as pd, numpy as np, json, os
from stats_lib import *
from conditions import ROOT
D = f'{ROOT}/data/derived'; T = f'{ROOT}/results/tables'
vkey = lambda v: tuple(int(x) for x in v.split('.'))
out = {}
e = pd.read_csv(f'{D}/noto_emoji_first_support.csv', dtype=str, keep_default_na=False)
e = e[e.kind != 'codepoint_bare'].copy()          # emoji sequences + single emoji from emoji-test.txt (E-version dated)
e['lag'] = pd.to_numeric(e.lag_days_commit, errors='coerce'); e['lag_stamp'] = pd.to_numeric(e.lag_days_build_stamp, errors='coerce')
study = e[(e.study_role == 'study')]
def summ(x, col='lag'):
    v = x[col].dropna().astype(float).tolist(); q = quantiles(v)
    return dict(n=len(v), mean=round(float(np.mean(v)), 1) if v else None, p25=round(q[.25], 1), median=round(q[.5], 1), p75=round(q[.75], 1), p90=round(q[.9], 1), n_negative=int(sum(1 for t in v if t < 0)))
dated = study[study.date_quality == 'exact_commit']
out['emoji_all_dated'] = summ(dated); out['emoji_all_dated_build_stamp'] = summ(dated, 'lag_stamp')
out['emoji_study_items'] = len(study); out['emoji_study_left_censored'] = int((study.date_quality == 'left_censored').sum()); out['emoji_study_never'] = int((study.date_quality == 'never').sum())
rows = []
for v, g in dated.groupby('version'):
    r = dict(emoji_version=v, release_date=g.release_date.iloc[0], first_font_commit_dates=' '.join(sorted(set(g.first_full_commit_date))[:3])); r.update(summ(g)); r['median_build_stamp'] = summ(g, 'lag_stamp')['median']; rows.append(r)
pd.DataFrame(rows).sort_values('emoji_version', key=lambda s: s.map(vkey)).to_csv(f'{T}/lag_emoji_by_version.csv', index=False)
rows = []
for k, g in dated.groupby('kind'):
    r = dict(kind=k); r.update(summ(g)); rows.append(r)
pd.DataFrame(rows).to_csv(f'{T}/lag_emoji_by_kind.csv', index=False)
# lag within one emoji version by kind (tests whether composed emoji arrive later than singles in the same release)
rows = []
for (v, k), g in dated.groupby(['version', 'kind']):
    r = dict(emoji_version=v, kind=k); r.update(summ(g)); rows.append(r)
pd.DataFrame(rows).sort_values(['emoji_version', 'kind'], key=lambda s: s.map(vkey) if s.name == 'emoji_version' else s).to_csv(f'{T}/lag_emoji_by_version_kind.csv', index=False)
# trend: recent (>=14.0) vs older (11.0-13.1) release batches
rec = dated[dated.version.map(vkey) >= (14, 0)]; old = dated[(dated.version.map(vkey) >= (11, 0)) & (dated.version.map(vkey) < (14, 0))]
out['trend'] = dict(emoji_11_to_13_1=summ(old), emoji_14_to_18=summ(rec))
# first-support convention: how many of the study items had ANY committed binary composing them before the standard release?
out['emoji_supported_before_release'] = int((dated.lag < 0).sum()); out['emoji_supported_within_30d'] = int(((dated.lag >= 0) & (dated.lag <= 30)).sum())
# font-level composition gaps over time: components present, composition absent (HarfBuzz) per binary
m = pd.read_csv(f'{D}/noto_emoji_shaping_matrix.csv', dtype=str)
seqs = pd.read_csv(f'{D}/emoji_sequences.csv', dtype=str); seqs = seqs[seqs.status.isin(['fully-qualified', 'component'])]
seqs['item_id'] = 'SEQ ' + seqs.seq_hex
mm = m.merge(seqs[['item_id', 'sequence_type', 'emoji_version', 'emoji_release_date', 'study_role']], on='item_id')
mm['rel'] = pd.to_datetime(mm.emoji_release_date); mm['fd'] = pd.to_datetime(mm.font_commit_date)
rel = mm[mm.rel <= mm.fd]          # only items already standardised at the font's commit date
g = rel.groupby(['font_commit_date', 'font_commit', 'shape_class']).size().unstack(fill_value=0)
g['n_released'] = g.sum(axis=1); g['pct_full'] = (100 * g.get('FULL', 0) / g.n_released).round(2); g['pct_decomposed'] = (100 * g.get('DECOMPOSED', 0) / g.n_released).round(2); g['pct_missing'] = (100 * g.get('MISSING', 0) / g.n_released).round(2)
g.reset_index().to_csv(f'{T}/font_replay_hb_released_items_coverage.csv', index=False)
h = mm[mm.rel <= mm.fd].groupby(['sequence_type', 'shape_class']).size().unstack(fill_value=0); h['pct_full'] = (100 * h.get('FULL', 0) / h.sum(axis=1)).round(2); h.to_csv(f'{T}/font_replay_hb_by_type_released_items.csv')
# ---------- non-emoji: Noto monthly releases (cmap level)
n = pd.read_csv(f'{D}/noto_monthly_first_support.csv', dtype=str, keep_default_na=False)
cp = pd.read_csv(f'{D}/codepoints.csv', dtype=str, keep_default_na=False)[['codepoint', 'emoji_property', 'study_role']]
n = n.merge(cp, on='codepoint'); n = n[(n.study_role == 'study') & (n.emoji_property == '0')].copy()
n['lag'] = pd.to_numeric(n.lag_days, errors='coerce')
rows = []
for v, g in n.groupby('unicode_version'):
    ex = g[g.date_quality == 'exact_month']; r = dict(unicode_version=v, n=len(g), n_exact_month=len(ex), n_left_censored=int((g.date_quality == 'left_censored').sum()), n_never=int((g.date_quality == 'never').sum()),
                                                      pct_ever_covered_by_2026_10=round(100 * (g.date_quality != 'never').mean(), 2)); r.update({f'lag_{k}': v2 for k, v2 in summ(ex).items() if k != 'n'}); rows.append(r)
pd.DataFrame(rows).sort_values('unicode_version', key=lambda s: s.map(vkey)).to_csv(f'{T}/lag_noncarrier_noto_monthly_by_version.csv', index=False)
n['logographic'] = n.script.isin({'Han', 'Seal', 'Tangut', 'Egyptian_Hieroglyphs', 'Jurchen', 'Anatolian_Hieroglyphs', 'Khitan_Small_Script', 'Nushu', 'Cuneiform'})
rows = []
for (v, s), g in n[n.date_quality != 'left_censored'].groupby(['unicode_version', 'script']):
    ex = g[g.date_quality == 'exact_month']
    rows.append(dict(unicode_version=v, script=s, n=len(g), n_exact=len(ex), n_never=int((g.date_quality == 'never').sum()), median_lag_days=round(ex.lag.median(), 0) if len(ex) else '', first_family=ex.first_family.mode().iloc[0] if len(ex) else ''))
pd.DataFrame(rows).sort_values(['unicode_version', 'n'], ascending=[True, False], key=lambda s: s.map(vkey) if s.name == 'unicode_version' else s).to_csv(f'{T}/lag_noncarrier_by_script.csv', index=False)
ex_all = n[(n.date_quality == 'exact_month') & (~n.logographic)]
out['noncarrier_nonlogo_exact'] = summ(ex_all); out['noncarrier_exact_all'] = summ(n[n.date_quality == 'exact_month'])
out['noncarrier_counts'] = n.date_quality.value_counts().to_dict()
json.dump(out, open(f'{T}/headline_numbers_lag.json', 'w'), indent=1, default=str)
print(json.dumps({k: out[k] for k in ('emoji_all_dated', 'emoji_all_dated_build_stamp', 'trend', 'emoji_supported_before_release', 'emoji_supported_within_30d', 'noncarrier_nonlogo_exact', 'noncarrier_counts')}, indent=1, default=str))
print(pd.read_csv(f'{T}/lag_emoji_by_version.csv').to_string())
print(pd.read_csv(f'{T}/lag_noncarrier_noto_monthly_by_version.csv').to_string())
