#!/usr/bin/env python3
"""
Generates the Spanish "cómo usar / how-to" Pinterest pin board for UltraTextGen
— every pin drives to https://ultratextgen.com/es/.

Mirrors scripts/generate-id-pins.py (same dedicated, single-destination,
single-language pattern), just for Spanish. The hero of each pin is the *literal*
styled Unicode — what "letras bonitas" searchers actually want to see — laid onto
the shared 1000x1500 brand pin (soft panel, dot grid, purple->blue spine,
wordmark) imported from generate-site-art.py.

Topics + priority come from the Semrush MX "letras bonitas" export and the /es/
Search Console data: copiar y pegar (49.5K), conversor (27.1K), tipos (8.1K),
Instagram, cursiva, WhatsApp, Free Fire, símbolos, nombres, plus long-tail
seasonal/phrase/name pins.

Outputs:
  - assets/pinterest/es/<slug>.png       1000x1500 vertical pins
  - data/es_pinterest_pins.csv           inventory (title/desc/kw/alt/url)
  - data/es_pinterest_pins_upload.csv     Pinterest-importer CSV (via pipeline)

Run:  python3 scripts/generate-es-pins.py
Requires: cairosvg, plus a font covering the Mathematical Alphanumeric block
          (Symbola) — apt: fonts-symbola fonts-noto-core fonts-noto-extra.
"""
import csv
import importlib.util
import os
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", "es")
CSV_OUT = os.path.join(ROOT, "data", "es_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

DEST = "https://ultratextgen.com/es/"
PIN_W, PIN_H = 1000, 1500


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# Reuse the brand skin + the ID generator's style machinery (Unicode style maps,
# st(), wrap(), smallcaps(), the AES font stack and fit_size) — single source of
# truth, no duplicated Mathematical-Alphanumeric tables.
ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
IDG = _load(os.path.join(HERE, "generate-id-pins.py"), "idpins")
PURPLE, BLUE, INK, SUB = ART.PURPLE, ART.BLUE, ART.INK, ART.SUB
PANEL, SANS = ART.PANEL, ART.SANS
defs, esc = ART.defs, ART.esc
st, wrap, smallcaps, AES, fit_size = IDG.st, IDG.wrap, IDG.smallcaps, IDG.AES, IDG.fit_size


# combining-mark styles the math-alphanumeric block can't express
def strike(t):
    return "".join(c + "̶" for c in t)


def under(t):
    return "".join(c + "̲" for c in t)


# ============================================================ pin definitions
PINS = [
    dict(slug="copiar-pegar", kicker="ULTRATEXTGEN · CÓMO USAR",
         headline="Letras Bonitas para Copiar y Pegar",
         benefit="Escribe tu texto y cópialo en decenas de estilos.",
         rows=[("normal", "bonito"), ("Cursiva", st("Script", "bonito")),
               ("Negrita", st("Bold", "bonito")), ("Doble", st("Double-struck", "bonito"))],
         title="Letras Bonitas para Copiar y Pegar — Gratis",
         kw=["letras bonitas para copiar y pegar", "letras bonitas",
             "letras para copiar", "fuentes bonitas", "copiar y pegar"]),
    dict(slug="conversor", kicker="ULTRATEXTGEN · CONVERSOR",
         headline="Conversor de Letras Bonitas",
         benefit="Convierte tu texto al instante en muchos estilos.",
         rows=[("normal", "texto"), ("Cursiva", st("Script", "texto")),
               ("Negrita", st("Bold", "texto")), ("Mono", st("Monospace", "texto"))],
         title="Conversor de Letras Bonitas — Copiar y Pegar",
         kw=["conversor de letras bonitas", "convertidor de letras",
             "generador de letras", "letras bonitas", "copiar y pegar"]),
    dict(slug="tipos-de-letras", kicker="ULTRATEXTGEN · TIPOS",
         headline="Tipos de Letras Bonitas",
         benefit="Cursiva, gótica, doble y muchas más en un solo lugar.",
         rows=[("Cursiva", st("Script", "estilo")), ("Gótica", st("Fraktur", "estilo")),
               ("Doble", st("Double-struck", "estilo")), ("Versalitas", smallcaps("estilo"))],
         title="Tipos de Letras Bonitas — Estilos para Copiar",
         kw=["tipos de letras bonitas", "estilos de letra", "fuentes bonitas",
             "letras bonitas", "tipos de letra"]),
    dict(slug="instagram", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Letras Bonitas para Instagram",
         benefit="Decora tu bio, nombre y stories de Instagram.",
         rows=[("Cursiva", wrap("✶", st("Script", "self love"))),
               ("Itálica", wrap("⊹", st("Italic", "buenas vibras"))),
               ("Versalitas", wrap("˚✧", smallcaps("se feliz"), "✧˚"))],
         title="Letras Bonitas para Instagram — Bio Copy Paste",
         kw=["letras bonitas para instagram", "bio de instagram aesthetic",
             "letras para instagram", "fuentes para instagram", "aesthetic"]),
    dict(slug="cursiva", kicker="ULTRATEXTGEN · CURSIVA",
         headline="Cómo Escribir en Cursiva Bonita",
         benefit="Cursiva elegante para copiar y pegar.",
         rows=[("Cursiva", st("Script", "hola")),
               ("Cursiva Negrita", st("Bold Script", "hola")),
               ("Itálica", st("Italic", "hola"))],
         title="Letra Cursiva Bonita — Copiar y Pegar",
         kw=["letra cursiva bonita", "cursiva para copiar", "letras cursivas",
             "letras bonitas", "caligrafia"]),
    dict(slug="nombres", kicker="ULTRATEXTGEN · NOMBRES",
         headline="Tu Nombre en Letras Bonitas",
         benefit="Convierte tu nombre para perfiles, nicks y estados.",
         rows=[("Cursiva", st("Script", "Camila")), ("Negrita", st("Bold", "Camila")),
               ("Gótica", st("Fraktur", "Camila")), ("Doble", st("Double-struck", "Camila"))],
         title="Tu Nombre en Letras Bonitas — Copiar y Pegar",
         kw=["nombres en letras bonitas", "tu nombre en letras bonitas",
             "nombres bonitos", "letras bonitas", "nombre en letras"]),
    dict(slug="fuentes", kicker="ULTRATEXTGEN · FUENTES",
         headline="Fuentes de Letras Bonitas",
         benefit="Fuentes que funcionan en cualquier red social.",
         rows=[("Negrita", st("Bold", "estilo")), ("Cursiva", st("Script", "estilo")),
               ("Gótica", st("Fraktur", "estilo")), ("Mono", st("Monospace", "estilo"))],
         title="Fuentes de Letras Bonitas — Copiar y Pegar",
         kw=["fuentes de letras bonitas", "fuentes bonitas", "fonts",
             "tipografias", "letras bonitas"]),
    dict(slug="titulos", kicker="ULTRATEXTGEN · TÍTULOS",
         headline="Letras para Títulos Bonitos",
         benefit="Encabezados con estilo para tus posts y apuntes.",
         rows=[("Negrita", st("Bold", "TITULO")), ("Versalitas", smallcaps("titulo")),
               ("Doble", st("Double-struck", "TITULO"))],
         title="Letras para Títulos Bonitos — Copiar y Pegar",
         kw=["letras para titulos bonitos", "titulos bonitos", "letras para titulos",
             "apuntes bonitos", "letras bonitas"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Letras Bonitas para WhatsApp",
         benefit="Estados, nombre y mensajes de WhatsApp con estilo.",
         rows=[("Cursiva", st("Script", "buenas vibras")),
               ("Negrita Itálica", st("Bold Italic", "se feliz")),
               ("Mono", st("Monospace", "en linea"))],
         title="Letras Bonitas para WhatsApp — Copiar y Pegar",
         kw=["letras bonitas para whatsapp", "estados de whatsapp",
             "letras para whatsapp", "letras bonitas", "copiar y pegar"]),
    dict(slug="simbolos", kicker="ULTRATEXTGEN · SÍMBOLOS",
         headline="Letras y Símbolos Bonitos",
         benefit="Adornos y símbolos para decorar tu texto en un clic.",
         rows=[("Corazones y estrellas", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Flores y adornos", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Separadores", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Letras y Símbolos Bonitos — Copiar y Pegar",
         kw=["letras bonitas y simbolos", "simbolos para copiar", "simbolos bonitos",
             "decoracion de texto", "letras bonitas"]),
    dict(slug="free-fire", kicker="ULTRATEXTGEN · GAME",
         headline="Nicks Bonitos para Free Fire",
         benefit="Crea tu nombre de jugador anti-mainstream.",
         rows=[("Mono", wrap("≪", st("Monospace", "RAJA"), "≫")),
               ("Versalitas", wrap("★", smallcaps("salvaje"))),
               ("Doble", wrap("⊱", st("Double-struck", "Cazador"), "⊰"))],
         title="Nicks Bonitos para Free Fire — Copiar y Pegar",
         kw=["letras bonitas para free fire", "nick free fire", "letras para free fire",
             "nicks para free fire", "simbolos"]),
    dict(slug="facebook", kicker="ULTRATEXTGEN · FACEBOOK",
         headline="Letras Bonitas para Facebook",
         benefit="Destaca en tus publicaciones y comentarios.",
         rows=[("Negrita", st("Bold", "hola")), ("Cursiva", st("Script", "hola")),
               ("Doble", st("Double-struck", "hola"))],
         title="Letras Bonitas para Facebook — Copiar y Pegar",
         kw=["letras bonitas para facebook", "letras para facebook", "letras bonitas",
             "copiar y pegar", "redes sociales"]),
    dict(slug="aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Letras Aesthetic para Copiar",
         benefit="Estilo suave con símbolos bonitos para tus redes.",
         rows=[("Cursiva", wrap("✶", st("Script", "vibes"))),
               ("Itálica", st("Italic", "soft")),
               ("Versalitas", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Letras Aesthetic para Copiar y Pegar",
         kw=["letras aesthetic", "aesthetic", "letras bonitas aesthetic",
             "aesthetic fonts", "copiar y pegar"]),
    dict(slug="mayusculas", kicker="ULTRATEXTGEN · MAYÚSCULAS",
         headline="Letras Mayúsculas Bonitas",
         benefit="Mayúsculas con estilo para que tus títulos resalten.",
         rows=[("Negrita", st("Bold", "TITULO")), ("Doble", st("Double-struck", "TITULO")),
               ("Gótica", st("Fraktur", "TITULO"))],
         title="Letras Mayúsculas Bonitas — Copiar y Pegar",
         kw=["letras mayusculas bonitas", "mayusculas bonitas", "letras grandes",
             "titulos", "letras bonitas"]),
    dict(slug="goticas", kicker="ULTRATEXTGEN · GÓTICAS",
         headline="Letras Góticas para Copiar",
         benefit="Estilo oscuro y elegante para nicks, bios y posts.",
         rows=[("Gótica", st("Fraktur", "oscuro")), ("Gótica", st("Fraktur", "Reino")),
               ("Doble", st("Double-struck", "noche"))],
         title="Letras Góticas para Copiar y Pegar",
         kw=["letras goticas", "letras goticas para copiar", "gotico",
             "letras bonitas", "dark"]),
    dict(slug="abecedario", kicker="ULTRATEXTGEN · ABECEDARIO",
         headline="Abecedario en Letras Bonitas",
         benefit="Todo el abecedario en muchos estilos, listo para copiar.",
         rows=[("Negrita", st("Bold", "A B C")), ("Cursiva", st("Script", "A B C")),
               ("Gótica", st("Fraktur", "A B C")), ("Círculos", st("Circled", "A B C"))],
         title="Abecedario en Letras Bonitas — A a Z Copiar",
         kw=["abecedario letras bonitas", "abecedario bonito", "abecedario en letras bonitas",
             "letras bonitas", "abecedario"]),
    dict(slug="word", kicker="ULTRATEXTGEN · WORD",
         headline="Títulos Bonitos en Word",
         benefit="Genera la letra bonita y pégala en tus documentos.",
         rows=[("Negrita", st("Bold", "Titulo")), ("Versalitas", smallcaps("titulo")),
               ("Doble", st("Double-struck", "Titulo"))],
         title="Títulos Bonitos en Word — Copiar y Pegar",
         kw=["titulos bonitos en word", "letras bonitas para word", "titulos bonitos",
             "word", "letras bonitas"]),
    dict(slug="como-hacer", kicker="ULTRATEXTGEN · PASO A PASO",
         headline="Cómo Hacer Letras Bonitas",
         benefit="Sin dibujar: escribe, elige el estilo y copia.",
         rows=[("Escribes", "hola"), ("Eliges estilo", st("Script", "hola")),
               ("Copias", st("Bold", "copiado ✓"))],
         title="Cómo Hacer Letras Bonitas — Sin Dibujar",
         kw=["como hacer letras bonitas", "como hacer letras bonitas en el celular",
             "letras bonitas", "tutorial", "copiar y pegar"]),
    dict(slug="tiktok-x", kicker="ULTRATEXTGEN · TIKTOK / X",
         headline="Nicks Bonitos para TikTok y X",
         benefit="Personaliza tu nombre de usuario en TikTok y X.",
         rows=[("Negrita", st("Bold", "usuario")), ("Mono", st("Monospace", "destacado")),
               ("Itálica", st("Italic", "vibe"))],
         title="Nicks Bonitos para TikTok y X — Copiar y Pegar",
         kw=["letras bonitas para tiktok", "nick bonito", "letras para twitter",
             "letras bonitas", "perfil"]),
    dict(slug="tachado-subrayado", kicker="ULTRATEXTGEN · TACHADO",
         headline="Letras Tachadas y Subrayadas",
         benefit="Resalta precios, listas y frases con un clic.",
         rows=[("Tachado", strike("texto")), ("Subrayado", under("texto"))],
         title="Letras Tachadas y Subrayadas — Copiar y Pegar",
         kw=["texto tachado", "letras subrayadas", "texto tachado para copiar",
             "letras bonitas", "copiar y pegar"]),
    # ---- long-tail: seasonal, phrases & names ----
    dict(slug="feliz-cumpleanos", kicker="ULTRATEXTGEN · CUMPLEAÑOS",
         headline="Feliz Cumpleaños en Letras Bonitas",
         benefit="Felicita con estilo en redes, stories y tarjetas.",
         rows=[("Cursiva", st("Script", "Feliz Cumple")),
               ("Negrita", wrap("✶", st("Bold", "Feliz Cumple"))),
               ("Itálica", st("Italic", "felicidades"))],
         title="Feliz Cumpleaños en Letras Bonitas — Copiar",
         kw=["feliz cumpleanos letras bonitas", "feliz cumpleanos", "letras bonitas",
             "felicitaciones", "copiar y pegar"]),
    dict(slug="feliz-cumple-amor", kicker="ULTRATEXTGEN · MI AMOR",
         headline="Feliz Cumpleaños Mi Amor",
         benefit="Una felicitación con estilo para tu pareja.",
         rows=[("Cursiva", wrap("♡", st("Script", "Mi Amor"))),
               ("Negrita", st("Bold", "Feliz Cumple")),
               ("Itálica", st("Italic", "te amo"))],
         title="Feliz Cumpleaños Mi Amor — Letras Bonitas",
         kw=["feliz cumpleanos mi amor letras bonitas", "feliz cumpleanos mi amor",
             "amor", "letras bonitas", "parejas"]),
    dict(slug="feliz-navidad", kicker="ULTRATEXTGEN · NAVIDAD",
         headline="Feliz Navidad en Letras Bonitas",
         benefit="Decora tus mensajes navideños con estilo.",
         rows=[("Cursiva", st("Script", "Feliz Navidad")),
               ("Negrita", wrap("✶", st("Bold", "Navidad"))),
               ("Doble", st("Double-struck", "2026"))],
         title="Feliz Navidad en Letras Bonitas — Copiar",
         kw=["feliz navidad letras bonitas", "feliz navidad", "navidad",
             "letras bonitas", "copiar y pegar"]),
    dict(slug="ano-nuevo", kicker="ULTRATEXTGEN · AÑO NUEVO",
         headline="Feliz Año Nuevo en Letras Bonitas",
         benefit="Recibe el año nuevo con estilo.",
         rows=[("Cursiva", st("Script", "Feliz Ano Nuevo")),
               ("Negrita", wrap("✦", st("Bold", "2027"))),
               ("Versalitas", smallcaps("feliz ano"))],
         title="Feliz Año Nuevo en Letras Bonitas — Copiar",
         kw=["feliz ano nuevo letras bonitas", "feliz ano nuevo", "ano nuevo",
             "letras bonitas", "copiar y pegar"]),
    dict(slug="te-amo", kicker="ULTRATEXTGEN · TE AMO",
         headline="Te Amo en Letras Bonitas",
         benefit="Dile lo que sientes con estilo.",
         rows=[("Cursiva", wrap("♡", st("Script", "Te amo"))),
               ("Negrita Itálica", st("Bold Italic", "te quiero")),
               ("Versalitas", smallcaps("por siempre"))],
         title="Te Amo en Letras Bonitas — Copiar y Pegar",
         kw=["te amo letras bonitas", "te amo", "frases de amor",
             "letras bonitas", "copiar y pegar"]),
    dict(slug="frases-bonitas", kicker="ULTRATEXTGEN · FRASES",
         headline="Frases con Letras Bonitas",
         benefit="Para tu bio, estados y publicaciones.",
         rows=[("Cursiva", st("Script", "sigue brillando")),
               ("Itálica", st("Italic", "buenas vibras")),
               ("Versalitas", smallcaps("se tu mismo"))],
         title="Frases con Letras Bonitas — Copiar y Pegar",
         kw=["frases con letras bonitas", "frases bonitas", "frases para estados",
             "letras bonitas", "copiar y pegar"]),
    dict(slug="nombre-angel", kicker="ULTRATEXTGEN · NOMBRES",
         headline="Nombre Ángel en Letras Bonitas",
         benefit="Tu nombre listo para copiar y pegar.",
         rows=[("Cursiva", st("Script", "Angel")), ("Negrita", st("Bold", "Angel")),
               ("Gótica", st("Fraktur", "Angel")), ("Doble", st("Double-struck", "Angel"))],
         title="Nombre Ángel en Letras Bonitas — Copiar",
         kw=["nombre angel en letras bonitas", "nombre angel", "nombres bonitos",
             "letras bonitas", "nombre en letras"]),
    dict(slug="nombre-dulce", kicker="ULTRATEXTGEN · NOMBRES",
         headline="Nombre Dulce en Letras Bonitas",
         benefit="Tu nombre listo para copiar y pegar.",
         rows=[("Cursiva", st("Script", "Dulce")), ("Negrita", st("Bold", "Dulce")),
               ("Doble", st("Double-struck", "Dulce"))],
         title="Nombre Dulce en Letras Bonitas — Copiar",
         kw=["nombre dulce en letras bonitas", "nombre dulce", "nombres bonitos",
             "letras bonitas", "nombre en letras"]),
    dict(slug="nombres-populares", kicker="ULTRATEXTGEN · NOMBRES",
         headline="Tu Nombre Favorito en Letras Bonitas",
         benefit="Cualquier nombre en decenas de estilos.",
         rows=[("Cursiva", st("Script", "Camila")), ("Negrita", st("Bold", "Mateo")),
               ("Gótica", st("Fraktur", "Sofia")), ("Doble", st("Double-struck", "Jose"))],
         title="Nombres en Letras Bonitas — Copiar y Pegar",
         kw=["nombres en letras bonitas", "nombres bonitos", "nombre en letras",
             "letras bonitas", "copiar y pegar"]),
    dict(slug="letras-decoradas", kicker="ULTRATEXTGEN · DECORADAS",
         headline="Letras Decoradas con Corazones",
         benefit="Corazones, flores y símbolos para tu texto.",
         rows=[("Cursiva", wrap("♡", st("Script", "amor"), "♡")),
               ("Flores", "❀ ✿ ⋆ ☆ ✰ ◇"), ("Corazones", "♡ ♥ ❤ ˚ ✧ ⋆")],
         title="Letras Decoradas con Corazones y Flores",
         kw=["letras decoradas", "letras con corazones", "letras con flores",
             "letras bonitas", "copiar y pegar"]),
]

BOARD = "Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas"


# ============================================================ pin renderer
def pin_svg(pin):
    p = "es" + pin["slug"].replace("-", "")[:8]
    headline = esc(pin["headline"])
    rows = pin["rows"]

    wrapped = textwrap.wrap(headline, width=17)[:3]
    if len(wrapped) <= 1:
        fs, lh = 84, 96
    elif len(wrapped) == 2:
        fs, lh = 78, 90
    else:
        fs, lh = 64, 76
    ty0 = 250
    tspans = "".join(f'<tspan x="80" y="{ty0 + i*lh}">{l}</tspan>'
                     for i, l in enumerate(wrapped))
    title_bottom = ty0 + (len(wrapped) - 1) * lh

    card_x, card_y, card_w, card_h = 80, 470, 840, 740
    n = len(rows)
    pad_top = 70
    slot = (card_h - pad_top - 40) // n
    samples = [s for _, s in rows]
    size = fit_size(samples, 70, 40, 18)
    rows_svg = ""
    y = card_y + pad_top
    for label, sample in rows:
        if label:
            rows_svg += (f'<text x="{card_x + 60}" y="{y}" font-family="{SANS}" '
                         f'font-size="24" font-weight="700" letter-spacing="2" '
                         f'fill="{PURPLE}">{esc(label.upper())}</text>')
        font = SANS if sample.isascii() else AES
        rows_svg += (f'<text x="{card_x + 60}" y="{y + 58}" font-family="{font}" '
                     f'font-size="{size}" fill="{INK}">{esc(sample)}</text>')
        if (label, sample) != rows[-1]:
            ly = y + slot - 24
            rows_svg += (f'<line x1="{card_x + 60}" y1="{ly}" '
                         f'x2="{card_x + card_w - 60}" y2="{ly}" '
                         f'stroke="{INK}" stroke-opacity="0.08" stroke-width="2"/>')
        y += slot

    blines = textwrap.wrap(esc(pin["benefit"]), width=40)[:2]
    by0 = card_y + card_h + 66
    bspans = "".join(f'<tspan x="500" y="{by0 + i*44}">{l}</tspan>'
                     for i, l in enumerate(blines))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PIN_W} {PIN_H}"
     width="{PIN_W}" height="{PIN_H}">
  {defs(p)}
  <rect width="{PIN_W}" height="{PIN_H}" fill="{PANEL}"/>
  <rect width="{PIN_W}" height="{PIN_H}" fill="url(#dots{p})"/>
  <circle cx="860" cy="90" r="420" fill="url(#glow{p})"/>
  <circle cx="120" cy="1380" r="360" fill="url(#glow{p})"/>
  <rect x="0" y="0" width="16" height="{PIN_H}" fill="url(#gv{p})"/>

  <text x="80" y="150" font-family="{SANS}" font-size="28" font-weight="700"
        letter-spacing="4" fill="{PURPLE}">{esc(pin['kicker'])}</text>
  <text font-family="{SANS}" font-size="{fs}" font-weight="800"
        fill="{INK}">{tspans}</text>
  <rect x="82" y="{title_bottom + 34}" width="120" height="9" rx="4"
        fill="url(#g{p})"/>

  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="#fff" stroke="{INK}" stroke-opacity="0.08"/>
  <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="48"
        fill="url(#glow{p})"/>
  {rows_svg}

  <text font-family="{SANS}" font-size="32" fill="{SUB}"
        text-anchor="middle">{bspans}</text>

  <line x1="330" y1="1392" x2="610" y2="1392" stroke="url(#g{p})"
        stroke-width="3" opacity="0.5"/>
  <text x="500" y="1352" font-family="{SANS}" font-size="26" font-weight="700"
        letter-spacing="3" fill="{PURPLE}" text-anchor="middle">TOCA PARA COPIAR</text>
  <g transform="translate(300 1432)">
    <rect x="0" y="-38" width="56" height="56" rx="16" fill="url(#gv{p})"/>
    <text x="28" y="3" font-family="{SANS}" font-size="34" font-weight="800"
          fill="#fff" text-anchor="middle">U</text>
    <text x="74" y="4" font-family="{SANS}" font-size="40" font-weight="800"
          fill="{INK}">UltraTextGen<tspan fill="{PURPLE}">.com/es</tspan></text>
  </g>
</svg>"""


# ============================================================ pin copy
def utm(slug):
    return (f"{DEST}?utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=es_howto_pins&utm_content={slug}")


def description(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Escribe una vez y copia todos "
         f"los estilos Unicode en UltraTextGen: gratis, en el navegador, sin "
         f"apps. Ideal para bios, nombres, títulos, estados y comentarios.")
    if len(d) > 500:
        d = d[:497].rsplit(" ", 1)[0] + "…"
    return d


def alt(pin):
    return (f"Pin vertical en español: {pin['headline']} — ejemplos de letras "
            f"bonitas para copiar y pegar desde UltraTextGen.")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def main():
    import cairosvg
    out = []
    for pin in PINS:
        svg = pin_svg(pin)
        path = os.path.join(PIN_DIR, f"{pin['slug']}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=PIN_W, output_height=PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": f"assets/pinterest/es/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD,
            "pin_title": pin["title"],
            "pin_description": description(pin),
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": DEST,
            "utm_destination_url": utm(pin["slug"]),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} Spanish pins -> assets/pinterest/es/")
    print(f"wrote inventory -> data/es_pinterest_pins.csv")

    # build the Pinterest-importer CSV through the shared pipeline
    BU = _load(os.path.join(HERE, "build_pinterest_upload.py"), "buildupload")
    BU.convert("es")

    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:24} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
