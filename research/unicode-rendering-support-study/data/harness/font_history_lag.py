#!/usr/bin/env python3
"""Layer B: for every emoji sequence / emoji code point, shape it with every committed version of
NotoColorEmoji.ttf (HarfBuzz, no browser) and find the first font version that composes it (FULL).
Outputs data/derived/noto_emoji_shaping_matrix.csv (long form, every observation kept) and
data/derived/noto_emoji_first_support.csv (one row per item).
Two dating conventions are kept side by side because neither is exact:
  commit_date : when the binary landed in googlefonts/noto-emoji (some binaries were committed months after build)
  build_stamp : the YYYYMMDD in the font's own version string 'noto-emoji:YYYYMMDD' (absent for the 2017 builds)"""
import csv, re, os, datetime
from shape_check import Shaper
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
D = f'{ROOT}/data/derived'
man = list(csv.DictReader(open(f'{D}/noto_emoji_font_manifest.csv')))
man.sort(key=lambda r: r['commit_date_iso'] and datetime.datetime.fromisoformat(r['commit_date_iso']).timestamp())
seqs = [r for r in csv.DictReader(open(f'{D}/emoji_sequences.csv')) if r['status'] in ('fully-qualified', 'component')]
# plus every Emoji-property code point from Dataset 1 tested as a bare character (text default for some)
cps = [r for r in csv.DictReader(open(f'{D}/codepoints.csv')) if r['emoji_property'] == '1' or r['extended_pictographic'] == '1']
items = [dict(item_id='SEQ ' + r['seq_hex'], seq=[int(x, 16) for x in r['seq_hex'].split()], kind=r['sequence_type'], release=r['emoji_release_date'],
              name=r['name'], role=r['study_role'], ver=r['emoji_version']) for r in seqs]
seen = {i['item_id'] for i in items}
for r in cps:
    iid = 'CP ' + r['codepoint'][2:]
    items.append(dict(item_id=iid, seq=[int(r['cp_int'])], kind='codepoint_bare', release=r['unicode_release_date'], name=r['unicode_name'],
                      role=r['study_role'], ver=r['unicode_version']))
out = open(f'{D}/noto_emoji_shaping_matrix.csv', 'w', newline='')
w = csv.writer(out); w.writerow(['font_commit', 'font_commit_date', 'font_sha256', 'item_id', 'shape_class'])
first = {}   # item -> list of (idx, class)
hist = {i['item_id']: [] for i in items}
for idx, m in enumerate(man):
    sh = Shaper(f"{ROOT}/{m['file']}")
    for it in items:
        k = sh.shape_class(it['seq'])
        if it['kind'] == 'codepoint_bare' and k != 'MISSING':
            pass
        w.writerow([m['commit'][:7], m['commit_date'], m['sha256'][:16], it['item_id'], k]); hist[it['item_id']].append(k)
    print(m['commit_date'], m['commit'][:7], 'done', flush=True)
out.close()
def stamp(m):
    g = re.search(r'noto-emoji:(\d{8})', m['name_version'])
    return datetime.date(int(g[1][:4]), int(g[1][4:6]), int(g[1][6:])).isoformat() if g else ''
rows = []
for it in items:
    h = hist[it['item_id']]
    fi = next((i for i, k in enumerate(h) if k == 'FULL'), None)
    regress = fi is not None and any(k != 'FULL' for k in h[fi:])
    rel = datetime.date.fromisoformat(it['release'])
    r = dict(item_id=it['item_id'], kind=it['kind'], name=it['name'], version=it['ver'], study_role=it['role'], release_date=it['release'],
             first_full_commit=man[fi]['commit'][:7] if fi is not None else '', first_full_commit_date=man[fi]['commit_date'] if fi is not None else '',
             first_full_build_stamp=stamp(man[fi]) if fi is not None else '', regressed_later=int(regress),
             supported_in_latest=int(h[-1] == 'FULL'), latest_class=h[-1],
             # exact_commit: absent in an earlier binary, first composed at this commit.
             # left_censored: already composed in the oldest binary in the repo (2017-03-10) => first date unknowable from this history (upper bound only).
             date_quality=('never' if fi is None else ('left_censored' if fi == 0 else 'exact_commit')))
    if fi is not None and fi > 0:
        r['lag_days_commit'] = (datetime.date.fromisoformat(man[fi]['commit_date']) - rel).days
        r['lag_days_build_stamp'] = (datetime.date.fromisoformat(stamp(man[fi])) - rel).days if stamp(man[fi]) else ''
    else: r['lag_days_commit'] = r['lag_days_build_stamp'] = ''
    rows.append(r)
with open(f'{D}/noto_emoji_first_support.csv', 'w', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=list(rows[0])); wr.writeheader(); wr.writerows(rows)
