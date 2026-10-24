#!/usr/bin/env python3
"""Independent pixel oracle for the accent study.

Renders the EXPECTED name from the shipped font files with FreeType + HarfBuzz (Raqm),
a rasteriser independent of Chromium/Skia, then template-matches it (scale-swept NCC)
against the exported artefact: the solid model row, the first outline row, and the
downloaded PNG. A second template with every mark stripped ("lost accent") is matched
too; an export passes only if the expected name beats the stripped one AND clears an
absolute threshold fixed from the ASCII controls. No human viewing is involved.
"""
import re, io, unicodedata, functools
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

class Fonts:
    def __init__(self, repo):
        self.repo = Path(repo); css = (self.repo/'style.css').read_text(); self.faces = []
        for m in re.finditer(r'@font-face\s*\{(.*?)\}', css, re.S):
            b = m.group(1)
            fam = re.search(r"font-family:\s*'([^']+)'", b); w = re.search(r'font-weight:\s*(\d+)', b)
            src = re.search(r"url\('([^']+\.woff2)'\)", b); ur = re.search(r'unicode-range:\s*([^;]+);', b)
            if not (fam and src): continue
            rng = []
            if ur:
                for p in ur.group(1).split(','):
                    lo, _, hi = p.strip()[2:].partition('-'); rng.append((int(lo,16), int(hi or lo,16)))
            self.faces.append(dict(fam=fam.group(1), w=int(w.group(1)) if w else 400, src=src.group(1), rng=rng))
    def face(self, fam, w, cp):
        for f in self.faces:
            if f['fam']==fam and f['w']==w and (not f['rng'] or any(a<=cp<=b for a,b in f['rng'])): return f['src']
        return None
    @functools.lru_cache(maxsize=None)
    def axes(self, src):
        t = TTFont(str(self.repo/src.lstrip('/')))
        return [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in t['fvar'].axes] if 'fvar' in t else []
    @functools.lru_cache(maxsize=None)
    def ttf(self, src):
        t = TTFont(str(self.repo/src.lstrip('/'))); t.flavor = None; b = io.BytesIO(); t.save(b); return b.getvalue()

ROUTE_FONT = {'cursive': ('Playwrite US Trad', 400), 'print': ('Quicksand', 700)}

def strip_marks(s):
    s = unicodedata.normalize('NFC', s).replace('Ł','L').replace('ł','l').replace('ı','i').replace('Đ','D').replace('đ','d')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))

def load_font(fonts, src, size, weight):
    f = ImageFont.truetype(io.BytesIO(fonts.ttf(src)), size, layout_engine=ImageFont.Layout.RAQM)
    ax = fonts.axes(src)
    if ax:   # variable font: pin wght the way the browser does from CSS font-weight, others at default
        f.set_variation_by_axes([min(max(weight, lo), hi) if tag=='wght' else d for tag, lo, d, hi in ax])
    return f

def render_pair(fonts, text, kind, size):
    """Expected and mark-stripped renders on one shared, uncropped canvas (same pen positions),
    returned with the expected ink bbox. None if a character has no face or lengths differ."""
    text = unicodedata.normalize('NFC', text); strip = strip_marks(text)
    if len(strip) != len(text): return None
    fam, w = ROUTE_FONT[kind]; runs = []
    for i, ch in enumerate(text):
        src = fonts.face(fam, w, ord(ch)); ssrc = fonts.face(fam, w, ord(strip[i]))
        if not src or not ssrc: return None
        if runs and runs[-1][0]==src: runs[-1][1].append(i)
        else: runs.append([src, [i]])
    pad = size; fonts_ = [load_font(fonts, r[0], size, w) for r in runs]
    W = int(sum(f.getlength(''.join(text[i] for i in r[1])) for f, r in zip(fonts_, runs)))+2*pad
    E_ = Image.new('L', (W, size*3), 0); S_ = Image.new('L', (W, size*3), 0)
    de, ds = ImageDraw.Draw(E_), ImageDraw.Draw(S_); x = pad; base = int(size*1.6)
    for f, r in zip(fonts_, runs):
        t = ''.join(text[i] for i in r[1])
        de.text((x, base), t, font=f, fill=255, anchor='ls')
        ds.text((x, base), ''.join(strip[i] for i in r[1]), font=f, fill=255, anchor='ls')  # whole run: keeps shaping/kerning context
        x += f.getlength(t)
    e = np.array(E_); st = np.array(S_); ys, xs = np.where(e>128)
    return e, st, (int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1)

def render_template(fonts, text, kind, size):
    text = unicodedata.normalize('NFC', text)   # the expected visual is the composed name, whatever form was typed
    fam, w = ROUTE_FONT[kind]; runs = []
    for ch in text:
        src = fonts.face(fam, w, ord(ch))
        if not src: return None
        if runs and runs[-1][0]==src: runs[-1][1]+=ch
        else: runs.append([src, ch])
    pad = size; W = int(sum(load_font(fonts, s, size, w).getlength(t) for s,t in runs))+2*pad
    img = Image.new('L', (W, size*3), 0); d = ImageDraw.Draw(img); x = pad
    for s, t in runs:
        f = load_font(fonts, s, size, w)
        d.text((x, int(size*1.6)), t, font=f, fill=255, anchor='ls'); x += f.getlength(t)
    a = np.array(img); ys, xs = np.where(a>128)
    return a[ys.min():ys.max()+1, xs.min():xs.max()+1]

def bands(mask, min_gap=6):
    rows = np.where(mask.sum(1)>0)[0]
    if not len(rows): return []
    out=[]; s=p=rows[0]
    for r in rows[1:]:
        if r-p>min_gap: out.append((s,p)); s=r
        p=r
    out.append((s,p)); return out

def solid_mask(rgb):
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY); return (g<110).astype(np.uint8)
def stroke_mask(rgb):
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY); m = ((g>=95)&(g<=185)).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_RECT,(max(40,rgb.shape[1]//12),1))
    lines = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)            # long horizontal rules
    lines = cv2.dilate(lines, np.ones((5,1),np.uint8))
    m = m & (1-lines)
    return cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2,2),np.uint8))

def to_edge(tmpl, size):
    t = (tmpl>128).astype(np.uint8); k = 3
    return cv2.morphologyEx(t, cv2.MORPH_GRADIENT, np.ones((k,k),np.uint8))

def ncc(img, tmpl, raw=None, traw=None):
    """normalised cross-correlation; windows holding < 30% of the template's ink are void
    (OpenCV returns a spurious 1.0 on near-constant windows)"""
    if tmpl.shape[0]>=img.shape[0] or tmpl.shape[1]>=img.shape[1]: return -1.0
    r = cv2.matchTemplate(img, tmpl, cv2.TM_CCOEFF_NORMED)
    h, w = tmpl.shape
    ink = cv2.boxFilter(raw.astype(np.float32), -1, (w,h), normalize=False, borderType=cv2.BORDER_CONSTANT)
    ink = ink[h//2:h//2+r.shape[0], w//2:w//2+r.shape[1]]
    r = np.where(ink >= 0.3*float(traw.sum()), r, -1.0)
    return float(np.nan_to_num(r, nan=-1.0, posinf=-1.0).max())

def best_score(roi, fonts, text, kind, mode, sizes):
    best=(-1.0,None)
    for s in sizes:
        t = render_template(fonts, text, kind, s)
        if t is None: return (-2.0,None)
        if mode=='edge': t = to_edge(t, s)
        else: t = (t>128).astype(np.uint8)
        sig = max(1.0, s*0.012)
        a = cv2.GaussianBlur(roi.astype(np.float32),(0,0),sig); b = cv2.GaussianBlur(t.astype(np.float32),(0,0),sig)
        v = ncc(a,b,roi,t)
        if v>best[0]: best=(v,s)
    return best

def sweep(roi, fonts, text, kind, mode, lo=40, hi=420):
    """coarse (x1.15 steps) then fine around the winner"""
    cs = [int(lo*1.15**i) for i in range(40) if lo*1.15**i<=hi]
    v,s = best_score(roi, fonts, text, kind, mode, cs)
    if s is None: return v,s
    fine = sorted(set(int(s*f) for f in (0.92,0.95,0.97,1.0,1.03,1.05,1.08)))
    v2,s2 = best_score(roi, fonts, text, kind, mode, fine)
    return (max(v,v2), s2 if v2>=v else s)

def roi_solid(rgb):
    """the solid model row is the 2nd ink band down the page (the 1st is the title line)"""
    m = solid_mask(rgb); b = bands(m, 45)   # 45px: joins a mark to its letters, still < the 62px min title gap measured
    if not b: return None, None
    s, e = b[1] if len(b) > 1 else b[0]
    pad = int((e-s)*0.6); roi = m[max(0,s-pad):e+pad+1]
    return np.pad(roi, ((0,0),(pad,pad))), (s, e)   # blank side margins: a name fitted to the full row width must still be able to slide

def roi_outline(rgb, below, tallest=False):
    m = stroke_mask(rgb)
    if below is not None: m = m.copy(); m[:below+4] = 0
    b = bands(m, 8)
    b = [x for x in b if x[1]-x[0] > 20]
    if not b: return None
    s,e = max(b, key=lambda x:x[1]-x[0]) if tallest else b[0]; pad=int((e-s)*0.6); return m[max(0,s-pad):e+pad+1]


def _locate(roi, fonts, text, kind, mode):
    """scale-swept NCC of the expected template; returns (ncc, size, (x,y) of ink bbox in roi)"""
    v, sz = sweep(roi, fonts, text, kind, mode)
    if sz is None: return v, None, None
    t = render_template(fonts, text, kind, sz)
    if mode=='edge': t = to_edge(t, sz)
    else: t = (t>128).astype(np.uint8)
    sig = max(1.0, sz*0.012)
    a = cv2.GaussianBlur(roi.astype(np.float32),(0,0),sig); b = cv2.GaussianBlur(t.astype(np.float32),(0,0),sig)
    r = cv2.matchTemplate(a, b, cv2.TM_CCOEFF_NORMED); h, w = t.shape
    ink = cv2.boxFilter(roi.astype(np.float32), -1, (w,h), normalize=False, borderType=cv2.BORDER_CONSTANT)[h//2:h//2+r.shape[0], w//2:w//2+r.shape[1]]
    r = np.where(ink >= 0.3*float(t.sum()), np.nan_to_num(r, nan=-1.0), -1.0)
    y, x = np.unravel_index(int(np.argmax(r)), r.shape); return float(r[y,x]), sz, (int(x), int(y))

def evaluate(roi, fonts, text, kind, mode):
    """ncc: whole-name fit.  mark_recall: share of the pixels that exist ONLY because of the marks
    (expected minus stripped render) that are present in the export at the matched position."""
    out = dict(ncc=-1.0, size=None, n_marks=0, mark_px=0, mark_recall=None)
    if roi is None: return out
    v, sz, pos = _locate(roi, fonts, text, kind, mode)
    out.update(ncc=v, size=sz)
    if sz is None: return out
    pair = render_pair(fonts, text, kind, sz)
    if pair is None: return out
    e, st, (bx, by, ex, ey) = pair
    em = (e>128).astype(np.uint8); sm = (st>128).astype(np.uint8)
    tol = max(2, int(round(sz*0.03)))
    rtol = max(2, int(round(sz*float(__import__('os').environ.get('RECALL_TOL','0.03')))))   # match tolerance for the recall test
    only = em & (1 - cv2.dilate(sm, np.ones((2*tol+1,2*tol+1), np.uint8)))
    k = max(3, int(round(sz*0.035)))|1                       # drop thin outline slivers, keep real marks
    only = cv2.morphologyEx(only, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(only, connectivity=8)
    comps = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= 0.001*sz*sz]
    out['n_marks'] = len(comps)
    edge_em = to_edge(em*255, sz) if mode=='edge' else None
    d = cv2.dilate(roi.astype(np.uint8), np.ones((2*rtol+1,2*rtol+1), np.uint8))
    recalls = []; total = 0
    for i in comps:
        comp = (lab==i).astype(np.uint8)
        if mode=='edge':
            comp = edge_em & cv2.dilate(comp, np.ones((2*tol+1,2*tol+1), np.uint8))
        ys, xs = np.where(comp>0)
        if not len(xs): continue
        total += len(xs)
        cx = xs - bx + pos[0]; cy = ys - by + pos[1]
        ok = (cx>=0)&(cx<d.shape[1])&(cy>=0)&(cy<d.shape[0])
        hit = np.zeros(len(xs), bool); hit[ok] = d[cy[ok], cx[ok]]>0
        recalls.append(float(hit.mean()))
    out['mark_px'] = int(total)
    out['mark_recall'] = min(recalls) if recalls else None      # every mark region must be present
    out['mean_recall'] = float(np.mean(recalls)) if recalls else None
    return out
