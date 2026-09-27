#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-library-link-mirror.py: per-PR gate. Measures the DELTA, not the state.

Fails when this branch leaves a locale library page NOT linking a partner it
now owes a link to, where that link was not already missing at the merge base.
The three ways a branch creates one, each of which has happened:

  - it translates a spoke into a locale whose hub already exists, and does not
    add the spoke to that hub (how ko/library/imotikon came to link 6 of 28);
  - it makes two EN library pages link each other, and does not mirror the new
    link into the locales that have both pages;
  - it removes a locale link a relation calls for.

Pre-existing gaps (436 on main when this was written, 2026-09-27) are reported
and never counted against a branch: a gate that is red on every PR is one
people learn to ignore. `npm run audit:library-link-mirror` lists them.

The definition of a relation and an obligation lives in
scripts/lib/library_link_mirror.py, shared with the audit and the repair.

Usage:
  npm run check:library-link-mirror
  python3 scripts/check-library-link-mirror.py --base origin/main

Reads the working tree, so uncommitted fixes count, and the merge base from git.

Exit 0 = no new gap, 1 = this branch introduced a gap, 2 = UNKNOWN: the base
could not be resolved or an input could not be read. Never read a 2 as clean.
"""

import argparse
import collections
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import library_link_mirror as mirror  # noqa: E402


def git(*args):
    return subprocess.run(["git", *args], cwd=mirror.REPO, capture_output=True, text=True, check=True).stdout.strip()


def resolve_base(base):
    try:
        git("rev-parse", "--verify", base)
        return base
    except subprocess.CalledProcessError:
        branch = base[len("origin/"):] if base.startswith("origin/") else base
        try:
            git("fetch", "--depth=200", "origin", branch)
            git("rev-parse", "--verify", f"origin/{branch}")
            return f"origin/{branch}"
        except subprocess.CalledProcessError as e:
            raise mirror.Unknown(f'could not resolve or fetch base ref "{base}": {e.stderr.strip()}')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="origin/main")
    args = parser.parse_args(argv)

    try:
        base = resolve_base(args.base)
        try:
            merge_base = git("merge-base", base, "HEAD")
        except subprocess.CalledProcessError as e:
            raise mirror.Unknown(f"no merge-base between {base} and HEAD (shallow clone?): {e.stderr.strip()}")
        head = mirror.Graph(mirror.WorkTree())
        before = mirror.Graph(mirror.GitTree(merge_base))
    except mirror.Unknown as e:
        print(f"UNKNOWN: {e}. Nothing was compared.")
        return 2

    now = set(head.missing())
    was = set(before.missing())
    introduced = sorted(now - was)
    repaired = was - now

    print("Library link mirror check")
    print(f"  base: {base} (merge-base {merge_base[:12]})")
    print(f"  missing links at merge base: {len(was)} · now: {len(now)} · "
          f"repaired by this branch: {len(repaired)} · introduced: {len(introduced)}")

    if not introduced:
        print(f"\nNo new gap. {len(now)} pre-existing gap(s) are reported by "
              "`npm run audit:library-link-mirror`, never counted here.")
        return 0

    print("\n✗ These locale pages now owe a link to a partner they do not link.")
    print("  Each pair links each other in English and both ends exist in the locale.\n")
    by_page = collections.defaultdict(list)
    for lang, a, b in introduced:
        by_page[(lang, a)].append(head.locale[(lang, b)]["url"])
    for (lang, a), targets in sorted(by_page.items()):
        print(f"  {head.locale[(lang, a)]['rel']}  (EN library/{a}/)")
        for url in targets:
            print(f"      missing -> {url}")
    langs = sorted({lang for lang, _ in by_page})
    pages = sorted({a for _, a in by_page})
    print("\nRepair (adds a Related card using each target page's own title and tagline):")
    print("  npm run fix:library-link-mirror -- " + " ".join(f"--lang {l}" for l in langs)
          + " " + " ".join(f"--page {p}" for p in pages) + " --write")
    print("If a page has no Related grid, link the partner by hand in the section it belongs to.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
