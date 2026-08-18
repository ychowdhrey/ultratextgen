# Pinterest API Publishing — official API v5 pipeline (2026-08-18)

R2 image → Pinterest API v5 → UTG's own Pinterest account → the matching
`ultratextgen.com` page. Internal publishing only — this is not a general
social-media-management platform, and it does not build bulk/scheduled
publishing yet (see "Recommended next phase" at the bottom).

---

## 1. Repository audit

Before writing anything, the existing Pinterest/social/R2 architecture was
read in full. Findings, mapped to the audit's own checklist:

| # | What was asked | Found |
|---|---|---|
| 1 | Existing Pinterest **automation** | **None.** Every existing script (`generate-pinterest.py`, `generate-id-pins.py`, `generate-vertical-text-pins.py`, `generate-collection-pins.py`, +~15 board generators) only *generates pin images and CSVs*. Publishing has always been Pinterest's own manual "Bulk create Pins" web importer, fed by a `*_upload.csv`. `data/pinterest_pins.csv`'s own `pin_status` column has been `pending` for all 235 rows since it was created — nothing has ever flipped it. `docs/pinterest-pin-generation.md` says this explicitly in its own "Scope" section: *"No pins were published to Pinterest and no Pinterest API integration was created."* |
| 2 | Existing **Playwright** Pinterest work | **One generator uses Playwright, and it's for image rendering, not publishing:** `scripts/generate-collection-pins.py` screenshots real rendered HTML via headless Chromium to produce the pin *image* (`page.locator(".pin").screenshot()`), then uploads that PNG to R2 like every other generator. It never opens pinterest.com or touches Pinterest's UI. No browser-automation *publishing* exists anywhere in the repo. |
| 3 | Social **image generation** workflow | Extensive and mature — see `docs/pinterest-pin-generation.md`. `scripts/generate-site-art.py` is the single source of truth for the brand skin (off-white panel, dot grid, purple→blue gradient); every pin generator imports it and renders an SVG→PNG (1000×1500, 2:3) in memory. 12+ board-specific generators, all sharing `scripts/build_pinterest_upload.py` (inventory → importer CSV) and `scripts/pinterest_csv.py` (the exact Pinterest bulk-CSV schema, with validation). |
| 4 | Cloudflare **R2** integration | Complete, as of the 2026-08-17 migration (`docs/pinterest-r2-migration.md`). Every generator renders in memory and uploads straight to R2 via `scripts/lib/r2_pinterest.py` — the single source of truth for the boto3 client, object-key convention (`pinterest/base/`, `pinterest/variants/`, `pinterest/boards/<board>/`, `pinterest/collection/`), and the public-URL builder. Verified live during this audit: `https://media.ultratextgen.com/pinterest/base/ascii-art-generator.png` → **HTTP 200, `image/png`, 215,512 bytes**. Nothing under `assets/pinterest/` is committed anymore (`.gitignore`'d). |
| 5 | Existing **social metadata** | `data/pinterest_pins.csv` (and every board CSV) already carries the exact fields a publisher needs per row: `pin_title`, `pin_description`, `pin_keywords`, `pinterest_board_primary`/`_secondary`, `utm_destination_url`, `pinterest_image_path`, and — critically — **`pin_status` and `published_pin_url` columns that have existed since creation, unused, waiting for exactly this phase.** |
| 6 | Pinterest/social **GitHub Actions** | None exist. `tweet-queue.yml` (daily, posts commit summaries to a GitHub Issue) and `update-sitemap.yml` are the only scheduled content-adjacent workflows; neither touches Pinterest. No workflow references `R2_*` secrets today — the R2 pipeline has only ever been run locally/by an agent session, never from CI. |
| 7 | Existing **social-post tracking** (DB/files) | `pin_status`/`published_pin_url` on the inventory CSVs (see #5) is the only such tracking, and it's inert. No database, no other ledger. |
| 8 | Existing **retry/logging/scheduling** infra to reuse | `scripts/tweet_queue.py` is the clear precedent and was mirrored deliberately: (a) **de-dup via a durable record**, not just an in-memory set — it checks GitHub-issue-comment history *and* a local JSON state file; (b) **the state file is committed back to the branch** (`git add/commit/push`, tagged `[skip ci]`) so a fresh CI checkout doesn't lose it; (c) **stdlib-only HTTP** (`urllib.request`), no `requests` dependency anywhere in this repo's Python tooling — confirmed via grep, no `requirements.txt` exists. `scripts/validate_pinterest_r2_migration.py`'s "retry transient network blips" step, and this repo's own git-push retry convention (2s/4s/8s/16s backoff), set the retry/backoff idiom reused below. |

**Conclusion: nothing to duplicate.** The image/R2/CSV layer is complete and gets reused as-is; the one missing piece — the actual Pinterest API call — is genuinely new, and the `pin_status`/`published_pin_url` columns show it was anticipated, not bolted on.

---

## 2. Pinterest API v5 — verified against current docs (2026-08-18)

Checked against `developers.pinterest.com` directly (access-tiers, OAuth,
create-boards-and-pins pages) plus the official `pinterest-python-generated-
api-client` OpenAPI-derived docs on GitHub — not memory, not an old version.

| # | Question | Answer |
|---|---|---|
| 1 | Pin creation endpoint | `POST https://api.pinterest.com/v5/pins`. Body: `board_id` + `media_source` required; `title`, `description`, `link`, `alt_text`, `board_section_id` optional. |
| 2 | Required scopes | `pins:write` to create, `boards:read` to resolve a board by name (`boards:write` only if this pipeline is ever allowed to create boards itself — see #6). |
| 3 | Sandbox behavior | **Trial access is a full sandbox**: "all Pins and Boards created with Trial access are only visible to their creator" — never public, never real reach. Trial only grants read scopes by default; write scopes need the Standard-access upgrade. |
| 4 | Board retrieval | `GET /v5/boards` (list, paginated via a `bookmark` cursor — not offset/page-number), `GET /v5/boards/{board_id}` (single). |
| 5 | Board creation | `POST /v5/boards` — supported, but deliberately **not wired into the default publish path** in this implementation (see §4). |
| 6 | Image URL requirements | Must be a public `http(s)` URL Pinterest's own fetcher can reach; `media_source.source_type: "image_url"`. This repo's R2 public URLs already satisfy that — verified live (see §1.4). |
| 7 | Destination/link support | `link` field on the Pin — exactly what `utm_destination_url` in the existing CSVs already is. |
| 8 | Title/description limits | Not stated as a hard number in the current live-fetchable docs, so this implementation adopts the **same limits `scripts/pinterest_csv.py` already enforces for the bulk-CSV path** (Title ≤ 100 chars, Description ≤ 500 chars) — those were sourced from Pinterest's own bulk-upload help doc, and using the same numbers means a pin can't pass one publishing route and fail the other for the same reason. |
| 9 | Rate limits | Pin/board creation falls under the `org_write` category: **300 requests/day on Trial**, **100 requests/minute on Standard**. Read operations (`org_read`, listing boards etc.) are far more generous (1,000/day Trial, 1,000/min Standard). Response headers `x-ratelimit-limit` / `-remaining` / `-reset` report live quota. |
| 10 | OAuth for production publishing | Authorization-code flow: user consents at `pinterest.com/oauth/` → code exchanged at `POST api.pinterest.com/v5/oauth/token` (HTTP Basic `client_id:client_secret`) → access token (`pina...`, 30-day expiry) + refresh token (`pinr...`). Refresh via the same token endpoint with `grant_type=refresh_token`. |
| 11 | Sandbox vs. Trial/Standard/Production | Pinterest's current model (per the live access-tiers doc) has **two** tiers, not three/four: **Trial** (sandbox-only, the default on approval) and **Standard** (public/production, requires a manual review — an OAuth-flow demo video + privacy policy — before it's granted). There is no separate "Production Limited" tier in the current docs; "Standard" *is* production. |

**What this means for the stated app configuration** ("Personal API access,
Pin creation & scheduling + Reporting, Businesses, own Pins/Boards only"):
that maps to Trial access at approval time, sandbox-only until Pinterest
manually upgrades the app to Standard. **The Phase-3 test below cannot go
fully live and publicly visible until that upgrade happens** — it can run
today in `--dry-run` (no credentials needed at all) and, once
`PINTEREST_ACCESS_TOKEN` exists, in live-but-sandboxed Trial mode (the Pin
gets created, but is only visible to the UTG account itself).

---

## 3. API vs. Playwright — per-operation recommendation

| Operation | Verdict | Why |
|---|---|---|
| Create a Pin | **API preferred** | `POST /v5/pins` does exactly this, reliably, without a browser. |
| List/resolve a board by name | **API preferred** | `GET /v5/boards`. |
| Create a board | **API preferred** (available, not wired in by default) | `POST /v5/boards` exists; left as an explicit opt-in (`--create-board`, not built yet — see §9) because this repo has a standing rule against creating Pinterest boards off-system without a deliberate decision. |
| Pin/board/account performance reporting | **API preferred** | `GET /pins/{id}/analytics`, `/user_account/analytics` — see §7. |
| Rendering the pin **image** itself | **No longer relevant to this decision** | Already solved, already API-adjacent (cairosvg/Playwright → R2), untouched by this work. |
| Anything requiring a **live, human Pinterest session** with no API surface (e.g. reading UI-only analytics dashboards Pinterest hasn't exposed via `/analytics`, or manual account settings) | **Playwright required, if ever needed** | Not needed for anything in this task's scope; noted only so a future session doesn't assume the API covers 100% of Pinterest's UI. |

**Net result: zero Playwright code was added.** The one existing Playwright
use (`generate-collection-pins.py`'s screenshot renderer) is unrelated to
publishing and is untouched.

---

## 4. Files added

No existing file was modified — this is additive only, mirroring the
existing generator/lib split:

| File | Role |
|---|---|
| `scripts/lib/pinterest_api.py` | Low-level API v5 client. OAuth token read + refresh, retryable HTTP (`urllib`, stdlib-only, no new dependency), `list_boards()`, `get_board_by_name()`, `create_board()`, `create_pin()`, `get_pin_analytics()`, `get_account_analytics()`. Mirrors `scripts/lib/r2_pinterest.py`'s shape on purpose (env-var-only config, fail loud on missing creds, one client). |
| `scripts/lib/pinterest_publisher.py` | `publish_pinterest_pin()` — the reusable, idempotent function described in §5-6. Never talks to Pinterest directly except through `pinterest_api.py`; fully unit-testable offline via `dry_run=True`. |
| `scripts/publish-pinterest-pin.py` | CLI entry point — the Phase-3 POC runner and the general single-pin publisher. Reads a row straight out of an existing inventory CSV (`data/pinterest_pins.csv` by default, or any board CSV), resolves the image URL via `r2_pinterest.public_url()`, resolves the board by name via the API, publishes, optionally syncs `pin_status`/`published_pin_url` back into the CSV and commits the publish log. |
| `.github/workflows/pinterest-publish-test.yml` | `workflow_dispatch`-only (no `schedule:`) — publish exactly one named pin, dry-run by default. Passed `npm run check:workflows` (0 errors across all 11 workflows, this one included). |
| `data/pinterest_publish_log.jsonl` | **Not created yet** — created on first real run (see §6); append-only, one JSON object per publish attempt (success or failure), no credentials ever written to it. |

---

## 5. Environment / secrets required

Checked existing conventions first (`grep secrets\. .github/workflows/*.yml`
→ only `GITHUB_TOKEN`; `docs/pinterest-r2-migration.md` → `R2_ENDPOINT` /
`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` /
`R2_PUBLIC_BASE_URL`, all `SERVICE_THING` shaped). The task's suggested
names already match that convention, so they're used as-is, plus one more
the OAuth refresh flow needs:

| Secret | Required | Purpose |
|---|---|---|
| `PINTEREST_ACCESS_TOKEN` | **Yes**, for any live call | Bearer token, ~30-day expiry. |
| `PINTEREST_APP_ID` | Only for auto-refresh | OAuth `client_id`. |
| `PINTEREST_APP_SECRET` | Only for auto-refresh | OAuth `client_secret`. **Never commit.** |
| `PINTEREST_REFRESH_TOKEN` | Only for auto-refresh | Lets `pinterest_api.py` mint a new access token in-memory when the stored one expires (still needs the stored *secret* rotated separately afterward — see the module's own docstring for why that's not automated yet). |

All four are read from `os.environ` only, in exactly one place
(`pinterest_api.py`), the same pattern `r2_pinterest.py` already
established — nothing else in the new code touches them directly. **None
were hardcoded anywhere; none exist in this environment**, which is exactly
why Phase 3 below ran in `--dry-run`.

Set these as **GitHub Actions repository secrets** (Settings → Secrets and
variables → Actions) before running the workflow live — never in a workflow
file, never committed.

---

## 6. Reliability, idempotency and duplicate protection

**Idempotency key:** `sha256(source_page + "|" + image_url)` — the page and
the specific image, not the page alone, so a deliberately redesigned pin for
the same page is a new publish, not a blocked duplicate.

**Source of truth vs. mirror — the ordering that makes partial failure
safe:**
1. Call the Pinterest API (`create_pin`) — the one step that's a network
   call to a third party and can't be made atomic.
2. **The instant it returns success**, append one line to the durable,
   append-only `data/pinterest_publish_log.jsonl` — a local disk write,
   effectively never fails.
3. *Only then*, best-effort, mirror the result into the human-facing CSV's
   `pin_status`/`published_pin_url` columns (`sync_inventory_csv()`).

If step 3 fails, nothing is lost — `already_published()` reads the JSONL
log, not the CSV, so the next run still recognizes the pin as published. The
only unclosed gap is a process kill *between* steps 1 and 2 (Pinterest API
today has no client-supplied idempotency key to close that gap from our
side); everything else is covered.

**Durability across CI runs:** a GitHub Actions job starts from a fresh
checkout every time, so the log has to be **committed back**, exactly like
`scripts/tweet_queue.py`'s `.tweet-queue-state.json` — same idiom
(`git add/commit/push`, `[skip ci]`), reused rather than reinvented
(`--commit-log` flag on the CLI, wired on in the workflow's live path).

**Other reliability requirements, and how each is handled:**

| Requirement | Handling |
|---|---|
| API failures (4xx/5xx) | Non-retryable 4xx (bad request, invalid board, etc.) surface immediately as a structured `{"status": "failed", "error": ...}` — no raise, so a caller iterating pins doesn't need try/except per item. |
| Rate limits (429) | Retried with backoff, honoring a `Retry-After` header when Pinterest sends one, else this repo's own established schedule (2s/4s/8s/16s). Persistent 429 → `PinterestRateLimitError`. |
| Expired tokens (401) | One automatic refresh attempt via `PINTEREST_REFRESH_TOKEN`/`PINTEREST_APP_ID`/`PINTEREST_APP_SECRET`, then the original request is retried once. No refresh creds, or refresh itself fails → clear `PinterestAuthError`, not a silent retry loop. |
| Invalid image URL | HEAD-checked (with a real `User-Agent` — see the note below) *before* ever calling Pinterest, so this fails as "Image URL not publicly reachable" instead of an opaque Pinterest 400. Runs even in `--dry-run`, with no Pinterest credentials involved. |
| Missing board | Resolved by name via `GET /boards` before publishing; not found → clear error naming the board, no board is ever auto-created (see §9). |
| Duplicate jobs | Covered above. |
| Partial failures | Covered above (log-before-CSV ordering). |
| 5xx / transient network errors | Same retry/backoff as 429. |

**One real bug this caught during testing:** the sandbox's outbound proxy
(and, separately, this repo's own R2/Cloudflare domain) returns **HTTP 403**
to `urllib`'s default `Python-urllib/3.x` User-Agent while serving the exact
same request fine with a real one. Both `pinterest_api.py` and
`pinterest_publisher.py`'s HEAD check now send an explicit UA
(`UltraTextGenPinterestPublisher/1.0`) for this reason — worth knowing if a
future call mysteriously 403s.

---

## 7. Reporting / analytics — what's available, not yet built

The app also requests Reporting access, so this phase identifies what's
there without building an analytics system yet, per the task's own
instruction.

- **`GET /v5/pins/{pin_id}/analytics`** — per-Pin daily + summary metrics:
  `IMPRESSION`, `SAVE`, `SAVE_RATE`, `PIN_CLICK`, `OUTBOUND_CLICK`, plus
  video metrics where applicable. Wired as `get_pin_analytics()`.
- **`GET /v5/user_account/analytics`** — the same metric vocabulary,
  account-wide. Wired as `get_account_analytics()`.
- **Board-level** analytics exist under the same pattern
  (`/boards/{board_id}/analytics`) but weren't wired into `pinterest_api.py`
  this phase — trivial to add the same way once there's a use for it.
- **Trial-access caveat:** Trial/sandbox Pins are only visible to their
  creator, so their analytics are meaningless test data, not real
  performance — this only becomes useful once the app is on Standard
  access.
- **Feeding UTG's existing content-performance dataset:** every published
  Pin's log entry (`data/pinterest_publish_log.jsonl`) already carries
  `pinId`, `sourcePage` and `destinationUrl` — the natural join key into a
  future analytics pull is `pinId`, keyed back to the UTG page via
  `sourcePage`. **Not built this phase** — the task explicitly asked to
  identify availability, not build the system.

---

## 8. First Pin test plan (Phase 3)

**Chosen POC row** (first eligible row in `data/pinterest_pins.csv`, image
already live on R2 — verified independently with `curl` before writing any
code):

| Field | Value |
|---|---|
| Image (R2, public) | `https://media.ultratextgen.com/pinterest/base/ascii-art-generator.png` |
| Title | "ASCII Art Fonts and Symbols to Copy and Paste" |
| Description | "Copy and paste ASCII Art fonts, symbols and styled text for display names, usernames, bios, posts and chats. Turn any word into big block-letter ASCII art. Create clean Unicode styles in seconds with UltraTextGen — free and no app needed." |
| Board | "Special Characters, Unicode & Keyboard Symbols" |
| Destination | `https://ultratextgen.com/ascii-art-generator/?utm_source=pinterest&utm_medium=social&utm_campaign=organic_pins&utm_content=ascii-art-generator` |

Command:
```sh
# Offline validation, no credentials:
python3 scripts/publish-pinterest-pin.py --slug ascii-art-generator --dry-run

# Live, once PINTEREST_ACCESS_TOKEN is set:
python3 scripts/publish-pinterest-pin.py --slug ascii-art-generator --sync-csv --commit-log
```

---

## 9. Test results

**No `PINTEREST_ACCESS_TOKEN` exists in this environment** (verified: `env |
grep -i pinterest` → empty), and the app's Trial-access sandbox means a live
Pin would only be visible to the UTG account regardless — so, per the task's
own "do not publish large numbers of Pins during testing" / "prefer the
smallest working implementation" instructions, **the POC was run in
`--dry-run`**, which needs zero credentials and validates the entire
pipeline except the actual Pinterest write:

```json
{
  "pinId": null,
  "httpStatus": null,
  "publishedAt": "2026-08-18T15:24:58.958955+00:00",
  "boardId": "<resolved-at-publish-time>",
  "boardName": "Special Characters, Unicode & Keyboard Symbols",
  "utgDestinationUrl": "https://ultratextgen.com/ascii-art-generator/?utm_source=pinterest&utm_medium=social&utm_campaign=organic_pins&utm_content=ascii-art-generator",
  "imageUrl": "https://media.ultratextgen.com/pinterest/base/ascii-art-generator.png",
  "status": "dry-run",
  "error": null
}
```

Also independently verified during this pass:
- The R2 image URL is genuinely public and fetchable (`curl -sI` → `200`,
  `image/png`, matches the HEAD-check the publisher performs).
- Missing-token live path fails with the intended clear message, exit 1 —
  not a stack trace.
- An unknown slug fails clearly, exit 1.
- Duplicate protection: seeded a fake prior "published" log entry with the
  same `(source_page, image_url)` → next call returns
  `"status": "skipped-duplicate"` with the prior `pinId`, without any
  network call; `--force` bypasses it as designed.
- Invalid/nonexistent image URL → `"status": "failed"`, `"error": "Image URL
  not publicly reachable (HEAD status=404)"`, logged, no exception.
- All three new Python files `py_compile` clean; the new workflow passes
  `npm run check:workflows` (11/11 workflows, 0 errors) — per this repo's
  own standing rule that a validator existing is not the same as it being
  wired in and actually checked.

**What was deliberately not run:** an actual `POST /v5/pins` call — no
credentials exist to make one, and per the task's constraints this should
be the user's own deliberate first live call, not something done silently
on their behalf mid-audit.

---

## 10. Pinterest API limitations discovered

- **Two access tiers, not the four implied by "Sandbox versus
  Trial/Standard/Production Limited."** It's Trial (sandbox, default on
  approval) and Standard (production, needs a manual review with an OAuth
  demo video) — see §2.11.
- **Trial-created content is invisible to anyone but the creator.** The
  configured app (Personal API access, Businesses, own Pins/Boards only)
  will land in Trial first — a live "smallest working implementation" test
  will succeed at the API level but won't be publicly visible until
  Pinterest approves the Standard-access upgrade.
- **No client-supplied idempotency key on `POST /pins`.** The log-before-
  mirror ordering in §6 closes every gap except a process kill in the
  literal instant between "Pinterest accepted the pin" and "we wrote one
  line to local disk" — about as small as that gap can be made from this
  side.
- **Character-limit numbers aren't stated as hard values in the
  currently-live-fetchable docs** (the official API-reference pages are a
  JS-rendered SPA that `WebFetch` couldn't get past the nav shell). This
  implementation uses the numbers this repo's own `pinterest_csv.py`
  already sources from Pinterest's bulk-upload help doc (Title ≤ 100,
  Description ≤ 500) rather than guessing — worth re-verifying against the
  interactive API reference directly once Standard access is live and
  there's a reason to push those limits.
- **Automatic secret rotation isn't possible from inside a script.**
  `refresh_access_token()` gets a working token for the *current* run, but
  updating the stored `PINTEREST_ACCESS_TOKEN` GitHub secret needs a
  separate GitHub API call with repo-admin scope — noted as a next-phase
  item, not built now (see below).

---

## 11. Recommended next phase

In order, each gated on the previous actually working:

1. **Get real credentials into GitHub Secrets** and run the workflow live,
   in Trial/sandbox mode, on this exact POC pin. Confirm the Pin actually
   appears (to the UTG account) on Pinterest, and that the committed
   `data/pinterest_publish_log.jsonl` entry matches.
2. **Apply for Standard access** (OAuth-flow demo video + privacy policy,
   per §2.11) once step 1 proves the mechanics work — Trial's 300/day
   `org_write` cap and sandbox-only visibility make it fine for proving the
   pipeline, useless for actually growing Pinterest reach.
3. **Only then, a real queue** — the task explicitly asked not to build
   this yet, so it's a proposal, not code: a `pin_status == "pending"` row
   in the existing inventory CSVs *is* the queue (already 235 rows deep,
   already there, unused). A scheduled workflow (`schedule:`, low
   frequency — e.g. a handful of pins per day, well under the 100/min
   Standard cap or the 300/day Trial cap) would pop a small batch of
   `pending` rows, call `publish_pinterest_pin()` per row, and rely on the
   exact duplicate-protection/commit-log mechanism already built here —
   no new idempotency design needed, just a loop around what exists.
4. **Secret-rotation automation** for the 30-day access-token expiry, once
   there's been at least one real cycle to design it against.
5. **Wire `get_pin_analytics()`/`get_account_analytics()`** into whatever
   this repo's GSC/content-performance pipeline already is, once Standard
   access makes the numbers real rather than sandbox noise (§7).
