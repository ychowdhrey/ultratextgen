#!/usr/bin/env python3
"""
Adds og:image:width / og:image:height / og:image:type meta tags after every
og:image tag that is missing them. Facebook, LinkedIn and other scrapers render
the large summary card far more reliably (and faster on first scrape) when the
image dimensions and type are declared up front.

Every social card on the site is a 1200x630 PNG (per-page cards, guide cards,
and the homepage /og.png), so the declared values are uniform.

Idempotent: a page that already declares og:image:width is left untouched.
Run:  python3 scripts/add-og-dimensions.py
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDTH, HEIGHT, MIME = "1200", "630", "image/png"

EXTRA = (
    '\n{indent}<meta property="og:image:width" content="' + WIDTH + '">'
    '\n{indent}<meta property="og:image:height" content="' + HEIGHT + '">'
    '\n{indent}<meta property="og:image:type" content="' + MIME + '">'
)


def main():
    os.chdir(ROOT)
    touched = skipped = 0
    for path in sorted(glob.glob("**/index.html", recursive=True)):
        html = open(path, encoding="utf-8").read()
        if "og:image:width" in html:
            skipped += 1
            continue
        m = re.search(r'(^([ \t]*)<meta[^>]*property="og:image"[^>]*>)',
                      html, re.M)
        if not m:
            continue
        extra = EXTRA.format(indent=m.group(2))
        html = html[:m.end()] + extra + html[m.end():]
        open(path, "w", encoding="utf-8").write(html)
        touched += 1
    print(f"og dimensions added: {touched}  already-present: {skipped}")


if __name__ == "__main__":
    main()
