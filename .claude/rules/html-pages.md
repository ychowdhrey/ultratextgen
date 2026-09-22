---
paths:
  - "**/*.html"
---

# Every page carries this furniture

Deeper reference: `docs/architecture/faq-schema.md` (the drift history and the
runtime-rewrite case), `docs/architecture/frontend-runtime.md` (load order and
pre-rendering), `docs/architecture/page-art.md` (the art pipeline),
`docs/architecture/content-lanes.md` §5 (the `updates/` pillar and its pills).

## Required in every page

1. **Google Tag Manager** snippet in `<head>` and `<body>`. Never skip it.
2. **Canonical URL** meta tag.
3. **OpenGraph + Twitter Card** meta.
4. **JSON-LD structured data** — `WebApplication`/`WebSite`, `Organization`,
   `BreadcrumbList`, and `FAQPage` where applicable. Never skip it, and keep it
   updated to match the content when you edit the page.
5. **Script load order**, and it is load-bearing.** The contract is not a fixed
   list**: every share/save module tag must precede the **first host script** —
   `script.js`, `symbol-explorer.js`, `printablesEngine.js` and the other entries in
   `HOST_SCRIPTS` (`scripts/lib/share-save-tags.js`). `header.js`, `styles.js` and
   `renderer.js` are **not** hosts and normally come first, all `defer`. A live page
   looks like this:

   ```html
   <script src="/header.js" defer></script>
   <script src="/styles.js" defer></script>
   <script src="/renderer.js" defer></script>
   <script src="/js/share/share-core.js" defer></script>
   <script src="/js/saved/saved-items.js" defer></script>
   <script src="/script.js" defer></script>
   ```

   The modules are dependency-free; `script.js`'s init calls into `share-core.js`, so
   a module tag placed after its host makes the generator throw and render zero cards.
   **A printables page owes a third module**, `/js/printables/printPrefs.js`, tagged
   **without `defer` on purpose** — some pages load `printablesEngine.js` as a classic
   script and read `printPrefs` at top level.

   **Never hand-place these tags.** `npm run inject:share-save-tags` positions them and
   `npm run check:share-save-tags` gates presence **and order**.
6. **Dark mode** via a `dark` class on `<html>`, never a `prefers-color-scheme`
   media query.
7. No inline `<style>` blocks and no inline styles — add to `style.css`.
8. **The AdSense loader** in `<head>` (`npm run check:ads`) and **the Funding Choices
   tag** (`npm run check:funding-choices`). Both gate site-wide. Two classes must
   carry **no** loader — `404.html` and iframe sources (`<tool>/embed/index.html`);
   see `.claude/rules/ads-and-monetization.md`.

**A file with an `<html>` element is a page.** Two tracked `.html` files are not —
a search-engine verification stub that must stay byte-exact, and a script fragment
under `scripts/`. Neither takes any of the furniture above.

## Structured data must mirror what the reader sees

`FAQPage`/`QAPage` JSON-LD may only contain questions and answers the page
actually renders. Content inside an accordion or `<details>` counts as visible;
content that exists only in the JSON-LD does not.

The rule cuts both ways and both halves have failed here:

- **Never add FAQ schema for Q&A the page doesn't render.** If the copy is worth
  marking up, put it on the page.
- **Never edit or trim a visible FAQ without updating the JSON-LD.** The stale half
  is the more common failure, and **paraphrase is not a match** — the comparison is
  on the actual strings.

House markup is either the JS-bound accordion
(`<div class="faq-item"><button class="faq-question">` + `.faq-answer`) or the
JS-free disclosure (`<details class="faq-item"><summary class="faq-question">`).
Prefer `<details>` on any page that does not load `/script.js`.

`npm run audit:faq-schema` is the whole-site picture; `npm run check:faq-schema` gates
every page a PR touches.

**Never hand-write a schema.org `citation` array or hand-edit a Sources block's
JSON-LD** — it is generated from the block so the two cannot drift.

## The payload must exist in static HTML

Several search and AI crawlers execute no JavaScript, so a page whose payload is
built on load ships a heading above nothing. A page that renders a **collection
grid** or a **country-flag tile grid** carries its pre-rendered block:
`npm run prerender:collection-grids -- --write` / `npm run prerender:country-flags -- --write`.
Never hand-edit a pre-rendered block, and never add a second copy of the markup to
a generator — `gridSectionsHTML()` and `countryFlagRowsHTML` in
`symbol-explorer.js` are their single owners.

## Art ships in the same change

A new or edited page's `og:image`, `twitter:image` and declared hero figure must
point at files that **exist on disk in the same commit**. Googlebot fetches new
pages within hours of the sitemap picking them up; a 404 on that first fetch is
recorded before any later fix lands. Never rely on a follow-up "generate the
missing art" pass. Run `npm run check:new-page-images` before opening the PR, and
use the `page-art` skill to generate.

## `updates/` entries: exactly one verification date

One verification date per entry, as the **last `guide-pill`**, agreeing with the
page's own `datePublished`. **No verification stamp in body prose.** Three kinds of
date live on these pages and only one is a stamp:

| kind | example | where |
|---|---|---|
| **stamp** | "Last checked September 1, 2026" | the pill, page-level |
| **scoped** | "As of September 2, 2026 no date has been announced" | **stays inline** |
| **factual** | "Unicode 18.0 publishes on September 16, 2026" | ordinary content |

`dateModified` is not a verification date and must not be used as one. Locale
entries carry **one** localized pill and no `Published` half, and its date must
equal the EN parent's `Verified` date.

## Accessibility and copy rules also apply here

See `.claude/rules/accessibility.md` and `.claude/rules/editorial-copy.md` — both
scope to the same files.
