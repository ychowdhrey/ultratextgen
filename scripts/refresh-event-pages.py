#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""refresh-event-pages.py — regenerate every /events/ page from its spec.

Event pages are the one content type on this site that goes stale on a clock.
Each page bakes in the next several real dates for its event (see
scripts/lib/event_occurrence.py), and those arrays shorten by one entry every
year until they run out. This script re-runs the generator over every spec so
the dates roll forward.

Run it as part of the seasonal ops loop — the pre-season pass for each event,
and at minimum once a year. Regeneration is lossless: the generator emits the
OG art, hero figure, consent tag and per-event copy itself rather than relying
on post-processing passes, so re-running it never strips a live page. That was
not true before 2026-07-31; if you are reading this after changing the
generator, verify it still holds by regenerating and diffing before committing.

Usage
-----
    npm run refresh:events            # regenerate all specs
    python3 scripts/refresh-event-pages.py --dry-run
    python3 scripts/refresh-event-pages.py --only halloween diwali
"""

import argparse
import pathlib
import subprocess
import sys

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
SPEC_DIR = REPO / "data" / "event_page_specs"
GENERATOR = SCRIPT_DIR / "generate_event_page_from_spec.py"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument("--only", nargs="*", metavar="SLUG", help="limit to these spec names")
    args = parser.parse_args(argv)

    specs = sorted(p for p in SPEC_DIR.glob("*.json") if not p.name.startswith("_"))
    if args.only:
        wanted = set(args.only)
        specs = [p for p in specs if p.stem in wanted]
        missing = wanted - {p.stem for p in specs}
        for name in sorted(missing):
            print(f"[WARN] no spec named {name}")

    if not specs:
        print("No event specs matched.")
        return 1

    failures = []
    for spec in specs:
        cmd = [sys.executable, str(GENERATOR), spec.stem]
        cmd.append("--dry-run" if args.dry_run else "--force")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            failures.append(spec.stem)
            print(f"[FAIL] {spec.stem}: {result.stderr.strip()}")
        else:
            print(result.stdout.strip())

    print("")
    print(f"{len(specs) - len(failures)}/{len(specs)} event page(s) "
          f"{'checked' if args.dry_run else 'regenerated'}.")
    if failures:
        print(f"[ERROR] {len(failures)} spec(s) failed: {', '.join(failures)}")
        return 1
    if not args.dry_run:
        print("Review the diff before committing — dates should roll forward and "
              "nothing else should change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
