# Recorded content and product decisions

Owner decisions and ratified positions that a later session would otherwise
re-litigate. Invariants derived from these live in `.claude/rules/`; the case
studies behind them are in `docs/architecture/content-lanes.md`.

## `updates/` is scoped to external events, not our own launches (2026-07-20)

The section was proposed as a way to get "one more SEO feature" activated by posting
the site's own feature launches (curved-text, tattoo studio, vertical text,
printables) as if they were news. **That framing was rejected.** A font-generator
tool site has no content meeting Google News' actual bar — timely coverage of
external events, not evergreen tool pages or self-promotional launch posts — and
pursuing formal News/Publisher Center inclusion on that basis risked a rejection tied
to the domain.

The section only became legitimate once re-scoped around genuine external events
that the site's own Check tools already have to track to stay accurate. That is the
only scope it should carry.

**Schema refinement, same day.** The template originally specified `Article` to keep
distance from anything "News"-flavored. Once the scope was locked to genuine external
events, the JSON-LD `@type` was switched to `NewsArticle`. This is schema.org markup
only — Google treats `Article`, `NewsArticle` and `BlogPosting` identically for the
Article rich result and for Discover/Top Stories eligibility, and a `NewsArticle`
type does not enroll a site in Google News. **Formal Publisher Center submission
remains explicitly out of scope**, for the same domain-risk reasoning; this
refinement does not reopen that question.

## Titles outlive the status they report (2026-09-26)

**Decision (owner, 2026-09-26):** stale status titles are retitled in place to carry
the final fact, **without changing the URL**, and from now on a page that tracks a
series of updates gets a title that stays true through the whole series.

**Why.** The Unicode 18.0 pages were titled for the stage they were written in:
"Frozen for Unicode 18.0 Publication", "Coming September 2026", "the Draft Emoji 18.0
Candidate", "Accepted for Unicode 18.0", "Is Confirmed for September 16, 2026".
Unicode 18.0 published on September 16, 2026, and on that one day **75 titles across
EN and 16 locales became false together**, most of them with card art that embeds the
same words. The body copy could be corrected sentence by sentence; the titles could
not be touched without regenerating art, so they were the part left stating an
expired status.

**The rule** (invariant in `.claude/rules/html-pages.md`, "A title outlives the status
it reports"): a title names the subject and carries only a **terminal** fact ("Final
in Emoji 18.0", "Published September 16, 2026") or a **status-neutral** phrase
("Release Date", "Keyboard Rollout Status"). Transient states live in the body, the
meta description and the `updates/` pill. For a character that is not final yet, the
title is written in the neutral form from the start (for example
"Pickle Emoji: Copy & Paste 🫝, Emoji 18.0 Status and Release Date") and changes at
most once, when the terminal fact lands.

**How the retitle was done.** URL, slug, canonical and hreflang unchanged. Every slot
that carries the title changed together (`<title>`, `og:title`, `twitter:title`,
JSON-LD, H1 where the H1 carried the status, the page spec's `title` field, the
card-art registry), with the art regenerated in the same change, and every locale
sibling in the same change. Status wording in the body was corrected in the same pass
so no page says "Final" in its title and "draft candidate" in its first paragraph.

**Executed:** [`ychowdhrey/ultratextgen#943`](https://github.com/ychowdhrey/ultratextgen/pull/943)
(open at the time of writing; not executed until it merges).

## Heading-level skips stay advisory (2026-09-10)

909 pages skip a heading level, all the same design-system decision: a
`.compare-card` titles itself with `<h4>` inside a section headed `<h2>`. The count
was presented to the owner with the cost of changing it — one card template plus a
regeneration of 909 pages, which under clean-on-touch drags in those pages' em dashes
and their locale siblings — and **the owner's answer was to leave them**.

This is now a recorded decision rather than a validator's default. Re-proposing it
needs new evidence: a real reported barrier, not the count.

## Two CTAs on a printables row, not four (2026-09-13)

The row shipped as **Print this letter / Save as PDF / Download PNG / Save** — four
equal-weight pills, two of them labelled "Save", meaning different things.

*Save* was measured before it was judged: it **did** write to the shared saved store.
But `presetUrl()` has nothing to encode on a per-letter spoke, so the record it saved
was the page the visitor was already looking at, and the saved-sheets strip that
confirms the write renders **303px below the button**. Real functionality with no job
on that surface.

The owner chose to drop **Save and Save as PDF**. `renderSaved()` stays, because the
store is site-wide and deleting the strip would orphan sheets a visitor saved earlier
rather than tidy anything.

**Superseded 2026-09-15**, and kept only as the record of what was decided on 09-13:
the owner then reversed the direction entirely — **every sheet action writes a PDF and
the print dialog is the fallback only**. There is no longer any row that offers a
print button. Do not cite the 09-13 decision as current scope.

## The site now generates images, and that is not a reversal

The earlier "text-only, no image generator" boundary was intentionally lifted.
UltraTextGen *does* generate images — but only **client-side, on demand, as SVG/PNG
built with native Canvas/SVG**. Same philosophy applied to a new job.

Copy-paste Unicode is still the front door and satisfies the job fastest. Visual
assets are the on-brand, higher-intent **follow-up** for jobs plain characters cannot
do (trace, color, print, logo/sticker art) — added where real demand exists, never as
a default.

## Flair is in scope on game/platform pages

"Fast > Fancy" governs *complexity*, not *ambition*. On a plain text page a random
name generator or heavy per-character transform is scope creep. But on a
**game/platform name page, matching that game's aesthetic *is* the copy-paste job,
done end to end** — a decorated name framed in ꧁༒…꧂, a name that fits the field's
limit, a name generated to a theme. There, generative flair is in-scope and
on-brand; the hand-authored "Ready-Made Names" lists are proof of the demand and a
generator just does it dynamically.

What stays a hard line is the *output*, never the ambition: flair is **paste-safe
Unicode composed from building blocks client-side via native APIs** — never an
image, a bundled font, or a dependency — and only the *selection* may be random.

## The zalgo comparison table is a Check surface (2026-09-05)

The EN page and its eleven siblings carry a dated capability table against eight
generators whose live pages were fetched that day. Two more blocked the fetch and are
**named as unscored rather than guessed**.

It replaced the sentence "the only major zalgo generator with a built-in unzalgo
decoder", which was **false on all twelve pages** — one competitor ships a cleaner
beside its generator. The table's dated line enrols it in the 90-day re-check sweep
every dated claim requires; re-verify against the live pages, never by memory.

## `answers/` is deliberately not linked from any homepage (2026-07-31)

See `docs/architecture/content-lanes.md` §1. Recorded here because it is the decision
most likely to be "fixed" by a well-meaning link audit.
