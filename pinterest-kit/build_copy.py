#!/usr/bin/env python3
"""Single source of truth for pin copy. Emits pins.csv + pin-copy.md.
Run: python3 pinterest-kit/build_copy.py"""
import csv, os, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://ultratextgen.com/es/"
BOARD = "Letras Bonitas para Copiar y Pegar ✨ Cómo Usarlas"
BOARD_DESC = ("Cómo convertir tu texto en letras bonitas, cursivas, góticas y con "
    "símbolos para copiar y pegar. Tutoriales rápidos para decorar tu bio de "
    "Instagram, estados de WhatsApp, nicks de Free Fire, títulos y nombres. Sin apps, "
    "gratis y desde el celular \U0001f496")

def link(q):
    return BASE + ("?q=" + urllib.parse.quote(q) if q else "")
def utm(q, slug):
    u = link(q)
    sep = "&" if "?" in u else "?"
    return u + sep + ("utm_source=pinterest&utm_medium=social&"
                      "utm_campaign=organic_pins&utm_content=" + slug)

# slug, kw_label, title, desc, tags, keywords, q
P = [
("copiar-pegar","letras bonitas para copiar y pegar (49.500/mes)",
 "Cómo copiar y pegar letras bonitas en 3 segundos",
 "Escribe tu texto, elige tu estilo favorito y cópialo con un toque. Letras bonitas para copiar y pegar en Instagram, WhatsApp, Facebook y más. Gratis y sin apps \U0001f49c",
 "#letrasbonitas #copiarypegar #letrasparacopiar #fuentesbonitas #tipografias",
 "letras bonitas, copiar y pegar, fuentes bonitas","Sofía"),
("conversor","conversor de letras bonitas (27.100/mes)",
 "Conversor de letras bonitas: convierte tu texto al instante",
 "Pega tu nombre o frase y mira cómo se transforma en decenas de estilos bonitos. El conversor de letras más fácil para redes sociales. 100% online y gratis ✨",
 "#conversordeletras #letrasbonitas #generadordeletras #fuentes #copiarypegar",
 "conversor de letras, generador de letras, letras bonitas","Sofía"),
("tipos-de-letras","tipos de letras bonitas (8.100/mes)",
 "Todos los tipos de letras bonitas en un solo lugar",
 "Cursiva, gótica, burbuja, negrita, aesthetic y muchas más. Un solo texto, decenas de estilos para copiar y pegar. Encuentra tu favorita \U0001f496",
 "#tiposdeletras #letrasbonitas #fuentesbonitas #estilosdeletra #aesthetic",
 "tipos de letras, fuentes bonitas, estilos de letra",""),
("instagram","letras bonitas para instagram (5.400/mes)",
 "Letras bonitas para tu bio de Instagram",
 "Haz que tu perfil destaque: pon letras bonitas en tu bio, nombre y stories de Instagram. Copia y pega, sin instalar nada \U0001f4f2✨",
 "#letrasparainstagram #biodeinstagram #letrasbonitas #instagramtips #aesthetic",
 "letras para instagram, bio de instagram, aesthetic","tu bio"),
("cursiva","letra cursiva bonita (2.400/mes)",
 "Cómo escribir en cursiva bonita (sin instalar nada)",
 "Convierte cualquier frase en letra cursiva elegante para copiar y pegar. Perfecta para bios, títulos y dedicatorias \U0001f58b️",
 "#letracursiva #cursivabonita #letrasbonitas #caligrafia #copiarypegar",
 "letra cursiva, cursiva bonita, caligrafia","Hola"),
("nombres","tu nombre en letras bonitas (~740/mes)",
 "Tu nombre en letras bonitas para copiar",
 "Escribe tu nombre y conviértelo en letras bonitas al instante. Ideal para perfiles, nicks y estados \U0001f495",
 "#nombresbonitos #letrasbonitas #nombreenletras #copiarypegar #perfil",
 "nombres bonitos, nombre en letras, letras bonitas","Camila"),
("fuentes","fuentes de letras bonitas (2.900/mes)",
 "Fuentes bonitas que SÍ funcionan en redes",
 "Estas fuentes se copian y pegan en cualquier red sin romperse. Decora tus publicaciones con estilo en segundos ✨",
 "#fuentesbonitas #fonts #letrasbonitas #tipografias #redessociales",
 "fuentes bonitas, fonts, tipografias","Estilo"),
("titulos","letras para títulos bonitos (1.900/mes)",
 "Títulos bonitos para tus posts y apuntes",
 "Crea encabezados con estilo para tus publicaciones, apuntes y proyectos. Copia y pega letras para títulos bonitos \U0001f4dd✨",
 "#titulosbonitos #letrasparatitulos #apuntesbonitos #letrasbonitas #estudiar",
 "titulos bonitos, letras para titulos, apuntes bonitos","Mi Título"),
("whatsapp","letras bonitas para whatsapp (1.900/mes)",
 "Letras bonitas para tus estados de WhatsApp",
 "Pon letras bonitas en tu estado, nombre y mensajes de WhatsApp. Copia y pega desde el celular, gratis \U0001f49a",
 "#whatsapp #letrasbonitas #estadosdewhatsapp #copiarypegar #tips",
 "whatsapp, estados de whatsapp, letras bonitas","Hola"),
("simbolos","letras bonitas y símbolos (pos. 5 en Google)",
 "Letras + símbolos bonitos para copiar y pegar",
 "Combina letras bonitas con símbolos y adornos para decorar tu texto. Perfecto para nicks, bios y títulos. Copia y pega ✨",
 "#simbolos #letrasbonitas #simbolosparacopiar #decoraciondetexto #aesthetic",
 "simbolos, simbolos para copiar, letras bonitas","Sofía"),
("free-fire","letras bonitas para free fire (720/mes)",
 "Nicks bonitos para Free Fire (con símbolos)",
 "Crea tu nick de Free Fire con letras y símbolos que destacan. Copia y pega tu nombre de jugador en segundos \U0001f3ae\U0001f525",
 "#freefire #nickfreefire #letrasparafreefire #gamer #simbolos",
 "free fire, nick free fire, letras para free fire","Player"),
("facebook","letras bonitas para facebook (1.300/mes)",
 "Cómo escribir con letras bonitas en Facebook",
 "Destaca en tus publicaciones y comentarios de Facebook con letras bonitas para copiar y pegar. Fácil y gratis \U0001f499",
 "#facebook #letrasbonitas #copiarypegar #redessociales #tips",
 "facebook, letras bonitas, copiar y pegar","Hola"),
("aesthetic","cluster aesthetic / otros idiomas (top GSC)",
 "Letras aesthetic para copiar y pegar",
 "Texto aesthetic con estilo suave y símbolos bonitos para tus redes. Dale un toque único a tu perfil. Copia y pega ✨",
 "#aesthetic #letrasaesthetic #letrasbonitas #aestheticfonts #copiarypegar",
 "aesthetic, letras aesthetic, aesthetic fonts","vibes"),
("mayusculas","letras mayúsculas bonitas (590/mes)",
 "Letras MAYÚSCULAS bonitas para títulos",
 "Convierte tus títulos en mayúsculas con estilo para que resalten. Copia y pega letras grandes y bonitas \U0001f520✨",
 "#mayusculas #letrasbonitas #titulos #letrasgrandes #copiarypegar",
 "mayusculas, letras grandes, titulos","TÍTULO"),
("goticas","letras góticas para copiar y pegar",
 "Letras góticas para copiar y pegar",
 "Estilo oscuro y elegante: convierte tu texto en letras góticas para nicks, bios y publicaciones \U0001f5a4",
 "#letrasgoticas #gotico #letrasbonitas #dark #copiarypegar",
 "letras goticas, gotico, dark","Oscuro"),
("abecedario","abecedario letras bonitas (12.100/mes)",
 "El abecedario en letras bonitas (no las dibujes, cópialas)",
 "¿No sabes dibujarlas? Genera el abecedario completo en letras bonitas y cópialo listo de la A a la Z \U0001f524✨",
 "#abecedario #letrasbonitas #abecedariobonito #copiarypegar #letras",
 "abecedario, abecedario bonito, letras bonitas","ABCDE"),
("word","títulos bonitos en Word (pos. 9 en Google)",
 "Títulos bonitos en Word: copia y pega con estilo",
 "Crea títulos llamativos para tus documentos de Word. Genera la letra bonita aquí y pégala directo en tu trabajo \U0001f4c4✨",
 "#word #titulosbonitos #letrasbonitas #documentos #copiarypegar",
 "word, titulos bonitos, documentos","Título"),
("sin-dibujar","como hacer letras bonitas (2.900/mes)",
 "Cómo hacer letras bonitas sin dibujar (en el celular)",
 "Olvídate de dibujarlas a mano: escribe, elige el estilo y copia. Así de fácil se hacen letras bonitas desde el celular \U0001f4f2✨",
 "#comohacerletrasbonitas #letrasbonitas #tutorial #copiarypegar #tips",
 "como hacer letras bonitas, tutorial, letras bonitas","Hola"),
("tiktok-x","cluster nicks TikTok / X",
 "Nicks bonitos para TikTok y X (Twitter)",
 "Haz que tu nombre de usuario destaque en TikTok y X con letras bonitas para copiar y pegar. Personaliza tu perfil ✨",
 "#tiktok #twitter #nickbonito #letrasbonitas #perfil",
 "tiktok, twitter, nick bonito","usuario"),
("tachado","cluster texto tachado / subrayado",
 "Letras tachadas y subrayadas para copiar y pegar",
 "Tacha o subraya tu texto con un solo toque para resaltar precios, listas o frases. Copia y pega donde quieras ✏️",
 "#textotachado #subrayado #letrasbonitas #copiarypegar #tips",
 "texto tachado, subrayado, letras bonitas","texto"),
# ---- long-tail ----
("feliz-cumpleanos","feliz cumpleaños letras bonitas (2.900/mes)",
 "Letras bonitas para Feliz Cumpleaños",
 "Felicita con estilo: convierte «Feliz Cumpleaños» en letras bonitas para copiar y pegar en tu tarjeta, story o mensaje \U0001f389✨",
 "#felizcumpleanos #cumpleanos #letrasbonitas #felicitaciones #copiarypegar",
 "feliz cumpleanos, cumpleanos, letras bonitas","Feliz Cumpleaños"),
("feliz-cumple-amor","feliz cumpleaños mi amor letras bonitas (1.000/mes)",
 "Feliz Cumpleaños mi amor en letras bonitas",
 "Sorprende a tu pareja: «Feliz Cumpleaños mi amor» en letras bonitas con corazón para copiar y pegar \U0001f495",
 "#felizcumpleanosmiamor #amor #letrasbonitas #parejas #copiarypegar",
 "feliz cumpleanos mi amor, amor, letras bonitas","Feliz Cumpleaños mi amor"),
("feliz-navidad","feliz navidad letras bonitas (1.600/mes)",
 "Letras bonitas para Feliz Navidad",
 "Decora tus mensajes navideños: «Feliz Navidad» en letras bonitas para copiar y pegar en stories, tarjetas y estados \U0001f384✨",
 "#feliznavidad #navidad #letrasbonitas #navidad2026 #copiarypegar",
 "feliz navidad, navidad, letras bonitas","Feliz Navidad"),
("ano-nuevo","feliz año nuevo letras bonitas (seasonal)",
 "Letras bonitas para Feliz Año Nuevo",
 "Recibe el año con estilo: «Feliz Año Nuevo» en letras bonitas para copiar y pegar en tus felicitaciones \U0001f386✨",
 "#felizanonuevo #anonuevo #letrasbonitas #2027 #copiarypegar",
 "feliz ano nuevo, ano nuevo, letras bonitas","Feliz Año Nuevo"),
("te-amo","te amo letras bonitas (390/mes)",
 "Cómo escribir «Te amo» en letras bonitas",
 "Dile lo que sientes con estilo: «Te amo» en letras bonitas con corazón para copiar y pegar \U0001f497",
 "#teamo #amor #letrasbonitas #frasesdeamor #copiarypegar",
 "te amo, amor, frases de amor","Te amo"),
("frases-bonitas","frases con letras bonitas (260/mes)",
 "Frases con letras bonitas para copiar y pegar",
 "Convierte tus frases favoritas en letras bonitas para tu bio, estados y publicaciones. Copia y pega en segundos ✨",
 "#frasesbonitas #letrasbonitas #frases #estados #copiarypegar",
 "frases bonitas, frases, estados","Te quiero"),
("nombre-angel","nombre de ángel en letras bonitas (480/mes)",
 "El nombre Ángel en letras bonitas",
 "¿Te llamas Ángel? Convierte tu nombre en letras bonitas para tu perfil, nick o estado. Copia y pega ✨",
 "#angel #nombresbonitos #letrasbonitas #nombreenletras #copiarypegar",
 "nombre angel, nombres bonitos, letras bonitas","Ángel"),
("nombre-dulce","nombre dulce en letras bonitas (260/mes)",
 "El nombre Dulce en letras bonitas",
 "Convierte el nombre Dulce en letras bonitas para tu perfil, nick o estado. Copia y pega en segundos \U0001f495",
 "#dulce #nombresbonitos #letrasbonitas #nombreenletras #copiarypegar",
 "nombre dulce, nombres bonitos, letras bonitas","Dulce"),
("nombres-populares","nombre [x] en letras bonitas (cluster long-tail)",
 "Tu nombre favorito en letras bonitas",
 "Camila, Mateo, Isabella, José... escribe cualquier nombre y convíertelo en letras bonitas para copiar y pegar ✨",
 "#nombresbonitos #letrasbonitas #nombreenletras #copiarypegar #perfil",
 "nombres bonitos, nombre en letras, letras bonitas","tu nombre"),
("letras-decoradas","letras bonitas decoradas con corazones y flores",
 "Letras decoradas con corazones y flores",
 "Añade corazones, flores y símbolos a tu texto para decorarlo. Letras bonitas decoradas para copiar y pegar en tus redes \U0001f338\U0001f495",
 "#letrasdecoradas #letrasbonitas #corazones #flores #copiarypegar",
 "letras decoradas, corazones, flores","amor"),
]

# ---- emit pins.csv ----
csv_path = os.path.join(HERE, "pins.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["image_file","pin_title","pin_description","pin_keywords",
                "destination_url","utm_destination_url","board","target_keyword"])
    for i,(slug,kw,title,desc,tags,keys,q) in enumerate(P,1):
        full_desc = f"{desc} {tags}"
        w.writerow([f"{i:02d}-{slug}.png", title, full_desc, keys,
                    link(q), utm(q,slug), BOARD, kw])

# ---- emit pinterest-bulk-upload.csv (Pinterest's exact required schema) ----
# Pinterest "Bulk create Pins" needs EXACT headers and a public Media URL
# ending in .png/.jpg/.mp4. The repo is public, so we serve the images
# straight from GitHub raw (Pinterest ingests the file at upload time).
RAW_BASE = ("https://raw.githubusercontent.com/ychowdhrey/ultratextgen/"
            "claude/modest-edison-xr5q47/pinterest-kit/images/")
bulk_path = os.path.join(HERE, "pinterest-bulk-upload.csv")
with open(bulk_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Title", "Media URL", "Pinterest board",
                "Description", "Link", "Keywords"])
    for i,(slug,kw,title,desc,tags,keys,q) in enumerate(P,1):
        w.writerow([title[:100], f"{RAW_BASE}{i:02d}-{slug}.png", BOARD,
                    f"{desc} {tags}"[:500], utm(q,slug), keys])

# ---- emit pin-copy.md ----
md = [f"# Tablero de Pinterest (ES) — Copy de los {len(P)} pines\n",
 f"**Tablero:** `{BOARD}`  ",
 f"**Descripción del tablero:**\n> {BOARD_DESC}\n",
 "**Destino:** todos los pines apuntan a `https://ultratextgen.com/es/` con `?q=` "
 "(precarga el texto en el generador) + UTM `utm_source=pinterest` para medir el "
 "tráfico en GA/GTM.\n",
 "> Idioma: español neutro (LatAm). Mercado principal: México, luego Chile, "
 "Colombia, EE. UU. hispano, Rep. Dominicana.\n",
 "> El sistema general de pines por página vive en `docs/pinterest-pin-generation.md` "
 "y `data/pinterest_pins.csv`. Este tablero es una **campaña how-to** aparte, toda "
 "enlazada a `/es/`.\n", "---\n"]
for i,(slug,kw,title,desc,tags,keys,q) in enumerate(P,1):
    md.append(f"## {i:02d} · {slug} — *kw: {kw}*")
    md.append(f"**Título:** {title}  ")
    md.append(f"**Descripción:** {desc}  ")
    md.append(f"**Hashtags:** {tags}  ")
    md.append(f"**Link:** {utm(q,slug)}\n")
md.append("---\n## Orden de publicación (1–2 pines/día)")
md.append("Sube primero los de mayor volumen (01–05), luego el resto. Los "
 "estacionales (21–24) progámalos ~3–4 semanas antes de la fecha. No publiques "
 "los 30 de golpe.")
with open(os.path.join(HERE,"pin-copy.md"),"w",encoding="utf-8") as f:
    f.write("\n".join(md)+"\n")
print(f"wrote pins.csv + pinterest-bulk-upload.csv ({len(P)} rows) + pin-copy.md")
