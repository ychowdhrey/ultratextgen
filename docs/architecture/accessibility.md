# Accessibility — the axis nothing measured until 2026-09-05

Invariants: `.claude/rules/accessibility.md`. The declined heading-skip proposal:
`docs/decisions/content-lanes.md`.

Every other gate measures structure, language, schema, values, assets, hub coverage or
prose. **None of them opened a page and asked whether it can be used.** There was no
accessibility script, no rule and no gate — so the number was **unknown rather than
good**.

## The baseline turned out to be genuinely strong

That is worth stating because it decides how the tooling is shaped. Across all 4,645
pages: **0** images without `alt`, **0** buttons without an accessible name, **0**
links without one, **0** empty `href`s, **0** unlabelled form controls, **0** pages
missing `<html lang>`, **0** positive `tabindex`. This site was built with care on
this axis; the job is to keep it that way, not to pay down debt.

## Three pages carried duplicate ids, and one was a live functional bug

`ko/index.html` shipped **two byte-identical `<main class="container">` blocks**, so it
had two `#categoryTabs` and two `#resultsGrid`. `script.js` binds by id and populated
only the first of each — measured in a browser, the Korean homepage rendered its real
tab strip (20 tabs) and results (11), then **an empty tab strip and an empty grid that
could never fill**, plus two `main` landmarks.

The other two were id collisions between genuinely different sections
(`symbol/index.html`'s punctuation vs. dash-and-hyphen groups;
`es/library/simbolos-de-lazos`'s static grid vs. its JS mount), fixed by renaming the
id and touching no copy.

## Blocking vs advisory is decided by the backlog, not by severity

The eleven **blocking** classes are exactly the ones standing at zero, so the gate has
nothing to be permanently red against — the same call as `check:zalgo-decodes`, and
the same reason `check:images` informs while `check:new-page-images` gates.

**Heading-level skips are advisory, on 909 pages, and must stay that way.** Every one
is the same design-system decision rather than an oversight: a `.compare-card` titles
itself with `<h4>` inside a section headed `<h2>`. Skipping a level is a best-practice
warning rather than a WCAG 1.3.1 failure, and restructuring 899 pages' card markup is
an owner call about the design system. **A validator must not force it**, and the
owner declined the change on 2026-09-10 with the cost in view.

## It is a state check on changed pages, not a delta, and that is deliberate

`check-locale-translation.js` and `check-faq-schema.js` measure deltas because both
carry large legitimate backlogs. This one has none, so "this page has a duplicate id
now" is worth failing on whether or not it had one before.

**If a blocking class ever acquires a real backlog, move it to advisory rather than
weakening this to a delta** — a blocking rule with a backlog is precisely the shape
people learn to ignore.

## What counts as a page is structural

A file with an `<html>` element. Two tracked `.html` files are not pages — a search-
engine verification token and a script fragment — and both would otherwise report as
missing a lang and an h1. **A hardcoded skip list would go stale**; this filter
excludes a future fragment and includes a future page on its own.

## Verification

Verified against six differently-shaped broken inputs so the gate could not be tuned
to one — a duplicate id (the real `ko` regression), an `<img>` with no `alt`, a button
with no accessible name, a second `<main>`, a removed `h1`, a removed `<html lang>` —
each exits 1 naming its rule, with a restored-file control at exit 0. And verified that
CI *gates* on it rather than merely running it.

## One finding this pass reported rather than fixed, and the correction that closed it

`ns.buildGrids()` mounted into a container that was empty in static HTML. The number
was first published as **896 of 898**, on the reasoning that two pages pre-rendered
theirs.

**The correction is the lesson.** Those two pages carry static `.flag-row` symbol tiles
in the same container and `buildGrids` appends its sections underneath them, so
"container has children" **answered a different question than the one being asked** —
*nothing* pre-rendered its grids, and the real number was **898 of 898**. Counting the
right thing needs the right predicate, not a bigger sample. The first read of the
finding was also backwards: the two pre-rendered pages look like the norm until you
count.

Fixed the same day, generator and gate. See `docs/collection-grid-prerender.md` and
`docs/architecture/frontend-runtime.md`.
