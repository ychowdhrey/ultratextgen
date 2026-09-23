#!/usr/bin/env python3
"""
wire-printables-previews.py — insert each printables page's sheet preview <img>.

Companion to scripts/capture-printables-previews.js, which captures each PNG
as page 1 of the page's own PDF; this script puts ONE indexable image on each
page, as the first child of the live preview box the page's engine draws into
(see TARGET_IDS):

    <div ... id="pt-panel" data-sheet-preview="/assets/printables-previews/<slug>.png"><img
      class="pt-sheet-preview" src="/assets/printables-previews/<slug>.png"
      width="<png width>" height="<png height>" alt="<descriptive alt>" loading="lazy">...

The width and height are read from the PNG itself: a captured sheet is the
shape of the paper it prints on (Letter, or A4 on a locale page), not a fixed
1200x900 card, and a wrong ratio reserves the wrong box.

It is the box's no-JavaScript content. style.css hides it under
`@media (scripting: enabled)`, so a hidden lazy image is never fetched and a
visitor sees only the live preview, and the engine empties the box before
drawing anyway. A crawler that runs no JavaScript sees the real sheet where
the tool is. The page list, the slug and the alt text come from
scripts/lib/printables_previews.py, so the capture and the wiring share one
owner for each. Because the image is NOT aria-hidden and the alt
is non-empty, scripts/update-sitemap.js declares it (with the alt as
<image:title>) on the next sitemap run.

Idempotent: an existing preview image (or the standalone figure this script
wrote before 2026-09-23) is replaced, so re-running
after an alt change updates the page. A page whose PNG is missing on disk is
refused rather than wired to a 404 — the same rule
check-new-page-image-assets.py enforces for hero art.

Usage
-----
    python3 scripts/wire-printables-previews.py            # report only
    python3 scripts/wire-printables-previews.py --write
    python3 scripts/wire-printables-previews.py --write --only printables-block-letters
    python3 scripts/wire-printables-previews.py --list-json  # the capture script's page list
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


GEN = _load(os.path.join(HERE, "lib", "printables_previews.py"), "printables_previews")

# The standalone figure this script used to write (2026-09-10 to 2026-09-23).
# Still matched so a re-run moves it into the preview box instead of leaving a
# second copy behind.
LEGACY_FIGURE_RE = re.compile(r'<figure class="guide-hero-figure pt-sheet-preview"[^>]*>[\s\S]*?</figure>\n')
INLINE_IMG_RE = re.compile(r'<img class="pt-sheet-preview"[^>]*>')
DATA_ATTR_RE = re.compile(r' data-sheet-preview="[^"]*"')

# Where the image goes: INSIDE the live preview box the page's engine draws
# into, as that box's initial content (owner decision 2026-09-23).
#
# Every one of these boxes is emptied by its engine before it draws
# (`innerHTML = ""`), so a visitor with JavaScript sees one preview, the live
# one, in the place the tool shows it. A crawler that runs no JavaScript
# sees the real sheet in that same place, with its alt, and
# scripts/update-sitemap.js still declares it with an <image:title>, because
# it reads the static HTML. What this replaced: a standalone figure below the
# last tool section, with no heading or caption. On
# /printables/name-tracing/ it sat under "Practising single letters
# instead?", so it read as a picture of the letter-tracing link, and it
# repeated the "Emma" the live preview had just drawn 590px higher.
#
# The engine removes the <img>, so the URL is also written onto the box as
# data-sheet-preview. js/printables/printPrefs.js sheetPreviewUrl() reads it
# from there: the Pinterest button pins the sheet, never the OG card, and
# the attribute survives the engine clearing the box's children.
#
# Order is most specific first. A page that mounts a name box beside its
# letter panel shows the alphabet in its image, so the panel wins over
# the name box, and the name box is the target only on pages whose sheet
# IS the name (name tracing, the cursive phrase pages).
TARGET_IDS = (
    "pt-design-preview",   # coloring-page-maker, dot-to-dot-name
    "pt-gen-preview",      # handwriting generator, letter & sight-word tracing
    "pt-puzzle-preview",   # name-puzzle-maker
    "pt-banner-preview",   # banner-maker
    "mono-preview",        # monogram-maker (monogramEngine.js)
    "cs-chart",            # cross-stitch-letters (crossStitchEngine.js)
    "pt-alphabet-grid",    # spanish-alphabet-chart
    "pt-panel",            # letter spokes and alphabet landings
    "pt-name-preview",     # name tracing, "<phrase> in cursive"
)


def target_open_tag(html):
    """The (start, end) span of the opening <div> tag of the page's preview
    box, or None when the page has none of TARGET_IDS."""
    for tid in TARGET_IDS:
        m = re.search(r'<div\b[^>]*\bid="' + re.escape(tid) + r'"[^>]*>', html)
        if m:
            return m.start(), m.end()
    return None


def img_html(page):
    w, h = GEN.png_size(GEN.png_path(page))
    return (
        f'<img class="pt-sheet-preview" src="{GEN.OUT_URL}/{page["slug"]}.png" width="{w}" height="{h}"'
        f' alt="{GEN.esc(GEN.alt_for(page))}" loading="lazy">'
    )


def wire(page, write):
    path = os.path.join(REPO, page["rel"])
    with open(path, encoding="utf-8") as fh:
        html = fh.read()
    had = bool(LEGACY_FIGURE_RE.search(html) or INLINE_IMG_RE.search(html))
    # Strip every earlier form first, then re-insert, so a change of target or
    # of markup moves the image rather than leaving a stale copy in place.
    stripped = LEGACY_FIGURE_RE.sub("", html)
    stripped = INLINE_IMG_RE.sub("", stripped)
    stripped = DATA_ATTR_RE.sub("", stripped)
    span = target_open_tag(stripped)
    if span is None:
        return "no-target"
    start, end = span
    url = f'{GEN.OUT_URL}/{page["slug"]}.png'
    open_tag = stripped[start:end]
    open_tag = open_tag[:-1] + f' data-sheet-preview="{url}">'
    new = stripped[:start] + open_tag + img_html(page) + stripped[end:]
    state = "current" if new == html else ("updated" if had else "inserted")
    if state != "current" and write:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return state


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="edit pages in place (default: report only)")
    ap.add_argument("--only", action="append", default=[], metavar="PREFIX", help="slug prefix filter (repeatable)")
    ap.add_argument("--list-json", action="store_true",
                    help="print the pages that carry a preview, for capture-printables-previews.js, and exit")
    a = ap.parse_args(argv)
    pages = GEN.discover_pages()
    if a.list_json:
        # The set is the pages that already have a preview on disk: the
        # capture refreshes images, it does not decide which pages get one.
        import json
        print(json.dumps([{
            "slug": p["slug"], "url": GEN.page_url(p), "query": GEN.capture_query(p),
            "setup": GEN.capture_setup(p),
            "out": os.path.relpath(GEN.png_path(p), REPO),
        } for p in pages if os.path.exists(GEN.png_path(p))]))
        return 0
    if a.only:
        pages = [p for p in pages if any(p["slug"].startswith(x) for x in a.only)]
    missing = [p for p in pages if not os.path.exists(os.path.join(GEN.OUT_DIR, p["slug"] + ".png"))]
    if missing:
        for p in missing:
            print(f"ERROR no preview on disk for {p['rel']} ({GEN.OUT_URL}/{p['slug']}.png)")
        print("Run scripts/capture-printables-previews.js first; a page is never wired to a 404.")
        return 1
    counts = {}
    for p in pages:
        state = wire(p, a.write)
        counts[state] = counts.get(state, 0) + 1
        if state == "no-target":
            print(f"ERROR {p['rel']}: no preview box ({', '.join(TARGET_IDS)}) to put the image in")
    print(", ".join(f"{v} {k}" for k, v in sorted(counts.items())) + ("" if a.write else "  (report only; pass --write)"))
    return 1 if counts.get("no-target") else 0


if __name__ == "__main__":
    sys.exit(main())
