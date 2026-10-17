#!/usr/bin/env python3
"""Longitudinal store + compatibility delta. Appends one row per (run, condition, unicode_version, stratum) to data/longitudinal/history.csv
and prints what changed against the previous run (new Unicode release => new rows; same release => coverage movement caused by a new font/browser)."""
import pandas as pd, json, os, datetime
from conditions import ROOT
T = f'{ROOT}/results/tables'; L = f'{ROOT}/data/longitudinal'; os.makedirs(L, exist_ok=True)
env = json.load(open(f'{ROOT}/results/env/environment.json')); meta = json.load(open(f'{ROOT}/data/derived/dataset_meta.json'))
run = dict(run_date=env['captured_utc'][:10], newest_unicode=meta['newest_unicode_version'], chrome=json.load(open(f"{ROOT}/results/env/B_noto__codepoints__c155.json"))['browser_version'] if os.path.exists(f"{ROOT}/results/env/B_noto__codepoints__c155.json") else '')
cov = pd.read_csv(f'{T}/cp_coverage_by_unicode_version.csv', dtype={'unicode_version': str}); cov = cov[cov.study_role == 'study']
seq = pd.read_csv(f'{T}/seq_coverage_by_emoji_version_fully_qualified.csv', dtype={'emoji_version': str})
rows = [dict(run, dataset='codepoints', condition=r.condition, version=r.unicode_version, stratum=r.stratum, n=r.n_testable, pct=r.pct_as_intended) for r in cov.itertuples()]
rows += [dict(run, dataset='emoji_sequences_fq', condition=r.cond, version=r.emoji_version, stratum='all', n=r.n, pct=r.pct_full) for r in seq.itertuples()]
new = pd.DataFrame(rows); hp = f'{L}/history.csv'
old = pd.read_csv(hp, dtype=str) if os.path.exists(hp) else pd.DataFrame()
if len(old) and (old.run_date == run['run_date']).any() and (old.chrome == run['chrome']).any(): old = old[~((old.run_date == run['run_date']) & (old.chrome == run['chrome']))]
allh = pd.concat([old, new.astype(str)], ignore_index=True); allh.to_csv(hp, index=False)
prev = old[old.run_date == old.run_date.max()] if len(old) else pd.DataFrame()
if len(prev):
    k = ['dataset', 'condition', 'version', 'stratum']; m = new.astype(str).merge(prev[k + ['pct', 'n']], on=k, how='outer', suffixes=('_now', '_prev'), indicator=True)
    m['delta_pp'] = pd.to_numeric(m.pct_now, errors='coerce') - pd.to_numeric(m.pct_prev, errors='coerce')
    d = m[(m._merge != 'both') | (m.delta_pp.abs() > 0.05)]; d.to_csv(f'{L}/last_delta.csv', index=False); print(d[k + ['pct_prev', 'pct_now', 'delta_pp', '_merge']].to_string())
else: print('first run recorded; no previous run to compare with')
