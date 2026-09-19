# UltraTextGen — CSS Audit Report

_Generated: 2026-09-16T06:06:16.520Z_

> Advisory only. This audit changes no CSS. Items marked **NEEDS VERIFICATION** are uncertain — confirm in a browser and check JavaScript before moving or deleting anything.

## 1. Summary

| Metric | Value |
| --- | --- |
| HTML files scanned | 4699 |
| CSS files | 17 |
| JS files scanned | 223 |
| Inline `style="..."` occurrences | 10903 |
| Files containing inline styles | 4693 |
| Inline risk (low / med / high) | 614 / 928 / 9361 |
| `<style>` blocks in HTML | 3 |
| Unique HTML classes | 802 |
| Component class candidates | 442 |
| One-off class candidates | 246 |
| Repeated inline patterns | 30 |
| style.css selectors parsed | 1805 |
| …referenced (HTML/JS/structural) | 1612 |
| …unreferenced (needs verification) | 193 |

Page-type breakdown: other: 1723, category: 26, embed: 8, localized: 2511, platform: 13, guide: 33, library: 339, usecase: 46

## 2. Top Problems

1. **10903 inline styles** across 4693 files — the biggest maintainability drag. 614 are low-risk and safe to consolidate.
2. **30 repeated inline patterns** — e.g. `display:none; visibility:hidden` appears 4692× and should become a utility class.
3. **3 `<style>` blocks** embedded in HTML — review whether any belong in style.css.
4. **193 style.css selectors** had no HTML/JS reference — possible dead CSS, but all marked *needs verification* (may be dynamic or generated).

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
| no/kursiv-tekst/index.html | 49 |
| pt/letra-cursiva/index.html | 49 |
| tr/el-yazisi-fontu/index.html | 49 |
| guide/index.html | 36 |
| usecase/index.html | 36 |
| guide/personal-branding-through-typography/index.html | 10 |
| embed/index.html | 9 |
| es/imprimibles/monograma/index.html | 9 |
| guide/linkedin-comments-guide/index.html | 9 |
| printables/monogram-maker/index.html | 9 |
| roblox/name-generator/index.html | 9 |
| de/zum-ausdrucken/graffiti-buchstaben/index.html | 8 |
| es/imprimibles/letras-graffiti/index.html | 8 |
| fr/imprimables/lettres-graffiti/index.html | 8 |
| guide/comments-that-stand-out/index.html | 8 |
| printables/graffiti-letters/index.html | 8 |
| ar/guide/index.html | 7 |

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
| answers/cny-greetings-what-to-say/index.html | 185 | style="display:none;visibility:hidden" | high |
| answers/cny-greetings-what-to-say/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/discord-allowed-characters/index.html | 265 | style="display:none;visibility:hidden" | high |
| answers/discord-allowed-characters/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/diwali-wishes-what-to-say/index.html | 184 | style="display:none;visibility:hidden" | high |
| answers/diwali-wishes-what-to-say/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-fancy-fonts-work-on-iphone/index.html | 196 | style="display:none;visibility:hidden" | high |
| answers/do-fancy-fonts-work-on-iphone/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-fancy-fonts-work-with-arabic/index.html | 196 | style="display:none;visibility:hidden" | high |
| answers/do-fancy-fonts-work-with-arabic/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-fancy-fonts-work-with-vietnamese/index.html | 181 | style="display:none;visibility:hidden" | high |
| answers/do-fancy-fonts-work-with-vietnamese/index.html | 2 | style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;' | high |
| answers/do-you-need-nitro-for-discord-fonts/index.html | 282 | style="display:none;visibility:hidden" | high |

Risk legend: **low** = low risk — safe to move into style.css; **medium** = medium risk — check visually before changing; **high** = high risk — likely page-specific or interactive, do not move blindly.

## 4. `<style>` Block Findings

| File | Line | CSS lines | Assessment | Risk |
| --- | --- | --- | --- | --- |
| ar/library/index.html | 100 | 28 | page-specific | low |
| js/decorator/decoratorEngine.test.html | 8 | 8 | page-specific | low |
| js/vertical/verticalLayouts.test.html | 7 | 6 | page-specific | low |

## 5. CSS File Inventory

| File | Size | Lines | Inferred purpose |
| --- | --- | --- | --- |
| style.css | 256.0 KB | 9835 | global site stylesheet |
| usecase/zalgo-text/zalgo-text.css | 19.3 KB | 909 | page-specific usecase styling |
| usecase/before-after-emoji/before-after-emoji.css | 11.4 KB | 510 | page-specific usecase styling |
| symbol-explorer.css | 9.5 KB | 395 | symbol explorer feature styling |
| 404.css | 8.1 KB | 401 | error page styling |
| category/upside-down-text/upside-down.css | 7.4 KB | 317 | page/feature specific styling (inferred from path) |
| usecase/comment-font/comment-font.css | 6.9 KB | 408 | page-specific usecase styling |
| js/emoji/emoji-tool.css | 6.2 KB | 224 | page/feature specific styling (inferred from path) |
| roblox/name-generator/roblox-generator.css | 5.9 KB | 320 | page/feature specific styling (inferred from path) |
| usecase/bio-font/bio-font.css | 5.5 KB | 249 | page-specific usecase styling |
| discord/discord-context.css | 5.4 KB | 210 | platform-specific (Discord) styling |
| snapchat/snapchat-context.css | 4.9 KB | 190 | platform-specific (Discord) styling |
| tiktok/tiktok-context.css | 3.0 KB | 147 | platform-specific (Discord) styling |
| youtube/name-generator/name-generator.css | 2.5 KB | 151 | page/feature specific styling (inferred from path) |
| youtube/youtube-context.css | 2.5 KB | 131 | platform-specific (Discord) styling |
| facebook/facebook-context.css | 1.2 KB | 66 | platform-specific (Discord) styling |
| tiktok/name-generator/name-generator.css | 1.2 KB | 69 | page/feature specific styling (inferred from path) |

## 6. Reusable Component Candidates

Classes used on ≥ 5 pages — strong candidates for shared components in style.css:

| Class | Pages | Occurrences |
| --- | --- | --- |
| footer | 4692 | 4692 |
| footer-inner | 4692 | 4692 |
| footer-social-links | 4691 | 4692 |
| footer-link | 4691 | 121009 |
| footer-columns | 4691 | 4691 |
| footer-col | 4691 | 18604 |
| footer-col-title | 4691 | 18604 |
| footer-bottom | 4691 | 4691 |
| hero-headline | 4680 | 4680 |
| hero | 4677 | 4793 |
| hero-inner | 4664 | 4780 |
| editorial-section | 4631 | 17929 |
| hero-tagline | 4598 | 4599 |
| article-section-label | 4099 | 24906 |
| cta-btn | 4063 | 4115 |
| cta-card | 4060 | 4107 |
| compare-grid | 3899 | 4206 |
| compare-card | 3899 | 21559 |
| variant-muted | 3898 | 21393 |
| section-divider | 3890 | 21622 |
| editorial-block | 3865 | 6477 |
| u-no-underline | 3792 | 21053 |
| symbol-toast | 3661 | 3661 |
| symbol-tile | 3527 | 102405 |
| flag-rows | 3349 | 12617 |

### Repeated inline patterns → utility class candidates

| Pattern | Count | Suggested utility | Risk |
| --- | --- | --- | --- |
| display:none; visibility:hidden | 4692 | u-hidden (verify JS toggling first) | high |
| border:none; height:0; left:-1000px; top:-1000px; widt… | 4649 | (propose a utility/component class) | high |
| ultra script | 331 | (propose a utility/component class) | low |
| max-width:820px | 308 | u-maxw-* | medium |
| max-width:800px | 174 | u-maxw-* | medium |
| max-width:900px | 174 | u-maxw-* | medium |
| align-items:stretch; flex-direction:column; gap:8px | 160 | (propose a utility/component class) | medium |
| ultra script bold | 130 | (propose a utility/component class) | low |
| text-decoration:none | 25 | u-no-underline | low |
| align-items:stretch; flex-direction:column; gap:12px | 22 | (propose a utility/component class) | medium |
| color:var(--text-secondary); font-size:0.875rem; line-… | 22 | u-text-secondary | medium |
| display:none | 20 | u-hidden (verify JS toggling first) | high |
| color:${cat.color} | 18 | (propose a utility/component class) | low |
| color:var(--text-secondary); font-size:0.925rem; margi… | 18 | u-mb-* | medium |
| font-size:1.25rem; margin-bottom:1rem | 17 | u-mb-* | low |
| color:var(--text-primary); font-weight:600; text-decor… | 17 | (propose a utility/component class) | medium |
| margin-top:2rem | 12 | u-mt-* | low |
| margin-top:1rem | 11 | u-mt-* | low |
| ultra gothic script | 10 | (propose a utility/component class) | low |
| margin-top:1.5rem | 6 | u-mt-* | low |
| align-items:center; flex-direction:column; gap:0.35rem | 6 | (propose a utility/component class) | medium |
| font-size:1.5rem; padding:0; text-align:center; width:… | 6 | u-text-center | medium |
| display:grid; gap:1rem; grid-template-columns:repeat(a… | 5 | u-mt-* | medium |
| throwup | 5 | (propose a utility/component class) | low |
| tag | 5 | (propose a utility/component class) | low |

### One-off classes (used on a single page)

246 classes appear on only one page — likely genuinely page-specific. Top 15 shown; full list in JSON.

| Class | Occurrences |
| --- | --- |
| alpha-count | 1 |
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
| breadcrumb-sep | 2 |
| cat-anchor | 22 |

## 7. Possible Unused CSS (NEEDS VERIFICATION)

Selectors in `style.css` with **no** HTML reference and **no** strict JS reference. These are NOT confirmed dead — a class may be injected dynamically, built from a template string, or used by a page not yet scanned. **Verify before removing.**

| Selector | Line | Verdict | Note |
| --- | --- | --- | --- |
| .scope-chip | 488 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .scope-chip:hover | 503 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .cursive-alphabet | 1410 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .cursive-alphabet-note | 1429 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .variation-char-over | 2421 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-verdict-head | 4019 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-verdict-line | 4021 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-verdict-note | 4025 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-row | 4042 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-row-label | 4048 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-tabs | 4055 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview-wrap | 4088 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview | 4098 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview-meta | 4106 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-actions | 4116 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn | 4122 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-primary | 4133 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-primary:hover | 4138 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-ghost:hover | 4139 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-card | 4146 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-name | 4156 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-out | 4163 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-copy | 4169 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-copy:hover | 4179 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-shuffle | 4182 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-rare-grid | 4183 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-rare-chip | 4188 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview | 4191 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-actions .ts-btn | 4192 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| #bubblePrintRoot | 4502 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .format-chip | 4560 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .format-chip:hover | 4574 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .safemode-chip | 4609 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .safemode-chip:hover | 4624 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab | 5545 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab:hover | 5561 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab-label | 5571 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab-hint | 5576 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-control-group | 5588 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-panel-note | 5596 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |

…and 153 more in `css-audit-data.json`.

JS class-reference tokens collected: 745 (strict). These were used to avoid falsely flagging JS-driven CSS.

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
