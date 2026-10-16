#!/usr/bin/env python3
"""Usage: python3 make-font-test-input.py <out folder from reproduce-corpus.py>  ->  <out>/font-test-input.json (faces, characters, unassigned control characters)."""
import csv, json, os, sys
out = sys.argv[1]
faces = list(csv.DictReader(open(os.path.join(out, "faces-all-columns.csv"), encoding="utf-8"))); cps = list(csv.DictReader(open(os.path.join(out, "codepoints.csv"), encoding="utf-8")))
scal = {int(c["scalar_hex"][2:], 16): c["general_category"] for c in cps}
json.dump({"faces": [{"id": f["face_id"], "s": f["expression_raw"]} for f in faces], "scalars": [{"cp": k, "gc": v} for k, v in sorted(scal.items())],
           "refs": [0x0378, 0x0E00, 0x2FE0, 0x0FFF, 0xFFEF], "controls": {"neg_ascii": "abc", "neg_face": "(^_^)", "pos_unassigned": "\u0379", "pos_unassigned2": "\u0380"}},
          open(os.path.join(out, "font-test-input.json"), "w"), ensure_ascii=False)
