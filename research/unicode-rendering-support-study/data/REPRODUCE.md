# Rerunning the Unicode Rendering Support Study

Everything on the study page can be recomputed. This file says how, what we already checked, and what differs between machines.

## What you need

* Linux with Docker, or an Ubuntu 24.04 machine. 4 or more cores, about 40 GB of free disk (page screenshots are the bulk), network access to unicode.org, github.com, storage.googleapis.com and the Ubuntu package archive.
* The files in this folder: `Dockerfile`, `requirements.txt` and the `harness/` scripts. Put the scripts in a folder called `scripts` inside your working folder. The scripts find their inputs and write their results relative to the folder above `scripts`.

## Steps

1. Build the container: `docker build -t utg-unicode-render .` in a folder holding `Dockerfile` and `requirements.txt`. If your network inspects TLS, add your certificate authority to the image before the `pip install` line.
2. Start it with your working folder mounted at `/study`. Run `scripts/fetch_inputs.sh`. It downloads the current Unicode and Emoji data files, the Noto Color Emoji history, the Noto font families, Chrome for Testing, and Ubuntu's own Noto packages for the "Ubuntu packaged" font set.
3. `scripts/build_dataset.py --ref-date YYYY-MM-DD` builds Dataset 1 (code points) and Dataset 2 (emoji sequences) from those files. The newest Unicode version is read from the data, never typed in.
4. `scripts/make_fontsets.py`, then `scripts/cmap_index.py <condition>` for each condition (`A_stock`, `A_minimal`, `A_distro`, `B_noto`).
5. Draw: `scripts/run_study.py --condition <c> --kind <codepoints|components|sequences|emojicp|vs>`. Classify: `scripts/classify.py <run id>`. The run id names the condition, kind and Chrome major version.
6. Layers C, D and E: `run_replay.sh`, `run_matrix.sh`, `bisect_chrome.sh`, `bisect_snapshots.py`, `run_alt_fonts.sh` and `cross_engine.py` (Firefox needs `MOZ_DISABLE_CONTENT_SANDBOX=1`, because its sandbox hides fonts outside system folders).
7. Tables: `analyze_core.py`, `analyze_lag.py`, `analyze_seq.py`, `analyze_probes.py`, `analyze_alt_fonts.py`, `analyze_cross_engine.py`, `combining_realbase.py`, `probe_test.py`.

`run_all.sh` lists the full sequence. A full rerun takes roughly four hours on four cores.

## What we checked

We rebuilt the container from the recipe here and redrew Dataset 1 in it, on October 13, 2026.

| Check | Result |
|---|---|
| Dataset 1 and Dataset 2 rebuilt from freshly downloaded Unicode files | byte-identical to the files behind the study |
| Dataset 1 redrawn in the container, minimal font set | the class of every one of 60,600 items matches |
| Dataset 1 redrawn in the container, Ubuntu packaged font set | 60,599 of 60,600 match (one item that the study had left undecided) |

The details are in `cleanroom-rerun.csv`. Not rerun in the container: the newest-Noto set, the historical emoji fonts and the Chrome matrix, which need the large font downloads.

## What differs between machines

* **Pixels.** Anti-aliasing depends on the host's font configuration defaults. DejaVu Sans's missing-glyph box drew 463 pixels of ink on the study machine and 446 in the container, so only 1% (minimal) and 81% (Ubuntu packaged) of cells were pixel-identical. The detector compares pixels only inside one run, which is why the classes still match.
* **Time.** The data files, the Noto repositories and Chrome Stable change. A later rerun will report a newer Unicode version, newer fonts and a newer Chrome. The harness records every input version in `results/env`.
* **Fix found by this check.** The container ships without package lists, so `fetch_inputs.sh` now runs `apt-get update` before it downloads Ubuntu's Noto packages.

## Rules for a rerun

* Re-validate the detector after any change to `classify.py` or to the fonts. A new font set can produce a new missing-glyph look. Draw a fresh holdout (`validation_round2.py` with a new seed), label it without looking at the detector, and score it once.
* Keep condition names. Add new conditions instead of editing old ones.
* Record the Chrome and font hashes (`capture_environment.py`). A run without them is not comparable.
* Do not describe a result as an operating-system result. Every result here is a browser engine on Linux with a named font set.
