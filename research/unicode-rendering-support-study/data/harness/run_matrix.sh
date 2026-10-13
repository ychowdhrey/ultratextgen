#!/bin/bash
# Layer D: Chromium version x emoji-font version. One job = (chrome, font condition); runs components then sequences.
cd "$(dirname "$0")"
job() { c=$1; f=$2; for k in components sequences; do python3 run_study.py --condition "$f" --kind $k --chrome "$c" </dev/null || echo "FAILED $c $f $k"; done; }
export -f job
CH="113.0.5672.63 120.0.6099.109 128.0.6613.137 135.0.7049.114 141.0.7390.122 155.0.8059.39"
FONTS="R_2018-08-10_4e5cf1c R_2019-10-16_f3b9faa R_2020-09-16_565d292 R_2022-09-19_c79f4f8 R_2023-11-29_f06dfe7 R_2024-10-02_60ac8a9 R_2025-09-12_f3ae03f R_2026-09-17_1ffdd21"
for c in $CH; do for f in $FONTS; do
  # the Chrome 155 runs already exist from the replay (same conditions) - skip them
  if [ "${c%%.*}" = "155" ]; then continue; fi
  echo "$c $f"; done; done | xargs -P 3 -L 1 bash -c 'job $0 $1'
