import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import initSqlJs, { type Database } from 'sql.js';
import { renderReportPdf, type ReportData } from '../report/pdf.js';
import { jalaliMonthRange, toJalaliString } from '../report/jalali.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('tools:report');

const DB_PATH = process.env.DB_PATH || path.join(import.meta.dirname, '../../../server/data.db');

export interface ArtifactPayload {
  filename: string;
  mime_type: string;
  size: number;
  data_base64: string;
}

export type EmitArtifact = (artifact: ArtifactPayload) => void;

/**
 * Fresh DB read per report — Hermes' cached sql.js snapshot goes stale
 * while the app writes new records; reports must reflect current data.
 */
async function readFreshDb(): Promise<Database> {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  return new SQL.Database(buffer);
}

function queryAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

const faNum = (n: number | string) => Number(n || 0).toLocaleString('fa-IR');

/**
 * Monthly TaxBook activity report → Persian RTL PDF artifact.
 * Queries the REAL workspace-scoped activity log; never guesses.
 */
export function createGenerateMonthlyReportTool(emitArtifact: EmitArtifact) {
  return tool({
    description:
      'Generate a monthly TaxBook activity report as a downloadable Persian PDF artifact. ' +
      'Queries real workspace data (activity log: created/updated/deleted/restored records, projects). ' +
      'Use monthOffset 0 for the current Jalali month, -1 for the previous one. ' +
      'Returns report summary text for the user plus a PDF artifact delivered as a file.',
    parameters: z.object({
      month_offset: z.number().int().min(-24).max(0).default(0)
        .describe('0 = current Jalali month, -1 = previous month, -2 = two months ago'),
      workspace_id: z.number().int()
        .describe('The TaxBook workspace id to report on (provided in conversation context)'),
    }),
    execute: async ({ month_offset, workspace_id }) => {
      let db: Database | null = null;
      try {
        db = await readFreshDb();
        const range = jalaliMonthRange(month_offset);
        const startIso = `${range.start} 00:00:00`;
        const endIso = `${range.end} 23:59:59`;

        // Summary — real activity rows, workspace-scoped
        const actionRows = queryAll(
          db,
          `SELECT action, COUNT(*) as count
             FROM activity_log
            WHERE workspace_id = ? AND created_at BETWEEN ? AND ?
            GROUP BY action`,
          [workspace_id, startIso, endIso]
        );
        const countOf = (...actions: string[]) =>
          actionRows
            .filter(r => actions.includes(String(r.action)))
            .reduce((sum, r) => sum + Number(r.count), 0);

        const summary = {
          created: countOf('create'),
          updated: countOf('update', 'bulk-edit'),
          deleted: countOf('delete'),
          restored: countOf('restore'),
        };

        // Important activities (latest 20)
        const activities = queryAll(
          db,
          `SELECT al.action, al.details, al.created_at, COALESCE(u.username, '') as user
             FROM activity_log al
             LEFT JOIN users u ON u.id = al.user_id
            WHERE al.workspace_id = ? AND al.created_at BETWEEN ? AND ?
            ORDER BY al.created_at DESC LIMIT 20`,
          [workspace_id, startIso, endIso]
        );

        // Projects — current state of non-deleted records
        const projectRows = queryAll(
          db,
          `SELECT project, COUNT(*) as count, SUM(CAST(amount AS REAL)) as total_amount
             FROM records
            WHERE workspace_id = ? AND deleted_at IS NULL
            GROUP BY project ORDER BY count DESC LIMIT 12`,
          [workspace_id]
        );

        const wsRow = queryAll(db, 'SELECT name FROM workspaces WHERE id = ?', [workspace_id]);
        const workspaceName = String(wsRow[0]?.name || `فضای کاری ${faNum(workspace_id)}`);

        const report: ReportData = {
          title: `گزارش تغییرات ${range.label}`,
          workspaceName,
          period: { start: range.start, end: range.end, jy: range.jy, jm: range.jm },
          summary,
          activities: activities.map(a => ({
            user: String(a.user || ''),
            action: String(a.action || ''),
            details: String(a.details || ''),
            created_at: String(a.created_at || ''),
          })),
          projects: projectRows.map(p => ({
            name: String(p.project || ''),
            count: Number(p.count || 0),
            totalAmount: Number(p.total_amount || 0),
          })),
          generatedAt: new Date().toISOString(),
        };

        const pdfBuffer = await renderReportPdf(report);
        const filename = `taxbook-report-${range.jy}-${String(range.jm).padStart(2, '0')}.pdf`;

        emitArtifact({
          filename,
          mime_type: 'application/pdf',
          size: pdfBuffer.length,
          data_base64: pdfBuffer.toString('base64'),
        });

        log.info({ workspace_id, period: range.label, size: pdfBuffer.length }, 'Monthly report artifact generated');

        // Small metadata back to the LLM — binary travels via the artifact channel
        return {
          success: true,
          artifact: { filename, mime_type: 'application/pdf', size: pdfBuffer.length },
          period: { jalali: range.label, start: toJalaliString(range.start), end: toJalaliString(range.end) },
          summary,
          note: 'فایل PDF به عنوان artifact ساخته و به گفتگو پیوست شد. خلاصه را برای کاربر بنویس.',
        };
      } catch (err: any) {
        log.error({ error: err.message }, 'Monthly report generation failed');
        return { success: false, error: `ساخت گزارش ناموفق بود: ${err.message}` };
      } finally {
        db?.close();
      }
    },
  });
}

/**
 * Generic text artifact export (CSV / JSON / TXT / MD). Binary types like
 * PDF/XLSX must go through their dedicated generators.
 */
export function createCreateArtifactTool(emitArtifact: EmitArtifact) {
  return tool({
    description:
      'Create a downloadable text-based file artifact from provided content. ' +
      'Supported formats: csv, json, txt, md. The file is stored securely in the current ' +
      'workspace and delivered in the chat as a downloadable artifact.',
    parameters: z.object({
      filename: z.string().describe('File name with extension, e.g. records-export.csv'),
      format: z.enum(['csv', 'json', 'txt', 'md']).describe('Content format'),
      content: z.string().describe('The full file content to store'),
      workspace_id: z.number().int().describe('The TaxBook workspace id'),
    }),
    execute: async ({ filename, format, content, workspace_id }) => {
      try {
        const mimeMap: Record<string, string> = {
          csv: 'text/csv; charset=utf-8',
          json: 'application/json; charset=utf-8',
          txt: 'text/plain; charset=utf-8',
          md: 'text/markdown; charset=utf-8',
        };
        // CSV gets a UTF-8 BOM so Excel opens Persian correctly
        const body = format === 'csv' ? '\uFEFF' + content : content;
        const buffer = Buffer.from(body, 'utf-8');

        emitArtifact({
          filename,
          mime_type: mimeMap[format],
          size: buffer.length,
          data_base64: buffer.toString('base64'),
        });

        return {
          success: true,
          artifact: { filename, mime_type: mimeMap[format], size: buffer.length },
          note: 'فایل ساخته و به گفتگو پیوست شد.',
        };
      } catch (err: any) {
        log.error({ error: err.message }, 'Artifact creation failed');
        return { success: false, error: `ساخت فایل ناموفق بود: ${err.message}` };
      }
    },
  });
}
