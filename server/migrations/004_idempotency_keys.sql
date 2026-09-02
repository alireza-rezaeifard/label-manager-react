-- Idempotency keys for financial mutations (record creation).
-- A client may send an "Idempotency-Key" header on POST /api/records.
-- Retries with the same key return the original response instead of creating duplicates.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  workspace_id INTEGER,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  response_status INTEGER NOT NULL DEFAULT 201,
  response_body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON idempotency_keys(created_at);
