#!/usr/bin/env python3
"""Recompute the figures on the study page from the published data files.

Usage:  python3 compute-statistics.py <data folder with faces.csv, characters.csv, markdown-results.csv> [--width <browser output for basic+CJK fonts> <browser output for the other font set>]
Needs:  Python 3.10+ and scipy (pip install scipy). statsmodels is optional (adds the logistic regression).

Without --width it prints the counts, shares, font-set tests and Markdown counts. With --width it also prints the width test:
a face "swings" when |w_wqy - w_dejavu| / w_dejavu >= 0.10, where w_* is the width in pixels of the face at 24 px with
white-space:pre in "WenQuanYi Zen Hei Mono" and "DejaVu Sans Mono" (each as the first choice, other fonts allowed as fallback);
these widths are in the `faces` list of the output of font-test-browser.mjs.
"""
import csv, json, math, os, sys
from scipy import stats
D = sys.argv[1]
rd = lambda n: list(csv.DictReader(open(os.path.join(D, n), encoding="utf-8")))
faces, chars, md = rd("faces.csv"), rd("characters.csv"), rd("markdown-results.csv")
N = len(faces); yes = lambda v: v == "yes"
R = {"faces": N}
def share(k, pred): n = sum(1 for f in faces if pred(f)); R[k] = {"faces": n, "share": round(n / N, 4)}
CORE = {"Latin", "Greek", "Cyrillic"}
scripts = lambda f: [s for s in f["scripts"].split("|") if s]
share("two_or_more_scripts", lambda f: len(scripts(f)) >= 2); share("no_script_besides_common", lambda f: len(scripts(f)) == 0)
share("changes_under_NFKC", lambda f: yes(f["changes_under_NFKC"])); share("has_combining_mark", lambda f: yes(f["has_combining_mark"]))
share("has_character_above_U+FFFF", lambda f: yes(f["has_character_above_U+FFFF"])); share("has_ambiguous_width_character", lambda f: yes(f["has_ambiguous_width_character"]))
share("ascii_only", lambda f: all(ord(c) < 128 for c in f["face"]))
R["ascii_only_faces_missing_a_character_basic_fonts"] = sum(1 for f in faces if all(ord(c) < 128 for c in f["face"]) and yes(f["missing_character_basic_fonts"]))
R["ascii_only_faces_changed_by_commonmark_alone"] = sum(1 for f in faces if all(ord(c) < 128 for c in f["face"]) and yes(f["changed_by_commonmark_alone"]))
R["characters_in_exactly_one_face"] = sum(1 for c in chars if c["faces_containing"] == "1")
def woolf(a, b, c, d):
    a, b, c, d = [x + 0.5 for x in (a, b, c, d)]; o = a * d / (b * c); se = math.sqrt(1/a + 1/b + 1/c + 1/d)
    return round(o, 2), round(math.exp(math.log(o) - 1.96 * se), 2), round(math.exp(math.log(o) + 1.96 * se), 2)
def font_test(col, label, only=None):
    other = [f for f in faces if set(scripts(f)) - CORE and (only is None or set(scripts(f)) - CORE - only)]
    core = [f for f in faces if not (set(scripts(f)) - CORE)]
    a = sum(yes(f[col]) for f in other); c = sum(yes(f[col]) for f in core)
    p = stats.fisher_exact([[a, len(other) - a], [c, len(core) - c]])[1]
    R[label] = {"other_script_faces": len(other), "other_script_missing": a, "other_only_faces": len(core), "other_only_missing": c, "all_faces_missing": sum(yes(f[col]) for f in faces),
                "fisher_p": p, "odds_ratio_and_95pct_interval": woolf(a, len(other) - a, c, len(core) - c), "risk_ratio": round((a / len(other)) / (c / len(core)), 2)}
    return p
p_font = font_test("missing_character_basic_fonts", "font_test_basic_fonts")
font_test("missing_character_basic_plus_cjk_fonts", "font_test_basic_plus_cjk_fonts")
font_test("missing_character_basic_fonts", "font_test_basic_fonts_without_kana_and_han_only_faces", only={"Katakana", "Hiragana", "Han"})
R["markdown_faces_changed"] = {k: sum(int(r[k]) for r in md) for k in md[0] if k != "face_id" and k != "face"}
ps = {"fonts": p_font}
if "--width" in sys.argv:
    i = sys.argv.index("--width"); out = {}
    for tag, path in (("basic_plus_cjk_fonts", sys.argv[i + 1]), ("other_font_set", sys.argv[i + 2])):
        b = {x["id"]: x for x in json.load(open(path))["faces"]}; amb = {f["face_id"]: yes(f["has_ambiguous_width_character"]) for f in faces}
        sw = lambda x: abs(x["w_wqy_mono"] - x["w_dejavu_mono"]) / x["w_dejavu_mono"] >= 0.10
        a = sum(1 for k, v in b.items() if amb[k] and sw(v)); na = sum(1 for k in b if amb[k]); c = sum(1 for k, v in b.items() if not amb[k] and sw(v)); nn = sum(1 for k in b if not amb[k])
        p = stats.fisher_exact([[a, na - a], [c, nn - c]])[1]; out[tag] = {"ambiguous_faces_swing": a, "ambiguous_faces": na, "other_faces_swing": c, "other_faces": nn, "fisher_p": p, "odds_ratio_and_95pct_interval": woolf(a, na - a, c, nn - c)}
        if tag == "basic_plus_cjk_fonts": ps["width"] = p
    R["width_test"] = out
m = len(ps); o = sorted(ps.items(), key=lambda kv: kv[1]); run = 0; R["holm_adjusted_p"] = {}
for r, (k, p) in enumerate(o): run = max(run, (m - r) * p); R["holm_adjusted_p"][k] = min(1.0, run)
try:
    import numpy as np, statsmodels.api as sm
    X = sm.add_constant(np.array([[len(set(scripts(f)) - CORE)] for f in faces], float)); y = np.array([int(yes(f["missing_character_basic_fonts"])) for f in faces])
    lg = sm.Logit(y, X).fit(disp=0); R["logistic_basic_fonts_odds_ratio_per_extra_script"] = round(float(math.exp(lg.params[1])), 2)
except ImportError:
    R["logistic_basic_fonts_odds_ratio_per_extra_script"] = "install statsmodels to compute"
print(json.dumps(R, indent=1, ensure_ascii=False))
