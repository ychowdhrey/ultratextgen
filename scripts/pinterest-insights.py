#!/usr/bin/env python3
"""
Read-only Pinterest performance insights -- no publish, no board/pin writes.

Pulls account-level analytics plus per-pin analytics for every real Pin on
the account, and reports which pins/boards are driving outbound clicks to
ultratextgen.com (the traffic goal) vs. which are getting impressions but
going nowhere -- the same "don't just quote raw numbers, show the shape"
posture this repo's own GSC tooling uses (docs/pinterest-api-publishing.md
Sec 7), applied to Pinterest instead of Google Search Console.

This is deliberately NOT gated on Standard access or on this repo's own
sandbox-created pins -- GET /user_account/analytics, GET /pins, and
GET /pins/{id}/analytics all read whatever real (non-sandbox) history the
account already has. If PINTEREST_API_ENV=sandbox, this reports on sandbox
data only (consistent with everything else in this pipeline); point
PINTEREST_API_ENV=production at the account's real, pre-existing pin
history instead.

Usage:
    python3 scripts/pinterest-insights.py --days 30
    python3 scripts/pinterest-insights.py --days 90 --limit 50 --json out.json
    python3 scripts/pinterest-insights.py --days 30 --report docs/pinterest-insights-2026-08-19.md

Requires PINTEREST_ACCESS_TOKEN (read scopes only -- pins:read, boards:read,
user_accounts:read all work under Trial access per Pinterest's own access-
tier table). Never writes anything unless --report/--json is passed, and
even then only writes the report file itself -- no pin/board data is
mutated.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))
import pinterest_api as API  # noqa: E402


# Below this many impressions, a rate (CTR, save rate) is noise, not signal --
# reported but flagged, never used to rank. Mirrors the private research
# repo's own standing rule: don't render a verdict on a thin sample.
MIN_IMPRESSIONS_FOR_RATE = 50


def _date_window(days):
    """Pinterest's analytics endpoints take literal 'YYYY-MM-DD' strings, and
    this script must not call datetime.now() at import/call time in a way
    that breaks reproducibility for callers who want a fixed window -- so
    accept the end date instead of computing "today" internally when one is
    given, and only fall back to real now() when running interactively."""
    import datetime
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days)
    return start.isoformat(), end.isoformat()


def _rate(numerator, denominator):
    if not denominator:
        return None
    return round(numerator / denominator, 4)


def _summary_metrics(analytics_response):
    """Pinterest's analytics response nests numbers under
    summary_metrics.<METRIC>; pull that out flat, defaulting missing metrics
    to 0 rather than crashing on a metric the account has no data for."""
    summary = (analytics_response or {}).get("summary_metrics", {}) or {}
    return {m: summary.get(m, 0) or 0 for m in API.PIN_METRICS}


def gather(token, start_date, end_date, limit):
    account = _summary_metrics(API.get_account_analytics(token, start_date, end_date))

    boards = {b["id"]: b for b in API.list_boards(token)}

    pins = []
    dropped = 0
    for i, pin in enumerate(API.list_pins(token)):
        if i >= limit:
            dropped += 1
            continue
        try:
            metrics = _summary_metrics(API.get_pin_analytics(token, pin["id"], start_date, end_date))
        except API.PinterestAPIError as exc:
            metrics = {m: None for m in API.PIN_METRICS}
            pin["_analytics_error"] = str(exc)
        pin["_metrics"] = metrics
        pins.append(pin)

    if dropped:
        print(f"pinterest-insights: account has more than {limit} pins -- "
              f"{dropped} not pulled this run. Re-run with --limit to cover more.",
              file=sys.stderr)

    return {"account": account, "boards": boards, "pins": pins, "pins_dropped": dropped}


def analyze(data):
    """Rank pins, but only on the metrics that survive the sample-size floor
    -- a pin with 3 impressions and 1 outbound click is not a 33% CTR, it's
    an unread sample. Never silently drop the pin from the report; just keep
    it out of the ranked lists."""
    ranked_by_outbound_ctr = []
    ranked_by_save_rate = []
    below_sample_floor = []
    zero_impressions = []

    for pin in data["pins"]:
        m = pin["_metrics"]
        impressions = m.get("IMPRESSION") or 0
        board = data["boards"].get(pin.get("board_id"), {})
        row = {
            "pin_id": pin.get("id"),
            "title": pin.get("title") or "(no title)",
            "link": pin.get("link"),
            "board_name": board.get("name"),
            "impressions": impressions,
            "saves": m.get("SAVE"),
            "pin_clicks": m.get("PIN_CLICK"),
            "outbound_clicks": m.get("OUTBOUND_CLICK"),
            "outbound_ctr": _rate(m.get("OUTBOUND_CLICK") or 0, impressions),
            "save_rate": _rate(m.get("SAVE") or 0, impressions),
        }
        if impressions == 0:
            zero_impressions.append(row)
        elif impressions < MIN_IMPRESSIONS_FOR_RATE:
            below_sample_floor.append(row)
        else:
            ranked_by_outbound_ctr.append(row)
            ranked_by_save_rate.append(row)

    ranked_by_outbound_ctr.sort(key=lambda r: r["outbound_ctr"] or 0, reverse=True)
    ranked_by_save_rate.sort(key=lambda r: r["save_rate"] or 0, reverse=True)

    return {
        "ranked_by_outbound_ctr": ranked_by_outbound_ctr,
        "ranked_by_save_rate": ranked_by_save_rate,
        "below_sample_floor": below_sample_floor,
        "zero_impressions": zero_impressions,
    }


def render_report(start_date, end_date, data, analysis):
    lines = []
    a = lines.append
    a(f"# Pinterest Insights — {start_date} to {end_date}")
    a("")
    a(f"Account-level ({end_date} minus {start_date}):")
    for metric, value in data["account"].items():
        a(f"- **{metric}**: {value}")
    a("")
    a(f"Pins pulled: {len(data['pins'])}"
      + (f" ({data['pins_dropped']} more exist, not pulled this run)" if data["pins_dropped"] else ""))
    a(f"- {len(analysis['zero_impressions'])} pins with zero impressions in this window")
    a(f"- {len(analysis['below_sample_floor'])} pins below the "
      f"{MIN_IMPRESSIONS_FOR_RATE}-impression floor (rates reported, not ranked)")
    a(f"- {len(analysis['ranked_by_outbound_ctr'])} pins with enough data to rank")
    a("")
    a("## Top pins by outbound click-through rate (traffic to ultratextgen.com)")
    a("")
    a("| Pin | Board | Impressions | Outbound clicks | Outbound CTR | Save rate |")
    a("|---|---|---:|---:|---:|---:|")
    for r in analysis["ranked_by_outbound_ctr"][:15]:
        a(f"| {r['title'][:60]} | {r['board_name'] or '—'} | {r['impressions']} | "
          f"{r['outbound_clicks']} | {r['outbound_ctr']:.2%} | "
          f"{(r['save_rate'] or 0):.2%} |")
    a("")
    a("## Top pins by save rate (Pinterest's own quality/resonance signal)")
    a("")
    a("| Pin | Board | Impressions | Saves | Save rate | Outbound CTR |")
    a("|---|---|---:|---:|---:|---:|")
    for r in analysis["ranked_by_save_rate"][:15]:
        a(f"| {r['title'][:60]} | {r['board_name'] or '—'} | {r['impressions']} | "
          f"{r['saves']} | {r['save_rate']:.2%} | {(r['outbound_ctr'] or 0):.2%} |")
    a("")
    if analysis["zero_impressions"]:
        a("## Zero-impression pins (not a ranking signal — see caveat below)")
        a("")
        a("These pins drew no impressions in the window. That's not evidence "
          "the pin/board/keyword is bad — it may mean the pin is too new, the "
          "board has few followers, or Pinterest simply hasn't surfaced it "
          "yet. Same failure mode this repo's own GSC tooling documents for "
          "the analogous \"no-impressions\" case in search: absence of "
          "impressions measures whether we're being shown, not whether the "
          "underlying content/keyword has demand.")
        a("")
        for r in analysis["zero_impressions"][:20]:
            a(f"- {r['title'][:70]} ({r['board_name'] or 'no board'})")
        a("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--days", type=int, default=30, help="Lookback window in days (default 30)")
    ap.add_argument("--limit", type=int, default=200,
                     help="Max pins to pull per-pin analytics for (default 200; org_read is generous "
                          "-- 1,000/day Trial, 1,000/min Standard -- but this keeps a single run bounded)")
    ap.add_argument("--json", help="Write the raw gathered data + analysis as JSON to this path")
    ap.add_argument("--report", help="Write the human-readable Markdown report to this path")
    args = ap.parse_args()

    token = API.get_access_token()
    start_date, end_date = _date_window(args.days)

    data = gather(token, start_date, end_date, args.limit)
    analysis = analyze(data)
    report = render_report(start_date, end_date, data, analysis)

    print(report)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({"window": {"start": start_date, "end": end_date},
                       "data": {k: v for k, v in data.items() if k != "boards"},
                       "boards": data["boards"], "analysis": analysis}, f, indent=2, default=str)
        print(f"\nJSON written to {args.json}", file=sys.stderr)

    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(report + "\n")
        print(f"Report written to {args.report}", file=sys.stderr)


if __name__ == "__main__":
    main()
