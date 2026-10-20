#!/usr/bin/env python3
"""Gate: the symbol pages a PR adds or edits must carry none of the defects in scripts/lib/symbol_pages.py.

A STATE check on changed pages, not a delta: after the 2026-10-20 repair pass the whole lane stands at zero for
every defect below, so there is no backlog for it to be permanently red against.

  python3 scripts/check-symbol-pages.py               # pages changed vs origin/main
  python3 scripts/check-symbol-pages.py --base main   # another base ref
  python3 scripts/check-symbol-pages.py --all         # every symbol page (whole-tree state)

Exit: 0 clean (or nothing to check), 1 a changed page has a defect, 2 UNKNOWN (cannot resolve the base ref, or the
pinned Unicode table is missing). UNKNOWN is never 0.
Defects gate: faq-after-footer, unassigned-copy, double-escaped-entity (all at zero lane-wide, all deterministic).
Not gated, reported by `npm run audit:symbol-pages`: tile-glyph-mismatch and alt-code-mismatch (13 pages today, every one a
legitimate mention of a different character or a tile whose label is a pair such as `<>`; a gate red on those is one people
learn to ignore), title-promise, and the codes table (generated, and a sibling's shape can forbid it).
"""
import argparse, glob, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import symbol_pages as sp

GATED = {"faq-after-footer", "unassigned-copy", "double-escaped-entity"}

ROOT = sp.ROOT


def changed(base):
    try:
        subprocess.run(["git", "rev-parse", "--verify", base], cwd=ROOT, capture_output=True, check=True)
    except subprocess.CalledProcessError:
        return None
    out = subprocess.run(["git", "diff", "--name-only", "--diff-filter=AM", base + "...HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    return [p for p in out if p.endswith("index.html") and sp.is_symbol_page(p)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    try:
        version, ranges = sp.load_assigned()
    except Exception as e:
        print(f"UNKNOWN: cannot read data/unicode_assigned_ranges.json ({e})")
        return 2
    if a.all:
        rels = sorted(os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, "**/symbol/*/index.html"), recursive=True) if "node_modules" not in p)
        rels = [r for r in rels if sp.is_symbol_page(r)]
    else:
        rels = changed(a.base)
        if rels is None:
            print(f"UNKNOWN: cannot resolve base ref {a.base!r} (shallow clone or wrong name); this is not a pass")
            return 2
    bad = 0
    for rel in rels:
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        for did, line, detail in sp.check_page(rel, src, ranges, version):
            if did not in GATED:
                continue
            bad += 1
            print(f"{rel}:{line}: {did}: {detail}")
    print(f"checked {len(rels)} symbol page(s) against Unicode {version}: {bad} defect(s)")
    if bad:
        print("\nFix: faq-after-footer -> python3 scripts/fix-faq-above-footer.py; unassigned-copy -> remove the tile, or add data-provisional only while the page states the provisional status; the rest are edits to the page.\n"
              "Definitions: scripts/lib/symbol_pages.py")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
