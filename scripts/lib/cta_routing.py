#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cta_routing.py

The single owner of "where should this page's CTA card send the reader, and
what should it say".

WHY THIS EXISTS
---------------
The shared CTA card sits on 3,955 pages. Measured 2026-08-26, **2,758 of them
(69.8%) pointed at a bare homepage** with one shared heading, one shared
paragraph and one shared button label.

A correction worth carrying, because the obvious framing is wrong: the homepage
is **not** a dead end. `/` and `/<locale>/` ARE the font generator, so
"Open UltraTextGen ->" pointing there is a real tool, not a shrug. The defect is
narrower than "everything goes to the homepage": it is that pages whose reader
has a *different* next job are sent to the generator anyway.

So this table is deliberately small. It moves a page only where the site has a
tool that does a job the generator does not, and leaves every other page on the
generator. 213 English pages qualify; the rest are untouched on purpose.

WHY THERE IS NO LOCALE ROUTING
------------------------------
Not an oversight and not a translation problem. **The destinations do not
exist.** There is no `/fr/character-counter/`, no `/es/kaomoji-generator/`, no
locale build of any of these tools (checked: zero, the only match being
`embed/character-counter`, which is an embed). Sending a French reader to an
English tool is precisely what CLAUDE.md's locale-native internal linking rule
forbids, and it would trip `check-locale-mesh` and `check-locale-translation`.
Meanwhile the locale homepage IS that locale's generator, so the current
destination is already the best one available. 2,285 locale pages therefore keep
their existing card, correctly.

WHY THE COPY LIVES HERE AND NOT IN THE SPECS
--------------------------------------------
Writing these three cards into 213 spec files would paste one sentence into 96
specs at a time, which `scripts/check-spec-sentence-reuse.py` exists to fail, and
would fail this repository's own PR. That gate's failure message names the fix:
"If a sentence genuinely must be shared, it belongs in the generator default,
not copied into N specs -- then it is one string with one owner." This module is
that owner. `scripts/generate_library_page_from_spec.py` reads it, and so does
`scripts/route-cta-cards.py`, so a regenerated page and a live page cannot
disagree about the card.

EVERY CLAIM IN THE COPY IS CHECKED AGAINST THE DESTINATION PAGE
---------------------------------------------------------------
Per the editorial remediation principle (generic claim -> concrete information,
never a synonym swap), each paragraph states a fact the destination actually
carries, verified 2026-08-26:

  * 32 / 150 / 80 / 160 and X's weighted counting are the real values in
    `js/counter/counterRules.js`'s own LIMITS table.
  * mood filtering, outline/eyes/mouth, optional cheeks/arms and the
    automatically-matched left/right sides are what `kaomoji-generator/` says it
    does, in its own "Build it part by part" section.
  * Instagram 150 / TikTok 80 / X 160 and "88 Unicode fonts" are on
    `usecase/bio-font/` itself.

No em dash appears in any of it. The em dash rule in
`docs/editorial-footprint-risk.md` is forward-only: existing ones are left
alone, new copy does not add more.

EACH PARAGRAPH NAMES "ULTRATEXTGEN", AND THAT IS NOT DECORATION
---------------------------------------------------------------
The first draft of this copy did not, and the SEO Preservation Gate caught it on
all 214 pages as `protected-term-lost`. The old card was the ONLY place the
product name appeared in these pages' editorial text -- verified: after the first
draft, `ultratextgen` occurred zero times across the title, meta description, H1,
headings, prose, FAQ and CTA slots of `library/bear-kaomoji`, `symbol/won-sign`
and `library/algeria-emoji-combos`, while still appearing 19-34 times in each
page's URLs, canonical and JSON-LD, which is metadata, not copy.

The gate was right to block it and the fix was to put the name back where the
sentence already named the tool, not to exempt the rule. Do not remove it.

The same applies to "Unicode", for the same reason and found the same way: with
the brand name restored the gate went from 214 findings to 8, all of them
`protected-term-lost: unicode` on pages whose only editorial mention of the word
had been the old card ("100+ other Unicode font styles"). Both remaining cards
now name it while stating something true about it -- the counter really does
segment by grapheme (`Intl.Segmenter`, `countMode` in
`js/counter/counterRules.js`), and the kaomoji generator's own page really does
describe its output as plain text. `search_protected` terms are asserted in
scripts/lib/cta_routing.test.py; adding a destination means checking them again.
"""

import re

# Destination definitions. One entry per genuinely different reader job.
DESTINATIONS = {
    "character-counter": {
        "href": "/character-counter/",
        "h3": "Check it against the field you are pasting into",
        "cta": (
            "A Discord nickname stops at 32 characters, an Instagram bio at 150, "
            "a TikTok bio at 80, and X weights some characters as two. The "
            "UltraTextGen counter reads all of them at once, and counts a "
            "multi-codepoint Unicode emoji the way each platform actually bills it."
        ),
        "button": "Open the character counter →",
    },
    "kaomoji-generator": {
        "href": "/kaomoji-generator/",
        "h3": "Build a face that is not on this page",
        "cta": (
            "The UltraTextGen kaomoji generator filters the parts by mood, then lets "
            "you swap the outline, eyes and mouth and add cheeks or arms, keeping the "
            "left and right sides matched. Every part is plain Unicode text, so the "
            "face pastes wherever you are typing."
        ),
        "button": "Open the kaomoji generator →",
    },
    "bio-font": {
        "href": "/usecase/bio-font/",
        "h3": "Fit the combo into a bio that has a limit",
        "cta": (
            "The UltraTextGen bio generator counts your text against Instagram's 150 "
            "characters, TikTok's 80 and X's 160 while you type, with 88 Unicode "
            "fonts and dividers to set it in."
        ),
        "button": "Open the bio font generator →",
    },
}

# A CTA already pointing at one of these is the generator, which is a real tool.
# Only such a page is eligible to be re-routed; a page whose card someone already
# pointed somewhere specific is left exactly as it is.
_HOMEPAGE = re.compile(r"^/(?:[a-z]{2}(?:-[a-z]{2})?/)?$")


def is_homepage_href(href):
    """True when `href` resolves to a bare site or locale homepage."""
    if not href:
        return False
    path = re.sub(r"^https?://(?:www\.)?ultratextgen\.com", "", href.strip()) or "/"
    path = path.split("?")[0].split("#")[0]
    if not path.startswith("/"):
        return False
    return bool(_HOMEPAGE.match(path.lower()))


def route(rel_path):
    """The destination key for a page, or None to leave its card alone.

    `rel_path` is repo-relative and POSIX-style, e.g. "symbol/euro-sign/index.html".
    Returns a key into DESTINATIONS, or None.

    English only, by construction: a path whose first segment is anything other
    than a known English pillar returns None, so every `<lang>/...` page falls
    through untouched. See "WHY THERE IS NO LOCALE ROUTING" above.
    """
    parts = [p for p in rel_path.split("/") if p]
    if len(parts) < 2 or parts[-1] != "index.html":
        return None
    family, slug = parts[0], parts[1]

    # A single glyph or emoji has just been copied. The next question is whether
    # it fits in the field it is going into, which the generator cannot answer.
    if family == "symbol":
        return "character-counter"

    if family == "library":
        # A kaomoji page shows faces someone else built; the generator builds one.
        if "kaomoji" in slug or "emoticon" in slug:
            return "kaomoji-generator"
        # A combo set is assembled to be pasted into a bio, which has a limit.
        if "combos" in slug or slug.endswith("-combo"):
            return "bio-font"

    return None


def card_for(rel_path):
    """The full replacement card for a page, or None. Convenience wrapper."""
    key = route(rel_path)
    return dict(DESTINATIONS[key], key=key) if key else None
