// Temporary EXPLAIN QUERY PLAN evidence script (audit D3).
import Database from 'better-sqlite3';
import { copyFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'data', 'data.db');
const tmp = join(tmpdir(), 'taxbook-eqp.db');
copyFileSync(src, tmp);

const db = new Database(tmp);
const listQuery = `SELECT * FROM records WHERE workspace_id = 1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`;

console.log('--- BEFORE composite index (records list) ---');
for (const row of db.prepare('EXPLAIN QUERY PLAN ' + listQuery).all()) console.log(' ', row.detail);

db.exec('CREATE INDEX IF NOT EXISTS idx_records_ws_deleted_created ON records(workspace_id, deleted_at, created_at)');
db.exec('CREATE INDEX IF NOT EXISTS idx_records_ws_code ON records(workspace_id, code)');

console.log('--- AFTER composite index (records list) ---');
for (const row of db.prepare('EXPLAIN QUERY PLAN ' + listQuery).all()) console.log(' ', row.detail);

console.log('--- duplicate-code check (create/update guard) ---');
for (const row of db.prepare("EXPLAIN QUERY PLAN SELECT id FROM records WHERE code = 'X' AND workspace_id = 1").all()) console.log(' ', row.detail);

db.close();
rmSync(tmp, { force: true });
