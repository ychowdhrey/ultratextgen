# Weekly infrastructure review — prompt

This is the prompt for the **scheduled Claude session** that performs part 2 of
the weekly infrastructure review (see [`README.md`](./README.md)). Wire it as a
weekly scheduled trigger in Claude Code on the web (a little after the
`weekly-pr-digest.yml` Action's Monday 06:00 UTC run, e.g. Monday 07:00 UTC), so
the digest it depends on already exists.

Copy everything in the block below as the trigger's prompt.

---

```
You are running the weekly infrastructure review for the UltraTextGen repo.
Work on a branch named claude/infra-review-<date>; never push to main; open a PR
at the end.

1. Read docs/infra-review/latest.md (the digest of PRs merged to main in the
   last 7 days, classified by lane). If it is missing or empty, stop and report
   that there was nothing to review.

2. For each PR in the digest:
   - If it touched an existing lane, confirm docs/README.md still describes that
     lane accurately (namespace, schema, workflow, source of record, maturity).
     Update the row if the PR changed any of those.
   - If it is flagged "Unclassified — possible new lane", investigate the PR's
     files. Decide one of:
       (a) it belongs to an existing lane the classifier should learn — add the
           path rule to LANE_RULES in scripts/weekly_pr_digest.py; or
       (b) it is a genuinely new lane — add a row to the page-type or
           operational-tracks table in docs/README.md and note it under
           "Known gaps" if it lacks a workflow.

3. Check docs/README.md "Known gaps": tick off / update any gap a PR this week
   closed; add any new gap the week revealed.

4. Note any manual work that has recurred for 3+ consecutive weekly digests —
   flag it under "Known gaps" as a candidate to systematize.

5. Keep the diff small and additive. Open a PR titled
   "docs: weekly infrastructure review <date>" summarizing what changed and why.
   If nothing needs changing, do not open a PR — reply that the map is current.
```

---

**Why a Claude session and not more YAML:** classifying a genuinely novel PR,
deciding whether it's a new lane, and rewriting the map are judgment calls. The
Action does the deterministic gathering; the session does the thinking. Keeping
them separate means the digest is always produced even if the review is skipped
a week.
