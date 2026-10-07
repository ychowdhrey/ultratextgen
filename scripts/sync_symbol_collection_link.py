#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_symbol_collection_link.py

Keeps the "Need more than this one? Browse the full set in <collection>" line
on every English /symbol/ spoke, directly under the first copy section. The
line, its placement and how the collection is chosen live in
`scripts/lib/symbol_collection_link.py`; this is the pass that applies them.

Modes
-----
  --check (default)  report spokes whose line is missing or out of date.
                     Exit 0 when every spoke is current, 1 when any is stale,
                     2 (UNKNOWN, never 0) when a spoke cannot be answered: no
                     collection card to point at, no copy section to anchor
                     to, or no spokes found at all.
  --write            rewrite stale spokes in place. Idempotent.
"""

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
import symbol_collection_link as scl  # noqa: E402

REPO = SCRIPT_DIR.parent
SYMBOL_DIR = REPO / "symbol"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[1])
    ap.add_argument("--write", action="store_true", help="rewrite stale spokes")
    args = ap.parse_args(argv)

    pages = sorted(SYMBOL_DIR.glob("*/index.html"))
    if not pages:
        print("UNKNOWN: no spokes found under symbol/", file=sys.stderr)
        return 2

    stale, unknown, current = [], [], 0
    for page in pages:
        html = page.read_text(encoding="utf-8")
        new, status = scl.apply(html)
        rel = page.relative_to(REPO)
        if status != "ok":
            unknown.append((rel, status))
        elif new != html:
            stale.append(rel)
            if args.write:
                page.write_text(new, encoding="utf-8")
        else:
            current += 1

    verb = "rewrote" if args.write else "stale"
    print(f"symbol collection link: {len(pages)} spokes, {current} current, "
          f"{len(stale)} {verb}, {len(unknown)} unknown")
    for rel in stale:
        print(f"  {verb}: {rel}")
    for rel, status in unknown:
        print(f"  UNKNOWN ({status}): {rel}")

    if unknown:
        return 2
    if stale and not args.write:
        print("Fix: npm run sync:symbol-collection-link", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
