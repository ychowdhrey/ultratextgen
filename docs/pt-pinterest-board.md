# Portuguese (pt-BR) Pinterest Board

A single Pinterest board of **how-to / use-case pins, in Portuguese (pt-BR)**, all
driving to **https://ultratextgen.com/pt/**. Every pin shows a different way to use the generator to
*stand out* — the literal styled Unicode a searcher in Brazil wants to
see (cursive, gothic, bold, small caps, symbols…). The Zalgo pin points to the
`pt` zalgo use-case page.

- **Board name:** `Letras Diferentes e Fontes para Copiar e Colar ✨`
- **Destination:** `https://ultratextgen.com/pt/` (the pt homepage); the Zalgo pin links to
  `https://ultratextgen.com/pt/usecase/zalgo-text/`. All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=pt_howto_pins`.
- **Generator:** [`scripts/generate-pt-pins.py`](../scripts/generate-pt-pins.py)
  — a thin wrapper over the shared
  [`scripts/_locale_pin_kit.py`](../scripts/_locale_pin_kit.py) renderer, so the
  pins are visually identical to the `/es/` and `/id/` boards.
- **Images:** `assets/pinterest/pt/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/pt_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/pt_pinterest_pins_upload.csv`](../data/pt_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Letras Diferentes e Fontes para Copiar e Colar ✨` first.

This mirrors the Spanish board (`docs/es-pinterest-board.md`) for the
Brazil market.

---

## Why this board

This board gives the recently-deepened `pt` page a visual, copy-paste-friendly
Pinterest surface. Pinterest is a search engine, so each pin is **named after the
native searched phrase** and the hero **demonstrates the styled text** rather than
an abstract motif — same logic as the `/es/` and `/id/` boards.

The topic list tracks the page's primary intent — "letras diferentes para copiar e colar" / "fontes" — reinforced in
`feat: deepen /pt/ page to win Brazilian "fontes" search intent`. Free Fire and y2k pins reflect the Brazilian audience and the page copy.

## Pins (16)

Each pin's hero card shows the literal styled Unicode for its topic. Full titles,
descriptions and keywords live in `data/pt_pinterest_pins.csv`.

## Regenerate

```bash
pip install cairosvg                       # + a Mathematical-Alphanumeric font
sudo apt-get install -y fonts-symbola      # so cairosvg rasterizes 𝓼𝓬𝓻𝓲𝓹𝓽 etc.
python3 scripts/generate-pt-pins.py     # images + inventory + upload CSV
```

### Uploading before deploy

Media URLs default to the live site (`https://ultratextgen.com/...`), which only
resolves after this merges and the site redeploys. To upload **before** deploy,
point Media URL at the public branch mirror (Pinterest stores its own copy of each
image at import time, so a temporary URL is fine):

```bash
PIN_MEDIA_DOMAIN="https://raw.githubusercontent.com/ychowdhrey/ultratextgen/<branch>" \
  python3 scripts/build_pinterest_upload.py pt
```

## Publishing cadence

1–2 pins/day (Pinterest rewards consistency).
