#!/bin/bash
# Confounder probes on the first 40 grid pages (sentinels + the first ~9,000 code points) of codepoints, and 20 pages of sequences.
cd "$(dirname "$0")"
for c in B_noto A_minimal; do
  python3 run_study.py --condition $c --kind codepoints --limit-pages 40 --tag probe_dpr2 --dpr 2 </dev/null
  python3 run_study.py --condition $c --kind codepoints --limit-pages 40 --tag probe_fccold --fc-cold </dev/null
  xvfb-run -a python3 run_study.py --condition $c --kind codepoints --limit-pages 40 --tag probe_headed --headed </dev/null
  python3 run_study.py --condition $c --kind sequences --limit-pages 20 --tag probe_headed_seq --headed </dev/null || true
done
python3 run_study.py --condition B_noto --kind codepoints --limit-pages 40 --tag probe_langja --lang ja </dev/null
python3 run_study.py --condition B_noto --kind codepoints --limit-pages 40 --tag probe_langzhhant --lang zh-Hant </dev/null
