#!/usr/bin/env python3
"""audit-spec-drift.py — whole-site dashboard: does every library spec still describe its page?

Informational (exit 0), or 2 UNKNOWN when an input cannot be read. The gate is
scripts/check-spec-drift.py; both read the one definition in scripts/lib/spec_drift.py.

Reports
  1. every spec whose copy tiles differ from its live page, by cause, split into
     not-localized pages (must match: no exception is accepted) and localized pages
     (may differ only with an entry in data/spec_drift_exceptions.json);
  2. locale specs whose reference page has no spec (the rule since 2026-11-18: a page
     needs a spec before it is localized);
  3. library/symbol pages with no spec at all, per locale;
  4. any page claimed by two specs.

USAGE
  python3 scripts/audit-spec-drift.py               # summary + every drifting spec
  python3 scripts/audit-spec-drift.py --json out.json
  python3 scripts/audit-spec-drift.py --class page-only --labels
"""

import argparse
import glob
import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import spec_drift as sd  # noqa: E402
import canonical_intents as ci  # noqa: E402

ROOT = sd.ROOT


def registry_locales():
    path = os.path.join(ROOT, "data", "locale_qualification_tiers.json")
    try:
        with open(path, encoding="utf-8") as fh:
            return sorted(json.load(fh)["locales"].keys())
    except (OSError, ValueError, KeyError) as e:
        raise sd.Unknown(f"data/locale_qualification_tiers.json unreadable ({e})")


def lane_pages(locale):
    prefix = "" if locale == "en" else f"{locale}/"
    out = []
    for lane in ("library", "symbol"):
        out += [os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, prefix + lane, "*", "index.html"))]
    return sorted(out)


def collect():
    reg = ci.load(ROOT)
    exceptions = sd.load_exceptions(ROOT)
    by_page = sd.spec_by_page(ROOT)
    rows, no_page, no_ref_spec = [], [], []
    for rel in sd.spec_files(ROOT):
        spec = sd.load_json_text(sd.read(ROOT, rel), rel)
        page = sd.page_rel_for(spec)
        if not page or not os.path.exists(os.path.join(ROOT, page)):
            no_page.append(rel)
            continue
        result = sd.compare(spec, sd.read(ROOT, page))
        ref = sd.reference_url(spec, ROOT, reg)
        localized = ref is not None
        if localized:
            ref_rel = ci.url_to_rel(ref)
            if ref_rel not in by_page:
                no_ref_spec.append((rel, ref_rel))
        left = sd.apply_exception(result, exceptions.get(rel)) if localized else result
        cls = sd.classify(spec, result)
        rows.append({"spec": rel, "page": page, "localized": localized, "class": cls,
                     "excepted": rel in exceptions, "open": sd.has_drift(left),
                     "spec_count": result["spec_count"], "page_count": result["page_count"],
                     "page_only": result["page_only"], "spec_only": result["spec_only"],
                     "label": [list(x) for x in result["label"]]})
    no_spec = {}
    for loc in ["en"] + registry_locales():
        pages = [p for p in lane_pages(loc) if p not in by_page]
        if pages:
            no_spec[loc] = pages
    double = {p: specs for p, specs in by_page.items() if len(specs) > 1}
    bad_exceptions = [s for s in exceptions if not any(r["spec"] == s and r["localized"] for r in rows)]
    return rows, no_page, no_ref_spec, no_spec, double, bad_exceptions


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", help="write the full result to this path")
    ap.add_argument("--class", dest="cls", help="list only this cause (page-only, spec-only, spec-duplicate, "
                                                "code-point, escaping, both, label-only)")
    ap.add_argument("--labels", action="store_true", help="also print label differences")
    ap.add_argument("--no-spec", action="store_true", help="list every page with no spec")
    a = ap.parse_args()
    try:
        rows, no_page, no_ref_spec, no_spec, double, bad_exc = collect()
    except (sd.Unknown, ci.RegistryUnavailable) as e:
        print(f"UNKNOWN: {e}. This is not a clean result.")
        return 2

    drift = [r for r in rows if r["class"] != "match"]
    print(f"Spec drift audit: {len(rows)} specs with a page, {len(drift)} differ from it.\n")
    tab = Counter((r["class"], "localized" if r["localized"] else "not localized") for r in drift)
    print(f"  {'cause':<16} {'not localized':>14} {'localized':>10}")
    for cls in sorted({c for c, _ in tab}):
        print(f"  {cls:<16} {tab[(cls, 'not localized')]:>14} {tab[(cls, 'localized')]:>10}")
    open_rows = [r for r in drift if r["open"]]
    print(f"\n  open (no exception covers it): {len(open_rows)}"
          f" · excepted: {sum(1 for r in drift if r['excepted'] and not r['open'])}")
    print("  not-localized pages must match their spec; no exception is accepted for them.")

    print(f"\nLocale specs whose reference page has no spec (build that spec first): {len(no_ref_spec)}")
    for rel, ref in no_ref_spec[:40]:
        print(f"  {rel}  ->  {ref}")
    if len(no_ref_spec) > 40:
        print(f"  … and {len(no_ref_spec) - 40} more (--json for all)")

    total_no_spec = sum(len(v) for v in no_spec.values())
    print(f"\nLibrary/symbol pages with no spec: {total_no_spec}")
    print("  " + " · ".join(f"{k} {len(v)}" for k, v in sorted(no_spec.items(), key=lambda kv: -len(kv[1]))))
    if a.no_spec:
        for loc, pages in sorted(no_spec.items()):
            for p in pages:
                print(f"    {p}")

    if no_page:
        print(f"\nSpecs with no page on disk: {len(no_page)}")
        for rel in no_page:
            print(f"  {rel}")
    if double:
        print(f"\nPages claimed by two or more specs: {len(double)}")
        for p, specs in sorted(double.items()):
            print(f"  {p}: {', '.join(specs)}")
    if bad_exc:
        print(f"\nException entries that name no localized spec (not accepted): {len(bad_exc)}")
        for s in bad_exc:
            print(f"  {s}")

    print("\nDrifting specs:")
    for r in sorted(drift, key=lambda r: (r["class"], r["spec"])):
        if a.cls and r["class"] != a.cls:
            continue
        if r["class"] == "label-only" and not a.labels and not a.cls:
            continue
        tag = "localized" if r["localized"] else "NOT localized"
        exc = " [excepted]" if r["excepted"] and not r["open"] else ""
        print(f"  {r['class']:<15} {r['spec']}  spec {r['spec_count']} · page {r['page_count']}  ({tag}){exc}")
        if r["page_only"]:
            print(f"      page only: {' '.join(r['page_only'][:16])}{' …' if len(r['page_only']) > 16 else ''}")
        if r["spec_only"]:
            print(f"      spec only: {' '.join(r['spec_only'][:16])}{' …' if len(r['spec_only']) > 16 else ''}")
        if a.labels:
            for ch, sl, pl in r["label"][:6]:
                print(f"      label {ch}: spec {sl!r} · page {pl!r}")
    if not a.labels and not a.cls:
        print(f"  ({sum(1 for r in drift if r['class'] == 'label-only')} label-only specs hidden; --labels to list)")

    if a.json:
        with open(a.json, "w", encoding="utf-8") as fh:
            json.dump({"rows": rows, "no_page": no_page, "no_reference_spec": no_ref_spec,
                       "no_spec": no_spec, "double": double, "bad_exceptions": bad_exc},
                      fh, ensure_ascii=False, indent=1)
        print(f"\nwrote {a.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
