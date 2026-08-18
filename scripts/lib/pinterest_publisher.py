#!/usr/bin/env python3
"""
publishPinterestPin() -- the reusable, idempotent single-Pin publisher.

This is the ONE function every future publishing entry point (the Phase-3
CLI, a later queue-drain script, a GitHub Action) should call. It never
talks to Pinterest directly -- all of that lives in pinterest_api.py, kept
separate so this module stays testable/dry-run-able without credentials.

Duplicate protection
---------------------
The append-only log at data/pinterest_publish_log.jsonl is the SOURCE OF
TRUTH for "has this already been published" -- not the inventory CSVs'
`pin_status`/`published_pin_url` columns, which are only a best-effort
mirror kept in sync for humans skimming the CSV. This ordering is
deliberate and is what makes a partial failure safe:

  1. call the Pinterest API (create_pin) -- the one step that can't be
     made atomic, because it's a network call to a third party
  2. the moment it returns success, append one line to the JSONL log
     (a local disk write, effectively never fails) -- this is the
     durable record
  3. only then, best-effort, try to update the human-facing CSV row

If step 3 fails (disk full, CSV locked, whatever), the Pin still shows as
published on the next run, because already_published() checks the JSONL
log, not the CSV. If a GitHub Action is killed between steps 1 and 2 (the
only real gap), the very next run will double-post that one pin -- there
is no way to close that gap without Pinterest itself supporting a
client-supplied idempotency key, which the v5 API does not expose today.
Everything on our side of that gap is closed.

The identity key for "this page/image combination" is
sha256(source_page + "|" + image_url) -- not the destination alone, since
a page can in principle be re-pinned with a different image (a redesigned
pin) and that is a deliberate re-publish, not a duplicate.
"""
import hashlib
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LOG_PATH = os.path.join(ROOT, "data", "pinterest_publish_log.jsonl")

sys.path.insert(0, HERE)
import pinterest_api as API  # noqa: E402


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _dedup_key(source_page, image_url):
    raw = f"{source_page or ''}|{image_url or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _read_log_entries():
    if not os.path.exists(LOG_PATH):
        return []
    entries = []
    with open(LOG_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def already_published(source_page, image_url):
    """Return the most recent successful log entry for this
    (source_page, image_url) pair, or None. Scans in reverse so a later
    successful re-publish (deliberate re-pin) wins over an earlier one."""
    key = _dedup_key(source_page, image_url)
    for entry in reversed(_read_log_entries()):
        if entry.get("dedupKey") == key and entry.get("status") == "published":
            return entry
    return None


def _append_log(entry):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


_USER_AGENT = "UltraTextGenPinterestPublisher/1.0 (+https://ultratextgen.com)"


def _image_url_reachable(image_url, timeout=15):
    """HEAD-check the image URL. No Pinterest credentials involved -- this
    is purely 'can anyone on the public internet fetch this', which is
    exactly what Pinterest's own fetcher needs to be able to do. A real
    User-Agent matters here: some CDNs/WAFs (including this repo's own R2
    domain, observed 2026-08-18) 403 the default urllib UA string while
    serving a real browser/bot UA fine."""
    try:
        req = urllib.request.Request(image_url, method="HEAD", headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return True, resp.status, resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as exc:
        return False, exc.code, ""
    except urllib.error.URLError as exc:
        return False, None, str(exc.reason)


def publish_pinterest_pin(
    image_url,
    destination_url,
    title,
    description,
    board_id,
    *,
    source_page=None,
    board_name=None,
    alt_text=None,
    dry_run=False,
    force=False,
):
    """Publish one Pin. Never raises for an ordinary API/validation failure
    -- it returns a structured result instead, so a caller iterating many
    pins doesn't need a try/except per item. Only truly unexpected bugs
    (e.g. a TypeError in this function itself) propagate.

    Returns:
      {
        "pinId": str | None,
        "status": "published" | "skipped-duplicate" | "dry-run" | "failed",
        "publishedAt": iso8601 str | None,
        "error": str | None,
        "httpStatus": int | None,
        "boardId": str | None,
        "boardName": str | None,
        "imageUrl": str,
        "destinationUrl": str,
        "sourcePage": str | None,
        "dedupKey": str,
      }
    """
    dedup_key = _dedup_key(source_page, image_url)
    result = {
        "pinId": None,
        "status": "failed",
        "publishedAt": None,
        "error": None,
        "httpStatus": None,
        "boardId": board_id,
        "boardName": board_name,
        "imageUrl": image_url,
        "destinationUrl": destination_url,
        "sourcePage": source_page,
        "dedupKey": dedup_key,
    }

    if not force:
        prior = already_published(source_page, image_url)
        if prior:
            result.update({
                "pinId": prior.get("pinId"),
                "status": "skipped-duplicate",
                "publishedAt": prior.get("publishedAt"),
                "httpStatus": prior.get("httpStatus"),
            })
            return result

    # Client-side validation that never needs a Pinterest credential --
    # catches "Invalid image URL" / oversized copy before spending an API
    # call (or before requiring one at all, for --dry-run).
    reachable, status, content_type = _image_url_reachable(image_url)
    if not reachable:
        result["error"] = f"Image URL not publicly reachable (HEAD status={status})"
        result["httpStatus"] = status
        _append_log({**result, "publishedAt": _now_iso()})
        return result
    if content_type and not content_type.startswith("image/"):
        result["error"] = f"Image URL did not return an image/* Content-Type (got {content_type!r})"
        _append_log({**result, "publishedAt": _now_iso()})
        return result

    title = (title or "").strip()
    description = (description or "").strip()
    if len(title) > API.TITLE_MAX:
        result["error"] = f"Title exceeds {API.TITLE_MAX} chars ({len(title)})"
        _append_log({**result, "publishedAt": _now_iso()})
        return result
    if len(description) > API.DESCRIPTION_MAX:
        result["error"] = f"Description exceeds {API.DESCRIPTION_MAX} chars ({len(description)})"
        _append_log({**result, "publishedAt": _now_iso()})
        return result
    if not board_id:
        result["error"] = "Missing board_id -- resolve the board before publishing"
        _append_log({**result, "publishedAt": _now_iso()})
        return result

    if dry_run:
        result["status"] = "dry-run"
        result["publishedAt"] = _now_iso()
        return result

    try:
        token = API.get_access_token()
        pin = API.create_pin(
            token, board_id, image_url,
            title=title, description=description,
            link=destination_url, alt_text=alt_text or title,
        )
    except API.PinterestAPIError as exc:
        result["error"] = str(exc)
        result["httpStatus"] = exc.status_code
        _append_log({**result, "publishedAt": _now_iso()})
        return result
    except ValueError as exc:
        result["error"] = str(exc)
        _append_log({**result, "publishedAt": _now_iso()})
        return result

    # Step 2 (see module docstring): the durable record, written the
    # instant the API call succeeds, before anything else can fail.
    result["pinId"] = pin.get("id")
    result["status"] = "published"
    result["publishedAt"] = _now_iso()
    result["httpStatus"] = 201
    _append_log(result)
    return result


def sync_inventory_csv(csv_path, result, url_column="page_url"):
    """Best-effort mirror of a publish result into an inventory CSV's
    pin_status/published_pin_url columns, matched on `url_column` ==
    result['sourcePage']. Never the source of truth (see module docstring)
    -- returns False (not an error) if the row can't be found/updated."""
    import csv as csv_mod

    if not result.get("sourcePage") or result["status"] not in ("published", "skipped-duplicate"):
        return False
    if not os.path.exists(csv_path):
        return False

    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv_mod.DictReader(f))
        fieldnames = rows[0].keys() if rows else []

    pin_url = f"https://www.pinterest.com/pin/{result['pinId']}/" if result.get("pinId") else ""
    updated = False
    for row in rows:
        if row.get(url_column) == result["sourcePage"]:
            row["pin_status"] = "published"
            row["published_pin_url"] = pin_url
            updated = True

    if not updated:
        return False

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv_mod.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    return True
