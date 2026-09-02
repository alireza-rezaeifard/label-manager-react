import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))`);

  const currentVersionSql = db.prepare('SELECT MAX(version) as v FROM schema_version').get()?.v || 0;
  const currentVersionJs = db.prepare('SELECT MAX(version) as v FROM schema_migrations').get()?.v || 0;
  const currentVersion = Math.max(currentVersionSql, currentVersionJs);

  const migrationsDir = join(__dirname, 'migrations');
  let files;

  try {
    files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql') || f.endsWith('.cjs')).sort();
  } catch {
    console.log('No migrations directory found, skipping.');
    return [];
  }

  const applied = [];

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (isNaN(version) || version <= currentVersion) continue;

    try {
      if (file.endsWith('.cjs')) {
        const mod = require(join(migrationsDir, file));
        if (typeof mod.up === 'function') {
          console.log(`Applying JS migration: ${file}`);
          mod.up(db);
        }
      } else {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8');
        console.log(`Applying SQL migration: ${file}`);
        db.exec(sql);
      }

      const alreadyTracked = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version);
      if (!alreadyTracked) {
        // OR IGNORE: parallel test suites / processes may apply the same
        // migration concurrently against the shared database file.
        db.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run(version);
      }
      const alreadyTrackedOld = db.prepare('SELECT 1 FROM schema_version WHERE version = ?').get(version);
      if (!alreadyTrackedOld) {
        db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (?)').run(version);
      }
      applied.push(file);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      console.error(`  ✗ ${file} failed:`, err.message);
      throw err;
    }
  }

  if (applied.length === 0) {
    console.log('Database schema is up to date.');
  }

  return applied;
}
