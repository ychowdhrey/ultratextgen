#!/usr/bin/env python3
"""Write results/env/environment.json: OS, kernel, toolchain and package pins, Chrome-for-Testing download hashes, source commits, UCD file hashes."""
import json, subprocess, platform, os, hashlib, glob, importlib.metadata as im
from conditions import ROOT
sh = lambda *a: subprocess.run(a, capture_output=True, text=True).stdout.strip()
env = dict(captured_utc=sh('date', '-u', '+%Y-%m-%dT%H:%M:%SZ'), os_release=dict(l.split('=', 1) for l in open('/etc/os-release').read().replace('"', '').splitlines() if '=' in l),
           kernel=platform.release(), python=platform.python_version(), node=sh('node', '--version'),
           python_packages={p: im.version(p) for p in ('fonttools', 'uharfbuzz', 'playwright', 'pillow', 'numpy', 'pandas', 'scipy', 'matplotlib', 'regex', 'brotli') if p in {d.metadata['Name'].lower() for d in im.distributions()}},
           chrome_for_testing_zip_sha256=dict(l.split()[::-1] for l in open(f'{ROOT}/cache/chrome/SHA256SUMS.txt').read().splitlines() if l.strip()),
           ubuntu_noto_debs_sha256=dict(l.split()[::-1] for l in open(f'{ROOT}/cache/debs/SHA256SUMS').read().splitlines() if l.strip()),
           dpkg_font_packages={l.split()[0]: l.split()[1] for l in sh('dpkg-query', '-W', '-f=${Package} ${Version}\\n', 'fonts-*').splitlines() if len(l.split()) == 2},
           fontconfig=sh('fc-list', '--version'), xvfb=sh('dpkg-query', '-W', '-f=${Version}', 'xvfb'),
           source_commits=dict(noto_emoji=sh('git', '-C', f'{ROOT}/cache/noto-emoji.git', 'rev-parse', 'HEAD'), notofonts_site=sh('git', '-C', f'{ROOT}/cache/notofonts-site', 'rev-parse', 'HEAD'), noto_cjk=sh('git', '-C', f'{ROOT}/cache/noto-cjk', 'rev-parse', 'HEAD'),
                               ultratextgen_public=json.load(open(f'{ROOT}/data/derived/utg_inventory_meta.json'))['public_repo_commit']),
           ucd_files_sha256={os.path.relpath(p, f'{ROOT}/data/raw'): hashlib.sha256(open(p, 'rb').read()).hexdigest() for p in sorted(glob.glob(f'{ROOT}/data/raw/*/*'))},
           dataset_meta=json.load(open(f'{ROOT}/data/derived/dataset_meta.json')))
json.dump(env, open(f'{ROOT}/results/env/environment.json', 'w'), indent=1)
print('ok', list(env))
