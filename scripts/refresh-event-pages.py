#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""refresh-event-pages.py — regenerate every /events/ page from its spec.

Event pages are the one content type on this site that goes stale on a clock.
Each page bakes in the next several real dates for its event (see
scripts/lib/event_occurrence.py), and those arrays shorten by one entry every
year until they run out. This script re-runs the generator over every spec so
the dates roll forward.

Run it as part of the seasonal ops loop — the pre-season pass for each event,
and at minimum once a year.

Regeneration must be LOSSLESS, and keeping it that way needs active work.
The generator emits the OG art, hero figure, consent tag and per-event copy
itself rather than leaving them to post-processing passes — that was the
2026-07-31 fix. But the site keeps growing post-processing passes the
generator knows nothing about, and each new one silently re-breaks this.

**It broke again on 2026-09-01**, the first time this script ran in anger:
`build-static-footer.js` and `build-accent-notice.js` had shipped in the
meantime, so a plain regeneration stripped the crawlable static footer and the
accent-notice block from all 19 event pages — 329 deletions, and not one date
actually changed. Committing it would have shipped 19 pages with an empty
`<div class="footer-inner">`, the exact defect `check:static-footer` exists to
catch.

So this script now re-applies the known post-processing passes itself, and
then VERIFIES rather than assuming: it re-runs each pass in check mode and
refuses to report success if any page still differs. When the next pass is
added, add it to POST_PASSES here — and if you are reading this because
something was stripped anyway, that is the signal that a pass exists which
this list does not know about.

Usage
-----
    npm run refresh:events            # regenerate all specs, then re-apply passes
    python3 scripts/refresh-event-pages.py --dry-run
    python3 scripts/refresh-event-pages.py --only halloween diwali
    python3 scripts/refresh-event-pages.py --no-post   # generator only (debugging)
"""

import argparse
import pathlib
import subprocess
import sys

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
SPEC_DIR = REPO / "data" / "event_page_specs"
GENERATOR = SCRIPT_DIR / "generate_event_page_from_spec.py"

# Post-processing passes the generator does not itself emit. Each entry is
# (label, write-command, check-command). The check command must exit non-zero
# — or report outstanding work — when a page is still missing that pass's
# output, which is what lets the verification step below be meaningful.
#
# Add a pass here the moment one is added to the site, or the next refresh
# strips it. See this module's docstring for the 2026-09-01 incident.
POST_PASSES = [
    ("static footer", ["node", "scripts/build-static-footer.js", "--write"],
     ["node", "scripts/build-static-footer.js"]),
    ("accent notice", ["node", "scripts/build-accent-notice.js", "--write"],
     ["node", "scripts/build-accent-notice.js"]),
]


def run_post_passes(verbose=True):
    """Re-apply each post-processing pass, then verify it actually took.

    Returns a list of failure strings; empty means every pass applied cleanly.
    """
    problems = []
    for label, write_cmd, check_cmd in POST_PASSES:
        wrote = subprocess.run(write_cmd, cwd=REPO, capture_output=True, text=True)
        if wrote.returncode != 0:
            problems.append(f"{label}: write pass failed — {wrote.stderr.strip()[:200]}")
            continue
        checked = subprocess.run(check_cmd, cwd=REPO, capture_output=True, text=True)
        if checked.returncode != 0:
            problems.append(
                f"{label}: still out of date after its own write pass — "
                f"{checked.stdout.strip().splitlines()[-1] if checked.stdout.strip() else 'no output'}"
            )
        elif verbose:
            print(f"  re-applied: {label}")
    return problems


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument("--only", nargs="*", metavar="SLUG", help="limit to these spec names")
    parser.add_argument("--no-post", action="store_true",
                        help="skip the post-processing passes (debugging the generator only)")
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

    if args.dry_run:
        return 0

    if args.no_post:
        print("[WARN] --no-post: post-processing passes skipped. The pages on disk "
              "are missing their static footer and accent notice — do NOT commit.")
        return 0

    print("")
    print("Re-applying post-processing passes the generator does not emit:")
    problems = run_post_passes()
    if problems:
        print("")
        for p in problems:
            print(f"[ERROR] {p}")
        print("[ERROR] Regeneration is NOT lossless — do not commit this diff. "
              "Fix the pass above, or add the missing one to POST_PASSES.")
        return 1

    print("")
    print("Review the diff before committing — dates should roll forward and "
          "nothing else should change. If the diff shows removals (a footer, a "
          "script tag, a block of markup), a post-processing pass exists that "
          "POST_PASSES does not know about: add it rather than committing the loss.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
