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
        "faq_when_a": "{event_name} falls {date_window}.",
        "next_date_prefix": "Next {event_name}: ",
        "calendar_lunar_generic": "a lunar calendar",
        "date_join": ", then ",
        "faq_how_q": "How do I use the {event_name} generator?",
        "faq_how_a": "Type a name, wish, or greeting into the box at the top. Every "
                     "{event_name} font style updates live underneath it — tap Copy on any "
                     "card. Below that, tap any emoji, symbol, kaomoji, or ASCII art piece to "
                     "copy it on its own, or tap a phrase-bank card to drop a ready-made "
                     "greeting into the box and see it restyled instantly.",
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
        "textarea_placeholder": "Type a name, wish, or greeting...",
        "section_fonts_label": "Fonts",
        "section_fonts_heading": "{event_name} Fonts",
        "section_fonts_intro": "Type your text above and every style below updates live. "
                               "Tap Copy on the one you like.",
        "section_emoji_label": "Emoji &amp; Symbols",
        "section_emoji_heading": "{event_name} Emoji &amp; Symbols",
        "section_emoji_intro": "Tap any character to copy it, or copy a whole set at once "
                               "in your preferred format.",
        "section_kaomoji_label": "Kaomoji",
        "section_kaomoji_heading": "{event_name} Kaomoji",
        "section_kaomoji_intro": "Each tile is a whole kaomoji — tap to copy the full "
                                 "string in one click.",
        "section_ascii_label": "ASCII Art",
        "section_ascii_heading": "{event_name} ASCII Art",
        "section_ascii_intro": "Curated multi-line pieces — tap Copy to grab one with its "
                               "line breaks and spacing intact.",
        "section_ascii_cta": 'Want to type your own name or message into a live '
                             'block-letter banner instead? Try the <a href="{href}">ASCII '
                             'Art Generator</a>.',
        "section_phrase_label": "Wishes &amp; Messages",
        "section_phrase_heading": "{event_name} Wishes &amp; Messages",
        "section_phrase_intro": "Tap any wish to drop it into the box above — every font "
                                "below then restyles it instantly, so you can copy it "
                                "decorated in one step.",
        "cta_heading": "Transform text with Unicode fonts",
        "cta_body": "Use UltraTextGen to convert plain text into bold, italic, cursive, and "
                    "100+ other Unicode font styles — free and instant.",
        "cta_button": "Open UltraTextGen →",
        "related_heading": "Related Resources",
        "related_more_title": "More {event_name} phrases &amp; wording",
        "related_more_desc": "Greetings, translations, and message ideas beyond the phrase "
                             "bank above.",
        "related_more_fallback_name": "this event",
        "footer_heading": "{event_name} questions",
        "copy_toast": "Copied!",
    },
    "es": {
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
        "faq_how_a": "Escribe un nombre, deseo o saludo en el cuadro de arriba. Cada estilo "
                     "de fuente de {event_name} se actualiza en vivo debajo — toca Copiar en "
                     "cualquier tarjeta. Más abajo, toca cualquier emoji, símbolo, kaomoji o "
                     "arte ASCII para copiarlo por separado, o toca una tarjeta del banco de "
                     "frases para colocarla en el cuadro y verla transformada al instante.",
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
        "textarea_placeholder": "Escribe un nombre, deseo o saludo...",
        "section_fonts_label": "Fuentes",
        "section_fonts_heading": "Fuentes de {event_name}",
        "section_fonts_intro": "Escribe tu texto arriba y cada estilo de abajo se actualiza "
                               "en vivo. Toca Copiar en el que más te guste.",
        "section_emoji_label": "Emojis y Símbolos",
        "section_emoji_heading": "Emojis y Símbolos de {event_name}",
        "section_emoji_intro": "Toca cualquier carácter para copiarlo, o copia todo un "
                               "conjunto en el formato que prefieras.",
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
        "section_phrase_label": "Mensajes y Felicitaciones",
        "section_phrase_heading": "Mensajes y Felicitaciones de {event_name}",
        "section_phrase_intro": "Toca cualquier mensaje para colocarlo en el cuadro de "
                                "arriba — cada fuente de abajo lo transforma al instante, "
                                "listo para copiar.",
        "cta_heading": "Transforma texto con fuentes Unicode",
        "cta_body": "Usa UltraTextGen para convertir texto plano en negrita, cursiva y más "
                    "de 100 estilos de fuente Unicode — gratis e instantáneo.",
        "cta_button": "Abrir UltraTextGen →",
        "related_heading": "Recursos Relacionados",
        "related_more_title": "Más frases y mensajes de {event_name}",
        "related_more_desc": "Saludos, traducciones e ideas de mensajes más allá del banco "
                             "de frases de arriba.",
        "related_more_fallback_name": "este evento",
        "footer_heading": "Preguntas sobre {event_name}",
        "copy_toast": "¡Copiado!",
    },
}


# js/events/eventPageController.js's own small set of hardcoded English
# strings (see its `ui` doc comment) -- these are NOT part of the HTML
# STRINGS table above because they're read by the *controller* at runtime,
# not baked into static HTML. Auto-applied to window.UTG_EVENT_DATA.ui for
# any language with a table here; a spec's own "ui" field (if authored)
# always takes precedence -- see render_event_data().
JS_UI_STRINGS = {
    "es": {
        "showingSample": "Mostrando “{sample}” — escribe tu propio nombre, deseo o "
                          "saludo arriba.",
        "copyButton": "Copiar",
        "copyAriaPrefix": "Copiar ",
        "asciiArtDefaultLabel": "Arte ASCII",
        # Heading for phrases whose spec entry carries no `group`, used only
        # when at least one other phrase in the bank does.
        "phraseGroupOther": "Más",
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
        for key in ("text", "native_script", "romanization", "translation"):
            if key not in p or not p[key]:
                raise SpecError(f"phrase_bank[{i}] missing '{key}'")

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
def render_event_data(spec):
    """Build the inline window.UTG_EVENT_DATA object the controller reads."""
    language = spec.get("language", DEFAULT_LANGUAGE)
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
        "eventName": spec["event_name"],
        "aliases": spec.get("aliases", []),
        "samplePhrase": spec.get("sample_phrase", spec["event_name"]),
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
        "phraseBank": [
            {
                "text": p["text"],
                "nativeScript": p["native_script"],
                "romanization": p["romanization"],
                "translation": p["translation"],
            }
            for p in spec["phrase_bank"]
        ],
    }

    # An explicit spec["ui"] always wins; otherwise auto-apply this
    # language's JS_UI_STRINGS table if one exists. Nothing is emitted for
    # "en" (or any language without a table and no explicit override), so
    # the 9 already-shipped English pages get no "ui" key at all -- exactly
    # matching their pre-existing output.
    ui = spec.get("ui")
    if ui is None:
        ui = JS_UI_STRINGS.get(language)
    if ui:
        event_data["ui"] = ui

    return json.dumps(event_data, indent=2, ensure_ascii=False)


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
        return tr(
            language, gendered(spec, "faq_when_a_dated"),
            event_name=event_name,
            next_date=format_date(dates[0], language),
            later_dates=(tr(language, "date_join").join(later) if later else format_date(dates[0], language)),
        )
    if is_lunar(occurrence):
        return tr(
            language, "faq_when_a_lunar",
            event_name=event_name,
            calendar_name=occurrence.get(
                "calendar_name",
                tr(language, "calendar_lunar_generic"),
            ),
        )
    return tr(language, "faq_when_a", event_name=event_name, date_window=spec["date_window"])


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
            "a": tr(language, "faq_how_a", event_name=event_name),
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
            tr(language, "feature_fonts", event_name=event_name),
            tr(language, "feature_emoji", event_name=event_name),
            tr(language, "feature_kaomoji", event_name=event_name),
            tr(language, "feature_ascii", event_name=event_name),
            tr(language, "feature_phrase", event_name=event_name),
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

    faqs = synthesize_faq(spec)
    ld_webapp, ld_faq, ld_breadcrumb = render_ld_json(spec, faqs)
    event_data_json = render_event_data(spec)
    faq_html = render_faq_html(faqs)
    related_html = render_related(
        spec["related"], companion_answer_slug, event_name, language,
        spec.get("companion_answer_title"), spec.get("companion_answer_desc"),
    )

    # Optional per-event pointer at the companion answer, rendered under the
    # wishes section. Stored in the spec (with a {href} placeholder) rather
    # than composed here, because the useful version of this sentence is
    # event-specific — "what to say for Diwali", "what Eid Mubarak means and
    # how to reply".
    phrase_cta_html = ""
    if spec.get("phrase_cta") and companion_answer_slug:
        href = f"{answers_prefix(language)}{esc_attr(companion_answer_slug)}/"
        phrase_cta_html = (
            '\n    <p class="u-secondary-tight u-mt-15">'
            + spec["phrase_cta"].replace("{href}", href)
            + "</p>"
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
            f' data-template="{esc_attr(prefix)}{{date}}"{hidden}>{body}</p>'
        )

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

<nav class="breadcrumbs" aria-label="Breadcrumb">
{breadcrumb_nav_html}
</nav>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-card">
      <h1 class="hero-headline">{esc(spec["hero_h1"])}</h1>
      <p class="hero-tagline">{esc(spec["hero_tagline"])}</p>{next_date_html}
      {aka_html}<div class="input-wrapper" id="eventTextWrap">
        <textarea class="main-input" id="mainInput" placeholder="{esc_attr(tr(language, 'textarea_placeholder'))}" maxlength="500"></textarea>
        <span class="char-count"><span id="charCount">0</span>/500</span>
      </div>
    </div>
  </div>
</section>
{hero_figure}
<main class="container">
  <section class="editorial-section">
    <div class="editorial-block">
      <p>{esc(spec["intro"])}</p>
    </div>
    <div class="block-example">
      <strong>{esc(event_name)}:</strong> {esc(spec["date_window"])}
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventPhraseSection">
    <span class="article-section-label">{tr(language, "section_phrase_label")}</span>
    <h2>{tr(language, "section_phrase_heading", event_name=esc(event_name))}</h2>
    <p class="editorial-intro">{tr(language, "section_phrase_intro")}</p>
    <div class="compare-grid" id="eventPhraseGrid"></div>{phrase_cta_html}
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventFontsSection">
    <span class="article-section-label">{tr(language, "section_fonts_label")}</span>
    <h2>{tr(language, "section_fonts_heading", event_name=esc(event_name))}</h2>
    <p class="editorial-intro">{tr(language, "section_fonts_intro")}</p>
    <div class="results-grid" id="eventFontsGrid"></div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventEmojiSection">
    <span class="article-section-label">{tr(language, "section_emoji_label")}</span>
    <h2>{tr(language, "section_emoji_heading", event_name=esc(event_name))}</h2>
    <p class="editorial-intro">{tr(language, "section_emoji_intro")}</p>
    <div id="eventEmojiGrids"></div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventKaomojiSection">
    <span class="article-section-label">{tr(language, "section_kaomoji_label")}</span>
    <h2>{tr(language, "section_kaomoji_heading", event_name=esc(event_name))}</h2>
    <p class="editorial-intro">{tr(language, "section_kaomoji_intro")}</p>
    <div class="glyph-grid" id="eventKaomojiGrid"></div>
  </section>

  <div class="section-divider"></div>

  <section class="editorial-section" id="eventAsciiSection">
    <span class="article-section-label">{tr(language, "section_ascii_label")}</span>
    <h2>{tr(language, "section_ascii_heading", event_name=esc(event_name))}</h2>
    <p class="editorial-intro">{tr(language, "section_ascii_intro")}</p>
    <div class="art-piece-grid" id="eventAsciiGrid"></div>
    <p class="u-secondary-tight u-mt-15">{tr(language, "section_ascii_cta", href=ascii_generator_href)}</p>
  </section>

  <div class="section-divider"></div>

  <div class="cta-card">
    <h3>{tr(language, "cta_heading")}</h3>
    <p>{tr(language, "cta_body")}</p>
    <a href="{cta_href}" class="cta-btn">{tr(language, "cta_button")}</a>
  </div>

  <section class="editorial-section">
    <span class="article-section-label">{tr(language, "related_heading")}</span>
    <div class="compare-grid">
{related_html}
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <h2 class="faq-category">{tr(language, "footer_heading", event_name=esc(event_name))}</h2>
{faq_html}
  </div>
</footer>

<!-- TOAST -->
<div class="copy-toast" id="copyToast">{tr(language, "copy_toast")}</div>
<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

<script>window.UTG_EVENT_MODE = true;</script>
<script>window.UTG_EVENT_DATA = {event_data_json};</script>
<script src="/styles.js" defer></script>
<script src="/renderer.js" defer></script>
<script src="/script.js" defer></script>
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
