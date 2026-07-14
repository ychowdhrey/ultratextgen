#!/usr/bin/env python3
"""
Split an importer-ready Pinterest upload CSV into <=200-row parts.

Pinterest's bulk "Create Pins" importer is unreliable above ~200 rows in a
single import (the pre-existing `pinterest_upload_top200.csv` batch in this
repo's history is that same limit in practice). Only `pinterest_pins_upload.csv`
(the core 12-board set, 342 rows) exceeds it; every other board's upload CSV in
data/ is already under the cap and should be left as-is.

Re-validates each row through pinterest_csv.upload_row() before writing, so a
split can never silently drift from the importer schema. Row order (and each
row's own "Pinterest board" column) is preserved, so a mixed-board source file
still routes correctly on import.

Run:  python3 scripts/split_pinterest_upload.py data/pinterest_pins_upload.csv
      python3 scripts/split_pinterest_upload.py data/pinterest_pins_upload.csv --chunk-size 200
"""
import argparse
import csv
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))

_spec = importlib.util.spec_from_file_location(
    "pinterest_csv", os.path.join(HERE, "pinterest_csv.py"))
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--chunk-size", type=int, default=200)
    args = ap.parse_args()

    with open(args.path, encoding="utf-8-sig", newline="") as f:
        rows = [
            P.upload_row(
                r["Title"], r["Media URL"], r["Pinterest board"],
                description=r["Description"], link=r["Link"],
                keywords=r["Keywords"], thumbnail=r["Thumbnail"],
                publish_date=r["Publish date"],
            )
            for r in csv.DictReader(f)
        ]

    base, ext = os.path.splitext(args.path)
    n_parts = 0
    for i in range(0, len(rows), args.chunk_size):
        n_parts += 1
        chunk = rows[i:i + args.chunk_size]
        out = f"{base}_part{n_parts}{ext}"
        P.write_upload_csv(out, chunk)
        print(f"{out}: {len(chunk)} rows")

    print(f"Total: {len(rows)} rows -> {n_parts} file(s)")


if __name__ == "__main__":
    main()
