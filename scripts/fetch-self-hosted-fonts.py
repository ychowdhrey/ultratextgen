#!/usr/bin/env python3
"""Fetch a self-hosted webfont from Google Fonts into assets/fonts/.

Writes the woff2 file(s), the family's licence, and its manifest rows, so the
provenance of every binary in the repo is recorded rather than remembered.
Run scripts/build-font-face-css.py --write afterwards to regenerate the CSS.

  python3 scripts/fetch-self-hosted-fonts.py --family "Playwrite US Trad"
  python3 scripts/fetch-self-hosted-fonts.py --family "Fredoka" --axes "wght@400;500;600;700"
  python3 scripts/fetch-self-hosted-fonts.py --verify      # re-check every file's sha256

The Chrome user agent is what makes the API serve woff2; with the default
urllib agent it serves ttf, which is both larger and the format CLAUDE.md's
build-time rule is about.

KEEP is the subset list. 'vietnamese' is in it for a measured reason rather
than for completeness: Vietnamese words are mostly Latin with a few characters
OUTSIDE latin-ext, so without it a name renders half in the webfont and half in
the fallback -- "Nguyen" in Baloo 2 with the one accented letter in a system
face, mid-word, on a tracing sheet. Cyrillic, Hebrew and Devanagari share no
characters with latin, so they fall back whole and consistently, which is why
they are not here (and why devanagari alone would cost 562 KB).
"""
import argparse, hashlib, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTDIR = os.path.join(ROOT, "assets", "fonts")
LICDIR = os.path.join(FONTDIR, "licenses")
MANIFEST = os.path.join(FONTDIR, "manifest.json")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0 Safari/537.36")
KEEP = {"latin", "latin-ext", "vietnamese", "fallback"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90).read()


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fetch_licence(family):
    bare = re.sub(r"[^a-z0-9]", "", family.lower())
    for path in ("ofl/%s/OFL.txt" % bare, "apache/%s/LICENSE.txt" % bare, "ufl/%s/LICENSE.txt" % bare):
        url = "https://raw.githubusercontent.com/google/fonts/main/" + path
        try:
            text = get(url).decode()
        except Exception:
            continue
        open(os.path.join(LICDIR, bare + ".txt"), "wb").write(text.encode())
        kind = ("OFL-1.1" if "SIL OPEN FONT LICENSE Version 1.1" in text
                else "Apache-2.0" if "Apache License" in text else "UNKNOWN")
        return kind, url
    return None, None


def fetch_family(family, axes):
    q = "family=" + urllib.parse.quote_plus(family) + ((":" + axes) if axes else "")
    css = get("https://fonts.googleapis.com/css2?" + q + "&display=swap").decode()
    blocks = re.findall(r"/\*\s*([a-z0-9-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
    if not blocks:
        raise SystemExit("no @font-face blocks returned for %r -- check the family name and axes" % family)
    slug = slugify(family)
    rows = []
    for subset, body in blocks:
        if subset not in KEEP:
            continue
        m = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)", body)
        if not m:
            continue
        weight = (re.search(r"font-weight:\s*([^;]+);", body) or [None, "400"])[1].strip()
        style = (re.search(r"font-style:\s*([^;]+);", body) or [None, "normal"])[1].strip()
        urange = re.search(r"unicode-range:\s*([^;]+);", body)
        sfx = "" if subset == "fallback" else "-" + subset
        name = "%s%s-%s.woff2" % (slug, sfx, weight) if (weight != "400" or len(blocks) > 2) else "%s%s.woff2" % (slug, sfx)
        data = get(m.group(1))
        open(os.path.join(FONTDIR, name), "wb").write(data)
        rows.append({"family": family, "file": name, "weight": weight, "style": style,
                     "unicodeRange": urange.group(1).strip() if urange else None,
                     "subset": subset, "bytes": len(data),
                     "sha256": hashlib.sha256(data).hexdigest(), "source": m.group(1)})
    if not rows:
        raise SystemExit("%r returned only subsets outside %s" % (family, sorted(KEEP)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--family")
    ap.add_argument("--axes", default="", help='e.g. "wght@400;700"')
    ap.add_argument("--verify", action="store_true", help="re-hash every file against the manifest")
    args = ap.parse_args()

    manifest = json.load(open(MANIFEST, encoding="utf-8")) if os.path.exists(MANIFEST) else []

    if args.verify:
        bad = 0
        for e in manifest:
            p = os.path.join(FONTDIR, e["file"])
            if not os.path.exists(p):
                print("MISSING  %s" % e["file"]); bad += 1; continue
            got = hashlib.sha256(open(p, "rb").read()).hexdigest()
            if got != e.get("sha256"):
                print("CHANGED  %s" % e["file"]); bad += 1
        print("%d file(s) checked, %d problem(s)." % (len(manifest), bad))
        return 1 if bad else 0

    if not args.family:
        ap.error("--family is required unless --verify is passed")

    os.makedirs(FONTDIR, exist_ok=True); os.makedirs(LICDIR, exist_ok=True)
    rows = fetch_family(args.family, args.axes)
    kind, url = fetch_licence(args.family)
    if kind is None:
        print("WARNING: no licence found for %r in google/fonts -- do not commit the binary "
              "until its licence is confirmed and written to assets/fonts/licenses/." % args.family)
    else:
        print("licence: %s (%s)" % (kind, url))

    manifest = [e for e in manifest if e["family"] != args.family] + rows
    manifest.sort(key=lambda e: (e["family"], int(e["weight"]) if str(e["weight"]).isdigit() else 0, e["subset"]))
    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), indent=1)
    print("%s: %d file(s), %.1f KB. Now run scripts/build-font-face-css.py --write"
          % (args.family, len(rows), sum(r["bytes"] for r in rows) / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
