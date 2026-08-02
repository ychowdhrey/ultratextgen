#!/usr/bin/env node
'use strict';

/**
 * check-translation-parity.js
 *
 * Per-PR gate: for every HTML file changed in this branch, if the page is
 * part of an EN <-> locale hreflang cluster AND its structural content
 * fingerprint actually changed (a link/FAQ/section/symbol-tile added or
 * removed — not just a wording tweak), require that at least one sibling in
 * the same cluster (the EN parent, if a locale page changed; any locale
 * child, if the EN parent changed) was ALSO touched in this branch.
 *
 * This is the enforcement half of scripts/audit-translation-parity.js: the
 * audit finds existing drift across the whole site; this stops NEW drift
 * from being introduced, going both directions (EN -> locale and locale ->
 * EN), per CLAUDE.md's "Translation Parity" section.
 *
 * A flagged pair is not necessarily wrong — EN and a locale page are
 * allowed to diverge when there's an explicit, agreed reason. Record that
 * reason in data/translation_parity_exceptions.json (see its own comment
 * for the entry shape) rather than silencing this check by leaving the
 * sibling stale.
 *
 * Usage:
 *   node scripts/check-translation-parity.js                 # diff against origin/main
 *   node scripts/check-translation-parity.js --base main      # diff against a different ref
 *
 * Exit code 0 = clean (or nothing to check), 1 = unresolved drift found.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { discoverClusters, normalizeUrl } = require('./lib/translation-clusters');

const SITE = 'https://ultratextgen.com';
const { createFingerprinter } = require('./lib/content-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const EXCEPTIONS_PATH = path.join(ROOT, 'data', 'translation_parity_exceptions.json');

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const requestedBase = baseIdx !== -1 ? args[baseIdx + 1] : 'origin/main';

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', base], { stdio: 'ignore' });
    return base;
  } catch {
    // Shallow CI checkouts often don't have the base branch locally at all.
    const branch = base.replace(/^origin\//, '');
    try {
      git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
      const candidate = `origin/${branch}`;
      git(['rev-parse', '--verify', candidate], { stdio: 'ignore' });
      return candidate;
    } catch (e) {
      console.error(`Could not resolve or fetch base ref "${base}": ${e.message}`);
      process.exit(2);
    }
  }
  return base;
}

const base = resolveBase(requestedBase);

let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  console.error(`Could not compute merge-base of ${base} and HEAD: ${e.message}`);
  process.exit(2);
}

const changedFiles = git(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}`, 'HEAD', '--', '*.html'])
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

if (changedFiles.length === 0) {
  console.log('Translation Parity Check: no changed HTML files — nothing to check.');
  process.exit(0);
}

function oldContent(rel) {
  try {
    return git(['show', `${mergeBase}:${rel}`]);
  } catch {
    return null; // new file — no "before" to diff against
  }
}

// ─── Current site state (HEAD / working tree) ──────────────────────────────

const { byUrl, clusters, localeCodes } = discoverClusters(ROOT);
const { fingerprint, diff, score } = createFingerprinter(byUrl, localeCodes);

const changedSet = new Set(changedFiles);

// enUrl -> Set of member urls, for quick "which cluster is this page in" lookups
const clusterOf = new Map(); // canonical url -> en anchor url
for (const [enUrl, members] of clusters) {
  for (const m of members) clusterOf.set(m, enUrl);
}

// ─── Exceptions ledger ──────────────────────────────────────────────────

let exceptions = [];
if (fs.existsSync(EXCEPTIONS_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, 'utf8'));
    exceptions = Array.isArray(parsed) ? parsed : parsed.exceptions || [];
  } catch (e) {
    console.error(`WARNING: could not parse ${path.relative(ROOT, EXCEPTIONS_PATH)}: ${e.message}`);
  }
}

function hasException(enUrl, localeUrl) {
  return exceptions.some((ex) => ex.enUrl === enUrl && ex.localeUrl === localeUrl);
}

/**
 * Does every one of these link targets lack a translation in `lang`?
 *
 * Link paths arrive already normalized to their EN-canonical, locale-stripped
 * identity by the fingerprinter (e.g. "/library/vrchat-symbols/"). A target is
 * "reachable" for a locale when the EN page declares an hreflang alternate in
 * that language — i.e. a native equivalent exists and the sibling could link it.
 *
 * Conservative by design: if the target can't be resolved to a known page at
 * all, it counts as reachable, so an unknown link never silently suppresses a
 * flag. Returns false for an empty list for the same reason.
 */
function linksUnreachableFor(linkPaths, lang) {
  if (!lang || lang === 'en') return false;
  if (!linkPaths.length) return false;
  return linkPaths.every((p) => {
    const targetRec = byUrl.get(normalizeUrl(`${SITE}${p}`));
    if (!targetRec) return false; // unknown target — assume reachable, stay strict
    return !targetRec.alternates.some((a) => a.hreflang === lang);
  });
}

// ─── Check every changed page that belongs to a cluster ────────────────────

const flagged = []; // { enUrl, localeUrl, changedRel, unsyncedSiblingRels: [] }
const checkedPairs = new Set(); // dedupe: "enUrl|localeUrl"

for (const rel of changedFiles) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue; // deleted file
  const newHtml = fs.readFileSync(filePath, 'utf8');

  const rec = [...byUrl.values()].find((r) => r.rel === rel);
  if (!rec) continue; // not part of any hreflang-bearing page at all

  const enAnchor = clusterOf.get(rec.canonical);
  if (!enAnchor) continue; // no cluster info — not this check's job (see audit-hreflang.js)

  const before = oldContent(rel);
  // Pass relPath so a pillar catalogue index is fingerprinted without its
  // inventory link set — adding a new EN page to library/index.html is not
  // translation drift, it is that locale not having the page yet. Sections,
  // FAQs and tiles on the same page are still compared. See
  // content-fingerprint.js and data/parity_catalogue_pages.json.
  const fpOpts = { relPath: rel };
  const structuralDiff = before === null ? null : diff(fingerprint(before, fpOpts), fingerprint(newHtml, fpOpts));
  const changedFingerprint = structuralDiff === null || score(structuralDiff) > 0;
  if (!changedFingerprint) continue; // byte-level edit only (typo, meta tweak) — nothing structural moved

  // Was the ONLY structural change the addition of outbound links? If so, the
  // question of whether a sibling must be touched depends on that sibling's
  // locale — see linksUnreachableFor() below. Anything else that moved (a
  // section, an FAQ, symbol tiles, or a removed link) is translatable content
  // and always requires the sibling to be synced or excepted.
  const addedLinks = structuralDiff ? structuralDiff.onlyInLocale : [];
  const onlyAddedLinks =
    structuralDiff !== null &&
    addedLinks.length > 0 &&
    structuralDiff.onlyInEN.length === 0 &&
    structuralDiff.h2Delta === 0 &&
    structuralDiff.faqDelta === 0 &&
    structuralDiff.symbolTilesDelta === 0;

  const members = [...clusters.get(enAnchor)].filter((u) => u !== rec.canonical);
  for (const siblingUrl of members) {
    const siblingRec = byUrl.get(siblingUrl);
    if (!siblingRec) continue; // headless/broken — audit-hreflang.js's job

    const enUrl = rec.canonical === enAnchor ? rec.canonical : enAnchor;
    const localeUrl = rec.canonical === enAnchor ? siblingUrl : rec.canonical;
    const pairKey = `${enUrl}|${localeUrl}`;
    if (checkedPairs.has(pairKey)) continue;
    checkedPairs.add(pairKey);

    if (hasException(enUrl, localeUrl)) continue;

    // Look up each side's file path from its OWN url record — not from
    // whichever cluster member happened to be first in iteration order.
    // (Bug fixed 2026-07-24: this used to fall back to `rec`/`siblingRec`
    // positionally, which only resolved to the real EN file when the EN
    // entry happened to be the first member visited for a given `rec`;
    // for any other iteration order it silently compared against the
    // wrong locale's path and could pass a pair that was never actually
    // checked. See the library/special-characters (en/ar/ja/ko/ru/th)
    // cluster for the case that surfaced it.)
    const enRec = byUrl.get(enUrl);
    const localeRec = byUrl.get(localeUrl);
    if (!enRec || !localeRec) continue; // headless/broken — audit-hreflang.js's job
    const enRel = enRec.rel;
    const localeRel = localeRec.rel;

    if (changedSet.has(enRel) && changedSet.has(localeRel)) continue; // both sides touched — presumed synced

    // EN is the source locale: a new EN page gets linked from existing EN
    // pages long before (or instead of) being translated. When the only thing
    // that moved is links whose targets have NO counterpart in this sibling's
    // language, there is nothing the sibling could legitimately do — linking
    // the English page from a locale page is exactly what CLAUDE.md's
    // "Locale-native internal linking" rule forbids. Flagging it would force
    // either a wrong link or a per-page exception on essentially every new EN
    // page, so the pair is skipped. The moment a translation of the target
    // exists, this stops applying and the sibling is flagged again — which is
    // the correct trigger, because now it CAN link its native equivalent.
    if (onlyAddedLinks && linksUnreachableFor(addedLinks, localeRec.ownLang)) continue;

    flagged.push({ enUrl, localeUrl, enRel, localeRel, changedRel: rel });
  }
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('Translation Parity Check');
console.log(`  base:                    ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.log(`  changed HTML files:      ${changedFiles.length}`);
console.log(`  pairs with unsynced content change: ${flagged.length}`);
console.log('');

if (flagged.length) {
  for (const f of flagged) {
    console.log(`✗ ${f.changedRel} changed content, but its translation sibling was not updated in this branch:`);
    console.log(`    EN:     ${f.enRel}`);
    console.log(`    locale: ${f.localeRel}`);
    console.log(
      `    Fix: update the sibling in this PR, or add an entry to data/translation_parity_exceptions.json` +
        ` documenting why they're allowed to diverge (see CLAUDE.md, "Translation Parity").`
    );
    console.log('');
  }
  process.exit(1);
} else {
  console.log('No unresolved translation-parity drift introduced by this branch.');
  process.exit(0);
}
