#!/usr/bin/env python3
"""check-spec-drift.py — gate: a PR may not make a library spec and its page disagree.

The one definition of a disagreement is scripts/lib/spec_drift.py; the whole-site view
is scripts/audit-spec-drift.py. Owner rules, 2026-11-18:

  1. A page that is not localized has no reason to differ from its spec. New drift
     there fails, and no exception can excuse it.
  2. A localized page may differ only when it was further localized for its language,
     recorded in data/spec_drift_exceptions.json. New drift there fails unless an
     entry names it.
  3. A page needs a spec before it is localized. A locale library/symbol page added in
     this PR must be generated from a spec, and that spec's reference page must itself
     have one.

DELTA, NOT STATE. On 2026-11-18, after the repair that introduced this gate, 123 specs
still differed from their pages (57 by tiles the page has and the spec lacks, 65 by
visible labels, 1 page the spec does not describe). Those are reported, never failed:
a finding counts only if it is new since the merge base. A pair whose spec or page
this PR touches is compared at the merge base and at HEAD; a repair that moves one
side toward the other adds nothing and passes (it measures convergence, so a
backfill cannot read as damage).

Exit: 0 clean (or nothing in scope) · 1 new drift / rule 3 broken / an exception on a
not-localized page · 2 UNKNOWN (base ref, registry, exceptions file or a spec cannot be
read; never a pass).

USAGE
  python3 scripts/check-spec-drift.py                 # against origin/main
  python3 scripts/check-spec-drift.py --base main
  python3 scripts/check-spec-drift.py --files data/library_page_specs/es/x.json
"""

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import spec_drift as sd  # noqa: E402
import canonical_intents as ci  # noqa: E402

ROOT = sd.ROOT
LANE_PAGE_RE = re.compile(r"^(?:([^/]+)/)?(library|symbol)/[^/]+/index\.html$")


def registry_locales():
    """The canonical locale list (never a filesystem glob or a two-letter pattern)."""
    path = os.path.join(ROOT, "data", "locale_qualification_tiers.json")
    try:
        with open(path, encoding="utf-8") as fh:
            return set(json.load(fh)["locales"])
    except (OSError, ValueError, KeyError) as e:
        raise sd.Unknown(f"data/locale_qualification_tiers.json unreadable ({e})")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)


def merge_base(base):
    if git("rev-parse", "--verify", base).returncode != 0:
        raise sd.Unknown(f"cannot resolve base ref {base!r} (shallow clone or wrong name)")
    mb = git("merge-base", base, "HEAD")
    if mb.returncode != 0:
        raise sd.Unknown(f"no merge base between {base!r} and HEAD (shallow clone?)")
    return mb.stdout.strip()


def changed(mb):
    """{path: status} for files changed since the merge base, committed or not."""
    out = {}
    for args in (["diff", "--name-status", "--find-renames", mb, "HEAD"],
                 ["diff", "--name-status", "--find-renames", "HEAD"]):
        r = git(*args)
        if r.returncode != 0:
            raise sd.Unknown(f"git {' '.join(args)} failed: {r.stderr.strip()}")
        for line in r.stdout.splitlines():
            parts = line.split("\t")
            st, path = parts[0][0], parts[-1]
            if st != "D":
                out[path] = "A" if st == "A" and path not in out else out.get(path, st)
    for path in git("ls-files", "--others", "--exclude-standard").stdout.splitlines():
        out[path] = "A"
    return out


def at_base(mb, rel):
    r = git("show", f"{mb}:{rel}")
    return r.stdout if r.returncode == 0 else None


def new_findings(head, base):
    """What HEAD's drift has that the merge base's did not."""
    if base is None:
        return head
    po = Counter(head["page_only"]) - Counter(base["page_only"])
    so = Counter(head["spec_only"]) - Counter(base["spec_only"])
    base_labels = {tuple(x) for x in base["label"]}
    return dict(head, page_only=sorted(po.elements()), spec_only=sorted(so.elements()),
                label=[x for x in head["label"] if tuple(x) not in base_labels])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--files", nargs="*", help="check these specs/pages instead of the diff (state check, "
                                               "every drift counts)")
    a = ap.parse_args()

    try:
        reg = ci.load(ROOT)
        locales = registry_locales()
        exceptions = sd.load_exceptions(ROOT)
        by_page = sd.spec_by_page(ROOT)
        if a.files is not None:
            mb, files = None, {f: "M" for f in a.files}
        else:
            mb = merge_base(a.base)
            files = changed(mb)
    except (sd.Unknown, ci.RegistryUnavailable) as e:
        print(f"UNKNOWN: {e}. This is not a pass.")
        return 2

    spec_prefix = sd.SPEC_DIR_REL.replace(os.sep, "/") + "/"
    pairs = {}  # spec_rel -> page_rel
    errors, notes = [], []

    for path, st in sorted(files.items()):
        if path.startswith(spec_prefix) and path.endswith(".json") and not path.endswith(sd.TEMPLATE_NAME):
            try:
                spec = sd.load_json_text(sd.read(ROOT, path), path)
            except (sd.Unknown, OSError) as e:
                print(f"UNKNOWN: {e}. This is not a pass.")
                return 2
            page = sd.page_rel_for(spec)
            pairs[path] = page
            # rule 3, for a locale spec added in this PR
            if st == "A":
                ref = sd.reference_url(spec, ROOT, reg)
                if ref and ci.url_to_rel(ref) not in by_page:
                    errors.append(f"{path}: its reference page {ci.url_to_rel(ref)} has no spec. A page needs a "
                                  f"spec before it is localized: build the reference page's spec first, matching "
                                  f"that page, then translate from it.")
        m = LANE_PAGE_RE.match(path)
        if m and m.group(1) and m.group(1) not in locales:
            m = None  # not a locale directory
        if m:
            specs = by_page.get(path)
            if specs:
                pairs.setdefault(specs[0], path)
            elif st == "A" and m.group(1):
                errors.append(f"{path}: a new locale page with no spec. Localized library/symbol pages are "
                              f"generated from a spec (data/library_page_specs/{m.group(1)}/<slug>.json), "
                              f"and the reference page needs one first.")

    # exceptions are accepted only on localized pages
    for spec_rel in exceptions:
        if not os.path.exists(os.path.join(ROOT, spec_rel)):
            errors.append(f"{sd.EXCEPTIONS_REL}: entry for {spec_rel}, which does not exist")
            continue
        spec = sd.load_json_text(sd.read(ROOT, spec_rel), spec_rel)
        if not sd.is_localized(spec, ROOT, reg):
            errors.append(f"{sd.EXCEPTIONS_REL}: {spec_rel} is not a localized page. A page that is not "
                          f"localized must match its spec; no exception is accepted for it.")

    for spec_rel, page_rel in sorted(pairs.items()):
        if not page_rel or not os.path.exists(os.path.join(ROOT, page_rel)):
            notes.append(f"{spec_rel}: no page on disk yet ({page_rel})")
            continue
        spec = sd.load_json_text(sd.read(ROOT, spec_rel), spec_rel)
        head = sd.compare(spec, sd.read(ROOT, page_rel))
        base = None
        if mb:
            bs, bp = at_base(mb, spec_rel), at_base(mb, page_rel)
            if bs is not None and bp is not None:
                try:
                    base = sd.compare(json.loads(bs), bp)
                except ValueError:
                    base = None
        new = new_findings(head, base)
        localized = sd.is_localized(spec, ROOT, reg)
        if localized:
            new = sd.apply_exception(new, exceptions.get(spec_rel))
        if sd.has_drift(new):
            kind = "localized" if localized else "not localized"
            msg = [f"{spec_rel} and {page_rel} now disagree ({kind}):"]
            if new["page_only"]:
                msg.append(f"    the page copies what the spec lacks: {' '.join(new['page_only'][:12])}")
            if new["spec_only"]:
                msg.append(f"    the spec lists what the page lacks: {' '.join(new['spec_only'][:12])}")
            for ch, sl, pl in new["label"][:6]:
                msg.append(f"    label of {ch}: spec {sl!r}, page {pl!r}")
            msg.append("    Fix: change the spec and the page together (the generator renders the spec). "
                       + ("If this locale was deliberately localized further, record it in "
                          f"{sd.EXCEPTIONS_REL} with the owner's decision." if localized else
                          "A page that is not localized cannot be excepted."))
            errors.append("\n".join(msg))
        elif sd.has_drift(head):
            notes.append(f"{spec_rel}: pre-existing drift, reported not failed "
                         f"(page-only {len(head['page_only'])}, spec-only {len(head['spec_only'])}, "
                         f"labels {len(head['label'])}); npm run audit:spec-drift")

    print(f"check:spec-drift — {len(pairs)} spec/page pair(s) in scope"
          + (f" since {mb[:9]}" if mb else ""))
    for n in notes:
        print(f"  note  {n}")
    for e in errors:
        print(f"  FAIL  {e}")
    if errors:
        print(f"\n{len(errors)} problem(s). See scripts/lib/spec_drift.py for the rules.")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
