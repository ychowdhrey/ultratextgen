---
paths:
  - "{sitemap.xml,_root.html,llms.txt,README.md}"
  - "**/llms.txt"
  - "{library,symbol}/index.html"
  - "*/{library,symbol}/index.html"
  - "docs/README.md"
  - "data/{sitemap-lastmod-cache,generated_page_art,og_style_registry,locale_glossary,editorial_footprint_baseline}.json"
  - "assets/{og,hero,specimen,printables-previews}/**"
  - "js/printables/cursiveRouteData.js"
---

# Generated artifacts have a generator, not an editor

A hand edit to a generated region is undone by the next run, and in the meantime it
is a second source of truth. When you find one of these, find its generator.

| Artifact | Generator | Gate |
|---|---|---|
| `sitemap.xml` | `npm run prebuild` (`scripts/update-sitemap.js`) — daily workflow, auto-commits with `[skip ci]` | `test:sitemap-images`, `test:content-significance` |
| `llms.txt` (whole tree, 85 files) | `npm run build:llms -- --write` | `check:llms` (whole-tree) |
| `library/index.html` directory block | `npm run build:library-directory` | `check:library-directory` |
| `<lang>/library/index.html` | `node scripts/build-library-hub.js` — derives entries from **each page's own markup**, so it needs no hand-help | `check:library-hub`, `check:library-hub-parity` |
| the static footer block | `npm run build:static-footer` | `check:static-footer` |
| the accent notice | `npm run build:accent-notice` | `check:accent-notice` |
| the `@font-face` block in `style.css` | `python3 scripts/build-font-face-css.py --write` | — |
| hero SVG + OG PNG | `scripts/generate-site-art.py --only <slug>` / `wire-site-art.py` | `check:new-page-images` |
| per-style OG cards | `scripts/generate-style-og-cards.py` | — |
| `js/printables/cursiveRouteData.js` (a cursive phrase's writing route) | `node scripts/build-cursive-routes.js --write` from `scripts/lib/cursive-route-spec.js`; it refuses to write a route that leaves the ink or skips a stroke | `--check` (build-time, needs a browser driver) |
| printables sheet previews (`assets/printables-previews/*.png` and the `<img>` in each page's preview box) | `node scripts/capture-printables-previews.js --only <slug>` (page 1 of the page's own PDF, headless Chromium), then `python3 scripts/wire-printables-previews.py --write` | `test:sitemap-images` |
| a study's downloadable PDF (`research/<study>.pdf`) | `node scripts/build-research-pdf.js --study <study>` — prints the study page itself (its `@media print` rules in `style.css`), so the PDF carries the page's own text; re-run it in the same change as any edit to the page, or the two drift | — (build-time, needs a browser driver) |
| pre-rendered collection grids | `npm run prerender:collection-grids -- --write` | `check:collection-grids` |
| pre-rendered country-flag tiles | `npm run prerender:country-flags -- --write` | `check:country-flags` |
| `symbol/` hub↔spoke and peer↔peer cards | `npm run sync:symbol-peer-links` | `check:new-symbol-peer-links` |
| hreflang blocks and locale-native links | `npm run sync:locale-mesh -- --fix --files …` | `check:locale-mesh`, `check:hreflang*` |
| CTA cards | `npm run route:cta-cards -- --write` | `test:cta-routing` |
| Sources-block JSON-LD | `npm run fix:source-attribution -- --write` | `check:source-attribution` |
| the gate inventory in `docs/README.md` | `npm run build:gate-inventory` | `check:gate-inventory` |
| `README.md` page lists | `npm run sync-readme` | the weekly workflow |
| `_root.html` | `npm run build` (a copy of `index.html`) | — |

## Two traps

- **`build-locale-library-directory.js` is superseded.** It reports `19 skipped — no
  LIBRARY array / render block to drive` on every locale hub, because all 19 have
  migrated to `window.UTG_LIBRARY_HUB`. It is still gated on, so keep running it,
  but do not reach for it to fix a locale hub — that is
  `scripts/build-library-hub.js`. EN is now the only page carrying a `LIBRARY`
  array.
- **Pre-rendering promotes a stale entry from invisible to crawlable.** A leftover
  entry pointing at a moved URL costs nothing while a hub renders client-side; once
  pre-rendered it is a real `<a href>` to a 301. Clear the stale entry *before*
  regenerating, or the generator ships the link.

## Regenerate scoped, and read the diff

`generate-site-art.py` **refuses a bare run**. `--only <slug>` matches by **prefix,
not exact slug**, so `--only answers` regenerates every `answers-*` page. When you
mean an exact set, check `git status` against the set you intended and revert the
surplus. Details: `docs/architecture/page-art.md`.

A site-wide `sync-locale-mesh --fix` is intentionally unscoped: review its diff and
revert out-of-scope edits rather than shipping them as drive-by fixes.
