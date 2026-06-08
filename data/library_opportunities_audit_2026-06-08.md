# Library Opportunity Backlog Audit — 2026-06-08

Audit of `data/library_opportunities.csv` against the current `master`/`main`
state of `library/*/index.html` and the merged PRs #248, #251, #253, #254.

Reconciliation was applied by appending a parseable `COMPLETED <date>: …`
marker to the `notes` field of shipped rows. No other columns were altered,
so each row's original workflow history (`action`, `approval_status`,
`dedupe_status`, `priority_score`) is preserved. The notes field already
carried shipment status by existing convention (`generated+validated`,
`updated-existing-page`, `ALREADY SHIPPED on main`).

## What shipped (now marked COMPLETED)

### Create rows — 19 (every `action=create` slug now exists as a live page)

| PR | Slugs |
|----|-------|
| pre-batch-03 | copyright-trademark-symbols, degree-symbol, fraction-symbols |
| #248 | keyboard-symbols, unit-measurement-symbols, recycle-environment-symbols, tech-status-symbols, braille-pattern-symbols |
| #251 | greek-letter-symbols, gender-symbols, medical-symbols, hazard-warning-symbols, media-control-symbols, punctuation-symbols, peace-symbol, yin-yang-symbol, box-drawing-symbols, dice-domino-symbols |
| #253 | laundry-care-symbols (see discrepancy below) |

### Improve-existing rows — 10 (pages expanded in PR #254)

star-symbols, arrow-symbols, math-symbols, currency-symbols, music-symbols,
zodiac-symbols, flower-symbols, checkmark-symbols, cross-x-symbols,
moon-celestial-symbols.

## Discrepancy resolved: laundry-care-symbols (OPP-0010)

The audit task asked to mark `laundry-care-symbols` as **skipped** ("no useful
copyable Unicode care glyph set found during PR #251"). That was accurate **at
the time of PR #251**, whose own description records:

> "Skipped laundry-care-symbols (no copyable Unicode care glyphs exist);
> substituted next-safest approved row dice-domino-symbols."

However, the page was **later created in PR #253** (commit `4061b71`,
2026-06-08) and is live on `main` today as
`library/laundry-care-symbols/index.html` — a validated page with **33
copyable care symbols** (wash / bleach / dry / iron heat / do-not
prohibitions).

Marking the row skipped would make the backlog *less* accurate, contradicting
the goal of this audit, so per maintainer confirmation OPP-0010 is recorded as
**COMPLETED**, with a note preserving the full history (skipped in #251, then
generated+validated in #253). **No new row was marked skipped in this audit.**

## Open item for the owner (not actioned)

Three `fold-into` variant rows carry the `updated-existing-page 2026-06-08`
note because their target pages shipped in PR #254, but they were **not** in
the named "10 improve_existing" list, so they were left un-marked:

- OPP-0024 → arrow-symbols (right-arrow variant)
- OPP-0028 → math-symbols (less/greater-than variant)
- OPP-0032 → currency-symbols (bitcoin variant)

These are functionally folded into shipped pages and could be closed too.

## Backlog state after this audit

| Bucket | Count |
|--------|-------|
| Completed create rows | 19 |
| Completed improve_existing rows | 10 |
| Newly skipped rows | 0 |
| **Remaining create rows** | **0** |
| Remaining improve_existing rows | 63 |
| Remaining needs_review rows | 44 |
| Pre-existing skip rows (untouched) | 40 |

Totals: 176 data rows = 19 create + 73 improve_existing + 44 needs_review + 40 skip.
