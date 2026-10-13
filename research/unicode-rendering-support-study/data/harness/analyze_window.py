#!/usr/bin/env python3
"""'Unsupported window' series: for every week since 2017-06-20, the share of Emoji 5.0+ items already standardized that the NEWEST COMMITTED NotoColorEmoji binary composes (browser replay, Chromium 155)."""
import pandas as pd, numpy as np, json
from conditions import ROOT
D = f'{ROOT}/data/derived'; T = f'{ROOT}/results/tables'
vkey = lambda v: tuple(int(x) for x in str(v).split('.'))
lg = pd.read_csv(f'{D}/replay_browser_sequence_class_long.csv.gz', dtype=str); et = pd.read_csv(f'{D}/emoji_sequences.csv', dtype=str); rel = dict(zip(et.emoji_version, et.emoji_release_date))
lg['full'] = (lg.render_class == 'FULL').astype(int); lg['fd'] = pd.to_datetime(lg.font_commit_date); lg['rel'] = pd.to_datetime(lg.emoji_version.map(rel)); lg['font_idx'] = lg.font_idx.astype(int)
sub = lg[lg.emoji_version.map(vkey) >= (5, 0)]; fonts_ = sub.groupby('font_idx').fd.first().sort_values()
days = pd.date_range('2017-06-20', '2026-10-12', freq='1D'); rows = []
for d in days:
    avail = fonts_[fonts_ <= d]; its = sub[sub.rel <= d].item_id.unique()
    if len(avail) == 0 or len(its) == 0: rows.append((d, np.nan, len(its), 0)); continue
    f = sub[(sub.font_idx == avail.index[-1]) & sub.item_id.isin(its)]; rows.append((d, 100 * f.full.mean(), len(its), int((1 - f.full).sum())))
s = pd.DataFrame(rows, columns=['date', 'pct_composed', 'n_standardized', 'n_not_composed']); s.to_csv(f'{T}/unsupported_window_daily_series.csv', index=False)
v = s.dropna(); first_font = fonts_.iloc[0]
v2 = v[v.date >= first_font]
out = dict(window_start=str(v2.date.iloc[0].date()), days=len(v2), mean_pct_composed=round(v2.pct_composed.mean(), 2), pct_days_fully_composed=round(100 * (v2.pct_composed >= 99.999).mean(), 2),
           pct_days_below_90=round(100 * (v2.pct_composed < 90).mean(), 2), min_pct=round(v2.pct_composed.min(), 2), mean_items_not_composed_when_any=round(v2[v2.n_not_composed > 0].n_not_composed.mean(), 1),
           longest_run_days_below_100=int(max((len(list(g)) for k, g in __import__('itertools').groupby((v2.pct_composed < 99.999).tolist()) if k), default=0)),
           latest_pct=round(s.pct_composed.iloc[-1], 2), note='Emoji release dates from the UTS #51 table; font dates are commit dates; the first committed binary is 2017-03-10 so the series starts at the Emoji 5.0 release.')
json.dump(out, open(f'{T}/headline_numbers_window.json', 'w'), indent=1); print(out)
