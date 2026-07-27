import { existsSync, copyFileSync, readdirSync, unlinkSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MAX_BACKUPS = 5;

export function getDbPath() {
  return process.env.DB_PATH || join(__dirname, 'data.db');
}

export function getBackupDir() {
  return join(__dirname, 'backups');
}

export function ensureBackupDir() {
  const dir = getBackupDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function createBackup(label = 'pre-start') {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = ensureBackupDir();

  const backupPath = join(backupDir, `data-${label}-${timestamp}.db`);
  copyFileSync(dbPath, backupPath);

  if (existsSync(dbPath + '-wal')) {
    copyFileSync(dbPath + '-wal', backupPath + '-wal');
  }
  if (existsSync(dbPath + '-shm')) {
    copyFileSync(dbPath + '-shm', backupPath + '-shm');
  }

  cleanupOldBackups();
  return backupPath;
}

function cleanupOldBackups() {
  const backupDir = getBackupDir();
  if (!existsSync(backupDir)) return;

  try {
    const files = readdirSync(backupDir)
      .filter(f => f.startsWith('data-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: join(backupDir, f),
        time: statSync(join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    for (let i = MAX_BACKUPS; i < files.length; i++) {
      unlinkSync(files[i].path);
      const walPath = files[i].path + '-wal';
      const shmPath = files[i].path + '-shm';
      if (existsSync(walPath)) unlinkSync(walPath);
      if (existsSync(shmPath)) unlinkSync(shmPath);
    }
  } catch (err) {
    console.warn('Failed to cleanup old backups:', err.message);
  }
}

export function checkIntegrity(dbPath) {
  try {
    const db = new Database(dbPath, { readonly: true });
    const result = db.pragma('integrity_check');
    db.close();
    return result[0]?.integrity_check === 'ok';
  } catch {
    return false;
  }
}

export function recoverFromCorruption(dbPath) {
  console.log('Attempting database recovery...');

  try {
    const recoveryDb = new Database(dbPath, { readonly: true, corrupt: true });
    const data = {};

    const tables = recoveryDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'record%' AND name != 'records_fts'"
    ).all();

    for (const { name: table } of tables) {
      try {
        data[table] = recoveryDb.prepare(`SELECT * FROM "${table}"`).all();
      } catch (err) {
        console.warn(`  Could not read table ${table}: ${err.message}`);
        data[table] = [];
      }
    }

    // Also try to recover records and related tables
    const recordTables = recoveryDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND (name = 'records' OR name LIKE 'record_%') AND name != 'records_fts'"
    ).all();

    for (const { name: table } of recordTables) {
      try {
        data[table] = recoveryDb.prepare(`SELECT * FROM "${table}"`).all();
      } catch (err) {
        console.warn(`  Could not read table ${table}: ${err.message}`);
        data[table] = [];
      }
    }

    recoveryDb.close();

    if (Object.keys(data).length === 0) {
      console.error('  No data could be recovered');
      return null;
    }

    // Create new database
    const newPath = dbPath + '.recovered';
    if (existsSync(newPath)) unlinkSync(newPath);

    const newDb = new Database(newPath);

    // Enable WAL and foreign keys
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('foreign_keys = ON');

    // Skip FTS5 virtual tables - they will be rebuilt by db.js on startup
    const skipTables = new Set(['records_fts']);

    for (const [table, rows] of Object.entries(data)) {
      if (rows.length === 0 || skipTables.has(table)) continue;
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(',');
      const insert = newDb.prepare(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`);

      const insertMany = newDb.transaction((rows) => {
        for (const row of rows) {
          try {
            insert.run(...columns.map(c => row[c]));
          } catch {
            // Skip rows that fail (corrupt data)
          }
        }
      });
      insertMany(rows);
      console.log(`  Recovered ${rows.length} rows from ${table}`);
    }

    newDb.close();
    return newPath;
  } catch (err) {
    console.error('Recovery failed:', err.message);
    return null;
  }
}

export function truncateWAL(dbPath) {
  try {
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);
    return true;
  } catch {
    return false;
  }
}

export function performCheckpoint(dbPath) {
  try {
    const db = new Database(dbPath);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    return true;
  } catch {
    return false;
  }
}
