#!/usr/bin/env python3
"""Zero-dependency tests for scripts/lib/tile_unicode.py: each defect fires on a broken tile, none on a clean one.

  python3 scripts/test-tile-unicode.py
Every broken case differs from a clean control in exactly one respect, so a defect cannot fire for the wrong reason.
"""
import os, sys, subprocess, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import symbol_pages as sp
import tile_unicode as tu

_V, RANGES = sp.load_assigned()
EMOJI = tu.load_emoji()


def ids(raw, prov=False):
    from html import unescape
    return set(tu.classify(raw, unescape(raw), prov, RANGES, EMOJI))


def w(d, s):
    with open(os.path.join(d, "p", "index.html"), "w", encoding="utf-8") as f:
        f.write(s)


class T(unittest.TestCase):
    def test_clean_controls(self):
        for t in ["A", "≠", "&#x2126;", "\U0001F600", "\U0001F469\u200d\U0001F4BB", "\U0001F1FA\U0001F1F8",
                  "1\ufe0f\u20e3", "❤\ufe0f", "\U0001F3F4\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F", "\u200d"]:
            self.assertEqual({d for d in ids(t) if tu.SEVERITY[d] != "info"}, set(), t.encode("unicode_escape"))

    def test_unassigned(self):
        self.assertIn("unassigned-copy", ids("\U0001D549"))
        self.assertNotIn("unassigned-copy", ids("\U0001D549", prov=True))
        self.assertNotIn("unassigned-copy", ids("ℕ"))  # the assigned double-struck N the tile should have carried

    def test_nfc_literal_vs_entity(self):
        self.assertIn("nfc-fragile-literal", ids("Ω"))
        self.assertNotIn("nfc-fragile-literal", ids("&#x2126;"))

    def test_regional_indicator(self):
        self.assertIn("odd-regional-indicator", ids("\U0001F1FA"))
        self.assertIn("odd-regional-indicator", ids("\U0001F1FA\U0001F1F8\U0001F1E7"))

    def test_keycap(self):
        self.assertIn("bad-keycap", ids("a\u20e3"))
        self.assertNotIn("bad-keycap", ids("#\ufe0f\u20e3"))

    def test_joiners(self):
        self.assertIn("stray-joiner", ids("\U0001F469\u200d"))
        self.assertIn("stray-joiner", ids("\U0001F469\u200d\u200d\U0001F4BB"))
        self.assertIn("zwj-not-emoji", ids("A\u200dB"))

    def test_presentation(self):
        self.assertIn("text-default-no-vs16", ids("❤"))
        self.assertNotIn("text-default-no-vs16", ids("❤\ufe0f"))
        self.assertIn("redundant-vs16", ids("♓\ufe0f"))
        self.assertIn("combo-unqualified", ids("\U0001F480☠\U0001F480"))
        self.assertNotIn("combo-unqualified", ids("\U0001F480☠\ufe0f\U0001F480"))

    def test_page_scan_and_exit_codes(self):
        bad = '<button class="symbol-tile" data-symbol="&#x1D549">x</button>\n<button data-symbol="Ω">y</button>'
        got = {d for d, _l, _t in tu.check_page("x/index.html", bad, RANGES, EMOJI)}
        self.assertEqual(got, {"unassigned-copy", "nfc-fragile-literal"})
        with tempfile.TemporaryDirectory() as d:
            audit = os.path.join(HERE, "audit-tile-unicode.py")
            self.assertEqual(subprocess.run([sys.executable, audit, "--root", d], capture_output=True).returncode, 3)  # no tiles: UNKNOWN
            os.makedirs(os.path.join(d, "p"))
            w(d, bad)
            self.assertEqual(subprocess.run([sys.executable, audit, "--root", d], capture_output=True).returncode, 0)
            self.assertEqual(subprocess.run([sys.executable, audit, "--root", d, "--fail-on", "error"], capture_output=True).returncode, 1)
            w(d, '<button data-symbol="A">A</button>')
            self.assertEqual(subprocess.run([sys.executable, audit, "--root", d, "--fail-on", "hardening"], capture_output=True).returncode, 0)


class Delta(unittest.TestCase):
    def tile(self, v):
        return '<button class="symbol-tile" data-symbol="%s">x</button>\n' % v

    def test_delta_counts_only_additions(self):
        bad = self.tile("&#x1D549;")
        self.assertEqual(tu.new_defects(bad, bad, RANGES, EMOJI), [])  # live on base: not new
        self.assertEqual(len(tu.new_defects(bad, bad + bad, RANGES, EMOJI)), 1)  # a second copy is new
        self.assertEqual(len(tu.new_defects("", bad, RANGES, EMOJI)), 1)  # a new page
        self.assertEqual(tu.new_defects(bad, self.tile("&#x2115;"), RANGES, EMOJI), [])  # the repair
        self.assertEqual(tu.new_defects("", self.tile("&#x2126;") + self.tile("\U0001F600"), RANGES, EMOJI), [])  # negative control

    def test_cli_exit_codes_in_a_real_repo(self):
        gate = os.path.join(HERE, "check-tile-unicode.py")
        with tempfile.TemporaryDirectory() as d:
            def git(*a):
                subprocess.run(["git", *a], cwd=d, check=True, capture_output=True)

            def run(base="main"):
                return subprocess.run([sys.executable, gate, "--root", d, "--base", base], capture_output=True, text=True)

            def write(body):
                with open(os.path.join(d, "usecase", "x", "index.html"), "w", encoding="utf-8") as f:
                    f.write(body)
            git("init", "-q"); git("config", "user.email", "t@t"); git("config", "user.name", "t")
            os.makedirs(os.path.join(d, "usecase", "x"))
            write(self.tile("A") + self.tile("&#x1D549;"))  # the base already carries one defect
            git("add", "-A"); git("commit", "-qm", "base"); git("branch", "-M", "main"); git("checkout", "-qb", "feat")
            write(self.tile("A") + self.tile("&#x1D549;") + self.tile("B"))  # unrelated edit, live defect untouched
            git("commit", "-qam", "edit")
            self.assertEqual(run().returncode, 0)  # delta: a pre-existing defect does not fail the PR
            write(self.tile("A") + self.tile("&#x1D549;") + self.tile("&#x1D549;"))  # a second one
            git("commit", "-qam", "worse")
            r = run()
            self.assertEqual(r.returncode, 1, r.stdout)
            self.assertIn("unassigned-copy", r.stdout)
            write(self.tile("A") + self.tile("&#x2115;"))  # repaired
            git("commit", "-qam", "fix")
            self.assertEqual(run().returncode, 0)
            self.assertEqual(run("no-such-ref").returncode, 2)  # UNKNOWN, never 0

    def test_gate_script_runs_on_this_repo(self):
        gate = os.path.join(HERE, "check-tile-unicode.py")
        r = subprocess.run([sys.executable, gate, "--base", "HEAD"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)  # nothing changed vs HEAD: clean, not UNKNOWN


if __name__ == "__main__":
    unittest.main(verbosity=1)
