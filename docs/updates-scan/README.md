# Updates opportunity scan

This folder holds the dated record of the **weekly updates opportunity scan** — a
scheduled routine that checks whether anything genuinely new has happened in the three
event types `updates/` tracks (see `.claude/rules/content-architecture.md`, "Content
Type: Updates"): new Unicode Consortium versions or emoji, platform formatting or
character-support rule changes, and per-game nickname rule changes for the games in
`js/gamename/game-rules.js`'s `RULES` table.

Not a GitHub Action — this is a [routine](https://code.claude.com/docs/en/routines)
configured in Claude Code on the web (see `docs/README.md`, "Scheduled routines"). It
runs as a full Claude session, dispatches parallel research across the three lanes,
cross-checks every candidate finding against what the site already publishes, and
writes a dated record here before asking a human which findings (if any) to act on.
It never builds or publishes a page on its own.

## Files

- `YYYY-MM-DD.md` — the dated record for that run. A null result ("nothing new") is
  still recorded: it is what stops the next run re-deriving the same dead ends, and
  it is where a newly discovered false-lead pattern gets written down before it
  reaches the routine's own prompt.
- `latest.md` — a copy of the most recent dated record, for a stable link.

## Why the record lives here, not in a separate workspace

Earlier runs of this routine were instructed to commit their dated record to a
private workspace outside this repository. That workspace was outside the scope any
session running this routine is granted, so three consecutive runs (2026-09-14,
2026-09-21, 2026-09-28) could not complete that step and reported the gap back to the
user each time. It also runs against this repo's own rule that nothing in the tracked
tree may point at an unpublished source (`npm run check:external-refs`,
`scripts/check-external-refs.js` — the pattern list explicitly names that workspace).
Moving the record here closes both problems at once: no session needs access it does
not already have, and the record is where any reader of this repository can actually
follow it.

## Keeping the routine's own prompt in sync

The scheduled routine's prompt (configured at claude.ai/code/routines, not a file in
this repo) carries its own copy of the standing "already published" list and the
known-false-leads list, because a session mid-run can only rewrite that prompt through
`update_trigger`/similar tooling, which is not exposed to every session that might run
this routine. When a run finds a new false-lead pattern or confirms something as
already published, it records that here first; whoever next has the tooling to edit
the routine's prompt should reconcile it against the most recent dated file here
(or the accumulated pattern across several) rather than trusting the prompt's own copy
to be current. Treat the prompt as a cache of this folder, not the other way round.

## Cadence

Weekly, at present. The routine's standing instruction is to raise — not decide —
moving to a lighter cadence (fortnightly, with out-of-band runs around known events
like a Unicode Consortium meeting) after several consecutive null results, and to
reverse that recommendation the moment a run turns up a real finding. See the dated
files for the running history of that judgment call.
