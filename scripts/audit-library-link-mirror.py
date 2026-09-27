#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit-library-link-mirror.py: the whole-site picture, informational.

Every EN library relation (two library pages that link each other) whose two
ends are both translated into a locale, where the locale page does not link its
partner. The definition lives in scripts/lib/library_link_mirror.py; the gate
that stops the backlog growing is scripts/check-library-link-mirror.py.

Usage:
  npm run audit:library-link-mirror
  python3 scripts/audit-library-link-mirror.py --lang es     # one locale, every page
  python3 scripts/audit-library-link-mirror.py --full        # every locale, every page

Exit 0 = measured (a backlog is reported, never failed), 2 = UNKNOWN: an input
could not be read, so nothing was measured. Never read a 2 as clean.
"""

import argparse
import collections
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import library_link_mirror as mirror  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lang", action="append", default=[], help="list every missing link for this locale")
    parser.add_argument("--full", action="store_true", help="list every missing link for every locale")
    args = parser.parse_args(argv)

    try:
        graph = mirror.Graph(mirror.WorkTree())
    except mirror.Unknown as e:
        print(f"UNKNOWN: {e}. Nothing was measured.")
        return 2

    obligations = graph.obligations()
    missing = graph.missing()
    by_lang = collections.Counter(o[0] for o in missing)
    owed = collections.Counter(o[0] for o in obligations)

    print("Library link mirror audit (whole site, informational)")
    print(f"  EN library relations (pairs that link each other): {len(graph.relations()) // 2}")
    print(f"  locale links those relations call for:              {len(obligations)}")
    print(f"  missing:                                            {len(missing)}")
    print()
    print("  locale  missing / owed")
    for lang in sorted(owed, key=lambda l: (-by_lang[l], l)):
        if by_lang[lang]:
            print(f"  {lang:6}  {by_lang[lang]:4} / {owed[lang]}")

    pages = collections.Counter((o[0], o[1]) for o in missing)
    print("\n  Pages missing the most links:")
    for (lang, a), n in pages.most_common(15):
        print(f"    {graph.locale[(lang, a)]['rel'].rsplit('/', 1)[0]:52} {n}")

    show = set(graph.locales) if args.full else set(args.lang)
    for lang in sorted(show):
        rows = [o for o in missing if o[0] == lang]
        if not rows:
            continue
        print(f"\n  [{lang}]")
        for _, a, b in rows:
            print(f"    {graph.locale[(lang, a)]['rel'].rsplit('/', 1)[0]} -> {graph.locale[(lang, b)]['url']}")

    if graph.ambiguous:
        print("\n  Left out: two pages in one locale claim the same EN parent, so neither is the sibling:")
        for (lang, en), rels in sorted(graph.ambiguous.items()):
            print(f"    [{lang}] library/{en}/: {', '.join(rels)}")

    print("\nRepair: npm run fix:library-link-mirror -- --lang <code> [--page <en-slug>] --write")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
