#!/usr/bin/env python3
"""
wire-printables-previews.py — insert each printables page's sheet preview <img>.

Companion to scripts/generate-printables-previews.py, which renders the PNGs;
this script puts ONE indexable image on each page, immediately after the page's
last tool section (see anchor_end), as

    <figure class="guide-hero-figure pt-sheet-preview">
      <img src="/assets/printables-previews/<slug>.png" width="1200" height="900"
           alt="<descriptive alt>" loading="lazy">
    </figure>

`guide-hero-figure` is the site's existing visible-figure class (the one
guide/ pages use for a hero with a real alt), so no CSS is added; the
560px cap lives in style.css (.pt-sheet-preview), and the figure sits below
the tool so a 4:3 sheet cannot push the tool down. The alt is the same
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

# Every printable's tool lives in one or more <section class="bubble-az"> /
# <section class="bubble-alphabet"> blocks, in order, before the editorial and
# related sections. The figure anchors after the LAST of them, so a visitor who
# arrived to print meets the printer first and the picture of it second.
#
# This started as a one-row BELOW_FOLD table added on 2026-09-10 for
# printables/block-letters (P1 protect, lab review 2026-09-10, owner "Okay for
# now": 21% of site revenue on one URL, first screen frozen). The reasoning was
# right and the scope was not -- the other 296 pages kept the figure between
# the hero and the tool, so /printables/alphabet-coloring-pages/letter-a/ put
# its generator at y=1091 on a 1000px viewport behind three renderings of the
# letter A, and roughly 1.5 screens down on a 390px phone (audit 2026-09-13,
# question c). Generalising the rule reproduces block-letters' anchor exactly
# -- bubble-alphabet is that page's last tool section -- so the protected page
# is unchanged by this and the table it needed is gone.
#
# Below-the-fold placement costs the image nothing: image indexing does not
# require an above-the-fold position, and the figure keeps its descriptive alt,
# its <image:title> in the sitemap and its own URL.
TOOL_SECTION_RE = re.compile(r'<section class="bubble-(?:az|alphabet)"[\s\S]*?</section>\n')


def anchor_end(html):
    """Index just past the page's last tool section, or past the hero when the
    page has no tool at all. None when neither is present."""
    last = None
    for m in TOOL_SECTION_RE.finditer(html):
        last = m
    if last:
        return last.end()
    m = HERO_RE.search(html)
    return m.end() if m else None


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
    pos = anchor_end(stripped)
    if pos is None:
        return "no-hero"
    new = stripped[:pos] + fig + stripped[pos:]
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
