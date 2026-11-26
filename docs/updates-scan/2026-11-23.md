# Updates opportunity scan — 2026-11-23

**Result: nothing new and actionable this week.** One minor, explicitly
provisional fact surfaced in lane (a); the UTC #189 finding remains unbuilt
for a fourth week running.

## Baseline update from outside this routine

Before dispatching research agents, this run found that other sessions made
several real, sourced fixes to the site's own game-rules and counter tooling
this week (all already merged, not findings of this scan, used only to brief
this week's research correctly):

- Discord display names now correctly accept any script (not just Latin),
  per Discord's own Help article; Discord's username (2–32,
  `a-z0-9_.`, no double periods) is now tracked as its own separate rule.
- Xbox Gamertag's 13–15 character tier is corrected: it now warns
  "unique-required" for 13–15 Latin characters/digits/spaces instead of
  failing outright, and only fails 13+ with non-Latin characters, per
  Microsoft's own support page.
- New sourced username rules for Snapchat, Telegram, WhatsApp and Pinterest,
  each verified against the platform's own help/developer page. Instagram
  and TikTok were checked and correctly left unsourced (neither platform's
  help pages state a username charset/length).
- X/Twitter's character counter now correctly weights every emoji as 2,
  matching X's own documentation (previously summed code points, overcounting
  complex emoji).

## Carried-forward finding: UTC #189's approvals, still unbuilt

Still nothing built for the four new Unicode 19.0 emoji and the "eyes
looking right" ZWJ sequence (reported 2026-11-02, corroborated 2026-11-09,
unchanged 2026-11-16) — confirmed again via fresh grep. No change to the
pending decision.

## Lane (a) — new Unicode Consortium versions/emoji

**One new fact, explicitly provisional — not actionable on its own.** A
draft summary page for Unicode 19.0 is now live at
`unicode.org/versions/Unicode19.0.0/` (fetched directly; its `Last-Modified`
header reads Wed, 18 Nov 2026, inside this window). It states a target of
"2027 September XX (Announcement)" — the day is explicitly unset — and
carries the same kind of "preliminary draft... errors are expected" notice
that made the equivalent 18.0 page unreliable for a precise date (a known
false lead already on this scan's list). Treating this the same way: it
confirms only the usual annual September release cadence, not a specific
date, and is not cited as if it were one.

Also noted, pure background: blog.unicode.org's first November post
("Reflections on UTW 2026," Nov 17) is a personal conference recap with no
technical content. Everything else unchanged: the errata page, the
black/white reference-image action item (still private, as expected), and
no primary-source confirmation of any device defaulting to Emoji 18.0.

## Lane (b) — platform formatting/character-support rule changes

**Nothing new.** All 12 tracked platforms checked against official sources
for the window; every surface came back clean. One item worth noting as a
near-miss: an X/Twitter changelog entry (Nov 19) adds an API event for
@mentions past the first 280 characters of a longer Post — this is
API event-coverage, not a change to character limits or counting rules.

## Lane (c) — per-game nickname rule changes

**Nothing new.** Every tracked field matched baseline. VRChat's Nov 19
developer update shipped on schedule but its only name-adjacent item is a
cosmetic "Group Nameplate" banner slot — a different field from the
personal display-name rule this site tracks. Free Fire's OB56 still hasn't
shipped. A resurfacing "Nintendo Switch 2 username ban" story was checked
and confirmed to be a stale June 2025 incident (later reversed as a
moderation error), not a new policy.

## Cadence and process items — still carried forward, still undecided

Both items remain open, now in their fifth consecutive week unaddressed:

1. **Cadence.** Still the user's call per the routine's own 2026-08-24 note.
2. **Stale trigger prompt.** Still points at the superseded external
   workspace; still no trigger-editing tool available to this session.

## Ranked opportunities

1. Nothing new and actionable this week.
2. (Still pending since 2026-11-02) UTC #189's five Unicode 19.0
   characters/sequences — awaiting a build decision.
3. (Process items, carried forward) Cadence decision and stale trigger
   prompt, now five weeks unaddressed.
