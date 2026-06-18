#!/usr/bin/env python3
"""
Single source of truth for Pinterest "Bulk create Pins" CSV output.

WHY THIS EXISTS
---------------
Pinterest's bulk importer rejects any CSV whose header row is not *exactly* its
schema, and it requires `Media URL` to be a **publicly reachable link to the
image file** (not a repo path). Our pin generators each keep a rich *internal
inventory* CSV (boards, status, alt text, search volume, …) that is useful for
us but is NOT what Pinterest accepts. Uploading an inventory CSV has now failed
twice for exactly this reason.

To stop that recurring, the Pinterest schema + its validation live here and
nowhere else. Generators never hand-write the upload file; they build normalized
rows and pass them through `upload_row()` + `write_upload_csv()` (directly, or via
scripts/build_pinterest_upload.py, which converts an inventory CSV into the
importer-ready `*_upload.csv`).

THE SCHEMA (exact header names, order preserved)
------------------------------------------------
Title | Media URL | Pinterest board | Thumbnail | Description | Link |
Publish date | Keywords

  - Title           required, <= 100 chars
  - Media URL       required, public http(s) link ending in .png/.jpg/.jpeg/.mp4
  - Pinterest board required, must match an existing board name in the account
  - Thumbnail       video pins only (blank for image pins)
  - Description     <= 500 chars
  - Link            destination URL (with UTM)
  - Publish date    blank = publish on upload; else "YYYY-MM-DD" or ISO 8601
  - Keywords        comma-separated string (or list, joined here)

Ref: Pinterest Help — "Bulk upload Pins".
"""
import csv

# Exact header row Pinterest's importer expects. Do not rename or reorder.
PINTEREST_COLUMNS = [
    "Title", "Media URL", "Pinterest board", "Thumbnail",
    "Description", "Link", "Publish date", "Keywords",
]

TITLE_MAX = 100
DESCRIPTION_MAX = 500
_MEDIA_EXT = (".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov")


def public_media_url(domain, image_path):
    """Join a public domain and a repo-relative image path into the absolute,
    publicly reachable URL Pinterest will fetch (e.g.
    'https://ultratextgen.com' + 'assets/pinterest/id/x.png')."""
    return domain.rstrip("/") + "/" + str(image_path).lstrip("/")


def upload_row(title, media_url, board, *, description="", link="",
               keywords="", thumbnail="", publish_date=""):
    """Build and VALIDATE one Pinterest upload row. Raises ValueError on
    anything the importer would reject, so a bad pin fails loudly at build time
    instead of shipping a CSV that errors in the Pinterest UI."""
    title = (title or "").strip()
    media_url = (media_url or "").strip()
    board = (board or "").strip()
    if isinstance(keywords, (list, tuple)):
        keywords = ", ".join(k.strip() for k in keywords if k.strip())

    missing = [n for n, v in (("Title", title), ("Media URL", media_url),
                              ("Pinterest board", board)) if not v]
    if missing:
        raise ValueError(f"Pinterest pin missing required field(s): "
                         f"{', '.join(missing)} (title={title!r})")
    if not media_url.startswith(("http://", "https://")):
        raise ValueError(f"Media URL must be a public http(s) link, got "
                         f"{media_url!r} — Pinterest cannot fetch repo paths.")
    if not media_url.lower().split("?")[0].endswith(_MEDIA_EXT):
        raise ValueError(f"Media URL should point at an image/video file "
                         f"{_MEDIA_EXT}, got {media_url!r}")
    if len(title) > TITLE_MAX:
        raise ValueError(f"Title exceeds {TITLE_MAX} chars ({len(title)}): {title!r}")
    if len(description) > DESCRIPTION_MAX:
        raise ValueError(f"Description exceeds {DESCRIPTION_MAX} chars "
                         f"({len(description)}) for {title!r}")
    return {
        "Title": title, "Media URL": media_url, "Pinterest board": board,
        "Thumbnail": thumbnail, "Description": description, "Link": link,
        "Publish date": publish_date, "Keywords": keywords,
    }


def write_upload_csv(path, rows):
    """Write validated rows as a Pinterest-importer-ready CSV.

    Saved as UTF-8 *with BOM* — Pinterest expects UTF-8, and the BOM keeps the
    styled-Unicode samples/keywords intact through Excel/Google Sheets."""
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=PINTEREST_COLUMNS)
        w.writeheader()
        w.writerows(rows)
    return len(rows)
