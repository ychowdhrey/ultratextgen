#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cta_routing.test.py

Run: python3 scripts/lib/cta_routing.test.py   (npm run test:cta-routing)

Zero dependencies, no framework — the idiom of scripts/lib/generator_parity.test.py
and js/counter/counterRules.test.js.

WHAT THESE PIN DOWN
-------------------
Three things, each of which would be a silent defect rather than a crash:

  1. **The locale carve-out.** Every `<lang>/...` page must return None. If this
     ever starts routing, a French page links an English tool, which CLAUDE.md's
     locale-native linking rule forbids and `check-locale-mesh` fails on.
  2. **Idempotence.** The pass may only touch a card still on the shared
     homepage default. A second run must be a no-op, and a card someone already
     pointed somewhere specific must never be reclaimed.
  3. **The copy states facts the destination actually carries**, and adds no em
     dash. Both are rules this repo gates on elsewhere; a hand-written card is
     exactly where they get forgotten.
"""

import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from lib.cta_routing import DESTINATIONS, route, card_for, is_homepage_href  # noqa: E402

_rs = importlib.util.spec_from_file_location("route_cta", HERE.parent / "route-cta-cards.py")
RC = importlib.util.module_from_spec(_rs)
_rs.loader.exec_module(RC)

PASS, FAIL, LINES = 0, 0, []


def t(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        LINES.append(f"  ok   {name}")
    except AssertionError as exc:
        FAIL += 1
        LINES.append(f"  FAIL {name}\n         {exc}")
    except Exception as exc:  # a crash is a failure, not a reason to stop reading
        FAIL += 1
        LINES.append(f"  FAIL {name}\n         {type(exc).__name__}: {exc}")


PAGE = """<!DOCTYPE html><html lang="en"><body>
<main><p>Body.</p></main>
<!-- CTA -->
<div class="cta-card">
  <h3>Transform text with Unicode fonts</h3>
  <p>Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ other Unicode font styles.</p>
  <a href="https://ultratextgen.com/" class="cta-btn">Open UltraTextGen &rarr;</a>
</div>
<footer><a href="/" class="footer-link">Home</a></footer>
</body></html>"""


# ── routing ────────────────────────────────────────────────────────────────

def routes_to(rel, expected):
    def check():
        got = route(rel)
        assert got == expected, f"{rel} -> expected {expected!r}, got {got!r}"
    return check


t("a symbol spoke routes to the character counter",
  routes_to("symbol/euro-sign/index.html", "character-counter"))
t("a kaomoji library page routes to the kaomoji generator",
  routes_to("library/cat-kaomoji/index.html", "kaomoji-generator"))
t("an emoticon library page routes to the kaomoji generator",
  routes_to("library/japanese-emoticons/index.html", "kaomoji-generator"))
t("a combos library page routes to the bio font generator",
  routes_to("library/algeria-emoji-combos/index.html", "bio-font"))


def _no_rule_is_none():
    for rel in ("library/alt-codes/index.html", "guide/discord-text-formatting-explained/index.html",
                "answers/what-does-owo-mean/index.html", "usecase/bio-font/index.html",
                "index.html", "printables/letter-a/index.html"):
        assert route(rel) is None, f"{rel} should have no rule, got {route(rel)!r}"


t("a page with no rule keeps its card", _no_rule_is_none)


# ── the locale carve-out, the one that must never regress ──────────────────

def _locales_never_route():
    for rel in ("fr/symbol/symbole-euro/index.html", "es/library/emoji-combos-argentina/index.html",
                "id/library/kaomoji-kucing/index.html", "zh-tw/symbol/euro/index.html",
                "de/library/tastatur-symbole/index.html"):
        assert route(rel) is None, (
            f"{rel} must NOT route: no locale build of any destination tool exists, "
            f"and linking an English tool from a locale page is what the "
            f"locale-native rule forbids. Got {route(rel)!r}"
        )


t("LOCALE CARVE-OUT: no <lang>/ page ever routes", _locales_never_route)


def _short_paths_are_none():
    for rel in ("index.html", "", "symbol/", "/", "symbol"):
        assert route(rel) is None, f"{rel!r} must be None, not {route(rel)!r}"


t("a bare filename or short path does not crash", _short_paths_are_none)


# ── homepage detection ─────────────────────────────────────────────────────

def _homepage_detection():
    for href in ("/", "/fr/", "/zh-tw/", "https://ultratextgen.com/",
                 "https://www.ultratextgen.com/es/", "/id/?utm_source=x", "/pt/#top"):
        assert is_homepage_href(href), f"{href!r} should read as a homepage"
    for href in ("/library/", "/character-counter/", "/usecase/bio-font/",
                 "/fr/library/symboles/", "", None, "https://example.com/"):
        assert not is_homepage_href(href), f"{href!r} should NOT read as a homepage"


t("homepage detection covers absolute, locale, query and fragment forms",
  _homepage_detection)


# ── the rewrite, and its idempotence ───────────────────────────────────────

def _rewrites_the_default_card():
    out = RC.rewrite(PAGE, DESTINATIONS["character-counter"])
    assert out and out != PAGE
    assert 'href="/character-counter/"' in out
    assert "Open the character counter" in out
    assert "Open UltraTextGen" not in out
    assert 'class="cta-btn"' in out, "the button's own attributes must survive"
    assert '<a href="/" class="footer-link">Home</a>' in out, "the footer link must survive"
    assert "<main><p>Body.</p></main>" in out, "page body must be untouched"


t("rewrites a card still on the shared default", _rewrites_the_default_card)


def _is_idempotent():
    once = RC.rewrite(PAGE, DESTINATIONS["character-counter"])
    twice = RC.rewrite(once, DESTINATIONS["character-counter"])
    assert twice is None, "a second run must be a no-op, got a rewrite"


t("IDEMPOTENT: a second run changes nothing", _is_idempotent)


def _never_reclaims_a_specific_card():
    already = PAGE.replace('href="https://ultratextgen.com/"', 'href="/library/currency-symbols/"')
    assert RC.rewrite(already, DESTINATIONS["character-counter"]) is None, (
        "a card someone already pointed somewhere specific must never be reclaimed"
    )


t("never reclaims a card already pointed somewhere specific",
  _never_reclaims_a_specific_card)


def _declines_a_card_it_cannot_parse():
    broken = PAGE.replace("<h3>Transform text with Unicode fonts</h3>", "")
    assert RC.rewrite(broken, DESTINATIONS["character-counter"]) is None, (
        "a card missing its h3 must be declined, not rewritten by a looser match"
    )


t("declines a card it cannot parse rather than guessing", _declines_a_card_it_cannot_parse)


def _escapes_its_output():
    out = RC.rewrite(PAGE, {"href": '/x/"onmouseover=1', "h3": "A & B", "cta": "<b>x</b>", "button": "Go"})
    assert "&amp;" in out, "text must be HTML-escaped"
    assert "&lt;b&gt;" in out, "markup in copy must be escaped, not emitted"
    assert '"onmouseover=1' not in out.split("cta-btn")[0].split('href="')[-1] or "&quot;" in out, \
        "an href must be attribute-escaped"


t("escapes text and attributes rather than injecting them", _escapes_its_output)


# ── the copy itself ────────────────────────────────────────────────────────

def _no_new_em_dashes():
    for key, d in DESTINATIONS.items():
        for field in ("h3", "cta", "button"):
            assert "—" not in d[field], (
                f"{key}.{field} adds an em dash; the rule in "
                f"docs/editorial-footprint-risk.md is forward-only"
            )


t("the new card copy adds no em dash", _no_new_em_dashes)


def _copy_states_a_checkable_fact():
    """Not a style preference: the remediation principle is generic claim ->
    concrete information, so each paragraph must carry a real number or name."""
    import re
    for key, d in DESTINATIONS.items():
        assert re.search(r"\d", d["cta"]) or len(re.findall(r"\b[a-z]+\b", d["cta"])) > 12, \
            f"{key} paragraph states nothing concrete"
    assert "32" in DESTINATIONS["character-counter"]["cta"], "Discord nickname limit"
    assert "150" in DESTINATIONS["character-counter"]["cta"], "Instagram bio limit"
    assert "80" in DESTINATIONS["character-counter"]["cta"], "TikTok bio limit"
    assert "160" in DESTINATIONS["bio-font"]["cta"], "X bio limit"
    assert "88" in DESTINATIONS["bio-font"]["cta"], "bio-font's own font count"


def _keeps_the_protected_brand_term():
    """The SEO Preservation Gate caught the first draft of this copy dropping
    `ultratextgen` from the editorial text of all 214 pages: the old card was the
    only place it appeared outside URLs and JSON-LD. Do not exempt the rule."""
    for key, d in DESTINATIONS.items():
        joined = " ".join(d[f] for f in ("h3", "cta", "button"))
        assert "ultratextgen" in joined.lower(), (
            f"{key} card never names UltraTextGen; the SEO Preservation Gate "
            f"reports protected-term-lost on every page carrying it"
        )
        assert "unicode" in joined.lower(), (
            f"{key} card never names Unicode; on 8 pages the old card was the "
            f"only editorial mention of it, and the gate blocks on its loss"
        )


t("every paragraph states a fact its destination actually carries",
  _copy_states_a_checkable_fact)

t("every card still names the protected brand term", _keeps_the_protected_brand_term)


def _limits_match_the_counter_itself():
    """The numbers are read back out of js/counter/counterRules.js, so the card
    cannot drift away from the tool it is describing."""
    src = (HERE.parent.parent / "js" / "counter" / "counterRules.js").read_text(encoding="utf-8")
    for label, value in (("discord-nick", 32), ("ig-bio", 150), ("tiktok-bio", 80), ("x-bio", 160)):
        assert f'id: "{label}"' in src and f"limit: {value}" in src, \
            f"{label} is no longer {value} in counterRules.js — the CTA copy is now wrong"


t("the quoted limits still match counterRules.js", _limits_match_the_counter_itself)


def _destinations_exist_on_disk():
    root = HERE.parent.parent
    for key, d in DESTINATIONS.items():
        target = root / d["href"].strip("/") / "index.html"
        assert target.exists(), f"{key} points at {d['href']}, which does not exist"


t("every destination page exists on disk", _destinations_exist_on_disk)


def _card_for_is_consistent_with_route():
    assert card_for("symbol/euro-sign/index.html")["key"] == "character-counter"
    assert card_for("library/alt-codes/index.html") is None


t("card_for() agrees with route()", _card_for_is_consistent_with_route)


print("CTA routing — tests\n")
for line in LINES:
    print(line)
print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
