#!/usr/bin/env python3
"""
CI guard: every indexable page must have a real, page-specific social image and
(when eligible) a Pinterest pin. Fails the build when a new page ships before
its art has been generated and wired.

It re-uses the same scanning rules as scripts/build-image-seo-status.py and the
same eligibility rules as scripts/generate-pinterest.py, so the three stay in
sync. Pure standard library — no cairosvg / no pip install needed in CI.

For every indexable HTML page it checks:
  1. og:image is present, is NOT the generic /logo.png fallback, and the file
     it points at exists on disk
  2. twitter:image is present and its file exists on disk
  3. the hero figure image (if the page has one) exists on disk
  4. a per-page Pinterest pin (assets/pinterest/<slug>.png) exists, unless the
     page is excluded from Pinterest (legal/info or embed)

Exit status: 0 when every page passes, 1 when any check fails.
Run:  python3 scripts/check-image-assets.py
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://ultratextgen.com"
LOGO = f"{BASE}/logo.png"
LOCALES = ("de", "es", "fr", "id", "it", "nl", "pl", "pt", "tr", "vi")


def attr(html, pattern):
    m = re.search(pattern, html)
    return m.group(1) if m else ""


def page_type(url):
    """Mirror of build-image-seo-status.py:page_type."""
    p = url.replace(BASE, "").strip("/")
    if p == "":
        return "homepage"
    seg = p.split("/")
    if seg[0] in LOCALES:
        return "localized"
    if seg[0] == "library":
        return "symbol library"
    if seg[0] == "usecase":
        return "use case"
    if seg[0] == "category":
        return "category"
    if seg[0] == "guide":
        return "guide"
    if seg[0] == "answers":
        return "answer"
    if seg[0] in ("about", "contact", "privacy", "terms"):
        return "legal/info"
    if len(seg) == 1:
        return "platform"
    return seg[0]


def url_to_slug(url):
    """Mirror of generate-pinterest.py:url_to_slug."""
    path = url.replace(BASE, "").strip("/")
    return "homepage" if path == "" else path.replace("/", "-")


def pin_eligible(url, ptype):
    """Mirror of generate-pinterest.py:classify — hubs stay in, only
    legal/info and embed pages are excluded."""
    if ptype == "legal/info":
        return False
    if ptype == "embed" or "/embed/" in url:
        return False
    return True


def local_path(url_or_path):
    """Resolve an og/twitter/hero reference to an on-disk path under ROOT."""
    rel = url_or_path.replace(BASE, "").lstrip("/")
    return os.path.join(ROOT, rel)


def main():
    os.chdir(ROOT)
    failures = []      # (page, problem)
    checked = 0

    for path in sorted(glob.glob("**/*.html", recursive=True)):
        if path.endswith(".test.html") or "/embed/" in path or path == "_root.html":
            continue
        html = open(path, encoding="utf-8").read()
        if re.search(r'name="robots"[^>]*noindex', html):
            continue
        canonical = attr(html, r'rel="canonical"\s+href="([^"]+)"')
        if not canonical:
            continue
        url = canonical.rstrip("/")
        ptype = page_type(canonical)
        checked += 1

        # 1. og:image — present, not the generic fallback, file exists
        og = attr(html, r'property="og:image"\s+content="([^"]+)"')
        if not og:
            failures.append((path, "missing og:image meta tag"))
        elif og == LOGO:
            failures.append((path, "og:image still points at the generic /logo.png"))
        elif not os.path.exists(local_path(og)):
            failures.append((path, f"og:image file not found on disk: {og}"))

        # 2. twitter:image — present, file exists
        tw = attr(html, r'name="twitter:image"\s+content="([^"]+)"')
        if not tw:
            failures.append((path, "missing twitter:image meta tag"))
        elif tw != LOGO and not os.path.exists(local_path(tw)):
            failures.append((path, f"twitter:image file not found on disk: {tw}"))

        # 3. hero figure image (only if the page declares one)
        hero_src = attr(html, r'class="page-hero-figure"[^>]*>\s*<img src="([^"]+)"')
        if hero_src and not os.path.exists(local_path(hero_src)):
            failures.append((path, f"hero image file not found on disk: {hero_src}"))

        # 4. per-page Pinterest pin (when eligible)
        if pin_eligible(canonical, ptype):
            pin = os.path.join("assets", "pinterest", url_to_slug(url) + ".png")
            if not os.path.exists(pin):
                failures.append((path, f"missing Pinterest pin: {pin}"))

    print("Image-asset check")
    print(f"  Indexable pages checked : {checked}")
    print(f"  Problems found          : {len(failures)}")

    if failures:
        print("")
        print("FAILURES (regenerate art for these pages):")
        for page, problem in failures:
            print(f"  ✗ {page} — {problem}")
        print("")
        print("Fix: register the page(s) in scripts/generate-site-art.py, then run")
        print("  python3 scripts/generate-site-art.py")
        print("  python3 scripts/wire-site-art.py")
        print("  python3 scripts/build-image-seo-status.py")
        print("  python3 scripts/generate-pinterest.py")
        print("(see docs/image-seo-fixes.md and docs/pinterest-pin-generation.md)")
        sys.exit(1)

    print("")
    print("All indexable pages have a page-specific OG/Twitter card, hero art "
          "and Pinterest pin. ✓")
    sys.exit(0)


if __name__ == "__main__":
    main()
