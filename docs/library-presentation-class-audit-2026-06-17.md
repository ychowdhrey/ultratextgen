# Library `presentation_class` + merge/split + `alternateName` audit (2026-06-17)

Applies the §8–§10 framework from
[`emoji-combination-taxonomy.md`](./emoji-combination-taxonomy.md) to the **248
live `library/*` pages**. Goal: flag pages that are **split where they should
merge (or vice-versa)** per §9, and reconcile `alternateName` per §10.

## Method

Each page's glyphs (`data-symbol`) were classified strictly to respect the §8
`FE0F` overlap: a token counts as **emoji** only if it has an SMP code point
(`≥ U+1F000`), a `FE0F`/ZWJ sequence, a regional-indicator flag, or a skin-tone
modifier. Bare BMP symbols in the `U+2600–27BF` overlap block (`❤ ★ ☮ ♻`) count
as **`symbol`** (their default text presentation), *not* emoji.

> ⚠️ Heuristic, not Unicode `emoji-data`. The dominant-class split
> (≈163 emoji / 73 symbol / 12 mixed) is directional; the **flagged lists below
> are the audited output** and were eyeballed.

---

## Headline: there is **no "split → merge" backlog**

**Zero concept stems are split across two pages.** The site has no `heart-emoji`
page competing with `heart-symbols`, etc. — the `*-symbols` concept pages already
**absorb** the emoji forms (`heart-symbols` ships `❤ ❣` *and* `💕 💖 ❤️‍🔥`;
`star-symbols`, `arrow-symbols` likewise). The §9 *merge* instinct is already
universal. So the actionable findings are the **inverse** (over-merge) and **§10
reconciliation**, below.

---

## Finding 1 — §9 over-merge: 1 clean catch

A **functional** symbol page carrying emoji that belong to a *different job*,
where a dedicated emoji page already exists:

| Page | Emoji it carries | Why it's a §9 violation | Fix |
|---|---|---|---|
| **`currency-symbols`** | `💰 💱 💲 💳 💵 💶 💷 💴 🪙 💎` (11) | Currency *signs* (`€ £ ¥ $`) are a typist's job; money **emoji** are a poster's job — and **`money-emojis` already exists**. §9 keep-separate. | Move/section the money emoji into a clearly-labelled "money emoji" block or hand them to `money-emojis`. Its `alternateName` is already clean (no "emoji" word) — the glyphs are the misfit, not the naming. |

**Not flagged (legit merges):** `arrow-symbols` (`⬆️➡️↔️`) and `geometric-symbols`
(`🔴🔺🔷`) also carry emoji, but "arrow" and "circle/triangle/square" genuinely
exist as both a text symbol **and** an emoji of the *same concept* — these are
correct §9 merges, not violations.

---

## Finding 2 — §10 under-claim: 17 pages losing emoji-query reach

Emoji-heavy `*-symbols` pages that **serve** emoji but whose `alternateName`
carries **no "… Emoji" synonym** — leaving the "<concept> emoji" query
uncaptured (§10: a served class earns its synonym). Add one "<Concept> Emoji"
value (respecting the ≤ 8-item, ≤ 60-char cap):

| Page | emoji share | Page | emoji share |
|---|---|---|---|
| `tech-status-symbols` | 0.86 | `medical-symbols` | 0.55 |
| `peace-symbol` | 0.82 | `email-symbols` | 0.51 |
| `cottagecore-symbols` | 0.67 | `card-suit-symbols` | 0.44 |
| `therian-symbols` | 0.69 | `laundry-care-symbols` | 0.45 |
| `dreamcore-weirdcore-symbols` | 0.69 | `recycle-environment-symbols` | 0.40 |
| `witchy-occult-symbols` | 0.56 | `goth-grunge-symbols` | 0.39 |
| `islamic-symbols` | 0.58 | `checkmark-symbols` | 0.36 |
| `religious-symbols` | 0.33 | `whatsapp-symbols` | 0.34 |
| `zodiac-symbols` | 0.33 | | |

**Model to copy:** `heart-symbols`, `star-symbols`, `arrow-symbols` already do
this right (`"Heart Emoji Copy Paste"`, `"Arrow Emoji Copy Paste"`, …).

---

## Finding 3 — §10 over-claim: 2 pages off-intent

`alternateName` sells "emoji" but the page ships **zero** emoji — off-intent
synonym that imports mismatched intent (§10). Remove or replace:

| Page | Off-intent `alternateName` | Reality |
|---|---|---|
| `discord-symbols` | `"Discord Emoji Symbols"` | text symbols / kaomoji decoration, no emoji |
| `loading-text-symbols` | `"Loading Bar Emoji"` | text spinner characters, no emoji |

---

## Recommended next steps

1. **Schema field.** Add a `presentation_class` column to
   `data/library_opportunities.csv` and backfill it from this run.
2. **Finding 1** — de-contaminate `currency-symbols` (1 page).
3. **Finding 2** — add the missing "… Emoji" `alternateName` to the 17 pages.
4. **Finding 3** — drop the 2 off-intent "emoji" synonyms.
5. **Validator.** Teach `scripts/validate-alternatenames.py` the §10 rule where
   checkable: warn when a page has ≥ 30% emoji glyphs but no "emoji" synonym, and
   error when it has an "emoji" synonym but zero emoji glyphs.

Findings 2–4 are mechanical `alternateName` edits; Finding 1 touches page content
and should be its own change.
