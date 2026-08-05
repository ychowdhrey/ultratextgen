#!/usr/bin/env python3
"""
Wires the generated per-page art (assets/hero/*.svg, assets/og/*.png) into the
HTML pages that were still using the generic /logo.png social card.

For every target page it:
  1. repoints og:image + twitter:image to /assets/og/<slug>.png
  2. repoints the JSON-LD article/page "image" to the same card
     (the Organization "logo" is left as /logo.png)
  3. inserts a decorative <figure class="page-hero-figure"> after the hero

Idempotent: a page already carrying the data-uthero marker is left untouched.
Run:  python3 scripts/wire-site-art.py                      # whole site
      python3 scripts/wire-site-art.py path/to/index.html   # scoped
      python3 scripts/wire-site-art.py --dry-run            # report only
"""
import argparse
import os
import re
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://ultratextgen.com"
LOGO = f"{BASE}/logo.png"


def slug_for(path):
    return os.path.dirname(path).replace(os.sep, "-")


def find_hero_close(html):
    """Return index just past the </section> that closes the hero section, or
    None. Counts nested <section> tags so widget sub-sections are handled."""
    m = re.search(r'<section[^>]*class="[^"]*\bhero\b[^"]*"', html)
    if not m:
        return None
    i = m.start()
    depth = 0
    for tag in re.finditer(r'<section\b|</section>', html[i:]):
        if tag.group() == '</section>':
            depth -= 1
            if depth == 0:
                return i + tag.end()
        else:
            depth += 1
    return None


def figure_block(slug):
    # The hero SVG is a decorative typographic banner that restates the page
    # title — it carries no unique content. It is marked decorative (empty alt
    # + aria-hidden="true") so the Open Graph card (assets/og/<slug>.png) stays
    # the single canonical image for Google Images and social sharing instead
    # of competing with the visible hero.
    return (
        f'\n<figure class="page-hero-figure" data-uthero aria-hidden="true">\n'
        f'  <img src="/assets/hero/{slug}.svg" width="1200" height="340"\n'
        f'       fetchpriority="high" alt="">\n'
        f'</figure>\n')


def main():
    ap = argparse.ArgumentParser(
        description="Wire generated hero/OG art into pages still using /logo.png.")
    ap.add_argument(
        "files", nargs="*",
        help="repo-relative index.html paths to process (default: every page). "
             "Scope a focused change to just the pages it touches.")
    ap.add_argument(
        "--dry-run", action="store_true",
        help="report what would change without writing anything.")
    args = ap.parse_args()

    og_dir = os.path.join(ROOT, "assets", "og")
    scanned = written = swapped = inserted = skipped = noart = 0
    no_anchor = []
    os.chdir(ROOT)

    if args.files:
        targets = []
        for f in args.files:
            rel = os.path.relpath(os.path.abspath(f), ROOT).replace(os.sep, "/")
            if not os.path.exists(rel):
                ap.error(f"no such file: {f}")
            targets.append(rel)
    else:
        targets = sorted(glob.glob("**/index.html", recursive=True))

    for path in targets:
        if path.startswith("guide" + os.sep):
            continue
        scanned += 1
        html = open(path, encoding="utf-8").read()
        original = html
        if LOGO not in html and "data-uthero" not in html:
            continue
        slug = slug_for(path)
        if not slug:
            continue  # root index.html, handled elsewhere
        if not os.path.exists(os.path.join(og_dir, slug + ".png")):
            noart += 1
            continue

        og_url = f"{BASE}/assets/og/{slug}.png"

        # 1+2. line-scoped image swaps (og:image / twitter:image / JSON-LD image)
        def swap_meta(m):
            return m.group(0).replace(LOGO, og_url)

        new = re.sub(r'<meta[^>]*(?:og:image|twitter:image)[^>]*>',
                     swap_meta, html)
        new = re.sub(r'"image"\s*:\s*"' + re.escape(LOGO) + r'"',
                     f'"image": "{og_url}"', new)
        if new != html:
            swapped += 1
        html = new

        # Strip any previously-wired figure so its placement is recomputed.
        # Keeps the script corrective when placement rules change.
        #
        # This strip and figure_block() must be exactly newline-symmetric or the
        # script is not idempotent. It used to consume up to two newlines and
        # emit one, while figure_block() re-added its own leading and trailing
        # newline — so every run leaked one blank line into every already-wired
        # page, and a single run reported 1,907 "insertions" that were really
        # 1,906 no-op rewrites plus whitespace churn. Strip exactly one newline
        # on each side; figure_block() puts exactly one back.
        had_figure = "data-uthero" in html
        html = re.sub(
            r'\n<figure class="page-hero-figure" data-uthero[^>]*>.*?</figure>\n',
            '', html, flags=re.S)

        # 3. insert hero figure (decorative — see figure_block)

        # Generator pages carry the live tool (textarea#mainInput) inside the
        # hero, so a figure placed *after* the hero lands below the whole tool.
        # For those, anchor the illustration *above* the hero so it reads as a
        # top-of-page banner. Pure content pages keep the figure under the hero.
        is_generator = bool(re.search(r'id="mainInput"', html))
        if is_generator:
            hm = re.search(
                r'[ \t]*(?:<!--[^>]*-->\s*)?<section[^>]*class="[^"]*\bhero\b[^"]*"',
                html)
            pos = hm.start() if hm else None
        else:
            pos = find_hero_close(html)
        if pos is None:
            mm = re.search(r'<main\b', html)
            pos = mm.start() if mm else None
        if pos is None:
            h1 = re.search(r'</h1>', html)  # thin stub pages
            pos = h1.end() if h1 else None
        if pos is None:
            no_anchor.append(slug)
        else:
            html = html[:pos] + figure_block(slug) + html[pos:]
            if had_figure:
                skipped += 1
            else:
                inserted += 1

        # Only touch the file when something actually changed. Writing
        # unconditionally rewrote every page on every run, which buried the
        # handful of real edits in ~1,900 no-op diffs and made the script
        # unusable inside a focused change.
        if html != original:
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(html)
            written += 1

    print(f"scanned: {scanned}  written: {written}  image swaps: {swapped}  "
          f"hero inserted: {inserted}  already-correct: {skipped}  no-art: {noart}")
    if no_anchor:
        print("NO HERO ANCHOR (og swapped, figure not inserted):")
        for s in no_anchor:
            print("  -", s)


if __name__ == "__main__":
    main()
