# CLAUDE.md — UltraTextGen Codebase Guide

This file provides context for AI assistants working in this repository. Read it before making changes.

---

## Project Overview

**UltraTextGen** is a fast, zero-framework text-expression tool. Its core is a Unicode text generator that converts plain text into stylized fonts that work across social platforms (LinkedIn, Instagram, Discord, etc.). It has since grown a **second output mode: in-browser visual & printable asset generation** — printable bubble-letter and cursive practice/coloring sheets (per-letter and full A–Z), and the curved/arc text tool (`/curved-text/`) — rendered client-side as **SVG/PNG** that users copy, download, or print.

Copy-paste Unicode is still the front door and satisfies the job fastest. Visual assets are the on-brand, higher-intent **follow-up** for jobs plain characters can't do (trace, color, print, logo/sticker art) — added where real demand exists, never as a default.

**Scope note (updated):** the earlier "text-only, no image generator" boundary has been intentionally lifted. UltraTextGen now *does* generate images — but only **client-side, on demand, as SVG/PNG built with native Canvas/SVG**. This is not a reversal of the philosophy; it's the same philosophy applied to a new job.

**Printables scope boundary (added 2026-07-10):** "visual asset" does not mean "any kids' worksheet." The line is **typography-native**: a printable belongs in this repo only if the thing being rendered is text — a letter, a word, a name, a phrase (bubble/cursive/block letters, coloring pages, tracing sheets, a dot-to-dot of a *name*, name puzzles, banners spelling a word). Generic worksheet/activity content that isn't fundamentally text — shape-only tracing (circle/square/triangle with no letters), pre-writing motor-skill strokes, mazes, word searches, math worksheets — is **out of scope here**, even though `printablesEngine.js` could technically render it. That demand is real but belongs to a possible future, separate property once this site is more established — do not build it under the UltraTextGen brand. Quick test: could a user type a word/name into the feature and see *that word* rendered? If no, it's not a printable for this repo.

**Core philosophy**: Fast > Fancy, Clean > Clever, Useful > Impressive. **Client-side only is a hard line:** visual generation must use native SVG/Canvas in the browser — never a server-side renderer, an image-processing library, or bundled font binaries.

**Flair note (updated):** "Fast > Fancy" governs *complexity*, not *ambition*. On a plain text page (e.g. bold), a random name generator or heavy per-character transform would be scope creep. But on a **game/platform name page, matching that game's aesthetic *is* the copy-paste job, done end to end** — a decorated Free Fire name framed in ꧁༒…꧂, a name that fits the field's limit, a name generated to a theme. There, richer and even **generative flair is in-scope and on-brand** (the hand-authored "Ready-Made Names" lists are proof of the demand; a generator just does it dynamically). What stays a hard line is the *output*, never the ambition: flair is **paste-safe Unicode composed from building blocks client-side via native APIs** (`Intl.Segmenter`, etc.) — never an image, a bundled font, or a dependency, and only the *selection* may be random. The flair layer is a real engine (`js/flair/flair-engine.js` + `applyDecoration`/`window.UTG_DECORATIONS`), meant to expand: packs, modes (`wrap`/`space`/`interleave`), and a checker that counts what the player will actually paste.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Pure HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Build tools | Node.js (sitemap gen only), Python (tweet queue only) |
| CI/CD | GitHub Actions |
| Hosting | Static site (Netlify, inferred from `_redirects`) |
| Analytics | Google Tag Manager (GTM-P55HXK8Q) |

**There are no frontend frameworks** (no React, Vue, Angular, etc.) and no bundlers (no Webpack, Vite, Rollup). Do not introduce them.

---

## Repository Structure

```
ultratextgen/
├── index.html              # Main homepage (733 lines)
├── style.css               # Global stylesheet (1980 lines)
├── script.js               # UI/DOM logic, main IIFE — owns decorations/flair
├── styles.js               # Unicode font registry (836 lines)
├── renderer.js             # Text rendering engine (459 lines)
├── header.js               # Shared header injector (67 lines)
├── js/flair/flair-engine.js# Flair packs + compose() (shared decoration data)
├── js/gamename/game-rules.js# Per-game nickname rule engine + name checker
├── symbol-explorer.js      # Symbol lookup utility
├── symbol-explorer.css     # Symbol explorer styles
├── package.json            # npm metadata + build scripts
├── fonts.json              # Font category mappings
├── robots.txt              # Search engine directives
├── sitemap.xml             # Auto-generated (do not edit manually)
├── _redirects              # Netlify redirect rules
│
├── .github/workflows/
│   ├── tweet-queue.yml     # Daily social queue (09:00 UTC)
│   └── update-sitemap.yml  # Daily sitemap regen (00:00 UTC)
│
├── scripts/
│   ├── update-sitemap.js   # Sitemap generator (Node.js)
│   ├── inject-faq-jsonld.js# FAQ structured data injector
│   ├── tweet_queue.py      # Git-to-tweet automation (Python)
│   ├── generate-site-art.py# SINGLE source of truth for the brand pin/art skin
│   ├── generate-pinterest.py     # Per-page pin generator (imports generate-site-art)
│   ├── generate-id-pins.py       # /id/ board generator (mirror this for new boards)
│   ├── generate-vertical-text-pins.py # vertical-text board generator
│   ├── pinterest_csv.py    # SINGLE source of truth for the Pinterest upload schema
│   └── build_pinterest_upload.py # inventory CSV -> *_upload.csv (importer-ready)
│
├── assets/pinterest/<board>/ # Pin images (1000×1500 PNG, 2:3) — the ONLY place pins go
├── data/*_pinterest_pins.csv      # internal inventory CSVs (never uploaded)
├── data/*_pinterest_pins_upload.csv # importer-ready CSVs (upload these only)
│
├── category/               # Category landing pages (bold, cursive, etc.)
├── usecase/                # Use case pages (bio, comment, etc.)
├── guide/                  # Educational / authority articles — explore-and-learn intent
├── answers/                # Single-question, zero-click answer pages (see "Guide vs Answer")
├── library/                # Symbol/emoji/emoticon/kaomoji COLLECTION pages — BROWSE pillar
│                           #   (classify each page by presentation_class +
│                           #    copy_patterns — see docs/emoji-combination-taxonomy.md)
├── symbol/                 # Single-item identity spokes (glyph OR emoji) — SEARCH-ONLY
│                           #   discovery, own on-page single-item search (see "Library vs Symbol")
├── js/vertical/            # Vertical text feature module
├── js/tattoo/              # Tattoo lettering studio module (names, dates→roman, initials, symbols)
│
└── Platform pages:
    discord/ facebook/ instagram/ linkedin/ pinterest/
    snapchat/ telegram/ tiktok/ whatsapp/ x/ youtube/
```

---

## Content Types: Guide vs Answer

`guide/` and `answers/` look similar (both reuse the `editorial-section` template) but
serve **different search intents**. Pick by the dominant query before creating a page —
misfiling weakens both the page and the cluster.

| | `answers/` | `guide/` |
|---|---|---|
| **Intent** | Informational, **zero-click**, confusion-clearer. A sharp question with a direct answer. | Educational / thought-leadership / **authority**. Explore-and-learn; a topic explored in depth. |
| **Typical query** | "is X safe", "how to do X", "what font does X use", "can you X" | "X explained", "the complete guide to X", branding/strategy topics |
| **Slug** | the **question** — `is-linkedin-bold-text-safe`, `how-to-uncover-redacted-text` | the **topic** — `discord-text-formatting-explained` |
| **Primary schema** | `QAPage` and/or `FAQPage` + `BreadcrumbList`. **No** `Article`. | `Article` (author, publisher, datePublished) + `FAQPage` + `BreadcrumbList` |
| **Breadcrumb** | `Answers` | `Guides` |
| **Template** | leads with a **"Short answer"** block; no Key Takeaways / related-guides | `guide-meta` pills, **Key Takeaways**, **related-guides** |

Rule of thumb: if the value is "resolve one question in seconds," it's an **answer**.
If the value is "understand a topic / build authority," it's a **guide**. A guide may
bundle many sub-questions; an answer stays tightly scoped to one.

---

## Content Types: Library vs Symbol

`library/` and `symbol/` both hold Unicode reference content, but they own different
jobs and different discovery paths. Don't conflate them when deciding where a new
page belongs.

**The split is collection vs. single item — not "symbols vs. emoji" (updated
2026-07-16).** The world doesn't meaningfully distinguish "symbol" from "emoji";
a single-emoji identity page and a single-glyph identity page (khanda, diameter
sign) are the same shape of content and belong in the same lane.

| | `library/` | `symbol/` |
|---|---|---|
| **Job** | **Browse** a category — a hub of related items (math symbols, currency symbols, zodiac signs, emoji combo sets) | **Identify** one specific item in full — codepoint/meaning, history, alt-input, confusable neighbors, FAQ. Applies equally to a punctuation mark and a single emoji |
| **Scope** | `collection` — many peer items | Always `single` — one canonical glyph *or* emoji |
| **Discovery** | **Primary nav** (`header.js` "Library" button) + on-page search/filter UI | **No nav entry** — landed on via search engines/pins, same footing as `guide/`; nav real estate tracks browse-intent volume, not content-type existence. Once there, `symbol/index.html` runs its **own single-item search** — a distinct job from library's browse/filter (searching for one already-known item vs. exploring a category), not a duplicate of it |
| **Breadcrumb** | `Library` | `Symbols` |
| **Cross-linking** | Links out to relevant `symbol/` spokes from its hub pages; its own index (`library/index.html`) points to `/symbol/` for single-item lookups, phrased as "see the symbol pages," never "browse" | Every spoke links back to the `library/` hub(s) it relates to; its index (`symbol/index.html`) explicitly routes "want a whole category?" traffic back to `/library/` |

**The decision, and why:** `library/` stays the sole "browse and find" surface — that's
where the on-page filter UI and primary nav entry live. `symbol/` is the single-item
lane — one canonical glyph *or* emoji, page built to be *landed on* via search, not
*browsed to*. Do not add a `symbol/` entry to `header.js`'s main nav — discovery there
stays search/pin-driven by design, even though the page itself now hosts a
single-item search tool once someone's arrived (this reverses the prior rule against
any search UI on `symbol/index.html`; that rule was written when `symbol/` had no
search of its own — it now intentionally does, scoped to single-item lookup, not
category browsing).

**New single-item pages (rule as of 2026-07-16):** any new single-emoji or
single-glyph page — including "weird emoji fact" campaign pages — goes into
`symbol/`, not `library/`. `library/` is reserved for collections going forward.

**Grandfathered exception:** the ~60 single-emoji pages already living in
`library/` (`moai-emoji`, `clown-emoji`, `sad-emoji`, etc. — one emoji per page)
are **not** retroactively migrated in bulk. A mechanical rename risks live
rankings on pages that already have real search traffic, for a lane cleanup
with no user-facing upside. Convert a cluster into a `library/` collection
once its pages have a genuine peer relationship — that peer relationship can
already exist **today** among the current 60 (e.g. `crying-emoji` +
`sad-emoji` may already be close enough), not only once some brand-new page
is added later. Fold matched clusters into one collection page and
301-redirect the old singles into it, rather than leaving parallel singles
competing with each other. Auditing the 60 for existing clusters and
executing the folds is its own deliberate, scheduled pass — not something to
do opportunistically as a side effect of unrelated work.

**Kaomoji are out of scope for this rule.** Kaomoji are text-built emoticons,
not glyph/emoji codepoints — single kaomoji pages (`heart-kaomoji`,
`hug-kaomoji`, etc.) keep following the old scope (single item that's still
primarily a copy target, filed under `library/`) until/unless this is
explicitly revisited.

**Adding a `symbol/` page:** write a spec in `data/library_page_specs/` with
`"page_type": "symbol"` (everything else matches a normal `library/` spec —
including single-emoji specs) and run
`scripts/generate_library_page_from_spec.py` — it routes output to `/symbol/<slug>/`
and defaults the breadcrumb to "Symbols" automatically. Hub→spoke linking is
automated: make sure the spoke's `related` block links its `library/` hub(s), then
run `scripts/sync_symbol_spoke_links.py --write` (add `--reciprocal` to card every
claimed hub) — it injects the `compare-card`(s) on the hub side in house style and
is idempotent. Still add one entry back on `symbol/index.html` by hand.
`scripts/validate_library_pages.py` scans `symbol/*` by default alongside
`library/*` and **fails on orphan spokes** (a spoke no `library/` hub links to),
so a forgotten sync run is caught before the PR.

**Translating a `library/`/`symbol/` page:** the lane is inherited from the
English source's `page_type` — it is never re-decided per language. A
translation of a `symbol/<slug>/` page ships to `<lang>/symbol/<slug>/`, even
if that language has no `symbol/` pillar yet and every prior translation for
it landed in `<lang>/library/`. `scripts/validate_library_pages.py` scans
every `<lang>/library/*` and `<lang>/symbol/*` by default and fails on **lane
mismatch** (a page's own directory vs. its `hreflang="en"` counterpart's
directory) — run it over your translated batch before opening the PR. Full
rationale and the recurring failure mode: `docs/unicode-library-workflow.md`
§7.

---

## Core JavaScript Architecture

Scripts are loaded in a strict order in every HTML page:

```html
<script src="/header.js"></script>      <!-- 1. Inject shared nav -->
<script src="/styles.js"></script>      <!-- 2. Register font styles -->
<script src="/renderer.js"></script>    <!-- 3. Rendering engine -->
<script src="/script.js" defer></script><!-- 4. UI logic -->
```

### Module Descriptions

#### `header.js`
- IIFE that creates and injects the shared navigation header
- Looks for `#shared-header` element or inserts after GTM noscript
- Manages dark mode toggle + localStorage persistence

#### `styles.js`
- Defines `window.textStyles` — the global Unicode font registry
- Each style maps A–Z, a–z, 0–9 to Unicode equivalents
- Defines `CATEGORY_PAGES` and `SITE_PAGES` routing objects
- Style object shape:
  ```js
  {
    upper: { A: '𝗔', B: '𝗕', ... },
    lower: { a: '𝗮', b: '𝗯', ... },
    nums:  { 0: '𝟬', 1: '𝟭', ... },
    type: 'map',           // 'map' | 'zalgo' | 'upside-down' | 'transform'
    category: 'bold',
    familySlug: 'bold-fonts',
    groupSlug: 'bold'
  }
  ```

#### `renderer.js`
- Exports `window.UltraTextGenRender` with main method `renderAny(text, styleKey, options)`
- Handles rendering types:
  - **`map`**: Character-by-character Unicode substitution
  - **`zalgo`**: Glitch text with stacked diacritics
  - **`upside-down`**: Text reversal + character flipping with fallback modes
  - **`transform`**: Custom transforms (backwards, smallCaps, mirror)

#### `script.js`
- Main IIFE wrapping all UI state and event logic
- Utility helpers: `$()` (querySelector) and `$$()` (querySelectorAll)
- Manages: input textarea, output grid, decorations (symbols, frames, dividers)
- Copy to clipboard via Clipboard API with visual toast feedback
- Real-time rendering as user types
- Style filtering/search (client-side)
- localStorage for recent selections and dark mode preference
- Query param `?q=text` for shareable URLs
- **Owns the flair layer.** `applyDecoration(text)` applies the selected
  decoration: `mode: "wrap"` (default `prefix+text+suffix`), `"space"` (fill
  spaces with `fill`), `"interleave"` (`sep` between graphemes, via
  `Intl.Segmenter`). Exposes `UltraTextGen.flairedMainInput()` and fires
  `utg:flairchange` so `game-rules.js` can count the *decorated* name.
- **Decoration tabs**: static `data-deco-tab` buttons read `decorations[key]`.
  `window.UTG_DECORATIONS` is **merged over** the defaults (`Object.assign`), so
  a page adds one tab without redeclaring the rest.

#### `js/flair/flair-engine.js`
- Shared, reusable decoration **data** (the transform lives in `script.js`).
- `UltraTextGen.flair.PACKS` — named packs (`gameFrames`, `crowns`, `warrior`,
  `hearts`, `brackets`, `spacing`).
- `compose({ tabKey: ["packName", …] })` → a `window.UTG_DECORATIONS` map, so
  pages compose tabs by name instead of copy-pasting arrays. `pickRandom()` is
  the seed for generative "surprise" flair.
- Load it **non-deferred, before** the inline `window.UTG_DECORATIONS = …compose(…)`
  config (which must run before the deferred `script.js`).

#### `js/gamename/game-rules.js`
- Per-game nickname **rule engine** + inline "name check" widget.
- `RULES` (per-game limits/weighting/charset), `analyze(str, gameId)`, and
  `initChecker(cfg)` (mounts a live checker that mirrors the generator input).
- With the flair bridge, the checker counts the *flaired* name — a frame that
  pushes a "fits" name over the limit now shows up before a rename card is spent.

#### `js/vertical/`
- Self-contained module for vertical text generation
- Files: `verticalPageController.js`, `verticalLayouts.js`, `verticalDecorators.js`, `verticalDecoratorData.js`
- Has its own manual test page: `verticalLayouts.test.html`

---

## HTML Page Conventions

All pages follow this structure and must maintain:

1. **Google Tag Manager** snippet in `<head>` and `<body>`
2. **Canonical URL** meta tag
3. **OpenGraph + Twitter Card** meta tags
4. **JSON-LD structured data** (FAQPage, WebSite, Organization, BreadcrumbList)
5. **Script load order**: header → styles → renderer → script (with `defer` on script.js)
6. **Dark mode support** via class on `<html>` element

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GTM, canonical, OG/Twitter meta -->
  <!-- JSON-LD structured data -->
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <!-- GTM noscript -->
  <div id="shared-header"></div>
  <!-- Page content -->
  <script src="/header.js"></script>
  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>
  <script src="/script.js" defer></script>
</body>
</html>
```

---

## CSS Conventions

- **Custom properties (CSS variables)** for all colors/theme tokens — required for dark mode
- **CSS Grid + Flexbox** for layout
- **Mobile-first** responsive design
- **Class naming**: hyphen-separated (e.g., `hero-headline`, `decoration-section`, `style-card`)
- **Dark mode**: toggled by adding `dark` class to `<html>`, not via `prefers-color-scheme` media query
- Do not use inline styles or `!important` unless absolutely necessary

---

## JavaScript Conventions

- **All modules use IIFE pattern**: `(function () { "use strict"; ... })();`
- **Globals**: Only `window.textStyles` and `window.UltraTextGenRender` are intentional globals
- **DOM helpers**: Use `$()` and `$$()` wrappers defined in `script.js`
- **Naming**: camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants
- **No `var`**: Use `const` and `let` only
- **No external libraries** in frontend code — use native Web APIs (Clipboard API, fetch, localStorage, Intl)
- **No ES modules** (`import`/`export`) — scripts use global scope communication intentionally

---

## Adding New Unicode Styles

To add a new text style, edit `styles.js`:

1. Add an entry to `window.textStyles` with the shape shown above
2. Map all 26 uppercase letters (`A`–`Z`), 26 lowercase (`a`–`z`), and 10 digits (`0`–`9`)
3. Set `type: 'map'` for standard character substitution
4. Assign `category`, `familySlug`, and `groupSlug` that match existing category pages
5. Characters that have no Unicode equivalent should be omitted (the renderer falls back to the original character)

---

## Adding New Pages

### Platform page (e.g., a new social network)
1. Create `/<platform>/index.html` following the existing platform page structure
2. Update `SITE_PAGES` in `styles.js`
3. Add to the sitemap (auto-generated on next workflow run)
4. Add redirect if needed in `_redirects`

### Category page
1. Create `/category/<slug>/index.html`
2. Update `CATEGORY_PAGES` in `styles.js`
3. Assign matching `familySlug` values in relevant styles

### Before building a page for a keyword: check who already owns it

High search volume alone is not sufficient justification for a new page. Before
creating a page/spoke targeting a specific keyword or query cluster, check
whether an existing page in the same locale — including that locale's own
hub/homepage — already targets and ranks for the same term (search its title,
H1, and meta for the exact phrase and close variants). If a hub page already
owns the term, a new spoke competes with it instead of adding coverage, and
search engines will consolidate onto whichever page has more authority
(usually the hub) — leaving the new page with near-zero traffic no matter how
deep its content is.

**Case study (2026-07-06):** `vi/chu-kieu/` was created in a batch of 5 new VN
pages, justified in the commit message purely by keyword volume — "chữ kiểu /
tạo chữ kiểu / chữ kiểu đẹp (90.5k/mo)." But the `/vi/` homepage had already
been deepened around this exact term 9 days earlier (2026-06-27) and was
already ranking for it — the same commit even cited "ranking pos 4-8 on the
chữ kiểu cluster" as part of its own rationale, evidence the term was already
being served, without checking that the homepage was the asset doing the
serving. The result: `vi/chu-kieu/` shipped as a strictly thinner duplicate of
the homepage's own "chữ kiểu" section (same H1 pattern, same how-to/A-Z-table/
diacritic-FAQ structure, none of the homepage's use-case/guide/expanded-FAQ
depth) and earned ~1 click across a full month of GSC data, while the
homepage absorbed effectively all of the term's traffic (840+ clicks in the
same window). Confirmed via the query×landing-page GSC cross-tab, not
assumed.

Deepen the existing page instead of building a new one, unless the new page
serves a genuinely different search intent (e.g. an informational/explainer
job, not another transactional/tool page on the same term).

---

## Localization Workflow — the English-Parent Rule

Every non-English page on this site should have a live English parent — the
same feature, category, symbol, or library page, already shipped at its
canonical `/…/` (non-locale-prefixed) URL, that the translation is *of*.
This is not a style preference; it's a structural invariant the rest of the
site leans on: `hreflang` clusters are built around one `x-default` (always
the EN URL), the `Translating a library/symbol page` rule above inherits the
translation's `page_type` from the EN source, and every cross-language demand
doc in this repo's history (`bio-font i18n`, `alt-codes translation demand`,
`library translation demand`, etc.) is written as "translate this EN page,"
never "invent this local page."

**Before creating any `<lang>/…` page (or a locale build of a feature that
doesn't yet exist in English), stop and check:** does a live English parent
already exist at the equivalent `/category/`, `/library/`, `/symbol/`,
`/usecase/`, `/guide/`, or `/answers/` URL?

- **Yes** → proceed as a translation: reuse the EN page's structure/JS
  wiring, translate the copy, and wire full reciprocal `hreflang` (every
  locale variant links every other variant, `x-default` points at the EN
  canonical). Missing reciprocity is a real, recurring bug on this site, not
  a hypothetical — see the case study below.
- **No** → do not build the localized page directly. Build the English
  version first (it usually also captures a bigger, unvalidated EN/global
  search pool the localized-only page would leave on the table), *then*
  translate. If the underlying thing is genuinely local-only — no English
  speaker would ever search for it — that's a legitimate exception, but it
  is a **discussed, explicit exception**, not a default. Raise it and agree
  on it before writing the page; don't decide unilaterally that "this one's
  different."

**Case study (2026-07-14):** the Polish quotation-mark page
(`pl/library/cudzyslow-polski/`) shipped natively, framed in its own research
doc as "no EN equivalent exists yet, so this is new content rather than
translation" — before `symbol/quotation-mark/` existed. The EN page was built
shortly after and both got cross-linked, but for a window the PL page had no
English parent and, separately, the eventual EN/ES/PL/TR cluster still
weren't fully reciprocal with each other or with a later-added Indonesian
translation (`id/library/simbol-kutip/`) — a live hreflang mesh gap on
exactly this page family, fixed 2026-07-14. Two failure modes from one
example: sequencing (locale-first, no parent) and reciprocity (parent exists,
mesh incomplete). Check both.

**When scoping a translation, also check for cannibalization**, not just
existence — if a broader page already covers the term, a narrow new page
can compete with it instead of adding coverage. (E.g.: don't split a
dedicated German small-caps page off from `de/kleine-schrift/`, which
already ranks for "Kapitälchen," without checking whether the split adds
net-new coverage or just fragments an existing ranking.)

---

## Build & Development

### Running locally
```bash
# No build step required — open index.html directly in a browser
# OR serve with any static file server:
npx serve .
python3 -m http.server 8080
```

### Sitemap regeneration
```bash
npm run prebuild   # Generates sitemap.xml
npm run build      # Same as prebuild (no other build step)
```

### Dependencies (build-time only)
```bash
npm install        # Installs cheerio (HTML parsing) and glob (file discovery)
```

---

## Automated Workflows

### `update-sitemap.yml`
- **Schedule**: Daily at 00:00 UTC
- **Action**: Runs `scripts/update-sitemap.js`, auto-commits `sitemap.xml` with `[skip ci]`
- **Do not** edit `sitemap.xml` manually — it will be overwritten

### `tweet-queue.yml`
- **Schedule**: Daily at 09:00 UTC (also triggerable manually)
- **Action**: Runs `scripts/tweet_queue.py`, posts qualifying commits as GitHub Issue comments
- Confidence threshold: 0.72 (favors HTML/CSS/guide changes; ignores lock files, lint, tests)

---

## SEO & Structured Data

Every page includes JSON-LD for:
- `WebApplication` or `WebSite` (homepage)
- `Organization`
- `BreadcrumbList`
- `FAQPage` (where applicable)

When editing page content, preserve and update the JSON-LD structured data to match. Use schema.org vocabulary.

---

## Testing

There is no automated test framework. Testing is manual and browser-based:
- `js/vertical/verticalLayouts.test.html` — manual test page for vertical layout module
- Test changes by opening HTML files in a browser

Do not add a test framework unless explicitly requested.

---

## Git Workflow

- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `UX:`)
- **PRs**: All changes go through pull requests; direct pushes to `master` are avoided
- **Branch naming**: `claude/<description>-<session-id>` for AI-generated branches
- **CI tags**: Use `[skip ci]` in auto-generated commit messages to prevent circular workflows
- **`sitemap.xml`**: Never manually edit — always auto-generated

---

## What NOT to Do

- Do not build a `<lang>/…` page for a feature/category/symbol/library topic
  that has no live English parent yet, without first raising it as an
  explicit, discussed exception. See "Localization Workflow — the
  English-Parent Rule" above.
- Do not create a new page for a high-volume keyword without first checking
  whether an existing page in that locale (especially its own hub/homepage)
  already targets and ranks for it. See "Before building a page for a
  keyword: check who already owns it" above — the `vi/chu-kieu/` case study
  is exactly this mistake.
- Do not add npm packages that run in the browser
- Do not introduce a JavaScript framework or bundler
- Do not generate images server-side or with an image-processing library. Visual/printable
  output (bubble/cursive sheets, curved text, etc.) is **client-side SVG/Canvas → SVG/PNG only**,
  built with native browser APIs, and must not bundle `.ttf`/`.otf` font binaries.
- Do not make a visual/printable feature the *default* answer for a query that copy-paste
  Unicode already serves — visual assets are the higher-intent follow-up, gated on real demand
- Do not build generic (non-text) worksheet/activity content under this brand — shape-only
  tracing, mazes, word searches, math worksheets, pre-writing motor strokes with no letterform.
  See "Printables scope boundary" above. This demand is real but tracked for a possible future,
  separate property — not this repo.
- Do not edit `sitemap.xml` directly
- Do not add `var` declarations — use `const`/`let`
- Do not use `import`/`export` ES module syntax in frontend scripts
- Do not bypass the IIFE module pattern for new JavaScript files
- Do not hardcode color values in CSS — use the existing custom property tokens
- Do not add inline `<style>` blocks to HTML pages — add to `style.css`
- Do not skip Google Tag Manager snippets when creating new pages
- Do not skip JSON-LD structured data when creating new pages
- Do not upload (or hand-author) a pin CSV in any schema other than Pinterest's.
  The internal inventory CSVs (`data/*_pins.csv`) are NOT importable. Only the
  `data/*_upload.csv` files are — generated solely via `scripts/pinterest_csv.py`
  / `scripts/build_pinterest_upload.py`. See `docs/pinterest-csv-format.md`.
- Do not create a new Pinterest board off-system. Read
  `docs/pinterest-pin-generation.md` ("Adding a new pin board") FIRST, every time.
  Specifically: do not put pins in a new top-level folder (e.g. `pinterest-kit/`)
  or under `docs/` — they go in `assets/pinterest/<board>/`; do not write a
  bespoke generator or visual template — mirror `scripts/generate-id-pins.py` and
  import the brand skin from `scripts/generate-site-art.py`; do not bundle `.ttf`
  font files; do not invent a pin look (no Poppins/pills/saturated colors/green
  CTA — use the off-white panel + dot grid + purple→blue brand skin).
