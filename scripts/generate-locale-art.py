#!/usr/bin/env python3
"""
Fills the localized-image gap flagged in prompt #470: many non-English pages
were still wired to the plain English hero/OG art (or, in a few cases, to
another locale's art — a copy/paste artifact). This script gives every such
page its own correctly-named asset pair, generated with the SAME brand skin
(`scripts/generate-site-art.py` — the single source of truth for motifs,
gradients and card layout), using:

  - the motif + kicker of its English equivalent page (found via the page's
    own <link rel="alternate" hreflang="en"> tag), so the illustration still
    matches the content type
  - the page's OWN already-translated <title>/og:title/og:description for
    the OG card copy (no re-translation attempted or needed)
  - a slug that matches the page's URL path, consistent with every other
    asset in assets/hero/ and assets/og/ (see wire-site-art.py's slug_for)

Run:
  python3 scripts/generate-locale-art.py --dry-run   # report only, no writes
  python3 scripts/generate-locale-art.py              # generate + rewire
  python3 scripts/generate-locale-art.py --only ar/symbol/   # scope to a path prefix

--only <prefix> restricts collect() to pages whose path starts with <prefix>
(repeatable). Without it, a run touches every not-yet-correctly-wired page
sitewide, not just the ones a given session just built — confirmed to have
swept 31 unrelated pre-existing pages into a single batch's diff before this
flag existed (confirmed by an internal analysis pass over the symbol/*
backlog). Always scope a translation batch with --only.
"""
import glob
import html as html_entities
import importlib.util
import os
import re
import sys
import textwrap
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

spec = importlib.util.spec_from_file_location(
    "generate_site_art", os.path.join(ROOT, "scripts", "generate-site-art.py"))
gsa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gsa)

LOCALES = ["ar", "bs", "cs", "de", "es", "fi", "fr", "hi", "hr", "hu", "id",
           "it", "ja", "ko", "ms", "nl", "no", "pl", "pt", "ro", "ru", "sk",
           "sr", "sv", "th", "tl", "tr", "vi", "zh-tw"]


# Content is matched with a backreference to its own opening quote (.*?\1 /
# \2), not a [^"']* class — apostrophes are common inside the attribute
# value itself (French elisions like "colle l'écriture"), and a quote-class
# match truncates there instead of at the real closing quote.
HREFLANG_EN = re.compile(
    r'<link\s+rel=(["\'])alternate\1\s+hreflang=(["\'])en\2\s+href=(["\'])(.*?)\3')
OG_IMAGE = re.compile(
    r'<meta[^>]*(?:og:image|twitter:image)[^>]*content=(["\'])(.*?)\1')
OG_TITLE = re.compile(
    r'<meta\s+property=(["\'])og:title\1\s+content=(["\'])(.*?)\2')
OG_DESC = re.compile(
    r'<meta\s+property=(["\'])og:description\1\s+content=(["\'])(.*?)\2')
TITLE_TAG = re.compile(r'<title>([^<]*)</title>')


def slug_for(path):
    return os.path.dirname(path).replace(os.sep, "-")


def english_slug_from_href(href):
    path = urllib.parse.urlparse(href).path.strip("/")
    if not path:
        return ""  # homepage
    return path.replace("/", "-")


def current_asset_basenames(html):
    """Return (og_basename, og_href, hero_basename) currently referenced.
    og_href is the raw content="..." value, not just its basename — needed
    to replace it correctly when it isn't under /assets/og/ at all (the
    generic fallback card lives at the site root, /logo.png, so a
    reconstructed "/assets/og/logo.png" search string would never match)."""
    og = None
    og_href = None
    m = OG_IMAGE.search(html)
    if m:
        og_href = m.group(2)
        og = os.path.splitext(os.path.basename(og_href))[0]
    hero = None
    m = re.search(r'/assets/hero/([a-zA-Z0-9\-]+)\.svg', html)
    if m:
        hero = m.group(1)
    return og, og_href, hero


TWITTER_CARD_SUMMARY = re.compile(r'<meta name="twitter:card" content="summary">')
TWITTER_CARD_LARGE = re.compile(r'<meta name="twitter:card" content="summary_large_image">')
TWITTER_DESC_TAG = re.compile(r'<meta name="twitter:description" content="[^"]*">')


def insert_og_meta(html, url):
    """Insert a fresh og:image/twitter:image pair into a page that has
    twitter:card/twitter:description but no image meta at all (the symbol/
    pillar never got OG-card support). Mirrors the exact tag order already
    used on every symbol/ page that DOES have one: og:image immediately
    before twitter:card, twitter:image immediately after twitter:description,
    twitter:card upgraded to the large-image variant."""
    html = TWITTER_CARD_SUMMARY.sub(
        '<meta name="twitter:card" content="summary_large_image">', html, count=1)
    html = TWITTER_CARD_LARGE.sub(
        lambda m: f'<meta property="og:image" content="{url}">\n' + m.group(0),
        html, count=1)
    html = TWITTER_DESC_TAG.sub(
        lambda m: m.group(0) + f'\n<meta name="twitter:image" content="{url}">',
        html, count=1)
    return html


LOCALIZED_HOME_FNAMES = {v[0] for v in gsa.LOCALIZED_HOME.values()} | {gsa.HOME_CARD}


def motif_kicker_for(english_slug, old_og_base, old_hero_base):
    """Resolve (motif, kicker, how). english_slug is "" for a genuine
    hreflang="en" link to the homepage, or None when no hreflang="en" link
    was found at all — those must NOT be treated alike, or every page
    lacking an English equivalent silently collapses to the brand motif
    instead of falling through to the old-ref lookup below. Preference order:
    1. the hreflang="en" equivalent page's own PAGES entry (best content match)
    2. the basename the page is CURRENTLY wired to, if it happens to be a
       real PAGES slug (whoever built the page picked a contextually
       relevant image to borrow, even if from the wrong locale/language)
    3. a homepage-style card filename -> the generic brand motif
    4. the generic brand motif, as a last resort
    """
    if english_slug == "":
        return gsa.m_brand, gsa.K_SITE, "home"
    entry = gsa.PAGES.get(english_slug) if english_slug else None
    if entry:
        _, _, motif, kicker = entry
        return motif, kicker, "matched"
    # A specific PAGES match (og OR hero) always beats a generic homepage-card
    # match — check both candidates against PAGES first so a page whose
    # og:image was wrongly borrowed from a homepage card, but whose hero was
    # already correctly self-referencing a real PAGES slug, isn't downgraded
    # to the generic brand icon just because og_base was checked first.
    for candidate in (old_og_base, old_hero_base):
        if candidate and candidate in gsa.PAGES:
            _, _, motif, kicker = gsa.PAGES[candidate]
            return motif, kicker, "matched-old-ref"
    for candidate in (old_og_base, old_hero_base):
        if candidate and candidate in LOCALIZED_HOME_FNAMES:
            return gsa.m_brand, gsa.K_SITE, "home-old-ref"
    return gsa.m_brand, gsa.K_SITE, "fallback"


def clean_title(html):
    # meta/title content is HTML-escaped in the source page (a literal '"'
    # or '&' is correctly written as &quot;/&amp;) - unescape here so the
    # SVG builder's own esc() doesn't double-escape it into a literal
    # "&amp;quot;" visible in the rendered PNG.
    m = OG_TITLE.search(html)
    if m and m.group(3).strip():
        t = html_entities.unescape(m.group(3).strip())
    else:
        m = TITLE_TAG.search(html)
        if not m:
            return ""
        t = re.split(r'\s*[|–—]\s*UltraTextGen', html_entities.unescape(m.group(1).strip()))[0].strip()
    # Full SEO titles run 50-90 chars; the card wants a short headline, so
    # prefer the clause before the first delimiter (mirrors how the
    # hand-authored PAGES entries keep titles to 2-4 words).
    # U+FF1A FULLWIDTH COLON is the title/subtitle delimiter CJK titles
    # actually use — without it every zh/ja/ko title counted as one clause
    # and rendered the whole SEO title onto the card, overrunning the motif.
    head = re.split(r'\s*[:：\|–—(]\s*', t)[0].strip()
    # CJK/Thai titles pack a complete concept into very few characters, so
    # the Latin-tuned "is this head substantial enough" bar needs to be low.
    if len(head) >= 3:
        t = head
    if len(t) > 46:
        t = t[:43].rsplit(" ", 1)[0].rstrip() + "..."
    return t


def clean_sub(html):
    m = OG_DESC.search(html)
    if m and m.group(3).strip():
        s = html_entities.unescape(m.group(3).strip())
        # The subtitle renders as one unwrapped line next to the motif
        # graphic (see og_png_svg) — past ~55 Latin chars it runs under it.
        if len(s) > 55:
            s = s[:52].rsplit(" ", 1)[0].rstrip() + "..."
        return s
    return ""


def collect(force=False, only=None):
    rows = []
    for loc in LOCALES:
        for path in sorted(glob.glob(os.path.join(loc, "**", "index.html"),
                                      recursive=True)):
            if only and not any(path.startswith(p) for p in only):
                continue
            html = open(path, encoding="utf-8").read()
            slug = slug_for(path)
            og_base, og_href, hero_base = current_asset_basenames(html)
            already_ok = (og_base == slug) and (hero_base in (slug, None))
            if already_ok and not force:
                continue
            m = HREFLANG_EN.search(html)
            href = m.group(4) if m else None
            eng_slug = english_slug_from_href(href) if href else None
            title = clean_title(html)
            sub = clean_sub(html)
            rows.append({
                "path": path, "slug": slug, "og_base": og_base,
                "og_href": og_href, "hero_base": hero_base,
                "eng_slug": eng_slug, "title": title, "sub": sub,
            })
    return rows


def main():
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    only = []
    for i, arg in enumerate(sys.argv):
        if arg == "--only" and i + 1 < len(sys.argv):
            only.append(sys.argv[i + 1])
    rows = collect(force=force, only=(only or None))
    print(f"pages needing locale art: {len(rows)}" +
          (f" (scoped to {only})" if only else ""))

    no_hreflang = [r for r in rows if r["eng_slug"] is None]
    fallback = []
    written = 0

    for r in rows:
        motif, kicker, how = motif_kicker_for(r["eng_slug"], r["og_base"], r["hero_base"])
        if how == "fallback":
            fallback.append(r["path"])
        title = r["title"] or "UltraTextGen"
        sub = r["sub"] or "Fonts and symbols to copy and paste"
        slug = r["slug"]
        native = gsa.NATIVE_SCRIPT.get(r["slug"].split("-", 1)[0])
        if native:
            # The cap is about GLYPH WIDTH, not which font file we picked:
            # CJK and Thai glyphs are ~2x a Latin character, so the same
            # character count runs under the motif graphic. Testing the
            # family name missed zh — its family is "WenQuanYi Zen Hei",
            # which neither starts with "Noto Sans CJK" nor is Thai, so
            # Traditional Chinese subtitles were capped at the Latin 46 and
            # overran the card.
            wide = native in ("Noto Sans Thai", "WenQuanYi Zen Hei") or \
                native.startswith("Noto Sans CJK")
            cap = 26 if wide else 46
            if len(sub) > cap:
                sub = sub[:cap].rsplit(" ", 1)[0].rstrip() + "..."

        if dry:
            continue

        with open(os.path.join(gsa.HERO, f"{slug}.svg"), "w", encoding="utf-8") as f:
            f.write(gsa.hero_svg(slug, title, motif, kicker))
        import cairosvg
        cairosvg.svg2png(
            bytestring=gsa.og_png_svg(slug, title, sub, motif, kicker,
                                       native=native).encode(),
            write_to=os.path.join(gsa.OG, f"{slug}.png"),
            output_width=1200, output_height=630)

        html = open(r["path"], encoding="utf-8").read()
        new_html = html
        if r["og_href"]:
            new_og_href = (f"https://ultratextgen.com/assets/og/{slug}.png"
                           if r["og_href"].startswith("https://ultratextgen.com")
                           else f"/assets/og/{slug}.png")
            new_html = new_html.replace(r["og_href"], new_og_href)
        else:
            new_html = insert_og_meta(new_html, f"https://ultratextgen.com/assets/og/{slug}.png")
        if r["hero_base"]:
            new_html = new_html.replace(f"/assets/hero/{r['hero_base']}.svg",
                                         f"/assets/hero/{slug}.svg")
        if new_html != html:
            open(r["path"], "w", encoding="utf-8").write(new_html)
        written += 1

    print(f"no hreflang=en found: {len(no_hreflang)}")
    for p in no_hreflang[:30]:
        print("   NO-HREFLANG:", p)
    print(f"fallback motif (english slug not in PAGES): {len(fallback)}")
    for p in fallback[:30]:
        print("   FALLBACK:", p)
    if not dry:
        print(f"wrote {written} hero SVG + OG PNG pairs and rewired their pages")


if __name__ == "__main__":
    main()
