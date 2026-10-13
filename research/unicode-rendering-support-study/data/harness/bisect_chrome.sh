#!/bin/bash
# Which Chrome release first composes the 60 Emoji 17 two-tone 'people wrestling' sequences with NotoColorEmoji 2.051? (fonts fixed; Chrome 141 fails, 155 composes)
cd "$(dirname "$0")"; R=..
one() { v=$1
  [ -d $R/cache/chrome/$v ] || { curl -sfo $R/cache/chrome/chrome-$v.zip https://storage.googleapis.com/chrome-for-testing-public/$v/linux64/chrome-linux64.zip && mkdir -p $R/cache/chrome/$v && unzip -q -o $R/cache/chrome/chrome-$v.zip -d $R/cache/chrome/$v && sha256sum $R/cache/chrome/chrome-$v.zip >> $R/cache/chrome/SHA256SUMS.txt; }
  python3 run_study.py --condition R_2025-09-12_f3ae03f --kind sequences --chrome $v </dev/null; }
export -f one; export R
printf '%s\n' 142.0.7444.175 143.0.7499.192 144.0.7559.133 145.0.7632.117 146.0.7680.165 147.0.7727.117 148.0.7778.178 149.0.7827.155 150.0.7871.124 151.0.7922.138 152.0.7977.82 153.0.8010.52 154.0.8037.92 | xargs -P 3 -I{} bash -c 'one {}'
