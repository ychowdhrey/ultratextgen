#!/usr/bin/env python3
"""
Phase-3 proof of concept / general single-pin publisher CLI.

Publishes ONE Pin through the official Pinterest API v5, from a row already
sitting in one of this repo's existing Pinterest inventory CSVs (built by
scripts/generate-pinterest.py or a board generator -- never invented here).

Usage:
    # Fully offline validation -- no PINTEREST_ACCESS_TOKEN needed:
    python3 scripts/publish-pinterest-pin.py --slug ascii-art-generator --dry-run

    # Live publish (needs PINTEREST_ACCESS_TOKEN in the environment):
    python3 scripts/publish-pinterest-pin.py --slug ascii-art-generator

    # A different inventory (board generator output):
    python3 scripts/publish-pinterest-pin.py --csv data/id_pinterest_pins.csv --slug <slug>

Do NOT loop this over many rows to bulk-publish -- see
docs/pinterest-api-publishing.md's "Recommended next phase" for the queue
design this deliberately does not build yet.
"""
import argparse
import csv
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))
import r2_pinterest as R2  # noqa: E402
import pinterest_publisher as PUB  # noqa: E402


_IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")


def _normalize_slug(value):
    """--slug is documented as a bare slug ('ascii-art-generator'), but the
    most natural thing to paste is the R2 image URL or path itself (that's
    what a first live test actually did: 'https://media.ultratextgen.com/
    pinterest/base/answers-can-you-search-fancy-text.png'). Accept that too
    -- take the last path segment and strip a known image extension -- so
    the obvious input just works instead of failing with 'no row found'."""
    if not value:
        return value
    tail = value.rstrip("/").split("/")[-1] if ("://" in value or "/" in value) else value
    for ext in _IMAGE_EXT:
        if tail.lower().endswith(ext):
            return tail[: -len(ext)]
    return tail


def _find_row(csv_path, slug=None, page_url=None):
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            path = (row.get("pinterest_image_path") or "")
            if slug and (path.endswith(f"/{slug}.png") or row.get("page_path", "").strip("/") == slug):
                return row
            if page_url and row.get("page_url") == page_url:
                return row
    return None


def _commit_and_push_log(extra_paths=()):
    """Commit data/pinterest_publish_log.jsonl (+ any extra_paths, e.g. the
    synced inventory CSV) back to the current branch, mirroring
    scripts/tweet_queue.py's save_state() pattern exactly -- same idiom,
    same [skip ci] tag, same best-effort try/except so a local run without
    push credentials just warns instead of crashing.

    This is what makes duplicate protection actually durable in CI: a
    GitHub Actions job starts from a fresh checkout every run, so the
    publish log has to be committed back or the next run can never see a
    prior success and will publish the same pin again."""
    paths = [PUB.LOG_PATH] + list(extra_paths)
    try:
        subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email",
                         "github-actions[bot]@users.noreply.github.com"], check=True, capture_output=True)
        subprocess.run(["git", "add", *paths], check=True, capture_output=True)
        diff = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
        if diff.returncode != 0:
            subprocess.run(["git", "commit", "-m", "chore: record Pinterest publish [skip ci]"],
                            check=True, capture_output=True)
            subprocess.run(["git", "push"], check=True, capture_output=True)
            print("Publish log committed and pushed.", file=sys.stderr)
    except subprocess.CalledProcessError as exc:
        print(f"Warning: could not commit/push publish log: {exc}", file=sys.stderr)


def _resolve_image_url(row):
    path = row.get("pinterest_image_path", "")
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        return path
    return R2.public_url(path)  # R2 object key -> public R2 URL (no creds needed)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", default=os.path.join("data", "pinterest_pins.csv"),
                     help="Inventory CSV to read the row from (default: data/pinterest_pins.csv)")
    ap.add_argument("--slug", help="Page slug, e.g. 'ascii-art-generator'")
    ap.add_argument("--page-url", help="Exact page_url value instead of --slug")
    ap.add_argument("--board-id", help="Override: publish straight to this Pinterest board ID")
    ap.add_argument("--board-name", help="Override the board name to resolve (default: row's pinterest_board_primary)")
    ap.add_argument("--dry-run", action="store_true",
                     help="Validate everything (image reachability, field lengths) without calling Pinterest or requiring a token")
    ap.add_argument("--force", action="store_true", help="Bypass duplicate protection and publish again")
    ap.add_argument("--sync-csv", action="store_true",
                     help="Best-effort write pin_status/published_pin_url back into --csv after a successful publish")
    ap.add_argument("--commit-log", action="store_true",
                     help="Commit + push the publish log (and synced CSV) back to the branch after a real "
                          "publish -- this is what makes duplicate protection durable across CI runs, which "
                          "each start from a fresh checkout. Mirrors scripts/tweet_queue.py's state-file commit.")
    args = ap.parse_args()

    if not args.slug and not args.page_url:
        ap.error("one of --slug or --page-url is required")

    args.slug = _normalize_slug(args.slug)
    row = _find_row(args.csv, slug=args.slug, page_url=args.page_url)
    if not row:
        sys.exit(f"No row found in {args.csv} matching slug={args.slug!r} page_url={args.page_url!r}")

    image_url = _resolve_image_url(row)
    if not image_url:
        sys.exit(f"Row for {row.get('page_url')} has no pinterest_image_path -- generate its pin first.")

    destination_url = row.get("utm_destination_url") or row.get("pin_destination_url") or row.get("page_url")
    title = row.get("pin_title", "")
    description = row.get("pin_description", "")
    board_name = args.board_name or row.get("pinterest_board_primary", "")

    board_id = args.board_id
    if not board_id and not args.dry_run:
        import pinterest_api as API
        token = API.get_access_token()
        try:
            board = API.get_board_by_name(token, board_name)
        except API.PinterestAPIError as exc:
            print(json.dumps({
                "pinId": None, "httpStatus": exc.status_code, "publishedAt": None,
                "boardId": None, "boardName": board_name,
                "utgDestinationUrl": destination_url, "imageUrl": image_url,
                "status": "failed", "error": f"Board lookup failed: {exc}",
            }, indent=2))
            sys.exit(1)
        if not board:
            sys.exit(
                f"No Pinterest board named {board_name!r} found on this account. "
                f"Create it in the Pinterest UI first (this script does not "
                f"auto-create boards), or pass --board-id explicitly."
            )
        board_id = board["id"]
    elif not board_id:
        board_id = "<resolved-at-publish-time>"  # dry-run placeholder, never sent anywhere

    result = PUB.publish_pinterest_pin(
        image_url=image_url,
        destination_url=destination_url,
        title=title,
        description=description,
        board_id=board_id,
        source_page=row.get("page_url"),
        board_name=board_name,
        dry_run=args.dry_run,
        force=args.force,
    )

    print(json.dumps({
        "pinId": result["pinId"],
        "httpStatus": result["httpStatus"],
        "publishedAt": result["publishedAt"],
        "boardId": result["boardId"],
        "boardName": result["boardName"],
        "utgDestinationUrl": result["destinationUrl"],
        "imageUrl": result["imageUrl"],
        "status": result["status"],
        "error": result["error"],
    }, indent=2))

    csv_updated = False
    if args.sync_csv and result["status"] == "published":
        csv_updated = PUB.sync_inventory_csv(args.csv, result)
        print(f"CSV sync: {'updated' if csv_updated else 'no matching row found'} ({args.csv})", file=sys.stderr)

    if args.commit_log and result["status"] == "published":
        _commit_and_push_log(extra_paths=[args.csv] if csv_updated else [])

    sys.exit(0 if result["status"] in ("published", "dry-run", "skipped-duplicate") else 1)


if __name__ == "__main__":
    main()
