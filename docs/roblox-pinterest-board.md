# Roblox Pinterest Board

A single Pinterest board of **name-idea / how-to / copy-paste pins** for Roblox —
name generators, display-name ideas, an invisible-name trick, and a small
symbol/text-art set. Each pin is named after the searched phrase and drives to
the page that ranks for it.

- **Board name:** `Roblox Names, Display Names & Symbols`
- **Destinations (per pin):** name / display-name / generator pins →
  `https://ultratextgen.com/roblox/name-generator/`; the change-name explainer →
  `/answers/how-to-change-roblox-username/`; invisible-name →
  `/library/invisible-character/`; symbol & text-art pins →
  `/library/roblox-symbols/` and `/library/roblox-text-art/`. All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=roblox_pins&utm_content=<slug>`.
- **Generator:** [`scripts/generate-roblox-pins.py`](../scripts/generate-roblox-pins.py)
- **Images:** `assets/pinterest/roblox/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/roblox_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/roblox_pinterest_pins_upload.csv`](../data/roblox_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Roblox Names, Display Names & Symbols` first.

---

## Why this board (data behind it)

`/library/roblox-symbols/` already earns ~218 clicks / ~4.3K impressions (a top-5
page), but the Semrush export shows the **real** Roblox demand is about **names,
not symbols**:

| Cluster | Evidence (Semrush US) |
|---|---|
| Name ideas (cool / cute / funny / good) | ~33.7K |
| Display name (ideas / copy-paste) | ~26K |
| How to change name | ~14K → `/answers/how-to-change-roblox-username/` |
| Name generator | ~9.2K → `/roblox/name-generator/` |
| Invisible / blank name | ~2.1K → `/library/invisible-character/` |
| Symbols | ~1K → `/library/roblox-symbols/` |

So the board **leads with name/display-name/generator pins** and keeps only a
small (2–3 pin) symbol + text-art set — a deliberate correction from the first
draft, which over-indexed on the ~1K symbol intent. `roblox name colours` (~4.4K)
is the in-game RNG colour feature, **not** tool-servable, so it is excluded.

Pinterest is a search engine, so each pin is **named after the searched phrase**
and the hero is the **literal styled Unicode** people want (styled names, a blank
invisible character, symbol sets).

## Design

Same brand skin as the OG cards and other pins (imported from
`generate-site-art.py`): soft `#FBFBFE` panel, faint dot grid, purple→blue spine,
`UltraTextGen.com` wordmark, a styled-text demo card, and a `TAP TO COPY` cue.

### Rendering note

Pins render via **cairosvg** (no per-glyph fallback), so every styled sample is
fully covered by **Symbola**. The generator reuses the Symbola-safe style maps
from `generate-id-pins.py` and only Symbola-covered decorative symbols; a coverage
check against the Symbola cmap was run over every sample (the first text-art draft
used Oriya/Arabic/halfwidth glyphs that tofu'd and were swapped out). Requires:
`cairosvg`, `fonts-symbola`, `fonts-noto-core`.

## Posting cadence

12 pins → ~3 weeks at 3–4 fresh pins/week. Lead with `name-generator`,
`cool-names`, `display-name-ideas` and `how-to-change-name` (highest volume),
then the cute/funny/aesthetic set, then invisible-name, symbols and text-art. The
`Title` / `Description` / `Keywords` columns of the `_upload.csv` are ready to use.

## The 12 pins (slug — destination)

1. `name-generator` — Free Roblox Name Generator → `/roblox/name-generator/`
2. `cool-names` — Cool Roblox Name Ideas → `/roblox/name-generator/`
3. `cute-names` — Cute Roblox Name Ideas → `/roblox/name-generator/`
4. `funny-names` — Funny Roblox Name Ideas → `/roblox/name-generator/`
5. `display-name-ideas` — Roblox Display Name Ideas → `/roblox/name-generator/`
6. `aesthetic-names` — Aesthetic Roblox Display Names (Y2K & Soft) → `/roblox/name-generator/`
7. `how-to-change-name` — How to Change Your Roblox Name → `/answers/how-to-change-roblox-username/`
8. `invisible-name` — How to Get an Invisible Roblox Name → `/library/invisible-character/`
9. `display-names-copy-paste` — Roblox Display Names to Copy & Paste → `/library/roblox-symbols/`
10. `symbols-that-work` — Symbols That Work in Roblox Names → `/library/roblox-symbols/`
11. `display-name-symbols` — Symbols for Your Roblox Display Name → `/library/roblox-symbols/`
12. `text-art` — Roblox Text Art for Your Bio → `/library/roblox-text-art/`

## Regenerate

```bash
python3 scripts/generate-roblox-pins.py   # writes the PNGs, the inventory, AND
                                           # data/roblox_pinterest_pins_upload.csv
```

Idempotent. To add/edit a pin, append to `PINS` in the script (keep samples
within the Symbola-safe set) and re-run. To refresh only the upload CSV from the
existing inventory: `python3 scripts/build_pinterest_upload.py roblox`.
