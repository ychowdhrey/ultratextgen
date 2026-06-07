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
Run:  python3 scripts/wire-site-art.py
"""
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


def figure_block(slug, alt):
    return (
        f'\n<figure class="page-hero-figure" data-uthero>\n'
        f'  <img src="/assets/hero/{slug}.svg" width="1200" height="340"\n'
        f'       loading="lazy" alt="{alt}">\n'
        f'</figure>\n')


def main():
    hero_dir = os.path.join(ROOT, "assets", "hero")
    og_dir = os.path.join(ROOT, "assets", "og")
    swapped = inserted = skipped = noart = 0
    no_anchor = []
    os.chdir(ROOT)
    for path in sorted(glob.glob("**/index.html", recursive=True)):
        if path.startswith("guide" + os.sep):
            continue
        html = open(path, encoding="utf-8").read()
        if LOGO not in html and "data-uthero" not in html:
            continue
        slug = slug_for(path)
        if not slug:
            continue  # root index.html, handled elsewhere
        if not os.path.exists(os.path.join(og_dir, slug + ".png")):
            noart += 1
            continue

        if "data-uthero" in html:
            skipped += 1
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

        # 3. insert hero figure
        alt = "Decorative typographic illustration for this page."
        ti = re.search(r'<title>(.*?)</title>', html, re.S)
        if ti:
            t = re.sub(r'\s*[|—–-]\s*UltraTextGen.*$', '', ti.group(1)).strip()
            t = re.sub(r'<[^>]+>', '', t).replace("&amp;", "&")
            if t:
                alt = f"Illustration representing {t}."
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
            html = html[:pos] + figure_block(slug, alt) + html[pos:]
            inserted += 1

        open(path, "w", encoding="utf-8").write(html)

    print(f"image swaps: {swapped}  hero inserted: {inserted}  "
          f"already-done: {skipped}  no-art: {noart}")
    if no_anchor:
        print("NO HERO ANCHOR (og swapped, figure not inserted):")
        for s in no_anchor:
            print("  -", s)


if __name__ == "__main__":
    main()
