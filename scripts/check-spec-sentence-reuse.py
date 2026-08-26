#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-spec-sentence-reuse.py

Per-PR gate: a spec this branch adds or changes may not copy a sentence that is
already doing duty across the spec corpus.

WHY THIS EXISTS
---------------
Page copy on this site is written once per spec, by hand, in
`data/library_page_specs/*.json` and `data/event_page_specs/*.json`. Nothing
compared those specs to each other, so the same sentence got pasted into more
and more of them, and each one generated a live page carrying it.

Measured across 591 specs on 2026-08-26: **45 sentences repeat across more than
one spec, and 416 specs carry at least one of them.** Per field:

    171 specs  hero_tagline      "Click any symbol to copy it instantly."
    148 specs  meta_description  "Click any symbol to copy it instantly."
     91 specs  meta_description  "Click any emoji or combo to copy it instantly."
     86 specs  intro             "Copy a single emoji below, or grab a full combo set with one click."
     55 specs  cta               "Use UltraTextGen to convert plain text into bold, italic, ..."
     21 specs  meta_description  "Click any to copy it instantly."   <- and that one is broken

The two totals count different things and both are wanted. The gate keys on the
SENTENCE, not on (field, sentence) — a tagline moved into `intro` is the same
reused line — so the 171 and the 148 above collapse into one index entry
covering 181 specs. The per-field split is what tells you where to fix it.

`meta_description` matters most: a duplicated meta description across 148 pages
is a plain SEO defect, not only an editorial one.

A NOTE ON WHAT THIS IS NOT, because the first version of this check was
specified wrongly. The obvious design is "reject a spec whose `lead` duplicates
another spec's". Run that and it finds **nothing** — there are zero exact
duplicate `hero_tagline`, `meta_description`, `title` or `intro` values in the
whole corpus. The shared text is a SENTENCE INSIDE an otherwise page-specific
field: every one of those 171 taglines is unique overall and ends with the same
sentence. Field-level comparison is the wrong granularity and would have shipped
a check that could never fire.

DELTA-SCOPED, like every other gate here
----------------------------------------
416 of 591 specs are already in the backlog. A state check would be red on every
PR regardless of what it touched, which is how a gate gets ignored. So a
sentence counts against a branch only when this branch introduces it into a spec
where it was not already. Pre-existing reuse is REPORTED, never silenced.

USAGE
  python3 scripts/check-spec-sentence-reuse.py                # vs origin/main
  python3 scripts/check-spec-sentence-reuse.py --base main
  python3 scripts/check-spec-sentence-reuse.py --audit        # whole-corpus picture
  python3 scripts/check-spec-sentence-reuse.py --limit 3

Exit: 0 clean or audit; 1 this branch introduced reuse; 2 the diff failed.

NOTE: it diffs merge-base..HEAD, so uncommitted work is invisible. Commit first.
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SPEC_GLOBS = ["data/library_page_specs/*.json", "data/event_page_specs/*.json"]

# Fields that become reader-facing page copy. Deliberately explicit: scanning
# every string field would pull in slugs, hrefs and symbol labels, where reuse
# is correct rather than a defect.
COPY_FIELDS = ("hero_tagline", "meta_description", "intro", "cta", "title")

# A sentence shorter than this is a fragment ("Free, no sign-up.") where reuse is
# not meaningfully avoidable, and flagging it would train people to ignore this.
MIN_SENTENCE_CHARS = 25

# How many OTHER specs may already carry a sentence before copying it again is a
# defect. Two specs sharing a line is a coincidence; four is a template forming.
DEFAULT_REUSE_LIMIT = 3

MAX_SHOWN = 8


def git(args, **kw):
    return subprocess.run(
        ["git"] + args, cwd=REPO, capture_output=True, text=True, **kw
    )


def sentences(text):
    """Split on sentence terminators, including full-width ones."""
    parts = re.split(r"(?<=[.!?。！？؟])\s+|(?<=[。！？])", text.strip())
    return [p.strip() for p in parts if len(p.strip()) >= MIN_SENTENCE_CHARS]


def normalise(s):
    """Compare on collapsed whitespace and case, so a reflow is still reuse."""
    return re.sub(r"\s+", " ", s).strip().lower()


def spec_sentences(data):
    """{normalised sentence: (field, original)} for one parsed spec."""
    out = {}
    for field in COPY_FIELDS:
        value = data.get(field)
        if not isinstance(value, str):
            continue
        for s in sentences(value):
            out.setdefault(normalise(s), (field, s))
    return out


def load_spec(path_or_text, is_text=False):
    try:
        raw = path_or_text if is_text else open(
            os.path.join(REPO, path_or_text), encoding="utf-8"
        ).read()
        return json.loads(raw)
    except (OSError, ValueError):
        return None


def all_spec_paths():
    paths = []
    for pattern in SPEC_GLOBS:
        paths.extend(sorted(glob.glob(os.path.join(REPO, pattern))))
    return [
        os.path.relpath(p, REPO)
        for p in paths
        if not p.endswith("_TEMPLATE.example.json")
    ]


def build_index(paths):
    """{normalised sentence: {spec paths}} across the corpus.

    Keyed on the SENTENCE, never on (field, sentence): the same line pasted into
    one spec's `hero_tagline` and another's `meta_description` is one reused
    sentence, and scoping the key by field would let it hide by moving.
    """
    index = defaultdict(set)
    for rel in paths:
        data = load_spec(rel)
        if not data:
            continue
        for norm in spec_sentences(data):
            index[norm].add(rel)
    return index


def fields_carrying(paths, norm):
    """Which copy fields a given sentence actually lands in, across the corpus."""
    found = set()
    for rel in paths:
        data = load_spec(rel)
        if not data:
            continue
        for field in COPY_FIELDS:
            value = data.get(field)
            if isinstance(value, str) and any(
                normalise(x) == norm for x in sentences(value)
            ):
                found.add(field)
    return sorted(found)


# ── audit ──────────────────────────────────────────────────────────────────

def run_audit(limit):
    paths = all_spec_paths()
    index = build_index(paths)
    repeated = {k: v for k, v in index.items() if len(v) > 1}
    touched = {p for v in repeated.values() for p in v}

    print("Spec sentence reuse — whole-corpus audit (informational)")
    print(f"  specs scanned:                       {len(paths)}")
    print(f"  sentences repeated across >1 spec:   {len(repeated)}")
    print(f"  specs carrying at least one repeat:  {len(touched)}")
    print(f"  reuse limit for the gate:            {limit} other spec(s)\n")

    rows = sorted(repeated.items(), key=lambda kv: -len(kv[1]))
    print(f"  {'specs':>6}  field(s)                        sentence")
    for norm, owners in rows[:20]:
        data = load_spec(sorted(owners)[0])
        _, original = spec_sentences(data).get(norm, ("?", norm))
        where = ",".join(fields_carrying(sorted(owners), norm))
        print(f"  {len(owners):>6}  {where:<31} {original[:70]}")
    if len(rows) > 20:
        print(f"  … and {len(rows) - 20} more repeated sentence(s)")
    print(
        "\n  This is the backlog, not a failure. The gate only fails a branch that\n"
        "  ADDS reuse. See docs/editorial-footprint-upstream-findings-2026-08-26.md §3."
    )
    return 0


# ── the delta decision ─────────────────────────────────────────────────────

def classify(pairs, index, limit=DEFAULT_REUSE_LIMIT):
    """Split reused sentences into (introduced by this branch, pre-existing).

    `pairs` is [(rel, spec-now, spec-at-merge-base-or-None)]; `index` is the
    whole-corpus map from build_index(). Pure — no git, no filesystem — so the
    delta rule this gate lives or dies on is testable without a scratch repo.

    A sentence counts as INTRODUCED when the branch put it into a spec that did
    not carry it at the merge base. A brand-new spec (before is None) carries
    nothing at the merge base, so every reused sentence in it is introduced —
    which is the point: a new spec pasted from an old one is exactly the defect.
    """
    introduced, pre_existing = [], []
    for rel, now, before in pairs:
        had = set(spec_sentences(before)) if before else set()
        for norm, (field, original) in spec_sentences(now).items():
            others = index.get(norm, set()) - {rel}
            if len(others) < limit:
                continue
            row = (rel, field, original, sorted(others))
            (pre_existing if norm in had else introduced).append(row)
    return introduced, pre_existing


# ── gate ───────────────────────────────────────────────────────────────────

def run_gate(base, limit):
    probe = git(["rev-parse", "--verify", base])
    if probe.returncode != 0:
        branch = base.split("/", 1)[-1]
        git(["fetch", "--depth=200", "origin", branch])
        base = f"origin/{branch}"
        if git(["rev-parse", "--verify", base]).returncode != 0:
            sys.stderr.write(f"[error] cannot resolve base ref {base}\n")
            return 2

    mb = git(["merge-base", base, "HEAD"])
    if mb.returncode != 0:
        sys.stderr.write("[error] cannot compute merge-base\n")
        return 2
    merge_base = mb.stdout.strip()

    changed = [
        p
        for p in git(
            ["diff", "--name-only", "--diff-filter=ACMR", merge_base, "HEAD", "--"]
            + SPEC_GLOBS
        ).stdout.split("\n")
        if p.strip() and not p.endswith("_TEMPLATE.example.json")
    ]

    print("Spec sentence reuse check")
    print(f"  base:           {base} (merge-base {merge_base[:8]})")
    print(f"  changed specs:  {len(changed)}")

    if not changed:
        print("\nNo changed specs — nothing to check. ✓")
        return 0

    corpus = all_spec_paths()
    index = build_index(corpus)

    pairs = []
    for rel in changed:
        now = load_spec(rel)
        if not now:
            continue
        before_blob = git(["show", f"{merge_base}:{rel}"])
        before = (
            load_spec(before_blob.stdout, is_text=True)
            if before_blob.returncode == 0
            else None
        )
        pairs.append((rel, now, before))

    introduced, pre_existing = classify(pairs, index, limit)

    print(f"  reuse introduced: {len(introduced)}")
    if pre_existing:
        print(f"  pre-existing (not this branch's): {len(pre_existing)}")
    print("")

    if pre_existing:
        print(
            f"Reported, not failed — {len(pre_existing)} reused sentence(s) were already in"
        )
        print("these specs at the merge base:")
        for rel, field, original, others in pre_existing[:5]:
            print(f"    · {rel} [{field}] shared with {len(others)} spec(s)")
        if len(pre_existing) > 5:
            print(f"    … and {len(pre_existing) - 5} more")
        print("  Whole-corpus picture: python3 scripts/check-spec-sentence-reuse.py --audit")
        print("")

    if not introduced:
        print("This branch introduced no spec sentence reuse. ✓")
        return 0

    for rel, field, original, others in introduced[:MAX_SHOWN]:
        print(f"✗ {rel}")
        print(f"    field:    {field}")
        print(f"    sentence: {original[:110]}")
        print(f"    already in {len(others)} other spec(s), e.g. {', '.join(others[:3])}")
        print("")
    if len(introduced) > MAX_SHOWN:
        print(f"    … and {len(introduced) - MAX_SHOWN} more\n")

    print("Fix: write a sentence about THIS page.")
    print("  · A tagline is the one line a reader sees first; if it is true of 170")
    print("    other pages it tells them nothing about this one.")
    print("  · A duplicated meta_description is an SEO defect, not just a style one.")
    print("  · Do not solve it by swapping words — Google's spam policy names")
    print("    \"automated transformations like synonymizing\" as scaled content abuse.")
    print("    Say something specific instead: what this symbol is for, where it")
    print("    breaks, what it is confused with.")
    print("  · If a sentence genuinely must be shared, it belongs in the generator")
    print("    default, not copied into N specs — then it is one string with one owner.")
    return 1


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--audit", action="store_true", help="whole-corpus report, never fails")
    ap.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_REUSE_LIMIT,
        help="how many OTHER specs may carry a sentence before reuse is a defect",
    )
    args = ap.parse_args()
    return run_audit(args.limit) if args.audit else run_gate(args.base, args.limit)


if __name__ == "__main__":
    raise SystemExit(main())
