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


def build_card(slug, spoke, card_class, indent):
    pad = " " * indent
    inner = " " * (indent + 2)
    desc = spoke["desc"] or f"Dedicated page for the {spoke['title'].lower()} — copy it, type it, and see how it renders."
    return (
        f'{pad}<a href="/symbol/{slug}/" class="{card_class}">\n'
        f"{inner}<h4>{spoke['title']}</h4>\n"
        f"{inner}<p>{desc}</p>\n"
        f"{pad}</a>\n"
    )


def inject_card(target_path, slug, spoke):
    """Insert a compare-card for the spoke into target_path's compare-grid
    (a /library/ hub or another /symbol/ spoke — the markup convention is
    identical for both). Returns True on success, False if target_path has
    no compare-grid."""
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

    card = build_card(slug, spoke, card_class, indent)
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
                if inject_card(LIBRARY_DIR / target / "index.html", slug, spoke):
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
                    if inject_card(LIBRARY_DIR / hub / "index.html", slug, spoke):
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
                    if inject_card(SYMBOL_DIR / peer / "index.html", slug, spoke):
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

    print(f"\nChecked {len(spokes)} spoke(s) against {len(hub_links)} hub(s): "
          f"{errors} error(s), {warns} warning(s)"
          + (f", {fixed} link(s) injected" if args.write else "") + ".")

    if errors or (args.strict and warns):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
