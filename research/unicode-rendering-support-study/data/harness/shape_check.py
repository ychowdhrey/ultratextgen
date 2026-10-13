"""Font-level (no browser) sequence composition test with HarfBuzz.
shape_class(font_path, seq) -> 'FULL' | 'DECOMPOSED' | 'MISSING'
  FULL       : one visible glyph (not .notdef) after shaping the whole sequence
  DECOMPOSED : >1 visible glyphs, all non-.notdef (font has the components but not the composition)
  MISSING    : any glyph is .notdef (gid 0)
This is a property of the FONT + HarfBuzz, not of Chromium; the browser result is measured separately."""
import uharfbuzz as hb
class Shaper:
    def __init__(self, path):
        self.blob = hb.Blob.from_file_path(path); self.face = hb.Face(self.blob); self.font = hb.Font(self.face)
        self.cmap = set(self.face.unicode_set() if hasattr(self.face, 'unicode_set') else [])
    def glyphs(self, seq):
        buf = hb.Buffer(); buf.add_str(''.join(map(chr, seq)))
        buf.flags = hb.BufferFlags.REMOVE_DEFAULT_IGNORABLES
        buf.guess_segment_properties()
        hb.shape(self.font, buf, {'liga': True, 'ccmp': True, 'calt': True, 'clig': True})
        return [i.codepoint for i in buf.glyph_infos]
    def shape_class(self, seq):
        g = self.glyphs(seq)
        if not g or any(x == 0 for x in g): return 'MISSING'
        return 'FULL' if len(g) == 1 else 'DECOMPOSED'
