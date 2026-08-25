'use strict';

// Which files count as "a page that must carry the site-wide infra tags".
//
// Shared by scripts/check-gtm.js, scripts/check-ads.js and
// scripts/check-funding-choices.js. The three ask different questions (GTM
// container, AdSense loader, Funding Choices tag) but they must agree on
// WHICH files they are asking about — so that definition lives here, once.
//
// Why this file exists: until 2026-08-23 each script carried its own
// byte-identical copy of the rule. When PR #793 added Naver's site-ownership
// verification file to the repo root, all three went red at once, and the fix
// (`VERIFICATION_STUB_RE` plus its eight-line rationale) had to be pasted into
// three places to clear it. One rule, three copies, three chances to drift —
// the same hazard CLAUDE.md already names for the translation-parity
// audit/gate pair, which is why those two share
// scripts/lib/content-fingerprint.js rather than each defining "changed".

const path = require('path');

// Patterns in the file path that indicate files to skip
const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];

// Also skip files under build/helper directories (node_modules, etc.)
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

// Search-engine site-ownership verification files (e.g. Naver's HTML-upload
// method — see naverfc08aab480545cfd1d61489b3536a5e6.html) are plain-text
// stubs at the site root, not real pages: they must stay byte-exact to what
// the search engine issued, so page-infra tags like this one can never be
// injected into them. Detected by content signature rather than filename,
// so a future engine's verification file doesn't need a new entry here —
// every major search engine's file-upload method emits a single
// "<service>-site-verification: <filename>" line as the entire content.
const VERIFICATION_STUB_RE = /^[\w-]+-site-verification:\s/;

// Path-only test: does any segment of the file's path mark it as non-page
// (an embed/widget/test/demo/404/_root file, or a build/helper directory)?
function shouldSkipPath(filePath, root) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const segments = rel.split('/');

  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (SKIP_SEGMENTS.includes(lower)) return true;
    if (SKIP_DIRS.includes(lower)) return true;
    // skip test/demo filenames
    if (/\.(test|demo|widget|embed)\b/i.test(seg)) return true;
  }
  return false;
}

// Content test: is this a search-engine verification stub rather than a page?
// Separate from shouldSkipPath() because it needs the file body, which the
// callers only read once they know the path itself is not skippable.
function isVerificationStub(content) {
  return VERIFICATION_STUB_RE.test(content.trimStart());
}

module.exports = {
  SKIP_SEGMENTS,
  SKIP_DIRS,
  VERIFICATION_STUB_RE,
  shouldSkipPath,
  isVerificationStub
};
