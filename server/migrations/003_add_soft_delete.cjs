exports.up = function(db) {
  const cols = db.prepare('PRAGMA table_info(records)').all();
  const colNames = cols.map(c => c.name);

  if (!colNames.includes('deleted_at')) {
    db.exec(`ALTER TABLE records ADD COLUMN deleted_at TEXT DEFAULT NULL`);
  }
  if (!colNames.includes('is_favorite')) {
    db.exec(`ALTER TABLE records ADD COLUMN is_favorite INTEGER DEFAULT 0`);
  }
  if (!colNames.includes('notes')) {
    db.exec(`ALTER TABLE records ADD COLUMN notes TEXT DEFAULT ''`);
  }
  if (!colNames.includes('locked_by')) {
    db.exec(`ALTER TABLE records ADD COLUMN locked_by INTEGER DEFAULT NULL`);
  }
  if (!colNames.includes('locked_at')) {
    db.exec(`ALTER TABLE records ADD COLUMN locked_at TEXT DEFAULT NULL`);
  }
};
