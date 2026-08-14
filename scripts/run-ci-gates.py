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

Usage:
    python3 scripts/run-ci-gates.py [--base origin/main] [--only <id> ...]

Exit 0 when every gating check passes, 1 otherwise.
"""
import argparse
import re
import subprocess
import sys

WORKFLOW = '.github/workflows/validate.yml'


def load_gates():
    try:
        import yaml
    except ImportError:
        sys.exit('PyYAML required: pip install pyyaml')

    with open(WORKFLOW, encoding='utf-8') as fh:
        doc = yaml.safe_load(fh)

    steps = doc['jobs']['validate']['steps']
    final = next((s for s in steps if 'Fail the job' in str(s.get('name', ''))), None)
    if final is None:
        sys.exit(f'{WORKFLOW}: no "Fail the job…" step — cannot tell which checks gate')

    gating_ids = set(re.findall(r'steps\.(\w+)\.outcome', final.get('if', '')))
    if not gating_ids:
        sys.exit(f'{WORKFLOW}: the gating step\'s if: names no step ids')

    gates = []
    for step in steps:
        sid = step.get('id')
        if sid in gating_ids and step.get('run'):
            gates.append((sid, step['run'].strip()))

    missing = gating_ids - {g[0] for g in gates}
    if missing:
        # A gating id with no runnable step is a workflow bug, not something to
        # skip quietly — it would gate on a step that never produces an outcome.
        sys.exit(f'{WORKFLOW}: gating ids with no run: step: {sorted(missing)}')
    return gates


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
    ap.add_argument('--only', nargs='*', help='run only these step ids')
    args = ap.parse_args()

    gates = load_gates()
    if args.only:
        gates = [g for g in gates if g[0] in set(args.only)]

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
