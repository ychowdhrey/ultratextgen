---
paths:
  - "scripts/**/*pinterest*"
  - "scripts/lib/r2_pinterest.py"
  - "data/*pinterest*"
  - "assets/pinterest/**"
  - "assets/collection-pins/**"
---

# Pinterest pins and boards

Read `docs/pinterest-pin-generation.md` ("Adding a new pin board") **first, every
time**. Also: `docs/pinterest-csv-format.md`, `docs/pinterest-r2-migration.md`,
`docs/pinterest-api-publishing.md`, `docs/collection-pins-design-logic.md`.

## Images never enter git

Since the R2 migration, every generator **renders in memory and uploads straight to
Cloudflare R2** via `scripts/lib/r2_pinterest.py` — the single source of truth for
the client and the object keys. `assets/pinterest/` and `assets/collection-pins/`
are gitignored. Never write a pin PNG there and never commit one.

**Never hardcode R2 credentials.** Read `R2_ENDPOINT`, `R2_ACCESS_KEY_ID` and
`R2_SECRET_ACCESS_KEY` from the environment (GitHub Secrets in CI) only.

## Two CSV schemas, and only one is importable

- `data/*_pinterest_pins.csv` — internal inventory. **Not importable.** Image-path
  columns hold R2 object keys.
- `data/*_pinterest_pins_upload.csv` — importer-ready, and the only ones to upload.
  `Media URL` points at the public media host.

Generate the upload CSV **only** via `scripts/pinterest_csv.py` /
`scripts/build_pinterest_upload.py` — the single source of truth for the schema.
Never hand-author one, and never upload a pin CSV in any other schema.

## A new board is a systematised thing

Mirror `scripts/generate-id-pins.py` and import the brand skin from
`scripts/generate-site-art.py`, which is the single source of truth for the pin/art
skin. Do not:

- put pins in a new top-level folder or under `docs/`,
- write a bespoke generator or visual template,
- bundle `.ttf` font files,
- invent a pin look — no Poppins, pills, saturated colors or green CTA. The skin is
  the off-white panel, dot grid, and purple→blue gradient.

Individual dated `updates/` entries are deliberately **excluded** from the pin
requirement; the `updates/` hub is not.
