#!/usr/bin/env python3
"""Whole-site dashboard for the symbol lane. INFORMATIONAL: never gates.

Counts every defect in scripts/lib/symbol_pages.py over the whole tree, plus the one class that is not gated yet
(`title-promise`: a title or meta description that promises HTML entities, CSS or Alt codes the body lacks).
Run `python3 scripts/audit-symbol-pages.py [--list defect-id]`.
"""
import collections, glob, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import symbol_pages as sp

ROOT = sp.ROOT
PROMISE = re.compile(r"\bHTML\b.{0,40}(?:entit|entity|實體|thực thể|エンティティ|실체|엔티티)|(?:entit|entity|實體).{0,40}\bHTML\b|\bCSS\b|\bAlt[- ](?:code|Code|kod|Kod)|Alt 代碼|código alt|codice alt", re.I)


def main():
    version, ranges = sp.load_assigned()
    rels = sorted(os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, "**/symbol/*/index.html"), recursive=True) if "node_modules" not in p)
    rels = [r for r in rels if sp.is_symbol_page(r)]
    count = collections.Counter()
    listing = collections.defaultdict(list)
    for rel in rels:
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        for did, line, detail in sp.check_page(rel, src, ranges, version):
            count[did] += 1
            listing[did].append(f"{rel}:{line}: {detail}")
        head = " ".join(re.findall(r"<title>(.*?)</title>|name=\"description\" content=\"(.*?)\"", src, re.S)[0]) if re.search(r"<title>", src) else ""
        if PROMISE.search(head) and not re.search(r'content:\s*"\\|<code>&amp;', src) and not re.search(r"Alt\+\d", src):
            count["title-promise"] += 1
            listing["title-promise"].append(rel)
    print(f"{len(rels)} symbol pages, Unicode {version}")
    for did in ["faq-after-footer", "tile-glyph-mismatch", "unassigned-copy", "double-escaped-entity", "alt-code-mismatch", "title-promise"]:
        print(f"  {did:24s} {count[did]}")
    if "--list" in sys.argv:
        want = sys.argv[sys.argv.index("--list") + 1]
        print("\n".join(listing[want]))


if __name__ == "__main__":
    main()
