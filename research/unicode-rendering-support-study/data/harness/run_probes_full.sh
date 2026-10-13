#!/bin/bash
# Confounder probes on EVERY item (the first version covered the first 40 grid pages, mostly Unicode 8.0): DPR 2, cold fontconfig cache, headed Chromium under Xvfb.
# Each run is classified straight away and its page screenshots deleted (disk), raw observations and classification are kept.
cd "$(dirname "$0")"
one() { c=$1; k=$2; tag=$3; shift 3
  python3 run_study.py --condition $c --kind $k --tag $tag "$@" </dev/null || { echo "FAILED $c $k $tag"; return; }
  run="${c}__${k}__c155__${tag}"; python3 classify.py "$run" 2>&1 | grep -v -i warn | tail -1
  rm -rf "../cache/screens/$run"; }
for c in A_minimal A_distro B_noto; do
  one $c codepoints probe_full_dpr2 --dpr 2
  one $c codepoints probe_full_fccold --fc-cold
  xvfb-run -a bash -c "$(declare -f one); one $c codepoints probe_full_headed --headed"
  one $c sequences probe_full_dpr2_seq --dpr 2
  one $c sequences probe_full_fccold_seq --fc-cold
  xvfb-run -a bash -c "$(declare -f one); one $c sequences probe_full_headed_seq --headed"
done
