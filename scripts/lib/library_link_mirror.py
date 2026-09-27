# -*- coding: utf-8 -*-
"""
library_link_mirror.py: the ONE definition of a missing library link mirror.

The concern
-----------
English library pages link each other: a hub links its spokes, and each spoke
links back to its hub. When a locale has a translation of BOTH ends of such a
pair, the locale hub should link the locale spoke too. Nothing required that.
`sync_symbol_spoke_links.py` mirrors library->symbol hubs and symbol<->symbol
peers into locales, but a library->library pair was never mirrored anywhere.
So a locale spoke translated after its hub stayed reachable only from the
locale catalogue and the sitemap. Measured 2026-09-27: `ko/library/imotikon`
linked 6 of its 28 locale spokes and `es/library/kaomoji` 7 of 24, and 478
mirror links were missing site-wide.

The rule
--------
A RELATION is an EN library page pair (A, B) where A's body links B and B's
body links A. Both directions are the EN site's own declaration, so nothing
here guesses which page is the hub. One-way EN links are not relations: a page
may cite another without being part of its family, and mirroring those would
turn every EN "see also" into a locale obligation.

An OBLIGATION is (lang, A, B) for a relation (A, B) where `lang` has a live
translation of both A and B. It is met when the locale A page links the locale
B page. A pair whose other end has no translation in `lang` is skipped. It is
never linked in English (`.claude/rules/localization.md`, locale-native links).

Locale membership comes from each locale page's own hreflang="en" link, the
same cluster key `scripts/lib/translation-clusters.js` uses. Locales come from
`data/locale_qualification_tiers.json`, never a filesystem glob.

Card copy for a repair is the TARGET page's own <h1> and first hero-tagline
sentence, with em dashes re-jointed per the locale's policy
(`sync_symbol_spoke_links.page_title_and_desc`), so nothing is translated here.

Users: scripts/audit-library-link-mirror.py (whole-site, informational),
scripts/check-library-link-mirror.py (delta gate), and
scripts/fix-library-link-mirror.py (idempotent repair).
"""

import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE = "https://ultratextgen.com"

import sys
sys.path.insert(0, str(REPO / "scripts"))
from sync_symbol_spoke_links import build_card, page_title_and_desc  # noqa: E402

A_HREF_RE = re.compile(r'<a\b[^>]*?\bhref="([^"#?]+)', re.IGNORECASE)
EN_ALTERNATE_RE = re.compile(
    r'<link[^>]*\brel="alternate"[^>]*\bhreflang="en"[^>]*\bhref="([^"]+)"', re.IGNORECASE)
EN_LIBRARY_RE = re.compile(r"^(?:https://ultratextgen\.com)?/library/([a-z0-9-]+)/?$")
FOOTER_RE = re.compile(r"<footer\b.*?</footer>", re.IGNORECASE | re.DOTALL)
COMPARE_GRID_RE = re.compile(r'<div\s+class="compare-grid"[^>]*>')
CARD_CLASS_RE = re.compile(r'class="(compare-card[^"]*)"')
RELATED_MARKER = "<!-- RELATED -->"


class Unknown(Exception):
    """An input the answer depends on could not be read. Callers exit non-zero."""


def load_locales():
    path = REPO / "data" / "locale_qualification_tiers.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        locales = sorted((data.get("locales") or {}).keys())
    except (OSError, ValueError) as e:
        raise Unknown(f"cannot read the locale registry {path.relative_to(REPO)}: {e}")
    if not locales:
        raise Unknown(f"{path.relative_to(REPO)} lists no locales")
    return locales


def normalise(href):
    """A site-internal href as a path with a trailing slash, or None."""
    href = href.strip()
    if href.startswith(SITE):
        href = href[len(SITE):]
    if not href.startswith("/"):
        return None
    if not href.endswith("/"):
        href += "/"
    return href


def body_links(html):
    """Internal <a> targets outside the site footer (generated, same on every page)."""
    html = FOOTER_RE.sub("", html)
    out = set()
    for href in A_HREF_RE.findall(html):
        path = normalise(href)
        if path:
            out.add(path)
    return out


# ── Reading a tree: the working copy, or any git revision ───────────────────

class WorkTree:
    label = "working tree"

    def paths(self, locales):
        found = [p.relative_to(REPO).as_posix() for p in (REPO / "library").glob("*/index.html")]
        for lang in locales:
            found += [p.relative_to(REPO).as_posix()
                      for p in (REPO / lang / "library").glob("*/index.html")]
        return found

    def read_many(self, rels):
        return {r: (REPO / r).read_text(encoding="utf-8", errors="replace") for r in rels}


class GitTree:
    def __init__(self, rev):
        self.rev = rev
        self.label = rev[:12]

    def _git(self, *args, **kw):
        return subprocess.run(["git", *args], cwd=REPO, capture_output=True, check=True, **kw)

    def paths(self, locales):
        specs = ["library"] + [f"{lang}/library" for lang in locales]
        try:
            out = self._git("ls-tree", "-r", "--name-only", self.rev, "--", *specs).stdout.decode()
        except subprocess.CalledProcessError as e:
            raise Unknown(f"cannot list {self.rev}: {e.stderr.decode().strip()}")
        return [p for p in out.splitlines() if re.fullmatch(r"(?:[a-z]{2}(?:-[a-z]{2})?/)?library/[a-z0-9-]+/index\.html", p)]

    def read_many(self, rels):
        if not rels:
            return {}
        req = "".join(f"{self.rev}:{r}\n" for r in rels).encode()
        try:
            raw = self._git("cat-file", "--batch", input=req).stdout
        except subprocess.CalledProcessError as e:
            raise Unknown(f"cannot read blobs at {self.rev}: {e.stderr.decode().strip()}")
        out, i = {}, 0
        for rel in rels:
            nl = raw.index(b"\n", i)
            header = raw[i:nl].split()
            if len(header) < 3 or header[1] != b"blob":
                raise Unknown(f"{self.rev}:{rel} is not readable ({raw[i:nl].decode(errors='replace')})")
            size = int(header[2])
            out[rel] = raw[nl + 1: nl + 1 + size].decode("utf-8", errors="replace")
            i = nl + 1 + size + 1
        return out


# ── The graph ───────────────────────────────────────────────────────────────

class Graph:
    """EN library links, and each locale's library pages keyed by EN parent."""

    def __init__(self, tree):
        self.tree = tree
        self.locales = load_locales()
        rels = tree.paths(self.locales)
        texts = tree.read_many(rels)
        en_rels = [r for r in rels if r.startswith("library/")]
        if not en_rels:
            raise Unknown(f"no EN library pages found in {tree.label}")
        self.en_links = {}                      # en slug -> set of EN library slugs it links
        for rel in en_rels:
            slug = rel.split("/")[1]
            linked = set()
            for path in body_links(texts[rel]):
                m = EN_LIBRARY_RE.match(path)
                if m and m.group(1) != slug:
                    linked.add(m.group(1))
            self.en_links[slug] = linked
        claimants = {}                          # (lang, en slug) -> [entry, ...]
        for rel in rels:
            if rel.startswith("library/"):
                continue
            html = texts[rel]
            m = EN_ALTERNATE_RE.search(html)
            en = EN_LIBRARY_RE.match(m.group(1).strip()) if m else None
            if not en:
                continue
            claimants.setdefault((rel.split("/")[0], en.group(1)), []).append(
                {"rel": rel, "url": "/" + rel[: -len("index.html")], "links": body_links(html)})
        # Two pages in one locale claiming one EN parent is a mesh defect other
        # gates own. Neither is "the" sibling, so both are left out and listed.
        self.locale = {k: v[0] for k, v in claimants.items() if len(v) == 1}
        self.ambiguous = {k: [e["rel"] for e in v] for k, v in claimants.items() if len(v) > 1}
        self.texts = texts

    def relations(self):
        """Every (a, b) where EN a links b and b links a, as ordered pairs both ways."""
        return sorted((a, b) for a, linked in self.en_links.items() for b in linked
                      if a in self.en_links.get(b, ()))

    def obligations(self):
        """(lang, a, b) for every relation whose two ends are both translated into lang."""
        out = []
        for a, b in self.relations():
            for lang in self.locales:
                if (lang, a) in self.locale and (lang, b) in self.locale:
                    out.append((lang, a, b))
        return out

    def missing(self):
        """Obligations whose locale `a` page does not link the locale `b` page."""
        return [o for o in self.obligations()
                if self.locale[(o[0], o[2])]["url"] not in self.locale[(o[0], o[1])]["links"]]


# ── Repair ──────────────────────────────────────────────────────────────────

def related_grid(html):
    """(start, end) of the grid to add a card to: the compare-grid after the
    page's <!-- RELATED --> marker if it has one, else its last compare-grid.
    The first grid on a page is often an in-body comparison, not Related."""
    marker = html.find(RELATED_MARKER)
    grids = list(COMPARE_GRID_RE.finditer(html))
    if not grids:
        return None
    chosen = next((g for g in grids if marker != -1 and g.start() > marker), grids[-1])
    end = html.find("</div>", chosen.end())
    return (chosen.end(), end) if end != -1 else None


def inject(path, href, title, desc):
    """Add one compare-card to the page's Related grid. False if it has none."""
    html = path.read_text(encoding="utf-8")
    span = related_grid(html)
    if not span:
        return False
    start, end = span
    body = html[start:end]
    m_class = CARD_CLASS_RE.search(body)
    card_class = m_class.group(1) if m_class else "compare-card variant-muted u-no-underline"
    m_indent = re.search(r"\n( *)<a ", body)
    indent = len(m_indent.group(1)) if m_indent else 4
    card = build_card(href, title, desc, card_class, indent)
    html = html[:start] + body.rstrip() + "\n" + card + " " * max(indent - 2, 0) + html[end:]
    path.write_text(html, encoding="utf-8")
    return True


DASH_RE = re.compile(r"\s*(?:——|—)\s*")


def rejoint(text, lang):
    """Card text without the em dash, whatever the locale's policy allows.

    A card is new text on the hub, and a locale where the dash is native still
    scores it in the Editorial Footprint's punctuation fingerprint: 17 verbatim
    taglines moved es/library/kaomoji from p40 to p73. So the joint moves, per
    docs/em-dash-policy.md's structural remedies, and every word stays: a pair of
    dashes around an aside becomes a comma pair, a single dash before an
    explanation becomes a colon (full-width in ja and zh-tw)."""
    if not text or "—" not in text:
        return text
    parts = DASH_RE.split(text)
    if len(parts) == 3:
        return f"{parts[0]}, {parts[1]}, {parts[2]}"
    colon = "：" if lang in ("ja", "zh-tw") else ": "
    return colon.join(parts)


def card_copy(graph, lang, en_slug):
    entry = graph.locale[(lang, en_slug)]
    title, desc = page_title_and_desc(graph.texts[entry["rel"]], en_slug, lang)
    return rejoint(title, lang), rejoint(desc, lang)
