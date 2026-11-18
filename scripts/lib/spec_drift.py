"""spec_drift.py — the ONE definition of "a library spec and its live page disagree".

Used by scripts/audit-spec-drift.py (whole-site dashboard), scripts/check-spec-drift.py
(the delta gate) and scripts/check_locale_spec.py (tile counts against a reference page).
Never restate any of this elsewhere.

WHY THIS EXISTS
---------------
data/library_page_specs/ is the source a page is generated from and the source every
locale expansion is translated from. Measured 2026-11-18, 146 of 1,616 specs no longer
matched their own live page and nothing recorded why: pages had been repaired, extended
or de-duplicated by hand and the spec never followed. A stale spec does two kinds of
damage, both silent:

  * regenerating the page deletes whatever the spec lacks (the generator's overwrite
    guard covered footer, hreflang, art and FAQ placement, not tiles);
  * a locale translated from the spec ships short. es/library/emojis-graciosos shipped
    35 of its English parent's 75 tiles because the English spec carried 40 combos in a
    field the generator never read.

THE RULE (owner decision 2026-11-18)
  * A page that is not localized (its intent's origin or reference page) has no reason
    to differ from its spec. It must match. No exception is accepted for it.
  * A localized page may differ from its spec only when it was further localized for
    that language; the divergence is recorded in data/spec_drift_exceptions.json.
  * A page needs a spec before it is localized: the reference page of every locale spec
    must itself be generated from a spec.

WHAT IS COMPARED
  The copy tiles: every `.symbol-tile` button's data-symbol (what the reader copies) and
  its visible label, against the spec's `sections[].combos` and `sections[].symbols`.
  Excluded, because another generator owns them and they are not authored in the spec:
  the pre-rendered collection and flag grids (marked BEGIN/END prerendered blocks) and
  the symbol-page hero tile (`symbol-hero-tile`).

  Characters are compared as a multiset (order is presentation); labels are compared per
  character. A finding is one of:

    page-only     the page copies a character the spec does not list
    spec-only     the spec lists a character the page does not copy
    label         same character, different visible label
"""

import html as htmlmod
import io
import json
import os
import re
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SPEC_DIR_REL = os.path.join("data", "library_page_specs")
EXCEPTIONS_REL = os.path.join("data", "spec_drift_exceptions.json")
TEMPLATE_NAME = "_TEMPLATE.example.json"

PRERENDERED_RE = re.compile(
    r"<!--\s*BEGIN prerendered (?:country flags|collections)\b[\s\S]*?"
    r"<!--\s*END prerendered (?:country flags|collections)\s*-->"
)
TILE_RE = re.compile(r"<button\b([^>]*\bsymbol-tile\b[^>]*)>[\s\S]*?</button>\s*"
                     r"(?:<span class=\"flag-label\">([\s\S]*?)</span>)?")
DATA_SYMBOL_RE = re.compile(r'\bdata-symbol="([^"]*)"')
CLASS_RE = re.compile(r'\bclass="([^"]*)"')


class Unknown(Exception):
    """An input could not be read: callers report UNKNOWN and exit non-zero, never 0."""


# --- locating specs and pages ------------------------------------------------

def spec_files(root=ROOT):
    """Every spec, top level and per-locale subfolders, sorted. The per-locale folders
    (data/library_page_specs/<lang>/*.json) were invisible to check_locale_spec.py's
    --all-locale until 2026-11-18: 904 of 1,222 locale specs."""
    base = os.path.join(root, SPEC_DIR_REL)
    if not os.path.isdir(base):
        raise Unknown(f"{SPEC_DIR_REL} does not exist")
    out = []
    for dirpath, _dirs, files in os.walk(base):
        for f in files:
            if f.endswith(".json") and f != TEMPLATE_NAME:
                out.append(os.path.relpath(os.path.join(dirpath, f), root))
    return sorted(out)


def url_segment(lang):
    # Same rule the generator uses: zh-TW is the hreflang code, /zh-tw/ the directory.
    return (lang or "en").lower()


def page_rel_for(spec):
    """The page a spec generates, as a repo-relative path (mirrors the generator)."""
    lang = spec.get("lang") or "en"
    base = "symbol" if spec.get("page_type", "library") == "symbol" else "library"
    slug = spec.get("slug")
    if not slug:
        return None
    if lang == "en":
        return f"{base}/{slug}/index.html"
    return f"{url_segment(lang)}/{base}/{slug}/index.html"


def load_json_text(text, label):
    try:
        return json.loads(text)
    except ValueError as e:
        raise Unknown(f"{label}: unparseable JSON ({e})")


def read(root, rel):
    with io.open(os.path.join(root, rel), encoding="utf-8") as fh:
        return fh.read()


def spec_by_page(root=ROOT):
    """{page_rel: spec_rel} for every spec. A page claimed by two specs is reported by
    the audit, never silently resolved."""
    out = {}
    for rel in spec_files(root):
        spec = load_json_text(read(root, rel), rel)
        page = page_rel_for(spec)
        if page:
            out.setdefault(page, []).append(rel)
    return out


# --- tiles -------------------------------------------------------------------

def spec_tiles(spec):
    """[(char, label)] the spec asks the page to render, combos first per section, the
    order the generator emits them."""
    out = []
    for sec in spec.get("sections") or []:
        for item in (sec.get("combos") or []) + (sec.get("symbols") or []):
            if item.get("char"):
                out.append((item["char"], item.get("label", "")))
    return out


def live_tiles(page_html):
    """[(char, label)] the page renders, outside generator-owned blocks."""
    s = PRERENDERED_RE.sub("", page_html)
    out = []
    for m in TILE_RE.finditer(s):
        attrs, label = m.group(1), m.group(2)
        cls = CLASS_RE.search(attrs)
        if cls and "symbol-hero-tile" in cls.group(1).split():
            continue
        ds = DATA_SYMBOL_RE.search(attrs)
        if not ds:
            continue
        out.append((htmlmod.unescape(ds.group(1)),
                    htmlmod.unescape(re.sub(r"<[^>]+>", "", label or "")).strip()))
    return out


def compare(spec, page_html):
    """{'page_only': [...chars], 'spec_only': [...chars], 'label': [(char, spec_label, page_label)]}"""
    st, lt = spec_tiles(spec), live_tiles(page_html)
    sc, lc = Counter(c for c, _ in st), Counter(c for c, _ in lt)
    page_only = sorted((lc - sc).elements())
    spec_only = sorted((sc - lc).elements())
    spec_labels, page_labels = {}, {}
    for c, l in st:
        spec_labels.setdefault(c, l)
    for c, l in lt:
        page_labels.setdefault(c, l)
    label = sorted((c, spec_labels[c], page_labels[c]) for c in spec_labels
                   if c in page_labels and _norm_label(spec_labels[c]) != _norm_label(page_labels[c]))
    return {"page_only": page_only, "spec_only": spec_only, "label": label,
            "spec_count": len(st), "page_count": len(lt)}


def _norm_label(s):
    return re.sub(r"\s+", " ", htmlmod.unescape(s or "")).strip()


def has_drift(result, labels=True):
    return bool(result["page_only"] or result["spec_only"] or (labels and result["label"]))


def spec_tile_count(spec):
    return len(spec_tiles(spec))


def live_tile_count(page_html):
    return len(live_tiles(page_html))


# --- classification (the audit's buckets) -------------------------------------

def classify(spec, result):
    """A short cause name for the audit. Mechanical, so a reviewer starts from the
    likely cause rather than the raw diff; never used to excuse anything."""
    import unicodedata
    po, so = Counter(result["page_only"]), Counter(result["spec_only"])
    if not po and not so:
        return "label-only" if result["label"] else "match"
    nfc = lambda c: Counter(unicodedata.normalize("NFC", x) for x in c.elements())
    if po and so and nfc(po) == nfc(so):
        return "code-point"          # the spec holds the NFC form, the page the intended one
    if po and so and Counter(htmlmod.unescape(x) for x in so.elements()) == po:
        return "escaping"            # the spec holds an entity where the page copies the character
    if so and not po:
        chars = [c for c, _ in spec_tiles(spec)]
        if any(n > 1 for n in Counter(chars).values()):
            return "spec-duplicate"  # the page was de-duplicated, the spec was not
        return "spec-only"
    if po and not so:
        return "page-only"
    return "both"


# --- origin / localized -------------------------------------------------------

def _hreflang_map(spec):
    return {h.get("lang"): h.get("href") for h in spec.get("hreflang") or [] if h.get("lang")}


def reference_url(spec, root=ROOT, registry=None):
    """The URL of the page this spec's page is localized from, or None when the page IS
    the reference (an origin page, or a page with no siblings). Mirrors
    check_locale_spec.py: the English member when the cluster has one, else the
    canonical intent's reference page."""
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    import canonical_intents as ci  # noqa: E402

    lang = spec.get("lang") or "en"
    canon = ci.norm(spec.get("canonical") or "")
    hl = _hreflang_map(spec)
    if lang == "en":
        return None
    if "en" in hl:
        return ci.norm(hl["en"])
    reg = registry if registry is not None else ci.load(root)
    members = [v for k, v in hl.items() if k != "x-default"]
    rec = ci.record_for(reg, members + [canon])
    if not rec:
        return None
    ref = ci.reference_page(rec)
    return None if ref == canon else ref


def is_localized(spec, root=ROOT, registry=None):
    return reference_url(spec, root, registry) is not None


# --- exceptions ---------------------------------------------------------------

def load_exceptions(root=ROOT, text=None):
    """{spec_rel: entry}. Shape:
       {"exceptions": [{"spec": "data/library_page_specs/es/x.json",
                         "page_only": ["…"], "spec_only": ["…"], "labels": true|false,
                         "reason": "…", "decided_by": "…", "decided_on": "YYYY-MM-DD"}]}
    An entry excuses exactly the characters it names: drift beyond them still fails."""
    if text is None:
        path = os.path.join(root, EXCEPTIONS_REL)
        if not os.path.exists(path):
            raise Unknown(f"{EXCEPTIONS_REL} does not exist")
        text = read(root, EXCEPTIONS_REL)
    data = load_json_text(text, EXCEPTIONS_REL)
    out = {}
    for e in data.get("exceptions", []):
        for key in ("spec", "reason", "decided_by", "decided_on"):
            if not e.get(key):
                raise Unknown(f"{EXCEPTIONS_REL}: an entry is missing '{key}'")
        out[e["spec"]] = e
    return out


def apply_exception(result, entry):
    """The drift left after an exception entry is subtracted."""
    if not entry:
        return result
    po = Counter(result["page_only"]) - Counter(entry.get("page_only", []))
    so = Counter(result["spec_only"]) - Counter(entry.get("spec_only", []))
    return dict(result, page_only=sorted(po.elements()), spec_only=sorted(so.elements()),
                label=[] if entry.get("labels") else result["label"])
