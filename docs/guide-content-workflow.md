# Guide Content Workflow — The Thought-Leadership Loop

A repeatable research → opportunity → content loop for the `/guide/` section.

This is the guide-lane sibling of `docs/unicode-library-workflow.md`. The library
workflow ships **reference** pages (browse-and-copy). This workflow ships
**thought-leadership** pages: explainers, frameworks, and points of view that make
UltraTextGen the authority on expressive typography — not just a generator.

> **The one rule that separates a guide from a library page:** a library page
> answers *"where do I get X?"* (find-and-copy / decorate intent). A guide answers
> *"how / why does X work?"* (how-to / meaning / strategy intent). If the honest
> answer to the user's question is a **paragraph and a framework**, it's a guide.
> If it's a **grid of glyphs**, it's a library page.

---

## 0. Where guides live in the system

| Asset | Role |
|---|---|
| `data/library_opportunities.csv` | **Unified backlog.** Guide opportunities are rows with `page_type=guide`. Same 21 columns as library rows. Guides dedupe per-lane against `/guide/*` only. |
| `docs/guide-opportunity-map-<date>.md` | Human-readable ranked map: scoring, clusters, briefs. Regenerated each research cycle. |
| `data/forum_research_queries.csv` | Seed queries. Extend with guide-intent (`how-to`, `meaning`, `strategy`) seeds. |
| `guide/index.html` | The hub. Four cluster sections today; new guides slot into an existing cluster or open a new one. |
| `guide/<slug>/index.html` | The page. **Hand-built** — there is no guide generator (unlike the library lane). |

Guides are **not auto-generated**. There is no spec→generate step. A guide is written
by hand against the template in §6, then validated and shipped via PR.

---

## 1. The loop (10 steps)

```
1 AUDIT      → inventory live /guide/ pages; record claimed territory
2 REVIEW     → read opportunity CSV + docs; list covered research
3 RESEARCH   → forum-led discovery (real questions, not keywords)
4 MAP        → write one opportunity row per idea (full field set)
5 SCORE      → 8-axis score → priority
6 CLUSTER    → group into strategic clusters
7 SELECT     → pick the top 10–20; write content briefs
8 UPDATE     → append approved rows to CSV; recommend index grouping
9 BUILD      → hand-build top 3 pages (quality bar, §7)
10 OUTPUT    → gaps summary, ranked table, clusters, briefs, risks, next steps
```

Run steps 1–8 every cycle. Steps 9–10 ship a batch. A cycle does **not** have to
build pages — a research-only cycle that fills the backlog is valid output.

---

## 2. Step 1 — Audit existing guides

Inventory every `guide/<slug>/index.html` and `guide/index.html`. For each, record:

- slug + route, `<title>`, meta description
- H1 + section headings (depth signal)
- JSON-LD types present (Article + BreadcrumbList + FAQPage is the norm)
- internal links (which tools / category / library / guide pages)
- CTA target + pattern
- **the thesis / point of view** and whether it carries an *original framework*

The output is a "claimed-territory" list. A new idea that restates a claimed thesis
is a **dedupe reject**, not a new guide. (See §9 dedupe.)

> Claimed today (2026-06): LinkedIn comments (archetypes + craft), LinkedIn hooks,
> comments-that-stand-out, branding-with-fonts, personal-branding-typography,
> rhetoric-of-fonts, stop-the-scroll (font variation), vertical-text. Plus hub
> cards pointing at two library pages (emoji-meanings, linkedin-comment-styling).

---

## 3. Step 2 — Review opportunity + research assets

Before researching, read what already exists so you neither duplicate nor contradict it:

- `data/library_opportunities.csv` — scan for `intent=how-to|meaning` rows that may
  already cover a guide topic (improve the owner page instead of building new).
- `docs/jtbd-principles.md`, `docs/page-vs-section-decisions.md` — page-type gates.
- `docs/direction-audit-<date>.md` — **where demand actually is** (the highest-ROI
  filter). As of 2026-06-27: Discord is under-converted (large impression pool of
  informational "nitro / allowed-characters / what font" queries), Indonesian
  aesthetic is the #1 engine, mobile is the business, emoji-combo pages are thin.
- `docs/retention-loops.md`, `docs/distribution-loops.md` — every guide should feed
  a loop (rank → some text spreads → SEO re-intercepts; or earn embeds/back-links).

---

## 4. Step 3 — Forum-led research

Use the methodology in `docs/unicode-forum-research-skill.md`, tuned for guide intent.

**Sources, in priority order:** Reddit → Quora → Stack Exchange / Stack Overflow →
Discord community help → gaming/clan forums (Roblox, Fortnite, Valorant, COD) →
creator forums → SEO / social-media-marketing forums → indie-hacker threads → public
comment sections where people ask "how do I make my text stand out?"

**Query shapes** (append `reddit` / `quora` / `stackexchange` / `forum`):

| Intent | Seed shape | Example |
|---|---|---|
| how-to | "how do I …" | how do i make bold text on discord |
| failure | "why doesn't … / showing as boxes" | instagram bio font not showing |
| meaning | "what does … mean" | what does 💀 mean on tiktok |
| compatibility | "does … work on …" | does bold text hurt linkedin reach |
| strategy | "how do creators …" | how do creators format their bio |

**Capture intent, not keywords.** For each thread, record:
the real question (paraphrased), the *frustration* behind it, platform jargon used,
whether it recurs (multiple threads, same phrasing = strong), the source URL, and —
critically — **whether generic competitors answer it well or badly** (the gap = the
opportunity).

A guide row must reach `forum_evidence ≥ medium` **or** `demand_confidence = high`
before it is eligible for approval. Speculation-only guides do not ship.

---

## 5. Step 4–5 — Opportunity rows + scoring

### Row fields (CSV columns, guide-tuned)

| Column | Guide value |
|---|---|
| `id` | next `OPP-NNNN` |
| `page_type` | `guide` |
| `primary_keyword` | the head query users actually type |
| `modifier` | qualifier (platform, audience, angle) |
| `intent` | `how-to` \| `meaning` \| `strategy` |
| `forum_queries` | seed queries used |
| `forum_evidence` | none \| weak \| medium \| strong |
| `forum_source_urls` | thread URLs / source platforms |
| `search_volume` | est. monthly volume (or `est`) |
| `demand_confidence` | low \| medium \| high |
| `symbol_category`, `unicode_blocks`, `copy_patterns` | **blank** (guides have no glyph set) |
| `slug` | `/guide/<slug>/` |
| `title` | mirrors the searcher's verb (JTBD rule) |
| `priority_score` | from the 8-axis model below (0–40, see scaling) |
| `dedupe_status` | unique \| review-overlap \| fold-into \| skip |
| `approval_status` | pending \| approved \| rejected |
| `batch` | e.g. `batch-guide-01` |
| `action` | create \| improve_existing \| needs_review \| skip |
| `notes` | thesis, framework name, internal links, risks |

### 8-axis score (1–5 each)

1. **search_footprint** — query volume + breadth of the cluster
2. **forum_demand** — strength/recurrence of real questions
3. **thought_leadership** — can we say something original (a framework, a POV)?
4. **commercial_relevance** — does it lead naturally to a tool/library page?
5. **internal_linking** — how many existing pages it can link to/from
6. **uniqueness** — not already covered by a live guide
7. **ease_of_execution** — can we write it well without new research debt?
8. **thin_content_risk** *(inverse — score the *safety*: 5 = rich, 1 = likely thin)*

**Priority = sum of the 8 axes (max 40).** Tiers: ≥32 P1 · 28–31 P2 · 24–27 P3 · <24 hold.

A P1 means: real user pain exists **and** we can answer better than generic
competitors **and** it links naturally to tools/library **and** it builds brand
authority **and** it is not already covered.

---

## 6. Step 6 — Clusters

Group every opportunity into one strategic cluster (mirrors hub sections; open a new
hub section when a cluster reaches ~3 shippable guides):

`Platform mastery` · `Identity & branding` · `Comment & reply strategy` ·
`Emoji & meaning` · `Gaming & usernames` · `Aesthetic writing systems` ·
`Attention & formatting psychology` · `Accessibility & compatibility` ·
`Unicode education` · `Creator workflows` · `Social media growth` ·
`Copy-paste behavior`

---

## 7. Step 7 + 9 — Briefs and the quality bar

Every selected guide gets a content brief (title, slug, target reader, search intent,
forum insight, point of view, outline, **original framework**, examples, internal
links, CTA, schema, meta title, meta description, why-it-deserves-to-exist).

**Quality bar — every guide must clear all of these:**

- [ ] A **point of view** (a thesis, not a summary of the topic)
- [ ] An **original framework / model** with a memorable name
- [ ] Concrete **before → after** examples (plain vs styled)
- [ ] A **reason UltraTextGen owns this** (tool/library tie-in + authority)
- [ ] Research or platform-mechanic backing where relevant (cited)
- [ ] 4–5 FAQ entries (→ FAQPage schema)
- [ ] Honest **limits / when-not-to** section (the anti-generic move)
- [ ] 6–12 min read; mobile-first layout

**Reject** generic keyword pages ("best fonts for Instagram") unless a stronger angle
is attached (e.g. "why your Instagram bio font disappears — and what survives paste").

---

## 8. Step 8 — Build conventions (page template)

Hand-build `guide/<slug>/index.html` mirroring an existing guide
(`guide/vertical-text-guide/index.html` is the cleanest reference). Required parts, in order:

1. GTM head + body noscript; Grow + AdSense scripts (copy verbatim from any guide)
2. Canonical, OG (`og:type=article`), Twitter meta; OG image at `/guide/assets/og/<slug>.png`
3. Three JSON-LD blocks: **Article**, **BreadcrumbList** (Home › Guides › Title), **FAQPage**
4. Breadcrumb nav, hero (H1 + tagline + 3 `guide-pill`s), hero figure (`/guide/assets/<slug>.svg`)
5. `key-takeaways` (4 bullets) → labeled `editorial-section`s with `section-divider`s
6. A **cheat-sheet table**, a named **framework** (step cards), a **pull quote**
7. `cta-card` → the most relevant tool/usecase page
8. Footer, FAQ accordion + toggle script, `related-guides` grid (3 cards), `/footer.js`

Then add a hub card to the matching `guide/index.html` section, and append the
shipped rows' `action`/`approval_status` updates. Do **not** edit `sitemap.xml`
(auto-generated). Ship via PR — one batch, human-reviewed, never auto-merged.

---

## 9. Dedupe + demand gates (enforced before approval)

- **Per-lane dedupe.** A guide row only conflicts with live `/guide/*` pages. If the
  thesis restates a claimed guide → `dedupe_status=skip`. If it deepens one → `fold-into`.
- **Owner check.** If a how-to query is already answered by a library page section,
  set `action=improve_existing` on that page; do not open a guide.
- **Demand gate.** `forum_evidence ≥ medium` OR `demand_confidence=high`, else
  `action=needs_review`.
- **Thin gate.** If you cannot list ≥3 real H2 sections + a framework + 4 FAQs, hold it.

---

## 10. Step 10 — Output of every cycle

1. Existing-guide gaps summary
2. Ranked, scored opportunity table
3. Cluster map
4. First 10 briefs
5. File changes made
6. Risks / duplicates found
7. Next steps to build

---

*Companion docs: `docs/unicode-library-workflow.md` (reference lane),
`docs/unicode-forum-research-skill.md` (discovery method),
`docs/jtbd-principles.md` (why a page exists),
`docs/page-vs-section-decisions.md` (page vs section gate),
`docs/direction-audit-2026-06-27.md` (where demand actually is).*
