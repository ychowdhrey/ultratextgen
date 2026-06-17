# Emoji & Symbol Combination Taxonomy

The canonical reference for the **different kinds of multi-glyph content** the
library ships, so we stop conflating them when we plan pages. It formalizes the
`copy_patterns` field used in `data/library_opportunities.csv` and the copy
mechanics in [`unicode-library-workflow.md`](./unicode-library-workflow.md) §5,
and sits beside [`page-vs-section-decisions.md`](./page-vs-section-decisions.md)
(when a thing earns a page) and [`jtbd-principles.md`](./jtbd-principles.md)
(why).

> **Why this doc exists.** The workflow only ever defined two copy patterns
> (`single` / `collection`), but the backlog has quietly grown **five** in
> active use — `single` (229), `combo` (134), `collection` (111),
> `section` (267), `transform` (24). Three of those describe *multi-glyph*
> content and were never told apart. This is the standing definition so future
> pages get tagged the same way every time.

---

## 1. The core idea: glyph **count** is not the discriminator

The instinct is to split on "one symbol vs. many." That's wrong and it's the
source of the confusion. **Many-glyph content splits into two completely
different things:**

- A **combination** is *one atomic, ordered artifact* — many glyphs fused into a
  single meaning (`◕‿◕`, `🗣️🔥💯`, `⋆｡°✩`). Splitting it destroys it. The user
  wants **the whole string, as one paste.**
- A **collection** is *a set of independent peers* — distinct glyphs that share
  a family (ASEAN flags, zodiac signs, chess pieces). Each stands alone. The
  user wants **one of them, or the whole set.**

So the two real questions for any multi-glyph idea are:

1. **Atomic or set?** Is it one fused artifact (→ combination) or a group of
   peers (→ collection)?
2. **What is the copy unit?** The whole arrangement, one member, or the entire
   family?

Everything below follows from those two questions.

---

## 2. The five types (the full `copy_patterns` vocabulary)

| `copy_patterns` | What it is | Copy unit | How it renders | Primary JTBD | Demand / discovery channel |
|---|---|---|---|---|---|
| **`single`** | One standalone glyph (the atom) | one character | `.symbol-tile` whose `data-symbol` is **one char** (`★`) | "give me *this one* character" | **Keyword head-noun**, high volume (`heart symbol copy paste` 22k) |
| **`combo`** | A crafted, ordered multi-glyph **string** (atomic) | the **whole string** | `.symbol-tile` whose `data-symbol` is the **entire sequence** (`◕‿◕`, `🗣️🔥💯`) — one click = whole artifact | "give me this whole little artwork/expression as one paste" | **Social discovery** (TikTok), organized by *vibe / context / fandom*; largely keyword-invisible |
| **`collection`** | A **set of distinct peers** in one family | **one member *or* the whole set** | `.symbol-tile` per member **plus** `UltraTextGen.buildGrids(...)` to copy the set in a chosen format (inline/vertical/…) | dual: "copy one of these" **and** "copy the whole matching set" | **Keyword head-noun for the *set*** (`zodiac symbols`, `ASEAN flags`) and/or members; rarely searched "by combination" |
| **`section`** | Not a standalone page — folds into a parent hub | n/a (inherits parent) | a block inside another page | enrichment of an existing intent | n/a — gated out as a page by [`page-vs-section-decisions.md`](./page-vs-section-decisions.md) |
| **`transform`** | Algorithmically generated text, not a curated glyph set | the transformed output | the renderer's `transform` types (backwards, smallCaps, mirror, zalgo, upside-down) | "restyle *my* text" | keyword, but it's a **generator**, not a library of fixed items — the odd one out here |

The first three are the multi-glyph types people confuse. `section` and
`transform` are included only so the vocabulary is complete; they're a
page-vs-section call and a generator mechanism respectively, not "combo" types.

---

## 3. `combo` vs `collection` — the distinction in full

This is the pair the brief was about (kaomoji/emoji-combo **combination** vs
ASEAN-flags **collection**). They look alike (both are "more than one glyph")
and behave oppositely:

| | **`combo`** (combination) | **`collection`** (set of peers) |
|---|---|---|
| Structure | **ordered, fused** — meaning is the arrangement | **unordered membership** — meaning is the family |
| Split it and… | it's destroyed (`◕‿◕` → `◕` `‿` `◕` is nonsense) | each piece still stands (`🇮🇩` is fine alone) |
| Copy unit | always **the whole string** | **one member or all members** |
| Render | one tile, `data-symbol` = full string | tiles per member **+** `buildGrids` set-copy |
| Multiple formats matter? | No — it's already one fixed string | **Yes** — inline/vertical/spaced is the differentiator |
| Searched "by combination"? | **Yes** (as a vibe: "funny emoji combos") but mostly **social**, not Google | **No** — searched as the *family head-noun* ("ASEAN flags"), almost never "by combination" |
| Authority comes from | breadth of *vibes/contexts* | completeness of the *set* |

**The ASEAN-flags point, precisely:** it's a `collection`, not a `combo`. Nobody
searches "the combination of ASEAN flags," so framing/slugging it as a "combo"
would chase a query that doesn't exist. It earns a page (if at all) on the
**set's own head-noun + utility** ("ASEAN flag emojis"), and its value is the
*copy-the-whole-set* job — which is the `collection` runtime (`buildGrids`),
i.e. the retention play, not a keyword play.

---

## 4. Where they overlap (and how to break the tie)

```
        glyph count > 1 ?
                │
        ┌───────┴───────┐
       no               yes
        │                │
     SINGLE      atomic & ordered?
                  ┌──────┴──────┐
                 yes            no
                  │              │
                COMBO       set of peers?
                              ┌───┴───┐
                             yes      (no → it was really a SINGLE or a COMBO)
                              │
                          COLLECTION
                              │
                   does the set/combo clear the
                   page-vs-section demand+supply gate?
                              │
                        no → SECTION
```

Genuine overlaps and the rule that settles them:

- **`single` ⟷ `collection`.** A `collection` page is *built from* singles, and a
  single-glyph page is a degenerate one-family collection. **Tie-break by the
  foregrounded job:** if the page exists so users grab *one* glyph → `single`
  (heart-symbols). If it exists so they grab the *matching set* (and offers
  set-copy via `buildGrids`) → `collection` (zodiac-symbols). A page can do
  **both** (single tiles + a `buildGrids` block) — tag it by its *primary*
  intent and the presence of `buildGrids` makes the validator treat it as a
  collection.
- **`combo` ⟷ `collection`.** A page can present *a collection of combos*
  (e.g. 30 funny emoji combos). Each tile is a `combo` (whole-string copy); the
  page-level pattern is still `combo` because there is **no peer-set to copy as
  one unit** — you don't paste all 30 combos at once. Use `collection` only when
  "copy the entire set together" is a real job.
- **`combo` ⟷ `single`.** A kaomoji tile *renders* like a single tile, so they're
  mechanically similar — but tag `combo`, because the demand channel and page
  organization differ entirely (vibe/social vs. keyword head-noun). Mislabeling
  combos as singles is what hides their social-discovery nature.

---

## 5. How the current site maps onto this

| Page(s) | Correct type | Notes |
|---|---|---|
| `heart-symbols`, `arrow-symbols`, `currency-symbols` | `single` (+ optional `collection`) | head-noun keyword pages; some already add `buildGrids` |
| `text-faces-kaomoji` | `combo` | tiles carry whole strings (`◕‿◕`) — confirmed |
| `zodiac-symbols`, `chess-symbols`, `card-suit-symbols`, `emoji-flags` | `collection` | call `buildGrids`; copy-the-set is the job |
| `aesthetic-borders-frames`, `line-divider-symbols` | `combo` | decorative arrangements, copied whole |
| **the 96 `*-emoji-combos`** (players/countries) | **mis-built `combo`** | right *pattern*, **wrong axis** — built on *subject* (player/country), but `combo` demand clusters on **vibe/context/fandom** (funny, cute, tiktok-comment, Sonic). See the 2026-06-17 GSC/forum findings: 0 impressions, demand is social. Re-theme, don't multiply. |

---

## 6. Tagging rules for the backlog (do this every time)

When you add an opportunity row, set `copy_patterns` by this checklist:

1. One glyph, grabbed alone → **`single`**.
2. Many glyphs fused into one string people paste whole → **`combo`**.
   - Then theme it by **vibe / context / fandom**, never by an arbitrary subject
     axis, and expect **social** discovery (note it in `notes`; search volume
     may legitimately be near-zero without killing the row — see §7).
3. A family of peers where "copy the whole set" is a real job → **`collection`**;
   it must render `buildGrids`. Justify it on the **set's head-noun**.
4. Clears neither the demand nor supply gate as a standalone page →
   **`section`** (fold into the hub).
5. It's a text *generator*, not a fixed set → **`transform`**.

---

## 7. The acquisition-vs-retention caveat (don't let the demand gate misfire)

The library workflow's demand gate assumes **keyword** demand. That's right for
`single` and `collection` (head-noun searchable) but it **misfires on `combo`**,
whose demand is social and keyword-invisible by nature (see the 2026-06-17
research: a whole competitor — emojicombos.com — plus TikTok Discover hubs, with
~nothing in Google/Semrush). So:

- For `combo` rows, **don't auto-reject on low `search_volume`.** Record the
  social evidence (TikTok/forum) as `forum_evidence`, mark the channel in
  `notes`, and judge on the **copy-a-whole-string JTBD + retention**, not
  acquisition. This is the "hidden JTBD" the brief identified: people want to
  copy a *group/arrangement*, and offering it well (incl. multiple copy formats
  for `collection`) is a **retention/UX** lever, not a search lever.
- For `single`/`collection`, the existing keyword demand gate stands.

---

## 8. Recommended follow-ups (not yet done)

1. **Document the field properly.** Update `unicode-library-workflow.md` §5 to
   reference this doc and list all five `copy_patterns` values (it currently
   names only two).
2. **Let the auditor know `combo` is volume-exempt.** Teach
   `scripts/audit_library_opportunities.py` not to raise
   `flag_missing_search_volume` / `flag_low_demand_confidence` for
   `copy_patterns = combo` when `forum_evidence` is `medium`+ (§7), so social
   demand isn't gated out.
3. **Re-theme, don't multiply, the combos.** Treat the 96 `*-emoji-combos` as a
   `combo` family to re-point at vibe/context/fandom over time (per the
   2026-06-17 audit); keep them live for now.
