#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_symbol_spoke_links.py

Keeps two kinds of /symbol/ linking automatic instead of manual:
  (1) hub<->spoke — between /library/ hubs and /symbol/ spokes;
  (2) peer<->peer — between two /symbol/ spokes that name each other as a
      related symbol in their own "Related Symbols" compare-grid.

The contract (documented in CLAUDE.md "Library vs Symbol"):
  - every /symbol/ spoke links back to its related /library/ hub(s) — the
    spoke's own HTML is the source of truth for which hubs it claims
    (specs only exist for a subset of spokes, so HTML is authoritative);
  - every hub a spoke claims should link back to that spoke, and at minimum
    every spoke must be linked from at least one hub, or it is an orphan
    that only the sitemap can discover;
  - separately, when a spoke's own "Related Symbols" section names another
    /symbol/ spoke as related, that peer should link back. Unlike hubs,
    zero declared peers is not an error (not every symbol has a natural
    sibling) — only a *one-directional* declared relation is flagged, since
    that's a page a reader (and Googlebot) can reach from A but not the
    reverse, discovered from a real case: newer currency-symbol spokes
    (ruble/dirham/riyal) shipped weeks after euro/pound/yen/rupee and were
    never added back into those older pages' Related Symbols grids.

Modes
-----
  --check (default)  report per-spoke inbound coverage; exit non-zero if any
                     spoke has zero inbound hub links (ERROR). Non-reciprocal
                     claimed hubs, and non-reciprocal declared peers, are
                     WARN (use --strict to fail on either).
  --write            inject a compare-card for each missing hub->spoke link
                     into the hub's "Related Resources" .compare-grid.
                     By default only orphan spokes (zero inbound) are fixed,
                     into their first claimed hub. With --reciprocal, every
                     claimed hub that lacks a link gets a card, AND every
                     declared peer relation that isn't reciprocated gets a
                     card injected into the peer's own Related Symbols grid.

Injection is idempotent: a hub or peer that already links to the spoke
anywhere in its HTML (prose or card) is never touched. Card markup and class
variant are copied from the first existing compare-card in the target grid
so the house style is preserved per page.

Locale propagation
------------------
Peer reciprocity is mirrored into `<lang>/symbol/*` too. A locale page's
compare-grid is static HTML written once at creation time, exactly like the
EN one, so an EN peer relation added later never reaches the 1,600+ locale
symbol pages — which is how a single EN `--reciprocal` run could leave
hundreds of translation-parity pairs behind it.

For every EN peer relation A<->B, and every language L where BOTH A and B
have a live sibling, L's copy of A gets a card pointing at L's copy of B (and
vice versa). Cluster membership comes from each locale page's own
`hreflang="en"` link — the same source `scripts/lib/translation-clusters.js`
uses — so this never has to guess a locale slug from the EN one.

The card's title and description are read from the TARGET LOCALE PAGE'S OWN
`<h1>`/hero tagline. Nothing is translated here: a locale card only ever
carries copy that locale page already wrote for itself, and a peer with no
sibling in L is simply skipped rather than linked in English (CLAUDE.md,
"Locale-native internal linking").

Pass --no-locales to restrict the run to EN, as it behaved before.
"""

import argparse
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
LIBRARY_DIR = REPO / "library"
SYMBOL_DIR = REPO / "symbol"

LIB_HREF_RE = re.compile(r'href="/library/([a-z0-9-]+)/"')
SYM_HREF_RE = re.compile(r'href="/symbol/([a-z0-9-]+)/"')
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)
TAGLINE_RE = re.compile(r'<p\s+class="hero-tagline"[^>]*>(.*?)</p>',
                        re.IGNORECASE | re.DOTALL)
META_DESC_RE = re.compile(
    r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',
    re.IGNORECASE | re.DOTALL,
)
COMPARE_GRID_RE = re.compile(r'<div\s+class="compare-grid"[^>]*>')
CARD_CLASS_RE = re.compile(r'class="(compare-card[^"]*)"')

# A locale symbol page declares its EN parent the same way every other page on
# the site does; that link is the cluster key (see scripts/lib/translation-clusters.js).
EN_ALTERNATE_RE = re.compile(
    r'<link[^>]*\brel="alternate"[^>]*\bhreflang="en"[^>]*\bhref="([^"]+)"', re.IGNORECASE
)
EN_SYMBOL_URL_RE = re.compile(r"^https://ultratextgen\.com/symbol/([a-z0-9-]+)/?$")

MAX_DESC_LEN = 140


def strip_tags(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html)).strip()


def first_sentence(text, max_len=MAX_DESC_LEN):
    text = re.sub(r"\s+", " ", text or "").strip()
    m = re.search(r"[.!?](\s|$)", text)
    sentence = text[: m.end()].strip() if m else text
    if len(sentence) > max_len:
        # Prefer cutting at a clause boundary (em-dash) so the card text
        # still reads as a complete thought; fall back to a word boundary.
        head = sentence[:max_len]
        if " — " in head:
            sentence = head.rsplit(" — ", 1)[0].rstrip(",;: ") + "."
        else:
            sentence = head.rsplit(" ", 1)[0].rstrip(",;: ") + "…"
    return sentence


def load_spokes():
    """slug -> {path, claimed_hubs, title, desc}"""
    spokes = {}
    for page in sorted(SYMBOL_DIR.glob("*/index.html")):
        slug = page.parent.name
        html = page.read_text(encoding="utf-8", errors="replace")
        hubs = []
        for hub in LIB_HREF_RE.findall(html):
            if hub not in hubs and (LIBRARY_DIR / hub / "index.html").exists():
                hubs.append(hub)
        m_h1 = H1_RE.search(html)
        # Card description: prefer the spoke's hero tagline (written as a
        # one-line summary) over the meta description (SEO-length, truncates
        # poorly); take the first sentence of whichever is found.
        m_tagline = TAGLINE_RE.search(html)
        m_desc = META_DESC_RE.search(html)
        desc_source = strip_tags(m_tagline.group(1)) if m_tagline else (
            m_desc.group(1) if m_desc else "")
        spokes[slug] = {
            "path": page,
            "claimed_hubs": hubs,
            "title": strip_tags(m_h1.group(1)) if m_h1 else slug.replace("-", " ").title(),
            "desc": first_sentence(desc_source),
        }
    return spokes


def load_hub_links():
    """hub slug -> set of spoke slugs it links to (anywhere in the page)."""
    links = {}
    for page in sorted(LIBRARY_DIR.glob("*/index.html")):
        html = page.read_text(encoding="utf-8", errors="replace")
        links[page.parent.name] = set(SYM_HREF_RE.findall(html))
    return links


def load_symbol_out_links():
    """spoke slug -> set of other /symbol/ slugs it links to (anywhere in
    the page, e.g. its own Related Symbols compare-grid) — the peer
    relations a spoke has declared for itself. Self-references are dropped;
    they're not a relation to reciprocate."""
    links = {}
    for page in sorted(SYMBOL_DIR.glob("*/index.html")):
        slug = page.parent.name
        html = page.read_text(encoding="utf-8", errors="replace")
        links[slug] = {s for s in SYM_HREF_RE.findall(html) if s != slug}
    return links


def page_title_and_desc(html, fallback_slug):
    """The <h1> and one-line summary a page wrote for itself. Used verbatim as
    the card copy, so a locale card never carries invented or translated text."""
    m_h1 = H1_RE.search(html)
    m_tagline = TAGLINE_RE.search(html)
    m_desc = META_DESC_RE.search(html)
    desc_source = strip_tags(m_tagline.group(1)) if m_tagline else (
        m_desc.group(1) if m_desc else "")
    return (
        strip_tags(m_h1.group(1)) if m_h1 else fallback_slug.replace("-", " ").title(),
        first_sentence(desc_source),
    )


def load_locale_siblings():
    """en_slug -> {lang: {path, slug, title, desc}} for every <lang>/symbol/ page.

    A page's language is its top-level directory and its cluster is whatever EN
    URL its own hreflang="en" declares. A page that declares no EN parent, or
    one outside /symbol/, is not part of a symbol cluster and is left alone."""
    siblings = {}
    for page in sorted(REPO.glob("*/symbol/*/index.html")):
        lang = page.relative_to(REPO).parts[0]
        if not re.fullmatch(r"[a-z]{2}(-[a-z]{2})?", lang):
            continue
        html = page.read_text(encoding="utf-8", errors="replace")
        m_en = EN_ALTERNATE_RE.search(html)
        if not m_en:
            continue
        m_slug = EN_SYMBOL_URL_RE.match(m_en.group(1).strip())
        if not m_slug:
            continue
        slug = page.parent.name
        title, desc = page_title_and_desc(html, slug)
        siblings.setdefault(m_slug.group(1), {})[lang] = {
            "path": page, "slug": slug, "title": title, "desc": desc,
        }
    return siblings


EN_LIBRARY_URL_RE = re.compile(r"^https://ultratextgen\.com/library/([a-z0-9-]+)/?$")


def load_locale_hubs():
    """en_hub_slug -> {lang: path} for every <lang>/library/ hub page.

    Same cluster rule as load_locale_siblings(): a page's language is its
    top-level directory and its cluster is whatever EN URL its own
    hreflang="en" declares. Never guess a locale slug from the EN one."""
    hubs = {}
    for page in sorted(REPO.glob("*/library/*/index.html")):
        lang = page.relative_to(REPO).parts[0]
        if not re.fullmatch(r"[a-z]{2}(-[a-z]{2})?", lang):
            continue
        html = page.read_text(encoding="utf-8", errors="replace")
        m_en = EN_ALTERNATE_RE.search(html)
        if not m_en:
            continue
        m_slug = EN_LIBRARY_URL_RE.match(m_en.group(1).strip())
        if not m_slug:
            continue
        hubs.setdefault(m_slug.group(1), {})[lang] = page
    return hubs


def build_card(href, title, desc, card_class, indent):
    pad = " " * indent
    inner = " " * (indent + 2)
    desc = desc or f"Dedicated page for the {title.lower()} — copy it, type it, and see how it renders."
    return (
        f'{pad}<a href="{href}" class="{card_class}">\n'
        f"{inner}<h4>{title}</h4>\n"
        f"{inner}<p>{desc}</p>\n"
        f"{pad}</a>\n"
    )


def inject_card(target_path, href, title, desc):
    """Insert a compare-card into target_path's compare-grid (a /library/ hub,
    another /symbol/ spoke, or either one's locale sibling — the markup
    convention is identical for all of them). Returns True on success, False if
    target_path has no compare-grid."""
    html = target_path.read_text(encoding="utf-8")

    m_grid = COMPARE_GRID_RE.search(html)
    if not m_grid:
        return False

    grid_start = m_grid.end()
    # Cards contain no nested <div>, so the first </div> after the grid's
    # opening tag closes the grid.
    grid_end = html.find("</div>", grid_start)
    if grid_end == -1:
        return False
    grid_body = html[grid_start:grid_end]

    # Match the class variant and indentation of existing sibling cards.
    m_class = CARD_CLASS_RE.search(grid_body)
    card_class = m_class.group(1) if m_class else "compare-card variant-muted u-no-underline"
    m_indent = re.search(r"\n( *)<a ", grid_body)
    indent = len(m_indent.group(1)) if m_indent else 4

    card = build_card(href, title, desc, card_class, indent)
    insertion = grid_body.rstrip() + "\n" + card + " " * max(indent - 2, 0)
    html = html[:grid_start] + insertion + html[grid_end:]
    target_path.write_text(html, encoding="utf-8")
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true",
                        help="inject missing hub→spoke compare-cards")
    parser.add_argument("--reciprocal", action="store_true",
                        help="with --write, add a card on every claimed hub "
                             "that lacks one, and on every declared symbol "
                             "peer that lacks one (default fixes only orphan "
                             "spokes)")
    parser.add_argument("--strict", action="store_true",
                        help="treat non-reciprocal claimed hubs and "
                             "non-reciprocal declared peers as failures")
    parser.add_argument("--no-locales", dest="locales", action="store_false",
                        help="restrict the run to EN /symbol/ pages; skip "
                             "mirroring peer relations into <lang>/symbol/")
    args = parser.parse_args(argv)

    if not SYMBOL_DIR.is_dir() or not LIBRARY_DIR.is_dir():
        sys.stderr.write("[error] expected /symbol/ and /library/ under repo root\n")
        return 1

    spokes = load_spokes()
    hub_links = load_hub_links()
    peer_out = load_symbol_out_links()

    errors = warns = fixed = 0
    for slug, spoke in spokes.items():
        inbound = sorted(h for h, targets in hub_links.items() if slug in targets)
        missing_reciprocal = [h for h in spoke["claimed_hubs"] if slug not in hub_links.get(h, set())]

        if not inbound:
            if args.write and spoke["claimed_hubs"]:
                target = spoke["claimed_hubs"][0]
                if inject_card(LIBRARY_DIR / target / "index.html", f"/symbol/{slug}/", spoke["title"], spoke["desc"]):
                    print(f"[FIXED] symbol/{slug}: injected card into library/{target}")
                    hub_links[target].add(slug)
                    fixed += 1
                    missing_reciprocal = [h for h in missing_reciprocal if h != target]
                else:
                    print(f"[ERROR] symbol/{slug}: orphan, and library/{target} has no compare-grid to inject into")
                    errors += 1
            else:
                hint = f" (claims: {', '.join(spoke['claimed_hubs']) or 'no hubs — add a /library/ related card to the spoke first'})"
                print(f"[ERROR] symbol/{slug}: no library hub links to it{hint}")
                errors += 1

        if missing_reciprocal:
            if args.write and args.reciprocal:
                for hub in missing_reciprocal:
                    if inject_card(LIBRARY_DIR / hub / "index.html", f"/symbol/{slug}/", spoke["title"], spoke["desc"]):
                        print(f"[FIXED] symbol/{slug}: injected reciprocal card into library/{hub}")
                        hub_links[hub].add(slug)
                        fixed += 1
                    else:
                        print(f"[WARN] symbol/{slug}: library/{hub} has no compare-grid; add the link manually")
                        warns += 1
            else:
                print(f"[WARN] symbol/{slug}: claimed hub(s) not linking back: {', '.join(missing_reciprocal)}")
                warns += len(missing_reciprocal)

        # Peer reciprocity: this spoke's own Related Symbols section may
        # name another /symbol/ spoke. Unlike hubs, having zero declared
        # peers is fine — only a one-directional relation is a problem.
        declared_peers = sorted(p for p in peer_out.get(slug, set()) if p in spokes)
        missing_peer_reciprocal = [p for p in declared_peers if slug not in peer_out.get(p, set())]

        if missing_peer_reciprocal:
            if args.write and args.reciprocal:
                for peer in missing_peer_reciprocal:
                    if inject_card(SYMBOL_DIR / peer / "index.html", f"/symbol/{slug}/", spoke["title"], spoke["desc"]):
                        print(f"[FIXED] symbol/{slug}: injected reciprocal peer card into symbol/{peer}")
                        peer_out.setdefault(peer, set()).add(slug)
                        fixed += 1
                    else:
                        print(f"[WARN] symbol/{slug}: symbol/{peer} has no compare-grid; add the peer link manually")
                        warns += 1
            else:
                print(f"[WARN] symbol/{slug}: declared peer(s) not linking back: "
                      + ", ".join(f"symbol/{p}" for p in missing_peer_reciprocal))
                warns += len(missing_peer_reciprocal)

    # ── Locale propagation ────────────────────────────────────────────────
    # The EN pass above has just settled the canonical peer graph. Mirror it
    # into every language, restricted to relations where BOTH ends have a live
    # sibling in that language — a peer with no translation is skipped, never
    # linked in English (CLAUDE.md, "Locale-native internal linking").
    locale_pages = 0
    if args.locales:
        siblings = load_locale_siblings()
        langs = sorted({lang for by_lang in siblings.values() for lang in by_lang})
        locale_pages = sum(len(by_lang) for by_lang in siblings.values())

        for lang in langs:
            for slug in sorted(siblings):
                src = siblings[slug].get(lang)
                if src is None:
                    continue
                # Peers of this page, as EN declares them, that exist in `lang`.
                wanted = [
                    siblings[p][lang]
                    for p in sorted(peer_out.get(slug, set()))
                    if p in spokes and p != slug and lang in siblings.get(p, {})
                ]
                if not wanted:
                    continue

                html = src["path"].read_text(encoding="utf-8", errors="replace")
                missing = [t for t in wanted
                           if f'href="/{lang}/symbol/{t["slug"]}/"' not in html]
                if not missing:
                    continue

                rel_src = src["path"].relative_to(REPO)
                if args.write and args.reciprocal:
                    for target in missing:
                        href = f'/{lang}/symbol/{target["slug"]}/'
                        if inject_card(src["path"], href, target["title"], target["desc"]):
                            print(f"[FIXED] {rel_src.parent}: injected locale peer card -> {href}")
                            fixed += 1
                        else:
                            print(f"[WARN] {rel_src.parent}: no compare-grid; add {href} manually")
                            warns += 1
                else:
                    names = ", ".join(f'/{lang}/symbol/{t["slug"]}/' for t in missing)
                    print(f"[WARN] {rel_src.parent}: EN peer(s) not mirrored here: {names}")
                    warns += len(missing)

        # Hub->spoke, mirrored the same way. The EN pass above settles which
        # hubs each spoke claims; that graph is EN-only until it is mirrored,
        # so <lang>/library/<hub> was never required to link <lang>/symbol/<spoke>
        # and no check could see the gap (CLAUDE.md, "Only the PEER graph is
        # mirrored"). Restricted, like the peer pass, to relations where BOTH
        # ends have a live sibling in that language.
        locale_hubs = load_locale_hubs()
        wanted_by_hub = {}
        for slug, spoke in spokes.items():
            for hub in spoke["claimed_hubs"]:
                for lang, hub_page in locale_hubs.get(hub, {}).items():
                    target = siblings.get(slug, {}).get(lang)
                    if target is None:
                        continue          # no sibling in L: skip, never link EN
                    wanted_by_hub.setdefault((lang, hub, hub_page), []).append(target)

        for (lang, hub, hub_page), targets in sorted(
                wanted_by_hub.items(), key=lambda kv: (kv[0][0], kv[0][1])):
            html = hub_page.read_text(encoding="utf-8", errors="replace")
            missing = [t for t in targets
                       if f'href="/{lang}/symbol/{t["slug"]}/"' not in html]
            if not missing:
                continue
            rel_hub = hub_page.relative_to(REPO)
            if args.write and args.reciprocal:
                for target in missing:
                    href = f'/{lang}/symbol/{target["slug"]}/'
                    if inject_card(hub_page, href, target["title"], target["desc"]):
                        print(f"[FIXED] {rel_hub.parent}: injected locale hub\u2192spoke card -> {href}")
                        fixed += 1
                    else:
                        print(f"[WARN] {rel_hub.parent}: no compare-grid; add {href} manually")
                        warns += 1
            else:
                names = ", ".join(f'/{lang}/symbol/{t["slug"]}/' for t in missing)
                print(f"[WARN] {rel_hub.parent}: EN hub\u2192spoke link(s) not mirrored here: {names}")
                warns += len(missing)

    print(f"\nChecked {len(spokes)} spoke(s) against {len(hub_links)} hub(s)"
          + (f" and {locale_pages} locale symbol page(s)" if args.locales else "")
          + f": {errors} error(s), {warns} warning(s)"
          + (f", {fixed} link(s) injected" if args.write else "") + ".")

    if errors or (args.strict and warns):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
