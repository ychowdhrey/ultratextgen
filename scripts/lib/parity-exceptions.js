'use strict';

/**
 * parity-exceptions.js
 *
 * One definition of what data/translation_parity_exceptions.json MEANS,
 * shared by audit-translation-parity.js (site sweep) and
 * check-translation-parity.js (per-PR gate).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The ledger's own `_readme` advertises a `suppress` field that scopes an
 * entry to the specific divergence that was discussed:
 *
 *   suppress: { onlyInEN: [...hrefs], onlyInLocale: [...hrefs],
 *               h2Delta: true, faqDelta: true, symbolTilesDelta: true }
 *
 * Omitting `suppress` means the whole pair is excused. The audit implemented
 * that. The gate did not — it matched on (enUrl, localeUrl) and returned a
 * boolean, so in CI every scoped entry behaved as a blanket one. 98 of the
 * ledger's 177 entries carry a `suppress` block, so the field was being
 * ignored on the majority of the ledger, and a pair excused for (say) an
 * `<h2>` difference silently also excused a deleted FAQ or a dropped symbol
 * tile on the same pair.
 *
 * `.claude/rules/tooling-and-gates.md` requires that the audit and the
 * gate never define "changed" differently, which is why the fingerprint/diff
 * logic already lives in content-fingerprint.js. The ledger's semantics are
 * the same kind of shared definition, so they live here rather than being
 * copied into the gate.
 *
 * TWO DIFFS, ONE LEDGER
 * ---------------------
 * The two callers feed structurally different diffs into the same entry:
 *
 *   audit — diff(EN fingerprint, locale fingerprint).
 *           onlyInEN   = "EN links it, the locale page doesn't"
 *           onlyInLocale = "the locale page links it, EN doesn't"
 *
 *   gate  — diff(page before, page after) for ONE page.
 *           onlyInEN   = "this branch removed this link"
 *           onlyInLocale = "this branch added this link"
 *
 * The boolean counters (h2Delta/faqDelta/symbolTilesDelta) carry over
 * unchanged — "this pair may differ in section count" excuses a section
 * count that moved. The link lists don't: an entry naming a target under
 * `onlyInEN` is recording that *this pair is allowed to differ on that
 * target*, not which way a future edit will move it. So the gate reads both
 * link lists as one set (`linksDirectionless`), and the audit keeps the
 * directional reading its diff actually has. Same ledger, same fields, one
 * documented difference in how a link list is applied.
 */

const fs = require('fs');
const path = require('path');

const EXCEPTIONS_PATH = path.join(__dirname, '..', '..', 'data', 'translation_parity_exceptions.json');

/** Read the ledger. A missing or malformed file yields [] with a warning. */
function loadExceptions(filePath = EXCEPTIONS_PATH) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed.exceptions || [];
  } catch (e) {
    console.error(`WARNING: could not parse ${filePath}: ${e.message}`);
    return [];
  }
}

function createExceptionResolver(exceptions) {
  /** The ledger entry for this exact (EN, locale) pair, or null. */
  function findException(enUrl, localeUrl) {
    return exceptions.find((ex) => ex.enUrl === enUrl && ex.localeUrl === localeUrl) || null;
  }

  /** An entry with no `suppress` block excuses the pair entirely. */
  function isBlanket(ex) {
    return Boolean(ex) && !ex.suppress;
  }

  /**
   * Remove from `diff` exactly what this entry says the pair may differ on.
   *
   * @param {object|null} ex   ledger entry, or null for "no exception"
   * @param {object} diff      a diff from content-fingerprint.js
   * @param {object} [opts]
   * @param {boolean} [opts.linksDirectionless]  treat suppress.onlyInEN and
   *        suppress.onlyInLocale as one set of allowed-to-differ targets —
   *        see "TWO DIFFS, ONE LEDGER" above. The gate sets this; the audit
   *        does not.
   * @returns {object} a diff of the same shape, safe to pass to score()
   */
  function applySuppression(ex, diff, opts = {}) {
    if (!ex) return diff;
    if (isBlanket(ex)) {
      return {
        onlyInEN: [],
        onlyInLocale: [],
        h2Delta: 0,
        faqDelta: 0,
        symbolTilesDelta: 0,
        tableDelta: 0,
        tableRowsDelta: 0,
        collectionsOnlyInEN: [],
        collectionsOnlyInLocale: [],
        collectionGroupDeltas: [],
        collectionsRenamed: [],
        suppressedAll: true,
      };
    }
    const sup = ex.suppress;
    const supEN = sup.onlyInEN || [];
    const supLocale = sup.onlyInLocale || [];
    const allowedEN = opts.linksDirectionless ? [...supEN, ...supLocale] : supEN;
    const allowedLocale = opts.linksDirectionless ? [...supEN, ...supLocale] : supLocale;
    return {
      onlyInEN: diff.onlyInEN.filter((h) => !allowedEN.includes(h)),
      onlyInLocale: diff.onlyInLocale.filter((h) => !allowedLocale.includes(h)),
      h2Delta: sup.h2Delta ? 0 : diff.h2Delta,
      faqDelta: sup.faqDelta ? 0 : diff.faqDelta,
      symbolTilesDelta: sup.symbolTilesDelta ? 0 : diff.symbolTilesDelta,
      tableDelta: sup.tableDelta ? 0 : diff.tableDelta || 0,
      // Carried through unsuppressed: rows are reported, never scored, so
      // there is nothing for a suppress key to switch off.
      tableRowsDelta: diff.tableRowsDelta || 0,
      // No per-collection suppress key exists; a scoped entry passes the
      // combo-set axes through untouched rather than silently clearing them.
      collectionsOnlyInEN: diff.collectionsOnlyInEN || [],
      collectionsOnlyInLocale: diff.collectionsOnlyInLocale || [],
      collectionGroupDeltas: diff.collectionGroupDeltas || [],
      collectionsRenamed: diff.collectionsRenamed || [],
      suppressedAll: false,
    };
  }

  return { exceptions, findException, isBlanket, applySuppression };
}

// ─── Policy for NEW or CHANGED entries (added 2026-11-15) ─────────────────────
//
// An exception records an INTENTIONAL divergence between two pages that serve
// the same canonical intent, after demand, intent mapping and coverage were
// assessed. It is never a substitute for research or validation. Three things
// are deliberately NOT exceptions and have their own record:
//   - expansion priority (a language not worth building today): no record at all;
//   - verified locale ownership (a broader page serves the intent): a
//     localeOwners + localeOwnerEvidence entry in data/canonical_intents.json;
//   - semantic inapplicability: inapplicableLocales, with a semantic reason.
// So a new or changed entry must carry the evidence a reviewer needs, and must
// not rest on a prohibited ground. Entries that existed before this policy are
// grandfathered: check-parity-exception-policy.js reads only the delta.
const POLICY_EFFECTIVE = '2026-11-15';
const POLICY_TEXT_FIELDS = ['difference', 'userImpact', 'alternativesConsidered'];
const PROHIBITED_GROUNDS = [
  [/\b(?:no|missing|unmeasured|absent)\s+(?:keyword\s+)?(?:volume|demand|data|measurement)\b/i, 'missing keyword volume or demand data'],
  [/\b(?:low|little|weak|insufficient|negligible)\s+(?:\w+\s+)?(?:demand|volume|traffic|searches)\b/i, 'low demand'],
  [/\bno\s+(?:live\s+)?english\s+(?:parent|page|sibling|equivalent)\b/i, 'no English parent (English is not a mandatory parent)'],
  [/\b(?:to\s+(?:make|get)\s+(?:the\s+)?(?:check|gate|ci|build|validator)\s+(?:pass|green))|(?:parity|validator|gate|check)\s+(?:fails|failed|is\s+red|flags)\b/i, 'a validator failing'],
  [/\b(?:inconvenient|too\s+much\s+work|not\s+worth\s+(?:the\s+)?(?:time|effort)|no\s+time\s+to\s+translate)\b/i, 'a translation being inconvenient'],
];

/**
 * Problems with one new or changed ledger entry, or [] when it may be recorded.
 * Pure; never writes. The owner decision itself cannot be verified from the
 * tree, which is why `decision.by` and `decision.ref` must name it.
 */
function validateProposedEntry(e) {
  const out = [];
  const P = (code, message) => out.push({ code, message });
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  for (const f of ['enUrl', 'localeUrl']) {
    if (!/^https:\/\/ultratextgen\.com\/.*\/$/.test(String(e[f] || ''))) P('bad-url', `${f} must be a full canonical URL with a trailing slash`);
  }
  if (!e.reason || String(e.reason).trim().length < 20) P('no-reason', 'reason must say why the pages may differ');
  if (!DATE.test(String(e.agreed || ''))) P('bad-agreed', 'agreed must be YYYY-MM-DD');
  if (!e.canonicalIntentId || !/^(?:legacy:)?[a-z0-9][a-z0-9/_.-]*$/.test(String(e.canonicalIntentId))) {
    P('no-intent', 'canonicalIntentId must name the intent both pages serve (a registry id, or legacy:<english path>)');
  }
  for (const f of POLICY_TEXT_FIELDS) {
    if (!e[f] || String(e[f]).trim().length < 20) P('incomplete', `${f} is required (at least 20 characters)`);
  }
  const ev = Array.isArray(e.evidence) ? e.evidence.filter(Boolean) : (e.evidence ? [e.evidence] : []);
  if (!ev.length || ev.join(' ').trim().length < 20) P('no-evidence', 'evidence must cite what shows the divergence is justified (a measurement, a source, a test)');
  const d = e.decision || {};
  if (!d.by || !String(d.by).trim()) P('no-decision', 'decision.by must name who approved the divergence (the owner or their delegate)');
  if (!DATE.test(String(d.date || ''))) P('no-decision', 'decision.date must be YYYY-MM-DD');
  if (!d.ref || String(d.ref).trim().length < 4) P('no-decision', 'decision.ref must point at where the decision is recorded');
  if (!DATE.test(String(e.reviewDate || ''))) P('no-review-date', 'reviewDate must be YYYY-MM-DD');
  else if (DATE.test(String(e.agreed || '')) && e.reviewDate <= e.agreed) P('no-review-date', 'reviewDate must be after agreed');
  const text = [e.reason, e.difference, e.alternativesConsidered].filter(Boolean).join(' \n ');
  for (const [re, label] of PROHIBITED_GROUNDS) {
    const m = re.exec(text);
    if (m) P('prohibited-ground', `rests on ${label} ("${m[0]}"): that is a research or priority question, never a parity exception`);
  }
  return out;
}

function entryKey(e) {
  return `${e.enUrl}\t${e.localeUrl}`;
}

module.exports = {
  loadExceptions, createExceptionResolver, EXCEPTIONS_PATH,
  validateProposedEntry, entryKey, POLICY_EFFECTIVE, PROHIBITED_GROUNDS,
};
