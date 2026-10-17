#!/usr/bin/env python3
"""Extract every committed version of fonts/NotoColorEmoji.ttf from a (blobless) bare clone of
googlefonts/noto-emoji into cache/noto_emoji_history/<date>_<sha7>.ttf and write a manifest
with sha256, name-table version, release-tag mapping and commit metadata.
  git clone --bare --filter=blob:none https://github.com/googlefonts/noto-emoji.git cache/noto-emoji.git
  python3 fetch_noto_emoji_history.py cache/noto-emoji.git
"""
import subprocess, sys, os, json, hashlib, csv
from fontTools.ttLib import TTFont
repo = sys.argv[1]
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CACHE = f'{ROOT}/cache/noto_emoji_history'; os.makedirs(CACHE, exist_ok=True)
git = lambda *a, **k: subprocess.run(['git', '-C', repo, *a], check=True, capture_output=True, **k).stdout
PATHS = ['2D/fonts/NotoColorEmoji.ttf', 'fonts/NotoColorEmoji.ttf']   # the font moved to 2D/fonts/ with the Emoji 18 commit
log = git('log', '--format=%H|%cI|%ct|%s', '--', *PATHS).decode().strip().splitlines()
def blob(sha):
    for p in PATHS:
        try: return git('show', f'{sha}:{p}')
        except subprocess.CalledProcessError: pass
    raise SystemExit(f'font not found at {sha}')
# tags -> commit (peeled)
tags = {}
for l in git('for-each-ref', '--format=%(refname:short)|%(*objectname)|%(objectname)|%(objecttype)', 'refs/tags').decode().splitlines():
    n, peeled, obj, typ = l.split('|'); tags[n] = peeled or obj
# for each tag find the font blob it contains (if any), and the last font-touching commit at/before the tag
font_commits = [l.split('|')[0] for l in log]
rows = []
for l in reversed(log):
    sha, iso, ts, subj = l.split('|', 3)
    out = f'{CACHE}/{iso[:10]}_{sha[:7]}.ttf'
    if not os.path.exists(out) or os.path.getsize(out) == 0:
        open(out, 'wb').write(blob(sha))
    data = open(out, 'rb').read()
    f = TTFont(out, lazy=True)
    nm = f['name']
    ver = nm.getDebugName(5) or ''
    rows.append(dict(commit=sha, commit_date_iso=iso, commit_date=iso[:10], subject=subj, file=os.path.relpath(out, ROOT),
                     bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), name_version=ver,
                     font_revision=round(f['head'].fontRevision, 3), tables=' '.join(sorted(f.keys())),
                     glyph_count=f['maxp'].numGlyphs))
    f.close()
# tag association: tag -> first manifest row whose commit is the tag target or its ancestor-most recent font commit
for r in rows:
    r['tags_pointing_here'] = ' '.join(t for t, c in tags.items() if c == r['commit'])
with open(f'{ROOT}/data/derived/noto_emoji_font_manifest.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
json.dump(tags, open(f'{ROOT}/data/derived/noto_emoji_tags.json', 'w'), indent=1, sort_keys=True)
print(len(rows), 'font versions')
for r in rows: print(r['commit_date'], r['commit'][:7], r['name_version'], r['bytes'], r['tags_pointing_here'])
