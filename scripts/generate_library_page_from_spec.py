#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_library_page_from_spec.py

Render a single Unicode library page from a JSON spec living in
data/library_page_specs/. The generated HTML follows the existing
/library/ page conventions exactly: GTM + ad snippets, canonical/OG/Twitter
meta, Article + BreadcrumbList JSON-LD, shared header/footer injectors,
the symbol-explorer runtime, and a #symbolToast region.

Two copy patterns are supported:

  single      Symbols are rendered as individual `.symbol-tile` buttons
              carrying `data-symbol` + `aria-label`. Clicking copies one
              character. Used for browse-and-copy reference pages.

  collection  In addition to (optional) single sections, the page emits a
              container that is populated at runtime by
              `UltraTextGen.buildGrids(containerId, GROUPS)` so visitors can
              copy a whole set in a chosen format. Used for set-oriented
              pages (zodiac signs, chess sides, etc.).

Usage
-----
  python3 scripts/generate_library_page_from_spec.py SPEC.json
  python3 scripts/generate_library_page_from_spec.py data/library_page_specs/star-symbols.json
  python3 scripts/generate_library_page_from_spec.py SPEC.json --dry-run

The script refuses to overwrite an existing page unless --force is given.
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO = SCRIPT_DIR.parent
LIBRARY_DIR = REPO / "library"
SPECS_DIR = REPO / "data" / "library_page_specs"

# The refuse-to-overwrite guard. This generator is a FULL regenerator: whatever
# it does not emit is deleted from the page it rewrites. Measured 2026-08-26
# across a 40-spec sample, 40 of 40 regressed — static footer on all 40,
# hreflang alternates on 35, social image tags on 21. It had been read as
# "probably fine" because it emits the Funding Choices tag and calls the mesh
# sync; that hook only runs for `lang != "en"` and only AFTER the write, so an
# English page loses its alternates outright. See scripts/lib/generator_parity.py.
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from lib.generator_parity import assert_no_regression  # noqa: E402
from lib.cta_routing import DESTINATIONS as CTA_DESTINATIONS, route as cta_route  # noqa: E402

# The strings a spec is allowed to carry that are NOT a real override: they are
# the shared default, copied in. `scripts/check-spec-sentence-reuse.py` measures
# how far that spread — the `cta` line alone is byte-identical across 55 specs.
SHARED_CTA_DEFAULTS = {
    "cta": (
        "Use UltraTextGen to convert plain text into bold, italic, cursive, "
        "and 100+ other Unicode font styles. Free and instant."
    ),
    "cta_h3": "Transform text with Unicode fonts",
    "cta_button_text": "Open UltraTextGen →",
    "cta_button_href": None,
}

SITE = "https://ultratextgen.com"

REQUIRED_TOP = [
    "slug",
    "title",
    "meta_description",
    "hero_h1",
    "hero_tagline",
    "intro",
    "copy_pattern",
    "sections",
    "related",
]


class SpecError(Exception):
    """Raised when a spec fails validation."""


def funding_choices_tag():
    """Google Funding Choices (ad-blocking recovery) tag.

    Read from scripts/data/funding-choices-tag.html — the single source of
    truth shared with scripts/inject-funding-choices-tag.js, so the generator
    and the injector can never emit different snippets. Every page on the site
    is required to carry it (scripts/check-funding-choices.js enforces this);
    omitting it here is what produced the 66-page locale-library backlog that
    the injector then had to sweep up after the fact.
    """
    snippet_path = SCRIPT_DIR / "data" / "funding-choices-tag.html"
    try:
        return snippet_path.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise SpecError(
            f"cannot read the Funding Choices tag at {snippet_path}: {exc}. "
            "Generated pages would fail scripts/check-funding-choices.js."
        ) from exc


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

    pattern = spec["copy_pattern"]
    if pattern not in ("single", "collection", "art"):
        raise SpecError(
            f"copy_pattern must be 'single', 'collection' or 'art', got {pattern!r}"
        )

    sections = spec["sections"]
    if not isinstance(sections, list) or len(sections) < 1:
        raise SpecError("sections must be a non-empty list")

    for i, sec in enumerate(sections):
        items_key = "art" if pattern == "art" else "symbols"
        for key in ("id", "h2", items_key):
            if key not in sec:
                raise SpecError(f"sections[{i}] missing '{key}'")
        if not isinstance(sec[items_key], list) or not sec[items_key]:
            raise SpecError(f"sections[{i}].{items_key} must be a non-empty list")
        if pattern == "art":
            for j, piece in enumerate(sec["art"]):
                for key in ("label", "art"):
                    if key not in piece or piece[key] in (None, ""):
                        raise SpecError(f"sections[{i}].art[{j}] missing '{key}'")
            continue
        for j, sym in enumerate(sec["symbols"]):
            if "char" not in sym or sym["char"] in (None, ""):
                raise SpecError(f"sections[{i}].symbols[{j}] missing 'char'")
            if "label" not in sym or sym["label"] in (None, ""):
                raise SpecError(f"sections[{i}].symbols[{j}] missing 'label'")

    # The validator downstream requires at least 3 H2s. Each section is one
    # H2; a collection section adds one more.
    h2_count = len(sections) + (1 if pattern == "collection" else 0)
    if h2_count < 3:
        raise SpecError(
            f"need at least 3 H2 sections (have {h2_count}); add more sections"
        )

    if pattern == "collection":
        collections = spec.get("collections")
        if not isinstance(collections, list) or not collections:
            raise SpecError(
                "copy_pattern 'collection' requires a non-empty 'collections' list"
            )
        for i, col in enumerate(collections):
            if "name" not in col or not col["name"]:
                raise SpecError(f"collections[{i}] missing 'name'")
            flags = col.get("flags")
            if not isinstance(flags, list) or not flags:
                raise SpecError(f"collections[{i}].flags must be a non-empty list")

    related = spec["related"]
    if not isinstance(related, list) or not related:
        raise SpecError("related must be a non-empty list")
    for i, rel in enumerate(related):
        for key in ("href", "title", "desc"):
            if key not in rel or not rel[key]:
                raise SpecError(f"related[{i}] missing '{key}'")


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------
# Per-locale UI-string defaults for pages built via this pipeline. Every
# field falls back to the existing English wording when a locale is absent,
# so English specs (and any locale not yet listed here) render exactly as
# before. Values were sourced from already-shipped, real pages in each
# locale (not invented) wherever a generator-built precedent existed, and
# a plain natural translation of the English default otherwise.
LOCALE_UI_STRINGS = {
    "pt": {"copy": "Copiar", "related": "Recursos Relacionados", "cta_h3": "Transforme texto com fontes Unicode", "cta_body": "Use o UltraTextGen para transformar texto comum em negrito, itálico, cursiva e mais de 100 estilos de fonte Unicode. Grátis e na hora.", "cta_btn": "Abrir o UltraTextGen →", "home": "Início", "symbols": "Símbolos", "library": "Biblioteca"},
    "de": {"copy": "Kopieren", "related": "Verwandte Ressourcen", "cta_h3": "Text mit Unicode-Schriftarten verwandeln", "cta_body": "Mit UltraTextGen verwandelst du normalen Text in fett, kursiv, Schreibschrift und über 100 weitere Unicode-Schriftstile. Kostenlos und sofort.", "cta_btn": "UltraTextGen öffnen →", "home": "Startseite", "symbols": "Symbole", "library": "Bibliothek"},
    "fr": {"copy": "Copier", "related": "Ressources liées", "cta_h3": "Transformez votre texte avec des polices Unicode", "cta_body": "Utilise UltraTextGen pour transformer du texte brut en gras, italique, cursive et plus de 100 autres styles de police Unicode. Gratuit et instantané.", "cta_btn": "Ouvrir UltraTextGen →", "home": "Accueil", "symbols": "Symboles", "library": "Bibliothèque"},
    "tr": {"copy": "Kopyala", "related": "İlgili Kaynaklar", "cta_h3": "Metni Unicode fontlarla dönüştür", "cta_body": "UltraTextGen ile düz metni kalın, italik, el yazısı ve 100’den fazla Unicode yazı stiline anında ve ücretsiz çevir.", "cta_btn": "UltraTextGen'i Aç →", "home": "Ana Sayfa", "symbols": "Semboller", "library": "Kütüphane"},
    "it": {"copy": "Copia", "related": "Risorse Correlate", "cta_h3": "Trasforma il testo con i font Unicode", "cta_body": "Con UltraTextGen trasformi il testo normale in grassetto, corsivo, scrittura corsiva e oltre 100 altri stili di font Unicode. Gratis e all'istante.", "cta_btn": "Apri UltraTextGen →", "home": "Home", "symbols": "Simboli", "library": "Libreria"},
    "es": {"copy": "Copiar", "related": "Recursos Relacionados", "cta_h3": "Transforma texto con fuentes Unicode", "cta_body": "Usa UltraTextGen para convertir texto normal en negrita, cursiva, caligrafía y más de 100 estilos de fuente Unicode. Gratis y al instante.", "cta_btn": "Abrir UltraTextGen →", "home": "Inicio", "symbols": "Símbolos", "library": "Biblioteca"},
    "pl": {"copy": "Kopiuj", "related": "Powiązane Zasoby", "cta_h3": "Zamień tekst na czcionki Unicode", "cta_body": "Skorzystaj z generatora UltraTextGen, aby zamienić zwykły tekst na pogrubiony, kursywą, gotycki i dziesiątki innych stylów Unicode. Za darmo i od razu.", "cta_btn": "Otwórz UltraTextGen →", "home": "Strona główna", "symbols": "Symbole", "library": "Biblioteka"},
    # nl cta_btn is deliberately NOT "Open UltraTextGen →": that string is
    # byte-identical to the English default, so check-locale-translation.js
    # counts it as untranslated English surviving on a Dutch page. Use a real
    # Dutch label instead (matches the hand-written labels already on /nl/).
    "nl": {"copy": "Kopiëren", "related": "Gerelateerde Bronnen", "cta_h3": "Zet tekst om met Unicode-lettertypes", "cta_body": "Gebruik UltraTextGen om platte tekst om te zetten in vet, cursief, sierlijk en meer dan 100 andere Unicode-lettertypes. Gratis en direct.", "cta_btn": "Open de tekstgenerator →", "home": "Home", "symbols": "Symbolen", "library": "Bibliotheek"},
    "vi": {"copy": "Sao chép", "related": "Tài Nguyên Liên Quan", "cta_h3": "Chuyển đổi văn bản bằng phông chữ Unicode", "cta_body": "Dùng UltraTextGen để biến văn bản thường thành chữ đậm, nghiêng, thư pháp và hơn 100 kiểu phông chữ Unicode khác. Miễn phí và tức thì.", "cta_btn": "Mở UltraTextGen →", "home": "Trang chủ", "symbols": "Ký hiệu", "library": "Thư viện"},
    "fi": {"copy": "Kopioi", "related": "Aiheeseen liittyvät sivut", "cta_h3": "Muunna teksti Unicode-fonteilla", "cta_body": "UltraTextGenillä muunnat tavallisen tekstin lihavoiduksi, kursivoiduksi, kaunokirjoitukseksi ja yli sadaksi muuksi Unicode-fonttityyliksi — ilmaiseksi ja heti.", "cta_btn": "Avaa UltraTextGen →", "home": "Etusivu", "symbols": "Symbolit", "library": "Kirjasto"},
    # Values below match the chrome already used by these locales' hand-authored
    # library pages (breadcrumbs, "related" label, copy aria-label, CTA button),
    # so generated and hand-authored pages read the same inside one locale.
    "ar": {"copy": "نسخ", "related": "صفحات ذات صلة", "cta_h3": "حوّل النص بخطوط يونيكود", "cta_body": "استخدم UltraTextGen لتحويل النص العادي إلى خط عريض ومائل وخط يد وأكثر من 100 نمط يونيكود آخر، مجاناً وفوراً.", "cta_btn": "افتح UltraTextGen →", "home": "الرئيسية", "symbols": "الرموز", "library": "المكتبة"},
    "ru": {"copy": "Копировать", "related": "Похожие страницы", "cta_h3": "Преобразите текст с помощью Unicode-шрифтов", "cta_body": "Используйте UltraTextGen, чтобы превратить обычный текст в жирный, курсивный, рукописный и 100+ других стилей Unicode. Бесплатно и мгновенно.", "cta_btn": "Открыть UltraTextGen →", "home": "Главная", "symbols": "Символы", "library": "Библиотека"},
    "ja": {"copy": "コピー", "related": "関連ページ", "cta_h3": "Unicodeフォントでテキストを変換", "cta_body": "UltraTextGen なら、普通のテキストを太字・斜体・筆記体など100種類以上のUnicodeフォントスタイルに変換できます。無料ですぐに使えます。", "cta_btn": "UltraTextGenを開く →", "home": "ホーム", "symbols": "記号", "library": "ライブラリ"},
    # zh-TW was missing entirely, so every Traditional-Chinese page fell back to
    # English chrome ("Copy", "Related Resources") while its 23 live siblings
    # carry proper Chinese. Caught 2026-08-10 on the iphone-emojis batch.
    "zh-TW": {"copy": "複製", "related": "相關頁面", "cta_h3": "用 Unicode 字體轉換文字", "cta_body": "用 UltraTextGen 把純文字轉換成粗體、斜體、花體等 100 多種 Unicode 字體，免費、即時。", "cta_btn": "開啟 UltraTextGen →", "home": "首頁", "symbols": "符號", "library": "符號庫"},
    "ko": {"copy": "복사", "related": "관련 페이지", "cta_h3": "유니코드 폰트로 텍스트를 변환해보세요", "cta_body": "UltraTextGen을 쓰면 평범한 텍스트가 볼드체, 필기체 등 100가지가 넘는 유니코드 스타일로 무료로 즉시 바뀝니다.", "cta_btn": "UltraTextGen 열기 →", "home": "홈", "symbols": "기호", "library": "라이브러리"},
    "th": {"copy": "คัดลอก", "related": "หน้าที่เกี่ยวข้อง", "cta_h3": "แปลงข้อความด้วยฟอนต์ Unicode", "cta_body": "ใช้ UltraTextGen เปลี่ยนข้อความธรรมดาให้เป็นฟอนต์ Unicode ตัวหนา ตัวเอียง ลายมือ และอีกกว่า 100 แบบ ฟรีและทันที", "cta_btn": "เปิด UltraTextGen →", "home": "หน้าแรก", "symbols": "สัญลักษณ์", "library": "คลังสัญลักษณ์"},
    "id": {"copy": "Salin", "related": "Sumber Terkait", "cta_h3": "Ubah teks dengan font Unicode", "cta_body": "Pakai UltraTextGen buat ubah teks biasa jadi huruf tebal, miring, sambung, dan 100+ gaya Unicode lain. Gratis dan instan.", "cta_btn": "Buka UltraTextGen →", "home": "Beranda", "symbols": "Simbol", "library": "Pustaka"},
}

# Section label for the optional FAQ block, per locale. Falls back to English.
LOCALE_FAQ_LABEL = {
    "zh-TW": "常見問題",
    "pt": "Perguntas Frequentes",
    "de": "Häufige Fragen",
    "fr": "Questions fréquentes",
    "tr": "Sıkça Sorulan Sorular",
    "it": "Domande Frequenti",
    "es": "Preguntas Frecuentes",
    "pl": "Często Zadawane Pytania",
    "nl": "Veelgestelde Vragen",
    "vi": "Câu Hỏi Thường Gặp",
    "fi": "Usein kysytyt kysymykset",
    "ar": "الأسئلة الشائعة",
    "ru": "Частые вопросы",
    "ja": "よくある質問",
    "ko": "자주 묻는 질문",
    "th": "คำถามที่พบบ่อย",
    "id": "Pertanyaan Umum",
}

# ---------------------------------------------------------------------------
# Locale key normalisation.
#
# A spec's `lang` is a BCP-47 tag and BCP-47 is case-insensitive, so both
# "zh-tw" and "zh-TW" are valid and BOTH occur in data/library_page_specs/
# (33 specs lowercase, 13 with the conventional region casing). The chrome
# tables above are keyed with the conventional casing only, so a plain
# `.get(lang)` silently missed every lowercase spec and fell back to English
# — verified 2026-08-31 by rendering data/library_page_specs/zh-tw/phi-symbol.json,
# which produced aria-label="Copy 小寫 phi" and "Related Resources" while the
# live page correctly carries 複製 / 相關頁面. Nothing failed; the page just
# came out half-English, which is exactly the class of defect
# check-locale-translation.js exists to catch.
#
# `chrome_key` resolves a tag to whatever key the tables actually use;
# `url_segment` gives the directory name, which is always lowercase because
# the site serves /zh-tw/ (see the URL_SEGMENT note further down).
_CHROME_KEYS = {k.lower(): k for k in LOCALE_UI_STRINGS}
_FAQ_KEYS = {k.lower(): k for k in LOCALE_FAQ_LABEL}


def chrome_key(lang, table_keys):
    """Canonical key for `lang` in a locale table, matched case-insensitively."""
    return table_keys.get(str(lang).lower(), lang)


def art_slug(lang, page_type, slug):
    """The key scripts/generate-site-art.py uses for a page: its path with
    "/" replaced by "-". symbol/phi-symbol -> "symbol-phi-symbol";
    zh-tw/library/x -> "zh-tw-library-x". Derived here rather than passed in
    so the meta tags and the art filename cannot disagree — they did before:
    og:image was hardcoded to /logo.png, which check-new-page-image-assets.py
    rejects by name, so every generated page failed that gate on arrival."""
    base = "symbol" if page_type == "symbol" else "library"
    parts = ([] if lang == "en" else [url_segment(lang)]) + [base, slug]
    return "-".join(parts)


def url_segment(lang):
    """Directory segment for a locale. Always lowercase: the site serves /zh-tw/."""
    return str(lang).lower()



def render_faq(faq, label, heading=None):
    """Render the optional FAQ block.

    Uses the JS-free <details> disclosure variant deliberately: library pages
    load /symbol-explorer.js, never /script.js, so there is nothing to bind the
    accordion buttons — and nothing that could double-bind them later.
    The FAQPage JSON-LD is built from this same list in render_page(), so the
    visible copy and the markup cannot drift apart.
    """
    items = []
    for entry in faq:
        items.append(
            '  <details class="faq-item">\n'
            f'    <summary class="faq-question">{esc(entry["q"])}</summary>\n'
            f'    <div class="faq-answer"><p>{esc(entry["a"])}</p></div>\n'
            "  </details>"
        )
    # The house form on hand-written library pages carries a real <h2> under the
    # kicker (spec key "faq_h2"). It is optional so older specs keep their
    # current output byte-for-byte, but a page whose sibling has one needs it —
    # <h2> count is part of the translation-parity fingerprint.
    heading_html = f"  <h2>{esc(heading)}</h2>\n" if heading else ""
    return (
        '<!-- FAQ -->\n'
        '<section class="editorial-section" id="faq">\n'
        f'  <span class="article-section-label">{esc(label)}</span>\n'
        f"{heading_html}"
        + "\n".join(items)
        + "\n</section>"
    )


def render_editorial_sections(sections):
    """Render free prose sections (spec key "editorial_sections").

    Symbol grids and FAQs cover most of a library page, but some pages need a
    plain editorial block — e.g. the "how this emoji looks on each device"
    section on star-emoji/crying-emoji/crown-emoji. Before this key existed
    those had to be hand-added to the HTML after generation, which meant a
    later `--force` regenerate silently deleted them (the same class of
    silent loss the art-wiring order already causes; see
    docs/library-locale-translation-workflow.md step 6).

    `paragraphs` entries are emitted as-is so they can carry inline markup
    (<em>, <strong>, <a href>) in house style. They are author-written spec
    content, never user input.
    """
    blocks = []
    for sec in sections:
        label_html = (
            f'  <span class="article-section-label">{esc(sec["label"])}</span>\n'
            if sec.get("label")
            else ""
        )
        paras = "\n".join(f"    <p>{p}</p>" for p in sec.get("paragraphs", []))
        sid = f' id="{esc_attr(sec["id"])}"' if sec.get("id") else ""
        blocks.append(
            f'<section class="editorial-section"{sid}>\n'
            f"{label_html}"
            f'  <h2>{esc(sec["h2"])}</h2>\n'
            '  <div class="editorial-block">\n'
            f"{paras}\n"
            "  </div>\n"
            "</section>"
        )
    return '\n\n<div class="section-divider"></div>\n\n'.join(blocks)


# Locales written right-to-left. The site's own RTL content locale is Arabic;
# fa/ur/he are declared RTL in i18n.js but are not content locales today.
RTL_LANGS = {"ar", "fa", "ur", "he"}


def render_symbol_section(sec, copy_label="Copy"):
    rows = []
    for sym in sec["symbols"]:
        ch = sym["char"]
        label = sym["label"]
        rows.append(
            '    <div class="flag-row">\n'
            f'      <button class="flag-emoji symbol-tile" '
            f'data-symbol="{esc_attr(ch)}" '
            f'aria-label="{esc_attr(copy_label)} {esc_attr(label)}">{esc(ch)}</button>\n'
            f'      <span class="flag-label">{esc(label)}</span>\n'
            '    </div>'
        )
    label_html = (
        f'  <span class="article-section-label">{esc(sec["label"])}</span>\n'
        if sec.get("label")
        else ""
    )
    intro_html = (
        f'  <p class="u-secondary-tight">{esc(sec["intro"])}</p>\n'
        if sec.get("intro")
        else ""
    )
    return (
        f'<section class="mood-explainers" id="{esc_attr(sec["id"])}">\n'
        f"{label_html}"
        f'  <h2>{esc(sec["h2"])}</h2>\n'
        f"{intro_html}"
        '  <div class="flag-rows">\n'
        + "\n".join(rows)
        + "\n  </div>\n"
        "</section>"
    )


def render_art_section(sec, copy_label="Copy", copy_aria=None):
    """An `art` section: multi-line ASCII pieces in <pre>, not a symbol grid.

    The pieces themselves are language-neutral — =^..^= is a cat in every
    locale — so only the section heading and each piece's label are translated.
    The copy button is handled by the same delegated listener in
    symbol-explorer.js that the hand-written English pages use, so nothing new
    is loaded.

    The <pre> opens at column 0 on purpose: everything between the tags is
    significant whitespace, and indenting it to match the surrounding markup
    would indent the artwork.
    """
    cards = []
    for piece in sec["art"]:
        label = piece["label"]
        aria = (copy_aria or "{copy} {label}").format(copy=copy_label, label=label)
        cards.append(
            '    <div class="art-piece-card">\n'
            '      <div class="art-piece-head">\n'
            f'        <span class="art-piece-label">{esc(label)}</span>\n'
            '        <button class="art-piece-copy" type="button" '
            f'data-label="{esc_attr(label)}" '
            f'aria-label="{esc_attr(aria)}">{esc(copy_label)}</button>\n'
            "      </div>\n"
            '      <div class="art-piece-body">\n'
            f'<pre class="art-piece-pre">{esc(piece["art"])}</pre>\n'
            "      </div>\n"
            "    </div>"
        )
    label_html = (
        f'  <span class="article-section-label">{esc(sec["label"])}</span>\n'
        if sec.get("label")
        else ""
    )
    intro_html = (
        f'  <p class="u-secondary-tight">{esc(sec["intro"])}</p>\n'
        if sec.get("intro")
        else ""
    )
    return (
        f'<section class="mood-explainers" id="{esc_attr(sec["id"])}">\n'
        f"{label_html}"
        f'  <h2>{esc(sec["h2"])}</h2>\n'
        f"{intro_html}"
        '  <div class="art-piece-grid">\n'
        + "\n".join(cards)
        + "\n  </div>\n"
        "</section>"
    )


def render_collection_section(spec):
    sec = spec.get("collection_section") or {}
    cid = spec.get("collection_container_id", "collectionsContainer")
    label = sec.get("label", "Collections")
    h2 = sec.get("h2", "Symbol Sets")
    intro = sec.get(
        "intro", "Copy a full set at once in your preferred format."
    )
    return (
        f'<section class="mood-explainers" id="{esc_attr(sec.get("id", "collections"))}">\n'
        f'  <span class="article-section-label">{esc(label)}</span>\n'
        f"  <h2>{esc(h2)}</h2>\n"
        f'  <p class="u-secondary-block">{esc(intro)}</p>\n'
        f'  <div id="{esc_attr(cid)}"></div>\n'
        "</section>"
    )


def render_related(related):
    cards = []
    for rel in related:
        cards.append(
            f'    <a href="{esc_attr(rel["href"])}" '
            'class="compare-card variant-muted u-no-underline">\n'
            f'      <h4>{esc(rel["title"])}</h4>\n'
            f'      <p>{esc(rel["desc"])}</p>\n'
            "    </a>"
        )
    return "\n".join(cards)


def render_buildgrids_script(spec):
    cid = spec.get("collection_container_id", "collectionsContainer")
    groups = []
    for col in spec["collections"]:
        flags = json.dumps(col["flags"], ensure_ascii=False)
        fmt = col.get("defaultFormat", "inline")
        groups.append(
            "    {\n"
            f'      name: {json.dumps(col["name"], ensure_ascii=False)},\n'
            f"      flags: {flags},\n"
            f"      defaultFormat: {json.dumps(fmt)}\n"
            "    }"
        )
    groups_js = ",\n".join(groups)
    return (
        '<script src="/symbol-explorer.js"></script>\n'
        "<script>\n"
        'document.addEventListener("DOMContentLoaded", function () {\n'
        '  "use strict";\n'
        "  var ns = window.UltraTextGen;\n"
        "  if (!ns || !ns.buildGrids) return;\n\n"
        "  var GROUPS = [\n"
        f"{groups_js}\n"
        "  ];\n\n"
        f'  ns.buildGrids("{cid}", GROUPS);\n'
        "  if (ns.parseTwemoji) ns.parseTwemoji(document.body);\n"
        "});\n"
        "</script>"
    )


def render_page(spec):
    slug = spec["slug"]
    title = spec["title"]
    meta = spec["meta_description"]
    canonical = spec.get("canonical") or f"{SITE}/library/{slug}/"
    breadcrumb = spec.get("breadcrumb") or spec["hero_h1"]
    # Locale support (all fields default to the English behaviour, so existing
    # English specs render byte-identically).
    lang = spec.get("lang", "en")
    dir_attr = ' dir="rtl"' if lang in RTL_LANGS else ""
    ui = LOCALE_UI_STRINGS.get(chrome_key(lang, _CHROME_KEYS), {})
    default_home_url = f"{SITE}/" if lang == "en" else f"{SITE}/{url_segment(lang)}/"
    home_url = spec.get("home_url", default_home_url)
    crumb_home = spec.get("crumb_home", ui.get("home", "Home"))
    # page_type "symbol" pages sit under /symbol/ instead of /library/ and
    # carry a "Symbols" breadcrumb crumb by default.
    page_type = spec.get("page_type", "library")
    # A page may deliberately share another page's art card — three locale
    # pages do (zh-tw/symbol/invisible-character and two ms/ pages reuse the
    # English cards, whose own art is language-neutral). Without this override
    # regenerating them would repoint og:image at a PNG that does not exist,
    # turning a working page into a broken reference. Explicit beats derived
    # wherever the two disagree.
    art_key = spec.get("art_slug") or art_slug(lang, page_type, slug)
    default_crumb_library = ui.get("symbols", "Symbols") if page_type == "symbol" else ui.get("library", "Library")
    default_library_url = (
        f"{default_home_url}symbol/" if page_type == "symbol" else f"{default_home_url}library/"
    )
    crumb_library = spec.get("crumb_library", default_crumb_library)
    library_url = spec.get("library_url", default_library_url)
    copy_label = spec.get("copy_label", ui.get("copy", "Copy"))
    related_label = spec.get("related_label", ui.get("related", "Related Resources"))
    # Where the reader's next job is one the generator cannot do, the card is
    # routed to the tool that can. One owner for that decision and its copy:
    # scripts/lib/cta_routing.py, which scripts/route-cta-cards.py also reads,
    # so a regenerated page and a live page cannot disagree about this card.
    # English only by construction (no locale build of any of these tools
    # exists, and linking an English tool from a locale page is what CLAUDE.md's
    # locale-native linking rule forbids) — cta_route() returns None for every
    # <lang>/ path, so locale pages fall through to the ui defaults untouched.
    _seg = "symbol" if page_type == "symbol" else "library"
    _routed = CTA_DESTINATIONS.get(cta_route(f'{_seg}/{spec["slug"]}/index.html')) if lang == "en" else None

    def _cta_field(key, routed_key, fallback):
        """Spec override > routing default > locale/global default.

        With one carve-out that matters: 55 specs "override" `cta` with the
        SHARED DEFAULT SENTENCE, byte for byte. Treating that as a real override
        leaves a routed card with a matched heading and button above a paragraph
        about something else — verified on `cat-kaomoji`, which is exactly that
        case. A copy of the default is not an override, so routing wins over it.
        """
        value = spec.get(key)
        if isinstance(value, str) and value.strip() and value.strip() != SHARED_CTA_DEFAULTS.get(key):
            return value
        if _routed and _routed.get(routed_key):
            return _routed[routed_key]
        return value if isinstance(value, str) and value.strip() else fallback

    cta_h3 = _cta_field("cta_h3", "h3", ui.get("cta_h3", "Transform text with Unicode fonts"))
    cta_button_text = _cta_field("cta_button_text", "button", ui.get("cta_btn", "Open UltraTextGen →"))
    cta_button_href = _cta_field("cta_button_href", "href", home_url)
    hreflang_html = "".join(
        f'\n<link rel="alternate" hreflang="{esc_attr(h["lang"])}" href="{esc_attr(h["href"])}">'
        for h in spec.get("hreflang", [])
    )
    def _iso_datetime(d):
        # Google's structured-data validator flags a bare "YYYY-MM-DD" as an
        # "Invalid datetime value" / "missing a timezone" non-critical issue
        # on datePublished/dateModified. Upgrade to a full ISO-8601 datetime
        # with an explicit UTC offset; leave anything already carrying a "T"
        # (a spec that already supplies a full datetime) untouched.
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
            return f"{d}T00:00:00+00:00"
        return d

    date_pub = _iso_datetime(spec.get("date_published", "2026-01-01"))
    date_mod = _iso_datetime(spec.get("date_modified", spec.get("date_published", "2026-01-01")))
    cta = _cta_field("cta", "cta", SHARED_CTA_DEFAULTS["cta"])

    # JSON-LD must use real (entity-decoded) strings; json.dumps handles escaping.
    ld_article = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": html.unescape(title),
            "description": html.unescape(meta),
            "author": {
                "@type": "Organization",
                "name": "UltraTextGen",
                "url": f"{SITE}/",
            },
            "publisher": {
                "@type": "Organization",
                "name": "UltraTextGen",
                "url": f"{SITE}/",
            },
            "mainEntityOfPage": canonical,
            "datePublished": date_pub,
            "dateModified": date_mod,
        },
        indent=2,
        ensure_ascii=False,
    )
    ld_breadcrumb = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": crumb_home,
                    "item": home_url,
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": crumb_library,
                    "item": library_url,
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": html.unescape(breadcrumb),
                    "item": canonical,
                },
            ],
        },
        indent=2,
        ensure_ascii=False,
    )

    # Optional free-prose sections, rendered between the symbol grids and the FAQ.
    editorial = spec.get("editorial_sections") or []
    editorial_html = (
        f"\n\n<div class=\"section-divider\"></div>\n\n{render_editorial_sections(editorial)}"
        if editorial
        else ""
    )

    # Optional FAQ — visible block and FAQPage JSON-LD are built from the same
    # spec list, so a page can never ship schema for Q&A it doesn't render.
    faq = spec.get("faq") or []
    faq_label = spec.get(
        "faq_label",
        LOCALE_FAQ_LABEL.get(chrome_key(lang, _FAQ_KEYS), "Frequently Asked Questions"),
    )
    faq_h2 = spec.get("faq_h2")
    faq_html = (
        f"\n\n<div class=\"section-divider\"></div>\n\n{render_faq(faq, faq_label, faq_h2)}"
        if faq
        else ""
    )
    ld_faq_html = ""
    if faq:
        ld_faq = json.dumps(
            {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": html.unescape(entry["q"]),
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": html.unescape(entry["a"]),
                        },
                    }
                    for entry in faq
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
        ld_faq_html = f'\n\n<script type="application/ld+json">\n{ld_faq}\n</script>'

    # Section bodies
    if spec["copy_pattern"] == "art":
        art_aria = spec.get("copy_aria_template") or ui.get("copyArt")
        section_blocks = [render_art_section(s, copy_label, art_aria)
                          for s in spec["sections"]]
    else:
        section_blocks = [render_symbol_section(s, copy_label) for s in spec["sections"]]
    if spec["copy_pattern"] == "collection":
        section_blocks.append(render_collection_section(spec))
    body_sections = "\n\n<div class=\"section-divider\"></div>\n\n".join(section_blocks)

    related_html = render_related(spec["related"])

    if spec["copy_pattern"] == "collection":
        runtime_scripts = render_buildgrids_script(spec)
    else:
        runtime_scripts = '<script src="/symbol-explorer.js"></script>'

    page = f"""<!DOCTYPE html>
<html lang="{lang}"{dir_attr}>
<head>
{funding_choices_tag()}
  <!-- Google Tag Manager -->
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

<link rel="canonical" href="{esc_attr(canonical)}">{hreflang_html}
<meta property="og:image" content="{SITE}/assets/og/{art_key}.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc_attr(title)}">
<meta name="twitter:description" content="{esc_attr(meta)}">
<meta name="twitter:image" content="{SITE}/assets/og/{art_key}.png">
<meta property="og:title" content="{esc_attr(title)}">
<meta property="og:description" content="{esc_attr(meta)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{esc_attr(canonical)}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Mono&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/symbol-explorer.css">

<script type="application/ld+json">
{ld_article}
</script>

<script type="application/ld+json">
{ld_breadcrumb}
</script>{ld_faq_html}
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
<script src="/header.js"></script>

<!-- HERO -->
<section class="hero">
  <div class="hero-inner">
    <h1 class="hero-headline">{esc(spec["hero_h1"])}</h1>
    <p class="hero-tagline">{esc(spec["hero_tagline"])}</p>
  </div>
</section>

<!-- INTRO -->
<section class="editorial-section">
  <div class="editorial-block">
    <p>{esc(spec["intro"])}</p>
  </div>
</section>

<div class="section-divider"></div>

{body_sections}{editorial_html}{faq_html}

<!-- CTA -->
<div class="cta-card">
  <h3>{esc(cta_h3)}</h3>
  <p>{esc(cta)}</p>
  <a href="{esc_attr(cta_button_href)}" class="cta-btn">{esc(cta_button_text)}</a>
</div>

<!-- RELATED -->
<section class="editorial-section">
  <span class="article-section-label">{esc(related_label)}</span>
  <div class="compare-grid">
{related_html}
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="footer-inner">
  </div>
</footer>

<!-- TOAST -->
<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

{runtime_scripts}
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
    parser.add_argument("spec", help="path to a JSON spec (or a slug under data/library_page_specs/)")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate and print target path without writing")
    parser.add_argument("--force", action="store_true",
                        help="overwrite an existing page")
    parser.add_argument("--force-stale", action="store_true", dest="force_stale",
                        help="write even if the live page carries content this "
                             "generator would delete (prints what it overrides)")
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
    # Localized specs (lang != "en") render under <lang>/<base>/<slug>/.
    # page_type "symbol" routes to /symbol/ instead of /library/.
    lang = spec.get("lang", "en")
    base_folder = "symbol" if spec.get("page_type", "library") == "symbol" else "library"
    # The hreflang code is not always the directory name: zh-TW is the correct
    # hreflang code but every live Traditional-Chinese URL on this site is
    # /zh-tw/. Writing to REPO/zh-TW/ created a second, unlinked URL space —
    # caught 2026-08-10 on the iphone-emojis batch. `url_segment` lowercases
    # every tag, which covers zh-TW and any future region-subtagged locale;
    # it is the same helper render_page() uses for the home-crumb URL, so the
    # written path and the linked path cannot drift apart.
    seg = url_segment(lang)
    out_dir = (REPO / seg / base_folder / slug) if lang != "en" else (REPO / base_folder / slug)
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
              f"({len(page)} bytes, pattern={spec['copy_pattern']})")
        return 0

    # Refuse to overwrite a live page that carries something this run would
    # delete. Runs after --dry-run returns, so a dry run stays read-only, and
    # before mkdir so a refusal creates nothing.
    assert_no_regression([(out_path, page)], force=args.force_stale)

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page, encoding="utf-8")
    print(f"Wrote {out_path.relative_to(REPO)} "
          f"(pattern={spec['copy_pattern']}, "
          f"sections={len(spec['sections'])})")

    if lang != "en" and not os.environ.get("SKIP_LOCALE_MESH_HOOK"):
        _sync_locale_mesh(out_path)

    if not os.environ.get("SKIP_LAST_MILE_HOOK"):
        return _last_mile(out_path, spec, art_key_for(spec))

    return 0


def art_key_for(spec):
    """The art-registry key this spec's page will use."""
    return spec.get("art_slug") or art_slug(
        spec.get("lang", "en"), spec.get("page_type", "library"), spec["slug"])


def _register_art(spec, key):
    """Add this page to data/generated_page_art.json so generate-site-art.py
    will draw it. Without this the art script refuses the slug outright
    ("no registered page matches"), which is why every generated page used to
    ship with an og:image nobody had rendered.

    Never overwrites an existing entry — a page someone has art-directed by
    hand keeps its own card.
    """
    path = REPO / "data" / "generated_page_art.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        data = {"entries": {}}
    entries = data.setdefault("entries", {})
    if key in entries or spec.get("art_slug"):
        return False
    tiles = [sym.get("char") for sec in spec.get("sections", [])
             for sym in (sec.get("symbols") or []) if sym.get("char")]
    entries[key] = {
        "title": spec.get("hero_h1") or spec["slug"],
        "sub": spec.get("hero_tagline", "")[:70],
        "glyphs": tiles[:5],
        "kicker": "SYM" if spec.get("page_type") == "symbol" else "LIB",
        "added": spec.get("date_published", ""),
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def _run(cmd, label, timeout=300):
    """Run one last-mile step. Returns True on success; never raises."""
    try:
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, timeout=timeout)
        if r.returncode != 0:
            sys.stderr.write(f"[last-mile] {label} FAILED (exit {r.returncode})\n")
            if r.stderr.strip():
                sys.stderr.write("    " + r.stderr.strip().splitlines()[-1] + "\n")
            return False
        return True
    except FileNotFoundError:
        sys.stderr.write(f"[last-mile] {label} SKIPPED — interpreter not on PATH\n")
        return False
    except subprocess.TimeoutExpired:
        sys.stderr.write(f"[last-mile] {label} TIMED OUT\n")
        return False


def _last_mile(out_path, spec, key):
    """Everything a generated page needs before it can pass CI.

    A page used to be written and then declared done, while failing three
    gating checks on arrival: og:image pointed at /logo.png (rejected by name),
    the footer was an empty shell, and no hub listed the page. Each fix lived
    in a separate script somebody had to remember, in order. The generator's
    own success message was therefore indistinguishable from a finished job —
    the same failure shape this repo has recorded three times in its CI.

    So: run the steps here, and if any of them fails, say so and exit non-zero.
    A half-generated page must never look like a successful one.
    """
    rel = out_path.relative_to(REPO).as_posix()
    steps = []

    steps.append(("art registry", _register_art(spec, key) or True))
    steps.append(("art render", _run(
        ["python3", "scripts/generate-site-art.py", "--only", key], f"art for {key}")))
    steps.append(("static footer", _run(
        ["node", "scripts/build-static-footer.js", "--write"], "static footer bake")))

    failed = [name for name, ok in steps if not ok]
    print(f"\nLast mile for {rel}:")
    for name, ok in steps:
        print(f"  {'ok  ' if ok else 'FAIL'} {name}")

    # Hub registration is deliberately NOT automated: which hub a page belongs
    # to, and where in it, is an editorial call the spec does not carry. It is
    # named here so it cannot be forgotten silently.
    print(f"  todo  hub registration — add {rel} to its locale's library/symbol hub,")
    print("        then: npm run check:library-hub-coverage")

    if failed:
        sys.stderr.write(
            f"\n[error] {len(failed)} last-mile step(s) failed: {', '.join(failed)}.\n"
            "        The page is written but NOT shippable — it will fail CI.\n"
            "        Fix the step above, or re-run with SKIP_LAST_MILE_HOOK=1 if\n"
            "        you are deliberately deferring it.\n")
        return 1
    return 0


def _sync_locale_mesh(out_path):
    """Phase-0 mesh-automation hook: best-effort, in-place hreflang +
    locale-native-link rewrite for the page just written, via
    scripts/sync-locale-mesh.js --fix --files <path> (see CLAUDE.md, "Locale
    Parent Governance" and docs/locale-parent-governance.md).

    This is the first generator wired to the mesh-automation hook — the
    flagship Core, script-independent pillar (library/symbol pages are
    literally the FR /symbol/ lane the gap-check tooling exists to catch).
    Other generators (answers, events, printables) should get the same hook
    the next time they're touched; this pass only wires this one.

    Deliberately best-effort: a missing `node` binary or a failing sync
    script must never break page generation itself, so any failure here is
    reported as a warning and swallowed rather than raised.
    """
    rel_path = out_path.relative_to(REPO).as_posix()
    try:
        result = subprocess.run(
            ["node", "scripts/sync-locale-mesh.js", "--fix", "--files", rel_path],
            cwd=REPO, capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            sys.stderr.write(
                f"[warn] scripts/sync-locale-mesh.js --fix --files {rel_path} "
                f"exited {result.returncode}; continuing without mesh sync.\n"
            )
            if result.stderr:
                sys.stderr.write(result.stderr)
        else:
            print(f"Synced locale mesh for {rel_path} (scripts/sync-locale-mesh.js --fix).")
    except FileNotFoundError:
        sys.stderr.write(
            "[warn] `node` not found on PATH; skipped scripts/sync-locale-mesh.js "
            f"--fix --files {rel_path}. Run it by hand before opening the PR.\n"
        )
    except subprocess.TimeoutExpired:
        sys.stderr.write(
            f"[warn] scripts/sync-locale-mesh.js --fix --files {rel_path} timed out; "
            "continuing without mesh sync. Run it by hand before opening the PR.\n"
        )
    except Exception as exc:  # noqa: BLE001 - best-effort by design, never break generation
        sys.stderr.write(
            f"[warn] scripts/sync-locale-mesh.js hook failed ({exc}); "
            "continuing without mesh sync. Run it by hand before opening the PR.\n"
        )


if __name__ == "__main__":
    raise SystemExit(main())
