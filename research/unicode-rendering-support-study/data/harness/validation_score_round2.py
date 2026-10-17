#!/usr/bin/env python3
"""Score the detector against the manual labels (validation/manual_labels.csv) -> validation/confusion_*.csv, validation/summary.json"""
import csv, json, collections, os
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); V = f'{ROOT}/validation/round2_holdout'
import gzip, sys
S = {r['sample_id']: r for r in csv.DictReader(open(f'{V}/sample.csv', encoding='utf-8'))}
# refresh predictions from the CURRENT classified files (detector may have changed since the sample was drawn; labels never change)
_cache = {}
for sid, s in S.items():
    run = s['run_id']
    if run not in _cache:
        with gzip.open(f'{ROOT}/results/classified/{run}.csv.gz', 'rt', encoding='utf-8', newline='') as f: _cache[run] = {r['item_id']: r for r in csv.DictReader(f)}
    cur = _cache[run][s['item_id']]; s['predicted_class'] = cur['render_class']; s['class_reason'] = cur['class_reason']
L = {r['sample_id']: r for r in csv.DictReader(open(f'{V}/manual_labels.csv', encoding='utf-8'))}
assert set(S) == set(L), (len(S), len(L))
pmap_cp = {'MONO_GLYPH': 'G', 'COLOR_EMOJI': 'G', 'TEXT_FALLBACK': 'G', 'TOFU': 'T', 'LASTRESORT_HEXBOX': 'H', 'BLANK': 'B', 'INVISIBLE_OK': 'B', 'UNKNOWN': '?', 'REPLACEMENT_GLYPH': 'R'}
pmap_sq = {'FULL': 'FULL', 'PARTIAL': 'PART', 'DECOMPOSED': 'DEC', 'MISSING': 'MISS', 'TEXT_FALLBACK': 'TEXT', 'UNKNOWN': '?'}
cm = {'cp': collections.Counter(), 'seq': collections.Counter()}
rows = []
for sid, s in S.items():
    m = L[sid]['manual_label']; p = (pmap_cp if s['kind'] == 'cp' else pmap_sq)[s['predicted_class']]
    cm[s['kind']][(m, p)] += 1
    rows.append(dict(sample_id=sid, stratum=s['stratum'], condition=s['condition'], kind=s['kind'], item_id=s['item_id'], predicted=s['predicted_class'], predicted_short=p, manual=m, confidence='high', agree=int(m == p)))
with open(f'{V}/scored.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
out = {}
for kind in ('cp', 'seq'):
    labs = sorted({k[0] for k in cm[kind]}); preds = sorted({k[1] for k in cm[kind]})
    with open(f'{V}/confusion_{kind}.csv', 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['manual\\predicted'] + preds)
        for l in labs: w.writerow([l] + [cm[kind][(l, p)] for p in preds])
    out[kind] = {'n': sum(cm[kind].values()), 'confusion': {f'{a}->{b}': v for (a, b), v in sorted(cm[kind].items())}}
# binary 'renders a real glyph' decision on single code points (positive = a glyph is drawn)
tp = fp = fn = tn = 0; fpl = []; fnl = []
for r in rows:
    if r['kind'] != 'cp' or r['predicted_short'] == '?' or r['manual'] == 'O': continue
    pos_p = r['predicted_short'] == 'G'; pos_m = r['manual'] == 'G'
    if pos_p and pos_m: tp += 1
    elif pos_p and not pos_m: fp += 1; fpl.append((r['sample_id'], r['item_id'], r['condition'], r['manual']))
    elif not pos_p and pos_m: fn += 1; fnl.append((r['sample_id'], r['item_id'], r['condition'], r['predicted']))
    else: tn += 1
def wilson(k, n, z=1.96):
    if n == 0: return (None, None)
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** .5)
    return ((c - h) / d, (c + h) / d)
out['cp_binary_glyph_drawn'] = dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=tp / (tp + fp) if tp + fp else None, recall=tp / (tp + fn) if tp + fn else None,
    false_positive_rate=fp / (fp + tn) if fp + tn else None, false_negative_rate=fn / (fn + tp) if fn + tp else None,
    fp_rate_ci95=wilson(fp, fp + tn), fn_rate_ci95=wilson(fn, fn + tp), false_positives=fpl, false_negatives=fnl,
    n_abstained_unknown=sum(1 for r in rows if r['kind'] == 'cp' and r['predicted_short'] == '?'), n_manual_unsure=sum(1 for r in rows if r['kind'] == 'cp' and r['manual'] == 'O'))
# 'unsupported' sub-types: when the detector says unsupported, is the subtype right?
sub = collections.Counter((r['manual'], r['predicted_short']) for r in rows if r['kind'] == 'cp' and r['predicted_short'] in ('T', 'H', 'B'))
out['cp_unsupported_subtype'] = {f'{a}->{b}': v for (a, b), v in sorted(sub.items())}
# sequences: exact-class agreement and 'FULL' decision
agree = sum(r['agree'] for r in rows if r['kind'] == 'seq'); n = sum(1 for r in rows if r['kind'] == 'seq')
sf = [(r['predicted_short'] == 'FULL', r['manual'] == 'FULL') for r in rows if r['kind'] == 'seq']
tp = sum(1 for a, b in sf if a and b); fp = sum(1 for a, b in sf if a and not b); fn = sum(1 for a, b in sf if not a and b); tn = sum(1 for a, b in sf if not a and not b)
out['seq_exact_class_agreement'] = dict(agree=agree, n=n, rate=agree / n, ci95=wilson(agree, n))
out['seq_FULL_decision'] = dict(tp=tp, fp=fp, fn=fn, tn=tn, false_positive_rate=fp / (fp + tn) if fp + tn else None, false_negative_rate=fn / (fn + tp) if fn + tp else None,
                                 fp_rate_ci95=wilson(fp, fp + tn), fn_rate_ci95=wilson(fn, fn + tp))
out['strata_sizes'] = dict(collections.Counter(r['stratum'] for r in rows))
out['low_confidence_labels'] = sum(1 for r in rows if False)
json.dump(out, open(f'{V}/summary.json', 'w'), indent=1, default=str)
print(json.dumps({k: out[k] for k in ('cp_binary_glyph_drawn', 'cp_unsupported_subtype', 'seq_exact_class_agreement', 'seq_FULL_decision')}, indent=1, default=str))
for k in ('cp', 'seq'): print(open(f'{V}/confusion_{k}.csv').read())
