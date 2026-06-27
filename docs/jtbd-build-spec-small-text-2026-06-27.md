<!--
Related docs:
  - jtbd-principles.md ............ evergreen "why" + global rules this spec applies (esp. §6 demand, §7 canonical ownership, §9 differentiator discovery)
  - page-vs-section-decisions.md .. page vs. section gate
  - jtbd-build-spec.md ............ prior spec (2026-06-04); this one expands the small-text cluster it shipped as B1
  - unicode-forum-research-skill.md the forum-signal methodology behind the JTBD + frustration grades
This file is a dated, approved-scope build spec. Supersede it with a new spec
rather than editing the historical scope in place.
-->

# Small-Text JTBD Build Spec — placement map

**Repo:** `ychowdhrey/ultratextgen` · **Date:** 2026-06-27
**Scope:** how the small-text demand cluster is distributed across the existing
site taxonomy — which job lives where, who owns which query, and the
differentiating features the hub must ship. Builds on the already-shipped
`/category/small-text/` (B1 in [`jtbd-build-spec.md`](./jtbd-build-spec.md)).

**Inputs:** attached SEMrush exports (US volume) + forum-signal sweep
(grades reflect cross-community language consistency; Reddit/Quora block
automated fetch, so quotes come from Tumblr RP, Hypixel, HN, Roblox DevForum,
Q&A forums). **Other-market/non-English volume is NOT yet pulled** — Semrush MCP
was out of API units on 2026-06-27. Re-run "small/tiny text generator" across
ES/BR/DE/FR/RU/ID databases once units are topped up and append a §"i18n" here.

---

## The strategic answer in one line

Small text is **a group of ~6 distinct jobs, not one** — so it is **hub +
distributed spokes**, NOT all-spokes-under-`/category/small-text/`. The hub owns
the head term; each job is owned by the page **type** that matches its intent
(§4 namespace = page type). Styles surface on multiple pages via `familySlug`
arrays; **content is never duplicated** — each page owns a different SERP and
cross-links to the others (§7).

---

## Placement decision per JTBD

> Notation: **Owner** = the page whose title/H1 targets that job's head query.
> **Also appears on** = pages that surface the style/section but link to the
> owner rather than re-hosting the intent.

### JTBD 1 — "Make my Discord text small" (~34K/mo) → **BOTH, split by intent**

It's two intents and they go to two page types:

| Sub-intent | Volume | Owner | Why |
|---|---|---|---|
| **How-to** ("how to make text small in discord") | ~20K | **NEW `/answers/how-to-make-text-small-on-discord/`** | Question SERP. Must lead with the **`-#` subtext markdown** for *messages* (the native answer almost no ranker gives), then route to Unicode small caps for *bios / nicknames / server headers* where `-#` doesn't work. |
| **Tool** ("discord small text generator") | (folds into discord fonts) | **`/discord/`** (unchanged) | Already canonical for the generator intent; additive only. |
| **Styles** | — | **`/category/small-text/`** | Hub keeps the small-caps style + a Discord example, links up to the answer page. |

- The current `/discord/` "Make Small Text on Discord" section is **weak — it
  never mentions `-#`.** Fix: point it at the new answer page; keep the
  generator otherwise unchanged (§ global additive rule).
- Pairs with the already-specced `/answers/discord-allowed-characters/` (field
  rules) — cross-link, don't merge.
- **Verdict for you:** (c) **both** — Discord page (tool) + new Discord answer
  page (the decisive `-#` how-to) + hub (styles). Each owns a different SERP.

### JTBD 2 — Whisper / mutter in RP & fanfic (diffuse, no head term) → **SECTION + FEATURE, not a page**

- No head query → fails the demand gate for a page (§6, page-vs-section gate).
- **Home:** the **superscript spoke** (see JTBD 4) leads its *copy* with
  whisper / aside / RP / fanfic language; the **mixed big/small composer**
  feature (below) is what actually serves this job — shrink a *selection*
  inside a normal sentence (`a ᵗⁱⁿʸ ʷʰⁱˢᵖᵉʳ`), not whole-text conversion.
- **Verdict for your "no idea":** it's not a page — it's the framing for the
  superscript style **plus** the inline-mix feature on the hub.

### JTBD 3 — Editorial bio identity / small caps (~4.5K cluster) → **BOTH, split**

| Owner of… | Page | Action |
|---|---|---|
| "bio" intent | **`/usecase/bio-font/`** | Add a **small-caps / "clean"** mood tab (today only cursive/bold/gothic/bubble) + **interpunct (·) divider** bio presets. |
| "small caps generator" tool term | **`/category/small-text/`** | Hub keeps the small-caps style, demonstrates the editorial-bio use case, links to bio-font for full bio building. |

- Style cross-lists via `familySlug` (`small-caps` already carries
  `['small-text','aesthetic-fonts']`). No new page.
- **Verdict for you:** **both** — bio-font owns "bio," the hub owns "small caps
  generator." Don't relocate; deepen bio-font as a section.

### JTBD 4 — Functional sub/superscript (19.8K/mo, 9.9K each) → **two NEW `/category/` spokes** *(you accepted)*

- **`/category/subscript/`** — lead with **chemistry formulas (H₂O), footnote
  markers, indices**. Canonical owner of "subscript generator."
- **`/category/superscript/`** — lead with **exponents (x²), ™, ordinals**, and
  carry the whisper/RP framing from JTBD 2. Canonical owner of "superscript
  generator."
- Both keep `familySlug: ['small-text', …]` so they **also appear on the hub**.
- These styles already exist in `styles.js` (Ultra Tiny Subscript / Ultra Small
  Superscript) — this is pages-for-existing-supply, pure upside.

### JTBD 5 — Username / gamertag flair (clan-tag suffix) → **BOTH, split**

| Owner of… | Page | Action |
|---|---|---|
| gaming username / nickname intent | **`/usecase/nickname-generator/`** + **`/usecase/clan-tag-generator/`** | Add the **superscript suffix pattern** (`name` + `ᵀᵀⱽ` / `ˢʰᵒᶜᶻ`) and **platform-rejection honesty** (Hypixel "invalid characters," TikTok username-rejects-but-display-name-accepts). |
| char-rejection question (Discord) | **`/answers/discord-allowed-characters/`** (already specced) | Already owns "invalid characters" for Discord fields. |
| tool term | **`/category/small-text/`** | Hub shows the suffix pattern, links out. |

- **No new Fortnite/Minecraft/Twitch/Steam pages** — diffuse long-tail, fails
  the demand gate. Deepen the existing username pages instead.
- **Verdict for you:** **both** — the gaming **usecase** pages own the intent;
  the hub owns the tool term and links to them.

### JTBD 6 — Fit more in a character limit → **SECTION (honesty note)** *(you accepted)*

- The truthful note — **tiny text is *visual* compression only; the underlying
  character count is unchanged** — is a trust/§9 differentiator.
- **Home:** a section on **`/category/small-text/`** (the hub) **and**
  **`/usecase/bio-font/`** (which already renders per-platform char limits:
  IG 150 / TikTok 80 / Discord 190 / X 160). Not a page.

---

## "Tiny" as a head noun (~32K combined) — **monitor, don't split yet**

`tiny text/font/letter generator` ≈ 32K rivals `small text generator` (27K),
and LingoJam runs a *separate* `/TinyTextGenerator` (31K traffic) vs its
small-text page (11K). Tempting to mint `/category/tiny-text/`.

**Decision: keep "tiny" as a co-equal target ON the hub for now.** Reasoning:

- **Supply is shared, not distinct** — "tiny" and "small" are the *same* Unicode
  ranges/styles. A separate URL would re-host the same generator → §7
  self-cannibalization risk, not additive.
- The hub already declares ownership of "small **/** tiny" and its title carries
  both vocabularies (`Small Text Generator (ₛₘₐₗₗ & ᵗⁱⁿʸ)`).
- **Trigger to split (additive, §7):** if GSC later shows the hub ranking for
  "small …" but materially **losing** "tiny …" queries, *then* spin a
  `/category/tiny-text/` spoke — because at that point two URLs both rank (the
  LingoJam condition) and the split is additive, not cannibalistic.
- Until then: ensure an on-page **"Tiny Text"** anchored section + H2 so the
  single URL is unambiguously relevant to both vocabularies.

---

## Differentiating features the hub must ship (§9 — unsolved frustrations → capabilities)

These are **features on the canonical owner pages**, not new pages. None are
solved by any current top-5 ranker; the renderer's existing fallback system is
already half-way to the first two.

| # | Feature | Frustration it kills | Grade |
|---|---|---|---|
| F1 | **Per-character coverage indicator** — flag letters a style can't render (superscript has no `q`; subscript misses `b c d f g w y`) instead of silently dropping them | "why did my letters disappear" — the #1 complaint everywhere | STRONG |
| F2 | **Per-platform "safe mode"** — only emit universally-rendering chars; warn on tofu-box risk (old Android) | blank boxes for other people | STRONG |
| F3 | **Native-vs-Unicode router** — tell users when the platform's own tool is better (Discord `-#`, Reddit `^()`, AO3/Tumblr `<small>`) and give Unicode only where it's the sole option | wrong-tool frustration; wasted Unicode in messages | STRONG |
| F4 | **Mixed big/small composer** — shrink a *selection* (whisper asides, name suffixes), not the whole string | nobody offers it; serves JTBD 2 & 5 | MEDIUM-STRONG |
| F5 | **Small-text-tuned decorations** — interpunct divider chains, emoji-header presets, tiny kaomoji (today's tabs are the generic homepage set) | generic decorations don't match the actual pairings | MEDIUM |
| F6 | **Honesty notes** — "visual only, char count unchanged" (JTBD 6) + screen-reader caveat ("keep core info in plain text") | competitors mislead; trust signal for HN/Tumblr/a11y crowd | MEDIUM |

---

## Canonical ownership (additions to the master table in jtbd-build-spec.md)

| Query family | Canonical owner |
|---|---|
| how to make text small on discord (how-to) | **NEW** `/answers/how-to-make-text-small-on-discord/` |
| subscript generator | **NEW** `/category/subscript/` |
| superscript generator | **NEW** `/category/superscript/` |
| small caps generator (tool) | `/category/small-text/` (hub) |
| bio small caps / clean bio styling | `/usecase/bio-font/` |
| gamertag / clan-tag suffix flair | `/usecase/nickname-generator/` + `/usecase/clan-tag-generator/` |
| small / tiny text generator (head) | `/category/small-text/` (unchanged; owns both vocabularies) |

No two rows compete; everything additive (§7).

---

## Build priority

1. **F1–F3 on the hub** (the moat — features, low risk, reuse the fallback system).
2. **`/answers/how-to-make-text-small-on-discord/`** (~20K how-to, the `-#` gap).
3. **`/category/subscript/` + `/category/superscript/`** (19.8K, styles already exist).
4. Deepen **`/usecase/bio-font/`** (small-caps mood + interpunct presets) and the
   **nickname/clan-tag** pages (suffix pattern + rejection honesty).
5. **F4–F6**, then JTBD 6 honesty sections.
6. **i18n:** pull non-English volume (Semrush units) → decide localized hub variants.

---

## i18n — Indonesia (id), analyzed 2026-06-27

Source: 7,066-keyword Semrush `id` export (user-provided). **Method note (§9 /
demand gate):** the raw 112,650 summed volume is **~69% noise for our intent** —
strip it before believing any total.

**Noise to exclude (not Unicode styling):**
- Excel/Word **case-conversion** — "merubah huruf besar ke kecil di excel" (37.7K
  vol). A spreadsheet text-case tool, not us.
- **School typography** — "huruf a kecil", "huruf kecil disebut", abjad/aksara/
  arab/latin (20.7K). Education.
- **Handwriting / case** — "tulisan tangan kecil", uppercase-vs-lowercase (~21K).

**Genuinely addressable ≈ 15–18K**, and it points somewhere *different from the
US*:

| Cluster (id) | ~Vol | Note |
|---|---|---|
| **Superscript — "kecil diatas"** | **~7,700** | "tulisan kecil diatas" 2,400 · "huruf kecil diatas" 1,300. The dominant ID cluster. |
| → **for nicknames** | ~1,300 | "huruf kecil diatas **untuk nickname**" 880 — gaming flair, JTBD 5. |
| "tulisan kecil" styling head | ~7,000 | ID equivalent of "small text generator" (+ font/generator/keren). |
| **Free Fire** | ~320+ | "tulisan kecil ff" — FF is *the* ID game (not Fortnite). |
| **WhatsApp how-to** | ~450 | "cara membuat tulisan kecil di wa" — WA is *the* ID platform (not Discord). |
| TM/ordinal superscript | ~370 | "tulisan tm kecil", "th kecil diatas". |
| subscript ("subskrip / kecil dibawah") | ~500 | technical. |

**Finding:** in Indonesia the killer app is **superscript small letters to
decorate gaming nicknames — Free Fire, shared on WhatsApp**, searched as
*"huruf kecil diatas untuk nickname."* The US drivers (Discord, the "tiny" head
noun) are nearly absent. Same underlying style we already ship; platform + game
flip.

**Decision (clears the demand gate):** build a **localized ID page** — NOT a
translated copy of the English hub. Working title *"Generator Huruf Kecil Diatas
(untuk Nickname)"*, leading with **Free Fire + WhatsApp**, superscript-first,
with the nickname suffix builder. Canonical owner of `tulisan kecil diatas` /
`huruf kecil diatas untuk nickname`. The English hub does NOT target these
(different language SERP → no cannibalization, §7).

**Why we win it (a11y/honesty differentiators land hardest here):**
- **F1 per-character coverage indicator** matters most for *names*: superscript
  has no real `q`, weak `c/f/…`; a nickname renders broken and no ID competitor
  warns. This is the moat.
- **F2 safe-mode for FF / WhatsApp** — flag which superscript chars actually
  render in FF nicknames / WA (they reject or tofu some). Nobody checks.
- They already want **superscript + symbols together** ("simbol huruf kecil
  diatas" 170) — our decoration system pairs them natively.

**Still open:** ES/BR/DE/FR/RU exports not yet provided. Repeat this
noise-strip-then-cluster method per market before trusting totals.
