"""The one definition of what makes a copy tile's Unicode wrong, shared by the audit and its tests.

A tile is any element carrying data-symbol="...". What it copies is that attribute, decoded. The checks here
read the RAW attribute as well, because the decoded value hides the one fragility that matters for
normalisation: a character written literally can be rewritten by an NFC pass in an editor or formatter, while
the same character written as a numeric entity cannot (see scripts/check-tile-codepoints.py for the origin).

Defect classes, by severity:

  error      unassigned-copy        a code point the pinned Unicode table does not assign (unless the tile
                                    carries data-provisional, the symbol-page rule)
             odd-regional-indicator a flag-shaped tile with an unpaired regional indicator
             bad-keycap             U+20E3 inside a string that is not made of whole emoji sequences
             stray-joiner           a ZWJ at either end, or two in a row (a lone U+200D tile is the
                                    invisible-character reference itself and is exempt)
             zwj-not-emoji          a ZWJ chain whose parts are not emoji sequences
  hardening  nfc-fragile-literal    a literal character that NFC rewrites (Ohm sign, EN QUAD, ...)
             combo-unqualified      a multi-emoji string holding a text-default emoji with no U+FE0F
  info       text-default-no-vs16   one text-default emoji, no U+FE0F: draws as text or colour by platform
             redundant-vs16         U+FE0F after a character that is already emoji by default (harmless)
"""
import html as htmlmod
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(__file__))
import symbol_pages as sp  # noqa: E402  (the pinned assigned-range table and its helpers live there)

ROOT = sp.ROOT
VS15, VS16, ZWJ, KEYCAP = "\ufe0e", "\ufe0f", "\u200d", "\u20e3"
SEVERITY = {
    "unassigned-copy": "error", "odd-regional-indicator": "error", "bad-keycap": "error",
    "stray-joiner": "error", "zwj-not-emoji": "error",
    "nfc-fragile-literal": "hardening", "combo-unqualified": "hardening",
    "text-default-no-vs16": "info", "redundant-vs16": "info",
}
# A tile that is exactly one of these is the thing itself (the invisible-character references).
FORMAT_TILE = {"\u200b", "\u200c", "\u200d", "\u2060", "\ufeff", "⁢", "⁣", "⁤"}

TAG_RE = re.compile(r"<[a-zA-Z][^<>]*\bdata-symbol=\"[^\"]*\"[^<>]*>", re.S)
SYM_RE = re.compile(r'\bdata-symbol="([^"]*)"')


def to_str(hexseq):
    return "".join(chr(int(h, 16)) for h in hexseq.split())


def load_emoji():
    p = os.path.join(ROOT, "data", "emoji_sequences.json")
    if not os.path.exists(p):
        raise FileNotFoundError(p)
    d = json.load(open(p, encoding="utf-8"))
    fq = {to_str(x) for x in d["fully_qualified"]}
    other = {to_str(x) for k in ("minimally_qualified", "unqualified", "component") for x in d[k]}
    return d["emoji_version"], fq, other


def iter_tiles(src):
    """Yield (line, raw_attribute, decoded, has_provisional) for every data-symbol in the page source."""
    for m in TAG_RE.finditer(src):
        tag = m.group(0)
        sm = SYM_RE.search(tag)
        raw = sm.group(1)
        yield src.count("\n", 0, m.start()) + 1, raw, htmlmod.unescape(raw), "data-provisional" in tag


def _segments(s, known):
    """Greedy longest-match split of s into known emoji sequences; None marks a character that is not one."""
    out, i = [], 0
    while i < len(s):
        for j in range(min(len(s), i + 14), i, -1):
            if s[i:j] in known:
                out.append(s[i:j])
                i = j
                break
        else:
            out.append(None)
            i += 1
    return out


def classify(raw, decoded, provisional, ranges, emoji):
    """Return the sorted defect ids for one tile. `emoji` is (version, fully_qualified, other_forms)."""
    _v, fq, other = emoji
    known = fq | other
    found = set()
    for ch in decoded:
        cp = ord(ch)
        if cp >= 0x80 and cp not in (0xFE0E, 0xFE0F) and not sp.assigned(cp, ranges) and not provisional:
            found.add("unassigned-copy")
    if unicodedata.normalize("NFC", raw) != raw:
        found.add("nfc-fragile-literal")
    if decoded in FORMAT_TILE:
        return sorted(found)
    ri = [c for c in decoded if "\U0001F1E6" <= c <= "\U0001F1FF"]
    if ri and len(ri) % 2 and decoded not in known:
        found.add("odd-regional-indicator")
    if KEYCAP in decoded and decoded not in known and None in _segments(decoded, known):
        found.add("bad-keycap")
    if ZWJ in decoded and decoded not in known:
        if decoded.startswith(ZWJ) or decoded.endswith(ZWJ) or ZWJ + ZWJ in decoded:
            found.add("stray-joiner")
        elif None in _segments(decoded, known):
            found.add("zwj-not-emoji")
    if decoded in fq:
        return sorted(found)
    stripped = decoded.replace(VS16, "")
    if stripped in fq and stripped != decoded:
        found.add("redundant-vs16")
        return sorted(found)
    if decoded in other and decoded not in fq:
        found.add("text-default-no-vs16")
        return sorted(found)
    if len(decoded) > 1 and ZWJ not in decoded:
        segs = _segments(decoded, known)
        if all(s is not None for s in segs) and any(s not in fq for s in segs):
            found.add("combo-unqualified")
    return sorted(found)


def check_page(rel, src, ranges, emoji):
    """Yield (defect, line, tile) for one page."""
    for ln, raw, dec, prov in iter_tiles(src):
        for d in classify(raw, dec, prov, ranges, emoji):
            yield d, ln, dec


GATED = {"unassigned-copy", "odd-regional-indicator", "bad-keycap", "stray-joiner", "zwj-not-emoji", "nfc-fragile-literal"}


def new_defects(base_src, head_src, ranges, emoji, gated=GATED):
    """Defects a page has in head_src beyond those it already had in base_src ('' for a new page).

    Counted per (defect, decoded tile), so moving or duplicating an existing defective tile is not new, and
    adding a second copy of one is. Returns [(defect, line, decoded_tile)] for the head occurrences in excess."""
    import collections
    have = collections.Counter((d, t) for d, _l, t in check_page("", base_src, ranges, emoji) if d in gated)
    out = []
    for d, ln, t in check_page("", head_src, ranges, emoji):
        if d not in gated:
            continue
        if have[(d, t)] > 0:
            have[(d, t)] -= 1
        else:
            out.append((d, ln, t))
    return out
