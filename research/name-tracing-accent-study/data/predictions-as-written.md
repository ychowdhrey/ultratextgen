# Predictions and rules as written

Written before the runs they govern, then compared with what happened. Anything added afterwards is labeled.

## Written before running

**P1 (before the nine extra names were run).** If the cause is a box of fixed height, marks below the baseline (a dot below, an ogonek, a cedilla, a comma) will be clipped on the cursive worksheet and not on the print-style worksheets. Names with no marks but a descender will be clipped on cursive too.
Outcome: confirmed in both repeats. Cursive flagged 9 of 9; the six other worksheets flagged 0 of 54. The two controls without marks, Zoe and Gypsy, were clipped on cursive as predicted.

**R1 and R2, the flag rule.** A cell is flagged when the weakest mark region is less than 60% present, or the expected name fits worse than 0.85.

## Added afterwards

**R3 (added after the fault-injection run).** Also flag when more than 0.2% of the expected ink is missing. Reason: R1 and R2 caught 154 of 161 names with marks removed, and the misses were a thin Polish bar and one small accent. The combined rule was then re-tested on the same data and caught 161 of 161, so that figure is tuned and not independent.

**Fix thresholds (added while writing the fix).** The fix grows a name's box only when ink overflows the box the row will have by more than 6 units. Reason: an earlier version without the margin resized working print pages by about 5%, and a version that counted ruling lines moved the French ruled page by 7.5 units; both were found by comparing every name page with the commit before the fix.

## Not written beforehand

That the fix would clear all eight affected pages, and that the long name would be flagged after it. The long-name flags were explained afterwards with a horizontal-stretch check (long-name-stretch-check.csv).
