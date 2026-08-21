#!/usr/bin/env python3
"""check-workflows.py — lint every GitHub Actions workflow in this repo.

WHY THIS EXISTS
---------------
This repo has now shipped the same class of bug twice, and both times the
symptom was a workflow that *looked* fine and enforced nothing:

  * 2026-08-06 — every validator step was `<validator> | tee X.log`. A pipeline
    exits with its LAST command's status, `tee` always succeeds, and GitHub's
    default `run:` shell is `bash -e {0}` (no pipefail). So `steps.<id>.outcome`
    was 'success' unconditionally and the "Fail the job" step could never fire.
    Every gate in CLAUDE.md had been reasoned about, documented and wired, and
    none of them worked. Fixed with `defaults.run.shell: bash`.
  * 2026-08-07 — `validate.yml` stopped PARSING (an `if:` at column 0, and a
    `run: |` concatenated onto the line above). It sat broken for a day and
    every PR merged in that window was unchecked, including a 22-page locale
    batch. The reason nobody noticed is an asymmetry worth knowing (verified
    against the real runs, 2026-08-08): on `push` GitHub *does* record a
    failed run, named after the file path rather than its `name:` — the
    `name:` is inside the file it could not parse. On `pull_request` it
    records NOTHING, because the `pull_request` trigger is also inside that
    file. So the check vanishes from the PR's checks list — the list merges
    gate on — while red marks pile up in the Actions tab where nobody looks.
    A vanished check reads exactly like a check that was never required.

The second one is the reason this script is not just another step inside
`validate.yml`: **a step inside a workflow cannot catch that workflow failing
to parse.** It runs from its own tiny workflow (`.github/workflows/
workflow-lint.yml`) as well as from `validate.yml`, so the two cover each
other — whichever one still parses reports on the one that doesn't.

WHAT IT CHECKS
--------------
  1. every `.github/workflows/*.yml` parses as YAML at all
  2. it has the shape Actions requires: a trigger, a `jobs` map, and per job a
     `runs-on` and a non-empty `steps` list where each step has `uses` or `run`
  3. **pipefail**: any job with a `| tee` (or any pipe) inside a `run:` must
     declare `shell: bash` — workflow-level or job-level `defaults.run`, or on
     the step itself. This is the 2026-08-06 bug, encoded.
  4. **swallowed failures**: a step with `continue-on-error: true` must carry an
     `id`, and that id must be referenced somewhere else in the workflow. A step
     allowed to fail whose outcome nobody reads is a check that does nothing —
     which is what "continue-on-error" plus a missing gating step looks like.

Exit code is non-zero if any ERROR was found.

  python3 scripts/check-workflows.py
"""

import glob
import io
import os
import re
import sys

try:
    import yaml
except ImportError:  # pragma: no cover - runners have PyYAML preinstalled
    sys.exit("check-workflows: PyYAML is required (pip install pyyaml)")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKFLOWS = os.path.join(ROOT, ".github", "workflows")

# `on:` is parsed as the boolean True by YAML 1.1, which is what PyYAML
# implements. Both spellings mean the trigger block.
TRIGGER_KEYS = ("on", True)


def defaults_shell(node):
    """The `defaults.run.shell` declared on a workflow or job node, if any."""
    if not isinstance(node, dict):
        return None
    d = node.get("defaults")
    if not isinstance(d, dict):
        return None
    r = d.get("run")
    if not isinstance(r, dict):
        return None
    return r.get("shell")


def check_file(path):
    errs, warns = [], []
    rel = os.path.relpath(path, ROOT)
    E = lambda m: errs.append(f"{rel}: {m}")
    W = lambda m: warns.append(f"{rel}: {m}")

    raw = io.open(path, encoding="utf-8").read()
    try:
        wf = yaml.safe_load(raw)
    except yaml.YAMLError as e:
        mark = getattr(e, "problem_mark", None)
        where = f" at line {mark.line + 1}, column {mark.column + 1}" if mark else ""
        E(f"does not parse as YAML{where} — GitHub will silently NOT RUN it. "
          f"{getattr(e, 'problem', e)}")
        return errs, warns

    if not isinstance(wf, dict):
        E("top level is not a mapping")
        return errs, warns
    if not any(k in wf for k in TRIGGER_KEYS):
        E("no `on:` trigger block")

    jobs = wf.get("jobs")
    if not isinstance(jobs, dict) or not jobs:
        E("no `jobs:` block")
        return errs, warns

    wf_shell = defaults_shell(wf)

    for job_id, job in jobs.items():
        J = lambda m: E(f"job `{job_id}`: {m}")
        if not isinstance(job, dict):
            J("is not a mapping")
            continue
        if "uses" in job:  # a reusable-workflow call has no runs-on/steps
            continue
        if not job.get("runs-on"):
            J("has no `runs-on`")
        steps = job.get("steps")
        if not isinstance(steps, list) or not steps:
            J("has no `steps`")
            continue

        job_shell = defaults_shell(job) or wf_shell

        for i, step in enumerate(steps, 1):
            if not isinstance(step, dict):
                J(f"step {i} is not a mapping")
                continue
            label = step.get("name") or step.get("id") or f"step {i}"
            if not step.get("uses") and step.get("run") is None:
                J(f"{label}: has neither `uses` nor `run`")
                continue

            run = step.get("run")
            # --- pipefail (the 2026-08-06 bug) -----------------------------
            # A real pipeline only. `a || b` is a logical OR, not a pipe, and
            # `git diff --quiet || git commit` is a legitimate idiom in this
            # repo's own commit steps — flagging it would train people to
            # ignore this check, which is the failure mode it exists to stop.
            if isinstance(run, str) and "|" in run:
                piped = [ln for ln in run.splitlines()
                         if re.search(r"\S\s*(?<!\|)\|(?!\|)\s*\S", ln)
                         and not ln.lstrip().startswith("#")]
                if piped and (step.get("shell") or job_shell) != "bash":
                    J(f"{label}: pipes a command but no `shell: bash` is in effect — "
                      f"GitHub's default is `bash -e` WITHOUT pipefail, so this step "
                      f"reports success whenever the LAST command in the pipe succeeds "
                      f"(e.g. `| tee`). Add `defaults: {{run: {{shell: bash}}}}` to the job.")

            # --- swallowed failures ----------------------------------------
            if step.get("continue-on-error") is True:
                sid = step.get("id")
                if not sid:
                    J(f"{label}: `continue-on-error: true` with no `id` — nothing can "
                      f"read its outcome, so its failure is discarded silently")
                elif f"steps.{sid}." not in raw:
                    J(f"{label}: `continue-on-error: true` but `steps.{sid}.outcome` is "
                      f"never referenced — this check cannot fail the job")

    # --- invisible gates ---------------------------------------------------
    # A step that can FAIL the job must also be REPORTED in the job summary.
    # Real case (2026-08-16): `steps.locale_spec` was in the gating condition
    # but had no line in the summary block, so a PR failed on it while the
    # summary it pointed at read all-green — the one visible `failure` was an
    # informational check that is deliberately not gated. That is the same
    # shape as the two incidents above: the evidence of health was the absence
    # of a complaint, and the real complaint had nowhere to appear.
    gated = set(re.findall(r"steps\.(\w+)\.outcome\s*==\s*'failure'", raw))
    reported = set(re.findall(r"\$\{\{\s*steps\.(\w+)\.outcome\s*\}\}", raw))
    for sid in sorted(gated - reported):
        errs.append(f"{os.path.basename(path)}: `steps.{sid}.outcome` can fail the job "
                    f"but is never printed to the job summary — a red build with a "
                    f"green summary. Add a line for it where the other steps are echoed.")

    return errs, warns


def main():
    paths = sorted(glob.glob(os.path.join(WORKFLOWS, "*.yml")) +
                   glob.glob(os.path.join(WORKFLOWS, "*.yaml")))
    if not paths:
        print(f"check-workflows: no workflows found under {WORKFLOWS}")
        return 0

    E, W = [], []
    for p in paths:
        e, w = check_file(p)
        E += e
        W += w

    for m in E:
        print(f"  ERROR  {m}")
    for m in W:
        print(f"  warn   {m}")
    print(f"\n{len(paths)} workflow(s) checked · {len(E)} error(s) · {len(W)} warning(s)")
    if E:
        print("\nA workflow that does not parse is not reported as failing — it simply "
              "never runs. Fix these before merging.")
    return 1 if E else 0


if __name__ == "__main__":
    sys.exit(main())
