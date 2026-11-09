# Updates opportunity scan — 2026-11-02

**Result: one genuine, verified, actionable finding.** UTC #189 (Nancy, France,
Oct 26–28) approved five new Unicode 19.0 characters/sequences, resolving last
week's watch item. Lanes (b) and (c) found nothing new.

## Lane (a) — new Unicode Consortium versions/emoji — FINDING

**UTC #189 approved all five candidate emoji flagged as pending last week, and
also opened a related rename question on an existing emoji.** Independently
verified by fetching `unicode.org/L2/L2026/26232.htm` directly (curl + tag
strip, never summarized) rather than trusting the research agent's quote
alone — confirmed byte-for-byte:

- Document is genuinely "Draft Minutes of UTC Meeting 189," Nancy, France,
  October 26–28, 2026, revision date 2026-10-30 — not the draft/pre-meeting
  "[185-C]"-tagged text flagged as unconfirmed last week. Consensus tags run
  sequentially `[189-C1]` through `[189-C55]+`, the documented signature of
  real recorded minutes rather than carried-over template text.
- **[189-C33]**: Accept 4 new emoji characters for Unicode 19.0 — U+1FA7F
  ORNATE BOTTLE, U+1FACB ORCHID, U+1FACA VULTURE, U+1F6DA INUKSHUK.
- **[189-C34]**: Accept 1 new RGI directional ZWJ sequence for Unicode 19.0 —
  `1F440 200D 27A1 FE0F`, "eyes looking right" (a directional variant built on
  the existing 👀 emoji).
- **[189-A95]** (a related action item, not a repertoire addition): request a
  CLDR short-name change for the *existing, already-shipped* 👀 emoji
  (U+1F440) from "EYES" to "EYES LOOKING LEFT" — the counterpart name once the
  new directional sequence exists. This touches a platform-facing name on a
  character the site may already reference, so it's flagged as its own
  decision point, not folded into the "new characters" finding.

Checked site-wide for prior coverage (grep across `.html`/`.js`/`.json`,
excluding one confirmed false-positive hash-string match in a case-folding
fixture) — none of these five characters/sequences or the rename item appear
anywhere on the site yet. This is genuinely new.

**Not yet decided: what, if anything, to build.** Per the routine's standing
instruction, no page or `updates/` entry is created from this scan — asking
the user which of these (if any) to act on:
- A dated `updates/` entry for the UTC #189 approval, mirroring the precedent
  set for U+20C5 Belarusian Ruble Sign's provisional-assignment entry.
- Individual `symbol/` pages for the four new characters once real glyphs/
  codepoints are stable (none are emoji-rendering yet — these are Unicode
  19.0-track, not live in any font), again mirroring the Belarusian Ruble Sign
  precedent for a provisionally-assigned character.
- Whether/how to note the pending 👀 rename action item, which is a
  CLDR-name question on a character already in wide use, not a new addition.

Other lane (a) findings, nothing actionable: blog.unicode.org's only
in-window post is "ICU 79 Released" (Oct 27) — an implementation release for
already-known Unicode 18.0 + CLDR 49, not a new standard decision. The errata
page is unchanged. No device/app confirmed rendering Emoji 18.0 by default via
a primary source (only the same unsourced "Spring 2027" Apple speculation
already known). Emojipedia's own Unicode 19.0 coverage was noted as still
showing a stale "4 proposed" count via search snippets — a known aggregator-
staleness trap, now superseded by the real minutes (5 items, all approved) —
not treated as a finding.

## Lane (b) — platform formatting/character-support rule changes

**Nothing new.** Checked all 12 tracked platforms against official sources;
every surface came back clean for the window. Two items checked and correctly
set aside as out of scope: an unverified Telegram bug-tracker report of an
Oct 30 @mention-click bug (a user report, not an official change), and a
Pinterest Nov 12 ToS/policy update (legal policy, not a character-limit
change).

## Lane (c) — per-game nickname rule changes

**Nothing new** on any tracked rule. One item worth recording for baseline,
not a rule change: VRChat shipped build **2026.4.1** (Oct 28) — face tracking
out of beta, phone-to-PC QR login, a new account Safety Center, improved
login flow. None of it touches display-name charset, length, or the
cooldown. Recording the build number so a future scan doesn't re-discover it.

## Cadence and process items — still carried forward, still undecided

Both items from the last two weeks' records remain open:

1. **Cadence.** This is the seventh consecutive weekly firing; six of seven
   produced nothing new, and this week's one finding came from a scheduled
   Consortium meeting landing inside the normal weekly window rather than
   from the weekly cadence catching something a lighter cadence would have
   missed. Still the user's call per the routine's own 2026-08-24 note.
2. **Stale trigger prompt.** Still points at the superseded external
   workspace and carries research notes frozen at 2026-08-24. This session
   again found no trigger-editing tool available.

## Ranked opportunities

1. **UTC #189's five new Unicode 19.0 characters/sequences** — verified,
   dated, sourced. Awaiting a decision on whether to build an `updates/`
   entry, `symbol/` pages, or nothing yet (these are not live in any font).
2. (Related, not a new addition) The CLDR rename action item for the existing
   👀 emoji — flagged for awareness alongside #1, same decision point.
3. Nothing else new this week.
