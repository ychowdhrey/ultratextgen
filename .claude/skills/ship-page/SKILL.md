---
name: ship-page
description: >-
  Ship a new page on UltraTextGen, end to end. Use this whenever the task
  involves creating any new page or content URL — a new symbol/library/guide/
  answers/updates/category/usecase/platform page, "add a page for X", "build a
  page targeting keyword Y", "cover topic Z" — before writing any HTML or spec.
  Most of the repo's What-NOT-to-Do list is this workflow done out of order or
  with steps skipped; this skill is the ordered checklist that keeps a new page
  from cannibalizing an existing one or shipping half-wired.
---

# Ship Page

An UltraTextGen page is shipped when it is *justified, uniquely targeted,
generated through the house pipeline, wired into its hub and mesh, carrying its
art, and green through the real CI gates* — all in one change. The `steward`
skill's rules apply throughout; for a locale page, switch to the `locale-batch`
skill (the English-Parent Rule comes first there).

Work the steps in order. Each exists because skipping it produced a recorded
failure named in `CLAUDE.md`.

## 1. Justify — does this page deserve to exist?

- **Demand evidence**, not "a keyword exists": GSC/keyword data, or a
  defensible non-Google reason (utility, share/print/embed path, reference
  value) per `CLAUDE.md` → "Discovery Model".
- **Verify any "X doesn't exist yet" claim properly** — alias sweeps and
  different lanes, never one exact grep. The repo has recorded a pass where 4
  of 5 "missing" capabilities had already shipped.

## 2. Target — one query, one page

- **Check who already owns it**: search titles/H1s/metas in the same locale —
  including the homepage — for the exact phrase and close variants. A hub
  already ranking the term means *deepen the hub*, not build a spoke
  (`vi/chu-kieu/`: ~1 click/month vs the homepage's 840).
- **Run the spoke test** (Hub-vs-Spoke, all four rules): distinct SERP intent
  AND self-contained AND standalone demand, or it's a hub *section*. If a
  spoke is built, **apply Rule 3 in the same change** — de-target the hub down
  to a one-line pointer. Rule 3 is the part most often skipped, and skipping
  it once stranded five live pages.

## 3. Pick the lane — content type decides the directory

Use `CLAUDE.md`'s decision tables ("Guide vs Answer", "Library vs Symbol",
"Content Type: Updates"). The short form:

| The page's job | Lane |
|---|---|
| Resolve one sharp question, zero-click | `answers/` — **only** there, never under a platform dir |
| Understand a topic / authority piece | `guide/` |
| Browse a category of peer items | `library/` |
| Identify one glyph or emoji | `symbol/` (no nav entry — by design) |
| Dated external event affecting a Check surface | `updates/` (must link the affected surface) |
| New style family / platform / use-case tool | `category/` / platform dir / `usecase/` |

Lane choices are inherited by future translations — never re-decided per
locale — so get it right once.

## 4. Build through the pipeline, not by hand

- **`library/`/`symbol/` pages**: write a spec in `data/library_page_specs/`
  (copy `_TEMPLATE.example.json`; set `page_type: "symbol"` for the symbol
  lane) and run `python3 scripts/generate_library_page_from_spec.py <spec>`.
  Never hand-author the HTML.
- **Other lanes**: clone the structure of the closest live sibling. Every page
  needs GTM (head + body), canonical, OG/Twitter meta, JSON-LD
  (`BreadcrumbList` + lane-appropriate type), the strict script order, and
  dark-mode support. FAQ markup: prefer the `<details class="faq-item">`
  variant on pages that don't load `/script.js`.
- **Write copy about *this* page.** `check:spec-sentence-reuse` gates pasted
  spec sentences; the fix is a sentence about this symbol/topic, never a
  synonym swap. FAQ JSON-LD must mirror the visible FAQ exactly — both
  directions gated by `check:faq-schema`.
- New styles go in `styles.js` per its own rules (positional 26/26/10 maps,
  run the renderer's own length check).

## 5. Art in the same commit

Register the page in `scripts/generate-site-art.py`'s `PAGES`, then
`python3 scripts/generate-site-art.py --only <slug>` — **exact slugs; `--only`
matches by prefix** and has pulled 555 extra pages into one run. Then wire with
`scripts/wire-site-art.py` and revert its unscoped edits outside your page. If
you regenerate the page afterwards, re-wire: a regenerate silently discards
wired art. Googlebot fetches the OG image within hours of the sitemap update;
a 404 on that first fetch is recorded before any backfill.

## 6. Wire the page in

- **Hub registration**: EN library pages → `npm run build:library-directory`;
  locale hubs → `node scripts/build-library-hub.js`. Never hand-edit an entry
  list or the pre-rendered `#libDirectory`.
- **Symbol pages**: declare `related` hubs/peers in the spec, run
  `npm run sync:symbol-peer-links` (peer relations must be reciprocal — the
  generator, not you, keeps that true), and add the one manual entry on
  `symbol/index.html`.
- **Inbound links**: a page nothing links to is reachable only from the
  sitemap. Add the contextual hub→spoke link (Rule 4). But respect the
  deliberate non-links: `answers/` stays unlinked from homepages, `symbol/`
  stays out of the nav — don't "fix" those.
- `sitemap.xml` is auto-generated — never touch it. `_redirects` matches
  paths only; query logic lives in `functions/_middleware.js`.

## 7. Validate, honestly

Commit first (diff-scoped gates read `merge-base..HEAD`), then:

```bash
npm run check:ci-gates
```

Never a hand-assembled gate list (it has drifted twice — `check:static-footer`
failed a "complete" 26-check sweep reconstructed from prose). Don't pipe the
run through `grep`. Fix what's red; never edit a `data/*` ledger, skip a gate,
or add an exception entry to get green.

## 8. Close the loop

If the page executes a decision recorded elsewhere (a doc, a register, an open
finding), write back that it shipped — after confirming the PR actually
merged. A branch push is not a ship. If the build surfaced anything reusable —
a resolved term, a confirmed absence, a skipped-on-purpose topic — record it
where the next session will look, per the `steward` skill's reporting format.
