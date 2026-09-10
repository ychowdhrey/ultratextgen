#!/usr/bin/env node
'use strict';

/**
 * link-health.js — shared classifier and ledger for cited-URL health.
 *
 * WHY THIS EXISTS
 * ---------------
 * docs/source-attribution.md §9 recorded the one thing the standard did not
 * cover: nothing checked that a cited URL still resolves. The `updates/`
 * verification pill answers "was the FACT re-checked"; this answers the
 * narrower and entirely mechanical "does the evidence still load".
 *
 * THE WHOLE DIFFICULTY IS THAT A FAILED FETCH IS NOT A DEAD LINK
 * -------------------------------------------------------------
 * Measured while building this, not assumed:
 *
 *   cbo.gov.om/omrsymbol   curl -> exit 60, TLS "unable to get local issuer"
 *                          node -> HTTP 503
 *   a nonexistent host     curl -> exit 56, CONNECT tunnel 502
 *
 * One of those is the Central Bank of Oman's live page for the currency sign
 * this site has a whole entry about. The other does not exist. Through curl
 * they report the SAME http_code: 000. A checker that treats "did not come
 * back 200" as rot would have declared a live primary source dead on its
 * first run, and the fix would have been to delete a correct citation.
 *
 * So classification is by CAUSE, and only two causes are ever candidates for
 * rot:
 *
 *   ok          2xx.
 *   redirect    2xx after following, final URL differs. Not rot — but a
 *               permanent one means the citation should be updated, so the
 *               final URL is recorded for a human to act on.
 *   blocked     401/403/405/406/408/429/503/999. Bot protection, WAF or rate
 *               limit. The page is there; we are not welcome unauthenticated.
 *               NEVER rot. cbo.gov.om is exactly this.
 *   gone        404/410. The strongest signal, and still not conclusive alone.
 *   unreachable DNS failure, TLS failure, timeout, reset. Environment-
 *               sensitive: a sandbox with TLS interception produces these for
 *               live hosts, as the measurement above shows.
 *   server      5xx other than 503. Transient far more often than terminal.
 *
 * AND ONE BAD FETCH IS NEVER ROT
 * ------------------------------
 * Rot is declared only after ROT_THRESHOLD consecutive failing runs recorded
 * in the ledger, on separate days. That is the same discipline this repo
 * applies to CI flakes: a single failure is noise, a repeated one is a fact.
 * It is why the ledger exists at all — without persisted history the check
 * could only ever report one noisy snapshot.
 *
 * NEVER GATES. The audit is informational by construction: it depends on the
 * public internet, on hosts that rate-limit, and on whatever egress the
 * runner has. A gate on that would be red for reasons no PR author can fix,
 * which is the failure mode CLAUDE.md documents for check:images.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const LEDGER_PATH = path.join(REPO, 'data', 'source_link_health.json');

/** Consecutive failing runs before a URL is reported as rotted. */
const ROT_THRESHOLD = 3;

/** Statuses that count toward the rot streak. Everything else resets it. */
const FAILING = new Set(['gone', 'unreachable', 'server']);

/** HTTP codes that mean "the page is there, we are just not welcome". */
const BLOCKED_CODES = new Set([401, 403, 405, 406, 408, 429, 503, 999]);

/**
 * Classify one fetch outcome. `res` is a fetch Response, or null when the
 * request threw; `err` is that error.
 */
function classify(res, err, requestedUrl) {
  if (err) {
    const code = (err.cause && (err.cause.code || err.cause.name)) || err.name || '';
    const msg = `${code} ${err.message || ''}`.trim();
    return { status: 'unreachable', detail: msg.slice(0, 120) };
  }
  const code = res.status;
  if (code >= 200 && code < 300) {
    const finalUrl = res.url || requestedUrl;
    return isMeaningfulRedirect(requestedUrl, finalUrl)
      ? { status: 'redirect', httpCode: code, finalUrl }
      : { status: 'ok', httpCode: code };
  }
  if (BLOCKED_CODES.has(code)) return { status: 'blocked', httpCode: code };
  if (code === 404 || code === 410) return { status: 'gone', httpCode: code };
  if (code >= 500) return { status: 'server', httpCode: code };
  return { status: 'blocked', httpCode: code };
}


/**
 * Did the citation actually MOVE, or did the server just tidy the URL?
 *
 * Reporting every 3xx floods the useful signal. Two shapes are pure noise and
 * were both in the first live run: `https://www.roblox.com` -> `.../` (a
 * trailing slash) and `https://www.xbox.com` -> `.../en-US/` (a bare root
 * landing on a regional home page). Neither is a citation anybody should
 * rewrite — the cited URL works and points where it claims.
 *
 * So: a redirect counts only when it leaves the host, or when a URL that
 * named a real PATH lands somewhere else. A bare root going anywhere on its
 * own host is the site's own front-door routing.
 */
function isMeaningfulRedirect(from, to) {
  if (!to || to === from) return false;
  let a;
  let b;
  try { a = new URL(from); b = new URL(to); } catch { return from !== to; }
  if (a.host !== b.host) return true;
  const rootish = (u) => u.pathname === '' || u.pathname === '/';
  if (rootish(a)) return false;
  const norm = (u) => `${u.pathname.replace(/\/+$/, '')}${u.search}`;
  return norm(a) !== norm(b);
}

function loadLedger(p = LEDGER_PATH) {
  if (!fs.existsSync(p)) return { _readme: readmeText(), urls: {} };
  try {
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { _readme: d._readme || readmeText(), urls: d.urls || {} };
  } catch {
    return { _readme: readmeText(), urls: {} };
  }
}

function saveLedger(ledger, p = LEDGER_PATH) {
  const urls = {};
  for (const k of Object.keys(ledger.urls).sort()) urls[k] = ledger.urls[k];
  fs.writeFileSync(p, `${JSON.stringify({ _readme: readmeText(), urls }, null, 2)}\n`);
}

function readmeText() {
  return 'Health history for every externally cited URL on the site, written by '
    + 'npm run audit:link-rot. Generated — do not hand-edit; a hand-set lastGood '
    + 'is a claim nobody checked. consecutiveFailures counts runs that came back '
    + 'gone/unreachable/server, and a URL is only REPORTED AS ROTTED at '
    + `${ROT_THRESHOLD}, because one bad fetch is not a dead link: a live primary `
    + 'source behind bot protection (cbo.gov.om answers 503) and a host that does '
    + 'not exist can look identical in a single request. blocked/redirect never '
    + 'count as failures. See the header of scripts/lib/link-health.js for the '
    + 'measurements behind that rule, and docs/source-attribution.md §9.';
}

/**
 * Fold one run's result into a URL's ledger entry and return the new entry.
 * `today` is an ISO date string so a run is reproducible in tests.
 */
function record(entry, result, today, citedBy) {
  const prev = entry || { firstSeen: today, consecutiveFailures: 0 };
  const failing = FAILING.has(result.status);
  const next = {
    firstSeen: prev.firstSeen || today,
    lastChecked: today,
    lastStatus: result.status,
    consecutiveFailures: failing ? (prev.consecutiveFailures || 0) + 1 : 0,
    citedBy,
  };
  if (result.httpCode) next.httpCode = result.httpCode;
  if (result.finalUrl) next.finalUrl = result.finalUrl;
  if (result.detail) next.detail = result.detail;
  // lastGood is only moved by an actual success. A blocked or unreachable run
  // must never refresh it, or a URL that has been unfetchable for a year would
  // read as recently healthy.
  next.lastGood = (result.status === 'ok' || result.status === 'redirect')
    ? today
    : prev.lastGood || null;
  return next;
}

/** URLs whose streak has reached the threshold — the actual rot report. */
function rotted(ledger, threshold = ROT_THRESHOLD) {
  return Object.entries(ledger.urls)
    .filter(([, e]) => (e.consecutiveFailures || 0) >= threshold)
    .sort((a, b) => b[1].consecutiveFailures - a[1].consecutiveFailures);
}

module.exports = {
  REPO, LEDGER_PATH, ROT_THRESHOLD, FAILING, BLOCKED_CODES,
  classify, isMeaningfulRedirect, loadLedger, saveLedger, record, rotted, readmeText,
};
