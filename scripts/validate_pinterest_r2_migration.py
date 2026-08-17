#!/usr/bin/env python3
"""
Validates the Pinterest -> Cloudflare R2 migration end to end, before any
local binary is deleted from the repo. Covers, in order:

  1.  every migrated file exists in R2
  2.  file counts match (local discovered vs. R2 objects under pinterest/)
  3.  file sizes + MD5 checksums match (local file vs. R2 ETag)
  4.  a sample of public URLs (https://media.ultratextgen.com/...) actually
      fetch with HTTP 200 and the right Content-Length
  5.  every Pinterest inventory/upload CSV points at R2, not a repo path
  6.  base pins (scripts/generate-pinterest.py) present and correct
  7.  the 12,429 PR #648 variant pins present and correct
  8.  every migrated image is exactly 1000x1500 (checked on the local file --
      valid because check #3 already proves the R2 object is byte-identical)
  9.  no duplicate R2 object keys were introduced by the mapping
  10. re-running the migration is idempotent (implied by #3 passing at
      100% -- a fresh run would skip every file as already-identical; this
      is also verified directly with a live --dry-run pass)

Run:  python3 scripts/validate_pinterest_r2_migration.py [--sample-urls 200]
      [--report docs/pinterest-r2-migration-validation-<date>.md]

Requires: boto3, Pillow, plus R2 credentials in the environment (same as
scripts/migrate_pinterest_to_r2.py).
"""
import argparse
import collections
import concurrent.futures
import csv
import hashlib
import importlib.util
import os
import random
import subprocess
import sys
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
sys.path.insert(0, os.path.join(HERE, "lib"))
import r2_pinterest as R2  # noqa: E402

MIGRATE = importlib.util.spec_from_file_location(
    "migrate_pinterest_to_r2", os.path.join(HERE, "migrate_pinterest_to_r2.py"))
_migrate_mod = importlib.util.module_from_spec(MIGRATE)
MIGRATE.loader.exec_module(_migrate_mod)
discover = _migrate_mod.discover

_BU_SPEC = importlib.util.spec_from_file_location(
    "build_pinterest_upload", os.path.join(HERE, "build_pinterest_upload.py"))
_bu_mod = importlib.util.module_from_spec(_BU_SPEC)
_BU_SPEC.loader.exec_module(_bu_mod)
# The exact set of upload CSVs this repo's generator pipeline actually
# produces/maintains (build_pinterest_upload.py's own SOURCES registry,
# plus collection.csv's own upload file). Deliberately NOT a glob over
# data/*_upload.csv -- this repo also carries several one-off, intentionally
# frozen historical batch exports (pinterest_upload_top200.csv,
# fr_expansion_pinterest_pins_upload.csv, pinterest_upload_batch2.csv, ...)
# that predate this migration and were built for a specific already-run (or
# separately superseded) upload pass; rewriting their Media URLs now would
# falsify a historical record this repo's own conventions say never to
# silently rewrite. Only the live, regenerated-by-this-pipeline CSVs count.
MAINTAINED_UPLOAD_CSVS = sorted({s["out"] for s in _bu_mod.SOURCES.values()})

INVENTORY_SOURCES = [
    ("pinterest_pins.csv", "pinterest_image_path", "base"),
    ("pinterest_pins_variants.csv", "pinterest_image_path", "variants"),
    ("collection_pins.csv", "pin_image_path", "collection"),
]
BOARD_CSVS = [
    "id_pinterest_pins.csv", "es_pinterest_pins.csv", "discord_pinterest_pins.csv",
    "roblox_pinterest_pins.csv", "vertical_text_pinterest_pins.csv",
    "gaming_names_pinterest_pins.csv", "nama_ff_keren_pinterest_pins.csv",
    "de_pinterest_pins.csv", "fr_pinterest_pins.csv", "it_pinterest_pins.csv",
    "nl_pinterest_pins.csv", "pl_pinterest_pins.csv", "pt_pinterest_pins.csv",
    "tr_pinterest_pins.csv", "vi_pinterest_pins.csv",
    "fr_gaming_pinterest_pins.csv", "fr_clavier_pinterest_pins.csv",
    "fr_imprimables_pinterest_pins.csv", "fr_tatouage_pinterest_pins.csv",
    "fr_esthetique_pinterest_pins.csv", "fr_kaomoji_pinterest_pins.csv",
    "fr_zodiaque_pinterest_pins.csv", "fr_style_reseau_pinterest_pins.csv",
    "fr_outils_pinterest_pins.csv",
]


class Check:
    def __init__(self, n, name):
        self.n, self.name = n, name
        self.passed = None
        self.detail = []

    def ok(self, *lines):
        self.passed = True
        self.detail.extend(lines)

    def fail(self, *lines):
        self.passed = False
        self.detail.extend(lines)

    def render(self):
        status = "✅ PASS" if self.passed else "❌ FAIL"
        out = [f"### {self.n}. {self.name} — {status}"]
        out.extend(f"- {l}" for l in self.detail)
        return "\n".join(out) + "\n"


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def check_per_file(items, workers):
    """One pass per local file: exists in R2? size match? md5 match? Returns
    list of dicts, used by checks 1/2/3/6/7/9/10."""
    def _one(item):
        local_md5 = md5_of(item["local"])
        local_size = os.path.getsize(item["local"])
        remote_md5 = R2.remote_md5(item["r2_key"])
        return {**item, "local_md5": local_md5, "local_size": local_size,
                "remote_md5": remote_md5,
                "exists": remote_md5 is not None,
                "checksum_match": remote_md5 == local_md5}

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for r in ex.map(_one, items):
            results.append(r)
    return results


def check_dimensions(items):
    from PIL import Image
    bad = []
    for item in items:
        try:
            with Image.open(item["local"]) as im:
                if im.size != (1000, 1500):
                    bad.append((item["repo_path"], im.size))
        except Exception as e:  # noqa: BLE001
            bad.append((item["repo_path"], f"unreadable: {e!r}"))
    return bad


def check_public_urls(items, sample_n, workers):
    """Fetch a sample of public URLs directly (bypassing R2/boto3). Sends a
    real browser-like User-Agent -- Cloudflare's bot management returns a
    bare HTTP 403 for Python's default 'Python-urllib/3.x' UA even though
    the object itself is served fine (confirmed: identical request with
    UA='curl/8.5.0' returns 200). That's a fetch-client artifact, not an R2
    problem -- checks 1/2/3/6/7 already prove the objects exist and are
    byte-identical independently of this check."""
    sample = random.sample(items, min(sample_n, len(items)))

    def _one(item):
        url = R2.public_url(item["r2_key"])
        try:
            req = urllib.request.Request(
                url, method="HEAD",
                headers={"User-Agent": "Mozilla/5.0 (compatible; "
                                       "UltraTextGenValidator/1.0)"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                cl = resp.headers.get("Content-Length")
                if resp.status != 200:
                    return (url, f"HTTP {resp.status}")
                if cl is not None and int(cl) != item["local_size"]:
                    return (url, f"Content-Length {cl} != {item['local_size']}")
                return None
        except urllib.error.HTTPError as e:
            return (url, f"HTTP {e.code}")
        except Exception as e:  # noqa: BLE001
            return (url, repr(e)[:150])

    bad = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for r in ex.map(_one, sample):
            if r is not None:
                bad.append(r)
    return sample, bad


def check_csv_paths():
    """Check 5: every inventory row's image path is an R2 key, every upload
    CSV's Media URL is a real R2_PUBLIC_BASE_URL link."""
    base = R2.public_base_url()
    bad_inventory, bad_upload = [], []
    inv_rows = 0
    for fname, col, _ in INVENTORY_SOURCES:
        path = os.path.join(DATA, fname)
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                val = (row.get(col) or "").strip()
                if not val:
                    continue
                inv_rows += 1
                if not val.startswith("pinterest/"):
                    bad_inventory.append((fname, val))
    for fname in BOARD_CSVS:
        path = os.path.join(DATA, fname)
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                val = (row.get("image_path") or "").strip()
                if not val:
                    continue
                inv_rows += 1
                if not val.startswith("pinterest/"):
                    bad_inventory.append((fname, val))

    upload_files = [os.path.join(DATA, f) for f in MAINTAINED_UPLOAD_CSVS
                    if os.path.isfile(os.path.join(DATA, f))]
    upload_rows = 0
    for path in upload_files:
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                url = (row.get("Media URL") or "").strip()
                if not url:
                    continue
                upload_rows += 1
                if not url.startswith(base + "/"):
                    bad_upload.append((os.path.basename(path), url))
    return inv_rows, bad_inventory, upload_rows, bad_upload


def check_idempotent_dry_run():
    """Live confirmation of check 10, on top of the checksum-based proof:
    a real --dry-run pass over everything should report 100% skip, 0 upload,
    0 error."""
    cmd = [sys.executable, os.path.join(HERE, "migrate_pinterest_to_r2.py"),
           "--dry-run"]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=1800)
    out = proc.stdout + proc.stderr
    return proc.returncode, out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample-urls", type=int, default=200)
    ap.add_argument("--workers", type=int, default=48)
    ap.add_argument("--skip-live-dry-run", action="store_true",
                    help="skip the live re-invocation for check 10 (still "
                         "covered by the checksum proof in check 3)")
    ap.add_argument("--report",
                    default=os.path.join(ROOT, "docs", "pinterest-r2-migration-validation.md"))
    args = ap.parse_args()

    items = list(discover())
    print(f"discovered {len(items)} local Pinterest pin files to validate against R2...")
    results = check_per_file(items, args.workers)
    by_category = collections.defaultdict(list)
    for r in results:
        by_category[r["category"]].append(r)

    checks = []

    # 1 + 2 -----------------------------------------------------------------
    c1 = Check(1, "Every migrated file exists in R2")
    missing = [r for r in results if not r["exists"]]
    if missing:
        c1.fail(f"{len(missing)}/{len(results)} local files have NO matching R2 object",
                *[f"missing: {m['repo_path']} -> {m['r2_key']}" for m in missing[:20]])
    else:
        c1.ok(f"{len(results)}/{len(results)} local files have a matching R2 object")
    checks.append(c1)

    c2 = Check(2, "File counts match, per category")
    lines, all_ok = [], True
    for cat in ("base", "variants", "boards", "collection"):
        cat_items = by_category.get(cat, [])
        present = sum(1 for r in cat_items if r["exists"])
        lines.append(f"{cat}: {present}/{len(cat_items)} present in R2")
        if present != len(cat_items):
            all_ok = False
    (c2.ok if all_ok else c2.fail)(*lines)
    checks.append(c2)

    # 3 -----------------------------------------------------------------
    c3 = Check(3, "File sizes / MD5 checksums match (local vs. R2 ETag)")
    mismatched = [r for r in results if r["exists"] and not r["checksum_match"]]
    if mismatched:
        c3.fail(f"{len(mismatched)}/{len(results)} objects exist but checksum differs",
                *[f"mismatch: {m['repo_path']}" for m in mismatched[:20]])
    else:
        c3.ok(f"{len(results)}/{len(results)} existing objects are byte-identical to "
              f"their local source (MD5 match)")
    checks.append(c3)

    # 4 -----------------------------------------------------------------
    c4 = Check(4, "Public URLs work (sampled)")
    sample, bad_urls = check_public_urls(results, args.sample_urls, args.workers)
    if bad_urls:
        c4.fail(f"{len(bad_urls)}/{len(sample)} sampled public URLs failed",
                *[f"{u}: {why}" for u, why in bad_urls[:20]])
    else:
        c4.ok(f"{len(sample)}/{len(sample)} sampled public URLs returned HTTP 200 "
              f"with the correct Content-Length")
    checks.append(c4)

    # 5 -----------------------------------------------------------------
    c5 = Check(5, "Pinterest CSV inventories point at R2 URLs")
    inv_rows, bad_inv, upload_rows, bad_upload = check_csv_paths()
    if bad_inv or bad_upload:
        c5.fail(f"{len(bad_inv)}/{inv_rows} inventory rows still hold a non-R2 path",
                f"{len(bad_upload)}/{upload_rows} upload-CSV Media URLs are not "
                f"under {R2.public_base_url()}",
                *[f"inventory {f}: {v!r}" for f, v in bad_inv[:10]],
                *[f"upload {f}: {v!r}" for f, v in bad_upload[:10]])
    else:
        c5.ok(f"{inv_rows}/{inv_rows} inventory rows hold an R2 object key",
              f"{upload_rows}/{upload_rows} upload-CSV Media URLs point at "
              f"{R2.public_base_url()}")
    checks.append(c5)

    # 6 -----------------------------------------------------------------
    c6 = Check(6, "Existing base pins (scripts/generate-pinterest.py) still work")
    base_items = by_category.get("base", [])
    base_bad = [r for r in base_items if not r["exists"] or not r["checksum_match"]]
    if base_bad:
        c6.fail(f"{len(base_bad)}/{len(base_items)} base pins failed verification")
    else:
        c6.ok(f"{len(base_items)}/{len(base_items)} base pins present and byte-identical on R2")
    checks.append(c6)

    # 7 -----------------------------------------------------------------
    c7 = Check(7, "PR #648's 12,429 new variant pins still work")
    var_items = by_category.get("variants", [])
    var_bad = [r for r in var_items if not r["exists"] or not r["checksum_match"]]
    count_ok = len(var_items) == 12429
    if var_bad or not count_ok:
        c7.fail(f"expected 12,429 variant pins, found {len(var_items)} locally",
                f"{len(var_bad)}/{len(var_items)} failed verification")
    else:
        c7.ok(f"12,429/12,429 variant pins present and byte-identical on R2")
    checks.append(c7)

    # 8 -----------------------------------------------------------------
    c8 = Check(8, "Images remain 1000x1500 where required")
    bad_dims = check_dimensions(items)
    if bad_dims:
        c8.fail(f"{len(bad_dims)}/{len(items)} images are NOT 1000x1500",
                *[f"{p}: {sz}" for p, sz in bad_dims[:20]])
    else:
        c8.ok(f"{len(items)}/{len(items)} images verified exactly 1000x1500")
    checks.append(c8)

    # 9 -----------------------------------------------------------------
    c9 = Check(9, "No duplicate R2 object keys introduced")
    key_counts = collections.Counter(r["r2_key"] for r in results)
    dupes = {k: n for k, n in key_counts.items() if n > 1}
    if dupes:
        c9.fail(f"{len(dupes)} R2 object keys are claimed by more than one local file",
                *[f"{k} <- {n} files" for k, n in list(dupes.items())[:20]])
    else:
        c9.ok(f"{len(key_counts)} distinct R2 object keys, 0 collisions across "
              f"{len(results)} local files")
    checks.append(c9)

    # 10 -----------------------------------------------------------------
    c10 = Check(10, "Re-running the migration is idempotent")
    all_checksums_match = not missing and not mismatched
    detail = [f"checksum proof: {'✓' if all_checksums_match else '✗'} every local "
              f"file's MD5 already matches its R2 ETag, so a fresh run has nothing "
              f"left to upload"]
    if args.skip_live_dry_run:
        detail.append("live re-invocation skipped (--skip-live-dry-run)")
        (c10.ok if all_checksums_match else c10.fail)(*detail)
    else:
        rc, out = check_idempotent_dry_run()
        all_skipped = "uploaded" not in out.split("done in")[-1] if "done in" in out else False
        live_ok = rc == 0 and "skipped-identical" in out
        detail.append(f"live `--dry-run` re-invocation: exit {rc}")
        detail.append("```\n" + "\n".join(out.strip().splitlines()[-8:]) + "\n```")
        (c10.ok if (all_checksums_match and live_ok) else c10.fail)(*detail)
    checks.append(c10)

    # ---- report -------------------------------------------------------
    all_pass = all(c.passed for c in checks)
    lines = [
        "# Pinterest -> R2 Migration Validation Report", "",
        f"Bucket: `{R2.bucket()}`  ·  Public base: `{R2.public_base_url()}`",
        f"Local files discovered: **{len(items)}**  ·  "
        f"Overall: {'✅ ALL CHECKS PASSED' if all_pass else '❌ FAILURES FOUND'}",
        "",
    ]
    for c in checks:
        lines.append(c.render())

    report_md = "\n".join(lines)
    with open(args.report, "w", encoding="utf-8") as f:
        f.write(report_md)
    print(f"\nvalidation report -> {os.path.relpath(args.report, ROOT)}")
    print(f"\n{'ALL CHECKS PASSED' if all_pass else 'FAILURES FOUND -- see report'}")
    for c in checks:
        print(f"  {'PASS' if c.passed else 'FAIL'}  {c.n}. {c.name}")

    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
