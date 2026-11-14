#!/usr/bin/env node
'use strict';

/**
 * check-canonical-intents.js
 *
 * Whole-tree state check of data/canonical_intents.json against the hreflang
 * mesh (language-neutral intent model, adopted 2026-11-14; see
 * docs/architecture/language-neutral-intents.md).
 *
 * It fails when:
 *   - the registry is malformed (ids, scopes, locales, x-default, owners);
 *   - a record's pinned pages are missing or are not hreflang siblings;
 *   - one cluster is pinned by two intents, or one intent spans two clusters
 *     (two unconnected pages for one intent compete with each other);
 *   - a locale-specific intent has gained a sibling in another language, or a
 *     page exists in a language the record lists as inapplicable;
 *   - a cluster with no English member and a locale page in it has no record
 *     (every published page must map to a canonical intent).
 *
 * It is a STATE check, not a delta: the migration left the backlog at zero, so
 * there is nothing to be permanently red against (`.claude/rules/tooling-and-gates.md`).
 *
 * Usage:
 *   node scripts/check-canonical-intents.js                  # report, exit status
 *   node scripts/check-canonical-intents.js --publication-json <path|->
 *       also write the machine-readable publication view: one row per cluster
 *       (registered and legacy) with its intent id, origin, published locales,
 *       URLs, representative page and expected x-default. Other tooling reads
 *       this instead of re-deriving clusters.
 *
 * Exit: 0 clean (warnings allowed) · 1 errors · 2 UNKNOWN (registry missing or
 * unparseable — never read as "nothing to check").
 */

const fs = require('fs');
const path = require('path');
const ic = require('./lib/intent-clusters');
const { LOCALES } = require('./lib/locale-parent-registry');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const pubIdx = args.indexOf('--publication-json');
const pubPath = pubIdx !== -1 ? args[pubIdx + 1] : null;
const rootIdx = args.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(args[rootIdx + 1]) : ROOT;

function main() {
  const model = ic.buildIntentModel(root);
  const problems = ic.validateRegistry(model, LOCALES);
  const unknown = problems.filter((p) => p.level === 'unknown');
  const unregistered = ic.unregisteredClusters(model, new Set(LOCALES));
  for (const u of unregistered) {
    problems.push({
      level: 'error',
      code: 'unregistered-cluster',
      message:
        `${u.localeMembers.map(ic.urlToPath).join(' + ')}: no English member and no canonical intent record. ` +
        'Add a record to data/canonical_intents.json (id, originLocale, pages, scope, scopeBasis, registered). ' +
        'No English page is required.',
    });
  }
  const errors = problems.filter((p) => p.level === 'error');
  const warnings = problems.filter((p) => p.level === 'warning');

  let legacy = 0;
  let registered = 0;
  let registeredNoEn = 0;
  for (const c of model.clusters.values()) {
    if (c.idSource === 'legacy-en') legacy++;
    if (c.idSource === 'registry') {
      registered++;
      if (!c.enUrl) registeredNoEn++;
    }
  }

  console.log('Canonical Intent Registry Check');
  console.log(`  registry:                         ${path.relative(root, model.registry.path)}${model.registry.exists ? '' : ' (MISSING)'}`);
  console.log(`  intent records:                   ${model.registry.intents.length}`);
  console.log(`  hreflang clusters (any language):  ${model.clusters.size}`);
  console.log(`    registered intents:             ${registered} (${registeredNoEn} with no English member)`);
  console.log(`    implicit legacy ids (EN member): ${legacy}`);
  console.log(`    unregistered with a locale page: ${unregistered.length}`);
  console.log(`  errors: ${errors.length} · warnings: ${warnings.length} · unknown: ${unknown.length}`);

  if (pubPath) {
    const rows = [];
    for (const c of [...model.clusters.values()].sort((a, b) => a.key.localeCompare(b.key))) {
      if (c.idSource === 'unregistered' && !c.members.some((u) => !ic.isHomepage(u))) continue;
      rows.push({
        canonical_intent_id: c.intentId,
        id_source: c.idSource,
        origin_locale: c.originLocale,
        primary_page_locale: c.record && c.record.primaryLocale ? c.record.primaryLocale : c.originLocale,
        scope: c.record ? c.record.scope : null,
        published_locales: [...c.byLang.keys()].sort(),
        locale_urls: Object.fromEntries([...c.byLang.entries()].sort().map(([l, us]) => [l, us])),
        representative: c.representative,
        has_english_member: Boolean(c.enUrl),
        x_default: c.expectedXDefault,
        locale_owners: c.record ? c.record.localeOwners || {} : {},
        inapplicable_locales: c.record ? Object.keys(c.record.inapplicableLocales || {}) : [],
      });
    }
    const body = JSON.stringify({ generated_by: 'scripts/check-canonical-intents.js', clusters: rows }, null, 1) + '\n';
    if (pubPath === '-') process.stdout.write(body);
    else fs.writeFileSync(pubPath, body);
    if (pubPath !== '-') console.log(`  publication view: ${pubPath} (${rows.length} clusters)`);
  }

  const show = (list, label) => {
    if (!list.length) return;
    console.log('');
    console.log(label);
    for (const p of list) console.log(`  ${p.level === 'error' ? '✗' : p.level === 'unknown' ? '?' : '·'} [${p.code}] ${p.message}`);
  };
  show(unknown, 'UNKNOWN (the check could not run, so nothing below is a pass):');
  show(errors, 'Errors:');
  show(warnings, 'Warnings (recorded legacy shapes; not failures):');

  if (unknown.length) process.exit(2);
  if (errors.length) process.exit(1);
  console.log('');
  console.log('Every published page maps to a canonical intent; the registry agrees with the hreflang mesh.');
  process.exit(0);
}

main();
