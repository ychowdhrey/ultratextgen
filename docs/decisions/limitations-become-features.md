# Limitations become features (owner decision, 2026-10-03)

Current invariant: `.claude/rules/editorial-copy.md` → "A limitation is a feature
brief, not a disclaimer". One line of it also sits in the root `CLAUDE.md` under
the core philosophy, because it governs what gets built, not only how copy reads.

## The decision

When the site runs into something it cannot know or control (a platform that does
not publish its rules, a filter that changes without notice, a device that renders a
character differently, a cost the reader pays if we are wrong), **the answer is a
feature, not a disclaimer.**

State the limitation once, plainly, as a fact. Then name what the site does about
it: a check that runs before the reader commits, a measurement, a loop that learns
from what readers report, a fallback. A sentence that ends with "check before you
spend" and nothing behind it hands our job to the reader. The owner's words:
converting a limitation into a feature is how this site wins.

## The case that produced it

The Free Fire pages said, as fact, that *"the Free Fire name field accepts these
Unicode characters."* Nobody had verified it. Garena publishes no list of the
characters a nickname may contain; its patch notes and help pages are silent on
the question, and its Brazilian help article goes the other way, telling players to
avoid special characters because how they display depends on the device.

The first correction drafted was accurate:

> Players report that these characters work in Free Fire names, but Garena does not
> publish which characters the name field accepts, so check a name with the checker
> below before you spend a Name Change Card.

The owner rejected it. It describes the problem and leaves the reader alone with
it, and it reads like a site that does not want to own the outcome. (It also sent
readers to a checker "below" the paragraph. The checker sits above it.)

What shipped instead turns Garena's silence into the reason the checker exists and
gets better:

- **The copy** says the fact once and then what we do: *"Garena doesn't publish
  which characters a Free Fire name can hold, so we track it from player reports.
  The name check above flags any character players have seen refused, and after you
  try a name in the game, one tap tells us whether it went through."*
- **The checker** now asks the one party who finds out, the player who just tried:
  *It went through · It was refused (and what the game said) · It shows as boxes.*
  Each answer is a `name_outcome` row carrying the checker's own verdict, the four
  length counts a field might use, and the decorative characters only. The typed
  name is never sent; `js/gamename/gameRules.test.js` gates that.

Two design choices carry the principle:

- **Ask for both outcomes.** Refusals alone have no denominator, and "it went
  through" on a name the checker failed is exactly what proves one of our own rules
  too strict. Free Fire's "decorative symbols count as 2" is the stricter of two
  conflicting readings, so a report that a name counting 14 under that rule went through is
  evidence no document can give us.
- **Record every hypothesis, pick none.** Code points, UTF-16 units, UTF-8 bytes and
  "every non-ASCII character as 2" are all on the row, so the reports decide which
  rule the game applies.

## The test, for any sentence that admits a limit

1. **Does it end with something the reader must do alone, or with something we
   built?** If alone, find or build the mechanism. If none can exist, say what the
   reader does and why it works.
2. **Is the mechanism real and on the page today?** Never promise one that is not
   shipped. Until it is, the limitation is a product brief: raise it, and the copy
   states only the fact and today's best action.
3. **Is the certainty still honest?** Owning a limit never upgrades an unverified
   claim. "We track it from player reports" is true. "These characters work" was not.
4. **Does a wrong answer cost the reader money, an account or a ban?** Then the
   conservative rule stays visible. The feature sits beside it, not instead of it.

## Patterns, with the ones already in this repo

| Limitation | Feature |
|---|---|
| A platform publishes no rules | A checker that runs before the reader commits (`js/gamename/game-rules.js`, 20 rule rows), plus an outcome loop that learns from players (`name_outcome`) |
| Sources conflict on a rule | Encode the stricter reading as a warning, never a fact (`weightUncertain`, `reportedBlocked`), and measure every hypothesis per report |
| A character may render as boxes on some phones | Name the exact characters at risk (the checker's per-glyph panel), and let players report it ("It shows as boxes") |
| A rule changed and nobody announced it | The same reports, dated, show the step change; that is news no one else can publish |

## Executed, and not yet executed

- **Code and copy:** [`ychowdhrey/ultratextgen#998`](https://github.com/ychowdhrey/ultratextgen/pull/998)
  (open at time of writing; record the merge commit here once it merges).
- **The reports reach no one until the tag manager forwards them.** `name_outcome`
  is pushed to the data layer like every other product event, and GTM forwards only
  events that have a trigger and a GA4 tag. Its trigger, tag, variables and custom
  definitions are a container change made outside this repository. Until that
  ships, the button collects nothing, and the promise in the thank-you line is not
  yet kept.
- **One page so far.** The reporter is opt-in per page (`text.outcome` in the
  checker config). It is live on the English Free Fire generator only; locale pages
  and the other games need their own strings.
