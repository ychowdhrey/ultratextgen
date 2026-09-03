#!/usr/bin/env node
'use strict';

/**
 * source-attribution.js — shared owner of what a Sources block is.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site cites external sources on 100 pages. Sixty-seven of them — every
 * `/updates/` entry — present those citations in a "Sources" section, in one
 * prose paragraph, immediately before the FAQ, with every link carrying
 * `rel="nofollow noopener" target="_blank"`. That convention was 100%
 * consistent and written down nowhere: no CSS class of its own, no rule in
 * CLAUDE.md, no mention in the tone-of-voice standard, and no check. It
 * existed only as a pattern each pass happened to copy from the last one.
 *
 * The other 33 citing pages did not copy it. They put the same kind of
 * external citation inline in body prose or inside an FAQ answer, with no
 * attribution surface at all — `guide/unicode-symbol-approval-process` is an
 * article about the Unicode process citing unicode.org twice with nowhere
 * that says so. Nothing was watching, because nothing could: an undocumented
 * convention has no failure mode, only a drift.
 *
 * THE THREE RULES THIS FILE OWNS
 * ------------------------------
 * 1. A page that cites an external source has a Sources block, and every
 *    citation on the page lives inside it. Measured, not assumed: all 207
 *    citations on `/updates/` already satisfied this before it was a rule.
 * 2. The block's label is that locale's own word for it, matched from
 *    LOCALE_LABELS below — never generated, never translated on the fly.
 * 3. A citation's `rel` follows from the cited domain's authority tier in
 *    data/source_authority.json, not from a per-page choice.
 *
 * WHY rel IS NOT UNIFORMLY nofollow (changed 2026-09-03, user-directed)
 * --------------------------------------------------------------------
 * All 207 links carried `rel="nofollow noopener"`, which treated the Unicode
 * Consortium's own pipeline page exactly like a forum post. Google reserves
 * nofollow for paid and untrusted links; a followed link to the body that
 * owns the fact is the case the attribute is explicitly NOT for. So a
 * `primary` source — the standards body, the central bank that designed the
 * symbol, the platform's own changelog, the issue tracker the request lives
 * in — is followed, and press, third-party reference works and user-generated
 * threads stay `nofollow`.
 *
 * An UNLISTED domain is treated as secondary and reported, so a source
 * nobody has classified fails safe rather than silently earning a followed
 * link.
 *
 * WHAT IS DELIBERATELY NOT A CITATION
 * -----------------------------------
 * The four social links in the shared footer sit on 4,640 pages and are
 * navigation, not evidence. Counting them would have reported the whole site
 * as citing-without-a-block and made every number here meaningless — the
 * first sweep for this did exactly that and reported 4,600 "violations".
 * `privacy/` links Google's policies because it must name the processor it
 * discloses; that is a legal disclosure, not a claim needing backing, and it
 * is excluded by path.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');

/** Shared-footer and chrome domains. Navigation, never evidence. */
const FOOTER_DOMAINS = new Set([
  'youtube.com', 'facebook.com', 'linkedin.com', 'x.com', 'twitter.com',
  'instagram.com', 'pinterest.com', 'policies.google.com',
]);

/** Pages whose external links are disclosure or product chrome, not citations. */
const EXEMPT_PATHS = [/^privacy\//, /^about\//, /^contact\//, /^embed\//];

/**
 * The canonical Sources label per locale, and the legacy forms still accepted
 * on read so the audit can name a page that needs migrating rather than
 * failing to recognise its block at all. The FIRST entry is canonical.
 *
 * Wording is each locale's own, taken from what the site already shipped
 * rather than invented — the same rule the updates-verification registry
 * follows. Two locales had shipped two different words for one section and
 * needed a decision:
 *   ja  情報源 ("information source", journalistic) vs 出典 ("citation",
 *       what Japanese reference works use for a sources list) -> 出典.
 *   th  แหล่งข้อมูล ("information source") vs แหล่งอ้างอิง ("reference
 *       source", unambiguous for citations) -> แหล่งอ้างอิง.
 * Both choices are between two forms the site had already published, not
 * inventions; a native reader can flip either here and re-run the fixer.
 */
const LOCALE_LABELS = {
  en: ['Sources'],
  ar: ['المصادر'], de: ['Quellen'], es: ['Fuentes'], fr: ['Sources'],
  id: ['Sumber'], it: ['Fonti'], ja: ['出典', '情報源'], ko: ['출처'],
  ms: ['Sumber'], nl: ['Bronnen'], pl: ['Źródła'], pt: ['Fontes'],
  ru: ['Источники'], sv: ['Källor'], th: ['แหล่งอ้างอิง', 'แหล่งข้อมูล'],
  tr: ['Kaynaklar'], vi: ['Nguồn'], 'zh-tw': ['資料來源'],
};

let _resources = null;
/**
 * Per-page resource-link ledger. A domain listed for a route is a
 * destination on that page, not evidence — see the file's own _readme.
 */
function resourceLedger() {
  if (!_resources) {
    _resources = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'source_resource_links.json'), 'utf8')).routes;
  }
  return _resources;
}

/** Is this link, on THIS page, a destination rather than evidence? */
function isResourceLink(relPath, url) {
  const entry = resourceLedger()[relPath.split(path.sep).join('/')];
  return !!entry && entry.domains.includes(hostOf(url));
}

let _authority = null;
function authority() {
  if (!_authority) {
    _authority = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'source_authority.json'), 'utf8')).domains;
  }
  return _authority;
}

function hostOf(url) {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}

/** 'primary' | 'secondary'. An unlisted domain is secondary — fail safe. */
function tierOf(url) {
  const a = authority()[hostOf(url)];
  return a ? a.tier : 'secondary';
}

function isClassified(url) {
  return Object.prototype.hasOwnProperty.call(authority(), hostOf(url));
}

/** The rel a citation to this URL must carry. */
function relFor(url) {
  return tierOf(url) === 'primary' ? 'noopener' : 'nofollow noopener';
}

/** Body only — head metadata and JSON-LD are not page copy. */
function bodyOf(html) {
  const i = html.indexOf('</head>');
  const b = i >= 0 ? html.slice(i) : html;
  return b.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/** Locale code from a repo-relative path; 'en' for a non-locale path. */
function localeOf(relPath) {
  const first = relPath.split('/')[0];
  return Object.prototype.hasOwnProperty.call(LOCALE_LABELS, first) && first !== 'en' ? first : 'en';
}

function isExempt(relPath) {
  return EXEMPT_PATHS.some((re) => re.test(relPath));
}

/** Every external citation link in the body, in document order. */
function citationLinks(body) {
  const out = [];
  const re = /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(body))) {
    const url = m[2];
    const host = hostOf(url);
    if (host.endsWith('ultratextgen.com') || host === 'schema.org' || FOOTER_DOMAINS.has(host)) continue;
    const attrs = `${m[1]} ${m[3]}`;
    const rel = /rel="([^"]*)"/i.exec(attrs);
    out.push({
      url,
      host,
      tag: m[0],
      rel: rel ? rel[1].trim() : null,
      target: /target="([^"]*)"/i.exec(attrs) ? /target="([^"]*)"/i.exec(attrs)[1] : null,
      anchor: m[4].replace(/<[^>]+>/g, '').trim(),
      index: m.index,
    });
  }
  return out;
}

/**
 * The page's Sources section, located by its LABEL rather than by "the
 * section that happens to contain external links" — the second reading is
 * circular and would call any section with a link a Sources block.
 */
function sourceSection(body, locale) {
  const labels = LOCALE_LABELS[locale];
  if (!labels) return null;
  const re = /<section class="editorial-section">[\s\S]*?<\/section>/gi;
  let m;
  while ((m = re.exec(body))) {
    const lab = /<span class="article-section-label">([^<]*)<\/span>/.exec(m[0]);
    if (!lab) continue;
    const text = lab[1].trim();
    const i = labels.indexOf(text);
    if (i >= 0) return { html: m[0], label: text, canonical: i === 0, start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** Full read of one page against all three rules. */
function inspect(relPath, html) {
  const body = bodyOf(html);
  const locale = localeOf(relPath);
  const external = citationLinks(body);
  // rel/target apply to every external link; only CITATIONS owe a block.
  const cites = external.filter((c) => !isResourceLink(relPath, c.url));
  const resources = external.filter((c) => isResourceLink(relPath, c.url));
  const sec = sourceSection(body, locale);
  const errors = [];
  const warnings = [];

  if (isExempt(relPath)) return { relPath, locale, exempt: true, citations: cites, resources, external, errors, warnings, section: sec };

  if (cites.length && !sec) {
    errors.push(`cites ${cites.length} external source(s) but has no Sources block `
      + `(expected a section labelled "${(LOCALE_LABELS[locale] || ['?'])[0]}")`);
  }
  if (sec && !sec.canonical) {
    warnings.push(`Sources label is "${sec.label}"; this locale's canonical label is "${LOCALE_LABELS[locale][0]}"`);
  }
  if (sec) {
    // The block must ACCOUNT FOR every cited URL, not be its exclusive home.
    // A source named inside the sentence it backs ("Per the official Roblox
    // Developer Forum, those icons live in...") is good writing, and the
    // tone-of-voice standard asks for exactly that shape of link elsewhere;
    // the block is the one place a reader or an answer engine can see the
    // complete list. Demanding exclusivity would have forced 26 pages to
    // strip a useful inline link to satisfy a check — which this rule's own
    // first draft did, and the negative-control run caught.
    const inBlock = new Set(citationLinks(sec.html).map((c) => c.url));
    for (const url of new Set(cites.map((c) => c.url))) {
      if (!inBlock.has(url)) {
        errors.push(`${hostOf(url)} is cited on the page but not listed in the Sources block (${url})`);
      }
    }
    if (!/class="source-note"/.test(sec.html)) {
      errors.push('Sources block is not marked up as a .source-note panel');
    }
    // JSON-LD citation must be the block's own list, not a second hand-kept copy.
    const want = citationsFromSection(sec.html);
    const got = citationsInJsonLd(html);
    const key = (l) => (l || []).map((c) => c.url).join('|');
    if (key(got) !== key(want)) {
      errors.push(got === null
        ? `JSON-LD carries no schema.org citation for the ${want.length} source(s) in the Sources block`
        : `JSON-LD citation list does not match the Sources block (${(got || []).length} vs ${want.length})`);
    }
  }
  for (const c of external) {
    const want = relFor(c.url);
    if (c.rel !== want) {
      errors.push(`${c.host} should carry rel="${want}" (${tierOf(c.url)} source), found ${c.rel ? `rel="${c.rel}"` : 'no rel'}`);
    }
    if (c.target !== '_blank') errors.push(`${c.host} citation is missing target="_blank"`);
    if (!isClassified(c.url)) {
      warnings.push(`${c.host} is not in data/source_authority.json; treated as secondary`);
    }
  }
  return { relPath, locale, exempt: false, citations: cites, resources, external, section: sec, errors, warnings };
}


/* ---------------------------------------------------------------------
 * MACHINE-READABLE CITATIONS
 * -------------------------------------------------------------------
 * Nothing on this site carried schema.org `citation` before 2026-09-03,
 * so a page's evidence was legible to a human reader and invisible to
 * every answer engine — the reader this site's own tone-of-voice standard
 * ranks second, above the pro user. `citation` is a CreativeWork property,
 * valid on every JSON-LD node type these pages actually use (NewsArticle,
 * Article, CollectionPage, WebApplication, WebPage, FAQPage).
 *
 * It is DERIVED FROM THE SOURCES BLOCK, never authored separately, for the
 * reason CLAUDE.md's FAQ-schema section documents at length: two hand-kept
 * copies of one list drift, and the drifted one is the one nobody sees.
 * The block is the source of truth; this is a projection of it.
 *
 * The JSON is patched as TEXT rather than parsed and re-serialised. That is
 * not fussiness: 161 of the 281 ld+json blocks on the affected pages do not
 * survive a JSON.parse -> JSON.stringify(null, 2) round trip byte for byte,
 * so a re-serialising fixer would rewrite formatting across the site and
 * bury the real change in noise.
 */

const HOST_TYPE_PRIORITY = ['NewsArticle', 'Article', 'CollectionPage', 'WebApplication', 'WebPage', 'FAQPage'];

function decodeEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

/** The citation list a Sources block implies: one entry per distinct URL. */
function citationsFromSection(sectionHtml) {
  const out = [];
  const seen = new Set();
  for (const c of citationLinks(sectionHtml)) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    out.push({ '@type': 'WebPage', name: decodeEntities(c.anchor).trim(), url: c.url });
  }
  return out;
}

/** Serialise that list at the 2-space top-level indent these blocks use. */
function renderCitationJson(list) {
  const body = JSON.stringify(list, null, 2).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
  return `  "citation": ${body},`;
}

/** Read the citation array already present in a page's JSON-LD, if any. */
function citationsInJsonLd(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let d;
    try { d = JSON.parse(m[1]); } catch { continue; }
    for (const node of (Array.isArray(d) ? d : [d])) {
      if (node && node.citation) return node.citation;
    }
  }
  return null;
}

/**
 * Insert or replace the citation array on the page's highest-priority
 * JSON-LD node. Returns the new HTML, or null when there is nowhere valid
 * to put it (no ld+json node of a CreativeWork type).
 */
function withJsonLdCitations(html, list) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let best = null;
  let bestRank = Infinity;
  for (const m of blocks) {
    for (const t of HOST_TYPE_PRIORITY) {
      const rank = HOST_TYPE_PRIORITY.indexOf(t);
      const re = new RegExp(`^\\s*"@type":\\s*"${t}",`, 'm');
      if (re.test(m[1]) && rank < bestRank) { best = { m, type: t }; bestRank = rank; }
    }
  }
  if (!best) return null;

  let raw = best.m[1];
  // Drop any citation array already there, so this is idempotent.
  raw = raw.replace(/\n {2}"citation": \[[\s\S]*?\n {2}\],/, '');
  if (list.length) {
    const anchor = new RegExp(`(^ {2}"@type":\\s*"${best.type}",)`, 'm');
    if (!anchor.test(raw)) return null;
    raw = raw.replace(anchor, `$1\n${renderCitationJson(list)}`);
  }
  return html.slice(0, best.m.index) + `<script type="application/ld+json">${raw}</script>`
       + html.slice(best.m.index + best.m[0].length);
}

module.exports = {
  FOOTER_DOMAINS, LOCALE_LABELS, EXEMPT_PATHS, REPO,
  hostOf, tierOf, relFor, isClassified, bodyOf, localeOf, isExempt,
  citationLinks, sourceSection, inspect, authority, resourceLedger, isResourceLink,
  citationsFromSection, renderCitationJson, citationsInJsonLd, withJsonLdCitations, decodeEntities,
};
