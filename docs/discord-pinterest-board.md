# Discord Pinterest Board

A single Pinterest board of **how-to / copy-paste pins** about styling text on
Discord — fonts, display names, symbols and formatting. Each pin is named after
the phrase people search and drives to the page that actually ranks for it.

- **Board name:** `Discord Fonts, Symbols & Names`
- **Destinations (per pin):** font / name / generator pins → `https://ultratextgen.com/discord/`;
  explainer pins → the matching `/answers/` page; symbol pins →
  `https://ultratextgen.com/library/discord-symbols/`. All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=discord_pins&utm_content=<slug>`.
- **Generator:** [`scripts/generate-discord-pins.py`](../scripts/generate-discord-pins.py)
- **Images:** `assets/pinterest/discord/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/discord_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/discord_pinterest_pins_upload.csv`](../data/discord_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Discord Fonts, Symbols & Names` first.

---

## Why this board (data behind it)

`/discord/` already earns ~719 clicks / ~19.6K impressions in the supplied Search
Console export — it is the #2 page on the site — yet the Discord board had almost
no pins. Demand (Semrush US + Search Console) is dominated by one giant head term
plus a deep how-to tail:

| Cluster | Evidence (Semrush US / SC) |
|---|---|
| Fonts (head) | `discord fonts` 33.1K, `discord font` 18.1K, `fonts for discord` 12.1K, `font for discord` 6.6K (~70K combined) |
| How to change | `how to change font on discord` + variants ~6.5K |
| Name as a font | `discord name as a font` 1.6K; name-font cluster ~5.3K |
| Generator | `discord font generator` 5.4K |
| Bold / small / size | ~3.5K |
| Formatting / commands | `discord font commands` etc. ~2.4K |
| What font does Discord use | ~1.5K → `/answers/what-font-does-discord-use/` |
| Symbols | ~0.5K → `/library/discord-symbols/` |

> **"No Nitro" is a copy line, not a pin.** US search volume for `discord nitro
> font(s)` is ~40/mo, so the angle lives in the flagship pin's title/description
> rather than its own pin.

Pinterest is a search engine, so each pin is **named after the searched phrase**
and the hero is the **literal styled Unicode** (bold/script/fraktur of "discord",
a styled name, symbol sets) — the same logic as the `/id/` and vertical-text
boards.

## Design

Same brand skin as the OG cards and other pins (imported from
`generate-site-art.py`): soft `#FBFBFE` panel, faint dot grid, purple→blue spine,
`UltraTextGen.com` wordmark, a styled-text demo card, and a `TAP TO COPY` cue.

### Rendering note

Pins render via **cairosvg**, which has **no per-glyph fallback** — each styled
sample must be fully covered by **Symbola**. The generator reuses the exact
Symbola-safe style maps from `generate-id-pins.py` (Bold, Italic, Script,
Fraktur, Double-struck, Monospace, Circled, Small Caps) and only the
Symbola-covered decorative symbols. A coverage check against the Symbola cmap was
run over every sample. Requires: `cairosvg`, `fonts-symbola`, `fonts-noto-core`.

## Posting cadence

12 pins → ~3 weeks at 3–4 fresh pins/week. Lead with the head-term pins
(`fonts-copy-paste`, `name-as-a-font`, `font-generator`), then the how-to set,
then the explainer/symbol pins. The `Title` / `Description` / `Keywords` columns
of the `_upload.csv` are ready to use as-is.

## The 12 pins (slug — destination)

1. `fonts-copy-paste` — Discord Fonts Copy & Paste (No Nitro Needed) → `/discord/`
2. `name-as-a-font` — Turn Your Discord Name Into a Font → `/discord/`
3. `change-name-font` — How to Change Your Discord Name Font → `/discord/`
4. `font-generator` — Free Discord Font Generator → `/discord/`
5. `bold-small-text` — Bold, Italic & Small Text for Discord → `/discord/`
6. `text-formatting` — Discord Text Formatting & Font Commands → `/discord/`
7. `what-font-discord` — What Font Does Discord Use? → `/answers/what-font-does-discord-use/`
8. `display-name-styles` — Discord Display Name Styles → `/discord/`
9. `names-copy-paste` — Aesthetic Discord Names to Copy & Paste → `/discord/`
10. `symbols-for-names` — Discord Symbols for Usernames → `/library/discord-symbols/`
11. `allowed-characters` — Which Characters Work in Discord Names → `/answers/discord-allowed-characters/`
12. `server-channel-fonts` — Fonts for Discord Servers & Channels → `/discord/`

## Regenerate

```bash
python3 scripts/generate-discord-pins.py   # writes the PNGs, the inventory, AND
                                            # data/discord_pinterest_pins_upload.csv
```

Idempotent. To add/edit a pin, append to `PINS` in the script (keep samples
within the Symbola-safe set) and re-run. To refresh only the upload CSV from the
existing inventory: `python3 scripts/build_pinterest_upload.py discord`.
