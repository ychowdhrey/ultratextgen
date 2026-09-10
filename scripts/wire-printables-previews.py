#!/usr/bin/env python3
"""
wire-printables-previews.py — insert each printables page's sheet preview <img>.

Companion to scripts/generate-printables-previews.py, which renders the PNGs;
this script puts ONE indexable image on each page, immediately after the hero
<section> (before the decorative, aria-hidden brand banner), as

    <figure class="guide-hero-figure pt-sheet-preview" style="max-width:560px;">
      <img src="/assets/printables-previews/<slug>.png" width="1200" height="900"
           alt="<descriptive alt>" loading="lazy">
    </figure>

`guide-hero-figure` is the site's existing visible-figure class (the one
guide/ pages use for a hero with a real alt), so no CSS is added; the
max-width cap follows the same page family's own `hero-inner` inline cap and
keeps a 4:3 sheet from pushing the tool below the fold. The alt is the same
text generate-printables-previews.py reports, imported from that module rather
than copied, so the image and its description have one owner. Because the
figure is NOT aria-hidden and the alt is non-empty, scripts/update-sitemap.js
declares the image (with the alt as <image:title>) on the next sitemap run.

Idempotent: an existing preview figure is replaced in place, so re-running
after an alt change updates the page. A page whose PNG is missing on disk is
refused rather than wired to a 404 — the same rule
check-new-page-image-assets.py enforces for hero art.

Usage
-----
    python3 scripts/wire-printables-previews.py            # report only
    python3 scripts/wire-printables-previews.py --write
    python3 scripts/wire-printables-previews.py --write --only printables-block-letters
"""
from __future__ import annotations

import argparse
import importlib.util
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


GEN = _load(os.path.join(HERE, "generate-printables-previews.py"), "printables_previews")

HERO_RE = re.compile(r'(<section class="hero">[\s\S]*?</section>\n)')
EXISTING_RE = re.compile(r'<figure class="guide-hero-figure pt-sheet-preview"[^>]*>[\s\S]*?</figure>\n')

# P1 protect (lab review 2026-09-10, owner: "Okay for now"): block-letters is
# 21% of site revenue on one URL and its first screen is frozen. Additive work
# there goes below the fold, so on this page the figure anchors after the
# second tool section (the name/word generator) instead of after the hero.
# Anything else about the page (title, H1, canonical, hreflang, ad config,
# copy) is untouched by this script by construction.
BELOW_FOLD = {
    "printables/block-letters/index.html": re.compile(r'(<section class="bubble-alphabet"[\s\S]*?</section>\n)'),
}


def figure_html(page):
    return (
        '<figure class="guide-hero-figure pt-sheet-preview">\n'
        f'  <img src="{GEN.OUT_URL}/{page["slug"]}.png" width="{GEN.W}" height="{GEN.H}"\n'
        f'       alt="{GEN.esc(GEN.alt_for(page))}" loading="lazy">\n'
        '</figure>\n'
    )


def wire(page, write):
    path = os.path.join(REPO, page["rel"])
    with open(path, encoding="utf-8") as fh:
        html = fh.read()
    fig = figure_html(page)
    had = bool(EXISTING_RE.search(html))
    # Strip any existing figure first, then re-insert at the page's anchor, so
    # a change of anchor (or of the figure markup) moves it rather than
    # leaving a stale copy in place.
    stripped = EXISTING_RE.sub("", html, count=1)
    anchor = BELOW_FOLD.get(page["rel"].replace(os.sep, "/"), HERO_RE)
    m = anchor.search(stripped)
    if not m:
        return "no-hero"
    new = stripped[: m.end()] + fig + stripped[m.end():]
    state = "current" if new == html else ("updated" if had else "inserted")
    if state != "current" and write:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return state


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="edit pages in place (default: report only)")
    ap.add_argument("--only", action="append", default=[], metavar="PREFIX", help="slug prefix filter (repeatable)")
    a = ap.parse_args(argv)
    pages = GEN.discover_pages()
    if a.only:
        pages = [p for p in pages if any(p["slug"].startswith(x) for x in a.only)]
    missing = [p for p in pages if not os.path.exists(os.path.join(GEN.OUT_DIR, p["slug"] + ".png"))]
    if missing:
        for p in missing:
            print(f"ERROR no preview on disk for {p['rel']} ({GEN.OUT_URL}/{p['slug']}.png)")
        print("Run scripts/generate-printables-previews.py first; a page is never wired to a 404.")
        return 1
    counts = {}
    for p in pages:
        state = wire(p, a.write)
        counts[state] = counts.get(state, 0) + 1
        if state == "no-hero":
            print(f"ERROR {p['rel']}: no <section class=\"hero\"> to anchor on")
    print(", ".join(f"{v} {k}" for k, v in sorted(counts.items())) + ("" if a.write else "  (report only; pass --write)"))
    return 1 if counts.get("no-hero") else 0


if __name__ == "__main__":
    sys.exit(main())
