#!/bin/bash
# Alternative emoji fonts (COLRv1, Windows-compatible CBDT, Twemoji COLR) in the replay harness; one Chromium 155.
cd "$(dirname "$0")"
for c in R_ALT-COLRv1-1ffdd21 R_ALT-WinCompat-1ffdd21 R_ALT-CBDT-1ffdd21 R_ALT-Twemoji15; do
  for k in components emojicp sequences; do echo "$c $k"; done
done | xargs -P 2 -L 1 bash -c 'python3 run_study.py --condition "$0" --kind "$1" </dev/null || echo "FAILED $0 $1"'
