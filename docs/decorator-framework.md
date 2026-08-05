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
   look *designed*, not assembled → more shareable → return visits.
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

---

## Implementation — the `decorators.js` registry

The framework's registry (recommended above for scale) is now built: **`/decorators.js`**.
It is the single source of truth for every contextual decorator set.

**How a page opts in — two lines**, inserted before `/styles.js`:

```html
<script>window.UTG_DECORATOR_PROFILE = "gothic";</script>
<script src="/decorators.js"></script>
```

**What the resolver does** (see the file header for detail):
1. Reads the named profile, builds `window.UTG_DECORATIONS` (consumed by `script.js:27`).
2. Sets `window.UTG_DEFAULT_DECO_TAB` (consumed by `script.js:218`).
3. Rebuilds the standard `.decoration-tabs` buttons from the profile — targeting the
   container that holds `[data-deco-tab]` buttons, so platform pages with a *second*
   tab row (Discord/TikTok/YouTube/Facebook context tabs, which use `data-context`) are
   left untouched.

**Timing:** `decorators.js` is loaded **non-`defer`** and sits at the end of `<body>`, so
it runs during parse — after the decoration section above it exists, and *before* the
deferred `script.js` runs `init()` and wires the tab click handlers (`script.js:918`).
That ordering is load-bearing: it guarantees `script.js` binds the rebuilt buttons. Do
not add `defer` to `decorators.js` or move it above the decoration markup.

**Authoring a profile:** items are compact `[prefix, suffix]` tuples; the resolver
computes the preview from `prefix + word + suffix`. Set `word: "name"` on identity pages
(bios/usernames). Keep the framework numbers: 4–6 tabs × 8–12 items, default tab first,
best glyph first. Shared palettes (`HEARTS`, `STARS`, `SPARKLE`, …) are defined once at
the top and reused — extend those to enrich many pages at once.

**Localized mirrors inherit:** `vi/`, `tr/`, `pt/`, `pl/`, `nl/`, `es` reference the same
profile name — never fork a bespoke set per locale.

---

## Rollout status (2026-07)

**Live via the registry — 22 pages:**

| Lens | Pages |
|---|---|
| A — font | `gothic-fonts` · `bold-fonts` · `cursive-fonts` · `cute-fonts` · `aesthetic-fonts` · `bubble-fonts` · `italic-fonts` · `small-text` · `upside-down-text` · `word-wrappers` |
| B — platform | `discord` · `instagram` · `linkedin` · `tiktok` · `whatsapp` · `x` · `snapchat` · `telegram` · `facebook` · `youtube` · `pinterest` |
| C — JTBD | `nickname-generator` |

**Migrated into the registry (round 2 — was inline):** `football-font`, `classified`,
`bio-font`, `emoji-combinations`. Their exact curated sets now live as profiles in
`decorators.js`; the pages carry only `UTG_DECORATOR_PROFILE`. Page-specific logic was
preserved — `classified`/`bio-font` keep their `STYLE_MAP` font-mood switching, and
`emoji-combinations` keeps its `enforcePrefixOnlyDecorators()` transform (the
`/decorators.js` include is placed *before* it so `UTG_DECORATIONS` exists when it runs).

**Also added as profiles + wired (round 2):** `strikethrough-text`, `underline-text`
(the #371 sets — Done/Sale/Cross/Redacted/Sass and Emphasis/Rules/Pointers/Important/Minimal).
These were still on the generic default on this branch; they now resolve from the registry.

**Left inline by design:** `before-after-emoji` — its JS *generates* decorations
dynamically (not a static set), so it can't be a static profile. Documented, not migrated.

**Verified:** headless-Chromium pass across a font page, the minified template, the Discord
dual-tab-row page, LinkedIn, nickname, and word-wrappers — profile resolves, default tab is
active, tab keys align with decoration keys, grids render, and tab-switching swaps sets.

**Gaming pages with no standard panel — served via the static showcase instead (round 2):**
`roblox/`, `roblox/name-generator`, `tiktok/name-generator`, `youtube/name-generator` are
content / name-idea pages with **no font-styling engine** — a live profile has nothing to
bind to. Rather than bolt a whole generator onto them, they now carry the **static
copy-paste decoration showcase** (see below), which gives gaming personas ready-made
decorators right on the page. `usecase/clan-tag-generator` already has its own live
`tag-studio` frames tool and additionally gets the static showcase. `usecase/zalgo-text`
runs its own zalgo controller (decorations fight the effect by design) — left as-is.

**Bespoke decoration UI (needs a custom pass, not the standard profile):**
`usecase/linkedin-headline` and `usecase/comment-font` have a decoration UI **without**
`#decorationGrid`.

**Skipped by design:** long-tail `/library/*` reference pages, `what-font-does-*` answer
pages, `text-to-emoji`, and `vertical-text` (own decorator module). See the rollout-priority
section above.

---

## On SEO — the honest version

Contextual decorators are **injected by JavaScript** (both the grid items and, now, the tab
labels). Google renders JS, so this content *can* be indexed — but JS-injected text is a
**weaker, less reliable** ranking signal than static HTML, and short tab labels ("Gaming",
"Occult") carry little keyword weight on their own. **Treat the SEO benefit as secondary;
the real, reliable win is UX + differentiation** (the moat section above), which is what
drives the return visits and shares that *do* move rankings.

**Phase 2 — DONE (round 2): the static, crawlable showcase.** Each flagship/gaming page now
carries a real HTML `<section class="deco-showcase">` — the final block of `<main>` — with a
keyword-rich `<h2>`, an intro sentence, and ~10 labelled, copyable example strings in the
**HTML source** (not JS-injected). Example: *"Popular Discord Name Decorations"* → `꧁ Nova ꧂`
(Gaming bracket), `|| Nova ||` (Spoiler tag), … Files:
- `decorations-showcase.js` — tiny self-contained click/keyboard copy-to-clipboard handler
  for `.deco-chip[data-copy]` (works on content pages that don't load `script.js`).
- `.deco-showcase*` styles in `style.css` (theme-token based; verified light + dark).

**Live on 29 pages:**
- *Platform* — `discord`, `instagram`, `linkedin`, `tiktok`, `whatsapp`, `x`, `snapchat`,
  `telegram`, `facebook`, `youtube`, `pinterest`
- *Font/category* — `gothic-fonts`, `cursive-fonts`, `aesthetic-fonts`, `bold-fonts`,
  `cute-fonts`, `bubble-fonts`, `italic-fonts`, `small-text`, `upside-down-text`, `word-wrappers`
- *Use-case* — `nickname-generator`, `bio-font`, `football-font`
- *Gaming pages w/ no live panel (showcase IS the feature)* — `roblox`, `roblox/name-generator`,
  `tiktok/name-generator`, `youtube/name-generator`, `clan-tag-generator`

**Intentionally skipped:** the *effect* pages — `strikethrough-text`, `underline-text`,
`emoji-combinations`, `classified` — where the feature is a text effect, not name-wrapping, so
a "Popular decorations" block would read as off-topic filler.

Copy is hand-authored per page (persona-specific, honest — e.g. LinkedIn shows separators not
hearts; Roblox notes in-game character filtering). To extend to more pages, add a spec and
inject the same section before `</main>`; keep per-page copy, never a template dump.
