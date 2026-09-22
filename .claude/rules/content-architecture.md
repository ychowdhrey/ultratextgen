---
paths:
  - "**/*.html"
  - "data/{library_page_specs,event_page_specs}/**"
---

# Content architecture — which page owns which query

Deeper reference: `docs/architecture/content-lanes.md` (lane mechanics, hub↔spoke
linking, the case studies). Recorded owner decisions: `docs/decisions/content-lanes.md`.
Lane→generator→validator ownership: `docs/README.md`.

## One query, one page

Every query cluster has exactly **one** page designated to rank for it. Name that
exact query before building anything.

- **Check who already owns it first.** Search titles, H1s and metas in the *same
  locale* — including that locale's hub/homepage — for the exact phrase and close
  variants. If a hub already targets and ranks the term, **deepen the hub**; a new
  spoke competes with it and search consolidates onto the higher-authority page.
- High search volume alone is never sufficient justification for a new page.

## Hub vs spoke — all four rules apply, in both directions

A **hub** owns a broad head term with browse-or-tool intent. A **spoke** owns ONE
narrower query with a *different* SERP intent.

1. **One query, one target** (above).
2. **The spoke test** — split out only if **all three** hold: (a) the query's SERP
   is a *different type* than the hub's, (b) it is fully answerable on its own page
   without the hub's tool/collection as the payload, (c) it has real independent
   volume. Any failure → it is a **section on the hub**, not a spoke.
3. **De-confliction.** The moment a spoke exists, the hub must **de-target** that
   query — strip the competing prose to a one-line pointer link. Symmetric: a spoke
   must not chase the hub's head term. *A spoke that exists while the hub still
   targets its query is a cannibal, not coverage.* This is the rule most often
   skipped and the one that strands pages.
4. **Link direction.** Hub → spoke (contextual link in the relevant hub section)
   and spoke → hub (breadcrumb + one back-link). No orphan spokes, no un-pointed
   hub sections.

These apply **within each locale independently**. When a collision surfaces on
pages too new to have GSC signal, resolve structurally by mirroring what the live
EN parent hub already does — do not invent a locale-specific judgement call.

A de-confliction retarget can fail later by the hub simply *winning the new term
too*: "the spoke owns term B today" is a fact with a shelf life, not a structural
property.

## Lane selection

| Signal | Lane |
|---|---|
| Resolve one sharp question in seconds, zero-click | `answers/` |
| Understand a topic / build authority, explore-and-learn | `guide/` |
| **Browse** a category — many peer items | `library/` |
| **Identify** ONE canonical glyph *or* emoji in full | `symbol/` |
| A dated external change to a fact a Check surface relies on | `updates/` |

- **Answer-shaped content lives under `answers/` only.** Never rebuild the same
  answer under a platform directory (`/discord/`, `/tiktok/`, …) or any other
  section, even when the query is platform-specific. A platform hub may *discuss*
  the topic as a one-line pointer (Rule 3). Any exception is explicit and discussed
  before the page ships.
- **`library/` vs `symbol/` is collection vs single item — not "symbols vs emoji".**
  Every new single-emoji or single-glyph page goes to `symbol/`. `library/` is
  reserved for collections. The ~60 pre-existing single-emoji pages under `library/`
  are grandfathered and are not migrated in bulk.
- **A translation inherits its lane from the English source's `page_type`.** It is
  never re-decided per language: a translation of `symbol/<slug>/` ships to
  `<lang>/symbol/<slug>/` even if that language has no `symbol/` pillar yet.
- `updates/` covers exactly three event types: new Unicode versions/emoji, platform
  formatting/character-support changes, per-game nickname rule changes. **Not**
  this site's own feature launches. Every entry links the Check surface it affects.

## A page is not shipped until its hub knows about it

A `library/`/`symbol/` page must be registered in **its own locale's** hub. A page
no hub links is reachable only from the sitemap. A deliberate omission needs an
entry in `data/library_hub_exclusions.json` (see `.claude/rules/ledgers.md`); the
default fix is to register it.

`npm run audit:library-hub-coverage` is the whole-site picture; `npm run check:symbol-peer-links`
(the sync script with no flags) is the read-only whole-site peer audit.

**There are five inventory mechanisms and you must not narrow the set** —
`libraryArray`, `libEntry`, `azIndex`, `compareCard`, `tipCard` — and which one a hub
uses is a property of the hub, not of the locale. A checker that knew only
`compare-card` reported `da`, `no` and `sv` broken and `es` fine; all three were
complete. Re-check those three locales before changing the set
(`docs/architecture/content-lanes.md` §4).

**Two deliberate non-links that an audit will flag every time — do not "fix" them.**
`answers/` is intentionally not linked from any homepage, EN or locale: the pillar is
built to be landed on from a search or answer engine, resolve one question and stop,
and it keeps its `header.js` nav entry but gets no homepage body links. `symbol/`
intentionally has **no nav entry** at all; its discovery is search- and pin-driven.
Both were recorded after `answers/` was once wrongly "corrected" on exactly that
basis. Reasoning: `docs/decisions/content-lanes.md`.

`symbol/` hub↔spoke and peer↔peer links are **generated**, never hand-written:
`npm run sync:symbol-peer-links`. A declared peer relation must be reciprocal, and
the generator mirrors the peer and hub graphs into every locale where both ends have
a live sibling.

## Two pages must not offer the same tool

`js/printables/printablesEngine.js` mounts a surface from an element id, so giving
page B the tool page A owns is a one-line change and no structural gate can see it.
The signature is `(locale, noun, render, font)`. The fix is always Hub-vs-Spoke
Rule 3 — whichever page owns the query keeps the tool, the other keeps a one-line
pointer — **never deleting the older page**.

## A routing note is not an owner until the named owner ranks

*"Intent X belongs on page Y, not page Z"* binds only once **Y demonstrably ranks
for X**. Before citing a prior routing/skip/dedupe decision as settled, pull the
named owner's own query × page numbers; if it does not rank for the intent, the
note is void and the question is open again. A skip note inside a bulk triage file
is not a decision at all — a decision is dated, has an owner, and lives in the
operating queue or the review register.
