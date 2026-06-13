#!/usr/bin/env python3
"""
Marks the per-page hero illustration as decorative for image SEO.

The hero SVGs (assets/hero/<slug>.svg) are abstract typographic banners that
restate the page title — they carry no unique content. Google Images was
indexing them alongside the real social card (assets/og/<slug>.png), splitting
image signals across two assets per page.

This pass makes the visible hero purely decorative so the Open Graph card stays
the single canonical image for Google Images and social sharing:

  <figure class="page-hero-figure" data-uthero>          ->  + aria-hidden="true"
    <img ... alt="Illustration representing ...">        ->  alt=""

Idempotent: a figure that already carries aria-hidden is left untouched.
Run:  python3 scripts/make-hero-decorative.py
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Match a hero figure that is NOT yet decorative (no aria-hidden right after
# the data-uthero marker), capturing its inner markup up to </figure>.
FIGURE = re.compile(
    r'(<figure class="page-hero-figure" data-uthero)(?!\s+aria-hidden)(>)(.*?)(</figure>)',
    re.S,
)
ALT = re.compile(r'\salt="[^"]*"')


def make_decorative(match):
    inner = ALT.sub(' alt=""', match.group(3), count=1)
    return f'{match.group(1)} aria-hidden="true"{match.group(2)}{inner}{match.group(4)}'


def main():
    os.chdir(ROOT)
    touched = skipped = 0
    for path in sorted(glob.glob("**/*.html", recursive=True)):
        html = open(path, encoding="utf-8").read()
        if 'class="page-hero-figure" data-uthero' not in html:
            continue
        new = FIGURE.sub(make_decorative, html)
        if new != html:
            open(path, "w", encoding="utf-8").write(new)
            touched += 1
        else:
            skipped += 1
    print(f"heroes made decorative: {touched}  already-decorative: {skipped}")


if __name__ == "__main__":
    main()
