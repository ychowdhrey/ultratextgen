#!/usr/bin/env python3
"""Bisect Chromium main-branch positions 1509326 (141.0.7390.x branch point) .. 1522585 (142.0.7444.x) for the commit that makes the
60 Emoji 17 two-tone 'people wrestling' sequences compose, using chromium-browser-snapshots (Linux_x64). Each probe downloads one build,
tests it with bisect_probe.py, deletes it. Appends every probe to ../results/tables/bisect_snapshots_wrestling.csv."""
import sys, os, json, subprocess, urllib.request, urllib.parse, shutil, csv, time
HERE = os.path.dirname(os.path.abspath(__file__)); TMP = os.environ.get('BISECT_TMP', '/tmp/claude-0/bisect'); os.makedirs(TMP, exist_ok=True)
PROBE = os.environ.get('BISECT_PROBE', 'bisect_probe.py')   # 'bisect_probe_vs16.py' for the text-default emoji question
OUT = os.path.join(HERE, '../results/tables/' + os.environ.get('BISECT_OUT', 'bisect_snapshots_wrestling.csv'))
GOOD_EXIT = 0
API = 'https://www.googleapis.com/storage/v1/b/chromium-browser-snapshots/o'
def get(u):
    with urllib.request.urlopen(u, timeout=60) as r: return json.load(r)
def nearest_snapshot(pos, direction=+1):
    """Smallest published snapshot revision >= pos (direction +1) or largest <= pos (-1)."""
    step = 1
    p = pos
    for _ in range(40):
        d = get(f'{API}?prefix=Linux_x64/{p // 100}&delimiter=/&maxResults=1000')
        revs = sorted(int(x.split('/')[1]) for x in d.get('prefixes', []))
        cand = [r for r in revs if (r >= pos if direction > 0 else r <= pos)]
        if cand: return min(cand) if direction > 0 else max(cand)
        p += 100 * direction
    raise SystemExit('no snapshot found near %d' % pos)
def probe(rev):
    d = f'{TMP}/{rev}'; z = f'{TMP}/{rev}.zip'
    if not os.path.isdir(d):
        urllib.request.urlretrieve(f'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/{rev}/chrome-linux.zip', z)
        subprocess.run(['unzip', '-q', '-o', z, '-d', d], check=True); os.remove(z)
    exe = f'{d}/chrome-linux/chrome'; os.chmod(exe, 0o755)
    r = subprocess.run([sys.executable, f'{HERE}/{PROBE}', exe], capture_output=True, text=True, cwd=HERE)
    line = (r.stdout.strip().splitlines() or [r.stderr.strip()[-200:]])[-1]
    shutil.rmtree(d, ignore_errors=True)
    new = not os.path.exists(OUT)
    with open(OUT, 'a', newline='') as f:
        w = csv.writer(f)
        if new: w.writerow(['revision', 'exit_code', 'result'])
        w.writerow([rev, r.returncode, line])
    print(rev, r.returncode, line, flush=True); return r.returncode
if __name__ == '__main__':
    lo, hi = int(sys.argv[1]), int(sys.argv[2])     # lo fails (exit 1), hi composes (exit 0)
    lo = nearest_snapshot(lo, +1); hi = nearest_snapshot(hi, -1)
    print('start', lo, hi)
    assert probe(lo) == 1, 'low end should fail'; assert probe(hi) == 0, 'high end should compose'
    while True:
        mid = (lo + hi) // 2
        m = nearest_snapshot(mid, +1)
        if m >= hi: m = nearest_snapshot(mid, -1)
        if m <= lo or m >= hi: break
        rc = probe(m)
        if rc == 1: lo = m
        elif rc == 0: hi = m
        else: print('mixed result at', m); lo = m
    print(f'FIRST GOOD <= {hi}; LAST BAD >= {lo}')
