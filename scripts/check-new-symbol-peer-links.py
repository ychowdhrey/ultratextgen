#!/usr/bin/env python3
"""
Per-PR gate: every /symbol/ page added or modified in this branch must have
its declared "Related Symbols" peer relations reciprocated — if page A's
compare-grid names page B as related, B's compare-grid must link back to A.

This is the enforcement half of scripts/sync_symbol_spoke_links.py (which is
the generator/fixer AND doubles as the whole-site audit via --check). That
script isn't diff-scoped, so its 73-of-106-page peer-reciprocity backlog
(pre-existing at the time this gate was added) can't be a per-PR blocker
without being permanently red regardless of what any given PR touches — same
architectural reason check-new-page-image-assets.py exists separately from
check-image-assets.py. This script closes the gap going forward: diff-scoped,
so only a NEW one-directional peer relation introduced by this branch can
fail it. Root cause + case study: an internal audit (2026-07-24) traced it to
the currency-symbol cluster — euro/pound/yen/rupee never linked back to
ruble/dirham/riyal, which shipped weeks later.

Second rule (added 2026-09-02): every <lang>/symbol/ page this branch ADDS must
be linked from that locale's copy of each /library/ hub its EN parent claims.
sync_symbol_spoke_links.py mirrors the peer graph into every language but its
hub->spoke pass walked EN only, so a locale hub was never required to link its
own locale spokes and nothing could see the gap — 1,032 missing links across 16
languages and 250 hub pages when it was first measured. Scoped to ADDED pages,
not modified ones: that is the regression which produced those 1,032, and it
keeps the gate off the pre-existing backlog rather than permanently red.

Scope: EN /symbol/*/index.html only for the peer rule, matching
sync_symbol_spoke_links.py's own peer scope. Reciprocity is
checked against the CURRENT tree (this PR's HEAD), not "was the peer also
touched in this PR" — unlike translation parity, there's no editorial call to
make here; the fix is always mechanical (run the generator), so the gate just
asks "is the declared relation reciprocal right now."

Usage:
  python3 scripts/check-new-symbol-peer-links.py               # diff against origin/main
  python3 scripts/check-new-symbol-peer-links.py --base main    # diff against a different ref

Exit status: 0 when clean (or nothing changed to check), 1 when any
changed/added /symbol/ page declares a peer relation its peer doesn't
reciprocate.
"""
import argparse
import importlib.util
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOL_DIR = os.path.join(ROOT, "symbol")

SYM_HREF_RE = re.compile(r'href="/symbol/([a-z0-9-]+)/"')

# The locale hub->spoke rule reuses the generator's own cluster discovery and
# hub loading rather than reimplementing them; a second copy of that logic
# would drift from the first, which is the failure the peer rule above exists
# to document.
_spec = importlib.util.spec_from_file_location(
    "sync_symbol_spoke_links",
    os.path.join(ROOT, "scripts", "sync_symbol_spoke_links.py"),
)
SYNC = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SYNC)


def git(args):
    return subprocess.run(
        ["git"] + args, cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout


def resolve_base(requested):
    try:
        subprocess.run(
            ["git", "rev-parse", "--verify", requested],
            cwd=ROOT, capture_output=True, check=True,
        )
        return requested
    except subprocess.CalledProcessError:
        # Shallow CI checkouts often don't have the base branch locally at all.
        branch = requested.replace("origin/", "")
        subprocess.run(
            ["git", "fetch", "--depth=200", "origin", branch],
            cwd=ROOT, capture_output=True,
        )
        candidate = f"origin/{branch}"
        subprocess.run(
            ["git", "rev-parse", "--verify", candidate],
            cwd=ROOT, capture_output=True, check=True,
        )
        return candidate


def peer_links(slug):
    """Current on-disk set of /symbol/ slugs this spoke links to (excluding
    self). Returns None if the spoke doesn't exist on disk (dead slug)."""
    path = os.path.join(SYMBOL_DIR, slug, "index.html")
    if not os.path.exists(path):
        return None
    html = open(path, encoding="utf-8", errors="replace").read()
    return {s for s in SYM_HREF_RE.findall(html) if s != slug}


def locale_hub_failures(merge_base):
    """Every <lang>/symbol/ page this branch ADDS must be linked from that
    locale's copy of each /library/ hub its EN parent claims. Returns a list of
    (locale page, locale hub page, expected href)."""
    added = [
        l.strip()
        for l in git(
            ["diff", "--name-only", "--diff-filter=A", merge_base, "HEAD",
             "--", "*/symbol/*/index.html"]
        ).splitlines()
        if l.strip()
    ]
    if not added:
        return [], 0

    spokes = SYNC.load_spokes()
    locale_hubs = SYNC.load_locale_hubs()
    out = []
    checked = 0
    for rel in added:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        parts = rel.split("/")
        lang = parts[0]
        if not re.fullmatch(r"[a-z]{2}(-[a-z]{2})?", lang):
            continue
        html = open(path, encoding="utf-8", errors="replace").read()
        m_en = SYNC.EN_ALTERNATE_RE.search(html)
        if not m_en:
            continue                    # no declared EN parent: not in a cluster
        m_slug = SYNC.EN_SYMBOL_URL_RE.match(m_en.group(1).strip())
        if not m_slug:
            continue
        en_slug = m_slug.group(1)
        spoke = spokes.get(en_slug)
        if not spoke:
            continue
        checked += 1
        href = f'href="/{lang}/symbol/{parts[-2]}/"'
        for hub in spoke["claimed_hubs"]:
            hub_page = locale_hubs.get(hub, {}).get(lang)
            if hub_page is None:
                continue                # hub not translated into L: nothing to link from
            hub_html = hub_page.read_text(encoding="utf-8", errors="replace")
            if href not in hub_html:
                out.append((rel, str(hub_page.relative_to(SYNC.REPO)), href[6:-1]))
    return out, checked


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="origin/main")
    args = parser.parse_args()

    try:
        base = resolve_base(args.base)
        merge_base = git(["merge-base", base, "HEAD"]).strip()
    except subprocess.CalledProcessError as e:
        print(f"Could not resolve base ref {args.base!r}: {e}")
        return 2

    changed = [
        l.strip()
        for l in git(
            ["diff", "--name-only", "--diff-filter=ACMR", merge_base, "HEAD",
             "--", "symbol/*/index.html"]
        ).splitlines()
        if l.strip()
    ]

    failures = []
    checked = 0
    for rel in changed:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue  # deleted in this branch
        slug = os.path.basename(os.path.dirname(path))
        checked += 1

        declared = sorted(peer_links(slug) or set())
        for peer in declared:
            peer_back = peer_links(peer)
            if peer_back is None:
                continue  # dead/renamed slug — not this gate's concern
            if slug not in peer_back:
                failures.append((rel, peer))

    hub_fails, hub_checked = locale_hub_failures(merge_base)

    # Only short-circuit when BOTH rules have nothing to look at. Returning
    # early on the EN set alone would skip the locale hub rule entirely — a
    # PR that adds only <lang>/symbol/ pages touches no EN page at all, which
    # is exactly the shape this rule exists for.
    if not changed and not hub_checked:
        print("check-new-symbol-peer-links: no changed /symbol/ pages and no added "
              "locale spokes — nothing to check.")
        return 0

    print("New/changed symbol-page peer-link reciprocity check")
    print(f"  base:                  {base} (merge-base {merge_base[:8]})")
    print(f"  changed symbol pages:  {len(changed)}")
    print(f"  pages checked:         {checked}")
    print(f"  problems found:        {len(failures)}")
    print(f"  added locale spokes:   {hub_checked}")
    print(f"  unlinked by their hub: {len(hub_fails)}")

    if hub_fails:
        print("")
        print("This PR adds a <lang>/symbol/ page that its own locale library hub")
        print("does not link, so nothing but the sitemap can reach it:")
        for rel, hub, href in hub_fails:
            print(f"  \u2717 {rel} is not linked from {hub} (expected {href})")
        print("")
        print("Fix: run the generator, which mirrors the EN hub\u2192spoke graph into")
        print("every language —")
        print("  python3 scripts/sync_symbol_spoke_links.py --write --reciprocal")
        print("then commit the result in this same PR.")

    if failures:
        print("")
        print("This PR ships a /symbol/ page whose declared Related Symbols peer")
        print("doesn't link back:")
        for rel, peer in failures:
            print(f"  ✗ {rel} names symbol/{peer}/ as related, but symbol/{peer}/ doesn't link back")
        print("")
        print("Fix: run the generator, which injects the missing reciprocal card(s) —")
        print("  python3 scripts/sync_symbol_spoke_links.py --write --reciprocal")
        print("then commit the result in this same PR. Don't ship a one-directional")
        print("peer relation and rely on a later cleanup pass to fix it.")
        return 1

    print("")
    if hub_fails:
        return 1

    print("Every /symbol/ page changed in this branch has fully reciprocal peer links,")
    print("and every locale spoke it adds is linked from its own locale hub. ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
