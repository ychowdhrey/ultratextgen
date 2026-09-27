#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-library-link-mirror.py: add the missing locale library links. Idempotent.

For each missing link (see scripts/lib/library_link_mirror.py), adds one
compare-card to the locale page's Related grid. The card's title and text are
the TARGET page's own <h1> and first hero-tagline sentence, with em dashes
re-jointed per data/em_dash_locale_policy.json, so nothing is translated here.
A page with no compare-grid is listed for a hand edit and left alone.

A bare run changes nothing. --write needs a scope (--lang and/or --page) or an
explicit --all: a whole-site run edits hundreds of pages across every locale
and should be a decision, not a default.

Usage:
  python3 scripts/fix-library-link-mirror.py --lang es --page text-faces-kaomoji          # dry run
  python3 scripts/fix-library-link-mirror.py --lang es --page text-faces-kaomoji --write
  npm run fix:library-link-mirror -- --lang ja --write

Exit 0 = done (or nothing to do), 1 = some links need a hand edit,
2 = UNKNOWN (an input could not be read) or a refused bare --write.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import library_link_mirror as mirror  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lang", action="append", default=[], help="locale code (repeatable)")
    parser.add_argument("--page", action="append", default=[],
                        help="EN slug of the page that owes the link, e.g. text-faces-kaomoji (repeatable)")
    parser.add_argument("--all", action="store_true", help="every locale and every page")
    parser.add_argument("--write", action="store_true", help="edit files; without it, only list")
    args = parser.parse_args(argv)

    if args.write and not (args.all or args.lang or args.page):
        print("Refusing a bare --write: pass --lang/--page, or --all to edit the whole site.")
        return 2

    try:
        graph = mirror.Graph(mirror.WorkTree())
    except mirror.Unknown as e:
        print(f"UNKNOWN: {e}. Nothing was changed.")
        return 2

    todo = [o for o in graph.missing()
            if (args.all or not args.lang or o[0] in args.lang)
            and (args.all or not args.page or o[1] in args.page)]
    if not todo:
        print("Nothing missing in scope.")
        return 0

    manual = 0
    for lang, a, b in todo:
        page = graph.locale[(lang, a)]
        target = graph.locale[(lang, b)]
        where = page["rel"].rsplit("/", 1)[0]
        if not args.write:
            print(f"[missing] {where} -> {target['url']}")
            continue
        title, desc = mirror.card_copy(graph, lang, b)
        if mirror.inject(mirror.REPO / page["rel"], target["url"], title, desc):
            print(f"[added]   {where} -> {target['url']}  ({title})")
        else:
            print(f"[manual]  {where} has no compare-grid; link {target['url']} by hand")
            manual += 1

    verb = "added" if args.write else "missing"
    print(f"\n{len(todo) - manual} link(s) {verb}" + (f", {manual} need a hand edit" if manual else "") + ".")
    if not args.write:
        print("Dry run. Re-run with --write to edit.")
    return 1 if manual else 0


if __name__ == "__main__":
    raise SystemExit(main())
