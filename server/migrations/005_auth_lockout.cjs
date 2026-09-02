// Per-account brute-force protection (audit S7).
// Idempotent: checks existing columns before altering (legacy DBs may predate this).
exports.up = (db) => {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!cols.includes('failed_login_attempts')) {
    db.exec('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.includes('locked_until')) {
    db.exec('ALTER TABLE users ADD COLUMN locked_until TEXT');
  }
};
