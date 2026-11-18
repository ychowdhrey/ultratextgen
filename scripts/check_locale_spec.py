#!/usr/bin/env python3
"""check_locale_spec.py — validate a locale spec against its EN parent, before generating.

WHY THIS EXISTS
---------------
generate_library_page_from_spec.py validates that a spec is well-FORMED: required
fields present, sections non-empty, every symbol has a char and a label. It does
not validate that the spec is CORRECT as a translation of something. Everything
in the list below shipped or nearly shipped in the 2026-08-07 Indonesian batch
and was caught by hand:

  * `id-simbol-medis` carried 16 tiles against its EN parent's 20, because the EN
    *spec* was stale (16) while the live EN *page* had 20. Nothing compared them.
  * Five clusters shipped hreflang blocks naming only en + self + x-default while
    the EN parent already had 4-9 other locale siblings, leaving every existing
    sibling missing the new entry.
  * Related-link hrefs pointing at locale pages are hand-written; a typo produces
    a live 404 that no gate sees, because the diff-scoped image/FAQ/parity gates
    do not resolve links.

A hand-authored translation is exactly where these go wrong, and they are all
mechanically checkable against the EN parent. So check them there, before a
single HTML file is written.

USAGE
  python3 scripts/check_locale_spec.py data/library_page_specs/tr-*.json
  python3 scripts/check_locale_spec.py --all-locale     # every <lang>-*.json spec
  python3 scripts/check_locale_spec.py <spec> --strict  # warnings become failures

Exit code is non-zero if any ERROR was found, so it can gate a batch.
"""

import argparse
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
from collection_sets import sets_in  # noqa: E402
import canonical_intents as ci  # noqa: E402
import git_tree  # noqa: E402
import spec_drift as sd  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Every read goes through TREE: the checkout normally, the merge base's tree when
# --base asks which errors already existed there (see main()).
TREE = git_tree.WorkTree(ROOT)
SPEC_DIR = "data/library_page_specs"
SITE = "https://ultratextgen.com"

# hreflang code -> URL path segment, where the two differ. See the canonical
# check below for why this exists.
URL_SEGMENT = {"zh-TW": "zh-tw"}

# Words that, appearing in a translated title/H1/intro, usually mean a row was
# copied from the EN parent and never translated. Deliberately short: many
# locales legitimately keep loanwords ("emoji", "aesthetic", "copy paste"), and
# flagging those would train people to ignore the check.
ENGLISH_TELLS = re.compile(
    r"\b(copy and paste|click any symbol|the full|and more|ready-made|"
    r"instantly|browse and copy|for your|of the)\b", re.I)


def live_collection_sets(rel):
    """containerId -> group count for a LIVE page. See scripts/lib/collection_sets.py
    for why this is read from the page and not from a spec, and why groups are
    counted by `flags:`."""
    return sets_in(rd(rel))


def rd(path):
    return TREE.read(path)


def _registry():
    # Loaded once per tree; an unreadable registry is UNKNOWN for any spec that needs it.
    # A cache set from outside with no tree (the canonical_intents tests inject a
    # fixture registry that way) is honoured as is.
    if hasattr(_registry, "cache") and getattr(_registry, "tree", None) in (None, TREE):
        return _registry.cache
    if getattr(_registry, "tree", None) is not TREE:
        _registry.tree = TREE
        try:
            _registry.cache = ci.load_text(TREE.read(ci.REGISTRY_REL))
        except FileNotFoundError:
            _registry.cache = ci.RegistryUnavailable(f"{ci.REGISTRY_REL} does not exist")
        except ci.RegistryUnavailable as e:
            _registry.cache = e
    return _registry.cache


def spec_paths():
    """Every spec in TREE: top level AND the per-locale subfolders. Until 2026-11-18
    --all-locale globbed only the top level, so 904 of 1,222 locale specs were never
    checked and CI reported 0 errors over 302."""
    return [p for p in TREE.files_under(SPEC_DIR, ".json") if not p.endswith(sd.TEMPLATE_NAME)]


def pages_with_a_spec():
    """{page_rel} generated from some spec in TREE (cached per tree)."""
    if getattr(pages_with_a_spec, "tree", None) is not TREE:
        out = set()
        for p in spec_paths():
            try:
                page = sd.page_rel_for(json.loads(TREE.read(p)))
            except ValueError:
                continue
            if page:
                out.add(page)
        pages_with_a_spec.tree, pages_with_a_spec.cache = TREE, out
    return pages_with_a_spec.cache


def en_parent_of(spec):
    for h in spec.get("hreflang", []):
        if h.get("lang") == "en":
            m = re.match(rf"{SITE}/(library|symbol)/([^/]+)/$", h.get("href", ""))
            if m:
                return m.group(1), m.group(2)
    return None, None


# Markup written into a page by a build-time generator, not by its spec.
# Counting it would compare a spec's authored sections against generated
# inventory: pre-rendering the country flags took library/emoji-flags from 21
# authored tiles to 216, which is not a spec that went stale. Same call as
# editorial-corpus.js dropping .flag-grid-section, and for the same reason.
# Keyed on the generators' own markers, so a future block is covered by adding
# its name here rather than by a selector that silently stops matching.
PRERENDERED_RE = re.compile(
    r"<!--\s*BEGIN prerendered (?:country flags|collections)\b[\s\S]*?"
    r"<!--\s*END prerendered (?:country flags|collections)\s*-->"
)


def live_tile_count(rel):
    # One definition of a page's copy tiles (scripts/lib/spec_drift.py): outside the
    # PRERENDERED blocks above and without the symbol-page hero tile.
    return sd.live_tile_count(rd(rel))


def spec_tile_count(spec):
    # combos count: the generator renders them as tiles since 2026-11-18. Counting only
    # `symbols` is what let es/library/emojis-graciosos ship 35 of 75.
    return sd.spec_tile_count(spec)


def check(path, strict=False):
    errs, warns = [], []
    name = os.path.relpath(path, SPEC_DIR) if path.startswith(SPEC_DIR + "/") else os.path.basename(path)
    try:
        spec = json.loads(TREE.read(path))
    except Exception as e:
        return [f"{name}: unparseable JSON — {e}"], []

    lang = spec.get("lang")
    slug = spec.get("slug")
    if not lang or lang == "en":
        return [], []  # an EN spec; nothing here applies
    E = lambda m: errs.append(f"{name}: {m}")
    W = lambda m: warns.append(f"{name}: {m}")

    # --- filename convention -------------------------------------------------
    base_name = os.path.basename(path)
    in_lang_dir = name.split("/")[0].lower() == URL_SEGMENT.get(lang, lang).lower() and "/" in name
    if not in_lang_dir and not (base_name.startswith(f"{lang}-")
                                or base_name.startswith(f"{URL_SEGMENT.get(lang, lang)}-")):
        W(f'filename should start with "{lang}-" (lang={lang!r})')

    # --- canonical -----------------------------------------------------------
    # The hreflang code and the URL path segment are NOT always the same string.
    # zh-TW is the correct hreflang code, but every one of this site's live
    # Traditional-Chinese URLs is /zh-tw/ (68 sitemap entries, zero uppercase).
    # Deriving the path from `lang` sent a whole page cluster into a duplicate
    # /zh-TW/ space nothing links to — caught 2026-08-10 on the iphone-emojis
    # batch. Map explicitly rather than assuming they match.
    ptype = spec.get("page_type", "library")
    folder = "symbol" if ptype == "symbol" else "library"
    seg = URL_SEGMENT.get(lang, lang)
    want_canon = f"{SITE}/{seg}/{folder}/{slug}/"
    if spec.get("canonical") != want_canon:
        E(f"canonical is {spec.get('canonical')!r}, expected {want_canon!r}")

    # --- hreflang shape ------------------------------------------------------
    hl = spec.get("hreflang") or []
    by = {}
    for h in hl:
        by.setdefault(h.get("lang"), []).append(h.get("href"))
    if lang not in by:
        E("hreflang has no self-reference — the single most-repeated mesh bug on this site")
    elif by[lang][0] != want_canon:
        E(f"hreflang self-reference is {by[lang][0]!r}, expected {want_canon!r}")
    for k, v in by.items():
        if len(v) > 1:
            E(f'hreflang declares "{k}" {len(v)} times')

    # --- the cluster's reference page ----------------------------------------
    # With an English member: the English page, as before. Without one (allowed
    # since 2026-11-14 — a page may originate in any qualified language): the
    # canonical intent record that pins a member of this cluster names the
    # reference page (its primary, else origin-locale page). The origin page
    # itself has nothing to be compared against.
    if "en" in by:
        if "x-default" not in by:
            E('hreflang has no "x-default"')
        elif by["x-default"][0] != by["en"][0]:
            W(f'x-default ({by["x-default"][0]}) does not match en ({by["en"][0]})')
        en_folder, en_slug = en_parent_of(spec)
        if not en_slug:
            E("could not resolve an EN parent from the hreflang block")
            return errs, warns
        ref_rel = f"{en_folder}/{en_slug}/index.html"
        ref_folder = en_folder
        ref_href = f"{SITE}/{en_folder}/{en_slug}/"
        ref_label = "EN parent"
    else:
        reg = _registry()
        if isinstance(reg, Exception):
            E(f"UNKNOWN: no \"en\" entry, and the canonical intent registry cannot be read ({reg})")
            return errs, warns
        members = [h.get("href") for h in hl if h.get("lang") != "x-default"]
        rec = ci.record_for(reg, members + [want_canon])
        if not rec:
            E('no "en" entry and no canonical intent: a page with no English sibling must map to a record in '
              'data/canonical_intents.json that pins it or a sibling (an English page is NOT required; see '
              'docs/architecture/language-neutral-intents.md)')
            return errs, warns
        by_lang = {k: v[0] for k, v in by.items() if k != "x-default"}
        want_xd = ci.expected_x_default(rec, by_lang, reg.get("policy"))
        have_xd = by.get("x-default", [None])[0]
        if want_xd is None and have_xd:
            E(f"x-default {have_xd} declared, but {rec['id']} has no x-default (no English member and no declared "
              f"xDefault); drop it rather than pointing it at a page that is not the default")
        elif want_xd and have_xd != want_xd:
            E(f"x-default is {have_xd!r}, expected {want_xd!r} for {rec['id']}")
        ref_href = ci.reference_page(rec)
        ref_label = f"reference page ({rec['id']})"
        if ref_href == want_canon:
            # The origin (or primary) page: nothing to compare tiles or combo
            # sets against. Everything below that is about the page itself
            # (FAQ depth, related links, duplicates, untranslated copy) still runs.
            ref_rel = None
        else:
            ref_rel = ci.url_to_rel(ref_href)
            parts = ref_rel.split("/")
            ref_folder = parts[1] if len(parts) > 2 else parts[0]

    # --- reference page exists, and lane is inherited ------------------------
    en_rel = ref_rel
    if en_rel and not TREE.exists(en_rel):
        E(f"{ref_label} {en_rel} does not exist on disk")
        return errs, warns

    # --- the reference page has a spec (owner rule 2026-11-18) ---------------
    # A page needs a spec before it is localized: a locale is translated from the
    # reference's spec, so a hand-built reference leaves nothing to translate from
    # and nothing to keep the two in step.
    if en_rel and en_rel not in pages_with_a_spec():
        E(f"{ref_label} {en_rel} has no spec — a page needs a spec before it is "
          f"localized: build that page's spec first (matching the live page), then "
          f"translate from it")
    if en_rel and ref_folder != folder:
        E(f"lane mismatch: {ref_label} is /{ref_folder}/ but page_type routes to /{folder}/")

    # --- tile parity with the LIVE EN page, not its spec ---------------------
    live, mine = (live_tile_count(en_rel) if en_rel else None), spec_tile_count(spec)
    if en_rel and live != mine:
        E(f"tile count {mine} != live {ref_label}'s {live} ({en_rel}) — "
          f"check the reference spec is not stale against its own page")

    # --- combo-set parity with the LIVE EN page ------------------------------
    # ERROR on absence, WARN on a count gap, deliberately different strengths.
    # Absence is the defect that actually shipped (16 locale pages with no
    # combo-set section at all) and has no backlog left, so it can gate. A
    # group-count gap is a thin section, not a missing one, and 17 pairs carry
    # it today — gating on that would make this permanently red, which is how
    # a check gets ignored.
    en_sets = live_collection_sets(en_rel) if en_rel else {}
    mine_sets = spec.get("collections") or []
    if en_sets and not mine_sets:
        ids = ", ".join(sorted(en_sets))
        E(f"{ref_label} {en_rel} renders a combo-set section (#{ids}, "
          f"{sum(en_sets.values())} groups) but this spec declares no "
          f"'collections' — those tiles are built at runtime by buildGrids(), "
          f"so a page without the section still passes every tile count")
    elif en_sets and mine_sets and spec.get("copy_pattern") != "collection":
        E("declares 'collections' but copy_pattern is "
          f"{spec.get('copy_pattern')!r} — the generator only emits the "
          "section for copy_pattern 'collection'")
    elif en_sets and mine_sets and sum(en_sets.values()) != len(mine_sets):
        W(f"{len(mine_sets)} combo-set groups against the live {ref_label}'s "
          f"{sum(en_sets.values())} ({en_rel})")

    # --- the depth the id batch established as the floor ---------------------
    if not spec.get("faq"):
        W("no faq — the id batch shipped 5 per page and every EN parent lacked one")
    elif len(spec["faq"]) < 3:
        W(f"only {len(spec['faq'])} faq items")
    if spec.get("faq") and not spec.get("faq_h2"):
        W("faq present but no faq_h2 — the h2 count will not match the EN sibling")
    if not spec.get("editorial_sections"):
        W("no editorial_sections (the cross-platform/how-it-renders section)")

    # --- related links resolve, and are locale-native ------------------------
    for r in spec.get("related", []):
        href = r.get("href", "")
        m = re.match(r"^/([^/]+)/(library|symbol|usecase)/([^/]+)/$", href)
        root_page = re.match(r"^/([a-z]{2}(?:-[a-z]{2})?)/([^/]+)/$", href)
        if m and m.group(1) == lang:
            if not TREE.isdir(f"{lang}/{m.group(2)}/{m.group(3)}"):
                E(f"related link {href} does not exist on disk")
        elif root_page and root_page.group(1) == lang:
            # a locale-root page such as /es/simbolos-para-free-fire/
            if not TREE.isdir(f"{lang}/{root_page.group(2)}"):
                E(f"related link {href} does not exist on disk")
        elif re.match(r"^/(library|symbol|usecase|category|guide|answers)/", href):
            W(f"related link {href} is English — check for a {lang}/ equivalent first")
        elif not m and not root_page:
            W(f"related link {href} has an unexpected shape")

    # --- duplicate claimant in this locale -----------------------------------
    for p in TREE.children_with_index(f"{lang}/{folder}"):
        if os.path.basename(os.path.dirname(p)) == slug:
            continue
        s = rd(p)
        if re.search(rf'hreflang="[^"]+"\s+href="{re.escape(ref_href)}"', s):
            E(f"{p} already claims the same {ref_label} "
              f"({ref_href}) — duplicate claimant, resolve before building")

    # --- untranslated copy ---------------------------------------------------
    for field in ("title", "hero_h1", "hero_tagline", "intro", "meta_description"):
        v = spec.get(field) or ""
        m = ENGLISH_TELLS.search(v)
        if m:
            W(f'{field} contains untranslated English: "{m.group(0)}"')

    return errs, (errs + warns if False else warns)


def _run(paths, strict):
    E, W = [], []
    for p in paths:
        e, w = check(p, strict)
        E += e
        W += w
    return E, W


def _key(msg):
    # The same finding at the base and at HEAD, even when a count inside it moved.
    return re.sub(r"\d+", "N", msg)


def _merge_base(base):
    import subprocess
    r = subprocess.run(["git", "merge-base", base, "HEAD"], cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def main():
    global TREE
    ap = argparse.ArgumentParser()
    ap.add_argument("specs", nargs="*")
    ap.add_argument("--all-locale", action="store_true",
                    help="check every locale spec: data/library_page_specs/<lang>-*.json AND "
                         "data/library_page_specs/<lang>/*.json")
    ap.add_argument("--strict", action="store_true", help="warnings fail too")
    ap.add_argument("--base", help="fail only on errors that are not already present at the merge base "
                                   "with this ref; pre-existing ones are printed as 'known', never hidden")
    a = ap.parse_args()

    explicit = [os.path.relpath(os.path.abspath(p), ROOT).replace(os.sep, "/") for p in a.specs]
    paths = explicit if explicit and not a.all_locale else spec_paths()

    E, W = _run(paths, a.strict)

    known = set()
    if a.base:
        mb = _merge_base(a.base)
        if not mb:
            print(f"UNKNOWN: cannot resolve a merge base with {a.base!r} (shallow clone or wrong name). "
                  f"This is not a pass.")
            return 2
        try:
            TREE = git_tree.GitTree(ROOT, mb)
        except git_tree.TreeUnavailable as e:
            print(f"UNKNOWN: {e}. This is not a pass.")
            return 2
        try:
            base_E, _ = _run([p for p in paths if TREE.exists(p)], a.strict)
        finally:
            TREE.close()
            TREE = git_tree.WorkTree(ROOT)
        known = {_key(m) for m in base_E}

    new = [m for m in E if _key(m) not in known]
    old = [m for m in E if _key(m) in known]
    for m in new:
        print(f"  ERROR  {m}")
    for m in old:
        print(f"  known  {m}")
    for m in W:
        print(f"  warn   {m}")
    loc = sum(1 for p in paths if "/" in os.path.relpath(p, SPEC_DIR)
              or re.match(r"^[a-z]{2}(-[a-z]{2})?-", os.path.basename(p)))
    print(f"\n{len(paths)} spec(s) read ({loc} locale) · {len(new)} new error(s)"
          + (f" · {len(old)} pre-existing at the merge base (reported, not failed)" if a.base else "")
          + f" · {len(W)} warning(s)")
    if new:
        print("\nFix the errors before generating — every one of them ships silently otherwise.")
    return 1 if new or (a.strict and W) else 0


if __name__ == "__main__":
    sys.exit(main())
