"""Reader for the Unicode 18.0.0 data files listed in source-files.csv (Script, Script_Extensions, Blocks, East Asian Width, UnicodeData,
DerivedCoreProperties, emoji-data, GraphemeBreakProperty), plus our own implementation of the UAX #29 extended grapheme cluster rules.
Standard library only."""
import bisect, os, re

def _ranges(path, want=None):
    out = []
    for line in open(path, encoding="utf-8"):
        line = line.split("#", 1)[0].strip()
        if not line: continue
        cp, val = [x.strip() for x in line.split(";", 1)]
        a, _, b = cp.partition("..")
        out.append((int(a, 16), int(b or a, 16), val.split(";")[0].strip() if want is None else val))
    return out

class RangeMap:
    def __init__(self, ranges, default=None):
        self.r = sorted(ranges); self.starts = [x[0] for x in self.r]; self.default = default
    def get(self, cp):
        i = bisect.bisect_right(self.starts, cp) - 1
        if i >= 0 and self.r[i][0] <= cp <= self.r[i][1]: return self.r[i][2]
        return self.default

class UCD:
    def __init__(self, d):
        self.dir = d
        self.version = re.search(r"Scripts-([\d.]+)\.txt", open(os.path.join(d, "Scripts.txt"), encoding="utf-8").readline()).group(1)
        self.script = RangeMap(_ranges(os.path.join(d, "Scripts.txt")), "Unknown")
        self.block = RangeMap(_ranges(os.path.join(d, "Blocks.txt")), "No_Block")
        self.eaw = RangeMap(_ranges(os.path.join(d, "EastAsianWidth.txt")), "N")
        self.gcb = RangeMap(_ranges(os.path.join(d, "GraphemeBreakProperty.txt")), "Other")
        # ScriptExtensions: values are space separated short aliases
        self.scx = RangeMap(_ranges(os.path.join(d, "ScriptExtensions.txt"), want="raw"), None)
        # emoji-data: Extended_Pictographic, Emoji, Emoji_Presentation
        ep, em, epres = [], [], []
        for line in open(os.path.join(d, "emoji-data.txt"), encoding="utf-8"):
            line = line.split("#", 1)[0].strip()
            if not line: continue
            cp, prop = [x.strip() for x in line.split(";")]
            a, _, b = cp.partition(".."); r = (int(a, 16), int(b or a, 16), prop)
            {"Extended_Pictographic": ep, "Emoji": em, "Emoji_Presentation": epres}.get(prop, []).append(r)
        self.extpict, self.emoji, self.emoji_pres = RangeMap(ep), RangeMap(em), RangeMap(epres)
        # DerivedCoreProperties: Default_Ignorable_Code_Point and InCB
        di, incb = [], []
        for line in open(os.path.join(d, "DerivedCoreProperties.txt"), encoding="utf-8"):
            line = line.split("#", 1)[0].strip()
            if not line: continue
            cp, rest = [x.strip() for x in line.split(";", 1)]
            a, _, b = cp.partition(".."); rng = (int(a, 16), int(b or a, 16))
            if rest.startswith("Default_Ignorable_Code_Point"): di.append(rng + (True,))
            m = re.match(r"InCB;\s*(\w+)", rest)
            if m: incb.append(rng + (m.group(1),))
        self.default_ignorable = RangeMap(di, False); self.incb = RangeMap(incb, "None")
        # UnicodeData: name, gc, ccc, bidi
        self.ud = {}
        rs = None
        for line in open(os.path.join(d, "UnicodeData.txt"), encoding="utf-8"):
            f = line.rstrip("\n").split(";"); cp = int(f[0], 16); name = f[1]
            if name.endswith(", First>"): rs = (cp, name[1:-8], f); continue
            if name.endswith(", Last>") and rs:
                for c in (rs[0], cp): pass
                self.ud[("range", rs[0], cp)] = (rs[1], f[2], int(f[3]), f[4]); rs = None; continue
            self.ud[cp] = (name, f[2], int(f[3]), f[4])
        self._ranges_ud = sorted(k for k in self.ud if isinstance(k, tuple))
    def info(self, cp):
        v = self.ud.get(cp)
        if v: return v
        for _, a, b in self._ranges_ud:
            if a <= cp <= b:
                n, g, c, bd = self.ud[("range", a, b)]
                return (f"{n} (range)", g, c, bd)
        return ("<unassigned>", "Cn", 0, "L")
    def is_private_use(self, cp): return self.info(cp)[1] == "Co"

    # ---- UAX #29 extended grapheme clusters (rules GB3..GB999) ----
    def graphemes(self, s):
        cps = [ord(c) for c in s]; n = len(cps)
        if n == 0: return []
        P = [self.gcb.get(c) for c in cps]
        E = [bool(self.extpict.get(c)) for c in cps]
        I = [self.incb.get(c) for c in cps]
        out = []; start = 0
        for i in range(1, n):
            a, b = P[i-1], P[i]
            brk = True
            if a == "CR" and b == "LF": brk = False                              # GB3
            elif a in ("Control", "CR", "LF") or b in ("Control", "CR", "LF"): brk = True  # GB4/5
            elif a == "L" and b in ("L", "V", "LV", "LVT"): brk = False         # GB6
            elif a in ("LV", "V") and b in ("V", "T"): brk = False              # GB7
            elif a in ("LVT", "T") and b == "T": brk = False                    # GB8
            elif b in ("Extend", "ZWJ"): brk = False                            # GB9
            elif b == "SpacingMark": brk = False                                # GB9a
            elif a == "Prepend": brk = False                                    # GB9b
            else:
                # GB9c: Consonant [Extend|Linker]* Linker [Extend|Linker]* x Consonant
                if I[i] == "Consonant":
                    j = i - 1; seen_linker = False
                    while j >= start and I[j] in ("Extend", "Linker"):
                        if I[j] == "Linker": seen_linker = True
                        j -= 1
                    if seen_linker and j >= start and I[j] == "Consonant": brk = False
                # GB11: ExtPict Extend* ZWJ x ExtPict
                if brk and a == "ZWJ" and E[i]:
                    j = i - 2
                    while j >= start and P[j] == "Extend": j -= 1
                    if j >= start and E[j]: brk = False
                # GB12/13: regional indicator pairs
                if brk and a == "Regional_Indicator" and b == "Regional_Indicator":
                    k = 0; j = i - 1
                    while j >= start and P[j] == "Regional_Indicator": k += 1; j -= 1
                    if k % 2 == 1: brk = False
            if brk:
                out.append(s[start:i]); start = i
        out.append(s[start:]); return out
