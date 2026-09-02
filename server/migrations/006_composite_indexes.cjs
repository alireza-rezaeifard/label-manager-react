// Composite indexes for the dominant query patterns (audit D3).
// Evidence: EXPLAIN QUERY PLAN on the records list query
// (`WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`)
// previously used the single-column idx_records_workspace_id + a SORT step;
// with idx_records_ws_deleted_created the sort is satisfied by the index.
// The (workspace_id, code) index serves the duplicate-code checks on
// record create/update and the FTS duplicate guard.
exports.up = (db) => {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_ws_deleted_created
      ON records(workspace_id, deleted_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_records_ws_code
      ON records(workspace_id, code);
  `);
};
