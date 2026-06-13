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

### d) Source-of-truth scripts updated

Fixes were made **centrally** so they persist through future regeneration:

- **`scripts/wire-site-art.py`** — the generator that wires hero figures into
  pages now emits decorative figures (`aria-hidden="true"` + `alt=""`) and its
  idempotency regex tolerates the new attribute. Future runs stay correct.
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

These pages are correctly wired but would benefit from a **bespoke OG card**
(design task, not code):

- **Localized homepages** (`/de/`, `/es/`, `/fr/`, `/it/`, `/nl/`, `/pl/`,
  `/pt/`, `/tr/`, `/id/`, `/vi/`) currently reuse the English
  `fancy-text-generator-preview.png`. See §6.
- **`/library/slash-backslash-symbols/`** — highest-volume page on the site
  (165k for "/"); its card already exists but is worth a design review given the
  traffic ceiling.

All highest/high-priority English pages already have unique, page-specific OG
cards — there is **no duplicate-OG problem** among content pages (each uses its
own `/assets/og/<slug>.png`). The only shared card was the generic `og.png`,
now scoped to the homepage family.

---

## 6. Localized image opportunities

The localized homepages and zalgo pages have translated body copy but their OG
card text is still English. There is **no automated text-on-image OG generator**
in the repo (cards are pre-rendered design assets), so these are flagged as
design tasks rather than auto-generated. Recommended assets and copy:

| Locale | Recommended filename | OG copy |
|---|---|---|
| German (`/de/`) | `coole-schriftarten-generator-preview.png` | "Coole Schriftarten Generator / Schöne Schriftarten und Symbole kopieren" |
| Spanish (`/es/`) | `generador-de-letras-bonitas-preview.png` | "Generador de Letras Bonitas / Fuentes y símbolos para copiar" |
| French (`/fr/`) | `generateur-de-polices-preview.png` | "Générateur de Polices / Polices et symboles à copier" |
| Others (`it/nl/pl/pt/tr/id/vi`) | `<localized-keyword>-preview.png` | translate headline + "copy fonts & symbols" tagline |

Prioritise locales only as their organic demand grows — current localized
traffic is minimal in both SEMrush and GSC, so this is a low-urgency backlog
item. The data model to track this (`primaryKeyword`, `imageSeoPriority`,
remaining recommendation) is captured per-page in `data/image_seo_status.csv`.

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
