# Pinterest Image Architecture — Cloudflare R2 Migration

Pinterest pin images (`assets/pinterest/`, `assets/collection-pins/`) used to
be generated and committed straight into git. That stopped scaling: PR #648
alone added 12,429 variant images and pushed the repo to 23,224 tracked
files — over Cloudflare Pages' 20,000-file-per-deployment limit — and had to
be worked around with a `.assetsignore` exclusion that still left the
binaries committed (3.6 GB, 15,376 files, 65% of the repo's tracked files).

**New architecture:** every Pinterest generator renders its pin **in memory**
and uploads it straight to **Cloudflare R2**. Nothing is written under
`assets/pinterest/` or `assets/collection-pins/`, and nothing image-shaped is
committed to git going forward.

```
Generate pin (SVG -> PNG, in memory)
  -> upload to Cloudflare R2 (bucket: ultratextgen-media)
  -> inventory CSV stores the R2 object key
  -> *_upload.csv (Pinterest importer) stores the public R2 URL
```

## Configuration — environment variables only

Never hardcode credentials. Every generator, plus the migration and
validation utilities, read:

| Variable | Required | Default |
|---|---|---|
| `R2_ENDPOINT` | yes | — (e.g. `https://<account_id>.r2.cloudflarestorage.com`) |
| `R2_ACCESS_KEY_ID` | yes | — |
| `R2_SECRET_ACCESS_KEY` | yes | — |
| `R2_BUCKET` | no | `ultratextgen-media` |
| `R2_PUBLIC_BASE_URL` | no | `https://media.ultratextgen.com` |

For CI (GitHub Actions) or any automated run, set these as **repository/organization
secrets**, never in a workflow file or committed script. Locally, export them
in your shell — never write them into a file inside the repo.

Single source of truth: `scripts/lib/r2_pinterest.py` — every generator and
utility below imports it. Nothing else in this repo should construct a
boto3 S3 client or a Pinterest media URL by hand.

## Object key convention

Filenames are preserved 1:1 so an existing image maps cleanly:

```
pinterest/base/<slug>.png                  scripts/generate-pinterest.py           (2,411)
pinterest/variants/<slug>--vN.png          scripts/generate-pinterest-variants.py  (12,429)
pinterest/boards/<board>/<slug>.png        the ~15 dedicated board generators      (372)
pinterest/collection/<slug>.png            scripts/generate-collection-pins.py     (164)
```

Public URL = `R2_PUBLIC_BASE_URL` + `/` + object key, e.g.
`https://media.ultratextgen.com/pinterest/base/bold-fonts.png`.

## What changed, file by file

- **`scripts/lib/r2_pinterest.py`** (new) — the boto3 client, `upload_bytes()`
  / `upload_file()` (with skip-if-identical dedup via MD5-vs-ETag), `public_url()`,
  and `render_and_upload()` (SVG string -> PNG bytes -> R2, no disk I/O at all).
- **`scripts/generate-pinterest.py`**, **`generate-pinterest-variants.py`**,
  **`_locale_pin_kit.py`** (covers all 15 `de/fr/it/nl/pl/pt/tr/vi` + French
  topic-board generators), and the 7 standalone board generators
  (`discord`, `es`, `gaming-names`, `id`, `nama-ff-keren`, `roblox`,
  `vertical-text`) plus `fr-clavier`/`fr-zodiaque` (which bypass the shared
  kit) — all now call `R2.render_and_upload(svg, r2_key, w, h)` instead of
  `cairosvg.svg2png(write_to=...)`, and write the R2 key (not a repo path)
  into their inventory CSV's image-path column.
- **`scripts/generate-collection-pins.py`** — the one Playwright-based
  generator (screenshots real rendered HTML via headless Chromium, not
  cairosvg). `page.locator(".pin").screenshot()` now returns bytes directly
  (no `path=`), resized in memory with Pillow into a `BytesIO` buffer, then
  uploaded — no temp files.
- **`scripts/build_pinterest_upload.py`** — `DOMAIN` now defaults to
  `R2_PUBLIC_BASE_URL` (`https://media.ultratextgen.com`) instead of the site
  domain, since inventory image paths are now R2 keys, not repo paths. Also
  registered `discord`/`roblox` in `SOURCES` — both called
  `build_pinterest_upload.py convert(...)` from their own generator already,
  but neither was actually wired into the shared registry, so their
  `*_upload.csv` was never being regenerated. Fixed as part of this change.
- **`scripts/check-image-assets.py`** — the per-page Pinterest-pin check
  (part of `validate.yml`'s **blocking** CI gate on this branch) used to
  `os.path.exists()` a local file; it now looks the page's slug up in
  `data/pinterest_pins.csv` instead, since the file no longer exists on disk
  by design.
- **`.gitignore`** — `assets/pinterest/` and `assets/collection-pins/` are
  now ignored; nothing generated there is meant to be committed again.
  `.assetsignore`'s now-obsolete Pinterest-variant exclusion was removed in
  the same change (the directory it referenced no longer holds tracked files).

## Migrating the images that were already committed

This repo already had 15,376 Pinterest pin binaries (3.6 GB) committed before
this change — PR #648's 12,429 variants plus the pre-existing 2,411 base pins,
372 board pins and 164 collection pins. `scripts/migrate_pinterest_to_r2.py`
uploads all of them to R2 using the exact same key mapping the generators use
now, so a migrated file and a freshly-regenerated one land at the identical
key.

```sh
python3 scripts/migrate_pinterest_to_r2.py --dry-run          # report only
python3 scripts/migrate_pinterest_to_r2.py                    # real upload
python3 scripts/migrate_pinterest_to_r2.py --only variants    # one category
```

It's idempotent (MD5-vs-ETag skip-if-identical) and safe to re-run after a
partial/interrupted run. It **never deletes** anything local — see
"Validation before deletion" below. Each run writes a per-file CSV report
(`--report`, default `docs/pinterest-r2-migration-report.csv`) with the repo
path, R2 key, public URL, size, and upload status for every file.

The CSVs' image-path columns needed a one-time rewrite too (old rows still
held `assets/pinterest/...` disk paths): `scripts/rewrite_pinterest_inventory_paths.py`
rewrites every inventory CSV's image-path column to the matching R2 key using
the identical mapping, then rebuilds every `*_upload.csv`. This touches
**only** the image-path column — never image bytes, copy, or any other field.

## Validation before deletion

`scripts/validate_pinterest_r2_migration.py` runs the full check list before
any local binary is removed:

1. every migrated file exists in R2
2. file counts match, per category
3. file sizes/MD5 checksums match (local file vs. R2 ETag)
4. a sample of public URLs fetch with HTTP 200 and the right size
5. every inventory/upload CSV points at R2, not a repo path
6. existing base pins still work
7. PR #648's 12,429 variant pins still work
8. every image is exactly 1000×1500
9. no duplicate R2 object keys were introduced
10. re-running the migration is idempotent (checksum proof + a live `--dry-run`)

```sh
python3 scripts/validate_pinterest_r2_migration.py
```

Writes `docs/pinterest-r2-migration-validation.md` and exits non-zero if any
check fails. **Only once this passes in full** do the local binaries get
removed from git (`git rm -r --cached` equivalent working-tree removal, plus
the `.gitignore` entries above) — this repo's git history is **not**
rewritten as part of this change; that's a separate, later decision.

## Regenerating pins after this change

Nothing about running a generator changed from the operator's point of view
— `python3 scripts/generate-pinterest.py`, `generate-<board>-pins.py`, etc.
still work exactly the same way. The only difference is where the image
ends up (R2, not `assets/pinterest/`) and what `pip install` needs to
succeed first: `cairosvg` (or `playwright` for the collection generator) as
before, **plus `boto3`**, and the R2 environment variables above must be set.
