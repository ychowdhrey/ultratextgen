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


def card_desc(spec, lang):
    """Short, COMPLETE sentence for the hub card, or None if we can't write one.

    Deliberately not a truncation of hero_tagline/intro: those run long, and
    clipping them mid-clause ("...then copy tree, Santa, and…") reads as broken
    next to the hubs' own hand-written one-liners ("Pumpkins, ghosts, and spooky
    characters for October.").

    The composed fallback is English, so it is only used on English specs. A
    non-English spec must supply `hub_card_desc` in its own language — writing
    English marketing copy onto a Spanish collection page is worse than leaving
    the link out, so this returns None and the caller warns instead.
    """
    override = (spec.get("hub_card_desc") or "").strip()
    if override:
        return override
    if lang != DEFAULT_LANGUAGE:
        return None
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
        lang = spec.get("language", DEFAULT_LANGUAGE)
        slug = spec["slug"]
        event_url = f"/events/{slug}/" if lang == DEFAULT_LANGUAGE else f"/{lang}/events/{slug}/"

        # A spec may name its hub backlink targets explicitly. Needed where a
        # locale's collection page doesn't live under <lang>/library/ (e.g. the
        # Spanish heart-symbols page is /es/simbolos-de-corazon/), which the
        # path pattern below can't recognise on its own.
        hrefs = spec.get("hub_backlinks")
        if hrefs is None:
            hrefs = [r.get("href", "") for r in spec.get("related", [])]

        hubs = []
        for href in hrefs:
            # Only /library/ collections — see the module docstring on why the
            # broad /category/ font hubs are skipped.
            if spec.get("hub_backlinks") is not None:
                # Explicit list: trust it, but still resolve the language from
                # the path so the same-language guard below still applies.
                m = re.match(r"/(?:([a-z]{2}(?:-[a-z]{2})?)/)", href)
                hub_lang = m.group(1) if m and m.group(1) != "library" else DEFAULT_LANGUAGE
            else:
                m = re.fullmatch(r"/(?:([a-z]{2}(?:-[a-z]{2})?)/)?library/([a-z0-9-]+)/", href)
                if not m:
                    continue
                hub_lang = m.group(1) or DEFAULT_LANGUAGE
            # Same-language only. An English hub must not card a Spanish event
            # page (and vice versa): that is precisely the locale-native
            # internal-linking failure CLAUDE.md warns about, and it would send
            # a reader from an EN collection into an ES tool page.
            if hub_lang != lang:
                continue
            hub_path = (REPO / href.strip("/")) / "index.html"
            hubs.append((href, hub_path))

        name = spec.get("event_name", slug)
        events[event_url] = {
            "name": name,
            "lang": lang,
            # hero_h1 is the page's own localized name; fall back to an English
            # composition only for English specs.
            "title": spec.get("hub_card_title")
            or (f"{name} Text &amp; Symbol Generator" if lang == DEFAULT_LANGUAGE else spec.get("hero_h1", name)),
            "desc": card_desc(spec, lang),
            "hubs": hubs,
        }
    return events


def build_card(event_url, event, card_class, indent):
    pad = " " * indent
    inner = " " * (indent + 2)
    return (
        f'{pad}<a href="{event_url}" class="{card_class}">\n'
        f"{inner}<h4>{event['title']}</h4>\n"
        f"{inner}<p>{event['desc']}</p>\n"
        f"{pad}</a>\n"
    )


def inject_card(hub_path, event_url, event):
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

    card = build_card(event_url, event, card_class, indent)
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

    for event_url, event in sorted(events.items()):
        linked_from = []
        if event["desc"] is None:
            problems.append(
                f"[WARN] {event_url}: non-English spec has no `hub_card_desc`; "
                "add one in that language to wire its hub backlinks"
            )
            orphans.append(event_url)
            continue
        for href, hub_path in event["hubs"]:
            if not hub_path.exists():
                problems.append(f"[WARN] {event_url}: {href} does not exist")
                continue
            html = hub_path.read_text(encoding="utf-8", errors="replace")
            # Quote-agnostic: some older pages are minified with single-quoted
            # attributes, and a double-quote-only check would re-inject a link
            # that is already there.
            if re.search(r'href=[\'"]' + re.escape(event_url) + r'[\'"]', html):
                linked_from.append(href)
                skipped += 1
                continue
            if not args.write:
                print(f"  + {href:42} -> {event_url}")
                injected += 1
                linked_from.append(href)
                continue
            if inject_card(hub_path, event_url, event):
                print(f"  ✓ {href:42} -> {event_url}")
                injected += 1
                linked_from.append(href)
            else:
                problems.append(f"[WARN] {href}: no compare-grid; add the {event_url} link by hand")
        if not linked_from:
            # A homepage link satisfies Rule 4's "no orphan spokes" just as a
            # topical hub does — it's an inbound link from a hub page. Some
            # locales have an event page but no locale-native collection to
            # card it from, and the locale homepage is the correct owner there.
            home = REPO / ("index.html" if event["lang"] == DEFAULT_LANGUAGE
                           else f"{event['lang']}/index.html")
            if home.exists() and re.search(
                r'href=[\'"]' + re.escape(event_url) + r'[\'"]',
                home.read_text(encoding="utf-8", errors="replace")):
                continue
            orphans.append(event_url)

    print("")
    verb = "Injected" if args.write else "Would inject"
    print(f"{verb} {injected} hub->event link(s); {skipped} already present.")
    for p in problems:
        print(p)
    if orphans:
        print("")
        for slug in orphans:
            print(f"[ERROR] {slug}: ORPHAN — no library hub links to it (Hub vs Spoke Rule 4)")
        return 1
    if not args.write and injected:
        print("Run with --write to apply.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
