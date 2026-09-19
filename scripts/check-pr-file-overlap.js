#!/usr/bin/env node
/**
 * Who else is touching these files right now?
 *
 * The failure this exists for
 * ---------------------------
 * Git's conflict detection is textual and per-hunk, so two sessions can edit
 * the same module in the same week and merge without a conflict — and nothing
 * anywhere asks the question. Two recorded cases in this repository:
 *
 *   * `js/share/share-core.js` — the fire-on-success fix and a
 *     `share_destination` branch were written on 2026-09-13 by two sessions, in
 *     the same file, on the same day. One merged; the other was still carrying
 *     a redundant copy of the refactor six days later. CLAUDE.md records it:
 *     "git merged nothing cleanly and nothing flagged it."
 *   * The peer-link and hub-coverage passes have repeatedly rediscovered each
 *     other's work for the same reason.
 *
 * What it does
 * ------------
 * Takes the files this PR changes and asks GitHub which OTHER pull requests —
 * open now, or merged inside a recent window — touch any of the same ones. It
 * then prints the overlap. That is all: no judgement, no blocking, no registry.
 *
 * Two design rules, both non-negotiable
 * -------------------------------------
 * **1. It never gates.** An overlap is a coordination signal, not a defect.
 * Two sessions legitimately touch `style.css` most weeks, and a check that
 * fails a PR for that is a check people learn to ignore — the failure mode this
 * repository documents against its own gates more than any other. It prints to
 * the job summary, where the author reads it.
 *
 * **2. It fails closed in what it SAYS, even though it never fails the build.**
 * No token, a rate limit, an API error: it reports UNKNOWN and says so, and
 * never prints "no overlaps". *A check that reports nothing is
 * indistinguishable from a check that passes* is this repository's most
 * repeated failure, and an informational check is not exempt from it — an
 * author who reads "no overlaps" from a check that never ran is worse off than
 * one who reads nothing at all.
 *
 * Usage:
 *   node scripts/check-pr-file-overlap.js --base origin/main
 *   node scripts/check-pr-file-overlap.js --base origin/main --days 21 --json
 *   GITHUB_TOKEN=... node scripts/check-pr-file-overlap.js --pr 902
 *
 * `--pulls-json <file>` supplies the pull list instead of calling the API:
 * `[{number, title, state, branch, at, files:[...]}, ...]`. It exists for the
 * same reason `scripts/weekly_pr_digest.py` reads PRs from stdin — so the
 * comparison is testable against a real fixture, and so a caller that has PR
 * data by some other route is not forced through an API this environment may
 * not reach.
 */
'use strict';

const { execFileSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || 'ychowdhrey/ultratextgen';
const API = process.env.GITHUB_API_URL || 'https://api.github.com';

/** Files so widely shared that naming them in every overlap is noise. */
const UBIQUITOUS = new Set([
  'sitemap.xml',
  'data/sitemap-lastmod-cache.json',
  'package-lock.json',
]);

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    return null;
  }
}

function changedFiles(base) {
  // Two-dot against the merge base. A missing merge base means a shallow clone
  // that cannot answer, and returning "no files" there would silently report
  // every PR as overlapping nothing.
  const mergeBase = git(['merge-base', base, 'HEAD']);
  if (!mergeBase || !mergeBase.trim()) return null;
  const out = git(['diff', '--name-only', mergeBase.trim(), 'HEAD']);
  if (out === null) return null;
  return out.split('\n').map((f) => f.trim()).filter(Boolean);
}

async function api(path) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'utg-overlap-check' };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText} on ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function filesOf(number) {
  const out = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await api(`/repos/${REPO}/pulls/${number}/files?per_page=100&page=${page}`);
    out.push(...batch.map((f) => f.filename));
    if (batch.length < 100) break;
  }
  return out;
}

async function candidatePulls(self, days) {
  const cutoff = Date.now() - days * 86400000;
  const seen = new Map();
  for (const state of ['open', 'closed']) {
    for (let page = 1; page <= 3; page += 1) {
      const batch = await api(
        `/repos/${REPO}/pulls?state=${state}&sort=updated&direction=desc&per_page=100&page=${page}`
      );
      let stale = false;
      for (const pull of batch) {
        if (pull.number === self) continue;
        const when = Date.parse(pull.updated_at || pull.created_at || 0);
        if (Number.isFinite(when) && when < cutoff) { stale = true; continue; }
        if (state === 'closed' && !pull.merged_at) continue;
        seen.set(pull.number, {
          number: pull.number,
          title: pull.title,
          state: pull.merged_at ? 'merged' : pull.state,
          branch: pull.head && pull.head.ref,
          at: pull.merged_at || pull.updated_at,
        });
      }
      if (batch.length < 100 || stale) break;
    }
  }
  return [...seen.values()];
}

function unknown(reason, asJson) {
  if (asJson) {
    console.log(JSON.stringify({ state: 'UNKNOWN', reason }, null, 2));
  } else {
    console.log('PR file-overlap check');
    console.log('  state : UNKNOWN');
    console.log(`  reason: ${reason}`);
    console.log('');
    console.log('This is NOT "no overlaps". Nothing was compared.');
  }
  // Informational by design — it never fails the build, including here. The
  // honesty lives in what it prints, not in an exit code nobody reads.
  return 0;
}

async function main() {
  const asJson = process.argv.includes('--json');
  const base = arg('--base', process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main');
  const days = Number(arg('--days', '14'));
  const self = Number(arg('--pr', process.env.PR_NUMBER || '0')) || null;

  const mine = changedFiles(base);
  if (mine === null) {
    return unknown(`cannot diff against ${base} — no merge base resolves, which is what a `
      + 'shallow checkout looks like. Fetch more history (fetch-depth: 0) and re-run.', asJson);
  }
  if (!mine.length) {
    if (asJson) console.log(JSON.stringify({ state: 'ok', files: 0, overlaps: [] }, null, 2));
    else console.log('PR file-overlap check\n  this branch changes no files against ' + base);
    return 0;
  }

  const mineSet = new Set(mine.filter((f) => !UBIQUITOUS.has(f)));
  const fixture = arg('--pulls-json', null);
  let pulls;
  let supplied = null;
  if (fixture) {
    try {
      supplied = JSON.parse(require('fs').readFileSync(fixture, 'utf8'));
    } catch (err) {
      return unknown(`cannot read ${fixture} (${err.message})`, asJson);
    }
    if (!Array.isArray(supplied)) return unknown(`${fixture} is not an array`, asJson);
    pulls = supplied.filter((p) => p.number !== self);
  } else {
  try {
    pulls = await candidatePulls(self, days);
  } catch (err) {
    return unknown(`GitHub API unavailable (${err.message}). `
      + (process.env.GITHUB_TOKEN || process.env.GH_TOKEN
        ? 'Retry, or widen the token\'s scope.'
        : 'No GITHUB_TOKEN in the environment, so the request was unauthenticated.'), asJson);
  }
  }

  const overlaps = [];
  let unreadable = 0;
  for (const pull of pulls) {
    let files;
    if (Array.isArray(pull.files)) {
      files = pull.files;
    } else {
      try {
        files = await filesOf(pull.number);
      } catch (err) {
        unreadable += 1;
        continue;
      }
    }
    const shared = files.filter((f) => mineSet.has(f));
    if (shared.length) overlaps.push({ ...pull, shared });
  }
  overlaps.sort((a, b) => b.shared.length - a.shared.length);

  if (asJson) {
    console.log(JSON.stringify(
      { state: unreadable ? 'partial' : 'ok', files: mineSet.size, compared: pulls.length,
        unreadable, overlaps }, null, 2));
    return 0;
  }

  console.log('PR file-overlap check');
  console.log(`  this branch : ${mineSet.size} file(s) against ${base}`);
  console.log(`  compared to : ${pulls.length} PR(s) open or merged in the last ${days} days`);
  if (unreadable) {
    console.log(`  UNREADABLE  : ${unreadable} PR(s) could not be fetched — those were NOT`);
    console.log('                compared, and are not evidence of no overlap.');
  }
  console.log('');
  if (!overlaps.length) {
    console.log('No other PR in the window touches these files.');
    return 0;
  }
  console.log(`${overlaps.length} PR(s) touch the same files:\n`);
  for (const pull of overlaps) {
    console.log(`  #${pull.number} [${pull.state}] ${pull.title}`);
    console.log(`      ${pull.shared.length} shared file(s): ${pull.shared.slice(0, 6).join(', ')}`
      + (pull.shared.length > 6 ? ` … +${pull.shared.length - 6}` : ''));
  }
  console.log('');
  console.log('This is information, not a defect — two branches touching one file is normal.');
  console.log('Read the overlapping change before assuming your edit is the only one, and');
  console.log('especially before rewriting a function a merged PR just rewrote.');
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  // Even an unexpected throw must not print silence that reads as success.
  console.log('PR file-overlap check\n  state : UNKNOWN\n  reason: ' + err.message);
  process.exit(0);
});
