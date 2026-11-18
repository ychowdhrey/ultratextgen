#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
library-spec-combos.test.py

Run: python3 scripts/library-spec-combos.test.py   (npm run test:spec-combos)

Zero dependencies, the same idiom as scripts/lib/generator_parity.test.py.

A section's "combos" list (ready-made multi-emoji sets above the single-emoji
grid) was carried by three English specs (funny-, seasonal-, color-emoji-combos)
for months while scripts/generate_library_page_from_spec.py ignored the key: the
live pages show the combos, the generator dropped them, and every translation
built from the spec shipped half the page (es/library/emojis-graciosos/ had 35
of the English page's 75 copy tiles). These cases pin the renderer to the live
English markup, and keep a non-English page from inheriting the English line.
"""

import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "gen", ROOT / "scripts" / "generate_library_page_from_spec.py")
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)

PASS, FAIL, LINES = 0, 0, []


def t(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        LINES.append(f"  ok   {name}")
    except Exception as exc:  # an unexpected error is a failure too, never a crash past the summary
        FAIL += 1
        LINES.append(f"  FAIL {name}\n         {type(exc).__name__}: {exc}")


def marked(html):
    """The generator's own last step: the text-object grid marker."""
    r = subprocess.run(["node", str(ROOT / "scripts" / "check-text-object-grids.js"), "--stdin"],
                       input=html, capture_output=True, text=True)
    return r.stdout or html


def section(html, sid):
    m = re.search(r'<section class="mood-explainers" id="%s">.*?</section>' % re.escape(sid), html, re.S)
    return m.group(0) if m else None


def live_sections_match(slug):
    def run():
        spec = json.loads((ROOT / "data" / "library_page_specs" / f"{slug}.json").read_text())
        out = marked(gen.render_page(spec))
        live = (ROOT / "library" / slug / "index.html").read_text()
        for sec in spec["sections"]:
            got, want = section(out, sec["id"]), section(live, sec["id"])
            assert want is not None, f"live page has no section {sec['id']}"
            assert got == want, f"{slug}#{sec['id']} differs from the live page"
    return run


BASE = {
    "slug": "x", "title": "X", "meta_description": "X.", "canonical": "https://ultratextgen.com/ko/library/x/",
    "breadcrumb": "X", "hero_h1": "X", "hero_tagline": "X.", "intro": "X.", "date_published": "2026-11-18",
    "date_modified": "2026-11-18", "copy_pattern": "single", "lang": "ko", "page_type": "library",
    "hreflang": [{"lang": "ko", "href": "https://ultratextgen.com/ko/library/x/"}],
    "related": [{"href": "/ko/library/", "title": "라이브러리", "desc": "전체 모음."}],
}


def spec_with(section_extra, lang="ko"):
    s = json.loads(json.dumps(BASE))
    s["lang"] = lang
    sec = {"id": "s1", "label": "웃음", "h2": "웃음 조합", "intro": "소개.",
           "symbols": [{"char": "😂", "label": "기쁨의 눈물"}]}
    sec.update(section_extra)
    s["sections"] = [sec]
    return s


def raises(fn, needle):
    try:
        fn()
    except gen.SpecError as exc:
        assert needle in str(exc), f"SpecError without {needle!r}: {exc}"
        return
    raise AssertionError("expected SpecError, got none")


def test_locale_needs_mix_intro():
    raises(lambda: gen.validate_spec(spec_with({"combos": [{"char": "😂🤣", "label": "빵 터짐"}]})),
           "mix_intro")


def test_combo_needs_label():
    raises(lambda: gen.validate_spec(spec_with({"combos": [{"char": "😂🤣"}], "mix_intro": "하나씩."})),
           "'char' and 'label'")


def test_locale_combo_rendering():
    spec = spec_with({"combos": [{"char": "😂🤣", "label": "빵 터짐"}], "mix_intro": "하나씩 골라 조합하세요:"})
    html = gen.render_page(spec)
    sec = section(html, "s1")
    assert 'data-symbol="😂🤣"' in sec, "combo tile missing"
    assert "emoji combo" not in sec, "English aria suffix leaked onto a non-English page"
    assert "Or mix your own" not in sec, "English hand-off line leaked onto a non-English page"
    assert "하나씩 골라 조합하세요:" in sec, "mix_intro not rendered"
    assert sec.index('data-symbol="😂🤣"') < sec.index('data-symbol="😂"'), "combos must precede the singles"


def test_no_combos_unchanged():
    html = gen.render_page(spec_with({}))
    sec = section(html, "s1")
    assert sec.count('<div class="flag-rows">') == 1, "a section without combos grew a second grid"
    assert "u-secondary-tight\">하나씩" not in sec


t("funny-emoji-combos renders exactly as the live English page", live_sections_match("funny-emoji-combos"))
t("seasonal-emoji-combos renders exactly as the live English page", live_sections_match("seasonal-emoji-combos"))
t("color-emoji-combos renders exactly as the live English page", live_sections_match("color-emoji-combos"))
t("a non-English section with combos must carry mix_intro", test_locale_needs_mix_intro)
t("a combo without a label is refused", test_combo_needs_label)
t("a locale renders combos with its own line and no English aria", test_locale_combo_rendering)
t("a section without combos still renders one grid", test_no_combos_unchanged)

print("\n".join(LINES))
print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
