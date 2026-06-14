# Pinterest Pin Generation

Vertical, Pinterest-ready pin images + a full pin inventory for UltraTextGen.

Pinterest favours a **2:3 vertical** image, which the 1200×630 Open Graph
cards in `assets/og/` are not. Those OG cards are correct for OG, Twitter,
LinkedIn, Facebook and Google Images and are **left untouched**. This system
adds a separate, redesigned vertical pin for every eligible content page.

- **Images:** `assets/pinterest/<slug>.png` — 1000×1500 PNG (2:3)
- **Inventory:** `data/pinterest_pins.csv`
- **Generator:** `scripts/generate-pinterest.py`
- **Source of truth:** `data/image_seo_status.csv`

Run `python3 scripts/generate-pinterest.py` to regenerate everything
(idempotent). Requires `cairosvg`.

---

## How the pins are built

The generator **extends the existing brand system** rather than inventing a
new one. It imports the exact motif library and page registry used by
`scripts/generate-site-art.py` (and `guide/assets/_generate.py`) and re-lays
each motif into a tall pin template, so the pins read as the same family as
the OG cards:

- soft off-white panel + faint dot grid + brand purple→blue gradient
- one focal motif per page on a soft rounded card (the visual centerpiece)
- **top:** kicker + large keyword title (the page's primary keyword)
- **middle:** the focal motif — symbols, glyphs, styled text or vector mark
- **lower:** a short benefit / use-case line (the page's own subtitle)
- **bottom:** the `UltraTextGen.com` wordmark

No screenshots, no stretched OG image, no ad-banner styling.

---

## Totals

| Metric | Count |
|---|---|
| Total pages reviewed | **240** |
| Pages included (pins generated) | **235** |
| Pages excluded | **5** |
| Pinterest images generated | **235** (all 1000×1500 PNG) |
| Boards defined | **12** |
| Secondary board assignments | **98** |

---

## Pins per board

| Board | Primary | Secondary |
|---|---:|---:|
| Discord Fonts, Symbols & Names | 2 | 3 |
| Instagram Bio Symbols & Aesthetic Text | 20 | 12 |
| Fancy Text Generator & Copy Paste Fonts | 61 | 0 |
| International Fancy Font Generators | 20 | 0 |
| TikTok, Snapchat & WhatsApp Fonts | 11 | 9 |
| LinkedIn Fonts & Professional Text | 4 | 4 |
| Gaming Symbols & Usernames | 8 | 1 |
| Special Characters, Unicode & Keyboard Symbols | 25 | 57 |
| Emoji Copy Paste & Emoji Combos | 44 | 2 |
| Cute Symbols, Hearts & Decorative Text | 17 | 6 |
| Text Art, Kaomoji & ASCII Faces | 2 | 4 |
| Font Guides & Typography Tips | 21 | 0 |
| **Total (primary)** | **235** | **98** |

### Board assignment logic

Boards are assigned from the page URL, primary intent, title and page type,
using the rules supplied in the task. Two precedence decisions were made so
the boards stay useful:

- **`localized` pages → International Fancy Font Generators (primary).** All
  10 localized homepages and 10 localized zalgo use-case pages land here, per
  the "localized homepage or localized use case page" rule. Their topical
  match (e.g. zalgo → Instagram/Aesthetic) becomes the **secondary** board.
- **`guide` and `answer` pages → Font Guides & Typography Tips (primary).**
  Page type is treated as definitive for educational content, so guides and
  Q&A pages populate the board literally named for them. Their platform/topic
  (e.g. "what font does Discord use" → Discord) becomes the **secondary**
  board. A strict top-to-bottom keyword reading would have scattered nearly
  every answer page onto a platform board and left this board almost empty.

All other pages use the ordered keyword rules for the primary board, with
**Fancy Text Generator & Copy Paste Fonts** as the documented fallback.
Secondary boards are added only when a page naturally matches a second board
(e.g. `library/instagram-symbols` → Instagram + Special Characters;
`library/discord-symbols` → Discord + Special Characters).

---

## Pages included (by template)

| Design template | Pages | Page types |
|---|---:|---|
| `library_symbols_vertical` | 147 | symbol library (incl. `/library/` hub) |
| `localized_vertical` | 20 | localized homepages + localized use cases |
| `category_vertical` | 20 | category detail + `/category/` hub |
| `platform_vertical` | 17 | platform + tiktok/youtube/roblox sub-pages |
| `answer_vertical` | 12 | answer + `/answers/` hub |
| `usecase_vertical` | 9 | use case + `/usecase/` hub |
| `guide_vertical` | 9 | guide articles + `/guide/` hub |
| `homepage_vertical` | 1 | homepage |
| **Total** | **235** | |

---

## Pages excluded (5)

| Page | Reason |
|---|---|
| `/about/` | utility page |
| `/contact/` | utility page |
| `/privacy/` | legal page |
| `/terms/` | legal page |
| `/embed/linkedin-headline-generator/` | embed page |

The five overview/index hubs (`/category/`, `/usecase/`, `/library/`,
`/answers/`, `/guide/`) **are included** — each is a strong topical landing
page with real keyword and visual intent (a font-categories hub, a symbol &
emoji library hub, etc.), not pure navigation. The `/library/` hub is mapped
to Special Characters (secondary: Emoji); `/answers/` and `/guide/` to Font
Guides; `/category/` and `/usecase/` to Fancy Text.

---

## CSV inventory

`data/pinterest_pins.csv` — one row per reviewed page (240 rows), with the
required columns:

`page_url, page_path, page_type, primary_intent, priority, search_volume,
include_in_pinterest, exclusion_reason, og_image_path, pinterest_image_path,
pinterest_image_width, pinterest_image_height, pinterest_board_primary,
pinterest_board_secondary, pin_title, pin_description, pin_keywords,
pin_alt_text, pin_destination_url, utm_destination_url, pin_status,
published_pin_url, design_template, visual_glyphs, notes`

- `pin_status` = `pending` for every included row; `published_pin_url` blank.
- `utm_destination_url` appends
  `utm_source=pinterest&utm_medium=social&utm_campaign=organic_pins&utm_content=<slug>`.
- Titles target 40–90 chars; descriptions target 150–300 chars and are
  **unique per pin** (235/235 unique descriptions).

---

## Validation results (Task D)

| # | Check | Result |
|---|---|---|
| 1 | Every included row has a Pinterest image | ✅ 235/235 |
| 2 | Every Pinterest image is exactly 1000×1500 | ✅ |
| 3 | Every included row has a (primary) board | ✅ |
| 4 | Every included row has a pin title | ✅ |
| 5 | Every included row has a pin description | ✅ |
| 6 | Every included row has a destination URL | ✅ |
| 7 | No excluded page has a Pinterest image / image requirement | ✅ (0 stray files) |
| 8 | Existing OG images not overwritten | ✅ (`assets/og/`, `guide/assets/og/` unchanged) |
| 9 | Existing image-SEO metadata unchanged | ✅ (`image_seo_status.csv` read-only) |
| 10 | Pages included vs excluded reported | ✅ 235 included / 5 excluded |

Also verified: pin title lengths all within 40–90 chars and **unique
(235/235)**; pin descriptions all within 150–300 chars and **unique
(235/235)**; 235 image files on disk == 235 included rows.

---

## Pages needing manual review

1. **Localized descriptions.** Localized pins keep the translated title and
   subtitle but use an English copy-and-paste CTA sentence. Fine for an
   international board, but worth a native-language pass before publishing.
2. **Emoji / CJK pages.** Colour-emoji and CJK code points do not rasterize in
   the bundled fonts, so emoji-themed and CJK library pins use a brand vector
   motif (smiley, paw, etc.); their `visual_glyphs` cell holds a short motif
   descriptor rather than literal emoji. This mirrors how the OG cards handle
   the same pages — no action required, noted for transparency.

**Resolved since first draft:** the two "Bold Fonts" category variants now get
distinct titles (collisions are auto-disambiguated with subtitle keywords), and
the 5 overview hubs are now included as pins.

---

## Scope

This task covers **image generation, board mapping and CSV preparation only**.
No pins were published to Pinterest and no Pinterest API integration was
created. `pin_status` is `pending` for all rows, ready for a later publish
step.
