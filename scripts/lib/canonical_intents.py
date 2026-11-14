"""canonical_intents.py — the Python read side of data/canonical_intents.json.

The language-neutral intent model (2026-11-14) is implemented once, in
scripts/lib/intent-clusters.js; Node gates use that. Python tools that only
need to ask "which canonical intent pins this URL, and which page is its
reference?" use this module, which reads the same file and applies the same
resolution rules for a record (it does not rebuild hreflang clusters, so it
answers only for pages a record pins or names). See
docs/architecture/language-neutral-intents.md.
"""

import json
import os

SITE = "https://ultratextgen.com"
SITE_ROOT_URL = SITE + "/"
REGISTRY_REL = os.path.join("data", "canonical_intents.json")


class RegistryUnavailable(Exception):
    """The registry is missing or unparseable: callers must report UNKNOWN."""


def load(root):
    path = os.path.join(root, REGISTRY_REL)
    if not os.path.exists(path):
        raise RegistryUnavailable(f"{REGISTRY_REL} does not exist")
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except ValueError as e:
        raise RegistryUnavailable(f"{REGISTRY_REL} is not valid JSON: {e}")
    data.setdefault("intents", [])
    data.setdefault("policy", {"xDefaultFallbackOrder": ["en"]})
    return data


def norm(url):
    url = (url or "").strip().replace("http://", "https://", 1)
    return url if url.endswith("/") else url + "/"


def record_for(registry, urls):
    """The first record that pins any of `urls` (normalized), or None."""
    wanted = {norm(u) for u in urls if u}
    for rec in registry.get("intents", []):
        if wanted & {norm(u) for u in rec.get("pages", [])}:
            return rec
    return None


def url_locale(url):
    """'https://ultratextgen.com/ko/library/x/' -> 'ko'; an un-prefixed URL -> 'en'.
    Only the path's first segment is read; callers pass site URLs."""
    path = norm(url)[len(SITE) + 1:]
    first = path.split("/", 1)[0]
    if len(first) == 2 or (len(first) == 5 and first[2] == "-"):
        return first.lower()
    return "en"


def reference_page(rec):
    """The pinned page a sibling is compared against: primaryLocale member, else
    the originLocale member, else the first pinned page. Never an English page by
    assumption."""
    pages = [norm(u) for u in rec.get("pages", [])]
    for want in (rec.get("primaryLocale"), rec.get("originLocale")):
        if not want:
            continue
        for u in pages:
            if url_locale(u) == want.lower():
                return u
    return pages[0] if pages else None


def expected_x_default(rec, cluster_urls_by_lang, policy=None):
    """The x-default a member should declare, or None for "no x-default".
    cluster_urls_by_lang: {lang: url} for the members the caller knows about."""
    xd = rec.get("xDefault") if rec else None
    if xd == "none":
        return None
    if xd == "site-root":
        return SITE_ROOT_URL
    if xd:
        return norm(xd)
    order = (policy or {}).get("xDefaultFallbackOrder", ["en"])
    for lang in order:
        if lang in cluster_urls_by_lang:
            return norm(cluster_urls_by_lang[lang])
    return None


def url_to_rel(url):
    path = norm(url)[len(SITE) + 1:].rstrip("/")
    return f"{path}/index.html" if path else "index.html"
