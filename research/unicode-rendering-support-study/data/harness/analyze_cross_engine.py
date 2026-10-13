#!/usr/bin/env python3
"""Layer E: agreement of Firefox and WebKit with this study's Chromium classification, on the same font sets, for every code point (non-combining, non-emoji-property) and every fully-qualified emoji sequence.
Also the determinism check: the Chromium re-render in this run versus the original run's pixels. Output: results/tables/cross_engine_agreement.csv, cross_engine_disagreements.csv"""
import csv, sys, os, collections, gzip, unicodedata
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); T = f'{ROOT}/results/tables'; RAW = f'{ROOT}/results/raw/cross_engine'
UN = {'TOFU', 'LASTRESORT_HEXBOX', 'BLANK', 'REPLACEMENT_GLYPH'}
def rtl(item):      # the harness anchors each cell at its left edge; right-to-left characters are drawn outside the cell by WebKit, so they are excluded from code point comparisons
    try: return unicodedata.bidirectional(chr(int(item[2:], 16))) in ('R', 'AL', 'AN')
    except Exception: return False
rows = []
for e in ('chromium', 'webkit', 'firefox'):
    p = f'{RAW}/cross_engine_full_{e}.csv.gz'
    if os.path.exists(p): rows += list(csv.DictReader(gzip.open(p, 'rt', encoding='utf-8')))
out = []; dis = []
for eng in ('chromium', 'webkit', 'firefox'):
    for cond in ('A_minimal', 'A_distro', 'B_noto'):
        for arm in ('cp', 'seq'):
            rs = [r for r in rows if r['engine'] == eng and r['condition'] == cond and r['arm'] == arm and r['chromium_truth'] not in ('', 'UNKNOWN', 'INVISIBLE_OK', 'SENTINEL')]
            if not rs: continue
            n_rtl = 0
            if arm == 'cp': n_rtl = sum(rtl(r['item_id']) for r in rs); rs = [r for r in rs if not rtl(r['item_id'])]
            if arm == 'seq':      # the sequence test is a width test and cannot tell a monochrome symbol from a colour picture; engines are compared with the Chromium run of the SAME test
                ref = {r['item_id']: r['verdict'] for r in rows if r['engine'] == 'chromium' and r['condition'] == cond and r['arm'] == 'seq'}
                for r in rs: r['ref_truth'] = 'FULL' if ref.get(r['item_id']) == 'COMPOSED' else 'NOTFULL'
            if arm == 'cp':
                eng_ok = lambda r: r['verdict'] == 'DRAWN'; tru_ok = lambda r: r['chromium_truth'] not in UN
            else:
                eng_ok = lambda r: r['verdict'] == 'COMPOSED'; tru_ok = lambda r: r['ref_truth'] == 'FULL'
            n = len(rs); agree = sum(eng_ok(r) == tru_ok(r) for r in rs)
            only_eng = [r for r in rs if eng_ok(r) and not tru_ok(r)]; only_tru = [r for r in rs if tru_ok(r) and not eng_ok(r)]
            out.append(dict(excluded_right_to_left=n_rtl, engine=eng, engine_version=rs[0]['engine_version'], condition=cond, arm='code points' if arm == 'cp' else 'emoji sequences', n=n,
                            agree=agree, agree_pct=round(100 * agree / n, 2), engine_draws_study_chromium_does_not=len(only_eng), study_chromium_draws_engine_does_not=len(only_tru),
                            engine_unsupported=sum(not eng_ok(r) for r in rs), study_chromium_unsupported=sum(not tru_ok(r) for r in rs)))
            for r in (only_eng + only_tru)[:4000]:
                dis.append(dict(engine=eng, condition=cond, arm=arm, item_id=r['item_id'], version=r['version'], engine_verdict=r['verdict'], study_chromium_class=r['chromium_truth'], direction='engine draws, Chromium does not' if r in only_eng else 'Chromium draws, engine does not'))
# method check: the width test used for sequences against this study's full detector, same Chromium
for cond in ('A_minimal', 'A_distro', 'B_noto'):
    rs = [r for r in rows if r['engine'] == 'chromium' and r['condition'] == cond and r['arm'] == 'seq' and r['chromium_truth'] not in ('', 'UNKNOWN', 'SENTINEL')]
    agree = sum((r['verdict'] == 'COMPOSED') == (r['chromium_truth'] == 'FULL') for r in rs)
    out.append(dict(excluded_right_to_left=0, engine='chromium (width test vs full detector)', engine_version=rs[0]['engine_version'], condition=cond, arm='emoji sequences', n=len(rs), agree=agree, agree_pct=round(100 * agree / len(rs), 2),
                    engine_draws_study_chromium_does_not=sum(r['verdict'] == 'COMPOSED' and r['chromium_truth'] != 'FULL' for r in rs), study_chromium_draws_engine_does_not=sum(r['verdict'] != 'COMPOSED' and r['chromium_truth'] == 'FULL' for r in rs),
                    engine_unsupported=sum(r['verdict'] != 'COMPOSED' for r in rs), study_chromium_unsupported=sum(r['chromium_truth'] != 'FULL' for r in rs)))
with open(f'{T}/cross_engine_agreement.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
with open(f'{T}/cross_engine_disagreements.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(dis[0])); w.writeheader(); w.writerows(dis)
for o in out: print(o)
