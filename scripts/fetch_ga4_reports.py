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

Usage:
    export GA4_PROPERTY_ID=123456789
    python3 scripts/fetch_ga4_reports.py > /tmp/ga4-bundle.json

    # explicit window (defaults to the last complete Mon-Sun week)
    python3 scripts/fetch_ga4_reports.py --since 2026-11-09 --until 2026-11-15
"""

import argparse
import datetime as dt
import json
import os
import sys

# Product events worth tracking over time. `unsave_style` is listed because the
# retention doc claims it is instrumented -- keeping it here makes its absence
# visible in the snapshot instead of silently assumed.
PRODUCT_EVENTS = ["copy_text", "save_style", "share_text", "unsave_style"]

PAGE_METRICS = ["screenPageViews", "sessions", "activeUsers", "userEngagementDuration"]


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
        dimension_filter=None, order_bys=None, limit=None):
    request = types.RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[types.Dimension(name=d) for d in dimensions],
        metrics=[types.Metric(name=m) for m in metrics],
        date_ranges=[types.DateRange(start_date=s, end_date=e) for s, e in date_ranges],
        limit=limit,
    )
    if dimension_filter is not None:
        request.dimension_filter = dimension_filter
    if order_bys:
        request.order_bys = order_bys
    response = client.run_report(request)
    return {
        "dimensions": list(dimensions),
        "metrics": list(metrics),
        "rows": _rows(response),
        "row_count": response.row_count,
        "sampled": bool(response.metadata.sampling_metadatas),
    }


def build_bundle(client, types, property_id, since, until, history_start, page_limit):
    window = [(since, until)]
    history = [(history_start, until)]

    def by_dim(name, desc=False):
        return [types.OrderBy(dimension=types.OrderBy.DimensionOrderBy(dimension_name=name), desc=desc)]

    def by_metric(name, desc=True):
        return [types.OrderBy(metric=types.OrderBy.MetricOrderBy(metric_name=name), desc=desc)]

    event_filter = types.FilterExpression(
        filter=types.Filter(
            field_name="eventName",
            in_list_filter=types.Filter.InListFilter(values=PRODUCT_EVENTS),
        )
    )

    reports = {}

    # --- Full-history series (cheap, few rows, backfills every past period) ---
    reports["weekly_totals"] = run(
        client, types, property_id, ["yearWeek"],
        ["screenPageViews", "sessions", "activeUsers", "newUsers"],
        history, order_bys=by_dim("yearWeek"), limit=500)

    reports["monthly_retention"] = run(
        client, types, property_id, ["yearMonth", "newVsReturning"],
        ["activeUsers"], history, order_bys=by_dim("yearMonth"), limit=500)

    reports["monthly_events"] = run(
        client, types, property_id, ["yearMonth", "eventName"],
        ["eventCount"], history, dimension_filter=event_filter,
        order_bys=by_dim("yearMonth"), limit=500)

    # --- Window detail (the part that accumulates week by week) ---
    reports["pages"] = run(
        client, types, property_id, ["pagePath"], PAGE_METRICS, window,
        order_bys=by_metric("screenPageViews"), limit=page_limit)

    reports["countries"] = run(
        client, types, property_id, ["country"],
        ["sessions", "activeUsers"], window,
        order_bys=by_metric("sessions"), limit=50)

    reports["events"] = run(
        client, types, property_id, ["eventName"], ["eventCount"], window,
        order_bys=by_metric("eventCount"), limit=100)

    reports["retention"] = run(
        client, types, property_id, ["newVsReturning"], ["activeUsers"], window)

    return {
        "meta": {
            "property_id": str(property_id),
            "window": {"since": since, "until": until},
            "history_start": history_start,
            "fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
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
                    help="start of the full-history series (GA4 clamps to property start)")
    ap.add_argument("--page-limit", type=int, default=500)
    args = ap.parse_args(argv)

    if not args.property:
        sys.stderr.write("[error] no property id: pass --property or set GA4_PROPERTY_ID\n")
        return 2

    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta import types
    except ImportError:
        sys.stderr.write(
            "[error] google-analytics-data is not installed\n"
            "        pip install google-analytics-data\n")
        return 2

    try:
        client = BetaAnalyticsDataClient()
        bundle = build_bundle(client, types, args.property, args.since, args.until,
                              args.history_start, args.page_limit)
    except Exception as exc:  # surface the API's own message, not a traceback
        sys.stderr.write(f"[error] GA4 Data API call failed: {type(exc).__name__}: {exc}\n")
        return 1

    json.dump(bundle, sys.stdout, indent=1, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
