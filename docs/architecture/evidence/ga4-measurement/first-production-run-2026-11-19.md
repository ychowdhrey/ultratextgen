# GA4 measurement — first production runs (2026-11-19)

**Workflow:** `.github/workflows/ga4-weekly-snapshot.yml` (id `423793423`)
**Merged by:** PR #1243 (merge commit `292643023a`)
**Runs:** three `workflow_dispatch` runs on `main` @ `f7ee8be869`

| # | Run | Conclusion |
|---|---|---|
| 1 | [44522999226](https://github.com/ychowdhrey/ultratextgen/actions/runs/44522999226) | failure |
| 2 | [44523765118](https://github.com/ychowdhrey/ultratextgen/actions/runs/44523765118) | failure |
| 3 | [44530512553](https://github.com/ychowdhrey/ultratextgen/actions/runs/44530512553) | failure |

---

## What worked

Everything up to the write. From run 3's log:

| Step | Result |
|---|---|
| Require GA4 credentials | success — the secret and variable are configured |
| Install GA4 client | success |
| Verify the normalizer passes its tests | success — the suite runs in CI |
| **Fetch** | **success** — a real GA4 Data API call from GitHub Actions |

The fetch returned, unsampled and complete:

```
[fetch] weekly_totals: 42 rows
[fetch] daily_totals: 36 rows
[fetch] daily_landing_pages: 24341 of 24341 rows
[fetch] daily_country: 3268 rows
[fetch] daily_source_medium: 1729 rows
[fetch] daily_events: 429 rows
[fetch] pages: 2726 of 2726 rows
```

So **service-account authentication through repository secrets works**, the
paging loop works unchanged in CI, and the property is reachable read-only from
the Action. That was the open question when #1243 merged.

## What failed, and why it was my defect

```
[error] data/ga4/snapshots/2026-11-15.json already exists; refusing to overwrite history.
##[error]Process completed with exit code 1.
```

The append-only guard did exactly what it was built to do — and then reported
it with the wrong exit code.

The workflow's default window is the **last complete Mon–Sun week**. All three
runs happened on Thursday 2026-11-19, so all three computed
**2026-11-09 → 2026-11-15** — the window PR #1243 had already committed. The
guard refused to overwrite it (correct) and returned **1** (wrong): "that
window is already on disk" is the right answer to running the same window
twice, not a fault.

The practical effect was that **the first manual run after seeding could never
succeed**, and would not have succeeded until the Monday schedule rolled to a
new window on 2026-11-23. Three red runs for a system behaving correctly is
precisely the "gate people learn to ignore" failure in
`.claude/rules/tooling-and-gates.md`.

### Why the seeded data made this certain rather than unlucky

PR #1243 committed `snapshots/2026-11-15.json` as part of proving the backfill.
That is what any manual run in the same week would collide with. The collision
was not a coincidence of timing; it was guaranteed by shipping the snapshot and
defaulting to that window.

## The fix

`ga4_snapshot.py` now exits `ALREADY_RECORDED = 3` for this case, with a
`[skip]` message rather than `[error]`. The workflow treats 3 as a clean no-op
(a GitHub notice, no commit) and **still fails on every other non-zero status**.

The two statuses are deliberately kept apart. Collapsing them would mean a
genuinely dead fetch could be waved through as "probably just a re-run", which
is the same class of mistake as the exit code it replaces — just pointed the
other way.

Fetch and normalize are also split into separate commands instead of a
pipeline, because under `pipefail` a pipeline reports one status and cannot
distinguish 3 from 1.

### Verification

- 68 unit tests pass (3 new: the status is 3 and not 0 or 1; a real bad input
  still returns 1; a repeat run leaves the recorded snapshot **byte-identical**).
- The original failure was reproduced locally before the fix (`repeat run -> 1`)
  and after (`repeat run -> 3`).
- Probes, each run against a deliberately broken copy, exit status read
  directly:

  | Probe | Result |
  |---|---|
  | baseline | exit 0, 68 tests OK |
  | `ALREADY_RECORDED` collapsed back to `1` (the shipped bug) | **exit 1**, caught |
  | `ALREADY_RECORDED` collapsed to `0` (would claim false success) | **exit 1**, caught |
  | guard removed entirely (would overwrite history) | **exit 1**, 2 caught |

- `check-workflows.py`: 15 workflows, 0 errors. `check-external-refs.js`: 0
  outside references.

## What this does not change

No page, score, spec, register or historical figure. `data/ga4/` is untouched
by this branch — the point of the fix is that the already-recorded snapshot
stays exactly as it is.

## Expected behaviour from here

- **Monday 07:00 UTC schedule** — computes 2026-11-16 → 2026-11-22, a new
  window, writes a snapshot and commits.
- **A manual run this week** — exits 3, reports "Window already recorded", and
  the job is green with nothing committed.
- **A manual run for a specific past window** — pass `since` / `until`; it
  writes if that window is not already on disk.
