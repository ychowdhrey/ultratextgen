# Pinterest Bulk-Upload CSV — Format & Pipeline (read before touching pin CSVs)

Uploading a pin CSV to Pinterest's **Bulk create Pins** tool has failed twice for
the same two reasons:

1. **Wrong headers.** The importer needs its *exact* header row. Our generators'
   internal inventories use columns like `pin_title` / `pinterest_image_path`,
   which the importer rejects ("Missing header column / Missing video title").
2. **Non-public Media URL.** The importer fetches each image over the web. A repo
   path (`assets/pinterest/id/x.png`) is not fetchable, so the import fails.

This doc + the code below make that mistake structurally hard to repeat.

## The two kinds of CSV

| File | Audience | Schema | Upload it? |
|---|---|---|---|
| `data/<name>.csv` (e.g. `pinterest_pins.csv`, `collection_pins.csv`, `id_pinterest_pins.csv`) | **internal inventory** — boards, status, alt text, search volume | rich, generator-specific | ❌ never |
| `data/<name>_upload.csv` | **Pinterest importer** | exact Pinterest schema | ✅ this one |

## The exact schema (owned by `scripts/pinterest_csv.py`)

Header row, order preserved:

```
Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords
```

- **Title** — required, ≤ 100 chars.
- **Media URL** — required, **public** `http(s)` link to the image file, ending in
  `.png/.jpg/.jpeg/.webp/.mp4`. Built as `DOMAIN + inventory image path`.
- **Pinterest board** — required, must match an **existing** board name in the
  account (create the board first). Bulk CSV has one board column, so pins are
  filed to their *primary* board; secondary boards are a manual re-pin.
- **Thumbnail** — video pins only (blank for image pins).
- **Description** — ≤ 500 chars.
- **Link** — destination URL (with UTM).
- **Publish date** — blank = publish on upload; else `YYYY-MM-DD` or ISO 8601.
- **Keywords** — comma-separated string.

File is written as **UTF-8 with BOM** so styled-Unicode survives spreadsheet apps.

`pinterest_csv.upload_row()` validates every one of these rules and raises at build
time, so a bad pin can't reach a shipped CSV. Ref: Pinterest Help — *Bulk upload
Pins*.

## Pipeline

```
generator                       inventory CSV              upload CSV (UPLOAD THIS)
-------------------------------  -------------------------  ------------------------------
generate-pinterest.py        →  data/pinterest_pins.csv    data/pinterest_pins_upload.csv
generate-collection-pins.py  →  data/collection_pins.csv   data/collection_pins_upload.csv
generate-id-pins.py          →  data/id_pinterest_pins.csv data/id_pinterest_pins_upload.csv
```

Each generator calls `scripts/build_pinterest_upload.py` at the end of its run, so
the `*_upload.csv` is always regenerated alongside the inventory. You can also
refresh every upload CSV from the committed inventories **without re-rendering**
(no Playwright/cairosvg needed):

```bash
python3 scripts/build_pinterest_upload.py            # all sources
python3 scripts/build_pinterest_upload.py id page    # a subset
```

### Pre-deploy uploads

Media URLs default to the live site (`https://ultratextgen.com/...`), which only
resolves after the branch merges and the static site redeploys. To upload **before**
deploy, point Media URL at the public branch mirror (Pinterest stores its own copy
of each image at import time, so a temporary URL is fine):

```bash
PIN_MEDIA_DOMAIN="https://raw.githubusercontent.com/ychowdhrey/ultratextgen/<branch>" \
  python3 scripts/build_pinterest_upload.py
```

## Adding a new pin generator

1. Write a rich inventory CSV as you like (must include: a title, a repo-relative
   image path, a primary board name, description, link, keywords).
2. Add a mapping entry to `SOURCES` in `scripts/build_pinterest_upload.py`.
3. Call `convert("<your-key>")` at the end of your generator's `main()`.
4. **Never** write the upload CSV by hand — always go through
   `scripts/pinterest_csv.py`.
