# Collection Pins — Social/Pinterest Design Logic

How UltraTextGen's **collections** (the `buildGrids` "copy a whole set" blocks on
library pages) become saveable social/Pinterest assets. Pipeline:
[`scripts/generate-collection-pins.py`](../scripts/generate-collection-pins.py).

## Why a new visual logic (vs OG / hero / thumbnails)

The existing page art — `assets/og/`, `assets/hero/`
([`generate-site-art.py`](../scripts/generate-site-art.py)) and the page pins
([`generate-pinterest.py`](../scripts/generate-pinterest.py)) — share one DNA: a
**vector brand motif** *represents* the page (a drawn flag, a drawn divider). Its
job is link-preview + brand recognition when a URL is shared. The real
copy-paste glyphs are never shown.

A **collection pin inverts that**: the hero is the **literal copy-paste set** —
several named combos from the page's `buildGrids` block, stacked as a "pack." It
is consumed *on Pinterest itself* (save + screenshot), so it does not depend on
the page ranking in Google. This matters because collection pages have thin
search volume; the pin earns attention from the aesthetic, not from keywords.

| | OG / hero / thumbnail | Collection pin |
|---|---|---|
| Hero | Abstract vector motif | The real Unicode set (`💛 💚 🇧🇷`, `✦────✦`) |
| Job | Preview a shared link → click | Saveable artifact → save + copy |
| Trigger | Someone posts the URL | Visual browse/search on Pinterest |
| Title | Carries the meaning | Demoted to a small kicker; symbols carry meaning |
| Shows | One motif | A menu of 4–5 named combos |
| Count | One per page | One per collection (scales with the library) |

## Rendering: headless Chromium, not cairo/Pillow

Pins must match what users see on the live site, so they are rendered with
**Playwright + Chromium**:

- **Emoji** use the *same* Twemoji build the pages use
  (`@twemoji/api`, SVG assets — see `symbol-explorer.js` `parseTwemoji`).
- **Fine aesthetic Unicode** (coquette/borders/dividers, Oriya `୨୧`, Carian
  `𐙚`, Tibetan `࿔`) renders through the browser font stack
  (Noto Sans Symbols/Oriya/Sinhala/Tibetan/Carian + DejaVu).

Two rejected approaches and why:
- **cairo/cairosvg** renders flag emoji as the letters "BR" (regional-indicator
  fallback) and cannot rasterize CBDT color glyphs.
- **Pillow + Noto Color Emoji** renders flags, but bakes fine Unicode as blocky
  Unifont / tofu and uses Noto emoji (the site uses Twemoji) — a brand mismatch.

Each pin is a 1000×1500 (2:3) PNG, rendered at 2× then downscaled for crispness.
Environment needs: `playwright` (+`chromium`), `Pillow`, `fonttools`,
`fonts-noto-core`/`fonts-noto-extra`, and network for the Twemoji CDN.

## Pin anatomy

Same brand skin as the OG cards (panel, dot grid, purple→blue spine, footer
wordmark), restructured around content:

```
KICKER            ← page topic, small, purple (the only "keyword" zone)
Headline Pack     ← demoted, 1–2 lines
[ soft card ]
  Combo Name
   🇧🇷 ⚽ 🏆       ← 4–5 named sets, the hero. Emoji rows large; fine-Unicode
  Combo Name        rows auto-shrink to fit the card width.
   🏆 ⚽ 💛
─── tap to copy ───
▣ UltraTextGen.com
```

## Pinterest board strategy — anchored on "copy and paste" intent

Semrush shows the demand lives in the **"copy and paste" modifier**, not the
topic names: `copy and paste symbols` ~110K, `symbols copy and paste` ~49K,
`cute symbols copy and paste` ~12K, plus `copy and paste hearts` / `emojis copy`.
Pinterest is a search engine, so boards are **named after the searched phrase**.

Each pin gets a **copy-paste primary board** + a **topical secondary board**
(double-filing for reach):

| Primary (copy-paste) board | Fed by |
|---|---|
| **Copy and Paste Symbols** | borders, dividers, box-drawing, runes, special sets |
| **Cute Symbols & Hearts to Copy and Paste** | coquette, kawaii, cottagecore, hearts, bows, flowers |
| **Emojis & Combos to Copy and Paste** | country/player combos, flags, themed emoji sets |

Secondary boards reuse the topical set from `generate-pinterest.py`
(Instagram Bio, Discord, Gaming, Text Art/Kaomoji, International, etc.).

**Pin copy** leads with the phrase: *"{Topic} to Copy and Paste"* (title),
a 150–300-char description listing the included combo names, and copy-paste-led
keywords. Destinations carry `utm_campaign=collections`.

## Production workflow

1. Source of truth is the KEEP rows in
   [`data/collection_copy_audit.csv`](../data/collection_copy_audit.csv) (~164).
2. Content is extracted per page:
   - spec pages → `collections[]` in `data/library_page_specs/<slug>.json`;
   - legacy pages → inline `var GROUPS` via
     [`scripts/_extract_groups.js`](../scripts/_extract_groups.js);
   - `emoji-flags` → curated region grids.
3. `python3 scripts/generate-collection-pins.py [slug ...]` renders
   `assets/collection-pins/<slug>.png` and writes two CSVs:
   - `data/collection_pins.csv` — internal inventory (title, description,
     keywords, alt, **both** boards, destination + UTM);
   - `data/pinterest_upload_collections.csv` — the **Pinterest bulk-create**
     file in Pinterest's exact 8-column template
     (`Title, Media URL, Pinterest board, Thumbnail, Description, Link,
     Publish date, Keywords`), mirroring the working `pinterest_upload_*.csv`
     used for the page pins.
4. Re-running is idempotent; pass slugs to regenerate a subset.

### Uploading to Pinterest

- Pinterest's bulk format allows **one board per Pin**, so the upload file uses
  each pin's copy-paste **primary** board. Create these three boards in the
  account first, with exact names: *Copy and Paste Symbols*, *Cute Symbols &
  Hearts to Copy and Paste*, *Emojis & Combos to Copy and Paste*.
- **Media URL** must be a public image link. It is built from the current git
  branch so it resolves immediately. After merging to `main`, refresh the file
  so the URLs are permanent:
  `PIN_RAW_REF=main python3 scripts/generate-collection-pins.py --upload-only`
  (`--upload-only` rewrites the upload CSV from the inventory without
  re-rendering).
