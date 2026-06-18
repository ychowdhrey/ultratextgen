# Vertical Text Pinterest Board

A single Pinterest board of **how-to / use-case pins**, all about using **vertical
(stacked) text to stand out**. Every pin shows a different way to use the
generator — the angle the user asked for ("all the ways you can use the generator
to stand out… a HOW vertical text helps you stand out board").

- **Board name:** `Vertical Text Ideas That Stop the Scroll`
- **Destinations:** practical/tool/tattoo pins → `https://ultratextgen.com/usecase/vertical-text/`
  (the converting page); psychology/hook pins → `https://ultratextgen.com/guide/vertical-text-guide/`
  (authority). All links carry
  `utm_source=pinterest&utm_medium=social&utm_campaign=vertical_text_board&utm_content=<slug>`.
- **Generator:** [`scripts/generate-vertical-text-pins.py`](../scripts/generate-vertical-text-pins.py)
- **Images:** `assets/pinterest/vertical-text/<slug>.png` (1000×1500, 2:3)
- **Internal inventory:** `data/vertical_text_pinterest_pins.csv` (not for upload)
- **Upload this to Pinterest:** [`data/vertical_text_pinterest_pins_upload.csv`](../data/vertical_text_pinterest_pins_upload.csv)
  — the importer-ready CSV (exact schema, public image URLs). See
  [docs/pinterest-csv-format.md](./pinterest-csv-format.md). Create a board named
  exactly `Vertical Text Ideas That Stop the Scroll` first.

---

## Why this board (data behind it)

`/usecase/vertical-text/` already earns **753 clicks / 14,918 impressions** at avg
position **6.4** and **5.05% CTR** in the supplied Search Console export — it is
the conversion engine, so most pins point there and use the guide as the
supporting "why it works" link. Demand splits into three intents the pins are
built around:

| Cluster | Evidence (Search Console / Semrush US) |
|---|---|
| The tool | `vertical font generator` 260/mo; `vertical text generator` 170; `stacked text generator` 170; `stacked text` 170; `text stacker` |
| Copy-paste / aesthetic | `stacked text copy and paste`; `vertical text copy and paste`; `letters on top of each other`; `top to bottom text` |
| Placement | `how to stack words in instagram bio`; `stacked lines twitter bio unicode` (we rank ~#1.6); Discord; TikTok comments |
| **Tattoo (highest commercial value)** | `stacked letters tattoo generator` **140/mo, $0.85 CPC, 0.06 competition**; `vertical tattoo font generator` 40/mo |

Pinterest is a search engine, so each pin is **named after the use case / searched
phrase** and the hero **demonstrates stacked text** rather than showing an
abstract motif — the same logic as the existing collection and `/id/` boards.

## Design

Same brand skin as the OG cards and other pins: soft `#FBFBFE` panel, faint dot
grid, purple→blue spine, `ULTRATEXTGEN.COM` wordmark, a stacked-text demo card,
and a gradient CTA pill. Anatomy:

```
ULTRATEXTGEN.COM
[ EYEBROW / ANGLE ]          ← keyword zone, purple
Headline (1–2 lines)         ← keyword-led, the second line in gradient
[ soft demo card ]
   the stacked-text demo      ← the hero (stacked word, comment, stat, etc.)
   benefit / caption line
[ gradient CTA pill ]
ultratextgen.com/<destination>
```

### Rendering note

Pins render via **cairosvg** and use only standard Latin glyphs in a generic sans
stack (`Liberation Sans, DejaVu Sans, Arial`), so there is **no Symbola / Math
glyph dependency** — they rasterize cleanly with just `cairosvg` installed. Six
demo layouts are defined: stacked word, comment thread, reaction pack, stat,
checklist, before/after, tattoo, and 3-step.

## Posting cadence

18 pins → ~4–6 weeks at 3–4 fresh pins/week (Pinterest favors steady fresh pins
over bulk dumps). Lead with the bio and tattoo pins (highest-intent keywords),
then comments and copy-paste, then the psychology set. Make 3–5 colour/photo
variants of evergreen winners. The `Title` / `Description` / `Keywords` columns of
the `_upload.csv` are ready to use as-is.

## The 18 pins (by angle)

**Bios** — `bio-instagram`, `bio-x-twitter`, `username-aesthetic`
**Comments** — `comment-standout`, `discord-status`, `reaction-words`
**Hooks** — `caption-hook`, `hybrid-layout`, `before-after`
**Psychology** — `the-science`, `best-practices`, `speed-bump`
**Tattoo lettering** — `tattoo-lettering`, `tattoo-name`
**Copy-paste / how-to** — `how-to-3-steps`, `copy-paste`, `platforms`, `free-no-app`

## Regenerate

```bash
python3 scripts/generate-vertical-text-pins.py   # writes the PNGs, the inventory,
                                                 # AND the upload CSV
```

Idempotent. To add/edit a pin, append to `PINS` in the script and re-run. To
refresh only the upload CSV from the existing inventory:
`python3 scripts/build_pinterest_upload.py vertical_text`.
