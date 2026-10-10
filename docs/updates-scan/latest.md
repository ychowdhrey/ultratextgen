# Updates opportunity scan — 2026-10-05

**Result: nothing new. One carried-forward, verified, actionable finding from last
week is now a full week stale on the live site and still awaiting a decision.**

## Repo state check

Origin had moved on with unrelated work since the prior run (a Free Fire player
report-board feature, SEO meta-description length fixes, and more). None of it
touched the Discord bio limit, `updates/` content facts, or the `RULES` table's
limits. `updates/` still held the same 12 entries; their only change in the window
was a cosmetic meta-description length fix (`00a8552d5`), not a content correction.

## Carried-forward finding: Discord bio limit, still unfixed after a week

Last week's scan (2026-09-28) found, and I independently verified, that Discord
raised its bio (About Me) character limit from 190 to 300 characters, announced in
its official blog post "Discord Update: September 25, 2026," alongside 4 new Nitro
name fonts (Monkey Bars, Mainframe, Headbang, Journal) and 2 new name effects (Gummy,
Prism).

Checked again today, directly: the site is still stale. `discord/index.html`,
`usecase/bio-font/discord/index.html` (including its live JS character-counter tool
a visitor actually uses), and `answers/discord-allowed-characters/index.html` all
still say 190, with no occurrence of "300 character" anywhere in the three. A
separate copy-correction commit touched one of these FAQ answers in the window
(`e05fb475f`, 2026-10-02) and left the 190 figure untouched — reinforcing it, not
catching it.

This has now sat unaddressed through two full runs of this routine. Repeating the
choice put to the user last week: a scoped correction pass across the three affected
pages (and their locale siblings), or a dedicated `updates/` entry. Not acting on it
unilaterally — the routine's own standing instruction is to ask before building or
changing anything the scan turns up, not to decide alone just because time has
passed.

## Lane (a) — new Unicode Consortium versions/emoji

**Nothing new.** blog.unicode.org's newest post is still Sept 25 (CLDR 49 Beta,
out of scope). The errata page still reads "No current errata." UTC #189's agenda
and minutes are still unfilled placeholders. No device shows the actual Emoji 18.0
glyphs by default yet — confirmed by excluding syndicated press that recirculates
the *prior* Emoji 17.0 rollout without restating the version number.

New false-lead pattern: WebSearch results for "Emoji 18.0 device support" surface
syndicated local-press coverage of the Emoji **17.0** rollout (Jan-Mar 2026) that
often omits the version number entirely, reading as if it describes 18.0. Confirm
the version number is stated explicitly in the source before treating a device
rollout claim as current.

## Lane (b) — platform formatting/character-support rule changes

**Nothing new beyond the carried-forward Discord item above.** Checked all 12
platforms in this lane (Discord, Instagram, LinkedIn, TikTok, WhatsApp, Snapchat,
Telegram, X/Twitter, YouTube, Facebook, Pinterest, Threads) against official sources
for the window; none had a dated character-limit or formatting-rule change.

New false-lead pattern: a cluster of "evergreen character-limit" content-mill sites
(replug.io, typecount.com, wordcountertool.net, howmanywords.app, handlegrab.com,
sendcove.app, unilink.us, advancedcharactercounter.com, socialcal.app, virlo.ai,
tlinky.com, napoleoncat.com, rybbit.com, recurpost.com, boomp.net, postfa.st,
postplanify.com, socialrails.com, socialk.it, sendible.com) dominates generic
"`<platform> character limit <year>`" searches regardless of whether anything
changed, cites each other circularly, and occasionally injects an unsourced
"limit doubled" claim with no newsroom link. One such claim this week ("TikTok bio
limit doubled from 80 to 160") was dropped as unverified: no TikTok source backs it,
and other pages on the same domains still cite 80.

## Lane (c) — per-game nickname rule changes

**Nothing new.** Every tracked game and field matched baseline exactly. VRChat's
latest actual release (2026.3.2p1, Sept 4) is older than the already-cleared 2026.3.3
from last week — no 2026.3.4 exists. Xbox, PSN, Nintendo and Steam all unchanged.

New false-lead notes: the "Riot ID 30-day cooldown" false lead (the real figure is
90 days, no paid changes) is now confirmed recurring across at least two consecutive
scans regardless of query phrasing — treat it as an expected recurrence, not
something that needs re-disproving each time. Also newly observed: the identical
article "How to Change Xbox Gamertag: The Ultimate Guide to Personalization" mirrored
verbatim across unrelated-looking throwaway domains, one styled like a government
subdomain — a content-farm pattern distinct from the fixed-domain blocklist (a
duplicated title/body across unrelated domains is itself the tell, regardless of the
specific domain name).

## Cadence note

Three of the last four runs (09-14, 09-21, 10-05) found nothing new; one (09-28)
found one real item that is still unresolved a week later. Not recommending a
cadence change this week — an unresolved, live-wrong fact on a functional tool
argues for keeping a human decision point in front of this routine regularly,
regardless of how often a fresh finding appears.

## Ranked opportunities

1. Discord bio 190-to-300-character correction (carried forward from last week,
   now a week stale) — verified, ready to fix. Still awaiting a decision: scoped
   correction pass, or a dedicated `updates/` entry.
2. Nothing else.
