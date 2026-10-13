#!/bin/bash
# usage: run_replay.sh <list file> [chrome version]  — Layer C historical font replay, one Chromium, 45 emoji-font versions
cd "$(dirname "$0")"
CH=${2:-155.0.8059.39}
while read c; do
  for k in components emojicp sequences; do python3 run_study.py --condition "$c" --kind $k --chrome $CH || echo "FAILED $c $k"; done
done < "$1"
