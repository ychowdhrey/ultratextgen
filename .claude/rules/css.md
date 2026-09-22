---
paths:
  - "**/*.css"
---

# CSS conventions

- **Custom properties for all colors and theme tokens** — required for dark mode.
  Never hardcode a color value; use the existing tokens.
- CSS Grid + Flexbox for layout; mobile-first responsive.
- Class naming is hyphen-separated (`hero-headline`, `style-card`).
- Dark mode is toggled by a `dark` class on `<html>`, not `prefers-color-scheme`.
- Avoid `!important` and inline styles unless genuinely unavoidable.

## Two structural traps that produce valid CSS and wrong output

- **A percentage height needs a definite containing height.** A flex item sized
  `flex: 1 1 auto` does not provide one, and neither does an `aspect-ratio` box —
  its height looks definite but a percentage child cannot resolve against it. Both
  cases shipped here: a print figure rendered 15.6in inside a 10in page, and a
  landscape preview sheet reached 893px where the ratio called for 461. Fix both the
  same way: absolutely position the figure inside a `position: relative` parent,
  which makes the height definite *and* takes the figure out of the flow so it
  cannot push its own container around.
- **A fixed element at the viewport bottom must add `--utg-anchor-h` to its offset**,
  or it sits behind the mobile anchor ad. See `.claude/rules/ads-and-monetization.md`.

## The `@font-face` block in `style.css` is generated

Never hand-write one — see `.claude/rules/fonts.md`.

`npm run audit:css` is the whole-site CSS audit.
