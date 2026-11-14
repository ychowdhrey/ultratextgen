#!/usr/bin/env python3
"""Tests for scripts/lib/canonical_intents.py and the language-neutral branch of
scripts/check_locale_spec.py (2026-11-14). Zero dependencies; run with
`npm run test:intent-clusters` (after the Node suite) or directly.

A locale spec with no "en" entry is valid when a canonical intent record pins
it or a sibling; it is compared against the record's reference page, never an
English page by assumption, and its x-default must be the one the record
resolves (none by default).
"""

import importlib.util
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import canonical_intents as ci  # noqa: E402

S = "https://ultratextgen.com"
FAILS = []
PASSES = [0]


def expect(name, cond, detail=""):
    if cond:
        PASSES[0] += 1
        print(f"  ok   {name}")
    else:
        FAILS.append(name)
        print(f"  FAIL {name} {detail}")


spec_mod_path = os.path.join(os.path.dirname(HERE), "check_locale_spec.py")
spec = importlib.util.spec_from_file_location("check_locale_spec", spec_mod_path)
cls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cls)

REGISTRY = {
    "policy": {"xDefaultFallbackOrder": ["en"]},
    "intents": [
        {"id": "find-and-copy-a-symbol/reference-mark", "originLocale": "ko",
         "pages": [f"{S}/ko/symbol/chamgopyo-giho/"], "scope": "cross-language"},
        {"id": "write-in-gal-moji", "originLocale": "ja", "pages": [f"{S}/ja/gal-moji/"],
         "scope": "locale-specific", "xDefault": "site-root"},
        {"id": "x/primary", "originLocale": "ja", "primaryLocale": "fr",
         "pages": [f"{S}/ja/library/a/", f"{S}/fr/library/b/"], "scope": "cross-language"},
    ],
}

print("canonical_intents.py")
expect("url_locale reads the path prefix", ci.url_locale(f"{S}/zh-tw/x/") == "zh-tw" and ci.url_locale(f"{S}/symbol/x/") == "en")
expect("record_for finds a pinned page", ci.record_for(REGISTRY, [f"{S}/ko/symbol/chamgopyo-giho"])["id"]
       == "find-and-copy-a-symbol/reference-mark")
expect("record_for returns None for an unpinned page", ci.record_for(REGISTRY, [f"{S}/ko/symbol/other/"]) is None)
expect("reference page is the origin page", ci.reference_page(REGISTRY["intents"][0]) == f"{S}/ko/symbol/chamgopyo-giho/")
expect("primaryLocale overrides the origin", ci.reference_page(REGISTRY["intents"][2]) == f"{S}/fr/library/b/")
expect("x-default: none when no English member and none declared",
       ci.expected_x_default(REGISTRY["intents"][0], {"ko": "k"}, REGISTRY["policy"]) is None)
expect("x-default: English by policy once English exists",
       ci.expected_x_default(REGISTRY["intents"][0], {"ko": "k", "en": f"{S}/symbol/x/"}, REGISTRY["policy"]) == f"{S}/symbol/x/")
expect("x-default: declared site-root wins", ci.expected_x_default(REGISTRY["intents"][1], {"ja": "j"}) == f"{S}/")
try:
    ci.load(tempfile.mkdtemp())
    expect("missing registry raises RegistryUnavailable", False)
except ci.RegistryUnavailable:
    expect("missing registry raises RegistryUnavailable", True)

print("check_locale_spec.py, language-neutral branch")
cls._registry.cache = REGISTRY


def run(spec_dict):
    d = tempfile.mkdtemp()
    p = os.path.join(d, f"{spec_dict['lang']}-fixture.json")
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(spec_dict, fh, ensure_ascii=False)
    return cls.check(p)


def ko_spec(**over):
    base = {"slug": "chamgopyo-giho", "lang": "ko", "page_type": "symbol",
            "canonical": f"{S}/ko/symbol/chamgopyo-giho/", "title": "참고표",
            "hreflang": [{"lang": "ko", "href": f"{S}/ko/symbol/chamgopyo-giho/"}],
            "sections": [{"symbols": [{"char": "※"}]}], "faq": [{"q": "a", "a": "b"}] * 3, "faq_h2": "FAQ",
            "editorial_sections": [{"h2": "x", "body": "y"}], "related": []}
    base.update(over)
    return base


errs, _ = run(ko_spec())
expect("a registered Korean-first origin spec with no en entry passes", errs == [], errs)
errs, _ = run(ko_spec(slug="other", canonical=f"{S}/ko/symbol/other/",
                      hreflang=[{"lang": "ko", "href": f"{S}/ko/symbol/other/"}]))
expect("an unregistered spec with no en entry fails with 'no canonical intent'",
       any("no canonical intent" in e for e in errs), errs)
errs, _ = run(ko_spec(hreflang=[{"lang": "ko", "href": f"{S}/ko/symbol/chamgopyo-giho/"},
                                {"lang": "x-default", "href": f"{S}/ko/symbol/chamgopyo-giho/"}]))
expect("a self-pointing x-default on an English-less origin fails", any("x-default" in e for e in errs), errs)
fr = {"slug": "marque", "lang": "fr", "page_type": "symbol", "canonical": f"{S}/fr/symbol/marque/",
      "hreflang": [{"lang": "fr", "href": f"{S}/fr/symbol/marque/"}, {"lang": "ja", "href": f"{S}/ja/gal-moji/"}],
      "sections": [], "related": []}
errs, _ = run(fr)
expect("a sibling is compared against the record's reference page (lane checked against it)",
       any("reference page (write-in-gal-moji)" in e for e in errs), errs)
errs, _ = run({**ko_spec(), "hreflang": [{"lang": "ko", "href": f"{S}/ko/symbol/chamgopyo-giho/"},
                                         {"lang": "en", "href": f"{S}/symbol/zzz-not-a-page/"},
                                         {"lang": "x-default", "href": f"{S}/symbol/zzz-not-a-page/"}]})
expect("with an en entry the English page is the reference, as before (missing page reported)",
       any("EN parent symbol/zzz-not-a-page/index.html does not exist" in e for e in errs), errs)

print(f"\n{PASSES[0]} passed, {len(FAILS)} failed")
sys.exit(1 if FAILS else 0)
