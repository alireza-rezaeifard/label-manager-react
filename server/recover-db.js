#!/usr/bin/env node

/**
 * Database Recovery Script
 * Run this to attempt recovery of a corrupted database.
 *
 * Usage: node server/recover-db.js
 */

import Database from 'better-sqlite3';
import { existsSync, copyFileSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data.db');
const bakPath = dbPath + '.bak';

console.log('=== Database Recovery Tool ===\n');
console.log(`Database path: ${dbPath}`);

// Step 1: Check current state
console.log('\n--- Step 1: Checking current database state ---');
let isCorrupt = false;
try {
  const db = new Database(dbPath, { readonly: true });
  const result = db.pragma('integrity_check');
  const ok = result[0]?.integrity_check === 'ok';
  console.log(`Integrity: ${ok ? 'OK' : 'CORRUPTED'}`);
  isCorrupt = !ok;
  db.close();
} catch (err) {
  console.log(`Cannot open database: ${err.message}`);
  isCorrupt = true;
}

// Step 2: Try WAL truncation
if (isCorrupt) {
  console.log('\n--- Step 2: Trying WAL truncation ---');
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';

  if (existsSync(walPath)) {
    const walSize = (await import('fs')).statSync(walPath).size;
    console.log(`WAL file size: ${(walSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('Removing WAL and SHM files...');
    unlinkSync(walPath);
    unlinkSync(shmPath);

    // Check integrity again
    try {
      const db = new Database(dbPath, { readonly: true });
      const result = db.pragma('integrity_check');
      const ok = result[0]?.integrity_check === 'ok';
      console.log(`Integrity after WAL removal: ${ok ? 'OK' : 'STILL CORRUPTED'}`);
      db.close();
      isCorrupt = !ok;
    } catch (err) {
      console.log(`Still cannot open: ${err.message}`);
    }
  }
}

// Step 3: Try recovery with corrupt flag
if (isCorrupt) {
  console.log('\n--- Step 3: Attempting data recovery from corrupted DB ---');
  try {
    const recoveryDb = new Database(dbPath, { readonly: true, corrupt: true });
    const data = {};

    const tables = recoveryDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();

    for (const { name: table } of tables) {
      try {
        data[table] = recoveryDb.prepare(`SELECT * FROM "${table}"`).all();
        console.log(`  Read ${data[table].length} rows from ${table}`);
      } catch (err) {
        console.log(`  Skipped ${table}: ${err.message}`);
        data[table] = [];
      }
    }

    recoveryDb.close();

    const totalRows = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`\nTotal recoverable rows: ${totalRows}`);

    if (totalRows > 0) {
      // Backup the corrupted file
      const timestamp = Date.now();
      renameSync(dbPath, dbPath + `.corrupted-${timestamp}`);
      console.log(`Corrupted DB saved as: data.db.corrupted-${timestamp}`);

      // Remove WAL/SHM
      if (existsSync(dbPath + '-wal')) unlinkSync(dbPath + '-wal');
      if (existsSync(dbPath + '-shm')) unlinkSync(dbPath + '-shm');

      // Create new database with recovered data
      const newDb = new Database(dbPath);
      newDb.pragma('journal_mode = WAL');
      newDb.pragma('foreign_keys = ON');

      for (const [table, rows] of Object.entries(data)) {
        if (rows.length === 0) continue;
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');
        const insert = newDb.prepare(
          `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`
        );

        let inserted = 0;
        for (const row of rows) {
          try {
            insert.run(...columns.map(c => row[c]));
            inserted++;
          } catch {}
        }
        console.log(`  Inserted ${inserted}/${rows.length} rows into ${table}`);
      }

      newDb.close();
      console.log('\n✓ Recovery complete! New database created.');
    } else {
      console.log('\nNo data could be recovered from the corrupted file.');
    }
  } catch (err) {
    console.log(`Recovery failed: ${err.message}`);
  }
}

// Step 4: Try restoring from backup
if (isCorrupt && !existsSync(dbPath)) {
  console.log('\n--- Step 4: Restoring from backup ---');
  if (existsSync(bakPath)) {
    copyFileSync(bakPath, dbPath);
    if (existsSync(bakPath + '-wal')) copyFileSync(bakPath + '-wal', dbPath + '-wal');
    if (existsSync(bakPath + '-shm')) copyFileSync(bakPath + '-shm', dbPath + '-shm');

    try {
      const db = new Database(dbPath, { readonly: true });
      const result = db.pragma('integrity_check');
      const ok = result[0]?.integrity_check === 'ok';
      console.log(`Backup integrity: ${ok ? 'OK' : 'CORRUPTED'}`);
      db.close();
    } catch (err) {
      console.log(`Backup also corrupted: ${err.message}`);
    }
  } else {
    console.log('No backup file found at: ' + bakPath);
  }
}

// Step 5: Try data/ directory copy
if (!existsSync(dbPath) || isCorrupt) {
  console.log('\n--- Step 5: Checking data/ directory ---');
  const altDb = join(__dirname, 'data', 'data.db');
  if (existsSync(altDb)) {
    console.log(`Found alternative DB at: ${altDb}`);
    try {
      const db = new Database(altDb, { readonly: true });
      const result = db.pragma('integrity_check');
      const ok = result[0]?.integrity_check === 'ok';
      console.log(`Alternative DB integrity: ${ok ? 'OK' : 'CORRUPTED'}`);
      db.close();

      if (ok && (isCorrupt || !existsSync(dbPath))) {
        console.log('Using alternative database...');
        renameSync(dbPath + (isCorrupt ? '.corrupted-*' : ''), dbPath + '.old');
        copyFileSync(altDb, dbPath);
        console.log('✓ Restored from data/ directory');
      }
    } catch (err) {
      console.log(`Cannot use alternative DB: ${err.message}`);
    }
  }
}

// Final check
console.log('\n--- Final Status ---');
if (existsSync(dbPath)) {
  try {
    const db = new Database(dbPath, { readonly: true });
    const result = db.pragma('integrity_check');
    const ok = result[0]?.integrity_check === 'ok';
    const count = db.prepare('SELECT COUNT(*) as c FROM records').get().c;
    console.log(`Database: ${ok ? 'HEALTHY' : 'STILL CORRUPTED'}`);
    console.log(`Records: ${count}`);
    db.close();
  } catch (err) {
    console.log(`Final check failed: ${err.message}`);
  }
} else {
  console.log('No database file exists. A new one will be created on server start.');
}

console.log('\nDone. Start the server with: npm start');
