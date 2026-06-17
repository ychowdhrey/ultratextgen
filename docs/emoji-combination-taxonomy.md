# Emoji & Symbol Combination Taxonomy

The canonical reference for the **different kinds of multi-glyph content** the
library ships, so we stop conflating them when we plan pages. It formalizes the
`copy_patterns` field used in `data/library_opportunities.csv` and the copy
mechanics in [`unicode-library-workflow.md`](./unicode-library-workflow.md) §5,
and sits beside [`page-vs-section-decisions.md`](./page-vs-section-decisions.md)
(when a thing earns a page) and [`jtbd-principles.md`](./jtbd-principles.md)
(why).

> **Two independent axes.** Every library item is classified on **two** axes that
> must not be collapsed into each other:
>
> 1. **`copy_patterns` — structure / count** (§§1–7): is the artifact one glyph,
>    a fused string, or a set of peers? This decides the *runtime* (single tile,
>    whole-string tile, or `buildGrids` set-copy).
> 2. **`presentation_class` — what the glyph *is*** (§§8–10): `symbol` · `emoji` ·
>    `emoticon` · `kaomoji`. This decides **whether two intents share one page**
>    (§9) and **which `alternateName` synonyms are on-intent** (§10).
>
> They correlate but are orthogonal: a `single` can be a `symbol` (`★`) *or* an
> `emoji` (`🔥`); a `combo` can be a `kaomoji` (`◕‿◕`) *or* an emoji string
> (`🗣️🔥💯`). Tag **both**, every time.

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

## 8. The second axis: `presentation_class` (symbol · emoji · emoticon · kaomoji)

§§1–7 classify by **structure** (count / copy unit). This axis classifies by
**what the glyph actually is** — its character class and how it renders. Users
say these four words loosely and often interchangeably, but they are four
**technically distinct** things, and the distinction is what drives the
page-merge call (§9) and `alternateName` selection (§10).

| `presentation_class` | What it is, technically | Renders as | Read | Code-point shape | Examples |
|---|---|---|---|---|---|
| **`symbol`** | A text code point with no `Emoji_Presentation` — a monochrome glyph styled by the **surrounding font** (inherits color, size, weight) | text glyph | upright | almost always **one** code point | `★ ♥ ☂ ✓ ∑ € ☮ ☯ ♈ ♪` |
| **`emoji`** | A code point (or **sequence**) carrying `Emoji_Presentation`, drawn as **vendor color art** from an emoji font | color picture | upright | often **multi**-codepoint: `FE0F` selector, ZWJ families, skin-tone, regional-indicator flags | `❤️ 🔥 😂 🇯🇵 👨‍👩‍👧 🫶🏽` |
| **`emoticon`** | A **typed** Western face built from ASCII/Latin punctuation, read rotated 90° | plain text | **sideways** | a short typed string (a `combo`) | `:-) :( ;) <3 :')` |
| **`kaomoji`** | A **typed** Japanese-style face built from symbols/CJK, read head-on, no rotation | text glyphs | **upright** | a typed string of real symbols (a `combo`) | `◕‿◕ (╯°□°)╯ ʕ•ᴥ•ʔ ¯\_(ツ)_/¯` |

The three distinctions that actually trip people up:

- **`symbol` vs `emoji` — the `FE0F` overlap.** Some code points are **both**,
  switched by a variation selector. `U+2764` is `❤` (a text **symbol**) but
  `❤️` = `U+2764 U+FE0F` forces **emoji** presentation. Treat `❤` and `❤️` as
  **two different items** (different class, different render, different intent
  word). Most symbols never gain an emoji form; most picture-emoji were never
  plain symbols. Overlapping, *not* identical.
- **`emoticon` vs `kaomoji` — orientation + origin.** Both are *typed strings*
  (so both are `combo` on the structure axis), but emoticons are Western and
  read **sideways** (`:-)`), kaomoji are Japanese and read **upright**
  (`(╯°□°)╯`). Don't lump them: they're searched by different names.
- **`kaomoji`/`emoticon` vs `emoji` — built vs drawn.** A kaomoji is *assembled
  from real symbols* and stays monochrome text; an emoji is a *single drawn
  picture*. `(╯°□°)╯` is **not** `😠`. They are never the same item and rarely
  the same page (§9).

> **Colloquial drift (important for §10).** In everyday search, **"emoticon"**
> is frequently used to mean **"emoji"** for a concrete concept ("heart
> emoticon" ≈ "heart emoji"). So `emoticon` is **both** a real class (the `:-)`
> family) **and** a loose synonym word people type for symbols/emoji. We exploit
> that as an `alternateName` synonym (§10) without letting it blur the class.

---

## 9. One page or many — merging intent **across** classes

The user-facing question: *when someone searches "heart symbol," "heart emoji,"
and "heart emoticon," do they want the same page?* Often **yes** — and
`heart-symbols` already answers all three (its `<title>` is literally *"Heart
Symbol Collection: Copy & Paste Heart **Emojis** & Characters"* and it ships both
text hearts `❤ ❣` and emoji hearts `💕 💖 ❤️‍🔥`). But it is **not** universal.
The rule:

**MERGE onto one concept page** when the classes are interchangeable expressions
of **one concrete concept**, and the searcher neither knows nor cares about the
class:

- Concept nouns that exist as **both** a `symbol` and an `emoji`: `heart`,
  `star` (`★`/`⭐`), `arrow`, `check` (`✓`/`✅`), `crown`, `sun`, `music note`
  (`♪`/`🎵`), `flower`.
- → **One page.** Show both presentations, **grouped and labelled** ("text
  symbols" vs "emoji"), cover the `FE0F` variants, and capture *symbol / emoji /
  emoticon* as synonym queries in `alternateName` (§10).

**KEEP SEPARATE** when any of these is true:

1. **The concept exists in only one class.** Math (`∑ ∫ ≠`), Greek
   (`α β γ`), IPA, box-drawing, currency signs (`€ £ ¥`) have **no emoji
   counterpart**. Symbol-only page → **do not** bolt on emoji, **do not** add
   "emoji" synonyms. (`currency-symbols` is `symbol`-only.)
2. **The two forms are different jobs.** `currency-symbols` (`€ £ $`, the typist
   needs the sign) ≠ `money-emojis` (`💰 💵 🤑`, the poster wants the picture).
   Same topic, **opposite intent** — two pages, no synonym crossover.
3. **It's a kaomoji / emoticon destination.** People search *"kaomoji,"* *"text
   faces,"* *"Japanese emoticons,"* *"`:-)` emoticons"* as their **own** intent.
   These are `combo` library pages (`text-faces-kaomoji`) and **stay separate**
   from any concept page, even when a face emoji exists — `(╯°□°)╯` ≠ `😠`.

Decision flow:

```
   is the query a concrete concept that exists in >1 class?
                         │
              ┌──────────┴──────────┐
             yes                     no
              │                       │
   same JTBD across classes?     ONE class → its own page;
        ┌─────┴─────┐            alternateName stays in-class (§10)
       yes           no
        │             │
   MERGE: one     SEPARATE: the
   concept page,  forms are different
   both classes,  jobs (currency vs
   labelled       money-emoji) → 2 pages
```

---

## 10. Picking `alternateName` from the classification

This is where the two axes pay off. The Schema.org `alternateName` machinery
([`scripts/alternatename-seo-report.md`](../scripts/alternatename-seo-report.md),
validated by `scripts/validate-alternatenames.py`: **≤ 8 items, ≤ 60 chars,
no dupes**) is how a page captures the *class-synonym* queries. The
`presentation_class`(es) a page **actually serves** decide which synonym words
are **on-intent** (include) vs **off-intent** (exclude):

> **The one rule:** a class-synonym word may appear in `alternateName` **only if
> the page actually ships that class's artifact.** Don't claim *"emoji"* with no
> emoji on the page; don't claim *"symbol"* on an emoji-only page. Wrong synonyms
> import mismatched intent (bounce) and waste the 8-slot budget.

| Page (class served) | **Include** in `alternateName` | **Exclude** (off-intent) |
|---|---|---|
| **Merged concept** — `heart` (`symbol` + `emoji`) | "Heart Symbols", "Heart Emoji", "Heart Emoticon", "Copy Paste Heart", "Heart Text Symbol" | — (all four words are legitimate here) |
| **Symbol-only** — `currency-symbols` (`symbol`) | "Currency Symbols", "Currency Signs", "Money Symbols" | ✗ "Currency Emoji", ✗ "Money Emoji" (→ that's `money-emojis`) |
| **Emoji-only** — `face-emojis` (`emoji`) | "Face Emojis", "Smiley Emoji", "Emoticons" (colloquial), "Emoji Faces" | ✗ "Face Symbols" (no text-symbol set on the page) |
| **Kaomoji** — `text-faces-kaomoji` (`kaomoji`) | "Kaomoji", "Japanese Emoticons", "Text Faces", "Emoticons" | ✗ "Face Emoji" (≠ the `😀` set), ✗ "Face Symbols" |

Practical order of operations when writing a page's `alternateName`:

1. Determine `presentation_class`(es) the page **serves** (§8).
2. For **each** served class, add its head-noun synonym(s): `symbol` → "…
   Symbols/Signs/Characters"; `emoji` → "… Emoji/Emojis"; `kaomoji` → "Kaomoji /
   Text Faces / Japanese Emoticons"; `emoticon` (typed) → "Emoticons".
3. Add the **colloquial** cross-words **only** where §9 says the intent merges
   (e.g. "… Emoticon" on a concept page that serves symbol+emoji).
4. Stop at 8, keep each ≤ 60 chars, no duplicates (the validator enforces this).

---

## 11. Recommended follow-ups (not yet done)

1. **Document the field properly.** Update `unicode-library-workflow.md` §5 to
   reference this doc and list all five `copy_patterns` values (it currently
   names only two), **and** the four `presentation_class` values (§8).
2. **Audit `presentation_class` + `alternateName` across the library** (separate
   PR). Add the `presentation_class` column to `data/library_opportunities.csv`,
   classify every live page per §8, flag pages that should **merge/split** per
   §9, and reconcile each page's `alternateName` set against §10 (off-intent
   synonyms to remove, missing class-synonyms to add). Wire the §10 rule into
   `scripts/validate-alternatenames.py` where checkable.
3. ~~**Let the auditor know `combo` is volume-exempt.**~~ **Done.**
   `scripts/audit_library_opportunities.py` now waives
   `flag_missing_search_volume` / `flag_low_demand_confidence` (and the
   resulting `needs-research` verdict) for `copy_patterns = combo` rows with
   `forum_evidence` `medium`+ (§7), via the `is_volume_exempt(...)` helper.
   Waivers are surfaced as `combo_volume_waived` in the run summary and noted
   per row in `audit_notes`. Unproven combos (`none`/`weak` evidence) stay
   gated.
4. **Re-theme, don't multiply, the combos.** Treat the 96 `*-emoji-combos` as a
   `combo` family to re-point at vibe/context/fandom over time (per the
   2026-06-17 audit); keep them live for now.
