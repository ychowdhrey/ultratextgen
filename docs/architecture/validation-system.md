# The validation system — how gates are built, and every way they have failed

Invariants: `.claude/rules/tooling-and-gates.md`. Procedure: the `build-a-gate`
skill. **The authoritative list of gating checks is generated** into `docs/README.md`
between the `gate-inventory` markers, from `.github/workflows/validate.yml`, by
`scripts/build-gate-inventory.py`. Never restate it in prose.

## The shape of the system

For most concerns there are three scripts and one shared library:

- **`audit:*`** — whole-site dashboard, **informational**, never gating.
- **`check:*`** — the **diff-scoped** CI gate.
- optionally **`fix:*` / `sync:*` / `build:*`** — the idempotent repair pass.
- **`scripts/lib/<concern>.js|py`** — the one definition of what a defect is, shared
  by all of the above, **so the audit and the gate can never disagree.**

Which one a new check should be is decided by the **backlog, not by severity**. The
full reasoning is in `.claude/rules/tooling-and-gates.md`; the short version is that
a gate red regardless of what a PR touches is a gate people learn to ignore, so a
concern with a standing backlog informs or measures a delta, and a concern standing
at zero gates.

## The one lesson, and its six instances

> **A check that reports nothing is indistinguishable from a check that passes.**

### 1. The whole workflow was inert (found 2026-08-06)

Every validator step in `validate.yml` was `<validator> | tee X.log`. A pipeline
exits with its **last** command's status, `tee` always succeeds, and GitHub's default
`run:` shell is `bash -e {0}` — `-e` but **no pipefail**. So every step recorded
`outcome == 'success'` no matter what the validator exited with, and the final "fail
the job if any gating validator reported problems" step, which keys off exactly those
outcomes, **could never fire**. Fixed by declaring `defaults.run.shell: bash` on the
job, which is `bash --noprofile --norc -eo pipefail {0}`.

Two consequences worth carrying forward:

- **A green "Validate Site" on any PR before 2026-08-06 carries no information.** Do
  not cite one as evidence a page passed anything.
- **Adding a validator script is not the same as gating on it.** Every gate had been
  reasoned about, documented and wired, and none of them worked.

Wired the same day: `check:funding-choices`, which existed but was never added to the
workflow — which is how 37 pages shipped without the ad-blocking-recovery tag.

### 2. The workflow stopped parsing (2026-08-07)

An `if:` written at column 0 and a `run: |` folded onto the line above left
`validate.yml` invalid YAML. It sat broken for a day, and every PR merged in that
window was unchecked, including a 22-page locale batch.

**Where an unparseable workflow does and does not show up** — verified against the
real runs, because the intuitive answer is wrong in both directions:

- On **`push`**, GitHub *does* create a failed run, named after the file path rather
  than its `name:` (the `name:` is inside the file it could not parse). Nine of these
  accumulated across 08-07.
- On **`pull_request`**, it creates **nothing**. GitHub cannot know the file wanted to
  run on `pull_request` — that trigger is also inside the unparsed file. So the entry
  simply disappears from the PR's checks list. For three commits the PR checks were
  CSS Audit, GTM Check, Ads Check, and nothing else.

**That asymmetry is the whole trap**: the failure was loud in the Actions tab, where
nobody looks, and absent from the PR checks list, which is what merges gate on. **A
vanished check reads exactly like a check that was never required.**

`npm run check:workflows` closes it, with two rules encoding both incidents
(pipefail, and a `continue-on-error` step whose outcome nobody reads) plus the shape
Actions actually needs. It runs from **two places on purpose** — a step inside
`validate.yml` cannot catch `validate.yml` failing to parse, so the lint also runs
from its own `workflow-lint.yml`. **Do not consolidate them.**

Verified against four deliberately broken inputs: the real parse break, the real
missing `defaults.run.shell`, a `continue-on-error` step with no `id`, and a step with
neither `uses` nor `run`. Its first real run also found the pipefail bug live in a
**second** workflow, `css-audit.yml`, which had been reporting success regardless of
what the audit found.

### 3. A backtick touching a `${{ }}` expression (2026-08-22)

In a double-quoted bash string a backtick is **command substitution**. A step-summary
line written as ``echo "### Check — `${{ steps.x.outcome }}`"`` makes bash try to
*run* the expanded value: the log records `success: command not found` and the summary
renders an empty value. Every neighbouring line escaped its backticks and only the
new one did not, so the job stayed green while its own summary under-reported.

The rule is scoped to a backtick touching a `${{ }}` expression, because you can never
usefully command-substitute one — so there are no legitimate hits. Verified by
re-injecting the exact line that shipped.

### 4. A validator's answer half was dead

See `docs/architecture/faq-schema.md` — the shared library computed an answer
comparison the gate never read.

### 5. A direction pass `continue`d past the absence it was meant to catch

See `docs/architecture/translation-parity.md` §8 — `x-default not pointing at EN: 0`
while 30 pages carried no `x-default` at all.

### 6. A gate's `main()` fell off the end

The first draft of the hub→spoke locale check defined its new function *inside*
`main()`, so `main()` was never called and **the whole gate exited 0 in silence**.
`ast.parse` was happy. **Confirm structure, not syntax.**

## Never assemble the gate list by hand

`npm run check:ci-gates` (`scripts/run-ci-gates.py`) parses `validate.yml`, reads the
step ids named in the final "fail the job" `if:` expression, and runs exactly those,
substituting CI's own `--base origin/<base ref>` so the diff-scoped checks resolve the
merge base CI resolves. Add a gate to the workflow and it appears there for free; make
one informational and it disappears.

**A list written out in prose drifts**, and it drifted twice: one gate was missing
from a hand-maintained list on 2026-08-13, and on 2026-08-31 a session ran a 26-check
sweep straight from the prose list, got a clean pass, and was still red in CI on
**`check:static-footer`** — a gate that list had never named. Two new pages had
shipped with an empty `<div class="footer-inner">`, i.e. no crawlable footer link
block at all. **The sweep was thorough and it was reconstructed from prose, which is
the whole failure.**

The same reasoning produced `scripts/build-gate-inventory.py`. The gate-inventory
sentence in `docs/README.md` was hand-maintained and went stale, hand-corrected on
**nine consecutive** weekly review cycles (37 → 46 → 49 against a real 54) — and by
the ninth its own text said the next recurrence should be a generator rather than
another hand-edit. It reuses `run-ci-gates.py`'s own `load_gates()`, so the inventory,
the local runner and CI can never disagree about what gates.

## If a defect keeps recurring despite a green gate

Check whether the job is a **required status check** in branch protection for the
target branch. That is a repository setting, not something in this repo's tracked
files. A related case: `check_locale_spec.py` **did** error on 20 spec files and the
batch merged anyway.

## Reading a probe's result

**Never read an exit status through a pipe.** `$?` after `| head`, `| tail` or
`| grep` is the *pager's* status. That has produced a false `EXIT=0` at least four
times here — on the FAQ probe, on both saved-store probes, and on a share-core probe.
Run the command directly.

## Probe design

- **Build the probe as a real pair.** A first attempt at a locale-translation probe
  injected a different string on each side, so there was nothing to survive and it
  passed for the wrong reason.
- **Replay a real regression against a base that does not already carry it.** A
  delta-scoped gate correctly exits 0 when the defect is still live on `main`. And
  note `run-ci-gates.py` prefixes `origin/`, so `--base HEAD` silently becomes
  `origin/HEAD`.
- **Probe pages outside the branch's changed set.** A first attempt at four parity
  probes used pages the branch had already touched, where a touched sibling
  legitimately counts as the sync, and three came back exit 0 — a false green.
- **Sweep page *types*, not one page.** The 300-page share/save order bug was
  invisible on the homepage, on a library page and on the zalgo page, and only
  appeared once the sweep included a page loading both hosts.
- **Use two browser engines for a rendering question.** Chromium and Firefox drew the
  same page from the same font file differently — stem p10 50 vs 47, and a lowercase
  counter 334 vs 436, a 23% divergence in the hole a child colours in. Chromium alone
  could not have shown the defect.
- **Decode, do not look.** A QR too small to scan looks exactly like a QR.
- **Compare against a served worktree of the base commit**, not against expectation.
  That is what surfaced the latent flag-tile attach race nobody had reported.

## Why the counter has tests when most surfaces do not

It is the one surface whose entire value proposition is numerical correctness, and it
**shipped a wrong number**: one platform was billing code points while the page's own
reference table said graphemes, so 👨‍👩‍👧‍👦 cost 7 instead of 1. A visual check
cannot catch that.

Any page that *asserts facts* — limits, counts, encodings, decodes — deserves the same
treatment; a page that merely renders copy does not. See
`docs/architecture/check-surfaces.md`.
