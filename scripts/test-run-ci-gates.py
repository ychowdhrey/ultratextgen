#!/usr/bin/env python3
"""Tests for scripts/run-ci-gates.py's `--only`: the probe every new gate is proved with.

`python3 scripts/run-ci-gates.py --only <step_id>` must return 1 on a broken tree and 0
on a clean one. Until 2026-11-19 an id that named no gating step matched nothing, ran
zero checks and printed "All 0 gating checks pass", exit 0. On 2026-11-18 a probe for
`poster_tiles_tests` returned 0 before the step existed and again with its module
deliberately broken. These tests pin the repair: an id that is not a gating step stops
the run with exit 2 and is named, before anything runs, and a real gating id still runs
and still fails.

Two halves. A throwaway workflow (passing gate, failing gate, informational step) drives
the runner end to end, with each step leaving a marker file so the test can see what
actually ran. Then the real `.github/workflows/validate.yml`, for the ids that exit
before running anything, and for this suite's own step being gating.

No dependencies beyond the runner's own (PyYAML), no test runner:
    python3 scripts/test-run-ci-gates.py          (exit 1 on any failure)
"""
import importlib.util
import pathlib
import subprocess
import sys
import tempfile

REPO = pathlib.Path(__file__).resolve().parent.parent
RUNNER = REPO / 'scripts' / 'run-ci-gates.py'
OWN_STEP = 'run_ci_gates_tests'   # this suite's step id in validate.yml
UNKNOWN = 2

FAILS = []


def expect(cond, msg, detail=''):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        FAILS.append(msg)
        if detail:
            print('       ' + detail.strip().replace('\n', '\n       ')[:1200])


FIXTURE = """\
name: fixture
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: bash
    steps:
      - name: Passing gate
        id: ok_gate
        continue-on-error: true
        run: touch ran-ok_gate | tee ok-gate.log
      - name: Failing gate
        id: broken_gate
        continue-on-error: true
        run: touch ran-broken_gate && exit 1
      - name: Informational step
        id: info_step
        continue-on-error: true
        run: touch ran-info_step
      - name: A step with no id
        run: touch ran-anonymous
      - name: Fail the job if any gating validator reported problems
        if: steps.ok_gate.outcome == 'failure' ||
          steps.broken_gate.outcome == 'failure'
        run: exit 1
"""


def run(args, cwd):
    p = subprocess.run([sys.executable, str(RUNNER), *args], cwd=cwd, capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def run_fixture(*args):
    """Run the runner against FIXTURE in a fresh directory; return (exit, output, steps that ran)."""
    with tempfile.TemporaryDirectory() as tmp:
        wf = pathlib.Path(tmp, '.github', 'workflows')
        wf.mkdir(parents=True)
        (wf / 'validate.yml').write_text(FIXTURE)
        code, out = run(list(args), tmp)
        ran = sorted(p.name[len('ran-'):] for p in pathlib.Path(tmp).glob('ran-*'))
    return code, out, ran


def load_runner():
    spec = importlib.util.spec_from_file_location('run_ci_gates', RUNNER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fixture_cases():
    print('A throwaway workflow, end to end')

    code, out, ran = run_fixture('--only', 'ok_gate')
    expect(code == 0, 'a passing gating id exits 0', out)
    expect(ran == ['ok_gate'], f'and runs that step and only that step (ran {ran})', out)
    expect('PASS  ok_gate' in out, 'and reports it as PASS', out)

    code, out, ran = run_fixture('--only', 'broken_gate')
    expect(code == 1, 'a failing gating id exits 1: the probe still goes red', out)
    expect(ran == ['broken_gate'], f'and it actually ran (ran {ran})', out)

    code, out, ran = run_fixture('--only', 'definitely_not_a_step')
    expect(code == UNKNOWN, f'an id that is no step exits {UNKNOWN}, not 0 (got {code})', out)
    expect('definitely_not_a_step' in out and 'no step' in out, 'and names the id as no step', out)
    expect(ran == [], f'and nothing ran (ran {ran})', out)
    expect('gating checks pass' not in out, 'and nothing claims a pass', out)

    code, out, ran = run_fixture('--only', 'info_step')
    expect(code == UNKNOWN, f'an id that is a step but not gating exits {UNKNOWN} (got {code})', out)
    expect('info_step' in out and 'not gating' in out, 'and says it is a step that does not gate', out)
    expect('no step' not in out, 'and does not call it a missing step', out)
    expect(ran == [], f'and nothing ran (ran {ran})', out)

    code, out, ran = run_fixture('--only', 'ok_gate', 'info_step', 'definitely_not_a_step')
    expect(code == UNKNOWN, f'a mix of real and unresolved ids exits {UNKNOWN} (got {code})', out)
    expect('info_step' in out and 'definitely_not_a_step' in out, 'and names every unresolved id', out)
    expect(ran == [], f'before running the real one (ran {ran})', out)

    code, out, _ = run_fixture('--only', 'ok_gat')
    expect(code == UNKNOWN and 'Did you mean: ok_gate' in out, 'a near miss is named with the id it resembles', out)

    code, out, ran = run_fixture('--only')
    expect(code == 2 and ran == [], f'--only with no id is a usage error, not "run everything" (exit {code})', out)

    code, out, ran = run_fixture()
    expect(code == 1, 'with no --only every gating step runs and the failing one fails the run', out)
    expect(ran == ['broken_gate', 'ok_gate'], f'and only gating steps run (ran {ran})', out)


def real_workflow_cases():
    print('The real .github/workflows/validate.yml')

    # The 2026-11-18 failure, as observed: exits before running anything, so it is fast.
    code, out = run(['--only', 'definitely_not_a_step'], REPO)
    expect(code == UNKNOWN, f'--only definitely_not_a_step exits {UNKNOWN}, not 0 (got {code})', out)
    expect('definitely_not_a_step' in out, 'and names it', out)
    expect('Running' not in out and 'gating checks pass' not in out, 'and runs nothing', out)

    try:
        mod = load_runner()
        steps, gating = mod.read_workflow(str(REPO / mod.WORKFLOW))
        gates = mod.gates_from(steps, gating)
        step_ids = {s['id'] for s in steps if s.get('id')}
    except (Exception, SystemExit) as e:   # an old runner without these functions is a failure, not a crash
        expect(False, f'the runner exposes read_workflow / gates_from ({type(e).__name__}: {e})')
        return

    expect(len(gates) > 0, f'the workflow has gating steps ({len(gates)})')
    expect(OWN_STEP in gating,
           f'this suite ({OWN_STEP}) is named in the "Fail the job" expression, so CI gates on it')

    informational = sorted(step_ids - gating)
    expect(bool(informational), f'the workflow has an informational step to probe with ({len(informational)})',
           'none found: the case below would check nothing, which must not read as a pass')
    if informational:
        sid = informational[0]
        code, out = run(['--only', sid], REPO)
        expect(code == UNKNOWN and 'not gating' in out,
               f'--only {sid} (a real informational step) exits {UNKNOWN} as not gating (got {code})', out)

    # A real gating id resolves to exactly itself. Resolved, not run: running a real gate
    # here would make this suite as slow as the gate, and the fixture already runs one.
    sid = gates[0][0]
    selected, not_gating, no_step = mod.resolve_only([sid, sid], gates, step_ids)
    expect([g[0] for g in selected] == [sid] and not not_gating and not no_step,
           f'--only {sid} (a real gating id) selects exactly that gate, once')


def main():
    fixture_cases()
    real_workflow_cases()
    print()
    if FAILS:
        print(f'{len(FAILS)} failed')
        return 1
    print('all passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
