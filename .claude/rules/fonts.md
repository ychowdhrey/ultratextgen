---
paths:
  - "assets/fonts/**"
  - "**/*.css"
  - "scripts/{fetch-self-hosted-fonts,build-font-face-css,generate-printables-previews,generate-site-art}.py"
  - ".gitignore"
---

# Fonts

Inventory, provenance, per-file SHA-256 and the subset reasoning:
`assets/fonts/README.md` and `assets/fonts/manifest.json`. Why Cloudflare made this
necessary: `docs/architecture/webfonts.md`.

## Letterform webfonts are self-hosted

**Never add a family to a `fonts.googleapis.com` link and assume it will be
served.** The Cloudflare zone has Cloudflare Fonts enabled: it rewrites a Google
Fonts `<link>` into its own bundle and **drops any family that bundle lacks**, so
the page declares a family nothing ever loads. A same-origin `@font-face` is
untouched by that rewrite, by a change to the bundle, or by the setting being
toggled.

To add one:

```sh
python3 scripts/fetch-self-hosted-fonts.py --family "<Name>" [--axes …]
python3 scripts/build-font-face-css.py --write
```

**Never hand-write an `@font-face` rule in `style.css`.** The block between the
`@self-hosted-fonts` markers is generated from the manifest so the CSS and the
files on disk cannot drift. `--verify` re-hashes every file against the manifest.

## What stays on Google Fonts

Body and mono chrome only (`Plus Jakarta Sans`, `Space Mono`), plus
`Noto Sans Symbols 2` — all already in Cloudflare's bundle and serving.

## Subsets earn their bytes by MIXING, not by a locale existing

`latin`, `latin-ext` and `vietnamese`. Vietnamese words are mostly Latin with a few
characters *outside* latin-ext, so without that subset a name renders half in the
webfont and half in the fallback — one letter in a different typeface mid-name, on a
tracing sheet. Cyrillic, Hebrew and Devanagari share no characters with latin, so
they fall back whole and consistently; that shape, not their size, is why they are
left out.

Repo size is not what a visitor downloads: every generated `@font-face` carries the
`unicode-range` Google served it with, so an English page fetches one file.

## `.ttf`/`.otf` stay ignored; `assets/fonts/*.woff2` is unignored

`.gitignore` carries its own note on this. A **bundled font binary feeding a
renderer** remains forbidden (see `.claude/rules/frontend-javascript.md`); the
build-time rasteriser keeps its TTF cache outside the repo.

## Ask for a weight the family ships

A single-weight file asked for 700 produces **synthetic bold** — non-deterministic
across engines. Check `assets/fonts/manifest.json` when a printables page picks a
face; this repo has a standing backlog of surfaces that ask for an unshipped
weight, measured in `docs/printables/render-defect-registry.md`.

## Before regenerating build-time art, check the system fonts

`_FALLBACK_FONTS` and `_NATIVE_FONT_FILE` in `scripts/generate-site-art.py` name
specific files. A character no installed font covers is **dropped, not drawn as
tofu**, which silently deletes glyphs from regenerated cards. Install
`fonts-noto-core fonts-noto-cjk fonts-wqy-zenhei` first and confirm every path in
those two tables exists. Details and the four font-resolution rules the motifs
depend on: `docs/architecture/page-art.md`.
