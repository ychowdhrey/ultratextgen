"use strict";

/**
 * A model of how Cloudflare Pages compiles `_redirects`, shared by the gate and
 * any future audit so the two can never disagree about what a live rule is.
 *
 * Written 2026-09-14 after eight 301s served 404 in production for a month.
 * Every rule below is calibrated against Cloudflare's own parser, run locally
 * with `npx wrangler pages dev . --port 8788`, on both the broken file and the
 * repaired one — not from the public docs, which document the limits but not
 * the ordering behaviour that actually bites.
 *
 * The one that bites: a rule containing a splat or :placeholder is DYNAMIC, and
 * so is every rule BELOW it, whatever its own shape — precedence has to be
 * preserved, so nothing under a splat can go in the fast static map. The static
 * bucket holds 2,000; the dynamic bucket holds 100. So one splat near the top
 * quietly demotes the rest of the file into a bucket twenty times smaller, and
 * everything past dynamic rule 100 is dropped with no signal on the site.
 */

// Cloudflare pages-shared/metadata-generator/constants.ts
const PERMITTED_STATUS_CODES = new Set([200, 301, 302, 303, 307, 308]);
const MAX_LINE_LENGTH = 2000;
const MAX_STATIC_REDIRECT_RULES = 2000;
const MAX_DYNAMIC_REDIRECT_RULES = 100;

const isDynamicPath = (p) => p.includes("*") || /:[A-Za-z]/.test(p);
const isAbsolute = (p) => /^[a-zA-Z][\w+.-]*:\/\//.test(p) || p.startsWith("//");

/**
 * Cloudflare rejects a rewrite whose target normalises straight back to its own
 * source ("Infinite loop detected in this rule and has been ignored"). Narrow on
 * purpose: it flags `/  /index.html  200`, which the parser really does reject,
 * and leaves `/404  /404.html  200`, which it really does accept. Both observed.
 */
const isSelfLoop = (from, to) =>
  to === `${from.replace(/\/$/, "")}/index.html` || to === `${from}index.html`;

function parseRedirects(text) {
  const rules = [];      // rules Cloudflare will actually serve
  const invalid = [];    // rules it drops, with the reason it gives
  const seen = new Map();
  let staticCount = 0;
  let dynamicCount = 0;
  let sawDynamic = false;
  let capHitAtLine = null;

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Past the dynamic cap nothing is read at all - not even valid rules.
    if (capHitAtLine !== null) {
      invalid.push({ lineNo, line, reason: "skipped: file already past the 100 dynamic-rule cap", skipped: true });
      continue;
    }

    if (raw.length > MAX_LINE_LENGTH) {
      invalid.push({ lineNo, line, reason: `line longer than ${MAX_LINE_LENGTH} characters` });
      continue;
    }

    const [from, to, statusRaw] = line.split(/\s+/);
    if (!from || !to) {
      invalid.push({ lineNo, line, reason: "expected `from to [status]`" });
      continue;
    }
    if (isAbsolute(from)) {
      invalid.push({ lineNo, line, reason: "only relative URLs are allowed in `from`" });
      continue;
    }
    const status = statusRaw ? Number(statusRaw.replace(/!$/, "")) : 302;
    if (!PERMITTED_STATUS_CODES.has(status)) {
      invalid.push({ lineNo, line, reason: `status ${statusRaw} is not one of ${[...PERMITTED_STATUS_CODES].join(", ")}` });
      continue;
    }
    if (isSelfLoop(from, to)) {
      invalid.push({ lineNo, line, reason: "infinite loop: the target normalises back to the source" });
      continue;
    }
    const ownDynamic = isDynamicPath(from) || isDynamicPath(to);
    if (ownDynamic) sawDynamic = true;
    // The ordering rule: below a splat, everything is dynamic.
    const dynamic = ownDynamic || sawDynamic;

    if (dynamic) {
      if (dynamicCount >= MAX_DYNAMIC_REDIRECT_RULES) {
        capHitAtLine = lineNo;
        invalid.push({ lineNo, line, reason: `skipped: exceeds the ${MAX_DYNAMIC_REDIRECT_RULES} dynamic-rule cap`, skipped: true });
        continue;
      }
      dynamicCount++;
    } else {
      staticCount++;
    }

    // A duplicate is dropped but still SPENDS its slot - calibrated, not
    // assumed: the three duplicates in this file are what moved Cloudflare's
    // own cap from line 389 (where budget-free duplicates would put it) to
    // line 372, and made its count 172 rather than 175. Where a rule is
    // rejected before this point (absolute `from`, bad status, self-loop) the
    // accounting is unverified, and it does not matter: the gate fails on any
    // invalid rule regardless, so the only job left for this counter is to
    // predict the cap, and it now predicts it exactly.
    if (seen.has(from)) {
      invalid.push({ lineNo, line, reason: `duplicate source, already declared on line ${seen.get(from)}` });
      continue;
    }
    seen.set(from, lineNo);

    rules.push({ lineNo, from, to, status, dynamic, ownDynamic });
  }

  // A static rule sitting below a splat is the early warning: it is being
  // charged to the 100-rule bucket for no benefit, because Cloudflare matches
  // static rules first regardless of where they sit.
  const demoted = rules.filter((r) => r.dynamic && !r.ownDynamic);

  return {
    rules, invalid, demoted, staticCount, dynamicCount, capHitAtLine,
    limits: { MAX_STATIC_REDIRECT_RULES, MAX_DYNAMIC_REDIRECT_RULES, MAX_LINE_LENGTH },
  };
}

module.exports = { parseRedirects, PERMITTED_STATUS_CODES, MAX_STATIC_REDIRECT_RULES, MAX_DYNAMIC_REDIRECT_RULES };
