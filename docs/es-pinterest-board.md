# Spanish "Cómo Usar" Pinterest Board

A single Pinterest board of **how-to / use-case pins, in Spanish**, all driving to
**https://ultratextgen.com/es/**. Every pin shows a different way to use the
generator to *stand out* — the literal "letras bonitas" output a searcher wants to
see (cursiva, gótica, doble, versalitas, símbolos…).

- **Board name:** `Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas`
- **Destination (all pins):** `https://ultratextgen.com/es/` — the Spanish page.
  All links carry `utm_source=pinterest&utm_medium=social&utm_campaign=es_howto_pins`.
- **Generator:** [`scripts/generate-es-pins.py`](../scripts/generate-es-pins.py)
- **Images:** `assets/pinterest/es/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/es_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/es_pinterest_pins_upload.csv`](../data/es_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas` first.

This mirrors the Indonesian board (`docs/id-pinterest-board.md`) for the Spanish
market.

---

## Why this board (data behind it)

Two inputs drove the topic list and priority:

- **Semrush** `letras bonitas` broad-match export (Mexico) — head + long-tail
  volumes.
- **Google Search Console** for `/es/` (last 6 months): ~108 clicks / ~1,438
  impressions, avg position ~5.9, **89% mobile**, top market **Mexico** (then
  Chile, Colombia, US-Hispanic, Dominican Rep.) → neutral LatAm Spanish,
  mobile-legible pins.

| Cluster | Evidence (MX volume / signal) |
|---|---|
| `letras bonitas para copiar y pegar` (core) | 49,500 |
| `conversor de letras bonitas` | 27,100 |
| `tipos de letras bonitas` / `fuentes` | 8,100 / 2,900 |
| `abecedario letras bonitas` | 12,100 (bridge: "cópialas, no las dibujes") |
| Instagram / WhatsApp / Facebook | 5,400 / 1,900 / 1,300 |
| `letra cursiva bonita`, mayúsculas, góticas | 2,400 / 590 / — |
| Free Fire / TikTok / X nicks | 720 / cluster |
| `letras bonitas y símbolos` (top GSC query) | pos. 5 in Google |
| Títulos / Word | 1,900 / GSC pos. 9 |
| Seasonal: cumpleaños, navidad, año nuevo | 2,900 / 1,600 / seasonal |
| Phrases & names: te amo, frases, Ángel, Dulce | 390 / 260 / 480 / 260 |

**Deliberately excluded:** the handwriting/printing cluster (`moldes`,
`para imprimir`, `en libreta`, `a mano`) — high volume, but the digital generator
can't serve it and that traffic bounces. The `abecedario` and `cómo hacer` pins
*bridge* that intent ("no las dibujes, cópialas").

## Pins (30)

20 core how-to pins + 10 long-tail (seasonal / phrases / names). Each pin's hero
card shows the literal styled Unicode for its topic. Full titles, descriptions and
keywords live in `data/es_pinterest_pins.csv`.

## Regenerate

```bash
pip install cairosvg                       # + a Mathematical-Alphanumeric font
sudo apt-get install -y fonts-symbola      # so cairosvg rasterizes 𝓼𝓬𝓻𝓲𝓹𝓽 etc.
python3 scripts/generate-es-pins.py        # images + inventory + upload CSV
```

### Uploading before deploy

Media URLs default to the live site (`https://ultratextgen.com/...`), which only
resolves after this merges and the site redeploys. To upload **before** deploy,
point Media URL at the public branch mirror (Pinterest stores its own copy of each
image at import time, so a temporary URL is fine):

```bash
PIN_MEDIA_DOMAIN="https://raw.githubusercontent.com/ychowdhrey/ultratextgen/<branch>" \
  python3 scripts/build_pinterest_upload.py es
```

## Publishing cadence

1–2 pins/day (Pinterest rewards consistency). Schedule the seasonal pins
(`feliz-cumpleanos`, `feliz-navidad`, `ano-nuevo`) ~3–4 weeks before the date via
the `Publish date` column.
