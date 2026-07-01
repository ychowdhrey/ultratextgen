#!/usr/bin/env bash
#
# Refresh ads.txt from Journey's managed, hosted file.
#
# Journey (journeymv.com) maintains the authorized-sellers list and updates it
# over time. We host a static copy at /ads.txt (guaranteed 200, in version
# control) and keep it current with the daily update-ads-txt workflow, which
# runs this script and commits any change.
#
# The download is validated before overwriting so a transient failure or a bad
# response can never blank out the live ads.txt.

set -euo pipefail

URL="https://adstxt.journeymv.com/sites/e381520a-ca23-48ca-a066-83c420ddddea/ads.txt"
DEST="$(cd "$(dirname "$0")/.." && pwd)/ads.txt"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

curl -sSfL --max-time 30 "$URL" -o "$TMP"

# Sanity checks: non-empty and clearly Journey's file before we overwrite.
if [ ! -s "$TMP" ]; then
  echo "ERROR: downloaded ads.txt is empty — refusing to overwrite" >&2
  exit 1
fi
if ! grep -q "journeymv.com" "$TMP"; then
  echo "ERROR: downloaded ads.txt missing journeymv.com — refusing to overwrite" >&2
  exit 1
fi

mv "$TMP" "$DEST"
trap - EXIT
echo "ads.txt refreshed from Journey ($(wc -l < "$DEST") lines)"
