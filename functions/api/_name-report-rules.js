// _name-report-rules.js — what a public name report may contain.
//
// Unrouted module (the leading underscore keeps Pages from serving it).
// Shared by functions/api/name-reports.js and scripts/name-reports.test.mjs,
// so the rule the test asserts is the rule production enforces.
//
// The board is public, so the only free text anywhere in a report is the
// name the player tried, and that field is built to make a link impossible
// to post rather than merely unlikely: it is capped far below a URL's
// length, and rejected outright if, after folding look-alike dots and
// full-width letters, it contains a scheme, a "www", a domain ending, an
// invite or messenger shortlink, an @handle or a phone-length digit run.
// Every other field is a fixed choice. There is no comment box to spam.

export const GAMES = ["ff"];
export const OUTCOMES = ["accepted", "refused", "boxes"];
export const REASONS = ["too_long", "invalid", "sensitive", "taken", "other"];
export const VERDICTS = ["ok", "warn", "fail"];

// Longest Free Fire name the checker allows is 12; 40 leaves room for
// decoration counted at 1 each while staying far below any useful URL.
export const NAME_MAX = 40;
export const SYMBOLS_MAX = 8;

const TLDS =
  "com|net|org|io|gg|me|ly|xyz|app|site|online|info|co|link|shop|store|top|club|" +
  "live|tv|ru|cn|tk|ml|ga|cf|vip|win|bet|cc|biz|in|id|vn|br|ph|my|pk|uk|us";
const LINK_PATTERN = new RegExp(
  "(https?:|ftp:|www\\.|\\.(" + TLDS + ")(\\b|/|$)|discord\\.gg|discord(app)?\\.com|t\\.me|" +
  "wa\\.me|bit\\.ly|tinyurl|linktr\\.ee|@[a-z0-9_.]{3,}|\\d{7,})"
);

// Bidi controls reorder what a reader sees (a name can be made to display as
// something it is not); line breaks and other controls break the layout.
const FORBIDDEN_CHARS = new RegExp("[\\u0000-\\u0008\\u000A-\\u001F\\u007F-\\u009F\\u202A-\\u202E\\u2066-\\u2069\\u2028\\u2029]");

function foldForLinkCheck(str) {
  return String(str)
    .normalize("NFKC")
    .toLowerCase()
    .replace(new RegExp("[\\u3002\\uFF0E\\uFF61\\u2024\\u2027\\u00B7\\u2022\\u30FB]", "g"), ".")
    .replace(/\s*(\(|\[)?\s*(dot|d0t)\s*(\)|\])?\s*/g, ".")
    .replace(new RegExp("[\\s\\u200B-\\u200D\\u2060\\u115F\\u1160\\u3164\\uFFA0\\u2800]+", "g"), "");
}

export function containsLink(str) {
  return LINK_PATTERN.test(foldForLinkCheck(str));
}

export function codePoints(str) {
  return Array.from(String(str || ""));
}

// Validate a create request. Returns { ok: true, value } or { ok: false, error }.
// `symbols` (hex code points the page's checker flagged as decoration) must be
// characters that actually occur in the name, so the aggregate cannot be fed
// characters nobody tried.
export function validateReport(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_body" };
  if (body.website) return { ok: false, error: "spam" }; // honeypot field
  const game = String(body.game || "");
  const outcome = String(body.outcome || "");
  const reason = body.reason == null || body.reason === "" ? null : String(body.reason);
  const verdict = body.verdict == null || body.verdict === "" ? null : String(body.verdict);
  if (GAMES.indexOf(game) === -1) return { ok: false, error: "bad_game" };
  if (OUTCOMES.indexOf(outcome) === -1) return { ok: false, error: "bad_outcome" };
  if (outcome === "refused") {
    if (REASONS.indexOf(reason) === -1) return { ok: false, error: "bad_reason" };
  } else if (reason !== null) {
    return { ok: false, error: "bad_reason" };
  }
  if (verdict !== null && VERDICTS.indexOf(verdict) === -1) return { ok: false, error: "bad_verdict" };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const chars = codePoints(name);
  if (!chars.length) return { ok: false, error: "empty_name" };
  if (chars.length > NAME_MAX) return { ok: false, error: "name_too_long" };
  if (FORBIDDEN_CHARS.test(name)) return { ok: false, error: "bad_characters" };
  if (containsLink(name)) return { ok: false, error: "link" };

  const raw = Array.isArray(body.symbols) ? body.symbols : [];
  const present = new Set(chars.map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")));
  const symbols = [];
  for (const s of raw.slice(0, SYMBOLS_MAX)) {
    const hex = String(s).toUpperCase();
    if (/^[0-9A-F]{4,6}$/.test(hex) && present.has(hex) && symbols.indexOf(hex) === -1) symbols.push(hex);
  }
  return { ok: true, value: { game, name, outcome, reason, verdict, symbols } };
}

// What the public sees for one report. Nothing about who sent it.
export function publicReport(row) {
  return {
    id: row.id,
    game: row.game,
    name: row.name,
    outcome: row.outcome,
    reason: row.reason,
    verdict: row.verdict,
    symbols: row.symbols ? String(row.symbols).split(" ").filter(Boolean) : [],
    created: row.created_at,
    same: row.same_count || 0,
    status: row.status
  };
}

// Per-character tally over the reports the board shows: how often a name
// carrying that character went through, was refused for its characters
// (invalid / sensitive), or showed as boxes. Length and "taken" refusals say
// nothing about a character, so they are left out of its tally.
export function symbolTally(rows) {
  const by = {};
  for (const r of rows) {
    const syms = Array.isArray(r.symbols) ? r.symbols : String(r.symbols || "").split(" ").filter(Boolean);
    const weight = 1 + (r.same || r.same_count || 0);
    for (const cp of syms) {
      const t = (by[cp] = by[cp] || { cp: cp, accepted: 0, refused: 0, boxes: 0 });
      if (r.outcome === "accepted") t.accepted += weight;
      else if (r.outcome === "boxes") t.boxes += weight;
      else if (r.reason === "invalid" || r.reason === "sensitive") t.refused += weight;
    }
  }
  return Object.values(by).sort((a, b) => (b.refused + b.boxes + b.accepted) - (a.refused + a.boxes + a.accepted));
}

export const LIMITS = {
  postsPerDay: 10,      // new reports per visitor per day
  votesPerDay: 60,      // "same for me" and "spam" taps per visitor per day
  flagsToHide: 3        // spam flags from different visitors that hide a report pending review
};
