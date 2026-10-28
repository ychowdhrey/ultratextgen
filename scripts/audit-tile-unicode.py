#!/usr/bin/env python3
"""Whole-site dashboard: is every copy tile's Unicode well-formed? Informational (a standing backlog exists).

  python3 scripts/audit-tile-unicode.py [--json out.json] [--show N] [--fail-on error|hardening]

Reads every */index.html, extracts each data-symbol tile and classifies it with scripts/lib/tile_unicode.py
(the one definition; see its docstring for the classes). Exit 0 = ran and reported; 1 = --fail-on matched;
3 = UNKNOWN (a Unicode table is missing, or no tile was found, so nothing was checked and "0 defects" would lie).
"""
import argparse, collections, glob, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import symbol_pages as sp
import tile_unicode as tu


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json")
    ap.add_argument("--show", type=int, default=3)
    ap.add_argument("--fail-on", choices=["error", "hardening"])
    ap.add_argument("--root", default=tu.ROOT)
    a = ap.parse_args()
    try:
        ver, ranges = sp.load_assigned()
        emoji = tu.load_emoji()
    except (FileNotFoundError, KeyError, ValueError) as e:
        print("UNKNOWN: Unicode table unreadable (%s); nothing was checked" % e)
        return 3
    pages = [p for p in glob.glob(os.path.join(a.root, "**", "index.html"), recursive=True) if "node_modules" not in p]
    by = collections.defaultdict(list)
    ntiles = 0
    for p in sorted(pages):
        rel = os.path.relpath(p, a.root)
        src = open(p, encoding="utf-8", errors="replace").read()
        ntiles += src.count('data-symbol="')
        for d, ln, tile in tu.check_page(rel, src, ranges, emoji):
            by[d].append((rel, ln, tile))
    if not ntiles:
        print("UNKNOWN: no data-symbol tile found under %s; nothing was checked" % a.root)
        return 3
    print("tiles %d on %d pages | Unicode %s, Emoji %s" % (ntiles, len(pages), ver, emoji[0]))
    for sev in ("error", "hardening", "info"):
        for d, sv in tu.SEVERITY.items():
            if sv != sev:
                continue
            rows = by.get(d, [])
            print("%-9s %-24s %5d tiles on %4d pages" % (sev, d, len(rows), len({r[0] for r in rows})))
            for rel, ln, tile in rows[:a.show if sev != "info" else 0]:
                print("            %s:%d %s" % (rel, ln, " ".join("U+%04X" % ord(c) for c in tile[:8])))
    if a.json:
        json.dump({k: [list(r) for r in v] for k, v in by.items()}, open(a.json, "w"), ensure_ascii=False, indent=1)
    if a.fail_on:
        bad = [d for d, sv in tu.SEVERITY.items() if by.get(d) and (sv == "error" or a.fail_on == "hardening" and sv == "hardening")]
        if bad:
            print("FAIL (--fail-on %s): %s" % (a.fail_on, ", ".join(bad)))
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
