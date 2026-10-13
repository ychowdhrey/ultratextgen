#!/bin/bash
# Fetch every external input (idempotent). Pins that matter are recorded in results/env/environment.json after a run.
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; cd "$R"
mkdir -p data/raw/ucd data/raw/emoji cache/chrome cache/debs
# 1. Unicode data: ALWAYS 'latest' so a new Unicode release is picked up (the newest version is discovered from DerivedAge.txt, never hard-coded).
for f in UnicodeData.txt DerivedAge.txt Scripts.txt Blocks.txt PropList.txt DerivedCoreProperties.txt emoji/emoji-data.txt emoji/emoji-variation-sequences.txt; do curl -sfo data/raw/ucd/$(basename $f) https://www.unicode.org/Public/UCD/latest/ucd/$f; done
curl -sfo data/raw/ucd/publicationdates.html https://www.unicode.org/history/publicationdates.html
for f in emoji-test.txt emoji-sequences.txt emoji-zwj-sequences.txt; do curl -sfo data/raw/emoji/$f https://unicode.org/Public/emoji/latest/$f; done
curl -sfo data/raw/emoji/emoji-versions.html https://www.unicode.org/reports/tr51/
# 2. Font sources (blobless clones: history of trees, blobs fetched on demand)
[ -d cache/noto-emoji.git ] || git clone --bare --filter=blob:none https://github.com/googlefonts/noto-emoji.git cache/noto-emoji.git
[ -d cache/notofonts-site ] || { git clone --filter=blob:none --no-checkout https://github.com/notofonts/notofonts.github.io.git cache/notofonts-site; git -C cache/notofonts-site sparse-checkout init --no-cone; git -C cache/notofonts-site sparse-checkout set '/fonts/*/full/ttf/*-Regular.ttf' '/fonts/LICENSE'; git -C cache/notofonts-site checkout; }
git -C cache/notofonts-site fetch --tags -q; git -C cache/noto-emoji.git fetch -q origin '+refs/heads/*:refs/heads/*' --tags
[ -d cache/noto-cjk ] || git clone --depth 1 --filter=blob:none --no-checkout https://github.com/notofonts/noto-cjk.git cache/noto-cjk
mkdir -p cache/noto-cjk-fonts; for f in Sans/OTC/NotoSansCJK-Regular.ttc Serif/OTC/NotoSerifCJK-Regular.ttc; do [ -f cache/noto-cjk-fonts/$(basename $f) ] || git -C cache/noto-cjk show HEAD:$f > cache/noto-cjk-fonts/$(basename $f); done
# 3. Browsers (Chrome for Testing). Stable is read from the CfT endpoint; the Layer D matrix versions are pinned.
STABLE=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json | python3 -c 'import json,sys;print(json.load(sys.stdin)["channels"]["Stable"]["version"])')
echo "Chrome Stable is $STABLE (the study used 155.0.8059.39; pass DEFAULT_CHROME in render_harness.py to switch)"
for v in $STABLE 155.0.8059.39 141.0.7390.122 135.0.7049.114 128.0.6613.137 120.0.6099.109 113.0.5672.63; do
  [ -d cache/chrome/$v ] || { curl -sfo cache/chrome/chrome-$v.zip https://storage.googleapis.com/chrome-for-testing-public/$v/linux64/chrome-linux64.zip && mkdir -p cache/chrome/$v && unzip -q -o cache/chrome/chrome-$v.zip -d cache/chrome/$v && sha256sum cache/chrome/chrome-$v.zip >> cache/chrome/SHA256SUMS.txt; }
done
# 4. Ubuntu 24.04's own Noto packages for condition A_distro (versions pinned; extracted, never installed)
cd cache/debs
apt-get update -qq || true   # the container image ships without package lists
apt-get download fonts-noto-core=20201225-2 fonts-noto-extra=20201225-2 fonts-noto-mono=20201225-2 fonts-noto-ui-core=20201225-2 'fonts-noto-cjk=1:20230817+repack1-3' 'fonts-noto-color-emoji=2.047-0ubuntu0.24.04.1'
sha256sum *.deb > SHA256SUMS; mkdir -p x; for d in *.deb; do dpkg -x "$d" x; done
echo done
