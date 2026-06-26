# Gaming Names Pinterest Board

A single Pinterest board of **use-case pins** for the gaming-name JTBD — every
pin shows a different way to make a cool game name or nickname (Free Fire,
Mobile Legends, guild/squad, and a general stylish/cute nickname maker).

- **Board name:** `Gaming Symbols & Usernames` (the existing board on the
  UltraTextGen account, so these pins consolidate there rather than starting a
  new board).
- **Destinations:** each pin points to its matching JTBD page —
  `nama-ff-keren` / `nama-ff-keren-cowok` / `nama-ff-keren-cewek` /
  `simbol-keren-nama-game` → `https://ultratextgen.com/id/usecase/nama-ff-keren/`;
  `nama-guild-ff-keren` → `…/id/usecase/nama-guild-ff-keren/`;
  `nama-ml-keren` / `nama-ml-keren-girl` → `…/id/usecase/nama-ml-keren/`;
  `nickname-generator` → `…/usecase/nickname-generator/`. All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=gaming_names_pins&utm_content=<slug>`.
- **Generator:** [`scripts/generate-gaming-names-pins.py`](../scripts/generate-gaming-names-pins.py)
- **Images:** `assets/pinterest/gaming-names/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/gaming_names_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/gaming_names_pinterest_pins_upload.csv`](../data/gaming_names_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md).

---

## Why this board (data behind it)

Search Console shows the site already ranks ~position 5 in Indonesia for the
aesthetic-text cluster, while the SEMRush export reveals a huge, low-difficulty
adjacent universe with no dedicated page before now: **`nama ff keren` 301k/mo
(KD ~25)**, `nama ff keren cowok` 22k, `nama guild ff keren` 22k, plus the
English `nickname` 40.5k / `cute name generator` 33k cluster. The four new JTBD
pages target it; this board is the visual, copy-paste-friendly Pinterest surface
feeding them — Pinterest skews heavily toward exactly this Indonesian gaming
audience.

Pinterest is a search engine, so each pin is **named after the searched phrase**
(nama FF keren cowok/cewek, nama guild, nama ML girl) and the hero **demonstrates
the decorated name** rather than an abstract motif — same logic as the `/id/` and
vertical-text boards.

## Design

Same brand skin as the OG cards and other pins: soft `#FBFBFE` panel, faint dot
grid, purple→blue spine, kicker, keyword-led headline with gradient underline, a
hero card of styled-name rows, a benefit line, the CTA (`KETUK UNTUK SALIN` /
`TAP TO COPY`), and the `UltraTextGen.com` wordmark.

### Rendering note

Pins render via **cairosvg** and reuse the Unicode style transforms from
`generate-id-pins.py`, so they need a font covering the Mathematical Alphanumeric
block (`apt: fonts-symbola fonts-noto-core fonts-noto-extra`). The Javanese
payung `꧁꧂` and Tibetan `༒ ༺ ༻ ࿐` glyphs do **not** rasterize in those fonts, so
the pin images use raster-safe ornaments (`≪ ≫ ⊱ ⊰ ❰ ❱ ★ ♛ † ✦`) instead. The
literal payung frames still live on the HTML pages (rendered by the user's
browser font) and in the CSV `Title`/`Description` text.

## The 8 pins (by angle)

**Free Fire** — `nama-ff-keren`, `nama-ff-keren-cowok`, `nama-ff-keren-cewek`
**Guild / squad** — `nama-guild-ff-keren`
**Mobile Legends** — `nama-ml-keren`, `nama-ml-keren-girl`
**Symbols** — `simbol-keren-nama-game`
**General (English)** — `nickname-generator`

## Posting cadence

8 pins → ~2–3 weeks at 3–4 fresh pins/week (Pinterest favors steady fresh pins
over bulk dumps). Lead with `nama-ff-keren` and the cowok/cewek splits (highest
volume), then guild and ML, then the symbol and English nickname pins. Make
colour variants of evergreen winners. The `Title` / `Description` / `Keywords`
columns of the `_upload.csv` are ready to use as-is.

## Regenerate

```bash
python3 scripts/generate-gaming-names-pins.py   # writes the PNGs, the inventory,
                                                # AND the upload CSV
```

Idempotent. To add/edit a pin, append to `PINS` in the script and re-run. To
refresh only the upload CSV from the existing inventory:
`python3 scripts/build_pinterest_upload.py gaming_names`.
