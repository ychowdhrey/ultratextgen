#!/usr/bin/env python3
"""Gate: a page a PR adds or edits must not gain a copy tile with malformed Unicode, on ANY page type.

A DELTA check, not a state check: main carries a standing backlog (two unassigned-copy tiles, one on a measurement
control that stays untouched until 2026-11-15, and 27 NFC-fragile literals), and a gate that is red regardless of the
PR is one people learn to ignore. Only defects a PR ADDS count; pre-existing ones are reported by
`npm run audit:tile-unicode`, never silenced. scripts/check-symbol-pages.py gates unassigned-copy on symbol pages only;
this extends the same rule to every lane (usecase/, library/, guide/, locale pages), where the real escapes were.

  python3 scripts/check-tile-unicode.py               # pages changed vs origin/main
  python3 scripts/check-tile-unicode.py --base main   # another base ref

Exit: 0 nothing added, 1 a page gained a gated defect, 2 UNKNOWN (base ref unresolved, Unicode table missing, or a
changed page unreadable). UNKNOWN is never 0. The defect list is scripts/lib/tile_unicode.GATED (one definition).
"""
import argparse, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import symbol_pages as sp
import tile_unicode as tu

ROOT = tu.ROOT


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--root", default=tu.ROOT, help="repository to check (tests point it at a temp repo)")
    a = ap.parse_args()
    global ROOT
    ROOT = os.path.abspath(a.root)
    try:
        _v, ranges = sp.load_assigned()
        emoji = tu.load_emoji()
    except (FileNotFoundError, KeyError, ValueError) as e:
        print("UNKNOWN: Unicode table unreadable (%s); nothing was checked" % e)
        return 2
    if git("rev-parse", "--verify", a.base).returncode != 0:
        print("UNKNOWN: cannot resolve base ref %r (shallow clone? run git fetch); nothing was checked" % a.base)
        return 2
    diff = git("diff", "--name-only", "--diff-filter=AM", a.base + "...HEAD")
    if diff.returncode != 0:
        print("UNKNOWN: git diff failed: " + diff.stderr.strip())
        return 2
    pages = [p for p in diff.stdout.split() if p.endswith("index.html")]
    bad = 0
    for rel in pages:
        try:
            head = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        except OSError as e:
            print("UNKNOWN: cannot read %s (%s)" % (rel, e))
            return 2
        shown = git("show", a.base + ":" + rel)
        base = shown.stdout if shown.returncode == 0 else ""  # a new page has no base text
        for d, ln, tile in tu.new_defects(base, head, ranges, emoji):
            bad += 1
            print("%s:%d  %s  %s" % (rel, ln, d, " ".join("U+%04X" % ord(c) for c in tile[:8])))
    if bad:
        print("\n%d new tile defect(s). Fix the tile (see scripts/lib/tile_unicode.py for each class); "
              "pre-existing ones are in `npm run audit:tile-unicode`." % bad)
        return 1
    print("tile Unicode: %d changed page(s), no new defect." % len(pages))
    return 0


if __name__ == "__main__":
    sys.exit(main())
