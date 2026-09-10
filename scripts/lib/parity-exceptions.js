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
 * CLAUDE.md's "Translation Parity" section requires that the audit and the
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

module.exports = { loadExceptions, createExceptionResolver, EXCEPTIONS_PATH };
