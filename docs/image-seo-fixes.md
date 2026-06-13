# Image SEO Fixes — UltraTextGen

**Date:** 2026-06-13
**Scope:** Site-wide image SEO repair, prioritised with SEMrush organic-positions
data, Google Search Console (GSC) performance data, and page intent.

This was an **implementation** pass, not just an audit. The changes below are
applied across the repo and validated. A machine-readable per-page status file
accompanies this report at `data/image_seo_status.csv` (240 indexable pages).

---

## 1. The problem we fixed

Google Images was indexing **two images per page** — the Open Graph social card
(`/assets/og/<slug>.png`) *and* the visible hero illustration
(`/assets/hero/<slug>.svg`). On `/discord/`, for example, both the OG card and
the decorative hero SVG were eligible for image search, splitting image signals
across two assets.

**Decision applied:** the Open Graph card is the single canonical image for
Google Images and social sharing. The hero SVGs are abstract typographic banners
that only restate the page title — they carry no unique content — so they are
now treated as **decorative**.

No page-level `noimageindex` was added. `robots.txt` was **not** changed.

---

## 2. What changed

### a) Hero images made decorative (220 pages)

Every per-page hero figure was converted from a captioned image to a decorative
one so it no longer competes with the OG card in Google Images:

```html
<!-- before -->
<figure class="page-hero-figure" data-uthero>
  <img src="/assets/hero/discord.svg" width="1200" height="340"
       loading="lazy" alt="Illustration representing Discord Font Generator — Copy and Paste, No Nitro.">
</figure>

<!-- after -->
<figure class="page-hero-figure" data-uthero aria-hidden="true">
  <img src="/assets/hero/discord.svg" width="1200" height="340"
       loading="lazy" alt="">
</figure>
```

This was applied to **all 220 hero figures** (platform, category, use-case,
symbol-library, answer, and localized pages). The Discord-specific change
requested in the brief is included.

### b) Open Graph dimension triple completed (83 pages)

83 symbol-library pages declared `og:image` but were missing
`og:image:width` / `og:image:height` / `og:image:type`. These were added so
Facebook, LinkedIn, and other scrapers render the large summary card reliably on
first scrape. Every card on the site is a 1200×630 PNG, so values are uniform:

```html
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
```

### c) Generic `og.png` renamed to a descriptive, convention-aligned asset

The homepage and 12 other pages used the generic root file `/og.png`. Every
other page already used a descriptive `/assets/og/<slug>.png` card, so the lone
holdout was renamed to match:

```
og.png  →  assets/og/fancy-text-generator-preview.png
```

All 13 references (`og:image` + `twitter:image` on the English homepage, the 10
localized homepages, `404.html`, and the build-generated `_root.html`) were
updated. `git mv` preserves file history.

### e) Localized homepage OG cards generated

The 10 localized homepages (`/de/`, `/es/`, `/fr/`, `/it/`, `/nl/`, `/pl/`,
`/pt/`, `/tr/`, `/id/`, `/vi/`) previously shared the **English** home card —
English image copy on a translated page. Each now has its own card with
translated, keyword-led copy, generated through the existing
`scripts/generate-site-art.py` visual system and rendered to 1200×630 PNG:

| Locale | Card filename | Baked title |
|---|---|---|
| de | `coole-schriftarten-generator-preview.png` | Coole Schriftarten Generator |
| es | `generador-de-letras-bonitas-preview.png` | Generador de Letras Bonitas |
| fr | `generateur-de-polices-preview.png` | Générateur de Polices |
| it | `generatore-di-testo-stilizzato-preview.png` | Generatore di Testo Stilizzato |
| nl | `mooie-letters-generator-preview.png` | Mooie Letters Generator |
| pl | `generator-ladnych-czcionek-preview.png` | Generator Ładnych Czcionek |
| pt | `gerador-de-letras-diferentes-preview.png` | Gerador de Letras Diferentes |
| tr | `sekilli-yazi-olusturucu-preview.png` | Şekilli Yazı Oluşturucu |
| id | `generator-font-aesthetic-preview.png` | Generator Font Aesthetic |
| vi | `tao-chu-kieu-dep-preview.png` | Tạo Chữ Kiểu Đẹp |

Each card's `og:image` + `twitter:image` are wired into its localized homepage.
Glyph rendering (including Turkish ş/ı, Polish Ł, and stacked Vietnamese
diacritics) was visually verified — no missing-glyph boxes. The localized
**zalgo** pages already carried translated cards and were left unchanged.

### d) Source-of-truth scripts updated

Fixes were made **centrally** so they persist through future regeneration:

- **`scripts/wire-site-art.py`** — the generator that wires hero figures into
  pages now emits decorative figures (`aria-hidden="true"` + `alt=""`) and its
  idempotency regex tolerates the new attribute. Future runs stay correct.
- **`scripts/generate-site-art.py`** — homepage card now writes to
  `assets/og/fancy-text-generator-preview.png` (was the generic root `og.png`),
  and a `LOCALIZED_HOME` registry generates the 10 localized homepage cards.
- **`scripts/make-hero-decorative.py`** *(new)* — idempotent migration that made
  the 220 existing heroes decorative.
- **`scripts/build-image-seo-status.py`** *(new)* — regenerates
  `data/image_seo_status.csv` by scanning markup and joining SEMrush volume.
- **`scripts/add-og-dimensions.py`** *(existing)* — run to add the OG triple.

---

## 3. How priority used SEO volume + intent

Priority ranking (in `data/image_seo_status.csv`) was driven by the SEMrush
organic-positions export, then page type where no volume exists:

| Priority | Pages | Examples (SEMrush US search volume) |
|---|---|---|
| Highest | 14 | `/library/slash-backslash-symbols/` ("/", 165k) · `/discord/` ("discord fonts", 33.1k) · `/usecase/zalgo-text/` ("zalgo text", 12.1k) · all platform pages · homepage |
| High | 13 | `/library/instagram-symbols/` (1.9k) · `/library/discord-symbols/` (1.3k) · `/linkedin/` · `/library/x-twitter-symbols/` · `/library/greek-letter-symbols/` |
| Medium | 203 | category, guide, answer, remaining library + localized pages |
| Lower / Low | 10 | utility, legal, about/privacy/terms |

GSC overview (Feb–Jun 2026) confirms impressions are scaling (≈530 impressions
and 6 clicks/day by mid-June, up from near-zero in February), and the SEMrush
PagesV3 export shows `/discord/` carrying ~98% of organic traffic — so the
highest-traffic pages were verified first.

---

## 4. Checklist (per the brief)

| Item | Result |
|---|---|
| Pages fixed | 240 indexable pages audited; 220 heroes + 83 OG triples + 13 og.png refs changed |
| OG image added where missing | All indexable pages have `og:image` (only `noindex` embed/test pages lack it, by design) |
| Twitter image added | All indexable pages have `twitter:image` + `twitter:card="summary_large_image"` |
| Hero images set decorative | 220 / 220 |
| Meaningful alt text updated | Hero SVGs are decorative banners → `alt=""` (see §6 on why no descriptive alt) |
| Broken image references | 0 — all `og:image`, `twitter:image`, and hero `src` resolve to existing files |
| OG URLs absolute | 100% absolute (`https://ultratextgen.com/...`) |
| `noimageindex` added | No (per instruction) |
| `robots.txt` image blocking | Unchanged (per instruction) |

---

## 5. High-priority pages still needing custom design work

Every indexable page — including all 10 localized homepages (see §6) — now has a
unique, page-specific OG card. There is **no remaining duplicate-OG problem**:
the only shared card was the generic `og.png`, now scoped to the English
homepage alone. Remaining items are *optional design polish*, not gaps:

- **`/library/slash-backslash-symbols/`** — highest-volume page on the site
  (165k for "/"); its card already exists but is worth a design review given the
  traffic ceiling.
- The new localized cards reuse the master brand motif. A future pass could give
  high-demand locales a bespoke motif, but this is low priority while localized
  organic demand remains small.

---

## 6. Localized image opportunities — implemented

**Update:** the original audit assumed there was no text-on-image OG generator.
There is — `scripts/generate-site-art.py` bakes per-page title/subtitle into the
1200×630 card (it already produced the localized *zalgo* cards). It was extended
with a `LOCALIZED_HOME` registry, so the 10 localized homepage cards are now
**generated and wired** rather than left as a backlog item. See §2(e) for the
full filename/copy table.

What this delivers:

- A translated page no longer surfaces an English-text social card — the OG card
  and Google Images thumbnail now match the page language and primary keyword.
- Filenames are descriptive and keyword-led per locale (e.g.
  `generador-de-letras-bonitas-preview.png`), aiding Google Images.
- Regeneration is reproducible: `python3 scripts/generate-site-art.py` rebuilds
  every card, including these, from the registry.

The localized *zalgo* pages already carried translated cards and were unchanged.
Per-page status (intent, priority, card path) is in `data/image_seo_status.csv`.

---

## 7. Risks & assumptions

- **Assumption:** every hero SVG is decorative. Verified — all 220 used the
  generic "Illustration representing &lt;title&gt;" alt and are abstract banners,
  not content previews (e.g. they do not render actual font samples). If a
  future hero is built to convey unique content, give it descriptive alt and
  drop `aria-hidden`.
- **`og.png` rename:** social platforms cache by URL, so the homepage card will
  be re-scraped on next share — expected and harmless. No external references to
  `/og.png` exist in the repo.
- **`_root.html`** is `cp index.html` (`npm run build`); it was updated and
  rebuilt so it matches the new homepage card.
- **`sitemap.xml`** was intentionally left untouched (auto-generated daily).
- **Non-indexable pages** (`/usecase/linkedin-headline/embed/`,
  `verticalLayouts.test.html`) carry `robots: noindex` and were deliberately
  excluded from OG/Twitter requirements.
- **Localized card generation** uses `cairosvg` (a documented dev-only
  requirement of `generate-site-art.py`, not a runtime/browser dependency). Only
  the 11 home/localized cards were rendered in this pass; the 221 existing
  per-page cards were left byte-for-byte unchanged to avoid render churn. Glyph
  coverage for all locales was visually verified.
