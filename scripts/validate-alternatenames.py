#!/usr/bin/env python3
"""Validate JSON-LD blocks and alternateName coverage across all index.html pages.

Checks:
  - Every <script type="application/ld+json"> block parses as valid JSON.
  - No alternateName array has more than 8 items.
  - No alternateName item is longer than 60 characters (warning only).
  - No alternateName array contains duplicate identical items.
  - alternateName is never placed on BreadcrumbList or FAQPage Question entities.
  - presentation_class consistency (library/ pages, per docs/emoji-combination-taxonomy.md §10):
      * ERROR  — alternateName sells "emoji" but the page ships zero emoji glyphs (off-intent).
      * WARNING — page is >=30% emoji glyphs but no alternateName captures the "emoji" query.
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
SYMBOL_TILE_RE = re.compile(r'data-symbol="([^"]*)"')
# §10 emoji-share threshold below which the "missing emoji synonym" warning fires.
EMOJI_SHARE_WARN = 0.30


def is_emoji_glyph(tok):
    """Strict emoji test honoring the §8 FE0F overlap: bare BMP symbols (❤ ★ ☮)
    count as text symbols, not emoji."""
    return (
        any(ord(c) >= 0x1F000 for c in tok)          # SMP emoji blocks
        or "️" in tok or "‍" in tok          # variation selector / ZWJ sequence
        or any(0x1F1E6 <= ord(c) <= 0x1F1FF for c in tok)  # regional-indicator flags
        or any(0x1F3FB <= ord(c) <= 0x1F3FF for c in tok)  # skin-tone modifiers
    )

errors = []
warnings = []
pages_with_alt = 0
total_alt_blocks = 0
files_scanned = 0
current_alt_items = []


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
            current_alt_items.extend(str(i) for i in items)
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
    current_alt_items.clear()
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

    # §10 presentation_class consistency — scoped to library/ reference pages.
    if had_alt and rel.parts and rel.parts[0] == "library":
        tiles = SYMBOL_TILE_RE.findall(text)
        emoji_tiles = sum(1 for t in tiles if is_emoji_glyph(t))
        share = emoji_tiles / len(tiles) if tiles else 0
        sells_emoji = any("emoji" in a.lower() for a in current_alt_items)
        if sells_emoji and emoji_tiles == 0:
            errors.append(
                f"{rel}: alternateName sells 'emoji' but page has 0 emoji glyphs (§10 off-intent)"
            )
        elif not sells_emoji and share >= EMOJI_SHARE_WARN:
            warnings.append(
                f"{rel}: {share:.0%} emoji glyphs but no 'emoji' alternateName (§10 missing synonym)"
            )

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
