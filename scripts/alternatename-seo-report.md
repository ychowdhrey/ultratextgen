# Schema.org `alternateName` SEO Coverage Report

**Goal:** Maximize organic search reach by adding high-intent `alternateName` values
to JSON-LD structured data across all relevant SEO landing pages.

## Summary

| Metric | Before | After |
|---|---:|---:|
| Pages with `alternateName` | 24 | **305** |
| `index.html` files scanned | 337 | 337 |
| `alternateName` items total | ~110 | **~1,765** |

- **Files modified:** 282 `index.html` pages
- **alternateName values added across modified files:** 1,655 (4–8 per page)
- **JSON-LD validation:** all 305 entities parse as valid JSON; 0 errors, 0 warnings
- **Constraints verified:** every array has 4–8 items, no item > 60 chars, no duplicate
  items within an array, and `alternateName` never placed on `BreadcrumbList`,
  `FAQPage`, `Question`, `Answer`, `ListItem`, or `Organization`.

Run validation any time with:

```bash
python3 scripts/validate-alternatenames.py
```

## Pages updated (282)

| Section | Pages | Placement |
|---|---:|---|
| `library/*` (symbol & emoji reference) | 242 | `alternateName` added to existing `Article` entity (after `headline`) |
| `category/*` (font generators) | 19 | added to existing `WebApplication`, or new minimal `WebApplication` block where only `FAQPage`/`BreadcrumbList` existed |
| Social platform pages (`discord`, `instagram`, `linkedin`, `facebook`, `pinterest`, `snapchat`, `telegram`, `whatsapp`, `x`, `youtube`, `tiktok`) + `tiktok/name-generator`, `youtube/name-generator` | 13 | new minimal `WebApplication` block (pages previously had only `FAQPage`/`BreadcrumbList`) |
| `usecase/*` | 6 | added to existing `WebApplication`, or new block; `usecase/vertical-text` expanded 3 → 6 items |
| `roblox/*` (game) | 2 | `roblox/name-generator` added to existing `WebApplication`; `roblox/` hub got a new `WebApplication` block |

### Placement strategy
Following the requested priority order:
1. `WebApplication` present → `alternateName` added there.
2. `SoftwareApplication` → none exist in the repo.
3. Otherwise, for **tool/generator** pages whose only schema was `FAQPage` /
   `BreadcrumbList`, a minimal valid `WebApplication` block was inserted before
   `</head>` (mirroring the existing site convention) to carry `alternateName`.
4. For **library reference** pages (which use an `Article` entity describing the
   page), `alternateName` was added directly to that `Article`. `alternateName`
   is a valid `Thing`/`CreativeWork` property, so this avoids introducing a
   second, redundant entity per page. No `alternateName` was added to
   `BreadcrumbList` or `FAQPage`/`Question`.

### International pages (left intact — already localized)
The 10 translated index pages (`de`, `es`, `fr`, `id`, `it`, `nl`, `pl`, `pt`,
`tr`, `vi`) and the 10 translated `usecase/zalgo-text` pages already carried
**localized** `alternateName` values (e.g. `"Glitch-Textgenerator"`,
`"Generador de fuentes Unicode"`). These were validated and left unchanged to
avoid breaking multilingual targeting; canonical and hreflang were untouched.

## Pages skipped (32) and why

| Pages | Reason |
|---|---|
| `about`, `contact`, `privacy`, `terms` | Legal / utility pages — not search-variant landing pages. |
| `answers/*` (11 pages) | `QAPage`/FAQ format; the main entity is a `Question`, where `alternateName` is disallowed and semantically wrong. |
| `guide/*` (8 article pages) | Editorial long-form articles, not tool/keyword-variant landing pages. |
| `category/index`, `usecase/index`, `library/index`, `guide/index`, `answers/index` | Navigational hub/listing pages, not single-topic tools. |
| `embed/linkedin-headline-generator`, `usecase/linkedin-headline/embed` | Embeddable widget endpoints (not standalone SEO targets). |
| `tiktok/what-font-does-tiktok-use`, `youtube/what-font-does-youtube-use` | Informational FAQ pages (question intent, not tool-variant intent). |

## Pages needing manual review

None blocking. Optional future enhancements (deliberately out of scope here):
- `guide/*` and `answers/*` could gain a dedicated `WebPage`/`Article`
  `alternateName` set if the strategy expands to informational query variants.
- Hub pages (`category/`, `library/`, `usecase/`) could target head terms
  (e.g. "Font Categories", "Symbol Library") via an `ItemList`/`CollectionPage`
  `name`/`alternateName` if desired.
