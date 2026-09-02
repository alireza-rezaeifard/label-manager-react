import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, copyFileSync, renameSync } from 'fs';
import bcrypt from 'bcryptjs';
import {
  getDbPath,
  createBackup,
  checkIntegrity,
  recoverFromCorruption,
  truncateWAL,
  performCheckpoint,
} from './db-recovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbPath = getDbPath();
let db;

// ── Recovery flow ──
function initializeDatabase() {
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';

  // Step 1: If main DB doesn't exist but backup does, restore from backup
  if (!existsSync(dbPath)) {
    const bakPath = dbPath + '.bak';
    if (existsSync(bakPath)) {
      console.log('Main database missing, restoring from backup...');
      copyFileSync(bakPath, dbPath);
      if (existsSync(bakPath + '-wal')) copyFileSync(bakPath + '-wal', dbPath + '-wal');
      if (existsSync(bakPath + '-shm')) copyFileSync(bakPath + '-shm', dbPath + '-shm');
    }
  }

  // Step 2: Try opening normally
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Step 3: Check integrity
    const integrity = db.pragma('integrity_check');
    if (integrity[0]?.integrity_check === 'ok') {
      // Step 4: Checkpoint WAL if it's large
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch {
        // Non-critical
      }
      return db;
    }

    // Integrity failed
    console.error('Database integrity check failed!');
    db.close();
  } catch (err) {
    console.error('Failed to open database:', err.message);
    if (db) {
      try { db.close(); } catch {}
    }
  }

  // Step 5: Try recovery
  console.log('Attempting automatic recovery...');

  // Create backup of the corrupted DB before attempting recovery
  try {
    createBackup('corrupted');
  } catch {}

  const recoveredPath = recoverFromCorruption(dbPath);
  if (recoveredPath) {
    // Verify recovered DB
    if (checkIntegrity(recoveredPath)) {
      console.log('Recovery successful! Replacing corrupted database...');

      // Replace corrupted DB with recovered one
      const corruptedPath = dbPath + '.corrupted';
      if (existsSync(corruptedPath)) {
        try { renameSync(dbPath, dbPath + '.' + Date.now()); } catch {}
      } else {
        try { renameSync(dbPath, corruptedPath); } catch {}
      }

      renameSync(recoveredPath, dbPath);

      // Clean up WAL/SHM since we have a fresh DB
      truncateWAL(dbPath);

      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');

      console.log('Database recovered successfully.');
      return db;
    } else {
      console.error('Recovered database also failed integrity check');
      try { renameSync(recoveredPath, recoveredPath + '.bad'); } catch {}
    }
  }

  // Step 6: Try truncating WAL and reopening (last resort)
  console.log('Trying WAL truncation as last resort...');
  truncateWAL(dbPath);

  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const integrity = db.pragma('integrity_check');
    if (integrity[0]?.integrity_check === 'ok') {
      console.log('Database restored after WAL truncation.');
      return db;
    }
    db.close();
  } catch (err) {
    console.error('Last resort failed:', err.message);
  }

  // Step 7: All recovery attempts failed - create fresh database
  console.error('All recovery attempts failed. Creating fresh database...');
  console.error('Your data may be in the backup directory or in the .corrupted file.');

  const freshPath = dbPath + '.' + Date.now();
  if (existsSync(dbPath)) {
    try { renameSync(dbPath, freshPath); } catch {}
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

db = initializeDatabase();

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workspace_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    invited_by INTEGER,
    invitee_username TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER DEFAULT 1,
    code TEXT NOT NULL,
    project TEXT NOT NULL,
    type TEXT DEFAULT '',
    date TEXT DEFAULT '',
    party TEXT DEFAULT '',
    amount TEXT DEFAULT '',
    related TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    image TEXT DEFAULT '',
    color TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    workspace_id INTEGER DEFAULT 1,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    record_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS record_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    workspace_id INTEGER DEFAULT 1,
    user_id INTEGER,
    user_name TEXT DEFAULT '',
    snapshot TEXT NOT NULL,
    change_summary TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    workspace_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER DEFAULT 1,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    fa TEXT DEFAULT '',
    placeholder TEXT DEFAULT '',
    field_type TEXT DEFAULT 'text',
    options TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(workspace_id, key),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );
  CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    on_create INTEGER DEFAULT 0,
    on_update INTEGER DEFAULT 0,
    on_delete INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER,
    url TEXT NOT NULL,
    events TEXT DEFAULT '["record:created","record:updated","record:deleted"]',
    secret TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS ai_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT UNIQUE NOT NULL,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_ai_artifacts_workspace ON ai_artifacts(workspace_id);
`);

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    console.log(`  ✓ Added column ${table}.${column}`);
  }
}

ensureColumn('records', 'workspace_id', 'workspace_id INTEGER DEFAULT 1');
ensureColumn('records', 'tags', "tags TEXT DEFAULT '[]'");
ensureColumn('records', 'sort_order', 'sort_order INTEGER DEFAULT 0');
ensureColumn('records', 'deleted_at', "deleted_at TEXT DEFAULT NULL");
ensureColumn('records', 'is_favorite', "is_favorite INTEGER DEFAULT 0");
ensureColumn('records', 'notes', "notes TEXT DEFAULT ''");
ensureColumn('records', 'locked_by', "locked_by INTEGER DEFAULT NULL");
ensureColumn('records', 'locked_at', "locked_at TEXT DEFAULT NULL");

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_records_code ON records(code);
  CREATE INDEX IF NOT EXISTS idx_records_project ON records(project);
  CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
  CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
  CREATE INDEX IF NOT EXISTS idx_records_party ON records(party);
  CREATE INDEX IF NOT EXISTS idx_records_workspace_id ON records(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
  CREATE INDEX IF NOT EXISTS idx_records_sort_order ON records(sort_order);
  CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_record_versions_record_id ON record_versions(record_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace_id ON custom_fields(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON records(deleted_at);
`);

// ── FTS5 full-text search ──
/** Checks (cheaply) that the FTS5 table, triggers and row counts are consistent. */
function isFTS5Healthy(targetDb = db) {
  try {
    const table = targetDb.prepare(
      "SELECT name FROM sqlite_master WHERE name = 'records_fts'"
    ).get();
    if (!table) return false;

    for (const t of ['records_fts_insert', 'records_fts_update', 'records_fts_delete']) {
      const trigger = targetDb.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = ?"
      ).get(t);
      if (!trigger) return false;
    }

    const liveCount = targetDb.prepare(
      'SELECT COUNT(*) as c FROM records WHERE deleted_at IS NULL'
    ).get().c;
    const ftsCount = targetDb.prepare('SELECT COUNT(*) as c FROM records_fts').get().c;
    return ftsCount === liveCount;
  } catch {
    return false; // any error here means the index is suspect → rebuild
  }
}

export function rebuildFTS5(targetDb = db) {
  console.log('Rebuilding FTS5 index...');

  // Step 1: Drop triggers (these don't depend on FTS5 data)
  for (const t of ['records_fts_insert', 'records_fts_update', 'records_fts_delete']) {
    try { targetDb.exec(`DROP TRIGGER IF EXISTS ${t}`); } catch {}
  }

  // Step 2: Drop FTS5 table — try normally, then force via writable_schema
  let dropped = false;
  try {
    targetDb.exec(`DROP TABLE IF EXISTS records_fts`);
    dropped = true;
  } catch (err) {
    console.warn('  Normal DROP failed, trying force:', err.message);
  }

  if (!dropped) {
    try {
      targetDb.pragma('writable_schema = ON');
      targetDb.exec(`DELETE FROM sqlite_master WHERE name = 'records_fts'`);
      targetDb.pragma('writable_schema = OFF');
      console.log('  ✓ Force-removed FTS5 from sqlite_master');
    } catch (err) {
      console.error('  ✗ Force removal failed:', err.message);
    }
  }

  // Step 3: Recreate FTS5 table
  try {
    targetDb.exec(`
      CREATE VIRTUAL TABLE records_fts USING fts5(
        code, project, type, party, amount,
        content='records',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
      );
    `);
  } catch (err) {
    console.error('  ✗ FTS5 table creation failed:', err.message);
    return;
  }

  // Step 4: Populate from records
  try {
    targetDb.exec(`INSERT INTO records_fts(rowid, code, project, type, party, amount)
                   SELECT id, code, project, type, party, amount FROM records WHERE deleted_at IS NULL`);
  } catch (err) {
    console.warn('  ⚠ FTS5 populate failed:', err.message);
  }

  // Step 5: Create triggers AFTER populating (triggers don't fire on direct FTS5 inserts)
  try {
    targetDb.exec(`
      CREATE TRIGGER records_fts_insert AFTER INSERT ON records BEGIN
        INSERT INTO records_fts(rowid, code, project, type, party, amount)
        VALUES (new.id, new.code, new.project, new.type, new.party, new.amount);
      END;
      CREATE TRIGGER records_fts_update AFTER UPDATE ON records BEGIN
        INSERT INTO records_fts(records_fts, rowid, code, project, type, party, amount)
        VALUES('delete', old.id, old.code, old.project, old.type, old.party, old.amount);
        INSERT INTO records_fts(rowid, code, project, type, party, amount)
        VALUES (new.id, new.code, new.project, new.type, new.party, new.amount);
      END;
      CREATE TRIGGER records_fts_delete AFTER DELETE ON records BEGIN
        INSERT INTO records_fts(records_fts, rowid, code, project, type, party, amount)
        VALUES('delete', old.id, old.code, old.project, old.type, old.party, old.amount);
      END;
    `);
  } catch (err) {
    console.warn('  ⚠ FTS5 trigger creation failed:', err.message);
  }

  try {
    const ftsCount = targetDb.prepare('SELECT COUNT(*) as c FROM records_fts').get().c;
    console.log(`  ✓ FTS5 rebuilt with ${ftsCount} records`);
  } catch {}
}

// Rebuild FTS5 on startup only when it is actually unhealthy — avoids a
// full reindex (slow on large datasets) on every boot.
if (isFTS5Healthy()) {
  console.log('FTS5 index is healthy, skipping rebuild.');
} else {
  rebuildFTS5();
}

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
// Idempotent seeding: must be safe when multiple processes/suites initialize concurrently.
db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)').run(
  adminUsername, bcrypt.hashSync(adminPassword, 10), 'admin'
);
const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);

db.prepare('INSERT OR IGNORE INTO workspaces (id, name, description, created_by) VALUES (1, ?, ?, NULL)').run(
  'Personal Workspace', 'Default personal workspace'
);
if (adminUser) {
  db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').run(adminUser.id, 'owner');
}

export default db;
