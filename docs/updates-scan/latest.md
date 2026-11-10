# Updates opportunity scan — 2026-11-09

**Result: nothing genuinely new this week, but last week's finding (UTC #189's
five Unicode 19.0 approvals) is now independently corroborated by a second
Consortium source and still awaiting a build decision.**

## Carried-forward finding: UTC #189's approvals, now double-confirmed

Last week's record (2026-11-02, PR #1177) found that UTC #189 approved four
new emoji (U+1FA7F Ornate Bottle, U+1FACB Orchid, U+1FACA Vulture, U+1F6DA
Inukshuk) and one new RGI ZWJ sequence ("eyes looking right") for Unicode
19.0, verified against the meeting's own minutes. Nothing has been built on
the site for this yet — confirmed again this week via fresh grep across
`.html`/`.js`/`.json` — and the user has not yet decided what, if anything, to
build.

This week's check followed up on the minutes' two action items:

- **[189-A93]** (update the pipeline): confirmed independently. Fetched
  `unicode.org/alloc/Pipeline.html` directly and verified in the raw HTML
  (not just the tag-stripped text, which initially looked like it covered
  only one row) that all four new emoji share a single status cell via
  `rowspan="3"` reading "2026-Oct-27 / Accepted," linked to the same
  `189-C33` consensus item. Their row carries the `acceptednotinballot` CSS
  class, whose own page legend reads "accepted by UTC, but not yet in ISO
  ballot" — i.e. genuinely accepted at the Unicode Consortium level, one step
  short of the separate ISO/IEC standardization ballot. This is the first
  confirmation of last week's finding from a source other than the meeting
  minutes themselves.
- **[189-A94]** (black/white reference images): still nothing public. Reading
  the actual action-item text shows why — it directs the images be delivered
  privately to a named individual, not posted anywhere public. Checked
  `unicode.org/emoji/proposals.html`, a `charts-19.0/` path (doesn't exist
  yet), and the full L2/L2026 document index (tops out at the same document
  number as last week) — nothing changed, as expected.

Everything else in lane (a) came back clean: blog.unicode.org has no post in
November yet; the errata page is unchanged; no device/app confirmed rendering
Emoji 18.0 by default via a primary source (only the same recycled "Spring
2027" speculation already known); no new UTC #190 schedule or other
Consortium decision found.

**Still nothing built, still the user's call.** The options from last week
stand unchanged: a dated `updates/` entry, individual `symbol/` pages once
codepoints/glyphs are stable (not live in any font yet), both, or wait for
further movement (the ISO ballot stage, or actual font support).

## Lane (b) — platform formatting/character-support rule changes

**Nothing new.** All 12 tracked platforms (now including Bluesky) checked
against official sources; every surface came back clean for the window.
Noted and correctly set aside as out of scope: a Nov 5 X/Twitter Livestream
API addition, a Nov 16 Discord "Server Web Pages" discoverability post, a Nov
4 Discord-WoW-guild integration, and Meta/Pinterest ToS updates effective
later in November — none are character-limit or formatting-rule changes.

Also worth recording: the site's own counter/platform facts were
independently corrected twice this past week by other sessions (both already
merged) — the counter now judges every platform in its correct unit
(graphemes vs UTF-16 vs code points vs bytes, with Bluesky's real dual caps:
300 graphemes / 3,000 bytes for posts, 256 graphemes / 2,560 bytes for bio),
Pinterest's pin-description limit is confirmed at 800, and YouTube comments
are now correctly documented as supporting `*bold*`/`_italic_`/`-strikethrough-`
formatting. This scan's own research briefing initially mis-stated the
Bluesky post limit as "3,000 graphemes" (confusing the byte cap with the
grapheme cap) — the research agent's independent checking caught the correct
external fact (300 graphemes, unchanged) regardless, and a direct read of
`js/counter/counterRules.js` confirmed the site's own code has always had it
right. No site defect; a briefing error on this scan's part, corrected here
for the record.

## Lane (c) — per-game nickname rule changes

**Nothing new.** Every tracked field matched baseline. VRChat published a new
developer update (Nov 5, build 2026.4.2) — public-instance ownership tools,
Quick Menu redesign, a default theme change, Unity 6 SDK open beta; its one
mention of "display name" is about whose name shows as an instance owner, not
a charset/length/cooldown change. Its next update is scheduled Nov 19, just
past this window. Free Fire's OB56 has not shipped early; only unofficial fan
projections exist (Nov 21 advance server vs. Dec 13/16 global, neither
official nor verifiable further).

## Cadence and process items — still carried forward, still undecided

Both items remain open, now in their third consecutive week unaddressed:

1. **Cadence.** Still the user's call per the routine's own 2026-08-24 note.
2. **Stale trigger prompt.** Still points at the superseded external
   workspace; still no trigger-editing tool available to this session.

## Ranked opportunities

1. UTC #189's five Unicode 19.0 characters/sequences — now independently
   corroborated by the Pipeline page, still awaiting a build decision from
   last week's report.
2. Nothing else new this week.
3. (Process items, carried forward) Cadence decision and stale trigger prompt.
