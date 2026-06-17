# Library Pages Audit — 2026-06-17

A full audit of every page under `library/*/index.html`, run after the Unicode
Library production workflow landed in **PR #284**
([`unicode-library-workflow.md`](./unicode-library-workflow.md)). It answers the
four questions in the audit brief:

- **(a)** Are the pages inline / off-workflow?
- **(b)** Are they maximizing the opportunity (Content / SEO, UI, UX)?
- **(c)** Which need to be edited / updated?
- **(d)** What extra data would help, that could be dropped into `data/`?

Method: programmatic scan of all 248 pages (title/description length, `<h1>`/
`<h2>` counts, `.symbol-tile` counts, visible word count, inline style/script
usage, JSON-LD types, canonical/OG, explorer wiring) cross-referenced against
`data/library_page_specs/*.json` and `data/library_opportunities.csv`. The
structural linter `scripts/validate_library_pages.py` was also run across the
whole directory. Raw per-page metrics: `/tmp/lib_audit.csv` (regenerable).

---

## Snapshot

| Metric | Value |
|---|---|
| Live library pages | **248** |
| Backed by a spec (`data/library_page_specs/*.json`) | **188** |
| **No spec — built inline / pre-workflow** | **60** |
| Pages with **no** opportunity row in the CSV | 2 (`bracket-symbols`, `linkedin-comment-styling`) |
| `*-emoji-combos` pages (one templated family) | **96** (39% of the library) |
| Validator: pages with ERRORS | 2 (both LinkedIn) |
| Median visible words / `<h2>` / tiles | 350 / 5 / 29.5 |

---

## (a) Are they inline?

Two senses of "inline," both checked:

### 1. Inline CSS / JS (convention compliance) — **clean**

- **Inline `<style>` blocks: 0.** No page violates the "no inline `<style>`"
  rule from `CLAUDE.md`.
- **Inline `style="…"` attributes:** the only one present on every page is the
  GTM `noscript` iframe (`style="display:none;visibility:hidden"`) — required
  boilerplate, not a violation.
- **Inline `<script>` with a body:** present on every page, but these are the
  sanctioned ones — GTM, JSON-LD blocks, and the `buildGrids(...)` init. No
  rogue logic inline.

✅ No CSS/JS inlining cleanup is needed.

### 2. Built inline vs. produced by the workflow — **60 pages are off-workflow**

This is the more important reading. **188 of 248 pages have a matching spec**
under `data/library_page_specs/`; the spec-driven generator
(`generate_library_page_from_spec.py`) produced them and the workflow can
re-render/lint them. **60 pages have no spec** — they were hand-built before
PR #284 and are effectively "inline": they can't be regenerated, re-linted, or
bulk-upgraded through the pipeline.

The 60 off-workflow pages (the original foundational set):

```
accent-marks-diacritics, achievement-symbols, aesthetic-borders-frames,
aesthetic-symbols, animal-emojis, arrow-symbols, awareness-ribbons,
body-language-emojis, bow-ribbon-symbols, bracket-symbols,
bullet-point-symbols, card-suit-symbols, checkmark-symbols, chess-symbols,
coquette-symbols, cottagecore-symbols, cross-x-symbols, crown-royalty-symbols,
currency-symbols, dash-hyphen-symbols, discord-symbols, egyptian-hieroglyphs,
email-symbols, emoji-flags, emoji-meanings-guide, face-emojis, flower-symbols,
food-drink-emojis, geometric-symbols, goth-grunge-symbols, hand-symbols,
heart-symbols, instagram-symbols, kawaii-cute-symbols, line-divider-symbols,
linkedin-comment-styling, linkedin-symbol-library, math-symbols,
moon-celestial-symbols, music-symbols, norse-viking-runes, number-symbols,
people-profession-emojis, religious-symbols, roblox-symbols,
slash-backslash-symbols, smiley-face-guide, sparkle-symbols,
special-characters, sports-emojis, star-symbols, text-faces-kaomoji,
tiktok-symbols, traffic-road-sign-symbols, transport-symbols, weather-symbols,
witchy-occult-symbols, x-twitter-symbols, y2k-symbols, zodiac-symbols
```

**Note:** these are high-value, high-traffic head terms (hearts, stars, arrows,
currency, zodiac). Most pass the validator and are content-rich; the gap is
*governance*, not quality. Back-filling specs for them brings them under the
pipeline so future SEO/UX upgrades (e.g. FAQ JSON-LD below) can be applied in
batch instead of by hand.

---

## (b) Are they maximizing the opportunity?

Largely solid structurally (median 350 words, 5 H2s, ~30 copy tiles), but four
clear opportunities are being left on the table.

### B1. FAQ structured data is almost entirely missing — biggest SEO win

**246 of 248 pages have no `FAQPage` JSON-LD** (only `aesthetic-symbols` and
`special-characters` do). The spec generator emits Article + BreadcrumbList but
never FAQPage, even though `CLAUDE.md` calls for it "where applicable" and the
site already has `scripts/inject-faq-jsonld.js`. Library pages are textbook
FAQ-rich-result candidates ("How do I copy ___?", "Do these work on
Instagram?"). **Recommended:** add an optional `faqs: [{q,a}]` field to the spec
schema + generator so FAQPage JSON-LD is emitted, then back-fill 3–5 Q&As per
page. High ROI, low risk.

### B2. Title tags overflow the SERP — 101 pages > 60 chars

**101 of 248 `<title>`s exceed 60 characters** (55 exceed 65), so Google
truncates them. Worst offenders: `linkedin-symbol-library` (79),
`cottagecore-symbols` (78), `crown-royalty-symbols` (78),
`greeting-message-emojis` (77), `moon-celestial-symbols` (77). The "`| Brand`"
suffix is eating budget. **Recommended:** tighten the spec `title` field
(target ≤ 60) and/or shorten the brand suffix on long ones.

### B3. Meta descriptions out of range — 51 long, 4 short

**51 pages have a meta description > 160 chars** (truncated) and **4 are < 120**
(under-using the snippet). Normalize to the 120–158 band in the specs.

### B4. The `*-emoji-combos` family is thin and formulaic — 96 pages

This single templated cohort (96 pages, **39% of the library**) drives almost
all of the thin-content signal: nearly every player/country combo page is
~14 copy tiles and ~220–235 visible words with the minimum 3 H2s
(e.g. `mbappe-emoji-combos`, `croatia-emoji-combos`, `messi-emoji-combos`).
They pass the validator but sit right at the floor.

- **Content:** 109 pages are < 300 words; the overwhelming majority are
  emoji-combos. They read as spun variants of one template.
- **Risk:** at this volume and similarity, this cohort is the most exposed to
  "thin/duplicate content" and "scaled content" devaluation.
- **UI/UX:** 14 tiles is a thin copy surface for a "combos" page; users expect
  many ready-to-paste combinations, not a short list.

**Recommended:** treat emoji-combos as a *template-quality* project, not 96
individual edits — improve the generator template once (more combos per page,
a richer intro, an FAQ, cross-links to the player's country/club page) and
re-render the family. Also confirm each still clears the demand gate
(§ data gaps below); prune or consolidate the weakest.

### B5. UI/UX — generally good, two structural exceptions

The standard page (copy tiles + toast + `symbol-explorer.js`, collection grids
via `buildGrids`) is consistent and accessible (`aria-label` + `data-symbol` on
tiles enforced by the validator). Two pages break the model — see (c).

---

## (c) What needs to be edited / updated

Ranked by severity.

### Must-fix (validator ERRORS / broken functionality)

1. **`linkedin-comment-styling`** — not a symbol library at all. It's a
   1,519-word *article* (`<h1>` "LinkedIn Comment Styling Techniques"), **0 copy
   tiles**, no `symbol-explorer.js`, no `#symbolToast`, **no opportunity row,
   no spec.** It fails the library validator because it isn't a library page.
   **Action:** move it to `/guide/` (or `/usecase/`) where article pages live,
   or convert it into a real symbol library. Right now it's mis-shelved and
   off-pipeline.
2. **`linkedin-symbol-library`** — has 500+ symbol references but is **missing
   the `/symbol-explorer.js` include**, so single-click copy is dead. Title is
   also the longest on the site (79 chars). **Action:** add the explorer
   include (+ `#symbolToast` if absent), shorten the title.

### Should-fix (SEO leaving value on the table)

3. **FAQ JSON-LD** — back-fill across the library (B1). Start with the 60
   high-traffic off-workflow head-term pages.
4. **Title length** — trim the 101 over-60-char titles (B2), prioritizing the
   55 over 65.
5. **Meta descriptions** — bring the 51 long / 4 short into the 120–158 band (B3).
6. **`emoji-combos` template** — upgrade the template and re-render the 96-page
   family (B4).

### Governance (no user-visible bug, but blocks future batch upgrades)

7. **Back-fill specs for the 60 off-workflow pages** (a/§2) so they can be
   re-rendered and bulk-upgraded by the pipeline.
8. **`bracket-symbols`** — live page with **no opportunity row** in the CSV;
   add a `built` row so the backlog reconciles to disk.

---

## (d) Extra data that would help (drop into `data/`)

The audit is currently inferring demand from a backlog that predates several
batches. The following uploads would sharpen prioritization and de-risk the
thin-content cohort:

1. **Google Search Console export** (`data/gsc_library_performance.csv`) —
   per-URL clicks / impressions / CTR / avg position for `/library/*`. This is
   the single highest-value upload: it turns "109 pages look thin" into "these
   N thin pages get real impressions (improve) vs. these get zero (prune)."
   Especially needed to triage the 96 emoji-combos pages.
2. **Refreshed keyword volumes for the emoji-combos family** — the player/country
   list churns (transfers, tournaments). A current Semrush/keyword export
   (`data/semrush-exports/emoji-combos-<date>.csv`) tells us which combo pages
   still have demand and which to retire. (Semrush MCP is connected and can pull
   this if you'd rather not export by hand.)
3. **`stage` reconciliation** — the workflow doc defines a `stage` lifecycle
   (`scout → researched → scored → approved → built`) but the CSV has **no
   `stage` column** yet. Either let me add and back-fill it, or provide a
   mapping if some rows' true stage differs from what their fields imply.
4. **Copy-event analytics** (if/when available) — the workflow's "backward
   signal" (heavily-copied groups → new scout rows) is impossible without it.
   Even a coarse export of which symbols/groups get copied would feed scouting.
5. **A canonical brand-suffix decision** — confirm the exact `| …` title suffix
   so the title-length fix (B2) can be applied consistently by the generator.

---

## What was updated alongside this audit

- `data/library_opportunities_audit_2026-06-17.md` — refreshed reconciliation of
  the opportunity backlog against the 248 live pages (built coverage, untracked
  pages, the `stage`-column gap, and the data asks above).

Nothing user-facing was changed by this audit; all items above are
recommendations pending your go-ahead. The two LinkedIn fixes (c1, c2) and the
FAQ JSON-LD generator change (B1) are the highest-leverage next steps.
