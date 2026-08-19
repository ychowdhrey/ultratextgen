#!/usr/bin/env python3
"""
Thin, dependency-free client for the official Pinterest API v5.

SINGLE SOURCE OF TRUTH for how this repo talks to Pinterest's REST API --
nothing else should build a Pinterest request URL or parse a Pinterest
response by hand. Mirrors scripts/lib/r2_pinterest.py's shape (env-var-only
config, fail loud on missing credentials, one client, no hardcoded secrets)
and scripts/tweet_queue.py's HTTP style (stdlib urllib only -- no `requests`
dependency anywhere else in this repo's Python tooling).

Configuration -- environment variables only, NEVER hardcoded:
  PINTEREST_ACCESS_TOKEN    required for any live call. 30-day-lived OAuth
                             token with at least pins:read, pins:write,
                             boards:read (boards:write only if you let this
                             module create boards).
  PINTEREST_APP_ID          optional, only needed to auto-refresh an
  PINTEREST_APP_SECRET      expired access token.
  PINTEREST_REFRESH_TOKEN   optional, ditto. Pinterest issues this alongside
                             the access token during the full OAuth code
                             exchange -- NOT alongside a dashboard "Generate
                             Access Tokens" test/sandbox token, which has no
                             refresh token at all (regenerate manually
                             instead; it's valid 30 days).
  PINTEREST_API_ENV         optional, "sandbox" (default) or "production".
                             Sandbox and production are separate Pinterest
                             API hosts, and a token from one 401s against
                             the other -- see api_base() below. This app
                             currently only issues Sandbox tokens (Trial
                             access), so sandbox is the correct default.

Never hardcode any of the above, and never log a token value -- see
_mask_token(). Set these as GitHub Actions repository secrets in CI, or
export them in your shell locally -- never write them into a file in this
repo. Full architecture: docs/pinterest-api-publishing.md.

Verified against the live Pinterest API v5 docs (developers.pinterest.com)
on 2026-08-18 -- see that doc's "Phase 2" section for exact source URLs.
Endpoints used here:
  POST /oauth_token                    (token refresh)
  GET  /boards                         (list, paginated via `bookmark`)
  POST /boards                         (create -- optional, off by default)
  POST /pins                           (create a Pin)
  GET  /pins/{pin_id}/analytics        (Pin-level performance)
  GET  /user_account/analytics         (account-level performance)
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

PRODUCTION_API_BASE = "https://api.pinterest.com/v5"
SANDBOX_API_BASE = "https://api-sandbox.pinterest.com/v5"
# The OAuth token endpoint itself is environment-agnostic -- only the
# resource-serving host below differs between sandbox and production.
OAUTH_TOKEN_URL = f"{PRODUCTION_API_BASE}/oauth_token"
_USER_AGENT = "UltraTextGenPinterestPublisher/1.0 (+https://ultratextgen.com)"


def api_base():
    """Sandbox and production are genuinely different hosts on Pinterest's
    side -- a Sandbox-generated token 401s against api.pinterest.com and a
    production token 401s against api-sandbox.pinterest.com (verified
    2026-08-18: this repo's own first live test hit exactly that 401 before
    this function existed). Defaults to sandbox, because that's what this
    app can actually issue right now (Trial access, "Sandbox" token type in
    the dashboard's Generate Access Tokens panel) -- set
    PINTEREST_API_ENV=production once the app has Standard access and a
    real production token."""
    env = _env("PINTEREST_API_ENV").lower() or "sandbox"
    if env not in ("sandbox", "production"):
        sys.exit(f"pinterest_api: PINTEREST_API_ENV must be 'sandbox' or 'production', got {env!r}")
    return SANDBOX_API_BASE if env == "sandbox" else PRODUCTION_API_BASE

# Same limits pinterest_csv.py already enforces for the bulk-CSV path --
# the API path must reject exactly the same things, at the same bar, so a
# pin can never pass one route and fail the other for the same reason.
TITLE_MAX = 100
DESCRIPTION_MAX = 500

# org_write rate-limit category covers Pin/board create -- 100 req/min on
# Standard access, 300 req/day on Trial. Retry schedule mirrors this repo's
# own established backoff convention (git-push retries, R2 migration
# network-blip retries): 2s, 4s, 8s, 16s.
_RETRY_DELAYS = (2, 4, 8, 16)


class PinterestAPIError(Exception):
    """Terminal (non-retryable) API failure. Carries the HTTP status and the
    parsed error body so callers can branch on it without re-parsing JSON."""

    def __init__(self, message, status_code=None, body=None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class PinterestAuthError(PinterestAPIError):
    """401 that a token refresh could not resolve (or no refresh creds)."""


class PinterestRateLimitError(PinterestAPIError):
    """429 that persisted through every retry."""


def _mask_token(token):
    if not token or len(token) < 10:
        return "***"
    return f"{token[:4]}…{token[-2:]} ({len(token)} chars)"


def _env(name):
    return os.environ.get(name, "").strip()


def get_access_token():
    """Read the access token from the environment. Fails loudly -- never
    silently falls back to a hardcoded value."""
    token = _env("PINTEREST_ACCESS_TOKEN")
    if not token:
        sys.exit(
            "pinterest_api: missing required environment variable "
            "PINTEREST_ACCESS_TOKEN. Set it as a GitHub Actions secret (CI) "
            "or export it in your shell (local) -- never hardcode it. See "
            "docs/pinterest-api-publishing.md."
        )
    return token


def refresh_access_token():
    """Exchange PINTEREST_REFRESH_TOKEN for a new access token using Basic
    auth of PINTEREST_APP_ID:PINTEREST_APP_SECRET.

    Returns the new access token string. Does NOT persist it anywhere --
    this process's env var is updated in-memory only (os.environ), so the
    *current* run succeeds, but the stored GitHub secret still needs manual
    rotation afterward. Rotating the stored secret automatically would need
    a GitHub API call with repo-admin scope, which is a deliberately
    separate, later piece of infrastructure -- see docs/pinterest-api-
    publishing.md's "Recommended next phase".
    """
    app_id = _env("PINTEREST_APP_ID")
    app_secret = _env("PINTEREST_APP_SECRET")
    refresh_token = _env("PINTEREST_REFRESH_TOKEN")
    missing = [n for n, v in (
        ("PINTEREST_APP_ID", app_id),
        ("PINTEREST_APP_SECRET", app_secret),
        ("PINTEREST_REFRESH_TOKEN", refresh_token),
    ) if not v]
    if missing:
        raise PinterestAuthError(
            "Access token expired/rejected and refresh is not possible -- "
            "missing " + ", ".join(missing) + ". Re-run the OAuth code "
            "exchange and update the stored secrets."
        )
    import base64
    basic = base64.b64encode(f"{app_id}:{app_secret}".encode()).decode()
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }).encode()
    req = urllib.request.Request(
        OAUTH_TOKEN_URL, data=data, method="POST",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": _USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raise PinterestAuthError(
            f"Token refresh failed: HTTP {exc.code} {exc.read().decode(errors='replace')}",
            status_code=exc.code,
        )
    new_token = payload.get("access_token")
    if not new_token:
        raise PinterestAuthError(f"Token refresh returned no access_token: {payload!r}")
    os.environ["PINTEREST_ACCESS_TOKEN"] = new_token
    print(
        f"pinterest_api: refreshed access token in-memory "
        f"({_mask_token(new_token)}) -- rotate the stored secret too.",
        file=sys.stderr,
    )
    return new_token


def _request(method, path, token, body=None, params=None, max_retries=4, _retried_auth=False):
    """Core HTTP call against api_base() + path. Retries 429/5xx with backoff
    (respecting Retry-After when Pinterest sends one), retries a 401 exactly
    once via refresh_access_token(), and raises PinterestAPIError for every
    other non-2xx response. Never logs the token."""
    url = f"{api_base()}{path}"
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": _USER_AGENT,
    }
    if data is not None:
        headers["Content-Type"] = "application/json"

    attempt = 0
    while True:
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            status = exc.code
            raw_body = exc.read()
            try:
                parsed = json.loads(raw_body) if raw_body else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw_body.decode(errors="replace")}

            if status == 401 and not _retried_auth:
                refresh_access_token()
                return _request(method, path, os.environ["PINTEREST_ACCESS_TOKEN"],
                                 body=body, params=params, max_retries=max_retries,
                                 _retried_auth=True)

            retryable = status == 429 or 500 <= status < 600
            if retryable and attempt < max_retries:
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                delay = float(retry_after) if retry_after else _RETRY_DELAYS[min(attempt, len(_RETRY_DELAYS) - 1)]
                print(
                    f"pinterest_api: {method} {path} -> HTTP {status}, "
                    f"retrying in {delay:.0f}s (attempt {attempt + 1}/{max_retries})",
                    file=sys.stderr,
                )
                time.sleep(delay)
                attempt += 1
                continue

            if status == 429:
                raise PinterestRateLimitError(
                    f"Rate limited on {method} {path} after {max_retries} retries: {parsed}",
                    status_code=status, body=parsed,
                )
            if status == 401:
                raise PinterestAuthError(
                    f"Unauthorized on {method} {path} even after refresh: {parsed}",
                    status_code=status, body=parsed,
                )
            raise PinterestAPIError(
                f"{method} {path} -> HTTP {status}: {parsed}",
                status_code=status, body=parsed,
            )
        except urllib.error.URLError as exc:
            if attempt < max_retries:
                delay = _RETRY_DELAYS[min(attempt, len(_RETRY_DELAYS) - 1)]
                print(
                    f"pinterest_api: {method} {path} network error ({exc.reason}), "
                    f"retrying in {delay:.0f}s (attempt {attempt + 1}/{max_retries})",
                    file=sys.stderr,
                )
                time.sleep(delay)
                attempt += 1
                continue
            raise PinterestAPIError(f"{method} {path} network error after retries: {exc.reason}")


# --------------------------------------------------------------------------
# Boards
# --------------------------------------------------------------------------

def list_boards(token, page_size=100):
    """Yield every board on the account, following `bookmark` pagination."""
    bookmark = None
    while True:
        params = {"page_size": page_size}
        if bookmark:
            params["bookmark"] = bookmark
        resp = _request("GET", "/boards", token, params=params)
        for board in resp.get("items", []):
            yield board
        bookmark = resp.get("bookmark")
        if not bookmark:
            return


def get_board_by_name(token, name):
    """Case-insensitive exact match first, then substring, over the
    account's own boards. Returns the board dict or None."""
    name_l = (name or "").strip().lower()
    if not name_l:
        return None
    substring_hit = None
    for board in list_boards(token):
        board_name = (board.get("name") or "").strip()
        if board_name.lower() == name_l:
            return board
        if substring_hit is None and name_l in board_name.lower():
            substring_hit = board
    return substring_hit


def create_board(token, name, description="", privacy="PUBLIC"):
    """POST /boards -- off the default publish path; only called when a
    caller explicitly opts in (--create-board). Kept opt-in as a deliberate
    choice, not because Pinterest requires pre-creation -- its own bulk-CSV
    importer auto-creates a missing board ("if the board or section doesn't
    exist, it will be created for you" -- Pinterest Help)."""
    body = {"name": name, "description": description, "privacy": privacy}
    return _request("POST", "/boards", token, body=body)


def is_duplicate_board_error(exc):
    """True if a create_board() PinterestAPIError means 'a board with this
    name already exists' (Pinterest error code 58) rather than a real
    failure. Real case (2026-08-19): a live create_board() call hit this
    immediately after get_board_by_name() had just reported no match for
    the same name -- board listing can lag a just-created (or otherwise
    already-existing) board. Callers should treat this as 'go look it up
    again and use it', not a terminal error."""
    body = getattr(exc, "body", None)
    if isinstance(body, dict) and body.get("code") == 58:
        return True
    return "already have a board with this name" in str(exc).lower()


# --------------------------------------------------------------------------
# Pins
# --------------------------------------------------------------------------

def create_pin(token, board_id, image_url, *, title="", description="",
                link="", alt_text="", board_section_id=None):
    """POST /pins -- creates one image Pin from a public image URL.

    Validates title/description length client-side (same TITLE_MAX/
    DESCRIPTION_MAX the bulk-CSV path already enforces in pinterest_csv.py)
    so a bad pin fails loudly here instead of as an opaque Pinterest 400.
    """
    title = (title or "").strip()
    description = (description or "").strip()
    if not board_id:
        raise ValueError("create_pin: board_id is required")
    if not image_url or not image_url.startswith(("http://", "https://")):
        raise ValueError(f"create_pin: image_url must be a public http(s) URL, got {image_url!r}")
    if len(title) > TITLE_MAX:
        raise ValueError(f"create_pin: title exceeds {TITLE_MAX} chars ({len(title)}): {title!r}")
    if len(description) > DESCRIPTION_MAX:
        raise ValueError(f"create_pin: description exceeds {DESCRIPTION_MAX} chars ({len(description)})")

    body = {
        "board_id": board_id,
        "media_source": {
            "source_type": "image_url",
            "url": image_url,
            "is_standard": True,
        },
    }
    if title:
        body["title"] = title
    if description:
        body["description"] = description
    if link:
        body["link"] = link
    if alt_text:
        body["alt_text"] = alt_text
    if board_section_id:
        body["board_section_id"] = board_section_id

    return _request("POST", "/pins", token, body=body)


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

PIN_METRICS = ("IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK")


def get_pin_analytics(token, pin_id, start_date, end_date, metric_types=PIN_METRICS):
    """GET /pins/{pin_id}/analytics -- daily + summary metrics for one Pin.
    Dates are 'YYYY-MM-DD' strings. Requires pins:read + Standard access
    (Trial-access sandbox Pins have no real analytics)."""
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "metric_types": ",".join(metric_types),
    }
    return _request("GET", f"/pins/{pin_id}/analytics", token, params=params)


def get_account_analytics(token, start_date, end_date, metric_types=PIN_METRICS):
    """GET /user_account/analytics -- account-level rollup, same metric
    vocabulary as get_pin_analytics(). Requires Standard access."""
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "metric_types": ",".join(metric_types),
    }
    return _request("GET", "/user_account/analytics", token, params=params)
