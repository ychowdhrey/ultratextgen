#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
symbol_collection_link.py

One owner for the line that sends a /symbol/ spoke's reader to its collection.

A spoke is about one character: what ★ is, how to type it, what it is not. A
reader who wanted more than one star has a collection page for that, and every
spoke already links it, but only in the Related cards at the bottom. Measured on
2026-10-07, that first collection link sat more than 80% of the way down the body
on all 117 English spokes. So a reader who wanted the set had to read the whole
article about one glyph to find it.

This module inserts one short line directly after the spoke's first copy section
(the first section holding a copy tile), after the copy button and never in
front of it, because most people on a spoke came for the one character.

Which collection: the first /library/<slug>/ compare-card the spoke already
carries. The spoke's own HTML stays the source of truth for which hub it claims,
the same rule `sync_symbol_spoke_links.py` follows, so this never invents a
relation the page has not declared.

The block is a generated region between two markers. Both callers use `apply`:
`scripts/sync_symbol_collection_link.py` (the repair and check pass over every
live spoke) and `scripts/generate_library_page_from_spec.py` (so a regenerated
spoke keeps the line).

Locale spokes get the line too, but never this English sentence: this repo does
not translate copy fresh. A locale line is only a link, and its text is the
locale collection page's own <h1> (minus a trailing "(copy)"-style aside). The
collection is the locale translation of the EN parent's collection, found through
its `hreflang="en"` link, the same way `sync_symbol_spoke_links.py` mirrors peer
relations. A locale with no translation of that collection gets no line: linking
the English page from a locale page is the miswiring the locale-native linking
rule forbids.
"""

import re

START = "<!-- COLLECTION LINK (generated: npm run sync:symbol-collection-link) -->"
END = "<!-- /COLLECTION LINK -->"

REGION_RE = re.compile(r"\n?" + re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.DOTALL)
LIB_CARD_RE = re.compile(
    r'<a href="/library/([a-z0-9-]+)/" class="compare-card[^"]*">\s*<h4>(.*?)</h4>',
    re.DOTALL,
)
TILE_RE = re.compile(r'class="[^"]*\bsymbol-tile\b')


def find_collection(page):
    """(slug, label) of the first collection card the spoke carries, or None."""
    m = LIB_CARD_RE.search(REGION_RE.sub("", page))
    if not m:
        return None
    label = re.sub(r"<[^>]+>", "", m.group(2)).strip()
    # "All Currency Symbols" reads oddly after "the full set in"; the page name
    # without it is the same page.
    label = re.sub(r"^All\s+", "", label)
    return m.group(1), label


def render(slug, label):
    # `label` is taken from the card's own markup, so it is already HTML-escaped.
    return (
        f"{START}\n"
        f'<p class="symbol-collection-link">Need more than this one? '
        f'<a href="/library/{slug}/">Browse the full set in {label} →</a></p>\n'
        f"{END}\n"
    )


# Locales whose existing buttons point the arrow left.
RTL_ARROW = {"ar": "←"}
TRAILING_ASIDE_RE = re.compile(r"\s*[(（][^()（）]*[)）]\s*$")


def locale_label(h1_html):
    """A locale collection page's own <h1>, without tags or a trailing aside."""
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1_html)).strip()
    # A heading that runs on into a tagline ("Zodyak sembolleri — 12 burcun
    # sembolü") keeps only its name: the tagline is not a link label, and the
    # dash is banned on most locales' pages.
    text = re.split(r"\s[—–]\s|\s-\s", text, maxsplit=1)[0].strip()
    return TRAILING_ASIDE_RE.sub("", text).strip() or text


def render_locale(lang, href, label):
    arrow = RTL_ARROW.get(lang, "→")
    return (
        f"{START}\n"
        f'<p class="symbol-collection-link"><a href="{href}">{label} {arrow}</a></p>\n'
        f"{END}\n"
    )


def insertion_point(page):
    """Offset just after the first section that holds a copy tile, or None."""
    tile = TILE_RE.search(page)
    if not tile:
        return None
    close = page.find("</section>", tile.end())
    if close == -1:
        return None
    # A nested <section> between the tile and this close would put the line
    # inside the copy section rather than after it. No live spoke does this;
    # refuse rather than guess if one ever does.
    if "<section" in page[tile.end():close]:
        return None
    end = close + len("</section>")
    if page.startswith("\n", end):
        end += 1
    return end


def _place(page, block):
    stripped = REGION_RE.sub("", page)
    at = insertion_point(stripped)
    if at is None:
        return page, "no-anchor"
    return stripped[:at] + "\n" + block + stripped[at:], "ok"


def apply(page):
    """EN spoke. Return (new_page, status): 'ok' | 'no-collection' | 'no-anchor'."""
    found = find_collection(page)
    if not found:
        return page, "no-collection"
    return _place(page, render(*found))


def apply_locale(page, lang, href, label):
    """Locale spoke. href/label None means no translated collection: strip any line."""
    if not href:
        return REGION_RE.sub("", page), "no-locale-collection"
    return _place(page, render_locale(lang, href, label))

