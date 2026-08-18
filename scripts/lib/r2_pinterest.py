#!/usr/bin/env python3
"""
Shared Cloudflare R2 client for UltraTextGen's Pinterest pin pipeline.

SINGLE SOURCE OF TRUTH for how every Pinterest generator (and the one-time
migration/validation utilities) talk to R2 — nothing else in this repo should
construct a boto3 S3 client or a media URL for a Pinterest pin by hand.

Why this exists: PR #648 alone added 12,429 pin images and pushed the repo to
23,224 tracked files -- over Cloudflare Pages' 20,000-file-per-deployment
limit -- and had to be worked around with a `.assetsignore` exclusion that
still left the binaries committed (3.6 GB across assets/pinterest/ +
assets/collection-pins/, 65% of the repo's tracked files). Generators now
render pins in memory and upload straight to Cloudflare R2; nothing under
assets/pinterest/ or assets/collection-pins/ is written to disk, let alone
committed, going forward. See docs/pinterest-r2-migration.md for the full
architecture.

Configuration — environment variables only, NEVER hardcoded:
  R2_ENDPOINT             required, e.g. https://<account_id>.r2.cloudflarestorage.com
  R2_ACCESS_KEY_ID        required
  R2_SECRET_ACCESS_KEY    required
  R2_BUCKET               optional, defaults to "ultratextgen-media"
  R2_PUBLIC_BASE_URL      optional, defaults to "https://media.ultratextgen.com"

Object key convention (preserve filenames 1:1 wherever practical):
  pinterest/base/<slug>.png              generate-pinterest.py
  pinterest/variants/<slug>--vN.png      generate-pinterest-variants.py
  pinterest/boards/<board>/<slug>.png    the ~15 dedicated board generators
  pinterest/collection/<slug>.png        generate-collection-pins.py

Public URL = R2_PUBLIC_BASE_URL + "/" + key, e.g.
  https://media.ultratextgen.com/pinterest/base/bold-fonts.png
"""
import hashlib
import os
import sys

DEFAULT_BUCKET = "ultratextgen-media"
DEFAULT_PUBLIC_BASE_URL = "https://media.ultratextgen.com"
KEY_PREFIX = "pinterest"

_client_singleton = None


def bucket():
    return os.environ.get("R2_BUCKET", DEFAULT_BUCKET)


def public_base_url():
    return os.environ.get("R2_PUBLIC_BASE_URL", DEFAULT_PUBLIC_BASE_URL).rstrip("/")


def public_url(key):
    """R2_PUBLIC_BASE_URL + '/' + key -- the exact Media URL Pinterest's bulk
    importer will fetch."""
    return f"{public_base_url()}/{str(key).lstrip('/')}"


def client():
    """Lazily-built, memoized boto3 S3-compatible client against R2.

    Fails loudly (not a stack trace) when required env vars are missing --
    this must never silently fall back to hardcoded credentials."""
    global _client_singleton
    if _client_singleton is not None:
        return _client_singleton
    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        sys.exit("r2_pinterest: boto3 is required -- `pip install boto3` -- to "
                  "upload Pinterest pins to R2.")
    endpoint = os.environ.get("R2_ENDPOINT")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    missing = [name for name, val in (
        ("R2_ENDPOINT", endpoint),
        ("R2_ACCESS_KEY_ID", access_key),
        ("R2_SECRET_ACCESS_KEY", secret_key),
    ) if not val]
    if missing:
        sys.exit(
            "r2_pinterest: missing required environment variable(s): "
            + ", ".join(missing)
            + ". Set them in your shell (never hardcode) -- see "
              "docs/pinterest-r2-migration.md."
        )
    _client_singleton = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        region_name="auto",
    )
    return _client_singleton


def remote_md5(key):
    """ETag of an object PUT as a single part is its MD5 hex digest -- this is
    how skip-if-identical dedup works without downloading the object. Returns
    None if the object doesn't exist, or if it was uploaded multipart (a
    composite ETag containing '-', which cannot be compared to a plain MD5)."""
    from botocore.exceptions import ClientError
    c = client()
    try:
        head = c.head_object(Bucket=bucket(), Key=key)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return None
        raise
    etag = (head.get("ETag") or "").strip('"')
    return None if "-" in etag else etag


def object_exists(key):
    return remote_md5(key) is not None


def upload_bytes(data, key, content_type="image/png", skip_if_identical=True,
                  dry_run=False):
    """Upload `data` to R2 under `key`.

    Returns (public_url, status) where status is one of:
      "uploaded"           -- object written (new or content changed)
      "skipped-identical"  -- remote object's MD5 already matches; not re-sent
      "dry-run"            -- would upload, but dry_run=True suppressed it
    """
    local_md5 = hashlib.md5(data).hexdigest()
    if skip_if_identical and remote_md5(key) == local_md5:
        return public_url(key), "skipped-identical"
    if dry_run:
        return public_url(key), "dry-run"
    client().put_object(Bucket=bucket(), Key=key, Body=data, ContentType=content_type)
    return public_url(key), "uploaded"


def upload_file(local_path, key, **kw):
    with open(local_path, "rb") as f:
        data = f.read()
    return upload_bytes(data, key, **kw)


def render_svg_png(svg_str, width, height):
    """Render an SVG string to PNG bytes in memory -- no disk I/O at all. Used
    by every cairosvg-based pin generator instead of svg2png(write_to=...)."""
    import cairosvg
    return cairosvg.svg2png(bytestring=svg_str.encode(), output_width=width,
                            output_height=height)


def render_and_upload(svg_str, key, width, height, **kw):
    """Render an SVG pin and upload it to R2 in one step. Returns
    (public_url, status)."""
    return upload_bytes(render_svg_png(svg_str, width, height), key, **kw)
