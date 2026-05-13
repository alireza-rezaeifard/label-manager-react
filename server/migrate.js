import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))`);

  const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_version').get()?.v || 0;
  const migrationsDir = join(__dirname, 'migrations');
  let files;

  try {
    files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  } catch {
    console.log('No migrations directory found, skipping.');
    return [];
  }

  const applied = [];

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (isNaN(version) || version <= currentVersion) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Applying migration: ${file}`);

    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
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
