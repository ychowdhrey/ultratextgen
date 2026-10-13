#!/usr/bin/env python3
"""Turn raw observations into render classes using several independent signals.  Raw files are never modified.
  classify.py <run_id> [<run_id> ...]       (run ids as in results/raw/<run_id>.csv.gz)

Signals for a single code point (cell):
  S1 pixel fingerprint : exact pixel match with the condition's own tofu sentinels (unassigned code points rendered in the same session)
  S2 CDP platform font : which font Chromium actually used (CSS.getPlatformFontsForNode)
  S3 cmap              : does that font file's character map contain the code point (offline, fontTools)
  S4 frame test        : hollow-rectangle shape (hex-code 'last resort' boxes, .notdef boxes)
Classes (code points): TOFU, LASTRESORT_HEXBOX, BLANK, INVISIBLE_OK, REPLACEMENT_GLYPH, MONO_GLYPH, COLOR_EMOJI, UNKNOWN
Classes (sequences)  : FULL, PARTIAL, DECOMPOSED, MISSING, UNKNOWN  (+ documented extension TEXT_FALLBACK: one monochrome glyph where a colour emoji is intended)
"""
import csv, gzip, io, os, sys, json, collections, pickle
import numpy as np
from PIL import Image
from conditions import *
import cmap_index
import ucd_lib as U
_CANON = None
_DM = None

def read_raw(run_id):
    with gzip.open(f'{ROOT}/results/raw/{run_id}.csv.gz', 'rt', encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))

def frame_features(run_id, rows, geom):
    """Reopen page screenshots and compute shape features not stored in the raw pass.
    For combining cells drawn by a Unifont face the right-most 48 or 42 columns are measured when they form a full-width block, so that the dotted-circle base
    next to a placeholder box does not hide the box."""
    from scipy import ndimage
    cache = {}
    for r in rows:
        p = int(r['page'])
        if p not in cache:
            cache = {p: np.asarray(Image.open(f"{CACHE}/screens/{run_id}/pages/p{p:04d}.png").convert('L'))}
        im = cache[p]; x, y = int(r['x']), int(r['y'])
        bb = [int(v) for v in r['bbox'].split(',')]
        if bb[0] < 0: r['frame_score'] = 0.0; r['bbox_w'] = r['bbox_h'] = 0; r['interior_ink'] = 0.0; continue
        crop = im[y:y + geom['ch'], x:x + geom['cw']]
        mask = crop < 160
        if 'Unifont' in (r['fonts_used'] or ''):
            ys, xs = np.where(mask)
            if len(xs) and r.get('combining') == '1':
                # dotted-circle base on the left, glyph/placeholder on the right: keep only the last 48 columns of ink (a placeholder box is <= 48px wide)
                x1 = int(xs.max()); best = None
                for W in (48, 42):                  # placeholder boxes are 42 (4 hex digits) or 48 (5-6 digits) px wide at this size
                    m2 = mask.copy(); m2[:, :max(0, x1 - W + 1)] = False; y2, x2 = np.where(m2)
                    if len(x2) and int(x2.max()) - int(x2.min()) + 1 == W: best = (m2, y2, x2); break
                if best: mask, ys, xs = best
            if len(xs): bb = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
        sub = mask[bb[1]:bb[3] + 1, bb[0]:bb[2] + 1]
        h, w = sub.shape
        r['bbox_w'], r['bbox_h'] = w, h
        if h < 6 or w < 6: r['frame_score'] = 0.0; r['interior_ink'] = 0.0; continue
        ring = np.concatenate([sub[0, :], sub[-1, :], sub[:, 0], sub[:, -1]])
        r['frame_score'] = round(float(ring.mean()), 3)
        r['interior_ink'] = round(float(sub[2:-2, 2:-2].mean()), 3)
        r['ahash_main'] = ''
        if 'Unifont' in (r['fonts_used'] or ''):
            im2 = Image.fromarray((sub * 255).astype('uint8')).resize((8, 8), Image.BILINEAR); a = np.asarray(im2, dtype=np.float32)
            r['ahash_main'] = f"{int(''.join('1' if b else '0' for b in (a < a.mean()).flatten()), 2):016x}"
    return rows

def sentinel_sets(rows):
    hashes, ah = set(), collections.Counter()
    for r in rows:
        if r['item_kind'].startswith('sentinel') and r['item_kind'] != 'sentinel_sequence':
            if int(r['ink_px']) > 0:
                hashes.add(r['pixel_sha1']); ah[r['ahash']] += 1
    return hashes, ah

def placeholder_profile(rows):
    prof = collections.defaultdict(list)
    for r in rows:
        if r['item_kind'].startswith('sentinel') and 'Unifont' in (r['fonts_used'] or '') and r.get('ahash_main') and int(r['ink_px']) > 0:
            prof[(int(r['bbox_w']), int(r['bbox_h']))].append(int(r['ahash_main'], 16))
    return prof
def hamming(a, b): return bin(a ^ b).count('1')
def is_placeholder(r, prof):
    if not r.get('ahash_main'): return False
    k = (int(r['bbox_w']), int(r['bbox_h']))
    return k in prof and min(hamming(int(r['ahash_main'], 16), h) for h in prof[k]) <= 12

def fonts(r):
    out = []
    for part in (r['fonts_used'] or '').split('|'):
        if part:
            fam, ps, n = part.split('#'); out.append((fam, ps, int(n)))
    return out

EMOJI_FONT_NAMES = ('Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Twemoji Mozilla')   # last name added 2026-10-13 for the alternative-font runs; no effect on earlier runs (none uses it)

def classify_codepoints(run_id, cond, rows, cm, aux=()):
    geom = __import__('render_harness').GEOM['cp']
    frame_features(run_id, rows, geom)
    allrows = list(rows) + list(aux)
    sent_hash, sent_ah = sentinel_sets(allrows)
    pp = f"{ROOT}/results/classified/placeholder_profile_{cond}__{run_id.split('__')[2]}.json"
    if any(r['item_kind'].startswith('sentinel') for r in rows):      # this run carries the sentinels: learn the profile and persist it
        prof = placeholder_profile(rows)
        json.dump({f'{k[0]},{k[1]}': v for k, v in prof.items()}, open(pp, 'w'))
    elif os.path.exists(pp):
        prof = {tuple(int(x) for x in k.split(',')): v for k, v in json.load(open(pp)).items()}
    else: prof = {}
    base = {r['item_id']: r for r in allrows if r['item_kind'] == 'control_known'}
    dotted = base.get('U+25CC'); fffd = base.get('U+FFFD')
    base_hash = {dotted['pixel_sha1']} if dotted else set()
    global _CANON, _DM
    if _CANON is None: _CANON = U.canonical_decomposables(); _DM = U.canonical_decomp_map()
    _ud, _udr = U.unicode_data()
    names = {f'U+{c:04X}': v['name'] for c, v in _ud.items()}
    out = []
    for r in rows:
        fl = fonts(r); fams = [f[0] for f in fl]; pss = [f[1] for f in fl]
        cp = int(r['cp_int']) if r.get('cp_int') else None
        r['unicode_name'] = names.get(f'U+{cp:04X}', '') if cp is not None else ''
        ink = int(r['ink_px']); chroma = int(r['chroma_px'])
        fr = float(r.get('frame_score') or 0)
        cmap_ok = None
        if cp is not None and pss:
            cmap_ok = any(cp in cm['ps'].get(p, ()) for p in pss)
        r['cmap_in_used_font'] = '' if cmap_ok is None else int(cmap_ok)
        invisible = r.get('item_kind') == 'codepoint' and (r.get('default_ignorable') == '1' or r.get('general_category') in ('Cc', 'Cf', 'Zs', 'Zl', 'Zp') or ' BLANK' in (r['unicode_name'] or ''))
        uses_emoji_font = any(f in EMOJI_FONT_NAMES for f in fams)
        uni = any('Unifont' in f for f in fams)
        reasons = []
        if r['item_kind'] == 'codepoint' and r.get('combining') == '1':
            blank = ink == 0 or r['pixel_sha1'] in base_hash   # nothing drawn, or nothing beyond the dotted-circle base
        else: blank = ink == 0
        if invisible and (ink == 0 or blank): cls = 'INVISIBLE_OK'
        elif blank: cls = 'BLANK'; reasons.append('no ink' if ink == 0 else 'only the combining base was drawn')
        elif r['pixel_sha1'] in sent_hash and uni: cls = 'LASTRESORT_HEXBOX'; reasons.append('exact pixel match with a sentinel drawn by Unifont (placeholder)')
        elif r['pixel_sha1'] in sent_hash: cls = 'TOFU'; reasons.append('exact pixel match with unassigned-code-point sentinel')
        elif fffd and r['pixel_sha1'] == fffd['pixel_sha1'] and r['item_id'] != 'U+FFFD': cls = 'REPLACEMENT_GLYPH'; reasons.append('matches U+FFFD render')
        elif uni and is_placeholder(r, prof): cls = 'LASTRESORT_HEXBOX'; reasons.append('Unifont cell with the bounding box and shape of its own placeholder boxes (learned from sentinels)')
        elif cmap_ok is False and cp is not None and cp in _CANON and int(r['glyph_count']) >= 2 and all(any(d in cm['ps'].get(p, ()) for p in pss) for d in _DM[cp]):
            cls = 'MONO_GLYPH'; reasons.append('used font has no cmap entry but the character has a canonical decomposition that HarfBuzz drew as its parts (normalization fallback)'); r['decomposition_fallback'] = 1
        elif cmap_ok is False: cls = 'TOFU'; reasons.append('used font has no cmap entry (draws .notdef)')
        elif uses_emoji_font and (chroma > 0 or True): cls = 'COLOR_EMOJI'
        elif chroma > 40: cls = 'COLOR_EMOJI'
        else: cls = 'MONO_GLYPH'
        # shape-only similarity to a sentinel but not an exact hash match => ambiguous
        # a Unifont cell that is not one of Unifont's own placeholder boxes is a real glyph (framed legacy-computing blocks, squared ideographs ...);
        # the frame/ahash resemblance rule applies only to other fonts, where a hollow frame of tofu shape with different pixels stays UNKNOWN
        if cls in ('MONO_GLYPH',) and not uni and r['ahash'] in sent_ah and r['item_kind'] == 'codepoint' and fr >= 0.85:
            cls = 'UNKNOWN'; reasons.append('hollow-frame shape equal to a tofu fingerprint but pixels differ')
        if cls == 'MONO_GLYPH' and ink < 12 and not invisible:
            if r.get('combining') == '1': reasons.append('very small mark (ink < 12px) drawn by a font that maps it')
            else: cls = 'UNKNOWN'; reasons.append('almost no ink')
        # intended presentation: Emoji_Presentation=Yes characters are meant to appear as colour emoji
        want_emoji = r.get('emoji_presentation') == '1' or r.get('emoji_presentation_default') == '1' and r.get('item_kind') == 'VS_none' or r.get('item_kind') == 'VS16_emoji'
        want_text = r.get('item_kind') == 'VS15_text'
        if cls == 'MONO_GLYPH' and want_emoji: cls = 'TEXT_FALLBACK'; reasons.append('emoji presentation intended, monochrome glyph drawn')
        r['render_class'] = cls; r['class_reason'] = '; '.join(reasons)
        r['as_intended'] = '' if cls in ('UNKNOWN', 'INVISIBLE_OK') else int(cls in ('MONO_GLYPH', 'COLOR_EMOJI') and not (want_text and cls == 'COLOR_EMOJI' and False))
        r['primary_font_used'] = fams[0] if fams else ''
        r['fallback_lastresort'] = int(uni)
        out.append(r)
    return out

def classify_sequences(run_id, cond, rows, comp_class, cm=None):
    """comp_class: {cp -> render_class of that component rendered alone in the same condition}"""
    sent = [r for r in rows if r['item_kind'] == 'sentinel_sequence']
    sent_hash = {r['pixel_sha1'] for r in sent}
    EMO_W = 60.0
    out = []
    for r in rows:
        if r['item_kind'] == 'sentinel_sequence':
            r['render_class'] = 'SENTINEL'; r['class_reason'] = ''; out.append(r); continue
        seq = [int(h, 16) for h in r['item_id'][4:].split()]
        comps = [c for c in seq if c not in (0x200D, 0xFE0F, 0xFE0E) and not (0xE0020 <= c <= 0xE007F)]
        cc = [comp_class.get(c, 'UNKNOWN') for c in comps]
        fl = fonts(r); fams = [f[0] for f in fl]
        # in-sequence coverage: does any font Chromium used FOR THIS SEQUENCE map the component? (font-run coherence: one missing component can
        # push the whole cluster into a font that has none of the others, turning every component into tofu even though each renders alone)
        pss = [f[1] for f in fl]
        cov = [any(c in cm['ps'].get(p, ()) for p in pss) for c in comps] if cm else [True] * len(comps)
        BADC = ('TOFU', 'BLANK', 'LASTRESORT_HEXBOX', 'REPLACEMENT_GLYPH')
        eff_bad = [ (cc[i] in BADC) or (not cov[i]) for i in range(len(comps)) ]
        bad = [c for c, b in zip(cc, eff_bad) if b]
        gc = int(r['glyph_count']); w = float(r['adv_width']); ink = int(r['ink_px'])
        uses_emoji = any(f in EMOJI_FONT_NAMES for f in fams)
        reasons = []
        if gc == 1 and w <= EMO_W * 1.35 and ink > 0 and r['pixel_sha1'] not in sent_hash:
            if uses_emoji: cls = 'FULL'
            elif len(comps) == 1 and bad: cls = 'MISSING'; reasons.append('single component unsupported')
            elif len(comps) == 1: cls = 'TEXT_FALLBACK'; reasons.append('one monochrome glyph from a non-emoji font where a colour emoji is intended')
            else: cls = 'UNKNOWN'; reasons.append('multi-component sequence collapsed to one glyph from a non-emoji font')
        elif r['pixel_sha1'] in sent_hash: cls = 'MISSING'; reasons.append('pixel-identical to the render of a non-existent sequence (the font substitutes one generic glyph, e.g. a placeholder flag)')
        elif ink == 0: cls = 'MISSING'; reasons.append('no ink')
        elif len(bad) == len(cc) and cc: cls = 'MISSING'; reasons.append('no component is drawn from a font that maps it (tofu or placeholder for all)')
        elif bad: cls = 'PARTIAL'; reasons.append(f'{len(bad)} of {len(cc)} components unsupported in this sequence (tofu/placeholder alone or not mapped by the font used)')
        elif gc >= 2 or w > EMO_W * 1.35: cls = 'DECOMPOSED'; reasons.append(f'glyph_count={gc}, advance={w}px; components render separately')
        else: cls = 'UNKNOWN'; reasons.append(f'gc={gc} w={w}')
        r['render_class'] = cls; r['class_reason'] = '; '.join(reasons); out.append(r); out.append
    return [o for o in out]

def write(run_id, rows):
    p = f'{ROOT}/results/classified/{run_id}.csv.gz'; os.makedirs(os.path.dirname(p), exist_ok=True)
    cols = []
    for o in rows:
        for k in o:
            if k not in cols: cols.append(k)
    with gzip.open(p, 'wt', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(rows)
    return p

def comp_classes(cond, chrome_tag, src='components'):
    p = f'{ROOT}/results/classified/{cond}__{src}__{chrome_tag}.csv.gz'
    d = {}
    with gzip.open(p, 'rt', encoding='utf-8', newline='') as f:
        for r in csv.DictReader(f):
            if r.get('cp_int') and r['item_kind'] in ('codepoint', 'component'): d[int(r['cp_int'])] = r['render_class']
    return d

if __name__ == '__main__':
    for run_id in sys.argv[1:]:
        cond, kind, chrome_tag = run_id.split('__')[:3]
        rows = read_raw(run_id)
        if kind in ('codepoints', 'components', 'emojicp', 'vs', 'utgcp'):
            cm = cmap_index.load(split(cond)[0])
            if kind == 'vs':
                for r in rows: r.setdefault('combining', '0'); r.setdefault('item_kind', r['item_kind'])
            aux = []
            if kind in ('vs', 'emojicp'):
                aux = [r for r in read_raw(f"{'A_minimal' if cond.startswith('R_') else split(cond)[0]}__codepoints__{chrome_tag}") if r['item_kind'].startswith('sentinel') or r['item_kind'] == 'control_known']
            res = classify_codepoints(run_id, cond, rows, cm, aux)
        else:
            res = classify_sequences(run_id, cond, rows, comp_classes(cond, chrome_tag, 'utgcp' if kind == 'utgseq' else 'components'), cmap_index.load(split(cond)[0]))
        print(write(run_id, res), collections.Counter(r['render_class'] for r in res).most_common())
