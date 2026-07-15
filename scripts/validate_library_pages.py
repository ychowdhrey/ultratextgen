#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_library_pages.py

Structural / SEO linter for Unicode library pages under /library/. Run it
over the whole directory (default) or against specific paths before opening
a batch PR.

The default scan covers the English root (`library/`, `symbol/`) **and**
every translated lane (`<lang>/library/`, `<lang>/symbol/`) — a translated
page is just as capable of shipping with the wrong lane as an English one,
and it must not go unchecked just because it lives under `id/`, `pl/`, etc.

Checks per page
---------------
  - <title> present and non-empty
  - <meta name="description"> present and non-empty
  - <link rel="canonical"> present
  - exactly one <h1>
  - at least three <h2>
  - single-copy pages have at least MIN_SINGLE_BUTTONS_LIBRARY (library/) or
    MIN_SINGLE_BUTTONS_SYMBOL (symbol/) `.symbol-tile` buttons
  - every `.symbol-tile` button carries both data-symbol and aria-label
  - collection pages call UltraTextGen.buildGrids(...)
  - a #symbolToast element exists
  - /symbol-explorer.js is referenced
  - at least one related/internal link block is present
  - lane matches its English hreflang counterpart (see below)

Cross-page checks
-----------------
  - duplicate <title> across library pages
  - duplicate <meta description> across library pages
  - every /symbol/ spoke is linked from at least one /library/ hub
    (orphan spokes are only discoverable via the sitemap; fix with
    scripts/sync_symbol_spoke_links.py --write)

Cross-language lane consistency
--------------------------------
A page's lane (`library/` vs `symbol/`) is a content-type decision, not a
per-language one — a translation of a single-glyph `/symbol/` page must ship
under `<lang>/symbol/`, never `<lang>/library/`, regardless of which session
translates it. Every page in this repo carries a `hreflang="en"` alternate
link pointing at its English counterpart, which makes this mechanically
checkable: if a page lives under a `library/` directory but its own
`hreflang="en"` href is under `/symbol/` (or vice versa), that is a lane
mismatch, flagged as an ERROR. See CLAUDE.md's "Content Types: Library vs
Symbol" section for the underlying rule.

Exit status is non-zero if any ERROR-level issue is found, so the script is
CI-friendly. WARN-level issues do not fail the run.
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
LIBRARY_DIR = REPO / "library"
SYMBOL_DIR = REPO / "symbol"

# library/ single-copy pages serve a browse-and-compare job (a small set of
# peer symbols), so they need enough tiles to be worth a dedicated page.
# symbol/ pages serve a different job -- one canonical glyph plus its
# closest variants, per CLAUDE.md's "Content Types: Library vs Symbol" -- so
# a 2-4 tile spoke is by design, not thin content. Calibrated against the
# existing symbol/ corpus, whose smallest legitimate pages sit at 2 tiles.
MIN_SINGLE_BUTTONS_LIBRARY = 6
MIN_SINGLE_BUTTONS_SYMBOL = 2
MIN_ART_PIECES = 6
MIN_H2 = 3

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
META_DESC_RE = re.compile(
    r'<meta\s+name=["\']description["\']\s+content=(["\'])(.*?)\1',
    re.IGNORECASE | re.DOTALL,
)
CANONICAL_RE = re.compile(
    r'<link\s+rel=["\']canonical["\']', re.IGNORECASE
)
H1_RE = re.compile(r"<h1[\s>]", re.IGNORECASE)
H2_RE = re.compile(r"<h2[\s>]", re.IGNORECASE)
SYMBOL_TILE_RE = re.compile(r"<button[^>]*\bclass=[\"'][^\"']*\bsymbol-tile\b[^\"']*[\"'][^>]*>",
                            re.IGNORECASE)
# Matches both `UltraTextGen.buildGrids(` and the `ns.buildGrids(` alias used
# on existing pages (where `var ns = window.UltraTextGen`).
BUILDGRIDS_RE = re.compile(r"\.buildGrids\s*\(")
# Multi-line ASCII art pages (e.g. /library/heart-ascii-art/) use per-piece
# copy buttons that read an adjacent <pre>, not data-symbol tiles.
ART_COPY_RE = re.compile(r"<button[^>]*\bclass=[\"'][^\"']*\bart-piece-copy\b[^\"']*[\"'][^>]*>",
                         re.IGNORECASE)
SYMBOL_TOAST_RE = re.compile(r'id=["\']symbolToast["\']')
EXPLORER_JS_RE = re.compile(r'src=["\']/symbol-explorer\.js["\']')
RELATED_RE = re.compile(r'Related Resources|class=["\'][^"\']*compare-card',
                        re.IGNORECASE)
SYM_HREF_RE = re.compile(r'href="/symbol/([a-z0-9-]+)/"')
HREFLANG_EN_RE = re.compile(
    r'hreflang=["\']en["\']\s+href=["\']([^"\']+)["\']', re.IGNORECASE
)


class Issue:
    def __init__(self, level, message):
        self.level = level  # "ERROR" | "WARN"
        self.message = message

    def __str__(self):
        return f"  [{self.level}] {self.message}"


def normalize_text(text):
    text = re.sub(r"&[a-z]+;", " ", text or "")
    return re.sub(r"\s+", " ", text).strip().lower()


def validate_page(path):
    html = path.read_text(encoding="utf-8", errors="replace")
    issues = []

    # Lane is the page's own immediate parent-of-parent dir name: <slug>/index.html
    # sits inside .../library/<slug>/ or .../symbol/<slug>/, in any language.
    own_lane = path.resolve().parent.parent.name

    # Title
    m_title = TITLE_RE.search(html)
    title = m_title.group(1).strip() if m_title else ""
    if not title:
        issues.append(Issue("ERROR", "missing or empty <title>"))

    # Meta description
    m_desc = META_DESC_RE.search(html)
    desc = m_desc.group(2).strip() if m_desc else ""
    if not desc:
        issues.append(Issue("ERROR", 'missing or empty <meta name="description">'))

    # Canonical
    if not CANONICAL_RE.search(html):
        issues.append(Issue("ERROR", 'missing <link rel="canonical">'))

    # Exactly one H1
    h1_count = len(H1_RE.findall(html))
    if h1_count != 1:
        issues.append(Issue("ERROR", f"expected exactly one <h1>, found {h1_count}"))

    # At least 3 H2s
    h2_count = len(H2_RE.findall(html))
    if h2_count < MIN_H2:
        issues.append(Issue("ERROR", f"expected >= {MIN_H2} <h2>, found {h2_count}"))

    # Collection vs single vs multi-line art
    is_collection = bool(BUILDGRIDS_RE.search(html))
    art_buttons = ART_COPY_RE.findall(html)
    is_art = bool(art_buttons)

    # art-piece copy buttons must have data-label + aria-label
    art_missing_attr = 0
    for btn in art_buttons:
        if "data-label=" not in btn or "aria-label=" not in btn:
            art_missing_attr += 1
    if art_missing_attr:
        issues.append(
            Issue("ERROR",
                  f"{art_missing_attr} .art-piece-copy button(s) missing "
                  "data-label or aria-label")
        )

    # symbol-tile buttons must have data-symbol + aria-label
    tile_buttons = SYMBOL_TILE_RE.findall(html)
    missing_attr = 0
    for btn in tile_buttons:
        if "data-symbol=" not in btn or "aria-label=" not in btn:
            missing_attr += 1
    if missing_attr:
        issues.append(
            Issue("ERROR",
                  f"{missing_attr} .symbol-tile button(s) missing "
                  "data-symbol or aria-label")
        )

    # Minimum pieces for multi-line art pages
    if is_art and len(art_buttons) < MIN_ART_PIECES:
        issues.append(
            Issue("ERROR",
                  f"art page has {len(art_buttons)} .art-piece-copy "
                  f"button(s); need >= {MIN_ART_PIECES}")
        )

    # Minimum buttons for single-copy pages -- the floor depends on lane
    # (see MIN_SINGLE_BUTTONS_SYMBOL comment above); unknown/other lanes
    # fall back to the stricter library/ floor.
    if not is_collection and not is_art:
        min_buttons = (MIN_SINGLE_BUTTONS_SYMBOL if own_lane == "symbol"
                       else MIN_SINGLE_BUTTONS_LIBRARY)
        if len(tile_buttons) < min_buttons:
            issues.append(
                Issue("ERROR",
                      f"single-copy page has {len(tile_buttons)} .symbol-tile "
                      f"button(s); need >= {min_buttons}")
            )

    # Collection pages must actually call buildGrids (tautological here, but
    # we also flag a container with no call).
    if "CollectionsContainer" in html or "collectionsContainer" in html:
        if not is_collection:
            issues.append(
                Issue("ERROR",
                      "page declares a collections container but never calls "
                      "UltraTextGen.buildGrids()")
            )

    # symbolToast
    if not SYMBOL_TOAST_RE.search(html):
        issues.append(Issue("ERROR", "missing #symbolToast element"))

    # symbol-explorer.js
    if not EXPLORER_JS_RE.search(html):
        issues.append(Issue("ERROR", "missing /symbol-explorer.js reference"))

    # Related links
    if not RELATED_RE.search(html):
        issues.append(Issue("WARN", "no related-resources / internal link block found"))

    # Cross-language lane consistency: this page's own directory (library/
    # vs symbol/) must match the lane of its hreflang="en" counterpart. A
    # translation session can pick the wrong lane independently of the
    # English original; this is the only check that would catch it.
    if own_lane in ("library", "symbol"):
        m_en = HREFLANG_EN_RE.search(html)
        if m_en:
            en_href = m_en.group(1)
            if "/symbol/" in en_href:
                en_lane = "symbol"
            elif "/library/" in en_href:
                en_lane = "library"
            else:
                en_lane = None
            if en_lane and en_lane != own_lane:
                issues.append(
                    Issue("ERROR",
                          f'lane mismatch: page lives under {own_lane}/ but its '
                          f'hreflang="en" counterpart is under {en_lane}/ '
                          f'({en_href}) — move it to the matching lane')
                )

    return {
        "title_norm": normalize_text(title),
        "desc_norm": normalize_text(desc),
        "is_collection": is_collection,
        "is_art": is_art,
        "issues": issues,
    }


def rel(path):
    """Path relative to repo root when possible, else the path as-is."""
    try:
        return path.resolve().relative_to(REPO)
    except ValueError:
        return path


def gather_paths(args_paths):
    if args_paths:
        paths = []
        for p in args_paths:
            pp = Path(p).resolve()
            if pp.is_dir():
                paths.extend(sorted(pp.glob("index.html")))
            else:
                paths.append(pp)
        return paths
    paths = sorted(LIBRARY_DIR.glob("*/index.html")) + sorted(SYMBOL_DIR.glob("*/index.html"))
    # Every translated lane (<lang>/library/, <lang>/symbol/) gets the same
    # scan by default — a two-letter top-level dir with no such subfolder
    # (e.g. js/) simply contributes nothing.
    for lang_dir in sorted(REPO.glob("??")):
        if not lang_dir.is_dir():
            continue
        for lane in ("library", "symbol"):
            lane_dir = lang_dir / lane
            if lane_dir.is_dir():
                paths.extend(sorted(lane_dir.glob("*/index.html")))
    return paths


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*",
                        help="specific page paths or dirs (default: all /library/* and /symbol/*)")
    parser.add_argument("--strict", action="store_true",
                        help="treat WARN as failure too")
    args = parser.parse_args(argv)

    paths = gather_paths(args.paths)
    if not paths:
        sys.stderr.write("[error] no library pages found to validate\n")
        return 1

    titles = defaultdict(list)
    descs = defaultdict(list)
    total_errors = 0
    total_warns = 0
    pages_with_issues = 0

    for path in paths:
        if not path.exists():
            print(f"{path}: MISSING FILE")
            total_errors += 1
            continue
        result = validate_page(path)
        slug = path.parent.name
        if result["title_norm"]:
            titles[result["title_norm"]].append(slug)
        if result["desc_norm"]:
            descs[result["desc_norm"]].append(slug)

        errs = [i for i in result["issues"] if i.level == "ERROR"]
        warns = [i for i in result["issues"] if i.level == "WARN"]
        total_errors += len(errs)
        total_warns += len(warns)
        if result["issues"]:
            pages_with_issues += 1
            if result["is_collection"]:
                kind = "collection"
            elif result["is_art"]:
                kind = "art"
            else:
                kind = "single"
            print(f"{rel(path)}  ({kind})")
            for issue in result["issues"]:
                print(issue)

    # Hub→spoke inbound coverage: every /symbol/ spoke in the validated set
    # must be linked from at least one /library/ hub, or it is an orphan that
    # only the sitemap can discover. The full library dir is always scanned
    # for the inbound map, regardless of which pages are being validated.
    # (spokes live at symbol/<slug>/index.html; symbol/index.html is the
    # pillar index, not a spoke)
    symbol_paths = [p for p in paths
                    if p.exists()
                    and p.resolve().parent.parent == SYMBOL_DIR.resolve()]
    if symbol_paths and LIBRARY_DIR.is_dir():
        linked_spokes = set()
        for hub_page in LIBRARY_DIR.glob("*/index.html"):
            hub_html = hub_page.read_text(encoding="utf-8", errors="replace")
            linked_spokes.update(SYM_HREF_RE.findall(hub_html))
        orphans = sorted(p.parent.name for p in symbol_paths
                         if p.parent.name not in linked_spokes)
        if orphans:
            print("\nOrphan /symbol/ spokes (no /library/ hub links to them):")
            for slug in orphans:
                print(f"  [ERROR] symbol/{slug} — run "
                      "scripts/sync_symbol_spoke_links.py --write")
                total_errors += 1

    # Cross-page duplicate detection
    dup_titles = {t: s for t, s in titles.items() if len(s) > 1}
    dup_descs = {d: s for d, s in descs.items() if len(s) > 1}
    if dup_titles:
        print("\nDuplicate <title> across library pages:")
        for t, slugs in dup_titles.items():
            print(f"  [ERROR] {', '.join(slugs)} share title: {t[:70]}")
            total_errors += 1
    if dup_descs:
        print("\nDuplicate <meta description> across library pages:")
        for d, slugs in dup_descs.items():
            print(f"  [ERROR] {', '.join(slugs)} share description: {d[:70]}")
            total_errors += 1

    print(
        f"\nValidated {len(paths)} page(s): "
        f"{pages_with_issues} with issues, "
        f"{total_errors} error(s), {total_warns} warning(s)."
    )

    if total_errors or (args.strict and total_warns):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
