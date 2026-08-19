#!/usr/bin/env python3
"""
Specimen art — a picture of what a page actually offers, for Google Images.

WHY THIS EXISTS, and why it is not another brand card.

Every page already carries two generated images (assets/hero/<slug>.svg,
assets/og/<slug>.png). Both are *labels for the page*: the page title set on
the brand skin. Google Images indexes the OG card and, as of the 3-month
export pulled 2026-08-12, ranks it at an average position of 38 across 100,697
impressions for 56 clicks.

That export's own position/CTR curve says the constraint is position, not
click-through: position 1-10 converts at 1.163% against 0.048% at 30-50, and
only 0.1% of impressions sit in the top band. Nothing was under-converting for
where it ranked. Meanwhile the queries drawing those impressions are things
like `화살표`, `kaomoji`, `simbol aesthetic`, `font aesthetic` — people who
opened Google Images wanting to SEE the symbols. A title on a gradient is
correctly ranked at 38 for those.

So this renders the page's own copy tiles at thumbnail-legible size: the thing
being searched for, not a label naming it. Same brand skin, same font
resolver, same tile source as the OG motifs (see motif_from_page) — the only
new idea is the layout and the intent.

Deliberately NOT hooked into generate-site-art.py's own run. Specimens are a
scoped, measured probe over ~15 evidence-selected pages, not a site-wide
asset every page gets by default; that is the whole point of the experiment.

Output: assets/specimen/<slug>.png, 64-colour palette PNG (~30-60 KB). Palette
PNG rather than WebP on purpose — measured on this content palette PNG came in
at 27.6 KB against WebP's 44.1 KB, because flat background plus hard glyph
edges is the case PNG wins and the case lossy WebP puts artefacts exactly on
the letterforms that are the point.

Run:  python3 scripts/generate-specimen-art.py --page id/library/simbol-love
      python3 scripts/generate-specimen-art.py --probe-set      # the 15 above
      python3 scripts/generate-specimen-art.py --probe-set --dry-run
"""
import argparse
import importlib.util
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "specimen")

# The probe set, selected from the 2026-08-12 GSC Image export (last 3 months)
# by image impressions, restricted to pages whose tiles make a specimen
# derivable from their own content. Combined: 19,291 impressions, 19.2% of all
# image impressions on the site. Kept as data rather than inferred so the
# 45-day readout measures the set that was actually chosen.
PROBE_SET = [
    "id/library/simbol-love",          # 2,835 impr · pos 39.2
    "library/roblox-symbols",          # 2,383 · 43.9
    "library/text-faces-kaomoji",      # 1,880 · 55.8
    "ko/library/hwasalpyo-giho",       # 1,794 · 52.8
    "id/library/simbol-bintang",       # 1,786 · 35.2
    "pt/library/simbolos",             # 1,400 · 31.2
    "library/emoji-combos",            # 1,281 · 51.9
    "id/library/simbol-aesthetic",     # 1,269 · 33.2
    "library/aesthetic-symbols",       # 1,103 · 48.8
    "library/discord-symbols",         #   834 · 41.4
    "tr/library/semboller",            #   702 · 29.7
    "library/ml-name-symbols",         #   544 · 33.2
    "fr/library/symboles",             #   544 · 26.2
    "ko/library/gamseong-giho",        #   468 · 44.5
    "id/symbol/simbol-kutip",          #   468 · 32.2
]

W = 1200
PAD_X = 60
HEAD = 150


def grid_shape(art, tiles):
    """Columns and row height for this tile set.

    Six columns suits single glyphs. Runs (kaomoji, framed samples) are several
    times wider, and at six columns they are shrunk until they stop being
    legible at thumbnail size — which is the one thing a specimen must not do.
    library/text-faces-kaomoji is the case: every tile is a run."""
    runs = sum(1 for g in tiles if art._is_run(g))
    if runs * 2 >= len(tiles):
        return 3, 150
    return 6, 176


def _load_art():
    """Import generate-site-art as a module for its brand skin, font resolver
    and tile reader. CLAUDE.md requires the skin come from that single source
    rather than being re-declared here."""
    spec = importlib.util.spec_from_file_location(
        "site_art", os.path.join(HERE, "generate-site-art.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def page_h1(path):
    html = open(path, encoding="utf-8", errors="ignore").read()
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    if not m:
        return None
    text = re.sub(r"<[^>]+>", "", m.group(1))
    return re.sub(r"\s+", " ", text).strip()


def slug_for(rel):
    return rel.strip("/").replace("/", "-")


def pick_tiles(art, slug, limit):
    """The page's own copy tiles, single glyphs first, de-duplicated.

    Runs (kaomoji, framed samples) are kept only when the page is mostly runs —
    library/text-faces-kaomoji is entirely runs and a grid of them is exactly
    right, while a symbol page's occasional run would break an otherwise even
    grid. _drawable() drops anything no installed font covers, because
    spanned() deletes uncovered characters silently and an undrawable tile
    would render as an empty cell rather than as tofu."""
    tiles = [g for g in art.page_tiles(slug) if art._drawable(g)]
    singles, runs = [], []
    for g in tiles:
        (runs if art._is_run(g) else singles).append(g)
    chosen = singles if len(singles) >= limit // 2 else (singles + runs)
    seen, out = set(), []
    for g in chosen:
        if g not in seen:
            seen.add(g)
            out.append(g)
    return out[:limit]


def specimen_svg(art, slug, title, tiles, native=None):
    cols, CELL = grid_shape(art, tiles)
    rows = (len(tiles) + cols - 1) // cols
    height = HEAD + rows * CELL + 46
    p = "s" + slug.replace("-", "")[:8]
    cw = (W - PAD_X * 2) / cols

    cells = []
    for i, g in enumerate(tiles):
        cx = PAD_X + cw * (i % cols) + cw / 2
        cy = HEAD + CELL * (i // cols) + CELL / 2
        # _units() is the same width model the OG motifs size against, so a
        # wide run and a narrow glyph both land inside their cell. Runs get a
        # wider margin: _units() under-estimates long ASCII-art kaomoji, and at
        # the tighter margin the widest of them clipped past the canvas edge.
        margin = 64 if art._is_run(g) else 26
        size = min(74.0, (cw - margin) / art._units(g))
        cells.append(
            f'<rect x="{cx - cw/2 + 8:.0f}" y="{cy - CELL/2 + 8:.0f}" '
            f'width="{cw - 16:.0f}" height="{CELL - 16:.0f}" rx="18" '
            f'fill="#fff" stroke="{art.PANEL2}" stroke-width="2"/>'
            f'<text x="{cx:.0f}" y="{cy + size * 0.35:.0f}" font-family="{art.SYM}" '
            f'font-size="{size:.1f}" fill="{art.INK}" text-anchor="middle">'
            f'{art.spanned(g, None, art.SYM_PRIMARY, art._DEJAVU_SANS)}</text>')

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}"
     width="{W}" height="{height}">
  {art.defs(p)}
  <rect width="{W}" height="{height}" fill="{art.PANEL}"/>
  <rect width="{W}" height="{height}" fill="url(#dots{p})"/>
  <rect x="0" y="0" width="14" height="{height}" fill="url(#gv{p})"/>
  <text x="{PAD_X}" y="66" font-family="{art.SANS}" font-size="21" font-weight="700"
        letter-spacing="3" fill="{art.PURPLE}">ULTRATEXTGEN</text>
  <text x="{PAD_X}" y="116" font-family="{art.SANS}" font-size="42" font-weight="700"
        fill="{art.INK}">{art.spanned(title, native)}</text>
  {"".join(cells)}
</svg>"""


FIGURE_RE = re.compile(r"\n<figure class=\"specimen-figure\".*?</figure>\n", re.S)


def wire(path, slug, title, tiles, dims):
    """Insert (or refresh) the page's specimen figure just above the footer.

    Placement and attributes are deliberately the opposite of the hero figure
    in wire-site-art.py, and each difference is load-bearing:

      * `loading="lazy"` and NO `fetchpriority` — the hero carries
        fetchpriority="high" on 2,097 pages; a second high-priority image
        would compete with the real LCP element. Below the fold and lazy, this
        costs nothing on first paint.
      * real `alt`, and no `aria-hidden` — the hero is decorative (it restates
        the H1, so an empty alt is the WCAG-correct call and descriptive alt
        would make a screen reader announce the title twice). This one carries
        information the surrounding prose does not, so it needs describing.
      * width/height stamped from the actual PNG so it cannot shift layout.

    No <h2> and no new links, so the page's translation-parity fingerprint
    (links + h2/FAQ/tile counts) is unchanged and the parity gate does not
    fire on a cluster this probe only touches one member of.

    alt text is the page's own <h1> plus the tile count — the H1 is already in
    the page's own language, so nothing here authors new localized copy. A
    localized caption would be genuinely better and is a deliberate follow-up:
    it needs the Local Language Intelligence Library check that CLAUDE.md
    requires before writing localized copy (see scripts/plan-library-locale-batch.py's
    native_phrases() for the reference implementation -- reads the private
    ychowdhrey/ultratextgen-lab- repo's canonical CSV directly, not a local
    file in this repo), which is not this change."""
    html = open(path, encoding="utf-8").read()
    w, h = dims
    # The H1 alone, not H1 + a generated English suffix: it names exactly what
    # the grid shows and is already in the page's language.
    alt = title.replace('"', "&quot;")
    fig = (f'\n<figure class="specimen-figure">\n'
           f'  <img src="/assets/specimen/{slug}.png" width="{w}" height="{h}"\n'
           f'       loading="lazy" decoding="async" alt="{alt}">\n'
           f'</figure>\n')
    html = FIGURE_RE.sub("\n", html)
    anchor = '<footer class="footer">'
    i = html.find(anchor)
    if i < 0:
        return False
    j = html.rfind("<!-- FOOTER -->", 0, i)
    if j >= 0:
        i = j
    html = html[:i] + fig.lstrip("\n") + "\n" + html[i:]
    open(path, "w", encoding="utf-8").write(html)
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--page", action="append", default=[],
                    help="repo-relative page dir, e.g. library/roblox-symbols")
    ap.add_argument("--probe-set", action="store_true",
                    help="render the 15 GSC-selected probe pages")
    ap.add_argument("--max-tiles", type=int, default=30)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true",
                    help="re-render even when the PNG already exists")
    ap.add_argument("--wire", action="store_true",
                    help="also insert the <figure> into each page (idempotent)")
    args = ap.parse_args()

    targets = list(args.page) + (PROBE_SET if args.probe_set else [])
    if not targets:
        ap.error("nothing to do: pass --page <dir> or --probe-set")

    art = _load_art()
    from PIL import Image
    import cairosvg
    os.makedirs(OUT, exist_ok=True)

    wrote = skipped = wired = 0
    for rel in targets:
        rel = rel.strip("/")
        path = os.path.join(ROOT, rel, "index.html")
        if not os.path.exists(path):
            print(f"  MISSING PAGE  {rel}", file=sys.stderr)
            continue
        slug = slug_for(rel)
        dest = os.path.join(OUT, slug + ".png")
        title = page_h1(path)
        if os.path.exists(dest) and not args.force:
            skipped += 1
            if args.wire and title:
                # Wiring is independent of rendering: a re-run that skips an
                # existing PNG must still be able to repair or refresh the
                # figure on the page.
                with Image.open(dest) as im:
                    dims = im.size
                if wire(path, slug, title, pick_tiles(art, slug, args.max_tiles), dims):
                    wired += 1
            continue
        if not title:
            print(f"  NO H1         {rel}", file=sys.stderr)
            continue
        tiles = pick_tiles(art, slug, args.max_tiles)
        if len(tiles) < 6:
            print(f"  TOO FEW TILES {rel} ({len(tiles)})", file=sys.stderr)
            continue
        svg = specimen_svg(art, slug, title, tiles, art._native_for_slug(slug))
        if args.dry_run:
            print(f"  would write   assets/specimen/{slug}.png "
                  f"({len(tiles)} tiles)")
            continue
        png = cairosvg.svg2png(bytestring=svg.encode())
        img = Image.open(__import__("io").BytesIO(png)).convert("RGB")
        img.quantize(colors=64, method=2).save(dest, optimize=True)
        print(f"  {os.path.getsize(dest)/1024:6.1f} KB  {slug}  "
              f"({len(tiles)} tiles)")
        wrote += 1
        if args.wire and wire(path, slug, title, tiles, img.size):
            wired += 1

    if skipped:
        print(f"{skipped} already present — skipped (use --force to re-render).")
    if not args.dry_run:
        print(f"wrote {wrote} specimen PNG(s), wired {wired} page(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
