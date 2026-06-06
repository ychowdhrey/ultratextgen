# Unicode Library Page Production Workflow

This document describes the end-to-end system for proposing, vetting,
generating, validating, and shipping batches of Unicode symbol **library
pages** (`/library/<slug>/`). It is the operating manual; the companion
[`unicode-forum-research-skill.md`](./unicode-forum-research-skill.md) covers
the discovery half in depth.

> **Golden rule: do not publish directly.** Every page reaches `master`
> through a reviewed batch PR. Nothing in this system auto-merges or
> auto-deploys.

---

## Pipeline at a glance

```
forum + keyword research
        │
        ▼
data/library_opportunities.csv          ← one row per candidate page
        │
        ▼
scripts/audit_library_opportunities.py  ← dedupe / overlap / block coverage
        │   → data/library_opportunities_audit.csv
        ▼
approve rows (approval_status = approved)
        │
        ▼
data/library_page_specs/<slug>.json     ← one JSON spec per approved page
        │
        ▼
scripts/generate_library_page_from_spec.py  ← writes library/<slug>/index.html
        │
        ▼
scripts/validate_library_pages.py       ← structural / SEO lint
        │
        ▼
batch PR → human review → merge
```

---

## 1. The opportunity file

`data/library_opportunities.csv` is the backlog. Each row is one **candidate
page**, captured in user language with evidence and scoring attached. Field
definitions are documented in the forum-research skill, Section 7.

Keep the file append-only during a batch; don't delete rejected rows — set
`approval_status = rejected` and explain why in `notes` so the same idea isn't
re-proposed later.

---

## 2. Forum research process

See [`unicode-forum-research-skill.md`](./unicode-forum-research-skill.md).
In short:

1. Run the seed queries in `data/forum_research_queries.csv` (Reddit, Quora,
   StackExchange site searches).
2. For each qualifying thread, extract head noun, modifier, constraints, and
   use case in the user's own words.
3. Classify `intent` and score `forum_evidence`
   (`none` / `weak` / `medium` / `strong`).
4. Record everything as an opportunity row.

Forum evidence is the qualitative half of demand; search volume is the
quantitative half. A strong page usually has both.

---

## 3. Search volume process

Attach a `search_volume` figure and derive `demand_confidence`
(`low` / `medium` / `high`) for every opportunity:

1. Take the `primary_keyword` (+ `modifier`) and pull monthly search volume
   from your keyword tooling (e.g. the Semrush MCP `keyword_research`
   toolkit, or any keyword planner).
2. Note the figure in `search_volume`. If a tool is unavailable, estimate
   conservatively from related known terms and say so in `notes`.
3. Combine with `forum_evidence` to set `demand_confidence`:
   - `high` — solid forum evidence **and** meaningful volume.
   - `medium` — one strong signal (good evidence *or* good volume).
   - `low` — speculative; weak evidence and thin volume.

Do **not** approve a page that is `low` confidence with `weak`/`none` evidence.

---

## 4. Page specs

Approved opportunities are turned into one JSON spec per page under
`data/library_page_specs/<slug>.json`. Use
`data/library_page_specs/_TEMPLATE.example.json` as the starting point
(the leading underscore marks it as a template — never generate from it).

Required spec fields (enforced by the generator):

- `slug`, `title`, `meta_description`, `hero_h1`, `hero_tagline`, `intro`
- `copy_pattern` — `"single"` or `"collection"`
- `sections` — list of `{ id, label?, h2, intro?, symbols: [{char, label}] }`
  (need enough sections for **≥ 3 H2s**)
- `related` — list of `{ href, title, desc }` internal links
- For `collection`: also `collections` (`[{ name, flags, defaultFormat }]`),
  plus optional `collection_section` and `collection_container_id`.

Generate a page:

```bash
# dry-run validates the spec and prints the target path
python3 scripts/generate_library_page_from_spec.py data/library_page_specs/<slug>.json --dry-run

# write it (refuses to overwrite unless --force)
python3 scripts/generate_library_page_from_spec.py data/library_page_specs/<slug>.json
```

The generator reproduces the standard page shell exactly: GTM + ad snippets,
canonical/OG/Twitter meta, Article + BreadcrumbList JSON-LD, the shared
`header.js`/`footer.js` injectors, `/symbol-explorer.js`, and a `#symbolToast`
region.

---

## 5. Copy patterns

Two interaction models, chosen per page via `copy_pattern`:

### `single` — browse-and-copy

Each symbol is an individual `.symbol-tile` button carrying `data-symbol` and
`aria-label`. Clicking copies one character; `symbol-explorer.js` handles the
click delegation and toast. Use for reference pages where users hunt for and
grab individual characters (hearts, arrows, currency, special characters).

```html
<button class="flag-emoji symbol-tile" data-symbol="★" aria-label="Copy Black Star">★</button>
```

### `collection` — copy a whole set

In addition to single sections, the page emits a container populated at runtime
by `UltraTextGen.buildGrids(containerId, GROUPS)`, letting users copy an entire
set in a chosen format (inline, vertical, etc.). Use for set-oriented pages
(zodiac signs, chess sides, card suits).

```js
UltraTextGen.buildGrids("zodiacCollectionsContainer", GROUPS);
```

A page may use single sections **and** a collection block; if it calls
`buildGrids`, the validator treats it as a collection page.

---

## 6. Deduplication logic

Run the auditor before approving any batch:

```bash
python3 scripts/audit_library_opportunities.py
# → data/library_opportunities_audit.csv
```

It cross-references each opportunity against the published `/library/` pages
and `data/categories.yaml` and flags:

- `flag_dup_slug` — slug already exists as a page.
- `flag_dup_title` — title matches an existing page's `<title>`.
- `flag_intent_overlap` — keyword/title tokens overlap an existing page
  (likely the same search intent).
- `flag_blocks_covered` — declared Unicode block(s) already represented by an
  existing page or a `has_page` catalog entry.

Each row gets an `audit_verdict`:

- `reject-duplicate` — resolve before proceeding (drop, or differentiate).
- `review-overlap` — decide page vs. section (see skill doc, Section 5); if it
  should fold into an existing page, set `dedupe_status = fold-into:<slug>`.
- `clear` — safe to spec and generate.

Only flip `approval_status` to `approved` once the verdict is `clear` (or the
overlap has been consciously resolved).

---

## 7. Validation

Before opening the PR, lint every generated/changed page:

```bash
# whole library
python3 scripts/validate_library_pages.py

# or just the batch
python3 scripts/validate_library_pages.py library/<slug>/ library/<slug2>/
```

Errors (fail the run): missing title/description/canonical, not exactly one
`<h1>`, fewer than 3 `<h2>`, single-copy page under the minimum button count,
`.symbol-tile` buttons missing `data-symbol`/`aria-label`, missing
`#symbolToast` or `/symbol-explorer.js`, a collections container with no
`buildGrids` call, and duplicate titles/descriptions across pages.

Fix all errors before the PR. Warnings (e.g. missing related-links block)
should be reviewed but don't block.

---

## 8. Batch PR process

1. Branch: `claude/library-batch-<NN>-<session-id>`.
2. Add the approved specs under `data/library_page_specs/` and the generated
   pages under `library/<slug>/`.
3. Run the auditor and validator; include their summary output in the PR
   description.
4. Open a PR (never push pages straight to `master`). Title it
   `feat: library batch NN — <themes>`.
5. Request human review. The reviewer checks symbol accuracy, titles/intent,
   dedupe verdicts, and rendering.
6. `sitemap.xml` regenerates via the existing daily workflow — do **not** edit
   it by hand in the PR.
7. Merge only after approval. **Do not auto-merge.**

---

## 9. Recommended batch size

**5–10 pages per batch.** This is small enough for a reviewer to verify symbol
accuracy and intent by hand, keeps the PR diff readable, and limits SEO blast
radius if a page underperforms. Batches larger than ~10 tend to get rubber-
stamped and let dedupe/quality issues slip through; smaller than ~3 isn't worth
the batch overhead. Start at the low end (3–5) while the system is new and grow
toward 10 as confidence in the pipeline increases.

---

## 10. What this system will not do

- It will not publish or deploy pages directly — everything goes through a
  reviewed PR.
- It will not overwrite an existing page without `--force`.
- It will not edit `sitemap.xml` (auto-generated) or touch
  `scripts/generate_unicode_categories.py` (left unchanged by design).
- It will not delete existing pages.
