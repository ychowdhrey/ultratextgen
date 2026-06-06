#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_library_opportunities.py

Deduplication / overlap auditor for the Unicode library page production
system. It cross-references proposed page opportunities against the pages
that already ship in /library/ and against the Unicode block catalog in
data/categories.yaml, then writes a flagged audit CSV.

Inputs
------
  data/library_opportunities.csv   proposed opportunities (see schema docs)
  library/*/index.html             existing published library pages
  data/categories.yaml             Unicode block catalog (optional)

Output
------
  data/library_opportunities_audit.csv

Flags emitted per opportunity
-----------------------------
  dup_slug              slug already exists as a published /library/ page
  dup_title             title (normalized) matches a published page <title>
  intent_overlap        primary_keyword/slug tokens strongly overlap an
                        existing page (likely the same search intent)
  blocks_covered        one or more declared unicode_blocks are already
                        represented by an existing page / catalog has_page

This script is read-only with respect to the site; it never edits pages.
"""

import csv
import os
import re
import sys
from pathlib import Path

# --- Repo-root resolution (works locally and in CI) -----------------------
SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent

OPPORTUNITIES_CSV = REPO / "data" / "library_opportunities.csv"
CATEGORIES_YAML = REPO / "data" / "categories.yaml"
LIBRARY_DIR = REPO / "library"
AUDIT_OUT = REPO / "data" / "library_opportunities_audit.csv"

# Tokens that carry no discriminating intent and should be ignored when
# comparing keywords / titles for overlap.
STOPWORDS = {
    "copy", "paste", "and", "the", "a", "an", "to", "for", "of", "with",
    "symbol", "symbols", "character", "characters", "text", "unicode",
    "emoji", "emojis", "sign", "signs", "free", "online", "generator",
}

TITLE_TAG_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
DATA_SYMBOL_RE = re.compile(r'data-symbol="([^"]+)"')
# Matches "U+2600..U+26FF" or "U+2600" inside a unicode_blocks free-text field.
RANGE_RE = re.compile(r"U\+([0-9A-Fa-f]{1,6})(?:\s*\.\.\s*U\+([0-9A-Fa-f]{1,6}))?")


def normalize(text):
    """Lowercase, strip HTML entities/punctuation, collapse whitespace."""
    text = re.sub(r"&[a-z]+;", " ", text or "")
    text = re.sub(r"[^a-z0-9]+", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text):
    return {t for t in normalize(text).split() if t and t not in STOPWORDS}


def parse_ranges(blocks_field):
    """Return a list of (start, end) codepoint tuples from a blocks field."""
    ranges = []
    for m in RANGE_RE.finditer(blocks_field or ""):
        start = int(m.group(1), 16)
        end = int(m.group(2), 16) if m.group(2) else start
        if end < start:
            start, end = end, start
        ranges.append((start, end))
    return ranges


# --- Optional YAML catalog -------------------------------------------------
def load_categories():
    """
    Load data/categories.yaml if present. Returns a list of dicts with at
    least 'slug', 'range' (start,end), and 'has_page'. Degrades gracefully
    if PyYAML is unavailable or the file is missing.
    """
    if not CATEGORIES_YAML.exists():
        return []
    try:
        import yaml  # type: ignore
    except ImportError:
        sys.stderr.write(
            "[warn] PyYAML not installed; skipping categories.yaml block "
            "coverage checks. Install with `pip install pyyaml`.\n"
        )
        return []
    try:
        data = yaml.safe_load(CATEGORIES_YAML.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - defensive
        sys.stderr.write(f"[warn] could not parse categories.yaml: {exc}\n")
        return []

    cats = []
    for cat in (data or {}).get("categories", []) or []:
        rng = parse_ranges(cat.get("range", "") or "")
        cats.append(
            {
                "slug": cat.get("slug", ""),
                "ranges": rng,
                "has_page": bool(cat.get("has_page")),
                "page_path": cat.get("page_path"),
            }
        )
    return cats


# --- Existing published library pages -------------------------------------
def scan_existing_pages():
    """
    Walk library/*/index.html. Returns a dict keyed by slug with the page's
    normalized title, keyword tokens, and the set of codepoints it copies
    (derived from data-symbol attributes).
    """
    pages = {}
    if not LIBRARY_DIR.is_dir():
        return pages
    for index_path in sorted(LIBRARY_DIR.glob("*/index.html")):
        slug = index_path.parent.name
        html = index_path.read_text(encoding="utf-8", errors="replace")

        m = TITLE_TAG_RE.search(html)
        title = m.group(1).strip() if m else ""

        codepoints = set()
        for sym in DATA_SYMBOL_RE.findall(html):
            for ch in sym:
                codepoints.add(ord(ch))

        pages[slug] = {
            "title": title,
            "title_norm": normalize(title),
            "tokens": tokenize(slug.replace("-", " ") + " " + title),
            "codepoints": codepoints,
        }
    return pages


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def covered_blocks(opp_ranges, pages, categories):
    """
    Return a list of human-readable reasons a declared block is already
    covered, either by an existing page's actual symbols or by a catalog
    entry already flagged has_page.
    """
    reasons = []
    for (start, end) in opp_ranges:
        # Existing page already copies symbols inside this range?
        for slug, page in pages.items():
            if any(start <= cp <= end for cp in page["codepoints"]):
                reasons.append(f"U+{start:04X}..U+{end:04X} in /library/{slug}/")
                break
        # Catalog already marks an overlapping block as having a page?
        for cat in categories:
            if not cat["has_page"]:
                continue
            for (cs, ce) in cat["ranges"]:
                if start <= ce and cs <= end:
                    reasons.append(
                        f"U+{start:04X}..U+{end:04X} overlaps catalog "
                        f"'{cat['slug']}' (has_page)"
                    )
                    break
    # De-duplicate while preserving order.
    seen = set()
    out = []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def main():
    if not OPPORTUNITIES_CSV.exists():
        sys.stderr.write(f"[error] missing {OPPORTUNITIES_CSV}\n")
        return 1

    pages = scan_existing_pages()
    categories = load_categories()

    with OPPORTUNITIES_CSV.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        opportunities = list(reader)
        fieldnames = reader.fieldnames or []

    existing_titles = {
        slug: p["title_norm"] for slug, p in pages.items() if p["title_norm"]
    }

    audit_fields = fieldnames + [
        "flag_dup_slug",
        "flag_dup_title",
        "flag_intent_overlap",
        "flag_blocks_covered",
        "audit_notes",
        "audit_verdict",
    ]

    rows_out = []
    counts = {"dup_slug": 0, "dup_title": 0, "intent_overlap": 0, "blocks_covered": 0}

    for opp in opportunities:
        slug = (opp.get("slug") or "").strip()
        title_norm = normalize(opp.get("title", ""))
        opp_tokens = tokenize(
            (slug.replace("-", " ") + " " + (opp.get("primary_keyword") or "")
             + " " + (opp.get("modifier") or ""))
        )
        opp_ranges = parse_ranges(opp.get("unicode_blocks", ""))

        notes = []

        # 1. Duplicate slug
        dup_slug = "yes" if slug and slug in pages else "no"
        if dup_slug == "yes":
            notes.append(f"slug '{slug}' already published")
            counts["dup_slug"] += 1

        # 2. Duplicate title
        dup_title_slug = None
        for ex_slug, ex_title in existing_titles.items():
            if title_norm and title_norm == ex_title:
                dup_title_slug = ex_slug
                break
        dup_title = "yes" if dup_title_slug else "no"
        if dup_title == "yes":
            notes.append(f"title matches /library/{dup_title_slug}/")
            counts["dup_title"] += 1

        # 3. Intent overlap (token similarity, excluding exact slug dup)
        overlap_hits = []
        for ex_slug, page in pages.items():
            if ex_slug == slug:
                continue
            score = jaccard(opp_tokens, page["tokens"])
            if score >= 0.5:
                overlap_hits.append((ex_slug, round(score, 2)))
        overlap_hits.sort(key=lambda x: x[1], reverse=True)
        intent_overlap = (
            "; ".join(f"{s}({sc})" for s, sc in overlap_hits[:3])
            if overlap_hits else "no"
        )
        if overlap_hits:
            notes.append(
                "intent overlap with " + ", ".join(s for s, _ in overlap_hits[:3])
            )
            counts["intent_overlap"] += 1

        # 4. Blocks already covered
        block_reasons = covered_blocks(opp_ranges, pages, categories)
        blocks_covered = "; ".join(block_reasons) if block_reasons else "no"
        if block_reasons:
            notes.append(f"{len(block_reasons)} declared block(s) already covered")
            counts["blocks_covered"] += 1

        # Verdict
        if dup_slug == "yes" or dup_title == "yes":
            verdict = "reject-duplicate"
        elif overlap_hits or block_reasons:
            verdict = "review-overlap"
        else:
            verdict = "clear"

        out = dict(opp)
        out["flag_dup_slug"] = dup_slug
        out["flag_dup_title"] = dup_title
        out["flag_intent_overlap"] = intent_overlap
        out["flag_blocks_covered"] = blocks_covered
        out["audit_notes"] = "; ".join(notes)
        out["audit_verdict"] = verdict
        rows_out.append(out)

    AUDIT_OUT.parent.mkdir(parents=True, exist_ok=True)
    with AUDIT_OUT.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=audit_fields)
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Audited {len(opportunities)} opportunit(ies) against "
          f"{len(pages)} existing library pages "
          f"and {len(categories)} catalog blocks.")
    print("Flags: "
          f"dup_slug={counts['dup_slug']}, "
          f"dup_title={counts['dup_title']}, "
          f"intent_overlap={counts['intent_overlap']}, "
          f"blocks_covered={counts['blocks_covered']}")
    print(f"Wrote {AUDIT_OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
