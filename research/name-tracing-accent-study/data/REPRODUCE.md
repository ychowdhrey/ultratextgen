# Reproduce the study

Run everything from the repository root, on a checkout of the commit you want to test. You need Node 22 with Playwright and a Chromium (pass its path with `--chromium` if the driver cannot find its own), and Python 3.10 or later with `numpy`, `opencv-python-headless`, `pillow` (with Raqm), `fonttools`, `brotli`, `pymupdf` and `uharfbuzz`. The commands below write to `/tmp`; nothing is added to `package.json`.

1. **Capture the 182 cells** (7 worksheets, 26 names): the preview, the saved PDF, the PDF's page canvas and the PNG download.
   `node research/name-tracing-accent-study/data/scripts/capture.mjs --repo . --out /tmp/accent-run1`
   (it reads `../fixtures/names-main-26.json` by default; `--fixtures` and `--limit` override it).
2. **Score** the saved canvases against the expected names:
   `python3 -I research/name-tracing-accent-study/data/scripts/run_oracle.py . /tmp/accent-run1 research/name-tracing-accent-study/data/fixtures/names-main-26.json /tmp/oracle.csv`
   `python3 -I research/name-tracing-accent-study/data/scripts/clipscan.py . /tmp/accent-run1 research/name-tracing-accent-study/data/fixtures/names-main-26.json /tmp/clip.csv`
   `python3 -I research/name-tracing-accent-study/data/scripts/classify-cells.py /tmp/oracle.csv /tmp/clip.csv /tmp/verdicts.csv`
3. **The in-browser probe** (does the page itself cut text off?): `node research/name-tracing-accent-study/data/scripts/preview-clip-probe.mjs --repo . --fixtures <fixtures with a surfaces list> --out /tmp/probe.json`. It needs `pngjs` on the module path.
4. **The settings sweep**: `capture-settings-sweep.mjs --repo . --fixtures fixtures/names-main-26.json --plan fixtures/settings-sweep-plan.json --out /tmp/accent-sweep`, then step 2 on each setting folder.
5. **Font coverage** (every character resolves to a shipped font file that contains it): `python3 -I research/name-tracing-accent-study/data/scripts/font-coverage.py . research/name-tracing-accent-study/data/fixtures/names-main-26.json`. It exits 1 on a missing glyph.
6. **Check that the check can fail**: capture again with `fixtures/names-marks-removed-26.json`, but score against `names-main-26.json`. Every name with marks should be flagged.

To see the defect, run steps 1 to 3 on a checkout of the commit before the fix (the viewBox files in this folder name the pages). Results vary a little between runs for names that need font files loaded on demand: repeated copies of a name can sit up to about 1.5 mm apart in different runs. See `repeat-runs.csv`.
