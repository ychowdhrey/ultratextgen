#!/usr/bin/env python3
"""Reproduce the matched odds ratios in this study from text-features.csv alone (no text is needed).
Usage: python3 reproduce.py text-features.csv
Each accused text has up to three unaccused control texts in its set. The odds ratio is Mantel-Haenszel over sets;
the interval is a percentile bootstrap over sets (2,000 resamples, fixed seed). 'accused' means a reader publicly
accused the text of being AI-written; it says nothing about who wrote it."""
import csv, sys, random, collections
rows = [r for r in csv.DictReader(open(sys.argv[1])) if r["target_kind"] != "post_submitted_to_hn_page_not_analysed"]
def sets(unit, pred=lambda r: True):
    d = collections.defaultdict(lambda: {"a": None, "c": []})
    for r in rows:
        if r["unit"] != unit: continue
        s = d[r["set"]]
        if r["role"] == "accused": s["a"] = r
        else: s["c"].append(r)
    return [v for v in d.values() if v["a"] is not None and v["c"] and pred(v["a"])]
def mh(S, flag):
    num = den = 0.0; ks = []
    for s in S:
        k = len(s["c"]); n = 1 + k; a = int(s["a"][flag]); b = sum(int(c[flag]) for c in s["c"])
        num += a * (k - b) / n; den += (1 - a) * b / n; ks.append((a, b, k))
    return (num / den if den else float("inf")), ks
def boot(ks, B=2000):
    rnd = random.Random(1); out = []
    for _ in range(B):
        num = den = 0.0
        for a, b, k in (rnd.choice(ks) for _ in ks):
            n = 1 + k; num += a * (k - b) / n; den += (1 - a) * b / n
        if den: out.append(num / den)
    out.sort(); return out[int(.025 * len(out))], out[int(.975 * len(out))]
def show(label, unit, flag, pred=lambda r: True):
    S = sets(unit, pred); o, ks = mh(S, flag); lo, hi = boot(ks); print(f"{label:58s} OR {o:5.2f} (95% {lo:4.1f} to {hi:5.1f})  {len(S)} matched sets")
show("Short comments, em dash or typed double hyphen, all years", "comment", "flag_emdash_any")
show("Short comments, em dash character only, all years", "comment", "flag_emdash_character")
show("Short comments, em dash character only, 2025 and later", "comment", "flag_emdash_character", lambda r: int(r["year"]) >= 2025)
show("Short comments, typed double hyphen only, all years", "comment", "flag_double_hyphen_only")
show("Short comments, em dash or double hyphen, 2025 and later", "comment", "flag_emdash_any", lambda r: int(r["year"]) >= 2025)
show("Short comments, em dash or double hyphen, 2023 to 2024", "comment", "flag_emdash_any", lambda r: int(r["year"]) < 2025)
show("Short comments, three or more short sentences in a row", "comment", "flag_staccato_ge3")
show("Articles, em dash or double hyphen", "article", "flag_emdash_any")
show("Articles, em dash character only", "article", "flag_emdash_character")
show("Articles, three or more short sentences in a row", "article", "flag_staccato_ge3")
show("Articles, bullet list", "article", "flag_md_bullet")
