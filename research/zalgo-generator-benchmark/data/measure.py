#!/usr/bin/env python3
"""Measure Zalgo outputs on one scale for every tool.

Input: samples.json and inputs.json next to this script.
Output: writes measurements.csv (one row per sample) and
measurements-summary.csv (one row per tool x input x setting), which should
match output-measurements.csv.

Zones come from Unicode canonical combining class (ccc), not a tool's labels:
  middle = ccc 1 (overlay); above = 214,216,228,230,232,234;
  below = 202,218,220,222,233,240; other = remaining Mn/Me (e.g. U+0489 ccc 0).
Stack depth is counted in code points on one base; rendered height is not measured.
"""
import csv, glob, json, statistics, sys, unicodedata, os
ABOVE = {214, 216, 228, 230, 232, 234}
BELOW = {202, 218, 220, 222, 233, 240}
MIDDLE = {1}

def is_mark(ch):
    return unicodedata.category(ch) in ("Mn", "Me")

def zone(ch):
    c = unicodedata.combining(ch)
    if c in MIDDLE: return "middle"
    if c in ABOVE: return "above"
    if c in BELOW: return "below"
    return "other"

def measure(text, original=None):
    bases, cur = [], None
    z = {"above": 0, "middle": 0, "below": 0, "other": 0}
    uniq = set()
    for ch in text:
        if is_mark(ch):
            uniq.add(ch)
            z[zone(ch)] += 1
            if cur is None:
                cur = {"base": "", "marks": []}; bases.append(cur)
            cur["marks"].append(ch)
        else:
            cur = {"base": ch, "marks": []}; bases.append(cur)
    alnum = [b for b in bases if b["base"].isalnum()]
    total = sum(z.values())
    marks_on_alnum = sum(len(b["marks"]) for b in alnum)
    nonalnum_marked = sum(1 for b in bases if b["base"] and not b["base"].isalnum() and b["marks"])
    touched = sum(1 for b in alnum if b["marks"])
    stripped = "".join(b["base"] for b in bases)
    orig_marks = sum(1 for ch in (original or "") if is_mark(ch))
    return {
        "marks_total": total,
        "marks_added": total - orig_marks,
        "marks_per_alnum_base": round(marks_on_alnum / len(alnum), 3) if alnum else 0,
        "share_alnum_touched": round(touched / len(alnum), 3) if alnum else 0,
        "nonalnum_bases_marked": nonalnum_marked,
        "above": z["above"], "middle": z["middle"], "below": z["below"], "other": z["other"],
        "unique_marks": len(uniq),
        "utf16_len": len(text.encode("utf-16-le")) // 2,
        "codepoint_len": len(text),
        "max_marks_one_base": max((len(b["marks"]) for b in bases), default=0),
        "max_above_one_base": max((sum(1 for m in b["marks"] if zone(m) == "above") for b in bases), default=0),
        "max_below_one_base": max((sum(1 for m in b["marks"] if zone(m) == "below") for b in bases), default=0),
        "base_text_preserved": (unicodedata.normalize("NFD", stripped).replace("́","").replace("̀","")
                                 == unicodedata.normalize("NFD", "".join(ch for ch in unicodedata.normalize("NFD", original or "") if not is_mark(ch)))) if original is not None else "",
    }

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    inputs = {i["id"]: i["text"] for i in json.load(open(os.path.join(root, "inputs.json")))["inputs"]}
    rows = []
    for s in json.load(open(os.path.join(root, "samples.json"), encoding="utf-8"))["samples"]:
        m = measure(s["output"], inputs.get(s["input_id"]))
        rows.append({"tool": s["tool"], "input_id": s["input_id"], "setting": s.get("setting", "default"), **m})
    if not rows:
        print("no samples found", file=sys.stderr); sys.exit(2)
    with open(os.path.join(root, "measurements.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)
    groups = {}
    for r in rows:
        groups.setdefault((r["tool"], r["input_id"], r["setting"]), []).append(r)
    summ = []
    for (tool, iid, setting), rs in groups.items():
        mpb = [r["marks_per_alnum_base"] for r in rs]
        summ.append({"tool": tool, "input_id": iid, "setting": setting, "n": len(rs),
            "mpb_mean": round(statistics.mean(mpb), 2), "mpb_sd": round(statistics.pstdev(mpb), 2),
            "mpb_min": min(mpb), "mpb_max": max(mpb),
            "above_share": round(sum(r["above"] for r in rs) / max(1, sum(r["marks_total"] for r in rs)), 3),
            "middle_share": round(sum(r["middle"] for r in rs) / max(1, sum(r["marks_total"] for r in rs)), 3),
            "below_share": round(sum(r["below"] for r in rs) / max(1, sum(r["marks_total"] for r in rs)), 3),
            "unique_marks_max": max(r["unique_marks"] for r in rs),
            "utf16_len_mean": round(statistics.mean(r["utf16_len"] for r in rs), 1),
            "max_above_one_base": max(r["max_above_one_base"] for r in rs),
            "max_marks_one_base": max(r["max_marks_one_base"] for r in rs),
            "share_alnum_touched_mean": round(statistics.mean(r["share_alnum_touched"] for r in rs), 3),
            "distinct_outputs": None})
    with open(os.path.join(root, "measurements-summary.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=summ[0].keys()); w.writeheader(); w.writerows(summ)
    print(f"{len(rows)} samples, {len(summ)} groups")

if __name__ == "__main__":
    main()
