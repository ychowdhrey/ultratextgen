#!/usr/bin/env python3
"""Zero-dependency tests for scripts/lib/symbol_pages.py: every defect fires on a broken page, none fires on a clean one.

  python3 scripts/test-symbol-pages.py
The clean page is built first and asserted clean, then each test breaks exactly ONE thing (a real pair, so the
defect cannot survive for the wrong reason).
"""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import symbol_pages as sp

VER, RANGES = sp.load_assigned()
CLEAN = '''<html><body>
<section class="symbol-hero"><button class="symbol-hero-tile symbol-tile" data-symbol="\u2260" aria-label="Copy not equal (U+2260)">\u2260</button></section>
<div class="flag-row"><button class="flag-emoji symbol-tile" data-symbol="\u2260" aria-label="Copy">\u2260</button><span class="flag-label">Not equal (U+2260)</span></div>
<section class="editorial-section"><table class="data-table"><tbody>
<tr><td>HTML</td><td><code>&amp;ne;</code> / <code>&amp;#8800;</code></td></tr><tr><td>CSS</td><td><code>content: "\\2260"</code></td></tr></tbody></table></section>
<section class="editorial-section" id="faq"><div class="faq-item"><button class="faq-question">Q?</button><div class="faq-answer">A</div></div></section>
<footer class="footer">f</footer></body></html>'''
REL = "symbol/not-equal-sign/index.html"


def ids(src, rel=REL):
    return {d for d, _l, _t in sp.check_page(rel, src, RANGES, VER)}


class T(unittest.TestCase):
    def test_clean_is_clean(self):
        self.assertEqual(ids(CLEAN), set())

    def test_faq_after_footer(self):
        broken, moved = CLEAN, False
        # swap: faq goes below the footer
        a = CLEAN.index('<section class="editorial-section" id="faq">'); b = CLEAN.index("</section>", a) + len("</section>")
        faq = CLEAN[a:b]; broken = CLEAN[:a] + CLEAN[b:]
        broken = broken.replace("</footer>", "</footer>\n" + faq)
        self.assertIn("faq-after-footer", ids(broken))
        fixed, ok = sp.move_faq_above_footer(broken)
        self.assertTrue(ok); self.assertEqual(ids(fixed), set())

    def test_faq_without_id_is_still_found(self):  # the id-keyed first version missed these
        a = CLEAN.index('<section class="editorial-section" id="faq">'); b = CLEAN.index("</section>", a) + len("</section>")
        faq = CLEAN[a:b].replace(' id="faq"', ""); broken = (CLEAN[:a] + CLEAN[b:]).replace("</footer>", "</footer>\n" + faq)
        self.assertIn("faq-after-footer", ids(broken))

    def test_details_faq_after_footer(self):
        broken = CLEAN.replace("</footer>", '</footer><section class="editorial-section"><details><summary>Q</summary>A</details></section>')
        self.assertIn("faq-after-footer", ids(broken))

    def test_tile_shows_other_glyph(self):
        self.assertIn("tile-glyph-mismatch", ids(CLEAN.replace('data-symbol="\u2260" aria-label="Copy">\u2260', 'data-symbol="\u2260" aria-label="Copy">=', 1)))

    def test_label_states_other_codepoint(self):
        self.assertIn("tile-glyph-mismatch", ids(CLEAN.replace("Not equal (U+2260)", "Not equal (U+2261)")))

    def test_unassigned_copy_and_provisional_marker(self):
        bad = CLEAN.replace('data-symbol="\u2260" aria-label="Copy">\u2260', 'data-symbol="\u2072" aria-label="Copy">\u2072', 1)
        self.assertIn("unassigned-copy", ids(bad))
        marked = bad.replace('<button class="flag-emoji symbol-tile"', '<button class="flag-emoji symbol-tile" data-provisional="U+2072"', 1)
        self.assertNotIn("unassigned-copy", ids(marked))

    def test_new_unicode_18_character_is_assigned(self):  # python's unicodedata (15.x) would call this unassigned
        ok = CLEAN.replace('data-symbol="\u2260" aria-label="Copy">\u2260', 'data-symbol="\u20c4" aria-label="Copy">\u20c4', 1)
        self.assertNotIn("unassigned-copy", ids(ok))

    def test_double_escaped_entity(self):
        self.assertIn("double-escaped-entity", ids(CLEAN.replace("</footer>", "<p>HTML: &amp;amp;le;</p></footer>")))
        self.assertNotIn("double-escaped-entity", ids(CLEAN.replace("</footer>", "<p>HTML: &amp;amp;amp;</p></footer>")))  # an intentional demo of &amp;

    def test_alt_code_must_decode_to_a_copied_glyph(self):
        good = CLEAN.replace("</footer>", "<p>Alt+8800 is not decodable</p></footer>")
        self.assertNotIn("alt-code-mismatch", ids(good))  # >255: not judged
        bad = CLEAN.replace("</footer>", "<p>Alt+0174</p></footer>")   # 0174 = (R), not the glyph this page copies
        self.assertIn("alt-code-mismatch", ids(bad))
        fine = CLEAN.replace('data-symbol="\u2260" aria-label="Copy">\u2260', 'data-symbol="\u00ae" aria-label="Copy">\u00ae', 1).replace("Not equal (U+2260)", "Registered (U+00AE)").replace("</footer>", "<p>Alt+0174</p></footer>")
        self.assertNotIn("alt-code-mismatch", ids(fine))

    def test_not_a_symbol_page_is_not_judged_for_the_table(self):
        self.assertFalse(sp.is_symbol_page("library/foo/index.html"))
        self.assertTrue(sp.is_symbol_page("ko/symbol/foo/index.html"))


if __name__ == "__main__":
    unittest.main(verbosity=1)
