# UltraTextGen — CSS Audit Report

_Generated: 2026-06-03T07:34:47.231Z_

> Advisory only. This audit changes no CSS. Items marked **NEEDS VERIFICATION** are uncertain — confirm in a browser and check JavaScript before moving or deleting anything.

## 1. Summary

| Metric | Value |
| --- | --- |
| HTML files scanned | 139 |
| CSS files | 6 |
| JS files scanned | 21 |
| Inline `style="..."` occurrences | 211 |
| Files containing inline styles | 77 |
| Inline risk (low / med / high) | 56 / 79 / 76 |
| `<style>` blocks in HTML | 5 |
| Unique HTML classes | 252 |
| Component class candidates | 86 |
| One-off class candidates | 142 |
| Repeated inline patterns | 15 |
| style.css selectors parsed | 365 |
| …referenced (HTML/JS/structural) | 364 |
| …unreferenced (needs verification) | 1 |

Page-type breakdown: other: 7, category: 17, localized: 20, platform: 11, embed: 1, guide: 10, library: 62, usecase: 11

## 2. Top Problems

1. **211 inline styles** across 77 files — the biggest maintainability drag. 56 are low-risk and safe to consolidate.
2. **15 repeated inline patterns** — e.g. `display:none; visibility:hidden` appears 71× and should become a utility class.
3. **5 `<style>` blocks** embedded in HTML — review whether any belong in style.css.
4. **1 style.css selectors** had no HTML/JS reference — possible dead CSS, but all marked *needs verification* (may be dynamic or generated).

## 3. Inline Style Findings

Files with the most inline styles (full list in `css-audit-data.json`):

| File | Inline styles |
| --- | --- |
| category/index.html | 34 |
| guide/index.html | 14 |
| usecase/index.html | 12 |
| linkedin/index.html | 10 |
| usecase/vertical-text/index.html | 10 |
| guide/linkedin-comments-guide/index.html | 8 |
| guide/personal-branding-through-typography/index.html | 8 |
| embed/linkedin-headline-generator/index.html | 7 |
| guide/stop-the-scroll-with-font-variation/index.html | 5 |
| guide/style-linkedin-hooks-to-stand-out/index.html | 5 |
| guide/what-font-does-linkedin-use/index.html | 5 |
| usecase/linkedin-bold/index.html | 5 |
| usecase/linkedin-headline/index.html | 4 |
| about/index.html | 3 |
| contact/index.html | 3 |
| guide/vertical-text-guide/index.html | 3 |
| privacy/index.html | 3 |
| terms/index.html | 3 |
| usecase/bio-font/index.html | 3 |
| usecase/text-to-emoji/index.html | 3 |
| category/classified/index.html | 2 |
| discord/index.html | 2 |
| library/index.html | 2 |
| usecase/before-after-emoji/index.html | 2 |
| usecase/comment-font/index.html | 2 |

Sample occurrences with risk classification:

| File | Line | Snippet | Risk |
| --- | --- | --- | --- |
| 404.html | 39 | style="display:none;visibility:hidden" | high |
| about/index.html | 60 | style="display:none;visibility:hidden" | high |
| about/index.html | 66 | style="max-width:800px;" | medium |
| about/index.html | 73 | style="max-width:900px;" | medium |
| category/bold-fonts/bold/index.html | 108 | style="display:none;visibility:hidden" | high |
| category/bold-fonts/bold-italic/index.html | 108 | style="display:none;visibility:hidden" | high |
| category/bold-fonts/index.html | 142 | style="display:none;visibility:hidden" | high |
| category/bubble-fonts/circle/index.html | 108 | style="display:none;visibility:hidden" | high |
| category/bubble-fonts/index.html | 150 | style="display:none;visibility:hidden" | high |
| category/classified/index.html | 102 | style="display:none;visibility:hidden" | high |
| category/classified/index.html | 153 | style="display: none;" | high |
| category/cursive-fonts/index.html | 150 | style="display:none;visibility:hidden" | high |
| category/cursive-fonts/script/index.html | 108 | style="display:none;visibility:hidden" | high |
| category/gothic-fonts/fraktur/index.html | 108 | style="display:none;visibility:hidden" | high |
| category/gothic-fonts/index.html | 150 | style="display:none;visibility:hidden" | high |
| category/index.html | 118 | style="display:none;visibility:hidden" | high |
| category/index.html | 130 | style="max-width:800px;" | medium |
| category/index.html | 141 | style="max-width:900px;" | medium |
| category/index.html | 146 | style="text-align:center;color:var(--text-secondary);margin-bottom:1.5rem;font-size:0.95r… | medium |
| category/index.html | 160 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 165 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 170 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 175 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 180 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 185 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |

Risk legend: **low** = low risk — safe to move into style.css; **medium** = medium risk — check visually before changing; **high** = high risk — likely page-specific or interactive, do not move blindly.

## 4. `<style>` Block Findings

| File | Line | CSS lines | Assessment | Risk |
| --- | --- | --- | --- | --- |
| embed/linkedin-headline-generator/index.html | 52 | 70 | page-specific | medium |
| js/vertical/verticalLayouts.test.html | 7 | 6 | page-specific | low |
| library/index.html | 57 | 404 | page-specific | high |
| usecase/linkedin-headline/embed/index.html | 43 | 74 | page-specific | medium |
| usecase/text-to-emoji/index.html | 138 | 125 | page-specific | medium |

## 5. CSS File Inventory

| File | Size | Lines | Inferred purpose |
| --- | --- | --- | --- |
| style.css | 50.5 KB | 2455 | global site stylesheet |
| usecase/zalgo-text/zalgo-text.css | 10.9 KB | 514 | page-specific usecase styling |
| 404.css | 8.1 KB | 401 | error page styling |
| discord/discord-context.css | 5.4 KB | 210 | platform-specific (Discord) styling |
| symbol-explorer.css | 5.2 KB | 244 | symbol explorer feature styling |
| usecase/bio-font/bio-font.css | 5.1 KB | 239 | page-specific usecase styling |

## 6. Reusable Component Candidates

Classes used on ≥ 5 pages — strong candidates for shared components in style.css:

| Class | Pages | Occurrences |
| --- | --- | --- |
| hero-headline | 136 | 136 |
| hero | 134 | 134 |
| footer | 124 | 124 |
| footer-inner | 124 | 124 |
| hero-inner | 123 | 123 |
| editorial-section | 108 | 318 |
| hero-tagline | 100 | 100 |
| editorial-block | 82 | 227 |
| cta-card | 79 | 83 |
| cta-btn | 79 | 83 |
| article-section-label | 72 | 562 |
| compare-grid | 70 | 89 |
| compare-card | 70 | 351 |
| variant-muted | 70 | 327 |
| section-divider | 70 | 484 |
| mood-explainers | 67 | 439 |
| symbol-tile | 60 | 4630 |
| symbol-toast | 60 | 60 |
| flag-rows | 59 | 344 |
| flag-row | 59 | 4097 |
| flag-emoji | 59 | 4097 |
| flag-label | 59 | 4081 |
| u-no-underline | 58 | 246 |
| container | 54 | 67 |
| breadcrumbs | 50 | 50 |

### Repeated inline patterns → utility class candidates

| Pattern | Count | Suggested utility | Risk |
| --- | --- | --- | --- |
| display:none; visibility:hidden | 71 | u-hidden (verify JS toggling first) | high |
| text-decoration:none | 29 | u-no-underline | low |
| align-items:stretch; flex-direction:column; gap:8px | 20 | (propose a utility/component class) | medium |
| color:var(--text-primary); font-weight:600; text-decor… | 10 | (propose a utility/component class) | medium |
| align-items:stretch; flex-direction:column; gap:12px | 10 | (propose a utility/component class) | medium |
| color:var(--text-secondary); font-size:0.875rem; line-… | 10 | u-text-secondary | medium |
| max-width:800px | 8 | u-maxw-* | medium |
| max-width:900px | 8 | u-maxw-* | medium |
| font-size:1.35rem | 6 | u-fs-* | low |
| display:none | 5 | u-hidden (verify JS toggling first) | high |
| margin-top:2rem | 5 | u-mt-* | low |
| margin-top:1rem | 4 | u-mt-* | low |
| border-bottom:2px solid rgba(255,255,255,0.15); paddin… | 4 | u-text-left | medium |
| padding:0.75rem | 4 | (propose a utility/component class) | low |
| color:var(--text-secondary); font-size:0.925rem; margi… | 3 | u-mb-* | medium |

### One-off classes (used on a single page)

142 classes appear on only one page — likely genuinely page-specific. Top 15 shown; full list in JSON.

| Class | Occurrences |
| --- | --- |
| accordion-body | 4 |
| accordion-section | 4 |
| accordion-toggle | 4 |
| aesthetic-card-desc | 16 |
| aesthetic-card-symbols | 7 |
| alpha-count | 1 |
| bf-chip-grid | 1 |
| bf-compat | 1 |
| bf-counter | 1 |
| bf-platform-row | 1 |
| bf-platform-tab | 11 |
| bf-preview | 1 |
| bf-preview-avatar | 1 |
| bf-preview-bio | 1 |
| bf-preview-head | 1 |

## 7. Possible Unused CSS (NEEDS VERIFICATION)

Selectors in `style.css` with **no** HTML reference and **no** strict JS reference. These are NOT confirmed dead — a class may be injected dynamically, built from a template string, or used by a page not yet scanned. **Verify before removing.**

| Selector | Line | Verdict | Note |
| --- | --- | --- | --- |
| .variation-char-over | 2018 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |

JS class-reference tokens collected: 193 (strict). These were used to avoid falsely flagging JS-driven CSS.

## 8. Recommended Next Actions

1. **Tackle low-risk repeated inline patterns first.** Introduce a small set of utility classes (see §6) for the most-repeated declarations and replace inline usage.
2. **Leave high-risk inline styles (`display:none`, `visibility:hidden`, positioning) alone** until you confirm they are not toggled by JavaScript.
3. **Review `<style>` blocks (§4):** fold any "possibly reusable" blocks into style.css; keep page-specific/animation blocks where they are or move to a dedicated page CSS file.
4. **Do not delete any §7 selector** without first grepping JS and checking the live page. Treat that list as a to-investigate queue, not a delete list.
5. **Re-run `npm run audit:css` after every batch** and after adding new pages to track drift.

## 9. Recommended PR Sequence

**PR 1 — Utility classes (low risk):** add utility classes to style.css for the top repeated low-risk patterns (text-align, margins, text-decoration, secondary text color). No behavior change.

**PR 2 — Replace inline usage (low risk, mechanical):** swap low-risk inline styles for the new utility classes, one page-type at a time (platform → usecase → guide → category → library → localized).

**PR 3 — Consolidate `<style>` blocks (medium risk):** move reusable embedded CSS into style.css; verify each affected page visually.

**PR 4 — Investigate unused selectors (medium risk):** confirm §7 selectors against JS and live pages, then remove only the confirmed-dead ones.

**PR 5 — Audit guardrail:** wire `npm run audit:css` into CI or a pre-commit check so regressions surface automatically as new pages are added.


---
_Re-run anytime with_ `npm run audit:css`. _Both report files regenerate from scratch._
