#!/usr/bin/env python3
"""sync_event_hub_links.py — give every /events/ spoke its inbound hub links.

CLAUDE.md's Hub vs Spoke Rule 4 requires links in BOTH directions: hub -> spoke
and spoke -> hub. The event pages shipped with only half of that. Every event
page links out diligently (the Eid page alone points at /library/islamic-symbols/,
/library/moon-celestial-symbols/, /library/sparkle-symbols/), but not one of
those collections linked back — 31 outbound targets, zero backlinks, so all 11
event spokes were orphans by the site's own rule.

This is the event-page analogue of scripts/sync_symbol_spoke_links.py, and it
mirrors that script deliberately: same "read the spoke's own `related` block,
inject a house-style compare-card into the hub's Related Resources grid"
approach, same idempotence (a hub already linking the event anywhere in the page
is skipped), same refusal to invent copy.

Which hubs get a backlink
-------------------------
Only `/library/` collections — the topical ones (christmas-symbols, islamic-
symbols, heart-ascii-art). Broad `/category/` font-family hubs are deliberately
SKIPPED: /category/cursive-fonts/ is claimed by 7 different events, and carding
all 7 onto a head-term page would dilute it without serving Rule 4, which only
requires that no spoke is orphaned. Every event has at least one topical library
hub, so skipping the font categories orphans nothing.

Usage
-----
    python3 scripts/sync_event_hub_links.py            # report only
    python3 scripts/sync_event_hub_links.py --write    # apply
"""

import argparse
import json
import pathlib
import re
import sys

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
SPEC_DIR = REPO / "data" / "event_page_specs"
DEFAULT_LANGUAGE = "en"
MAX_DESC_LEN = 110

COMPARE_GRID_RE = re.compile(r'<div\s+class="compare-grid"[^>]*>')
CARD_CLASS_RE = re.compile(r'<a\s+href="[^"]*"\s+class="([^"]+)"')


def card_desc(spec):
    """Short, COMPLETE sentence for the hub card.

    Deliberately not a truncation of hero_tagline/intro: those run long, and
    clipping them mid-clause ("...then copy tree, Santa, and…") reads as broken
    next to the hubs' own hand-written one-liners ("Pumpkins, ghosts, and spooky
    characters for October."). A spec can override with `hub_card_desc`;
    otherwise we compose a clean sentence from the event's own name.
    """
    override = (spec.get("hub_card_desc") or "").strip()
    if override:
        return override
    name = spec.get("event_name", spec["slug"])
    return (
        f"Style a {name} greeting live, then copy matching fonts, emoji, "
        "kaomoji, and ready-made phrases."
    )


def load_events():
    """slug -> {name, desc, hubs[]} for every English event spec."""
    events = {}
    for path in sorted(SPEC_DIR.glob("*.json")):
        if path.name.startswith("_"):
            continue
        spec = json.loads(path.read_text(encoding="utf-8"))
        if spec.get("language", DEFAULT_LANGUAGE) != DEFAULT_LANGUAGE:
            continue
        hubs = []
        for rel in spec.get("related", []):
            href = rel.get("href", "")
            # /library/ only — see the module docstring on why /category/ is skipped.
            m = re.fullmatch(r"/library/([a-z0-9-]+)/", href)
            if m:
                hubs.append(m.group(1))
        events[spec["slug"]] = {
            "name": spec.get("event_name", spec["slug"]),
            "desc": card_desc(spec),
            "hubs": hubs,
        }
    return events


def build_card(slug, event, card_class, indent):
    pad = " " * indent
    inner = " " * (indent + 2)
    desc = event["desc"]
    return (
        f'{pad}<a href="/events/{slug}/" class="{card_class}">\n'
        f"{inner}<h4>{event['name']} Text &amp; Symbol Generator</h4>\n"
        f"{inner}<p>{desc}</p>\n"
        f"{pad}</a>\n"
    )


def inject_card(hub_path, slug, event):
    """Insert a compare-card for the event into the hub's compare-grid.
    Returns True on success, False if the hub has no usable compare-grid."""
    html = hub_path.read_text(encoding="utf-8")

    m_grid = COMPARE_GRID_RE.search(html)
    if not m_grid:
        return False
    grid_start = m_grid.end()
    # Cards contain no nested <div>, so the first </div> closes the grid.
    grid_end = html.find("</div>", grid_start)
    if grid_end == -1:
        return False
    grid_body = html[grid_start:grid_end]

    # Match the class variant and indentation of the existing sibling cards.
    m_class = CARD_CLASS_RE.search(grid_body)
    card_class = m_class.group(1) if m_class else "compare-card variant-muted u-no-underline"
    m_indent = re.search(r"\n( *)<a ", grid_body)
    indent = len(m_indent.group(1)) if m_indent else 4

    card = build_card(slug, event, card_class, indent)
    insertion = grid_body.rstrip() + "\n" + card + " " * max(indent - 2, 0)
    html = html[:grid_start] + insertion + html[grid_end:]
    hub_path.write_text(html, encoding="utf-8")
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="apply changes (default: report only)")
    args = parser.parse_args(argv)

    events = load_events()
    injected = skipped = 0
    problems = []
    orphans = []

    for slug, event in sorted(events.items()):
        linked_from = []
        for hub in event["hubs"]:
            hub_path = REPO / "library" / hub / "index.html"
            if not hub_path.exists():
                problems.append(f"[WARN] events/{slug}: /library/{hub}/ does not exist")
                continue
            html = hub_path.read_text(encoding="utf-8", errors="replace")
            if f'/events/{slug}/' in html:
                linked_from.append(hub)
                skipped += 1
                continue
            if not args.write:
                print(f"  + library/{hub:32} -> /events/{slug}/")
                injected += 1
                linked_from.append(hub)
                continue
            if inject_card(hub_path, slug, event):
                print(f"  ✓ library/{hub:32} -> /events/{slug}/")
                injected += 1
                linked_from.append(hub)
            else:
                problems.append(f"[WARN] library/{hub}: no compare-grid; add the /events/{slug}/ link by hand")
        if not linked_from:
            orphans.append(slug)

    print("")
    verb = "Injected" if args.write else "Would inject"
    print(f"{verb} {injected} hub->event link(s); {skipped} already present.")
    for p in problems:
        print(p)
    if orphans:
        print("")
        for slug in orphans:
            print(f"[ERROR] events/{slug}: ORPHAN — no library hub links to it (Hub vs Spoke Rule 4)")
        return 1
    if not args.write and injected:
        print("Run with --write to apply.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
