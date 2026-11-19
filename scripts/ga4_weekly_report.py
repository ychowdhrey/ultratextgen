#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GA4 weekly report — reads the evidence, reports what changed.

Consumes only files `ga4_snapshot.py` already wrote (plus the repo tree and the
intent register) and writes a dated markdown report to
`data/ga4/reports/<until>.md` + `latest.md`. Network-free and side-effect-free
apart from that one file, so it can be re-run on any snapshot.

Four questions, in the order they are useful:

  1. **Newly discovered page families** — a (locale, page_type) pair taking
     traffic that the previous snapshot had not seen. This is the "unclassified
     is a signal" idea applied to live traffic rather than merged PRs.
  2. **Cross-locale performance** — which locales serve a slug, and how each
     does, so a lane can see where its measured return actually is.
  3. **Unserved demand** — paths taking sessions with no page file in this
     checkout.
  4. **Candidates for validation** — cross-locale gaps worth a human look.

**What this deliberately does not do.** It never promotes anything, never
writes to a register or ledger, and never treats traffic as authorization to
build. `CLAUDE.md` is explicit that volume alone is never justification and that
one query gets one page; a candidate here is an argument to go *look*, and the
decision stays with a person. Every candidate row is phrased that way.

Usage:
    python3 scripts/ga4_weekly_report.py
    python3 scripts/ga4_weekly_report.py --ga4-dir data/ga4 --repo-root .
"""

import argparse
import csv
import glob
import json
import os
import sys
from collections import defaultdict

# A candidate needs enough measured demand that a human look is worth the time.
# Deliberately not a "build this" threshold -- see the module docstring.
MIN_SESSIONS_FOR_CANDIDATE = 150

# How many locales count as "top" when looking for a gap.
TOP_LOCALE_COUNT = 8


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def read_json(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return None


def as_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def page_exists(repo_root, path):
    """
    Is there a page file in this checkout for this URL path?

    A "no" is not proof of a 404: the site also serves redirects (`_redirects`)
    and one middleware function, so an absent file may still resolve. The
    report says so rather than claiming a broken page.
    """
    clean = (path or "/").strip("/")
    if not clean:
        return os.path.exists(os.path.join(repo_root, "index.html"))
    candidate = os.path.join(repo_root, *clean.split("/"))
    return (os.path.exists(os.path.join(candidate, "index.html"))
            or os.path.exists(candidate + ".html"))


def previous_snapshot(ga4_dir, current_until):
    """The newest dated snapshot older than the current one, or None."""
    dated = sorted(glob.glob(os.path.join(ga4_dir, "snapshots", "*.json")))
    earlier = [p for p in dated
               if os.path.basename(p)[:-5] < (current_until or "")]
    return read_json(earlier[-1]) if earlier else None


def _path_of(url):
    """Absolute site URL -> '/a/b/' path, or '' if it is not one of ours."""
    if not isinstance(url, str) or "ultratextgen.com" not in url:
        return ""
    path = url.split("ultratextgen.com", 1)[1].split("?", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    return path if path.endswith("/") else path + "/"


def _locale_of(path):
    """'/ko/font-byeonhwan/' -> 'ko'; a root-level path -> 'en'."""
    segments = [s for s in path.split("/") if s]
    if segments and len(segments[0]) <= 5 and "-" not in segments[0][:2]:
        head = segments[0]
        if len(head) == 2 or (len(head) == 5 and head[2] == "-"):
            return head
    return "en"


def load_intent_registry(path):
    """
    canonical_intents.json -> [{id, scope, locales: {locale: path}}].

    Locale is read off each page's own URL rather than trusting a field, so a
    cluster whose members were added at different times still resolves.
    """
    data = read_json(path)
    if not data:
        return []
    registry = []
    for intent in data.get("intents") or []:
        intent_id = intent.get("id")
        if not intent_id:
            continue
        locales = {}
        urls = list(intent.get("pages") or [])
        urls += list((intent.get("localeOwners") or {}).values())
        for url in urls:
            page_path = _path_of(url)
            if page_path:
                locales.setdefault(_locale_of(page_path), page_path)
        if locales:
            registry.append({"id": intent_id, "scope": intent.get("scope", ""),
                             "locales": locales})
    return registry


def registry_paths(registry):
    """Every page path the register names."""
    return {path for intent in registry for path in intent["locales"].values()}


def families_of(rows):
    """{(locale, page_type): views} from page_performance rows."""
    families = defaultdict(int)
    for row in rows:
        families[(row["locale"], row["page_type"])] += as_int(
            row["screen_page_views"])
    return families


def build_report(ga4_dir, repo_root, window_sessions_by_path, intents_path):
    snapshot = read_json(os.path.join(ga4_dir, "latest.json")) or {}
    window = snapshot.get("window", {})
    until = window.get("until") or ""
    pages = read_csv(os.path.join(ga4_dir, "page_performance.csv"))
    locales = read_csv(os.path.join(ga4_dir, "locale_performance.csv"))

    current = families_of(pages)
    previous = previous_snapshot(ga4_dir, until)
    known = set()
    if previous:
        known = {(f["locale"], f["page_type"])
                 for f in previous.get("families", [])}

    lines = [
        "# GA4 weekly report — {} to {}".format(window.get("since"), until),
        "",
        "Property `{}` · fetched `{}` · generated by "
        "`scripts/ga4_weekly_report.py`".format(
            snapshot.get("property_id"), snapshot.get("fetched_at")),
        "",
        "> **Evidence, not authorization.** Nothing here promotes a page, a "
        "slug or an intent. A candidate below is a reason for a person to go "
        "look; measured traffic is never on its own a reason to build "
        "(`CLAUDE.md`: volume alone is never justification, one query gets one "
        "page). This report writes no register and no ledger.",
        "",
    ]

    # --- 1. Newly discovered page families -------------------------------
    lines += ["## 1. Newly discovered page families", ""]
    if not previous:
        lines += [
            "No earlier snapshot exists, so this run is the **baseline**: all "
            "{} (locale, page_type) families below are recorded for the first "
            "time and none can yet be called *new*. The next run compares "
            "against this one.".format(len(current)),
            "",
            "| Locale | Page type | Views |",
            "|---|---|---|",
        ]
        for (locale, page_type), views in sorted(
                current.items(), key=lambda kv: -kv[1])[:25]:
            lines.append("| `{}` | `{}` | {:,} |".format(locale, page_type, views))
        if len(current) > 25:
            lines.append("")
            lines.append("_{} further families omitted from this table; all are "
                         "in `page_performance.csv`._".format(len(current) - 25))
    else:
        new_families = {k: v for k, v in current.items() if k not in known}
        if not new_families:
            lines.append("None. Every family taking traffic this week was "
                         "already present in the previous snapshot.")
        else:
            lines += [
                "{} family/families took traffic that the previous snapshot "
                "had not seen. A family appearing here is a **signal**: either "
                "a lane shipped without reaching `docs/README.md`, or traffic "
                "found a path nobody planned.".format(len(new_families)),
                "",
                "| Locale | Page type | Views | Page file in checkout? |",
                "|---|---|---|---|",
            ]
            for (locale, page_type), views in sorted(
                    new_families.items(), key=lambda kv: -kv[1]):
                sample = next((r["page_path"] for r in pages
                               if r["locale"] == locale
                               and r["page_type"] == page_type), "")
                lines.append("| `{}` | `{}` | {:,} | {} |".format(
                    locale, page_type, views,
                    "yes" if page_exists(repo_root, sample) else "**no**"))
    lines.append("")

    # --- 2. Cross-locale performance -------------------------------------
    lines += ["## 2. Cross-locale performance", "",
              "| Locale | Pages with traffic | Views | Sessions | Users |",
              "|---|---|---|---|---|"]
    for row in locales[:15]:
        lines.append("| `{}` | {:,} | {:,} | {:,} | {:,} |".format(
            row["locale"], as_int(row["pages"]),
            as_int(row["screen_page_views"]), as_int(row["sessions"]),
            as_int(row["active_users"])))
    lines.append("")

    # Which slugs are served in several locales, and how unevenly.
    by_slug = defaultdict(dict)
    for row in pages:
        if row["slug"]:
            by_slug[row["slug"]][row["locale"]] = as_int(
                row["screen_page_views"])
    multi = {slug: locs for slug, locs in by_slug.items() if len(locs) > 1}
    lines += [
        "{:,} slugs are served in more than one locale. The ten with the most "
        "total views, and how that splits:".format(len(multi)),
        "",
        "| Slug | Total views | Split by locale |",
        "|---|---|---|",
    ]
    for slug, locs in sorted(multi.items(),
                             key=lambda kv: -sum(kv[1].values()))[:10]:
        split = ", ".join("`{}` {:,}".format(loc, views) for loc, views in
                          sorted(locs.items(), key=lambda kv: -kv[1])[:6])
        lines.append("| `{}` | {:,} | {} |".format(
            slug, sum(locs.values()), split))
    lines.append("")

    # --- 3. Unserved demand ----------------------------------------------
    lines += ["## 3. Unserved demand", ""]
    unserved = [
        (path, sessions) for path, sessions in window_sessions_by_path.items()
        if sessions > 0 and not page_exists(repo_root, path)
    ]
    unserved.sort(key=lambda item: -item[1])
    if not unserved:
        lines.append("Every path taking sessions this week has a page file in "
                     "this checkout.")
    else:
        lines += [
            "{:,} paths took sessions with **no page file in this checkout** "
            "({:,} sessions in total). This is not proof of a 404 — the site "
            "also serves `_redirects` rules and one `functions/` middleware, so "
            "some of these resolve. Treat the list as "
            "\"explain each of these\", not \"fix each of these\".".format(
                len(unserved), sum(s for _, s in unserved)),
            "",
            "| Path | Sessions | Likely |",
            "|---|---|---|",
        ]
        for path, sessions in unserved[:20]:
            lines.append("| `{}` | {:,} | {} |".format(
                path, sessions, classify_unserved(path)))
        if len(unserved) > 20:
            lines.append("")
            lines.append("_{:,} more; full list is the `landing_page` column of "
                         "`daily/<month>-landing-pages.csv`._".format(
                             len(unserved) - 20))
    lines.append("")

    # --- 4. Candidates for validation ------------------------------------
    #
    # Deliberately intent-based, not slug-based. An earlier version of this
    # section guessed a translated path (`/ko/library/simbol-love/` for an
    # Indonesian slug) and asked whether a file existed there. That is
    # meaningless: the slug would itself be translated, English pages live at
    # the root rather than under `/en/`, and `CLAUDE.md` is explicit that a
    # page maps to a canonical *intent* that may originate in any language. A
    # gap is therefore only reported where the register can describe one.
    lines += ["## 4. Candidates for validation", ""]
    registry = load_intent_registry(intents_path)
    known_paths = registry_paths(registry)
    top_locales = [row["locale"] for row in locales[:TOP_LOCALE_COUNT]]
    views_by_path = {r["page_path"]: as_int(r["screen_page_views"]) for r in pages}

    gaps = []
    for intent in registry:
        served = intent["locales"]
        measured = {loc: views_by_path.get(path, 0)
                    for loc, path in served.items()}
        total = sum(measured.values())
        if total < MIN_SESSIONS_FOR_CANDIDATE:
            continue
        missing = [loc for loc in top_locales if loc not in served]
        if missing:
            gaps.append({"id": intent["id"], "total": total,
                         "served": measured, "missing": missing,
                         "scope": intent["scope"]})
    gaps.sort(key=lambda g: -g["total"])

    if not gaps:
        lines.append(
            "No registered intent reached {} views in this window with a gap "
            "in a top locale.".format(MIN_SESSIONS_FOR_CANDIDATE))
    else:
        lines += [
            "A **registered** intent carrying at least {} views in the window "
            "with no page in one or more top locales. **A shortlist to "
            "investigate, not a build queue.** Each row still needs the lane's "
            "own gate: a real query in the target language, a check that no "
            "existing page (including that locale's hub or homepage) already "
            "serves the job, and confirmation that the intent is the same job "
            "and not merely the same word. An intent whose scope is "
            "`locale-specific` is listed for completeness and will usually "
            "stay that way.".format(MIN_SESSIONS_FOR_CANDIDATE),
            "",
            "| Intent | Scope | Views | Served in | No page in |",
            "|---|---|---|---|---|",
        ]
        for gap in gaps[:15]:
            served = ", ".join(
                "`{}` {:,}".format(loc, views) for loc, views
                in sorted(gap["served"].items(), key=lambda kv: -kv[1]))
            lines.append("| `{}` | {} | {:,} | {} | {} |".format(
                gap["id"], gap["scope"], gap["total"], served,
                ", ".join("`" + loc + "`" for loc in gap["missing"][:6])))

    # The register covers a small slice of traffic on purpose, so the honest
    # second half of this section names what it cannot answer.
    unregistered = [(r["page_path"], as_int(r["screen_page_views"]))
                    for r in pages
                    if r["page_path"] not in known_paths
                    and as_int(r["screen_page_views"]) >= MIN_SESSIONS_FOR_CANDIDATE]
    unregistered.sort(key=lambda item: -item[1])
    lines += ["", "### Traffic the intent register cannot speak for", ""]
    if not unregistered:
        lines.append("None above the {}-view floor.".format(
            MIN_SESSIONS_FOR_CANDIDATE))
    else:
        lines += [
            "{} page(s) at or above {} views are named by no entry in the "
            "intent register. The register is partial by design -- it records "
            "clusters no English page can name -- so this is not a defect in "
            "it. It does mean the cross-locale question above **cannot be "
            "asked** for these pages, which include the site's highest-traffic "
            "surfaces. Registering an intent for them is the prerequisite for "
            "any cross-locale decision, and is a human decision rather than "
            "something this report should infer.".format(
                len(unregistered), MIN_SESSIONS_FOR_CANDIDATE),
            "",
            "| Page | Views |",
            "|---|---|",
        ]
        for path, views in unregistered[:15]:
            lines.append("| `{}` | {:,} |".format(path, views))
        if len(unregistered) > 15:
            lines.append("")
            lines.append("_{} more._".format(len(unregistered) - 15))

    lines.append("")
    return "\n".join(lines), until


def classify_unserved(path):
    """A cheap, honest guess at why a path has traffic but no file."""
    if any(ch in path for ch in ('"', ",", " ")):
        return "malformed URL (bot or bad inbound link)"
    if path.rstrip("/").endswith((".php", ".asp", ".env", ".git")):
        return "probe / scanner"
    if path.count("/") <= 2:
        return "removed or redirected page"
    return "removed, redirected, or middleware-served"


def window_sessions(ga4_dir, window):
    """
    Sessions per landing page for the report window, from the daily partitions.

    Read from the daily files rather than the window report because
    `page_performance.csv` is keyed on `pagePath` (every page view) while
    unserved demand is a question about *entry* points.
    """
    since, until = window.get("since"), window.get("until")
    if not since or not until:
        return {}
    totals = defaultdict(int)
    months = {since[:7], until[:7]}
    for month in sorted(months):
        path = os.path.join(ga4_dir, "daily",
                            "{}-landing-pages.csv".format(month))
        for row in read_csv(path):
            if since <= row["date"] <= until:
                totals[row["landing_page"]] += as_int(row["sessions"])
    return totals


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ga4-dir", default=os.path.join("data", "ga4"))
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--intents",
                    default=os.path.join("data", "canonical_intents.json"))
    args = ap.parse_args(argv)

    snapshot = read_json(os.path.join(args.ga4_dir, "latest.json"))
    if not snapshot:
        sys.stderr.write(
            "[error] no {}/latest.json -- run ga4_snapshot.py first\n".format(
                args.ga4_dir))
        return 1

    sessions_by_path = window_sessions(args.ga4_dir, snapshot.get("window", {}))
    if not sessions_by_path:
        sys.stderr.write(
            "[warn] no daily landing-page rows cover the snapshot window; "
            "section 3 (unserved demand) will be empty rather than wrong\n")

    report, until = build_report(args.ga4_dir, args.repo_root,
                                 sessions_by_path, args.intents)
    reports_dir = os.path.join(args.ga4_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    dated = os.path.join(reports_dir, "{}.md".format(until or "undated"))
    with open(dated, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(report)
    with open(os.path.join(reports_dir, "latest.md"), "w",
              encoding="utf-8", newline="\n") as handle:
        handle.write(report)
    sys.stderr.write("[ok] wrote {}\n".format(dated))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
