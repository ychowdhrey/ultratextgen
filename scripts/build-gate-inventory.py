#!/usr/bin/env python3
"""Generate the gating-check inventory in docs/README.md from validate.yml.

Why this exists
---------------
`docs/README.md`'s `validate.yml` row enumerated the blocking gates by hand and
carried a hand-written count. It went stale and was hand-corrected on **nine
consecutive** weekly review cycles (37 -> 46 -> 49 against a real 54), and by
the ninth its own text read:

    "see Known gaps #16, whose own text already said the next recurrence should
     be a generator, not another hand-edit ... still hand-edited here because
     this review's mandate is a small, additive diff to this file only ...
     noting, again, that 'still hand-edited' is no longer a status update at
     nine repetitions."

So the review had diagnosed the fix and was structurally forbidden from
applying it: its mandate is a small additive diff to that one file. Nine
repetitions is the cost of nobody else owning it. This script is that owner.

It derives the list rather than restating it, which is the same reason
`run-ci-gates.py` parses the workflow instead of keeping its own list — and it
reuses that script's `load_gates()` outright, so the inventory, the local
runner and CI can never disagree about what gates.

Usage:
    python3 scripts/build-gate-inventory.py            # report staleness, exit 1
    python3 scripts/build-gate-inventory.py --write    # apply
"""
import importlib.util
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
README = REPO / 'docs' / 'README.md'
BEGIN = '<!-- gate-inventory:begin -->'
END = '<!-- gate-inventory:end -->'

WORDS = {
    13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen',
    17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
}


def load_gates():
    """Reuse run-ci-gates.py's own parser. One owner for 'what gates'."""
    path = REPO / 'scripts' / 'run-ci-gates.py'
    spec = importlib.util.spec_from_file_location('run_ci_gates', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.load_gates()


def display_name(cmd):
    """What a reader should see: the npm alias, or the script path.

    Derived from the command CI actually runs, never from a maintained label,
    so a renamed script renames itself here.
    """
    cmd = re.sub(r'\s*\|\s*tee\s+\S+\s*$', '', cmd.strip())
    # A step may be compound (`pip install pyyaml >/dev/null && npm run x`), so
    # search rather than anchor. Anchoring reported `pip` as the gate's name,
    # which is the kind of quiet wrong answer this whole file exists to stop.
    m = re.search(r'npm run ([\w:-]+)', cmd)
    if m:
        return m.group(1)
    m = re.search(r'(scripts/[\w./-]+)', cmd)
    if m:
        return m.group(1)
    # Last resort: the last command in the chain, not the first.
    return cmd.split('&&')[-1].strip().split()[0]


def render():
    gates = load_gates()
    tests, checks = [], []
    for _sid, cmd in gates:
        name = display_name(cmd)
        (tests if name.startswith('test:') else checks).append(name)

    # Stable, readable order; dedupe defensively (two ids could share a command).
    checks = sorted(dict.fromkeys(checks))
    tests = sorted(dict.fromkeys(tests))
    n_tests = WORDS.get(len(tests), str(len(tests)))

    return (
        f'{BEGIN} **Required, blocking gates ({len(gates)}):** '
        + ', '.join(f'`{c}`' for c in checks)
        + f', plus {n_tests} gating **unit-test** steps with no backlog to be '
          'red against: '
        + ', '.join(f'`{t}`' for t in tests)
        + '. *(This sentence is generated from `.github/workflows/validate.yml` '
          'by `scripts/build-gate-inventory.py`; it is not maintained by hand '
          'and a gate added to the workflow appears here for free.)* '
        + END
    )


def main():
    write = '--write' in sys.argv
    text = README.read_text(encoding='utf-8')

    if BEGIN not in text or END not in text:
        sys.exit(
            f'{README}: missing {BEGIN} / {END} markers.\n'
            'The generated sentence has no home. Re-add the markers around the '
            'blocking-gate enumeration in the validate.yml row.'
        )

    current = text[text.index(BEGIN):text.index(END) + len(END)]
    fresh = render()

    print('Gate inventory')
    print(f'  source:  .github/workflows/validate.yml')
    print(f'  target:  docs/README.md')

    if current == fresh:
        print('  status:  current ✓')
        return 0

    print('  status:  STALE')
    old_n = re.search(r'blocking gates \((\d+)\)', current)
    new_n = re.search(r'blocking gates \((\d+)\)', fresh)
    if old_n and new_n and old_n.group(1) != new_n.group(1):
        print(f'  count:   says {old_n.group(1)}, workflow gates on {new_n.group(1)}')

    if not write:
        print('')
        print('Run `python3 scripts/build-gate-inventory.py --write` to regenerate.')
        return 1

    README.write_text(text.replace(current, fresh), encoding='utf-8')
    print('  wrote:   docs/README.md')
    return 0


if __name__ == '__main__':
    sys.exit(main())
