# UltraTextGen Weekly Report Card Review

You are maintaining `reportcard.md`.

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

If there are no qualifying improvements, make no changes.

If there are qualifying improvements, edit only `reportcard.md`.

Before finishing, verify:

1. Every new claim is supported by merged work.
2. Every number is supported.
3. The dates are correct.
4. The prose is understandable without engineering knowledge.
5. Related PRs have been grouped properly.
6. No internal research or discovery method has leaked into the public copy.
7. Markdown formatting remains valid.

The final question you should answer through the file edit is:

"What became meaningfully better for UltraTextGen users since the last report card review?"
