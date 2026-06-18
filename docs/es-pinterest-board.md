# Spanish (/es/) Pinterest Board

A single Pinterest board of **how-to / keyword pins** for the Spanish market, all
about **letras bonitas para copiar y pegar**. Every pin demonstrates a different
way to use the generator and drives to `https://ultratextgen.com/es/`.

- **Board name:** `Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas`
- **Destination:** all pins → `https://ultratextgen.com/es/`, most pre-filling
  `?q=<sample>` so the pin lands on a live demonstration. Links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=organic_pins&utm_content=<slug>`.
- **Generator:** [`scripts/generate-es-pins.py`](../scripts/generate-es-pins.py)
- **Images:** `assets/pinterest/es/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/es_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/es_pinterest_pins_upload.csv`](../data/es_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas` first.

---

## Why this board (data behind it)

Topics and priorities are derived from the Semrush "letras bonitas" MX keyword
export and Google Search Console data for `/es/` (mobile-first, LatAm Spanish,
digital copy-paste intent; handwriting intent excluded to avoid bounce). The 30
pins cover the head terms plus seasonal and name long-tails:

| Cluster | Example pins (search volume) |
|---|---|
| Head / tool | `letras bonitas para copiar y pegar` (49.5K), `conversor de letras` (27.1K), `abecedario letras bonitas` (12.1K), `tipos de letras` (8.1K) |
| Platform | Instagram (5.4K), WhatsApp (1.9K), Facebook (1.3K), TikTok/X, Free Fire (720) |
| Style | cursiva (2.4K), góticas, aesthetic, mayúsculas (590), tachado/subrayado |
| Seasonal & names (long-tail) | feliz cumpleaños (2.9K), feliz navidad (1.6K), año nuevo, te amo, nombre Ángel/Dulce, frases bonitas |

Pinterest is a search engine, so each pin is **named after the searched phrase**
and the hero is the brand motif/specimen — the same logic as the `/id/` and
vertical-text boards.

---

## How the pins are built (on the system)

This board uses the repo's shared Pinterest pipeline — no bespoke template, no
bundled fonts, no top-level folder. `scripts/generate-es-pins.py` renders every
pin through `scripts/generate-pinterest.py`'s `pin_svg()` with the shared design
tokens and motifs from `scripts/generate-site-art.py`, so the pins are visually
identical to the rest of `assets/pinterest/` (soft off-white panel, faint dot
grid, purple→blue gradient, left accent bar, keyword title + underline, focal
motif card, `UltraTextGen.com` wordmark) — just with Spanish keyword titles.

```bash
python3 scripts/generate-es-pins.py   # renders 30 PNGs + inventory + upload CSV
```

Requires `cairosvg` (libcairo + Liberation Sans are already on the box). The run
writes the inventory `data/es_pinterest_pins.csv` and derives
`data/es_pinterest_pins_upload.csv` via `scripts/build_pinterest_upload.py`
(source key `es`) — see [docs/pinterest-pin-generation.md](./pinterest-pin-generation.md)
for the board conventions and [docs/pinterest-csv-format.md](./pinterest-csv-format.md)
for the upload schema.

> **History:** this board originally shipped as a stray top-level `pinterest-kit/`
> with its own generator and a hand-named CSV. It was migrated onto the shared
> system (this layout) so future regenerations don't drift off-brand or off-spec.
