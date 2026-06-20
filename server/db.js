import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
`);

const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingUser) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
  console.log('Default admin user created (username: admin, password: admin123)');
  console.log('IMPORTANT: Change the password immediately after first login.');
}

const existingWorkspace = db.prepare('SELECT id FROM workspaces WHERE id = 1').get();
if (!existingWorkspace) {
  db.prepare('INSERT INTO workspaces (id, name, description, created_by) VALUES (1, ?, ?, NULL)').run(
    'Personal Workspace', 'Default personal workspace'
  );
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (adminUser) {
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (1, ?, ?)').run(adminUser.id, 'owner');
  }
}

export default db;
