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
import glob
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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


def rd(path):
    return io.open(os.path.join(ROOT, path), encoding="utf-8", errors="replace").read()


def en_parent_of(spec):
    for h in spec.get("hreflang", []):
        if h.get("lang") == "en":
            m = re.match(rf"{SITE}/(library|symbol)/([^/]+)/$", h.get("href", ""))
            if m:
                return m.group(1), m.group(2)
    return None, None


def live_collection_sets(rel):
    """The combo-set sections a LIVE page renders: containerId -> group count.

    Read from the page, not from its spec, for the same reason tile parity is:
    an EN spec can be stale against its own page.

    A `copy_pattern: "collection"` section renders its tiles through
    `UltraTextGen.buildGrids(containerId, GROUPS)` after load, so it leaves no
    static markup at all — an empty `<div id="…Container"></div>` and nothing
    else. That is why the tile-count check above cannot see it, and why 16
    locale pages went live without the section their EN parent carries while
    every check on this site reported them complete.

    Groups are counted by `flags:`, not `defaultFormat:` — a hand-written
    GROUPS array does not always carry the latter (library/emoji-flags has
    none), which reported that page's section as empty.
    """
    s = rd(rel)
    out = {}
    for m in re.finditer(r'<script>(.*?)</script>', s, re.S):
        js = m.group(1)
        c = re.search(r'\bbuildGrids\(\s*["\']([^"\']+)["\']', js)
        if c:
            out[c.group(1)] = len(re.findall(r'\bflags\s*:', js))
    return out


def live_tile_count(rel):
    s = rd(rel)
    return len(re.findall(r'class="[^"]*symbol-tile', s))


def spec_tile_count(spec):
    return sum(len(s.get("symbols", [])) for s in spec.get("sections", []))


def check(path, strict=False):
    errs, warns = [], []
    name = os.path.basename(path)
    try:
        spec = json.load(io.open(path, encoding="utf-8"))
    except Exception as e:
        return [f"{name}: unparseable JSON — {e}"], []

    lang = spec.get("lang")
    slug = spec.get("slug")
    if not lang or lang == "en":
        return [], []  # an EN spec; nothing here applies
    E = lambda m: errs.append(f"{name}: {m}")
    W = lambda m: warns.append(f"{name}: {m}")

    # --- filename convention -------------------------------------------------
    if not (name.startswith(f"{lang}-") or name.startswith(f"{URL_SEGMENT.get(lang, lang)}-")):
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
    if "en" not in by:
        E('hreflang has no "en" entry — cluster membership is derived from it')
    if "x-default" not in by:
        E('hreflang has no "x-default"')
    elif "en" in by and by["x-default"][0] != by["en"][0]:
        W(f'x-default ({by["x-default"][0]}) does not match en ({by["en"][0]})')
    for k, v in by.items():
        if len(v) > 1:
            E(f'hreflang declares "{k}" {len(v)} times')

    # --- EN parent exists, and lane is inherited -----------------------------
    en_folder, en_slug = en_parent_of(spec)
    if not en_slug:
        E("could not resolve an EN parent from the hreflang block")
        return errs, warns
    en_rel = f"{en_folder}/{en_slug}/index.html"
    if not os.path.exists(os.path.join(ROOT, en_rel)):
        E(f"EN parent {en_rel} does not exist on disk")
        return errs, warns
    if en_folder != folder:
        E(f"lane mismatch: EN parent is /{en_folder}/ but page_type routes to /{folder}/")

    # --- tile parity with the LIVE EN page, not its spec ---------------------
    live, mine = live_tile_count(en_rel), spec_tile_count(spec)
    if live != mine:
        E(f"tile count {mine} != live EN parent's {live} ({en_rel}) — "
          f"check the EN spec is not stale against its own page")

    # --- combo-set parity with the LIVE EN page ------------------------------
    # ERROR on absence, WARN on a count gap, deliberately different strengths.
    # Absence is the defect that actually shipped (16 locale pages with no
    # combo-set section at all) and has no backlog left, so it can gate. A
    # group-count gap is a thin section, not a missing one, and 17 pairs carry
    # it today — gating on that would make this permanently red, which is how
    # a check gets ignored.
    en_sets = live_collection_sets(en_rel)
    mine_sets = spec.get("collections") or []
    if en_sets and not mine_sets:
        ids = ", ".join(sorted(en_sets))
        E(f"EN parent {en_rel} renders a combo-set section (#{ids}, "
          f"{sum(en_sets.values())} groups) but this spec declares no "
          f"'collections' — those tiles are built at runtime by buildGrids(), "
          f"so a page without the section still passes every tile count")
    elif en_sets and mine_sets and spec.get("copy_pattern") != "collection":
        E("declares 'collections' but copy_pattern is "
          f"{spec.get('copy_pattern')!r} — the generator only emits the "
          "section for copy_pattern 'collection'")
    elif en_sets and mine_sets and sum(en_sets.values()) != len(mine_sets):
        W(f"{len(mine_sets)} combo-set groups against the live EN parent's "
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
            if not os.path.isdir(os.path.join(ROOT, lang, m.group(2), m.group(3))):
                E(f"related link {href} does not exist on disk")
        elif root_page and root_page.group(1) == lang:
            # a locale-root page such as /es/simbolos-para-free-fire/
            if not os.path.isdir(os.path.join(ROOT, lang, root_page.group(2))):
                E(f"related link {href} does not exist on disk")
        elif re.match(r"^/(library|symbol|usecase|category|guide|answers)/", href):
            W(f"related link {href} is English — check for a {lang}/ equivalent first")
        elif not m and not root_page:
            W(f"related link {href} has an unexpected shape")

    # --- duplicate claimant in this locale -----------------------------------
    for p in glob.glob(os.path.join(ROOT, lang, folder, "*", "index.html")):
        if os.path.basename(os.path.dirname(p)) == slug:
            continue
        s = io.open(p, encoding="utf-8", errors="replace").read()
        if re.search(rf'hreflang="en"\s+href="{re.escape(SITE)}/{en_folder}/{re.escape(en_slug)}/"', s):
            E(f"{os.path.relpath(p, ROOT)} already claims the same EN parent "
              f"({en_folder}/{en_slug}) — duplicate claimant, resolve before building")

    # --- untranslated copy ---------------------------------------------------
    for field in ("title", "hero_h1", "hero_tagline", "intro", "meta_description"):
        v = spec.get(field) or ""
        m = ENGLISH_TELLS.search(v)
        if m:
            W(f'{field} contains untranslated English: "{m.group(0)}"')

    return errs, (errs + warns if False else warns)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("specs", nargs="*")
    ap.add_argument("--all-locale", action="store_true",
                    help="check every data/library_page_specs/<lang>-*.json")
    ap.add_argument("--strict", action="store_true", help="warnings fail too")
    a = ap.parse_args()

    paths = list(a.specs)
    if a.all_locale or not paths:
        paths = [p for p in sorted(glob.glob(os.path.join(ROOT, "data/library_page_specs/*.json")))
                 if re.match(r"^[a-z]{2}(-[a-z]{2})?-", os.path.basename(p))]

    E, W = [], []
    for p in paths:
        e, w = check(p, a.strict)
        E += e
        W += w

    for m in E:
        print(f"  ERROR  {m}")
    for m in W:
        print(f"  warn   {m}")
    print(f"\n{len(paths)} locale spec(s) checked · {len(E)} error(s) · {len(W)} warning(s)")
    if E:
        print("\nFix the errors before generating — every one of them ships silently otherwise.")
    return 1 if E or (a.strict and W) else 0


if __name__ == "__main__":
    sys.exit(main())
