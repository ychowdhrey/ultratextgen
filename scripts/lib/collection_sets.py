"""Reading the combo-set sections a LIVE page renders.

One place, because three callers ask the same question and must not answer it
differently: check_locale_spec.py (spec vs its EN parent's page),
check-locale-collection-parity.py (locale page vs its EN parent's page, the
per-PR gate) and audit-locale-collection-parity.py (the whole-site dashboard).

WHY A PAGE AND NOT A SPEC
-------------------------
A `copy_pattern: "collection"` section builds its tiles through
`UltraTextGen.buildGrids(containerId, GROUPS)` after load, so it leaves no
static markup: an empty `<div id="…Container"></div>` and nothing else. Every
structural check on this site — tile counts, link sets, FAQ counts — is blind
to it, which is how 43 locale pages went live without the section their
English parent renders while every gate reported them complete.

The first gate written for that read SPECS, and that was the wrong artifact:
of the 798 pages on this site that render a combo set, only 327 have a spec at
all. The other 471 were hand-built, so a spec-keyed check cannot see them —
and 61 locale pages carrying exactly this defect sat inside that blind spot.
Read the page.

Groups are counted by `flags:`, not `defaultFormat:`. Both appear once per
group in the generator's emitted GROUPS array, but a hand-written array does
not always carry `defaultFormat` — library/emoji-flags' FLAG_GROUPS has none,
so counting it reported that page's section as 0 groups, i.e. as empty.
Across all 808 pages carrying a `buildGrids` call (exactly one each) `flags:`
is never absent and never disagrees with `defaultFormat:` where both exist.
"""

import os
import re

SITE = "https://ultratextgen.com"

_SCRIPT = re.compile(r"<script>(.*?)</script>", re.S)
_CALL = re.compile(r"""\bbuildGrids\(\s*["']([^"']+)["']""")
_GROUP = re.compile(r"\bflags\s*:")
_EN_ALT = re.compile(
    r'hreflang="en"\s+href="' + re.escape(SITE) + r'/((?:library|symbol)/[^"]+)"')


def sets_in(html):
    """containerId -> group count, for every combo-set section the page renders."""
    out = {}
    for m in _SCRIPT.finditer(html):
        js = m.group(1)
        call = _CALL.search(js)
        if call:
            out[call.group(1)] = len(_GROUP.findall(js))
    return out


def groups_in(html):
    """Total groups across every combo-set section on the page."""
    return sum(sets_in(html).values())


def en_parent_rel(html):
    """The repo-relative index.html of the page's own EN parent, or None.

    Read from the page's own `hreflang="en"` link — the same source
    scripts/lib/translation-clusters.js uses — never guessed from the slug.
    """
    m = _EN_ALT.search(html)
    return m.group(1).rstrip("/") + "/index.html" if m else None


def read(root, rel):
    path = os.path.join(root, rel)
    if not os.path.exists(path):
        return None
    return open(path, encoding="utf-8", errors="replace").read()
