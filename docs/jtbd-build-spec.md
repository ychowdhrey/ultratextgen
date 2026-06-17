<!--
Related docs:
  - jtbd-principles.md ............ the evergreen "why" + global rules this spec applies
  - page-vs-section-decisions.md .. when a topic gets its own page vs. a section
  - unicode-library-workflow.md ... the production pipeline for /library/ pages
This file is a dated, approved-scope build spec — a concrete application of
the principles above. Supersede it with a new spec rather than editing the
historical scope in place.
-->

# Ultratextgen — JTBD Build Spec (approved scope)

**Repo:** `ychowdhrey/ultratextgen` · **Date:** 2026-06-04
**Scope of this spec:** 6 new pages + 1 additive canonical fix. Nothing already shipped is included. Each item below is approved to build.

---

## Global rules (apply to every item)

1. **Additive only — do not remove or relocate content from `/discord/`.** The `/discord/` generator stays exactly as-is and remains canonical for **"discord fonts / discord font generator"** (its current top-performing query). The new Discord answer pages target *different* (question) SERPs the generator already scores 0 clicks on, so there is zero cannibalization risk to the existing ranking.
2. **One primary intent per page.** Each new page has exactly one primary target query (listed below). Everything else is secondary, served as a section — never as a competing H1/title.
3. **Namespace = page type.** Answer pages → `/answers/`. Style generators → `/category/`. Do not mix.
4. **Title/H1 must match the searcher's verb.** Answer pages must read as an answer in the SERP (e.g. "Do You Need Nitro…?"), not as a tool. This is the entire reason these pages exist — a generator title does not win a question query.
5. **Schema:** Answer pages use `QAPage` (or `FAQPage`) structured data with the question as the main entity. Category pages use the existing `WebApplication` pattern already used across `/category/*`.
6. **Linkage:** every new page links **up** to its hub once; every Answer page carries a **downstream CTA** into the matching generator; Library cross-links both ways.
7. **Monetization:** all new pages are content-bearing and ad-eligible (Grow/Mediavine init already sitewide). No page ships below ad-network length thresholds.

---

## A. New Answer pages — Discord cluster (`/answers/`)

> These follow the existing one-question-per-page pattern (`what-font-does-{facebook,snapchat,linkedin}-use`). Each is verdict-first: lead with the direct answer in the first sentence, then explain.

### A1. `/answers/do-you-need-nitro-for-discord-fonts/`

- **Page type:** Answer · **Primary target:** `discord supports unicode characters in messages without nitro` / `do you need nitro for discord fonts`
- **JTBD:** *When I want to style my Discord text, I want to know whether Nitro is required, so I can stop worrying about paying for it.*
- **Demand (GSC 28d):** ~1,068 impressions / 112 queries / currently 0% CTR
- **Title tag (≈):** "Do You Need Nitro for Discord Fonts? (No — Here's Why)"
- **H1:** "Do you need Nitro to use fonts on Discord?"
- **Required content:**
  - Opening verdict (first line): No — Unicode fonts work for every Discord account, free or Nitro. Nitro covers custom emoji, animated avatars, and bigger uploads, not text styling.
  - Why it works: the styled characters *are* Unicode (the bold/italic versions already exist in the standard), so Discord renders them with no special feature.
  - Where it works vs. doesn't: messages, display name, server nickname, bio/About Me, server names, role names = yes; **username = no** (link to A2 for the field-by-field breakdown).
  - The "blank boxes" caveat: a few characters don't render on all devices; Mathematical Alphanumeric styles (bold, italic, script, fraktur) have the widest support.
- **Canonical:** owner of all "nitro / without nitro / supports unicode" question queries.
- **Links:** down-CTA → `/discord/` generator ("Style your Discord text →"); across → A2, A3.

### A2. `/answers/discord-allowed-characters/`

- **Page type:** Answer · **Primary target:** `discord allowed characters unicode` (server name / nickname / username / channel name variants)
- **JTBD:** *When I set a name on Discord, I want to know which characters are allowed in each field, so my name doesn't get rejected or show as blank boxes.*
- **Demand (GSC 28d):** ~1,087 impressions / 82 queries / currently 0% CTR
- **Title tag (≈):** "Discord Allowed Characters: Username, Display Name, Server & Channel Rules"
- **H1:** "What characters are allowed on Discord?"
- **Required content:**
  - Lead with the core distinction that drives most confusion: **username ≠ display name.** Username = login ID (lowercase a–z, 0–9, `_` and `.` only, no consecutive periods, no Unicode). Display name = what people see (almost any Unicode, emoji, spaces, ~32 chars).
  - Field-by-field table — for each: Unicode allowed? char limit, gotchas:
    - Username — no Unicode; lowercase alphanumeric + `_` `.`
    - Display name — full Unicode, ~32 chars (mobile truncates ~18–20)
    - Server nickname — per-server; most Unicode works; some servers ban fancy fonts
    - Server name — Unicode, ~100 char max but ~30 practical display
    - Channel name — lowercase, numbers, hyphens, limited lowercase Unicode; no spaces/uppercase
    - Role name — Unicode works
    - Bio / About Me — full Unicode, ~190 chars
  - Note the recent change: a leading emoji at the *start* of a display name now gets stripped; put it at the end.
  - "Blank boxes" fix: test on mobile + desktop; swap to a wider-support style if it renders blank for others.
- **Canonical:** owner of all "allowed characters / characters allowed" question queries (username, nickname, display name, server name, channel name, bio).
- **Links:** down-CTA → `/discord/`; across → A1, `/library/discord-symbols/`.

### A3. `/answers/what-font-does-discord-use/`

- **Page type:** Answer · **Primary target:** `what font does discord use`
- **JTBD:** *When I see Discord's UI, I want to know what typeface it uses, so I can identify or match it.*
- **Demand (GSC 28d):** ~124 impressions / 7 queries / currently 0% CTR
- **Title tag (≈):** "What Font Does Discord Use? (gg sans, Explained)"
- **H1:** "What font does Discord use?"
- **Required content:**
  - Verdict: Discord uses **gg sans**, its own proprietary typeface, since 2023; before that a customized **Whitney** (Hoefler&Co).
  - It isn't available to download or use outside Discord.
  - Distinguish: this is the UI font; the styled text you paste into Discord is Unicode (link to A1/`/discord/`).
- **Canonical:** owner of "what font does discord use" and variants.
- **Links:** down-CTA → `/discord/`; across → A1.

> **Optional consolidation:** A1 + A2 may be merged into one "Discord fonts: Nitro & character rules" page if preferred (a strong competitor structures it that way). A3 stays separate to match the existing `what-font-does-X-use` pattern. Default build = three separate pages.

---

## B. New Category pages — style generators (`/category/`)

> Build on the existing `/category/*` generator template (live converter + style samples + supporting copy + `WebApplication` schema). Each owns a distinct named-style primary that does not overlap the homepage head term or other category pages.

### B1. `/category/small-text/`
- **Primary target:** `small text generator` / `tiny font generator` · **US volume:** ~20,610
- **JTBD:** *When I want a specific look, I want to generate small / tiny text, so I can use it in names, bios, and posts.*
- **Title/H1:** "Small Text Generator (ₛₘₐₗₗ & ᵗⁱⁿʸ)" — cover both "small" and "tiny" vocabulary on-page.
- **Canonical:** owner of small-text / tiny-text generator queries.

### B2. `/category/cute-fonts/`
- **Primary target:** `cute font generator` · **US volume:** ~10,830
- **JTBD:** *When I want a soft/playful aesthetic, I want cute styled fonts, so I can decorate a bio or username.*
- **Title/H1:** "Cute Font Generator" — include cute/preppy/cutesy variants in supporting copy.
- **Canonical:** owner of cute-font generator queries.

### B3. `/category/aesthetic-fonts/`
- **Primary target:** `aesthetic font generator` · **US volume:** ~3,100 + strong non-English demand
- **JTBD:** *When I want an "aesthetic" vibe, I want aesthetic styled text I can copy, so I can match a trend.*
- **Title/H1:** "Aesthetic Font Generator" — pairs with the i18n work; the non-EN demand ("huruf aesthetic", "écriture aesthetic à copier-coller") makes localized variants of this page high-value.
- **Canonical:** owner of aesthetic-font generator queries.

---

## C. Additive fix — `/library/discord-symbols/`

- **Change (additive, no removals):** make `/library/discord-symbols/` the declared **canonical owner of "discord symbols / symbol for discord"** and add a cross-link to it from `/discord/` (a "Looking for Discord symbols? →" link). Expand the curated symbol set if thin.
- **Why:** "discord symbols" queries currently dribble onto the `/discord/` generator at ~0% CTR; pointing them at the library page (the correct type) recovers them without touching the generator's "discord fonts" ranking.
- **Links:** up → `/discord/`; across → A2.

---

## Canonical ownership (declare these so pages don't compete)

| Query family | Canonical owner |
|---|---|
| discord fonts / discord font generator | `/discord/` (unchanged) |
| discord nitro / without nitro / supports unicode | `/answers/do-you-need-nitro-for-discord-fonts/` |
| discord allowed characters (any field) | `/answers/discord-allowed-characters/` |
| what font does discord use | `/answers/what-font-does-discord-use/` |
| discord symbols / symbol for discord | `/library/discord-symbols/` |
| small / tiny text generator | `/category/small-text/` |
| cute font generator | `/category/cute-fonts/` |
| aesthetic font generator | `/category/aesthetic-fonts/` |

---

## Acceptance criteria (PR checklist)

- [ ] Each new page sits in the correct namespace (`/answers/` for A1–A3, `/category/` for B1–B3).
- [ ] Each Answer page's title + H1 phrase the **answer/question**, not a tool, and the first sentence states the verdict.
- [ ] Each Answer page has `QAPage`/`FAQPage` schema; each Category page has `WebApplication` schema.
- [ ] `/discord/` content is **unchanged** except for the one added cross-link to `/library/discord-symbols/`.
- [ ] Every new page links up to its hub once and (Answer pages) includes a downstream CTA into the relevant generator.
- [ ] Canonical tags match the ownership table above; no two pages target the same primary query.
- [ ] New pages added to `sitemap.xml` with appropriate `lastmod`.
- [ ] Each page meets the standard ad-content length threshold.

---

## Priority order

1. A1 `do-you-need-nitro-for-discord-fonts` + A2 `discord-allowed-characters` (largest live demand, ~2,150 impr combined)
2. A3 `what-font-does-discord-use` (quick, pattern-consistent)
3. B1 `/category/small-text/` (largest untapped style cluster, ~20.6k vol)
4. B2 `/category/cute-fonts/`, B3 `/category/aesthetic-fonts/`
5. C `/library/discord-symbols/` canonical fix + cross-link
