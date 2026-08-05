import { tool } from 'ai';
import { z } from 'zod';
import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(import.meta.dirname, '../../../server/data.db');

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  db = new SQL.Database(buffer);
  return db;
}

function query(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql: string, params: any[] = []): { changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  return { changes: db.getRowsModified() };
}

// ---- Record Tools ----

export const searchRecordsTool = tool({
  description: 'Search records in the database by code, project, type, party, or amount. Returns matching records with all their fields.',
  parameters: z.object({
    query: z.string().describe('Search term to match against code, project, type, party, amount'),
    limit: z.number().optional().describe('Max results (default: 20)'),
  }),
  execute: async ({ query: searchQuery, limit }) => {
    await getDb();
    const max = limit || 20;

    // Try FTS first
    try {
      const rows = query(
        `SELECT r.* FROM records r
         WHERE r.id IN (SELECT rowid FROM records_fts WHERE records_fts MATCH ?)
         AND r.deleted_at IS NULL
         ORDER BY r.created_at DESC
         LIMIT ?`,
        [searchQuery, max]
      );
      if (rows.length > 0) return { results: rows, total: rows.length, method: 'fts' };
    } catch { /* FTS may not match */ }

    // Fallback to LIKE
    const like = `%${searchQuery}%`;
    const rows = query(
      `SELECT * FROM records
       WHERE deleted_at IS NULL
       AND (code LIKE ? OR project LIKE ? OR type LIKE ? OR party LIKE ? OR amount LIKE ? OR notes LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`,
      [like, like, like, like, like, like, max]
    );
    return { results: rows, total: rows.length, method: 'like' };
  },
});

export const getRecordByCodeTool = tool({
  description: 'Get a single record by its exact code (e.g., "HR-1404-012"). Returns all fields including custom fields, notes, and tags.',
  parameters: z.object({
    code: z.string().describe('The exact record code to look up'),
  }),
  execute: async ({ code }) => {
    await getDb();
    const rows = query(
      `SELECT * FROM records WHERE code = ? AND deleted_at IS NULL`,
      [code]
    );
    if (rows.length === 0) {
      return { found: false, code, message: `No record found with code "${code}"` };
    }
    const record = rows[0];
    try { record.tags = JSON.parse(record.tags as string || '[]'); } catch { /* keep as string */ }
    try { record.related = JSON.parse(record.related as string || '[]'); } catch { /* keep as string */ }
    return { found: true, record };
  },
});

export const getRecordByIdTool = tool({
  description: 'Get a single record by its numeric database ID',
  parameters: z.object({
    id: z.number().describe('The numeric record ID'),
  }),
  execute: async ({ id }) => {
    await getDb();
    const rows = query(
      `SELECT * FROM records WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (rows.length === 0) {
      return { found: false, id, message: `No record found with ID ${id}` };
    }
    const record = rows[0];
    try { record.tags = JSON.parse(record.tags as string || '[]'); } catch { /* keep as string */ }
    try { record.related = JSON.parse(record.related as string || '[]'); } catch { /* keep as string */ }
    return { found: true, record };
  },
});

export const listRecordsTool = tool({
  description: 'List records with optional filters. Returns paginated results.',
  parameters: z.object({
    project: z.string().optional().describe('Filter by project name'),
    type: z.string().optional().describe('Filter by record type'),
    party: z.string().optional().describe('Filter by party name'),
    limit: z.number().optional().describe('Max results (default: 50)'),
    offset: z.number().optional().describe('Offset for pagination (default: 0)'),
  }),
  execute: async ({ project, type, party, limit, offset }) => {
    await getDb();
    const max = limit || 50;
    const off = offset || 0;
    const conditions = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (project) { conditions.push('project = ?'); params.push(project); }
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (party) { conditions.push('party = ?'); params.push(party); }

    const where = conditions.join(' AND ');
    const rows = query(
      `SELECT * FROM records WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, max, off]
    );
    const countResult = query(
      `SELECT COUNT(*) as total FROM records WHERE ${where}`,
      params
    );
    return { results: rows, total: countResult[0]?.total || 0, limit: max, offset: off };
  },
});

export const getRecordStatsTool = tool({
  description: 'Get statistics about records: total count, counts by project, by type, etc.',
  parameters: z.object({}),
  execute: async () => {
    await getDb();
    const total = query(`SELECT COUNT(*) as count FROM records WHERE deleted_at IS NULL`);
    const byProject = query(`SELECT project, COUNT(*) as count FROM records WHERE deleted_at IS NULL GROUP BY project ORDER BY count DESC`);
    const byType = query(`SELECT type, COUNT(*) as count FROM records WHERE deleted_at IS NULL AND type != '' GROUP BY type ORDER BY count DESC`);
    return {
      total: total[0]?.count || 0,
      byProject,
      byType,
    };
  },
});

// ---- Generic Database Tools ----

export const executeQueryTool = tool({
  description: 'Execute a read-only SQL query against the database. Use for custom queries not covered by other tools. Only SELECT queries are allowed.',
  parameters: z.object({
    sql: z.string().describe('The SQL query to execute (SELECT only)'),
    params: z.array(z.any()).optional().describe('Query parameters as an array'),
  }),
  execute: async ({ sql, params }) => {
    await getDb();
    const normalized = sql.trim().toUpperCase();
    if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH') && !normalized.startsWith('PRAGMA')) {
      return { error: 'Only SELECT, WITH, and PRAGMA queries are allowed for safety.' };
    }
    try {
      const rows = query(sql, params || []);
      return { results: rows, total: rows.length };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});

export const getTableSchemaTool = tool({
  description: 'Get the schema of all tables in the database, or a specific table.',
  parameters: z.object({
    table: z.string().optional().describe('Specific table name (default: all tables)'),
  }),
  execute: async ({ table }) => {
    await getDb();
    if (table) {
      const info = query(`PRAGMA table_info(${table})`);
      const fks = query(`PRAGMA foreign_key_list(${table})`);
      const indexes = query(`PRAGMA index_list(${table})`);
      return { table, columns: info, foreignKeys: fks, indexes };
    }
    const tables = query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    const schemas: Record<string, any> = {};
    for (const t of tables) {
      schemas[t.name] = query(`PRAGMA table_info(${t.name})`);
    }
    return { tables: tables.map(t => t.name), schemas };
  },
});

export const executeWriteTool = tool({
  description: 'Execute a write SQL query (INSERT, UPDATE, DELETE). Use with caution. Returns the number of affected rows.',
  parameters: z.object({
    sql: z.string().describe('The SQL query to execute (INSERT, UPDATE, DELETE)'),
    params: z.array(z.any()).optional().describe('Query parameters as an array'),
  }),
  execute: async ({ sql, params }) => {
    await getDb();
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT') || normalized.startsWith('PRAGMA')) {
      return { error: 'Use executeQuery for SELECT queries.' };
    }
    try {
      const result = run(sql, params || []);
      return { success: true, changes: result.changes };
    } catch (err: any) {
      return { error: err.message };
    }
  },
});
