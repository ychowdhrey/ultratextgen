# Unicode Library Page Production Workflow

This document describes the end-to-end system for proposing, vetting,
generating, validating, and shipping batches of Unicode symbol **library
pages** (`/library/<slug>/`). It is the operating manual; the companion
[`unicode-forum-research-skill.md`](./unicode-forum-research-skill.md) covers
the discovery half in depth. The product *why* behind these mechanics lives in
[`jtbd-principles.md`](./jtbd-principles.md), the page-vs-section call is
codified in [`page-vs-section-decisions.md`](./page-vs-section-decisions.md),
and dated approved-scope plans live in build specs like
[`jtbd-build-spec.md`](./jtbd-build-spec.md).

> **Golden rule: do not publish directly.** Every page reaches `master`
> through a reviewed batch PR. Nothing in this system auto-merges or
> auto-deploys.

---

## Pipeline at a glance

**Order matters: forum research comes first — before search volume and before
any page spec is written.** Forum threads tell us a topic is real and in what
words; only then is it worth pulling volume, and only after both do we score,
dedupe, and spec a page. Stage 0 (scouting) is the inbox that feeds it: a place
to capture a raw idea the moment it appears, before it has earned any evidence.

```
0. scouting        (raw idea → opportunity row, stage = scout)
        │            "this format/topic exists" — captured the moment we learn it
        ▼
1. forum research  (data/forum_research_queries.csv → forum_evidence)
        │            qualitative demand + user language, captured FIRST
        ▼
2. search volume   (keyword tooling → search_volume, demand_confidence)
        │            quantitative demand, captured SECOND
        ▼
3. priority + dedupe
data/library_opportunities.csv          ← one row per candidate page
        │
        ▼
scripts/audit_library_opportunities.py  ← dedupe / overlap / block coverage
        │   → data/library_opportunities_audit.csv   + research-gap flags
        ▼
approve rows (approval_status = approved)
        │
        ▼
4. page specs  (only for approved rows)
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

A row must have `forum_evidence` and `search_volume` filled in **before** it
is eligible for a page spec. The auditor enforces this by flagging
`missing_forum_evidence` and `missing_search_volume`. A `scout` row therefore
*cannot* skip ahead to a page — it is gated until it earns its way through
research and volume.

---

## 1. The opportunity file

`data/library_opportunities.csv` is the **living backlog and system of record**
for what UltraTextGen might build — it grows continuously as scope increases.
Each row is one **candidate page**, captured in user language with evidence and
scoring attached. Field definitions are documented in the forum-research skill,
Section 7. (Build specs such as
[`jtbd-build-spec.md`](./jtbd-build-spec.md) are *dated snapshots* of the
approved rows; the CSV is the canonical source, not the spec.)

Keep the file append-only during a batch; don't delete rejected rows — set
`approval_status = rejected` and explain why in `notes` so the same idea isn't
re-proposed later.

### Lifecycle (`stage`)

Each row carries a `stage` that tracks where it sits in the pipeline,
**orthogonal** to `approval_status` and `priority_score`:

| `stage` | Meaning | Required fields |
|---|---|---|
| `scout` | raw idea captured; not yet researched | `primary_keyword`, `notes` (source) |
| `researched` | forum evidence attached | + `forum_evidence`, `forum_source_urls` |
| `scored` | volume + priority computed | + `search_volume`, `demand_confidence`, `priority_score` |
| `approved` | cleared the auditor; in a build batch | + `slug`, `batch`, `approval_status = approved` |
| `built` | page shipped under `/library/` | — |

This is additive: existing rows default to the stage implied by which fields
they already have. The auditor's research-gap flags
(`missing_forum_evidence` / `missing_search_volume`) already prevent a row from
being specced before it reaches `scored`, so `stage` is a human-readable mirror
of that gate, not a second enforcement path.

### Stage 0 — scouting

Scouting is the **inbox for the flow**: the moment we learn a format or topic
exists (a competitor page, a removed section, a forum thread, our own
realization — e.g. *kaomoji / text faces*), drop a `stage = scout` row in
immediately with just the `primary_keyword` and a `notes` line recording **where
it came from**. No evidence is required yet; the point is to never lose the
lead. It then flows through research → volume → scoring like any other row, and
the demand gate decides whether it ever becomes a page (see
[`page-vs-section-decisions.md`](./page-vs-section-decisions.md) for the
page-vs-section call once demand is known).

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

## 3a. Priority scoring

Each opportunity gets a `priority_score` so a batch can be ranked. It is the
sum of five component scores:

```
priority_score = search_volume_score
               + forum_evidence_score
               + copy_usefulness_score
               + dedupe_score
               + symbol_depth_score
```

| Component               | What it rewards                                              | Suggested range |
|-------------------------|-------------------------------------------------------------|-----------------|
| `search_volume_score`   | Monthly search demand, bucketed (higher volume → higher).   | 0–25            |
| `forum_evidence_score`  | Forum proof: `none=0`, `weak=10`, `medium=15`, `strong=25`. | 0–25            |
| `copy_usefulness_score` | How copy-friendly the symbols are (single-click value, real-world paste use). | 0–25 |
| `dedupe_score`          | Uniqueness: `unique` high; `improve-existing`/`fold` low; `duplicate` 0. | 0–20 |
| `symbol_depth_score`    | How many distinct, page-worthy symbols the topic supports.  | 0–15            |

`forum_evidence_score` is computed by the auditor from the `forum_evidence`
label using the scale above (single source of truth:
`FORUM_EVIDENCE_SCORE` in `scripts/audit_library_opportunities.py`). The other
four components are graded by the researcher; record the breakdown in `notes`
so the total is auditable. Rank the batch by `priority_score` descending and
spec the top rows first.

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

### The symbol explorer is the `collection` runtime — `copy_patterns` is the join key

`copy_patterns` in the opportunity backlog is what ties a row to the symbol
explorer:

| `copy_patterns` | Renders as | Serves the job |
|---|---|---|
| `single` | individual `.symbol-tile` buttons | "I want *this one* character" |
| `collection` | `UltraTextGen.buildGrids(...)` (symbol-explorer.js) | "I want a *whole matching set*" |

"Copy a whole group" is a **distinct JTBD** from grabbing one glyph, so the
backlog tracks it as its own copy pattern and the explorer is its runtime.
Two links to keep intact:

- **Forward (provenance):** an opportunity row with `copy_patterns = collection`
  → its page spec's `collections`/`groups` → `buildGrids` renders it. Record the
  originating opportunity `id`/`slug` in the spec's `notes` so every explorer
  page traces back to the backlog row that justified it.
- **Backward (signal → scouting):** which **groups** users actually copy is a
  demand signal. When that data is available, a heavily-copied group is a lead —
  open a `stage = scout` row for it (§1). This closes the loop: the explorer
  both *consumes* approved opportunities and *produces* new ones.

> Provenance and the backward signal are documented habits today, not enforced
> by a script. Treat the `id`/`slug` note as required when speccing a
> collection page; wire the copy-signal harvest only once copy-event analytics
> exist.

---

## 6. Deduplication logic

Run the auditor before approving any batch:

```bash
python3 scripts/audit_library_opportunities.py
# → data/library_opportunities_audit.csv
```

It cross-references each opportunity against the published `/library/` pages
and `data/categories.yaml`. **Dedupe / coverage flags:**

- `flag_dup_slug` — slug already exists as a page.
- `flag_dup_title` — title matches an existing page's `<title>`.
- `flag_intent_overlap` — keyword/title tokens overlap an existing page
  (likely the same search intent).
- `flag_strong_duplicate_risk` — exact slug/title match **or** a high
  intent-overlap score; treat as a near-certain duplicate.
- `flag_blocks_covered` — declared Unicode block(s) already represented by an
  existing page or a `has_page` catalog entry.

**Research-gap flags** (forum-research fields are required before approval):

- `flag_missing_forum_evidence` — `forum_evidence` is blank or `none`.
- `flag_missing_search_volume` — `search_volume` is blank or non-numeric.
- `flag_low_demand_confidence` — `demand_confidence` is `low`.

The auditor also emits the numeric `forum_evidence_score` (`none=0`, `weak=10`,
`medium=15`, `strong=25`) used by `priority_score`.

Each row gets an `audit_verdict`:

- `reject-duplicate` — slug/title already exists; resolve before proceeding
  (drop, or switch to **improve existing**).
- `review-overlap` — intent/block overlap; decide create vs. improve vs. skip
  (see skill doc, Sections 5 / 5a). If it should fold into an existing page,
  set `dedupe_status = fold-into:<slug>` or `improve-existing:<slug>`. For the
  "own page vs. fold in as a section" call (e.g. a format/subdivision like
  *text faces* alongside *emoji*), apply the gate in
  [`page-vs-section-decisions.md`](./page-vs-section-decisions.md).
- `needs-research` — missing forum evidence, missing search volume, or low
  demand confidence; go back and finish the research before approving.
- `clear` — safe to spec and generate.

Only flip `approval_status` to `approved` once the verdict is `clear` (or an
overlap/research gap has been consciously resolved).

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
