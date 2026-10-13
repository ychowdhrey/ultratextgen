#!/usr/bin/env python3
"""Core tables for Layers A, C, D and H1-H5. Reads results/classified/*, data/derived/*. Writes results/tables/*.csv and results/tables/headline_numbers.json"""
import os, sys, glob, json, csv, gzip, collections, math
import pandas as pd, numpy as np
from stats_lib import *
from conditions import *
import cmap_index
T = f'{ROOT}/results/tables'; os.makedirs(T, exist_ok=True)
D = f'{ROOT}/data/derived'
CH = 'c155'; PRIMARY = ['A_stock', 'A_minimal', 'A_distro', 'B_noto']
LOGO = {'Han', 'Seal', 'Tangut', 'Egyptian_Hieroglyphs', 'Jurchen', 'Anatolian_Hieroglyphs', 'Khitan_Small_Script', 'Nushu', 'Cuneiform'}
vkey = lambda v: tuple(int(x) for x in v.split('.'))
def cls(run): return pd.read_csv(f'{ROOT}/results/classified/{run}.csv.gz', dtype=str, keep_default_na=False)
cps = pd.read_csv(f'{D}/codepoints.csv', dtype=str, keep_default_na=False)
meta = cps.set_index('codepoint')[['script', 'block', 'general_category', 'unicode_name', 'age_days', 'emoji_property', 'emoji_presentation_property', 'combining_character', 'default_ignorable']]
H = {}   # headline numbers

# ---------- Layer A: single code points
def load_cp(cond):
    d = cls(f'{cond}__codepoints__{CH}'); d = d[(d.item_kind == 'codepoint') & d.study_role.isin(['study', 'control'])].copy()
    d = d.drop(columns=[c for c in ('script', 'block', 'general_category', 'unicode_name', 'age_days', 'default_ignorable', 'emoji_property', 'emoji_presentation_property', 'combining_character') if c in d]).join(meta, on='item_id')
    d['logographic'] = d.script.isin(LOGO).astype(int)
    d['ok'] = d.render_class.isin(['MONO_GLYPH', 'COLOR_EMOJI']).astype(int)
    d['any_glyph'] = d.render_class.isin(['MONO_GLYPH', 'COLOR_EMOJI', 'TEXT_FALLBACK']).astype(int)
    d['testable'] = (~d.render_class.isin(['INVISIBLE_OK', 'UNKNOWN'])).astype(int)
    d['age_days'] = d.age_days.astype(int)
    d['cond'] = cond
    return d
CP = {c: load_cp(c) for c in PRIMARY}
allcp = pd.concat(CP.values())
def agebucket(days):
    return ('under 6 months' if days < 183 else '6 to 12 months' if days <= 365 else '1 to 2 years' if days <= 730 else '2 to 3 years' if days <= 1095 else '3 to 5 years' if days <= 1826 else 'over 5 years')
BUCKETS = ['under 6 months', '6 to 12 months', '1 to 2 years', '2 to 3 years', '3 to 5 years', 'over 5 years']
allcp['age_bucket'] = allcp.age_days.map(agebucket)
STRATA = {'all': lambda d: d, 'non_logographic': lambda d: d[d.logographic == 0], 'logographic': lambda d: d[d.logographic == 1], 'emoji_codepoints': lambda d: d[d.emoji_property == '1']}
rows = []
for cond, d in allcp.groupby('cond'):
    for sname, f in STRATA.items():
        x = f(d)
        for (ver, role), g in x.groupby(['unicode_version', 'study_role']):
            g = g[g.testable == 1]; n = len(g); k = int(g.ok.sum()); a = int(g.any_glyph.sum())
            lo, hi = wilson(k, n)
            rows.append(dict(condition=cond, stratum=sname, unicode_version=ver, study_role=role, age_days=int(g.age_days.iloc[0]) if n else '', age_bucket=agebucket(int(g.age_days.iloc[0])) if n else '', n_testable=n, n_as_intended=k, pct_as_intended=round(100 * k / n, 2) if n else '', ci95_lo=round(100 * lo, 2) if n else '', ci95_hi=round(100 * hi, 2) if n else '', n_any_glyph=a, n_missing=n - a))
cov = pd.DataFrame(rows); cov['v'] = cov.unicode_version.map(vkey); cov = cov.sort_values(['condition', 'stratum', 'v']).drop(columns='v')
cov.to_csv(f'{T}/cp_coverage_by_unicode_version.csv', index=False)
# script-weighted coverage: mean over scripts of per-script coverage inside a version (each script counts once)
rows = []
for cond, d in allcp.groupby('cond'):
    for ver, g in d[d.testable == 1].groupby('unicode_version'):
        per = g.groupby('script').ok.mean(); rows.append(dict(condition=cond, unicode_version=ver, n_scripts=len(per), script_weighted_pct=round(100 * per.mean(), 2), scripts_fully_covered=int((per == 1).sum()), scripts_zero=int((per == 0).sum())))
pd.DataFrame(rows).assign(v=lambda x: x.unicode_version.map(vkey)).sort_values(['condition', 'v']).drop(columns='v').to_csv(f'{T}/cp_coverage_script_weighted.csv', index=False)
# by age bucket
rows = []
for cond, d in allcp[allcp.study_role == 'study'].groupby('cond'):
    for sname, f in STRATA.items():
        x = f(d); x = x[x.testable == 1]
        for b in BUCKETS:
            g = x[x.age_bucket == b]; n = len(g); k = int(g.ok.sum())
            lo, hi = wilson(k, n) if n else (float('nan'),) * 2
            rows.append(dict(condition=cond, stratum=sname, age_bucket=b, versions=' '.join(sorted(g.unicode_version.unique(), key=vkey)), n=n, n_as_intended=k, pct_as_intended=round(100 * k / n, 2) if n else '', ci95_lo=round(100 * lo, 2) if n else '', ci95_hi=round(100 * hi, 2) if n else ''))
pd.DataFrame(rows).to_csv(f'{T}/cp_coverage_by_age_bucket.csv', index=False)
# missing by block / script / general category (study role only, 4 conditions side by side)
for key in ('block', 'script', 'general_category'):
    x = allcp[(allcp.study_role == 'study') & (allcp.testable == 1)]
    piv = x.groupby([key, 'cond']).agg(n=('ok', 'size'), missing=('any_glyph', lambda s: int((s == 0).sum()))).unstack('cond')
    out = pd.DataFrame({'n': piv['n'].iloc[:, 0]}); 
    for c in PRIMARY: out[f'missing_{c}'] = piv['missing'][c]
    out['versions'] = x.groupby(key).unicode_version.agg(lambda s: ' '.join(sorted(set(s), key=vkey)))
    out.sort_values('missing_B_noto', ascending=False).to_csv(f'{T}/cp_missing_by_{key}.csv')
# failure class mix
mix = allcp[(allcp.study_role == 'study') & (allcp.testable == 1)].groupby(['cond', 'render_class']).size().unstack(fill_value=0)
mix.to_csv(f'{T}/cp_class_mix.csv')

# ---------- H1: trend with age (non-logographic, B_noto and A_distro), plus RR newest vs 3y
def pooled(cond, stratum, versions):
    d = STRATA[stratum](allcp[allcp.cond == cond]); d = d[(d.testable == 1) & d.unicode_version.isin(versions) & (d.study_role == 'study')]
    return int((d.ok == 0).sum()), len(d)
H['H1'] = {}
for cond in PRIMARY:
    for stratum in ('all', 'non_logographic', 'emoji_codepoints'):
        fn, nn = pooled(cond, stratum, ['18.0']); fo, no = pooled(cond, stratum, ['15.0', '15.1']); f5, n5 = pooled(cond, stratum, ['10.0', '11.0', '12.0', '13.0'])
        rr1 = rr_ci(fn, nn, fo, no) if nn and no else (None,) * 3; rr2 = rr_ci(fn, nn, f5, n5) if nn and n5 else (None,) * 3
        H['H1'][f'{cond}|{stratum}'] = dict(fail_newest_18=[fn, nn], fail_15x=[fo, no], fail_10_13=[f5, n5], rr_18_vs_15x=rr1, rr_18_vs_10to13=rr2)
# rank correlation between version age and failure rate, by condition & stratum
from scipy import stats
H['H1_trend'] = {}
for cond in PRIMARY:
    for stratum in ('all', 'non_logographic', 'emoji_codepoints'):
        sub = cov[(cov.condition == cond) & (cov.stratum == stratum) & (cov.study_role == 'study') & (cov.n_testable > 20)]
        if len(sub) >= 4:
            rho, p = stats.spearmanr(sub.age_days.astype(float), sub.pct_as_intended.astype(float)); H['H1_trend'][f'{cond}|{stratum}'] = dict(n_versions=len(sub), spearman_age_vs_pct_as_intended=round(float(rho), 3), p=round(float(p), 4))

# ---------- H3 / font attribution: why does an item fail in condition A?
cmaps = {c: cmap_index.load(c) for c in PRIMARY}
union = {c: set().union(*[set(v) for v in cmaps[c]['ps'].values()]) for c in PRIMARY}
rows = []
Bd = CP['B_noto'].set_index('item_id')
for cond in ('A_stock', 'A_minimal', 'A_distro'):
    d = CP[cond]; d = d[(d.study_role == 'study') & (d.testable == 1)]
    f = d[d.ok == 0].copy()
    f['cp'] = f.item_id.map(lambda s: int(s[2:], 16))
    f['in_any_installed_font'] = f.cp.map(lambda c: c in union[cond])
    f['fixed_by_B'] = f.item_id.map(lambda i: int(Bd.loc[i, 'ok']) if i in Bd.index else 0)
    f['in_any_noto'] = f.cp.map(lambda c: c in union['B_noto'])
    f[(f.in_any_installed_font) & (f.render_class != 'LASTRESORT_HEXBOX')][['item_id', 'unicode_version', 'render_class', 'class_reason', 'fonts_used', 'script']].to_csv(f'{T}/h3_maps_but_failed_items_{cond}.csv', index=False)
    for sname in ('all', 'non_logographic'):
        x = f if sname == 'all' else f[f.logographic == 0]
        tot = len(x); nofont = int((~x.in_any_installed_font).sum()); fixB = int(x.fixed_by_B.sum())
        placeholder = int(((x.render_class == 'LASTRESORT_HEXBOX') & x.in_any_installed_font).sum())
        rows.append(dict(condition=cond, stratum=sname, n_failures=tot, no_installed_font_maps_it=nofont, pct_font_coverage=round(100 * nofont / tot, 2) if tot else '', pct_font_coverage_incl_placeholders=round(100 * (nofont + placeholder) / tot, 2) if tot else '',
                         installed_font_maps_it_but_failed=tot - nofont - placeholder, of_which_placeholder_box_in_a_pan_unicode_font=placeholder, rescued_by_latest_noto_stack=fixB, pct_rescued_by_B=round(100 * fixB / tot, 2) if tot else '',
                         still_failing_in_B_and_no_noto_font_maps_it=int((~x.in_any_noto & (x.fixed_by_B == 0)).sum())))
pd.DataFrame(rows).to_csv(f'{T}/h3_failure_attribution_codepoints.csv', index=False)
H['H3_cp'] = rows
# ---------- B vs A (H4) by version
rows = []
for ver in sorted(cps.unicode_version.unique(), key=vkey):
    r = dict(unicode_version=ver)
    for c in PRIMARY:
        d = allcp[(allcp.cond == c) & (allcp.unicode_version == ver) & (allcp.testable == 1)]
        r[f'n'] = len(d); r[f'pct_{c}'] = round(100 * d.ok.mean(), 2) if len(d) else ''
        dn = d[d.logographic == 0]; r[f'pct_nonlogo_{c}'] = round(100 * dn.ok.mean(), 2) if len(dn) else ''; r['n_nonlogo'] = len(dn)
    rows.append(r)
pd.DataFrame(rows).to_csv(f'{T}/h4_system_vs_noto_by_version.csv', index=False)
json.dump(H, open(f'{T}/headline_numbers_core.json', 'w'), indent=1, default=str)
print(cov[(cov.stratum == 'all') & (cov.study_role == 'study')].pivot(index='unicode_version', columns='condition', values='pct_as_intended').round(1))
print(cov[(cov.stratum == 'non_logographic') & (cov.study_role == 'study')].pivot(index='unicode_version', columns='condition', values='pct_as_intended').round(1))
print(pd.read_csv(f'{T}/h3_failure_attribution_codepoints.csv').to_string())
