#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GA4 snapshot normalizer (the deterministic half of the measurement track).

Reads the JSON bundle produced by `fetch_ga4_reports.py` on **stdin** and turns
it into the repo's GA4 evidence files under `data/ga4/`:

    snapshots/<until>.json   immutable per-window snapshot (never overwritten)
    latest.json              copy of the newest snapshot (stable path)
    <until>.md / latest.md   human summary for the audit logs
    weekly_totals.csv        full weekly history (complete restatement from GA4)
    monthly_retention.csv    full monthly new/returning history
    monthly_events.csv       full monthly product-event history
    page_performance.csv     window detail, keyed for joining the backlog
    locale_performance.csv   window detail aggregated by URL locale

`page_performance.csv` is keyed `locale` + `page_type` + `slug`, so measured
traffic joins onto `data/library_page_specs/*.json` by slug and onto a scored
opportunity row by the same keys the library lane already uses. That is what
lets a lane ask whether a shipped page actually earned traffic, rather than
trusting the search volume it was scored on.

Network-free by design, so it is unit-testable with a fixture
(`scripts/test_ga4_snapshot.py`).

Usage:
    python3 scripts/fetch_ga4_reports.py \
      | python3 scripts/ga4_snapshot.py --out-dir data/ga4
"""

import argparse
import csv
import datetime as dt
import json
import os
import re
import shutil
import sys

# Site sections, used only to stop a short section name from being read as a
# locale. Page types are discovered from the path (see `split_path`), so this
# set never needs to grow for a new namespace -- only for a new *two-letter*
# section that would otherwise look like a language code.
SECTION_DIRS = {
    "library", "category", "answers", "usecase", "guide", "about", "contact",
    "privacy", "terms", "embed", "pinterest", "discord", "instagram", "x",
    "youtube", "tiktok", "snapchat", "telegram", "whatsapp", "facebook",
    "linkedin", "roblox", "symbol", "assets", "js", "data", "locales",
    "functions",
}

# Locale-looking segment: `id`, `pt`, `zh-tw`. Checked against SECTION_DIRS
# first so `/x/` (the Twitter page) is never mistaken for a locale. Matching by
# shape rather than a hardcoded list means locales added to the site after this
# script was written are classified correctly without a code change.
LOCALE_RE = re.compile(r"^[a-z]{2}(-[a-z]{2,4})?$")

DEFAULT_LOCALE = "en"

# Dates on which a metric's *definition* changed, so counts either side are not
# comparable. Trending straight through one of these reads a definition change
# as a traffic change -- the exact mistake these rows exist to prevent. Both are
# the repo's own recorded decisions, not guesses:
#   2026-11-08  typed text left the address bar, so GA4 stopped counting
#               history-rewrite page views (~2.4 -> ~1.4 page_view/session with
#               ad impressions and copy_text flat).
#               docs/architecture/copy-share-save.md
#   2026-09-13  share_text began firing on success instead of intent.
#               .claude/rules/copy-share-analytics.md
METRIC_BOUNDARIES = [
    {
        "date": "2026-11-08",
        "metrics": ["screenPageViews", "page_view", "pages_per_session"],
        "why": "typed text left the address bar; history-rewrite page views "
               "are no longer counted",
    },
    {
        "date": "2026-09-13",
        "metrics": ["share_text"],
        "why": "share_text fires on success, not on intent",
    },
]

# GA4's `yearWeek` buckets run Sunday->Saturday, and week 01 begins on the
# Sunday on or before 1 January. Verified against the property: 202646 covers
# 2026-11-08..14. The window reports use explicit Mon-Sun dates instead, so the
# two grains differ by design -- hence the labelling below rather than an
# assumed alignment.
def ga4_week_range(year_week):
    """'202646' -> (date(2026,11,8), date(2026,11,14)), or None if unparseable."""
    text = str(year_week or "")
    if len(text) != 6 or not text.isdigit():
        return None
    year, week = int(text[:4]), int(text[4:])
    if not 1 <= week <= 54:
        return None
    jan1 = dt.date(year, 1, 1)
    # weekday(): Mon=0..Sun=6, so this steps back to the Sunday on/before Jan 1.
    first_sunday = jan1 - dt.timedelta(days=(jan1.weekday() + 1) % 7)
    start = first_sunday + dt.timedelta(weeks=week - 1)
    return start, start + dt.timedelta(days=6)


def pageview_definition(year_week, boundary="2026-11-08"):
    """Label a GA4 week relative to the page-view definition change."""
    span = ga4_week_range(year_week)
    if span is None:
        return "unknown"
    start, end = span
    cutover = dt.date(*(int(part) for part in boundary.split("-")))
    if end < cutover:
        return "pre-" + boundary
    # A week containing the cutover day is contaminated, not "post": the deploy
    # day itself recorded a mid-transition value (1.75 page_view/session against
    # ~2.4 before and ~1.4 after), so only a week starting strictly after it is
    # clean.
    if start > cutover:
        return "post-" + boundary
    return "spans-" + boundary



def iso_date(compact):
    """GA4 'date' dimension is YYYYMMDD; return YYYY-MM-DD, or '' if unparseable."""
    text = str(compact or "")
    if len(text) != 8 or not text.isdigit():
        return ""
    return text[:4] + "-" + text[4:6] + "-" + text[6:]


def normalize_path(value):
    """
    GA4 reports a landing page with or without its trailing slash and
    sometimes with a query string. Collapse to '/a/b/' so the same page is one
    row and joins to a register entry.
    """
    text = str(value or "").strip()
    if not text or text in ("(not set)", "(other)"):
        return text
    text = text.split("?", 1)[0].split("#", 1)[0]
    if not text.startswith("/"):
        text = "/" + text
    if not text.endswith("/"):
        text += "/"
    return text


def load_intents(path):
    """
    canonical_intents.json -> {page path: intent id}.

    The register is deliberately partial (it records clusters that no English
    page can name), so most paths will not be in it. Callers must keep
    unmatched rows rather than dropping them.
    """
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return {}
    mapping = {}

    def record(url, intent_id):
        if not isinstance(url, str) or "ultratextgen.com" not in url:
            return
        mapping[normalize_path(url.split("ultratextgen.com", 1)[1])] = intent_id

    for intent in data.get("intents") or []:
        intent_id = intent.get("id")
        if not intent_id:
            continue
        for url in intent.get("pages") or []:
            record(url, intent_id)
        for url in (intent.get("localeOwners") or {}).values():
            record(url, intent_id)
        record(intent.get("xDefault"), intent_id)
    return mapping


def fetched_range(bundle, entries):
    """
    The date range this run actually asked GA4 for: [daily_since, until].

    Rows inside it are authoritative (GA4 restates recent days, so they are
    replaced); rows outside it were recorded by earlier runs and must be kept.
    Falls back to the span of the fetched rows for a bundle without metadata.
    """
    meta = bundle.get("meta", {}) or {}
    lo = meta.get("daily_since") or ""
    hi = (meta.get("window", {}) or {}).get("until") or ""
    dates = [e["date"] for e in entries]
    if not lo and dates:
        lo = min(dates)
    if not hi and dates:
        hi = max(dates)
    return lo, hi


def merge_dated_csv(path, fieldnames, entries, lo, hi):
    """
    Write `entries` into a dated CSV without discarding history.

    An earlier version overwrote the file with only the fetched rows. With the
    default 35-day daily window that cut the partial month and daily_totals.csv
    down to the trailing window on the first real CI run (7,922 recorded lines
    gone in one commit, restored from git). Existing rows dated inside
    [lo, hi] are replaced by the fresh fetch; all others are kept.
    """
    kept = []
    if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                day = row.get("date", "")
                if not day or not (lo <= day <= hi):
                    kept.append(row)

    def order(row):
        try:
            sessions = float(row.get("sessions", 0) or 0)
        except (TypeError, ValueError):
            sessions = 0.0
        return (row.get("date", ""), -sessions)

    write_csv(path, fieldnames, sorted(kept + list(entries), key=order))


def write_daily_partitions(bundle, out_dir, intents):
    """
    Daily detail, partitioned by month.

    Partitioned because these files are restated on every run: a single
    78k-row landing-page file would rewrite ~6MB each week, while a month
    partition only churns the month in progress. Each closed month's file
    stops changing, which is what makes the history auditable.
    """
    daily_dir = os.path.join(out_dir, "daily")
    os.makedirs(daily_dir, exist_ok=True)
    written = {}

    def partition(report, fields, build):
        buckets = {}
        idx = index_metrics(bundle, report)
        for row in rows_of(bundle, report):
            date = iso_date(dim(row, 0))
            if not date:
                continue
            buckets.setdefault(date[:7], []).append(build(row, idx, date))
        lo, hi = fetched_range(bundle, [e for b in buckets.values() for e in b])
        for month, entries in sorted(buckets.items()):
            name = "{}-{}.csv".format(month, report.replace("daily_", "")
                                     .replace("_", "-"))
            merge_dated_csv(os.path.join(daily_dir, name), fields, entries,
                            lo, hi)
            written[name] = len(entries)

    def landing(row, idx, date):
        path = normalize_path(dim(row, 1))
        locale, page_type, slug = split_path(path)
        intent_id = intents.get(path, "")
        return {
            "date": date,
            "landing_page": path,
            "locale": locale,
            "page_type": page_type,
            "slug": slug,
            # Empty when the register does not name this path. The register is
            # partial by design, so "" means unmapped, never "no demand".
            "intent_id": intent_id,
            "intent_mapped": "yes" if intent_id else "no",
            "sessions": pick(row, idx, "sessions"),
            "screen_page_views": pick(row, idx, "screenPageViews"),
            "user_engagement_seconds": pick(row, idx, "userEngagementDuration"),
        }

    partition("daily_landing_pages",
              ["date", "landing_page", "locale", "page_type", "slug",
               "intent_id", "intent_mapped", "sessions", "screen_page_views",
               "user_engagement_seconds"],
              landing)

    partition("daily_country",
              ["date", "country", "sessions", "active_users"],
              lambda row, idx, date: {
                  "date": date, "country": dim(row, 1),
                  "sessions": pick(row, idx, "sessions"),
                  "active_users": pick(row, idx, "activeUsers")})

    partition("daily_source_medium",
              ["date", "source_medium", "sessions", "active_users"],
              lambda row, idx, date: {
                  "date": date, "source_medium": dim(row, 1),
                  "sessions": pick(row, idx, "sessions"),
                  "active_users": pick(row, idx, "activeUsers")})

    partition("daily_events",
              ["date", "event_name", "event_count"],
              lambda row, idx, date: {
                  "date": date, "event_name": dim(row, 1),
                  "event_count": pick(row, idx, "eventCount"),
                  "sessions": 0})

    # Daily totals stay a single file: one row a day is small, and a continuous
    # series is easier to read than 10 partitions.
    totals_idx = index_metrics(bundle, "daily_totals")
    totals = []
    for row in rows_of(bundle, "daily_totals"):
        date = iso_date(dim(row, 0))
        if not date:
            continue
        users = pick(row, totals_idx, "activeUsers")
        engagement = pick(row, totals_idx, "userEngagementDuration")
        totals.append({
            "date": date,
            "sessions": pick(row, totals_idx, "sessions"),
            "screen_page_views": pick(row, totals_idx, "screenPageViews"),
            "active_users": users,
            "new_users": pick(row, totals_idx, "newUsers"),
            "avg_engagement_seconds": round(engagement / users, 1) if users else 0.0,
            "publisher_ad_impressions": pick(row, totals_idx,
                                             "publisherAdImpressions"),
        })
    lo, hi = fetched_range(bundle, totals)
    merge_dated_csv(os.path.join(out_dir, "daily_totals.csv"),
                    ["date", "sessions", "screen_page_views", "active_users",
                     "new_users", "avg_engagement_seconds",
                     "publisher_ad_impressions"],
                    totals, lo, hi)
    written["daily_totals.csv"] = len(totals)
    return written

def split_path(page_path):
    """
    pagePath -> (locale, page_type, slug).

    The first segment of a nested path *is* its page type, whether or not this
    script has heard of it. That way a namespace added to the site after this
    was written (`/symbol/` arrived this way) shows up under its real name in
    the evidence instead of being silently bucketed as "other" -- which is the
    signal the weekly review is looking for.
    """
    segments = [s for s in (page_path or "").split("/") if s]
    locale = DEFAULT_LOCALE
    if segments and segments[0] not in SECTION_DIRS and LOCALE_RE.match(segments[0]):
        locale = segments[0]
        segments = segments[1:]
    if not segments:
        return locale, "home", ""
    if len(segments) == 1:
        return locale, "root", segments[0]
    return locale, segments[0], segments[-1]


def as_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def rows_of(bundle, name):
    return (bundle.get("reports", {}).get(name) or {}).get("rows", []) or []


def index_metrics(bundle, name):
    """metric name -> column index, for the named report."""
    metrics = (bundle.get("reports", {}).get(name) or {}).get("metrics", []) or []
    return {m: i for i, m in enumerate(metrics)}


def pick(row, idx, metric):
    i = idx.get(metric)
    values = row.get("m", [])
    return as_int(values[i]) if i is not None and i < len(values) else 0


def pick_float(row, idx, metric):
    i = idx.get(metric)
    values = row.get("m", [])
    if i is None or i >= len(values):
        return 0.0
    try:
        return float(values[i])
    except (TypeError, ValueError):
        return 0.0


def dim(row, position):
    values = row.get("d", [])
    return values[position] if position < len(values) else ""


def build_pages(bundle):
    idx = index_metrics(bundle, "pages")
    pages = []
    for row in rows_of(bundle, "pages"):
        path = dim(row, 0)
        locale, page_type, slug = split_path(path)
        users = pick(row, idx, "activeUsers")
        engagement = pick(row, idx, "userEngagementDuration")
        pages.append({
            "page_path": path,
            "locale": locale,
            "page_type": page_type,
            "slug": slug,
            "screen_page_views": pick(row, idx, "screenPageViews"),
            "sessions": pick(row, idx, "sessions"),
            "active_users": users,
            # GA4's "average engagement time" = engagement seconds / active users
            "avg_engagement_seconds": round(engagement / users, 1) if users else 0.0,
        })
    return pages


def aggregate_locales(pages):
    buckets = {}
    for page in pages:
        bucket = buckets.setdefault(page["locale"], {
            "locale": page["locale"], "pages": 0, "screen_page_views": 0,
            "sessions": 0, "active_users": 0,
        })
        bucket["pages"] += 1
        bucket["screen_page_views"] += page["screen_page_views"]
        bucket["sessions"] += page["sessions"]
        bucket["active_users"] += page["active_users"]
    return sorted(buckets.values(), key=lambda b: -b["screen_page_views"])


def aggregate_families(pages):
    """Every (locale, page_type) pair that took traffic, biggest first."""
    buckets = {}
    for page in pages:
        key = (page["locale"], page["page_type"])
        bucket = buckets.setdefault(key, {
            "locale": page["locale"], "page_type": page["page_type"],
            "pages": 0, "screen_page_views": 0,
        })
        bucket["pages"] += 1
        bucket["screen_page_views"] += page["screen_page_views"]
    return sorted(buckets.values(), key=lambda b: -b["screen_page_views"])


def returning_share(new_count, returning_count):
    total = new_count + returning_count
    return round(100.0 * returning_count / total, 1) if total else 0.0


def build_snapshot(bundle):
    meta = bundle.get("meta", {})
    window = meta.get("window", {})
    pages = build_pages(bundle)
    pages_report = bundle.get("reports", {}).get("pages") or {}
    pages_available = as_int(pages_report.get("row_count")) or len(pages)

    totals = {"screen_page_views": 0, "sessions": 0, "active_users": 0}
    for page in pages:
        for key in totals:
            totals[key] += page[key]

    retention_idx = index_metrics(bundle, "retention")
    new_users = returning_users = 0
    for row in rows_of(bundle, "retention"):
        label = dim(row, 0).lower()
        value = pick(row, retention_idx, "activeUsers")
        if label == "new":
            new_users = value
        elif label == "returning":
            returning_users = value

    events_idx = index_metrics(bundle, "events")
    events = {}
    for row in rows_of(bundle, "events"):
        events[dim(row, 0)] = pick(row, events_idx, "eventCount")

    tracked = meta.get("product_events", []) or []
    missing_events = [name for name in tracked if not events.get(name)]

    countries_idx = index_metrics(bundle, "countries")
    countries = [
        {
            "country": dim(row, 0),
            "sessions": pick(row, countries_idx, "sessions"),
            "active_users": pick(row, countries_idx, "activeUsers"),
        }
        for row in rows_of(bundle, "countries")
    ]

    sources_idx = index_metrics(bundle, "source_medium")
    sources = [
        {
            "source_medium": dim(row, 0),
            "sessions": pick(row, sources_idx, "sessions"),
            "active_users": pick(row, sources_idx, "activeUsers"),
        }
        for row in rows_of(bundle, "source_medium")
    ]

    # Ad delivery through the GA4 link: impressions only. Earnings are
    # confidential and this repository is public, so no revenue figure is read,
    # stored or rendered here, even if a bundle carries one.
    delivery_idx = index_metrics(bundle, "ad_delivery")
    delivery_rows = rows_of(bundle, "ad_delivery")
    delivery_row = delivery_rows[0] if delivery_rows else {"m": []}
    ad_delivery = {
        "publisher_ad_impressions": pick(delivery_row, delivery_idx,
                                         "publisherAdImpressions"),
    }

    copies = events.get("copy_text", 0)
    saves = events.get("save_style", 0)

    return {
        "window": {"since": window.get("since"), "until": window.get("until")},
        "property_id": meta.get("property_id"),
        "fetched_at": meta.get("fetched_at"),
        "totals": totals,
        "retention": {
            "new_users": new_users,
            "returning_users": returning_users,
            "returning_share_pct": returning_share(new_users, returning_users),
        },
        "events": events,
        # Events the repo believes are instrumented but that GA4 never received
        # in this window. Surfaced so the docs cannot drift from reality unseen.
        "missing_product_events": missing_events,
        "save_rate_pct_of_copies": round(100.0 * saves / copies, 2) if copies else 0.0,
        "ad_delivery": ad_delivery,
        "locales": aggregate_locales(pages),
        "countries": countries[:15],
        "sources": sources[:15],
        "top_pages": sorted(pages, key=lambda p: -p["screen_page_views"])[:25],
        "page_count": len(pages),
        # The fetcher's --page-limit can cut the long tail. Record what GA4 said
        # the true row count was, so a capped snapshot never reads as complete
        # coverage.
        "pages_available": pages_available,
        "pages_truncated": pages_available > len(pages),
        "comparability_boundaries": METRIC_BOUNDARIES,
        # Every (locale, page_type) family that took traffic. Recorded so the
        # next run can tell a genuinely new family from one it has already
        # seen, which is what makes "newly discovered" in the weekly report
        # mean anything.
        "families": aggregate_families(pages),
    }


def write_csv(path, fieldnames, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def write_history_csvs(bundle, out_dir, until=None):
    weekly_idx = index_metrics(bundle, "weekly_totals")
    weekly = []
    for row in rows_of(bundle, "weekly_totals"):
        year_week = dim(row, 0)
        span = ga4_week_range(year_week)
        # The newest bucket is almost always a part-week: GA4 reports it the
        # moment one day lands in it. Unflagged, a 1-day week reads as a traffic
        # collapse, so say plainly whether the week is finished.
        if span and until:
            complete = "yes" if str(span[1]) <= until else "no"
        else:
            complete = "unknown"
        weekly.append({
            "year_week": year_week,
            "week_start": str(span[0]) if span else "",
            "week_end": str(span[1]) if span else "",
            "week_complete": complete,
            "screen_page_views": pick(row, weekly_idx, "screenPageViews"),
            "sessions": pick(row, weekly_idx, "sessions"),
            "active_users": pick(row, weekly_idx, "activeUsers"),
            "new_users": pick(row, weekly_idx, "newUsers"),
            # Never trend screen_page_views across a change of label.
            "pageview_definition": pageview_definition(year_week),
        })
    write_csv(os.path.join(out_dir, "weekly_totals.csv"),
              ["year_week", "week_start", "week_end", "week_complete",
               "screen_page_views", "sessions", "active_users", "new_users",
               "pageview_definition"],
              sorted(weekly, key=lambda row: row["year_week"]))

    retention_idx = index_metrics(bundle, "monthly_retention")
    months = {}
    for row in rows_of(bundle, "monthly_retention"):
        month = dim(row, 0)
        label = dim(row, 1).lower()
        bucket = months.setdefault(
            month, {"year_month": month, "new_users": 0, "returning_users": 0})
        if label in ("new", "returning"):
            bucket[label + "_users"] = pick(row, retention_idx, "activeUsers")
    for bucket in months.values():
        bucket["returning_share_pct"] = returning_share(
            bucket["new_users"], bucket["returning_users"])
    write_csv(os.path.join(out_dir, "monthly_retention.csv"),
              ["year_month", "new_users", "returning_users", "returning_share_pct"],
              sorted(months.values(), key=lambda row: row["year_month"]))

    events_idx = index_metrics(bundle, "monthly_events")
    monthly_events = [
        {
            "year_month": dim(row, 0),
            "event_name": dim(row, 1),
            "event_count": pick(row, events_idx, "eventCount"),
        }
        for row in rows_of(bundle, "monthly_events")
    ]
    write_csv(os.path.join(out_dir, "monthly_events.csv"),
              ["year_month", "event_name", "event_count"],
              sorted(monthly_events,
                     key=lambda row: (row["year_month"], row["event_name"])))
    return weekly, months


def render_markdown(snapshot):
    window = snapshot["window"]
    totals = snapshot["totals"]
    retention = snapshot["retention"]
    known_users = retention["new_users"] + retention["returning_users"]
    lines = [
        "# GA4 snapshot - {} to {}".format(window["since"], window["until"]),
        "",
        "Property `{}` - fetched `{}`".format(
            snapshot["property_id"], snapshot["fetched_at"]),
        "",
        "| Metric | Value |",
        "|---|---|",
        "| Page views | {:,} |".format(totals["screen_page_views"]),
        "| Sessions | {:,} |".format(totals["sessions"]),
        "| Active users | {:,} |".format(totals["active_users"]),
        "| Returning share | {}% ({:,} of {:,}) |".format(
            retention["returning_share_pct"],
            retention["returning_users"], known_users),
        "| Save rate (saves / copies) | {}% |".format(
            snapshot["save_rate_pct_of_copies"]),
        "| Ad impressions | {:,} |".format(
            snapshot["ad_delivery"]["publisher_ad_impressions"]),
        "| Pages with traffic | {:,}{} |".format(
            snapshot["page_count"],
            " (capped; GA4 reported {:,})".format(snapshot["pages_available"])
            if snapshot["pages_truncated"] else ""),
        "",
        "## Product events",
        "",
        "| Event | Count |",
        "|---|---|",
    ]
    for name, count in sorted(snapshot["events"].items(), key=lambda kv: -kv[1]):
        lines.append("| `{}` | {:,} |".format(name, count))
    if snapshot["missing_product_events"]:
        missing = ", ".join("`" + name + "`"
                            for name in snapshot["missing_product_events"])
        lines += ["",
                  "**No data received for:** {} - either not instrumented or "
                  "not firing. Fix the code or the doc.".format(missing)]
    lines += ["", "## Comparability", "",
              "Definition changes recorded for this property. Do not compare a "
              "figure across one of these dates -- the count changed, not the "
              "behaviour.", "",
              "| Date | Affects | Why |", "|---|---|---|"]
    for boundary in snapshot.get("comparability_boundaries", []):
        lines.append("| {} | {} | {} |".format(
            boundary["date"], ", ".join("`" + m + "`" for m in boundary["metrics"]),
            boundary["why"]))
    lines += ["", "## Locale performance", "",
              "| Locale | Pages | Views | Sessions | Users |",
              "|---|---|---|---|---|"]
    for bucket in snapshot["locales"][:15]:
        lines.append("| `{}` | {:,} | {:,} | {:,} | {:,} |".format(
            bucket["locale"], bucket["pages"], bucket["screen_page_views"],
            bucket["sessions"], bucket["active_users"]))
    lines += ["", "## Acquisition", "",
              "| Source / medium | Sessions | Users |", "|---|---|---|"]
    for source in snapshot.get("sources", [])[:10]:
        lines.append("| `{}` | {:,} | {:,} |".format(
            source["source_medium"], source["sessions"],
            source["active_users"]))
    lines += ["", "## Top pages", "",
              "| Page | Views | Users | Avg engagement (s) |",
              "|---|---|---|---|"]
    for page in snapshot["top_pages"]:
        lines.append("| `{}` | {:,} | {:,} | {} |".format(
            page["page_path"], page["screen_page_views"],
            page["active_users"], page["avg_engagement_seconds"]))
    lines.append("")
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Normalize a GA4 bundle into data/ga4/.")
    ap.add_argument("--out-dir", default="data/ga4")
    ap.add_argument("--input", help="bundle JSON file (default: stdin)")
    ap.add_argument("--force", action="store_true",
                    help="allow overwriting an existing dated snapshot")
    ap.add_argument("--if-recorded", choices=("fail", "skip"), default="fail",
                    help="what to do when this window's dated snapshot already "
                         "exists. 'fail' (default) refuses and exits 1. 'skip' "
                         "leaves the recorded window untouched, still refreshes "
                         "the restated-in-full history and daily files, and "
                         "exits 0 with a [skip] line. Never rewrites a window; "
                         "--force is the only way to do that.")
    ap.add_argument("--intents",
                    default=os.path.join("data", "canonical_intents.json"),
                    help="canonical intent register to join landing pages against")
    args = ap.parse_args(argv)

    if args.input:
        with open(args.input, encoding="utf-8") as handle:
            raw = handle.read()
    else:
        raw = sys.stdin.read()
    raw = raw.strip()
    if not raw:
        sys.stderr.write("[error] expected a GA4 bundle JSON on stdin\n")
        return 1
    try:
        bundle = json.loads(raw)
    except json.JSONDecodeError as exc:
        sys.stderr.write("[error] bundle is not valid JSON: {}\n".format(exc))
        return 1
    if "reports" not in bundle:
        sys.stderr.write(
            "[error] bundle has no 'reports' key -- is this a fetcher bundle?\n")
        return 1

    snapshot = build_snapshot(bundle)
    until = snapshot["window"]["until"] or str(dt.date.today())

    snapshots_dir = os.path.join(args.out_dir, "snapshots")
    os.makedirs(snapshots_dir, exist_ok=True)
    dated_json = os.path.join(snapshots_dir, until + ".json")

    # Historical evidence is append-only: a dated snapshot records what GA4
    # said for that window and is never silently rewritten.
    recorded = os.path.exists(dated_json)
    if recorded and not args.force and args.if_recorded != "skip":
        sys.stderr.write(
            "[error] {} already exists; refusing to overwrite history.\n"
            "        Pass --force only if you intend to restate that window,\n"
            "        or --if-recorded skip to refresh the restated-in-full\n"
            "        files and leave the recorded window alone.\n"
            .format(dated_json))
        return 1
    skip_window = recorded and not args.force

    if not skip_window:
        with open(dated_json, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(snapshot, handle, indent=1, sort_keys=True)
            handle.write("\n")
        shutil.copyfile(dated_json, os.path.join(args.out_dir, "latest.json"))

        dated_md = os.path.join(args.out_dir, until + ".md")
        with open(dated_md, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(render_markdown(snapshot))
        shutil.copyfile(dated_md, os.path.join(args.out_dir, "latest.md"))

    # These are restated in full from GA4 on every run (they self-heal), so they
    # refresh even when the window's own snapshot is already recorded.
    write_history_csvs(bundle, args.out_dir, until=until)

    intents = load_intents(args.intents)
    partitions = write_daily_partitions(bundle, args.out_dir, intents)

    if not skip_window:
        pages = build_pages(bundle)
        write_csv(os.path.join(args.out_dir, "page_performance.csv"),
                  ["page_path", "locale", "page_type", "slug",
                   "screen_page_views", "sessions", "active_users",
                   "avg_engagement_seconds"],
                  sorted(pages, key=lambda page: -page["screen_page_views"]))
        write_csv(os.path.join(args.out_dir, "locale_performance.csv"),
                  ["locale", "pages", "screen_page_views", "sessions",
                   "active_users"],
                  aggregate_locales(pages))

    if skip_window:
        sys.stderr.write(
            "[skip] window {}..{} is already recorded in {}; its snapshot, "
            "page and locale files were left untouched. History and daily "
            "files were refreshed.\n".format(
                snapshot["window"]["since"], until, dated_json))
    else:
        sys.stderr.write(
            "[ok] snapshot {}..{}: {:,} views across {:,} pages -> {}\n".format(
                snapshot["window"]["since"], until,
                snapshot["totals"]["screen_page_views"],
                snapshot["page_count"], args.out_dir))
    sys.stderr.write("[ok] daily detail: {:,} rows across {} file(s)\n".format(
        sum(partitions.values()), len(partitions)))
    if not intents:
        sys.stderr.write(
            "[warn] intent register {} unreadable or empty -- landing pages are "
            "all recorded as unmapped rather than dropped\n".format(args.intents))
    if snapshot["missing_product_events"]:
        sys.stderr.write("[warn] no GA4 data for product events: {}\n".format(
            ", ".join(snapshot["missing_product_events"])))
    if snapshot["pages_truncated"]:
        sys.stderr.write(
            "[warn] page detail is capped: kept {:,} of {:,} rows GA4 reported. "
            "Raise --page-limit on the fetcher for full tail coverage.\n".format(
                snapshot["page_count"], snapshot["pages_available"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
