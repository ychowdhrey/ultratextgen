#!/usr/bin/env python3
"""
Generates the Spanish "letras bonitas / cómo usar" Pinterest pin board for
UltraTextGen — every pin drives to https://ultratextgen.com/es/.

Why a dedicated set (vs scripts/generate-pinterest.py):
  - generate-pinterest.py builds one pin *per page*, in English. This board is
    single-destination (/es/) and single-language (LatAm Spanish), organised by
    **use case / keyword** ("letras bonitas para copiar y pegar" 49.5K,
    "conversor de letras" 27.1K, abecedario, Instagram/WhatsApp, nicks FF,
    seasonal greetings). Topics + priorities come from the Semrush "letras
    bonitas" MX export and Search Console data for /es/.

It reuses the exact brand skin (soft off-white panel, faint dot grid,
purple->blue gradient, left accent bar, keyword title + underline, focal motif
card, UltraTextGen.com wordmark) by rendering every pin through
generate-pinterest.py's pin_svg() with the shared motifs/tokens from
generate-site-art.py — visually identical to the rest of assets/pinterest/,
just with Spanish keyword titles.

Outputs:
  - assets/pinterest/es/<slug>.png      1000x1500 vertical pins
  - data/es_pinterest_pins.csv          internal inventory (title/desc/kw/alt/url)
  - data/es_pinterest_pins_upload.csv   Pinterest-importer-ready CSV (the file you
                                        upload) — written via build_pinterest_upload

Run:  python3 scripts/generate-es-pins.py
Requires: cairosvg  (libcairo + Liberation Sans are already on the box)
"""
import csv
import functools
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", "es")
CSV_OUT = os.path.join(ROOT, "data", "es_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

DEST = "https://ultratextgen.com/es/"
KICKER = "ULTRATEXTGEN · GENERADOR"
BOARD = "Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas"


# ---- shared brand system (single source of truth) -------------------------
def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ART = _load(os.path.join(HERE, "generate-site-art.py"), "siteart")
PIN = _load(os.path.join(HERE, "generate-pinterest.py"), "pinterest")
SERIF, SANS = ART.SERIF, ART.SANS
PIN_W, PIN_H = PIN.PIN_W, PIN.PIN_H


def _build_upload():
    """Derive the Pinterest-importer-ready upload CSV from the inventory just
    written, via the shared converter (single source of truth for the schema)."""
    conv = _load(os.path.join(HERE, "build_pinterest_upload.py"), "build_upload")
    conv.convert("es")


def typo(sample, **kw):
    """m_typo specimen with a sensible size for the sample length."""
    kw.setdefault("size", 120 if len(sample) <= 3 else 96 if len(sample) <= 6 else 76)
    return functools.partial(ART.m_typo, sample=sample, **kw)


def transform(a="Aa", b="✦"):
    return functools.partial(ART.m_transform, a=a, b=b)


# ============================================================ pin definitions
# Each pin: slug, title (keyword-led, on the image), subtitle (benefit, on the
# image), motif, and the upload copy (pin_title / description / keywords /
# destination). The destination "q" pre-fills the generator with a relevant
# sample so the pin lands on a live demonstration.
PINS = [
    dict(
        slug="copiar-pegar",
        title="Letras Bonitas para Copiar y Pegar",
        subtitle="Escribe, copia y pega — gratis y sin apps",
        motif=transform("Aa", "✦"),
        q="Sofía",
        pin_title="Cómo copiar y pegar letras bonitas en 3 segundos",
        description="Escribe tu texto, elige tu estilo favorito y cópialo con un toque. Letras bonitas para copiar y pegar en Instagram, WhatsApp, Facebook y más. Gratis y sin apps 💜 #letrasbonitas #copiarypegar #letrasparacopiar #fuentesbonitas #tipografias",
        keywords=["letras bonitas", "copiar y pegar", "fuentes bonitas"],
    ),
    dict(
        slug="conversor",
        title="Conversor de Letras Bonitas",
        subtitle="Convierte tu texto en decenas de estilos",
        motif=transform("abc", "✦"),
        q="Sofía",
        pin_title="Conversor de letras bonitas: convierte tu texto al instante",
        description="Pega tu nombre o frase y mira cómo se transforma en decenas de estilos bonitos. El conversor de letras más fácil para redes sociales. 100% online y gratis ✨ #conversordeletras #letrasbonitas #generadordeletras #fuentes #copiarypegar",
        keywords=["conversor de letras", "generador de letras", "letras bonitas"],
    ),
    dict(
        slug="tipos-de-letras",
        title="Tipos de Letras Bonitas",
        subtitle="Cursiva, gótica, burbuja, negrita y más",
        motif=ART.m_grid,
        q=None,
        pin_title="Todos los tipos de letras bonitas en un solo lugar",
        description="Cursiva, gótica, burbuja, negrita, aesthetic y muchas más. Un solo texto, decenas de estilos para copiar y pegar. Encuentra tu favorita 💖 #tiposdeletras #letrasbonitas #fuentesbonitas #estilosdeletra #aesthetic",
        keywords=["tipos de letras", "fuentes bonitas", "estilos de letra"],
    ),
    dict(
        slug="instagram",
        title="Letras Bonitas para Instagram",
        subtitle="Decora tu bio, nombre y stories",
        motif=ART.m_profile,
        q="tu bio",
        pin_title="Letras bonitas para tu bio de Instagram",
        description="Haz que tu perfil destaque: pon letras bonitas en tu bio, nombre y stories de Instagram. Copia y pega, sin instalar nada 📲✨ #letrasparainstagram #biodeinstagram #letrasbonitas #instagramtips #aesthetic",
        keywords=["letras para instagram", "bio de instagram", "aesthetic"],
    ),
    dict(
        slug="cursiva",
        title="Letra Cursiva Bonita",
        subtitle="Cursiva elegante para copiar y pegar",
        motif=typo("Hola", ff=SERIF, style="italic"),
        q="Hola",
        pin_title="Cómo escribir en cursiva bonita (sin instalar nada)",
        description="Convierte cualquier frase en letra cursiva elegante para copiar y pegar. Perfecta para bios, títulos y dedicatorias 🖋️ #letracursiva #cursivabonita #letrasbonitas #caligrafia #copiarypegar",
        keywords=["letra cursiva", "cursiva bonita", "caligrafia"],
    ),
    dict(
        slug="nombres",
        title="Tu Nombre en Letras Bonitas",
        subtitle="Para perfiles, nicks y estados",
        motif=typo("Camila", ff=SERIF, style="italic"),
        q="Camila",
        pin_title="Tu nombre en letras bonitas para copiar",
        description="Escribe tu nombre y conviértelo en letras bonitas al instante. Ideal para perfiles, nicks y estados 💕 #nombresbonitos #letrasbonitas #nombreenletras #copiarypegar #perfil",
        keywords=["nombres bonitos", "nombre en letras", "letras bonitas"],
    ),
    dict(
        slug="fuentes",
        title="Fuentes de Letras Bonitas",
        subtitle="Funcionan en cualquier red social",
        motif=ART.m_grid,
        q="Estilo",
        pin_title="Fuentes bonitas que SÍ funcionan en redes",
        description="Estas fuentes se copian y pegan en cualquier red sin romperse. Decora tus publicaciones con estilo en segundos ✨ #fuentesbonitas #fonts #letrasbonitas #tipografias #redessociales",
        keywords=["fuentes bonitas", "fonts", "tipografias"],
    ),
    dict(
        slug="titulos",
        title="Letras para Títulos Bonitos",
        subtitle="Encabezados con estilo para tus posts",
        motif=ART.m_headline,
        q="Mi Título",
        pin_title="Títulos bonitos para tus posts y apuntes",
        description="Crea encabezados con estilo para tus publicaciones, apuntes y proyectos. Copia y pega letras para títulos bonitos 📝✨ #titulosbonitos #letrasparatitulos #apuntesbonitos #letrasbonitas #estudiar",
        keywords=["titulos bonitos", "letras para titulos", "apuntes bonitos"],
    ),
    dict(
        slug="whatsapp",
        title="Letras Bonitas para WhatsApp",
        subtitle="Estados, nombre y mensajes con estilo",
        motif=ART.m_chat,
        q="Hola",
        pin_title="Letras bonitas para tus estados de WhatsApp",
        description="Pon letras bonitas en tu estado, nombre y mensajes de WhatsApp. Copia y pega desde el celular, gratis 💚 #whatsapp #letrasbonitas #estadosdewhatsapp #copiarypegar #tips",
        keywords=["whatsapp", "estados de whatsapp", "letras bonitas"],
    ),
    dict(
        slug="simbolos",
        title="Letras y Símbolos Bonitos",
        subtitle="Adornos y símbolos para decorar tu texto",
        motif=ART.m_divider,
        q="Sofía",
        pin_title="Letras + símbolos bonitos para copiar y pegar",
        description="Combina letras bonitas con símbolos y adornos para decorar tu texto. Perfecto para nicks, bios y títulos. Copia y pega ✨ #simbolos #letrasbonitas #simbolosparacopiar #decoraciondetexto #aesthetic",
        keywords=["simbolos", "simbolos para copiar", "letras bonitas"],
    ),
    dict(
        slug="free-fire",
        title="Nicks Bonitos para Free Fire",
        subtitle="Crea tu nombre de jugador con símbolos",
        motif=ART.m_trophy,
        q="Player",
        pin_title="Nicks bonitos para Free Fire (con símbolos)",
        description="Crea tu nick de Free Fire con letras y símbolos que destacan. Copia y pega tu nombre de jugador en segundos 🎮🔥 #freefire #nickfreefire #letrasparafreefire #gamer #simbolos",
        keywords=["free fire", "nick free fire", "letras para free fire"],
    ),
    dict(
        slug="facebook",
        title="Letras Bonitas para Facebook",
        subtitle="Destaca en posts y comentarios",
        motif=ART.m_chat,
        q="Hola",
        pin_title="Cómo escribir con letras bonitas en Facebook",
        description="Destaca en tus publicaciones y comentarios de Facebook con letras bonitas para copiar y pegar. Fácil y gratis 💙 #facebook #letrasbonitas #copiarypegar #redessociales #tips",
        keywords=["facebook", "letras bonitas", "copiar y pegar"],
    ),
    dict(
        slug="aesthetic",
        title="Letras Aesthetic para Copiar",
        subtitle="Estilo suave con símbolos bonitos",
        motif=ART.m_divider,
        q="vibes",
        pin_title="Letras aesthetic para copiar y pegar",
        description="Texto aesthetic con estilo suave y símbolos bonitos para tus redes. Dale un toque único a tu perfil. Copia y pega ✨ #aesthetic #letrasaesthetic #letrasbonitas #aestheticfonts #copiarypegar",
        keywords=["aesthetic", "letras aesthetic", "aesthetic fonts"],
    ),
    dict(
        slug="mayusculas",
        title="Letras Mayúsculas Bonitas",
        subtitle="Mayúsculas con estilo para títulos",
        motif=typo("ABC", weight="700"),
        q="TÍTULO",
        pin_title="Letras MAYÚSCULAS bonitas para títulos",
        description="Convierte tus títulos en mayúsculas con estilo para que resalten. Copia y pega letras grandes y bonitas 🔠✨ #mayusculas #letrasbonitas #titulos #letrasgrandes #copiarypegar",
        keywords=["mayusculas", "letras grandes", "titulos"],
    ),
    dict(
        slug="goticas",
        title="Letras Góticas para Copiar",
        subtitle="Estilo oscuro y elegante",
        motif=ART.m_rune,
        q="Oscuro",
        pin_title="Letras góticas para copiar y pegar",
        description="Estilo oscuro y elegante: convierte tu texto en letras góticas para nicks, bios y publicaciones 🖤 #letrasgoticas #gotico #letrasbonitas #dark #copiarypegar",
        keywords=["letras goticas", "gotico", "dark"],
    ),
    dict(
        slug="abecedario",
        title="Abecedario en Letras Bonitas",
        subtitle="De la A a la Z, listo para copiar",
        motif=ART.m_grid,
        q="ABCDE",
        pin_title="El abecedario en letras bonitas (no las dibujes, cópialas)",
        description="¿No sabes dibujarlas? Genera el abecedario completo en letras bonitas y cópialo listo de la A a la Z 🔤✨ #abecedario #letrasbonitas #abecedariobonito #copiarypegar #letras",
        keywords=["abecedario", "abecedario bonito", "letras bonitas"],
    ),
    dict(
        slug="word",
        title="Títulos Bonitos en Word",
        subtitle="Genera y pega títulos en tus documentos",
        motif=ART.m_doc,
        q="Título",
        pin_title="Títulos bonitos en Word: copia y pega con estilo",
        description="Crea títulos llamativos para tus documentos de Word. Genera la letra bonita aquí y pégala directo en tu trabajo 📄✨ #word #titulosbonitos #letrasbonitas #documentos #copiarypegar",
        keywords=["word", "titulos bonitos", "documentos"],
    ),
    dict(
        slug="sin-dibujar",
        title="Cómo Hacer Letras Bonitas",
        subtitle="Sin dibujar: escribe, elige y copia",
        motif=ART.m_brand,
        q="Hola",
        pin_title="Cómo hacer letras bonitas sin dibujar (en el celular)",
        description="Olvídate de dibujarlas a mano: escribe, elige el estilo y copia. Así de fácil se hacen letras bonitas desde el celular 📲✨ #comohacerletrasbonitas #letrasbonitas #tutorial #copiarypegar #tips",
        keywords=["como hacer letras bonitas", "tutorial", "letras bonitas"],
    ),
    dict(
        slug="tiktok-x",
        title="Nicks Bonitos para TikTok y X",
        subtitle="Personaliza tu nombre de usuario",
        motif=ART.m_at,
        q="usuario",
        pin_title="Nicks bonitos para TikTok y X (Twitter)",
        description="Haz que tu nombre de usuario destaque en TikTok y X con letras bonitas para copiar y pegar. Personaliza tu perfil ✨ #tiktok #twitter #nickbonito #letrasbonitas #perfil",
        keywords=["tiktok", "twitter", "nick bonito"],
    ),
    dict(
        slug="tachado",
        title="Letras Tachadas y Subrayadas",
        subtitle="Resalta precios, listas y frases",
        motif=typo("texto", deco="line-through"),
        q="texto",
        pin_title="Letras tachadas y subrayadas para copiar y pegar",
        description="Tacha o subraya tu texto con un solo toque para resaltar precios, listas o frases. Copia y pega donde quieras ✏️ #textotachado #subrayado #letrasbonitas #copiarypegar #tips",
        keywords=["texto tachado", "subrayado", "letras bonitas"],
    ),
    # ---- long-tail: seasonal, phrases & names ----
    dict(
        slug="feliz-cumpleanos",
        title="Feliz Cumpleaños en Letras Bonitas",
        subtitle="Felicita con estilo en redes y tarjetas",
        motif=ART.m_divider,
        q="Feliz Cumpleaños",
        pin_title="Letras bonitas para Feliz Cumpleaños",
        description="Felicita con estilo: convierte «Feliz Cumpleaños» en letras bonitas para copiar y pegar en tu tarjeta, story o mensaje 🎉✨ #felizcumpleanos #cumpleanos #letrasbonitas #felicitaciones #copiarypegar",
        keywords=["feliz cumpleanos", "cumpleanos", "letras bonitas"],
    ),
    dict(
        slug="feliz-cumple-amor",
        title="Feliz Cumpleaños Mi Amor",
        subtitle="Una felicitación con estilo para tu pareja",
        motif=ART.m_bow,
        q="Feliz Cumpleaños mi amor",
        pin_title="Feliz Cumpleaños mi amor en letras bonitas",
        description="Sorprende a tu pareja: «Feliz Cumpleaños mi amor» en letras bonitas con corazón para copiar y pegar 💕 #felizcumpleanosmiamor #amor #letrasbonitas #parejas #copiarypegar",
        keywords=["feliz cumpleanos mi amor", "amor", "letras bonitas"],
    ),
    dict(
        slug="feliz-navidad",
        title="Feliz Navidad en Letras Bonitas",
        subtitle="Decora tus mensajes navideños",
        motif=ART.m_divider,
        q="Feliz Navidad",
        pin_title="Letras bonitas para Feliz Navidad",
        description="Decora tus mensajes navideños: «Feliz Navidad» en letras bonitas para copiar y pegar en stories, tarjetas y estados 🎄✨ #feliznavidad #navidad #letrasbonitas #navidad2026 #copiarypegar",
        keywords=["feliz navidad", "navidad", "letras bonitas"],
    ),
    dict(
        slug="ano-nuevo",
        title="Feliz Año Nuevo en Letras Bonitas",
        subtitle="Recibe el año con estilo",
        motif=ART.m_divider,
        q="Feliz Año Nuevo",
        pin_title="Letras bonitas para Feliz Año Nuevo",
        description="Recibe el año con estilo: «Feliz Año Nuevo» en letras bonitas para copiar y pegar en tus felicitaciones 🎆✨ #felizanonuevo #anonuevo #letrasbonitas #2027 #copiarypegar",
        keywords=["feliz ano nuevo", "ano nuevo", "letras bonitas"],
    ),
    dict(
        slug="te-amo",
        title="Te Amo en Letras Bonitas",
        subtitle="Dile lo que sientes con estilo",
        motif=ART.m_bow,
        q="Te amo",
        pin_title="Cómo escribir «Te amo» en letras bonitas",
        description="Dile lo que sientes con estilo: «Te amo» en letras bonitas con corazón para copiar y pegar 💗 #teamo #amor #letrasbonitas #frasesdeamor #copiarypegar",
        keywords=["te amo", "amor", "frases de amor"],
    ),
    dict(
        slug="frases-bonitas",
        title="Frases con Letras Bonitas",
        subtitle="Para tu bio, estados y publicaciones",
        motif=ART.m_chat,
        q="Te quiero",
        pin_title="Frases con letras bonitas para copiar y pegar",
        description="Convierte tus frases favoritas en letras bonitas para tu bio, estados y publicaciones. Copia y pega en segundos ✨ #frasesbonitas #letrasbonitas #frases #estados #copiarypegar",
        keywords=["frases bonitas", "frases", "estados"],
    ),
    dict(
        slug="nombre-angel",
        title="Nombre Ángel en Letras Bonitas",
        subtitle="Tu nombre listo para copiar y pegar",
        motif=typo("Ángel", ff=SERIF, style="italic"),
        q="Ángel",
        pin_title="El nombre Ángel en letras bonitas",
        description="¿Te llamas Ángel? Convierte tu nombre en letras bonitas para tu perfil, nick o estado. Copia y pega ✨ #angel #nombresbonitos #letrasbonitas #nombreenletras #copiarypegar",
        keywords=["nombre angel", "nombres bonitos", "letras bonitas"],
    ),
    dict(
        slug="nombre-dulce",
        title="Nombre Dulce en Letras Bonitas",
        subtitle="Tu nombre listo para copiar y pegar",
        motif=typo("Dulce", ff=SERIF, style="italic"),
        q="Dulce",
        pin_title="El nombre Dulce en letras bonitas",
        description="Convierte el nombre Dulce en letras bonitas para tu perfil, nick o estado. Copia y pega en segundos 💕 #dulce #nombresbonitos #letrasbonitas #nombreenletras #copiarypegar",
        keywords=["nombre dulce", "nombres bonitos", "letras bonitas"],
    ),
    dict(
        slug="nombres-populares",
        title="Tu Nombre Favorito en Letras Bonitas",
        subtitle="Cualquier nombre en decenas de estilos",
        motif=ART.m_grid,
        q="tu nombre",
        pin_title="Tu nombre favorito en letras bonitas",
        description="Camila, Mateo, Isabella, José... escribe cualquier nombre y convíertelo en letras bonitas para copiar y pegar ✨ #nombresbonitos #letrasbonitas #nombreenletras #copiarypegar #perfil",
        keywords=["nombres bonitos", "nombre en letras", "letras bonitas"],
    ),
    dict(
        slug="letras-decoradas",
        title="Letras Decoradas con Corazones",
        subtitle="Corazones, flores y símbolos para tu texto",
        motif=ART.m_divider,
        q="amor",
        pin_title="Letras decoradas con corazones y flores",
        description="Añade corazones, flores y símbolos a tu texto para decorarlo. Letras bonitas decoradas para copiar y pegar en tus redes 🌸💕 #letrasdecoradas #letrasbonitas #corazones #flores #copiarypegar",
        keywords=["letras decoradas", "corazones", "flores"],
    ),
]


# ============================================================ pin copy
def destination(pin):
    """The /es/ landing URL, pre-filling ?q= with a relevant sample when set."""
    if not pin.get("q"):
        return DEST
    from urllib.parse import quote
    return f"{DEST}?q={quote(pin['q'])}"


def utm(pin):
    base = destination(pin)
    sep = "&" if "?" in base else "?"
    return (f"{base}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=organic_pins&utm_content={pin['slug']}")


def alt(pin):
    return (f"Pin vertical en español: {pin['title']} — ejemplo de letras "
            f"bonitas para copiar y pegar desde UltraTextGen.")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def main():
    import cairosvg
    out = []
    for pin in PINS:
        svg = PIN.pin_svg(pin["slug"], pin["title"], pin["subtitle"],
                          pin["motif"], KICKER)
        path = os.path.join(PIN_DIR, f"{pin['slug']}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=PIN_W, output_height=PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": f"assets/pinterest/es/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD,
            "pin_title": pin["pin_title"],
            "pin_description": pin["description"],
            "pin_keywords": ", ".join(pin["keywords"]),
            "pin_alt_text": alt(pin),
            "destination_url": destination(pin),
            "utm_destination_url": utm(pin),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} Spanish pins -> assets/pinterest/es/")
    print(f"wrote inventory -> data/es_pinterest_pins.csv")
    _build_upload()
    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:20} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
