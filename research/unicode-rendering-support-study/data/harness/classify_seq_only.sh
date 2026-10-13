#!/bin/bash
cd "$(dirname "$0")"
for r in $(ls ../results/raw | sed 's/.csv.gz//' | grep -E "__(sequences|utgseq)__"); do python3 classify.py "$r" 2>&1 | grep -v -i warn | cut -c1-12 >/dev/null; done
echo done
