#!/usr/bin/env python3
"""
One-time companion to scripts/migrate_pinterest_to_r2.py.

The generator scripts were updated to write R2 object keys into their
inventory CSVs going forward (see docs/pinterest-r2-migration.md), but the
CSVs already committed before that change still hold the old repo-relative
disk paths ("assets/pinterest/..."). This rewrites ONLY the image-path
column of each inventory CSV to the equivalent R2 object key -- using the
exact same mapping scripts/migrate_pinterest_to_r2.py used to upload the
actual binaries, so a row's path and the real uploaded object always agree
-- then rebuilds every *_upload.csv via scripts/build_pinterest_upload.py so
Media URL reflects R2 too.

Never touches image bytes, board/title/description copy, or any other
column.

Run:  python3 scripts/rewrite_pinterest_inventory_paths.py [--dry-run]
"""
import argparse
import csv
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


BU = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")

# (inventory csv filename, image-path column, old-path prefix, new R2 prefix,
#  build_pinterest_upload.py SOURCES key to rebuild afterwards)
_BOARD_LOCALES = ("de", "fr", "it", "nl", "pl", "pt", "tr", "vi",
                   "fr_gaming", "fr_clavier", "fr_imprimables", "fr_tatouage",
                   "fr_esthetique", "fr_kaomoji", "fr_zodiaque",
                   "fr_style_reseau", "fr_outils")

SOURCES = [
    ("pinterest_pins.csv", "pinterest_image_path",
     "assets/pinterest/", "pinterest/base/", "page"),
    ("pinterest_pins_variants.csv", "pinterest_image_path",
     "assets/pinterest/", "pinterest/variants/", "variants"),
    ("collection_pins.csv", "pin_image_path",
     "assets/collection-pins/", "pinterest/collection/", "collection"),
    ("id_pinterest_pins.csv", "image_path",
     "assets/pinterest/id/", "pinterest/boards/id/", "id"),
    ("es_pinterest_pins.csv", "image_path",
     "assets/pinterest/es/", "pinterest/boards/es/", "es"),
    ("discord_pinterest_pins.csv", "image_path",
     "assets/pinterest/discord/", "pinterest/boards/discord/", "discord"),
    ("roblox_pinterest_pins.csv", "image_path",
     "assets/pinterest/roblox/", "pinterest/boards/roblox/", "roblox"),
    ("vertical_text_pinterest_pins.csv", "image_path",
     "assets/pinterest/vertical-text/", "pinterest/boards/vertical-text/",
     "vertical_text"),
    ("gaming_names_pinterest_pins.csv", "image_path",
     "assets/pinterest/gaming-names/", "pinterest/boards/gaming-names/",
     "gaming_names"),
    ("nama_ff_keren_pinterest_pins.csv", "image_path",
     "assets/pinterest/nama-ff-keren/", "pinterest/boards/nama-ff-keren/",
     "nama_ff_keren"),
    *[(f"{loc}_pinterest_pins.csv", "image_path",
       f"assets/pinterest/{loc}/", f"pinterest/boards/{loc}/", loc)
      for loc in _BOARD_LOCALES],
]


def rewrite_one(fname, column, old_prefix, new_prefix, upload_key, dry_run):
    path = os.path.join(DATA, fname)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    changed = 0
    unexpected = []
    for row in rows:
        val = (row.get(column) or "").strip()
        if not val:
            continue
        if val.startswith(old_prefix):
            row[column] = new_prefix + val[len(old_prefix):]
            changed += 1
        elif not val.startswith("pinterest/"):
            unexpected.append(val)

    if changed and not dry_run:
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(rows)

    return {"file": fname, "rows": len(rows), "changed": changed,
            "unexpected": unexpected, "upload_key": upload_key}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    results = []
    for fname, column, old_prefix, new_prefix, upload_key in SOURCES:
        r = rewrite_one(fname, column, old_prefix, new_prefix, upload_key, args.dry_run)
        if r is None:
            print(f"  [skip] data/{fname} not found")
            continue
        results.append(r)
        flag = "  <-- unexpected path shape" if r["unexpected"] else ""
        print(f"  {fname:38} {r['changed']:6}/{r['rows']:6} rows rewritten{flag}")
        for u in r["unexpected"][:5]:
            print(f"      unexpected: {u!r}")

    total_changed = sum(r["changed"] for r in results)
    print(f"\n{total_changed} image-path cells rewritten across {len(results)} inventory CSVs"
          f"{'  [DRY RUN -- nothing written]' if args.dry_run else ''}")

    if args.dry_run:
        return

    print("\nrebuilding *_upload.csv for every touched source...")
    for r in results:
        if r["changed"]:
            BU.convert(r["upload_key"])


if __name__ == "__main__":
    main()
