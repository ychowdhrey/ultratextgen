# Italian Pinterest Board

A single Pinterest board of **how-to / use-case pins, in Italian**, all
driving to **https://ultratextgen.com/it/**. Every pin shows a different way to use the generator to
*stand out* — the literal styled Unicode a searcher in Italy wants to
see (cursive, gothic, bold, small caps, symbols…). The Zalgo pin points to the
`it` zalgo use-case page.

- **Board name:** `Scritte Aesthetic & Testo Stilizzato da Copiare ✨`
- **Destination:** `https://ultratextgen.com/it/` (the it homepage); the Zalgo pin links to
  `https://ultratextgen.com/it/usecase/zalgo-text/`. All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=it_howto_pins`.
- **Generator:** [`scripts/generate-it-pins.py`](../scripts/generate-it-pins.py)
  — a thin wrapper over the shared
  [`scripts/_locale_pin_kit.py`](../scripts/_locale_pin_kit.py) renderer, so the
  pins are visually identical to the `/es/` and `/id/` boards.
- **Images:** `assets/pinterest/it/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/it_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/it_pinterest_pins_upload.csv`](../data/it_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Scritte Aesthetic & Testo Stilizzato da Copiare ✨` first.

This mirrors the Spanish board (`docs/es-pinterest-board.md`) for the
Italy market.

---

## Why this board

This board gives the recently-deepened `it` page a visual, copy-paste-friendly
Pinterest surface. Pinterest is a search engine, so each pin is **named after the
native searched phrase** and the hero **demonstrates the styled text** rather than
an abstract motif — same logic as the `/es/` and `/id/` boards.

The topic list tracks the page's primary intent — « scritte aesthetic » / « testo stilizzato » / « simboli copia e incolla » — reinforced in
`feat: deepen /it/ for scritte/scritta stilizzata aesthetic and simboli copia e incolla`. Scritte aesthetic and simboli copia e incolla lead, matching the page.

## Pins (14)

Each pin's hero card shows the literal styled Unicode for its topic. Full titles,
descriptions and keywords live in `data/it_pinterest_pins.csv`.

## Regenerate

```bash
pip install cairosvg                       # + a Mathematical-Alphanumeric font
sudo apt-get install -y fonts-symbola      # so cairosvg rasterizes 𝓼𝓬𝓻𝓲𝓹𝓽 etc.
python3 scripts/generate-it-pins.py     # images + inventory + upload CSV
```

### Uploading before deploy

Media URLs default to the live site (`https://ultratextgen.com/...`), which only
resolves after this merges and the site redeploys. To upload **before** deploy,
point Media URL at the public branch mirror (Pinterest stores its own copy of each
image at import time, so a temporary URL is fine):

```bash
PIN_MEDIA_DOMAIN="https://raw.githubusercontent.com/ychowdhrey/ultratextgen/<branch>" \
  python3 scripts/build_pinterest_upload.py it
```

## Publishing cadence

1–2 pins/day (Pinterest rewards consistency).
