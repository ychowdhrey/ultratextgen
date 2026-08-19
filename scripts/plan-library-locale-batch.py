#!/usr/bin/env python3
"""
plan-library-locale-batch.py — pick the next batch of library/ pages to translate
into a locale, in priority order, and report what native-vocabulary evidence
exists for each.

This is the PLANNING half of the library locale translation workflow. It does not
write pages. It answers: "for locale X, which EN library pages should the next
batch cover, in what order, and what do we already know about how to name them
natively?"

Discovery of which (pattern, locale) cells are under-covered is already handled by
scripts/audit-locale-parent-gap.js. This script operates one level down: inside a
chosen cell, which individual pages come first.

Priority model — three signals, all computable from the repo, no API needed:

  1. inbound  — how many pages already link the EN source. A page the site links
                heavily is one whose translation immediately inherits internal
                links from the locale's own mesh once sync-locale-mesh runs.
  2. cluster  — how many locales already translated it. A page 12 locales have is
                a proven-portable topic; a page nobody has translated is either
                new or nobody thought it worth it.
  3. native   — whether the Local Language Intelligence Library (a researched,
                evidence-backed vocabulary dataset kept intentionally outside this
                repo -- there is no local copy here, see CLAUDE.md's "Local
                Language Intelligence" section for why and how to reach it) carries
                an approved or limited_use phrase matching the topic. Presence does
                not raise priority on its own; it is reported so a batch can be
                sequenced to put well-evidenced pages first and flag the rest for
                review.

  4. demand   — OPTIONAL and strongly preferred when available. Pass --gsc with a
                Search Console export (columns: Landing Page, Impressions, Url
                Clicks, Country). Signals 1-2 are structural proxies used only when
                no export is supplied; they say a page is well-connected, not that
                anyone searches for it.

                Two demand modes, and the difference is not subtle:

                  --gsc alone          ranks by the EN page's own clicks. This
                                       imports ENGLISH demand mix. EN is ~78%
                                       naming/identity; ja is ~0.2%. Ranking a
                                       Japanese batch this way puts Free Fire
                                       first for a market where Free Fire has no
                                       presence.

                  --gsc + --market     ranks by impressions from THAT MARKET
                                       landing on the EN page — i.e. people in the
                                       target country already finding the English
                                       version because no local one exists. This is
                                       demand for the page you are about to build,
                                       measured in the market you are building for.
                                       Always prefer it.

                Caveat on --market: it only sees pages that already rank in that
                market. A page with zero market impressions may still have demand
                nobody can see yet — that is the FR /symbol/ blind spot the whole
                governance layer exists for. Treat the ranking as a floor, not a
                ceiling.

Usage:
  python3 scripts/plan-library-locale-batch.py --locale tr --size 10
  python3 scripts/plan-library-locale-batch.py --locale tr --size 10 --gsc export.csv
  python3 scripts/plan-library-locale-batch.py --locale tr --size 10 --json out.json
  python3 scripts/plan-library-locale-batch.py --coverage        # all locales, no batch
"""

import argparse
import collections
import csv
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://ultratextgen.com"
PILLAR_INDEX = "library/index.html"


def read(path):
    try:
        with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
            return fh.read()
    except (OSError, UnicodeDecodeError):
        return ""


def en_library_pages():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "library", "*", "index.html"))):
        rel = os.path.relpath(p, ROOT)
        if rel == PILLAR_INDEX:
            continue
        out.append(rel.split(os.sep)[1])
    return out


def hreflang_map(rel_path):
    """{lang: href} declared by a page."""
    s = read(rel_path)
    return dict(re.findall(r'hreflang="([^"]+)"\s+href="([^"]+)"', s))


def canonical_locales():
    path = os.path.join(ROOT, "data", "locale_qualification_tiers.json")
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    tiers = {}

    def walk(node):
        if isinstance(node, dict):
            for key, val in node.items():
                if isinstance(val, dict) and "tier" in val:
                    tiers[key] = {"tier": val["tier"], "hold": bool(val.get("hold"))}
                else:
                    walk(val)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(data)
    return tiers


def inbound_link_counts():
    """How many HTML files link each /library/<slug>/ URL."""
    counts = collections.Counter()
    for path in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        s = read(os.path.relpath(path, ROOT))
        for slug in set(re.findall(r'href="/library/([^/"]+)/"', s)):
            counts[slug] += 1
    return counts


NATIVE_LEXICON_GLOB = os.path.join(
    ROOT, "..", "*", "forum-intelligence", "language-dictionaries",
    "local-language-lexicon.csv",
)
NATIVE_PUBLIC_STATUSES = {"approved", "limited_use"}


def _find_native_lexicon():
    """Locate the Local Language Intelligence Library's canonical CSV.

    This repo deliberately keeps no copy of it and no hardcoded path to it
    (see CLAUDE.md's "Local Language Intelligence" section) -- it is
    discovered by shape, not by name, in whichever sibling checkout carries
    it. NATIVE_LEXICON_PATH overrides the search with an explicit path.
    """
    env_path = os.environ.get("NATIVE_LEXICON_PATH")
    if env_path:
        return env_path if os.path.exists(env_path) else None
    hits = sorted(glob.glob(NATIVE_LEXICON_GLOB))
    return hits[0] if hits else None


def native_phrases(locale):
    """Approved/limited_use phrases for one locale, read directly from the
    Local Language Intelligence Library's canonical CSV.

    There used to be a public data/local-language/<locale>.json snapshot in
    THIS repo, generated from that same canonical dataset. It was removed
    2026-08-19: nothing at runtime ever read it (grep confirmed -- no JS, no
    HTML, no Cloudflare Function), its only consumer was this planning
    script, and it was shipping real research judgement (usage_guidance,
    avoid_when, confidence -- not just the phrase itself) into a public
    GitHub repo for no operational reason. See CLAUDE.md's "Local Language
    Intelligence" section.

    Fails loudly if the library isn't attached, rather than returning []
    which would look identical to "checked, nothing on record" and let a
    page ship on an unresearched slug -- exactly what this check exists to
    prevent.
    """
    path = _find_native_lexicon()
    if not path:
        print(
            "ERROR: cannot find the Local Language Intelligence Library.\n"
            "  This data lives ONLY outside this repo -- see CLAUDE.md's\n"
            "  'Local Language Intelligence' section for where and why.\n"
            "  Attach the sibling checkout that carries it (or set\n"
            "  NATIVE_LEXICON_PATH to its local-language-lexicon.csv) before\n"
            "  running this script -- do not proceed by treating an unchecked\n"
            "  locale as if it had no native-vocabulary evidence.",
            file=sys.stderr,
        )
        sys.exit(2)
    with open(path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    return [
        r for r in rows
        if r.get("locale") == locale and r.get("status") in NATIVE_PUBLIC_STATUSES
    ]


STOP = {
    "symbols", "symbol", "emoji", "emojis", "copy", "paste", "and", "the", "for",
    "a", "of", "text", "characters", "character", "signs", "sign",
}


def topic_tokens(slug):
    return {t for t in re.split(r"[-_]", slug) if t and t not in STOP}


def match_native(slug, phrases):
    """Report any approved/limited_use phrase whose english_concept overlaps the slug."""
    toks = topic_tokens(slug)
    if not toks:
        return []
    hits = []
    for p in phrases:
        concept = (p.get("english_concept") or "").lower()
        surface = (p.get("content_surface") or "").lower()
        overlap = {t for t in toks if t in concept}
        if overlap:
            hits.append({
                "phrase_id": p.get("phrase_id"),
                "native_phrase": p.get("native_phrase"),
                "english_concept": p.get("english_concept"),
                "title_safe": ("title" in surface or "h1" in surface),
                "usage_guidance": p.get("usage_guidance"),
                "avoid_when": p.get("avoid_when"),
                "matched_on": sorted(overlap),
            })
    return sorted(hits, key=lambda h: (not h["title_safe"], h["phrase_id"] or ""))


def gsc_clicks(csv_path, market=None):
    """{en-library-slug: n} from a Search Console export.

    Without `market`: EN clicks (English demand — see the --market caveat above).
    With `market`:    impressions from that country landing on the EN page, which
                      is demand for the locale page that does not exist yet.
    """
    import csv as _csv
    clicks = collections.Counter()
    with open(csv_path, encoding="utf-8-sig") as fh:
        for row in _csv.DictReader(fh):
            if market and (row.get("Country") or "").strip() != market:
                continue
            page = (row.get("Landing Page") or row.get("Page") or "").strip()
            m = re.search(r"/library/([^/]+)/?$", page)
            # EN pages only — a locale sibling's clicks say nothing about whether
            # THIS locale wants the topic, and counting them would double-reward
            # topics already widely translated (signal 2 covers that separately).
            if not m or re.search(r"ultratextgen\.com/[a-z]{2}(-[a-z]{2})?/library/", page):
                continue
            field = ("Impressions" if market else None)
            try:
                if market:
                    clicks[m.group(1)] += int(row.get("Impressions") or 0)
                else:
                    clicks[m.group(1)] += int(row.get("Url Clicks") or row.get("Clicks") or 0)
            except ValueError:
                pass
    return clicks


def build_coverage(pages):
    """slug -> set(locales that declare a translation)."""
    cov = {}
    for slug in pages:
        hl = hreflang_map(f"library/{slug}/index.html")
        cov[slug] = {k for k in hl if k not in ("en", "x-default")}
    return cov


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--locale")
    ap.add_argument("--size", type=int, default=10)
    ap.add_argument("--json", dest="json_out")
    ap.add_argument("--gsc", help="Search Console landing-page CSV; makes the "
                                  "ranking demand-driven instead of structural")
    ap.add_argument("--market", help="Country name as it appears in the GSC export "
                                     "(e.g. Thailand). Ranks by that market's "
                                     "impressions on the EN page — strongly "
                                     "preferred over bare --gsc")
    ap.add_argument("--coverage", action="store_true",
                    help="print per-locale coverage and exit")
    args = ap.parse_args()

    tiers = canonical_locales()
    pages = en_library_pages()
    cov = build_coverage(pages)

    if args.coverage or not args.locale:
        print(f"EN library pages: {len(pages)}   canonical locales: {len(tiers)}")
        print(f"{'locale':9s}{'tier':>5s}{'hold':>6s}{'have':>7s}{'missing':>9s}")
        rows = []
        for loc, meta in tiers.items():
            have = sum(1 for s in cov if loc in cov[s])
            rows.append((meta["tier"], -have, loc, meta, have))
        for tier, _neg, loc, meta, have in sorted(rows):
            print(f"{loc:9s}{tier:>5}{('yes' if meta['hold'] else '-'):>6s}"
                  f"{have:7d}{len(pages) - have:9d}")
        if not args.locale:
            print("\nPass --locale <code> to plan a batch.")
        return 0

    loc = args.locale
    if loc not in tiers:
        print(f"error: '{loc}' is not a canonical locale. Known: {', '.join(sorted(tiers))}",
              file=sys.stderr)
        return 2

    inbound = inbound_link_counts()
    phrases = native_phrases(loc)
    missing = [s for s in pages if loc not in cov[s]]
    demand = gsc_clicks(args.gsc, args.market) if args.gsc else None

    scored = []
    for slug in missing:
        ib = inbound.get(slug, 0)
        cl = len(cov[slug])
        if demand is not None:
            dm = demand.get(slug, 0)
            score = dm * 10 + ib + cl
        else:
            dm = None
            score = ib * 2 + cl * 3
        scored.append({
            "slug": slug,
            "en_url": f"{SITE}/library/{slug}/",
            "score": score,
            "en_clicks": dm,
            "inbound_links": ib,
            "locales_already_translated": cl,
            "native_evidence": match_native(slug, phrases),
        })
    scored.sort(key=lambda r: (-r["score"], r["slug"]))
    batch = scored[: args.size]

    meta = tiers[loc]
    print(f"Library locale batch plan — {loc} (tier {meta['tier']}"
          f"{', HOLD' if meta['hold'] else ''})")
    print(f"  EN library pages     : {len(pages)}")
    print(f"  already translated   : {len(pages) - len(missing)}")
    print(f"  missing              : {len(missing)}")
    print(f"  native phrases avail : {len(phrases)} "
          f"(approved/limited_use, locale={loc}, from the Local Language "
          f"Intelligence Library's local-language-lexicon.csv)")
    if demand is None:
        basis = "inbound*2 + locales*3  [STRUCTURAL — pass --gsc for real demand]"
    elif args.market:
        basis = (f"{args.market} impressions on the EN page*10 + inbound + locales  "
                 f"[MARKET DEMAND — best available]")
    else:
        basis = ("EN clicks*10 + inbound + locales  [ENGLISH demand — pass --market "
                 "to rank by the target market instead]")
    print(f"\nNext {len(batch)} by priority (score = {basis}):\n")
    for i, r in enumerate(batch, 1):
        print(f"{i:3d}. {r['slug']}")
        if r["en_clicks"] is None:
            dm = ""
        elif args.market:
            dm = f"{args.market} impr {r['en_clicks']:5d}  "
        else:
            dm = f"EN clicks {r['en_clicks']:5d}  "
        print(f"     score {r['score']:5d}  {dm}inbound {r['inbound_links']:3d}  "
              f"already in {r['locales_already_translated']} locales")
        if r["native_evidence"]:
            for h in r["native_evidence"][:2]:
                flag = "TITLE-SAFE" if h["title_safe"] else "body/FAQ only"
                print(f"     native [{h['phrase_id']} {flag}]: {h['native_phrase']}")
                if h.get("avoid_when") and h["avoid_when"] not in ("", "n/a"):
                    print(f"            avoid: {h['avoid_when'][:88]}")
        else:
            print("     native: NONE ON RECORD — do not invent a slug. Research the "
                  "native head term first (see workflow step 2).")
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump({"locale": loc, "tier": meta["tier"], "hold": meta["hold"],
                       "missing_total": len(missing), "batch": batch}, fh,
                      ensure_ascii=False, indent=2)
        print(f"\nJSON written to {args.json_out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
