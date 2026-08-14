#!/usr/bin/env python3
"""
Per-PR gate: every HTML page added or modified in this branch must have a
real, existing og:image, twitter:image, and (if declared) hero image file —
judged only against files this PR actually touches, not the whole site.

This is the enforcement half of scripts/check-image-assets.py (the whole-site
audit). That script also requires a Pinterest pin per page, is not diff-scoped,
and the site currently carries a large, deliberately-paced Pinterest-pin
backlog (see docs/pinterest-pin-generation.md) — so it can never function as
a per-PR merge gate without being permanently red regardless of what any given
PR touches. That's the actual mechanism that let new pages keep shipping ahead
of their hero/OG art despite scripts/check-image-assets.py existing: Google
crawls a new page within hours and records a broken image reference before any
later cleanup pass lands (an internal GSC crawl-stats investigation found
this recurring). This script closes that gap the same way
check-translation-parity.js closes the equivalent gap for translation drift:
diff-scoped, so only NEW problems introduced by this branch can fail it.

Does NOT check Pinterest pins — intentionally out of scope here, see above.
The og:image/twitter:image/hero-figure checks below are duplicated (not
imported) from check-image-assets.py because that module's hyphenated
filename isn't importable as-is; keep the two in sync by hand if either
check's regex changes.

Usage:
  python3 scripts/check-new-page-image-assets.py              # diff against origin/main
  python3 scripts/check-new-page-image-assets.py --base main   # diff against a different ref

Exit status: 0 when clean (or nothing changed to check), 1 when any changed/
added page is missing og:image, twitter:image, or a declared hero image file.
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_URL = "https://ultratextgen.com"
LOGO = f"{BASE_URL}/logo.png"


def attr(html, pattern):
    m = re.search(pattern, html)
    return m.group(1) if m else ""


def local_path(url_or_path):
    rel = url_or_path.replace(BASE_URL, "").lstrip("/")
    return os.path.join(ROOT, rel)


def git(args):
    return subprocess.run(
        ["git"] + args, cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout


def resolve_base(requested):
    try:
        subprocess.run(
            ["git", "rev-parse", "--verify", requested],
            cwd=ROOT, capture_output=True, check=True,
        )
        return requested
    except subprocess.CalledProcessError:
        # Shallow CI checkouts often don't have the base branch locally at all.
        branch = requested.replace("origin/", "")
        subprocess.run(
            ["git", "fetch", "--depth=200", "origin", branch],
            cwd=ROOT, capture_output=True,
        )
        candidate = f"origin/{branch}"
        subprocess.run(
            ["git", "rev-parse", "--verify", candidate],
            cwd=ROOT, capture_output=True, check=True,
        )
        return candidate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="origin/main")
    args = parser.parse_args()

    try:
        base = resolve_base(args.base)
        merge_base = git(["merge-base", base, "HEAD"]).strip()
    except subprocess.CalledProcessError as e:
        print(f"Could not resolve base ref {args.base!r}: {e}")
        return 2

    changed = [
        l.strip()
        for l in git(
            ["diff", "--name-only", "--diff-filter=ACMR", merge_base, "HEAD", "--", "*.html"]
        ).splitlines()
        if l.strip()
    ]

    if not changed:
        print("check-new-page-image-assets: no changed HTML files — nothing to check.")
        return 0

    failures = []
    checked = 0
    for rel in changed:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue  # deleted in this branch
        if rel.endswith(".test.html") or "/embed/" in rel or rel == "_root.html":
            continue
        html = open(path, encoding="utf-8", errors="replace").read()
        if re.search(r'name="robots"[^>]*noindex', html):
            continue
        canonical = attr(html, r'rel="canonical"\s+href="([^"]+)"')
        if not canonical:
            continue
        checked += 1

        og = attr(html, r'property="og:image"\s+content="([^"]+)"')
        if not og:
            failures.append((rel, "missing og:image meta tag"))
        elif og == LOGO:
            failures.append((rel, "og:image still points at the generic /logo.png"))
        elif not os.path.exists(local_path(og)):
            failures.append((rel, f"og:image file not found on disk: {og}"))

        tw = attr(html, r'name="twitter:image"\s+content="([^"]+)"')
        if not tw:
            failures.append((rel, "missing twitter:image meta tag"))
        elif tw != LOGO and not os.path.exists(local_path(tw)):
            failures.append((rel, f"twitter:image file not found on disk: {tw}"))

        hero_src = attr(html, r'class="page-hero-figure"[^>]*>\s*<img src="([^"]+)"')
        if hero_src and not os.path.exists(local_path(hero_src)):
            failures.append((rel, f"hero image file not found on disk: {hero_src}"))

    print("New/changed page image-asset check")
    print(f"  base:                    {base} (merge-base {merge_base[:8]})")
    print(f"  changed HTML files:      {len(changed)}")
    print(f"  indexable pages checked: {checked}")
    print(f"  problems found:          {len(failures)}")

    if failures:
        print("")
        print("This PR ships a page whose hero/OG/Twitter art isn't committed yet:")
        for rel, problem in failures:
            print(f"  ✗ {rel} — {problem}")
        print("")
        # Emit the exact scoped command. generate-site-art.py refuses a bare
        # run (it would rewrite all ~1,200 assets), and its slug is the page
        # path with "/" as "-" — so compute it here rather than making the
        # reader work it out under time pressure.
        slugs = sorted({os.path.dirname(rel).replace(os.sep, "-") for rel, _ in failures})
        paths = sorted({rel for rel, _ in failures})
        print("Fix: generate and commit the art in this same PR —")
        print("  python3 scripts/generate-site-art.py " + " ".join(f"--only {s}" for s in slugs))
        print("  python3 scripts/wire-site-art.py " + " ".join(paths))
        print("(see docs/image-seo-fixes.md). Don't merge a new/edited page ahead of its")
        print("art and rely on a later cleanup pass — Google crawls new pages within")
        print("hours and records the broken reference before any follow-up fix lands.")
        return 1

    print("")
    print("Every page changed in this branch has its og:image/twitter:image/hero art committed. ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
