---
paths:
  - "scripts/**"
  - ".github/workflows/**"
  - "**/*.test.js"
  - "**/*.test.py"
  - "**/*.test.html"
---

# Validators, gates and workflows

The gate architecture and the full incident history:
`docs/architecture/validation-system.md`. The **authoritative, generated list of
gating checks** lives in `docs/README.md` between the `gate-inventory` markers.

**To add or change a validator, use the `build-a-gate` skill.**

## The one lesson this repo has learned most often

> **A check that reports nothing is indistinguishable from a check that passes.**

It has happened at least six times here, each from a different cause: a whole
workflow that could never fail, a workflow that stopped parsing, a validator whose
answer half was never read, a direction pass that `continue`d past the absence it
was meant to catch, a locale glob that skipped a five-character locale, and a gate
whose `main()` fell off the end and exited 0 in silence.

The consequences are standing rules:

- **An unanswerable row reads UNKNOWN and exits non-zero, never 0.** A missing
  input, an unreadable store or a shallow clone says so rather than reporting a
  comforting zero. This applies to informational checks too: an author who reads
  "no problems" from a check that never ran is worse off than one who reads nothing.
- **Adding a validator is not the same as gating on it.** Before trusting a new
  check, run it against a **deliberately broken input** and watch it go red — then
  confirm CI *gates* on it (`python3 scripts/run-ci-gates.py --only <id>` returns 1
  on a broken tree and 0 on a clean one), not merely runs it.
- **Confirm structure, not syntax.** `ast.parse` is happy with a script whose
  `main()` is never called.
- **Never assemble the gate list by hand.** Run `npm run check:ci-gates`
  (`scripts/run-ci-gates.py`), which parses `validate.yml` and runs exactly the
  steps the final "fail the job" expression names, with CI's own
  `--base origin/<base ref>`. A list written out in prose drifts — it has drifted
  twice, and a 26-check sweep reconstructed from prose still merged red.

## Audit vs check, and delta vs state

For most concerns there is an `audit:*` (whole-site dashboard, **informational**),
a `check:*` (**diff-scoped CI gate**), and sometimes a `fix`/`sync`/`build` — all
sharing one library under `scripts/lib/` **so audit and enforcement can never
disagree** about what a defect is. Never define "changed", "cluster" or "defect" in
two places.

Which one a new check should be is decided by the **backlog, not by severity**:

- A concern with a real standing backlog **informs**. A gate that is red regardless
  of what a PR touches is a gate people learn to ignore.
- A concern standing at zero **gates**, because there is nothing to be permanently
  red against.
- A concern with a backlog whose *regressions* matter measures the **delta**: a
  finding counts only if it is new since the merge base. Pre-existing findings are
  **reported, never silenced**.
- A concern with no backlog can be a **state** check on changed pages, which is
  stronger. If a blocking class ever acquires a backlog, move it to advisory rather
  than weakening the check to a delta.

A **repair** inverts a delta proxy: a pass that brings one side of a pair closer to
the other necessarily touches one side only, so the check must measure convergence
rather than infer drift from "one side moved".

## Workflow mechanics that have bitten

- **GitHub's default `run:` shell is `bash -e {0}` — no pipefail.** A step written
  `<validator> | tee X.log` exits with `tee`'s status, so it records success no
  matter what the validator did. Declare `defaults.run.shell: bash` on the job.
- **A backtick touching a `${{ }}` expression is command substitution.** Bash tries
  to *run* the expanded value, so the summary renders empty while the job stays
  green. Escape it.
- **A `continue-on-error: true` step must have an `id`, and `steps.<id>.` must be
  read somewhere.** A step allowed to fail whose outcome nobody reads is a check
  that does nothing.
- **An unparseable workflow is loud where nobody looks and silent where merges
  gate**: on `push` GitHub creates a failed run named after the file path; on
  `pull_request` it creates **nothing**, so the entry simply disappears from the
  PR's checks list. A vanished check reads exactly like a check that was never
  required.
- `npm run check:workflows` encodes all of the above and runs from **two** places on
  purpose — inside `validate.yml` and from its own `workflow-lint.yml`, because a
  step inside a workflow cannot catch that workflow failing to parse. **Do not
  consolidate them.**
- If a defect keeps recurring despite a green gate, check whether the job is a
  **required status check** in branch protection before assuming the script is
  wrong. That is a repository setting, not a tracked file.

## Reading a result

**Never read a probe's exit status through a pipe.** `$?` after `| head`, `| tail`
or `| grep` is the *pager's* status, not the script's. That has produced a false
`EXIT=0` at least four times in this repo's history. Run the command directly.

## Two hazards when probing

- **Build the probe as a real pair.** Injecting a different defect on each side of a
  comparison leaves nothing to survive, and the probe passes for the wrong reason.
- **Replay a real regression against a base that does not already carry it.** A
  delta-scoped gate correctly exits 0 when the defect is still live on `main`.
- **Probe pages *outside* the branch's changed set**, and sweep page **types**, not
  one page: a touched sibling legitimately counts as the sync, and a bug that needs
  two hosts on one page is invisible on the three pages you would pick first.

## Locales and history

- **Discover locales from the registry, never a filesystem glob** — see
  `.claude/rules/localization.md` §10.
- **Sessions here work a shallow clone**, so `git log -S` bottoms out at the graft
  and confidently names the wrong commit. Run `git fetch --deepen=<n>` before
  trusting any first-add or first-removal date.
