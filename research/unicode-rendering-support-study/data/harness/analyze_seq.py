#!/usr/bin/env python3
"""Sequence tables (Dataset 2 is never merged with Dataset 1) + H2/H5 + replay (Layer C) + Chromium x font matrix (Layer D) + CSS-order factor."""
import pandas as pd, numpy as np, json, os, glob, re
from stats_lib import *
from conditions import ROOT
from scipy import stats
T = f'{ROOT}/results/tables'; D = f'{ROOT}/data/derived'; CL = f'{ROOT}/results/classified'
vkey = lambda v: tuple(int(x) for x in v.split('.'))
PRIMARY = ['A_stock', 'A_minimal', 'A_distro', 'B_noto']; CH = 'c155'
def seq(run):
    d = pd.read_csv(f'{CL}/{run}.csv.gz', dtype=str, keep_default_na=False); d = d[d.item_kind == 'sequence'].copy()
    d['full'] = (d.render_class == 'FULL').astype(int); return d
H = {}
S = {c: seq(f'{c}__sequences__{CH}') for c in PRIMARY}
for c, d in S.items(): d['cond'] = c
A = pd.concat(S.values())
FQ = A[(A.status == 'fully-qualified') & (A.study_role == 'study')]
# 1. coverage by emoji version, type, status
def tab(df, by):
    g = df.groupby(['cond'] + by).agg(n=('full', 'size'), n_full=('full', 'sum')).reset_index()
    g['pct_full'] = (100 * g.n_full / g.n).round(2); ci = g.apply(lambda r: wilson(r.n_full, r.n), axis=1); g['ci95_lo'] = [round(100 * a, 2) for a, b in ci]; g['ci95_hi'] = [round(100 * b, 2) for a, b in ci]; return g
t1 = tab(FQ, ['unicode_version']); t1['v'] = t1.unicode_version.map(vkey); t1.sort_values(['cond', 'v']).drop(columns='v').rename(columns={'unicode_version': 'emoji_version'}).to_csv(f'{T}/seq_coverage_by_emoji_version_fully_qualified.csv', index=False)
tab(FQ, ['sequence_type']).to_csv(f'{T}/seq_coverage_by_type_fully_qualified.csv', index=False)
tab(A[A.study_role == 'study'], ['status']).to_csv(f'{T}/seq_coverage_by_status.csv', index=False)
tab(A[(A.study_role == 'study') & (A.status != 'fully-qualified')], ['status', 'sequence_type']).to_csv(f'{T}/seq_coverage_nonqualified_by_type.csv', index=False)
FQ.groupby(['cond', 'render_class']).size().unstack(fill_value=0).to_csv(f'{T}/seq_class_mix_fully_qualified.csv')
FQ.groupby(['cond', 'sequence_type', 'render_class']).size().unstack(fill_value=0).to_csv(f'{T}/seq_class_mix_by_type.csv')
# 2. H2: single code point emoji vs composed sequences, stratified by emoji version (fully-qualified, study)
SINGLE = {'single', 'vs16_emoji_presentation'}
rows = []
for c in PRIMARY:
    d = FQ[FQ.cond == c].copy(); d['is_single'] = d.sequence_type.isin(SINGLE)
    strata = []; per = []
    for v, g in d.groupby('unicode_version'):
        a = g[~g.is_single]; b = g[g.is_single]
        if len(a) == 0 or len(b) == 0: continue
        fa, fb = int((a.full == 0).sum()), int((b.full == 0).sum()); strata.append((fa, len(a), fb, len(b))); per.append((v, fa, len(a), fb, len(b)))
    rr, lo, hi = mh_rr(strata) if sum(s[0] + s[2] for s in strata) > 0 else (float('nan'),) * 3
    tot = (sum(s[0] for s in strata), sum(s[1] for s in strata), sum(s[2] for s in strata), sum(s[3] for s in strata))
    st = d.assign(sf=(~d.render_class.isin(['FULL', 'TEXT_FALLBACK'])).astype(int)); strict_c = int(st[~st.is_single].sf.sum()); strict_s = int(st[st.is_single].sf.sum())
    rows.append(dict(condition=c, composed_fail_strict=strict_c, single_fail_strict=strict_s, composed_fail=tot[0], composed_n=tot[1], single_fail=tot[2], single_n=tot[3], pct_composed_fail=round(100 * tot[0] / tot[1], 2), pct_single_fail=round(100 * tot[2] / tot[3], 2), mh_risk_ratio=round(rr, 2) if rr == rr else '', rr_ci95_lo=round(lo, 2) if lo == lo else '', rr_ci95_hi=round(hi, 2) if hi == hi else '', strata_used=len(strata), per_version=json.dumps(per)))
pd.DataFrame(rows).to_csv(f'{T}/h2_single_vs_composed.csv', index=False); H['H2'] = rows
# 3. H5: failure class mix: composed vs single
rows = []
for c in PRIMARY:
    d = FQ[(FQ.cond == c) & (FQ.full == 0)]
    for kind, sel in (('single_codepoint_emoji', d.sequence_type.isin(SINGLE)), ('composed_sequences', ~d.sequence_type.isin(SINGLE))):
        g = d[sel]; r = dict(condition=c, group=kind, n_failures=len(g)); r.update(g.render_class.value_counts().to_dict()); rows.append(r)
pd.DataFrame(rows).fillna(0).to_csv(f'{T}/h5_failure_class_mix.csv', index=False)
# 4. Layer C replay (browser) per font version
man = pd.read_csv(f'{D}/noto_emoji_font_manifest.csv', dtype=str)
rows = []; per_item = []
for _, m in man.iterrows():
    run = f"R_{m.commit_date}_{m.commit[:7]}__sequences__{CH}"
    if not os.path.exists(f'{CL}/{run}.csv.gz'): continue
    d = seq(run); d = d[(d.status == 'fully-qualified')]
    d['rel'] = pd.to_datetime(d.unicode_version.map(lambda v: None))   # placeholder (version->date added below)
    rows.append((m.commit_date, m.commit[:7], d, len(rows)))
et = pd.read_csv(f'{D}/emoji_sequences.csv', dtype=str); reldate = dict(zip(et.emoji_version, et.emoji_release_date))
out = []
for cd, sh, d, fidx in rows:
    d = d.copy(); d['rel'] = pd.to_datetime(d.unicode_version.map(reldate)); fd = pd.to_datetime(cd)
    rl = d[d.rel <= fd]
    r = dict(font_commit_date=cd, font_commit=sh, n_released=len(rl), full_released=int(rl.full.sum()), pct_full_of_released=round(100 * rl.full.mean(), 2) if len(rl) else '',
             n_all=len(d), full_all=int(d.full.sum()), pct_full_of_all_current_items=round(100 * d.full.mean(), 2), n_study_released=int((rl.study_role == 'study').sum()))
    for k in ('DECOMPOSED', 'PARTIAL', 'MISSING', 'TEXT_FALLBACK', 'UNKNOWN'): r[f'{k.lower()}_released'] = int((rl.render_class == k).sum())
    out.append(r)
    for _, x in d.iterrows(): per_item.append((cd, sh, fidx, x.item_id, x.sequence_type, x.unicode_version, x.render_class))
pd.DataFrame(out).to_csv(f'{T}/replay_browser_by_font_version.csv', index=False)
pi = pd.DataFrame(per_item, columns=['font_commit_date', 'font_commit', 'font_idx', 'item_id', 'sequence_type', 'emoji_version', 'render_class'])
pi.to_csv(f'{D}/replay_browser_sequence_class_long.csv.gz', index=False)
# replay by emoji version: FULL% at each font version for each emoji release (coverage progression, Figure 7)
g = pi.assign(full=(pi.render_class == 'FULL').astype(int)).groupby(['font_idx', 'font_commit_date', 'emoji_version']).full.agg(['mean', 'size']).reset_index()
g['pct_full'] = (100 * g['mean']).round(2); g.drop(columns='mean').rename(columns={'size': 'n'}).to_csv(f'{T}/replay_browser_pct_full_by_font_and_emoji_version.csv', index=False)
# 4b. H2 on the replay: among items ALREADY standardized when the font was committed, do composed sequences fail more than single code points?
pi2 = pi.copy(); pi2['rel'] = pd.to_datetime(pi2.emoji_version.map(reldate)); pi2['fd'] = pd.to_datetime(pi2.font_commit_date); pi2 = pi2[(pi2.rel <= pi2.fd)]
pi2['is_single'] = pi2.sequence_type.isin(SINGLE); pi2['fail'] = pi2.render_class.isin(['MISSING', 'PARTIAL', 'DECOMPOSED', 'UNKNOWN']).astype(int)   # strict: monochrome-fallback (TEXT_FALLBACK) is a presentation failure, tracked separately; DejaVu precedes the emoji family in the replay stack
def h2tab(strat_cols, label):
    strata = []
    for _, g in pi2.groupby(strat_cols):
        a = g[~g.is_single]; b = g[g.is_single]
        if len(a) and len(b): strata.append((int(a.fail.sum()), len(a), int(b.fail.sum()), len(b)))
    rr, lo, hi = mh_rr(strata) if sum(x[0] + x[2] for x in strata) else (float('nan'),) * 3
    return dict(stratified_by=label, n_strata=len(strata), composed_fail=sum(x[0] for x in strata), composed_n=sum(x[1] for x in strata), single_fail=sum(x[2] for x in strata), single_n=sum(x[3] for x in strata), mh_rr=round(rr, 2), ci_lo=round(lo, 2), ci_hi=round(hi, 2))
h2r = [dict(stratified_by='crude (no strata)', n_strata=1, composed_fail=int(pi2[~pi2.is_single].fail.sum()), composed_n=int((~pi2.is_single).sum()), single_fail=int(pi2[pi2.is_single].fail.sum()), single_n=int(pi2.is_single.sum()),
            mh_rr=round(((pi2[~pi2.is_single].fail.mean()) / (pi2[pi2.is_single].fail.mean())), 2), ci_lo='', ci_hi=''),
       h2tab(['font_idx'], 'font binary'), h2tab(['font_idx', 'emoji_version'], 'font binary x emoji release')]
pd.DataFrame(h2r).to_csv(f'{T}/h2_replay_single_vs_composed.csv', index=False); H['H2_replay'] = h2r
# 5. browser vs HarfBuzz agreement (is a browser failure the font's fault?)
sm = pd.read_csv(f'{D}/noto_emoji_shaping_matrix.csv', dtype=str)
rows = []
for cd, sh, d in rows if False else []: pass
agree = []
for _, m in man.iterrows():
    run = f"R_{m.commit_date}_{m.commit[:7]}__sequences__{CH}"
    if not os.path.exists(f'{CL}/{run}.csv.gz'): continue
    d = seq(run); d = d[d.status == 'fully-qualified'][['item_id', 'render_class']]
    s = sm[sm.font_commit == m.commit[:7]][['item_id', 'shape_class']]
    j = d.merge(s, on='item_id')
    agree.append(dict(font_commit_date=m.commit_date, n=len(j), both_full=int(((j.render_class == 'FULL') & (j.shape_class == 'FULL')).sum()), hb_full_browser_not=int(((j.render_class != 'FULL') & (j.shape_class == 'FULL')).sum()),
                      browser_full_hb_not=int(((j.render_class == 'FULL') & (j.shape_class != 'FULL')).sum()), neither=int(((j.render_class != 'FULL') & (j.shape_class != 'FULL')).sum())))
ag = pd.DataFrame(agree); ag.to_csv(f'{T}/replay_browser_vs_harfbuzz_agreement.csv', index=False)
H['browser_vs_hb'] = dict(total=int(ag.n.sum()), hb_full_browser_not=int(ag.hb_full_browser_not.sum()), browser_full_hb_not=int(ag.browser_full_hb_not.sum()))
# 6. Layer D: Chromium x font matrix
rows = []
for p in sorted(glob.glob(f'{CL}/R_*__sequences__c*.csv.gz')):
    base = os.path.basename(p)[:-7]; cond, _, chrome = base.split('__')
    if cond not in {f"R_{m.commit_date}_{m.commit[:7]}" for _, m in man.iterrows()}: continue
    d = pd.read_csv(p, dtype=str, keep_default_na=False); d = d[(d.item_kind == 'sequence') & (d.status == 'fully-qualified') & (d.study_role == 'study')]
    mj = json.load(open(f'{ROOT}/results/env/{base}.json'))
    for typ, g in [('all', d)] + list(d.groupby('sequence_type')):
        rows.append(dict(font=cond, chrome=chrome, chrome_version=mj['browser_version'], type=typ, n=len(g), n_full=int((g.render_class == 'FULL').sum()), pct_full=round(100 * (g.render_class == 'FULL').mean(), 2),
                         n_decomposed=int((g.render_class == 'DECOMPOSED').sum()), n_partial=int((g.render_class == 'PARTIAL').sum()), n_missing=int((g.render_class == 'MISSING').sum()), n_text=int((g.render_class == 'TEXT_FALLBACK').sum())))
mx = pd.DataFrame(rows); mx.to_csv(f'{T}/matrix_chromium_x_font.csv', index=False)
# 7. CSS order factor
rows = []
for c in ['A_minimal', 'A_minimal+ef', 'A_distro', 'A_distro+ef', 'A_stock', 'A_stock+ef', 'B_noto', 'B_noto+symfirst']:
    p = f'{CL}/{c}__sequences__{CH}.csv.gz'
    if not os.path.exists(p): continue
    d = seq(f'{c}__sequences__{CH}'); d = d[(d.status == 'fully-qualified') & (d.study_role == 'study')]
    r = dict(condition=c, n=len(d), pct_full=round(100 * d.full.mean(), 2)); r.update({k: int(v) for k, v in d.render_class.value_counts().items()}); rows.append(r)
pd.DataFrame(rows).fillna(0).to_csv(f'{T}/css_order_factor_sequences.csv', index=False)
json.dump(H, open(f'{T}/headline_numbers_seq.json', 'w'), indent=1, default=str)
print(pd.read_csv(f'{T}/seq_coverage_by_emoji_version_fully_qualified.csv').pivot(index='emoji_version', columns='cond', values='pct_full').reindex(sorted(set(t1.unicode_version), key=vkey)))
print(pd.read_csv(f'{T}/h2_replay_single_vs_composed.csv').to_string()); print(pd.read_csv(f'{T}/h2_single_vs_composed.csv').drop(columns='per_version').to_string())
print(pd.read_csv(f'{T}/css_order_factor_sequences.csv').to_string())
