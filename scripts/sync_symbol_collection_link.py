#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_symbol_collection_link.py

Keeps the spoke -> collection line on every /symbol/ spoke, directly under the
first copy section. The line, its placement and how the collection is chosen
live in `scripts/lib/symbol_collection_link.py`; this is the pass that applies
them.

  EN      "Need more than this one? Browse the full set in <collection> ->",
          pointing at the first /library/ card the spoke already carries.
  locale  a link only, worded with the locale collection page's own <h1>,
          pointing at the locale translation of the EN parent's collection.
          No translation of that collection in the locale -> the locale's
          own library hub (/<lc>/library/), worded with the hub's own <h1>,
          so every spoke still offers a way to explore. A locale with no hub
          either (fi, ms) -> no line (any old one is removed); reported as
          skipped, not as a defect.

Locales come from `data/locale_qualification_tiers.json`, never a filesystem
glob (zh-tw is five characters).

Modes
-----
  --check (default)  report spokes whose line is missing or out of date.
                     Exit 0 when every spoke is current, 1 when any is stale,
                     2 (UNKNOWN, never 0) when a spoke cannot be answered: an EN
                     spoke with no collection card or no copy section, a locale
                     spoke with no EN parent, or no spokes found at all.
  --write            rewrite stale spokes in place. Idempotent.
  --no-locales       EN only.
"""

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
import symbol_collection_link as scl  # noqa: E402

REPO = SCRIPT_DIR.parent
EN_ALTERNATE_RE = re.compile(
    r'<link[^>]*\brel="alternate"[^>]*\bhreflang="en"[^>]*\bhref="https://ultratextgen\.com/([^"]+)"',
    re.IGNORECASE,
)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)


def read(path):
    return path.read_text(encoding="utf-8")


def en_parent(html, lane):
    m = EN_ALTERNATE_RE.search(html)
    if not m:
        return None
    mm = re.fullmatch(lane + r"/([a-z0-9-]+)/?", m.group(1))
    return mm.group(1) if mm else None


def locales():
    data = json.loads(read(REPO / "data" / "locale_qualification_tiers.json"))
    return [lc for lc in data["locales"] if lc != "en"]


def main(argv=None):
    ap = argparse.ArgumentParser(description="Sync the symbol spoke -> collection line.")
    ap.add_argument("--write", action="store_true", help="rewrite stale spokes")
    ap.add_argument("--no-locales", action="store_true", help="EN spokes only")
    args = ap.parse_args(argv)

    en_pages = sorted((REPO / "symbol").glob("*/index.html"))
    if not en_pages:
        print("UNKNOWN: no spokes found under symbol/", file=sys.stderr)
        return 2

    # (page, new_html, status) for every spoke, EN first.
    results = []
    en_collection = {}
    for page in en_pages:
        html = read(page)
        found = scl.find_collection(html)
        en_collection[page.parent.name] = found[0] if found else None
        new, status = scl.apply(html)
        results.append((page, html, new, status))

    if not args.no_locales:
        for lang in locales():
            # The locale's own translation of each EN collection, with its label.
            # Found by its hreflang="en" parent, wherever the locale page lives:
            # es/simbolos-de-corazon/ and vi/ki-tu-trai-tim/ translate
            # library/heart-symbols/ from the locale root, outside library/.
            # A library/ page wins over one elsewhere when both claim a parent.
            lib = {}
            pages = sorted((REPO / lang).glob("**/index.html"),
                           key=lambda p: (p.parts[len(REPO.parts) + 1] != "library", str(p)))
            for page in pages:
                if page.parts[len(REPO.parts) + 1] == "symbol":
                    continue
                html = read(page)
                parent = en_parent(html, "library")
                h1 = H1_RE.search(html)
                if parent and h1 and parent not in lib:
                    href = "/" + page.parent.relative_to(REPO).as_posix() + "/"
                    lib[parent] = (href, scl.locale_label(h1.group(1)))
            # Fallback when the locale has no translation of the collection:
            # its own library hub, never the English collection.
            hub = (None, None)
            hub_page = REPO / lang / "library" / "index.html"
            if hub_page.exists():
                h1 = H1_RE.search(read(hub_page))
                if h1:
                    hub = (f"/{lang}/library/", scl.locale_label(h1.group(1)))
            for page in sorted((REPO / lang / "symbol").glob("*/index.html")):
                html = read(page)
                parent = en_parent(html, "symbol")
                if parent is None or parent not in en_collection:
                    results.append((page, html, html, "no-en-parent"))
                    continue
                href, label = lib.get(en_collection[parent], hub)
                new, status = scl.apply_locale(html, lang, href, label)
                results.append((page, html, new, status))

    stale, unknown, skipped, current = [], [], 0, 0
    for page, html, new, status in results:
        rel = page.relative_to(REPO)
        if status in ("ok", "no-locale-collection"):
            if new != html:
                stale.append(rel)
                if args.write:
                    page.write_text(new, encoding="utf-8")
            elif status == "ok":
                current += 1
            else:
                skipped += 1
        else:
            unknown.append((rel, status))

    verb = "rewrote" if args.write else "stale"
    print(f"symbol collection link: {len(results)} spokes, {current} current, "
          f"{len(stale)} {verb}, {skipped} skipped (no collection and no library hub), "
          f"{len(unknown)} unknown")
    for rel in stale[:50]:
        print(f"  {verb}: {rel}")
    if len(stale) > 50:
        print(f"  … and {len(stale) - 50} more")
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
