#!/usr/bin/env python3
"""dump_en_parent_structure.py — read an EN library/symbol page's real structure.

WHY
---
A locale spec must carry the SAME tiles as its live EN parent — check_locale_spec.py
enforces exactly that, and it compares against the live HTML, not the EN spec,
because the EN specs go stale (`id-simbol-medis` shipped 16 tiles against a live
parent's 20 for precisely this reason, and `punctuation-symbols` has 3 sections in
its spec and 7 live).

So this reads the LIVE page first and falls back to the spec only for fields the
HTML doesn't carry. Output is JSON: sections, each with its heading and its
[char, label] tiles, ready to be translated on top of.

  python3 scripts/dump_en_parent_structure.py library/angry-emoji
  python3 scripts/dump_en_parent_structure.py --list library/angry-emoji library/sad-emoji
"""

import argparse
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def txt(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
          .replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " "))
    return re.sub(r"\s+", " ", s).strip()


def dump(rel):
    path = os.path.join(ROOT, rel, "index.html")
    if not os.path.exists(path):
        return {"parent": rel, "error": "no live page"}
    html = io.open(path, encoding="utf-8", errors="replace").read()

    out = {
        "parent": rel,
        "title": txt((re.search(r"<title>(.*?)</title>", html, re.S) or ["", ""])[1]),
        "h1": txt((re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S) or ["", ""])[1]),
        "meta_description": txt((re.search(r'<meta name="description" content="(.*?)"', html, re.S) or ["", ""])[1]),
        "sections": [],
    }

    # Split on <section>/<h2> boundaries, then collect the tiles inside each.
    parts = re.split(r'(<h2[^>]*>.*?</h2>)', html, flags=re.S)
    cur = None
    for chunk in parts:
        m = re.match(r"<h2[^>]*>(.*?)</h2>", chunk, re.S)
        if m:
            cur = {"h2": txt(m.group(1)), "symbols": []}
            out["sections"].append(cur)
            continue
        if cur is None:
            continue
        # House markup is:
        #   <button class="… symbol-tile" data-symbol="X" aria-label="Copy Label">X</button>
        #   <span class="flag-label">Label</span>
        # The label lives in the SIBLING span, not inside the tile — reading only
        # the tile's own children is what returned zero for every page on the
        # first attempt. aria-label is the reliable fallback when the span is
        # absent (some pages render tiles without a visible caption).
        for m in re.finditer(
                r'<button[^>]*class="[^"]*symbol-tile[^"]*"[^>]*?'
                r'data-symbol="([^"]*)"[^>]*?(?:aria-label="([^"]*)")?[^>]*>.*?</button>'
                r'(?:\s*<span class="flag-label">(.*?)</span>)?',
                chunk, re.S):
            char, aria, span = m.group(1), m.group(2) or "", m.group(3) or ""
            label = txt(span) or re.sub(r"^Copy\s+", "", txt(aria))
            cur["symbols"].append([char, label])

    out["sections"] = [s for s in out["sections"] if s["symbols"]]
    out["tile_total"] = sum(len(s["symbols"]) for s in out["sections"])

    # FAQ questions the EN page already renders (so a translation can mirror or extend)
    out["en_faq"] = [txt(q) for q in re.findall(
        r'class="[^"]*faq-question[^"]*"[^>]*>(.*?)</(?:button|summary)>', html, re.S)]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("parents", nargs="+", help="e.g. library/angry-emoji")
    ap.add_argument("--list", action="store_true", help="summary table instead of full JSON")
    a = ap.parse_args()

    results = [dump(p.strip("/")) for p in a.parents]
    if a.list:
        for r in results:
            if r.get("error"):
                print(f"  {r['parent']:38s} ERROR {r['error']}")
                continue
            print(f"  {r['parent']:38s} {r['tile_total']:>4d} tiles · "
                  f"{len(r['sections'])} sections · {len(r['en_faq'])} faq")
    else:
        json.dump(results if len(results) > 1 else results[0],
                  sys.stdout, ensure_ascii=False, indent=1)
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
