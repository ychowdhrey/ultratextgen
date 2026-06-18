#!/usr/bin/env python3
"""Generate the UltraTextGen Spanish Pinterest board images (1000x1500).

Brand palette pulled from style.css:
  off-white #F8F9FB · navy #1a1a2e · purple #8b5cf6 · indigo #6366f1 · green #10b981
Fancy style samples are rendered with real display fonts as a high-fidelity
visual proxy for the tool's Unicode output (keeps glyphs crisp on mobile).
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
OUT = os.path.join(HERE, "images")
os.makedirs(OUT, exist_ok=True)

W, H = 1000, 1500

# ---- colors ----
WHITE = (255, 255, 255)
OFFW  = (248, 249, 251)
NAVY  = (26, 26, 46)
SLATE = (100, 116, 139)
MUTE  = (148, 163, 184)
GREEN = (16, 185, 129)
CHIP  = (241, 243, 248)

AC = {
    "purple": (139, 92, 246), "indigo": (99, 102, 241), "blue": (59, 130, 246),
    "pink": (236, 72, 153), "teal": (20, 184, 166), "amber": (245, 158, 11),
    "rose": (244, 63, 94), "violet": (124, 58, 237),
}

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

FF = {
    "bold":   "Poppins-Bold.ttf",
    "semi":   "Poppins-SemiBold.ttf",
    "med":    "Poppins-Medium.ttf",
    "reg":    "Poppins-Regular.ttf",
    "great":  "GreatVibes-Regular.ttf",
    "dancing":"DancingScript.ttf",
    "pacifico":"Pacifico-Regular.ttf",
    "lobster":"Lobster-Regular.ttf",
    "baloo":  "Baloo2.ttf",
    "pirata": "PirataOne.ttf",
}

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def tint(accent, t=0.10):
    return lerp(WHITE, accent, t)

# ---------- drawing helpers ----------
def gradient_bg(accent):
    top = WHITE
    bot = tint(accent, 0.16)
    img = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(top, bot, y / H))
    return img.convert("RGBA")

def soft_blob(base, cx, cy, r, color, alpha):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(60))
    base.alpha_composite(layer)

def sparkle(d, cx, cy, s, color):
    # 4-point sparkle drawn as two crossed kites
    d.polygon([(cx, cy - s), (cx + s * 0.28, cy), (cx, cy + s),
               (cx - s * 0.28, cy)], fill=color)
    d.polygon([(cx - s, cy), (cx, cy + s * 0.28), (cx + s, cy),
               (cx, cy - s * 0.28)], fill=color)

def text_w(d, txt, fnt, ls=0):
    if ls == 0:
        return d.textlength(txt, font=fnt)
    return sum(d.textlength(c, font=fnt) + ls for c in txt) - ls

def draw_centered(d, cy, txt, fnt, fill, ls=0):
    tw = text_w(d, txt, fnt, ls)
    x = (W - tw) / 2
    if ls == 0:
        d.text((x, cy), txt, font=fnt, fill=fill)
    else:
        for c in txt:
            d.text((x, cy), c, font=fnt, fill=fill)
            x += d.textlength(c, font=fnt) + ls

def fit_font(d, txt, key, start, maxw, minsize=40):
    size = start
    while size > minsize:
        f = font(FF[key], size)
        if text_w(d, txt, f) <= maxw:
            return f
        size -= 2
    return font(FF[key], minsize)

def pill(base, cx, cy, txt, fnt, fill, textcol, padx=34, pady=18, ls=0):
    d = ImageDraw.Draw(base)
    tw = text_w(d, txt, fnt, ls)
    ascent, descent = fnt.getmetrics()
    th = ascent + descent
    w = tw + padx * 2
    h = th + pady * 2
    x0, y0 = cx - w / 2, cy - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=h / 2, fill=fill)
    tx = cx - tw / 2
    ty = y0 + pady - descent * 0.2
    if ls == 0:
        d.text((tx, ty), txt, font=fnt, fill=textcol)
    else:
        for c in txt:
            d.text((tx, ty), c, font=fnt, fill=textcol)
            tx += d.textlength(c, font=fnt) + ls
    return h

def card(base, x, y, w, h, radius=40, fill=WHITE):
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([x, y + 14, x + w, y + h + 14], radius=radius,
                         fill=(30, 30, 60, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    base.alpha_composite(shadow)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill + (255,))

# ---------- pin renderer ----------
def render(p):
    accent = AC[p["accent"]]
    img = gradient_bg(accent)
    soft_blob(img, 120, 180, 230, accent, 38)
    soft_blob(img, 900, 1320, 280, accent, 30)
    d = ImageDraw.Draw(img)

    # corner sparkles
    sparkle(d, 905, 150, 26, accent + (255,))
    sparkle(d, 855, 215, 15, accent + (180,))
    sparkle(d, 120, 1360, 22, accent + (220,))

    # brand pill (top)
    pill(img, W / 2, 120, "U L T R A T E X T G E N . C O M",
         font(FF["semi"], 26), tint(accent, 0.16), accent, padx=30, pady=14)

    # category chip
    pill(img, W / 2, 210, p["cat"], font(FF["bold"], 28),
         accent, WHITE, padx=30, pady=14, ls=2)

    # headline
    lines = p["headline"].split("\n")
    hf = font(FF["bold"], 78)
    # auto-shrink if any line too wide
    while max(text_w(d, ln, hf) for ln in lines) > W - 150 and hf.size > 46:
        hf = font(FF["bold"], hf.size - 2)
    lh = int(hf.size * 1.16)
    block_h = lh * len(lines)
    y = 300 + (300 - block_h) / 2
    for ln in lines:
        draw_centered(d, y, ln, hf, NAVY)
        y += lh

    # transformation card
    cx0, cy0, cw, ch = 110, 640, W - 220, 560
    card(img, cx0, cy0, cw, ch)
    d = ImageDraw.Draw(img)
    cmid = W / 2

    if p.get("multi"):
        draw_centered(d, cy0 + 46, "un texto · muchos estilos",
                      font(FF["med"], 30), SLATE)
        yy = cy0 + 130
        for word, fk in p["multi"]:
            sf = fit_font(d, word, fk, 92, cw - 140)
            draw_centered(d, yy, word, sf, accent)
            yy += 108
    else:
        # input
        draw_centered(d, cy0 + 50, "escribes", font(FF["med"], 30), MUTE)
        infnt = font(FF["semi"], 60)
        iw = text_w(d, p["in"], infnt)
        d.rounded_rectangle([cmid - iw / 2 - 40, cy0 + 100,
                             cmid + iw / 2 + 40, cy0 + 100 + 96],
                            radius=28, fill=CHIP)
        draw_centered(d, cy0 + 116, p["in"], infnt, NAVY)

        # arrow
        ay = cy0 + 250
        d.line([(cmid, ay), (cmid, ay + 70)], fill=accent, width=10)
        d.polygon([(cmid - 26, ay + 58), (cmid + 26, ay + 58),
                   (cmid, ay + 94)], fill=accent)

        # output
        draw_centered(d, cy0 + 366, "obtienes", font(FF["med"], 30), MUTE)
        out = p["out"]
        of = fit_font(d, out, p["font"], 150, cw - 130)
        outy = cy0 + 410
        ow = text_w(d, out, of)
        ascent, _ = of.getmetrics()
        if p.get("sparkles"):
            draw_centered(d, outy, out, of, accent)
            sparkle(d, cmid - ow / 2 - 45, outy + ascent * 0.45, 26, accent + (255,))
            sparkle(d, cmid + ow / 2 + 45, outy + ascent * 0.45, 26, accent + (255,))
        else:
            draw_centered(d, outy, out, of, accent)
        if p.get("strike"):
            midy = outy + ascent * 0.52
            d.line([(cmid - ow / 2, midy), (cmid + ow / 2, midy)],
                   fill=accent, width=9)
            d.line([(cmid - ow / 2, outy + ascent * 1.02),
                    (cmid + ow / 2, outy + ascent * 1.02)], fill=accent, width=9)

    # CTA pill with drawn arrow
    cta_txt = "Copia y pega gratis"
    cf = font(FF["semi"], 42)
    tw = d.textlength(cta_txt, font=cf)
    arrow_w, gap = 46, 26
    asc, desc = cf.getmetrics()
    th = asc + desc
    cw2 = tw + gap + arrow_w
    padx, pady = 56, 26
    pw, ph = cw2 + padx * 2, th + pady * 2
    px0, py0 = W / 2 - pw / 2, 1320 - ph / 2
    d.rounded_rectangle([px0, py0, px0 + pw, py0 + ph], radius=ph / 2, fill=GREEN)
    tx = px0 + padx
    d.text((tx, py0 + pady - desc * 0.2), cta_txt, font=cf, fill=WHITE)
    ax = tx + tw + gap
    amid = 1320
    d.line([(ax, amid), (ax + arrow_w - 12, amid)], fill=WHITE, width=8)
    d.polygon([(ax + arrow_w - 20, amid - 15), (ax + arrow_w, amid),
               (ax + arrow_w - 20, amid + 15)], fill=WHITE)

    # footer
    draw_centered(d, 1410, "gratis  ·  sin apps  ·  sin registro",
                  font(FF["med"], 28), MUTE)

    path = os.path.join(OUT, f"{p['n']:02d}-{p['file']}.png")
    img.convert("RGB").save(path, "PNG")
    return path


PINS = [
 dict(n=1, file="copiar-pegar", cat="COPIAR Y PEGAR", accent="purple",
      headline="Cómo copiar y pegar\nletras bonitas\nen 3 segundos",
      **{"in": "Sofia"}, out="Sofia", font="great"),
 dict(n=2, file="conversor", cat="CONVERSOR", accent="indigo",
      headline="Convierte tu texto\nen letras bonitas\nal instante",
      **{"in": "Sofia"}, out="Sofia", font="dancing"),
 dict(n=3, file="tipos-de-letras", cat="TIPOS DE LETRAS", accent="violet",
      headline="Todos los tipos de\nletras bonitas\nen un solo lugar",
      multi=[("Cursiva", "great"), ("Gótica", "pirata"),
             ("Burbuja", "baloo"), ("Negrita", "bold")]),
 dict(n=4, file="instagram", cat="INSTAGRAM", accent="pink",
      headline="Letras bonitas para\ntu bio de Instagram",
      **{"in": "tu bio"}, out="tu bio", font="pacifico"),
 dict(n=5, file="cursiva", cat="CURSIVA", accent="blue",
      headline="Cómo escribir en\ncursiva bonita",
      **{"in": "Hola"}, out="Hola", font="great"),
 dict(n=6, file="nombres", cat="NOMBRES", accent="rose",
      headline="Tu nombre en\nletras bonitas",
      **{"in": "Camila"}, out="Camila", font="dancing"),
 dict(n=7, file="fuentes", cat="FUENTES", accent="teal",
      headline="Fuentes bonitas que\nSÍ funcionan en redes",
      **{"in": "Estilo"}, out="Estilo", font="lobster"),
 dict(n=8, file="titulos", cat="TÍTULOS", accent="amber",
      headline="Títulos bonitos para\ntus posts y apuntes",
      **{"in": "Mi Titulo"}, out="Mi Titulo", font="lobster"),
 dict(n=9, file="whatsapp", cat="WHATSAPP", accent="teal",
      headline="Letras bonitas para\nestados de WhatsApp",
      **{"in": "Hola"}, out="Hola", font="pacifico"),
 dict(n=10, file="simbolos", cat="SÍMBOLOS", accent="purple",
      headline="Letras + símbolos\npara copiar y pegar",
      **{"in": "Sofia"}, out="Sofia", font="great", sparkles=True),
 dict(n=11, file="free-fire", cat="FREE FIRE", accent="indigo",
      headline="Nicks bonitos\npara Free Fire",
      **{"in": "Player"}, out="Player", font="pirata"),
 dict(n=12, file="facebook", cat="FACEBOOK", accent="blue",
      headline="Letras bonitas\npara Facebook",
      **{"in": "Hola"}, out="Hola", font="baloo"),
 dict(n=13, file="aesthetic", cat="AESTHETIC", accent="violet",
      headline="Letras aesthetic\npara copiar y pegar",
      **{"in": "vibes"}, out="vibes", font="great", sparkles=True),
 dict(n=14, file="mayusculas", cat="MAYÚSCULAS", accent="rose",
      headline="Letras MAYÚSCULAS\nbonitas para títulos",
      **{"in": "TITULO"}, out="TITULO", font="bold"),
 dict(n=15, file="goticas", cat="GÓTICAS", accent="indigo",
      headline="Letras góticas\npara copiar y pegar",
      **{"in": "Oscuro"}, out="Oscuro", font="pirata"),
 dict(n=16, file="abecedario", cat="ABECEDARIO", accent="pink",
      headline="El abecedario en\nletras bonitas",
      **{"in": "A B C D"}, out="A B C D", font="great"),
 dict(n=17, file="word", cat="WORD", accent="blue",
      headline="Títulos bonitos\nen Word",
      **{"in": "Titulo"}, out="Titulo", font="lobster"),
 dict(n=18, file="sin-dibujar", cat="PASO A PASO", accent="teal",
      headline="Cómo hacer letras\nbonitas sin dibujar",
      **{"in": "Hola"}, out="Hola", font="dancing"),
 dict(n=19, file="tiktok-x", cat="TIKTOK & X", accent="violet",
      headline="Nicks bonitos para\nTikTok y X",
      **{"in": "usuario"}, out="usuario", font="baloo"),
 dict(n=20, file="tachado", cat="TACHADO", accent="amber",
      headline="Letras tachadas\ny subrayadas",
      **{"in": "texto"}, out="texto", font="bold", strike=True),
]

if __name__ == "__main__":
    for p in PINS:
        print(render(p))
    print(f"\n{len(PINS)} pins -> {OUT}")
