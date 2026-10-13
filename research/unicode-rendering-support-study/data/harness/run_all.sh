#!/bin/bash
# End-to-end rerun for a new Unicode release or a new Chrome stable. Takes roughly 3-4 hours on 4 cores (renders ~45 min, replay+matrix ~2 h, classification ~30 min).
set -e
cd "$(dirname "$0")"; R=..
./fetch_inputs.sh
python3 build_dataset.py --ref-date "$(date +%F)"                     # newest Unicode version is discovered from DerivedAge.txt
python3 fetch_noto_emoji_history.py $R/cache/noto-emoji.git
python3 font_history_lag.py; python3 fetch_noto_monthly.py; python3 monthly_lag.py; python3 fetch_noto_family_history.py || true
node utg_styles_dump.js "${UTG_REPO:-/path/to/ultratextgen}" > $R/cache/styles_dump.json
python3 utg_inventory.py "${UTG_REPO:-/path/to/ultratextgen}"
python3 make_fontsets.py
for c in A_stock A_minimal A_distro B_noto; do python3 font_inventory.py $c; python3 cmap_index.py $c; done
for c in A_stock A_minimal A_distro B_noto; do for k in codepoints vs sequences components emojicp utgcp utgseq; do python3 run_study.py --condition $c --kind $k; done; done
for v in B_noto+symfirst A_minimal+ef A_distro+ef A_stock+ef; do for k in components emojicp sequences; do python3 run_study.py --condition $v --kind $k; done; done
./run_replay.sh <(python3 -c "import csv;[print(f\"R_{m['commit_date']}_{m['commit'][:7]}\") for m in csv.DictReader(open('$R/data/derived/noto_emoji_font_manifest.csv'))]")
./run_matrix.sh
./run_probes.sh
./classify_all.sh
python3 capture_environment.py
python3 analyze_core.py; python3 analyze_lag.py; python3 analyze_seq.py; python3 analyze_utg.py; python3 analyze_probes.py
python3 figures.py; python3 gallery.py
python3 longitudinal.py            # appends this run to data/longitudinal/history.csv and prints the compatibility delta vs the previous run
