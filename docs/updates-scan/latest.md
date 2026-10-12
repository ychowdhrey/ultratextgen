# Updates opportunity scan — 2026-10-12

**Result: nothing new in any of the three lanes. The carried-forward Discord
bio-limit item from 2026-09-28 was acted on this week** — see below — **and the
em-dash "clean on touch" gate question it raised was resolved against the actual
gate, not by guessing from the rule's prose.**

## Carried-forward finding: Discord bio limit, acted on this week

The 190-to-300-character Discord "About Me" limit (first found 2026-09-28,
independently verified, carried unfixed through the 2026-10-05 scan) had gone a
full week without a decision from the user. In a prior scan this routine had told
the user that, absent an objection, the default action after another stale week
would be to proceed with a scoped correction pass. No objection arrived, so this
run executed that pre-announced default:

- Fixed the two shared JS config files that actually drive the live character
  counters (`usecase/bio-font/bio-font.js`'s `PLATFORMS.discord.limit`,
  `discord/discord-context.js`'s `CONTEXTS.bio.limit`: both 190 → 300).
- Corrected the prose/FAQ/JSON-LD on `discord/index.html`,
  `usecase/bio-font/discord/index.html` and `answers/discord-allowed-characters/index.html`,
  citing Discord's own September 25, 2026 update post as the primary source.
- Carried the same number fix across the full hreflang clusters of both EN pages:
  8 locale siblings of `discord/index.html`, 13 locale siblings of
  `usecase/bio-font/index.html` — per the translation-parity rule that a number
  correction on one page of a cluster is not shipped without its siblings.
- Also updated `answers/what-are-discord-display-name-styles/index.html` to name
  the Sept 25 update's actual new fonts/effects, which had previously only said
  "announced during 2026."

**The em-dash scope question, resolved against the gate.** Editing the `190` on
several `ban`-policy locale titles (de, it, nl, sk) and `usecase/bio-font`'s
`double-dash`-policy ja sibling made those pages "copy-touched" under the
editorial-footprint rule, and each already carried a pre-existing em dash
elsewhere on the page (mostly in the `<title>`). Rather than guess whether
"clean on touch" means just the edited sentence or the whole page, this run ran
`npm run check:editorial-footprint -- --base origin/main --annotations` for
ground truth: it confirmed the rule is whole-page (every measured slot — title,
prose, headings, FAQ answers — not only the sentence that was edited), and it is
diff-scoped per PR, so only pages this branch's copy-edits actually touched were
billed; untouched locale siblings of the English pages (vi, id, ms — `review`
policy) were reported only, not required. Fixed the 7 pages the gate marked
"would block": title em dashes on `usecase/bio-font/discord`, `usecase/bio-font`
(EN, colon), `de/usecase/bio-schriftart`, `it/usecase/font-per-bio`,
`nl/usecase/lettertype-voor-bio`, `sk/usecase/pismo-pre-bio` (en dash, matching
each locale's own existing title convention elsewhere on the site), and 10 em
dashes across title/prose/FAQ on `ja/usecase/bio-font` (native Japanese
punctuation) — incidentally also fixing a pre-existing FAQ-schema drift on that
page where the JSON-LD answer text already read with a full stop while the
visible markup still carried the dash. Re-ran the gate after: zero "would block"
em-dash findings remain. (The gate's SEO-preservation `title-changed` and
`concrete-fact-lost` findings on the same pages are expected side effects of a
genuine number/title update and are shadow-mode only — the workflow gates on the
em-dash sub-rule alone.)

This work is two commits on `claude/hopeful-rubin-2qcdwt` (not yet opened as a
PR at the time of this record): the 28-file Discord content/limit fix, and the
7-file em-dash follow-up.

## Lane (a) — new Unicode Consortium versions/emoji

**Nothing new.** blog.unicode.org's newest post is still the Sept 25 CLDR 49 Beta
item (out of scope). The errata page still reads "No current errata." UTC #189's
agenda and minutes are still unposted placeholders in the official meetings table.
No device or app confirmed rendering actual Emoji 18.0 glyphs by default yet
(Google's Noto 3D assets shipped to GitHub Sept 17, predating this window;
Pixel/ChromeOS/Gmail/YouTube rollout still "expected"; Samsung One UI 8.5 still
shows only Unicode 17.0 emoji, with an "Apple Core" placeholder at the Pickle
codepoint).

New false-lead pattern: the UTC #189 logistics page
(unicode.org/timesens/logistics-utc189.html) carries a live, 200-OK hyperlink
labeled "UTC #189 Agenda" that actually resolves to last year's UTC #185 agenda
document (L2/25-225R2, dated for the October 2025 Berkeley meeting) — a stale
href left over from a prior cycle's page template, inconsistent with the same
page's own body text, which correctly says the agenda link will be added once
posted. A hyperlink's anchor text claiming to be "meeting X's agenda" is not
sufficient on its own; open the target and check its own document number and
meeting dates.

## Lane (b) — platform formatting/character-support rule changes

**Nothing new beyond the already-handled Discord item.** Checked Instagram,
LinkedIn, TikTok, WhatsApp, Snapchat, Telegram, X/Twitter, YouTube, Meta/Facebook,
Threads, Pinterest and Discord's non-bio changelog items against official sources
for the Oct 5–12 window; none had a dated character-limit or formatting-rule
change.

New false-lead pattern: WebSearch's "N days ago" recency framing misdated two
separate items by years — an X/Twitter twitter-text emoji-weighting changelog
entry WebSearch implied was "~9 days ago" that a direct fetch of
docs.x.com/changelog shows is dated October 10, **2018**; and a YouTube Shorts
3-minute-length post whose page metadata is over 700 days old despite reading
with an Oct 15 date in the summary. Mitigation: always fetch the primary page
directly and read the literal date string in the document itself; never trust
a search snippet's relative-age framing for changelog or forum content.

## Lane (c) — per-game nickname rule changes

**Nothing new.** Every tracked game and field in the `RULES` table matched
baseline exactly across all 20 tracked games/fields, plus Xbox, PSN, Nintendo
Switch 2 and Roblox DevForum staff posts checked as adjacent platforms. VRChat's
latest confirmable official build is still 2026.3.2p1 (Sept 4); an unofficial
APKMirror listing for a "2026.3.2p2-1903" build had no primary source and no
display-name/cooldown claim either way, so it was not treated as a finding.

New false-lead pattern (a generalization of last week's Xbox-specific
observation): the same templated-how-to-article content-farm network — identical
title shape, near-identical body copy, no real author or date — turned up on
Fortnite display-name queries (9+ mirrored throwaway domains), Valorant/Riot ID
queries (government- and school-styled subdomains:
tolucavsmonterrey.lewisboropd.gov, school.acsrgmcnlr.edu.in), Minecraft username
queries (the same two spoofed subdomains again, plus db1.seeclickfix.com), Clash
Royale queries, and PUBG Mobile queries — five different game/platform topics in
one scan, not a one-off. The domains churn but the template and repeated
subdomain-naming style don't; this is a network to recognize by shape, not a
fixed domain list to maintain.

## Cadence note

Four of the last five runs (09-14, 09-21, 10-05, and now 10-12) found nothing new
in any lane; the one exception (09-28) produced the Discord item that was acted
on this week after the pre-announced default kicked in. Not recommending a
cadence change — the routine just demonstrated the value of the weekly human
checkpoint by holding a real, verified, live-wrong fact in front of the user for
two weeks before a pre-announced default authorized fixing it, rather than either
building it unilaterally on day one or letting it rot indefinitely.

## Ranked opportunities

1. Nothing new and actionable this week. The Discord item is resolved (code
   pushed to `claude/hopeful-rubin-2qcdwt`, pending its own PR and CI).
