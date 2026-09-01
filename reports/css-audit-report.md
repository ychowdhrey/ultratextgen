# UltraTextGen — CSS Audit Report

_Generated: 2026-09-01T07:15:54.346Z_

> Advisory only. This audit changes no CSS. Items marked **NEEDS VERIFICATION** are uncertain — confirm in a browser and check JavaScript before moving or deleting anything.

## 1. Summary

| Metric | Value |
| --- | --- |
| HTML files scanned | 4645 |
| CSS files | 17 |
| JS files scanned | 172 |
| Inline `style="..."` occurrences | 10783 |
| Files containing inline styles | 4641 |
| Inline risk (low / med / high) | 604 / 922 / 9257 |
| `<style>` blocks in HTML | 3 |
| Unique HTML classes | 789 |
| Component class candidates | 425 |
| One-off class candidates | 246 |
| Repeated inline patterns | 30 |
| style.css selectors parsed | 1679 |
| …referenced (HTML/JS/structural) | 1499 |
| …unreferenced (needs verification) | 180 |

Page-type breakdown: other: 1676, category: 26, embed: 8, localized: 2505, platform: 13, guide: 33, library: 338, usecase: 46

## 2. Top Problems

1. **10783 inline styles** across 4641 files — the biggest maintainability drag. 604 are low-risk and safe to consolidate.
2. **30 repeated inline patterns** — e.g. `display:none; visibility:hidden` appears 4640× and should become a utility class.
3. **3 `<style>` blocks** embedded in HTML — review whether any belong in style.css.
4. **180 style.css selectors** had no HTML/JS reference — possible dead CSS, but all marked *needs verification* (may be dynamic or generated).

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
| es/imprimibles/letras-graffiti/index.html | 8 |
| guide/comments-that-stand-out/index.html | 8 |
| printables/graffiti-letters/index.html | 8 |
| ar/guide/index.html | 7 |
| bs/guide/index.html | 7 |
| cs/guide/index.html | 7 |

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
| style.css | 230.4 KB | 9108 | global site stylesheet |
| usecase/zalgo-text/zalgo-text.css | 17.1 KB | 823 | page-specific usecase styling |
| usecase/before-after-emoji/before-after-emoji.css | 11.4 KB | 510 | page-specific usecase styling |
| 404.css | 8.1 KB | 401 | error page styling |
| category/upside-down-text/upside-down.css | 7.4 KB | 317 | page/feature specific styling (inferred from path) |
| usecase/comment-font/comment-font.css | 6.9 KB | 408 | page-specific usecase styling |
| js/emoji/emoji-tool.css | 6.2 KB | 224 | page/feature specific styling (inferred from path) |
| roblox/name-generator/roblox-generator.css | 5.9 KB | 320 | page/feature specific styling (inferred from path) |
| usecase/bio-font/bio-font.css | 5.5 KB | 249 | page-specific usecase styling |
| symbol-explorer.css | 5.4 KB | 247 | symbol explorer feature styling |
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
| footer | 4640 | 4640 |
| footer-inner | 4640 | 4640 |
| footer-social-links | 4639 | 4640 |
| footer-link | 4639 | 118837 |
| footer-columns | 4639 | 4639 |
| footer-col | 4639 | 18406 |
| footer-col-title | 4639 | 18406 |
| footer-bottom | 4639 | 4639 |
| hero-headline | 4628 | 4628 |
| hero | 4625 | 4741 |
| hero-inner | 4612 | 4728 |
| editorial-section | 4579 | 17670 |
| hero-tagline | 4546 | 4547 |
| article-section-label | 4052 | 24481 |
| cta-btn | 4012 | 4064 |
| cta-card | 4009 | 4056 |
| compare-grid | 3854 | 4160 |
| compare-card | 3854 | 20225 |
| variant-muted | 3853 | 20060 |
| section-divider | 3838 | 21232 |
| editorial-block | 3818 | 6402 |
| u-no-underline | 3748 | 19721 |
| symbol-toast | 3607 | 3607 |
| symbol-tile | 3474 | 96950 |
| flag-rows | 3304 | 12378 |

### Repeated inline patterns → utility class candidates

| Pattern | Count | Suggested utility | Risk |
| --- | --- | --- | --- |
| display:none; visibility:hidden | 4640 | u-hidden (verify JS toggling first) | high |
| border:none; height:0; left:-1000px; top:-1000px; widt… | 4597 | (propose a utility/component class) | high |
| ultra script | 331 | (propose a utility/component class) | low |
| max-width:820px | 302 | u-maxw-* | medium |
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
| font-size:1.35rem | 5 | u-fs-* | low |
| ultra gothic bold | 3 | (propose a utility/component class) | low |

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
| .scope-chip | 473 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .scope-chip:hover | 488 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .cursive-alphabet | 1363 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .cursive-alphabet-note | 1382 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .variation-char-over | 2354 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-verdict-head | 3890 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-verdict-line | 3892 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-verdict-note | 3896 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-row | 3913 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-row-label | 3919 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-tabs | 3926 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview-wrap | 3959 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview | 3969 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview-meta | 3977 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-actions | 3987 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn | 3993 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-primary | 4004 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-primary:hover | 4009 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-btn-ghost:hover | 4010 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-card | 4017 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-name | 4027 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-out | 4034 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-copy | 4040 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-frame-copy:hover | 4050 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-shuffle | 4053 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-rare-grid | 4054 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-rare-chip | 4059 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-preview | 4062 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .ts-actions .ts-btn | 4063 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| #bubblePrintRoot | 4278 | no-reference-found | no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale) |
| .format-chip | 4336 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .format-chip:hover | 4350 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .safemode-chip | 4385 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .safemode-chip:hover | 4400 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .preview-btn | 4966 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .preview-btn:hover | 4980 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab | 5311 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab:hover | 5327 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab-label | 5337 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |
| .tattoo-mode-tab-hint | 5342 | maybe-js | token appears in a JS string — NEEDS VERIFICATION before touching |

…and 140 more in `css-audit-data.json`.

JS class-reference tokens collected: 670 (strict). These were used to avoid falsely flagging JS-driven CSS.

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
