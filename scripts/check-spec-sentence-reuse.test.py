#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-spec-sentence-reuse.test.py

Run: python3 scripts/check-spec-sentence-reuse.test.py
     (npm run test:spec-sentence-reuse)

Zero dependencies, no framework — the same idiom as
scripts/lib/generator_parity.test.py and js/counter/counterRules.test.js.

WHAT THESE ASSERT, AND WHY EACH ONE IS HERE
-------------------------------------------
The first specification of this check was wrong in a way that would have shipped
a permanently-green gate: it compared whole FIELDS, and the corpus contains zero
duplicate `hero_tagline`/`meta_description`/`title`/`intro` values, so it could
never have fired. The real reuse is a SENTENCE inside an otherwise page-specific
field. Several cases below pin that granularity down so it cannot regress back.

The deliberate NON-catches matter as much as the catches. A gate that fires on a
short fragment, on a slug, or on a spec that merely still contains reuse it did
not add is a gate people learn to route around — the failure mode CLAUDE.md
records for check:images and audit:locale-parent-gap.
"""

import importlib.util
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location(
    "spec_sentence_reuse", HERE / "check-spec-sentence-reuse.py"
)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)

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


# The sentence that actually did this to the corpus: 171 hero_taglines and 148
# meta_descriptions carry it, inside taglines that are otherwise all different.
SHARED = "Click any symbol to copy it instantly."


def spec(**kw):
    return dict(kw)


# ── sentence extraction ────────────────────────────────────────────────────

def _splits_on_terminators():
    got = M.sentences(
        "Ancient Greek letters for maths and fraternities. " + SHARED
    )
    assert len(got) == 2, got
    assert got[1] == SHARED, got


t("splits a field into its sentences", _splits_on_terminators)


def _drops_fragments():
    assert M.sentences("Free. No sign-up.") == [], M.sentences("Free. No sign-up.")
    assert len("Free. No sign-up.") < M.MIN_SENTENCE_CHARS * 2


t("drops fragments below MIN_SENTENCE_CHARS", _drops_fragments)


def _normalises_reflow_and_case():
    a = M.normalise("Click any symbol\n  to copy   it instantly.")
    b = M.normalise("click any SYMBOL to copy it instantly.")
    assert a == b, f"{a!r} != {b!r}"


t("a reflowed, re-cased copy is still the same sentence", _normalises_reflow_and_case)


def _reads_only_copy_fields():
    got = M.spec_sentences(
        spec(
            slug="greek-symbols-that-are-long-enough-to-pass",
            hero_tagline="Greek letters for maths. " + SHARED,
            note="An internal note that is comfortably long enough.",
        )
    )
    assert M.normalise(SHARED) in got, got
    assert not any("internal note" in v[1] for v in got.values()), got


t("reads only the declared copy fields, not slugs or notes", _reads_only_copy_fields)


def _reports_the_field_it_found():
    got = M.spec_sentences(spec(meta_description="Greek letters for maths. " + SHARED))
    assert got[M.normalise(SHARED)][0] == "meta_description", got


t("reports which field the sentence came from", _reports_the_field_it_found)


# ── the index is keyed on the sentence, not on (field, sentence) ───────────

def _index_ignores_which_field():
    idx = {M.normalise(SHARED): {"a.json", "b.json", "c.json"}}
    introduced, _ = M.classify(
        [("new.json", spec(intro="A page-specific opener here. " + SHARED), None)],
        idx,
        limit=3,
    )
    assert len(introduced) == 1, introduced
    assert introduced[0][1] == "intro", introduced


t("a tagline moved into intro is still the same reused sentence",
  _index_ignores_which_field)


def _field_level_would_have_found_nothing():
    """The wrong design, pinned so it cannot come back.

    Two specs whose taglines are each unique overall but end with the same
    sentence: field equality says clean, sentence equality says reuse.
    """
    a = spec(hero_tagline="Greek letters for maths and fraternities. " + SHARED)
    b = spec(hero_tagline="Zodiac glyphs for bios and captions. " + SHARED)
    assert a["hero_tagline"] != b["hero_tagline"], "fields must differ for this test"
    assert set(M.spec_sentences(a)) & set(M.spec_sentences(b)), "sentences must overlap"


t("field-level comparison would find nothing here; sentence-level finds it",
  _field_level_would_have_found_nothing)


# ── the delta rule ─────────────────────────────────────────────────────────

IDX4 = {M.normalise(SHARED): {"a.json", "b.json", "c.json", "d.json"}}


def _catches_a_pasted_sentence():
    before = spec(hero_tagline="Greek letters for maths and fraternities.")
    after = spec(hero_tagline="Greek letters for maths and fraternities. " + SHARED)
    introduced, pre = M.classify([("greek.json", after, before)], IDX4, limit=3)
    assert len(introduced) == 1, introduced
    assert pre == [], pre


t("CATCH: a branch pasting the shared sentence in is introduced reuse",
  _catches_a_pasted_sentence)


def _catches_a_new_spec_pasted_from_an_old_one():
    introduced, pre = M.classify(
        [("brand-new.json", spec(hero_tagline="Runic letters for names. " + SHARED), None)],
        IDX4,
        limit=3,
    )
    assert len(introduced) == 1, introduced
    assert pre == [], pre


t("CATCH: a brand-new spec pasted from an old one", _catches_a_new_spec_pasted_from_an_old_one)


def _catches_it_in_meta_description():
    introduced, _ = M.classify(
        [("x.json", spec(meta_description="Greek letters A-Z. " + SHARED), spec())],
        IDX4,
        limit=3,
    )
    assert len(introduced) == 1, introduced
    assert introduced[0][1] == "meta_description", introduced


t("CATCH: a duplicated meta_description, the SEO half of the defect",
  _catches_it_in_meta_description)


def _reports_the_other_owners():
    introduced, _ = M.classify(
        [("x.json", spec(hero_tagline="Greek letters A-Z. " + SHARED), spec())],
        IDX4,
        limit=3,
    )
    assert introduced[0][3] == ["a.json", "b.json", "c.json", "d.json"], introduced


t("names the other specs already carrying it", _reports_the_other_owners)


# ── deliberate NON-catches ─────────────────────────────────────────────────

def _no_catch_untouched_reuse():
    """The delta rule, and the reason this gate is not permanently red.

    416 of 591 specs already carry a repeat. Editing a spec's title must not
    indict reuse that was already sitting in it.
    """
    both = spec(hero_tagline="Greek letters for maths. " + SHARED, title="Greek Symbols")
    edited = dict(both, title="Greek Symbols — Copy and Paste")
    introduced, pre = M.classify([("greek.json", edited, both)], IDX4, limit=3)
    assert introduced == [], introduced
    assert len(pre) == 1, pre


t("NON-CATCH: reuse already in the spec is reported, never failed",
  _no_catch_untouched_reuse)


def _no_catch_below_the_limit():
    idx = {M.normalise(SHARED): {"a.json", "b.json"}}
    introduced, _ = M.classify(
        [("x.json", spec(hero_tagline="Greek letters A-Z. " + SHARED), spec())],
        idx,
        limit=3,
    )
    assert introduced == [], "two specs sharing a line is a coincidence, not a template"


t("NON-CATCH: a sentence only two other specs carry is under the limit",
  _no_catch_below_the_limit)


def _no_catch_page_specific_copy():
    """The fix the failure message actually asks for has to come back clean."""
    introduced, pre = M.classify(
        [(
            "greek.json",
            spec(hero_tagline="Alpha through omega, with the maths meaning of each."),
            spec(hero_tagline="Greek letters for maths."),
        )],
        IDX4,
        limit=3,
    )
    assert introduced == [] and pre == [], (introduced, pre)


t("NON-CATCH: genuinely page-specific copy is clean", _no_catch_page_specific_copy)


def _no_catch_own_spec_counted():
    """A spec must not be flagged against itself.

    The corpus index includes the spec being checked, so without the `- {rel}`
    subtraction a sentence in exactly `limit` specs would flag the last one.
    """
    idx = {M.normalise(SHARED): {"a.json", "b.json", "x.json"}}
    introduced, _ = M.classify(
        [("x.json", spec(hero_tagline="Greek letters A-Z. " + SHARED), spec())],
        idx,
        limit=3,
    )
    assert introduced == [], "a spec's own copy must not count toward its own limit"


t("NON-CATCH: a spec is never counted against itself", _no_catch_own_spec_counted)


def _no_catch_non_string_fields():
    introduced, _ = M.classify(
        [("x.json", spec(intro=["a list, not a string"], cta=None, title=7), None)],
        IDX4,
        limit=3,
    )
    assert introduced == [], introduced


t("NON-CATCH: non-string copy fields do not crash or fire", _no_catch_non_string_fields)


def _no_catch_empty_spec():
    assert M.classify([("x.json", spec(), None)], IDX4, limit=3) == ([], [])


t("NON-CATCH: a spec with no copy fields is clean", _no_catch_empty_spec)


# ── the corpus itself ──────────────────────────────────────────────────────

def _corpus_still_has_the_backlog():
    """If this drops to zero the check has stopped reading the specs."""
    paths = M.all_spec_paths()
    assert len(paths) > 400, f"only {len(paths)} specs found — glob broken?"
    index = M.build_index(paths)
    repeated = {k: v for k, v in index.items() if len(v) > 1}
    assert repeated, "no repeated sentences found at all — extraction is broken"


t("the real corpus still parses and still shows the backlog",
  _corpus_still_has_the_backlog)


def _template_examples_excluded():
    assert not any(
        p.endswith("_TEMPLATE.example.json") for p in M.all_spec_paths()
    ), "the template example is a template; counting it would flag every spec"


t("the _TEMPLATE.example.json file is excluded", _template_examples_excluded)


print("Spec sentence reuse gate — tests\n")
for line in LINES:
    print(line)
print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
