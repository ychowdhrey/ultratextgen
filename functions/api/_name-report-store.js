// _name-report-store.js — the board's storage, on Cloudflare D1.
//
// Unrouted module. `db` is anything with D1's prepared-statement API
// (prepare(sql).bind(...).all() / .first() / .run()): the NAME_REPORTS
// binding in production, and a node:sqlite adapter in
// scripts/name-reports.test.mjs, so the SQL below is executed by a real
// SQLite engine in CI rather than trusted.
//
// No raw IP address is ever stored. A visitor is a SHA-256 of their IP plus
// the day plus a server secret, so a rate limit can count them for one day
// and nobody, including whoever reads the table, can turn it back into an
// address or follow it across days.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS name_reports (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     game TEXT NOT NULL,
     name TEXT NOT NULL,
     outcome TEXT NOT NULL,
     reason TEXT,
     verdict TEXT,
     symbols TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL,
     same_count INTEGER NOT NULL DEFAULT 0,
     flag_count INTEGER NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'visible',
     visitor TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS name_reports_game_status ON name_reports (game, status, id)`,
  `CREATE TABLE IF NOT EXISTS name_report_votes (
     report_id INTEGER NOT NULL,
     visitor TEXT NOT NULL,
     kind TEXT NOT NULL,
     PRIMARY KEY (report_id, visitor, kind)
   )`,
  `CREATE TABLE IF NOT EXISTS name_report_limits (
     visitor TEXT NOT NULL,
     day TEXT NOT NULL,
     kind TEXT NOT NULL,
     count INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (visitor, day, kind)
   )`
];

export async function ensureSchema(db) {
  for (const sql of SCHEMA) await db.prepare(sql).run();
}

export async function visitorId(ip, day, secret) {
  const data = new TextEncoder().encode(String(ip || "") + "|" + day + "|" + String(secret || ""));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Count one action against today's allowance; false once the limit is reached.
export async function spend(db, visitor, day, kind, limit) {
  const row = await db
    .prepare("SELECT count FROM name_report_limits WHERE visitor = ? AND day = ? AND kind = ?")
    .bind(visitor, day, kind)
    .first();
  const used = row ? row.count : 0;
  if (used >= limit) return false;
  await db
    .prepare(
      "INSERT INTO name_report_limits (visitor, day, kind, count) VALUES (?, ?, ?, 1) " +
      "ON CONFLICT (visitor, day, kind) DO UPDATE SET count = count + 1"
    )
    .bind(visitor, day, kind)
    .run();
  return true;
}

export async function insertReport(db, v, visitor, now) {
  // The same visitor reporting the same name for the same game again today
  // adds nothing; it is answered as a duplicate, not stored twice.
  const dup = await db
    .prepare(
      "SELECT id FROM name_reports WHERE game = ? AND name = ? AND visitor = ? AND substr(created_at, 1, 10) = ?"
    )
    .bind(v.game, v.name, visitor, now.slice(0, 10))
    .first();
  if (dup) return { id: dup.id, duplicate: true };
  const res = await db
    .prepare(
      "INSERT INTO name_reports (game, name, outcome, reason, verdict, symbols, created_at, visitor) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(v.game, v.name, v.outcome, v.reason, v.verdict, v.symbols.join(" "), now, visitor)
    .run();
  return { id: res.meta && res.meta.last_row_id, duplicate: false };
}

export async function listReports(db, game, { limit = 50, includeHidden = false } = {}) {
  const sql = includeHidden
    ? "SELECT * FROM name_reports WHERE game = ? ORDER BY id DESC LIMIT ?"
    : "SELECT * FROM name_reports WHERE game = ? AND status = 'visible' ORDER BY id DESC LIMIT ?";
  const out = await db.prepare(sql).bind(game, limit).all();
  return (out && out.results) || [];
}

// "same" (it happened to me too) and "flag" (spam) are one per visitor per
// report. Returns the report's new state, or null if the report does not
// exist or is not public.
export async function vote(db, reportId, visitor, kind, flagsToHide) {
  const report = await db.prepare("SELECT id, status FROM name_reports WHERE id = ?").bind(reportId).first();
  if (!report || report.status !== "visible") return null;
  const res = await db
    .prepare("INSERT OR IGNORE INTO name_report_votes (report_id, visitor, kind) VALUES (?, ?, ?)")
    .bind(reportId, visitor, kind)
    .run();
  const changed = res.meta ? res.meta.changes : 0;
  if (changed) {
    const column = kind === "same" ? "same_count" : "flag_count";
    await db.prepare(`UPDATE name_reports SET ${column} = ${column} + 1 WHERE id = ?`).bind(reportId).run();
    if (kind === "flag") {
      await db
        .prepare("UPDATE name_reports SET status = 'flagged' WHERE id = ? AND flag_count >= ? AND status = 'visible'")
        .bind(reportId, flagsToHide)
        .run();
    }
  }
  const after = await db
    .prepare("SELECT id, same_count, flag_count, status FROM name_reports WHERE id = ?")
    .bind(reportId)
    .first();
  return { counted: !!changed, same: after.same_count, status: after.status };
}

// Owner moderation. "hide" removes a report from the board, "show" restores
// it (and clears its spam flags), "delete" removes it for good.
export async function moderate(db, reportId, action) {
  if (action === "hide") {
    await db.prepare("UPDATE name_reports SET status = 'hidden' WHERE id = ?").bind(reportId).run();
  } else if (action === "show") {
    await db.prepare("UPDATE name_reports SET status = 'visible', flag_count = 0 WHERE id = ?").bind(reportId).run();
    await db.prepare("DELETE FROM name_report_votes WHERE report_id = ? AND kind = 'flag'").bind(reportId).run();
  } else if (action === "delete") {
    await db.prepare("DELETE FROM name_report_votes WHERE report_id = ?").bind(reportId).run();
    await db.prepare("DELETE FROM name_reports WHERE id = ?").bind(reportId).run();
  } else {
    return false;
  }
  return true;
}
