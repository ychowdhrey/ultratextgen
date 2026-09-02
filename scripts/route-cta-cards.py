#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
route-cta-cards.py

Applies scripts/lib/cta_routing.py to live pages: where a page's CTA card still
points at the generator but the site has a tool that does the reader's actual
next job, the card is rewritten to send them there.

This is a site-wide in-place pass, the same shape as
`scripts/inject-funding-choices-tag.js` and `scripts/build-static-footer.js`,
and for the same reason: `generate_library_page_from_spec.py` cannot be run over
the tree (its own parity guard refuses, because a regeneration would delete
hreflang alternates, social image tags and the static footer from every page it
touches). Both read the SAME routing module, so a page repaired here and a page
regenerated later cannot disagree about its card.

WHAT IT WILL AND WILL NOT TOUCH
-------------------------------
It rewrites a card only when ALL of these hold:

  1. the page has exactly one `.cta-card` with an `h3`, a `p` and a `.cta-btn`;
  2. that button currently points at a bare site or locale homepage, i.e. the
     card is still on the shared default (a card someone already pointed
     somewhere specific is left alone, always);
  3. `cta_routing.route()` returns a destination for the page's path.

Everything else is untouched. That is why a run reports a large "skipped" count:
2,285 locale pages have no locale-native destination to route to, and their
locale homepage already is that locale's generator.

IDEMPOTENT: a second run finds nothing, because condition 2 no longer holds.

USAGE
  python3 scripts/route-cta-cards.py                 # report only (default)
  python3 scripts/route-cta-cards.py --write
  python3 scripts/route-cta-cards.py --write --limit 5
  python3 scripts/route-cta-cards.py --files a/index.html b/index.html

Exit: 0 always in report mode; 0 after a successful write; 1 on a malformed card
it declined to touch.
"""

import argparse
import glob
import html as htmllib
import os
import re
import sys
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "scripts"))
from lib.cta_routing import DESTINATIONS, route, is_homepage_href  # noqa: E402

# One card, captured in three pieces so each can be replaced without touching
# the surrounding whitespace or any attribute the template carries.
CARD_RE = re.compile(
    r'(?P<open><div class="cta-card">\s*)'
    r'<h3>(?P<h3>.*?)</h3>(?P<gap1>\s*)'
    r'<p>(?P<p>.*?)</p>(?P<gap2>\s*)'
    r'<a href="(?P<href>[^"]*)"(?P<attrs>[^>]*class="[^"]*cta-btn[^"]*"[^>]*)>(?P<label>.*?)</a>',
    re.S,
)


def esc(text):
    return htmllib.escape(text, quote=False)


def esc_attr(text):
    return htmllib.escape(text, quote=True)


def rewrite(page_html, dest):
    """Return the page with its CTA card re-routed, or None if nothing changed."""
    m = CARD_RE.search(page_html)
    if not m:
        return None
    if not is_homepage_href(m.group("href")):
        return None
    new_card = (
        f'{m.group("open")}<h3>{esc(dest["h3"])}</h3>{m.group("gap1")}'
        f'<p>{esc(dest["cta"])}</p>{m.group("gap2")}'
        f'<a href="{esc_attr(dest["href"])}"{m.group("attrs")}>{esc(dest["button"])}</a>'
    )
    return page_html[: m.start()] + new_card + page_html[m.end():]


def candidates(files):
    if files:
        return [os.path.relpath(os.path.abspath(f), REPO).replace(os.sep, "/") for f in files]
    return sorted(
        os.path.relpath(p, REPO).replace(os.sep, "/")
        for p in glob.glob(os.path.join(REPO, "**", "index.html"), recursive=True)
    )


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true", help="apply the changes in place")
    ap.add_argument("--files", nargs="*", help="scope to these pages")
    ap.add_argument("--limit", type=int, default=0, help="stop after N rewrites")
    args = ap.parse_args(argv)

    changed, malformed = [], []
    skipped = Counter()
    by_dest = Counter()

    for rel in candidates(args.files):
        dest_key = route(rel)
        if not dest_key:
            skipped["no routing rule for this page"] += 1
            continue
        path = os.path.join(REPO, rel)
        try:
            page = open(path, encoding="utf-8").read()
        except OSError:
            skipped["unreadable"] += 1
            continue
        if "cta-card" not in page:
            skipped["no CTA card"] += 1
            continue
        m = CARD_RE.search(page)
        if not m:
            # A page with a card this pass cannot parse is reported, never
            # rewritten by a looser pattern. A CTA is a link; guessing at its
            # markup is how one gets silently broken.
            malformed.append(rel)
            continue
        if not is_homepage_href(m.group("href")):
            skipped["already routed somewhere specific"] += 1
            continue

        new_page = rewrite(page, DESTINATIONS[dest_key])
        if new_page is None or new_page == page:
            skipped["unchanged"] += 1
            continue
        changed.append((rel, dest_key))
        by_dest[dest_key] += 1
        if args.write:
            open(path, "w", encoding="utf-8").write(new_page)
        if args.limit and len(changed) >= args.limit:
            break

    verb = "Rewrote" if args.write else "Would rewrite"
    print("CTA card routing" + ("" if args.write else " (report only, pass --write to apply)"))
    print(f"  {verb.lower()}: {len(changed)} page(s)")
    for key, n in by_dest.most_common():
        print(f"    {n:>5} -> {DESTINATIONS[key]['href']}")
    print("\n  skipped:")
    for reason, n in skipped.most_common():
        print(f"    {n:>5}  {reason}")

    if malformed:
        print(f"\n  MALFORMED — {len(malformed)} page(s) carry a .cta-card this pass "
              "cannot parse and did not touch:")
        for rel in malformed[:10]:
            print(f"    · {rel}")
        if len(malformed) > 10:
            print(f"    … and {len(malformed) - 10} more")
        print("  Fix the markup, or extend CARD_RE deliberately. Do not loosen it "
              "to make these pass.")

    if changed and not args.write:
        print("\n  First few:")
        for rel, key in changed[:6]:
            print(f"    · {rel}  ->  {DESTINATIONS[key]['href']}")

    return 1 if malformed else 0


if __name__ == "__main__":
    raise SystemExit(main())
