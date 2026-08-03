# UltraTextGen — CSS Audit Report

_Generated: 2026-08-03T02:50:45.737Z_

> Advisory only. This audit changes no CSS. Items marked **NEEDS VERIFICATION** are uncertain — confirm in a browser and check JavaScript before moving or deleting anything.

## 1. Summary

| Metric | Value |
| --- | --- |
| HTML files scanned | 3804 |
| CSS files | 17 |
| JS files scanned | 130 |
| Inline `style="..."` occurrences | 9040 |
| Files containing inline styles | 3802 |
| Inline risk (low / med / high) | 636 / 876 / 7528 |
| `<style>` blocks in HTML | 11 |
| Unique HTML classes | 724 |
| Component class candidates | 376 |
| One-off class candidates | 248 |
| Repeated inline patterns | 26 |
| style.css selectors parsed | 1493 |
| …referenced (HTML/JS/structural) | 1328 |
| …unreferenced (needs verification) | 165 |

Page-type breakdown: other: 1441, category: 26, embed: 8, localized: 1902, platform: 13, guide: 33, library: 337, usecase: 44

## 2. Top Problems

1. **9040 inline styles** across 3802 files — the biggest maintainability drag. 636 are low-risk and safe to consolidate.
2. **26 repeated inline patterns** — e.g. `display:none; visibility:hidden` appears 3801× and should become a utility class.
3. **11 `<style>` blocks** embedded in HTML — review whether any belong in style.css.
4. **165 style.css selectors** had no HTML/JS reference — possible dead CSS, but all marked *needs verification* (may be dynamic or generated).

## 3. Inline Style Findings

Files with the most inline styles (full list in `css-audit-data.json`):

| File | Inline styles |
| --- | --- |
| category/index.html | 66 |
| fi/kaunokirjoitus/index.html | 50 |
| category/cursive-fonts/index.html | 49 |
| de/schreibschrift/index.html | 49 |
| es/letra-cursiva/index.html | 49 |
| fr/ecriture-cursive/index.html | 49 |
| id/tulisan-sambung/index.html | 49 |
| it/lettere-in-corsivo/index.html | 49 |
| nl/cursieve-letters/index.html | 49 |
| no/kursiv-tekst/index.html | 49 |
| pt/letra-cursiva/index.html | 49 |
| tr/el-yazisi-fontu/index.html | 49 |
| guide/index.html | 36 |
| usecase/index.html | 35 |
| guide/personal-branding-through-typography/index.html | 10 |
| embed/index.html | 9 |
| guide/linkedin-comments-guide/index.html | 9 |
| printables/monogram-maker/index.html | 9 |
| roblox/name-generator/index.html | 9 |
| guide/comments-that-stand-out/index.html | 8 |
| ar/guide/index.html | 7 |
| bs/guide/index.html | 7 |
| cs/guide/index.html | 7 |
| da/guide/index.html | 7 |
| de/guide/index.html | 7 |

Sample occurrences with risk classification:

| File | Line | Snippet | Risk |
| --- | --- | --- | --- |
| 404.html | 84 | style="display:none;visibility:hidden" | high |
| 404.html | 4 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| about/index.html | 102 | style="display:none;visibility:hidden" | high |
| about/index.html | 109 | style="max-width:800px;" | medium |
| about/index.html | 122 | style="max-width:900px;" | medium |
| about/index.html | 4 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/can-you-search-fancy-text/index.html | 196 | style="display:none;visibility:hidden" | high |
| answers/can-you-search-fancy-text/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/change-font-size-on-facebook/index.html | 183 | style="display:none;visibility:hidden" | high |
| answers/change-font-size-on-facebook/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/christmas-card-what-to-write/index.html | 177 | style="display:none;visibility:hidden" | high |
| answers/christmas-card-what-to-write/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/cny-greetings-what-to-say/index.html | 184 | style="display:none;visibility:hidden" | high |
| answers/cny-greetings-what-to-say/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/discord-allowed-characters/index.html | 256 | style="display:none;visibility:hidden" | high |
| answers/discord-allowed-characters/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/diwali-wishes-what-to-say/index.html | 184 | style="display:none;visibility:hidden" | high |
| answers/diwali-wishes-what-to-say/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-fancy-fonts-work-on-iphone/index.html | 196 | style="display:none;visibility:hidden" | high |
| answers/do-fancy-fonts-work-on-iphone/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-fancy-fonts-work-with-arabic/index.html | 196 | style="display:none;visibility:hidden" | high |
| answers/do-fancy-fonts-work-with-arabic/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-fancy-fonts-work-with-vietnamese/index.html | 181 | style="display:none;visibility:hidden" | high |
| answers/do-fancy-fonts-work-with-vietnamese/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-you-need-nitro-for-discord-fonts/index.html | 272 | style="display:none;visibility:hidden" | high |

Risk legend: **low** = low risk — safe to move into style.css; **medium** = medium risk — check visually before changing; **high** = high risk — likely page-specific or interactive, do not move blindly.

## 4. `<style>` Block Findings

| File | Line | CSS lines | Assessment | Risk |
| --- | --- | --- | --- | --- |
| ar/library/index.html | 99 | 28 | page-specific | low |
| es/library/index.html | 161 | 404 | page-specific | high |
| fr/library/index.html | 159 | 404 | page-specific | high |
| id/library/index.html | 159 | 404 | page-specific | high |
| it/library/index.html | 165 | 404 | page-specific | high |
| js/decorator/decoratorEngine.test.html | 7 | 8 | page-specific | low |
| js/vertical/verticalLayouts.test.html | 7 | 6 | page-specific | low |
| ko/library/index.html | 177 | 402 | page-specific | high |
| library/index.html | 118 | 404 | page-specific | high |
| pt/library/index.html | 159 | 404 | page-specific | high |
| tr/library/index.html | 160 | 404 | page-specific | high |

## 5. CSS File Inventory

| File | Size | Lines | Inferred purpose |
| --- | --- | --- | --- |
| style.css | 204.3 KB | 8467 | global site stylesheet |
| usecase/zalgo-text/zalgo-text.css | 16.5 KB | 802 | page-specific usecase styling |
| usecase/before-after-emoji/before-after-emoji.css | 11.4 KB | 510 | page-specific usecase styling |
| 404.css | 8.1 KB | 401 | error page styling |
| category/upside-down-text/upside-down.css | 7.4 KB | 317 | page/feature specific styling (inferred from path) |
| usecase/comment-font/comment-font.css | 6.9 KB | 408 | page-specific usecase styling |
| js/emoji/emoji-tool.css | 6.2 KB | 224 | page/feature specific styling (inferred from path) |
| roblox/name-generator/roblox-generator.css | 5.9 KB | 320 | page/feature specific styling (inferred from path) |
| symbol-explorer.css | 5.4 KB | 247 | symbol explorer feature styling |
| discord/discord-context.css | 5.4 KB | 210 | platform-specific (Discord) styling |
| usecase/bio-font/bio-font.css | 5.1 KB | 239 | page-specific usecase styling |
| snapchat/snapchat-context.css | 4.9 KB | 190 | platform-specific (Discord) styling |
| tiktok/tiktok-context.css | 3.0 KB | 147 | platform-specific (Discord) styling |
| youtube/name-generator/name-generator.css | 2.5 KB | 151 | page/feature specific styling (inferred from path) |
| youtube/youtube-context.css | 1.9 KB | 100 | platform-specific (Discord) styling |
| facebook/facebook-context.css | 1.2 KB | 66 | platform-specific (Discord) styling |
| tiktok/name-generator/name-generator.css | 1.2 KB | 69 | page/feature specific styling (inferred from path) |

## 6. Reusable Component Candidates

Classes used on ≥ 5 pages — strong candidates for shared components in style.css:

| Class | Pages | Occurrences |
| --- | --- | --- |
| hero-headline | 3789 | 3789 |
| hero | 3786 | 3898 |
| hero-inner | 3773 | 3885 |
| editorial-section | 3740 | 14748 |
| hero-tagline | 3713 | 3713 |
| footer | 3661 | 3661 |
| footer-inner | 3661 | 3661 |
| article-section-label | 3288 | 19369 |
| cta-btn | 3245 | 3296 |
| cta-card | 3242 | 3288 |
| compare-grid | 3112 | 3397 |
| compare-card | 3112 | 14416 |
| variant-muted | 3112 | 14270 |
| editorial-block | 3070 | 4957 |
| section-divider | 3051 | 16369 |
| u-no-underline | 3011 | 13968 |
| symbol-toast | 2916 | 2916 |
| symbol-tile | 2806 | 62003 |
| flag-rows | 2641 | 9096 |
| flag-row | 2641 | 56182 |
| flag-emoji | 2641 | 56190 |
| flag-label | 2637 | 55342 |
| breadcrumbs | 2630 | 2630 |
| breadcrumb-current | 2630 | 2630 |
| breadcrumb-separator | 2629 | 4427 |

### Repeated inline patterns → utility class candidates

| Pattern | Count | Suggested utility | Risk |
| --- | --- | --- | --- |
| display:none; visibility:hidden | 3801 | u-hidden (verify JS toggling first) | high |
| border:none; height:0; left:-1000px; top:-1000px; widt… | 3707 | (propose a utility/component class) | high |
| ultra script | 363 | (propose a utility/component class) | low |
| max-width:820px | 256 | u-maxw-* | medium |
| max-width:800px | 174 | u-maxw-* | medium |
| max-width:900px | 174 | u-maxw-* | medium |
| align-items:stretch; flex-direction:column; gap:8px | 159 | (propose a utility/component class) | medium |
| ultra script bold | 144 | (propose a utility/component class) | low |
| text-decoration:none | 25 | u-no-underline | low |
| align-items:stretch; flex-direction:column; gap:12px | 22 | (propose a utility/component class) | medium |
| color:var(--text-secondary); font-size:0.875rem; line-… | 22 | u-text-secondary | medium |
| display:none | 20 | u-hidden (verify JS toggling first) | high |
| color:${cat.color} | 18 | (propose a utility/component class) | low |
| color:var(--text-secondary); font-size:0.925rem; margi… | 18 | u-mb-* | medium |
| font-size:1.25rem; margin-bottom:1rem | 17 | u-mb-* | low |
| color:var(--text-primary); font-weight:600; text-decor… | 17 | (propose a utility/component class) | medium |
| margin-top:2rem | 12 | u-mt-* | low |
| ultra gothic script | 11 | (propose a utility/component class) | low |
| margin-top:1rem | 11 | u-mt-* | low |
| align-items:center; display:flex; gap:0.5rem | 8 | u-flex | medium |
| margin-top:1.5rem | 6 | u-mt-* | low |
| display:grid; gap:1rem; grid-template-columns:repeat(a… | 5 | u-mt-* | medium |
| font-size:1.35rem | 5 | u-fs-* | low |
| ultra gothic bold | 3 | (propose a utility/component class) | low |
| align-items:center; flex-direction:column; gap:0.35rem | 3 | (propose a utility/component class) | medium |

### One-off classes (used on a single page)

248 classes appear on only one page — likely genuinely page-specific. Top 15 shown; full list in JSON.

| Class | Occurrences |
| --- | --- |
| alpha-family | 5 |
| ar-lib-no-results | 1 |
| ar-lib-search-wrap | 1 |
| ascii-art-empty | 1 |
| ascii-art-field | 1 |
| ascii-art-output | 1 |
| ascii-art-output-head | 1 |
| ascii-art-output-wrap | 1 |
| ascii-art-tool | 1 |
| ascii-font-picker | 1 |
| ascii-font-picker-label | 1 |
| brackets-grid | 1 |
| cat-anchor | 22 |
| cat-overview-table | 1 |
| censor-bar-chip | 10 |

## 7. Possible Unused CSS (NEEDS VERIFICATION)

Selectors in `style.css` with **no** HTML reference and **no** strict JS reference. These are NOT confirmed dead — a class may be injected dynamically, built from a template string, or used by a page not yet scanned. **Verify before removing.**

| Selector | Line | Verdict | Note |
| --- | --- | --- | --- |
| .scope-chip | 473 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .scope-chip:hover | 488 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .cursive-alphabet | 1193 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .cursive-alphabet-note | 1212 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .variation-char-over | 2184 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-row | 3595 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-row-label | 3601 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-tabs | 3608 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview-wrap | 3641 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview | 3651 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview-meta | 3659 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-actions | 3669 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn | 3675 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-primary | 3686 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-primary:hover | 3691 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-ghost:hover | 3692 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-card | 3699 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-name | 3709 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-out | 3716 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-copy | 3722 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-copy:hover | 3732 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-shuffle | 3735 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-rare-grid | 3736 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-rare-chip | 3741 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview | 3744 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-actions .ts-btn | 3745 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| #bubblePrintRoot | 3960 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .format-chip | 4018 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .format-chip:hover | 4032 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .safemode-chip | 4067 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .safemode-chip:hover | 4082 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .preview-btn | 4648 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .preview-btn:hover | 4662 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab | 5014 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab:hover | 5030 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab-label | 5040 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab-hint | 5045 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-control-group | 5057 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-panel-note | 5065 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-date-fields | 5070 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |

…and 125 more in `css-audit-data.json`.

JS class-reference tokens collected: 605 (strict). These were used to avoid falsely flagging JS-driven CSS.

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
