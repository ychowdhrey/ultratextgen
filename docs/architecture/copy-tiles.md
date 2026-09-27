# Copy tiles: glyphs and text objects

The library and symbol lanes hand a reader something to copy through one primitive:
a `.flag-rows` grid of `.flag-row` cells, each a `button.flag-emoji.symbol-tile`
(the copy target, `data-symbol` = the payload) above a `.flag-label`. This doc
records why that primitive has two layouts, what was measured, and how a page gets
the right one. The invariant lives in `.claude/rules/html-pages.md`.

## Two different objects

| | Glyph | Text object |
|---|---|---|
| Examples | `√` `★` `☥` `¶` `❤️` `👨‍👩‍👧` `🇰🇷` | `(◕‿◕)` `¯\_(ツ)_/¯` `(╯°□°）╯︵ ┻━┻` `🎀🌸✨` `♡━━━━━━━♡` `ㅋㅋㅋ` |
| What the reader does | identify one character, copy it | recognise a whole expression, copy it |
| Width | 1–2 terminal columns | 3 to 29 columns |
| Layout | `.flag-rows` (6 / 4 / 2 fixed columns, 43x43 target) | `.flag-rows.flag-rows--text` (content-sized cards) |

"Width" is terminal columns per **grapheme cluster**, never string length:
`👨‍👩‍👧` is 8 UTF-16 units and one emoji. An emoji or a CJK, Hangul or fullwidth
grapheme counts 2, anything else 1. `isTextObject()` in `symbol-explorer.js`
(between the `@text-object` markers) is the only definition; the build evaluates
that block rather than restating it (`scripts/lib/text-object-grid.js`).

## The mechanism that broke text objects

`.symbol-tile` (in `style.css`) sets `aspect-ratio: 1`. `.flag-emoji` (in
`symbol-explorer.css`, loaded later) removes the tile's border and background but
keeps the ratio. For a glyph that is the point: the box's height is the 43px line
box, so the ratio makes it 43 wide too, whatever the glyph's own width.
**86,370 of 87,959 glyph tiles render exactly 43px tall; none overflowed its cell.**
The ratio is load-bearing: removing it globally would shrink the target of a
narrow glyph like `¶` to its ink width.

A text object is wider than the line box, so the same ratio makes the box as tall
as it is wide. **All 8,695 text tiles site-wide rendered square**: a table flip at
130x130 on desktop and 160x160 on a phone, one Christmas border at 484x484. In a
sixth-of-a-row cell (121px at 1440, 168px at 375), **4,768 of them (55%)**
overflowed the cell or wrapped mid-expression (`ヽ(•‿•)` / `ノ`), leaving labels at
staggered heights and screens of empty space.

Breakage by width, before the change (share of tiles that overflowed or wrapped at
375 or 1440 px):

| columns | ≤2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12+ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tiles | 87,959 | 502 | 501 | 1,007 | 1,769 | 1,205 | 863 | 943 | 480 | 404 | 1,021 |
| broken | 0% | 4% | 4% | 5% | 71% | 35% | 52% | 88% | 89% | 92% | 90% |

Every tile at 3+ columns was also square-inflated, which is why 3 is the threshold
rather than 6: the ones that still fit their cell cost two to four times the height
they needed.

Measured by rendering all 3,532 pages that carry a `.symbol-tile` in Chromium at
375 and 1440 px and reading each tile's box, its text's line boxes and its cell
(self-hosted and Noto system fonts; ads and third-party requests blocked).

## The classifier against rendered geometry

As a check on the rule itself, a grid was scored **text** if any tile is 3+ columns,
and compared with whether any tile actually rendered taller than its line box.
They agree on **12,240 of 12,682 grids (96.5%)**, and the disagreements are the
right calls:

- 383 grids where a tile rendered a few pixels over 43px but is one wide glyph:
  `꧁` `༺` `࿐` at 50-52px, `⟶` `⟹` at 46px, `‱`, `﷽`, plus a short ASCII pair
  (`<3`). None of those 1,362 tiles overflowed or wrapped. They stay glyphs.
- 59 grids scored text whose 3-column items are narrow enough not to inflate
  (`⋆˚࿔`, `‧₊˚`). They get cards, which suits them too.

## The layout decision

Three layouts were prototyped on the Korean, dongers, borders and star-rating grids
at 375 and 1440 px:

1. **Full-width list rows** (expression left, label right). Fine for short faces;
   on a long donger the label was squeezed to one character per line, and it was
   the least dense at 375.
2. **Uniform responsive cards** (`auto-fill, minmax(9rem, 1fr)`). Tidy, but a long
   expression still wrapped inside a fixed-width cell.
3. **Content-sized cards** (flex-wrap, each card as wide as its expression, growing
   to share its line). Short faces sit two or three to a phone row, a long one gets
   the width it needs on one line, and a mixed grid (`★★★★★` beside `⯨`) holds its
   glyphs well as small cards. **Chosen.**

Adaptive spans on the existing 6-column grid (a text tile spanning 2–3 columns) were
rejected: without `grid-auto-flow: dense` they leave holes at row ends, and with it
the visual order stops matching the DOM and tab order.

What the chosen card keeps and changes:

- **Same markup.** The button + label pair is unchanged, so the payload, the
  `aria-label`, analytics, Save/Share wiring and crawlable text are untouched. The
  modifier is one class on the grid.
- **The whole card copies.** The button's `::after` covers the card; the Save star
  sits above it in the corner.
- **Exact text.** `white-space: pre-wrap`, so two spaces in a donger stay two on
  screen as on the clipboard; a card wraps only when a full-width card still cannot
  hold the expression.
- **One focus ring**, on the card via `:has()`; browsers without `:has()` keep the
  button's own ring.
- **Colour from `--text-primary`**, because a `<button>` does not inherit colour.
  Without it a face is black on the dark-mode card. (Glyph tiles have the same
  pre-existing dark-mode defect; it is out of this change's scope.)

## Scope

The class follows the contents, never the page type, so it lands wherever a text
object does, including a glyph page with one combo section.

| Group | Pages | English families | Locales | What changed |
|---|---|---|---|---|
| Definitely migrate | 610 | 121 | 21 | text grids where tiles overflowed or wrapped |
| Probably migrate | 137 | 27 | 24 | text grids that were square-inflated but still fit |
| Name chips and combos | 210 (+8 counted above) | 59 | 27 | `.uname-chip` / `.symbol-tile--combo`, see below |
| Keep | 2,575 | 324 | 22 | glyph grids, `copy-cell`, `symbol-hero`: unchanged |

3,532 pages carry a `.symbol-tile`; 1,836 grids on 747 pages hold 8,695 text
objects and gained the class. Kaomoji are the largest family by item count, but
most affected pages are not kaomoji pages: emoji pages with a combo or kaomoji
section (`sad-emoji`, `skull-emoji`), symbol pages with decorations (`discord-symbols`,
`y2k-symbols`, `star-symbols` rating rows), borders, and seasonal phrase sections.
Every row, with the before and after measurements, is in
`reports/text-object-grids-audit.csv`.

After the change, at 375 and 1440 px:

| | before | after |
|---|---|---|
| text tiles overflowing their cell | 1,258 | **0** |
| text tiles wrapped | 4,734 | **145** (375 px only; 121 of them phrases breaking at a space, e.g. `🎄✨ Feliz Navidad ✨🎄`) |
| glyph tiles in glyph grids with any change of box | | **0 of 84,972** |
| page height at 375 px, `/ko/library/imotikon/` | 22,713 px | 18,336 px |
| CLS / LCP | 0 / 272 ms | 0 / 276 ms (noise) |

Control pages (`/library/math-symbols/`, all 195 tiles of `/library/emoji-flags/`)
render pixel-identical before and after.

## The same mechanism in two more components

`.uname-chip` (ready-made names on 218 gaming-name and nickname pages) and
`.symbol-tile--combo` (the LinkedIn symbol library's `→ Key takeaway` row) also
carry `.symbol-tile` for its copy wiring, restyle it as a text chip, and never
undid the ratio. **All 4,746 of those tiles rendered square**: a 9-character name
was 324x324 on a phone, so six names filled 2,000 px, and the LinkedIn combos ran
past the page edge. Both now set `aspect-ratio: auto` in their own rule in
`style.css` (mean chip height at 375 px: 320 → 55 px; combos 150 → 32 px, 6 tiles
past the edge → 0). These are components that are never glyphs, so no classifier
is involved.

Left alone after measuring: `.copy-cell` (136 tiles) and `.symbol-hero-tile`
(671) had no overflow, wrap or square text; four `/vi/` decoration grids hold
3-column items in square 92-120 px tiles that fit.

## How a page gets the class

- `npm run fix:text-object-grids` writes it into every static grid that needs it
  (and removes it from any that no longer does).
- `generate_library_page_from_spec.py` pipes each page through the same script
  before writing, so a regenerated page never loses it.
- `check:text-object-grids` gates it **whole-tree**: the definition lives in shared
  JS, so a change to it reclassifies pages a PR never touched, and a hand-built
  locale page is how a new grid usually arrives. It has no backlog.
- The saved-symbols strip, built at runtime, applies the same test to its items.
- A grid filled only at runtime (`#countryFlagList` before pre-render) has no static
  tiles to judge and is left alone; country flags are glyphs.
