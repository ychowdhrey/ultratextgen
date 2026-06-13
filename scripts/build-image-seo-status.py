#!/usr/bin/env python3
"""
Builds data/image_seo_status.csv — a per-page image-SEO inventory.

It scans every indexable HTML page, extracts the image-SEO state directly from
the markup (og:image, twitter:image, hero src, decorative flag, alt text), and
joins SEO demand from the SEMrush organic-positions export so high-volume pages
can be prioritised. Priority falls back to page type when no volume is known.

This is a reporting/auditing helper, not a build step. Re-run after content
changes to refresh the status file:
  python3 scripts/build-image-seo-status.py <semrush_positions.csv>
"""
import csv
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://ultratextgen.com"


def read(path):
    return open(path, encoding="utf-8").read()


def attr(html, pattern):
    m = re.search(pattern, html)
    return m.group(1) if m else ""


def page_type(url):
    p = url.replace(BASE, "").strip("/")
    if p == "":
        return "homepage"
    seg = p.split("/")
    if seg[0] in ("de", "es", "fr", "id", "it", "nl", "pl", "pt", "tr", "vi"):
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


# Priority by page type when no search volume is recorded.
TYPE_PRIORITY = {
    "homepage": "Highest",
    "platform": "Highest",
    "use case": "High",
    "symbol library": "Medium",
    "category": "Medium",
    "guide": "Medium",
    "answer": "Medium",
    "localized": "Medium",
    "legal/info": "Low",
}


def priority(ptype, volume):
    if volume >= 5000:
        return "Highest"
    if volume >= 500:
        return "High"
    if ptype in ("homepage", "platform"):
        return "Highest"
    return TYPE_PRIORITY.get(ptype, "Lower")


def load_semrush(path):
    """Return {url: (max_volume, top_keyword, primary_intent)}."""
    best = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            url = row.get("URL", "").strip().rstrip("/")
            if not url:
                continue
            try:
                vol = int(row.get("Search Volume", "0") or 0)
            except ValueError:
                vol = 0
            kw = row.get("Keyword", "")
            intent = row.get("Keyword Intents", "")
            if url not in best or vol > best[url][0]:
                best[url] = (vol, kw, intent)
    return best


def main():
    sem = load_semrush(sys.argv[1]) if len(sys.argv) > 1 else {}
    os.chdir(ROOT)
    rows = []
    for path in sorted(glob.glob("**/*.html", recursive=True)):
        if path.endswith(".test.html") or "/embed/" in path or path == "_root.html":
            continue
        html = read(path)
        if re.search(r'name="robots"[^>]*noindex', html):
            continue
        canonical = attr(html, r'rel="canonical"\s+href="([^"]+)"')
        if not canonical:
            continue
        url = canonical.rstrip("/")
        ptype = page_type(canonical)
        og = attr(html, r'property="og:image"\s+content="([^"]+)"')
        tw = attr(html, r'name="twitter:image"\s+content="([^"]+)"')
        hero_src = attr(html, r'class="page-hero-figure"[^>]*>\s*<img src="([^"]+)"')
        hero_present = "page-hero-figure" in html
        hero_decorative = bool(
            re.search(r'class="page-hero-figure"[^>]*aria-hidden="true"', html))
        hero_alt = ""
        if hero_present:
            m = re.search(r'class="page-hero-figure".*?<img[^>]*?\salt="([^"]*)"',
                          html, re.S)
            hero_alt = m.group(1) if m else ""
        vol, kw, intent = sem.get(url, (0, "", ""))
        prio = priority(ptype, vol)
        og_triple = "yes" if 'property="og:image:width"' in html else "no"
        rec = ("OG triple completed" if og_triple == "yes" else "OG present")
        rec += "; hero set decorative" if hero_decorative else ""
        remaining = ""
        if ptype == "localized":
            remaining = "Localized OG card with translated copy (see report)"
        elif og and og.endswith("/assets/og/fancy-text-generator-preview.png") \
                and ptype != "homepage":
            remaining = "Consider page-specific OG card"
        rows.append({
            "Page URL": canonical,
            "Page type": ptype,
            "Primary intent": kw or intent or ptype,
            "Priority": prio,
            "Search volume": vol if vol else "",
            "Has OG image": "yes" if og else "no",
            "OG image path": og.replace(BASE, ""),
            "Has Twitter image": "yes" if tw else "no",
            "Hero image path": hero_src,
            "Hero decorative": "yes" if hero_decorative else ("n/a" if not hero_present else "no"),
            "Hero alt text": hero_alt,
            "Fix applied": rec,
            "Remaining recommendation": remaining,
        })

    order = {"Highest": 0, "High": 1, "Medium": 2, "Lower": 3, "Low": 4}
    rows.sort(key=lambda r: (order.get(r["Priority"], 9),
                             -(r["Search volume"] or 0)))

    out = os.path.join(ROOT, "data", "image_seo_status.csv")
    cols = ["Page URL", "Page type", "Primary intent", "Priority",
            "Search volume", "Has OG image", "OG image path",
            "Has Twitter image", "Hero image path", "Hero decorative",
            "Hero alt text", "Fix applied", "Remaining recommendation"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {out}: {len(rows)} indexable pages")


if __name__ == "__main__":
    main()
