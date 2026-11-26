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

## The fix that shipped

> **Correction (2026-11-23).** This record was first written for PR #1246, which
> proposed a different fix: a dedicated exit status `ALREADY_RECORDED = 3` that
> the workflow treated as a no-op and committed nothing. That design **did not
> ship**. Commit `8f2ad39b` ("GA4 workflow re-runs on a recorded window instead
> of failing") reached `main` first, and PR #1246 was reduced to this evidence
> record when its conflicts with `main` were resolved. The sections below
> describe what is on `main`.

`ga4_snapshot.py` takes `--if-recorded {fail,skip}`; the default stays `fail`,
and the workflow passes `skip`. When the window's dated snapshot already exists:

- the recorded snapshot, its summary and the page/locale files are left
  untouched (`--force` is still the only way to restate a window);
- the history and daily files, which are restated in full from GA4 on every
  run, still refresh;
- the run exits 0 with a `[skip] window ... is already recorded` line, and the
  commit step commits whatever refreshed.

Any other failure still exits non-zero and fails the job. The same commit also
validates the `since` / `until` / `daily_since` inputs as `YYYY-MM-DD` in their
own step, and pushes with rebase-and-retry because `main` moves mid-job.
`docs/measurement-ga4.md` documents the behaviour.

### Verification

- `scripts/test_ga4_snapshot.py` passes on `main` (50 tests), including the
  cases `8f2ad39b` added: `skip` keeps the window and refreshes history, `skip`
  still writes a new window, and `skip` does not defeat `--force`.
- The next two manual runs on `main` succeeded:

  | Run | Commit | Conclusion |
  |---|---|---|
  | [44536454938](https://github.com/ychowdhrey/ultratextgen/actions/runs/44536454938) | `318fcc08` | success |
  | [44539779829](https://github.com/ychowdhrey/ultratextgen/actions/runs/44539779829) | `dc17e08d` | success |

## What this does not change

No page, score, spec, register or historical figure. The recorded
`snapshots/2026-11-15.json` window was not rewritten by any of these runs.

## Expected behaviour from here

- **Monday 07:00 UTC schedule** — computes the next complete Mon–Sun week, a
  new window, writes a snapshot and commits.
- **A manual run inside a week already captured** — `[skip]` for the window,
  refreshed history/daily files committed, job green.
- **A manual run for a specific past window** — pass `since` / `until`; it
  writes if that window is not already on disk.
