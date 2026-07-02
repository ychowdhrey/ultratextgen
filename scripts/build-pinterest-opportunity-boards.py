#!/usr/bin/env python3
"""
Build focused Pinterest importer CSVs from the main page pin inventory.

The repo already has one broad page inventory at data/pinterest_pins.csv and one
vertical pin image per page in assets/pinterest/. This script creates focused
Pinterest upload CSVs for the clearest incremental board opportunities from the
football, country and player page clusters, without re-rendering images.

Outputs:
  data/country_flags_pinterest_upload.csv
  data/football_players_pinterest_upload.csv
  data/world_cup_football_pinterest_upload.csv
  data/soccer_text_art_pinterest_upload.csv

Run:
  python3 scripts/build-pinterest-opportunity-boards.py

Set PIN_MEDIA_DOMAIN to use raw GitHub media URLs before the site deploys.
"""
import csv
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
SOURCE = os.path.join(DATA, "pinterest_pins.csv")
DOMAIN = os.environ.get("PIN_MEDIA_DOMAIN", "https://ultratextgen.com")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P = _load(os.path.join(HERE, "pinterest_csv.py"), "pinterest_csv")

COUNTRY_SLUGS = {
    "library-algeria-emoji-combos", "library-argentina-emoji-combos",
    "library-australia-emoji-combos", "library-austria-emoji-combos",
    "library-belgium-emoji-combos", "library-brazil-emoji-combos",
    "library-cameroon-emoji-combos", "library-canada-emoji-combos",
    "library-chile-emoji-combos", "library-china-emoji-combos",
    "library-colombia-emoji-combos", "library-costa-rica-emoji-combos",
    "library-croatia-emoji-combos", "library-denmark-emoji-combos",
    "library-ecuador-emoji-combos", "library-egypt-emoji-combos",
    "library-england-emoji-combos", "library-france-emoji-combos",
    "library-germany-emoji-combos", "library-ghana-emoji-combos",
    "library-greece-emoji-combos", "library-honduras-emoji-combos",
    "library-india-emoji-combos", "library-iran-emoji-combos",
    "library-ireland-emoji-combos", "library-italy-emoji-combos",
    "library-ivory-coast-emoji-combos", "library-jamaica-emoji-combos",
    "library-japan-emoji-combos", "library-mexico-emoji-combos",
    "library-morocco-emoji-combos", "library-netherlands-emoji-combos",
    "library-new-zealand-emoji-combos", "library-nigeria-emoji-combos",
    "library-norway-emoji-combos", "library-panama-emoji-combos",
    "library-paraguay-emoji-combos", "library-peru-emoji-combos",
    "library-poland-emoji-combos", "library-portugal-emoji-combos",
    "library-qatar-emoji-combos", "library-saudi-arabia-emoji-combos",
    "library-scotland-emoji-combos", "library-senegal-emoji-combos",
    "library-serbia-emoji-combos", "library-south-africa-emoji-combos",
    "library-south-korea-emoji-combos", "library-spain-emoji-combos",
    "library-sweden-emoji-combos", "library-switzerland-emoji-combos",
    "library-tunisia-emoji-combos", "library-turkey-emoji-combos",
    "library-ukraine-emoji-combos", "library-uruguay-emoji-combos",
    "library-usa-emoji-combos", "library-venezuela-emoji-combos",
    "library-wales-emoji-combos",
}

PLAYER_SLUGS = {
    "library-bellingham-emoji-combos", "library-benzema-emoji-combos",
    "library-de-bruyne-emoji-combos", "library-di-maria-emoji-combos",
    "library-foden-emoji-combos", "library-gavi-emoji-combos",
    "library-griezmann-emoji-combos", "library-haaland-emoji-combos",
    "library-kane-emoji-combos", "library-kvaratskhelia-emoji-combos",
    "library-lautaro-martinez-emoji-combos", "library-lewandowski-emoji-combos",
    "library-mbappe-emoji-combos", "library-messi-emoji-combos",
    "library-modric-emoji-combos", "library-musiala-emoji-combos",
    "library-neymar-emoji-combos", "library-nkunku-emoji-combos",
    "library-osimhen-emoji-combos", "library-pedri-emoji-combos",
    "library-rashford-emoji-combos", "library-rodri-emoji-combos",
    "library-rodrygo-emoji-combos", "library-ronaldo-emoji-combos",
    "library-saka-emoji-combos", "library-salah-emoji-combos",
    "library-son-emoji-combos", "library-suarez-emoji-combos",
    "library-vinicius-emoji-combos", "library-wirtz-emoji-combos",
    "library-yamal-emoji-combos",
}

WORLD_CUP_FOOTBALL_SLUGS = {
    "library-card-emoji-soccer", "library-football-emoji-copy-paste",
    "library-football-reaction-emojis", "library-football-trophy-emoji",
    "library-goal-emoji-combos", "library-goat-emoji-combos",
    "library-guess-soccer-player-by-emoji", "library-guess-soccer-team-by-emoji",
    "library-soccer-emoji-copy-paste", "library-sports-emojis",
    "library-world-cup-emoji-combos", "usecase-football-font",
}

SOCCER_TEXT_ART_SLUGS = {
    "library-football-ascii-art", "library-football-kaomoji",
    "library-football-symbols", "library-football-username-ideas",
}

BOARD_GROUPS = [
    dict(
        key="country_flags",
        board="Country Emoji Combos & Flags",
        out="country_flags_pinterest_upload.csv",
        campaign="country_flags_pins",
        slugs=COUNTRY_SLUGS,
    ),
    dict(
        key="football_players",
        board="Football Player Emoji Combos",
        out="football_players_pinterest_upload.csv",
        campaign="football_players_pins",
        slugs=PLAYER_SLUGS,
    ),
    dict(
        key="world_cup_football",
        board="World Cup & Football Emoji Combos",
        out="world_cup_football_pinterest_upload.csv",
        campaign="world_cup_football_pins",
        slugs=WORLD_CUP_FOOTBALL_SLUGS,
    ),
    dict(
        key="soccer_text_art",
        board="Football Symbols & Soccer Text Art",
        out="soccer_text_art_pinterest_upload.csv",
        campaign="soccer_text_art_pins",
        slugs=SOCCER_TEXT_ART_SLUGS,
    ),
]


def page_slug(row):
    image_path = (row.get("pinterest_image_path") or "").strip()
    if image_path:
        return os.path.splitext(os.path.basename(image_path))[0]
    path = (row.get("page_path") or "").strip("/")
    return "homepage" if not path else path.replace("/", "-")


def campaign_url(row, campaign):
    url = (row.get("utm_destination_url") or row.get("pin_destination_url") or "").strip()
    if not url:
        return ""
    marker = "utm_campaign="
    if marker in url:
        before, after = url.split(marker, 1)
        if "&" in after:
            _, rest = after.split("&", 1)
            return f"{before}{marker}{campaign}&{rest}"
        return f"{before}{marker}{campaign}"
    sep = "&" if "?" in url else "?"
    slug = page_slug(row)
    return (f"{url}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign={campaign}&utm_content={slug}")


def load_inventory():
    if not os.path.exists(SOURCE):
        sys.exit("data/pinterest_pins.csv not found. Run scripts/generate-pinterest.py first.")
    with open(SOURCE, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    return {page_slug(r): r for r in rows
            if (r.get("include_in_pinterest") or "").strip().lower() == "yes"}


def convert_group(group, rows_by_slug):
    rows = []
    missing = []
    for slug in sorted(group["slugs"]):
        src = rows_by_slug.get(slug)
        if not src:
            missing.append(slug)
            continue
        rows.append(P.upload_row(
            src.get("pin_title", ""),
            P.public_media_url(DOMAIN, src.get("pinterest_image_path", "")),
            group["board"],
            description=src.get("pin_description", ""),
            link=campaign_url(src, group["campaign"]),
            keywords=src.get("pin_keywords", ""),
        ))

    out = os.path.join(DATA, group["out"])
    P.write_upload_csv(out, rows)
    print(f"[{group['key']}] {len(rows):3} pins -> data/{group['out']} ({group['board']})")
    if missing:
        print(f"  missing {len(missing)} inventory rows: {', '.join(missing)}")
    return len(rows), missing


def main():
    wanted = [a for a in sys.argv[1:] if not a.startswith("-")]
    groups = BOARD_GROUPS if not wanted else [g for g in BOARD_GROUPS if g["key"] in wanted]
    unknown = sorted(set(wanted) - {g["key"] for g in BOARD_GROUPS})
    if unknown:
        sys.exit(f"unknown board group(s): {', '.join(unknown)}")

    print(f"building focused Pinterest board CSVs (media domain: {DOMAIN})")
    rows_by_slug = load_inventory()
    total_missing = []
    for group in groups:
        _, missing = convert_group(group, rows_by_slug)
        total_missing.extend(missing)
    if total_missing:
        sys.exit("some focused board pins are missing from data/pinterest_pins.csv")


if __name__ == "__main__":
    main()
