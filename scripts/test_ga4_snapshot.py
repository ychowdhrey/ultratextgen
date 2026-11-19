#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit tests for `ga4_snapshot.py`.

The normalizer is network-free, so it is tested with an inline bundle fixture
shaped exactly like `fetch_ga4_reports.py` output.

Run:
    python3 -m unittest discover -s scripts -p 'test_*.py' -v
"""

import csv
import datetime
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ga4_snapshot as mod  # noqa: E402


def bundle_fixture():
    return {
        "meta": {
            "property_id": "999",
            "window": {"since": "2026-11-09", "until": "2026-11-15"},
            "history_start": "2026-01-01",
            "fetched_at": "2026-11-19T00:00:00Z",
            "product_events": ["copy_text", "save_style", "share_text",
                               "unsave_style"],
        },
        "reports": {
            "pages": {
                "dimensions": ["pagePath"],
                "metrics": ["screenPageViews", "sessions", "activeUsers",
                            "userEngagementDuration"],
                "rows": [
                    {"d": ["/id/library/simbol-love/"], "m": ["100", "80", "50", "500"]},
                    {"d": ["/library/degree-symbol/"], "m": ["60", "40", "20", "200"]},
                    {"d": ["/"], "m": ["40", "30", "10", "50"]},
                    {"d": ["/x/"], "m": ["10", "8", "4", "40"]},
                    {"d": ["/zh-tw/usecase/youxi-mingzi-fuhao/"], "m": ["5", "4", "0", "0"]},
                ],
            },
            "retention": {
                "dimensions": ["newVsReturning"],
                "metrics": ["activeUsers"],
                "rows": [{"d": ["new"], "m": ["90"]}, {"d": ["returning"], "m": ["10"]}],
            },
            "events": {
                "dimensions": ["eventName"],
                "metrics": ["eventCount"],
                "rows": [{"d": ["copy_text"], "m": ["200"]},
                         {"d": ["save_style"], "m": ["4"]}],
            },
            "countries": {
                "dimensions": ["country"],
                "metrics": ["sessions", "activeUsers"],
                "rows": [{"d": ["Indonesia"], "m": ["70", "45"]}],
            },
            "weekly_totals": {
                "dimensions": ["yearWeek"],
                "metrics": ["screenPageViews", "sessions", "activeUsers", "newUsers"],
                "rows": [{"d": ["202646"], "m": ["215", "162", "84", "74"]},
                         {"d": ["202645"], "m": ["190", "150", "80", "70"]}],
            },
            "monthly_retention": {
                "dimensions": ["yearMonth", "newVsReturning"],
                "metrics": ["activeUsers"],
                "rows": [{"d": ["202611", "new"], "m": ["90"]},
                         {"d": ["202611", "returning"], "m": ["10"]}],
            },
            "monthly_events": {
                "dimensions": ["yearMonth", "eventName"],
                "metrics": ["eventCount"],
                "rows": [{"d": ["202611", "copy_text"], "m": ["200"]},
                         {"d": ["202611", "save_style"], "m": ["4"]}],
            },
            "source_medium": {
                "dimensions": ["sessionSourceMedium"],
                "metrics": ["sessions", "activeUsers"],
                "rows": [{"d": ["google / organic"], "m": ["140", "110"]},
                         {"d": ["(direct) / (none)"], "m": ["22", "18"]}],
            },
            "revenue": {
                "dimensions": [],
                "metrics": ["totalAdRevenue", "publisherAdImpressions",
                            "totalRevenue"],
                "rows": [{"d": [], "m": ["5.2578", "5496", "5.2578"]}],
            },
            "daily_totals": {
                "dimensions": ["date"],
                "metrics": ["sessions", "screenPageViews", "activeUsers",
                            "newUsers", "userEngagementDuration",
                            "totalAdRevenue", "publisherAdImpressions"],
                "rows": [{"d": ["20261110"],
                          "m": ["80", "100", "50", "45", "500", "5.2578", "5496"]}],
            },
            "daily_landing_pages": {
                "dimensions": ["date", "landingPage"],
                "metrics": ["sessions", "screenPageViews",
                            "userEngagementDuration"],
                "rows": [
                    # In the register (see INTENT_FIXTURE below).
                    {"d": ["20261110", "/ko/font-byeonhwan"], "m": ["30", "40", "200"]},
                    # Not in the register -- must survive as unmapped.
                    {"d": ["20261110", "/id/library/simbol-love/"], "m": ["50", "60", "300"]},
                ],
            },
            "daily_country": {
                "dimensions": ["date", "country"],
                "metrics": ["sessions", "activeUsers"],
                "rows": [{"d": ["20261110", "Indonesia"], "m": ["70", "45"]}],
            },
            "daily_source_medium": {
                "dimensions": ["date", "sessionSourceMedium"],
                "metrics": ["sessions", "activeUsers"],
                "rows": [{"d": ["20261110", "google / organic"], "m": ["60", "40"]}],
            },
            "daily_events": {
                "dimensions": ["date", "eventName"],
                "metrics": ["eventCount"],
                "rows": [{"d": ["20261110", "copy_text"], "m": ["200"]}],
            },
        },
    }


INTENT_FIXTURE = {
    "schemaVersion": 1,
    "intents": [
        {"id": "style-text/cjk-readers", "scope": "cross-language",
         "pages": ["https://ultratextgen.com/ko/font-byeonhwan/"]},
    ],
}


class SplitPathTests(unittest.TestCase):
    def test_locale_prefix_is_detected(self):
        self.assertEqual(mod.split_path("/id/library/simbol-love/"),
                         ("id", "library", "simbol-love"))

    def test_hyphenated_locale(self):
        locale, page_type, _ = mod.split_path("/zh-tw/usecase/youxi/")
        self.assertEqual((locale, page_type), ("zh-tw", "usecase"))

    def test_locale_added_after_this_script_still_classifies(self):
        # Shape matching, not a hardcoded list: a locale added to the site
        # after this script was written must classify without a code change.
        self.assertEqual(mod.split_path("/ko/library/imotikon/"),
                         ("ko", "library", "imotikon"))

    def test_two_letter_section_is_not_a_locale(self):
        # /x/ is the Twitter page, not a locale.
        self.assertEqual(mod.split_path("/x/"), ("en", "root", "x"))

    def test_unknown_namespace_is_discovered_not_bucketed(self):
        # /symbol/ went live after this script was written; it must report its
        # own page_type and keep the real slug.
        self.assertEqual(mod.split_path("/symbol/degree-symbol/"),
                         ("en", "symbol", "degree-symbol"))
        self.assertEqual(mod.split_path("/ar/symbol/infinity/"),
                         ("ar", "symbol", "infinity"))

    def test_unprefixed_page_defaults_to_en(self):
        self.assertEqual(mod.split_path("/library/degree-symbol/"),
                         ("en", "library", "degree-symbol"))

    def test_home(self):
        self.assertEqual(mod.split_path("/"), ("en", "home", ""))

    def test_locale_home(self):
        self.assertEqual(mod.split_path("/id/"), ("id", "home", ""))

    def test_root_level_page_keeps_its_slug(self):
        self.assertEqual(mod.split_path("/id/font-wa/"), ("id", "root", "font-wa"))


class Ga4WeekTests(unittest.TestCase):
    """
    GA4's yearWeek grain, pinned to values read off the live property:
    202645 = 2026-11-01..07, 202646 = 2026-11-08..14, 202647 = 2026-11-15..21.
    """

    def test_week_range_matches_the_property(self):
        self.assertEqual(mod.ga4_week_range("202646"),
                         (datetime.date(2026, 11, 8), datetime.date(2026, 11, 14)))
        self.assertEqual(mod.ga4_week_range("202645"),
                         (datetime.date(2026, 11, 1), datetime.date(2026, 11, 7)))
        self.assertEqual(mod.ga4_week_range("202647"),
                         (datetime.date(2026, 11, 15), datetime.date(2026, 11, 21)))

    def test_weeks_start_on_sunday(self):
        for week in ("202601", "202620", "202646"):
            start, end = mod.ga4_week_range(week)
            self.assertEqual(start.weekday(), 6, week)   # Sunday
            self.assertEqual((end - start).days, 6, week)

    def test_unparseable_week_is_unknown_not_a_guess(self):
        for bad in ("", None, "2026", "abcdef", "202699"):
            self.assertIsNone(mod.ga4_week_range(bad))
            self.assertEqual(mod.pageview_definition(bad), "unknown")

    def test_pageview_definition_labels(self):
        # The 2026-11-08 change: before, spanning, after.
        self.assertEqual(mod.pageview_definition("202644"), "pre-2026-11-08")
        self.assertEqual(mod.pageview_definition("202646"), "spans-2026-11-08")
        self.assertEqual(mod.pageview_definition("202647"), "post-2026-11-08")

    def test_week_containing_the_deploy_day_is_never_called_clean(self):
        # 202646 starts ON 2026-11-08. The deploy day recorded a mid-transition
        # 1.75 page_view/session, so a week holding it is "spans", not "post" --
        # otherwise it would be averaged in with clean post-change weeks.
        start, _ = mod.ga4_week_range("202646")
        self.assertEqual(str(start), "2026-11-08")
        self.assertEqual(mod.pageview_definition("202646"), "spans-2026-11-08")


class ReturningShareTests(unittest.TestCase):
    def test_share(self):
        self.assertEqual(mod.returning_share(90, 10), 10.0)

    def test_no_users_does_not_divide_by_zero(self):
        self.assertEqual(mod.returning_share(0, 0), 0.0)


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = mod.build_snapshot(bundle_fixture())

    def test_totals_sum_pages(self):
        self.assertEqual(self.snapshot["totals"]["screen_page_views"], 215)
        self.assertEqual(self.snapshot["totals"]["sessions"], 162)

    def test_returning_share(self):
        self.assertEqual(self.snapshot["retention"]["returning_share_pct"], 10.0)

    def test_missing_product_events_are_reported(self):
        # share_text and unsave_style are absent from the events report.
        self.assertEqual(sorted(self.snapshot["missing_product_events"]),
                         ["share_text", "unsave_style"])

    def test_save_rate(self):
        self.assertEqual(self.snapshot["save_rate_pct_of_copies"], 2.0)

    def test_locales_aggregated_and_sorted(self):
        locales = {b["locale"]: b for b in self.snapshot["locales"]}
        self.assertEqual(locales["id"]["screen_page_views"], 100)
        # "/" and "/x/" both fall in the en bucket.
        self.assertEqual(locales["en"]["screen_page_views"], 110)
        views = [b["screen_page_views"] for b in self.snapshot["locales"]]
        self.assertEqual(views, sorted(views, reverse=True))

    def test_revenue_is_recorded(self):
        self.assertEqual(self.snapshot["revenue"]["ad_revenue"], 5.2578)
        self.assertEqual(self.snapshot["revenue"]["publisher_ad_impressions"],
                         5496)

    def test_revenue_absent_is_zero_not_a_crash(self):
        bundle = bundle_fixture()
        bundle["reports"]["revenue"]["rows"] = []
        snapshot = mod.build_snapshot(bundle)
        self.assertEqual(snapshot["revenue"]["ad_revenue"], 0.0)

    def test_sources_are_recorded_in_order(self):
        sources = self.snapshot["sources"]
        self.assertEqual(sources[0]["source_medium"], "google / organic")
        self.assertEqual(sources[0]["sessions"], 140)

    def test_revenue_and_sources_reach_the_summary(self):
        markdown = mod.render_markdown(self.snapshot)
        self.assertIn("Ad revenue", markdown)
        self.assertIn("$5.26", markdown)
        self.assertIn("## Acquisition", markdown)
        self.assertIn("google / organic", markdown)

    def test_untruncated_pages_are_not_flagged(self):
        self.assertFalse(self.snapshot["pages_truncated"])
        self.assertEqual(self.snapshot["pages_available"], 5)

    def test_capped_page_detail_is_flagged(self):
        # GA4 reported more rows than the fetcher's limit returned: the
        # snapshot must say so instead of implying full coverage.
        bundle = bundle_fixture()
        bundle["reports"]["pages"]["row_count"] = 2726
        snapshot = mod.build_snapshot(bundle)
        self.assertTrue(snapshot["pages_truncated"])
        self.assertEqual(snapshot["pages_available"], 2726)
        self.assertIn("capped", mod.render_markdown(snapshot))

    def test_avg_engagement_handles_zero_users(self):
        pages = {p["page_path"]: p for p in self.snapshot["top_pages"]}
        self.assertEqual(pages["/zh-tw/usecase/youxi-mingzi-fuhao/"]
                         ["avg_engagement_seconds"], 0.0)
        self.assertEqual(pages["/id/library/simbol-love/"]
                         ["avg_engagement_seconds"], 10.0)


class ComparabilityTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = mod.build_snapshot(bundle_fixture())

    def test_boundaries_are_carried_into_the_snapshot(self):
        dates = [b["date"] for b in self.snapshot["comparability_boundaries"]]
        self.assertIn("2026-11-08", dates)
        self.assertIn("2026-09-13", dates)

    def test_boundaries_are_rendered_for_a_human(self):
        markdown = mod.render_markdown(self.snapshot)
        self.assertIn("## Comparability", markdown)
        self.assertIn("2026-11-08", markdown)


class DailyPartitionTests(unittest.TestCase):
    """
    The daily grain, and the rule that matters most about it: a path the intent
    register does not name is **kept, marked unmapped** -- never dropped. Most
    of the site's traffic is on unmapped paths, so dropping them would quietly
    discard the bulk of the evidence.
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = self.tmp.name
        self.intents_path = os.path.join(self.out, "intents.json")
        with open(self.intents_path, "w", encoding="utf-8") as handle:
            json.dump(INTENT_FIXTURE, handle)
        self.intents = mod.load_intents(self.intents_path)
        self.written = mod.write_daily_partitions(
            bundle_fixture(), self.out, self.intents)

    def tearDown(self):
        self.tmp.cleanup()

    def landing_rows(self):
        path = os.path.join(self.out, "daily", "2026-11-landing-pages.csv")
        with open(path, encoding="utf-8") as handle:
            return {row["landing_page"]: row for row in csv.DictReader(handle)}

    def test_register_is_loaded_with_normalised_paths(self):
        self.assertEqual(self.intents.get("/ko/font-byeonhwan/"),
                         "style-text/cjk-readers")

    def test_mapped_path_carries_its_intent(self):
        row = self.landing_rows()["/ko/font-byeonhwan/"]
        self.assertEqual(row["intent_id"], "style-text/cjk-readers")
        self.assertEqual(row["intent_mapped"], "yes")

    def test_unmapped_path_is_kept_and_marked(self):
        rows = self.landing_rows()
        self.assertIn("/id/library/simbol-love/", rows)
        row = rows["/id/library/simbol-love/"]
        self.assertEqual(row["intent_id"], "")
        self.assertEqual(row["intent_mapped"], "no")
        # Enrichment still happened even though the register is silent.
        self.assertEqual(row["locale"], "id")
        self.assertEqual(row["page_type"], "library")
        self.assertEqual(row["slug"], "simbol-love")

    def test_no_landing_row_is_lost(self):
        self.assertEqual(len(self.landing_rows()), 2)

    def test_partitioned_by_month_with_every_dimension(self):
        for name in ("2026-11-landing-pages.csv", "2026-11-country.csv",
                     "2026-11-source-medium.csv", "2026-11-events.csv"):
            self.assertIn(name, self.written)
            self.assertTrue(os.path.exists(
                os.path.join(self.out, "daily", name)), name)

    def test_daily_totals_keep_revenue(self):
        path = os.path.join(self.out, "daily_totals.csv")
        with open(path, encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(rows[0]["date"], "2026-11-10")
        self.assertEqual(rows[0]["ad_revenue"], "5.2578")
        self.assertEqual(rows[0]["publisher_ad_impressions"], "5496")
        self.assertEqual(rows[0]["avg_engagement_seconds"], "10.0")

    def test_unreadable_register_leaves_everything_unmapped(self):
        empty = mod.load_intents(os.path.join(self.out, "nope.json"))
        self.assertEqual(empty, {})
        out = os.path.join(self.out, "second")
        os.makedirs(out)
        mod.write_daily_partitions(bundle_fixture(), out, empty)
        with open(os.path.join(out, "daily", "2026-11-landing-pages.csv"),
                  encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(r["intent_mapped"] == "no" for r in rows))

    def test_iso_date_and_path_normalisation(self):
        self.assertEqual(mod.iso_date("20261110"), "2026-11-10")
        self.assertEqual(mod.iso_date("nope"), "")
        self.assertEqual(mod.normalize_path("/a/b"), "/a/b/")
        self.assertEqual(mod.normalize_path("/a/b/?x=1"), "/a/b/")
        self.assertEqual(mod.normalize_path("(not set)"), "(not set)")


class WriteTests(unittest.TestCase):
    def run_main(self, out_dir, extra=None):
        path = os.path.join(out_dir, "bundle.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(bundle_fixture(), handle)
        argv = ["--input", path, "--out-dir", out_dir] + (extra or [])
        return mod.main(argv)

    def test_writes_expected_files(self):
        with tempfile.TemporaryDirectory() as out_dir:
            self.assertEqual(self.run_main(out_dir), 0)
            for name in ("latest.json", "latest.md", "2026-11-15.md",
                         "weekly_totals.csv", "monthly_retention.csv",
                         "monthly_events.csv", "page_performance.csv",
                         "locale_performance.csv",
                         os.path.join("snapshots", "2026-11-15.json")):
                self.assertTrue(os.path.exists(os.path.join(out_dir, name)), name)

    def test_page_performance_csv_joins_on_slug(self):
        with tempfile.TemporaryDirectory() as out_dir:
            self.run_main(out_dir)
            with open(os.path.join(out_dir, "page_performance.csv"),
                      encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
        top = rows[0]
        self.assertEqual(top["slug"], "simbol-love")
        self.assertEqual(top["page_type"], "library")
        self.assertEqual(top["locale"], "id")

    def test_weekly_history_is_sorted_ascending(self):
        with tempfile.TemporaryDirectory() as out_dir:
            self.run_main(out_dir)
            with open(os.path.join(out_dir, "weekly_totals.csv"),
                      encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
        self.assertEqual([r["year_week"] for r in rows], ["202645", "202646"])
        # Every week carries its real dates and a comparability label, so no
        # consumer can trend across the page-view definition change unaware.
        self.assertEqual(rows[0]["week_start"], "2026-11-01")
        self.assertEqual(rows[0]["pageview_definition"], "pre-2026-11-08")
        self.assertEqual(rows[1]["pageview_definition"], "spans-2026-11-08")
        # Window ends 2026-11-15, so week 202646 (ends 11-14) is finished and
        # 202645 is too; a week running past the window end must read "no".
        self.assertEqual(rows[0]["week_complete"], "yes")
        self.assertEqual(rows[1]["week_complete"], "yes")

    def test_partial_trailing_week_is_flagged_incomplete(self):
        bundle = bundle_fixture()
        # 202647 covers 11-15..11-21 but the window stops on 11-15.
        bundle["reports"]["weekly_totals"]["rows"].append(
            {"d": ["202647"], "m": ["12", "9", "7", "7"]})
        with tempfile.TemporaryDirectory() as out_dir:
            path = os.path.join(out_dir, "bundle.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(bundle, handle)
            mod.main(["--input", path, "--out-dir", out_dir])
            with open(os.path.join(out_dir, "weekly_totals.csv"),
                      encoding="utf-8") as handle:
                rows = {r["year_week"]: r for r in csv.DictReader(handle)}
        self.assertEqual(rows["202647"]["week_complete"], "no")
        self.assertEqual(rows["202646"]["week_complete"], "yes")

    def test_existing_snapshot_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as out_dir:
            self.assertEqual(self.run_main(out_dir), 0)
            # A second run over the same window must fail rather than rewrite
            # recorded history.
            self.assertEqual(self.run_main(out_dir), 1)
            self.assertEqual(self.run_main(out_dir, ["--force"]), 0)

    def test_rejects_non_bundle_json(self):
        with tempfile.TemporaryDirectory() as out_dir:
            path = os.path.join(out_dir, "bad.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump({"nope": True}, handle)
            self.assertEqual(mod.main(["--input", path, "--out-dir", out_dir]), 1)


if __name__ == "__main__":
    unittest.main()
