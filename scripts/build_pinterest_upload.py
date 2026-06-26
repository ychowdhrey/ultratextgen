#!/usr/bin/env python3
"""
Turn each generator's internal *inventory* CSV into a Pinterest-importer-ready
`*_upload.csv` — the ONLY files you should upload to Pinterest's "Bulk create
Pins" tool.

Why a converter (and not just the generators):
  - The three pin generators (generate-pinterest.py, generate-collection-pins.py,
    generate-id-pins.py) write rich inventories with internal columns (boards,
    status, alt text, secondary boards, search volume). Those are useful to us
    but are NOT Pinterest's schema.
  - This step is decoupled from rendering, so it needs no Playwright/cairosvg and
    can refresh every upload CSV from the committed inventories in one command.
  - All schema/validation lives in scripts/pinterest_csv.py, so the upload format
    can never drift per-generator.

Media URL: built as <DOMAIN> + <inventory image path>. DOMAIN defaults to the
live site; override for a pre-deploy upload from a public branch mirror:
  PIN_MEDIA_DOMAIN="https://raw.githubusercontent.com/<owner>/<repo>/<branch>" \
    python3 scripts/build_pinterest_upload.py

Note: Pinterest's bulk CSV has a single "Pinterest board" column, so each pin is
filed to its PRIMARY board here. Secondary boards (in the inventory) are a manual
re-pin on Pinterest.

Run:  python3 scripts/build_pinterest_upload.py            # all sources
      python3 scripts/build_pinterest_upload.py id page    # a subset
"""
import csv
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

_spec = importlib.util.spec_from_file_location(
    "pinterest_csv", os.path.join(HERE, "pinterest_csv.py"))
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

DOMAIN = os.environ.get("PIN_MEDIA_DOMAIN", "https://ultratextgen.com")

# Each source maps an inventory CSV's columns onto the normalized fields that
# pinterest_csv.upload_row() expects. `include` (optional) filters rows.
SOURCES = {
    "page": dict(
        inventory="pinterest_pins.csv",
        out="pinterest_pins_upload.csv",
        title="pin_title", image="pinterest_image_path",
        board="pinterest_board_primary", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords",
        include=lambda r: (r.get("include_in_pinterest") or "").strip().lower() == "yes"),
    "collection": dict(
        inventory="collection_pins.csv",
        out="collection_pins_upload.csv",
        title="pin_title", image="pin_image_path",
        board="board_primary", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords"),
    "id": dict(
        inventory="id_pinterest_pins.csv",
        out="id_pinterest_pins_upload.csv",
        title="pin_title", image="image_path",
        board="board", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords"),
    "vertical_text": dict(
        inventory="vertical_text_pinterest_pins.csv",
        out="vertical_text_pinterest_pins_upload.csv",
        title="pin_title", image="image_path",
        board="board", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords"),
    "es": dict(
        inventory="es_pinterest_pins.csv",
        out="es_pinterest_pins_upload.csv",
        title="pin_title", image="image_path",
        board="board", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords"),
    "discord": dict(
        inventory="discord_pinterest_pins.csv",
        out="discord_pinterest_pins_upload.csv",
        title="pin_title", image="image_path",
        board="board", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords"),
    "roblox": dict(
        inventory="roblox_pinterest_pins.csv",
        out="roblox_pinterest_pins_upload.csv",
        title="pin_title", image="image_path",
        board="board", description="pin_description",
        link="utm_destination_url", keywords="pin_keywords"),
}


def convert(key, domain=DOMAIN):
    s = SOURCES[key]
    inv = os.path.join(DATA, s["inventory"])
    if not os.path.exists(inv):
        print(f"  [{key}] skip — no inventory at data/{s['inventory']}")
        return None
    include = s.get("include", lambda r: True)
    rows = []
    with open(inv, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if not include(r):
                continue
            img = (r.get(s["image"]) or "").strip()
            if not img:
                continue
            rows.append(P.upload_row(
                r.get(s["title"], ""),
                P.public_media_url(domain, img),
                r.get(s["board"], ""),
                description=r.get(s["description"], ""),
                link=r.get(s["link"]) or r.get("destination_url", ""),
                keywords=r.get(s["keywords"], "")))
    out = os.path.join(DATA, s["out"])
    P.write_upload_csv(out, rows)
    print(f"  [{key}] {len(rows):3} pins  data/{s['inventory']} -> data/{s['out']}")
    return out


def main():
    keys = [a for a in sys.argv[1:] if not a.startswith("-")] or list(SOURCES)
    bad = [k for k in keys if k not in SOURCES]
    if bad:
        sys.exit(f"unknown source(s): {', '.join(bad)} (choose from {list(SOURCES)})")
    print(f"building Pinterest upload CSVs (media domain: {DOMAIN})")
    for k in keys:
        convert(k)


if __name__ == "__main__":
    main()
