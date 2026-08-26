#!/usr/bin/env python3
"""
generate-style-og-cards.py — one OG card per registry style, for the
homepage middleware's ?style= link-preview swap (functions/_middleware.js).

Same brand skin, fonts and rasterizer as every other card on the site: this
imports scripts/generate-site-art.py (the single source of truth for the
skin) and lays its own 1200x630 card — style name as the title, the style's
own rendered sample as the hero line, resolved through the module's
spanned()/_resolve_family() fallback stack exactly like Arabic titles are.

Input:  data/og_style_registry.json  (node scripts/dump-style-registry.js)
Output: assets/og/style/<key>.png    (key = normalized slug)

Like generate-site-art.py, a run skips cards that already exist ("already
there means done"); --force re-renders. A rendered card that comes out
blank fails the run — spanned() DROPS characters no installed font covers
(see CLAUDE.md "Never select a tile no installed font can draw"), so a
missing font here would otherwise ship an empty card silently.
"""
import argparse
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")


def card_svg(key, name, sample):
    p = "sog" + key.replace("-", "")[:8]
    title = ART.esc(name)
    hero = ART.spanned(sample, None)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"
     width="1200" height="630">
  {ART.defs(p)}
  <rect width="1200" height="630" fill="{ART.PANEL}"/>
  <rect width="1200" height="630" fill="url(#dots{p})"/>
  <circle cx="1080" cy="120" r="380" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="14" height="630" fill="url(#gv{p})"/>
  <text x="80" y="110" font-family="{ART.SANS}" font-size="22" font-weight="700"
        letter-spacing="3" fill="{ART.PURPLE}">SHARED STYLE</text>
  <text x="80" y="200" font-family="{ART.SANS}" font-size="58" font-weight="700"
        fill="{ART.INK}">{title}</text>
  <text x="80" y="360" font-family="{ART.SYM}" font-size="72"
        fill="{ART.INK}">{hero}</text>
  <text x="80" y="560" font-family="{ART.SANS}" font-size="26"
        fill="{ART.SUB}">ultratextgen.com — tap to style your own text</text>
</svg>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-render existing cards")
    ap.add_argument("--only", action="append", default=[], help="normalized slug filter (prefix)")
    args = ap.parse_args()

    import cairosvg

    registry = json.load(open(os.path.join(ROOT, "data", "og_style_registry.json")))
    outdir = os.path.join(ROOT, "assets", "og", "style")
    os.makedirs(outdir, exist_ok=True)

    written = skipped = 0
    failures = []
    for entry in registry:
        key = entry["key"]
        if args.only and not any(key.startswith(o) for o in args.only):
            continue
        out = os.path.join(outdir, key + ".png")
        if os.path.exists(out) and not args.force:
            skipped += 1
            continue
        svg = card_svg(key, entry["name"], entry["sample"])
        cairosvg.svg2png(bytestring=svg.encode(), write_to=out,
                         output_width=1200, output_height=630)
        # Blank-card guard: an all-dropped sample rasterizes to a card whose
        # hero band is pure panel. Cheap proxy: file size — a real card with
        # dot grid + title + hero lands well above this floor.
        if os.path.getsize(out) < 15000:
            failures.append(key)
        written += 1

    print(f"style OG cards: {written} written, {skipped} already there")
    if failures:
        print("SUSPICIOUSLY SMALL (possible dropped glyphs):", ", ".join(failures))
        sys.exit(1)


if __name__ == "__main__":
    main()
