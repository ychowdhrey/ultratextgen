#!/usr/bin/env python3
"""
One-time migration utility: uploads every already-committed Pinterest pin
image binary (assets/pinterest/**, assets/collection-pins/**) to Cloudflare
R2, mapping each to the exact object-key convention the generators now use
(scripts/lib/r2_pinterest.py) -- so a migrated file and a freshly-regenerated
one land at the identical key. Operates entirely from this checked-out repo;
nothing is regenerated, existing binaries are uploaded byte-for-byte.

Mapping (deterministic, filenames preserved 1:1):
  assets/pinterest/<slug>.png            -> pinterest/base/<slug>.png
  assets/pinterest/<slug>--vN.png        -> pinterest/variants/<slug>--vN.png
  assets/pinterest/<board>/<file>        -> pinterest/boards/<board>/<file>
  assets/collection-pins/<file>          -> pinterest/collection/<file>

Idempotent: re-running compares each local file's MD5 against the remote
object's ETag (scripts/lib/r2_pinterest.remote_md5) and skips anything
already identical on R2 -- safe to re-run after a partial/interrupted run.

Never deletes anything local. That is a separate, explicit step taken only
after scripts/validate_pinterest_r2_migration.py passes in full -- see
docs/pinterest-r2-migration.md.

Usage:
  python3 scripts/migrate_pinterest_to_r2.py --dry-run
  python3 scripts/migrate_pinterest_to_r2.py
  python3 scripts/migrate_pinterest_to_r2.py --only variants   # base|variants|boards|collection
  python3 scripts/migrate_pinterest_to_r2.py --workers 24 --report docs/pinterest-r2-migration-report.csv

Requires: boto3, plus R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY (and
optionally R2_BUCKET/R2_PUBLIC_BASE_URL) in the environment. Never hardcode
these -- see docs/pinterest-r2-migration.md.
"""
import argparse
import concurrent.futures
import csv
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, "lib"))
import r2_pinterest as R2  # noqa: E402

PINTEREST_DIR = os.path.join(ROOT, "assets", "pinterest")
COLLECTION_DIR = os.path.join(ROOT, "assets", "collection-pins")
DEFAULT_REPORT = os.path.join(ROOT, "docs", "pinterest-r2-migration-report.csv")


def classify_key(rel_dir, fname):
    """Map one assets/pinterest/... file to its R2 object key + category."""
    if rel_dir == ".":
        if "--v" in fname:
            return f"pinterest/variants/{fname}", "variants"
        return f"pinterest/base/{fname}", "base"
    return f"pinterest/boards/{rel_dir}/{fname}", "boards"


def discover():
    """Yield {local, repo_path, r2_key, category} for every Pinterest pin
    binary currently committed in the repo."""
    if os.path.isdir(PINTEREST_DIR):
        for dirpath, dirnames, filenames in os.walk(PINTEREST_DIR):
            dirnames.sort()
            rel_dir = os.path.relpath(dirpath, PINTEREST_DIR)
            for fname in sorted(filenames):
                if not fname.lower().endswith(".png"):
                    continue
                local = os.path.join(dirpath, fname)
                key, category = classify_key(rel_dir, fname)
                yield {"local": local, "repo_path": os.path.relpath(local, ROOT),
                       "r2_key": key, "category": category}
    if os.path.isdir(COLLECTION_DIR):
        for fname in sorted(os.listdir(COLLECTION_DIR)):
            local = os.path.join(COLLECTION_DIR, fname)
            if not (os.path.isfile(local) and fname.lower().endswith(".png")):
                continue
            key = f"pinterest/collection/{fname}"
            yield {"local": local, "repo_path": os.path.relpath(local, ROOT),
                   "r2_key": key, "category": "collection"}


def migrate_one(item, dry_run):
    size = os.path.getsize(item["local"])
    try:
        url, status = R2.upload_file(item["local"], item["r2_key"], dry_run=dry_run)
        error = ""
    except Exception as e:  # noqa: BLE001 -- report, never crash the whole run
        url, status, error = R2.public_url(item["r2_key"]), "error", repr(e)[:300]
    return {**item, "public_url": url, "size_bytes": size, "status": status,
            "error": error}


REPORT_COLUMNS = ["repo_path", "r2_key", "public_url", "size_bytes",
                   "category", "status", "error"]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true",
                    help="report what would happen; upload nothing")
    ap.add_argument("--only", choices=["base", "variants", "boards", "collection"],
                    help="only migrate one category (default: all)")
    ap.add_argument("--workers", type=int, default=24)
    ap.add_argument("--report", default=DEFAULT_REPORT)
    ap.add_argument("--limit", type=int, default=0,
                    help="only process the first N discovered files (testing)")
    args = ap.parse_args()

    items = list(discover())
    if args.only:
        items = [i for i in items if i["category"] == args.only]
    if args.limit:
        items = items[:args.limit]
    if not items:
        print("nothing to migrate (no matching files found)")
        return

    total_bytes = sum(os.path.getsize(i["local"]) for i in items)
    print(f"discovered {len(items)} Pinterest pin files "
          f"({total_bytes / 1e9:.2f} GB){'  [DRY RUN]' if args.dry_run else ''}")
    print(f"target: R2 bucket {R2.bucket()!r}, public base {R2.public_base_url()!r}")

    results = []
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(migrate_one, it, args.dry_run) for it in items]
        done = 0
        for fut in concurrent.futures.as_completed(futs):
            results.append(fut.result())
            done += 1
            if done % 500 == 0 or done == len(items):
                elapsed = time.time() - t0
                rate = done / elapsed if elapsed else 0
                print(f"  ...{done}/{len(items)}  ({elapsed:.0f}s, {rate:.1f}/s)")

    status_counts = {}
    for r in results:
        status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1
    errors = [r for r in results if r["status"] == "error"]

    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    with open(args.report, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=REPORT_COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(sorted(results, key=lambda r: r["repo_path"]))

    elapsed = time.time() - t0
    print(f"\ndone in {elapsed:.0f}s")
    for status, count in sorted(status_counts.items()):
        print(f"  {status:20} {count}")
    print(f"migration report -> {os.path.relpath(args.report, ROOT)}")

    if errors:
        print(f"\n{len(errors)} ERRORS (see report for the full list):")
        for e in errors[:20]:
            print(f"  {e['repo_path']}: {e['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
