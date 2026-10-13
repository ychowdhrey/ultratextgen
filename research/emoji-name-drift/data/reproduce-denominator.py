#!/usr/bin/env python3
"""Reproduce the study's denominator and its first result from two public Unicode files.

    curl -O https://www.unicode.org/Public/18.0.0/ucd/UnicodeData.txt
    curl -O https://www.unicode.org/Public/18.0.0/emoji/emoji-test.txt
    python3 reproduce-denominator.py UnicodeData.txt emoji-test.txt

Expected output (Unicode 18.0.0, Emoji 18.0):
    emoji in the comparison: 1400
    exact string matches: 0
    same after normalization: 952
    differ in words: 448
"""
import re
import sys
import unicodedata

VS16 = 0xFE0F
LINE = re.compile(r"^([0-9A-F ]+?)\s*;\s*(fully-qualified)\s*#\s*\S+\s+E[\d.]+\s+(.+?)\s*$")


def normalize(name):
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = name.replace("&", " and ").lower().replace("’", "'").replace("'", "")
    name = re.sub(r"[\-‐-―_/:,.()!\"“”]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def main(unicode_data, emoji_test):
    formal = {}
    for line in open(unicode_data, encoding="utf-8"):
        fields = line.split(";")
        if len(fields) > 1 and not fields[1].startswith("<"):
            formal[int(fields[0], 16)] = fields[1]
    total = exact = same = 0
    for line in open(emoji_test, encoding="utf-8"):
        m = LINE.match(line)
        if not m:
            continue
        points = [int(p, 16) for p in m.group(1).split()]
        base = [p for p in points if p != VS16]
        # In the comparison: one base code point, optionally followed by U+FE0F, and a formal name exists.
        if len(base) != 1 or len(points) > 2 or (len(points) == 2 and points[1] != VS16) or base[0] not in formal:
            continue
        total += 1
        short = m.group(3)
        exact += formal[base[0]] == short
        same += normalize(formal[base[0]]) == normalize(short)
    print("emoji in the comparison:", total)
    print("exact string matches:", exact)
    print("same after normalization:", same)
    print("differ in words:", total - same)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
