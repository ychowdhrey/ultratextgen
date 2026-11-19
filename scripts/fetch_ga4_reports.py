#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GA4 report fetcher (the network half of the measurement track).

Pulls the fixed set of reports the measurement track needs from the GA4 Data
API and writes them to **stdout** as a single JSON "bundle". The bundle is the
only thing `ga4_snapshot.py` consumes, which keeps that script network-free and
unit-testable with a fixture -- the same split `weekly_pr_digest.py` uses for
the infrastructure review (docs/README.md).

Auth is standard Google ADC: point `GOOGLE_APPLICATION_CREDENTIALS` at a
service-account key with **Viewer** on the property, or run in an environment
with ADC already configured. Credentials are never read, logged or echoed by
this script -- the client library resolves them.

Read-only: this calls `runReport` only. It cannot modify the property.

Two grains are fetched:
  * **window** reports -- one explicit Mon-Sun week, full page detail.
  * **daily** reports -- one row per day per dimension, for the trailing
    `--daily-days` (default 35). Pass `--daily-since` to backfill further;
    `--daily-since 2026-02-02` reaches this property's first day.

Usage:
    export GA4_PROPERTY_ID=123456789
    python3 scripts/fetch_ga4_reports.py > /tmp/ga4-bundle.json

    # full daily backfill
    python3 scripts/fetch_ga4_reports.py --daily-since 2026-02-02 \
      --page-limit 5000 > /tmp/ga4-bundle.json
"""

import argparse
import datetime as dt
import json
import os
import sys

# Product events worth tracking over time. `unsave_style` is listed because the
# saved-items module pushes it and its own test asserts it fires -- keeping it
# here makes its absence from GA4 visible instead of silently assumed.
PRODUCT_EVENTS = ["copy_text", "save_style", "share_text", "unsave_style"]

PAGE_METRICS = ["screenPageViews", "sessions", "activeUsers", "userEngagementDuration"]

# Revenue is AdSense, surfaced through the GA4 link. Kept on the daily totals
# because it is the only place a revenue figure can be read per day without
# leaving the property.
REVENUE_METRICS = ["totalAdRevenue", "publisherAdImpressions"]

# Rows per API request. The Data API caps a single response at 250k; paging at
# 100k keeps each response small enough to stream while still finishing the
# ~80k-row daily landing-page backfill in one or two calls.
PAGE_SIZE = 100000

# Safety stop for the paging loop, so a surprise in the API can never spin.
MAX_ROWS = 600000


def last_complete_week(today):
    """(monday, sunday) of the most recent fully-elapsed Mon-Sun week."""
    this_monday = today - dt.timedelta(days=today.weekday())
    last_monday = this_monday - dt.timedelta(days=7)
    return last_monday, last_monday + dt.timedelta(days=6)


def _rows(response):
    """Data API response -> compact [{d: [...], m: [...]}] rows."""
    return [
        {
            "d": [v.value for v in row.dimension_values],
            "m": [v.value for v in row.metric_values],
        }
        for row in response.rows
    ]


def run(client, types, property_id, dimensions, metrics, date_ranges,
        dimension_filter=None, order_bys=None, limit=None, paged=False):
    """
    One report. With paged=True, keeps requesting until every row GA4 says
    exists has been collected, so a large daily backfill is never silently
    truncated.
    """
    collected = []
    offset = 0
    row_count = 0
    sampled = False

    while True:
        request = types.RunReportRequest(
            property="properties/{}".format(property_id),
            dimensions=[types.Dimension(name=d) for d in dimensions],
            metrics=[types.Metric(name=m) for m in metrics],
            date_ranges=[types.DateRange(start_date=s, end_date=e)
                         for s, e in date_ranges],
            limit=PAGE_SIZE if paged else limit,
            offset=offset,
        )
        if dimension_filter is not None:
            request.dimension_filter = dimension_filter
        if order_bys:
            request.order_bys = order_bys

        response = client.run_report(request)
        row_count = response.row_count
        sampled = sampled or bool(response.metadata.sampling_metadatas)
        batch = _rows(response)
        collected.extend(batch)

        if not paged or not batch:
            break
        offset += len(batch)
        if offset >= row_count or offset >= MAX_ROWS:
            break

    return {
        "dimensions": list(dimensions),
        "metrics": list(metrics),
        "rows": collected,
        "row_count": row_count,
        "sampled": sampled,
    }


def build_bundle(client, types, property_id, since, until, history_start,
                 daily_since, page_limit, log=None):
    window = [(since, until)]
    history = [(history_start, until)]
    daily = [(daily_since, until)]

    def note(message):
        if log:
            log(message)

    def by_dim(name, desc=False):
        return [types.OrderBy(
            dimension=types.OrderBy.DimensionOrderBy(dimension_name=name),
            desc=desc)]

    def by_metric(name, desc=True):
        return [types.OrderBy(
            metric=types.OrderBy.MetricOrderBy(metric_name=name), desc=desc)]

    event_filter = types.FilterExpression(
        filter=types.Filter(
            field_name="eventName",
            in_list_filter=types.Filter.InListFilter(values=PRODUCT_EVENTS),
        )
    )

    reports = {}

    # --- Full-history aggregate series (cheap, few rows) ---
    reports["weekly_totals"] = run(
        client, types, property_id, ["yearWeek"],
        ["screenPageViews", "sessions", "activeUsers", "newUsers"],
        history, order_bys=by_dim("yearWeek"), limit=500)
    note("weekly_totals: {} rows".format(len(reports["weekly_totals"]["rows"])))

    reports["monthly_retention"] = run(
        client, types, property_id, ["yearMonth", "newVsReturning"],
        ["activeUsers"], history, order_bys=by_dim("yearMonth"), limit=500)

    reports["monthly_events"] = run(
        client, types, property_id, ["yearMonth", "eventName"],
        ["eventCount"], history, dimension_filter=event_filter,
        order_bys=by_dim("yearMonth"), limit=500)

    # --- Daily series: one row per day per dimension ---
    reports["daily_totals"] = run(
        client, types, property_id, ["date"],
        ["sessions", "screenPageViews", "activeUsers", "newUsers",
         "userEngagementDuration"] + REVENUE_METRICS,
        daily, order_bys=by_dim("date"), limit=PAGE_SIZE)
    note("daily_totals: {} rows".format(len(reports["daily_totals"]["rows"])))

    reports["daily_landing_pages"] = run(
        client, types, property_id, ["date", "landingPage"],
        ["sessions", "screenPageViews", "userEngagementDuration"],
        daily, order_bys=by_dim("date"), paged=True)
    note("daily_landing_pages: {} of {} rows".format(
        len(reports["daily_landing_pages"]["rows"]),
        reports["daily_landing_pages"]["row_count"]))

    reports["daily_country"] = run(
        client, types, property_id, ["date", "country"],
        ["sessions", "activeUsers"], daily, order_bys=by_dim("date"), paged=True)
    note("daily_country: {} rows".format(len(reports["daily_country"]["rows"])))

    reports["daily_source_medium"] = run(
        client, types, property_id, ["date", "sessionSourceMedium"],
        ["sessions", "activeUsers"], daily, order_bys=by_dim("date"), paged=True)
    note("daily_source_medium: {} rows".format(
        len(reports["daily_source_medium"]["rows"])))

    reports["daily_events"] = run(
        client, types, property_id, ["date", "eventName"],
        ["eventCount"], daily, order_bys=by_dim("date"), paged=True)
    note("daily_events: {} rows".format(len(reports["daily_events"]["rows"])))

    # --- Window detail ---
    reports["pages"] = run(
        client, types, property_id, ["pagePath"], PAGE_METRICS, window,
        order_bys=by_metric("screenPageViews"), limit=page_limit)
    note("pages: {} of {} rows".format(
        len(reports["pages"]["rows"]), reports["pages"]["row_count"]))

    reports["countries"] = run(
        client, types, property_id, ["country"],
        ["sessions", "activeUsers"], window,
        order_bys=by_metric("sessions"), limit=50)

    reports["source_medium"] = run(
        client, types, property_id, ["sessionSourceMedium"],
        ["sessions", "activeUsers"], window,
        order_bys=by_metric("sessions"), limit=50)

    reports["events"] = run(
        client, types, property_id, ["eventName"], ["eventCount"], window,
        order_bys=by_metric("eventCount"), limit=100)

    reports["retention"] = run(
        client, types, property_id, ["newVsReturning"], ["activeUsers"], window)

    reports["revenue"] = run(
        client, types, property_id, [], REVENUE_METRICS + ["totalRevenue"],
        window)

    return {
        "meta": {
            "property_id": str(property_id),
            "window": {"since": since, "until": until},
            "history_start": history_start,
            "daily_since": daily_since,
            "fetched_at": dt.datetime.now(dt.timezone.utc)
                            .strftime("%Y-%m-%dT%H:%M:%SZ"),
            "product_events": PRODUCT_EVENTS,
        },
        "reports": reports,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Fetch GA4 reports as a JSON bundle.")
    today = dt.date.today()
    default_since, default_until = last_complete_week(today)
    ap.add_argument("--property", default=os.environ.get("GA4_PROPERTY_ID"),
                    help="GA4 property id (default: $GA4_PROPERTY_ID)")
    ap.add_argument("--since", default=str(default_since))
    ap.add_argument("--until", default=str(default_until))
    ap.add_argument("--history-start", default=str(today - dt.timedelta(days=730)),
                    help="start of the aggregate history (GA4 clamps to property start)")
    ap.add_argument("--daily-since", default=None,
                    help="start of the daily series (default: --daily-days back)")
    ap.add_argument("--daily-days", type=int, default=35,
                    help="trailing days of daily detail when --daily-since is unset")
    ap.add_argument("--page-limit", type=int, default=500)
    ap.add_argument("--quiet", action="store_true",
                    help="suppress per-report progress on stderr")
    args = ap.parse_args(argv)

    if not args.property:
        sys.stderr.write("[error] no property id: pass --property or set GA4_PROPERTY_ID\n")
        return 2

    until_date = dt.date(*(int(p) for p in args.until.split("-")))
    daily_since = args.daily_since or str(until_date - dt.timedelta(days=args.daily_days))

    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta import types
    except ImportError:
        sys.stderr.write(
            "[error] google-analytics-data is not installed\n"
            "        pip install google-analytics-data\n")
        return 2

    log = None if args.quiet else (lambda m: sys.stderr.write("[fetch] " + m + "\n"))

    try:
        client = BetaAnalyticsDataClient()
        bundle = build_bundle(client, types, args.property, args.since,
                              args.until, args.history_start, daily_since,
                              args.page_limit, log=log)
    except Exception as exc:  # surface the API's own message, not a traceback
        sys.stderr.write("[error] GA4 Data API call failed: {}: {}\n".format(
            type(exc).__name__, exc))
        return 1

    json.dump(bundle, sys.stdout, indent=1, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
