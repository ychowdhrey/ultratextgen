#!/usr/bin/env python3
"""
mine-locale-glossary.py

Build a translation glossary out of the site's OWN shipped locale pages.

WHY
---
`data/library_page_specs/` holds 360 English specs and 1,116 locale specs. Every
one of those locale specs is a translation somebody already made, reviewed and
shipped. Nothing read them as a corpus — the one cross-spec tool,
check-spec-sentence-reuse.py, exists to FORBID reuse of prose, which is correct
for page copy and exactly wrong for terminology. So each new translation pass
re-decided vocabulary that had already been settled, and the only way to answer
"what do we call this in Dutch?" was to open other pages and read.

That is not hypothetical. Deciding that the Dutch nav label for "Guides" should
be "Gidsen" took a manual sweep of 28 other locales' footers. The answer was
already in this repo.

WHAT IT EXTRACTS
----------------
Only terms, never sentences. Prose is page-specific and reusing it is the defect
check-spec-sentence-reuse.py gates on; terminology is the opposite — it SHOULD be
consistent, and inconsistency is the bug.

  * symbol tile labels  — joined on the symbol CHARACTER, so the pairing is
                          exact. "§" is "§" in every language, so an EN label of
                          "Section sign" against a Dutch "Paragraafteken" is an
                          unambiguous pair with no fuzzy matching anywhere.
  * section labels/h2   — joined on the section's own `id`.
  * breadcrumb, faq_h2  — joined directly, one per page.

A locale spec finds its English parent through its own `hreflang` block's `en`
entry — the same join `scripts/lib/translation-clusters.js` uses, never a guess
at the slug.

CONFLICTS ARE THE POINT
-----------------------
Where one English term has been translated two different ways in the same
locale, that is recorded rather than silently resolved. Those rows are the real
output: they are the places the site currently contradicts itself, and picking
one is an editorial call this script must not make on its own.

USAGE
-----
    python3 scripts/mine-locale-glossary.py                 # report only
    python3 scripts/mine-locale-glossary.py --write         # write the glossary
    python3 scripts/mine-locale-glossary.py --locale nl     # scope the report
    python3 scripts/mine-locale-glossary.py --conflicts     # only disagreements
"""

import argparse
import collections
import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
SPECS = REPO / "data" / "library_page_specs"
OUT = REPO / "data" / "locale_glossary.json"

# A term worth recording is short and word-shaped. Anything longer is prose, and
# prose belongs to its page — see the module docstring.
MAX_TERM_WORDS = 6
MAX_TERM_CHARS = 60


def load_specs():
    """Return (en_by_slug, locale_specs). Both keyed off the files on disk."""
    en, loc = {}, []
    for path in sorted(SPECS.rglob("*.json")):
        if "TEMPLATE" in path.name:
            continue
        try:
            spec = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if not isinstance(spec, dict) or "slug" not in spec:
            continue
        spec["_path"] = path.relative_to(REPO).as_posix()
        if spec.get("lang", "en") == "en":
            en[spec["slug"]] = spec
        else:
            loc.append(spec)
    return en, loc


def en_parent_slug(spec):
    """The EN slug this locale spec translates, from its own hreflang block."""
    for entry in spec.get("hreflang") or []:
        if entry.get("lang") == "en":
            href = entry.get("href", "").rstrip("/")
            return href.rsplit("/", 1)[-1] or None
    return None


def usable(term):
    if not term or not isinstance(term, str):
        return False
    t = term.strip()
    if not t or len(t) > MAX_TERM_CHARS or len(t.split()) > MAX_TERM_WORDS:
        return False
    # Needs a run of letters — filters out pure glyph/punctuation labels, which
    # are the same in every language and would pad the glossary with noise.
    return bool(re.search(r"[^\W\d_]{2,}", t, re.UNICODE))


def pairs_for(en_spec, loc_spec):
    """Every (english, translated, slot) this page pair contributes."""
    out = []

    def add(a, b, slot):
        if usable(a) and usable(b) and a.strip() != b.strip():
            out.append((a.strip(), b.strip(), slot))

    add(en_spec.get("breadcrumb"), loc_spec.get("breadcrumb"), "breadcrumb")
    add(en_spec.get("faq_h2"), loc_spec.get("faq_h2"), "faq_h2")

    # Sections join on their own id.
    en_secs = {s.get("id"): s for s in en_spec.get("sections", []) if s.get("id")}
    for sec in loc_spec.get("sections", []):
        peer = en_secs.get(sec.get("id"))
        if not peer:
            continue
        add(peer.get("label"), sec.get("label"), "section_label")
        add(peer.get("h2"), sec.get("h2"), "section_h2")
        # Tiles join on the CHARACTER — exact, language-independent.
        en_tiles = {t.get("char"): t.get("label")
                    for t in (peer.get("symbols") or []) if t.get("char")}
        for tile in sec.get("symbols") or []:
            add(en_tiles.get(tile.get("char")), tile.get("label"), "tile_label")
    return out


def mine():
    en, loc = load_specs()
    # locale -> english term -> translated term -> {count, slots, pages}
    glossary = collections.defaultdict(lambda: collections.defaultdict(dict))
    paired = unpaired = 0
    for spec in loc:
        parent = en_parent_slug(spec)
        en_spec = en.get(parent) if parent else None
        if not en_spec:
            unpaired += 1
            continue
        paired += 1
        # Normalise the tag: the spec corpus carries both "zh-tw" (33) and
        # "zh-TW" (13) for one language, and a glossary split across two keys
        # would answer "what do we call this?" differently depending on which
        # spelling the asking page happened to use.
        lang = str(spec.get("lang", "")).lower()
        for src, dst, slot in pairs_for(en_spec, spec):
            rec = glossary[lang][src].setdefault(
                dst, {"count": 0, "slots": set(), "pages": []})
            rec["count"] += 1
            rec["slots"].add(slot)
            if len(rec["pages"]) < 3:
                rec["pages"].append(spec["slug"])
    return glossary, paired, unpaired, len(en), len(loc)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="write data/locale_glossary.json")
    ap.add_argument("--locale", help="scope the report to one locale code")
    ap.add_argument("--conflicts", action="store_true",
                    help="report only terms translated more than one way")
    args = ap.parse_args(argv)

    glossary, paired, unpaired, n_en, n_loc = mine()

    print("Locale glossary — mined from the site's own shipped specs")
    print(f"  EN specs {n_en} · locale specs {n_loc} "
          f"· paired to a parent {paired} · unpaired {unpaired}")
    print()

    total_terms = total_pairs = total_conflicts = 0
    rows = []
    for lang in sorted(glossary):
        terms = glossary[lang]
        conflicts = {k: v for k, v in terms.items() if len(v) > 1}
        pair_count = sum(sum(d["count"] for d in v.values()) for v in terms.values())
        total_terms += len(terms)
        total_pairs += pair_count
        total_conflicts += len(conflicts)
        rows.append((lang, len(terms), pair_count, len(conflicts)))

    print(f"  {'locale':<8}{'terms':>8}{'pairs':>9}{'conflicts':>11}")
    print(f"  {'-'*8}{'-'*8:>8}{'-'*9:>9}{'-'*11:>11}")
    for lang, t, p, c in sorted(rows, key=lambda r: -r[1]):
        print(f"  {lang:<8}{t:>8}{p:>9}{c:>11}")
    print(f"  {'TOTAL':<8}{total_terms:>8}{total_pairs:>9}{total_conflicts:>11}")

    if args.locale or args.conflicts:
        print()
        for lang in sorted(glossary):
            if args.locale and lang != args.locale:
                continue
            items = sorted(glossary[lang].items())
            if args.conflicts:
                items = [(k, v) for k, v in items if len(v) > 1]
            if not items:
                continue
            print(f"--- {lang} ({len(items)} terms) ---")
            for src, variants in items[:400]:
                if len(variants) > 1:
                    opts = " | ".join(
                        f"{d}×{m['count']}" for d, m in
                        sorted(variants.items(), key=lambda kv: -kv[1]["count"]))
                    print(f"  ⚠ {src!r} -> {opts}")
                else:
                    dst, meta = next(iter(variants.items()))
                    print(f"    {src!r} -> {dst!r}  (×{meta['count']})")

    if args.write:
        payload = {
            "_readme": (
                "Translation glossary mined from this repo's own shipped locale specs by "
                "scripts/mine-locale-glossary.py. Terms only — never prose, because reusing "
                "prose across pages is the defect check-spec-sentence-reuse.py gates on, while "
                "terminology is the opposite and SHOULD be consistent. Tile labels are joined on "
                "the symbol character, so those pairings are exact. A term with more than one "
                "recorded translation in a locale is a real inconsistency on the live site; the "
                "miner records it and never picks a winner, because that is an editorial call. "
                "Regenerate with: python3 scripts/mine-locale-glossary.py --write"
            ),
            "generated_from": {"en_specs": n_en, "locale_specs": n_loc, "paired": paired},
            "locales": {},
        }
        for lang, terms in glossary.items():
            payload["locales"][lang] = {
                src: [
                    {"term": dst, "count": m["count"],
                     "slots": sorted(m["slots"]), "pages": m["pages"]}
                    for dst, m in sorted(v.items(), key=lambda kv: -kv[1]["count"])
                ]
                for src, v in sorted(terms.items())
            }
        OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                       encoding="utf-8")
        print(f"\nWrote {OUT.relative_to(REPO)} "
              f"({total_terms} terms across {len(glossary)} locales).")
    else:
        print("\n(report only — pass --write to save data/locale_glossary.json)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
