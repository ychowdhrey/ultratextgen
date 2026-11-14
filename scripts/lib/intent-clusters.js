'use strict';

/**
 * intent-clusters.js
 *
 * The language-neutral view of the site's hreflang clusters (adopted
 * 2026-11-14, owner-directed). Read `docs/architecture/language-neutral-intents.md`
 * for the model; this file is its one implementation, shared by every gate,
 * fixer and generator that needs to know which pages are language variants of
 * one canonical intent, so they can never disagree about it.
 *
 * WHY THIS EXISTS
 * ---------------
 * translation-clusters.js keys every cluster on its English member: a page's
 * cluster is whatever its own hreflang="en" points at. A cluster with no
 * English member (a Korean-first page, or a Korean + French pair) was therefore
 * not a cluster at all to any tool that reads it. That was correct while every
 * non-English page needed an English parent. It stopped being the rule on
 * 2026-11-14: a page may now originate in any qualified language.
 *
 * THE MODEL, IN FOUR RULES
 * ------------------------
 *  1. Membership. A page that declares a real English alternate joins that
 *     English page's cluster, exactly as before (so every English-first cluster
 *     resolves byte-for-byte as it did). A page with no real English alternate
 *     joins the pages its own alternates name. A subpage naming the bare
 *     homepage as its "English version" is the old local-only placeholder, not
 *     a sibling claim, and never makes a membership edge.
 *  2. Identity. A cluster's canonical intent id comes from
 *     data/canonical_intents.json when any member is pinned there; otherwise,
 *     for a cluster with an English member, it is the implicit legacy id
 *     `legacy:<english path>` (under the old rule the English page was always
 *     the origin, and its URL is preserved, so the id is stable). A cluster with
 *     neither is `unregistered` - a new page in one fails the gate.
 *     The id never changes when a language is added or the primary page moves.
 *  3. Representative. Where a tool needs one URL (a reference page for tile
 *     parity, the page a locale translation is compared against), it is the
 *     record's primaryLocale member, else its originLocale member, else the
 *     English member, else the first member. Never "the English page" by
 *     assumption.
 *  4. x-default. The record's declared xDefault wins ('none', 'site-root' or a
 *     member URL). Otherwise the registry policy's fallback order picks the
 *     first member in a listed language (English today, because it is the
 *     broadest fallback for an unmatched visitor). Otherwise there is no
 *     x-default. It never defaults to the origin page.
 *
 * Nothing here writes a file.
 */

const fs = require('fs');
const path = require('path');
const { discoverClusters, normalizeUrl } = require('./translation-clusters');

const SITE_ORIGIN = 'https://ultratextgen.com';
const SITE_ROOT_URL = `${SITE_ORIGIN}/`;
const REGISTRY_REL = 'data/canonical_intents.json';
const SCOPES = ['cross-language', 'locale-specific', 'pending-review'];
const X_DEFAULT_KEYWORDS = ['none', 'site-root'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
const DEFAULT_POLICY = { xDefaultFallbackOrder: ['en'] };

function isHomepage(url) {
  return /^https:\/\/ultratextgen\.com\/([a-z]{2}(-[a-z]+)?\/)?$/.test(url || '');
}

/** "https://ultratextgen.com/ko/library/x/" -> "ko/library/x" */
function urlToPath(url) {
  return String(url || '')
    .replace(/^https?:\/\/ultratextgen\.com\/?/, '')
    .replace(/\/+$/, '');
}

/** "https://ultratextgen.com/ko/library/x/" -> "ko/library/x/index.html" */
function urlToRel(url) {
  const p = urlToPath(url);
  return p ? `${p}/index.html` : 'index.html';
}

function lc(code) {
  return String(code || '').toLowerCase();
}

/**
 * Read data/canonical_intents.json.
 * @returns {{path, exists, error, data, policy, intents}}
 *   exists=false means the file is absent; error is set when it cannot be
 *   parsed. Callers decide what an absent registry means - a gate must treat
 *   it as UNKNOWN, never as "nothing to check".
 */
function loadIntentRegistry(root, registryPath) {
  const p = registryPath || path.join(root, REGISTRY_REL);
  if (!fs.existsSync(p)) return { path: p, exists: false, error: null, data: null, policy: DEFAULT_POLICY, intents: [] };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const intents = Array.isArray(data.intents) ? data.intents : [];
    const policy = Object.assign({}, DEFAULT_POLICY, data.policy || {});
    return { path: p, exists: true, error: null, data, policy, intents };
  } catch (e) {
    return { path: p, exists: true, error: e.message, data: null, policy: DEFAULT_POLICY, intents: [] };
  }
}

// ─── union-find ──────────────────────────────────────────────────────────────

function makeUnionFind() {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r);
    while (parent.get(x) !== r) {
      const n = parent.get(x);
      parent.set(x, r);
      x = n;
    }
    return r;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  return { find, union };
}

/** The English page a record really claims, or null (placeholder / none / unknown target). */
function realEnglishClaim(rec, byUrl) {
  if (lc(rec.ownLang) === 'en') return rec.canonical;
  const enAlt = rec.alternates.find((a) => lc(a.hreflang) === 'en');
  if (!enAlt) return null;
  if (!byUrl.has(enAlt.href)) return null;
  if (isHomepage(enAlt.href) && !isHomepage(rec.canonical)) return null; // local-only placeholder
  return enAlt.href;
}

/**
 * Build the language-neutral cluster model.
 *
 * @param {string} root
 * @param {object} [opts]
 * @param {object} [opts.discovered] - a discoverClusters() result to reuse
 * @param {object} [opts.registry]   - a loadIntentRegistry() result to reuse
 * @returns {{
 *   byUrl, legacyClusters, registry, clusters: Map<string, Cluster>,
 *   clusterOfUrl: Map<string, string>, problems: Array<{level, code, message, intentId?, url?}>,
 *   laneMap: Map<string, string>
 * }}
 */
function buildIntentModel(root, opts = {}) {
  const discovered = opts.discovered || discoverClusters(root);
  const registry = opts.registry || loadIntentRegistry(root);
  const { byUrl } = discovered;
  const problems = [];

  // 1. Membership.
  const uf = makeUnionFind();
  const anchored = new Set();
  const enOfRoot = new Map(); // component root -> its English member
  for (const [url, rec] of byUrl) {
    uf.find(url);
    const en = realEnglishClaim(rec, byUrl);
    if (en) {
      anchored.add(url);
      uf.union(en, url);
      enOfRoot.set(uf.find(en), en);
    }
  }
  for (const [url, rec] of byUrl) {
    if (anchored.has(url)) continue;
    for (const alt of rec.alternates) {
      if (lc(alt.hreflang) === 'x-default') continue;
      if (alt.href === url) continue;
      if (!byUrl.has(alt.href)) continue;
      if (isHomepage(alt.href) && !isHomepage(url)) continue;
      const ra = uf.find(url);
      const rb = uf.find(alt.href);
      if (ra === rb) continue;
      const ea = enOfRoot.get(ra);
      const eb = enOfRoot.get(rb);
      if (ea && eb && ea !== eb) {
        // A page with no English member of its own naming pages from two
        // different English clusters would merge two intents into one. Never
        // merge; report it (it is a cross-cluster edge).
        problems.push({ level: 'error', code: 'bridges-english-clusters', url,
          message: `${urlToPath(url)} names ${urlToPath(alt.href)}, whose cluster has a different English member (${urlToPath(eb)} vs ${urlToPath(ea)}); not merged` });
        continue;
      }
      uf.union(url, alt.href);
      const root = uf.find(url);
      if (ea || eb) enOfRoot.set(root, ea || eb);
    }
  }
  const components = new Map();
  for (const url of byUrl.keys()) {
    const r = uf.find(url);
    if (!components.has(r)) components.set(r, []);
    components.get(r).push(url);
  }

  // 2. Registry pins.
  const recordOfPinnedUrl = new Map();
  for (const rec of registry.intents) {
    for (const raw of rec.pages || []) {
      const u = normalizeUrl(raw);
      if (recordOfPinnedUrl.has(u) && recordOfPinnedUrl.get(u) !== rec) {
        problems.push({ level: 'error', code: 'page-pinned-twice', url: u, intentId: rec.id,
          message: `${u} is pinned by two intents (${recordOfPinnedUrl.get(u).id}, ${rec.id})` });
        continue;
      }
      recordOfPinnedUrl.set(u, rec);
    }
  }

  const clusters = new Map();
  const clusterOfUrl = new Map();
  for (const memberList of components.values()) {
    const members = memberList.slice().sort();
    const byLang = new Map();
    for (const u of members) {
      const r = byUrl.get(u);
      const lang = lc(r.ownLang) || null;
      if (!lang) continue;
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang).push(u);
    }
    const enMembers = byLang.get('en') || [];
    const enUrl = enMembers.length ? enMembers[0] : null;

    const records = [...new Set(members.map((u) => recordOfPinnedUrl.get(u)).filter(Boolean))];
    let record = null;
    let key;
    let idSource;
    if (records.length > 1) {
      problems.push({ level: 'error', code: 'cluster-claimed-twice', url: members[0],
        message: `one hreflang cluster (${members.map(urlToPath).join(', ')}) is pinned by ${records.length} intents: ${records.map((r) => r.id).join(', ')}` });
      record = records[0];
    } else if (records.length === 1) {
      record = records[0];
    }
    if (record) {
      key = record.id;
      idSource = 'registry';
    } else if (enUrl) {
      key = `legacy:${urlToPath(enUrl) || '/'}`;
      idSource = 'legacy-en';
    } else {
      key = `unregistered:${urlToPath(members[0]) || '/'}`;
      idSource = 'unregistered';
    }
    // Two clusters can collide on a key only through a registry id reused on two
    // unconnected clusters - which is exactly a duplicate intent.
    if (clusters.has(key)) {
      problems.push({ level: 'error', code: 'intent-split', intentId: key,
        message: `intent ${key} resolves to two separate clusters (${clusters.get(key).members.map(urlToPath).join(', ')} | ${members.map(urlToPath).join(', ')}): its pages are not hreflang siblings, so they compete` });
      key = `${key}#${members[0]}`;
    }

    const originLocale = record ? lc(record.originLocale) : (enUrl ? 'en' : null);
    const pick = (lang) => (lang && byLang.has(lang) ? byLang.get(lang)[0] : null);
    const representative =
      (record && pick(lc(record.primaryLocale))) || pick(originLocale) || enUrl || members[0];

    const cluster = {
      key,
      intentId: idSource === 'unregistered' ? null : key,
      idSource,
      record,
      members,
      byLang,
      enUrl,
      originLocale,
      representative,
      expectedXDefault: null,
    };
    cluster.expectedXDefault = expectedXDefault(cluster, registry.policy);
    clusters.set(key, cluster);
    for (const u of members) clusterOfUrl.set(u, key);
  }

  for (const [u, rec] of recordOfPinnedUrl) {
    if (!byUrl.has(u)) {
      problems.push({ level: 'error', code: 'pinned-page-missing', url: u, intentId: rec.id,
        message: `${rec.id} pins ${u}, which is not a page with a canonical tag in this tree` });
    }
  }

  return {
    byUrl,
    legacyClusters: discovered.clusters,
    localeCodes: discovered.localeCodes,
    registry,
    clusters,
    clusterOfUrl,
    problems,
    laneMap: buildLaneMap(byUrl),
  };
}

/**
 * The x-default a cluster's members should declare.
 * @returns {{mode: 'url'|'none', href: string|null, source: string}}
 */
function expectedXDefault(cluster, policy) {
  const rec = cluster.record;
  if (rec && rec.xDefault) {
    if (rec.xDefault === 'none') return { mode: 'none', href: null, source: 'registry' };
    if (rec.xDefault === 'site-root') return { mode: 'url', href: SITE_ROOT_URL, source: 'registry:site-root' };
    return { mode: 'url', href: normalizeUrl(rec.xDefault), source: 'registry' };
  }
  const order = (policy && policy.xDefaultFallbackOrder) || DEFAULT_POLICY.xDefaultFallbackOrder;
  for (const lang of order) {
    const hit = cluster.byLang.get(lc(lang));
    if (hit && hit.length) return { mode: 'url', href: hit[0], source: `policy:${lc(lang)}` };
  }
  return { mode: 'none', href: null, source: 'policy:none' };
}

// ─── lane mapping ────────────────────────────────────────────────────────────

/**
 * Locale lane segment -> English lane, learned from the site itself.
 *
 * Locales name some lanes in their own language (fr/imprimables/, ja/purinto/,
 * de/zum-ausdrucken/). The Core Parent Set classifies English lane patterns
 * (printables/*, library/*). For a locale page WITH an English parent the gate
 * classifies the parent's path; for an origin page it needs the same pattern,
 * so it maps the page's own lane through what every existing translation
 * already says that lane corresponds to. No hand-kept table to drift.
 * Key: "<locale>/<segment>" -> English lane segment (majority vote).
 */
function buildLaneMap(byUrl) {
  const votes = new Map();
  for (const rec of byUrl.values()) {
    const en = realEnglishClaim(rec, byUrl);
    if (!en || lc(rec.ownLang) === 'en') continue;
    const segs = urlToPath(rec.canonical).split('/');
    const enSegs = urlToPath(en).split('/');
    if (segs.length < 3 || enSegs.length < 2) continue;
    const k = `${segs[0]}/${segs[1]}`;
    if (!votes.has(k)) votes.set(k, new Map());
    const v = votes.get(k);
    v.set(enSegs[0], (v.get(enSegs[0]) || 0) + 1);
  }
  const map = new Map();
  for (const [k, v] of votes) {
    const best = [...v.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    map.set(k, best[0]);
  }
  return map;
}

/**
 * The English-lane-equivalent path of a locale page, for classifying it against
 * data/core_parent_set.json when it has no English parent to classify.
 *   "ko/library/foo/index.html" -> "library/foo"
 *   "fr/imprimables/x/index.html" -> "printables/x"   (via the lane map)
 *   "ko/font-byeonhwan/index.html" -> "font-byeonhwan" (root page: unclassified)
 */
function lanePathFor(rel, laneMap) {
  const segs = String(rel).replace(/\/?index\.html$/, '').split('/').filter(Boolean);
  if (segs.length < 2) return segs.join('/');
  const [locale, lane, ...rest] = segs;
  if (!rest.length) return lane; // a page at the locale root
  const mapped = (laneMap && laneMap.get(`${locale}/${lane}`)) || lane;
  return [mapped, ...rest].join('/');
}

// ─── registry validation (shape + against the tree) ─────────────────────────

/**
 * Validate the registry's records against itself and against the model.
 * @param {object} model - buildIntentModel() result
 * @param {string[]} locales - valid locale codes (LOCALES); 'en' is always valid
 */
function validateRegistry(model, locales) {
  const out = [...model.problems];
  const reg = model.registry;
  if (!reg.exists) {
    out.push({ level: 'unknown', code: 'registry-missing', message: `${REGISTRY_REL} does not exist` });
    return out;
  }
  if (reg.error) {
    out.push({ level: 'unknown', code: 'registry-unparseable', message: `${REGISTRY_REL}: ${reg.error}` });
    return out;
  }
  const valid = new Set(['en', ...locales.map(lc)]);
  const seen = new Set();
  for (const rec of reg.intents) {
    const id = rec.id;
    const P = (code, message, level = 'error') => out.push({ level, code, intentId: id, message: `${id || '(no id)'}: ${message}` });
    if (!id || !ID_RE.test(id)) P('bad-id', `id must match ${ID_RE} (lowercase, hyphens, at most one "/" before an object qualifier)`);
    if (seen.has(id)) P('duplicate-id', 'id appears twice');
    seen.add(id);
    if (!valid.has(lc(rec.originLocale))) P('bad-origin-locale', `originLocale ${JSON.stringify(rec.originLocale)} is not a known locale`);
    if (rec.primaryLocale != null && !valid.has(lc(rec.primaryLocale))) P('bad-primary-locale', `primaryLocale ${JSON.stringify(rec.primaryLocale)} is not a known locale`);
    if (!SCOPES.includes(rec.scope)) P('bad-scope', `scope must be one of ${SCOPES.join(' | ')}`);
    if (!rec.scopeBasis || String(rec.scopeBasis).trim().length < 20) P('no-scope-basis', 'scopeBasis must say why the intent has this scope (evidence, not "unmeasured")');
    if (!Array.isArray(rec.pages) || !rec.pages.length) P('no-pages', 'pages must list at least one published URL');
    if (!rec.registered || !/^\d{4}-\d{2}-\d{2}$/.test(rec.registered)) P('bad-registered', 'registered must be YYYY-MM-DD');
    if (rec.xDefault != null && !X_DEFAULT_KEYWORDS.includes(rec.xDefault) && !/^https:\/\/ultratextgen\.com\//.test(rec.xDefault)) {
      P('bad-x-default', `xDefault must be ${X_DEFAULT_KEYWORDS.join(' | ')} or a member URL`);
    }

    const pages = (rec.pages || []).map(normalizeUrl);
    const keys = [...new Set(pages.map((u) => model.clusterOfUrl.get(u)).filter(Boolean))];
    if (keys.length > 1) P('pages-span-clusters', `pinned pages fall in ${keys.length} different hreflang clusters (${keys.join(', ')}); they must be siblings`);
    const cluster = keys.length ? model.clusters.get(keys[0]) : null;
    if (!cluster) continue;

    if (rec.xDefault && !X_DEFAULT_KEYWORDS.includes(rec.xDefault) && !cluster.members.includes(normalizeUrl(rec.xDefault))) {
      // A pre-2026-11-14 page whose x-default names a page outside its cluster
      // is recorded as it is (legacyXDefault: true) rather than rewritten in the
      // migration; a new record may not do this.
      P('x-default-not-member',
        `xDefault ${rec.xDefault} is not a member of the intent's cluster` +
          (rec.legacyXDefault === true ? ' (recorded legacy shape; clean up in a page edit)' : ''),
        rec.legacyXDefault === true ? 'warning' : 'error');
    }
    if (!cluster.byLang.has(lc(rec.originLocale))) {
      P('origin-not-published', `no member is published in originLocale "${rec.originLocale}" (if the origin page was folded, keep originLocale as history and set primaryLocale)`, 'warning');
    }
    if (rec.scope === 'locale-specific') {
      const langs = [...cluster.byLang.keys()];
      if (langs.length > 1) P('locale-specific-has-siblings', `scope is locale-specific but the cluster is published in ${langs.join(', ')}; reclassify the intent before adding languages`);
    }
    for (const [loc, why] of Object.entries(rec.inapplicableLocales || {})) {
      if (!valid.has(lc(loc))) P('bad-inapplicable-locale', `inapplicableLocales key ${loc} is not a known locale`);
      if (!why || String(why).length < 10) P('bad-inapplicable-reason', `inapplicableLocales.${loc} needs a reason`);
      if (cluster.byLang.has(lc(loc))) P('inapplicable-but-published', `inapplicableLocales lists ${loc}, but the cluster has a ${loc} page`);
    }
    for (const [loc, owner] of Object.entries(rec.localeOwners || {})) {
      if (!valid.has(lc(loc))) P('bad-locale-owner-locale', `localeOwners key ${loc} is not a known locale`);
      const u = normalizeUrl(owner);
      if (!model.byUrl.has(u)) P('locale-owner-missing', `localeOwners.${loc} = ${owner} is not a page in this tree`);
      if (cluster.members.includes(u)) P('locale-owner-is-member', `localeOwners.${loc} = ${owner} is already a member of the cluster; list only pages OUTSIDE it`);
      if (cluster.byLang.has(lc(loc))) P('locale-owner-and-member', `localeOwners names an owner for ${loc}, but the cluster also publishes a ${loc} page: two pages, one intent, one locale`);
    }
  }
  return out;
}

/** Every cluster with no English member and no registry record that has a locale page in it. */
function unregisteredClusters(model, localeSet) {
  const out = [];
  for (const c of model.clusters.values()) {
    if (c.idSource !== 'unregistered') continue;
    const localeMembers = c.members.filter((u) => {
      const top = urlToPath(u).split('/')[0];
      return localeSet.has(top) && !isHomepage(u);
    });
    if (localeMembers.length) out.push({ cluster: c, localeMembers });
  }
  return out;
}

// ─── the per-page admission rule for a NEW locale page ──────────────────────

/**
 * Decide whether a newly added locale page may ship. Pure: no git, no I/O
 * beyond what the model already read, so it is unit-testable on fixtures.
 *
 * The rule (2026-11-14): a page must map to a canonical intent, must not
 * duplicate a page that already serves that intent in its language, and must
 * clear the same Core-Parent / locale-qualification gate a translation clears.
 * Whether an English page exists is NOT part of the rule. With an English
 * member, the English page's path is classified (unchanged behaviour); without
 * one, the page's own lane is classified through the lane map.
 *
 * @param {object} p
 * @param {string} p.rel          - repo-relative path of the new page
 * @param {object} p.model        - buildIntentModel() result
 * @param {Function} p.decide     - locale-parent-registry.decide
 * @param {Array}  p.ledgerEntries - data/locale_parent_gap_audit.json entries
 * @param {string[]} p.locales    - LOCALES
 * @returns {{status: 'pass'|'fail'|'skip', problem?: string, detail?: string,
 *            localeCode?, cluster?, classifiedPath?, result?}}
 */
function evaluateNewLocalePage({ rel, model, decide, ledgerEntries, locales }) {
  const localeSet = new Set(locales.map(lc));
  const top = rel.split('/')[0];
  if (!localeSet.has(top)) return { status: 'skip', detail: 'not a locale page' };
  const rec = [...model.byUrl.values()].find((r) => r.rel === rel);
  if (!rec) {
    if (!rel.endsWith('/index.html')) return { status: 'skip', detail: 'fragment, not a page' };
    return {
      status: 'fail', problem: 'no-canonical', localeCode: top,
      detail: 'This new locale page has no <link rel="canonical"> tag, so it cannot join any hreflang cluster or map to a canonical intent. ' +
        'Add the canonical + self-referencing hreflang block (see .claude/rules/html-pages.md).',
    };
  }
  if (lc(rec.ownLang) === 'en') return { status: 'skip', detail: 'declares itself English' };
  if (!rec.ownLang) {
    return {
      status: 'fail', problem: 'no-self-reference', localeCode: top,
      detail: 'This new locale page declares no self-referencing hreflang alternate, so it belongs to no cluster and maps to no canonical intent. ' +
        'Add <link rel="alternate" hreflang="<its locale>" href="<its own canonical>"> (see .claude/rules/localization.md §2).',
    };
  }
  const localeCode = lc(rec.ownLang);
  const cluster = model.clusters.get(model.clusterOfUrl.get(rec.canonical));
  const same = (cluster.byLang.get(localeCode) || []).filter((u) => u !== rec.canonical);
  if (same.length) {
    return {
      status: 'fail', problem: 'duplicate-claimant', localeCode, cluster,
      detail: `Another ${localeCode} page is already in this intent's cluster (${same.map(urlToPath).join(', ')}). ` +
        'One intent has one page per language: improve or redirect the existing page instead of adding a second.',
    };
  }
  const record = cluster.record;
  if (record) {
    const owner = (record.localeOwners || {})[localeCode] || (record.localeOwners || {})[rec.ownLang];
    if (owner && normalizeUrlLocal(owner) !== rec.canonical) {
      return {
        status: 'fail', problem: 'intent-already-served', localeCode, cluster,
        detail: `data/canonical_intents.json records ${owner} as the page that already serves ${record.id} in ${localeCode}. ` +
          'A second URL would compete with it. Improve that page, or change the record with the owner\'s decision.',
      };
    }
    const inapplicable = (record.inapplicableLocales || {})[localeCode];
    if (inapplicable) {
      return {
        status: 'fail', problem: 'inapplicable-locale', localeCode, cluster,
        detail: `${record.id} cannot exist in ${localeCode}: ${inapplicable}`,
      };
    }
    if (record.scope === 'locale-specific' && cluster.byLang.size > 1) {
      return {
        status: 'fail', problem: 'locale-specific-sibling', localeCode, cluster,
        detail: `${record.id} is classified locale-specific (${record.originLocale} only), so it has no ${localeCode} version. ` +
          'If the need does exist in another language, reclassify the record to cross-language first, with its evidence.',
      };
    }
  }
  if (!cluster.enUrl && cluster.idSource === 'unregistered') {
    return {
      status: 'fail', problem: 'unregistered-intent', localeCode, cluster,
      detail: 'This page\'s cluster has no English member, which is allowed, but it maps to no canonical intent. ' +
        'Register the intent in data/canonical_intents.json (id, originLocale, pages, scope, scopeBasis, registered; ' +
        'see docs/architecture/language-neutral-intents.md). No English page is required or implied.',
    };
  }

  // Classification: the same gate a translation clears.
  const enRec = cluster.enUrl ? model.byUrl.get(cluster.enUrl) : null;
  const classifiedPath = enRec ? enRec.rel : lanePathFor(rec.rel, model.laneMap);
  const result = decide(classifiedPath, localeCode);
  if (!result.requiresLedgerEntry) return { status: 'pass', localeCode, cluster, classifiedPath, result };
  const ledgerKey = result.parentInfo.pattern || String(classifiedPath).replace(/\/?index\.html$/, '');
  const ok = (ledgerEntries || []).find(
    (e) => e.pattern === ledgerKey && lc(e.locale) === localeCode && (e.verdict === 'mirror' || e.verdict === 'gate-pass')
  );
  if (ok) return { status: 'pass', localeCode, cluster, classifiedPath, result, ledgerEntry: ok };
  return { status: 'fail', problem: 'missing-ledger-entry', localeCode, cluster, classifiedPath, result, ledgerKey };
}

function normalizeUrlLocal(u) {
  return normalizeUrl(u);
}

module.exports = {
  evaluateNewLocalePage,
  SITE_ORIGIN,
  SITE_ROOT_URL,
  REGISTRY_REL,
  SCOPES,
  ID_RE,
  isHomepage,
  urlToPath,
  urlToRel,
  loadIntentRegistry,
  buildIntentModel,
  expectedXDefault,
  buildLaneMap,
  lanePathFor,
  validateRegistry,
  unregisteredClusters,
  realEnglishClaim,
};
