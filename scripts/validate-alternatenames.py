#!/usr/bin/env python3
"""Validate JSON-LD blocks and alternateName coverage across all index.html pages.

Checks:
  - Every <script type="application/ld+json"> block parses as valid JSON.
  - No alternateName array has more than 8 items.
  - No alternateName item is longer than 60 characters (warning only).
  - No alternateName array contains duplicate identical items.
  - alternateName is never placed on BreadcrumbList or FAQPage Question entities.
Reports coverage stats.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LD_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

errors = []
warnings = []
pages_with_alt = 0
total_alt_blocks = 0
files_scanned = 0


def walk_alt(obj, path, file):
    """Recursively find alternateName fields and validate them; flag bad placements."""
    global total_alt_blocks
    if isinstance(obj, dict):
        atype = obj.get("@type")
        if "alternateName" in obj:
            total_alt_blocks += 1
            if atype in ("BreadcrumbList", "Question", "Answer", "ListItem"):
                errors.append(f"{file}: alternateName on disallowed @type '{atype}'")
            alt = obj["alternateName"]
            items = alt if isinstance(alt, list) else [alt]
            if isinstance(alt, list):
                if len(alt) > 8:
                    errors.append(f"{file}: alternateName has {len(alt)} items (>8) on {atype}")
                lowered = [str(i).strip().lower() for i in alt]
                if len(lowered) != len(set(lowered)):
                    errors.append(f"{file}: duplicate alternateName items on {atype}")
            for it in items:
                if len(str(it)) > 60:
                    warnings.append(f"{file}: alternateName item >60 chars on {atype}: {it!r}")
        for v in obj.values():
            walk_alt(v, path, file)
    elif isinstance(obj, list):
        for v in obj:
            walk_alt(v, path, file)


for html in sorted(ROOT.rglob("index.html")):
    if "node_modules" in html.parts:
        continue
    files_scanned += 1
    text = html.read_text(encoding="utf-8")
    rel = html.relative_to(ROOT)
    had_alt = False
    for block in LD_RE.findall(text):
        raw = block.strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            errors.append(f"{rel}: JSON parse error: {e}")
            continue
        if "alternateName" in raw:
            had_alt = True
        walk_alt(data, rel, rel)
    if had_alt:
        pages_with_alt += 1

print(f"Files scanned:           {files_scanned}")
print(f"Pages with alternateName:{pages_with_alt}")
print(f"alternateName entities:  {total_alt_blocks}")
print(f"Warnings:                {len(warnings)}")
print(f"Errors:                  {len(errors)}")
if warnings:
    print("\n--- WARNINGS ---")
    for w in warnings:
        print("  " + w)
if errors:
    print("\n--- ERRORS ---")
    for e in errors:
        print("  " + e)
    sys.exit(1)
print("\nAll JSON-LD blocks valid. No constraint violations.")
