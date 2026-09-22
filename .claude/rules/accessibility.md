---
paths:
  - "**/*.html"
---

# Accessibility — eleven blocking classes, all standing at zero

Deeper reference and the measured baseline: `docs/architecture/accessibility.md`.

The site's baseline on this axis is genuinely strong: across all pages there are
**zero** images without `alt`, buttons or links without an accessible name, empty
`href`s, unlabelled form controls, pages missing `<html lang>`, and positive
`tabindex`. The job is to keep it that way, not to pay down debt.

## Blocking

`npm run check:accessibility` is a **state check on changed pages**, not a delta,
precisely because there is no backlog to be permanently red against. "This page has
a duplicate id now" is worth failing on whether or not it had one before.

The eleven blocking classes: a duplicate `id`, an `<img>` with no `alt`, a button
or link with no accessible name, an empty `href`, an unlabelled form control, a
missing `<html lang>`, a missing `h1`, more than one `<main>`, and a positive
`tabindex`.

A duplicate `id` is not cosmetic here: `script.js` binds by id, so a page that
shipped two `<main class="container">` blocks populated only the first of each and
rendered a second, permanently empty tab strip and results grid.

**If a blocking class ever acquires a real backlog, move it to advisory rather than
weakening the check to a delta** — a blocking rule with a backlog is precisely the
shape people learn to ignore.

## Advisory, and it stays advisory

**Heading-level skips are advisory.** Every instance is the same design-system
decision rather than an oversight: a `.compare-card` titles itself with `<h4>`
inside a section headed `<h2>`. Skipping a level is a best-practice warning rather
than a WCAG 1.3.1 failure. This was put to the owner with the cost of changing it
and **declined (2026-09-10)** — it is a recorded decision, not a validator default,
and re-proposing it needs a real reported barrier, not the count.

## What counts as a page

A file with an `<html>` element. Tracked `.html` files that are script or
verification fragments are not pages and are excluded structurally, never by a
hardcoded skip list that would go stale.
