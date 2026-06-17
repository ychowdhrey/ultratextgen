# Library Opportunity Backlog Audit — 2026-06-17

Reconciliation of `data/library_opportunities.csv` against the current state of
`library/*/index.html`, following on from
[`library_opportunities_audit_2026-06-08.md`](./library_opportunities_audit_2026-06-08.md)
and the production workflow merged in **PR #284**
([`../docs/unicode-library-workflow.md`](../docs/unicode-library-workflow.md)).
Companion page-level audit:
[`../docs/library-pages-audit-2026-06-17.md`](../docs/library-pages-audit-2026-06-17.md).

This pass is **read-only on the CSV** — it records the reconciliation and the
open items below; no rows were rewritten. Recommended CSV edits are listed in
"Open items" for the owner to approve.

## Backlog vs. disk

| Bucket | Count |
|---|---|
| CSV data rows | 765 |
| Distinct slugs in CSV | 447 |
| Live pages on disk (`library/*/index.html`) | 248 |
| Live pages backed by a spec | 188 |
| Live pages **without** a spec (built inline / pre-workflow) | 60 |
| CSV slugs with **no page yet** (true remaining backlog) | 201 |
| Rows carrying a `COMPLETED …` note | 296 |
| Live pages with **no opportunity row at all** | 2 |

### action / approval distribution (current CSV)

- `action`: improve_existing 329 · needs_review 177 · create 147 · none 67 · skip 45
- `approval_status`: pending 433 · approved 287 · rejected 45
- `demand_confidence`: medium 468 · high 160 · low 137

## Open items for the owner (not actioned)

1. **`stage` column is defined in the workflow doc but absent from the CSV.**
   `unicode-library-workflow.md` §1 specifies a `stage` lifecycle
   (`scout → researched → scored → approved → built`) and calls the migration
   "additive: existing rows default to the stage implied by which fields they
   already have." The CSV still has the pre-PR-#284 20-column schema with no
   `stage`. **Recommend:** add `stage`, back-filled from existing fields
   (rows with a live page → `built`; approved+slug → `approved`; has
   `search_volume`+`demand_confidence` → `scored`; has `forum_evidence` →
   `researched`; else `scout`). This is mechanical and reversible — say the word
   and I'll generate it.

2. **Two live pages have no backlog row** — `bracket-symbols` and
   `linkedin-comment-styling`. Add rows so the backlog reconciles to disk:
   - `bracket-symbols`: add a `built` row (it's a legitimate symbol library).
   - `linkedin-comment-styling`: it's an *article*, not a library page (0 copy
     tiles, fails the library validator). Decide whether it belongs in
     `/library/` at all before adding a row — likely it should move to
     `/guide/` and stay out of the library backlog.

3. **60 live pages are off-workflow (no spec).** They aren't a backlog gap per
   se, but they can't be regenerated/bulk-upgraded by the pipeline. Recommend a
   spec back-fill project (tracked separately from the opportunity backlog).
   Full list in the page-level audit, §(a).

4. **`emoji-combos` cohort (96 live pages) needs a demand re-check.** This
   templated family is thin (~14 tiles, ~220–235 words each) and the most
   exposed to scaled-content devaluation. Before investing in template upgrades,
   pull fresh volumes (Semrush MCP or a `data/semrush-exports/` upload) and GSC
   per-URL performance to decide upgrade vs. consolidate vs. prune. Mark losers
   `action=skip` / `approval_status=rejected` with a reason in `notes` per the
   append-only rule.

5. **137 `low` demand-confidence rows remain.** Per the workflow's demand gate,
   none of these should be approved without a second signal. Worth a sweep to
   confirm none slipped to `approved`.

## Data that would move this forward

(Mirrors §(d) of the page-level audit.)

- `data/gsc_library_performance.csv` — GSC per-URL clicks/impressions/CTR/
  position for `/library/*`. Highest-value upload; drives the emoji-combos
  triage and validates the "thin content" list.
- `data/semrush-exports/emoji-combos-<date>.csv` — refreshed volumes for the
  player/country combo terms (they churn with transfers/tournaments).
- Copy-event analytics — enables the workflow's "backward signal" (heavily
  copied groups → new `scout` rows); not possible today.

## Net

The backlog's *forward* half (201 unbuilt slugs) is healthy and well-evidenced.
The gaps are in *reconciliation and governance*: the missing `stage` column, two
untracked live pages, 60 specless pages, and a 96-page thin cohort that needs a
demand re-check before further investment. None of these require new research —
they need the `stage` migration, two row additions, and one GSC/Semrush upload
to close.
