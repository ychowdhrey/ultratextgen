#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_event_page_from_spec.py

Render a single /events/<slug>/ page from a JSON spec living in
data/event_page_specs/. Mirrors generate_library_page_from_spec.py's
validate-then-render structure (required-field checks, refuse-to-overwrite
without --force, --dry-run support) but is tailored to event pages:

  - Emits the mode-takeover boilerplate (`window.UTG_EVENT_MODE = true`)
    plus an inline `window.UTG_EVENT_DATA = {...}` block built from the
    spec, in the script order js/events/eventPageController.js expects:
    UTG_EVENT_MODE/UTG_EVENT_DATA (inline) -> styles.js -> renderer.js ->
    script.js (defer) -> js/events/eventPageController.js (defer) ->
    symbol-explorer.js (defer) -> footer.js.
  - JSON-LD stack is FAQPage + BreadcrumbList (Home > Events > <event_name>)
    + WebApplication — deliberately NO Article (an /events/ hub page is a
    live tool, not an editorial piece).
  - The FAQ is synthesized from the spec's own fields (event_name,
    date_window, companion_answer_slug, ...) rather than hand-authored, so
    a minimal spec still produces a valid, accurate FAQPage.

Usage
-----
  python3 scripts/generate_event_page_from_spec.py SPEC.json
  python3 scripts/generate_event_page_from_spec.py data/event_page_specs/chinese-new-year.json
  python3 scripts/generate_event_page_from_spec.py SPEC.json --dry-run

The script refuses to overwrite an existing page unless --force is given.
"""

import argparse
import html
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from event_occurrence import (  # noqa: E402
    format_date,
    is_lunar,
    next_occurrences,
)

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
EVENTS_DIR = REPO / "events"
SPECS_DIR = REPO / "data" / "event_page_specs"
CAPABILITIES_PATH = REPO / "data" / "event_capabilities.json"


def load_spec_by_stem(stem):
    """Another event spec, by file stem, or None."""
    path = SPECS_DIR / f"{stem}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def page_path(spec):
    """Root-relative URL of the page a spec generates."""
    language = spec.get("language", DEFAULT_LANGUAGE)
    if language == DEFAULT_LANGUAGE:
        return f"/events/{spec['slug']}/"
    return f"/{language}/events/{spec['slug']}/"

SITE = "https://ultratextgen.com"

REQUIRED_TOP = [
    "slug",
    "event_name",
    "title",
    "meta_description",
    "hero_h1",
    "hero_tagline",
    "intro",
    "date_window",
    "fonts",
    "emoji_symbol_collections",
    "kaomoji",
    "ascii_art",
    "phrase_bank",
    "related",
]

VALID_PRESENTATION_CLASSES = ("symbol", "emoji", "emoticon", "kaomoji")
VALID_COPY_PATTERNS = ("single", "combo", "collection", "section", "transform")

DEFAULT_LANGUAGE = "en"

# Languages that already have a localized /<lang>/events/ hub page. Every
# other language falls back to a 2-item breadcrumb (Home > Event) instead of
# linking a middle "Events" crumb that doesn't exist yet — same convention
# the July-2026 library translation batch used for /<lang>/library/. Flip a
# language on here once its hub page ships.
LANGS_WITH_EVENTS_HUB = {"en"}

# --------------------------------------------------------------------------
# i18n strings
# --------------------------------------------------------------------------
# Every hardcoded English string the generator bakes into a page, keyed by
# language code. "en" is both a real table AND the fallback for any key
# missing under another language, so adding a 3rd language only means adding
# a (possibly partial) new table here -- never touching the render_*
# functions below. See tr() for the lookup + .format() behavior.
STRINGS = {
    "en": {
        "breadcrumb_aria": "Breadcrumb",
        "breadcrumb_home": "Home",
        "breadcrumb_events": "Events",
        "faq_what_is_q": "What is the {event_name} text and symbol generator?",
        "faq_when_q": "When is {event_name}?",
        "faq_when_a_dated": "The next {event_name} is {next_date}. After that it falls on "
                            "{later_dates}.",
        "faq_when_a_lunar": "{event_name} moves each year against the Gregorian calendar "
                            "because it follows {calendar_name}, so it lands about 11 days "
                            "earlier than the year before. The date shown at the top of this "
                            "page is calculated for the current year; because the start of "
                            "the month is confirmed locally by moon sighting, some countries "
                            "observe it a day either side.",
        # The sighting sentence above is true of the Islamic calendar and NOT of the
        # Chinese one, which is computed astronomically and fixed years in advance.
        # chinese sits in LUNAR_TYPES with islamic, so events/chinese-new-year was
        # rendering "confirmed locally by moon sighting" as fact.
        "faq_when_a_lunisolar": "{event_name} moves each year against the Gregorian "
                                "calendar because it follows {calendar_name}, so it lands "
                                "about 11 days earlier than the year before. The date shown "
                                "at the top of this page is calculated for the current year. "
                                "That calendar is computed astronomically rather than "
                                "confirmed by moon sighting, so the date is settled well in "
                                "advance; countries on a different time zone can still "
                                "observe it a day apart.",
        "faq_when_a": "{event_name} falls {date_window}.",
        "next_date_prefix": "Next {event_name}: ",
        "calendar_lunar_generic": "a lunar calendar",
        "date_join": ", then ",
        "faq_how_q": "How do I use the {event_name} generator?",
        "faq_more_q": "Where can I find more {event_name} phrases and what to write?",
        "faq_more_a": 'See <a href="{href}">our full answer</a> for more greetings, '
                      "translations, and message ideas.",
        "webapp_name": "{event_name} Text & Symbol Generator",
        "alt_fonts": "{event_name} Fonts",
        "alt_symbols": "{event_name} Symbols",
        "alt_textgen": "{event_name} Text Generator",
        "feature_fonts": "Live {event_name} font styles for any text you type",
        "feature_emoji": "Curated {event_name} emoji & symbol collection",
        "feature_kaomoji": "{event_name} kaomoji",
        "feature_ascii": "Curated {event_name} ASCII art",
        "feature_phrase": "Click-to-style {event_name} phrase bank (native script, "
                          "romanization, translation)",
        "aka_label": "Also known as: ",
        "section_fonts_label": "Fonts",
        "section_fonts_heading": "{event_name} Fonts",
        "section_emoji_label": "Emoji &amp; Symbols",
        "section_emoji_heading": "{event_name} Emoji &amp; Symbols",
        "section_kaomoji_label": "Kaomoji",
        "section_kaomoji_heading": "{event_name} Kaomoji",
        "section_kaomoji_intro": "Each tile is a whole kaomoji: tap to copy the full "
                                 "string in one click.",
        "section_ascii_label": "ASCII Art",
        "section_ascii_heading": "{event_name} ASCII Art",
        "section_ascii_intro": "Curated multi-line pieces: tap Copy to grab one with its "
                               "line breaks and spacing intact.",
        "section_ascii_cta": 'Want to type your own name or message into a live '
                             'block-letter banner instead? Try the <a href="{href}">ASCII '
                             'Art Generator</a>.',
        "section_native_label": "In {script_language}",
        "section_native_heading": "{event_name} in {script_language}",
        "section_native_intro": "Tap any line to copy it in {script_language}. These are the "
                                "native-script forms of the greetings above: paste them "
                                "straight into a message, card, or bio.",
        "related_heading": "Related Resources",
        "related_more_title": "More {event_name} phrases &amp; wording",
        "related_more_desc": "Greetings, translations, and message ideas beyond the phrase "
                             "bank above.",
        "related_more_fallback_name": "this event",
        "footer_heading": "{event_name} questions",
        "copy_toast": "Copied!",
        "input_label": "Your name or message",
        "textarea_placeholder": "Type a name or a short message...",
        "partner_summary": "+ Add a second name",
        "partner_label": "Second name (a partner, a friend)",
        "partner_placeholder": "Their name",
        "section_comp_label": "Designs",
        "section_comp_heading": "{event_name} text designs",
        "comp_hint": "Showing “{sample}”. Type in the box above and every design updates.",
        "comp_intensity_legend": "Decoration",
        "comp_shuffle": "Another one",
        "comp_script_note": "Arabic letters keep their own shapes: the styles change Latin letters only, so an Arabic greeting is copied exactly as written, inside the frame.",
        "fonts_hint": "Showing “{sample}”. Type your own text above to restyle every card.",
        "section_fonts_intro": "Every style below shows your text. Tap Copy on the one you like.",
        "section_phrase_label": "Start from a line",
        "section_phrase_heading": "Start from a {event_name} line",
        "section_phrase_intro": "Tap a line to put it in the box above. The designs and fonts restyle it straight away.",
        "section_handoff_label": "Make it something",
        "section_handoff_heading": "Take it further",
        "section_handoff_heading_print": "Print it or take it further",
        "section_handoff_intro": "Each card opens the tool that makes the next thing, with your text already filled in.",
        "section_emoji_intro": "Tap a symbol to copy it on its own, or copy a whole set in the format you want.",
        "section_about_label": "About",
        "nav_heading": "More occasions",
        "nav_all": "All occasions",
        "faq_how_a": "Type a name or a short line into the box at the top. The {event_name} designs and font styles below update as you type: tap Copy on any card, or share it as a link or an image. Tap a symbol, kaomoji or ASCII art piece to copy it on its own, or tap a ready-made line to put it in the box.",
        "faq_how_a_handoffs": " The cards under {handoff_heading} open the matching maker or tool with your text already filled in.",
        "feature_comp": "{event_name} text designs: frames, charm stacks, banners and sprinkled captions around your own text",
        "feature_handoffs": "One-tap hand-offs to printable makers and text tools, prefilled with your text",
    },
    # Recovered from claude/cny-page-brainstorm-3toe0h, whose Indonesian pages were
    # pushed after its PRs had already merged and so never reached main. The 45
    # strings below are that branch's own Indonesian; the eight after them are keys
    # this generator has gained since (lunar/lunisolar date prose and the
    # native-script section) and are authored here.
    "id": {
        "breadcrumb_aria": "Remah roti",
        "breadcrumb_home": "Beranda",
        "breadcrumb_events": "Acara",
        "faq_what_is_q": "Apa itu generator teks dan simbol {event_name}?",
        "faq_when_q": "Kapan {event_name} dirayakan?",
        "faq_when_a": "{event_name} jatuh {date_window}. Cek kalender terbaru untuk tanggal pastinya, lalu kembali ke sini untuk mempercantik ucapanmu.",
        "faq_how_q": "Bagaimana cara pakai generator {event_name} ini?",
        "faq_more_q": "Di mana saya bisa menemukan lebih banyak ucapan {event_name} dan contoh kata-katanya?",
        "faq_more_a": 'Lihat <a href="{href}">jawaban lengkap kami</a> untuk lebih banyak '
                      "ucapan, terjemahan, dan ide pesan.",
        "webapp_name": "Generator Teks & Simbol {event_name}",
        "alt_fonts": "Font {event_name}",
        "alt_symbols": "Simbol {event_name}",
        "alt_textgen": "Generator Teks {event_name}",
        "feature_fonts": "Gaya font {event_name} langsung untuk teks apa pun yang kamu ketik",
        "feature_emoji": "Koleksi emoji & simbol {event_name} pilihan",
        "feature_kaomoji": "Kaomoji {event_name}",
        "feature_ascii": "ASCII art {event_name} pilihan",
        "feature_phrase": "Bank frasa {event_name} yang tinggal diklik untuk bergaya (tulisan asli, romanisasi, terjemahan)",
        "aka_label": "Juga dikenal sebagai:",
        "section_fonts_label": "Font",
        "section_fonts_heading": "Font {event_name}",
        "section_emoji_label": "Emoji &amp; Simbol",
        "section_emoji_heading": "Emoji &amp; Simbol {event_name}",
        "section_kaomoji_label": "Kaomoji",
        "section_kaomoji_heading": "Kaomoji {event_name}",
        "section_kaomoji_intro": "Setiap kotak adalah satu kaomoji utuh — tap untuk menyalin seluruh rangkaiannya dalam satu klik.",
        "section_ascii_label": "ASCII Art",
        "section_ascii_heading": "ASCII Art {event_name}",
        "section_ascii_intro": "Karya multi-baris pilihan — tap Salin untuk mengambilnya lengkap dengan baris baru dan spasinya.",
        "section_ascii_cta": 'Mau mengetik nama atau pesanmu sendiri jadi banner huruf '
                             'balok yang langsung berubah? Coba <a href="{href}">Generator '
                             'ASCII Art</a>.',
        "related_heading": "Sumber Terkait",
        "related_more_title": "Lebih banyak ucapan &amp; kata-kata {event_name}",
        "related_more_desc": "Ucapan, terjemahan, dan ide pesan selain yang ada di bank frasa di atas.",
        "related_more_fallback_name": "acara ini",
        "footer_heading": "Pertanyaan seputar {event_name}",
        "copy_toast": "Disalin!",
        "faq_when_a_dated": "{event_name} berikutnya jatuh pada {next_date}. Setelah itu, {later_dates}.",
        "faq_when_a_lunar": "{event_name} bergeser setiap tahun terhadap kalender Gregorian karena mengikuti {calendar_name}, sehingga jatuh sekitar 11 hari lebih awal dari tahun sebelumnya. Tanggal di bagian atas halaman ini dihitung untuk tahun berjalan; karena awal bulan ditetapkan lewat rukyat di masing-masing negara, sebagian negara merayakannya terpaut satu hari.",
        "faq_when_a_lunisolar": "{event_name} bergeser setiap tahun terhadap kalender Gregorian karena mengikuti {calendar_name}, sehingga jatuh sekitar 11 hari lebih awal dari tahun sebelumnya. Tanggal di bagian atas halaman ini dihitung untuk tahun berjalan. Penanggalannya dihitung secara astronomis, bukan ditetapkan lewat rukyat, jadi tanggalnya sudah pasti jauh-jauh hari; negara dengan zona waktu berbeda tetap bisa merayakannya terpaut satu hari.",
        "next_date_prefix": "{event_name} berikutnya: ",
        "calendar_lunar_generic": "penanggalan lunar",
        "date_join": ", lalu ",
        "section_native_label": "Dalam {script_language}",
        "section_native_heading": "{event_name} dalam {script_language}",
        "section_native_intro": "Tap baris mana pun untuk menyalinnya dalam {script_language}. Ini bentuk aksara asli dari ucapan di atas; tempel langsung ke pesan, kartu, atau bio.",
        "input_label": "Nama atau pesanmu",
        "textarea_placeholder": "Ketik nama atau pesan singkat...",
        "partner_summary": "+ Tambah nama kedua",
        "partner_label": "Nama kedua",
        "partner_placeholder": "Namanya",
        "section_comp_label": "Desain",
        "section_comp_heading": "Desain teks {event_name}",
        "comp_hint": "Menampilkan “{sample}”. Ketik di kotak atas dan setiap desain langsung berubah.",
        "comp_intensity_legend": "Hiasan",
        "comp_shuffle": "Desain lain",
        "fonts_hint": "Menampilkan “{sample}”. Ketik teksmu sendiri di atas untuk mengubah setiap kartu.",
        "section_fonts_intro": "Setiap gaya di bawah menampilkan teksmu. Tap Salin pada yang kamu suka.",
        "section_phrase_label": "Mulai dari ucapan",
        "section_phrase_heading": "Mulai dari ucapan {event_name}",
        "section_phrase_intro": "Tap sebuah ucapan untuk memasukkannya ke kotak di atas. Desain dan font langsung menyesuaikan.",
        "section_handoff_label": "Jadikan sesuatu",
        "section_handoff_heading": "Lanjutkan ke alat lain",
        "section_handoff_heading_print": "Cetak atau lanjutkan",
        "section_handoff_intro": "Setiap kartu membuka alat berikutnya, dengan teksmu sudah terisi.",
        "section_emoji_intro": "Tap simbol untuk menyalinnya sendiri, atau salin satu set penuh dalam format yang kamu mau.",
        "section_about_label": "Tentang",
        "nav_heading": "Acara lainnya",
        "nav_all": "Semua acara",
        "faq_how_a": "Ketik nama atau ucapan singkat di kotak paling atas. Desain dan gaya font {event_name} di bawahnya berubah saat kamu mengetik: tap Salin di kartu mana pun, atau bagikan sebagai tautan atau gambar. Tap simbol, kaomoji, atau ASCII art untuk menyalinnya sendiri, atau tap ucapan siap pakai untuk memasukkannya ke kotak.",
        "faq_how_a_handoffs": " Kartu di bagian {handoff_heading} membuka alat yang sesuai dengan teksmu sudah terisi.",
        "feature_comp": "Desain teks {event_name}: bingkai, tumpukan hiasan, banner, dan caption bertabur simbol di sekitar teksmu",
        "feature_handoffs": "Akses satu tap ke alat cetak dan alat teks, dengan teksmu sudah terisi",
    },
    "es": {
        "breadcrumb_aria": "Ruta de navegación",
        "breadcrumb_home": "Inicio",
        "breadcrumb_events": "Eventos",
        "faq_what_is_q": "¿Qué es el generador de texto y símbolos de {event_name}?",
        "faq_when_q": "¿Cuándo es {event_name}?",
        "faq_when_a_dated": "El próximo {event_name} es el {next_date}. Después cae el "
                            "{later_dates}.",
        "faq_when_a_lunar": "{event_name} cambia cada año respecto al calendario gregoriano "
                            "porque sigue {calendar_name}, así que se adelanta unos 11 días "
                            "cada año. La fecha que aparece arriba está calculada para el año "
                            "actual; como el inicio del mes se confirma localmente por "
                            "observación de la luna, en algunos países se celebra un día antes "
                            "o después.",
        "faq_when_a": "{event_name} cae {date_window}.",
        "next_date_prefix": "Próximo {event_name}: ",
        "next_date_prefix_f": "Próxima {event_name}: ",
        "faq_when_a_dated_f": "La próxima {event_name} es el {next_date}. Después cae el "
                              "{later_dates}.",
        "calendar_lunar_generic": "un calendario lunar",
        "date_join": ", y luego el ",
        "faq_how_q": "¿Cómo uso el generador de {event_name}?",
        "faq_more_q": "¿Dónde encuentro más frases de {event_name} y qué escribir?",
        "faq_more_a": 'Consulta <a href="{href}">nuestra respuesta completa</a> para más '
                      "saludos, traducciones e ideas de mensajes.",
        "webapp_name": "Generador de Texto y Símbolos de {event_name}",
        "alt_fonts": "Fuentes de {event_name}",
        "alt_symbols": "Símbolos de {event_name}",
        "alt_textgen": "Generador de Texto de {event_name}",
        "feature_fonts": "Estilos de fuente de {event_name} en vivo para cualquier texto "
                        "que escribas",
        "feature_emoji": "Colección seleccionada de emojis y símbolos de {event_name}",
        "feature_kaomoji": "Kaomoji de {event_name}",
        "feature_ascii": "Arte ASCII seleccionado de {event_name}",
        "feature_phrase": "Banco de frases de {event_name} con estilo al toque (escritura "
                          "nativa, romanización, traducción)",
        "aka_label": "También conocido como: ",
        "section_fonts_label": "Fuentes",
        "section_fonts_heading": "Fuentes de {event_name}",
        "section_emoji_label": "Emojis y Símbolos",
        "section_emoji_heading": "Emojis y Símbolos de {event_name}",
        "section_kaomoji_label": "Kaomoji",
        "section_kaomoji_heading": "Kaomoji de {event_name}",
        "section_kaomoji_intro": "Cada ficha es un kaomoji completo — toca para copiar la "
                                 "cadena entera en un clic.",
        "section_ascii_label": "Arte ASCII",
        "section_ascii_heading": "Arte ASCII de {event_name}",
        "section_ascii_intro": "Piezas de varias líneas seleccionadas — toca Copiar para "
                               "llevarte una con sus saltos de línea y espaciado intactos.",
        "section_ascii_cta": '¿Quieres escribir tu propio nombre o mensaje en un banner de '
                             'letras en bloque en vivo? Prueba el <a href="{href}">Generador '
                             'de Arte ASCII</a>.',
        "section_native_label": "En {script_language}",
        "section_native_heading": "{event_name} en {script_language}",
        "section_native_intro": "Toca cualquier línea para copiarla en {script_language}. "
                                "Son las formas en escritura original de los saludos de "
                                "arriba — pégalas en un mensaje, tarjeta o biografía.",
        "related_heading": "Recursos Relacionados",
        "related_more_title": "Más frases y mensajes de {event_name}",
        "related_more_desc": "Saludos, traducciones e ideas de mensajes más allá del banco "
                             "de frases de arriba.",
        "related_more_fallback_name": "este evento",
        "footer_heading": "Preguntas sobre {event_name}",
        "copy_toast": "¡Copiado!",
        "input_label": "Tu nombre o mensaje",
        "textarea_placeholder": "Escribe un nombre o un mensaje corto...",
        "partner_summary": "+ Añadir un segundo nombre",
        "partner_label": "Segundo nombre (tu pareja, un amigo)",
        "partner_placeholder": "Su nombre",
        "section_comp_label": "Diseños",
        "section_comp_heading": "Diseños de texto de {event_name}",
        "comp_hint": "Mostrando “{sample}”. Escribe en el cuadro de arriba y cada diseño se actualiza.",
        "comp_intensity_legend": "Decoración",
        "comp_shuffle": "Otro diseño",
        "fonts_hint": "Mostrando “{sample}”. Escribe tu propio texto arriba para cambiar cada tarjeta.",
        "section_fonts_intro": "Cada estilo de abajo muestra tu texto. Toca Copiar en el que más te guste.",
        "section_phrase_label": "Empieza con una frase",
        "section_phrase_heading": "Empieza con una frase de {event_name}",
        "section_phrase_intro": "Toca una frase para ponerla en el cuadro de arriba. Los diseños y las fuentes la transforman al instante.",
        "section_handoff_label": "Conviértelo en algo",
        "section_handoff_heading": "Llévalo más lejos",
        "section_handoff_heading_print": "Imprímelo o llévalo más lejos",
        "section_handoff_intro": "Cada tarjeta abre la herramienta que hace lo siguiente, con tu texto ya escrito.",
        "section_emoji_intro": "Toca un símbolo para copiarlo solo, o copia un conjunto entero en el formato que quieras.",
        "section_about_label": "Sobre esta fecha",
        "nav_heading": "Más ocasiones",
        "nav_all": "Todas las ocasiones",
        "faq_how_a": "Escribe un nombre o una frase corta en el cuadro de arriba. Los diseños y estilos de fuente de {event_name} se actualizan mientras escribes: toca Copiar en cualquier tarjeta, o compártela como enlace o imagen. Toca un símbolo, kaomoji o arte ASCII para copiarlo solo, o toca una frase lista para ponerla en el cuadro.",
        "faq_how_a_handoffs": " Las tarjetas de {handoff_heading} abren la herramienta correspondiente con tu texto ya escrito.",
        "feature_comp": "Diseños de texto de {event_name}: marcos, pilas de adornos, banners y frases salpicadas alrededor de tu texto",
        "feature_handoffs": "Accesos a herramientas para imprimir y de texto, con tu texto ya escrito",
    },
}


# js/events/eventPageController.js's own small set of hardcoded English
# strings (see its `ui` doc comment) -- these are NOT part of the HTML
# STRINGS table above because they're read by the *controller* at runtime,
# not baked into static HTML. Auto-applied to window.UTG_EVENT_DATA.ui for
# any language with a table here; a spec's own "ui" field (if authored)
# always takes precedence -- see render_event_data().
JS_UI_STRINGS = {
    "en": {
        "copyButton": "Copy",
        "copyAriaPrefix": "Copy ",
        "asciiArtDefaultLabel": "ASCII art",
        "phraseGroupOther": "More",
        "shareLabel": "Share",
        "linkCopied": "Link copied",
        "copiedToast": "Copied",
        "multiLineNote": "Copied. Some apps join the lines of a banner when it goes in a bio.",
    },
    "es": {
        "copyButton": "Copiar",
        "copyAriaPrefix": "Copiar ",
        "asciiArtDefaultLabel": "Arte ASCII",
        # Heading for phrases whose spec entry carries no `group`, used only
        # when at least one other phrase in the bank does.
        "phraseGroupOther": "Más",
        "shareLabel": "Compartir",
        "linkCopied": "Enlace copiado",
        "copiedToast": "Copiado",
        "multiLineNote": "Copiado. Algunas apps juntan las líneas de un banner cuando va en una biografía.",
        # Style names shown on the font cards. The registry key stays the
        # analytics value; only the visible label is translated.
        "styleWords": {"Bold": "Negrita", "Serif": "Serif", "Italic": "Cursiva", "Script": "Caligráfica",
                       "Elegant": "Elegante", "Sparkle": "Brillante", "Cute": "Linda", "Bubble": "Burbuja",
                       "Filled": "Rellena", "Small": "Versalitas", "Caps": "", "Double-Struck": "Doble trazo",
                       "Gothic": "Gótica", "Occult": "Oculta", "Cross": "Cruz", "Strikethrough": "Tachada",
                       "Typewriter": "Máquina de escribir", "Document": ""},
    },
    "id": {
        "copyButton": "Salin",
        "copyAriaPrefix": "Salin ",
        "asciiArtDefaultLabel": "ASCII art",
        "phraseGroupOther": "Lainnya",
        "shareLabel": "Bagikan",
        "linkCopied": "Tautan disalin",
        "copiedToast": "Disalin",
        "multiLineNote": "Disalin. Beberapa aplikasi menggabungkan baris banner saat dipakai di bio.",
        "styleWords": {"Bold": "Tebal", "Serif": "Serif", "Script": "Sambung", "Elegant": "Elegan",
                       "Gothic": "Gotik", "Bubble": "Gelembung", "Filled": "Penuh", "Small": "Kapital",
                       "Caps": "Kecil", "Fullwidth": "Lebar"},
    },
}


def tr(language, key, **kwargs):
    """Look up STRINGS[language][key], falling back to STRINGS['en'][key] for
    any language/key combo that hasn't been translated yet, then .format()
    it with whatever kwargs were passed (event_name=..., href=..., ...)."""
    table = STRINGS.get(language) or {}
    template = table.get(key, STRINGS[DEFAULT_LANGUAGE].get(key, ""))
    return template.format(**kwargs) if kwargs else template


def home_href(language):
    """Relative path to the site's homepage in this language."""
    return "/" if language == DEFAULT_LANGUAGE else f"/{language}/"


def events_hub_href(language):
    """Relative path to this language's /events/ hub, or None if that hub
    doesn't exist yet (see LANGS_WITH_EVENTS_HUB) -- callers should then omit
    the middle breadcrumb crumb entirely rather than link a 404."""
    if language not in LANGS_WITH_EVENTS_HUB:
        return None
    return "/events/" if language == DEFAULT_LANGUAGE else f"/{language}/events/"


def answers_prefix(language):
    """Relative path prefix for /answers/ pages in this language."""
    return "/answers/" if language == DEFAULT_LANGUAGE else f"/{language}/answers/"


def art_slug(language, slug):
    """Asset basename for this page's hero/OG art, matching the naming that
    scripts/generate-site-art.py already produces: `events-halloween`,
    `es-events-navidad`."""
    base = f"events-{slug}"
    return base if language == DEFAULT_LANGUAGE else f"{language}-{base}"


def page_art(language, slug):
    """(og_image_url, hero_svg_path_or_None) for this page.

    The generator used to hardcode /assets/og/category.png and emit no hero
    figure, leaving wire-site-art.py to patch both in afterwards. That made
    regeneration destructive: re-running the generator on a live page silently
    downgraded its OG image to the generic one and dropped its hero. Resolving
    the art here — from files that must already exist per CLAUDE.md's
    "new pages ship with their art" rule — makes a regenerated page complete
    on its own.
    """
    stem = art_slug(language, slug)
    og_file = REPO / "assets" / "og" / f"{stem}.png"
    hero_file = REPO / "assets" / "hero" / f"{stem}.svg"
    og_url = f"{SITE}/assets/og/{stem}.png" if og_file.exists() else f"{SITE}/assets/og/category.png"
    hero = f"/assets/hero/{stem}.svg" if hero_file.exists() else None
    return og_url, hero


def events_canonical_default(language, slug):
    """Fallback canonical URL when a spec doesn't set one explicitly."""
    if language == DEFAULT_LANGUAGE:
        return f"{SITE}/events/{slug}/"
    return f"{SITE}/{language}/events/{slug}/"


def breadcrumb_chain(spec):
    """Returns [(name, absolute_url), ...] for Home [> Events] > EventName,
    skipping the middle crumb when this language has no /events/ hub yet
    (2-item breadcrumb, per the library-batch precedent)."""
    language = spec.get("language", DEFAULT_LANGUAGE)
    slug = spec["slug"]
    event_name = spec["event_name"]
    canonical = spec.get("canonical") or events_canonical_default(language, slug)

    chain = [(tr(language, "breadcrumb_home"), f"{SITE}{home_href(language)}")]
    hub = events_hub_href(language)
    if hub:
        chain.append((tr(language, "breadcrumb_events"), f"{SITE}{hub}"))
    chain.append((event_name, canonical))
    return chain


def render_hreflang(hreflang):
    """Emit <link rel="alternate" hreflang="..."> tags from the spec's
    optional 'hreflang' field: {"<lang>": "<url>", ..., "x_default": "<lang>"}.
    x_default's value is a language KEY into this same dict (e.g. "es"), not
    a URL -- so the x-default tag always points at a URL already listed
    above it. Returns "" (no tags) when the spec has no 'hreflang' field, so
    the 9 already-shipped English specs are completely unaffected."""
    if not hreflang or not isinstance(hreflang, dict):
        return ""
    lines = []
    for lang_code, url in hreflang.items():
        if lang_code == "x_default":
            continue
        lines.append(f'  <link rel="alternate" hreflang="{esc_attr(lang_code)}" href="{esc_attr(url)}">')
    x_default_lang = hreflang.get("x_default")
    if x_default_lang and hreflang.get(x_default_lang):
        lines.append(f'  <link rel="alternate" hreflang="x-default" href="{esc_attr(hreflang[x_default_lang])}">')
    return ("\n".join(lines) + "\n") if lines else ""


class SpecError(Exception):
    """Raised when a spec fails validation."""


def esc(text):
    """HTML-escape text content."""
    return html.escape(str(text), quote=False)


def esc_attr(text):
    """HTML-escape for use inside a double-quoted attribute."""
    return html.escape(str(text), quote=True)


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------
def validate_spec(spec):
    missing = [k for k in REQUIRED_TOP if k not in spec or spec[k] in (None, "")]
    if missing:
        raise SpecError(f"missing required field(s): {', '.join(missing)}")

    fonts = spec["fonts"]
    if not isinstance(fonts, dict):
        raise SpecError("fonts must be an object with a 'curated_keys' list")
    keys = fonts.get("curated_keys")
    if not isinstance(keys, list) or not keys or not all(isinstance(k, str) and k for k in keys):
        raise SpecError("fonts.curated_keys must be a non-empty list of non-empty strings")
    # eventPageController.js silently skips a key that isn't in window.textStyles,
    # so a typo (or an invented name) ships a page with a visibly empty fonts
    # section and no error anywhere. Check the names against styles.js instead.
    # An empty registry means the parse failed (styles.js changed shape); skip
    # the check rather than block every build on a broken heuristic.
    style_keys = known_style_keys()
    unknown = [k for k in keys if k not in style_keys] if style_keys else []
    if unknown:
        raise SpecError(
            "fonts.curated_keys names style(s) that don't exist in styles.js: "
            + ", ".join(repr(k) for k in unknown)
        )

    collections = spec["emoji_symbol_collections"]
    if not isinstance(collections, list) or not collections:
        raise SpecError("emoji_symbol_collections must be a non-empty list")
    for i, col in enumerate(collections):
        for key in ("name", "presentation_class", "copy_pattern", "flags"):
            if key not in col or col[key] in (None, ""):
                raise SpecError(f"emoji_symbol_collections[{i}] missing '{key}'")
        if col["presentation_class"] not in VALID_PRESENTATION_CLASSES:
            raise SpecError(
                f"emoji_symbol_collections[{i}].presentation_class must be one of "
                f"{VALID_PRESENTATION_CLASSES}, got {col['presentation_class']!r}"
            )
        if col["copy_pattern"] not in VALID_COPY_PATTERNS:
            raise SpecError(
                f"emoji_symbol_collections[{i}].copy_pattern must be one of "
                f"{VALID_COPY_PATTERNS}, got {col['copy_pattern']!r}"
            )
        if not isinstance(col["flags"], list) or not col["flags"]:
            raise SpecError(f"emoji_symbol_collections[{i}].flags must be a non-empty list")

    kaomoji = spec["kaomoji"]
    if not isinstance(kaomoji, list) or not kaomoji:
        raise SpecError("kaomoji must be a non-empty list")
    for i, k in enumerate(kaomoji):
        for key in ("text", "label"):
            if key not in k or not k[key]:
                raise SpecError(f"kaomoji[{i}] missing '{key}'")

    ascii_art = spec["ascii_art"]
    if not isinstance(ascii_art, dict):
        raise SpecError("ascii_art must be an object with an 'items' list")
    items = ascii_art.get("items")
    if not isinstance(items, list) or not items:
        raise SpecError("ascii_art.items must be a non-empty list")
    for i, a in enumerate(items):
        for key in ("art", "label"):
            if key not in a or not a[key]:
                raise SpecError(f"ascii_art.items[{i}] missing '{key}'")

    phrase_bank = spec["phrase_bank"]
    if not isinstance(phrase_bank, list) or not phrase_bank:
        raise SpecError("phrase_bank must be a non-empty list")
    for i, p in enumerate(phrase_bank):
        if not p.get("text"):
            raise SpecError(f"phrase_bank[{i}] missing 'text'")
        # native_script / romanization / translation are OPTIONAL. They used to
        # be required, which is why the original banks padded them with copies
        # of `text` on every English-only phrase — a card that repeated itself
        # three times. A phrase in the page's own language legitimately has
        # none of them.
        if p.get("native_script") and not p.get("romanization"):
            raise SpecError(
                f"phrase_bank[{i}] has 'native_script' but no 'romanization' — "
                "a non-Latin phrase needs one so the reader can say it"
            )
        if p.get("native_script") and not p.get("needs_native_speaker_review") is True:
            if "needs_native_speaker_review" not in p:
                raise SpecError(
                    f"phrase_bank[{i}] has 'native_script' but no "
                    "'needs_native_speaker_review' flag — set it explicitly"
                )

    related = spec["related"]
    if not isinstance(related, list) or not related:
        raise SpecError("related must be a non-empty list")
    for i, rel in enumerate(related):
        for key in ("href", "title", "desc"):
            if key not in rel or not rel[key]:
                raise SpecError(f"related[{i}] missing '{key}'")

    aliases = spec.get("aliases", [])
    if aliases is not None and not isinstance(aliases, list):
        raise SpecError("aliases, if present, must be a list of strings")

    language = spec.get("language", DEFAULT_LANGUAGE)
    if not isinstance(language, str) or not language:
        raise SpecError("language, if present, must be a non-empty string")

    hreflang = spec.get("hreflang")
    if hreflang is not None:
        if not isinstance(hreflang, dict) or not hreflang:
            raise SpecError("hreflang, if present, must be a non-empty object")
        for lang_code, url in hreflang.items():
            if lang_code == "x_default":
                if url not in hreflang:
                    raise SpecError(
                        "hreflang.x_default must name another key in the same "
                        "hreflang object"
                    )
                # CLAUDE.md: x-default is ALWAYS the English canonical. A locale
                # spec pointing it at its own URL is the single most-repeated
                # hreflang bug on this site, and it propagates: the mesh fixer
                # copies whatever x-default it finds onto the EN sibling too, so
                # one bad spec silently mis-points the whole cluster. Refuse it
                # here rather than generate it and rely on an audit to catch it.
                if "en" in hreflang and url != "en":
                    raise SpecError(
                        "hreflang.x_default must be 'en' when the cluster has an "
                        f"'en' member (got {url!r}) — x-default always points at "
                        "the English canonical, never at a locale URL"
                    )
                continue
            if not isinstance(url, str) or not url:
                raise SpecError(f"hreflang[{lang_code!r}] must be a non-empty URL string")


# --------------------------------------------------------------------------
# Rendering helpers
# --------------------------------------------------------------------------
_CAPS = None


def load_capabilities():
    global _CAPS
    if _CAPS is None:
        _CAPS = json.loads(CAPABILITIES_PATH.read_text(encoding="utf-8"))
    return _CAPS


def capability_on(spec, cid):
    """True when the spec's experience enables capability `cid`. A spec with no
    experience block (a legacy or new draft) enables only what it has data for,
    which is what the generator rendered before the capability system."""
    exp = spec.get("experience")
    if not exp:
        return True
    value = exp.get("capabilities", {}).get(cid)
    return value is True or (isinstance(value, dict) and value.get("enabled") is True)


def resolved_handoffs(spec, caps):
    """The spec's hand-offs with each target's definition attached, minus any
    whose kind is switched off. The definition travels with the page so the
    browser builds the URL from the same parameter names the build did."""
    exp = spec.get("experience") or {}
    targets = caps["handoff_targets"]
    out = []
    for h in exp.get("handoffs", []):
        target = targets[h["target"]]
        cid = caps["handoff_kinds"][target["kind"]]
        if not capability_on(spec, cid):
            continue
        if target["kind"] in caps["printable_kinds"] and not capability_on(spec, "printable_handoffs"):
            continue
        item = dict(h)
        item["targetDef"] = {k: target[k] for k in ("path", "text_param", "max_len", "kind") if k in target}
        out.append(item)
    return out


def build_event_data(spec, caps):
    """The inline window.UTG_EVENT_DATA object the controller reads."""
    language = spec.get("language", DEFAULT_LANGUAGE)
    exp = spec.get("experience") or {}
    collections = [
        {
            "name": c["name"],
            "flags": c["flags"],
            "defaultFormat": c.get("defaultFormat", "inline"),
        }
        for c in spec["emoji_symbol_collections"]
    ]
    event_data = {
        "slug": spec["slug"],
        "language": language,
        "eventName": spec["event_name"],
        "aliases": spec.get("aliases", []),
        "samplePhrase": exp.get("sample_text") or spec.get("sample_phrase", spec["event_name"]),
        "analyticsLabel": exp.get("analytics_label") or spec["slug"],
        "fonts": {"curatedKeys": spec["fonts"]["curated_keys"]},
        "emojiCollections": {
            "containerId": "eventEmojiGrids",
            "groups": collections,
        },
        "kaomoji": [
            {"text": k["text"], "label": k["label"]} for k in spec["kaomoji"]
        ],
        "asciiArt": [
            {"art": a["art"], "label": a["label"]} for a in spec["ascii_art"]["items"]
        ],
        # Only emit the optional keys a phrase actually has. Entries that are
        # English-only carry no native_script/romanization, and shipping them
        # as copies of `text` (which the original 8-entry banks did) is what
        # made every card render the same words three times.
        "phraseBank": [
            {
                k: v
                for k, v in (
                    ("text", p["text"]),
                    ("nativeScript", p.get("native_script")),
                    ("romanization", p.get("romanization")),
                    ("translation", p.get("translation")),
                    ("group", p.get("group")),
                )
                if v
            }
            for p in spec["phrase_bank"]
        ],
        "phraseDisplay": exp.get("phrase_display", "cards"),
        "inputs": exp.get("inputs", ["text"]),
    }
    if exp.get("compositions") and capability_on(spec, "compositions"):
        comp = json.loads(json.dumps(exp["compositions"]))
        if not capability_on(spec, "intensity"):
            comp["intensity"]["control"] = False
        if not capability_on(spec, "multi_input"):
            comp.pop("couple", None)
        event_data["compositions"] = comp
    handoffs = resolved_handoffs(spec, caps)
    if handoffs:
        event_data["handoffs"] = handoffs

    ui = dict(JS_UI_STRINGS.get(DEFAULT_LANGUAGE, {}))
    ui.update(JS_UI_STRINGS.get(language, {}))
    if spec.get("ui"):
        ui.update(spec["ui"])
    event_data["ui"] = ui
    return event_data


def prerender_payload(event_data):
    """Static HTML for every section, from the shipped browser modules run in
    Node (scripts/lib/event-prerender.js). Raises if Node fails: a page whose
    payload silently came out empty is the defect this step exists to fix."""
    result = subprocess.run(
        ["node", str(SCRIPT_DIR / "lib" / "event-prerender.js")],
        input=json.dumps(event_data, ensure_ascii=False),
        capture_output=True, text=True, cwd=REPO,
    )
    if result.returncode != 0:
        raise SpecError(f"event pre-render failed: {result.stderr.strip()[:400]}")
    return json.loads(result.stdout)


PRE_BEGIN = "<!-- BEGIN prerendered event payload: generated by scripts/generate_event_page_from_spec.py, do not edit -->"
PRE_END = "<!-- END prerendered event payload -->"


def pre(html_fragment):
    """Wrap a pre-rendered fragment in the markers the payload gate looks for."""
    return f"{PRE_BEGIN}{html_fragment}{PRE_END}"


def section_block(sid, label, heading, intro, body, extra_class="", heading_id=None):
    hid = f' id="{heading_id}"' if heading_id else ""
    intro_html = f'\n    <p class="editorial-intro">{intro}</p>' if intro else ""
    return f"""
  <section class="editorial-section{extra_class}" id="{sid}"{f' aria-labelledby="{heading_id}"' if heading_id else ''}>
    <span class="article-section-label">{label}</span>
    <h2{hid}>{heading}</h2>{intro_html}
{body}
  </section>

  <div class="section-divider"></div>
"""


def render_sections(spec, caps, payload, event_data, faq_html):
    """Every main-column section, in the order the spec's experience names,
    each gated on its capability. A spec without an experience block keeps the
    order the generator always used."""
    language = spec.get("language", DEFAULT_LANGUAGE)
    exp = spec.get("experience") or {}
    event_name = spec["event_name"]
    en = esc(event_name)
    companion = spec.get("companion_answer_slug")
    sample = event_data["samplePhrase"]
    order = exp.get("sections") or ["intro", "phrases", "native", "fonts", "symbols", "kaomoji", "ascii", "related", "faq"]
    blocks = {}

    if "compositions" in event_data:
        comp = event_data["compositions"]
        controls = ""
        if comp["intensity"].get("control"):
            labels = comp["intensity"].get("labels") or ["1", "2", "3"]
            radios = "".join(
                f'<label class="event-intensity-option"><input type="radio" name="eventIntensity" value="{i + 1}"'
                f'{" checked" if i + 1 == comp["intensity"]["default"] else ""}><span>{esc(lab)}</span></label>'
                for i, lab in enumerate(labels)
            )
            controls = (
                '\n    <div class="event-comp-controls">'
                f'<fieldset class="event-intensity"><legend class="event-intensity-legend">{tr(language, "comp_intensity_legend")}</legend>{radios}</fieldset>'
                f'<button type="button" class="event-shuffle" id="eventShuffle">{tr(language, "comp_shuffle")}</button>'
                "</div>"
            )
        note = ""
        if exp.get("script_note"):
            note = f'\n    <p class="u-secondary-tight u-mt-15">{tr(language, "comp_script_note")}</p>'
        hint = tr(language, "comp_hint", sample=esc(sample))
        body = (
            f"{controls}\n"
            f'    <p class="event-hint" id="eventCompHint" data-sample-template="{esc_attr(tr(language, "comp_hint", sample="{sample}"))}">{hint}</p>\n'
            f'    <div class="event-comp-grid" id="eventCompGrid" aria-live="polite">{pre(payload.get("compositions", ""))}</div>{note}'
        )
        blocks["compositions"] = section_block(
            "eventCompSection", tr(language, "section_comp_label"),
            tr(language, "section_comp_heading", event_name=en), None, body,
            " event-comp-section", "eventCompHeading")

    if capability_on(spec, "native_greetings") and payload.get("native") and spec.get("native_script_language"):
        script_language = spec["native_script_language"]
        heading = spec.get("native_section_heading") or tr(
            language, "section_native_heading", event_name=en, script_language=esc(script_language))
        blocks["native"] = section_block(
            "eventNativeSection", tr(language, "section_native_label", script_language=esc(script_language)),
            heading, tr(language, "section_native_intro", script_language=esc(script_language)),
            f'    <div class="glyph-grid" id="eventNativeGrid">{pre(payload["native"])}</div>')

    if capability_on(spec, "styled_fonts"):
        hint = tr(language, "fonts_hint", sample=esc(sample))
        blocks["fonts"] = section_block(
            "eventFontsSection", tr(language, "section_fonts_label"),
            tr(language, "section_fonts_heading", event_name=en), tr(language, "section_fonts_intro"),
            f'    <p class="event-hint" id="eventFontsHint" data-sample-template="{esc_attr(tr(language, "fonts_hint", sample="{sample}"))}">{hint}</p>\n'
            f'    <div class="results-grid" id="eventFontsGrid">{pre(payload.get("fonts", ""))}</div>')

    if capability_on(spec, "seed_phrases") and payload.get("phrases"):
        cta = ""
        if companion and capability_on(spec, "related_answers") and spec.get("phrase_cta"):
            href = f"{answers_prefix(language)}{esc_attr(companion)}/"
            cta = '\n    <p class="u-secondary-tight u-mt-15">' + spec["phrase_cta"].replace("{href}", href) + "</p>"
        blocks["phrases"] = section_block(
            "eventPhraseSection", tr(language, "section_phrase_label"),
            tr(language, "section_phrase_heading", event_name=en), tr(language, "section_phrase_intro"),
            f'    <div id="eventPhraseGrid">{pre(payload["phrases"])}</div>{cta}')

    if event_data.get("handoffs"):
        printable = any(h["targetDef"]["kind"] in caps["printable_kinds"] for h in event_data["handoffs"])
        heading = exp.get("handoff_heading") or tr(language, "section_handoff_heading_print" if printable else "section_handoff_heading")
        blocks["handoffs"] = section_block(
            "eventHandoffSection", tr(language, "section_handoff_label"), heading,
            tr(language, "section_handoff_intro"),
            f'    <div class="event-handoff-grid" id="eventHandoffGrid">{pre(payload["handoffs"])}</div>')

    if capability_on(spec, "occasion_symbols") and payload.get("symbols"):
        emoji_heading = spec.get("emoji_section_heading") or tr(language, "section_emoji_heading", event_name=en)
        cta = ('\n    <p class="u-secondary-tight u-mt-15">' + spec["emoji_section_cta"] + "</p>") if spec.get("emoji_section_cta") else ""
        blocks["symbols"] = section_block(
            "eventEmojiSection", tr(language, "section_emoji_label"), emoji_heading,
            tr(language, "section_emoji_intro"),
            f'    <div class="glyph-grid event-symbol-tiles" id="eventSymbolTiles">{pre(payload.get("symbolTiles", ""))}</div>\n'
            f'    <div id="eventEmojiGrids">{pre(payload["symbols"])}</div>{cta}')

    if capability_on(spec, "emoji_kaomoji") and payload.get("kaomoji"):
        blocks["kaomoji"] = section_block(
            "eventKaomojiSection", tr(language, "section_kaomoji_label"),
            tr(language, "section_kaomoji_heading", event_name=en), tr(language, "section_kaomoji_intro"),
            f'    <div class="glyph-grid" id="eventKaomojiGrid">{pre(payload["kaomoji"])}</div>')

    if capability_on(spec, "ascii_art") and payload.get("ascii"):
        blocks["ascii"] = section_block(
            "eventAsciiSection", tr(language, "section_ascii_label"),
            tr(language, "section_ascii_heading", event_name=en), tr(language, "section_ascii_intro"),
            f'    <div class="art-piece-grid" id="eventAsciiGrid">{pre(payload["ascii"])}</div>\n'
            f'    <p class="u-secondary-tight u-mt-15">{tr(language, "section_ascii_cta", href="/ascii-art-generator/")}</p>')

    blocks["intro"] = f"""
  <section class="editorial-section" id="eventAboutSection">
    <span class="article-section-label">{tr(language, "section_about_label")}</span>
    <div class="editorial-block">
      <p>{esc(spec["intro"])}</p>
    </div>
    <div class="block-example">
      <strong>{en}:</strong> {esc(spec["date_window"])}
    </div>
  </section>

  <div class="section-divider"></div>
"""

    related_html = render_related(
        spec["related"], companion if capability_on(spec, "related_answers") else None, event_name, language,
        spec.get("companion_answer_title"), spec.get("companion_answer_desc"),
    )
    blocks["related"] = f"""
  <section class="editorial-section">
    <span class="article-section-label">{tr(language, "related_heading")}</span>
    <div class="compare-grid">
{related_html}
    </div>
  </section>
"""

    if capability_on(spec, "occasion_navigation") and exp.get("related_occasions"):
        links = []
        for slug in exp["related_occasions"]:
            other = load_spec_by_stem(slug)
            if not other:
                continue
            emoji = ((other.get("experience") or {}).get("compositions") or {}).get("theme", {}).get("icon", "")
            links.append(
                f'      <a class="event-nav-link" href="{esc_attr(page_path(other))}">'
                f'<span aria-hidden="true">{esc(emoji)}</span> {esc((other.get("experience") or {}).get("nav_label") or other["event_name"])}</a>'
            )
        hub = events_hub_href(language)
        if hub:
            links.append(f'      <a class="event-nav-link event-nav-hub" href="{hub}">{tr(language, "nav_all")}</a>')
        blocks["nav"] = f"""
  <nav class="editorial-section event-nav" aria-label="{esc_attr(tr(language, "nav_heading"))}">
    <span class="article-section-label">{tr(language, "nav_heading")}</span>
    <div class="event-nav-row">
{chr(10).join(links)}
    </div>
  </nav>
"""

    blocks["faq"] = f"""
  <section class="editorial-section event-faq" id="eventFaqSection">
    <h2 class="faq-category">{tr(language, "footer_heading", event_name=en)}</h2>
{faq_html}
  </section>
"""
    return "".join(blocks.get(name, "") for name in order)


def gendered(spec, key):
    """Pick a grammatically-agreeing string variant.

    Spanish (and most non-English targets) inflect the article and adjective
    with the event noun's gender: "el próximo Halloween" but "la próxima
    Navidad". A spec sets "gender": "f" and the "_f" variant is used where one
    exists; everything falls back to the masculine/default form.
    """
    if spec.get("gender") == "f":
        return key + "_f"
    return key


_STYLE_KEYS = None


def known_style_keys():
    """Every key in window.textStyles, read straight out of styles.js.

    Parsed rather than executed: styles.js is a browser file with no module
    exports, and the registry's keys are all quoted top-level properties of the
    one object literal. Returns an empty set if the shape ever changes, so a
    parse failure degrades to "skip the check" rather than blocking every build.
    """
    global _STYLE_KEYS
    if _STYLE_KEYS is None:
        try:
            source = (REPO / "styles.js").read_text(encoding="utf-8")
            import re as _re
            _STYLE_KEYS = set(
                _re.findall(r"""^\s*['"]([^'"]+)['"]\s*:\s*\{""", source, _re.M)
            )
        except OSError:
            _STYLE_KEYS = set()
    return _STYLE_KEYS


def when_answer(spec, language, event_name):
    """The "When is X?" answer.

    This used to end with "Check a current calendar for the exact date, then
    come back and style your greeting for it" — on every event page, against
    the single biggest query cluster these pages touch (calendar/date intent).
    Telling the reader to go look somewhere else is the one thing a page
    answering "when is X" must not do.

    Three shapes, by what can honestly be asserted:
      - deterministic rule  -> the real next date, plus the two after it
      - lunar/observed rule -> how the date moves and why it varies locally;
        the concrete date is filled in by js/events/eventDates.js from ICU
      - no rule             -> the spec's own date_window prose, minus the
        instruction to leave
    """
    occurrence = spec.get("occurrence")
    dates = next_occurrences(occurrence) if occurrence else []
    if dates:
        later = [format_date(d, language) for d in dates[1:3]]
        answer = tr(
            language, gendered(spec, "faq_when_a_dated"),
            event_name=event_name,
            next_date=format_date(dates[0], language),
            later_dates=(tr(language, "date_join").join(later) if later else format_date(dates[0], language)),
        )
        # A spec may append a caveat to its own dated answer. Diwali needs one:
        # its dates come from a table, and regional traditions observe it a day
        # either side depending on when the tithi falls locally. Stating a bare
        # date there would be more precise than the fact actually is.
        note = (spec.get("date_note") or "").strip()
        if note:
            answer = f"{answer} {note}"
        return answer
    if is_lunar(occurrence):
        # "lunar" covers two different mechanisms. Only the Islamic calendar is
        # confirmed by local moon sighting; the Chinese lunisolar calendar is
        # computed. Saying otherwise on a Chinese New Year page states a fact
        # about the wrong calendar.
        key = ("faq_when_a_lunisolar"
               if occurrence.get("type") == "chinese" else "faq_when_a_lunar")
        return tr(
            language, key,
            event_name=event_name,
            calendar_name=occurrence.get(
                "calendar_name",
                tr(language, "calendar_lunar_generic"),
            ),
        )
    return tr(language, "faq_when_a", event_name=event_name, date_window=spec["date_window"])


def how_answer(spec, language, event_name):
    """The "How do I use it?" answer, describing what this page actually has."""
    answer = tr(language, "faq_how_a", event_name=event_name)
    exp = spec.get("experience") or {}
    if exp.get("handoffs") and resolved_handoffs(spec, load_capabilities()):
        printable = any(
            load_capabilities()["handoff_targets"][h["target"]]["kind"] in load_capabilities()["printable_kinds"]
            for h in exp["handoffs"])
        heading = exp.get("handoff_heading") or tr(
            language, "section_handoff_heading_print" if printable else "section_handoff_heading")
        answer += tr(language, "faq_how_a_handoffs", handoff_heading=f"“{heading}”")
    return answer


def synthesize_faq(spec):
    """Build FAQ Q&A from the spec's own fields — no separate 'faq' field
    needs to be authored; every event page gets a valid, accurate FAQPage."""
    language = spec.get("language", DEFAULT_LANGUAGE)
    event_name = spec["event_name"]
    faqs = [
        {
            "q": tr(language, "faq_what_is_q", event_name=event_name),
            "a": html.unescape(spec["intro"]),
        },
        {
            "q": tr(language, "faq_when_q", event_name=event_name),
            "a": when_answer(spec, language, event_name),
        },
        {
            "q": tr(language, "faq_how_q", event_name=event_name),
            "a": how_answer(spec, language, event_name),
        },
    ]
    if spec.get("companion_answer_slug"):
        href = f"{SITE}{answers_prefix(language)}{esc_attr(spec['companion_answer_slug'])}/"
        # A spec may phrase this one itself. The generated version ("Where can I
        # find more X phrases…") is a serviceable default, but some events have
        # a sharper question worth keeping — New Year's is "What should I
        # actually write in a New Year's message?" — and regenerating used to
        # overwrite it with the default, in the visible FAQ and the JSON-LD
        # together.
        faqs.append({
            "q": spec.get("faq_more_q") or tr(language, "faq_more_q", event_name=event_name),
            "a": (spec["faq_more_a"].replace("{href}", href)
                  if spec.get("faq_more_a")
                  else tr(language, "faq_more_a", href=href)),
        })
    return faqs


def render_ld_json(spec, faqs):
    language = spec.get("language", DEFAULT_LANGUAGE)
    slug = spec["slug"]
    event_name = spec["event_name"]
    canonical = spec.get("canonical") or events_canonical_default(language, slug)
    aliases = spec.get("aliases") or []

    alt_names = []
    for name in list(aliases) + [
        tr(language, "alt_fonts", event_name=event_name),
        tr(language, "alt_symbols", event_name=event_name),
        tr(language, "alt_textgen", event_name=event_name),
    ]:
        if name and name not in alt_names:
            alt_names.append(name)
    alt_names = alt_names[:8]

    ld_webapp = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": tr(language, "webapp_name", event_name=event_name),
        "alternateName": alt_names,
        "url": canonical,
        "inLanguage": language,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any",
        "description": html.unescape(spec["hero_tagline"]),
        "featureList": [
            *([tr(language, "feature_comp", event_name=event_name)] if capability_on(spec, "compositions") and (spec.get("experience") or {}).get("compositions") else []),
            tr(language, "feature_fonts", event_name=event_name),
            tr(language, "feature_emoji", event_name=event_name),
            tr(language, "feature_kaomoji", event_name=event_name),
            tr(language, "feature_ascii", event_name=event_name),
            tr(language, "feature_phrase", event_name=event_name),
            *([tr(language, "feature_handoffs")] if resolved_handoffs(spec, load_capabilities()) else []),
        ],
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "image": page_art(language, slug)[0],
    }

    ld_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": language,
        "mainEntity": [
            {
                "@type": "Question",
                "name": html.unescape(f["q"]),
                "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
            }
            for f in faqs
        ],
    }

    chain = breadcrumb_chain(spec)
    ld_breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": html.unescape(name),
                "item": url,
            }
            for i, (name, url) in enumerate(chain)
        ],
    }

    dump = lambda obj: json.dumps(obj, indent=2, ensure_ascii=False)
    return dump(ld_webapp), dump(ld_faq), dump(ld_breadcrumb)


def render_faq_html(faqs):
    items = []
    for f in faqs:
        items.append(
            '    <div class="faq-item">\n'
            '      <button class="faq-question" type="button">'
            f'{esc(f["q"])}'
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
            'stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" '
            'stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>\n'
            f'      <div class="faq-answer">{f["a"]}</div>\n'
            "    </div>"
        )
    return "\n".join(items)


def render_related(related, companion_answer_slug, event_name=None, language=DEFAULT_LANGUAGE,
                   companion_title=None, companion_desc=None):
    cards = []
    for rel in related:
        cards.append(
            f'    <a href="{esc_attr(rel["href"])}" '
            'class="compare-card variant-muted u-no-underline">\n'
            f'      <h4>{esc(rel["title"])}</h4>\n'
            f'      <p>{esc(rel["desc"])}</p>\n'
            "    </a>"
        )
    if companion_answer_slug:
        name = event_name or tr(language, "related_more_fallback_name")
        href = f"{answers_prefix(language)}{esc_attr(companion_answer_slug)}/"
        # A spec may name the companion answer explicitly. The generic
        # "More <event> phrases & wording" fallback is fine for a card whose
        # answer page has no distinct angle, but several answers do (Christmas's
        # is about saying it in other languages, New Year's is about what to
        # write) — and regenerating those pages used to overwrite the specific
        # copy with the generic line.
        title = companion_title or tr(language, "related_more_title", event_name=esc(name))
        desc = companion_desc or tr(language, "related_more_desc")
        cards.append(
            f'    <a href="{href}" '
            'class="compare-card variant-muted u-no-underline">\n'
            f'      <h4>{title}</h4>\n'
            f'      <p>{desc}</p>\n'
            "    </a>"
        )
    return "\n".join(cards)


def render_page(spec):
    language = spec.get("language", DEFAULT_LANGUAGE)
    slug = spec["slug"]
    event_name = spec["event_name"]
    title = spec["title"]
    meta = spec["meta_description"]
    canonical = spec.get("canonical") or events_canonical_default(language, slug)
    aliases = spec.get("aliases") or []
    companion_answer_slug = spec.get("companion_answer_slug")

    caps = load_capabilities()
    faqs = synthesize_faq(spec)
    ld_webapp, ld_faq, ld_breadcrumb = render_ld_json(spec, faqs)
    event_data = build_event_data(spec, caps)
    payload = prerender_payload(event_data)
    event_data_json = json.dumps(event_data, indent=2, ensure_ascii=False).replace("</", "<\\/")
    faq_html = render_faq_html(faqs)
    sections_html = render_sections(spec, caps, payload, event_data, faq_html)
    exp = spec.get("experience") or {}
    analytics_label = esc_attr(event_data["analyticsLabel"])

    # Optional second input (the couple line). Collapsed behind a disclosure
    # so the page leads with one box; never written to the URL or analytics.
    partner_html = ""
    if "partner" in event_data.get("inputs", []) and "couple" in event_data.get("compositions", {}):
        partner_html = (
            '\n        <details class="event-partner" id="eventPartnerWrap">'
            f'<summary>{tr(language, "partner_summary")}</summary>'
            f'<label class="event-partner-label" for="eventPartnerInput">{tr(language, "partner_label")}</label>'
            f'<input type="text" class="event-partner-input" id="eventPartnerInput" maxlength="60" autocomplete="off" '
            f'placeholder="{esc_attr(tr(language, "partner_placeholder"))}">'
            "</details>"
        )

    hreflang_html = render_hreflang(spec.get("hreflang"))

    aka_html = ""
    if aliases:
        aka_html = (
            f'<p class="u-secondary-tight">{tr(language, "aka_label")}'
            + ", ".join(esc(a) for a in aliases)
            + "</p>\n      "
        )

    chain = breadcrumb_chain(spec)
    crumb_parts = []
    for i, (name, url) in enumerate(chain):
        if i:
            crumb_parts.append('  <span class="breadcrumb-separator">›</span>')
        if i == len(chain) - 1:
            crumb_parts.append(f'  <span class="breadcrumb-current">{esc(name)}</span>')
        else:
            rel_href = "/" if url == f"{SITE}/" else url.replace(SITE, "", 1)
            crumb_parts.append(f'  <a href="{esc_attr(rel_href)}">{esc(name)}</a>')
    breadcrumb_nav_html = "\n".join(crumb_parts)
    # The aria-label was hardcoded English, so every locale event page shipped
    # aria-label="Breadcrumb". The es pages were repaired afterwards by
    # scripts/fix-breadcrumb-aria-label.js; the generator now gets it right itself.
    breadcrumb_aria = esc_attr(tr(language, "breadcrumb_aria"))

    cta_href = f"{SITE}{home_href(language)}"
    ascii_generator_href = "/ascii-art-generator/"

    og_image, hero_svg = page_art(language, slug)

    # Emitted here rather than left to scripts/inject-funding-choices-tag.js,
    # for the same reason as the OG art above: a regenerated page has to be
    # complete, or regeneration silently strips the consent tag off a live page.
    fc_path = SCRIPT_DIR / "data" / "funding-choices-tag.html"
    funding_choices = fc_path.read_text(encoding="utf-8").strip() + "\n" if fc_path.exists() else ""

    # Next-occurrence line under the hero tagline. Deterministic events get
    # their real dates baked in (crawlable, and correct with JS off); lunar
    # ones ship the rule and are filled in at runtime from ICU by
    # js/events/eventDates.js, which is the only place those dates can be
    # sourced honestly. An event with no rule renders no line at all.
    occurrence = spec.get("occurrence")
    upcoming = next_occurrences(occurrence) if occurrence else []
    next_date_html = ""
    if upcoming or is_lunar(occurrence):
        prefix = tr(language, gendered(spec, "next_date_prefix"), event_name=esc(event_name))
        # The template is read back with getAttribute() and written with
        # textContent (js/events/eventDates.js), so it holds plain text and is
        # escaped once, here. Built from esc(event_name) it was escaped twice,
        # and an "&" in the event name showed up on the page as "&amp;".
        prefix_text = tr(language, gendered(spec, "next_date_prefix"), event_name=event_name)
        if upcoming:
            attr = f' data-event-dates="{esc_attr(json.dumps([d.isoformat() for d in upcoming]))}"'
            body = prefix + format_date(upcoming[0], language)
            hidden = ""
        else:
            attr = f' data-occurrence="{esc_attr(json.dumps(occurrence))}"'
            body = ""
            hidden = " hidden"
        next_date_html = (
            f'\n      <p class="event-next-date" id="eventNextDate"{attr}'
            f' data-template="{esc_attr(prefix_text)}{{date}}"{hidden}>{body}</p>'
        )

    # Locale pages read their generator UI strings from i18n.js (added to the
    # live pages by 2808ea813, which regeneration used to strip).
    i18n_tag = "" if language == DEFAULT_LANGUAGE else '\n<script src="/i18n.js" defer></script>'

    hero_figure = ""
    if hero_svg:
        hero_figure = (
            '<figure class="page-hero-figure" data-uthero aria-hidden="true">\n'
            f'  <img src="{esc_attr(hero_svg)}" width="1200" height="340"\n'
            '       fetchpriority="high" alt="">\n'
            "</figure>\n"
        )

    page = f"""<!DOCTYPE html>
<html lang="{esc_attr(language)}">
<head>
{funding_choices}  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
  new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  }})(window,document,'script','dataLayer','GTM-P55HXK8Q');</script>
  <!-- End Google Tag Manager -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8242324164413945"
       crossorigin="anonymous"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>{esc(title)}</title>
  <meta name="description" content="{esc_attr(meta)}">
  <link rel="canonical" href="{esc_attr(canonical)}">
{hreflang_html}  <meta property="og:title" content="{esc_attr(title)}">
  <meta property="og:description" content="{esc_attr(meta)}">
  <meta property="og:url" content="{esc_attr(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:alt" content="{esc_attr(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc_attr(title)}">
  <meta name="twitter:description" content="{esc_attr(meta)}">
  <meta name="twitter:image" content="{og_image}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/symbol-explorer.css">

<script type="application/ld+json">
{ld_webapp}
</script>

<script type="application/ld+json">
{ld_faq}
</script>

<script type="application/ld+json">
{ld_breadcrumb}
</script>
</head>
<body>
  <script>try{{if(localStorage.getItem("darkMode")==="true")document.body.classList.add("dark-mode")}}catch(e){{}}</script>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
  <div id="shared-header"></div>
<script src="/header.js" defer></script>

<nav class="breadcrumbs" aria-label="{breadcrumb_aria}">
{breadcrumb_nav_html}
</nav>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-card">
      <h1 class="hero-headline">{esc(spec["hero_h1"])}</h1>
      <p class="hero-tagline">{esc(spec["hero_tagline"])}</p>{next_date_html}
      {aka_html}<div class="input-wrapper" id="eventTextWrap">
        <label class="sr-only" for="mainInput">{esc(tr(language, "input_label"))}</label>
        <textarea class="main-input" id="mainInput" placeholder="{esc_attr(tr(language, 'textarea_placeholder'))}" maxlength="500"></textarea>
        <span class="char-count"><span id="charCount">0</span>/500</span>
      </div>{partner_html}
    </div>
  </div>
</section>
{hero_figure}
<main class="container event-page" data-occasion="{analytics_label}" data-event-theme="{esc_attr(exp.get('theme_tone', ''))}">
{sections_html}
</main>

<footer class="footer">
  <div class="footer-inner">
  </div>
</footer>

<!-- TOAST -->
<div class="copy-toast" id="copyToast">{tr(language, "copy_toast")}</div>
<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

<script>window.UTG_EVENT_MODE = true;</script>
<script>window.UTG_EVENT_DATA = {event_data_json};
window.UTG_DECORATOR_THEMES = window.UTG_EVENT_DATA.compositions ? [window.UTG_EVENT_DATA.compositions.theme] : [];</script>
<script src="/styles.js" defer></script>
<script src="/renderer.js" defer></script>
<script src="/script.js" defer></script>{i18n_tag}
<script src="/js/decorator/decoratorEngine.js" defer></script>
<script src="/js/events/eventCompose.js" defer></script>
<script src="/js/events/eventPageController.js" defer></script>
<script src="/js/events/eventDates.js" defer></script>
<script src="/symbol-explorer.js" defer></script>
<script src="/footer.js"></script>
</body>
</html>
"""
    return page


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def resolve_spec_path(arg):
    p = Path(arg)
    if p.exists():
        return p
    candidate = SPECS_DIR / arg
    if candidate.exists():
        return candidate
    candidate = SPECS_DIR / f"{arg}.json"
    if candidate.exists():
        return candidate
    raise SpecError(f"spec file not found: {arg}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec", help="path to a JSON spec (or a slug under data/event_page_specs/)")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate and print target path without writing")
    parser.add_argument("--force", action="store_true",
                        help="overwrite an existing page")
    args = parser.parse_args(argv)

    try:
        spec_path = resolve_spec_path(args.spec)
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        validate_spec(spec)
    except SpecError as exc:
        sys.stderr.write(f"[error] {exc}\n")
        return 2
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"[error] invalid JSON in spec: {exc}\n")
        return 2

    slug = spec["slug"]
    # Mirror events_canonical_default(): a non-English spec belongs under
    # /<lang>/events/<slug>/, not /events/<slug>/. Deriving this from the
    # spec's own `language` keeps the file's location and its canonical/
    # hreflang URLs from ever disagreeing — writing an es/ page to the EN
    # path produces a page whose canonical points at a URL it doesn't occupy.
    language = spec.get("language", DEFAULT_LANGUAGE)
    if language == DEFAULT_LANGUAGE:
        out_dir = EVENTS_DIR / slug
    else:
        out_dir = REPO / language / "events" / slug
    out_path = out_dir / "index.html"

    if out_path.exists() and not args.force and not args.dry_run:
        sys.stderr.write(
            f"[error] {out_path.relative_to(REPO)} already exists; "
            "pass --force to overwrite\n"
        )
        return 3

    page = render_page(spec)

    if args.dry_run:
        print(f"[dry-run] spec OK -> would write {out_path.relative_to(REPO)} "
              f"({len(page)} bytes, fonts={len(spec['fonts']['curated_keys'])}, "
              f"emoji_collections={len(spec['emoji_symbol_collections'])}, "
              f"kaomoji={len(spec['kaomoji'])}, "
              f"ascii_art={len(spec['ascii_art']['items'])}, "
              f"phrases={len(spec['phrase_bank'])})")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page, encoding="utf-8")
    print(f"Wrote {out_path.relative_to(REPO)} "
          f"(fonts={len(spec['fonts']['curated_keys'])}, "
          f"emoji_collections={len(spec['emoji_symbol_collections'])}, "
          f"kaomoji={len(spec['kaomoji'])}, "
          f"ascii_art={len(spec['ascii_art']['items'])}, "
          f"phrases={len(spec['phrase_bank'])})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
