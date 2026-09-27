#!/usr/bin/env python3
"""Rewrite ONLY the kicker line of every committed locale OG card.

Why this exists
---------------
generate-site-art.py now draws the kicker ("ULTRATEXTGEN · LIBRARY") in the
card's own language (see localize_kicker() there). Every card generated from
now on gets it. The ~3,600 locale cards already committed do not, and
re-rendering them is not a safe way to get it: measured on 2026-09-27, a
forced re-render of every locale card through its own generator, with the
kicker untouched, changed 1,254 of 3,763 PNGs visually. Font builds differ,
page-derived motifs have moved on, several cards were hand-tuned after
generation, and some re-renders drew English motif text that the committed
card does not have. Sweeping all of that into a kicker change would ship
1,254 unreviewed redesigns.

So this rewrites the kicker band and nothing else:

  1. For each locale card, render the band (panel, dot grid and kicker, the
     rows above the title and left of the glow) once per candidate kicker,
     English and localized, and take the candidate whose pixels match the
     committed band. That is how the card's CURRENT kicker is read; nothing
     is inferred from a registry the card may have drifted from.
  2. If the match is an English sectioned kicker, paste the band rendered
     with localize_kicker()'s text over it. Every pixel outside the band is
     left exactly as committed, and --write verifies that before saving.
  3. A card whose band matches no candidate clearly is reported and left
     alone, never guessed.

Usage
-----
  python3 scripts/relocalize-og-kickers.py            # report only
  python3 scripts/relocalize-og-kickers.py --write
  python3 scripts/relocalize-og-kickers.py --only fr-  # slug prefix, repeatable
Exit 1 if any card is unmatched, so an unreadable band never passes silently.
"""
import argparse
import glob
import importlib.util
import io
import os
import sys

import cairosvg
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("gsa", os.path.join(HERE, "generate-site-art.py"))
gsa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gsa)

# The band: under the top edge, above the title block (whose first line's
# ascender never rises above y=106, see OG_TITLE_MAX_LINES), right of the
# 14px accent bar and left of the glow circle (which reaches x~702 here).
BAND = (14, 58, 700, 106)

ENGLISH = [gsa.K_LIB, gsa.K_CAT, gsa.K_USE, gsa.K_PLAT, gsa.K_ANS, gsa.K_SYM,
           gsa.K_PRINT, gsa.K_UPDATE, gsa.K_RESEARCH,
           # No constant draws these any more; older guide cards carry them.
           "ULTRATEXTGEN · GUIDE", "ULTRATEXTGEN · GUIDES", gsa.K_SITE]


def band_png(text_svg):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  {gsa.defs("kb")}
  <rect width="1200" height="630" fill="{gsa.PANEL}"/>
  <rect width="1200" height="630" fill="url(#dotskb)"/>
  {text_svg}
</svg>"""
    img = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=1200,
                                                  output_height=630))).convert("RGB")
    return img.crop(BAND)


def english_band(kicker):
    return band_png(f'<text x="80" y="96" font-family="{gsa.SANS}" font-size="22" font-weight="700"\n'
                    f'        letter-spacing="3" fill="{gsa.PURPLE}">{gsa.esc(kicker)}</text>')


def score(a, b):
    diff = ImageChops.difference(a, b).convert("L")
    hist = diff.histogram()
    return sum(i * n for i, n in enumerate(hist)) / (a.size[0] * a.size[1])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--only", action="append", default=[])
    a = ap.parse_args()

    eng = {k: english_band(k) for k in ENGLISH}
    local_cache = {}
    counts = {"rewritten": 0, "already-local": 0, "brand-only": 0, "no-local-word": 0}
    unmatched = []
    for path in sorted(glob.glob(os.path.join(gsa.OG, "*.png"))):
        slug = os.path.basename(path)[:-4]
        loc = gsa.locale_of_slug(slug)
        if not loc or (a.only and not any(slug.startswith(o) for o in a.only)):
            continue
        native = gsa._native_for_slug(slug)
        card = Image.open(path)
        band = card.convert("RGB").crop(BAND)
        # Candidates are keyed by the TEXT they draw, so an English kicker and
        # a localized one that read the same (the bare brand) are one
        # candidate, not two that tie.
        cands = dict(eng)
        for k in ENGLISH:
            key = (loc, k)
            if key not in local_cache:
                local_cache[key] = (gsa.localize_kicker(k, slug),
                                    band_png(gsa.kicker_svg(k, slug, native)))
            text, img = local_cache[key]
            if text not in cands:
                cands["local:" + text] = img
        ranked = sorted((score(band, img), name) for name, img in cands.items())
        (best, name), (second, _) = ranked[0], ranked[1]
        # A match is the right kicker, pixel for pixel. Measured 2026-09-27 over
        # all 3,785 committed locale cards: every best match scored exactly
        # 0.00; the closest runner-up of a different text scored 0.21 (German
        # "SYMBOLE" against the English "SYMBOLS", one letter apart). The
        # limits sit between the two.
        if best > 0.05 or second - best < 0.1:
            unmatched.append((slug, name, round(best, 2), round(second, 2)))
            continue
        if name.startswith("local:"):
            counts["already-local"] += 1
            continue
        if name == gsa.K_SITE:
            counts["brand-only"] += 1
            continue
        new_text, new_band = local_cache[(loc, name)]
        if new_text == name:
            counts["no-local-word"] += 1
            continue
        counts["rewritten"] += 1
        if a.write:
            mode = card.mode
            out = card.convert("RGBA") if mode not in ("RGB", "RGBA") else card.copy()
            out.paste(new_band.convert(out.mode), BAND[:2])
            # Nothing outside the band may move.
            mask_old = card.convert("RGB").copy()
            mask_new = out.convert("RGB").copy()
            blank = Image.new("RGB", (BAND[2] - BAND[0], BAND[3] - BAND[1]), "black")
            mask_old.paste(blank, BAND[:2])
            mask_new.paste(blank, BAND[:2])
            if ImageChops.difference(mask_old, mask_new).getbbox():
                sys.exit(f"refusing {slug}: pixels outside the kicker band changed")
            out.save(path, optimize=True)
    print(" · ".join(f"{k}: {v}" for k, v in counts.items()) + f" · unmatched: {len(unmatched)}")
    for row in unmatched[:40]:
        print("  UNMATCHED", *row)
    if not a.write and counts["rewritten"]:
        print("(report only: run with --write to rewrite the kicker band)")
    return 1 if unmatched else 0


if __name__ == "__main__":
    sys.exit(main())
