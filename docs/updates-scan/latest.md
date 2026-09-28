# Updates opportunity scan — 2026-09-28

**Result: one genuine, verified, actionable finding (Discord bio limit 190 to 300
characters); nothing else new.**

## A major fact-verification pass landed 3 days before this scan

Before dispatching research agents, the repo check surfaced something the routine's
own standing notes did not yet reflect: on 2026-09-25/26, another session ran an
exhaustive re-verification of nearly everything this routine's three lanes cover —
Unicode 18.0's publication status, platform limits including Discord, Instagram,
Telegram, WhatsApp, TikTok and Threads, and the entire `js/gamename/game-rules.js`
`RULES` table against fresh official sources. This substantially changed the baseline
the research agents needed, so each was briefed with the new state and told to check
only the roughly 3-day window since that pass rather than re-deriving settled facts.
That cut a lot of redundant research this run would otherwise have wasted budget on.

## Lane (a) — new Unicode Consortium versions/emoji

**Nothing new.** blog.unicode.org's newest post (checked via RSS `pubDate`) was
Sept 25 — CLDR 49 Beta, a locale-data release with no new characters or emoji,
outside this pillar's documented scope (the site has never tracked CLDR; a search of
`updates/` for the term returns nothing). The errata page said "No current errata."
No device showed the actual 9 new Emoji 18.0 characters by default yet, unchanged
from the 09-25 pass's own finding. No UTC #189 agenda had been posted (the meeting is
Oct 26-28).

New false-lead pattern: secondary/aggregator sites (Emojipedia's own listing pages,
MacRumors, WhatEmoji, SymbolNow) still report "19 new emoji" for Emoji 18.0 — that is
the pre-finalization draft candidate count. The primary source (blog.unicode.org)
says "nine new emoji characters" explicitly, matching what the site verified. Cite
blog.unicode.org directly, not an emoji-news aggregator, for the final count.

## Lane (b) — platform formatting/character-support rule changes

One genuine finding, independently verified before trusting it.

### Discord bio character limit increased 190 to 300, plus 4 new Nitro fonts and 2 new name effects

- Source, fetched independently: discord.com's "Discord Update: September 25, 2026"
  blog post. Quote: "We've bumped the amount of characters that you can write in
  your bio from 190 to 300." Also announced: 4 new Nitro name fonts (Monkey Bars,
  Mainframe, Headbang, Journal) and 2 new name effects (Gummy, Prism).
- Published 2026-09-25 — the official Discord blog, the stronger source; a
  data-miner/leak-tracker account had earlier called the same change an unshipped
  "experiment," which the shipped official post supersedes.
- Site is stale, confirmed by grep, not by a research agent's claim alone:
  `discord/index.html` (hub prose, "190 characters" heading and body),
  `usecase/bio-font/discord/index.html` (title, meta, OG/Twitter tags, FAQ schema,
  and the live JS character-counter tool itself — all cite 190),
  `answers/discord-allowed-characters/index.html` (table row "190 chars"). No hit
  for "300 character" anywhere in the three. Locale siblings of all three are very
  likely stale too and were not checked in this pass — a full check is the first
  step of any fix.
- Why the 09-25 pass did not catch it: that pass touched this exact blog post for
  the Display Name Styles angle (one locale page already mentions a "Gummy" effect
  as "announced during 2026") but did not carry the bio-character-limit figure over
  to the bio Check surfaces. A narrow gap in an otherwise thorough pass, not a
  re-litigation.
- Check surfaces affected: the `discord/index.html` hub,
  `usecase/bio-font/discord/index.html` (highest value — a functional counter tool a
  visitor actually uses, not just prose), `answers/discord-allowed-characters/index.html`,
  and their locale siblings. Optionally: add the 4 fonts and the Prism effect to
  `answers/what-are-discord-display-name-styles/index.html`'s running list.

This reads as a numeric-parity-shaped correction across existing pages rather than
obviously a new `updates/` entry — one number and a short list changing, not a novel
rule that needs its own dated article. Put to the user as a choice between a scoped
fix pass and a dedicated `updates/` entry; awaiting a decision.

New false-lead pattern: data-miner/leak-tracker social accounts describing
client-side "experiments" can lag behind or directly contradict an already-shipped
official blog post (exactly this case — one called the 300-character bump unshipped
the same week Discord's own blog announced it live). Prefer the platform's own
blog or newsroom when both exist. Also: "retrospective feature timeline" social
posts (a tidy year-by-year history thread) are a new instance of the existing
"confident synthesis with no primary source" false lead — the tidiness is not
evidence.

## Lane (c) — per-game nickname rule changes

**Nothing new.** Checked every `RULES`-table entry plus adjacent consoles. Notable
non-findings, explicitly ruled out rather than left unchecked:

- Liên Quân Mobile's 10-year-anniversary patch (patch notes published 09-28 for a
  09-29 release) — fetched and read in full, covers gameplay, balance and bug fixes
  only, no mention of name rules.
- VRChat 2026.3.3 (open beta through Sept 24) — cosmetic only, extends the cleared
  window.
- Xbox's Sept 9 Insider wave — badge and profile features only, the gamertag rule
  unchanged since its July 15 GA rollout.
- Minecraft's help center (Zendesk-hosted) returned HTTP 503 on every attempt this
  session — genuinely unreachable, not silently skipped. Worth adding
  `help.minecraft.net` to the standing unreachable-hosts list.

New content-mill domain: `mojicnt.click` (a "Nickname Character Limit for Games and
SNS" aggregator, no primary sourcing) — worth adding to the blocklist alongside the
existing set.

## Cadence note

Genuinely mixed signal this week: two lanes null, but lane (b) produced a real,
verified, actionable finding, the first in several weeks. That argues against moving
to fortnightly right now — a fortnightly cadence would have let this Discord
bio-limit gap sit uncorrected for up to two more weeks. Not recommending the cadence
change this week; will keep raising the question on future null-heavy weeks per the
standing note, but this run's result is itself evidence for keeping it weekly for
now.

## Ranked opportunities

1. Discord bio 190-to-300-character correction (plus the Nitro fonts and effects)
   across `discord/index.html`, `usecase/bio-font/discord/index.html`,
   `answers/discord-allowed-characters/index.html`, and locale siblings. Verified,
   ready to fix. Awaiting a decision: scoped correction pass, or a dedicated
   `updates/` entry.
2. Nothing else.
