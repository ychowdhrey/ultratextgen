# Rebuilding the numbers on the study page

The study used the site's source files at commit 761bda3b9426b62c61c355a56684c3a79e025c13. A rebuild on a later commit gave identical list files, so the scripts check the commit and accept `--no-pin`.

Needs: Python 3.13, Node 22, `pip install fonttools==4.66.1 scipy`, `fc-list` (fontconfig), and for the browser check a Chromium plus Playwright 1.56. Save the Unicode files named in `source-files.csv` in one folder and check their SHA-256 hashes. Run everything from this `data` folder (the scripts are in `scripts/`).

1. The list of faces and their Unicode properties
   `python3 scripts/reproduce-corpus.py <site checkout> --ucd <folder with the Unicode files> --out out --no-pin`
   Writes `out/faces-all-columns.csv`, `out/codepoints.csv`, `out/occurrences.csv`, `out/exclusions.csv`. The face strings match `faces.csv`.
2. Missing characters per font set (no browser needed)
   `python3 scripts/font-coverage.py out scripts/fontconfig-basic.conf` and `python3 scripts/font-coverage.py out scripts/fontconfig-basic-plus-cjk.conf`
   Expect 986 of 1,616 and 334 of 1,616 faces, with the group counts on the study page. The result depends on the exact fonts those folders hold on your machine.
3. Browser check: the drawing check for missing characters, widths, text insertion and clipboard
   `python3 scripts/make-font-test-input.py out`
   `PLAYWRIGHT_NODE_MODULES=<folder containing playwright> CHROMIUM_PATH=<chrome binary> node scripts/font-test-browser.mjs basic-plus-cjk scripts/fontconfig-basic-plus-cjk.conf out/font-test-input.json out/basic-plus-cjk.json --roundtrip`
   Use `system` instead of a fontconfig file to test the fonts of the machine you run it on (our container's full set gave the second width result on the page and cannot be rebuilt elsewhere). The output holds the drawing check's controls: the unassigned characters must be flagged and `abc` and `(^_^)` must not.
4. Markdown
   In a new folder save `scripts/markdown-package.json` and `scripts/markdown-package-lock.json` as `package.json` and `package-lock.json`, run `npm install`, copy `scripts/markdown-test.mjs` into it, then run `node markdown-test.mjs <path to faces.csv or out/faces-all-columns.csv> <output folder>`. Compare the output folder's `markdown-per-face.csv` with `markdown-results.csv`. (The pinned markdown-it 14.1.0 has a published moderate denial-of-service advisory; this is a test harness, not site code.)
5. The statistics
   `python3 scripts/compute-statistics.py . --width out/basic-plus-cjk.json <the same output from another font set>` recomputes the counts, shares, odds ratios, intervals, Fisher tests, Holm adjustment and the width test from the published CSV files and prints them. Numbers that depend on a font set differ on other machines.

What this cannot reproduce: other operating systems, apps, or how anyone reads a face.
