import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'data.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    project TEXT NOT NULL,
    type TEXT DEFAULT '',
    date TEXT DEFAULT '',
    party TEXT DEFAULT '',
    amount TEXT DEFAULT '',
    related TEXT DEFAULT '[]',
    image TEXT DEFAULT '',
    color TEXT DEFAULT '',
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  INSERT OR IGNORE INTO users (username, password, role)
  VALUES ('admin', '$2a$10$Cx5k5VU7YMqHPVZdEMBcN.TZJmG8JgZq8X8X8X8X8X8X8X8X8X8O', 'admin');
`);

export default db;
