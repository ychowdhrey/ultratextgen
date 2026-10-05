# UltraTextGen Weekly Report Card Review

You are maintaining `reportcard.md`.

This file is the instruction set for the weekly Claude Code Routine that keeps
the report card current. The Routine's own prompt only points here, so change
the process by editing this file through a pull request.

## Before you start

1. If an open pull request already proposes a report card update (title
   "docs: weekly report card update"), stop. Do not open a second one covering
   the same weeks. Report that the earlier pull request is still waiting for
   review, and end the run.
2. The review window starts at the merge of the most recent pull request that
   changed `reportcard.md` on `main`, and ends now. Find that point from git
   history (`git log origin/main -1 -- reportcard.md`), never from memory or
   from this file.

Your job is to review work merged since the most recent report card update and add only meaningful user facing improvements.

Do not rebuild the historical report card.

## What to review

1. Read `reportcard.md`.
2. Use git history and GitHub PR information to inspect work merged after the latest report card update.
3. Check direct commits to `main` during the same period.
4. Read PR descriptions, diffs, follow up fixes, tests, screenshots, audit notes and validation material when needed to understand the real user outcome.
5. Recheck the recent period once before finishing so that meaningful changes are not missed.

## What belongs in the report card

Include a change when an ordinary UltraTextGen user would meaningfully experience a better product.

Typical examples:

* A broken experience was fixed.
* Printing or worksheet rendering became more reliable.
* A generator gained useful functionality.
* Mobile usability improved.
* Accessibility improved.
* Sharing improved.
* Localization improved.
* Navigation became easier.
* A recurring rendering or content problem was corrected.
* An existing capability expanded to meaningful additional languages or pages.
* A useful new tool or capability launched.
* A previously unreliable output became trustworthy.

Usually exclude:

* Dependency updates.
* Internal refactoring.
* Code cleanup.
* File moves.
* Developer tooling.
* CI changes.
* Test infrastructure.
* Naming changes.
* Routine library upgrades.
* Lint fixes.
* Internal architecture changes without visible user impact.
* Pure SEO implementation changes with no meaningful user experience improvement.
* Tiny wording changes unless they solve real confusion or affect many pages.

The existence of a PR is not enough reason to create an entry.

## Core writing rule

Describe the outcome, not the implementation.

Bad:
"Updated SVG viewBox calculations."

Good:
"Single letter worksheets now print at a consistent size instead of appearing oversized."

Bad:
"Added locale aware OG rendering."

Good:
"Shared page previews now appear in the same language as the page itself."

Write for a parent, teacher, student or ordinary website user.

Use plain English, short sentences and concrete outcomes.

## Mandatory entry standard: Feature, Advantage, Benefit, Use Case, Evidence

Every entry is an end user benefit record, not a release note. Build each one
on this chain, written as natural prose rather than labelled fields:

1. **Feature**: what capability, improvement or fix is now available.
2. **Advantage**: what the user can now do more easily, quickly, accurately,
   flexibly or reliably.
3. **Benefit**: the practical value that creates.
4. **Use case**: who benefits and in what situation.
5. **Evidence**: the verified number, before and after comparison or scope
   that supports the claim.

The golden rule: never stop at what changed. Every entry must answer
"So what for the user?"

These rules are mandatory for every entry:

1. Write from the end user's perspective. The underlying fact may be about
   UltraTextGen; the entry explains what that fact means for the user.
2. Follow Feature, Advantage, Benefit, Use Case, Evidence. Do not force five
   labels into the text; the prose should carry the chain.
3. Do not stop at "what changed".
4. Always answer "So what for the user?"
5. Prefer a verified before and after comparison (before, now, why it
   matters) where it makes the benefit clearer.
6. Never invent a baseline. Use a "before" only when merged work or its
   commits state it. Never manufacture a comparison to make an entry sound
   stronger.
7. Numbers support the benefit; they are not the story. Keep a number when it
   helps the reader understand the benefit. Leave out internal metrics that
   mean little to a user.
8. Each entry must stand alone when retrieved on its own by a search engine
   or an AI assistant. Do not open with "This feature", "It now" or "These";
   repeat the subject.
9. Name the affected feature or tool explicitly ("The name tracing
   worksheet...", "The Zalgo glitch text generator...").
10. Use plain language.
11. Technical implementation details belong in the pull request's evidence,
    not the entry, unless they matter directly to the user.
12. Do not add competitor comparisons to the report card.
13. Do not describe ordinary product differences as research. Only work with
    a real test, benchmark or published methodology is research, and it lives
    under `/research/`, not here.
14. Preserve dates and verified scope.

Name the audience where it adds meaning: teachers, parents, students, gamers,
creators, social media users, people printing at home, users on phones, users
working in another language. Do not force an audience label where it adds
nothing.

Claim only benefits that follow from the feature, and phrase plausible but
unmeasured benefits conservatively. "Reduces repetitive setup" is acceptable;
"saves teachers 30 minutes per class" is not, unless that time was measured.

Bad:
"Printables gained class list support."

Good:
"Teachers can now type a class list once and reuse it on every worksheet tool.
Before, each tool kept its own list, so a class of thirty had to be retyped
when moving between worksheets."

Bad:
"Four worksheets can now fit on one sheet."

Good:
"Teachers can print four sheets on one page, so a class set for 30 children
uses about 8 sheets of paper instead of 30."

Bad:
"Zalgo gained additional modes."

Good:
"The Zalgo glitch text generator now offers two stronger effects for creators
and gamers who want more dramatic text, without assembling Unicode marks by
hand."

### Keep content types separate

The report card answers one question: what became better over time. Other
questions belong on other pages, and the weekly run does not create them:

* What UltraTextGen can do today belongs on a feature or tool page.
* How an approach differs from alternatives belongs on a comparison page.
* What measured evidence shows belongs under `/research/`.
* How to accomplish a task belongs under `/learn/`.

If a new entry reveals a capability that deserves its own page, say so in the
pull request description rather than expanding the report card.

## Public information rule

You may use internal research, audits, Reddit findings, competitor analysis, tests and validation work to verify an improvement.

Do not expose that discovery process in the public report card.

Do not link to or describe internal research, competitor analysis, Reddit mining, opportunity scoring, unpublished experiments, internal prioritization or private audit methodology.

The public entry should focus on:

* What improved.
* Why it matters.
* How broad the improvement was, where verified.
* When it happened.

## Quantification

Actively look for trustworthy numbers such as:

* Pages improved.
* Languages affected.
* Cards regenerated.
* Generators improved.
* Previously broken pages fixed.
* Test cases validated.
* Items corrected.
* Localized pages added.

Do not invent numbers.

If a number cannot be verified, omit it.

## Grouping

Several PRs may represent one user outcome.

Group related PRs into one report card entry when they solve the same problem.

Do not combine unrelated improvements merely because they happened on the same day.

## Dates

Use the date the improvement became available on `main`.

If several PRs completed one improvement, use the date the improvement became meaningfully complete.

## Duplicates

Before adding an entry, search `reportcard.md` for the same capability or issue.

Only add a new entry when the recent work creates a materially new outcome, meaningful expansion or completed fix.

## Confidence threshold

Internally classify candidates as high, medium or low confidence.

Publish only high confidence entries.

Investigate medium confidence candidates further.

Exclude low confidence candidates.

## Historical integrity

Do not make UltraTextGen sound perfect.

If something was genuinely broken before, it is acceptable to state that plainly and constructively.

Do not use marketing superlatives.

Do not include PR numbers, file paths, function names, framework terms or implementation details in the public prose.

## Editing behavior

Preserve the existing voice and structure of `reportcard.md`.

Newest entries must appear first within the correct month.

Do not rewrite older entries unless a factual correction is clearly necessary.

If there are no qualifying improvements, make no changes and open no pull
request.

If there are qualifying improvements, edit only `reportcard.md`.

Do not use em dashes in new entries. Use commas, colons or full stops, as the
existing entries do.

Before finishing, verify:

1. Every new claim is supported by merged work.
2. Every number is supported.
3. The dates are correct.
4. The prose is understandable without engineering knowledge.
5. Related PRs have been grouped properly.
6. No internal research or discovery method has leaked into the public copy.
7. Markdown formatting remains valid.
8. Every new entry answers "So what for the user?" and reads as a benefit
   story, not a release note.
9. Every new entry names its feature or tool and makes sense on its own.
10. No baseline, saving or outcome was invented, and no competitor or
    research claim was added.

The final question you should answer through the file edit is:

"What became meaningfully better for UltraTextGen users since the last report card review?"

## Delivering the change

Only when `reportcard.md` changed:

1. Create a branch from the latest `main` named
   `claude/reportcard-weekly-<YYYY-MM-DD>` using today's date.
2. Commit with the message `docs: weekly report card update`.
3. Run `npm install` and then `npm run check:ci-gates`. Fix anything your edit
   caused before pushing.
4. Push the branch and open a pull request titled
   `docs: weekly report card update`. In its description, list each new entry
   with the pull requests and commits that support it and how each number was
   verified. That evidence belongs in the pull request, never in the report
   card itself.
5. Do not merge it. A person reviews and merges every report card update.

