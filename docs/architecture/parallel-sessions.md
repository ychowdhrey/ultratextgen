# Parallel sessions — collisions git cannot see

Invariants: root `CLAUDE.md` → "Git and shipping". Tooling:
`npm run check:pr-overlap`, `npm run check:stranded-work`, and the Stop hook at
`.claude/hooks/warn-untracked-work.sh`.

Multiple sessions work this repository concurrently. **Git's conflict detection is
textual and per-hunk**, so two sessions can edit one module in one week and merge
without a conflict, and two locale slugs for one EN parent are two *paths* that merge
clean.

## Duplicate claimants — the collision detector is not path conflicts

Translation work is where this bites hardest: two sessions closing the same locale gap
can pick **different locale slugs for the same EN parent** (e.g. `id/symbol/yin-yang/`
vs. `id/symbol/simbol-yin-yang/`). Both directories merge cleanly and silently coexist
as duplicates.

**Case (2026-07-25):** 26 such duplicate pairs survived a merge of main. They were
caught only because `validate_library_pages.py` flagged **one duplicate meta
description**, and then confirmed by checking every `id/symbol/` page's `hreflang="en"`
back-link for multiple claimants of the same EN parent.

The standing protocol:

1. **Before starting a translation batch**, fetch and merge main, then list what
   already exists for that locale and lane — main may have grown pages your branch's
   plan assumes are missing.
2. **After every merge of main into a branch that adds locale pages**, check for
   duplicate claimants: **no two pages in one locale may declare the same
   `hreflang="en"` parent.** *That* check, not path conflicts, is the collision
   detector.
3. **When duplicates are found**, keep the set that is more deeply integrated (better
   meshed, more inbound links — usually main's), remove the other, and repoint every
   reference to the removed slug at the survivor.

## The same thing in a shared module

The `share-core.js` case is the same failure arriving in one file instead of two
paths: the fire-on-success fix and a `share_destination` branch were written on
2026-09-13 by two sessions, in the same file, on the same day. Only one merged, and the
other was still carrying a redundant copy of the refactor six days later. Git merged
nothing cleanly and nothing flagged it.

**A code comment is not a record.** That change documented itself only inside
`share-core.js`, so the second session had no way to find it without reading the file.

## `npm run check:pr-overlap`

It takes the files a branch changes and reports which other pull requests — open now,
or merged inside a recent window (default 14 days) — touch any of the same ones.
Nothing is stored and nothing is configured: the answer is the PR list and the diff,
both of which GitHub already has. `--pulls-json <file>` supplies the PR list from
disk, which is what makes it testable against a real fixture.

**It never gates**, and that is deliberate rather than cautious. Two branches touching
`style.css` is normal most weeks, and a check that failed a PR for it is one people
would learn to ignore. It prints to the job summary, where the author reads it.

**It fails closed in what it says.** No token, a rate limit, a shallow checkout with
no merge base: it prints `UNKNOWN` and the reason, never "no overlaps". An
informational check is not exempt from *a check that reports nothing is
indistinguishable from a check that passes* — an author who reads "no overlaps" from a
check that never ran is worse off than one who reads nothing.

### Ordering is the whole usability of it, and the first CI run proved the first draft had it backwards

That run reported **22 of 46 PRs overlapping**, sorted by how many files each shared —
which put seven PRs sharing `{validate.yml, CLAUDE.md, package.json}` at the top and
buried the one that mattered, **the only OPEN PR, at position 13.** So:

- **Open before merged.** A merged PR overlapping your files is history — useful
  context, nothing to coordinate. An open one can still conflict at merge time. The
  headline states how many are open, and an open PR is never truncated away.
- **Then rarest shared file first**, with each file's frequency printed
  (`_redirects (1/46)` against `CLAUDE.md (15/46)`). A file a third of the repo's PRs
  touch says nothing; a file one other PR touches is the point. Frequency is
  **measured across the PRs compared**, so there is no noise list to maintain and none
  to go stale — the three genuinely ubiquitous files here could not have been listed
  in advance anyway, and listing them would have deleted the live collision the run
  found.

A second draft collapsed PRs whose every shared file exceeded a >50% threshold;
measured against the real run **nothing reached it**, so that was a guessed number
that never fired, and it was replaced with a plain display cap. Only generated files
nobody writes — `sitemap.xml`, the sitemap cache and `package-lock.json` — are
excluded outright.

Verified by replaying the real case: given the 2026-09-13 commit as an open PR and the
2026-09-19 `share_destination` commit as the branch under test, it names
`js/share/share-core.js` among the shared files. Its first live run found a real
overlap too — two concurrent branches both editing the project instructions.

## Stranded work

**A merged PR cannot track new work.** Push onto a branch after its PR merged and the
commit is finished, gate-passing and **invisible** — no open PR tracks it, and it will
never reach master. This repo has lost work that way at least five times, for between
4 hours and 2 months.

The failures all land at the **end** of a session, which is exactly where a skill
loaded at the start has no reach — so the check belongs in a Stop hook.
`.claude/hooks/warn-untracked-work.sh` is advisory only: it always exits 0 and never
sets `continue: false`, because a coordination reminder that can block a session is a
reminder people disable. It compares against the branch's **own** remote ref rather
than `@{u}`, since a branch created with `checkout -B <name> origin/main` has
`origin/main` as its upstream. A branch with no merge-base cannot be measured (shallow
clone) and it says so rather than reporting a reassuring zero.

`npm run check:stranded-work` is the batch equivalent, with
`data/stranded_work_exclusions.json` for branches knowingly left untracked.

## Shallow clones defeat history questions

Sessions here work a shallow clone, so `git log -S` bottoms out at the graft and
**confidently names the wrong commit** — measured once, the boundary was 2026-07-24 and
the answer it gave was an unrelated PR three weeks after the real one. Run
`git fetch --deepen=<n>` before trusting any first-add or first-removal date, and note
that a shallow clone also reports a useless first-add date for every file.
