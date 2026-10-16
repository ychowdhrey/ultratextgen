#!/usr/bin/env python3
"""Which faces contain a character that no installed font covers? Static check of font character maps (fontTools).
Usage: python3 font-coverage.py <out folder from reproduce-corpus.py> <fontconfig file, or "system">
Example: python3 font-coverage.py out fontconfig-basic.conf   (needs fc-list and `pip install fonttools==4.66.1`)
Prints the share of faces with a missing character, split by whether the face uses a writing system other than punctuation, Latin, Greek or Cyrillic."""
import csv, os, subprocess, sys
from fontTools.ttLib import TTFont, TTCollection
out, conf = sys.argv[1], sys.argv[2]
env = dict(os.environ)
if conf != "system": env["FONTCONFIG_FILE"] = os.path.abspath(conf)
files = sorted({l.split(": ")[0] for l in subprocess.run(["fc-list", ":", "file", "family"], capture_output=True, text=True, env=env).stdout.splitlines() if ": " in l})
cmap = set()
for f in files:
    try:
        fonts = TTCollection(f).fonts if f.lower().endswith((".ttc", ".otc")) else [TTFont(f, lazy=True)]
        for t in fonts: cmap |= set(t.getBestCmap() or {})
    except Exception:
        pass   # Type 1 and other formats Chromium does not use for these characters
cps = list(csv.DictReader(open(os.path.join(out, "codepoints.csv"), encoding="utf-8")))
faces = {r["face_id"]: r for r in csv.DictReader(open(os.path.join(out, "faces-all-columns.csv"), encoding="utf-8"))}
CORE = {"Common", "Inherited", "Latin", "Greek", "Cyrillic", "Unknown"}
by = {}
for c in cps:
    ign = c["general_category"] in ("Cf", "Mn", "Me") and (c["default_ignorable"] == "True" or c["variation_selector"] == "True")
    if not ign and int(c["scalar_hex"][2:], 16) not in cmap: by.setdefault(c["face_id"], []).append(c["char"])
groups = {"other_script": [0, 0], "core_only": [0, 0]}
for fid, f in faces.items():
    g = "other_script" if any(s and s not in CORE for s in f["scripts_noncommon"].split("|")) else "core_only"
    groups[g][1] += 1; groups[g][0] += fid in by
print(f"{len(files)} font files; faces with a missing character: {sum(v[0] for v in groups.values())} of {len(faces)}")
for g, (m, n) in groups.items(): print(f"  {g}: {m} of {n} ({100*m/max(1,n):.1f}%)")
