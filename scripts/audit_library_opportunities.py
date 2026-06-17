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

# Each opportunity row carries a `page_type` (the content lane); dedup is
# scoped to the published pages in that lane's namespace. Defaults to
# `library` for rows without the column (back-compat). See
# docs/unicode-library-workflow.md and docs/README.md.
DEFAULT_PAGE_TYPE = "library"
CONTENT_DIRS = {
    "library": REPO / "library",
    "category": REPO / "category",
    "answers": REPO / "answers",
    "usecase": REPO / "usecase",
    "guide": REPO / "guide",
}

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

# Forum-evidence scoring scale (also documented in
# docs/unicode-forum-research-skill.md). Feeds priority_score.
FORUM_EVIDENCE_SCORE = {
    "none": 0,
    "weak": 10,
    "medium": 15,
    "strong": 25,
}

# Copy patterns whose demand is socially discovered (TikTok, forums) rather than
# keyword search — see docs/emoji-combination-taxonomy.md §7. For these, the
# search-volume / demand-confidence gate misfires, so we waive it *provided*
# there is real social proof (forum_evidence at least 'medium'). Unproven combos
# (none/weak evidence) are still gated like anything else.
VOLUME_EXEMPT_PATTERNS = {"combo"}
VOLUME_EXEMPT_MIN_EVIDENCE = FORUM_EVIDENCE_SCORE["medium"]  # 15

# Intent-overlap similarity at/above this threshold is treated as a strong
# duplicate-risk signal, even without an exact slug/title match.
STRONG_OVERLAP_THRESHOLD = 0.6


def forum_evidence_score(value):
    """Map a forum_evidence label to its numeric score (unknown -> 0)."""
    return FORUM_EVIDENCE_SCORE.get((value or "").strip().lower(), 0)


def is_volume_exempt(copy_patterns, ev_score):
    """
    True when an opportunity's demand is socially discovered (a `combo` whose
    JTBD is "copy this whole arrangement") and it has at least 'medium' forum
    evidence. Such rows are waived from the keyword search-volume /
    demand-confidence gate, which only models acquisition search intent and
    misfires on socially-distributed combos. See
    docs/emoji-combination-taxonomy.md §7.
    """
    pattern = (copy_patterns or "").strip().lower()
    return pattern in VOLUME_EXEMPT_PATTERNS and ev_score >= VOLUME_EXEMPT_MIN_EVIDENCE


def is_blank(value):
    return value is None or str(value).strip() == ""


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


# --- Existing published pages (scoped per page_type) -----------------------
def scan_existing_pages(pages_dir):
    """
    Walk <pages_dir>/*/index.html. Returns a dict keyed by slug with the page's
    normalized title, keyword tokens, and the set of codepoints it copies
    (derived from data-symbol attributes).
    """
    pages = {}
    if not pages_dir.is_dir():
        return pages
    for index_path in sorted(pages_dir.glob("*/index.html")):
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


# Memoized per-page-type page scans, so each lane is walked at most once.
_PAGES_CACHE = {}
_TITLES_CACHE = {}


def get_pages(page_type):
    """Published pages for a page_type's namespace (memoized).

    Unknown page types fall back to the library lane so a typo can't silently
    disable dedup; the row is still checked against *some* published set.
    """
    pages_dir = CONTENT_DIRS.get(page_type)
    if pages_dir is None:
        sys.stderr.write(
            f"[warn] unknown page_type '{page_type}'; "
            f"defaulting dedup scope to '{DEFAULT_PAGE_TYPE}'.\n"
        )
        page_type = DEFAULT_PAGE_TYPE
        pages_dir = CONTENT_DIRS[DEFAULT_PAGE_TYPE]
    if page_type not in _PAGES_CACHE:
        _PAGES_CACHE[page_type] = scan_existing_pages(pages_dir)
    return _PAGES_CACHE[page_type]


def get_titles(page_type):
    """Normalized titles → slug for a page_type's published pages (memoized)."""
    if page_type not in _TITLES_CACHE:
        _TITLES_CACHE[page_type] = {
            slug: p["title_norm"]
            for slug, p in get_pages(page_type).items()
            if p["title_norm"]
        }
    return _TITLES_CACHE[page_type]


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def covered_blocks(opp_ranges, pages, categories, page_type=DEFAULT_PAGE_TYPE):
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
                reasons.append(f"U+{start:04X}..U+{end:04X} in /{page_type}/{slug}/")
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

    categories = load_categories()

    with OPPORTUNITIES_CSV.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        opportunities = list(reader)
        fieldnames = reader.fieldnames or []

    audit_fields = fieldnames + [
        "flag_dup_slug",
        "flag_dup_title",
        "flag_intent_overlap",
        "flag_blocks_covered",
        "flag_missing_forum_evidence",
        "flag_missing_search_volume",
        "flag_low_demand_confidence",
        "flag_strong_duplicate_risk",
        "forum_evidence_score",
        "audit_notes",
        "audit_verdict",
    ]

    rows_out = []
    counts = {
        "dup_slug": 0,
        "dup_title": 0,
        "intent_overlap": 0,
        "blocks_covered": 0,
        "missing_forum_evidence": 0,
        "missing_search_volume": 0,
        "low_demand_confidence": 0,
        "strong_duplicate_risk": 0,
        "volume_exempt_waived": 0,
    }

    for opp in opportunities:
        page_type = (opp.get("page_type") or DEFAULT_PAGE_TYPE).strip().lower()
        pages = get_pages(page_type)
        existing_titles = get_titles(page_type)
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
            notes.append(f"title matches /{page_type}/{dup_title_slug}/")
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
        block_reasons = covered_blocks(opp_ranges, pages, categories, page_type)
        blocks_covered = "; ".join(block_reasons) if block_reasons else "no"
        if block_reasons:
            notes.append(f"{len(block_reasons)} declared block(s) already covered")
            counts["blocks_covered"] += 1

        # 5. Missing / weak forum evidence
        evidence_raw = (opp.get("forum_evidence") or "").strip().lower()
        ev_score = forum_evidence_score(evidence_raw)
        # "Missing" means absent, blank, or explicitly 'none'.
        missing_forum = "yes" if evidence_raw in ("", "none") else "no"
        if missing_forum == "yes":
            notes.append("no forum evidence captured")
            counts["missing_forum_evidence"] += 1

        # Socially-discovered combos with real forum proof are waived from the
        # keyword search-volume / demand-confidence gate (see helper docstring).
        volume_exempt = is_volume_exempt(opp.get("copy_patterns"), ev_score)

        # 6. Missing search volume (blank or non-numeric)
        sv_raw = (opp.get("search_volume") or "").strip().replace(",", "")
        missing_sv = "no"
        if is_blank(sv_raw):
            missing_sv = "yes"
        else:
            try:
                float(sv_raw)
            except ValueError:
                missing_sv = "yes"
        if missing_sv == "yes" and volume_exempt:
            missing_sv = "no"
            notes.append("combo: search-volume gate waived "
                         "(socially-discovered, forum_evidence>=medium)")
            counts["volume_exempt_waived"] += 1
        elif missing_sv == "yes":
            notes.append("search volume missing or non-numeric")
            counts["missing_search_volume"] += 1

        # 7. Low demand confidence
        confidence = (opp.get("demand_confidence") or "").strip().lower()
        low_conf = "yes" if confidence == "low" else "no"
        if low_conf == "yes" and volume_exempt:
            low_conf = "no"
            notes.append("combo: demand-confidence gate waived "
                         "(socially-discovered)")
        elif low_conf == "yes":
            notes.append("demand confidence is low")
            counts["low_demand_confidence"] += 1

        # 8. Strong duplicate risk: exact slug/title match OR a high
        #    intent-overlap score against an existing page.
        strong_overlap = any(sc >= STRONG_OVERLAP_THRESHOLD for _, sc in overlap_hits)
        strong_dup = "yes" if (dup_slug == "yes" or dup_title == "yes"
                               or strong_overlap) else "no"
        if strong_dup == "yes":
            notes.append("strong duplicate risk")
            counts["strong_duplicate_risk"] += 1

        # Verdict
        if dup_slug == "yes" or dup_title == "yes":
            verdict = "reject-duplicate"
        elif strong_overlap or block_reasons or overlap_hits:
            verdict = "review-overlap"
        elif missing_forum == "yes" or missing_sv == "yes" or low_conf == "yes":
            verdict = "needs-research"
        else:
            verdict = "clear"

        out = dict(opp)
        out["flag_dup_slug"] = dup_slug
        out["flag_dup_title"] = dup_title
        out["flag_intent_overlap"] = intent_overlap
        out["flag_blocks_covered"] = blocks_covered
        out["flag_missing_forum_evidence"] = missing_forum
        out["flag_missing_search_volume"] = missing_sv
        out["flag_low_demand_confidence"] = low_conf
        out["flag_strong_duplicate_risk"] = strong_dup
        out["forum_evidence_score"] = ev_score
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
    print("Dedupe flags: "
          f"dup_slug={counts['dup_slug']}, "
          f"dup_title={counts['dup_title']}, "
          f"intent_overlap={counts['intent_overlap']}, "
          f"strong_duplicate_risk={counts['strong_duplicate_risk']}, "
          f"blocks_covered={counts['blocks_covered']}")
    print("Research flags: "
          f"missing_forum_evidence={counts['missing_forum_evidence']}, "
          f"missing_search_volume={counts['missing_search_volume']}, "
          f"low_demand_confidence={counts['low_demand_confidence']}, "
          f"combo_volume_waived={counts['volume_exempt_waived']}")
    print(f"Wrote {AUDIT_OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
