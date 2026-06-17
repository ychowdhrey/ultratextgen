# Infrastructure review

This folder powers the **weekly infrastructure review** — the routine that keeps
[`../README.md`](../README.md) (the infrastructure map) honest and lets the
system's structure emerge from real PR activity. See that file's
[Weekly infrastructure review](../README.md#weekly-infrastructure-review)
section for the why.

The review runs in **two parts** ("digest feeds AI"):

1. **Digest (deterministic).** The
   [`weekly-pr-digest.yml`](../../.github/workflows/weekly-pr-digest.yml)
   GitHub Action runs every Monday, lists the past 7 days of PRs merged to
   `main`, and writes a lane-classified markdown digest here:
   - `YYYY-MM-DD.md` — the dated digest for that week.
   - `latest.md` — a copy of the most recent digest (stable path for step 2).

   The classifier lives in
   [`scripts/weekly_pr_digest.py`](../../scripts/weekly_pr_digest.py); PRs whose
   files don't match a known lane are flagged as a **signal** of an emerging
   lane.

2. **Review (judgment).** A scheduled Claude session consumes `latest.md` using
   [`weekly-review-prompt.md`](./weekly-review-prompt.md), updates the
   infrastructure map, and opens a PR. This step is wired as a scheduled
   trigger in Claude Code on the web (see the prompt file for setup).

The digest step is safe and fully automated; the map is only ever changed
through a reviewed PR.
