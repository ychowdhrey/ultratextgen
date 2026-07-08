# Decorator Framework — Contextual Decorators as a Moat

This is the **standard for the "Add decoration to results" panel** on every page.
It extends [`jtbd-principles.md`](./jtbd-principles.md) to decorators: a page is a
job, and its decorators must serve *that* job at the moment the user does it.

> **The decorator job:** *"I've picked my font — now give me the finishing touches
> that fit **this** platform / font / task, without making me hunt."* The default
> generic palette (Symbols/Frames/Dividers/Arrows/Minimal/Emojis/Flags) is the
> same on every page and serves no page especially well. Contextual decorators fix
> that.

---

## Why this is a competitive moat (not a cosmetic tweak)

Competitors (generic multi-font sites, emojicombos-style tag walls) ship one of two things:

1. A **font change + a static, generic symbol palette** identical on every page, or
2. A **wall of pre-defined templates** you scroll and hunt through.

Contextual decorators beat both, and the advantage **compounds**:

1. **Right tool at the moment of the job.** The panel is pre-filtered to the exact
   task, so the decorator they'll actually paste is one of the first 8 they see —
   not buried in a generic wall. Fewer clicks to done.
2. **Curation reads as expertise.** 8 great, render-safe, on-persona options signal
   the tool *gets* this platform/font. 150 random symbols signal a dump. (This is the
   *honesty/trust* differentiator from `jtbd-principles.md` §9.)
3. **Per-platform render-safety.** Competitors ship symbols that tofu (□) on the
   target platform. We show only what renders *there*. We already have the data: the
   `platforms:` field on every style in `styles.js`.
4. **Pairing intelligence.** Decorators tuned to the font on the page make the output
   look *designed*, not assembled → more shareable → return visits
   (see [`retention-loops.md`](./retention-loops.md)).
5. **It's labor + judgment, not a toggle.** A generic multi-font site can't cheaply
   replicate hand-curated, render-verified, persona-matched decorators across every
   page. That's the moat.

**Retention tie-in:** the user remembers *"the strikethrough site that had the exact
cross-out I wanted."* The job got done faster and better → they come back. That is the
return-visitor mechanism, applied to decorators.

---

## Fixed numbers (the "how many" rules)

Derived from what already ships in PR #371 and works.

| Rule | Value | Why |
|---|---|---|
| **Categories (tabs)** | **4–6** | <4 under-serves the job; >6 = choice overload + horizontal scroll on mobile. #371 used 5. |
| **Decorators per tab** | **8** (cap 12) | 8 fills two grid rows with no scroll on desktop; curated, not exhaustive. |
| **Total per page** | **~32–48** | 5×8 = 40. Curated down from the ~150 generic default. |
| **Default open tab** | **the primary job** | The first tab + its first decorator is what the user sees. It must be the single most-wanted option for this page (`window.UTG_DEFAULT_DECO_TAB`). |
| **Ordering within a tab** | **best first** | Rank by frequency/quality/pairing. Position 1 is the bet. This is what makes "find the best one right there" true. |

> **Rule:** Every contextual page ships **4–6 named tabs × 8 decorators**, default tab =
> primary job, best decorator first. Curation over coverage — always.

---

## The three deciding lenses (pick by page archetype)

Which lens decides the tabs depends on **what kind of page it is**. Each archetype has
exactly one primary lens.

### A. Category / Font pages — lens: **typographic pairing**
`/category/*` (gothic, bold, cursive, bubble, …). The decorator's weight and era must
match the font, so the whole result reads as one designed object.

| Font family | Pairing vibe | Example decorators |
|---|---|---|
| Gothic / blackletter | occult, medieval, ornate | `✝` `☩` `⚜` `༒` `⛧` `†` `‡` `☨` |
| Bold / heavy | solid, blocky, geometric | `▌▐` `◤◢` `▣` `■` `▰` `◈` |
| Cursive / script | delicate flourishes | `⋆˙⟡` `·˚♡` `❧` `✿` `⊹` `❦` |
| Bubble | soft, rounded | `◦` `○` `⊹` `♡` `⌢` |
| Italic / aesthetic | airy, celestial | `✧˖°` `˚₊‧` `⋆` `｡ﾟ` |

> Exception: some `/category/` pages are themselves a *job* (strikethrough, underline).
> Those use Lens C.

### B. Platform pages — lens: **renders + native convention (most-used there)**
`/discord/`, `/instagram/`, `/linkedin/`, `/tiktok/`, `/whatsapp/`, `/x/`, … Two hard
filters, in order:

1. **Render-safe on that platform** — non-negotiable. A tofu glyph on the target
   platform is *worse* than the generic default. Source of truth: the `platforms:`
   field in `styles.js`, plus manual copy-paste verification (`note: 'Copy & Paste to
   Check'` is already the convention for risky glyphs).
2. **Native convention** — the decorators people actually use there:

| Platform | What's native / most-used | What to avoid |
|---|---|---|
| Discord | spoiler bars, gaming brackets `꧁꧂`, status dots, code-ish | delicate florals |
| Instagram | aesthetic sparkles, celestial, hearts (bio decor) | heavy blocks |
| LinkedIn | **minimal only**: `•` `\|` `▸` `—` `·` | ❌ hearts, sparkles, skulls, emoji |
| TikTok | trendy aesthetic + gaming | corporate/minimal |
| WhatsApp | hearts, simple everyday, `•` | niche math symbols |
| X / Twitter | minimal, arrows, restrained | busy multi-glyph frames |

> LinkedIn is the sharpest example of why default is wrong: the current panel offers
> `♥ text ♥` and `✿ text ✿` as top picks to a professional writing a headline. Persona
> mismatch. Contextual fixes exactly this.

### C. Use-case / JTBD pages — lens: **the sub-jobs of the task**
`/usecase/*` and job-shaped category pages (bio-font, linkedin-headline, nickname,
football, strikethrough, underline). Tabs = the *moments/reasons* inside the job.

| Page | Sub-job tabs (the lens in action) |
|---|---|
| strikethrough (#371) | done · sale · cross-out · redacted · sass |
| underline (#371) | emphasis · rules · pointers · important · minimal |
| bio-font | gaming · aesthetic |
| linkedin-headline (proposed) | separators · credentials · minimal |
| football (proposed) | club · trophy/hype · flags |

---

## What data we need to pair them (and where it already lives)

| Data | Purpose | Where it is / how to get it |
|---|---|---|
| Page → archetype | picks the lens (A/B/C) | folder namespace (`/category/` `/usecase/` platform dirs) — already implicit |
| Page → primary job | sets default tab + tab names | JTBD build specs |
| Page → fonts surfaced | pairing (Lens A) | `window.UTG_FONT_SLUGS` / `STYLE_MAP` (already on bio-font) + `familySlug` in `styles.js` |
| Decorator → render-safety per platform | Lens B filter #1 | `platforms:` field in `styles.js`; manual paste check for new glyphs |
| Decorator → tags (weight/mood/theme) | pairing + reuse | **missing** — the one net-new dataset to build (see below) |
| Per-page decorator copy events | validate & auto-rank | GTM (add a copy event carrying decorator + page) — closes the loop |

---

## Governance — how to scale without rot

The current pattern hand-authors a full `window.UTG_DECORATIONS` object inline per page.
That is correct and proven for the first handful of pages. **It will rot past ~15 pages**
(a broken glyph must be fixed in N files; no central render-safety enforcement).

- **Now (≤ ~15 pages):** keep inline `UTG_DECORATIONS` + `UTG_DEFAULT_DECO_TAB`. Ship pages.
- **Then (site-wide rollout):** migrate to a **decorator registry** — a central tagged
  pool (`decorators.json`) + named **profiles** (`gothic`, `professional`, `gaming`,
  `aesthetic`, `strikethrough-jobs`, …) assembled from it, with each page opting in via
  one line: `window.UTG_DECORATOR_PROFILE = "gothic"`. Fix a glyph once; enforce
  render-safety in one place. Mirrors how `fonts.json` centralizes fonts.

---

## Rollout priority (do NOT do all ~250 pages)

Concentrate where persona is strong *and* diverges from the generic default. Long-tail
`/library/*` reference pages keep the default (the panel isn't their main feature).

1. **Platform pages** — highest traffic, sharpest render/persona wins (LinkedIn,
   Discord, Instagram, TikTok, WhatsApp, X).
2. **Strong-aesthetic category pages** — Gothic (still on default ❌), cursive, bold,
   bubble, aesthetic, y2k.
3. **Use-case pages** — bio, nickname, headline, football (extend the #371 pattern).

---

## Checklist (apply per page, before shipping decorators)

1. **Archetype?** Category/Font → Lens A · Platform → Lens B · Use-case/JTBD → Lens C.
2. **4–6 tabs, named for the lens** (pairing vibes / platform conventions / sub-jobs).
3. **8 decorators per tab**, best first.
4. **Default tab = the primary job** for this page.
5. **Render-verified** on the target platform (Lens B: no tofu; add `Copy & Paste to
   Check` note on risky glyphs).
6. **On-persona** — nothing off-persona in the top row (no hearts on LinkedIn).
7. **Reference the canonical owner** — decorators are a feature on the owner page, never
   a reason to mint a new page (`jtbd-principles.md` §7/§9).
