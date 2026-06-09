# Collection-Copy Suitability Audit — 2026-06-09

Audited **all 79 `library/*/index.html` pages** for "collection copy" suitability
(the `UltraTextGen.buildGrids` / `.copy-collection-btn` "Copy Collection" block
with Inline/Vertical/Comma/Space/Bullet format tabs).

Ledger: [`data/collection_copy_audit.csv`](./collection_copy_audit.csv) — one row
per page, idempotent, sorted by slug. This audit is **discovery only**; no pages
or `symbol-explorer.js` were modified.

> Note on scope: the task referenced "80 pages". The glob `library/*/index.html`
> resolves to **79** symbol pages; the 80th `index.html` under `library/` is the
> library hub (`library/index.html`), which is a navigation page, not a symbol
> grid, so it is out of scope.

## Verdict counts

| Verdict | Count | Meaning |
|---|---|---|
| KEEP   | 5  | Has collection copy + opportunity is real |
| ADD    | 21 | No collection copy now, but opportunity is real (candidate to add) |
| REMOVE | 2  | Has collection copy now, but no real opportunity (candidate to remove) |
| N/A    | 51 | No collection copy + no opportunity (correct as-is) |
| **Total** | **79** | |

The 7 pages that currently use `buildGrids` resolve to **5 KEEP + 2 REMOVE**.

## KEEP (5) — has it, opportunity is real

| Slug | Why it stays |
|---|---|
| emoji-flags | Regional flag grids pasted as sets. |
| moon-celestial-symbols | Moon-phase sequences + night-sky sets pasted as decorative units. |
| norse-viking-runes | Full futhark alphabets copied as runic sets. |
| zodiac-symbols | 12-sign set + astrology strings pasted as units. |
| chess-symbols | "Chess Piece Sets" form a coherent unit — **borderline** (intent leans single-glyph; flag for a second look). |

## ADD shortlist (21) — collection copy should be added

Tiered by strength of fit. The "Collection groups" column notes which existing
sections would feed the `buildGrids` collections.

### Strong fit (decorative borders / dividers / combos / aesthetic strings)

| Slug | Rationale | Collection groups to build from |
|---|---|---|
| aesthetic-borders-frames | Whole page is multi-symbol borders/frames/dividers. | Floral Borders, Star Borders, Heart Borders, Soft & Corner Frames, Minimalist Dividers |
| line-divider-symbols | Built around prebuilt divider/separator combos. | Decorative Divider Combos, Ornamental Separator Combos, Box-Drawing Border Characters |
| box-drawing-symbols | Box-drawing runs assemble into multi-char borders/boxes. | Lines/Corners/Junctions, Double & Heavy Borders, Block Elements & Shading |
| sparkle-symbols | Sparkle strings + divider/border characters pasted whole. | Aesthetic Decorator Symbols, Divider & Border Characters, Star & Point Symbols |
| aesthetic-symbols | Aesthetic bio strings + divider/border sets. | Sparkle/Heart/Nature Aesthetic sets, Arrow & Divider, Bracket & Border |
| discord-symbols | Explicit combo templates + dividers for Discord. | Symbol Combo Templates, Dividers, Stars & Sparkles, Frames & Brackets |
| instagram-symbols | Explicit IG combos for bios/captions. | Instagram Symbol Combos, Bio-Ready Symbols, Story & Highlight Cover Symbols |
| y2k-symbols | Explicit Y2K combo templates. | Y2K Combo Templates, Crosses & Stars, Decorative Dust & Sparkle |
| tiktok-symbols | Bio separators/dividers pasted as units. | TikTok Bio Separators & Dividers, Trending Aesthetic Characters |
| flower-symbols | Dedicated floral-divider/bio-set section. | Floral Dividers & Aesthetic Bio Sets, Unicode Floral Characters |
| star-symbols | Dedicated aesthetic star decoration section. | Aesthetic Star Bio Decorations, Asterisks & Sparkle Symbols |

### Medium fit (named-aesthetic bio decoration)

| Slug | Rationale | Collection groups to build from |
|---|---|---|
| coquette-symbols | Bows/hearts/dust strings pasted as aesthetic units. | Bows & Ribbons, Soft Hearts, Dots & Dust, Flowers |
| cottagecore-symbols | Includes a soft-borders set. | Soft Cottagecore Borders, Mushrooms & Plants, Moon & Sky Motifs |
| kawaii-cute-symbols | Cute marks/pastel motifs pasted as strings. | Decorative Marks, Pastel Motifs, Cute Hearts |
| goth-grunge-symbols | Dark-aesthetic decoration strung together. | Crosses & Daggers, Dark Florals, Skulls & Death Motifs |
| bow-ribbon-symbols | Bow+heart combos already grouped. | Bow & Heart Combos, Bow Emojis & Symbols |
| heart-symbols | Color sets + decorative heart strings for bios. | Colored Heart Emojis, Decorated Heart Emojis, Unicode Heart Characters |

### Weaker / optional fit (single-glyph intent partly competes — confirm before adding)

| Slug | Rationale | Collection groups to build from |
|---|---|---|
| witchy-occult-symbols | Occult/aesthetic strings, but also an alchemical reference. | Pentagrams, Moon Phase Symbols, Planetary & Astrological |
| roblox-symbols | Platform-driven decoration strings for display names. | Cute Decorations, Y2K Style Symbols, Roblox-Friendly Symbols |
| music-symbols | Has a note-decoration section; mostly single-note lookup. | Music Note Bio Decorations, Musical Notes |
| text-faces-kaomoji | Task-listed kaomoji combos, but each kaomoji is already a unit. | Happy/Sad/Love/Animal Kaomoji groups |

## REMOVE shortlist (2) — has it, but no real opportunity

| Slug | Rationale |
|---|---|
| math-symbols | Math operators / comparison / set symbols are looked up one at a time — the task's explicit single-glyph case. The current "Greek Alphabet Sequences" collection is the only set-like use; the rest of the page does not warrant collection copy. |
| number-symbols | Circled / superscript / Roman numerals are chosen individually — the task's explicit "individual numerals" case. "Number Sequences" is the lone set-like grouping; collection copy is otherwise a poor fit. |

## Method notes
- `has_collection_now` was detected by grepping each page for `buildGrids` /
  `copy-collection-btn`; exactly 7 pages matched (chess, emoji-flags, math, moon-celestial,
  norse-viking-runes, number, zodiac).
- `collection_opportunity` is a judgement on whether users plausibly paste a SET
  of the page's symbols together, grounded in each page's section headings
  (e.g. "…Combos", "…Templates", "…Borders", "…Sets", "…Sequences").
- Semrush was not required: page intent was unambiguous from titles, descriptions,
  and section structure.
- Re-running `data/build_collection_copy_audit.py` refreshes the ledger in place.
