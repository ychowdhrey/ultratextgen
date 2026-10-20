#!/usr/bin/env python3
"""Move a symbol page's FAQ block from below </footer> to directly above the footer. Idempotent.

  python3 scripts/fix-faq-above-footer.py            # every symbol-lane page
  python3 scripts/fix-faq-above-footer.py --check    # exit 1 if any page still has the defect
  python3 scripts/fix-faq-above-footer.py PATH...    # only these pages

Only the position moves: no string, JSON-LD question or script changes. The accordion script that follows
the block is left where it is (it binds on load, after the block exists wherever the block sits).
Definition of the defect: scripts/lib/symbol_pages.py.
"""
import glob, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import symbol_pages as sp

root = sp.ROOT
args = [a for a in sys.argv[1:] if not a.startswith("--")]
rels = args or sorted(os.path.relpath(p, root) for p in glob.glob(os.path.join(root, "**/symbol/*/index.html"), recursive=True) if not p.startswith(os.path.join(root, "node_modules")))
rels = [r for r in rels if sp.is_symbol_page(r)]
bad = moved = 0
for r in rels:
    p = os.path.join(root, r)
    s = open(p, encoding="utf-8").read()
    if not sp.faq_block(s):
        continue
    bad += 1
    if "--check" in sys.argv:
        print("faq after footer:", r)
        continue
    t, ok = sp.move_faq_above_footer(s)
    if ok and not sp.faq_block(t):
        open(p, "w", encoding="utf-8").write(t)
        moved += 1
    else:
        print("COULD NOT MOVE:", r)
        sys.exit(1)
print(f"{bad} page(s) with the defect; {moved} moved")
sys.exit(1 if ("--check" in sys.argv and bad) else 0)
