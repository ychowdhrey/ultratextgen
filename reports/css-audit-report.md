# UltraTextGen — CSS Audit Report

_Generated: 2026-05-28T09:32:34.841Z_

> Advisory only. This audit changes no CSS. Items marked **NEEDS VERIFICATION** are uncertain — confirm in a browser and check JavaScript before moving or deleting anything.

## 1. Summary

| Metric | Value |
| --- | --- |
| HTML files scanned | 136 |
| CSS files | 5 |
| JS files scanned | 20 |
| Inline `style="..."` occurrences | 414 |
| Files containing inline styles | 113 |
| Inline risk (low / med / high) | 41 / 300 / 73 |
| `<style>` blocks in HTML | 5 |
| Unique HTML classes | 224 |
| Component class candidates | 83 |
| One-off class candidates | 120 |
| Repeated inline patterns | 17 |
| style.css selectors parsed | 364 |
| …referenced (HTML/JS/structural) | 333 |
| …unreferenced (needs verification) | 31 |

Page-type breakdown: other: 7, category: 17, localized: 20, platform: 11, embed: 1, guide: 8, library: 62, usecase: 10

## 2. Top Problems

1. **414 inline styles** across 113 files — the biggest maintainability drag. 41 are low-risk and safe to consolidate.
2. **17 repeated inline patterns** — e.g. `color:var(--text-secondary); margin-bottom:0.5rem` appears 211× and should become a utility class.
3. **5 `<style>` blocks** embedded in HTML — review whether any belong in style.css.
4. **31 style.css selectors** had no HTML/JS reference — possible dead CSS, but all marked *needs verification* (may be dynamic or generated).

## 3. Inline Style Findings

Files with the most inline styles (full list in `css-audit-data.json`):

| File | Inline styles |
| --- | --- |
| category/index.html | 34 |
| guide/index.html | 12 |
| library/body-language-emojis/index.html | 11 |
| usecase/index.html | 11 |
| library/face-emojis/index.html | 10 |
| usecase/vertical-text/index.html | 10 |
| guide/linkedin-comments-guide/index.html | 8 |
| guide/personal-branding-through-typography/index.html | 8 |
| library/animal-emojis/index.html | 8 |
| library/arrow-symbols/index.html | 8 |
| library/currency-symbols/index.html | 8 |
| library/math-symbols/index.html | 8 |
| library/weather-symbols/index.html | 8 |
| embed/linkedin-headline-generator/index.html | 7 |
| library/card-suit-symbols/index.html | 7 |
| library/music-symbols/index.html | 7 |
| library/number-symbols/index.html | 7 |
| library/achievement-symbols/index.html | 6 |
| library/awareness-ribbons/index.html | 6 |
| library/bracket-symbols/index.html | 6 |
| library/bullet-point-symbols/index.html | 6 |
| library/checkmark-symbols/index.html | 6 |
| library/email-symbols/index.html | 6 |
| library/flower-symbols/index.html | 6 |
| library/geometric-symbols/index.html | 6 |

Sample occurrences with risk classification:

| File | Line | Snippet | Risk |
| --- | --- | --- | --- |
| 404.html | 38 | style="display:none;visibility:hidden" | high |
| about/index.html | 59 | style="display:none;visibility:hidden" | high |
| about/index.html | 65 | style="max-width:800px;" | medium |
| about/index.html | 72 | style="max-width:900px;" | medium |
| category/bold-fonts/bold/index.html | 107 | style="display:none;visibility:hidden" | high |
| category/bold-fonts/bold-italic/index.html | 107 | style="display:none;visibility:hidden" | high |
| category/bold-fonts/index.html | 141 | style="display:none;visibility:hidden" | high |
| category/bubble-fonts/circle/index.html | 107 | style="display:none;visibility:hidden" | high |
| category/bubble-fonts/index.html | 149 | style="display:none;visibility:hidden" | high |
| category/classified/index.html | 101 | style="display:none;visibility:hidden" | high |
| category/classified/index.html | 152 | style="display: none;" | high |
| category/cursive-fonts/index.html | 149 | style="display:none;visibility:hidden" | high |
| category/cursive-fonts/script/index.html | 107 | style="display:none;visibility:hidden" | high |
| category/gothic-fonts/fraktur/index.html | 107 | style="display:none;visibility:hidden" | high |
| category/gothic-fonts/index.html | 149 | style="display:none;visibility:hidden" | high |
| category/index.html | 117 | style="display:none;visibility:hidden" | high |
| category/index.html | 129 | style="max-width:800px;" | medium |
| category/index.html | 140 | style="max-width:900px;" | medium |
| category/index.html | 145 | style="text-align:center;color:var(--text-secondary);margin-bottom:1.5rem;font-size:0.95r… | medium |
| category/index.html | 159 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 164 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 169 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 174 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 179 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |
| category/index.html | 184 | style="color:var(--text-primary);font-weight:600;text-decoration:underline;" | medium |

Risk legend: **low** = low risk — safe to move into style.css; **medium** = medium risk — check visually before changing; **high** = high risk — likely page-specific or interactive, do not move blindly.

## 4. `<style>` Block Findings

| File | Line | CSS lines | Assessment | Risk |
| --- | --- | --- | --- | --- |
| embed/linkedin-headline-generator/index.html | 51 | 70 | page-specific | medium |
| js/vertical/verticalLayouts.test.html | 7 | 6 | page-specific | low |
| library/index.html | 56 | 404 | page-specific | high |
| usecase/linkedin-headline/embed/index.html | 42 | 74 | page-specific | medium |
| usecase/text-to-emoji/index.html | 137 | 125 | page-specific | medium |

## 5. CSS File Inventory

| File | Size | Lines | Inferred purpose |
| --- | --- | --- | --- |
| style.css | 48.5 KB | 2360 | global site stylesheet |
| usecase/zalgo-text/zalgo-text.css | 10.9 KB | 514 | page-specific usecase styling |
| 404.css | 8.1 KB | 401 | error page styling |
| discord/discord-context.css | 5.4 KB | 210 | platform-specific (Discord) styling |
| symbol-explorer.css | 5.2 KB | 244 | symbol explorer feature styling |

## 6. Reusable Component Candidates

Classes used on ≥ 5 pages — strong candidates for shared components in style.css:

| Class | Pages | Occurrences |
| --- | --- | --- |
| hero-headline | 133 | 133 |
| hero | 131 | 131 |
| footer | 122 | 122 |
| footer-inner | 122 | 122 |
| hero-inner | 120 | 120 |
| editorial-section | 105 | 298 |
| hero-tagline | 97 | 97 |
| editorial-block | 79 | 203 |
| cta-card | 77 | 79 |
| cta-btn | 77 | 79 |
| article-section-label | 69 | 541 |
| section-divider | 68 | 472 |
| mood-explainers | 67 | 437 |
| compare-grid | 66 | 85 |
| compare-card | 66 | 337 |
| variant-muted | 66 | 314 |
| symbol-tile | 60 | 4630 |
| symbol-toast | 60 | 60 |
| flag-rows | 59 | 344 |
| flag-row | 59 | 4097 |
| flag-emoji | 59 | 4097 |
| flag-label | 59 | 4081 |
| u-no-underline | 58 | 246 |
| container | 53 | 59 |
| breadcrumbs | 47 | 47 |

### Repeated inline patterns → utility class candidates

| Pattern | Count | Suggested utility | Risk |
| --- | --- | --- | --- |
| color:var(--text-secondary); margin-bottom:0.5rem | 211 | u-mb-* | medium |
| display:none; visibility:hidden | 68 | u-hidden (verify JS toggling first) | high |
| align-items:stretch; flex-direction:column; gap:8px | 17 | (propose a utility/component class) | medium |
| text-decoration:none | 17 | u-no-underline | low |
| color:var(--text-secondary); margin-bottom:1.5rem | 13 | u-mb-* | medium |
| color:var(--text-primary); font-weight:600; text-decor… | 10 | (propose a utility/component class) | medium |
| align-items:stretch; flex-direction:column; gap:12px | 10 | (propose a utility/component class) | medium |
| color:var(--text-secondary); font-size:0.875rem; line-… | 10 | u-text-secondary | medium |
| max-width:800px | 8 | u-maxw-* | medium |
| max-width:900px | 8 | u-maxw-* | medium |
| display:none | 5 | u-hidden (verify JS toggling first) | high |
| margin-top:2rem | 5 | u-mt-* | low |
| font-size:1.35rem | 4 | u-fs-* | low |
| margin-top:1rem | 4 | u-mt-* | low |
| border-bottom:2px solid rgba(255,255,255,0.15); paddin… | 4 | u-text-left | medium |
| padding:0.75rem | 4 | (propose a utility/component class) | low |
| color:var(--text-secondary); font-size:0.925rem; margi… | 3 | u-mb-* | medium |

### One-off classes (used on a single page)

120 classes appear on only one page — likely genuinely page-specific. Top 15 shown; full list in JSON.

| Class | Occurrences |
| --- | --- |
| accordion-body | 4 |
| accordion-section | 4 |
| accordion-toggle | 4 |
| aesthetic-card-desc | 16 |
| aesthetic-card-symbols | 7 |
| alpha-count | 1 |
| breakdown-grid | 1 |
| breakdown-note | 1 |
| breakdown-section | 1 |
| breakdown-toggle | 1 |
| cat-anchor | 10 |
| cat-overview-table | 1 |
| categories-glance | 1 |
| categories-glance-grid | 1 |
| categories-glance-heading | 1 |

## 7. Possible Unused CSS (NEEDS VERIFICATION)

Selectors in `style.css` with **no** HTML reference and **no** strict JS reference. These are NOT confirmed dead — a class may be injected dynamically, built from a template string, or used by a page not yet scanned. **Verify before removing.**

| Selector | Line | Verdict | Note |
| --- | --- | --- | --- |
| .footer-links | 654 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .footer-nav-links | 663 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .how-to-use | 965 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .why-section | 965 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .tips-section | 965 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .how-to-use h2 | 1013 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .why-section h2 | 1013 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .tips-section h2 | 1013 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .why-content p | 1070 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .how-to-use h2 | 1177 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .why-section h2 | 1177 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .tips-section h2 | 1177 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .header-breadcrumb | 1458 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .header-breadcrumb a | 1466 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .helper-chip | 1819 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .chip | 1819 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .helper-chip:hover | 1832 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .chip:hover | 1832 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .btn-primary | 1862 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .btn-primary:disabled | 1877 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .btn-primary:not(:disabled):hover | 1882 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .variation-char-count | 1886 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .char-count-small | 1886 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .variation-char-over | 1894 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .char-warning | 1906 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .text-warning | 1906 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .jump-links | 1994 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .jump-links a | 2002 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .jump-links a:hover | 2014 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .section-head | 2020 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .lede | 2025 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |

JS class-reference tokens collected: 144 (strict). These were used to avoid falsely flagging JS-driven CSS.

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
