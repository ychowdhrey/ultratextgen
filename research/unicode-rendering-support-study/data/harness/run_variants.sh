#!/bin/bash
# CSS font-family ORDER as an experimental factor: same fonts, emoji family first (A+ef) or symbol families first (B+symfirst)
cd "$(dirname "$0")"
while pgrep -f run_matrix.sh >/dev/null; do sleep 10; done
for c in B_noto+symfirst A_minimal+ef A_distro+ef A_stock+ef; do
  for k in components emojicp sequences; do python3 run_study.py --condition "$c" --kind $k </dev/null || echo FAILED $c $k; done
done
