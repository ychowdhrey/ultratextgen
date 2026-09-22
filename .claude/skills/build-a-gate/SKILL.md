---
name: build-a-gate
description: >-
  Add, change or verify a validator in UltraTextGen — an `audit:*` dashboard, a
  `check:*` CI gate, a `fix:*`/`sync:*` repair pass, or a workflow step. Use this
  whenever the task is "add a check for X", "this gate is wrong/too noisy", "wire
  this into CI", "why didn't CI catch this", or any edit under `scripts/` or
  `.github/workflows/`. Every gate in this repo was once reasoned about, documented,
  wired — and inert; this skill is the ordered procedure that makes a new one real.
---

# Build a gate

Invariants: `.claude/rules/tooling-and-gates.md`. The full incident history and
probe-design notes: `docs/architecture/validation-system.md`. **The authoritative
list of gating checks is generated** into `docs/README.md` — never restate it.

## 1. Decide what it is before you write it

Answer these three first; they decide the shape, and getting them wrong produces a
gate people learn to ignore.

- **What is the standing backlog?** Measure it. A concern with a real backlog must
  **inform** (`audit:*`, `continue-on-error`) or measure a **delta** (a finding counts
  only if new since the merge base, pre-existing ones **reported, never silenced**). A
  concern standing at zero can **gate**, and a **state** check on changed files is
  stronger than a delta where there is no backlog.
- **Whole-tree or diff-scoped?** Diff-scoped by default. Go whole-tree when the shape
  you are catching lives in files the PR does not touch — an older page drifting from
  a convention set later, a splat breaking rules elsewhere in one file, a generator
  emitting a stale template, or generated output that must match the whole tree.
- **Can a repair invert your proxy?** If you infer a defect from "one side moved",
  a backfill reads exactly like the damage. Measure convergence, or measure the thing
  directly.

## 2. Write it as a trio over one shared library

```
scripts/lib/<concern>.js|py     # the ONE definition of what a defect is
scripts/audit-<concern>.js      # whole-site dashboard, informational
scripts/check-<concern>.js      # the gate
scripts/fix-<concern>.js        # optional, idempotent
```

**Never define "changed", "cluster" or "defect" in two places.** If build-time code
needs logic that ships in a browser module, **slice and evaluate** the shipped block
(the `scripts/lib/zalgo-engine.js` / `collection-grid-engine.js` technique) and
**throw** when a marker is missing rather than falling back to a local copy.

**An unanswerable row reads UNKNOWN and exits non-zero, never 0.** A missing input, an
unreadable store or a shallow clone says so. This applies to informational checks too.

Discover locales from `data/locale_qualification_tiers.json` or
`scripts/lib/locale-parent-registry.js`'s `LOCALES` — **never a filesystem glob.**

## 3. Add the npm aliases and wire the workflow

Add `audit:<concern>` / `check:<concern>` to `package.json`, then add the step to
`.github/workflows/validate.yml`:

- give the step an **`id`**, and if it is `continue-on-error: true`, **read
  `steps.<id>.`** somewhere — a step allowed to fail whose outcome nobody reads is a
  check that does nothing;
- add the id to the final "fail the job if any gating validator reported problems"
  expression if it is meant to gate;
- echo its outcome into the job summary, and **escape any backtick touching a
  `${{ }}` expression**;
- the job already declares `defaults.run.shell: bash` — do not remove it, or `| tee`
  swallows every failure.

Then `npm run check:workflows`.

## 4. Prove it fails — this step is the skill

**Adding a validator is not the same as gating on it.** Run against deliberately
broken inputs, **at least three differently shaped** so the check cannot be tuned to
one bug, plus a restored-tree control:

1. replay the **real regression** that motivated it, against a base that does **not**
   already carry it (a delta gate correctly exits 0 when the defect is live on main);
2. a second, structurally different defect in the same class;
3. a **negative control** — a legitimate change that must *not* fire;
4. the ledger path, if the concern has an exceptions file: the same defect excused
   must go 1 → 0.

Then confirm **CI gates on it**, not merely runs it:

```bash
python3 scripts/run-ci-gates.py --only <step_id>   # 1 on broken, 0 on clean
```

Note `run-ci-gates.py` prefixes `origin/`, so `--base HEAD` silently becomes
`origin/HEAD`.

**Read exit status directly.** `$?` after `| head`, `| tail` or `| grep` is the
*pager's* status — a false `EXIT=0` that has been recorded at least four times here.

**Confirm structure, not syntax.** `ast.parse` is happy with a script whose `main()`
is never called and which exits 0 in silence.

## 5. Probe hygiene

- **Build the probe as a real pair** — injecting a different defect on each side of a
  comparison leaves nothing to survive.
- **Probe files outside the branch's changed set**, where a touched sibling cannot
  legitimately count as the fix.
- **Sweep page *types*, not one page.**
- For a rendering question, use **two browser engines**; for a QR, **decode** it; for
  a runtime change, drive a **served worktree of the base commit** alongside the
  working tree and diff the results rather than trusting expectation.

## 6. Finish

- If the concern has an exceptions ledger, it ships **empty** and its entries are
  discussed decisions — see `.claude/rules/ledgers.md`.
- Add the rule it enforces to the right `.claude/rules/` file as a current-truth
  statement, and the evidence to `docs/architecture/validation-system.md` or the
  subsystem's own doc.
- `npm run check:gate-inventory` — the `docs/README.md` sentence is **generated**;
  regenerate it rather than editing it.
- `npm run check:ci-gates` before opening the PR.
