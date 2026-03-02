#!/usr/bin/env python3
"""
tweet_queue.py – Commit-to-Tweet Queue

Reads recent commits from local git history, scores each with deterministic
rules, and posts qualifying candidates (confidence >= 0.72) as comments on a
GitHub Issue titled "Tweet Queue".  De-duplicates by SHA so it is safe to run
repeatedly.  Persists the last-processed SHA in .tweet-queue-state.json and
attempts to commit that file back to the current branch.

Usage:
    python scripts/tweet_queue.py [--commits N]

Environment variables required:
    GITHUB_TOKEN       – personal access token or Actions GITHUB_TOKEN
    GITHUB_REPOSITORY  – "owner/repo"
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CONFIDENCE_THRESHOLD = 0.72
STATE_FILE = ".tweet-queue-state.json"
ISSUE_TITLE = "Tweet Queue"

# File-pattern → (confidence_boost, tag) pairs used by the scorer
HIGH_CONFIDENCE_PATTERNS = [
    # SEO / indexation
    ("sitemap", 0.90),
    ("robots.txt", 0.88),
    # User-facing pages
    ("index.html", 0.88),
    (".html", 0.85),
    # Performance / headers
    ("header", 0.85),
    ("footer", 0.85),
    # Structured data
    ("jsonld", 0.85),
    ("schema", 0.85),
    # Static assets that affect rendering
    ("style.css", 0.80),
    ("styles", 0.80),
    # Content / copy
    ("guide/", 0.80),
    ("usecase/", 0.80),
    ("category/", 0.80),
]

LOW_CONFIDENCE_PATTERNS = [
    "package-lock.json",
    "package.json",
    ".gitignore",
    "README",
    "chore",
    "bump",
    "lint",
    "format",
    "ci:",
    "test",
]

# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------


def run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()


def get_commits(n: int) -> list[dict]:
    """Return the last *n* commits on the current branch as structured dicts."""
    log_fmt = "%H\x1f%an\x1f%aI\x1f%s"
    raw = run(["git", "log", f"-{n}", f"--pretty=format:{log_fmt}"])
    commits = []
    for line in raw.splitlines():
        parts = line.split("\x1f", 3)
        if len(parts) != 4:
            continue
        sha, author, date, subject = parts
        commits.append(
            {"sha": sha, "author": author, "date": date, "subject": subject}
        )
    return commits


def get_diff_stats(sha: str) -> tuple[list[str], int, int]:
    """Return (changed_files, added_lines, removed_lines) for a commit."""
    # For the initial (root) commit there is no parent; use the empty-tree SHA.
    parent = run(["git", "rev-parse", "--verify", f"{sha}^"])
    base = parent if parent else "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    stat_raw = run(["git", "diff", "--numstat", base, sha])
    files: list[str] = []
    added = removed = 0
    for line in stat_raw.splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            try:
                added += int(parts[0])
                removed += int(parts[1])
            except ValueError:
                pass
            files.append(parts[2])
    return files, added, removed


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def compute_confidence(commit: dict, files: list[str], added: int, removed: int) -> float:
    subject: str = commit["subject"].lower()
    total_lines = added + removed

    confidence = 0.60

    if total_lines < 5:
        confidence -= 0.20

    for pat in LOW_CONFIDENCE_PATTERNS:
        if pat in subject:
            confidence -= 0.15
            break

    best_boost: float = 0.0
    for f in files:
        f_lower = f.lower()
        for pat, boost in HIGH_CONFIDENCE_PATTERNS:
            if pat in f_lower:
                if boost > best_boost:
                    best_boost = boost
                break

    if best_boost:
        confidence = best_boost
        if total_lines < 5:
            confidence -= 0.15
        elif total_lines < 20:
            confidence -= 0.05

    for kw in ("add", "new", "feat", "feature", "introduc", "creat"):
        if kw in subject:
            confidence += 0.05
            break

    # STRONG boost if author explicitly included [tweet]
    if "[tweet]" in subject:
        confidence = max(confidence, 0.90)

    return round(min(max(confidence, 0.0), 1.0), 4)

def build_tweet_pack(commit: dict, files: list[str], added: int, removed: int, confidence: float, repo: str) -> dict:
    sha = commit["sha"]
    short_sha = sha[:7]
    subject = commit["subject"]
    author = commit["author"]
    date = commit["date"]
    commit_url = f"https://github.com/{repo}/commit/{sha}"

    # Craft tweet text (≤ 280 chars)
    tweet = f"🚀 {subject} [{short_sha}] — {author}. Check it out: {commit_url}"
    if len(tweet) > 280:
        budget = 280 - len(f" [{short_sha}] — {author}. Check it out: {commit_url}")
        tweet = f"🚀 {subject[:budget].rstrip()} [{short_sha}] — {author}. Check it out: {commit_url}"

    # Insight based on diff shape
    if added > removed * 2:
        insight = f"Significant new content added (+{added}/−{removed} lines across {len(files)} file(s))."
    elif removed > added * 2:
        insight = f"Major cleanup: reduced codebase by {removed - added} net lines."
    elif files:
        top = files[0]
        insight = f"Key change in {top} (+{added}/−{removed} lines)."
    else:
        insight = f"Code updated (+{added}/−{removed} lines)."

    # Business implication based on files touched
    if any("sitemap" in f.lower() or "robots" in f.lower() for f in files):
        biz = "Improves site discoverability and SEO reach."
    elif any(".html" in f.lower() for f in files):
        biz = "Enhances user-facing pages; may improve engagement."
    elif any("style" in f.lower() or "css" in f.lower() for f in files):
        biz = "Visual improvement that can lift user experience."
    elif any("guide" in f.lower() or "usecase" in f.lower() or "category" in f.lower() for f in files):
        biz = "More content drives organic traffic and retention."
    else:
        biz = "Keeps the product up-to-date and reliable."

    return {
        "sha": sha,
        "commit_url": commit_url,
        "tweet": tweet,
        "insight": insight,
        "business_implication": biz,
        "confidence": confidence,
        "author": author,
        "date": date,
    }


# ---------------------------------------------------------------------------
# GitHub API helpers (stdlib only)
# ---------------------------------------------------------------------------


def gh_request(method: str, path: str, token: str, body=None):
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        print(f"GitHub API error {exc.code} on {method} {url}: {exc.read().decode()}", file=sys.stderr)
        raise


def find_or_create_issue(token: str, repo: str) -> int:
    """Return the issue number for the Tweet Queue issue, creating it if needed."""
    # Search open issues
    issues = gh_request("GET", f"/repos/{repo}/issues?state=open&per_page=100", token)
    for issue in issues:
        if issue.get("title") == ISSUE_TITLE:
            return issue["number"]
    # Also check closed issues
    issues_closed = gh_request("GET", f"/repos/{repo}/issues?state=closed&per_page=100", token)
    for issue in issues_closed:
        if issue.get("title") == ISSUE_TITLE:
            return issue["number"]
    # Create the issue
    created = gh_request(
        "POST",
        f"/repos/{repo}/issues",
        token,
        {"title": ISSUE_TITLE, "body": "Automated tweet candidates generated from recent commits."},
    )
    print(f"Created issue #{created['number']}: {ISSUE_TITLE}")
    return created["number"]


def get_existing_shas(token: str, repo: str, issue_number: int) -> set[str]:
    """Collect all commit SHAs already mentioned in issue comments."""
    shas: set[str] = set()
    page = 1
    while True:
        comments = gh_request(
            "GET",
            f"/repos/{repo}/issues/{issue_number}/comments?per_page=100&page={page}",
            token,
        )
        if not comments:
            break
        for c in comments:
            body = c.get("body", "")
            # Each comment embeds the SHA in a line like "**SHA:** `<sha>`"
            for line in body.splitlines():
                if "**SHA:**" in line:
                    parts = line.split("`")
                    if len(parts) >= 2:
                        shas.add(parts[1].strip())
        if len(comments) < 100:
            break
        page += 1
    return shas


def post_comment(token: str, repo: str, issue_number: int, pack: dict):
    body = (
        f"### 🐦 Tweet Candidate\n\n"
        f"**SHA:** `{pack['sha']}`\n"
        f"**Commit:** [{pack['sha'][:7]}]({pack['commit_url']})\n"
        f"**Author:** {pack['author']}\n"
        f"**Date:** {pack['date']}\n"
        f"**Confidence:** {pack['confidence']}\n\n"
        f"---\n\n"
        f"**Tweet:**\n> {pack['tweet']}\n\n"
        f"**Insight:** {pack['insight']}\n\n"
        f"**Business Implication:** {pack['business_implication']}\n"
    )
    gh_request("POST", f"/repos/{repo}/issues/{issue_number}/comments", token, {"body": body})
    print(f"  ✔ Queued tweet for {pack['sha'][:7]}: {pack['tweet'][:60]}…")


# ---------------------------------------------------------------------------
# State file
# ---------------------------------------------------------------------------


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_state(last_sha: str):
    state = {
        "last_processed_sha": last_sha,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
    # Attempt to commit & push back
    try:
        run(["git", "config", "user.name", "github-actions[bot]"])
        run(["git", "config", "user.email", "github-actions[bot]@users.noreply.github.com"])
        subprocess.run(["git", "add", STATE_FILE], check=True, capture_output=True)
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            capture_output=True,
        )
        if result.returncode != 0:
            subprocess.run(
                ["git", "commit", "-m", "chore: update tweet-queue state [skip ci]"],
                check=True,
                capture_output=True,
            )
            subprocess.run(["git", "push"], check=True, capture_output=True)
            print(f"State file committed and pushed (last_sha={last_sha[:7]})")
    except subprocess.CalledProcessError as exc:
        print(f"Warning: could not push state file: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Commit-to-Tweet Queue")
    parser.add_argument("--commits", type=int, default=20, help="Number of recent commits to inspect")
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")

    if not token or not repo:
        print("Error: GITHUB_TOKEN and GITHUB_REPOSITORY must be set.", file=sys.stderr)
        sys.exit(1)

    commits = get_commits(args.commits)
    if not commits:
        print("No commits found.")
        return

    issue_number = find_or_create_issue(token, repo)
    existing_shas = get_existing_shas(token, repo, issue_number)
    print(f"Issue #{issue_number} has {len(existing_shas)} previously queued SHA(s).")

    # State-based de-dup (secondary layer)
    state = load_state()
    last_processed = state.get("last_processed_sha", "")

    queued = 0
    last_sha_processed = commits[0]["sha"] if commits else ""
    new_sha_queued: str | None = None

    for commit in commits:
        sha = commit["sha"]
        if sha in existing_shas:
            print(f"  – Skipping {sha[:7]} (already in queue).")
            continue

        files, added, removed = get_diff_stats(sha)
        confidence = compute_confidence(commit, files, added, removed)
        print(f"  · {sha[:7]} confidence={confidence:.2f} subject={commit['subject'][:50]}")

        if confidence < CONFIDENCE_THRESHOLD:
            print(f"    ↳ Below threshold ({CONFIDENCE_THRESHOLD}), skipping.")
            continue

        pack = build_tweet_pack(commit, files, added, removed, confidence, repo)
        post_comment(token, repo, issue_number, pack)
        if new_sha_queued is None:
            new_sha_queued = sha
        queued += 1

    print(f"\nDone. Queued {queued} new tweet candidate(s).")
    save_state(new_sha_queued or last_sha_processed)


if __name__ == "__main__":
    main()
