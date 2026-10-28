# Updates opportunity scan — 2026-10-26

**Result: nothing new and actionable in any of the three lanes.** This is the
sixth consecutive run with nothing new; the one live watch item from last week
(UTC #189's candidate emoji) has moved forward but still hasn't been decided.

## Baseline update from outside this routine

Before dispatching research agents, this run found that another session
independently corrected several of this site's own figures this week (commit
`f03e36b7e`, already merged, not a finding of this scan):

- Telegram's bio ("About") limit is 70 characters (140 with Premium), not the
  previous "around 200" — sourced from Telegram's own API config. An unsourced
  255-character display-name figure was also removed.
- Pinterest pin descriptions allow 800 characters, not 500 (the site's own
  500-char input box is a separate, intentional UI choice, not a bug).
- A guide page's stale claim that WhatsApp has no usernames was corrected to
  match the already-published `updates/whatsapp-usernames-rollout`.
- `updates/unicode-18-beta-review-opens` corrected "about 90%" to "about 97%"
  for the share of Unicode 18.0's new characters from historical scripts.

All three research agents were briefed with these corrected baselines so they
wouldn't re-flag already-fixed figures.

## Lane (a) — new Unicode Consortium versions/emoji

**Nothing decided yet, but real movement on last week's watch item.** UTC #189
(Oct 26–28, Nancy) is meeting this week as scheduled; as of this check (the
meeting's first morning) its emoji agenda item is scheduled for Wednesday
afternoon — the meeting's last day — so no vote has happened yet.

What did move since 2026-10-19: the five candidate-emoji proposal documents
flagged last week as unposted placeholders are now posted (uploaded 2026-10-23
per the L2/L2026 directory: L2/26-269 Eyes Looking Right, 26-270 Ornate Bottle,
26-271 Orchid, 26-272 Vulture, 26-273 Inukshuk). The ESR Working Group report
for UTC #189 (L2/26-237, revised again the morning of this check) recommends
the same five for Unicode 19.0, but its consensus block is tagged "[185-C]" —
a prior meeting's numbering, the documented signature of pre-meeting
proposed/draft text, not a recorded decision — and the document itself has an
internal inconsistency ("five (4)" characters listed by name as only four) and
an apparent copy-paste error (Inukshuk's citation duplicates Vulture's
document number instead of citing 26-273). Treated as proposed, not decided.
Still nothing to build. blog.unicode.org and the errata page are both
unchanged from baseline; no device/app confirmed shipping actual Emoji 18.0
glyphs by default (only unsourced secondary speculation about a spring 2027
Apple rollout, not reported as a finding).

**Next week's scan should check this first**: UTC #189 concludes Oct 28, two
days before next Monday's run, so real "[189-C]" minutes confirming or
rejecting these five emoji should exist by then.

## Lane (b) — platform formatting/character-support rule changes

**Nothing new.** Checked Instagram, LinkedIn, TikTok, WhatsApp, Snapchat,
Telegram, X/Twitter, YouTube, Meta/Facebook, Threads, Pinterest and Discord's
non-bio changelog/blog against official sources; every surface came back
clean for the window. Discord's October 22 blog update (folder move, Markdown
file preview, Nitro upload size, a new media engine) touches no character
limits or formatting syntax.

## Lane (c) — per-game nickname rule changes

**Nothing new.** Every tracked game/field matched baseline, along with Xbox
Insider, PSN, Nintendo Switch 2 and Roblox DevForum staff posts. VRChat has no
build newer than 2026.3.3p2 (Oct 9); its developer-update blog has nothing
posted in October at all.

New false-lead sighting: the known templated "how to change your name"
content-farm network reappeared under more new domain instances this week
(dealeralchemist.com, pinktankevents.com.au, cfi.co.in, successcolaire.ca,
hamiltonbroadway.com for Fortnite queries; the previously seen `lewisboropd.gov`
and `acsrgmcnlr.edu.in` subdomains recurred again for Minecraft queries) — same
template, no new rule content.

## Cadence and process items — carried forward, still undecided

Both items flagged in last week's record (2026-10-19) remain open and are
reiterated here rather than re-litigated or acted on unilaterally:

1. **Cadence.** This is the sixth consecutive null run (09-14, 09-21, 10-05,
   10-12, 10-19, and now 10-26) — one past the routine's own 2026-08-24
   threshold for raising a move to fortnightly cadence. Still the user's call,
   not this routine's to decide.
2. **Stale trigger prompt.** The scheduled trigger's own stored prompt still
   points at the external workspace this folder's README explains the
   replacement for, and still carries research notes frozen at 2026-08-24.
   This session again found no `update_trigger`/`list_triggers`-equivalent
   tool available to fix it directly.

## Ranked opportunities

1. Nothing new and actionable this week.
2. (Watch item, not a build candidate) UTC #189's emoji vote is scheduled for
   Wednesday afternoon (Oct 28) — check its outcome first thing in next week's
   scan rather than waiting for the normal weekly window to open fresh.
3. (Process item, carried forward) Cadence decision — sixth consecutive null.
4. (Process item, carried forward) Trigger prompt still stale; still no
   access from this session to fix it directly.
