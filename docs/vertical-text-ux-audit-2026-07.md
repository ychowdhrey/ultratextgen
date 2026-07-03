# Vertical Text Generator — UX/UI & Surface-Area Audit (July 2026)

Audit of `/usecase/vertical-text/` covering UX/UI, functionality gaps, layout fixes,
removals, and surface-area expansion (i18n, missing use cases). Sources: code inspection
(`js/vertical/*`, `script.js`, `renderer.js`, `style.css`), headless-browser rendering
tests (desktop/mobile, light/dark), the attached SEMRush exports (combine_3, combine_4,
verticalfont_pages_20260703), live SERP checks, and forum/community research
(TikTok Discover, Quora, tattoo forums, Cricut/craft blogs, Japanese how-to sites).

> Note on data: all three attached CSVs are SEMRush exports (keyword volumes, competitor
> organic positions, keyword strategy builder). No GSC export was attached — the GSC
> query/country report is still worth pulling to confirm the i18n call in §6.

---

## 1. Verified bugs (fix first — all confirmed empirically)

| # | Bug | Where | Evidence |
|---|-----|-------|----------|
| B1 | **"Blank Line" word divider is identical to "None".** `wordBlockSeparator()` returns `'\n\n'` for both modes; the page's own docs and FAQ promise "two blank lines" for Blank Line. | `js/vertical/verticalLayouts.js:37-40` | `none` and `blank-line` produce byte-identical output for "Hi Yo". |
| B2 | **Active chips are invisible in dark mode.** `body.dark-mode .vertical-chip` (style.css:2487) comes after and overrides `.vertical-chip.active` (style.css:2392), so Stack/Continuous/None/Blank/Divider selected states are indistinguishable. | `style.css:2487` | Computed styles of active vs inactive chip in dark mode are identical (`rgb(30,30,46)` both). |
| B3 | **45 of 88 style cards are duplicates on this page** (13 groups of identical output). Per-line rendering degenerates many styles: alternating styles reset every line (1 char/line → alternation never advances → 6 cards of *plain unstyled text*), 8 upside-down variants collapse into one, redact styles all become identical `█` columns. | `verticalPageController.js:300-321` | Rendered "Hello" through all 88 registered styles × stacked layout; hashed outputs. |
| B4 | **Complex emoji shatter.** `Array.from()` splits ZWJ sequences: 👩‍👩‍👧‍👦 becomes 7 lines (4 emoji + 3 zero-width joiners), flags/skin-tones also break. The FAQ explicitly promises "emoji are treated as single characters." Fix: `Intl.Segmenter` (grapheme mode, native API) with `Array.from` fallback. | `verticalLayouts.js:52-54` | Confirmed in Node with family emoji. |
| B5 | **O(n²) DOM explosion on Pyramid/Reverse/Centered-Pyramid.** 120 chars of input → **1.96 million characters** in the results grid (88 cards × n²/2). At the 500-char input cap this is ~33M chars — a mobile page-killer. Cap layout-expansion length (pyramids/box: first ~40 chars) and/or lazy-render cards below the fold with `IntersectionObserver`. | `verticalPageController.js:276-322` | Measured in headless Chromium. |
| B6 | **Dead decoration section in the hero.** `#decorationGrid` + "Add line decoration" label render permanently empty — `script.js`'s `renderDecorations()` early-returns in vertical mode and the controller populates its own `#vertDecoGrid` instead. Stray label with nothing under it. | `usecase/vertical-text/index.html:267-276` | `#decorationGrid.innerHTML === ''` in all rendering tests. |
| B7 | **Production console noise + broken style map.** `renderer.js:265` ships a debug `console.warn('Bad map lengths', …)` that fires for `ultra-bubble-parentheses` (upper: 78, lower: 78, nums: 30 — should be 26/26/10) on every render. Fix the map data in `styles.js`, gate the warn. | `renderer.js:263-270` | Warning reproduced on every render. |
| B8 | **Double Column silently drops words 3+.** Three-word input renders only the first two words with no hint. Either pair-up all words into column pairs, or show a small note. | `verticalLayouts.js:331-353` | Code path returns after `words[0]`/`words[1]`. |

Content/FAQ mismatches (trust erosion, quick fixes):
- FAQ names decoration tabs "Spacers, Bullets, Aesthetic, Blocks, Arrows, Emoji" — the real tabs are **Bullets, Arrows, Dots, Dividers, Emojis, Flags** (JSON-LD FAQ + visible FAQ + `verticalDecoratorData.js`).
- FAQ/accordion describe Blank Line as "two blank lines" (see B1 — make the code match the promise).
- The comparison table uses inline `style=""` attributes — violates the repo's own CSS convention; move to `style.css`.
- The three `js/vertical/*.js` scripts load without `defer` while everything around them defers — minor parse-blocking.

---

## 2. UX/UI audit

### a) Tooltips / affordance gaps

1. **Layout picker teaches nothing.** The 12 layouts live in a native `<select>`; descriptions exist in code (`LAYOUTS[].description`) but only as `<option title>` — invisible on mobile, nearly undiscoverable on desktop. This is the tool's core differentiator hidden behind a dropdown. → Replace with a **visual layout picker**: chips/cards with a 3-line mini-preview of each layout (generated from the user's own first word) + description tooltip. Single highest-impact UX change.
2. **Stack vs Continuous is unexplained.** Add `title`/tooltip: "Stack: each word becomes its own column" / "Continuous: all letters flow in one column, spaces removed."
3. **Word Divider chips** need tooltips ("what separates word blocks"), and the row should visually explain *why* it disabled itself in Continuous mode (currently just fades).
4. **Prefix vs divider decorators behave differently with no explanation.** Bullets/arrows/flags sit *beside* each letter; dots/dividers/emojis go *between* lines. Users can't predict which — add a tooltip per item ("appears beside each letter" / "appears between letters") or a one-line hint under the tabs.
5. **Vertical copy buttons lack the tooltip + kbd hint** the main generator has (`title="Copy to clipboard"`, `↵` hint, Ctrl/Cmd+Enter already works via script.js — surface it).
6. **Char counter** should tooltip the platform math ("Instagram bio = 150 chars incl. line breaks; a 10-letter stack ≈ 19").
7. **Accessibility:** decoration items are `<span>`s with click handlers — not keyboard-focusable, no `role="button"`, no `aria-pressed`; results grid has no `aria-live`. Convert to `<button>`s; announce "copied".

### b) Functionality to add (ranked by evidence)

**Tier 1 — platform-survival features (the #1 recurring pain in forum research):**
1. **"Instagram-safe / TikTok-safe" output hardening.** The biggest adjacent tool category (line-break generators) exists solely because IG/TikTok strip newlines — and vertical text is 100% newline-dependent. Offer a toggle that pads blank lines with Braille Pattern Blank (U+2800) and avoids trailing spaces. This merges the line-break-generator audience into this page. Your FAQ already *describes* the problem; the tool should *solve* it.
2. **Alignment-safe indentation.** Staircase, Diagonal L/R, Centered Pyramid, and Box padding are built from regular spaces — exactly what platforms collapse and proportional fonts misalign. Use U+2800/figure-space indentation (optionally behind the same "platform-safe" toggle) and preview in a system sans, not monospace, so what users see matches what they paste.
3. **Live per-platform fit badge.** "Fits IG bio (150) ✓ / TikTok bio (80) ✗ / Discord ✓" computed from the *decorated* output length, per card or globally. Nobody in the niche does this; it answers the silent failure mode users only discover after pasting.

**Tier 2 — capture adjacent SERPs (SEMRush + SERP evidence):**
4. **Combining-mark "double stack" mode (Leͥgeͣnͫd effect) as a dedicated page.** The entire top-4 for "stacked text generator" (fancytextcloud #1, convertcase, caseconverter.tools, fontkart) is this one effect; UltraTextGen ranks #5 for the query without offering it. `stacked text` cluster ≈ 170+170+110+90+90+50 vol across variants in combine_4. Build `/usecase/stacked-text/` with Top+Bottom inputs, **auto-alignment** (competitors force manual space-hacks), an honest a/c/d/e/h/i/m/o/r/t/u/v/x support table, graceful fallback, and copyable examples (the pattern that made fancytextcloud #1). Cross-link both pages via the existing disambiguation FAQ.
5. **Word-per-line / sentence-per-line granularity.** fileconverts.com and textcompare.io rank #1–2 for "vertical text generator" largely on this feature (character/word/sentence modes + custom separators). Trivial additions as layout entries or a "Granularity" control.
6. **Custom separator input** — free-text field alongside preset decorations.
7. **TikTok-comment positioning.** TikTok Discover shows dense query clusters ("how to stack letters on tiktok comments", "how to make words stack on tiktok up and down"). The page copy leads with bios; give comments equal billing (H2 + FAQ + example).

**Tier 3 — differentiation & polish:**
8. **Hybrid post builder** — vertical anchor word + horizontal continuation composed as one copyable block. The page already teaches this manually ("Combining Vertical and Horizontal Text"); no tool generates it.
9. **Style search/filter on this page.** 88 cards with no filter (main page has one). Category chips (Bold / Script / Gothic / Bubble…) or reuse the main filter.
10. **Save/favorite parity** — vertical cards lack the star/save button main-page cards have.
11. **Download as .txt / PNG.** Download-as-file: one line of JS (codebeautify/convertcase have it). PNG export via `<canvas>` (no framework needed) bridges to the design-intent audience (textstudio/mockofun capture "vertical font generator" design traffic with image output).
12. **Readability nudge** — signage/tattoo consensus: stacked lettering should be CAPS, short. Detect lowercase/long input and hint "Stacked text reads best in CAPS, 3–8 letters" (unique, zero-cost, authority-building).
13. **Screen-reader-safe callout** — plain-letter vertical text is the accessibility-safer choice vs Unicode fonts; growing backlash against styled Unicode makes "accessibility-friendly mode" (default Stacked + plain style pinned first) an ethical differentiator no competitor claims.

### c) Are all designs rendered?

Yes mechanically (88/88 cards render, verified headless), **but ~half are noise on this page** — see B3. The vertical page should curate: either maintain a vertical-appropriate exclusion list (redact family, function/upside-down family — the *layout* dropdown already has Upside-Down, making the 11 upside-down styles redundant here), or cheaper and self-maintaining: **hash card output at render time and collapse duplicates** ("+7 identical styles" chip). Cuts the grid from 88 to ~50 genuinely distinct results and makes the page feel sharper, not smaller.

### d) Layout fixes

- **Equal-height row stretch:** `.vertical-results-grid` rows stretch to the tallest card in the row (a Box/Pyramid card makes its whole row tall, wasting space under short cards). Add `align-items: start`, or switch to CSS `columns` masonry for tight packing.
- Dead decoration section (B6) — remove the HTML block.
- Dark-mode chip state (B2).
- Mobile: control panel is fine, but the layout `<select>` + invisible descriptions problem is worst here (see a-1).
- Hero figure stays a large white panel in dark mode — consider a dark variant of the SVG art (cosmetic).

### e) Remove

1. The dead `.decoration-section` block in the hero HTML (B6).
2. Duplicate/degenerate cards from the vertical grid (B3/§c) — dedupe or exclude.
3. The shipped debug `console.warn` (B7).
4. Inline `style=""` attributes on the comparison table (move to stylesheet).
5. (Consider) the **Flags** decorator tab — prefixing every letter-line with a national flag is a fringe aesthetic; it also carries political-flag maintenance burden. Low value relative to the tab slot it occupies; a "Hearts/Cute" tab would earn more use. Not urgent.

---

## 3. Surface area

### a/b) English-only today — translate?

**Not full-site i18n yet; do targeted pages first.** Evidence:
- The generator is already language-agnostic at input (any Unicode script stacks correctly — verified with Arabic, CJK, Cyrillic; note Arabic loses letter-joining when stacked, worth an FAQ line). Only the *UI/content* is English.
- Attached SEMRush data shows real but modest non-English volume: `letras para tatuajes` 1,600/mo (Spanish tattoo lettering — and it's already a page in your strategy export), Arabic "خطوط بالانجليزي" ("English fonts"), Russian/Chinese "free fonts" queries. Notably, much non-English demand is *for English-alphabet fancy fonts* — served by localized UI around the same tool, not translated fonts.
- Forum research: **Japanese demand mirrors the English pain exactly** (縦書き bios; "type one char per line in a memo app" folk workaround is documented across multiple JA sites and a JA TikTok Discover page). CJK glyphs stack *better* than Latin (full-width, upright) — a JA vertical page is the highest-affinity localization in the whole site.
- Spanish vertical/stacked is underserved (no dedicated ES vertical stacker found).

**Recommended sequence:** (1) pull GSC country/query data to size non-EN impressions you already get; (2) ship two localized *pages* — JA vertical (縦書きジェネレーター) and ES vertical/tattoo (`generador de texto vertical` / `letras verticales para tatuajes`) — with hreflang, before any framework-level i18n; (3) expand only if those pages earn impressions.

### c) Missing functionality / use cases (with cluster volumes from your exports)

| Opportunity | Evidence | Play |
|---|---|---|
| **Tattoo vertical lettering** | "vertical tattoo fonts" 110, "tattoo lettering vertical" 90, "vertical name tattoo" 90 (fontget ranks, weakly); tattoo cluster in strategy export = 163 kws / ~112k vol; forum: spine-tattoo preview is a real pre-artist step; Pinterest maintains a "Vertical Name Tattoo" ideas hub | `/usecase/vertical-tattoo-fonts/` — vertical generator preloaded with script/gothic styles, spine/caps guidance, links into the tattoo cluster |
| **Stacked (combining-mark) tool** | Owns the "stacked text generator" SERP (§2b-4) | Dedicated page + tool |
| **Word/Office how-tos** | "how to rotate text in word" cluster ≈ 7.3k vol, 27 kws, all informational | `answers/` pages (zero-click intent — fits the repo's Guide-vs-Answer taxonomy) |
| **CSS/HTML vertical text** | "text vertical in css" cluster ≈ 22.6k vol | `answers/` or `guide/` page; links dev traffic to the tool |
| **CJK vertical writing** | JP/KR/CN vertical cluster ≈ 5.7k vol ("write japanese vertically" 590, "korean written vertically" 390…) | Guide page now; optional multi-column tategaki layout later (no EN competitor has it) |
| **Monogram / letters-on-top** | "letters ontop font" 1,600; overlap/monogram cluster ≈ 6.9k vol | Related but distinct tool — candidate for a future generator page |
| **Cricut/vinyl vertical signs** | Cricut's own workflow is manual letter-Enter-letter; "free fonts for cricut" 2,400 | Guide: "vertical text for Cricut welcome signs" + craft-mode framing of this tool |

---

## 4. Competitive position (July 2026 SERP checks)

- UltraTextGen is **top-5 for both** "vertical text generator" and "stacked text generator" — the only site ranking for both meanings — but doesn't serve the combining-mark intent behind the second query.
- Top "vertical" rankers (fileconverts #1, codebeautify #1–2) are utility sites with **no live preview, no fonts, no styles** — they rank on domain authority and granularity options. Matching their word/sentence modes removes their only feature edge.
- **Nobody combines fonts × layouts × decorators.** 12 layouts × 88 styles × separators is category-unique; the page should state this comparison explicitly, and the layout picker should showcase it (§2a-1).
- LingoJam pages are effectively abandoned but still rank; yaytext's platform-rendering previews are the best copy-anxiety UX in the niche (inspiration for the fit-badge, §2b-3).

## 5. Suggested execution order

1. **Bug batch** (B1–B8 + FAQ mismatches) — small diffs, immediate quality lift.
2. **Layout picker + tooltips + dedupe + grid alignment** — the visible UX leap.
3. **Platform-safe output + fit badges** — the differentiator; converts the line-break-generator audience.
4. **`/usecase/stacked-text/` combining-mark tool** — attacks the #1 "stacked" SERP.
5. **Tattoo vertical page + Word/CSS answers pages** — cluster expansion from your own keyword data.
6. **JA + ES localized vertical pages** — after GSC confirms.
