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

ERRORS AND WARNINGS ARE DELIBERATELY DIFFERENT STRENGTHS
--------------------------------------------------------
ERROR   the parent renders a combo-set section and this page renders none —
        a whole section of the page is missing. This is the defect that
        shipped.
WARNING the page renders it with a different number of groups — a thin or
        extended section, not a missing one. Some of those are deliberate
        (de-text-art carries 8 against its parent's 6). Gating on it would
        fail PRs for edits nobody made.

  python3 scripts/check-locale-collection-parity.py [--base origin/main] [--all]
"""
import argparse
import os
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


def inspect(rel):
    """(verdict, detail) for one locale page: 'ok' | 'missing' | 'gap' | None."""
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
    if sum(mine.values()) != sum(en.values()):
        return "gap", (en_rel, sum(en.values()), sum(mine.values()))
    return "ok", None


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

    errors, warns, ok = [], [], 0
    for rel in changed:
        verdict, detail = inspect(rel)
        if verdict == "missing":
            errors.append((rel, detail))
        elif verdict == "gap":
            warns.append((rel, detail))
        elif verdict == "ok":
            ok += 1
    print(f"  carrying the section:  {ok}")
    print(f"  missing it entirely:   {len(errors)}")
    print(f"  group-count gaps:      {len(warns)}\n")

    for rel, (en_rel, ids, n) in errors:
        print(f"  ERROR  {rel}")
        print(f"         its EN parent {en_rel} renders a combo-set section "
              f"(#{', #'.join(ids)}, {n} groups) and this page renders none.")
        print(f"         Those tiles are built at runtime by buildGrids(), so the "
              f"page still passes every tile, link and FAQ count.")
    for rel, (en_rel, en_n, my_n) in warns:
        print(f"  warn   {rel}: {my_n} combo-set groups against {en_rel}'s {en_n}")

    if args.all:
        print(f"\nWhole-site scan — informational, never gates. "
              f"{len(errors)} page(s) missing the section, {len(warns)} short or long on groups.")
        return 0
    if errors:
        print(f"\n{len(errors)} page(s) this branch touches ship without their parent's "
              f"combo-set section. Mirror the parent's section and its GROUPS script, "
              f"or the page silently loses a whole section that nothing else can see.")
        return 1
    print("Every locale page this branch touches carries its EN parent's combo-set section. ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
