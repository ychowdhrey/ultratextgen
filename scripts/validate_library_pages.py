#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_library_pages.py

Structural / SEO linter for Unicode library pages under /library/. Run it
over the whole directory (default) or against specific paths before opening
a batch PR.

Checks per page
---------------
  - <title> present and non-empty
  - <meta name="description"> present and non-empty
  - <link rel="canonical"> present
  - exactly one <h1>
  - at least three <h2>
  - single-copy pages have at least MIN_SINGLE_BUTTONS `.symbol-tile` buttons
  - every `.symbol-tile` button carries both data-symbol and aria-label
  - collection pages call UltraTextGen.buildGrids(...)
  - a #symbolToast element exists
  - /symbol-explorer.js is referenced
  - at least one related/internal link block is present

Cross-page checks
-----------------
  - duplicate <title> across library pages
  - duplicate <meta description> across library pages

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

MIN_SINGLE_BUTTONS = 6
MIN_H2 = 3

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
META_DESC_RE = re.compile(
    r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',
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
SYMBOL_TOAST_RE = re.compile(r'id=["\']symbolToast["\']')
EXPLORER_JS_RE = re.compile(r'src=["\']/symbol-explorer\.js["\']')
RELATED_RE = re.compile(r'Related Resources|class=["\'][^"\']*compare-card',
                        re.IGNORECASE)


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

    # Title
    m_title = TITLE_RE.search(html)
    title = m_title.group(1).strip() if m_title else ""
    if not title:
        issues.append(Issue("ERROR", "missing or empty <title>"))

    # Meta description
    m_desc = META_DESC_RE.search(html)
    desc = m_desc.group(1).strip() if m_desc else ""
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

    # Collection vs single
    is_collection = bool(BUILDGRIDS_RE.search(html))

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

    # Minimum buttons for single-copy pages
    if not is_collection:
        if len(tile_buttons) < MIN_SINGLE_BUTTONS:
            issues.append(
                Issue("ERROR",
                      f"single-copy page has {len(tile_buttons)} .symbol-tile "
                      f"button(s); need >= {MIN_SINGLE_BUTTONS}")
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

    return {
        "title_norm": normalize_text(title),
        "desc_norm": normalize_text(desc),
        "is_collection": is_collection,
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
    return sorted(LIBRARY_DIR.glob("*/index.html"))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*",
                        help="specific page paths or dirs (default: all /library/*)")
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
            kind = "collection" if result["is_collection"] else "single"
            print(f"{rel(path)}  ({kind})")
            for issue in result["issues"]:
                print(issue)

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
