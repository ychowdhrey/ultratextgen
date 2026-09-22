# Ratified local-only locale exceptions

Every page below has **no live English parent** and was discussed and explicitly
ratified as an exception to the English-Parent Rule
(`.claude/rules/localization.md` §1). The prose here is the reasoning of record;
the machine-readable state is `data/english_parent_exceptions.json`, which
`scripts/check-locale-parent-gap.js` reads — a listed page passes the gate's
`no-en-parent` check and an unlisted one fails it.

Entries are discussed decisions, **never added unilaterally to make a page pass**.
Each carries a `nextRecheck` date: an exception is a standing claim about EN demand,
and claims get re-verified, not grandfathered.

## Two different arguments, and they must not be conflated

**(A) "No English speaker would search this."** The concept has no English
analogue, so an English parent would sit at zero demand by construction.

**(B) "The EN SERP consolidates the term onto a page we already own."** There *is*
real English demand, but building a standalone EN page would cannibalize an existing
one — usually the EN homepage. This is a market-specific SERP-consolidation claim,
not a claim about demand, and it is the weaker of the two because it can be
falsified by a later EN SERP or GSC pull.

`x-default` on every page below falls back to the bare EN homepage **as a generic
default only**. That is not a translation-equivalence claim, so it must not be
auto-propagated as a real sibling relationship, and automated mesh tooling does not
know that — treat any tool-made hreflang change to these pages as a bug to revert.

## Argument A — genuinely local-only

### `ja/gal-moji/` (2026-07-25)
A Japanese hiragana/katakana lookalike-glyph cipher, registered in `styles.js` as a
Japanese-script-only `procedureId`. No English speaker would search "gal moji
converter" as a distinct query from the plain homepage generator.

### `ko/font-byeonhwan/` + `zh-tw/yingwen-ziti/` (2026-07-25)
A CJK-script-user tool for decorating Latin/English text, distinct in H1 and framing
from each locale's own homepage. "English font generator" is not a distinct English
query from the homepage generator.

### `id/tulisan-cuping/` (2026-07-26)
"Cuping" (cute typing) is an Indonesian RP/Telegram trend that respells *Indonesian*
words phonetically to sound cuter — r→l, s→c, drop final h (`sering`→`celing`,
`jangan`→`janan`) — with a few community-fixed forms the general rule does not
derive (`marah`→`mayah`). The transform operates on Indonesian phonemes, so an
English parent would not be a translation of it: English cute-speak / uwu-typing is
a different algorithm on different phonetics, and "cuping" is not a term English
speakers search. Structure: no hreflang cluster at all, `id/`-only marketing page,
with the transform itself living in the shared global `renderer.js`/`styles.js`
registry like every other style — **the code is never locale-partitioned; only the
page presenting it is.** Demand evidence: substantial combined ID-market demand for
"font cuping"/"cuping font" at low difficulty with weak incumbents.

**This is a precedent, not a template.** It does not license speculatively building
other locales' internet-slang transforms. Each future case needs its own demand
evidence and its own discussion.

### `id/usecase/nama-discord-keren/` (2026-08-03)
Surfaced from a site-wide duplicate-claimant scan: it claimed
`usecase/nickname-generator/`, which `id/usecase/nama-panggilan/` already owns. The
two are **not** duplicates — GSC (Jul 2–28) shows no query overlap at all:
`nama-discord-keren` draws 118 impressions led by "nama discord keren" (63) and
"nama role discord keren" (13), while `nama-panggilan` draws 28 led by "buat nama
panggilan keren" (5). It is a Discord-name page, and **this site has no EN
Discord-name parent** — `/discord/` is the generator hub and
`usecase/nickname-generator/` is the general nickname page. Ratified as local-only
rather than force-fitted to either. Its visible language switcher was trimmed to
match the locale-only hreflang block; a switcher still listing a cluster the page has
left is the same bug in the visible layer.

### `nl/sierlijke-letters/` (2026-08-03)
Claimed `category/cursive-fonts/`, which `nl/cursieve-letters/` already owns — and in
Dutch those are two different concepts: *cursief* is italic/slanted (what the Word
button does), while *sierletters* are ornamental/calligraphic. GSC confirms the split
**decisively and in the surprising direction**: `sierlijke-letters` draws 1,768
impressions / 45 clicks ("sierletters" alone 795/29) against `cursieve-letters`'
200/1, despite being the smaller, less-linked page. **Merging would have 301'd away
the best-performing NL asset on the site.** No EN "sierletters" parent exists.

Rule 3 was applied in the same change: `nl/cursieve-letters/` had "sierlijke letters
A–Z" in its own `<title>` and meta description — the hub targeting the spoke's head
term — now "cursief schrift A–Z".

### `vi/usecase/ten-lien-quan-dep/` + `zh-tw/usecase/chuanshuo-duijue-mingzi-fuhao/` (2026-08-03)
Nickname/special-character generators for the *same* specific game — Liên Quân Mobile
in Vietnam, 傳說對決 (Arena of Valor) in Taiwan — a MOBA with no meaningful
English-market presence and no EN name-generator page for it anywhere in `usecase/`
(checked: no `arena-of-valor-name-generator` exists).

Discovered as a byproduct of an unrelated hreflang audit: both were mis-parented onto
the generic `usecase/nickname-generator/` hub, which has room for one `vi` and one
`zh-TW` claimant — but that hub is genuinely generic while these two are narrowly
game-specific, so neither was a good match for its `x-default` identity in the first
place. Resolved by pairing them into their own isolated 2-locale cluster, mirroring
the `ko/font-byeonhwan/` + `zh-tw/yingwen-ziti/` precedent. The hub's `vi` slot was
reassigned to `vi/usecase/ten-game-hay/` (generic "cool game name"), which actually
matches that hub's intent.

**No demand check was run for this pair** — the keyword instrument was out of API
units at the time — so unlike the `id/tulisan-cuping/` precedent this exception rests
on the structural/linguistic argument rather than confirmed search volume. Revisit
with real numbers if either page's ranking becomes a live question.

## Argument B — EN SERP consolidation

### `fr/calligraphie/`, `fr/changeur-de-police/`, `fr/police-d-ecriture/` (2026-07-26)
Three of six `fr/` near-duplicate pages a 2026-07-25 audit flagged. A query-level GSC
pull (France, 26 days) settled the other three — `fr/ecriture-style/` and
`fr/generateur-de-texte/` retired via 301 to `fr/`; `fr/ecriture-speciale/` left
as-is at negligible volume — and confirmed these three pass the spoke test on
**French** evidence:

| page | evidence |
|---|---|
| `changeur-de-police` | **100%** of impressions on queries `fr/index.html` never ranks for at all — "change police", "changeur de police" |
| `calligraphie` | **76%**, "calligraphie copier coller" |
| `police-d-ecriture` | **54%**, largest and still-growing volume of the six — "police d'écriture", "police ecriture", where the homepage barely shows while this page holds a strong first-page position on the same query |

**Explicitly not argument A**: "font" and "calligraphy" are high-volume English
concepts. The reason no EN parent exists is that English/Spanish/Italian SERPs for
the concept pull the *same* competitor set as "font generator" — Google treats them
as synonyms there, so a standalone EN page would cannibalize the EN homepage. The
French data shows the opposite holds in the French market.

**That EN-side premise is inferred, not verified**, and has never been checked
against an EN SERP or EN GSC pull — the keyword instrument has been out of API units
since 2026-07-30. A standalone EN `/fancy-letters/` page has since shipped
(2026-08-11), which changes the EN-side picture the original ratification described
and is worth re-reading before treating the premise as settled.

The live non-English sibling `it/font-copia-e-incolla/` sits on the
`changeur-de-police` cluster. *(Correction 2026-08-02: `it/caratteri-speciali/` was
previously also listed there, making two `it` claimants on one cluster — invalid, and
flagged as a stacked-cluster conflict. `it/font-copia-e-incolla/` keeps the slot as
the concept-equivalent of "changeur de police"; `it/caratteri-speciali/` now stands
alone with a self-reference plus homepage `x-default`.)*

**Open follow-up (2026-07-26, unresolved):** `fr/changeur-de-police/` picked up new
content the same day (a "changer un texte déjà écrit" FAQ, a
changeur-vs-générateur distinction FAQ, a before/after example) matched to its GSC
cluster, and its IT siblings were not updated. See
`docs/architecture/translation-parity.md` §11 — the locale↔locale parity gap.

## Superseded

### ~~`tr/sekilli-yazi/` (2026-08-02)~~ — retired 2026-09-03, ledger entry removed

Kept because the *shape* of the argument still applies to the `fr/` trio, and because
the way it failed is the lesson.

**The original ratification** was argument B, explicitly not A. The page targeted
`süslü yazı` / `süslü harf`, which obviously has English demand — but the EN homepage
already *is* that page (H1 "Fancy Text Generator", "fancy text" ×14, no standalone EN
fancy-text page), so building an EN parent would have cannibalised it. On the Turkish
side the two were held not to compete: first-party GSC (27 days to 2026-08-02) showed
the page drawing the overwhelming majority of its impressions on `süslü` queries at
first-page positions, while sitting far down the SERP on the `şekilli yaz*` family
`/tr/` owns. It was retargeted onto `süslü` on 2026-08-01 for exactly that reason.

**Why it was retired.** A query×page pull (Türkiye, 2026-08-24 → 09-01) showed the
page owning *neither* family: **one impression in nine days at position 49**, against
~53 expected from its own 3-month baseline of 539 Turkish impressions at position 10.
In the same window `/tr/` held `süslü yazı kopyala yapıştır` at position 7 and the
`şekilli yazı` writing queries at 1–5, and `/tr/sekilli-nick/` held the nick queries
at 5–6. The retarget had moved the page onto a term the homepage then went on to win
outright, leaving a spoke with no query to own — Hub-vs-Spoke Rule 3 in its sharpest
form, where **the hub wins the spoke's own target term.**

**Two things to carry forward.** A de-confliction retarget can fail by the hub simply
*winning the new term too*: "the spoke owns term B today" is a fact with a shelf
life, not a structural property. And the EN-side cannibalisation premise was **never
verified** in the 13 months this entry stood — the same unverified premise the `fr/`
trio still carries.

## A same-day counter-example: not every no-parent page is an exception

`ja/font-henkan/` was reviewed in the same 2026-07-25 pass as `ja/gal-moji/` and
found to be **cannibalization, not a legitimate local-only case**: identical
title/H1 to `ja/index.html`, thinner content, zero cross-links. It was
301-redirected to `ja/index.html` instead of ratified.
