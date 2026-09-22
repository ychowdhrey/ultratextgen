---
name: page-art
description: >-
  Generate and wire a page's hero SVG, OG PNG and Twitter card in UltraTextGen. Use
  this whenever a new or edited page needs art, when `check:new-page-images` fails,
  when an OG card looks wrong or truncated, or before running
  `generate-site-art.py` / `wire-site-art.py` for any reason. A bare run is refused,
  `--only` matches by prefix, a mismatched font build silently rewrites hundreds of
  identical files, and a too-long title used to be truncated in silence — this skill
  is the ordered procedure that avoids all four.
---

# Page art

Invariants: `.claude/rules/html-pages.md` → "Art ships in the same change",
`.claude/rules/generated-artifacts.md`, `.claude/rules/fonts.md`. Pipeline reference,
the motif rules and the four font rules: `docs/architecture/page-art.md`. Past
backfills: `docs/image-seo-fixes.md`.

**Art ships in the same commit as the page.** Google fetches new pages within hours of
the sitemap picking them up; a 404 on that first image fetch is recorded before any
later fix lands. Never plan a follow-up "generate the missing art" pass.

## 1. Check your fonts before generating anything

`_FALLBACK_FONTS` and `_NATIVE_FONT_FILE` in `scripts/generate-site-art.py` name
specific files, and **a character no installed font covers is dropped, not drawn as
tofu** — on a container missing them that silently deletes glyphs from regenerated
cards.

```bash
apt-get install -y fonts-noto-core fonts-noto-cjk fonts-wqy-zenhei
```

Then confirm every path in those two tables exists. If your font build differs from
the one that produced the committed PNGs, a wide run rewrites **visually identical but
byte-different** files — see step 4.

## 2. Register the page

Add it to `PAGES` in `scripts/generate-site-art.py` (title, sub, motif, kicker). For
an `updates/` entry use the `K_UPDATE` kicker and register it like an `answers/` page.

**Keep the card title within four lines.** The cap is geometry, not taste: the block
is centred on y=250 and grows upward by 33 per line, so a fifth line collides with the
kicker baseline. **The fix for an overflow is never to shorten the answer away** — put
the head term in the card title and the answer in the **sub** line, which does not
wrap.

Measure titles without rasterising anything:

```bash
python3 scripts/generate-site-art.py --dry-run --all --strict-titles
```

That is a cheap whole-site title check, because whether a title fits is a property of
the registry rather than of what is on disk.

## 3. Generate, scoped

```bash
python3 scripts/generate-site-art.py --only <slug>        # repeatable
python3 scripts/wire-site-art.py --files <path>           # wire the tags
```

The slug is the page path with `/` replaced by `-` (`tr/gotik-yazi/index.html` →
`tr-gotik-yazi`).

- **A bare run is refused** and exits 2. Use `--only` or `--all`.
- **`--only` matches by PREFIX, not exact slug** — `--only answers` regenerates all 86
  `answers-*` pages. When you mean an exact set, check `git status` against the set you
  intended and revert the surplus.
- A run **skips any page whose hero+OG already exist**, so it only fills gaps.
  `--force` re-renders anyway — needed only when the brand skin itself changes.
- An `--only` prefix matching no registered page is an **error**, not a silent no-op.

For a locale page use `scripts/generate-locale-art.py`; for a printables preview,
`scripts/generate-printables-previews.py` + `wire-printables-previews.py`.

## 4. Read `git status` before committing

This is not optional and it is not paranoia: three consecutive locale batches on
2026-08-11 each produced byte-churn on files whose art had not changed (119 the first
time), caught only by reading the status output. Revert anything outside the set you
meant to touch.

Also read the run's own tail: overflowing titles are **reported, never dropped**, and
`--strict-titles` turns that into exit 1.

## 5. Verify

```bash
npm run check:new-page-images     # the gate: only the HTML this branch adds/changes
npm run check:images              # informational whole-site dashboard
```

`check:images` also requires a Pinterest pin and the site carries a deliberate pin
backlog, so it is close to always red site-wide — that is why it informs and
`check:new-page-images` gates. A Pinterest board is its own systematised thing; see
`.claude/rules/pinterest.md`.

**For an OG card, read the rendered PNG.** The silent title truncation that shipped on
seven pages was visible nowhere else.
