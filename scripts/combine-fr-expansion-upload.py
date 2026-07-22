#!/usr/bin/env python3
"""
One-off combined Pinterest upload CSV for all 10 new French topic boards
(fr_gaming, fr_clavier, fr_imprimables, fr_tatouage, fr_esthetique,
fr_kaomoji, fr_zodiaque, fr_style_reseau, fr_outils) — a convenience
single-file view of every pin for a single bulk-import pass. A mixed-board
CSV is not a new pattern: the main data/pinterest_pins_upload.csv already
carries 12 distinct boards in one file (Pinterest's importer keys each row's
board off its own "Pinterest board" column).

This is a snapshot export, not a pipeline source: it is NOT registered in
build_pinterest_upload.py's SOURCES, so re-running the per-board generators
won't touch it and it won't be regenerated automatically. Re-run this script
by hand if any of the per-board upload CSVs change.

Run:  python3 scripts/combine-fr-expansion-upload.py
"""
import csv
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

spec = importlib.util.spec_from_file_location(
    "pinterest_csv", os.path.join(HERE, "pinterest_csv.py"))
PC = importlib.util.module_from_spec(spec)
spec.loader.exec_module(PC)

BOARDS = ["fr_gaming", "fr_clavier", "fr_imprimables", "fr_tatouage",
          "fr_esthetique", "fr_kaomoji", "fr_zodiaque", "fr_style_reseau",
          "fr_outils"]


def main():
    rows = []
    for b in BOARDS:
        path = os.path.join(DATA, f"{b}_pinterest_pins_upload.csv")
        with open(path, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                # re-validate through the same schema gate rather than
                # trusting the already-built file verbatim
                rows.append(PC.upload_row(
                    r["Title"], r["Media URL"], r["Pinterest board"],
                    description=r["Description"], link=r["Link"],
                    keywords=r["Keywords"], thumbnail=r["Thumbnail"],
                    publish_date=r["Publish date"]))

    out = os.path.join(DATA, "fr_expansion_pinterest_pins_upload.csv")
    n = PC.write_upload_csv(out, rows)
    print(f"combined {n} pins from {len(BOARDS)} boards -> "
          f"data/fr_expansion_pinterest_pins_upload.csv")


if __name__ == "__main__":
    main()
