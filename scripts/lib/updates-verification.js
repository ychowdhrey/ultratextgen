#!/usr/bin/env node
'use strict';

/**
 * updates-verification.js — shared classifier for date claims in updates/.
 *
 * WHY THIS EXISTS
 * ---------------
 * updates/ is the audit trail for the site's Check surfaces (the per-game
 * RULES limits, the answers/ pages asserting what a platform accepts). Its
 * whole value is "this number was true, and here is when we last confirmed
 * it" — so the verification date is the pillar's load-bearing claim, and it
 * has to be findable, singular, and consistent with the page's own JSON-LD.
 *
 * It was none of those. Two conventions coexisted: "Last checked <date>" in
 * body prose on all 11 entries from the tone-of-voice pass, and a
 * "Published · Verified" guide-meta pill added later on one. A page ended up
 * asserting two different check dates at once, in two different slots, and
 * nothing noticed — the markup was valid and both sentences read fine.
 *
 * The near-miss worth recording: the first sweep for this grepped `Checked`
 * CASE-SENSITIVELY and reported "no other entry carries an inline stamp".
 * Every one of the 11 does; they all say `Last checked`. A pattern-matched
 * audit found the surface it was written for and missed the next one, which
 * is exactly the failure CLAUDE.md's "Structure is not language" section
 * documents. So this classifier keys on a closed set of STAMP PHRASES, and
 * the audit that uses it enumerates rather than samples.
 *
 * THE DISTINCTION THAT MATTERS — three kinds of date live on these pages and
 * only one of them is a verification stamp. Conflating them would flag the
 * ~18 real event dates on uae-dirham-symbol-unicode-18:
 *
 *   stamp   "Last checked September 1, 2026"   page-level, belongs in the pill
 *   scoped  "As of September 1, 2026 no date…" a time-bound claim, stays inline
 *   factual "Unicode 18.0 publishes on Sep 16" ordinary content, never touched
 *
 * A scoped qualifier is NOT a stamp: "no rollout date has been announced" is
 * only true at a point in time and must carry its own date wherever it sits,
 * because a reader cannot infer it from a header pill.
 */

const fs = require('fs');

const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];
const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MONTH_RE = `(?:${MONTHS.join('|')}|${SHORT.join('|')})`;
const DATE_RE = `(?:${MONTH_RE}\\.?\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\s+${MONTH_RE}\\.?\\s+\\d{4})`;

/** Phrases that assert "we checked this page". Closed set, matched case-insensitively. */
const STAMP_PHRASES = ['last checked', 'last verified', 'checked', 'verified', 'last reviewed', 'reviewed'];
const STAMP_RE = new RegExp(`\\b(${STAMP_PHRASES.join('|')})\\s+(${DATE_RE})`, 'gi');

/** The pill this pillar standardised on. */
const PILL_RE = new RegExp(
  `<span class="guide-pill">\\s*Published\\s+(${DATE_RE})\\s*·\\s*Verified\\s+(${DATE_RE})\\s*</span>`, 'i');

function parseDate(str) {
  const s = String(str).replace(/\./g, '').replace(/,/g, ' ').trim();
  let m = s.match(new RegExp(`^(${MONTH_RE})\\s+(\\d{1,2})\\s+(\\d{4})$`, 'i'));
  if (!m) {
    const d = s.match(new RegExp(`^(\\d{1,2})\\s+(${MONTH_RE})\\s+(\\d{4})$`, 'i'));
    if (d) m = [null, d[2], d[1], d[3]];
  }
  if (!m) return null;
  const name = m[1].toLowerCase();
  const idx = MONTHS.findIndex((x) => x.toLowerCase() === name) >= 0
    ? MONTHS.findIndex((x) => x.toLowerCase() === name)
    : SHORT.findIndex((x) => x.toLowerCase() === name.slice(0, 3));
  if (idx < 0) return null;
  return new Date(Date.UTC(+m[3], idx, +m[2]));
}

const iso = (d) => (d ? d.toISOString().slice(0, 10) : null);

/** Body text with head, scripts, styles and comments removed. */
function bodyOf(html) {
  const body = html.includes('<body') ? html.slice(html.indexOf('<body')) : html;
  return body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ');
}

/**
 * Inspect one updates/ entry. Returns { errors[], warnings[], pill }.
 * Errors are shape violations the pillar's rule forbids; warnings are
 * consistency drift that is real but does not break the page.
 */
function inspect(file) {
  const html = fs.readFileSync(file, 'utf8');
  const body = bodyOf(html);
  const errors = [];
  const warnings = [];

  // 1. exactly one verification pill
  const pills = body.match(new RegExp(PILL_RE.source, 'gi')) || [];
  if (pills.length === 0) {
    errors.push('no "Published <date> · Verified <date>" pill in guide-meta');
  } else if (pills.length > 1) {
    errors.push(`${pills.length} verification pills; exactly one is allowed`);
  }
  const m = body.match(PILL_RE);
  const pill = m ? { published: parseDate(m[1]), verified: parseDate(m[2]), raw: m[0] } : null;

  // 2. no verification stamp anywhere in body prose (the pill is not prose)
  const prose = body.replace(new RegExp(PILL_RE.source, 'gi'), ' ');
  for (const s of prose.matchAll(STAMP_RE)) {
    errors.push(`verification stamp in body prose: "${s[0].trim()}" — it belongs in the pill`);
  }

  if (pill) {
    // 3. the pill's published date must match the page's own JSON-LD
    const dp = html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})/);
    if (dp && pill.published && iso(pill.published) !== dp[1]) {
      errors.push(`pill says Published ${iso(pill.published)} but datePublished is ${dp[1]}`);
    }
    // 4. a verification cannot predate publication, or sit in the future
    if (pill.published && pill.verified && pill.verified < pill.published) {
      errors.push(`Verified ${iso(pill.verified)} predates Published ${iso(pill.published)}`);
    }
    if (pill.verified && pill.verified.getTime() > Date.now() + 864e5) {
      errors.push(`Verified ${iso(pill.verified)} is in the future`);
    }
    // 5. a stamp in the meta description is allowed (snippet copy, its own
    //    slot and audience) but must not contradict the pill.
    const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (desc) {
      for (const s of desc[1].matchAll(STAMP_RE)) {
        const d = parseDate(s[2]);
        if (d && pill.verified && iso(d) !== iso(pill.verified)) {
          warnings.push(`meta description says "${s[0].trim()}" but the pill says Verified ${iso(pill.verified)}`);
        }
      }
    }
  }

  return { file, errors, warnings, pill };
}

/**
 * LOCALE VERIFICATION PILLS
 * -------------------------
 * A locale entry carries ONE verification pill in its own language and no
 * "Published" half. That asymmetry is deliberate: for an English entry the
 * publication date is a real claim (it is where the fact was first reported),
 * while for a translation the only claim worth publishing is when the facts
 * were last checked — and that check happens once, upstream, in English.
 *
 * So a locale pill's date must equal its EN parent's Verified date, found via
 * the page's own hreflang="en". That single rule is what catches the failure
 * this whole file exists for: on 2026-09-01 an EN-only pass corrected the
 * Unicode 18.0 character count from 13,047 to 13,007 and left seven
 * translations asserting the old figure as current. No gate saw it, because
 * the parity gate compares a STRUCTURAL fingerprint (links, h2/FAQ/tile
 * counts) which a changed number does not move, and the locale-translation
 * gate looks for surviving English strings, which a correctly-translated
 * wrong number is not. Every gate measured structure or language; none
 * measured facts. A verified-date that must agree across a cluster is a
 * cheap proxy for "somebody looked at the translation when EN moved".
 *
 * Labels are matched, not generated. Dates are compared as integers rather
 * than by formatting a string per locale: the pill must contain the parent's
 * year and day, plus its month wherever the locale writes months as digits
 * (ja/ko/vi/zh-tw). That is enough to catch a stale date and avoids
 * hand-authoring month names in seventeen languages — a table this file has
 * no business being the authority on.
 */
const LOCALE_LABELS = {
  ar: ['آخر تحقّق'], de: ['Zuletzt geprüft'], es: ['Última comprobación'],
  fr: ['Dernière vérification'], id: ['Terakhir diperiksa'], it: ['Ultimo controllo'],
  ja: ['最終確認'], ko: ['최종 확인'], nl: ['Laatst gecontroleerd'],
  pl: ['Ostatnio sprawdzone'], pt: ['Última verificação'], ru: ['Последняя проверка'],
  sv: ['Senast kontrollerat'], th: ['ตรวจสอบล่าสุด'], tr: ['Son kontrol'],
  vi: ['Kiểm chứng lần cuối'], 'zh-tw': ['最後查核'],
};

/** Inspect one <lang>/updates/ entry against its EN parent's verified date. */
function inspectLocale(file, enVerifiedIso) {
  const html = fs.readFileSync(file, 'utf8');
  const body = bodyOf(html);
  const locale = file.split(/[\\/]/).filter(Boolean).slice(-4)[0];
  const errors = [];
  const labels = LOCALE_LABELS[locale];
  if (!labels) return { file, errors: [`no verification label registered for locale "${locale}"`], warnings: [] };

  const pills = (body.match(/<span class="guide-pill[^"]*">[^<]*<\/span>/g) || [])
    .filter((p) => labels.some((l) => p.includes(l)));

  if (pills.length !== 1) {
    errors.push(pills.length === 0
      ? `no verification pill (expected a guide-pill containing "${labels[0]}")`
      : `${pills.length} verification pills; exactly one is allowed`);
  }

  // no stamp in body prose — the pill owns the claim, same rule as English
  const prose = body.replace(/<span class="guide-pill[^"]*">[^<]*<\/span>/g, ' ');
  for (const l of labels) {
    const re = new RegExp(`${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]{0,40}\\d{4}`, 'g');
    for (const m of prose.matchAll(re)) {
      errors.push(`verification stamp in body prose: "${m[0].trim()}" — it belongs in the pill`);
    }
  }

  if (pills.length === 1 && enVerifiedIso) {
    const [y, mo, d] = enVerifiedIso.split('-').map(Number);
    const ints = (pills[0].match(/\d+/g) || []).map(Number);
    const missing = [];
    if (!ints.includes(y)) missing.push(`year ${y}`);
    if (!ints.includes(d)) missing.push(`day ${d}`);
    if (ints.length >= 3 && !ints.includes(mo)) missing.push(`month ${mo}`);
    if (missing.length) {
      errors.push(`pill "${pills[0].replace(/<[^>]+>/g, '')}" does not match its EN parent's `
        + `Verified date ${enVerifiedIso} (missing ${missing.join(', ')})`);
    }
  }
  return { file, errors, warnings: [] };
}

/** The EN parent an entry declares via its own hreflang="en". */
function enParentOf(file) {
  const m = fs.readFileSync(file, 'utf8')
    .match(/<link rel="alternate" hreflang="en" href="https:\/\/ultratextgen\.com\/([^"]*)"/);
  if (!m) return null;
  return m[1].replace(/\/$/, '') + '/index.html';
}

module.exports = { inspect, inspectLocale, enParentOf, LOCALE_LABELS, parseDate, iso, bodyOf, DATE_RE, STAMP_RE, PILL_RE };
