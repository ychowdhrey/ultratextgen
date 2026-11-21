#!/usr/bin/env python3
"""Run exactly the gates CI gates on, locally, against the right base.

Why this exists
---------------
Two PR failures on 2026-08-13 came from the same root cause, and neither was a
bad check — both were the checks not being run the way CI runs them.

  1. Every local gate run used a different merge base than CI, which passes
     `--base origin/<pr base ref>`. Bare `npm run check:translation-parity`
     resolved something else and reported green on a branch CI failed.
  2. The local list of gates was maintained from memory and had drifted. It was
     missing `check:locale-spec`, which was the second failure.

Both are the same mistake in different clothes: reconstructing what CI does
instead of reading what CI does. So this script does not hardcode a list. It
parses `.github/workflows/validate.yml`, finds the final "Fail the job if any
gating validator reported problems" step, extracts the step ids named in its
`if:` expression, and runs exactly those steps' commands — substituting the
base ref where the workflow interpolates it.

Add a gate to the workflow and it appears here for free. Mark one informational
by removing it from that `if:` and it disappears from here. The two cannot
drift, which is the same reason audit and enforcement share their logic
elsewhere in this repo.

`--only <id>` is the probe every new gate is proved with: it must return 1 on a
deliberately broken tree and 0 on a clean one. Until 2026-11-19 an id that named
no gating step simply matched nothing, ran zero checks and printed "All 0
gating checks pass", exit 0 — for a step not yet added, a misspelt id, and a
step that exists but was never put in the "Fail the job" expression alike. A
probe that runs nothing read exactly like a pass. Every id given to `--only` is
now resolved before anything runs: an id that is a step but does not gate, and
an id that is no step at all, are each named, and the run stops with exit 2.

Usage:
    python3 scripts/run-ci-gates.py [--base origin/main] [--only <id> ...]

Exit 0 when every selected gating check passes, 1 when one fails, 2 (UNKNOWN)
when `--only` names an id that is not a gating step, in which case nothing ran.
A usage error, such as `--only` with no id, is argparse's 2 as well.
"""
import argparse
import difflib
import re
import subprocess
import sys

WORKFLOW = '.github/workflows/validate.yml'
EXIT_UNKNOWN = 2


def read_workflow(path=WORKFLOW):
    """The validate job's steps, and the step ids its "Fail the job" `if:` names."""
    try:
        import yaml
    except ImportError:
        sys.exit('PyYAML required: pip install pyyaml')

    with open(path, encoding='utf-8') as fh:
        doc = yaml.safe_load(fh)

    steps = doc['jobs']['validate']['steps']
    final = next((s for s in steps if 'Fail the job' in str(s.get('name', ''))), None)
    if final is None:
        sys.exit(f'{path}: no "Fail the job…" step — cannot tell which checks gate')

    gating_ids = set(re.findall(r'steps\.(\w+)\.outcome', final.get('if', '')))
    if not gating_ids:
        sys.exit(f'{path}: the gating step\'s if: names no step ids')
    return steps, gating_ids


def load_gates(path=WORKFLOW):
    """[(step id, run command)] for every gating step, in workflow order."""
    return gates_from(*read_workflow(path), path=path)


def gates_from(steps, gating_ids, path=WORKFLOW):
    gates = []
    for step in steps:
        sid = step.get('id')
        if sid in gating_ids and step.get('run'):
            gates.append((sid, step['run'].strip()))

    missing = gating_ids - {g[0] for g in gates}
    if missing:
        # A gating id with no runnable step is a workflow bug, not something to
        # skip quietly — it would gate on a step that never produces an outcome.
        sys.exit(f'{path}: gating ids with no run: step: {sorted(missing)}')
    return gates


def resolve_only(only, gates, step_ids):
    """Split the ids asked for into (gates to run, ids that are steps but do not
    gate, ids that are no step at all). The gates keep workflow order."""
    wanted = list(dict.fromkeys(only))
    gating = {sid for sid, _ in gates}
    not_gating = [i for i in wanted if i not in gating and i in step_ids]
    no_step = [i for i in wanted if i not in gating and i not in step_ids]
    selected = [g for g in gates if g[0] in set(wanted)]
    return selected, not_gating, no_step


def report_unresolved(not_gating, no_step, step_ids):
    """Name every id `--only` could not run, and why. Nothing has run yet."""
    out = sys.stderr
    n = len(not_gating) + len(no_step)
    print(f'run-ci-gates: --only names {n} id(s) that are not gating steps in {WORKFLOW}; '
          f'nothing was run.\n', file=out)
    for sid in not_gating:
        print(f'  {sid}\n      is a step, but not gating: the "Fail the job" if: expression does not '
              f'name steps.{sid}.outcome, so CI runs it and never fails on it. Add it there if it '
              f'should gate.', file=out)
    for sid in no_step:
        near = difflib.get_close_matches(sid, sorted(step_ids), n=3, cutoff=0.8)
        hint = f' Did you mean: {", ".join(near)}?' if near else ''
        print(f'  {sid}\n      no step in {WORKFLOW} has this id.{hint}', file=out)
    print(f'\nA probe that runs nothing cannot say whether CI gates on a step: UNKNOWN '
          f'(exit {EXIT_UNKNOWN}), never a pass.', file=out)


def normalise(cmd, base):
    """Strip the `| tee x.log` and resolve the workflow's base-ref interpolation."""
    cmd = re.sub(r'\$\{\{\s*github\.event\.pull_request\.base\.ref\s*\|\|\s*[\'"]?(\w+)[\'"]?\s*\}\}',
                 base.split('/')[-1], cmd)
    cmd = re.sub(r'\$\{\{[^}]*\}\}', base.split('/')[-1], cmd)
    cmd = re.sub(r'\s*\|\s*tee\s+\S+\s*$', '', cmd.strip())
    return cmd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='origin/main',
                    help='base ref the PR will merge into (default origin/main)')
    ap.add_argument('--only', nargs='+', metavar='STEP_ID',
                    help='run only these gating step ids; any id that is not a gating '
                         'step stops the run with exit 2 before anything runs')
    args = ap.parse_args()

    steps, gating_ids = read_workflow()
    gates = gates_from(steps, gating_ids)
    if args.only is not None:
        step_ids = {s['id'] for s in steps if s.get('id')}
        gates, not_gating, no_step = resolve_only(args.only, gates, step_ids)
        if not_gating or no_step:
            report_unresolved(not_gating, no_step, step_ids)
            return EXIT_UNKNOWN

    print(f'Running {len(gates)} gating check(s) from {WORKFLOW}, base {args.base}\n')

    failed = []
    for sid, raw in gates:
        cmd = normalise(raw, args.base)
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        ok = proc.returncode == 0
        print(f'  {"PASS" if ok else "FAIL"}  {sid:26} {cmd[:70]}')
        if not ok:
            failed.append((sid, cmd, proc.stdout, proc.stderr))

    print()
    if not failed:
        print(f'All {len(gates)} gating checks pass. ✓')
        return 0

    print(f'{len(failed)} gating check(s) failed:\n')
    for sid, cmd, out, err in failed:
        print(f'=== {sid}  ({cmd})')
        tail = (out or err).strip().split('\n')
        print('\n'.join('    ' + line for line in tail[-25:]))
        print()
    return 1


if __name__ == '__main__':
    sys.exit(main())
