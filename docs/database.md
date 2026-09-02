# TaxBook — Database

SQLite (better-sqlite3) in WAL mode with `foreign_keys = ON`. Path: `server/data/data.db` (override via `db-recovery.js`).

## Reliability
- Integrity check on startup; automatic recovery (backup restore → WAL truncate → rebuild).
- Pre-start backups in `server/backups/` and periodic WAL checkpoint (5 min).

## Migrations
- Directory `server/migrations/`, ordered `NNN_name.(sql|cjs)`, tracked in `schema_migrations` / `schema_version`.
- Seeding (admin user, workspace 1) is idempotent (`INSERT OR IGNORE`) and safe under concurrent starts.

## Schema highlights
- `users`, `workspaces`, `workspace_members (workspace_id, user_id, role)`
- `records` — financial documents, soft delete (`deleted_at`), versions in `record_versions`
- `records_fts` — FTS5 (code, project, type, party, amount) with sync triggers
- `idempotency_keys` — key (PK, `user_id:key`), response snapshot, TTL purge (24h, hourly job)
- `activity_log`, `notifications`, `api_keys`, `webhooks`

## Index policy
Indexes exist via migration `002_add_indexes.cjs`. New indexes must be justified with `EXPLAIN QUERY PLAN` evidence; candidates: `(workspace_id, deleted_at, created_at)`, `(workspace_id, code)`.

## PostgreSQL (future, Phase 6)
PostgreSQL + Drizzle is planned only if a multi-node SaaS deployment is required. SQLite remains the supported engine for single-node/offline use. Migration would use dual-write or snapshot import; no automatic cutover.
