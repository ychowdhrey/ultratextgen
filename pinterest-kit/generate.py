#!/usr/bin/env python3
"""Generate the Spanish how-to Pinterest pins ON-BRAND.

Instead of a bespoke template, this renders every pin through the repo's
existing brand pin system (scripts/generate-pinterest.py -> pin_svg) using the
shared motifs and design tokens from scripts/generate-site-art.py. The result
is visually identical in style to the 332 pins already in assets/pinterest/
(soft off-white panel, faint dot grid, purple->blue gradient, left accent bar,
keyword title + underline, focal motif card, UltraTextGen.com wordmark) — just
with Spanish keyword titles, all pointing at /es/.

Run:  python3 pinterest-kit/generate.py
Requires: cairosvg  (libcairo + Liberation Sans are already on the box)
"""
import functools
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "images")
os.makedirs(OUT, exist_ok=True)


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(ROOT, "scripts", "generate-site-art.py"), "siteart")
PIN = _load(os.path.join(ROOT, "scripts", "generate-pinterest.py"), "pinterest")

KICKER = "ULTRATEXTGEN · GENERADOR"
SERIF, SANS = ART.SERIF, ART.SANS


def typo(sample, **kw):
    """m_typo specimen with a sensible size for the sample length."""
    kw.setdefault("size", 120 if len(sample) <= 3 else 96 if len(sample) <= 6 else 76)
    return functools.partial(ART.m_typo, sample=sample, **kw)


def transform(a="Aa", b="✦"):
    return functools.partial(ART.m_transform, a=a, b=b)


# n, slug, title (keyword-led), subtitle (benefit), motif
PINS = [
 (1, "copiar-pegar", "Letras Bonitas para Copiar y Pegar",
  "Escribe, copia y pega — gratis y sin apps", transform("Aa", "✦")),
 (2, "conversor", "Conversor de Letras Bonitas",
  "Convierte tu texto en decenas de estilos", transform("abc", "✦")),
 (3, "tipos-de-letras", "Tipos de Letras Bonitas",
  "Cursiva, gótica, burbuja, negrita y más", ART.m_grid),
 (4, "instagram", "Letras Bonitas para Instagram",
  "Decora tu bio, nombre y stories", ART.m_profile),
 (5, "cursiva", "Letra Cursiva Bonita",
  "Cursiva elegante para copiar y pegar", typo("Hola", ff=SERIF, style="italic")),
 (6, "nombres", "Tu Nombre en Letras Bonitas",
  "Para perfiles, nicks y estados", typo("Camila", ff=SERIF, style="italic")),
 (7, "fuentes", "Fuentes de Letras Bonitas",
  "Funcionan en cualquier red social", ART.m_grid),
 (8, "titulos", "Letras para Títulos Bonitos",
  "Encabezados con estilo para tus posts", ART.m_headline),
 (9, "whatsapp", "Letras Bonitas para WhatsApp",
  "Estados, nombre y mensajes con estilo", ART.m_chat),
 (10, "simbolos", "Letras y Símbolos Bonitos",
  "Adornos y símbolos para decorar tu texto", ART.m_divider),
 (11, "free-fire", "Nicks Bonitos para Free Fire",
  "Crea tu nombre de jugador con símbolos", ART.m_trophy),
 (12, "facebook", "Letras Bonitas para Facebook",
  "Destaca en posts y comentarios", ART.m_chat),
 (13, "aesthetic", "Letras Aesthetic para Copiar",
  "Estilo suave con símbolos bonitos", ART.m_divider),
 (14, "mayusculas", "Letras Mayúsculas Bonitas",
  "Mayúsculas con estilo para títulos", typo("ABC", weight="700")),
 (15, "goticas", "Letras Góticas para Copiar",
  "Estilo oscuro y elegante", ART.m_rune),
 (16, "abecedario", "Abecedario en Letras Bonitas",
  "De la A a la Z, listo para copiar", ART.m_grid),
 (17, "word", "Títulos Bonitos en Word",
  "Genera y pega títulos en tus documentos", ART.m_doc),
 (18, "sin-dibujar", "Cómo Hacer Letras Bonitas",
  "Sin dibujar: escribe, elige y copia", ART.m_brand),
 (19, "tiktok-x", "Nicks Bonitos para TikTok y X",
  "Personaliza tu nombre de usuario", ART.m_at),
 (20, "tachado", "Letras Tachadas y Subrayadas",
  "Resalta precios, listas y frases", typo("texto", deco="line-through")),
 # ---- long-tail: seasonal, phrases & names ----
 (21, "feliz-cumpleanos", "Feliz Cumpleaños en Letras Bonitas",
  "Felicita con estilo en redes y tarjetas", ART.m_divider),
 (22, "feliz-cumple-amor", "Feliz Cumpleaños Mi Amor",
  "Una felicitación con estilo para tu pareja", ART.m_bow),
 (23, "feliz-navidad", "Feliz Navidad en Letras Bonitas",
  "Decora tus mensajes navideños", ART.m_divider),
 (24, "ano-nuevo", "Feliz Año Nuevo en Letras Bonitas",
  "Recibe el año con estilo", ART.m_divider),
 (25, "te-amo", "Te Amo en Letras Bonitas",
  "Dile lo que sientes con estilo", ART.m_bow),
 (26, "frases-bonitas", "Frases con Letras Bonitas",
  "Para tu bio, estados y publicaciones", ART.m_chat),
 (27, "nombre-angel", "Nombre Ángel en Letras Bonitas",
  "Tu nombre listo para copiar y pegar", typo("Ángel", ff=SERIF, style="italic")),
 (28, "nombre-dulce", "Nombre Dulce en Letras Bonitas",
  "Tu nombre listo para copiar y pegar", typo("Dulce", ff=SERIF, style="italic")),
 (29, "nombres-populares", "Tu Nombre Favorito en Letras Bonitas",
  "Cualquier nombre en decenas de estilos", ART.m_grid),
 (30, "letras-decoradas", "Letras Decoradas con Corazones",
  "Corazones, flores y símbolos para tu texto", ART.m_divider),
]


def main():
    import cairosvg
    for n, slug, title, sub, motif in PINS:
        svg = PIN.pin_svg(slug, title, sub, motif, KICKER)
        out = os.path.join(OUT, f"{n:02d}-{slug}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=out,
                         output_width=PIN.PIN_W, output_height=PIN.PIN_H)
        print(out)
    print(f"\n{len(PINS)} on-brand pins -> {OUT}")


if __name__ == "__main__":
    main()
