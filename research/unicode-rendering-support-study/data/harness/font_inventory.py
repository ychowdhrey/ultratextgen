#!/usr/bin/env python3
"""Per-condition font inventory with exact file, version string, sha256 and (system fonts) Debian package.
Usage: font_inventory.py <condition> ...   -> results/env/<condition>_fonts.csv"""
import subprocess, os, sys, csv, hashlib, json
from fontTools.ttLib import TTFont
from conditions import *
OUT = f'{ROOT}/results/env'; os.makedirs(OUT, exist_ok=True)
_hash = {}
def sha(p):
    rp = os.path.realpath(p)
    if rp not in _hash: _hash[rp] = hashlib.sha256(open(rp, 'rb').read()).hexdigest()
    return _hash[rp]
def pkg(p):
    r = subprocess.run(['dpkg', '-S', os.path.realpath(p)], capture_output=True, text=True)
    if r.returncode: return ''
    name = r.stdout.split(':')[0]
    v = subprocess.run(['dpkg-query', '-W', '-f=${Version}', name], capture_output=True, text=True).stdout
    return f'{name}={v}'
def inventory(cname):
    c = condition(cname); env = dict(os.environ)
    if c['fc_file']: env['FONTCONFIG_FILE'] = c['fc_file']
    out = subprocess.run(['fc-list', '--format', '%{file}\n'], env=env, capture_output=True, text=True).stdout.split('\n')
    files = sorted({f for f in out if f})
    rows = []
    for f in files:
        try:
            tt = TTFont(f, fontNumber=0, lazy=True); nm = tt['name']
            fam = nm.getDebugName(1) or ''; ver = nm.getDebugName(5) or ''; ps = nm.getDebugName(6) or ''
        except Exception as e:
            fam = ver = ps = f'ERR {e}'
        rows.append(dict(condition=cname, file=os.path.realpath(f), family=fam, version=ver, postscript=ps, sha256=sha(f), package=pkg(f) if not f.startswith(ROOT) and not os.path.realpath(f).startswith(ROOT) else 'external-download', bytes=os.path.getsize(os.path.realpath(f))))
    with open(f'{OUT}/{cname}_fonts.csv', 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    gm = subprocess.run(['fc-match', 'sans-serif', '--format', '%{family} (%{file})'], env=env, capture_output=True, text=True).stdout
    return len(rows), gm
if __name__ == '__main__':
    for c in sys.argv[1:]: print(c, inventory(c))
