#!/usr/bin/env python3
"""cmap-level first-support date per code point in Noto's monthly releases (data/derived/noto_monthly_cmap.json).
Output data/derived/noto_monthly_first_support.csv: one row per Dataset-1 code point.
date_quality: exact_month (absent in an earlier snapshot, present from this one) | left_censored (already present in the first snapshot, 2023-01-31;
              the true first date is earlier and unknown) | never (not in any snapshot)
The snapshot date is the tag date: the code point may have been available on main days or weeks before."""
import json, csv, os, bisect, datetime
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
D = f'{ROOT}/data/derived'
j = json.load(open(f'{D}/noto_monthly_cmap.json')); snaps = j['snapshots']; cm = j['cmaps']
order = sorted(snaps, key=lambda t: snaps[t]['date'])
def covered_set(sha):
    s = set()
    for lo, hi in cm[sha]: s.update(range(lo, hi + 1))
    return s
cache = {}
def fam_set(sha):
    if sha not in cache: cache[sha] = covered_set(sha)
    return cache[sha]
rows = list(csv.DictReader(open(f'{D}/codepoints.csv', encoding='utf-8')))
first = {}      # cp -> (tag index, family)
want = {int(r['cp_int']) for r in rows}
for i, t in enumerate(order):
    for fam, sha in snaps[t]['fonts'].items():
        s = fam_set(sha)
        for cp in want:
            if cp not in first and cp in s: first[cp] = (i, fam)
out = []
for r in rows:
    cp = int(r['cp_int']); rel = datetime.date.fromisoformat(r['unicode_release_date'])
    if cp in first:
        i, fam = first[cp]; d = datetime.date.fromisoformat(snaps[order[i]]['date'])
        q = 'left_censored' if i == 0 else 'exact_month'
        lag = (d - rel).days if i > 0 else ''
        out.append(dict(codepoint=r['codepoint'], unicode_version=r['unicode_version'], script=r['script'], block=r['block'], release_date=rel.isoformat(), first_tag=order[i], first_tag_date=d.isoformat(), first_family=fam, date_quality=q, lag_days=lag,
                        covered_in_latest=int(any(cp in fam_set(sha) for sha in snaps[order[-1]]['fonts'].values()))))
    else:
        out.append(dict(codepoint=r['codepoint'], unicode_version=r['unicode_version'], script=r['script'], block=r['block'], release_date=rel.isoformat(), first_tag='', first_tag_date='', first_family='', date_quality='never', lag_days='', covered_in_latest=0))
with open(f'{D}/noto_monthly_first_support.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
import collections
print(collections.Counter((o['unicode_version'], o['date_quality']) for o in out if o['unicode_version'] >= '10'))
