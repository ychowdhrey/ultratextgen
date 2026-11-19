#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit tests for `ga4_weekly_report.py`.

Builds a throwaway `data/ga4`-shaped tree and a throwaway repo tree, so the
report is exercised end to end without GA4 credentials and without reading the
real site.

Run:
    python3 -m unittest discover -s scripts -p 'test_*.py' -v
"""

import csv
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ga4_weekly_report as mod  # noqa: E402

INTENTS = {
    "schemaVersion": 1,
    "intents": [
        {
            "id": "style-text/cjk-readers",
            "scope": "cross-language",
            "pages": ["https://ultratextgen.com/ko/font-byeonhwan/",
                      "https://ultratextgen.com/zh-tw/yingwen-ziti/"],
            "localeOwners": {"en": "https://ultratextgen.com/"},
        },
        {
            "id": "write-in-gal-moji",
            "scope": "locale-specific",
            "pages": ["https://ultratextgen.com/ja/gal-moji/"],
        },
        {"id": "", "pages": ["https://ultratextgen.com/ignored/"]},
    ],
}


def write_csv(path, fieldnames, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.dir.name, "intents.json")
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(INTENTS, handle)

    def tearDown(self):
        self.dir.cleanup()

    def test_locale_read_from_each_url(self):
        registry = {i["id"]: i for i in mod.load_intent_registry(self.path)}
        self.assertEqual(
            registry["style-text/cjk-readers"]["locales"],
            {"ko": "/ko/font-byeonhwan/", "zh-tw": "/zh-tw/yingwen-ziti/",
             "en": "/"})

    def test_entry_without_an_id_is_skipped(self):
        ids = [i["id"] for i in mod.load_intent_registry(self.path)]
        self.assertEqual(sorted(ids), ["style-text/cjk-readers", "write-in-gal-moji"])

    def test_missing_register_is_empty_not_fatal(self):
        self.assertEqual(mod.load_intent_registry("does/not/exist.json"), [])

    def test_registry_paths(self):
        paths = mod.registry_paths(mod.load_intent_registry(self.path))
        self.assertIn("/ja/gal-moji/", paths)
        self.assertIn("/", paths)


class PathHelperTests(unittest.TestCase):
    def test_root_path_is_en(self):
        self.assertEqual(mod._locale_of("/"), "en")
        self.assertEqual(mod._locale_of("/library/arrows/"), "en")

    def test_two_letter_and_hyphenated_locales(self):
        self.assertEqual(mod._locale_of("/ko/font-byeonhwan/"), "ko")
        self.assertEqual(mod._locale_of("/zh-tw/yingwen-ziti/"), "zh-tw")

    def test_foreign_url_is_not_ours(self):
        self.assertEqual(mod._path_of("https://example.com/ko/x/"), "")
        self.assertEqual(mod._path_of(None), "")

    def test_trailing_slash_and_query_normalised(self):
        self.assertEqual(mod._path_of("https://ultratextgen.com/a/b?x=1"), "/a/b/")


class PageExistsTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        root = self.dir.name
        os.makedirs(os.path.join(root, "library", "arrows"))
        open(os.path.join(root, "library", "arrows", "index.html"), "w").close()
        open(os.path.join(root, "index.html"), "w").close()
        open(os.path.join(root, "404.html"), "w").close()
        self.root = root

    def tearDown(self):
        self.dir.cleanup()

    def test_directory_index(self):
        self.assertTrue(mod.page_exists(self.root, "/library/arrows/"))
        self.assertTrue(mod.page_exists(self.root, "/library/arrows"))

    def test_root(self):
        self.assertTrue(mod.page_exists(self.root, "/"))

    def test_bare_html_file(self):
        self.assertTrue(mod.page_exists(self.root, "/404"))

    def test_absent(self):
        self.assertFalse(mod.page_exists(self.root, "/ko/library/arrows/"))


class ClassifyTests(unittest.TestCase):
    def test_malformed(self):
        self.assertIn("malformed", mod.classify_unserved('/category/x/"/'))

    def test_scanner(self):
        self.assertIn("probe", mod.classify_unserved("/wp-login.php"))

    def test_ordinary(self):
        self.assertIn("removed", mod.classify_unserved("/usecase/free/"))


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = self.tmp.name
        self.ga4 = os.path.join(base, "data", "ga4")
        os.makedirs(os.path.join(self.ga4, "snapshots"))
        os.makedirs(os.path.join(self.ga4, "daily"))
        self.repo = os.path.join(base, "repo")
        os.makedirs(os.path.join(self.repo, "ko", "font-byeonhwan"))
        open(os.path.join(self.repo, "ko", "font-byeonhwan", "index.html"),
             "w").close()
        open(os.path.join(self.repo, "index.html"), "w").close()

        self.intents = os.path.join(base, "intents.json")
        with open(self.intents, "w", encoding="utf-8") as handle:
            json.dump(INTENTS, handle)

        snapshot = {
            "window": {"since": "2026-11-09", "until": "2026-11-15"},
            "property_id": "999", "fetched_at": "2026-11-19T00:00:00Z",
            "families": [{"locale": "en", "page_type": "home",
                          "pages": 1, "screen_page_views": 600}],
        }
        with open(os.path.join(self.ga4, "latest.json"), "w",
                  encoding="utf-8") as handle:
            json.dump(snapshot, handle)

        write_csv(os.path.join(self.ga4, "page_performance.csv"),
                  ["page_path", "locale", "page_type", "slug",
                   "screen_page_views", "sessions", "active_users",
                   "avg_engagement_seconds"],
                  [{"page_path": "/", "locale": "en", "page_type": "home",
                    "slug": "", "screen_page_views": 600, "sessions": 500,
                    "active_users": 400, "avg_engagement_seconds": 10},
                   {"page_path": "/ko/font-byeonhwan/", "locale": "ko",
                    "page_type": "root", "slug": "font-byeonhwan",
                    "screen_page_views": 200, "sessions": 150,
                    "active_users": 120, "avg_engagement_seconds": 9},
                   {"page_path": "/id/library/simbol-love/", "locale": "id",
                    "page_type": "library", "slug": "simbol-love",
                    "screen_page_views": 900, "sessions": 800,
                    "active_users": 700, "avg_engagement_seconds": 11}])

        write_csv(os.path.join(self.ga4, "locale_performance.csv"),
                  ["locale", "pages", "screen_page_views", "sessions",
                   "active_users"],
                  [{"locale": "id", "pages": 1, "screen_page_views": 900,
                    "sessions": 800, "active_users": 700},
                   {"locale": "en", "pages": 1, "screen_page_views": 600,
                    "sessions": 500, "active_users": 400},
                   {"locale": "ko", "pages": 1, "screen_page_views": 200,
                    "sessions": 150, "active_users": 120}])

        write_csv(os.path.join(self.ga4, "daily", "2026-11-landing-pages.csv"),
                  ["date", "landing_page", "locale", "page_type", "slug",
                   "intent_id", "intent_mapped", "sessions",
                   "screen_page_views", "user_engagement_seconds"],
                  [{"date": "2026-11-10", "landing_page": "/", "locale": "en",
                    "page_type": "home", "slug": "", "intent_id": "",
                    "intent_mapped": "no", "sessions": 500,
                    "screen_page_views": 600, "user_engagement_seconds": 100},
                   {"date": "2026-11-11", "landing_page": "/gone/",
                    "locale": "en", "page_type": "root", "slug": "gone",
                    "intent_id": "", "intent_mapped": "no", "sessions": 7,
                    "screen_page_views": 7, "user_engagement_seconds": 1},
                   {"date": "2026-12-01", "landing_page": "/outside-window/",
                    "locale": "en", "page_type": "root", "slug": "x",
                    "intent_id": "", "intent_mapped": "no", "sessions": 99,
                    "screen_page_views": 99, "user_engagement_seconds": 1}])

    def tearDown(self):
        self.tmp.cleanup()

    def report(self):
        sessions = mod.window_sessions(
            self.ga4, {"since": "2026-11-09", "until": "2026-11-15"})
        text, until = mod.build_report(self.ga4, self.repo, sessions,
                                       self.intents)
        return text, until, sessions

    def test_window_sessions_respects_the_window(self):
        _, _, sessions = self.report()
        self.assertEqual(sessions.get("/"), 500)
        self.assertEqual(sessions.get("/gone/"), 7)
        # A row dated outside the window must not leak in.
        self.assertNotIn("/outside-window/", sessions)

    def test_first_run_is_labelled_a_baseline(self):
        text, until, _ = self.report()
        self.assertEqual(until, "2026-11-15")
        self.assertIn("baseline", text)

    def test_new_family_detected_against_previous_snapshot(self):
        # Seed an older snapshot that only knew the en/home family.
        with open(os.path.join(self.ga4, "snapshots", "2026-11-08.json"),
                  "w", encoding="utf-8") as handle:
            json.dump({"families": [{"locale": "en", "page_type": "home"}]},
                      handle)
        text, _, _ = self.report()
        self.assertNotIn("baseline", text)
        # id/library and ko/root are new relative to that snapshot.
        self.assertIn("`id` | `library`", text)

    def test_unserved_demand_lists_only_missing_pages(self):
        text, _, _ = self.report()
        section = text.split("## 3. Unserved demand")[1].split("## 4.")[0]
        self.assertIn("/gone/", section)
        # "/" exists in the throwaway repo, so it must not be called unserved.
        self.assertNotIn("| `/` |", section)

    def test_candidates_are_intent_based_and_never_invent_a_path(self):
        text, _, _ = self.report()
        section = text.split("## 4. Candidates for validation")[1]
        self.assertIn("style-text/cjk-readers", section)
        # The old slug-guessing behaviour must not come back: an Indonesian
        # slug must never be proposed as a path in another locale.
        self.assertNotIn("/ko/library/simbol-love/", section)
        self.assertNotIn("/en/library/simbol-love/", section)

    def test_unregistered_high_traffic_pages_are_named(self):
        text, _, _ = self.report()
        section = text.split("cannot speak for")[1]
        self.assertIn("/id/library/simbol-love/", section)

    def test_report_states_it_is_not_authorization(self):
        text, _, _ = self.report()
        self.assertIn("not authorization", text.lower())
        self.assertIn("not a build queue", text)


if __name__ == "__main__":
    unittest.main()
