#!/bin/bash
# classify every raw run (order matters: codepoints before vs/emojicp/components consumers; components/utgcp before sequences/utgseq)
cd "$(dirname "$0")"
runs=$(ls ../results/raw | sed 's/.csv.gz//')
for k in codepoints components utgcp vs emojicp sequences utgseq; do
  for r in $runs; do case "$r" in *"__${k}__"*) python3 classify.py "$r" 2>&1 | grep -v -i warn | sed 's#/home/user/.*classified/##' ;; esac; done
done
