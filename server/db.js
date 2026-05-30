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
