#!/usr/bin/env python3
"""Per-PR gate: a locale page must carry its EN parent's combo-set section.

A `copy_pattern: "collection"` section renders at runtime through
`UltraTextGen.buildGrids()`, so it leaves no static markup and every other
gate on this site is blind to it. 43 locale pages went live without the
section their parent carries — indexable, meshed, schema-clean, art-complete,
passing every check — because nothing compared the two pages on this axis.

WHY THIS EXISTS ALONGSIDE check_locale_spec.py
----------------------------------------------
That check asks the same question of a locale SPEC, and a spec is the wrong
artifact: of the 798 pages here that render a combo set, 327 have a spec and
471 were hand-built. Keyed on specs it cannot see the other 471 — and 61
locale pages carrying exactly this defect were inside that blind spot, found
only by re-running the survey over pages instead. Keep both: the spec check
stops a bad page being GENERATED, this one stops a bad page being SHIPPED.

WHY IT IS DIFF-SCOPED
---------------------
Same reason as check-new-page-image-assets.py and
check-library-hub-coverage.js: a real backlog exists (61 pages missing the
section outright, 32 more short some groups, at the time this was written),
and a check that is red regardless of what a PR touches is one people learn
to ignore. Only pages this branch adds or changes can fail it. Pre-existing
backlog is reported, never counted.

THREE VERDICTS, NOT A COUNT
---------------------------
A count difference alone says nothing about whether anything is wrong, and
adjudicating all 32 of them by hand showed they were three unrelated things.
The COMBO PAYLOADS separate them, so this compares those, not the tally:

ERROR   `missing`  — the parent renders a combo-set section and this page
        renders none. A whole section absent. 61 pages shipped this way.
ERROR   `subset`   — the page carries the parent's OWN combos, byte for byte,
        with N of them simply dropped. de/library/roblox-symbole ran 6 of the
        parent's 9. Unambiguous, and at zero backlog, so it gates.
note    `authored` — not one payload in common: the locale wrote its own set.
        Turkish "Hüngür Hüngür", Japanese 量産型セット, Russian «цвета биаса»,
        Swedish "Soft girl & coquette-set". Forcing the English set onto these
        would destroy real localisation, so this is reported and never failed —
        including when the locale set is SMALLER, because depth is a demand
        question, not a parity one.
note    `extra`    — the page adds a group the parent has no reason to carry:
        es "Hispanoamérica", pt "CPLP", ko "한글 자모 세트". Never a defect.

Getting this wrong in the obvious direction is the expensive mistake: a
German page was once read as ahead of its parent on a tile count and nearly
promoted, when it was the degraded copy. Different is not better OR worse
until you look at what the payloads actually are.

  python3 scripts/check-locale-collection-parity.py [--base origin/main] [--all]
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))
from collection_sets import sets_in, en_parent_rel, read  # noqa: E402


def git(args):
    return subprocess.run(["git"] + args, cwd=ROOT, capture_output=True,
                          text=True, check=True).stdout


def resolve_base(requested):
    try:
        subprocess.run(["git", "rev-parse", "--verify", requested],
                       cwd=ROOT, capture_output=True, check=True)
        return requested
    except subprocess.CalledProcessError:
        branch = requested.replace("origin/", "")
        subprocess.run(["git", "fetch", "--depth=200", "origin", branch],
                       cwd=ROOT, capture_output=True)
        candidate = f"origin/{branch}"
        subprocess.run(["git", "rev-parse", "--verify", candidate],
                       cwd=ROOT, capture_output=True, check=True)
        return candidate


GROUP_PAYLOAD = re.compile(
    r'\bflags\s*:\s*(\[[^\]]*\])\s*(?:,\s*defaultFormat)?', re.S)
_WS = re.compile(r"\s+")


def payloads(html):
    """Each group's flags array as normalised source text — the identity of the
    combo itself, independent of what the group is called in any language."""
    return [_WS.sub("", m.group(1)) for m in GROUP_PAYLOAD.finditer(html)]


def inspect(rel):
    """(verdict, detail): 'ok' | 'missing' | 'subset' | 'authored' | 'extra'."""
    html = read(ROOT, rel)
    if html is None:
        return None, None
    en_rel = en_parent_rel(html)
    if not en_rel:
        return None, None  # no EN parent declared — audit-hreflang.js's job
    en_html = read(ROOT, en_rel)
    if en_html is None:
        return None, None
    en, mine = sets_in(en_html), sets_in(html)
    if not en:
        return None, None  # parent renders no combo set — nothing to mirror
    if not mine:
        return "missing", (en_rel, sorted(en), sum(en.values()))
    if sum(mine.values()) == sum(en.values()):
        return "ok", None

    ep, mp = payloads(en_html), payloads(html)
    absent = [p for p in ep if p not in set(mp)]
    extra = [p for p in mp if p not in set(ep)]
    n = (en_rel, sum(en.values()), sum(mine.values()))
    if absent and not extra:
        return "subset", n + (len(absent),)
    if not absent:
        return "extra", n
    return "authored", n + (len(ep) - len(absent), len(absent), len(extra))


def locale_pages():
    """Every <lang>/library/<slug>/ and <lang>/symbol/<slug>/ page.

    Walked, not globbed: `zh-tw` is five characters, and a two-character glob
    silently skipped 73 of its pages for as long as one existed here.
    """
    out = []
    for dirpath, _dirs, files in os.walk(ROOT):
        if "index.html" not in files:
            continue
        rel = os.path.relpath(os.path.join(dirpath, "index.html"), ROOT)
        parts = rel.split(os.sep)
        if len(parts) == 4 and parts[1] in ("library", "symbol") and parts[0] != "library":
            out.append(rel.replace(os.sep, "/"))
    return sorted(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--all", action="store_true",
                    help="scan every locale page instead of the branch diff "
                         "(reports the standing backlog; never gates)")
    args = ap.parse_args()

    if args.all:
        changed = locale_pages()
    else:
        try:
            base = resolve_base(args.base)
            mb = git(["merge-base", base, "HEAD"]).strip()
        except subprocess.CalledProcessError as e:
            print(f"Could not resolve base ref {args.base!r}: {e}")
            return 2
        changed = [l.strip() for l in git(
            ["diff", "--name-only", "--diff-filter=ACMR", mb, "HEAD", "--",
             "*/library/*/index.html", "*/symbol/*/index.html"]).splitlines() if l.strip()]
        changed = [c for c in changed if not c.startswith(("library/", "symbol/"))]

    print("Locale Combo-Set Parity Check")
    print(f"  scope:                 {'whole site' if args.all else args.base}")
    print(f"  locale pages examined: {len(changed)}")

    by = {"ok": [], "missing": [], "subset": [], "authored": [], "extra": []}
    for rel in changed:
        verdict, detail = inspect(rel)
        if verdict:
            by[verdict].append((rel, detail))
    print(f"  matching the parent:   {len(by['ok'])}")
    print(f"  missing it entirely:   {len(by['missing'])}")
    print(f"  dropping its combos:   {len(by['subset'])}")
    print(f"  locale-authored set:   {len(by['authored'])}")
    print(f"  adding a local group:  {len(by['extra'])}\n")

    for rel, (en_rel, ids, n) in by["missing"]:
        print(f"  ERROR  {rel}")
        print(f"         its EN parent {en_rel} renders a combo-set section "
              f"(#{', #'.join(ids)}, {n} groups) and this page renders none.")
        print("         Those tiles are built at runtime by buildGrids(), so the "
              "page still passes every tile, link and FAQ count.")
    for rel, (en_rel, en_n, my_n, absent) in by["subset"]:
        print(f"  ERROR  {rel}")
        print(f"         carries {en_rel}'s own combos but drops {absent} of them "
              f"({my_n} of {en_n}). Not a locale-authored set — the combos it "
              f"does carry are byte-identical to the parent's.")
    for rel, (en_rel, en_n, my_n, shared, absent, extra) in by["authored"]:
        how = ("none of its payloads are the parent's" if shared == 0
               else f"{shared} payload(s) shared, {absent} replaced")
        print(f"  note   {rel}: {my_n} groups against {en_rel}'s {en_n} — {how}, "
              f"so this is locale-authored copy, not drift")
    for rel, (en_rel, en_n, my_n) in by["extra"]:
        print(f"  note   {rel}: {my_n} against {en_rel}'s {en_n}, adding a "
              f"locale-specific group the parent has no reason to carry")

    failed = by["missing"] + by["subset"]
    if args.all:
        print(f"\nWhole-site scan — informational, never gates. "
              f"{len(by['missing'])} missing the section, {len(by['subset'])} dropping "
              f"combos, {len(by['authored']) + len(by['extra'])} legitimately divergent.")
        return 0
    if failed:
        print(f"\n{len(failed)} page(s) this branch touches lose combos their EN parent "
              f"ships. Mirror the parent's section and its GROUPS script; a locale that "
              f"genuinely wants its own set writes its own payloads, which this check "
              f"reports as `authored` rather than failing.")
        return 1
    print("Every locale page this branch touches carries its EN parent's combos. ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
